"""Rebuild Ceratites: measured voxel-volume puppet and authored Tripo skin on one shared rig.

Blender 5.2. Geometry coordinates are raw Tripo metres until the final SCALE transform tx().

THE FRAME. This is the first coiled cephalopod in the era and nothing about the vertebrate bodies
transfers, starting with which way it lies. Its bounding box is no use -- 0.75 x 1.00 x 0.69, three
numbers that say nothing -- so the frame is read off the animal: the shell disc's plane is raw y-z
and the coil axis is raw x, the arms fan out towards -y, and +z is dorsal because that is where the
shell's apex stands over the head. So forward is -y, up is +z, and the animal's left is +x, which
happens to make tx() the identity times SCALE. That is a coincidence of this generation's pose, not
a convention, and it is asserted below rather than assumed.

WHAT IS RIGID. A shell is not armour on a body, it is the body's house: the soft parts move in and
out of it and the shell itself never changes shape. `shell` is therefore a bone with no animation
channel at all -- Placodus' gastral basket and Henodus' carapace are the pattern -- carried by
`body` so the whole animal can roll in Death, and owning every vertex of the coil. Getting this
boundary wrong is how a shell comes to breathe, so the test is measured (a radius about the fitted
coil centre) rather than painted, and it errs towards the shell: a little of the mantle flap going
rigid is invisible, a little of the shell going soft is the defect.

WHAT THE GENERATION DOES NOT HAVE. It models no mouth. Not a slit, not a lip line, not a beak --
the thirteen arms converge onto a smooth dome of skin. Both established ways of finding a mouth
fail here, and the dangerous one fails by appearing to succeed: casting head vertex normals back
into the mesh (Placodus' method) returns 453-677 vertices spread over the whole crown, because on
an arm crown what a normal meets across a gap is the neighbouring arm. That is the third way that
method can lie, after Keichousaurus' countershading. So the mouth is AUTHORED, as the one authored
thing on this body: a peristome cut in the crown's own dome, one closed lining wound inwards behind
it, and two mandibles. A beak is two curved wedges -- simple shape, far below the tooth-whorl bar
the rules set, and legitimately smooth in a pored neighbourhood because chitin is smooth. The rim of
the cut is skin and takes its UVs from the skin it was cut from; the lining and the mandibles are
oral apparatus and carry their own materials, exactly as every other Triassic body's mouth lining
does.

WHAT THE SIMULATION ACTUALLY GIVES IT. `shell: true` makes `RULES.jet()` true, which buys a free
hover and lets the body travel backwards without turning round. It does NOT make it a
`swimStyle: 'pulse'` swimmer, so nothing scrubs its Swim clip to a phase: `bell()` in
src/render/creature.ts returns false and the clip runs as a plain loop. Authoring a one-PULSE_CYCLE
squeeze here would therefore be a lie -- the squeeze would drift against a thrust the simulation
applies smoothly. Swim and Sprint pump the funnel repeatedly and quickly instead, so the animal
reads as pumping without claiming that the thrust arrives in lumps.
"""
import bpy, bmesh, math, json, os, struct, hashlib, shutil, sys
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin, cos, pi
from collections import deque


def _die(t, v, tb):
    import traceback
    traceback.print_exception(t, v, tb)
    sys.stdout.flush()
    os._exit(3)


# Blender exits 0 when a builder raises, so a failed build otherwise reports success and leaves
# stale artefacts looking fresh.
sys.excepthook = _die

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
LOCAL = os.path.join(ROOT, 'local/triassic-authoring/ceratites'); OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True); os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/ceratites.raw.glb'); ID = 'ceratites'; SCALE = 5

