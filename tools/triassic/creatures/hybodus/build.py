"""Rebuild Hybodus: the worked Tripo skin and a measured voxel-volume twin on one shared rig.

Blender 5.2. The generation arrives folded into a gentle S with its tail swung a quarter of a body
out of the midline, so intake measures the animal's own centreline off the surface and carries every
section rigidly onto a straight axis -- nothing is stretched, sheared or thinned, and the head is
carried by the one transform its own station receives. After that the body lies head at -Y, up +Z,
midline x = 0 in raw Tripo units (body length 1.0 before the unbend), and `tx()` applies the final
engine scale; `export_yup` then puts the head at glTF +Z, where every shipped body keeps it.

Nothing here models new anatomy beside the generation. The jaw is cut out of the generation's own
skin along its own measured mouth line, the teeth are the generation's own, and the only authored
surface is the oral lining -- which closes a hole, takes its UVs from the skin around it and wears
the body's own albedo.

Writes only this species' asset family. Touches no shared registry and performs no git operations.
"""
import bpy, bmesh, math, json, os, struct, hashlib, shutil, heapq, sys

# Blender exits 0 even when a script raises, so a build that failed halfway reports success
# and leaves yesterday's GLB on disk looking fresh. Fail the process instead.
_prev_hook = sys.excepthook


def _die(t, v, tb):
    _prev_hook(t, v, tb)
    sys.stdout.flush()
    os._exit(1)


sys.excepthook = _die
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
# The oral shells, the rim fold and the hinge cap are the era's, not this builder's: one
# implementation of each, imported rather than copied, so the mouth here is the mouth every body
# on the shared kit has. Nothing else about this self-contained builder goes through the module.
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                              # noqa: E402
LOCAL = os.path.join(ROOT, 'local/triassic-authoring/hybodus')
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
ID = 'hybodus'
# The preview is the generation with its defect corrections applied and republished; the raw file
# beside it is preserved and never changed. `tools/triassic/preview-mesh-defects.md` records that
# this body needed none: it welds to one component with no detached flake and nothing smoothed.
SOURCE = os.path.join(HERE, ID + '.preview.glb')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
TARGET_LENGTH = 5.0
HEAD_ARC = .13                 # fraction of the centreline arc carried rigidly as the head
BANDS = 80
VOXEL = .0060
BLADE_DILATION = .0060
PUPPET_TRIANGLE_TARGET = 6500
ENVELOPE_TOLERANCE_FRACTION = .04
ANCHOR_TOLERANCE_FRACTION = .02

CLIPS = {'Idle': 2.6, 'Swim': 1.8, 'Sprint': 1.1, 'TurnLeft': 1.6, 'TurnRight': 1.6,
         'Dive': 1.4, 'Rise': 1.4, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.2, 'Hit': .6,
         'Death': 1.8, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5, 'Eat': 1.6, 'Stagger': 1.2,
         'Ability': 1.0, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5,
         'Shake': 1.4, 'SpineBrace': 1.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'SpineBrace']

report = {}

# ---------------------------------------------------------------- intake ----
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=SOURCE)
auth = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
auth.name = 'Hybodus authored body'
bpy.context.view_layer.objects.active = auth

