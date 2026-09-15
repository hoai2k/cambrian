"""Rebuild Tanystropheus: the generated body unbent onto its own straight axis, a measured voxel
twin, and one thirteen-cervical skeleton carrying the shore animal's performance.

Blender 5.2. Geometry coordinates are raw Tripo metres (X snoutward, Y left, Z up) until the final
engine transform tx(). The generic intake machinery is `tools/triassic/creatures/shorekit.py`;
everything in this file is Tanystropheus.

  /opt/blender/blender --background --factory-startup --python tools/triassic/creatures/tanystropheus/build.py

The animal: it stands at a post on the bank with its neck out over the water and does not leave it
(`src/sim/triassic/shore.ts`). The neck is the animal and the neck is **stiff** — thirteen
hyperelongate cervicals braced underneath by rib bundles that blocked ventral flexion, with
overlapping zygapophyses that limited lateral bending (Renesto & Saller 2018; Spiekman et al.
2020). So the boom swings as a unit from its base and the *skull* snaps sideways, and this build
refuses to animate it as a swan's neck: the base carries most of the arc by design and the audit
measures that rather than asserting the opposite. Two Monte San Giorgio specimens preserve the head
and front of the neck alone, bitten clean through (Spiekman & Mujal 2023), which the game turns
into the one way to clear a bank — hence the Severed clip.
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

LOCAL = os.path.join(ROOT, 'local/triassic-authoring/tanystropheus')
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/tanystropheus.raw.glb')
ID = 'tanystropheus'
SCALE = 4

CERVICALS = 13                 # Tanystropheus has thirteen, against Dinocephalosaurus' thirty-two
CAUDALS = 8
UNBEND = True                  # False rebuilds the body in its generated pose, for comparison
VOXEL = 0.0040                 # finer than Placodus' 0.0055: a neck of radius 0.019 must survive
PUPPET_BUDGET = 6800

# Where this animal stops being one thing and starts being another, as geodesic distance from the
# tail tip over the welded raw surface. Measured by banding that surface and reading the section
# radius at every station: the tail holds r < 0.032 to 0.315, the trunk swells to 0.10 through the
# hips and shoulders, and the neck drops back to a steady r ~ 0.020 from 0.655 to the skull.
TAIL_GEO, NECK_GEO = .315, .655

# The clip set. The twenty-one the contract asks for, plus the six the shore mechanic needs and
# which `shore.ts` says in as many words it is waiting for: Lower is the 1.5 s telegraph (TELEGRAPH
# in shore.ts), SnapLeft/SnapRight the 0.6 s strike (the strike phase there), Retract the recovery
# off it, Drag the haul up the beach, and Severed the neck bitten through at its middle.
CLIPS = {'Idle': 3.2, 'Swim': 2.2, 'Sprint': 1.4, 'TurnLeft': 1.8, 'TurnRight': 1.8, 'Dive': 1.4,
         'Rise': 1.4, 'Attack': 1., 'Bite': .5, 'Heavy': 1.2, 'Hit': .6, 'Death': 2., 'Guard': 1.2,
         'Parry': .4, 'Dodge': .5, 'Eat': 1.8, 'Stagger': 1.2, 'Ability': 1., 'Grab': 1.1,
         'Breath': 2.4, 'Growth': 1.5, 'Crawl': 2.2,
         'Lower': 1.5, 'SnapLeft': .6, 'SnapRight': .6, 'Retract': .9, 'Drag': 1.6, 'Severed': 2.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Crawl', 'Drag']

# ---- intake ------------------------------------------------------------------------------------
K.reset_scene()
auth, intake = K.import_and_weld(RAW, 'Tanystropheus authored body', min_component=200)
# The raw file carries one conspicuous detached, thin textured island beside the neck (114
# vertices), which the source checkpoint's own review found in top and three-quarter views. It is
# the only thing removed: the body itself is one shell once welded.
assert intake['removedComponents'] == [114], intake
assert intake['sourceComponents'] == 2, intake

line, geo_total, tail_tip, snout_tip = K.geodesic_line(auth, bands=90)
hips = next(r for r in line if r['geo'] >= TAIL_GEO)['c']
shoulder = next(r for r in line if r['geo'] >= NECK_GEO)['c']
trunk_yaw = math.atan2((shoulder - hips)[1], (shoulder - hips)[0])
# The generation is drawn standing at an angle across the plan, so the first thing is to put the
# animal's own trunk on +X. Nothing is taken from `tools/triassic/preview-orientation.json`, which
# is an estimate off a bounding box: this body's box says it runs diagonally.
R = Matrix.Rotation(-trunk_yaw, 4, 'Z')
for v in auth.data.vertices:
    v.co = R @ v.co
line, geo_total, tail_tip, snout_tip = K.geodesic_line(auth, bands=90)

# ---- step 4 correction: unbend the neck and the tail ---------------------------------------------
# The greenlit pose (docs/triassic/canonical/tanystropheus.png) stands the animal on the shore with
# its neck held out dead straight over the water, which is also the pose the game needs. The
# generation reproduced the animal faithfully and then swept the neck a third of a body width
# across the plan and the tail the other way. By the pipeline's own rule the model is the thing
# that is wrong, so intake carries every cross-section rigidly from its own measured centreline
# frame onto a target of the *same* segment lengths (Placodus' technique, extended by
# Dinocephalosaurus). Nothing is stretched, sheared or thinned, and — unlike a straight line target
# — each segment keeps its own rise, so the neck's gentle decline to the head and the lift of the
# tail tip, both of which are in the pose, survive untouched. Only the heading in plan is turned,
# eased over the first fifth of each run so the trunk is never disturbed.
unbending = {'applied': UNBEND, 'runs': {}}


def coarse(pts, step=3):
    """Turning measured on every third station: band-to-band jitter is not anatomy."""
    return pts[::step] + ([pts[-1]] if (len(pts) - 1) % step else [])


for label, cutoff, sign, yaw in [('neck', NECK_GEO, 1, 0.), ('tail', TAIL_GEO, -1, math.pi)]:
    rows = [r for r in line if (r['geo'] >= cutoff if sign > 0 else r['geo'] <= cutoff)]
    if sign < 0:
        rows = rows[::-1]
    pts = [Vector(r['c']) for r in rows]
    radii = [r['r'] for r in rows]
    _, RCUM = K.poly(pts)

    def run_radius(s, _c=RCUM, _r=radii):
        # How wide the run is here, from the banding's own section radius. The gate matters: the
        # hind feet sit *behind* the tail's base station and would otherwise be swung round with it.
        return max(.040, 2.6 * float(np.interp(s, _c, _r)))

    tgt = K.yaw_straight_target(pts, ease=.22, yaw=yaw)
    x0 = pts[0].x
    before = np.array([v.co[:] for v in auth.data.vertices])
    moved = K.carry_run(auth, pts, tgt, sign, ramp=.045, radius=run_radius) if UNBEND else 0.
    after = np.array([v.co[:] for v in auth.data.vertices])
    end = (before[:, 0] > x0 + .40) if sign > 0 else (before[:, 0] < x0 - .20)
    unbending['runs'][label] = {
        'stations': len(pts), 'arc': float(sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))),
        'turningDegrees': round(K.turning(coarse(pts)), 2),
        'maxVertexMove': float(moved),
        'endLateralMeanBefore': float(before[end][:, 1].mean()),
        'endLateralMeanAfter': float(after[end][:, 1].mean())}
if UNBEND:
    for label, r in unbending['runs'].items():
        assert abs(r['endLateralMeanAfter'] - r['endLateralMeanBefore']) > .02 or label == 'tail', r

# ---- centre: the body's own midline, the middle of its length ------------------------------------
co = np.array([v.co[:] for v in auth.data.vertices])
shift = Vector((-(co[:, 0].min() + co[:, 0].max()) / 2, -float(np.median(co[:, 1])), 0))
for v in auth.data.vertices:
    v.co += shift
co = np.array([v.co[:] for v in auth.data.vertices])
RAW_LENGTH = float(co[:, 0].max() - co[:, 0].min())
X_SNOUT = float(co[:, 0].max())
assert 1.2 < RAW_LENGTH < 1.45, RAW_LENGTH
assert abs(float(np.median(co[:, 1]))) < 2e-3, float(np.median(co[:, 1]))

# ---- measure the axis and the trunk's own section -------------------------------------------------
line, geo_total, tail_tip, snout_tip = K.geodesic_line(auth, bands=110)
AXIS = [Vector(r['c']) for r in line]
AP, ACUM = K.poly(AXIS)


def section_at(x, half=.012, ylimit=.030):
    """The body's own vertical section at a station, measured near the midline so the sprawled
    limbs are not in it. Returns (mid z, half height, half width) or None."""
    m = (co[:, 0] >= x - half) & (co[:, 0] < x + half) & (np.abs(co[:, 1]) < ylimit)
    if m.sum() < 8:
        return None
    q = co[m]
    lo, hi = float(np.percentile(q[:, 2], 3)), float(np.percentile(q[:, 2], 97))
    return (lo + hi) / 2, (hi - lo) / 2, float(np.percentile(np.abs(q[:, 1]), 97))


SPINE_X = np.linspace(-RAW_LENGTH / 2 + .02, X_SNOUT - .01, 60)
SPINE = [(float(x), section_at(float(x))) for x in SPINE_X]
SPINE = [(x, s) for x, s in SPINE if s]
SX = np.array([x for x, _ in SPINE])
SZ = np.array([s[0] for _, s in SPINE])
SH = np.array([s[1] for _, s in SPINE])
SW = np.array([s[2] for _, s in SPINE])
SZ = K.blur(SZ, 1.4)
SH = K.blur(SH, 1.4)
SW = K.blur(SW, 1.4)


def spine_z(x):
    return float(np.interp(x, SX, SZ))


def head_hi(x):
    return float(np.interp(x, SX, SZ + SH))


def head_lo(x):
    return float(np.interp(x, SX, SZ - SH))


# ---- material: the source albedo kept, white COLOR_0, restrained relief ---------------------------
mat = K.authored_material(auth, 'Tanystropheus body pigmentation')
albedo = K.Albedo(auth)

# ---- the procedural twin ---------------------------------------------------------------------------
puppet, remesh_triangles = K.voxel_twin(auth, 'Tanystropheus procedural volume puppet', VOXEL,
                                        PUPPET_BUDGET, albedo, 'Tanystropheus puppet body')

# ---- the shared skeleton ------------------------------------------------------------------------
# Measured off the intake mesh: the trunk centreline from the section above, the thirteen cervicals
# evenly along the straightened neck, eight caudals along the straightened tail, and each limb on
# its own axis because the generation's four are posed mid-stride and do not match each other.
def tx(p):
    x, y, z = p
    return Vector((y * SCALE, -x * SCALE, z * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


HIP_X, SHOULDER_X = -.300, -.128
NECK_X0, NECK_X1 = -.055, .512
SKULL_X, HINGE_X = .556, .556
TAIL_X0, TAIL_TIP = -.335, -.618

bone('root', (0, 0, 0), None)
bone('body', (HIP_X, 0, spine_z(HIP_X)), 'root')
bone('chest', (SHOULDER_X, 0, spine_z(SHOULDER_X)), 'body')
NECK_PTS = []
for i in range(CERVICALS):
    x = NECK_X0 + (NECK_X1 - NECK_X0) * i / (CERVICALS - 1)
    NECK_PTS.append((x, 0., spine_z(x)))
    bone('neck_%02d' % i, NECK_PTS[-1], 'chest' if i == 0 else 'neck_%02d' % (i - 1))
bone('skull', (SKULL_X, 0, spine_z(SKULL_X)), 'neck_%02d' % (CERVICALS - 1))
# The hinge is seated inside the head rather than on its skin: it is where the mandible articulates,
# which is behind and below the orbit, not on the surface the cut passes through.
JAW_PT = (HINGE_X - .004, 0., (spine_z(HINGE_X) + head_lo(HINGE_X)) / 2)
bone('jaw', JAW_PT, 'skull')
TAIL_PTS = []
for i in range(CAUDALS):
    x = TAIL_X0 + (TAIL_TIP - TAIL_X0) * i / (CAUDALS - 1)
    TAIL_PTS.append((x, 0., spine_z(x)))
    bone('tail_%02d' % i, TAIL_PTS[-1], 'body' if i == 0 else 'tail_%02d' % (i - 1))

# Each limb's own chain, from the below-belly clustering of the intake mesh (root, elbow/knee,
# wrist/ankle, toe). The left and right of a pair differ because the generated animal is standing
# mid-stride; the rig is built to each limb's own axis so both deform correctly, and nothing here
# makes them match.
LIMB_PTS = {
    'foreL': [(-.160, .030, -.015), (-.158, .068, -.060), (-.148, .082, -.089), (-.141, .100, -.098)],
    'foreR': [(-.185, -.030, -.015), (-.196, -.062, -.058), (-.185, -.072, -.089), (-.177, -.079, -.097)],
    'hindL': [(-.345, .034, -.018), (-.360, .068, -.056), (-.362, .072, -.088), (-.352, .072, -.096)],
    'hindR': [(-.380, -.034, -.018), (-.399, -.035, -.057), (-.393, -.047, -.088), (-.389, -.048, -.096)]}
depth = K.depth_probe(auth)
seating = {}
LIMBS = {}
for key, pts in LIMB_PTS.items():
    kind = 'fore' if key.startswith('fore') else 'hind'
    s = key[-1]
    names = [kind + '_upper_' + s, kind + '_lower_' + s, kind + '_foot_' + s]
    # Seat the root radially in towards the trunk axis until it is properly inside the skin, which
    # is the rule every fin and limb in this repository is built to.
    root = K.seat(pts[0], (pts[0][0], 0, spine_z(pts[0][0])), .016, depth)
    pts = [tuple(root)] + [tuple(p) for p in pts[1:]]
    LIMB_PTS[key] = pts
    LIMBS[key] = (pts, names)
    seating[names[0]] = depth(pts[0])
    for i, n in enumerate(names):
        bone(n, pts[i], ('chest' if kind == 'fore' else 'body') if i == 0 else names[i - 1])
seating['skull'] = depth((SKULL_X, 0, spine_z(SKULL_X)))
# The head is small — half a hundredth of a body length through at the hinge — so the hinge is
# seated against the head's own local radius rather than against an absolute depth.
JAW_PT = tuple(K.seat(JAW_PT, (HINGE_X, 0, spine_z(HINGE_X)), .0055, depth))
B['jaw'] = (Vector(JAW_PT), 'skull')
seating['jaw'] = depth(JAW_PT)
HEAD_R = float(np.interp(HINGE_X, SX, SH))
seating['neck_00'] = depth(NECK_PTS[0])
seating['tail_00'] = depth(TAIL_PTS[0])
for n, d in seating.items():
    assert d > (.0050 if n == 'jaw' else .010), ('a root sits outside the intake surface', n, d)
assert seating['jaw'] / HEAD_R > .30, ('the jaw hinge is not seated in the head', seating['jaw'], HEAD_R)

REST_RUNS = {
    'tail': [r for r in line if r['geo'] <= TAIL_GEO][::-1],
    'spine': [r for r in line if TAIL_GEO < r['geo'] < NECK_GEO],
    'neck': [r for r in line if r['geo'] >= NECK_GEO]}
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
rest_pose['limbAsymmetry'] = K.limb_asymmetry(LIMBS, RAW_LENGTH, midline=0.)
print('REST_POSE', json.dumps(rest_pose))

# ---- the mouth ------------------------------------------------------------------------------------
# What this head actually is has to be said plainly, because it decides the method. Placodus and
# Dinocephalosaurus both carry a *modelled* mouth: a slit with an interior, which the builder finds
# by casting every head vertex's own normal back into the mesh and measuring the cavity the hits
# describe. Run the same instrument on this head and it answers with six vertices (Placodus: 193).
# There is no cavity here. The generated skull is a closed taper with the mouth *painted* on it and
# no teeth modelled at all — the source's own review renders show the same thing.
#
# So the seam is measured differently, and the measurement is stated for what it is. What this head
# *does* carry is the mouth **painted** on it: the snout is dark above a line that runs its whole
# length and the mandible below it is white. That is a strong signal and it is read the way
# Dinocephalosaurus reads its roll off its countershading — off the source albedo, not fitted.
# Per station across the snout the flank vertices are sorted by height within the head's own
# measured section and the split that most separates dark above from pale below is found; the
# median of those splits is where the jaw comes away, and the contrast across it is the strength of
# the signal, which the build asserts before it cuts anything. The geometric crease is measured too
# and recorded beside it as a cross-check, but it is not what the seam is placed on: on a snout of
# a few hundred vertices the crease wanders from a twentieth to nine tenths of the section and
# cannot carry a cut.
#
# The fish-trap fangs are authored into the lined cavity, as Dinocephalosaurus' conical fangs are:
# long recurved interlocking teeth at the front of both jaws are this skull's single most
# characteristic feature (Spiekman et al. 2020, PeerJ CT) and the generation has none at all.
MOUTH_GAP = .030
CAVITY = K.mouth_cavity(auth, lambda c: c.x > X_SNOUT - .14, MOUTH_GAP)
SNOUT_BACK, SNOUT_FRONT = X_SNOUT - .095, X_SNOUT - .010


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
    for k in range(14):
        x0 = SNOUT_BACK + (SNOUT_FRONT - SNOUT_BACK) * k / 14
        x1 = SNOUT_BACK + (SNOUT_FRONT - SNOUT_BACK) * (k + 1) / 14
        band = []
        for vi, L in lum.items():
            c = auth.data.vertices[vi].co
            if not (x0 <= c.x < x1) or abs(c.y) < .004:
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
            below = np.mean([b[1] for b in band[:i]])
            above = np.mean([b[1] for b in band[i:]])
            score = below - above                       # pale mandible below, dark snout above
            if best is None or score > best[0]:
                best = (score, band[i][0])
        rows.append((float((x0 + x1) / 2), float(best[1]), float(best[0])))
    fr = float(np.median([r[1] for r in rows]))
    contrast = float(np.median([r[2] for r in rows]))
    return fr, contrast, rows


def crease_fraction():
    """The geometric crease, per station, as a cross-check on the pigment reading."""
    sm = auth.copy()
    sm.data = auth.data.copy()
    bpy.context.collection.objects.link(sm)
    bpy.context.view_layer.objects.active = sm
    m = sm.modifiers.new('Head detail reference', 'SMOOTH')
    m.factor = .6
    m.iterations = 10
    bpy.ops.object.modifier_apply(modifier=m.name)
    bvh = BVHTree.FromPolygons([v.co.copy() for v in sm.data.vertices],
                               [p.vertices[:] for p in sm.data.polygons], all_triangles=False)
    per = {}
    for v in auth.data.vertices:
        if not (SNOUT_BACK < v.co.x < SNOUT_FRONT) or abs(v.co.y) < .004:
            continue
        loc, nor, idx, dist = bvh.find_nearest(v.co)
        proud = dist * (1 if (v.co - loc).dot(nor) > 0 else -1)
        lo, hi = head_lo(v.co.x), head_hi(v.co.x)
        if hi - lo < 1e-5:
            continue
        k = int((v.co.x - SNOUT_BACK) / (SNOUT_FRONT - SNOUT_BACK) * 14)
        f = (v.co.z - lo) / (hi - lo)
        if k not in per or proud < per[k][1]:
            per[k] = (f, proud)
    bpy.data.objects.remove(sm)
    vals = [p[0] for p in per.values()]
    return float(np.median(vals)), float(np.percentile(vals, 75) - np.percentile(vals, 25)), len(vals)


JAW_FRACTION, PIGMENT_CONTRAST, pigment_rows = pigment_seam()
CREASE_FRACTION, CREASE_IQR, CREASE_N = crease_fraction()
# A mouth line on a gharial-like snout sits below the middle of the head and above the chin, and a
# painted one has to be *paintable* — a contrast this small means the head is not what this builder
# thinks it is, and it should stop rather than cut at a guess.
assert PIGMENT_CONTRAST > .04, ('no painted mouth line to read', PIGMENT_CONTRAST, pigment_rows)
assert .20 < JAW_FRACTION < .62, (JAW_FRACTION, pigment_rows)
MOUTH_BACK = X_SNOUT - .100
MOUTH_FRONT = X_SNOUT - .004


def seam(x):
    lo, hi = head_lo(x), head_hi(x)
    return lo + (hi - lo) * JAW_FRACTION


def is_jaw(c):
    return HINGE_X < c.x and c.z < seam(c.x) - 1e-7


# Nothing on this snout stands proud of its own smoothed surface by more than a fifth of a
# millimetre of body length, which is the measured statement that there are no teeth to cut through
# — the fault Placodus had and the reason its jaw stops behind the chisels. This jaw can therefore
# run the whole length of the snout, which is what a fish trap needs.
_, PROUD, PATCHES = K.protrusions(auth, X_SNOUT - .11, .0030)
TEETH = [g for g in PATCHES if PROUD[g].max() >= .0060]
assert not TEETH, ('a modelled tooth was found on a head assumed to have none', len(TEETH))

parts = {}
for o in [auth, puppet]:
    K.bisect_mouth(o, seam, HINGE_X, X_SNOUT + .02, HINGE_X - .02)
    K.split(o, 'lower jaw', is_jaw, parts)

# ---- the lined cavity and the fish trap ------------------------------------------------------------
mouthmat = K.flat_material('Tanystropheus mouth interior', (.30, .125, .115, 1), .62, cull=True)
toothmat = K.flat_material('Tanystropheus fangs', (.80, .77, .68, 1), .28)
oralparts = []

LINING_INSET = .86


def mouth_section(x):
    """The lumen: the head's own measured section, drawn in, closing at both ends of the mouth."""
    e = K.smooth((x - MOUTH_BACK) / .020) * K.smooth((MOUTH_FRONT - x) / .008)
    lo, hi = head_lo(x), head_hi(x)
    w = float(np.interp(x, SX, SW)) * LINING_INSET * (.14 + .86 * e)
    h = max((hi - lo) * .26 * LINING_INSET, .0018) * (.28 + .72 * e)
    return w, h


