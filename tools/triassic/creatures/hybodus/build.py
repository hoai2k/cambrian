"""Rebuild Hybodus: the worked Tripo skin and a measured voxel-volume twin on one shared rig.

Blender 5.2. The generation arrives folded into a gentle S with its tail swung a quarter of a body
out of the midline, so intake measures the animal's own centreline off the surface and carries every
section rigidly onto a straight axis -- nothing is stretched, sheared or thinned, and the head is
carried by the one transform its own station receives. After that the body lies head at -Y, up +Z,
midline x = 0 in raw Tripo units (body length 1.0 before the unbend), and `tx()` applies the final
engine scale; `export_yup` then puts the head at glTF +Z, where every shipped body keeps it.

Nothing here models new anatomy beside the generation. The jaw is cut out of the generation's own
skin on the plane a reviewer aimed in the viewer's mouth editor (`docs/triassic/mouths/`), the teeth
are the generation's own, and the mouth is closed by the cut's own rim (`T.cap_cut` at the hinge,
`T.cap_mouth` along the mouth line, each half domed into itself) -- no lining, no hinge plug, nothing
authored at all. The jaw's weight is one field over both halves of the head (`T.jaw_field_aimed`),
so the head bends round the gape and parts only along the cut, where the caps close it.

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
# Double-sided, as this body has always shipped. It is no longer a backstop behind a lining -- the
# caps close each half by construction -- but what a player would see through any gap that did
# open is the unlit inside of the head rather than the world.
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
# has to ask where the animal's skin is -- the seating of a root, the containment of every cap
# vertex, the twin's pigment -- asks this, because the body itself loses its closure and its polygon
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

# ----------------------------------------------------------------------- the aimed cut ----
# **The cut is a human's now** (`docs/viewer-mouth.md`, T3D-39). A reviewer aimed a cut plane and a
# hinge on this exact shipped body in the viewer's mouth editor -- the file hash-matched the body it
# was aimed on, and `npm run triassic:mouth` re-counted the same 314 of 13,223 mandible vertices --
# and exported the six numbers. That file is the cut; Birgeria's and Aphaneramma's builders (T3D-38)
# are the pattern, and Cartorhynchus' before them.
#
# What the reviewer moved, against the slit this builder used to cut on (the measured seam and the
# labelled tooth roots, both still read above and recorded):
#   * the line is a **plane**, pitched +19.3 deg in profile, yawed -0.5 deg and rolled -2.0 deg --
#     a term in x the old sheared curve could not carry even in principle;
#   * the hinge sits **11.0 % of the body back from the nose** (`aimedCut.hingeBehindTheSlitRaw`
#     says where that is against the modelled slit);
#   * the mandible is what the document says it is and nothing else: **below the plane and ahead of
#     the hinge wall**, the rule the editor lit and counted. The labels -- each tooth sent whole to
#     the jaw whose surface it grows from -- are retired with the cut they were written for, and
#     which of the generation's teeth the plane now crosses is recorded (`mouth.teethOnTheCut`).
AIMED_MOUTH = 'docs/triassic/mouths/hybodus-mouth.json'
_doc = json.loads(open(os.path.join(ROOT, AIMED_MOUTH)).read())
assert _doc['schema'] == 'mouth-cut/1' and _doc['id'] == ID, (_doc.get('schema'), _doc.get('id'))
assert _doc['appliesTo'] == 'built', _doc['appliesTo']
assert (_doc['frame']['axis'], _doc['frame']['forward'], _doc['frame']['up']) == ('z', 1, 'y')


def from_gltf_point(p):
    """The export frame into this builder's raw one. `tx` scales by SCALE and the glTF exporter's
    `export_yup` sends Blender (x, y, z) to glTF (x, z, -y); this is that, inverted."""
    return Vector((p[0] / SCALE, -p[2] / SCALE, p[1] / SCALE))


def from_gltf_dir(d):
    return Vector((d[0], -d[2], d[1]))


# **A direction handed in from outside is in the file's frame, so check the frame rather than
# assume it.** The map above is the exporter's convention, not a measurement; it is checked against
# something the document measured on the shipped file and this build measures on its own intake:
# the bounding box over every vertex. If the head end or the up axis were the other way round the
# two would disagree by a body length rather than by a rounding -- and they would also disagree if
# the intake above (the unbend, the roll off the countershading, the recentring) had drifted since
# the body the reviewer aimed on was built.
_lo, _hi = CO.min(0) * SCALE, CO.max(0) * SCALE
FRAME_CHECK = float(max(
    abs(a - b) for a, b in
    zip([_lo[0], _lo[2], -_hi[1], _hi[0], _hi[2], -_lo[1]],
        list(_doc['mouth']['box']['lo']) + list(_doc['mouth']['box']['hi']))))
assert FRAME_CHECK < 1e-3 * TARGET_LENGTH, ('the aimed cut is not in this body\'s frame', FRAME_CHECK)

CUT_P = from_gltf_point(_doc['plane']['point'])
CUT_N = from_gltf_dir(_doc['plane']['normal']).normalized()
CUT_F = from_gltf_dir(_doc['plane']['forward']).normalized()
CUT_AXIS = from_gltf_dir(_doc['hinge']['axis']).normalized()
assert abs(CUT_N.dot(CUT_F)) < 1e-4, CUT_N.dot(CUT_F)
assert abs(CUT_AXIS.dot(CUT_N)) < 1e-3 and abs(CUT_AXIS.dot(CUT_F)) < 1e-3, \
    ('the hinge axis is not the plane\'s own hinge line', CUT_AXIS.dot(CUT_N), CUT_AXIS.dot(CUT_F))
assert CUT_N.z > .5 and CUT_F.y < -.5, (tuple(CUT_N), tuple(CUT_F))   # up out of the mouth, and forward
assert CUT_AXIS.x > .9, ('the hinge axis is not across the head', tuple(CUT_AXIS))
HINGE_Y = float(CUT_P.y)
HINGE_F = (HINGE_Y - YLO) / RAW_LENGTH


# The head's own silhouette per station, from the vertex cloud -- measured on the intake, before
# anything is cut. Rays cannot measure it at the mouth: the generation's slit is modelled, so a ray
# cast in at the mouth line goes through the slit and hits the far cheek.
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
    """The mouth's own lateral centre, **measured** (the lesson the two fish ports paid for): the
    modelled cavity's centre along the mouth, handing over to the head's median behind it, where the
    throat is and no cavity was measured."""
    w = smooth((y - MOUTH_Y[1]) / (.02 * RAW_LENGTH))
    return (1. - w) * mouth_cx(y) + w * head_cx(y)


def plane_z(x, y):
    """The aimed plane solved for z. A plane is what the reviewer aimed, so it is cut as a plane
    and not sheared onto one: the yaw and the roll are the x term, which no curve of y can carry."""
    return float(CUT_P.z - (CUT_N.x * (x - CUT_P.x) + CUT_N.y * (y - CUT_P.y)) / CUT_N.z)


def seam(y):
    """The mouth line: the aimed plane read on the body's own measured centreline `cx`. The plane
    carries the reviewer's yaw and roll, `cx` the animal's own wander."""
    return plane_z(cx(y), y)


def below_cut(p):
    return (Vector(p) - CUT_P).dot(CUT_N) < 0


def ahead_of_hinge(p):
    return (Vector(p) - CUT_P).dot(CUT_F) > 0


def on_hinge_wall(p):
    return abs((Vector(p) - CUT_P).dot(CUT_F)) < 1e-5


def hinge_line_at(x):
    """The point on the hinge line -- the plane's own intersection with the hinge wall -- at a given
    x. Every point of that line is the same pivot, so seating the jaw here rather than at the
    reviewer's handle is the reviewer's hinge, on the head's own middle."""
    return CUT_P + CUT_AXIS * ((x - CUT_P.x) / CUT_AXIS.x)


