"""Rebuild Archelon: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. **Off the roster on purpose** -- Archelon is Late Cretaceous, not Triassic, and where
it belongs is the open question in `docs/triassic/05-mesozoic-expansion.md`. It is registered in
`src/content/triassic/expansion.json` and reaches the game only as a *standing visitor*
(`src/content/triassic/guests.ts`), never through `TRIASSIC_CREATURES`.

The body is carried into its own measured frame first -- head at -Y, up +Z, one unit long -- and
`export_yup` then puts the head at glTF +Z, where every shipped body in this repository keeps it.

WHAT THIS ANIMAL IS, AND WHAT THAT COSTS THE MEASUREMENTS.

*A carapace half the body wide.* The generation measures 0.937 across against 1.000 along, so this
is the widest body the pipeline has seen -- wider, relative to its length, than Henodus. Two things
in the shared kit are written for narrower animals and are replaced here:

  * `T.measured_centreline` takes the **median** x and z of each slab's thick vertices, and on a
    body whose widest station is 0.68 across that median is dragged by whichever half of the shell
    happens to carry more vertices. Mystriosuchus' corrected two-pass version is used instead --
    the kit's pass to find the limb clusters, then the **mid-range of the 4th and 96th percentiles**
    over everything neither thin nor nearer a limb polyline than the rough axis -- because a centre
    is the middle of a section and not the middle of its vertices. Measured here the kit's axis
    wanders 0.055 of a body in x across the trunk; the corrected one is quoted in the report.
  * The **shell margin is thin**, so `T.thin_clusters` returns six patches rather than four: the
    four flippers and the two carapace rims. Rhaeticosaurus separates blades from debris by reach,
    which does not work here (a carapace rim reaches 0.28 from the axis against the hind flipper's
    0.22). The discriminator is **station span**, as it is on Mystriosuchus: a rim runs 0.47 of a
    body along the axis where no flipper runs more than 0.16.

*The shell is a rigid part.* Placodus' gastral basket and Henodus' carapace are the pattern:
`shell` is a bone parented to `body` with **no animation channel written for it in any clip**, so
the carapace can never undulate and, because a bone that does not move relative to its parent
cannot tear the skin it shares with it, the long boundary between the dome and the flank is free.
The channels the exporter's forced sampling writes for it are stripped from the packaged file.

*A hydrofoil, not a paddle.* Rhaeticosaurus is the closest analogue in the tree -- both fly rather
than row -- and its scheme is the starting point, **re-measured** as the era's rules require. The
one number that had to change is the radius inside which a vertex is wholly the limb's: the kit's
fins take the 55th percentile of the cluster's own distances and Rhaeticosaurus needed the 92nd for
a blade that sweeps 130 degrees. Archelon's forelimb is longer still relative to the trunk, and the
percentile that this body actually wants is recorded in `validation.json` beside the tear figure it
produced.

*The mouth is modelled.* Placodus' geometric method -- cast every head vertex's own outward normal
back into the mesh -- finds a real slit here, but only when it is asked about the **head**: over the
front 34 % of the body (the kit's default) it returns 156 vertices spread from the beak to
y -0.119, which is the shell, and those far hits are the gap between a forelimb and the plastron
rather than a mouth. Restricted to the head the hits collapse onto the beak's own slit. A turtle's
gape is short and that is not a defect: the cut runs 0.04 of a body, from the hooked tip back to
the corner under the eye, which is where the reference draws it.

Writes only this species' asset family. Touches no shared registry and performs no git operation.
"""
import bpy, math, json, os, sys, hashlib, shutil, struct
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                        # noqa: E402

ID = 'archelon'
NAME = 'Archelon'
SPECIES = 'Archelon ischyros'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
# The raw generation is the source: nothing has been cut from or stretched into this body, so the
# preview beside it is the same surface re-exported and there is no corrected file to prefer.
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
PREVIEW = os.path.join(HERE, ID + '.preview.glb')
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

# A four-and-a-half-metre turtle that flies rather than swims: long beats, and a Sprint that is a
# harder stroke rather than a faster wriggle. `Ability` is the power stroke, both forelimbs at once.
CLIPS = {'Idle': 3.0, 'Swim': 2.0, 'Sprint': 1.2, 'TurnLeft': 1.7, 'TurnRight': 1.7,
         'Dive': 1.4, 'Rise': 1.4, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.2, 'Hit': .6,
         'Death': 1.9, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5, 'Eat': 1.6, 'Stagger': 1.2,
         'Ability': 1.1, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5, 'Breathe': 3.0}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(RAW, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(RAW, ROOT)
intake['publishedPreviewSha256'] = hashlib.sha256(open(PREVIEW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.58)
skin_material.use_backface_culling = False    # the backstop behind the mouth lining

# **The countershading floor has to be lowered, and the roll checked another way.** A turtle is
# mottled over its whole surface -- the carapace is blotched as heavily as the flanks -- so the
# first circular harmonic of darkness round each station measures 0.214 against the module's 0.30
# floor and it refuses rather than guessing. Ceratites is the precedent for measuring the frame a
# second way when the shared one will not commit. Two independent readings are asserted below:
# the harmonic still *points* at +90.0 +/- 2 degrees (it is weak, not wrong), and the four flippers
# all hang below the axis while the carapace stands above it, which on a turtle is dorsal by
# construction. A frame rolled 180 degrees would put every flipper above the axis.
frame = T.measure_frame(auth, head_is_positive_pca=True, luminance_at=luminance_at,
                        harmonic_floor=.15)
assert abs(frame['rollCorrectionDegrees']) < 6., \
    ('the countershading roll is weak AND large -- do not trust it', frame['rollCorrectionDegrees'])
pigment = T.pigment_sampler(auth, sample_albedo)

raw_co = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(raw_co[:, 1].min()), float(raw_co[:, 1].max())

bvh_auth0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh_auth0))
thin_mask = thickness < THIN
cx0, cz0, _hw0, _hd0, rough_centreline = T.measured_centreline(auth, thin_mask)


# ------------------------------------------------- the trunk's own centreline ----
# Mystriosuchus' correction, and on this body it is not a refinement: the kit's median-of-thick
# pass is measured against the corrected one below and the difference is recorded.
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


