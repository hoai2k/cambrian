"""Rebuild Mosasaurus: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. **Off the roster on purpose** -- Mosasaurus is Late Cretaceous, not Triassic, and where
it belongs is the open question in `docs/triassic/05-mesozoic-expansion.md`. It is registered in
`src/content/triassic/expansion.json` and reaches the game only as a *standing visitor*
(`src/content/triassic/guests.ts`), never through `TRIASSIC_CREATURES`.

WHICH END IS THE HEAD, and why that is the first thing this file decides. `T.measure_frame` takes
the body's long axis from the first principal component, whose **sign is arbitrary**, and the caller
supplies it. Told `head_is_positive_pca=True`, as eleven of the era's twelve builders are, this
generation comes out backwards -- and it comes out backwards *plausibly*, which is the dangerous
part. Both ends of a mosasaur are thin and deep: the snout measures 0.021 half-width against 0.115
half-depth and the caudal fluke 0.021 against 0.115 as well. Every head measurement then reads the
tail. The modelled mouth returned zero cavity vertices at every gap out to 0.16; the jaws' own fork
measured as a notch 0.055 long; the albedo's brightest line ran down the tail's pale ventral keel
and was very nearly accepted as a lip; and a render of the "head" is a perfectly convincing pair of
gaping jaws until a marker cube is put in the frame.

What settles it is **the flippers**, not the silhouette. A mosasaur's forelimb is the larger pair
and sits behind the skull: the two thin clusters reaching 0.30 from the axis are at y -0.147 to
-0.059 and the two reaching 0.19 are at +0.164 to +0.254, so the end the big pair is nearest is the
head. That is asserted below rather than assumed, and it is why this builder passes
`head_is_positive_pca=False` where Birgeria -- which decides the same question off its caudal fin --
does the same thing for a different reason.

THE MOUTH. This generation was **authored gaping**, and that is a pose rather than the animal, so
the jaw shuts in `Idle`, `Swim`, `Sprint`, the turns, `Dive` and `Rise` and opens only for `Bite`,
`Attack`, `Heavy` and `Eat`. Hybodus and Saurichthys established how to price that: measure the
rotation that brings the two lips together, pose the mandible at it, and count how far the two tooth
rows -- modelled apart, meeting for the first time -- end up inside each other. Those numbers are in
`validation.json` under `jawClosedCost`, and the README says what they cost.

The gape is measured rather than read off the albedo, because here it can be: the jaws are
geometrically apart, so a **vertical line through the head crosses the surface four times where the
mouth is open and twice where it is shut**, and the station at which that count drops from four to
two is the jaw hinge. That is a purely geometric reading of the animal's own lip contour, needing no
pigment at all, and it is the right one for a generation whose teeth are painted rather than
modelled (`T.protrusions` finds five patches on the whole head, the largest 27 vertices).

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

ID = 'mosasaurus'
NAME = 'Mosasaurus'
SPECIES = 'Mosasaurus hoffmannii'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
PREVIEW = os.path.join(HERE, ID + '.preview.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 5.0
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH
ANCHOR_TOLERANCE = .02 * BODY_LENGTH
SWALLOW_TOLERANCE = .05 * BODY_LENGTH
PUPPET_TRIANGLE_TARGET = 5800
VOXEL = .0040
THIN = .030

CLIPS = {'Idle': 3.0, 'Swim': 1.8, 'Sprint': 1.0, 'TurnLeft': 1.6, 'TurnRight': 1.6,
         'Dive': 1.4, 'Rise': 1.4, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.2, 'Hit': .6,
         'Death': 1.9, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5, 'Eat': 1.8, 'Stagger': 1.2,
         'Ability': 1.1, 'Grab': 1.1, 'Breath': 2.4, 'Growth': 1.5, 'Breathe': 3.0}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breathe']

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(RAW, NAME + ' authored body')
intake['sourceFile'] = os.path.relpath(RAW, ROOT)
intake['publishedPreviewSha256'] = hashlib.sha256(open(PREVIEW, 'rb').read()).hexdigest()
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' body pigmentation', roughness=.52)
skin_material.use_backface_culling = False    # the backstop behind the mouth lining
# See the module docstring: the sign is the animal's, checked below against the flipper pair.
frame = T.measure_frame(auth, head_is_positive_pca=False, luminance_at=luminance_at)
pigment = T.pigment_sampler(auth, sample_albedo)

# ------------------------------------------------- the stud on the belly, taken back down ----
# A human marked a box on the shipped body -- `docs/triassic/regions/mosasaurus-bump-region.json`,
# 98 vertices, "an imprecise region selection, but inside it is a bump" -- so the box says where to
# look and not what to remove. What is in it is a small conical stud standing off the ventral flank
# between the two flippers, well off the midline. It is the generation's, not the builder's: nothing
# here authors geometry. It is not anatomy either -- a mosasaur has no ventral appendage there, and
# it reads in a side render as a stray nub on an otherwise smooth belly.
#
# Measured rather than taken from the mark: against a local high-pass (each vertex against the mean
# of its two-ring, along its own normal) the body's median is 0.0031 and its 99.9th percentile
# 0.0291 in shipped units, and inside the box fifteen vertices form one connected cluster standing
# up to 0.0274 -- nine times the median. That cluster is the bump, and it is what is collapsed.
#
# **Collapsed, not cut.** `cut-region.py` deletes, which is right for detached debris and wrong for
# something welded to the body: the rim of a cut through a Tripo patch soup is a set of arcs rather
# than a loop and a fill has nothing to span. This is `smooth-region.py`'s method in the builder's
# own terms -- pin the first unmarked ring, average everything inside it until it is a soap film
# spanning that ring, then relax outward over several rings with the weight falling off, so the
# collapsed base does not read as a dish. No vertex is deleted and no topology changes.
#
# The frame is already measured at this point, so the box's coordinates convert exactly: the glTF
# exporter's +Y-up conversion is `glTF (x, y, z) = Blender (x, z, -y)`, and `tx` is a plain scale by
# SCALE, so raw = (gx, -gz, gy) / SCALE.
BUMP_CENTRE = Vector((.0357, .07955, -.08065))
BUMP_SEARCH = .045          # encloses the marked box, and nothing else on this flank
BUMP_PROUD = .0010          # raw units; the body's own median high-pass is 0.00062
BUMP_BAND, BUMP_COLLAPSE, BUMP_BAND_ITERS = 6, 3000, 120
_bw = 5e-4                                    # two patch corners this close are one point


def _weld_graph(me):
    """One graph over the patch soup. The generation arrives unstitched, so edges alone leave every
    patch an island and a Laplacian pass smooths each separately, tearing them at the seams."""
    node_of, members = {}, []
    nid = [0] * len(me.vertices)
    for i, v in enumerate(me.vertices):
        k = (round(v.co.x / _bw), round(v.co.y / _bw), round(v.co.z / _bw))
        if k not in node_of:
            node_of[k] = len(members)
            members.append([])
        nid[i] = node_of[k]
        members[nid[i]].append(i)
    adj = [set() for _ in members]
    for e in me.edges:
        a, b = nid[e.vertices[0]], nid[e.vertices[1]]
        if a != b:
            adj[a].add(b)
            adj[b].add(a)
    return nid, members, adj


_me = auth.data
_nid, _members, _adj = _weld_graph(_me)
_pos = [Vector(_me.vertices[m[0]].co) for m in _members]
_ring2 = [set(_adj[a]) for a in range(len(_members))]
for a in range(len(_members)):
    for b in list(_adj[a]):
        _ring2[a] |= _adj[b]
    _ring2[a].discard(a)
_nrm = [Vector(_me.vertices[m[0]].normal) for m in _members]
_high = []
for a in range(len(_members)):
    if not _ring2[a]:
        _high.append(0.)
        continue
    mean = Vector((0, 0, 0))
    for b in _ring2[a]:
        mean += _pos[b]
    _high.append((_pos[a] - mean / len(_ring2[a])).dot(_nrm[a]))
_near = [a for a in range(len(_members)) if (_pos[a] - BUMP_CENTRE).length < BUMP_SEARCH]
_near_set = set(_near)
assert _near, 'the marked box converted to a place with no geometry in it'
_seed = max(_near, key=lambda a: _high[a])
assert _high[_seed] > BUMP_PROUD * 3, \
    ('nothing in the marked box stands proud of the belly; the frame or the conversion is wrong',
     _high[_seed])
_bump, _stack = {_seed}, [_seed]
while _stack:
    a = _stack.pop()
    for b in _adj[a]:
        if b not in _bump and _high[b] > BUMP_PROUD and (_pos[b] - BUMP_CENTRE).length < BUMP_SEARCH:
            _bump.add(b)
            _stack.append(b)
# A bump, not a flipper: refuse to smooth anything that has walked off into the body.
_bext = [max(_pos[a][k] for a in _bump) - min(_pos[a][k] for a in _bump) for k in range(3)]
assert max(_bext) < .06, ('the proud cluster is too big to be the stud', _bext, len(_bump))

# The stud sits on a slight mound of its own, so the collapse takes the first shell with it and
# pins the second: a soap film spanning the cluster's own base ring leaves that mound standing, and
# the residual only halved. `smooth-region.py` makes the same point about a collapsed base reading
# as a bump; here the base is part of what is being taken down.
_grow = {b for a in _bump for b in _adj[a]} - _bump
_region = _bump | _grow
_shells, _seen = [], set(_region)
_front = {b for a in _region for b in _adj[a]} - _seen
for _ in range(BUMP_BAND):
    if not _front:
        break
    _shells.append(_front)
    _seen |= _front
    _front = {b for a in _front for b in _adj[a]} - _seen


def _relax(nodes, weight, iters):
    for _ in range(iters):
        new = {}
        for a in nodes:
            if not _adj[a]:
                continue
            avg = Vector((0, 0, 0))
            for b in _adj[a]:
                avg += _pos[b]
            new[a] = _pos[a] * (1 - weight(a)) + (avg / len(_adj[a])) * weight(a)
        for a, p in new.items():
            _pos[a] = p


_shell0_pre = {b for a in _region for b in _adj[a]} - _region
_sc0 = sum((_pos[a] for a in _shell0_pre), Vector((0, 0, 0))) / max(1, len(_shell0_pre))
_sn0 = sum((_nrm[a] for a in _shell0_pre), Vector((0, 0, 0)))
_sn0 = _sn0.normalized() if _sn0.length > 1e-9 else Vector((0, 0, 1))
_height_before = max((_pos[a] - _sc0).dot(_sn0) for a in _region)
_relax(_region, lambda a: 1., BUMP_COLLAPSE)
_shell_w = {}
for _i, _s in enumerate(_shells):
    for a in _s:
        _shell_w[a] = (1. - _i / max(1, len(_shells))) * .7
_relax(set(_shell_w), lambda a: _shell_w[a], BUMP_BAND_ITERS)
# The band moved the ring the film was pinned to, so the film is settled onto it again. Without
# this the collapsed region is a soap film spanning where the ring *used* to be.
_relax(_region, lambda a: 1., BUMP_COLLAPSE)
for a, p in enumerate(_pos):
    for i in _members[a]:
        _me.vertices[i].co = p
_me.update()



def _hp(a):
    if not _ring2[a]:
        return 0.
    mean = Vector((0, 0, 0))
    for b in _ring2[a]:
        mean += _pos[b]
    return (_pos[a] - mean / len(_ring2[a])).dot(_nrm[a])


_after_high = [_hp(a) for a in _region]
# How far the thing actually stood off the belly, and how far it stands off now: the distance from
# each region node to the plane the pinned shell sits in, along that plane's own normal. The
# high-pass is a curvature measure and says nothing about height; this is the height.
_shell0 = list(_shells[0]) if _shells else []
_sc = sum((_pos[a] for a in _shell0), Vector((0, 0, 0))) / max(1, len(_shell0))
_sn = sum((_nrm[a] for a in _shell0), Vector((0, 0, 0)))
_sn = _sn.normalized() if _sn.length > 1e-9 else Vector((0, 0, 1))
_height_after = max((_pos[a] - _sc).dot(_sn) for a in _region)
# The bar is the belly it sits in, not a constant: a curved surface has a high-pass of its own, and
# what "the stud is gone" means is that it is no prouder than the skin around it.
_belly = [_hp(a) for a in (_near_set - _region)] or [0.]
_belly.sort()
_belly_p95 = _belly[int(len(_belly) * .95)]
bump_report = {
    'source': 'docs/triassic/regions/mosasaurus-bump-region.json',
    'markedVerticesOnTheShippedBody': 98,
    'what': 'a small conical stud standing off the ventral flank between the flippers, in the '
            'generation and not in the builder; not anatomy, and not a fused fin -- no limb '
            'cluster reaches it and it is one connected proud patch fifteen nodes across.',
    'method': 'smooth-region.py\'s constrained Laplacian, in the builder: the first unmarked ring '
              'is pinned, the cluster inside it is averaged to a soap film spanning that ring, and '
              'six shells beyond it are relaxed with the weight falling off. Nothing is deleted.',
    'nodesCollapsed': len(_bump), 'shellsRelaxed': [len(s) for s in _shells],
    'proudBeforeRaw': round(_high[_seed], 5),
    'proudAfterRaw': round(max(_after_high), 5),
    'bellyAroundItP95Raw': round(_belly_p95, 5),
    'heightAboveTheBaseRingBeforeRaw': round(_height_before, 5),
    'heightAboveTheBaseRingAfterRaw': round(_height_after, 5),
    'bodyMedianHighPassRaw': round(float(np.median(np.abs(np.array(_high)))), 5),
    'extentRaw': [round(v, 5) for v in _bext],
    'centreRaw': [round(v, 5) for v in BUMP_CENTRE],
}
assert _height_after < _height_before * .30, ('the stud did not come down', bump_report)
print('MOSA_BUMP', json.dumps(bump_report))

raw_co = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(raw_co[:, 1].min()), float(raw_co[:, 1].max())

bvh_auth0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh_auth0))
thin_mask = thickness < THIN
cx0, cz0, _hw0, _hd0, rough_centreline = T.measured_centreline(auth, thin_mask)


def trunk_centreline(o, drop, stations=61, band=.014, smoothing=5):
    """Mystriosuchus' correction to `T.measured_centreline`: the mid-range of the 4th and 96th
    percentiles over everything neither thin nor on a limb, because a centre is the middle of a
    section and not the middle of its vertices. On this body the two readings differ much less than
    they do on a turtle -- a mosasaur is a tube -- and the difference is recorded rather than
    asserted; the corrected one is what is used, because the *paddles* are thick enough to drag a
    median and the fluke is not."""
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


# ------------------------------------------- the four paddles, as measured ----
# Six thin patches: the four paddles, the caudal fluke and the gaping jaws -- both of which are
# blade-thin here and neither of which is a limb. The fluke is separated by sitting on the axis
# (lateral 0.002 against a paddle's 0.18) and the jaws by the same test at the other end.
def find_blades(ax, az):
    blades, other = [], []
    for c in T.thin_clusters(auth, thin_mask, ax, az):
        mid = (c['yRange'][0] + c['yRange'][1]) / 2
        span = c['yRange'][1] - c['yRange'][0]
        lateral = abs(c['centroid'][0] - ax(mid))
        (blades if (span < .18 and c['reachRadius'] > .15 and lateral > .04)
         else other).append(c)
    return blades, other


blades, other = find_blades(cx0, cz0)
assert len(blades) == 4, ('four paddles did not measure on the rough axis', len(blades))
LIMB_MASK = limb_vertex_mask(auth, blades, cx0, cz0)
cx, cz, half_width, half_depth, centreline = trunk_centreline(auth, thin_mask | LIMB_MASK)
blades, other = find_blades(cx, cz)
assert len(blades) == 4, ('four paddles did not measure on the corrected axis', len(blades))
ALL_CLUSTERS = [{k: v for k, v in c.items() if k != 'indices'}
                for c in T.thin_clusters(auth, thin_mask, cx, cz)]
CENTRELINE_SHIFT = {
    'maxShiftXOverBodyLength': float(max(abs(r['cx'] - cx(r['y'])) for r in rough_centreline)),
    'maxShiftZOverBodyLength': float(max(abs(r['cz'] - cz(r['y'])) for r in rough_centreline)),
}

blades.sort(key=lambda c: (c['yRange'][0] + c['yRange'][1]) / 2)
LIMBS = {}
for i, c in enumerate(blades):
    mid = (c['yRange'][0] + c['yRange'][1]) / 2
    LIMBS[('fore' if i < 2 else 'hind') + ('L' if c['centroid'][0] < cx(mid) else 'R')] = c
assert sorted(LIMBS) == ['foreL', 'foreR', 'hindL', 'hindR'], sorted(LIMBS)
# **This is where which end is the head is decided.** A mosasaur's forelimb is the larger of the
# two pairs and sits just behind the skull, so the pair nearer -Y must also be the pair that
# reaches further. Told the wrong sign, the frame fails this -- which is what it is here for.
FORE_REACH = min(LIMBS['foreL']['reachRadius'], LIMBS['foreR']['reachRadius'])
HIND_REACH = max(LIMBS['hindL']['reachRadius'], LIMBS['hindR']['reachRadius'])
assert FORE_REACH > HIND_REACH * 1.25, \
    ('the pair nearest the head must be the larger one -- the frame is reversed',
     FORE_REACH, HIND_REACH)

depth, bvh_auth = T.depth_probe(auth)


def on_axis(y, dz=0., dx=0.):
    return Vector((cx(y) + dx, y, cz(y) + dz))


# --------------------------------------------------------------------- measure the mouth ----
# **A vertical line through an open mouth crosses the surface four times; through a shut head,
# twice.** That is the whole measurement, and on a generation authored gaping it is better evidence
# than either of the era's other two methods: it needs no pigment (these teeth are painted, not
# modelled -- `T.protrusions` finds five patches on the entire head and the largest is 27 vertices),
# and it cannot mistake a countershading boundary for a lip because it never looks at the texture.
# The station where the count drops from four to two is the jaw hinge; the middle of the gap between
# the second and third crossings is the mouth line.
def crossings(x, y, lo=-.45, hi=.45):
    out, z = [], lo
    for _ in range(24):
        hit = bvh_auth.ray_cast(Vector((x, y, z)), Vector((0, 0, 1)), hi - z + .05)
        if hit[0] is None:
            break
        z = float(hit[0].z) + 1e-4
        out.append(z)
    return out


GAPE_SCAN = []
for _y in np.arange(Y0 + .004, Y0 + .32, .004):
    y = float(_y)
    hits = crossings(cx(y), y)
    GAPE_SCAN.append({'y': round(y, 4), 'crossings': [round(v, 4) for v in hits]})
_open = [r for r in GAPE_SCAN if len(r['crossings']) >= 4]
assert len(_open) >= 20, ('the jaws do not measure as parted at all', len(_open))
HINGE_Y = float(max(r['y'] for r in _open) + .004)
MOUTH_FRONT_Y = float(Y0 + .006)
JAW_FRONT_Y = float(Y0 - .004)
HEAD_BACK = float(HINGE_Y + .080)
# The mouth line: the middle of the gap between the mandible's dorsal margin and the palate's
# ventral one, at each station the jaws are apart, smoothed and clamped.
#
# **The mouth is the LARGEST empty interval on the line, not the first one.** Six crossings turn up
# wherever the modelled tongue rises into the lumen, and there the first empty interval is the
# sliver between the mandible and the tongue -- 0.014 tall against the mouth's own 0.095. Read that
# way the seam dives into the jaw for a third of the tooth row, the hinge lands in the wrong place,
# and the oral lining built on it turns inside out when the jaw shuts and comes out through the top
# of the snout. Interior intervals are (c1,c2), (c3,c4), ...; the mouth is the widest of them.
_sy, _sz, _slow, _shigh = [], [], [], []
for r in _open:
    c = r['crossings']
    gaps = [(c[i + 1] - c[i], c[i], c[i + 1]) for i in range(1, len(c) - 1, 2)]
    if not gaps:
        continue
    _g, _lo, _hi = max(gaps)
    _sy.append(r['y'])
    _slow.append(_lo)
    _shigh.append(_hi)
    _sz.append((_lo + _hi) / 2)
_sy = np.array(_sy)
# Blurred together, so the seam stays the midpoint of the two margins the lining is built between.
_slow = T.blur1d(np.array(_slow), 1.4)
_shigh = T.blur1d(np.array(_shigh), 1.4)
_sz = (_slow + _shigh) / 2
GAPE_HEIGHT = _shigh - _slow


def seam(y):
    return float(np.interp(y, _sy, _sz))


_ramp = np.polyfit(_sy, _sz, 1)
_resid = _sz - np.polyval(_ramp, _sy)
RAMP_DEVIATION_RAW = float(np.max(np.abs(_resid)))
RAMP_DEVIATION_OVER_RADIUS = float(np.max(
    np.abs(_resid) / np.array([max(half_depth(float(y)), 1e-4) for y in _sy])))

SNOUT_CO, PROUD, PATCHES = T.protrusions(auth, y_front=HEAD_BACK, floor=.0030)

_HY = np.linspace(Y0 + .002, HINGE_Y + .060, 56)
_HW, _HD = [], []
for _y in _HY:
    _m = np.abs(raw_co[:, 1] - _y) < .006
    if _m.sum() < 6:
        _HW.append(_HW[-1] if _HW else .002)
        _HD.append(_HD[-1] if _HD else .002)
        continue
    _q = raw_co[_m]
    _HW.append(float(np.quantile(np.abs(_q[:, 0] - cx(_y)), .92)))
    _HD.append(float(np.quantile(np.abs(_q[:, 2] - cz(_y)), .92)))
_HW, _HD = np.array(_HW), np.array(_HD)


def head_half_width(y):
    return float(np.interp(y, _HY, _HW))


def head_half_depth(y):
    return float(np.interp(y, _HY, _HD))


# **The mouth's own measured section.** The generation models its oral cavity -- a tongue at
# z 0.003 to 0.023 and a palate above it -- so the section is taken from the cavity the cast finds
# rather than from a ray fired at the closed slit of a solid head. `T.mouth_cavity` returns 159
# vertices at a 0.03 gap and 494 at 0.16; the 0.06 reading is used, which is wide enough to pair
# the palate with the floor and narrow enough not to cross the whole head.
_CAV_ALL = T.mouth_cavity(auth, front_fraction=(HEAD_BACK - Y0) / (Y1 - Y0), gap=.060)
# **A cast over the front quarter of a body finds more than a mouth**, and on a generation whose
# forelimbs sit just behind the skull what it mostly finds is the gap between a paddle and the
# flank: the raw cast reaches x +/-0.24 where the head is 0.03 to 0.08 across. Sized on that, the
# oral lining came out as wide as the animal's head and hung out of its mouth as a pink slab. So
# the cast is kept only where it can be a mouth -- inside the head's own section, in front of the
# hinge -- and the section the lining is actually built on is the **measured gape**: the height
# between the mandible's dorsal margin and the palate's ventral one, which the crossing scan
# already has and which needs no cast at all.
_keep = np.array([abs(float(p[0]) - cx(float(p[1]))) < head_half_width(float(p[1])) * 1.2
                  and float(p[1]) < HINGE_Y + .02 for p in _CAV_ALL]) if len(_CAV_ALL) else None
CAV = _CAV_ALL[_keep] if _keep is not None and _keep.any() else _CAV_ALL
assert len(CAV) >= 40, ('the modelled oral cavity did not measure inside the head', len(CAV))
CAV_SPREAD = float(CAV[:, 1].max() - CAV[:, 1].min())
_GAPE_H = (_shigh - _slow) / 2


def gape_half_height(y):
    """Half the measured distance between the two lips: the mouth's own section, in height."""
    return float(np.interp(y, _sy, _GAPE_H))


