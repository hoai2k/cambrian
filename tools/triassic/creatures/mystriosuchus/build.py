"""Rebuild Mystriosuchus: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first — head at -Y, up +Z, one unit
long — and `export_yup` then puts the head at glTF +Z, where every shipped body in this repository
keeps it.

A marine phytosaur: crocodile-shaped but not a crocodile, with a long narrow rostrum, a double row
of dorsal osteoderms and a laterally flattened sculling tail.

**This animal is one of the era's four shore animals** (`shore: true` in
`src/content/triassic/creatures.ts`, and `kindAt` in `src/sim/triassic/shore.ts` puts it on a
quarter of the banks). That is not bookkeeping: a shore animal is never playable, it is pinned at a
post above the waterline by `src/sim/triassic/shore.ts`, and `CLAUDE.md` makes it the stated
exception to "a playable Triassic animal swims" — *for whom the land motion is the primary*. So
`locomotion` here is `Crawl`, not `Swim`, exactly as Tanystropheus, Macrocnemus and Coelophysis
record it, and the four clips the simulation drives the post with are timed to the mechanic's own
clock rather than to a number that happens to agree with it: `Lower` is `TELEGRAPH` (1.5 s),
`SnapLeft`/`SnapRight` the strike window (0.6 s), `Retract` the recovery `RECOVER` (0.9 s).
The full swim set is still authored and still correct — the animal is in the water often enough —
but a crocodile-shaped ambusher sculls with its tail and holds its limbs back along its flanks, and
that is what `Swim` and `Sprint` do.

What was measured on this generation, rather than assumed:

  * **Which way it lies.** `preview-orientation.json` records an *estimated* yaw of 180 read off a
    fixed-axis render; nothing here reads it. The long axis is the vertex cloud's first principal
    component, 8.5 degrees off the file's own Y, and the **roll is 14.6 degrees** — read off the
    countershading (harmonic strength 0.407), which is a real correction on a body this symmetric
    and one no bounding box could have found.
  * **The mouth is painted, not modelled.** Placodus' geometric method returns 85 to 90 hits over
    the whole front third at every gap from 0.02 to 0.05, spread over 0.20 of z — the entire depth
    of the head — which is the gular folds and the scute relief finding each other across a crease,
    not a slit. The line is read as a continuous curve (`tripo.painted_line`) with the jump penalty
    raised from the kit's 1.2 to 3.0, and the read **stops short of the hinge**: at the jaw corner
    the mandible flares and the fit climbs off the lip onto the gold/dark boundary above it, which
    a render of the fitted line on the head is what showed. The seam is extrapolated from there on
    its own slope.
  * **The tail curls in two planes**, up and then down as well as across, which is an S and so has
    two curvature centres rather than one. `meanCurvatureRadiusOverSection` over the tail chain is
    reported below against Dinocephalosaurus' calibration (tail ~9 straightened on the rig; neck
    2.8 mean / 1.51 tightest had to be unbent in the mesh first). Nothing here is unbent in the
    mesh.
  * **The limbs are bound by a Voronoi split against the body's own axial polyline** rather than by
    a radius, for the reason Henodus' 64.9x records: a sprawling leg is thick at the shoulder, thin
    at the wrist and broad again at the foot, so no single radius describes it.

Writes only this species' asset family. Touches no shared registry and performs no git operation.
"""
import bpy, math, json, os, sys, hashlib, shutil
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                        # noqa: E402

ID = 'mystriosuchus'
NAME = 'Mystriosuchus'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
SOURCE = os.path.join(HERE, ID + '.preview.glb')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 5.0
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH
ANCHOR_TOLERANCE = .02 * BODY_LENGTH
SWALLOW_TOLERANCE = .05 * BODY_LENGTH
PUPPET_TRIANGLE_TARGET = 5600
VOXEL = .0038
THIN = .030

# **The four shore clips are timed to the mechanic, not beside it.** `src/sim/triassic/shore.ts`
# runs the post on TELEGRAPH = 1.5, a 0.6 s strike window and RECOVER = 0.9, and `shoreClip` names
# exactly these four. A clip whose duration merely resembles the phase it plays under is two clocks
# that happen to agree.
TELEGRAPH, STRIKE, RECOVER = 1.5, .6, .9
CLIPS = {'Idle': 3.2, 'Swim': 1.8, 'Sprint': 1.1, 'TurnLeft': 1.5, 'TurnRight': 1.5,
         'Dive': 1.3, 'Rise': 1.3, 'Attack': 0.9, 'Bite': .45, 'Heavy': 1.2, 'Hit': .6,
         'Death': 1.9, 'Guard': 1.2, 'Parry': .35, 'Dodge': .5, 'Eat': 1.5, 'Stagger': 1.1,
         'Ability': 1.1, 'Grab': 1.1, 'Breath': 2.2, 'Growth': 1.4, 'Breathe': 3.0,
         'Crawl': 1.7, 'Lower': TELEGRAPH, 'SnapLeft': STRIKE, 'SnapRight': STRIKE,
         'Retract': RECOVER}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe', 'Crawl']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(SOURCE if os.path.exists(SOURCE) else RAW, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(SOURCE if os.path.exists(SOURCE) else RAW, ROOT)
intake['rawGenerationSha256'] = hashlib.sha256(open(RAW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.58)
skin_material.use_backface_culling = False
frame = T.measure_frame(auth, head_is_positive_pca=True, luminance_at=luminance_at)
pigment = T.pigment_sampler(auth, sample_albedo)

raw_co = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(raw_co[:, 1].min()), float(raw_co[:, 1].max())

bvh_auth0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh_auth0))
thin_mask = thickness < THIN
cx0, cz0, _hw0, _hd0, rough_centreline = T.measured_centreline(auth, thin_mask)


# ------------------------------------------------- the trunk's own centreline ----
# **`T.measured_centreline` is written for a body whose appendages are blades, and a sprawling leg
# is not one.** It takes the median x and z of the *thick* vertices in each slab, and a leg is
# thick: at the shoulder station the forelimb contributes a fifth of the slab and drags the median
# out into the armpit. Measured on Mystriosuchus, the axis it returns is **outside the skin** at
# y -0.15 (depth -0.0066 where the body is 0.15 wide and 0.08 deep) and only 0.0075 inside through
# the whole head. That is not a cosmetic error: every limb root is seated by pulling it towards
# this axis, the skin is banded by arc length along it, and the Voronoi test that says which
# vertices are the limb's measures distance to it.
#
# So the axis is measured twice. The first pass is the kit's, good enough to find the limb clusters;
# the second excludes every vertex that is nearer a limb's own polyline than the rough axis -- the
# same test the weights use -- and takes the **mid-range of the 4th and 96th percentiles** rather
# than the median, because a centre is the middle of a section and not the middle of its vertices.
def trunk_centreline(o, drop, stations=61, band=.014, smoothing=5):
    co = np.array([v.co[:] for v in o.data.vertices])
    keep = ~drop
    ys = np.linspace(co[:, 1].min(), co[:, 1].max(), stations)
    cxs, czs, hws, hds = [], [], [], []
    for y in ys:
        m = (np.abs(co[:, 1] - y) < band) & keep
        if m.sum() < 8:
            m = np.abs(co[:, 1] - y) < band
        if m.sum() < 3:
            cxs.append(cxs[-1] if cxs else 0.)
            czs.append(czs[-1] if czs else 0.)
            hws.append(hws[-1] if hws else 0.)
            hds.append(hds[-1] if hds else 0.)
            continue
        q = co[m]
        xa, xb = np.quantile(q[:, 0], .04), np.quantile(q[:, 0], .96)
        za, zb = np.quantile(q[:, 2], .04), np.quantile(q[:, 2], .96)
        cxs.append(float((xa + xb) / 2))
        czs.append(float((za + zb) / 2))
        hws.append(float((xb - xa) / 2))
        hds.append(float((zb - za) / 2))
    k = np.ones(smoothing) / smoothing
    pad = smoothing // 2
    sm = lambda v: np.convolve(np.pad(np.array(v), pad, mode='edge'), k, mode='valid')
    cxs, czs, hws, hds = sm(cxs), sm(czs), sm(hws), sm(hds)
    table = [{'y': float(y), 'cx': float(a), 'cz': float(b), 'halfWidth': float(c),
              'halfDepth': float(d)} for y, a, b, c, d in zip(ys, cxs, czs, hws, hds)]
    return ((lambda y: float(np.interp(y, ys, cxs))), (lambda y: float(np.interp(y, ys, czs))),
            (lambda y: float(np.interp(y, ys, hws))), (lambda y: float(np.interp(y, ys, hds))),
            table)


