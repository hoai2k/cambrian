"""Sculpt-port build for Gemuendina: one script, two outputs.

`GEMUENDINA_OUT` (required) is the output directory. `GEMUENDINA_PORT=1` applies the
`shape_06` sculpt port on top of the exact same base geometry that `GEMUENDINA_PORT=0` (or
unset) ships unchanged — so the two runs differ *only* by that one extra deform pass, which
is what proves the port changes only what the sculpt asked for.

This does not reopen the historical `study-05`/`material-03` `.blend` chain: those local,
un-tracked intermediate files (and the imagegen swatch `materials_03.py` bakes from) do not
exist in this checkout, and a `.blend` is not byte-reproducible across authoring sessions
even from identical inputs. So this script rebuilds the SAME geometry from the tracked pure
code those blends were built from — `sculpt_spec_02.make_mesh()` (the clay envelope),
`shape_05.deform`/`apply_oral` (the accepted terminal-snout study) — and reuses the tracked
`rig_actions_01`/`rig_spec_05` rig and `filter_lod_pigment_02` LOD pigment filter verbatim.
Geometry, topology, rig, weights, clips and anchors are exactly the shipped pipeline; the one
place this cannot match the shipped asset is material fidelity: the actual imagegen pigment
swatch is not present in this environment, so this uses flat placeholder materials rather
than faking that art. That is a materials-only gap, called out again in the build report;
it does not affect geometry, the measure-tool comparison, rig or the eye/oral audit.
"""
import bpy, bmesh, sys, os, json, hashlib, struct, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
PUBLIC_META = ROOT / 'public/assets/devonian/creatures/gemuendina.json'  # read-only template
PORT = os.environ.get('GEMUENDINA_PORT', '0') == '1'
OUT = Path(os.environ['GEMUENDINA_OUT'])
if OUT.exists() and any(OUT.iterdir()):
    raise RuntimeError('Output directory already contains evidence: ' + str(OUT))
OUT.mkdir(parents=True, exist_ok=True)

sys.dont_write_bytecode = True
sys.path.insert(0, str(HERE.parent / 'rework-v3'))
sys.path.insert(0, str(HERE))
from sculpt_spec_02 import make_mesh, APERTURE_Y
from shape_05 import deform as deform_05, apply_oral
from rig_spec_05 import bones, build_weights, pose, CLIPS, LOOPS, ANCHORS as ANCHORS_05
from filter_lod_pigment_02 import filter_body
if PORT:
    from shape_06 import deform as deform_06, NOSE_SHIFT_Y

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'NONE'; scene.unit_settings.scale_length = 1.

# ---- body: the accepted clay envelope, then the accepted terminal-snout study, then
#      (candidate only) the sculpt port ----
verts, faces, mats, regions, oral_spec = make_mesh()
mesh = bpy.data.meshes.new('gemuendina_body_mesh')
mesh.from_pydata(verts, [], faces); mesh.update()
body = bpy.data.objects.new('gemuendina_body', mesh); scene.collection.objects.link(body)

before = [Vector(v) for v in verts]
for v, region in zip(body.data.vertices, regions):
    v.co = deform_05(v.co, region)
apply_oral(body, oral_spec)
# shape_05 promises the posterior (y >= -1.04) is untouched; hold it to that here too.
assert all((body.data.vertices[i].co - before[i]).length < 1e-6 for i, r in enumerate(regions) if before[i].y >= -1.04 and r != 'oral')

port_changed = 0
if PORT:
    for v, region in zip(body.data.vertices, regions):
        if region == 'oral':
            continue
        before_co = v.co.copy()
        v.co = deform_06(v.co, region)
        if (v.co - before_co).length > 1e-9:
            port_changed += 1
    # The port must not touch anything the sculpt didn't ask about: everything at or behind
    # station 14 (Blender y >= -0.4774) stays exactly as shape_05 left it. Oral vertices are
    # skipped by the port loop above, so they are already excluded here.
    assert all((body.data.vertices[i].co - before[i]).length < 1e-6
               for i in range(len(before)) if regions[i] != 'oral' and before[i].y >= -0.4774)

