"""Tile the frames `motion_sheet.py` rendered into one labelled contact sheet.

Separate from the renderer because Blender's bundled Python has no PIL; this half runs on the
system interpreter, from a plan file the Blender half writes.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

plan = json.loads(Path(sys.argv[1]).read_text())
cols = plan['cols']
w, h = plan['cell']
h += 20
tiles = plan['tiles']
rows = (len(tiles) + cols - 1) // cols
img = Image.new('RGB', (w * cols, h * rows + 22), (24, 27, 33))
d = ImageDraw.Draw(img)
d.text((8, 6), plan['title'], fill='white')
for i, t in enumerate(tiles):
    src = Image.open(t['file']).convert('RGBA')
    src.thumbnail((w, h - 20))
    x, y = (i % cols) * w, 22 + (i // cols) * h
    img.paste(src, (x + (w - src.width) // 2, y + 18), src)
    d.text((x + 6, y + 3), t['label'], fill=(200, 210, 225))
img.save(plan['out'], quality=92)
print('tiled', plan['out'], img.size)
