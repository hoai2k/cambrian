"""Rebuild Odontochelys: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The body is carried into its own measured frame first -- head at -Y, up +Z, one unit
long -- and `export_yup` then puts the head at glTF +Z, where every shipped body in this repository
keeps it.

The earliest turtle, and the one whose shell is only half built: a **plastron** under the belly and
**no carapace** over the back, teeth in both jaws, four clawed limbs and a tail a quarter of the
animal. That asymmetry is the whole of what is different about this build.

**The rigid part is the plastron and only the plastron.** Henodus and Placodus each carry a fused
dorsal shell as a rigid part locked to one unanimated bone, and the obvious move is to copy that
mechanism wholesale. The anatomy does not justify it: Odontochelys' back is broadened ribs with skin
over them and it bends, so a `carapace` bone here would stiffen the one part of this animal that
still flexes. What is genuinely a plate is the belly, and that is what goes rigid -- measured off
the generation's own pale ventral pigment rather than declared, then feathered into a field so the
gate between shell and skin is a ramp and not a step.

Two other things worth knowing before reading the numbers:

  * **The mouth is modelled**, and reads cleanly over the front 0.06 of the body: 106 cavity
    vertices at a 0.012 gap with a smooth per-station profile from the snout back to the hinge.
    Behind the hinge the detector walks off the head and onto the forelimb, which stands directly
    beside it on this pose, so the seam is fitted in front of the hinge and continued behind it.
  * **The head is 0.075 of the body long and a forelimb reaches past it.** Every head measurement
    here is taken inside a radius of the head's own axis for that reason: at y -0.330 a plain band
    reads a half width of 0.204 where the head measures 0.061, and it is reading the shoulder.

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

ID = 'odontochelys'
NAME = 'Odontochelys'
SPECIES = 'O. semitestacea'
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

# A forty-centimetre benthic paddler. `Ability` is `bellyTurn` -- a one-shot roll that puts the
# plastron between the animal and whatever is coming -- and `Crawl` is the punt along the bottom
# the roster gives it, an extra beside the swim set rather than the locomotion.
CLIPS = {'Idle': 3.0, 'Swim': 2.0, 'Sprint': 1.2, 'TurnLeft': 1.7, 'TurnRight': 1.7,
         'Dive': 1.5, 'Rise': 1.5, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.1, 'Hit': .6,
         'Death': 1.9, 'Guard': 1.3, 'Parry': .4, 'Dodge': .5, 'Eat': 1.7, 'Stagger': 1.2,
         'Ability': 1.4, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5,
         'Breathe': 3.0, 'Crawl': 2.2}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe', 'Crawl']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(SOURCE, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(SOURCE, ROOT)
intake['rawGenerationSha256'] = hashlib.sha256(open(RAW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.60)
skin_material.use_backface_culling = False    # the backstop behind the mouth lining
frame = T.measure_frame(auth, head_is_positive_pca=False, luminance_at=luminance_at)
pigment = T.pigment_sampler(auth, sample_albedo)

raw_co = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(raw_co[:, 1].min()), float(raw_co[:, 1].max())
UVS = T.vertex_uvs(auth)
LUM = np.array([luminance_at(*UVS.get(i, (0., 0.))) for i in range(len(raw_co))])

bvh_auth0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh_auth0))
thin_mask = thickness < THIN
cx, cz, half_width, half_depth, centreline = T.measured_centreline(auth, thin_mask)


def on_axis(y, dz=0., dx=0.):
    return Vector((cx(y) + dx, y, cz(y) + dz))


# The frame is only right if the small tapered end is the head and the thread is the tail.
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
                  'backHalfWidth': BACK_W, 'backHalfDepth': BACK_D}
# A turtle's head is small, but it is not a thread: the tail tip is a third of its girth.
assert FRONT_W > 2.5 * BACK_W, ('the head end of the frame is not the head', FRAME_EVIDENCE)

# ------------------------------------------------------------------ the limbs, as measured ----
# Four clawed limbs, found by connectivity on the measured shell thickness. The head is a thin
# cluster too -- a small tapered snout with a jaw slit in it -- and the reach test separates them:
# the limbs stand 0.28 to 0.32 from the axis where the head stands 0.07, and the head straddles the
# midline where a limb does not. The tail tip is the third, at 0.024.
clusters = T.thin_clusters(auth, thin_mask, cx, cz)
blades, other = [], []
for c in clusters:
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    lateral = abs(c['centroid'][0] - cx(mid))
    (blades if (c['reachRadius'] > .18 and lateral > .05) else other).append(c)
if len(blades) != 4:
    print('ODON_CLUSTERS', json.dumps(
        {'yRange': [Y0, Y1], 'thin': int(thin_mask.sum()),
         'clusters': [{k: v for k, v in c.items() if k != 'indices'} for c in clusters]}))
assert len(blades) == 4, ('four limbs did not measure', len(blades))
blades.sort(key=lambda c: (c['yRange'][0] + c['yRange'][1]) / 2)
LIMBS = {}
for i, c in enumerate(blades):
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    LIMBS[('fore' if i < 2 else 'hind') + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
assert sorted(LIMBS) == ['foreL', 'foreR', 'hindL', 'hindR'], sorted(LIMBS)

depth, bvh_auth = T.depth_probe(auth)


# **Inside and outside cannot be taken from the nearest triangle's normal on this animal**, which
# is the finding the shore-animal kit records at the hips and this pose reproduces at the shoulder:
# the forelimbs are tucked hard against the flank, so the nearest surface to a point on the body's
# own midline at y -0.252 is the *inner face of a limb*, whose normal points across the midline.
# `depth_probe` therefore reads a point plainly inside the trunk as 0.004 outside it, and `seat()`
# walked the whole way to the centreline without ever finding a seat. Parity is not fooled: a ray
# from an interior point crosses an odd number of faces on its way out however the faces near it
# happen to be oriented. Three directions are voted, because a ray that grazes an edge can miscount.
def _parity_inside(p):
    votes = 0
    for d in ((1., 0., 0.), (0., 0., 1.), (.577, .577, .577)):
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


def solid_depth(p):
    """How far inside the closed surface p is, distance from `find_nearest` and sign from parity."""
    return bvh_auth.find_nearest(Vector(p))[3] * (1 if _parity_inside(p) else -1)


# **The measured centreline is not a line a bone can stand on here.** `measured_centreline` takes
# the median of the thick vertices in a band, and at the shoulder this pose's band holds the trunk,
# the neck tucked under the front of the shell and the upper arms folded against the flank -- so the
# median lands in the *crease* between them. Measured: at y -0.252 the median axis is 0.0043 from
# the nearest surface and on the wrong side of it, at -0.230 it is 0.0033, at -0.280 0.0088. Against
# a limb-root margin of 0.014 there is nowhere on that segment to seat a shoulder, and `seat()` ran
# the whole way to the centreline and gave up.
#
# So the bones stand on the section's **deepest interior point** instead, which is a measurement of
# where the flesh actually is. The five candidates furthest from any surface are parity-tested (the
# distance is cheap, parity is not) and the deepest one that is genuinely inside wins; the run is
# then smoothed, because a deepest point can jump between two lobes of a section.
def _deep_point(y):
    m = (np.abs(raw_co[:, 1] - y) < .012) & (np.abs(raw_co[:, 0] - cx(y)) < .11)
    if m.sum() < 8:
        return None
    q = raw_co[m]
    xs = np.linspace(cx(y) - .075, cx(y) + .075, 13)
    zs = np.linspace(float(q[:, 2].min()), float(q[:, 2].max()), 17)
    cand = [(bvh_auth.find_nearest(Vector((float(x), float(y), float(z))))[3], float(x), float(z))
            for x in xs for z in zs]
    cand.sort(reverse=True)
    # **Walk the whole sorted list, not its head.** The section band spans the limbs as well as the
    # trunk, so the candidates furthest from any surface include points in the open water *between*
    # a hanging forelimb and the belly -- and on this pose those beat every interior point. Testing
    # only the best six rejected all six at every station and the deep centreline silently fell
    # back to the median one it exists to replace.
    for d, x, z in cand:
        if _parity_inside(Vector((x, y, z))):
            return d, x, z
    return None


_DY = np.linspace(Y0 + .012, Y1 - .012, 41)
_DX, _DZ, _DD = [], [], []
for _y in _DY:
    _r = _deep_point(float(_y))
    if _r is None:
        _DX.append(_DX[-1] if _DX else cx(float(_y)))
        _DZ.append(_DZ[-1] if _DZ else cz(float(_y)))
        _DD.append(0.)
        continue
    _DD.append(_r[0])
    _DX.append(_r[1])
    _DZ.append(_r[2])
_k = np.ones(3) / 3
_sm = lambda v: np.convolve(np.pad(np.array(v), 1, mode='edge'), _k, mode='valid')
_DX, _DZ = _sm(_DX), _sm(_DZ)
DEEPEST = {'stations': len(_DY), 'worstStationDepth': float(min(_DD)),
           'medianStationDepth': float(np.median(_DD)),
           'medianAxisNearestSurfaceAtTheShoulder':
               float(bvh_auth.find_nearest(Vector((cx(-.252), -.252, cz(-.252))))[3])}


def bone_axis(y):
    """The section's own deepest interior point, smoothed: where a bone may stand."""
    return Vector((float(np.interp(y, _DY, _DX)), y, float(np.interp(y, _DY, _DZ))))


