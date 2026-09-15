"""Rebuild Macrocnemus: the generated body oriented and its tail unbent, a measured voxel twin,
and one skeleton carrying the shore runner's performance.

Blender 5.2. Geometry coordinates are raw Tripo metres (X snoutward, Y left, Z up) until the final
engine transform tx(). The generic intake machinery is `tools/triassic/creatures/shorekit.py`;
everything in this file is Macrocnemus.

  /opt/blender/blender --background --factory-startup --python tools/triassic/creatures/macrocnemus/build.py

The animal: about 90 cm of long-hindlimbed terrestrial tanystropheid that ran the beaches, possibly
on two legs, like a modern basilisk (Miedema et al. 2020; Fraser & Furrer 2013). In the game it is
a shore animal with no reach at all — `reachOf` in src/sim/triassic/shore.ts returns zero for it —
so it never strikes from its post. It stands, it watches, and it *runs*: the reviewer's brief is
that it goes into the water after something too near the shoreline and comes back out. That is what
Run, Charge, Snatch and Retreat are for, and why a walk cycle that never leaves the post would miss
the animal entirely.

The measurement note that matters here: this body's longest geodesic path is **claw to tail tip**,
not snout to tail tip, because the hindlimbs are as long as the neck. Banding from the wrong seed
reads a shin as a neck, which is the shape of the finding that left Macrocnemus CANNOT TELL in
`docs/triassic/proportion-audit.md`. So the axis is measured twice, from two declared seeds: once
from the tail tip forward, once from the snout back, and the two runs meet at the shoulder.
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

LOCAL = os.path.join(ROOT, 'local/triassic-authoring/macrocnemus')
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/macrocnemus.raw.glb')
ID = 'macrocnemus'
SCALE = 5

CERVICALS = 6
CAUDALS = 10                   # 52-53 caudals in life: a long whippy tail, ten controls
UNBEND_TAIL = True             # False rebuilds the generated tail sweep, for comparison
VOXEL = 0.0034                 # the shins measure r ~ 0.007: a coarser field loses a leg
PUPPET_BUDGET = 7000
# How many passes the weight relaxation takes over the mesh's own edge graph. `shorekit` did not
# relax at all until Coelophysis was repaired, which is the whole reason the three shore animals
# read 25.3x, 23.3x and 6.1x on `skin-tears.mjs` while every body on the marine kit sat between
# 1.4x and 12x. The number is measured on the animal, not picked; see the README.
RELAX_PASSES = 14

# The two seeds and where each run stops, in the raw frame, measured once by banding the surface
# and reading the section radius at every station.
SEED_TAIL = (0, 1, 0)
SEED_SNOUT = (0, -1, .8)
TAIL_END, NECK_END = .70, .30

CLIPS = {'Idle': 3., 'Swim': 1.6, 'Sprint': 1., 'TurnLeft': 1.4, 'TurnRight': 1.4, 'Dive': 1.2,
         'Rise': 1.2, 'Attack': .8, 'Bite': .4, 'Heavy': .9, 'Hit': .5, 'Death': 1.6, 'Guard': 1.,
         'Parry': .3, 'Dodge': .4, 'Eat': 1.4, 'Stagger': 1., 'Ability': 1., 'Grab': 1.,
         'Breath': 2., 'Growth': 1.4, 'Crawl': 1.4,
         'Run': .62, 'Charge': 1., 'Snatch': .7, 'Retreat': 1.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Crawl', 'Run']

# ---- intake -------------------------------------------------------------------------------------
K.reset_scene()
auth, intake = K.import_and_weld(RAW, 'Macrocnemus authored body', min_component=200)
assert intake['sourceComponents'] == 1, intake          # one shell once welded; nothing to remove
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
# The greenlit pose (docs/triassic/canonical/macrocnemus.png) strides along the shore with its tail
# held straight out behind and drooping at the tip; the generation curves it a fifth of a body width
# across the plan. Every caudal cross-section is carried rigidly from its own measured centreline
# frame onto a target of the same segment lengths and the same per-segment rise, so the tail keeps
# its droop and nothing is stretched, sheared or thinned. The neck is *not* touched: it is raised at
# the angle the pose holds it, and that is the animal.
unbending = {'applied': UNBEND_TAIL}
tail_rows = [r for r in tail_line if r['geo'] <= TAIL_END]
pts = [Vector(r['c']) for r in tail_rows][::-1]
tail_r = [r['r'] for r in tail_rows][::-1]
_, TCUM = K.poly(pts)


def tail_radius(s):
    # How wide the run is at this arc position, from the banding's own section radius. The gate
    # matters: the hind feet sit *behind* the tail's base station, and without it they are swung
    # bodily round with the correction and the surface folds at the hip.
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
assert .95 < RAW_LENGTH < 1.30, RAW_LENGTH
tail_line, neck_line = runs()

# ---- the axis: the two runs, meeting at the shoulder --------------------------------------------
TAIL_AXIS = [Vector(r['c']) for r in tail_line if r['geo'] <= TAIL_END]          # tip -> hips
NECK_AXIS = [Vector(r['c']) for r in neck_line if r['geo'] <= NECK_END][::-1]    # shoulder -> snout
HIPS = TAIL_AXIS[-1]
SHOULDER = NECK_AXIS[0]
assert SHOULDER.x > HIPS.x, (tuple(SHOULDER), tuple(HIPS))


# The trunk axis is the straight line between the two measured ends, which is what it is on a
# standing animal drawn in a stride. Reading it off vertical slabs instead would be reading the
# hindlimbs: at the hip station the legs fill the bottom two thirds of the slab and drag the
# mid-height down by a fifth of a body height, which is the sort of number that silently puts a
# spine inside a thigh.
TRUNK_DZ = (SHOULDER.z - HIPS.z) / max(SHOULDER.x - HIPS.x, 1e-6)


def spine_z(x):
    return float(HIPS.z + (x - HIPS.x) * TRUNK_DZ)


# The head is measured *as the head*: the part of the surface whose nearest point on the neck run's
# own axis lies in its first HEAD_GEO of arc. A box or a z threshold would take the forelimbs in
# with it — they reach as far forward as the snout does on this animal, which is also why the
# cavity instrument answered with sixty vertices between the toes the first time it was asked.
HEAD_GEO = .115
HEAD_AXIS = [Vector(r['c']) for r in neck_line if r['geo'] <= HEAD_GEO]
HP, HCUM = K.poly(HEAD_AXIS)


def on_head(c, r=.055):
    return K.project(HP, HCUM, Vector(c))[0] < r


HEAD_CO = co[np.array([on_head(c) for c in co])]
assert len(HEAD_CO) > 200, len(HEAD_CO)
HEAD_X = np.linspace(float(HEAD_CO[:, 0].min()) + .004, float(HEAD_CO[:, 0].max()) - .003, 22)


def head_section(x, half=.007):
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
# The skull is not on the midline. This generation is drawn, not mirrored: its head sits about a
# third of its own width to the left of the body's centre, and everything about the mouth — the
# hinge, the lumen, the tooth rows and the anchors — is built on the head's own lateral axis
# rather than on y = 0, because on y = 0 it would be outside the head.
HY = K.blur(np.array([s[3] for _, s in HEAD]), 1.2)
HEAD_OFFSET = float(np.median(HY))


def head_lo(x):
    return float(np.interp(x, HX, HLO))


def head_hi(x):
    return float(np.interp(x, HX, HHI))


def head_y(x):
    return float(np.interp(x, HX, HY))


# ---- material and twin --------------------------------------------------------------------------
mat = K.authored_material(auth, 'Macrocnemus body pigmentation')
albedo = K.Albedo(auth)
puppet, remesh_triangles = K.voxel_twin(auth, 'Macrocnemus procedural volume puppet', VOXEL,
                                        PUPPET_BUDGET, albedo, 'Macrocnemus puppet body')

# ---- the shared skeleton --------------------------------------------------------------------------
def tx(p):
    x, y, z = p
    return Vector((y * SCALE, -x * SCALE, z * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


depth = K.depth_probe(auth)


def along(axis, t):
    """A point a fraction t of the way along a measured polyline, by arc length."""
    P, cum = K.poly(axis)
    s = t * cum[-1]
    i = max(0, min(len(P) - 2, int(np.searchsorted(cum, s)) - 1))
    span = max(cum[i + 1] - cum[i], 1e-9)
    return P[i] + (P[i + 1] - P[i]) * ((s - cum[i]) / span)


bone('root', (0, 0, 0), None)
# The pelvis is not put at the hip band's own centroid. That band has both hindlimbs in it, and the
# limbs pull its centroid down and out of the animal — the measured depth there is 0.009 *outside*
# the skin. The bone goes a fifth of the trunk's length forward of it, where the trunk is solid, and
# the same fact starts the caudal chain a tenth of the way along the tail rather than at its base.
PELVIS = .20
BODY_PT = (float(HIPS.x + PELVIS * (SHOULDER.x - HIPS.x)),
           float(HIPS.y + PELVIS * (SHOULDER.y - HIPS.y)),
           spine_z(HIPS.x + PELVIS * (SHOULDER.x - HIPS.x)))
CHEST_PT = (float(SHOULDER.x), float(SHOULDER.y), spine_z(SHOULDER.x))
bone('body', BODY_PT, 'root')
bone('chest', CHEST_PT, 'body')
# The neck is left raised, as the pose holds it, and the cervicals follow its measured centreline.
NECK_PTS = []
for i in range(CERVICALS):
    p = along(NECK_AXIS, .06 + .78 * i / (CERVICALS - 1))
    NECK_PTS.append((float(p.x), float(p.y), float(p.z)))
    bone('neck_%02d' % i, NECK_PTS[-1], 'chest' if i == 0 else 'neck_%02d' % (i - 1))
_sk = along(NECK_AXIS, .90)
SKULL_PT = (float(_sk.x), float(_sk.y), float(_sk.z))
bone('skull', SKULL_PT, 'neck_%02d' % (CERVICALS - 1))
# **The hinge comes from the head's own measured span, not from the skull bone.** The bone sits 0.90
# of the way along the neck axis, which is near the front of the head, so `SKULL_PT[0] + .012` cut a
# sliver off the snout instead of a mandible: the widest gape this animal has — `Snatch`, 28.6° of
# jaw, more than Tanystropheus opens — read as a black triangle a few pixels across with the cut
# edge of the "mandible" showing beside it as a bare pale facet. Coelophysis had exactly this fault
# and this is its fix. A lizard's jaw is most of its skull.
HINGE_X = float(X_SNOUT - .66 * (X_SNOUT - float(HX[0])))
# The caudals follow the tail's own measured centreline, lateral drift included: after the unbend
# the tail runs straight in plan but it does not run down y = 0, because the trunk it leaves is not
# centred on y = 0 either. Forcing a bone onto the midline is how a caudal ends up outside its tail.
# Where the chain starts is measured, not chosen: walk forward along the tail's own axis until the
# depth probe says the station is properly inside the animal. The first few stations are hip band
# centroids with both hindlimbs in them, and they sit outside the skin for the same reason the
# pelvis bone above is moved forward.
TAIL_START = next(t for t in np.arange(.02, .40, .01) if depth(along(TAIL_AXIS[::-1], float(t))) > .004)
TAIL_PTS = []
for i in range(CAUDALS):
    p = along(TAIL_AXIS[::-1], float(TAIL_START) + (.98 - float(TAIL_START)) * i / (CAUDALS - 1))
    TAIL_PTS.append((float(p.x), float(p.y), float(p.z)))
    bone('tail_%02d' % i, TAIL_PTS[-1], 'body' if i == 0 else 'tail_%02d' % (i - 1))

# Measured off the below-belly clustering of the intake mesh. The hindlimbs are the animal's
# engine — half again the forelimbs' length — and the two sides differ because the generation is
# drawn mid-stride; each limb is rigged to its own axis and nothing here makes them match.
# Measured off the below-belly clustering of the intake mesh: each cluster's bands from the ground
# up give the foot, the ankle and the knee, and the root is the socket above them — forward of the
# tail base, where the measured depth says the pelvis actually is rather than where a straight line
# through the hips would put it.
LIMB_PTS = {
    'foreL': [(.298, .024, .012), (.274, .074, -.117), (.290, .085, -.184), (.314, .099, -.207)],
    'foreR': [(.300, -.024, .012), (.309, -.075, -.115), (.336, -.083, -.185), (.359, -.097, -.205)],
    'hindL': [(.145, .026, -.008), (.070, .082, -.112), (.020, .062, -.175), (.033, .087, -.215)],
    'hindR': [(.148, -.026, -.008), (.101, -.079, -.112), (.088, -.092, -.175), (.105, -.126, -.210)]}
seating = {}
LIMBS = {}
for key, pts in LIMB_PTS.items():
    kind = 'fore' if key.startswith('fore') else 'hind'
    s = key[-1]
    names = [kind + '_upper_' + s, kind + '_lower_' + s, kind + '_foot_' + s]
    root = K.seat(pts[0], (pts[0][0], 0, spine_z(pts[0][0])), .012, depth)
    pts = [tuple(root)] + [tuple(p) for p in pts[1:]]
    LIMB_PTS[key] = pts
    LIMBS[key] = (pts, names)
    seating[names[0]] = depth(pts[0])
    for i, n in enumerate(names):
        bone(n, pts[i], ('chest' if kind == 'fore' else 'body') if i == 0 else names[i - 1])
# Seated against the head's own section *at the hinge station* rather than against the skull bone's
# height: the bone sits further forward where the head is a different depth, and the hinge has to be
# inside the head where it actually hinges.
HINGE_MID = (head_lo(HINGE_X) + head_hi(HINGE_X)) / 2
JAW_PT = (HINGE_X - .004, head_y(HINGE_X), (HINGE_MID + head_lo(HINGE_X)) / 2)
JAW_PT = tuple(K.seat(JAW_PT, (HINGE_X, head_y(HINGE_X), HINGE_MID),
                      max(.0040, .30 * float(np.interp(HINGE_X, HX, (HHI - HLO) / 2))), depth))
bone('jaw', JAW_PT, 'skull')
SKULL_PT = tuple(K.seat(SKULL_PT, (SKULL_PT[0], head_y(min(max(SKULL_PT[0], HX[0]), HX[-1])), SKULL_PT[2]), .0060, depth))
B['skull'] = (Vector(SKULL_PT), 'neck_%02d' % (CERVICALS - 1))
seating['skull'] = depth(SKULL_PT)
seating['jaw'] = depth(JAW_PT)
seating['neck_00'] = depth(NECK_PTS[0])
seating['body'] = depth(BODY_PT)
seating['chest'] = depth(CHEST_PT)
for i in range(CAUDALS):
    seating['tail_%02d' % i] = depth(TAIL_PTS[i])
for i in range(1, CERVICALS):
    seating['neck_%02d' % i] = depth(NECK_PTS[i])
print('SEATING', json.dumps({k: round(v, 5) for k, v in seating.items()}))
HEAD_R = float(np.interp(HINGE_X, HX, (HHI - HLO) / 2))
# The floors differ because the parts do: a limb root is in the trunk and has centimetres to spare,
# a jaw hinge is in a head a hundredth of a body length through, and the last caudal is in a tail
# tip of radius 0.005 where a millimetre inside is a fifth of the way to the axis.
for n, d in seating.items():
    floor = .0035 if n in ('jaw', 'skull') else (.0010 if n.startswith(('tail_', 'neck_')) else .008)
    assert d > floor, ('a root sits outside the intake surface', n, d, floor)
assert seating['jaw'] / HEAD_R > .25, ('the jaw hinge is not seated in the head', seating['jaw'], HEAD_R)

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
# Same instrument as Tanystropheus, and the same answer: this generated head is a closed taper with
# the mouth painted on it, so the seam is placed on the head's own measured section at the height
# the painted line measures, and the teeth are authored. The contrast across that line is asserted
# before anything is cut.
MOUTH_GAP = .026
CAVITY = K.mouth_cavity(auth, on_head, MOUTH_GAP)
SNOUT_BACK, SNOUT_FRONT = float(HX[0]) + .004, float(HX[-1]) - .004


def pigment_seam():
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
            if not (x0 <= c.x < x1) or abs(c.y - head_y(c.x)) < .003:
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
assert PIGMENT_CONTRAST > .03, ('no painted mouth line to read', PIGMENT_CONTRAST, pigment_rows)
assert .15 < JAW_FRACTION < .65, (JAW_FRACTION, pigment_rows)
# **The lining runs behind the hinge, not up to it.** Birgeria's last four pixels of through-hole
# were a lining that stopped short of its own hinge, and this one did the same: with a real mandible
# to swing, the corner of the mouth opened 18 px of backdrop at `Snatch` because the lumen's rearmost
# ring sat 0.004 in front of the cut and was pinched to a seventh of its width there, while the cut
# itself ran full width to the hinge. The cut is what has to be covered.
MOUTH_BACK = HINGE_X - .008
# The lumen stops 0.008 short of the snout, not 0.004: the last stretch of this snout is a needle
# thinner than the smallest lumen the section function will draw, and a ring that does not fit is a
# ring `seat_inside` collapses onto the axis.
MOUTH_FRONT = X_SNOUT - .008


def seam(x):
    lo, hi = head_lo(x), head_hi(x)
    return lo + (hi - lo) * JAW_FRACTION


#
# **And both sides are cast, not one.** `head_y` is the median of the section over a band, which on
# a head that is drawn rather than mirrored is not the middle of the mouth: taking the *nearer* wall
# as the half-width put the lumen 0.86 of the way to one cheek and left a strip of open mouth beside
# it on the other, and a ray down the middle of the gape went straight past the lining and hit the
# inside of the far cheek — 18 px of backdrop that three corrections to the lining and two to the
# hinge plug did not move by a single pixel, because none of them was about the thing that was wrong.
_SEAM_SECTION = {}


def seam_section(x):
    """The head's own section at the mouth line: its lateral centre and half-width, both cast."""
    key = round(x, 6)
    if key not in _SEAM_SECTION:
        y0, z = head_y(x), seam(x)
        edge = []
        for s in (1., -1.):
            d = .0005
            while d < .06 and depth((x, y0 + s * d, z)) > 0:
                d += .0005
            edge.append(s * d)
        hi, lo = max(edge), min(edge)
        _SEAM_SECTION[key] = (y0 + (hi + lo) / 2, (hi - lo) / 2)
    return _SEAM_SECTION[key]


