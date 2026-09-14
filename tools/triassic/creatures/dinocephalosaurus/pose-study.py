"""Does the heavy pose have to be undone, and can it be?

The generated Dinocephalosaurus body is a dramatic photographic pose: the neck is thrown into a
tall S, out to one side and doubling back over the trunk. Placodus met a smaller version of the
same problem in its tail and solved it by carrying every cross-section *rigidly* from its own
measured centreline frame onto a straightened axis of the same segment lengths. This script asks
whether that technique reaches a neck, by doing it and measuring what comes out, and renders the
three candidates side by side from one fixed camera:

  posed       the raw generation, untouched
  transport   the Placodus rigid-section unbend applied to the neck
  resample    the neck rebuilt as a ring-structured loft of the same measured sections

Run:
  /opt/blender/blender --background --factory-startup --python \
      tools/triassic/creatures/dinocephalosaurus/pose-study.py -- [OUTDIR]

It writes three PNGs and a JSON of measurements to OUTDIR (default
local/triassic-authoring/dinocephalosaurus/pose-study), and prints STUDY <json>.
It touches nothing in public/ and is not part of the build.
"""
import bpy, bmesh, math, json, os, sys, heapq
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
RAW = os.path.join(HERE, 'tripo-raw/dinocephalosaurus.raw.glb')
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = args[0] if args else os.path.join(ROOT, 'local/triassic-authoring/dinocephalosaurus/pose-study')
os.makedirs(OUT, exist_ok=True)

# Geodesic distance from the snout, in raw units, at the two places the animal changes: the base of
# the skull and the front of the chest.  Measured once off the welded raw mesh (the banding below
# prints the section radius at every station, and these are where it stops being a head and starts
# being a trunk); they are constants so the study and the builder cut in the same two places.
HEAD_GEO = 0.131
SHOULDER_GEO = 0.835
BANDS = 70