bm = bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
nonmanifold = sum(not e.is_manifold for e in bm.edges)
volume = bm.calc_volume(signed=True)
if nonmanifold or volume <= 0:
    raise RuntimeError(f'Invalid body envelope: nonmanifold={nonmanifold} volume={volume}')
bm.to_mesh(body.data); bm.free()

# ---- eyes: placed against the skin surface exactly as study_05.py does (shape_05's
#      deform already puts them close to the nose tip — "closely paired eyes immediately
#      above" the terminal snout, per rework-v3/face-v4/TERMINAL_SNOUT_STATE.md). Under
#      the port, that patch of skin is part of what got lowered (station 15's dorsal
#      argmax and this eye placement sit almost on top of each other), so the eyes must
#      follow it — otherwise they end up sitting proud of the dome that used to hold them,
#      which is exactly what the "eyes" curve of the measure-tool comparison catches: the
#      unmoved eye becomes the new tallest thing in the nose-tip measurement window.
from sculpt_spec_02 import skin
def eye_surface(x, y):
    q = deform_05((x, y, skin(x, y)))
    return deform_06(q, 'dorsal') if PORT else q
eyes = []
for side, sign in [('L', 1), ('R', -1)]:
    x, y = sign * .125, -1.625
    p = eye_surface(x, y)
    eps = .0005
    px = eye_surface(x + eps, y); py = eye_surface(x, y + eps)
    normal = (px - p).cross(py - p).normalized()
    if normal.z < 0: normal = -normal
    # Bake scale + rotation into the mesh data directly (matrix math, not
    # bpy.ops.object.transform_apply — the vertex data is what the exporter reads for a
    # skinned mesh, and leaving the object transform non-identity risks it being applied
    # twice or not at all depending on how the exporter treats a skinned node's own TRS).
    center = p - normal * .022
    scale_m = Matrix.Diagonal((.55 * .105, .55 * .121, .55 * .087))
    rot_m = Vector((0, 0, 1)).rotation_difference(normal).to_matrix()
    mesh_e = bpy.data.meshes.new('gemuendina_eye_' + side)
    bm2 = bmesh.new(); bmesh.ops.create_uvsphere(bm2, u_segments=32, v_segments=24, radius=1.0)
    for bv in bm2.verts:
        bv.co = center + rot_m @ (scale_m @ bv.co)
    bm2.normal_update()
    bm2.to_mesh(mesh_e); bm2.free()
    obj = bpy.data.objects.new('gemuendina_eye_' + side, mesh_e); scene.collection.objects.link(obj)
    eyes.append(obj)
eye_L, eye_R = eyes

# ---- small attached lower oral denticles: identical to candidate_05.py ----
vertices = verts
dv = []; df = []
for row_index in (6, 9, 12):
    row = oral_spec['oral_rings'][row_index]
    selected = [j for j, vi in enumerate(oral_spec['rim']) if vertices[vi][1] < APERTURE_Y - .020]
    for j in selected[::4]:
        vi = row[j]; p = body.data.vertices[vi].co.copy(); normal = body.data.vertices[vi].normal.normalized()
        tangent = normal.cross(Vector((0, 1, 0))).normalized()
        if tangent.length < .1: tangent = normal.cross(Vector((1, 0, 0))).normalized()
        bitangent = normal.cross(tangent); start = len(dv)
        base = p - normal * .0018
        for k in range(7):
            a = k * 2 * math.pi / 7
            dv.append(tuple(base + .0031 * (tangent * math.cos(a) + bitangent * math.sin(a))))
        dv.append(tuple(p + normal * .0065 + Vector((0, .0015, 0))))
        for k in range(7): df.append((start + k, start + (k + 1) % 7, start + 7))
        df.append(tuple(start + k for k in reversed(range(7))))
