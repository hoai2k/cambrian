"""Rebuild Dinocephalosaurus: the generated body unbent out of its pose, its procedural volume twin,
and one shared 57-joint rig whose neck is thirty-two cervicals.
Blender 5.2. Geometry coordinates are raw Tripo metres (X snoutward, Y left, Z up; the generated
body measures 1.0 nose to tail *in its pose*) until the final engine transform tx().

The animal is its neck, and the generation gave us a real one -- 0.725 of a body length of it,
measured along its own centreline -- thrown into a tall S that doubles back over the trunk. The
neck that ships is that neck: every generated vertex, its UVs and its texture are kept, and intake
unbends it the way Placodus unbends its tail, by carrying each cross-section rigidly from its own
measured centreline frame onto a target axis of the same segment lengths. Two things make that
reach a neck rather than a tail, and both are recorded in pose-study.py:

  * The target axis is not a straight line but a curve that leaves the shoulder along the neck's
    OWN tangent and eases to level over the first 45 % of its length, so the root section is not
    rotated at all and the trunk is never disturbed.
  * The roll is measured off the animal's colouring, not fitted. A round cross-section is
    rotationally ambiguous, so a geometric frame cannot know which way is up; the countershading
    can, because the dark back and pale belly put the seam on the lateral midline. Parallel
    transport disagrees with the colour by up to 124 degrees across this neck, which would spiral
    the markings down a silhouette that came out perfectly straight.
"""
import bpy, bmesh, math, json, os, struct, hashlib, shutil, heapq
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
LOCAL = os.path.join(ROOT, 'local/triassic-authoring/dinocephalosaurus'); OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True); os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/dinocephalosaurus.raw.glb'); ID = 'dinocephalosaurus'
TARGET_LENGTH = 5.5          # engine units; the research registry's representative length is 5.5 m

# The 21 contract clips plus this animal's own three: NeckStrike (the long hunting lash, against
# Ability's 1.0 s roster version of the same act), Periscope (head up, body level, held) and
# Breathe (settled at the surface).  Grab is a held loop at 1.1 s.
CLIPS = {'Idle': 2.6, 'Swim': 2.0, 'Sprint': 1.3, 'TurnLeft': 1.7, 'TurnRight': 1.7, 'Dive': 1.5, 'Rise': 1.5,
         'Attack': 1., 'Bite': .5, 'Heavy': 1.2, 'Hit': .6, 'Death': 1.8, 'Guard': 1.1, 'Parry': .4, 'Dodge': .5,
         'Eat': 1.7, 'Stagger': 1.2, 'Ability': 1., 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5,
         'NeckStrike': 1.4, 'Periscope': 3.2, 'Breathe': 3.}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Periscope', 'Breathe']
CERVICALS = 32               # Spiekman et al. 2024: thirty-two, against Tanystropheus' thirteen
CAUDALS = 8

# Where the animal stops being one thing and starts being another, as geodesic distance from the
# snout over the welded raw surface.  Measured once by banding that surface and reading the section
# radius at every station (pose-study.py prints the table): the head swells to r=0.042 and stops at
# 0.131, the neck holds r~0.053 until the chest takes over at 0.835.
HEAD_GEO = .131
SHOULDER_GEO = .835
BANDS = 70
UNBEND = True                # False rebuilds the body in its generated pose, for comparison
STRAIGHTEN_TAIL = True

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=RAW)
auth = next(o for o in bpy.context.scene.objects if o.type == 'MESH'); auth.name = 'Dinocephalosaurus authored body'
bpy.context.view_layer.objects.active = auth

# ---- intake surgery ---------------------------------------------------------------------------
# Weld the texture-seam duplicates (the raw file is 11,032 loose-UV vertices over one shell) and
# drop any detached flake.  This body arrives as a single closed component once welded.
bm = bmesh.new(); bm.from_mesh(auth.data); bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bm.verts.ensure_lookup_table(); seen = set(); components = []
for v in bm.verts:
    if v in seen: continue
    stack = [v]; seen.add(v); part = []
    while stack:
        q = stack.pop(); part.append(q)
        for e in q.link_edges:
            w = e.other_vert(q)
            if w not in seen: seen.add(w); stack.append(w)
    components.append(part)
removed = sum(len(c) for c in components if len(c) < 8)
for c in components:
    if len(c) < 8: bmesh.ops.delete(bm, geom=c, context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(auth.data); bm.free()
source_triangles = len(auth.data.polygons); source_components = len(components)


def smooth(t):
    t = max(0., min(1., t)); return t * t * (3 - 2 * t)


# ---- the neck's own centreline, measured off the surface ----------------------------------------
# Geodesic distance from the snout bands the surface into rings whose centroids are the axis of
# whatever tube they lie on.  This is the one measurement everything about the neck depends on.
def geodesic():
    bmx = bmesh.new(); bmx.from_mesh(auth.data); bmx.verts.ensure_lookup_table()
    adj = {v.index: [(e.other_vert(v).index, e.calc_length()) for e in v.link_edges] for v in bmx.verts}
    pos = {v.index: np.array(v.co[:]) for v in bmx.verts}; bmx.free()

    def run(s):
        dist = {k: 1e18 for k in adj}; dist[s] = 0.; pq = [(0., s)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u] + 1e-12: continue
            for w, l in adj[u]:
                nd = d + l
                if nd < dist[w] - 1e-12: dist[w] = nd; heapq.heappush(pq, (nd, w))
        return dist
    tail = min(pos, key=lambda k: pos[k][0])
    return run(max(run(tail).items(), key=lambda kv: kv[1])[0]), pos


D, POS = geodesic()
maxd = max(D.values()); bins = [[] for _ in range(BANDS)]
for k, d in D.items(): bins[min(BANDS - 1, int(d / maxd * BANDS))].append(POS[k])
raw_line = []
for i, b in enumerate(bins):
    if len(b) < 3: continue
    a = np.array(b); c = a.mean(0)
    raw_line.append([(i + .5) / BANDS * maxd, c, float(np.linalg.norm(a - c, axis=1).mean())])
line = [raw_line[0]] + [[raw_line[i][0], (raw_line[i - 1][1] + 2 * raw_line[i][1] + raw_line[i + 1][1]) / 4, raw_line[i][2]]
                        for i in range(1, len(raw_line) - 1)] + [raw_line[-1]]
band = [r for r in line if HEAD_GEO - 1e-9 <= r[0] <= SHOULDER_GEO + 1e-9][::-1]   # shoulder -> head
P = [Vector(r[1]) for r in band]; NECK_R = [r[2] for r in band]
SEG = [(P[i + 1] - P[i]).length for i in range(len(P) - 1)]
CUMN = [0.]
for s in SEG: CUMN.append(CUMN[-1] + s)
NECK_ARC = CUMN[-1]


def frames(pts, n0=None):
    """Parallel-transported frames: the roll a curve carries when nothing twists it."""
    T = [(pts[i + 1] - pts[i]).normalized() for i in range(len(pts) - 1)]
    up = Vector((0, 0, 1))
    N = [n0.copy() if n0 else (up - T[0] * T[0].dot(up)).normalized()]
    for i in range(1, len(T)):
        axis = T[i - 1].cross(T[i]); n = N[-1].copy()
        if axis.length > 1e-9: n.rotate(Matrix.Rotation(T[i - 1].angle(T[i]), 4, axis.normalized()))
        N.append((n - T[i] * T[i].dot(n)).normalized())
    return T, N, [T[i].cross(N[i]) for i in range(len(T))]


TP, NP, BP = frames(P)
neck_turning = sum(math.degrees(TP[i].angle(TP[i + 1])) for i in range(len(TP) - 1))
_roc = []
for i in range(len(TP) - 1):
    s = 0.; a = 0.; j = i
    while j < len(TP) - 1 and s < .06:
        s += SEG[j]; a += TP[j].angle(TP[j + 1]); j += 1
    if a > 1e-6 and s > .03: _roc.append(s / a)
neck_section = float(np.median(NECK_R))

# ---- the roll, read off the animal's own countershading ------------------------------------------
mat = auth.data.materials[0]
colnode = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name == 'sRGB')
im = colnode.image
pixels = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
uv = auth.data.uv_layers.active
src_bvh = BVHTree.FromPolygons([v.co.copy() for v in auth.data.vertices],
                               [p.vertices[:] for p in auth.data.polygons], all_triangles=False)


def hit_uv(loc, idx):
    poly = auth.data.polygons[idx]
    if len(poly.vertices) != 3: return None
    pv = [auth.data.vertices[j].co for j in poly.vertices]
    qv = [Vector((*uv.data[j].uv, 0)) for j in poly.loop_indices]
    return barycentric_transform(loc, pv[0], pv[1], pv[2], qv[0], qv[1], qv[2])


ROLL_AROUND = 64
dorsal_deg = []; dorsal_strength = []
for i in range(len(TP)):
    c = (P[i] + P[i + 1]) / 2; lum = []; angs = []
    for k in range(ROLL_AROUND):
        th = k * 2 * pi / ROLL_AROUND
        hit = src_bvh.ray_cast(c, NP[i] * cos(th) + BP[i] * sin(th), .16)
        if hit[0] is None: continue
        s = hit_uv(hit[0], hit[2])
        if s is None: continue
        h, w = pixels.shape[:2]
        rgb = pixels[int((float(s.y) % 1) * h) % h, int((float(s.x) % 1) * w) % w, :3]
        lum.append(float(.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2])); angs.append(th)
    if len(lum) < ROLL_AROUND * .7:
        dorsal_deg.append(None); dorsal_strength.append(0.); continue
    a = np.array(lum); dark = a.mean() - a
    vx = float(np.sum(dark * np.cos(angs))); vy = float(np.sum(dark * np.sin(angs)))
    dorsal_deg.append(math.degrees(math.atan2(vy, vx)))
    dorsal_strength.append(math.hypot(vx, vy) / max(1e-9, float(np.abs(dark).sum())))
_ref = next(r for r in dorsal_deg if r is not None)
_fill = [(r if r is not None else _ref) for r in dorsal_deg]
_unwrapped = [((r - _fill[0] + 180) % 360) - 180 for r in _fill]
_sm = [_unwrapped[0]] + [(_unwrapped[i - 1] + 2 * _unwrapped[i] + _unwrapped[i + 1]) / 4 for i in range(1, len(_unwrapped) - 1)] + [_unwrapped[-1]]
roll_report = {'stations': len(TP), 'meanHarmonicStrength': round(float(np.mean(dorsal_strength)), 3),
               'dorsalDriftAcrossNeckDeg': round(max(_sm) - min(_sm), 1),
               'dorsalAngleAtShoulderDeg': round(_fill[0], 1),
               'dorsalAngleInTransportFrameDeg': [round(r, 1) for r in _sm]}
