"""Contact sheets of a clip, old row against new row, from two camera angles.

  <bpy python> tools/creatures/motion/review.py <review.glb> <outdir> <Clip> [Clip ...] [--frames N]

The GLB must be uncompressed (apply.mjs --review writes one). Each sheet has four rows:
replaced/<Clip> and <Clip> from a front three-quarter view above, then the same pair from
below and ahead, where the mouth is. Cycles on CPU, so it runs anywhere.
"""
import bpy, sys, os, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
glb, out = argv[0], argv[1]
frames_n = int(argv[argv.index('--frames') + 1]) if '--frames' in argv else 8
clips = [a for a in argv[2:] if not a.startswith('--') and not a.isdigit()]
os.makedirs(out, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
sc.render.resolution_x, sc.render.resolution_y = 480, 360
sc.render.fps = 30
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.16, 0.24, 0.28, 1)
sun = bpy.data.lights.new('s', 'SUN'); sun.energy = 3.5; so = bpy.data.objects.new('s', sun); sc.collection.objects.link(so); so.rotation_euler = (0.9, 0.25, 0.6)
fill = bpy.data.lights.new('f', 'SUN'); fill.energy = 1.2; fo = bpy.data.objects.new('f', fill); sc.collection.objects.link(fo); fo.rotation_euler = (-1.2, 0.4, 2.5)
cam = bpy.data.cameras.new('c'); cam.lens = 45; co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co

def bounds():
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in bpy.data.objects:
        if o.type == 'MESH':
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    return lo, hi
lo, hi = bounds(); centre = (lo + hi) / 2; size = (hi - lo).length
# The imported scene is Blender Z-up: glTF +Z forward became Blender -Y forward.
front = Vector((0, -1, 0))
def aim(pos, target):
    co.location = pos
    d = target - pos
    co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
# Frame the head: the review is about what the feeding appendages do, not the whole body.
def bone_head(name):
    pb = arm.pose.bones.get(name)
    return arm.matrix_world @ pb.head if pb else centre
focus = (bone_head('body') if 'body' in arm.pose.bones else centre) + front * size * .12
views = {
    'above': lambda: aim(focus + Vector((size * .38, -size * .32, size * .26)), focus),
    'below': lambda: aim(focus + Vector((size * .22, -size * .42, -size * .24)), focus),
}
def action_for(name):
    for a in bpy.data.actions:
        if a.name == name or a.name.startswith(name + '_'): return a
    return None
from PIL import Image, ImageDraw
for clip in clips:
    rows = []
    for view, place in views.items():
        for label in ('replaced/' + clip, clip):
            act = action_for(label)
            if act is None: print('missing', label); continue
            arm.animation_data.action = act
            f0, f1 = act.frame_range
            place()
            tiles = []
            for i in range(frames_n):
                fr = f0 + (f1 - f0) * i / (frames_n - 1)
                sc.frame_set(int(round(fr)))
                p = os.path.join(out, f'_{clip.replace("/", "-")}-{view}-{label.replace("/", "-")}-{i}.png')
                sc.render.filepath = p; bpy.ops.render.render(write_still=True)
                tiles.append((p, fr / 30))
            rows.append((label + ' · ' + view, tiles))
    w, h = sc.render.resolution_x, sc.render.resolution_y
    sheet = Image.new('RGB', (w * frames_n, (h + 18) * len(rows)), (20, 24, 28)); draw = ImageDraw.Draw(sheet)
    for r, (label, tiles) in enumerate(rows):
        y = r * (h + 18); draw.text((6, y + 3), label, fill=(230, 230, 220))
        for i, (p, t) in enumerate(tiles):
            sheet.paste(Image.open(p).convert('RGB'), (i * w, y + 18)); draw.text((i * w + 6, y + h + 4), f'{t:.2f}s', fill=(200, 200, 190))
            os.remove(p)
    sheet.save(os.path.join(out, f'{clip}.png'))
    print('sheet', clip)
