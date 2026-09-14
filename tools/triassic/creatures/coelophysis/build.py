"""Rebuild Coelophysis: the generated body oriented and its tail unbent, a measured voxel twin, and
one skeleton carrying the shore animal's performance — including the telegraph and strike the
mechanic actually runs for this species.

Blender 5.2. Geometry coordinates are raw Tripo metres (X snoutward, Y left, Z up) until the final
engine transform tx(). The generic intake machinery is `tools/triassic/creatures/shorekit.py`;
everything in this file is Coelophysis.

  /opt/blender/blender --background --factory-startup --python tools/triassic/creatures/coelophysis/build.py

The animal: a slim Late Triassic theropod, the only dinosaur on this shore and the one the codex
gets to call one. In `src/sim/triassic/shore.ts` it is the one shore animal besides Tanystropheus
and the phytosaur with a **reach** — `reachOf` gives it 0.6 of its length — so it runs the same
watch → lower → strike → rest cycle, and it gets the same four clip names the mechanic asks for:
`Lower` at TELEGRAPH, `SnapLeft`/`SnapRight` at the strike window, `Retract` for the recovery. On
top of that it gets what the reviewer asked these two runners for and Tanystropheus does not need:
a real land gait, a dash into the shallows, and a retreat back up the beach.

Like Macrocnemus, this body is measured from **two declared seeds** rather than by a double sweep:
its longest geodesic path runs claw to tail tip, not snout to tail tip, because it stands on two
very long legs.
"""
import bpy
import bmesh
import math
import json
import os
import sys
import hashlib
import shutil
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.dirname(HERE))
import shorekit as K                                                          # noqa: E402

LOCAL = os.path.join(ROOT, 'local/triassic-authoring/coelophysis')
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/coelophysis.raw.glb')
ID = 'coelophysis'
SCALE = 5

CERVICALS = 8                  # the S-curve needs joints; a theropod neck is not a beam
CAUDALS = 10
UNBEND_TAIL = True
VOXEL = 0.0034                 # the shins and the tail tip measure r ~ 0.006
PUPPET_BUDGET = 7000

SEED_TAIL = (0, 1, 0)
SEED_SNOUT = (0, -1, 1)
TAIL_END, NECK_END = .70, .36
HEAD_GEO = .245                # where the skull stops and the neck begins, on the snout-seeded run

CLIPS = {'Idle': 3., 'Swim': 1.6, 'Sprint': 1., 'TurnLeft': 1.4, 'TurnRight': 1.4, 'Dive': 1.2,
         'Rise': 1.2, 'Attack': .8, 'Bite': .4, 'Heavy': .9, 'Hit': .5, 'Death': 1.6, 'Guard': 1.,
         'Parry': .3, 'Dodge': .4, 'Eat': 1.4, 'Stagger': 1., 'Ability': 1., 'Grab': 1.,
         'Breath': 2., 'Growth': 1.4, 'Crawl': 1.4,
         'Run': .58, 'Charge': 1., 'Lower': 1.5, 'SnapLeft': .6, 'SnapRight': .6, 'Retract': .9,
         'Retreat': 1.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Crawl', 'Run']

# ---- intake -------------------------------------------------------------------------------------
K.reset_scene()
auth, intake = K.import_and_weld(RAW, 'Coelophysis authored body', min_component=200)
assert intake['sourceComponents'] == 1, intake
assert intake['removedVertices'] == 0, intake


def runs():
    t, _, _, _ = K.geodesic_line(auth, bands=90, seed_dir=SEED_TAIL)
    n, _, _, _ = K.geodesic_line(auth, bands=60, seed_dir=SEED_SNOUT)
    return t, n


tail_line, neck_line = runs()
hips = next(r for r in tail_line if r['geo'] >= TAIL_END)['c']
shoulder = next(r for r in neck_line if r['geo'] >= NECK_END)['c']
trunk_yaw = math.atan2((shoulder - hips)[1], (shoulder - hips)[0])
R = Matrix.Rotation(-trunk_yaw, 4, 'Z')
for v in auth.data.vertices:
    v.co = R @ v.co
SEED_TAIL = tuple(R @ Vector(SEED_TAIL))
SEED_SNOUT = tuple(R @ Vector(SEED_SNOUT))
tail_line, neck_line = runs()

# ---- step 4 correction: unbend the tail ------------------------------------------------------------
# The greenlit pose (docs/triassic/canonical/coelophysis.png) holds the tail straight out behind as
# the counterweight it is; the generation sweeps it across the plan. Each cross-section is carried
# rigidly onto a target of the same segment lengths and the same per-segment rise, so the tail keeps
# the lift the pose gives it. The neck is not touched: its S is the animal.
unbending = {'applied': UNBEND_TAIL}
tail_rows = [r for r in tail_line if r['geo'] <= TAIL_END]
pts = [Vector(r['c']) for r in tail_rows][::-1]
tail_r = [r['r'] for r in tail_rows][::-1]
_, TCUM = K.poly(pts)


def tail_radius(s):
    # The gate that keeps the hindlimbs out of the tail's correction: a hind claw sits behind the
    # tail's base station and an axial gate would swing the whole leg round with it.
    return max(.035, 2.6 * float(np.interp(s, TCUM, tail_r)))


tgt = K.yaw_straight_target(pts, ease=.22, yaw=math.pi)
x0 = pts[0].x
before = np.array([v.co[:] for v in auth.data.vertices])
moved = K.carry_run(auth, pts, tgt, -1, ramp=.045, radius=tail_radius) if UNBEND_TAIL else 0.
after = np.array([v.co[:] for v in auth.data.vertices])
end = before[:, 0] < x0 - .22
unbending['tail'] = {
    'stations': len(pts), 'arc': float(sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))),
    'turningDegrees': round(K.turning(pts[::3]), 2), 'maxVertexMove': float(moved),
    'tipLateralMeanBefore': float(before[end][:, 1].mean()),
    'tipLateralMeanAfter': float(after[end][:, 1].mean())}

# ---- centre ----------------------------------------------------------------------------------------
co = np.array([v.co[:] for v in auth.data.vertices])
shift = Vector((-(co[:, 0].min() + co[:, 0].max()) / 2, -float(np.median(co[:, 1])), 0))
for v in auth.data.vertices:
    v.co += shift
co = np.array([v.co[:] for v in auth.data.vertices])
RAW_LENGTH = float(co[:, 0].max() - co[:, 0].min())
X_SNOUT = float(co[:, 0].max())
assert .90 < RAW_LENGTH < 1.20, RAW_LENGTH
tail_line, neck_line = runs()

TAIL_AXIS = [Vector(r['c']) for r in tail_line if r['geo'] <= TAIL_END]          # tip -> hips
NECK_AXIS = [Vector(r['c']) for r in neck_line if r['geo'] <= NECK_END][::-1]    # shoulder -> snout
HIPS = TAIL_AXIS[-1]
SHOULDER = NECK_AXIS[0]
assert SHOULDER.x > HIPS.x, (tuple(SHOULDER), tuple(HIPS))
TRUNK_DZ = (SHOULDER.z - HIPS.z) / max(SHOULDER.x - HIPS.x, 1e-6)


def spine_z(x):
    return float(HIPS.z + (x - HIPS.x) * TRUNK_DZ)


# The head, measured as the head: the surface whose nearest point on the neck run's own axis lies in
# its first HEAD_GEO of arc. On a biped a box would take the hands in with it.
HEAD_AXIS = [Vector(r['c']) for r in neck_line if r['geo'] <= HEAD_GEO]
HP, HCUM = K.poly(HEAD_AXIS)


def on_head(c, r=.055):
    return K.project(HP, HCUM, Vector(c))[0] < r


HEAD_CO = co[np.array([on_head(c) for c in co])]
assert len(HEAD_CO) > 250, len(HEAD_CO)
HEAD_X = np.linspace(float(HEAD_CO[:, 0].min()) + .006, float(HEAD_CO[:, 0].max()) - .004, 22)


def head_section(x, half=.008):
    m = (HEAD_CO[:, 0] >= x - half) & (HEAD_CO[:, 0] < x + half)
    if m.sum() < 6:
        return None
    q = HEAD_CO[m]
    cy = float(np.median(q[:, 1]))
    return (float(np.percentile(q[:, 2], 3)), float(np.percentile(q[:, 2], 97)),
            float(np.percentile(np.abs(q[:, 1] - cy), 96)), cy)


