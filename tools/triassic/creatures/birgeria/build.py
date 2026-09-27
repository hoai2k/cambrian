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
skin on the plane a reviewer aimed in the viewer's mouth editor (`docs/triassic/mouths/`), the teeth
are the generation's own, and the mouth is closed by the cut's own rim (`T.cap_cut` at the hinge,
`T.cap_mouth` along the mouth line, each half domed into itself) -- no lining, no hinge envelope,
nothing authored at all: every vertex that closes the mouth is a span of vertices the cut made, and
wears the skin it closes.

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
# The twin target was set while a 34 x 24 oral lining was counted in both bodies (at 6400 the LOD
# came to 38.9 % of the authored triangles). The lining is gone and the target is kept, so the twin
# is the same resolution it was and only the mouth changed.
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
# Double-sided, as this body has always shipped. It is no longer a backstop behind a lining -- the
# caps close each half by construction -- but a single-sided skin is what `gape-solid.py`'s cull
# shim models, and what a player would see through any gap that did open is the unlit inside of the
# head rather than the world. Nothing is gained by making that worse.
skin_material.use_backface_culling = False
# **Which end is the head.** `measure_frame` is told the sign, and on a fish the sign is decided by
# the caudal fin: the deepest thin cluster sits at the tail, and a fish's head is not thin. Both
# orientations are measured here and the one that puts that cluster at +Y is kept, so the answer is
# the animal's rather than the principal component's arbitrary sign.
frame = T.measure_frame(auth, head_is_positive_pca=False, luminance_at=luminance_at)
# Nothing here is authored any more -- the caps are spans of the cut's own rim and take their UVs
# and vertex colours off it -- so the generation's pigment sampler, which the retired hinge
# envelope needed, is gone with it.

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
MOUTH_METHOD = ('aimed by hand in the viewer\'s mouth editor (%s); the modelled slit -- found by '
                'the geometric method and cross-checked against the painted line -- is measured '
                'beside it and no longer cuts' % 'docs/triassic/mouths/birgeria-mouth.json')
assert len(CAV) > 50, ('the mouth cavity did not measure', len(CAV))
MY, MID, WIDE, TALL = T.cavity_profile(CAV, Y0 + .002, Y0 + .115, .0025, .006)
assert len(MY) > 16, ('the modelled cavity is too short to be the mouth', len(MY))


def measured_seam(y):
    """What the *generation* says the mouth line is: the mid height of the modelled slit, station
    by station. No longer the cut -- kept as the record the aimed cut is measured against."""
    return float(np.interp(y, MY, MID))


# Where the modelled slit peters out. This used to be the hinge, and every axial station of the rig
# is still hung off it (see the rig), so only the jaw moves with the aimed cut.
SLIT_BACK_Y = float(MY[-1])
HEAD_BACK = Y0 + .235          # where the gill cover ends and the pectoral girdle begins

# **The cross-check, and it is the point of doing two methods.** The painted line is read
# independently -- a matched filter for a thin dark line between lighter skin, resolved as one
# continuous path along the head -- and compared with the modelled slit over the stations they
# share. Agreement says the geometric method found the mouth rather than a crease; disagreement
# would say one of them found something else, which is exactly the fault Keichousaurus records.
PAINTED = T.painted_line(auth, luminance_at, cz, half_depth, Y0 + .012, SLIT_BACK_Y + .010,
                         u_lo=-.95, u_hi=.25, stations=28)
assert PAINTED, 'the painted mouth line did not read'
_py = np.array([r['y'] for r in PAINTED])
_pz = np.array([r['z'] for r in PAINTED])
_shared = (_py >= MY[0]) & (_py <= MY[-1])
_gap = np.abs(_pz[_shared] - np.array([measured_seam(float(y)) for y in _py[_shared]]))
_rad = np.array([max(half_depth(float(y)), 1e-4) for y in _py[_shared]])
PAINTED_AGREEMENT = float(np.max(_gap / _rad))
PAINTED_AGREEMENT_MEAN = float(np.mean(_gap / _rad))
PAINTED_DISAGREEMENT = float(np.max([r['disagreementOverRadius'] for r in PAINTED]))
assert PAINTED_AGREEMENT < .40, ('the two mouth readings disagree', PAINTED_AGREEMENT)

