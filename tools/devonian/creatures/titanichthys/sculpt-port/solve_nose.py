"""Measure a nose-loft build the way `npm run sculpt:measure` does, without exporting anything.

    /opt/blender/blender --background --factory-startup \
        --python tools/devonian/creatures/titanichthys/sculpt-port/solve_nose.py \
        -- --out /tmp/probe.json [--base] [--knots overrides.json]

`geometry.build()` is the only thing this runs: it gathers the built meshes' vertices in the GLB
frame (x, y up, z along the body, which is Blender (x, z, -y)), measures the same 20 tiled
windows `src/viewer/sculpt/profile.ts` measures, and compares them with the *edited* curves of
docs/sculpts/titanichthys-sculpt.json at the built model's own stations -- the number the port is
judged by. It also reports

  * the fine axial envelope (half-width, dorsal, ventral in narrow slabs), which is what the
    envelope curves in geometry.py are solved against: with the measured envelope in hand a knot
    is corrected by target/measured and the next build lands on it;
  * the largest angles between adjacent face normals in named axial bands -- the pleat check. A
    loft that folds shows here long before it shows in a render.

`--base` builds with nose_edit=False (the shipped proportions) so the same numbers can be read
off the unedited body. `--knots` takes {"_NOSE_WIDTH": [[axis, value], ...], ...} and overrides
the curves before building, so a solve iteration needs no edit to geometry.py.
"""
import bpy
import json
import sys
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import geometry  # noqa: E402

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
base = '--base' in argv
out = Path(argv[argv.index('--out') + 1]) if '--out' in argv else None
if '--knots' in argv:
    for name, knots in json.loads(Path(argv[argv.index('--knots') + 1]).read_text()).items():
        setattr(geometry, name, [tuple(k) for k in knots])

SCULPT = Path('/home/user/cambrian/docs/sculpts/titanichthys-sculpt.json')
EYE_SEAT_DEPTH = .030  # build_candidate.py's own inward nudge, so the eyes measure where they ship

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
built = geometry.build(nose_edit=not base)
for info, ob in ((e, built['eye_L'] if e['side'] == 'L' else built['eye_R']) for e in built['eyes']):
    ob.location = ob.location - geometry.Vector(info['normal']) * EYE_SEAT_DEPTH

# Each body vertex that belongs to a cage row is tagged with that row, so the envelope below can
# say which profile row a measured extreme comes off -- which is what a knot is corrected against.
HEAD_ROWS, AROUND = built['head_shape']
row_of = {}
for i, row in enumerate(built['head_rows']):
    for j, index in enumerate(row):
        if index is not None:
            row_of[index] = 't=%.2f a=%.0f' % (i / HEAD_ROWS, 360 * j / AROUND)

points = []
for ob in built['meshes']:
    ox, oy, oz = ob.location
    body = ob is built['body']
    for v in ob.data.vertices:
        tag = row_of.get(v.index, 'oral/throat') if body else ob.name
        points.append((v.co[0] + ox, v.co[2] + oz, -(v.co[1] + oy), tag))  # GLB x, y (up), z (axis)

N = 20
lo = min(p[2] for p in points)
hi = max(p[2] for p in points)
length = hi - lo
h = length / (N - 1)
dorsal = [-1e18] * N
ventral = [1e18] * N
width = [0.] * N
for x, y, z, _ in points:
    t = (z - lo) / h
    for j in range(max(0, math.ceil(t - .5)), min(N - 1, math.floor(t + .5)) + 1):
        if y > dorsal[j]:
            dorsal[j] = y
        if y < ventral[j]:
            ventral[j] = y
        if abs(x) > width[j]:
            width[j] = abs(x)

sculpt = json.loads(SCULPT.read_text())
target = sorted(({'axis': s['editedAxis'], 'dorsal': s['dorsal']['edit'], 'ventral': s['ventral']['edit'],
                  'width': s['width']['edit']} for s in sculpt['stations']), key=lambda s: s['axis'])


