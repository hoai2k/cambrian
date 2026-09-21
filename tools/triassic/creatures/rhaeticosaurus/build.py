"""Rebuild Rhaeticosaurus: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first -- head at -Y, up +Z, one unit
long -- and `export_yup` then puts the head at glTF +Z, where every shipped body in this repository
keeps it. **The bounding box lies about this animal and is on record for doing so**: its flipper
span is longer than the body, so the box's longest side runs across the animal rather than along
it, which is why `docs/triassic/proportion-audit.md` had to force `--axis z` and why the frame here
comes from the vertex cloud's own principal component and the countershading, never from the box.

The first true plesiosaur, and the first thing in the sea to fly: four hydrofoil flippers beating
together over a barrel trunk and a short tail. That is the whole of how it moves, and the clip set
is built around it rather than around a tail beat. The trunk of a plesiosaur is a **stiff box** --
the gastralia see to that -- so the axial chain here carries almost no wave at all; what carries the
animal is the flippers, and the swept angle at each limb root is measured from the *limb's own
direction* per cycle rather than read off an Euler channel, so "the limbs move" is a number that
cannot be an artefact of which axis a rotation was written on.

Two preview corrections are already in the source this build reads, and one recorded pose fault is
built as the greenlit pose draws it (see the README):

  * three tail blades where there should be one -- the two spares collapsed by `smooth-region.py`
    to 6.1 % of their protrusion; and
  * a neck stretch baked on top of that, by the viewer's own `warp()`.
  * Each flipper stands about 0.31 of a body length clear of the flank against a plesiosaur
    forelimb's ~0.25 L. That is in the greenlit pose and is a redraw question, not a mesh
    correction.

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

ID = 'rhaeticosaurus'
NAME = 'Rhaeticosaurus'
SPECIES = 'R. mertensi'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
# The published preview is the source: the spare tails are collapsed in it and the neck stretch is
# baked into it. The raw generation beside it is preserved and never changed.
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

# A seven-metre animal that flies rather than swims: long beats, and a Sprint that is a harder
# stroke rather than a faster wriggle.
CLIPS = {'Idle': 2.8, 'Swim': 1.8, 'Sprint': 1.1, 'TurnLeft': 1.6, 'TurnRight': 1.6,
         'Dive': 1.4, 'Rise': 1.4, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.2, 'Hit': .6,
         'Death': 1.9, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5, 'Eat': 1.6, 'Stagger': 1.2,
         'Ability': 1.1, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5,
         'Breathe': 3.0, 'Glide': 3.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe', 'Glide']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(SOURCE, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(SOURCE, ROOT)
intake['rawGenerationSha256'] = hashlib.sha256(open(RAW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.60)
skin_material.use_backface_culling = False    # the backstop behind the mouth lining
frame = T.measure_frame(auth, head_is_positive_pca=True, luminance_at=luminance_at)
pigment = T.pigment_sampler(auth, sample_albedo)

raw_co = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(raw_co[:, 1].min()), float(raw_co[:, 1].max())

bvh_auth0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh_auth0))
thin_mask = thickness < THIN
cx, cz, half_width, half_depth, centreline = T.measured_centreline(auth, thin_mask)


def on_axis(y, dz=0., dx=0.):
    return Vector((cx(y) + dx, y, cz(y) + dz))


# --------------------------------------------------------------- the flippers, as measured ----
# Four hydrofoils, found by connectivity on the measured shell thickness and split fore from hind
# by where they stand rather than by a typed station. The collapsed tail blades are thin too and
# are *not* limbs: they reach 0.045 from the axis against the smallest flipper's 0.302, which is
# what the reach test separates.
clusters = T.thin_clusters(auth, thin_mask, cx, cz)
blades, other = [], []
for c in clusters:
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    lateral = abs(c['centroid'][0] - cx(mid))
    (blades if (c['reachRadius'] > .18 and lateral > .05) else other).append(c)
if len(blades) != 4:
    print('RHAE_CLUSTERS', json.dumps(
        {'yRange': [Y0, Y1], 'thin': int(thin_mask.sum()),
         'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters]}))
assert len(blades) == 4, ('four flippers did not measure', len(blades))
blades.sort(key=lambda c: (c['yRange'][0] + c['yRange'][1]) / 2)
LIMBS = {}
for i, c in enumerate(blades):
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    LIMBS[('fore' if i < 2 else 'hind') + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
assert sorted(LIMBS) == ['foreL', 'foreR', 'hindL', 'hindR'], sorted(LIMBS)

depth, bvh_auth = T.depth_probe(auth)

# --------------------------------------------------------------------- measure the mouth ----
# Placodus' geometric method first, as the pipeline requires. **It does not reach this animal at
# all**: over the whole front third it answers with three vertices. The head is one closed solid
# with the mouth painted on it, exactly as Dinocephalosaurus' and Mixosaurus' are, so the line is
# read off the albedo.
MOUTH_GAP = .030
CAV = T.mouth_cavity(auth, front_fraction=.34, gap=MOUTH_GAP)
assert len(CAV) < 40, ('a modelled cavity turned up after all -- use it', len(CAV))
MOUTH_METHOD = 'painted line, read as a continuous curve (the geometric method found no cavity)'

# **Which feature the albedo method finds is the whole question here.** Keichousaurus records a
# long-necked swimmer on which the shared `albedo_mouth_line` -- walk up from the belly, first row
# below mid luminance -- returned the *countershading* boundary rather than the lip. On this
# generation it returns neither cleanly: the jaw is white with black speckles painted on it, so the
# walk stops at the first speckle, and the two flanks disagreed by a mean 0.32 of the head's radius
# while the answer moved 0.13 of a radius between neighbouring stations. Three independent
# per-station readings were compared -- the plain walk, Keichousaurus' darkest-row-within-the-pale-
# zone, and the steepest downward step -- and all three were that noisy.
#
# So the line is read as a *curve* instead (`tripo.painted_line`): a matched filter for a thin dark
# line with lighter skin above and below it, resolved as the best path along the head under a jump
# penalty. That took the station-to-station roughness from 0.129 of a radius to 0.022. The search
# band is bounded **below the section's mid height** and that bound is load-bearing: the eye and the
# countershading boundary both outscore the lip, and an unbounded read climbed off the jaw corner
# and followed the countershading back along the neck, ending 0.43 of a radius *above* the axis.
# A render with the fitted line drawn on the head is what settled it; see the README.
HINGE_Y = float(Y0 + .102)
JAW_FRONT_Y = float(Y0 - .002)          # in front of the animal: the mandible gets no front cut
MOUTH_FRONT_Y = float(Y0 + .014)
HEAD_BACK = float(Y0 + .175)
PAINTED = T.painted_line(auth, luminance_at, cz, half_depth, Y0 + .010, HINGE_Y,
                         u_lo=-.95, u_hi=.10, stations=32)
assert len(PAINTED) >= 20, ('the painted mouth line did not read', len(PAINTED))
_py = np.array([r['y'] for r in PAINTED])
_pz = T.blur1d(np.array([r['z'] for r in PAINTED]), 1.2)
PAINTED_DISAGREEMENT = float(np.max([r['disagreementOverRadius'] for r in PAINTED]))
PAINTED_DISAGREEMENT_MEAN = float(np.mean([r['disagreementOverRadius'] for r in PAINTED]))
PAINTED_ROUGHNESS = float(np.mean(np.abs(np.diff([r['u'] for r in PAINTED]))))
assert PAINTED_ROUGHNESS < .06, ('the mouth line does not read as a line', PAINTED_ROUGHNESS)


def seam(y):
    """The mouth line itself, lightly smoothed, clamped in front of the snout and behind the
    hinge. A curve, so the cut is taken by shearing the head onto it rather than by a plane."""
    return float(np.interp(y, _py, _pz))


# What a straight cut would have cost, recorded for comparison with the curve that is used. On a
# reptile it is not small, which is the difference from the fish in this batch.
_ramp = np.polyfit(_py, _pz, 1)
_resid = _pz - np.polyval(_ramp, _py)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(half_depth(float(y)), 1e-4) for y in _py])))
CUT_DEVIATION_RAW = float(np.max(np.abs(np.array([r['z'] for r in PAINTED]) - _pz)))

# What relief the generated snout carries, recorded rather than added to.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0020)

# The centreline table is 61 stations over a whole body and too coarse for a head this small, so
# the head gets its own fine profile, and the mouth's own section is **ray cast** from the seam.
_HY = np.linspace(Y0 + .002, HINGE_Y + .03, 48)
_HW, _HD = [], []
for _y in _HY:
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


def _cast(o, d, limit=.5):
    hit = bvh_auth.ray_cast(Vector(o), Vector(d), limit)
    return float(hit[3]) if hit[0] is not None else limit


# Birgeria's lesson, which generalises: a percentile of the flank over a band about the seam is not
# the mouth's section. Too tall a band reads the head above the mouth line and the lining bulges out
# through the cheek; too tight a band reads the head at its narrowest and the lining sits inside the
# skin's own cut edge, leaving an annular strip the jaw opens and nothing bridges. Casting a ray out
# from the mouth's own axis measures the section the mouth actually cuts.
_MW, _MV = [], []
for _y in _HY:
    _o = (cx(float(_y)), float(_y), seam(float(_y)))
    _MW.append(min(_cast(_o, (1, 0, 0)), _cast(_o, (-1, 0, 0)), head_half_width(float(_y))))
    # And up and down, which on *this* animal is a real measurement: the head is one closed solid,
    # so a ray from the seam reaches the top of the skull and the underside of the jaw. On a
    # generation that models its mouth the same ray would measure the closed slit -- three
    # thousandths of a body -- which is why Birgeria does not cast its lining's height.
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


NECK_Y = [-.25, -.31, -.37, -.43]        # base to base of skull; the stretched neck
CHEST_Y, BODY_Y = -.16, .03
TAIL_Y = [.17, .23, .29, .35, .40]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
for i, y in enumerate(NECK_Y):
    bone('neck_%02d' % i, on_axis(y), 'chest' if i == 0 else 'neck_%02d' % (i - 1))
bone('skull', on_axis(HINGE_Y - .020), 'neck_%02d' % (len(NECK_Y) - 1))
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .008), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.016)
    reach = Vector(c['reach'])
    names = ['%s_upper_%s' % (kind, s), '%s_mid_%s' % (kind, s), '%s_outer_%s' % (kind, s),
             '%s_tip_%s' % (kind, s)]
    # A hydrofoil, not a leg, and **four joints rather than three**. The research gives this animal
    # hyperphalangy -- a great many bones in the blade -- and the skinning wants the same thing for
    # a different reason: a blade that sweeps 130 degrees on three joints puts a whole quarter of
    # that arc across each band between them, and `skin-tears.mjs` read 7.9x there. Spread over
    # four the angle per joint drops and the blade bends as a curve instead of a hinge.
    pts = [root, root + (reach - root) * .30, root + (reach - root) * .55,
           root + (reach - root) * .78, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    parent = 'chest' if kind == 'fore' else 'tail_00'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .012, ('a flipper root is not seated inside the trunk', n, d)
JAW_SEATING = depth(B['jaw'][0])
assert JAW_SEATING > .004, ('the jaw hinge is not seated inside the head', JAW_SEATING)

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
# **A copied rig is a starting point to be re-measured, never a transplant.** Nothosaurus' scheme
# is the era's cleanest and tore to 64.9x on Henodus because its "outboard of |y| 0.09 means on the
# limb" test assumes a narrow trunk. This body's trunk is 0.26 of a body wide, so the limb is bound
# **radially against its own bone chain** instead, at a radius measured from the flipper's own
# cluster rather than guessed -- a hydrofoil is wide as well as long, and a radius that is too small
# leaves its trailing edge on the trunk bones and tears the moment it strokes.
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    # **A hydrofoil is a wide blade, and the inner radius has to cover it.** The kit's fins take
    # the 55th percentile of the cluster's own distances as the radius inside which a vertex is
    # wholly the limb's, which is right for a small paddle and wrong here: it left nearly half the
    # blade on a partial alpha, and the relaxation then spread trunk weight right out along it --
    # vertices 1.35 units from the midline, on a limb swinging 130 degrees, carrying 0.26 of `chest`
    # and 0.23 of `body`. `skin-tears.mjs` read 7.9x across exactly those edges. At the 92nd
    # percentile the blade is the limb's and only its rim is blended.
    LIMB_RADIUS[key] = (float(np.quantile(d, .92)), float(np.quantile(d, .995)) + .025)


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
            # **A wide blend between the joints of a blade that swings 140 degrees.** The kit's
            # default is 0.022 of a body either side of each joint, which is right for a paddle that
            # steers; on a hydrofoil taking a real stroke it leaves a narrow band carrying the whole
            # difference between two joints and `skin-tears.mjs` read 7.9x across it.
            chosen = (T.limb_chain(names, cum, s, blend=.050), rootw, min(1., s / cum[-1]))
    return (best, *chosen) if chosen else None


# The throat follows the jaw, as the shore animals and Birgeria both had to learn: the mandible is
# rigid on `jaw` and the skin behind the hinge on the axial chain, and with nothing blending between
# them a wide gape separates the two -- the pale gular skin reads as a slab hanging off a detached
# jaw, and under a single-sided material the wedge is a hole straight through the animal. The share
# is **full at the mouth line and full at the cut plane**, not half of either: a ramp centred on
# either reads 0.5 exactly where the mandible's 1.0 meets it.
THROAT_SPAN = .055
THROAT_DROP = .12


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
    sample_albedo, thin=THIN, band=.020, roughness=.64, blade_dilation=.0032)

# --------------------------------------------------------------------- cut the jaw ----
def is_jaw(c):
    return JAW_FRONT_Y - .004 < c.y < HINGE_Y and c.z < seam(c.y) - 1e-7


# ------------------------------------------- the mouth, closed by the cut's own rim ----
# **This head arrived shut**, as the section above says in so many words: one closed solid, with
# the lip painted on it and no lumen behind it, so a ray from the mouth's own axis reaches the top
# of the skull and the underside of the jaw. Rotating the jaw bone on a body like this opens
# nothing by itself -- there is no aperture until the cut makes one -- and what the cut then leaves
# is a hole in each half. So the mouth is those two holes closed **with the cut's own rim** and
# domed apart, rather than a palate and a floor placed inside the opening and then proved by
# rendering to cover it. `T.cap_mouth` carries the whole argument; three things it buys here:
# the cap follows the measured seam curve exactly, at no cost, because the rim is what bounds it;
# it takes its UVs from that rim, so the roof of the mouth is the head's own albedo; and each cap
# is part of its own half, so it is rigid on that half's bone through the same weight field as the
# skin around it, with no second surface to keep coincident with the first.
#
# Two runs, in the order they have to be taken. This mandible gets no front cut, so the only part
# of the boundary that leaves the mouth's own surface is the head's cross-section at the hinge:
# that is fanned first with its own vertices (`T.cap_cut`), and what is left -- the two lip runs
# joined round the snout, and the short chord the fan closed the hinge with -- lies in the mouth's
# surface and is filled in that plane and domed.
#
# The dome is `DOME` of each cap vertex's own distance from the rim: zero on the rim, deepest along
# the middle of the mouth, shallow at the lips and at the snout, and scaled to the local mouth size
# by construction, because the distance from a point on the midline to the rim *is* the half width
# there. It is bounded by `mouth_half_depth`, the ray cast from the seam to the skin above and
# below, so a palate cannot reach the scalp whatever `DOME` says.
DOME = .34
DOME_ROOM = .55


def on_seam(p):
    return p.y <= HINGE_Y + 1e-5 and abs(p.z - seam(p.y)) < 1e-5


def in_head(p):
    return p.y < HINGE_Y + .02


parts, CAPS, CUT_RIM = {}, {}, {}
for o in (auth, puppet):
    T.bisect_on_curve(o, seam, HINGE_Y, JAW_FRONT_Y - .004, margin=.03)
    T.split_part(o, 'lower jaw', is_jaw, parts)
    jaw = parts['lower jaw'][o.name]
    # What the cut actually left open, before anything is built: one loop per half, every vertex of
    # it on the seam or on the hinge cross-section, is what a cut through a closed head looks like.
    CUT_RIM[o.name] = {'skull': T.cut_rim(o, in_head, seam=seam),
                       'jaw': T.cut_rim(jaw, in_head, seam=seam)}
    at_hinge = lambda p: abs(p.y - HINGE_Y) < 1e-5                          # noqa: E731
    CAPS[o.name] = {
        'skullAtHinge': T.cap_cut(o, at_hinge, Vector((0, -1, 0))),
        'jawAtHinge': T.cap_cut(jaw, at_hinge, Vector((0, 1, 0))),
    }
    assert CAPS[o.name]['skullAtHinge'] > 0 and CAPS[o.name]['jawAtHinge'] > 0, \
        ('the hinge cross-section was left open', o.name, CAPS[o.name])
    CAPS[o.name]['palate'] = T.cap_mouth(
        o, on_seam, Vector((0, 0, -1)), dome=DOME, rounds=2,
        limit=lambda p: mouth_half_depth(p.y) * DOME_ROOM)
    CAPS[o.name]['floor'] = T.cap_mouth(
        jaw, on_seam, Vector((0, 0, 1)), dome=DOME, rounds=2,
        limit=lambda p: mouth_half_depth(p.y) * DOME_ROOM)

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
    relaxed = T.relax_weights(o, raw_weights, passes=4, hold=.45)
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

# ------------------------------------------------------------ the mouth interior ----
# **There is none, and that is the whole change.** This body shipped with an `Oral cavity lining`
# -- a palate and a floor built inside the lumen to a cast room, per-vertex fitted, wound
# double-sided -- and with a `Seated jaw hinge tissue` ellipsoid blended between `skull` and `jaw`
# across the corner of the mouth. Both were closing holes the cut had made: the lining the opening
# itself, the ellipsoid the head's own cross-section at the hinge and the mandible's rear face.
# Those holes are now closed by the cut's own rim, above, each half on its own bone -- so there is
# no lining to size, no shell to prove covers an opening, nothing for the runtime classifier to
# hide, and no blended part anywhere in the head. The mouth is the space the two domed caps leave.
mouth_cover = []
oralparts = []
oral_seating = []

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
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, seam(SNOUT_Y) - .005), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .03), HINGE_Y - .03, seam(HINGE_Y - .03)), 'swallow'),
    # **The blow this animal lands is a bite.** Its light attack is a bite and its heavy a snatch,
    # so the skull is the bone that delivers it; the neck carries the head there but does not strike
    # with itself, which is the case the anchor rule is written against. Its *ability* is a shoulder
    # charge -- all four flippers at once -- and that is a dash rather than an attack anchor.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .004, seam(SNOUT_Y) + .005), 'attack'),
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


# **Underwater flight, not a tail beat.** A plesiosaur's trunk is a stiff box -- that is what the
# gastralia are for -- so the axial chain here carries almost nothing: the gain over the trunk is a
# few hundredths and what wave there is belongs to the neck and the short tail. The animal is
# carried by four hydrofoils.
#
# Every bone in this rig rests pointing along +Y, so for a flipper held out along X the *flight*
# stroke -- the blade sweeping up and down -- is a rotation about the body's long axis, which is the
# bone's own Y. `rotation_euler.y` is therefore the stroke, `.z` the fore-and-aft component that
# makes it a figure of eight rather than a flap, and `.x` the feather. That is asserted rather than
# assumed: the swept angle recorded below is measured from the limb's own direction, so it cannot be
# an artefact of the axis a rotation was written on.
AXIAL_CHAIN = ['neck_03', 'neck_02', 'neck_01', 'neck_00', 'chest', 'body'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
# Nearly nothing on the trunk, a little on the neck, a little on the tail: a stiff middle with two
# flexible ends, which is the plesiosaur silhouette in motion.
GAIN = [.30, .24, .18, .10, .03, .01, .06, .14, .24, .36, .46]
LAG = [0., .25, .50, .75, 1.0, 1.15, 1.35, 1.6, 1.85, 2.1, 2.35]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}
# The hind pair beats a fifth of a cycle behind the fore, working in its wake, which is the
# reconstruction the four-flipper gait is usually drawn with.
STROKE_LAG = {'fore': 0., 'hind': 1.25}


def ramp(u, a, b, p=1.):
    return T.smooth((u - a) / max(b - a, 1e-6)) ** p


def spike(u, a, b, p=1.):
    if u <= a or u >= b:
        return 0.
    return (sin(pi * (u - a) / (b - a)) ** 2) ** p


# -------------------------------------------------------------- the reach, measured ----
# T3D-23's own instrument in the builder: where the attack anchor stands against where it rests,
# along the animal's own forward direction, in bodies. The verdict is taken off the *packaged*
# file (41 phases), because the file is what the game loads; this is the same quantity on the rig,
# so a strike that does not reach fails here rather than in a sweep months later.
STRIKE_CLIPS = ('Attack', 'Heavy')
_ATTACK_BONE, _ATTACK_RAW, _ = ANCHOR_POINTS['anchor_attack_primary']
ATTACK_LOCAL = rig.data.bones[_ATTACK_BONE].matrix_local.inverted() @ tx(_ATTACK_RAW)
FORWARD = Vector((0., -1., 0.))   # this rig faces -Y; the exporter maps that to +Z in the file
reach_track = {}


def attack_anchor_now():
    """The attack anchor in armature space at the pose the rig is holding."""
    bpy.context.view_layer.update()
    return rig.pose.bones[_ATTACK_BONE].matrix @ ATTACK_LOCAL


reset()
ATTACK_REST = attack_anchor_now()

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

        amp = {'Idle': .20, 'Swim': 1.0, 'Sprint': 1.35, 'Eat': .30, 'Guard': .18, 'Grab': .28,
               'Breath': .30, 'Breathe': .26, 'Growth': .22, 'Dodge': 1.10, 'Glide': .14,
               'Ability': .70}.get(clip, .26)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1., 'Glide': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy') else 0.
        drive = ramp(u, .30, .46, 2.2) * (1 - ramp(u, .62, 1., 1.)) if clip in ('Attack', 'Heavy') else 0.
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy') else 0.
        # **Heavy is the snatch, and it has to be further than the bite it is a heavier version
        # of.** Built from the same three shapes with the same numbers, the two clips measured an
        # identical 1.04 of snout reach, which is two names for one clip. The snatch takes the neck
        # right out and drops the shoulder in behind it.
        strike = {'Heavy': 1.60}.get(clip, 1.0)
        # **The snatch has to arrive somewhere in front of the animal** (T3D-23, closed by T3D-32D).
        # Measured on the packaged file at 41 phases, `Heavy` took the attack anchor 14.4 % of a
        # body **backwards** and never more than 1.0 % forward, and `Attack` reached 2.1 %. The
        # cause was one line: the drive added a *uniform* yaw of .26 to each of the four cervicals
        # on top of the cock's alternating S, which at `Heavy`'s 1.6 is 1.66 radians of accumulated
        # turn at the skull -- the head ends up pointing across and behind the shoulder at the very
        # moment the jaws shut. A neck that is bending round one way is not unrolling.
        #
        # So the drive **unrolls the S it gathered** (the same alternating pattern, taken past
        # straight by a little), and the reach is the **dart**: `carry` is a plateau that rises
        # with the drive and is held through the close, exactly as Phragmoteuthis' is, so the head
        # arrives forward of where it rested. The cock stays large because that is what the neck's
        # own excursion is -- an alternating S translates the head sideways rather than backwards,
        # which is why the rear-back never came from it -- and the audit's rule that the skull must
        # out-travel the shoulder is measured against that excursion.
        carry = (ramp(u, .04, .20, 1.2) * (1 - ramp(u, .76, .94, 1.))
                 if clip in ('Attack', 'Heavy') else 0.)
        # `Ability` is the roster's **power stroke**: all four flippers at once, shoulders first,
        # carried three body lengths. One enormous synchronised downbeat and a long glide out of it,
        # which is a different shape from the alternating cruise entirely.
        load = ramp(u, .02, .22, 1.6) * (1 - ramp(u, .24, .34, 2.0)) if clip == 'Ability' else 0.
        power = ramp(u, .26, .44, 2.2) * (1 - ramp(u, .58, .96, 1.)) if clip == 'Ability' else 0.
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws
        gape = .015 * (1 - cos(p)) * (1 if clip in ('Idle', 'Swim', 'Sprint') else 0)
        if clip == 'Bite':
            gape = .52 * ramp(u, .03, .17, 1.8) * (1 - ramp(u, .22, .38, 2.4))
        elif clip == 'Attack':
            gape = .24 * cock + .43 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            # The snatch: the neck goes out and the jaws shut on the end of it. **The gape is capped
            # at what this head's own mouth line will carry.** Cut along the line the generation
            # paints, the corner of the mouth starts to open somewhere between 0.47 and 0.50 rad --
            # a wedge of the mandible's inner surface shows through the gap between the open jaw and
            # the throat, which no lining can cover because it is not the mouth -- so the snatch
            # runs at 0.47, which is wider than Attack and inside Bite. What makes it a snatch is
            # its reach, 1.43 against Attack's 1.04, not another five degrees of jaw.
            gape = .24 * cock + .47 * ramp(u, .24, .46, 1.7) * (1 - ramp(u, .50, .70, 1.4))
        elif clip == 'Ability':
            gape = .10 * load
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .34 * (1 - cos(p * 2)) * .5 + .10
        elif clip == 'Breath':
            gape = .18 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            gape = .08 * (1 - cos(p))
        elif clip in ('Hit', 'Stagger'):
            gape = .28 * e
        elif clip == 'Death':
            gape = .24 * dead
        elif clip == 'Guard':
            gape = .03 * (1 - cos(p))
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.10 * gape
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the trunk. It is a box: it pitches and rolls with the stroke and it does not undulate.
        body = pb['body']
        body.rotation_euler.z += .16 * turn
        body.rotation_euler.y += .20 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .34 * e
        if clip in ('Attack', 'Heavy'):
            # The snatch's extra reach is the **neck's**, not the shoulder's: carrying the trunk
            # forward with it took the skull's travel down to 1.4x the chest's, which is a lunge
            # rather than a strike.
            # The snatch darts a little further than the bite does, but only a little: what makes
            # it the snatch is the neck's own excursion (`snoutReach` 1.43 against 1.04), and a
            # dart scaled by the whole of `strike` would make it a charge instead.
            body.location.y = .12 * cock - .62 * carry * (1. + .22 * (strike - 1.))
            body.rotation_euler.x = .10 * cock - .09 * carry
        if clip == 'Ability':
            # Shoulders first: the body pitches nose-down into the load and is thrown forward.
            body.location.y = .14 * load - 1.05 * power
            body.rotation_euler.x = .16 * load - .12 * power
        if clip == 'Bite':
            body.location.y = -.18 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.30 * e
            body.rotation_euler.z = .18 * e
        if clip == 'Guard':
            body.rotation_euler.x = .035 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .52 * e
            body.rotation_euler.z = -.42 * e
            body.location.x = .34 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .20 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .24 * e
            body.location.y = .12 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.22 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z = .09 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Grab':
            body.location.y = -.10 - .08 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        # A flying animal rolls a little on each beat; that is the tell that the flippers are
        # doing the work rather than the tail.
        body.rotation_euler.y += .050 * amp * sin(p * beat) * (1 if clip in ('Swim', 'Sprint', 'Idle', 'Glide') else 0)
        body.rotation_euler.y += 2.4 * dead
        body.rotation_euler.x += .16 * dead
        body.location.z -= .24 * dead

        # --- the neck and the tail, the only flexible ends
        chain_z = {}
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            z = .10 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.030 + .004 * i)
            z += .050 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy'):
                # **The neck is what puts the head on the prey, and it does that by coiling to one
                # side rather than by folding in half.** The gather was an alternating S -- every
                # other cervical bent the other way -- and a balanced S barely moves the head at
                # all: with the drive's uniform bend taken out (see above), the skull's whole
                # excursion collapsed to 0.61 against a shoulder travelling 0.63, and the audit's
                # rule that the neck must out-travel the shoulder failed on a clip that had just
                # been made to reach. So the gather is a **C** with a counter-turn at the head:
                # the cervicals draw the neck round to one side, weighted towards the shoulder
                # where the leverage on the head is, while `neck_03` turns back the other way so
                # the animal is still looking at what it is about to take. That is the heron's
                # windup and the plesiosaur's, and it is what a snatch is.
                #
                # The cock is spent by u = 0.40 and the close happens at 0.5, so the neck is
                # straight at the blow without anything having to undo it; the drive only carries
                # it a little past centre as a follow-through.
                if n.startswith('neck') or n == 'skull':
                    coil = (-.45, .70, .95, 1.0)[i] if i < 4 else 0.
                    z += .24 * cock * coil * strike
                    z -= .08 * drive * coil * strike
            if clip == 'Dodge':
                z += .18 * e * sin(i * .55 + .6)
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 6 else -.5)
            q.rotation_euler.z += z
            chain_z[n] = z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .040 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and n.startswith('neck'):
                # the head goes up for the blow, which is what this animal's whole depth economy is
                q.rotation_euler.x = -.16 * (e if clip == 'Breath' else .5 + .5 * sin(p))
        if clip in ('Attack', 'Heavy'):
            # The head's own dip rides the carry, so the reach and the pitch are one movement
            # rather than two bursts half a clip apart (Aphaneramma's lesson, same batch).
            # And the **nose-down pitch is the other half of the same fault**. At .14 on each of
            # four cervicals plus .24 on the skull, scaled by `Heavy`'s 1.6, the drive bent the
            # neck 51 degrees downward and put the head 73 degrees nose-down: that swings a snout
            # standing 1.66 units out from the shoulder through 0.61 of a unit *backwards*, which
            # is 12 % of a body and ate the whole dart on its own. The head drops onto the prey by
            # about a quarter of a turn in total now, which is a strike rather than a nod.
            pb['skull'].rotation_euler.x += (-.16 * cock + .16 * carry) * strike
            for n in ('neck_00', 'neck_01', 'neck_02', 'neck_03'):
                pb[n].rotation_euler.x += (-.10 * cock + .04 * carry) * strike
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .12 * sin(p * 2)
            pb['neck_03'].rotation_euler.x += -.10 * sin(p * 2)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul

        # --- the flippers. **This is the animal.**
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            ph = p * beat - STROKE_LAG[kind]
            stroke = sin(ph)
            # A figure of eight: the blade sweeps down and back on the power half and recovers up
            # and forward, with the fore-and-aft component a quarter cycle out of phase with the
            # up-and-down one. A flap that is only up and down is a bird in still air, not a
            # hydrofoil.
            fore_aft = cos(ph)
            # The stroke's reach is the animal's, not the clip's energy: a flipper sweeps the same
            # arc and simply beats harder. Multiplying by `amp` as well takes Sprint past the point
            # where the blade swings through the flank.
            reach = {'Sprint': .95, 'Swim': .72, 'Idle': .26, 'Glide': .10,
                     'Breathe': .26, 'Eat': .24, 'Guard': .20, 'Grab': .22}.get(clip, .28)
            gainf = 1.0 if kind == 'fore' else .86
            up.rotation_euler.y = s * reach * stroke * gainf
            up.rotation_euler.z = s * .30 * reach * fore_aft * gainf
            # The feather: the blade is edge-on through the recovery and flat through the power
            # half, which is what makes a hydrofoil a hydrofoil.
            up.rotation_euler.x = -.34 * reach * fore_aft * gainf
            if clip == 'Ability':
                # All four at once: no phase offset at all, one huge synchronised downbeat.
                up.rotation_euler.y = s * (.55 * load - 1.15 * power) * gainf
                up.rotation_euler.z = s * (.22 * load + .10 * power) * gainf
                up.rotation_euler.x = -.30 * load + .20 * power
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .46 * e
            if clip in ('TurnLeft', 'TurnRight'):
                # One side strokes and the other brakes, which is how a four-flipper animal turns.
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.y += d * .40 * e
                up.rotation_euler.z += d * .34 * e
            if clip in ('Attack', 'Heavy'):
                up.rotation_euler.y += s * (.34 * cock - .46 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if clip == 'Guard':
                up.rotation_euler.z += s * .26 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += s * .38 * e
            if clip == 'Dodge':
                up.rotation_euler.y += s * .62 * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.y += s * .34 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.y += s * .22 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.z += s * .24 + s * .10 * haul
            if clip == 'Growth':
                up.rotation_euler.z += s * .24 * e
            up.rotation_euler.y += s * .40 * dead
            up.rotation_euler.x += .30 * dead
            # The blade bends along its own length through the stroke -- hyperphalangy is what the
            # research gives this animal -- so the outer joints lag the root rather than following
            # it rigidly.
            lag = sin(ph - .8)
            # Each joint's rotation is *added* to what it inherits, so a large share here is a
            # kink rather than a curve: at 0.45 of the root the mid joint bent 24 degrees on top of
            # a root already at 55, and the skin tore 7.9x across the band between them. A flipper
            # bends gently along its length and gets most of its character from the lag.
            for j, share, feather, lagshare in ((1, .13, .55, .09), (2, .09, .40, .12),
                                               (3, .07, .26, .15)):
                pb[names[j]].rotation_euler.y = share * up.rotation_euler.y + s * lagshare * reach * lag
                pb[names[j]].rotation_euler.x = feather * up.rotation_euler.x

        if clip in STRIKE_CLIPS:
            d = attack_anchor_now() - ATTACK_REST
            reach_track.setdefault(clip, []).append({
                'u': round(u, 4), 'forward': d.dot(FORWARD) / BODY_LENGTH,
                'lateral': abs(d.x) / BODY_LENGTH, 'lunge': -body.location.y / BODY_LENGTH})
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

# **The snatch reaches, and it does not spend its windup going the other way.** The floors are
# T3D-23's (Phragmoteuthis, the worked example, asserts +0.12 and -0.04; this neck gathers into a
# deep S first, which costs a little axially, so -0.06 is the bar and is measured rather than
# guessed). `forwardAtPhase > rearBackAtPhase` is the shape of the thing: gather, then reach.
ATTACK_REACH = {}
for c in STRIKE_CLIPS:
    rows = reach_track[c]
    fwd = max(rows, key=lambda r: r['forward'])
    back = min(rows, key=lambda r: r['forward'])
    ATTACK_REACH[c] = {
        'axis': 'the rig\'s own forward (-Y here, +Z in the packaged file), in bodies',
        'anchorForwardOverL': round(fwd['forward'], 4), 'forwardAtPhase': fwd['u'],
        'anchorRearBackOverL': round(back['forward'], 4), 'rearBackAtPhase': back['u'],
        'anchorLateralOverL': round(max(r['lateral'] for r in rows), 4),
        'bodyLungeOverL': round(max(r['lunge'] for r in rows), 4),
        'anchorMinThroughTheCloseOverL': round(min(r['forward'] for r in rows if .40 < r['u'] < .70), 4),
        'trace': [[r['u'], round(r['forward'], 3)] for r in rows[::max(1, len(rows) // 12)]],
    }
    assert ATTACK_REACH[c]['anchorForwardOverL'] >= .10, ('the strike does not reach in ' + c, ATTACK_REACH[c])
    assert ATTACK_REACH[c]['anchorRearBackOverL'] >= -.06, ('the gather goes too far back in ' + c, ATTACK_REACH[c])
    assert ATTACK_REACH[c]['forwardAtPhase'] > ATTACK_REACH[c]['rearBackAtPhase'], \
        ('the gather must come first in ' + c, ATTACK_REACH[c])
assert ATTACK_REACH['Heavy']['anchorForwardOverL'] > ATTACK_REACH['Attack']['anchorForwardOverL'], \
    ('the snatch must reach further than the bite', ATTACK_REACH)
print('RHAETICOSAURUS_REACH', json.dumps({c: {k: v for k, v in r.items() if k != 'trace'}
                                          for c, r in ATTACK_REACH.items()}))

# --- the swept angle at each limb root, measured from the limb's own direction.
# **Not read off an Euler channel.** A rotation written on one axis can be a stroke on one body and
# a twist on another, depending on how the bone rests, so the number that says a flipper takes a
# real stroke has to be a property of where the blade actually points. The direction is the vector
# from the limb's root joint to its tip joint in world space, sampled over the cycle; the swept
# angle is the largest angle between any two of those directions, which is the arc the blade covers.
limb_sweep = {}
for clip in ('Swim', 'Sprint', 'Ability', 'Glide'):
    rig.animation_data.action = bpy.data.actions[clip]
    last = round(CLIPS[clip] * 30)
    dirs = {k: [] for k in LIMB_NAMES}
    for f in range(0, last + 1, 2):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        for key, names in LIMB_NAMES.items():
            a = rig.matrix_world @ rig.pose.bones[names[0]].head
            b = rig.matrix_world @ rig.pose.bones[names[-1]].tail
            d = (b - a)
            dirs[key].append(d.normalized())
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
        ('a flipper does not take a stroke in Sprint', names[0], limb_sweep['Sprint'][names[0]])
    assert limb_sweep['Swim'][names[0]] > 45., \
        ('a flipper does not take a stroke in Swim', names[0], limb_sweep['Swim'][names[0]])
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
    'id': ID, 'name': NAME, 'species': 'Rhaeticosaurus mertensi',
    'provenance': 'Late Triassic · Bonenburg, Westphalia',
    'description': 'The first true plesiosaur: four hydrofoil flippers beating together, a barrel '
                   'trunk and a short tail. Authored Tripo body and measured procedural volume '
                   'twin share one armature, one set of inverse binds, one set of sockets and one '
                   'set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 2.37, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/rhaeticosaurus.png',
                'tools/triassic/creatures/rhaeticosaurus/tripo-raw/rhaeticosaurus.raw.glb',
                'tools/triassic/creatures/rhaeticosaurus/rhaeticosaurus.preview.glb'],
    'notes': [
        'Underwater flight, and the clip set is built around it: the trunk is a stiff box that '
        'pitches and rolls but does not undulate, and all four hydrofoils beat in a figure of '
        'eight with the hind pair a fifth of a cycle behind the fore.',
        'The swept angle at each limb root is measured from the *limb\'s own direction* rather '
        'than read off an Euler channel, so it cannot be an artefact of which axis a rotation was '
        'written on. The build refuses a flipper that sweeps under 60 degrees in Sprint.',
        'Ability is the roster\'s power stroke: all four flippers at once with no phase offset, '
        'shoulders first, one synchronised downbeat and a long carry out of it.',
        'The mouth is **painted, not modelled** -- Placodus\' geometric method finds three vertices '
        'on the whole front third -- and the painted line is read as a continuous curve rather than '
        'station by station, because this hide is blotched and a per-station walk stops at the '
        'first speckle. The search band is bounded below the section\'s mid height, because the eye '
        'and the countershading boundary both outscore the lip; see the README.',
        'Recorded pose fault, not corrected here: each flipper stands about 0.31 of a body length '
        'clear of the flank, against roughly 0.25 L for a plesiosaur forelimb. That is what the '
        'greenlit pose draws and it is a redraw question. See docs/triassic/proportion-audit.md.',
        'The source is the published preview: two spare tail blades collapsed by smooth-region.py '
        'and a neck stretch baked on top, both recorded in docs/triassic/preview-mesh-defects.md. '
        'The raw generation is preserved unchanged.',
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
    'flippers': {k: {j: LIMBS[k][j] for j in
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
    'measuredClusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters],
    'limbs': {k: {'seat': list(LIMB_PTS[k][0]), 'reach': list(LIMB_PTS[k][-1]),
                  'radiusInner': LIMB_RADIUS[k][0], 'radiusOuter': LIMB_RADIUS[k][1]}
              for k in LIMB_NAMES},
    'authoredTriangles': authored_tris, 'twinTriangles': puppet_tris,
    'twinTriangleFraction': puppet_tris / authored_tris,
    **twin_report,
    'bones': len(B), 'boneNames': list(B),
    'poseDeviation': POSE_DEVIATION, 'limbAsymmetry': LIMB_ASYMMETRY,
    'limbSweepDegrees': limb_sweep,
    'attackReach': ATTACK_REACH,
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
        'note': 'Placodus\' geometric method was tried first and does not reach this animal: over '
                'the whole front third it returns %d vertices. The painted line was then read as a '
                'continuous curve rather than station by station -- a matched filter for a thin '
                'dark line between lighter skin, resolved as the best path along the head -- '
                'because this hide is white with black speckles and a per-station walk stops at '
                'the first speckle. Station-to-station roughness %.3f of the local radius; flanks '
                'disagree by %.3f on average and %.3f at worst.'
                % (len(CAV), PAINTED_ROUGHNESS, PAINTED_DISAGREEMENT_MEAN, PAINTED_DISAGREEMENT),
        'cavityVertices': int(len(CAV)), 'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'paintedLine': [[round(r['y'], 4), round(r['z'], 5), round(r['u'], 3),
                         round(r['disagreementOverRadius'], 3)] for r in PAINTED],
        'paintedLineRoughnessOverRadius': PAINTED_ROUGHNESS,
        'paintedLineFlankDisagreementMeanOverRadius': PAINTED_DISAGREEMENT_MEAN,
        'paintedLineFlankDisagreementMaxOverRadius': PAINTED_DISAGREEMENT,
        'oralGeometry': 'none: the cut is capped with its own rim and domed (T.cap_mouth)',
        'cutRim': CUT_RIM, 'mouthCaps': CAPS,
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
print('RHAE_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('RHAE_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('RHAE_ENVELOPE', json.dumps(report['envelope']))
print('RHAE_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'hingeY', 'paintedLineRoughnessOverRadius',
       'paintedLineFlankDisagreementMeanOverRadius', 'toothPatchesStraddlingTheCut')}))
print('RHAE_SWEEP', json.dumps(limb_sweep))
print('RHAE_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'neck': {k: v for k, v in POSE_DEVIATION['neckAndHead'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('RHAE_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('RHAE_OK')
