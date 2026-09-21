"""Public content shared by Flask and direct-file previews. No private data."""
import hashlib
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def image_files():
    return sorted(unicodedata.normalize('NFC', path.name) for path in (ROOT / 'static/love_images').iterdir()
                  if path.is_file() and path.suffix.lower() in {'.png', '.jpg', '.jpeg', '.gif', '.webp'})


def memory_id(name):
    return 'm-' + hashlib.sha256(name.encode()).hexdigest()[:12]


def universe_data():
    config = json.loads((ROOT / 'content/universe.json').read_text(encoding='utf-8'))
    names = image_files()
    overrides = {item['id']: item for item in config.get('memories', [])}
    memories = []
    for name in names:
        identifier = memory_id(name)
        item = dict(id=identifier, file=name, alt='Một kỷ niệm của Quang Anh và Pé Nhi', caption='', date=None)
        item.update({k: v for k, v in overrides.get(identifier, {}).items() if k in ('alt', 'caption', 'date')})
        thumb = f'thumbnails/{identifier}.webp'
        item['thumbnail'] = thumb if (ROOT / 'static' / thumb).exists() else 'love_images/' + name
        memories.append(item)
    available = {item['id'] for item in memories}
    planets = []
    for planet in config['planets']:
        planet = dict(planet)
        planet['memoryIds'] = [x for x in planet.get('memoryIds', []) if x in available]
        if planet.get('allMemories'):
            planet['memoryIds'] = [item['id'] for item in memories]
        if planet['memoryIds']:
            planets.append(planet)
    return {**config, 'memories': memories, 'planets': planets}


def catalog_script():
    data = universe_data()
    return ('window.LOVE_IMAGES = ' + json.dumps([m['file'] for m in data['memories']], ensure_ascii=True) + ';\n'
            + 'window.LOVE_UNIVERSE = ' + json.dumps(data, ensure_ascii=True) + ';\n')


if __name__ == '__main__':
    destination = ROOT / 'static/memories.js'
    destination.write_text(catalog_script(), encoding='utf-8')
    print(f'Updated {destination.name}')
