"""Compose the T3D-26 verification sheets: the front before and after it was brought into line.

The fault this answers is only visible from **above** and head-on. A lateral camera looks straight
along this body's horizontal curve and flattens twelve distinct held shapes into twelve identical
arches, which is the trap T3D-25 recorded; so the sheets here are dorsal, plus one frame looked at
down the trunk's own run, where "the head is off to the left" stops being an angle to judge and
becomes the head sitting beside the body instead of on the end of it.

Render both sets first, each from its own file, with the same renderer:

    blender -b --python review-swap.py -- --file local/triassic-authoring/askeptosaurus/t25/askeptosaurus.glb --tag t25
    blender -b --python review-swap.py -- --tag t26
    python3 front-sheets.py
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

argv = sys.argv[1:]
def opt(name, default):
    return argv[argv.index(name) + 1] if name in argv else default
ROOT = Path(__file__).resolve().parents[4]
SRC = Path(opt('--in', str(ROOT / 'local/triassic-authoring/askeptosaurus/swap-review')))
OUT = Path(opt('--out', str(ROOT / 'docs/triassic/verification')))
OUT.mkdir(parents=True, exist_ok=True)
PAPER = (246, 244, 238)
INK = (38, 38, 40)
try:
    FONT = ImageFont.truetype('DejaVuSans.ttf', 17)
    SMALL = ImageFont.truetype('DejaVuSans.ttf', 14)
except OSError:
    FONT = SMALL = ImageFont.load_default()


def tile(rows, path, cellw=520, label_h=30, title=None):
    cols = max(len(r) for r in rows)
    probe = next((Image.open(SRC / f) for r in rows for _, f in r if (SRC / f).exists()), None)
    if probe is None:
        raise SystemExit('no shots found in %s' % SRC)
    cellh = round(cellw * probe.height / probe.width)
    top = 34 if title else 0
    sheet = Image.new('RGB', (cols * cellw, top + len(rows) * (cellh + label_h)), PAPER)
    draw = ImageDraw.Draw(sheet)
    if title:
        draw.text((14, 9), title, fill=INK, font=FONT)
    for r, row in enumerate(rows):
        for c, (caption, name) in enumerate(row):
            x, y = c * cellw, top + r * (cellh + label_h)
            f = SRC / name
            if f.exists():
                im = Image.open(f).convert('RGBA').resize((cellw, cellh), Image.LANCZOS)
                bg = Image.new('RGBA', im.size, PAPER + (255,))
                sheet.paste(Image.alpha_composite(bg, im).convert('RGB'), (x, y))
            draw.text((x + 10, y + cellh + 7), caption, fill=INK, font=SMALL)
    sheet.save(OUT / path)
    print('wrote', OUT / path, sheet.size)


HOLDS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab',
         'TurnLeft', 'TurnRight', 'Dive', 'Rise', 'Breath', 'Growth']
hold = lambda tag, c: '%s-hold-%s-0-top.png' % (tag, c)

tile([[('before  ' + c, hold('t25', c)) for c in HOLDS[i:i + 4]] for i in (0, 4, 8)],
     'askeptosaurus-front-holds-top-before.png',
     title='Askeptosaurus T3D-26 before - the twelve held shapes, dorsal. The head and neck leave '
           'the trunk at 54.6 degrees and finish 67.7 off it, and the shoulder goes round with them.')
tile([[('after  ' + c, hold('t26', c)) for c in HOLDS[i:i + 4]] for i in (0, 4, 8)],
     'askeptosaurus-front-holds-top-after.png',
     title='Askeptosaurus T3D-26 after - the twelve held shapes, dorsal. The takeoff is shared out '
           'over the chest, four cervicals and the skull; the head rests 4.2 degrees off the trunk.')
tile([[('before  ' + c, hold('t25', c)) for c in HOLDS[:4]],
      [('after  ' + c, hold('t26', c)) for c in HOLDS[:4]],
      [('before  ' + c, hold('t25', c)) for c in HOLDS[8:12]],
      [('after  ' + c, hold('t26', c)) for c in HOLDS[8:12]]],
     'askeptosaurus-front-holds-top.png',
     title='Askeptosaurus T3D-26 - eight held shapes, dorsal, before over after')
tile([[('before  ' + c, 't25-frontal-%s-0-front.png' % c) for c in ('Idle', 'Swim', 'Sprint')],
      [('after  ' + c, 't26-frontal-%s-0-front.png' % c) for c in ('Idle', 'Swim', 'Sprint')]],
     'askeptosaurus-front-on.png', cellw=600,
     title='Askeptosaurus T3D-26 - looked at down the trunk\'s own run, hip through shoulder. '
           'Before, the head stands out beside the body; after, it is on the end of it.')
tile([[('before  ' + v, 't25-card-TurnLeft-0.2-%s.png' % v) for v in ('threeq', 'top', 'side')],
      [('after  ' + v, 't26-card-TurnLeft-0.2-%s.png' % v) for v in ('threeq', 'top', 'side')]],
     'askeptosaurus-front-card.png', cellw=600,
     title='Askeptosaurus T3D-26 - the portrait frame, before and after')
RANGE = [('Heavy', '0.3'), ('Heavy', '0.62'), ('TailWhip', '0.3'),
         ('TailWhip', '0.62'), ('Ability', '0.45'), ('Coil', '0.45')]
tile([[('before  %s %ss' % (c, t), 't25-range-%s-%s-top.png' % (c, t)) for c, t in RANGE],
      [('after  %s %ss' % (c, t), 't26-range-%s-%s-top.png' % (c, t)) for c, t in RANGE]],
     'askeptosaurus-front-range.png',
     title='Askeptosaurus T3D-26 - the four full-range clips, dorsal. The tail\'s straightening '
           'and its signed coil are untouched; only the front has moved.')