def on_axis(y, dz=0., dx=0.):                                            # noqa: F811
    p = bone_axis(y)
    return Vector((p.x + dx, y, p.z + dz))

# --------------------------------------------------------------------- measure the mouth ----
# Placodus' geometric method reaches this animal: a modelled slit with an interior.
MOUTH_GAP = .012
CAV = T.mouth_cavity(auth, front_fraction=.18, gap=MOUTH_GAP)
assert len(CAV) > 60, ('the modelled mouth did not measure', len(CAV))
MOUTH_METHOD = 'modelled cavity, measured by casting head vertex normals back into the mesh'

HINGE_Y = float(Y0 + .058)              # y = -0.357, the last station with a trustworthy lumen
JAW_FRONT_Y = float(Y0 - .002)          # in front of the animal: the mandible gets no front cut
MOUTH_FRONT_Y = float(Y0 + .006)
HEAD_BACK = float(Y0 + .082)
CAV_Y, CAV_MID, CAV_WIDE, CAV_TALL = T.cavity_profile(CAV, Y0 + .004, Y0 + .16, .005, .005)
# **The detector walks off the head and onto the shoulder behind the hinge**, because on this pose
# the forelimb stands directly beside the jaw: over the last measured stations the seam falls from
# 0.074 to -0.111 -- a fifth of a body length below the head -- while the head's own axis barely
# moves. Only the stations in front of the hinge are fitted.
_fit = CAV_Y <= HINGE_Y + .002
assert _fit.sum() >= 10, ('too little measured mouth in front of the hinge', int(_fit.sum()))
_sy = CAV_Y[_fit]
_sz = T.blur1d(CAV_MID[_fit], 1.2)
_sw = T.blur1d(CAV_WIDE[_fit], 1.4)
_st = T.blur1d(CAV_TALL[_fit], 1.4)
CAVITY_ROUGHNESS = float(np.mean(np.abs(np.diff(_sz)) /
                                 np.array([max(half_depth(float(y)), 1e-4) for y in _sy[1:]])))
assert CAVITY_ROUGHNESS < .08, ('the measured mouth line does not read as a line', CAVITY_ROUGHNESS)


def seam(y):
    """The mouth line itself, lightly smoothed, held flat in front of the first measured station
    and continued on the last one behind it."""
    return float(np.interp(y, _sy, _sz))


_ramp = np.polyfit(_sy, _sz, 1)
_resid = _sz - np.polyval(_ramp, _sy)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(half_depth(float(y)), 1e-4) for y in _sy])))
CUT_DEVIATION_RAW = float(np.max(np.abs(CAV_MID[_fit] - _sz)))

try:
    PAINTED = T.painted_line(auth, luminance_at, cz, half_depth, Y0 + .006, HINGE_Y,
                             u_lo=-.95, u_hi=.15, stations=18)
    PAINTED_AGREEMENT = float(np.mean([abs(r['z'] - seam(r['y']))
                                       / max(half_depth(r['y']), 1e-4) for r in PAINTED]))
except Exception as exc:                                                 # noqa: BLE001
    PAINTED, PAINTED_AGREEMENT = [], None
    print('ODON_PAINTED_FAILED', repr(exc))

SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0018)