bm = bmesh.new()
bm.from_mesh(auth.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bm.verts.ensure_lookup_table()
seen, components = set(), []
for v in bm.verts:
    if v in seen:
        continue
    stack, part = [v], []
    seen.add(v)
    while stack:
        q = stack.pop()
        part.append(q)
        for e in q.link_edges:
            w = e.other_vert(q)
            if w not in seen:
                seen.add(w)
                stack.append(w)
    components.append(part)
component_sizes = sorted((len(c) for c in components), reverse=True)
removed = sum(len(c) for c in components if len(c) < 8)
for c in components:
    if len(c) < 8:
        bmesh.ops.delete(bm, geom=c, context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(auth.data)
bm.free()
auth.data.update()
source_triangles = sum(len(p.vertices) - 2 for p in auth.data.polygons)

# ------------------------------------------------------------- material ----
# The correction this era's first bodies established: keep the full original albedo and its UVs,
# make COLOR_0 white so runtime recolouring does not multiply the texture by a baked copy of its
# own pigment, cut the generated normal map back to restrained microrelief, and set roughness and
# metallic explicitly after disconnecting the linked ORM inputs.
mat = auth.data.materials[0]
mat.name = 'Hybodus body pigmentation'
bs = mat.node_tree.nodes.get('Principled BSDF')
colnode = next(n for n in mat.node_tree.nodes
               if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name == 'sRGB')
im = colnode.image
pixels = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
layer = auth.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for item in layer.data:
    item.color = (1, 1, 1, 1)
for link in list(mat.node_tree.links):
    if link.to_node == bs and link.to_socket.name in ['Metallic', 'Roughness']:
        mat.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value = 0
bs.inputs['Roughness'].default_value = .60          # shagreen skin, a shade glossier than a reptile
for n in mat.node_tree.nodes:
    if n.type == 'NORMAL_MAP':
        n.inputs['Strength'].default_value = .15
# The skin is double-sided as the backstop under the lining, not in place of it.
mat.use_backface_culling = False
albedo_sha = hashlib.sha256(bytes(im.packed_file.data)).hexdigest() if im.packed_file else None


def sample_albedo(u, v):
    """Bilinear lookup in the encoded sRGB byte image, converted to linear exactly once."""
    h, w = pixels.shape[:2]
    x = (float(u) % 1) * w - .5
    y = (float(v) % 1) * h - .5
    x0, y0 = math.floor(x), math.floor(y)
    fx, fy = x - x0, y - y0
    rgb = (pixels[y0 % h, x0 % w, :3] * (1 - fx) * (1 - fy)
           + pixels[y0 % h, (x0 + 1) % w, :3] * fx * (1 - fy)
           + pixels[(y0 + 1) % h, x0 % w, :3] * (1 - fx) * fy
           + pixels[(y0 + 1) % h, (x0 + 1) % w, :3] * fx * fy)
    linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    return (*[float(c) for c in linear], 1.)


# ============================ measured intake: the body's own axis, and straightening it =========
def smooth(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


def adjacency(mesh):
    n = len(mesh.vertices)
    ev = np.array([e.vertices[:] for e in mesh.edges], dtype=np.int64)
    counts = np.zeros(n, dtype=np.int64)
    np.add.at(counts, ev[:, 0], 1)
    np.add.at(counts, ev[:, 1], 1)
    ptr = np.zeros(n + 1, dtype=np.int64)
    ptr[1:] = np.cumsum(counts)
    idx = np.zeros(int(ptr[-1]), dtype=np.int64)
    fill = ptr[:-1].copy()
    for a, b in ev:
        idx[fill[a]] = b
        fill[a] += 1
        idx[fill[b]] = a
        fill[b] += 1
    return ptr, idx


def ring_mean(P, ptr, idx):
    return np.add.reduceat(P[idx], ptr[:-1], axis=0) / np.diff(ptr).reshape(-1, 1)


def shell_thickness(mesh, bvh):
    """How thick the shell is along each vertex's inward normal. A fin blade is thin and a trunk is
    not, which separates a fin from the flank it grows out of without guessing a boundary."""
    t = np.empty(len(mesh.vertices), dtype=np.float64)
    for i, v in enumerate(mesh.vertices):
        n = Vector(v.normal[:])
        hit = bvh.ray_cast(Vector(v.co[:]) - n * 2e-4, -n, .8)
        t[i] = hit[3] if hit[0] is not None else .8
    return t


def neighbourhood_minimum(mesh, values, rings=2):
    """The smallest thickness within `rings` edges. A vertex on a blade's rim has a normal lying
    almost in the plane of the blade, so its own ray runs the length of the fin instead of across
    it and the rim measures as thick as the trunk -- which weights a fin's rim to the body and
    tears a fan of spikes out of it on the first roll."""
    ptr, idx = adjacency(mesh)
    out = np.array(values, dtype=np.float64)
    for _ in range(rings):
        prev = out.copy()
        out = np.minimum(prev, np.minimum.reduceat(prev[idx], ptr[:-1]))
    return out


def bvh_of(mesh):
    return BVHTree.FromPolygons([v.co.copy() for v in mesh.vertices],
                                [p.vertices[:] for p in mesh.polygons], all_triangles=False)


def geodesic(mesh):
    """Distance over the skin from one end of the animal to the other, which bands the surface into
    rings that are square to the body wherever the body happens to be pointing."""
    bmx = bmesh.new()
    bmx.from_mesh(mesh)
    bmx.verts.ensure_lookup_table()
    adj = {v.index: [(e.other_vert(v).index, e.calc_length()) for e in v.link_edges] for v in bmx.verts}
    pos = {v.index: np.array(v.co[:]) for v in bmx.verts}
    bmx.free()

    def run(s):
        dist = {k: 1e18 for k in adj}
        dist[s] = 0.
        pq = [(0., s)]
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

    seed = min(pos, key=lambda k: pos[k][0])
    a = max(run(seed).items(), key=lambda kv: kv[1])[0]
    Da = run(a)
    b = max(Da.items(), key=lambda kv: kv[1])[0]
    return a, b, Da, run(b), pos


def frames(pts, n0=None):
    T = [(pts[i + 1] - pts[i]).normalized() for i in range(len(pts) - 1)]
    up = Vector((0, 0, 1))
    N = [n0.copy() if n0 else (up - T[0] * T[0].dot(up)).normalized()]
    for i in range(1, len(T)):
        axis = T[i - 1].cross(T[i])
        n = N[-1].copy()
        if axis.length > 1e-9:
            n.rotate(Matrix.Rotation(T[i - 1].angle(T[i]), 4, axis.normalized()))
        N.append((n - T[i] * T[i].dot(n)).normalized())
    return T, N, [T[i].cross(N[i]) for i in range(len(T))]


uv_layer = auth.data.uv_layers.active


def hit_uv(loc, idx, mesh=None, uv=None):
    mesh = mesh if mesh is not None else (intake_mesh if 'intake_mesh' in globals() else auth.data)
    uv = uv if uv is not None else (intake_uv if 'intake_uv' in globals() else uv_layer)
    poly = mesh.polygons[idx]
    if len(poly.vertices) != 3:
        return None
    pv = [mesh.vertices[j].co for j in poly.vertices]
    qv = [Vector((*uv.data[j].uv, 0)) for j in poly.loop_indices]
    return barycentric_transform(Vector(loc), pv[0], pv[1], pv[2], qv[0], qv[1], qv[2])


def luminance_at(loc, idx):
    s = hit_uv(loc, idx)
    if s is None:
        return None
    h, w = pixels.shape[:2]
    rgb = pixels[int((float(s.y) % 1) * h) % h, int((float(s.x) % 1) * w) % w, :3]
    return float(.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2])


src_bvh = bvh_of(auth.data)
thick0 = neighbourhood_minimum(auth.data, shell_thickness(auth.data, src_bvh))
END_A, END_B, DA, DB, POS = geodesic(auth.data)


def bulk(D):
    m = max(D.values())
    keep = [k for k, d in D.items() if .03 * m < d < .20 * m]
    return float(np.mean([thick0[k] for k in keep])) if keep else 0.


BULK_A, BULK_B = bulk(DA), bulk(DB)
# A tail tapers to a blade and a head does not. On this animal the margin is decisive -- the head
# end carries four and a half times the shell thickness of the caudal end over its own first fifth
# -- so the snout is identified by measurement and the builder asserts the margin rather than
# trusting a constant.
assert abs(BULK_A - BULK_B) > .4 * max(BULK_A, BULK_B), ('the two ends measure alike', BULK_A, BULK_B)
D = DA if BULK_A > BULK_B else DB
SNOUT = END_A if BULK_A > BULK_B else END_B
MAXD = max(D.values())

# The centreline: ring centroids of the geodesic bands, taken over the *trunk* part of each ring
# (its thickest half) so a dorsal fin cannot pull the axis up out of the animal, smoothed hard and
# resampled evenly by arc. The smoothing is not cosmetic: band-to-band centroid noise on a finned
# body is a few thousandths across, invisible in a plot and catastrophic in an arc length. Left
# raw, this shark measured 1,710 degrees of total turning and an arc a quarter longer than its own
# chord, and straightening it onto that arc would have stretched the animal by a quarter.
bins = [[] for _ in range(BANDS)]
for k, d in D.items():
    bins[min(BANDS - 1, int(d / MAXD * BANDS))].append(k)
raw_line = []
for i, b in enumerate(bins):
    if len(b) < 8:
        continue
    t = np.array([thick0[k] for k in b])
    keep = [k for k, tv in zip(b, t) if tv >= float(np.percentile(t, 55))]
    if len(keep) < 6:
        continue
    a = np.array([POS[k] for k in keep])
    c = np.median(a, axis=0)
    raw_line.append([(i + .5) / BANDS * MAXD, c, float(np.median(np.linalg.norm(a - c, axis=1)))])
CC = np.array([r[1] for r in raw_line])
RR = np.array([r[2] for r in raw_line])
GG = np.array([r[0] for r in raw_line])
for _ in range(90):
    CC[1:-1] = (CC[:-2] + 2 * CC[1:-1] + CC[2:]) / 4
    RR[1:-1] = (RR[:-2] + 2 * RR[1:-1] + RR[2:]) / 4
CC = np.vstack([CC[0] + (CC[0] - CC[1]) * 3., CC, CC[-1] + (CC[-1] - CC[-2]) * 3.])
RR = np.concatenate([[RR[0]], RR, [RR[-1]]])
GG = np.concatenate([[GG[0] - (GG[1] - GG[0]) * 3.], GG, [GG[-1] + (GG[-1] - GG[-2]) * 3.]])
_seg = np.linalg.norm(np.diff(CC, axis=0), axis=1)
_cum = np.concatenate([[0.], np.cumsum(_seg)])
_even = np.linspace(0, _cum[-1], 61)
P, R, G = [], [], []
for s in _even:
    j = int(np.clip(np.searchsorted(_cum, s), 1, len(_cum) - 1))
    t = (s - _cum[j - 1]) / max(1e-12, _cum[j] - _cum[j - 1])
    P.append(Vector(CC[j - 1] + (CC[j] - CC[j - 1]) * t))
    R.append(float(RR[j - 1] + (RR[j] - RR[j - 1]) * t))
    G.append(float(GG[j - 1] + (GG[j] - GG[j - 1]) * t))
SEG = [(P[i + 1] - P[i]).length for i in range(len(P) - 1)]
CUM = [0.]
for s in SEG:
    CUM.append(CUM[-1] + s)
ARC = CUM[-1]
TP, NP, BP = frames(P)
TURNING = sum(math.degrees(TP[i].angle(TP[i + 1])) for i in range(len(TP) - 1))

# The roll, read off the animal's own countershading. A roughly circular section is rotationally
# ambiguous: a centreline fit gives the path and can say nothing about the roll, and a carry that
# gets the roll wrong spirals the markings down a body whose silhouette comes out perfectly
# straight. The back is dark and the belly pale, so the first circular harmonic of the darkness
# round each station points at dorsal.
ROLL_AROUND = 64
deg, strength = [], []
for i in range(len(TP)):
    c = (P[i] + P[i + 1]) / 2
    lum, angs = [], []
    for k in range(ROLL_AROUND):
        th = k * 2 * pi / ROLL_AROUND
        hit = src_bvh.ray_cast(c, NP[i] * cos(th) + BP[i] * sin(th), .30)
        if hit[0] is None:
            continue
        L = luminance_at(hit[0], hit[2])
        if L is None:
            continue
        lum.append(L)
        angs.append(th)
    if len(lum) < ROLL_AROUND * .6:
        deg.append(None)
        strength.append(0.)
        continue
    a = np.array(lum)
    dark = a.mean() - a
    vx = float(np.sum(dark * np.cos(angs)))
    vy = float(np.sum(dark * np.sin(angs)))
    deg.append(math.degrees(math.atan2(vy, vx)))
    strength.append(math.hypot(vx, vy) / max(1e-9, float(np.abs(dark).sum())))
ROLL_STRENGTH = float(np.mean(strength))
assert ROLL_STRENGTH > .3, ('the countershading is too weak to read a roll from', ROLL_STRENGTH)
_ref = next((r for r in deg if r is not None), 0.)
_fill = [(r if r is not None else _ref) for r in deg]
THETA = [math.radians(_fill[0])]
for r in _fill[1:]:
    prev = math.degrees(THETA[-1])
    THETA.append(math.radians(prev + ((r - prev + 180) % 360) - 180))
for _ in range(6):
    THETA = ([THETA[0]] + [(THETA[i - 1] + 2 * THETA[i] + THETA[i + 1]) / 4
                           for i in range(1, len(THETA) - 1)] + [THETA[-1]])


# How far the generation's own rest pose is from neutral, region by region. The number that matters
# is the arc's mean curvature radius over the section radius there: a run of body whose curve is
# twenty times its own thickness straightens on the rig without complaint, and one whose curve is a
# couple of times its own thickness has to be unbent in the mesh before anything is bound to it
# (Dinocephalosaurus' neck, at 2.8, is the worked example; its tail, at 9.0, is the easy half).
def region_curvature(i0, i1):
    i0 = max(0, min(len(TP) - 2, i0))
    i1 = max(i0 + 2, min(len(TP) - 1, i1))
    turn = sum(math.degrees(TP[i].angle(TP[i + 1])) for i in range(i0, i1))
    arc = CUM[i1] - CUM[i0]
    sec = float(np.median(R[i0:i1 + 1]))
    return {'arc': round(arc, 4), 'totalTurningDeg': round(turn, 1),
            'sectionRadius': round(sec, 4),
            'meanCurvatureRadius': round(arc / max(1e-6, math.radians(turn)), 4),
            'meanCurvatureRadiusOverSection': round(arc / max(1e-6, math.radians(turn))
                                                    / max(1e-9, sec), 2)}


def _station_at(fraction):
    return int(np.searchsorted(CUM, fraction * ARC))


REST_POSE_CURVATURE = {
    'wholeSpine': region_curvature(0, len(TP) - 1),
    'headAndTrunk': region_curvature(_station_at(HEAD_ARC), _station_at(.60)),
    'tail': region_curvature(_station_at(.60), len(TP) - 1),
    'note': 'measured on the generation\'s own centreline before anything was carried; this animal '
            'has no neck to measure separately',
}

iH = max(1, min(len(TP) - 1, int(np.searchsorted(CUM, HEAD_ARC * ARC))))
_span = [i for i in range(iH, len(TP)) if CUM[i] < .55 * ARC] or [iH]
T0 = Vector((0, 0, 0))
for i in _span:
    T0 += TP[i]
T0.normalize()
O = P[iH] - T0 * CUM[iH]
Q = [O + T0 * s for s in CUM]
# The target axis is straight, so its frames are one frame and the only thing left to decide is the
# roll. Choosing each target frame so that that station's own measured dorsal lands on the target's
# up is exact: an earlier version rolled an angle measured in the source's transport frame onto the
# target's, which is a different frame, and took 24 degrees out of this shark's pectoral span.
UP_T = (Vector((0, 0, 1)) - T0 * T0.dot(Vector((0, 0, 1)))).normalized()
W_T = T0.cross(UP_T)
TQ = [T0.copy() for _ in range(len(TP))]
NQ = [UP_T * cos(THETA[i]) - W_T * sin(THETA[i]) for i in range(len(TP))]
BQ = [TQ[i].cross(NQ[i]) for i in range(len(TP))]
# The head is not carried section by section: a skull is not a tube and re-spacing its rings
# squashes the snout. Its stations are straightened and their frames frozen to the one at `iH`, so
# the single carry *is* a rigid transform over the whole head and is continuous with the trunk
# behind it. Switching between two maps at a threshold instead shows as a step in the flank, and
# cost this animal 0.116 of a body length of pectoral span when the boundary fell across the roots.
for i in range(iH):
    back = CUM[iH] - CUM[i]
    P[i] = P[iH] - TP[iH] * back
    Q[i] = Q[iH] - TQ[iH] * back
    TP[i], NP[i], BP[i] = TP[iH].copy(), NP[iH].copy(), BP[iH].copy()
    TQ[i], NQ[i], BQ[i] = TQ[iH].copy(), NQ[iH].copy(), BQ[iH].copy()


def carry(v):
    best = (1e9, 0, 0.)
    for i in range(len(P) - 1):
        p0 = P[i]
        d = P[i + 1] - p0
        t = max(0., min(1., (v - p0).dot(d) / d.length_squared))
        dist = (v - (p0 + d * t)).length
        if dist < best[0]:
            best = (dist, i, t)
    _, i, t = best
    off = v - (P[i] + (P[i + 1] - P[i]) * t)
    return (Q[i] + (Q[i + 1] - Q[i]) * t + TQ[i] * off.dot(TP[i])
            + NQ[i] * off.dot(NP[i]) + BQ[i] * off.dot(BP[i]))


_before = np.array([v.co[:] for v in auth.data.vertices])
# How far out of the animal's own straight line the tail was, before anything moved: distance from
# the chord through the two ends of the measured centreline.
P0C = P[0].copy()
CHORD = (P[-1] - P[0]).normalized()
_move = 0.
for v in auth.data.vertices:
    q = carry(v.co)
    _move = max(_move, (q - v.co).length)
    v.co = q
M = Matrix(((W_T.x, W_T.y, W_T.z, 0), (T0.x, T0.y, T0.z, 0), (UP_T.x, UP_T.y, UP_T.z, 0), (0, 0, 0, 1)))
for v in auth.data.vertices:
    v.co = M @ v.co
auth.data.update()
_A = np.array([v.co[:] for v in auth.data.vertices])
_trunk = _A[thick0 > np.percentile(thick0, 55)]
_shift = Vector((float(np.median(_trunk[:, 0])), float((_A[:, 1].min() + _A[:, 1].max()) / 2),
                 float(np.median(_trunk[:, 2]))))
for v in auth.data.vertices:
    v.co = v.co - _shift
auth.data.update()
_A = np.array([v.co[:] for v in auth.data.vertices])
RAW_LENGTH = float(_A[:, 1].max() - _A[:, 1].min())
SCALE = TARGET_LENGTH / RAW_LENGTH
BODY_LENGTH = TARGET_LENGTH
ENVELOPE_TOLERANCE = ENVELOPE_TOLERANCE_FRACTION * BODY_LENGTH
ANCHOR_TOLERANCE = ANCHOR_TOLERANCE_FRACTION * BODY_LENGTH
_tipmask = np.array([D[k] > .93 * MAXD for k in range(len(auth.data.vertices))])
unbending = {
    'bands': len(P), 'arc': round(ARC, 4), 'totalTurningDeg': round(TURNING, 1),
    'medianSectionRadius': round(float(np.median(R)), 4),
    'meanCurvatureRadiusOverSection': round(ARC / max(1e-6, math.radians(TURNING))
                                            / max(1e-9, float(np.median(R))), 2),
    'headArcFraction': HEAD_ARC, 'headStationIndex': iH,
    'maxVertexMove': round(_move, 4),
    'lengthBefore': round(float(_before[:, 1].max() - _before[:, 1].min()), 4),
    'lengthAfterStraightening': round(RAW_LENGTH, 4),
    'tailTipOffsetFromTheChordBefore': round(float(np.mean(
        [((Vector(q) - P0C).cross(CHORD)).length for q in _before[_tipmask]])), 4),
    'tailTipOffsetFromTheMidlineAfter': round(float(np.abs(_A[_tipmask][:, 0]).mean()), 4),
    'snoutAfter': [round(float(x), 4) for x in _A[SNOUT]],
    'roll': {'meanHarmonicStrength': round(ROLL_STRENGTH, 3),
             'stationsRead': int(sum(1 for d in deg if d is not None)), 'stations': len(deg),
             'measuredDorsalDriftDeg': round(math.degrees(max(THETA) - min(THETA)), 1)},
    'bulkAtHeadEnd': round(max(BULK_A, BULK_B), 4), 'bulkAtCaudalEnd': round(min(BULK_A, BULK_B), 4),
}
assert abs(float(_A[SNOUT][0])) < .04 * RAW_LENGTH, ('the snout is off the midline', _A[SNOUT])

# --------------------------------------------- the straightened body, measured for the rig ----
# A snapshot of the closed intake surface, taken before anything is cut out of it. Everything that
# has to ask where the animal's skin is -- the seating of a root, the UVs the lining wears, the
# depth check on the lining -- asks this, because the body itself loses its closure and its polygon
# indices the moment the jaw comes out of it.
intake_mesh = auth.data.copy()
intake_mesh.name = 'Hybodus intake surface'
src_bvh = bvh_of(intake_mesh)
intake_uv = intake_mesh.uv_layers.active
thick_intake = neighbourhood_minimum(intake_mesh, shell_thickness(intake_mesh, src_bvh))
thickness = neighbourhood_minimum(auth.data, shell_thickness(auth.data, src_bvh))
CO = np.array([v.co[:] for v in auth.data.vertices])
YLO, YHI = float(CO[:, 1].min()), float(CO[:, 1].max())
STATION_Y = np.linspace(YLO, YHI, 61)


def _trunk_at(y, half=.014):
    m = (np.abs(CO[:, 1] - y) < half) & (thickness > .030)
    return CO[m] if m.sum() >= 5 else None


_cy, _cz, _cw, _cd = [], [], [], []
for y in STATION_Y:
    s = _trunk_at(float(y))
    if s is None:
        continue
    _cy.append(float(y))
    _cz.append(float((np.quantile(s[:, 2], .02) + np.quantile(s[:, 2], .98)) / 2))
    _cw.append(float(np.quantile(np.abs(s[:, 0]), .98)))
    _cd.append(float((np.quantile(s[:, 2], .98) - np.quantile(s[:, 2], .02)) / 2))
_cz = np.convolve(np.pad(_cz, 2, mode='edge'), np.ones(5) / 5, mode='valid')
_cw = np.convolve(np.pad(_cw, 2, mode='edge'), np.ones(5) / 5, mode='valid')
_cd = np.convolve(np.pad(_cd, 2, mode='edge'), np.ones(5) / 5, mode='valid')


def centre(y):
    """Trunk centreline height at station y."""
    return float(np.interp(y, _cy, _cz))


def half_width(y):
    return float(np.interp(y, _cy, _cw))


def half_depth(y):
    return float(np.interp(y, _cy, _cd))


def depth_inside(p):
    loc, nor, idx, dist = src_bvh.find_nearest(Vector(p))
    return dist * (-1 if (Vector(p) - loc).dot(nor) > 0 else 1)


def seat(p, toward, margin=.016):
    """Pull a root radially in towards the trunk's own axis until it is `margin` inside the skin.
    A fin whose root sits on or outside the flank reads as a fin floating beside the body."""
    q = Vector(p)
    c = Vector(toward)
    for _ in range(80):
        if depth_inside(q) >= margin:
            return tuple(q)
        d = c - q
        if d.length < 1e-6:
            break
        q = q + d.normalized() * .003
    raise AssertionError(('cannot seat a root inside the body', tuple(p), depth_inside(q)))


# ============================================== the mouth, measured off the generation ===========
# Placodus' method, and it reaches this animal: the generation models a real mouth, so intake finds
# it rather than guessing at it. Every head vertex casts its own outward normal back into the mesh;
# a vertex that hits is looking across the slit at the lip opposite, and the set of them is the oral
# cavity. Per station that gives the mouth's mid height, half width and half depth, and the mid
# height *is* the seam the jaw is cut on.
HEAD_BAND = (YLO, YLO + .22 * RAW_LENGTH)
CAVITY_REACH = .030 * RAW_LENGTH
# A vertex whose own outward normal runs back into the mesh is looking across a slit at the surface
# opposite. That is the mouth -- and it is also the armpit of a pectoral fin, the notch behind a
# gill flap and the fold under a dorsal spine, so the sweep is fenced to the *inside of the head*:
# forward of the gills, well inside the head's own half width and within its own depth. Without the
# fence the fin folds pulled the measured mouth line 0.085 of a body length out of the animal.
cav = []
for v in auth.data.vertices:
    x, y, z = v.co
    if not (HEAD_BAND[0] - 1e-9 <= y <= HEAD_BAND[1]):
        continue
    if abs(x) > .60 * half_width(y) or abs(z - centre(y)) > .75 * half_depth(y):
        continue
    n = Vector(v.normal[:])
    if src_bvh.ray_cast(Vector(v.co[:]) + n * 3e-4, n, CAVITY_REACH)[0] is not None:
        cav.append((float(y), float(x), float(z)))
CAVITY = np.array(cav)
assert len(CAVITY) >= 60, ('no modelled mouth found; this body needs the albedo method', len(CAVITY))
_sy, _sz, _sw, _sd, _scx = [], [], [], [], []
_step = .010 * RAW_LENGTH
_y = CAVITY[:, 0].min()
while _y <= CAVITY[:, 0].max() + 1e-9:
    m = np.abs(CAVITY[:, 0] - _y) < _step
    if m.sum() >= 5:
        s = CAVITY[m]
        _sy.append(float(_y))
        _sz.append(float(np.median(s[:, 2])))
        # The mouth's own lateral centre per station, and its width about *that* rather than about
        # x = 0. Saurichthys' rostrum runs 0.02-0.035 to one side of the midline after the intake
        # unbend, and a lining built on x = 0 there stood in open water beside the jaws: from the
        # supposed axis, rays to every side and up and down met nothing at all.
        _scx.append(float(np.median(s[:, 1])))
        _sw.append(float(np.quantile(np.abs(s[:, 1] - np.median(s[:, 1])), .92)))
        _sd.append(float((np.quantile(s[:, 2], .94) - np.quantile(s[:, 2], .06)) / 2))
    _y += _step
assert len(_sy) >= 6, ('the mouth did not measure along the head', len(_sy))
_sz = list(np.convolve(np.pad(_sz, 2, mode='edge'), np.ones(5) / 5, mode='valid'))
MOUTH_Y = (min(_sy), max(_sy))


def seam_z(y):
    """The measured mouth line. It is a curve, not a ramp: a plane cut through it bisects the lip."""
    return float(np.interp(y, _sy, _sz))


def mouth_half_width(y):
    return float(np.interp(y, _sy, _sw))


def mouth_half_depth(y):
    return float(np.interp(y, _sy, _sd))


def mouth_cx(y):
    """Where the mouth actually is across the body at station y (see `_scx`)."""
    return float(np.interp(y, _sy, _scx))


# How far a straight ramp would have been from the measured line -- the number that says whether the
# curve was worth measuring. The shipped Placodus ramp was 0.54 % of a body length high of the real
# line and took a band of upper lip down with the jaw.
_fit = np.polyfit(_sy, _sz, 1)
_ramp_residual = float(np.max(np.abs(np.array(_sz) - np.polyval(_fit, _sy))))
# Did the generation arrive gaping? A mouth modelled open is a pose, not the animal, and closing it
# is expensive: teeth modelled apart interpenetrate the first time they are brought together, the
# cavity has to fold rather than be built, and the pose the animal spends nearly all its time in
# becomes its most deformed one. The measurement that says which is the slit's own thickness
# against the depth of the head it is cut into.
_rest = []
for _a, _d in zip(_sy, _sd):
    _m = np.abs(CO[:, 1] - _a) < .010 * RAW_LENGTH
    if _m.sum() < 6:
        continue
    _sec = CO[_m]
    _hd = float(np.quantile(_sec[:, 2], .98) - np.quantile(_sec[:, 2], .02))
    if _hd > 1e-6:
        _rest.append(2 * _d / _hd)
# The number that decides it is not the ratio but the *rotation*: how far the jaw would have to
# swing to bring the two lips together. On a needle-snouted fish a slit a quarter of the local head
# depth is a couple of degrees, and on a deep-headed one the same ratio is ten.
_jaw_len = (MOUTH_Y[1] + .015 * RAW_LENGTH) - MOUTH_Y[0]
_close_deg = math.degrees(math.atan2(2 * float(_sd[0]), max(1e-9, _jaw_len)))
RESTING_GAPE = {
    'closingRotationDegrees': round(_close_deg, 2),
    'jawLengthRaw': round(_jaw_len, 4),
    'meanSlitThicknessOverHeadDepth': round(float(np.mean(_rest)), 4),
    'maxSlitThicknessOverHeadDepth': round(float(np.max(_rest)), 4),
    'meanSlitThicknessOverBodyLength': round(float(np.mean(_sd)) * 2 / RAW_LENGTH, 5),
    'verdict': ('the generation arrived with its mouth SHUT for practical purposes: what it models '
                'is a slit with an interior rather than a gape, and the rotation that would bring '
                'the lips together is under six degrees, so nothing here has to fold a modelled '
                'gape closed and the jaw only ever opens from the bind pose'
                if _close_deg < 6. else
                'the generation arrived GAPING: the bind pose carries that gape, closing it for the '
                'locomotion clips is a large jaw rotation, and this animal wants a mouth-closed '
                'regeneration'),
}
# The teeth the generation carries. Measured before anything is decided about them: a crown is a
# patch of oral surface standing proud of its own neighbourhood along its normal.
_ptr, _idx = adjacency(auth.data)
_PP = np.array([v.co[:] for v in auth.data.vertices])
_NN = np.array([v.normal[:] for v in auth.data.vertices])
_MM = _PP.copy()
for _ in range(4):
    _MM = ring_mean(_MM, _ptr, _idx)
PROTRUSION = ((_PP - _MM) * _NN).sum(1)
_oral = np.zeros(len(_PP), dtype=bool)
for i in range(len(_PP)):
    y, z = _PP[i][1], _PP[i][2]
    if MOUTH_Y[0] - _step <= y <= MOUTH_Y[1] + _step and abs(z - seam_z(y)) < 2.2 * mouth_half_depth(y) \
            and abs(_PP[i][0] - mouth_cx(y)) < 1.6 * mouth_half_width(y):
        _oral[i] = True
_tooth_threshold = .0018 * RAW_LENGTH
mouth_report = {
    'method': 'geometric: every head vertex casts its own outward normal back into the mesh',
    'cavityVertices': int(len(CAVITY)), 'cavityStations': len(_sy),
    'cavityExtentY': [round(MOUTH_Y[0], 4), round(MOUTH_Y[1], 4)],
    'seamTable': [[round(a, 4), round(b, 4), round(c, 4), round(d, 4)]
                  for a, b, c, d in zip(_sy, _sz, _sw, _sd)],
    'restingGape': RESTING_GAPE,
    'howCurvedTheMouthLineIs': {
        'straightFitResidualMaxRaw': round(_ramp_residual, 5),
        'asFractionOfBodyLength': round(_ramp_residual / RAW_LENGTH, 5),
        'note': 'how far the measured lip line departs from a straight line. A fish mouth is often '
                'genuinely straight and this is the easy case -- but the cut follows the measured '
                'curve either way, so the number below is what the cut costs and this one is only '
                'how much work the curve was doing.'},
    'cutDeviationFromTheMeasuredLipLine': {
        'maxRaw': 0.0, 'asFractionOfBodyLength': 0.0,
        'note': 'zero by construction. The head is sheared vertically by -seam(y), which carries '
                'the measured curve exactly onto the plane z = 0; the cut is taken there and the '
                'shear undone, so every vertex the cut adds lands on the measured line itself and '
                'every vertex that was already there returns to where it was.'},
    'generationsOwnDentition': {
        'oralZoneVertices': int(_oral.sum()),
        'standingProudOfTheirNeighbourhood': int((_oral & (PROTRUSION > _tooth_threshold)).sum()),
        'maxProtrusionRaw': round(float(PROTRUSION[_oral].max()), 5),
        'maxProtrusionOverMouthHalfDepth': round(float(PROTRUSION[_oral].max())
                                                 / max(1e-9, float(np.mean(_sd))), 3),
        'authoredReplacement': False,
        'note': 'kept as generated and weighted to the jaw they grow from; nothing is authored here'},
}

# ------------------------------------------------------------------ rig ----
def tx(p):
    """Raw intake units -> Blender authoring units. The head stays on -Y, which `export_yup` turns
    into glTF +Z, where every shipped body in this repository keeps it."""
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


def on_axis(f, dz=0.):
    """A point on the trunk's own measured centreline, at fraction f of the body from the snout."""
    y = YLO + f * RAW_LENGTH
    return (0., y, centre(y) + dz)


bone('root', (0, 0, 0), None)
bone('body', on_axis(.46), 'root')
bone('chest', on_axis(.27), 'body')
bone('skull', on_axis(.145, .010), 'chest')
# The hinge sits just behind the back of the measured cavity, which is where the modelled mouth
# actually stops being a slit -- not at a fraction picked off the head's length.
HINGE_Y = MOUTH_Y[1] + .020 * RAW_LENGTH
HINGE_F = (HINGE_Y - YLO) / RAW_LENGTH
JAW_HINGE = (0., HINGE_Y, seam_z(HINGE_Y) - .010 * RAW_LENGTH)
bone('jaw', seat(JAW_HINGE, on_axis(HINGE_F), margin=.010), 'skull')
TAIL_F = [.55, .63, .70, .765, .825, .880, .930]
for i, f in enumerate(TAIL_F):
    bone('tail_%02d' % i, on_axis(f), 'body' if i == 0 else 'tail_%02d' % (i - 1))
bone('caudal_upper', on_axis(.955, .035), 'tail_06')
bone('caudal_lower', on_axis(.955, -.030), 'tail_06')
# Two dorsal fins, each fronted by a stout ridged spine, at the fractions the proportion audit
# measured on this generation; each gets a bone because each is big enough for a lag to read.
bone('dorsal_1', on_axis(.365, .075), 'body')
bone('dorsal_2', on_axis(.555, .070), 'tail_00')
PECTORAL, PELVIC = {}, {}
for side in (-1, 1):
    s = 'L' if side > 0 else 'R'
    root = seat((side * .055 * RAW_LENGTH, YLO + .225 * RAW_LENGTH,
                 centre(YLO + .225 * RAW_LENGTH) - .055 * RAW_LENGTH), on_axis(.225))
    pts = [root,
           (side * .130 * RAW_LENGTH, YLO + .245 * RAW_LENGTH, centre(YLO + .245 * RAW_LENGTH) - .115 * RAW_LENGTH),
           (side * .205 * RAW_LENGTH, YLO + .265 * RAW_LENGTH, centre(YLO + .265 * RAW_LENGTH) - .155 * RAW_LENGTH)]
    names = ['pec_upper_' + s, 'pec_mid_' + s, 'pec_tip_' + s]
    PECTORAL[s] = (side, pts, names)
    for i, n in enumerate(names):
        bone(n, pts[i], 'chest' if i == 0 else names[i - 1])
    proot = seat((side * .022 * RAW_LENGTH, YLO + .505 * RAW_LENGTH,
                  centre(YLO + .505 * RAW_LENGTH) - .045 * RAW_LENGTH), on_axis(.505))
    PELVIC[s] = (side, ['pelvic_' + s], proot)
    bone('pelvic_' + s, proot, 'tail_00')

# Every fin's origin sits inside the trunk's own cross-section, which the builders check.
seating = {}
for s, (side, pts, names) in PECTORAL.items():
    seating[names[0]] = round(depth_inside(pts[0]), 4)
for s, (side, names, proot) in PELVIC.items():
    seating[names[0]] = round(depth_inside(proot), 4)
seating['jaw'] = round(depth_inside(B['jaw'][0]), 4)
seating['skull'] = round(depth_inside(B['skull'][0]), 4)
seating['chest'] = round(depth_inside(B['chest'][0]), 4)
seating['body'] = round(depth_inside(B['body'][0]), 4)
for n, d in seating.items():
    assert d > .008, ('a root is outside the body', n, d)

# ------------------------------------------------- procedural twin (LOD) ----
# Regenerated topology from the authored body's own occupancy field: no source vertex or face
# survives it, so this is a measured rebuild of the volume rather than a decimation of the skin.
puppet = auth.copy()
puppet.data = auth.data.copy()
bpy.context.collection.objects.link(puppet)
puppet.name = 'Hybodus procedural volume twin'
bpy.context.view_layer.objects.active = puppet
# A voxel field cannot hold a knife edge: every fin here tapers to nothing and an occupancy field
# stops two or three voxels short of the trailing tip. The blades -- and only the blades, by their
# own measured shell thickness -- are dilated along their normals on the twin's copy before the
# field is sampled, which carries the rim out as well as thickening the plate. The authored body is
# never touched by this.
for v in puppet.data.vertices:
    n = Vector(v.normal[:])
    w = 1. - max(0., min(1., (float(thickness[v.index]) - .030) / .020))
    v.co = Vector(v.co[:]) + n * (BLADE_DILATION * w * w * (3 - 2 * w))
puppet.data.remesh_voxel_size = VOXEL
puppet.data.remesh_voxel_adaptivity = 0
puppet.data.use_remesh_preserve_volume = True
bpy.ops.object.voxel_remesh()
remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)
# Relaxation takes the voxel staircase off the trunk and must not touch the fins: a blade two
# voxels thick is simply eaten by two unmasked passes of smoothing.
_bvh_vox = bvh_of(puppet.data)
relax_group = puppet.vertex_groups.new(name='Trunk relaxation mask')
_vox_thickness = neighbourhood_minimum(puppet.data, shell_thickness(puppet.data, _bvh_vox))
relax_masked = 0
for v in puppet.data.vertices:
    w = smooth((float(_vox_thickness[v.index]) - .030) / .020)
    relax_group.add([v.index], w, 'REPLACE')
    if w < .5:
        relax_masked += 1
mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH')
mod.factor = .45
mod.iterations = 2
mod.vertex_group = relax_group.name
bpy.ops.object.modifier_apply(modifier=mod.name)
puppet.vertex_groups.remove(puppet.vertex_groups[relax_group.name])
mod = puppet.modifiers.new('Twin topology budget', 'DECIMATE')
mod.ratio = min(1., PUPPET_TRIANGLE_TARGET / max(1, remesh_triangles))
decimate_ratio = mod.ratio
bpy.ops.object.modifier_apply(modifier=mod.name)
# Pigment comes through the nearest source triangle's own interpolated UV -- never by averaging
# unrelated atlas islands at a welded seam vertex, and never by copying a nearest vertex colour.
if puppet.data.color_attributes.get('Color'):
    puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
pl = puppet.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for v in puppet.data.vertices:
    hit = src_bvh.find_nearest(v.co)
    s = hit_uv(hit[0], hit[2])
    pl.data[v.index].color = sample_albedo(s.x, s.y) if s else (1, 1, 1, 1)
pmat = bpy.data.materials.new('Hybodus twin body')
pmat.use_nodes = True
pbs = pmat.node_tree.nodes.get('Principled BSDF')
pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor')
pvc.layer_name = 'Color'
pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
pbs.inputs['Roughness'].default_value = .66
puppet.data.materials.clear()
puppet.data.materials.append(pmat)
for p in puppet.data.polygons:
    p.material_index = 0
pup_intake = puppet.data.copy()
pup_intake.name = 'Hybodus twin intake surface'
_bvh_pup = bvh_of(pup_intake)

# ---------------------------------------------------- cut the lower jaw ----
# The mouth line is a curve and a cut is a plane, so the head is sheared vertically by -seam(y)
# first, which carries the curve exactly onto z = 0; the cut is taken there and the shear undone,
# so every vertex the cut adds lands on the seam itself and every vertex already there returns to
# where it was. Only head faces are offered to the pass, so the rest of the body keeps its topology.
JAW_BACK = float(B['jaw'][0][1])
JAW_FRONT = MOUTH_Y[0] - .002 * RAW_LENGTH


def is_jaw(c):
    """Geometric fallback, used for the twin -- a resurfaced volume shares no vertex with the
    authored body and so has no labels to inherit. It carries no tooth detail either, because the
    occupancy field cannot resolve one, so a height test is the right test there."""
    return c[1] > JAW_FRONT and c[1] < JAW_BACK and c[2] < seam_z(c[1]) - 1e-7


# ------------------------------------------- which side of the mouth a vertex is on ----
# A height test cannot separate interlocking teeth. The upper teeth hang *below* the mouth line and
# the lower teeth stand above it, so "below the seam is the jaw" puts the palate's own teeth on the
# mandible -- and a graded version of the same test puts half of each tooth on each bone, which is
# how Saurichthys' upper tooth row came out as a comb of needles stretched two head-depths long the
# first time this was rendered.
#
# Connectivity decides instead. Seed the outer skin well above and well below the mouth line, flood
# the labels out over the mesh, and every tooth inherits the label of the jaw it actually grows
# from, because in a closed mouth a tooth is joined to its own jaw and to nothing else.
_PL = np.array([v.co[:] for v in auth.data.vertices])
_in_head = ((_PL[:, 1] > JAW_FRONT - .02 * RAW_LENGTH) & (_PL[:, 1] < JAW_BACK + .04 * RAW_LENGTH))
_seam_at = np.array([seam_z(float(y)) for y in _PL[:, 1]])
# `_MM` is the same neighbourhood mean the dentition was measured against: the surface with the
# teeth taken out of it. A tooth tip's own height is on the wrong side of the mouth line, but the
# height of the surface it grows out of is not, so labelling by the *base* sends each tooth whole
# to the jaw it belongs to.
SMOOTH_Z = _MM[:, 2]
JAW_SIDE = _in_head & (SMOOTH_Z < _seam_at - 1e-7)
# Looked up by *position*, never by index. The bisect that cuts the jaw adds vertices and deletes
# faces, so a post-cut vertex index means nothing to a label array built before it -- and a label
# array read by the wrong index scatters the mandible's weight at random through the head, which
# is what turned this fish's tooth row into a comb of stretched ribbons at full gape.
from mathutils.kdtree import KDTree                                                  # noqa: E402
_kd = KDTree(len(_PL))
for _i, _q in enumerate(_PL):
    _kd.insert(Vector(_q), _i)
_kd.balance()


def jaw_side_at(co):
    return bool(JAW_SIDE[_kd.find(Vector(co))[1]])
label_report = {
    'method': 'the height of the surface each vertex grows out of, against the measured mouth line',
    'jawSideVertices': int(JAW_SIDE.sum()),
    'skullSideVertices': int((~JAW_SIDE).sum()),
    'note': 'a height test on the vertex itself splits interlocking teeth down the middle and a '
            'graded one stretches each half between two bones -- which is how this fish\'s upper '
            'tooth row first came out as a comb of needles two head-depths long. Taking the height '
            'of the smoothed surface instead, which is the tooth\'s own base, puts every tooth '
            'whole on the jaw it grows from. Flood-filling labels from the skin was tried first '
            'and is worse on a needle rostrum: the seeds are sparse on a tube that thin and the '
            'label boundary wanders through it, which tore the snout into ribbons.',
}

parts = {}
JAW_NORMAL_VOTE = {}


def split(o, label, test, labels=None):
    me = o.data
    bmx = bmesh.new()
    bmx.from_mesh(me)
    bmx.verts.ensure_lookup_table()
    for v in bmx.verts:
        if JAW_FRONT - .05 * RAW_LENGTH < v.co.y < JAW_BACK + .05 * RAW_LENGTH:
            v.co.z -= seam_z(v.co.y)
    bmesh.ops.bisect_plane(bmx, geom=list(bmx.verts) + list(bmx.edges) + list(bmx.faces), dist=1e-7,
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=False, clear_outer=False)
    bmesh.ops.bisect_plane(bmx, geom=list(bmx.verts) + list(bmx.edges) + list(bmx.faces), dist=1e-7,
                           plane_co=(0, JAW_BACK, 0), plane_no=(0, 1, 0), clear_inner=False, clear_outer=False)
    for v in bmx.verts:
        if JAW_FRONT - .05 * RAW_LENGTH < v.co.y < JAW_BACK + .05 * RAW_LENGTH:
            v.co.z += seam_z(v.co.y)
    bmx.to_mesh(me)
    bmx.free()
    part = o.copy()
    part.data = me.copy()
    part.name = o.name + ' ' + label
    bpy.context.collection.objects.link(part)
    # The bisect added vertices, so the labels are re-read against the *pre-cut* positions by
    # nearest original vertex; a vertex the cut created sits on the seam and takes whichever side
    # its own face falls on.
    if labels is not None:
        want = [labels(p.center) for p in me.polygons]
    for target, keep in [(o, False), (part, True)]:
        bmx = bmesh.new()
        bmx.from_mesh(target.data)
        bmx.faces.ensure_lookup_table()
        if labels is not None:
            discard = [f for f in bmx.faces if want[f.index] != keep]
        else:
            discard = [f for f in bmx.faces if test(f.calc_center_median()) != keep]
        bmesh.ops.delete(bmx, geom=discard, context='FACES')
        loose = [v for v in bmx.verts if not v.link_faces]
        if loose:
            bmesh.ops.delete(bmx, geom=loose, context='VERTS')
        if target is part:
            # Close the mandible. A cut shell is open along the seam, and its inside faces away
            # from anyone looking into the gape -- so under a single-sided draw the open mouth
            # shows straight out through the bottom of the jaw. Filling the cut's own boundary is
            # the simplest kind of authored geometry there is: no new shape, no new vertices, and
            # the UVs are the ring's own.
            bmx.faces.ensure_lookup_table()
            bmesh.ops.holes_fill(bmx, edges=[e for e in bmx.edges if e.is_boundary], sides=0)
            bmesh.ops.recalc_face_normals(bmx, faces=list(bmx.faces))
            # **A recalculated normal is consistent, not necessarily outward.** On a shell the fill
            # does not close -- and a mandible cut through a modelled cavity has the cavity floor's
            # rim as a second boundary the fill cannot pair with the lip's -- bmesh picks one sense
            # for the whole part, and on Hybodus it picked inward: 1,330 of the mandible's 1,641
            # faces pointed into the jaw, so a single-sided pass drew the lower jaw transparent and
            # the oral floor showed through it from every side. The intake surface knows which way
            # out is, so the part's faces are put to a vote against it.
            bmx.normal_update()
            agree = 0
            for f in bmx.faces:
                near = src_bvh.find_nearest(f.calc_center_median())
                if near[0] is not None:
                    agree += 1 if f.normal.dot(near[1]) >= 0 else -1
            if agree < 0:
                for f in bmx.faces:
                    f.normal_flip()
                bmx.normal_update()
            JAW_NORMAL_VOTE[target.name] = int(agree)
        bmx.to_mesh(target.data)
        bmx.free()
    parts.setdefault(label, {})[o.name] = part
    return part


split(auth, 'lower jaw', is_jaw, labels=jaw_side_at)
split(puppet, 'lower jaw', is_jaw)
AUTH_JAW = parts['lower jaw'][auth.name]
PUP_JAW = parts['lower jaw'][puppet.name]

# **What the cut actually left open, measured before anything is built to close it** -- the
# question CLAUDE.md puts ahead of "how do we fill it". The mandible is filled inside `split`
# above, so this is asked of the skull half, and `seam` marks which of the boundary this
# generation already had.
CUT_RIM = {o.name: T.cut_rim(o, lambda p: p[1] < JAW_BACK + .04 * RAW_LENGTH,
                             seam=lambda y: seam_z(y))
           for o in (auth, puppet)}
print('HYBODUS_CUT_RIM', json.dumps(CUT_RIM))

# ------------------------------------------- close what the cut leaves open on the skull ----
# The mandible was closed above by filling its own boundary. The skull half was not, and what it
# is left open along is two different things, closed two different ways.
#
# **The hinge cross-section.** The plane cut at `JAW_BACK` leaves the head open across its whole
# section below the seam, and once the mandible is taken away that opening is the back wall of the
# mouth -- except that there is no wall: a line of sight into the gape runs back through it, down
# the throat and out through the far side of the head. `T.cap_cut` fans that run of the boundary
# to its own centroid, facing into the mouth; every vertex of it but the hub is one the cut made.
#
# **The lip.** The rim along the seam is one polygon thick, and at a grazing angle that edge *is*
# the silhouette: the quad the eye meets is nearly edge-on, and whether it is wound towards the
# camera or away is decided by a rounding error in the pose, so a single-sided pass drops it and
# shows the world through the lip. That was the whole of what was left on this fish once the
# hinge plug went (667 px at Attack@0.43, unmoved by anything done to the lining, because none of
# it was about the rim). `T.rim_flange` extrudes the boundary and draws the new ring in towards the
# mouth's own axis, so the lip has a face that looks back at the camera. It runs out before the
# snout: at the front the two rims meet round the mouth, and folding both inwards there parts them
# instead of closing them (Macrocnemus measured that at 12 px in every clip at any gape).
#
# Both are the "closing a hole is simple and is always fair game" case: no shape is invented.
# They run *before* the shell thickness is measured again below, because both add vertices.
RIM_FOLD = .0035 * RAW_LENGTH
CAPS, RIM, SEAMS, BOUNDARY = {}, {}, {}, {}


def _on_seam(c):
    """A vertex the seam cut made: the bisect lands them *on* the measured mouth line exactly,
    which nothing of the generation's own is."""
    return (abs(c[2] - seam_z(c[1])) <= 2e-4 * RAW_LENGTH
            and JAW_FRONT - .03 * RAW_LENGTH <= c[1] <= JAW_BACK + 1e-4)


def _is_mouth_rim(a, b):
    return _on_seam(a) and _on_seam(b)


for o in (auth, puppet):
    # The rear of the mouth window is not a plane on the authored body: its mandible is labelled
    # by the surface each vertex grows from, so where the labels leave the hinge plane the window's
    # rear edge runs along the generation's own edges. The cap takes the whole rear band of the
    # window -- every boundary edge in the last 0.03 of a body before the hinge that the seam cut
    # did not make -- rather than the edges lying exactly on the plane, which on the authored
    # body were three.
    CAPS[o.name] = T.cap_cut(o, lambda p: JAW_BACK - .03 * RAW_LENGTH <= p[1] <= JAW_BACK + 1e-4
                             and not _on_seam(p), Vector((0., -1., 0.)))
    # Only the mouth's own rim is folded: this generation is open elsewhere too -- opercular
    # seams and fin-base seams, thousands of boundary edges -- and those are not the cut.
    RIM[o.name] = T.rim_flange(
        o, lambda c: Vector((mouth_cx(min(max(c[1], JAW_FRONT), JAW_BACK)),
                             min(max(c[1], JAW_FRONT), JAW_BACK),
                             seam_z(min(max(c[1], JAW_FRONT), JAW_BACK)))),
        lambda c: RIM_FOLD * smooth((c[1] - (JAW_FRONT + .010 * RAW_LENGTH)) / (.008 * RAW_LENGTH)),
        select=_is_mouth_rim)
    # And the generation's own open seams on the head -- the opercular slits behind the corner of
    # the mouth -- are sealed with their own vertices (`T.seal_seams`): under a single-sided pass
    # each was a line of sight into a hollow head, and together they were every pixel the strict
    # gape count had left once the mouth was closed. Only seams on the head and narrower than an
    # eighth of a body are touched, so nothing at a fin base can be sealed by mistake.
    SEAMS[o.name] = T.seal_seams(o, _is_mouth_rim, lambda c: c[1] < YLO + .50 * RAW_LENGTH,
                                 .125 * RAW_LENGTH)
    # What is still open on the head afterwards, by kind, so the record says what the seals and
    # the fold did and did not reach.
    _bm = bmesh.new()
    _bm.from_mesh(o.data)
    _kinds = {'onSeam': 0, 'otherOnHead': 0, 'behindHead': 0}
    for _e in _bm.edges:
        if len(_e.link_faces) != 1:
            continue
        a, b = _e.verts[0].co, _e.verts[1].co
        if _is_mouth_rim(a, b):
            _kinds['onSeam'] += 1
        elif a[1] < YLO + .40 * RAW_LENGTH and b[1] < YLO + .40 * RAW_LENGTH:
            _kinds['otherOnHead'] += 1
        else:
            _kinds['behindHead'] += 1
    _bm.free()
    BOUNDARY[o.name] = _kinds
print('BOUNDARY', json.dumps(BOUNDARY))
assert all(v >= 3 for v in CAPS.values()), ('the hinge cross-section did not cap', CAPS)
assert all(v > 20 for v in RIM.values()), ('a skull half has no rim to fold', RIM)
# The cut adds vertices, so the shell thickness both bodies are skinned by is measured again, and
# against the *closed* surface each came from: a blade's thickness is a property of the shell, and
# a body with its jaw taken out of it would measure the open mouth as infinitely thin.
thickness = neighbourhood_minimum(auth.data, shell_thickness(auth.data, src_bvh))
# Voxel resurfacing cannot make a blade thinner than its own voxel, so the twin's fins are measured
# against the twin's own floor rather than the authored body's.
puppet_thickness = np.maximum(0., neighbourhood_minimum(
    puppet.data, shell_thickness(puppet.data, _bvh_pup)) - (VOXEL * 2 - .004))
# Which of the generation's own teeth ended up on which jaw. Nothing is authored, so the only thing
# the cut can get wrong is to saw a crown in half or carry one onto the wrong bone.
_jaw_teeth = sum(1 for v in AUTH_JAW.data.vertices
                 if abs(v.co.z - seam_z(v.co.y)) > .004 * RAW_LENGTH)
mouth_report['generationsOwnDentition']['verticesCarriedOntoTheMandible'] = int(_jaw_teeth)

# --------------------------------------------------------- the lining ----
# A palate rigid on the skull and a floor rigid on the jaw, each closed on its own and each filling
# its own jaw's interior out to the head's measured room, overlapping rather than joining at the
# corner of the mouth where the jaw's rotation is zero (`T.oral_shells`, shared with every body in
# the era). One sac whose wall stretched between the two bones stood here; the wall could not part,
# which is what it was written for, and it still photographed as a mouth webbed shut -- the black
# cavity in the gape renders was its own culled near wall, and with the cull off it was gum.
#
# It is the one authored surface on this body, and it is the simple kind: two closed shells that
# fill a hole. It takes its UVs from the skin it is sewn into -- each ring vertex samples the nearest point
# on the intake surface -- and wears the body's own albedo through a copy of the body's material,
# so it is not a flat-shaded island in a pored hide.
LIN_RINGS, LIN_RING = 24, 14
# The sac has to close *behind* the pivot. Ended in front of it, the last thing the cut opens
# as the jaw swings is the corner of the mouth, and the corner is exactly where the lining
# has run out: the gape measured 5.4 % see-through there with the sac stopping short.
LIN_BACK = JAW_BACK + .014 * RAW_LENGTH
LIN_FRONT = JAW_FRONT + .004 * RAW_LENGTH
liningmat = mat.copy()
liningmat.name = 'Hybodus mouth lining'
# Each shell is a closed solid wound outwards, so what a viewer sees of it is always its front and
# the cull costs it nothing; it stays the one material here that culls because a closed solid has
# no back face worth drawing.
liningmat.use_backface_culling = True
_lbs = liningmat.node_tree.nodes.get('Principled BSDF')
_lbs.inputs['Roughness'].default_value = .5

# The head's own silhouette per station, from the vertex cloud. Rays cannot measure it here: this
# generation's mouth is modelled *open*, so a ray cast in at the mouth line goes clean through the
# gape and hits the far cheek -- which reported the head as 0.019 units wide the wrong way round and
# put the first lining outside the animal.
_hy, _hw, _hbot, _htop, _hcx = [], [], [], [], []
for y in np.linspace(YLO, YLO + .32 * RAW_LENGTH, 41):
    m = np.abs(CO[:, 1] - y) < .010 * RAW_LENGTH
    if m.sum() < 6:
        continue
    sec = CO[m]
    _hy.append(float(y))
    _hcx.append(float(np.median(sec[:, 0])))
    _hw.append(float(np.quantile(np.abs(sec[:, 0] - np.median(sec[:, 0])), .98)))
    _hbot.append(float(np.quantile(sec[:, 2], .02)))
    _htop.append(float(np.quantile(sec[:, 2], .98)))


def head_half_width(y):
    return float(np.interp(y, _hy, _hw))


def head_z(y):
    return float(np.interp(y, _hy, _hbot)), float(np.interp(y, _hy, _htop))


def head_cx(y):
    return float(np.interp(y, _hy, _hcx))


def cx(y):
    """The mouth's lateral axis: the cavity's own centre along the mouth, handing over to the
    head's median behind it, where the throat is and no cavity was measured."""
    w = smooth((y - MOUTH_Y[1]) / (.02 * RAW_LENGTH))
    return (1. - w) * mouth_cx(y) + w * head_cx(y)


_swy, _sww = [], []
for _y in np.linspace(YLO, YLO + .32 * RAW_LENGTH, 41):
    _m = (np.abs(CO[:, 1] - _y) < .010 * RAW_LENGTH) & (np.abs(CO[:, 2] - seam_z(_y)) < .014 * RAW_LENGTH)
    if _m.sum() < 5:
        continue
    _swy.append(float(_y))
    _sww.append(float(np.quantile(np.abs(CO[_m][:, 0] - np.median(CO[_m][:, 0])), .96)))


def seam_half_width(y):
    """How wide the head is *at the mouth line* -- which is how wide the cut is, and therefore how
    wide the lining has to be. The head's widest section is wider than its mouth line and a lining
    drawn to it comes out through the cheek."""
    return float(np.interp(y, _swy, _sww))


def lumen(y):
    """The section the lining takes at station y: as wide as the cut and as thin as the slit.

    Both halves of that were learned by measuring. A sac cut to the head's own section is far
    thicker than the modelled mouth and stands proud of the lip with the jaw shut -- a pale bulge
    along the closed mouth in every frame. But a sac cut to the *slit's* own width is narrower than
    the cut, and the jaw's cut edge and the skull's separate right across the head, so at full gape
    the corners of the mouth opened onto nothing: 9.0 % of the aperture was a hole straight through
    the animal at Bite's widest. Width follows the cut; depth follows the slit, and the gape comes
    from the floor following the jaw while the wall between roof and floor stretches."""
    bot, top = head_z(y)
    z = min(max(seam_z(y), bot + .18 * (top - bot)), top - .18 * (top - bot))
    # Flush with the cut, not inside it. At 0.92 the sac was an eighth narrower than the cut
    # it has to back, and the corner of the mouth opened onto the backdrop -- 1,486 pixels
    # of it under an all-backfaces-culled shim.
    wy = min(1.00 * seam_half_width(y), .95 * head_half_width(y))
    # Deep enough at rest that opening it is a stretch rather than an unfolding. Drawn to the
    # slit's own thickness the sac's wall is four thousandths of a unit long at rest and a
    # quarter of a unit at full gape, and `tools/triassic/skin-tears.mjs` reads that ratio --
    # 77x -- as the worst tear on the animal. It is the inside of a mouth and it is meant to
    # stretch, but a sac that starts with some depth in it starts nearer where it ends.
    wz = min(1.9 * mouth_half_depth(y), .45 * (z - bot))
    return max(wy, .004 * RAW_LENGTH), max(wz, .0015 * RAW_LENGTH)


def lumen_centre(y):
    bot, top = head_z(y)
    return min(max(seam_z(y), bot + .18 * (top - bot)), top - .18 * (top - bot))


def lumen_shells(y):
    """The mouth's own section at station y, as the shells' floor: (half-width, palate half-height,
    floor half-depth). `T.oral_shells` never draws a shell narrower than this, and where the head's
    measured room is bigger it fills the room instead."""
    u = (y - LIN_BACK) / (LIN_FRONT - LIN_BACK)
    # Drawn in at the ends so each shell closes rather than ending in a ring standing in open
    # flesh -- but only just at the back. Tapered over the last eighth there, the tube pinched to a
    # fifth of its width exactly where the cut is widest, and the corner of the mouth opened onto
    # the backdrop at full gape.
    e = smooth(u / .035) * smooth((1. - u) / .08)
    _wy, _wz = lumen(y)
    _bot, _top = head_z(y)
    _c = lumen_centre(y)
    # Behind the pivot the palate becomes a throat and fills the head's own section: the wedge the
    # cut leaves between the mandible and the skull opens there.
    _throat = 1. - smooth(u / .22)
    wy = max(_wy, .80 * head_half_width(y) * _throat) * (.18 + .82 * e)
    wz = max(_wz, .38 * (_top - _bot) * _throat) * (.20 + .80 * e)
    # The roof sits *on* the cut over the jaws and swells to the section at the throat; an ellipse
    # centred on the mouth line leaves a crescent between its roof and the ring the cut left in
    # the skull. Each half is held inside its own jaw's measured section whatever the swell asks.
    return (wy, min(wz * (.10 + .90 * _throat), .90 * (_top - palate_line(y))),
            min(wz, .90 * (floor_line(y) - _bot)))


# How much head there is round the mouth line at each station: what the palate and the floor are
# each sized to fill. Cast inwards from outside the animal on the closed intake surface, because a
# nearest-surface probe beside a modelled slit answers about the lumen's own wall rather than the
# skull (`T.mouth_room`), and capped by this builder's own measured section so a cast that stops on
# a fin instead of the cheek can only ever narrow it. Two shells drawn to the lumen alone leave a
# gap either side of them, and a ray into the gape passes between them and hits the inside of the
# far cheek -- the line the sac's stretching wall used to stand across.
_room_cache = {}


def _reach(at, d, limit):
    """`T.mouth_room`'s cast, inwards from outside, but a miss is **nothing** rather than a
    fallback: on a gaping generation a side cast at the mouth line passes under the upper jaw
    and meets no skin at all, and `mouth_room`'s positive fallback read as 0.02 of a body of
    room where there was open water -- which is how Saurichthys' palate came out twice the width
    of its own rostrum."""
    start = at + d * limit
    hit = src_bvh.ray_cast(start, -d, limit)
    return 0. if hit[0] is None else max(0., limit - (hit[0] - start).length)


def _room_at(y, z, flesh_z):
    """(half-width, up, down) about the point (cx, y, z): up and down cast from the line itself,
    the half-width cast **in the jaw's flesh** at `flesh_z`, because at the line a shell sits a
    hair off its jaw's surface in the gape and a side cast there measures the gape, not the jaw.
    Capped by the head's own measured section."""
    k = (round(y, 6), round(z, 6), round(flesh_z, 6))
    if k not in _room_cache:
        _bot, _top = head_z(y)
        L = .30 * RAW_LENGTH
        at, fl = Vector((cx(y), y, z)), Vector((cx(y), y, flesh_z))
        rw = min(_reach(fl, Vector((1., 0., 0.)), L), _reach(fl, Vector((-1., 0., 0.)), L))
        ru = _reach(at, Vector((0., 0., 1.)), L)
        rd = _reach(at, Vector((0., 0., -1.)), L)
        _room_cache[k] = (min(rw, head_half_width(y)), min(ru, max(.002 * RAW_LENGTH, _top - z)),
                          min(rd, max(.002 * RAW_LENGTH, z - _bot)))
    return _room_cache[k]


# **This generation arrived gaping, so each shell is built about its own jaw's edge of the lumen.**
# The mouth line is the mid-height of the modelled cavity, and on a body whose jaws are parted in
# the bind pose that line runs through open water: a palate built about it hung below the underside
# of its own upper jaw, in the gape, and no room measured from mid-gape and held short of the skin
# ever reached the jaw the shell belongs to. The palate is built about the cavity's roof and the
# floor about the cavity's floor -- each nine tenths of the measured slit half-depth off the mouth
# line, held inside the head's own section -- with a room measured from there (`T.oral_shells`
# takes a pair for each). Behind the mouth the slit's last measured depth carries on, which is
# where the two lines meet at the hinge and the shells overlap.
_jaw_face_cache = {}


def jaw_face(y, up):
    """The roof of the mouth (`up`) or the top of the mandible at station y, or None where the
    line has no gape: the **largest empty interval** on the vertical line through the mouth's own
    lateral axis, read from every crossing of the closed intake surface from above the head down.
    Not the first surface above or below the mouth line -- at the tip of the rostrum the cavity's
    median sits inside the lower jaw, and a cast from there found the lower jaw's own top and
    called it the roof."""
    k = round(y, 6)
    if k not in _jaw_face_cache:
        _bot, _top = head_z(y)
        zs, cur = [], Vector((cx(y), y, _top + .05 * RAW_LENGTH))
        for _ in range(14):
            h = src_bvh.ray_cast(cur, Vector((0., 0., -1.)), (_top - _bot) + .10 * RAW_LENGTH)
            if h[0] is None:
                break
            zs.append(float(h[0].z))
            cur = Vector(h[0]) + Vector((0., 0., -1e-5))
        best = None
        for i in range(1, len(zs) - 1, 2):
            gap = zs[i] - zs[i + 1]
            if gap > 1e-6 and (best is None or gap > best[0] - best[1]):
                best = (zs[i], zs[i + 1])
        _jaw_face_cache[k] = best
    g = _jaw_face_cache[k]
    return None if g is None else (g[0] if up else g[1])


# Each line is the cavity's own edge as the percentiles measured it, and never further from the
# jaw's actual surface than 0.0015 of a body: at the tip of a needle rostrum the cavity's measured
# depth collapses to nothing and a line set by it would sit 0.008 below the roof, in the water.
def palate_line(y):
    _bot, _top = head_z(y)
    z = lumen_centre(y) + .9 * mouth_half_depth(y)
    r = jaw_face(y, True)
    if r is not None:
        z = max(z, r - .0015 * RAW_LENGTH)
    return min(z, _top - .004 * RAW_LENGTH)


def floor_line(y):
    _bot, _top = head_z(y)
    z = lumen_centre(y) - .9 * mouth_half_depth(y)
    f = jaw_face(y, False)
    if f is not None:
        z = min(z, f + .0015 * RAW_LENGTH)
    return max(z, _bot + .004 * RAW_LENGTH)


def palate_flesh_z(y):
    _bot, _top = head_z(y)
    r = jaw_face(y, True)
    return (r if r is not None else palate_line(y)) + .30 * (_top - (r if r is not None else palate_line(y)))


def floor_flesh_z(y):
    _bot, _top = head_z(y)
    f = jaw_face(y, False)
    base = f if f is not None else floor_line(y)
    return base - .30 * (base - _bot)


def palate_room(y):
    return _room_at(y, palate_line(y), palate_flesh_z(y))


def floor_room(y):
    return _room_at(y, floor_line(y), floor_flesh_z(y))


def mouth_room(y):
    """The room about the mouth line itself, recorded for the validation table."""
    return _room_at(y, lumen_centre(y), lumen_centre(y))


# **The room is one section per station and a fish's two jaws are not the same shape.** The room's
# half-width is cast at the mouth line, where the cut is, and at that height the mandible is as
# wide as the head because the cut is what makes it so. Below it the mandible of a shark narrows
# to a chin under a broad flat head, so a floor drawn as an ellipse of the cheek's width and the
# chin's depth puts its lower corners out through the sides of the lower jaw -- 360 of the first
# build's 1,344 vertex-directions looked straight out of the animal, nearly all of them the floor's.
# So every shell vertex is seated: pulled towards the mouth's own axis until it is inside the head's
# silhouette, which is asked of the closed intake surface by the one test that cannot clamp and does
# not read a normal -- from the point, rays to either side and up and down must each meet skin. A
# point in the lumen passes (the cavity's own walls are skin); a point beside the jaw does not.
# ...with one exception the first build found. This generation's mouth is modelled *open*, and a
# point in the lumen at the front of the mouth looks straight out through the parted lips to one
# side: the ray meets nothing, though the point is inside the mouth. So a point that the measured
# cavity itself contains passes the lateral test by being in the mouth, which is where a palate
# and a floor belong; the up and down rays are still asked, because they are what catch a floor
# corner standing beside the mandible and a palate corner standing above the skull.
_DIRS = (Vector((1., 0., 0.)), Vector((-1., 0., 0.)), Vector((0., 0., 1.)), Vector((0., 0., -1.)))


def in_measured_lumen(p):
    """In the gape: between the roof of the mouth and the top of the mandible as the casts from
    the axis find them (the cavity's own measured depth where a cast finds nothing), and within
    the half-width of the jaw the point belongs to, measured in that jaw's flesh."""
    y = p[1]
    # The gape runs the length of the cut, not of the cavity's measured stations: on the rostrum
    # the cavity bins end short of the tip while the cut, and the palate behind it, run to it.
    if not (JAW_FRONT - _step <= y <= LIN_BACK + _step):
        return False
    r, f = jaw_face(y, True), jaw_face(y, False)
    top = r if r is not None else seam_z(y) + 1.2 * mouth_half_depth(y)
    bot = f if f is not None else seam_z(y) - 1.2 * mouth_half_depth(y)
    if not (bot - .001 * RAW_LENGTH <= p[2] <= top + .001 * RAW_LENGTH):
        return False
    half = (palate_room(y) if p[2] >= lumen_centre(y) else floor_room(y))[0]
    return abs(p[0] - cx(y)) <= max(half, .5 * mouth_half_width(y))


def silhouette_inside(p):
    """Inside the head, asked of the closed intake surface by rays that cannot clamp.

    Every point must have skin on the side of the mouth line its shell belongs to -- a palate
    point has the skull above it, a floor point the mandible below -- because that is the ray a
    corner standing beside the jaw or above the skull misses. Across the mouth line the rule is
    looser, and only for a point the measured cavity contains: on a gaping generation the
    underside of the palate looks down through the parted jaws at nothing, and a point in the
    lumen at the front looks out sideways through the parted lips. Those are in the mouth."""
    hit = [src_bvh.ray_cast(p, d, .34 * RAW_LENGTH)[0] is not None for d in _DIRS]
    lumen = in_measured_lumen(p)
    lateral = (hit[0] and hit[1]) or lumen
    if p[2] >= lumen_centre(p[1]):
        return hit[2] and lateral and (hit[3] or lumen)
    return hit[3] and lateral and (hit[2] or lumen)


SEATED = {'vertices': 0, 'maxPullRaw': 0.}


def seat_in_head(p, u):
    q = Vector(p)
    if silhouette_inside(q):
        return q
    # Pulled in towards the mouth's own axis at its own height: a corner outside the cheek comes
    # in sideways, and stays with the jaw it belongs to rather than sliding to mid-gape.
    c = Vector((cx(q.y), q.y, min(max(q.z, floor_line(q.y)), palate_line(q.y))))
    for i in range(1, 41):
        q = Vector(p) + (c - Vector(p)) * (i / 40.)
        if silhouette_inside(q):
            break
    SEATED['vertices'] += 1
    SEATED['maxPullRaw'] = max(SEATED['maxPullRaw'], (q - Vector(p)).length)
    return q


# This generation arrived gaping, so the front of the mouth line has no mandible under it: the
# lower jaw's tip, measured off the cut part itself, sits behind the upper arch of the mouth. The
# floor is rigid on that jaw and ends where the jaw does; the palate runs to the mouth's front.
JAW_TIP_Y = float(min(v.co.y for v in AUTH_JAW.data.vertices))
# ...and "where the jaw ends" is asked under the mouth's own axis, not of the jaw's tip: a gaping
# mandible's rami reach the front while its symphysis has swung back, so the first station with
# any floor room under the axis (`mouth_room`'s down reach turns negative where the cast from
# below meets the upper jaw instead) is where the floor may start.
LIN_FRONT_FLOOR = max(LIN_FRONT, JAW_TIP_Y + .006 * RAW_LENGTH)
# Asked with a ray straight down from the axis, not through `mouth_room`: a cast that misses
# returns its *fallback*, a positive number that reads as room where there is open water.
for _y in np.linspace(LIN_FRONT, LIN_BACK, 121):
    _p = Vector((cx(float(_y)), float(_y), floor_line(float(_y)) + .002 * RAW_LENGTH))
    if src_bvh.ray_cast(_p, Vector((0., 0., -1.)), .34 * RAW_LENGTH)[0] is not None:
        LIN_FRONT_FLOOR = max(LIN_FRONT_FLOOR, float(_y))
        break
# **The throat is longer than the kit's default on a mouth this wide.** Behind the hinge the
# palate swells to the head's own section and the floor nests inside it, over `throat` of the
# mouth's length; forward of that the palate is a shallow dome under the roof. With the jaw at
# its widest the mandible swings clear of the corner of the mouth, and a line of sight entering
# under it met nothing until the inside of the far cheek -- every one of Hybodus' 613 failing
# pixels at Bite was one back-facing body surface and nothing else. A bowl over the rear half of
# the mouth is what stands across that line; when the jaw shuts the floor rises into it unseen.
ORAL_THROAT = 0.50
_lining_raw, faces, _lin_palate = T.oral_shells(
    (palate_line, floor_line), lumen_shells, LIN_BACK, LIN_FRONT, rings=LIN_RINGS, ring=LIN_RING,
    axis='y', room=(palate_room, floor_room), fit=seat_in_head, u_front_floor=LIN_FRONT_FLOOR,
    centre=cx, throat=ORAL_THROAT, fill=.97, buried=.92)
verts = list(_lining_raw)
me = bpy.data.meshes.new('Mouth lining')
me.from_pydata([tx(v) for v in verts], [], faces)
me.update()
lining = bpy.data.objects.new('Mouth lining', me)
bpy.context.collection.objects.link(lining)
lining.location = (0, 0, 0)
# Outward, by measurement rather than by winding convention: each shell is a closed solid and a
# closed solid shows its front faces to everything outside it, so the cull cannot open it.
_lbm = bmesh.new()
_lbm.from_mesh(lining.data)
bmesh.ops.recalc_face_normals(_lbm, faces=list(_lbm.faces))
_lbm.to_mesh(lining.data)
_lbm.free()
lining['measuredRoom'] = True
lining.data.materials.clear()
lining.data.materials.append(liningmat)
_luv = lining.data.uv_layers.new(name='UVMap')
for poly in lining.data.polygons:
    for li in poly.loop_indices:
        vi = lining.data.loops[li].vertex_index
        hit = src_bvh.find_nearest(_lining_raw[vi])
        s = hit_uv(hit[0], hit[2]) if hit[0] is not None else None
        _luv.data[li].uv = (s.x, s.y) if s else (0., 0.)
_lcol = lining.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for item in _lcol.data:
    item.color = (1, 1, 1, 1)
# Rigid, one bone each: the palate is the skull's and the floor is the jaw's. There is no blend to
# tune because there is no wall left to stretch -- a palate that took a share of the jaw's rotation
# would be the stretching wall again in the weight field.
for n in ['skull', 'jaw']:
    lining.vertex_groups.new(name=n)
lining.vertex_groups['skull'].add(list(range(_lin_palate)), 1., 'REPLACE')
lining.vertex_groups['jaw'].add(list(range(_lin_palate, len(_lining_raw))), 1., 'REPLACE')
for p in lining.data.polygons:
    p.use_smooth = True
oralparts = [lining]

# **There is no hinge plug on this animal, and the measurements say there should not be.**
#
# The idea was Placodus' hinge envelope: the cut runs right across the cheek, and when the jaw
# swings the two outer surfaces separate, so something has to stand behind the gap. What this
# builder shipped was a uv-sphere scaled to `(1.45 * headHalfWidth, 3.60 * headHalfWidth,
# 1.15 * headDepth)` -- the *along-body* radius given the large factor, where every plug in the kit
# gives it the small one (`(halfWidth * .84, .030, halfDepth * .84)`) -- and "fitted" against a test
# that could not fail: `head_half_width` and `head_z` are `np.interp`, which clamps outside its
# table rather than refusing, so a point a quarter of a body length ahead of the snout was measured
# against the section at the snout tip and passed. The plug reported a clearance of +0.004 while
# standing 1.29 units clear of the nose with 126 of its 207 vertices outside the animal, and it is
# the pale spike and the bloated white shoulder this body shipped with.
#
# Rebuilt honestly -- bisected back to the skin by ray parity against the closed intake surface, or
# against the lining sac where the lumen is -- it does not earn its place. Measured at `Attack@0.43`
# with `tools/triassic/gape-solid.py`:
#
#   giant plug, 126 of 207 vertices outside the animal     1 px seen through the body
#   contained plug, 0.6x the mouth's own length          666 px
#   no plug at all                                       667 px
#
# One pixel. Sized up to 1.8x the mouth's own length a contained plug does close most of it (44 px),
# but only by filling the volume the mandible occupies in the generation's gaping bind pose -- and
# the mandible rises through that volume in every clip, so the plug comes out along the lip and
# under the gills as grey slabs. Weighting its lower half onto `jaw` does not save it: below the cut
# the plug is as wide as the head and the mandible is not, so what swings out is the cheek half
# (117 px and the slabs together). Confined above the cut it is invisible and seals 42 px of 667.
#
# What was actually left at full gape was the cut's own rim, which is one polygon thick and at a
# grazing angle *is* the silhouette -- the fault `T.rim_flange` exists for -- and the open hinge
# cross-section behind the mandible, which `T.cap_cut` closes. Both are imported from the shared
# pipeline above and run on the skull half of both bodies right after the cut. The shipped body
# material is double-sided, so none of it is drawn at runtime; the cull is the worst case a
# single-sided renderer would draw.
hinge_report = {
    'plug': 'none',
    'why': 'the plug this builder shipped was fitted against an np.interp clearance test that '
           'clamps rather than refusing, so it passed while standing 1.29 units clear of the '
           'snout with 126 of its 207 vertices outside the animal; it is the spike and the white '
           'shoulder in the delivered renders.',
    'seenThroughTheBodyAtAttack043': {'giantPlugOutsideTheAnimal': 1, 'containedPlugAt0.6x': 666,
                                      'containedPlugAt1.8x': 44, 'roofOnlyPlug': 625, 'noPlug': 667},
    'whatClosesItInstead': {
        'hingeCapFaces': CAPS, 'rimFoldVertices': RIM, 'rimFoldRaw': round(RIM_FOLD, 5),
        'headSeamsSealed': {k: {'faces': v[0], 'refusedTooWide': v[2]} for k, v in SEAMS.items()},
        'boundaryEdgesLeftOpen': BOUNDARY,
        'note': 'the hinge cross-section is fanned shut with its own cut vertices (T.cap_cut) and '
                'the seam rim is folded in towards the mouth axis (T.rim_flange), running out '
                'before the snout where the two rims meet; the palate then closes the throat '
                'behind both. The shipped body material is double-sided, so none of it is drawn '
                'at runtime.'},
}




# -------------------------------------------------------------- weights ----
AXIAL = [('skull', .145), ('chest', .27), ('body', .46)] + \
        [('tail_%02d' % i, f) for i, f in enumerate(TAIL_F)]
AXIAL_Y = [YLO + f * RAW_LENGTH for _, f in AXIAL]


def axial(y):
    if y <= AXIAL_Y[0]:
        return {AXIAL[0][0]: 1.}
    if y >= AXIAL_Y[-1]:
        return {AXIAL[-1][0]: 1.}
    i = int(np.searchsorted(AXIAL_Y, y)) - 1
    t = (y - AXIAL_Y[i]) / (AXIAL_Y[i + 1] - AXIAL_Y[i])
    return {AXIAL[i][0]: 1 - t, AXIAL[i + 1][0]: t}


# How hard the weights are relaxed over the mesh graph afterwards: each pass replaces a vertex's
# weights with WEIGHT_KEEP of its own and the rest shared equally among its neighbours.
WEIGHT_RELAX, WEIGHT_KEEP = 10, .45
THIN = .030
THIN_BAND = .012
F = lambda f: YLO + f * RAW_LENGTH        # noqa: E731 -- body fraction to station


# Where a fin's blade actually lies, measured off this generation rather than named as a constant.
_FCO = np.array([v.co[:] for v in auth.data.vertices])
_FBLADE = np.asarray(thickness, dtype=float) < THIN + THIN_BAND
_FC = np.interp(_FCO[:, 1], _cy, _cz)


def fin_span(ylo, yhi, up, both=False, lo_q=.25, hi_q=.80, fallback=(.0, 1.)):
    """The two ends of a fin's radial ramp, read off the mesh.

    A constant that suits a shark's dorsal is wrong for a fish's pelvic, and when it is wrong the
    fin owns *no* vertices: the bone still swings, the geometry stays on the body, and the swept
    angle recorded for the joint is about nothing. Here the ramp runs from the quartile of how far
    out that stretch's thin vertices actually lie to the 80th percentile, so most of a blade is at
    full weight and its root is feathered, whatever size the blade is.
    """
    m = _FBLADE & (_FCO[:, 1] > ylo) & (_FCO[:, 1] < yhi)
    if not both:
        m &= (_FCO[:, 2] > _FC) if up else (_FCO[:, 2] < _FC)
    if m.sum() < 40:
        return fallback
    d = np.abs(_FCO[m][:, 2] - _FC[m]) / RAW_LENGTH
    lo, hi = float(np.quantile(d, lo_q)), float(np.quantile(d, hi_q))
    return round(lo, 5), round(max(hi - lo, 1e-4), 5)

CAUDAL_SPAN = fin_span(F(.93), YHI + 1., True, both=True)
fin_span_report = {'caudal': CAUDAL_SPAN}


# Where the generation's thin blades are, station by station: the count of blade vertices above and
# below the measured axis in each twentieth of the body. A fin mask can only find a fin the
# generation modelled, and when a fin bone comes out owning no vertices this is what says which of
# the two happened.
blade_scan = []
for _i in range(20):
    _a = YLO + (_i / 20.) * RAW_LENGTH
    _b = YLO + ((_i + 1) / 20.) * RAW_LENGTH
    _m = _FBLADE & (_FCO[:, 1] >= _a) & (_FCO[:, 1] < _b)
    blade_scan.append({'fromBodyFraction': round(_i / 20., 2),
                       'above': int((_m & (_FCO[:, 2] > _FC)).sum()),
                       'below': int((_m & (_FCO[:, 2] <= _FC)).sum()),
                       'maxOutAbove': round(float(np.max((_FCO[_m & (_FCO[:, 2] > _FC)][:, 2]
                                                          - _FC[_m & (_FCO[:, 2] > _FC)])
                                                         / RAW_LENGTH)), 4)
                       if (_m & (_FCO[:, 2] > _FC)).sum() else 0.,
                       'maxOutBelow': round(float(np.max((_FC[_m & (_FCO[:, 2] <= _FC)]
                                                          - _FCO[_m & (_FCO[:, 2] <= _FC)][:, 2])
                                                         / RAW_LENGTH)), 4)
                       if (_m & (_FCO[:, 2] <= _FC)).sum() else 0.})
print('BLADESCAN', json.dumps(blade_scan))


def window(v, lo, hi, feather):
    """A region boundary that fades instead of stepping.

    Every gate in `fin_weights` used to be a hard `lo < v < hi`. A blade runs past the end of its
    window, so at a fin's distal edge that put `pec_tip: 1.000` on one vertex and pure axial weight
    on the vertex next to it, and `tools/triassic/skin-tears.mjs` read the edge between the two as
    the worst stretch on the body. It is the same window; it has a slope on it now.
    """
    return smooth((v - lo) / feather) * smooth((hi - v) / feather)


def fin_weights(p, thin):
    """Which fin a point belongs to and how strongly it owns it. A fin's root blend is radial and
    runs from inside the trunk outward, so a seated root follows the flank when the body bends.

    Every fin here bids for the point and the strongest bid wins, and every bid is a product of
    slopes rather than of tests: the thinness of the shell, how far out along the blade the point
    is, and how far into the fin's own stretch of the body. Written as `if` gates -- which is how
    it was -- the windows in y cut a blade off square at 1.000, and the vertex on the other side of
    that line kept pure axial weight.
    """
    x, y, z = p
    c = centre(y)
    blade = smooth((THIN + THIN_BAND - thin) / THIN_BAND)
    s = 'L' if x > 0 else 'R'
    d = abs(x) / RAW_LENGTH
    _side, _pts, names = PECTORAL[s]
    if d < .115:
        pec = {names[0]: 1.}
    elif d < .165:
        t = (d - .115) / .050
        pec = {names[0]: 1 - t, names[1]: t}
    else:
        t = min(1., (d - .165) / .050)
        pec = {names[1]: 1 - t, names[2]: t}
    lobe = 'caudal_upper' if z > c else 'caudal_lower'
    # A wide, gentle root blend: narrow, adjacent vertices at the root end up on different
    # bones and the edge between them is torn through the whole stroke.
    bids = [
        (pec, blade * window(y, F(.19), F(.34), .035 * RAW_LENGTH)
         * smooth((d - .040) / .100)
         * smooth(((c - z) / RAW_LENGTH - .002) / .026)),
        ({'pelvic_' + s: 1.}, blade * window(y, F(.46), F(.56), .025 * RAW_LENGTH)
         * smooth(((c - z) / RAW_LENGTH - .050) / .030)
         * smooth((d - .004) / .012)),
        ({'dorsal_1': 1.}, blade * window(y, F(.28), F(.46), .030 * RAW_LENGTH)
         * smooth(((z - c) / RAW_LENGTH - .050) / .030)),
        ({'dorsal_2': 1.}, blade * window(y, F(.48), F(.65), .030 * RAW_LENGTH)
         * smooth(((z - c) / RAW_LENGTH - .050) / .030)),
        # Past the peduncle the thinness rule is the wrong question. A heterocercal tail's long
        # lobe carries the end of the vertebral column and measures as trunk, and gating the lobes
        # on blade thickness left one of the two owning no vertices at all -- so the lobe lag the
        # clips animate drew nothing. Everything behind the peduncle is caudal fin.
        ({lobe: 1.}, smooth((abs(z - c) / RAW_LENGTH - CAUDAL_SPAN[0]) / CAUDAL_SPAN[1])
         * smooth((y - F(.930)) / (.030 * RAW_LENGTH))),
    ]
    chain, bid = max(bids, key=lambda kv: kv[1])
    if bid <= 0:
        return None
    return chain, bid


def jaw_weight_labelled(p):
    """One or zero from the label, feathered over the last ring or two of skin at the boundary so
    the lip is not a step. A tooth is never feathered: it is whole on one bone or the other."""
    if not (JAW_FRONT - .02 * RAW_LENGTH < p[1] < JAW_BACK + .05 * RAW_LENGTH):
        return 0.
    behind = smooth((JAW_BACK - p[1]) / (.030 * RAW_LENGTH))
    return (1. if jaw_side_at(p) else 0.) * behind


def jaw_weight(p):
    x, y, z = p
    if not (JAW_FRONT - .01 * RAW_LENGTH < y < JAW_BACK + .05 * RAW_LENGTH):
        return 0.
    below = smooth((seam_z(y) - z) / (.005 * RAW_LENGTH) + .5)
    behind = smooth((JAW_BACK - y) / (.045 * RAW_LENGTH))
    return below * behind


def weights(p, thin, labelled=False):
    w = dict(axial(p[1]))
    fin = fin_weights(p, thin)
    if fin:
        chain, blend = fin
        if blend > 0:
            w = {n: v * (1 - blend) for n, v in w.items()}
            for n, v in chain.items():
                w[n] = w.get(n, 0.) + v * blend
    # No jaw term. The mandible is a separate rigid object after the cut, so anything left on this
    # body belongs to the skull -- and giving part of it to the jaw tears every edge that crosses
    # the label boundary, because the label is binary and the two ends of such an edge then follow
    # two bones through the whole gape. That was the worst tear on this animal at 76.8x, on the
    # skin either side of the lip, and it is gone rather than reduced.
    _ = labelled
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    total = sum(v for _, v in items)
    return {n: v / total for n, v in items}


# -------------------------------------------------------------- armature ----
arm = bpy.data.armatures.new('Hybodus shared skeleton')
rig = bpy.data.objects.new('Hybodus_Rig', arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for n, (p, parent) in B.items():
    eb = arm.edit_bones.new(n)
    eb.head = tx(p)
    eb.tail = eb.head + Vector((0, .16, 0))
    if parent:
        eb.parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')

weight_report = {}
# The cut jaw shells are skinned into the head (`T.jaw_junction`); everything else by the measurement.
JUNCTION = {}
for o, thin in [(auth, thickness), (puppet, puppet_thickness)]:
    for n in B:
        o.vertex_groups.new(name=n)
    # Weights are assigned from a formula and then *relaxed over the mesh's own graph*. The formula
    # reads a measured shell thickness, and that measurement is noisy at a fin's base: two vertices
    # a hundredth of a unit apart can land either side of the blade mask and then follow different
    # bones for the length of a clip. Averaging each vertex's weights with its neighbours' cannot
    # invent an influence that was not already next to it -- it removes the step instead of moving
    # it -- and it is what takes the worst edge stretch on this body from tens of times rest length
    # down to a few. Run after the feathering, not instead of it: feathering fixes the windows the
    # formula draws and this fixes what the measurement does inside them.
    raw = [weights(v.co, float(thin[v.index]), o is auth) for v in o.data.vertices]
    nbr = [[] for _ in o.data.vertices]
    for e in o.data.edges:
        a, b = e.vertices
        nbr[a].append(b)
        nbr[b].append(a)
    for _ in range(WEIGHT_RELAX):
        nxt = []
        for i, w in enumerate(raw):
            acc = {n: v * WEIGHT_KEEP for n, v in w.items()}
            share = (1. - WEIGHT_KEEP) / max(1, len(nbr[i]))
            for j in nbr[i]:
                for n, v in raw[j].items():
                    acc[n] = acc.get(n, 0.) + v * share
            nxt.append(acc)
        raw = nxt
    relaxed = []
    for v in o.data.vertices:
        w = {n: x for n, x in sorted(raw[v.index].items(), key=lambda kv: -kv[1])[:4] if x > 1e-5}
        total = sum(w.values())
        relaxed.append({n: x / total for n, x in w.items()})
    # The mandible is skinned *into* the head rather than rigid against it: one field over both
    # parts, the throat under the hinge following the jaw and the shell ramping to full jaw over
    # `band` from the cut rim, so the two copies of every rim vertex carry the same weights and the
    # cut cannot open (`T.jaw_junction`; `tools/triassic/lag.mjs` measures the seam it closes).
    # The rear rim here is not a plane on the authored body -- the mandible is labelled by the
    # surface each vertex grows from, and the label window runs 0.04 of a body *behind* the hinge --
    # so the rim is every shared vertex from a hair ahead of the hinge back that the seam cut did
    # not make. Not the rear *half*: the label boundary also leaves the seam round the roots of the
    # interlocking teeth, forward of the hinge, and shared vertices there taken for the junction
    # pinned Saurichthys' mandible to its upper tooth row at 5.6x. Those, and the front label
    # boundary at the snout tip, part by design like the mouth line.
    shell = AUTH_JAW if o is auth else PUP_JAW
    for n in B:
        shell.vertex_groups.new(name=n)
    body_w, shell_w, JUNCTION[o.name] = T.jaw_junction(
        o, shell, relaxed, B['jaw'][0],
        rear=lambda p: p[1] >= JAW_BACK - .01 * RAW_LENGTH and not _on_seam(p),
        upper_jaw=lambda p: p[1] < JAW_BACK and p[2] >= seam_z(p[1]) - 1e-6, axis=(0., -1., 0.),
        band=.015 * RAW_LENGTH, back=.06 * RAW_LENGTH)
    influences, owners = [], {}
    for part, field in ((o, body_w), (shell, shell_w)):
        for v in part.data.vertices:
            w = field[v.index]
            influences.append(len(w))
            for n, value in w.items():
                part.vertex_groups[n].add([v.index], value, 'REPLACE')
                if part is o:
                    owners[n] = owners.get(n, 0) + 1
        for v in part.data.vertices:
            v.co = tx(v.co)
        for p in part.data.polygons:
            p.use_smooth = True
        mod = part.modifiers.new('Shared articulated skeleton' if part is o else 'Mandible into the head', 'ARMATURE')
        mod.object = rig
        part.parent = rig
    weight_report[o.name] = {'maxInfluences': max(influences), 'vertices': len(influences),
                             'verticesPerBone': owners, 'jawJunction': JUNCTION[o.name]}
for o in oralparts:
    o.parent = rig
    o.modifiers.new('Mouth lining', 'ARMATURE').object = rig

# The shells must be inside the head they line. `depth_inside` cannot say so on a body with a
# modelled mouth -- a point in the lumen is outside the solid by construction, and reads as a
# failure -- and a clearance read off `head_z`/`head_half_width` is an `np.interp` table, which
# clamps rather than refusing outside its stations. So two things are measured. The table clearance
# is recorded (the shells are held inside `fill` of the measured room by construction, so it is
# positive by design rather than by luck). What is *asserted* is a cast that cannot clamp: from
# every shell vertex, rays to either side and up and down must each meet the closed intake surface
# within a third of a body -- a vertex outside the head's silhouette has at least one open
# direction, and a vertex in the lumen has none.
_clear = []
_open_directions = 0
_open_report = []
for v in lining.data.vertices:
    p = Vector([float(c) / SCALE for c in v.co])
    bot, top = head_z(p.y)
    _clear.append(min(head_half_width(p.y) - abs(p.x - cx(p.y)), p.z - bot, top - p.z))
    if not silhouette_inside(p):
        _open_directions += 1
        for d in _DIRS:
            _jn = np.array([w.co[:] for w in AUTH_JAW.data.vertices if abs(w.co.y - p.y) < .004 * RAW_LENGTH]).reshape(-1, 3)
            _jn_mid = _jn[np.abs(_jn[:, 0]) < .01 * RAW_LENGTH] if len(_jn) else _jn
            _down = []
            _cur = Vector(p)
            for _ in range(12):
                _h = src_bvh.ray_cast(_cur, Vector((0., 0., -1.)), .5 * RAW_LENGTH)
                if _h[0] is None:
                    break
                _down.append(round(float(_h[0].z), 4))
                _cur = Vector(_h[0]) + Vector((0., 0., -1e-5))
            _hits = {}
            for dd in _DIRS:
                _h = src_bvh.ray_cast(p, dd, .34 * RAW_LENGTH)
                _hits[str(tuple(dd))] = None if _h[0] is None else [round(float(c), 4) for c in _h[0]] + [round(float(_h[3]), 4)]
            _open_report.append({'vertex': v.index, 'shell': 'palate' if v.index < _lin_palate else 'floor',
                                 'hits': _hits, 'room': [round(float(r), 4) for r in mouth_room(p.y)],
                                 'jawVertsNearY': len(_jn),
                                 'jawX': None if not len(_jn) else [round(float(_jn[:, 0].min()), 4), round(float(_jn[:, 0].max()), 4)],
                                 'jawZ': None if not len(_jn) else [round(float(_jn[:, 2].min()), 4), round(float(_jn[:, 2].max()), 4)],
                                 'jawZatMid': None if not len(_jn_mid) else [round(float(_jn_mid[:, 2].min()), 4), round(float(_jn_mid[:, 2].max()), 4)],
                                 'downCrossings': _down,
                                 'seam': round(seam_z(p.y), 4), 'floorFront': round(LIN_FRONT_FLOOR, 4), 'jawTip': round(JAW_TIP_Y, 4),
                                 'raw': [round(float(c), 5) for c in p], 'direction': list(d),
                                 'u': round((p.y - LIN_BACK) / (LIN_FRONT - LIN_BACK), 4),
                                 'tableClearance': round(_clear[-1], 5),
                                 'axis': [0., round(p.y, 5), round(lumen_centre(p.y), 5)],
                                 'headZ': [round(bot, 5), round(top, 5)], 'headHalfWidth': round(head_half_width(p.y), 5)})
lining_clearance = float(min(_clear))
print('ORAL_OPEN ' + json.dumps(_open_report))
assert _open_directions == 0, ('an oral shell vertex is outside the head', _open_directions)
assert lining_clearance > 0., ('the oral shells break the measured head section', lining_clearance)

AUTH_GROUP = [auth, AUTH_JAW]
PUP_GROUP = [puppet, PUP_JAW]

# The left-right asymmetry of the paired fins, two ways. The rig's own joints are mirrored by
# construction except where `seat()` pulls a root in by a different amount on each side, so the
# first number is small and is the one a `Neutral` clip would have to correct; the second is the
# generation's own asymmetry, measured by mirroring the intake surface in x and asking every
# paired-fin vertex how far it is from its reflection, and no rig can correct that.
_mirror_pairs = []
for _s, (_side, _pts, _names) in PECTORAL.items():
    if _side > 0:
        for _i, _n in enumerate(_names):
            _mirror_pairs.append((_n, _names[_i].replace('_L', '_R')))
for _s, (_side, _names, _proot) in PELVIC.items():
    if _side > 0:
        _mirror_pairs.append((_names[0], _names[0].replace('_L', '_R')))
_joint_gap = []
for _a, _b in _mirror_pairs:
    _pa = Vector(B[_a][0])
    _pb = Vector(B[_b][0])
    _joint_gap.append((Vector((-_pb.x, _pb.y, _pb.z)) - _pa).length)
_mirror_bvh = BVHTree.FromPolygons([Vector((-v.co.x, v.co.y, v.co.z)) for v in intake_mesh.vertices],
                                   [p.vertices[:] for p in intake_mesh.polygons], all_triangles=False)
_fin_verts = [v.co for v in intake_mesh.vertices
              if fin_weights(v.co, float(thick_intake[v.index])) is not None]
_surface_gap = [_mirror_bvh.find_nearest(q)[3] for q in _fin_verts]
PAIRED_FIN_ASYMMETRY = {
    'jointPairs': len(_joint_gap),
    'meanJointGapRaw': round(float(np.mean(_joint_gap)), 5),
    'meanJointGapOverBodyLength': round(float(np.mean(_joint_gap)) / RAW_LENGTH, 5),
    'maxJointGapOverBodyLength': round(float(np.max(_joint_gap)) / RAW_LENGTH, 5),
    'finVerticesMeasured': len(_fin_verts),
    'meanMirroredSurfaceGapOverBodyLength': round(float(np.mean(_surface_gap)) / RAW_LENGTH, 5),
    'p95MirroredSurfaceGapOverBodyLength': round(float(np.quantile(_surface_gap, .95)) / RAW_LENGTH, 5),
}

# ------------------------------------------------ measured paired profile ----
def merged(group):
    pts, polys, base = [], [], 0
    for o in group:
        pts += [v.co.copy() for v in o.data.vertices]
        polys += [tuple(base + j for j in p.vertices) for p in o.data.polygons]
        base += len(o.data.vertices)
    return pts, polys


def section(group, y):
    points = []
    for o in group:
        for e in o.data.edges:
            a, b = [o.data.vertices[j].co for j in e.vertices]
            if (a.y - y) * (b.y - y) <= 0 and abs(a.y - b.y) > 1e-8:
                points.append(a + (b - a) * ((y - a.y) / (b.y - a.y)))
    if not points:
        return None
    arr = np.array(points)
    return {'min': arr.min(0).tolist(), 'max': arr.max(0).tolist()}


_ylo = min(min(v.co.y for v in o.data.vertices) for o in AUTH_GROUP)
_yhi = max(max(v.co.y for v in o.data.vertices) for o in AUTH_GROUP)
profile, worst = [], 0.
for y in np.linspace(_ylo + .02, _yhi - .02, 21):
    row = {'stationY': float(y)}
    for label, group in [('authored', AUTH_GROUP), ('twin', PUP_GROUP)]:
        row[label] = section(group, float(y))
    if row['authored'] and row['twin']:
        row['maximumEnvelopeDifference'] = max(abs(a - b) for k in ['min', 'max']
                                               for a, b in zip(row['authored'][k], row['twin'][k]))
        worst = max(worst, row['maximumEnvelopeDifference'])
        assert row['maximumEnvelopeDifference'] < ENVELOPE_TOLERANCE, row
    profile.append(row)
_pv = BVHTree.FromPolygons(*merged(PUP_GROUP))
_apts = merged(AUTH_GROUP)[0]
distances = [_pv.find_nearest(v)[3] for v in _apts]
_far = sorted(zip(distances, [tuple(round(float(c), 3) for c in v) for v in _apts]), reverse=True)[:8]
farthest_from_the_twin = [[round(a, 4), list(b)] for a, b in _far]
# The envelope is the pipeline's tolerance and is asserted at 4 % of body length. The nearest-
# surface distance is recorded beside it: its 95th percentile is held to the same 4 %, and the
# single worst vertex to twice that, because the twin resurfaces an occupancy field and an open
# mouth's interior is thinner than the voxel that has to hold it.
_p95 = float(np.quantile(distances, .95))
assert _p95 < ENVELOPE_TOLERANCE, ('twin surface p95', _p95)
assert max(distances) < 2 * ENVELOPE_TOLERANCE, ('twin surface max', max(distances))

# ------------------------------------------------------------ anchors ----
_MOUTH_FRONT = MOUTH_Y[0] + .004 * RAW_LENGTH
_THROAT = MOUTH_Y[1] - .010 * RAW_LENGTH
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (0., _MOUTH_FRONT, seam_z(_MOUTH_FRONT) - .004 * RAW_LENGTH), 'mouth'),
    'anchor_mouth_inside': ('skull', (0., _THROAT, seam_z(_THROAT) + .002 * RAW_LENGTH), 'swallow'),
    'anchor_attack_primary': ('skull', (0., _MOUTH_FRONT, seam_z(_MOUTH_FRONT) + .004 * RAW_LENGTH), 'attack'),
}
anchors = [{'name': name, 'bone': b, 'point': list(tx(p)), 'role': role}
           for name, (b, p, role) in ANCHOR_POINTS.items()]
