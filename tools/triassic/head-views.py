"""Before/after head close-ups for a head-side change on a delivered body.

  /opt/blender/blender -b --factory-startup --python tools/triassic/head-views.py -- <id> <unpacked.glb> <out.png>

Renders the body at rest (Idle, frame 0) from the views listed for that animal under VIEWS — each
is a camera offset from a point on the head and an ortho width, in the decoded GLB's own Blender
frame (the builder's engine frame: +X across the body, head toward -Y, +Z up) — and writes them
side by side into one PNG, so a pair of these taken off the shipped file before and after a
builder change compares the same pixels. CYCLES on the CPU, no EGL needed.
"""
import bpy
import os
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
ID, GLB, OUT = argv[0], argv[1], argv[2]

# (label, look-at point, camera offset direction, ortho scale, image w, h, roll about the view)
VIEWS = {
    # the right eye, three-quarter from ahead and above, and straight from the side
    'shonisaurus': [('right eye, three-quarter', (-.25, -1.72, .08), (-3, -1.6, 1.0), 1.05, 700, 700, 0),
                    ('right eye, side', (-.25, -1.72, .08), (-4, 0, .2), 1.05, 700, 700, 0)],
    # the head and neck from above (the yaw shows here) and from the animal's right
    'nothosaurus': [('head and neck from above', (-.12, -1.75, .55), (0, 0, 8), 2.6, 700, 700, 0),
                    ('head from the right', (-.24, -2.1, .62), (-4, -.3, .25), 1.5, 700, 700, 0)],
}[ID]

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=GLB)
s = bpy.context.scene
s.render.fps = 30
s.render.engine = 'CYCLES'
s.cycles.samples = 48
s.cycles.use_denoising = True
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGB'
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True
bg = s.world.node_tree.nodes['Background']
bg.inputs[0].default_value = (.12, .14, .16, 1)
bg.inputs[1].default_value = .5
rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
a = next(x for x in bpy.data.actions if x.name == 'Idle' or x.name.endswith('_Idle') or x.name.endswith('|Idle'))
rig.animation_data.action = a
if a.slots:
    rig.animation_data.action_slot = a.slots[0]
s.frame_set(0)
for loc, power, color in [((5, -5, 8), 2400, (1, .93, .86)), ((-5, -2, 3), 1800, (.65, .83, 1)), ((1, 6, 5), 2200, (.75, .9, 1))]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = 6
    o.data.color = color
    o.rotation_euler = (Vector((0, -1.5, .3)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
s.camera = cam
cam.data.type = 'ORTHO'
files = []
for k, (label, target, off, scale, w, h, roll) in enumerate(VIEWS):
    T = Vector(target)
    d = Vector(off).normalized()
    cam.location = T + d * 6
    cam.rotation_euler = (T - cam.location).to_track_quat('-Z', 'Y').to_euler()
    if off[0] == 0 and off[1] == 0:
        cam.rotation_euler.z += 3.141592653589793   # from above: head (toward -Y) at the top of the frame
    cam.data.ortho_scale = scale
    s.render.resolution_x, s.render.resolution_y = w, h
    f = OUT.replace('.png', '.view%d.png' % k)
    s.render.filepath = f
    bpy.ops.render.render(write_still=True)
    files.append((f, w, h, label))
# compose side by side
W = sum(f[1] for f in files)
H = max(f[2] for f in files)
sheet = bpy.data.images.new('sheet', W, H, alpha=False)
buf = [0.0] * (W * H * 4)
x0 = 0
for f, w, h, label in files:
    im = bpy.data.images.load(f)
    px = list(im.pixels)
    for y in range(h):
        row = px[y * w * 4:(y + 1) * w * 4]
        start = (y * W + x0) * 4
        buf[start:start + w * 4] = row
    x0 += w
sheet.pixels = buf
sheet.filepath_raw = OUT
sheet.file_format = 'PNG'
sheet.save()
for f, _, _, _ in files:
    os.remove(f)
print('HEAD_VIEWS', OUT, [f[3] for f in files])