# The lumen is a long thin sac on a head a thirtieth of the animal, so it is drawn with the
# fewest rings that still follow the taper: every triangle in here is paid for twice, once on the
# authored body and once on the twin, and the reduced model has to stay inside 40 % of the whole.
lining, lin_raw = K.oral_lining('Oral cavity lining', (MOUTH_BACK, MOUTH_FRONT), mouth_section,
                                seam, tx, rings=18, ring=12)
lining.data.materials.append(mouthmat)

# The fish trap: interlocking long recurved fangs at the front of both jaws, the feature the skull
# CT is known for and the one thing this generation does not model. Authored into the measured
# lumen, upper row on the skull and lower row on the jaw, each tooth a tapered recurved cone
# seated by a fraction of the local section so nothing can end up outside the head.
FANGS = []
for label, side, bonename in [('Upper fish-trap fangs', -1, 'skull'), ('Lower fish-trap fangs', 1, 'jaw')]:
    verts = []
    faces = []
    n = 5
    for k in range(n):
        u = k / (n - 1)
        x = MOUTH_FRONT - .012 - u * .062
        w, h = mouth_section(x)
        length = (.0130 - .0055 * u) * (1. if side < 0 else .92)
        for sgn in (1, -1):
            base = len(verts)
            cy = sgn * max(.0022, w * .74)
            root = Vector((x, cy, seam(x) - side * h * .62))
            # recurved: the tip leans back towards the throat as a fish trap's teeth do
            tip = root + Vector((-length * .34, -sgn * length * .10, side * length))
            for ring in range(3):
                t = ring / 2.
                c = root + (tip - root) * t
                r = (.0026 - .0004 * u) * (1 - t) ** .8
                for a in range(5):
                    th = a * 2 * pi / 5
                    verts.append(tx((c.x + r * cos(th) * .8, c.y + r * sin(th), c.z + r * cos(th) * .5)))
            verts.append(tx(tuple(tip)))
            for ring in range(2):
                for a in range(5):
                    p0 = base + ring * 5 + a
                    p1 = base + ring * 5 + (a + 1) % 5
                    faces.append((p0, p1, p1 + 5, p0 + 5))
            apex = base + 15
            for a in range(5):
                faces.append((base + 10 + a, base + 10 + (a + 1) % 5, apex))
    me = bpy.data.meshes.new(label)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(label, me)
    bpy.context.collection.objects.link(o)
    FANGS.append((o, bonename))