# --------------------------------------------------------- the head's own fine profile ----
# **Measured inside a radius of the head's own axis.** A plain band at y -0.330 reads a half width
# of 0.204 where the head measures 0.061, because a forelimb is standing beside the jaw on this
# pose; every head figure below would then be the shoulder's.
HEAD_RADIUS = .085
_HY = np.linspace(Y0 + .002, HINGE_Y + .030, 44)
_HW, _HD, _HOUT, _HZLO, _HZHI = [], [], [], [], []
_HEADSET = {}
for _i, _y in enumerate(_HY):
    _yv = float(_y)
    _m = ((np.abs(raw_co[:, 1] - _yv) < .006)
          & (np.hypot(raw_co[:, 0] - cx(_yv), raw_co[:, 2] - cz(_yv)) < HEAD_RADIUS))
    _HEADSET[_i] = raw_co[_m]
    if _m.sum() < 6:
        for _t in (_HW, _HD, _HOUT, _HZLO, _HZHI):
            _t.append(_t[-1] if _t else .002)
        continue
    _q = raw_co[_m]
    _HW.append(float(np.quantile(np.abs(_q[:, 0] - cx(_yv)), .90)))
    _HD.append(float(np.quantile(np.abs(_q[:, 2] - cz(_yv)), .90)))
    _HOUT.append(float(np.abs(_q[:, 0] - cx(_yv)).max()))
    _HZLO.append(float(_q[:, 2].min()))
    _HZHI.append(float(_q[:, 2].max()))
_HW, _HD = np.array(_HW), np.array(_HD)
_HOUT, _HZLO, _HZHI = np.array(_HOUT), np.array(_HZLO), np.array(_HZHI)
# What the gate is worth, measured: the same stations read with a plain y band and no radius.
_HD_UNGATED = []
for _y in _HY:
    _yv = float(_y)
    _m = np.abs(raw_co[:, 1] - _yv) < .006
    _HD_UNGATED.append(float(np.quantile(np.abs(raw_co[_m, 2] - cz(_yv)), .90)) if _m.sum() >= 6
                       else 0.)
HEAD_SECTION_EVIDENCE = {
    'headRadiusGate': HEAD_RADIUS,
    'halfDepthGated': [round(float(v), 4) for v in _HD],
    'halfDepthWithAPlainBand': [round(float(v), 4) for v in _HD_UNGATED],
    'worstGatedHalfDepth': float(_HD.max()),
    'worstUngatedHalfDepth': float(max(_HD_UNGATED)),
}
# **The head's own section must exclude the limbs**, and on this pose it must: a forelimb reaches
# forward under the jaw, so a plain band at the back of the head reads the *shoulder* and not the
# head. `head_half_depth` is what the lining is sized in units of and what the seam is judged
# against, so an ungated read puts the mouth line out through the top of the skull and the lining
# outside the skin. The check is that the gated section stays a head-sized thing: no station may
# read more than three times the head's own median.
assert _HD.max() < 3. * float(np.median(_HD)), \
    ('the head section is reading something that is not the head', HEAD_SECTION_EVIDENCE)


def head_half_width(y):
    return float(np.interp(y, _HY, _HW))


def head_half_depth(y):
    return float(np.interp(y, _HY, _HD))


def head_outer_width(y):
    return float(np.interp(y, _HY, _HOUT))


def head_z_range(y):
    return float(np.interp(y, _HY, _HZLO)), float(np.interp(y, _HY, _HZHI))


# **The seam must stay inside the animal**, and that is asserted rather than assumed. The mouth
# line is the one measurement that decides where the jaw is cut and how big the lining is, so a
# seam that has climbed out through the top of the skull -- which is what an ungated head section
# does on a pose with a forelimb under the jaw -- fails the build instead of shipping a mouth
# somewhere else.
SEAM_MARGIN = []
for _y in _sy:
    _zl, _zh = head_z_range(float(_y))
    SEAM_MARGIN.append(min(seam(float(_y)) - _zl, _zh - seam(float(_y))))
SEAM_MARGIN_MIN = float(min(SEAM_MARGIN))
assert SEAM_MARGIN_MIN > .002, ('the mouth line leaves the head', SEAM_MARGIN_MIN,
                                [round(float(v), 4) for v in SEAM_MARGIN])


def mouth_half_width(y):
    return float(np.interp(y, _sy, _sw))


def mouth_half_height(y):
    return float(np.interp(y, _sy, _st))


# **Containment for the oral geometry is a silhouette test**, and it has to be. Neither of the two
# obvious instruments can answer the question on a head whose mouth is modelled: the signed depth
# probe reads a point in the lumen as outside the animal (the nearest surface to it is the lumen
# wall, whose normal points at it) and ray parity reads the same way one level down, because a
# modelled mouth is a *pocket* in a closed shell and its lumen is genuinely exterior space. The
# convex hull of the head's own section is not fooled by either: a lumen is inside it and a vertex
# out through the cheek is not. Atopodentatus records the measurements that established this.
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


_HULLS = {i: (_hull(q[:, [0, 2]]) if len(q) >= 6 else []) for i, q in _HEADSET.items()}


def _hull_clearance(p):
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
        worst = min(worst, ((p.x - a[0]) * ez - (p.z - a[1]) * ex) / -L)
    return worst


# ---------------------------------------------------------------- the plastron, measured ----
# **The belly plate is measured, not declared.** The generation paints it: a pale plate with suture
# lines on an otherwise banded hide, and the ventral luminance runs 0.61 to 0.70 over the trunk
# against 0.45 to 0.51 in front of and behind it. The pale ventral set is taken, the largest
# connected run of it kept, and a superellipse fitted to *that* -- so the number in the report is a
# measurement of the animal and the gate the weights use is a smooth field rather than the mask.
VENT_LUM = float(np.quantile(LUM, .72))
_below = raw_co[:, 2] < np.array([cz(float(y)) - .30 * half_depth(float(y))
                                  for y in raw_co[:, 1]])
_pale = (LUM > VENT_LUM) & _below
_adj = [[] for _ in range(len(raw_co))]
for _e in auth.data.edges:
    _a, _b = _e.vertices
    _adj[_a].append(_b)
    _adj[_b].append(_a)
_seen = np.zeros(len(raw_co), bool)
_runs = []
for _i in np.nonzero(_pale)[0]:
    if _seen[_i]:
        continue
    _stack, _g = [int(_i)], []
    _seen[_i] = True
    while _stack:
        _q = _stack.pop()
        _g.append(_q)
        for _w in _adj[_q]:
            if _pale[_w] and not _seen[_w]:
                _seen[_w] = True
                _stack.append(int(_w))
    _runs.append(_g)
