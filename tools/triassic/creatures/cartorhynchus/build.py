"""Rebuild Cartorhynchus: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first -- head at -Y, up +Z, one unit
long -- and `export_yup` then puts the head at glTF +Z, where every shipped body in this
repository keeps it.

Cartorhynchus is the amphibious one and the odd one out of these four in exactly one way: **its
limbs do the work**. The other three carry their paddles as control surfaces and drive with the
tail; this animal has the shortest trunk, the heaviest ribs (pachyostosis is ballast, not
armour), and flipper-wrists so poorly ossified that Motani et al. read them as bending like a
sea turtle's -- so the research's reading is anguilliform at slow speed, *paddle-assisted*, and
a body that hauls out. So the forelimbs here take a real stroke in `Swim`, and the signature clip
is `Haul`: the flipper-walk that gets it up the shell beds and, in life, out of the water.

Its ability is the roster's `suctionSnap`, and that is also what the fossils say -- a very short
snout with edentulous tips and a big hyoid, which is a suction feeder's kit. So `Ability` is a
gape that opens *fast* and shuts on nothing, rather than a bite that closes on something.

Writes only this species' asset family. Touches no shared registry and performs no git operation.
"""
import bpy, bmesh, math, json, os, sys, hashlib, shutil
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                        # noqa: E402

ID = 'cartorhynchus'
NAME = 'Cartorhynchus'
SPECIES = 'C. lenticarpus'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 3.0
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH        # 4 % of body length, per the pipeline
ANCHOR_TOLERANCE = .02 * BODY_LENGTH          # 2 % of body length
PUPPET_TRIANGLE_TARGET = 6400
VOXEL = .0042
THIN, THIN_BAND = .030, .012

# Everything here is shorter and faster than the giant's: a metre-long animal beats at several
# times the rate of an eighteen-metre one, and a clip set that did not say so would make the two
# read as the same creature at two sizes.
CLIPS = {'Idle': 2.4, 'Swim': 1.4, 'Sprint': .9, 'TurnLeft': 1.2, 'TurnRight': 1.2,
         'Dive': 1.2, 'Rise': 1.2, 'Attack': .8, 'Bite': .4, 'Heavy': 1.0, 'Hit': .5,
         'Death': 1.6, 'Guard': 1.1, 'Parry': .35, 'Dodge': .45, 'Eat': 1.4, 'Stagger': 1.1,
         'Ability': .7, 'Grab': 1.0, 'Breath': 2.0, 'Growth': 1.2,
         'Haul': 1.6, 'Breathe': 2.8}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe', 'Haul']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(RAW, NAME + ' authored body')
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.66)
skin_material.use_backface_culling = False    # the backstop under the mouth lining, see below
frame = T.measure_frame(auth, head_is_positive_pca=True, luminance_at=luminance_at)
# Anything this build authors wears the creature's own texture, sampled through the generation's
# UVs at the nearest point of the intake surface. Snapshot it now, before any cut.
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


# ------------------------------------------------------------- the paddles, as measured ----
# Nothing here types a station. The blades are found by connectivity on the measured shell
# thickness and classified by where they sit; this generation's left pectoral is 0.045 of a body
# further back than its right and hangs 0.15 lower, which is the pose the generation came in and
# not something a symmetric pair of typed coordinates would have survived.
clusters = T.thin_clusters(auth, thin_mask, cx, cz)
LIMBS, caudal_cluster, other = {}, None, []
for c in clusters:
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    lateral = abs(c['centroid'][0] - cx(mid))
    if c['reachRadius'] > .15 and lateral > .04:
        key = ('pec' if mid < 0 else 'pel') + ('L' if c['centroid'][0] < cx(mid) else 'R')
        LIMBS[key] = c
    elif c['yRange'][1] > Y1 - .06:
        caudal_cluster = c
    else:
        other.append(c)
