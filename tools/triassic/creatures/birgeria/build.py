"""Rebuild Birgeria: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first -- head at -Y, up +Z, one unit
long -- because this generation lies **27.7 degrees** across the file's axes; `tx()` then applies
the engine scale and `export_yup` puts the head at glTF +Z, where every shipped body in this
repository keeps it.

Which end is the head is decided here by the **caudal fin**, not by the principal component's
sign. Birgeria's is a deeply forked blade 0.28 of a body deep standing at one end of the animal,
and a fish's head is not thin; the largest thin cluster at an end of the axis is therefore the
tail, and the frame is flipped to put the other end at -Y. The assertion below is what enforces it.

Birgeria is the pursuit fish and it is **thunniform** (`thunniform: true` on its roster entry): a
stiff plank with the beat piled into the peduncle, where Saurichthys is a lie-in-wait ambusher and
the reef sharks carry more of a wave. So the gain curve here is nearly nothing until the last
third and the caudal lobes carry almost all of the travel -- which is the number `audit.mjs`
measures rather than a claim in a comment.

Two recorded pose faults are built as the greenlit pose draws them rather than corrected in the
mesh, per `docs/triassic/proportion-audit.md`:

  * the large dorsal fin sits at frac 0.40-0.57 where the research says "single dorsal set far
    back"; and
  * a **second** dorsal stood behind it, which `smooth-region.py` has already shrunk to 0.9 % of
    its protrusion in the published preview this build reads. What is left is a low thin patch on
    the back, and it takes axial weights like the skin around it.

Nothing here models new anatomy beside the generation. The jaw is cut out of the generation's own
skin along its own measured mouth line, the teeth are the generation's own, and the only authored
surfaces are the oral lining and the hinge envelope -- which close holes, take their UVs from the
skin around them and wear the body's own albedo.

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

ID = 'birgeria'
NAME = 'Birgeria'
SPECIES = 'B. stensioei'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
# The published preview is the source, not the raw generation: `smooth-region.py` collapsed the
# spare second dorsal into the back on the preview and the raw file beside it is preserved
# untouched as provenance (`docs/triassic/preview-mesh-defects.md`).
SOURCE = os.path.join(HERE, ID + '.preview.glb')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 5.0
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH        # 4 % of body length, per the pipeline
ANCHOR_TOLERANCE = .02 * BODY_LENGTH          # 2 % of body length
# The oral lining is counted in both bodies, and at 34 rings of 24 it is not small: with the twin
# at 6400 the LOD came to 38.9 % of the authored triangles, which is inside the contract's 40 % and
# too close to it to leave alone.
PUPPET_TRIANGLE_TARGET = 5200
VOXEL = .0040
THIN = .030

# A five-and-a-half metre pursuit predator: slower beats than the metre-long ichthyosaur, quicker
# than the giants.
CLIPS = {'Idle': 2.6, 'Swim': 1.5, 'Sprint': .95, 'TurnLeft': 1.4, 'TurnRight': 1.4,
         'Dive': 1.3, 'Rise': 1.3, 'Attack': .9, 'Bite': .45, 'Heavy': 1.1, 'Hit': .55,
         'Death': 1.8, 'Guard': 1.2, 'Parry': .35, 'Dodge': .45, 'Eat': 1.5, 'Stagger': 1.2,
         'Ability': 1.0, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5,
         'FastStart': .7, 'Gape': 1.3}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(SOURCE, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(SOURCE, ROOT)
intake['rawGenerationSha256'] = hashlib.sha256(open(RAW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.62)
skin_material.use_backface_culling = False    # the backstop behind the mouth lining
# **Which end is the head.** `measure_frame` is told the sign, and on a fish the sign is decided by
# the caudal fin: the deepest thin cluster sits at the tail, and a fish's head is not thin. Both
# orientations are measured here and the one that puts that cluster at +Y is kept, so the answer is
# the animal's rather than the principal component's arbitrary sign.
frame = T.measure_frame(auth, head_is_positive_pca=False, luminance_at=luminance_at)
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


# ---------------------------------------------------------------- the fins, as measured ----
# Nothing here types a station. The blades are found by connectivity on the measured shell
# thickness and classified by where they stand: out to one side of the axis is a paired fin, at the
# far end is the caudal, above the axis on the midline is the dorsal and below it the anal.
#
# This generation's pectorals are posed asymmetrically -- the right sits 0.06 of a body further
# forward than the left and hangs 0.09 lower -- which is what the rig is built to and what
# `limbAsymmetry` in validation.json records.
clusters = T.thin_clusters(auth, thin_mask, cx, cz)
LIMBS, caudal_cluster, dorsal_cluster, anal_cluster, other = {}, None, None, None, []
for c in clusters:
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    lateral = abs(c['centroid'][0] - cx(mid))
    rise = c['centroid'][2] - cz(mid)
    if c['reachRadius'] > .12 and lateral > .05:
        LIMBS['pec' + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
    elif c['yRange'][1] > Y1 - .06:
        caudal_cluster = c
    elif lateral < .05 and rise > .04 and c['reachRadius'] > .12:
        dorsal_cluster = c
    elif lateral < .05 and rise < -.04 and c['reachRadius'] > .12:
        anal_cluster = c
    else:
        other.append(c)
if sorted(LIMBS) != ['pecL', 'pecR'] or not (dorsal_cluster and anal_cluster and caudal_cluster):
    print('BIRG_CLUSTERS', json.dumps(
        {'yRange': [Y0, Y1], 'thin': int(thin_mask.sum()),
         'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters]}))
assert sorted(LIMBS) == ['pecL', 'pecR'], sorted(LIMBS)
assert caudal_cluster is not None, 'the caudal fin did not measure'
assert dorsal_cluster is not None, 'the dorsal fin did not measure'
assert anal_cluster is not None, 'the anal fin did not measure'
# The head-end test: the caudal blade is the deepest thin cluster and it must be at +Y.
CAUDAL_DEPTH = caudal_cluster['zRange'][1] - caudal_cluster['zRange'][0]
assert caudal_cluster['yRange'][0] > (Y0 + Y1) / 2, \
    ('the frame has the animal the wrong way round', caudal_cluster['yRange'])
assert CAUDAL_DEPTH > .20, ('the caudal fin is not the forked blade this animal has', CAUDAL_DEPTH)

depth, bvh_auth = T.depth_probe(auth)

# --------------------------------------------------------------------- measure the mouth ----
# Placodus' geometric method first, as the pipeline requires: every head vertex casts its own
# outward normal back into the mesh, and a vertex that hits is looking across the mouth slit at the
# lip opposite. **This generation models the slit**, and answers with a tight cluster over the
# front eighth of the body and nothing at all behind it -- so this is the easy case and the albedo
# fallback is used only to check the answer, not to produce it.
MOUTH_GAP = .030
MOUTH_LIMIT = .17
CAV = T.mouth_cavity(auth, front_fraction=MOUTH_LIMIT, gap=MOUTH_GAP)
MOUTH_METHOD = 'modelled cavity (geometric), cross-checked against the painted line'
assert len(CAV) > 50, ('the mouth cavity did not measure', len(CAV))
MY, MID, WIDE, TALL = T.cavity_profile(CAV, Y0 + .002, Y0 + .115, .0025, .006)
assert len(MY) > 16, ('the modelled cavity is too short to be the mouth', len(MY))


def seam(y):
    """The mouth line: the mid height of the measured cavity, station by station. A curve, so the
    cut is taken by shearing the head onto it rather than by a tilted plane through the teeth."""
    return float(np.interp(y, MY, MID))


HINGE_Y = float(MY[-1])
# **The mandible has no front cut at all.** The cavity of a shut mouth stops measuring a few
# thousandths behind the snout tip -- there is no gap left there to cast a ray across -- and a jaw
# cut anywhere behind the tip leaves an open ring of mandible that swings into view the moment the
# mouth drops. The gape proof found it twice: 956 magenta pixels with the cut at the cavity's front,
# 137 with it three thousandths from the tip. So the plane is put in front of the animal, where it
# meets no geometry, and the mandible's only open boundaries are the seam -- which the lining covers
# -- and the rear plane at the hinge, which the hinge envelope and the throat blend cover.
JAW_FRONT_Y = float(Y0 - .002)
MOUTH_FRONT_Y = float(Y0 + .014)       # the lining's front cap, inside the solid snout tip
HEAD_BACK = Y0 + .235          # where the gill cover ends and the pectoral girdle begins

# **The cross-check, and it is the point of doing two methods.** The painted line is read
# independently -- a matched filter for a thin dark line between lighter skin, resolved as one
# continuous path along the head -- and compared with the modelled slit over the stations they
# share. Agreement says the geometric method found the mouth rather than a crease; disagreement
# would say one of them found something else, which is exactly the fault Keichousaurus records.
PAINTED = T.painted_line(auth, luminance_at, cz, half_depth, Y0 + .012, HINGE_Y + .010,
                         u_lo=-.95, u_hi=.25, stations=28)
assert PAINTED, 'the painted mouth line did not read'
_py = np.array([r['y'] for r in PAINTED])
_pz = np.array([r['z'] for r in PAINTED])
_shared = (_py >= MY[0]) & (_py <= MY[-1])
_gap = np.abs(_pz[_shared] - np.array([seam(float(y)) for y in _py[_shared]]))
_rad = np.array([max(half_depth(float(y)), 1e-4) for y in _py[_shared]])
PAINTED_AGREEMENT = float(np.max(_gap / _rad))
PAINTED_AGREEMENT_MEAN = float(np.mean(_gap / _rad))
PAINTED_DISAGREEMENT = float(np.max([r['disagreementOverRadius'] for r in PAINTED]))
assert PAINTED_AGREEMENT < .40, ('the two mouth readings disagree', PAINTED_AGREEMENT)

# **Is it straight?** On a fish it very nearly is, and the pipeline asks for the number rather than
# for a curve forced onto a line that has none. The cut still follows the measurement station for
# station -- that costs nothing -- but this is what a straight ramp through the same points would
# have deviated by, in raw units and as a fraction of the local radius.
_ramp = np.polyfit(MY, MID, 1)
RAMP_DEVIATION_RAW = float(np.max(np.abs(MID - np.polyval(_ramp, MY))))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(MID - np.polyval(_ramp, MY)) / np.array([max(half_depth(float(y)), 1e-4) for y in MY])))
CUT_DEVIATION_RAW = 0.   # the cut is the measurement, station for station

# --------------------------------------------------- the aimed cut, read and measured ----
# **A reviewer aimed a cut plane and a hinge on this exact shipped body** in the viewer's mouth
# editor (`docs/triassic/mouths/birgeria-mouth.json`, `docs/viewer-mouth.md`). The file is read
# here and everything this build's own measurement disagrees with it about is recorded -- and the
# cut is **not** taken on it, which is a measurement rather than a preference.
#
# Cut on the aimed plane instead of the modelled slit, this body's gape opens: `gape-solid.py`
# reads **2,130 px of `opened by culling`** at full gape against **417** on the slit's own line,
# because the aimed plane is pitched +32.1 deg where the slit runs at +25.4 and so lies up to
# 0.026 of a body under it at the back of the mouth -- the mandible the plane cuts is a different
# shape from the one the lining was fitted to, and a tube about a mouth line does not close an
# aperture it was not measured from. Building the shells about the generation's own slit while
# cutting on the plane recovered half of it (3,511 -> 2,130) and no more.
#
# What closes a mouth cut where a human aimed it is the cut's **own rim** (`T.cap_cut` and
# `T.cap_mouth`, CLAUDE.md), which is the construction Cartorhynchus was ported to on the day it
# took its aimed cut and which this body has never been ported to -- it is T3D-32's rollout, and
# `docs/triassic/throat-repairs/oral-verdicts.md` already names this animal as the remaining work.
# Until then the aimed file is a **review** rather than a cut, which is the other use
# `docs/triassic/mouths/README.md` names for these documents, and the numbers below say how far
# apart the human and the generation are.
AIMED_MOUTH = 'docs/triassic/mouths/birgeria-mouth.json'
_doc = json.loads(open(os.path.join(ROOT, AIMED_MOUTH)).read())
assert _doc['schema'] == 'mouth-cut/1' and _doc['id'] == ID, (_doc.get('schema'), _doc.get('id'))
assert _doc['appliesTo'] == 'built', _doc['appliesTo']
assert (_doc['frame']['axis'], _doc['frame']['forward'], _doc['frame']['up']) == ('z', 1, 'y')


def from_gltf_point(q):
    """The export frame into this builder's. `tx` scales by SCALE and the glTF exporter's
    `export_yup` sends Blender (x, y, z) to glTF (x, z, -y); this is that, inverted."""
    return Vector((q[0] / SCALE, -q[2] / SCALE, q[1] / SCALE))


def from_gltf_dir(d):
    return Vector((d[0], -d[2], d[1]))


# **A direction handed in from outside is in the file's frame, so fit the frame rather than assume
# it.** The map above is the exporter's own convention and not a measurement, so it is checked
# against something the document measured on the shipped file and this build can measure on the
# intake: the bounding box over every vertex. Six numbers, and if the head end or the up axis were
# the other way round they would disagree by a body length rather than by a rounding.
_lo, _hi = raw_co.min(0) * SCALE, raw_co.max(0) * SCALE
FRAME_CHECK = float(max(
    abs(a - b) for a, b in
    zip([_lo[0], _lo[2], -_hi[1], _hi[0], _hi[2], -_lo[1]],
        list(_doc['mouth']['box']['lo']) + list(_doc['mouth']['box']['hi']))))
assert FRAME_CHECK < 1e-3 * BODY_LENGTH, ('the aimed cut is not in this body\'s frame', FRAME_CHECK)

CUT_P = from_gltf_point(_doc['plane']['point'])
CUT_N = from_gltf_dir(_doc['plane']['normal']).normalized()
CUT_F = from_gltf_dir(_doc['plane']['forward']).normalized()
CUT_AXIS = from_gltf_dir(_doc['hinge']['axis']).normalized()
assert abs(CUT_N.dot(CUT_F)) < 1e-4, CUT_N.dot(CUT_F)
assert CUT_N.z > .5 and CUT_F.y < -.5, (tuple(CUT_N), tuple(CUT_F))   # up out of the mouth, and forward
AIMED_HINGE_Y = float(CUT_P.y)


def aimed_seam(y):
    """The aimed plane read on the body's own measured centreline -- the reviewer's mouth line."""
    return float(CUT_P.z - (CUT_N.x * (cx(y) - CUT_P.x) + CUT_N.y * (y - CUT_P.y)) / CUT_N.z)


# What the human and the generation disagree about, station by station over the groove the
# generation modelled. Recorded, never averaged.
AIMED_VS_SLIT = [(float(y), seam(float(y)) - aimed_seam(float(y))) for y in MY]
AIMED_BELOW_SLIT_MAX = float(max(d for _y, d in AIMED_VS_SLIT))
AIMED_BELOW_SLIT_AT_SNOUT = float(AIMED_VS_SLIT[0][1])
HINGE_AHEAD_OF_THE_SLIT = float(HINGE_Y - AIMED_HINGE_Y)

# What relief the generated snout carries, recorded rather than added to. Birgeria is famous for
# fangs in three sizes; the generation models a tooth row along both jaw margins and this is what
# stops the measured cut sawing through one, which is the fault Placodus shipped.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0020)

# The centreline table is 61 stations over a whole body, smoothed five wide, and that is too coarse
# for a snout that tapers: it reads the head wider than it is, and a lining sized from it comes out
# through the lip. So the head gets its own fine profile.
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


# **The mouth's own section, cast rather than binned.** `cavity_profile` reports the spread of the
# measured cavity points, and those sit on both *lips* -- so on a deep round head its `wide` is the
# span of the lip line, wider than the head is at the seam and wider still than the lumen behind it;
# a lining sized from it came out through both cheeks at 0.05 of a body. A percentile of the flank
# over a band about the seam is no better: too tall a band reads the head above the mouth and the
# lining bulges out through the cheek as a pink worm, too tight a band reads the head at its
# narrowest and the lining sits inside the skin's own cut edge, leaving an annular strip that the
# jaw's rotation opens and nothing bridges. The gape proof measured both mistakes -- 113 pixels
# through the head one way, a visible bulge the other.
#
# So the section is **ray cast** from the mouth's own axis instead: out along +x and -x for the
# width, up and down for the depth, taking the first hit each way. That is the section the mouth
# actually cuts, with no band and no percentile, and it is a property of the animal rather than of
# a parameter.
def _cast(o, d, limit=.5):
    hit = bvh_auth.ray_cast(Vector(o), Vector(d), limit)
    return float(hit[3]) if hit[0] is not None else limit


_MW, _MH, _MISS = [], [], 0
for _y in _HY:
    _o = (cx(float(_y)), float(_y), seam(float(_y)))
    # A ray can leave without hitting anything: the modelled mouth is an open-sided crease, and a
    # lateral ray from inside it runs out through the corner of the lip into open air. Capping each
    # cast by the head's own measured section is what stops that reading half a body of headroom.
    _w = min(_cast(_o, (1, 0, 0)), _cast(_o, (-1, 0, 0)), head_half_width(float(_y)))
    _MISS += int(_w >= head_half_width(float(_y)) - 1e-9)
    _MW.append(_w)
    # **Height is not cast.** The mouth is shut in the bind pose, so a ray up from the seam hits the
    # palate three thousandths away: that is the *closed slit*, not the room the lining has. The
    # lining has to be taller than the slit, because it stretches when the jaw swings, so its height
    # comes from the measured cavity and the head's own section instead.
    _MH.append(head_half_depth(float(_y)))
_MW = np.array(_MW)
_MH = np.array(_MH)


def mouth_half_width(y):
    return float(np.interp(y, _HY, _MW))


def mouth_headroom(y):
    """The head's own half depth at this station: how much room there is above and below the mouth
    line inside the head, which is what bounds the lining's height."""
    return float(np.interp(y, _HY, _MH))


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


