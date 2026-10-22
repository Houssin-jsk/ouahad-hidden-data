"""Loopback-only companion; no framework, database, image files, or telemetry."""
import base64
import binascii
import ctypes
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import io
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

from PIL import Image, ImageOps
from reference_quality import validate_reference_quality

HERE = Path(__file__).resolve().parent
CONTRACT = json.loads((HERE / 'contract.json').read_text(encoding='utf-8'))
PROMOTION = json.loads((HERE / 'promotion.json').read_text(encoding='utf-8'))
APPROVED = PROMOTION.get('approved') is True and PROMOTION.get('contractSha256') == hashlib.sha256((HERE / 'contract.json').read_bytes()).hexdigest()
PORT = 18431
PRODUCTION_ORIGIN = 'https://hidden-data.ouahad.space'
MAX_BODY = 14_000_000
MAX_JPEG = CONTRACT['image']['maxBytes']
MAX_SIDE = CONTRACT['image']['maxSide']
TIMEOUT = 180
MODEL_HASH = 'bd2179e37645d5435e0214e5399e5997408a7e9685ba527cbb60726e6a32fd99'
PROJECTOR_HASH = '4dc7bc5863d7fc3ad784acf677f72f009ab5fd3758855f1996b678b621817190'
RUNTIME_HASH = 'bb3d2f86e3d8907c4febc3d7a299a8d13d95ddc281c5f81fe496e0d32b12dca3'


class SafeError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def strict_json(raw):
    def pairs(entries):
        result = {}
        for key, value in entries:
            if key in result:
                raise ValueError('Duplicate JSON field')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=pairs,
        parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Non-finite JSON value')))


def exact_origin(value, development=False):
    parsed = urlsplit(value)
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path:
        raise ValueError('Enter an origin without a path, password, query, or trailing slash.')
    if not parsed.hostname or '*' in value or parsed.netloc != parsed.netloc.lower():
        raise ValueError('Enter the exact lowercase website origin.')
    if parsed.scheme != 'https' and not (development and value == 'http://127.0.0.1:3001'):
        raise ValueError('The website must use HTTPS.')
    if parsed.port and not 1 <= parsed.port <= 65535:
        raise ValueError('Invalid website port.')
    if value != PRODUCTION_ORIGIN and not (development and value == 'http://127.0.0.1:3001'):
        raise ValueError('Only the official Hidden Data origin is supported. Preview and other sites are denied.')
    return value


def validate_output(value):
    schema = CONTRACT['schema']
    if not isinstance(value, dict) or set(value) != set(schema['required']):
        raise SafeError(422, 'The model returned an unsupported response. No observations were accepted.')
    clean = {}
    for key, spec in schema['properties'].items():
        if key == 'scene_and_surroundings' and value[key] is None:
            clean[key] = None
            continue
        scalar = key in ('image_description','scene_and_surroundings')
        entries = [value[key]] if scalar else value[key]
        if not isinstance(entries, list) or len(entries) > spec.get('maxItems', 1):
            raise SafeError(422, 'The model response did not match the observation contract.')
        limit = 2000
        if any(not isinstance(item, str) or not 0 < len(item.strip()) <= limit or
               any(ord(c) < 32 and c not in '\n\t' for c in item) for item in entries):
            raise SafeError(422, 'The model response did not match the observation contract.')
        clean[key] = entries[0].strip() if scalar else [item.strip() for item in entries]
    try:
        return validate_reference_quality(clean)
    except ValueError:
        raise SafeError(422, 'The model response failed the reference language or text-quality checks. No observations were accepted.') from None


