"""Rebuild Henodus: measured voxel-volume puppet and authored Tripo skin on one shared rig.

Blender 5.2. Geometry coordinates are raw Tripo metres (X snoutward, Y left, Z up, body length
1.0) until the final 5x engine transform tx().

Henodus is built to Placodus' pattern, because it is the same kind of animal and the same kind of
generation: a closed shell with a real modelled mouth slit, whose seam is found by casting head
vertex normals back into the mesh and fitting the cavity's mid height per station, and whose open
mouth is closed by ONE skinned lining -- roof on the skull, floor on the jaw, wall stretching
between them -- wound inwards with the skin double-sided behind it. The measurements differ
because the animal does: Henodus is a disc, not a barrel. Its carapace is 0.50 of body length wide
against a 0.25 depth, its mouth is the front 0.04 of the body rather than a long tooth row, and the
one thing Placodus does not have at all is a fused dorsal shell, which is a rigid part here in the
same sense that Placodus' gastral basket is.
"""
import bpy, bmesh, math, json, os, sys, struct, hashlib, shutil
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin, cos, pi

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
sys.path.insert(0, os.path.join(ROOT, 'tools/triassic/creatures/_pipeline'))
import tripo as T                                                              # noqa: E402
LOCAL = os.path.join(ROOT, 'local/triassic-authoring/henodus'); OUT = os.path.join(ROOT, 'public/assets/triassic/creatures')
os.makedirs(LOCAL, exist_ok=True); os.makedirs(OUT, exist_ok=True)
RAW = os.path.join(HERE, 'tripo-raw/henodus.raw.glb'); ID = 'henodus'; SCALE = 5

# The 21 contract clips plus this animal's own three. Henodus is the roster's slowest swimmer
# (docs/research/triassic-swimming.json: 0.08 body lengths a second cruising, a "sluggish benthic
# paddler, square armoured shell as ballast"), so the swim set is a four-limb row rather than the
# tail scull Placodus uses: a flat disc has no trunk to send a wave down. Crawl is the bottom walk,
# Graze the denticle fringe raking the sediment, Breathe the settled loop at the surface.
CLIPS = {'Idle': 2.4, 'Swim': 2.0, 'Sprint': 1.3, 'TurnLeft': 1.6, 'TurnRight': 1.6, 'Dive': 1.4, 'Rise': 1.4,
         'Attack': 1., 'Bite': .5, 'Heavy': 1.1, 'Hit': .6, 'Death': 1.6, 'Guard': 1., 'Parry': .4, 'Dodge': .5,
         'Eat': 1.6, 'Stagger': 1.2, 'Ability': .9, 'Grab': 1.2, 'Breath': 2.4, 'Growth': 1.5,
         'Crawl': 2., 'Graze': 2.4, 'Breathe': 3.}
LOOPS = ['Idle', 'Swim', 'Sprint', 'Guard', 'Eat', 'Grab', 'Crawl', 'Graze', 'Breathe']

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=RAW)
auth = next(o for o in bpy.context.scene.objects if o.type == 'MESH'); auth.name = 'Henodus authored body'
bpy.context.view_layer.objects.active = auth


def smooth(t):
    t = max(0., min(1., t)); return t * t * (3 - 2 * t)


# ---- intake surgery ---------------------------------------------------------------------------
# Weld the texture-seam duplicates (the raw file is 11,602 loose-UV vertices over one shell), drop
# detached flakes, then a second pass at SLIVER_WELD for the hairline cracks the first leaves --
# the same two-stage weld Nothosaurus uses, and for the same reason: 1e-6 is about texture seams
# and 5e-4 is about the triangulation.
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

# ---- step 4 correction: the forked tail --------------------------------------------------------
# The generation's tail bifurcates. Behind raw x = -0.39 the caudal cross-section is two separate
# closed curves at |y| 0.10-0.19 with a gap on the midline, which reads in the top view as a
# two-pronged fork and is the one thing about this body that is not the greenlit pose -- the
# canonical draws a single tapering tail with one row of dorsal bosses. This is a bounded intake
# correction of the kind the pipeline already authorises (Placodus unbends its hooked tail the
# same way): the fork is cut off square on a plane and the opening is closed with a fan to a single
# apex on the tail's own axis, placed so the restored tail is as long as the forked one was and
# tapers at the rate the caudal sections in front of the cut already taper at. Nothing is invented
# but the cone between the cut ring and that point, and it wears the animal's own texture because
# every new corner takes its UV from the boundary vertices it sits between.
#
# This is a repair, not a fix: a tail that forks is a generation that disagrees with its greenlit
# pose, and the honest route out is a fresh generation. That is recorded in validation.json and in
# the README rather than hidden by this cut. Set FORK_CUT False to rebuild the forked tail.
FORK_CUT = True


def caudal_sections(o, lo, hi, step):
    """Per-station half-widths and whether the section has any geometry on the midline."""
    P = np.array([v.co[:] for v in o.data.vertices]); rows = []
    for x in np.arange(lo, hi + 1e-9, step):
        m = (np.abs(P[:, 0] - x) < step * .55) & (np.abs(P[:, 1]) < .22)
        if m.sum() < 6: continue
        q = P[m]
        rows.append({'x': round(float(x), 4), 'n': int(m.sum()),
                     'halfWidth': round(float(np.abs(q[:, 1]).max()), 4),
                     'onMidline': int((np.abs(q[:, 1]) < .035).sum()),
                     'midZ': round(float((q[:, 2].min() + q[:, 2].max()) / 2), 4)})
    return rows


def cut_and_ring(bm, x):
    """Take the tail off on the plane x and return the boundary loops the cut leaves."""
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-7,
                           plane_co=(x, 0, 0), plane_no=(1, 0, 0), clear_inner=False, clear_outer=False)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().x < x], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    ring = {}
    for e in [e for e in bm.edges if len(e.link_faces) == 1]:
        for v in e.verts: ring.setdefault(v, []).append(e)
    if not ring or any(len(v) != 2 for v in ring.values()): return None
    loops = []; seen = set()
    for v in ring:
        if v in seen: continue
        cur = v; prev = None; chain = []
        while cur not in seen:
            seen.add(cur); chain.append(cur)
            e = ring[cur][0] if ring[cur][0] is not prev else ring[cur][1]
            prev = e; cur = e.other_vert(cur)
        loops.append(chain)
    return loops


# Where the tail forks is not read off vertex density but off the topology: the rearmost plane the
# tail can be taken off on and leave ONE simple boundary loop is the last station where the tail is
# still one tube. Behind it the cut leaves two rings, which is the fork.
fork_rows = caudal_sections(auth, -.50, -.20, .02)
CUT_X = None; fork_scan = []
for x in np.arange(-.44, -.24, .005):
    probe = bmesh.new(); probe.from_mesh(auth.data)
    loops = cut_and_ring(probe, float(x))
    ok = loops is not None and len(loops) == 1 and len(loops[0]) > 40
    fork_scan.append([round(float(x), 4), 0 if loops is None else len(loops)])
    probe.free()
    if ok and CUT_X is None: CUT_X = float(x)
assert CUT_X is not None and -.42 < CUT_X < -.28, (CUT_X, fork_scan)
FORK_X = CUT_X - .005
fork = {'lastSingleTubeStationX': round(CUT_X, 4), 'cutX': round(CUT_X, 4), 'applied': FORK_CUT,
        'loopsPerCutPlane': fork_scan, 'sections': fork_rows,
        'originalTailTipX': float(min(v.co.x for v in auth.data.vertices))}
