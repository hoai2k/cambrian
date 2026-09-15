"""Assemble review sheets from the renders of the exported GLBs.

**The authored body only.** These sheets used to put the body and its procedural twin side by side,
on the reasoning that the pairing is the pipeline's verification step -- but the pairing is verified
by the *audit*, which checks parity (`exactRigParity`, `exactAnimationParity`, `exactAnchorParity`,
normalised weights) and cannot see deformation at all. Every real defect this batch turned up was on
the authored body and invisible on the twin: skin torn off a paddle, a mouth interior, a sliver
mandible. A twin has no toes and no fin rays, so a clip that reads perfectly on it can be tearing
the shipping body to ribbons -- and a pose set of it is dozens of CYCLES-on-CPU renders, which was
the expensive half of a build.

The twin keeps everything else: its byte-identical LOD1, the envelope and surface measurements, the
parity checks, and its delivered portrait (`<id>.puppet.png`, which the specimen viewer draws).
Only the side-by-side picture is gone.
"""
from PIL import Image, ImageDraw
from pathlib import Path


def build(creature_id, sets, cell=(340, 265), cols=4, quality=90):
    root = Path(__file__).resolve().parents[4]
    base = root / 'local/triassic-authoring' / creature_id
    dest = root / 'tools/triassic/creatures' / creature_id
    written = []
    for sheet, names in sets.items():
        w, h = cell
        c = min(cols, max(2, len(names)))
        rows = (len(names) + c - 1) // c
        img = Image.new('RGB', (w * c, h * rows), (26, 30, 36))
        d = ImageDraw.Draw(img)
        for i, n in enumerate(names):
            p = base / 'authored-review' / (n + '.png')
            if not p.exists():
                raise SystemExit('missing render: %s' % p)
            src = Image.open(p).convert('RGBA')
            src.thumbnail((w, h - 24))
            x, y = (i % c) * w, (i // c) * h
            img.paste(src, (x + (w - src.width) // 2, y + 22), src)
            d.text((x + 7, y + 6), n, fill='white')
        img.save(dest / (sheet + '.jpg'), quality=quality)
        written.append((sheet, img.size))
        print('wrote', sheet + '.jpg', img.size)
    return written
