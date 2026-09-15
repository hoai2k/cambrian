"""Render the exported Hybodus: every clip at chosen phases, the diagnostic views and the portraits,
from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/hybodus/render.py \
      -- [--decoded] [--twin] [--portraits-only] [--mouth-only]

Headless Blender has no GL context, so this uses Cycles on the CPU; the Workbench engine needs EGL
and will fail. Portraits are written into this directory's `portraits/`, not into `public/assets/`:
until a human decides this body ships, the roster's placeholder cards stay where they are.

CYCLES ignores `use_backface_culling`, so the mouth views emulate it -- backfacing shading points go
transparent. Without that a review render shows the near wall of the lining that the runtime throws
away, and cannot be used to judge either the lining or the gape.
"""
import bpy, os, sys
from mathutils import Vector
from math import pi
from pathlib import Path

ID = 'hybodus'
ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'public/assets/triassic/creatures'
HERE = Path(__file__).resolve().parent
LOCAL = ROOT / 'local/triassic-authoring' / ID
TWIN = '--twin' in sys.argv
SUFFIX = '.puppet' if TWIN else ''
REVIEW = LOCAL / ('twin-review' if TWIN else 'authored-review')
REVIEW.mkdir(parents=True, exist_ok=True)
(HERE / 'portraits').mkdir(exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / (ID + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv else (OUT / (ID + SUFFIX + '.glb'))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))

s = bpy.context.scene
s.render.fps = 30
s.render.engine = 'CYCLES'
s.cycles.device = 'CPU'
s.cycles.samples = 16
s.cycles.use_denoising = True
s.render.resolution_percentage = 100
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs[1].default_value = .35

# Emulate the runtime's backface culling, which CYCLES ignores.
for m in bpy.data.materials:
    if not m.use_nodes or not m.use_backface_culling:
        continue
    nt = m.node_tree
    out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not out or not bsdf:
        continue
    geo = nt.nodes.new('ShaderNodeNewGeometry')
    trans = nt.nodes.new('ShaderNodeBsdfTransparent')
    mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(geo.outputs['Backfacing'], mix.inputs[0])
    nt.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
    nt.links.new(trans.outputs['BSDF'], mix.inputs[2])
    nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])

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


def render(file, w=760, h=560, loc=(7, -5, 4.2), target=(0, 0, 0), scale=6.6, rot=None):
    cam.location = loc
    # A camera tracked with +Y up stands the animal on end, and at this scale the frame then cuts
    # the head and the tail off. The plan views pass their own rotation so the body lies across it.
    cam.rotation_euler = rot if rot else (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    s.render.resolution_x = w
    s.render.resolution_y = h
    s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


# The head sits at Blender -Y once the glTF +Z-forward body is imported.
# Aimed at the mouth, which on a shark is *under* the snout and a long way in front of where these
# cameras first pointed: at a target 2.25 units out and a camera level with the rostrum, the sheet
# was a tight crop of the top of the snout with the gape hidden beneath it. The mouth line sits
# around 2.75 units forward on this 6.28-unit body, so the side camera drops below the jaw and all
# three pull back enough to hold the whole head.
MOUTH = dict(loc=(2.6, -3.9, -1.3), target=(0, -2.75, -.20), scale=2.3)
BELOW = dict(loc=(.3, -3.1, -3.2), target=(0, -2.75, -.20), scale=2.3)
FRONT = dict(loc=(0, -5.6, -.7), target=(0, -2.75, -.20), scale=2.3)

if '--mouth-only' in sys.argv:
    for clip, t in [('Idle', 0), ('Bite', .25), ('Attack', .43), ('Heavy', .50)]:
        pose(clip, t)
        render(REVIEW / ('mouth-%s-%s.png' % (clip, t)), 900, 700, **MOUTH)
        render(REVIEW / ('mouth-front-%s-%s.png' % (clip, t)), 900, 700, **FRONT)
        render(REVIEW / ('mouth-below-%s-%s.png' % (clip, t)), 900, 700, **BELOW)
    sys.exit(0)

pose('Idle', 0)
if '--tops-only' not in sys.argv and ('--portraits-only' in sys.argv or '--review-only' not in sys.argv):
    if TWIN:
        render(HERE / ('portraits/%s.puppet.png' % ID), 1200, 900)
    else:
        for name, w, h in [('%s.select.png' % ID, 1600, 1200), ('%s.card.png' % ID, 800, 600),
                           ('%s.thumb.png' % ID, 256, 192), ('%s.png' % ID, 1200, 900)]:
            render(HERE / 'portraits' / name, w, h)
    if '--portraits-only' in sys.argv:
        sys.exit(0)

if '--tops-only' in sys.argv:
    TOPS_ONLY = True
else:
    TOPS_ONLY = False

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', .45), ('Swim', .9), ('Swim', 1.35), ('Sprint', 0),
          ('Sprint', .27), ('Sprint', .55), ('Sprint', .82), ('TurnLeft', .8), ('TurnRight', .8),
          ('Dive', .7), ('Rise', .7), ('Attack', .12), ('Attack', .43), ('Attack', .72),
          ('Bite', .17), ('Heavy', .18), ('Heavy', .5), ('Heavy', .85), ('Hit', .3), ('Death', 1.8),
          ('Guard', .6), ('Parry', .2), ('Dodge', .25), ('Eat', .4), ('Stagger', .6),
          ('Ability', .5), ('Grab', .55), ('Breath', 1.2), ('Growth', .75),
          ('Shake', .2), ('Shake', .5), ('Shake', .8), ('SpineBrace', .6)]
for clip, t in ([] if TOPS_ONLY else PHASES):
    pose(clip, t)
    render(REVIEW / (clip + '-' + str(t) + '.png'))
TOP = dict(w=1000, h=520, loc=(0, 0, 8), scale=6.9, rot=(0, 0, -pi / 2))
for clip, t in [('Swim', 0), ('Swim', .45), ('Swim', .9), ('Swim', 1.35),
                ('Sprint', 0), ('Sprint', .27), ('Sprint', .55), ('Sprint', .82),
                ('Attack', .12), ('Attack', .43), ('Attack', .72)]:
    pose(clip, t)
    render(REVIEW / (clip + '-' + str(t) + '-top.png'), **TOP)
pose('Idle', 0)
render(REVIEW / 'side.png', 1000, 520, (7, 0, .1), scale=6.9, rot=(pi / 2, 0, pi / 2))
render(REVIEW / 'top.png', **TOP)
render(REVIEW / 'front.png', 620, 620, (0, -8, .1), scale=2.6)
for clip, t in ([] if TOPS_ONLY else [('Idle', 0), ('Bite', .25), ('Attack', .43), ('Heavy', .5)]):
    pose(clip, t)
    render(REVIEW / ('mouth-%s-%s.png' % (clip, t)), 900, 700, **MOUTH)
    render(REVIEW / ('mouth-front-%s-%s.png' % (clip, t)), 900, 700, **FRONT)