if FORK_CUT:
    uvname = auth.data.uv_layers.active.name
    bm = bmesh.new(); bm.from_mesh(auth.data); uvl = bm.loops.layers.uv[uvname]
    loops = cut_and_ring(bm, CUT_X)
    assert loops is not None and len(loops) == 1, ('the cut boundary is not one simple loop', loops and len(loops))
    loop = loops[0]
    edges = [e for e in bm.edges if len(e.link_faces) == 1]
    C = sum((v.co for v in loop), Vector()) / len(loop)
    radius = sum((v.co - C).length for v in loop) / len(loop)
    # The apex restores the length the fork had, on the tail's own centreline: the cut ring's centre
    # carried back along the direction the caudal centreline was already travelling.
    _pre = [r for r in fork_rows if r['x'] > CUT_X][:6]
    slope = (_pre[-1]['midZ'] - _pre[0]['midZ']) / max(1e-6, _pre[-1]['x'] - _pre[0]['x'])
    back = C.x - fork['originalTailTipX']
    apex_co = Vector((fork['originalTailTipX'], 0., C.z - slope * back))
    fork['caudalCentrelineSlope'] = round(float(slope), 4)
    fork.update({'cutRingVertices': len(loop), 'cutRingRadius': round(float(radius), 5),
                 'cutRingCentre': [round(float(c), 5) for c in C],
                 'apex': [round(float(c), 5) for c in apex_co],
                 'restoredLengthOverRadius': round(float(back / max(1e-6, radius)), 3)})
    # Every new corner takes its UV from the boundary edge it grows out of, so the cap samples the
    # same albedo as the scales around it rather than becoming a flat untextured island.
    border = {}
    for e in edges:
        f = e.link_faces[0]
        border[frozenset(e.verts)] = {lp.vert: lp[uvl].uv.copy() for lp in f.loops if lp.vert in set(e.verts)}
    # Four rings rather than one fan, and the section shrinks as (1-u)^CAP_TAPER rather than
    # linearly, so the cap is a tapering tail tip and not a cone: a straight cone off a ring this
    # wide reads as a flat wedge, which is a different wrong shape from the one being repaired.
    CAP_RINGS, CAP_TAPER = 4, .62
    rings = [loop]
    for k in range(1, CAP_RINGS):
        u = k / CAP_RINGS; shrink = (1 - u) ** CAP_TAPER
        rings.append([bm.verts.new(C + (apex_co - C) * u + (v.co - C) * shrink) for v in loop])
    apex = bm.verts.new(apex_co)
    bm.verts.index_update()
    fork['capRings'] = CAP_RINGS; fork['capTaperExponent'] = CAP_TAPER
    for k in range(CAP_RINGS):
        cur = rings[k]; nxt = rings[k + 1] if k + 1 < CAP_RINGS else None
        for i in range(len(loop)):
            a, b = loop[i], loop[(i + 1) % len(loop)]
            src = border[frozenset((a, b))]
            f = bm.faces.new((cur[i], cur[(i + 1) % len(loop)], nxt[(i + 1) % len(loop)], nxt[i])) if nxt \
                else bm.faces.new((cur[i], cur[(i + 1) % len(loop)], apex))
            for j, lp in enumerate(f.loops):
                lp[uvl].uv = src[a] if j in (0, 3) else (src[b] if j == 1 else
                                                         (src[b] if nxt else (src[a] + src[b]) / 2))
    # The bisect leaves n-gons where it crossed triangles; everything downstream (the twin's
    # per-triangle pigment transfer, the section envelopes) reads triangles.
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    fork['openEdgesAfterCap'] = len([e for e in bm.edges if len(e.link_faces) < 2])
    bm.to_mesh(auth.data); bm.free()
    assert fork['openEdgesAfterCap'] == 0, fork
    fork['tailTipXAfter'] = float(min(v.co.x for v in auth.data.vertices))
intake_triangles = len(auth.data.polygons)

# ---- material: keep the source albedo, neutral white COLOR_0, restrained relief ----------------
mat = auth.data.materials[0]; mat.name = 'Henodus body pigmentation'
# Cutting the jaw off leaves both halves open along the mouth, so a culled skin is a hole an open
# gape looks straight out of. The lining below is what an open mouth is meant to show; this is the
# backstop under it.
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
bs.inputs['Metallic'].default_value = 0; bs.inputs['Roughness'].default_value = .7
for n in mat.node_tree.nodes:
    if n.type == 'NORMAL_MAP': n.inputs['Strength'].default_value = .15


def sample_albedo(u, v):
    h, w = pixels.shape[:2]; x = (float(u) % 1) * w - .5; y = (float(v) % 1) * h - .5
    x0 = math.floor(x); y0 = math.floor(y); fx = x - x0; fy = y - y0
    rgb = (pixels[y0 % h, x0 % w, :3] * (1 - fx) * (1 - fy) + pixels[y0 % h, (x0 + 1) % w, :3] * fx * (1 - fy)
           + pixels[(y0 + 1) % h, x0 % w, :3] * (1 - fx) * fy + pixels[(y0 + 1) % h, (x0 + 1) % w, :3] * fx * fy)
    linear = np.where(rgb <= .04045, rgb / 12.92, ((rgb + .055) / 1.055) ** 2.4)
    return (*[float(c) for c in linear], 1.)


# ---- procedural twin: resurface the measured occupancy volume ----------------------------------
# Regenerated topology, not a decimation: no source vertex or face survives the remesh. Lofting is
# wrong for a disc with five-toed feet and a plated rim.
puppet = auth.copy(); puppet.data = auth.data.copy(); bpy.context.collection.objects.link(puppet)
puppet.name = 'Henodus procedural volume puppet'; bpy.context.view_layer.objects.active = puppet
puppet.data.remesh_voxel_size = .0055; puppet.data.remesh_voxel_adaptivity = 0; puppet.data.use_remesh_preserve_volume = True
bpy.ops.object.voxel_remesh()
mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH'); mod.factor = .45; mod.iterations = 1
bpy.ops.object.modifier_apply(modifier=mod.name)
remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)
PUPPET_BUDGET = 6400
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
pmat = bpy.data.materials.new('Henodus puppet body'); pmat.use_nodes = True
pbs = pmat.node_tree.nodes.get('Principled BSDF'); pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor'); pvc.layer_name = 'Color'
pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
pbs.inputs['Roughness'].default_value = .76; pbs.inputs['Metallic'].default_value = 0
puppet.data.materials.clear(); puppet.data.materials.append(pmat)
for p in puppet.data.polygons: p.material_index = 0


# ---- shared skeleton ---------------------------------------------------------------------------
# Measured off the intake mesh: the trunk centreline runs near z 0, the carapace dome peaks at
# x 0.10, the tail leaves the hips at x -0.10 and droops to z -0.07 at the tip, the head runs from
# x 0.40 to the snout at 0.50, and the four limbs leave the flank at |y| 0.085 and reach |y| 0.345.
def tx(p):
    x, y, z = p; return Vector((y * SCALE, -x * SCALE, z * SCALE))


B = {}


def bone(n, p, parent): B[n] = (Vector(p), parent)


bone('root', (0, 0, 0), None)
bone('body', (-.020, 0, -.004), 'root')
bone('chest', (.170, 0, .004), 'body')
bone('neck', (.330, 0, -.004), 'chest')
bone('skull', (.400, 0, -.016), 'neck')
bone('jaw', (.437, 0, -.052), 'skull')
# The fused dorsal shell is ballast, not a joint: a rigid part on its own bone hung off the trunk,
# never given a channel, exactly as Placodus' gastral basket is. A carapace that undulates with a
# swim wave is the one thing this animal must never do.
bone('carapace', (.060, 0, .060), 'body')
TAIL_PTS = [(-.110, 0, -.005), (-.170, 0, -.010), (-.230, 0, -.019), (-.290, 0, -.038), (-.345, 0, -.057), (-.400, 0, -.072)]
for i, p in enumerate(TAIL_PTS): bone('tail_%02d' % i, p, 'body' if i == 0 else 'tail_%02d' % (i - 1))
LIMB_PTS = {
    'foreL': [(.265, .082, -.008), (.283, .190, -.030), (.303, .265, -.068), (.315, .335, -.106)],
    'foreR': [(.263, -.082, -.010), (.281, -.190, -.032), (.301, -.265, -.070), (.313, -.335, -.108)],
    'hindL': [(-.085, .082, -.010), (-.103, .190, -.036), (-.121, .265, -.076), (-.128, .335, -.110)],
    'hindR': [(-.087, -.082, -.012), (-.105, -.190, -.038), (-.123, -.265, -.078), (-.130, -.335, -.112)]}
LIMBS = {}
for key, pts in LIMB_PTS.items():
    kind = 'fore' if key.startswith('fore') else 'hind'; s = key[-1]
    names = [kind + '_upper_' + s, kind + '_lower_' + s, kind + '_paddle_' + s]
    LIMBS[key] = (pts, names)
    for i, n in enumerate(names): bone(n, pts[i], ('chest' if kind == 'fore' else 'body') if i == 0 else names[i - 1])