# What the human and the generation disagree about, station by station over the slit the generation
# modelled (`seam_z`, the measured mid height of the cavity). Recorded, never averaged: an aimed cut
# that agreed with the measurement everywhere would not have been worth aiming. Positive is the
# measured slit standing above the aimed line.
AIMED_VS_SLIT = [(float(y), seam_z(float(y)) - seam(float(y))) for y in _sy]
AIMED_BELOW_SLIT_MAX = float(max(d for _y, d in AIMED_VS_SLIT))
AIMED_ABOVE_SLIT_MAX = float(-min(d for _y, d in AIMED_VS_SLIT))
AIMED_VS_SLIT_OVER_MOUTH_DEPTH = float(max(abs(d) / max(mouth_half_depth(y), 1e-4)
                                           for y, d in AIMED_VS_SLIT))
HINGE_BEHIND_THE_SLIT = float(HINGE_Y - MOUTH_Y[1])
# Where the reviewer's hinge stands against the measured centre, and against the head's own box
# middle, which the document also records: agreement says nobody has to choose between them.
AIMED_HINGE_OFF_CX = float(CUT_P.x - cx(HINGE_Y))
AIMED_HINGE_OFF_HEAD_MEDIAN = float(CUT_P.x - head_cx(HINGE_Y))

# The head's own section hull per station, measured on the intake -- the containment test for the
# caps that uses no normals and no table lookup outside the head's own stations.
_HY = np.linspace(YLO + .002 * RAW_LENGTH, HINGE_Y + .03 * RAW_LENGTH, 48)


def _hull(points):
    """Andrew's monotone chain, counter-clockwise, for a small 2-D point set."""
    pts = sorted(map(tuple, points))
    if len(pts) < 3:
        return pts

    def half(seq):
        out = []
        for p in seq:
            while len(out) >= 2 and ((out[-1][0] - out[-2][0]) * (p[1] - out[-2][1])
                                     - (out[-1][1] - out[-2][1]) * (p[0] - out[-2][0])) <= 0:
                out.pop()
            out.append(p)
        return out
    return half(pts)[:-1] + half(reversed(pts))[:-1]


_HULLS = {}
for _i, _y in enumerate(_HY):
    _m = np.abs(CO[:, 1] - float(_y)) < .005 * RAW_LENGTH
    _HULLS[_i] = _hull(CO[_m][:, [0, 2]]) if _m.sum() >= 6 else []


def hull_clearance(p):
    """How far inside the head's own section hull p is, at the nearest measured station. Negative
    means it has left the head. Behind the last station the head is not measured and this says so
    by returning a large positive number, which is why it is only ever asked of cap vertices, and
    every one of those is ahead of the hinge wall or on it."""
    if p.y > _HY[-1] + .005 * RAW_LENGTH:
        return 1.
    i = int(np.clip(np.searchsorted(_HY, float(p.y)), 0, len(_HY) - 1))
    hull = _HULLS.get(i) or _HULLS.get(max(0, i - 1)) or []
    if len(hull) < 3:
        return 1.
    worst = 1e9
    for a, b in zip(hull, hull[1:] + hull[:1]):
        ex, ez = b[0] - a[0], b[1] - a[1]
        L = math.hypot(ex, ez)
        if L < 1e-9:
            continue
        worst = min(worst, (ex * (p.z - a[1]) - ez * (p.x - a[0])) / L)
    return float(worst)