anchor_checks = {}
for name, (b, p, role) in ANCHOR_POINTS.items():
    hit = src_bvh.find_nearest(Vector(p))
    anchor_checks[name] = {'nearestSurfaceRaw': round(float(hit[3]), 5),
                           'nearestSurfaceUnits': round(float(hit[3] * SCALE), 5),
                           'fractionOfBodyLength': round(float(hit[3] * SCALE / BODY_LENGTH), 5)}
    assert hit[3] * SCALE < ANCHOR_TOLERANCE, (name, hit[3])

# ---------------------------------------------------------- performance ----
scene = bpy.context.scene
scene.render.fps = 30
rig.animation_data_create()
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'


def reset():
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


# Carangiform undulation: one travelling wave down the axial chain whose amplitude grows towards the
# tail and whose head is the quiet end. A shark's paired fins are control surfaces -- they set pitch
# and roll, they bank the turns and they brace -- and they never take a stroke.
TAIL_GAIN = [.24, .36, .52, .70, .88, 1.0, 1.0]
TAIL_LAG = [.45, .82, 1.18, 1.54, 1.90, 2.25, 2.55]


def bump(u, u0, w, sharp=1.):
    """A beat that starts and ends at rest, narrowed in place by `sharp`. This is what makes a
    strike read as committed rather than as a swell: a sine spends its whole length arriving."""
    if not (u0 <= u <= u0 + w):
        return 0.
    return (sin(pi * (u - u0) / w) ** 2) ** sharp