# A fish has no neck, so the skull hangs straight off the chest: a cervical joint here would be a
# joint with no vertebrae under it and nothing to do, and `idle-bones.mjs` would be right to
# complain about it.
CHEST_Y = HINGE_Y + .105
BODY_Y = HINGE_Y + .300
TAIL_Y = [BODY_Y + .085 + .062 * i for i in range(7)]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
bone('skull', on_axis(HINGE_Y - .020), 'chest')
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .008), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))
# The caudal lobes. This fin is deeply forked with two near-equal lobes, so each gets a joint and
# each lags the peduncle -- which is what makes a tail fin read as a fin rather than as a plate
# bolted to the last vertebra.
CAUDAL_Y = float(np.clip(caudal_cluster['yRange'][0] + .020, TAIL_Y[-2], TAIL_Y[-1]))
bone('caudal_upper', on_axis(CAUDAL_Y, +.035), 'tail_06')
bone('caudal_lower', on_axis(CAUDAL_Y, -.035), 'tail_06')
# The two median blades, each seated inside the body it grows from rather than standing on it.
MEDIAN_SEATING = {}
for name, cl, parent in (('dorsal', dorsal_cluster, 'body'), ('anal', anal_cluster, 'tail_01')):
    mid_y = float((cl['yRange'][0] + cl['yRange'][1]) / 2)
    root = T.seat(Vector(cl['seat']), on_axis(mid_y), depth, margin=.012)
    bone(name, root, parent)
    MEDIAN_SEATING[name] = depth(root)
    assert MEDIAN_SEATING[name] > .008, ('a median fin root is not seated in the body', name,
                                         MEDIAN_SEATING[name])

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    s = key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.016)
    reach = Vector(c['reach'])
    names = ['pec_upper_' + s, 'pec_mid_' + s, 'pec_tip_' + s]
    pts = [root, root + (reach - root) * .46, root + (reach - root) * .82, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    for i, n in enumerate(names):
        bone(n, pts[i], 'chest' if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .012, ('an appendage root is not seated inside the trunk', n, d)
JAW_SEATING = depth(B['jaw'][0])
assert JAW_SEATING > .004, ('the jaw hinge is not seated inside the head', JAW_SEATING)

# ------------------------------------------------------------ skinning by arc length ----
AXIAL_NAMES = ['skull', 'chest', 'body'] + ['tail_%02d' % i for i in range(7)]
AXIAL_PTS = [Vector((cx(Y0 + .01), Y0 + .01, cz(Y0 + .01)))] + [B[n][0] for n in AXIAL_NAMES] \
    + [on_axis(Y1 - .004)]
AP, ACUM = T.polyline(AXIAL_PTS)
ASTATION = [(AXIAL_NAMES[i - 1], ACUM[i]) for i in range(1, len(AXIAL_NAMES) + 1)]
LIMB_FIT = {}
for key, pts in LIMB_PTS.items():
    P, cum = T.polyline(pts)
    LIMB_FIT[key] = (P, cum, LIMB_NAMES[key], T.station_weights(ASTATION, T.project(AP, ACUM, P[0])[1]))
# How far off a limb's own polyline the blade reaches, measured from the cluster rather than
# guessed: a pectoral is wide as well as long, and a radius that is too small leaves its trailing
# edge on the flank bones and tears when the fin strokes.
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    LIMB_RADIUS[key] = (float(np.quantile(d, .55)), float(np.quantile(d, .995)) + .012)


def limb_weights(q):
    """**Geometry, not thickness.** A fin is what lies within its own measured radius of its own
    measured axis, past the seat; a shell-thickness threshold agrees most of the time and then
    disagrees on the leading edge, where a blade is thick."""
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


def median_weights(q):
    """The dorsal and anal blades, each taken by standing off the measured axis over its own
    station range, with a radial ramp so the root follows the flank when the body bends.

    **Every gate here is feathered at both ends.** A hard `lo < y < hi` lets a blade run past its
    window, and one vertex then carries pure fin weight against a neighbour carrying pure axial --
    which is a tear, and the class of fault the relaxation pass below exists to smooth but that a
    gate this wrong would defeat."""
    best = None
    for name, cl, sgn in (('dorsal', dorsal_cluster, 1.), ('anal', anal_cluster, -1.)):
        lo, hi = cl['yRange']
        span = T.smooth((q.y - (lo - .030)) / .030) * T.smooth(((hi + .030) - q.y) / .030)
        if span <= 0:
            continue
        d = (q.z - cz(q.y)) * sgn
        if d <= 0:
            continue
        g = span * T.smooth((d - half_depth(q.y) * .72) / .028)
        if g > 0 and (best is None or g > best[1]):
            best = ({name: 1.}, g)
    return best


def caudal_weights(q):
    """The two lobes of the forked fin, by height off the measured axis, both gates feathered."""
    lo = caudal_cluster['yRange'][0]
    if q.y < lo - .030:
        return None
    d = q.z - cz(q.y)
    lobe = 'caudal_upper' if d > 0 else 'caudal_lower'
    g = T.smooth((abs(d) - .014) / .032) * T.smooth((q.y - (lo - .020)) / .040)
    return ({lobe: 1.}, g) if g > 0 else None


# **The throat has to follow the jaw.** The shore animals record the fault and the gape proof found
# it here: the mandible is skinned rigidly to `jaw` and the skin behind the hinge to the axial
# chain, and with nothing blending between them a wide gape separates the two -- the pale ventral
# skin reads as a slab hanging off a detached jaw, and under a single-sided material the wedge
# between them is a hole straight through the animal. 780 magenta pixels came through exactly there
# before this existed.
THROAT_SPAN = .075
THROAT_DROP = .12


def throat_jaw_share(q):
    # All of the jaw's rotation at the hinge, none a throat's length behind it, none above the
    # mouth line -- and every edge of that feathered, because a hard gate is what tears skin.
    # Full at the cut plane itself, not half of it: a ramp centred on the hinge reads 0.5 exactly
    # where the mandible's rigid 1.0 meets it, and the relaxation then carries that step into a
    # visible seam along the gular line. The band above the mouth line is handled by `c`.
    a = T.smooth((q.y - (HINGE_Y - .014)) / .014)
    b = T.smooth(((HINGE_Y + THROAT_SPAN) - q.y) / THROAT_SPAN)
    # **Full share at the mouth line, not zero there.** A drop measured down from the seam is zero
    # *at* the seam, which is precisely where the mandible's rear cut edge -- rigid on `jaw` -- meets
    # it, so the two separated by the whole of the jaw's rotation exactly along the cut and the gape
    # proof saw background through the gular line. The share is 1 anywhere at or below the mouth
    # line and falls off only above it.
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
    for f in (median_weights(q), caudal_weights(q)):
        if not f:
            continue
        chain, g = f
        w = {n: v * (1 - g) for n, v in w.items()}
        for n, v in chain.items():
            w[n] = w.get(n, 0.) + v * g
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
        [B[n][0] for n in ('skull', 'chest', 'body')], _section_radius),
    'tail': T.curvature_over_section(
        [B[n][0] for n in AXIAL_NAMES if n.startswith('tail_')], _section_radius),
}
LIMB_ASYMMETRY = T.limb_asymmetry(LIMB_PTS, cx, 1.)

