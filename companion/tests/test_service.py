import base64
import http.client
import io
import json
from pathlib import Path
import sys
import threading
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from PIL import Image
from service import Companion, Runtime, SafeError, Server, decode_pixels, exact_origin, validate_output, strict_json, MAX_BODY, MAX_SIDE

ORIGIN = 'https://hidden-data.ouahad.space'
GOOD = {'image_description':'The image shows a plain red surface with no other visible details.',
        'main_visible_objects':['red surface'], 'scene_and_surroundings':None,
        'notable_visual_details':[], 'uncertainties':[]}


class SingleWriteConnection(http.client.HTTPConnection):
    """Send each small synthetic request together, preserving HTTP semantics.

    CPython normally sends headers and body separately. A security rejection
    between those sends can cause a Windows TCP reset before the test reads its
    response. This fixture still requires the exact expected HTTP error status;
    it never treats a reset as a successful denial or retries a request.
    """
    def _send_output(self, message_body=None, encode_chunked=False):
        if encode_chunked or (message_body is not None and not isinstance(message_body, bytes)):
            raise AssertionError('Fixture supports fixed-size byte bodies only.')
        self._buffer.extend((b'', b''))
        packet = b'\r\n'.join(self._buffer)
        self._buffer.clear()
        self.send(packet + (message_body or b''))


def image_bytes(size=(20, 10), exif=False):
    output = io.BytesIO()
    image = Image.new('RGB', size, 'red')
    tags = Image.Exif()
    if exif:
        tags[270] = 'PRIVATE-GPS-METADATA-SENTINEL'
        tags[271] = 'PRIVATE-CAMERA-SENTINEL'
    image.save(output, 'JPEG', exif=tags)
    image.close()
    return output.getvalue()


