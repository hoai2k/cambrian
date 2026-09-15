"""Render the re-imported exported Tanystropheus: portraits, the review poses and the shore chain.

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
LOCAL = ROOT / 'local/triassic-authoring/tanystropheus'
SUFFIX = '.puppet' if '--puppet' in sys.argv else ''
REVIEW = LOCAL / ('puppet-review' if SUFFIX else 'authored-review')
REVIEW.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / ('tanystropheus' + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv \
    else (OUT / ('tanystropheus' + SUFFIX + '.glb'))
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


# The shore chain is what this animal is judged on, so it gets its own side-and-top pass at its own
# framing: the whole animal for the sweep, because half the point is how far the head travels
# against a body that does not move.
CHAIN = ([('Lower', t) for t in [0., .5, 1., 1.45]]
         + [('SnapLeft', t) for t in [0., .12, .24, .3, .4, .55]]
         + [('SnapRight', t) for t in [.24, .4]]
         + [('Retract', t) for t in [0., .3, .6, .85]]
         + [('Severed', t) for t in [.2, .8, 1.6, 2.1]]
         + [('Drag', t) for t in [.2, .9]])
if '--chain-only' in sys.argv:
    for clip, t in CHAIN:
        pose(clip, t)
        render(REVIEW / ('%s-%s-cside.png' % (clip, t)), 900, 480, (8, 0, .6), (0, 0, -.1), 6.4)
        pose(clip, t)
        render(REVIEW / ('%s-%s-ctop.png' % (clip, t)), 900, 640, (0, 0, 9), (0, 0, 0), 8.0, TOP)
    sys.exit(0)

pose('Idle', 0)
if SUFFIX and '--review-only' not in sys.argv:
    render(OUT / 'tanystropheus.puppet.png', 1200, 900)
    if '--portrait-only' in sys.argv:
        sys.exit(0)
if not SUFFIX and '--review-only' not in sys.argv:
    for suffix, w, h in [('select.png', 1600, 1200), ('card.png', 800, 600), ('thumb.png', 256, 192), ('png', 1200, 900)]:
        render(OUT / ('tanystropheus.' + suffix), w, h)
    if '--portrait-only' in sys.argv:
        sys.exit(0)

MOUTHS = [('mouth-closed', 'Idle', 0., 1.30, False), ('mouth-Bite', 'Bite', .25, 1.30, False),
          ('mouth-Snap', 'SnapLeft', .20, 1.30, False), ('mouth-Heavy', 'Heavy', .2, 1.30, False),
          ('gape-side', 'Bite', .25, 1.0, False), ('gape-top', 'Bite', .25, 1.0, True)]


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


POSES = [('Idle', 0), ('Idle', 1.6), ('Crawl', .1), ('Crawl', .6), ('Crawl', 1.1), ('Crawl', 1.7),
         ('Swim', 0), ('Swim', .55), ('Swim', 1.1), ('Sprint', .35), ('Sprint', .7),
         ('TurnLeft', .9), ('TurnRight', .9), ('Dive', .7), ('Rise', .7),
         ('Attack', .15), ('Attack', .45), ('Attack', .75), ('Bite', .25),
         ('Heavy', .2), ('Heavy', .5), ('Heavy', .9), ('Hit', .3), ('Death', 1.7),
         ('Guard', .6), ('Parry', .2), ('Dodge', .25), ('Eat', .5), ('Stagger', .6),
         ('Ability', .3), ('Ability', .55), ('Ability', .8), ('Grab', .55), ('Breath', 1.2), ('Growth', .75),
         ('Lower', .5), ('Lower', 1.45), ('SnapLeft', .24), ('SnapLeft', .4), ('Retract', .3),
         ('Drag', .2), ('Drag', .9), ('Severed', .8), ('Severed', 2.1)]
for clip, t in POSES:
    pose(clip, t)
    render(REVIEW / ('%s-%s.png' % (clip, t)))
for name, loc, tgt, scale, rot in [('side', (8, 0, .1), (0, 0, 0), 6.6, None),
                                   ('top', (0, 0, 9), (0, 0, 0), 6.6, TOP),
                                   ('front', (0, -9, .5), (0, 0, 0), 2.6, None),
                                   ('belly', (0, 0, -9), (0, 0, 0), 6.6, BELLY)]:
    pose('Idle', 0)
    render(REVIEW / (name + '.png'), 1000, 750, loc, tgt, scale, rot)
# The mouth, at the distance a player sees it from and close enough to judge the lining
# and fangs. The cameras ride the skull: see head_shot above.
mouth_pass()
for clip, t in CHAIN:
    pose(clip, t)
    render(REVIEW / ('%s-%s-cside.png' % (clip, t)), 900, 480, (8, 0, .6), (0, 0, -.1), 6.4)
    pose(clip, t)
    render(REVIEW / ('%s-%s-ctop.png' % (clip, t)), 900, 640, (0, 0, 9), (0, 0, 0), 8.0, TOP)
