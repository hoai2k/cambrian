"""Render and inspect the re-imported exported models: every clip, the portraits and the sheets."""
import bpy, os, sys
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]; OUT = ROOT / 'public/assets/triassic/creatures'
LOCAL = ROOT / 'local/triassic-authoring/dinocephalosaurus'; SUFFIX = '.puppet' if '--puppet' in sys.argv else ''
REVIEW = LOCAL / ('puppet-review' if SUFFIX else 'authored-review'); REVIEW.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / ('dinocephalosaurus' + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv else (OUT / ('dinocephalosaurus' + SUFFIX + '.glb'))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s = bpy.context.scene; s.render.fps = 30; s.render.engine = 'CYCLES'; s.cycles.samples = 16; s.cycles.use_denoising = True
s.render.resolution_percentage = 100; s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True; s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[1].default_value = .35
rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks: tr.mute = True
for loc, power in [((3, -5, 5), 1100), ((-3, -1, 3), 650), ((0, 4, 4), 1200), ((0, -5, -2), 260)]:
    bpy.ops.object.light_add(type='AREA', location=loc); o = bpy.context.object; o.data.energy = power; o.data.size = 5
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(); cam = bpy.context.object; s.camera = cam; cam.data.type = 'ORTHO'
# The body runs along -Y with the snout forward; it is not centred on the origin, so every camera
# aims at the middle of the animal rather than at (0,0,0).
MID = (0, -.85, -.35)


def pose(clip, t):
    a = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = a
    if a.slots: rig.animation_data.action_slot = a.slots[0]
    s.frame_set(round(t * 30))


def render(file, w=800, h=600, loc=(7.5, -5.5, 4.4), target=MID, scale=7.6):
    cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale; s.render.resolution_x = w; s.render.resolution_y = h; s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


NECK = ([('NeckStrike', t) for t in [0., .2, .4, .55, .7, .9, 1.2]]
        + [('Periscope', t) for t in [.4, 1.6, 2.8]] + [('TurnLeft', .85), ('Guard', .6)])
if '--neck-only' in sys.argv:
    for clip, t in NECK:
        pose(clip, t); render(REVIEW / ('%s-%s-nside.png' % (clip, t)), 900, 620, (8, -.85, .2), (0, -.85, .1), 7.8)
        pose(clip, t); render(REVIEW / ('%s-%s-ntop.png' % (clip, t)), 640, 900, (0, -.85, 9), (0, -.85, 0), 8.0)
    sys.exit(0)
pose('Idle', 0)
if SUFFIX and '--review-only' not in sys.argv:
    render(OUT / 'dinocephalosaurus.puppet.png', 1200, 900)
    if '--portrait-only' in sys.argv: sys.exit(0)
if not SUFFIX and '--review-only' not in sys.argv:
    for suffix, w, h in [('select.png', 1600, 1200), ('card.png', 800, 600), ('thumb.png', 256, 192), ('png', 1200, 900)]:
        render(OUT / ('dinocephalosaurus.' + suffix), w, h)
    if '--portrait-only' in sys.argv: sys.exit(0)
POSES = [('Idle', 0), ('Swim', 0), ('Swim', .5), ('Swim', 1.), ('Swim', 1.5), ('Sprint', 0), ('Sprint', .32), ('Sprint', .65), ('Sprint', .97),
         ('TurnLeft', .85), ('TurnRight', .85), ('Dive', .75), ('Rise', .75), ('Attack', .14), ('Attack', .45), ('Attack', .8), ('Bite', .25),
         ('Heavy', .18), ('Heavy', .5), ('Heavy', .9), ('Hit', .3), ('Death', 1.8), ('Guard', .6), ('Parry', .2), ('Dodge', .25), ('Eat', .45),
         ('Stagger', .6), ('Ability', .2), ('Ability', .45), ('Ability', .8), ('Grab', .55), ('Breath', 1.2), ('Growth', .75),
         ('NeckStrike', .2), ('NeckStrike', .55), ('NeckStrike', .9), ('NeckStrike', 1.25),
         ('Periscope', .4), ('Periscope', 1.6), ('Periscope', 2.8), ('Breathe', .9), ('Breathe', 2.1)]
for clip, t in POSES:
    pose(clip, t); render(REVIEW / ('%s-%s.png' % (clip, t)))
for name, loc, tgt, scale, w, h in [('side', (8, -.85, .1), (0, -.85, -.35), 7.6, 1000, 750),
                                    ('top', (0, -.85, 9), (0, -.85, 0), 8.0, 640, 900),
                                    ('front', (0, -9.5, -.35), (0, -.85, -.35), 2.8, 1000, 750),
                                    ('belly', (0, -.85, -9), (0, -.85, 0), 8.0, 640, 900)]:
    pose('Idle', 0); render(REVIEW / (name + '.png'), w, h, loc, tgt, scale)
for name, clip, t in [('mouth-closed', 'Idle', 0), ('mouth-Bite', 'Bite', .25), ('mouth-NeckStrike', 'NeckStrike', .55)]:
    pose(clip, t); render(REVIEW / (name + '.png'), 1000, 750, (3.2, -5.6, .9), (0, -3.35, -.05), 1.5)
for clip, t in NECK:
    pose(clip, t); render(REVIEW / ('%s-%s-nside.png' % (clip, t)), 900, 620, (8, -.85, .2), (0, -.85, .1), 7.8)
    pose(clip, t); render(REVIEW / ('%s-%s-ntop.png' % (clip, t)), 640, 900, (0, -.85, 9), (0, -.85, 0), 8.0)