def decode_pixels(encoded):
    """Bounded lossless browser pixels, encoded to model JPEG90 only once."""
    if not isinstance(encoded, str) or len(encoded) > 13_981_016:
        raise SafeError(413, 'The image payload exceeds the local limit.')
    try:
        raw = base64.b64decode(encoded, validate=True)
        if not 0 < len(raw) <= MAX_JPEG:
            raise SafeError(413, 'The image payload exceeds the local limit.')
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in ('PNG','JPEG') or getattr(image, 'n_frames', 1) != 1:
                raise SafeError(415, 'Use the website to send a decoded pixel preview.')
            if min(image.size) < 1 or max(image.size) > MAX_SIDE:
                raise SafeError(413, 'The image exceeds the 1536-pixel side limit.')
            image.load()
            frame = ImageOps.exif_transpose(image)
            clean = Image.new('RGB', frame.size, 'white')
            if frame.mode in ('RGBA','LA') or 'transparency' in frame.info:
                rgba = frame.convert('RGBA')
                clean.paste(rgba, mask=rgba.getchannel('A'))
            else:
                clean.paste(frame.convert('RGB'))
            out = io.BytesIO()
            clean.save(out, format='JPEG', quality=CONTRACT['image']['jpegQuality'], optimize=False)
            clean.close()
            return out.getvalue()
    except (binascii.Error, OSError, ValueError, Image.DecompressionBombError):
        raise SafeError(400, 'The image pixels could not be decoded.') from None


