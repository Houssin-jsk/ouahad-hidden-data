"""Local parity checks against the untouched OUAHAD AI implementation.

Set HIDDEN_DATA_REFERENCE_DIR when the reference checkout is not a sibling.
These are source/configuration, text-integrity and pixel checks, never a model
grounding score. All reference imports disable bytecode writes.
"""
import ast
import base64
import copy
import io
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'companion'))
from PIL import Image
import reference_quality
from service import CONTRACT, Runtime, SafeError, decode_pixels, validate_output

REFERENCE = Path(os.environ.get('HIDDEN_DATA_REFERENCE_DIR', str(ROOT.parent / 'ouahad-ai')))
ENGINE = REFERENCE / 'vision_engine'
AVAILABLE = (ENGINE / 'engine/providers.py').is_file()
if AVAILABLE:
    sys.path.insert(0, str(ENGINE))
    from engine.config import Settings
    from engine.images import prepare_image
    from engine.providers import SAFETY_INSTRUCTIONS, validate_content
    from engine.quality import quality_issues
    from engine.schemas import VisionContent
    from fastapi import HTTPException

GOOD = {
    'image_description': 'The image shows a red rectangle on a plain white background.',
    'main_visible_objects': ['red rectangle'],
    'scene_and_surroundings': None,
    'notable_visual_details': [],
    'uncertainties': [],
}


def encode(image, fmt='PNG', **kwargs):
    output = io.BytesIO()
    image.save(output, fmt, **kwargs)
    return output.getvalue()


def model_pixels(raw):
    return decode_pixels(base64.b64encode(raw).decode('ascii'))


@unittest.skipUnless(AVAILABLE, 'Reference checkout is required for source parity qualification.')
class ReferenceEquivalenceTests(unittest.TestCase):
    def test_system_and_baseline_prompt_are_exact_reference_text(self):
        self.assertEqual(CONTRACT['system'], SAFETY_INSTRUCTIONS)
        prompt = json.loads((ENGINE / 'config/prompt.json').read_text(encoding='utf-8'))
        self.assertEqual(CONTRACT['instruction'], prompt['analysis_instructions'])
        self.assertEqual(CONTRACT['provenance']['profile'], 'baseline')

    def test_observation_schema_is_the_exact_five_field_reference_schema(self):
        self.assertEqual(CONTRACT['schema'], VisionContent.model_json_schema())
        self.assertNotIn('relationships', CONTRACT['schema']['required'])
        self.assertEqual(validate_output(GOOD), VisionContent(**GOOD).model_dump())

    def test_generation_and_image_limits_follow_reference_settings(self):
        settings = json.loads((ENGINE / 'config/settings.json').read_text(encoding='utf-8'))
        installed = json.loads((REFERENCE / 'models/qwen3-vl-2b-instruct/metadata/ollama-parameters.json').read_text())
        self.assertEqual(CONTRACT['generation'], {
            'temperature': 0, 'top_k': installed['top_k'], 'top_p': installed['top_p'],
            'max_tokens': settings['max_output_tokens'], 'cache_prompt': False,
        })
        self.assertEqual(CONTRACT['image']['maxSide'], settings['max_image_side'])
        self.assertEqual(CONTRACT['image']['maxBytes'], settings['max_upload_bytes'])
        self.assertEqual(CONTRACT['image']['jpegQuality'], 90)

    def test_text_quality_function_asts_are_unmodified_reference_functions(self):
        def functions(path):
            tree = ast.parse(path.read_text(encoding='utf-8'))
            return {item.name: ast.dump(item, include_attributes=False)
                    for item in tree.body if isinstance(item, ast.FunctionDef)}
        reference = functions(ENGINE / 'engine/quality.py')
        adapted = functions(ROOT / 'companion/reference_quality.py')
        for name in ('normalized', 'object_key', 'quality_issues'):
            self.assertEqual(adapted[name], reference[name], name)

    def test_reference_text_guard_regressions_preserve_decisions_and_claims(self):
        cases = [
            ({}, []),
            ({'main_visible_objects': ['dog', 'A DOG!']}, ['duplicate_objects']),
            ({'uncertainties': ['None.']}, ['empty_uncertainty_entry']),
            ({'image_description': 'There are two dogs in the image.',
              'scene_and_surroundings': 'There are three dogs in the image.'}, ['explicit_count_contradiction']),
            ({'image_description': 'The door is open.',
              'scene_and_surroundings': 'The door is closed.'}, ['explicit_contradiction']),
            ({'image_description': 'No people are visible.',
              'main_visible_objects': ['person']}, ['explicit_presence_contradiction']),
            ({'image_description': 'A dog rests near the \u767d flowers.'}, ['non_latin_letters']),
            ({'image_description': 'A dog rests near a green field with the'}, ['dangling_fragment']),
            ({'scene_and_surroundings': 'The door is open.',
              'uncertainties': ['It is unclear whether the door was closed earlier.']}, []),
        ]
        for changes, expected in cases:
            with self.subTest(changes=changes):
                value = {**copy.deepcopy(GOOD), **changes}
                before = copy.deepcopy(value)
                self.assertEqual(quality_issues(VisionContent(**value)), expected)
                self.assertEqual(reference_quality.quality_issues(reference_quality.VisionContent(value)), expected)
                if expected:
                    with self.assertRaises(HTTPException):
                        validate_content(json.dumps(value))
                    with self.assertRaises(SafeError):
                        validate_output(value)
                else:
                    self.assertEqual(validate_output(value), validate_content(json.dumps(value)).model_dump())
                self.assertEqual(value, before, 'No deletion, repair or rewriting of rejected claims.')

    def test_valid_json_and_text_checks_do_not_claim_to_establish_visual_truth(self):
        # Reused reference regression: a self-consistent false claim still needs
        # human/pixel evidence. Neither implementation may call this grounded.
        value = {**GOOD, 'image_description': 'A purple elephant stands beside a golden spaceship.'}
        self.assertEqual(validate_output(value), validate_content(json.dumps(value)).model_dump())

    def test_service_jpeg90_is_byte_identical_to_reference_for_identical_inputs(self):
        rgba = Image.new('RGBA', (80, 32), (220, 20, 30, 128))
        rgba.paste((0, 80, 240, 255), (0, 0, 16, 32))
        alpha = Image.new('LA', (12, 20), (90, 128))
        rgb = rgba.convert('RGB')
        tags = Image.Exif()
        tags[274] = 6
        tags[270] = 'PRIVATE-LOCATION-METADATA'
        sources = [
            (encode(rgba), 'image/png'),
            (encode(alpha), 'image/png'),
            (encode(rgb), 'image/png'),
            (encode(rgb, 'JPEG', quality=95, exif=tags), 'image/jpeg'),
        ]
        for raw, mime in sources:
            with self.subTest(mime=mime, bytes=len(raw)):
                actual = model_pixels(raw)
                self.assertEqual(actual, prepare_image(raw, mime, Settings()))
                self.assertNotIn(b'PRIVATE', actual)
                with Image.open(io.BytesIO(actual)) as frame:
                    self.assertEqual(frame.getexif(), {})
                    self.assertEqual(frame.format, 'JPEG')