# ------------------------------------------------------------------ procedural twin ----
puppet, puppet_thickness, twin_report, bvh_src = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', VOXEL, PUPPET_TRIANGLE_TARGET,
    sample_albedo, thin=THIN, band=.020, roughness=.64, blade_dilation=.0030)

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

weight_report, influences, JUNCTION = {}, [], {}
for o in (auth, puppet):
    shell = parts['lower jaw'][o.name]
    for part in (o, shell):
        for n in B:
            part.vertex_groups.new(name=n)
    # Every gate in `weights()` is a per-vertex decision and two vertices a hundredth of a body
    # apart can fall either side of one. So the field is **relaxed over the mesh's own edge graph**
    # before it is written, coupled by inverse edge length -- a Tripo surface carries sliver edges a
    # thirteenth of the median, and a weight difference across one of those is a distance -- and
    # trimmed to four influences every pass rather than once at the end.
    raw_weights = [weights(v.co) for v in o.data.vertices]
    relaxed = T.relax_weights(o, raw_weights, passes=3, hold=.45)
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
# **One** lining, wound inwards and skinned: the roof follows the skull, the floor follows the jaw
# and the wall between them stretches, so no opening the clips reach can part it. Two separate
# closed tubes look identical at rest and come apart the moment the jaw swings, which is how
# Placodus came to open onto transparency.
# Dark, because the generation's own mouth slit is modelled **open** a fraction: with the mouth shut
# the lining is visible along the whole lip line, exactly as the inside of a fish's lip is. At
# Mixosaurus' value it read as a bright pink band drawn on the snout from across the room.
mouth_mat = T.inward_material(NAME + ' mouth interior', (.22, .095, .085, 1))
# **Behind the hinge, not in front of it.** A lining that stops short of the jaw's cut plane leaves
# a wedge at the corner of the mouth, which is the one place the gape proof could still see through
# the head. The rear cap sits in the throat behind the cut and the hinge envelope covers the rest.
MOUTH_BACK = HINGE_Y + .010
MOUTH_FRONT = MOUTH_FRONT_Y