def limb_vertex_mask(o, legs, cx0, cz0):
    """Every vertex nearer one of the four limbs' rough polylines than the rough body axis."""
    co = np.array([v.co[:] for v in o.data.vertices])
    ys = np.linspace(co[:, 1].min(), co[:, 1].max(), 61)
    axis = [Vector((cx0(float(y)), float(y), cz0(float(y)))) for y in ys]
    AP0, AC0 = T.polyline(axis)
    lines = []
    for c in legs:
        seat = Vector(c['seat'])
        reach = Vector(c['reach'])
        lines.append(T.polyline([seat + (reach - seat) * t for t in (0., .34, .68, 1.)]))
    out = np.zeros(len(co), bool)
    for i, p in enumerate(co):
        q = Vector((float(p[0]), float(p[1]), float(p[2])))
        da = T.project(AP0, AC0, q)[0]
        for P, cum in lines:
            if T.project(P, cum, q)[0] < da:
                out[i] = True
                break
    return out


def on_axis(y, dz=0., dx=0.):
    return Vector((cx(y) + dx, y, cz(y) + dz))


# ------------------------------------------------------- the four limbs, as measured ----
# Six thin patches: the four limbs, the narrow rostrum and one enormous patch that is the dorsal
# osteoderm ridge welded to the flattened tail. **The test that separates a limb from that patch is
# its station span**, not its reach: the ridge-and-tail patch runs 0.76 of a body along the axis
# where no limb runs more than 0.10, and it reaches further from the axis than two of the limbs do.
def find_legs(axis_x):
    legs, other = [], []
    for c in T.thin_clusters(auth, thin_mask, axis_x, _cz_for_clusters[0]):
        mid = (c['yRange'][0] + c['yRange'][1]) / 2
        span = c['yRange'][1] - c['yRange'][0]
        lateral = abs(c['centroid'][0] - axis_x(mid))
        (legs if (span < .13 and c['reachRadius'] > .15 and lateral > .04) else other).append(c)
    return legs, other


_cz_for_clusters = [cz0]
legs, other = find_legs(cx0)
assert len(legs) == 4, ('four limbs did not measure on the rough axis', len(legs))
# Second pass: drop the limbs and remeasure the axis, then find the limbs again against it, so the
# seat, the reach and the arc-length banding all read off an axis that is inside the animal.
LIMB_MASK = limb_vertex_mask(auth, legs, cx0, cz0)
cx, cz, half_width, half_depth, centreline = trunk_centreline(auth, thin_mask | LIMB_MASK)
_cz_for_clusters[0] = cz
legs, other = find_legs(cx)
print('MYS_CLUSTERS', json.dumps(
    {'limbVertices': int(LIMB_MASK.sum()),
     'legs': [{k: v for k, v in c.items() if k != 'indices'} for c in legs],
     'other': [{k: v for k, v in c.items() if k != 'indices'} for c in other]}))
assert len(legs) == 4, ('four limbs did not measure', len(legs))
legs.sort(key=lambda c: (c['yRange'][0] + c['yRange'][1]) / 2)
LIMBS = {}
for i, c in enumerate(legs):
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    LIMBS[('fore' if i < 2 else 'hind') + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
assert sorted(LIMBS) == ['foreL', 'foreR', 'hindL', 'hindR'], sorted(LIMBS)

depth, bvh_auth = T.depth_probe(auth)

# --------------------------------------------------------------------- measure the mouth ----
MOUTH_GAP = .030
CAV = T.mouth_cavity(auth, front_fraction=.34, gap=MOUTH_GAP)
CAV_SPREAD = float(CAV[:, 2].max() - CAV[:, 2].min()) if len(CAV) else 0.
# A modelled slit is a thin band of hits along the lip. What this returns is scattered over the
# whole depth of the head, which is not a mouth.
assert CAV_SPREAD > .12 or len(CAV) < 40, ('a modelled cavity turned up -- use it', len(CAV))
MOUTH_METHOD = ('painted line, read as a continuous curve under a raised jump penalty '
                '(the geometric method found no slit)')

HINGE_Y = float(Y0 + .215)
JAW_FRONT_Y = float(Y0 - .002)
MOUTH_FRONT_Y = float(Y0 + .010)
HEAD_BACK = float(Y0 + .246)
READ_BACK = float(Y0 + .180)
PAINTED_JUMP = 3.0

_HY = np.linspace(Y0 + .002, HEAD_BACK + .03, 56)
# **The head's own section, and the limbs are not part of it.** A first pass took every vertex in
# the slab, and on a sprawling quadruped the forelimb reaches forward under the jaw: on
# Mystriosuchus the measured half depth went 0.025 -> 0.177 in one station at y -0.354, which is
# where the forelimb enters the slab and not where the head gets deep. Everything downstream is
# built on that number -- the painted line is read in units of it, the lining is sized by it, and
# the seam is `cz + u * halfDepth` -- so the mouth line climbed out through the top of the skull
# and the lining broke the skin by 0.034. The limb mask the axis pass already measured is exactly
# the set to drop.
_HW, _HD = [], []
for _y in _HY:
    _m = (np.abs(raw_co[:, 1] - _y) < .005) & ~LIMB_MASK
    if _m.sum() < 6:
        _m = np.abs(raw_co[:, 1] - _y) < .005
    if _m.sum() < 6:
        _HW.append(_HW[-1] if _HW else .002)
        _HD.append(_HD[-1] if _HD else .002)
        continue
    _q = raw_co[_m]
    _HW.append(float(np.quantile(np.abs(_q[:, 0] - cx(_y)), .90)))
    _HD.append(float(np.quantile(np.abs(_q[:, 2] - cz(_y)), .90)))
_HW, _HD = np.array(_HW), np.array(_HD)


def head_half_width(y):
    return float(np.interp(y, _HY, _HW))


def head_half_depth(y):
    return float(np.interp(y, _HY, _HD))


PAINTED = T.painted_line(auth, luminance_at, cz, head_half_depth, Y0 + .008, READ_BACK,
                         u_lo=-.95, u_hi=.10, stations=32, jump=PAINTED_JUMP)
assert len(PAINTED) >= 20, ('the painted mouth line did not read', len(PAINTED))
_py = np.array([r['y'] for r in PAINTED])
_pz = T.blur1d(np.array([r['z'] for r in PAINTED]), 1.2)
PAINTED_DISAGREEMENT = float(np.max([r['disagreementOverRadius'] for r in PAINTED]))
PAINTED_DISAGREEMENT_MEAN = float(np.mean([r['disagreementOverRadius'] for r in PAINTED]))
PAINTED_ROUGHNESS = float(np.mean(np.abs(np.diff([r['u'] for r in PAINTED]))))
print('MYS_PAINTED', json.dumps({'stations': len(PAINTED), 'roughness': PAINTED_ROUGHNESS,
                                 'disagreementMean': PAINTED_DISAGREEMENT_MEAN,
                                 'disagreementMax': PAINTED_DISAGREEMENT,
                                 'u': [round(r['u'], 3) for r in PAINTED]}))
assert PAINTED_ROUGHNESS < .04, ('the mouth line does not read as a line', PAINTED_ROUGHNESS)
assert PAINTED_DISAGREEMENT_MEAN < .30, ('the two flanks do not agree', PAINTED_DISAGREEMENT_MEAN)

_tail = _py > READ_BACK - (READ_BACK - (Y0 + .008)) / 6
_slope, _icept = np.polyfit(_py[_tail], _pz[_tail], 1)
_EXTRA_Y = np.linspace(READ_BACK, HEAD_BACK, 8)[1:]
_EXTRA_Z = _slope * _EXTRA_Y + _icept
_SEAM_Y = np.concatenate([_py, _EXTRA_Y])
_SEAM_Z = np.concatenate([_pz, _EXTRA_Z])


def seam(y):
    return float(np.interp(y, _SEAM_Y, _SEAM_Z))


_ramp = np.polyfit(_py, _pz, 1)
_resid = _pz - np.polyval(_ramp, _py)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(head_half_depth(float(y)), 1e-4) for y in _py])))
CUT_DEVIATION_RAW = float(np.max(np.abs(np.array([r['z'] for r in PAINTED]) - _pz)))