# ---- skinning --------------------------------------------------------------------------------------
AXIAL_PTS = ([tuple(TAIL_PTS[-1])] + [tuple(p) for p in reversed(TAIL_PTS)]
             + [(HIP_X, 0, spine_z(HIP_X)), (SHOULDER_X, 0, spine_z(SHOULDER_X))]
             + [tuple(p) for p in NECK_PTS] + [(SKULL_X, 0, spine_z(SKULL_X)), (X_SNOUT, 0, seam(X_SNOUT))])
AXIAL_NAMES = (['tail_%02d' % i for i in range(CAUDALS - 1, -1, -1)] + ['body', 'chest']
               + ['neck_%02d' % i for i in range(CERVICALS)] + ['skull'])
AXIAL = K.AxialChain(AXIAL_PTS, AXIAL_NAMES)
RADII = {'fore': (.012, .016, .036, .030), 'hind': (.014, .018, .040, .034)}
LIMB_FITS = [K.Limb(pts, names, RADII[key[:4]], .050, AXIAL) for key, (pts, names) in LIMBS.items()]


def trunk_pullback(v, w):
    """A vertex whose nearest axial point is on the neck but which is nowhere near the neck belongs
    to the shoulder, not to the cervical chain — Dinocephalosaurus' rule, and this body needs it
    more, because a 0.02-radius neck leaves the chest and the neck's arc positions adjacent."""
    if v.x < SHOULDER_X + .10 and (abs(v.y) > .042 or abs(v.z - spine_z(v.x)) > .052):
        pull = K.smooth((abs(v.y) - .042) / .020) if abs(v.y) > .042 else \
            K.smooth((abs(v.z - spine_z(v.x)) - .052) / .022)
        keep = {n: val for n, val in w.items() if not n.startswith('neck')}
        moved = sum(val for n, val in w.items() if n.startswith('neck'))
        if moved > 0:
            for n, val in list(w.items()):
                if n.startswith('neck'):
                    w[n] = val * (1 - pull)
            w['chest'] = w.get('chest', 0) + moved * pull
        del keep
    return w