HEAD = [(float(x), head_section(float(x))) for x in HEAD_X]
HEAD = [(x, s) for x, s in HEAD if s]
HX = np.array([x for x, _ in HEAD])
HLO = K.blur(np.array([s[0] for _, s in HEAD]), 1.2)
HHI = K.blur(np.array([s[1] for _, s in HEAD]), 1.2)
HW = K.blur(np.array([s[2] for _, s in HEAD]), 1.2)
HY = K.blur(np.array([s[3] for _, s in HEAD]), 1.2)
HEAD_OFFSET = float(np.median(HY))


def head_lo(x):
    return float(np.interp(x, HX, HLO))


def head_hi(x):
    return float(np.interp(x, HX, HHI))


def head_y(x):
    return float(np.interp(x, HX, HY))


# ---- material and twin --------------------------------------------------------------------------
mat = K.authored_material(auth, 'Coelophysis body pigmentation')
albedo = K.Albedo(auth)
puppet, remesh_triangles = K.voxel_twin(auth, 'Coelophysis procedural volume puppet', VOXEL,
                                        PUPPET_BUDGET, albedo, 'Coelophysis puppet body')


# ---- the shared skeleton --------------------------------------------------------------------------
def tx(p):
    x, y, z = p
    return Vector((y * SCALE, -x * SCALE, z * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


depth = K.depth_probe(auth)


def along(axis, t):
    P, cum = K.poly(axis)
    s = t * cum[-1]
    i = max(0, min(len(P) - 2, int(np.searchsorted(cum, s)) - 1))
    span = max(cum[i + 1] - cum[i], 1e-9)
    return P[i] + (P[i + 1] - P[i]) * ((s - cum[i]) / span)


bone('root', (0, 0, 0), None)
# The pelvis is not the hip band's own centroid: that band has both hindlimbs in it and its centroid
# measures outside the animal. A fifth of the trunk forward of it is solid, by the depth probe.
# How far forward is measured, not chosen: walk along the trunk line until the depth probe says the
# station is properly inside the animal.
def trunk_at(t):
    return (float(HIPS.x + t * (SHOULDER.x - HIPS.x)),
            float(HIPS.y + t * (SHOULDER.y - HIPS.y)),
            spine_z(HIPS.x + t * (SHOULDER.x - HIPS.x)))


PELVIS = float(next(t for t in np.arange(.05, .70, .02) if depth(trunk_at(float(t))) > .010))
BODY_PT = trunk_at(PELVIS)
CHEST_PT = (float(SHOULDER.x), float(SHOULDER.y), spine_z(SHOULDER.x))
bone('body', BODY_PT, 'root')
bone('chest', CHEST_PT, 'body')
NECK_PTS = []
for i in range(CERVICALS):
    p = along(NECK_AXIS, .05 + .80 * i / (CERVICALS - 1))
    NECK_PTS.append((float(p.x), float(p.y), float(p.z)))
    bone('neck_%02d' % i, NECK_PTS[-1], 'chest' if i == 0 else 'neck_%02d' % (i - 1))
# The skull bone goes in the braincase, not out in the snout: walk back along the neck's own axis
# from the head end until the station is solidly inside.
SKULL_T = float(next(t for t in np.arange(.92, .50, -.02) if depth(tuple(along(NECK_AXIS, float(t)))) > .008))
_sk = along(NECK_AXIS, SKULL_T)
SKULL_PT = (float(_sk.x), float(_sk.y), float(_sk.z))
bone('skull', SKULL_PT, 'neck_%02d' % (CERVICALS - 1))
# The jaw hinges at the back of the skull, not in the middle of the snout. Taking it from the skull
# *bone* put it two thirds of the way to the tip and left a mandible 40 % of the head long; it is
# taken from the head's own measured span instead, a third of the way back from the snout.
HINGE_X = float(X_SNOUT - .66 * (X_SNOUT - float(HX[0])))
TAIL_START = next(t for t in np.arange(.02, .40, .01) if depth(along(TAIL_AXIS[::-1], float(t))) > .004)
TAIL_PTS = []
for i in range(CAUDALS):
    p = along(TAIL_AXIS[::-1], float(TAIL_START) + (.98 - float(TAIL_START)) * i / (CAUDALS - 1))
    TAIL_PTS.append((float(p.x), float(p.y), float(p.z)))
    bone('tail_%02d' % i, TAIL_PTS[-1], 'body' if i == 0 else 'tail_%02d' % (i - 1))

# Measured off the intake mesh: the hindlimbs from the below-belly clustering (the left foot at
# x -0.01 and the right at +0.12 — the generation is drawn mid-stride and the two sides are built
# to their own axes), the forelimbs from the chest-height clustering, where they are small and
# tucked as a coelophysoid's are.
LIMB_PTS = {
    'foreL': [(.245, .028, .042), (.235, .046, -.024), (.252, .052, -.066), (.268, .056, -.098)],
    'foreR': [(.245, -.028, .042), (.235, -.046, -.024), (.252, -.052, -.066), (.268, -.056, -.098)],
    'hindL': [(.075, .024, .010), (-.005, .023, -.141), (-.023, .028, -.215), (-.007, .056, -.288)],
    'hindR': [(.090, -.024, .010), (.108, -.058, -.141), (.118, -.076, -.215), (.120, -.087, -.288)]}
seating = {}
LIMBS = {}
for key, pts in LIMB_PTS.items():
    kind = 'fore' if key.startswith('fore') else 'hind'
    s = key[-1]
    names = [kind + '_upper_' + s, kind + '_lower_' + s, kind + '_foot_' + s]
    # A limb root is drawn in towards the trunk bone it hangs off — a point the build has already
    # established is inside — rather than towards a line that may not be.
    root = K.seat(pts[0], CHEST_PT if kind == 'fore' else BODY_PT, .010, depth)
    pts = [tuple(root)] + [tuple(p) for p in pts[1:]]
    LIMB_PTS[key] = pts
    LIMBS[key] = (pts, names)
    for i, n in enumerate(names):
        bone(n, pts[i], ('chest' if kind == 'fore' else 'body') if i == 0 else names[i - 1])
    seating[names[0]] = depth(pts[0])
# The hinge is seated against the head's own section *at the hinge station*, not against the skull
# bone's height: the skull bone sits further forward where the head is a different height above the
# ground, and using it put the hinge three thousandths inside a head twenty-four thousandths thick.
HINGE_MID = (head_lo(HINGE_X) + head_hi(HINGE_X)) / 2
HEAD_R = float(np.interp(HINGE_X, HX, (HHI - HLO) / 2))
JAW_PT = (HINGE_X - .004, head_y(HINGE_X), (HINGE_MID + head_lo(HINGE_X)) / 2)
# Seated against the head's *own* radius rather than an absolute depth, because a hinge a fixed
# few thousandths inside a thick skull is still sitting on its skin.
JAW_PT = tuple(K.seat(JAW_PT, (HINGE_X, head_y(HINGE_X), HINGE_MID), max(.0060, .30 * HEAD_R), depth))
bone('jaw', JAW_PT, 'skull')
seating['skull'] = depth(SKULL_PT)
seating['jaw'] = depth(JAW_PT)
seating['body'] = depth(BODY_PT)
seating['chest'] = depth(CHEST_PT)
for i in range(CAUDALS):
    seating['tail_%02d' % i] = depth(TAIL_PTS[i])
for i in range(CERVICALS):
    seating['neck_%02d' % i] = depth(NECK_PTS[i])
print('SEATING', json.dumps({k: round(v, 5) for k, v in seating.items()}))
for n, d in seating.items():
    floor = .0035 if n in ('jaw', 'skull') else (.0010 if n.startswith(('tail_', 'neck_')) else .006)
    assert d > floor, ('a root sits outside the intake surface', n, d, floor)
assert seating['jaw'] / HEAD_R > .24, ('the jaw hinge is not seated in the head', seating['jaw'], HEAD_R)

REST_RUNS = {
    'tail': [r for r in tail_line if r['geo'] <= TAIL_END][::-1],
    'spine': [r for r in tail_line if r['geo'] > TAIL_END],
    'neck': [r for r in neck_line if r['geo'] <= NECK_END][::-1]}
# ---- how far the generation's own rest pose is from neutral ---------------------------------------
# Two numbers, for the pass that will re-base every body on a `Neutral` clip (straight spine,
# mirrored limbs, jaw closed).
#
# 1. `meanCurvatureRadiusOverSection` per run, Dinocephalosaurus' measure: arc over total turning
#    gives the radius the run curves on, divided by that run's own section radius, so it says whether
#    a curve is gentle *for a body that thick*. High means the rig can straighten it by rotating
#    joints; low means the curve is tight enough for its girth that straightening on the rig would
#    collapse the inside of the bend and the mesh has to be unbent before binding — which is the
#    decision this builder already had to make, now written down as a number.
#
#    It is measured on the **same rows the unbend uses**, not on the whole banding. A geodesic
#    banding of a standing animal is contaminated at both ends: the far bands mix head with forefoot
#    and the hip bands mix tail with hind leg, and summing centroid-to-centroid turning across that
#    reports a neck bending through 896 degrees. Turning is coarsened to every third station for the
#    same reason the unbend coarsens it — band-to-band jitter is not anatomy.
#
# 2. The left-right asymmetry of the paired limbs: the mean distance between each limb joint and its
#    partner's mirrored position, over body length. These generations are drawn, not modelled to a
#    rig, so the four limbs are posed mid-stride and do not match.
rest_pose = {'curvature': {}, 'method': 'measured on the rows each run is unbent from, coarsened to '
                                        'every third station; a geodesic banding of a standing '
                                        'animal is contaminated by limb geometry at both ends'}
for _name, _rows in REST_RUNS.items():
    if len(_rows) < 4:
        rest_pose['curvature'][_name] = None
        continue
    _pts = [Vector(r['c']) for r in _rows]
    _sec = float(np.mean([r['r'] for r in _rows]))
    rest_pose['curvature'][_name] = K.curvature_over_section(_pts, _sec)
rest_pose['limbAsymmetry'] = K.limb_asymmetry(LIMBS, RAW_LENGTH, midline=float(np.median(co[:, 1])))
print('REST_POSE', json.dumps(rest_pose))

# ---- the mouth ---------------------------------------------------------------------------------
MOUTH_GAP = .026
CAVITY = K.mouth_cavity(auth, on_head, MOUTH_GAP)
SNOUT_BACK, SNOUT_FRONT = float(HX[0]) + .006, float(HX[-1]) - .004


def pigment_seam():
    """Where the painted mouth line sits in the head's own section, per station and as a median."""
    uvl = auth.data.uv_layers.active
    lum = {}
    for poly_ in auth.data.polygons:
        for vi, li in zip(poly_.vertices, poly_.loop_indices):
            c = auth.data.vertices[vi].co
            if vi in lum or not (SNOUT_BACK < c.x < SNOUT_FRONT):
                continue
            u, v = uvl.data[li].uv
            rgb = albedo.at(u, v)
            lum[vi] = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2]
    rows = []
    for k in range(12):
        x0 = SNOUT_BACK + (SNOUT_FRONT - SNOUT_BACK) * k / 12
        x1 = SNOUT_BACK + (SNOUT_FRONT - SNOUT_BACK) * (k + 1) / 12
        band = []
        for vi, L in lum.items():
            c = auth.data.vertices[vi].co
            if not (x0 <= c.x < x1) or abs(c.y - head_y(c.x)) < .003 or not on_head(c):
                continue
            lo, hi = head_lo(c.x), head_hi(c.x)
            if hi - lo < 1e-5:
                continue
            band.append(((c.z - lo) / (hi - lo), L))
        if len(band) < 10:
            continue
        band.sort()
        best = None
        for i in range(3, len(band) - 3):
            score = np.mean([b[1] for b in band[:i]]) - np.mean([b[1] for b in band[i:]])
            if best is None or score > best[0]:
                best = (score, band[i][0])
        rows.append((float((x0 + x1) / 2), float(best[1]), float(best[0])))
    return float(np.median([r[1] for r in rows])), float(np.median([r[2] for r in rows])), rows


JAW_FRACTION, PIGMENT_CONTRAST, pigment_rows = pigment_seam()
assert PIGMENT_CONTRAST > .02, ('no painted mouth line to read', PIGMENT_CONTRAST, pigment_rows)
assert .15 < JAW_FRACTION < .65, (JAW_FRACTION, pigment_rows)
MOUTH_BACK = min(HINGE_X, float(HX[-1])) - .004
MOUTH_FRONT = X_SNOUT - .004


def seam(x):
    lo, hi = head_lo(x), head_hi(x)
    return lo + (hi - lo) * JAW_FRACTION


def is_jaw(c):
    # The floor matters on this animal and on no other of the three: its neck curves *under and
    # behind* its head, so at the hinge station there is neck below the mandible at the same x. A
    # cut that only asked "forward of the hinge and below the seam" would take the throat with it.
    if not (HINGE_X < c.x < X_SNOUT + .02):
        return False
    return head_lo(c.x) - .012 < c.z < seam(c.x) - 1e-7


SNOUT_CO, PROUD, PATCHES = K.protrusions(auth, float(HX[0]), .0025, region=on_head)
patch_report = []
for g in PATCHES:
    q = SNOUT_CO[g]
    below = int(sum(1 for c in q if is_jaw(Vector((float(c[0]), float(c[1]), float(c[2]))))))
    patch_report.append({'vertices': len(g), 'proudMax': float(PROUD[g].max()),
                         'x': [float(q[:, 0].min()), float(q[:, 0].max())],
                         'onJaw': below, 'onSkull': int(len(g) - below)})
    assert not (below >= 4 and len(g) - below >= 4 and PROUD[g].max() > .0055), \
        ('a raised patch is cut in half by the mouth seam', patch_report[-1])

parts = {}
for o in [auth, puppet]:
    K.bisect_mouth(o, seam, HINGE_X, X_SNOUT + .02, HINGE_X - .02)
    K.split(o, 'lower jaw', is_jaw, parts)

mouthmat = K.flat_material('Coelophysis mouth interior', (.32, .13, .12, 1), .62, cull=True)
toothmat = K.flat_material('Coelophysis teeth', (.86, .83, .74, 1), .26)
oralparts = []
LINING_INSET = .86


def mouth_section(x):
    e = K.smooth((x - MOUTH_BACK) / .018) * K.smooth((MOUTH_FRONT - x) / .008)
    lo, hi = head_lo(x), head_hi(x)
    w = float(np.interp(x, HX, HW)) * LINING_INSET * (.14 + .86 * e)
    h = max((hi - lo) * .28 * LINING_INSET, .0018) * (.28 + .72 * e)
    return w, h


lining, lin_raw = K.oral_lining('Oral cavity lining', (MOUTH_BACK, MOUTH_FRONT), mouth_section,
                                seam, tx, rings=18, ring=10, centre=head_y)
lining.data.materials.append(mouthmat)

# A theropod's blade teeth: many small recurved cones the length of both jaws. Coelophysis' are
# small, numerous and backward-curving, and the generation models none of them.
TOOTHROWS = []
for label, side, bonename in [('Upper tooth row', -1, 'skull'), ('Lower tooth row', 1, 'jaw')]:
    verts = []
    faces = []
    n = 8
    for k in range(n):
        u = k / (n - 1)
        x = MOUTH_FRONT - .008 - u * .078
        w, h = mouth_section(x)
        length = (.0075 - .0022 * u)
        for sgn in (1, -1):
            base = len(verts)
            cy = head_y(x) + sgn * max(.0018, w * .76)
            root = Vector((x, cy, seam(x) - side * h * .58))
            tip = root + Vector((-length * .30, -sgn * length * .06, side * length))
            for ring in range(2):
                t = ring / 1.
                c = root + (tip - root) * t * .55
                r = .0018 * (1 - t * .5)
                for a in range(4):
                    th = a * 2 * pi / 4
                    verts.append(tx((c.x + r * cos(th) * .8, c.y + r * sin(th), c.z + r * cos(th) * .5)))
            verts.append(tx(tuple(tip)))
            for a in range(4):
                p0 = base + a
                p1 = base + (a + 1) % 4
                faces.append((p0, p1, p1 + 4, p0 + 4))
            apex = base + 8
            for a in range(4):
                faces.append((base + 4 + a, base + 4 + (a + 1) % 4, apex))
    me = bpy.data.meshes.new(label)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(label, me)
    bpy.context.collection.objects.link(o)
    TOOTHROWS.append((o, bonename))

# ---- skinning ------------------------------------------------------------------------------------
AXIAL_PTS = ([tuple(TAIL_PTS[-1])] + [tuple(p) for p in reversed(TAIL_PTS)]
             + [BODY_PT, CHEST_PT] + [tuple(p) for p in NECK_PTS]
             + [SKULL_PT, (X_SNOUT, head_y(X_SNOUT), seam(X_SNOUT))])
AXIAL_NAMES = (['tail_%02d' % i for i in range(CAUDALS - 1, -1, -1)] + ['body', 'chest']
               + ['neck_%02d' % i for i in range(CERVICALS)] + ['skull'])
AXIAL = K.AxialChain(AXIAL_PTS, AXIAL_NAMES)
RADII = {'fore': (.008, .011, .026, .022), 'hind': (.014, .018, .040, .034)}
LIMB_FITS = [K.Limb(pts, names, RADII[key[:4]], .045, AXIAL) for key, (pts, names) in LIMBS.items()]


def trunk_pullback(v, w):
    if v.x < SHOULDER.x + .06 and (abs(v.y) > .034 or abs(v.z - spine_z(v.x)) > .055):
        pull = K.smooth((abs(v.y) - .034) / .018) if abs(v.y) > .034 else 1.
        moved = sum(val for n, val in w.items() if n.startswith('neck'))
        if moved > 0:
            for n, val in list(w.items()):
                if n.startswith('neck'):
                    w[n] = val * (1 - pull)
            w['chest'] = w.get('chest', 0) + moved * pull
    return w


def weights(p):
    return K.skin_weights(p, AXIAL, LIMB_FITS, extra=trunk_pullback)


rig = K.build_armature(B, tx, 'Coelophysis shared skeleton', 'Coelophysis_Rig')
influences = []
for o in [auth, puppet]:
    K.bind(o, rig, B, weights, tx, influences)
for o in parts['lower jaw'].values():
    K.bind_rigid(o, rig, 'jaw', tx)
for n in ['skull', 'jaw']:
    lining.vertex_groups.new(name=n)
for idx, p in enumerate(lin_raw):
    w, h = mouth_section(p.x)
    t = K.smooth(.5 + .5 * (seam(p.x) - p.z) / max(h, 1e-6))
    g = t * K.smooth((p.x - HINGE_X) / .014) * K.smooth((MOUTH_FRONT - p.x) / .008)
    lining.vertex_groups['jaw'].add([idx], g, 'REPLACE')
    lining.vertex_groups['skull'].add([idx], 1 - g, 'REPLACE')
for p in lining.data.polygons:
    p.use_smooth = True
mo = lining.modifiers.new('Oral membrane', 'ARMATURE')
mo.object = rig
lining.parent = rig
oralparts.append(lining)
for o, bonename in TOOTHROWS:
    K.bind_rigid(o, rig, bonename, None, toothmat)
    oralparts.append(o)

hz = (seam(MOUTH_BACK) + head_lo(MOUTH_BACK)) / 2
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8,
                                     location=tx((HINGE_X - .003, head_y(min(HINGE_X, HX[-1])), hz)))
