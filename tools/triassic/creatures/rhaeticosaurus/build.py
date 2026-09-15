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
# **Double-sided, and that is the fix for the last thing the gape proof could see.** The lining is
# wound inwards and culled like the era's others, and on a head this deep that costs the gape: from
# below, looking up into an open mouth, the sac's *floor* is backfacing, so culling takes it away
# and the mandible's inner face behind it is backfacing too -- 508 magenta pixels straight through
# the jaw at the drive, and only at the drive. A sac buried inside a head is never seen from outside
# whatever its winding, because the skin is in front of it, so culling it buys nothing at all and
# costs the one thing it exists for. (Placodus' failure was *two separate tubes* parting at the back
# of the mouth, which is a different fault and is what the single skinned lining fixes.)
mouth_mat = T.inward_material(NAME + ' mouth interior', (.30, .13, .115, 1))
mouth_mat.use_backface_culling = False
# Behind the hinge, not level with it: a lining that stops at the cut plane leaves the wedge at the
# corner of the mouth, which is the last thing a gape proof sees.
MOUTH_BACK = HINGE_Y + .018
MOUTH_FRONT = MOUTH_FRONT_Y


def _raw_section(y):
    """Floored against the head, not tapered to nothing: a tube that tapers with the snout is a
    thread by the time it reaches the front, and the jaw then swings past it."""
    e = T.smooth((MOUTH_BACK - y) / .012) * T.smooth((y - MOUTH_FRONT) / .004)
    w = max(mouth_half_width(y) - .0004, .0012) * (.94 + .06 * e)
    # **Deep enough to sit inside the mandible, not on it.** At 0.30 of the head's half depth the
    # lining's floor landed within a pixel of the mandible's own inner surface and the two stippled
    # against each other along the whole jaw line -- 409 magenta pixels through a band ten pixels
    # tall. The floor belongs below the skin it is lining, in the flesh of the jaw.
    # Deep enough to sit inside the mandible rather than stipple against it, and **no deeper than
    # the head allows**: asking for more than the flesh holds sends the per-vertex fit collapsing
    # the floor towards the axis, the tube turns over, and the band above the floor ends up facing
    # away -- which culls to background inside the mouth, 508 pixels of it.
    h = max(min(head_half_depth(y) * .52, mouth_half_depth(y) * .62), .0035) * (.72 + .28 * e)
    return w, h


LINING_FIT = {}
LINING_POWER = 2.6


def mouth_section(y):
    """The raw section, unfitted. **The fitting is per vertex** (`fit_lining_point` below), not per
    ring: shrinking a ring by one factor couples its width to its height, and on this head that is
    a hole. A floor set deep enough to sit inside the mandible rather than stipple against it took
    the *width* down to 0.68 of the mouth's own, the far wall stopped short of the mandible's rim,
    and the gape showed background down the whole jaw line."""
    w, h = _raw_section(y)
    LINING_FIT[round(float(y), 5)] = [round(w, 5), round(h, 5)]
    return w, h


def fit_lining_point(p, y):
    """Pull one ring vertex back along its own radius until it is inside the skin.

    Only safe because this generation has **no modelled mouth**: where a cavity is modelled a point
    in the lumen is outside the closed shell and this test reads backwards, which is why Birgeria's
    lining is sized from its cast section alone and never fitted."""
    c = Vector((cx(y), y, seam(y)))
    d = Vector(p) - c
    for k in range(12):
        q = c + d * (1. - k * .035)
        if depth(q) > .0006:
            return q
    # **Clamped, and the clamp matters.** A vertex allowed to collapse towards the axis crosses its
    # neighbours, the quad between them inverts, and the tube's surface faces away from the camera
    # right where the mouth is widest open. A sixth of the radius is as far as any vertex may move.
    return c + d * .615