def limb_vertex_mask(o, blades, ax, az):
    """Every vertex nearer one of the four flippers' rough polylines than the rough body axis."""
    co = np.array([v.co[:] for v in o.data.vertices])
    ys = np.linspace(co[:, 1].min(), co[:, 1].max(), 61)
    AP0, AC0 = T.polyline([Vector((ax(float(y)), float(y), az(float(y)))) for y in ys])
    lines = []
    for c in blades:
        s, r = Vector(c['seat']), Vector(c['reach'])
        lines.append(T.polyline([s + (r - s) * t for t in (0., .34, .68, 1.)]))
    out = np.zeros(len(co), bool)
    for i, p in enumerate(co):
        q = Vector((float(p[0]), float(p[1]), float(p[2])))
        da = T.project(AP0, AC0, q)[0]
        for P, cum in lines:
            if T.project(P, cum, q)[0] < da:
                out[i] = True
                break
    return out


# ------------------------------------------- the four flippers, as measured ----
# Six thin patches, not four. **The test that separates a flipper from a carapace rim is its
# station span**, not its reach: each rim runs 0.47 of a body along the axis and reaches 0.28 from
# it, which is further than either hind flipper reaches.
def find_blades(ax, az):
    blades, other = [], []
    for c in T.thin_clusters(auth, thin_mask, ax, az):
        mid = (c['yRange'][0] + c['yRange'][1]) / 2
        span = c['yRange'][1] - c['yRange'][0]
        lateral = abs(c['centroid'][0] - ax(mid))
        (blades if (span < .25 and c['reachRadius'] > .18 and lateral > .05)
         else other).append(c)
    return blades, other


blades, other = find_blades(cx0, cz0)
assert len(blades) == 4, ('four flippers did not measure on the rough axis', len(blades),
                          [(round(c['yRange'][1] - c['yRange'][0], 3), round(c['reachRadius'], 3))
                           for c in T.thin_clusters(auth, thin_mask, cx0, cz0)])
LIMB_MASK = limb_vertex_mask(auth, blades, cx0, cz0)
cx, cz, half_width, half_depth, centreline = trunk_centreline(auth, thin_mask | LIMB_MASK)
blades, other = find_blades(cx, cz)
assert len(blades) == 4, ('four flippers did not measure on the corrected axis', len(blades))
# Kept now: the report is written after the jaw cut has added vertices to the mesh, and a cluster
# pass run then indexes a thickness array that no longer matches it.
ALL_CLUSTERS = [{k: v for k, v in c.items() if k != 'indices'}
                for c in T.thin_clusters(auth, thin_mask, cx, cz)]
# What the correction was worth, as a number rather than an assurance.
CENTRELINE_SHIFT = {
    'maxShiftXOverBodyLength': float(max(abs(r['cx'] - cx(r['y'])) for r in rough_centreline)),
    'maxShiftZOverBodyLength': float(max(abs(r['cz'] - cz(r['y'])) for r in rough_centreline)),
    'method': 'the kit\'s median-of-thick-vertices pass against the two-pass mid-range of the 4th '
              'and 96th percentiles over everything neither thin nor nearer a flipper than the '
              'rough axis',
}

blades.sort(key=lambda c: (c['yRange'][0] + c['yRange'][1]) / 2)
LIMBS = {}
for i, c in enumerate(blades):
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    LIMBS[('fore' if i < 2 else 'hind') + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
assert sorted(LIMBS) == ['foreL', 'foreR', 'hindL', 'hindR'], sorted(LIMBS)
# The forelimb is the engine and the hind pair is the rudder, which is what a sea turtle is: the
# measured reach says so rather than the anatomy book.
FORE_REACH = min(LIMBS['foreL']['reachRadius'], LIMBS['foreR']['reachRadius'])
HIND_REACH = max(LIMBS['hindL']['reachRadius'], LIMBS['hindR']['reachRadius'])
assert FORE_REACH > HIND_REACH * 1.4, ('the forelimbs must be the large pair', FORE_REACH, HIND_REACH)


def on_axis(y, dz=0., dx=0.):
    return Vector((cx(y) + dx, y, cz(y) + dz))


depth, bvh_auth = T.depth_probe(auth)

# --- the dorsal check the weak countershading cannot make on its own. Every flipper hangs below
# the measured axis and the carapace stands above it.
_dorsal = []
for key, c in LIMBS.items():
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    _dorsal.append({'limb': key, 'centroidZOverAxis': float(c['centroid'][2] - cz(mid))})
assert all(r['centroidZOverAxis'] < 0 for r in _dorsal), ('a flipper is above the axis -- the '
                                                          'frame may be rolled', _dorsal)
# Measured over the trunk itself, with the flippers dropped: they hang below the axis (which is
# the reading above) and would otherwise answer this question as well as that one.
_shell_band = (raw_co[:, 1] > -.20) & (raw_co[:, 1] < .28) & ~LIMB_MASK & ~thin_mask
_rel = raw_co[_shell_band][:, 2] - np.array([cz(float(y)) for y in raw_co[_shell_band][:, 1]])
_above, _below = float(_rel.max()), float(_rel.min())
DORSAL_EVIDENCE = {'flippers': _dorsal, 'trunkRiseAboveAxis': _above, 'trunkDropBelowAxis': _below,
                   'note': 'the carapace dome stands further above the axis than the plastron '
                           'falls below it, and all four flippers hang below: dorsal is +Z'}
assert _above > abs(_below) * .95, ('the carapace should stand above the axis', _above, _below)

# --------------------------------------------------------------------- measure the mouth ----
# **Placodus' geometric method, asked about the head rather than about the front third.** The kit's
# default front fraction reaches y -0.119 on this body, which is the middle of the shell, and the
# hits it collects out there are forelimb-against-plastron gaps rather than a mouth: 156 vertices,
# of which 131 sit behind y -0.25 and 24 on the beak. Restricted to the head the method returns the
# beak's own slit and nothing else, which is the one case the pipeline says to prefer.
HEAD_FRACTION = (( -.36) - Y0) / (Y1 - Y0)
CAV = T.mouth_cavity(auth, front_fraction=HEAD_FRACTION, gap=.030)
assert len(CAV) >= 12, ('the modelled beak slit did not measure', len(CAV))
CAV_SPREAD = float(CAV[:, 1].max() - CAV[:, 1].min())
# A cast whose hits spread over the whole depth of the head has found the far side of the skull
# rather than the slit. A beak's gape is short; anything past a fifth of a body is not one.
assert CAV_SPREAD < .20, ('the cavity hits spread too far to be a mouth slit', CAV_SPREAD)
MOUTH_METHOD = ('geometric: every head vertex casts its own outward normal back into the mesh '
                '(Placodus\' method), restricted to the head rather than to the kit\'s front third')
MOUTH_Y = (float(CAV[:, 1].min()), float(CAV[:, 1].max()))
_sy, _sz, _sw, _sd = T.cavity_profile(CAV, MOUTH_Y[0] + .002, MOUTH_Y[1] - .002, .0035, .006)
assert len(_sy) >= 6, ('too few cavity stations to fit a line', len(_sy))
HINGE_Y = float(MOUTH_Y[1] + .004)
JAW_FRONT_Y = float(Y0 - .004)          # in front of the animal: the mandible gets no front cut
MOUTH_FRONT_Y = float(MOUTH_Y[0] + .002)
HEAD_BACK = float(Y0 + .175)


def seam(y):
    """The measured mouth line, clamped in front of the beak tip and behind the corner. A curve,
    so the cut is taken by shearing the head onto it rather than by a plane."""
    return float(np.interp(y, _sy, _sz))


# What a straight cut would have cost, recorded for comparison with the curve that is used.
_ramp = np.polyfit(_sy, _sz, 1)
_resid = _sz - np.polyval(_ramp, _sy)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(half_depth(float(y)), 1e-4) for y in _sy])))