# **Is it straight?** On a fish it very nearly is. Recorded, because it is what the generation's
# own line would have cost as a straight cut; the aimed cut below *is* a plane.
_ramp = np.polyfit(MY, MID, 1)
RAMP_DEVIATION_RAW = float(np.max(np.abs(MID - np.polyval(_ramp, MY))))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(MID - np.polyval(_ramp, MY)) / np.array([max(half_depth(float(y)), 1e-4) for y in MY])))


# ----------------------------------------------------------------------- the aimed cut ----
# **The cut is a human's now** (`docs/viewer-mouth.md`). A reviewer aimed a cut plane and a hinge on
# this exact shipped body in the viewer's mouth editor -- the file hash-matched the body it was
# aimed on -- and exported the six numbers. That file is the cut; Cartorhynchus' builder is the
# pattern this follows, down to the frame check.
#
# What the reviewer moved, against the slit this builder used to cut on:
#   * the line is pitched **+32.1 deg** in profile where a straight ramp through the slit reads
#     about +25, so the cut leaves the generation's own lip at the snout and dives under it towards
#     the back -- recorded station by station in `aimedCut.perStation`;
#   * the hinge sits **9.9 % of the body back from the nose**, a little behind where the modelled
#     slit peters out: the slit is the lip the generation drew, not the joint the jaw turns about;
#   * the plane carries **-11.1 deg of roll and +2.8 deg of yaw**, a term in x that the old sheared
#     curve could not carry even in principle.
#
# The seam is read on the body's **own measured centreline** (`cx`) rather than on the hinge
# point's own x: that is the lesson the two fish ports paid for, and an aimed plane does not repeal
# it -- the plane carries the reviewer's yaw and roll, `cx` carries the animal's own wander. Here
# the two agree: the reviewer seated the hinge 0.0006 of a body from the measured centreline
# (`aimedCut.jawJointRaw` against `hingeCentreRaw`), where the head's own bounding-box middle, which
# the document also records, stands 0.016 away from both -- this generation's head is not centred
# on its own box. The hinge *line* is the plane's intersection with the hinge wall, so the jaw
# joint is seated on that line at the centreline, which is the same pivot the reviewer aimed rather
# than a second one.
AIMED_MOUTH = 'docs/triassic/mouths/birgeria-mouth.json'
_doc = json.loads(open(os.path.join(ROOT, AIMED_MOUTH)).read())
assert _doc['schema'] == 'mouth-cut/1' and _doc['id'] == ID, (_doc.get('schema'), _doc.get('id'))
assert _doc['appliesTo'] == 'built', _doc['appliesTo']
assert (_doc['frame']['axis'], _doc['frame']['forward'], _doc['frame']['up']) == ('z', 1, 'y')


def from_gltf_point(p):
    """The export frame into this builder's. `tx` scales by SCALE and the glTF exporter's
    `export_yup` sends Blender (x, y, z) to glTF (x, z, -y); this is that, inverted."""
    return Vector((p[0] / SCALE, -p[2] / SCALE, p[1] / SCALE))


def from_gltf_dir(d):
    return Vector((d[0], -d[2], d[1]))


# **A direction handed in from outside is in the file's frame, so fit the frame rather than
# assume it.** The map above is the exporter's own convention and not a measurement, so it is
# checked against something the document measured on the shipped file and this build can measure
# on the intake: the bounding box over every vertex. Six numbers, and if the head end or the up
# axis were the other way round they would disagree by a body length rather than by a rounding.
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
assert abs(CUT_AXIS.dot(CUT_N)) < 1e-3 and abs(CUT_AXIS.dot(CUT_F)) < 1e-3, \
    ('the hinge axis is not the plane\'s own hinge line', CUT_AXIS.dot(CUT_N), CUT_AXIS.dot(CUT_F))
assert CUT_N.z > .5 and CUT_F.y < -.5, (tuple(CUT_N), tuple(CUT_F))   # up out of the mouth, and forward
# The hinge axis runs across the head the way the builder's own +x does, so the jaw -- which turns
# about +x on its seat on the hinge line, see the armature -- opens the way the reviewer aimed.
assert CUT_AXIS.x > .9, ('the hinge axis is not across the head', tuple(CUT_AXIS))
HINGE_Y = float(CUT_P.y)


def plane_z(x, y):
    """The aimed plane solved for z. A plane is what the reviewer aimed, so it is cut as a plane
    and not sheared onto one: the yaw and the roll are the x term, which no curve of y can carry."""
    return float(CUT_P.z - (CUT_N.x * (x - CUT_P.x) + CUT_N.y * (y - CUT_P.y)) / CUT_N.z)