def weights(p):
    return K.skin_weights(p, AXIAL, LIMB_FITS, extra=trunk_pullback)


rig = K.build_armature(B, tx, 'Tanystropheus shared skeleton', 'Tanystropheus_Rig')
influences = []
for o in [auth, puppet]:
    K.bind(o, rig, B, weights, tx, influences)
for o in parts['lower jaw'].values():
    K.bind_rigid(o, rig, 'jaw', tx)
bone_count_check = len(B)

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
for o, bonename in FANGS:
    K.bind_rigid(o, rig, bonename, None, toothmat)
    oralparts.append(o)

# A closed envelope on the hinge, covering the square face the cut leaves at HINGE_X from the seam
# down to the chin: that face swings into view the moment the mouth opens and is flat skin with the
# texture drawn across it.
hz = (seam(HINGE_X) + head_lo(HINGE_X)) / 2
bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, location=tx((HINGE_X - .004, 0, hz)))
hinge = bpy.context.object
hinge.name = 'Seated jaw hinge tissue'
hinge.scale = (float(np.interp(HINGE_X, SX, SW)) * .95 * SCALE,
               .016 * SCALE, (seam(HINGE_X) - head_lo(HINGE_X)) * .62 * SCALE)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in hinge.data.vertices:
    v.co = hinge.matrix_world @ v.co
hinge.location = (0, 0, 0)
for n in ['skull', 'jaw']:
    hinge.vertex_groups.new(name=n)
for v in hinge.data.vertices:
    t = max(0., min(1., (seam(HINGE_X) * SCALE - v.co.z) / (.020 * SCALE)))
    hinge.vertex_groups['jaw'].add([v.index], t * .5, 'REPLACE')
    hinge.vertex_groups['skull'].add([v.index], 1 - t * .5, 'REPLACE')
for p in hinge.data.polygons:
    p.use_smooth = True
mo = hinge.modifiers.new('Hinge skin', 'ARMATURE')
mo.object = rig
hinge.parent = rig
oralparts.append(hinge)

# Everything inside the mouth has to be inside the head. Dinocephalosaurus learned this twice.
def to_raw(c):
    return Vector((-c.y / SCALE, c.x / SCALE, c.z / SCALE))


def to_engine(p):
    return tx(tuple(p))


def mouth_axis(p):
    x = min(max(p.x, HINGE_X), X_SNOUT - .002)
    return Vector((x, 0, seam(x)))


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
print('ORAL_DEPTH', json.dumps(oral_part_depth), json.dumps(oral_seating))
assert oral_depth > -1e-4, ('the mouth interior breaks the skin', oral_part_depth)

# ---- the measured comparison of the two actual surfaces ---------------------------------------------
AUTH_GROUP = [auth, parts['lower jaw'][auth.name]]
PUP_GROUP = [puppet, parts['lower jaw'][puppet.name]]
distances = K.surface_distances(AUTH_GROUP, PUP_GROUP)
# one station thick, because this animal's legs run along the sectioning axis (see shorekit.slab)
profile_rows, worst, model_length = K.envelopes(AUTH_GROUP, PUP_GROUP, thickness=SCALE * RAW_LENGTH / 20)
TOL = model_length * .04
print('ENVELOPES', json.dumps([[round(r['stationY'], 3), round(r.get('maximumEnvelopeDifference', -1), 4)]
                               for r in profile_rows]))
print('WORST', json.dumps(max(profile_rows, key=lambda r: r.get('maximumEnvelopeDifference', -1))))
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
    'mouth': {'cavityVerticesFound': int(len(CAVITY)),
              'jawFractionOfHeadSection': JAW_FRACTION,
              'pigmentContrast': PIGMENT_CONTRAST,
              'creaseFractionCrossCheck': CREASE_FRACTION, 'creaseIQR': CREASE_IQR,
              'hingeX': HINGE_X, 'mouthBackX': MOUTH_BACK, 'mouthFrontX': MOUTH_FRONT,
              'seam': [[round(float(x), 5), round(seam(float(x)), 5)]
                       for x in np.linspace(HINGE_X, X_SNOUT, 12)]},
    'unbending': unbending}, indent=2))

# ---- performance --------------------------------------------------------------------------------
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


# How a *total* neck angle is shared out along the thirteen cervicals. Every neck coefficient in
# this performance is an angle for the whole chain: a per-joint number on a chain this long is a
# trap, as Dinocephalosaurus records. What is different here is the shape. Tanystropheus' neck was
# stiff — cervical rib bundles beneath, overlapping zygapophyses, low neural spines — so the boom is
# swung from its base and the skull snaps at the end of it. BEAM puts a third of the arc in the
# first joint, spreads a working amount down the chain so the motion still travels rather than
# pivoting on one hinge, and lifts again at the last two cervicals, which is where the head snap
# starts. A hosepipe would be flat; a single hinge would be a spike; this is a beam.
BEAM = np.array([.34, .105, .065, .050, .043, .040, .038, .038, .040, .045, .055, .070, .091])
BEAM = BEAM / BEAM.sum()
# The lag that makes a strike read as travelling: each joint peaks a little after the one behind it.
LAG = np.linspace(0, .16, CERVICALS)