# --------------------------------------------------------------------------------- rig ----
def tx(p):
    return Vector((p[0] * SCALE, p[1] * SCALE, p[2] * SCALE))


B = {}


def bone(n, p, parent):
    B[n] = (Vector(p), parent)


NECK_Y = [HINGE_Y + .060, HINGE_Y + .110]       # seven cervicals, and a short neck
CHEST_Y, BODY_Y = -.100, .035
TAIL_Y = [.150, .250, .350, .440, .520]
bone('root', (0, 0, 0), None)
bone('body', on_axis(BODY_Y), 'root')
bone('chest', on_axis(CHEST_Y), 'body')
for i, y in enumerate(NECK_Y):
    bone('neck_%02d' % i, on_axis(y), 'chest' if i == 0 else 'neck_%02d' % (i - 1))
bone('skull', on_axis(HINGE_Y - .010), 'neck_00')
bone('jaw', (cx(HINGE_Y), HINGE_Y, seam(HINGE_Y)), 'skull')
for i, y in enumerate(TAIL_Y):
    bone('tail_%02d' % i, on_axis(y), 'body' if i == 0 else 'tail_%02d' % (i - 1))

LIMB_NAMES, LIMB_PTS, LIMB_SEATING = {}, {}, {}
for key, c in LIMBS.items():
    kind, s = key[:-1], key[-1]
    root = T.seat(Vector(c['seat']), on_axis(c['seat'][1]), depth, margin=.016)
    reach = Vector(c['reach'])
    names = ['%s_upper_%s' % (kind, s), '%s_mid_%s' % (kind, s), '%s_tip_%s' % (kind, s)]
    pts = [root, root + (reach - root) * .38, root + (reach - root) * .70, reach]
    LIMB_NAMES[key] = names
    LIMB_PTS[key] = pts
    LIMB_SEATING[names[0]] = depth(root)
    parent = 'chest' if kind == 'fore' else 'body'
    for i, n in enumerate(names):
        bone(n, pts[i], parent if i == 0 else names[i - 1])