class CompanionPixelAndPayloadTests(unittest.TestCase):
    def test_native_request_uses_single_contract_and_unmodified_jpeg_pixels(self):
        runtime = Runtime()
        runtime.state = 'ready'
        runtime.process = object()
        pixels = model_pixels(encode(Image.new('RGB', (10, 10), 'red')))
        result = {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(GOOD)}}]}
        with patch.object(runtime, '_request', return_value=result) as request:
            actual = runtime.infer(pixels, expected_epoch=runtime.epoch)
        path, payload = request.call_args.args
        self.assertEqual(path, '/v1/chat/completions')
        self.assertEqual(actual['observations'], GOOD)
        self.assertEqual(actual['version'], CONTRACT['version'])
        self.assertEqual(payload['response_format'], {'type': 'json_object', 'schema': CONTRACT['schema']})
        self.assertEqual(payload['messages'][0], {'role': 'system', 'content': CONTRACT['system']})
        user = payload['messages'][1]['content']
        self.assertEqual(user[0], {'type': 'text', 'text': CONTRACT['instruction']})
        self.assertEqual(base64.b64decode(user[1]['image_url']['url'].split(',')[1]), pixels)
        self.assertEqual({key: payload[key] for key in CONTRACT['generation']}, CONTRACT['generation'])
        self.assertNotIn('seed', payload)
        self.assertNotIn('repeat_penalty', payload)

    def test_white_alpha_compositing_orientation_and_edges_are_preserved(self):
        source = Image.new('RGBA', (1536, 192), (0, 0, 0, 0))
        source.paste((255, 0, 0, 255), (0, 0, 32, 192))
        source.paste((0, 0, 255, 255), (1504, 0, 1536, 192))
        source.paste((0, 0, 0, 128), (700, 0, 800, 192))
        raw = model_pixels(encode(source))
        with Image.open(io.BytesIO(raw)) as frame:
            self.assertEqual(frame.size, source.size)
            for point, wanted in [((10, 80), (255, 0, 0)), ((1520, 80), (0, 0, 255)),
                                  ((400, 80), (255, 255, 255)), ((750, 80), (127, 127, 127))]:
                self.assertTrue(all(abs(a - b) <= 3 for a, b in zip(frame.getpixel(point), wanted)))
            self.assertEqual(frame.getexif(), {})
        # Source EXIF rotates once and is omitted from model bytes.
        exif = Image.Exif()
        exif[274] = 6
        tagged = encode(source.convert('RGB'), 'JPEG', exif=exif)
        with Image.open(io.BytesIO(model_pixels(tagged))) as frame:
            self.assertEqual(frame.size, (192, 1536))
            self.assertEqual(frame.getexif(), {})

    def test_malformed_truncated_and_non_english_outputs_are_rejected(self):
        for changes in [
            {'image_description': 'Une image montre un rectangle rouge sur un fond blanc.'},
            {'image_description': 'The image shows a red rectangle near the'},
            {'main_visible_objects': ['rectangle', 'A rectangle!']},
            {'uncertainties': ['No uncertainties.']},
        ]:
            with self.subTest(changes=changes), self.assertRaises(SafeError):
                validate_output({**GOOD, **changes})
        runtime = Runtime()
        runtime.state = 'ready'
        runtime.process = object()
        truncated = {'choices': [{'finish_reason': 'length', 'message': {'content': json.dumps(GOOD)}}]}
        with patch.object(runtime, '_request', return_value=truncated), self.assertRaises(SafeError):
            runtime.infer(b'not needed for this transport stub')


if __name__ == '__main__':
    unittest.main(verbosity=2)