hinge = bpy.context.object
hinge.name = 'Seated jaw hinge tissue'
hinge.scale = (float(np.interp(MOUTH_BACK, HX, HW)) * .92 * SCALE, .014 * SCALE,
               max(seam(MOUTH_BACK) - head_lo(MOUTH_BACK), .004) * .62 * SCALE)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in hinge.data.vertices:
    v.co = hinge.matrix_world @ v.co
hinge.location = (0, 0, 0)
for n in ['skull', 'jaw']:
    hinge.vertex_groups.new(name=n)
for v in hinge.data.vertices:
    t = max(0., min(1., (seam(MOUTH_BACK) * SCALE - v.co.z) / (.018 * SCALE)))
    hinge.vertex_groups['jaw'].add([v.index], t * .5, 'REPLACE')
    hinge.vertex_groups['skull'].add([v.index], 1 - t * .5, 'REPLACE')
for p in hinge.data.polygons:
    p.use_smooth = True
mo = hinge.modifiers.new('Hinge skin', 'ARMATURE')
mo.object = rig
hinge.parent = rig
oralparts.append(hinge)


def to_raw(c):
    return Vector((-c.y / SCALE, c.x / SCALE, c.z / SCALE))


def to_engine(p):
    return tx(tuple(p))


def mouth_axis(p):
    x = min(max(p.x, MOUTH_BACK), X_SNOUT - .002)
    return Vector((x, head_y(x), seam(x)))