dm = bpy.data.meshes.new('gemuendina_lower_oral_denticles_mesh'); dm.from_pydata(dv, [], df); dm.update()
dent = bpy.data.objects.new('gemuendina_lower_oral_denticles', dm); scene.collection.objects.link(dent)
for p_ in dm.polygons: p_.use_smooth = True

# ---- weights: unchanged (positions differ under the port, but build_weights only depends
#      on the point's own coordinates/region, computed the same way for both runs) ----
W = build_weights(vertices, regions, oral_spec)
dw = []
for row_index in (6, 9, 12):
    row = oral_spec['oral_rings'][row_index]
    selected = [j for j, vi in enumerate(oral_spec['rim']) if vertices[vi][1] < APERTURE_Y - .020]
    for j in selected[::4]:
        vi = row[j]
        for _ in range(8): dw.append(W[vi])

# ---- materials: FLAT placeholders (see module docstring: the imagegen swatch this creature's
#      real materials are baked from is not available in this environment). Structurally the
#      same shape as the shipped asset — one body material, one eye material, one denticle
#      accent material — just without the swatch's fine pigment. ----
def flat_material(name, color, roughness, metallic=0.0):
    mat = bpy.data.materials.new(name); mat.use_nodes = True
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1); bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = metallic
    return mat
body_mat = flat_material('Gemuendina placeholder body', (.361, .350, .235), .62)
body.data.materials.append(body_mat)
for p_ in body.data.polygons: p_.material_index = 0; p_.use_smooth = True
eye_mat = flat_material('Gemuendina placeholder eye', (.071, .075, .067), .34)
for obj in eyes: obj.data.materials.append(eye_mat)
dent_mat = flat_material('Gemuendina muted denticles', (.17, .135, .068), .64)
dent.data.materials.append(dent_mat)

def geo_hash(obj): return hashlib.sha256(b''.join(struct.pack('<fff', *v.co) for v in obj.data.vertices)).hexdigest()
body_hash = geo_hash(body)

# ---- vertex-pigment bake for the texture-free LOD (same mechanism the shipped asset uses,
#      just baking a flat colour instead of the swatch-driven node graph) ----
def bake_vertex_pigment(obj):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    if obj.data.color_attributes.get('Color'): obj.data.color_attributes.remove(obj.data.color_attributes['Color'])
    attr = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    obj.data.color_attributes.active_color = attr
    obj.data.color_attributes.render_color_index = list(obj.data.color_attributes).index(attr)
    restored = []
    for mat in obj.data.materials:
        ns = mat.node_tree.nodes; ls = mat.node_tree.links; bs = ns.get('Principled BSDF')
        out = next(n for n in ns if n.type == 'OUTPUT_MATERIAL')
        em = ns.new('ShaderNodeEmission'); em.inputs['Color'].default_value = bs.inputs['Base Color'].default_value
        ls.new(em.outputs[0], out.inputs['Surface']); restored.append((mat, bs, out, em))
    scene.render.engine = 'CYCLES'; scene.cycles.samples = 1; scene.render.bake.target = 'VERTEX_COLORS'
    bpy.ops.object.bake(type='EMIT')
    for mat, bs, out, em in restored: mat.node_tree.links.new(bs.outputs[0], out.inputs['Surface']); mat.node_tree.nodes.remove(em)
    arr = np.array([a.color[:] for a in attr.data], dtype=np.float32)
    if not np.isfinite(arr).all(): raise RuntimeError('Invalid vertex pigment bake ' + obj.name)
    return arr
pigment = {o.name: bake_vertex_pigment(o) for o in [body] + eyes + [dent]}
pigment[body.name], lod_filter_report = filter_body(body, pigment[body.name], regions)
scene.render.bake.target = 'IMAGE_TEXTURES'

