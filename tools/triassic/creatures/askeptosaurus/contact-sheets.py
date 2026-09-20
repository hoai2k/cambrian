"""Tile this animal's three review folders into the contact sheets in `review/`.

One sheet per body the delivery ships: the shipped body, its procedural twin, and the backup. The
names are the *positions* rather than the generations, because which generation is in which is
`FRONT` in `build.py` and is meant to be swappable without renaming a file.

    python3 contact-sheets.py     # after render.py --decoded, --decoded --twin, review-backup.py
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
LOCAL = HERE.parents[3] / 'local/triassic-authoring/askeptosaurus'
OUT = HERE / 'review'
OUT.mkdir(exist_ok=True)
try:
    FONT = ImageFont.truetype('DejaVuSans.ttf', 15)
except OSError:
    FONT = ImageFont.load_default()

SHEETS = {
    'shipped': ('authored-review', ['Idle-0', 'Swim-0.3', 'Sprint-0.4', 'Attack-0.28', 'Bite-0.13',
                                    'Heavy-0.5', 'Ability-0.45', 'Grab-0.4', 'Death-1.5',
                                    'side', 'top', 'front']),
    'twin': ('twin-review', ['Idle-0', 'Swim-0.3', 'Sprint-0.4', 'Attack-0.28', 'Bite-0.13',
                             'Heavy-0.5', 'Ability-0.45', 'Grab-0.4', 'Death-1.5',
                             'side', 'top', 'front']),
    'backup': ('backup-review', ['Idle', 'Swim', 'Attack', 'Heavy', 'Ability', 'Grab', 'top']),
}
for name, (folder, shots) in SHEETS.items():
    src = LOCAL / folder
    have = [(s, src / (s + '.png')) for s in shots if (src / (s + '.png')).exists()]
    if not have:
        print('skipped %s: no renders in %s' % (name, src))
        continue
    cols = min(4, len(have))
    rows = (len(have) + cols - 1) // cols
    w, h = 420, 330
    img = Image.new('RGB', (w * cols, h * rows), (26, 30, 36))
    d = ImageDraw.Draw(img)
    for i, (label, f) in enumerate(have):
        s = Image.open(f).convert('RGBA')
        s.thumbnail((w, h - 26))
        x, y = (i % cols) * w, (i // cols) * h
        img.paste(s, (x + (w - s.width) // 2, y + 24), s)
        d.text((x + 8, y + 6), label, fill='white', font=FONT)
    img.save(OUT / (name + '.jpg'), quality=90)
    print('wrote', OUT / (name + '.jpg'), img.size, '%d shots' % len(have))