FIN_ROOTS = [names[0] for _s, (_side, _pts, names) in PECTORAL.items()] + \
            [names[0] for _s, (_side, names, _r) in PELVIC.items()]
fin_sweep = {n: 0. for n in FIN_ROOTS}
_fin_prev = None
JAW_SHUT = -math.radians(RESTING_GAPE['closingRotationDegrees'])
seams, bounds = {}, {}
for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    first = None
    loop = clip in LOOPS
    for f in range(last + 1):
        reset()
        u = f / last
        p = 2 * pi * u
        e = sin(pi * u) ** 2
        env = 1 if loop else e
        pb = rig.pose.bones

        def wave(lag=0., freq=1.):
            return (sin(p * freq - lag) - sin(-lag)) * env

        amp = {'Idle': .28, 'Swim': 1.0, 'Sprint': 1.6, 'Eat': .30, 'Guard': .20, 'Dodge': 1.1,
               'Ability': .26, 'Grab': .28, 'Breath': .34, 'Growth': .22, 'Shake': .40,
               'SpineBrace': .18}.get(clip, .28)
        beat = 2. if clip in ('Swim', 'Sprint', 'Dodge') else 1.
        # Anticipation, a fast committed strike, follow-through and recovery -- four beats, not one
        # sine. `wind` is the coil, `peak` the drive, `after` the follow-through.
        wind = bump(u, .00, .34, 1.4)
        peak = bump(u, .30, .26, 2.2)
        after = bump(u, .52, .30, 1.1)
        dead = u * u * (3 - 2 * u) if clip == 'Death' else 0.
        shake = max(0., sin(p * 3)) ** 2 if clip in ('Shake', 'Grab', 'Ability') else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws. The gape is timed to the strike rather than to the button: it parts on the
        # cock, is widest as the body unrolls, and shuts on the follow-through, which is the frame
        # the prey is in.
        opening = .010 * (1 - cos(p)) if loop else 0.
        if clip == 'Eat':
            opening = .42 * (1 - cos(p * 2)) / 2 + .14
        if clip == 'Bite':
            opening = .86 * bump(u, .0, .72, 1.6)
        if clip == 'Attack':
            opening = .34 * wind + .80 * peak - .14 * after
        if clip == 'Heavy':
            opening = .40 * wind + .92 * peak - .16 * after
        if clip == 'Ability':
            opening = .22 * wind + .34 * e
        if clip == 'Grab':
            opening = .44 * env + .08 * shake
        if clip == 'Shake':
            opening = .50 * env + .06 * shake
        if clip == 'Breath':
            opening = .05 * (1 - cos(p))       # gill ventilation, not a breath: this animal has gills
        if clip == 'SpineBrace':
            opening = .03 * (1 - cos(p))
        # The generation's parted jaw is a pose, not the animal: the mouth is shut for everything
        # that is not a strike, and a strike opens from shut. `JAW_SHUT` is the measured rotation
        # that brings the two lips together, released as the clip opens so the gape at the peak is
        # the gape that was authored rather than that gape minus the parting.
        opening = max(0., opening)
        _o = min(1., opening / .60)
        opening = JAW_SHUT * (1 - _o) + opening + .12 * dead
        pb['jaw'].rotation_euler.x = opening
        pb['skull'].rotation_euler.x = -.10 * opening

        # --- trunk
        body = pb['body']
        sway = .013 * amp * wave(0., beat)
        body.rotation_euler.z = sway
        body.rotation_euler.y = .05 * amp * wave(.4, beat)
        body.location.z = .010 * amp * wave(.3, beat)
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        body.rotation_euler.z += .20 * turn
        body.rotation_euler.y += .38 * turn                 # a shark banks into its turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .26 * e
        if clip in ('Attack', 'Heavy'):
            # The lunge: gather, drive forward hard, overshoot, gather back.
            drive = 1.0 if clip == 'Attack' else 1.25
            body.location.y = (.14 * wind - .46 * peak - .10 * after) * drive
            body.rotation_euler.x = .09 * wind - .07 * peak + .03 * after
            body.rotation_euler.y = (-.10 * wind + .16 * peak) * (1 if clip == 'Heavy' else .4)
        if clip == 'Bite':
            body.location.y = -.10 * e
        if clip == 'Parry':
            body.rotation_euler.y = -.34 * e
            body.rotation_euler.z = .18 * e
        if clip == 'Guard':
            body.rotation_euler.x = .05 * (1 - cos(p))
            body.rotation_euler.y = .04 * sin(p)
        if clip == 'SpineBrace':
            # Blocking sets the dorsal spines: the back arches up under them and the animal holds.
            body.rotation_euler.x = -.12 * (1 - cos(p)) / 2 - .06
            body.location.z = .05 * (1 - cos(p)) / 2
        if clip == 'Dodge':
            body.rotation_euler.y = .55 * e
            body.rotation_euler.z = -.42 * e
            body.location.x = .32 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .20 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .26 * e
            body.location.y = .12 * e
        if clip == 'Breath':
            body.rotation_euler.x = -.08 * e
            body.location.z = .05 * e
        if clip == 'Shake':
            # The shark's own move: clamp, roll the trunk hard one way and the other, and worry the
            # hold loose. The roll is the read, and the head leads it.
            body.rotation_euler.y = .70 * env * sin(p * 3)
            body.location.y = -.14 * env
        if clip == 'Ability':
            body.rotation_euler.x = -.10 * e
            body.location.z = .04 * e
        if clip == 'Grab':
            body.location.y = -.14 * env - .04 * shake
            body.rotation_euler.y = .16 * env * sin(p * 3)
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .05 * e
        body.rotation_euler.y += 2.55 * dead               # a dead shark rolls over and goes down
        body.rotation_euler.x += .14 * dead
        body.location.z -= .22 * dead

        # `body` is the pivot of the wave, so its own sway has to be taken back out by the two bones
        # in front of it or the snout swings further than the tail does.
        pb['chest'].rotation_euler.z = -2.6 * sway + .09 * turn
        pb['chest'].rotation_euler.y = .10 * turn
        pb['skull'].rotation_euler.z = .9 * sway + .13 * turn
        if clip in ('Attack', 'Heavy'):
            pb['skull'].rotation_euler.x += -.08 * wind + .14 * peak
            pb['skull'].rotation_euler.z += .06 * wind
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .10 * sin(p * 2)
        if clip == 'Shake':
            pb['skull'].rotation_euler.z += .34 * env * sin(p * 3 + .6)
            pb['chest'].rotation_euler.y += .30 * env * sin(p * 3 + .3)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .10 * shake

        for i in range(7):
            q = pb['tail_%02d' % i]
            q.rotation_euler.z = (.145 * TAIL_GAIN[i] * amp * wave(TAIL_LAG[i], beat)
                                  + turn * (.020 + i * .010)
                                  + .050 * dead * sin(i * .7))
            if clip == 'Dodge':
                q.rotation_euler.z += .16 * e * sin(i * .6 + .5)
            if clip in ('Attack', 'Heavy'):
                # The fast-start: the tail cocks into a C and unloads into the lunge.
                q.rotation_euler.z += (.13 * wind - .17 * peak) * TAIL_GAIN[i]
            if clip == 'Shake':
                q.rotation_euler.y += .18 * env * sin(p * 3 - .4 - i * .18)
        for lobe, sign in (('caudal_upper', 1.), ('caudal_lower', -1.)):
            q = pb[lobe]
            q.rotation_euler.z = .24 * amp * wave(TAIL_LAG[6] + 1.25, beat) + .020 * turn
            q.rotation_euler.x = sign * .07 * amp * wave(TAIL_LAG[6] + 1.55, beat)
            q.rotation_euler.z += .07 * dead * sign

        for d, gain in (('dorsal_1', 1.), ('dorsal_2', .8)):
            q = pb[d]
            q.rotation_euler.z = gain * (.05 * amp * wave(1.0 if d == 'dorsal_1' else 1.3, beat) + .08 * turn)
            q.rotation_euler.y = -.10 * turn * gain
            if clip == 'SpineBrace':
                # The spines come up: both dorsals pitch forward and stiffen.
                q.rotation_euler.x = -.30 * (1 - cos(p)) / 2 * gain

        # The paired fins work the dash rather than hanging off it. A shark's or a fish's pectorals
        # are control surfaces and take no propulsive stroke, but at sprint they are not passengers
        # either: they sweep with the beat and trim the body through it. The swept angle per cycle
        # is measured below and recorded.
        dash = 1. if clip == 'Sprint' else (.45 if clip == 'Swim' else 0.)
        for s, (side, _pts, names) in PECTORAL.items():
            up = pb[names[0]]
            up.rotation_euler.x += dash * .26 * sin(p * beat + .5)
            up.rotation_euler.z += dash * side * .17 * sin(p * beat + 1.1)
            up.rotation_euler.x = .035 * amp * wave(.9, beat)
            up.rotation_euler.z = side * .04 * amp * wave(1.2, beat)
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .36 * e
            if clip in ('TurnLeft', 'TurnRight'):
                up.rotation_euler.x += side * (-1 if clip == 'TurnLeft' else 1) * .42 * e
            if clip == 'Guard':
                up.rotation_euler.x -= .26 * (1 - cos(p)) / 2
                up.rotation_euler.z += side * .16 * (1 - cos(p)) / 2
            if clip == 'SpineBrace':
                up.rotation_euler.x -= .34 * (1 - cos(p)) / 2
                up.rotation_euler.z += side * .22 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += side * .34 * e
            if clip == 'Dodge':
                up.rotation_euler.x += (.44 if side > 0 else -.16) * e
            if clip in ('Attack', 'Heavy', 'Bite'):
                up.rotation_euler.x += .26 * wind - .34 * peak
            if clip in ('Ability', 'Grab', 'Shake'):
                up.rotation_euler.x += .24 * e + .08 * shake
                up.rotation_euler.z += side * .12 * e
            if clip == 'Stagger':
                up.rotation_euler.z += side * .30 * e * sin(p)
            if clip == 'Growth':
                up.rotation_euler.z += side * .26 * e
            if clip == 'Breath':
                up.rotation_euler.x += .14 * e
            up.rotation_euler.x += .30 * dead
            up.rotation_euler.z += side * .34 * dead
            pb[names[1]].rotation_euler.x = .55 * up.rotation_euler.x + .03 * amp * wave(1.5, beat)
            pb[names[2]].rotation_euler.x = .35 * up.rotation_euler.x + .05 * amp * wave(1.9, beat)
            pb[names[2]].rotation_euler.z = side * .04 * amp * wave(2.1, beat)
        for s, (side, names, _proot) in PELVIC.items():
            q = pb[names[0]]
            q.rotation_euler.x += dash * .18 * sin(p * beat + 1.6)
            q.rotation_euler.z += dash * side * .12 * sin(p * beat + 2.0)
            q.rotation_euler.x = .05 * amp * wave(1.6, beat) + .18 * dead
            q.rotation_euler.z = side * (.05 * amp * wave(1.8, beat) + .10 * turn + .22 * dead)

        if clip == 'Sprint':
            _row = {n: tuple(pb[n].rotation_euler) for n in FIN_ROOTS}
            if _fin_prev is not None:
                for n in FIN_ROOTS:
                    fin_sweep[n] += float(np.abs(np.array(_row[n]) - np.array(_fin_prev[n])).sum())
            _fin_prev = _row
        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
        for q in pb:
            if q.name != 'root':
                q.keyframe_insert('rotation_euler', frame=f)
            if q.name == 'body':
                q.keyframe_insert('location', frame=f)
    points = []
    for f in np.linspace(0, last, 13):
        scene.frame_set(int(f))
        dg = bpy.context.evaluated_depsgraph_get()
        for o in AUTH_GROUP + PUP_GROUP + oralparts:
            ev = o.evaluated_get(dg)
            mesh_eval = ev.to_mesh()
            co = np.array([v.co[:] for v in mesh_eval.vertices])
            assert np.isfinite(co).all()
            points.extend([co.min(0), co.max(0)])
            ev.to_mesh_clear()
    bounds[clip] = [np.array(points).min(0).tolist(), np.array(points).max(0).tolist()]
    rig.animation_data.action = None