if sorted(LIMBS) != ['pecL', 'pecR', 'pelL', 'pelR']:
    print('CARTO_CLUSTERS', json.dumps(
        {'yRange': [Y0, Y1], 'thin': int(thin_mask.sum()),
         'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters]}))
assert sorted(LIMBS) == ['pecL', 'pecR', 'pelL', 'pelR'], sorted(LIMBS)
assert caudal_cluster is not None, 'the tail blade did not measure'
# The forelimbs are this animal's engine, and the generation makes them enormous: measured, they
# reach further from the axis than the hindlimbs by half again. That is what the research says
# too, and it is why the paddles here stroke where the other three only steer.
FORE_REACH = max(LIMBS['pecL']['reachRadius'], LIMBS['pecR']['reachRadius'])
HIND_REACH = max(LIMBS['pelL']['reachRadius'], LIMBS['pelR']['reachRadius'])
assert FORE_REACH > HIND_REACH, ('the forelimbs should be the larger pair', FORE_REACH, HIND_REACH)

depth, bvh_auth = T.depth_probe(auth)

# --------------------------------------------------------------------- measure the mouth ----
# Placodus' geometric method, and here it works -- just. Every head vertex casts its own outward
# normal back into the mesh, and a vertex that hits is looking across the mouth slit at the lip
# opposite. This generation answers with **26 vertices** on the snout against Placodus' 193 and
# Cymbospondylus' 280, which is what a very short blunt snout with a shallow modelled groove looks
# like rather than a failure: the 26 lie in one band, their mid height moves smoothly from 0.0746
# to 0.0764 over the snout, and their half width and half depth grow and taper as a slit's do. So
# the seam is measured rather than read off the albedo, and the low count is recorded rather than
# hidden. MOUTH_METHOD says which was used.
MOUTH_GAP = .030
CAV = T.mouth_cavity(auth, front_fraction=.30, gap=MOUTH_GAP)
SNOUT_BACK = Y0 + .17
CAV_ON_SNOUT = int((CAV[:, 1] < SNOUT_BACK).sum()) if len(CAV) else 0
MOUTH_METHOD = 'modelled cavity (a shallow groove: 26 vertices on the snout, against 193 on Placodus)'
assert CAV_ON_SNOUT >= 20, ('the mouth cavity did not measure', CAV_ON_SNOUT)
MY, MID, WIDE, TALL = T.cavity_profile(CAV, Y0 + .004, SNOUT_BACK, .0020, .006)
assert len(MY) >= 16, len(MY)
# **The cut follows the measured slit**, not a straight line near it: the head is sheared by
# -seam(y) so the measured curve lands on z = 0, cut there, and unsheared. The slit was measured
# from 26 vertices and is noisy, so the curve is the already-blurred per-station mid height rather
# than the raw one; the straight ramp is still fitted, but only to record what a straight cut would
# have cost.
_MIDC = T.blur1d(MID, 1.2)
_fit = np.polyfit(MY, _MIDC, 1)
MOUTH_SLOPE, MOUTH_INTERCEPT = float(_fit[0]), float(_fit[1])
_residual = _MIDC - np.polyval(_fit, MY)
# Measured against the **head's** local depth, not the slit's own: a groove 0.002 deep would make
# any residual look enormous, and what matters is whether the line is on the head's mouth line.
MOUTH_FIT_WORST = float(np.max(np.abs(_residual)
                               / np.maximum([half_depth(float(y)) for y in MY], 1e-4)))
MOUTH_FIT_WORST_AGAINST_SLIT = float(np.max(np.abs(_residual) / np.maximum(TALL, 1e-4)))
RAMP_DEVIATION_RAW = float(np.max(np.abs(_residual)))
CUT_DEVIATION_RAW = float(np.max(np.abs(MID - _MIDC)))
MOUTH_DISAGREEMENT = 0.


def seam(y):
    """The mouth line: the measured mid height of the cavity itself, lightly smoothed."""
    return float(np.interp(y, MY, _MIDC))


HINGE_Y = float(MY[-1])
JAW_FRONT_Y = float(MY[0])
LIP = [{'y': float(a), 'mid': float(b), 'disagreement': 0.} for a, b in zip(MY, MID)]
# The teeth are documented as rounded, molariform, angled nearly perpendicular to the jaw and
# **invisible in side view** (Huang et al. 2020 found them by CT). The generation carries no
# dentition at all, which agrees with the fossil, and none was authored.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=SNOUT_BACK, floor=.0018)


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


NECK_Y, CHEST_Y, BODY_Y = HINGE_Y + .035, HINGE_Y + .105, HINGE_Y + .235
TAIL_Y = [BODY_Y + .085 + .072 * i for i in range(5)]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
bone('neck', on_axis(NECK_Y), 'chest')
bone('skull', on_axis(HINGE_Y - .012), 'neck')
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .008), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))
CAUDAL_Y = float(np.clip(caudal_cluster['yRange'][0] + .020, TAIL_Y[-2], TAIL_Y[-1]))
bone('caudal_upper', on_axis(CAUDAL_Y, +.020), 'tail_03')
bone('caudal_lower', on_axis(CAUDAL_Y, -.020), 'tail_03')

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind = 'fore' if key.startswith('pec') else 'hind'
    s = key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.016)
    reach = Vector(c['reach'])
    names = ['%s_upper_%s' % (kind, s), '%s_mid_%s' % (kind, s), '%s_tip_%s' % (kind, s)]
    pts = [root, root + (reach - root) * .48, root + (reach - root) * .84, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    parent = 'chest' if kind == 'fore' else 'tail_00'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .012, ('an appendage root is not seated inside the trunk', n, d)
JAW_SEATING = depth(B['jaw'][0])
assert JAW_SEATING > .004, ('the jaw hinge is not seated inside the head', JAW_SEATING)

# ------------------------------------------------------------ skinning by arc length ----
AXIAL_NAMES = ['skull', 'neck', 'chest', 'body'] + ['tail_%02d' % i for i in range(5)]
AXIAL_PTS = [Vector((cx(Y0 + .01), Y0 + .01, cz(Y0 + .01)))] + [B[n][0] for n in AXIAL_NAMES] \
    + [on_axis(Y1 - .004)]
AP, ACUM = T.polyline(AXIAL_PTS)
ASTATION = [(AXIAL_NAMES[i - 1], ACUM[i]) for i in range(1, len(AXIAL_NAMES) + 1)]
LIMB_FIT = {}
for key, pts in LIMB_PTS.items():
    P, cum = T.polyline(pts)
    LIMB_FIT[key] = (P, cum, LIMB_NAMES[key], T.station_weights(ASTATION, T.project(AP, ACUM, P[0])[1]))
# How far off a limb's own polyline the blade reaches, measured from the cluster itself rather
# than guessed: a paddle is wide as well as long, and a radius that is too small leaves its
# trailing edge on the flank bones and tears when the fin strokes.
#
# **The percentile is the 92nd, not the 55th, because these paddles are the engine.** The marine
# kit's figure leaves nearly half a blade on a partial alpha, which nobody notices on a fin that
# steers. This animal's forelimbs take a real stroke -- the audit measures them at 1.29 times the
# tail tip's travel -- and at the 55th the right one came apart: `skin-tears.mjs` read 5.17x in
# `Sprint` with `fore_mid_R`, `chest`, `fore_tip_R` and `fore_mid_L` heading the torn-edge list,
# and the blade's own internal edges ran from 3.95x stretched to 0.026 of their rest length in the
# same clip. A blade that stretches fourfold in one place and collapses to a fortieth in another is
# the paddle "mushing together" rather than moving as a whole. Rhaeticosaurus' flippers, sweeping
# 130 degrees, needed the same correction and went from 7.9x to 2.81x on it. The shore kit
# takes the 99th once its flood has said what the limb is, and that is the figure this animal
# wants too: 5.17x at the 55th, 4.63x at the 92nd, 3.72x here.
LIMB_RADIUS = {}
LIMB_BLEND = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    LIMB_RADIUS[key] = (float(np.quantile(d, .99)), float(np.quantile(d, .995)) + .012)
    # **The blend at a joint is a fraction of the segments that joint joins, never a number.** The
    # constant here was 0.055 on a limb whose three segments are 0.48, 0.36 and 0.16 of its own
    # length -- so the band was *wider than the whole tip segment*, `limb_chain` handed every
    # vertex on the paddle all four joints at nearly one weight, that busts the four-influence
    # budget once the root station is added, and `relax_weights` trims a different four on
    # neighbouring vertices. That is a discontinuity no amount of relaxation can smooth, because
    # the relaxation is what makes it.
    seg = [cum[i + 1] - cum[i] for i in range(len(cum) - 1)]
    LIMB_BLEND[key] = [max(min(seg[k - 1], seg[k]) * .35, 1e-4) for k in range(1, len(seg))]


def limb_chain(names, cum, s, blends):
    """Which bone of a three-joint limb owns arc length `s`, blended over **each joint's own**
    width. `T.limb_chain` takes one number for every joint, and on a paddle whose segments run
    0.48, 0.36 and 0.16 of its length one number cannot be right at both ends."""
    tl = T.smooth((s - (cum[1] - blends[0])) / (2 * blends[0]))
    tp = T.smooth((s - (cum[2] - blends[1])) / (2 * blends[1]))
    return {names[0]: 1 - tl, names[1]: tl * (1 - tp), names[2]: tl * tp}


def limb_weights(q, thin):
    # **Geometry, not thickness.** A paddle is what lies within its own measured radius of its own
    # measured axis, past the seat; a shell-thickness threshold says the same thing most of the
    # time and then disagrees on the leading edge, where a blade is thick. The relaxation below
    # would cover a gate that is only slightly wrong, but a gate that is wrong by a whole limb is
    # not something to smooth over.
    best, chosen = 0., None
    for key, (P, cum, names, rootw) in LIMB_FIT.items():
        dist, s = T.project(P, cum, q)
        rin, rout = LIMB_RADIUS[key]
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else T.smooth(1 - (dist - rin) / (rout - rin)))
        # The seat: how far along the limb its own bones take over from the trunk. At 0.42 of the
        # chain this ramp covered the whole humerus segment, so the proximal half of the paddle was
        # a blend of trunk and limb at every vertex -- `fore_upper_L` was dominant on 161 of the
        # 1,679 vertices it touched. The kit's seat on a flipper that reaches 0.30 from the axis is
        # 0.045; 0.18 of this chain is the same figure on this animal.
        alpha *= T.smooth(s / max(cum[-1] * .18, 1e-6))
        if alpha > best:
            best = alpha
            chosen = (limb_chain(names, cum, s, LIMB_BLEND[key]), rootw,
                      min(1., s / cum[-1]))
    return (best, *chosen) if chosen else None


