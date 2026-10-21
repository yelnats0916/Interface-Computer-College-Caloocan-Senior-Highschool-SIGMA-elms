"""Run on Alwaysdata over SSH. Verify a release and switch only the website files."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import re
import shlex
import shutil
import subprocess
import zipfile

HOME = Path('/home/sigma-elms')


def activate(archive: Path, release_name: str, initialize: bool = False):
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', release_name):
        raise ValueError('Invalid release name.')
    if not archive.resolve().is_relative_to(HOME):
        raise ValueError('Archive must be inside the hosting account.')
    release = HOME / 'sigma-releases' / release_name
    if release.exists():
        raise RuntimeError('Release already exists; no existing release will be overwritten.')
    release.mkdir(parents=True, mode=0o700)
    with zipfile.ZipFile(archive) as bundle:
        for entry in bundle.infolist():
            if not (release / entry.filename).resolve().is_relative_to(release.resolve()):
                raise ValueError('Unsafe archive path.')
        bundle.extractall(release)
    manifest = json.loads((release / 'manifest.json').read_text())
    for name, digest in manifest.items():
        path = release / name
        if not path.resolve().is_relative_to(release) or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise RuntimeError('Release integrity verification failed.')
    env = dict(os.environ)
    for line in (HOME / 'admin/config/apache/sites.conf').read_text().splitlines():
        if 'FcgidWrapper' in line:
            for word in shlex.split(shlex.split(line)[1]):
                if '=' in word:
                    key, value = word.split('=', 1)
                    if key in ['PHP_VERSION', 'PHPRC']:
                        env[key] = value
    for path in release.rglob('*.php'):
        result = subprocess.run(['/usr/bin/php', '-l', str(path)], env=env, capture_output=True)
        if result.returncode:
            raise RuntimeError('PHP syntax check failed: ' + str(path.relative_to(release)))
    if initialize:
        # Explicit initial setup only: the PHP command refuses nonempty databases.
        subprocess.run(['/usr/bin/php', str(release / 'operations/initialize-hosting.php')], env=env, check=True)
    verify = ('require ' + json.dumps(str(release / 'public/config/database.php')) + ';'
              "if (!$pdo || !$pdo->query(\"SHOW TABLES LIKE 'users'\")->fetch()) exit(1);")
    result = subprocess.run(['/usr/bin/php', '-r', verify], env=env, capture_output=True)
    if result.returncode:
        raise RuntimeError('Release database preflight failed. Existing website remains active.')
    for path in [HOME / 'sigma-releases', release, release / 'public']:
        path.chmod(0o755)
    for path in (release / 'public').rglob('*'):
        path.chmod(0o755 if path.is_dir() else 0o644)
    (release / 'operations').chmod(0o700)
    web = HOME / 'www'
    previous = str(web.resolve())
    if web.is_symlink():
        if not web.resolve().is_relative_to(HOME / 'sigma-releases'):
            raise RuntimeError('Unexpected existing website target.')
    elif web.is_dir():
        if set(path.name for path in web.iterdir()) != {'index.html'}:
            raise RuntimeError('Existing website folder requires manual review.')
        backup = HOME / ('www-before-' + release_name)
        if backup.exists():
            raise RuntimeError('Backup already exists.')
        web.rename(backup)
        previous = str(backup)
    else:
        raise RuntimeError('Website root is missing.')
    next_web = HOME / ('www-next-' + release_name)
    next_web.symlink_to(release / 'public', target_is_directory=True)
    try:
        os.replace(next_web, web)
    except Exception:
        if not web.exists() and Path(previous).is_dir():
            web.symlink_to(previous, target_is_directory=True)
        raise
    report = {'release': release_name, 'previousWebsite': previous,
              'verifiedFiles': len(manifest), 'databaseRecordsModified': 0}
    report_path = HOME / 'sigma-private/last-deployment.json'
    report_path.write_text(json.dumps(report, indent=2))
    report_path.chmod(0o600)
    # Keep the active release and its predecessor. Persistent data lives elsewhere.
    release_root = (HOME / 'sigma-releases').resolve()
    keep = {release.resolve(), Path(previous).parent.resolve()}
    for candidate in release_root.iterdir():
        if candidate.is_symlink() or not candidate.is_dir() or candidate.resolve() in keep:
            continue
        if not candidate.resolve().is_relative_to(release_root) or candidate.parent.resolve() != release_root:
            raise RuntimeError('Unexpected release cleanup path.')
        if re.fullmatch(r'(?:gh-[a-zA-Z0-9_-]+|20261021-foundation-v[0-9]+)', candidate.name):
            shutil.rmtree(candidate)
    archive.unlink()
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--release', required=True)
    parser.add_argument('--initialize', action='store_true')
    args = parser.parse_args()
    activate(args.archive, args.release, args.initialize)