for c in LOOPS:
    assert seams[c] < 1e-6, (c, seams[c])
assert abs(CLIPS['Grab'] - 1.1) < 1e-9 and .9 <= CLIPS['Grab'] <= 1.2
reset()
scene.frame_set(0)

# ------------------------------------- what closing the generation's parted jaw costs ----
# Teeth modelled apart interpenetrate the first time they are brought together, and the honest
# thing is to measure it rather than to leave the jaw where the generation left it. The jaw is
# posed at the measured closing rotation and every vertex of the mandible is asked how far inside
# the skull's own surface it now sits.
reset()
rig.pose.bones['jaw'].rotation_euler.x = JAW_SHUT
bpy.context.view_layer.update()
_dg = bpy.context.evaluated_depsgraph_get()
_skull_eval = auth.evaluated_get(_dg)
_skull_mesh = _skull_eval.to_mesh()
_skull_bvh = BVHTree.FromPolygons([v.co.copy() for v in _skull_mesh.vertices],
                                  [pp.vertices[:] for pp in _skull_mesh.polygons], all_triangles=False)
_skull_eval.to_mesh_clear()
_jaw_eval = AUTH_JAW.evaluated_get(_dg)
_jaw_mesh = _jaw_eval.to_mesh()
_pen = []
for v in _jaw_mesh.vertices:
    loc, nor, idx, dist = _skull_bvh.find_nearest(v.co)
    if loc is None:
        continue
    _pen.append(dist if (Vector(v.co[:]) - loc).dot(nor) < 0 else 0.)