assert roll_report['meanHarmonicStrength'] > .3, ('the countershading is too weak to read a roll from', roll_report)

# ---- the target axis: leave the shoulder as the neck does, ease to level -------------------------
# A cubic Hermite from the shoulder, starting along the neck's own tangent so its root section is
# not rotated at all, ending level and on the body's midline.  It is then resampled at exactly the
# posed centreline's own arc positions, so every segment keeps its length and nothing stretches.
S = P[0].copy(); U0 = TP[0].copy(); U1 = Vector((1, 0, .05)).normalized()


def hermite(h):
    E = S + U1 * h + Vector((0, -S.y, 0)); m0 = U0 * (h * 1.05); m1 = U1 * (h * 1.05)
    pts = []
    for k in range(801):
        t = k / 800.; t2 = t * t; t3 = t2 * t
        pts.append(S * (2 * t3 - 3 * t2 + 1) + m0 * (t3 - 2 * t2 + t) + E * (-2 * t3 + 3 * t2) + m1 * (t3 - t2))
    cum = [0.]
    for k in range(800): cum.append(cum[-1] + (pts[k + 1] - pts[k]).length)
    return pts, cum


lo, hi = NECK_ARC * .5, NECK_ARC * 1.3
for _ in range(60):
    mid = (lo + hi) / 2; _, cum = hermite(mid)
    if cum[-1] < NECK_ARC: lo = mid
    else: hi = mid
CURVE, CCUM = hermite((lo + hi) / 2)
assert abs(CCUM[-1] - NECK_ARC) < 1e-4, (CCUM[-1], NECK_ARC)


def on_curve(s):
    k = int(np.searchsorted(CCUM, s)); k = max(1, min(len(CCUM) - 1, k))
    t = (s - CCUM[k - 1]) / max(1e-12, CCUM[k] - CCUM[k - 1])
    return CURVE[k - 1] + (CURVE[k] - CURVE[k - 1]) * t


Q = [on_curve(s) for s in CUMN]
TQ, NQ, BQ = frames(Q, NP[0])
# Roll the target frames so the measured dorsal lands on the curve's own up at every station,
# tapered to nothing over the first tenth of the neck so the root section stays exactly where the
# generation put it and the shoulder seam cannot open.
for i in range(len(TQ)):
    up = Vector((0, 0, 1)); up = (up - TQ[i] * TQ[i].dot(up)).normalized()
    rho = math.degrees(math.atan2(up.dot(BQ[i]), up.dot(NQ[i])))
    delta = (rho - _sm[i]) * smooth(CUMN[i] / (.10 * NECK_ARC))
    n = NQ[i].copy(); n.rotate(Matrix.Rotation(math.radians(delta), 4, TQ[i]))
    NQ[i] = n; BQ[i] = TQ[i].cross(n)


def framed(T, N, B, C, i):
    return Matrix(((T[i].x, N[i].x, B[i].x, C[i].x), (T[i].y, N[i].y, B[i].y, C[i].y),
                   (T[i].z, N[i].z, B[i].z, C[i].z), (0, 0, 0, 1)))


HEAD_M = framed(TQ, NQ, BQ, Q, len(TQ) - 1) @ framed(TP, NP, BP, P, len(TP) - 1).inverted()


def carry(v):
    """The Placodus rigid carry: nearest posed segment, same offset, target frame."""
    best = (1e9, 0, 0.)
    for i in range(len(P) - 1):
        a = P[i]; d = P[i + 1] - a
        t = max(0., min(1., (v - a).dot(d) / d.length_squared)); dist = (v - (a + d * t)).length
        if dist < best[0]: best = (dist, i, t)
    _, i, t = best; off = v - (P[i] + (P[i + 1] - P[i]) * t)
    return Q[i] + (Q[i + 1] - Q[i]) * t + TQ[i] * off.dot(TP[i]) + NQ[i] * off.dot(NP[i]) + BQ[i] * off.dot(BP[i])


# The generation's own pose, kept aside before anything is unbent. It is what the roster's
# portraits are rendered from -- the reviewer asked for the animal's initial generated pose in any
# still, and for the straightened body as the base the animations are built on, and those are two
# different jobs for two different shapes. It carries no rig, no jaw cut and no mouth interior:
# it is a still, at rest, with the mouth closed, and the material is the same datablock as the
# shipped body's, so it is lit and shaded identically. It is written to the workbench, never to
# public/, because it is a camera subject and not a delivery.
posed = auth.copy(); posed.data = auth.data.copy()
posed.name = 'Dinocephalosaurus generated pose'; bpy.context.collection.objects.link(posed)
posed_head = np.array([auth.data.vertices[k].co[:] for k in D if D[k] < HEAD_GEO])
neck_move = 0.
if UNBEND:
    for k, g in D.items():
        v = auth.data.vertices[k]
        q = HEAD_M @ v.co if g < HEAD_GEO else (carry(v.co) if g <= SHOULDER_GEO else None)
        if q is None: continue
        neck_move = max(neck_move, (q - v.co).length); v.co = q
new_head = np.array([auth.data.vertices[k].co[:] for k in D if D[k] < HEAD_GEO])
unbending = {'applied': UNBEND, 'neckArc': round(NECK_ARC, 4),
             'neckAxialExtentPosed': round(abs(P[-1].x - P[0].x), 4),
             'neckArcOverAxialExtent': round(NECK_ARC / abs(P[-1].x - P[0].x), 2),
             'neckTotalTurningDeg': round(neck_turning, 1),
             'neckMedianSectionRadius': round(neck_section, 4),
             'neckMinCurvatureRadius': round(min(_roc), 4),
             'neckMinCurvatureRadiusOverSection': round(min(_roc) / neck_section, 2),
             'neckMeanCurvatureRadius': round(NECK_ARC / math.radians(neck_turning), 4),
             'neckMeanCurvatureRadiusOverSection': round(NECK_ARC / math.radians(neck_turning) / neck_section, 2),
             'maxVertexMove': round(neck_move, 4),
             'headCentroidBefore': [round(float(x), 4) for x in posed_head.mean(0)],
             'headCentroidAfter': [round(float(x), 4) for x in new_head.mean(0)],
             'targetAxisStartTangent': [round(float(x), 4) for x in U0],
             'targetAxisEndTangent': [round(float(x), 4) for x in U1], 'roll': roll_report}

# ---- the tail: the same carry, on a much gentler curve -------------------------------------------
# The generated tail is swept 0.21 of a body length out of the midline; the greenlit pose is not.
# It turns 29 degrees against the neck's 283 and its curvature radius is twenty-odd times its own
# thickness, so this is the easy half of the same correction.
TAIL_X0 = -.215
CAUDAL = [(-.215, -.045, -.097), (-.2287, -.0472, -.0950), (-.2828, -.0806, -.0867), (-.3386, -.1156, -.0772),
          (-.3922, -.1516, -.0623), (-.4395, -.1984, -.0537), (-.4700, -.2260, -.0520), (-.4922, -.2440, -.0510)]
CUR = [Vector(p) for p in CAUDAL]; TGT = [CUR[0].copy()]
for i in range(len(CUR) - 1):
    d = CUR[i + 1] - CUR[i]; run = math.sqrt(max(0., d.length_squared - d.z * d.z))
    TGT.append(TGT[-1] + Vector((-run, 0, d.z)))
CF = frames(CUR); TF = frames(TGT)
tail_turning = sum(math.degrees(CF[0][i].angle(CF[0][i + 1])) for i in range(len(CF[0]) - 1))
tail_arc = sum((CUR[i + 1] - CUR[i]).length for i in range(len(CUR) - 1))
tail_section = .045          # measured mid-caudal section radius, for the like-for-like comparison


def unbend_tail(v):
    best = (1e9, 0, 0.)
    for i in range(len(CUR) - 1):
        a = CUR[i]; d = CUR[i + 1] - a
        t = max(0., min(1., (v - a).dot(d) / d.length_squared)); dist = (v - (a + d * t)).length
        if dist < best[0]: best = (dist, i, t)
    _, i, t = best; off = v - (CUR[i] + (CUR[i + 1] - CUR[i]) * t)
    q = (TGT[i] + (TGT[i + 1] - TGT[i]) * t + TF[0][i] * off.dot(CF[0][i])
         + TF[1][i] * off.dot(CF[1][i]) + TF[2][i] * off.dot(CF[2][i]))
    return v + (q - v) * smooth((TAIL_X0 - v.x) / .06)


before = np.array([v.co[:] for v in auth.data.vertices]); tail_move = 0.
if STRAIGHTEN_TAIL:
    for v in auth.data.vertices:
        if v.co.x < TAIL_X0:
            q = unbend_tail(v.co); tail_move = max(tail_move, (q - v.co).length); v.co = q
after = np.array([v.co[:] for v in auth.data.vertices]); tipmask = before[:, 0] < -.46
straightening = {'applied': STRAIGHTEN_TAIL, 'maxVertexMove': round(tail_move, 4),
                 'totalTurningDeg': round(tail_turning, 1), 'arc': round(tail_arc, 4),
                 'meanCurvatureRadius': round(tail_arc / math.radians(tail_turning), 4),
                 'meanCurvatureRadiusOverSection': round(tail_arc / math.radians(tail_turning) / tail_section, 2),
                 'tipLateralMeanBefore': round(float(before[tipmask][:, 1].mean()), 4),
                 'tipLateralMeanAfter': round(float(after[tipmask][:, 1].mean()), 4), 'stations': len(CAUDAL)}
if STRAIGHTEN_TAIL: assert abs(straightening['tipLateralMeanAfter']) < .06, straightening

xs = np.array([v.co.x for v in auth.data.vertices])
raw_length = float(xs.max() - xs.min()); SCALE = TARGET_LENGTH / raw_length

# ---- how deep inside the finished surface a point sits, which is what seats every root -----------
inside = BVHTree.FromPolygons([v.co.copy() for v in auth.data.vertices],
                              [p.vertices[:] for p in auth.data.polygons], all_triangles=False)


def depth(p):
    loc, nor, idx, dist = inside.find_nearest(Vector(p))
    return dist * (-1 if (Vector(p) - loc).dot(nor) > 0 else 1)


def seat(p, toward, margin=.022):
    """Pull a root radially in towards the trunk's own axis until it is `margin` inside the skin.
    A paddle whose root sits on or outside the flank reads as a fin floating beside the body."""
    q = Vector(p); c = Vector(toward)
    for _ in range(60):
        if depth(q) >= margin: return tuple(q)
        d = c - q
        if d.length < 1e-6: return tuple(q)
        q = q + d.normalized() * .004
    raise AssertionError(('cannot seat a root inside the body', p, depth(q)))

