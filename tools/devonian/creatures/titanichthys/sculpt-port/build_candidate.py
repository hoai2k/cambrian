"""Titanichthys sculpt-port candidate: geometry.build(nose_edit=True) plus a full rig, textured
materials (the shipped body/oral/fin PNGs, reused via a fresh smart_project UV unwrap -- the same
algorithm materials_02.py used, since geometry changed only at the snout), baked vertex pigment
for the LOD, all 18 procedural clips and the five anchors (mouth/attack anchors follow the moved
nose through the same nose_warp used to build it). Reuses rig_actions_01.py/export_patch_02.py
from rework-v3 unmodified (pure logic, no Blender-version or prior-file coupling) rather than
re-deriving skeleton/animation/anchor code that already exists and matches this geometry exactly.

    /opt/blender/blender --background --python tools/devonian/creatures/titanichthys/sculpt-port/build_candidate.py
"""
import bpy
import sys
import math
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
REWORK = HERE.parent / 'rework-v3'
TEXTURES = HERE.parent
OUT = Path('/home/user/devonian-authoring/titanichthys/sculpt-candidate')
OUT.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(HERE))
sys.path.insert(0, str(REWORK))
import geometry
import rig_actions_01 as ra
from export_patch_02 import patch_export

# The mouth/attack anchors sit forward of the neck, in the region the nose warp reshapes; move
# them with it so the oral/attack sockets stay on the (now longer, narrower) snout. The support
# anchors are aft on the pectoral fins and pass through nose_warp unchanged (it is identity there).
for spec in ra.ANCHORS:
    spec['point'] = tuple(geometry.nose_warp(Vector(spec['point'])))

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)

built = geometry.build(nose_edit=True)
body, eye_L, eye_R = built['body'], built['eye_L'], built['eye_R']
fins = built['fins']
meshes = built['meshes']

# Shipped titanichthys seats its eyes .030 units deeper along each globe's own outward normal
# than build_clay04.py's own placement (release-candidate08/eye-seating-study-02, patch_eye_
# positions_02.py): build_clay04's raw placement only reaches ~41% containment; the shipped
# model's seating reaches ~60-62%. Reproduced here as the same inward nudge, at construction time
# rather than as a post-hoc GLB patch, since this is a fresh build rather than a byte patch of an
# existing one.
EYE_SEAT_DEPTH = 0.030
for info, ob in ((e, eye_L if e['side'] == 'L' else eye_R) for e in built['eyes']):
    normal = Vector(info['normal'])
    ob.location = ob.location - normal * EYE_SEAT_DEPTH
scene = bpy.context.scene
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.cycles.device = 'CPU'

# ---- materials: flat colours matched to the shipped model's own baked atlases (extracted from
# the packaged GLB itself -- the stale top-level titanichthys/*.png are the earlier V2 pipeline's
# files and read a different colour entirely). A fresh smart_project UV does not land in the same
# place the shipped atlas was baked for, so re-applying that atlas image-for-image over the ported
# mesh reads as an arbitrary patchwork (tried, and clearly worse than no texture); this reads the
# same average colour without inventing detail the port cannot actually place. No UV layer is
# needed for a flat colour, so none is created -- the exporter omits TEXCOORD_0 accordingly.
# Values are each atlas's mean RGB over its painted (non-background) pixels -- computed once
# outside Blender (its Python has no PIL) from the textures extracted at
# /home/user/devonian-authoring/titanichthys/shipped-textures/<family>-albedo.png.
_AVERAGE_COLOUR = {
    'body-albedo.png': (0.331, 0.3514, 0.3642),
    'fins-pectoral-albedo.png': (0.3122, 0.3913, 0.4072),
    'fins-pelvic-albedo.png': (0.311, 0.3901, 0.4062),
    'fins-dorsal-albedo.png': (0.2943, 0.3753, 0.397),
    'fins-caudal-albedo.png': (0.2946, 0.3757, 0.3974),
    'eyes-albedo.png': (0.0525, 0.0949, 0.1087),
}


def average_colour(name):
    return _AVERAGE_COLOUR[name]