# The 21 contract clips. Nothing else: the renderer names Crawl for ground bodies and Moult for
# moulters, and this animal is neither, so an extra clip here would be one nothing ever plays.
CLIPS = {'Idle': 2.6, 'Swim': 2.0, 'Sprint': 1.1, 'TurnLeft': 1.6, 'TurnRight': 1.6, 'Dive': 1.4, 'Rise': 1.4,
         'Attack': 1., 'Bite': .5, 'Heavy': 1.2, 'Hit': .6, 'Death': 1.8, 'Guard': 1.2, 'Parry': .4, 'Dodge': .5,
         'Eat': 1.6, 'Stagger': 1.2, 'Ability': 1.2, 'Grab': 1.2, 'Breath': 2.4, 'Growth': 1.5}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Breath']

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=RAW)
auth = next(o for o in bpy.context.scene.objects if o.type == 'MESH'); auth.name = 'Ceratites authored body'
bpy.context.view_layer.objects.active = auth


def smooth(t):
    t = max(0., min(1., t)); return t * t * (3 - 2 * t)


# ---- intake surgery ----------------------------------------------------------------------------
# Two-stage weld, as every body in this era gets: 1e-6 is about texture seams and 5e-4 is about the
# triangulation. This generation needs no debris removal and no correction -- one component,
# watertight at the sliver weld, and it agrees with its greenlit pose including the arm count.
SLIVER_WELD = 5e-4
bm = bmesh.new(); bm.from_mesh(auth.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bm.verts.ensure_lookup_table(); seen = set(); components = []
for v in bm.verts:
    if v in seen: continue
    stack = [v]; seen.add(v); part = []
    while stack:
        q = stack.pop(); part.append(q)
        for e in q.link_edges:
            w = e.other_vert(q)
            if w not in seen: seen.add(w); stack.append(w)
    components.append(part)
removed = sum(len(c) for c in components if len(c) < 8)
for c in components:
    if len(c) < 8: bmesh.ops.delete(bm, geom=c, context='VERTS')
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
weld = {'componentsAtTextureWeld': len(components), 'flakeVerticesRemoved': removed,
        'openEdgesBefore': len([e for e in bm.edges if len(e.link_faces) < 2]), 'sliverWeld': SLIVER_WELD}
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=SLIVER_WELD)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
weld['openEdgesAfter'] = len([e for e in bm.edges if len(e.link_faces) < 2])
bm.to_mesh(auth.data); bm.free()
assert weld['openEdgesAfter'] == 0, weld
source_triangles = len(auth.data.polygons); source_components = weld['componentsAtTextureWeld']
P0 = np.array([v.co[:] for v in auth.data.vertices])

# ---- the frame, measured rather than assumed ---------------------------------------------------
# The shell is the mass at +y and the arms fan to -y. Assert it, because tx() below is the identity
# and an identity transform that is right by accident is the worst kind of right.
assert np.ptp(P0[P0[:, 1] > .2][:, 0]) < np.ptp(P0[P0[:, 1] < -.2][:, 0]), 'the arms must spread wider than the shell'
assert abs(P0[:, 0].mean()) < .02, 'the coil axis must be x'

# ---- the coil: a circle fitted to the shell in the y-z plane -----------------------------------
shellish = P0[:, 1] > .06
Q = P0[shellish][:, 1:]
A = np.c_[2 * Q, np.ones(len(Q))]; sol, *_ = np.linalg.lstsq(A, (Q ** 2).sum(1), rcond=None)
COIL_Y, COIL_Z = float(sol[0]), float(sol[1])
COIL_FIT_R = float(math.sqrt(sol[2] + COIL_Y ** 2 + COIL_Z ** 2))
radial = np.hypot(P0[:, 1] - COIL_Y, P0[:, 2] - COIL_Z)
# The rigid region's outer edge is the shell's own outer whorl, taken as the 99.5th percentile of
# the radius over the shell vertices rather than the maximum, so one stray tubercle does not set it.
SHELL_R = float(np.quantile(radial[shellish], .995))
coil = {'centreYZ': [round(COIL_Y, 4), round(COIL_Z, 4)], 'leastSquaresRadius': round(COIL_FIT_R, 4),
        'outerWhorlRadius': round(SHELL_R, 4), 'fittedOn': int(shellish.sum())}