# ---- material: keep the source albedo, neutral white COLOR_0, restrained relief -------------------
mat.name = 'Dinocephalosaurus body pigmentation'
# The source material culls its backfaces, which is right for a closed shell and wrong for this
# one: cutting the jaw off leaves both halves open along the mouth, so a culled skin is a hole an
# open gape looks straight out of. There is no lining on this head (see the mouth section below):
# the inside of the skin **is** what an open mouth shows here, so the skin is double-sided, and it
# costs the runtime nothing but a little overdraw inside the head.
mat.use_backface_culling = False
bs = mat.node_tree.nodes.get('Principled BSDF')
layer = auth.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for item in layer.data: item.color = (1, 1, 1, 1)
for link in list(mat.node_tree.links):
    if link.to_node == bs and link.to_socket.name in ['Metallic', 'Roughness']: mat.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value = 0; bs.inputs['Roughness'].default_value = .7
for n in mat.node_tree.nodes:
    if n.type == 'NORMAL_MAP': n.inputs['Strength'].default_value = .15


def sample_albedo(u, v):
    h, w = pixels.shape[:2]; x = (float(u) % 1) * w - .5; y = (float(v) % 1) * h - .5
    x0 = math.floor(x); y0 = math.floor(y); fx = x - x0; fy = y - y0
    rgb = (pixels[y0 % h, x0 % w, :3] * (1 - fx) * (1 - fy) + pixels[y0 % h, (x0 + 1) % w, :3] * fx * (1 - fy)
           + pixels[(y0 + 1) % h, x0 % w, :3] * (1 - fx) * fy + pixels[(y0 + 1) % h, (x0 + 1) % w, :3] * fx * fy)
    linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    return (*[float(c) for c in linear], 1.)


# ---- procedural twin: resurface the measured occupancy volume -------------------------------------
# Regenerated topology, not a decimation: no source vertex or face survives the remesh.  The voxel
# has to be fine enough for a neck of radius 0.053 to survive as a neck, which is what sets it.
puppet = auth.copy(); puppet.data = auth.data.copy(); bpy.context.collection.objects.link(puppet)
puppet.name = 'Dinocephalosaurus procedural volume puppet'; bpy.context.view_layer.objects.active = puppet
puppet.data.remesh_voxel_size = .0050; puppet.data.remesh_voxel_adaptivity = 0; puppet.data.use_remesh_preserve_volume = True
bpy.ops.object.voxel_remesh()
mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH'); mod.factor = .45; mod.iterations = 1
bpy.ops.object.modifier_apply(modifier=mod.name)
remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)
PUPPET_BUDGET = 6400
mod = puppet.modifiers.new('Puppet topology budget', 'DECIMATE'); mod.ratio = min(1., PUPPET_BUDGET / max(1, remesh_triangles))
bpy.ops.object.modifier_apply(modifier=mod.name)
puppet_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)