print('MYS_SEAM_TABLE', json.dumps(
    [[round(float(y), 4), round(cz(float(y)), 4), round(head_half_depth(float(y)), 4),
      round(seam(float(y)), 4), round(depth(Vector((cx(float(y)), float(y), seam(float(y))))), 4)]
     for y in np.linspace(Y0 + .005, HEAD_BACK + .02, 26)]))

# **The seam has to be inside the animal.** It is the curve the head is sheared onto and cut at, so
# a station where it leaves the skin is a cut through open air and a lining built outside the head.
# The first Mystriosuchus build failed 0.034 outside; nothing upstream said so, and what said so in
# the end was the oral-part seating assertion three hundred lines later.
_SEAM_DEPTHS = [(round(float(y), 4), round(depth(Vector((cx(float(y)), float(y), seam(float(y))))), 5))
                for y in np.linspace(JAW_FRONT_Y + .004, HEAD_BACK, 40)]
_SEAM_WORST = min(d for _y, d in _SEAM_DEPTHS)
assert _SEAM_WORST > -.004, ('the mouth seam leaves the head', _SEAM_WORST,
                             [r for r in _SEAM_DEPTHS if r[1] < -.004])

SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0020)


def _cast(o, d, limit=.5):
    hit = bvh_auth.ray_cast(Vector(o), Vector(d), limit)
    return float(hit[3]) if hit[0] is not None else limit


_MW, _MV = [], []
for _y in _HY:
    _o = (cx(float(_y)), float(_y), seam(float(_y)))
    _MW.append(min(_cast(_o, (1, 0, 0)), _cast(_o, (-1, 0, 0)), head_half_width(float(_y))))
    _MV.append(min(_cast(_o, (0, 0, 1)), _cast(_o, (0, 0, -1)), head_half_depth(float(_y))))
_MW, _MV = np.array(_MW), np.array(_MV)


def mouth_half_width(y):
    return float(np.interp(y, _HY, _MW))


def mouth_half_depth(y):
    return float(np.interp(y, _HY, _MV))


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


