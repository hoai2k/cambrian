"""Assemble the paired review sheets from the actual exported-GLB pose renders."""
from PIL import Image, ImageDraw
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]; base = ROOT / 'local/triassic-authoring/dinocephalosaurus'
dest = Path(__file__).resolve().parent
sets = {
    'paired-volume-sheet': ['side', 'top', 'front', 'belly', 'mouth-closed', 'mouth-Bite'],
    'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.5', 'Swim-1.0', 'Swim-1.5', 'TurnLeft-0.85', 'TurnRight-0.85',
                                 'Attack-0.14', 'Attack-0.45', 'Attack-0.8', 'Bite-0.25', 'Heavy-0.5', 'Dodge-0.25'],
    'paired-actions-sheet': ['Sprint-0', 'Sprint-0.32', 'Sprint-0.65', 'Sprint-0.97', 'Dive-0.75', 'Rise-0.75', 'Hit-0.3',
                             'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Eat-0.45', 'Death-1.8', 'Grab-0.55', 'Breath-1.2',
                             'Growth-0.75', 'Breathe-0.9'],
    'paired-era-clips-sheet': ['NeckStrike-0.2', 'NeckStrike-0.55', 'NeckStrike-0.9', 'NeckStrike-1.25',
                               'Ability-0.2', 'Ability-0.45', 'Ability-0.8',
                               'Periscope-0.4', 'Periscope-1.6', 'Periscope-2.8', 'Breathe-2.1', 'mouth-Attack'],
    # The one sheet this animal is judged on: the neck bending along its length, not at its base.
    'paired-neck-sheet': ['NeckStrike-0.0-nside', 'NeckStrike-0.2-nside', 'NeckStrike-0.4-nside', 'NeckStrike-0.55-nside',
                          'NeckStrike-0.7-nside', 'NeckStrike-0.9-nside', 'NeckStrike-1.2-nside',
                          'NeckStrike-0.0-ntop', 'NeckStrike-0.2-ntop', 'NeckStrike-0.4-ntop', 'NeckStrike-0.55-ntop',
                          'NeckStrike-0.7-ntop', 'NeckStrike-0.9-ntop', 'NeckStrike-1.2-ntop',
                          'Periscope-0.4-nside', 'Periscope-1.6-nside', 'Periscope-2.8-nside',
                          'TurnLeft-0.85-ntop', 'Guard-0.6-ntop']}
for sheet, names in sets.items():
    w, h = 380, 290; cols = 2 if len(names) < 4 else 4; rows = (len(names) * 2 + cols - 1) // cols
    img = Image.new('RGB', (w * cols, h * rows), (28, 34, 40)); d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        for j, kind in enumerate(['authored', 'puppet']):
            p = base / (kind + '-review') / (n + '.png'); assert p.exists(), p
            src = Image.open(p).convert('RGBA'); src.thumbnail((w, h - 26)); index = i * 2 + j
            x = (index % cols) * w; y = (index // cols) * h
            img.paste(src, (x + (w - src.width) // 2, y + 24), src); d.text((x + 8, y + 7), kind + ' / ' + n, fill='white')
    img.save(dest / (sheet + '.jpg'), quality=92)
    print('wrote', sheet)