def mouth_centre(x):
    return seam_section(x)[0]


def seam_half_width(x):
    return seam_section(x)[1]


def is_jaw(c):
    """**A mandible is a piece of the head, and the test has to say so.**

    `HINGE_X < c.x and c.z < seam(c.x)` is a half-space, and it was survivable only while the hinge
    was wrong: taken from the skull bone it sat so far forward that nothing but the snout was in
    front of it. Moved back to where a lizard's jaw actually hinges, that half-space also catches
    this animal's raised **right hand**, which the generation draws mid-stride at x 0.388 directly
    under the head — and a handful of its faces then leave with the jaw and take a hole in the hand
    with them. So the test is bounded to the head's own axis, and given a floor at the head's
    measured underside the way Coelophysis' is.
    """
    if not (HINGE_X < c.x < X_SNOUT + .02):
        return False
    if not on_head(c, .060):
        return False
    return head_lo(c.x) - .014 < c.z < seam(c.x) - 1e-7


# Relief on this head is ridge and rugosity, not teeth: the patches that stand proud of the same
# surface smoothed are the brow, the nostril and the lip ridges. What matters is that nothing the
# instrument finds is *split* by the seam in a way a tooth would be, so every patch is recorded
# with how it fell and the build refuses a patch that straddles with real relief on both sides.
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