# **The long gaps in an axial chain are where the skin tears.** A first pass ran chest -> body ->
# tail_00 with 0.157 and 0.155 of a body between them, against 0.055 inside the tail, and
# `skin-tears.mjs` read 8.01x with 775 torn edges on `tail_00` and 515 on `body`. A phytosaur's
# trunk is stiff and armoured, so those joints barely bend -- but a *station* has to exist wherever
# the skin needs one, and a joint that does not bend still has to own the skin between it and the
# next. `thorax` and `lumbar` halve both gaps and carry almost no wave.
NECK_Y = -.292
CHEST_Y, THORAX_Y, BODY_Y, LUMBAR_Y = -.252, -.170, -.085, .000
TAIL_Y = [.070, .128, .186, .244, .302, .358, .414, .462]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('thorax', on_axis(THORAX_Y), 'body')
bone('chest', on_axis(CHEST_Y), 'thorax')
bone('lumbar', on_axis(LUMBAR_Y), 'body')
bone('neck_00', on_axis(NECK_Y), 'chest')
bone('skull', on_axis(HINGE_Y - .035), 'neck_00')
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .006), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'lumbar' if i == 0 else 'tail_%02d' % (i - 1))

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.014)
    reach = Vector(c['reach'])
    # **Four joints, not three.** A leg that swings 100 degrees on three joints puts a third of
    # that arc across each band between them, and `skin-tears.mjs` read 8.01x across exactly those
    # bands (`hind_lower_L`, `fore_lower_L`). This is Rhaeticosaurus' finding in a different
    # anatomy: femur, tibia, tarsus and the broad webbed foot.
    # **Three joints, and a fourth made it worse.** Rhaeticosaurus' flippers wanted four because a
    # hydrofoil bends along its length; a sprawling leg is a straight polyline through a bent limb,
    # so a fourth joint narrows every band without describing the animal any better -- measured at
    # 9.10x against three joints' 8.01x. What the limb actually needs is a *wider* blend between
    # the joints it has, and a blend wide enough only fits inside the four-influence budget with
    # three of them.
    names = ['%s_upper_%s' % (kind, s), '%s_lower_%s' % (kind, s), '%s_foot_%s' % (kind, s)]
    pts = [root, root + (reach - root) * .36, root + (reach - root) * .66, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    parent = 'chest' if kind == 'fore' else 'tail_00'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .010, ('a limb root is not seated inside the trunk', n, d)
JAW_SEATING = depth(B['jaw'][0])
assert JAW_SEATING > .004, ('the jaw hinge is not seated inside the head', JAW_SEATING)

# ------------------------------------------------------------ skinning by arc length ----
AXIAL_NAMES = ['skull', 'neck_00', 'chest', 'thorax', 'body', 'lumbar'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
AXIAL_PTS = [Vector((cx(Y0 + .01), Y0 + .01, cz(Y0 + .01)))] + [B[n][0] for n in AXIAL_NAMES] \
    + [on_axis(Y1 - .004)]
AP, ACUM = T.polyline(AXIAL_PTS)
ASTATION = [(AXIAL_NAMES[i - 1], ACUM[i]) for i in range(1, len(AXIAL_NAMES) + 1)]
LIMB_FIT = {}
for key, pts in LIMB_PTS.items():
    P, cum = T.polyline(pts)
    LIMB_FIT[key] = (P, cum, LIMB_NAMES[key],
                     T.station_weights(ASTATION, T.project(AP, ACUM, P[0])[1]))

RELAX_PASSES = 14   # Coelophysis' and Macrocnemus' figure; 10 left the hind limbs at 5.51x
LIMB_MARGIN = .055
LIMB_ROOT_FADE = .34
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    LIMB_RADIUS[key] = (float(np.quantile(d, .92)), float(np.quantile(d, .995)) + .030)


def limb_weights(q):
    da, _sa = T.project(AP, ACUM, q)
    best, chosen = 0., None
    for key, (P, cum, names, rootw) in LIMB_FIT.items():
        dist, s = T.project(P, cum, q)
        if dist >= LIMB_RADIUS[key][1]:
            continue
        alpha = T.smooth((da - dist) / LIMB_MARGIN + .5)
        alpha *= T.smooth(s / max(cum[-1] * LIMB_ROOT_FADE, 1e-6))
        if alpha > best:
            best = alpha
            # **The blend between the joints of a limb is a fraction of that limb's own
            # length, not a constant.** Rhaeticosaurus' 0.050 is 0.16 of a flipper that reaches
            # 0.30 from the axis; copied as a number onto a leg whose whole chain is 0.09 long it
            # is two and a half *segments* wide, and `limb_chain` then gives every vertex on the
            # limb all four joints at nearly the same weight. That is over the four-influence
            # budget once the root station is added, so `relax_weights` trims -- and picks a
            # different four on neighbouring vertices, which is the discontinuity Cartorhynchus'
            # radiating paddle spikes came from. Measured: 9.10x at the constant, 9.10x at the
            # fraction.
            chosen = (T.limb_chain(names, cum, s, blend=cum[-1] * .26), rootw,
                      min(1., s / cum[-1]))
    return (best, *chosen) if chosen else None


THROAT_SPAN = .058
THROAT_DROP = .16


# **A throat has a width.** This gate was a band in `y` below a height in `z` and nothing at all in
# `x`, so it claimed everything in that slab of the animal -- and this generation, like
# Aphaneramma's, carries its **right forelimb tucked forward under the snout**, inside the slab.
# The bound is the trunk's own measured half width at that station, which `trunk_centreline`
# computes with the limb vertices dropped, so it is the neck's width and not the arm's.
THROAT_WIDTH = 1.15


def throat_jaw_share(q):
    a = T.smooth((q.y - (HINGE_Y - .016)) / .016)
    b = T.smooth(((HINGE_Y + THROAT_SPAN) - q.y) / THROAT_SPAN)
    c = T.smooth((seam(HINGE_Y) - q.z) / (THROAT_DROP * head_half_depth(HINGE_Y)) + 1.)
    hw = max(half_width(q.y), 1e-6)
    d = T.smooth((THROAT_WIDTH * hw - abs(q.x - cx(q.y))) / (.30 * hw))
    return a * b * c * d


def weights(p):
    q = Vector(p)
    w = dict(T.station_weights(ASTATION, T.project(AP, ACUM, q)[1]))
    limb = limb_weights(q)
    alpha = 0.
    if limb:
        alpha, chain, rootw, t = limb
        base = {}
        for n, v in w.items():
            base[n] = base.get(n, 0.) + v * (1 - t)
        for n, v in rootw.items():
            base[n] = base.get(n, 0.) + v * t
        w = {n: v * (1 - alpha) for n, v in base.items()}
        for n, v in chain.items():
            w[n] = w.get(n, 0.) + v * alpha
    # **The limb is settled first and the throat takes only what is left of it.** Run the other way
    # round -- which is how this builder had it -- the throat hands a vertex to `jaw`, the limb then
    # blends *that* mixture back down by `1 - alpha`, and a tucked limb whose alpha is only about a
    # third keeps two thirds of its flesh on the mandible. A limb is never throat.
    throat = throat_jaw_share(q) * (1. - alpha)
    if throat > 0:
        w = {n: v * (1 - throat) for n, v in w.items()}
        w['jaw'] = w.get('jaw', 0.) + throat
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    total = sum(v for _, v in items)
    return {n: v / total for n, v in items}


# ------------------------------------------- how posed is the generation, measured ----
def _section_radius(y):
    return (half_width(y) + half_depth(y)) / 2


POSE_DEVIATION = {
    'spine': T.curvature_over_section([B[n][0] for n in AXIAL_NAMES], _section_radius),
    'headAndChest': T.curvature_over_section(
        [B[n][0] for n in ('skull', 'neck_00', 'chest', 'thorax', 'body')], _section_radius),
    'tail': T.curvature_over_section(
        [B[n][0] for n in AXIAL_NAMES if n.startswith('tail_')], _section_radius),
}
def _turning(names):
    """How far a run of the rest axis **turns in total**, in degrees.

    `curvature_over_section` says how *tight* a bend is against the body's own thickness, which is
    what decides rig-versus-mesh straightening -- and it is silent about how far the run turns
    altogether. A long tail curving gently through ninety degrees reports a large, comfortable
    ratio and still reads as a hook. Aphaneramma is the worked example: 13.3 mean and 3.97 tightest,
    which is the gentle case by the ratio, over a tail that turns 62 degrees from its first segment
    to its last. Both numbers are recorded, because the `Neutral` pose pass needs the second one to
    know there is anything to do.
    """
    pts = [B[n][0] for n in names]
    a = pts[1] - pts[0]
    b = pts[-1] - pts[-2]
    total = math.degrees(a.angle(b)) if a.length > 1e-9 and b.length > 1e-9 else 0.
    steps = []
    for i in range(1, len(pts) - 1):
        u, v = pts[i] - pts[i - 1], pts[i + 1] - pts[i]
        steps.append(round(math.degrees(u.angle(v)), 2) if u.length > 1e-9 and v.length > 1e-9 else 0.)
    return {'firstToLastSegmentDegrees': round(total, 2), 'sumOfTurnsDegrees': round(sum(steps), 2),
            'perJointDegrees': steps}


REST_TURNING = {
    'spine': _turning(AXIAL_NAMES),
    'tail': _turning([n for n in AXIAL_NAMES if n.startswith('tail_')]),
}

LIMB_ASYMMETRY = T.limb_asymmetry(LIMB_PTS, cx, 1.)
print('MYS_POSE', json.dumps({k: {a: b for a, b in v.items() if a != 'perStation'}
                              for k, v in POSE_DEVIATION.items()}))
print('MYS_POSE_TAIL', json.dumps(POSE_DEVIATION['tail']['perStation']))
print('MYS_TURN', json.dumps(REST_TURNING))
print('MYS_ASYM', json.dumps(LIMB_ASYMMETRY.get('allPairs')))

# ------------------------------------------------------------------ procedural twin ----
puppet, puppet_thickness, twin_report, bvh_src = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', VOXEL, PUPPET_TRIANGLE_TARGET,
    sample_albedo, thin=THIN, band=.020, roughness=.62, blade_dilation=.0030)


# --------------------------------------------------------------------- cut the jaw ----
# **A mandible has a width, and this generation keeps its right forelimb tucked forward under the
# snout.** The test was a band in `y` below the mouth line with nothing at all in `x`, so the cut
# took the arm onto the mandible: 317 of the 693 vertices round `fore_foot_R` ended up in the
# lower-jaw shell, which is rigid on `jaw` at weight 1 and out of reach of anything `weights()`
# does -- 45.7 % of that neighbourhood read as `jaw`. Measured against the joint it belongs to, the
# right forefoot's skin travelled 0.58 of the distance its own joint did in `Swim` (0.71 measured
# close in), where every other foot on this animal is 0.99 to 1.06. Aphaneramma had the same fault
# from the same line, and this is the same repair.
#
# The rule is the one the *skinning* already uses -- a vertex is a limb's where it is nearer that
# limb's own polyline than the body's axial one -- so the cut and the weighting cannot disagree
# about which vertices are an arm. A width bound alone is not enough: on Aphaneramma, at 1.35 of
# the trunk's measured half width, the cut still took 235 of 637, because a long-snouted
# archosauromorph's snout is narrow and its hand is broad.
def on_a_limb(c):
    da, _sa = T.project(AP, ACUM, c)
    for _key, (P, cum, _n, _r) in LIMB_FIT.items():
        dist, s = T.project(P, cum, c)
        if dist < da and s > cum[-1] * .25:
            return True
    return False


def is_jaw(c):
    if not (JAW_FRONT_Y - .004 < c.y < HINGE_Y and c.z < seam(c.y) - 1e-7):
        return False
    return not on_a_limb(c)


parts = {}
for o in (auth, puppet):
    T.bisect_on_curve(o, seam, HINGE_Y, JAW_FRONT_Y - .004, margin=.03)
    T.split_part(o, 'lower jaw', is_jaw, parts)

tooth_report = []
for g in PATCHES:
    q = SNOUT_CO[g]
    below = sum(1 for c in q if is_jaw(Vector((float(c[0]), float(c[1]), float(c[2])))))
    tooth_report.append({'vertices': len(g), 'proudMax': float(PROUD[g].max()),
                         'y': [float(q[:, 1].min()), float(q[:, 1].max())],
                         'onJaw': int(below), 'onSkull': int(len(g) - below)})
straddling = [t for t in tooth_report if t['proudMax'] >= .0050 and 0 < t['onJaw'] < t['vertices']]

# ------------------------------------------------------------------------- armature ----
arm = bpy.data.armatures.new(NAME + ' shared skeleton')
rig = bpy.data.objects.new(NAME + '_Rig', arm)
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

weight_report, influences, JUNCTION = {}, [], {}
for o in (auth, puppet):
    shell = parts['lower jaw'][o.name]
    for part in (o, shell):
        for n in B:
            part.vertex_groups.new(name=n)
    raw_weights = [weights(v.co) for v in o.data.vertices]
    relaxed = T.relax_weights(o, raw_weights, passes=RELAX_PASSES, hold=.48)
    # The mandible is skinned *into* the head rather than rigid against it: one field over both
    # parts, the throat under the hinge following the jaw and the shell ramping to full jaw over
    # `band` from the cut rim, so the two copies of every rim vertex carry the same weights and the
    # cut cannot open (`T.jaw_junction`; `tools/triassic/lag.mjs` measures the seam it closes).
    body_w, shell_w, JUNCTION[o.name] = T.jaw_junction(
        o, shell, relaxed, B['jaw'][0], rear=lambda p: abs(p.y - HINGE_Y) < 1e-5,
        upper_jaw=lambda p: p.y < HINGE_Y and p.z >= seam(p.y) - 1e-6, axis=(0., -1., 0.))
    counts, owners = [], {}
    for part, field in ((o, body_w), (shell, shell_w)):
        for v in part.data.vertices:
            w = field[v.index]
            counts.append(len(w))
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
    influences.extend(counts)
    weight_report[o.name] = {'maxInfluences': max(counts), 'vertices': len(counts),
                             'verticesPerBone': owners, 'jawJunction': JUNCTION[o.name]}
for name, rep in weight_report.items():
    idle = [n for n in B if n != 'root' and rep['verticesPerBone'].get(n, 0) == 0]
    assert not idle, ('these joints own no skin', name, idle)

# ------------------------------------------------------------ the mouth interior ----
mouth_mat = T.inward_material(NAME + ' mouth interior', (.30, .13, .115, 1))
mouth_mat.use_backface_culling = False
MOUTH_BACK = HINGE_Y + .016
MOUTH_FRONT = MOUTH_FRONT_Y


def _raw_section(y):
    e = T.smooth((MOUTH_BACK - y) / .012) * T.smooth((y - MOUTH_FRONT) / .004)
    w = max(mouth_half_width(y) - .0004, .0012) * (.94 + .06 * e)
    h = max(min(head_half_depth(y) * .50, mouth_half_depth(y) * .60), .0028) * (.72 + .28 * e)
    return w, h


LINING_FIT = {}
LINING_POWER = 2.7


def mouth_section(y):
    w, h = _raw_section(y)
    LINING_FIT[round(float(y), 5)] = [round(w, 5), round(h, 5)]
    return w, h


def fit_lining_point(p, y):
    c = Vector((cx(y), y, seam(y)))
    d = Vector(p) - c
    for k in range(12):
        q = c + d * (1. - k * .035)
        if depth(q) > .0006:
            return q
    return c + d * .615


def lining_jaw_blend(p):
    _w, h = mouth_section(p.y)
    return T.smooth(.5 + 1.6 * ((seam(p.y) + .45 * h) - p.z) / max(h, 1e-6))


_room_cache = {}


def mouth_room(_y):
    k = round(_y, 5)
    if k not in _room_cache:
        _room_cache[k] = T.mouth_room(
            bvh_auth, Vector((cx(_y), _y, seam(_y))), Vector((1, 0, 0)), Vector((0, 0, 1)),
            limit=.20, fallback=.02,
            cap=(head_half_width(_y),
                 max(.002, head_half_depth(_y) - (seam(_y) - cz(_y))),
                 max(.002, head_half_depth(_y) + (seam(_y) - cz(_y)))))
    return _room_cache[k]


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, lining_jaw_blend, mouth_mat,
                              rings=30, ring=24, centre_x=cx, power=LINING_POWER,
                              fit=fit_lining_point, room=mouth_room)
