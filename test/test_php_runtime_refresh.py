import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    'activation', Path(__file__).resolve().parents[1] / 'scripts/activate-hosting-release.py')
activation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(activation)


class RuntimeRefreshTests(unittest.TestCase):
    def test_protected_post_refresh_and_cleanup(self):
        with tempfile.TemporaryDirectory() as folder:
            public = Path(folder)

            def respond(request, timeout):
                files = list(public.glob('runtime-refresh-*.php'))
                self.assertEqual(len(files), 1)
                source = files[0].read_text()
                self.assertEqual(request.get_method(), 'POST')
                self.assertIn(hashlib.sha256(request.data).hexdigest(), source)
                self.assertNotIn(request.data.decode(), source)
                self.assertIn("!=='POST'", source)
                self.assertIn('opcache_reset()', source)
                return io.BytesIO(json.dumps({'enabled': True, 'reset': True}).encode())

            with patch.object(activation.urllib.request, 'urlopen', side_effect=respond):
                activation.refresh_php_runtime(public)
            self.assertEqual(list(public.iterdir()), [])

    def test_network_failure_removes_endpoint(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(activation.urllib.request, 'urlopen', side_effect=OSError('offline')):
                with self.assertRaises(OSError):
                    activation.refresh_php_runtime(Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_failed_cache_reset_rejects_release(self):
        with tempfile.TemporaryDirectory() as folder:
            response = io.BytesIO(b'{"enabled":true,"reset":false}')
            with patch.object(activation.urllib.request, 'urlopen', return_value=response):
                with self.assertRaises(RuntimeError):
                    activation.refresh_php_runtime(Path(folder))
            self.assertEqual(list(Path(folder).iterdir()), [])


if __name__ == '__main__':
    unittest.main()