def neck(pb, yaw=0., pitch=0., phase=0., wave=None):
    """Spread a total neck angle over the chain, optionally with the travelling lag.

    `wave(u)` is the drive at normalised time; when it is given each joint reads it at its own lag,
    which is what makes the swing run down the beam from the shoulder to the skull."""
    for i in range(CERVICALS):
        q = pb['neck_%02d' % i]
        k = BEAM[i] * (wave(phase - LAG[i]) if wave else 1.)
        q.rotation_euler.z += yaw * k
        q.rotation_euler.x += pitch * k


AMP = {'Idle': .22, 'Swim': 1., 'Sprint': 1.4, 'Crawl': .85, 'Eat': .3, 'Guard': .16, 'Drag': .5,
       'Breath': .5, 'Dodge': 1., 'Grab': .3, 'Growth': .4, 'Lower': .3, 'Retract': .5}
seams = {}
firsts = {}
lasts = {}
bounds = {}
strike_track = {}
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
        locomotor = clip in ['Swim', 'Sprint']
        body = pb['body']
        chest = pb['chest']
        skull = pb['skull']

        # ---- jaw. A fish trap closes fast and does not need a wide gape to read, but it does need
        # to be seen at distance: these openings are large enough to show the lined lumen.
        opening = .010 * (1 - cos(p)) if loop else 0
        if clip == 'Eat':
            opening = .16 * (1 - cos(p * 2))
        if clip == 'Bite':
            opening = .42 * sin(pi * u) ** 2
        if clip == 'Attack':
            opening = .34 * (sin(pi * u / .30) ** 2 if u < .30 else 0) + .06 * sbump(.30, .70)
        if clip == 'Heavy':
            opening = .40 * (sin(pi * u / .26) ** 2 if u < .26 else 0) + .05 * sbump(.26, .72)
        if clip == 'Grab':
            opening = .20 + .05 * e * sin(p * 2)
        if clip == 'Breath':
            opening = .12 * e
        if clip == 'Crawl':
            opening = .02 * pulse(.55, 4)
        if clip == 'Drag':
            opening = .30 + .04 * sin(p * 2)
        # The shore chain's jaws hand over with the rest of the pose: the watch-lowered mouth is
        # parted a little (LOW_GAPE), the strike throws it wide and shuts it hard on the catch, and
        # the recovery closes it as the head comes up.
        LOW_GAPE = .05
        if clip == 'Lower':
            opening = LOW_GAPE * ramp(.55, 1.)
        if clip in ('SnapLeft', 'SnapRight'):
            opening = LOW_GAPE + .41 * K.smooth(u / .28) * (1 - K.smooth((u - .40) / .14))
        if clip == 'Retract':
            opening = LOW_GAPE * (1 - ramp(.02, .52)) + .10 * sbump(.55, .85)
        if clip == 'Ability':
            opening = .40 * sbump(.34, .62) + .05 * sbump(.62, 1.)
        if clip == 'Severed':
            opening = .40 * ramp(.05, .25) + .10 * ramp(.25, 1.)
        opening += .26 * dead
        pb['jaw'].rotation_euler.x = opening
        skull.rotation_euler.x = -.10 * opening

        # ---- the caudal chain. The tail is the counterweight to the boom, so it answers the neck.
        for i in range(CAUDALS):
            q = pb['tail_%02d' % i]
            if locomotor:
                q.rotation_euler.z = (.050 + .030 * i) * amp * sin(p - i * .48)
            elif clip == 'Crawl':
                q.rotation_euler.z = (.016 + .010 * i) * sin(p - i * .40)
            else:
                q.rotation_euler.z = (.014 + .008 * i) * amp * wave(i * .5) + turn * (.018 + .010 * i)
            q.rotation_euler.x += dead * .04 * sin(i * .55)
            if clip in ['Dive', 'Rise']:
                q.rotation_euler.x += (1 if clip == 'Dive' else -1) * .030 * e * (1 + .12 * i)

        # ---- the limbs. A braced stance at the post is the animal's default: the forelimbs take
        # the weight of the boom and the hindlimbs are the power (long hindlimbs and tail base).
        for key, (pts, names) in LIMBS.items():
            s = 1 if key.endswith('L') else -1
            hind = key.startswith('hind')
            up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
            lag = (pi if hind else 0) + (.12 if s < 0 else 0)
            up.rotation_euler.x = .10 * amp * wave(lag) - .18 * dead
            up.rotation_euler.y = s * (.06 * amp * wave(lag + pi / 2) + .16 * dead)
            lo.rotation_euler.x = .08 * amp * wave(lag + .7) - .10 * dead
            ft.rotation_euler.x = .06 * amp * wave(lag + 1.3) + .08 * dead

        if locomotor:
            # Hindlimb-driven bursts in shallow water with the neck held out and steady: this is
            # not a pursuit swimmer and the research is explicit that it has no fast-swimming kit.
            body.rotation_euler.z = -.035 * amp * sin(p + .38)
            body.rotation_euler.y = .024 * amp * sin(p + 1.05)
            chest.rotation_euler.z = .012 * amp * sin(p + .95)
            neck(pb, yaw=.05 * amp * sin(p + 1.5))
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                drive = (.70 if hind else .22) * amp
                up.rotation_euler.x = (.10 if hind else .30) + drive * sin(p - (1.1 if hind else .7))
                up.rotation_euler.y = s * ((.30 if hind else .34) + .10 * amp * sin(p - 1.3))
                lo.rotation_euler.x = (-.16 if hind else -.30) + (.34 if hind else .10) * amp * sin(p - 1.5)
                ft.rotation_euler.x = .18 * amp * sin(p - 1.9)
        elif clip == 'Crawl':
            # A sprawling walk at the post, and the thing that makes it this animal: the neck is
            # carried like a plank the whole way through, so the body walks under a boom that does
            # not bob. Diagonal couplets, the belly low, the feet reaching.
            fl = pulse(.00, 3.)
            hr = pulse(.10, 3.)
            fr = pulse(.50, 3.)
            hl = pulse(.60, 3.)
            body.location.z = .020 * (sin(p * 2) - 1) * SCALE * .25
            body.rotation_euler.z = .030 * sin(p)
            body.rotation_euler.y = .055 * sin(p * 2 + .6)
            chest.rotation_euler.z = .022 * sin(p + .5)
            chest.rotation_euler.y = -.030 * sin(p * 2 + .9)
            neck(pb, yaw=-.024 * sin(p + .9), pitch=-.010 * sin(p * 2))
            skull.rotation_euler.z = .02 * sin(p + 1.3)
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                swing = {'foreL': fl, 'foreR': fr, 'hindL': hl, 'hindR': hr}[key]
                stance = 1 - swing
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x = (.34 if hind else .26) * swing - (.30 if hind else .22) * stance
                up.rotation_euler.y = s * ((.22 if hind else .26) - .12 * swing)
                up.rotation_euler.z = s * .10 * swing
                lo.rotation_euler.x = (.30 if hind else .24) * swing - .16 * stance
                ft.rotation_euler.x = .22 * swing - .10 * stance
        elif clip in ('Lower', 'SnapLeft', 'SnapRight', 'Retract'):
            # THE SHORE CHAIN. These four are one performance in four files, and they hand over to
            # each other rather than each returning to rest. `lowered` is the pose the mechanic
            # actually holds — the head dropped a hand's breadth with the neck gone rigid, which is
            # the design's own description of the telegraph — and the chain is:
            #
            #   Lower   rest -> lowered, held         (1.5 s, TELEGRAPH in shore.ts)
            #   Snap    lowered -> strike -> lowered  (0.6 s, the strike phase there)
            #   Retract lowered -> rest               (0.9 s, the recovery off it)
            #
            # so Lower's last frame is Snap's first and Snap's last is Retract's first, and the
            # build asserts those handovers below instead of asserting that each one closes on
            # itself. A telegraph that ended back at rest would be a telegraph that un-telegraphed.
            def lowered(a):
                """The watch-lowered pose, at strength `a`."""
                neck(pb, pitch=.30 * a)
                skull.rotation_euler.x += .16 * a
                chest.rotation_euler.x += -.05 * a
                body.rotation_euler.x += .07 * a
                body.location.z += -.10 * a * SCALE * .25
                for key, (pts, names) in LIMBS.items():
                    s = 1 if key.endswith('L') else -1
                    hind = key.startswith('hind')
                    up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                    up.rotation_euler.x += (.16 if not hind else .10) * a
                    lo.rotation_euler.x += (.20 if not hind else .12) * a
                    up.rotation_euler.y += s * .06 * a
                for i in range(CAUDALS):
                    pb['tail_%02d' % i].rotation_euler.x += -.030 * a * (1 + .1 * i)

            if clip == 'Lower':
                # Not a smooth sine: the drop comes in one committed movement between 0.08 and
                # 0.55, overshoots a little and settles, and the last third is held absolutely
                # still — which is what a second and a half of warning is *for*. The ribs keep
                # working underneath so the animal is not a statue.
                drop = ramp(.08, .55) + .09 * sbump(.46, .72)
                lowered(drop)
                chest.rotation_euler.y += .012 * sin(p * 2) * (1 - drop)
                body.rotation_euler.y += .016 * sin(p) * (1 - .7 * drop)
                neck(pb, yaw=.020 * sin(p) * (1 - drop))
            elif clip == 'Retract':
                # THE RECOVERY. The head comes up out of the water, a shake throws the water off
                # it, and the body resettles onto all four at the post. It begins at `lowered` — it
                # has to, because that is where the strike left the animal.
                lift = 1 - ramp(.02, .52)
                shake = sbump(.34, .74)
                lowered(lift)
                neck(pb, pitch=-.20 * sbump(.06, .60))
                skull.rotation_euler.x += -.16 * sbump(.06, .60)
                skull.rotation_euler.z += .26 * shake * sin(2 * pi * u * 7)
                skull.rotation_euler.y += .18 * shake * sin(2 * pi * u * 7 + 1.1)
                neck(pb, yaw=.10 * shake * sin(2 * pi * u * 7 - .6))
                body.location.z += .05 * sbump(.10, .68) * SCALE * .25
                for i in range(CAUDALS):
                    pb['tail_%02d' % i].rotation_euler.z += .030 * shake * sin(2 * pi * u * 3.5 + i * .4)
            else:
                # THE STRIKE. 0.6 s, which is how long shore.ts holds the strike phase. Four beats,
                # and not one of them a sine: a last cock *against* the swing (0.00-0.20), the boom
                # sweeping across and down into the water as one beam driven from its base
                # (0.10-0.36), the skull whipping through the last of it a beat after the shoulder
                # (0.28-0.60), and the follow-through the whole body is rocked by, settling back to
                # the watch-lowered pose it started from (0.50-1.00).
                d = 1 if clip == 'SnapLeft' else -1

                def bump(t, a, b):
                    return sin(pi * (t - a) / (b - a)) ** 2 if a < t < b else 0.

                def drive(t):
                    return (K.smooth((t - .10) / .26) - K.smooth((t - .50) / .30) - .30 * bump(t, 0., .20))
                swing = drive(u)
                dip = sin(pi * min(1., max(0., (u - .10) / .78)) ** .85) ** 2
                lowered(1.)
                neck(pb, yaw=d * 1.15, phase=u, wave=drive)
                neck(pb, pitch=.46 * dip)
                skull.rotation_euler.z += d * (.44 * bump(u, .28, .62) - .16 * bump(u, .62, 1.))
                skull.rotation_euler.x += .24 * dip + .10 * bump(u, .30, .54)
                chest.rotation_euler.z += d * (.18 * swing)
                chest.rotation_euler.x += .10 * dip
                body.rotation_euler.z += d * .11 * swing
                body.rotation_euler.y += -d * .13 * swing
                body.rotation_euler.x += .05 * dip
                body.location.z += -.09 * dip * SCALE * .25
                for i in range(CAUDALS):
                    q = pb['tail_%02d' % i]
                    q.rotation_euler.z += -d * (.030 + .016 * i) * swing
                    q.rotation_euler.x += -.022 * dip * (1 + .12 * i)
                for key, (pts, names) in LIMBS.items():
                    s = 1 if key.endswith('L') else -1
                    hind = key.startswith('hind')
                    up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                    up.rotation_euler.x += (.26 if s * d > 0 else .10) * swing + (.12 if not hind else .06) * dip
                    up.rotation_euler.y += s * .10 * swing
                    lo.rotation_euler.x += .14 * swing
        elif clip == 'Drag':
            # Hauling a mouthful up the beach: surges backward against the weight, the neck raised
            # and the feet braced, the head shaking the catch between hauls.
            haul = pulse(.22, 2.5)
            neck(pb, pitch=-.24 - .18 * haul, yaw=.10 * sin(p))
            skull.rotation_euler.z = .14 * sin(p * 3) * (1 - haul)
            skull.rotation_euler.x = -.12 - .10 * haul
            body.rotation_euler.x = -.10 - .10 * haul
            body.location.y = .10 * haul * SCALE * .25
            chest.rotation_euler.x = -.06 - .06 * haul
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                hind = key.startswith('hind')
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x += (-.30 if hind else -.18) * haul + .10
                lo.rotation_euler.x += (.34 if hind else .20) * haul
                ft.rotation_euler.x += .16 * haul
        elif clip == 'Severed':
            # THE ONE WAY TO CLEAR A BANK. A rung III or IV bite at the middle of the neck takes it
            # clean through (Spiekman & Mujal 2023, and shore.ts). The tension leaves the chain from
            # the bite outward rather than everywhere at once: the front of the neck goes first and
            # the collapse runs back to the shoulder, while the trunk spasms away from the bite and
            # then goes down where it stands.
            cut = ramp(.02, .10)
            fall = ramp(.08, .62)
            down = ramp(.42, 1.)
            # The neck goes *slack*, and slack is not a coil: the first pass of this clip gave
            # every joint a fifth of a radian and wound thirteen of them into a closed ring, which
            # is a hosepipe's death and not a boom's. The droop is a total angle for the whole
            # chain, front-weighted, exactly as every other neck angle in this file is.
            SEVER_DROOP = 1.45
            sw = np.array([.35 + 1.5 * i / (CERVICALS - 1) for i in range(CERVICALS)])
            sw = sw / sw.sum()
            for i in range(CERVICALS):
                q = pb['neck_%02d' % i]
                # the collapse travels from the middle of the neck outward, as the bite does
                local = K.smooth((fall - .18 * abs(i - CERVICALS * .55) / CERVICALS) / .55)
                q.rotation_euler.x += SEVER_DROOP * sw[i] * local
                q.rotation_euler.z += (.03 - .05 * ((i * 37) % 7) / 7.) * local
            skull.rotation_euler.x += .55 * fall
            skull.rotation_euler.z += -.30 * fall
            chest.rotation_euler.x = -.26 * cut + .20 * down
            chest.rotation_euler.z = .18 * cut - .10 * down
            body.rotation_euler.x = -.20 * cut + .26 * down
            body.rotation_euler.y = 1.05 * down
            body.rotation_euler.z = .22 * cut
            body.location.z = (.12 * cut - .48 * down) * SCALE * .25
            for i in range(CAUDALS):
                pb['tail_%02d' % i].rotation_euler.z += .05 * cut * (1 + .1 * i) + .03 * down * sin(i * .7)
                pb['tail_%02d' % i].rotation_euler.x += .03 * down * sin(i * .5)
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1
                up, lo, ft = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x += .30 * cut - .34 * down
                up.rotation_euler.y += s * .30 * down
                lo.rotation_euler.x += .20 * cut - .18 * down
        else:
            # ---- the contract's own clips, over the same stiff boom.
            body.rotation_euler.y = .016 * amp * wave(.3)
            body.location.z = .05 * amp * wave(.2) * SCALE * .25
            body.rotation_euler.z = .16 * turn
            body.rotation_euler.y += .09 * turn
            chest.rotation_euler.z = .050 * turn
            neck(pb, yaw=.05 * amp * wave(.9) + .42 * turn, pitch=.02 * amp * wave(.6))
            if clip == 'Idle':
                # The watch. Everything about this clip is the head *not* moving: the ribs work, the
                # weight shifts foot to foot, the tail tip flicks once, and the boom holds its line
                # over the water. A hunter that fidgets is not lying in wait.
                chest.rotation_euler.x = .012 * sin(p * 2)
                body.rotation_euler.y = .030 * sin(p)
                body.location.z = .012 * sin(p * 2) * SCALE * .25
                neck(pb, pitch=-.010 * sin(p * 2 + .5), yaw=.014 * sin(p))
                skull.rotation_euler.z = .012 * sin(p + 1.2)
                for i in range(CAUDALS):
                    pb['tail_%02d' % i].rotation_euler.z += (.010 + .012 * i) * sin(p * 2 - i * .45) * \
                        (.35 + .65 * pulse(.72, 3))
            if clip in ['Dive', 'Rise']:
                d = 1 if clip == 'Dive' else -1
                body.rotation_euler.x = d * .22 * e
                chest.rotation_euler.x = d * .08 * e
                neck(pb, pitch=d * .30 * e)
            if clip == 'Attack':
                thrust = sbump(.10, .52)
                neck(pb, pitch=.34 * thrust, yaw=-.30 * sbump(0., .22) + .44 * thrust)
                skull.rotation_euler.z += .26 * sbump(.26, .60)
                body.location.y = -.24 * thrust * SCALE * .25
            if clip == 'Heavy':
                wind = sin(pi * u / .26) ** 2 if u < .26 else 0
                peak = sbump(.24, .66)
                neck(pb, pitch=-.16 * wind + .50 * peak, yaw=-.44 * wind + .70 * peak)
                skull.rotation_euler.z += .34 * sbump(.34, .70) - .14 * wind
                body.rotation_euler.z = -.10 * wind + .14 * peak
                body.location.y = .12 * wind - .34 * peak
                body.location.y *= SCALE * .25
            if clip == 'Bite':
                neck(pb, pitch=.22 * e)
                skull.rotation_euler.z += .10 * e * sin(p)
                body.location.y = -.06 * e * SCALE * .25
            if clip == 'Parry':
                body.rotation_euler.y = .22 * e
                neck(pb, yaw=.30 * e, pitch=-.16 * e)
            if clip == 'Guard':
                # The only cover this animal has is to bring the boom back over the shoulder and
                # drop onto the forelimbs, which is also what it does when something comes at it.
                neck(pb, yaw=.62, pitch=-.18)
                skull.rotation_euler.z += .18
                body.location.z = -.16 * SCALE * .25 - .03 * (1 - cos(p)) * SCALE * .25
                chest.rotation_euler.x = .10
            if clip == 'Dodge':
                body.rotation_euler.y = .34 * e
                body.rotation_euler.z = -.26 * e
                body.location.x = .34 * e * SCALE * .25
                neck(pb, yaw=-.34 * e)
            if clip in ['Hit', 'Stagger']:
                k = 1 if clip == 'Hit' else 2
                body.rotation_euler.z = .14 * e * sin(p * k)
                body.rotation_euler.y = .18 * e
                body.location.y = .08 * e * SCALE * .25
                neck(pb, yaw=.26 * e * sin(p * k), pitch=.14 * e)
                skull.rotation_euler.z += .16 * e * sin(p * k + .8)
            if clip == 'Breath':
                neck(pb, pitch=-.40 * e)
                body.rotation_euler.x = -.14 * e
                skull.rotation_euler.x += -.14 * e
            if clip == 'Eat':
                neck(pb, pitch=.38 + .08 * sin(p * 2))
                skull.rotation_euler.x += .10 + .06 * sin(p * 2)
                body.rotation_euler.x = .10
                body.location.z = -.14 * SCALE * .25
            if clip == 'Grab':
                # A held loop: the catch is in the fish trap and the neck is holding it up and away
                # from the body while it works.
                neck(pb, pitch=-.20 + .05 * sin(p), yaw=.10 * sin(p * 2))
                skull.rotation_euler.z += .09 * sin(p * 2 + .6)
                body.rotation_euler.x = -.06
                chest.rotation_euler.x = -.05
            if clip == 'Ability':
                # The roster's Boom strike at its own 1.0 s: the whole act compressed into one
                # gesture that begins and ends at the post — a short cock, one sweep of the beam
                # travelling down it, one snap of the skull, and back. Deliberately a different
                # performance from the Lower/Snap/Retract chain the shore mechanic drives.
                def abump(t, a, b):
                    return sin(pi * (t - a) / (b - a)) ** 2 if a < t < b else 0.

                def adrive(t):
                    return (K.smooth((t - .26) / .26) - K.smooth((t - .62) / .22)
                            - .28 * abump(t, 0., .34))
                sweep = adrive(u)
                cock = abump(u, 0., .34)
                neck(pb, yaw=.95, phase=u, wave=adrive)
                neck(pb, pitch=.34 * abump(u, .18, .96) - .10 * cock)
                skull.rotation_euler.z += .34 * abump(u, .40, .86) - .10 * cock
                skull.rotation_euler.x += .16 * abump(u, .22, .92)
                body.rotation_euler.z = .08 * sweep - .07 * cock
                body.location.z = -.06 * abump(u, .18, .96) * SCALE * .25
            if clip == 'Growth':
                body.rotation_euler.y = .05 * e
                body.location.z = .28 * e * SCALE * .25
                neck(pb, pitch=-.12 * e)
            if clip == 'Death':
                body.rotation_euler.y += 1.15 * dead
                body.rotation_euler.x += .14 * dead
                body.location.z -= .42 * dead * SCALE * .25
                # the same total-angle rule as the strike: a dead neck falls, it does not coil
                dw = np.array([.5 + 1.2 * i / (CERVICALS - 1) for i in range(CERVICALS)])
                dw = dw / dw.sum()
                for i in range(CERVICALS):
                    q = pb['neck_%02d' % i]
                    q.rotation_euler.x += 1.15 * dw[i] * dead
                    q.rotation_euler.z += .03 * dead * sin(i * .8)
                skull.rotation_euler.x += .20 * dead

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
            firsts[clip] = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
            lasts[clip] = state.copy()
        if clip in ('SnapLeft', 'Ability'):
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