bvh = BVHTree.FromPolygons([v.co for v in auth.data.vertices], [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
if puppet.data.color_attributes.get('Color'): puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
pl = puppet.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for v in puppet.data.vertices:
    hit = bvh.find_nearest(v.co); s = hit_uv(hit[0], hit[2])
    pl.data[v.index].color = sample_albedo(s.x, s.y) if s else (.4, .4, .38, 1.)
pmat = bpy.data.materials.new('Dinocephalosaurus puppet body'); pmat.use_nodes = True
pbs = pmat.node_tree.nodes.get('Principled BSDF'); pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor'); pvc.layer_name = 'Color'
pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
pbs.inputs['Roughness'].default_value = .76; pbs.inputs['Metallic'].default_value = 0
puppet.data.materials.clear(); puppet.data.materials.append(pmat)
for p in puppet.data.polygons: p.material_index = 0

# ---- shared skeleton --------------------------------------------------------------------------
def tx(p):
    x, y, z = p; return Vector((y * SCALE, -x * SCALE, z * SCALE))


B = {}


def bone(n, p, parent): B[n] = (Vector(p), parent)


bone('root', (0, 0, 0), None)
bone('body', (-.020, 0, -.105), 'root')
bone('chest', (.160, 0, -.092), 'body')
# Thirty-two cervicals, evenly spaced along the unbent neck axis by arc length.
NECK_PTS = [on_curve(NECK_ARC * i / CERVICALS) for i in range(CERVICALS)]
NECK_NAMES = ['neck_%02d' % i for i in range(CERVICALS)]
for i, p in enumerate(NECK_PTS): bone(NECK_NAMES[i], p, 'chest' if i == 0 else NECK_NAMES[i - 1])
SKULL = Q[-1].copy()
# ---- the head's own frame, measured off the head ---------------------------------------------
# The neck's last frame is not the head's axis: a head sits on the end of a neck at its own angle,
# and hanging the mouth interior off the neck's tangent put the palate and the fangs beside the
# snout instead of inside it. Slab the moved head along the neck's tangent, take the slab
# centroids, and fit the head's real axis and radius profile through them.
_hd = np.array(new_head); _t = (_hd - np.array(SKULL)) @ np.array(TQ[-1])
_lo, _hi = float(_t.min()), float(_t.max()); NSLAB = 14
_cent = []; _rad = []
for j in range(NSLAB):
    a0 = _lo + (_hi - _lo) * j / NSLAB; a1 = _lo + (_hi - _lo) * (j + 1) / NSLAB
    m = (_t >= a0) & (_t < a1 + (1e-9 if j == NSLAB - 1 else 0))
    if m.sum() < 6: continue
    _cent.append(_hd[m].mean(0)); _rad.append(_hd[m])
_C = np.array(_cent); _mean = _C.mean(0)
_u, _s, _vt = np.linalg.svd(_C - _mean)
HEAD_DIR = Vector(_vt[0] * (1 if float(_vt[0] @ np.array(TQ[-1])) > 0 else -1))
HEAD_UP = (NQ[-1] - HEAD_DIR * NQ[-1].dot(HEAD_DIR)).normalized(); HEAD_SIDE = HEAD_DIR.cross(HEAD_UP)
_proj = [(Vector(c) - Vector(_mean)).dot(HEAD_DIR) for c in _cent]
HEAD_P0 = Vector(_mean) + HEAD_DIR * min(_proj)
HEAD_LEN = float(np.max([(Vector(p) - HEAD_P0).dot(HEAD_DIR) for p in new_head]))
# Section radius at each slab, perpendicular to the fitted axis: the head tapers from where it
# leaves the neck to the point of the snout, and everything inside the mouth is a fraction of it.
HEAD_PROFILE = []
for c, pts in zip(_cent, _rad):
    d = pts - np.array(HEAD_P0); a = d @ np.array(HEAD_DIR)
    perp = d - np.outer(a, np.array(HEAD_DIR))
    HEAD_PROFILE.append((float(a.mean() / HEAD_LEN), float(np.linalg.norm(perp, axis=1).mean())))
HEAD_PROFILE.sort()
bone('skull', tuple(SKULL), NECK_NAMES[-1])


def head_r(a):
    u = max(HEAD_PROFILE[0][0], min(HEAD_PROFILE[-1][0], a / HEAD_LEN))
    for i in range(len(HEAD_PROFILE) - 1):
        x0, r0 = HEAD_PROFILE[i]; x1, r1 = HEAD_PROFILE[i + 1]
        if x0 <= u <= x1: return r0 + (r1 - r0) * (u - x0) / (x1 - x0)
    return HEAD_PROFILE[-1][1]


# ---- the mouth, measured off the head rather than assumed ---------------------------------------
# Placodus' cavity method does not reach this animal: casting every head vertex's own normal back
# into the mesh finds *nothing* (0 vertices against Placodus' 120-plus), because this generation
# has no modelled slit at all -- the snout is one smooth closed tube and the mouth is painted on
# it. So the mouth is read off the albedo instead, which is the technique this build already
# trusts for the neck's roll, and for the same reason: the animal's own colouring is the only
# measurement there is.
def head_local_raw(c):
    d = Vector(c) - HEAD_P0; return d.dot(HEAD_DIR), d.dot(HEAD_UP), d.dot(HEAD_SIDE)


HEAD_BVH = BVHTree.FromPolygons([v.co.copy() for v in auth.data.vertices],
                                [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
HEAD_AROUND = 96


def head_ring(a, up, side):
    """Every surface hit round one head station, with the albedo luminance at each."""
    c = HEAD_P0 + HEAD_DIR * a; rows = []
    for k in range(HEAD_AROUND):
        th = k * 2 * pi / HEAD_AROUND
        hit = HEAD_BVH.ray_cast(c, up * cos(th) + side * sin(th), .12)
        if hit[0] is None: continue
        s = hit_uv(hit[0], hit[2])
        if s is None: continue
        h, w = pixels.shape[:2]
        rgb = pixels[int((float(s.y) % 1) * h) % h, int((float(s.x) % 1) * w) % w, :3]
        rows.append((th, Vector(hit[0]), float(.2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2])))
    return rows


# The head's roll was inherited from the neck's parallel-transport normal, which this build already
# knows drifts 117.6 degrees from the measured dorsal across the neck -- so the frame the whole
# mouth was built in was rolled most of a right angle, and the jaw was being cut off the side of
# the snout. Measure the head's own dorsal the way the neck's is measured: the first circular
# harmonic of the darkness round each station, which for a countershaded animal points at the back.
_hv = [0., 0.]; _hstr = []
for _j in range(20):
    _rows = head_ring(HEAD_LEN * (_j + .5) / 20., HEAD_UP, HEAD_SIDE)
    if len(_rows) < HEAD_AROUND * .6: continue
    _L = np.array([r[2] for r in _rows]); _dark = _L.mean() - _L
    _vx = float(np.sum(_dark * np.cos([r[0] for r in _rows])))
    _vy = float(np.sum(_dark * np.sin([r[0] for r in _rows])))
    _hv[0] += _vx; _hv[1] += _vy; _hstr.append(math.hypot(_vx, _vy) / max(1e-9, float(np.abs(_dark).sum())))
HEAD_ROLL = math.atan2(_hv[1], _hv[0])
head_roll_report = {'stations': len(_hstr), 'meanHarmonicStrength': round(float(np.mean(_hstr)), 3),
                    'inheritedFrameRollErrorDeg': round(math.degrees(HEAD_ROLL), 1)}
assert head_roll_report['meanHarmonicStrength'] > .3, ('the head has no countershading to roll on', head_roll_report)
HEAD_UP = (HEAD_UP * cos(HEAD_ROLL) + HEAD_SIDE * sin(HEAD_ROLL)).normalized()
HEAD_SIDE = HEAD_DIR.cross(HEAD_UP)

# ---- the mouth line, read off the same colouring -------------------------------------------------
# With the frame square the pale belly runs from about 110 to 250 degrees round every station, and
# the light/dark boundary on each flank is the lip. Crossing height per station, both sides averaged
# (this animal is not symmetric: the two flanks disagree by about a tenth of a radius), lightly
# smoothed along the head, is the seam the jaw is cut on. It replaces a straight ramp at a fixed
# -0.38 of the local radius, which was the shape assumed rather than measured.
SEAM_STATIONS = 24
_sa = []; _sn = []; _sides = []
for _j in range(SEAM_STATIONS):
    _a = HEAD_LEN * (_j + .5) / SEAM_STATIONS
    _rows = head_ring(_a, HEAD_UP, HEAD_SIDE)
    if len(_rows) < HEAD_AROUND * .6: continue
    _L = np.array([r[2] for r in _rows]); _lo, _hi = float(np.percentile(_L, 8)), float(np.percentile(_L, 92))
    if _hi - _lo < .12: continue
    _mid = (_lo + _hi) / 2; _found = []
    # Outwards from the belly, not inwards from the back: the pale belly is one solid block and the
    # step off it is sharp, where the dark back is mottled and crossed mid-value several times.
    for _end in (0, 2 * pi):
        _q = sorted([r for r in _rows if min(_end, pi) <= r[0] <= max(_end, pi)], key=lambda r: abs(r[0] - pi))
        if not _q or _q[0][2] < _mid: continue
        for _i in range(1, len(_q)):
            if _q[_i][2] < _mid <= _q[_i - 1][2]:
                _d = _q[_i][2] - _q[_i - 1][2]
                _t = 0. if abs(_d) < 1e-9 else max(0., min(1., (_mid - _q[_i - 1][2]) / _d))
                _found.append(float((_q[_i - 1][1] + (_q[_i][1] - _q[_i - 1][1]) * _t - HEAD_P0).dot(HEAD_UP)))
                break
    if len(_found) != 2: continue
    _sa.append(_a); _sn.append(sum(_found) / 2); _sides.append(abs(_found[0] - _found[1]))
assert len(_sa) >= SEAM_STATIONS * .6, ('the mouth line did not measure', len(_sa))
_sn = [_sn[0]] + [(_sn[i - 1] + 2 * _sn[i] + _sn[i + 1]) / 4 for i in range(1, len(_sn) - 1)] + [_sn[-1]]
SEAM_A = np.array(_sa); SEAM_N = np.array(_sn)
HINGE_A = .30 * HEAD_LEN                           # along the head axis, back of the tooth row
# The jaw is cut with planes, so what the cut can follow is a ramp; the measurement's job is to say
# which ramp. Least squares over the jaw's own run, and the build refuses a fit that leaves the
# measured line further from it than a fifth of the local radius -- which is the check Placodus'
# straight ramp would have failed, its residual being a whole chisel deep.
_fitm = (SEAM_A >= HINGE_A)
_fit = np.polyfit(SEAM_A[_fitm], SEAM_N[_fitm], 1)
SEAM_SLOPE = float(_fit[0]); SEAM0 = float(np.polyval(_fit, HINGE_A))
_resid = [(float(a), float(n - np.polyval(_fit, a)), float(head_r(a))) for a, n in zip(SEAM_A[_fitm], SEAM_N[_fitm])]
_worst = max(_resid, key=lambda r: abs(r[1] / r[2]))
mouth_report = {'stations': len(SEAM_A), 'headRoll': head_roll_report,
                'seam': [[round(float(a), 5), round(float(n), 5)] for a, n in zip(SEAM_A, SEAM_N)],
                'seamOverLocalRadius': [round(float(n / max(1e-9, head_r(a))), 3) for a, n in zip(SEAM_A, SEAM_N)],
                'flankDisagreementMaxRaw': round(float(max(_sides)), 5),
                'rampAtHinge': round(SEAM0, 5), 'rampSlope': round(SEAM_SLOPE, 4),
                'rampResidualMaxRaw': round(abs(_worst[1]), 5),
                'rampResidualMaxOverLocalRadius': round(abs(_worst[1] / _worst[2]), 3)}
assert mouth_report['rampResidualMaxOverLocalRadius'] < .20, ('the mouth line is not a ramp', mouth_report)
print('MOUTH_SEAM', json.dumps(mouth_report))
# The hinge sits just under the measured mouth line and is then seated towards the head's own axis,
# because a snout this slender leaves very little head under the seam to hang a pivot in.
JAW_PT = Vector(seat(HEAD_P0 + HEAD_DIR * HINGE_A + HEAD_UP * (SEAM0 - .22 * head_r(HINGE_A)),
                     tuple(HEAD_P0 + HEAD_DIR * HINGE_A), margin=.015))
bone('jaw', tuple(JAW_PT), 'skull')
TAIL_PTS = [tuple(TGT[i]) for i in [0, 1, 2, 3, 4, 5, 6, 7]][:CAUDALS]
for i, p in enumerate(TAIL_PTS): bone('tail_%02d' % i, p, 'body' if i == 0 else 'tail_%02d' % (i - 1))
LIMB_TIPS = {'foreL': (.298, .269, -.229), 'foreR': (.280, -.249, -.365),
             'hindL': (-.167, .309, -.375), 'hindR': (-.106, -.309, -.226)}
LIMB_ROOTS = {k: seat(p, (.160, 0, -.092) if k.startswith('fore') else (-.020, 0, -.105)) for k, p in
              {'foreL': (.200, .075, -.115), 'foreR': (.200, -.075, -.125),
               'hindL': (-.060, .070, -.115), 'hindR': (-.060, -.070, -.115)}.items()}
LIMB_PTS = {}
for key in LIMB_TIPS:
    a = Vector(LIMB_ROOTS[key]); b = Vector(LIMB_TIPS[key])
    LIMB_PTS[key] = [tuple(a + (b - a) * t) for t in (0., .36, .68, 1.)]
LIMBS = {}
for key, pts in LIMB_PTS.items():
    kind = 'fore' if key.startswith('fore') else 'hind'; s = key[-1]
    names = [kind + '_upper_' + s, kind + '_lower_' + s, kind + '_paddle_' + s]
    LIMBS[key] = (pts, names)
    for i, n in enumerate(names): bone(n, pts[i], ('chest' if kind == 'fore' else 'body') if i == 0 else names[i - 1])

# ---- polylines: arc length is the skinning parameter, so weight bands stay square to the body -----
def poly(pts):
    Pp = [Vector(p) for p in pts]; cum = [0.]
    for i in range(1, len(Pp)): cum.append(cum[-1] + (Pp[i] - Pp[i - 1]).length)
    return Pp, cum


def project(Pp, cum, q):
    best = (1e9, 0.)
    for i in range(len(Pp) - 1):
        a = Pp[i]; d = Pp[i + 1] - a; L2 = d.length_squared
        t = 0. if L2 < 1e-12 else max(0., min(1., (q - a).dot(d) / L2))
        dist = (q - (a + d * t)).length
        if dist < best[0]: best = (dist, cum[i] + t * d.length)
    return best


AXIAL_PTS = ([tuple(TGT[-1])] + [tuple(p) for p in reversed(TAIL_PTS)] + [(-.020, 0, -.105), (.160, 0, -.092)]
             + [tuple(p) for p in NECK_PTS] + [tuple(SKULL), tuple(HEAD_P0 + HEAD_DIR * (HEAD_LEN + .02))])
AXIAL_NAMES = (['tail_%02d' % i for i in range(CAUDALS - 1, -1, -1)] + ['body', 'chest'] + NECK_NAMES + ['skull'])
AP, ACUM = poly(AXIAL_PTS)
ASTATION = [(AXIAL_NAMES[i - 1], ACUM[i]) for i in range(1, len(AXIAL_NAMES) + 1)]
NECK_S0 = ACUM[1 + CAUDALS + 2]                  # arc position of neck_00 on the axial polyline
NECK_S1 = ACUM[1 + CAUDALS + 2 + CERVICALS - 1]


def axial(s):
    if s <= ASTATION[0][1]: return {ASTATION[0][0]: 1.}
    if s >= ASTATION[-1][1]: return {ASTATION[-1][0]: 1.}
    for i in range(len(ASTATION) - 1):
        a, b = ASTATION[i], ASTATION[i + 1]
        if a[1] <= s <= b[1]:
            t = (s - a[1]) / (b[1] - a[1]); return {a[0]: 1 - t, b[0]: t}
    return {ASTATION[-1][0]: 1.}


def neck_radius_at(s):
    """Section radius of the neck at axial arc position s, from the measured banding."""
    u = max(0., min(1., (s - NECK_S0) / max(1e-9, NECK_S1 - NECK_S0))) * (len(NECK_R) - 1)
    i = min(len(NECK_R) - 2, int(u)); return NECK_R[i] + (NECK_R[i + 1] - NECK_R[i]) * (u - i)


LIMBFIT = {}
for key, (pts, names) in LIMBS.items():
    Pp, cum = poly(pts); LIMBFIT[key] = (Pp, cum, names, axial(project(AP, ACUM, Pp[0])[1]))
RADII = {'fore': (.030, .036, .070, .058), 'hind': (.030, .036, .070, .058)}   # r_in0,r_in1,r_out0,r_out1
SEAT = .060


def limbchain(names, s, cum):
    b = .024
    tl = smooth((s - (cum[1] - b)) / (2 * b)); tp = smooth((s - (cum[2] - b)) / (2 * b))
    return {names[0]: 1 - tl, names[1]: tl * (1 - tp), names[2]: tl * tp}


def weights(p):
    q = Vector(p); dist_ax, s_ax = project(AP, ACUM, q); w = dict(axial(s_ax))
    # A vertex whose nearest axial point is on the neck but which is nowhere near the neck is trunk:
    # without this the shoulders follow the cervical chain and the chest swings with the head.
    if NECK_S0 - .02 <= s_ax <= NECK_S1 + .02:
        r = neck_radius_at(s_ax); g = smooth((dist_ax - 1.5 * r) / (1.3 * r))
        if g > 0:
            w = {n: v * (1 - g) for n, v in w.items()}; w['chest'] = w.get('chest', 0) + g
    best = 0.; chosen = None
    for key, (Pp, cum, names, rootw) in LIMBFIT.items():
        dist, s = project(Pp, cum, q); t = s / cum[-1]; r = RADII[key[:4]]
        rin = r[0] + r[1] * t * t; rout = r[2] + r[3] * t * t
        if dist >= rout: continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / (rout - rin))) * smooth(s / SEAT)
        if alpha > best: best = alpha; chosen = (limbchain(names, s, cum), rootw, t)
    if chosen:
        limb, rootw, t = chosen; base = {}
        for n, v in w.items(): base[n] = base.get(n, 0) + v * (1 - t)
        for n, v in rootw.items(): base[n] = base.get(n, 0) + v * t
        w = {n: v * (1 - best) for n, v in base.items()}
        for n, v in limb.items(): w[n] = w.get(n, 0) + v * best
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]; total = sum(v for _, v in items)
    return {n: v / total for n, v in items}