# ---- where the head is, and where the crown converges ------------------------------------------
# The head is the soft mass forward of the aperture and inboard of the arms. Its centre is measured
# as the centroid of the vertices between the shell's outer edge and the inner ends of the arms.
headish = (radial > SHELL_R * .88) & (P0[:, 1] < .02) & (np.linalg.norm(P0 - np.array([0, -.10, -.06]), axis=1) < .18)
HEAD_SEED = P0[headish].mean(0) if headish.sum() > 50 else np.array([0., -.10, -.06])

# A centroid of surface points is a point ON the surface, not inside it, and the head's surface is a
# dome open towards the arms, so its centroid sits 0.044 outside the animal. Every joint on this rig
# is therefore SEATED: the deepest interior point of a small box around the seed, which is Cheirolepis'
# rule (`seat()` pulls a root radially inside to a margin) done by search because a crown has no
# section ellipse to be radial about.
SEED_TREE = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                                 [p.vertices[:] for p in auth.data.polygons], all_triangles=False)


def seeded_depth(p, tree=None):
    q = Vector(tuple(float(c) for c in p))
    loc, nor, idx, dist = (tree or SEED_TREE).find_nearest(q)
    return dist * (-1 if (q - loc).dot(nor) > 0 else 1)


def seat(seed, span=.09, step=.012, midline=True):
    """The deepest point inside the body within `span` of the seed; on the midline where asked."""
    best = (-1e9, np.array(seed, float))
    rng = np.arange(-span, span + 1e-9, step)
    for dx in ([0.] if midline else rng):
        for dy in rng:
            for dz in rng:
                q = np.array(seed, float) + np.array([dx, dy, dz])
                d = seeded_depth(q)
                if d > best[0]: best = (d, q)
    return best[1], best[0]


HEAD, HEAD_DEPTH = seat(HEAD_SEED)
print('DBG seed', HEAD_SEED.round(4).tolist(), 'seated', np.round(HEAD,4).tolist(), 'depth', round(HEAD_DEPTH,4), 'seedDepth', round(seeded_depth(HEAD_SEED),4))
HEAD = np.array([0., float(HEAD[1]), float(HEAD[2])])          # on the midline: the animal is symmetric here

# ---- the arms: one cut sphere, then a centreline each -------------------------------------------
# An arm that curls cannot be parametrised by distance from the crown, because its tip comes back
# towards the head and the radius stops being monotonic half way along. What stays monotonic is
# distance through the skin, so the crown is cut off at one sphere, each surviving piece's graph
# distance from its own cut ring is measured over the mesh edges, and the centroid of each band of
# that distance is one point of that arm's centreline. This follows a curled arm all the way round,
# and the mean spread of each band is that station's radius -- measured off the generation rather
# than named.
CROWN = np.array([0., -.13, -.07]); CUT_R = .13; ARM_SEG = 5


