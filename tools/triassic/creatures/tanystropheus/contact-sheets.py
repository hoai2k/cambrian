"""Assemble the paired Tanystropheus review sheets from the exported-GLB pose renders."""
from PIL import Image, ImageDraw
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
base = ROOT / 'local/triassic-authoring/tanystropheus'
dest = Path(__file__).resolve().parent

sets = {
    'paired-volume-sheet': ['side', 'top', 'front', 'belly', 'mouth-closed', 'mouth-Bite'],
    'paired-deformation-sheet': ['Idle-0', 'Idle-1.6', 'Crawl-0.1', 'Crawl-0.6', 'Crawl-1.1', 'Crawl-1.7',
                                 'TurnLeft-0.9', 'TurnRight-0.9', 'Attack-0.15', 'Attack-0.45', 'Attack-0.75',
                                 'Bite-0.25', 'Heavy-0.5', 'Dodge-0.25'],
    'paired-actions-sheet': ['Swim-0', 'Swim-0.55', 'Swim-1.1', 'Sprint-0.35', 'Sprint-0.7', 'Dive-0.7', 'Rise-0.7',
                             'Hit-0.3', 'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Eat-0.5', 'Death-1.7',
                             'Grab-0.55', 'Breath-1.2', 'Growth-0.75'],
    'paired-shore-sheet': ['Lower-0.5', 'Lower-1.45', 'SnapLeft-0.24', 'SnapLeft-0.4', 'Retract-0.3',
                           'Ability-0.3', 'Ability-0.55', 'Ability-0.8',
                           'Drag-0.2', 'Drag-0.9', 'Severed-0.8', 'Severed-2.1', 'mouth-Snap'],
}
# The strike, side and top, phase by phase: the sheet this animal is actually judged on.
chain_side = [('Lower', t) for t in [0., .5, 1., 1.45]] + [('SnapLeft', t) for t in [0., .12, .24, .3, .4, .55]] \
    + [('Retract', t) for t in [0., .3, .6, .85]]
sets['paired-strike-sheet'] = ([f'{c}-{t}-cside' for c, t in chain_side]
                               + [f'{c}-{t}-ctop' for c, t in chain_side])
sets['paired-severed-sheet'] = ([f'Severed-{t}-cside' for t in [.2, .8, 1.6, 2.1]]
                                + [f'Severed-{t}-ctop' for t in [.2, .8, 1.6, 2.1]]
                                + [f'SnapRight-{t}-ctop' for t in [.24, .4]]
                                + [f'Drag-{t}-cside' for t in [.2, .9]])

for sheet, names in sets.items():
    w, h = 360, 280
    cols = 2 if len(names) < 4 else 4
    rows = (len(names) * 2 + cols - 1) // cols
    img = Image.new('RGB', (w * cols, h * rows), (28, 34, 40))
    d = ImageDraw.Draw(img)
    for i, n in enumerate(names):
        for j, kind in enumerate(['authored', 'puppet']):
            p = base / (kind + '-review') / (n + '.png')
            assert p.exists(), p
            src = Image.open(p).convert('RGBA')
            src.thumbnail((w, h - 26))
            index = i * 2 + j
            x = (index % cols) * w
            y = (index // cols) * h
            img.paste(src, (x + (w - src.width) // 2, y + 24), src)
            d.text((x + 8, y + 7), kind + ' / ' + n, fill='white')
    img.save(dest / (sheet + '.jpg'), quality=90)
    print('wrote', sheet)