class Runtime:
    def __init__(self):
        self.root = None
        self.process = None
        self.key = None
        self.port = None
        self.state = 'unavailable'
        self.lock = threading.RLock()
        self.opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        self.epoch = 0
        self.job = None
        self.loading_seconds = None
        self.last_metrics = None

    def import_package(self, directory):
        root = Path(directory).resolve(strict=True)
        # All native DLLs are trusted executable inputs: verify the complete pinned inventory.
        inventory = json.loads((HERE / 'artifacts.json').read_text(encoding='utf-8'))
        for item in inventory:
            path = root / item['path']
            if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root):
                raise SafeError(400, 'The selected model package is incomplete.')
            if path.stat().st_size != item['bytes']:
                raise SafeError(400, 'The model package does not match the supported version.')
            with path.open('rb') as stream:
                if hashlib.file_digest(stream, 'sha256').hexdigest() != item['sha256']:
                    raise SafeError(400, 'The model package failed its integrity check.')
        with self.lock:
            if self.process is not None:
                raise SafeError(409, 'Stop the model before importing a package.')
            self.root, self.state = root, 'stopped'

    def _request(self, path, payload=None, timeout=TIMEOUT):
        headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + self.key}
        request = urllib.request.Request(f'http://127.0.0.1:{self.port}' + path,
            data=None if payload is None else json.dumps(payload).encode(), headers=headers)
        with self.opener.open(request, timeout=timeout) as response:
            raw = response.read(65537)
            if len(raw) > 65536:
                raise SafeError(422, 'The model response exceeded its limit.')
            return strict_json(raw)

    def start(self):
        with self.lock:
            if self.process is not None or self.root is None:
                raise SafeError(409, 'Import a package and stop any existing model first.')
            self.state = 'loading'
            self.epoch += 1
            epoch = self.epoch
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', 0))
                self.port = probe.getsockname()[1]
            self.key = secrets.token_urlsafe(32)
            runtime = self.root / 'runtime/windows-x64-cpu'
            env = {k:v for k,v in os.environ.items() if not k.upper().startswith(
                ('LLAMA_', 'OLLAMA_', 'GGML_', 'MTMD_', 'HF_', 'PYTHON'))}
            env['PATH'] = str(runtime) + os.pathsep + str(Path(os.environ['SystemRoot']) / 'System32')
            env['LLAMA_API_KEY'] = self.key  # Never argv, files or logs.
            args = [str(runtime / 'llama-server.exe'), '--model', str(self.root / 'weights/model-q4_k_m.gguf'),
                '--mmproj', str(self.root / 'vision/mmproj.gguf'), '--host', '127.0.0.1',
                '--port', str(self.port), '--ctx-size', '4096', '--parallel', '1', '--threads', '4',
                '--threads-batch', '4', '--gpu-layers', '0', '--device', 'none', '--no-mmproj-offload',
                '--offline', '--no-webui', '--no-slots', '--cors-origins', 'http://127.0.0.1:18431',
                '--no-cors-credentials', '--timeout', '180', '--cache-ram', '0', '--log-disable']
            self.process = subprocess.Popen(args, cwd=runtime, env=env, stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW)
            self._own_job()
        start = time.monotonic()
        while time.monotonic() - start < TIMEOUT:
            with self.lock:
                if epoch != self.epoch:
                    return
                if self.process.poll() is not None:
                    self.stop()
                    self.state = 'failed'
                    raise SafeError(503, 'The native model could not start on this computer.')
            try:
                if self._request('/health', timeout=2).get('status') == 'ok':
                    with self.lock:
                        if epoch == self.epoch:
                            self.loading_seconds = time.monotonic() - start
                            self.state = 'ready'
                    return
            except (OSError, ValueError):
                pass
            time.sleep(.25)
        self.stop()
        self.state = 'failed'
        raise SafeError(504, 'Model loading timed out.')

    def _own_job(self):
        # Windows kills the native model even if the GUI is terminated unexpectedly.
        from ctypes import wintypes
        class Basic(ctypes.Structure):
            _fields_ = [('perProcess', ctypes.c_int64), ('perJob', ctypes.c_int64),
                ('flags', wintypes.DWORD), ('min', ctypes.c_size_t), ('max', ctypes.c_size_t),
                ('active', wintypes.DWORD), ('affinity', ctypes.c_size_t),
                ('priority', wintypes.DWORD), ('scheduling', wintypes.DWORD)]
        class IO(ctypes.Structure):
            _fields_ = [(name, ctypes.c_uint64) for name in ('r','w','o','rb','wb','ob')]
        class Extended(ctypes.Structure):
            _fields_ = [('basic', Basic), ('io', IO), ('processMemory', ctypes.c_size_t),
                ('jobMemory', ctypes.c_size_t), ('peakProcess', ctypes.c_size_t), ('peakJob', ctypes.c_size_t)]
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.CreateJobObjectW.restype = wintypes.HANDLE
        kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
        kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        job = kernel.CreateJobObjectW(None, None)
        info = Extended()
        info.basic.flags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not job or not kernel.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)) or not kernel.AssignProcessToJobObject(job, int(self.process._handle)):
            self.process.terminate()
            self.process.wait(timeout=15)
            self.process = None
            if job:
                kernel.CloseHandle(wintypes.HANDLE(job))
            raise SafeError(503, 'Windows could not establish safe process ownership.')
        self.job = job

    def stop(self):
        with self.lock:
            self.epoch += 1
            if self.process:
                if self.process.poll() is None:
                    self.process.terminate()
                    try:
                        self.process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        self.process.kill()
                        self.process.wait(timeout=5)
                self.process = None
            if self.job:
                ctypes.WinDLL('kernel32').CloseHandle(ctypes.c_void_p(self.job))
                self.job = None
            self.key = None
            self.state = 'stopped' if self.root else 'unavailable'

    def infer(self, pixels, expected_epoch=None):
        with self.lock:
            if self.state != 'ready' or (expected_epoch is not None and self.epoch != expected_epoch):
                raise SafeError(409, 'Start the model in the companion and wait until it is ready.')
            self.state = 'busy'
            epoch = self.epoch
        try:
            payload = {**CONTRACT['generation'], 'stream': False,
                'response_format': {'type': 'json_object', 'schema': CONTRACT['schema']},
                'messages': [{'role': 'system', 'content': CONTRACT['system']},
                    {'role': 'user', 'content': [
                        {'type': 'text', 'text': CONTRACT['instruction']},
                        {'type': 'image_url', 'image_url': {'url': 'data:image/jpeg;base64,' + base64.b64encode(pixels).decode()}}]}]}
            start = time.monotonic()
            result = self._request('/v1/chat/completions', payload)
            self.last_metrics = {'usage': result.get('usage'), 'timings': result.get('timings')}
            if epoch != self.epoch:
                raise SafeError(409, 'Analysis was cancelled.')
            choice = result['choices'][0]
            if choice['finish_reason'] != 'stop':
                raise SafeError(422, 'The model response was incomplete. No observations were accepted.')
            value = validate_output(strict_json(choice['message']['content']))
            return {'version': CONTRACT['version'], 'observations': value, 'limitations': CONTRACT['limitations'],
                'model': 'Qwen3-VL 2B Instruct Q4_K_M', 'elapsedSeconds': time.monotonic() - start}
        except SafeError:
            raise
        except (OSError, ValueError, KeyError, IndexError, TypeError):
            self.stop()  # Timeouts/disconnections must not leave generation running.
            raise SafeError(503, 'Local inference stopped or returned an unsupported response. Restart the model to retry.') from None
        finally:
            with self.lock:
                if epoch == self.epoch and self.process is not None:
                    self.state = 'ready'


