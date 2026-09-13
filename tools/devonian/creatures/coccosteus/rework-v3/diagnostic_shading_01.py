"""Read-only candidate02 shading ablations; diagnostic images, never production repair."""
import bpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4].parent / 'devonian-authoring/coccosteus/rework-v3'
OUT = ROOT / 'diagnostic-shading-01'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def record(p): return {'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p)}
def verify():
    for row in json.loads((HERE / 'frozen-diagnostic-shading-01.json').read_text())['inputs']:
        assert sha(row['path']) == row['sha256'], 'Changed diagnostic input: ' + row['path']
verify()
assert not OUT.exists(), 'Preserve diagnostic output'
OUT.mkdir()
report = {'complete': False, 'purpose': 'Isolate candidate02 UV/normal/roughness defects; no repair or approval', 'renders': []}
def checkpoint(): (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
def setup(path, glb=False):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    s = bpy.context.scene
    if glb:
        for ob in list(s.objects):
            if ob.type in ('MESH', 'ARMATURE', 'EMPTY'): bpy.data.objects.remove(ob, do_unlink=True)
        for action in list(bpy.data.actions): bpy.data.actions.remove(action)
        bpy.ops.import_scene.gltf(filepath=str(ROOT / 'candidate-02/coccosteus.glb'))
        rig = next(o for o in s.objects if o.type == 'ARMATURE')
        rig.animation_data_create()
        for track in rig.animation_data.nla_tracks: track.mute = True
        actions = [a for a in bpy.data.actions if a.name == 'Idle' or a.name.endswith('_Idle') or a.name.endswith('|Idle')]
        assert len(actions) == 1
        rig.animation_data.action = actions[0]
        s.frame_set(round(actions[0].frame_range[0]))
    else:
        for ob in s.objects:
            if ob.type == 'MESH' and ob.data.shape_keys:
                for key in ob.data.shape_keys.key_blocks: key.value = 0
    s.render.engine = 'CYCLES'; s.cycles.device = 'CPU'; s.cycles.samples = 48
    s.render.threads_mode = 'FIXED'; s.render.threads = 2
    s.cycles.seed = 71204; s.cycles.use_animated_seed = False
    s.render.resolution_percentage = 100; s.render.resolution_x = 1280; s.render.resolution_y = 960
    s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
    s.render.film_transparent = False
    return s
VIEWS = [('Orbit-front', (0,-4,.15), (0,-1.49,.065), 1.),
         ('Armour-close', (3.3,-4.2,2.5), (0,-.91,.04), 2.28)]
def render(s, label, view):
    name, camera, target, scale = view
    cam = s.camera; cam.data.type = 'ORTHO'; cam.location = camera
    cam.rotation_euler = (Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.ortho_scale = scale
    path = OUT / (label + '-' + name + '.png'); assert not path.exists()
    s.render.filepath = str(path); bpy.context.view_layer.update(); bpy.ops.render.render(write_still=True)
    report['renders'].append({**record(path), 'variant':label, 'view':name, 'camera':camera, 'target':target, 'scale':scale})
    checkpoint(); print('COCCOSTEUS_SHADING_DIAGNOSTIC_VIEW ' + path.name, flush=True)
for label in ['original', 'no-normal', 'fixed-roughness', 'no-normal-fixed-roughness', 'albedo-emission']:
    s = setup(ROOT / 'candidate-02/coccosteus-production-02.blend', True)
    mats = {slot.material for ob in s.objects if ob.type == 'MESH' for slot in ob.material_slots if slot.material}
    for mat in mats:
        # Body-only ablations preserve eyes/fins, lights, geometry, action and albedo.
        if not any(role in mat.name for role in ['body 01-body', 'oral accent 01-body', 'underside']): continue
        nodes = mat.node_tree.nodes; links = mat.node_tree.links
        bs = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
        if label in ['no-normal', 'no-normal-fixed-roughness']:
            for link in list(bs.inputs['Normal'].links): links.remove(link)
        if label in ['fixed-roughness', 'no-normal-fixed-roughness']:
            for link in list(bs.inputs['Roughness'].links): links.remove(link)
            bs.inputs['Roughness'].default_value = .66
        if label == 'albedo-emission':
            emission = nodes.new('ShaderNodeEmission')
            if bs.inputs['Base Color'].is_linked: links.new(bs.inputs['Base Color'].links[0].from_socket, emission.inputs['Color'])
            else: emission.inputs['Color'].default_value = bs.inputs['Base Color'].default_value
            output = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output)
            links.new(emission.outputs[0], output.inputs['Surface'])
    for view in VIEWS: render(s, label, view)
# Same close camera reveals whether the artifact appears before glTF export.
for label, path in [('accepted-material04', ROOT/'material-04/coccosteus-material-04.blend'),
                    ('baked01-before-export', ROOT/'baked-01/coccosteus-baked-01.blend')]:
    render(setup(path), label, VIEWS[0])
verify(); report['complete'] = True; checkpoint()
print('COCCOSTEUS_SHADING_DIAGNOSTIC_01_COMPLETE', flush=True)
