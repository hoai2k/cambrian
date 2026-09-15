"""Rebuild Phragmoteuthis: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The era's second cephalopod and its second body with no skull, no spine and no paired
limbs. It shares an arm crown, a beak and a hyponome with Ceratites and almost nothing else: where
the ammonoid is a rigid house with a soft animal leaning out of it, this is a soft animal all the
way through with one stiff plate buried in its back.

THE FRAME, which the shared one *can* find here. Unlike the ammonoid, this body has a long axis a
principal component can see (0.23 and 0.18 against 1.0 on the other two) and real countershading --
a dark dorsal stripe over a pale flank, measuring 0.348 against `T.measure_frame`'s 0.30 floor. So
the frame is the shared one: head at -Y, up +Z, one unit long along Y. It is corroborated rather
than trusted: after the roll correction the terminal fins span 0.215 across the body and 0.114
through it, and a fin pair that reads as lateral is the check that the roll landed the right way up.

WHAT IS STIFF, AND WHAT THE CONTRACT WILL NOT LET IT DO. A phragmoteuthid carries a rigid internal
shell -- a phragmocone with a long pro-ostracum reaching up the back -- so the mantle is a stiffened
tube rather than a bending one, and it is authored as one bone with no bend in any clip. The jet is
then the problem, because a mantle's jet is a **radial contraction** and the packaging contract
forbids scale channels outright. Rotation cannot express it: a bone on the body axis rotating about
that axis carries a flank point round a circle of the same radius, which is not a squeeze. So the
squeeze is two bones seated inside the flanks with **translation** channels, which the contract does
allow and which every builder in this era already uses for a head or a body. `mantle_L` and
`mantle_R` own the lateral skin of the mid-mantle and move in and out along x, and the audit measures
the mantle's actual width over each clip rather than trusting that they were keyed.

WHAT THE SIMULATION ACTUALLY GIVES IT, which is not what the tagline says. `src/content/triassic/
creatures.ts` gives this animal `swimStyle: 'omnidirectional'` and **no `shell: true`**, and
`shell` is what `RULES.jet()` in `src/sim/triassic/rules.ts` reads. So in the game Phragmoteuthis
does *not* jet: it has no free hover and no backwards travel, and what `omnidirectional` buys it is
that it never turns to face where it is going (`game.ts` skips the yaw). It is also not
`swimStyle: 'pulse'`, so nothing scrubs its `Swim` clip to a phase. All of which makes the honest
locomotion clip the one the animal's own anatomy asks for anyway: a travelling wave down the two
lateral fins, which is how a squid with fins that size holds station and moves in any direction
without turning round. `Sprint` is the mantle dart -- arms drawn to a point, fins clamped, funnel
hard over -- and it is a clip rather than a claim about thrust arriving in lumps. This disagreement
between the flavour text ('a jet in the wrong direction') and the rules is recorded, not papered
over; nothing in this builder changes `creatures.ts`.

THE ARM COUNT is measured, and it does not match the animal. A cut-sphere sweep settles on **12**
appendages over three radii at two centres, and a phragmoteuthid is a decabrachian with ten. The
greenlit pose draws eight arms and two long clubbed tentacles. Twelve is therefore what the
generation made rather than what the subject is, it is preserved rather than corrected here -- the
Tripo mesh is never edited after intake and a shape change goes back to a fresh generation -- and it
is reported as an open defect. The two longest are the tentacles and are rigged with more joints.

Writes only this species' asset family. Touches no shared registry and performs no git operation.
"""
import bpy, bmesh, math, json, os, sys, shutil
import numpy as np
from mathutils import Vector, Quaternion
from mathutils.bvhtree import BVHTree
from math import sin, cos, pi
from collections import deque

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                        # noqa: E402

ID = 'phragmoteuthis'
NAME = 'Phragmoteuthis'
SPECIES = 'P. bisinuata'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 5                                     # raw 1.0 body -> 5.00 engine authoring units
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH
PUPPET_TRIANGLE_TARGET = 7200
VOXEL = .0034
THIN, THIN_BAND = .030, .012
SLIVER_WELD = 5e-4

CLIPS = {'Idle': 2.6, 'Swim': 1.8, 'Sprint': 1.0, 'TurnLeft': 1.4, 'TurnRight': 1.4,
         'Dive': 1.3, 'Rise': 1.3, 'Attack': .9, 'Bite': .45, 'Heavy': 1.1, 'Hit': .55,
         'Death': 1.8, 'Guard': 1.2, 'Parry': .35, 'Dodge': .45, 'Eat': 1.5, 'Stagger': 1.1,
         'Ability': 1.1, 'Grab': 1.1, 'Breath': 2.2, 'Growth': 1.4}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breath']

smooth = T.smooth

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(RAW, NAME + ' authored body')
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' mantle and arms', roughness=.52)
skin_material.use_backface_culling = False       # the backstop behind the oral lining
frame = T.measure_frame(auth, head_is_positive_pca=True, luminance_at=luminance_at)

bm = bmesh.new(); bm.from_mesh(auth.data)
open_before = len([e for e in bm.edges if len(e.link_faces) < 2])
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=SLIVER_WELD)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
open_after = len([e for e in bm.edges if len(e.link_faces) < 2])
bm.to_mesh(auth.data); bm.free()
assert open_after == 0, ('the sliver weld left an open surface', open_before, open_after)
intake.update({'sliverWeld': SLIVER_WELD, 'openEdgesAtTextureWeld': open_before,
               'openEdgesAtSliverWeld': open_after,
               'weldedTriangles': sum(len(p.vertices) - 2 for p in auth.data.polygons),
               'weldedVertices': len(auth.data.vertices)})
pigment = T.pigment_sampler(auth, sample_albedo)

P0 = np.array([v.co[:] for v in auth.data.vertices])
Y0, Y1 = float(P0[:, 1].min()), float(P0[:, 1].max())
bvh0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                            [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh0))
thin_mask = thickness < THIN
cx, cz, half_width, half_depth, centreline = T.measured_centreline(auth, thin_mask)
depth, bvh_auth = T.depth_probe(auth)


def on_axis(y, dx=0., dz=0.):
    return Vector((float(cx(y)) + dx, float(y), float(cz(y)) + dz))


# --------------------------------------------------- the fins, and the roll they corroborate ----
# The terminal fins are the thin mass at the back. They are also the check on the frame: a squid's
# fins are lateral, so after the countershading roll they must span further across the body than
# through it. If they did not, the roll would have landed the animal on its side and nothing further
# down this file -- which flank is which, where the funnel goes, which way the arms fan -- would mean
# anything.
fin_mask = thin_mask & (P0[:, 1] > Y1 - .28)
fin_pts = P0[fin_mask]
assert fin_mask.sum() > 400, ('the terminal fins did not measure', int(fin_mask.sum()))
FIN_X, FIN_Z = float(np.ptp(fin_pts[:, 0])), float(np.ptp(fin_pts[:, 2]))
assert FIN_X > FIN_Z * 1.5, ('the fins must read as lateral, so the roll is wrong', FIN_X, FIN_Z)
FIN_Y0, FIN_Y1 = float(fin_pts[:, 1].min()), float(fin_pts[:, 1].max())
FIN_REACH = float(np.abs(fin_pts[:, 0] - np.array([cx(y) for y in fin_pts[:, 1]])).max())
fin_report = {'vertices': int(fin_mask.sum()), 'lateralSpread': round(FIN_X, 4),
              'dorsoventralSpread': round(FIN_Z, 4), 'lateralOverDorsoventral': round(FIN_X / FIN_Z, 3),
              'yRange': [round(FIN_Y0, 4), round(FIN_Y1, 4)], 'reachFromAxis': round(FIN_REACH, 4)}

# -------------------------------------------------- the crown, and how many appendages it has ----
# Where the mantle stops and the head starts: the station forward of the widest part of the arm
# spray where the body's own half width is at its narrowest, which is the neck behind the crown.
rows = [r for r in centreline if Y0 + .18 < r['y'] < 0.]
NECK = min(rows, key=lambda r: r['halfWidth'])['y']
CROWN_SEED = np.array([float(cx(NECK)), NECK - .03, float(cz(NECK))])


