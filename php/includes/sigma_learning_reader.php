<?php
// Returned to the bounded extraction subprocess; never served as Python source.
return <<<'SIGMA_LEARNING_READER'
"""Bounded, text-only extraction for an already authorized learning file."""
import json
import pathlib
import subprocess
import sys
import zipfile
import xml.etree.ElementTree as ET


def extract(path, kind):
    if path.stat().st_size > 12 * 1024 * 1024:
        raise ValueError('File is too large for chat reading.')
    if kind == 'pdf':
        # No shell, network, scripts, macros, or external resource loading.
        try:
            result = subprocess.run(['pdftotext', '-f', '1', '-l', '80', '-layout', str(path), '-'],
                                    capture_output=True, timeout=12, check=True)
            return result.stdout.decode('utf-8', errors='replace')[:60000]
        except FileNotFoundError:
            import pymupdf
            with pymupdf.open(path) as document:
                return '\n'.join(page.get_text() for page in list(document)[:80])[:60000]
    if kind in ('docx', 'pptx', 'odt'):
        with zipfile.ZipFile(path) as archive:
            names = [n for n in archive.namelist() if n == 'word/document.xml' or
                     (kind == 'pptx' and n.startswith('ppt/slides/slide') and n.endswith('.xml')) or
                     (kind == 'odt' and n == 'content.xml')]
            if len(names) > 100:
                raise ValueError('Too many document sections.')
            parts = []
            total = 0
            for name in sorted(names):
                entry = archive.getinfo(name)
                total += entry.file_size
                if total > 4 * 1024 * 1024:
                    raise ValueError('Expanded document is too large.')
                root = ET.fromstring(archive.read(name))
                parts.append(' '.join(root.itertext()))
            return '\n'.join(parts)[:60000]
    if kind in ('txt', 'csv', 'md'):
        return path.read_text(encoding='utf-8', errors='replace')[:60000]
    raise ValueError('This file format needs a readable PDF, DOCX, PPTX, ODT, or text copy.')


if __name__ == '__main__':
    try:
        text = extract(pathlib.Path(sys.argv[1]), sys.argv[2]).strip()
        if not text:
            raise ValueError('No readable text; scanned images need a text version.')
        print(json.dumps({'text': text}, ensure_ascii=False))
    except Exception:
        print(json.dumps({'text': '', 'unavailable': True}))
        sys.exit(1)

SIGMA_LEARNING_READER;
