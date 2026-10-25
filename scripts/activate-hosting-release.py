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
import secrets
import urllib.request

HOME = Path('/home/sigma-elms')


def refresh_php_runtime(public: Path):
    """Refresh the web PHP cache after switching a symlink; CLI has a separate cache."""
    token = secrets.token_hex(32)
    name = 'runtime-refresh-' + secrets.token_hex(16) + '.php'
    path = public / name
    paths = {path}
    release_root = HOME / 'sigma-releases'
    if release_root.is_dir() and public.resolve().is_relative_to(release_root.resolve()):
        # PHP's realpath cache can still resolve /www to an older public root.
        # Publish the same protected one-use bridge there until cache reset completes.
        for release in release_root.iterdir():
            candidate = release / 'public'
            if candidate.is_dir() and candidate.resolve().is_relative_to(release_root.resolve()):
                paths.add(candidate / name)
    digest = hashlib.sha256(token.encode()).hexdigest()
    source = ("<?php header('Content-Type: application/json');header('Cache-Control: no-store');"
              "if(($_SERVER['REQUEST_METHOD']??'')!=='POST'||!hash_equals('" + digest + "',"
              "hash('sha256',file_get_contents('php://input')))){http_response_code(404);exit;}"
              "clearstatcache(true);$enabled=(bool)ini_get('opcache.enable');"
              "echo json_encode(['enabled'=>$enabled,'reset'=>function_exists('opcache_reset')?opcache_reset():null]);")
    try:
        for target in paths:
            target.write_text(source, encoding='utf-8')
            target.chmod(0o644)
        request = urllib.request.Request('https://sigma-elms.alwaysdata.net/' + name,
                                         data=token.encode(), headers={'Content-Type': 'text/plain'})
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.loads(response.read())
        if result.get('enabled') and result.get('reset') is not True:
            raise RuntimeError('The web PHP runtime cache could not be refreshed.')
    finally:
        for target in paths:
            target.unlink(missing_ok=True)


def activate(archive: Path, release_name: str, initialize: bool = False):
    if not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', release_name):
        raise ValueError('Invalid release name.')
    if not archive.resolve().is_relative_to(HOME):
        raise ValueError('Archive must be inside the hosting account.')
    release = HOME / 'sigma-releases' / release_name
    web = HOME / 'www'

    # Pre-clean inactive releases to guarantee disk quota headroom
    release_root = (HOME / 'sigma-releases').resolve()
    active_release = None
    if web.exists():
        try:
            active_release = web.resolve().parent.resolve()
        except Exception:
            pass
    if release_root.exists():
        for candidate in release_root.iterdir():
            if candidate.is_dir() and candidate.resolve() != active_release:
                try:
                    shutil.rmtree(candidate, ignore_errors=True)
                except Exception:
                    pass

    if release.exists():
        if web.is_symlink() and web.resolve() == (release / 'public').resolve():
            raise RuntimeError('Release is already the active website.')
        shutil.rmtree(release, ignore_errors=True)
    release.mkdir(parents=True, mode=0o700)
    try:
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
                sys.stderr.write(f"PHP syntax check failed on {path}:\n{result.stderr.decode('utf-8', errors='ignore')}\n")
                raise RuntimeError('PHP syntax check failed: ' + str(path.relative_to(release)))
        if initialize:
            # Explicit initial setup only: the PHP command refuses nonempty databases.
            subprocess.run(['/usr/bin/php', str(release / 'operations/initialize-hosting.php')], env=env, check=True)
        verify = ('require ' + json.dumps(str(release / 'public/config/database.php')) + ';'
                  "if (!$pdo || !$pdo->query(\"SHOW TABLES LIKE 'users'\")->fetch()) exit(1);")
        result = subprocess.run(['/usr/bin/php', '-r', verify], env=env, capture_output=True)
        if result.returncode:
            sys.stderr.write(f"Database preflight failed:\nSTDOUT: {result.stdout.decode('utf-8', errors='ignore')}\nSTDERR: {result.stderr.decode('utf-8', errors='ignore')}\n")
            raise RuntimeError('Release database preflight failed. Existing website remains active.')
        for path in [HOME / 'sigma-releases', release, release / 'public']:
            path.chmod(0o755)
        for path in (release / 'public').rglob('*'):
            path.chmod(0o755 if path.is_dir() else 0o644)
        (release / 'operations').chmod(0o700)
        # Uploaded announcement files must survive replacing the public release.
        upload_store = HOME / 'sigma-private/announcement-uploads'
        upload_store.mkdir(parents=True, exist_ok=True, mode=0o755)
        public_uploads = release / 'public/uploads'
        if public_uploads.exists() or public_uploads.is_symlink():
            raise RuntimeError('Uploads must be runtime storage, not release contents.')
        public_uploads.symlink_to(upload_store, target_is_directory=True)
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
            refresh_php_runtime(release / 'public')
        except Exception:
            if Path(previous).is_dir():
                rollback = HOME / ('www-rollback-' + release_name)
                rollback.symlink_to(previous, target_is_directory=True)
                os.replace(rollback, web)
                try:
                    refresh_php_runtime(Path(previous))
                except Exception:
                    pass
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
        print(json.dumps(report))
    finally:
        if archive.exists():
            try:
                archive.unlink()
            except Exception:
                pass


if __name__ == '__main__':
    import traceback
    import sys
    parser = argparse.ArgumentParser()
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--release', required=True)
    parser.add_argument('--initialize', action='store_true')
    args = parser.parse_args()
    try:
        activate(args.archive, args.release, args.initialize)
        try:
            (HOME / 'www/deploy_error.html').unlink(missing_ok=True)
        except Exception:
            pass
    except Exception as exc:
        err_text = f"CRITICAL: Exception during activation:\n{exc}\n\n{traceback.format_exc()}"
        sys.stderr.write(err_text + "\n")
        try:
            (HOME / 'www/deploy_error.html').write_text(f"<pre>{err_text}</pre>", encoding='utf-8')
        except Exception as e2:
            sys.stderr.write(f"Failed to write deploy_error.html: {e2}\n")
        sys.exit(1)