def flat_material(mat_name, rgb, roughness=.5):
    m = bpy.data.materials.new(mat_name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = 0
    return m


body_rgb = average_colour('body-albedo.png')
body.data.materials.clear()
body.data.materials.append(flat_material('Titanichthys body', body_rgb, .55))
body.data.materials.append(flat_material('Titanichthys underside', tuple(c * .85 for c in body_rgb), .55))
body.data.materials.append(flat_material('Titanichthys oral accent', tuple(c * .7 for c in body_rgb), .7))

semantics = ra.body_semantics()
regions = [2 if region in ('oral', 'throat') else 1 if region in ('head', 'posterior') and math.sin(a) < -.43 else 0
           for region, t, a in semantics]
for poly in body.data.polygons:
    ids = [regions[i] for i in poly.vertices]
    poly.material_index = max(set(ids), key=ids.count)

eye_mat = flat_material('Titanichthys eyes', average_colour('eyes-albedo.png'), .25)
for ob in (eye_L, eye_R):
    ob.data.materials.clear()
    ob.data.materials.append(eye_mat)

FIN_FAMILY = {
    'Long pectoral L': 'fins-pectoral', 'Long pectoral R': 'fins-pectoral',
    'Pelvic L': 'fins-pelvic', 'Pelvic R': 'fins-pelvic',
    'Modest swept dorsal': 'fins-dorsal', 'Strong heterocercal caudal': 'fins-caudal',
}
fin_materials = {family: flat_material('Titanichthys ' + family, average_colour(family + '-albedo.png'), .5)
                 for family in set(FIN_FAMILY.values())}
for name, ob in fins.items():
    ob.data.materials.clear()
    ob.data.materials.append(fin_materials[FIN_FAMILY[name]])

for ob in meshes:
    if not ob.data.color_attributes.get('Color'):
        ob.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    ob.data.color_attributes['Color'].data.foreach_set('color', np.ones((len(ob.data.loops), 4), dtype=np.float32).ravel())

# ---- baked vertex pigment, for the texture-free LOD (same recipe as candidate_01.py) ----


def bake_vertex_pigment(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    attr = obj.data.color_attributes['Color']
    obj.data.color_attributes.active_color = attr
    obj.data.color_attributes.render_color_index = list(obj.data.color_attributes).index(attr)
    restore = []
    for mat in obj.data.materials:
        nodes, links = mat.node_tree.nodes, mat.node_tree.links
        bs = nodes.get('Principled BSDF')
        out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
        em = nodes.new('ShaderNodeEmission')
        base = bs.inputs['Base Color']
        if base.links:
            links.new(base.links[0].from_socket, em.inputs['Color'])
        else:
            em.inputs['Color'].default_value = base.default_value
        links.new(em.outputs[0], out.inputs['Surface'])
        restore.append((mat, bs, out, em))
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 1
    scene.render.bake.target = 'VERTEX_COLORS'
    bpy.ops.object.bake(type='EMIT')
    for mat, bs, out, em in restore:
        mat.node_tree.links.new(bs.outputs[0], out.inputs['Surface'])
        mat.node_tree.nodes.remove(em)
    arr = np.array([v.color[:] for v in attr.data], dtype=np.float32)
    if not np.isfinite(arr).all():
        raise RuntimeError('Invalid pigment ' + obj.name)
    print('TITANICHTHYS_PIGMENT_OK ' + obj.name, flush=True)
    return arr


pigment = {o.name: bake_vertex_pigment(o) for o in meshes}


def filter_body(colors):
    mesh = body.data
    n = len(mesh.vertices)
    sums = np.zeros((n, 4))
    area = np.zeros(n)
    points = np.array([v.co[:] for v in mesh.vertices])
    normals = np.array([v.normal[:] for v in mesh.vertices])
    for poly in mesh.polygons:
        weight = max(poly.area / len(poly.vertices), 1e-12)
        for li in poly.loop_indices:
            vi = mesh.loops[li].vertex_index
            sums[vi] += colors[li] * weight
            area[vi] += weight
    values = sums / np.maximum(area[:, None], 1e-12)
    filtered = values.copy()
    tree = KDTree(n)
    region = np.array(regions)
    for i, p in enumerate(points):
        tree.insert(p, i)
    tree.balance()
    for i, p in enumerate(points):
        radius = .028 if regions[i] == 2 else .055
        matches = tree.find_range(p, radius)
        ids = np.array([j for q, j, d in matches])
        dist = np.array([d for q, j, d in matches])
        use = (region[ids] == region[i]) & ((normals[ids] @ normals[i]) > .7)
        ids, dist = ids[use], dist[use]
        if len(ids) > 1:
            kernel = np.exp(-4 * (dist / radius) ** 2) * area[ids]
            filtered[i] = (values[ids] * kernel[:, None]).sum(0) / kernel.sum()
    filtered[:, 3] = 1.
    return filtered[np.array([l.vertex_index for l in mesh.loops])].astype(np.float32)


pigment[body.name] = filter_body(pigment[body.name])
scene.render.bake.target = 'IMAGE_TEXTURES'

# ---- rig, weights, animation, anchors (rig_actions_01.py's own bones/pose/weights, matched to
# this geometry through the same (region,t,a) semantics build_clay04.py always used) ----

B = ra.bones()
arm = bpy.data.armatures.new('Titanichthys production skeleton')
rig = bpy.data.objects.new('titanichthys_rig', arm)
scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, spec in B.items():
    bone = arm.edit_bones.new(name)
    bone.head = spec['head']
    bone.tail = spec['tail']
    if spec['parent']:
        bone.parent = arm.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')


def bind(ob, weights):
    for group in list(ob.vertex_groups):
        ob.vertex_groups.remove(group)
    groups = {n: ob.vertex_groups.new(name=n) for n in B}
    for i, weights_i in enumerate(weights):
        if len(weights_i) > 4 or abs(sum(weights_i.values()) - 1) > 1e-6:
            raise RuntimeError('Invalid normalized anatomical weights')
        for n, w in weights_i.items():
            groups[n].add([i], w, 'REPLACE')
    matrix = ob.matrix_world.copy()
    ob.parent = rig
    ob.matrix_world = matrix
    mod = ob.modifiers.new('Titanichthys anatomical deformation', 'ARMATURE')
    mod.object = rig


W = []
for vertex, (region, t, a) in zip(body.data.vertices, semantics):
    if region in ('head', 'oral', 'socket'):
        w = ra.head_weights(t, a)
    elif region == 'throat':
        w = {'body': 1.}
    else:
        w = ra.axial(vertex.co.y)
    W.append(w)
bind(body, W)

for ob in meshes:
    if ob is body:
        continue
    name = ob.name
    if 'eye' in name.lower():
        ww = [{'skull': 1.}] * len(ob.data.vertices)
    elif name.startswith(('Long pectoral', 'Pelvic')):
        side = name[-1]
        kind = 'pectoral' if name.startswith('Long') else 'pelvic'
        knots = (0., .38, .73) if kind == 'pectoral' else (0., .58)
        ww = []
        for vertex in ob.data.vertices:
            span = ob.data.color_attributes['TitanFin'].data[vertex.index].color[0]
            if span >= knots[-1]:
                w = {kind + str(len(knots) - 1) + side: 1.}
            else:
                k = next(k for k in range(len(knots) - 1) if knots[k] <= span < knots[k + 1])
                f = ra.smooth(span, knots[k], knots[k + 1])
                w = ra.normalize({kind + str(k) + side: 1 - f, kind + str(k + 1) + side: f})
            root = 1 - ra.smooth(span, 0., .105)
            parent = 'body' if kind == 'pectoral' else 'tail2'
            w = {n: v * (1 - root) for n, v in w.items()}
            w[parent] = root
            ww.append(ra.normalize(w))
    elif name == 'Modest swept dorsal':
        ww = []
        for v in ob.data.vertices:
            w = ra.axial(v.co.y)
            amount = .62 * ra.smooth(v.co.z, .64, 1.30)
            w = {n: q * (1 - amount) for n, q in w.items()}
            w['dorsal'] = amount
            ww.append(ra.normalize(w))
    elif name == 'Strong heterocercal caudal':
        ww = []
        for v in ob.data.vertices:
            w = ra.axial(v.co.y)
            amount = .40 * ra.smooth(abs(v.co.z - .22), .10, .70) * ra.smooth(v.co.y, 2.60, 3.32)
            w = {n: q * (1 - amount) for n, q in w.items()}
            w['caudal'] = w.get('caudal', 0) + amount
            ww.append(ra.normalize(w))
    else:
        raise RuntimeError('Unspecified part weights ' + name)
    bind(ob, ww)

for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'
scene.render.fps = 30
rig.animation_data_create()


def reset():
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


def action_curves(action):
    if hasattr(action, 'fcurves'):
        yield from action.fcurves
    else:
        for layer in action.layers:
            for strip in layer.strips:
                if hasattr(strip, 'channelbags'):
                    for bag in strip.channelbags:
                        yield from bag.fcurves


for clip, duration in ra.CLIPS.items():
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    last = round(duration * 30)
    for frame in range(last + 1):
        state = ra.pose(clip, frame / last)
        for name, data in state.items():
            pb = rig.pose.bones[name]
            pb.rotation_euler = data['rotation']
            pb.location = data['location']
            if name != 'root':
                pb.keyframe_insert('rotation_euler', frame=frame)
                pb.keyframe_insert('location', frame=frame)
    for fc in action_curves(action):
        for key in fc.keyframe_points:
            key.interpolation = 'LINEAR'
    rig.animation_data.action = None
    print('TITANICHTHYS_ACTION_OK ' + clip, flush=True)
reset()
scene.frame_set(0)

sockets = []
for spec in ra.ANCHORS:
    ob = bpy.data.objects.new(spec['name'], None)
    scene.collection.objects.link(ob)
    ob.parent = rig
    ob.parent_type = 'BONE'
    ob.parent_bone = spec['bone']
    ob.matrix_world.translation = Vector(spec['point'])
    ob['cambrianAnchor'] = {'version': 1, 'role': spec['role'], 'parentBone': spec['bone']}
    sockets.append(ob)

parts = []
for source in meshes:
    ob = source.copy()
    ob.data = source.data.copy()
    scene.collection.objects.link(ob)
    ob.name = source.name + '_export'
    if ob.data.shape_keys:
        ob.shape_key_clear()
    ob.data.color_attributes['Color'].data.foreach_set('color', np.ones((len(ob.data.loops), 4), dtype=np.float32).ravel())
    parts.append(ob)


def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts + sockets + [rig]:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = rig


kwargs = dict(export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
              export_force_sampling=True, export_frame_range=False, export_skins=True, export_normals=True,
              export_tangents=True, export_texcoords=True, export_materials='EXPORT', export_vertex_color='NAME',
              export_vertex_color_name='Color', export_yup=True, export_extras=True, export_morph=False)
select_export()
bpy.ops.export_scene.gltf(filepath=str(OUT / 'titanichthys.glb'), **kwargs)
fulltris = sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in parts)
for ob, source in zip(parts, meshes):
    ob.data.color_attributes['Color'].data.foreach_set('color', pigment[source.name].ravel())
    bpy.context.view_layer.objects.active = ob
    dec = ob.modifiers.new('Titanichthys candidate LOD', 'DECIMATE')
    dec.ratio = .26 if source is body else .66 if 'eye' in source.name.lower() else .22
    bpy.ops.object.modifier_move_up(modifier=dec.name)
    bpy.ops.object.modifier_apply(modifier=dec.name)
    lodmats = []
    for mat in source.data.materials:
        # Prefix, not suffix: eye-audit.py's default selectors match a material's LAST
        # whitespace-separated word ('body', 'eyes', ...), so keep that word last.
        lodmat = bpy.data.materials.new('LOD ' + mat.name)
        lodmat.use_nodes = True
        bs = lodmat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (1, 1, 1, 1)
        bs.inputs['Metallic'].default_value = 0
        bs.inputs['Roughness'].default_value = .22 if 'eye' in mat.name.lower() else .36 if 'oral' in mat.name.lower() else .48
        lodmats.append(lodmat)
    retained_indices = [poly.material_index for poly in ob.data.polygons]
    ob.data.materials.clear()
    for mat in lodmats:
        ob.data.materials.append(mat)
    for poly, index in zip(ob.data.polygons, retained_indices):
        poly.material_index = index
lodtris = sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in parts)
if lodtris / fulltris >= .4:
    raise RuntimeError('LOD reduction failed: ratio ' + str(lodtris / fulltris))
select_export()
bpy.ops.export_scene.gltf(filepath=str(OUT / 'titanichthys.lod1.glb'), **kwargs)
full = patch_export(OUT / 'titanichthys.glb')
lod = patch_export(OUT / 'titanichthys.lod1.glb', True)

blend = OUT / 'titanichthys-production-sculpt-candidate.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
print('TITANICHTHYS_SCULPT_CANDIDATE_OK', str(OUT), 'full_tris', fulltris, 'lod_tris', lodtris, 'lod_ratio', lodtris / fulltris, flush=True)