for n, d in LIMB_SEATING.items():
    assert d > .010, ('a paddle root is not seated inside the trunk', n, d)
JAW_SEATING = depth(B['jaw'][0])

# **The resting gape, and the rotation that shuts it.** Hybodus' measurement: the mandible is a bar
# from the hinge to its own tip, and closing the mouth is the rotation that carries that tip onto
# the palate's ventral margin at the same station. Both are read off the crossing scan, so neither
# is a guess.
_front = _open[0]['crossings'] if _open else None
_tip_y = float(_sy.min())
_tip_z = float(_slow[0])                      # the mandible's dorsal margin at the snout
_pal_z = float(_shigh[0])                     # the palate's ventral margin at the same station
_hx, _hy, _hz = cx(HINGE_Y), HINGE_Y, seam(HINGE_Y)
# Both directions point forward (-Y), so their `atan2` angles sit either side of +/-pi and a bare
# difference comes out at 5.70 rad rather than -0.59. Wrapped into (-pi, pi] it is the rotation the
# jaw bone actually needs, and its sign is already the right one: this rig's bones rest along +Y,
# so a positive rotation about X lifts the bone's tail and drops the front of the jaw -- opening.
_a = math.atan2(_tip_z - _hz, _tip_y - _hy)
_b = math.atan2(_pal_z - _hz, _tip_y - _hy)
CLOSING_RADIANS = float((_b - _a + math.pi) % (2 * math.pi) - math.pi)
RESTING_GAPE = {
    'method': 'four surface crossings mean the jaws are apart, two mean they are shut; the hinge '
              'is the station the count drops, and the closing rotation carries the mandible\'s '
              'dorsal margin at the snout onto the palate\'s ventral margin at the same station',
    'hingeY': HINGE_Y, 'hingeZ': _hz,
    'mandibleDorsalMarginAtSnout': _tip_z, 'palateVentralMarginAtSnout': _pal_z,
    'closingRotationDegrees': round(abs(math.degrees(CLOSING_RADIANS)), 2),
    'closingRotationRadians': round(CLOSING_RADIANS, 4),
    'gapeHeightAtSnoutOverBodyLength': float(GAPE_HEIGHT[0]),
    'stationsMeasuredOpen': len(_open),
    'gapeLengthOverBodyLength': float(_sy.max() - _sy.min()),
    'verdict': 'the generation arrived GAPING: the bind pose carries that gape, so every clip that '
               'is not a strike has to close it, and the pose the animal spends most of its time '
               'in is therefore its most deformed one. See jawClosedCost for what that costs.',
}
assert -1.4 < CLOSING_RADIANS < -.25, ('the measured closing rotation is not credible',
                                       CLOSING_RADIANS)
