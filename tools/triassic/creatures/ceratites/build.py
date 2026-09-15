"""Rebuild Ceratites: authored Tripo skin and measured voxel-volume twin on one shared rig.

Blender 5.2. The first coiled cephalopod in the era, and the first body here with no skull, no
spine and no paired limbs, so almost nothing the fourteen vertebrate builders established transfers
without being re-derived. What follows is what was *measured* off this generation and what was
decided from it; the partial builder rescued from a killed container (commit 28f1e9e) supplied the
frame argument, the rigid-shell rule and the soft-claim skinning idea, and every number in it has
been re-measured here through `_pipeline/tripo.py` rather than carried over on trust.

THE FRAME, and why the shared one cannot find it. `T.measure_frame` reads the long axis off the
first principal component and the roll off the countershading, and both fail on an ammonoid. The
bounding box says 0.75 x 1.00 x 0.69 -- three numbers that describe a disc with a spray of arms and
name no axis -- and the shell's ribs and tubercles drown the countershading harmonic (measured
0.262 against the module's 0.30 floor, so it refuses rather than guessing). So the frame is read off
the animal's own architecture: the **bulk** of the body (shell thickness > 0.10, 2413 vertices) is
the coil, its smallest principal axis is the coil axis, and a least-squares circle in the plane
normal to it finds the centre. That axis measures (-0.9998, 0.019, -0.011) -- the file's x to within
a degree -- so the shell's plane is the file's y-z, which for a planispiral ammonoid is the plane of
symmetry and therefore contains forward and dorsal. The thin mass (the arms) sits at (0.007, -0.318,
-0.090) from the coil centre: forward is -y. The coil centre sits 0.09 above the arms' centroid in
z, which puts the shell over the head: up is +z. So the era's frame (head at -Y, up +Z, one unit
long along Y, `export_yup` then putting the head at glTF +Z) is the frame this generation already
lies in, and `tx()` below is the identity times SCALE. That is a coincidence of this pose and not a
convention, so all three readings are asserted rather than assumed.

WHAT IS RIGID, AND WHY IT COSTS NOTHING. A shell is not armour on a body, it is the body's house.
`shell` is a bone with **no animation channel written for it in any clip** -- Placodus' gastral
basket and Henodus' carapace are the pattern -- parented to `body` so the whole animal still rolls
and pitches together. That has a consequence worth stating, because it is why this rig is safe: a
bone that never moves relative to its parent cannot tear the skin it shares with that parent, so the
long boundary between the coil and the mantle collar is free. The only boundaries that can tear are
head-to-body, head-to-arm and lip-to-face, and each of those is a ramp rather than a test.

WHAT THE GENERATION DOES NOT HAVE. It models no mouth: not a slit, not a lip line, not a beak. The
thirteen arms converge onto a smooth dome of skin. Both established ways of finding a mouth fail
here, and the dangerous one fails by appearing to succeed -- casting head vertex normals back into
the mesh (Placodus' method, `T.mouth_cavity`) returns hundreds of vertices spread over the whole
crown, because on an arm crown what a normal meets across a gap is the neighbouring arm, not the
lip opposite. That is a third way that method can lie, after Keichousaurus' countershading. So the
mouth is AUTHORED: a peristome cut in the crown's own dome on the crown's own axis, one closed
skinned lining wound inwards behind it, and two mandibles. A beak is two curved wedges, which is
far below the tooth-whorl bar the era's rules set; the rim of the cut is skin and keeps the skin's
UVs and material, and the lining and the mandibles are oral apparatus carrying their own materials,
exactly as every other Triassic mouth does.

WHAT THE SIMULATION ACTUALLY GIVES IT, which is not what a cephalopod suggests. `shell: true` in
`src/content/triassic/creatures.ts` makes `RULES.jet()` true: a free hover, and travel backwards
without turning round. It does **not** set `swimStyle: 'pulse'`, so `bell()` in
`src/render/creature.ts` returns false and nothing scrubs this clip to a phase -- the `Swim` clip
runs as a plain loop against a thrust the simulation applies smoothly. Authoring a one-`PULSE_CYCLE`
squeeze here, as the Cambrian's medusae carry, would therefore be a lie: the squeeze would drift
against the thrust within a few seconds. So `Swim` pumps the funnel twice per loop and `Sprint`
twice in half the time, which reads as an animal pumping without claiming the thrust arrives in
lumps. If this animal is ever given `swimStyle: 'pulse'`, this clip has to be re-timed to exactly
one `PULSE_CYCLE` with the squeeze filling the thrust window, and that is a deliberate re-author,
not a tuning.

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

ID = 'ceratites'
NAME = 'Ceratites'
SPECIES = 'C. nodosus'
LOCAL = os.path.join(ROOT, 'local/triassic-authoring', ID)
OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
RAW = os.path.join(HERE, 'tripo-raw', ID + '.raw.glb')
os.makedirs(LOCAL, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

SCALE = 5                                     # raw 1.0 body -> 5.00 engine authoring units
BODY_LENGTH = 1.0 * SCALE
ENVELOPE_TOLERANCE = .04 * BODY_LENGTH        # 4 % of body length, per the pipeline
ANCHOR_TOLERANCE = .02 * BODY_LENGTH          # 2 % of body length
PUPPET_TRIANGLE_TARGET = 7200
VOXEL = .0046
THIN, THIN_BAND = .034, .014
SLIVER_WELD = 5e-4

# The 21 contract clips and nothing else: the renderer names `Crawl` for ground bodies and `Breathe`
# for air breathers, and this animal is neither (`ground: false`, `breathing: 'gill'`), so either
# would be a clip nothing ever plays.
CLIPS = {'Idle': 2.6, 'Swim': 2.0, 'Sprint': 1.1, 'TurnLeft': 1.6, 'TurnRight': 1.6,
         'Dive': 1.4, 'Rise': 1.4, 'Attack': 1.0, 'Bite': .5, 'Heavy': 1.2, 'Hit': .6,
         'Death': 1.8, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5, 'Eat': 1.6, 'Stagger': 1.2,
         'Ability': 1.2, 'Grab': 1.2, 'Breath': 2.4, 'Growth': 1.5}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Breath']

smooth = T.smooth

# ----------------------------------------------------------------------------- intake ----
auth, intake = T.load_raw(RAW, NAME + ' authored body')
sample_albedo, luminance_at, albedo_sha, skin_material = T.retain_albedo(
    auth, NAME + ' shell and mantle', roughness=.58)
# The peristome is cut through the skin, so a culled skin would be a hole the open mouth looks out
# of. The lining below is what an open mouth is meant to show; this is the backstop under it.
skin_material.use_backface_culling = False

# A second weld at the triangulation's own scale. A raw Tripo body is unstitched patch soup, and
# every connected-component and graph-distance measurement below would otherwise measure the
# triangulation rather than the animal.
bm = bmesh.new(); bm.from_mesh(auth.data)
open_before = len([e for e in bm.edges if len(e.link_faces) < 2])
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=SLIVER_WELD)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
open_after = len([e for e in bm.edges if len(e.link_faces) < 2])
bm.to_mesh(auth.data); bm.free()
assert open_after == 0, ('the sliver weld left an open surface', open_before, open_after)
intake['sliverWeld'] = SLIVER_WELD
intake['openEdgesAtTextureWeld'] = open_before
intake['openEdgesAtSliverWeld'] = open_after
intake['weldedTriangles'] = sum(len(p.vertices) - 2 for p in auth.data.polygons)
intake['weldedVertices'] = len(auth.data.vertices)

# Anything this build authors wears the creature's own texture, sampled through the generation's own
# UVs at the nearest point of the intake surface. Snapshot it now, before any cut.
pigment = T.pigment_sampler(auth, sample_albedo)

P0 = np.array([v.co[:] for v in auth.data.vertices])
bvh0 = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                            [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
thickness = T.neighbourhood_minimum(auth.data, T.shell_thickness(auth.data, bvh0))
thin_mask = thickness < THIN

# -------------------------------------------------------- the frame, measured not assumed ----
# The coil is the bulk: a disc has one small principal axis and that axis is the coil's.
BULK = thickness > .10
bulk = P0[BULK]
assert len(bulk) > 1200, ('the shell did not measure as bulk', int(BULK.sum()))
cb = bulk.mean(0)
_u, sv, vt = np.linalg.svd(bulk - cb, full_matrices=False)
COIL_AXIS = vt[2] * (1. if vt[2][0] > 0 else -1.)                 # +x, by convention below
e1, e2 = vt[0], vt[1]
Q = np.c_[(bulk - cb) @ e1, (bulk - cb) @ e2]
A = np.c_[2 * Q, np.ones(len(Q))]
sol, *_ = np.linalg.lstsq(A, (Q ** 2).sum(1), rcond=None)
COIL = cb + e1 * float(sol[0]) + e2 * float(sol[1])
COIL_FIT_R = float(math.sqrt(max(0., float(sol[2]) + float(sol[0]) ** 2 + float(sol[1]) ** 2)))

# 1. The coil axis is the file's x, so the shell's plane is y-z: for a planispiral ammonoid that is
#    the plane of symmetry, which is what makes the rest of this frame readable at all.
assert abs(float(COIL_AXIS[0])) > .99, ('the coil axis is not the file x', COIL_AXIS.tolist())
# 2. The arms are the thin mass, and they fan forward. Forward is -y.
arms_centroid = P0[thin_mask].mean(0)
assert float(arms_centroid[1] - COIL[1]) < -.15, ('the arms must lie forward of the coil', arms_centroid.tolist())
assert abs(float(arms_centroid[0] - COIL[0])) < .05, 'the arms must fan about the plane of symmetry'
# 3. The shell stands over the head. Up is +z.
assert float(COIL[2] - arms_centroid[2]) > .04, ('the shell must stand over the head', COIL.tolist(), arms_centroid.tolist())

radial = np.hypot(P0[:, 1] - COIL[1], P0[:, 2] - COIL[2])
# The rigid region's outer edge is the shell's own outer whorl, the 99th percentile of the radius
# over the bulk rather than its maximum, so one stray tubercle does not set the boundary.
SHELL_R = float(np.quantile(radial[BULK], .99))
coil_report = {'axisInFile': COIL_AXIS.round(4).tolist(), 'centre': COIL.round(5).tolist(),
               'leastSquaresRadius': round(COIL_FIT_R, 4), 'outerWhorlRadius': round(SHELL_R, 4),
               'bulkVertices': int(BULK.sum()), 'singularValues': (sv / sv[0]).round(4).tolist(),
               'armsCentroid': arms_centroid.round(4).tolist()}

depth, bvh_auth = T.depth_probe(auth)


def seat_deepest(seed, span=.085, step=.011, midline=True):
    """The deepest interior point within `span` of a seed, on the midline where asked.

    A centroid of surface points is a point ON the surface, not inside it, and the crown's surface
    is a dome open towards the arms, so its centroid sits outside the animal. `T.seat` pulls a root
    radially in towards a centreline, which is Cheirolepis' rule, and an arm crown has no section
    ellipse to be radial about -- so the same requirement (a joint at least a margin inside the
    skin) is met here by search instead.
    """
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


# ------------------------------------------------------- the crown, and how many arms it has ----
# The crown's convergence point is where the arms leave the head. It is found by walking a cut
# sphere in from the aperture: too far back and the cut opens the body chamber, too far forward and
# the arms are already separate before it. Seed on the midline, a little forward and below the coil
# centre, then seat it inside the skin.
CROWN_SEED = np.array([0., float(COIL[1]) - SHELL_R * 1.15, float(COIL[2]) - SHELL_R * .35])
CROWN, CROWN_DEPTH = seat_deepest(CROWN_SEED, span=.05, step=.010)
CROWN = np.array([0., float(CROWN[1]), float(CROWN[2])])
CROWN_AXIS = np.array([0., -1., 0.])


def cut_sphere(centre, R):
    """Everything the mesh falls into when a sphere is taken out of it, largest component first."""
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


# **The arm count is measured, not named.** An arm crown fuses near the base, so how many arms a cut
# finds depends on where the cut is taken -- that dependence is the measurement. The sweep below
# takes the smallest radius at which the count has settled: the count rises with radius, plateaus,
# and the plateau is the animal's real arm count.
# Measured on this generation: the count runs 6, 9, 11, 11, 12, 12, 12, 12, 13, 13, 13 as the cut
# radius goes 0.10 to 0.22. The 12 that holds over four radii is not the answer -- one of those
# twelve components is twice the size of its neighbours, which is two arms still fused at the base --
# and the 13 that holds over the last three is. So the reading is the **highest** settled count, not
# the first plateau, and the cut is taken at the smallest radius that reaches it.
ARM_MIN = 100
sweep = []
for R in [round(x, 3) for x in np.arange(.10, .225, .01)]:
    b, comps = cut_sphere(CROWN, R)
    parts = [len(c) for c in comps[1:] if len(c) >= ARM_MIN]
    sweep.append({'radius': R, 'arms': len(parts), 'sizes': [len(c) for c in comps[:18]],
                  'largestOverMedian': round(max(parts) / np.median(parts), 2) if parts else None})
    b.free()
NARM = max(s['arms'] for s in sweep)
CUT_R = float(min(s['radius'] for s in sweep if s['arms'] == NARM))
assert NARM >= 8, ('the crown did not separate into arms', sweep)
assert sum(1 for s in sweep if s['arms'] == NARM) >= 3, ('the arm count never settled', sweep)
# At the chosen radius no surviving component may still be twice its neighbours: that is the
# signature of the fused pair the plateau below it was hiding.
settled = next(s for s in sweep if s['radius'] == CUT_R)
assert settled['largestOverMedian'] < 1.75, ('two arms are still fused at the cut', settled)

ARM_SEG = 5                     # five bones per arm: `conformArms` needs more than four to engage
SEG_GAIN = 2.0 / 5              # a unit of sweep is about 90 degrees accumulated down the chain


def arm_centrelines():
    """A centreline per arm, measured by graph distance through the arm's own skin.

    An arm that curls cannot be parametrised by distance from the crown: its tip comes back towards
    the head and the radius stops being monotonic half way along. What stays monotonic is distance
    *through the skin*, so the crown is cut off at one sphere, each surviving piece's graph distance
    from its own cut ring is measured over the mesh edges, and the centroid of each band of that
    distance is one station of that arm's centreline. This follows a curled arm all the way round,
    and the mean spread of each band is that station's radius -- measured off the generation rather
    than named.
    """
    b, comps = cut_sphere(CROWN, CUT_R)
    c = Vector(CROWN.tolist())
    found = []
    for part in comps[1:]:
        if len(part) < ARM_MIN:
            continue
        ring = [v for v in part if any(len(e.link_faces) < 2 for e in v.link_edges)]
        base = [v for v in ring if (v.co - c).length < CUT_R * 1.3] or ring
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
        pts, rad = [], []
        for k in range(ARM_SEG):
            lo = dmax * k / ARM_SEG
            hi = dmax * (k + 1.15) / ARM_SEG
            band = [v for v in part if lo <= dist.get(v, 1e9) <= hi]
            if len(band) < 3:
                continue
            q = np.array([v.co[:] for v in band])
            m = q.mean(0)
            pts.append(m)
            rad.append(float(np.linalg.norm(q - m, axis=1).mean()))
        if len(pts) < 3:
            continue
        # One station inboard of the cut, so the arm's root is inside the crown rather than on the
        # sphere the crown was taken out with.
        root = np.array(pts[0])
        inward = CROWN - root
        n = float(np.linalg.norm(inward))
        pts = [root + inward / max(n, 1e-9) * min(n * .75, CUT_R * .70)] + pts
        rad = [rad[0] * 1.15] + rad
        found.append({'pts': [np.asarray(p, float).tolist() for p in pts], 'radius': rad,
                      'verts': len(part), 'graphLength': float(dmax)})
    b.free()
    return found


ARMS = arm_centrelines()
assert len(ARMS) == NARM, ('the centreline pass lost an arm', len(ARMS), NARM)
# Name them by where they stand round the crown, so `arm_00` is the same arm on every rebuild: the
# angle of the tip about the crown axis, measured in the animal's own up/side frame.
UP = np.array([0., 0., 1.])
SIDE = np.cross(CROWN_AXIS, UP)
for a in ARMS:
    d = np.array(a['pts'][-1]) - CROWN
    a['theta'] = float(math.atan2(float(d @ UP), float(d @ SIDE)))
ARMS.sort(key=lambda a: a['theta'])
for i, a in enumerate(ARMS):
    a['name'] = 'arm_%02d' % i
    a['reach'] = float(np.linalg.norm(np.array(a['pts'][-1]) - CROWN))
# **Seat every arm root**, which is the era's standing rule for an appendage root and is not
# automatic here: the root station is placed by walking in from the first measured band towards the
# crown, and on an arm whose base curves that straight line leaves the skin (arm_05 came out 0.0026
# outside). `T.seat` is Cheirolepis' rule -- pull the root in towards the body's own centre until it
# clears a margin -- and the crown is what an arm crown has instead of a centreline.
ROOT_MARGIN = .010
for a in ARMS:
    a['pts'][0] = list(T.seat(Vector([float(x) for x in a['pts'][0]]), Vector(CROWN.tolist()),
                              depth, margin=ROOT_MARGIN, steps=60))

# ----------------------------------------------------------- the head and the hyponome ----
# The head is the soft mass forward of the aperture and inboard of the arms: the centroid of the
# skin between the shell's outer whorl and the crown, seated inside the body.
headish = (radial > SHELL_R * .84) & (P0[:, 1] < float(COIL[1]) - SHELL_R * .55) & (~thin_mask)
HEAD_SEED = P0[headish].mean(0) if headish.sum() > 40 else (CROWN + np.array([0., .10, .03]))
HEAD, HEAD_DEPTH = seat_deepest(HEAD_SEED)
HEAD = np.array([0., float(HEAD[1]), float(HEAD[2])])

# An ammonoid's funnel sits under the head, inside the aperture, pointing forward past the crown: it
# is what the jet comes out of, and on this animal it is the one part whose motion IS the
# locomotion. The generation models no funnel tube -- Tripo closed the aperture over it -- so the
# bone is seated in the ventral soft mass under the head and owns the ventral patch of skin there,
# which is the surface a jet would push against.
FUNNEL, FUNNEL_DEPTH = seat_deepest(np.array([0., float(HEAD[1]) - .020, float(HEAD[2]) - .075]),
                                    span=.070, step=.010)
FUNNEL = np.array([0., float(FUNNEL[1]), float(FUNNEL[2])])
# The joint has to sit inside the body and the skin it owns has to be on the outside of it, and a
# sphere about a seated joint is not the same thing: `seat_deepest` maximises depth, so on a head
# this thick the nearest skin was further than any sensible claim radius and `funnel` finished the
# first build owning **no vertices at all** -- which `idle-bones.mjs` exists to catch and did. So
# the patch is anchored where the ventral skin actually is: a ray straight down from the joint.
_hit = bvh_auth.ray_cast(Vector(FUNNEL.tolist()), Vector((0., 0., -1.)), .5)
assert _hit[0] is not None, 'no ventral skin under the funnel'
FUNNEL_SKIN = np.array(_hit[0][:])

# ----------------------------------------------------------- the peristome, on the crown axis ----
# The peristome's size is measured off the arms, not off the crown's own spread. Scaling it by the
# spread of the arm roots was the first try and it is wrong twice over: the spread is set by where
# the cut sphere happened to fall, so the mouth grew with an unrelated parameter, and at 0.070 it
# took 1403 faces out of the crown -- a crater, not a mouth. A cephalopod's beak is about as thick
# through as a couple of its own arms, and the arms' band radius is already measured.
ARM_BAND = float(np.mean([np.mean(a['radius']) for a in ARMS]))
ROOT_SPREAD = float(np.mean([np.linalg.norm(np.array(a['pts'][1]) - CROWN) for a in ARMS]))
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
_start = Vector((CROWN + CROWN_DIR * .40).tolist())
_hit = bvh_auth.ray_cast(_start, Vector((-CROWN_DIR).tolist()), .8)
assert _hit[0] is not None, 'no crown surface on the axis'
MOUTH_P = np.array(_hit[0][:])
MOUTH_P = np.array([0., float(MOUTH_P[1]), float(MOUTH_P[2])])
M_N = CROWN_DIR                                      # out of the head, down the crown's own axis
M_DN = np.array([0., 0., -1.]) - M_N * float(np.array([0., 0., -1.]) @ M_N)
M_DN /= np.linalg.norm(M_DN)                         # ventral, in the mouth's plane
M_DS = np.cross(M_N, M_DN)                           # across the mouth


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


# ------------------------------------ the procedural twin: resurface the measured occupancy ----
# Regenerated topology, not a decimation: no source vertex or face survives the remesh. Lofting is
# hopeless on a disc with thirteen arms leaving one point, so this is the voxel route Nothosaurus
# and Henodus take, at a finer voxel than any vertebrate in the era because it has to resolve an arm
# 0.05 through. The twin is made from the UNCUT body and the peristome is then cut in both, so the
# cut is one geometric test applied twice rather than a hole a voxel field would simply close.
puppet, pup_thickness, twin_report, _bvh = T.build_twin(
    auth, thickness, NAME + ' procedural volume twin', voxel=VOXEL,
    triangle_target=PUPPET_TRIANGLE_TARGET, sample_albedo=sample_albedo,
    blade_dilation=.0035, thin=THIN, band=THIN_BAND, roughness=.70)

mouth_cut = {}
for o, key in ((auth, 'authored'), (puppet, 'twin')):
    n, pts = cut_peristome(o)
    mouth_cut[key] = {'facesRemoved': int(n), 'rimVertices': int(len(pts))}
    assert n >= (7 if key == 'authored' else 3), ('the peristome cut found no faces on the ' + key, n)
    assert len(pts) >= (9 if key == 'authored' else 5), ('the peristome left no rim on the ' + key, len(pts))
    if key == 'authored':
        PERISTOME = pts
mouth_cut.update({'centre': MOUTH_P.round(5).tolist(), 'normal': M_N.round(4).tolist(),
                  'radius': round(MOUTH_R, 5), 'rootSpread': round(ROOT_SPREAD, 5),
                  'armBandRadius': round(ARM_BAND, 5),
                  'method': 'authored on the crown axis: the generation models no mouth at all, and '
                            'casting head normals back into the mesh finds neighbouring arms across '
                            'the gaps rather than a lip opposite'})

# ------------------------------------------------------------------------ shared skeleton ----
def tx(p):
    return Vector((float(p[0]) * SCALE, float(p[1]) * SCALE, float(p[2]) * SCALE))


B, ORDER = {}, []


def bone(n, p, parent):
    B[n] = (Vector([float(q) for q in p]), parent)
    ORDER.append(n)


bone('root', (0, 0, 0), None)
# `body` is the whole animal's soft frame AND owns the mantle collar round the aperture, so it is a
# bone that carries skin rather than a second unweighted carrier: this rig has exactly one of those
# and `idle-bones.mjs` excludes it by name.
bone('body', (0, float(COIL[1]) - SHELL_R * .45, float(COIL[2]) - SHELL_R * .35), 'root')
# The coil. No channel is ever written for it in any clip, so it is rigid in the animal's own frame
# while still being carried when the whole body rolls.
bone('shell', (0, float(COIL[1]), float(COIL[2])), 'body')
bone('head', tuple(HEAD), 'body')
bone('funnel', tuple(FUNNEL), 'body')
# The beak. `skull` is the upper mandible and the roof of the lining, `jaw` the lower mandible and
# its floor, both inside the crown rather than on a head: the names are the contract's, and
# `gape-solid.py` and `attachments.ts` both look for them by name.
BEAK_BACK = MOUTH_P - M_N * MOUTH_R * .55
bone('skull', tuple(BEAK_BACK + M_DN * MOUTH_R * .10), 'head')
bone('jaw', tuple(BEAK_BACK + M_DN * MOUTH_R * .30), 'skull')
for a in ARMS:
    for i, p in enumerate(a['pts'][:-1]):
        bone('%s_%02d' % (a['name'], i), tuple(p),
             'head' if i == 0 else '%s_%02d' % (a['name'], i - 1))

# Every joint must sit inside the intake surface, which is the era's standing rule for an appendage
# root and is checked on every builder.
seating = {'shell': depth(Vector(COIL.tolist())), 'head': depth(Vector(HEAD.tolist())),
           'funnel': depth(Vector(FUNNEL.tolist())), 'crown': float(CROWN_DEPTH)}
for a in ARMS:
    seating[a['name'] + '_00'] = depth(Vector([float(x) for x in a['pts'][0]]))
for n, d in seating.items():
    assert d > .006, ('a joint sits outside the body', n, round(float(d), 4))

# --------------------------------------------------------------------------------- weights ----
# Nothing about a vertebrate weighting scheme survives here, and the reason is the crown. Thirteen
# arms leave one point and TOUCH EACH OTHER along their length -- which is exactly why the cut-sphere
# count rises with radius before it settles -- so a winner-takes-all assignment of the kind every
# limbed body in this era uses would put a seam straight down every contact, and those are the edges
# that tear when the crown opens. Every arm's claim is therefore SOFT: each arm gets a feathered
# claim, the claims are summed, and where the sum exceeds one they are scaled down together rather
# than one of them winning. Skin between two arms is held by both and moves with the average.
#
# Both ends of every claim are feathered as well. A hard `lo < s < hi` window lets an arm run past
# its own root or its own tip and take a ring of skin with it, and that is the other way a crown
# tears. And `T.relax_weights` runs over the whole field afterwards, which is what turns any gate's
# remaining edge into a ramp.
ARM_IN, ARM_OUT = 1.20, 2.40           # multiples of the measured band radius: core, then skirt
ARM_SEAT = .050                        # arc length over which a root fades in, inside the crown

ARMFIT = []
for a in ARMS:
    P, cum = T.polyline(a['pts'])
    ARMFIT.append((a['name'], P, cum, a['radius']))


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
    """Which bone of this arm owns a point at fractional segment `seg`, feathered between them.
    A wide feather, because a curling arm creases at a joint whose blend is narrow."""
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
    for name, P, cum, rad in ARMFIT:
        dist, s, seg = project_seg(P, cum, q)
        t = s / max(cum[-1], 1e-9)
        band = float(np.interp(t * (len(rad) - 1), np.arange(len(rad)), rad))
        rin, rout = band * ARM_IN, band * ARM_OUT
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / max(rout - rin, 1e-9))) \
            * smooth(s / ARM_SEAT)
        if alpha <= 1e-4:
            continue
        claims.append((alpha, arm_chain(name, seg, len(P) - 1)))
        total += alpha
    if not claims:
        return {}, 0.
    k = 1. / max(1., total)
    out = {}
    for alpha, chain in claims:
        for n, w in chain.items():
            out[n] = out.get(n, 0.) + alpha * k * w
    return out, min(1., total)


# The rigid coil, and the two things that must never join it: skin an arm has any claim on, and skin
# near the head. Both are subtracted rather than tested against, so the boundary is a ramp.
SHELL_BAND = .050
HEAD_KEEP, HEAD_BAND = .100, .080
COIL_V = Vector((0., float(COIL[1]), float(COIL[2])))
HEAD_V = Vector(HEAD.tolist())
FUNNEL_V = Vector(FUNNEL_SKIN.tolist())
FUNNEL_R, FUNNEL_BAND = .055, .045
LIP_BAND = MOUTH_R * 2.0


def shell_share(q):
    r = math.hypot(q.y - float(COIL[1]), q.z - float(COIL[2]))
    return smooth((SHELL_R - r) / SHELL_BAND) * smooth(((HEAD_V - q).length - HEAD_KEEP) / HEAD_BAND)


def funnel_share(q):
    return smooth((FUNNEL_R - (q - FUNNEL_V).length) / FUNNEL_BAND)


def lip_share(q):
    """The peristome's own lips: the rim of the cut and a band of skin round it purse open with the
    beak, ventral rim onto `jaw` and dorsal rim onto `skull`, fading into `head`. This is what makes
    the mouth an opening rather than a hole with a beak behind it."""
    a, dn, ds = mouth_local(q[:])
    lat = math.hypot(dn, ds)
    ring = smooth((MOUTH_R + LIP_BAND - lat) / LIP_BAND) \
        * smooth((MOUTH_R * 2.0 - abs(a)) / (MOUTH_R * 1.0))
    if ring <= 0:
        return 0., 0.
    return ring, max(0., min(1., .5 + .5 * dn / max(lat, 1e-9)))


AXIAL_FRONT = float(HEAD[1])
AXIAL_BACK = float(COIL[1]) - SHELL_R * .30


def weights(p):
    q = Vector([float(c) for c in p])
    arms, claimed = arm_claims(q)
    g = shell_share(q) * (1 - claimed)
    f = funnel_share(q) * (1 - claimed) * (1 - g)
    ring, ventral = lip_share(q)
    lip = ring * (1 - claimed) * (1 - g)
    rest = max(0., 1 - claimed - g - f - lip)
    w = dict(arms)
    if rest > 0:
        # What is left over goes to the head/body axial blend, measured along the animal's own
        # forward axis: `head` at the crown, `body` back at the aperture collar.
        t = smooth((float(q.y) - AXIAL_BACK) / (AXIAL_FRONT - AXIAL_BACK))
        w['head'] = w.get('head', 0.) + rest * t
        w['body'] = w.get('body', 0.) + rest * (1 - t)
    if g > 0:
        w['shell'] = w.get('shell', 0.) + g
    if f > 0:
        w['funnel'] = w.get('funnel', 0.) + f
    if lip > 0:
        w['jaw'] = w.get('jaw', 0.) + lip * ventral
        w['skull'] = w.get('skull', 0.) + lip * (1 - ventral)
    w = {n: v for n, v in w.items() if v > 1e-8}
    assert w, ('unweighted vertex', list(p))
    return w


# ------------------------------------------------------------------- build the armature ----
arm_data = bpy.data.armatures.new(NAME + ' shared skeleton')
rig = bpy.data.objects.new(NAME.replace(' ', '_') + '_Rig', arm_data)
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
    per_vertex = [weights(v.co) for v in o.data.vertices]
    per_vertex = T.relax_weights(o, per_vertex, passes=3, keep=4, hold=.45)
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

print('CERATITES_WEIGHTS', json.dumps({n: round(weight_tally.get(n, 0.), 2) for n in ORDER}))
idle = [n for n in ORDER if n != 'root' and weight_tally.get(n, 0.) <= 0.]
assert not idle, ('a joint owns no skin at all', idle)
thin_joints = sorted(((n, round(weight_tally[n] / sum(weight_tally.values()), 6))
                      for n in weight_tally if weight_tally[n] / sum(weight_tally.values()) < .0005))

# ----------------------------------------------- the mouth interior: one closed skinned lining ----
# Roof on the skull, floor on the jaw, wall stretching between them, wound inwards so the near wall
# culls and the far wall draws, with the skin double-sided behind it as the backstop. One lining,
# not two tubes: two tubes look identical at rest and part the moment the beak opens, which is how
# Placodus came to open onto transparency.
mouth_material = T.inward_material(NAME + ' mouth interior', (.21, .085, .085, 1), roughness=.60)
beak_material = T.opaque_material(NAME + ' beak', (.055, .042, .036, 1), roughness=.34)
oralparts = []
LINING_RINGS, LINING_RING = 16, 14


def axial_room(margin=.006, limit=.30, step=.002):
    """How far back the head goes on the mouth's own axis. The lining's closed end has to be inside
    the animal, and a fraction of the mouth radius is not a measurement of that."""
    inside, room = False, 0.
    for t in np.arange(step, limit, step):
        d = depth(Vector((MOUTH_P - M_N * float(t)).tolist()))
        if d >= margin:
            inside, room = True, float(t)
        elif inside:
            break
    return room


HEAD_ROOM = axial_room()
LINING_DEPTH = min(MOUTH_R * 2.3, HEAD_ROOM * .80)
assert LINING_DEPTH > MOUTH_R * .8, ('no room for a mouth behind the peristome', HEAD_ROOM)


def mouth_point(a, dn, ds):
    return Vector((MOUTH_P + M_N * a + M_DN * dn + M_DS * ds).tolist())


def build_lining():
    verts, raw, faces = [], [], []
    for i in range(LINING_RINGS):
        u = i / (LINING_RINGS - 1)
        a = -LINING_DEPTH * u + MOUTH_R * .18          # from just outside the rim, back into the head
        r = MOUTH_R * (1.02 - .78 * smooth(max(0., (u - .35) / .65)))
        for j in range(LINING_RING):
            th = j * 2 * pi / LINING_RING
            p = mouth_point(a, r * math.sin(th), r * math.cos(th))
            raw.append(np.array(p[:]))
            verts.append(tx(p))
    for i in range(LINING_RINGS - 1):
        for j in range(LINING_RING):
            x = i * LINING_RING + j
            y = i * LINING_RING + (j + 1) % LINING_RING
            faces.append((x, y, y + LINING_RING, x + LINING_RING))
    faces.append(tuple(reversed(range(LINING_RING))))
    faces.append(tuple(range((LINING_RINGS - 1) * LINING_RING, LINING_RINGS * LINING_RING)))
    me = bpy.data.meshes.new(NAME + ' oral lining')
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(NAME + ' oral lining', me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(mouth_material)
    for n in ('skull', 'jaw'):
        o.vertex_groups.new(name=n)
    for idx, p in enumerate(raw):
        _a, dn, _ds = mouth_local(p)
        # Ventral half rides the lower mandible, dorsal half the upper, and the wall between them
        # stretches. The share also fades to the skull at the back of the sac, so the closed end
        # never parts from the roof.
        u = idx // LINING_RING / (LINING_RINGS - 1)
        g = max(0., min(1., .5 + .5 * dn / max(MOUTH_R, 1e-9))) * (1 - smooth(max(0., (u - .45) / .55)))
        o.vertex_groups['jaw'].add([idx], g, 'REPLACE')
        o.vertex_groups['skull'].add([idx], 1 - g, 'REPLACE')
    for p in o.data.polygons:
        p.use_smooth = True
    mod = o.modifiers.new('Oral membrane', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    return o


oralparts.append(build_lining())


def build_mandible(name, bone_name, sign):
    """One mandible: a curved wedge from the hinge to a hooked point, on the crown axis.

    Two wedges is as much shape as a beak has, which is why this is authored at all -- the era's
    rule is that what may be authored is decided by how *simple* the shape is, and a beak is far
    below the tooth-whorl bar it sets. It carries the oral apparatus' own material rather than the
    skin's, exactly as every other Triassic mouth lining and tooth does: a beak is chitin, and
    painting it with the mantle's pigment would be the error the rule is about, not the fix for it.
    """
    SECT = 7
    verts, faces = [], []
    for i in range(SECT):
        u = i / (SECT - 1)
        a = -MOUTH_R * .55 + MOUTH_R * .75 * u                   # from the hinge out to the rim
        dn = sign * MOUTH_R * (.26 - .30 * u ** 2)               # curls in towards the axis
        w = MOUTH_R * (.62 - .52 * u) * (1 - .25 * u)            # narrows to the point
        h = MOUTH_R * (.30 - .26 * u)
        base = len(verts)
        for j, (sx, sz) in enumerate(((-1, -1), (1, -1), (1, 1), (-1, 1))):
            verts.append(tx(mouth_point(a, dn + sz * h * sign * -1, sx * w)))
        if i:
            for j in range(4):
                k = (j + 1) % 4
                faces.append((base - 4 + j, base - 4 + k, base + k, base + j))
    faces.append((0, 1, 2, 3))
    faces.append((len(verts) - 1, len(verts) - 2, len(verts) - 3, len(verts) - 4))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(beak_material)
    g = o.vertex_groups.new(name=bone_name)
    g.add(list(range(len(o.data.vertices))), 1., 'REPLACE')
    for p in o.data.polygons:
        p.use_smooth = False
    mod = o.modifiers.new('Rigid mandible', 'ARMATURE')
    mod.object = rig
    o.parent = rig
    return o


oralparts.append(build_mandible(NAME + ' upper mandible', 'skull', -1))
oralparts.append(build_mandible(NAME + ' lower mandible', 'jaw', 1))

# The lining's closed end must be inside the head, or an open mouth shows a sac hanging in the water.
lining_back = mouth_point(-LINING_DEPTH + MOUTH_R * .18, 0, 0)
lining_depth_raw = depth(lining_back)
assert lining_depth_raw > .004, ('the lining reaches outside the head', round(float(lining_depth_raw), 5))

# --------------------------------------------- measured comparison of the two real surfaces ----
auth_v = np.array([v.co[:] for v in auth.data.vertices])
Y_LO, Y_HI = float(auth_v[:, 1].min()), float(auth_v[:, 1].max())
model_length = Y_HI - Y_LO
profile_rows, worst = T.paired_profile(AUTH_GROUP, PUP_GROUP, Y_LO + .02 * model_length,
                                       Y_HI - .02 * model_length, ENVELOPE_TOLERANCE, stations=21)
bvh_twin = BVHTree.FromPolygons([v.co for v in puppet.data.vertices],
                                [p.vertices[:] for p in puppet.data.polygons], all_triangles=False)
distances = []
for v in auth.data.vertices:
    loc, _n, _i, d = bvh_twin.find_nearest(v.co)
    distances.append(float(d))
distances = np.array(distances)
surface_outliers = int((distances > .12 * SCALE / 5).sum())

# ------------------------------------ the shape record a later neutral-pose pass needs ----
# Two numbers the neutral-pose pass (task #24) reads: how far from straight each run of this body
# is in units of its own thickness, and how far a paired appendage is from being its partner
# mirrored. An arm crown has no paired appendages in the vertebrate sense, so the pairing here is
# **across the plane of symmetry**: arm i against the arm whose angle about the crown axis is its
# reflection, which is what a mirror would have to match.
curvature = {}
for a in ARMS[:: max(1, len(ARMS) // 5)]:
    curvature[a['name']] = T.curvature_over_section(a['pts'], lambda _y, r=np.mean(a['radius']): r)
curvature['allArms'] = {
    'meanCurvatureRadiusOverSection': float(np.mean([c['meanCurvatureRadiusOverSection']
                                                     for c in curvature.values()
                                                     if c.get('meanCurvatureRadiusOverSection')])),
    'note': 'per arm, the arm centreline against its own measured band radius'}
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
asymmetry = {'method': 'each arm against its reflection in the shell plane, the nearest arm by '
                       'angle about the crown axis; an arm crown has no paired limbs',
             'arms': mirror,
             'meanMirrorDistanceOverBodyLength':
                 round(float(np.mean([m['meanMirrorDistanceOverBodyLength'] for m in mirror.values()])), 4),
             'maxMirrorDistanceOverBodyLength':
                 round(float(max(m['maxMirrorDistanceOverBodyLength'] for m in mirror.values())), 4),
             'armCount': NARM, 'oddArmCount': NARM % 2 == 1}

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


ARM_NAMES = [[('%s_%02d' % (a['name'], i)) for i in range(ARM_SEG)] for a in ARMS]
ARM_THETA = [a['theta'] for a in ARMS]
AMP = {'Idle': .35, 'Swim': 1., 'Sprint': 1.35, 'Eat': .55, 'Guard': .20, 'Breath': .45,
       'Dodge': 1.1, 'Ability': .30, 'Grab': .8, 'Growth': .45, 'Hit': .8, 'Stagger': .9}
arm_sweep, funnel_sweep, seams, bounds = {}, {}, {}, {}

for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    first = None
    arm_angles = {n: [] for n in [a['name'] for a in ARMS]}
    funnel_angles = []
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

        # ---- the jet. Two pumps a loop in Swim, two in half the time in Sprint. The squeeze is a
        # fast contraction and a slow refill, which is what a funnel does, but it is NOT locked to a
        # simulation phase: this animal is not a `swimStyle: 'pulse'` swimmer (see the header), so
        # the clip is an honest repeating pump rather than a claim about when thrust arrives.
        beats = 2 if clip in ('Swim', 'Breath') else (2 if clip == 'Sprint' else 1)
        ph = (u * beats) % 1.
        squeeze = (sin(pi * ph / .34) ** 2 if ph < .34 else 0.) if clip in ('Swim', 'Sprint') else 0.
        if clip == 'Breath':
            squeeze = .35 * (1 - cos(2 * pi * ph)) / 2          # gill ventilation, not thrust
        if clip == 'Idle':
            squeeze = .12 * (1 - cos(p)) / 2
        if clip == 'Ability':
            squeeze = .10 * (1 - cos(p)) / 2                    # shell hover: hanging on chambers
        if clip == 'Dodge':
            squeeze = e
        if clip == 'Heavy':
            squeeze = .25 * e
        if clip == 'Guard':
            # A held pose is still a clip, and the packaging audit refuses one that does not move a
            # value: an animal braced behind its own arms still breathes and still rocks.
            squeeze = .22 + .10 * (1 - cos(p)) / 2

        # The funnel is the one part of this animal whose motion is the locomotion. It swings to
        # vector the jet -- forward in Dive, back in Rise, to the side in a turn -- and pumps.
        fn = pb['funnel']
        fn.rotation_euler.x = (-.55 * squeeze
                               + (.42 if clip == 'Dive' else -.42 if clip == 'Rise' else 0.) * e
                               + .12 * dead)
        fn.rotation_euler.z = turn * .55 + (.10 * sin(p) * env if clip == 'Idle' else 0.)
        funnel_angles.append(fn.rotation_euler.to_quaternion())

        # ---- the head. A head that lives in a shell nods and swings a little and no more; this is
        # also what keeps the aperture from tearing, since `head` is the only bone that moves
        # against the rigid coil.
        hd = pb['head']
        withdraw = (e if clip == 'Heavy' else 1. if clip == 'Guard' else
                    .55 * e if clip in ('Hit', 'Stagger', 'Parry') else dead)
        hd.rotation_euler.x = -.10 * squeeze + .16 * withdraw
        hd.location.y = (.055 * withdraw + .012 * squeeze) * SCALE
        hd.rotation_euler.z = turn * .18
        if clip in ('TurnLeft', 'TurnRight'):
            hd.rotation_euler.z = turn * .26

        # ---- the beak. Shut everywhere but the clips that use it, which is the era's standing rule.
        opening = .02 * (1 - cos(p)) * env if clip in ('Idle', 'Breath') else 0.
        if clip == 'Eat':
            opening = .34 * (1 - cos(p * 2)) / 2
        if clip == 'Bite':
            opening = .62 * sin(pi * u) ** 2
        if clip == 'Attack':
            opening = .22 * wind + .58 * peak
        if clip == 'Heavy':
            opening = .10 * (1 - e)
        if clip == 'Grab':
            opening = .18 * e
        if clip == 'Ability':
            opening = .04 * e
        opening += .30 * dead
        pb['jaw'].rotation_euler.x = opening
        pb['skull'].rotation_euler.x = -.30 * opening

        # ---- the arms. The crown is this animal's reach, its grip and half its silhouette, so
        # every clip has to use it. `spread` fans the crown open, `sweep` drives it back along the
        # body (the jet's recovery stroke), `curl` rolls each arm up from the tip.
        for ai, names in enumerate(ARM_NAMES):
            th = ARM_THETA[ai]
            lat = math.cos(th)                       # +1 on one flank, -1 on the other
            ventral = math.sin(th)
            phase = th * .5
            spread = .10 * amp * sin(p - phase) * env
            sweep = 0.
            curl = 0.
            if clip in ('Swim', 'Sprint'):
                # Back on the squeeze, open again on the refill: an arm crown streamlines behind a
                # jetting shell and fans out to brake and to steer.
                sweep = -.48 * squeeze + .16 * (1 - squeeze)
                spread = .07 * sin(p * beats - phase)
            if clip == 'Idle':
                sweep = .10 + .05 * sin(p - phase)
            if clip == 'Breath':
                sweep = .06 + .05 * sin(p * 2 - phase)
            if clip == 'Ability':
                sweep = .30 * e                      # hanging still with the crown wide
                spread = .05 * sin(p - phase) * env
            if clip in ('TurnLeft', 'TurnRight'):
                sweep = .22 * e * (1 + .8 * lat * (1 if clip == 'TurnRight' else -1))
            if clip in ('Dive', 'Rise'):
                sweep = .16 * e * (1 + .6 * ventral * (1 if clip == 'Dive' else -1))
            if clip in ('Attack', 'Bite', 'Grab'):
                # The strike is the crown closing, which is what this animal attacks with.
                sweep = -.30 * wind + .75 * peak if clip == 'Attack' else (
                    .85 * e if clip == 'Grab' else .45 * sin(pi * u) ** 2)
                curl = (.9 * peak if clip == 'Attack' else e if clip == 'Grab' else .5 * sin(pi * u) ** 2)
            if clip == 'Eat':
                sweep = .55 + .18 * sin(p * 2 - phase)
                curl = .45 + .18 * sin(p * 2 - phase)
            if clip == 'Heavy':
                sweep = 1.30 * e                                   # folded back over the aperture
                curl = .85 * e
            if clip == 'Guard':
                sweep = 1.30 + .07 * sin(p - phase)
                curl = .85 + .05 * sin(p - phase)
            if clip in ('Hit', 'Stagger', 'Parry'):
                sweep = .60 * e
                curl = .40 * e
            if clip == 'Dodge':
                sweep = -.35 * e
            if clip == 'Death':
                sweep = -.20 * dead
                curl = .55 * dead + .10 * sin(ai * .9)
            if clip == 'Growth':
                sweep = .18 * e
                spread = .14 * sin(p - phase) * env
            # Every bone in an arm shares one rest orientation (tail at +Y), so the accumulated
            # swing of the arm is the product of the local rotations down the chain, and a per-bone
            # angle has to be the total divided among them rather than the total itself.
            #
            # The two axes are the arm's own, not the body's. An arm standing at angle theta about
            # the crown axis sweeps -- fans back along the body and converges forward again -- about
            # the tangent to the crown circle there, and splays about the radius. Getting these two
            # confused does not read as a wrong direction, it reads as the arm twisting on the spot,
            # because an axis that is neither is neither.
            tangent = (-ventral, -lat)          # (x, z) components of the sweep axis
            radius_ax = (lat, -ventral)         # (x, z) components of the splay axis
            for k, n in enumerate(names):
                q = pb[n]
                taper = (k + 1) / ARM_SEG
                tang = (sweep * (.45 + .55 * taper) + curl * .70 * taper) * SEG_GAIN
                rad = spread * (.3 + .7 * taper) * SEG_GAIN
                q.rotation_euler.x = tang * tangent[0] + rad * radius_ax[0]
                q.rotation_euler.z = tang * tangent[1] + rad * radius_ax[1]
            acc = Quaternion()
            for n in names:
                acc = acc @ pb[n].rotation_euler.to_quaternion()
            arm_angles[ARMS[ai]['name']].append(acc)

        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0:
            first = state.copy()
        if f == last:
            seams[clip] = float(abs(state - first).max())
        for q in pb:
            if q.name in ('root', 'shell'):
                continue                   # the coil is rigid: no channel is ever written for it
            q.keyframe_insert('rotation_euler', frame=f)
            if q.name in ('body', 'head'):
                q.keyframe_insert('location', frame=f)

    def swept(seq):
        return round(max(math.degrees(abs(a.rotation_difference(b).angle))
                         for i, a in enumerate(seq) for b in seq[i + 1:]) if len(seq) > 1 else 0., 1)

    arm_sweep[clip] = {k: swept(v) for k, v in arm_angles.items()}
    funnel_sweep[clip] = swept(funnel_angles)
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
# A limbed swimmer's dash has to paddle, and the crown is what this animal has instead of limbs: the
# rule is the same one, asked of the appendage that actually moves it.
for c in ('Swim', 'Sprint'):
    assert min(arm_sweep[c].values()) > 20, ('the crown barely moves in ' + c, arm_sweep[c])
    assert funnel_sweep[c] > 20, ('the funnel barely moves in ' + c, funnel_sweep[c])
for c in ('Attack', 'Grab'):
    assert min(arm_sweep[c].values()) > 25, ('the crown is the weapon and it is not used in ' + c,
                                             arm_sweep[c])
reset()
scene.frame_set(0)

# ---------------------------------------------------------------------------------- anchors ----
# `anchor_mouth` on the lower mandible and `anchor_mouth_inside` on the upper are the contract's two
# mouth points and mean here what they mean everywhere: where a mouthful is held and where it goes.
# `anchor_attack_primary` is the interesting one. The era's rule says it goes on the bone that
# actually delivers the blow, and is emphatically not the skull for an animal that attacks with
# something other than a bite. This animal's light attack is named 'Beak', but a beak inside an arm
# crown reaches nothing on its own: what closes on prey, and what `grasp: true` in
# `src/content/triassic/creatures.ts` is about, is the crown. So the attack anchor sits at the tip of
# the ventral-most arm and carries that arm's whole chain, which is what `CreatureAnchors` aims with
# IK; `anchor_grasp` sits on the arm opposite it with its own chain, so a mouthful is carried in the
# arms and passed to the beak rather than stuck to the front of the face.
def arm_tip_point(a):
    return np.array(a['pts'][-1])


VENTRAL_ARM = min(ARMS, key=lambda a: float(np.array(a['pts'][-1])[2]))
DORSAL_ARM = max(ARMS, key=lambda a: float(np.array(a['pts'][-1])[2]))
anchors = [
    {'name': 'anchor_mouth', 'bone': 'jaw', 'role': 'mouth',
     'point': list(tx(mouth_point(MOUTH_R * .70, MOUTH_R * .14, 0)))},
    {'name': 'anchor_mouth_inside', 'bone': 'skull', 'role': 'swallow',
     'point': list(tx(mouth_point(-LINING_DEPTH * .55, 0, 0)))},
    {'name': 'anchor_attack_primary', 'bone': '%s_%02d' % (VENTRAL_ARM['name'], ARM_SEG - 1),
     'role': 'attack', 'point': list(tx(Vector(arm_tip_point(VENTRAL_ARM).tolist()))),
     'chain': ['%s_%02d' % (VENTRAL_ARM['name'], i) for i in range(ARM_SEG)]},
    {'name': 'anchor_grasp', 'bone': '%s_%02d' % (DORSAL_ARM['name'], ARM_SEG - 1),
     'role': 'grasp', 'point': list(tx(Vector(arm_tip_point(DORSAL_ARM).tolist()))),
     'chain': ['%s_%02d' % (DORSAL_ARM['name'], i) for i in range(ARM_SEG)]},
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
    """The shared patch, plus the IK chain metadata the shared one does not carry."""
    import struct
    from mathutils import Matrix  # noqa: F401
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
    # **The coil carries no channel.** The builder writes no keyframe for `shell`, but the glTF
    # exporter runs with `export_force_sampling`, which samples every bone in the rig whether it was
    # keyed or not -- so a constant channel for the shell was landing in all 21 clips and the rule
    # was true only of the source. It is dropped here for the same reason and in the same place the
    # shared patch drops the root's: a rule that is only true upstream of the file is not a rule.
    RIGID = {'shell'}
    dropped = 0
    for an in g['animations']:
        before = len(an['channels'])
        an['channels'] = [c for c in an['channels']
                          if g['nodes'][c['target']['node']].get('name') not in RIGID]
        dropped += before - len(an['channels'])
    assert dropped and dropped % len(g['animations']) == 0, (
        'the rigid coil should have the same channels dropped in every clip', dropped,
        len(g['animations']))
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
    'surfaceDistanceMax': float(distances.max()), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'seatingDepthRaw': {k: round(float(v), 5) for k, v in seating.items()},
    'coil': coil_report, 'mouth': mouth_cut}, indent=2))

meta = {'id': ID, 'name': NAME, 'species': 'Ceratites nodosus',
        'description': 'Canonical Tripo body and procedural volume twin on one %d-joint rig: a rigid '
                       'coiled shell that is never animated, a %d-arm crown on five joints each, a '
                       'hyponome that vectors the jet, and an authored beak inside a closed oral '
                       'lining.' % (len(B), NARM),
        'modelLength': round(model_length, 4), 'lengthMeters': 1.41, 'locomotion': 'Swim',
        'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors],
        'puppet': ID + '.puppet.glb',
        'notes': [
            'The coiled ribbed and tuberculate shell, the arm crown and the mantle are retained '
            'from the accepted Tripo volume; nothing of the generation is edited after intake.',
            'The frame is measured off the animal rather than off its bounding box or its '
            'countershading, both of which fail on a coiled shell: the bulk of the body is the '
            'coil, its smallest principal axis is the coil axis (the file x to within a degree), '
            'the thin mass is the arms and they lie forward of it, and the coil stands above them.',
            'The shell is one rigid bone with no animation channel in any clip, parented to the '
            'body so the whole animal still rolls. A bone that never moves relative to its parent '
            'cannot tear the skin it shares with it, which is what makes a coil this large safe.',
            'The generation models no mouth, and casting head normals back into the mesh finds '
            'neighbouring arms across the crown gaps rather than a lip opposite, so the peristome '
            'is authored on the crown axis with one closed skinned lining behind it and two '
            'mandibles. The skin is double-sided as the backstop.',
            'This animal jets (`shell: true`) but is not a `swimStyle: pulse` swimmer, so nothing '
            'scrubs its Swim clip to a simulation phase; the clip is an honest repeating funnel '
            'pump rather than a one-PULSE_CYCLE squeeze, which would drift against the thrust.',
            'Original albedo retained with white COLOR_0; normal relief limited to 0.15 and the '
            'skin explicitly nonmetallic. The twin samples pigment through triangle-local UVs.',
            'Living colours, soft tissues, the arm count and every movement are artistic '
            'reconstruction: ammonoid soft parts are not preserved for this genus. Locomotor '
            'translation remains engine-owned.']}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2))

report = {'id': ID, 'intake': intake, 'coil': coil_report,
          'armCutSweep': sweep, 'armCount': NARM, 'armCutRadius': CUT_R,
          'arms': [{'name': a['name'], 'vertices': a['verts'], 'reach': round(a['reach'], 4),
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
          'armSweepDegreesPerCycle': arm_sweep, 'funnelSweepDegreesPerCycle': funnel_sweep,
          'curvature': curvature, 'pairedAppendageAsymmetry': asymmetry,
          'mouth': dict(mouth_cut, liningRings=LINING_RINGS, liningRing=LINING_RING,
                        liningDepth=LINING_DEPTH,
                        liningNearestSurfaceDepthRaw=round(float(lining_depth_raw), 5),
                        skinDoubleSided=True, liningCullsBackfaces=True, oneClosedLining=True,
                        beak='two authored mandibles, 7 sections each, rigid on skull and jaw'),
          'albedoSha256': albedo_sha,
          'shellIsRigid': True, 'shellHasNoChannels': True,
          'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
_qa = os.path.join(HERE, 'qa.json')
report['postBuildQA'] = json.load(open(_qa)) if os.path.exists(_qa) else None
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, ID + '-paired.blend'))
print('CERATITES_REPORT', json.dumps({k: v for k, v in report.items()
                                      if k not in ('boundsAt13Phases', 'armCutSweep')}))