def parity_inside(p, bvh):
    """Inside a **closed surface**, by ray parity -- no normals and no table (the `np.interp`
    lesson). Asked of the body's own surface taken before the cut opened it."""
    return T.ray_parity_inside(bvh, p)


# **Can this point be seen from outside the animal?** A point strictly inside a closed surface meets
# skin along every direction; a point outside escapes along at least one. Twenty-six directions, the
# cube's faces, edges and corners -- the question T3D-38 invented for a mouth standing out of a
# cheek. A cap's rim vertices are *on* the skin by construction, so a point within `ON_SKIN` of its
# body's closed surface is not counted as outside it.
_SEEN_DIRS = tuple(Vector((a, b, c)).normalized()
                   for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1)
                   if (a, b, c) != (0, 0, 0))
ON_SKIN = .0010 * RAW_LENGTH
ON_SKIN_BOUND = .0025 * RAW_LENGTH


def seen_from_outside(p, bvh):
    if bvh.find_nearest(Vector(p))[3] <= ON_SKIN:
        return False
    return any(bvh.ray_cast(Vector(p), d, 3.)[0] is None for d in _SEEN_DIRS)


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
# The jaw is seated on the aimed hinge line at the mouth's own measured centre (`hinge_line_at`),
# which is the reviewer's pivot on the head's own middle; see the armature for the axis it turns
# about. Nothing else in the rig moves: the axial stations are fractions of the body, not of the
# mouth, so every bone but `jaw` is exactly where it was.
bone('jaw', tuple(hinge_line_at(cx(HINGE_Y))), 'skull')
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
seating['skull'] = round(depth_inside(B['skull'][0]), 4)
seating['chest'] = round(depth_inside(B['chest'][0]), 4)
seating['body'] = round(depth_inside(B['body'][0]), 4)
for n, d in seating.items():
    assert d > .008, ('a root is outside the body', n, d)
# The jaw's seat is recorded by the probe and asserted on the section and by parity: `depth()`
# cannot seat anything beside a modelled mouth (CLAUDE.md), and the aimed hinge line runs along the
# back of this one.
seating['jaw'] = round(depth_inside(B['jaw'][0]), 4)
JAW_HULL_SEATING = hull_clearance(Vector(B['jaw'][0]))
JAW_PARITY_INSIDE = parity_inside(Vector(B['jaw'][0]), src_bvh)
assert JAW_HULL_SEATING > .004 * RAW_LENGTH and JAW_PARITY_INSIDE, \
    ('the jaw hinge is not seated inside the head', seating['jaw'], JAW_HULL_SEATING)

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
# **The document's own rule, verbatim**: below the aimed plane and ahead of its hinge wall, and
# nothing added to it. The plane is cut as a plane -- the hinge wall first, then the mouth line --
# over the head's faces only, so the rest of the body keeps its topology; the two half-spaces leave
# each half with one boundary of two arcs, the mouth line and the hinge wall, which is what
# `cap_cut` and `cap_mouth` between them close.
#
# **Retired with the labelled cut**: the shear onto the measured seam, the per-tooth labels, the
# `holes_fill` over the mandible's own boundary and the normal vote it needed (the fill had made the
# shell's winding a coin toss; a split that fills nothing keeps the intake's outward winding face by
# face), the rim fold (`T.rim_flange`), the post-cut seam seal (`T.seal_seams`) and the two rigid
# oral shells with the hinge report that justified having no plug. Each existed to prop up a rim
# that could not be spanned; this one is spanned.
def is_jaw(c):
    return below_cut(c) and ahead_of_hinge(c)