def caudal_weights(q, thin):
    """The caudal lobes lag the peduncle, which is what makes a tail fin read as a fin rather than
    a plate bolted to the last joint. The lobe is taken by height off the measured axis."""
    if q.y < caudal_cluster['yRange'][0] - .01:
        return None
    d = q.z - cz(q.y)
    lobe = 'caudal_upper' if d > 0 else 'caudal_lower'
    g = T.smooth((abs(d) - .012) / .030) * T.smooth((q.y - caudal_cluster['yRange'][0]) / .03)
    return ({lobe: 1.}, g) if g > 0 else None


def weights(p, thin):
    q = Vector(p)
    w = dict(T.station_weights(ASTATION, T.project(AP, ACUM, q)[1]))
    limb = limb_weights(q, thin)
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
    cf = caudal_weights(q, thin)
    if cf:
        chain, g = cf
        w = {n: v * (1 - g) for n, v in w.items()}
        for n, v in chain.items():
            w[n] = w.get(n, 0.) + v * g
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    total = sum(v for _, v in items)
    return {n: v / total for n, v in items}



# ------------------------------------------- how posed is the generation, measured ----
# Two numbers a later pass needs and that are far cheaper to take while the body is open: how far
# the generation's own rest pose is from neutral, run by run, and how far its paired limbs are
# from being each other mirrored. See `curvature_over_section` for what the ratio means.
def _section_radius(y):
    return (half_width(y) + half_depth(y)) / 2


POSE_DEVIATION = {
    'spine': T.curvature_over_section([B[n][0] for n in AXIAL_NAMES], _section_radius),
    'neckAndHead': T.curvature_over_section(
        [B[n][0] for n in ('skull', 'neck', 'chest', 'body')], _section_radius),
    'tail': T.curvature_over_section(
        [B[n][0] for n in AXIAL_NAMES if n.startswith('tail_')], _section_radius),
}
LIMB_ASYMMETRY = T.limb_asymmetry(LIMB_PTS, cx, 1.)

# ------------------------------------------------------------------ procedural twin ----
puppet, puppet_thickness, twin_report, bvh_src = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', VOXEL, PUPPET_TRIANGLE_TARGET,
    sample_albedo, thin=THIN, band=.020, roughness=.70, blade_dilation=.0028)

# --------------------------------------------------------------------- cut the jaw ----
def is_jaw(c):
    return JAW_FRONT_Y - .004 < c.y < HINGE_Y and c.z < seam(c.y) - 1e-7


parts = {}
for o in (auth, puppet):
    T.bisect_on_curve(o, seam, HINGE_Y, JAW_FRONT_Y - .004, margin=.03)
    T.split_part(o, 'lower jaw', is_jaw, parts)

# Every measured tooth patch must belong whole to one jaw or the other. Placodus' first delivery
# cut its chisels in half with a straight ramp; the measurement is what stops that happening here.
tooth_report = []
for g in PATCHES:
    q = SNOUT_CO[g]
    below = sum(1 for c in q if is_jaw(Vector((float(c[0]), float(c[1]), float(c[2])))))
    tooth_report.append({'vertices': len(g), 'proudMax': float(PROUD[g].max()),
                         'y': [float(q[:, 1].min()), float(q[:, 1].max())],
                         'onJaw': int(below), 'onSkull': int(len(g) - below)})
