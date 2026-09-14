"""Read a proportions.py report and print what each named region of the body comes to.

    python3 tools/triassic/proportion-regions.py REPORT.json head=0.96 neck=0.55 trunk=0.16 tail=0

A region is named by the fraction along the measured axis where it *starts*, counting from the
frac-1 end (the nose, on a body measured nose-last), and runs to the next name given. The script
reports each region as a fraction of the straight axis and of the bent centroid path, because a
neck or tail posed into a curve is longer than the box that contains it and the two numbers are
what say by how much. Fractions come from the slice table and the silhouettes proportions.py
renders; this script does the arithmetic so a report never has to.
"""
import json
import sys

import math

report = json.load(open(sys.argv[1]))
marks = []
for a in sys.argv[2:]:
    name, at = a.split('=')
    marks.append((name, float(at)))
marks.sort(key=lambda m: -m[1])

cents = report['centroids']
fracs = [c['frac'] for c in cents]
pts = [c['centroidGltf'] for c in cents]


def arc_between(a, b):
    """Length of the centroid path between two fractions, interpolating at the ends."""
    total = 0.0
    for i in range(len(pts) - 1):
        f0, f1 = fracs[i], fracs[i + 1]
        if f1 <= a or f0 >= b:
            continue
        seg = math.dist(pts[i], pts[i + 1])
        # Charge only the part of this segment that lies inside [a, b].
        lo, hi = max(a, f0), min(b, f1)
        total += seg * (hi - lo) / (f1 - f0)
    return total


length = report['lengthUnits']
arc = report['arcLength']
print(f"{report['model']}")
print(f"  straight {length:.4f}   bent path {arc:.4f} ({report['arcOverStraight']}x)")
print('  region        from    to   straightFrac  arcFrac')
for i, (name, at) in enumerate(marks):
    end = marks[i - 1][1] if i else 1.0
    frac = end - at
    print(f'  {name:12s} {at:5.3f} {end:5.3f}   {frac:8.3f}   {arc_between(at, end) / arc:8.3f}')
