"""Create small, orientation-correct previews; originals remain untouched."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from PIL import Image, ImageOps
from image_catalog import ROOT, image_files, memory_id, catalog_script

folder = ROOT / 'static/thumbnails'
folder.mkdir(exist_ok=True)
for name in image_files():
    target = folder / (memory_id(name) + '.webp')
    source = ROOT / 'static/love_images' / name
    if target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
        continue
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((800, 800))
        image.save(target, 'WEBP', quality=78, method=6)
(ROOT / 'static/memories.js').write_text(catalog_script(), encoding='utf-8')
print(f'{len(image_files())} thumbnails; {sum(p.stat().st_size for p in folder.glob("*.webp")) / 1024**2:.2f} MiB total')