# ---- weights -----------------------------------------------------------------------------------
# Nothosaurus' scheme, because it is the era's cleanest body by skin-tear measurement (2.98x
# against Placodus' 12.4x on the same audit): the trunk blends longitudinally between axial
# stations, and a limb's influence is bounded BOTH radially, by how near the skin actually is to
# that limb's own bone chain, and along it, by how far out along the chain the skin sits. On a body
# this wide the radial bound is the one that matters: Nothosaurus can take "outboard of |y| 0.09"
# to mean "on the limb" because its trunk is narrow, and the first Henodus build did exactly that
# and put 84 % of a forelimb into the top of the carapace, which tore an edge past 45x in every
# locomotion clip. The along-limb ramp is still Nothosaurus', starting inside the flank so the
# shoulder never carries a ring of half-limb half-trunk vertices, and the base under a partly
# weighted limb vertex is the axial station at the limb's own ROOT rather than at that vertex's own
# x, so a foot swung forward cannot drag a station two segments away with it.
AXIAL = [('tail_05', -.435), ('tail_04', -.372), ('tail_03', -.318), ('tail_02', -.258), ('tail_01', -.196),
         ('tail_00', -.130), ('body', -.020), ('chest', .180), ('neck', .345), ('skull', .420)]
assert all(AXIAL[i][1] < AXIAL[i + 1][1] for i in range(len(AXIAL) - 1)), AXIAL


def axial(x):
    xs = [v for _, v in AXIAL]
    if x <= xs[0]: return {AXIAL[0][0]: 1.}
    if x >= xs[-1]: return {AXIAL[-1][0]: 1.}
    i = int(np.searchsorted(xs, x)) - 1
    t = (x - xs[i]) / (xs[i + 1] - xs[i]); return {AXIAL[i][0]: 1 - t, AXIAL[i + 1][0]: t}


def poly(pts):
    P = [Vector(p) for p in pts]; cum = [0.]
    for i in range(1, len(P)): cum.append(cum[-1] + (P[i] - P[i - 1]).length)
    return P, cum


def project(P, cum, q):
    best = (1e9, 0.)
    for i in range(len(P) - 1):
        a = P[i]; d = P[i + 1] - a; L2 = d.length_squared
        t = 0. if L2 < 1e-12 else max(0., min(1., (q - a).dot(d) / L2))
        c = a + d * t; dist = (q - c).length
        if dist < best[0]: best = (dist, cum[i] + t * d.length)
    return best


LIMBFIT = {}
for key, (pts, names) in LIMBS.items():
    P, cum = poly(pts); LIMBFIT[key] = (P, cum, names, axial(pts[0][0]))
# The tube each limb claims, at its root and at its foot: measured off the limb sections -- the
# upper limb is about 0.055 through and the splayed five-toed foot about 0.105 across.
RADII = {'fore': (.026, .040, .080, .062), 'hind': (.026, .042, .082, .064)}   # r_in0, r_in1, r_out0, r_out1
SEAT = .082                            # arc length over which the root fades in, inside the flank


def limbchain(names, s, cum):
    b = .034
    tl = smooth((s - (cum[1] - b)) / (2 * b)); tp = smooth((s - (cum[2] - b)) / (2 * b))
    return {names[0]: 1 - tl, names[1]: tl * (1 - tp), names[2]: tl * tp}


# The carapace footprint: a flat-sided superellipse in plan, measured off the plated dome in the
# source albedo and the section table (x -0.20 to 0.32, half width 0.25), capped below the flank so
# the rigid region never reaches the belly.
CC, CX, CY, CZ = .060, .260, .250, -.020


def carapace_share(c):
    u = (c.x - CC) / CX; v = c.y / CY
    return smooth((1. - (u ** 4 + v * v)) / .55) * smooth((c.z - CZ) / .065)


def weights(p):
    q = Vector(p); w = dict(axial(q.x)); best = 0.; chosen = None
    for key, (P, cum, names, rootw) in LIMBFIT.items():
        dist, s = project(P, cum, q); t = s / cum[-1]; r = RADII[key[:4]]
        rin = r[0] + r[1] * t * t; rout = r[2] + r[3] * t * t
        if dist >= rout: continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / (rout - rin))) * smooth(s / SEAT)
        if alpha > best: best = alpha; chosen = (limbchain(names, s, cum), rootw, t)
    # Only skin that is not on a limb may join the shell; a shoulder that went rigid would tear the
    # moment the limb swung.
    g = carapace_share(q) * (1 - best)
    if chosen:
        limb, rootw, t = chosen
        base = {}
        for n, v in w.items(): base[n] = base.get(n, 0) + v * (1 - t)
        for n, v in rootw.items(): base[n] = base.get(n, 0) + v * t
        w = {n: v * (1 - best) for n, v in base.items()}
        for n, v in limb.items(): w[n] = w.get(n, 0) + v * best
    if g > 0:
        w = {n: v * (1 - g) for n, v in w.items()}
        w['carapace'] = w.get('carapace', 0) + g
    w = {n: v for n, v in w.items() if v > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]; total = sum(v for _, v in items)
    return {n: v / total for n, v in items}


# ---- seating audit: every appendage root and the jaw hinge must sit inside the intake surface ---
inside = BVHTree.FromPolygons([v.co for v in auth.data.vertices], [p.vertices[:] for p in auth.data.polygons], all_triangles=False)


def depth(p):
    loc, nor, idx, dist = inside.find_nearest(Vector(p))
    return dist * (-1 if (Vector(p) - loc).dot(nor) > 0 else 1)


seating = {}
for key, (pts, names) in LIMBS.items(): seating[names[0]] = depth(pts[0])
seating['carapace'] = depth((.060, 0, .060))
for n, d in seating.items(): assert d > .015, ('appendage root outside the trunk', n, d)

# ---- measure the mouth the source actually modelled --------------------------------------------
# The generated head carries a real slit with an interior. A vertex whose own outward normal runs
# straight back into the mesh within MOUTH_GAP is looking across that slit at the lip opposite, so
# the set of them is the oral cavity and its mid height per station is where the jaw comes away.
# Placodus' method exactly; the numbers are Henodus'. The cavity here is short -- the front 0.04 of
# the body, which is what a beaked filter feeder's mouth is -- so the seam is held at its rearmost
# measured value behind the cavity rather than extrapolated down a steep ramp into the chin.
HINGE_X = .437
MOUTH_GAP = .020


def cavity_of(o):
    bv = BVHTree.FromPolygons([v.co for v in o.data.vertices], [p.vertices[:] for p in o.data.polygons], all_triangles=False)
    pts = []
    for v in o.data.vertices:
        if v.co.x < .43 or abs(v.co.y) > .10 or not -.09 < v.co.z < .02: continue
        hit = bv.ray_cast(v.co + v.normal * 3e-4, v.normal, MOUTH_GAP)
        if hit[0] is not None: pts.append(v.co[:])
    return np.array(pts)


CAV = cavity_of(auth)
assert len(CAV) > 60, ('the mouth cavity did not measure', len(CAV))


def profile(lo, hi, step, half):
    xs = []; mid = []; wide = []; tall = []
    for x in np.arange(lo, hi + 1e-9, step):
        m = (CAV[:, 0] >= x - half) & (CAV[:, 0] < x + half)
        if m.sum() < 8: continue
        q = CAV[m]; a = float(np.percentile(q[:, 2], 6)); b = float(np.percentile(q[:, 2], 94))
        xs.append(float(x)); mid.append((a + b) / 2); tall.append((b - a) / 2)
        wide.append(float(np.percentile(np.abs(q[:, 1]), 92)))
    return np.array(xs), np.array(mid), np.array(wide), np.array(tall)


def blur(v, s=1.4):
    i = np.arange(len(v))
    return np.array([float((v * np.exp(-.5 * ((i - k) / s) ** 2)).sum() / np.exp(-.5 * ((i - k) / s) ** 2).sum()) for k in i])


MX, MID, WIDE, TALL = profile(.460, .495, .005, .006)
assert len(MX) >= 5, ('too few mouth stations', len(MX))
MID = blur(MID); WIDE = blur(WIDE); TALL = blur(TALL)


def seam(x): return float(np.interp(x, MX, MID))


# The mandible must be a mandible and not a sliver: at the hinge the seam has to leave a real
# depth of head under it. This is the check Macrocnemus failed.
def head_floor(x):
    P = np.array([v.co[:] for v in auth.data.vertices])
    m = (np.abs(P[:, 0] - x) < .006) & (np.abs(P[:, 1]) < .09)
    return float(P[m][:, 2].min()), float(P[m][:, 2].max())


_lo, _hi = head_floor(HINGE_X)
jaw_depth = (seam(HINGE_X) - _lo) / (_hi - _lo)
assert .12 < jaw_depth < .55, ('the mandible is a sliver or the seam is above the head', jaw_depth, seam(HINGE_X), _lo, _hi)
JAW_FRONT_X = float(max(v.co.x for v in auth.data.vertices)) + .01     # the whole beak swings