straddling = [t for t in tooth_report if t['proudMax'] >= .0055 and 0 < t['onJaw'] < t['vertices']]

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
for o, thin in ((auth, thickness), (puppet, puppet_thickness)):
    lookup = {}
    for i, v in enumerate(o.data.vertices):
        lookup[i] = float(thin[i]) if i < len(thin) else THIN * 2
    for n in B:
        o.vertex_groups.new(name=n)
    # Every gate in `weights()` -- the blade threshold, the limb radius, the height off the axis --
    # is a per-vertex decision, and two vertices a hundredth of a body apart can fall either side of
    # one. The first build of this body did exactly that out on the right forefin and
    # `skin-tears.mjs` read a 23x edge stretch off it. So the field is **relaxed over the mesh's own
    # edge graph** before it is written: a weight field that is smooth on the surface cannot tear
    # it, whatever the gates decided.
    raw_weights = [weights(v.co, lookup[v.index]) for v in o.data.vertices]
    relaxed = T.relax_weights(o, raw_weights, passes=34, hold=.45)
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
# One lining, wound inwards and *skinned*: the roof follows the skull, the floor follows the jaw
# and the wall between them stretches, so no opening the clips reach can part it. Both worked
# examples shipped two split tubes that opened a wedge at the back of the mouth, and because the
# source material culls its backfaces, what showed through that wedge was the far side of the head.
mouth_mat = T.inward_material(NAME + ' mouth interior', (.30, .13, .115, 1))
MOUTH_BACK = HINGE_Y - .004
MOUTH_FRONT = JAW_FRONT_Y + .006
LINING_INSET = .88


# The centreline table is 61 stations over a whole body, smoothed five wide, and that is too
# coarse for a rostrum that tapers to nothing: it reads the snout wider than it is, and a lining
# sized from it comes out through the lip. So the head gets its own fine profile.
_HY = np.linspace(Y0 + .002, HINGE_Y + .02, 48)
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
_HW = np.array(_HW)
_HD = np.array(_HD)


def head_half_width(y):
    return float(np.interp(y, _HY, _HW))


def head_half_depth(y):
    return float(np.interp(y, _HY, _HD))


def _raw_section(y):
    # **Floored, not tapered to nothing.** A tube that tapers with the snout is a thread by the
    # time it reaches the front, and the jaw then swings past it: from the side you see straight
    # between the jaws either side of the thread, which is what the first measured pass caught.
    e = T.smooth((MOUTH_BACK - y) / .012) * T.smooth((y - MOUTH_FRONT) / .004)
    w = max(head_half_width(y) * LINING_INSET, .0020) * (.58 + .42 * e)
    h = max(head_half_depth(y) * LINING_INSET * .62, .0018) * (.45 + .55 * e)
    return w, h


def mouth_section(y):
    """The measured cavity here is a shallow groove two thousandths deep, far too thin to size a
    lining from, so the section comes off the **head's own** fine radius profile instead and the
    cavity is used only to place the seam.

    Then it is *fitted*: the ring is shrunk station by station until every point on it is inside
    the closed intake surface. On a body whose mouth is a real open lumen that test reads backwards
    -- a point in the lumen is outside the closed shell -- but a groove this shallow has no lumen
    to speak of, and the fit does what it says.
    """
    w, h = _raw_section(y)
    for step in range(10):
        k = 1. - step * .08
        pts = [Vector((cx(y) + w * k * cos(a), y, seam(y) + h * k * sin(a)))
               for a in np.linspace(0, 2 * pi, 12)]
        if min(depth(q) for q in pts) > .0012:
            return w * k, h * k
    return w * .2, h * .2


def lining_jaw_blend(p):
    w, h = mouth_section(p.y)
    # **Steep, not linear.** The ring's widest points sit at the seam, and with a gentle blend they
    # take half the jaw's rotation while the jaw takes all of it -- so from the side the lining's
    # own silhouette lags the mandible and a wedge of background opens between them. That is what
    # the first measured pass was counting. At 1.6 the whole lower half of the ring goes with the
    # jaw and only the two vertices exactly on the seam are shared.
    t = T.smooth(.5 + 1.6 * (seam(p.y) - p.z) / max(h, 1e-6))
    return t * T.smooth((MOUTH_BACK - p.y) / .012) * T.smooth((p.y - MOUTH_FRONT) / .006)


# The oral shells use the intact head room rather than the narrow closed mouth slit.
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
                              rings=26, ring=14, centre_x=cx, room=mouth_room)
oralparts = [lining]
# What went wrong on both worked examples is a lining narrower than the mouth, so that is what
# is checked: across the stations the lip was measured at, the lining carries the head's own
# section rather than a ribbon up the middle of it.
mouth_cover = []
for r in LIP:
    y = float(r['y'])
    if not MOUTH_FRONT + .006 < y < MOUTH_BACK - .012:
        continue
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(head_half_width(y), 1e-9), 3),
                        round(h / max(head_half_depth(y), 1e-9), 3)])
    # The front fifth of the rostrum is nearly solid -- a mouth there is a slit, not a cavity --
    # so the width check runs over the body of the mouth and lets the tip taper. The bar is 0.45
    # rather than 0.9 because the lining is the largest ellipse that fits **at the mouth's own
    # height**, and the mouth sits about a third of a radius below the section's widest point, so
    # the head is narrower there than its half width says. What the hole is actually worth is
    # measured, not asserted: see the see-through numbers in the README.
    if y > MOUTH_FRONT + .025:
        assert w >= head_half_width(y) * .45, ('the oral lining is narrower than the head', y, w)
    assert h >= .0012, ('the oral lining is flat', y, h)

