"""Rebuild Aphaneramma: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first — head at -Y, up +Z, one unit
long — and `export_yup` then puts the head at glTF +Z, where every shipped body in this repository
keeps it.

A trematosaur temnospondyl: a marine amphibian with a gharial's snout, four sprawling limbs with
long webbed digits, and a laterally flattened swimming tail carrying a fin. The research
(`docs/research/triassic-swimming.json`) calls it an *elongate anguilliform* swimmer with a
lateral-line-guided ambush and a sideways jaw swipe, so the clip set is built around a body wave
carried into the tail, with the limbs rowing on the same beat rather than hanging off it.

What was measured on this generation, rather than assumed:

  * **Which way it lies.** `preview-orientation.json` records an *estimated* yaw of 180 read off a
    fixed-axis render. Nothing here reads it. The long axis is the vertex cloud's first principal
    component, which lies **18.5 degrees** off the file's own Y; the roll comes from the
    countershading (harmonic strength 0.495, correction +3.7 degrees). The snout is the thin end,
    which is the half-width test the frame is told: 0.016 at the tip against 0.105 at the trunk.
  * **The mouth is painted, not modelled.** Placodus' geometric method (cast head vertex normals
    back into the mesh) returns 34 vertices over the whole front third at every gap from 0.02 to
    0.05, which is noise, not a slit. So the line is read off the albedo — and *not* by
    `albedo_mouth_line`'s walk up from the belly, which on this blotched flank disagrees between the
    two sides by a mean 0.61 of the local radius and wanders 0.29 of a radius between neighbouring
    stations. `tripo.painted_line` reads it as a continuous curve instead: mean disagreement 0.10,
    roughness 0.017. The **jump penalty had to be raised** from the kit's 1.2 to 3.0: at 1.2 the
    path let go of the lip over the last quarter of the head and slid down onto the gular fold
    (roughness 0.040, disagreement 0.14), which a render of the fitted line on the head is what
    showed. And the read stops short of the hinge — the jaw corner is where the mandible flares and
    every reading there is the fold under it — so the seam is **extrapolated** over the last
    0.037 of body from the slope of the stations that do read.
  * **The tail is the gentle case.** `meanCurvatureRadiusOverSection` over the tail chain is
    reported below; the calibration is Dinocephalosaurus, whose tail came out around 9 and
    straightened on the rig while its neck at 2.8 mean / 1.51 tightest had to be carried onto a new
    axis in the mesh first. Nothing here is unbent in the mesh.
  * **Sprawling limbs swing hard**, and that is where the skin tears. The kit's `limb_weights`
    radius is written for a steering paddle; this build does not use a radius at all but a
    **Voronoi split against the body's own axial polyline** — a vertex is the limb's where it is
    closer to the limb's bone chain than to the axis — which is the same lesson Henodus' 64.9x
    taught in a different shape: bound a limb against its own bone chain, never against a
    trunk-width constant.

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

ID = 'aphaneramma'
NAME = 'Aphaneramma'
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

# An anguilliform amphibian: long Swim and Sprint so the wave has room to travel, a short violent
# Ability because the side swipe is one sweep of that long jaw.
CLIPS = {'Idle': 3.0, 'Swim': 1.9, 'Sprint': 1.1, 'TurnLeft': 1.5, 'TurnRight': 1.5,
         'Dive': 1.3, 'Rise': 1.3, 'Attack': 0.9, 'Bite': .45, 'Heavy': 1.1, 'Hit': .6,
         'Death': 1.8, 'Guard': 1.2, 'Parry': .35, 'Dodge': .45, 'Eat': 1.5, 'Stagger': 1.1,
         'Ability': .8, 'Grab': 1.1, 'Breath': 2.2, 'Growth': 1.4, 'Breathe': 3.0, 'Crawl': 1.6}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe', 'Crawl']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(SOURCE if os.path.exists(SOURCE) else RAW, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(SOURCE if os.path.exists(SOURCE) else RAW, ROOT)
intake['rawGenerationSha256'] = hashlib.sha256(open(RAW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.62)
# The backstop behind the mouth lining: a single-sided skin turns the inside of an open mouth into
# a hole straight through the animal.
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
# Connectivity on the measured shell thickness finds six patches on this body: the four limbs, the
# flattened snout and the tail's own fin. The **tail is not a limb and the test that says so is its
# station span**, not its reach: the tail patch reaches 0.265 from the axis, further than three of
# the four limbs, and runs 0.35 of a body along it where no limb runs more than 0.09. A reach test
# alone -- which is what a body with paddles uses -- takes the tail for a fifth leg here.
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
print('APH_CLUSTERS', json.dumps(
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
# A modelled slit is a *thin* cluster of hits along the lip. What this generation returns is 34
# vertices spread over 0.20 of z -- the whole depth of the head -- which is the normals of the
# gular folds and the snout's own relief finding each other across a crease, not a mouth.
assert CAV_SPREAD > .12 or len(CAV) < 40, ('a modelled cavity turned up -- use it', len(CAV))
MOUTH_METHOD = ('painted line, read as a continuous curve under a raised jump penalty '
                '(the geometric method found no slit)')

HINGE_Y = float(Y0 + .258)
JAW_FRONT_Y = float(Y0 - .002)
MOUTH_FRONT_Y = float(Y0 + .012)
HEAD_BACK = float(Y0 + .290)
# Where the painted line still *is* a line. Behind this the mandible flares into the jaw corner and
# every per-station reading is the gular fold under it; the seam is extrapolated from here.
READ_BACK = float(Y0 + .225)
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


PAINTED = T.painted_line(auth, luminance_at, cz, head_half_depth, Y0 + .010, READ_BACK,
                         u_lo=-.95, u_hi=.10, stations=32, jump=PAINTED_JUMP)
assert len(PAINTED) >= 20, ('the painted mouth line did not read', len(PAINTED))
_py = np.array([r['y'] for r in PAINTED])
_pz = T.blur1d(np.array([r['z'] for r in PAINTED]), 1.2)
PAINTED_DISAGREEMENT = float(np.max([r['disagreementOverRadius'] for r in PAINTED]))
PAINTED_DISAGREEMENT_MEAN = float(np.mean([r['disagreementOverRadius'] for r in PAINTED]))
PAINTED_ROUGHNESS = float(np.mean(np.abs(np.diff([r['u'] for r in PAINTED]))))
assert PAINTED_ROUGHNESS < .04, ('the mouth line does not read as a line', PAINTED_ROUGHNESS)
assert PAINTED_DISAGREEMENT_MEAN < .18, ('the two flanks do not agree', PAINTED_DISAGREEMENT_MEAN)

# The extrapolation, from the slope of the last sixth of the read. A flat clamp (`np.interp`'s own
# behaviour past the end) would carry the lip level into a jaw corner that is plainly still
# descending, and put the cut through the mandible's rear rim.
_tail = _py > READ_BACK - (READ_BACK - (Y0 + .010)) / 6
_slope, _icept = np.polyfit(_py[_tail], _pz[_tail], 1)
_EXTRA_Y = np.linspace(READ_BACK, HEAD_BACK, 8)[1:]
_EXTRA_Z = _slope * _EXTRA_Y + _icept
_SEAM_Y = np.concatenate([_py, _EXTRA_Y])
_SEAM_Z = np.concatenate([_pz, _EXTRA_Z])


def seam(y):
    """The mouth line itself: the measured curve over the rostrum, extrapolated on its own slope
    into the jaw corner. A curve, so the cut is taken by shearing the head onto it."""
    return float(np.interp(y, _SEAM_Y, _SEAM_Z))


_ramp = np.polyfit(_py, _pz, 1)
_resid = _pz - np.polyval(_ramp, _py)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(head_half_depth(float(y)), 1e-4) for y in _py])))
CUT_DEVIATION_RAW = float(np.max(np.abs(np.array([r['z'] for r in PAINTED]) - _pz)))

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


# Birgeria's lesson: cast the mouth's section from the mouth's own axis rather than binning the
# flank over a band about the seam. The head here is one closed solid with the mouth painted on, so
# up and down can be cast as well as sideways.
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


# Temnospondyls have effectively no neck: one short joint carries the skull off the shoulder girdle.
NECK_Y = -.268
CHEST_Y, BODY_Y = -.190, .005
# **The biggest gap in an axial chain is where it tears.** With the first tail joint at 0.125 the
# step from `body` was 0.12 of a body against 0.055 between the tail's own joints -- and that gap is
# exactly where the pelvis is and where four limb bones stop owning skin. `skin-tears.mjs` read
# 4.54x there with 364 of the torn edges on `tail_00`. An eighth joint halves the gap.
TAIL_Y = [.070, .125, .180, .235, .290, .345, .400, .450]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
bone('neck_00', on_axis(NECK_Y), 'chest')
bone('skull', on_axis(HINGE_Y - .022), 'neck_00')
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .006), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.014)
    reach = Vector(c['reach'])
    names = ['%s_upper_%s' % (kind, s), '%s_lower_%s' % (kind, s), '%s_foot_%s' % (kind, s)]
    # Three joints, which is the anatomy: humerus/femur, radius+ulna/tibia+fibula, and the broad
    # webbed hand or foot. The foot carries a third of the limb because on this generation it is a
    # third of the limb -- the digits are long and the web between them is what the animal rows with.
    pts = [root, root + (reach - root) * .38, root + (reach - root) * .66, reach]
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
AXIAL_NAMES = ['skull', 'neck_00', 'chest', 'body'] + ['tail_%02d' % i for i in range(len(TAIL_Y))]
AXIAL_PTS = [Vector((cx(Y0 + .01), Y0 + .01, cz(Y0 + .01)))] + [B[n][0] for n in AXIAL_NAMES] \
    + [on_axis(Y1 - .004)]
AP, ACUM = T.polyline(AXIAL_PTS)
ASTATION = [(AXIAL_NAMES[i - 1], ACUM[i]) for i in range(1, len(AXIAL_NAMES) + 1)]
LIMB_FIT = {}
for key, pts in LIMB_PTS.items():
    P, cum = T.polyline(pts)
    LIMB_FIT[key] = (P, cum, LIMB_NAMES[key],
                     T.station_weights(ASTATION, T.project(AP, ACUM, P[0])[1]))

# **The limb is bounded against its own bone chain, not by a radius.** Rhaeticosaurus' flippers
# needed the 92nd percentile of the blade's own distances where the kit takes the 55th, and Henodus
# tore to 64.9x on a rig whose limb test was a trunk-width constant. A sprawling leg is worse than
# either: it is thick at the shoulder, thin at the wrist and broad again at the webbed hand, so no
# single radius describes it. What does describe it is a **Voronoi split**: a vertex is the limb's
# where it is nearer the limb's polyline than the body's axial one, blended over `LIMB_MARGIN` of a
# body either side of the tie, and faded out over the first `LIMB_ROOT_FADE` of the chain so the
# shoulder itself stays on the trunk. The measurement that says this is right is `skin-tears.mjs`,
# reported in the README.
LIMB_MARGIN = .042
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
            # radiating paddle spikes came from. Measured: 9.10x at the constant, 4.61x at the
            # fraction.
            chosen = (T.limb_chain(names, cum, s, blend=cum[-1] * .16), rootw,
                      min(1., s / cum[-1]))
    return (best, *chosen) if chosen else None


# The throat follows the jaw. The mandible is rigid on `jaw` and the skin behind the hinge rides
# the axial chain; with nothing blending between them a wide gape separates the two and the pale
# gular skin reads as a slab hanging off a detached jaw.
THROAT_SPAN = .060
THROAT_DROP = .16


def throat_jaw_share(q):
    a = T.smooth((q.y - (HINGE_Y - .016)) / .016)
    b = T.smooth(((HINGE_Y + THROAT_SPAN) - q.y) / THROAT_SPAN)
    c = T.smooth((seam(HINGE_Y) - q.z) / (THROAT_DROP * head_half_depth(HINGE_Y)) + 1.)
    return a * b * c


def weights(p):
    q = Vector(p)
    w = dict(T.station_weights(ASTATION, T.project(AP, ACUM, q)[1]))
    throat = throat_jaw_share(q)
    if throat > 0:
        w = {n: v * (1 - throat) for n, v in w.items()}
        w['jaw'] = w.get('jaw', 0.) + throat
    limb = limb_weights(q)
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
        [B[n][0] for n in ('skull', 'neck_00', 'chest', 'body')], _section_radius),
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
print('APH_POSE', json.dumps({k: {a: b for a, b in v.items() if a != 'perStation'}
                              for k, v in POSE_DEVIATION.items()}))
print('APH_TURN', json.dumps(REST_TURNING))
print('APH_ASYM', json.dumps(LIMB_ASYMMETRY.get('allPairs')))

# ------------------------------------------------------------------ procedural twin ----
puppet, puppet_thickness, twin_report, bvh_src = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', VOXEL, PUPPET_TRIANGLE_TARGET,
    sample_albedo, thin=THIN, band=.020, roughness=.66, blade_dilation=.0030)


# --------------------------------------------------------------------- cut the jaw ----
def is_jaw(c):
    return JAW_FRONT_Y - .004 < c.y < HINGE_Y and c.z < seam(c.y) - 1e-7


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

weight_report, influences = {}, []
for o in (auth, puppet):
    for n in B:
        o.vertex_groups.new(name=n)
    raw_weights = [weights(v.co) for v in o.data.vertices]
    relaxed = T.relax_weights(o, raw_weights, passes=8, hold=.48)
    counts, owners = [], {}
    for v in o.data.vertices:
        w = relaxed[v.index]
        counts.append(len(w))
        for n, value in w.items():
            o.vertex_groups[n].add([v.index], value, 'REPLACE')
            owners[n] = owners.get(n, 0) + 1
    influences.extend(counts)
    for v in o.data.vertices:
        v.co = tx(v.co)
    for p in o.data.polygons:
        p.use_smooth = True
    mod = o.modifiers.new('Shared articulated skeleton', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    weight_report[o.name] = {'maxInfluences': max(counts), 'vertices': len(counts),
                             'verticesPerBone': owners}
# **A joint that owns no skin is a silent defect** (`tools/triassic/idle-bones.mjs`), and it is
# checked here rather than only after packaging so a build cannot finish with one.
for name, rep in weight_report.items():
    idle = [n for n in B if n != 'root' and rep['verticesPerBone'].get(n, 0) == 0]
    assert not idle, ('these joints own no skin', name, idle)
for o in parts['lower jaw'].values():
    g = o.vertex_groups.new(name='jaw')
    g.add(list(range(len(o.data.vertices))), 1., 'REPLACE')
    for v in o.data.vertices:
        v.co = tx(v.co)
    for p in o.data.polygons:
        p.use_smooth = True
    mo = o.modifiers.new('Rigid mandible', 'ARMATURE')
    mo.object = rig
    o.parent = rig

# ------------------------------------------------------------ the mouth interior ----
mouth_mat = T.inward_material(NAME + ' mouth interior', (.32, .14, .12, 1))
# Not culled: a sac buried inside a head is never seen from outside whatever its winding, and
# culling it takes away the floor exactly when the mouth is open and something is looking up into it.
mouth_mat.use_backface_culling = False
MOUTH_BACK = HINGE_Y + .016
MOUTH_FRONT = MOUTH_FRONT_Y


def _raw_section(y):
    e = T.smooth((MOUTH_BACK - y) / .012) * T.smooth((y - MOUTH_FRONT) / .004)
    w = max(mouth_half_width(y) - .0004, .0012) * (.94 + .06 * e)
    h = max(min(head_half_depth(y) * .50, mouth_half_depth(y) * .60), .0030) * (.72 + .28 * e)
    return w, h


LINING_FIT = {}
LINING_POWER = 2.8


def mouth_section(y):
    """The raw section, unfitted -- the fitting is per vertex. A temnospondyl's skull is very flat
    and very wide, so its mouth's section is much further from an ellipse than a deep reptile head
    is: an ellipse at this aspect ratio narrows to nothing exactly where the mandible's rim reaches
    at full gape, and the gape then shows background down both sides of the jaw."""
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


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, lining_jaw_blend, mouth_mat,
                              rings=30, ring=24, centre_x=cx, power=LINING_POWER,
                              fit=fit_lining_point)
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

# The jaw hinge's own tissue: the corner where the mandible's rear rim, the throat and the lining
# all meet, which is the one place a gape can still open onto nothing.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.66)
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .004, cz(HINGE_Y))
HINGE_R = (half_width(HINGE_Y) * .92, .048, half_depth(HINGE_Y) * .98)
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
print('APH_HINGE', json.dumps({'fit': HINGE_FIT, 'r': list(HINGE_R), 'centre': list(HINGE_CENTRE)}))
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
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .04), HINGE_Y - .04, seam(HINGE_Y - .04)),
                            'swallow'),
    # **The blow this animal lands is its jaws.** Its light attack is a snap and its heavy and its
    # ability are both the sideways sweep of that long rostrum, so the bone that delivers the blow
    # is the skull -- it is the head itself that is swung, not a neck (there is barely one) and not
    # the tail.
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


# **An anguilliform wave, and four limbs rowing on the same beat.** The research gives this animal
# an elongate anguilliform swim, so the gain climbs monotonically from the shoulder to the tail tip
# and the lag spreads a full wavelength over the body. What the era's own rule adds is that a
# limbed swimmer's dash has to *paddle*: the limbs are not along for the ride here, they take a
# real rearward stroke in Swim and a harder one in Sprint, and the swept angle at each root is
# measured from the limb's own direction below rather than read off an Euler channel.
AXIAL_CHAIN = ['neck_00', 'chest', 'body'] + ['tail_%02d' % i for i in range(len(TAIL_Y))]
# **The ramp at the pelvis is where the skin tears, not the tail tip.** A first pass ran the gain
# 0.16 at the trunk and 0.34 at the first tail joint -- a doubling across one joint, right where the
# hind limbs hang off it -- and `skin-tears.mjs` read 5.45x with 397 of the torn edges on `tail_00`.
# A wave that grows smoothly grows just as far and tears a third less.
GAIN = [.18, .11, .15, .20, .29, .42, .57, .74, .92, 1.06, 1.16]
LAG = [0., .30, .75, 1.05, 1.40, 1.75, 2.10, 2.45, 2.80, 3.15, 3.50]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}
# A diagonal-couplet row: each limb is half a cycle out of phase with the one beside it and a
# quarter out with the one in front, which is what a sprawling tetrapod does in water and on land.
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

        amp = {'Idle': .16, 'Swim': 1.0, 'Sprint': 1.32, 'Eat': .26, 'Guard': .16, 'Grab': .24,
               'Breath': .28, 'Breathe': .22, 'Growth': .20, 'Dodge': 1.20, 'Crawl': .34,
               'Ability': .60}.get(clip, .24)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1., 'Crawl': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        drive = (ramp(u, .30, .48, 2.2) * (1 - ramp(u, .64, 1., 1.))
                 if clip in ('Attack', 'Heavy', 'Ability') else 0.)
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        # **Heavy and Ability are the side swipe, and they are not Attack with a bigger number.**
        # The animal's own kit calls the heavy a side swipe and its ability a sideways sweep of the
        # jaws; Attack is the forward snap. `sway` is what makes the difference measurable: the
        # snout goes across rather than forward, and the audit checks the lateral share.
        sway = {'Heavy': 1.0, 'Ability': 1.35}.get(clip, 0.)
        strike = {'Heavy': 1.35, 'Ability': 1.15}.get(clip, 1.0)
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws
        gape = .012 * (1 - cos(p)) * (1 if clip in ('Idle', 'Swim', 'Sprint') else 0)
        if clip == 'Bite':
            gape = .50 * ramp(u, .03, .17, 1.8) * (1 - ramp(u, .22, .38, 2.4))
        elif clip == 'Attack':
            gape = .22 * cock + .44 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            gape = .22 * cock + .46 * ramp(u, .24, .46, 1.7) * (1 - ramp(u, .52, .72, 1.4))
        elif clip == 'Ability':
            gape = .26 * cock + .45 * ramp(u, .20, .40, 1.6) * (1 - ramp(u, .58, .84, 1.4))
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .32 * (1 - cos(p * 2)) * .5 + .10
        elif clip == 'Breath':
            gape = .18 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            gape = .07 * (1 - cos(p))
        elif clip in ('Hit', 'Stagger'):
            gape = .26 * e
        elif clip == 'Death':
            gape = .22 * dead
        elif clip == 'Guard':
            gape = .03 * (1 - cos(p))
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.08 * gape
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the trunk
        body = pb['body']
        body.rotation_euler.z += .13 * turn
        body.rotation_euler.y += .16 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .30 * e
        if clip in ('Attack', 'Heavy', 'Ability'):
            body.location.y = .10 * cock - .40 * drive * strike
            body.rotation_euler.x = .08 * cock - .07 * drive
            body.rotation_euler.z += .16 * sway * (-.6 * cock + 1.0 * drive)
        if clip == 'Bite':
            body.location.y = -.16 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.26 * e
            body.rotation_euler.z = .16 * e
        if clip == 'Guard':
            body.rotation_euler.x = .030 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .46 * e
            body.rotation_euler.z = -.40 * e
            body.location.x = .32 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .20 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .22 * e
            body.location.y = .10 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.20 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z = .08 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Grab':
            body.location.y = -.09 - .07 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        if clip == 'Crawl':
            # Hauling out: the trunk rolls from side to side over the shoulder that is taking the
            # weight, which is what a sprawling gait looks like from above.
            body.rotation_euler.y = .10 * sin(p)
            body.location.z = -.02 + .012 * sin(p * 2)
        body.rotation_euler.y += 2.3 * dead
        body.rotation_euler.x += .15 * dead
        body.location.z -= .22 * dead

        # --- the axial wave. This is how the animal swims.
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            # **A per-joint angle that looks small sums down eleven joints.** At 0.105 rad per
            # unit of gain each tail joint turns at most seven degrees, which reads as nothing on
            # its own -- and the review renders showed the tail hooked through about 128 degrees at
            # the peak of the cruise stroke, over a rest curve of about 45. Halving it leaves the
            # wave plainly readable (the tip sweeps roughly 60 degrees over a cycle) and stops the
            # animal tying itself in a knot. Nothing else measured here saw it: travel, phase
            # ordering, amplitude growth and the tear sweep were all fine at the larger number,
            # which is why the sheet is rendered and looked at.
            z = .052 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.028 + .005 * i)
            z += .045 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy', 'Ability'):
                if n in ('neck_00', 'chest'):
                    z += (.22 * cock * -1. - .30 * drive) * sway
                if n.startswith('tail'):
                    # The tail braces the other way through the sweep, which is what stops the
                    # whole animal simply spinning about its middle.
                    z += .10 * sway * drive * GAIN[i]
            if clip == 'Dodge':
                z += .17 * e * sin(i * .55 + .6)
            if clip == 'Grab':
                z += .07 * GAIN[i] * haul * (1 if i > 5 else -.5)
            q.rotation_euler.z += z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .045 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and n in ('neck_00', 'chest'):
                q.rotation_euler.x = -.20 * (e if clip == 'Breath' else .5 + .5 * sin(p))
        if clip in ('Attack', 'Heavy', 'Ability'):
            pb['skull'].rotation_euler.x += (-.14 * cock + .20 * drive) * strike
            # **The swipe is the neck's as much as the head's.** A first pass put 0.84 rad of yaw
            # on `skull` alone in Ability and `skin-tears.mjs` read 4.92x across the head/neck
            # junction (129 torn edges on `neck_00`). One joint cannot carry a sweep this wide on a
            # skull a quarter of the body long; spread over the three joints behind it the snout
            # goes just as far across and the skin holds.
            pb['skull'].rotation_euler.z += (-.18 * cock + .34 * drive) * sway
            pb['neck_00'].rotation_euler.z += (-.12 * cock + .22 * drive) * sway
            pb['neck_00'].rotation_euler.x += (-.08 * cock + .12 * drive) * strike
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .12 * sin(p * 2)
            pb['neck_00'].rotation_euler.x += -.09 * sin(p * 2)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul

        # --- the limbs. A diagonal-couplet row, and it is a real stroke.
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            ph = p * beat - STROKE_LAG[key]
            stroke = sin(ph)
            recover = cos(ph)
            # How far the limb swings, per clip. It is the animal's reach and not the clip's
            # energy, so Sprint strokes harder rather than the same stroke faster.
            reach = {'Sprint': 1.00, 'Swim': .72, 'Crawl': .86, 'Idle': .16, 'Breathe': .18,
                     'Eat': .20, 'Guard': .18, 'Grab': .20}.get(clip, .24)
            gainf = 1.0 if kind == 'fore' else 1.08
            # The power stroke is backwards and downwards: `.z` sweeps the limb fore and aft about
            # the shoulder, `.y` lifts and lowers it, `.x` feathers the hand so it is edge-on
            # through the recovery and broadside through the drive.
            up.rotation_euler.z = s * reach * stroke * gainf
            up.rotation_euler.y = s * .34 * reach * recover * gainf
            up.rotation_euler.x = -.40 * reach * recover * gainf
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .42 * e
            if clip in ('TurnLeft', 'TurnRight'):
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.z += d * .38 * e
                up.rotation_euler.y += d * .30 * e
            if clip in ('Attack', 'Heavy', 'Ability'):
                up.rotation_euler.z += s * (.28 * cock - .40 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if clip == 'Guard':
                up.rotation_euler.y += s * .24 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.y += s * .34 * e
            if clip == 'Dodge':
                up.rotation_euler.z += s * .58 * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.z += s * .32 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.z += s * .20 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.y += s * .22 + s * .10 * haul
            if clip == 'Growth':
                up.rotation_euler.y += s * .22 * e
            up.rotation_euler.z += s * .36 * dead
            up.rotation_euler.x += .28 * dead
            # The elbow and the wrist lag the shoulder, so the hand closes on the drive and
            # feathers on the recovery rather than following the upper limb rigidly.
            lag = sin(ph - .85)
            for j, share, feather, lagshare in ((1, .18, .50, .16), (2, .12, .34, .22)):
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

# --- the swept angle at each limb root, measured from the limb's own direction.
# **Not read off an Euler channel.** A rotation written on one axis is a stroke on one body and a
# twist on another, depending on how the bone rests.
limb_sweep = {}
for clip in ('Swim', 'Sprint', 'Crawl', 'Idle'):
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
    assert limb_sweep['Sprint'][names[0]] > 60., \
        ('a limb does not take a stroke in Sprint', names[0], limb_sweep['Sprint'][names[0]])
    assert limb_sweep['Swim'][names[0]] > 45., \
        ('a limb does not take a stroke in Swim', names[0], limb_sweep['Swim'][names[0]])
print('APH_SWEEP', json.dumps(limb_sweep))
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
    'id': ID, 'name': NAME, 'species': 'Aphaneramma rostratum',
    'provenance': 'Early Triassic · Spitsbergen',
    'description': 'A trematosaur temnospondyl: a marine amphibian with a gharial\'s snout, four '
                   'sprawling webbed limbs and a flattened swimming tail. Authored Tripo body and '
                   'measured procedural volume twin share one armature, one set of inverse binds, '
                   'one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 1.6, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/aphaneramma.png',
                'tools/triassic/creatures/aphaneramma/tripo-raw/aphaneramma.raw.glb'],
    'notes': [
        'Swimming is the locomotion, as it is for every playable Triassic animal: the research '
        'gives this body an elongate anguilliform swim, so the axial gain climbs monotonically '
        'from the shoulder to the tail tip and the lag spreads a full wavelength over the body. '
        'Crawl is an extra clip beside that set, not the locomotion the rest is built on — the '
        'generation is posed for land because that is the pose that shows the animal.',
        'The limbs row on the same beat rather than hanging off it, in a diagonal couplet, and the '
        'swept angle at each limb root is measured from the limb\'s own direction (root joint to '
        'tip joint in world space) rather than read off an Euler channel. The build refuses a limb '
        'that sweeps under 60 degrees in Sprint or under 45 in Swim.',
        'The mouth is painted, not modelled: Placodus\' geometric method returns 34 scattered '
        'vertices over the whole front third, spread over the entire depth of the head, which is '
        'the gular folds finding each other and not a slit. The painted line is read as a '
        'continuous curve, and the jump penalty had to be raised from the kit\'s 1.2 to 3.0 — at '
        '1.2 the path let go of the lip over the last quarter of the head and followed the gular '
        'fold down. The seam is extrapolated over the last 0.037 of body on its own slope, because '
        'the jaw corner is where the mandible flares and no reading there is the lip.',
        'Heavy and Ability are the animal\'s side swipe — the sideways sweep of a long rostrum — '
        'rather than a bigger Attack, and the audit measures the lateral share of the snout\'s '
        'travel to say so.',
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
    'limbBinding': {'method': 'Voronoi split against the body\'s own axial polyline: a vertex is '
                              'the limb\'s where it is nearer the limb\'s bone chain than the '
                              'axis, blended over LIMB_MARGIN either side of the tie and faded '
                              'out over the first LIMB_ROOT_FADE of the chain',
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
print('APH_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('APH_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('APH_ENVELOPE', json.dumps(report['envelope']))
print('APH_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'cavityZSpread', 'hingeY',
       'paintedLineRoughnessOverRadius', 'paintedLineFlankDisagreementMeanOverRadius',
       'toothPatchesStraddlingTheCut')}))
print('APH_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('APH_OK')