oralparts = [lining]
mouth_cover = []
for r in PAINTED:
    y = float(r['y'])
    if not MOUTH_FRONT + .006 < y < MOUTH_BACK - .012:
        continue
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(mouth_half_width(y), 1e-9), 3),
                        round(h / max(head_half_depth(y), 1e-9), 3)])
    if y > MOUTH_FRONT + .020:
        assert w >= mouth_half_width(y) * .45, \
            ('the oral lining is narrower than the mouth', y, w, mouth_half_width(y))
    assert h >= .0012, ('the oral lining is flat', y, h)

hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.62)
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .004, cz(HINGE_Y))
HINGE_R = (half_width(HINGE_Y) * .92, .046, half_depth(HINGE_Y) * .98)
HINGE_FIT = 0.
for step in range(24):
    k = 1. - step / 24
    probe = [Vector((HINGE_CENTRE[0] + HINGE_R[0] * k * math.sin(b) * math.cos(a),
                     HINGE_CENTRE[1] + HINGE_R[1] * k * math.sin(b) * math.sin(a),
                     HINGE_CENTRE[2] + HINGE_R[2] * k * math.cos(b)))
             for a in np.linspace(0, 2 * pi, 20) for b in np.linspace(0, pi, 11)]
    if min(depth(q) for q in probe) > .0030:
        HINGE_FIT = k
        break
assert HINGE_FIT > .3, ('the hinge envelope could not be seated', HINGE_FIT)
print('MYS_HINGE', json.dumps({'fit': HINGE_FIT, 'r': list(HINGE_R), 'centre': list(HINGE_CENTRE)}))
bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, location=tx(HINGE_CENTRE))
hinge = bpy.context.object
hinge.name = 'Seated jaw hinge tissue'
hinge.scale = tuple(r * HINGE_FIT * SCALE for r in HINGE_R)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in hinge.data.vertices:
    v.co = hinge.matrix_world @ v.co
hinge.location = (0, 0, 0)
hinge.data.materials.clear()
hinge.data.materials.append(hinge_mat)
T.paint_from_source(hinge, pigment, SCALE)
for n in ('skull', 'jaw'):
    hinge.vertex_groups.new(name=n)
for v in hinge.data.vertices:
    t = max(0., min(1., (seam(HINGE_Y) * SCALE - v.co.z) / (.022 * SCALE)))
    hinge.vertex_groups['jaw'].add([v.index], t, 'REPLACE')
    hinge.vertex_groups['skull'].add([v.index], 1 - t, 'REPLACE')
for p in hinge.data.polygons:
    p.use_smooth = True
mo = hinge.modifiers.new('Hinge skin', 'ARMATURE')
mo.object = rig
hinge.parent = rig
oralparts.append(hinge)

oral_seating = []
for o in oralparts:
    worst = min(depth(Vector(v.co[:]) / SCALE) for v in o.data.vertices)
    oral_seating.append({'part': o.name, 'worstDepthRaw': float(worst)})
    if not o.get('measuredRoom'):
        assert worst > -.012, ('mouth geometry breaks the skin', o.name, worst)

# ------------------------------------------------------- measured paired profile ----
AUTH_GROUP = [auth, parts['lower jaw'][auth.name]]
PUP_GROUP = [puppet, parts['lower jaw'][puppet.name]]
profile, worst_envelope = T.paired_profile(AUTH_GROUP, PUP_GROUP,
                                           (Y0 + .006) * SCALE, (Y1 - .006) * SCALE,
                                           ENVELOPE_TOLERANCE, stations=21)
tv, tp = T.merged_geometry(PUP_GROUP)
pv = BVHTree.FromPolygons(tv, tp)
distances = [pv.find_nearest(v.co)[3] for o in AUTH_GROUP for v in o.data.vertices]
assert max(distances) < ENVELOPE_TOLERANCE, max(distances)

