"""Shared image catalog for Flask and direct-file previews."""
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def catalog_script():
    images = sorted(
        unicodedata.normalize('NFC', path.name) for path in (ROOT / 'static' / 'love_images').iterdir()
        if path.is_file() and path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
    )
    return 'window.LOVE_IMAGES = ' + json.dumps(images, ensure_ascii=True) + ';\n'


if __name__ == '__main__':
    destination = ROOT / 'static' / 'memories.js'
    destination.write_text(catalog_script(), encoding='utf-8')
    print(f'Updated {destination.name}')