# What relief the generated beak carries, recorded rather than added to.
# **A turtle has no teeth**, so the floor here is set where a real crown would be rather than
# where the beak's own ridging and the head's scutes are: at 0.0020 the pass returns two patches
# a tenth of a body long, which are the head's relief and not dentition.
SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0055)

# The centreline table is 61 stations over a whole body and far too coarse for a head this small,
# so the head gets its own fine profile and the mouth's own section is ray cast from the seam.
_HY = np.linspace(Y0 + .002, HINGE_Y + .030, 48)
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


# Birgeria's lesson: a percentile of the flank over a band about the seam is not the mouth's
# section. Casting a ray out from the mouth's own axis measures the section the mouth actually
# cuts. **The height is not cast on this body**, because the slit is modelled: a ray from the seam
# would measure the closed slit -- a few thousandths -- rather than the flesh the lining sits in.
_MW = []
for _y in _HY:
    _o = (cx(float(_y)), float(_y), seam(float(_y)))
    _MW.append(min(_cast(_o, (1, 0, 0)), _cast(_o, (-1, 0, 0)), head_half_width(float(_y))))
_MW = np.array(_MW)
_MD = np.array([float(np.interp(y, _sy, _sd)) for y in _HY])


def mouth_half_width(y):
    return float(np.interp(y, _HY, _MW))


def mouth_half_depth(y):
    """The measured slit's own half height, floored: what the cavity profile says the generation
    already models, which is the one honest starting point where a mouth *is* modelled."""
    return max(float(np.interp(y, _HY, _MD)), .0018)


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


NECK_Y = [-.300, -.336, -.368]           # short, and three joints so the bend is a curve
CHEST_Y, BODY_Y = -.235, .030
TAIL_Y = [.400, .462]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
# The carapace: a rigid part on its own unanimated bone, hung off the trunk exactly as Placodus'
# gastral basket and Henodus' carapace are.
bone('shell', on_axis(.030, dz=.055), 'body')
bone('chest', on_axis(CHEST_Y), 'body')
for i, y in enumerate(NECK_Y):
    bone('neck_%02d' % i, on_axis(y), 'chest' if i == 0 else 'neck_%02d' % (i - 1))
bone('skull', on_axis(HINGE_Y - .020), 'neck_%02d' % (len(NECK_Y) - 1))
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y) - .006), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.016)
    reach = Vector(c['reach'])
    if kind == 'fore':
        # Four joints in the forelimb, as Rhaeticosaurus has: a blade that sweeps 130 degrees on
        # three joints puts a quarter of that arc across each band between them, and the skin
        # tears there. Spread over four the angle per joint drops and the blade bends as a curve.
        names = ['fore_upper_%s' % s, 'fore_mid_%s' % s, 'fore_outer_%s' % s, 'fore_tip_%s' % s]
        fracs = (.30, .55, .78)
    else:
        # The hind flipper is a rudder half the forelimb's reach; three joints carry it.
        names = ['hind_upper_%s' % s, 'hind_mid_%s' % s, 'hind_tip_%s' % s]
        fracs = (.38, .70)
    pts = [root] + [root + (reach - root) * f for f in fracs] + [reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    # **Both pairs hang off `body`, not off `chest`.** A turtle's shoulder girdle is *inside* the
    # shell and does not move relative to it, so a forelimb rooted on a bone that carries the
    # neck's wave drags the front of the carapace with every stroke: rooted on `chest` the skin
    # tore 5.37x, and `chest` alone dominated four fifths of the torn edges in Sprint.
    parent = 'body'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .012, ('a flipper root is not seated inside the trunk', n, d)
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
    LIMB_FIT[key] = (P, cum, LIMB_NAMES[key],
                     T.station_weights(ASTATION, T.project(AP, ACUM, P[0])[1]))
# **A copied rig is a starting point to be re-measured, never a transplant.** Nothing about "a
# vertex outboard of |x| means it is on the limb" survives a body 0.68 across at its widest, so the
# limb is bound **radially against its own bone chain**, at a radius measured from the flipper's
# own cluster. The percentile is the number Rhaeticosaurus warns about: the kit's fins take the
# 55th, which leaves half a hydrofoil on a partial alpha and lets the relaxation spread trunk
# weight out along it; Rhaeticosaurus needed the 92nd, and this forelimb is longer still relative
# to its trunk. Measured here at 0.94.
# Measured on this body: at the 92nd percentile the blade's outer sixth sits on a partial alpha
# and the skin tore 5.11x across the shoulder; at the 99th the whole blade is the limb's and the
# blend band lies on the trunk instead, where the along-limb ramp already holds it down.
LIMB_PERCENTILE = .99
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    rin = float(np.quantile(d, LIMB_PERCENTILE))
    LIMB_RADIUS[key] = (rin, rin + .055)
# **The inter-joint blend is a fraction of the limb's own length, never a constant.** Copied onto
# a shorter chain as a number it overruns the four-influence budget and the relaxation then trims a
# different four on neighbouring vertices, which is where radiating spikes come from. Each limb's
# blend is 0.13 of its own arc length here, so the hind pair's narrower bands scale with it.
LIMB_BLEND = {key: float(LIMB_FIT[key][1][-1]) * .13 for key in LIMB_FIT}


def limb_weights(q):
    best, chosen = 0., None
    for key, (P, cum, names, rootw) in LIMB_FIT.items():
        dist, s = T.project(P, cum, q)
        rin, rout = LIMB_RADIUS[key]
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else T.smooth(1 - (dist - rin) / (rout - rin)))
        alpha *= T.smooth(s / max(cum[1] * 1.15, 1e-6))
        if alpha > best:
            best = alpha
            chosen = (T.limb_chain(names, cum, s, blend=LIMB_BLEND[key]), rootw,
                      min(1., s / cum[-1]))
    return (best, *chosen) if chosen else None