# ------------------------------------------------------------------------ anchors ----
SNOUT_Y = Y0 + .010
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, seam(SNOUT_Y) - .004), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .045), HINGE_Y - .045, seam(HINGE_Y - .045)),
                            'swallow'),
    # **The blow is the jaws on the end of a short neck.** This animal's named heavy and ability
    # are both the surface lunge -- the whole body driven forward by the tail with the jaws open --
    # so the bone that delivers it is the skull, not the tail that provides the thrust and not a
    # neck long enough to strike with on its own.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .004, seam(SNOUT_Y) + .005),
                              'attack'),
}
anchors = [{'name': n, 'bone': b, 'point': list(tx(p)), 'role': r}
           for n, (b, p, r) in ANCHOR_POINTS.items()]
anchor_checks = {}
for n, (b, p, r) in ANCHOR_POINTS.items():
    hit = bvh_auth.find_nearest(Vector(p))
    inside = depth(Vector(p))
    anchor_checks[n] = {'nearestSurfaceRaw': float(hit[3]),
                        'nearestSurfaceUnits': float(hit[3] * SCALE),
                        'fractionOfBodyLength': float(hit[3] * SCALE / BODY_LENGTH),
                        'depthInsideSkinRaw': float(inside)}
    if r == 'swallow':
        assert inside > 0, ('the swallow anchor is outside the head', n, inside)
        assert hit[3] * SCALE < SWALLOW_TOLERANCE, (n, hit[3])
    else:
        assert hit[3] * SCALE < ANCHOR_TOLERANCE, (n, hit[3])

# --------------------------------------------------------------------- performance ----
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


# **A crocodile-shaped animal sculls with its tail and walks with its legs**, and those are two
# different performances rather than one with a different amplitude. The axial gain is flat over a
# stiff, armoured trunk and climbs through the tail; the limbs take their real stroke in `Crawl`,
# which is this animal's declared locomotion, and in the water they are swept back along the flanks
# and kick rather than row. The swept angle at each root is measured from the limb's own direction
# below, in every one of those gaits, so "the limbs move" is a number in all of them.
AXIAL_CHAIN = ['neck_00', 'chest', 'thorax', 'body', 'lumbar'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
GAIN = [.16, .06, .06, .07, .11, .19, .31, .46, .62, .79, .94, 1.06, 1.16]
LAG = [0., .26, .50, .74, .98, 1.24, 1.52, 1.80, 2.08, 2.36, 2.64, 2.92, 3.20]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}
STROKE_LAG = {'foreL': 0., 'foreR': pi, 'hindL': pi, 'hindR': 0.}


def ramp(u, a, b, p=1.):
    return T.smooth((u - a) / max(b - a, 1e-6)) ** p


def spike(u, a, b, p=1.):
    if u <= a or u >= b:
        return 0.
    return (sin(pi * (u - a) / (b - a)) ** 2) ** p