class Companion:
    def __init__(self, runtime, development=False, observations_enabled=APPROVED):
        self.runtime = runtime
        self.observations_enabled = observations_enabled
        self.development = development
        self.origins = set()
        self.lock = threading.RLock()
        self.generation = threading.Lock()
        self.code = None
        self.code_expiry = 0
        self.pair_failures = 0
        self.token = None
        self.session_origin = None
        self.session_expiry = 0
        self.active_id = None

    def offer_pairing(self, origin):
        exact_origin(origin, self.development)
        with self.lock:
            self.disconnect()
            self.origins = {origin}
            self.code = secrets.token_hex(4).upper()
            self.code_expiry = time.monotonic() + 90
            self.pair_failures = 0
            return self.code

    def pair(self, origin, value):
        with self.lock:
            if self.pair_failures >= 5 or not self.code or time.monotonic() >= self.code_expiry:
                raise SafeError(401, 'Generate a new pairing code in the companion.')
            self.pair_failures += 1
            if not isinstance(value, str) or not secrets.compare_digest(value, self.code):
                raise SafeError(401, 'Pairing code was not accepted.')
            self.code = None
            self.token = secrets.token_urlsafe(32)
            self.session_origin = origin
            self.session_expiry = time.monotonic() + 120
            return {'token': self.token, 'expiresIn': 120, 'observationsEnabled':self.observations_enabled}

    def authorize(self, origin, authorization, allow_expired_cancel=False):
        with self.lock:
            if not self.token or origin != self.session_origin or not secrets.compare_digest(authorization, 'Bearer ' + self.token):
                raise SafeError(401, 'Pair with the companion before continuing.')
            if time.monotonic() >= self.session_expiry and not (allow_expired_cancel and self.active_id):
                raise SafeError(401, 'The short pairing session expired. Pair again to continue.')

    def disconnect(self):
        with self.lock:
            if self.active_id:
                self.runtime.stop()
            self.token = self.session_origin = self.code = self.active_id = None
            self.session_expiry = 0


class Server(ThreadingHTTPServer):
    daemon_threads = True
    request_queue_size = 8
    allow_reuse_address = False

    def __init__(self, app, port=PORT):
        self.app = app
        self.capacity = threading.BoundedSemaphore(8)
        super().__init__(('127.0.0.1', port), Handler)

    def process_request(self, request, address):
        if not self.capacity.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, address)
        except Exception:
            self.capacity.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.capacity.release()

    def handle_error(self, request, client_address):
        pass  # No request/image/credential/traceback logging.