# ---- seating audit: every appendage root and the jaw hinge must sit inside the intake surface -----
seating = {}
for key, (pts, names) in LIMBS.items(): seating[names[0]] = round(depth(pts[0]), 4)
seating['jaw'] = round(depth(JAW_PT), 4); seating['neck_00'] = round(depth(NECK_PTS[0]), 4)
seating['skull'] = round(depth(SKULL), 4); seating['chest'] = round(depth((.160, 0, -.092)), 4)
for n, d in seating.items(): assert d > .012, ('appendage root outside the body', n, d)

# ---- cut a true articulated lower jaw ------------------------------------------------------------
# Worked in the head's own frame, which after the unbend runs along the target axis: a is distance
# forward of the skull joint, n is up and b is across.
def head_local(c):
    d = Vector(c) - HEAD_P0; return d.dot(HEAD_DIR), d.dot(HEAD_UP), d.dot(HEAD_SIDE)


# The mouth seam stays a straight line in this frame, because the jaw is cut with planes; SEAM0 and
# SEAM_SLOPE are now the least-squares fit to the mouth line measured off the albedo above, rather
# than a fixed fraction of the local radius assumed at both ends.
def seam_n(a): return SEAM0 + SEAM_SLOPE * (a - HINGE_A)


def is_jaw(c):
    a, n, b = head_local(c)
    return a > HINGE_A and n < seam_n(a) - 1e-7


parts = {}


def split(o, label, test, plane=None):
    if plane:
        bmx = bmesh.new(); bmx.from_mesh(o.data)
        for co, no in plane:
            bmesh.ops.bisect_plane(bmx, geom=list(bmx.verts) + list(bmx.edges) + list(bmx.faces), dist=1e-7,
                                   plane_co=co, plane_no=no, clear_inner=False, clear_outer=False)
        bmx.to_mesh(o.data); bmx.free()
    part = o.copy(); part.data = o.data.copy(); part.name = o.name + ' ' + label; bpy.context.collection.objects.link(part)
    for target, keep in [(o, False), (part, True)]:
        bmx = bmesh.new(); bmx.from_mesh(target.data)
        discard = [f for f in bmx.faces if test(f.calc_center_median()) != keep]
        bmesh.ops.delete(bmx, geom=discard, context='FACES')
        loose = [v for v in bmx.verts if not v.link_faces]
        if loose: bmesh.ops.delete(bmx, geom=loose, context='VERTS')
        bmx.to_mesh(target.data); bmx.free()
    parts.setdefault(label, {})[o.name] = part
    return part


for o in [auth, puppet]:
    split(o, 'lower jaw', is_jaw,
          plane=[(tuple(HEAD_P0 + HEAD_DIR * HINGE_A), tuple(HEAD_DIR)),
                 (tuple(HEAD_P0 + HEAD_DIR * HINGE_A + HEAD_UP * SEAM0), tuple((HEAD_UP - HEAD_DIR * SEAM_SLOPE).normalized()))])

arm = bpy.data.armatures.new('Dinocephalosaurus shared skeleton'); rig = bpy.data.objects.new('Dinocephalosaurus_Rig', arm)
bpy.context.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for n, (p, parent) in B.items():
    eb = arm.edit_bones.new(n); eb.head = tx(p); eb.tail = eb.head + Vector((0, .16, 0))
    if parent: eb.parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
influences = []
for o in [auth, puppet]:
    for n in B: o.vertex_groups.new(name=n)
    for v in o.data.vertices:
        w = weights(v.co); influences.append(len(w))
        for n, val in w.items(): o.vertex_groups[n].add([v.index], val, 'REPLACE')
    for v in o.data.vertices: v.co = tx(v.co)
    for p in o.data.polygons: p.use_smooth = True
    mod = o.modifiers.new('Shared articulated skeleton', 'ARMATURE'); mod.object = rig; o.parent = rig
for o in parts['lower jaw'].values():
    g = o.vertex_groups.new(name='jaw'); g.add(list(range(len(o.data.vertices))), 1., 'REPLACE')
    for v in o.data.vertices: v.co = tx(v.co)
    for p in o.data.polygons: p.use_smooth = True
    mo = o.modifiers.new('Rigid jaw', 'ARMATURE'); mo.object = rig; o.parent = rig

# ---- mouth interior: the fang trap ---------------------------------------------------------------
toothmat = bpy.data.materials.new('Dinocephalosaurus fangs'); toothmat.use_nodes = True
tbs = toothmat.node_tree.nodes.get('Principled BSDF')
tbs.inputs['Base Color'].default_value = (.78, .74, .64, 1); tbs.inputs['Roughness'].default_value = .30
toothmat.diffuse_color = (.78, .74, .64, 1)
oralparts = []


def rigid(o, bonename, material):
    o.location = (0, 0, 0); o.data.materials.clear(); o.data.materials.append(material)
    g = o.vertex_groups.new(name=bonename); g.add(list(range(len(o.data.vertices))), 1, 'REPLACE')
    o.parent = rig; mo = o.modifiers.new('Jaw articulation', 'ARMATURE'); mo.object = rig
    for p in o.data.polygons: p.use_smooth = True
    oralparts.append(o); return o


def head_point(a, n, b): return HEAD_P0 + HEAD_DIR * a + HEAD_UP * n + HEAD_SIDE * b


# **No lining, no palate, no floor.** One sac whose wall stretched between the two jaws stood here
# (26 stations by 14, roof on the skull, floor on the jaw, 364 vertices every one of them blended
# between the two bones), and it was the era's mouthful of gum on this head as on every other. The
# first question `CLAUDE.md` asks of a mouth is whether it needs filling at all, and on this head
# the answer is measured rather than assumed: `gape-solid.py` at the peak gape of `Bite`, `Attack`,
# `Heavy`, `Eat` and `NeckStrike`, with and without the backface-cull shim, against the shipped
# body with the sac in place, with the sac stripped out, and with the sac and the hinge tissue
# both stripped out.
#
#   sac in place ................ 0 px seen through the body at every shot
#   sac removed ................. 0, 2, 3, 1, 1 px (tolerance 12)
#   sac and hinge tissue removed  98, 87, 113, 50, 101 px
#
# So the sac closed nothing: what the cut leaves open is the head's cross-section at the hinge --
# the back wall of the mouth, which a plane cut through a closed head takes away -- and the seated
# hinge tissue below already fills it, as it does on every jawed body in the era. This generation
# paints its lip on a closed snout and models no cavity (the normals-cast method found zero
# vertices; the lip was read off the albedo), so there is no lumen wall for a gape to open onto:
# what an open mouth shows is the inside of the skin, double-sided, and the fangs between the jaws.
# The verdict and its counts are on the record in `docs/triassic/throat-repairs/oral-verdicts.md`.
# The fang trap: a long slender snout of interlocking conical teeth, the front pair the largest.
for label, lift, bonename, sgnz in [('Upper fangs', .0026, 'skull', -1), ('Lower fangs', -.0024, 'jaw', 1)]:
    verts = []; faces = []
    for k in range(9):
        a = HINGE_A + .012 + (HEAD_LEN - HINGE_A - .022) * (k / 8.) ** 1.05
        h = (.42 if k < 2 else .30) * head_r(a)
        rad = .13 * head_r(a)
        off = .40 * head_r(a)
        for sgn in (1, -1):
            base = len(verts); apex = head_point(a, seam_n(a) + lift + sgnz * h, sgn * off)
            for j in range(6):
                th = j * 2 * pi / 6
                verts.append(tx(head_point(a + rad * cos(th), seam_n(a) + lift, sgn * off + rad * sin(th))))
            verts.append(tx(apex))
            for j in range(6): faces.append((base + j, base + (j + 1) % 6, base + 6))
    me = bpy.data.meshes.new(label); me.from_pydata(verts, [], faces); me.update()
    o = bpy.data.objects.new(label, me); bpy.context.collection.objects.link(o); rigid(o, bonename, toothmat)
# A closed cheek envelope around the actual hinge, so no membrane stretches across the gape.
bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10,
                                     location=tx(head_point(HINGE_A, -.15 * head_r(HINGE_A), 0)))
_hr = head_r(HINGE_A) * SCALE
o = bpy.context.object; o.name = 'Seated jaw hinge tissue'; o.scale = (_hr * .80, _hr * .68, _hr * .60)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in o.data.vertices: v.co = o.matrix_world @ v.co
o.location = (0, 0, 0)
hm = bpy.data.materials.new('Dinocephalosaurus jaw hinge body'); hm.use_nodes = True
hbs = hm.node_tree.nodes.get('Principled BSDF'); hbs.inputs['Base Color'].default_value = (.30, .28, .24, 1)
hbs.inputs['Roughness'].default_value = .7; hm.diffuse_color = (.30, .28, .24, 1)
o.data.materials.clear(); o.data.materials.append(hm)
for n in ['skull', 'jaw']: o.vertex_groups.new(name=n)
_hinge_mid = tx(head_point(HINGE_A, -.15 * head_r(HINGE_A), 0))
for v in o.data.vertices:
    t = max(0., min(1., (_hinge_mid.z - v.co.z) / (.030 * SCALE)))
    o.vertex_groups['jaw'].add([v.index], t * .5, 'REPLACE'); o.vertex_groups['skull'].add([v.index], 1 - t * .5, 'REPLACE')
for p in o.data.polygons: p.use_smooth = True
mo = o.modifiers.new('Hinge skin', 'ARMATURE'); mo.object = rig; o.parent = rig; oralparts.append(o)

# ---- the mouth interior must be inside the mouth ---------------------------------------------------
# `inside` is the closed intake surface, before the jaw was cut out of it, so a palate, a fang or a
# hinge blob that has drifted out of the head reads here as a negative depth. The first build of
# this head hung the whole mouth off the neck's last frame rather than the head's own, and every
# oral part floated beside the snout; nothing in the numbers said so until this was added.
oral_depth = {}
for o in oralparts:
    # tx() maps raw (x, y, z) to Blender (y, -x, z); this is its inverse.
    d = min(depth(Vector((-v.co.y, v.co.x, v.co.z)) / SCALE) for v in o.data.vertices)
    oral_depth[o.name] = round(d, 4)
    assert d > .0005, ('a mouth part is outside the head', o.name, d)