def arm_centrelines():
    bm = bmesh.new(); bm.from_mesh(auth.data); bm.verts.ensure_lookup_table()
    c = Vector(CROWN.tolist())
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if (f.calc_center_median() - c).length < CUT_R], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.verts.ensure_lookup_table(); seen = set(); comps = []
    for v in bm.verts:
        if v in seen: continue
        st = [v]; seen.add(v); part = []
        while st:
            q = st.pop(); part.append(q)
            for e in q.link_edges:
                w = e.other_vert(q)
                if w not in seen: seen.add(w); st.append(w)
        comps.append(part)
    comps.sort(key=len, reverse=True)
    found = []
    for part in comps[1:]:                                  # comps[0] is the body the crown was cut off
        if len(part) < 60: continue
        ring = [v for v in part if any(len(e.link_faces) < 2 for e in v.link_edges)]
        base = [v for v in ring if (v.co - c).length < CUT_R * 1.25] or ring
        dist = {v: 0. for v in base}; dq = deque(base)
        while dq:
            v = dq.popleft()
            for e in v.link_edges:
                w = e.other_vert(v)
                if w in dist: continue
                dist[w] = dist[v] + e.calc_length(); dq.append(w)
        dmax = max(dist.values()); pts = []; rad = []
        for k in range(ARM_SEG):
            lo = dmax * k / ARM_SEG; hi = dmax * (k + 1.2) / ARM_SEG
            band = [v for v in part if lo <= dist.get(v, 1e9) <= hi]
            if len(band) < 3: continue
            q = np.array([v.co[:] for v in band]); m = q.mean(0)
            pts.append(m); rad.append(float(np.linalg.norm(q - m, axis=1).mean()))
        if len(pts) < 3: continue
        root = np.array(pts[0]); inward = CROWN - root; n = float(np.linalg.norm(inward))
        pts = [root + inward / max(n, 1e-9) * min(n, CUT_R * .7)] + pts
        rad = [rad[0] * 1.15] + rad
        found.append({'pts': [p.tolist() if hasattr(p, 'tolist') else list(p) for p in pts],
                      'radius': rad, 'verts': len(part)})
    bm.free()
    found.sort(key=lambda a: -a['verts'])
    return found


ARMS = arm_centrelines()
assert len(ARMS) >= 10, ('the crown did not separate into arms', len(ARMS))
# Name them by where they stand round the crown, so arm_00 is the same arm on every rebuild: the
# angle of the root about the crown axis, which is the animal's own -y.
CROWN_AXIS = np.array([0., -1., 0.])
UP = np.array([0., 0., 1.]); SIDE = np.cross(CROWN_AXIS, UP)
for a in ARMS:
    d = np.array(a['pts'][-1]) - CROWN
    a['theta'] = float(math.atan2(float(d @ UP), float(d @ SIDE)))
ARMS.sort(key=lambda a: a['theta'])
for i, a in enumerate(ARMS): a['name'] = 'arm_%02d' % i
NARM = len(ARMS)

# ---- material: keep the source albedo, neutral white COLOR_0, restrained relief ----------------
mat = auth.data.materials[0]; mat.name = 'Ceratites shell and mantle'
# The peristome is cut through the skin, so a culled skin is a hole the open mouth looks out of.
# The lining below is what an open mouth is meant to show; this is the backstop under it.
mat.use_backface_culling = False
bs = mat.node_tree.nodes.get('Principled BSDF')
colnode = next(n for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.image.colorspace_settings.name == 'sRGB')
im = colnode.image
pixels = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)
uv = auth.data.uv_layers.active
layer = auth.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for item in layer.data: item.color = (1, 1, 1, 1)
for link in list(mat.node_tree.links):
    if link.to_node == bs and link.to_socket.name in ['Metallic', 'Roughness']: mat.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value = 0; bs.inputs['Roughness'].default_value = .62
for n in mat.node_tree.nodes:
    if n.type == 'NORMAL_MAP': n.inputs['Strength'].default_value = .15


def sample_albedo(u, v):
    h, w = pixels.shape[:2]; x = (float(u) % 1) * w - .5; y = (float(v) % 1) * h - .5
    x0 = math.floor(x); y0 = math.floor(y); fx = x - x0; fy = y - y0
    rgb = (pixels[y0 % h, x0 % w, :3] * (1 - fx) * (1 - fy) + pixels[y0 % h, (x0 + 1) % w, :3] * fx * (1 - fy)
           + pixels[(y0 + 1) % h, x0 % w, :3] * (1 - fx) * fy + pixels[(y0 + 1) % h, (x0 + 1) % w, :3] * fx * fy)
    linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    return (*[float(c) for c in linear], 1.)


# ---- the peristome: cut the mouth out of the crown's own dome -----------------------------------
# The crown converges on a dome with nothing in it. The mouth opening is a disc of that dome about
# the convergence point, on the crown axis; its radius is a fifth of the mean arm-root spread, which
# is measured here rather than chosen, so a crown that is drawn wider gets a wider mouth.
ROOT_SPREAD = float(np.mean([np.linalg.norm(np.array(a['pts'][1]) - CROWN) for a in ARMS]))
MOUTH_R = ROOT_SPREAD * .34
MOUTH_DEPTH = MOUTH_R * 2.1