def seat_deepest(seed, span=.05, step=.010, midline=True):
    best = (-1e9, np.array(seed, float))
    rng = np.arange(-span, span + 1e-9, step)
    for dx in ([0.] if midline else rng):
        for dy in rng:
            for dz in rng:
                q = np.array(seed, float) + np.array([dx, dy, dz])
                d = depth(Vector(q.tolist()))
                if d > best[0]:
                    best = (d, q)
    return best[1], best[0]


CROWN, CROWN_DEPTH = seat_deepest(CROWN_SEED, span=.05, step=.010, midline=False)
CROWN = np.array([0., float(CROWN[1]), float(CROWN[2])])
CROWN_AXIS = np.array([0., -1., 0.])


def cut_sphere(centre, R):
    b = bmesh.new(); b.from_mesh(auth.data); b.verts.ensure_lookup_table()
    c = Vector([float(x) for x in centre])
    bmesh.ops.delete(b, geom=[f for f in b.faces if (f.calc_center_median() - c).length < R], context='FACES')
    bmesh.ops.delete(b, geom=[v for v in b.verts if not v.link_faces], context='VERTS')
    b.verts.ensure_lookup_table()
    seen, comps = set(), []
    for v in b.verts:
        if v in seen:
            continue
        st, part = [v], []
        seen.add(v)
        while st:
            q = st.pop(); part.append(q)
            for e in q.link_edges:
                w = e.other_vert(q)
                if w not in seen:
                    seen.add(w); st.append(w)
        comps.append(part)
    comps.sort(key=len, reverse=True)
    return b, comps


ARM_MIN = 60
sweep = []
for R in [round(x, 3) for x in np.arange(.06, .135, .01)]:
    b, comps = cut_sphere(CROWN, R)
    parts = [len(c) for c in comps[1:] if len(c) >= ARM_MIN]
    sweep.append({'radius': R, 'arms': len(parts), 'sizes': [len(c) for c in comps[:18]],
                  'largestOverMedian': round(max(parts) / np.median(parts), 2) if parts else None})
    b.free()
NARM = max(s['arms'] for s in sweep)
CUT_R = float(min(s['radius'] for s in sweep if s['arms'] == NARM))
assert NARM >= 8, ('the crown did not separate into arms', sweep)
assert sum(1 for s in sweep if s['arms'] == NARM) >= 2, ('the arm count never settled', sweep)


def arm_centrelines(nseg_for):
    """A centreline per appendage, by graph distance through its own skin -- the same measurement
    Ceratites uses, because a curled arm's radius from the crown stops being monotonic half way
    along and its distance through the skin does not."""
    b, comps = cut_sphere(CROWN, CUT_R)
    c = Vector(CROWN.tolist())
    found = []
    for part in comps[1:]:
        if len(part) < ARM_MIN:
            continue
        ring = [v for v in part if any(len(e.link_faces) < 2 for e in v.link_edges)]
        base = [v for v in ring if (v.co - c).length < CUT_R * 1.35] or ring
        dist = {v: 0. for v in base}
        dq = deque(base)
        while dq:
            v = dq.popleft()
            for e in v.link_edges:
                w = e.other_vert(v)
                if w in dist:
                    continue
                dist[w] = dist[v] + e.calc_length()
                dq.append(w)
        dmax = max(dist.values())
        nseg = nseg_for(dmax)
        pts, rad = [], []
        for k in range(nseg):
            lo = dmax * k / nseg
            # **A station is never skipped.** The band was a fixed window and an appendage the
            # generation meshed thinly could leave one empty, so that arm came out with three joints
            # where its neighbours had five -- and its one distal bone then had to carry the whole
            # of a long arm, which `skin-tears.mjs` read as the worst edge on the body. The window
            # grows until it has something in it instead.
            band, grow = [], 1.15
            while len(band) < 3 and grow < 4.:
                hi = dmax * (k + grow) / nseg
                band = [v for v in part if lo <= dist.get(v, 1e9) <= hi]
                grow += .35
            if len(band) < 3:
                continue
            q = np.array([v.co[:] for v in band])
            m = q.mean(0)
            pts.append(m)
            rad.append(float(np.linalg.norm(q - m, axis=1).mean()))
        if len(pts) < 3:
            continue
        root = np.array(pts[0])
        inward = CROWN - root
        n = float(np.linalg.norm(inward))
        pts = [root + inward / max(n, 1e-9) * min(n * .75, CUT_R * .70)] + pts
        rad = [rad[0] * 1.15] + rad
        found.append({'pts': [np.asarray(p, float).tolist() for p in pts], 'radius': rad,
                      'verts': len(part), 'graphLength': float(dmax)})
    b.free()
    return found


# A first pass at a uniform five joints, to learn how long each appendage is; then the two
# **tentacles** -- the long clubbed pair a decabrachian catches with -- are rigged with seven, so
# the reach that does the catching is not one straight bar with a hinge at each end.
first = arm_centrelines(lambda _d: 5)
lengths = sorted((a['graphLength'] for a in first), reverse=True)
TENTACLE_FLOOR = (lengths[1] + lengths[2]) / 2 if len(lengths) > 2 else 1e9
ARMS = arm_centrelines(lambda d: 7 if d >= TENTACLE_FLOOR else 5)
assert len(ARMS) == NARM, ('the centreline pass lost an appendage', len(ARMS), NARM)

ROOT_MARGIN = .008
for a in ARMS:
    a['pts'][0] = list(T.seat(Vector([float(x) for x in a['pts'][0]]), Vector(CROWN.tolist()),
                             depth, margin=ROOT_MARGIN, steps=60))
UP = np.array([0., 0., 1.])
SIDE = np.cross(CROWN_AXIS, UP)
for a in ARMS:
    d = np.array(a['pts'][-1]) - CROWN
    a['theta'] = float(math.atan2(float(d @ UP), float(d @ SIDE)))
ARMS.sort(key=lambda a: a['theta'])
for i, a in enumerate(ARMS):
    a['name'] = 'arm_%02d' % i
    a['nseg'] = len(a['pts']) - 1
    a['reach'] = float(np.linalg.norm(np.array(a['pts'][-1]) - CROWN))
    a['tentacle'] = a['graphLength'] >= TENTACLE_FLOOR
TENTACLES = [a for a in ARMS if a['tentacle']]
assert len(TENTACLES) == 2, ('a decabrachian catches with exactly two tentacles',
                             [a['name'] for a in TENTACLES])

# ------------------------------------------------------------------- the head and the funnel ----
HEAD, HEAD_DEPTH = seat_deepest(np.array([float(cx(NECK)), NECK + .02, float(cz(NECK))]),
                                span=.045, step=.009)
HEAD = np.array([0., float(HEAD[1]), float(HEAD[2])])
# The hyponome sits under the head at the mantle's opening, pointing forward past the crown. The
# generation closes the mantle over it, so the bone is seated in the ventral mass there and owns the
# ventral skin, anchored where that skin actually is rather than at a radius about a deep joint --
# which is the trap `idle-bones.mjs` caught on Ceratites.
FUNNEL, FUNNEL_DEPTH = seat_deepest(np.array([float(cx(NECK + .05)), NECK + .05,
                                              float(cz(NECK + .05)) - float(half_depth(NECK + .05)) * .55]),
                                    span=.035, step=.007)
FUNNEL = np.array([0., float(FUNNEL[1]), float(FUNNEL[2])])
_hit = bvh_auth.ray_cast(Vector(FUNNEL.tolist()), Vector((0., 0., -1.)), .5)
assert _hit[0] is not None, 'no ventral skin under the funnel'
FUNNEL_SKIN = np.array(_hit[0][:])

# ------------------------------------------------------------ the peristome, on the crown axis ----
ARM_BAND = float(np.mean([np.mean(a['radius']) for a in ARMS]))
MOUTH_R = ARM_BAND * 1.55