def seam(y):
    """The mouth line: the aimed plane read on the body's own measured centreline."""
    return plane_z(cx(y), y)


def below_cut(p):
    return (Vector(p) - CUT_P).dot(CUT_N) < 0


def ahead_of_hinge(p):
    return (Vector(p) - CUT_P).dot(CUT_F) > 0


def on_hinge_wall(p):
    return abs((Vector(p) - CUT_P).dot(CUT_F)) < 1e-5


def hinge_line_at(x):
    """The point on the hinge line -- the plane's own intersection with the hinge wall -- at a given
    x. Every point of that line is the same pivot, so seating the jaw here rather than at the
    reviewer's handle is the reviewer's hinge, on the head's own middle."""
    return CUT_P + CUT_AXIS * ((x - CUT_P.x) / CUT_AXIS.x)


# What the human and the generation disagree about, station by station over the slit the
# generation modelled. Recorded, never averaged: an aimed cut that agreed with the measurement
# everywhere would not have been worth aiming.
AIMED_VS_SLIT = [(float(y), measured_seam(float(y)) - seam(float(y))) for y in MY]
AIMED_BELOW_SLIT_MAX = float(max(d for _y, d in AIMED_VS_SLIT))
AIMED_BELOW_SLIT_AT_SNOUT = float(AIMED_VS_SLIT[0][1])
AIMED_VS_SLIT_OVER_HEAD_DEPTH = float(max(
    abs(d) / max(half_depth(y), 1e-4) for y, d in AIMED_VS_SLIT))
HINGE_BEHIND_THE_SLIT = float(HINGE_Y - SLIT_BACK_Y)
CUT_DEVIATION_RAW = float(max(abs(d) for _y, d in AIMED_VS_SLIT))

# What relief the generated snout carries, recorded rather than added to. Birgeria is famous for
# fangs in three sizes; the generation models a tooth row along both jaw margins and this is what
# stops the measured cut sawing through one, which is the fault Placodus shipped.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0020)

# The centreline table is 61 stations over a whole body, smoothed five wide, and that is too coarse
# for a snout that tapers: it reads the head wider than it is. So the head gets its own fine
# profile, measured on the intake before anything is cut. `_HZLO`/`_HZHI` are the section's own
# floor and ceiling rather than a half depth about the axis, because what bounds a cap is the room
# between the mouth line and the skin above or below it, and the mouth line is not on the axis.
_HY = np.linspace(Y0 + .002, max(HINGE_Y, SLIT_BACK_Y) + .03, 48)
_HW, _HD, _HZLO, _HZHI = [], [], [], []
for _y in _HY:
    _m = np.abs(raw_co[:, 1] - _y) < .005
    if _m.sum() < 6:
        for _t in (_HW, _HD, _HZLO, _HZHI):
            _t.append(_t[-1] if _t else .002)
        continue
    _q = raw_co[_m]
    _HW.append(float(np.quantile(np.abs(_q[:, 0] - cx(_y)), .90)))
    _HD.append(float(np.quantile(np.abs(_q[:, 2] - cz(_y)), .90)))
    _HZLO.append(float(np.quantile(_q[:, 2], .04)))
    _HZHI.append(float(np.quantile(_q[:, 2], .96)))
_HW, _HD = np.array(_HW), np.array(_HD)
_HZLO, _HZHI = np.array(_HZLO), np.array(_HZHI)


def head_half_width(y):
    return float(np.interp(y, _HY, _HW))


def head_half_depth(y):
    return float(np.interp(y, _HY, _HD))


def head_z_range(y):
    return float(np.interp(y, _HY, _HZLO)), float(np.interp(y, _HY, _HZHI))


# **The aimed mouth line must stay inside the head over the run it cuts**, and that is asked of the
# head's **measured section** rather than of `depth()`: a signed nearest-surface probe answers about
# the lumen's own wall beside a modelled slit, which is exactly what this generation has
# (`T.depth_probe`'s limit, CLAUDE.md). Judged from the front of the modelled slit back to the hinge.
_SEAM_STATIONS = np.linspace(float(MY[0]), HINGE_Y, 48)
SEAM_PROFILE = [(float(_y), float(seam(float(_y)) - head_z_range(float(_y))[0]),
                 float(head_z_range(float(_y))[1] - seam(float(_y)))) for _y in _SEAM_STATIONS]