# **No authored dentition.** A Tripo body is worked, not authored: the generation's surface detail
# is beyond what hand modelling here would match, and CLAUDE.md allows a tooth only as an exception
# that has to justify itself. This generation already carries its own tooth relief along the jaw
# margins -- `protrusions()` finds it and `toothPatches` in validation.json records every patch --
# so the row that ships is the generated one, and the only thing this build does about the teeth is
# check that the measured cut does not saw through one, which is the fault Placodus shipped.
tooth_rows = []

# A closed envelope round the hinge, covering the square the cut leaves at the back of the
# mandible: that face swings into view the moment the mouth opens and is flat skin with the
# texture drawn across it. Placodus shipped one too small and read as a pale block at full gape.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.7)
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .010, (seam(HINGE_Y) + cz(HINGE_Y)) / 2)
HINGE_R = (half_width(HINGE_Y) * .84, .030, half_depth(HINGE_Y) * .84)
# Fit it rather than type it: the envelope is grown to the largest ellipsoid that still lies
# inside the closed intake surface everywhere, so it covers the cut face without breaking the
# cheek. Placodus shipped one too small and read as a pale block at full gape.
HINGE_FIT = 0.
for step in range(24):
    k = 1. - step / 24
    probe = [Vector((HINGE_CENTRE[0] + HINGE_R[0] * k * math.sin(b) * math.cos(a),
                     HINGE_CENTRE[1] + HINGE_R[1] * k * math.sin(b) * math.sin(a),
                     HINGE_CENTRE[2] + HINGE_R[2] * k * math.cos(b)))
             for a in np.linspace(0, 2 * pi, 20) for b in np.linspace(0, pi, 11)]
    if min(depth(q) for q in probe) > .0035:
        HINGE_FIT = k
        break
assert HINGE_FIT > .3, ('the hinge envelope could not be seated', HINGE_FIT)
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
    t = max(0., min(1., (seam(HINGE_Y) * SCALE - v.co.z) / (.040 * SCALE)))
    hinge.vertex_groups['jaw'].add([v.index], t * .5, 'REPLACE')
    hinge.vertex_groups['skull'].add([v.index], 1 - t * .5, 'REPLACE')
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
    # A loose bound, and deliberately so. Placodus records why: a point in the **lumen** of a
    # modelled mouth is outside the closed shell, so a nearest-surface test reads backwards
    # exactly where the lining lives. This catches gross errors -- a lining built on the file's
    # midline instead of the measured one came out at -0.019 here -- and the real check on the
    # gape is the measured see-through in mouth-views.py.
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
SNOUT_Y = Y0 + .012
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, seam(SNOUT_Y) - .006), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .05), HINGE_Y - .05, seam(HINGE_Y - .05)), 'swallow'),
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .006, seam(SNOUT_Y) + .004), 'attack'),
}
anchors = [{'name': n, 'bone': b, 'point': list(tx(p)), 'role': r}
           for n, (b, p, r) in ANCHOR_POINTS.items()]
anchor_checks = {}
for n, (b, p, r) in ANCHOR_POINTS.items():
    hit = bvh_auth.find_nearest(Vector(p))
    anchor_checks[n] = {'nearestSurfaceRaw': float(hit[3]),
                        'nearestSurfaceUnits': float(hit[3] * SCALE),
                        'fractionOfBodyLength': float(hit[3] * SCALE / BODY_LENGTH)}
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


# The undulating chain, head to tail. An eel-bodied ichthyosaur carries real amplitude at mid-body
# -- that is what anguilliform means and what separates this animal from Shonisaurus, whose beat
# is confined to the peduncle -- so the gain curve starts at 0.16 by the shoulder rather than at
# nothing, and the wave takes a whole body length to run down it.
CHAIN = ['neck', 'chest', 'body'] + ['tail_%02d' % i for i in range(5)]
# An eel carries more than one wavelength on its body at once, and that is the difference the
# reviewer can see: a thunniform swimmer is a stiff plank with a beating peduncle, and this animal
# is not one. The lag runs 8.0 radians over the chain -- about 1.3 wavelengths from shoulder to
# tail tip -- and the gain starts at 0.14 by the neck rather than at nothing.
# A short body undulating gently while the forelimbs row. The wave is anguilliform in shape --
# the whole trunk takes part, because there is not much trunk -- but small, because on this animal
# it is the assist and the paddles are the drive.
WAVE_SPAN = 2.4          # radians of phase from the neck to the last caudal joint
GAIN = [.22 + .78 * (i / 7) ** 1.5 for i in range(8)]
LAG = [WAVE_SPAN * i / 7 for i in range(8)]
CAUDAL_LAG = WAVE_SPAN + .70     # the lobes trail the peduncle
# The stroke. `row` is the forelimb cycle: a long power phase sweeping back and down, a quick
# feathered recovery, and the hind pair a third of a beat behind. This is the one animal of the
# four whose paddles are an engine rather than a rudder.
ROW_LAG = {'pec': .0, 'pel': 2.1}
FORE = [k for k in LIMB_NAMES if k.startswith('pec')]
HIND = [k for k in LIMB_NAMES if k.startswith('pel')]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}


def ramp(u, a, b, p=1.):
    """0 before a, 1 after b, with p > 1 holding it back and then letting go."""
    return T.smooth((u - a) / max(b - a, 1e-6)) ** p


def spike(u, a, b, p=1.):
    """A one-way pulse that starts and ends at nothing; p > 1 narrows it in place, which is what
    makes a strike read as committed rather than as a swell."""
    if u <= a or u >= b:
        return 0.
    return (sin(pi * (u - a) / (b - a)) ** 2) ** p


