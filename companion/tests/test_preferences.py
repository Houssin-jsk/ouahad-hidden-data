"""Restart preferences persist only an explicitly opted-in local folder path."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import load_preferences, save_preferences


class PreferenceTests(unittest.TestCase):
    def test_fresh_package_has_no_preference(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(load_preferences(Path(directory) / 'preferences.json'))

    def test_opt_in_round_trip_contains_only_nonsecret_folder(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'preferences.json'
            save_preferences('C:/models/exact-qwen-package', True, path)
            self.assertEqual(load_preferences(path), 'C:/models/exact-qwen-package')
            self.assertEqual(json.loads(path.read_text()), {'modelDirectory':'C:/models/exact-qwen-package'})
            self.assertEqual(list(Path(directory).iterdir()), [path])

    def test_opt_out_overwrites_preference_without_retaining_path(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'preferences.json'
            save_preferences('C:/models/exact-qwen-package', True, path)
            save_preferences('C:/models/exact-qwen-package', False, path)
            self.assertEqual(json.loads(path.read_text()), {})
            self.assertIsNone(load_preferences(path))

    def test_invalid_oversized_or_unexpected_fields_are_not_restored(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'preferences.json'
            for value in ('{', '[]', '{"modelDirectory":10}', '{"modelDirectory":""}',
                          '{"modelDirectory":"C:/models","token":"must-not-load"}', ' ' * 8193):
                path.write_text(value, encoding='utf-8')
                self.assertIsNone(load_preferences(path))


if __name__ == '__main__':
    unittest.main(verbosity=2)