_jaw_eval.to_mesh_clear()
reset()
bpy.context.view_layer.update()
jaw_closed_cost = {
    'closingRotationDegrees': RESTING_GAPE['closingRotationDegrees'],
    'mandibleVerticesMeasured': len(_pen),
    'verticesInsideTheSkullSurface': int(sum(1 for d in _pen if d > 1e-4)),
    'maxPenetrationUnits': round(float(max(_pen)) if _pen else 0., 5),
    'maxPenetrationOverBodyLength': round((float(max(_pen)) if _pen else 0.) / BODY_LENGTH, 5),
    'meanPenetrationOverBodyLength': round((float(np.mean(_pen)) if _pen else 0.) / BODY_LENGTH, 6),
    'note': 'the mandible posed at the measured closing rotation, against the skull\'s own surface '
            'in the same pose. Anything above zero is the generation\'s two tooth rows, modelled '
            'apart, meeting for the first time.',
}

# ------------------------------------------------------------- sockets ----
sockets = []
for a in anchors:
    o = bpy.data.objects.new(a['name'], None)
    bpy.context.collection.objects.link(o)
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = a['bone']
    o.matrix_world.translation = Vector(a['point'])
    o['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}
    sockets.append(o)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2) + '\n')

# -------------------------------------------------------------- export ----
kwargs = dict(export_format='GLB', use_selection=True, export_animations=True,
              export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_range=False,
              export_skins=True, export_normals=True, export_texcoords=True, export_materials='EXPORT',
              export_vertex_color='NAME', export_vertex_color_name='Color', export_yup=True,
              export_extras=True)


