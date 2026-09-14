"""Assemble paired review sheets from the renders of the exported GLBs.

Every sheet puts the authored body and its procedural twin side by side through identical cameras
and lights, because the pairing is the pipeline's verification step and a sheet of one of them
proves nothing about the other.
"""
from PIL import Image, ImageDraw
from pathlib import Path


def build(creature_id, sets, cell=(340, 265), cols=4, quality=90):
    root = Path(__file__).resolve().parents[4]
    base = root / 'local/triassic-authoring' / creature_id
    dest = root / 'tools/triassic/creatures' / creature_id
    written = []
    for sheet, names in sets.items():
        w, h = cell
        c = 2 if len(names) < 3 else cols
        rows = (len(names) * 2 + c - 1) // c
        img = Image.new('RGB', (w * c, h * rows), (26, 30, 36))
        d = ImageDraw.Draw(img)
        for i, n in enumerate(names):
            for j, kind in enumerate(('authored', 'twin')):
                p = base / (kind + '-review') / (n + '.png')
                if not p.exists():
                    raise SystemExit('missing render: %s' % p)
                src = Image.open(p).convert('RGBA')
                src.thumbnail((w, h - 24))
                index = i * 2 + j
                x, y = (index % c) * w, (index // c) * h
                img.paste(src, (x + (w - src.width) // 2, y + 22), src)
                d.text((x + 7, y + 6), kind + ' / ' + n, fill='white')
        img.save(dest / (sheet + '.jpg'), quality=quality)
        written.append((sheet, img.size))
        print('wrote', sheet + '.jpg', img.size)
    return written
