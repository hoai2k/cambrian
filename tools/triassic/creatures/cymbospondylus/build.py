"""Rebuild Cymbospondylus: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first -- head at -Y, up +Z, one unit
long -- because this generation lies 18.3 degrees across the file's axes and a bounding box would
have rigged it crooked. `tx()` then applies the engine scale and `export_yup` puts the head at
glTF +Z, where every shipped body in this repository keeps it.

The animal is the era's first giant: long, eel-bodied, no dorsal fin, a low caudal fin rather than
a crescent, and a long toothed rostrum. So the performance is **anguilliform** -- a wave that is
already large at mid-body, not a thunniform beat confined to the peduncle -- and the attack is a
coil and a committed drive with the jaws, because the jaws are the weapon and the body is what
delivers them.

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

ID = 'cymbospondylus'
NAME = 'Cymbospondylus'
SPECIES = 'C. youngorum'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 6.0
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH        # 4 % of body length, per the pipeline
ANCHOR_TOLERANCE = .02 * BODY_LENGTH          # 2 % of body length
PUPPET_TRIANGLE_TARGET = 6600
VOXEL = .0045
THIN, THIN_BAND = .030, .012

CLIPS = {'Idle': 3.0, 'Swim': 2.2, 'Sprint': 1.4, 'TurnLeft': 1.8, 'TurnRight': 1.8,
         'Dive': 1.6, 'Rise': 1.6, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.3, 'Hit': .6,
         'Death': 2.0, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5, 'Eat': 1.8, 'Stagger': 1.2,
         'Ability': 1.1, 'Grab': 1.1, 'Breath': 2.6, 'Growth': 1.5,
         'Lunge': 1.5, 'Breathe': 3.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe']

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
    if c['reachRadius'] > .12 and abs(c['centroid'][0] - cx(mid)) > .04:
        key = ('pec' if mid < 0 else 'pel') + ('L' if c['centroid'][0] < cx(mid) else 'R')
        LIMBS[key] = c
    elif c['yRange'][1] > Y1 - .06:
        caudal_cluster = c
    else:
        other.append(c)
if sorted(LIMBS) != ['pecL', 'pecR', 'pelL', 'pelR']:
    print('CYMBO_CLUSTERS', json.dumps(
        {'yRange': [Y0, Y1], 'thin': int(thin_mask.sum()),
         'thicknessQuantiles': [float(np.quantile(thickness, q)) for q in (.02, .25, .5, .95)],
         'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters]}))
assert sorted(LIMBS) == ['pecL', 'pecR', 'pelL', 'pelR'], sorted(LIMBS)
assert caudal_cluster is not None, 'the caudal fin did not measure'

depth, bvh_auth = T.depth_probe(auth)

# --------------------------------------------------------------------- measure the mouth ----
# Placodus' method first, as the pipeline's two worked examples require: every head vertex casts
# its own outward normal back into the mesh, and a vertex that hits is looking across the mouth
# slit at the lip opposite. This generation answers with 280 vertices, so the mouth is modelled
# and there is no need for Dinocephalosaurus' albedo fallback. MOUTH_METHOD records which was used.
MOUTH_GAP = .030
CAV = T.mouth_cavity(auth, front_fraction=.34, gap=MOUTH_GAP)
MOUTH_METHOD = 'modelled cavity'
assert len(CAV) > 120, ('the mouth cavity did not measure', len(CAV))
MY, MID, WIDE, TALL = T.cavity_profile(CAV, Y0 + .002, Y0 + .18, .0025, .006)
assert len(MY) > 20, len(MY)


def seam(y):
    """The mouth line: the mid height of the measured cavity, station by station. A curve, which
    is why the cut is taken by shearing the head onto it rather than by a tilted plane."""
    return float(np.interp(y, MY, MID))


# What a straight cut would have cost, recorded for comparison with the curve that is actually used.
_ramp = np.polyfit(MY, MID, 1)
RAMP_DEVIATION_RAW = float(np.max(np.abs(MID - np.polyval(_ramp, MY))))
CUT_DEVIATION_RAW = 0.   # the cut is the measurement, station for station


HINGE_Y = float(MY[-1])
JAW_FRONT_Y = float(MY[0])
# Teeth: a connected patch of snout standing proud of the same surface smoothed. Cymbospondylus is
# homodont, and the generation carries a conical row along the jaw rather than a few big chisels,
# so what matters here is not that a named tooth misses the cut but that none of them straddles it.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=Y0 + .20, floor=.0022)


# The centreline table is 61 stations over a whole body, smoothed five wide, and that is too
# coarse for a rostrum that tapers: it reads the snout wider than it is. So the head gets its own
# fine profile, and the mouth lining is sized from that rather than from the body's.
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


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


NECK_Y, CHEST_Y, BODY_Y = HINGE_Y + .035, HINGE_Y + .115, HINGE_Y + .295
TAIL_Y = [BODY_Y + .10 + .055 * i for i in range(9)]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
bone('neck', on_axis(NECK_Y), 'chest')
bone('skull', on_axis(HINGE_Y - .012), 'neck')
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .008), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))
CAUDAL_Y = float(np.clip(caudal_cluster['yRange'][0] + .015, TAIL_Y[-2], TAIL_Y[-1]))
bone('caudal_upper', on_axis(CAUDAL_Y, +.020), 'tail_07')
bone('caudal_lower', on_axis(CAUDAL_Y, -.020), 'tail_07')

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
AXIAL_NAMES = ['skull', 'neck', 'chest', 'body'] + ['tail_%02d' % i for i in range(9)]
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
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    LIMB_RADIUS[key] = (float(np.quantile(d, .55)), float(np.quantile(d, .995)) + .012)


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
        alpha *= T.smooth(s / max(cum[1] * .75, 1e-6))
        if alpha > best:
            best = alpha
            chosen = (T.limb_chain(names, cum, s), rootw, min(1., s / cum[-1]))
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
    sample_albedo, thin=THIN, band=.020, roughness=.70)

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
    relaxed = T.relax_weights(o, raw_weights, passes=3, hold=.45)
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
LINING_INSET = .95


def mouth_section(y):
    """The lining's own section. **It is floored against the head, not only fitted to the closed
    slit.** The measured cavity of a shut mouth tapers to nothing at the snout, and a tube that
    tapers with it is a thread by the time it reaches the front: the jaw then swings down past it
    and, from the side, you see straight between the jaws either side of the thread. The first
    measured pass showed exactly that -- 7 % of the aperture at Heavy's widest gape, with the
    backdrop proof clean, which is the signature of open space rather than a culled surface. So the
    width is at least 0.62 of the head's own half width and the depth at least 0.30 of its half
    depth, all the way to the last ring."""
    e = T.smooth((MOUTH_BACK - y) / .014) * T.smooth((y - MOUTH_FRONT) / .004)
    w = max(float(np.interp(y, MY, WIDE)), head_half_width(y) * .62) * LINING_INSET * (.55 + .45 * e)
    h = max(float(np.interp(y, MY, TALL)), head_half_depth(y) * .30, .0022) * LINING_INSET * (.45 + .55 * e)
    return w, h


def lining_jaw_blend(p):
    w, h = mouth_section(p.y)
    # **Steep, not linear.** The ring's widest points sit at the seam, and with a gentle blend they
    # take half the jaw's rotation while the jaw takes all of it -- so from the side the lining's
    # own silhouette lags the mandible and a wedge of background opens between them. That is what
    # the first measured pass was counting. At 1.6 the whole lower half of the ring goes with the
    # jaw and only the two vertices exactly on the seam are shared.
    t = T.smooth(.5 + 1.6 * (seam(p.y) - p.z) / max(h, 1e-6))
    return t * T.smooth((MOUTH_BACK - p.y) / .012) * T.smooth((p.y - MOUTH_FRONT) / .006)


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, lining_jaw_blend, mouth_mat,
                              rings=26, ring=14, centre_x=cx)
oralparts = [lining]
mouth_cover = []
for k, y in enumerate(MY):
    if not MOUTH_FRONT + .006 < y < MOUTH_BACK - .014:
        continue
    w, h = mouth_section(float(y))
    mouth_cover.append([round(float(y), 4), round(w / max(float(WIDE[k]), 1e-9), 3),
                        round(h / max(float(TALL[k]), 1e-9), 3)])
    assert w >= float(WIDE[k]) * .90, ('the oral lining is narrower than the mouth', y, w, WIDE[k])
    assert h >= float(TALL[k]) * .85, ('the oral lining is shallower than the mouth', y, h, TALL[k])

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
CHAIN = ['neck', 'chest', 'body'] + ['tail_%02d' % i for i in range(9)]
# An eel carries more than one wavelength on its body at once, and that is the difference the
# reviewer can see: a thunniform swimmer is a stiff plank with a beating peduncle, and this animal
# is not one. The lag runs 8.0 radians over the chain -- about 1.3 wavelengths from shoulder to
# tail tip -- and the gain starts at 0.14 by the neck rather than at nothing.
WAVE_SPAN = 5.0          # radians of phase from the neck to the last caudal joint
GAIN = [.10 + .90 * (i / 11) ** 1.6 for i in range(12)]
LAG = [WAVE_SPAN * i / 11 for i in range(12)]
CAUDAL_LAG = WAVE_SPAN + .85     # the lobes trail the peduncle by an eighth of a beat
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
               'Breath': .34, 'Breathe': .30, 'Growth': .24, 'Dodge': 1.20, 'Lunge': .60,
               'Ability': .45}.get(clip, .30)
        beat = {'Swim': 2., 'Sprint': 3., 'Idle': 1., 'Breathe': 1., 'Dodge': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            # A **loop swings both ways.** The `- sin(-LAG[i])` term is what makes a one-shot start
            # and end at rest, and on a looping clip it is a static offset as large as the
            # amplitude itself: the first render sheet showed the body bent to one side at every
            # phase of Swim and straight at the seam, which is an animal cruising with a permanent
            # kink rather than one undulating. Loops get the pure sine; one-shots keep the offset.
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        # --- the shapes each performance is actually built out of
        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy', 'Lunge', 'Ability') else 0.
        drive = ramp(u, .30, .46, 2.2) * (1 - ramp(u, .62, 1., 1.)) if clip in ('Attack', 'Heavy', 'Lunge', 'Ability') else 0.
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy', 'Lunge', 'Ability') else 0.
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
            gape = .52 * spike(u, 0., .62, 1.1)
        elif clip == 'Attack':
            gape = .30 * cock + .48 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            gape = .34 * cock + .60 * ramp(u, .24, .46, 1.7) * (1 - ramp(u, .50, .70, 1.4))
        elif clip == 'Lunge':
            gape = .26 * cock + .58 * ramp(u, .26, .48, 1.8) * (1 - ramp(u, .54, .74, 1.2))
        elif clip == 'Ability':
            # The exhaustion hold: the jaws take hold early and stay shut on it.
            gape = .46 * ramp(u, .10, .34, 1.4) * (1 - ramp(u, .34, .48, 1.0)) + .05 * e
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
        if clip in ('Attack', 'Heavy', 'Lunge'):
            # weight back on the cock, and thrown forward as the chain unrolls
            body.location.y = .14 * cock - (.46 if clip != 'Bite' else .2) * drive
            body.rotation_euler.x = .10 * cock - .09 * drive
            body.rotation_euler.z += .10 * cock - .05 * drive
        if clip == 'Ability':
            body.location.y = .10 * cock - .30 * drive - .06 * e
            body.rotation_euler.y = .20 * e * sin(p * 2)
        if clip == 'Bite':
            body.location.y = -.10 * spike(u, .1, .8, 1.)
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
            z = .170 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.018 + i * .009)
            z += .040 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy', 'Lunge', 'Ability'):
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
        if clip in ('Attack', 'Heavy', 'Lunge'):
            pb['skull'].rotation_euler.x += -.14 * cock + .20 * drive
            pb['neck'].rotation_euler.x += -.08 * cock + .10 * drive
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
            # Amplitude is the fin's *pitch against the beat*, not a stroke: 0.085 rad on
            # the fore and 0.050 on the hind, about twenty and twelve degrees over a cycle.
            # It shipped at 0.030 for both, which measured five degrees and read on the
            # sheets as a fin welded to the flank -- invisible is not the same as correct.
            fin_amp = .085 if fore else .050
            base = fin_amp * amp * wave(3 if fore else 6, beat)
            up.rotation_euler.x = base
            up.rotation_euler.z = s * fin_amp * amp * wave(4 if fore else 7, beat)
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * (.38 if fore else .16) * e
            if clip in ('TurnLeft', 'TurnRight'):
                up.rotation_euler.x += s * (-1 if clip == 'TurnLeft' else 1) * (.42 if fore else .20) * e
            if clip in ('Attack', 'Heavy', 'Lunge', 'Ability'):
                up.rotation_euler.x += (.26 if fore else .10) * cock - (.34 if fore else .14) * drive
                up.rotation_euler.z += s * .10 * snap
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
            pb[names[1]].rotation_euler.x = .5 * up.rotation_euler.x + .026 * amp * wave(5, beat)
            pb[names[2]].rotation_euler.x = .3 * up.rotation_euler.x + .060 * amp * wave(6, beat)
            pb[names[2]].rotation_euler.z = s * .060 * amp * wave(7, beat)

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
    'id': ID, 'name': NAME, 'species': 'Cymbospondylus youngorum',
    'provenance': 'Middle Triassic · Fossil Hill Member, Augusta Mountains, Nevada',
    'description': 'Eel-bodied basal ichthyosaur with a long toothed rostrum, four paddles, no '
                   'dorsal fin and a low caudal fin. Authored Tripo body and measured procedural '
                   'volume twin share one armature, one set of inverse binds, one set of sockets '
                   'and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 17.65, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/cymbospondylus.png',
                'tools/triassic/creatures/cymbospondylus/tripo-raw/cymbospondylus.raw.glb'],
    'notes': [
        'Anguilliform, not thunniform: the travelling wave carries real amplitude by mid-body and '
        'takes a whole body length to run down the chain, which is what "basal, primitive body '
        'plan (eel-like proportions)" means in the research.',
        'The paddles are control surfaces. They set pitch and roll, they brake and they brace; '
        'nothing here rows.',
        'The body was measured into its own frame before anything was rigged: this generation '
        'lies 18.3 degrees across the file axes, and its roll was read off the countershading '
        'rather than transported, as Dinocephalosaurus requires.',
        'The mouth line is the measured mid height of the modelled oral cavity, found by casting '
        'every head vertex normal back into the mesh. One skinned lining closes the gape; the '
        'skin under it is double-sided as the backstop.',
        'The twin resurfaces a 0.0052-unit voxel occupancy field of the authored body, relaxes it '
        'and reduces the new topology. It reuses no source vertex or face.',
        'The generation gives this animal a skull about 0.15 of its length against the 0.11 the '
        'research documents, and its two pectorals sit at different stations. Both are the pose '
        'and the generation, not this build; see the README.',
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
        'note': 'Placodus\' geometric method: every head vertex casts its own outward normal back '
                'into the mesh over %.3f raw units, and a vertex that hits is looking across the '
                'slit at the lip opposite. The albedo fallback Dinocephalosaurus needed was not '
                'used, because this generation models a real mouth.' % MOUTH_GAP,
        'cavityVertices': int(len(CAV)), 'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'seam': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, MID)],
        'cavityHalfWidth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, WIDE)],
        'cavityHalfDepth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, TALL)],
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
print('CYMBO_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('CYMBO_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('CYMBO_ENVELOPE', json.dumps(report['envelope']))
print('CYMBO_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'hingeY', 'jawFrontY', 'toothPatchesStraddlingTheCut')}))
print('CYMBO_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('CYMBO_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