# ---- load and weld ---------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=RAW)
src = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
bm = bmesh.new()
bm.from_mesh(src.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(src.data)
bm.free()
src.name = 'posed'


def geodesic(mesh, source):
    bmx = bmesh.new()
    bmx.from_mesh(mesh)
    bmx.verts.ensure_lookup_table()
    adj = {v.index: [(e.other_vert(v).index, e.calc_length()) for e in v.link_edges] for v in bmx.verts}
    pos = {v.index: np.array(v.co[:]) for v in bmx.verts}
    bmx.free()

    def run(s):
        dist = {k: 1e18 for k in adj}
        dist[s] = 0.0
        pq = [(0.0, s)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u] + 1e-12:
                continue
            for w, l in adj[u]:
                nd = d + l
                if nd < dist[w] - 1e-12:
                    dist[w] = nd
                    heapq.heappush(pq, (nd, w))
        return dist
    tail = min(pos, key=lambda k: pos[k][0])
    snout = max(run(tail).items(), key=lambda kv: kv[1])[0]
    return run(snout), pos, snout


D, POS, SNOUT = geodesic(src.data, None)
maxd = max(D.values())
bands = [[] for _ in range(BANDS)]
for k, d in D.items():
    bands[min(BANDS - 1, int(d / maxd * BANDS))].append(POS[k])
raw_line = []
for i, b in enumerate(bands):
    if len(b) < 3:
        continue
    a = np.array(b)
    c = a.mean(0)
    raw_line.append(((i + 0.5) / BANDS * maxd, c, float(np.linalg.norm(a - c, axis=1).mean())))
# one 3-tap smoothing pass, exactly as the measurement did
line = [raw_line[0]] + [(raw_line[i][0], (raw_line[i - 1][1] + 2 * raw_line[i][1] + raw_line[i + 1][1]) / 4,
                         raw_line[i][2]) for i in range(1, len(raw_line) - 1)] + [raw_line[-1]]
neck = [p for g, p, r in line if HEAD_GEO - 1e-9 <= g <= SHOULDER_GEO + 1e-9]
neck_r = [r for g, p, r in line if HEAD_GEO - 1e-9 <= g <= SHOULDER_GEO + 1e-9]
neck = list(reversed(neck))          # shoulder -> head
neck_r = list(reversed(neck_r))
P = [Vector(p) for p in neck]
seg = [(P[i + 1] - P[i]).length for i in range(len(P) - 1)]
L = sum(seg)


def frames(pts):
    """Parallel-transported frames, so both curves carry the same roll from the same start."""
    T = [(pts[i + 1] - pts[i]).normalized() for i in range(len(pts) - 1)]
    up = Vector((0, 0, 1))
    N = [(up - T[0] * T[0].dot(up)).normalized()]
    for i in range(1, len(T)):
        axis = T[i - 1].cross(T[i])
        n = N[-1]
        if axis.length > 1e-9:
            n = n.copy()
            n.rotate(Matrix.Rotation(T[i - 1].angle(T[i]), 4, axis.normalized()))
        N.append((n - T[i] * T[i].dot(n)).normalized())
    return T, N, [T[i].cross(N[i]) for i in range(len(T))]


TP, NP, BP = frames(P)
# The straight target: the same segment lengths laid end to end along the shoulder's own tangent
# with its lateral component removed, which is what "unbend" means here.
u0 = TP[0].copy()
u0.y = 0
u0.normalize()
Q = [P[0].copy()]
for s in seg:
    Q.append(Q[-1] + u0 * s)
TQ, NQ, BQ = frames(Q)

# ---- measurements of the pose itself -----------------------------------------------------------
turn = 0.0
for i in range(len(TP) - 1):
    turn += math.degrees(TP[i].angle(TP[i + 1]))
roc = []
for i in range(len(TP) - 1):
    s = 0.0
    a = 0.0
    j = i
    while j < len(TP) - 1 and s < 0.06:
        s += seg[j]
        a += TP[j].angle(TP[j + 1])
        j += 1
    if a > 1e-6 and s > 0.03:
        roc.append(s / a)
sect = float(np.median(neck_r))
study = {'neckArc': round(L, 4), 'neckChord': round((P[-1] - P[0]).length, 4),
         'neckAxialExtent': round(abs(P[-1].x - P[0].x), 4),
         'neckTotalTurningDeg': round(turn, 1), 'neckMedianSectionRadius': round(sect, 4),
         'neckMinRadiusOfCurvature': round(min(roc), 4),
         'neckMinCurvatureRadiusOverSectionRadius': round(min(roc) / sect, 2)}

# ---- the roll, read off the animal's own countershading -----------------------------------------
# A circular cross-section is rotationally ambiguous, so a geometric centreline fit cannot recover
# how the neck is ROLLED about its own axis -- and a rigid per-section carry that gets the roll
# wrong spirals the markings down a neck whose silhouette comes out perfectly straight.  The
# animal's colouring settles it: the back is dark and the belly pale, so the light/dark seam is the
# lateral midline and points at dorsal from every station.  Sample the albedo right round each
# section and take the first circular harmonic of its darkness; that vector is dorsal, measured.
posed_bvh_roll = BVHTree.FromPolygons([v.co.copy() for v in src.data.vertices],
                                      [p.vertices[:] for p in src.data.polygons], all_triangles=False)
from mathutils.geometry import barycentric_transform
mat = src.data.materials[0]
colnode = next(n for n in mat.node_tree.nodes
               if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name == 'sRGB')
img = colnode.image
PIX = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
uvlayer = src.data.uv_layers.active


def albedo(u, v):
    h, w = PIX.shape[:2]
    return PIX[int((float(v) % 1) * h) % h, int((float(u) % 1) * w) % w, :3]


ROLL_AROUND = 64
roll_deg, roll_strength = [], []
for i in range(len(TP)):
    c = (P[i] + P[i + 1]) / 2
    lum, dirs = [], []
    for k in range(ROLL_AROUND):
        th = k * 2 * math.pi / ROLL_AROUND
        d = NP[i] * math.cos(th) + BP[i] * math.sin(th)
        hit = posed_bvh_roll.ray_cast(c, d, 0.16)
        if hit[0] is None:
            continue
        poly = src.data.polygons[hit[2]]
        if len(poly.vertices) != 3:
            continue
        pv = [src.data.vertices[j].co for j in poly.vertices]
        qv = [Vector((*uvlayer.data[j].uv, 0)) for j in poly.loop_indices]
        uv = barycentric_transform(hit[0], pv[0], pv[1], pv[2], qv[0], qv[1], qv[2])
        rgb = albedo(uv.x, uv.y)
        lum.append(float(0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]))
        dirs.append(th)
    if len(lum) < ROLL_AROUND * 0.7:
        roll_deg.append(None)
        roll_strength.append(0.0)
        continue
    a = np.array(lum)
    dark = a.mean() - a
    vx = float(np.sum(dark * np.cos(dirs)))
    vy = float(np.sum(dark * np.sin(dirs)))
    roll_deg.append(math.degrees(math.atan2(vy, vx)))
    roll_strength.append(math.hypot(vx, vy) / max(1e-9, float(np.abs(dark).sum())))
