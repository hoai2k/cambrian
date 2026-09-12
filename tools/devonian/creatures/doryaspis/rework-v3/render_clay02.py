"""Doryaspis V3 clay02 review renders.

    /opt/blender/blender -b <variant>/doryaspis-<variant>.blend --threads 1 \
        --python-exit-code 1 \
        --python tools/devonian/creatures/doryaspis/rework-v3/render_clay02.py -- clay02

Six whole-specimen views fitted to the actual projected subject vertices, plus
an oral close-up and a front three-quarter, which are the two views the user's
direction has to be judged on: the front of the body must read as a snout with
the mouth at its very front, above the saw.

Cheap by design: Cycles CPU, one thread, 760x480, 28 samples.  Each view is
written as soon as it is rendered and the manifest is rewritten after every
view, so an interruption keeps everything already done.
"""
import bpy
import json
import hashlib
import sys
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VARIANT = argv[0] if argv else 'clay02'
OUT = REPO.parent / 'devonian-authoring/doryaspis/rework-v3' / VARIANT
RENDERS = OUT / 'renders'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


construction = json.loads((OUT / 'construction.json').read_text())
assert construction['passed'], 'STOP: construction not passed'
blend = OUT / ('doryaspis-' + VARIANT + '.blend')
assert sha(blend) == construction['blend']['sha256'], 'STOP: blend changed'
for path, expected in construction['inputHashes'].items():
    assert sha(path) == expected, 'STOP: source changed ' + path
assert Path(bpy.data.filepath).resolve() == blend.resolve(), 'STOP: wrong blend input'
RENDERS.mkdir(exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1
scene.cycles.samples = 28
scene.cycles.use_denoising = True
scene.render.resolution_x = 760
scene.render.resolution_y = 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Neutral clay studio')
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (.14, .155, .175, 1)
bg.inputs[1].default_value = .65

subjects = [ob for ob in scene.objects if ob.type == 'MESH']
points = [ob.matrix_world @ v.co for ob in subjects for v in ob.data.vertices]

for name, loc, energy, color, size in [
    ('Broad warm key', (3.5, 5.5, 4.0), 850, (1., .94, .86), 5.0),
    ('Soft cool fill', (-4.0, 2.2, 1.0), 550, (.82, .90, 1.), 5.0),
    ('Rear contour light', (1.0, 3.5, -5.0), 950, (.94, .97, 1.), 4.0),
    ('Ventral bounce', (-1.0, -4.0, 1.0), 300, (.91, .92, .96), 4.5),
    ('Snout raking light', (2.2, .6, 5.2), 420, (1., .96, .90), 2.0),
]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.color = color
    data.shape = 'DISK'
    data.size = size
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector((0, -.02, -.4)) - ob.location).to_track_quat('-Z', 'Y').to_euler()

data = bpy.data.cameras.new('Projected bounds review camera')
data.type = 'ORTHO'
data.clip_start = .01
data.clip_end = 100
cam = bpy.data.objects.new('Projected bounds review camera', data)
scene.collection.objects.link(cam)
scene.camera = cam


def orientation(back, up):
    back = Vector(back).normalized()
    up = Vector(up)
    right = up.cross(back).normalized()
    up = back.cross(right).normalized()
    return Matrix((right, up, back)).transposed().to_4x4()


def fit(viewpoints, back, up, margin=.10):
    rot = orientation(back, up)
    basis = rot.to_3x3()
    inverse = basis.transposed()
    q = [inverse @ p for p in viewpoints]
    lo = Vector(tuple(min(p[i] for p in q) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in q) for i in range(3)))
    center = basis @ ((lo + hi) * .5)
    cam.matrix_world = rot
    cam.location = center + Vector(back).normalized() * 14
    data.ortho_scale = 1
    bpy.context.view_layer.update()
    uv = [world_to_camera_view(scene, cam, p) for p in viewpoints]
    span = max(max(p.x for p in uv) - min(p.x for p in uv),
               max(p.y for p in uv) - min(p.y for p in uv))
    aspect = scene.render.resolution_x / scene.render.resolution_y
    data.ortho_scale = span / (1 - 2 * margin) * (aspect if aspect > 1 else 1)
    bpy.context.view_layer.update()
    uv = [world_to_camera_view(scene, cam, p) for p in viewpoints]
    bounds = {'left': min(p.x for p in uv), 'right': max(p.x for p in uv),
              'bottom': min(p.y for p in uv), 'top': max(p.y for p in uv)}
    assert min(p.z for p in uv) > data.clip_start, 'STOP: subject behind camera'
    return {'boundsNDC': bounds, 'position': list(cam.location),
            'cameraMatrix': [list(row) for row in cam.matrix_world],
            'orthoScale': data.ortho_scale, 'back': back, 'upHint': up,
            'pointCount': len(viewpoints), 'margin': margin}


def box(x, ylo, yhi, zlo, zhi):
    return [Vector((sx, sy, sz)) for sx in (-x, x) for sy in (ylo, yhi) for sz in (zlo, zhi)]


VIEWS = [
    ('01-three-quarter', points, (3.0, 2.25, 4.0), (0, 1, 0), .10),
    ('02-side', points, (1, 0, 0), (0, 1, 0), .10),
    ('03-front', points, (0, .08, 1), (0, 1, 0), .10),
    ('04-dorsal', points, (0, 1, 0), (0, 0, 1), .10),
    ('05-ventral', points, (0, -1, 0), (0, 0, 1), .10),
    ('06-posterior-quarter', points, (-3.0, 1.4, -4.0), (0, 1, 0), .10),
    # The views the user's direction is judged on.
    ('07-oral-close', box(.42, -.44, .38, 1.02, 1.95), (.45, .22, 1.5), (0, 1, 0), .12),
    ('08-front-three-quarter', box(1.15, -.55, .50, .10, 2.60), (1.4, .5, 2.0), (0, 1, 0), .10),
    ('09-snout-side', box(.30, -.46, .42, .55, 2.80), (1, 0, 0), (0, 1, 0), .10),
    ('10-mouth-straight-on', box(.30, -.34, .30, 1.20, 1.95), (0, .06, 1), (0, 1, 0), .10),
]
manifest = {'variant': VARIANT, 'blend': construction['blend'],
            'inputHashes': construction['inputHashes'],
            'anatomy': construction.get('anatomy'),
            'coordinates': 'world Y-up/+Z-forward',
            'render': 'Cycles CPU, one thread, 28 samples, AgX',
            'resolution': [760, 480], 'views': [],
            'status': 'review-needed, not visual approval'}
for name, pts, back, up, margin in VIEWS:
    file = RENDERS / (name + '.png')
    if file.exists():
        print('DORYASPIS_CLAY02_VIEW_SKIP', name, flush=True)
        continue
    record = {'view': name, 'wholeSpecimen': pts is points, **fit(pts, back, up, margin)}
    scene.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)
    record.update(path=str(file), bytes=file.stat().st_size, sha256=sha(file))
    manifest['views'].append(record)
    (OUT / 'render-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('DORYASPIS_CLAY02_VIEW_OK', name, flush=True)
(OUT / 'render-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('DORYASPIS_CLAY02_RENDER_OK', str(OUT / 'render-manifest.json'), flush=True)