oral_seating = {o.name: K.seat_inside(o, mouth_axis, depth, to_raw, to_engine) for o in oralparts}
oral_part_depth = {o.name: min(depth(to_raw(v.co)) for v in o.data.vertices) for o in oralparts}
oral_depth = min(oral_part_depth.values())
# The hinge plug closes a hole this build's own cut leaves in the head, and CLAUDE.md is explicit
# that whatever is authored wears the creature's own texture rather than a flat colour: it takes its
# UVs from the surrounding surface and samples the same albedo, so it is not a smooth island in a
# pored hide. Done here, after seating, so the UVs answer where the patch finally sits. The lining
# and the teeth are deliberately left alone — they are interior and are meant to read as a mouth.
hinge_uv = K.wear_the_skin(hinge, auth, albedo, mat, to_raw)
print('HINGE_UV', json.dumps(hinge_uv))
assert hinge_uv['unprojected'] == 0, ('the hinge patch has loops with no skin to take a UV from', hinge_uv)
assert oral_depth > -1e-4, ('the mouth interior breaks the skin', oral_part_depth)

# ---- the measured comparison ------------------------------------------------------------------
AUTH_GROUP = [auth, parts['lower jaw'][auth.name]]
PUP_GROUP = [puppet, parts['lower jaw'][puppet.name]]
distances = K.surface_distances(AUTH_GROUP, PUP_GROUP)
profile_rows, worst, model_length = K.envelopes(AUTH_GROUP, PUP_GROUP, thickness=SCALE * RAW_LENGTH / 20)
TOL = model_length * .04
print('ENVELOPES', json.dumps([[round(r['stationY'], 3), round(r.get('maximumEnvelopeDifference', -1), 4)]
                               for r in profile_rows]))
print('SURFACE', round(max(distances), 4), round(float(np.quantile(distances, .95)), 4), model_length)
assert worst < TOL, ('section envelopes outside 4% of body length', worst, TOL)
assert float(np.quantile(distances, .95)) < model_length * .012, float(np.quantile(distances, .95))
surface_outliers = int(sum(1 for d in distances if d > model_length * .03))

open(os.path.join(HERE, ID + '-profile.json'), 'w').write(json.dumps({
    'method': '21 exact envelopes of both actual meshes (body and lower jaw), each a slab one '
              'station thick because this animal stands and its legs run along the sectioning '
              'axis; plus the plane intersection at each station, unioned in; '
              '%.4f raw-unit voxel occupancy resurfacing of the intake volume' % VOXEL,
    'bodyLength': model_length, 'rawLength': RAW_LENGTH, 'stations': profile_rows,
    'maximumEnvelopeDifference': worst, 'envelopeTolerance': TOL,
    'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceDistanceP99': float(np.quantile(distances, .99)),
    'surfaceOutliersOverThreePercent': surface_outliers,
    'seatingDepthRaw': seating, 'oralInteriorDepthRaw': oral_depth,
    'mouth': {'cavityVerticesFound': int(len(CAVITY)), 'jawFractionOfHeadSection': JAW_FRACTION,
              'pigmentContrast': PIGMENT_CONTRAST, 'hingeX': HINGE_X,
              'seam': [[round(float(x), 5), round(seam(float(x)), 5)]
                       for x in np.linspace(MOUTH_BACK, X_SNOUT, 10)]},
    'unbending': unbending}, indent=2))

# ---- performance ---------------------------------------------------------------------------------
scene = bpy.context.scene
scene.render.fps = 30
rig.animation_data_create()
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'


def reset():
    for q in rig.pose.bones:
        q.rotation_euler = (0, 0, 0)
        q.location = (0, 0, 0)
        q.scale = (1, 1, 1)


# A theropod's neck is an S and it works along its length: the weight is spread rather than piled at
# the base, which is the opposite of Tanystropheus' beam and is the point of the comparison.
NECKW = np.array([.16, .15, .14, .13, .12, .11, .10, .09])
NECKW = NECKW / NECKW.sum()
LAG = np.linspace(0, .14, CERVICALS)


def neck(pb, yaw=0., pitch=0., phase=0., wave=None):
    for i in range(CERVICALS):
        q = pb['neck_%02d' % i]
        k = NECKW[i] * (wave(phase - LAG[i]) if wave else 1.)
        q.rotation_euler.z += yaw * k
        q.rotation_euler.x += pitch * k