# Every clip closes on itself except the four that are deliberately open: Death and Severed end
# where they fall, and Lower and Retract are the two ends of the shore chain, which hands over
# rather than returning to rest between its parts.
OPEN = {'Death', 'Severed', 'Lower', 'Retract'}
for c in set(CLIPS) - OPEN:
    assert seams[c] < 1e-6, (c, seams[c])
handover = {}
for a, b in [('Lower', 'SnapLeft'), ('Lower', 'SnapRight'), ('SnapLeft', 'Retract'),
             ('SnapRight', 'Retract')]:
    handover['%s->%s' % (a, b)] = float(abs(lasts[a] - firsts[b]).max())
handover['Retract->rest'] = float(abs(lasts['Retract']).max())
handover['Lower->rest'] = float(abs(lasts['Lower']).max())          # how far the telegraph carries
for k, v in handover.items():
    if k.endswith('->rest') and k != 'Retract->rest':
        continue
    assert v < 1e-6, ('the shore chain does not hand over', k, v)
assert handover['Lower->rest'] > .10, ('the telegraph does not go anywhere', handover)
reset()
scene.frame_set(0)

# The strike has to *travel*: the shoulder end of the chain must peak before the skull end, and the
# median joint must carry a real share of what the busiest one does. Unlike Dinocephalosaurus this
# body is a stiff beam and the base is meant to dominate, so the build measures the share rather
# than demanding it be even — and still refuses a strike that arrives everywhere at once.
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
        'jointsPeakingInOrder': int(inorder), 'peakPhaseShoulder': peak[0], 'peakPhaseSkull': peak[-1]}
    assert strike_report[clip]['jointsWorking'] == CERVICALS + 1, strike_report[clip]
    assert inorder >= CERVICALS - 1, strike_report[clip]
    assert peak[-1] > peak[0] + .02, ('the strike does not travel down the beam', strike_report[clip])