# ---- rig: bones/weights/clips are exactly rig_spec_05/rig_actions_01, unmodified. Anchors:
#      the two that sit at the current nose/mouth tip move forward with it under the port;
#      the swallow anchor (well behind the affected band) does not. ----
ANCHORS = [dict(a) for a in ANCHORS_05]
if PORT:
    for a in ANCHORS:
        if a['name'] in ('anchor_mouth', 'anchor_attack_primary'):
            px, py, pz = a['point']; a['point'] = (px, py + NOSE_SHIFT_Y, pz)

B = bones()
arm = bpy.data.armatures.new('Gemuendina anatomical skeleton')
rig = bpy.data.objects.new('gemuendina_rig', arm); scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, spec in B.items():
    b = arm.edit_bones.new(name); b.head = spec['head']; b.tail = spec['tail']
    if spec['parent']: b.parent = arm.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')

def bind(obj, ww):
    for group in list(obj.vertex_groups): obj.vertex_groups.remove(group)
    groups = {n: obj.vertex_groups.new(name=n) for n in B}
    for i, w in enumerate(ww):
        if len(w) > 4 or abs(sum(w.values()) - 1) > 1e-6: raise RuntimeError('Invalid weight set')
        for n, amount in w.items(): groups[n].add([i], amount, 'REPLACE')
    mod = obj.modifiers.new('Continuous anatomical deformation', 'ARMATURE'); mod.object = rig; obj.parent = rig
bind(body, W)
for eye in eyes: bind(eye, [{'skull': 1.}] * len(eye.data.vertices))
bind(dent, dw)
for pb in rig.pose.bones: pb.rotation_mode = 'XYZ'
scene.render.fps = 30; rig.animation_data_create(); seams = {}; bounds = {}

def set_pose(state):
    for name, v in state.items():
        pb = rig.pose.bones[name]; pb.rotation_euler = v['rotation']; pb.location = v['location']; pb.scale = (1, 1, 1)
def reset():
    for pb in rig.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
for clip, duration in CLIPS.items():
    action = bpy.data.actions.new(clip); action.use_fake_user = True; rig.animation_data.action = action
    last = round(duration * 30)
    for frame in range(last + 1):
        state = pose(clip, frame / last); set_pose(state)
        for pb in rig.pose.bones:
            if pb.name == 'root': continue
            pb.keyframe_insert('rotation_euler', frame=frame)
            if pb.name in ('body', 'throat', 'branchialL', 'branchialR'): pb.keyframe_insert('location', frame=frame)
    if hasattr(action, 'fcurves'):
        for fc in action.fcurves:
            for key in fc.keyframe_points: key.interpolation = 'LINEAR'
    start, end = pose(clip, 0), pose(clip, 1)
    seams[clip] = max(abs(a - b) for n in B for prop in ('rotation', 'location') for a, b in zip(start[n][prop], end[n][prop]))
    if clip != 'Death' and seams[clip] > 1e-7: raise RuntimeError('Pose recovery/loop seam failed ' + clip)
    samples = []
    for frac in (0, .2, .4, .6, .8, 1):
        scene.frame_set(round(last * frac)); ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
        p = np.array([v.co[:] for v in m.vertices]); ev.to_mesh_clear()
        if not np.isfinite(p).all(): raise RuntimeError('Nonfinite deformation ' + clip)
        samples.extend([p.min(axis=0), p.max(axis=0)])
    bounds[clip] = [np.min(samples, axis=0).tolist(), np.max(samples, axis=0).tolist()]
    rig.animation_data.action = None
reset(); scene.frame_set(0)