def crown_surface():
    """Where the crown's dome actually is on the axis, and its outward normal there."""
    tree = BVHTree.FromPolygons([v.co[:] for v in auth.data.vertices],
                                [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
    start = Vector((CROWN + CROWN_AXIS * .35).tolist())
    hit = tree.ray_cast(start, Vector((-CROWN_AXIS).tolist()), .6)
    assert hit[0] is not None, 'no crown surface on the axis'
    return np.array(hit[0][:]), np.array(hit[1][:])


MOUTH_P, MOUTH_N = crown_surface()
if float(MOUTH_N @ CROWN_AXIS) < 0: MOUTH_N = -MOUTH_N
# An orthonormal frame on the mouth: n out of the head, dn "down" (ventral), ds across.
M_N = MOUTH_N / np.linalg.norm(MOUTH_N)
M_DN = np.array([0., 0., -1.]) - M_N * float(np.array([0., 0., -1.]) @ M_N)
M_DN /= np.linalg.norm(M_DN)
M_DS = np.cross(M_N, M_DN)


def in_mouth(p):
    d = np.asarray(p) - MOUTH_P
    along = float(d @ M_N)
    return (abs(along) < MOUTH_R * 1.6) and (float(np.hypot(d @ M_DN, d @ M_DS)) < MOUTH_R)


bm = bmesh.new(); bm.from_mesh(auth.data)
cut = [f for f in bm.faces if in_mouth(np.array(f.calc_center_median()[:]))]
assert len(cut) > 6, ('the peristome cut found no faces', len(cut))
bmesh.ops.delete(bm, geom=cut, context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
rim_edges = [e for e in bm.edges if len(e.link_faces) == 1]
rim_pts = sorted({v for e in rim_edges for v in e.verts}, key=lambda v: v.index)
assert len(rim_pts) > 8, ('the peristome left no rim', len(rim_pts))
PERISTOME = np.array([v.co[:] for v in rim_pts])
bm.to_mesh(auth.data); bm.free()
mouth_cut = {'centre': MOUTH_P.round(5).tolist(), 'normal': M_N.round(4).tolist(),
             'radius': round(MOUTH_R, 5), 'facesRemoved': len(cut), 'rimVertices': len(PERISTOME)}
intake_triangles = len(auth.data.polygons)
print('DBG mouth', json.dumps(mouth_cut), 'tris', source_triangles, '->', intake_triangles, 'rootSpread', round(ROOT_SPREAD,4))

# ---- procedural twin: resurface the measured occupancy volume -----------------------------------
# Regenerated topology, not a decimation: no source vertex or face survives the remesh. Lofting is
# hopeless on a disc with thirteen arms coming off one point, so this is the voxel route Nothosaurus
# and Henodus take. The voxel size has to resolve an arm 0.05 through, which is why it is finer here
# than on any vertebrate in the era.
puppet = auth.copy(); puppet.data = auth.data.copy(); bpy.context.collection.objects.link(puppet)
puppet.name = 'Ceratites procedural volume puppet'; bpy.context.view_layer.objects.active = puppet
puppet.data.remesh_voxel_size = .0055; puppet.data.remesh_voxel_adaptivity = 0; puppet.data.use_remesh_preserve_volume = True
bpy.ops.object.voxel_remesh()
mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH'); mod.factor = .40; mod.iterations = 1
bpy.ops.object.modifier_apply(modifier=mod.name)
remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)
PUPPET_BUDGET = 7000
mod = puppet.modifiers.new('Puppet topology budget', 'DECIMATE'); mod.ratio = min(1., PUPPET_BUDGET / max(1, remesh_triangles))
bpy.ops.object.modifier_apply(modifier=mod.name)
puppet_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)

bvh = BVHTree.FromPolygons([v.co for v in auth.data.vertices], [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
if puppet.data.color_attributes.get('Color'): puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
pl = puppet.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for v in puppet.data.vertices:
    hit = bvh.find_nearest(v.co); poly = auth.data.polygons[hit[2]]; assert len(poly.vertices) == 3
    p = [auth.data.vertices[j].co for j in poly.vertices]; q = [Vector((*uv.data[j].uv, 0)) for j in poly.loop_indices]
    s = barycentric_transform(hit[0], p[0], p[1], p[2], q[0], q[1], q[2]); pl.data[v.index].color = sample_albedo(s.x, s.y)
pmat = bpy.data.materials.new('Ceratites puppet body'); pmat.use_nodes = True
pbs = pmat.node_tree.nodes.get('Principled BSDF'); pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor'); pvc.layer_name = 'Color'
pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
pbs.inputs['Roughness'].default_value = .72; pbs.inputs['Metallic'].default_value = 0
puppet.data.materials.clear(); puppet.data.materials.append(pmat)
for p in puppet.data.polygons: p.material_index = 0


# ---- the hyponome ------------------------------------------------------------------------------
# An ammonoid's funnel sits under the head, inside the aperture, pointing forward past the crown: it
# is what the jet comes out of, and on this animal it is the one part whose motion IS the
# locomotion. The generation models no funnel tube, so the bone is seated in the ventral soft mass
# under the head and owns the ventral patch there.
FUNNEL_P, FUNNEL_DEPTH = seat(np.array([0., float(HEAD[1]) + .050, float(HEAD[2]) - .075]), span=.055, step=.011)
FUNNEL_P = np.array([0., float(FUNNEL_P[1]), float(FUNNEL_P[2])])

# ---- shared skeleton ---------------------------------------------------------------------------
def tx(p):
    x, y, z = p; return Vector((x * SCALE, y * SCALE, z * SCALE))


B = {}
ORDER = []


def bone(n, p, parent):
    B[n] = (Vector(tuple(float(q) for q in p)), parent); ORDER.append(n)


bone('root', (0, 0, 0), None)
# `body` is the whole animal's soft frame AND owns the mantle collar around the aperture, so it is
# a bone that carries skin rather than a second unweighted carrier: the rig has exactly one of
# those and `idle-bones.mjs` excludes it by name.
bone('body', (0, -.02, -.03), 'root')
# The coil. No channel is ever written for it, so it is rigid in the animal's own frame while still
# being carried when the whole body rolls.
bone('shell', (0, COIL_Y, COIL_Z), 'body')
bone('head', tuple(HEAD), 'body')
# The hyponome. An ammonoid's funnel sits under the head inside the aperture and is what the jet
# comes out of; it is the one part of this animal whose motion is the locomotion.
bone('funnel', tuple(FUNNEL_P), 'body')
bone('skull', tuple(MOUTH_P - M_N * MOUTH_R * .30), 'head')
bone('jaw', tuple(MOUTH_P - M_N * MOUTH_R * .30 + M_DN * MOUTH_R * .18), 'skull')
for a in ARMS:
    for i, p in enumerate(a['pts'][:-1]):
        bone('%s_%02d' % (a['name'], i), tuple(p), 'head' if i == 0 else '%s_%02d' % (a['name'], i - 1))

# ---- weights -----------------------------------------------------------------------------------
# Nothing about a vertebrate weighting scheme survives here and the reason is the crown. Thirteen
# arms leave one point and TOUCH EACH OTHER along their length -- the cut-sphere count runs 11 at
# radius 0.12 and 13 at 0.15 precisely because adjacent arms fuse near the base -- so a winner-takes
# -all assignment of the kind every limbed body in this era uses would put a seam straight down
# every contact, and those are the edges that tear when the crown opens. Every arm's claim is
# therefore SOFT: each arm gets a feathered claim alpha, the claims are summed, and where the sum
# exceeds one they are scaled down together rather than one of them winning. Skin between two arms
# is then held by both and moves with the average of them.
#
# Both ends of every claim are feathered as well. A hard `lo < s < hi` window lets an arm run past
# its own root or tip and take a ring of skin with it, and that is the other way this crown tears.
ARM_IN, ARM_OUT = 1.15, 2.30           # multiples of the measured band radius: solid core, feathered skirt
ARM_SEAT = .055                        # arc length over which a root fades in, inside the crown


def poly(pts):
    P = [Vector(p) for p in pts]; cum = [0.]
    for i in range(1, len(P)): cum.append(cum[-1] + (P[i] - P[i - 1]).length)
    return P, cum


def project(P, cum, q):
    best = (1e9, 0., 0.)
    for i in range(len(P) - 1):
        a = P[i]; d = P[i + 1] - a; L2 = d.length_squared
        t = 0. if L2 < 1e-12 else max(0., min(1., (q - a).dot(d) / L2))
        c = a + d * t; dist = (q - c).length
        if dist < best[0]: best = (dist, cum[i] + t * d.length, i + t)
    return best


ARMFIT = []
for a in ARMS:
    P, cum = poly(a['pts']); ARMFIT.append((a['name'], P, cum, a['radius']))


def arm_chain(name, seg, nseg):
    """Which bone of this arm owns a point at fractional segment `seg`, feathered between them."""
    out = {}
    lo = int(math.floor(seg)); t = seg - lo
    # A wide feather: a curling arm creases at a joint whose blend is narrow.
    for k, w in ((lo, 1 - smooth(t)), (lo + 1, smooth(t))):
        k = max(0, min(nseg - 1, k))
        if w > 0: out['%s_%02d' % (name, k)] = out.get('%s_%02d' % (name, k), 0.) + w
    return out


def arm_claims(q):
    """Every arm's soft claim on a point, scaled down together where they add to more than one."""
    claims = []
    total = 0.
    for name, P, cum, rad in ARMFIT:
        dist, s, seg = project(P, cum, q)
        t = s / max(cum[-1], 1e-9)
        band = np.interp(t * (len(rad) - 1), np.arange(len(rad)), rad)
        rin = band * ARM_IN; rout = band * ARM_OUT
        if dist >= rout: continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / max(rout - rin, 1e-9))) * smooth(s / ARM_SEAT)
        if alpha <= 1e-4: continue
        claims.append((alpha, arm_chain(name, seg, len(P) - 1)))
        total += alpha
    if not claims: return {}, 0.
    k = 1. / max(1., total)
    out = {}
    for alpha, chain in claims:
        for n, w in chain.items(): out[n] = out.get(n, 0.) + alpha * k * w
    return out, min(1., total)


# The rigid coil, and the two things that must never join it: skin an arm has any claim on, and
# skin near the head. Both are subtracted rather than tested against, so the boundary is a ramp.
SHELL_BAND = .045
HEAD_KEEP, HEAD_BAND = .105, .075


def shell_share(q):
    r = math.hypot(q.y - COIL_Y, q.z - COIL_Z)
    d = (Vector(HEAD.tolist()) - q).length
    return smooth((SHELL_R - r) / SHELL_BAND) * smooth((d - HEAD_KEEP) / HEAD_BAND)


# The funnel: the ventral patch inside the aperture, under the head and behind the crown.
FUNNEL = Vector(tuple(float(c) for c in FUNNEL_P))
FUNNEL_R, FUNNEL_BAND = .055, .045


def funnel_share(q):
    return smooth((FUNNEL_R - (q - FUNNEL).length) / FUNNEL_BAND)


# The peristome's own lips. The rim of the cut and a band of skin around it purse open with the
# beak: ventral rim onto `jaw`, dorsal rim onto `skull`, fading into `head` over LIP_BAND. This is
# what makes the mouth an opening rather than a hole with a beak behind it.
LIP_BAND = MOUTH_R * 1.9


def lip_share(q):
    d = np.array(q[:]) - MOUTH_P
    lat = float(np.hypot(d @ M_DN, d @ M_DS))
    ring = smooth((MOUTH_R + LIP_BAND - lat) / LIP_BAND) * smooth((MOUTH_R * 1.9 - abs(float(d @ M_N))) / (MOUTH_R * .9))
    if ring <= 0: return 0., 0.
    # -1 at the dorsal lip, +1 at the ventral one, and the sides share.
    v = float(d @ M_DN) / max(lat, 1e-9)
    return ring, max(0., min(1., .5 + .5 * v))


def weights(p):
    q = Vector(tuple(float(c) for c in p))
    arms, claimed = arm_claims(q)
    g = shell_share(q) * (1 - claimed)
    f = funnel_share(q) * (1 - claimed) * (1 - g)
    ring, ventral = lip_share(q)
    lip = ring * (1 - claimed) * (1 - g)
    rest = max(0., 1 - claimed - g - f - lip)
    # What is left over goes to the body/head axial blend: `head` near the crown, `body` back at the
    # aperture collar, measured along the animal's own forward axis.
    t = smooth((float(q.y) - (float(HEAD[1]) + .16)) / -.20)
    w = dict(arms)
    if rest > 0:
        w['head'] = w.get('head', 0.) + rest * t
        w['body'] = w.get('body', 0.) + rest * (1 - t)
    if g > 0: w['shell'] = w.get('shell', 0.) + g
    if f > 0: w['funnel'] = w.get('funnel', 0.) + f
    if lip > 0:
        w['jaw'] = w.get('jaw', 0.) + lip * ventral
        w['skull'] = w.get('skull', 0.) + lip * (1 - ventral)
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]; total = sum(v for _, v in items)
    assert total > 1e-6, ('unweighted vertex', list(p))
    return {n: v / total for n, v in items}