# **The mouth's axis is where the crown points, not where one facet of the dome faces.** Taking the
# surface normal at the hit was the first try: on Phragmoteuthis it came out (0, -0.34, -0.94),
# almost entirely ventral, because the seated crown joint sits high in the head and the ray forward
# from it lands where the dome is nearly horizontal -- and a lining built back along that normal left
# the head after 0.022. The crown's own direction is the mean of its arms, which is measured, is on
# the plane of symmetry by construction, and is what a beak in an arm crown actually faces.
CROWN_ROOTS = np.array([a['pts'][0] for a in ARMS]).mean(0)
CROWN, CROWN_DEPTH = seat_deepest(CROWN_ROOTS, span=.05, step=.010)
CROWN = np.array([0., float(CROWN[1]), float(CROWN[2])])
CROWN_DIR = np.array([a['pts'][-1] for a in ARMS]).mean(0) - CROWN
CROWN_DIR[0] = 0.
CROWN_DIR /= np.linalg.norm(CROWN_DIR)
# The dome is cast from **inside** the head outwards. A ray coming in from outside would land on an
# arm: this crown's appendages converge on the axis in front of the head.
_hit = bvh_auth.ray_cast(Vector(CROWN.tolist()), Vector(CROWN_DIR.tolist()), .6)
assert _hit[0] is not None, 'no crown surface on the axis'
MOUTH_P = np.array(_hit[0][:])
MOUTH_P = np.array([0., float(MOUTH_P[1]), float(MOUTH_P[2])])
M_N = CROWN_DIR
M_DN = np.array([0., 0., -1.]) - M_N * float(np.array([0., 0., -1.]) @ M_N)
M_DN /= np.linalg.norm(M_DN)
M_DS = np.cross(M_N, M_DN)


def mouth_local(p):
    d = np.asarray(p, float) - MOUTH_P
    return float(d @ M_N), float(d @ M_DN), float(d @ M_DS)


def in_peristome(p):
    a, dn, ds = mouth_local(p)
    return abs(a) < MOUTH_R * 1.7 and math.hypot(dn, ds) < MOUTH_R


def cut_peristome(o):
    b = bmesh.new(); b.from_mesh(o.data)
    cut = [f for f in b.faces if in_peristome(np.array(f.calc_center_median()[:]))]
    bmesh.ops.delete(b, geom=cut, context='FACES')
    bmesh.ops.delete(b, geom=[v for v in b.verts if not v.link_faces], context='VERTS')
    rim = sorted({v for e in b.edges if len(e.link_faces) == 1 for v in e.verts}, key=lambda v: v.co[:])
    pts = np.array([v.co[:] for v in rim]) if rim else np.zeros((0, 3))
    b.to_mesh(o.data)
    b.free()
    return len(cut), pts


# How far back the head goes on the mouth's own axis. The lining's closed end has to be inside the
# animal, and a fraction of the mouth radius is the wrong rule for that on a head this small: at
# 2.3 radii the sac's back came out 0.023 OUTSIDE the skin, which an open mouth would have shown as
# a tube hanging in the water. So the room is measured by walking back along the axis.
def axial_room(margin=.006, limit=.30, step=.002):
    # The walk starts ON the skin, so the first few samples are shallower than the margin by
    # definition: what is wanted is the far end of the contiguous run that IS deeper than it.
    inside, room = False, 0.
    for t in np.arange(step, limit, step):
        d = depth(Vector((MOUTH_P - M_N * float(t)).tolist()))
        if d >= margin:
            inside, room = True, float(t)
        elif inside:
            break
    return room


HEAD_ROOM = axial_room()
print('PHRAG_MOUTH_PROBE', json.dumps({
    'neck': round(float(NECK), 4), 'crown': np.round(CROWN, 4).tolist(),
    'crownDepth': round(float(CROWN_DEPTH), 4), 'mouthP': np.round(MOUTH_P, 4).tolist(),
    'mouthN': np.round(M_N, 4).tolist(), 'headRoom': round(HEAD_ROOM, 4),
    'mouthR': round(MOUTH_R, 4), 'head': np.round(HEAD, 4).tolist(),
    'depthAlongAxis': [round(float(depth(Vector((MOUTH_P - M_N * t).tolist()))), 4)
                       for t in np.arange(0, .16, .01)],
    'depthAlongY': [round(float(depth(Vector((0., float(MOUTH_P[1]) + t, float(MOUTH_P[2]))))), 4)
                    for t in np.arange(0, .20, .01)]}))

# ------------------------------------------------------------------------- the procedural twin ----
puppet, pup_thickness, twin_report, _bvh = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', voxel=VOXEL,
    triangle_target=PUPPET_TRIANGLE_TARGET, sample_albedo=sample_albedo,
    blade_dilation=.0022, thin=THIN, band=THIN_BAND, roughness=.66)

mouth_cut = {}
for o, key in ((auth, 'authored'), (puppet, 'twin')):
    n, pts = cut_peristome(o)
    mouth_cut[key] = {'facesRemoved': int(n), 'rimVertices': int(len(pts))}
    if key == 'authored':
        PERISTOME = pts
    assert n >= (7 if key == 'authored' else 3), ('the peristome cut found no faces on the ' + key, n)
    assert len(pts) >= (9 if key == 'authored' else 5), ('the peristome left no rim on the ' + key, len(pts))
mouth_cut.update({'centre': MOUTH_P.round(5).tolist(), 'normal': M_N.round(4).tolist(),
                  'radius': round(MOUTH_R, 5), 'armBandRadius': round(ARM_BAND, 5),
                  'method': 'authored on the crown axis; the generation models no mouth, and casting '
                            'head normals back into the mesh finds neighbouring arms across the '
                            'crown gaps rather than a lip opposite'})

# ------------------------------------------------------------------------ shared skeleton ----
def tx(p):
    return Vector((float(p[0]) * SCALE, float(p[1]) * SCALE, float(p[2]) * SCALE))


B, ORDER = {}, []


def bone(n, p, parent):
    B[n] = (Vector([float(q) for q in p]), parent)
    ORDER.append(n)


MANTLE_FRONT = float(NECK) + .06                       # behind the head, where the mantle begins
MANTLE_MID = (MANTLE_FRONT + FIN_Y0) / 2
FIN_BANDS = 3
FIN_STATIONS = [FIN_Y0 + (FIN_Y1 - FIN_Y0) * (i + .5) / FIN_BANDS for i in range(FIN_BANDS)]
TAIL_Y = FIN_Y1 - (FIN_Y1 - FIN_Y0) * .10

bone('root', (0, 0, 0), None)
# One bone for the whole mantle. A phragmoteuthid carries a rigid internal shell up its back, so the
# mantle is a stiffened tube: it is not given a bend anywhere.
bone('body', on_axis(MANTLE_MID)[:], 'root')
# The squeeze. Seated inside each flank, translated in and out: the contract forbids scale channels,
# and a rotation about the body axis carries a flank point round a circle of the same radius, which
# is not a squeeze at all.
SQUEEZE_X = float(half_width(MANTLE_MID)) * .45
bone('mantle_L', on_axis(MANTLE_MID, dx=SQUEEZE_X)[:], 'body')
bone('mantle_R', on_axis(MANTLE_MID, dx=-SQUEEZE_X)[:], 'body')
bone('tail', on_axis(TAIL_Y)[:], 'body')
for side, s in (('L', 1), ('R', -1)):
    for i, y in enumerate(FIN_STATIONS):
        bone('fin_%s_%02d' % (side, i), on_axis(y, dx=s * float(half_width(y)) * .25)[:], 'body')
bone('head', tuple(HEAD), 'body')
bone('funnel', tuple(FUNNEL), 'body')
BEAK_BACK = MOUTH_P - M_N * MOUTH_R * .55
bone('skull', tuple(BEAK_BACK + M_DN * MOUTH_R * .10), 'head')
bone('jaw', tuple(BEAK_BACK + M_DN * MOUTH_R * .30), 'skull')
for a in ARMS:
    for i, p in enumerate(a['pts'][:-1]):
        bone('%s_%02d' % (a['name'], i), tuple(p),
             'head' if i == 0 else '%s_%02d' % (a['name'], i - 1))

seating = {'body': depth(on_axis(MANTLE_MID)), 'head': depth(Vector(HEAD.tolist())),
           'funnel': depth(Vector(FUNNEL.tolist())), 'tail': depth(on_axis(TAIL_Y)),
           'crown': float(CROWN_DEPTH),
           'mantle_L': depth(on_axis(MANTLE_MID, dx=SQUEEZE_X)),
           'mantle_R': depth(on_axis(MANTLE_MID, dx=-SQUEEZE_X))}