_runs.sort(key=len, reverse=True)
PLATE = np.array(_runs[0])
_pq = raw_co[PLATE]
PLASTRON_MEASURED = {
    'paleVentralLuminanceThreshold': VENT_LUM,
    'connectedRuns': len(_runs), 'largestRunVertices': int(len(PLATE)),
    'secondRunVertices': int(len(_runs[1])) if len(_runs) > 1 else 0,
    'y': [float(_pq[:, 1].min()), float(_pq[:, 1].max())],
    'x': [float(_pq[:, 0].min()), float(_pq[:, 0].max())],
    'z': [float(_pq[:, 2].min()), float(_pq[:, 2].max())],
}
# The run reaches a little further fore and aft than the plate does, because the throat and the
# tail base are pale too; the fitted footprint is the 6th-to-94th percentile of it, which is the
# plate itself.
PLATE_Y0 = float(np.quantile(_pq[:, 1], .06))
PLATE_Y1 = float(np.quantile(_pq[:, 1], .94))
PLATE_CY = (PLATE_Y0 + PLATE_Y1) / 2
PLATE_HY = (PLATE_Y1 - PLATE_Y0) / 2
PLATE_CX = float(np.median(_pq[:, 0]))
PLATE_HX = float(np.quantile(np.abs(_pq[:, 0] - PLATE_CX), .94))
PLATE_TOP = float(np.quantile(_pq[:, 2], .94))
PLASTRON_MEASURED.update({'footprintCentre': [PLATE_CX, PLATE_CY],
                          'footprintHalfSpan': [PLATE_HX, PLATE_HY],
                          'topOfThePlate': PLATE_TOP})
assert PLATE_HY > .12 and PLATE_HX > .08, ('the plastron did not measure', PLASTRON_MEASURED)


def plastron_share(q):
    """A feathered superellipse footprint in plan, capped above so the rigid region never climbs
    the flank. **Feathered, and that is the point**: a hard `lo < y < hi` gate puts a step in the
    weight field, and a step in a weight field is a tear the first time the tail swings."""
    u = (q.x - PLATE_CX) / PLATE_HX
    v = (q.y - PLATE_CY) / PLATE_HY
    return T.smooth((1. - (u ** 4 + v ** 4)) / .45) * T.smooth((PLATE_TOP - q.z) / .045)


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


NECK_Y = [-.300, -.334]                  # shoulder to base of skull; a short neck, as drawn
CHEST_Y, BODY_Y = -.255, .000
TAIL_Y = [.300, .355, .410, .465, .520]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
for i, y in enumerate(NECK_Y):
    bone('neck_%02d' % i, on_axis(y), 'chest' if i == 0 else 'neck_%02d' % (i - 1))
bone('skull', on_axis(HINGE_Y - .016), 'neck_%02d' % (len(NECK_Y) - 1))
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .005), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))
# The plate is ballast, not a joint: a rigid part on its own bone hung off the trunk, never given a
# channel, exactly as Placodus' gastral basket and Henodus' carapace are. Unlike theirs it is
# *ventral*, and the back above it is left free to bend, because on this animal the back is ribs
# and skin rather than shell.
bone('plastron', (PLATE_CX, PLATE_CY, PLATE_TOP - .020), 'body')

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), solid_depth, margin=.014)
    reach = Vector(c['reach'])
    names = ['%s_upper_%s' % (kind, s), '%s_mid_%s' % (kind, s), '%s_outer_%s' % (kind, s),
             '%s_tip_%s' % (kind, s)]
    pts = [root, root + (reach - root) * .30, root + (reach - root) * .55,
           root + (reach - root) * .78, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = solid_depth(root)
    parent = 'chest' if kind == 'fore' else 'tail_00'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
print('ODON_SEATING', json.dumps({'deepest': DEEPEST,
      'limbRoots': {k: round(v, 5) for k, v in LIMB_SEATING.items()}}))
for n, d in LIMB_SEATING.items():
    assert d > .012, ('a limb root is not seated inside the trunk', n, d)
JAW_SEATING = solid_depth(B['jaw'][0])
assert JAW_SEATING > .003, ('the jaw hinge is not seated inside the head', JAW_SEATING)
PLASTRON_SEATING = solid_depth(Vector(B['plastron'][0]))
assert PLASTRON_SEATING > .008, ('the plastron bone is not inside the body', PLASTRON_SEATING)

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
# **A limb's inter-joint blend is a fraction of that limb's own length, not a number.**
# Rhaeticosaurus' 0.050 is 0.16 of a flipper that reaches 0.30 from the axis; copied as a *number*
# onto a shorter chain it is more than a whole segment wide, every vertex then carries all four
# joints at nearly equal weight, that busts the four-influence budget, and the relaxation trims a
# different four on neighbouring vertices -- which is Cartorhynchus' radiating spikes. These limbs
# run 0.27 to 0.28, so the same fraction is 0.044 and the 0.060 this build started with was half a
# segment too wide.
BLEND_FRACTION = .16
LIMB_BLEND = {}
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    LIMB_RADIUS[key] = (float(np.quantile(d, .84)), float(np.quantile(d, .995)) + .045)
    LIMB_BLEND[key] = BLEND_FRACTION * cum[-1]

# **The radius has to open out towards the foot, and that is what this animal's tear was.**
#
# The kit takes one inner and one outer radius per limb from the distances of the limb's own
# vertices to its polyline, and beyond the outer one a vertex gets no limb weight at all. On a
# hydrofoil or a paddle that is safe, because a blade is a blade all the way out. On a clawed leg
# the toes splay past the end of the chain, so the half per cent of cluster vertices outside the
# 99.5th percentile are the *toe tips* -- and they came out weighted to `tail_00`, the trunk bone
# behind the hip, sitting against neighbours weighted to `hind_tip_R`. `local/tearloc.mjs` put the
# worst edges in the era at exactly those positions: 3.84x between `hind_tip_R` and `tail_00` on
# the right hind foot, and 163 more within `tail_00` around it.
#
# So both radii grow with arc length along the limb, as Henodus' do: `r + r'·t²`, tight at the
# shoulder where the trunk is next door and open at the foot where nothing else is.
# Measured, not guessed: 0.60/1.20 read 5.13x, and opening them further to 2.40/3.00 with a
# 90th-percentile base went back up to 6.46x -- a radius wide enough to cover a splayed foot
# is also wide enough to reach the hip from the knee.
RADIUS_GROWTH = (.60, 1.20)
def limb_weights(q):
    best, chosen = 0., None
    for key, (P, cum, names, rootw) in LIMB_FIT.items():
        dist, s = T.project(P, cum, q)
        t = min(1., s / cum[-1])
        rin, rout = LIMB_RADIUS[key]
        rin *= 1. + RADIUS_GROWTH[0] * t * t
        rout *= 1. + RADIUS_GROWTH[1] * t * t
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else T.smooth(1 - (dist - rin) / (rout - rin)))
        # **A long root fade.** The kit's default completes the limb's takeover within three
        # quarters of the first bone, which is right for a fin growing off a flank and wrong for
        # a leg tucked against one: these limbs' inner radius is 0.042 to 0.060 against a trunk
        # half width of 0.15, so trunk skin near the shoulder sits well inside the limb's field
        # and takes a partial alpha next to limb skin taking a full one. `skin-tears.mjs` read
        # 11.0x across exactly that band, on `chest` and `tail_00`.
        alpha *= T.smooth(s / max(cum[1] * 1.40, 1e-6))
        if alpha > best:
            best = alpha
            chosen = (T.limb_chain(names, cum, s, blend=LIMB_BLEND[key]), rootw, t)
    return (best, *chosen) if chosen else None