# What left with the jaw, measured: one piece the size of a head's lower half and nothing else. The
# build refuses a mandible that reaches further than the head does, which is what an unbounded
# `is_jaw` gave it.
# **Both halves of the cut get a lip.** The rim is one polygon thick otherwise, and at a grazing
# angle a one-polygon rim is a hole; see `K.rim_flange`. It runs on the authored body and its twin
# alike, and only the mouth cut is open on either, so nothing else is folded.
# The fold runs out before the snout: at the very tip the two rims meet round the front of the
# mouth, and folding both of them inwards there parts them instead of closing them — 12 px in every
# clip, at any gape, which is the signature of something that is not about the gape at all.
RIM_FOLD = (lambda c: .0035 * K.smooth((X_SNOUT - .010 - c.x) / .008))
_rim_axis = (lambda c: Vector((min(max(c.x, MOUTH_BACK), X_SNOUT - .002),
                               mouth_centre(min(max(c.x, MOUTH_BACK), X_SNOUT - .002)),
                               seam(min(max(c.x, MOUTH_BACK), X_SNOUT - .002)))))
RIM = {}
for o in [auth, puppet] + list(parts['lower jaw'].values()):
    RIM[o.name] = K.rim_flange(o, _rim_axis, RIM_FOLD)
print('RIM', json.dumps(RIM))
assert all(v > 20 for v in RIM.values()), ('a cut half has no rim to fold', RIM)

MANDIBLE = {}
for name, part in parts['lower jaw'].items():
    q = np.array([v.co[:] for v in part.data.vertices])
    MANDIBLE[name] = {'vertices': len(q), 'polygons': len(part.data.polygons),
                      'box': [round(float(v), 4) for v in (q.max(axis=0) - q.min(axis=0))],
                      'xRange': [round(float(q[:, 0].min()), 4), round(float(q[:, 0].max()), 4)]}
    assert max(MANDIBLE[name]['box']) < (X_SNOUT - float(HX[0])) * 1.25, \
        ('the mandible reaches further than the head does', name, MANDIBLE[name])
    assert MANDIBLE[name]['vertices'] > 120, ('the mandible is a sliver', name, MANDIBLE[name])
print('MANDIBLE', json.dumps(MANDIBLE))

mouthmat = K.flat_material('Macrocnemus mouth interior', (.30, .125, .115, 1), .62, cull=True)
toothmat = K.flat_material('Macrocnemus teeth', (.82, .79, .70, 1), .28)
oralparts = []
LINING_INSET = .94
LINING_POWER = 3.0