# ---- how far each limb root actually swings, per cycle --------------------------------------------
# The total angle a limb root turns through over a whole clip, summed frame to frame rather than
# taken as a peak-to-peak range: a limb that goes forward, back and forward again has swept more than
# its extremes say, and the peak-to-peak is reported beside it so the two can be read together.
#
# The user's paddling rule — a reptile's dash in water sweeping a limb from stretched forward all the
# way back to flush with the body — bears on none of this animal's clips: it stands on the beach and reaches, and never enters the water.
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

# ---- anchors, export, packaging --------------------------------------------------------------------
anchors = [
    {'name': 'anchor_mouth', 'bone': 'jaw', 'point': list(tx((X_SNOUT - .016, 0, seam(X_SNOUT - .016) - .006))),
     'role': 'mouth'},
    {'name': 'anchor_mouth_inside', 'bone': 'skull', 'point': list(tx((MOUTH_BACK + .030, 0, seam(MOUTH_BACK + .030)))),
     'role': 'swallow'},
    {'name': 'anchor_attack_primary', 'bone': 'skull', 'point': list(tx((X_SNOUT + .004, 0, seam(X_SNOUT)))),
     'role': 'attack'}]
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
    'id': ID, 'name': 'Tanystropheus', 'species': 'Tanystropheus hydroides',
    'description': 'Canonical Tripo body unbent onto its own straight axis and a procedural volume '
                   'twin on one 38-joint rig: thirteen hyperelongate cervicals carried as a stiff '
                   'beam, an articulated jaw with a lined mouth and authored fish-trap fangs, four '
                   'sprawled limbs and the shore animal\'s telegraph, strike, recovery and severed neck.',
    'modelLength': round(model_length, 4), 'lengthMeters': 5.25, 'locomotion': 'Crawl',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'notes': [
        'The extraordinary neck, the compact trunk, the sprawled limbs and the complete tail are '
        'retained from the accepted Tripo volume; one detached 114-vertex sliver beside the neck, '
        'which the source checkpoint\'s own review found, is removed and nothing else is.',
        'The generation swept the neck and the tail across the plan while the greenlit pose holds '
        'the neck straight out over the water. Intake unbends both by carrying every cross-section '
        'rigidly from its own measured centreline frame onto a target of the same segment lengths '
        'and the same per-segment rise, so the neck\'s decline to the head and the lift of the tail '
        'tip survive and nothing is stretched, sheared or thinned. UNBEND=False in build.py '
        'rebuilds the generated pose.',
        'The twin resurfaces a %.4f-unit voxel occupancy field, relaxes it once and reduces the new '
        'topology. It reuses no source vertex or face.' % VOXEL,
        'This head models no mouth cavity (six vertices answer the instrument that finds 193 on '
        'Placodus) and no teeth at all. The seam is placed on the head\'s own measured section at '
        'the height the surface crease measures, and the fish-trap fangs are authored into the '
        'lined lumen. That is a reconstruction, and it is recorded as one.',
        'Same rest rig, inverse binds, sockets and all %d action sample arrays for authored body '
        'and puppet. The LOD keeps every clip.' % len(CLIPS),
        'Original albedo retained with white COLOR_0; normal relief limited to 0.15 and skin '
        'explicitly nonmetallic at roughness 0.7. Puppet pigment samples triangle-local UVs.',
        'The neck is animated as the fossils describe it: a nearly rigid beam swung from its base '
        'with a lateral snap of the skull, not a swan\'s lunge. The base carries a third of every '
        'neck angle by design and the audit measures that share rather than asserting it away.',
        'Lower is the 1.5 s telegraph, SnapLeft/SnapRight the 0.6 s strike and Retract the recovery, '
        'timed to TELEGRAPH and the strike phase in src/sim/triassic/shore.ts. Severed is the neck '
        'bitten through at its middle. Living colours, soft tissues and movements are artistic '
        'reconstruction; locomotor translation remains engine-owned.']}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2))