THROAT_SPAN = .034
THROAT_DROP = .16


def throat_jaw_share(q):
    a = T.smooth((q.y - (HINGE_Y - .010)) / .010)
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
    best = 0.
    if limb:
        alpha, chain, rootw, t = limb
        best = alpha
        base = {}
        for n, v in w.items():
            base[n] = base.get(n, 0.) + v * (1 - t)
        for n, v in rootw.items():
            base[n] = base.get(n, 0.) + v * t
        w = {n: v * (1 - alpha) for n, v in base.items()}
        for n, v in chain.items():
            w[n] = w.get(n, 0.) + v * alpha
    # Only skin that is not on a limb may join the plate; a shoulder that went rigid would tear the
    # moment the limb swung, which is the fault Henodus' carapace records.
    g = plastron_share(q) * (1 - best)
    if g > 0:
        w = {n: v * (1 - g) for n, v in w.items()}
        w['plastron'] = w.get('plastron', 0.) + g
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
    sample_albedo, thin=THIN, band=.020, roughness=.64, blade_dilation=.0030)

# --------------------------------------------------------------------- cut the jaw ----
def is_jaw(c):
    return JAW_FRONT_Y - .004 < c.y < HINGE_Y and c.z < seam(c.y) - 1e-7


parts = {}
for o in (auth, puppet):
    T.bisect_on_curve(o, seam, HINGE_Y, JAW_FRONT_Y - .004, margin=.02)
    T.split_part(o, 'lower jaw', is_jaw, parts)

tooth_report = []
for g in PATCHES:
    q = SNOUT_CO[g]
    below = sum(1 for c in q if is_jaw(Vector((float(c[0]), float(c[1]), float(c[2])))))
    tooth_report.append({'vertices': len(g), 'proudMax': float(PROUD[g].max()),
                         'y': [float(q[:, 1].min()), float(q[:, 1].max())],
                         'onJaw': int(below), 'onSkull': int(len(g) - below)})
straddling = [t for t in tooth_report if t['proudMax'] >= .0040 and 0 < t['onJaw'] < t['vertices']]

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

weight_report, influences, plastron_vertices = {}, [], 0
for o in (auth, puppet):
    for n in B:
        o.vertex_groups.new(name=n)
    raw_weights = [weights(v.co) for v in o.data.vertices]
    relaxed = T.relax_weights(o, raw_weights, passes=9, hold=.45)
    counts, owners = [], {}
    for v in o.data.vertices:
        w = relaxed[v.index]
        counts.append(len(w))
        if o is auth and w.get('plastron', 0.) > .5:
            plastron_vertices += 1
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
assert plastron_vertices > 200, ('the plastron owns almost no skin', plastron_vertices)
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
mouth_mat = T.inward_material(NAME + ' mouth interior', (.30, .13, .115, 1))
mouth_mat.use_backface_culling = False
MOUTH_BACK = HINGE_Y + .016
MOUTH_FRONT = MOUTH_FRONT_Y

LINING_FIT = {}
LINING_POWER = 2.4


def mouth_section(y):
    """The lining's half width and half height at station y, sized from the measured cavity and
    clamped to the head's own section at the mouth's height."""
    e = T.smooth((MOUTH_BACK - y) / .010) * T.smooth((y - MOUTH_FRONT) / .004)
    zlo, zhi = head_z_range(y)
    room = min(zhi - seam(y), seam(y) - zlo)
    w = max(min(mouth_half_width(y) * .98, head_outer_width(y) - .006), .0016) * (.92 + .08 * e)
    h = max(min(mouth_half_height(y) * 1.00, head_half_depth(y) * .40, room * .50), .0018) \
        * (.76 + .24 * e)
    LINING_FIT[round(float(y), 5)] = [round(w, 5), round(h, 5)]
    return w, h


def fit_lining_point(p, y):
    """Pull one ring vertex radially in until it is inside the head's own section hull."""
    c = Vector((cx(y), y, seam(y)))
    d = Vector(p) - c
    for k in range(20):
        q = c + d * (1. - k * .035)
        if _hull_clearance(q) > .0020:
            return q
    return c + d * .335


def lining_jaw_blend(p):
    """Steep, and centred above the lip rather than on it: everything at and below the mouth line
    follows the mandible outright and the stretch is carried by the band above it, inside the mouth
    where nothing can see it."""
    _w, h = mouth_section(p.y)
    return T.smooth(.5 + 1.6 * ((seam(p.y) + .45 * h) - p.z) / max(h, 1e-6))


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
                                      limit=.20, fallback=.02,
                                      # Capped by this builder's own measured head section: a cast
                                      # from outside stops on the first surface it meets, which on
                                      # a paddled body is a flipper rather than the cheek. The two
                                      # vertical caps are **not** the half depth: the mouth line
                                      # sits below the head's centre, so the roof is nearer than
                                      # half a head above it and the floor further below. Measured
                                      # from the axis, a palate capped at the half depth still came
                                      # out through the top of Rhaeticosaurus' skull.
                                      cap=(head_half_width(_y),
                                           max(.002, head_half_depth(_y) - (seam(_y) - cz(_y))),
                                           max(.002, head_half_depth(_y) + (seam(_y) - cz(_y)))))
    return _room_cache[k]


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, lining_jaw_blend, mouth_mat,
                              rings=28, ring=22, centre_x=cx, power=LINING_POWER,
                              fit=fit_lining_point, room=mouth_room)