#
# **The width is cast from the mouth's own axis, not taken from the head's widest measurement.**
# `HW` is a 96th percentile of |y| over the whole section, which is the head at its *broadest*; the
# seam on this animal sits at 0.229 of the section, low on a head that tapers downward, so 0.86 of
# the broadest measurement is wider than the head actually is where the mouth is. The lining stood
# 0.0038 outside the skin at six stations and only `seat_inside`'s unclamped pull hid it — by
# collapsing rings onto the axis, which is a worse defect and the one that read 1076x. Birgeria's
# lesson exactly: a lateral ray from the mouth axis crosses the lumen and hits the cheek, so width
# can always be cast, and casting is what to do.
def mouth_section(x):
    # **The back end does not taper at all.** It did, to a seventh of its width at the rearmost
    # ring, and the corner of the mouth is precisely where a lumen narrower than its own cut lets a
    # ray past it: the lining runs behind the hinge at the head's own full section there, which is
    # the flange-behind-the-hole the cephalopod linings are built with for the same reason. Only the
    # snout end tapers, because the snout does.
    e = K.smooth((MOUTH_FRONT - x) / .007)
    lo, hi = head_lo(x), head_hi(x)
    w = seam_half_width(x) * LINING_INSET
    # The half-height is bounded by the room *below* the mouth line, not by the whole section: the
    # seam sits at 0.229 of this head's depth, so a lumen 0.26 of it deep puts its floor through the
    # mandible. An ellipse hid that by pulling its corners in; a squircle does not.
    h = max((hi - lo) * min(.26, JAW_FRACTION * .82) * LINING_INSET, .0016) * (.45 + .55 * e)
    return w, h


# How much head there is round the mouth line at each station. **This is what the palate and the
# floor are each sized to fill**, and it is the difference between two shells and one sac: the lumen
# is much narrower than the head that holds it, so two shells drawn to the lumen alone leave a gap
# either side of them and a ray into the gape passes between them and hits the inside of the far
# cheek. The sac's stretching wall used to stand across exactly that line. Read off this builder's
# own measured head profile rather than cast, because the mandible has been cut off the body by now
# and a ray downwards would go straight through where it used to be.
def mouth_room(_x):
    return (float(np.interp(_x, HX, HW)), head_hi(_x) - seam(_x), seam(_x) - head_lo(_x))


lining, lin_raw = K.oral_lining('Oral cavity lining', (MOUTH_BACK, MOUTH_FRONT), mouth_section,
                                seam, tx, rings=16, ring=14, centre=mouth_centre,
                                # A squircle, not an ellipse: see `K.oral_lining`.
                                power=LINING_POWER, room=mouth_room)
lining.data.materials.append(mouthmat)

# Small conical insectivore's teeth, both jaws, running the length of the lumen.
TOOTHROWS = []
for label, side, bonename in [('Upper tooth row', -1, 'skull'), ('Lower tooth row', 1, 'jaw')]:
    verts = []
    faces = []
    n = 6
    for k in range(n):
        u = k / (n - 1)
        x = MOUTH_FRONT - .008 - u * .044
        w, h = mouth_section(x)
        length = (.0060 - .0018 * u)
        for sgn in (1, -1):
            base = len(verts)
            cy = mouth_centre(x) + sgn * max(.0016, w * .74)
            root = Vector((x, cy, seam(x) - side * h * .60))
            tip = root + Vector((-length * .22, -sgn * length * .06, side * length))
            for ring in range(2):
                t = ring / 1.
                c = root + (tip - root) * t * .55
                r = .0016 * (1 - t * .5)
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
             + [BODY_PT, CHEST_PT]
             + [tuple(p) for p in NECK_PTS] + [SKULL_PT, (X_SNOUT, head_y(X_SNOUT), seam(X_SNOUT))])
AXIAL_NAMES = (['tail_%02d' % i for i in range(CAUDALS - 1, -1, -1)] + ['body', 'chest']
               + ['neck_%02d' % i for i in range(CERVICALS)] + ['skull'])
AXIAL = K.AxialChain(AXIAL_PTS, AXIAL_NAMES)
# The authored radii this body was first bound with, kept for the record: `r0 + r1·t²` per kind.
RADII = {'fore': (.010, .013, .030, .026), 'hind': (.012, .016, .036, .030)}
# **The distal radius is measured off the body, not guessed.** Authored, it left this animal's long
# toes on a partial alpha carrying trunk weight, which is most of what `skin-tears.mjs` read at
# 23.31x. `t_floor` is past the knee and the elbow; `span` refuses a flood that has walked out of
# the limb, and on this body a lower limb is about a sixth of it across.
LIMB_FITS, LIMB_RADII = [], {}
for key, (pts, names) in LIMBS.items():
    # No `blend` here: each joint takes a fraction of the segments it joins, never a constant copied
    # from another animal's limb. See `K.Limb`.
    limb = K.Limb(pts, names, RADII[key[:4]], .045, AXIAL)
    limb.measured, fill = K.measure_radii(auth, limb, t_floor=.48, margin=.010, span=.36)
    LIMB_RADII[key] = {'rows': [[round(x, 5) for x in r] for r in limb.measured],
                       'jointBlend': [round(b, 5) for b in limb.blend],
                       'segments': [round(limb.cum[i + 1] - limb.cum[i], 5)
                                    for i in range(len(limb.cum) - 1)], **fill}
    LIMB_FITS.append(limb)
print('LIMB_RADII', json.dumps(LIMB_RADII))


def trunk_pullback(v, w):
    """Shoulder skin that happens to lie nearest a cervical belongs to the chest.

    **Every gate here is a slope, and the bid is their product.** It was three hard tests — behind
    `SHOULDER.x + .06`, *and* either wider than 0.034 or more than 0.050 off the spine — and the
    second arm of that `or` handed out `pull = 1.0` flat, so two vertices a hundredth apart either
    side of 0.050 took opposite answers. Coelophysis' worst edge in the era came from exactly that
    line; a window with a soft edge has nowhere for a blade to run past.
    """
    behind = K.smooth(((SHOULDER.x + .06) - v.x) / .045)
    if behind <= 0:
        return w
    pull = behind * max(K.smooth((abs(v.y) - .034) / .018),
                        K.smooth((abs(v.z - spine_z(v.x)) - .042) / .018))
    if pull <= 0:
        return w
    moved = sum(val for n, val in w.items() if n.startswith('neck'))
    if moved > 0:
        for n, val in list(w.items()):
            if n.startswith('neck'):
                w[n] = val * (1 - pull)
        w['chest'] = w.get('chest', 0) + moved * pull
    return w


# **The throat follows the jaw.** The mandible is rigid on `jaw` and the skin behind the hinge is on
# the axial chain, and with nothing blending between them a wide gape separates the two: this
# animal's pale gular skin reads as a flat slab hanging off a detached lower jaw, and under a
# single-sided material the wedge is a hole straight through the head. A small gape hid it, which is
# why moving the hinge without this would have traded a quiet defect for a loud one. Rhaeticosaurus
# and Birgeria each had to learn the same thing.
#
# The share is **full at the mouth line and full at the cut plane**, not half of either: a ramp
# centred on the cut reads 0.5 exactly where the mandible's own 1.0 meets it, and that step is the
# seam opening. It is bounded behind by `THROAT_SPAN` — a third of this head's length, so a bending
# neck is not dragged round by the jaw — and above by the seam, because everything over the mouth
# line is cheek.
#
# And it is bounded **radially about the hinge as well**, which a window in the body axis alone is
# not. This animal is drawn mid-stride with its neck raised, so its right hand sits at x 0.388 —
# inside any x window the throat needs — a fifth of a body *below* the head. Gated on x and height
# only, 41 % of the hand went to `jaw`, and `skin-tears.mjs` read 15.09x on edges carrying
# `jaw = 0.58` against `fore_foot_R = 0.41`. A throat is a place on the animal, not a slab of space.
THROAT_SPAN = .034
THROAT_DROP = .16
THROAT_REACH = .048
THROAT_SEAM = seam(HINGE_X)
THROAT_HALF = max((head_hi(HINGE_X) - head_lo(HINGE_X)) / 2, .004)
HINGE_PT = Vector((HINGE_X, head_y(HINGE_X), THROAT_SEAM))