sockets = []
for a in ANCHORS:
    obj = bpy.data.objects.new(a['name'], None); scene.collection.objects.link(obj)
    obj.parent = rig; obj.parent_type = 'BONE'; obj.parent_bone = a['bone']; obj.matrix_world.translation = Vector(a['point'])
    obj['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}; sockets.append(obj)

source_objects = [body] + eyes + [dent]
parts = []
for src in source_objects:
    obj = src.copy(); obj.data = src.data.copy(); scene.collection.objects.link(obj); obj.name = src.name + '_export'
    obj.data.color_attributes['Color'].data.foreach_set('color', np.ones((len(obj.data.loops), 4), dtype=np.float32).ravel())
    parts.append(obj)
def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts + sockets + [rig]: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
kwargs = dict(export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS',
    export_force_sampling=True, export_frame_range=False, export_skins=True, export_normals=True,
    export_tangents=True, export_texcoords=True, export_materials='EXPORT', export_vertex_color='NAME',
    export_vertex_color_name='Color', export_yup=True, export_extras=True)
select_export(); bpy.ops.export_scene.gltf(filepath=str(OUT / 'gemuendina.glb'), **kwargs)
fulltris = sum(sum(len(p_.vertices) - 2 for p_ in o.data.polygons) for o in parts)
for obj, src in zip(parts, source_objects):
    obj.data.color_attributes['Color'].data.foreach_set('color', pigment[src.name].ravel())
    bpy.context.view_layer.objects.active = obj
    de = obj.modifiers.new('Silhouette preserving LOD', 'DECIMATE'); de.ratio = .24 if src == body else .68 if src in eyes else .50
    bpy.ops.object.modifier_move_up(modifier=de.name); bpy.ops.object.modifier_apply(modifier=de.name)
    lodmat = bpy.data.materials.new('Gemuendina vertex pigment ' + src.name); lodmat.use_nodes = True
    bs = lodmat.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (1, 1, 1, 1)
    bs.inputs['Metallic'].default_value = 0; bs.inputs['Roughness'].default_value = .27 if src in eyes else .59
    obj.data.materials.clear(); obj.data.materials.append(lodmat)
    for poly in obj.data.polygons: poly.material_index = 0
lodtris = sum(sum(len(p_.vertices) - 2 for p_ in o.data.polygons) for o in parts)
if lodtris / fulltris >= .4: raise RuntimeError('LOD reduction outside frozen criterion')
select_export(); bpy.ops.export_scene.gltf(filepath=str(OUT / 'gemuendina.lod1.glb'), **kwargs)

def patch_export(path):
    raw = path.read_bytes(); length = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + length]); binary = raw[20 + length:]; nodes = g['nodes']
    parent = {c: i for i, n in enumerate(nodes) for c in n.get('children', [])}
    def world(i):
        n = nodes[i]
        if 'matrix' in n: m = Matrix(np.array(n['matrix']).reshape(4, 4).T.tolist())
        else:
            q = n.get('rotation', [0, 0, 0, 1]); m = Matrix.LocRotScale(Vector(n.get('translation', [0, 0, 0])), Quaternion((q[3], *q[:3])), Vector(n.get('scale', [1, 1, 1])))
        return world(parent[i]) @ m if i in parent else m
    for a in ANCHORS:
        i = next(i for i, n in enumerate(nodes) if n.get('name') == a['name'])
        b = next(i for i, n in enumerate(nodes) if n.get('name') == a['bone'])
        p = Vector((a['point'][0], a['point'][2], -a['point'][1])); local = world(b).inverted() @ p
        if i in parent: nodes[parent[i]]['children'].remove(i)
        nodes[b].setdefault('children', []).append(i)
        nodes[i] = {'name': a['name'], 'translation': list(local), 'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'], 'parentBone': a['bone']}}}
    for action in g.get('animations', []):
        name = action['name'].split('|')[-1]
        if name not in CLIPS: raise RuntimeError('Unexpected animation ' + action['name'])
        action['name'] = name; kept = []
        for ch in action['channels']:
            target = ch['target']; node = nodes[target['node']]; prop = target['path']
            if prop == 'scale' or node.get('name') == 'root':
                acc = g['accessors'][action['samplers'][ch['sampler']]['output']]; view = g['bufferViews'][acc['bufferView']]
                count = {'VEC3': 3, 'VEC4': 4}[acc['type']]; offset = 8 + view.get('byteOffset', 0) + acc.get('byteOffset', 0)
                data = np.frombuffer(binary, dtype='<f4', count=acc['count'] * count, offset=offset).reshape(-1, count)
                expected = node.get(prop, [1, 1, 1] if prop == 'scale' else [0, 0, 0, 1] if prop == 'rotation' else [0, 0, 0])
                if np.max(np.abs(data - np.array(expected))) >= 1e-5: raise RuntimeError('Unexpected nonconstant root/scale channel')
            else: kept.append(ch)
        action['channels'] = kept
    names = [a['name'] for a in g['animations']]
    if set(names) != set(CLIPS): raise RuntimeError('Export action set mismatch')
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
    path.write_bytes(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary)) + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)
    return g