oralparts = [lining]
mouth_cover = []
for _y in np.linspace(MOUTH_FRONT + .003, MOUTH_BACK - .008, 16):
    y = float(_y)
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(mouth_half_width(y), 1e-9), 3),
                        round(h / max(head_half_depth(y), 1e-9), 3)])
    if y > MOUTH_FRONT + .012:
        assert w >= mouth_half_width(y) * .45, \
            ('the oral lining is narrower than the mouth', y, w, mouth_half_width(y))
    assert h >= .0010, ('the oral lining is flat', y, h)

hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.66)
# **Centred on the head's own section, not on the measured centreline.** `cz` is the median of the
# thick vertices and this skull's is high in its own section -- at the hinge the head runs z 0.054
# to 0.133 with cz at 0.109, so an ellipsoid centred there and given the section's half depth
# reaches 0.024 above the crown. It would not seat past 0.42 of its size, and the corner of the
# mouth is what that shortfall leaves open. A short y radius for the same kind of reason: the whole
# mouth is 0.058 long on a head 0.075 long.
_HZLO_H, _HZHI_H = head_z_range(HINGE_Y)
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .003, (_HZLO_H + _HZHI_H) / 2)
HINGE_R = (head_half_width(HINGE_Y) * .90, .016, (_HZHI_H - _HZLO_H) * .42)
HINGE_FIT = 0.
for step in range(24):
    k = 1. - step / 24
    probe = [Vector((HINGE_CENTRE[0] + HINGE_R[0] * k * math.sin(b) * math.cos(a),
                     HINGE_CENTRE[1] + HINGE_R[1] * k * math.sin(b) * math.sin(a),
                     HINGE_CENTRE[2] + HINGE_R[2] * k * math.cos(b)))
             for a in np.linspace(0, 2 * pi, 20) for b in np.linspace(0, pi, 11)]
    if min(_hull_clearance(q) for q in probe) > .0020:
        HINGE_FIT = k
        break
assert HINGE_FIT > .5, ('the hinge envelope could not be seated', HINGE_FIT)
print('ODON_HINGE', json.dumps({'fit': HINGE_FIT, 'r': list(HINGE_R), 'centre': list(HINGE_CENTRE)}))
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
    t = max(0., min(1., (seam(HINGE_Y) * SCALE - v.co.z) / (.016 * SCALE)))
    hinge.vertex_groups['jaw'].add([v.index], t, 'REPLACE')
    hinge.vertex_groups['skull'].add([v.index], 1 - t, 'REPLACE')
for p in hinge.data.polygons:
    p.use_smooth = True
mo = hinge.modifiers.new('Hinge skin', 'ARMATURE')
mo.object = rig
hinge.parent = rig
oralparts.append(hinge)

LINING_CLEARANCE = min(_hull_clearance(Vector(v.co[:]) / SCALE) for v in lining.data.vertices)
LINING_OUTSIDE = sum(1 for v in lining.data.vertices
                     if _hull_clearance(Vector(v.co[:]) / SCALE) < 0)
print('ODON_LINING_HULL', json.dumps(
    {'vertices': len(lining.data.vertices), 'outsideTheSectionHull': LINING_OUTSIDE,
     'worstClearance': LINING_CLEARANCE}))
assert LINING_OUTSIDE == 0, ('the oral lining leaves the head', LINING_OUTSIDE, LINING_CLEARANCE)

oral_seating = []
for o in oralparts:
    worst = min(_hull_clearance(Vector(v.co[:]) / SCALE) for v in o.data.vertices)
    oral_seating.append({'part': o.name, 'worstSectionHullClearance': float(worst),
                         'signedDepthProbeMin': float(min(depth(Vector(v.co[:]) / SCALE)
                                                          for v in o.data.vertices))})
    assert worst > -.0005, ('mouth geometry breaks the head silhouette', o.name, worst)

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
SNOUT_Y = Y0 + .008
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, seam(SNOUT_Y) - .004), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .022), HINGE_Y - .022, seam(HINGE_Y - .022)),
                            'swallow'),
    # **The blow this animal lands is a bite**, light and heavy both, so the skull is the bone that
    # delivers it. Its ability is a defensive roll and its passive is armour; nothing about this
    # animal strikes with a neck, a tail or a limb.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .002, seam(SNOUT_Y) + .005),
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