# ---- measured comparison of the two actual surfaces ------------------------------------------------
AUTH_GROUP = [auth, parts['lower jaw'][auth.name]]
PUP_GROUP = [puppet, parts['lower jaw'][puppet.name]]


def merged(group):
    verts = []; polys = []
    for o in group:
        base = len(verts); verts.extend(v.co.copy() for v in o.data.vertices)
        polys.extend(tuple(base + j for j in q.vertices) for q in o.data.polygons)
    return verts, polys


pv = BVHTree.FromPolygons(*merged(PUP_GROUP))
distances = [pv.find_nearest(v)[3] for v in merged(AUTH_GROUP)[0]]
surface_outliers = int(sum(1 for d in distances if d > .15))
assert max(distances) < .30, max(distances)
assert float(np.quantile(distances, .95)) < .06, float(np.quantile(distances, .95))


def section(objects, y):
    points = []
    for o in objects:
        for e in o.data.edges:
            a, b = [o.data.vertices[j].co for j in e.vertices]
            if (a.y - y) * (b.y - y) <= 0 and abs(a.y - b.y) > 1e-8: points.append(a + (b - a) * ((y - a.y) / (b.y - a.y)))
    if not points: return None
    a = np.array(points); return {'min': a.min(0).tolist(), 'max': a.max(0).tolist()}


profile = []; worst = 0.
ylo = min(min(v.co.y for v in o.data.vertices) for o in AUTH_GROUP)
yhi = max(max(v.co.y for v in o.data.vertices) for o in AUTH_GROUP)
model_length = float(yhi - ylo)
TOL = .04 * model_length
for y in np.linspace(ylo + .02, yhi - .02, 21):
    row = {'stationY': float(y)}
    for label, group in [('authored', AUTH_GROUP), ('puppet', PUP_GROUP)]: row[label] = section(group, y)
    if row['authored'] and row['puppet']:
        row['maximumEnvelopeDifference'] = max(abs(a - b) for k in ['min', 'max'] for a, b in zip(row['authored'][k], row['puppet'][k]))
        worst = max(worst, row['maximumEnvelopeDifference']); assert row['maximumEnvelopeDifference'] < TOL, row
    profile.append(row)
open(os.path.join(HERE, 'dinocephalosaurus-profile.json'), 'w').write(json.dumps({
    'method': '21 exact plane-intersection envelopes of both actual meshes (body and lower jaw); 0.0050 raw-space voxel occupancy resurfacing',
    'bodyLength': model_length, 'stations': profile, 'maximumEnvelopeDifference': worst,
    'envelopeTolerance': TOL, 'envelopeTolerancePercent': 4.,
    'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceOutliersOver0p15': surface_outliers, 'seatingDepthRaw': seating,
    'neckUnbending': unbending, 'tailStraightening': straightening}, indent=2))

# ---- performance -----------------------------------------------------------------------------------
scene = bpy.context.scene; scene.render.fps = 30; rig.animation_data_create()
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'


def reset():
    for q in rig.pose.bones: q.rotation_euler = (0, 0, 0); q.location = (0, 0, 0); q.scale = (1, 1, 1)


AMP = {'Idle': .30, 'Swim': 1., 'Sprint': 1.5, 'Eat': .25, 'Guard': .18, 'Breathe': .35, 'Breath': .6,
       'Dodge': 1.1, 'Ability': .3, 'Grab': .3, 'Growth': .4, 'NeckStrike': .3, 'Periscope': .28}