# The carapace footprint, measured off the section table rather than typed: every station whose
# half width passes two thirds of the widest is shell, and the dome is everything above the axis
# there. Capped below the flank, so the rigid region never reaches the plastron, the shoulder or
# the tail root -- a shoulder that went rigid would tear the moment the limb swung.
_trunk = [r for r in centreline if r['halfWidth'] > max(q['halfWidth'] for q in centreline) * .62]
SHELL_Y = (float(min(r['y'] for r in _trunk)), float(max(r['y'] for r in _trunk)))
SHELL_MID = (SHELL_Y[0] + SHELL_Y[1]) / 2
SHELL_HALF = (SHELL_Y[1] - SHELL_Y[0]) / 2


def shell_share(q):
    u = (q.y - SHELL_MID) / SHELL_HALF
    plan = T.smooth((1. - u ** 4) / .30)
    dome = T.smooth((q.z - (cz(q.y) + .012)) / .028)
    return plan * dome


# **A carapace is not flesh, and inside its footprint the answer is one bone.** `shell` is parented
# to `body` and carries no animation channel in any clip, so a hard boundary there costs nothing --
# shell and body move identically, and what a mixed weight inside the carapace actually buys is a
# share of `chest` and `tail_00`, which *are* keyed, and of the limbs. Measured on the delivered
# body: 456 of the 2,665 shell-dominant vertices (17.1 %) carried forelimb or hindlimb weight, and
# across the whole shell band 48.6 % of the vertices carried limb, neck, tail or chest weight --
# 254 units of it, `chest` 112 and `tail_00` 88. That is a box asked to bend with the legs and with
# the pitch of the trunk.
#
# Two thresholds, because the *boundary* still has to be a ramp even though the inside is not. The
# gate is hard before the relaxation, so nothing but shell is bid inside the footprint; the
# relaxation then does what it always does and turns the step into a two-ring ramp both ways; and
# afterwards the plateau -- and only the plateau -- is restored to `{shell: 1}` exactly, so the rim
# keeps its ramp and the carapace does not. Restoring the whole footprint instead defeats the
# relaxation exactly where it is needed and makes `shell` the worst tear on the animal (4.94x
# against 3.86x).
SHELL_GATE = .50
SHELL_SOLID = .985


THROAT_SPAN = .030
THROAT_DROP = .14


def throat_jaw_share(q):
    a = T.smooth((q.y - (HINGE_Y - .010)) / .010)
    b = T.smooth(((HINGE_Y + THROAT_SPAN) - q.y) / THROAT_SPAN)
    c = T.smooth((seam(HINGE_Y) - q.z) / (THROAT_DROP * head_half_depth(HINGE_Y)) + 1.)
    return a * b * c


def weights(p):
    q = Vector(p)
    if shell_share(q) >= SHELL_GATE:
        return {'shell': 1.}
    w = dict(T.station_weights(ASTATION, T.project(AP, ACUM, q)[1]))
    throat = throat_jaw_share(q)
    if throat > 0:
        w = {n: v * (1 - throat) for n, v in w.items()}
        w['jaw'] = w.get('jaw', 0.) + throat
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
    sample_albedo, thin=THIN, band=.020, roughness=.62, blade_dilation=.0032)


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
shell_vertices = 0
shell_solid_vertices = 0
for o in (auth, puppet):
    for n in B:
        o.vertex_groups.new(name=n)
    raw_weights = [weights(v.co) for v in o.data.vertices]
    relaxed = T.relax_weights(o, raw_weights, passes=5, hold=.45)
    # The relaxation is a diffusion and does not know the shell is a box: five passes carry a
    # forelimb's weight several rings in over the rim. Inside the footprint the answer is restored
    # exactly afterwards, which is the whole of "the skinning should consider the shell not to be
    # flexible". Outside it nothing is touched, so the rim still ramps and still cannot tear.
    solid = 0
    for v in o.data.vertices:
        if shell_share(v.co) >= SHELL_SOLID:
            relaxed[v.index] = {'shell': 1.}
            solid += 1
    if o is auth:
        shell_solid_vertices = solid
    counts, owners = [], {}
    for v in o.data.vertices:
        w = relaxed[v.index]
        counts.append(len(w))
        if w.get('shell', 0.) > .5 and o is auth:
            shell_vertices += 1
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
# Double-sided, as Rhaeticosaurus' is: a sac buried inside a head is never seen from outside
# whatever its winding, because the skin is in front of it, so culling it buys nothing and costs
# the one thing it exists for -- from below, an open mouth's floor is backfacing.
mouth_mat = T.inward_material(NAME + ' mouth interior', (.34, .17, .16, 1))
mouth_mat.use_backface_culling = False
MOUTH_BACK = HINGE_Y + .012
MOUTH_FRONT = MOUTH_FRONT_Y


def _raw_section(y):
    """Floored against the head, not tapered to nothing: a tube that tapers with the beak is a
    thread by the time it reaches the hook, and the jaw then swings past it."""
    e = T.smooth((MOUTH_BACK - y) / .008) * T.smooth((y - MOUTH_FRONT) / .004)
    w = max(mouth_half_width(y) * .92, .0012) * (.94 + .06 * e)
    h = max(min(head_half_depth(y) * .46, mouth_half_depth(y) * 2.6), .0030) * (.72 + .28 * e)
    return w, h


