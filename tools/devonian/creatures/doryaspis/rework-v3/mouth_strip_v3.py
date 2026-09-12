"""Three close-ups of the V3 snout, from the candidate GLB rather than the blend.

    /opt/blender/blender -b --threads 1 --python <this> -- <out-dir>

Front, three-quarter and side, each fitted to the snout box in glTF coordinates
(X lateral, Y up, +Z forward), which is the space the clay design was authored
in.  This is the strip the user's direction is judged on: the mouth must be at
the very front of the snout, above the saw.
"""
import bpy
import sys
from pathlib import Path
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

args = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(args[0])
OUT.mkdir(parents=True, exist_ok=True)
REPO = Path(__file__).resolve().parents[5]
GLB = REPO.parent / 'devonian-authoring/doryaspis/v3-candidate/doryaspis.glb'
def g2b(p):
    """glTF (X lateral, Y up, +Z forward) -> Blender Z-up, as the importer places it."""
    return Vector((p[0], -p[2], p[1]))


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(GLB))
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
if rig.animation_data:
    for tr in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(tr)
    rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.matrix_basis = Matrix()
bpy.context.view_layer.update()
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 900
scene.render.resolution_y = 620
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Neutral studio')
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (.13, .15, .17, 1)
bg.inputs[1].default_value = .55
for name, loc, energy, col, size in [
        ('key', (3.0, 3.4, 4.6), 700, (1, .95, .88), 3.5),
        ('fill', (-3.4, 1.2, 2.0), 420, (.82, .90, 1), 3.5),
        ('rim', (.8, 2.6, -4.0), 620, (.94, .97, 1), 3.0),
        ('bounce', (-.8, -3.0, 1.6), 260, (.91, .92, .96), 3.5)]:
    d = bpy.data.lights.new(name, 'AREA')
    d.energy, d.color, d.shape, d.size = energy, col, 'DISK', size
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = loc
    o.location = g2b(loc)
    o.rotation_euler = (g2b((0, -.05, 1.2)) - o.location).to_track_quat('-Z', 'Y').to_euler()
cd = bpy.data.cameras.new('snout')
cd.type = 'ORTHO'
cd.clip_start, cd.clip_end = .01, 100
cam = bpy.data.objects.new('snout', cd)
scene.collection.objects.link(cam)
scene.camera = cam


def fit(pts, back, up, margin=.10):
    back = Vector(back).normalized()
    right = Vector(up).cross(back).normalized()
    rot = Matrix((right, back.cross(right).normalized(), back)).transposed().to_4x4()
    basis = rot.to_3x3()
    q = [basis.transposed() @ p for p in pts]
    lo = Vector(tuple(min(p[i] for p in q) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in q) for i in range(3)))
    cam.matrix_world = rot
    cam.location = basis @ ((lo + hi) * .5) + back * 14
    cd.ortho_scale = 1
    bpy.context.view_layer.update()
    uv = [world_to_camera_view(scene, cam, p) for p in pts]
    span = max(max(p.x for p in uv) - min(p.x for p in uv),
               max(p.y for p in uv) - min(p.y for p in uv))
    aspect = scene.render.resolution_x / scene.render.resolution_y
    cd.ortho_scale = span / (1 - 2 * margin) * max(1., aspect)
    bpy.context.view_layer.update()


def box(x, ylo, yhi, zlo, zhi):
    return [g2b((sx, sy, sz)) for sx in (-x, x) for sy in (ylo, yhi) for sz in (zlo, zhi)]


for name, pts, back, margin in [
        ('front', box(.34, -.34, .32, 1.15, 1.60), (0, .05, 1), .12),
        ('three-quarter', box(.46, -.44, .40, .90, 2.20), (.9, .45, 1.6), .10),
        ('side', box(.30, -.46, .42, .55, 2.92), (1, 0, .04), .10)]:
    fit(pts, g2b(back), g2b((0, 1, 0)), margin)
    scene.render.filepath = str(OUT / ('mouth-' + name + '.png'))
    bpy.ops.render.render(write_still=True)
    print('DORYASPIS_V3_MOUTH_VIEW_OK', name, flush=True)
print('DORYASPIS_V3_MOUTH_STRIP_OK', str(OUT), flush=True)