seams = {}; bounds = {}
# Every neck coefficient in the performance is a total angle for the whole chain; NK is what turns
# one into a per-joint rotation, so the shapes below sum to about what they say they do.
NK = 2. / CERVICALS
for clip, duration in CLIPS.items():
    a = bpy.data.actions.new(clip); a.use_fake_user = True; rig.animation_data.action = a
    last = round(duration * 30); first = None
    for f in range(last + 1):
        reset(); u = f / last; p = 2 * pi * u; e = sin(pi * u) ** 2; loop = clip in LOOPS
        env = 1 if loop else e; pb = rig.pose.bones
        wave = lambda lag=0, freq=1: (sin(p * freq - lag) - sin(-lag)) * env
        pulse = lambda c, k: ((1 + cos(p - 2 * pi * c)) / 2) ** k
        sbump = lambda x, y: (sin(pi * (u - x) / (y - x)) ** 2 if x < u < y else 0.)

        # A bump that RUNS DOWN THE CHAIN: joint `ph` starts it `lead * ph` of the clip after the
        # shoulder does, so the shape arrives at the skull last. `sharp` above 1 narrows the bump
        # in place, which is what makes a strike read as committed rather than as a swell. Safe in
        # a looping clip as long as u0 + w + lead <= 1, because it is then zero at both ends.
        def runs(u0, w, lead, ph, sharp=1.):
            # The bump must have finished at the skull end by the end of the clip, or the last
            # frame does not match the first and the clip cannot be blended out of.
            assert u0 >= 0. and u0 + w + lead <= 1. + 1e-9, ('a travelling bump outruns the clip', clip, u0, w, lead)
            x = (u - u0 - lead * ph) / w
            return (sin(pi * x) ** 2) ** sharp if 0. < x < 1. else 0.

        def peristalsis(u0, w, lead, ph):
            """A travelling BULGE rather than a travelling bend: each joint goes one way and then
            the other as the wave passes it, so the chain's net curvature stays about where it was
            and what reads is a swelling moving along the neck. The same bump with one sign bends
            the whole neck progressively instead, which on a swallow reads as the head being
            dropped under the chest."""
            assert u0 >= 0. and u0 + w + lead <= 1. + 1e-9, ('a travelling bulge outruns the clip', clip)
            x = (u - u0 - lead * ph) / w
            return sin(2 * pi * x) if 0. < x < 1. else 0.

        amp = AMP.get(clip, .25)
        peak = sin(pi * (u - .24) / .4) ** 2 if .24 < u < .64 else 0
        wind = sin(pi * u / .28) ** 2 if u < .28 else 0
        dead = smooth(u) if clip == 'Death' else 0
        locomotor = clip in ['Swim', 'Sprint']
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ['TurnLeft', 'TurnRight'] else 0
        if clip == 'Death': amp *= 1 - dead
        # ---- jaw.  A fang trap opens wide and shuts on a fish; there is nothing to chew.
        opening = .010 * (1 - cos(p)) if loop else 0
        if clip == 'Eat': opening = .34 * pulse(.16, 3) + .10 * pulse(.62, 5)
        # The gape is timed to the strike rather than to the button: it parts on the cock, is widest
        # as the neck unrolls, and shuts on the follow-through, which is the frame the fish is in.
        if clip == 'Bite': opening = .10 * sbump(0, .16) + .50 * sbump(.10, .64) + .06 * sbump(.66, 1.)
        if clip == 'Attack': opening = .12 * sbump(0, .30) + .50 * sbump(.26, .68) + .06 * sbump(.70, 1.)
        if clip == 'Heavy': opening = .14 * sbump(0, .34) + .56 * sbump(.30, .74) + .06 * sbump(.76, 1.)
        if clip == 'Ability': opening = .12 * sbump(0, .26) + .48 * sbump(.22, .64) + .05 * sbump(.66, 1.)
        if clip == 'NeckStrike': opening = .12 * sbump(0, .34) + .52 * sbump(.32, .72) + .06 * sbump(.74, 1.)
        if clip == 'Grab': opening = .16 + .05 * sin(p)
        if clip == 'Periscope': opening = .03 * pulse(.5, 6)
        if clip == 'Breathe': opening = .06 * pulse(.28, 6) + .06 * pulse(.70, 6)
        if clip == 'Breath': opening = .18 * peak
        opening += .22 * dead
        pb['jaw'].rotation_euler.x = opening; pb['skull'].rotation_euler.x = -.05 * opening
        body = pb['body']
        # ---- axial engine.  A long body undulating, the four paddles rowing, and never fast.
        for i in range(CAUDALS):
            q = pb['tail_%02d' % i]
            if locomotor: q.rotation_euler.z = (.052 + .0350 * i) * amp * sin(p - i * .46)
            else: q.rotation_euler.z = (.018 + .0080 * i) * amp * wave(i * .45) + turn * (.018 + .0090 * i) + dead * .030 * sin(i * .58)
            if clip == 'Dodge': q.rotation_euler.z += .10 * e * sin(i * .62 + .5)
            if clip in ['Dive', 'Rise']: q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .030 * e * (1 + .13 * i)
            if clip == 'Death': q.rotation_euler.x += .026 * dead * sin(i * .45)
        # ---- the neck.  Thirty-two joints, and every one of them works.  Every coefficient below
        # is a TOTAL angle in radians for the whole cervical chain, spread over the joints by its
        # own shape and divided out by NK -- because a per-joint number on a chain this long is a
        # trap: a tenth of a radian each would swing the head through two body lengths.
        for i in range(CERVICALS):
            n = pb[NECK_NAMES[i]]; ph = i / (CERVICALS - 1.)
            lag = ph * 2.4; yaw = 0.; pit = 0.
            if locomotor:
                # the neck trails the trunk's own wave, damped towards the head so the skull is steady
                yaw += .042 * amp * (1 - .78 * ph) * sin(p - 1.2 - lag * .35)
                pit += .050 * amp * (1 - .60 * ph) * sin(p - 1.9 - lag * .30)
            else:
                yaw += .060 * amp * wave(lag) + turn * .34 * (1 - .35 * ph)
                pit += .040 * amp * wave(lag + .7)
            if clip in ['Dive', 'Rise']: pit += (1 if clip == 'Dive' else -1) * .45 * e * (1 - .3 * ph)
            if clip == 'Dodge':
                # The head goes first and the rest of the chain follows it out of the way, so the
                # dodge reads as the animal taking its head off the line rather than sliding.
                yaw += .55 * e * sin(2.2 * ph + .4) + 1.15 * runs(0., .42, .26, 1. - ph, 1.4)
                pit += -.45 * runs(.02, .40, .24, 1. - ph)
            if clip in ['Hit', 'Stagger']:
                yaw += .50 * e * sin(p * (1 if clip == 'Hit' else 2) - lag * .5)
                pit += .30 * e * sin(p * 2 - lag * .4)
            if clip == 'Death':
                yaw += dead * .70 * sin(1.9 * ph + .6); pit += dead * .45 * (1 - .5 * ph)
            if clip == 'Guard':
                # The neck folds back over the shoulder, which is the only cover this animal has --
                # but folded is also cocked, so it is held as a loaded S with the head drawn back
                # and up over the withers, breathing rather than merely tucked away.
                yaw += .90 * sin(pi * ph) * (1 - .2 * ph) * (.4 + .6 * e) + .34 * sin(pi * ph * 2.1) * (.5 + .5 * e)
                pit += .30 * e * (1 - ph) - .55 * (1 - .3 * ph) * (.55 + .45 * e) + .07 * sin(p - lag * .5)
            if clip == 'Parry': yaw += .50 * e * sin(2.6 * ph)
            if clip in ['Attack', 'Heavy']:
                # This animal is a neck with a body attached, so an attack is the neck's: it cocks
                # back into an S with the head drawn up over the shoulders, holds for a beat, then
                # unrolls head-last and drives the skull forward and down, overshoots past straight
                # and gathers. Anticipation, a fast committed strike, follow-through, recovery --
                # not a lash bolted onto a sine.
                big = clip == 'Heavy'
                ck = sbump(0, .36 if big else .32)                            # the cock
                dr = runs(.30 if big else .26, .34, .24, ph, 1.7)             # the drive, travelling
                ov = runs(.56 if big else .50, .24, .18, ph)                  # follow-through
                st = sbump(.80 if big else .74, 1.)                           # gather
                pit += (-.70 if big else -.58) * ck * (1 - .30 * ph) \
                    + (.95 if big else .78) * dr * (1 - .22 * ph) \
                    + (.22 if big else .18) * ov * (1 - .5 * ph) - .12 * st * (1 - ph)
                yaw += (-.62 if big else -.52) * ck * sin(pi * ph * 1.25) \
                    + (1.60 if big else 1.34) * dr * (1 - .18 * ph) \
                    - (.34 if big else .28) * ov * sin(pi * ph) - .20 * st * sin(pi * ph * .8)
            if clip in ['Ability', 'NeckStrike']:
                # The hunting strike. The chain loads into a deep lateral S with the head carried
                # back and high, unrolls it head-last, and the skull is thrown through the target
                # and down; then the S re-forms the other way as the neck comes back, which is the
                # recovery reading as a recovery. NeckStrike is the longer, deeper performance and
                # Ability the roster's tighter one -- a different take, not the same clip twice.
                long_ = clip == 'NeckStrike'
                load = sbump(0, .40 if long_ else .34)
                hold = sbump(.30 if long_ else .26, .46 if long_ else .40)
                go = runs(.34 if long_ else .28, .32, .28, ph, 1.6)
                thr = runs(.44 if long_ else .38, .28, .26, ph)
                back = sbump(.68 if long_ else .62, 1.)
                # The sweep is large on purpose -- this is the animal's hunting kit -- but the throw
                # is kept short of curling the head back under the shoulder: a neck that wraps round
                # its own chest reads as a knot rather than as a strike.
                yaw += -(.92 if long_ else .78) * load * sin(pi * ph * 1.3) \
                    + (1.78 if long_ else 1.58) * go * (1 - .22 * ph) \
                    - (.30 if long_ else .26) * back * sin(pi * ph * 1.15)
                pit += -(.80 if long_ else .66) * load * (1 - .30 * ph) - .24 * hold * (1 - ph) \
                    + (.72 if long_ else .62) * thr * (1 - .20 * ph) \
                    - (.14 if long_ else .12) * back * (1 - .4 * ph)
            if clip == 'Bite':
                # Half a second, so the whole of it is the snap: a short sharp cock and a stab.
                pit += -.34 * sbump(0, .24) * (1 - .4 * ph) + .78 * runs(.14, .26, .18, ph, 2.) * (1 - .25 * ph)
                yaw += -.22 * sbump(0, .22) * sin(pi * ph) + .50 * runs(.16, .26, .18, ph, 1.8)
            if clip == 'Eat':
                # A piscivore does not chew: it throws the fish back and swallows it, and on a neck
                # this long the swallow is a bolus you can watch travel. The toss is head-up at the
                # front of the loop; the bolus then runs the other way, skull to shoulder.
                # The old clip held the head a long way down for the whole loop, which buried the
                # swallow: at NK the 0.45 baseline is most of a right angle of neck.
                pit += .16 - .80 * pulse(.16, 3) * (1 - .30 * ph) \
                    + 1.05 * peristalsis(.30, .34, .34, 1. - ph) + .10 * sin(p * 2 - lag * .3)
                yaw += .22 * peristalsis(.28, .32, .32, 1. - ph) * sin(pi * ph) + .12 * sin(p - lag * .5)
            if clip == 'Grab':
                # Holding something that does not want to be held: the neck is braced back and hauls
                # in heaves, with a worrying shake running out to the head between them.
                pit += -.44 * (1 - .4 * ph) + .34 * sin(p * 2 - lag * .35) + .14 * sin(p * 4 - lag * .6)
                yaw += .55 * sin(p * 2 - lag * .9) + .26 * sin(p * 4 - lag * 1.4)
            if clip == 'Periscope':
                # head up, body level: the column stands and then sways along its length
                pit += -1.25 * (1 - .25 * ph) + .14 * sin(p - lag * .5); yaw += .18 * sin(p - lag * .8)
            if clip in ['Breath', 'Breathe']:
                pit += ((-.80 * e) if clip == 'Breath' else (-.62 - .14 * sin(p))) * (1 - .3 * ph)
                yaw += .12 * sin(p - lag * .6)
            if clip == 'Growth': pit += -.30 * e * (1 - .4 * ph)
            if clip == 'Idle': pit += .12 * (1 - .4 * ph) * sin(p - lag * .5)
            n.rotation_euler.z = yaw * NK; n.rotation_euler.x = pit * NK
        # ---- the trunk and the paddles
        if locomotor:
            body.rotation_euler.z = -.022 * amp * sin(p + .38); body.rotation_euler.y = .024 * amp * sin(p + 1.05)
            pb['chest'].rotation_euler.z = .009 * amp * sin(p + .95)
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1; hind = key.startswith('hind')
                up, lo_, pad = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x = (.10 if hind else .16) + .34 * amp * sin(p - (1.1 if hind else .5))
                up.rotation_euler.y = s * (-.12 + .16 * amp * sin(p - (1.3 if hind else .7)))
                up.rotation_euler.z = s * (.06 + .10 * amp * sin(p - (1.4 if hind else .8)))
                lo_.rotation_euler.x = .16 * amp * sin(p - (1.5 if hind else .9))
                pad.rotation_euler.y = s * (.22 * amp * sin(p - (1.9 if hind else 1.3)))
                pad.rotation_euler.x = .14 * amp * sin(p - (2.1 if hind else 1.5))
        else:
            body.rotation_euler.y = .020 * amp * wave(.3); body.location.z = .07 * amp * wave(.2)
            body.rotation_euler.z = .17 * turn; body.rotation_euler.y += .09 * turn
            pb['chest'].rotation_euler.z = .016 * amp * wave(.5) + .060 * turn
            if clip in ['Dive', 'Rise']:
                d = 1 if clip == 'Dive' else -1
                body.rotation_euler.x = d * .24 * e; pb['chest'].rotation_euler.x = d * .08 * e
            # The trunk shifts its weight behind the neck rather than doing the striking: back on
            # the cock, forward as the chain unrolls.
            if clip == 'Attack':
                body.location.y = .09 * sbump(0, .32) - .28 * sbump(.26, .70)
                body.rotation_euler.x = .05 * sbump(0, .32) - .08 * sbump(.26, .70)
            if clip == 'Heavy':
                body.location.y = .14 * sbump(0, .36) - .38 * sbump(.30, .76)
                body.rotation_euler.x = .09 * sbump(0, .36) - .12 * sbump(.30, .76)
                body.rotation_euler.z = -.06 * sbump(0, .36) + .10 * sbump(.30, .76)
            if clip == 'Bite': body.location.y = .04 * sbump(0, .24) - .12 * sbump(.14, .62)
            if clip == 'Parry': body.rotation_euler.y = .26 * e; body.rotation_euler.z = .12 * e; body.location.z = -.16 * e
            if clip == 'Guard': body.location.z = -.16 - .03 * (1 - cos(p)); body.rotation_euler.x = .03 * (1 - cos(p))
            if clip == 'Dodge': body.rotation_euler.y = .34 * e; body.rotation_euler.z = -.26 * e; body.location.x = .34 * e; body.location.z = .26 * e
            if clip in ['Hit', 'Stagger']:
                body.rotation_euler.z = .14 * e * sin(p * (1 if clip == 'Hit' else 2)); body.rotation_euler.y = .17 * e
                body.location.y = .09 * e; body.location.z = -.09 * e
            if clip == 'Breath': body.rotation_euler.x = -.14 * e; body.location.z = .40 * e
            if clip == 'Breathe': body.rotation_euler.x = -.10; body.location.z = .30 + .12 * sin(p)
            if clip == 'Periscope': body.rotation_euler.x = .02 * sin(p); body.location.z = .10 + .05 * sin(p)
            if clip == 'Ability': body.location.y = -.10 * e; body.rotation_euler.z = -.06 * sbump(.1, .6)
            if clip == 'NeckStrike': body.location.y = -.06 * sbump(.3, .8); body.rotation_euler.z = -.05 * sbump(.2, .7)
            if clip == 'Eat': body.rotation_euler.x = .07 + .02 * sin(p * 2); body.location.z = -.20
            if clip == 'Grab': body.location.y = .14 * e; body.rotation_euler.z = .05 * e * sin(p * 3)
            if clip == 'Growth': body.rotation_euler.x = -.05 * e; body.rotation_euler.y = .04 * e; body.location.z = .30 * e
            if clip == 'Death':
                body.rotation_euler.y += 1.15 * dead; body.rotation_euler.x += .10 * dead; body.location.z -= .50 * dead
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1; hind = key.startswith('hind'); lag = (pi if hind else 0) + (.12 if s < 0 else 0)
                up, lo_, pad = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x = .14 * amp * wave(lag) + (-.24 if clip == 'Guard' else 0) - .20 * dead
                up.rotation_euler.y = s * (.09 * amp * wave(lag + pi / 2) + (.22 if clip == 'Guard' else 0) + .18 * dead)
                up.rotation_euler.z = s * .06 * amp * wave(lag + .4)
                lo_.rotation_euler.x = .10 * amp * wave(lag + .7) + (.20 if clip == 'Guard' else 0) - .12 * dead
                pad.rotation_euler.x = .09 * amp * wave(lag + 1.3) + .09 * dead
                pad.rotation_euler.y = s * .07 * amp * wave(lag + 1.1)
                if clip in ['Dive', 'Rise']:
                    d = 1 if clip == 'Dive' else -1
                    if not hind: up.rotation_euler.x += -d * .26 * e; up.rotation_euler.y += s * .18 * e
                if turn:
                    up.rotation_euler.x += (.26 if (s > 0) == (turn < 0) else -.10) * abs(turn); up.rotation_euler.y += s * .14 * abs(turn)
                if clip == 'Dodge': up.rotation_euler.x += (.40 if s > 0 else -.14) * e; up.rotation_euler.y += s * .22 * e
                if clip in ['Attack', 'Heavy']: up.rotation_euler.x += .14 * wind - .22 * peak
                if clip in ['Ability', 'NeckStrike']: up.rotation_euler.x += .12 * sbump(0, .5) - .10 * sbump(.4, .9)
                if clip == 'Grab': up.rotation_euler.x += .26 * e; lo_.rotation_euler.x += .16 * e
                if clip == 'Growth': up.rotation_euler.y -= s * .20 * e
                if clip in ['Periscope', 'Breathe']:
                    up.rotation_euler.x = .18 + .12 * sin(p + (pi if hind else 0)); up.rotation_euler.y = s * (-.12)
                if clip == 'Breath': up.rotation_euler.x += .22 * e; up.rotation_euler.y += s * (-.10 * e)
        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0: first = state.copy()
        if f == last: seams[clip] = float(abs(state - first).max())
        for q in pb:
            if q.name != 'root': q.keyframe_insert('rotation_euler', frame=f)
            if q.name == 'body': q.keyframe_insert('location', frame=f)
    points = []
    for f in np.linspace(0, last, 13):
        scene.frame_set(int(f)); dg = bpy.context.evaluated_depsgraph_get()
        for o in AUTH_GROUP + PUP_GROUP + oralparts:
            ev = o.evaluated_get(dg); me = ev.to_mesh(); co = np.array([v.co[:] for v in me.vertices])
            assert np.isfinite(co).all(); points.extend([co.min(0), co.max(0)]); ev.to_mesh_clear()
    bounds[clip] = [np.array(points).min(0).tolist(), np.array(points).max(0).tolist()]; rig.animation_data.action = None
