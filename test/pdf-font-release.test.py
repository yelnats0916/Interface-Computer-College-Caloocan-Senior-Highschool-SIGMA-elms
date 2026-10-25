"""Ensure releases contain the font assets required by the shared PDF exporter."""
from pathlib import Path
import hashlib
import importlib.util
import tempfile
import zipfile
import json
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('hosting_build',root/'scripts/build-hosting-release.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as folder:
 archive=Path(folder)/'release.zip';module.build(archive,'/home/sigma-elms/sigma-private/runtime.php')
 with zipfile.ZipFile(archive) as z:
  manifest=json.loads(z.read('manifest.json'))
  for name in ['NotoSans-Regular.ttf','NotoSans-Bold.ttf','LICENSE-NotoSans.txt']:
   path='public/js/vendor/fonts/'+name
   content=z.read(path)
   assert content==(root/'js/vendor/fonts'/name).read_bytes()
   assert manifest[path]==hashlib.sha256(content).hexdigest()
   if name.endswith('.ttf'):assert content[:4]==b'\x00\x01\x00\x00'
print('PASS release includes both PDF fonts and license with matching manifest digests')
