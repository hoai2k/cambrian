"""Assemble the paired review sheets from the renders of the exported Saurichthys GLBs.

Run after render.py has produced both `authored-review/` and `twin-review/`:

  python3 tools/triassic/creatures/saurichthys/contact-sheets.py
"""
from PIL import Image, ImageDraw
from pathlib import Path

ID = 'saurichthys'
ROOT = Path(__file__).resolve().parents[4]
base = ROOT / 'local/triassic-authoring' / ID
dest = Path(__file__).resolve().parent

SETS = {
    'paired-volume-sheet': ['side', 'top', 'front'],
    'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.45', 'Swim-0.9', 'Swim-1.35',
                                 'TurnLeft-0.8', 'TurnRight-0.8', 'Dive-0.7', 'Rise-0.7'],
    'paired-lunge-sheet': ['Attack-0.12', 'Attack-0.43', 'Attack-0.72', 'Bite-0.17',
                           'Heavy-0.18', 'Heavy-0.5', 'Heavy-0.85',
                           'Attack-0.12-top', 'Attack-0.43-top', 'Attack-0.72-top'],
    'paired-actions-sheet': ['Sprint-0', 'Sprint-0.27', 'Sprint-0.55', 'Sprint-0.82', 'Hit-0.3',
                             'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Dodge-0.25', 'Eat-0.4',
                             'Death-1.8', 'Ability-0.5', 'Grab-0.55', 'Breath-1.2', 'Growth-0.75'],
    'paired-beat-sheet': ['Swim-0-top', 'Swim-0.45-top', 'Swim-0.9-top', 'Swim-1.35-top',
                          'Sprint-0-top', 'Sprint-0.27-top', 'Sprint-0.55-top', 'Sprint-0.82-top'],
    'paired-era-clips-sheet': ['FastStart-0.12', 'FastStart-0.3', 'FastStart-0.6', 'Hover-0.8'],
    'paired-mouth-sheet': ['mouth-Idle-0', 'mouth-front-Idle-0', 'mouth-Bite-0.25',
                           'mouth-front-Bite-0.25', 'mouth-Attack-0.43', 'mouth-front-Attack-0.43',
                           'mouth-Heavy-0.5', 'mouth-front-Heavy-0.5'],
}

for sheet, names in SETS.items():
    w, h = 360, 280
    cols = 2 if len(names) < 4 else 4
    rows = (len(names) * 2 + cols - 1) // cols
    img = Image.new('RGB', (w * cols, h * rows), (26, 30, 36))
    d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        for j, kind in enumerate(['authored', 'twin']):
            p = base / (kind + '-review') / (n + '.png')
            assert p.exists(), p
            src = Image.open(p).convert('RGBA')
            src.thumbnail((w, h - 26))
            index = i * 2 + j
            x, y = (index % cols) * w, (index // cols) * h
            img.paste(src, (x + (w - src.width) // 2, y + 24), src)
            d.text((x + 8, y + 7), kind + ' / ' + n, fill='white')
    img.save(dest / (sheet + '.jpg'), quality=90)
    print('wrote', sheet + '.jpg', img.size)
