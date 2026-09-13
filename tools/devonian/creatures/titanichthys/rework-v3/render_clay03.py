"""Frozen multiview recipe for the unreviewed Titanichthys clay-03.
Run with its saved blend; never save the temporary camera/gape changes.
"""
from pathlib import Path
import bpy
import hashlib
import json
import math
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
OUT = REPO.parent/'devonian-authoring/titanichthys/rework-v3/clay-03'
SOURCE = OUT/'titanichthys-clay-03.blend'
if Path(bpy.data.filepath).resolve() != SOURCE.resolve():
    raise RuntimeError(f'Wrong blend: expected {SOURCE}, got {bpy.data.filepath}')
report = json.loads((OUT/'construction.json').read_text())
if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != report['blend_sha256']:
    raise RuntimeError('Saved clay hash changed since build; return to Astra')
if hashlib.sha256((HERE/'build_clay03.py').read_bytes()).hexdigest() != report['builder_sha256']:
    raise RuntimeError('Builder hash changed since build; return to Astra')
RENDERS = OUT/'renders'
if RENDERS.exists():
    raise RuntimeError('Render directory already exists; preserve it and return to Astra')
RENDERS.mkdir()

# name, location, target, orthographic width, gape, oral inspection light power
VIEWS = [
    ('01-side', (11, .55, .08), (0, .55, .08), 9.4, 0., 0),
    ('02-front', (0, -12, .12), (0, -.5, .10), 8.1, 0., 35),
    ('04-three-quarter', (8.4, -9.4, 4.7), (0, .10, .08), 9.4, 0., 35),
    ('08-gape-side', (9, -1.8, .02), (0, -1.78, -.12), 4.7, 1., 100),
]
scene = bpy.context.scene
camera = scene.camera
body = bpy.data.objects['Titanichthys_new_continuous_sculpt']
gape_keys = [ob.data.shape_keys.key_blocks['Gape study 24 degrees']
             for ob in bpy.data.objects if ob.type == 'MESH' and ob.data.shape_keys
             and 'Gape study 24 degrees' in ob.data.shape_keys.key_blocks]
fill = bpy.data.objects['Oral inspection fill']
followers = [(ob, ob.matrix_world.copy()) for ob in bpy.data.objects if ob.get('gape_skull_follow')]
neck = Vector((0, -1.40, .72))
from mathutils import Matrix
outputs = []
for name, location, target, scale, value, power in VIEWS:
    camera.location = location
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = scale
    for gape in gape_keys:
        gape.value = value
    for ob, original in followers:
        rotation = Matrix.Translation(neck) @ Matrix.Rotation(math.radians(-2)*value*ob['gape_skull_weight'], 4, 'X') @ Matrix.Translation(-neck)
        ob.matrix_world = rotation @ original
    fill.data.energy = power
    scene.render.filepath = str(RENDERS/(name+'.png'))
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    path = RENDERS/(name+'.png')
    outputs.append({'view':name, 'path':str(path), 'bytes':path.stat().st_size,
                    'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                    'camera':location, 'target':target, 'ortho_scale':scale,
                    'gape_study':value, 'oral_inspection_light_watts':power})
    print('TITANICHTHYS_CLAY_VIEW_OK '+name, flush=True)
manifest = {'status':'UNREVIEWED CLAY', 'blend_sha256':report['blend_sha256'],
            'builder_sha256':report['builder_sha256'],
            'render_recipe_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            'views':outputs, 'warning':'No final art/anatomy/export approval; source blend unchanged'}
(OUT/'render-manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print('TITANICHTHYS_CLAY_RENDER_OK '+str(OUT/'render-manifest.json'))