class FakeRuntime:
    def __init__(self):
        self.state = 'ready'
        self.epoch = 0
        self.started = threading.Event()
        self.release = threading.Event()
        self.release.set()
        self.received = None

    def stop(self):
        self.state = 'stopped'
        self.epoch += 1
        self.release.set()

    def infer(self, pixels, expected_epoch=None):
        self.received = pixels
        self.state = 'busy'
        self.started.set()
        self.release.wait(5)
        if expected_epoch != self.epoch:
            raise SafeError(409, 'Analysis was cancelled.')
        self.state = 'ready'
        return {'version':'1.1.0', 'observations':GOOD}


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.runtime = FakeRuntime()
        self.app = Companion(self.runtime, observations_enabled=True)
        self.server = Server(self.app, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.code = self.app.offer_pairing(ORIGIN)

    def tearDown(self):
        self.app.disconnect()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(2)

    def request(self, path, value=None, token=None, origin=ORIGIN, method='POST', headers=None, raw=None):
        conn = SingleWriteConnection('127.0.0.1', self.server.server_port, timeout=8)
        # Browser GET/preflight requests have no body. Sending '{}' here made
        # Windows occasionally reset a connection rejected before body decoding.
        body = (json.dumps(value or {}) if raw is None else raw) if method == 'POST' else None
        h = {'Origin':origin, 'Content-Type':'application/json'}
        if token:
            h['Authorization'] = 'Bearer ' + token
        if headers:
            h.update(headers)
        conn.request(method, path, body=body, headers=h)
        response = conn.getresponse()
        result = response.status, dict(response.getheaders()), json.loads(response.read())
        conn.close()
        return result

    def pair(self):
        status, _, body = self.request('/v1/pair', {'code':self.code})
        self.assertEqual(status, 200)
        return body['token']

    def payload(self):
        return {'id':'one', 'image':base64.b64encode(image_bytes(exif=True)).decode()}

    def test_listener_is_ipv4_loopback_only(self):
        self.assertEqual(self.server.server_address[0], '127.0.0.1')

    def test_exact_origin_and_no_wildcard_cors(self):
        for origin in ('https://evil.example', 'null', ORIGIN+'.evil', ORIGIN+'/', ''):
            status, headers, _ = self.request('/v1/pair', {'code':self.code}, origin=origin)
            self.assertEqual(status, 403)
            self.assertNotIn('Access-Control-Allow-Origin', headers)
        _, headers, _ = self.request('/v1/pair', {'code':self.code})
        self.assertEqual(headers['Access-Control-Allow-Origin'], ORIGIN)
        self.assertNotIn('Access-Control-Allow-Credentials', headers)

    def test_rebinding_host_rejected(self):
        status, headers, _ = self.request('/v1/pair', {'code':self.code}, headers={'Host':'rebound.evil'})
        self.assertEqual(status, 403)
        self.assertNotIn('Access-Control-Allow-Origin', headers)

    def test_pair_code_one_use(self):
        token = self.pair()
        self.assertEqual(self.request('/v1/pair', {'code':self.code})[0], 401)
        self.assertEqual(self.request('/v1/status', token=token, method='GET')[0], 200)

    def test_pair_attempt_limit(self):
        for _ in range(5):
            self.assertEqual(self.request('/v1/pair', {'code':'WRONG'})[0], 401)
        self.assertEqual(self.request('/v1/pair', {'code':self.code})[0], 401)

    def test_expired_code_and_session(self):
        self.app.code_expiry = 0
        self.assertEqual(self.request('/v1/pair', {'code':self.code})[0], 401)
        self.code = self.app.offer_pairing(ORIGIN)
        token = self.pair()
        self.app.session_expiry = 0
        self.assertEqual(self.request('/v1/status', token=token, method='GET')[0], 401)

    def test_no_unauthorized_decode_or_inference(self):
        with patch('service.decode_pixels') as decoder:
            self.assertEqual(self.request('/v1/analyze', self.payload())[0], 401)
            decoder.assert_not_called()
        self.assertIsNone(self.runtime.received)

    def test_failed_quality_gate_prevents_production_inference(self):
        self.app.observations_enabled = False
        token = self.pair()
        with patch('service.decode_pixels') as decoder:
            self.assertEqual(self.request('/v1/analyze', self.payload(), token)[0], 503)
            decoder.assert_not_called()
        self.assertIsNone(self.runtime.received)

    def test_privacy_source_metadata_removed_before_inference(self):
        token = self.pair()
        self.assertEqual(self.request('/v1/analyze', self.payload(), token)[0], 200)
        self.assertNotIn(b'PRIVATE', self.runtime.received)
        with Image.open(io.BytesIO(self.runtime.received)) as image:
            self.assertEqual(dict(image.getexif()), {})
            self.assertEqual(image.size, (20,10))

    def test_unknown_paths_and_filesystem_commands_rejected(self):
        token = self.pair()
        for path in ('/etc/passwd', '/v1/analyze?image=file:///C:/secret', '/v1/command', '/v1/../status'):
            self.assertEqual(self.request(path, token=token)[0], 404)
        self.assertEqual(self.request('/v1/analyze', {**self.payload(), 'prompt':'run a command'}, token)[0], 400)

    def test_size_content_type_and_malformed_json(self):
        token = self.pair()
        self.assertEqual(self.request('/v1/analyze', token=token, headers={'Content-Length':str(MAX_BODY + 1)}, raw='{}')[0], 413)
        self.assertEqual(self.request('/v1/analyze', token=token, headers={'Content-Type':'text/plain'})[0], 415)
        self.assertEqual(self.request('/v1/analyze', token=token, raw='{')[0], 400)
        self.assertEqual(self.request('/v1/analyze', token=token, raw='[]')[0], 400)
        self.assertEqual(self.request('/v1/analyze', token=token, raw='{"id":"one","image":"bad"}')[0], 400)

    def test_preflight_has_exact_methods_headers_and_origin(self):
        status, headers, _ = self.request('/v1/analyze', method='OPTIONS', headers={'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'})
        self.assertEqual(status, 200)
        self.assertEqual(headers['Access-Control-Allow-Origin'], ORIGIN)
        self.assertEqual(self.request('/v1/analyze', method='OPTIONS', headers={'Access-Control-Request-Method':'DELETE'})[0], 403)
        self.assertEqual(self.request('/v1/analyze', method='OPTIONS', headers={'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'x-command'})[0], 403)

    def test_concurrency_rejected_cancel_after_session_expiry_unloads(self):
        token = self.pair()
        self.runtime.release.clear()
        results = []
        worker = threading.Thread(target=lambda: results.append(self.request('/v1/analyze', self.payload(), token)))
        worker.start()
        self.assertTrue(self.runtime.started.wait(3))
        self.assertEqual(self.request('/v1/analyze', {**self.payload(), 'id':'two'}, token)[0], 409)
        self.app.session_expiry = 0
        self.assertEqual(self.request('/v1/cancel', {'id':'one'}, token)[0], 200)
        worker.join(5)
        self.assertEqual(results[0][0], 409)
        self.assertEqual(self.runtime.state, 'stopped')

    def test_disconnect_revokes_token_and_stops_active_generation(self):
        token = self.pair()
        self.app.active_id = 'one'
        self.assertEqual(self.request('/v1/disconnect', {}, token)[0], 200)
        self.assertEqual(self.runtime.state, 'stopped')
        self.assertEqual(self.request('/v1/status', token=token, method='GET')[0], 401)


class ContractTests(unittest.TestCase):
    def test_strict_response_shape(self):
        self.assertEqual(validate_output(GOOD), GOOD)
        for value in (None, [], {**GOOD,'identity':'person'}, {**GOOD,'main_visible_objects':'cat'},
                      {**GOOD,'image_description':''}, {**GOOD,'image_description':'x'*2001},
                      {**GOOD,'main_visible_objects':['cat']*41}, {**GOOD,'uncertainties':[123]}):
            with self.assertRaises(SafeError):
                validate_output(value)

    def test_image_dimensions_and_format(self):
        for raw in (b'bad', image_bytes(size=(MAX_SIDE+1,1))):
            with self.assertRaises(SafeError):
                decode_pixels(base64.b64encode(raw).decode())
        with self.assertRaises(SafeError):
            decode_pixels('file:///secret')

    def test_origin_configuration_is_explicit_https(self):
        self.assertEqual(exact_origin(ORIGIN), ORIGIN)
        for value in ('http://evil.example', 'https://*.example', ORIGIN+'/', ORIGIN+'?code=x', 'https://user:pass@hidden-data.example'):
            with self.assertRaises(ValueError):
                exact_origin(value)

    def test_missing_import_is_not_available(self):
        runtime = Runtime()
        self.assertEqual(runtime.state, 'unavailable')
        with self.assertRaises(SafeError):
            runtime.start()

    def test_duplicate_and_nonfinite_json_rejected(self):
        for raw in ('{"summary":"a","summary":"b"}', '{"value":NaN}', '{"value":Infinity}'):
            with self.assertRaises(ValueError):
                strict_json(raw)

    def test_stale_preprocessing_cannot_start_after_cancel(self):
        runtime = Runtime()
        runtime.state = 'ready'
        epoch = runtime.epoch
        runtime.stop()
        with self.assertRaises(SafeError):
            runtime.infer(image_bytes(), expected_epoch=epoch)


if __name__ == '__main__':
    unittest.main(verbosity=2)