def eval_at(curve, a):
    if a <= target[0]['axis']:
        return target[0][curve]
    if a >= target[-1]['axis']:
        return target[-1][curve]
    i = next(i for i in range(len(target) - 1) if target[i]['axis'] <= a <= target[i + 1]['axis'])
    s0, s1 = target[i], target[i + 1]
    t = (a - s0['axis']) / (s1['axis'] - s0['axis'])
    return s0[curve] + (s1[curve] - s0[curve]) * t


stations = []
for j in range(N):
    axis = lo + j * h
    row = {'index': j, 'axis': axis}
    for curve, value in (('dorsal', dorsal[j]), ('ventral', ventral[j]), ('width', width[j])):
        t = eval_at(curve, axis)
        row[curve] = {'model': value, 'target': t, 'deviation': (value / t - 1) * 100 if abs(t) > 1e-4 else None}
    stations.append(row)

# Fine envelope: narrow slabs, so a knot can be corrected against the axis it actually governs.
SLAB = .012
envelope = []
a = 1.0
while a <= hi + 1e-9:
    d, v, w, n, widest = -1e18, 1e18, 0., 0, None
    for x, y, z, name in points:
        if abs(z - a) <= SLAB:
            n += 1
            d, v = max(d, y), min(v, y)
            if abs(x) > w:
                w, widest = abs(x), (round(x, 3), round(y, 3), round(z, 3), name)
    if n:
        envelope.append({'axis': round(a, 4), 'dorsal': d, 'ventral': v, 'width': w, 'n': n, 'widest': widest})
    a += .025

# Pleat check: the angle between adjacent face normals, in axial bands, on the body mesh.
body = built['body'].data
body.calc_loop_triangles()
normals = {}
for poly in body.polygons:
    normals[poly.index] = poly.normal
edge_faces = {}
for poly in body.polygons:
    for key in poly.edge_keys:
        edge_faces.setdefault(key, []).append(poly.index)
bands = {'neck': (1.0, 1.5), 'snout': (1.9, 3.05), 'body': (-1.0, .9)}
audit = {}
for name, (blo, bhi) in bands.items():
    angles = []
    for key, faces in edge_faces.items():
        if len(faces) != 2:
            continue
        centres = [sum(-body.vertices[i].co[1] for i in body.polygons[f].vertices) / len(body.polygons[f].vertices)
                   for f in faces]
        if not all(blo <= c <= bhi for c in centres):
            continue
        d = max(-1., min(1., normals[faces[0]].dot(normals[faces[1]])))
        angles.append(math.degrees(math.acos(d)))
    angles.sort()
    if angles:
        audit[name] = {'edges': len(angles), 'p50': angles[len(angles) // 2],
                       'p99': angles[min(len(angles) - 1, int(.99 * len(angles)))],
                       'p999': angles[min(len(angles) - 1, int(.999 * len(angles)))], 'max': angles[-1]}

report = {'base': base, 'axisMin': lo, 'axisMax': hi, 'length': length, 'spacing': h,
          'stations': stations, 'envelope': envelope, 'normals': audit,
          'knots': {name: getattr(geometry, name) for name in
                    ('_NOSE_SHIFT', '_NOSE_WIDTH', '_NOSE_DORSAL', '_NOSE_VENTRAL')}}
if out:
    out.write_text(json.dumps(report, indent=1))
print('TITANICHTHYS_SOLVE_NOSE axisMax %.4f length %.4f' % (hi, length))
for row in stations[13:]:
    print('  st%-2d axis %6.3f | dorsal %6.3f/%6.3f %+6.1f%% | ventral %6.3f/%6.3f %+6.1f%% | width %6.3f/%6.3f %+6.1f%%' % (
        row['index'], row['axis'], row['dorsal']['model'], row['dorsal']['target'], row['dorsal']['deviation'],
        row['ventral']['model'], row['ventral']['target'], row['ventral']['deviation'],
        row['width']['model'], row['width']['target'], row['width']['deviation']))
for name, a in audit.items():
    print('  normals %-6s edges %6d p50 %5.2f p99 %6.2f p999 %6.2f max %6.2f' % (
        name, a['edges'], a['p50'], a['p99'], a['p999'], a['max']))
print('TITANICHTHYS_SOLVE_NOSE_OK', str(out) if out else '')