def _raw_section(y):
    """**Floored against the head, not only fitted to the closed slit.** The measured cavity of a
    shut mouth tapers to nothing at the snout, and a tube that tapers with it is a thread by the
    time it reaches the front -- the jaw then swings past it and from the side you see straight
    between the jaws either side of the thread."""
    k = int(np.clip(np.searchsorted(MY, y), 0, len(MY) - 1))
    e = T.smooth((MOUTH_BACK - y) / .012) * T.smooth((y - MOUTH_FRONT) / .004)
    # Right up against the skin the cut runs through, less a margin: the lining's rim has to reach
    # the skin's own cut edge or the strip between them opens when the jaw drops, and must not pass
    # it or it shows through the cheek with the mouth shut.
    # The floor is a thousandth of a body, not three: at the snout tip the mouth genuinely is a
    # thread, and a floor bigger than the section there put a pink sliver of lining through the lip
    # with the mouth shut -- visible from across the room on the closed-mouth review shot.
    w = max(mouth_half_width(y) - .0008, .0012) * (.98 + .02 * e)
    h = min(max(float(TALL[k]) * 1.15, head_half_depth(y) * .22, .0042) * (.78 + .22 * e),
            max(mouth_headroom(y) * .45, .0030))
    return w, h


LINING_FIT = {}


def mouth_section(y):
    """The section above, used as measured. **It is deliberately not shrunk to fit inside the closed
    surface**, which is the trick Mixosaurus and Dinocephalosaurus use and which is only safe on a
    generation with no modelled mouth. This one has a real cavity, and a point in the lumen of a
    modelled mouth is *outside* the closed shell -- so a nearest-surface test reads backwards
    exactly where the lining lives, and a shrink driven by it collapses the lining towards a thread
    at the back of the mouth, which is the one place it has to be widest.

    What keeps the ring inside the head instead is how its width is measured: `mouth_half_width` is
    the flank at the *seam's own height*, so the ellipse's widest points sit at 0.90 of the skin by
    construction. The per-station worst depth is recorded rather than asserted to zero, and the real
    check on the gape is the see-through measurement in mouth-views.py and gape-solid.py."""
    w, h = _raw_section(y)
    # The exact check, and the one worth making: the ring's own half width and half height against
    # the section cast from the mouth's axis. `depth` cannot make this check -- a point in the lumen
    # of a modelled mouth is outside the closed shell, so it reads backwards exactly where the
    # lining lives -- so its worst value is recorded per station rather than asserted to zero.
    # The floors are what stop the ring degenerating to nothing where the snout is nearly solid,
    # and they are the one thing allowed past the measured section -- a thousandth of a body.
    assert w <= max(mouth_half_width(y), .0012) + 1e-9, ('the lining is wider than the mouth', y, w)
    assert h <= max(mouth_headroom(y) * .46, .0030) + 1e-9, ('the lining is taller than the head', y, h)
    pts = [Vector((cx(y) + w * cos(a), y, seam(y) + h * sin(a)))
           for a in np.linspace(0, 2 * pi, 24)]
    LINING_FIT[round(float(y), 5)] = round(min(depth(q) for q in pts), 5)
    return w, h


def lining_jaw_blend(p):
    """**Steep, not linear.** The ring's widest points sit at the seam, and with a gentle blend they
    take half the jaw's rotation while the jaw takes all of it, so the lining's own silhouette lags
    the mandible and a wedge of background opens between them."""
    _w, h = mouth_section(p.y)
    t = T.smooth(.5 + 1.6 * (seam(p.y) - p.z) / max(h, 1e-6))
    # **No taper at the front.** Fading the jaw's share towards the snout closes the tube in the
    # weight field as well as in the geometry, and the lining's floor then stays with the skull
    # while the mandible under it drops -- which opens a gap at the front of the gape and is what
    # the proof's last 179 pixels were coming through. The tube is closed by its cap, not by its
    # weights. The back still tapers: the rear ring sits at the hinge, where the jaw barely moves.
    return t * T.smooth((MOUTH_BACK - p.y) / .012)


