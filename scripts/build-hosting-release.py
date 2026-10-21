"""Build a release from an explicit allowlist. Never package database rows or local secrets."""
from pathlib import Path
import argparse
import hashlib
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def build(destination: Path, runtime_path: str):
    destination.parent.mkdir(parents=True, exist_ok=True)
    files = {}
    for name in ['index.html', 'admin.html', 'teacher.html', 'student.html', 'quiz-creator.html',
                 'viewer.html', 'terms.html', 'privacy.html', 'time-picker-component.html']:
        files['public/' + name] = (ROOT / name).read_bytes()
    for folder, extensions in {
        'js': {'.js'}, 'css': {'.css'}, 'image': {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'},
        'assets': {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf'},
        'php/api': {'.php'}, 'php/includes': {'.php'},
        'php/image': {'.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico'},
    }.items():
        for path in (ROOT / folder).rglob('*'):
            if path.is_file() and not path.is_symlink() and path.suffix.lower() in extensions:
                files['public/' + path.relative_to(ROOT).as_posix()] = path.read_bytes()
    for name in ['app.php', 'services.php']:
        files['public/config/' + name] = (ROOT / 'config' / name).read_bytes()
    # The repository ships a credential-free template; never read ignored local config.
    connection = (ROOT / 'config/database.php.example').read_text(encoding='utf-8')
    loader = "<?php\n$runtimeFile = " + json.dumps(runtime_path) + ";\nif (!is_file($runtimeFile)) throw new RuntimeException('Hosting runtime is not configured.');\nrequire_once $runtimeFile;\n"
    files['public/config/database.php'] = (loader + connection.removeprefix('<?php')).encode()
    files['public/.htaccess'] = b'''Options -Indexes
DirectoryIndex index.html
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript text/javascript image/svg+xml
</IfModule>
<IfModule mod_headers.c>
    <FilesMatch "\\.html$">
        Header always set Cache-Control "no-cache"
    </FilesMatch>
</IfModule>
<FilesMatch "(?i)(^\\.|\\.(sql|bak|log|key|env|zip|sqlite|db)$)">
    Require all denied
</FilesMatch>
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
'''
    for folder in ['config', 'php/includes', 'storage']:
        files['public/' + folder + '/.htaccess'] = b'Require all denied\n'
    for name in ['index.php', 'admin.php', 'teacher.php', 'student.php']:
        files['public/php/' + name] = (ROOT / 'php' / name).read_bytes()
    for name in ['schema.sql', 'application_sessions.sql', 'service_secrets.sql', 'record_lifecycle.sql', 'profile_photos.sql', 'user_id_sequences.sql']:
        sql = (ROOT / 'database' / name).read_text(encoding='utf-8')
        sql = re.sub(r'^(?:CREATE DATABASE[^;]*;|USE[^;]*;)\s*', '', sql, flags=re.I | re.M)
        if re.search(r'^\s*(?:INSERT|REPLACE|UPDATE|DELETE|DROP|TRUNCATE)\b', sql, re.I | re.M):
            raise ValueError('Only schema definitions may be included: ' + name)
        files['operations/database/' + name] = sql.encode()
    files['operations/initialize-hosting.php'] = (ROOT / 'scripts/initialize-hosting.php').read_bytes()
    manifest = {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}
    files['manifest.json'] = json.dumps(manifest, indent=2).encode()
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    return {'archive': str(destination), 'files': len(files), 'bytes': destination.stat().st_size,
            'sha256': hashlib.sha256(destination.read_bytes()).hexdigest(), 'databaseRecordsIncluded': 0}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--runtime-path', required=True)
    args = parser.parse_args()
    print(json.dumps(build(args.output, args.runtime_path), indent=2))