SEAM_MARGIN_MIN = float(min(min(_u, _o) for _y, _u, _o in SEAM_PROFILE))
assert SEAM_MARGIN_MIN > .002, ('the aimed mouth line leaves the head', SEAM_MARGIN_MIN)


def _parity_inside(p, tries=((1., 0., 0.), (0., 0., 1.), (.577, .577, .577)), bvh=None):
    """Inside the **closed intake surface**, by ray parity -- no normals and no table, which is the
    answer to the `np.interp` lesson. `bvh_auth` is taken before the cut opens the head."""
    bvh = bvh or bvh_auth
    votes = 0
    for d in tries:
        crossings, cursor = 0, Vector(p)
        dv = Vector(d).normalized()
        for _ in range(48):
            hit = bvh.ray_cast(cursor, dv, 3.)
            if hit[0] is None:
                break
            crossings += 1
            cursor = Vector(hit[0]) + dv * 1e-5
        votes += crossings % 2
    return votes >= 2


# **Can this point be seen from outside the animal?** A point strictly inside a closed surface meets
# skin along every direction; a point outside escapes along at least one. Twenty-six directions,
# the cube's faces, edges and corners -- the question the shipped lining failed (see the README).
# A cap's rim vertices are *on* the skin by construction, so a point within `ON_SKIN` of the intake
# surface is not counted as outside it.
_SEEN_DIRS = tuple(Vector((a, b, c)).normalized()
                   for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1)
                   if (a, b, c) != (0, 0, 0))
ON_SKIN = .0010
ON_SKIN_BOUND = .0025


def seen_from_outside(p, bvh=None):
    bvh = bvh or bvh_auth
    if bvh.find_nearest(Vector(p))[3] <= ON_SKIN:
        return False
    return any(bvh.ray_cast(Vector(p), d, 3.)[0] is None for d in _SEEN_DIRS)


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


def _hull_clearance(p, hulls=None):
    """How far inside the head's own section hull p is, at the nearest measured station. Negative
    means it has left the head. Parity says the same thing without a table and disagrees exactly
    where the generation's own slit runs, because a pocket in a closed shell is exterior space to
    a parity test -- so parity is recorded and the hull is what the build refuses on."""
    hulls = hulls or _HULLS
    i = int(np.clip(np.searchsorted(_HY, float(p.y)), 0, len(_HY) - 1))
    hull = hulls.get(i) or hulls.get(max(0, i - 1)) or []
    if len(hull) < 3:
        return 1.
    worst = 1e9
    for a, b in zip(hull, hull[1:] + hull[:1]):
        ex, ez = b[0] - a[0], b[1] - a[1]
        L = math.hypot(ex, ez)
        if L < 1e-9:
            continue
        worst = min(worst, (ex * (p.z - a[1]) - ez * (p.x - a[0])) / L)
    return float(worst)


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


# A fish has no neck, so the skull hangs straight off the chest: a cervical joint here would be a
# joint with no vertebrae under it and nothing to do, and `idle-bones.mjs` would be right to
# complain about it.
#
# **The axial chain hangs off the slit, not off the aimed hinge.** These stations were measured from
# the back of the modelled slit and the reviewer aimed a mouth, not a skeleton: hanging them off the
# aimed hinge instead would carry the skull, the chest and every tail joint aft, which is a re-rig
# nobody asked for and which the gait audit would then be measuring. `SLIT_BACK_Y` is the old
# `HINGE_Y` to the last bit, so every bone but `jaw` is exactly where it was.
CHEST_Y = SLIT_BACK_Y + .105
BODY_Y = SLIT_BACK_Y + .300
TAIL_Y = [BODY_Y + .085 + .062 * i for i in range(7)]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
bone('skull', on_axis(SLIT_BACK_Y - .020), 'chest')
# The jaw is seated on the aimed hinge line, at the head's own middle (`hinge_line_at`); see the
# armature for the axis it turns about.
bone('jaw', hinge_line_at(cx(HINGE_Y)), 'skull')
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
# Recorded by the probe and asserted on the section: `depth()` cannot seat anything beside a
# modelled mouth (CLAUDE.md), and the hinge line runs along the back of this one.
JAW_SEATING = depth(B['jaw'][0])
JAW_HULL_SEATING = _hull_clearance(B['jaw'][0])
assert JAW_HULL_SEATING > .004 and _parity_inside(B['jaw'][0]), \
    ('the jaw hinge is not seated inside the head', JAW_SEATING, JAW_HULL_SEATING)

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
# **The document's own rule, verbatim**: below the cut plane and ahead of the hinge wall, and
# nothing added to it. This builder never had a front cut (its old plane stood in front of the
# animal), and the aimed plane needs none either: the two half-spaces leave each half with one
# boundary of two arcs, the mouth line and the hinge wall, which is what `cap_cut` and `cap_mouth`
# between them close.
def is_jaw(c):
    return below_cut(c) and ahead_of_hinge(c)