LINING_FIT = {}
LINING_POWER = 2.6


def mouth_section(y):
    w, h = _raw_section(y)
    LINING_FIT[round(float(y), 5)] = [round(w, 5), round(h, 5)]
    return w, h


# The jaw share is written over the built rings below, so the lining is constructed with a
# placeholder here: the share wants each ring vertex's own height against its own section, which
# is a measurement of the geometry rather than of the station it was asked for.
lining, lining_raw = T.lining('Oral cavity lining', rig, tx, seam, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, (lambda _p: 0.), mouth_mat,
                              rings=26, ring=22, centre_x=cx, power=LINING_POWER,
                              fit=None)
oralparts = [lining]
mouth_cover = []
for _y in np.linspace(MOUTH_FRONT + .004, MOUTH_BACK - .004, 12):
    y = float(_y)
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(mouth_half_width(y), 1e-9), 3),
                        round(h / max(head_half_depth(y), 1e-9), 3)])
    assert w >= mouth_half_width(y) * .45, \
        ('the oral lining is narrower than the mouth', y, w, mouth_half_width(y))
    assert h >= .0012, ('the oral lining is flat', y, h)

# The lining's jaw share, applied after the fact so the weights can be measured from the built
# rings rather than guessed from the section. **The changeover is above the lip, not at it**:
# centred on the seam, the ring's equator takes half the jaw's rotation while the mandible's cut
# rim takes all of it, and a wedge opens between them at full gape.
lining_jaw = []
for idx, p in enumerate(lining_raw):
    _w, h = mouth_section(p.y)
    t = T.smooth(.5 + 1.6 * ((seam(p.y) + .45 * h) - p.z) / max(h, 1e-6))
    lining.vertex_groups['jaw'].add([idx], t, 'REPLACE')
    lining.vertex_groups['skull'].add([idx], 1 - t, 'REPLACE')
    lining_jaw.append(round(float(t), 3))

# The jaw hinge tissue: a seated envelope straddling the cut plane, because that corner is where
# the mandible's rear rim, the throat and the lining all meet and the wedge between them is what
# opens at full gape.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.62)
# **Sized off the head's own fine profile, not the trunk table.** The 61-station centreline runs
# over a whole body and is smoothed across five of them, so at the beak it reports a section half
# again as deep as the head really is.
#
# **And `depth()` cannot *seat* anything beside a modelled mouth, which is the trap here because it
# looks as if it can.** Rhaeticosaurus shrinks this envelope until every probe point reads a
# positive depth, and that works because its generation paints its mouth on a closed head. This one
# models the slit: the lumen's own walls fold into the skull within a couple of hundredths of the
# hinge, so `find_nearest` returns one of them and the inside/outside sign it reports is the sign
# of that wall's normal rather than of the skull's. Measured here the search called the envelope
# *outside* the body at every size from 0.17 to 1.00 of its nominal radius and inside below that --
# a discontinuity that is the slit being found, not the head being small. Placodus and Henodus both
# record this rather than asserting on it, for the same reason. So the probe is recorded and what
# actually proves the corner of the mouth is closed is `tools/triassic/gape-solid.py`, which is
# what the era's rule asks for in the first place.
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .002, cz(HINGE_Y))
HINGE_R = (head_half_width(HINGE_Y) * .88, .016, head_half_depth(HINGE_Y) * .88)
HINGE_FIT = .55
HINGE_TRACE = []
for step in range(24):
    k = 1. - step / 24
    probe = [Vector((HINGE_CENTRE[0] + HINGE_R[0] * k * math.sin(b) * math.cos(a),
                     HINGE_CENTRE[1] + HINGE_R[1] * k * math.sin(b) * math.sin(a),
                     HINGE_CENTRE[2] + HINGE_R[2] * k * math.cos(b)))
             for a in np.linspace(0, 2 * pi, 20) for b in np.linspace(0, pi, 11)]
    HINGE_TRACE.append([round(k, 3), round(min(depth(q) for q in probe), 5)])
HINGE_PROBE = {'centre': list(HINGE_CENTRE), 'nominalRadiusRaw': list(HINGE_R),
               'centreDepthRaw': float(depth(Vector(HINGE_CENTRE))), 'fractionUsed': HINGE_FIT,
               'minimumProbeDepthAtEachSize': HINGE_TRACE,
               'note': 'recorded, not asserted: a point beside a modelled slit is measured against '
                       'the slit\'s own wall, whose normal faces into the lumen, so the '
                       'inside/outside sign is not the skull\'s. The gape proof is the real check.'}
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

# **Recorded against `depth()`, asserted against the head's own section.** Same reason as the hinge
# probe: beside a modelled slit the nearest-surface sign is the slit wall's rather than the skull's,
# so `depth` is evidence and not a test here. What *is* a test, and uses no normals at all, is
# whether every oral vertex lies inside the head's measured section at its own station -- the 48-
# station fine profile of the front of the body, taken from the vertex cloud by percentile.
oral_seating = []
for o in oralparts:
    worst = min(depth(Vector(v.co[:]) / SCALE) for v in o.data.vertices)
    out_w, out_d = 0., 0.
    for v in o.data.vertices:
        q = Vector(v.co[:]) / SCALE
        out_w = max(out_w, abs(q.x - cx(q.y)) - head_half_width(q.y))
        out_d = max(out_d, abs(q.z - cz(q.y)) - head_half_depth(q.y))
    oral_seating.append({'part': o.name, 'worstDepthRaw': float(worst),
                         'outsideHeadHalfWidthRaw': float(out_w),
                         'outsideHeadHalfDepthRaw': float(out_d)})
    assert out_w < .006 and out_d < .006, ('mouth geometry stands outside the head\'s own section',
                                           o.name, out_w, out_d)

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
SNOUT_Y = float(MOUTH_Y[0] + .004)
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, seam(SNOUT_Y) - .004), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(HINGE_Y - .020), HINGE_Y - .020, seam(HINGE_Y - .020)),
                            'swallow'),
    # **The blow this animal lands is a bite, and the beak is what lands it.** Archelon crushes
    # ammonites; its heavy is a crush rather than a snatch, so the skull is the bone that delivers
    # it. The neck is short and carries the head there without striking with itself.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .003, seam(SNOUT_Y) + .005),
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


