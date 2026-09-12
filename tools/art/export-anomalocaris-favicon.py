"""Encode the approved favicon PNG at browser icon sizes, preserving its artwork and alpha."""
from pathlib import Path
from PIL import Image
import sys
root = Path(__file__).resolve().parents[2]
source = Image.open(sys.argv[1]).convert('RGBA')
assert source.width == source.height
for size in (16, 32, 192, 512):
    source.resize((size, size), Image.Resampling.LANCZOS).save(root / f'public/favicon-anomalocaris-{size}.png', optimize=True)
source.resize((180, 180), Image.Resampling.LANCZOS).save(root / 'public/apple-touch-icon-anomalocaris.png', optimize=True)
source.save(root / 'public/favicon.ico', format='ICO', sizes=[(16,16), (32,32), (48,48)])