# **Rowing with four clawed limbs, and a trunk that barely bends.** A turtle with a plastron under
# it is stiff through the middle whatever the back is made of, so the axial gain is nearly nothing
# over the chest and body and the wave belongs to the tail. Every bone rests pointing along +Y, so
# for a limb held out along X the rowing stroke -- the limb swung fore and aft -- is a rotation
# about the body's vertical, which is the bone's own Z.
AXIAL_CHAIN = ['neck_01', 'neck_00', 'chest', 'body'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
# **Almost nothing at the tail's own base.** `tail_00` carries the hind limbs as well as the tail,
# so every degree it takes swings a whole leg past the hip skin beside it, and `skin-tears.mjs`
# read 7.0x with `tail_00` the dominant bone. The wave starts behind the pelvis.
GAIN = [.12, .08, .02, .02, .05, .20, .38, .56, .76]
LAG = [0., .20, .44, .74, 1.05, 1.36, 1.68, 2.00, 2.32]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}
# Diagonal couplets: the fore pair alternates, the hind pair alternates, and the hind is half a beat
# behind the fore -- which is a walking tetrapod's gait taken into the water, and what a turtle with
# unspecialised limbs does rather than the synchronous flight of a sea turtle.
STROKE_LAG = {'fore': 0., 'hind': pi}


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

        amp = {'Idle': .20, 'Swim': .80, 'Sprint': 1.25, 'Eat': .26, 'Guard': .14, 'Grab': .24,
               'Breath': .26, 'Breathe': .22, 'Growth': .20, 'Dodge': .95, 'Crawl': .30,
               'Ability': .24}.get(clip, .24)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1., 'Crawl': 2.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy') else 0.
        drive = ramp(u, .30, .46, 2.2) * (1 - ramp(u, .62, 1., 1.)) if clip in ('Attack', 'Heavy') else 0.
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy') else 0.
        strike = {'Heavy': 1.45}.get(clip, 1.0)
        # `bellyTurn`: the animal rolls the plastron towards whatever is coming, holds it there,
        # and rolls back. A one-shot, and the one clip in the set that is about the shell.
        roll = ramp(u, .04, .30, 1.8) * (1 - ramp(u, .62, .96, 1.4)) if clip == 'Ability' else 0.
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
            gape = .24 * cock + .48 * ramp(u, .24, .46, 1.7) * (1 - ramp(u, .50, .70, 1.4))
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .34 * (1 - cos(p * 2)) * .5 + .10
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
        elif clip == 'Ability':
            gape = .06 * roll
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.08 * gape
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the trunk. A shelled animal is stiff through the middle.
        body = pb['body']
        body.rotation_euler.z += .12 * turn
        body.rotation_euler.y += .14 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .30 * e
        if clip in ('Attack', 'Heavy'):
            body.location.y = .09 * cock - .34 * drive * strike
            body.rotation_euler.x = .08 * cock - .07 * drive
        if clip == 'Ability':
            # The roll itself, and a slow drift while it lasts: all armour, at the cost of steering.
            body.rotation_euler.y = 1.55 * roll
            body.rotation_euler.x = -.14 * roll
            body.location.z = .06 * roll
        if clip == 'Bite':
            body.location.y = -.14 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.34 * e
            body.rotation_euler.z = .14 * e
        if clip == 'Guard':
            # Guard is the plastron half-turned already: the belly comes round towards the threat.
            body.rotation_euler.y = .42 * (1 - cos(p)) / 2
            body.rotation_euler.x = .03 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .46 * e
            body.rotation_euler.z = -.38 * e
            body.location.x = .28 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .16 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .20 * e
            body.location.y = .09 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.20 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z = .08 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Crawl':
            # Punting along the bottom: the body rocks over each diagonal couplet in turn.
            body.rotation_euler.y = .10 * sin(p * 2)
            body.rotation_euler.x = .05 + .03 * sin(p * 4)
            body.location.z = -.05
        if clip == 'Grab':
            body.location.y = -.08 - .06 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        body.rotation_euler.y += .026 * amp * sin(p * beat) * (1 if clip in ('Swim', 'Sprint', 'Idle') else 0)
        body.rotation_euler.y += 2.6 * dead
        body.rotation_euler.x += .14 * dead
        body.location.z -= .20 * dead

        # --- the axial chain: a short neck, a stiff middle, a tail that carries the wave
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            z = .10 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.028 + .007 * i)
            z += .050 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy'):
                if n.startswith('neck') or n == 'skull':
                    z += .10 * cock * (1 if i % 2 == 0 else -.6) * strike
                    z -= .06 * drive * strike
            if clip == 'Dodge':
                z += .14 * e * sin(i * .55 + .6)
            if clip == 'Ability' and n.startswith('neck'):
                # The head comes in over the plate rather than staying out where it can be bitten.
                z += .10 * roll
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 4 else -.5)
            q.rotation_euler.z += z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .040 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and n.startswith('neck'):
                q.rotation_euler.x = -.18 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            if clip == 'Ability' and n.startswith('neck'):
                q.rotation_euler.x = .30 * roll
        if clip in ('Attack', 'Heavy'):
            pb['skull'].rotation_euler.x += (-.14 * cock + .24 * drive) * strike
            for n in ('neck_00', 'neck_01'):
                pb[n].rotation_euler.x += (-.12 * cock + .20 * drive) * strike
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .12 * sin(p * 2)
            pb['neck_01'].rotation_euler.x += -.10 * sin(p * 2)
        if clip == 'Ability':
            pb['skull'].rotation_euler.x += .34 * roll
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul

        # --- the limbs. **This is the dash.**
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            # Left and right alternate, and the hind pair is half a beat behind the fore: the
            # diagonal couplet gait, taken into the water.
            ph = p * beat - STROKE_LAG[kind] - (0. if s > 0 else pi)
            stroke = sin(ph)
            lift = cos(ph)
            reach = {'Sprint': .88, 'Swim': .68, 'Idle': .18, 'Crawl': .72, 'Ability': .16,
                     'Breathe': .22, 'Eat': .20, 'Guard': .16, 'Grab': .18}.get(clip, .24)
            gainf = 1.0 if kind == 'fore' else .95
            up.rotation_euler.z = s * reach * stroke * gainf
            up.rotation_euler.y = s * .36 * reach * lift * gainf
            up.rotation_euler.x = -.28 * reach * lift * gainf
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .42 * e
            if clip in ('TurnLeft', 'TurnRight'):
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.z += d * .42 * e
                up.rotation_euler.y += d * .28 * e
            if clip in ('Attack', 'Heavy'):
                up.rotation_euler.z += s * (.28 * cock - .40 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if clip == 'Ability':
                # Drawn in under the plate while it is turned: the limbs are the soft part.
                up.rotation_euler.z += s * .30 * roll
                up.rotation_euler.y += s * .34 * roll
            if clip == 'Guard':
                up.rotation_euler.y += s * .26 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.y += s * .34 * e
            if clip == 'Dodge':
                up.rotation_euler.z += s * .54 * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.z += s * .30 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.z += s * .20 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.y += s * .20 + s * .10 * haul
            if clip == 'Growth':
                up.rotation_euler.y += s * .20 * e
            up.rotation_euler.z += s * .36 * dead
            up.rotation_euler.x += .26 * dead
            lag = sin(ph - .8)
            for j, share, feather, lagshare in ((1, .14, .55, .10), (2, .10, .40, .13),
                                                (3, .07, .26, .16)):
                pb[names[j]].rotation_euler.z = share * up.rotation_euler.z + s * lagshare * reach * lag
                pb[names[j]].rotation_euler.x = feather * up.rotation_euler.x

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
        for q in pb:
            # `root` carries the body and the clip contract forbids it moving; `plastron` is a
            # rigid part and is never given a channel at all.
            if q.name not in ('root', 'plastron'):
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

# --- the swept angle at each limb root, measured from the limb's own direction in world space.
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
reset()
scene.frame_set(0)

# -------------------------------------------------------------------------- export ----
sockets = T.make_sockets(rig, anchors)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2) + '\n')