def bisect_on_plane(o, margin=.03 * RAW_LENGTH):
    """Take the cut where the reviewer aimed it, as Birgeria's builder does. Only head faces are
    offered to either pass."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for no in (CUT_F, CUT_N):                      # the hinge wall, then the mouth line itself
        head = [f for f in bm.faces if f.calc_center_median().y < HINGE_Y + margin]
        verts, edges = set(), set()
        for f in head:
            verts.update(f.verts)
            edges.update(f.edges)
        bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + head, dist=1e-7,
                               plane_co=CUT_P, plane_no=no, clear_inner=False, clear_outer=False)
    bm.to_mesh(o.data)
    bm.free()


# How open the generation is before anything is cut: every boundary edge on each closed surface
# the caps are held to. Parity is only an answer against a closed surface, so the number is kept.
def _open_edges(me, within=lambda c: True):
    bmx = bmesh.new()
    bmx.from_mesh(me)
    n = sum(1 for e in bmx.edges if len(e.link_faces) == 1
            and within(e.verts[0].co) and within(e.verts[1].co))
    bmx.free()
    return n


INTAKE_OPEN_EDGES = {'authored': _open_edges(intake_mesh), 'twin': _open_edges(pup_intake),
                     'authoredHead': _open_edges(intake_mesh, lambda c: c[1] < HINGE_Y + .10 * RAW_LENGTH),
                     'twinHead': _open_edges(pup_intake, lambda c: c[1] < HINGE_Y + .10 * RAW_LENGTH)}

# The dome's two numbers, and the rim selector's tolerance. Birgeria's, which is the owner's
# construction's own first port on a fish: each cap vertex pushed into its half by 0.30 of its own
# distance from the rim, never further than 0.55 of the head's measured room either side of the
# mouth line.
CAP_DOME = .30
CAP_ROOM = .55
# The rim is a band about the cut plane rather than the plane exactly, and the twin is why: the
# bisect lands every vertex it adds on the plane, but the voxel twin has faces the bisect snapped
# rather than cut (`dist=1e-7`) and `split_part` sends such a face whole to one side by its
# centroid, leaving a few of its vertices just off the plane. An exact selector drops those, the
# lip run stops one edge short of them, and `cap_mouth` correctly refuses an arc.
SEAM_TOL = .0025 * RAW_LENGTH


def on_seam(p):
    # The corner of the mouth is on both rims and has to be in this one: bounded strictly ahead of
    # the hinge the two vertices where the lip meets the hinge cross-section are excluded, the lip
    # run stops one edge short of the corner, and `cap_mouth` refuses the selection as an arc.
    return (abs((Vector(p) - CUT_P).dot(CUT_N)) < SEAM_TOL
            and (Vector(p) - CUT_P).dot(CUT_F) > -1e-5)


def in_head(p):
    return p[1] < HINGE_Y + .03 * RAW_LENGTH


def cap_room(p):
    zlo, zhi = head_z(float(p.y))
    s = seam(float(p.y))
    return max(.0004 * RAW_LENGTH, min(zhi - s, s - zlo)) * CAP_ROOM


# Each body's caps are asked of **its own** closed surface before the cut: the twin is a voxel
# resurfacing that stands up to a few thousandths off the intake, so a twin cap measured against the
# intake reads outside wherever the twin is fuller than the generation, which says nothing about the
# twin (T3D-38). `src_bvh` is the intake's; `_bvh_pup` the twin's, both taken before any cut.
CLOSED = {auth.name: src_bvh, puppet.name: _bvh_pup}

parts, CUT_RIM, CAPS, CAP_SEATING, FILL_FROM = {}, {}, {}, {}, {}
for o in (auth, puppet):
    bisect_on_plane(o)
    T.split_part(o, 'lower jaw', is_jaw, parts)
    jaw = parts['lower jaw'][o.name]
    # Which of the three kinds of generation this is, measured before anything is built to close it
    # (`T.cut_rim`), and whether the rim pinches -- the labelled rim did, at sixteen vertices where
    # two runs of it met round the interlocking tooth roots, and `cap_mouth` refused it.
    CUT_RIM[o.name] = {'skull': T.cut_rim(o, in_head, seam=seam),
                       'jaw': T.cut_rim(jaw, in_head, seam=seam)}
    print('HYBODUS_CUT_RIM', o.name, json.dumps(CUT_RIM[o.name]))
    # Every face from here on is fill: the caps append their faces after the skin's, and nothing
    # below reorders them, so the skin a body arrived with is the faces under this index.
    FILL_FROM[o.name], FILL_FROM[jaw.name] = len(o.data.polygons), len(jaw.data.polygons)
    # The transverse run first -- the head's cross-section at the hinge, which dips out of the
    # mouth's own plane and would fold under a planar fill -- then the mouth line itself.
    CAPS[o.name] = {'skullAtHinge': T.cap_cut(o, on_hinge_wall, CUT_F),
                    'jawAtHinge': T.cap_cut(jaw, on_hinge_wall, -CUT_F)}
    assert CAPS[o.name]['skullAtHinge'] > 0 and CAPS[o.name]['jawAtHinge'] > 0, \
        ('the hinge cross-section was left open', o.name, CAPS[o.name])
    _n_skull, _n_jaw = len(o.data.vertices), len(jaw.data.vertices)
    CAPS[o.name]['palate'] = T.cap_mouth(o, on_seam, -CUT_N, dome=CAP_DOME, rounds=2,
                                         limit=cap_room)
    CAPS[o.name]['floor'] = T.cap_mouth(jaw, on_seam, CUT_N, dome=CAP_DOME, rounds=2,
                                        limit=cap_room)
    print('HYBODUS_CAPS', o.name, json.dumps(CAPS[o.name]))
    # Every vertex the caps added is inside the animal, checked three ways that cannot all be
    # fooled the same way: the head's own measured section hull, which uses no normals; ray parity
    # against the body's own closed surface taken before the cut opened it; and whether any of the
    # cube's twenty-six directions escapes to open water without meeting skin.
    _worst, _outside_hull, _outside_parity, _seen, _seen_at, _loose = 1e9, 0, 0, 0, [], []
    for _part, _first in ((o, _n_skull), (jaw, _n_jaw)):
        for _v in _part.data.vertices[_first:]:
            _q = Vector(_v.co[:])
            _c = hull_clearance(_q)
            _worst = min(_worst, _c)
            _outside_hull += 1 if _c < 0 else 0
            _inside = parity_inside(_q, CLOSED[o.name])
            _off = CLOSED[o.name].find_nearest(_q)[3]
            _outside_parity += 0 if _inside else 1
            _was_seen = seen_from_outside(_q, CLOSED[o.name])
            if _was_seen:
                _seen += 1
                _seen_at.append([round(c, 4) for c in _q] + [round(_off, 5)])
            # **Inside, or on the skin.** Parity is a vote and is unreliable for a point a thousandth
            # off a surface, which is where every rim-adjacent cap vertex lives; past `ON_SKIN_BOUND`
            # it is reliable, and there a vertex must be inside its own closed body and invisible
            # from outside.
            if _off >= ON_SKIN_BOUND and (not _inside or _was_seen):
                _loose.append([round(c, 4) for c in _q] + [round(_off, 5)])
    CAP_SEATING[o.name] = {
        'capVertices': (len(o.data.vertices) - _n_skull) + (len(jaw.data.vertices) - _n_jaw),
        'worstHullClearanceRaw': float(_worst),
        'outsideTheSectionHull': _outside_hull, 'outsideByRayParity': _outside_parity,
        'seenFromOutsideAlong26Directions': _seen, 'seenFromOutsideAt': _seen_at[:12],
        'standingOutOfTheSkin': len(_loose)}
    print('HYBODUS_CAP_SEATING', o.name, json.dumps(CAP_SEATING[o.name]))
    # The hull is the **intake's** section hull, a per-station convex hull of a thin band, so a
    # vertex on a waisted part of the snout can read a thousandth outside one without having left
    # the animal; and on the twin, a voxel resurfacing fuller than the intake in places, it is
    # recorded rather than asserted -- the twin is held to its own closed surface.
    if o is auth:
        assert _worst > -.0015 * RAW_LENGTH, ('a cap vertex left the head', o.name, CAP_SEATING[o.name])
    assert not _loose, ('a cap vertex stands outside its own body', o.name, _loose[:8])
    assert all(r[3] < ON_SKIN_BOUND for r in _seen_at), \
        ('a cap vertex stands out of the skin', o.name, [r for r in _seen_at if r[3] >= ON_SKIN_BOUND])

AUTH_JAW = parts['lower jaw'][auth.name]
PUP_JAW = parts['lower jaw'][puppet.name]
# Where the mandible the document takes actually ends, measured off the cut part itself, before the
# caps' vertices (which are all behind it) are counted.
JAW_TIP_Y = float(min(v.co.y for v in AUTH_JAW.data.vertices))
if os.environ.get('HYBODUS_STOP_AFTER_CUT'):
    print('HYBODUS_STOPPED_AFTER_CUT')
    sys.stdout.flush()
    os._exit(0)

# Which of the generation's own teeth the plane crosses. Nothing is authored, so the only thing the
# cut can do to a tooth is put part of it on each bone -- the fault the labels existed to prevent on
# a curved cut, and the one a plane aimed across interlocking rows cannot entirely avoid. Recorded
# per patch of oral surface standing proud of its neighbourhood, measured on the intake.
_proud = (PROTRUSION > _tooth_threshold) & _oral
_tp_idx = np.nonzero(_proud)[0]
_tp_set = set(int(i) for i in _tp_idx)
_tp_adj = {}
for _e in intake_mesh.edges:
    a, b = _e.vertices
    if a in _tp_set and b in _tp_set:
        _tp_adj.setdefault(a, []).append(b)
        _tp_adj.setdefault(b, []).append(a)
_seen_tp, TOOTH_PATCHES = set(), []
for i in _tp_idx:
    i = int(i)
    if i in _seen_tp:
        continue
    stack, g = [i], []
    _seen_tp.add(i)
    while stack:
        q = stack.pop()
        g.append(q)
        for w in _tp_adj.get(q, []):
            if w not in _seen_tp:
                _seen_tp.add(w)
                stack.append(w)
    on = sum(1 for k in g if is_jaw(_PP[k]))
    TOOTH_PATCHES.append({'vertices': len(g), 'proudMaxRaw': round(float(PROTRUSION[g].max()), 5),
                          'y': [round(float(_PP[g][:, 1].min()), 4), round(float(_PP[g][:, 1].max()), 4)],
                          'onJaw': int(on), 'onSkull': int(len(g) - on)})
TEETH_ON_THE_CUT = [t for t in TOOTH_PATCHES if 0 < t['onJaw'] < t['vertices']]
mouth_report['teethOnTheCut'] = {
    'patches': len(TOOTH_PATCHES), 'wholeOnTheMandible': sum(1 for t in TOOTH_PATCHES if t['onSkull'] == 0),
    'wholeOnTheSkull': sum(1 for t in TOOTH_PATCHES if t['onJaw'] == 0),
    'crossedByThePlane': len(TEETH_ON_THE_CUT), 'crossed': TEETH_ON_THE_CUT[:24],
    'note': 'patches of oral surface standing proud of their own neighbourhood by more than the '
            'dentition threshold, and which side of the aimed cut each vertex of them is on. A '
            'patch on both is a tooth the plane crosses: its tip rides one bone and its root the '
            'other, and the caps close each piece.'}

# The cut adds vertices, so the shell thickness both bodies are skinned by is measured again, and
# against the *closed* surface each came from: a blade's thickness is a property of the shell, and a
# body with its jaw taken out of it would measure the open mouth as infinitely thin.
thickness = neighbourhood_minimum(auth.data, shell_thickness(auth.data, src_bvh))
# Voxel resurfacing cannot make a blade thinner than its own voxel, so the twin's fins are measured
# against the twin's own floor rather than the authored body's.
puppet_thickness = np.maximum(0., neighbourhood_minimum(
    puppet.data, shell_thickness(puppet.data, _bvh_pup)) - (VOXEL * 2 - .004))
mouth_report['generationsOwnDentition']['verticesCarriedOntoTheMandible'] = int(
    sum(1 for k in range(len(_PP)) if _oral[k] and is_jaw(_PP[k])))

# ------------------------------------------------------------ the mouth interior ----
# **There is none, and that is the verdict rather than an omission.** The mouth is closed by the
# cut's own rim (`T.cap_cut` over the head's cross-section at the hinge, `T.cap_mouth` over the
# mouth line, each half domed into itself), so the roof and the floor are the body's own geometry
# riding their own bones through the same weight field as the skin round them, and the space between
# the two caps is the mouth. The palate and floor shells T3D-36 restored are retired with the cut
# they were fitted to, and with them the copy of the body's pigmentation material they wore -- the
# freight that doubled the twin's size (T3D-32A measured it at -48.9 % of the LOD's bytes).
oralparts = []


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


def weights(p, thin, labelled=False):
    w = dict(axial(p[1]))
    fin = fin_weights(p, thin)
    if fin:
        chain, blend = fin
        if blend > 0:
            w = {n: v * (1 - blend) for n, v in w.items()}
            for n, v in chain.items():
                w[n] = w.get(n, 0.) + v * blend
    # No jaw term here: the jaw's share is one field over both halves of the head, laid over this
    # relaxed field afterwards (`T.jaw_field_aimed`, below), because a jaw term inside a per-vertex
    # formula is exactly the kind of gate the relaxation then has to smooth -- and the relaxation
    # cannot run across the cut, which is where the jaw's share *should* step.
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

# **The jaw turns about the frame's x, as on every body in the era, and not about the document's
# hinge axis.** Every rig here keeps the jaw's rest orientation identical to the skull's -- the audits
# read the gape as the jaw's own local rotation about x, and the gaits ask the body which way its jaw
# opens off the same number -- so a jaw bone rolled onto the reviewer's axis reads its own rest
# offset as a gape (T3D-38). The pivot *is* the reviewer's: the joint stands on the aimed hinge line.
JAW_AXIS_ERROR_DEGREES = math.degrees(Vector((1, 0, 0)).angle(CUT_AXIS))
weight_report = {}
# **How wide the jaw's ramp is.** A fraction of the body, one number for the band across the mouth
# plane and for the commissure ahead of the corner (see `T.jaw_field_aimed`); swept, and the sweep is
# in `validation.json` (`jawField.sweep`) and the README. `HYBODUS_JAW_RAMP` overrides it for the
# sweep and nothing else. The fade behind the hinge is twice it: the throat under the hinge is
# about twice as deep as the band either side of the mouth line is wide, and it is carried by the
# gape through that depth.
JAW_RAMP = float(os.environ.get('HYBODUS_JAW_RAMP', '.035')) * RAW_LENGTH
JAW_BACK_FADE = 2. * JAW_RAMP
JUNCTION, JAW_STEPS = {}, {}
# What the build refuses, per body: the largest jump in jaw weight along an edge of the skin the
# body arrived with (the shipped ramp's own figure, a hair over), and -- the resolution-free form of
# the same claim -- the largest jump over an edge's own length, in ramp widths, on *every* edge
# including the fill. A smoothstep climbs at most 1.5 per width, so anything past that is a step.
# The twin's edges are three times the authored body's, so its raw figure is its own.
JAW_STEP_BOUND = {'authored': .36, 'twin': .66}
JAW_STEEPNESS_BOUND = 1.5
if os.environ.get('HYBODUS_JAW_RAMP'):
    JAW_STEP_BOUND = {'authored': 1., 'twin': 1.}   # a sweep point is measured, not judged


def jaw_steps(body, shell, body_w, shell_w):
    """**"Does not break", as a number.** Over every edge of both halves, the largest jump in `jaw`
    weight between its two ends -- and across the halves, over every pair of points the cut
    duplicated, the same jump split into the pairs *on the cut* (ahead of the hinge wall on the
    mouth plane, which part by design and are closed by the caps) and the rest, which must be
    nought. Measured on the final, trimmed field that is written to the file."""
    from mathutils.kdtree import KDTree
    stats = {}
    for kind in ('skin', 'mouthCaps', 'hingeWallCaps'):
        worst = (0., None)
        jumps, steep = [], []
        for part, field in ((body, body_w), (shell, shell_w)):
            co = [v.co for v in part.data.vertices]
            skin_edges = set()
            for f in part.data.polygons:
                if f.index < FILL_FROM[part.name]:
                    skin_edges.update(f.edge_keys)
            for e in part.data.edges:
                a, b = e.vertices
                wall = on_hinge_wall(co[a]) and on_hinge_wall(co[b])
                k = 'skin' if e.key in skin_edges else 'hingeWallCaps' if wall else 'mouthCaps'
                if k != kind:
                    continue
                d = abs(field[a].get('jaw', 0.) - field[b].get('jaw', 0.))
                jumps.append(d)
                steep.append(d * JAW_RAMP / max((co[a] - co[b]).length, 1e-9))
                if d > worst[0]:
                    m = (co[a] + co[b]) / 2 - CUT_P
                    worst = (d, {'part': 'mandible' if part is shell else 'head',
                                 'aheadOfTheHingeWallRaw': round(m.dot(CUT_F), 5),
                                 'aboveTheMouthPlaneRaw': round(m.dot(CUT_N), 5),
                                 'edgeLengthRaw': round((co[a] - co[b]).length, 5),
                                 'jaw': [round(field[a].get('jaw', 0.), 4), round(field[b].get('jaw', 0.), 4)]})
        jumps = np.array(jumps) if jumps else np.zeros(1)
        stats[kind] = {'edges': int(len(jumps)), 'maxJumpAlongAnEdge': round(float(jumps.max()), 4),
                       # The jump over an edge's own length, in ramp widths: what "smooth" means
                       # whatever the mesh's resolution. A smoothstep is at most 1.5 per width.
                       'maxSteepnessPerRampWidth': round(float(max(steep, default=0.)), 3),
                       'p99JumpAlongAnEdge': round(float(np.quantile(jumps, .99)), 4),
                       'edgesJumpingMoreThanATenth': int((jumps > .10).sum()),
                       'edgesJumpingMoreThanAQuarter': int((jumps > .25).sum()),
                       'worstEdge': worst[1]}
    kd = KDTree(len(body.data.vertices))
    for i, v in enumerate(body.data.vertices):
        kd.insert(v.co, i)
    kd.balance()
    on_cut, off_cut = [], []
    for i, v in enumerate(shell.data.vertices):
        c, k, dist = kd.find(v.co)
        if dist >= 1e-6:
            continue
        d = abs(shell_w[i].get('jaw', 0.) - body_w[k].get('jaw', 0.))
        r = v.co - CUT_P
        (on_cut if (abs(r.dot(CUT_N)) < 1e-5 and r.dot(CUT_F) > 1e-5) else off_cut).append(d)
    return {'maxJumpAlongAnEdge': stats['skin']['maxJumpAlongAnEdge'],
            'skin': stats['skin'], 'mouthCaps': stats['mouthCaps'],
            'hingeWallCaps': stats['hingeWallCaps'],
            'sharedPointsOffTheCut': len(off_cut), 'maxJumpOffTheCut': round(max(off_cut, default=0.), 9),
            'sharedPointsOnTheCut': len(on_cut), 'maxJumpOnTheCut': round(max(on_cut, default=0.), 4)}


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
    # **The jaw bends; it does not break** (T3D-39, the owner's ask). One share over both halves of
    # the head, a function of position in the aimed document's own frame (`T.jaw_field_aimed`), so
    # the two copies of every hinge-wall vertex carry the same weights by construction and the only
    # place two neighbouring points of skin can take different shares is across the cut plane ahead
    # of the hinge -- where the caps close it. The throat under the hinge and the cheek beside the
    # corner follow the jaw by a smooth ramp and fade over `back` behind it; the mandible is full jaw
    # except inside `JAW_RAMP` of the corner of the mouth, where the share is continuous with the
    # skin round it rather than a rigid shell butted against it. What it replaced: `jaw_junction`
    # over a labelled rim, full jaw on the shell a hundredth and a half of a body from the rim.
    shell = AUTH_JAW if o is auth else PUP_JAW
    for n in B:
        shell.vertex_groups.new(name=n)
    body_w, shell_w, JAW_SHARE, JUNCTION[o.name] = T.jaw_field_aimed(
        o, shell, relaxed, CUT_P, CUT_N, CUT_F, width=JAW_RAMP, back=JAW_BACK_FADE,
        corner=JAW_RAMP, centre=.5)
    JAW_STEPS[o.name] = jaw_steps(o, shell, body_w, shell_w)
    print('HYBODUS_JAW_FIELD', o.name, json.dumps(JUNCTION[o.name]), json.dumps(JAW_STEPS[o.name]))
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
                             'verticesPerBone': owners, 'jawField': JUNCTION[o.name],
                             'jawWeightSteps': JAW_STEPS[o.name]}
# **"Does not break" is asserted, not described.** Off the cut every point the cut duplicated takes
# exactly its twin's share, and along every edge of both halves the share moves by no more than
# `JAW_STEP_BOUND` -- the figure the sweep shipped at, with room for the twin's coarser edges.
for _name, _st in JAW_STEPS.items():
    _which = 'twin' if _name == puppet.name else 'authored'
    assert _st['maxJumpOffTheCut'] < 1e-6, ('the jaw share steps off the cut', _name, _st)
    assert _st['maxJumpAlongAnEdge'] <= JAW_STEP_BOUND[_which], ('the jaw share steps along an edge', _name, _st)
    for _kind in ('skin', 'mouthCaps', 'hingeWallCaps'):
        assert _st[_kind]['maxSteepnessPerRampWidth'] <= JAW_STEEPNESS_BOUND, \
            ('the jaw share is steeper than its own ramp', _name, _kind, _st[_kind])
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
# On the aimed mouth line at the mouth's own centre: the mouth socket a little back from the
# mandible's own tip (the cut decides where the mandible ends, not the modelled cavity), the swallow
# point just ahead of the hinge wall, and the attack socket on the skull over the mouth socket.
_MOUTH_FRONT = JAW_TIP_Y + .006 * RAW_LENGTH
_THROAT = HINGE_Y - .012 * RAW_LENGTH
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (cx(_MOUTH_FRONT), _MOUTH_FRONT, seam(_MOUTH_FRONT) - .004 * RAW_LENGTH), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(_THROAT), _THROAT, seam(_THROAT) + .002 * RAW_LENGTH), 'swallow'),
    'anchor_attack_primary': ('skull', (cx(_MOUTH_FRONT), _MOUTH_FRONT, seam(_MOUTH_FRONT) + .004 * RAW_LENGTH), 'attack'),
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
        'The lower jaw is cut out of the generation\'s own skin on the plane a reviewer aimed in the '
        'viewer\'s mouth editor (docs/triassic/mouths/hybodus-mouth.json): %.1f deg of pitch, the '
        'hinge %.1f %% of the body back from the nose. The teeth are the generation\'s and are not '
        'replaced.' % (_doc['plane']['pitchDegrees'], _doc['hinge']['headFraction'] * 100),
        'Nothing is authored. The mouth is closed by the cut\'s own rim -- the head\'s cross-section '
        'at the hinge fanned shut, then the mouth line spanned on each half and domed into it -- so '
        'the roof and floor of the mouth are the body\'s own vertices wearing the skin they close. '
        'There is no lining and no hinge plug.',
        'The jaw bends rather than breaks: one jaw share over both halves of the head, continuous '
        'everywhere except across the cut itself, so the throat and the corner of the mouth stretch '
        'with the gape and only the mouth line parts.',
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

# The mouth record, brought up to the cut that is actually taken. The generation's own slit is still
# measured and kept (`seamTable`, `restingGape`, the dentition): it is what the aimed cut is
# measured against, and it is what `JAW_SHUT` -- the rotation that brings the modelled lips
# together -- is still read from.
mouth_report['method'] = ('aimed by hand in the viewer\'s mouth editor (%s); the modelled slit -- '
                          'found by casting every head vertex\'s own normal back into the mesh -- is '
                          'measured beside it and no longer cuts' % AIMED_MOUTH)
mouth_report['cutDeviationFromTheMeasuredLipLine'] = {
    'maxRaw': round(max(abs(d) for _y, d in AIMED_VS_SLIT), 5),
    'asFractionOfBodyLength': round(max(abs(d) for _y, d in AIMED_VS_SLIT) / RAW_LENGTH, 5),
    'note': 'the cut is the aimed plane now, read on the mouth\'s measured centre; this is how far '
            'that plane stands from the mid height of the slit the generation modelled, over the '
            'stations the slit was measured at (aimedCut.perStation has every one).'}
mouth_report['closure'] = ('the cut\'s own rim: T.cap_cut over the hinge wall on each half, then '
                           'T.cap_mouth along the mouth line on each half, domed into it (dome %.2f, '
                           'ceiling %.2f of the head\'s own room either side of the mouth line). No '
                           'lining, no hinge plug, no rim fold and no seam seal.' % (CAP_DOME, CAP_ROOM))
mouth_report['aimedHingeAxisAgainstTheFramesXDegrees'] = JAW_AXIS_ERROR_DEGREES
mouth_report['aimedCut'] = {
    'file': AIMED_MOUTH, 'appliesTo': _doc['appliesTo'], 'sha256': _doc['sha256'],
    'consumed': True,
    'note': 'Cut on. The file hash-matched the shipped body it was aimed on; rebuilding on it is what '
            'consuming it looks like, so npm run triassic:mouth now refuses it on the hash, and the '
            'frame is asserted against the bounding box the document measured instead.',
    'frameCheckUnits': FRAME_CHECK,
    'pitchDegrees': _doc['plane']['pitchDegrees'], 'yawDegrees': _doc['plane']['yawDegrees'],
    'rollDegrees': _doc['plane']['rollDegrees'], 'hingeHeadFraction': _doc['hinge']['headFraction'],
    'mandibleVerticesTheEditorCounted': _doc['sides']['mandible'],
    'hingeCentreRaw': [round(float(c), 5) for c in CUT_P],
    'mouthPlaneNormalRaw': [round(float(c), 5) for c in CUT_N],
    'mouthLineForwardRaw': [round(float(c), 5) for c in CUT_F],
    'hingeAxisRaw': [round(float(c), 5) for c in CUT_AXIS],
    'jawJointRaw': [round(float(c), 5) for c in B['jaw'][0]],
    'jawJointHullClearanceRaw': round(JAW_HULL_SEATING, 5), 'jawJointInsideByRayParity': JAW_PARITY_INSIDE,
    'aimedHingeOffTheMeasuredCentreRaw': round(AIMED_HINGE_OFF_CX, 5),
    'aimedHingeOffTheHeadsOwnMedianRaw': round(AIMED_HINGE_OFF_HEAD_MEDIAN, 5),
    'hingeBehindTheSlitRaw': round(HINGE_BEHIND_THE_SLIT, 5),
    'mandibleTipRaw': round(JAW_TIP_Y, 5),
    'belowTheSlitMaxRaw': round(AIMED_BELOW_SLIT_MAX, 5),
    'aboveTheSlitMaxRaw': round(AIMED_ABOVE_SLIT_MAX, 5),
    'worstOverLocalMouthHalfDepth': round(AIMED_VS_SLIT_OVER_MOUTH_DEPTH, 3),
    'perStation': [[round(y, 4), round(d, 5)] for y, d in AIMED_VS_SLIT]}
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
    'jawField': {
        'construction': 'T.jaw_field_aimed: one jaw share over both halves of the head, a function of '
                        'position in the aimed document\'s frame, continuous everywhere except '
                        'across the cut plane ahead of the hinge wall',
        'rampWidthRaw': round(JAW_RAMP, 5), 'rampWidthOfBody': round(JAW_RAMP / RAW_LENGTH, 4),
        'backFadeRaw': round(JAW_BACK_FADE, 5), 'backFadeOfBody': round(JAW_BACK_FADE / RAW_LENGTH, 4),
        'perBody': JUNCTION, 'weightSteps': JAW_STEPS,
        'maxJumpAlongAnEdgeAssertedUnder': JAW_STEP_BOUND,
        'maxSteepnessPerRampWidthAssertedUnder': JAW_STEEPNESS_BOUND,
        'rampWidthUnits': round(JAW_RAMP * SCALE, 5),
        'sweep': json.load(open(os.path.join(HERE, 'jaw-sweep.json')))
        if os.path.exists(os.path.join(HERE, 'jaw-sweep.json')) else None,
        'note': 'weightSteps is the "does not break" figure: over every edge of both halves the '
                'largest jump in jaw weight between its ends, and over every point the cut '
                'duplicated the jump off the cut (nought, asserted) and on it (the mouth line, which '
                'parts by design and is closed by the caps).'},
    'cut': {
        'rim': CUT_RIM, 'caps': CAPS, 'capSeating': CAP_SEATING,
        'intakeBoundaryEdgesBeforeTheCut': INTAKE_OPEN_EDGES,
        'dome': CAP_DOME, 'ceilingOfTheHeadsRoom': CAP_ROOM, 'seamToleranceRaw': round(SEAM_TOL, 5),
        'onSkinRaw': round(ON_SKIN, 5), 'onSkinBoundRaw': round(ON_SKIN_BOUND, 5),
        'retired': ['the shear onto the measured seam and the per-tooth labels', 'holes_fill over the '
                    'mandible\'s boundary and the normal vote it needed', 'T.rim_flange on the lip rim',
                    'T.seal_seams after the cut', 'the two rigid T.oral_shells (palate on skull, floor '
                    'on jaw)', 'the hinge report that justified having no plug']},
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
