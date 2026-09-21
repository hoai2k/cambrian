"""Does the mouth read as a mouth? Three views of one posed gape, including one from inside it.

  /opt/blender/blender -b --factory-startup --python tools/triassic/mouth-space.py -- <id> <Clip@t> <out.png> [--show-oral]

`gape-solid.py` proves there is no hole and `jaw-views.py` shows the cut from outside; neither says
whether the mouth reads as a cavity with space in it, which is the whole point of doming a cap into
its own half. So this frames the mouth on the animal's own two mouth anchors -- `anchor_mouth` on
the jaw at the front and `anchor_mouth_inside` on the skull at the back, which every Triassic body
carries -- and renders three views of the same posed frame:

  1. **into the gape, from in front and above the lip**, which is the view a player gets when the
     animal bites at them;
  2. **square into the mouth along its own axis**, where a palate that is a flat plate and a palate
     that is a trough look completely different;
  3. **a cutaway down the midline**, a side view whose near clipping plane is set to the animal's
     own centre so the near flank is taken away -- the only view that shows the roof and the floor
     as two surfaces with room between them rather than as one silhouette.

Reads the decoded packaged body, as `gape-solid.py` and `jaw-views.py` do, so it photographs the
file that ships. The oral parts the runtime hides are hidden here too unless `--show-oral` is
given -- a body whose mouth is closed by the cut's own rim has none to hide, which is the point.
The backdrop is a flat mid grey that appears nowhere on the animals. CYCLES on the CPU, no EGL.
"""
import bpy
import os
import re
import sys
from mathutils import Matrix, Vector
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:]
ID, SHOT, OUT = argv[0], argv[1], argv[2]
SHOW_ORAL = '--show-oral' in argv
CLIP, T = SHOT.split('@')
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
s.cycles.samples = 48
s.cycles.use_denoising = True
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGB'
s.view_settings.view_transform = 'AgX'
s.view_settings.exposure = -1.6
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
a = next(x for x in bpy.data.actions if x.name == CLIP or x.name.endswith('_' + CLIP)
         or x.name.endswith('|' + CLIP))
rig.animation_data.action = a
if a.slots:
    rig.animation_data.action_slot = a.slots[0]
first, last = a.frame_range
s.frame_set(round(first + (last - first) * T) if FRACTION else round(T * 30))
bpy.context.view_layer.update()


def bone_head(*names):
    for n in names:
        pb = rig.pose.bones.get(n)
        if pb:
            return rig.matrix_world @ pb.head
    return None


# The mouth's own two ends. `anchor_mouth` rides the jaw at the front of the mouth and
# `anchor_mouth_inside` the skull at the back of it, so the line between them *is* the mouth's axis
# at whatever gape the clip is holding -- which is why the frame follows the pose for free.
front = bone_head('anchor_mouth')
back = bone_head('anchor_mouth_inside')
# The camera's axes come from the **skull**, never from the jaw: the jaw swings in the clip, and a
# frame built on it tips the whole view by the gape -- which is the one thing the picture is of.
pb = rig.pose.bones.get('skull') or rig.pose.bones.get('jaw')
M = rig.matrix_world @ pb.matrix
jfwd = -(M.to_3x3() @ Vector((0, 1, 0))).normalized()
jdown = -(M.to_3x3() @ Vector((0, 0, 1))).normalized()
if front is None or back is None:
    hinge = rig.matrix_world @ pb.head
    L0 = max((max(o.dimensions) for o in s.objects if o.type == 'MESH'), default=5.)
    front, back = hinge + jfwd * (.06 * L0), hinge
reach = max((front - back).length, 1e-6)
fwd, side, up = jfwd, jfwd.cross(jdown).normalized(), -jdown
mid = (front + back) * .5
L = max((max(o.dimensions) for o in s.objects if o.type == 'MESH'), default=5.)

# Frame on the head rather than on the anchors: the gap between the two mouth anchors is a few
# hundredths of a body on a short-snouted animal and the view would be a close-up of one tooth.
HEAD = max(reach * 2.4, .26 * L)
VIEWS = [
    ('into the gape, from in front and above the lip',
     mid, (fwd * 2.2 + up * 1.1 + side * 1.4).normalized(), HEAD, False),
    ('square into the mouth along its own axis',
     mid, fwd, HEAD * .9, False),
    ('cutaway: the head from the right, clipped at the midline',
     mid, side, HEAD * 1.7, True),
]

for loc, power, color in [((5, -5, 8), 2600, (1, .93, .86)), ((-5, -2, 3), 2000, (.65, .83, 1)),
                          ((1, 6, 5), 2400, (.75, .9, 1)), ((0, 0, -7), 1500, (.9, .9, .9))]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = 6
    o.data.color = color
    o.rotation_euler = (mid - o.location).to_track_quat('-Z', 'Y').to_euler()
# One more light down the mouth's own axis, or the gape is a black hole whatever is in it. Sized
# and placed on the head rather than on the anchors, and weak, so it fills the mouth without
# flattening the skin either side of it.
bpy.ops.object.light_add(type='AREA', location=front + fwd * (.25 * L) + up * (.10 * L))
lamp = bpy.context.object
lamp.data.energy = 2.5 * L * L
lamp.data.size = .25 * L
lamp.rotation_euler = (mid - lamp.location).to_track_quat('-Z', 'Y').to_euler()

# And one inside the mouth, for the cutaway only. A head is a closed solid: no lamp outside it and
# no amount of world light reaches the palate, so a cutaway lit from outside is a black hole in the
# shape of a mouth, which says nothing about whether there is room in it.
bpy.ops.object.light_add(type='POINT', location=mid)
inner = bpy.context.object
inner.data.energy = 6. * L * L
inner.data.shadow_soft_size = .02 * L
inner.hide_render = True

bpy.ops.object.camera_add()
cam = bpy.context.object
s.camera = cam
files = []
W_, H_ = 620, 520
for k, (label, target, direction, scale, cutaway) in enumerate(VIEWS):
    d = Vector(direction).normalized()
    cam.data.type = 'ORTHO'
    cam.location = target + d * (2 * L)
    # Up is the **skull's** up, not the world's, so an animal photographed mid-clip is upright in
    # every panel rather than rolled by whatever the body was doing. A camera looks down its own
    # -Z and it stands at `target + d`, so its +Z is `d`.
    if abs(up.dot(d)) < .98:
        zc = d
        xc = up.cross(zc).normalized()
        yc = zc.cross(xc).normalized()
        cam.matrix_world = Matrix.Translation(cam.location) @ \
            Matrix((xc, yc, zc)).transposed().to_4x4()
    else:
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    # The cutaway is the same side view with the near half taken off by the clipping plane, which
    # costs nothing and cannot lie about the geometry: what is drawn is the real surface at the
    # midline, palate above and floor below with the mouth between them.
    cam.data.clip_start = (2 * L) if cutaway else .1
    cam.data.clip_end = 4 * L
    # Inside a head no lamp reaches, so the cutaway is lit by the world instead: a flat ambient
    # bath, which is the only way the far half's inner surface is anything but black.
    bg.inputs[1].default_value = 1.4 if cutaway else .6
    inner.hide_render = not cutaway
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
print('MOUTH_SPACE', OUT, SHOT, [f[3] for f in files])
