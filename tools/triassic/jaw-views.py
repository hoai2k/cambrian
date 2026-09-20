"""The jaw junction at a posed frame: the head from the animal's right and from under the throat.

  /opt/blender/blender -b --factory-startup --python tools/triassic/jaw-views.py -- <id> <Clip@t> <out.png> [--show-oral]

Reads `local/triassic-authoring/<id>/<id>.unpacked.glb` (a decoded copy of the packaged body, as
`gape-solid.py` does), poses the rig at second `t` of the named clip, and renders the head twice:
from the animal's right side, a little below the mouth line, and from below and behind the hinge,
which is where a jaw shell swinging away from the throat it was cut from shows. The two views go
side by side into one PNG, so a pair of these taken off the shipped file before and after a builder
change compares the same pixels. CYCLES on the CPU, no EGL.

The oral parts the runtime hides -- everything `src/shared/oral-geometry.ts` matches -- are hidden
here too, because the render is meant to show what a player sees; `--show-oral` keeps them. The
backdrop is a flat mid grey that appears nowhere on the animals, so a slot opened at the cut reads
as a grey wedge in the head.
"""
import bpy
import os
import re
import sys
from mathutils import Vector
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:]
ID, SHOT, OUT = argv[0], argv[1], argv[2]
SHOW_ORAL = '--show-oral' in argv
CLIP, T = SHOT.split('@')
# `Clip@1.2` is a second into the clip; `Clip@44%` is a fraction of its length (what lag.mjs prints).
FRACTION = T.endswith('%')
T = float(T.rstrip('%')) / (100. if FRACTION else 1.)
ROOT = Path(__file__).resolve().parents[2]
GLB = ROOT / 'local/triassic-authoring' / ID / (ID + '.unpacked.glb')
ORAL = re.compile(r'lining|mouth[ _]interior|hinge[ _]tissue|beak|palate', re.I)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(GLB))
s = bpy.context.scene
s.render.fps = 30
s.render.engine = 'CYCLES'
s.cycles.samples = 40
s.cycles.use_denoising = True
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGB'
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True
bg = s.world.node_tree.nodes['Background']
bg.inputs[0].default_value = (.36, .36, .36, 1)
bg.inputs[1].default_value = .6

if not SHOW_ORAL:
    for o in list(s.objects):
        if o.type != 'MESH':
            continue
        names = [o.name] + [m.name for m in o.data.materials if m]
        if any(ORAL.search(n) for n in names):
            o.hide_render = True

rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
a = next(x for x in bpy.data.actions if x.name == CLIP or x.name.endswith('_' + CLIP) or x.name.endswith('|' + CLIP))
rig.animation_data.action = a
if a.slots:
    rig.animation_data.action_slot = a.slots[0]
first, last = a.frame_range
s.frame_set(round(first + (last - first) * T) if FRACTION else round(T * 30))
bpy.context.view_layer.update()

# Frame off the jaw bone's own axes at this pose: a body that pitches or rolls in the clip is still
# photographed square to its head.
pb = rig.pose.bones.get('jaw') or rig.pose.bones.get('skull')
M = rig.matrix_world @ pb.matrix
fwd = -(M.to_3x3() @ Vector((0, 1, 0))).normalized()
down = -(M.to_3x3() @ Vector((0, 0, 1))).normalized()
side = fwd.cross(down).normalized()
hinge = rig.matrix_world @ pb.head
# Scale the frame by the body: the box of every visible mesh at rest is the body's own length.
L = max((max(o.dimensions) for o in s.objects if o.type == 'MESH'), default=5.)
tgt = hinge + fwd * (.02 * L) - down * (.005 * L)
VIEWS = [
    ('right side, below the lip', tgt, side * 4 + fwd * .3 - down * .9, .30 * L),
    ('below and behind the hinge', tgt, down * 4 + side * 1.6 - fwd * 2.2, .30 * L),
]

for loc, power, color in [((5, -5, 8), 2400, (1, .93, .86)), ((-5, -2, 3), 1800, (.65, .83, 1)), ((1, 6, 5), 2200, (.75, .9, 1)), ((0, 0, -7), 1400, (.9, .9, .9))]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = 6
    o.data.color = color
    o.rotation_euler = (hinge - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
s.camera = cam
cam.data.type = 'ORTHO'
files = []
W_, H_ = 640, 520
for k, (label, target, off, scale) in enumerate(VIEWS):
    d = Vector(off).normalized()
    cam.location = target + d * (2 * L)
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    s.render.resolution_x, s.render.resolution_y = W_, H_
    f = OUT.replace('.png', '.view%d.png' % k)
    s.render.filepath = f
    bpy.ops.render.render(write_still=True)
    files.append((f, W_, H_, label))
W = sum(f[1] for f in files)
H = max(f[2] for f in files)
sheet = bpy.data.images.new('sheet', W, H, alpha=False)
buf = [0.0] * (W * H * 4)
x0 = 0
for f, w, h, label in files:
    im = bpy.data.images.load(f)
    px = list(im.pixels)
    for y in range(h):
        buf[(y * W + x0) * 4:(y * W + x0) * 4 + w * 4] = px[y * w * 4:(y + 1) * w * 4]
    x0 += w
sheet.pixels = buf
sheet.filepath_raw = OUT
sheet.file_format = 'PNG'
sheet.save()
for f, _, _, _ in files:
    os.remove(f)
print('JAW_VIEWS', OUT, SHOT, [f[3] for f in files])