seams, bounds, gape_trace = {}, {}, {}
for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    loop = clip in LOOPS
    first = None
    for f in range(last + 1):
        reset()
        u = f / last
        p = 2 * pi * u
        e = sin(pi * u) ** 2
        env = 1. if loop else e
        pb = rig.pose.bones

        amp = {'Idle': .12, 'Swim': 1.0, 'Sprint': 1.40, 'Eat': .22, 'Guard': .14, 'Grab': .20,
               'Breath': .24, 'Breathe': .18, 'Growth': .18, 'Dodge': 1.00, 'Crawl': .40,
               'Lower': .10, 'Retract': .14, 'SnapLeft': .35, 'SnapRight': .35,
               'Ability': .70}.get(clip, .22)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1., 'Crawl': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        drive = (ramp(u, .30, .48, 2.2) * (1 - ramp(u, .64, 1., 1.))
                 if clip in ('Attack', 'Heavy', 'Ability') else 0.)
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        # **The surface lunge is a straight-line charge, not a sweep.** The animal's own kit calls
        # its heavy and its ability the surface lunge, at a reach of a body length and a half, and
        # what carries it is one enormous tail stroke rather than a neck.
        lunge = {'Heavy': 1.30, 'Ability': 1.75}.get(clip, 0.)
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        # --- the shore performance, on the simulation's own clock
        lower = ramp(u, .05, .85, 1.5) if clip == 'Lower' else 0.
        snapside = (1. if clip == 'SnapLeft' else -1.) if clip in ('SnapLeft', 'SnapRight') else 0.
        # The strike: a wind-up across to the far side and a whip through to the near one.
        wind = spike(u, .00, .34, 1.2) if snapside else 0.
        whip = ramp(u, .22, .52, 2.0) * (1 - ramp(u, .70, 1., 1.)) if snapside else 0.
        back = ramp(u, .0, .8, 1.2) if clip == 'Retract' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws
        gape = .010 * (1 - cos(p)) * (1 if clip in ('Idle', 'Swim', 'Sprint') else 0)
        if clip == 'Bite':
            gape = .48 * ramp(u, .03, .17, 1.8) * (1 - ramp(u, .22, .38, 2.4))
        elif clip == 'Attack':
            gape = .20 * cock + .44 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip in ('Heavy', 'Ability'):
            gape = .22 * cock + .46 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .56, .80, 1.4))
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .32 * (1 - cos(p * 2)) * .5 + .10
        elif clip == 'Breath':
            gape = .16 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            gape = .06 * (1 - cos(p))
        elif clip in ('Hit', 'Stagger'):
            gape = .24 * e
        elif clip == 'Death':
            gape = .22 * dead
        elif clip == 'Guard':
            gape = .03 * (1 - cos(p))
        elif clip == 'Lower':
            # The telegraph: the head comes down over the water and the jaws part.
            gape = .18 * lower
        elif snapside:
            gape = .18 + .30 * ramp(u, .10, .40, 1.4) * (1 - ramp(u, .52, .78, 2.0))
        elif clip == 'Retract':
            gape = .16 * (1 - back)
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.08 * gape
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the trunk. Armoured and stiff: it rolls and pitches, it does not undulate.
        body = pb['body']
        body.rotation_euler.z += .12 * turn
        body.rotation_euler.y += .14 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .30 * e
        if clip in ('Attack', 'Heavy', 'Ability'):
            body.location.y = .12 * cock - (.34 + .30 * lunge) * drive
            body.rotation_euler.x = .10 * cock - .09 * drive
        if clip == 'Bite':
            body.location.y = -.16 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.24 * e
            body.rotation_euler.z = .14 * e
        if clip == 'Guard':
            body.rotation_euler.x = .028 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .42 * e
            body.rotation_euler.z = -.38 * e
            body.location.x = .30 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .18 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .20 * e
            body.location.y = .10 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.16 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z = .07 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Grab':
            body.location.y = -.09 - .07 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        if clip == 'Crawl':
            # The high walk: the trunk is carried over the feet and rolls onto the shoulder that
            # is taking the weight.
            body.rotation_euler.y = .11 * sin(p)
            body.location.z = .012 * sin(p * 2)
        if clip == 'Lower':
            # Crouching over the bank: the shoulders drop and the whole animal comes forward.
            body.location.z = -.055 * lower
            body.location.y = -.07 * lower
            body.rotation_euler.x = .10 * lower
        if snapside:
            body.rotation_euler.z = -.14 * snapside * wind + .20 * snapside * whip
            body.location.y = -.10 * whip
            body.rotation_euler.x = .08 * whip
        if clip == 'Retract':
            body.location.z = -.055 * (1 - back)
            body.location.y = -.07 * (1 - back)
            body.rotation_euler.x = .10 * (1 - back)
        body.rotation_euler.y += 2.2 * dead
        body.rotation_euler.x += .14 * dead
        body.location.z -= .20 * dead

        # --- the axial chain
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            z = .105 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.026 + .005 * i)
            z += .042 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy', 'Ability') and n.startswith('tail'):
                # The lunge is the tail's: it cocks to one side and straightens through the drive.
                z += (.14 * cock - .18 * drive) * GAIN[i] * (1. + lunge)
            if clip == 'Dodge':
                z += .16 * e * sin(i * .55 + .6)
            if clip == 'Grab':
                z += .06 * GAIN[i] * haul * (1 if i > 5 else -.5)
            if snapside:
                # The head goes across on the wind-up and whips through; the tail counters, which
                # is what holds the animal on the bank instead of pivoting it off.
                # **Graded off the neck, not dumped on the shoulder.** Giving `chest` the same
                # 0.52 rad as `neck_00` put 30 degrees of yaw into one joint at the shoulder girdle
                # and `skin-tears.mjs` read 8.3x across the band behind it (640 edges on `thorax`).
                # A crocodilian head swing is carried by the neck and the front of the trunk
                # together.
                if n in ('neck_00', 'chest', 'thorax'):
                    g = {'neck_00': 1.0, 'chest': .55, 'thorax': .28}[n]
                    z += snapside * (-.34 * wind + .52 * whip) * g
                if n.startswith('tail'):
                    z += snapside * (.16 * wind - .22 * whip) * GAIN[i]
            q.rotation_euler.z += z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .042 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and n in ('neck_00', 'chest'):
                q.rotation_euler.x = -.18 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            if clip in ('Lower', 'Retract') and n in ('neck_00', 'chest'):
                q.rotation_euler.x = .30 * (lower if clip == 'Lower' else 1 - back)
        if clip in ('Attack', 'Heavy', 'Ability'):
            pb['skull'].rotation_euler.x += (-.14 * cock + .22 * drive)
            pb['neck_00'].rotation_euler.x += (-.10 * cock + .16 * drive)
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .10 * sin(p * 2)
            pb['neck_00'].rotation_euler.x += -.08 * sin(p * 2)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul
        if clip == 'Lower':
            pb['skull'].rotation_euler.x += .34 * lower
        if snapside:
            pb['skull'].rotation_euler.z += snapside * (-.26 * wind + .44 * whip)
            pb['skull'].rotation_euler.x += .18 * whip
        if clip == 'Retract':
            pb['skull'].rotation_euler.x += .34 * (1 - back)

        # --- the limbs
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            ph = p * beat - STROKE_LAG[key]
            stroke = sin(ph)
            recover = cos(ph)
            # **Crawl is where this animal's limbs do the work.** In the water the legs are swept
            # back along the flanks and kick on the beat; on land they carry it.
            reach = {'Crawl': .78, 'Sprint': .46, 'Swim': .30, 'Idle': .14, 'Breathe': .14,
                     'Eat': .16, 'Guard': .16, 'Grab': .16, 'Lower': .10, 'Retract': .12,
                     'SnapLeft': .26, 'SnapRight': .26}.get(clip, .20)
            gainf = 1.0 if kind == 'fore' else 1.10
            up.rotation_euler.z = s * reach * stroke * gainf
            up.rotation_euler.y = s * .34 * reach * recover * gainf
            up.rotation_euler.x = -.38 * reach * recover * gainf
            if clip in ('Swim', 'Sprint'):
                # Trailing: the whole limb is carried back against the flank and stays there.
                up.rotation_euler.z += s * .34
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .38 * e
            if clip in ('TurnLeft', 'TurnRight'):
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.z += d * .34 * e
                up.rotation_euler.y += d * .28 * e
            if clip in ('Attack', 'Heavy', 'Ability'):
                up.rotation_euler.z += s * (.24 * cock - .46 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if clip == 'Guard':
                up.rotation_euler.y += s * .22 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.y += s * .30 * e
            if clip == 'Dodge':
                up.rotation_euler.z += s * .52 * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.z += s * .30 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.z += s * .18 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.y += s * .20 + s * .10 * haul
            if clip == 'Growth':
                up.rotation_euler.y += s * .20 * e
            if clip == 'Lower':
                # Braced: the forelimbs take the weight as the head goes out over the water.
                up.rotation_euler.y += s * .22 * lower
                up.rotation_euler.z += s * (.18 if kind == 'fore' else -.14) * lower
            if snapside:
                up.rotation_euler.z += s * (.20 * wind - .30 * whip) * gainf
            if clip == 'Retract':
                up.rotation_euler.y += s * .22 * (1 - back)
                up.rotation_euler.z += s * (.18 if kind == 'fore' else -.14) * (1 - back)
            up.rotation_euler.z += s * .32 * dead
            up.rotation_euler.x += .26 * dead
            lag = sin(ph - .85)
            for j, share, feather, lagshare in ((1, .17, .46, .14), (2, .11, .30, .20)):
                pb[names[j]].rotation_euler.z = share * up.rotation_euler.z + s * lagshare * reach * lag
                pb[names[j]].rotation_euler.x = feather * up.rotation_euler.x

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
    pts = []
    for f in np.linspace(0, last, 13):
        scene.frame_set(int(f))
        dg = bpy.context.evaluated_depsgraph_get()
        for o in AUTH_GROUP + PUP_GROUP + oralparts:
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            co = np.array([v.co[:] for v in me.vertices])
            assert np.isfinite(co).all()
            pts.extend([co.min(0), co.max(0)])
            ev.to_mesh_clear()
    bounds[clip] = [np.array(pts).min(0).tolist(), np.array(pts).max(0).tolist()]
    rig.animation_data.action = None

for c in LOOPS:
    assert seams[c] < 1e-6, (c, seams[c])

limb_sweep = {}
for clip in ('Crawl', 'Sprint', 'Swim', 'SnapLeft', 'Idle'):
    rig.animation_data.action = bpy.data.actions[clip]
    last = round(CLIPS[clip] * 30)
    dirs = {k: [] for k in LIMB_NAMES}
    for f in range(0, last + 1, 2):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        for key, names in LIMB_NAMES.items():
            a = rig.matrix_world @ rig.pose.bones[names[0]].head
            b = rig.matrix_world @ rig.pose.bones[names[-1]].tail
            dirs[key].append((b - a).normalized())
    row = {}
    for key, ds in dirs.items():
        worst = 0.
        for i in range(len(ds)):
            for j in range(i + 1, len(ds)):
                worst = max(worst, ds[i].angle(ds[j]))
        row[LIMB_NAMES[key][0]] = round(math.degrees(worst), 2)
    limb_sweep[clip] = row
rig.animation_data.action = None
for key, names in LIMB_NAMES.items():
    # **Crawl is the locomotion, so Crawl is where the bar bites.** This is the era's "a limbed
    # swimmer's dash has to paddle" rule applied to the animal the codebase actually declares:
    # a shore animal, whose primary is the land gait. The swim set still has to show the limbs
    # working rather than frozen, which is the second figure.
    assert limb_sweep['Crawl'][names[0]] > 60., \
        ('a limb does not take a stride in Crawl', names[0], limb_sweep['Crawl'][names[0]])
    assert limb_sweep['Sprint'][names[0]] > 40., \
        ('a limb does not work in Sprint', names[0], limb_sweep['Sprint'][names[0]])
print('MYS_SWEEP', json.dumps(limb_sweep))
reset()
scene.frame_set(0)

# -------------------------------------------------------------------------- export ----
sockets = T.make_sockets(rig, anchors)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2) + '\n')

tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
for group, suffix in ((AUTH_GROUP, ''), (PUP_GROUP, '.puppet')):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, ID + suffix + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, **T.EXPORT_KWARGS)
    T.patch_glb(path, anchors)
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)
meta = {
    'id': ID, 'name': NAME, 'species': 'Mystriosuchus steinbergeri',
    'provenance': 'Late Triassic · Dachstein lagoon, Austria',
    'description': 'A marine phytosaur: crocodile-shaped but not a crocodile, with a long narrow '
                   'rostrum, a double row of dorsal osteoderms and a flattened sculling tail. '
                   'Authored Tripo body and measured procedural volume twin share one armature, '
                   'one set of inverse binds, one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 4.0, 'locomotion': 'Crawl',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/mystriosuchus.png',
                'tools/triassic/creatures/mystriosuchus/tripo-raw/mystriosuchus.raw.glb'],
    'notes': [
        'A SHORE ANIMAL (shore: true), which is the era\'s stated exception to "a playable '
        'Triassic animal swims": it is never playable, it stands at a post above the waterline '
        'and strikes into the water, and the land motion is its primary. locomotion is therefore '
        'Crawl, as it is for Tanystropheus, Macrocnemus and Coelophysis.',
        'Lower, SnapLeft, SnapRight and Retract are timed to the simulation\'s own clock rather '
        'than beside it: TELEGRAPH (1.5 s), the 0.6 s strike window and RECOVER (0.9 s) in '
        'src/sim/triassic/shore.ts. SnapLeft swings the head to the animal\'s left, which is the '
        'side sideOf() names.',
        'The swim set is authored and correct, but a crocodile-shaped ambusher sculls with its '
        'tail and holds its limbs back along its flanks — so the swept angle bar is met in Crawl, '
        'where this animal\'s limbs actually do the work, and the swim clips are measured rather '
        'than made to row.',
        'The mouth is painted, not modelled: the geometric method returns 87 hits spread over the '
        'whole depth of the head, which is the gular folds and the scute relief, not a slit. The '
        'painted line is read as a continuous curve under a raised jump penalty and the read stops '
        'short of the hinge, because at the jaw corner the fit climbs off the lip onto the '
        'gold/dark boundary above it. The seam is extrapolated from there on its own slope.',
        'The roll correction is 14.6 degrees, read off the countershading. On a body this '
        'symmetric no bounding box could have found it.',
        'The twin resurfaces a voxel occupancy field of the authored body, relaxes it and reduces '
        'the new topology. It reuses no source vertex or face.',
        'Living colours, soft tissues and movements are artistic reconstruction. World travel '
        'remains engine-owned.'],
}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2) + '\n')

profile_report = {
    'method': '21 exact plane-intersection envelopes of both actual meshes (body and mandible '
              'together); %.4f raw-space voxel occupancy resurfacing, relaxed and reduced' % VOXEL,
    'bodyLength': BODY_LENGTH,
    'envelopeTolerance': ENVELOPE_TOLERANCE, 'envelopeToleranceFractionOfBodyLength': .04,
    'maximumEnvelopeDifference': worst_envelope,
    'maximumEnvelopeDifferenceFractionOfBodyLength': worst_envelope / BODY_LENGTH,
    'surfaceDistanceMax': float(max(distances)),
    'surfaceDistanceMaxFractionOfBodyLength': float(max(distances)) / BODY_LENGTH,
    'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceDistanceP95FractionOfBodyLength': float(np.quantile(distances, .95)) / BODY_LENGTH,
    'anchorTolerance': ANCHOR_TOLERANCE, 'anchorSurfaceDistances': anchor_checks,
    'appendageRootSeatingRaw': LIMB_SEATING,
    'appendageRootSeatingFractionOfBodyLength':
        {k: v * SCALE / BODY_LENGTH for k, v in LIMB_SEATING.items()},
    'limbs': {k: {j: LIMBS[k][j] for j in
                  ('count', 'yRange', 'xRange', 'zRange', 'seat', 'reach', 'reachRadius')}
              for k in LIMBS},
    'otherThinPatches': [{k: v for k, v in c.items() if k != 'indices'} for c in other],
    'jawHingeSeatingRaw': JAW_SEATING,
    'stations': profile,
}
open(os.path.join(HERE, ID + '-profile.json'), 'w').write(json.dumps(profile_report, indent=2) + '\n')

report = {
    'intake': intake, 'sourceAlbedoSha256': albedo_sha,
    'frame': {k: v for k, v in frame.items() if k != 'perStation'},
    'frameStations': frame['perStation'],
    'centreline': centreline,
    'roughCentreline': rough_centreline,
    'centrelineMethod': 'measured twice: the kit\'s median-of-thick-vertices pass to find the limb '
                        'clusters, then the mid-range of the 4th and 96th percentiles over every '
                        'vertex that is not thin and not nearer a limb polyline than the rough axis',
    'limbVerticesExcludedFromTheAxis': int(LIMB_MASK.sum()),
    'measuredClusters': [{k: v for k, v in c.items() if k != 'indices'} for c in legs + other],
    'limbs': {k: {'seat': list(LIMB_PTS[k][0]), 'reach': list(LIMB_PTS[k][-1]),
                  'clusterRadius92': LIMB_RADIUS[k][0], 'clusterRadius995': LIMB_RADIUS[k][1]}
              for k in LIMB_NAMES},
    'limbBinding': {'method': 'Voronoi split against the body\'s own axial polyline',
                    'margin': LIMB_MARGIN, 'rootFade': LIMB_ROOT_FADE},
    'authoredTriangles': authored_tris, 'twinTriangles': puppet_tris,
    'twinTriangleFraction': puppet_tris / authored_tris,
    **twin_report,
    'bones': len(B), 'boneNames': list(B),
    'poseDeviation': POSE_DEVIATION, 'restTurning': REST_TURNING,
    'limbAsymmetry': LIMB_ASYMMETRY,
    'limbSweepDegrees': limb_sweep,
    'limbSweepMethod': 'the largest angle between any two directions the limb points over the '
                       'cycle, taken from the root joint to the tip joint in world space',
    'shoreClipTiming': {'Lower': TELEGRAPH, 'SnapLeft': STRIKE, 'SnapRight': STRIKE,
                        'Retract': RECOVER,
                        'source': 'TELEGRAPH, the strike window and RECOVER in '
                                  'src/sim/triassic/shore.ts'},
    'gapeMaximaRadians': {c: max(v) for c, v in gape_trace.items()},
    'mouthCutDeviation': {
        'cutFromMeasuredLineRaw': CUT_DEVIATION_RAW,
        'aStraightCutWouldHaveDeviatedRaw': RAMP_DEVIATION_RAW,
        'aStraightCutWouldHaveDeviatedOverLocalRadius': RAMP_DEVIATION_OVER_RADIUS},
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report, 'maxInfluences': max(influences),
    'meanInfluences': float(np.mean(influences)),
    'mouth': {
        'method': MOUTH_METHOD,
        'cavityVertices': int(len(CAV)), 'cavityZSpread': CAV_SPREAD,
        'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y, 'readBackY': READ_BACK,
        'paintedLineJumpPenalty': PAINTED_JUMP,
        'paintedLine': [[round(r['y'], 4), round(r['z'], 5), round(r['u'], 3),
                         round(r['disagreementOverRadius'], 3)] for r in PAINTED],
        'paintedLineRoughnessOverRadius': PAINTED_ROUGHNESS,
        'paintedLineFlankDisagreementMeanOverRadius': PAINTED_DISAGREEMENT_MEAN,
        'paintedLineFlankDisagreementMaxOverRadius': PAINTED_DISAGREEMENT,
        'seamExtrapolatedFrom': READ_BACK, 'seamExtrapolationSlope': float(_slope),
        'liningCoverage': mouth_cover, 'liningFitFactors': LINING_FIT,
        'toothPatches': tooth_report, 'toothPatchesStraddlingTheCut': straddling,
        'authoredToothRows': [], 'oralPartSeating': oral_seating,
    },
    'envelope': {k: profile_report[k] for k in
                 ('maximumEnvelopeDifference', 'maximumEnvelopeDifferenceFractionOfBodyLength',
                  'surfaceDistanceMax', 'surfaceDistanceP95', 'envelopeTolerance')},
    'anchors': anchor_checks,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True,
}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('MYS_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('MYS_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('MYS_ENVELOPE', json.dumps(report['envelope']))
print('MYS_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'cavityZSpread', 'hingeY',
       'paintedLineRoughnessOverRadius', 'paintedLineFlankDisagreementMeanOverRadius',
       'toothPatchesStraddlingTheCut')}))
print('MYS_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('MYS_OK')