AMP = {'Idle': .22, 'Swim': 1., 'Sprint': 1.35, 'Crawl': 1., 'Run': 1., 'Eat': .3, 'Guard': .2,
       'Breath': .5, 'Dodge': 1.1, 'Grab': .3, 'Growth': .4}
seams = {}
firsts = {}
lasts = {}
bounds = {}
gait_track = {}
LIMB_ROOTS = [n for n in ('fore_upper_L', 'fore_upper_R', 'hind_upper_L', 'hind_upper_R')
              if n in B]
limb_track = {}
strike_track = {}

for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    first = None
    for f in range(last + 1):
        reset()
        u = f / last
        p = 2 * pi * u
        e = sin(pi * u) ** 2
        loop = clip in LOOPS
        env = 1 if loop else e
        pb = rig.pose.bones
        amp = AMP.get(clip, .25)

        def wave(lag=0., freq=1.):
            return (sin(p * freq - lag) - sin(-lag)) * env

        def pulse(c, k):
            return ((1 + cos(p - 2 * pi * c)) / 2) ** k

        def sbump(a, b):
            return sin(pi * (u - a) / (b - a)) ** 2 if a < u < b else 0.

        def ramp(a, b):
            return K.smooth((u - a) / (b - a)) if b > a else (1. if u >= b else 0.)

        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ['TurnLeft', 'TurnRight'] else 0
        dead = K.smooth(u) if clip == 'Death' else 0
        body = pb['body']
        chest = pb['chest']
        skull = pb['skull']
        CROUCH_GAPE = .07
        shore_chain = clip in ('Lower', 'SnapLeft', 'SnapRight', 'Retract')

        # ---- jaw
        opening = .012 * (1 - cos(p)) if loop else 0
        if clip == 'Eat':
            opening = .20 * (1 - cos(p * 2))
        if clip == 'Bite':
            opening = .52 * sin(pi * u) ** 2
        if clip == 'Attack':
            opening = .46 * (sin(pi * u / .32) ** 2 if u < .32 else 0) + .06 * sbump(.32, .74)
        if clip == 'Heavy':
            opening = .50 * (sin(pi * u / .28) ** 2 if u < .28 else 0) + .05 * sbump(.28, .76)
        if clip == 'Grab':
            opening = .24 + .05 * e * sin(p * 2)
        if clip == 'Breath':
            opening = .14 * e
        if clip == 'Run':
            opening = .12 + .05 * sin(p * 2)
        if clip == 'Charge':
            opening = .12 * (ramp(.10, .40) - ramp(.80, 1.)) + .14 * sbump(.55, .95)
        if clip == 'Retreat':
            opening = .18 * sbump(.02, .52)
        if clip == 'Ability':
            opening = .20 * sbump(0., .35) + .46 * sbump(.35, .70)
        if clip == 'Lower':
            opening = CROUCH_GAPE * ramp(.55, 1.)
        if clip in ('SnapLeft', 'SnapRight'):
            opening = CROUCH_GAPE + .50 * K.smooth(u / .26) * (1 - K.smooth((u - .40) / .16))
        if clip == 'Retract':
            opening = CROUCH_GAPE * (1 - ramp(.02, .52)) + .10 * sbump(.55, .88)
        opening += .26 * dead
        pb['jaw'].rotation_euler.x = opening
        skull.rotation_euler.x = -.12 * opening

        # ---- the tail: the counterweight a biped steers and balances with
        for i in range(CAUDALS):
            q = pb['tail_%02d' % i]
            if clip in ('Run', 'Charge', 'Retreat') or shore_chain:
                pass
            elif clip in ['Swim', 'Sprint']:
                q.rotation_euler.z = (.040 + .024 * i) * amp * sin(p - i * .40)
            elif clip == 'Crawl':
                q.rotation_euler.z = (.010 + .007 * i) * sin(p - i * .34)
            else:
                q.rotation_euler.z = (.010 + .006 * i) * amp * wave(i * .45) + turn * (.016 + .009 * i)
            q.rotation_euler.x += dead * .035 * sin(i * .5)
            if clip in ['Dive', 'Rise']:
                q.rotation_euler.x += (1 if clip == 'Dive' else -1) * .024 * e * (1 + .1 * i)

        # ---- the limbs, default trim
        for key, (pts, names) in LIMBS.items():
            s = 1 if key.endswith('L') else -1
            hind = key.startswith('hind')
            up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
            lag = (pi if hind else 0) + (.12 if s < 0 else 0)
            up.rotation_euler.x = .08 * amp * wave(lag) - .18 * dead
            up.rotation_euler.y = s * (.05 * amp * wave(lag + pi / 2) + .16 * dead)
            lo.rotation_euler.x = .06 * amp * wave(lag + .7) - .10 * dead
            ft.rotation_euler.x = .05 * amp * wave(lag + 1.3) + .08 * dead

        def biped(cycle, reach, push, lift, drive=1., arms=.5):
            """One two-beat stride. A biped's legs alternate half a cycle apart and the little arms
            swing against them, which is what keeps a running theropod's shoulders quiet."""
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                off = {'hindL': 0., 'hindR': .5, 'foreL': .5, 'foreR': 0.}[key]
                ph = (cycle - off) % 1.
                sw = sin(pi * min(1., ph / .42)) ** 2 if ph < .42 else 0.
                st = 0. if ph < .42 else sin(pi * (ph - .42) / .58) ** 2
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                k = drive * (1. if hind else arms)
                up.rotation_euler.x = k * (reach * sw - push * st)
                up.rotation_euler.y = drive * s * ((.10 if hind else .30) - .04 * sw)
                lo.rotation_euler.x = k * (lift * sw - (.22 if hind else .10) * st)
                ft.rotation_euler.x = k * (.34 * sw - .18 * st)

        def crouch(a):
            """The watch-lowered pose the shore mechanic holds: the body dropped over the water, the
            neck folded back into its S and the head brought forward and down, ready."""
            body.location.z += -.16 * a * SCALE * .2
            body.rotation_euler.x += .20 * a
            chest.rotation_euler.x += .14 * a
            neck(pb, pitch=.34 * a)
            skull.rotation_euler.x += .22 * a
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x += (.26 if hind else .18) * a
                lo.rotation_euler.x += (.30 if hind else .12) * a
                ft.rotation_euler.x += (-.20 if hind else 0.) * a
            for i in range(CAUDALS):
                pb['tail_%02d' % i].rotation_euler.x += -(.026 + .008 * i) * a

        if clip == 'Run':
            # THE LAND GAIT. A theropod's run: two legs alternating half a cycle apart, the body
            # pitching into each drive, the tail out behind and held, the head kept level on the
            # neck's S so the eyes do not bob. One suspension per step, two a cycle.
            biped(u, .72, .58, .54, 1., .45)
            bound = sin(2 * pi * u) ** 2
            body.location.z = (.24 * bound - .05) * SCALE * .2
            body.rotation_euler.x = -.16 * sin(2 * pi * u + .6)
            body.rotation_euler.z = .06 * sin(p)
            body.rotation_euler.y = .05 * sin(p)
            chest.rotation_euler.x = -.09 * sin(2 * pi * u + 1.1)
            neck(pb, pitch=.14 * sin(2 * pi * u + 2.3), yaw=.05 * sin(p))
            skull.rotation_euler.x += -.10 * sin(2 * pi * u + 2.7)
            for i in range(CAUDALS):
                q = pb['tail_%02d' % i]
                q.rotation_euler.z = (.008 + .006 * i) * sin(p - i * .28)
                q.rotation_euler.x = -(.026 + .010 * i) * (.55 + .45 * sin(2 * pi * u + 1.6))
        elif clip == 'Charge':
            # THE DASH INTO THE SHALLOWS. Crouch and load, launch, three driving strides, then the
            # water takes the legs and the body pitches down as it wades in, and back to the stand.
            load = sbump(0., .30)
            go = ramp(.16, .34) - ramp(.78, 1.)
            arrive = sbump(.66, 1.)
            cyc = max(0., (u - .22)) / .58 * 3.
            biped(cyc, .80, .64, .58, go * (1 - .4 * arrive), .5)
            body.location.z = (-.15 * load + .12 * go * (1 - arrive)) * SCALE * .2
            body.location.y = (-.16 * go + .16 * arrive) * SCALE * .2
            body.rotation_euler.x = .18 * load - .26 * go + .34 * arrive
            body.rotation_euler.y = .05 * sin(2 * pi * cyc) * go
            chest.rotation_euler.x = .12 * load - .14 * go + .16 * arrive
            neck(pb, pitch=-.24 * load + .18 * go + .38 * arrive, yaw=.06 * sin(2 * pi * cyc) * go)
            skull.rotation_euler.x += -.16 * load + .12 * go + .14 * arrive
            for i in range(CAUDALS):
                q = pb['tail_%02d' % i]
                q.rotation_euler.x = -(.030 + .010 * i) * go + (.018 + .007 * i) * load
                q.rotation_euler.z = (.012 + .008 * i) * sin(2 * pi * cyc - i * .3) * go
        elif clip == 'Retreat':
            # BACK UP THE BEACH. A turn away over the first third, then four fast strides out of the
            # water with the head twisted back to check.
            spin = sbump(0., .42)
            go = ramp(.18, .40) - ramp(.86, 1.)
            look = sbump(.34, .86)
            cyc = max(0., (u - .22)) / .70 * 4.
            biped(cyc, .74, .60, .56, go, .5)
            body.rotation_euler.z = 1.10 * spin
            body.rotation_euler.y = -.22 * spin
            body.location.z = (.09 * (sin(2 * pi * cyc) ** 2) * go - .03 * spin) * SCALE * .2
            body.rotation_euler.x = -.12 * go
            chest.rotation_euler.z = .22 * spin
            neck(pb, yaw=.50 * look - .20 * spin, pitch=-.14 * go)
            skull.rotation_euler.z += .38 * look
            for i in range(CAUDALS):
                q = pb['tail_%02d' % i]
                q.rotation_euler.z = (.028 + .016 * i) * spin
                q.rotation_euler.x = -(.026 + .010 * i) * go
        elif shore_chain:
            # THE SHORE CHAIN, as Tanystropheus has it and for the same reason: these hand over to
            # each other rather than each returning to rest, because the mechanic holds `crouch`
            # between them. Lower is TELEGRAPH, a Snap is the strike window, Retract the recovery.
            if clip == 'Lower':
                drop = ramp(.08, .55) + .09 * sbump(.46, .72)
                crouch(drop)
                body.rotation_euler.y += .02 * sin(p) * (1 - .7 * drop)
                neck(pb, yaw=.024 * sin(p) * (1 - drop))
            elif clip == 'Retract':
                lift = 1 - ramp(.02, .52)
                shake = sbump(.34, .74)
                crouch(lift)
                neck(pb, pitch=-.22 * sbump(.06, .60))
                skull.rotation_euler.x += -.18 * sbump(.06, .60)
                skull.rotation_euler.z += .28 * shake * sin(2 * pi * u * 7)
                skull.rotation_euler.y += .20 * shake * sin(2 * pi * u * 7 + 1.1)
                neck(pb, yaw=.12 * shake * sin(2 * pi * u * 7 - .6))
                body.location.z += .06 * sbump(.10, .68) * SCALE * .2
                for i in range(CAUDALS):
                    pb['tail_%02d' % i].rotation_euler.z += .026 * shake * sin(2 * pi * u * 3.5 + i * .4)
            else:
                # THE STRIKE. A theropod's snatch: the head drives forward and down off the neck's
                # S and turns onto the catch, the jaws close at 0.42, and the whole body follows
                # through and settles back to the crouch. The drive runs down the chain rather than
                # pivoting at the shoulder, which is what a flexible neck is *for* — and is exactly
                # the opposite of the boom next door on the same beach.
                d = 1 if clip == 'SnapLeft' else -1

                def bump(t, a, b):
                    return sin(pi * (t - a) / (b - a)) ** 2 if a < t < b else 0.

                def drive(t):
                    return (K.smooth((t - .08) / .26) - K.smooth((t - .48) / .30) - .26 * bump(t, 0., .18))
                sweep = drive(u)
                lunge = sin(pi * min(1., max(0., (u - .06) / .84)) ** .85) ** 2
                crouch(1.)
                neck(pb, yaw=d * .62, phase=u, wave=drive)
                # The S *straightens* rather than curling. A uniform down-pitch swings the head
                # along an arc about the shoulder, which takes it down and **backwards**: the first
                # pass reached 0.08 units forward while dropping four times that. Pitching the
                # shoulder end down and the head end up extends the neck instead, and the body
                # lunges under it.
                for i in range(CERVICALS):
                    pb['neck_%02d' % i].rotation_euler.x += lunge * (.17 - .27 * i / (CERVICALS - 1))
                skull.rotation_euler.z += d * (.34 * bump(u, .26, .60) - .12 * bump(u, .60, 1.))
                skull.rotation_euler.x += .22 * lunge + .12 * bump(u, .28, .52)
                chest.rotation_euler.x += .16 * lunge
                chest.rotation_euler.z += d * .12 * sweep
                body.rotation_euler.x += .12 * lunge
                body.rotation_euler.z += d * .09 * sweep
                body.location.y += -.55 * lunge * SCALE * .2
                body.location.z += -.06 * lunge * SCALE * .2
                for i in range(CAUDALS):
                    q = pb['tail_%02d' % i]
                    q.rotation_euler.z += -d * (.022 + .012 * i) * sweep
                    q.rotation_euler.x += -(.020 + .010 * i) * lunge
                for key, (pts, names) in LIMBS.items():
                    hind = key.startswith('hind')
                    up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                    up.rotation_euler.x += (.24 if hind else .18) * lunge
                    lo.rotation_euler.x += (.20 if hind else .14) * lunge
        elif clip == 'Crawl':
            # The walk at the post: a slow two-beat stride with the head up and watching.
            biped(u, .40, .32, .30, 1., .35)
            body.location.z = .030 * (sin(2 * pi * u * 2) - 1) * SCALE * .2
            body.rotation_euler.z = .030 * sin(p)
            body.rotation_euler.y = .045 * sin(p * 2 + .6)
            chest.rotation_euler.z = .020 * sin(p + .5)
            neck(pb, yaw=-.030 * sin(p + .9), pitch=-.014 * sin(p * 2))
            skull.rotation_euler.z += .03 * sin(p + 1.3)
        elif clip in ['Swim', 'Sprint']:
            body.rotation_euler.z = -.030 * amp * sin(p + .38)
            body.rotation_euler.y = .020 * amp * sin(p + 1.05)
            neck(pb, pitch=-.18, yaw=.05 * amp * sin(p + 1.5))
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                lag = (pi if hind else 0)
                up.rotation_euler.x = (.20 if hind else .28) + (.46 if hind else .16) * amp * sin(p - lag)
                up.rotation_euler.y = s * (.14 if hind else .30)
                lo.rotation_euler.x = (-.22 if hind else -.16) + (.32 if hind else .10) * amp * sin(p - lag - .5)
                ft.rotation_euler.x = .16 * amp * sin(p - lag - .9)
        else:
            body.rotation_euler.y = .014 * amp * wave(.3)
            body.location.z = .04 * amp * wave(.2) * SCALE * .2
            body.rotation_euler.z = .18 * turn
            body.rotation_euler.y += .10 * turn
            chest.rotation_euler.z = .060 * turn
            neck(pb, yaw=.06 * amp * wave(.9) + .44 * turn, pitch=.02 * amp * wave(.6))
            if clip == 'Idle':
                chest.rotation_euler.x = .014 * sin(p * 2)
                body.rotation_euler.y = .024 * sin(p)
                body.location.z = .010 * sin(p * 2) * SCALE * .2
                neck(pb, pitch=-.03 * sin(p * 2 + .5) - .06 * pulse(.62, 4), yaw=.12 * pulse(.30, 5))
                skull.rotation_euler.z += .26 * pulse(.30, 5) - .12 * pulse(.74, 5)
                skull.rotation_euler.x += .07 * pulse(.62, 4)
                for i in range(CAUDALS):
                    # the `wave` idiom rather than a bare sine: a per-joint phase offset makes a
                    # loop's first frame something other than rest, and the recovery hands over
                    # into Idle rather than into a pose a quarter of a unit away from it
                    pb['tail_%02d' % i].rotation_euler.z += (.006 + .008 * i) * \
                        (sin(p * 2 - i * .4) - sin(-i * .4)) * (.35 + .65 * pulse(.8, 3))
            if clip in ['Dive', 'Rise']:
                d = 1 if clip == 'Dive' else -1
                body.rotation_euler.x = d * .22 * e
                neck(pb, pitch=d * .32 * e)
            if clip == 'Attack':
                thrust = sbump(.10, .54)
                neck(pb, pitch=.50 * thrust, yaw=-.24 * sbump(0., .24))
                skull.rotation_euler.x += .22 * thrust
                body.location.y = -.26 * thrust * SCALE * .2
            if clip == 'Heavy':
                wind = sbump(0., .28)
                peak = sbump(.24, .70)
                neck(pb, pitch=-.28 * wind + .66 * peak, yaw=-.22 * wind)
                skull.rotation_euler.x += .28 * peak
                body.location.y = (.12 * wind - .38 * peak) * SCALE * .2
                body.rotation_euler.x = -.12 * wind + .20 * peak
            if clip == 'Bite':
                neck(pb, pitch=.30 * e)
                body.location.y = -.07 * e * SCALE * .2
            if clip == 'Parry':
                body.rotation_euler.y = .24 * e
                neck(pb, yaw=.34 * e, pitch=-.22 * e)
            if clip == 'Guard':
                neck(pb, pitch=-.34, yaw=.10)
                body.location.z = -.18 * SCALE * .2 - .03 * (1 - cos(p)) * SCALE * .2
                chest.rotation_euler.x = .12
            if clip == 'Dodge':
                body.rotation_euler.y = .36 * e
                body.rotation_euler.z = -.36 * e
                body.location.x = .42 * e * SCALE * .2
                neck(pb, yaw=-.32 * e)
            if clip in ['Hit', 'Stagger']:
                k = 1 if clip == 'Hit' else 2
                body.rotation_euler.z = .16 * e * sin(p * k)
                body.rotation_euler.y = .20 * e
                neck(pb, yaw=.32 * e * sin(p * k), pitch=.18 * e)
                skull.rotation_euler.z += .20 * e * sin(p * k + .8)
            if clip == 'Breath':
                neck(pb, pitch=-.36 * e)
                body.rotation_euler.x = -.12 * e
            if clip == 'Eat':
                neck(pb, pitch=.62 + .10 * sin(p * 2))
                skull.rotation_euler.x += .14 + .06 * sin(p * 2)
                body.rotation_euler.x = .16
                body.location.z = -.14 * SCALE * .2
            if clip == 'Grab':
                neck(pb, pitch=-.20 + .06 * sin(p), yaw=.12 * sin(p * 2))
                skull.rotation_euler.z += .10 * sin(p * 2 + .6)
                body.rotation_euler.x = -.06
            if clip == 'Ability':
                # The roster's Snatch at its own 1.0 s: one committed grab at something in the
                # shallows and back, deliberately a different performance from the shore chain.
                wind = sbump(0., .35)
                grab = sbump(.30, .82)
                neck(pb, pitch=-.24 * wind + .62 * grab)
                skull.rotation_euler.x += -.14 * wind + .24 * grab
                body.location.y = (.10 * wind - .36 * grab) * SCALE * .2
                body.rotation_euler.x = .14 * wind - .20 * grab
                for key, (pts, names) in LIMBS.items():
                    hind = key.startswith('hind')
                    pb[names[0]].rotation_euler.x += (.22 if hind else -.16) * grab
            if clip == 'Growth':
                body.rotation_euler.y = .05 * e
                body.location.z = .26 * e * SCALE * .2
                neck(pb, pitch=-.10 * e)
            if clip == 'Death':
                body.rotation_euler.y += 1.15 * dead
                body.rotation_euler.x += .16 * dead
                body.location.z -= .40 * dead * SCALE * .2
                neck(pb, pitch=.42 * dead, yaw=.18 * dead)
                skull.rotation_euler.x += .20 * dead

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
            firsts[clip] = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
            lasts[clip] = state.copy()
        if clip in ('Run', 'Charge'):
            gait_track.setdefault(clip, []).append(
                [u] + [float(pb[n].rotation_euler.x) for n in
                       ['hind_upper_L', 'hind_upper_R', 'fore_upper_L', 'fore_upper_R']]
                + [float(body.location.z)])
        if clip == 'SnapLeft':
            strike_track.setdefault(clip, []).append(
                [u] + [float(pb['neck_%02d' % i].rotation_euler.z) for i in range(CERVICALS)]
                + [float(skull.rotation_euler.z)])
        limb_track.setdefault(clip, []).append(
            [[float(pb[_n].rotation_euler.x), float(pb[_n].rotation_euler.y),
              float(pb[_n].rotation_euler.z)] for _n in LIMB_ROOTS])
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
            me = ev.to_mesh()
            arr = np.array([v.co[:] for v in me.vertices])
            assert np.isfinite(arr).all(), clip
            points.extend([arr.min(0), arr.max(0)])
            ev.to_mesh_clear()
    bounds[clip] = [np.array(points).min(0).tolist(), np.array(points).max(0).tolist()]
    rig.animation_data.action = None