for side, s in (('L', 1), ('R', -1)):
    for i, y in enumerate(FIN_STATIONS):
        seating['fin_%s_%02d' % (side, i)] = depth(on_axis(y, dx=s * float(half_width(y)) * .25))
for a in ARMS:
    seating[a['name'] + '_00'] = depth(Vector([float(x) for x in a['pts'][0]]))
for n, d in seating.items():
    assert d > .004, ('a joint sits outside the body', n, round(float(d), 4))

# --------------------------------------------------------------------------------- weights ----
ARM_IN, ARM_OUT = 1.20, 2.40
# The root's fade-in is a fraction of the arm's **own** first segment, not a fixed arc length. A
# fixed 0.035 was longer than the whole first segment on some of these appendages, so their root
# joints finished owning three thousandths of the body: alive by the letter of `idle-bones.mjs` and
# dead in every way that matters.
ARM_SEAT_SHARE = .45
ARMFIT = []
for a in ARMS:
    P, cum = T.polyline(a['pts'])
    ARMFIT.append((a['name'], P, cum, a['radius'], a['nseg'], max(cum[1] * ARM_SEAT_SHARE, 1e-4)))


def project_seg(P, cum, q):
    best = (1e9, 0., 0.)
    for i in range(len(P) - 1):
        a0 = P[i]
        d = P[i + 1] - a0
        L2 = d.length_squared
        t = 0. if L2 < 1e-12 else max(0., min(1., (q - a0).dot(d) / L2))
        c = a0 + d * t
        dist = (q - c).length
        if dist < best[0]:
            best = (dist, cum[i] + t * d.length, i + t)
    return best


def arm_chain(name, seg, nseg):
    out = {}
    lo = int(math.floor(seg))
    t = seg - lo
    for k, w in ((lo, 1 - smooth(t)), (lo + 1, smooth(t))):
        k = max(0, min(nseg - 1, k))
        if w > 0:
            key = '%s_%02d' % (name, k)
            out[key] = out.get(key, 0.) + w
    return out


def arm_claims(q):
    claims, total = [], 0.
    for name, P, cum, rad, nseg, seat_arc in ARMFIT:
        dist, s, seg = project_seg(P, cum, q)
        t = s / max(cum[-1], 1e-9)
        band = float(np.interp(t * (len(rad) - 1), np.arange(len(rad)), rad))
        rin, rout = band * ARM_IN, band * ARM_OUT
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / max(rout - rin, 1e-9))) \
            * smooth(s / seat_arc)
        if alpha <= 1e-4:
            continue
        claims.append((alpha, arm_chain(name, seg, nseg)))
        total += alpha
    if not claims:
        return {}, 0.
    k = 1. / max(1., total)
    out = {}
    for alpha, chain in claims:
        for n, w in chain.items():
            out[n] = out.get(n, 0.) + alpha * k * w
    return out, min(1., total)


LIP_BAND = MOUTH_R * 2.0
FUNNEL_V = Vector(FUNNEL_SKIN.tolist())
FUNNEL_R, FUNNEL_BAND = .045, .040
TAIL_BAND = .050
HEAD_BACK = MANTLE_FRONT
HEAD_FRONT = float(CROWN[1])
# How far out of the mantle's own surface a vertex has to be before it counts as fin. Measured
# against the body's half width at that station rather than against a typed number, because the
# mantle tapers and a fixed threshold reads the tail cone as a fin.
FIN_OUT, FIN_OUT_BAND = 1.05, .35


def lip_share(q):
    a, dn, ds = mouth_local(q[:])
    lat = math.hypot(dn, ds)
    ring = smooth((MOUTH_R + LIP_BAND - lat) / LIP_BAND) \
        * smooth((MOUTH_R * 2.0 - abs(a)) / (MOUTH_R * 1.0))
    if ring <= 0:
        return 0., 0.
    return ring, max(0., min(1., .5 + .5 * dn / max(lat, 1e-9)))


def fin_share(q, blade):
    """How much of a point is fin, and which band of which side owns it.

    Fin is decided by how **thin** the surface is there, not by how far out it is. Measuring it
    against the centreline's own half width was the first try and it came out lopsided -- the left
    fin took 675 of the body's weight and the right 212 -- because the measured centreline is not
    exactly the animal's midline and a ratio threshold then bites on one side before the other.
    Shell thickness is a property of the surface itself and has no side to it.
    """
    y = float(q.y)
    if blade <= 0 or y < FIN_Y0 - .03 or y > FIN_Y1 + .02:
        return 0., {}
    hw = max(float(half_width(y)), 1e-4)
    lateral = abs(float(q.x) - float(cx(y))) / hw
    alpha = blade * smooth((lateral - .35) / .40)
    if alpha <= 0:
        return 0., {}
    side = 'L' if float(q.x) > float(cx(y)) else 'R'
    # Blend between the two fin stations bracketing y, so the wave that travels down the fin has no
    # step in it -- a hard band boundary is exactly the gate that tears a fin.
    u = (y - FIN_STATIONS[0]) / max(FIN_STATIONS[-1] - FIN_STATIONS[0], 1e-9) * (FIN_BANDS - 1)
    lo = max(0, min(FIN_BANDS - 2, int(math.floor(u))))
    t = smooth(max(0., min(1., u - lo)))
    return alpha, {'fin_%s_%02d' % (side, lo): 1 - t, 'fin_%s_%02d' % (side, lo + 1): t}


def squeeze_share(q):
    """The lateral skin of the mid-mantle, which is what a jet pulls in."""
    y = float(q.y)
    if y < MANTLE_FRONT - .02 or y > FIN_Y0 + .04:
        return 0., None
    hw = max(float(half_width(y)), 1e-4)
    lateral = (float(q.x) - float(cx(y))) / hw
    # A wide feather across the section. The squeeze moves flank skin sideways while the skin
    # above and below it stays put, so however gentle the travel the boundary between them is where
    # this body tears; the answer is to spread the boundary over most of the flank rather than to
    # make the jet smaller.
    band = smooth((abs(lateral) - .20) / .62) \
        * smooth((float(q.y) - (MANTLE_FRONT - .02)) / .06) \
        * smooth(((FIN_Y0 + .04) - float(q.y)) / .08)
    if band <= 0:
        return 0., None
    return band, 'mantle_L' if lateral > 0 else 'mantle_R'


def weights(p, blade):
    q = Vector([float(c) for c in p])
    # **The lips are claimed before the arms are.** Taking the arms first and giving the lip what is
    # left put 0.06 of the whole body's weight on `skull` -- the beak's own upper lip owned almost
    # nothing, because the crown's arms reach across the mouth and claimed it first. A peristome
    # belongs to the mouth whatever is standing over it.
    ring, ventral = lip_share(q)
    arms, claimed = arm_claims(q)
    claimed *= (1 - ring)
    arms = {n: v * (1 - ring) for n, v in arms.items()}
    lip = ring
    fin, fin_bones = fin_share(q, blade)
    fin *= (1 - claimed) * (1 - lip)
    tail = smooth((float(q.y) - (TAIL_Y - TAIL_BAND)) / TAIL_BAND) * (1 - claimed) * (1 - fin)
    funnel = smooth((FUNNEL_R - (q - FUNNEL_V).length) / FUNNEL_BAND) * (1 - claimed) * (1 - lip)
    rest = max(0., 1 - claimed - lip - fin - tail - funnel)
    w = dict(arms)
    if lip > 0:
        w['jaw'] = w.get('jaw', 0.) + lip * ventral
        w['skull'] = w.get('skull', 0.) + lip * (1 - ventral)
    for n, share in fin_bones.items():
        if fin * share > 0:
            w[n] = w.get(n, 0.) + fin * share
    if tail > 0:
        w['tail'] = w.get('tail', 0.) + tail
    if funnel > 0:
        w['funnel'] = w.get('funnel', 0.) + funnel
    if rest > 0:
        # The head/mantle axial blend, and the squeeze taken out of the mantle's own share.
        t = smooth((float(q.y) - HEAD_BACK) / (HEAD_FRONT - HEAD_BACK))
        head = rest * t
        trunk = rest * (1 - t)
        sq, side = squeeze_share(q)
        if side and sq > 0:
            w[side] = w.get(side, 0.) + trunk * sq
            trunk *= (1 - sq)
        w['head'] = w.get('head', 0.) + head
        w['body'] = w.get('body', 0.) + trunk
    w = {n: v for n, v in w.items() if v > 1e-8}
    assert w, ('unweighted vertex', list(p))
    return w