def throat_jaw_share(q):
    a = K.smooth(((HINGE_X + .014) - q.x) / .014)
    b = K.smooth((q.x - (HINGE_X - THROAT_SPAN)) / THROAT_SPAN)
    c = K.smooth((THROAT_SEAM - q.z) / (THROAT_DROP * THROAT_HALF) + 1.)
    d = K.smooth((THROAT_REACH - (Vector(q) - HINGE_PT).length) / (THROAT_REACH * .5))
    return a * b * c * d


def skin_extra(v, w):
    share = throat_jaw_share(v)
    if share > 0:
        w = {n: val * (1 - share) for n, val in w.items()}
        w['jaw'] = w.get('jaw', 0.) + share
    return trunk_pullback(v, w)


def weights(p):
    return K.skin_weights(p, AXIAL, LIMB_FITS, extra=skin_extra)


# What the throat share actually claims, measured rather than assumed: a gular patch under the back
# of the head. The build refuses one that has reached anything else.
_throat = [Vector(v.co[:]) for v in auth.data.vertices if throat_jaw_share(Vector(v.co[:])) > .05]
assert len(_throat) > 30, ('the throat share claims nothing', len(_throat))
_tbox = np.array([tuple(p) for p in _throat])
THROAT_REGION = {'vertices': len(_throat),
                 'box': [round(float(v), 4) for v in (_tbox.max(axis=0) - _tbox.min(axis=0))],
                 'span': THROAT_SPAN, 'reach': THROAT_REACH, 'seam': round(THROAT_SEAM, 5)}
assert max(THROAT_REGION['box']) < .11, ('the throat share has reached past the head', THROAT_REGION)
print('THROAT_REGION', json.dumps(THROAT_REGION))


rig = K.build_armature(B, tx, 'Macrocnemus shared skeleton', 'Macrocnemus_Rig')
influences = []
for o in [auth, puppet]:
    K.bind(o, rig, B, weights, tx, influences, passes=RELAX_PASSES)
for o in parts['lower jaw'].values():
    K.bind_rigid(o, rig, 'jaw', tx)
for n in ['skull', 'jaw']:
    lining.vertex_groups.new(name=n)
# **The lining's floor follows the mandible outright, and it tapers at neither end.** It was
# `t * smooth((p.x - HINGE_X) / .012) * smooth((MOUTH_FRONT - p.x) / .007)`, which is the mistake
# Rhaeticosaurus' gape proof caught twice over. Behind, the mandible is rigid on `jaw` from the cut
# plane forward while that ramp reads 0.5 there, so the lining's floor stays with the skull as the
# mandible's inner surface swings down past it — and that surface, seen from inside, is backfacing,
# so a single-sided pass shows the world straight through it. Ahead, fading the share towards the
# snout closes the tube in the weight field as well as in the geometry. The tube is closed by its
# caps, not by its weights.
#
# And the changeover is **above** the lip, not at it: centred on the seam, the ring's equator takes
# half the jaw's rotation while the cut rim takes all of it, so the rim ends up below the lining's
# widest point and a wedge opens between them. Everything at and below the mouth line follows the
# mandible, and the stretch is carried by the band above it where nothing can see it.
# The mouth is a palate on the skull and a floor on the jaw, each closed on its own and each
# rigid on one bone (`K.oral_lining`). It used to be one sac whose wall stretched between the two,
# and that wall photographed as a mouth webbed shut; the weights that tuned the stretch went with
# it, because there is no longer a stretch to tune.
for p in lining.data.polygons:
    p.use_smooth = True
mo = lining.modifiers.new('Oral membrane', 'ARMATURE')
mo.object = rig
lining.parent = rig
oralparts.append(lining)
for o, bonename in TOOTHROWS:
    K.bind_rigid(o, rig, bonename, None, toothmat)
    oralparts.append(o)

# **The plug is sized from the cast width too, and for the same reason twice over.** Built to 0.92
# of `HW` — the head at its broadest — it stood outside a head that is much narrower at the mouth
# line, `seat_inside` dragged its vertices onto the mouth axis to get them in, and four quads
# **inverted**. An inverted face is invisible in a normal render and transparent under a backface
# cull, so it is a hole you can only see through a single-sided pass: those four quads were the
# whole of the 18 px `gape-solid.py` reported through this head, and they did not move by a pixel
# through three separate corrections to the lining — which is the tell the tool's own notes warn
# about, a count that will not move is a count about something else.
#
# Its floor is cast too. `head_lo` is a 3rd percentile over a band that includes the head's sides,
# which on a section shaped like a rounded triangle dip well below the underside at the animal's own
# midline: the plug's centre, put halfway between that and the seam, measured 0.00123 inside a head
# 0.070 deep, which is on the skin. Casting straight down from the mouth axis says where the floor
# actually is.
#
# **And it has to reach the mandible.** The leak the gape proof would not let go of was a 0.006 gap
# between the mandible's rear edge and this plug — the corner of the mouth, behind everything the
# lining covers — which a ray cast through the failing pixels found by measuring its own distance to
# each oral part rather than by inspecting renders. So the plug is centred on the cut rather than
# 0.010 behind it, sized from the head's own section at the hinge, and long enough along the body to
# overlap the first 0.018 of the mandible. It can afford to: near the hinge the mandible barely
# moves, whatever the jaw does further forward.
_pw, _ph = seam_half_width(HINGE_X), mouth_section(HINGE_X)[1]
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8,
                                     location=tx((HINGE_X, mouth_centre(HINGE_X), seam(HINGE_X))))
hinge = bpy.context.object
hinge.name = 'Seated jaw hinge tissue'
hinge.scale = (_pw * .96 * SCALE, .008 * SCALE, _ph * 1.80 * SCALE)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in hinge.data.vertices:
    v.co = hinge.matrix_world @ v.co
hinge.location = (0, 0, 0)
for n in ['skull', 'jaw']:
    hinge.vertex_groups.new(name=n)
for v in hinge.data.vertices:
    t = max(0., min(1., (seam(MOUTH_BACK) * SCALE - v.co.z) / (.010 * SCALE)))
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
    return Vector((x, mouth_centre(x), seam(x)))


# **The plug is shrunk whole rather than seated vertex by vertex**, because a uniform scale about
# its own centre cannot invert a quad and a per-vertex pull towards an axis can. The factor is
# measured: the largest one at which every vertex of it is inside the head.
_hc = sum((Vector(v.co[:]) for v in hinge.data.vertices), Vector()) / len(hinge.data.vertices)


def _fit(p, k):
    d = Vector(p) - _hc
    return _hc + Vector((d.x * k, d.y, d.z * k))       # engine Y is along the body: keep the length


_lo, _hi = 0., 1.
for _ in range(12):
    _mid = (_lo + _hi) / 2
    if all(depth(to_raw(_fit(v.co, _mid))) > .0013 for v in hinge.data.vertices):
        _lo = _mid
    else:
        _hi = _mid