JAW_SHUT = CLOSING_RADIANS

# ------------------------------------------------------------ skinning by arc length ----
AXIAL_NAMES = ['skull'] + ['neck_%02d' % i for i in range(len(NECK_Y))] \
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
# The radius inside which a vertex is wholly the paddle's, at the percentile Archelon's hydrofoil
# needed: the whole blade is the limb's and the blend band lies on the trunk, where the along-limb
# ramp already holds it down.
LIMB_PERCENTILE = .99
LIMB_RADIUS = {}
for key, c in LIMBS.items():
    P, cum, _n, _r = LIMB_FIT[key]
    d = [T.project(P, cum, Vector(raw_co[i]))[0] for i in c['indices']]
    rin = float(np.quantile(d, LIMB_PERCENTILE))
    LIMB_RADIUS[key] = (rin, rin + .050)
# **A fraction of the limb's own length, never a constant.** These paddles are half the length of
# Archelon's forelimb, so a blend copied across as a number would overrun the four-influence budget
# on them and the relaxation would then trim a different four on their neighbours.
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


# The throat follows the jaw: the mandible is rigid on `jaw` and the skin behind the hinge on the
# axial chain, and with nothing blending between them a wide gape separates the two.
# **Wide, and reaching well down the throat.** The mandible's rear rim is a cut plane at the hinge
# and swings up 33 degrees the moment the jaw shuts, so the skin behind it has to come with it or
# a slit opens down the cheek -- 40 magenta pixels of one, in Idle and Eat and nowhere else, which
# is the tell that it is the shut pose rather than the gape that opens it.
THROAT_SPAN = .080
THROAT_DROP = .40