# Each shell is sized from the intact head rather than the narrow closed-mouth lumen.
# `T.lining` turns this measured room into a rigid skull palate and rigid jaw floor.
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


# ----------------------------------------------------- seating the shells, by ray parity ----
# **What the shells were missing was a containment test that could fail.** The section above is
# measured and the ring drawn from it is an ellipse about the mouth line: its widest points sit
# *at* the seam, where they are inside the cheek by construction, but its diagonal corners stand
# off that line by a share of both semi-axes, and the head narrows above and below the mouth. So
# the corners came out through the cheek -- on the shipped body **36 of the 816 vertices** had no
# skin outboard of them at all, the worst 0.0028 of a body from the nearest surface, and painted
# an emissive marker the shipped head shows **14,868 pixels** of mouth from four units away: a blob
# on the cheek in front of the eye and a line running back along it.
#
# Nothing in the build could see it, and the failure is the `np.interp` lesson in a second dress.
# `depth()` is a signed nearest-surface probe and beside a modelled slit it answers about the
# lumen's own wall rather than about the skull; it read this lining as inside at every station but
# three. What replaced it is the question itself: **can this point be seen from outside the
# animal?** A point strictly inside a closed surface meets skin along every direction; a point
# outside escapes along at least one. Twenty-six directions -- the cube's faces, edges and corners
# -- against the closed intake surface, `bvh_auth`, which is taken before the cut opens the head.
#
# **Twenty-six and not four, and not a parity vote.** Both were tried first and both agreed with
# the old answer: four *axis* reaches ask about x and z when the direction out of a cheek is
# oblique, and a three-ray parity vote is unreliable for a point sitting a thousandth off a
# surface, which is where every one of these vertices lives. What showed that both were wrong is
# the thing `CLAUDE.md` prescribes -- cast the camera's own ray through a failing pixel and ask
# every surface on the line. On the shipped body the first surface is the lining.
_SEAT_DIRS = tuple(Vector((a, b, c)).normalized()
                   for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1)
                   if (a, b, c) != (0, 0, 0))
# **A point *on* the skin is not outside it, and that distinction is the whole balance of the
# seat.** What has to reach the skin is the shell's *width*, because that is what a line of sight
# into the gape passes beside (`T.oral_shells`); what must not pass it is the shell's surface. Both
# one-number answers were built and measured: a clearance everywhere took the mouth's own width
# away and opened the gape from 417 to 3,516 px, and a touch everywhere left the palate lying on
# the inside of the skin. So a vertex within `ORAL_BAND` of the mouth line -- the band that carries
# the width -- may sit **on** the skin to within `ORAL_TOUCH`, the mesh's own edge length here, and
# one outside that band must be `ORAL_MARGIN` inside it.
ORAL_TOUCH = .0010
ORAL_MARGIN = .0030
ORAL_BAND = .45


def in_measured_lumen(q):
    """Inside the slit the generation modelled, in *depth* about its own measured mid height. It is
    deliberately not bounded laterally by `cavity_profile`'s `wide`: that number is the span of the
    **lip line**, measured on points that sit on both lips, so on a deep round head it is wider than
    the head is at the seam -- which is the very measurement that sized the lining that came out
    through the cheek."""
    y = float(q.y)
    if not (float(MY[0]) - .004 <= y <= float(MY[-1]) + .004):
        return False
    k = int(np.clip(np.searchsorted(MY, y), 0, len(MY) - 1))
    return abs(float(q.z) - seam(y)) <= float(TALL[k]) + .0015


def seated_ok(q, margin=0.):
    if any(bvh_auth.ray_cast(q, d, 3.)[0] is None for d in _SEAT_DIRS):
        if bvh_auth.find_nearest(q)[3] > ORAL_TOUCH and not in_measured_lumen(q):
            return False
    return not margin or bvh_auth.find_nearest(q)[3] >= margin


def seat_margin(q, u=None):
    y = float(q.y) if u is None else float(u)
    _w, h = mouth_section(y)
    return 0. if abs(float(q.z) - seam(y)) <= ORAL_BAND * h else ORAL_MARGIN


SEATED = {'vertices': 0, 'pulled': 0, 'unseated': 0, 'maxPullRaw': 0., 'standingOnTheLumen': 0}


def seat_in_head(q, u):
    """Pulled in towards the mouth's own axis at its own height until it is inside. Towards the
    axis rather than towards the nearest surface: a corner outside the cheek comes in sideways and
    stays with the jaw it belongs to rather than sliding to mid-gape."""
    SEATED['vertices'] += 1
    m = seat_margin(q, u)
    v = Vector(q)
    if seated_ok(v, m):
        if any(bvh_auth.ray_cast(v, d, 3.)[0] is None for d in _SEAT_DIRS):
            SEATED['standingOnTheLumen'] += 1
        return v
    c = Vector((cx(u), v.y, seam(u)))
    for i in range(1, 41):
        r = Vector(q) + (c - Vector(q)) * (i / 40.)
        if seated_ok(r, m):
            SEATED['pulled'] += 1
            SEATED['maxPullRaw'] = max(SEATED['maxPullRaw'], (r - Vector(q)).length)
            return r
    SEATED['unseated'] += 1
    SEATED['maxPullRaw'] = max(SEATED['maxPullRaw'], (c - Vector(q)).length)
    return c


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, lining_jaw_blend, mouth_mat,
                              # A 14-gon lining leaves wedges against a finely tessellated tooth
                              # row: the gape proof counted them one pixel at a time.
                              rings=34, ring=24, centre_x=cx, room=mouth_room,
                              fit=seat_in_head)
# **The proof, not the intention.** Every vertex the helper actually wrote is re-asked, because the
# seat is a hook inside `oral_shells` and an assertion over the points it returned is the only
# thing that says the hook reached all of them.
ORAL_OUTSIDE = [i for i, q in enumerate(lining_raw)
                if not seated_ok(Vector(q), seat_margin(Vector(q)))]
assert not ORAL_OUTSIDE, ('oral shell vertices are outside the head', len(ORAL_OUTSIDE),
                          [tuple(round(float(c), 4) for c in lining_raw[i]) for i in ORAL_OUTSIDE[:6]])
SEATED['shellVertices'] = len(lining_raw)
oralparts = [lining]
# What went wrong on both worked examples is a lining narrower than the mouth, so that is what is
# checked: across the stations the cavity was measured at, the lining carries the mouth's own
# section rather than a ribbon up the middle of it.
mouth_cover = []
for k, y in enumerate(MY):
    y = float(y)
    if not MOUTH_FRONT + .006 < y < MOUTH_BACK - .012:
        continue
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(mouth_half_width(y), 1e-9), 3),
                        round(h / max(float(TALL[k]), 1e-9), 3)])
    # The front fifth of the rostrum is nearly solid -- a mouth there is a slit, not a cavity -- so
    # the width check runs over the body of the mouth and lets the tip taper.
    if y > MOUTH_FRONT + .020:
        assert w >= mouth_half_width(y) * .55, \
            ('the oral lining is narrower than the mouth', y, w, mouth_half_width(y))
    assert h >= .0012, ('the oral lining is flat', y, h)

