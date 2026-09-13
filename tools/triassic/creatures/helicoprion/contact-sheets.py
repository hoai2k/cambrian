"""Assemble the paired review sheets from the renders of the exported Helicoprion GLBs.

Run after render.py has produced both `authored-review/` and `twin-review/`:

  python3 tools/triassic/creatures/helicoprion/contact-sheets.py
"""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
base = ROOT / 'local/triassic-authoring/helicoprion'
dest = Path(__file__).resolve().parent

SETS = {
    'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.4', 'Swim-0.8', 'Swim-1.2',
                                 'TurnLeft-0.8', 'TurnRight-0.8', 'Dive-0.7', 'Rise-0.7',
                                 'Attack-0.14', 'Attack-0.4', 'Attack-0.7', 'Bite-0.25'],
    'paired-actions-sheet': ['Sprint-0', 'Sprint-0.25', 'Sprint-0.5', 'Sprint-0.75', 'Heavy-0.15',
                             'Heavy-0.55', 'Hit-0.3', 'Stagger-0.6', 'Guard-0.5', 'Parry-0.2',
                             'Dodge-0.25', 'Eat-0.4', 'Death-1.6', 'Ability-0.5', 'Grab-0.55',
                             'Breath-1.2', 'Growth-0.75'],
    'paired-beat-sheet': ['Swim-0-top', 'Swim-0.4-top', 'Swim-0.8-top', 'Swim-1.2-top',
                          'Sprint-0-top', 'Sprint-0.25-top', 'Sprint-0.5-top', 'Sprint-0.75-top'],
    'paired-volume-sheet': ['side', 'top', 'front'],
    'paired-whorl-sheet': ['mouth-Idle', 'mouth-below-Idle', 'mouth-Bite', 'mouth-below-Bite'],
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
    img.save(dest / (sheet + '.jpg'), quality=92)
    print('wrote', sheet + '.jpg', img.size)
