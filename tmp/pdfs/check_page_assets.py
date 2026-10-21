from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json

root = Path.cwd()
missing = []
total = 0

class AuditParser(HTMLParser):
    def handle_starttag(self, tag, attrs):
        global total
        attrs = dict(attrs)
        key = 'src' if tag in ('script', 'img', 'iframe') else 'href' if tag == 'link' else None
        if not key or not attrs.get(key):
            return
        value = attrs[key]
        url = urlsplit(value)
        if url.scheme or value.startswith(('//', '#')) or '{' in value:
            return
        total += 1
        if not (root / unquote(url.path).lstrip('/')).exists():
            missing.append({'page': self.page, 'reference': value})

files = list(root.glob('*.html'))
for page in files:
    parser = AuditParser()
    parser.page = page.name
    parser.feed(page.read_text(encoding='utf-8-sig'))

result = {'pages': len(files), 'references': total, 'missing': missing}
(root / 'tmp/pdfs/page-asset-audit.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result, indent=2))