def bisect_on_plane(o, point, normal, margin=.03):
    """Take the cut where the reviewer aimed it. `T.bisect_on_curve` shears the head by -seam(y)
    because a *curve* cannot be a bisection plane; an aimed cut is a plane already, so it is cut
    as one -- which is also the only way its yaw and its roll survive, those being a term in x
    that no shear by a function of y can carry. Only head faces are offered to either pass, so the
    rest of the body keeps its topology, exactly as the curve version does."""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for no in (CUT_F, normal):                     # the hinge wall, then the mouth line itself
        head = [f for f in bm.faces if f.calc_center_median().y < HINGE_Y + margin]
        verts, edges = set(), set()
        for f in head:
            verts.update(f.verts)
            edges.update(f.edges)
        bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + head, dist=1e-7,
                               plane_co=point, plane_no=no, clear_inner=False, clear_outer=False)
    bm.to_mesh(o.data)
    bm.free()


# **The cut is closed with its own rim** (`T.cap_cut` then `T.cap_mouth`), the owner's construction
# (CLAUDE.md, "a cut mouth is closed with the cut's own rim"). This body shipped the form it
# replaces: a rigid palate-and-floor lining in the lumen plus a seated hinge ellipsoid, hidden in
# play -- so the proof it passed was of a body the game does not draw (15,350 px of back-facing hole
# as drawn at `Gape`, the widest on the roster), and seated by `depth()` beside a modelled mouth,
# where the probe reads the lumen's own wall, so its corners came out through both cheeks (14,868
# marker pixels on the outside of a shut head, 35 lining vertices outside the solid by ray parity;
# `oral-verdicts.md`). Spanning each half's own boundary closes it by construction instead, out of
# the body's own vertices, wearing the skin it closes, rigid to its own half's bone through the same
# weight field as the skin around it -- and there is nothing left to stand out of a cheek.
CAP_DOME = .30
CAP_ROOM = .55
# How far under the hinge the throat's jaw share ramps, as a share of the mandible's own depth at
# the cut: over its whole depth, which is Cartorhynchus' measured answer to a ramp narrower than an
# edge being a tear by construction.
DZ_SHARE = 1.0
# The rim is a band about the cut plane rather than the plane exactly, and the twin is why: the
# bisect lands every vertex it adds on the plane, but the voxel twin has faces the bisect snapped
# rather than cut (`dist=1e-7`) and `split_part` sends such a face whole to one side by its
# centroid, leaving a few of its vertices just off the plane. An exact selector drops those, the
# lip run stops one edge short of them, and `cap_mouth` correctly refuses an arc.
SEAM_TOL = .0025


def on_seam(p):
    # The corner of the mouth is on both rims and has to be in this one: bounded strictly ahead of
    # the hinge the two vertices where the lip meets the hinge cross-section are excluded, the lip
    # run stops one edge short of the corner, and `cap_mouth` refuses the selection as an arc.
    return (abs((Vector(p) - CUT_P).dot(CUT_N)) < SEAM_TOL
            and (Vector(p) - CUT_P).dot(CUT_F) > -1e-5)


def in_head(p):
    return p.y < HINGE_Y + .02


def cap_room(p):
    zlo, zhi = head_z_range(float(p.y))
    s = seam(float(p.y))
    return max(.0004, min(zhi - s, s - zlo)) * CAP_ROOM