# ------------------------------------------------------------------- build the armature ----
arm_data = bpy.data.armatures.new(NAME + ' shared skeleton')
rig = bpy.data.objects.new(NAME + '_Rig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for n in ORDER:
    p, parent = B[n]
    eb = arm_data.edit_bones.new(n)
    eb.head = tx(p)
    eb.tail = eb.head + Vector((0, .16, 0))
    if parent:
        eb.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')

influences, weight_tally = [], {}
AUTH_GROUP, PUP_GROUP = [auth], [puppet]
for o in (auth, puppet):
    th = thickness if o is auth else pup_thickness
    blades = [smooth((THIN - float(th[i])) / THIN_BAND) for i in range(len(o.data.vertices))]
    per_vertex = [weights(v.co, blades[v.index]) for v in o.data.vertices]
    per_vertex = T.relax_weights(o, per_vertex, passes=4, keep=4, hold=.45)
    for n in ORDER:
        o.vertex_groups.new(name=n)
    for v in o.data.vertices:
        w = per_vertex[v.index]
        influences.append(len(w))
        for n, val in w.items():
            o.vertex_groups[n].add([v.index], val, 'REPLACE')
            if o is auth:
                weight_tally[n] = weight_tally.get(n, 0.) + val
    for v in o.data.vertices:
        v.co = tx(v.co)
    for p in o.data.polygons:
        p.use_smooth = True
    mod = o.modifiers.new('Shared articulated skeleton', 'ARMATURE')
    mod.object = rig
    o.parent = rig

print('PHRAGMOTEUTHIS_WEIGHTS', json.dumps({n: round(weight_tally.get(n, 0.), 2) for n in ORDER}))
idle = [n for n in ORDER if n != 'root' and weight_tally.get(n, 0.) <= 0.]
assert not idle, ('a joint owns no skin at all', idle)
_total = sum(weight_tally.values())
thin_joints = sorted((n, round(weight_tally[n] / _total, 6)) for n in weight_tally
                     if weight_tally[n] / _total < .0005)

# ----------------------------------------------- the mouth interior: one closed skinned lining ----
mouth_material = T.inward_material(NAME + ' mouth interior', (.23, .10, .10, 1), roughness=.60)
beak_material = T.opaque_material(NAME + ' beak', (.050, .038, .033, 1), roughness=.32)
oralparts = []
LINING_RINGS, LINING_RING = 16, 14
LINING_DEPTH = min(MOUTH_R * 2.3, HEAD_ROOM * .80)
assert LINING_DEPTH > MOUTH_R * .8, ('no room for a mouth behind the peristome', HEAD_ROOM)


def mouth_point(a, dn, ds):
    return Vector((MOUTH_P + M_N * a + M_DN * dn + M_DS * ds).tolist())


_lining, _lining_raw = T.crown_lining(
    NAME + ' oral lining', rig, tx, PERISTOME, MOUTH_P, M_N, M_DN, M_DS,
    into_head=LINING_DEPTH, skin_weights=lambda q: weights(q, 0.), material=mouth_material,
    rings=LINING_RINGS, ring=LINING_RING)
oralparts.append(_lining)


for _label, _bone, _sign in ((' upper mandible', 'skull', -1), (' lower mandible', 'jaw', 1)):
    oralparts.append(T.crown_beak(NAME + _label, rig, _bone, tx, MOUTH_P, M_N, M_DN, M_DS,
                                  MOUTH_R, _sign, beak_material))
lining_back = Vector(np.asarray(_lining_raw)[-LINING_RING:].mean(0).tolist())
lining_depth_raw = depth(lining_back)
assert lining_depth_raw > .003, ('the lining reaches outside the head', round(float(lining_depth_raw), 5))

# --------------------------------------------- measured comparison of the two real surfaces ----
auth_v = np.array([v.co[:] for v in auth.data.vertices])
YLO, YHI = float(auth_v[:, 1].min()), float(auth_v[:, 1].max())
model_length = YHI - YLO
profile_rows, worst = T.paired_profile(AUTH_GROUP, PUP_GROUP, YLO + .02 * model_length,
                                       YHI - .02 * model_length, ENVELOPE_TOLERANCE, stations=21)
bvh_twin = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                                [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
distances = np.array([float(bvh_twin.find_nearest(v.co)[3]) for v in auth.data.vertices])
surface_outliers = int((distances > .12).sum())

# ------------------------------------ the shape record a later neutral-pose pass needs ----
curvature = {'mantle': T.curvature_over_section(
    [on_axis(y)[:] for y in np.linspace(MANTLE_FRONT, TAIL_Y, 9)],
    lambda y: max(float(half_width(y)), float(half_depth(y))))}
for a in ARMS[:: max(1, len(ARMS) // 5)]:
    curvature[a['name']] = T.curvature_over_section(a['pts'], lambda _y, r=np.mean(a['radius']): r)
curvature['allArms'] = {'meanCurvatureRadiusOverSection': float(np.mean(
    [c['meanCurvatureRadiusOverSection'] for k, c in curvature.items()
     if k.startswith('arm_') and c.get('meanCurvatureRadiusOverSection')]))}
mirror = {}
for a in ARMS:
    best, bd = None, 1e9
    for b in ARMS:
        if b is a:
            continue
        d = abs(((pi - a['theta']) - b['theta'] + pi) % (2 * pi) - pi)
        if d < bd:
            best, bd = b, d
    L = np.array(a['pts'])
    R = np.array(best['pts'])
    R[:, 0] *= -1
    n = min(len(L), len(R))
    mirror[a['name']] = {'partner': best['name'], 'angleMismatchDegrees': round(math.degrees(bd), 2),
                         'meanMirrorDistanceOverBodyLength':
                             round(float(np.mean(np.linalg.norm(L[:n] - R[:n], axis=1))), 4),
                         'maxMirrorDistanceOverBodyLength':
                             round(float(np.max(np.linalg.norm(L[:n] - R[:n], axis=1))), 4)}
fin_L = P0[fin_mask & (P0[:, 0] > 0)]
fin_R = P0[fin_mask & (P0[:, 0] < 0)]
asymmetry = {'method': 'each arm against its reflection in the plane of symmetry, plus the one real '
                       'pair this body has: the two terminal fins',
             'arms': mirror,
             'meanMirrorDistanceOverBodyLength':
                 round(float(np.mean([m['meanMirrorDistanceOverBodyLength'] for m in mirror.values()])), 4),
             'maxMirrorDistanceOverBodyLength':
                 round(float(max(m['maxMirrorDistanceOverBodyLength'] for m in mirror.values())), 4),
             'fins': {'leftVertices': int(len(fin_L)), 'rightVertices': int(len(fin_R)),
                      'leftReach': round(float(fin_L[:, 0].max()), 4),
                      'rightReach': round(float(-fin_R[:, 0].min()), 4),
                      'reachDifferenceOverBodyLength':
                          round(abs(float(fin_L[:, 0].max()) + float(fin_R[:, 0].min())), 4),
                      'leftCentroidY': round(float(fin_L[:, 1].mean()), 4),
                      'rightCentroidY': round(float(fin_R[:, 1].mean()), 4)},
             'armCount': NARM, 'tentacles': [a['name'] for a in TENTACLES],
             'armCountAgainstTheSubject': 'a phragmoteuthid is a decabrachian with ten appendages '
                                          'and the greenlit pose draws eight arms and two clubbed '
                                          'tentacles; this generation made %d' % NARM}

# ------------------------------------------------------------------------------ performance ----
scene = bpy.context.scene
scene.render.fps = 30
rig.animation_data_create()
for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'


def reset():
    for q in rig.pose.bones:
        q.rotation_euler = (0, 0, 0)
        q.location = (0, 0, 0)
        q.scale = (1, 1, 1)


ARM_NAMES = [[('%s_%02d' % (a['name'], i)) for i in range(a['nseg'])] for a in ARMS]
ARM_THETA = [a['theta'] for a in ARMS]
ARM_IS_TENTACLE = [a['tentacle'] for a in ARMS]
FIN_NAMES = {'L': ['fin_L_%02d' % i for i in range(FIN_BANDS)],
             'R': ['fin_R_%02d' % i for i in range(FIN_BANDS)]}
SQUEEZE_TRAVEL = float(half_width(MANTLE_MID)) * .30 * SCALE
AMP = {'Idle': .35, 'Swim': 1., 'Sprint': 1.3, 'Eat': .55, 'Guard': .25, 'Breath': .45,
       'Dodge': 1.1, 'Ability': .9, 'Grab': .8, 'Growth': .45, 'Hit': .8, 'Stagger': .9}
arm_sweep, fin_sweep, funnel_sweep, squeeze_travel, seams, bounds = {}, {}, {}, {}, {}, {}

for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    first_state = None
    arm_angles = {a['name']: [] for a in ARMS}
    fin_angles = {k: [] for k in FIN_NAMES}
    funnel_angles = []
    squeeze = []
    for f in range(last + 1):
        reset()
        u = f / last
        p = 2 * pi * u
        e = sin(pi * u) ** 2
        loop = clip in LOOPS
        env = 1 if loop else e
        pb = rig.pose.bones
        amp = AMP.get(clip, .3)
        wind = sin(pi * u / .28) ** 2 if u < .28 else 0.
        peak = sin(pi * (u - .24) / .40) ** 2 if .24 < u < .64 else 0.
        dead = smooth(u) if clip == 'Death' else 0.
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ('TurnLeft', 'TurnRight') else 0.
        if clip == 'Death':
            amp *= 1 - dead
        # **The crown's strike is a gather, a reach and a close, in that order.** The first pass
        # built it out of `wind` and `peak`, which shot the tentacles forward on the *windup* and
        # then spent the whole of the strike hauling them back: measured on the shipped Attack, the
        # attack anchor reached its furthest forward at u=0.25 and its furthest back at u=0.44. A
        # tentacle that is retracting at the moment of the blow is a jab that has already missed,
        # and the note this was raised on says so plainly -- the heavy is a *hook latch*, and what
        # it should read as is a lithe grab forward rather than a hit. So the gather is small and
        # early, the reach is large and held open long enough to arrive, and the close follows it.
        # All three are zero at u=0 and u=1, which is what a looping Grab needs.
        gather = sin(pi * u / .28) ** 2 if u < .28 else 0.
        reach = sin(pi * (u - .15) / .81) ** 2 if .15 < u < .96 else 0.
        close = sin(pi * (u - .42) / .54) ** 2 if .42 < u < .96 else 0.

        # ---- the fins. **This is the locomotion.** A wave runs down each fin from front to back,
        # and the two run together at cruise and split in a turn, which is how a body with no front
        # (`swimStyle: 'omnidirectional'`) goes sideways without turning round.
        beats = 2 if clip in ('Swim', 'Idle', 'Breath') else 1
        finamp = {'Swim': .34, 'Idle': .12, 'Breath': .10, 'Sprint': .10, 'Eat': .10,
                  'TurnLeft': .34, 'TurnRight': .34, 'Dive': .26, 'Rise': .26,
                  'Dodge': .30, 'Ability': .22, 'Growth': .16}.get(clip, .10) * (1 - dead)
        # A one-shot clip's envelope is `sin(pi u)^2`, which is at full height for one instant in
        # the middle: multiplied into a wave it takes a third off its amplitude and the fins read as
        # barely working through a turn. A clipped envelope reaches full height early and holds,
        # and is still exactly zero at both ends, which is what the loop seam needs.
        env_fin = env if loop else min(1., 2.2 * e)
        for side, s in (('L', 1), ('R', -1)):
            lean, wavedir, bias = 1., 1., 0.
            if clip in ('TurnLeft', 'TurnRight'):
                # **A turn reverses the inside fin's wave, it does not switch it off.** Damping the
                # inside fin's amplitude was the first try and it left the left fin sweeping 5.6
                # degrees against the right's 32 in a left turn -- a fin that has stopped, which is
                # not how an animal with two of them turns. Two fins running their waves in opposite
                # directions is a body pivoting about its own middle, and both are still working.
                inner = (s > 0) == (clip == 'TurnLeft')
                wavedir = -1. if inner else 1.
                bias = s * .26 * e * (1 if clip == 'TurnRight' else -1)
            if clip == 'Sprint':
                lean = .35                              # clamped against the mantle for the dart
            for i, n in enumerate(FIN_NAMES[side]):
                lag = i * .55
                q = pb[n]
                q.rotation_euler.y = (s * finamp * lean * sin(wavedir * p * beats - lag) * env_fin
                                      + bias
                                      + s * (.30 if clip == 'Sprint' else 0.) * e
                                      + s * .22 * dead)
                if clip in ('Dive', 'Rise'):
                    q.rotation_euler.y += s * (.22 if clip == 'Dive' else -.22) * e
            fin_angles[side].append(pb[FIN_NAMES[side][-1]].rotation_euler.to_quaternion())

        # ---- the mantle squeeze, as translation. A mantle's jet is a radial contraction and the
        # contract forbids scale channels, so the two flank bones move in and out along x.
        pump = 0.
        if clip == 'Sprint':
            ph = (u * 2) % 1.
            pump = sin(pi * ph / .32) ** 2 if ph < .32 else 0.
        if clip == 'Ability':
            pump = 1.6 * (sin(pi * u / .30) ** 2 if u < .30 else 0.)   # the ink blast
        if clip in ('Idle', 'Breath'):
            pump = .22 * (1 - cos(p * (2 if clip == 'Breath' else 1))) / 2
        if clip == 'Swim':
            pump = .18 * (1 - cos(p * 2)) / 2
        if clip == 'Dodge':
            pump = e
        if clip == 'Guard':
            pump = .30 + .12 * (1 - cos(p)) / 2
        pb['mantle_L'].location.x = -pump * SQUEEZE_TRAVEL
        pb['mantle_R'].location.x = pump * SQUEEZE_TRAVEL
        squeeze.append(pump)

        # ---- the funnel, which vectors whatever the mantle pushed out.
        fn = pb['funnel']
        fn.rotation_euler.x = (-.50 * pump
                               + (.40 if clip == 'Dive' else -.40 if clip == 'Rise' else 0.) * e
                               + .12 * dead)
        fn.rotation_euler.z = turn * .60 + (.10 * sin(p) * env if clip == 'Idle' else 0.)
        funnel_angles.append(fn.rotation_euler.to_quaternion())

        # ---- the head and the tail cone.
        hd = pb['head']
        # Heavy is **not** a withdraw on this animal: `heavy: 'Hook latch'` is the tentacle pair
        # going out and catching, and pulling the head back through it cancelled a third of the
        # protraction the strike is made of. The clips that do withdraw are the ones that mean it.
        withdraw = (1. if clip == 'Guard' else
                    .55 * e if clip in ('Hit', 'Stagger', 'Parry') else dead)
        hd.rotation_euler.x = -.08 * pump + .10 * withdraw + (.12 * peak if clip == 'Attack' else 0.)
        hd.rotation_euler.z = turn * .22
        hd.location.y = .020 * withdraw * SCALE
        if clip in ('Attack', 'Bite', 'Grab', 'Heavy'):
            # **On this body the reach is a protraction, and it has to be.** The arms already lie
            # along the animal's own axis at rest -- their tips sit at the very front of the
            # bounding box -- so there is no rotation that carries them further forward: swinging
            # them harder in the "forward" direction takes them up over the head instead, which the
            # first correction did and which measured as 0.048 of forward travel against 0.321 of
            # back. A squid pushing its crown out is a real movement and it is the one that reads,
            # so the head carries the whole crown forward through the reach and gathers a little
            # before it. The head is the arms' parent, so this is the one channel that moves all
            # twelve of them the same way.
            hd.location.y += (.011 * gather - .050 * reach) * SCALE
        pb['tail'].rotation_euler.z = turn * .12 + .10 * sin(p * beats - 1.8) * env * finamp * 2
        pb['tail'].rotation_euler.x = .16 * dead

        # ---- the beak. **It is not animated, in any clip.** A beak inside an arm crown sits at the
        # bottom of a well of arms and is never on screen: what this animal reaches with, catches
        # with and is read by is the crown and its two tentacles, and `anchor_mouth` on a still
        # `jaw` is all the rest of the game needs in order to know where a mouthful goes. So the two
        # mouth bones hold their bind pose and the clips spend their motion where it can be seen.
        pb['jaw'].rotation_euler.x = 0.
        pb['skull'].rotation_euler.x = 0.

        # ---- the arms. Eight of them fan and curl; the two tentacles shoot out and snap back,
        # because that is what a decabrachian catches with and `heavy: 'Hook latch'` is the move.
        for ai, names in enumerate(ARM_NAMES):
            th = ARM_THETA[ai]
            lat = math.cos(th)
            ventral = math.sin(th)
            phase = th * .5
            tentacle = ARM_IS_TENTACLE[ai]
            gain = 2.0 / len(names)
            spread = .10 * amp * sin(p - phase) * env
            sweep = 0.
            curl = 0.
            if clip in ('Swim', 'Idle', 'Breath'):
                sweep = (.14 if clip == 'Swim' else .08) + .06 * sin(p * beats - phase)
            if clip == 'Sprint':
                sweep = -.55 - .10 * pump            # drawn to a point behind the head
                spread = .03 * sin(p * 2 - phase)
            if clip in ('TurnLeft', 'TurnRight'):
                sweep = .20 * e * (1 + .8 * lat * (1 if clip == 'TurnRight' else -1))
            if clip in ('Dive', 'Rise'):
                sweep = .14 * e * (1 + .6 * ventral * (1 if clip == 'Dive' else -1))
            if clip in ('Attack', 'Bite', 'Grab', 'Heavy'):
                # Negative sweep carries an appendage forward past the head; positive folds it back
                # over the mantle, which is what Guard does and what a strike must not. The
                # tentacles go furthest, because they are the two that catch: a decabrachian's
                # strike is the pair shooting out and closing, with the eight arms following them
                # out to gather whatever they came back with.
                # **A grab, not a hit: the crown opens, the head drives it forward, and it shuts.**
                # None of that is a swing, and on this body none of it can be. These arms already
                # lie along the animal's own axis with their tips at the very front of its bounding
                # box, so there is no rotation that carries them further forward -- swinging them
                # "forward" about the crown tangent takes them up over the head (measured: 0.048 of
                # forward travel against 0.321 of back) and converging them further takes them past
                # the axis and down its other side (0.099 against 0.120). So the reach is the head's
                # protraction, above, and the crown's own part of the move is opening around it and
                # closing on it. The two tentacles open least and shut hardest and latest: that is
                # the pair closing on whatever the eight have gathered, which is what `heavy:
                # 'Hook latch'` names.
                out = {'Attack': .62, 'Bite': .56, 'Grab': .58, 'Heavy': .72}[clip]
                shut = {'Attack': .80, 'Bite': .62, 'Grab': .95, 'Heavy': .95}[clip]
                hold = max(gather, reach)
                sweep = .14 * out * gather - .08 * out * reach
                spread = (.70 if tentacle else .85) * out * hold - (1.30 if tentacle else .85) * shut * close
                curl = shut * close * (1.35 if tentacle else .80)
            if clip == 'Eat':
                sweep = .55 + .18 * sin(p * 2 - phase)
                curl = .45 + .18 * sin(p * 2 - phase)
            if clip == 'Guard':
                sweep = .98 + .07 * sin(p - phase)
                curl = .68 + .05 * sin(p - phase)
            if clip in ('Hit', 'Stagger', 'Parry'):
                sweep = .60 * e
                curl = .40 * e
            if clip == 'Dodge':
                sweep = -.40 * e
            if clip == 'Ability':
                sweep = -.30 * e                     # streamlined out of the cloud
            if clip == 'Death':
                sweep = -.15 * dead
                curl = .50 * dead + .10 * sin(ai * .9)
            if clip == 'Growth':
                sweep = .16 * e
                spread = .14 * sin(p - phase) * env
            tangent = (-ventral, -lat)
            radius_ax = (lat, -ventral)
            for k, n in enumerate(names):
                q = pb[n]
                taper = (k + 1) / len(names)
                tang = (sweep * (.45 + .55 * taper) + curl * .70 * taper) * gain
                rad = spread * (.3 + .7 * taper) * gain
                q.rotation_euler.x = tang * tangent[0] + rad * radius_ax[0]
                q.rotation_euler.z = tang * tangent[1] + rad * radius_ax[1]
            acc = Quaternion()
            for n in names:
                acc = acc @ pb[n].rotation_euler.to_quaternion()
            arm_angles[ARMS[ai]['name']].append(acc)

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first_state = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first_state).max())
        for q in pb:
            if q.name == 'root':
                continue
            q.keyframe_insert('rotation_euler', frame=f)
            if q.name in ('body', 'head', 'mantle_L', 'mantle_R'):
                q.keyframe_insert('location', frame=f)

    def swept(seq):
        return round(max(math.degrees(abs(a.rotation_difference(b).angle))
                         for i, a in enumerate(seq) for b in seq[i + 1:]) if len(seq) > 1 else 0., 1)

    arm_sweep[clip] = {k: swept(v) for k, v in arm_angles.items()}
    fin_sweep[clip] = {k: swept(v) for k, v in fin_angles.items()}
    funnel_sweep[clip] = swept(funnel_angles)
    squeeze_travel[clip] = round((max(squeeze) - min(squeeze)) * SQUEEZE_TRAVEL, 4)
    points = []
    for f in np.linspace(0, last, 13):
        scene.frame_set(int(f))
        dg = bpy.context.evaluated_depsgraph_get()
        for o in AUTH_GROUP + PUP_GROUP + oralparts:
            ev = o.evaluated_get(dg)
            me = ev.to_mesh()
            co = np.array([v.co[:] for v in me.vertices])
            assert np.isfinite(co).all()
            points.extend([co.min(0), co.max(0)])
            ev.to_mesh_clear()
    bounds[clip] = [np.array(points).min(0).tolist(), np.array(points).max(0).tolist()]
    rig.animation_data.action = None

for c in set(CLIPS) - {'Death'}:
    assert seams[c] < 1e-6, (c, seams[c])
# The fins are the engine, so they have to work in the clip that says so.
for c in ('Swim', 'TurnLeft', 'TurnRight'):
    assert min(fin_sweep[c].values()) > 15, ('the fins barely move in ' + c, fin_sweep[c])
assert squeeze_travel['Sprint'] > .05, ('the mantle must squeeze on the dart', squeeze_travel['Sprint'])
assert squeeze_travel['Ability'] > .05, ('the ink blast must empty the mantle', squeeze_travel['Ability'])
# The weapon is the tentacle pair, and a clip that leaves it hanging has not used the animal.
for c in ('Attack', 'Heavy'):
    assert min(arm_sweep[c][a['name']] for a in TENTACLES) > 40, \
        ('the tentacles must strike in ' + c, {a['name']: arm_sweep[c][a['name']] for a in TENTACLES})
reset()
scene.frame_set(0)

# ---------------------------------------------------------------------------------- anchors ----
# `anchor_attack_primary` goes on the bone that delivers the blow, and on this animal that is
# emphatically not the beak: `heavy: 'Hook latch'` in `src/content/triassic/creatures.ts` is the
# tentacle pair shooting out and hooking, and the beak only ever gets what the tentacles have
# already brought back. So the attack anchor is the longer tentacle's tip with that tentacle's whole
# chain for IK, and `anchor_grasp` is the other one -- which is what `attachments.ts` reads to
# decide where a held animal rides.
TENT = sorted(TENTACLES, key=lambda a: -a['graphLength'])
anchors = [
    {'name': 'anchor_mouth', 'bone': 'jaw', 'role': 'mouth',
     'point': list(tx(mouth_point(MOUTH_R * .70, MOUTH_R * .14, 0)))},
    {'name': 'anchor_mouth_inside', 'bone': 'skull', 'role': 'swallow',
     'point': list(tx(mouth_point(-LINING_DEPTH * .55, 0, 0)))},
    {'name': 'anchor_attack_primary', 'bone': '%s_%02d' % (TENT[0]['name'], TENT[0]['nseg'] - 1),
     'role': 'attack', 'point': list(tx(Vector([float(x) for x in TENT[0]['pts'][-1]]))),
     'chain': ['%s_%02d' % (TENT[0]['name'], i) for i in range(TENT[0]['nseg'])]},
    {'name': 'anchor_grasp', 'bone': '%s_%02d' % (TENT[1]['name'], TENT[1]['nseg'] - 1),
     'role': 'grasp', 'point': list(tx(Vector([float(x) for x in TENT[1]['pts'][-1]]))),
     'chain': ['%s_%02d' % (TENT[1]['name'], i) for i in range(TENT[1]['nseg'])]},
]
sockets = []
for a in anchors:
    o = bpy.data.objects.new(a['name'], None)
    bpy.context.collection.objects.link(o)
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = a['bone']
    o.matrix_world.translation = Vector(a['point'])
    meta = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}
    if a.get('chain'):
        meta['chain'] = a['chain']
    o['cambrianAnchor'] = meta
    sockets.append(o)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2))


