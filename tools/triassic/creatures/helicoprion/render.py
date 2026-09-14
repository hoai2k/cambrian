"""Render the exported Helicoprion: every clip at chosen phases, the diagnostic views, and the
four portraits, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/helicoprion/render.py \
      -- [--decoded] [--twin] [--portraits-only] [--mouth-only]

Headless Blender has no GL context, so this uses Cycles on the CPU. Portraits are written into
this directory's `portraits/`, not into `public/assets/`: until a human decides this body ships,
the roster's placeholder cards cut from the canonical pose stay where they are.
"""
import bpy, os, sys
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'public/assets/triassic/creatures'
HERE = Path(__file__).resolve().parent
LOCAL = ROOT / 'local/triassic-authoring/helicoprion'
TWIN = '--twin' in sys.argv
SUFFIX = '.puppet' if TWIN else ''
REVIEW = LOCAL / ('twin-review' if TWIN else 'authored-review')
REVIEW.mkdir(parents=True, exist_ok=True)
(HERE / 'portraits').mkdir(exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / ('helicoprion' + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv else (OUT / ('helicoprion' + SUFFIX + '.glb'))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))

s = bpy.context.scene
s.render.fps = 30
s.render.engine = 'CYCLES'
s.cycles.device = 'CPU'
s.cycles.samples = 24
s.cycles.use_denoising = True
s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs[1].default_value = .35

rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
for loc, power in [((3, -5, 5), 1000), ((-3, -1, 3), 600), ((0, 4, 4), 1100), ((0, -5, -2), 230)]:
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
    a = next(a for a in bpy.data.actions
             if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = a
    if a.slots:
        rig.animation_data.action_slot = a.slots[0]
    s.frame_set(round(t * 30))


def render(file, w=800, h=600, loc=(7, -5, 4.2), target=(0, 0, 0), scale=6.4):
    cam.location = loc
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    s.render.resolution_x = w
    s.render.resolution_y = h
    s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


# The head sits at Blender -Y once the glTF +Z-forward body is imported; the whorl is just
# under the snout, which is what the mouth cameras are aimed at.
MOUTH = dict(loc=(3.4, -3.6, -.2), target=(0, -2.15, -.15), scale=1.5)
BELOW = dict(loc=(.2, -2.6, -3.4), target=(0, -2.05, -.12), scale=1.6)
# Close on the whorl itself: the reviewer judges this feature by eye, so it gets a camera that
# fills the frame with it rather than with the head. Side is the plane the coil lies in; the
# three-quarter looks in past the snout with the gape open, which is how a player meets it.
WHORL_SIDE = dict(loc=(5, -2.05, -.13), target=(0, -2.05, -.13), scale=1.0)
WHORL_3Q = dict(loc=(2.6, -4.2, -1.1), target=(0, -2.1, -.20), scale=1.15)

if '--whorl-only' in sys.argv:
    for clip, t in [('Idle', 0), ('Bite', .25), ('Attack', .4)]:
        pose(clip, t)
        render(REVIEW / ('whorl-side-%s-%s.png' % (clip, t)), 1000, 1000, **WHORL_SIDE)
        render(REVIEW / ('whorl-3q-%s-%s.png' % (clip, t)), 1000, 1000, **WHORL_3Q)
    sys.exit(0)

if '--mouth-only' in sys.argv:
    pose('Bite', .25)
    render(REVIEW / 'mouth-Bite.png', 1000, 750, **MOUTH)
    render(REVIEW / 'mouth-below-Bite.png', 1000, 750, **BELOW)
    pose('Idle', 0)
    render(REVIEW / 'mouth-Idle.png', 1000, 750, **MOUTH)
    render(REVIEW / 'mouth-below-Idle.png', 1000, 750, **BELOW)
    sys.exit(0)

pose('Idle', 0)
if '--portraits-only' in sys.argv or '--review-only' not in sys.argv:
    if TWIN:
        render(HERE / 'portraits/helicoprion.puppet.png', 1200, 900)
    else:
        for name, w, h in [('helicoprion.select.png', 1600, 1200), ('helicoprion.card.png', 800, 600),
                           ('helicoprion.thumb.png', 256, 192), ('helicoprion.png', 1200, 900)]:
            render(HERE / 'portraits' / name, w, h)
    if '--portraits-only' in sys.argv:
        sys.exit(0)

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', .4), ('Swim', .8), ('Swim', 1.2), ('Sprint', 0),
          ('Sprint', .25), ('Sprint', .5), ('Sprint', .75), ('TurnLeft', .8), ('TurnRight', .8),
          ('Dive', .7), ('Rise', .7), ('Attack', .14), ('Attack', .4), ('Attack', .7),
          ('Bite', .25), ('Heavy', .15), ('Heavy', .55), ('Hit', .3), ('Death', 1.6),
          ('Guard', .5), ('Parry', .2), ('Dodge', .25), ('Eat', .4), ('Stagger', .6),
          ('Ability', .5), ('Grab', .55), ('Breath', 1.2), ('Growth', .75)]
for clip, t in PHASES:
    pose(clip, t)
    render(REVIEW / (clip + '-' + str(t) + '.png'))
for clip, t in [('Swim', 0), ('Swim', .4), ('Swim', .8), ('Swim', 1.2),
                ('Sprint', 0), ('Sprint', .25), ('Sprint', .5), ('Sprint', .75)]:
    pose(clip, t)
    render(REVIEW / (clip + '-' + str(t) + '-top.png'), 1000, 750, (0, 0, 8))
for name, loc in [('side', (7, 0, .1)), ('top', (0, 0, 8)), ('front', (0, -8, .1))]:
    pose('Idle', 0)
    render(REVIEW / (name + '.png'), 1000, 750, loc)
pose('Bite', .25)
render(REVIEW / 'mouth-Bite.png', 1000, 750, **MOUTH)
render(REVIEW / 'mouth-below-Bite.png', 1000, 750, **BELOW)
pose('Idle', 0)
render(REVIEW / 'mouth-Idle.png', 1000, 750, **MOUTH)
render(REVIEW / 'mouth-below-Idle.png', 1000, 750, **BELOW)