def patch(path):
    """Reparent the anchor nodes onto their bones in the bone's own frame, and drop the channels no
    shipped body carries: root motion and scale."""
    raw = open(path, 'rb').read()
    n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n])
    binary = raw[20 + n:]
    nodes = g['nodes']
    parents = {c: i for i, no in enumerate(nodes) for c in no.get('children', [])}

    def world(i):
        no = nodes[i]
        q = no.get('rotation', [0, 0, 0, 1])
        m = (Matrix(np.array(no['matrix']).reshape(4, 4).T.tolist()) if 'matrix' in no
             else Matrix.LocRotScale(Vector(no.get('translation', [0, 0, 0])),
                                     Quaternion((q[3], q[0], q[1], q[2])),
                                     Vector(no.get('scale', [1, 1, 1]))))
        return world(parents[i]) @ m if i in parents else m

    for a in anchors:
        i = next(k for k, no in enumerate(nodes) if no.get('name') == a['name'])
        b = next(k for k, no in enumerate(nodes) if no.get('name') == a['bone'])
        pt = a['point']
        pt = Vector((pt[0], pt[2], -pt[1]))
        local = world(b).inverted() @ pt
        if i in parents:
            nodes[parents[i]]['children'].remove(i)
        nodes[b].setdefault('children', []).append(i)
        nodes[i] = {'name': a['name'], 'translation': list(local),
                    'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'], 'parentBone': a['bone']}}}
    for a in g['animations']:
        a['channels'] = [c for c in a['channels']
                         if c['target']['path'] != 'scale' and nodes[c['target']['node']].get('name') != 'root']
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)   # noqa: E731
for group, suffix in [(AUTH_GROUP, ''), (PUP_GROUP, '.puppet')]:
    bpy.ops.object.select_all(action='DESELECT')
    for part in group + [rig] + sockets + oralparts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, ID + suffix + '.glb'), **kwargs)
    patch(os.path.join(OUT, ID + suffix + '.glb'))
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)