def cut_height(c):
    # The upper fringe hangs outboard of the narrow inner mandible. Descend
    # below it at the sides; disconnected tooth tips are returned to the skull
    # by split() rather than allowed to follow the lower jaw.
    front = smooth((c.x - .450) / .015)
    inner_width = float(np.interp(c.x, MX, WIDE)) * .60
    outside = smooth((abs(c.y) - inner_width) / .016)
    return seam(c.x) - front * (float(np.interp(c.x, MX, TALL)) * .72 + outside * .038)


def is_jaw(c): return c.x > HINGE_X and c.z < cut_height(c) - 1e-7


parts = {}
jaw_split = {}


def bisect_mouth(o):
    """Open the cut before taking it: the hinge bound as a plane, the seam as a curve.

    A curve cannot be a bisection plane, so the head is sheared vertically by -seam(x) first, which
    carries the curve onto the plane z=0 exactly; the cut is taken there and the shear undone, so
    every vertex the cut adds lands on the seam itself."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-7,
                           plane_co=(HINGE_X, 0, 0), plane_no=(1, 0, 0), clear_inner=False, clear_outer=False)
    for v in bm.verts: v.co.z -= cut_height(v.co)
    head = [f for f in bm.faces if f.calc_center_median().x > HINGE_X - .03]
    verts = set(); edges = set()
    for f in head:
        verts.update(f.verts); edges.update(f.edges)
    bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + head, dist=1e-7,
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=False, clear_outer=False)
    for v in bm.verts: v.co.z += cut_height(v.co)
    bm.to_mesh(o.data); bm.free()


def split(o, label, test, mouth=False):
    if mouth: bisect_mouth(o)
    part = o.copy(); part.data = o.data.copy(); part.name = o.name + ' ' + label; bpy.context.collection.objects.link(part)
    for target, keep in [(o, False), (part, True)]:
        bm = bmesh.new(); bm.from_mesh(target.data)
        selected = {f for f in bm.faces if test(f.calc_center_median())}
        if mouth:
            # A hanging upper tooth crosses the height of the mouth seam but
            # its tip is a separate component below that seam. Only the lower
            # jaw's connected sheet reaches the posterior hinge. Keep the other
            # pieces with their upper roots rather than cutting teeth in half.
            unseen = set(selected); components = []
            while unseen:
                seed = unseen.pop(); component = {seed}; stack = [seed]
                while stack:
                    f = stack.pop()
                    for e in f.edges:
                        for other in e.link_faces:
                            if other in unseen:
                                unseen.remove(other); component.add(other); stack.append(other)
                components.append(component)
            hinged = [c for c in components if any(
                abs(v.co.x - HINGE_X) < 1e-5 for f in c for v in f.verts)]
            assert hinged, 'no lower-jaw sheet reaches the hinge'
            retained = max(hinged, key=len)
            if not keep:
                jaw_split[o.name] = {'candidateComponents': len(components),
                    'lowerJawFaces': len(retained),
                    'upperFringeFacesRetained': len(selected) - len(retained)}
            selected = retained
        discard = [f for f in bm.faces if (f in selected) != keep]
        bmesh.ops.delete(bm, geom=discard, context='FACES')
        loose = [v for v in bm.verts if not v.link_faces]
        if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(target.data); bm.free()
    parts.setdefault(label, {})[o.name] = part
    return part


for o in [auth, puppet]:
    split(o, 'lower jaw', is_jaw, mouth=True)
    T.cap_cut(o, lambda p: abs(p.x - HINGE_X) < 1e-5, Vector((1, 0, 0)))
    T.cap_cut(parts['lower jaw'][o.name], lambda p: abs(p.x - HINGE_X) < 1e-5, Vector((-1, 0, 0)))

arm = bpy.data.armatures.new('Henodus shared skeleton'); rig = bpy.data.objects.new('Henodus_Rig', arm)
bpy.context.collection.objects.link(rig); bpy.context.view_layer.objects.active = rig; rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for n, (p, parent) in B.items():
    eb = arm.edit_bones.new(n); eb.head = tx(p); eb.tail = eb.head + Vector((0, .16, 0))
    if parent: eb.parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
influences = []; carapace_vertices = 0; JUNCTION = {}
for o in [auth, puppet]:
    shell = parts['lower jaw'][o.name]
    for part in (o, shell):
        for n in B: part.vertex_groups.new(name=n)
    body_w = []
    for v in o.data.vertices:
        w = weights(v.co); influences.append(len(w))
        if w.get('carapace', 0) > .5: carapace_vertices += 1
        body_w.append(w)
    # The mandible is skinned *into* the head rather than rigid against it: one field over both
    # parts, the throat under the hinge following the jaw and the shell ramping to full jaw over
    # `band` from the cut rim, so the two copies of every rim vertex carry the same weights and the
    # cut cannot open (`T.jaw_junction`; `tools/triassic/lag.mjs` measures the seam it closes). The
    # earlier attachment shared the body's field over a 0.018 blend from the hinge and still left 17
    # rim points opening 0.63 % of a body at Bite, because the body's copy never followed the jaw.
    body_w, shell_w, JUNCTION[o.name] = T.jaw_junction(
        o, shell, body_w, B['jaw'][0], rear=lambda p: abs(p.x - HINGE_X) < 1e-5,
        upper_jaw=lambda p: p.x > HINGE_X and p.z >= cut_height(p) - 1e-6, axis=(1., 0., 0.))
    for part, field in ((o, body_w), (shell, shell_w)):
        for v in part.data.vertices:
            for n, val in field[v.index].items(): part.vertex_groups[n].add([v.index], val, 'REPLACE')
        for v in part.data.vertices: v.co = tx(v.co)
        for p in part.data.polygons: p.use_smooth = True
        mod = part.modifiers.new('Shared articulated skeleton' if part is o else 'Mandible into the head', 'ARMATURE'); mod.object = rig; part.parent = rig

# ---- mouth interior: separate rigid palate and floor ---------------------------------------------
#
# A palate rigid on the skull and a floor rigid on the jaw, each closed on its own and each filling
# its own jaw's interior out to the head's measured room, overlapping rather than joining at the
# corner of the mouth where the jaw's rotation is zero (`T.oral_shells`). One sac whose wall
# stretched between the two bones stood here; the wall could not part, which is what it was written
# for, and it still photographs as a mouth webbed shut.
mouthmat = bpy.data.materials.new('Henodus mouth interior'); mouthmat.use_nodes = True
mouthmat.use_backface_culling = True
mbs = mouthmat.node_tree.nodes.get('Principled BSDF')
MOUTH_COLOUR = (.24, .105, .095, 1)
mbs.inputs['Base Color'].default_value = MOUTH_COLOUR; mbs.inputs['Roughness'].default_value = .62
mouthmat.diffuse_color = MOUTH_COLOUR
oralparts = []
MOUTH_BACK = HINGE_X - .048
MOUTH_FRONT = float(MX[-1]) + .002
LINING_INSET = .95


def mouth_section(x):
    e = smooth((x - MOUTH_BACK) / .026) * smooth((MOUTH_FRONT - x) / .010)
    w = float(np.interp(x, MX, WIDE)) * LINING_INSET * (.85 + .15 * e)
    h = max(float(np.interp(x, MX, TALL)) * LINING_INSET, .0026) * (.72 + .28 * e)
    return w, h


# How much head there is round the mouth line at each station: what the palate and the floor are
# each sized to fill. Two shells drawn to the lumen alone leave a gap either side of them, and a ray
# into the gape passes between them and hits the inside of the far cheek -- the line the sac's
# stretching wall used to stand across. Cast inwards on the closed intake surface (`inside`, built
# before the jaw is cut off): this generation models a real slit, so a ray cast *outwards* from the
# mouth axis would stop on the lumen's own wall and measure the mouth all over again.
_room_cache = {}


def mouth_room(x):
    k = round(x, 5)
    if k not in _room_cache:
        _room_cache[k] = T.mouth_room(inside, Vector((x, 0, seam(x))), Vector((0, 1, 0)),
                                      Vector((0, 0, 1)), limit=.20, fallback=.02)
    return _room_cache[k]


LINING_RINGS, LINING_RING = 20, 14
# A palate rigid on the skull and a floor rigid on the jaw, each closed on its own, overlapping at
# the corner of the mouth where the jaw's rotation is zero: `T.oral_shells`, shared with the era.
# What stood here was one sac whose wall stretched between the two bones. The wall could not part,
# which is what it was written for, and it was still wrong: it photographs as a mouth webbed shut.
lin_raw, faces, n_palate = T.oral_shells(seam, mouth_section, MOUTH_BACK, MOUTH_FRONT,
                                         rings=LINING_RINGS, ring=LINING_RING, axis='x',
                                         room=mouth_room)
lining = T.oral_object('Oral cavity lining', tx, lin_raw, faces, n_palate, mouthmat, rig,
                       measured_room=True)
oralparts.append(lining)
# Recorded, not asserted, and Placodus says why: a point in the lumen is OUTSIDE the closed shell,
# because the shell folds in through the modelled slit, so a nearest-surface depth on a lining
# vertex is as often measuring the mouth's own inner wall as the skin. What the lining being inside
# the mouth actually rests on is the measurement below -- the section it is drawn from is the
# cavity's own 92nd-percentile half width and 94th-to-6th-percentile height, inset by LINING_INSET.
lining_depth = min(depth(p) for p in lin_raw)
mouth_cover = []
for k, x in enumerate(MX):
    if not MOUTH_BACK + .026 < x < MOUTH_FRONT - .010: continue
    w, h = mouth_section(float(x))
    mouth_cover.append([round(float(x), 4), round(w / float(WIDE[k]), 3), round(h / max(float(TALL[k]), 1e-6), 3)])
    assert w >= float(WIDE[k]) * .90, ('the oral lining is narrower than the mouth', x, w, WIDE[k])
    assert h >= float(TALL[k]) * .85, ('the oral lining is shallower than the mouth', x, h, TALL[k])

# A closed cheek envelope around the actual hinge, covering the square face the cut leaves at
# x = HINGE_X from the seam down to the chin, which swings into view the moment the mouth opens.
HINGE_Z = (seam(HINGE_X) + _lo) / 2
bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, location=tx((HINGE_X + .002, 0, HINGE_Z)))
o = bpy.context.object; o.name = 'Seated jaw hinge tissue'; o.scale = (.136, .090, .072)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
for v in o.data.vertices: v.co = o.matrix_world @ v.co
o.location = (0, 0, 0)
hm = bpy.data.materials.new('Henodus jaw hinge body'); hm.use_nodes = True
hbs = hm.node_tree.nodes.get('Principled BSDF'); hbs.inputs['Base Color'].default_value = (.30, .28, .23, 1)
hbs.inputs['Roughness'].default_value = .7; hm.diffuse_color = (.30, .28, .23, 1)
o.data.materials.clear(); o.data.materials.append(hm)
for n in ['skull', 'jaw']: o.vertex_groups.new(name=n)
for v in o.data.vertices:
    t = max(0., min(1., (seam(HINGE_X) * SCALE - v.co.z) / (.030 * SCALE)))
    o.vertex_groups['jaw'].add([v.index], t * .5, 'REPLACE'); o.vertex_groups['skull'].add([v.index], 1 - t * .5, 'REPLACE')
for p in o.data.polygons: p.use_smooth = True
mo = o.modifiers.new('Hinge skin', 'ARMATURE'); mo.object = rig; o.parent = rig; oralparts.append(o)
hinge_depth = min(depth(Vector((-v.co.y / SCALE, v.co.x / SCALE, v.co.z / SCALE))) for v in o.data.vertices)
assert hinge_depth > -.006, ('the hinge envelope breaks the skin', hinge_depth)

# ---- measured comparison of the two actual surfaces --------------------------------------------
AUTH_GROUP = [auth, parts['lower jaw'][auth.name]]
PUP_GROUP = [puppet, parts['lower jaw'][puppet.name]]


def merged(group):
    verts = []; polys = []
    for o in group:
        base = len(verts); verts.extend(v.co.copy() for v in o.data.vertices)
        polys.extend(tuple(base + j for j in q.vertices) for q in o.data.polygons)
    return verts, polys


pv = BVHTree.FromPolygons(*merged(PUP_GROUP))
distances = [pv.find_nearest(v)[3] for v in merged(AUTH_GROUP)[0]]
surface_outliers = int(sum(1 for d in distances if d > .15))
assert max(distances) < .30, max(distances)
assert float(np.quantile(distances, .95)) < .05, float(np.quantile(distances, .95))


def section(objects, y):
    points = []
    for o in objects:
        for e in o.data.edges:
            a, b = [o.data.vertices[j].co for j in e.vertices]
            if (a.y - y) * (b.y - y) <= 0 and abs(a.y - b.y) > 1e-8: points.append(a + (b - a) * ((y - a.y) / (b.y - a.y)))
    if not points: return None
    a = np.array(points); return {'min': a.min(0).tolist(), 'max': a.max(0).tolist()}


profile_rows = []; worst = 0.
ylo = min(min(v.co.y for v in o.data.vertices) for o in AUTH_GROUP); yhi = max(max(v.co.y for v in o.data.vertices) for o in AUTH_GROUP)
model_length = float(yhi - ylo)
for y in np.linspace(ylo + .02, yhi - .02, 21):
    row = {'stationY': float(y)}
    for label, group in [('authored', AUTH_GROUP), ('puppet', PUP_GROUP)]: row[label] = section(group, y)
    if row['authored'] and row['puppet']:
        row['maximumEnvelopeDifference'] = max(abs(a - b) for k in ['min', 'max'] for a, b in zip(row['authored'][k], row['puppet'][k]))
        worst = max(worst, row['maximumEnvelopeDifference']); assert row['maximumEnvelopeDifference'] < .2, row
    profile_rows.append(row)

# ---- the shape record a later neutral-pose pass needs -------------------------------------------
# Mean curvature radius of each body region's centreline over that region's own mean section, and
# the paired-limb asymmetry, both as fractions of body length: what has to be known before a
# neutral pose can be authored, measured here rather than eyeballed there.
def curvature_over_section(pts, half_widths):
    P = [Vector(p) for p in pts]; radii = []
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        ab = (b - a).length; bc = (c - b).length; ac = (c - a).length
        s = (ab + bc + ac) / 2; area = max(1e-12, s * max(0., s - ab) * max(0., s - bc) * max(0., s - ac)) ** .5
        radii.append(ab * bc * ac / (4 * area))
    mean_r = float(np.mean(radii)); sec = float(np.mean(half_widths))
    return {'meanCurvatureRadius': round(mean_r, 4), 'meanHalfSection': round(sec, 4),
            'meanCurvatureRadiusOverSection': round(mean_r / max(1e-6, sec), 2)}


P_ALL = np.array([tuple(Vector((-v.co.y / SCALE, v.co.x / SCALE, v.co.z / SCALE))) for v in auth.data.vertices])


def half_section(x, span=.02):
    m = (np.abs(P_ALL[:, 0] - x) < span) & (np.abs(P_ALL[:, 1]) < .12)
    if m.sum() < 5: return .02
    q = P_ALL[m]; return float(max(np.abs(q[:, 1]).max(), (q[:, 2].max() - q[:, 2].min()) / 2))


curvature = {
    'tail': curvature_over_section(TAIL_PTS, [half_section(p[0]) for p in TAIL_PTS]),
    'spine': curvature_over_section([B[n][0][:] for n in ['tail_00', 'body', 'chest', 'neck', 'skull']],
                                    [half_section(B[n][0].x) for n in ['tail_00', 'body', 'chest', 'neck', 'skull']]),
    'neck': curvature_over_section([B[n][0][:] for n in ['chest', 'neck', 'skull', 'jaw']],
                                   [half_section(B[n][0].x) for n in ['chest', 'neck', 'skull', 'jaw']])}
asymmetry = {}
for kind in ('fore', 'hind'):
    L = LIMB_PTS[kind + 'L']; R = LIMB_PTS[kind + 'R']
    asymmetry[kind] = {'jointOffsetOverBodyLength': [round(float(max(abs(a[0] - b[0]), abs(abs(a[1]) - abs(b[1])), abs(a[2] - b[2]))), 4)
                                                     for a, b in zip(L, R)]}
    m = P_ALL[:, 0]
    lo, hi = (min(p[0] for p in L + R) - .09, max(p[0] for p in L + R) + .09)
    selL = (m > lo) & (m < hi) & (P_ALL[:, 1] > .17); selR = (m > lo) & (m < hi) & (P_ALL[:, 1] < -.17)
    asymmetry[kind]['surfaceReachOverBodyLength'] = [round(float(P_ALL[selL][:, 1].max()), 4),
                                                     round(float(-P_ALL[selR][:, 1].min()), 4)]
    asymmetry[kind]['surfaceReachDifference'] = round(abs(asymmetry[kind]['surfaceReachOverBodyLength'][0]
                                                          - asymmetry[kind]['surfaceReachOverBodyLength'][1]), 4)

# ---- performance --------------------------------------------------------------------------------
scene = bpy.context.scene; scene.render.fps = 30; rig.animation_data_create()
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'


def reset():
    for q in rig.pose.bones: q.rotation_euler = (0, 0, 0); q.location = (0, 0, 0); q.scale = (1, 1, 1)


AMP = {'Idle': .30, 'Swim': 1., 'Sprint': 1.20, 'Crawl': 1., 'Graze': .4, 'Eat': .25, 'Guard': .14,
       'Breathe': .35, 'Breath': .6, 'Dodge': 1.1, 'Ability': .3, 'Grab': .3, 'Growth': .4}
# The row: a limbed swimmer's dash has to paddle, so the stroke is written as a reach forward and a
# sweep back at the shoulder rather than a waggle at the wrist, and the swept angle at each limb
# root is measured out of the sampled clip below rather than asserted here.
ROW_REACH, ROW_SWEEP = .34, .62
limb_sweep = {}
seams = {}; bounds = {}
for clip, duration in CLIPS.items():
    a = bpy.data.actions.new(clip); a.use_fake_user = True; rig.animation_data.action = a
    last = round(duration * 30); first = None
    root_angles = {k: [] for k in LIMBS}
    for f in range(last + 1):
        reset(); u = f / last; p = 2 * pi * u; e = sin(pi * u) ** 2; loop = clip in LOOPS; env = 1 if loop else e
        pb = rig.pose.bones
        wave = lambda lag=0, freq=1: (sin(p * freq - lag) - sin(-lag)) * env
        pulse = lambda c, k: ((1 + cos(p - 2 * pi * c)) / 2) ** k
        sbump = lambda a, b: (sin(pi * (u - a) / (b - a)) ** 2 if a < u < b else 0.)
        amp = AMP.get(clip, .25)
        peak = sin(pi * (u - .24) / .4) ** 2 if .24 < u < .64 else 0
        wind = sin(pi * u / .28) ** 2 if u < .28 else 0
        dead = smooth(u) if clip == 'Death' else 0
        rowing = clip in ['Swim', 'Sprint']
        turn = (-1 if clip == 'TurnLeft' else 1) * e if clip in ['TurnLeft', 'TurnRight'] else 0
        if clip == 'Death': amp *= 1 - dead
        # ---- jaw. The beak is a scoop with a denticle fringe: a short gape, held open to graze.
        opening = .010 * (1 - cos(p)) if loop else 0
        if clip == 'Eat': opening = .12 * (1 - cos(p * 2))
        if clip == 'Bite': opening = .34 * sin(pi * u) ** 2
        if clip == 'Attack': opening = .30 * wind + .05 * peak
        if clip == 'Heavy': opening = .34 * wind + .03 * peak
        if clip == 'Ability': opening = .26 * wind + .05 * sbump(.30, 1.) * (1 - cos(2 * pi * u * 5)) / 2
        if clip == 'Graze': opening = .22 + .10 * sin(p * 2)
        if clip == 'Grab': opening = .04 * e
        if clip == 'Breathe': opening = .05 * pulse(.30, 6) + .05 * pulse(.72, 6)
        if clip == 'Breath': opening = .18 * peak
        if clip == 'Crawl': opening = .02 * pulse(.55, 4)
        opening += .22 * dead
        pb['jaw'].rotation_euler.x = opening; pb['skull'].rotation_euler.x = -.06 * opening
        body = pb['body']
        # ---- the tail. A rudder behind a shell, never an engine: it trails and steers.
        for i in range(6):
            q = pb['tail_%02d' % i]
            if rowing: q.rotation_euler.z = (.026 + .019 * i) * amp * sin(p - i * .60)
            elif clip == 'Crawl': q.rotation_euler.z = (.018 + .011 * i) * sin(p - i * .50)
            else: q.rotation_euler.z = (.018 + .009 * i) * amp * wave(i * .5) + turn * (.022 + .012 * i) + dead * .03 * sin(i * .6)
            if clip == 'Dodge': q.rotation_euler.z += .10 * e * sin(i * .7 + .5)
            if clip in ['Dive', 'Rise']: q.rotation_euler.x = (1 if clip == 'Dive' else -1) * .030 * e * (1 + .15 * i)
            if clip == 'Death': q.rotation_euler.x += .03 * dead * sin(i * .5)
        if rowing:
            # Four-limb row. Each limb reaches forward until it is flush with the flank, then
            # sweeps back; the hind pair runs half a cycle behind the fore pair.
            body.rotation_euler.x = .035 * amp * sin(2 * p + .4)
            body.location.z = .05 * amp * sin(2 * p)
            pb['neck'].rotation_euler.x = .030 * amp * sin(2 * p + .9)
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1; hind = key.startswith('hind')
                up, lo_, pad = pb[names[0]], pb[names[1]], pb[names[2]]
                ph = p - (pi if hind else 0)
                stroke = sin(ph)
                up.rotation_euler.z = s * (ROW_REACH * amp * stroke)
                up.rotation_euler.x = -.10 - ROW_SWEEP * .35 * amp * cos(ph)
                up.rotation_euler.y = s * (-.18 - .16 * amp * cos(ph))
                lo_.rotation_euler.x = -.16 + .30 * amp * max(0., -stroke)
                lo_.rotation_euler.z = s * .14 * amp * stroke
                pad.rotation_euler.x = .16 * amp * sin(ph - 1.1)
                pad.rotation_euler.y = s * .12 * amp * sin(ph - .8)
        elif clip == 'Crawl':
            fore_push = pulse(.10, 9); hind_push = pulse(.23, 9); fore_reach = pulse(.70, 3.5); hind_reach = pulse(.83, 3.5)
            contact = pulse(.02, 3.2)
            body.location.z = .30 * (1 - contact)
            body.rotation_euler.x = -.10 * hind_push - .04 * fore_push + .06 * fore_reach
            body.rotation_euler.z = .030 * sin(p + .4); body.rotation_euler.y = .04 * sin(p * 2 + .9)
            pb['neck'].rotation_euler.x = .09 * contact - .09 * hind_push
            pb['skull'].rotation_euler.x = .05 * contact - .04 * hind_push
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1; hind = key.startswith('hind')
                up, lo_, pad = pb[names[0]], pb[names[1]], pb[names[2]]
                push = hind_push if hind else fore_push; reach = hind_reach if hind else fore_reach
                up.rotation_euler.x = (.62 if hind else .44) * push - (.34 if hind else .26) * reach + .04
                up.rotation_euler.y = s * ((.30 if hind else .24) * push - .09 * reach)
                up.rotation_euler.z = s * (.14 * push - .10 * reach)
                lo_.rotation_euler.x = (.42 if hind else .34) * push - (.28 if hind else .24) * reach - (.18 if hind else .20)
                lo_.rotation_euler.y = s * (.08 * push)
                pad.rotation_euler.x = .22 * push - .15 * reach + .05
                pad.rotation_euler.y = s * .08 * push
        else:
            body.rotation_euler.y = .020 * amp * wave(.3); body.location.z = .07 * amp * wave(.2)
            body.rotation_euler.z = .17 * turn; body.rotation_euler.y += .09 * turn
            pb['chest'].rotation_euler.z = .014 * amp * wave(.5) + .055 * turn
            pb['neck'].rotation_euler.z = .018 * amp * wave(.9) + .040 * turn
            pb['neck'].rotation_euler.x = .008 * amp * wave(.6)
            if clip in ['Dive', 'Rise']:
                d = 1 if clip == 'Dive' else -1
                body.rotation_euler.x = d * .24 * e; pb['neck'].rotation_euler.x = d * .12 * e; pb['chest'].rotation_euler.x = d * .08 * e
            if clip == 'Attack':
                body.location.y = .10 * wind - .34 * peak; body.rotation_euler.x = .06 * wind - .09 * peak
                pb['neck'].rotation_euler.x = -.09 * wind + .12 * peak
            if clip == 'Heavy':
                body.location.y = .16 * wind - .30 * peak; body.rotation_euler.x = .10 * wind - .13 * peak
                body.rotation_euler.z = -.06 * wind + .11 * peak; pb['neck'].rotation_euler.x = -.12 * wind + .16 * peak
            if clip == 'Bite': pb['neck'].rotation_euler.x = -.05 * e; body.location.y = -.06 * e
            if clip == 'Parry': body.rotation_euler.y = .26 * e; body.rotation_euler.z = .12 * e; body.location.z = -.18 * e
            if clip == 'Guard':
                body.location.z = -.20 - .04 * (1 - cos(p)); body.rotation_euler.x = .035 * (1 - cos(p))
                pb['neck'].rotation_euler.x = .15; pb['skull'].rotation_euler.x = .08
            if clip == 'Dodge':
                body.rotation_euler.y = .34 * e; body.rotation_euler.z = -.27 * e; body.location.x = .38 * e; body.location.z = .28 * e
            if clip in ['Hit', 'Stagger']:
                body.rotation_euler.z = .15 * e * sin(p * (1 if clip == 'Hit' else 2)); body.rotation_euler.y = .18 * e
                body.location.y = .10 * e; body.location.z = -.10 * e
                pb['neck'].rotation_euler.x = .09 * e * sin(p * (1 if clip == 'Hit' else 2))
            if clip == 'Breath':
                body.rotation_euler.x = -.28 * e; body.location.z = .42 * e; body.rotation_euler.z = .05 * e * sin(p)
                pb['neck'].rotation_euler.x = -.16 * e; pb['skull'].rotation_euler.x = -.09 * e
            if clip == 'Breathe':
                body.rotation_euler.x = -.25; body.location.z = .32 + .14 * sin(p)
                pb['chest'].rotation_euler.x = -.07 - .04 * sin(p * 2); pb['neck'].rotation_euler.x = -.19 - .04 * sin(p)
                pb['skull'].rotation_euler.x = -.13 - .03 * sin(p)
            if clip == 'Ability':
                body.location.y = -.14 * e; body.rotation_euler.x = -.05 * e; pb['neck'].rotation_euler.x = .09 * e
                pb['skull'].rotation_euler.y = .05 * e * sin(p * 4); pb['skull'].rotation_euler.z = .04 * e * sin(p * 3)
            if clip == 'Graze':
                # Head down on the sediment, the fringe raking side to side as the body inches on.
                body.rotation_euler.x = .14 + .03 * sin(p * 2); body.location.z = -.34
                pb['chest'].rotation_euler.x = .08; pb['neck'].rotation_euler.x = .20 + .04 * sin(p * 2)
                pb['skull'].rotation_euler.x = .12; pb['skull'].rotation_euler.z = .16 * sin(p)
                pb['neck'].rotation_euler.z = .09 * sin(p)
            if clip == 'Eat':
                body.rotation_euler.x = .10 + .03 * sin(p * 2); pb['neck'].rotation_euler.x = .15 + .05 * sin(p * 2)
                pb['skull'].rotation_euler.x = .07 + .04 * sin(p * 2); body.location.z = -.28
            if clip == 'Grab':
                body.location.y = .18 * e; body.rotation_euler.x = -.07 * e; body.rotation_euler.z = .05 * e * sin(p * 3)
                pb['neck'].rotation_euler.x = -.13 * e + .05 * e * sin(p * 3)
            if clip == 'Growth':
                body.rotation_euler.x = -.06 * e; body.rotation_euler.y = .05 * e; body.location.z = .32 * e
                pb['neck'].rotation_euler.x = -.08 * e
            if clip == 'Death':
                body.rotation_euler.y += 1.15 * dead; body.rotation_euler.x += .10 * dead; body.location.z -= .50 * dead
                pb['neck'].rotation_euler.x += .16 * dead; pb['skull'].rotation_euler.x += .10 * dead
            for key, (pts, names) in LIMBS.items():
                s = 1 if key.endswith('L') else -1; hind = key.startswith('hind'); lag = (pi if hind else 0) + (.12 if s < 0 else 0)
                up, lo_, pad = pb[names[0]], pb[names[1]], pb[names[2]]
                up.rotation_euler.x = .14 * amp * wave(lag) + (-.26 if clip == 'Guard' else 0) - .18 * dead
                up.rotation_euler.y = s * (.09 * amp * wave(lag + pi / 2) + (.22 if clip == 'Guard' else 0) + .18 * dead)
                up.rotation_euler.z = s * .10 * amp * wave(lag + .4)
                lo_.rotation_euler.x = .10 * amp * wave(lag + .7) + (.20 if clip == 'Guard' else 0) - .12 * dead
                pad.rotation_euler.x = .09 * amp * wave(lag + 1.3) + .09 * dead
                pad.rotation_euler.y = s * .07 * amp * wave(lag + 1.1)
                if clip in ['Dive', 'Rise']:
                    d = 1 if clip == 'Dive' else -1
                    if not hind: up.rotation_euler.x += -d * .26 * e; up.rotation_euler.y += s * .18 * e
                if turn:
                    up.rotation_euler.z += s * (.28 if (s > 0) == (turn < 0) else -.10) * abs(turn)
                    up.rotation_euler.y += s * .14 * abs(turn)
                if clip == 'Dodge': up.rotation_euler.x += (.40 if s > 0 else -.14) * e; up.rotation_euler.y += s * .22 * e
                if clip in ['Attack', 'Heavy']: up.rotation_euler.x += (.14 * wind - .24 * peak)
                if clip == 'Grab': up.rotation_euler.x += .28 * e; lo_.rotation_euler.x += .18 * e
                if clip == 'Graze': up.rotation_euler.x += .16 + .10 * sin(p + (pi if hind else 0))
                if clip == 'Growth': up.rotation_euler.y -= s * .20 * e
                if clip == 'Breathe': up.rotation_euler.x = .20 + .09 * sin(p + (pi if hind else 0)); up.rotation_euler.y = s * (-.13)
                if clip == 'Breath': up.rotation_euler.x += .24 * e; up.rotation_euler.y += s * (-.11 * e)
        for key, (pts, names) in LIMBS.items():
            q = pb[names[0]]
            root_angles[key].append(Quaternion(q.rotation_euler.to_quaternion()))
        state = np.array([tuple(q.rotation_euler) + tuple(q.location) for q in pb])
        if f == 0: first = state.copy()
        if f == last: seams[clip] = float(abs(state - first).max())
        for q in pb:
            if q.name not in ('root', 'carapace'): q.keyframe_insert('rotation_euler', frame=f)
            if q.name == 'body': q.keyframe_insert('location', frame=f)
    # Swept angle at each limb root over the cycle: the largest angle between any two poses the
    # root takes, in degrees, so "the limbs move" is a number rather than an impression.
    limb_sweep[clip] = {k: round(max(math.degrees(abs(a.rotation_difference(b).angle))
                                     for i, a in enumerate(v) for b in v[i + 1:]) if len(v) > 1 else 0., 1)
                        for k, v in root_angles.items()}
    points = []
    for f in np.linspace(0, last, 13):
        scene.frame_set(int(f)); dg = bpy.context.evaluated_depsgraph_get()
        for o in AUTH_GROUP + PUP_GROUP + oralparts:
            ev = o.evaluated_get(dg); me = ev.to_mesh(); co = np.array([v.co[:] for v in me.vertices])
            assert np.isfinite(co).all(); points.extend([co.min(0), co.max(0)]); ev.to_mesh_clear()
    bounds[clip] = [np.array(points).min(0).tolist(), np.array(points).max(0).tolist()]; rig.animation_data.action = None
for c in set(CLIPS) - {'Death'}: assert seams[c] < 1e-6, (c, seams[c])
for c in ['Swim', 'Sprint', 'Crawl']:
    assert min(limb_sweep[c].values()) > 25, ('the limbs barely move in ' + c, limb_sweep[c])
reset(); scene.frame_set(0)

anchors = [
    {'name': 'anchor_mouth', 'bone': 'jaw', 'point': list(tx((.493, 0, -.042))), 'role': 'mouth'},
    {'name': 'anchor_mouth_inside', 'bone': 'skull', 'point': list(tx((.465, 0, -.044))), 'role': 'swallow'},
    {'name': 'anchor_attack_primary', 'bone': 'skull', 'point': list(tx((.500, 0, -.036))), 'role': 'attack'}]
sockets = []
for a in anchors:
    o = bpy.data.objects.new(a['name'], None); bpy.context.collection.objects.link(o); o.parent = rig
    o.parent_type = 'BONE'; o.parent_bone = a['bone']; o.matrix_world.translation = Vector(a['point'])
    o['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}; sockets.append(o)
open(os.path.join(HERE, 'anchors.json'), 'w').write(json.dumps({ID: anchors}, indent=2))

kwargs = dict(export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
              export_force_sampling=True, export_frame_range=False, export_skins=True, export_normals=True,
              export_texcoords=True, export_materials='EXPORT', export_vertex_color='NAME',
              export_vertex_color_name='Color', export_yup=True, export_extras=True)


def patch(path):
    raw = open(path, 'rb').read(); n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n]); binary = raw[20 + n:]
    nodes = g['nodes']; parents = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}

    def world(i):
        no = nodes[i]; q = no.get('rotation', [0, 0, 0, 1])
        m = Matrix(np.array(no['matrix']).reshape(4, 4).T.tolist()) if 'matrix' in no else Matrix.LocRotScale(
            Vector(no.get('translation', [0, 0, 0])), Quaternion((q[3], q[0], q[1], q[2])), Vector(no.get('scale', [1, 1, 1])))
        return world(parents[i]) @ m if i in parents else m

    for a in anchors:
        i = next(k for k, nd in enumerate(nodes) if nd.get('name') == a['name'])
        b = next(k for k, nd in enumerate(nodes) if nd.get('name') == a['bone'])
        pt = a['point']; pt = Vector((pt[0], pt[2], -pt[1])); local = world(b).inverted() @ pt
        if i in parents: nodes[parents[i]]['children'].remove(i)
        nodes[b].setdefault('children', []).append(i)
        nodes[i] = {'name': a['name'], 'translation': list(local),
                    'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'], 'parentBone': a['bone']}}}
    for an in g['animations']:
        an['channels'] = [c for c in an['channels'] if c['target']['path'] != 'scale'
                          and nodes[c['target']['node']].get('name') not in ('root', 'carapace')]
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
for group, suffix in [(AUTH_GROUP, ''), (PUP_GROUP, '.puppet')]:
    bpy.ops.object.select_all(action='DESELECT')
    for o in group + [rig] + sockets + oralparts: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, ID + suffix + '.glb'), **kwargs)
    patch(os.path.join(OUT, ID + suffix + '.glb'))
shutil.copyfile(os.path.join(OUT, ID + '.puppet.glb'), os.path.join(OUT, ID + '.lod1.glb'))

authored_tris = sum(tri(o) for o in AUTH_GROUP) + sum(tri(o) for o in oralparts)
puppet_tris = sum(tri(o) for o in PUP_GROUP) + sum(tri(o) for o in oralparts)
open(os.path.join(HERE, 'henodus-profile.json'), 'w').write(json.dumps({
    'method': '21 exact plane-intersection envelopes of both actual meshes (body and lower jaw); 0.0055 raw-space voxel occupancy resurfacing',
    'bodyLength': model_length, 'stations': profile_rows, 'maximumEnvelopeDifference': worst,
    'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
    'surfaceTolerance': .30, 'surfaceOutliersOver0p15': surface_outliers, 'seatingDepthRaw': seating,
    'mouthSeam': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MX, MID)],
    'liningCoverage': mouth_cover, 'forkedTail': fork}, indent=2))

meta = {'id': ID, 'name': 'Henodus', 'species': 'Henodus chelyops',
        'description': 'Canonical Tripo body and procedural volume twin on one 25-joint rig: a fused rigid carapace, an articulated beak with a closed oral lining, four rowing limbs and a trailing tail.',
        'modelLength': round(model_length, 4), 'lengthMeters': 1.0, 'locomotion': 'Swim',
        'clips': list(CLIPS), 'looping': LOOPS, 'anchors': [a['name'] for a in anchors], 'puppet': 'henodus.puppet.glb',
        'notes': [
            'The squared plated carapace, the five-toed manus and pes, the denticle fringe along the beak and the plated flank are retained from the accepted Tripo volume.',
            'The generation bifurcated the tail behind raw x %.3f. The greenlit pose draws one tapering tail, so intake cuts the fork off square and closes the opening with a fan to a single apex on the tail\'s own centreline, restoring the original length; the cap takes its UVs from the boundary it sits between. FORK_CUT=False in build.py rebuilds the forked tail. A tail that forks is a generation disagreeing with its pose and the honest fix is a fresh generation.' % FORK_X,
            'The carapace is a rigid part on its own unanimated bone, as Placodus\' gastral basket is; only skin that is not on a limb joins it, so no shoulder goes rigid.',
            'The twin resurfaces a 0.0055-unit voxel occupancy field, relaxes it and reduces the new topology. It reuses no source vertex or face.',
            'Same rest rig, inverse binds, sockets and all 24 action sample arrays for authored body and puppet. The LOD keeps every clip.',
            'Original albedo retained with white COLOR_0; normal relief limited to 0.15 and skin explicitly nonmetallic at roughness 0.7. Puppet pigment samples triangle-local UVs to avoid seam bleed.',
            'Swim and Sprint are a four-limb row, not a tail scull: a flat armoured disc has no trunk to send a wave down, and the research reads Henodus as the roster\'s slowest swimmer. Crawl is the bottom walk, Graze the fringe raking sediment, Breathe the settled surface loop.',
            'Living colours, soft tissues and movements are artistic reconstruction. Locomotor translation remains engine-owned.']}
open(os.path.join(OUT, ID + '.json'), 'w').write(json.dumps(meta, indent=2))

report = {'sourceSha256': hashlib.sha256(open(RAW, 'rb').read()).hexdigest(),
          'sourceTriangles': source_triangles, 'sourceComponents': source_components, 'weld': weld,
          'intakeTriangles': intake_triangles,
          'remeshTriangles': remesh_triangles, 'puppetBudget': PUPPET_BUDGET,
          'fullTriangles': authored_tris, 'puppetTriangles': puppet_tris,
          'parts': {'authoredBody': tri(auth), 'authoredJaw': tri(AUTH_GROUP[1]),
                    'puppetBody': tri(puppet), 'puppetJaw': tri(PUP_GROUP[1]),
                    'sharedOral': sum(tri(o) for o in oralparts)},
          'bones': len(B), 'clips': CLIPS, 'looping': LOOPS, 'loopSeams': seams, 'boundsAt13Phases': bounds,
          'modelLength': model_length, 'maximumEnvelopeDifference': worst, 'envelopeTolerance': .2,
          'envelopeTolerancePercent': 4.,
          'surfaceDistanceMax': max(distances), 'surfaceDistanceP95': float(np.quantile(distances, .95)),
          'surfaceDistanceP99': float(np.quantile(distances, .99)), 'surfaceOutliersOver0p15': surface_outliers,
          'surfaceVertices': len(distances),
          'seatingDepthRaw': seating, 'maxInfluences': max(influences), 'meanInfluences': float(np.mean(influences)),
          'carapaceVertices': carapace_vertices, 'carapaceBoneUnanimated': True,
          'limbSweepDegreesPerCycle': limb_sweep,
          'curvature': curvature, 'pairedLimbAsymmetry': asymmetry,
          'mouth': {'method': 'the modelled oral cavity, found by casting each head vertex normal back into the mesh over %.3f raw units; the seam is the mid height of that cavity per station and the lining is its measured section' % MOUTH_GAP,
                    'cutTopology': jaw_split, 'cavityVertices': int(len(CAV)), 'hingeX': HINGE_X, 'jawFrontX': JAW_FRONT_X,
                    'seam': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MX, MID)],
                    'cavityHalfWidth': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MX, WIDE)],
                    'cavityHalfHeight': [[round(float(a), 5), round(float(b), 5)] for a, b in zip(MX, TALL)],
                    'mandibleDepthOverHeadDepthAtHinge': round(float(jaw_depth), 3),
                    'liningInset': LINING_INSET, 'liningCoverage': mouth_cover, 'liningRings': LINING_RINGS,
                    'liningRing': LINING_RING, 'liningBackX': MOUTH_BACK, 'liningFrontX': MOUTH_FRONT, 'liningNearestSurfaceDepthRaw': round(float(lining_depth), 5),
                    'skinDoubleSided': True, 'liningCullsBackfaces': True, 'oneClosedLining': False, 'separateRigidOralShells': True},
          'forkedTail': fork,
          'normalizedWeights': True, 'rootStable': True, 'noScaleChannels': True}
# The two checks that cannot run inside the build -- the edge-stretch sweep over every clip of the
# packaged GLB, and the culled/unculled gape pair -- run after packaging and their results are kept
# in qa.json beside this file, so a rebuild carries them into the validation record rather than
# dropping them on the floor.
_qa = os.path.join(HERE, 'qa.json')
report['historicalQA'] = {'status': 'not revalidated after this rebuild',
    'results': json.load(open(_qa))} if os.path.exists(_qa) else None
open(os.path.join(HERE, 'validation.json'), 'w').write(json.dumps(report, indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL, 'henodus-paired.blend'))
print('HENODUS_REPORT', json.dumps({k: v for k, v in report.items() if k != 'boundsAt13Phases'}))