# ---- seating audit: every arm root and the mouth must sit inside the intake surface --------------
inside = BVHTree.FromPolygons([v.co for v in auth.data.vertices], [p.vertices[:] for p in auth.data.polygons], all_triangles=False)


def depth(p):
    loc, nor, idx, dist = inside.find_nearest(Vector(tuple(float(c) for c in p)))
    return dist * (-1 if (Vector(tuple(float(c) for c in p)) - loc).dot(nor) > 0 else 1)


seating = {'shell': depth((0, COIL_Y, COIL_Z)), 'head': depth(HEAD), 'funnel': depth(FUNNEL)}
for a in ARMS: seating[a['name'] + '_00'] = depth(a['pts'][0])
for n, d in seating.items(): assert d > .008, ('a joint sits outside the body', n, round(d, 4))

# ---- TEMP probe ---------------------------------------------------------------------------------
print('PROBE coil', json.dumps(coil))
print('PROBE head', HEAD.round(4).tolist(), 'headish', int(headish.sum()))
print('PROBE arms', NARM, 'rootSpread %.4f mouthR %.4f' % (ROOT_SPREAD, MOUTH_R))
print('PROBE mouth', json.dumps(mouth_cut))
print('PROBE seating', json.dumps({k: round(float(v), 4) for k, v in seating.items()}))
import collections
tally = collections.Counter(); infl = []
for v in auth.data.vertices:
    w = weights(v.co); infl.append(len(w))
    for n, val in w.items(): tally[n] += val
print('PROBE bones', len(B), 'verts', len(auth.data.vertices), 'meanInfluences %.2f' % (sum(infl) / len(infl)))
zero = [n for n in B if n != 'root' and tally[n] < 1e-6]
print('PROBE zero-weight bones', zero)
print('PROBE top', [(n, round(tally[n], 1)) for n, _ in tally.most_common(12)])
print('PROBE arm totals', [(a['name'], round(sum(tally['%s_%02d' % (a['name'], i)] for i in range(5)), 1)) for a in ARMS])
print('PROBE per-arm-seg min', min(tally['%s_%02d' % (a['name'], i)] for a in ARMS for i in range(5)))