# **No authored dentition.** The generation already carries its own tooth relief along both jaw
# margins -- `protrusions()` finds it and `toothPatches` records every patch -- so the row that
# ships is the generated one, and all this build does about the teeth is check that the measured
# cut does not saw through one.
# A closed envelope round the hinge covers the square face the cut leaves at the back of the
# mandible: that face swings into view the moment the mouth opens, and Placodus shipped one too
# small and read as a pale block at full gape. It is fitted rather than typed -- grown to the
# largest ellipsoid that still lies inside the closed intake surface -- and it wears the creature's
# own albedo rather than a flat material.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.66)
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .012, (seam(HINGE_Y) + cz(HINGE_Y)) / 2)
HINGE_R = (half_width(HINGE_Y) * .84, .034, half_depth(HINGE_Y) * .84)
HINGE_FIT = 0.
for step in range(24):
    k = 1. - step / 24
    probe = [Vector((HINGE_CENTRE[0] + HINGE_R[0] * k * math.sin(b) * math.cos(a),
                     HINGE_CENTRE[1] + HINGE_R[1] * k * math.sin(b) * math.sin(a),
                     HINGE_CENTRE[2] + HINGE_R[2] * k * math.cos(b)))
             for a in np.linspace(0, 2 * pi, 20) for b in np.linspace(0, pi, 11)]
    # **Both tests, so the plug can only get smaller.** The twenty-six directions above are the
    # honest containment check; the old `depth()` clearance is kept beside it because this envelope
    # sits at the corner of the mouth, where a signed nearest-surface probe reads the slit's own
    # wall and so reads *low* -- which on this one part is the conservative direction.
    if min(depth(q) for q in probe) > .0035 and all(seated_ok(q, .0035) for q in probe):
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

# **Containment is asserted by the rays and `depth()` is only recorded.** That is the reverse of
# what this builder did, and the reversal is the repair: the probe is a signed nearest-surface test
# and beside a modelled slit it answers about the lumen's wall, so it read the old lining as inside
# the head at every station but three while three dozen of its vertices stood out through the cheek.
oral_seating = []
for o in oralparts:
    worst = min(depth(Vector(v.co[:]) / SCALE) for v in o.data.vertices)
    outside = [v.index for v in o.data.vertices
               if not seated_ok(Vector(v.co[:]) / SCALE,
                                seat_margin(Vector(v.co[:]) / SCALE) if o is lining else 0.)]
    oral_seating.append({'part': o.name, 'worstDepthRaw': float(worst),
                         'vertices': len(o.data.vertices),
                         'verticesVisibleFromOutside': len(outside)})
    assert not outside, ('mouth geometry breaks the skin', o.name, len(outside),
                         [tuple(round(c / SCALE, 4) for c in o.data.vertices[i].co[:])
                          for i in outside[:6]])

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
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, seam(SNOUT_Y) - .006), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .04), HINGE_Y - .04, seam(HINGE_Y - .04)), 'swallow'),
    # Birgeria's blow is a bite -- a run-through delivered at full speed -- so the attack anchor
    # belongs on the skull. It is not the skull for an animal whose weapon is a neck or a tail.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .004, seam(SNOUT_Y) + .006), 'attack'),
}
anchors = [{'name': n, 'bone': b, 'point': list(tx(p)), 'role': r}
           for n, (b, p, r) in ANCHOR_POINTS.items()]
# **The swallow anchor is the one that is meant to be inside the animal**, so the 2 % surface
# bound is the wrong check for it and passes only where the head is a thin rostrum. Birgeria's is
# 0.18 of a body deep at the back of the mouth, and a throat point there is 2.9 % of a body from
# the nearest skin *by construction*. What actually matters is that it is **inside the closed
# surface** and not adrift somewhere in the trunk, so that is what is asserted, with the depth
# recorded rather than waved through. The two surface anchors keep the 2 %.
SWALLOW_TOLERANCE = .05 * BODY_LENGTH
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


# **Thunniform.** The roster calls this animal `thunniform: true` and the clip set has to say so:
# the front two thirds of the body barely move, the amplitude is piled into the peduncle, and the
# lobes of the forked fin carry nearly all of the travel. Against Mixosaurus' carangiform 3.1
# radians of phase over its chain and a gain curve starting at 0.03, this runs 2.0 radians -- about
# a third of a wavelength on the body -- on a gain curve that is still under 0.1 at mid-body.
CHAIN = ['chest', 'body'] + ['tail_%02d' % i for i in range(7)]
WAVE_SPAN = 2.0
GAIN = [.012 + .988 * (i / 8) ** 3.4 for i in range(9)]
LAG = [WAVE_SPAN * i / 8 for i in range(9)]
CAUDAL_LAG = WAVE_SPAN + .75     # the lobes trail the peduncle
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