# Each body's caps are asked of **its own** closed surface before the cut: the twin is a voxel
# resurfacing that stands up to a few thousandths off the intake, so a twin cap measured against the
# intake reads outside wherever the twin is fuller than the generation, which says nothing about the
# twin. `bvh_auth` is the intake's; the twin's is taken here, before `bisect_on_plane` opens it.
bvh_twin0 = BVHTree.FromPolygons([v.co.copy() for v in puppet.data.vertices],
                                 [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
CLOSED = {auth.name: bvh_auth, puppet.name: bvh_twin0}

parts, CUT_RIM, CAPS, CAP_SEATING = {}, {}, {}, {}
for o in (auth, puppet):
    bisect_on_plane(o, CUT_P, CUT_N, margin=.03)
    T.split_part(o, 'lower jaw', is_jaw, parts)
    jaw = parts['lower jaw'][o.name]
    # Which of the three kinds of generation this is, measured before anything is built to close
    # it (`T.cut_rim`). This one modelled a slit, and the aimed plane runs under it towards the back
    # of the mouth, so most of the aperture is the cut's own.
    CUT_RIM[o.name] = {'skull': T.cut_rim(o, in_head, seam=seam),
                       'jaw': T.cut_rim(jaw, in_head, seam=seam)}
    # The transverse run first -- the head's cross-section at the hinge, which dips out of the
    # mouth's own plane and would fold under a planar fill -- then the mouth line itself.
    CAPS[o.name] = {'skullAtHinge': T.cap_cut(o, on_hinge_wall, CUT_F),
                    'jawAtHinge': T.cap_cut(jaw, on_hinge_wall, -CUT_F)}
    assert CAPS[o.name]['skullAtHinge'] > 0 and CAPS[o.name]['jawAtHinge'] > 0, \
        ('the hinge cross-section was left open', o.name, CAPS[o.name])
    _n_skull, _n_jaw = len(o.data.vertices), len(jaw.data.vertices)
    CAPS[o.name]['palate'] = T.cap_mouth(o, on_seam, -CUT_N, dome=CAP_DOME, rounds=2,
                                         limit=cap_room)
    CAPS[o.name]['floor'] = T.cap_mouth(jaw, on_seam, CUT_N, dome=CAP_DOME, rounds=2,
                                        limit=cap_room)
    # Every vertex the caps added is inside the animal, checked three ways that cannot all be
    # fooled the same way: the head's own measured section hull, which uses no normals; ray parity
    # against the closed intake taken before the cut opened it; and whether any of the cube's
    # twenty-six directions escapes to open water without meeting skin.
    _worst, _outside_hull, _outside_parity, _seen, _seen_at, _loose = 1e9, 0, 0, 0, [], []
    for _part, _first in ((o, _n_skull), (jaw, _n_jaw)):
        for _v in _part.data.vertices[_first:]:
            _q = Vector(_v.co[:])
            _c = _hull_clearance(_q)
            _worst = min(_worst, _c)
            _outside_hull += 1 if _c < 0 else 0
            _inside = _parity_inside(_q, bvh=CLOSED[o.name])
            _off = CLOSED[o.name].find_nearest(_q)[3]
            _outside_parity += 0 if _inside else 1
            _was_seen = seen_from_outside(_q, bvh=CLOSED[o.name])
            if _was_seen:
                _seen += 1
                _seen_at.append([round(c, 4) for c in _q] + [round(_off, 5)])
            # **Inside, or on the skin.** Parity is a vote of three rays and is unreliable for a point
            # a thousandth off a surface, which is where every rim-adjacent cap vertex lives; past
            # `ON_SKIN_BOUND` it is reliable, and there a vertex must be inside its own closed body
            # and invisible from outside.
            if _off >= ON_SKIN_BOUND and (not _inside or _was_seen):
                _loose.append([round(c, 4) for c in _q] + [round(_off, 5)])
    CAP_SEATING[o.name] = {
        'capVertices': (len(o.data.vertices) - _n_skull) + (len(jaw.data.vertices) - _n_jaw),
        'worstHullClearanceRaw': float(_worst),
        'outsideTheSectionHull': _outside_hull, 'outsideByRayParity': _outside_parity,
        'seenFromOutsideAlong26Directions': _seen, 'seenFromOutsideAt': _seen_at[:12],
        'standingOutOfTheSkin': len(_loose)}
    # The hull is a per-station convex hull of a 0.012-wide band, so a vertex on a waisted part of
    # the snout can read a thousandth outside one without having left the animal. The bound is a
    # fraction of a percent of a body rather than exactly zero, and the count at zero is recorded.
    # The hull is the **intake's** section hull, a per-station convex hull of a 0.012-wide band,
    # so a vertex on a waisted part of the snout can read a thousandth outside one without having
    # left the animal; and on the twin, a voxel resurfacing a few thousandths fuller than the intake
    # in places, it is recorded rather than asserted -- the twin is held to its own closed surface.
    if o is auth:
        assert _worst > -.0015, ('a cap vertex left the head', o.name, CAP_SEATING[o.name])
    assert not _loose, ('a cap vertex stands outside its own body', o.name, _loose[:8])
    # And none of them can be seen from outside the animal further than a touch off the skin: the
    # handful that escape along one of the twenty-six are the cap's first ring inside the rim, where
    # a planar fill between rim vertices lies a thousandth or two proud of a lip that curves between
    # them -- skin-deep, where the shipped lining stood out of the cheek by up to 0.4 % of a body.
    assert all(r[3] < ON_SKIN_BOUND for r in _seen_at), \
        ('a cap vertex stands out of the skin', o.name, [r for r in _seen_at if r[3] >= ON_SKIN_BOUND])

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
# **The jaw turns about the frame's x, as on every body in the era, and not about the document's
# hinge axis.** Every rig here keeps the jaw's rest orientation identical to the skull's -- the
# audits read the gape as the jaw's own local rotation about x, and the gaits ask the body which way
# its jaw opens off the same number -- so a jaw bone rolled onto the reviewer's axis reads its own
# rest offset as a gape and fails "the jaw must not close past the bind pose" on every clip, which
# is what the first build on this cut did. The pivot *is* the reviewer's: the joint stands on the
# aimed hinge line. What the axis differs by is recorded, and to first order it does not move the
# mandible sideways -- a rotation about x carries every point of it perpendicular to x.
JAW_AXIS_ERROR_DEGREES = math.degrees(Vector((1, 0, 0)).angle(CUT_AXIS))

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
    # **`dz` is measured off this cut** (Cartorhynchus' lesson): the throat's jaw share ramps from
    # the hinge's height over the mandible's whole depth at the cut rather than a third of it, so
    # the transition is never narrower than the mesh's own edges out at the corner of the mouth.
    rim_depth = max(B['jaw'][0].z - v.co.z for v in shell.data.vertices if on_hinge_wall(v.co))
    body_w, shell_w, JUNCTION[o.name] = T.jaw_junction(
        o, shell, relaxed, B['jaw'][0], rear=on_hinge_wall, dz=rim_depth * DZ_SHARE,
        upper_jaw=lambda p: ahead_of_hinge(p) and not below_cut(p), axis=tuple(CUT_F))
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
# **There is none, and that is the verdict rather than an omission.** The mouth is closed by the
# cut's own rim above (`T.cap_cut` over the head's cross-section at the hinge, `T.cap_mouth` over
# the mouth line, each half domed into itself), so the roof and the floor are the body's own
# geometry riding their own bones, there is no wall anywhere to stretch, and the space between the
# two caps is the mouth. The shipped lining and hinge envelope are retired with the cut they were
# fitted to: they were sized about the modelled slit, and a tube about one mouth line does not close
# an aperture cut on another.
oralparts = []

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
                        'depthInsideSkinRaw': float(inside),
                        'insideByRayParity': bool(_parity_inside(Vector(p))),
                        'sectionHullClearanceRaw': float(_hull_clearance(Vector(p)))}
    if r == 'swallow':
        # Asked of the closed intake by parity and of the head's own section, not of `depth()`,
        # which reads the lumen's wall beside a modelled mouth; the probe is recorded beside them.
        assert anchor_checks[n]['insideByRayParity'] and anchor_checks[n]['sectionHullClearanceRaw'] > 0, \
            ('the swallow anchor is outside the head', n, anchor_checks[n])
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
        'The jaw is cut on the plane a reviewer aimed in the viewer\'s mouth editor '
        '(docs/triassic/mouths/birgeria-mouth.json): +32.1 deg of pitch, the hinge 9.9 %% of the '
        'body back from the nose. The generation\'s own modelled slit -- found by Placodus\' '
        'geometric method and agreeing with the painted line to within %.2f of the local radius -- '
        'is measured beside it; the aimed line runs up to %.3f of a body under it at the back of '
        'the mouth. The mouth is closed by the cut\'s own rim, capped and domed into each half.'
        % (PAINTED_AGREEMENT, AIMED_BELOW_SLIT_MAX),
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
    'jawHingeSeatingRaw': JAW_SEATING, 'jawHingeSectionHullClearanceRaw': JAW_HULL_SEATING,
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
        'note': 'The cut is the aimed plane now. cutFromMeasuredLineRaw is how far that plane '
                'stands from the generation\'s own modelled slit at worst, over the slit\'s '
                'stations; the straight-ramp figures are what the slit itself would have cost cut '
                'as a line.',
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
        'cavityVertices': int(len(CAV)), 'hingeY': HINGE_Y, 'slitBackY': SLIT_BACK_Y,
        'cavityMidHeight': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, MID)],
        'cavityHalfWidth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, WIDE)],
        'cavityHalfDepth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MY, TALL)],
        'paintedLine': [[round(r['y'], 4), round(r['z'], 5), round(r['disagreementOverRadius'], 3)]
                        for r in PAINTED],
        'paintedLineFlankDisagreementMaxOverRadius': PAINTED_DISAGREEMENT,
        'paintedVersusModelledMaxOverLocalRadius': PAINTED_AGREEMENT,
        'paintedVersusModelledMeanOverLocalRadius': PAINTED_AGREEMENT_MEAN,
        'seamInsideTheHeadMinRaw': SEAM_MARGIN_MIN,
        'toothPatches': tooth_report,
        'toothPatchesStraddlingTheCut': straddling, 'authoredToothRows': [],
        'oralParts': [],
        'closure': 'the cut\'s own rim: T.cap_cut at the hinge cross-section, then T.cap_mouth '
                   'along the mouth line, each half domed into itself (dome %.2f, ceiling %.2f of '
                   'the head\'s own room either side of the mouth line). No lining and no hinge '
                   'envelope: both were retired with the cut they were fitted to.'
                   % (CAP_DOME, CAP_ROOM),
        'cutRim': CUT_RIM, 'caps': CAPS, 'capSeating': CAP_SEATING,
        'jawJunctionDzShare': DZ_SHARE, 'rimSelectorTolerance': SEAM_TOL,
        'jawAxisIsTheFramesX': True,
        'aimedHingeAxisAgainstTheFramesXDegrees': JAW_AXIS_ERROR_DEGREES,
        # The reviewer's aimed cut, read straight off the file and **cut on**.
        'aimedCut': {
            'file': AIMED_MOUTH, 'appliesTo': _doc['appliesTo'], 'sha256': _doc['sha256'],
            'consumed': True,
            'note': 'Cut on. The file hash-matched the shipped body it was aimed on; rebuilding on '
                    'it is what consuming it looks like, so npm run triassic:mouth now refuses it '
                    'on the hash by design. The frame is asserted against the bounding box the '
                    'document measured instead.',
            'frameFitWorstUnits': FRAME_CHECK,
            'hingeCentreRaw': [float(v) for v in CUT_P],
            'jawJointRaw': [float(v) for v in B['jaw'][0]],
            'planeNormalRaw': [float(v) for v in CUT_N],
            'mouthLineForwardRaw': [float(v) for v in CUT_F],
            'hingeAxisRaw': [float(v) for v in CUT_AXIS],
            'pitchDegrees': _doc['plane']['pitchDegrees'],
            'yawDegrees': _doc['plane']['yawDegrees'],
            'rollDegrees': _doc['plane']['rollDegrees'],
            'mandibleVerticesInTheDocument': _doc['sides']['mandible'],
            'hingeBehindTheSlitRaw': HINGE_BEHIND_THE_SLIT,
            'belowTheSlitMaxRaw': AIMED_BELOW_SLIT_MAX,
            'belowTheSlitAtTheSnoutRaw': AIMED_BELOW_SLIT_AT_SNOUT,
            'worstOverLocalHeadHalfDepth': AIMED_VS_SLIT_OVER_HEAD_DEPTH,
            'perStation': [[round(y, 4), round(d, 5)] for y, d in AIMED_VS_SLIT]},
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
      ('method', 'cavityVertices', 'hingeY', 'slitBackY',
       'paintedVersusModelledMaxOverLocalRadius', 'paintedVersusModelledMeanOverLocalRadius',
       'toothPatchesStraddlingTheCut', 'capSeating', 'seamInsideTheHeadMinRaw')}))
print('BIRG_CUT_RIM', json.dumps(CUT_RIM))
print('BIRG_CAPS', json.dumps(CAPS))
print('BIRG_AIMED', json.dumps({k: v for k, v in report['mouth']['aimedCut'].items() if k != 'perStation'}))
print('BIRG_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('BIRG_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('BIRG_OK')