def throat_jaw_share(q):
    a = T.smooth((q.y - (HINGE_Y - .022)) / .022)
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
        [B[n][0] for n in ['skull'] + ['neck_%02d' % i for i in range(len(NECK_Y))] + ['chest']],
        _section_radius),
    'tail': T.curvature_over_section(
        [B[n][0] for n in AXIAL_NAMES if n.startswith('tail_')], _section_radius),
}
LIMB_ASYMMETRY = T.limb_asymmetry(LIMB_PTS, cx, 1.)

# ------------------------------------------------------------------ procedural twin ----
puppet, puppet_thickness, twin_report, bvh_src = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', VOXEL, PUPPET_TRIANGLE_TARGET,
    sample_albedo, thin=THIN, band=.020, roughness=.56, blade_dilation=.0032)


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
    relaxed = T.relax_weights(o, raw_weights, passes=5, hold=.45)
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
# Double-sided, as Rhaeticosaurus' is. The generation already models a cavity, so this sac's job is
# the **back** of the mouth: at the throat the modelled cavity closes, the cut passes through real
# geometry and leaves a rim on each half, and that rim is what parts when the jaw swings.
mouth_mat = T.inward_material(NAME + ' mouth interior', (.44, .21, .21, 1))
mouth_mat.use_backface_culling = False
MOUTH_BACK = HINGE_Y + .022
# **The lining ends where the gape does, not at the snout tip.** Run forward to Y0 the last rings
# are built past the frontmost station the crossing scan ever measured open, on a clamped section
# that belongs to a station further back, and inside a snout tip that is narrower than the section
# it is given -- so when the jaw shuts they rotate up and out through the top of the nose.
MOUTH_FRONT = float(_sy.min() + .034)


def _raw_section(y):
    """The lining's section: a little **outside** the measured gape in the mouth, and a throat
    behind the hinge.

    **The floor has to sit inside the mandible, not above it, and on a body authored gaping that is
    the whole difference between a mouth and a disaster.** Sized at 0.57 of the measured gape the
    floor sat 0.023 above the mandible's own dorsal margin; both rotate by the same angle about the
    same hinge when the jaw shuts, so the floor stayed 0.023 above the mandible all the way round --
    and since the closing rotation is defined as the one that carries the mandible's margin onto the
    palate's, that put the lining's floor 0.023 *through* the palate and out of the top of the
    snout, as a pink slab the length of the head. At 1.06 of the measured gape the floor starts
    just inside the jaw's flesh and finishes just inside the skull's, which is what lining a mouth
    means.
    """
    e = T.smooth((MOUTH_BACK - y) / .014) * T.smooth((y - MOUTH_FRONT) / .020)
    # Behind the hinge there is no gape to measure and the sac is a throat: a narrower tube on the
    # head's own section, which is what has to be bridged when the mandible's rear rim swings.
    throat = T.smooth((y - (HINGE_Y - .012)) / .030)
    room = min(cz(y) + head_half_depth(y) - seam(y), seam(y) - (cz(y) - head_half_depth(y)))
    w = max(head_half_width(y) * (.56 - .18 * throat), .0020) * (.96 + .04 * e)
    h = (1 - throat) * gape_half_height(y) + throat * head_half_depth(y) * .28
    # Tapered hard at both ends: the last ring of a tube is its cap, and a cap the full height of
    # the local gape is a lid standing across the mouth rather than the end of a sac.
    h = max(min(h, max(room, .004) * .92), .0035) * (.34 + .66 * e)
    return w, h


def lining_axis(y):
    """The tube's own centre, a little **below** the mouth line.

    `T.lining` builds a section symmetric about whatever axis it is given, and a symmetric tube on
    the seam puts its floor exactly on the mandible's dorsal margin and its roof exactly on the
    palate's ventral one -- so both are level with a surface rather than inside one, and the floor
    comes through the palate as soon as the closing rotation overshoots anywhere. Dropped by a
    fourteenth of the local gape the floor starts inside the jaw's flesh and the roof finishes
    inside the skull's, which is the same trick `fit` performs per vertex on a body whose mouth is
    painted rather than modelled."""
    return seam(y) - .07 * gape_half_height(y)


LINING_FIT = {}
LINING_POWER = 2.6


def mouth_section(y):
    w, h = _raw_section(y)
    LINING_FIT[round(float(y), 5)] = [round(w, 5), round(h, 5)]
    return w, h


_room_cache = {}


def mouth_room(_y):
    k = round(_y, 5)
    if k not in _room_cache:
        axis = lining_axis(_y)
        _room_cache[k] = T.mouth_room(
            bvh_auth, Vector((cx(_y), _y, axis)), Vector((1, 0, 0)), Vector((0, 0, 1)),
            limit=.20, fallback=.02,
            cap=(head_half_width(_y),
                 max(.002, head_half_depth(_y) - (axis - cz(_y))),
                 max(.002, head_half_depth(_y) + (axis - cz(_y)))))
    return _room_cache[k]


lining, lining_raw = T.lining('Oral cavity lining', rig, tx, lining_axis, mouth_section,
                              MOUTH_BACK, MOUTH_FRONT, (lambda _p: 0.), mouth_mat,
                              rings=30, ring=24, centre_x=cx, power=LINING_POWER, fit=None,
                              room=mouth_room)
oralparts = [lining]
_jaw_group = lining.vertex_groups['jaw'].index
lining_jaw = [round(next((g.weight for g in v.groups if g.group == _jaw_group), 0.), 3)
              for v in lining.data.vertices]

mouth_cover = []
for _y in np.linspace(MOUTH_FRONT + .006, MOUTH_BACK - .006, 14):
    y = float(_y)
    w, h = mouth_section(y)
    mouth_cover.append([round(y, 4), round(w / max(head_half_width(y), 1e-9), 3),
                        round(h / max(gape_half_height(y), 1e-9), 3)])
    assert h >= .0012, ('the oral lining is flat', y, h)