# **Underwater flight over a box that cannot bend.** A turtle's trunk is a fused shell, so the
# axial chain carries no wave at all through the trunk: what wave there is belongs to the short
# neck and the stub tail. The animal is carried by two enormous forelimbs with the hind pair
# steering behind them.
#
# Every bone in this rig rests pointing along +Y, so for a flipper held out along X the flight
# stroke -- the blade sweeping up and down -- is a rotation about the body's long axis, which is
# the bone's own Y. `.z` is the fore-and-aft component that makes it a figure of eight rather than
# a flap, and `.x` the feather. That is asserted rather than assumed: the swept angle recorded
# below is measured from the limb's own direction.
AXIAL_CHAIN = ['neck_01', 'neck_00', 'chest', 'body'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
# **`chest` is given exactly nothing.** The shoulder girdle of a turtle is fused inside the
# carapace; a bone there that carries any part of the neck's wave, or any part of a turn, moves
# relative to the rigid shell beside it and tears the seam between them.
GAIN = [.40, .30, .18, .00, .00, .20, .36]
LAG = [0., .28, .55, .9, 1.15, 1.5, 1.85]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}
# The hind pair trails the fore by a fifth of a cycle: it steers in the forelimbs' wake rather
# than adding thrust, which is what a sea turtle's hind flippers do.
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

        amp = {'Idle': .18, 'Swim': 1.0, 'Sprint': 1.30, 'Eat': .30, 'Guard': .16, 'Grab': .26,
               'Breath': .30, 'Breathe': .24, 'Growth': .22, 'Dodge': 1.05,
               'Ability': .70}.get(clip, .24)
        beat = {'Swim': 2., 'Sprint': 2., 'Idle': 1., 'Breathe': 1.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy') else 0.
        # **Attack lets go; Heavy does not.** The two clips share their cock and their drive, and
        # the only thing that separates a crush from a snatch is how long the beak stays on the
        # target: Attack's drive falls away from 0.62 of the clip, Heavy's holds to 0.80. Built with
        # one release for both, the measured dwell at full reach came out 0.347 against 0.327 --
        # two names for one clip.
        _release = (.80, 1.) if clip == 'Heavy' else (.62, 1.)
        drive = (ramp(u, .30, .46, 2.2) * (1 - ramp(u, _release[0], _release[1], 1.))
                 if clip in ('Attack', 'Heavy') else 0.)
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy') else 0.
        # **Heavy is the crush, and it is longer rather than further.** Archelon is not a snatcher:
        # its heavy attack holds an ammonite in the beak and bears down, so the clip stays on the
        # target and the drive is held. It still has to be measurably a different clip from Attack,
        # which here means a longer hold and a wider bite rather than more reach.
        hold = ramp(u, .44, .56, 1.6) * (1 - ramp(u, .84, 1., 1.)) if clip == 'Heavy' else 0.
        # `Ability` is the power stroke: both forelimbs at once, one enormous synchronised downbeat
        # and a long glide out of it.
        load = ramp(u, .02, .22, 1.6) * (1 - ramp(u, .24, .34, 2.0)) if clip == 'Ability' else 0.
        power = ramp(u, .26, .44, 2.2) * (1 - ramp(u, .58, .96, 1.)) if clip == 'Ability' else 0.
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        if clip == 'Death':
            amp *= 1 - dead

        # --- the beak
        gape = .012 * (1 - cos(p)) * (1 if clip in ('Idle', 'Swim', 'Sprint') else 0)
        if clip == 'Bite':
            gape = .46 * ramp(u, .03, .17, 1.8) * (1 - ramp(u, .22, .38, 2.4))
        elif clip == 'Attack':
            gape = .22 * cock + .38 * ramp(u, .22, .44, 1.6) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Heavy':
            gape = .22 * cock + .44 * ramp(u, .24, .44, 1.7) * (1 - ramp(u, .46, .60, 1.8)) \
                + .10 * hold
        elif clip == 'Ability':
            gape = .08 * load
        elif clip == 'Grab':
            gape = .12 + .05 * haul
        elif clip == 'Eat':
            gape = .30 * (1 - cos(p * 2)) * .5 + .09
        elif clip == 'Breath':
            gape = .16 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            gape = .07 * (1 - cos(p))
        elif clip in ('Hit', 'Stagger'):
            gape = .26 * e
        elif clip == 'Death':
            gape = .22 * dead
        elif clip == 'Guard':
            gape = .03 * (1 - cos(p))
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.10 * gape
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the trunk. It is a shell: it pitches and rolls with the stroke and never undulates.
        body = pb['body']
        body.rotation_euler.z += .14 * turn
        body.rotation_euler.y += .22 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x = (1 if clip == 'Dive' else -1) * .34 * e
        if clip in ('Attack', 'Heavy'):
            body.location.y = .10 * cock - .34 * drive - .08 * hold
            body.rotation_euler.x = .10 * cock - .12 * drive - .06 * hold
        if clip == 'Ability':
            body.location.y = .14 * load - 1.05 * power
            body.rotation_euler.x = .16 * load - .12 * power
        if clip == 'Bite':
            body.location.y = -.16 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Parry':
            body.rotation_euler.y = -.28 * e
            body.rotation_euler.z = .16 * e
        if clip == 'Guard':
            body.rotation_euler.x = .035 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .50 * e
            body.rotation_euler.z = -.40 * e
            body.location.x = .32 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z = .18 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .22 * e
            body.location.y = .10 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x = -.22 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z = .09 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Grab':
            body.location.y = -.10 - .08 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        body.rotation_euler.y += .045 * amp * sin(p * beat) * (1 if clip in ('Swim', 'Sprint', 'Idle') else 0)
        body.rotation_euler.y += 2.4 * dead
        body.rotation_euler.x += .16 * dead
        body.location.z -= .24 * dead

        # --- the neck and the stub tail, the only flexible ends
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            z = .10 * GAIN[i] * amp * wave(i, beat)
            z += 0. if n == 'chest' else turn * (.028 + .004 * i)
            z += .050 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy'):
                if n.startswith('neck') or n == 'skull':
                    z += .26 * cock * (1 if i % 2 == 0 else -.6)
                    z -= .20 * drive
            if clip == 'Dodge':
                z += .16 * e * sin(i * .55 + .6)
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 3 else -.5)
            q.rotation_euler.z += z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .040 * e * GAIN[i]
            if clip in ('Breath', 'Breathe') and n.startswith('neck'):
                q.rotation_euler.x = -.20 * (e if clip == 'Breath' else .5 + .5 * sin(p))
        if clip in ('Attack', 'Heavy'):
            # The head is put on the prey by the neck straightening: short, so the reach is modest
            # and the strike is the beak closing rather than the neck flying out.
            pb['skull'].rotation_euler.x += -.18 * cock + .28 * drive + .10 * hold
            for n in ('neck_00', 'neck_01', 'neck_02'):
                pb[n].rotation_euler.x += -.14 * cock + .20 * drive + .08 * hold
                pb[n].rotation_euler.y += .10 * hold
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .10 * sin(p * 2)
            pb['neck_02'].rotation_euler.x += -.10 * sin(p * 2)
        if clip == 'Grab':
            pb['skull'].rotation_euler.z += .08 * haul

        # --- the flippers. **This is the animal.**
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            ph = p * beat - STROKE_LAG[kind]
            stroke = sin(ph)
            fore_aft = cos(ph)
            # The stroke's reach is the animal's, not the clip's energy: a flipper sweeps the same
            # arc and beats harder. Measured, Sprint at 0.95 swept 126 degrees at the root and the
            # shoulder skin tore 5.1x; 0.80 is still a 100-degree stroke.
            reach = {'Sprint': .80, 'Swim': .64, 'Idle': .24,
                     'Breathe': .26, 'Eat': .22, 'Guard': .20, 'Grab': .22}.get(clip, .26)
            gainf = 1.0 if kind == 'fore' else .58
            up.rotation_euler.y = s * reach * stroke * gainf
            up.rotation_euler.z = s * .30 * reach * fore_aft * gainf
            up.rotation_euler.x = -.34 * reach * fore_aft * gainf
            if clip == 'Ability':
                up.rotation_euler.y = s * (.50 * load - 1.00 * power) * gainf
                up.rotation_euler.z = s * (.22 * load + .10 * power) * gainf
                up.rotation_euler.x = -.30 * load + .20 * power
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .46 * e
            if clip in ('TurnLeft', 'TurnRight'):
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.y += d * .40 * e
                up.rotation_euler.z += d * .34 * e
            if clip in ('Attack', 'Heavy'):
                up.rotation_euler.y += s * (.30 * cock - .40 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if clip == 'Guard':
                up.rotation_euler.z += s * .26 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += s * .36 * e
            if clip == 'Dodge':
                up.rotation_euler.y += s * .42 * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.y += s * .32 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.y += s * .22 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.z += s * .24 + s * .10 * haul
            if clip == 'Growth':
                up.rotation_euler.z += s * .22 * e
            up.rotation_euler.y += s * .38 * dead
            up.rotation_euler.x += .30 * dead
            lag = sin(ph - .8)
            # Each joint's rotation is *added* to what it inherits, so a large share here is a kink
            # rather than a curve. The blade bends gently along its length and gets most of its
            # character from the lag.
            spread = ((1, .13, .55, .09), (2, .09, .40, .12), (3, .07, .26, .15))
            for j, share, feather, lagshare in spread[:len(names) - 1]:
                pb[names[j]].rotation_euler.y = share * up.rotation_euler.y \
                    + s * lagshare * reach * lag
                pb[names[j]].rotation_euler.x = feather * up.rotation_euler.x

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
        for q in pb:
            # **The shell is never keyed.** The exporter's forced sampling writes a constant
            # channel for it anyway; that channel is stripped from the packaged file below, so the
            # carapace carries no animation at all in anything that ships.
            if q.name not in ('root', 'shell'):
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

# --- the swept angle at each limb root, measured from the limb's own direction rather than read
# off an Euler channel: a rotation written on one axis can be a stroke on one body and a twist on
# another, so the number that says a flipper takes a real stroke is a property of where the blade
# actually points.
limb_sweep = {}
for clip in ('Swim', 'Sprint', 'Ability'):
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
    floor = 55. if key.startswith('fore') else 30.
    assert limb_sweep['Sprint'][names[0]] > floor, \
        ('a flipper does not take a stroke in Sprint', names[0], limb_sweep['Sprint'][names[0]])
    assert limb_sweep['Swim'][names[0]] > floor * .7, \
        ('a flipper does not take a stroke in Swim', names[0], limb_sweep['Swim'][names[0]])
reset()
scene.frame_set(0)

# -------------------------------------------------------------------------- export ----
sockets = T.make_sockets(rig, anchors)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2) + '\n')