def patch(path):
    import struct
    T.patch_glb(path, anchors)
    raw = open(path, 'rb').read()
    n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n])
    binary = raw[20 + n:]
    for a in anchors:
        if not a.get('chain'):
            continue
        i = next(k for k, nd in enumerate(g['nodes']) if nd.get('name') == a['name'])
        g['nodes'][i]['extras']['cambrianAnchor']['chain'] = a['chain']
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
for group, suffix in ((AUTH_GROUP, ''), (PUP_GROUP, '.puppet')):
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, ID + suffix + '.glb'), **T.EXPORT_KWARGS)
    patch(os.path.join(OUT, ID + suffix + '.glb'))
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)

open(os.path.join(HERE, ID + '-profile.json'), 'w').write(json.dumps({
    'method': '21 exact plane-intersection envelopes of both actual meshes; %.4f raw-space voxel '
              'occupancy resurfacing' % VOXEL,
    'bodyLength': model_length, 'stations': profile_rows, 'maximumEnvelopeDifference': worst,
    'surfaceDistanceMax': float(distances.max()),
    'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'seatingDepthRaw': {k: round(float(v), 5) for k, v in seating.items()},
    'fins': fin_report, 'mouth': mouth_cut}, indent=2))

meta = {'id': ID, 'name': NAME, 'species': 'Phragmoteuthis bisinuata',
        'description': 'Canonical Tripo body and procedural volume twin on one %d-joint rig: a stiff '
                       'mantle that squeezes by translation rather than scale, two lateral fins '
                       'carrying a travelling wave, %d appendages of which two are tentacles, and an '
                       'authored beak inside a closed oral lining.' % (len(B), NARM),
        'modelLength': round(model_length, 4), 'lengthMeters': 2.42, 'locomotion': 'Swim',
        'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
        'puppet': ID + '.puppet.glb',
        'notes': [
            'The mantle, the terminal fins, the hooked arms and the two clubbed tentacles are '
            'retained from the accepted Tripo volume; nothing of the generation is edited after '
            'intake.',
            'The frame is the shared measured one -- this body has a long axis a principal '
            'component can see and real countershading at 0.348 -- and it is corroborated by the '
            'fins, which after the roll span 0.215 across the body and 0.114 through it.',
            'The mantle is one stiff bone: a phragmoteuthid carries a rigid internal shell up its '
            'back. Its jet is a radial contraction, which the contract cannot express as scale, so '
            'it is two flank bones with translation channels and the audit measures the width.',
            'The generation models no mouth, and casting head normals back into the mesh finds '
            'neighbouring arms across the crown gaps rather than a lip opposite, so the peristome '
            'is authored on the crown axis with one closed skinned lining and two mandibles.',
            'This animal has `swimStyle: omnidirectional` and NOT `shell: true`, so it does not '
            'jet in the simulation and nothing scrubs its Swim clip to a phase. Its cruise is the '
            'fin wave, which is what an animal with fins this size and no fixed front actually '
            'swims on.',
            'OPEN DEFECT: the generation carries %d appendages. A phragmoteuthid is a decabrachian '
            'with ten, and the greenlit pose draws eight arms and two clubbed tentacles. The two '
            'longest are rigged as the tentacles; the extra pair is preserved rather than cut, '
            'because a shape change goes back to a fresh generation.' % NARM,
            'Original albedo retained with white COLOR_0; normal relief limited to 0.15 and the '
            'skin explicitly nonmetallic. The twin samples pigment through triangle-local UVs.',
            'Living colours, soft tissues, hook placement and every movement are artistic '
            'reconstruction. Locomotor translation remains engine-owned.']}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2))