def drop_plastron_channels(path):
    """Strip every animation channel on the rigid plate.

    **The exporter samples every pose bone whether or not it was keyed**, so a bone that the
    performance never touched still leaves the builder with a full set of constant channels -- 92 of
    them here -- and "rigid" then rests on the values being identical rather than on the channels
    being absent. Henodus does the same thing for its carapace inside its own patch; the shared
    `patch_glb` only knows about `root` and scale, so this is a second pass over the same file.
    """
    import struct as _struct
    raw = open(path, 'rb').read()
    n = _struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n])
    binary = raw[20 + n:]
    dropped = 0
    for a in g['animations']:
        keep = [c for c in a['channels']
                if g['nodes'][c['target']['node']].get('name') != 'plastron']
        dropped += len(a['channels']) - len(keep)
        a['channels'] = keep
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(_struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + _struct.pack('<II', len(js), 0x4e4f534a) + js + binary)
    return dropped


tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
PLASTRON_CHANNELS_DROPPED = {}
for group, suffix in ((AUTH_GROUP, ''), (PUP_GROUP, '.puppet')):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, ID + suffix + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, **T.EXPORT_KWARGS)
    T.patch_glb(path, anchors)
    PLASTRON_CHANNELS_DROPPED[suffix or 'authored'] = drop_plastron_channels(path)
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)
meta = {
    'id': ID, 'name': NAME, 'species': 'Odontochelys semitestacea',
    'provenance': 'Late Triassic · Guanling, Guizhou',
    'description': 'The earliest turtle: a full belly shell, no shell on top, teeth in both jaws '
                   'and a long tail. Authored Tripo body and measured procedural volume twin share '
                   'one armature, one set of inverse binds, one set of sockets and one set of '
                   'actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 0.4, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['docs/triassic/canonical/odontochelys.png',
                'tools/triassic/creatures/odontochelys/tripo-raw/odontochelys.raw.glb',
                'tools/triassic/creatures/odontochelys/odontochelys.preview.glb'],
    'notes': [
        'The plastron is a rigid part on its own unanimated bone, as Placodus\' gastral basket and '
        'Henodus\' carapace are -- and, unlike theirs, it is ventral only. There is no carapace '
        'bone, because this animal has no carapace: its back is broadened ribs under skin and it '
        'bends. The plate is measured off the generation\'s own pale ventral pigment and then '
        'feathered into a field, so the gate between shell and skin is a ramp and not a step.',
        'A rower with four clawed limbs on a diagonal-couplet gait: the two sides alternate and '
        'the hind pair is half a beat behind the fore, which is a walking tetrapod\'s gait taken '
        'into the water rather than a sea turtle\'s synchronous flight. The swept angle at each '
        'limb root is measured from the limb\'s own direction in world space rather than read off '
        'an Euler channel, and the build refuses a limb that sweeps under 60 degrees in Sprint.',
        'Ability is bellyTurn: a one-shot roll that puts the plate between the animal and whatever '
        'is coming, with the head drawn in over it and the limbs pulled under. Crawl is the punt '
        'along the bottom, an extra beside the swim set rather than the locomotion.',
        'The mouth is modelled and reads cleanly over the front 0.06 of the body. Behind the hinge '
        'the detector walks off the head onto the forelimb, which stands directly beside the jaw '
        'on this pose, so the seam is fitted in front of the hinge and continued behind it.',
        'Every head measurement is taken inside a radius of the head\'s own axis: a plain band at '
        'y -0.330 reads a half width of 0.204 where the head measures 0.061, and it is reading '
        'the shoulder.',
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
    'plastronBoneSeatingRaw': PLASTRON_SEATING,
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
    'limbRadiusPercentiles': [.84, .995], 'limbRootFadeOverFirstBone': 1.40,
    'limbRadiusGrowthWithArcLength': list(RADIUS_GROWTH),
    'limbChainBlendFractionOfLimbLength': BLEND_FRACTION,
    'limbChainBlend': {k: round(v, 5) for k, v in LIMB_BLEND.items()},
    'relaxPasses': 9,
    'plastron': {**PLASTRON_MEASURED, 'verticesMostlyOnThePlate': plastron_vertices,
                 'boneUnanimated': True, 'thereIsNoCarapaceBone': True,
                 'constantChannelsStrippedFromTheExport': PLASTRON_CHANNELS_DROPPED},
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
        'note': 'The generation models a real slit with an interior: %d cavity vertices at a %.3f '
                'gap. The seam is the cavity\'s own mid height per station, blurred once and '
                'fitted over the %d stations in front of the hinge -- behind it the detector walks '
                'onto the forelimb, which stands beside the jaw on this pose, and the seam it '
                'reports falls a fifth of a body length below the head. Station-to-station '
                'roughness %.4f of the local radius.'
                % (len(CAV), MOUTH_GAP, int(_fit.sum()), CAVITY_ROUGHNESS),
        'cavityVertices': int(len(CAV)), 'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'cavityProfile': [[round(float(a), 4), round(float(b), 5), round(float(c), 5),
                           round(float(d), 5)]
                          for a, b, c, d in zip(CAV_Y, CAV_MID, CAV_WIDE, CAV_TALL)],
        'cavityProfileColumns': ['y', 'seamZ', 'halfWidth', 'halfHeight'],
        'measuredLineRoughnessOverRadius': CAVITY_ROUGHNESS,
        'seamClearanceInsideTheHeadMin': SEAM_MARGIN_MIN,
        'headSection': HEAD_SECTION_EVIDENCE,
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
print('ODON_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('ODON_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('ODON_PLASTRON', json.dumps(report['plastron']))
print('ODON_ENVELOPE', json.dumps(report['envelope']))
print('ODON_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'hingeY', 'measuredLineRoughnessOverRadius',
       'paintedLineAgreementOverRadius', 'toothPatchesStraddlingTheCut')}))
print('ODON_SWEEP', json.dumps(limb_sweep))
print('ODON_POSE', json.dumps({'spine': {k: v for k, v in POSE_DEVIATION['spine'].items() if k != 'perStation'},
      'neck': {k: v for k, v in POSE_DEVIATION['neckAndHead'].items() if k != 'perStation'},
      'tail': {k: v for k, v in POSE_DEVIATION['tail'].items() if k != 'perStation'},
      'limbAsymmetry': LIMB_ASYMMETRY.get('allPairs')}))
print('ODON_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('ODON_OK')