def strip_rigid(path, names):
    """Drop every animation channel targeting a bone that is rigid by declaration.

    `T.patch_glb` removes root motion and scale, which is the contract every body shares. The
    carapace is this body's own rigid part, and forced sampling writes a constant channel for it
    whether it was keyed or not; a constant channel is not an animation but it is also not
    *nothing*, and the claim being made here is that the shell carries no animation at all."""
    raw = open(path, 'rb').read()
    n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n])
    binary = raw[20 + n:]
    keep = set()
    for i, no in enumerate(g['nodes']):
        if no.get('name') in names:
            keep.add(i)
    dropped = 0
    for a in g['animations']:
        before = len(a['channels'])
        a['channels'] = [c for c in a['channels'] if c['target']['node'] not in keep]
        dropped += before - len(a['channels'])
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)
    return dropped


tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
rigid_dropped = {}
for group, suffix in ((AUTH_GROUP, ''), (PUP_GROUP, '.puppet')):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, ID + suffix + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, **T.EXPORT_KWARGS)
    T.patch_glb(path, anchors)
    rigid_dropped[suffix or 'authored'] = strip_rigid(path, {'shell'})
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)
meta = {
    'id': ID, 'name': NAME, 'species': SPECIES,
    'provenance': 'Late Cretaceous · Pierre Shale, Western Interior Seaway',
    'offRoster': True,
    'description': 'The largest turtle known: a strut framework of ribs under a leathery back, a '
                   'hooked beak for ammonites and two hydrofoil forelimbs it flies on. Authored '
                   'Tripo body and measured procedural volume twin share one armature, one set of '
                   'inverse binds, one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 4.6, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['tools/triassic/creatures/archelon/tripo-raw/archelon.raw.glb',
                'tools/triassic/creatures/archelon/tripo-raw/input.png'],
    'notes': [
        'Off the roster on purpose: Archelon is Late Cretaceous, not Triassic, and is registered '
        'in src/content/triassic/expansion.json rather than in TRIASSIC_CREATURES. It reaches the '
        'game as a standing visitor and is in no sea and no population table.',
        'Underwater flight, and the clip set is built around it: the shell is a box that pitches '
        'and rolls but never undulates, and the two hydrofoil forelimbs carry the animal with the '
        'hind pair steering a fifth of a cycle behind them.',
        'The carapace is a rigid part on its own bone, as Placodus\' gastral basket and Henodus\' '
        'carapace are. It is never keyed, and the constant channels forced sampling writes for it '
        'are stripped from the packaged file, so the shell carries no animation at all.',
        'The centreline is measured twice: the kit\'s median-of-thick-vertices pass to find the '
        'flipper clusters, then the mid-range of the 4th and 96th percentiles over everything '
        'neither thin nor nearer a flipper than the rough axis. On a body 0.94 wide against 1.00 '
        'long the kit\'s median is dragged off the animal.',
        'The mouth is modelled and the cut is geometric -- Placodus\' method, asked about the head '
        'rather than about the kit\'s front third, which on this body reaches the middle of the '
        'shell and collects forelimb-against-plastron gaps instead of a mouth.',
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
    'frameNote': 'the countershading harmonic measures %.3f against the module\'s 0.30 floor -- a '
                 'turtle is mottled over its whole surface -- so the floor is lowered to 0.15 and '
                 'the roll is checked a second way, geometrically.' % frame['countershadingMeanStrength'],
    'dorsalEvidence': DORSAL_EVIDENCE,
    'centreline': centreline, 'roughCentreline': rough_centreline,
    'centrelineCorrection': CENTRELINE_SHIFT,
    'measuredClusters': ALL_CLUSTERS,
    'limbs': {k: {'seat': list(LIMB_PTS[k][0]), 'reach': list(LIMB_PTS[k][-1]),
                  'joints': len(LIMB_NAMES[k]),
                  'radiusInner': LIMB_RADIUS[k][0], 'radiusOuter': LIMB_RADIUS[k][1],
                  'interJointBlend': LIMB_BLEND[k],
                  'interJointBlendOverLimbLength': LIMB_BLEND[k] / LIMB_FIT[k][1][-1]}
              for k in LIMB_NAMES},
    'limbRadiusPercentile': LIMB_PERCENTILE,
    'authoredTriangles': authored_tris, 'twinTriangles': puppet_tris,
    'twinTriangleFraction': puppet_tris / authored_tris,
    **twin_report,
    'bones': len(B), 'boneNames': list(B),
    'rigidCarapace': {'bone': 'shell', 'parent': 'body', 'verticesOwned': shell_vertices,
                      'verticesWhollyTheShells': shell_solid_vertices,
                      'solidThreshold': SHELL_SOLID,
                      'rule': 'inside the footprint the weight is {shell: 1} exactly -- set before '
                              'the limbs are consulted and restored after the relaxation, which is '
                              'a diffusion and does not know the shell is a box. The rim keeps its '
                              'ramp and does the blending. `shell` is parented to `body` and never '
                              'keyed, so a hard boundary inside the footprint costs nothing.',
                      'channelsStrippedFromPackagedFile': rigid_dropped,
                      'yExtent': list(SHELL_Y)},
    'poseDeviation': POSE_DEVIATION, 'limbAsymmetry': LIMB_ASYMMETRY,
    'limbSweepDegrees': limb_sweep,
    'limbSweepMethod': 'the largest angle between any two directions the limb points over the '
                       'cycle, taken from the root joint to the tip joint in world space',
    'gapeMaximaRadians': {c: max(v) for c, v in gape_trace.items()},
    'mouthCutDeviation': {
        'aStraightCutWouldHaveDeviatedRaw': RAMP_DEVIATION_RAW,
        'aStraightCutWouldHaveDeviatedOverLocalRadius': RAMP_DEVIATION_OVER_RADIUS},
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report, 'maxInfluences': max(influences),
    'meanInfluences': float(np.mean(influences)),
    'mouth': {
        'method': MOUTH_METHOD,
        'note': 'the kit\'s front-third default returns 156 vertices on this body, of which the '
                'great majority sit behind y -0.25 -- the gap between a forelimb and the plastron, '
                'not a mouth. Restricted to the head the cast returns %d, spread over %.3f of a '
                'body length, which is the beak\'s own slit.' % (len(CAV), CAV_SPREAD),
        'cavityVertices': int(len(CAV)), 'cavitySpreadY': CAV_SPREAD,
        'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y, 'mouthExtentY': list(MOUTH_Y),
        'seamTable': [[round(float(a), 4), round(float(b), 5), round(float(c), 5),
                       round(float(d), 5)] for a, b, c, d in zip(_sy, _sz, _sw, _sd)],
        'liningCoverage': mouth_cover, 'liningFitFactors': LINING_FIT,
        'liningJawShare': lining_jaw,
        'toothPatches': tooth_report, 'toothPatchesStraddlingTheCut': straddling,
        'authoredToothRows': [],
        'oralPartSeating': oral_seating, 'hingeEnvelopeProbe': HINGE_PROBE,
    },
    'envelope': {k: profile_report[k] for k in
                 ('maximumEnvelopeDifference', 'maximumEnvelopeDifferenceFractionOfBodyLength',
                  'surfaceDistanceMax', 'surfaceDistanceP95', 'envelopeTolerance')},
    'anchors': anchor_checks,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True,
    'rigidCarapaceNeverAnimated': True,
}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('ARCH_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('ARCH_CENTRELINE', json.dumps(CENTRELINE_SHIFT))
print('ARCH_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences')}))
print('ARCH_SHELL', json.dumps(report['rigidCarapace']))
print('ARCH_ENVELOPE', json.dumps(report['envelope']))
print('ARCH_MOUTH', json.dumps({k: report['mouth'][k] for k in
      ('method', 'cavityVertices', 'cavitySpreadY', 'hingeY', 'mouthExtentY',
       'toothPatchesStraddlingTheCut')}))
print('ARCH_SWEEP', json.dumps(limb_sweep))
print('ARCH_LIMBS', json.dumps(report['limbs']))
print('ARCH_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('ARCH_OK')