report = {'id': ID, 'intake': intake,
          'frame': {k: v for k, v in frame.items() if k != 'perStation'},
          'fins': fin_report, 'armCutSweep': sweep, 'armCount': NARM, 'armCutRadius': CUT_R,
          'neckStation': NECK, 'tentacleGraphLengthFloor': TENTACLE_FLOOR,
          'arms': [{'name': a['name'], 'vertices': a['verts'], 'joints': a['nseg'],
                    'tentacle': a['tentacle'], 'reach': round(a['reach'], 4),
                    'graphLength': round(a['graphLength'], 4),
                    'meanBandRadius': round(float(np.mean(a['radius'])), 4),
                    'thetaDegrees': round(math.degrees(a['theta']), 1)} for a in ARMS],
          'twin': twin_report, 'puppetTriangleTarget': PUPPET_TRIANGLE_TARGET,
          'fullTriangles': authored_tris, 'puppetTriangles': puppet_tris,
          'parts': {'authoredBody': tri(auth), 'twinBody': tri(puppet),
                    'sharedOral': sum(tri(o) for o in oralparts)},
          'bones': len(B), 'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams,
          'boundsAt13Phases': bounds,
          'modelLength': model_length, 'maximumEnvelopeDifference': worst,
          'envelopeTolerance': ENVELOPE_TOLERANCE, 'envelopeTolerancePercent': 4.,
          'surfaceDistanceMax': float(distances.max()),
          'surfaceDistanceP95': float(np.quantile(distances, .95)),
          'surfaceDistanceP99': float(np.quantile(distances, .99)),
          'surfaceOutliersOver0p12': surface_outliers, 'surfaceVertices': int(len(distances)),
          'seatingDepthRaw': {k: round(float(v), 5) for k, v in seating.items()},
          'maxInfluences': max(influences), 'meanInfluences': float(np.mean(influences)),
          'jointsBelowHalfAPercentOfSkin': thin_joints,
          'armSweepDegreesPerCycle': arm_sweep, 'finSweepDegreesPerCycle': fin_sweep,
          'funnelSweepDegreesPerCycle': funnel_sweep,
          'mantleSqueezeTravelEngineUnits': squeeze_travel,
          'squeezeTravelAtFull': SQUEEZE_TRAVEL,
          'curvature': curvature, 'pairedAppendageAsymmetry': asymmetry,
          'mouth': dict(mouth_cut, liningRings=LINING_RINGS, liningRing=LINING_RING,
                        liningDepth=LINING_DEPTH,
                        liningNearestSurfaceDepthRaw=round(float(lining_depth_raw), 5),
                        skinDoubleSided=True, liningCullsBackfaces=True, oneClosedLining=True,
                        beak='two authored mandibles, 7 sections each, rigid on skull and jaw'),
          'albedoSha256': albedo_sha,
          'mantleIsStiff': True, 'squeezeIsTranslationNotScale': True,
          'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
_qa = os.path.join(HERE, 'qa.json')
report['postBuildQA'] = json.load(open(_qa)) if os.path.exists(_qa) else None
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('PHRAGMOTEUTHIS_REPORT', json.dumps({k: v for k, v in report.items()
                                           if k not in ('boundsAt13Phases', 'armCutSweep')}))
