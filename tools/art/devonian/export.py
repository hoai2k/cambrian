"""Rebuild the Devonian brand pack: python3 tools/art/devonian/export.py."""
from pathlib import Path
import hashlib
import json
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / 'public/assets/devonian/brand'
OUT.mkdir(parents=True, exist_ok=True)

for name in ('title', 'title-mobile'):
    with Image.open(HERE / 'sources' / f'{name}.png') as source:
        source.convert('RGB').save(OUT / f'{name}.webp', quality=88, method=6)

with Image.open(HERE / 'sources/logo-engraved.png') as source:
    logo = source.convert('RGBA')
    assert logo.getextrema()[3] == (0, 255), 'Wordmark needs real transparency'
    logo.thumbnail((1536, 1536), Image.Resampling.LANCZOS)
    logo.save(OUT / 'logo-engraved.webp', quality=90, method=6)

with Image.open(HERE / 'sources/emblem.png') as source:
    emblem = source.convert('RGBA')
    assert emblem.width == emblem.height
    assert emblem.getextrema()[3][0] == 0, 'Emblem needs transparent pixels'
    emblem.resize((512, 512), Image.Resampling.LANCZOS).save(OUT / 'emblem.webp', quality=90, method=6)
    for size in (16, 32, 192, 512):
        emblem.resize((size, size), Image.Resampling.LANCZOS).save(OUT / f'favicon-{size}.png', optimize=True)
    emblem.resize((180, 180), Image.Resampling.LANCZOS).save(OUT / 'apple-touch-icon.png', optimize=True)
    emblem.save(OUT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

assets = []
for path in sorted(OUT.iterdir()):
    if path.suffix not in ('.png', '.webp', '.ico'):
        continue
    with Image.open(path) as image:
        assert path.stat().st_size < 600_000, f'{path.name} exceeds runtime budget'
        assets.append(dict(path=path.relative_to(ROOT / 'public').as_posix(),
                           width=image.width, height=image.height,
                           bytes=path.stat().st_size,
                           sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
(OUT / 'manifest.json').write_text(json.dumps(dict(era='devonian', status='ready',
    provenance='docs/devonian-brand-assets.md', assets=assets), indent=2) + '\n')
print(json.dumps(assets, indent=2))