meta = {
    'id': ID, 'name': 'Hybodus', 'species': 'Hybodus sp.',
    'provenance': 'Middle Triassic · Muschelkalk, Germanic Basin',
    'description': 'Hybodont shark with two spined dorsal fins and a heterocercal tail. The worked '
                   'Tripo body and a measured procedural volume twin share one armature, one set of '
                   'inverse binds, one set of sockets and one set of actions.',
    'modelLength': round(BODY_LENGTH, 4), 'lengthMeters': 2, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/hybodus.png',
                'tools/triassic/creatures/hybodus/hybodus.preview.glb',
                'tools/triassic/creatures/hybodus/tripo-raw/hybodus.raw.glb'],
    'notes': [
        'The generation is folded into an S with its tail a quarter of a body out of the midline. '
        'Intake measures the animal\'s own centreline off the surface and carries every section '
        'rigidly onto a straight axis, with the roll read off the countershading: nothing is '
        'stretched, sheared or thinned, and the head is carried by one rigid transform.',
        'An obligate swimmer: the performance is carangiform body-caudal undulation with the paired '
        'fins as control surfaces. Nothing rows, walks, hauls out or surfaces.',
        'The lower jaw is cut out of the generation\'s own skin along its own measured mouth line, '
        'which is a curve rather than a ramp. The teeth are the generation\'s and are not replaced.',
        'The only authored surface is the oral lining: one skinned sac that closes the gape, taking '
        'its UVs from the skin around it and wearing the body\'s own albedo.',
        'The twin resurfaces a voxel occupancy field of the authored body, relaxes it and reduces '
        'the new topology. It reuses no source vertex or face.',
        'Breath is gill ventilation held in place, not a surface breath: this animal has gills and '
        'never goes up. SpineBrace is the roster\'s spine brace and Shake is the shark\'s '
        'roll-and-shake on a held prey.',
        'Living colours, soft tissue and movement are artistic reconstruction. Travel and grip '
        'rules remain engine-owned.'],
}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2) + '\n')

profile_report = {
    'method': '21 exact plane-intersection envelopes of both actual meshes (body and lower jaw '
              'together); %.4f raw-space voxel occupancy resurfacing, relaxed and reduced' % VOXEL,
    'bodyLength': BODY_LENGTH,
    'envelopeTolerance': ENVELOPE_TOLERANCE,
    'envelopeToleranceFractionOfBodyLength': ENVELOPE_TOLERANCE_FRACTION,
    'maximumEnvelopeDifference': worst,
    'maximumEnvelopeDifferenceFractionOfBodyLength': worst / BODY_LENGTH,
    'surfaceDistanceMax': float(max(distances)),
    'surfaceDistanceMaxFractionOfBodyLength': float(max(distances)) / BODY_LENGTH,
    'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceDistanceP95FractionOfBodyLength': float(np.quantile(distances, .95)) / BODY_LENGTH,
    'anchorTolerance': ANCHOR_TOLERANCE,
    'anchorSurfaceDistances': anchor_checks,
    'appendageRootSeating': seating,
    'stations': profile,
}
open(os.path.join(HERE, ID + '-profile.json'), 'w').write(json.dumps(profile_report, indent=2) + '\n')

validation = {
    'sourceFile': os.path.relpath(SOURCE, ROOT),
    'sourceSha256': hashlib.sha256(open(SOURCE, 'rb').read()).hexdigest(),
    'preservedRawSha256': hashlib.sha256(open(RAW, 'rb').read()).hexdigest(),
    'sourceAlbedoSha256': albedo_sha,
    'sourceTriangles': source_triangles,
    'weldedComponents': len(component_sizes),
    'largestComponents': component_sizes[:5],
    'removedFlakeVertices': removed,
    'unbending': unbending,
    'restPoseCurvature': REST_POSE_CURVATURE,
    'pairedFinAsymmetry': PAIRED_FIN_ASYMMETRY,
    'mouth': mouth_report,
    'mouthSideLabelling': label_report,
    'hingePlug': hinge_report,
    'oralShells': {
        'contract': 'a palate rigid on skull and a floor rigid on jaw, each a closed shell '
                    '(T.oral_shells), overlapping behind the hinge, no wall between them',
        'palateVertices': _lin_palate, 'floorVertices': len(_lining_raw) - _lin_palate,
        'rings': LIN_RINGS, 'ring': LIN_RING, 'backY': round(LIN_BACK, 5), 'frontY': round(LIN_FRONT, 5),
        'floorFrontY': round(LIN_FRONT_FLOOR, 5), 'mandibleTipY': round(JAW_TIP_Y, 5),
        'lateralAxisAtStations': [[round(float(y), 4), round(cx(float(y)), 4)] for y in np.linspace(LIN_BACK, LIN_FRONT, 7)],
        'palateAndFloorLinesAtStations': [[round(float(y), 4), round(lumen_centre(float(y)), 4), round(palate_line(float(y)), 4), round(floor_line(float(y)), 4)]
                                          for y in np.linspace(LIN_BACK, LIN_FRONT, 7)],
        'builtAboutEachJawsOwnEdgeOfTheLumen': True, 'throatFraction': ORAL_THROAT,
        'mandibleNormalVoteAgainstTheIntakeSurface': JAW_NORMAL_VOTE,
        'measuredRoomAtStations': [[round(float(y), 4)] + [round(float(r), 4) for r in mouth_room(float(y))]
                                   for y in np.linspace(LIN_BACK, LIN_FRONT, 7)],
        'vertexDirectionsOpenToTheOutside': _open_directions,
        'verticesSeatedInsideTheSilhouette': SEATED},
    'liningClearanceInsideSkinRaw': round(lining_clearance, 5),
    'scale': round(SCALE, 5), 'bodyLength': BODY_LENGTH,
    'authoredTriangles': authored_tris, 'twinTriangles': puppet_tris,
    'twinRemeshTriangles': remesh_triangles, 'twinDecimateRatio': decimate_ratio,
    'twinVerticesHeldBackFromRelaxation': relax_masked, 'bladeDilation': BLADE_DILATION,
    'voxel': VOXEL,
    'bones': len(B), 'boneNames': list(B),
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report,
    'finBladeSpansMeasuredOffTheGeneration': fin_span_report,
    'bladeVerticesByStation': blade_scan,
    'weightRelaxation': {'passes': WEIGHT_RELAX, 'keptPerPass': WEIGHT_KEEP,
                         'note': 'each pass replaces a vertex\'s weights with this much of '
                                 'its own and the rest shared equally among its neighbours '
                                 'on the mesh graph'},
    'envelope': {k: profile_report[k] for k in
                 ('maximumEnvelopeDifference', 'maximumEnvelopeDifferenceFractionOfBodyLength',
                  'surfaceDistanceMax', 'surfaceDistanceP95', 'envelopeTolerance')},
    'anchors': anchor_checks, 'appendageRootSeating': seating,
    'jawShutFromTheGenerationsPartedPose': jaw_closed_cost,
    'authoredVerticesFarthestFromTheTwin': farthest_from_the_twin,
    'pairedFinSweptAngleInSprint': {
        'radiansPerCycleSummedOverTheThreeAxes': {k: round(v, 4) for k, v in fin_sweep.items()},
        'cycles': 2,
        'note': 'total absolute change in each paired-fin root\'s Euler angles over the whole '
                'Sprint clip, which holds two tail beats. These are control surfaces and take no '
                'propulsive stroke, but they sweep with the beat rather than hanging.'},
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True,
}
# The gape proof is a render, so it cannot run inside the builder; its result is kept beside this
# file as `gape-solid.json` and folded in here, so a rebuild no longer silently drops it. It is a
# measurement of the *last* build rather than of this one -- which is only sound because the two
# are the same body, and the audit says so by value.
_gape = os.path.join(HERE, 'gape-solid.json')
if os.path.exists(_gape):
    validation['gapeSolid'] = json.load(open(_gape))
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(validation, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('HYBODUS_CURVATURE ' + json.dumps(REST_POSE_CURVATURE))
print('HYBODUS_FINSYM ' + json.dumps(PAIRED_FIN_ASYMMETRY))
print('HYBODUS_UNBEND ' + json.dumps(unbending))
print('HYBODUS_MOUTH ' + json.dumps(mouth_report))
print('HYBODUS_ENVELOPE ' + json.dumps(validation['envelope']))
print('HYBODUS_TRIS ' + json.dumps({'authored': authored_tris, 'twin': puppet_tris,
                                    'fraction': round(puppet_tris / authored_tris, 4)}))
print('HYBODUS_SEATING ' + json.dumps(seating))
print('HYBODUS_SEAMS ' + json.dumps({k: round(v, 9) for k, v in seams.items()}))
