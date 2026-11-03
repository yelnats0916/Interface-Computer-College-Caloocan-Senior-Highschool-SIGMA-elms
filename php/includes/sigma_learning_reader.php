<?php
// Returned to the bounded extraction subprocess; never served as Python source.
return <<<'SIGMA_LEARNING_READER'
"""Bounded, text-only extraction for an already authorized learning file."""
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile
import xml.etree.ElementTree as ET


def ocr_pdf(path):
    pdftoppm = shutil.which('pdftoppm')
    tesseract = shutil.which('tesseract')
    if not pdftoppm or not tesseract:
        return ''
    with tempfile.TemporaryDirectory(prefix='sigma-pdf-ocr-') as directory:
        prefix = str(pathlib.Path(directory) / 'page')
        try:
            subprocess.run([pdftoppm, '-f', '1', '-l', '12', '-r', '130', '-gray', '-png', str(path), prefix],
                           capture_output=True, timeout=20, check=True)
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            return ''
        pages = sorted(pathlib.Path(directory).glob('page-*.png'))
        if not pages:
            return ''
        parts = []
        deadline = time.monotonic() + 40
        for page in pages:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                break
            try:
                result = subprocess.run([tesseract, str(page), 'stdout', '-l', 'eng', '--psm', '3'],
                                        capture_output=True, timeout=max(1, min(8, remaining)), check=True)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                continue
            text = result.stdout.decode('utf-8', errors='replace').strip()
            if text:
                parts.append(text)
        return '\n'.join(parts)[:60000]


def extract(path, kind, fast=False):
    if path.stat().st_size > 12 * 1024 * 1024:
        raise ValueError('File is too large for chat reading.')
    if kind == 'pdf':
        # No shell, network, scripts, macros, or external resource loading.
        text = ''
        try:
            result = subprocess.run(['pdftotext', '-f', '1', '-l', '80', '-layout', str(path), '-'],
                                    capture_output=True, timeout=6 if fast else 12, check=True)
            text = result.stdout.decode('utf-8', errors='replace')[:60000]
        except FileNotFoundError:
            try:
                import pymupdf
                with pymupdf.open(path) as document:
                    text = '\n'.join(page.get_text() for page in list(document)[:80])[:60000]
            except (ImportError, OSError, RuntimeError):
                text = ''
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            text = ''
        # Scanned PDFs have almost no selectable text. OCR only those, and keep
        # the page count, resolution, and total runtime bounded on shared hosting.
        if fast or (len(text.strip()) >= 300 and len(re.findall(r'[A-Za-z0-9]{2,}', text)) >= 20):
            return text[:60000]
        recognized = ocr_pdf(path)
        return (recognized if len(recognized.strip()) > len(text.strip()) else text)[:60000]
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
        text = extract(pathlib.Path(sys.argv[1]), sys.argv[2], len(sys.argv) > 3 and sys.argv[3] == 'fast').strip()
        if not text:
            raise ValueError('No readable text; scanned images need a text version.')
        print(json.dumps({'text': text}, ensure_ascii=False))
    except Exception:
        print(json.dumps({'text': '', 'unavailable': True}))
        sys.exit(1)

SIGMA_LEARNING_READER;