for c in set(CLIPS) - {'Death'}: assert seams[c] < 1e-6, (c, seams[c])
reset(); scene.frame_set(0)
anchors = [
    {'name': 'anchor_mouth', 'bone': 'jaw', 'point': list(tx(head_point(HEAD_LEN - .006, seam_n(HEAD_LEN) - .004, 0))), 'role': 'mouth'},
    {'name': 'anchor_mouth_inside', 'bone': 'skull', 'point': list(tx(head_point(HINGE_A + .022, seam_n(HINGE_A + .022) + .004, 0))), 'role': 'swallow'},
    {'name': 'anchor_attack_primary', 'bone': 'skull', 'point': list(tx(head_point(HEAD_LEN + .004, seam_n(HEAD_LEN), 0))), 'role': 'attack'}]
sockets = []
for a in anchors:
    o = bpy.data.objects.new(a['name'], None); bpy.context.collection.objects.link(o); o.parent = rig
    o.parent_type = 'BONE'; o.parent_bone = a['bone']; o.matrix_world.translation = Vector(a['point'])
    o['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}; sockets.append(o)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2))

kwargs = dict(export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
              export_force_sampling=True, export_frame_range=False, export_skins=True, export_normals=True, export_texcoords=True,
              export_materials='EXPORT', export_vertex_color='NAME', export_vertex_color_name='Color', export_yup=True, export_extras=True)


def patch(path):
    raw = open(path, 'rb').read(); n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n]); binary = raw[20 + n:]
    nodes = g['nodes']; parents = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}

    def world(i):
        no = nodes[i]; q = no.get('rotation', [0, 0, 0, 1])
        m = Matrix(np.array(no['matrix']).reshape(4, 4).T.tolist()) if 'matrix' in no else Matrix.LocRotScale(
            Vector(no.get('translation', [0, 0, 0])), Quaternion((q[3], q[0], q[1], q[2])), Vector(no.get('scale', [1, 1, 1])))
        return world(parents[i]) @ m if i in parents else m
    for a in anchors:
        i = next(k for k, nd in enumerate(nodes) if nd.get('name') == a['name'])
        b = next(k for k, nd in enumerate(nodes) if nd.get('name') == a['bone'])
        pt = a['point']; pt = Vector((pt[0], pt[2], -pt[1])); local = world(b).inverted() @ pt
        if i in parents: nodes[parents[i]]['children'].remove(i)
        nodes[b].setdefault('children', []).append(i)
        nodes[i] = {'name': a['name'], 'translation': list(local),
                    'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'], 'parentBone': a['bone']}}}
    for an in g['animations']:
        an['channels'] = [c for c in an['channels'] if c['target']['path'] != 'scale' and nodes[c['target']['node']].get('name') != 'root']
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
for group, suffix in [(AUTH_GROUP, ''), (PUP_GROUP, '.puppet')]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, ID + suffix + '.glb'), **kwargs); patch(os.path.join(OUT, ID + suffix + '.glb'))
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

# The generated pose, in the same units and axes as the delivery, for the portrait camera.
for v in posed.data.vertices: v.co = tx(v.co)
for p in posed.data.polygons: p.use_smooth = True
posed_bounds = [[round(float(f([v.co[i] for v in posed.data.vertices])), 4) for i in range(3)] for f in (min, max)]
bpy.ops.object.select_all(action='DESELECT'); posed.select_set(True); bpy.context.view_layer.objects.active = posed
os.makedirs(LOCAL, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(LOCAL, ID + '.posed.glb'),
                          **{**kwargs, 'export_animations': False, 'export_skins': False})

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)
meta = {'id': ID, 'name': 'Dinocephalosaurus', 'species': 'Dinocephalosaurus orientalis',
        'description': 'The generated Tripo body unbent out of its pose and its procedural volume twin on one 57-joint rig: thirty-two cervicals, an articulated fang-trap jaw, four paddles and an undulating tail.',
        'modelLength': round(model_length, 4), 'lengthMeters': 5.5, 'locomotion': 'Swim',
        'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
        'puppet': 'dinocephalosaurus.puppet.glb',
        'notes': [
            'The neck is the generation\'s own: every generated vertex, its UVs and the source albedo are kept. Intake unbends it by carrying each cross-section rigidly from its measured centreline frame onto a target axis of the same segment lengths, so no section is stretched, sheared or thinned and the neck\'s arc length, depth and width survive exactly. UNBEND=False in build.py rebuilds the generated pose.',
            'The roll of that carry is measured off the animal\'s own countershading rather than fitted: a round section is rotationally ambiguous, so the dark-back/pale-belly seam is what says which way is up. Parallel transport disagrees with the colour by up to %.0f degrees across this neck.' % unbending['roll']['dorsalDriftAcrossNeckDeg'],
            'The target axis leaves the shoulder along the neck\'s own tangent and eases to level, so the root section is not rotated and the trunk is never disturbed.',
            'Thirty-two cervical joints, as Spiekman et al. 2024 count them. Every clip drives the chain as a travelling curve with a per-joint lag; the neck does not pivot at its base.',
            'The generated tail was swept 0.21 of a body length out of the midline and is unbent by the same carry on a far gentler curve.',
            'The twin resurfaces a 0.0050-unit voxel occupancy field, relaxes it and reduces the new topology. It reuses no source vertex or face.',
            'Same rest rig, inverse binds, sockets and all %d action sample arrays for authored body and puppet. The LOD keeps every clip.' % len(CLIPS),
            'Original albedo retained with white COLOR_0; normal relief limited to 0.15 and skin explicitly nonmetallic at roughness 0.7.',
            'Living colours, soft tissues and movements are artistic reconstruction. Ability is the roster\'s 1.0 s neck strike; NeckStrike is the longer hunting version, Periscope the held head-up column, Breathe the settled surface loop. Locomotor translation remains engine-owned.']}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2))
report = {'sourceSha256': hashlib.sha256(open(RAW, 'rb').read()).hexdigest(),
          'sourceTriangles': source_triangles, 'sourceComponents': source_components, 'removedFlakeVertices': removed,
          'remeshTriangles': remesh_triangles, 'puppetBudget': PUPPET_BUDGET,
          'fullTriangles': authored_tris, 'puppetTriangles': puppet_tris,
          'parts': {'authoredBody': tri(auth), 'authoredJaw': tri(AUTH_GROUP[1]),
                    'puppetBody': tri(puppet), 'puppetJaw': tri(PUP_GROUP[1]),
                    'sharedOral': sum(tri(o) for o in oralparts)},
          'bones': len(B), 'cervicals': CERVICALS, 'caudals': CAUDALS, 'clips': CLIPS, 'looping': LOOPS,
          'loopSeams': seams, 'boundsAt13Phases': bounds, 'scale': SCALE, 'rawLength': raw_length,
          'modelLength': model_length, 'maximumEnvelopeDifference': worst, 'envelopeTolerance': TOL, 'envelopeTolerancePercent': 4.,
          'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
          'surfaceDistanceP99': float(np.quantile(distances, .99)), 'surfaceOutliersOver0p15': surface_outliers,
          'surfaceVertices': len(distances), 'seatingDepthRaw': seating,
          'maxInfluences': max(influences), 'meanInfluences': float(np.mean(influences)),
          'neckUnbending': unbending, 'tailStraightening': straightening,
          'mouth': mouth_report, 'posedPortraitBounds': posed_bounds,
          'headAxis': {'origin': [round(float(x), 4) for x in HEAD_P0], 'direction': [round(float(x), 4) for x in HEAD_DIR],
                       'length': round(HEAD_LEN, 4), 'profile': [[round(a, 3), round(r, 4)] for a, r in HEAD_PROFILE],
                       'hingeAlongHead': round(HINGE_A, 4)},
          'oralPartDepthInsideHead': oral_depth,
          'oralGeometry': {'lining': None, 'palate': None, 'floor': None,
                           'verdict': 'neither: the sac closed nothing the seated hinge tissue was not '
                                      'already closing; see docs/triassic/throat-repairs/oral-verdicts.md',
                           'parts': [o.name for o in oralparts]},
          'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
# The figures that cannot be measured inside the build -- the strict-cull gape counts, the skin
# figure -- are kept in qa.json and folded in here so a rebuild carries them.
_qa = os.path.join(HERE, 'qa.json')
report['postBuildQA'] = json.load(open(_qa)) if os.path.exists(_qa) else None
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, 'dinocephalosaurus-paired.blend'))
print('DINOCEPHALOSAURUS_REPORT', json.dumps({k: v for k, v in report.items() if k != 'boundsAt13Phases'}))