OPEN = {'Death', 'Lower', 'Retract'}
for c in set(CLIPS) - OPEN:
    assert seams[c] < 1e-6, (c, seams[c])
handover = {}
for a, b in [('Lower', 'SnapLeft'), ('Lower', 'SnapRight'), ('SnapLeft', 'Retract'),
             ('SnapRight', 'Retract')]:
    handover['%s->%s' % (a, b)] = float(abs(lasts[a] - firsts[b]).max())
handover['Retract->rest'] = float(abs(lasts['Retract']).max())
handover['Lower->rest'] = float(abs(lasts['Lower']).max())
for k, v in handover.items():
    if k.endswith('->rest') and k != 'Retract->rest':
        continue
    assert v < 1e-6, ('the shore chain does not hand over', k, v)
assert handover['Lower->rest'] > .10, ('the telegraph does not go anywhere', handover)
reset()
scene.frame_set(0)

gait_report = {}
for clip, rows in gait_track.items():
    a = np.array(rows)
    hind = np.abs(a[:, 1]).max() + np.abs(a[:, 2]).max()
    fore = np.abs(a[:, 3]).max() + np.abs(a[:, 4]).max()
    rise = float(a[:, 5].max() - a[:, 5].min())
    gait_report[clip] = {'hindAmplitude': float(hind), 'foreAmplitude': float(fore),
                         'hindOverFore': float(hind / max(fore, 1e-6)), 'bodyRise': rise}
    assert hind > fore * 1.4, ('a biped runs on its hindlimbs', clip, gait_report[clip])
    assert rise > .04, ('the gait must lift the body', clip, gait_report[clip])

