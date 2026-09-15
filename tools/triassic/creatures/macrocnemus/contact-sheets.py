"""Assemble the paired Macrocnemus review sheets from the exported-GLB pose renders."""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
base = ROOT / 'local/triassic-authoring/macrocnemus'
dest = Path(__file__).resolve().parent

sets = {
    'paired-volume-sheet': ['side', 'top', 'front', 'belly', 'mouth-closed', 'mouth-Bite'],
    'paired-deformation-sheet': ['Idle-0', 'Idle-1.6', 'Crawl-0.2', 'Crawl-0.7', 'Crawl-1.2',
                                 'TurnLeft-0.7', 'TurnRight-0.7', 'Attack-0.12', 'Attack-0.35', 'Attack-0.6',
                                 'Bite-0.2', 'Heavy-0.4', 'Dodge-0.2'],
    'paired-actions-sheet': ['Swim-0', 'Swim-0.4', 'Swim-0.8', 'Sprint-0.25', 'Sprint-0.5', 'Dive-0.6', 'Rise-0.6',
                             'Hit-0.25', 'Stagger-0.5', 'Guard-0.5', 'Parry-0.15', 'Eat-0.4', 'Death-1.4',
                             'Grab-0.5', 'Breath-1.0', 'Growth-0.7'],
    'paired-shore-sheet': ['Charge-0.2', 'Charge-0.5', 'Charge-0.85', 'Snatch-0.2', 'Snatch-0.45',
                           'Retreat-0.25', 'Retreat-0.7', 'Ability-0.2', 'Ability-0.5', 'Ability-0.8',
                           'Run-0.0', 'Run-0.16', 'Run-0.31', 'Run-0.47', 'mouth-Snatch'],
}
# The stride, side and top, phase by phase: the sheet this animal is actually judged on.
run_frames = [('Run', t) for t in [0., .08, .16, .24, .31, .39, .47, .55]]
sets['paired-gait-sheet'] = ([f'{c}-{t}-cside' for c, t in run_frames]
                             + [f'{c}-{t}-ctop' for c, t in run_frames])
water = ([('Charge', t) for t in [0., .2, .4, .6, .8, .95]]
         + [('Snatch', t) for t in [0., .2, .35, .5, .65]]
         + [('Retreat', t) for t in [0., .25, .5, .75, 1.1]])
sets['paired-water-sheet'] = [f'{c}-{t}-cside' for c, t in water] + [f'{c}-{t}-ctop' for c, t in water[:6]]

for sheet, names in sets.items():
    w, h = 360, 280
    cols = 2 if len(names) < 4 else 4
    rows = (len(names) + cols - 1) // cols
    img = Image.new('RGB', (w * cols, h * rows), (28, 34, 40))
    d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        for j, kind in enumerate(['authored']):
            p = base / (kind + '-review') / (n + '.png')
            assert p.exists(), p
            src = Image.open(p).convert('RGBA')
            src.thumbnail((w, h - 26))
            index = i
            x = (index % cols) * w
            y = (index // cols) * h
            img.paste(src, (x + (w - src.width) // 2, y + 24), src)
            d.text((x + 8, y + 7), kind + ' / ' + n, fill='white')
    img.save(dest / (sheet + '.jpg'), quality=90)
    print('wrote', sheet)