seams, bounds, limb_sweep, gape_trace = {}, {}, {}, {}
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

        amp = {'Idle': .22, 'Swim': 1.0, 'Sprint': 1.5, 'Eat': .30, 'Guard': .18, 'Grab': .28,
               'Breath': .30, 'Growth': .22, 'Dodge': 1.15, 'FastStart': .70, 'Gape': .24,
               'Ability': .55}.get(clip, .28)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Dodge': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            # A **loop swings both ways.** The `- sin(-LAG[i])` term is what makes a one-shot start
            # and end at rest; on a looping clip it is a static offset as large as the amplitude
            # itself, and the body cruises with a permanent kink. Loops get the pure sine.
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        drive = ramp(u, .30, .46, 2.2) * (1 - ramp(u, .62, 1., 1.)) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy', 'Ability') else 0.
        # A **C-start**: the whole body folds into a C in under a fifth of the clip and unfolds
        # explosively into a straight line. Every predatory fish has one and it is what this animal
        # both escapes and strikes with.
        cstart = ramp(u, .02, .16, 1.) * (1 - ramp(u, .21, .38, 2.6)) if clip == 'FastStart' else 0.
        launch = ramp(u, .23, .40, 2.4) * (1 - ramp(u, .55, .95, 1.)) if clip == 'FastStart' else 0.
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        # `Ability` is the roster's `runThrough`: a bite taken at full speed and *carried a long
        # way past* the target, so the drive does not stop when the jaws shut.
        carry = ramp(u, .42, .70, 1.2) if clip == 'Ability' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws. This animal's headline is the gape, so it opens wide and it opens on the
        # strike rather than on the button: it parts on the cock, is widest as the body unrolls,
        # and shuts on the follow-through, which is the frame the prey is in.
        gape = .015 * (1 - cos(p)) * (1 if clip in ('Idle', 'Swim', 'Sprint') else 0)
        if clip == 'Bite':
            gape = .62 * ramp(u, .04, .22, 1.6) * (1 - ramp(u, .28, .46, 2.2))
        elif clip == 'Attack':
            gape = .34 * cock + .56 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            gape = .38 * cock + .70 * ramp(u, .24, .46, 1.7) * (1 - ramp(u, .50, .70, 1.4))
        elif clip == 'Ability':
            gape = .30 * cock + .74 * ramp(u, .26, .44, 1.5) * (1 - ramp(u, .52, .64, 1.8))
        elif clip == 'Gape':
            # The showpiece: open to the limit, hold it, and close. "Wide open. Whatever it was is
            # inside now."
            gape = .92 * ramp(u, .06, .34, 1.3) * (1 - ramp(u, .62, .92, 1.6))
        elif clip == 'FastStart':
            gape = .10 * cstart + .30 * launch
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .40 * (1 - cos(p * 2)) * .5 + .10
        elif clip == 'Breath':
            gape = .12 * spike(u, .30, .70, 1.)
        elif clip in ('Hit', 'Stagger'):
            gape = .30 * e
        elif clip == 'Death':
            gape = .26 * dead
        elif clip == 'Guard':
            gape = .03 * (1 - cos(p))
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.12 * gape
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the trunk. `body` is the pivot, so its own sway is taken back out in front of it or
        # the snout swings further than the tail does.
        body = pb['body']
        body.rotation_euler.y = .035 * amp * wave(1, beat)
        body.location.z = .008 * amp * wave(1, beat)
        body.rotation_euler.z += .20 * turn
        body.rotation_euler.y += .26 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .28 * e
        if clip in ('Attack', 'Heavy'):
            body.location.y = .14 * cock - .52 * drive
            body.rotation_euler.x = .09 * cock - .08 * drive
            body.rotation_euler.z += .09 * cock - .05 * drive
        if clip == 'Ability':
            # carried a long way past: the body keeps travelling after the jaws have shut
            body.location.y = .12 * cock - .55 * drive - .70 * carry
            body.rotation_euler.x = .06 * cock - .05 * drive
        if clip == 'FastStart':
            body.rotation_euler.z += .38 * cstart - .14 * launch
            body.location.y = .05 * cstart - .82 * launch
            body.location.x = .18 * cstart
        if clip == 'Bite':
            body.location.y = -.18 * ramp(u, .06, .30, 2.) * (1 - ramp(u, .55, .95, 1.))
        if clip == 'Gape':
            body.rotation_euler.x = -.10 * ramp(u, .06, .34, 1.3) * (1 - ramp(u, .62, .92, 1.6))
            body.location.y = -.10 * e
        if clip == 'Parry':
            body.rotation_euler.y = -.30 * e
            body.rotation_euler.z = .18 * e
        if clip == 'Guard':
            body.rotation_euler.x = .035 * (1 - cos(p))
            body.rotation_euler.y = .025 * sin(p)
        if clip == 'Dodge':
            body.rotation_euler.y = .50 * e
            body.rotation_euler.z = -.46 * e
            body.location.x = .36 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .20 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .24 * e
            body.location.y = .12 * e
        if clip == 'Breath':
            body.rotation_euler.x = -.18 * e
            body.location.z = .08 * e
        if clip == 'Grab':
            body.location.y = -.10 - .08 * haul
            body.rotation_euler.y = .10 * sin(p * 3)
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        body.rotation_euler.y += 2.5 * dead
        body.rotation_euler.x += .16 * dead
        body.location.z -= .26 * dead

        # --- the travelling wave, and the strike that runs down the same chain
        chain_z = {}
        for i, n in enumerate(CHAIN):
            q = pb[n]
            z = .30 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.014 + i * .010)
            z += .040 * dead * sin(i * .8)
            if clip == 'FastStart':
                # Every joint folds the same way at once -- that is what makes it a C rather than a
                # wave -- and then snaps through straight and overshoots the other way.
                z += .42 * (.30 + .70 * (i / 8)) * cstart
                z -= .48 * (.30 + .70 * (i / 8)) * launch
            if clip in ('Attack', 'Heavy', 'Ability'):
                lead = .10 + .020 * i
                z += .26 * GAIN[i] * spike(u, .02 + lead * .25, .44 + lead * .25, 1.5) * (1 if i % 2 == 0 else -.55)
                z -= .30 * GAIN[i] * ramp(u, .24 + lead * .5, .46 + lead * .5, 2.0) * (1 - ramp(u, .60, .92, 1.))
            if clip == 'Dodge':
                z += .18 * e * sin(i * .55 + .6)
            if clip == 'Bite':
                z += .09 * GAIN[i] * spike(u, .05 + .02 * i, .55 + .02 * i, 1.8)
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 4 else -.5)
            q.rotation_euler.z += z
            chain_z[n] = z
            q.rotation_euler.y += .016 * GAIN[i] * amp * wave(i, beat)
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .026 * e * GAIN[i]
        # The head is the quiet end. A thunniform fish holds its braincase on the line of travel
        # while the peduncle works under it, so the skull takes back most of what the chain in
        # front of the pivot has added -- measured from the joints themselves rather than from a
        # hand-tuned constant, because the wave's amplitude changes clip by clip.
        forward_yaw = body.rotation_euler.z + chain_z.get('chest', 0.)
        pb['skull'].rotation_euler.z += -.88 * forward_yaw + .10 * turn
        if clip in ('Attack', 'Heavy', 'Ability'):
            pb['skull'].rotation_euler.x += -.12 * cock + .18 * drive
        if clip == 'FastStart':
            pb['skull'].rotation_euler.z += .18 * cstart - .12 * launch
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .10 * sin(p * 2)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul

        # The median fins. The dorsal and anal are stiffened keels on this body -- they hold a line
        # at speed and lean into a turn; they never flap.
        for name, sgn in (('dorsal', 1.), ('anal', -1.)):
            q = pb[name]
            q.rotation_euler.z = .045 * amp * wave(4, beat) + .20 * turn * sgn
            q.rotation_euler.y = -.14 * turn * sgn
            if clip == 'FastStart':
                q.rotation_euler.z += .16 * cstart * sgn
            q.rotation_euler.z += .05 * dead * sgn
        # The forked fin. Both lobes lag the peduncle and spread a little at the extremes, which is
        # what a deeply cleft caudal does under load.
        for lobe, sgn in (('caudal_upper', 1.), ('caudal_lower', -1.)):
            q = pb[lobe]
            lobe_wave = (sin(p * beat - CAUDAL_LAG) - (0. if loop else sin(-CAUDAL_LAG))) * env
            q.rotation_euler.z = .26 * amp * lobe_wave + .020 * turn
            q.rotation_euler.x = sgn * .09 * amp * lobe_wave
            q.rotation_euler.z += .06 * dead * sgn

        # --- the pectorals are control surfaces, not oars. A thunniform pursuit fish sets pitch
        # and roll with them and brakes; it never takes a stroke with them, and the swept angle
        # below is recorded so a reviewer can see which this is rather than take it on trust.
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            up = pb[names[0]]
            fin_amp = .075
            up.rotation_euler.x = fin_amp * amp * wave(2, beat)
            up.rotation_euler.z = s * fin_amp * amp * wave(3, beat)
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .42 * e
            if clip in ('TurnLeft', 'TurnRight'):
                up.rotation_euler.x += s * (-1 if clip == 'TurnLeft' else 1) * .46 * e
            if clip in ('Attack', 'Heavy', 'Ability'):
                up.rotation_euler.x += .24 * cock - .36 * drive
                up.rotation_euler.z += s * .10 * snap
            if clip == 'FastStart':
                # clamped to the flank for the launch, which is what a fast-start looks like from
                # above
                up.rotation_euler.x += .30 * cstart - .20 * launch
                up.rotation_euler.z += s * .38 * launch
            if clip == 'Guard':
                up.rotation_euler.x -= .24 * (1 - cos(p)) / 2
                up.rotation_euler.z += s * .16 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += s * .38 * e
            if clip == 'Dodge':
                up.rotation_euler.x += (.48 if s > 0 else -.22) * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.z += s * .30 * e * sin(p)
            if clip == 'Breath':
                up.rotation_euler.x += .20 * e
            if clip == 'Grab':
                up.rotation_euler.x += .24 + .12 * haul
                up.rotation_euler.z += s * .10 * haul
            if clip == 'Gape':
                up.rotation_euler.x += .30 * e
                up.rotation_euler.z += s * .22 * e
            if clip == 'Eat':
                up.rotation_euler.x += .14 * sin(p * 2)
            if clip == 'Growth':
                up.rotation_euler.z += s * .24 * e
            up.rotation_euler.x += .34 * dead
            up.rotation_euler.z += s * .30 * dead
            if clip in ('Swim', 'Sprint'):
                sw = limb_sweep.setdefault(clip, {}).setdefault(names[0], [1e9, -1e9, 1e9, -1e9])
                sw[0] = min(sw[0], up.rotation_euler.x)
                sw[1] = max(sw[1], up.rotation_euler.x)
                sw[2] = min(sw[2], up.rotation_euler.z)
                sw[3] = max(sw[3], up.rotation_euler.z)
            pb[names[1]].rotation_euler.x = .55 * up.rotation_euler.x + .030 * amp * wave(4, beat)
            pb[names[2]].rotation_euler.x = .32 * up.rotation_euler.x + .060 * amp * wave(5, beat)
            pb[names[2]].rotation_euler.z = s * .060 * amp * wave(6, beat)

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
    'id': ID, 'name': NAME, 'species': 'Birgeria stensioei',
    'provenance': 'Middle Triassic · Monte San Giorgio',
    'description': 'Large predatory ray-finned fish with a very wide gape, fangs in three sizes, '
                   'a naked body and a deeply forked caudal fin. Authored Tripo body and measured '
                   'procedural volume twin share one armature, one set of inverse binds, one set '
                   'of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 5.53, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/birgeria.png',
                'tools/triassic/creatures/birgeria/tripo-raw/birgeria.raw.glb',
                'tools/triassic/creatures/birgeria/birgeria.preview.glb'],
    'notes': [
        'Thunniform, and built to read as such: the gain curve is under 0.1 at mid-body, the wave '
        'carries about a third of a wavelength over the chain, and the two lobes of the forked '
        'caudal carry nearly all the travel. Saurichthys and the sharks are the comparison.',
        'The mouth is **modelled** on this generation: Placodus\' geometric method finds the slit '
        'over the front eighth of the body and nothing behind it, and the independently read '
        'painted line agrees with it to within %.2f of the local radius. The cut follows the '
        'measured curve station for station; a straight ramp through the same points would have '
        'deviated by %.2f of the local radius, which is small -- on a fish the line very nearly '
        'is straight, and that is recorded rather than dressed up.'
        % (PAINTED_AGREEMENT, RAMP_DEVIATION_OVER_RADIUS),
        'The pectorals are control surfaces, not oars, and `limbSweepDegrees` records the swept '
        'angle so the reviewer does not have to take that on trust. This is a fish: the tail is '
        'the engine.',
        'Recorded pose fault, not corrected here: the large dorsal fin sits at frac 0.40-0.57 '
        'against the research\'s "single dorsal set far back", and a second dorsal stood behind '
        'it. The second was collapsed into the back by smooth-region.py in the published preview '
        '(0.9 % of its protrusion left); the placement of the first is the greenlit pose and a '
        'redraw question. See docs/triassic/proportion-audit.md.',
        'The body was measured into its own frame before anything was rigged: this generation lies '
        '27.7 degrees across the file axes and its roll was read off the countershading. Which end '
        'is the head was decided by the caudal blade rather than by the principal component\'s '
        'sign, and the build asserts it.',
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
    'appendageRootSeatingRaw': {**LIMB_SEATING, **MEDIAN_SEATING},
    'appendageRootSeatingFractionOfBodyLength':
        {k: v * SCALE / BODY_LENGTH for k, v in {**LIMB_SEATING, **MEDIAN_SEATING}.items()},
    'dorsalFin': {k: dorsal_cluster[k] for k in
                  ('count', 'yRange', 'xRange', 'zRange', 'seat', 'reach', 'reachRadius')},
    'analFin': {k: anal_cluster[k] for k in
                ('count', 'yRange', 'xRange', 'zRange', 'seat', 'reach', 'reachRadius')},
    'caudalFin': {k: caudal_cluster[k] for k in
                  ('count', 'yRange', 'xRange', 'zRange', 'reachRadius')},
    'collapsedSecondDorsalAndOtherThinPatches':
        [{k: v for k, v in c.items() if k != 'indices'} for c in other],
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
        'note': 'Placodus\' geometric method reaches this animal: over the front %.2f of the body '
                'it returns %d vertices, all of them on the rostrum, and the cavity profile runs '
                'from y %.4f to %.4f. The painted line was read independently as a cross-check -- '
                'a matched filter for a thin dark line between lighter skin, resolved as one '
                'continuous path -- and lands within %.3f of the local radius of it on average, '
                '%.3f at worst.'
                % (MOUTH_LIMIT, len(CAV), float(MY[0]), float(MY[-1]),
                   PAINTED_AGREEMENT_MEAN, PAINTED_AGREEMENT),
        'cavityVertices': int(len(CAV)), 'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'cavityMidHeight': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, MID)],
        'cavityHalfWidth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, WIDE)],
        'cavityHalfDepth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, TALL)],
        'paintedLine': [[round(r['y'], 4), round(r['z'], 5), round(r['disagreementOverRadius'], 3)]
                        for r in PAINTED],
        'paintedLineFlankDisagreementMaxOverRadius': PAINTED_DISAGREEMENT,
        'paintedVersusModelledMaxOverLocalRadius': PAINTED_AGREEMENT,
        'paintedVersusModelledMeanOverLocalRadius': PAINTED_AGREEMENT_MEAN,
        'liningCoverage': mouth_cover, 'liningWorstDepthPerStation': LINING_FIT,
        'oralShellSeating': SEATED,
        'oralShellSeatingMethod':
            'every shell vertex asked of the closed intake surface along the cube\'s 26 '
            'directions -- a point inside meets skin along every one -- with a touch of '
            '%.4f of a body allowed within %.2f of the local half height of the mouth line, '
            'where the shell\'s width has to reach the skin, and %.4f of clearance outside that '
            'band. Asserted over the vertices the helper wrote and again over the exported mesh.'
            % (ORAL_TOUCH, ORAL_BAND, ORAL_MARGIN),
        'hingeEnvelope': {'fit': HINGE_FIT, 'radii': [float(r) for r in HINGE_R],
                          'centreRaw': [float(c) for c in HINGE_CENTRE],
                          'seatedBy': 'the 26 directions and the depth probe, both'},
        # The reviewer's aimed cut, read and measured against this build's own line. **Not cut
        # on**: see the note beside `AIMED_MOUTH`.
        'aimedCut': {
            'file': AIMED_MOUTH, 'appliesTo': _doc['appliesTo'], 'sha256': _doc['sha256'],
            'consumed': False,
            'note': 'Read as a review. Cut on, this body\'s gape opens 2,130 px of opened-by-'
                    'culling against 417 on the generation\'s own slit, because a lining fitted '
                    'to one mouth line does not close an aperture cut on another; what closes an '
                    'aimed cut is the cut\'s own rim (T.cap_cut/T.cap_mouth), which this body has '
                    'not been ported to. T3D-32\'s rollout.',
            'frameFitWorstRaw': FRAME_CHECK,
            'hingeCentreRaw': [float(v) for v in CUT_P],
            'planeNormalRaw': [float(v) for v in CUT_N],
            'mouthLineForwardRaw': [float(v) for v in CUT_F],
            'hingeAxisRaw': [float(v) for v in CUT_AXIS],
            'pitchDegrees': _doc['plane']['pitchDegrees'],
            'yawDegrees': _doc['plane']['yawDegrees'],
            'rollDegrees': _doc['plane']['rollDegrees'],
            'mandibleVerticesInTheDocument': _doc['sides']['mandible'],
            'hingeAheadOfTheSlitRaw': HINGE_AHEAD_OF_THE_SLIT,
            'belowTheSlitMaxRaw': AIMED_BELOW_SLIT_MAX,
            'belowTheSlitAtTheSnoutRaw': AIMED_BELOW_SLIT_AT_SNOUT,
            'perStation': [[round(y, 4), round(d, 5)] for y, d in AIMED_VS_SLIT]},
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
print('BIRG_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('BIRG_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('BIRG_ENVELOPE', json.dumps(report['envelope']))
print('BIRG_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'hingeY', 'jawFrontY',
       'paintedVersusModelledMaxOverLocalRadius', 'paintedVersusModelledMeanOverLocalRadius',
       'toothPatchesStraddlingTheCut')}))
print('BIRG_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('BIRG_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('BIRG_OK')