have = [(i, r) for i, r in enumerate(roll_deg) if r is not None]
ref = have[0][1]
unwrapped = [(i, ((r - ref + 180) % 360) - 180) for i, r in have]
study['rollFromColour'] = {
    'stations': len(have),
    'meanHarmonicStrength': round(float(np.mean(roll_strength)), 3),
    'dorsalAngleInTransportFrameDeg': [round(r, 1) for _, r in have],
    'driftAcrossNeckDeg': round(max(r for _, r in unwrapped) - min(r for _, r in unwrapped), 1),
    'standardDeviationDeg': round(float(np.std([r for _, r in unwrapped])), 1)}
# Re-roll the straight axis's frames onto the measured dorsal, so the transported sections keep
# the animal's own back on top instead of whatever the transport happened to carry.
fill = [r if r is not None else ref for r in roll_deg]
for i in range(len(TQ)):
    n = NQ[i].copy()
    n.rotate(Matrix.Rotation(math.radians(fill[i] - fill[0]), 4, TQ[i]))
    NQ[i] = n
    BQ[i] = TQ[i].cross(n)

# ---- candidate 1: the Placodus rigid-section transport -----------------------------------------
transport = src.copy()
transport.data = src.data.copy()
transport.name = 'transport'
bpy.context.collection.objects.link(transport)


def carry(v):
    """Nearest posed segment, then the same offset re-emitted in the straight axis's frame."""
    best = (1e9, 0, 0.0)
    for i in range(len(P) - 1):
        a = P[i]
        d = P[i + 1] - a
        t = max(0., min(1., (v - a).dot(d) / d.length_squared))
        dist = (v - (a + d * t)).length
        if dist < best[0]:
            best = (dist, i, t)
    _, i, t = best
    off = v - (P[i] + (P[i + 1] - P[i]) * t)
    q = Q[i] + (Q[i + 1] - Q[i]) * t
    return q + TQ[i] * off.dot(TP[i]) + NQ[i] * off.dot(NP[i]) + BQ[i] * off.dot(BP[i])


headM = Matrix((
    (TQ[-1].x, NQ[-1].x, BQ[-1].x, Q[-1].x), (TQ[-1].y, NQ[-1].y, BQ[-1].y, Q[-1].y),
    (TQ[-1].z, NQ[-1].z, BQ[-1].z, Q[-1].z), (0, 0, 0, 1))) @ Matrix((
        (TP[-1].x, NP[-1].x, BP[-1].x, P[-1].x), (TP[-1].y, NP[-1].y, BP[-1].y, P[-1].y),
        (TP[-1].z, NP[-1].z, BP[-1].z, P[-1].z), (0, 0, 0, 1))).inverted()
moved = 0.0
for v in transport.data.vertices:
    g = D.get(v.index)
    if g is None:
        continue
    if g < HEAD_GEO:
        q = headM @ v.co
    elif g <= SHOULDER_GEO:
        q = carry(v.co)
    else:
        continue
    moved = max(moved, (q - v.co).length)
    v.co = q
study['transportMaxVertexMove'] = round(moved, 4)

# Does the transported surface still bound a solid?  A rigid carry is only well defined while the
# section planes do not cross, and they cross wherever the curvature radius falls under the
# section radius.  Count the neck vertices that land inside the transported surface's own hull by
# testing, along each ray from the straight axis, how many times the result is pierced: a clean
# tube gives exactly one crossing per direction.
tb = BVHTree.FromPolygons([v.co.copy() for v in transport.data.vertices],
                          [p.vertices[:] for p in transport.data.polygons], all_triangles=False)
pierce = []
for i in range(4, len(Q) - 4):
    c = (Q[i] + Q[i + 1]) / 2
    for k in range(12):
        th = k * 2 * math.pi / 12
        d = (NQ[i] * math.cos(th) + BQ[i] * math.sin(th))
        n = 0
        o = c.copy()
        for _ in range(8):
            hit = tb.ray_cast(o + d * 1e-4, d, 1.0)
            if hit[0] is None:
                break
            n += 1
            o = hit[0].copy()
        pierce.append(n)
study['transportRayCrossings'] = {'mean': round(float(np.mean(pierce)), 3),
                                  'over1': int(sum(1 for n in pierce if n > 1)), 'samples': len(pierce)}

