"""Prune inactive releases on Alwaysdata to prevent disk quota exhaustion."""
import shutil
from pathlib import Path

HOME = Path('/home/sigma-elms')
web = HOME / 'www'
active = web.resolve().parent if web.exists() else None

# Delete all zip files in home and releases
for z in list(HOME.glob('*.zip')) + list((HOME / 'sigma-releases').glob('*.zip')):
    try:
        z.unlink()
    except Exception:
        pass

# Delete all non-active releases
releases_dir = HOME / 'sigma-releases'
if releases_dir.exists():
    for r in releases_dir.iterdir():
        if r.is_dir() and (active is None or r.resolve() != active.resolve()):
            print('Pruned old release:', r.name)
            shutil.rmtree(r, ignore_errors=True)