# The jaw hinge tissue, straddling the cut plane at the corner of the mouth. Sized off the head's
# own fine profile; `depth()` is recorded rather than asserted beside a modelled cavity, because
# there `find_nearest` returns the cavity's own wall and reports its normal's sign, not the skull's.
hinge_mat = T.vertex_colour_material(NAME + ' jaw hinge body', roughness=.56)
HINGE_CENTRE = (cx(HINGE_Y), HINGE_Y + .006, cz(HINGE_Y))
HINGE_R = (head_half_width(HINGE_Y) * .94, .058, head_half_depth(HINGE_Y) * .80)
HINGE_FIT = .80
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
               'minimumProbeDepthAtEachSize': HINGE_TRACE}
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
    assert out_w < .008 and out_d < .008, ('mouth geometry stands outside the head\'s own section',
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
# **On the jaws, not in the gap between them.** The seam here runs down the middle of an open
# mouth, so an anchor placed on it at the snout sits in mid air: measured, `anchor_mouth` came out
# 0.19 units from any surface against a 0.10 tolerance. The two lip margins the gape scan already
# measured are where these belong -- the mandible's dorsal margin for the mouth anchor and the
# palate's ventral one for the strike.
SNOUT_Y = float(_sy.min() + .004)
_MAND_TOP = float(np.interp(SNOUT_Y, _sy, _slow))
_PAL_BOT = float(np.interp(SNOUT_Y, _sy, _shigh))
_THROAT_Y = float(HINGE_Y + .014)
ANCHOR_POINTS = {
    'anchor_mouth': ('jaw', (cx(SNOUT_Y), SNOUT_Y, _MAND_TOP - .006), 'mouth'),
    'anchor_mouth_inside': ('skull', (cx(_THROAT_Y), _THROAT_Y, seam(HINGE_Y)), 'swallow'),
    # **The blow this animal lands is a bite**, and a mosasaur's whole skull is the weapon: it does
    # not strike with a neck (it has seven short cervicals), a tail or an arm. The skull is the bone
    # that delivers it.
    'anchor_attack_primary': ('skull', (cx(SNOUT_Y), SNOUT_Y - .004, _PAL_BOT + .006), 'attack'),
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


# **A tail swimmer with four steering hydrofoils.** Mosasaurus hoffmannii carried a lunate fluke and
# swam carangiform: the thrust is a travelling wave that grows towards the tail, and the paddles are
# control surfaces rather than oars. That is the opposite reading from Archelon's, and it is why the
# era's "a limbed swimmer's dash has to paddle" rule is answered here by a *measured* swept angle at
# each paddle root rather than by making the paddles row -- a mosasaur that rowed would be wrong.
AXIAL_CHAIN = ['neck_01', 'neck_00', 'chest', 'body'] \
    + ['tail_%02d' % i for i in range(len(TAIL_Y))]
GAIN = [.14, .10, .06, .10, .26, .44, .66, .88, 1.00]
LAG = [0., .18, .40, .70, 1.05, 1.40, 1.75, 2.10, 2.45]
SIDE = {k: (1. if k.endswith('R') else -1.) for k in LIMB_NAMES}


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

        amp = {'Idle': .22, 'Swim': 1.0, 'Sprint': 1.55, 'Eat': .26, 'Guard': .18, 'Grab': .24,
               'Breath': .30, 'Breathe': .24, 'Growth': .22, 'Dodge': 1.20,
               'Ability': .55}.get(clip, .26)
        beat = {'Swim': 2., 'Sprint': 2., 'Dodge': 2.}.get(clip, 1.)

        def wave(i, f_=1.):
            return (sin(p * f_ - LAG[i]) - (0. if loop else sin(-LAG[i]))) * env

        cock = spike(u, .00, .40, 1.4) if clip in ('Attack', 'Heavy') else 0.
        _release = (.78, 1.) if clip == 'Heavy' else (.60, 1.)
        drive = (ramp(u, .28, .44, 2.2) * (1 - ramp(u, _release[0], _release[1], 1.))
                 if clip in ('Attack', 'Heavy') else 0.)
        snap = spike(u, .34, .58, 2.6) if clip in ('Attack', 'Heavy') else 0.
        # `Ability` is the ram: a C-start coil and one straight charge, which is what a body this
        # shape does to close on prey.
        load = ramp(u, .02, .24, 1.6) * (1 - ramp(u, .26, .36, 2.0)) if clip == 'Ability' else 0.
        power = ramp(u, .28, .46, 2.2) * (1 - ramp(u, .60, .96, 1.)) if clip == 'Ability' else 0.
        dead = ramp(u, 0., 1., 1.) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        haul = max(0., sin(p * 3)) ** 2 if clip == 'Grab' else 0.
        # **The ratchet.** Mosasaurs carried a second tooth row on the pterygoids and worked prey
        # back with it rather than chewing, so `Eat` is a sequence of grabs: the jaws open, the head
        # drives forward over the carcass, and the jaws close and draw it back. Three cycles.
        ratchet = max(0., sin(p * 3))
        if clip == 'Death':
            amp *= 1 - dead

        # --- the jaws. **The generation was authored gaping**, so every clip starts from `JAW_SHUT`
        # and releases it only as far as the clip actually opens: the gape at the peak is the gape
        # that was authored, not that gape minus the parting.
        opening = .010 * (1 - cos(p)) if loop else 0.
        if clip == 'Bite':
            opening = .46 * ramp(u, .03, .18, 1.8) * (1 - ramp(u, .24, .40, 2.4))
        elif clip == 'Attack':
            opening = .18 * cock + .42 * ramp(u, .20, .42, 1.6) * (1 - ramp(u, .46, .64, 1.4))
        elif clip == 'Heavy':
            opening = .20 * cock + .50 * ramp(u, .22, .44, 1.7) * (1 - ramp(u, .48, .66, 1.4))
        elif clip == 'Ability':
            opening = .14 * load
        elif clip == 'Grab':
            opening = .20 + .06 * haul
        elif clip == 'Eat':
            opening = .34 * ratchet + .05
        elif clip == 'Breath':
            opening = .20 * spike(u, .30, .70, 1.)
        elif clip == 'Breathe':
            opening = .08 * (1 - cos(p))
        elif clip in ('Hit', 'Stagger'):
            opening = .34 * e
        elif clip == 'Death':
            opening = .30 * dead
        elif clip == 'Guard':
            opening = .04 * (1 - cos(p))
        opening = max(0., opening)
        # **The bind pose is already a 33-degree gape**, so a clip's own opening is what it adds
        # on top of that: 0.86 rad of Bite made an 82-degree mouth and the lining, correctly
        # following it, read as a pouch wider than the jaw. Half that is still a wider bite than
        # anything else in the era.
        _o = min(1., opening / .40)
        gape = JAW_SHUT * (1 - _o) + opening
        pb['jaw'].rotation_euler.x = gape
        pb['skull'].rotation_euler.x = -.10 * opening
        gape_trace.setdefault(clip, []).append(round(gape, 5))

        # --- the axial wave. This is the animal.
        for i, n in enumerate(AXIAL_CHAIN):
            q = pb[n]
            z = .16 * GAIN[i] * amp * wave(i, beat)
            z += turn * (.020 + .012 * i)
            z += .050 * dead * sin(i * .8)
            if clip in ('Attack', 'Heavy'):
                z += .10 * cock * (1 if i % 2 == 0 else -.5) - .06 * drive
            if clip == 'Ability':
                # The C-start: the whole body coils to one side and unrolls through it.
                z += (.34 * load - .26 * power) * (i + 1) / len(AXIAL_CHAIN)
            if clip == 'Dodge':
                z += .20 * e * sin(i * .55 + .6)
            if clip == 'Grab':
                z += .08 * GAIN[i] * haul * (1 if i > 4 else -.5)
            q.rotation_euler.z += z
            if clip in ('Dive', 'Rise'):
                q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .07 * e * (1 - GAIN[i] * .5)
            if clip in ('Breath', 'Breathe') and n in ('neck_00', 'neck_01'):
                q.rotation_euler.x = -.18 * (e if clip == 'Breath' else .5 + .5 * sin(p))

        body = pb['body']
        body.rotation_euler.y += .10 * turn
        if clip in ('Dive', 'Rise'):
            body.rotation_euler.x += (1 if clip == 'Dive' else -1) * .30 * e
        if clip in ('Attack', 'Heavy'):
            # **Heavy commits the whole animal.** Built from the same shapes and numbers as Attack
            # the two measured an identical 0.58 of snout reach, which is two names for one clip; a
            # mosasaur's heavy attack is the same bite carried in further and held longer, so the
            # lunge is deeper and the release later rather than the gape being wider still.
            _commit = 1.34 if clip == 'Heavy' else 1.
            body.location.y = .12 * cock - .52 * drive * _commit
            body.rotation_euler.x = .08 * cock - .10 * drive
        if clip == 'Ability':
            body.location.y = .14 * load - 1.30 * power
            body.rotation_euler.y = .34 * load - .18 * power
        if clip == 'Bite':
            body.location.y = -.20 * ramp(u, .05, .24, 2.4) * (1 - ramp(u, .42, .78, 1.))
        if clip == 'Eat':
            # forward over the carcass on the open jaw, back as it shuts: the ratchet, in travel.
            body.location.y = -.10 * ratchet
        if clip == 'Parry':
            body.rotation_euler.y = -.30 * e
            body.rotation_euler.z = .18 * e
        if clip == 'Guard':
            body.rotation_euler.x = .035 * (1 - cos(p))
        if clip == 'Dodge':
            body.rotation_euler.y = .55 * e
            body.location.x = .36 * e
        if clip in ('Hit', 'Stagger'):
            body.rotation_euler.z += .16 * e * sin(p * (1 if clip == 'Hit' else 2))
            body.rotation_euler.y = .24 * e
            body.location.y = .12 * e
        if clip in ('Breath', 'Breathe'):
            body.rotation_euler.x += -.22 * (e if clip == 'Breath' else .5 + .5 * sin(p))
            body.location.z += .09 * (e if clip == 'Breath' else 1.) * .5
        if clip == 'Grab':
            body.location.y = -.10 - .08 * haul
        if clip == 'Growth':
            body.rotation_euler.x = -.05 * e
            body.rotation_euler.z = .06 * e
        # A body this long rolls a little into each beat: the tell that the tail is doing the work.
        body.rotation_euler.y += .035 * amp * sin(p * beat - .6) * (1 if clip in ('Swim', 'Sprint', 'Idle') else 0)
        body.rotation_euler.y += 2.4 * dead
        body.rotation_euler.x += .16 * dead
        body.location.z -= .24 * dead
        if clip in ('Attack', 'Heavy'):
            pb['skull'].rotation_euler.x += -.14 * cock + .22 * drive
            for n in ('neck_00', 'neck_01'):
                pb[n].rotation_euler.x += -.08 * cock + .12 * drive
        if clip == 'Eat':
            pb['skull'].rotation_euler.z += .10 * sin(p * 3)
            pb['neck_00'].rotation_euler.x += -.12 * ratchet

        # --- the paddles. Control surfaces: they bank, brake and steer, and they do not row.
        for key, names in LIMB_NAMES.items():
            s = SIDE[key]
            kind = key[:-1]
            up = pb[names[0]]
            ph = p * beat - (0. if kind == 'fore' else 1.1)
            sweep = {'Sprint': .44, 'Swim': .34, 'Idle': .16,
                     'Breathe': .18, 'Eat': .18, 'Guard': .18, 'Grab': .18}.get(clip, .20)
            gainf = 1.0 if kind == 'fore' else .78
            # A slow figure of eight that keeps the blade at a working angle of attack through the
            # body's roll, rather than a stroke.
            up.rotation_euler.y = s * sweep * sin(ph) * gainf
            up.rotation_euler.z = s * .34 * sweep * cos(ph) * gainf
            up.rotation_euler.x = -.40 * sweep * cos(ph) * gainf
            if clip == 'Ability':
                # Both pairs sweep back and hold: the paddles are folded in for the charge.
                up.rotation_euler.y = s * (.30 * load - .20 * power) * gainf
                up.rotation_euler.z = s * (.40 * load + .50 * power) * gainf
            if clip in ('Dive', 'Rise'):
                up.rotation_euler.x += (1 if clip == 'Dive' else -1) * .60 * e
            if clip in ('TurnLeft', 'TurnRight'):
                # One side brakes and the other sweeps back: how a hydrofoil pair turns a long body.
                d = s * (-1 if clip == 'TurnLeft' else 1)
                up.rotation_euler.z += d * .96 * e / gainf
                up.rotation_euler.x += d * .58 * e / gainf
            if clip in ('Attack', 'Heavy'):
                up.rotation_euler.z += s * (.30 * cock - .44 * drive) * gainf
                up.rotation_euler.x += .12 * snap
            if clip == 'Guard':
                up.rotation_euler.z += s * .30 * (1 - cos(p)) / 2
            if clip == 'Parry':
                up.rotation_euler.z += s * .40 * e
            if clip == 'Dodge':
                up.rotation_euler.z += s * .62 * e
            if clip in ('Hit', 'Stagger'):
                up.rotation_euler.y += s * .34 * e * sin(p)
            if clip in ('Breath', 'Breathe'):
                up.rotation_euler.y += s * .20 * (e if clip == 'Breath' else .6 + .4 * sin(p))
            if clip == 'Grab':
                up.rotation_euler.z += s * .28 + s * .10 * haul
            if clip == 'Growth':
                up.rotation_euler.z += s * .24 * e
            up.rotation_euler.y += s * .40 * dead
            up.rotation_euler.x += .30 * dead
            lag = sin(ph - .8)
            for j, share, feather, lagshare in ((1, .16, .50, .12), (2, .10, .32, .16)):
                pb[names[j]].rotation_euler.y = share * up.rotation_euler.y \
                    + s * lagshare * sweep * lag
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

# --- the swept angle at each paddle root, measured from the limb's own direction. The era's rule
# asks a limbed swimmer's dash to use its limbs; a mosasaur's dash is a tail beat, so what is
# recorded here is that the paddles are *working* -- banking and steering through a real arc --
# rather than that they row.
limb_sweep = {}
for clip in ('Swim', 'Sprint', 'TurnLeft', 'Ability'):
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
    assert limb_sweep['Sprint'][names[0]] > 25., \
        ('a paddle does nothing in Sprint', names[0], limb_sweep['Sprint'][names[0]])
    assert limb_sweep['TurnLeft'][names[0]] > 35., \
        ('a paddle does not steer the turn', names[0], limb_sweep['TurnLeft'][names[0]])

# ------------------------------------- what closing the generation's gape costs ----
# Teeth modelled apart interpenetrate the first time they are brought together, and the honest
# thing is to measure it rather than to leave the jaw where the generation left it.
reset()
rig.pose.bones['jaw'].rotation_euler.x = JAW_SHUT
bpy.context.view_layer.update()
_dg = bpy.context.evaluated_depsgraph_get()
_skull_eval = auth.evaluated_get(_dg)
_skull_mesh = _skull_eval.to_mesh()
_skull_bvh = BVHTree.FromPolygons([v.co.copy() for v in _skull_mesh.vertices],
                                  [pp.vertices[:] for pp in _skull_mesh.polygons],
                                  all_triangles=False)
_skull_eval.to_mesh_clear()
_jaw_eval = parts['lower jaw'][auth.name].evaluated_get(_dg)
_jaw_mesh = _jaw_eval.to_mesh()
_pen = []
for v in _jaw_mesh.vertices:
    loc, nor, idx, dist = _skull_bvh.find_nearest(v.co)
    if loc is None:
        continue
    _pen.append(dist if (Vector(v.co[:]) - loc).dot(nor) < 0 else 0.)
# **And the same measurement again without a normal, because the first one over-reports.** A
# `find_nearest` sign test beside a modelled oral cavity answers about the cavity's own wall, so a
# mandible vertex that is correctly inside the *mouth* -- which is where a mouth floor belongs --
# counts as inside the skull. What actually matters is whether the shut jaw pushes out through the
# head's outer surface, and the head's own measured section answers that with no normals at all.
_out = []
for v in _jaw_mesh.vertices if False else []:
    pass
_jaw_eval2 = parts['lower jaw'][auth.name].evaluated_get(_dg)
_jm = _jaw_eval2.to_mesh()
for v in _jm.vertices:
    q = Vector(v.co[:]) / SCALE
    _out.append(max(abs(q.x - cx(q.y)) - head_half_width(q.y),
                    abs(q.z - cz(q.y)) - head_half_depth(q.y)))
_jaw_eval2.to_mesh_clear()
_jaw_eval.to_mesh_clear()
reset()
scene.frame_set(0)
bpy.context.view_layer.update()
jaw_closed_cost = {
    'closingRotationDegrees': RESTING_GAPE['closingRotationDegrees'],
    'mandibleVerticesMeasured': len(_pen),
    'verticesInsideTheSkullSurface': int(sum(1 for d in _pen if d > 1e-4)),
    'fractionOfMandibleInsideTheSkull': (float(sum(1 for d in _pen if d > 1e-4)) / max(1, len(_pen))),
    'maxPenetrationUnits': round(float(max(_pen)) if _pen else 0., 5),
    'maxPenetrationOverBodyLength': round((float(max(_pen)) if _pen else 0.) / BODY_LENGTH, 5),
    'meanPenetrationOverBodyLength': round((float(np.mean(_pen)) if _pen else 0.) / BODY_LENGTH, 6),
    'verticesOutsideTheHeadSection': int(sum(1 for d in _out if d > 0)),
    'maxOutsideTheHeadSectionUnits': round(float(max(_out)) * SCALE if _out else 0., 5),
    'maxOutsideTheHeadSectionOverBodyLength':
        round((float(max(_out)) * SCALE if _out else 0.) / BODY_LENGTH, 5),
    'note': 'the mandible posed at the measured closing rotation. The first figures are against '
            'the skull\'s own surface with a normal sign test, which beside a modelled oral cavity '
            'counts a mouth floor correctly inside the mouth as inside the skull -- so they are an '
            'upper bound. The `OutsideTheHeadSection` figures use no normals and are what the '
            'question actually is: how far the shut jaw pushes out through the head\'s own '
            'measured section. Anything above zero in the first set is also the generation\'s two '
            'tooth rows, modelled apart, meeting for the first time.',
}

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
    'id': ID, 'name': NAME, 'species': SPECIES,
    'provenance': 'Late Cretaceous · Maastricht',
    'offRoster': True,
    'description': 'A marine lizard with a lunate tail and a second row of teeth in its palate: '
                   'the last of the Cretaceous sea\'s top predators. Authored Tripo body and '
                   'measured procedural volume twin share one armature, one set of inverse binds, '
                   'one set of sockets and one set of actions.',
    'modelLength': BODY_LENGTH, 'lengthMeters': 13.0, 'locomotion': 'Swim',
    'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
    'puppet': ID + '.puppet.glb',
    'sources': ['tools/triassic/creatures/mosasaurus/tripo-raw/mosasaurus.raw.glb',
                'tools/triassic/creatures/mosasaurus/tripo-raw/input.png'],
    'notes': [
        'Off the roster on purpose: Mosasaurus is Late Cretaceous, not Triassic, and is registered '
        'in src/content/triassic/expansion.json rather than in TRIASSIC_CREATURES. It reaches the '
        'game as a standing visitor and is in no sea and no population table.',
        'Which end is the head is decided by the flippers, not the silhouette: both ends of this '
        'generation are thin and deep, and the shared frame\'s default sign puts the head at the '
        'tail. The pair of paddles nearest the head must also be the larger pair, which the build '
        'asserts.',
        'The generation was authored GAPING. That is a pose, not the animal: the jaw is shut in '
        'Idle, Swim, Sprint, the turns, Dive and Rise and opens only for Bite, Attack, Heavy and '
        'Eat. What closing it costs is measured in validation.json under jawClosedCost.',
        'The mouth line is read geometrically and needs no pigment at all: a vertical line through '
        'an open mouth crosses the surface four times and through a shut head twice, so the hinge '
        'is the station that count drops and the seam is the middle of the gap. On this body the '
        'teeth are painted rather than modelled, so a protrusion pass would not have found them.',
        'A tail swimmer, not a rower: the thrust is a travelling wave growing towards a lunate '
        'fluke, and the four paddles are control surfaces. Their swept angle is recorded per clip '
        'and the build refuses a paddle that does not steer the turn.',
        'Eat is a ratchet rather than a chew: mosasaurs carried a second tooth row on the '
        'pterygoids and worked prey back with it, so the clip opens, drives the head forward over '
        'the carcass and draws it back, three times.',
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
    'frameNote': 'head_is_positive_pca=False. Both ends of this body are thin and deep, so the '
                 'principal component\'s arbitrary sign cannot be read off the silhouette; the '
                 'larger pair of paddles is nearest the head and that is what decides it.',
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
    'foreReachRadius': FORE_REACH, 'hindReachRadius': HIND_REACH,
    'authoredTriangles': authored_tris, 'twinTriangles': puppet_tris,
    'twinTriangleFraction': puppet_tris / authored_tris,
    **twin_report,
    'bones': len(B), 'boneNames': list(B),
    'poseDeviation': POSE_DEVIATION, 'limbAsymmetry': LIMB_ASYMMETRY,
    'limbSweepDegrees': limb_sweep,
    'limbSweepMethod': 'the largest angle between any two directions the limb points over the '
                       'cycle, taken from the root joint to the tip joint in world space',
    'gapeMaximaRadians': {c: max(v) for c, v in gape_trace.items()},
    'gapeMinimaRadians': {c: min(v) for c, v in gape_trace.items()},
    'restingGape': RESTING_GAPE, 'jawClosedCost': jaw_closed_cost,
    'mouthCutDeviation': {
        'aStraightCutWouldHaveDeviatedRaw': RAMP_DEVIATION_RAW,
        'aStraightCutWouldHaveDeviatedOverLocalRadius': RAMP_DEVIATION_OVER_RADIUS},
    'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
    'weights': weight_report, 'maxInfluences': max(influences),
    'meanInfluences': float(np.mean(influences)),
    'mouth': {
        'method': 'geometric: four surface crossings on a vertical line mean the jaws are apart '
                  'and two mean they are shut, so the hinge is the station the count drops and the '
                  'mouth line is the middle of the gap. No pigment is read at all.',
        'note': 'the albedo methods were tried and are unusable on this body: the darkest-row walk '
                'returns the dark dorsal surface at nearly every station, and the same matched '
                'filter fed inverted luminance -- looking for the painted tooth row as a bright '
                'line -- follows the pale ventral countershading instead, which is Keichousaurus\' '
                'trap in reverse. A render with the fitted line drawn on the head is what settled '
                'it; see the README.',
        'hingeY': HINGE_Y, 'jawFrontY': JAW_FRONT_Y,
        'stationsMeasuredOpen': len(_open),
        'gapeScan': GAPE_SCAN,
        'seamTable': [[round(float(a), 4), round(float(b), 5), round(float(c), 5),
                       round(float(d), 5)]
                      for a, b, c, d in zip(_sy, _sz, _slow, _shigh)],
        'cavityVertices': int(len(CAV)), 'cavitySpreadY': CAV_SPREAD,
        'cavityVerticesBeforeTheHeadFilter': int(len(_CAV_ALL)),
        'gapeHalfHeight': [[round(float(a), 4), round(float(b), 5)] for a, b in zip(_sy, _GAPE_H)],
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
    'ventralStudRemoved': bump_report,
    'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True,
}
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('MOSA_FRAME', json.dumps({k: v for k, v in frame.items() if k != 'perStation'}))
print('MOSA_REPORT', json.dumps({k: report[k] for k in
      ('authoredTriangles', 'twinTriangles', 'twinTriangleFraction', 'bones', 'maxInfluences',
       'foreReachRadius', 'hindReachRadius')}))
print('MOSA_ENVELOPE', json.dumps(report['envelope']))
print('MOSA_GAPE', json.dumps(RESTING_GAPE))
print('MOSA_COST', json.dumps(jaw_closed_cost))
print('MOSA_SWEEP', json.dumps(limb_sweep))
print('MOSA_SEAMS', json.dumps({k: round(v, 9) for k, v in seams.items()}))
print('MOSA_OK')
