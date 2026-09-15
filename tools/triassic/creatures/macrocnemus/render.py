"""Render the re-imported exported Macrocnemus: portraits, the review poses and the shore chain.

  /opt/blender/blender --background --factory-startup --python .../render.py -- --decoded
  /opt/blender/blender --background --factory-startup --python .../render.py -- --decoded --puppet
"""
import bpy
import math
import os
import sys
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'public/assets/triassic/creatures'
LOCAL = ROOT / 'local/triassic-authoring/macrocnemus'
SUFFIX = '.puppet' if '--puppet' in sys.argv else ''
REVIEW = LOCAL / ('puppet-review' if SUFFIX else 'authored-review')
REVIEW.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / ('macrocnemus' + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv \
    else (OUT / ('macrocnemus' + SUFFIX + '.glb'))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s = bpy.context.scene
s.render.fps = 30
s.render.engine = 'CYCLES'
s.cycles.samples = 16
s.cycles.use_denoising = True
s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs[1].default_value = .35
# CYCLES ignores `use_backface_culling`, so a review render would show the near wall of the mouth
# lining that the runtime throws away. Emulate the cull, so a sheet shows what a player sees.
for m in bpy.data.materials:
    if not m.use_nodes or not m.use_backface_culling:
        continue
    nt = m.node_tree
    out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    link = next((ln for ln in nt.links if ln.to_node == out and ln.to_socket.name == 'Surface'), None)
    if link:
        src = link.from_socket
        nt.links.remove(link)
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
        nt.links.new(src, mix.inputs[1])
        nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])

rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
for loc, power in [((3, -5, 5), 1200), ((-3, -1, 3), 700), ((0, 4, 4), 1300), ((0, -5, -2), 260)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = 5
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
s.camera = cam
cam.data.type = 'ORTHO'


def pose(clip, t):
    a = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = a
    if a.slots:
        rig.animation_data.action_slot = a.slots[0]
    s.frame_set(round(t * 30))


# Blender's to_track_quat resolves "up" against world +Z, which is degenerate for a camera looking
# straight down: a plan view then comes out with the animal running up the frame instead of across
# it, and a 5-unit body is cropped by a 3.4-unit frame. The plan views set their rotation outright.
TOP = (0, 0, math.pi / 2)
BELLY = (math.pi, 0, -math.pi / 2)


def render(file, w=800, h=600, loc=(7, -5, 4.2), target=(0, 0, 0), scale=6.6, rot=None):
    cam.location = loc
    cam.rotation_euler = rot if rot else (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    s.render.resolution_x = w
    s.render.resolution_y = h
    s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


# The gait is what this animal is judged on, so Run gets a full cycle from the side and from above
# and the three shore clips get the same treatment: the reviewer asked for a land gait, a dash into
# the shallows, a strike and a retreat, and eight frames of a stride is how you see whether it runs.
CHAIN = ([('Run', t) for t in [0., .08, .16, .24, .31, .39, .47, .55]]
         + [('Charge', t) for t in [0., .2, .4, .6, .8, .95]]
         + [('Snatch', t) for t in [0., .2, .35, .5, .65]]
         + [('Retreat', t) for t in [0., .25, .5, .75, 1.1]]
         + [('Crawl', t) for t in [.2, .7, 1.2]])
if '--chain-only' in sys.argv:
    for clip, t in CHAIN:
        pose(clip, t)
        render(REVIEW / ('%s-%s-cside.png' % (clip, t)), 900, 480, (8, 0, .6), (0, 0, -.1), 6.0)
        pose(clip, t)
        render(REVIEW / ('%s-%s-ctop.png' % (clip, t)), 900, 480, (0, 0, 9), (0, 0, 0), 6.0, TOP)
    sys.exit(0)

pose('Idle', 0)
if SUFFIX and '--review-only' not in sys.argv:
    render(OUT / 'macrocnemus.puppet.png', 1200, 900)
    if '--portrait-only' in sys.argv:
        sys.exit(0)
if not SUFFIX and '--review-only' not in sys.argv:
    for suffix, w, h in [('select.png', 1600, 1200), ('card.png', 800, 600), ('thumb.png', 256, 192), ('png', 1200, 900)]:
        render(OUT / ('macrocnemus.' + suffix), w, h)
    if '--portrait-only' in sys.argv:
        sys.exit(0)

MOUTHS = [('mouth-closed', 'Idle', 0., 1.30, False), ('mouth-Bite', 'Bite', .2, 1.30, False),
          ('mouth-Snatch', 'Snatch', .3, 1.30, False), ('mouth-Heavy', 'Heavy', .15, 1.30, False),
          ('gape-side', 'Bite', .2, 1.0, False), ('gape-top', 'Bite', .2, 1.0, True)]


# The head close-ups used to aim at a fixed world point, which is where the head rests and nowhere
# near where it is during a strike: Tanystropheus' `mouth-Snap` came out an empty frame. They
# follow the live skull instead, and stand off along the head's *own* side rather than the world's,
# because a gape that opens downward is invisible from over the top of the skull — which is exactly
# where a world-space offset ends up once the neck has swung down into the water.
def head_frame():
    pb = rig.pose.bones.get('jaw') or rig.pose.bones.get('skull')
    m = rig.matrix_world @ pb.matrix
    fwd = -(m.to_3x3() @ Vector((0, 1, 0))).normalized()   # bones point tailward
    down = -(m.to_3x3() @ Vector((0, 0, 1))).normalized()
    return (rig.matrix_world @ pb.head), fwd, fwd.cross(down).normalized(), down


def head_shot(file, scale, over=False):
    bpy.context.view_layer.update()
    tgt, fwd, side, down = head_frame()
    tgt = tgt + fwd * .12
    cam.location = tgt + (down * -4.0 if over else side * 4.0 + fwd * .9 - down * .5)
    cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    s.render.resolution_x, s.render.resolution_y = 1000, 750
    s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


def mouth_pass():
    for name, clip, t, scale, over in MOUTHS:
        pose(clip, t)
        head_shot(REVIEW / (name + '.png'), scale, over)


if '--mouth-only' in sys.argv:
    mouth_pass()
    sys.exit(0)


POSES = [('Idle', 0), ('Idle', 1.6), ('Crawl', .2), ('Crawl', .7), ('Crawl', 1.2),
         ('Run', 0.), ('Run', .16), ('Run', .31), ('Run', .47),
         ('Swim', 0), ('Swim', .4), ('Swim', .8), ('Sprint', .25), ('Sprint', .5),
         ('TurnLeft', .7), ('TurnRight', .7), ('Dive', .6), ('Rise', .6),
         ('Attack', .12), ('Attack', .35), ('Attack', .6), ('Bite', .2),
         ('Heavy', .15), ('Heavy', .4), ('Heavy', .7), ('Hit', .25), ('Death', 1.4),
         ('Guard', .5), ('Parry', .15), ('Dodge', .2), ('Eat', .4), ('Stagger', .5),
         ('Ability', .2), ('Ability', .5), ('Ability', .8), ('Grab', .5), ('Breath', 1.), ('Growth', .7),
         ('Charge', .2), ('Charge', .5), ('Charge', .85), ('Snatch', .2), ('Snatch', .45),
         ('Retreat', .25), ('Retreat', .7)]
for clip, t in POSES:
    pose(clip, t)
    render(REVIEW / ('%s-%s.png' % (clip, t)))
for name, loc, tgt, scale, rot in [('side', (8, 0, .1), (0, 0, 0), 6.0, None),
                                   ('top', (0, 0, 9), (0, 0, 0), 6.0, TOP),
                                   ('front', (0, -9, .5), (0, 0, 0), 2.8, None),
                                   ('belly', (0, 0, -9), (0, 0, 0), 6.0, BELLY)]:
    pose('Idle', 0)
    render(REVIEW / (name + '.png'), 1000, 750, loc, tgt, scale, rot)
# The mouth, at the distance a player sees it from and close enough to judge the lining
# and fangs. The cameras ride the skull: see head_shot above.
mouth_pass()
for clip, t in CHAIN:
    pose(clip, t)
    render(REVIEW / ('%s-%s-cside.png' % (clip, t)), 900, 480, (8, 0, .6), (0, 0, -.1), 6.0)
    pose(clip, t)
    render(REVIEW / ('%s-%s-ctop.png' % (clip, t)), 900, 480, (0, 0, 9), (0, 0, 0), 6.0, TOP)
