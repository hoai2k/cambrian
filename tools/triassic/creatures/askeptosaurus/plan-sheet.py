"""Compose the before/after dorsal sheet the front correction is accepted on.

    python3 plan-sheet.py [--in <dir>] [--out <dir>] [--before t26] [--after t33] [--clips Idle,Swim]

The fault this answers is only visible from **above**: a lateral camera looks straight along this
body's horizontal curve and flattens it. `plan-view.py` renders each shot from its own file with
the same code and writes its own angles beside it; this puts the pictures side by side with those
angles under them, each naming the line it is measured against, so the picture and the number are
read together rather than one standing for the other.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

argv = sys.argv[1:]
def opt(name, default):
    return argv[argv.index(name) + 1] if name in argv else default
ROOT = Path(__file__).resolve().parents[4]
SRC = Path(opt('--in', str(ROOT / 'local/triassic-authoring/askeptosaurus/plan')))
OUT = Path(opt('--out', str(ROOT / 'docs/triassic/verification')))
OUT.mkdir(parents=True, exist_ok=True)
BEFORE, AFTER = opt('--before', 't26'), opt('--after', 't33')
CLIPS = opt('--clips', 'Idle,Swim,Sprint').split(',')
PAPER, INK, DIM = (246, 244, 238), (38, 38, 40), (104, 104, 110)
try:
    TITLE = ImageFont.truetype('DejaVuSans-Bold.ttf', 19)
    FONT = ImageFont.truetype('DejaVuSans.ttf', 15)
    SMALL = ImageFont.truetype('DejaVuSans.ttf', 13)
except OSError:
    TITLE = FONT = SMALL = ImageFont.load_default()

rpath = SRC / 'readings.json'
readings = json.loads(rpath.read_text()) if rpath.exists() else {}


def caption(tag, clip):
    """The two readings under each picture, each naming the line it is against."""
    r = readings.get('%s-%s' % (tag, clip))
    if not r:
        return ['']
    a = r['against']
    return ['vs the body’s long run (shoulder→tail_08): %.1f°'
            % a['tailRunToShoulder']['headVsInPlanDegrees'],
            'vs the hip→shoulder chord: %.1f°'
            % a['hipToShoulder']['headVsInPlanDegrees']]


def flat(path, size):
    """The render on the sheet's own paper. These shots carry alpha, and a straight `convert('RGB')`
    lays a pale grey animal on black, where the whole point of the sheet is the silhouette."""
    im = Image.open(path).convert('RGBA').resize(size)
    bg = Image.new('RGBA', size, PAPER + (255,))
    return Image.alpha_composite(bg, im).convert('RGB')


CELL = 440
name = lambda tag, clip: SRC / ('%s-%s-0.0-top.png' % (tag, clip))
probe = next((Image.open(name(t, c)) for c in CLIPS for t in (BEFORE, AFTER) if name(t, c).exists()), None)
if probe is None:
    raise SystemExit('no plan shots in %s' % SRC)
cellh = round(CELL * probe.height / probe.width)
head, label, gap = 66, 70, 18
sheet = Image.new('RGB', (CELL * 2 + gap * 3, head + (cellh + label) * len(CLIPS) + gap * len(CLIPS)), PAPER)
d = ImageDraw.Draw(sheet)
d.text((gap, 13), 'Askeptosaurus · the front brought into line, from directly above', INK, font=TITLE)
d.text((gap, 40), 'left: aimed at the hip→shoulder chord (T3D-26).    right: the reviewer’s own aim (T3D-34).',
       DIM, font=SMALL)
y = head
for clip in CLIPS:
    for col, tag in enumerate((BEFORE, AFTER)):
        x = gap + col * (CELL + gap)
        f = name(tag, clip)
        if f.exists():
            sheet.paste(flat(f, (CELL, cellh)), (x, y))
        else:
            d.rectangle([x, y, x + CELL, y + cellh], outline=DIM)
        d.text((x, y + cellh + 6), '%s · %s' % (clip, 'before' if col == 0 else 'after'), INK, font=FONT)
        for k, line in enumerate(caption(tag, clip)):
            d.text((x, y + cellh + 28 + k * 17), line, DIM, font=SMALL)
    y += cellh + label + gap
dest = OUT / 'askeptosaurus-aimed-front-plan.png'
sheet.save(dest)
print('PLAN_SHEET ' + json.dumps({'out': str(dest), 'clips': CLIPS}))