strike_report = {}
for clip, rows in strike_track.items():
    a = np.array(rows)
    amps = np.abs(a[:, 1:]).max(0)
    peak = [float(a[int(np.argmax(np.abs(a[:, 1 + i]))), 0]) for i in range(CERVICALS + 1)]
    inorder = sum(1 for i in range(CERVICALS) if peak[i + 1] >= peak[i] - 1e-9)
    strike_report[clip] = {
        'jointsWorking': int((amps > amps.max() * .02).sum()), 'joints': CERVICALS + 1,
        'medianOverMaxJointAmplitude': float(np.median(amps[:CERVICALS]) / amps[:CERVICALS].max()),
        'baseShareOfChain': float(amps[0] / amps[:CERVICALS].sum()),
        'jointsPeakingInOrder': inorder, 'peakPhaseShoulder': peak[0], 'peakPhaseSkull': peak[-1]}
    # The opposite assertion to Tanystropheus': this neck is flexible, so the work is *spread*.
    assert strike_report[clip]['medianOverMaxJointAmplitude'] > .5, strike_report[clip]
    assert inorder >= CERVICALS - 1, strike_report[clip]

# ---- how far each limb root actually swings, per cycle --------------------------------------------
# The total angle a limb root turns through over a whole clip, summed frame to frame rather than
# taken as a peak-to-peak range: a limb that goes forward, back and forward again has swept more than
# its extremes say, and the peak-to-peak is reported beside it so the two can be read together.
#
# The user's paddling rule — a reptile's dash in water sweeping a limb from stretched forward all the
# way back to flush with the body — bears on `Charge`, the dash down into the shallows.
limb_sweep = {}
for _clip, _rows in limb_track.items():
    _per = {}
    for _j, _n in enumerate(LIMB_ROOTS):
        _seq = [r[_j] for r in _rows]
        _tot = 0.
        for _i in range(1, len(_seq)):
            _tot += math.sqrt(sum((_seq[_i][_k] - _seq[_i - 1][_k]) ** 2 for _k in range(3)))
        _per[_n] = {'sweptDeg': round(math.degrees(_tot), 1),
                    'peakToPeakDeg': [round(math.degrees(max(s[_k] for s in _seq)
                                                         - min(s[_k] for s in _seq)), 1)
                                      for _k in range(3)]}
    limb_sweep[_clip] = _per
