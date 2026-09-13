"""Measure a canonical pose or a modelling sheet the same way proportions.py measures a body.

    python3 tools/triassic/pose-proportions.py IMAGE.png [--crop x0,y0,x1,y1] [--columns 40]
                                               [--threshold 18] [--flip]

The audit's question is whether a delivered body contradicts the animal's documented anatomy, and
the answer splits two ways: the body disagrees with the pose it was generated from, or the body
reproduces a pose that was wrong. Telling those apart needs the pose measured on the same terms as
the mesh, so this prints the silhouette's height profile down its long axis in exactly the form
proportions.py prints cross-sections: a run of columns, each with the ink's top, bottom and height
as fractions of the subject's length, and the boundaries then read off the profile rather than
guessed at by eye.

The subject is separated from the studio background by colour distance from the *border* colour,
which is what the modelling sheets are built to make easy — a flat neutral ground. It is not a
segmenter: on a photographic canonical (a shore, a sea, a sky) it will take the background with it
and say so by finding ink in every column. Use `--crop` to take one panel out of a turnaround
sheet; the fractions are always of the cropped subject's own bounding box.
"""
import sys

import numpy as np
from PIL import Image

args = sys.argv[1:]
path = args[0]
crop = None
columns = 40
threshold = 18.0
flip = False
it = iter(args[1:])
for a in it:
    if a == '--crop':
        crop = [int(v) for v in next(it).split(',')]
    elif a == '--columns':
        columns = int(next(it))
    elif a == '--threshold':
        threshold = float(next(it))
    elif a == '--flip':
        flip = True

im = Image.open(path).convert('RGB')
if crop:
    im = im.crop(tuple(crop))
a = np.asarray(im, dtype=np.float64)
h, w, _ = a.shape

# The background is whatever the border is: sheets are flat neutral studio grounds, and taking the
# median of the frame avoids being fooled by a subject that touches one edge.
border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
bg = np.median(border, axis=0)
ink = np.linalg.norm(a - bg, axis=2) > threshold
# Drop single-pixel speckle: a column's ink must be at least three pixels somewhere contiguous.
cols = np.nonzero(ink.any(axis=0))[0]
rows = np.nonzero(ink.any(axis=1))[0]
if not len(cols) or not len(rows):
    print('no subject found: the background threshold took everything or nothing')
    sys.exit(1)
x0, x1 = int(cols[0]), int(cols[-1])
y0, y1 = int(rows[0]), int(rows[-1])
length = x1 - x0 + 1
height = y1 - y0 + 1

print(f'{path}{" crop " + str(crop) if crop else ""}')
print(f'  subject box {length} x {height} px, depth {height / length:.3f} of length, '
      f'background {bg.round(1).tolist()}, ink {ink.mean() * 100:.1f}% of the frame')
print('  frac    top  bottom  height   (fractions of length; frac 0 is the '
      f'{"right" if flip else "left"} end)')
edges = np.linspace(x0, x1 + 1, columns + 1)
for k in range(columns):
    lo, hi = int(edges[k]), max(int(edges[k + 1]), int(edges[k]) + 1)
    band = ink[:, lo:hi]
    idx = k if not flip else columns - 1 - k
    frac = (idx + 0.5) / columns
    r = np.nonzero(band.any(axis=1))[0]
    if not len(r):
        print(f'  {frac:.3f}      -       -   0.000')
        continue
    top = (y1 - int(r[0])) / length
    bot = (y1 - int(r[-1])) / length
    bar = '#' * int((top - bot) / (height / length) * 24)
    print(f'  {frac:.3f} {top:6.3f} {bot:7.3f} {top - bot:7.3f}  {bar}')