seams, bounds, limb_sweep = {}, {}, {}
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

        # --- how hard and how fast the body is working
        amp = {'Idle': .26, 'Swim': 1.0, 'Sprint': 1.45, 'Eat': .34, 'Guard': .20, 'Grab': .30,
               'Breath': .34, 'Breathe': .30, 'Growth': .24, 'Dodge': 1.10, 'Haul': .55,
               'Ability': .45}.get(clip, .30)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1., 'Dodge': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            # A **loop swings both ways.** The `- sin(-LAG[i])` term is what makes a one-shot start
            # and end at rest, and on a looping clip it is a static offset as large as the
            # amplitude itself: the first render sheet showed the body bent to one side at every
            # phase of Swim and straight at the seam, which is an animal cruising with a permanent
            # kink rather than one undulating. Loops get the pure sine; one-shots keep the offset.
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        # --- the shapes each performance is actually built out of
        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy') else 0.
        drive = ramp(u, .30, .46, 2.2) * (1 - ramp(u, .62, 1., 1.)) if clip in ('Attack', 'Heavy') else 0.
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy') else 0.
        # **Suction**: the gape opens faster than it shuts and the head is pulled back a little as
        # it does, which is the whole of a suction snap. Nothing closes on anything.
        suck = ramp(u, .08, .17, 2.6) * (1 - ramp(u, .24, .56, 1.2)) if clip == 'Ability' else 0.
        # **Haul**: the flipper-walk. Both pairs plant, the body is levered forward over them,
        # and the belly drags -- this is the one animal on the roster that can get out of the
        # water, and the clip is the gait that does it.
        plantF = max(0., sin(pi * (u - .05) / .5)) ** 1.4 if clip == 'Haul' else 0.
        plantH = max(0., sin(pi * (u - .35) / .5)) ** 1.4 if clip == 'Haul' else 0.
        heave = max(0., sin(pi * (u - .18) / .46)) ** 1.8 if clip == 'Haul' else 0.
        cstart = launch = 0.
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws. The gape is timed to the strike, not to the button: it parts on the cock,
        # is widest as the body unrolls, and shuts on the follow-through, which is the frame the
        # prey is in.
        gape = .02 * (1 - cos(p)) * (1 if clip in ('Idle', 'Swim', 'Sprint') else 0)
        if clip == 'Bite':
            # A third of a second, and the whole of it is the snap: open hard, shut harder, so
            # half the snout's travel falls inside a quarter of the clip.
            gape = .56 * ramp(u, .04, .22, 1.6) * (1 - ramp(u, .28, .46, 2.2))
        elif clip == 'Attack':
            gape = .30 * cock + .48 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            gape = .34 * cock + .60 * ramp(u, .24, .46, 1.7) * (1 - ramp(u, .50, .70, 1.4))
        elif clip == 'Haul':
            gape = .05 * heave
        elif clip == 'Ability':
            gape = .62 * suck
        elif clip == 'Grab':
            gape = .10 + .05 * haul
        elif clip == 'Eat':
            gape = .34 * (1 - cos(p * 2)) * .5 + .10
        elif clip == 'Breath':
            gape = .10 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            gape = .05 * (1 - cos(p))
        elif clip in ('Hit', 'Stagger'):
            gape = .28 * e
        elif clip == 'Death':
            gape = .22 * dead
        elif clip == 'Guard':
            gape = .03 * (1 - cos(p))
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.10 * gape

        # --- the trunk. `body` is the pivot, so its own sway is taken back out in front of it or
        # the snout swings further than the tail does.
        body = pb['body']
        body.rotation_euler.y = .06 * amp * wave(2, beat)
        body.location.z = .012 * amp * wave(2, beat)
        body.rotation_euler.z += .22 * turn
        body.rotation_euler.y += .30 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .30 * e
        if clip in ('Attack', 'Heavy'):
            # weight back on the cock, and thrown forward as the chain unrolls
            body.location.y = .14 * cock - .46 * drive
            body.rotation_euler.x = .10 * cock - .09 * drive
            body.rotation_euler.z += .10 * cock - .05 * drive
        if clip == 'Ability':
            # The head is drawn back as the mouth opens: prey comes to the animal, not the animal
            # to the prey, and a suction feeder that lunges is a biter.
            body.location.y = .10 * suck
        if clip == 'Haul':
            body.location.y = -.62 * heave
            body.location.z = .12 * heave - .04
            body.rotation_euler.x = -.10 * heave + .06
            body.rotation_euler.z = .07 * (plantF - plantH)
        if clip == 'Ability':
            body.location.y = .10 * cock - .30 * drive - .06 * e
            body.rotation_euler.y = .20 * e * sin(p * 2)
        if clip == 'Bite':
            body.location.y = -.16 * ramp(u, .06, .30, 2.) * (1 - ramp(u, .55, .95, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.34 * e
            body.rotation_euler.z = .20 * e
        if clip == 'Guard':
            body.rotation_euler.x = .04 * (1 - cos(p))
            body.rotation_euler.y = .03 * sin(p)
        if clip == 'Dodge':
            body.rotation_euler.y = .55 * e
            body.rotation_euler.z = -.44 * e
            body.location.x = .34 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .22 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .26 * e
            body.location.y = .12 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.22 * (e if clip == 'Breath' else .5 + .5 * cos(p) * 0 + .5)
            body.location.z = .10 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Grab':
            body.location.y = -.10 - .08 * haul
            body.rotation_euler.y = .12 * sin(p * 3)
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        body.rotation_euler.y += 2.6 * dead
        body.rotation_euler.x += .16 * dead
        body.location.z -= .26 * dead

        # --- the travelling wave, and the strike that runs down the same chain
        chain_z = {}
        for i, n in enumerate(CHAIN):
            q = pb[n]
            z = .080 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.018 + i * .009)
            z += .040 * dead * sin(i * .8)
            if clip == 'Haul':
                z += .10 * (i / 7) * (plantF - plantH)
            if clip in ('Attack', 'Heavy'):
                # Anticipation is a lateral S loaded from the tail forward; the drive unrolls it
                # head-last so the thrust arrives at the shoulder after the tail has made it.
                lead = .10 + .020 * i
                z += .30 * GAIN[i] * spike(u, .02 + lead * .25, .44 + lead * .25, 1.5) * (1 if i % 2 == 0 else -.55)
                z -= .34 * GAIN[i] * ramp(u, .24 + lead * .5, .46 + lead * .5, 2.0) * (1 - ramp(u, .60, .92, 1.))
            if clip == 'Dodge':
                z += .20 * e * sin(i * .55 + .6)
            if clip == 'Bite':
                z += .10 * GAIN[i] * spike(u, .05 + .02 * i, .55 + .02 * i, 1.8)
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 4 else -.5)
            q.rotation_euler.z += z
            chain_z[n] = z
            q.rotation_euler.y += .020 * GAIN[i] * amp * wave(i, beat)
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .030 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and i < 3:
                q.rotation_euler.x = -.10 * (e if clip == 'Breath' else 1.)
        # The head is the quiet end. A fish holds its braincase on the line of travel while the
        # body waves under it, so the skull takes back most of what the chain in front of the
        # pivot has added -- measured from the joints themselves rather than from one hand-tuned
        # constant, because the wave's amplitude changes clip by clip.
        forward_yaw = body.rotation_euler.z + chain_z.get('chest', 0.) + chain_z.get('neck', 0.)
        pb['skull'].rotation_euler.z += -.86 * forward_yaw + .12 * turn
        if clip in ('Attack', 'Heavy'):
            pb['skull'].rotation_euler.x += -.14 * cock + .20 * drive
            pb['neck'].rotation_euler.x += -.08 * cock + .10 * drive
        if clip == 'Ability':
            pb['skull'].rotation_euler.x += -.16 * suck
            pb['neck'].rotation_euler.x += -.08 * suck
        if clip == 'Haul':
            pb['skull'].rotation_euler.x += -.14 * heave
            pb['neck'].rotation_euler.x += -.08 * heave
        if clip == 'Ability':
            pb['skull'].rotation_euler.x += .10 * drive + .06 * e * sin(p * 4)
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .12 * sin(p * 2)
            pb['neck'].rotation_euler.x += -.10 * sin(p * 2)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul
            pb['neck'].rotation_euler.x += -.06 * haul

        for lobe, sgn in (('caudal_upper', 1.), ('caudal_lower', -1.)):
            q = pb[lobe]
            lobe_wave = (sin(p * beat - CAUDAL_LAG) - (0. if loop else sin(-CAUDAL_LAG))) * env
            q.rotation_euler.z = .22 * amp * lobe_wave + .020 * turn
            q.rotation_euler.x = sgn * .07 * amp * lobe_wave
            q.rotation_euler.z += .06 * dead * sgn

        # --- the paddles are control surfaces, not oars. An ichthyosaur's forefin sets pitch and
        # roll and it brakes; it never takes a stroke.
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            fore = key.startswith('pec')
            up = pb[names[0]]
            # The **stroke**. A long power phase sweeping back and down and a quick feathered
            # recovery: `pw` is one and `rec` the other, and the hind pair runs a third of a beat
            # behind the fore. This is the one animal of the four that rows.
            ph = p * beat - ROW_LAG['pec' if fore else 'pel']
            stroke = sin(ph)
            feather = max(0., -cos(ph))
            # The stroke's reach is the animal's, not the clip's energy: a paddle sweeps the same
            # arc and simply beats faster. Multiplying it by `amp` as well took Sprint to 183
            # degrees at the root, which swings the blade through the flank.
            gainf = (1.0 if fore else .62)
            # **The stroke is a stroke.** In Sprint the forelimb sweeps from stretched forward to
            # flush along the flank -- about 126 degrees at the root -- rather than waggling; the
            # recovery is feathered and quick. `limbSweepDegrees` in validation.json is the number.
            reach = {'Sprint': 1.15, 'Swim': .90}.get(clip, .55)
            up.rotation_euler.x = (reach * stroke - .22 * feather) * gainf * (1 if clip in
                ('Idle', 'Swim', 'Sprint', 'Breathe', 'Eat', 'Guard', 'Grab') else .45)
            up.rotation_euler.z = s * (.26 * stroke + .14 * feather) * gainf
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * (.38 if fore else .16) * e
            if clip in ('TurnLeft', 'TurnRight'):
                up.rotation_euler.x += s * (-1 if clip == 'TurnLeft' else 1) * (.42 if fore else .20) * e
            if clip in ('Attack', 'Heavy', 'Ability'):
                up.rotation_euler.x += (.26 if fore else .10) * cock - (.34 if fore else .14) * drive
                up.rotation_euler.z += s * .10 * snap
            if clip == 'Ability':
                # the flippers back-paddle to hold station while the mouth does the work
                up.rotation_euler.x += -.24 * suck
            if clip == 'Haul':
                plant = plantF if fore else plantH
                up.rotation_euler.x += .95 * plant - .30 * heave
                up.rotation_euler.z += s * (.30 * plant)
            if clip == 'Guard':
                up.rotation_euler.x -= .22 * (1 - cos(p)) / 2
                up.rotation_euler.z += s * .14 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += s * .36 * e
            if clip == 'Dodge':
                up.rotation_euler.x += (.46 if s > 0 else -.20) * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.z += s * .30 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.x += .20 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.x += .22 + .12 * haul
                up.rotation_euler.z += s * .10 * haul
            if clip == 'Eat':
                up.rotation_euler.x += .14 * sin(p * 2)
            if clip == 'Growth':
                up.rotation_euler.z += s * .24 * e
            up.rotation_euler.x += .34 * dead
            up.rotation_euler.z += s * .30 * dead
            # The wrist is the animal's name -- *lenticarpus*, the bendy wrist -- and it is the
            # one joint here that leads rather than follows: the blade is still catching as the
            # upper arm starts its recovery, which is what a flexible flipper does.
            lead = sin(p * beat - ROW_LAG['pec' if fore else 'pel'] + .9)
            if clip in ('Swim', 'Sprint'):
                # The swept angle at the limb root, per cycle. A paddle that drives has to sweep
                # from stretched forward to flush with the flank; a control surface does not, and
                # the number is recorded either way so a reviewer can tell which this is.
                sw = limb_sweep.setdefault(clip, {}).setdefault(
                    names[0], [1e9, -1e9, 1e9, -1e9])
                sw[0] = min(sw[0], up.rotation_euler.x)
                sw[1] = max(sw[1], up.rotation_euler.x)
                sw[2] = min(sw[2], up.rotation_euler.z)
                sw[3] = max(sw[3], up.rotation_euler.z)
            pb[names[1]].rotation_euler.x = .55 * up.rotation_euler.x + .10 * lead * amp
            pb[names[2]].rotation_euler.x = .35 * up.rotation_euler.x + .22 * lead * amp
            pb[names[2]].rotation_euler.z = s * .10 * lead * amp

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
    'id': ID, 'name': NAME, 'species': 'Cartorhynchus lenticarpus',
    'provenance': 'Early Triassic · Nanlinghu Formation, Majiashan, Chaohu, Anhui',
    'description': 'The most basal ichthyosauriform: a very short blunt snout, thick ballast ribs, '
                   'a short trunk and enormous flexible-wristed flippers. Authored Tripo body and '
                   'measured procedural volume twin share one armature, one set of inverse binds, '
                   'one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 0.4, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/cartorhynchus.png',
                'tools/triassic/creatures/cartorhynchus/tripo-raw/cartorhynchus.raw.glb'],
    'notes': [
        'The paddles are the engine. This is the one animal of the four whose forelimbs take a '
        'real stroke rather than steering -- a long power phase back and down, a feathered '
        'recovery, the hind pair a third of a beat behind -- because the research reads it as '
        'anguilliform at slow speed and paddle-assisted, on the shortest trunk in the set.',
        'The wrist leads the elbow through the stroke, which is what *lenticarpus* means: a '
        'flipper-wrist so poorly ossified that Motani et al. read it as bending like a turtle\'s.',
        'Haul is the flipper-walk: both pairs plant, the body is levered forward over them and '
        'the belly drags. It is the traversal the roster gives this animal and nothing else.',
        'Ability is a suction snap, not a bite: the gape opens faster than it shuts and the head '
        'is drawn back as it does, because prey comes to the animal.',
        'The mouth is the generation\'s own shallow groove, measured geometrically -- 26 vertices '
        'against Placodus\' 193, which is what a very short blunt snout gives. The teeth are '
        'documented as molariform and invisible in side view, the generation carries none, and '
        'none was authored.',
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
    'limbReach': {'fore': FORE_REACH, 'hind': HIND_REACH,
                  'foreOverHind': FORE_REACH / HIND_REACH},
    'caudalFin': {k: caudal_cluster[k] for k in
                  ('count', 'yRange', 'xRange', 'zRange', 'reachRadius')},
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
    'limbSweepDegrees': {c: {n: {'alongTheBody': round(math.degrees(v[1] - v[0]), 2),
                                 'outFromTheFlank': round(math.degrees(v[3] - v[2]), 2)}
                             for n, v in d.items()} for c, d in limb_sweep.items()},
    'mouthCutDeviation': {
        'cutFromMeasuredLineRaw': CUT_DEVIATION_RAW,
        'cutFromMeasuredLineOverBodyLength': CUT_DEVIATION_RAW,
        'aStraightCutWouldHaveDeviatedRaw': RAMP_DEVIATION_RAW,
        'aStraightCutWouldHaveDeviatedOverBodyLength': RAMP_DEVIATION_RAW},
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report, 'maxInfluences': max(influences),
    'meanInfluences': float(np.mean(influences)),
    'mouth': {
        'method': MOUTH_METHOD,
        'note': 'Placodus\' geometric method was tried first and does not reach this animal: over '
                'the whole front third it returns %d vertices and only %d of them are on the '
                'rostrum at all. The rostrum is one smooth closed tube with the mouth painted on '
                'it, so the lip was read off the albedo -- walking outwards from the pale belly '
                'on each flank, where the step off it is sharp -- and fitted to a ramp.'
                % (len(CAV), CAV_ON_SNOUT),
        'cavityVertices': int(len(CAV)), 'cavityVerticesOnTheRostrum': CAV_ON_SNOUT,
        'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'albedoStations': len(LIP),
        'flankToFlankDisagreementMax': MOUTH_DISAGREEMENT,
        'rampSlope': MOUTH_SLOPE, 'rampIntercept': MOUTH_INTERCEPT,
        'worstResidualAsFractionOfLocalDepth': MOUTH_FIT_WORST,
        'worstResidualAsFractionOfSlitDepth': MOUTH_FIT_WORST_AGAINST_SLIT,
        'measuredLine': [[round(float(r['y']), 4), round(float(r['mid']), 5),
                          round(float(r['disagreement']), 5)] for r in LIP],
        # How far apart the lips are in the generation's own rest pose. A body authored gaping
        # would measure a cavity a large fraction of the head deep here; this one measures a slit.
        'restSlitMaxHalfDepthRaw': float(np.max(TALL)),
        'restSlitMaxHalfDepthOverHeadDepth': float(np.max(TALL) / max(half_depth(HINGE_Y), 1e-6)),
        'liningCoverage': mouth_cover, 'toothPatches': tooth_report,
        'toothPatchesStraddlingTheCut': straddling, 'authoredToothRows': tooth_rows,
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
print('CARTO_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('CARTO_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('CARTO_ENVELOPE', json.dumps(report['envelope']))
print('CARTO_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'cavityVerticesOnTheRostrum', 'albedoStations',
       'flankToFlankDisagreementMax', 'worstResidualAsFractionOfLocalDepth')}))
print('CARTO_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('CARTO_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