print('LIMB_SWEEP', json.dumps({k: v for k, v in limb_sweep.items() if k in ('Run', 'Charge', 'Sprint', 'Crawl')}))

# ---- how far the mouth cut is from the lip line it was measured from ------------------------------
# The cut is the head's own section at one measured fraction of its height, and the pigment
# instrument reads that fraction station by station. This is the largest gap between the two, over
# body length: it says whether one fraction really does follow this animal's lip contour or whether
# the contour wanders and a single number is smoothing it away. Both are reported, because a large
# spread with a small deviation means something different from the reverse.
_dev, _worst = 0., None
for _x, _frac, _c in pigment_rows:
    _lo, _hi = head_lo(_x), head_hi(_x)
    _d = abs((_lo + (_hi - _lo) * _frac) - seam(_x))
    if _d > _dev:
        _dev, _worst = _d, {'x': round(_x, 4), 'measuredFraction': round(_frac, 4),
                            'usedFraction': round(JAW_FRACTION, 4),
                            'sectionHeight': round(_hi - _lo, 5)}
_fracs = [r[1] for r in pigment_rows]
mouth_cut = {'maxDeviationRaw': round(_dev, 5),
             'maxDeviationOverBodyLength': round(_dev / RAW_LENGTH, 5),
             'worstStation': _worst, 'stations': len(pigment_rows),
             'measuredFractionMin': round(min(_fracs), 4),
             'measuredFractionMax': round(max(_fracs), 4),
             'measuredFractionMedianUsed': round(JAW_FRACTION, 4),
             'method': 'no modelled mouth slit on this head (the cavity instrument finds no cavity), '
                       'so the lip line is read off the albedo per station and the cut is the head '
                       'section at the median of those readings'}
print('MOUTH_CUT', json.dumps(mouth_cut))

# ---- anchors, export -------------------------------------------------------------------------------
anchors = [
    {'name': 'anchor_mouth', 'bone': 'jaw',
     'point': list(tx((X_SNOUT - .012, head_y(X_SNOUT - .012), seam(X_SNOUT - .012) - .004))), 'role': 'mouth'},
    {'name': 'anchor_mouth_inside', 'bone': 'skull',
     'point': list(tx((MOUTH_BACK + .024, head_y(MOUTH_BACK + .024), seam(MOUTH_BACK + .024)))), 'role': 'swallow'},
    {'name': 'anchor_attack_primary', 'bone': 'skull',
     'point': list(tx((X_SNOUT + .004, head_y(X_SNOUT), seam(X_SNOUT)))), 'role': 'attack'}]
sockets = K.make_sockets(rig, anchors)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2))

for group, suffix in [(AUTH_GROUP, ''), (PUP_GROUP, '.puppet')]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, ID + suffix + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, **K.EXPORT)
    K.patch(path, anchors, drop_nodes=('root',))
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(K.triangles(o) for o in AUTH_GROUP) + sum(K.triangles(o) for o in oralparts)
puppet_tris = sum(K.triangles(o) for o in PUP_GROUP) + sum(K.triangles(o) for o in oralparts)
meta = {
    'id': ID, 'name': 'Coelophysis', 'species': 'Coelophysis bauri',
    'description': 'Canonical Tripo body with its tail unbent and a procedural volume twin on one '
                   '%d-joint rig: an eight-joint S-curved neck, an articulated jaw with a lined '
                   'mouth and authored tooth rows, long bipedal hindlimbs and small tucked arms, '
                   'and the shore animal\'s telegraph, strike and recovery beside a land gait, a '
                   'dash into the shallows and a retreat up the beach.' % len(B),
    'modelLength': round(model_length, 4), 'lengthMeters': 3., 'locomotion': 'Crawl',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'notes': [
        'The narrow skull, the S-curved neck, the long hindlimbs, the small tucked arms and the '
        'very long tail are retained from the accepted Tripo volume, which arrives as one shell '
        'once welded with nothing to remove.',
        'The generated tail curved across the plan while the greenlit pose holds it out behind as '
        'a counterweight. Intake unbends it by carrying every cross-section rigidly onto a target '
        'of the same segment lengths and the same per-segment rise; UNBEND_TAIL=False rebuilds the '
        'generated sweep. The neck is not touched.',
        'The axis is measured from two declared seeds, tail tip and snout, because this body\'s '
        'longest geodesic path runs claw to tail tip rather than snout to tail tip.',
        'The twin resurfaces a %.4f-unit voxel occupancy field, relaxes it once and reduces the new '
        'topology.' % VOXEL,
        'This head models no mouth cavity and no teeth. The seam is placed on the head\'s own '
        'measured section at the height the painted mouth line measures, and the tooth rows are '
        'authored into the lined lumen. That is a reconstruction and is recorded as one.',
        'Same rest rig, inverse binds, sockets and all %d action sample arrays for authored body '
        'and puppet. The LOD keeps every clip.' % len(CLIPS),
        'Lower, SnapLeft/SnapRight and Retract are timed to TELEGRAPH and the strike phase in '
        'src/sim/triassic/shore.ts and hand over to each other rather than returning to rest. Run '
        'is the land gait, Charge the dash into the shallows and Retreat the bolt back up the '
        'beach. Living colours, soft tissues and movements are artistic reconstruction; locomotor '
        'translation remains engine-owned.']}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2))

report = {
    'sourceSha256': hashlib.sha256(open(RAW, 'rb').read()).hexdigest(), **intake,
    'remeshTriangles': remesh_triangles, 'puppetBudget': PUPPET_BUDGET, 'voxel': VOXEL,
    'fullTriangles': authored_tris, 'puppetTriangles': puppet_tris,
    'parts': {'authoredBody': K.triangles(auth), 'authoredJaw': K.triangles(AUTH_GROUP[1]),
              'puppetBody': K.triangles(puppet), 'puppetJaw': K.triangles(PUP_GROUP[1]),
              'sharedOral': sum(K.triangles(o) for o in oralparts)},
    'bones': len(B), 'cervicals': CERVICALS, 'caudals': CAUDALS,
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'modelLength': model_length, 'rawLength': RAW_LENGTH,
    'maximumEnvelopeDifference': worst, 'envelopeTolerance': TOL, 'envelopeTolerancePercent': 4.,
    'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceDistanceP99': float(np.quantile(distances, .99)),
    'surfaceOutliersOverThreePercent': surface_outliers, 'surfaceVertices': len(distances),
    'seatingDepthRaw': seating, 'jawHingeHeadRadius': HEAD_R, 'headLateralOffset': HEAD_OFFSET,
    'jawHingeDepthAsFractionOfHeadRadius': seating['jaw'] / HEAD_R,
    'oralInteriorDepthRaw': oral_depth, 'oralSeatingCorrection': oral_seating,
    'maxInfluences': max(influences), 'meanInfluences': float(np.mean(influences)),
    'trunkYawCorrectionDegrees': round(math.degrees(trunk_yaw), 3), 'unbending': unbending, 'restPose': rest_pose,
    'caudalChainStart': float(TAIL_START), 'pelvisFractionOfTrunk': PELVIS, 'skullFractionOfNeck': SKULL_T,
    'mouth': {'method': 'no modelled cavity on this head; the seam follows the head\'s own measured '
                        'section at the painted mouth line\'s measured height, and the teeth are authored',
              'cavityVerticesFound': int(len(CAVITY)), 'jawFractionOfHeadSection': JAW_FRACTION,
              'pigmentContrast': PIGMENT_CONTRAST, 'pigmentStations': pigment_rows,
              'proudPatches': patch_report,
              'hingeX': HINGE_X, 'mouthBackX': MOUTH_BACK, 'mouthFrontX': MOUTH_FRONT,
              'liningInset': LINING_INSET, 'liningCullsBackfaces': True, 'skinDoubleSided': True},
    'gait': gait_report, 'strike': strike_report, 'shoreChainHandover': handover,
    'limbSweep': limb_sweep, 'mouthCut': mouth_cut,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('COELOPHYSIS_REPORT', json.dumps({k: v for k, v in report.items() if k != 'boundsAt13Phases'}))
