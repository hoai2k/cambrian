"""Assemble the before/after comparison of the mouth from two runs of `mouth-views.py`.

    /opt/blender/blender --background --factory-startup --python mouth-views.py -- <local>/mouth-before
    ... rebuild ...
    /opt/blender/blender --background --factory-startup --python mouth-views.py -- <local>/mouth-after
    python3 mouth-sheet.py

Top row is the delivery as it was reviewed, bottom row the rebuild, same camera and same frame.
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
base = ROOT / 'local/triassic-authoring/placodus'
dest = Path(__file__).resolve().parent
SHOTS = [('CrushBite-0.25', 'CrushBite mid gape'), ('Idle-0.0', 'mouth closed')]
VIEWS = ['quarter', 'front', 'side']
W, H = 420, 336
cols = len(VIEWS) * len(SHOTS)
img = Image.new('RGB', (W * cols, H * 2 + 28), (26, 30, 36))
d = ImageDraw.Draw(img)
for row, (kind, label) in enumerate([('mouth-before', 'before'), ('mouth-after', 'after')]):
    for i, (shot, title) in enumerate(SHOTS):
        for j, view in enumerate(VIEWS):
            p = base / kind / (shot + '-' + view + '.png')
            assert p.exists(), p
            src = Image.open(p).convert('RGBA')
            src.thumbnail((W, H - 24))
            x = (i * len(VIEWS) + j) * W
            y = 28 + row * H
            img.paste(src, (x + (W - src.width) // 2, y + 20), src)
            d.text((x + 8, y + 4), label + ' / ' + title + ' / ' + view, fill='white')
d.text((10, 8), 'Placodus jaw cut and oral lining: the same three views at the same frame, before and after', fill=(210, 220, 230))
img.save(dest / 'mouth-fix-sheet.jpg', quality=92)
print('wrote', dest / 'mouth-fix-sheet.jpg')
