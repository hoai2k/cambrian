"""Frozen two-view oral inspection of the immutable Titanichthys clay04 blend.
No geometry edits and no blend save. Camera, lights and existing gape keys are
changed only in this temporary Blender session. Stop after exactly two PNGs.
"""
from pathlib import Path
import bpy
import hashlib
import json
import math
from mathutils import Vector, Matrix

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
CANDIDATE = REPO.parent/'devonian-authoring/titanichthys/rework-v3/clay-04'
SOURCE = CANDIDATE/'titanichthys-clay-04.blend'
ORIGINAL_MANIFEST = CANDIDATE/'render-manifest.json'
OUT = CANDIDATE/'oral-inspection-01'
FROZEN = {
    SOURCE: '69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec',
    ORIGINAL_MANIFEST: 'dd109e9bfd3d0c577ce280469a1fbab1196d66be0aea38432408561899026591',
    HERE/'build_clay04.py': '7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e',
    HERE/'render_clay04.py': 'e45c9b6a72b32a7dddfbc7ccb4fd420f483dfa17fae3d20adfa4957f7273c613',
}
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def verify_inputs():
    for path, expected in FROZEN.items():
        if sha(path) != expected:
            raise RuntimeError('Frozen input changed; return to Astra: '+str(path))

if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    raise RuntimeError('Wrong source blend: '+bpy.data.filepath)
verify_inputs()
construction = json.loads((CANDIDATE/'construction.json').read_text())
if construction['blend_sha256'] != FROZEN[SOURCE] or construction['builder_sha256'] != FROZEN[HERE/'build_clay04.py']:
    raise RuntimeError('Construction provenance mismatch; return to Astra')
original = json.loads(ORIGINAL_MANIFEST.read_text())
for view in original['views']:
    path = Path(view['path'])
    if sha(path) != view['sha256']:
        raise RuntimeError('Original four-view evidence changed: '+str(path))
if OUT.exists():
    raise RuntimeError('Inspection output already exists; preserve it and return to Astra: '+str(OUT))

scene = bpy.context.scene
camera = scene.camera
if camera is None:
    raise RuntimeError('Expected saved inspection camera is absent')
gape_keys = [ob.data.shape_keys.key_blocks['Gape study 24 degrees']
             for ob in bpy.data.objects if ob.type == 'MESH' and ob.data.shape_keys
             and 'Gape study 24 degrees' in ob.data.shape_keys.key_blocks]
followers = [(ob, ob.matrix_world.copy()) for ob in bpy.data.objects if ob.get('gape_skull_follow')]
if len(gape_keys) != 1 or len(followers) != 2:
    raise RuntimeError('Unexpected gape or eye-follower structure; return to Astra')

# Both frames use the same straight frontal axis through the mouth. The upper
# cranial crown and outer fin tips are deliberately outside this oral close-up.
LOCATION = (0., -8., -.16)
TARGET = (0., -1.65, -.16)
SCALE = 2.8
camera.data.type = 'ORTHO'
camera.data.ortho_scale = SCALE
camera.location = LOCATION
camera.rotation_euler = (Vector(TARGET)-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.resolution_x = 1600
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.exposure = -.35

# External, asymmetrical light through the mouth reveals the lining's relief;
# it does not put a glowing source behind or inside a potentially blocked wall.
key = bpy.data.objects['Oral inspection fill']
key.location = (-.40, -4.30, -.17)
key.rotation_euler = (Vector((0.,-1.50,-.18))-key.location).to_track_quat('-Z','Y').to_euler()
key.data.energy = 200
key.data.size = .70
key.data.color = (1., .96, .91)
fill_data = bpy.data.lights.new('Temporary oral inspection fill', 'AREA')
fill_data.energy = 70
fill_data.shape = 'DISK'
fill_data.size = .50
fill_data.color = (.90, .95, 1.)
fill = bpy.data.objects.new('Temporary oral inspection fill', fill_data)
bpy.context.collection.objects.link(fill)
fill.location = (.55, -4.20, -.10)
fill.rotation_euler = (Vector((0.,-1.50,-.18))-fill.location).to_track_quat('-Z','Y').to_euler()
LIGHTS = [
    {'name':key.name, 'position':list(key.location), 'target':[0.,-1.50,-.18], 'watts':200, 'size':.70},
    {'name':fill.name, 'position':list(fill.location), 'target':[0.,-1.50,-.18], 'watts':70, 'size':.50},
]

OUT.mkdir()
neck = Vector((0., -1.40, .72))
outputs = []
for name, value in [('01-oral-front-rest', 0.), ('02-oral-front-open', 1.)]:
    for gape in gape_keys:
        gape.value = value
    for ob, original_matrix in followers:
        rotation = (Matrix.Translation(neck)
                    @ Matrix.Rotation(math.radians(-2)*value*ob['gape_skull_weight'], 4, 'X')
                    @ Matrix.Translation(-neck))
        ob.matrix_world = rotation @ original_matrix
    scene.render.filepath = str(OUT/(name+'.png'))
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    path = OUT/(name+'.png')
    outputs.append({'view':name, 'path':str(path), 'bytes':path.stat().st_size,
                    'sha256':sha(path), 'gape_study':value,
                    'camera':LOCATION, 'target':TARGET, 'ortho_scale':SCALE})
    print('TITANICHTHYS_ORAL_INSPECTION_VIEW_OK '+name, flush=True)

# No save operation exists in this recipe. Recheck the actual on-disk blend,
# frozen scripts, original manifest and original PNGs after the two renders.
verify_inputs()
for view in original['views']:
    if sha(Path(view['path'])) != view['sha256']:
        raise RuntimeError('Original rendered evidence changed during inspection')
manifest = {
    'status':'UNREVIEWED ORAL INSPECTION; NOT FINAL ANATOMY OR EYE APPROVAL',
    'source_blend':str(SOURCE), 'blend_sha256':FROZEN[SOURCE],
    'original_four_view_manifest_sha256':FROZEN[ORIGINAL_MANIFEST],
    'builder_sha256':FROZEN[HERE/'build_clay04.py'],
    'inspection_recipe_sha256':sha(Path(__file__)),
    'resolution':[1600,1200], 'samples':64, 'device':'CPU', 'threads':2,
    'inspection_lights':LIGHTS, 'other_lights':'Original saved studio rig unchanged',
    'views':outputs, 'immutable_inputs_reverified_after_render':True,
    'warning':'Only existing gape keys, eye follower transforms, camera and inspection lighting changed in memory; no blend save or geometry edits',
}
(OUT/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('TITANICHTHYS_ORAL_INSPECTION_OK '+str(OUT/'manifest.json'))
