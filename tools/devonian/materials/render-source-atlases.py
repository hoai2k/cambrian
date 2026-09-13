"""Render original scenery geometry as separated colour/normal/height material sources.

Blender 5.2: -b --threads 2 --python render-source-atlases.py
These are orthographic reference atlas cells, not tileable universal reef materials.
"""
from pathlib import Path
import bpy, json, hashlib, sys
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
LOCAL = ROOT.parent / 'devonian-authoring'
OUT = ROOT / 'public/assets/devonian/materials'
SUBJECTS = [('T06', 'shell-hash'), ('T10', 'massive-stromatoporoid'),
            ('T10', 'massive-tabulate-coral'), ('T10', 'solitary-rugose-coral'),
            ('T10', 'bryozoan-colony'), ('T08', 'submerged-log')]
manifest = []
DATA_ONLY = '--data-only' in sys.argv
for code, subject in SUBJECTS:
    existing = OUT / subject / 'source-atlas.json'
    if existing.exists() and not DATA_ONLY:
        manifest.append(json.loads(existing.read_text()))
        continue
    source = LOCAL / 'props' / subject / (subject + '.blend')
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    scene.frame_set(1)
    meshes = [o for o in scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ Vector(v) for o in meshes for v in o.bound_box]
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center = (low + high) / 2
    width = max(high.x - low.x, high.y - low.y) * 1.12
    for o in list(scene.objects):
        if o.type in {'CAMERA', 'LIGHT'}:
            bpy.data.objects.remove(o, do_unlink=True)
    camera = bpy.data.objects.new('Material_atlas_top', bpy.data.cameras.new('Atlas_camera'))
    scene.collection.objects.link(camera)
    camera.location = (center.x, center.y, high.z + max(width, 1))
    camera.rotation_euler = (0, 0, 0)
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = width
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.cycles.pixel_filter_type = 'BOX'
    scene.cycles.filter_width = .01
    scene.render.use_compositing = False
    scene.render.use_sequencer = False
    scene.render.dither_intensity = 0
    scene.render.resolution_x = scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    mat = bpy.data.materials.new('Atlas_data')
    mat.use_nodes = True
    n = mat.node_tree.nodes
    n.clear()
    links = mat.node_tree.links
    output = n.new('ShaderNodeOutputMaterial')
    emit = n.new('ShaderNodeEmission')
    links.new(emit.outputs[0], output.inputs['Surface'])
    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(mat)
        for poly in obj.data.polygons:
            poly.material_index = 0
    folder = OUT / subject
    folder.mkdir(parents=True, exist_ok=True)
    record = {'code': code, 'id': subject, 'modelStatus': 'preview',
              'sourceModel': 'assets/devonian/props/' + subject + '.glb',
              'sourceBlendSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'projection': 'orthographic top; RGBA cells; no lighting baked in colour',
              'widthMeters': width, 'heightRangeMeters': [low.z, high.z],
              'normalConvention': 'object/world XYZ encoded in RGB; not tangent-space normals',
              'notes': 'Original model surface study. Living colour is artistic; skeletal morphology and soft coating must remain separate. Transparent exterior is a mask.',
              'maps': {}}
    record['heightEncoding'] = '8-bit RGBA orthographic reference only; not a 16-bit displacement map'
    record['dataSampling'] = 'One point sample per pixel; denoising/compositor/sequencer disabled; 0.01 px box filter; Raw linear output; no RGB dilation or normal reconstruction across transparent exterior. Alpha is coverage, not a normal component.'
    if DATA_ONLY:
        record['maps']['albedo'] = json.loads(existing.read_text())['maps']['albedo']
    for mode in (['normal-object', 'height', 'roughness'] if DATA_ONLY else ['albedo', 'normal-object', 'height', 'roughness']):
        for link in list(emit.inputs['Color'].links): links.remove(link)
        # Data values must bypass the sRGB display transform; colour stays sRGB.
        scene.view_settings.view_transform = 'Standard' if mode == 'albedo' else 'Raw'
        if mode == 'albedo':
            a = n.new('ShaderNodeAttribute'); a.attribute_name = 'Color'
            links.new(a.outputs['Color'], emit.inputs['Color'])
        elif mode == 'normal-object':
            geo = n.new('ShaderNodeNewGeometry')
            scale = n.new('ShaderNodeVectorMath'); scale.operation = 'MULTIPLY_ADD'
            scale.inputs[1].default_value = (.5, .5, .5)
            scale.inputs[2].default_value = (.5, .5, .5)
            links.new(geo.outputs['Normal'], scale.inputs[0])
            links.new(scale.outputs['Vector'], emit.inputs['Color'])
        elif mode == 'height':
            geo = n.new('ShaderNodeNewGeometry'); sep = n.new('ShaderNodeSeparateXYZ')
            remap = n.new('ShaderNodeMapRange')
            remap.inputs['From Min'].default_value = low.z
            remap.inputs['From Max'].default_value = high.z
            links.new(geo.outputs['Position'], sep.inputs[0])
            links.new(sep.outputs['Z'], remap.inputs['Value'])
            links.new(remap.outputs['Result'], emit.inputs['Color'])
        else:
            emit.inputs['Color'].default_value = (.78, .78, .78, 1)
        target = folder / (mode + '.png')
        scene.render.filepath = str(target)
        bpy.ops.render.render(write_still=True)
        record['maps'][mode] = {'path': target.relative_to(ROOT / 'public').as_posix(),
                                'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    manifest.append(record)
    (folder / 'source-atlas.json').write_text(json.dumps(record, indent=2) + '\n')
    (OUT / 'source-atlases.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('SOURCE ATLAS COMPLETE', subject, flush=True)