def lining_jaw_blend(p):
    """**Steep, and with no taper at the front.** The ring's widest points sit at the seam, and with
    a gentle blend they take half the jaw's rotation while the jaw takes all of it, so the lining's
    silhouette lags the mandible and a wedge opens between them. Fading the share towards the snout
    closes the tube in the weight field as well as in the geometry and leaves the lining's floor
    behind when the mandible drops; the tube is closed by its cap, not by its weights."""
    _w, h = mouth_section(p.y)
    # **The changeover is above the lip, not at it.** Centred on the seam, the ring's equator takes
    # half the jaw's rotation while the mandible's cut rim takes all of it, so the rim ends up below
    # the lining's widest point and a wedge opens between them -- which is what the gape proof saw
    # stippled along the whole jaw line at the drive, 489 pixels of it, and nowhere else in the clip.
    # Everything at and below the mouth line now follows the mandible outright and the stretch is
    # carried by the band above it, inside the mouth where nothing can see it.
    t = T.smooth(.5 + 1.6 * ((seam(p.y) + .45 * h) - p.z) / max(h, 1e-6))
    # **No taper at the back either.** Fading the jaw's share towards the rear cap leaves the
    # lining's floor behind at the corner of the mouth while the mandible's inner surface swings
    # down past it -- and that surface, seen from inside, is backfacing, so the culled pass shows
    # background straight through it. The cap sits within two hundredths of the hinge, where
    # following the jaw means rotating about a point almost on top of it, so it costs nothing.
    return t


# How much head there is round the mouth line at each station. **This is what the palate and the
# floor are each sized to fill**, and it is the difference between two shells and one sac: the
# measured cavity of a shut mouth is much narrower than the head that holds it, so two shells drawn
# to the lumen alone leave a gap either side of them and a ray into the gape passes between them and
# hits the inside of the far cheek. The sac's stretching wall used to stand across exactly that line.
# Cast inwards from outside the animal, on the closed intake surface before the jaw comes off --
# see `T.mouth_room` for why outwards is wrong wherever a generation models a real oral cavity.
_room_cache = {}


def mouth_room(_y):
    k = round(_y, 5)
    if k not in _room_cache:
        _room_cache[k] = T.mouth_room(bvh_auth, Vector((cx(_y), _y, seam(_y))),
                                      Vector((1, 0, 0)), Vector((0, 0, 1)),
                                      limit=.20, fallback=.02)
    return _room_cache[k]


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, lining_jaw_blend, mouth_mat,
                              # A squircle, not an ellipse: see `T.lining`. An ellipse narrows
                              # towards its floor, and at the height the mandible's rim reaches at
                              # full gape it was a fraction of the mouth's width.
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

# **No authored dentition.** The generation carries its own tooth relief along the jaw margins and
# the only thing this build does about the teeth is check that the measured cut does not saw
# through one, which is the fault Placodus shipped.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.66)
# Long enough in y to straddle the cut plane, because that corner is where the mandible's rear
# rim, the throat and the lining all meet and the wedge between them is what opens at full gape.
# **Centred on the head's own section, not on the mouth line.** Put half way between the seam and
# the axis it reached z 0.014 at the bottom while the jaw's underside is at -0.01, so the mandible's
# rear cut was open below it: through the gap between an open jaw and the throat you saw the inside
# of the jaw's lower corner, backfacing, with nothing behind it. 125 magenta pixels, at the drive
# and only at the drive, and no change to the lining moved them because they were never the mouth.
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
print('RHAE_HINGE', json.dumps({'fit': HINGE_FIT, 'r': list(HINGE_R), 'centre': list(HINGE_CENTRE)}))
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
    # **Full weight below the mouth line, not half.** At 0.5 the envelope lags the mandible by half
    # its rotation, and the corner of the mouth -- where the mandible's rear rim, the throat and the
    # lining all meet -- opens anyway: 125 magenta pixels at the drive and nowhere else. The lower
    # half of the envelope is the mandible's, the upper half the skull's, which is what the envelope
    # is for.
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
    # **The lining is exempt, and `T.mouth_room` is why.** `depth()` is a nearest-surface probe, so
    # a palate filling the head out to the skin reads as broken skin wherever the generation models
    # a real oral cavity: the nearest surface there is the lumen's own wall, not the cheek. What the
    # shells are held inside is the head's own **measured section**, which uses no normals, and the
    # thing that proves the mouth is `gape-solid.py`. The probe is still recorded.
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
            body.location.y = .12 * cock - .46 * drive
            body.rotation_euler.x = .10 * cock - .09 * drive
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
                # The neck is what puts the head on the prey: it cocks back into an S and unrolls.
                if n.startswith('neck') or n == 'skull':
                    z += .34 * cock * (1 if i % 2 == 0 else -.6) * strike
                    z -= .26 * drive * strike
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
            pb['skull'].rotation_euler.x += (-.16 * cock + .24 * drive) * strike
            for n in ('neck_00', 'neck_01', 'neck_02', 'neck_03'):
                pb[n].rotation_euler.x += (-.10 * cock + .14 * drive) * strike
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
        'liningCoverage': mouth_cover, 'liningFitFactors': LINING_FIT,
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