full = patch_export(OUT / 'gemuendina.glb'); lod = patch_export(OUT / 'gemuendina.lod1.glb')
def skeleton(g):
    nodes = g['nodes']; parents = {c: nodes[i].get('name') for i, n in enumerate(nodes) for c in n.get('children', [])}
    return {n['name']: {'parent': parents.get(i), 'translation': n.get('translation'), 'rotation': n.get('rotation'), 'scale': n.get('scale')}
            for i, n in enumerate(nodes) if n.get('name') in B or n.get('name', '').startswith('anchor_')}
if skeleton(full) != skeleton(lod): raise RuntimeError('Full/LOD skeleton or anchor graph differs')
for obj in parts: bpy.data.objects.remove(obj, do_unlink=True)
if geo_hash(body) != body_hash: raise RuntimeError('Rig authoring changed body vertex coordinates')
reset(); rig.animation_data.action = bpy.data.actions['Idle']; scene.frame_set(0)
scene.cycles.samples = 32; scene.render.bake.target = 'IMAGE_TEXTURES'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'gemuendina-face-production-06.blend'))

meta = json.loads(PUBLIC_META.read_text())
meta['modelLength'] = max(v.co.y for v in body.data.vertices) - min(v.co.y for v in body.data.vertices)
if PORT:
    meta['notes'] = meta['notes'] + [
        'Sculpt port (docs/viewer-sculpt.md): the head dome lowered (dorsal stations 15/16/18/19, '
        '-14.5%/-14.6%/-6.7%/-29.5%) and the nose thinned and widened with the tip shifted forward '
        '(width +16%, shift +0.08 model units); everything at or behind station 14 is unchanged.']
report = {'phase': 'sculpt-port local build; measure/eye-audit/package pending', 'port_applied': PORT,
          'source_sha256': {str(p): sha(p) for p in [HERE / 'candidate_06.py', HERE / 'shape_05.py'] + ([HERE / 'shape_06.py'] if PORT else []) + [HERE / 'rig_spec_05.py', HERE.parent / 'rework-v3/rig_actions_01.py', HERE.parent / 'rework-v3/sculpt_spec_02.py', HERE.parent / 'rework-v3/filter_lod_pigment_02.py']},
          'materials_note': 'Flat placeholder materials; the shipped imagegen swatch is not available in this environment (see module docstring). Geometry, rig, weights, clips and anchors are the tracked pipeline unmodified except (candidate only) shape_06.',
          'lod_filter': lod_filter_report, 'body_bind_geometry_sha256': body_hash, 'port_changed_dorsal_ventral_vertices': port_changed,
          'bones': len(B), 'clips': CLIPS, 'loop_and_recovery_seams': seams, 'deformed_bounds': bounds, 'weights_normalized': True,
          'full_triangles': fulltris, 'lod_triangles': lodtris, 'lod_ratio': lodtris / fulltris,
          'full_lod_skeleton_anchors_match': True, 'anchors': ANCHORS, 'files': []}
(OUT / 'gemuendina.json').write_text(json.dumps(meta, indent=2) + '\n')
for p in sorted(OUT.iterdir()):
    if p.is_file(): report['files'].append({'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p)})
(OUT / 'candidate-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('GEMUENDINA_CANDIDATE_06_OK', 'port=' + str(PORT), str(OUT / 'candidate-report.json'))