class Handler(BaseHTTPRequestHandler):
    server_version = 'HiddenDataCompanion'
    sys_version = ''

    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def log_message(self, *args):
        pass

    def guard(self):
        self.origin = None
        if self.client_address[0] != '127.0.0.1' or self.headers.get_all('Host') != [f'127.0.0.1:{self.server.server_port}']:
            raise SafeError(403, 'Local host was not accepted.')
        origins = self.headers.get_all('Origin')
        if not origins or len(origins) != 1 or origins[0] not in self.server.app.origins:
            raise SafeError(403, 'Website origin was not authorized in the companion.')
        self.origin = origins[0]
        if self.path not in ('/v1/status', '/v1/pair', '/v1/analyze', '/v1/cancel', '/v1/disconnect'):
            raise SafeError(404, 'Unknown companion operation.')

    def respond(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Connection', 'close')
        if getattr(self, 'origin', None):
            self.send_header('Access-Control-Allow-Origin', self.origin)
            self.send_header('Vary', 'Origin')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.close_connection = True
        try:
            self.wfile.write(body)
        except OSError:
            pass

    def do_OPTIONS(self):
        try:
            self.guard()
            if self.headers.get('Access-Control-Request-Method') not in ('GET', 'POST'):
                raise SafeError(403, 'Method was not accepted.')
            requested = {s.strip().lower() for s in self.headers.get('Access-Control-Request-Headers', '').split(',') if s.strip()}
            if not requested.issubset({'content-type', 'authorization'}):
                raise SafeError(403, 'Headers were not accepted.')
            self.respond(200, {})
        except SafeError as error:
            self.respond(error.status, {'error': error.message})

    def do_GET(self):
        self.handle_operation()

    def do_POST(self):
        self.handle_operation()

    def handle_operation(self):
        app = self.server.app
        try:
            self.guard()
            if self.command == 'GET' and self.path == '/v1/status':
                app.authorize(self.origin, self.headers.get('Authorization', ''))
                self.respond(200, {'state': app.runtime.state, 'version': '1.0.0'})
                return
            if self.command != 'POST' or self.path == '/v1/status':
                raise SafeError(405, 'Method was not accepted.')
            if self.path != '/v1/pair':
                app.authorize(self.origin, self.headers.get('Authorization', ''),
                    allow_expired_cancel=self.path in ('/v1/cancel', '/v1/disconnect'))
            if self.headers.get_all('Content-Type') != ['application/json'] or self.headers.get('Transfer-Encoding'):
                raise SafeError(415, 'Use a bounded JSON request.')
            lengths = self.headers.get_all('Content-Length')
            if not lengths or len(lengths) != 1 or not re.fullmatch(r'[0-9]{1,8}', lengths[0]):
                raise SafeError(400, 'A single bounded content length is required.')
            size = int(lengths[0])
            limit = MAX_BODY if self.path == '/v1/analyze' else 256
            if not 1 <= size <= limit:
                raise SafeError(413, 'Request exceeds its size limit.')
            raw = self.rfile.read(size)
            if len(raw) != size:
                raise SafeError(400, 'Request body was incomplete.')
            value = strict_json(raw)
            if not isinstance(value, dict):
                raise SafeError(400, 'Use a JSON object.')
            if self.path == '/v1/pair' and set(value) == {'code'}:
                self.respond(200, app.pair(self.origin, value['code']))
            elif self.path == '/v1/disconnect' and value == {}:
                app.disconnect()
                self.respond(200, {'state': 'disconnected'})
            elif self.path == '/v1/cancel' and set(value) == {'id'}:
                with app.lock:
                    if value['id'] == app.active_id:
                        app.runtime.stop()
                        app.active_id = None
                self.respond(200, {'state': app.runtime.state})
            elif self.path == '/v1/analyze' and set(value) == {'id', 'image'}:
                if not app.observations_enabled:
                    raise SafeError(503, 'AI observations are unavailable: the evaluated configuration did not pass its grounding quality gate.')
                if not isinstance(value['id'], str) or not re.fullmatch(r'[a-zA-Z0-9-]{1,64}', value['id']):
                    raise SafeError(400, 'Invalid request identifier.')
                if not app.generation.acquire(blocking=False):
                    raise SafeError(409, 'Another image is being analyzed. No request was queued.')
                try:
                    with app.lock:
                        app.authorize(self.origin, self.headers.get('Authorization', ''))
                        app.active_id = value['id']
                        epoch = app.runtime.epoch
                    pixels = decode_pixels(value['image'])
                    result = app.runtime.infer(pixels, epoch)
                    with app.lock:
                        if app.active_id != value['id']:
                            raise SafeError(409, 'Analysis was cancelled.')
                        self.respond(200, result)
                finally:
                    with app.lock:
                        app.active_id = None
                    app.generation.release()
            else:
                raise SafeError(400, 'Request does not match this operation.')
        except SafeError as error:
            self.respond(error.status, {'error': error.message})
        except (ValueError, UnicodeError):
            self.respond(400, {'error': 'Malformed JSON request.'})
        except (OSError, TimeoutError):
            self.respond(408, {'error': 'Local request timed out or disconnected.'})
        except Exception:
            self.respond(500, {'error': 'The companion could not complete this operation.'})
