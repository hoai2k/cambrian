"""Compose the T3D-25 verification sheets from the shots `review-swap.py` renders.

Plain PIL, no Blender: it tiles the two tagged sets into the before/after strips that go in
`docs/triassic/verification/`. Run `review-swap.py` once per body first.

    python3 swap-sheets.py [--in <dir>] [--out <dir>]
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
    """`rows` is a list of lists of (caption, file); missing files are left blank."""
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
RANGE = [('Heavy', '0.3'), ('Heavy', '0.62'), ('TailWhip', '0.3'),
         ('TailWhip', '0.62'), ('Ability', '0.45'), ('Coil', '0.45')]

tile([[('%s (%s)' % (c, v), 'after-hold-%s-0-%s.png' % (c, v)) for c in HOLDS[i:i + 4]]
      for v in ('top',) for i in (0, 4, 8)],
     'askeptosaurus-swap-holds-top.png',
     title='Askeptosaurus T3D-25 - the twelve held shapes, dorsal, on the promoted posed body')
tile([[('%s (%s)' % (c, v), 'after-hold-%s-0-%s.png' % (c, v)) for c in HOLDS[i:i + 4]]
      for v in ('side',) for i in (0, 4, 8)],
     'askeptosaurus-swap-holds-side.png',
     title='Askeptosaurus T3D-25 - the twelve held shapes, lateral, on the promoted posed body')
tile([[('before  %s %ss' % (c, t), 'before-posed-range-%s-%s-top.png' % (c, t)) for c, t in RANGE],
      [('after  %s %ss' % (c, t), 'after-range-%s-%s-top.png' % (c, t)) for c, t in RANGE]],
     'askeptosaurus-swap-range.png',
     title='Askeptosaurus T3D-25 - the four full-range clips, dorsal. Before: the shipped backup, '
           'every act clamped to 28 % of its range on a tail that already hooked back under the body.')
tile([[('before  %s %ss' % (c, t), 'before-posed-strip-%s-%s-threeq.png' % (c, t))
       for c, t in (('Idle', '0'), ('Idle', '0.7'), ('Idle', '1.4'), ('Idle', '2.1'))],
      [('after  %s %ss' % (c, t), 'after-strip-%s-%s-threeq.png' % (c, t))
       for c, t in (('Idle', '0'), ('Idle', '0.7'), ('Idle', '1.4'), ('Idle', '2.1'))],
      [('before  %s %ss' % (c, t), 'before-posed-strip-%s-%s-threeq.png' % (c, t))
       for c, t in (('Swim', '0'), ('Swim', '0.425'), ('Swim', '0.85'), ('Swim', '1.275'))],
      [('after  %s %ss' % (c, t), 'after-strip-%s-%s-threeq.png' % (c, t))
       for c, t in (('Swim', '0'), ('Swim', '0.425'), ('Swim', '0.85'), ('Swim', '1.275'))]],
     'askeptosaurus-swap-idle-swim.png',
     title='Askeptosaurus T3D-25 - Idle and Swim, before (the shipped backup) and after (promoted)')
tile([[('before  ' + v, 'before-posed-card-TurnLeft-0.2-%s.png' % v) for v in ('threeq', 'top', 'side')],
      [('after  ' + v, 'after-card-TurnLeft-0.2-%s.png' % v) for v in ('threeq', 'top', 'side')]],
     'askeptosaurus-swap-card.png', cellw=600,
     title='Askeptosaurus T3D-25 - the portrait frame, before and after')