# ---- candidate 2: the measured resample ---------------------------------------------------------
# Rebuild the neck as rings on the straight axis, each ring the source's own cross-section at the
# matching arc position, found by casting rays out from the posed centreline.  Topology is new;
# the section shape, its diameter and its place on the source texture are the generation's.
posed_bvh = BVHTree.FromPolygons([v.co.copy() for v in src.data.vertices],
                                 [p.vertices[:] for p in src.data.polygons], all_triangles=False)
RINGS, AROUND = 120, 24
cum = [0.]
for s in seg:
    cum.append(cum[-1] + s)


def at(curve, T, N, B, s):
    for i in range(len(seg)):
        if cum[i] <= s <= cum[i + 1] or i == len(seg) - 1:
            t = (s - cum[i]) / seg[i]
            return curve[i] + (curve[i + 1] - curve[i]) * t, T[i], N[i], B[i]
    return curve[0], T[0], N[0], B[0]


verts = []
faces = []
radii = []
for j in range(RINGS + 1):
    s = L * j / RINGS
    cp, tp, npv, bpv = at(P, TP, NP, BP, s)
    cq, tq, nq, bq = at(Q, TQ, NQ, BQ, s)
    for k in range(AROUND):
        th = k * 2 * math.pi / AROUND
        d = npv * math.cos(th) + bpv * math.sin(th)
        hit = posed_bvh.ray_cast(cp, d, 0.16)
        r = (hit[0] - cp).length if hit[0] is not None else (radii[-1] if radii else 0.05)
        radii.append(r)
        verts.append(cq + (nq * math.cos(th) + bq * math.sin(th)) * r)
for j in range(RINGS):
    for k in range(AROUND):
        a = j * AROUND + k
        b = j * AROUND + (k + 1) % AROUND
        faces.append((a, b, b + AROUND, a + AROUND))
me = bpy.data.meshes.new('resampled neck')
me.from_pydata([tuple(v) for v in verts], [], faces)
me.update()
for f in me.polygons:
    f.use_smooth = True
tube = bpy.data.objects.new('resampled neck', me)
bpy.context.collection.objects.link(tube)
resample = src.copy()
resample.data = src.data.copy()
resample.name = 'resample'
bpy.context.collection.objects.link(resample)
# The head moves BEFORE anything is deleted: deleting faces renumbers what is left, and a lookup
# by vertex index after that transforms the wrong vertices.
for v in resample.data.vertices:
    g = D.get(v.index)
    if g is not None and g < HEAD_GEO:
        v.co = headM @ v.co
bmr = bmesh.new()
bmr.from_mesh(resample.data)
bmr.verts.ensure_lookup_table()
# Any face that touches the neck band goes: a face left straddling the cut would have one corner
# carried away with the head and the others left behind, which draws as a spike.
kill = [f for f in bmr.faces if any(HEAD_GEO < D[v.index] < SHOULDER_GEO for v in f.verts)]
bmesh.ops.delete(bmr, geom=kill, context='FACES')
bmr.to_mesh(resample.data)
bmr.free()
study['resampleRings'] = RINGS
study['resampleSectionRadius'] = [round(float(np.min(radii)), 4), round(float(np.max(radii)), 4)]

# ---- render the three from one camera ------------------------------------------------------------
s = bpy.context.scene
s.render.engine = 'CYCLES'
s.cycles.samples = 24
s.cycles.use_denoising = True
s.render.image_settings.file_format = 'PNG'
s.render.film_transparent = False
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs[1].default_value = .5
for loc, power in [((1.2, -1.6, 1.4), 90), ((-1.2, -.6, .9), 55), ((0, 1.4, 1.2), 95)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = 2
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
s.camera = cam
cam.data.type = 'ORTHO'
cam.data.ortho_scale = 2.1
s.render.resolution_x = 900
s.render.resolution_y = 640
for o in bpy.context.scene.objects:
    if o.type == 'MESH':
        o.hide_render = True
tube.hide_render = True
for name, obs in [('posed', [src]), ('transport', [transport]), ('resample', [resample, tube])]:
    for o in obs:
        o.hide_render = False
    for view, loc in [('side', (0.35, -3.0, 0.25)), ('top', (0.35, 0, 3.0))]:
        cam.location = loc
        cam.rotation_euler = (Vector((0.35, 0, 0.05)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
        s.render.filepath = os.path.join(OUT, '%s-%s.png' % (name, view))
        bpy.ops.render.render(write_still=True)
    for o in obs:
        o.hide_render = True
open(os.path.join(OUT, 'pose-study.json'), 'w').write(json.dumps(study, indent=2))
print('STUDY ' + json.dumps(study))