report = {
    'sourceSha256': hashlib.sha256(open(RAW, 'rb').read()).hexdigest(),
    **intake,
    'remeshTriangles': remesh_triangles, 'puppetBudget': PUPPET_BUDGET, 'voxel': VOXEL,
    'fullTriangles': authored_tris, 'puppetTriangles': puppet_tris,
    'parts': {'authoredBody': K.triangles(auth), 'authoredJaw': K.triangles(AUTH_GROUP[1]),
              'puppetBody': K.triangles(puppet), 'puppetJaw': K.triangles(PUP_GROUP[1]),
              'sharedOral': sum(K.triangles(o) for o in oralparts)},
    'bones': bone_count_check, 'cervicals': CERVICALS, 'caudals': CAUDALS,
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'modelLength': model_length, 'rawLength': RAW_LENGTH,
    'maximumEnvelopeDifference': worst, 'envelopeTolerance': TOL, 'envelopeTolerancePercent': 4.,
    'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceDistanceP99': float(np.quantile(distances, .99)),
    'surfaceOutliersOverThreePercent': surface_outliers, 'surfaceVertices': len(distances),
    'seatingDepthRaw': seating, 'jawHingeHeadRadius': HEAD_R,
    'jawHingeDepthAsFractionOfHeadRadius': seating['jaw'] / HEAD_R,
    'oralInteriorDepthRaw': oral_depth, 'oralSeatingCorrection': oral_seating,
    'maxInfluences': max(influences), 'meanInfluences': float(np.mean(influences)),
    'trunkYawCorrectionDegrees': round(math.degrees(trunk_yaw), 3),
    'unbending': unbending, 'restPose': rest_pose,
    'mouth': {'method': 'no modelled cavity on this head; the seam follows the head\'s own measured '
                        'section at the crease\'s measured height, and the fangs are authored',
              'cavityVerticesFound': int(len(CAVITY)), 'jawFractionOfHeadSection': JAW_FRACTION,
              'pigmentContrast': PIGMENT_CONTRAST, 'pigmentStations': pigment_rows,
              'creaseFractionCrossCheck': CREASE_FRACTION, 'creaseIQR': CREASE_IQR,
              'creaseStations': CREASE_N,
              'modelledTeethFound': len(TEETH), 'proudPatches': len(PATCHES),
              'hingeX': HINGE_X, 'mouthBackX': MOUTH_BACK, 'mouthFrontX': MOUTH_FRONT,
              'liningInset': LINING_INSET, 'liningCullsBackfaces': True, 'skinDoubleSided': True,
              'fangs': sum(K.triangles(o) for o, _ in FANGS)},
    'beamShape': BEAM.tolist(), 'strike': strike_report, 'shoreChainHandover': handover,
    'limbSweep': limb_sweep, 'mouthCut': mouth_cut,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('TANYSTROPHEUS_REPORT', json.dumps({k: v for k, v in report.items() if k != 'boundsAt13Phases'}))