HINGE_FIT = round(_lo, 4)
print('HINGE_PROBE', json.dumps({'centreDepth': round(depth(to_raw(_hc)), 5),
                                 'centreRaw': [round(float(v), 4) for v in to_raw(_hc)],
                                 'fit': HINGE_FIT}))
assert HINGE_FIT > .30, ('the hinge plug will not fit inside the head at any useful size', HINGE_FIT)
for v in hinge.data.vertices:
    v.co = _fit(v.co, _lo)
print('HINGE_FIT', HINGE_FIT)
# The lining keeps at least 0.62 of its own radius. Unclamped, a ring the head is narrower than
# collapses onto the axis, and the two vertices left 0.00017 apart tear 1076x as soon as one rides
# the jaw and the other the skull. The teeth are not rings and do not need it; the plug has already
# been fitted whole.
oral_seating = {o.name: K.seat_inside(o, mouth_axis, depth, to_raw, to_engine,
                                      keep=(.62 if o is lining else 0.))
                for o in oralparts}
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


NECKW = np.array([.30, .20, .16, .13, .11, .10])
NECKW = NECKW / NECKW.sum()


def neck(pb, yaw=0., pitch=0., phase=0., wave=None, lag=.10):
    for i in range(CERVICALS):
        q = pb['neck_%02d' % i]
        k = NECKW[i] * (wave(phase - lag * i / max(CERVICALS - 1, 1)) if wave else 1.)
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

        # ---- jaw
        opening = .012 * (1 - cos(p)) if loop else 0
        if clip == 'Eat':
            opening = .18 * (1 - cos(p * 2))
        if clip == 'Bite':
            opening = .46 * sin(pi * u) ** 2
        if clip == 'Attack':
            opening = .40 * (sin(pi * u / .32) ** 2 if u < .32 else 0) + .06 * sbump(.32, .74)
        if clip == 'Heavy':
            opening = .44 * (sin(pi * u / .28) ** 2 if u < .28 else 0) + .05 * sbump(.28, .76)
        if clip == 'Grab':
            opening = .22 + .05 * e * sin(p * 2)
        if clip == 'Breath':
            opening = .14 * e
        if clip == 'Run':
            opening = .10 + .04 * sin(p * 2)
        if clip == 'Charge':
            opening = .10 * (ramp(.10, .40) - ramp(.80, 1.)) + .12 * sbump(.55, .95)
        if clip == 'Snatch':
            # 0.50 rad, the widest gape on this animal and wider than Tanystropheus opens. It was
            # reduced to 0.46 while the residual gape leak was being chased, on the theory that this
            # head carries a ceiling the way Rhaeticosaurus' does; it does not — the leak was the
            # cut rim's own thickness and this angle costs nothing once the rim is folded.
            opening = .50 * K.smooth(u / .30) * (1 - K.smooth((u - .42) / .16))
        if clip == 'Retreat':
            opening = .16 * sbump(.02, .52)
        if clip == 'Ability':
            opening = .18 * sbump(0., .35) + .40 * sbump(.35, .70)
        opening += .24 * dead
        pb['jaw'].rotation_euler.x = opening
        skull.rotation_euler.x = -.12 * opening

        # ---- the tail: a long counterweight that answers everything the body does
        for i in range(CAUDALS):
            q = pb['tail_%02d' % i]
            if clip in ('Run', 'Charge', 'Retreat'):
                pass                       # set inside those blocks
            elif clip in ['Swim', 'Sprint']:
                q.rotation_euler.z = (.045 + .026 * i) * amp * sin(p - i * .42)
            elif clip == 'Crawl':
                q.rotation_euler.z = (.014 + .009 * i) * sin(p - i * .36)
            else:
                q.rotation_euler.z = (.012 + .007 * i) * amp * wave(i * .45) + turn * (.016 + .009 * i)
            q.rotation_euler.x += dead * .035 * sin(i * .5)
            if clip in ['Dive', 'Rise']:
                q.rotation_euler.x += (1 if clip == 'Dive' else -1) * .026 * e * (1 + .1 * i)

        # ---- the limbs, default trim
        for key, (pts, names) in LIMBS.items():
            s = 1 if key.endswith('L') else -1
            hind = key.startswith('hind')
            up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
            lag = (pi if hind else 0) + (.12 if s < 0 else 0)
            up.rotation_euler.x = .09 * amp * wave(lag) - .20 * dead
            up.rotation_euler.y = s * (.05 * amp * wave(lag + pi / 2) + .18 * dead)
            lo.rotation_euler.x = .07 * amp * wave(lag + .7) - .12 * dead
            ft.rotation_euler.x = .05 * amp * wave(lag + 1.3) + .08 * dead

        def stride(cycle, reach, push, lift, drive=1.):
            """One four-beat gait. `cycle` is 0..1 within the stride; the two diagonals alternate."""
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                off = {'foreL': 0., 'hindR': .06, 'foreR': .5, 'hindL': .56}[key]
                ph = (cycle - off) % 1.
                sw = sin(pi * min(1., ph / .38)) ** 2 if ph < .38 else 0.
                st = 0. if ph < .38 else sin(pi * (ph - .38) / .62) ** 2
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x = drive * ((reach if hind else reach * .8) * sw
                                               - (push if hind else push * .75) * st)
                # every term is scaled by `drive`, the splay included: a gait that fades in has to
                # fade the stance out with it, or a clip that starts and ends at rest does not
                up.rotation_euler.y = drive * s * (.14 - .06 * sw)
                lo.rotation_euler.x = drive * ((lift if hind else lift * .8) * sw - .18 * st)
                ft.rotation_euler.x = drive * (.30 * sw - .16 * st)

        if clip == 'Run':
            # THE LAND GAIT. A basilisk's sprint: long hindlimbs doing the work, the forelimbs
            # barely touching, the body pitching with each drive, the tail straight out behind as
            # the counterweight and the neck holding the head steady so the eyes stay level. Two
            # suspensions per cycle, which is what makes it read as a run rather than a fast walk.
            stride(u, .62, .50, .46, 1.)
            bound = (sin(2 * pi * u) ** 2)
            body.location.z = (.22 * bound - .045) * SCALE * .2
            body.rotation_euler.x = -.14 * sin(2 * pi * u + .6)
            body.rotation_euler.y = .06 * sin(p)
            body.rotation_euler.z = .05 * sin(p)
            chest.rotation_euler.x = -.08 * sin(2 * pi * u + 1.1)
            neck(pb, pitch=.10 * sin(2 * pi * u + 2.2), yaw=.04 * sin(p))
            skull.rotation_euler.x += -.08 * sin(2 * pi * u + 2.6)
            for i in range(CAUDALS):
                q = pb['tail_%02d' % i]
                # a counterweight is held, not waved: a total of about a quarter of a radian of
                # lateral wag down the whole chain, against the pitch that answers the bound
                q.rotation_euler.z = (.008 + .006 * i) * sin(p - i * .30)
                q.rotation_euler.x = -(.030 + .010 * i) * (.55 + .45 * sin(2 * pi * u + 1.6))
        elif clip == 'Charge':
            # THE DASH INTO THE SHALLOWS. From standing: crouch and load (0.00-0.18), launch
            # (0.18-0.32), three driving strides, then the water takes the legs and the body pitches
            # down as it wades in (0.72-1.00). It returns to the stand it started from so it can be
            # played from and back into Idle.
            load = sbump(0., .30)
            go = ramp(.16, .34) - ramp(.78, 1.)
            arrive = sbump(.66, 1.)
            cyc = max(0., (u - .22)) / .58 * 3.
            stride(cyc, .70, .58, .52, go * (1 - .5 * arrive))
            body.location.z = (-.13 * load + .10 * go * (1 - arrive)) * SCALE * .2
            body.location.y = (-.14 * go + .14 * arrive) * SCALE * .2
            body.rotation_euler.x = .16 * load - .22 * go + .30 * arrive
            body.rotation_euler.y = .05 * sin(2 * pi * cyc) * go
            chest.rotation_euler.x = .10 * load - .12 * go + .14 * arrive
            neck(pb, pitch=-.22 * load + .16 * go + .34 * arrive, yaw=.06 * sin(2 * pi * cyc) * go)
            skull.rotation_euler.x += -.14 * load + .10 * go + .12 * arrive
            for i in range(CAUDALS):
                q = pb['tail_%02d' % i]
                q.rotation_euler.x = -(.034 + .012 * i) * go + (.020 + .008 * i) * load
                q.rotation_euler.z = (.016 + .010 * i) * sin(2 * pi * cyc - i * .3) * go
        elif clip == 'Snatch':
            # THE STRIKE. Head down and forward into the water, jaws through, head back up with it.
            drop = ramp(.06, .34) - ramp(.50, .92)
            thrust = sbump(.10, .48)
            shake = sbump(.52, .92)
            # the recovery has to finish before the last joint's lag runs off the end of the clip,
            # or the tip of the chain is left a hundredth of a radian from where it started
            neck(pb, pitch=.62 * drop + .26 * thrust, phase=u,
                 wave=lambda t: K.smooth((t - .06) / .28) - K.smooth((t - .46) / .34))
            skull.rotation_euler.x += .30 * drop + .18 * thrust
            skull.rotation_euler.z += .22 * shake * sin(2 * pi * u * 6)
            chest.rotation_euler.x = .14 * drop
            body.rotation_euler.x = .10 * drop
            body.location.y = -.18 * thrust * SCALE * .2
            body.location.z = -.06 * drop * SCALE * .2
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x += (.22 if not hind else .12) * drop
                lo.rotation_euler.x += (.26 if not hind else .14) * drop
            for i in range(CAUDALS):
                pb['tail_%02d' % i].rotation_euler.x += -(.026 + .010 * i) * drop
        elif clip == 'Retreat':
            # BACK UP THE BEACH. A turn away over the first third, then four fast strides out of the
            # water with the tail thrown up behind and the head twisted back to check.
            spin = sbump(0., .42)
            go = ramp(.18, .40) - ramp(.86, 1.)
            look = sbump(.34, .86)
            cyc = max(0., (u - .22)) / .70 * 4.
            stride(cyc, .66, .54, .50, go)
            body.rotation_euler.z = 1.05 * spin
            body.rotation_euler.y = -.22 * spin
            body.location.z = (.07 * (sin(2 * pi * cyc) ** 2) * go - .03 * spin) * SCALE * .2
            body.rotation_euler.x = -.10 * go
            chest.rotation_euler.z = .20 * spin
            neck(pb, yaw=.42 * look - .18 * spin, pitch=-.12 * go)
            skull.rotation_euler.z += .34 * look
            for i in range(CAUDALS):
                q = pb['tail_%02d' % i]
                q.rotation_euler.z = (.030 + .018 * i) * spin
                q.rotation_euler.x = -(.030 + .012 * i) * go
        elif clip == 'Crawl':
            # The walk at the post: a slow diagonal-couplet stride with the head up and watching.
            stride(u, .34, .28, .26, 1.)
            body.location.z = .020 * (sin(2 * pi * u * 2) - 1) * SCALE * .2
            body.rotation_euler.z = .030 * sin(p)
            body.rotation_euler.y = .050 * sin(p * 2 + .6)
            chest.rotation_euler.z = .022 * sin(p + .5)
            neck(pb, yaw=-.030 * sin(p + .9), pitch=-.014 * sin(p * 2))
            skull.rotation_euler.z += .03 * sin(p + 1.3)
        elif clip in ['Swim', 'Sprint']:
            # It swims badly and rarely, and it does it by paddling: this is a land animal.
            body.rotation_euler.z = -.030 * amp * sin(p + .38)
            body.rotation_euler.y = .020 * amp * sin(p + 1.05)
            neck(pb, pitch=-.16, yaw=.05 * amp * sin(p + 1.5))
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                lag = (pi if hind else 0)
                up.rotation_euler.x = (.18 if hind else .34) + (.42 if hind else .22) * amp * sin(p - lag)
                up.rotation_euler.y = s * .22
                lo.rotation_euler.x = -.20 + .30 * amp * sin(p - lag - .5)
                ft.rotation_euler.x = .16 * amp * sin(p - lag - .9)
        else:
            body.rotation_euler.y = .014 * amp * wave(.3)
            body.location.z = .04 * amp * wave(.2) * SCALE * .2
            body.rotation_euler.z = .18 * turn
            body.rotation_euler.y += .10 * turn
            chest.rotation_euler.z = .060 * turn
            neck(pb, yaw=.06 * amp * wave(.9) + .40 * turn, pitch=.02 * amp * wave(.6))
            if clip == 'Idle':
                chest.rotation_euler.x = .014 * sin(p * 2)
                body.rotation_euler.y = .026 * sin(p)
                body.location.z = .010 * sin(p * 2) * SCALE * .2
                neck(pb, pitch=-.03 * sin(p * 2 + .5) - .05 * pulse(.62, 4), yaw=.10 * pulse(.30, 5))
                skull.rotation_euler.z += .22 * pulse(.30, 5) - .10 * pulse(.74, 5)
                skull.rotation_euler.x += .06 * pulse(.62, 4)
                for i in range(CAUDALS):
                    # the `wave` idiom rather than a bare sine, so Idle's first frame is rest
                    pb['tail_%02d' % i].rotation_euler.z += (.008 + .010 * i) * \
                        (sin(p * 2 - i * .4) - sin(-i * .4)) * (.35 + .65 * pulse(.8, 3))
            if clip in ['Dive', 'Rise']:
                d = 1 if clip == 'Dive' else -1
                body.rotation_euler.x = d * .22 * e
                neck(pb, pitch=d * .30 * e)
            if clip == 'Attack':
                thrust = sbump(.10, .54)
                neck(pb, pitch=.44 * thrust, yaw=-.22 * sbump(0., .24))
                skull.rotation_euler.x += .20 * thrust
                body.location.y = -.24 * thrust * SCALE * .2
            if clip == 'Heavy':
                wind = sbump(0., .28)
                peak = sbump(.24, .70)
                neck(pb, pitch=-.24 * wind + .58 * peak, yaw=-.20 * wind)
                skull.rotation_euler.x += .26 * peak
                body.location.y = (.10 * wind - .34 * peak) * SCALE * .2
                body.rotation_euler.x = -.10 * wind + .18 * peak
            if clip == 'Bite':
                neck(pb, pitch=.26 * e)
                body.location.y = -.06 * e * SCALE * .2
            if clip == 'Parry':
                body.rotation_euler.y = .24 * e
                neck(pb, yaw=.32 * e, pitch=-.20 * e)
            if clip == 'Guard':
                neck(pb, pitch=-.30, yaw=.10)
                body.location.z = -.16 * SCALE * .2 - .03 * (1 - cos(p)) * SCALE * .2
                chest.rotation_euler.x = .10
            if clip == 'Dodge':
                body.rotation_euler.y = .36 * e
                body.rotation_euler.z = -.34 * e
                body.location.x = .40 * e * SCALE * .2
                neck(pb, yaw=-.30 * e)
            if clip in ['Hit', 'Stagger']:
                k = 1 if clip == 'Hit' else 2
                body.rotation_euler.z = .16 * e * sin(p * k)
                body.rotation_euler.y = .20 * e
                neck(pb, yaw=.30 * e * sin(p * k), pitch=.16 * e)
                skull.rotation_euler.z += .18 * e * sin(p * k + .8)
            if clip == 'Breath':
                neck(pb, pitch=-.34 * e)
                body.rotation_euler.x = -.12 * e
            if clip == 'Eat':
                neck(pb, pitch=.50 + .10 * sin(p * 2))
                skull.rotation_euler.x += .12 + .06 * sin(p * 2)
                body.rotation_euler.x = .12
                body.location.z = -.12 * SCALE * .2
            if clip == 'Grab':
                neck(pb, pitch=-.18 + .06 * sin(p), yaw=.12 * sin(p * 2))
                skull.rotation_euler.z += .10 * sin(p * 2 + .6)
                body.rotation_euler.x = -.06
            if clip == 'Ability':
                # Bolt: the roster's own move. Freeze, then one explosive shove off the hindlimbs
                # that throws the animal forward and up the beach, and back to the stand.
                crouch = sbump(0., .38)
                kick = sbump(.34, .80)
                stride(.5 + .5 * ramp(.34, .84), .74, .62, .56, kick)
                body.location.z = (-.14 * crouch + .20 * kick) * SCALE * .2
                body.location.y = -.34 * kick * SCALE * .2
                body.rotation_euler.x = .18 * crouch - .26 * kick
                neck(pb, pitch=-.26 * crouch + .16 * kick)
                skull.rotation_euler.x += -.14 * crouch
                for i in range(CAUDALS):
                    pb['tail_%02d' % i].rotation_euler.x += -(.032 + .012 * i) * kick
            if clip == 'Growth':
                body.rotation_euler.y = .05 * e
                body.location.z = .26 * e * SCALE * .2
                neck(pb, pitch=-.10 * e)
            if clip == 'Death':
                body.rotation_euler.y += 1.15 * dead
                body.rotation_euler.x += .14 * dead
                body.location.z -= .34 * dead * SCALE * .2
                neck(pb, pitch=.30 * dead, yaw=.16 * dead)
                skull.rotation_euler.x += .18 * dead

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

