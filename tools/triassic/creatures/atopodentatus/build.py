"""Rebuild Atopodentatus: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first -- head at -Y, up +Z, one unit
long -- and `export_yup` then puts the head at glTF +Z, where every shipped body in this repository
keeps it.

**The frame is taken head-negative, and that is a measurement rather than a convention.** The
shared `measure_frame` takes the body's own first principal component and a builder says which end
of it the head is on; taken positive, this animal's hammerhead lands at +Y and its tail tip at -Y,
which is the mirror of every other body here. The T-bar is what settles it: over y -0.338 to -0.280
the section is 0.10 wide and 0.02 deep -- flat and broad, which nothing else on this animal is --
while the far end tapers to a half width of 0.007. The rostrum is the wide flat end.

The only thing in the sea that eats the sea floor: a T-bar rostrum with a comb of chisel teeth
along its front edge and a needle mesh behind it, four broad rowing paddles and a long tail. It is
a **rower**, not a flyer -- the paddles sweep fore and aft rather than up and down, which is the
opposite of Rhaeticosaurus' hydrofoil -- and the tail carries a real share of the cruise, so the
audit's locomotion checks are the other way round from that animal's.

Two things about this generation are worth knowing before reading the numbers:

  * **The mouth is modelled.** Placodus' geometric method (cast every head vertex's own outward
    normal back into the mesh) returns 634 cavity vertices at a 0.020 gap, running y -0.333 to
    -0.196, and the per-station profile is smooth enough to cut on directly. No albedo read is
    needed and none is used; `painted_line` is measured anyway and recorded beside it, because the
    two agreeing is worth having on file.
  * **The published preview is the source.** Its ventral fins were collapsed by `smooth-region.py`
    (1054 vertices, protrusion 0.1838 -> 0.0137, `docs/triassic/preview-mesh-defects.md`). The raw
    generation beside it is preserved and never changed.

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

ID = 'atopodentatus'
NAME = 'Atopodentatus'
SPECIES = 'A. unicus'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
SOURCE = os.path.join(HERE, ID + '.preview.glb')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 5.0
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH        # 4 % of body length, per the pipeline
ANCHOR_TOLERANCE = .02 * BODY_LENGTH          # 2 % of body length
SWALLOW_TOLERANCE = .05 * BODY_LENGTH
PUPPET_TRIANGLE_TARGET = 5600
VOXEL = .0040
THIN = .030

# A three-metre grazer. `Ability` is `scrapeSieve` and the roster gives it a 2.5 s **looping**
# duration, so it is authored as a held loop rather than a one-shot: the head goes down on the
# meadow and works along it for as long as the button is held.
CLIPS = {'Idle': 3.2, 'Swim': 2.0, 'Sprint': 1.2, 'TurnLeft': 1.8, 'TurnRight': 1.8,
         'Dive': 1.5, 'Rise': 1.5, 'Attack': 1.1, 'Bite': .55, 'Heavy': 1.3, 'Hit': .6,
         'Death': 2.0, 'Guard': 1.3, 'Parry': .4, 'Dodge': .55, 'Eat': 1.8, 'Stagger': 1.3,
         'Ability': 2.5, 'Grab': 1.1, 'Breath': 2.6, 'Growth': 1.5,
         'Breathe': 3.0, 'Graze': 2.5}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe', 'Ability', 'Graze']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(SOURCE, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(SOURCE, ROOT)
intake['rawGenerationSha256'] = hashlib.sha256(open(RAW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.62)
skin_material.use_backface_culling = False    # the backstop behind the mouth lining
frame = T.measure_frame(auth, head_is_positive_pca=False, luminance_at=luminance_at)
pigment = T.pigment_sampler(auth, sample_albedo)

raw_co = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(raw_co[:, 1].min()), float(raw_co[:, 1].max())

# The frame is only right if the wide flat end is the rostrum. Measured, not assumed.
def _section(y, half=.010):
    m = np.abs(raw_co[:, 1] - y) < half
    if m.sum() < 8:
        return 0., 0.
    q = raw_co[m]
    return (float(np.quantile(np.abs(q[:, 0] - np.median(q[:, 0])), .92)),
            float(np.quantile(np.abs(q[:, 2] - np.median(q[:, 2])), .92)))


FRONT_W, FRONT_D = _section(Y0 + .012)
BACK_W, BACK_D = _section(Y1 - .012)
FRAME_EVIDENCE = {'frontHalfWidth': FRONT_W, 'frontHalfDepth': FRONT_D,
                  'frontFlatness': FRONT_W / max(FRONT_D, 1e-6),
                  'backHalfWidth': BACK_W, 'backHalfDepth': BACK_D}
assert FRONT_W > 3 * FRONT_D and FRONT_W > 6 * BACK_W, \
    ('the head end of the frame is not the T-bar', FRAME_EVIDENCE)

bvh_auth0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh_auth0))
thin_mask = thickness < THIN
cx, cz, half_width, half_depth, centreline = T.measured_centreline(auth, thin_mask)


def on_axis(y, dz=0., dx=0.):
    return Vector((cx(y) + dx, y, cz(y) + dz))


# ---------------------------------------------------------------- the paddles, as measured ----
# Four broad rowing paddles, found by connectivity on the measured shell thickness. **The T-bar is
# thin too** -- 0.02 deep against 0.10 wide -- so it is the largest thin cluster on the animal by a
# factor of four, and a naive "thin means limb" test would rig the rostrum as a fifth flipper. The
# reach test separates them: the paddles stand 0.25 to 0.32 from the axis, the rostrum 0.12, and
# the rostrum straddles the midline where a paddle does not.
clusters = T.thin_clusters(auth, thin_mask, cx, cz)
blades, other = [], []
for c in clusters:
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    lateral = abs(c['centroid'][0] - cx(mid))
    (blades if (c['reachRadius'] > .18 and lateral > .05) else other).append(c)
if len(blades) != 4:
    print('ATOPO_CLUSTERS', json.dumps(
        {'yRange': [Y0, Y1], 'thin': int(thin_mask.sum()),
         'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters]}))
assert len(blades) == 4, ('four paddles did not measure', len(blades))
blades.sort(key=lambda c: (c['yRange'][0] + c['yRange'][1]) / 2)
LIMBS = {}
for i, c in enumerate(blades):
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    LIMBS[('fore' if i < 2 else 'hind') + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
assert sorted(LIMBS) == ['foreL', 'foreR', 'hindL', 'hindR'], sorted(LIMBS)

depth, bvh_auth = T.depth_probe(auth)

# **The kit's centreline is the median of the *thick* vertices, and on a sprawling quadruped that
# is wrong**: a leg is thick, so the median is dragged into the armpit and the axis can leave the
# skin altogether. Odontochelys is that case and carries a measured interior axis instead. This
# animal is not -- its four paddles are blades and the thin mask takes them out -- but "not that
# case" is a measurement rather than an assumption, so the axis is checked along its whole length.
# The reading has to be **parity**, not the signed depth probe: this generation models its mouth,
# and the axis runs straight down the lumen over the front sixth of the animal, where the nearest
# surface to it is the lumen wall and the probe's sign is therefore backwards. Taken that way the
# axis reads 0.0054 *outside* the animal at the rostrum -- which is the mouth, not a fault.
def _parity_inside(p, tries=((1., 0., 0.), (0., 0., 1.), (.577, .577, .577))):
    votes = 0
    for d in tries:
        crossings, cursor = 0, Vector(p)
        dv = Vector(d).normalized()
        for _ in range(48):
            hit = bvh_auth.ray_cast(cursor, dv, 3.)
            if hit[0] is None:
                break
            crossings += 1
            cursor = Vector(hit[0]) + dv * 1e-5
        votes += crossings % 2
    return votes >= 2


AXIS_DEPTH = []
for _y in np.linspace(Y0 + .02, Y1 - .02, 60):
    _p = Vector((cx(float(_y)), float(_y), cz(float(_y))))
    AXIS_DEPTH.append([round(float(_y), 4),
                       round(float(bvh_auth.find_nearest(_p)[3]) * (1 if _parity_inside(_p) else -1),
                             5)])
# Judged **behind the mouth and in front of the tail tip**. The three stations in front of y -0.27
# read -0.0054, -0.0047 and -0.0028, and all three are inside the measured lumen: on a body whose
# mouth is modelled the axis runs down the mouth over the front sixth, and a pocket in a closed
# shell is exterior space to a parity test. At the other end the animal simply becomes a thread.
AXIS_JUDGED = [v for y, v in AXIS_DEPTH if -.194 < y < .602]
AXIS_DEPTH_MIN = float(min(AXIS_JUDGED))
print('ATOPO_AXIS', json.dumps({'worstBehindTheMouth': AXIS_DEPTH_MIN, 'perStation': AXIS_DEPTH}))
assert AXIS_DEPTH_MIN > .008, ('the measured centreline leaves the animal', AXIS_DEPTH_MIN,
                               AXIS_DEPTH)

# --------------------------------------------------------------------- measure the mouth ----
# **Placodus' geometric method reaches this animal**, which makes it the easy case of the three the
# pipeline records: a modelled slit with an interior, 634 vertices at a 0.020 gap. The seam is the
# cavity's own mid height per station, which is a curve and is cut as one.
MOUTH_GAP = .020
CAV = T.mouth_cavity(auth, front_fraction=.34, gap=MOUTH_GAP)
assert len(CAV) > 200, ('the modelled mouth did not measure', len(CAV))
MOUTH_METHOD = 'modelled cavity, measured by casting head vertex normals back into the mesh'

# The cavity runs to y -0.196, but its last few stations climb steeply (seam 0.024 -> 0.041 over
# 0.03 of the body) while its half width collapses to 0.016: that is the detector following the
# narrowing groove at the corner of the mouth up onto the cheek, not the lip. The seam is fitted
# over the stations where the mouth is actually a mouth and continued linearly behind them.
CAV_Y, CAV_MID, CAV_WIDE, CAV_TALL = T.cavity_profile(CAV, Y0 + .004, Y0 + .30, .006, .006)
assert len(CAV_Y) >= 16, ('the cavity profile is too short to cut on', len(CAV_Y))
HINGE_Y = float(Y0 + .124)              # y = -0.214, where the measured mouth still has a lumen
JAW_FRONT_Y = float(Y0 - .002)          # in front of the animal: the mandible gets no front cut
MOUTH_FRONT_Y = float(Y0 + .006)
HEAD_BACK = float(Y0 + .230)
_fit = CAV_Y <= HINGE_Y + .004
assert _fit.sum() >= 12, ('too little measured mouth in front of the hinge', int(_fit.sum()))
_sy = CAV_Y[_fit]
_sz = T.blur1d(CAV_MID[_fit], 1.2)
_sw = T.blur1d(CAV_WIDE[_fit], 1.4)
_st = T.blur1d(CAV_TALL[_fit], 1.4)
CAVITY_ROUGHNESS = float(np.mean(np.abs(np.diff(_sz)) /
                                 np.array([max(half_depth(float(y)), 1e-4) for y in _sy[1:]])))
assert CAVITY_ROUGHNESS < .06, ('the measured mouth line does not read as a line', CAVITY_ROUGHNESS)


def seam(y):
    """The mouth line itself, lightly smoothed. Held flat in front of the first measured station
    and continued on the last station's own slope behind it, so the shear that takes the cut has a
    defined value everywhere the bisector reaches."""
    return float(np.interp(y, _sy, _sz))


# What a straight cut would have cost, recorded beside the curve that is used.
_ramp = np.polyfit(_sy, _sz, 1)
_resid = _sz - np.polyval(_ramp, _sy)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(half_depth(float(y)), 1e-4) for y in _sy])))
CUT_DEVIATION_RAW = float(np.max(np.abs(CAV_MID[_fit] - _sz)))

# The albedo read is taken as well, purely as a second opinion on a body that did not need one.
try:
    PAINTED = T.painted_line(auth, luminance_at, cz, half_depth, Y0 + .006, HINGE_Y,
                             u_lo=-.95, u_hi=.15, stations=24)
    PAINTED_AGREEMENT = float(np.mean([abs(r['z'] - seam(r['y']))
                                       / max(half_depth(r['y']), 1e-4) for r in PAINTED]))
except Exception as exc:                                                 # noqa: BLE001
    PAINTED, PAINTED_AGREEMENT = [], None
    print('ATOPO_PAINTED_FAILED', repr(exc))

# What relief the generated rostrum carries -- the tooth comb -- recorded rather than added to.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0020)

# The centreline table is 61 stations over a whole body and too coarse for a head this flat, so the
# head gets its own fine profile.
_HY = np.linspace(Y0 + .002, HINGE_Y + .04, 48)
_HW, _HD, _HOUT, _HZLO, _HZHI = [], [], [], [], []
for _y in _HY:
    _m = np.abs(raw_co[:, 1] - _y) < .005
    if _m.sum() < 6:
        for _t in (_HW, _HD, _HOUT, _HZLO, _HZHI):
            _t.append(_t[-1] if _t else .002)
        continue
    _q = raw_co[_m]
    _HW.append(float(np.quantile(np.abs(_q[:, 0] - cx(_y)), .90)))
    _HD.append(float(np.quantile(np.abs(_q[:, 2] - cz(_y)), .90)))
    # The **outer** silhouette of the head at this station, which is what the lining has to stay
    # inside. The quantiles above describe the bulk of the section and are the right measure for a
    # rig; the extremes are the right measure for containment.
    _HOUT.append(float(np.abs(_q[:, 0] - cx(_y)).max()))
    _HZLO.append(float(_q[:, 2].min()))
    _HZHI.append(float(_q[:, 2].max()))
_HW, _HD = np.array(_HW), np.array(_HD)
_HOUT, _HZLO, _HZHI = np.array(_HOUT), np.array(_HZLO), np.array(_HZHI)


def head_half_width(y):
    return float(np.interp(y, _HY, _HW))


def head_half_depth(y):
    return float(np.interp(y, _HY, _HD))


def head_outer_width(y):
    return float(np.interp(y, _HY, _HOUT))


def head_z_range(y):
    return float(np.interp(y, _HY, _HZLO)), float(np.interp(y, _HY, _HZHI))


# **The head's own section must exclude anything that is not the head.** `head_half_depth` is what
# the lining is sized in units of and what the seam is judged against, so one station that reads a
# limb reaching under the jaw puts the mouth line out through the top of the skull. Nothing reaches
# this head -- the nearest paddle starts 0.08 behind the last head station -- and the check says so
# rather than the build assuming it.
assert _HD.max() < 3. * float(np.median(_HD)), \
    ('the head section is reading something that is not the head',
     float(_HD.max()), float(np.median(_HD)))
# And the seam itself must stay inside the animal.
SEAM_MARGIN = []
for _y in _sy:
    _zl, _zh = head_z_range(float(_y))
    SEAM_MARGIN.append(min(seam(float(_y)) - _zl, _zh - seam(float(_y))))
SEAM_MARGIN_MIN = float(min(SEAM_MARGIN))
assert SEAM_MARGIN_MIN > .002, ('the mouth line leaves the head', SEAM_MARGIN_MIN)


def mouth_half_width(y):
    return float(np.interp(y, _sy, _sw))


def mouth_half_height(y):
    return float(np.interp(y, _sy, _st))


# **How wide the head is at the mouth's own height**, which is not the same as how wide the head is.
# A section's maximum half width is reached at whatever height the section happens to be widest, and
# using that as the bound on the lining let the sac out to 0.067 at the corner of the mouth against a
# measured section maximum of 0.071 -- and a superellipse's corner then stood proud of the cheek.
# Measured from the vertex cloud in a band about the seam rather than cast: a lateral ray from the
# mouth's axis is the obvious instrument and is what Rhaeticosaurus uses, but that head has no
# modelled mouth. Here the lumen is real and carries a comb of needle teeth standing in it, and the
# ray stops on the first one -- at y -0.273 it returned 0.009 for a mouth measured 0.088 wide, which
# is a tooth and not the cheek.
_MW = []
for _y in _HY:
    _yv = float(_y)
    _m = (np.abs(raw_co[:, 1] - _yv) < .005) & (np.abs(raw_co[:, 2] - seam(_yv)) < .008)
    _MW.append(float(np.abs(raw_co[_m, 0] - cx(_yv)).max()) if _m.sum() >= 4
               else (_MW[-1] if _MW else .01))
_MW = np.array(_MW)


def head_half_width_at_the_mouth(y):
    return float(np.interp(y, _HY, _MW))


# **Containment is a silhouette test, and it has to be, because nothing else works on this head.**
# Three instruments were tried and two of them cannot answer the question at all:
#
#   * the signed **depth probe** reads a point in the mouth's lumen as outside the animal, because
#     the nearest surface to it is the lumen wall and that wall's normal points at it. Birgeria
#     records this; here it makes every correctly placed lining vertex read as a fault.
#   * **ray parity** fails for the same reason one level down: the modelled mouth is a *pocket* in
#     a closed shell, so the lumen is genuinely exterior space and a ray from it crosses an odd
#     number of faces exactly as a ray from outside the cheek does. 302 of 780 lining vertices
#     read as outside, and they were the mouth.
#   * the **section hull** does answer it. A mouth lumen is inside the convex hull of the head's
#     own section at its station; a vertex that has come out through the cheek is not. That is the
#     shape of the question, and the hull of a bar-shaped section is tight enough to be a real
#     bound.
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
    _m = np.abs(raw_co[:, 1] - float(_y)) < .006
    _HULLS[_i] = _hull(raw_co[_m][:, [0, 2]]) if _m.sum() >= 6 else []


def _hull_clearance(p):
    """How far inside the head's own section hull p is, at the nearest measured station. Negative
    means it has left the head."""
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
        # counter-clockwise hull: inside is to the left of every edge
        worst = min(worst, ((p.x - a[0]) * ez - (p.z - a[1]) * ex) / -L)
    return worst


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


# **Shoulder-ward first, skull-ward last**, because the axial polyline is assembled as
# `skull` + the neck reversed + `chest`, and a list in the other order makes that polyline zigzag:
# skull -0.232, neck -0.115, neck -0.165, chest -0.055 is not a path along an animal, and every
# arc-length weight taken along it is measured on a fold. Three joints rather than two, because the
# hammer sweep is a large rotation over a short neck and `skin-tears.mjs` read 6.21x across the band
# between two of them; spread over three, the angle each one carries drops by a third.
NECK_Y = [-.095, -.135, -.175]           # shoulder to base of skull; a short neck, as drawn
CHEST_Y, BODY_Y = -.055, .080
TAIL_Y = [.215, .285, .355, .430, .510, .590]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
for i, y in enumerate(NECK_Y):
    bone('neck_%02d' % i, on_axis(y), 'chest' if i == 0 else 'neck_%02d' % (i - 1))
bone('skull', on_axis(HINGE_Y - .018), 'neck_%02d' % (len(NECK_Y) - 1))
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .006), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.016)
    reach = Vector(c['reach'])
    names = ['%s_upper_%s' % (kind, s), '%s_mid_%s' % (kind, s), '%s_outer_%s' % (kind, s),
             '%s_tip_%s' % (kind, s)]
    # Four joints in a paddle, for the reason Rhaeticosaurus' blades have four: a limb that sweeps
    # a real arc on three joints puts a third of that arc across each band between them, and the
    # tear sweep reads it. Spread over four, the angle per joint drops and the paddle bends as a
    # curve rather than as a hinge.
    pts = [root, root + (reach - root) * .30, root + (reach - root) * .55,
           root + (reach - root) * .78, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    parent = 'chest' if kind == 'fore' else 'tail_00'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .012, ('a paddle root is not seated inside the trunk', n, d)
JAW_SEATING = depth(B['jaw'][0])
assert JAW_SEATING > .003, ('the jaw hinge is not seated inside the head', JAW_SEATING)

# ------------------------------------------------------------ skinning by arc length ----
AXIAL_NAMES = ['skull'] + ['neck_%02d' % i for i in reversed(range(len(NECK_Y)))] \
    + ['chest', 'body'] + ['tail_%02d' % i for i in range(len(TAIL_Y))]
AXIAL_PTS = [Vector((cx(Y0 + .01), Y0 + .01, cz(Y0 + .01)))] + [B[n][0] for n in AXIAL_NAMES] \
    + [on_axis(Y1 - .004)]
AP, ACUM = T.polyline(AXIAL_PTS)
ASTATION = [(AXIAL_NAMES[i - 1], ACUM[i]) for i in range(1, len(AXIAL_NAMES) + 1)]
LIMB_FIT = {}
for key, pts in LIMB_PTS.items():
    P, cum = T.polyline(pts)
    LIMB_FIT[key] = (P, cum, LIMB_NAMES[key], T.station_weights(ASTATION, T.project(AP, ACUM, P[0])[1]))
# **A copied rig is a starting point to be re-measured, never a transplant.** The radius inside
# which a vertex is wholly the limb's is taken from the paddle's own distance distribution, at the
# 92nd percentile Rhaeticosaurus had to move it to: a broad blade left on the kit's 55th percentile
# carries trunk weight right out to its rim, and the rim is what tears when it strokes.
# **A limb's inter-joint blend is a fraction of that limb's own length, not a number.**
# Rhaeticosaurus' 0.050 is 0.16 of a flipper that reaches 0.30 from the axis; copied as a *number*
# onto a shorter chain it is more than a whole segment wide, every vertex then carries all four
# joints at nearly equal weight, that busts the four-influence budget, and the relaxation trims a
# different four on neighbouring vertices -- which is Cartorhynchus' radiating spikes.
BLEND_FRACTION = .16
LIMB_BLEND = {}
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    LIMB_RADIUS[key] = (float(np.quantile(d, .92)), float(np.quantile(d, .995)) + .025)
    LIMB_BLEND[key] = BLEND_FRACTION * cum[-1]


def limb_weights(q):
    best, chosen = 0., None
    for key, (P, cum, names, rootw) in LIMB_FIT.items():
        dist, s = T.project(P, cum, q)
        rin, rout = LIMB_RADIUS[key]
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else T.smooth(1 - (dist - rin) / (rout - rin)))
        alpha *= T.smooth(s / max(cum[1] * .75, 1e-6))
        if alpha > best:
            best = alpha
            chosen = (T.limb_chain(names, cum, s, blend=LIMB_BLEND[key]), rootw,
                      min(1., s / cum[-1]))
    return (best, *chosen) if chosen else None


# The throat follows the jaw. The mandible is rigid on `jaw` and the skin behind the hinge rides
# the axial chain, and with nothing blending between them a wide gape separates the two: the pale
# gular skin reads as a slab hanging off a detached jaw, and under a single-sided material the
# wedge is a hole straight through the animal. Full at the mouth line and full at the cut plane,
# not half of either.
THROAT_SPAN = .055
THROAT_DROP = .14


def throat_jaw_share(q):
    a = T.smooth((q.y - (HINGE_Y - .014)) / .014)
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
    'neckAndHead': T.curvature_over_section(
        [B[n][0] for n in ['skull'] + ['neck_%02d' % i for i in reversed(range(len(NECK_Y)))]
         + ['chest']], _section_radius),
    'tail': T.curvature_over_section(
        [B[n][0] for n in AXIAL_NAMES if n.startswith('tail_')], _section_radius),
}
LIMB_ASYMMETRY = T.limb_asymmetry(LIMB_PTS, cx, 1.)

# ------------------------------------------------------------------ procedural twin ----
puppet, puppet_thickness, twin_report, bvh_src = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', VOXEL, PUPPET_TRIANGLE_TARGET,
    sample_albedo, thin=THIN, band=.020, roughness=.66, blade_dilation=.0032)

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
    relaxed = T.relax_weights(o, raw_weights, passes=4, hold=.45)
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
# One closed skinned sac, wound inwards and **not** backface culled: a sac buried inside a head is
# never seen from outside whatever its winding, because the skin is in front of it, so culling it
# buys nothing and costs the one thing it exists for -- from below, looking up into an open mouth,
# the floor is backfacing and a cull takes it away.
#
# **Darker and rougher than the era's standard lining, because this mouth is seen from outside at
# rest and none of the others are.** Every previous body's lining is hidden behind a shut lip and
# only ever lit from inside an open mouth, where (0.30, 0.13, 0.115) at roughness 0.62 reads as a
# dusty pink mouth. This generation's rostrum carries a comb of separate needle teeth with real
# gaps between them, so at Idle the interior is *front lit through the fence* -- and the standard
# colour read as a pink sausage lying along the bar. The raw generation shows the same slot as a
# dark line, which is what a mouth behind a sieve of teeth looks like.
mouth_mat = T.inward_material(NAME + ' mouth interior', (.15, .062, .055, 1), roughness=.82)
mouth_mat.use_backface_culling = False
MOUTH_BACK = HINGE_Y + .026
MOUTH_FRONT = MOUTH_FRONT_Y

LINING_FIT = {}
LINING_POWER = 2.6      # a flat slot rather than an ellipse, but not a box: at 3.2 the
                        # section's corners stand nearly as far out as its axes do, and on a
                        # head this thin that is what reaches the cheek first.


def mouth_section(y):
    """The lining's half width and half height at station y.

    **Sized from the measured cavity, never fitted per vertex.** Where a mouth is modelled, a point
    in the lumen is *outside* the closed shell, so the depth probe reads backwards there and a fit
    that pulls a vertex 'back inside the skin' pushes it out through the cheek instead. This is the
    case Birgeria records; Rhaeticosaurus is the other one, where nothing is modelled and a fit is
    the only way to size the sac.
    """
    e = T.smooth((MOUTH_BACK - y) / .012) * T.smooth((y - MOUTH_FRONT) / .004)
    # A hair inside the measured lumen so the sac's wall sits in the flesh rather than stippling
    # against the skin's own cut edge, and floored so the tube does not become a thread at the
    # front of a rostrum that narrows to nothing.
    #
    # **And clamped to the head's own outer silhouette, which on this animal is the binding
    # constraint at the front.** `cavity_profile`'s `wide` is the spread of the measured cavity
    # points and those sit on both *lips*, so across a T-bar it is the span of the lip line: 0.108
    # against a rostrum whose widest vertex at the same station is 0.096 from the axis. Unclamped,
    # the sac came out through both corners of the hammer by 0.023 of a body length. This is the
    # same trap Birgeria records, in the shape a hammerhead gives it.
    zlo, zhi = head_z_range(y)
    room = min(zhi - seam(y), seam(y) - zlo)
    # **Set back from the palate along the comb, full size at the corner**, and the split is what
    # this animal needs. At 1.05 of the measured cavity the sac filled the slit exactly, so every
    # interdental gap in the needle comb was a window onto it and the shut mouth read as a pink
    # sausage along the bar. Taken down to 0.78 *everywhere* it left the corner of the mouth --
    # where the mandible's rear rim, the throat and the sac all meet -- 26 pixels open at full
    # gape, which is the one place a lining may not be small. `front` is 1 along the comb and 0 at
    # the corner, so the sac is pulled off the teeth in front and left at full section behind.
    front = T.smooth(((HINGE_Y - .045) - y) / .045)
    back = 1. - front
    w = max(min(mouth_half_width(y) * (.88 + .06 * back),
                head_half_width_at_the_mouth(y) - .008,
                head_outer_width(y) - .008), .0018) * (.92 + .08 * e)
    h = max(min(mouth_half_height(y) * (.78 + .30 * back),
                head_half_depth(y) * (.38 + .16 * back), room * (.50 + .06 * back)), .0022) \
        * (.76 + .24 * e)
    LINING_FIT[round(float(y), 5)] = [round(w, 5), round(h, 5)]
    return w, h


def fit_lining_point(p, y):
    """Pull one ring vertex radially in until it is inside the head's own section hull.

    **A per-vertex fit, and against the hull rather than against the depth probe.** Rhaeticosaurus
    established why the fit has to be per vertex -- shrinking a whole ring by one factor couples its
    width to its height, and on a deep head that is a hole -- and said in the same breath that a
    generation with a *modelled* mouth may be sized but never fitted, because the probe it used
    reads backwards in a lumen. Both halves of that are right; what is wrong is treating the probe
    as the only instrument. The section hull is not fooled by a pocket, so this body gets the per
    vertex fit after all, on a reading that works where the mouth is modelled.
    """
    c = Vector((cx(y), y, seam(y)))
    d = Vector(p) - c
    for k in range(14):
        q = c + d * (1. - k * .035)
        if _hull_clearance(q) > .0025:
            return q
    # Clamped: a vertex allowed to collapse towards the axis crosses its neighbours, the quad
    # between them inverts, and the tube's surface faces away from the camera right where the mouth
    # is widest open.
    return c + d * .545


def lining_jaw_blend(p):
    """Steep, and centred above the lip rather than on it: centred on the seam the ring's equator
    takes half the jaw's rotation while the mandible's cut rim takes all of it, so the rim ends up
    below the lining's widest point and a wedge opens between them. Everything at and below the
    mouth line follows the mandible outright; the stretch is carried by the band above it, inside
    the mouth where nothing can see it."""
    _w, h = mouth_section(p.y)
    return T.smooth(.5 + 1.6 * ((seam(p.y) + .45 * h) - p.z) / max(h, 1e-6))


# The closed-mouth lumen understates the head volume that each rigid oral shell must fill.
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
                              rings=30, ring=26, centre_x=cx, power=LINING_POWER,
                              fit=fit_lining_point, room=mouth_room)
oralparts = [lining]
mouth_cover = []
for _y in np.linspace(MOUTH_FRONT + .004, MOUTH_BACK - .010, 20):
    y = float(_y)
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(mouth_half_width(y), 1e-9), 3),
                        round(h / max(head_half_depth(y), 1e-9), 3)])
    if y > MOUTH_FRONT + .020:
        assert w >= mouth_half_width(y) * .45, \
            ('the oral lining is narrower than the mouth', y, w, mouth_half_width(y))
    assert h >= .0012, ('the oral lining is flat', y, h)

# **No authored dentition.** The generation carries its own comb along the rostrum's front edge and
# the only thing this build does about the teeth is check that the measured cut does not saw
# through one, which is the fault Placodus shipped.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.66)
# The corner of the mouth is where the mandible's rear rim, the throat and the lining all meet, and
# the wedge between them is what opens at full gape. A seated envelope on the head's own section,
# weighted to the mandible below the mouth line and to the skull above it, closes it.
#
# **Sized off the head's own fine profile, not off the centreline table.** That table is 61
# stations over a whole body with a 0.012 band, and behind a rostrum this narrow it is reading the
# cheek and the neck together: it gave a half width of 0.053 where the head measures 0.055 and a
# half depth of 0.036 against 0.0355, and with a 0.044 half length in y the envelope would not seat
# past a fifth of its size.
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .004, cz(HINGE_Y))
HINGE_R = (head_half_width(HINGE_Y) * .95, .030, head_half_depth(HINGE_Y) * .95)
HINGE_FIT = 0.


def _in_head(q):
    # Clearance inside the head's own silhouette at q's station, the smaller of the two axes.
    #
    # **Seated against the silhouette, not against the signed depth probe**, for the same reason
    # the lining is: the probe's nearest surface to a point beside an open slit is the *lumen
    # wall*, whose normal points at it, so a point in solid flesh reads as outside the animal.
    # Sized that way this envelope fitted to only half its radius -- 0.025 against a head half
    # width of 0.055 -- and so stopped well short of the sides, which is exactly where the corner
    # of the mouth is. `gape-solid.py` then saw a 20-pixel sliver of backdrop at that corner in
    # three clips out of four, and no change to the lining moved it, because it was never the
    # lining.
    zlo, zhi = head_z_range(float(q.y))
    return min(head_outer_width(float(q.y)) - abs(q.x - cx(float(q.y))), q.z - zlo, zhi - q.z)


for step in range(24):
    k = 1. - step / 24
    probe = [Vector((HINGE_CENTRE[0] + HINGE_R[0] * k * math.sin(b) * math.cos(a),
                     HINGE_CENTRE[1] + HINGE_R[1] * k * math.sin(b) * math.sin(a),
                     HINGE_CENTRE[2] + HINGE_R[2] * k * math.cos(b)))
             for a in np.linspace(0, 2 * pi, 20) for b in np.linspace(0, pi, 11)]
    if min(_in_head(q) for q in probe) > .0025:
        HINGE_FIT = k
        break
assert HINGE_FIT > .6, ('the hinge envelope could not be seated', HINGE_FIT)
print('ATOPO_HINGE', json.dumps({'fit': HINGE_FIT, 'r': list(HINGE_R), 'centre': list(HINGE_CENTRE)}))
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
    t = max(0., min(1., (seam(HINGE_Y) * SCALE - v.co.z) / (.020 * SCALE)))
    hinge.vertex_groups['jaw'].add([v.index], t, 'REPLACE')
    hinge.vertex_groups['skull'].add([v.index], 1 - t, 'REPLACE')
for p in hinge.data.polygons:
    p.use_smooth = True
mo = hinge.modifiers.new('Hinge skin', 'ARMATURE')
mo.object = rig
hinge.parent = rig
oralparts.append(hinge)

# **The depth probe cannot judge a lining inside a modelled mouth, and it is worth saying why.**
# `depth_probe` signs a distance by the nearest triangle's normal, and a point in the lumen of a
# modelled mouth has the *lumen wall* as its nearest surface, whose normal points at it -- so a
# point correctly inside the mouth reads as outside the animal. That is the reading Birgeria
# records. Containment is therefore measured against the head's own outer silhouette instead:
# every oral vertex must lie inside the section the generation actually drew at its station.
LINING_CLEARANCE = min(_hull_clearance(Vector(v.co[:]) / SCALE) for v in lining.data.vertices)
LINING_OUTSIDE = sum(1 for v in lining.data.vertices
                     if _hull_clearance(Vector(v.co[:]) / SCALE) < 0)
print('ATOPO_LINING_HULL', json.dumps(
    {'vertices': len(lining.data.vertices), 'outsideTheSectionHull': LINING_OUTSIDE,
     'worstClearance': LINING_CLEARANCE}))
assert LINING_OUTSIDE == 0, \
    ('the oral lining leaves the head', LINING_OUTSIDE, len(lining.data.vertices),
     LINING_CLEARANCE)

oral_seating = []
for o in oralparts:
    worst_x, worst_z = 1e9, 1e9
    for v in o.data.vertices:
        p = Vector(v.co[:]) / SCALE
        zlo, zhi = head_z_range(float(p.y))
        worst_x = min(worst_x, head_outer_width(float(p.y)) - abs(p.x - cx(float(p.y))))
        worst_z = min(worst_z, p.z - zlo, zhi - p.z)
    oral_seating.append({'part': o.name, 'clearanceInsideSectionX': float(worst_x),
                         'clearanceInsideSectionZ': float(worst_z),
                         'signedDepthProbeMin': float(min(depth(Vector(v.co[:]) / SCALE)
                                                          for v in o.data.vertices))})
    assert worst_x > .0015 and worst_z > .0015, \
        ('mouth geometry breaks the head silhouette', o.name, worst_x, worst_z)

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
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .03), HINGE_Y - .03, seam(HINGE_Y - .03)),
                            'swallow'),
    # **The blow this animal lands is the head itself.** Its heavy is a *hammer sweep*: the T-bar
    # swung sideways as a bar, which is what that rostrum is shaped like. The bone that delivers it
    # is the skull, not the jaw and not the neck -- the neck carries the head round but the bar is
    # what arrives.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .002, seam(SNOUT_Y) + .006),
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


# **Rowing, not flight, and a tail that helps.** Every bone in this rig rests pointing along +Y, so
# for a paddle held out along X the *rowing* stroke -- the blade swung fore and aft -- is a rotation
# about the body's vertical, which is the bone's own Z. `rotation_euler.z` is therefore the stroke,
# `.y` the up-and-down component that keeps it a scull rather than a flat sweep, and `.x` the
# feather. That is asserted rather than assumed: the swept angle recorded below is measured from
# the limb's own direction in world space, so it cannot be an artefact of which axis a rotation was
# written on.
AXIAL_CHAIN = ['neck_02', 'neck_01', 'neck_00', 'chest', 'body'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
# A slow grazer with a long tail: little in the trunk, a real wave down the tail.
GAIN = [.10, .08, .06, .03, .04, .12, .22, .34, .48, .62, .78]
LAG = [0., .16, .32, .52, .80, 1.10, 1.40, 1.70, 2.00, 2.30, 2.60]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}
# The hind pair rows a quarter cycle behind the fore, and the two sides alternate: a rower's gait,
# not a flyer's synchronised beat.
STROKE_LAG = {'fore': 0., 'hind': pi * .5}


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

        amp = {'Idle': .22, 'Swim': .85, 'Sprint': 1.30, 'Eat': .28, 'Guard': .16, 'Grab': .26,
               'Breath': .28, 'Breathe': .24, 'Growth': .20, 'Dodge': 1.00, 'Graze': .20,
               'Ability': .24}.get(clip, .26)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1., 'Graze': 1.,
                'Ability': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy') else 0.
        drive = ramp(u, .30, .46, 2.2) * (1 - ramp(u, .62, 1., 1.)) if clip in ('Attack', 'Heavy') else 0.
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy') else 0.
        # The hammer sweep is a **sideways** blow with the bar, so it is built on a different shape
        # from the bite: the head is cocked to one side and swung across, and the reach it covers is
        # lateral rather than forward.
        hammer = -spike(u, .02, .38, 1.5) + 1.9 * spike(u, .36, .74, 1.8) \
            if clip == 'Heavy' else 0.
        # `scrapeSieve`: nose down on the meadow, working along it, jaw ajar and the water going out
        # the sides. A held loop.
        graze = (clip in ('Ability', 'Graze'))
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
            gape = .22 * cock + .42 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            # The hammer is a shove with the bar, not a bite: the jaws stay nearly shut through it,
            # which is what makes it read as a blow rather than a snap.
            gape = .14 * spike(u, .10, .50, 1.2)
        elif graze:
            # Open on the scrape, shut on the sieve: the cycle the ability is named for.
            gape = .30 * (.5 - .5 * cos(p * 2)) + .08
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .32 * (1 - cos(p * 2)) * .5 + .10
        elif clip == 'Breath':
            gape = .18 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            gape = .08 * (1 - cos(p))
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
        body.rotation_euler.z += .14 * turn
        body.rotation_euler.y += .16 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .32 * e
        if clip in ('Attack', 'Heavy'):
            body.location.y = .10 * cock - .40 * drive
            body.rotation_euler.x = .09 * cock - .08 * drive
        if clip == 'Heavy':
            # The whole animal leans into the sweep, which is where its weight comes from.
            body.rotation_euler.z += .22 * hammer
            body.rotation_euler.y += .14 * hammer
        if clip == 'Bite':
            body.location.y = -.16 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.28 * e
            body.rotation_euler.z = .16 * e
        if clip == 'Guard':
            body.rotation_euler.x = .030 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .48 * e
            body.rotation_euler.z = -.40 * e
            body.location.x = .30 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .18 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .22 * e
            body.location.y = .10 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.20 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z = .08 * (e if clip == 'Breath' else 1.) * .5
        if graze:
            # Nose down over the floor and working steadily along it.
            body.rotation_euler.x = .20 + .03 * sin(p)
            body.location.z = -.10
        if clip == 'Grab':
            body.location.y = -.09 - .07 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        body.rotation_euler.y += .030 * amp * sin(p * beat) * (1 if clip in ('Swim', 'Sprint', 'Idle') else 0)
        body.rotation_euler.y += 2.4 * dead
        body.rotation_euler.x += .16 * dead
        body.location.z -= .22 * dead

        # --- the axial chain: a short stiff neck and a long tail that carries a wave
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            z = .10 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.030 + .006 * i)
            z += .050 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy'):
                # **Only a token of lateral S.** Attack is the forward strike and Heavy the
                # sideways one, and the audit measures exactly that -- how far the bar swings
                # across against how far it reaches forward. Cocked into a real S the strike swung
                # 0.556 across against 0.411 forward, which is the hammer's shape, not the bite's.
                if n.startswith('neck') or n == 'skull':
                    z += .07 * cock * (1 if i % 2 == 0 else -.6)
                    z -= .05 * drive
            if clip == 'Heavy' and (n.startswith('neck') or n in ('chest',)):
                z += .30 * hammer
            if clip == 'Dodge':
                z += .16 * e * sin(i * .55 + .6)
            if graze and n.startswith('neck'):
                # The head works side to side along the meadow: that is the scrape.
                z += .18 * sin(p)
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 4 else -.5)
            q.rotation_euler.z += z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .040 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and n.startswith('neck'):
                q.rotation_euler.x = -.16 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            if graze and n.startswith('neck'):
                q.rotation_euler.x = .15
        if clip == 'Heavy':
            pb['skull'].rotation_euler.z += .55 * hammer
            pb['skull'].rotation_euler.y += .18 * hammer
        if clip in ('Attack',):
            pb['skull'].rotation_euler.x += -.14 * cock + .22 * drive
            for n in ('neck_00', 'neck_01', 'neck_02'):
                pb[n].rotation_euler.x += -.07 * cock + .10 * drive
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .12 * sin(p * 2)
            pb['neck_02'].rotation_euler.x += -.10 * sin(p * 2)
        if graze:
            pb['skull'].rotation_euler.x += .26
            pb['skull'].rotation_euler.z += .18 * sin(p)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul

        # --- the paddles. **This is the dash.**
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            # Left and right alternate: one paddle drives while the other recovers, which is what a
            # rowing gait is. A synchronised beat is the plesiosaur's, and this animal is not one.
            ph = p * beat - STROKE_LAG[kind] - (0. if s > 0 else pi)
            stroke = sin(ph)
            lift = cos(ph)
            # The stroke's reach is the animal's, not the clip's energy: a paddle sweeps the same
            # arc and simply rows harder.
            reach = {'Sprint': 1.05, 'Swim': .80, 'Idle': .22, 'Graze': .18, 'Ability': .18,
                     'Breathe': .24, 'Eat': .22, 'Guard': .18, 'Grab': .20}.get(clip, .26)
            gainf = 1.0 if kind == 'fore' else .92
            # `.z` is the row: the blade swept back through the water and returned.
            up.rotation_euler.z = s * reach * stroke * gainf
            # `.y` keeps it a scull rather than a flat sweep -- the blade rises on the recovery.
            up.rotation_euler.y = s * .34 * reach * lift * gainf
            # The feather: edge-on through the recovery, flat through the power half.
            up.rotation_euler.x = -.30 * reach * lift * gainf
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .44 * e
            if clip in ('TurnLeft', 'TurnRight'):
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.z += d * .44 * e
                up.rotation_euler.y += d * .30 * e
            if clip in ('Attack', 'Heavy'):
                up.rotation_euler.z += s * (.30 * cock - .42 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if graze:
                # Planted: a grazer settles on its paddles and works, it does not hover.
                up.rotation_euler.z += s * .16
                up.rotation_euler.y += s * .30
            if clip == 'Guard':
                up.rotation_euler.y += s * .24 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.y += s * .36 * e
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
            up.rotation_euler.z += s * .38 * dead
            up.rotation_euler.x += .28 * dead
            # The blade bends along its own length through the stroke: the outer joints lag the
            # root rather than following it rigidly. A large share here is a kink rather than a
            # curve, which is the thing that tears.
            lag = sin(ph - .8)
            for j, share, feather, lagshare in ((1, .13, .55, .09), (2, .09, .40, .12),
                                                (3, .07, .26, .15)):
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
# **Not read off an Euler channel.** A rotation written on one axis can be a stroke on one body and
# a twist on another, depending on how the bone rests, so the number that says a paddle takes a
# real stroke has to be a property of where the blade actually points: the vector from the limb's
# root joint to its tip joint in world space, sampled over the cycle, and the largest angle between
# any two of those directions.
limb_sweep = {}
for clip in ('Swim', 'Sprint', 'Idle', 'Ability'):
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
        ('a paddle does not take a stroke in Sprint', names[0], limb_sweep['Sprint'][names[0]])
    assert limb_sweep['Swim'][names[0]] > 45., \
        ('a paddle does not take a stroke in Swim', names[0], limb_sweep['Swim'][names[0]])
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
    'id': ID, 'name': NAME, 'species': 'Atopodentatus unicus',
    'provenance': 'Middle Triassic · Luoping, Yunnan',
    'description': 'The hammerhead grazer: a T-bar rostrum with a comb of chisel teeth along its '
                   'front edge, four broad rowing paddles and a long tail. Authored Tripo body and '
                   'measured procedural volume twin share one armature, one set of inverse binds, '
                   'one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 3.0, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/atopodentatus.png',
                'tools/triassic/creatures/atopodentatus/tripo-raw/atopodentatus.raw.glb',
                'tools/triassic/creatures/atopodentatus/atopodentatus.preview.glb'],
    'notes': [
        'A rower, not a flyer: the paddles sweep fore and aft with the two sides in antiphase and '
        'the hind pair a quarter cycle behind the fore, and the long tail carries a real share of '
        'the cruise. The swept angle at each limb root is measured from the limb\'s own direction '
        'in world space rather than read off an Euler channel, and the build refuses a paddle that '
        'sweeps under 60 degrees in Sprint.',
        'Ability is scrapeSieve and is a held loop, as the roster declares it: the head goes down '
        'on the meadow, works side to side along it, and the jaws open on the scrape and shut on '
        'the sieve.',
        'Heavy is the hammer sweep and is built on a different shape from the bite: the bar is '
        'cocked to one side and swung across with the whole animal behind it, and the jaws stay '
        'nearly shut through it.',
        'The mouth is **modelled**, which makes this the easy case of the three the pipeline '
        'records: Placodus\' geometric method returns a real cavity and the seam is that cavity\'s '
        'own measured mid height per station. The albedo read is taken as a second opinion and '
        'recorded beside it.',
        'The frame is taken head-negative and the T-bar is what settles it: the front section is '
        'flat and broad where the far end tapers to a thread. The check is in the builder.',
        'The source is the published preview, whose ventral fins were collapsed by '
        'smooth-region.py (recorded in docs/triassic/preview-mesh-defects.md). The raw generation '
        'is preserved unchanged.',
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
    'paddles': {k: {j: LIMBS[k][j] for j in
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
    'frameHeadEndEvidence': FRAME_EVIDENCE,
    'centreline': centreline,
    'measuredClusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters],
    'limbs': {k: {'seat': list(LIMB_PTS[k][0]), 'reach': list(LIMB_PTS[k][-1]),
                  'radiusInner': LIMB_RADIUS[k][0], 'radiusOuter': LIMB_RADIUS[k][1]}
              for k in LIMB_NAMES},
    'authoredTriangles': authored_tris, 'twinTriangles': puppet_tris,
    'twinTriangleFraction': puppet_tris / authored_tris,
    **twin_report,
    'bones': len(B), 'boneNames': list(B),
    'measuredCentrelineWorstDepthInsideTheSkinBehindTheMouth': AXIS_DEPTH_MIN,
    'measuredCentrelineDepthPerStation': AXIS_DEPTH,
    'limbChainBlendFractionOfLimbLength': BLEND_FRACTION,
    'limbChainBlend': {k: round(v, 5) for k, v in LIMB_BLEND.items()},
    'poseDeviation': POSE_DEVIATION, 'limbAsymmetry': LIMB_ASYMMETRY,
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
        'note': 'The generation models a real slit with an interior: %d cavity vertices at a %.3f '
                'gap, running y %.3f to %.3f. The seam is the cavity\'s own mid height per station, '
                'blurred once, fitted over the stations in front of the hinge and continued '
                'behind them -- the detector\'s last few stations climb onto the cheek as the '
                'lumen closes. Station-to-station roughness %.4f of the local radius.'
                % (len(CAV), MOUTH_GAP, float(CAV_Y.min()), float(CAV_Y.max()), CAVITY_ROUGHNESS),
        'cavityVertices': int(len(CAV)), 'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'cavityProfile': [[round(float(a), 4), round(float(b), 5), round(float(c), 5),
                           round(float(d), 5)]
                          for a, b, c, d in zip(CAV_Y, CAV_MID, CAV_WIDE, CAV_TALL)],
        'cavityProfileColumns': ['y', 'seamZ', 'halfWidth', 'halfHeight'],
        'measuredLineRoughnessOverRadius': CAVITY_ROUGHNESS,
        'seamClearanceInsideTheHeadMin': SEAM_MARGIN_MIN,
        'headSectionWorstHalfDepth': float(_HD.max()),
        'headSectionMedianHalfDepth': float(np.median(_HD)),
        'paintedLineAgreementOverRadius': PAINTED_AGREEMENT,
        'paintedLine': [[round(r['y'], 4), round(r['z'], 5), round(r['u'], 3)] for r in PAINTED],
        'liningCoverage': mouth_cover, 'liningSection': LINING_FIT,
        'liningFittedPerVertex': True,
        'liningWorstSectionHullClearance': float(LINING_CLEARANCE),
        'liningVerticesOutsideTheSectionHull': int(LINING_OUTSIDE),
        'toothPatches': tooth_report,
        'toothPatchesStraddlingTheCut': straddling, 'authoredToothRows': [],
        'oralPartSeating': oral_seating,
    },
    'envelope': {k: profile_report[k] for k in
                 ('maximumEnvelopeDifference', 'maximumEnvelopeDifferenceFractionOfBodyLength',
                  'surfaceDistanceMax', 'surfaceDistanceP95', 'envelopeTolerance')},
    'anchors': anchor_checks,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True,
}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('ATOPO_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('ATOPO_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('ATOPO_ENVELOPE', json.dumps(report['envelope']))
print('ATOPO_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'hingeY', 'measuredLineRoughnessOverRadius',
       'paintedLineAgreementOverRadius', 'toothPatchesStraddlingTheCut')}))
print('ATOPO_SWEEP', json.dumps(limb_sweep))
print('ATOPO_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'neck': {k: v for k, v in POSE_DEVIATION['neckAndHead'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('ATOPO_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('ATOPO_OK')