OPEN = {'Death'}
for c in set(CLIPS) - OPEN:
    assert seams[c] < 1e-6, (c, seams[c])
reset()
scene.frame_set(0)

# The run has to be a run: two suspensions per cycle, the hind pair leading the fore pair, and the
# hindlimbs working materially harder than the forelimbs — which is what a long-hindlimbed
# tanystropheid's gait means.
gait_report = {}
for clip, rows in gait_track.items():
    a = np.array(rows)
    hind = np.abs(a[:, 1]).max() + np.abs(a[:, 2]).max()
    fore = np.abs(a[:, 3]).max() + np.abs(a[:, 4]).max()
    rise = float(a[:, 5].max() - a[:, 5].min())
    gait_report[clip] = {'hindAmplitude': float(hind), 'foreAmplitude': float(fore),
                         'hindOverFore': float(hind / max(fore, 1e-6)), 'bodyRise': rise}
    assert hind > fore * 1.15, ('the hindlimbs must drive this gait', clip, gait_report[clip])
    assert rise > .04, ('the gait must lift the body off the sand', clip, gait_report[clip])

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
     'point': list(tx((MOUTH_BACK + .020, mouth_centre(MOUTH_BACK + .020), seam(MOUTH_BACK + .020)))), 'role': 'swallow'},
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
    'id': ID, 'name': 'Macrocnemus', 'species': 'Macrocnemus bassanii',
    'description': 'Canonical Tripo body with its tail unbent and a procedural volume twin on one '
                   '%d-joint rig: a raised neck, an articulated jaw with a lined mouth and authored '
                   'tooth rows, very long hindlimbs, and the shore runner\'s land gait, dash into '
                   'the shallows, strike and retreat.' % len(B),
    'modelLength': round(model_length, 4), 'lengthMeters': .9, 'locomotion': 'Crawl',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'notes': [
        'The small head, the raised neck, the very long hindlimbs, the five-toed feet and the long '
        'tail are retained from the accepted Tripo volume, which arrives as one shell once welded '
        'with nothing to remove.',
        'The generated tail curved across the plan while the greenlit pose holds it straight out '
        'behind. Intake unbends it by carrying every cross-section rigidly from its own measured '
        'centreline frame onto a target of the same segment lengths and the same per-segment rise, '
        'so the droop at the tip survives. UNBEND_TAIL=False rebuilds the generated sweep. The neck '
        'is not touched: it is raised at the angle the pose holds it.',
        'The axis is measured from two declared seeds, tail tip and snout, because this body\'s '
        'longest geodesic path runs claw to tail tip rather than snout to tail tip — the hindlimbs '
        'are as long as the neck, which is why an axial instrument left this animal CANNOT TELL in '
        'the proportion audit.',
        'The twin resurfaces a %.4f-unit voxel occupancy field, relaxes it once and reduces the new '
        'topology; the field is finer than Placodus\' because the shins measure r ~ 0.007.' % VOXEL,
        'This head models no mouth cavity and no teeth. The seam is placed on the head\'s own '
        'measured section at the height the painted mouth line measures, and the tooth rows are '
        'authored into the lined lumen. That is a reconstruction and is recorded as one.',
        'Same rest rig, inverse binds, sockets and all %d action sample arrays for authored body '
        'and puppet. The LOD keeps every clip.' % len(CLIPS),
        'Run is the land gait the reviewer asked for and not a fast walk: two suspensions a cycle, '
        'the hindlimbs doing the work and the tail out behind as the counterweight. Charge is the '
        'dash into the shallows, Snatch the strike at something in them, Retreat the turn and bolt '
        'back up the beach. Ability is the roster\'s Bolt. Living colours, soft tissues and '
        'movements are artistic reconstruction; locomotor translation remains engine-owned.']}
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
    'caudalChainStart': float(TAIL_START), 'pelvisFractionOfTrunk': PELVIS,
    'mouth': {'method': 'no modelled cavity on this head; the seam follows the head\'s own measured '
                        'section at the painted mouth line\'s measured height, and the teeth are authored',
              'cavityVerticesFound': int(len(CAVITY)), 'jawFractionOfHeadSection': JAW_FRACTION,
              'pigmentContrast': PIGMENT_CONTRAST, 'pigmentStations': pigment_rows,
              'proudPatches': patch_report,
              'hingeX': HINGE_X, 'mouthBackX': MOUTH_BACK, 'mouthFrontX': MOUTH_FRONT,
              'liningInset': LINING_INSET, 'liningCullsBackfaces': True, 'skinDoubleSided': True},
    'gait': gait_report,
    'limbRadii': LIMB_RADII, 'authoredLimbRadii': RADII, 'weightRelaxationPasses': RELAX_PASSES,
    'throatRegion': THROAT_REGION, 'mandible': MANDIBLE, 'rimFlangeVertices': RIM,
    'hingePlugFit': HINGE_FIT, 'liningPower': LINING_POWER, 'liningInset': LINING_INSET,
    'limbSweep': limb_sweep, 'mouthCut': mouth_cut,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('MACROCNEMUS_REPORT', json.dumps({k: v for k, v in report.items() if k != 'boundsAt13Phases'}))
