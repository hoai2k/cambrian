"""Render and inspect the re-imported exported models: every clip, the portraits and the sheets."""
import bpy, os, sys
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]; OUT = ROOT / 'public/assets/triassic/creatures'
LOCAL = ROOT / 'local/triassic-authoring/dinocephalosaurus'; SUFFIX = '.puppet' if '--puppet' in sys.argv else ''
REVIEW = LOCAL / ('puppet-review' if SUFFIX else 'authored-review'); REVIEW.mkdir(parents=True, exist_ok=True)
POSED = '--posed' in sys.argv
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / 'dinocephalosaurus.posed.glb') if POSED else (
    (LOCAL / ('dinocephalosaurus' + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv
    else (OUT / ('dinocephalosaurus' + SUFFIX + '.glb')))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s = bpy.context.scene; s.render.fps = 30; s.render.engine = 'CYCLES'; s.cycles.samples = 16; s.cycles.use_denoising = True
s.render.resolution_percentage = 100; s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True; s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[1].default_value = .35
rig = next((o for o in s.objects if o.type == 'ARMATURE'), None)
if rig:
    for tr in rig.animation_data.nla_tracks: tr.mute = True
for loc, power in [((3, -5, 5), 1100), ((-3, -1, 3), 650), ((0, 4, 4), 1200), ((0, -5, -2), 260)]:
    bpy.ops.object.light_add(type='AREA', location=loc); o = bpy.context.object; o.data.energy = power; o.data.size = 5
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(); cam = bpy.context.object; s.camera = cam; cam.data.type = 'ORTHO'
# The body runs along -Y with the snout forward; it is not centred on the origin, so every camera
# aims at the middle of the animal rather than at (0,0,0).
MID = (0, -.85, -.35)


# `--only Eat,Grab` re-renders just those clips' frames. Every other clip's samples are identical
# across a rebuild that touched neither, so re-rendering the whole set to change two of them is
# forty minutes of CPU for nothing. It filters review frames only; the portraits ignore it.
ONLY = (sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
keep = lambda clip: ONLY is None or clip in ONLY


def pose(clip, t):
    a = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = a
    if a.slots: rig.animation_data.action_slot = a.slots[0]
    s.frame_set(round(t * 30))


def render(file, w=800, h=600, loc=(7.5, -5.5, 4.4), target=MID, scale=7.6):
    cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale; s.render.resolution_x = w; s.render.resolution_y = h; s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


# ---- the roster portraits ------------------------------------------------------------------------
# The portraits are framed off the subject rather than off a number typed for one body, because the
# two bodies this builder produces are not the same shape: the generated pose is the shorter and
# deeper of the two and a scale tuned to the straightened animal would sit it small in the corner.
# FILL is the fraction of the frame the animal's own projected bounds take up, which is what the
# rest of the Triassic roster is actually framed at -- Placodus fills 69.6 % of its card's width.
# Nearly side-on with the roster's elevation, rather than the three-quarter the review shots use.
# The generated pose throws the neck up and back in one plane, and the review camera looks straight
# down that plane, so from there the animal reads as a lump with its head foreshortened into its
# own shoulder. `--probe` renders this camera at six azimuths, which is how this one was picked.
PORTRAIT_LOC = (8.5, -1.2, 3.0)
FILL = .74


def portrait(file, w, h, loc=PORTRAIT_LOC):
    dg = bpy.context.evaluated_depsgraph_get(); pts = []
    for o in s.objects:
        if o.type != 'MESH': continue
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        pts.extend([o.matrix_world @ v.co for v in me.vertices]); ev.to_mesh_clear()
    mid = sum(pts, Vector()) / len(pts)
    cam.location = Vector(loc); cam.rotation_euler = (mid - cam.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()          # matrix_world is stale until this, and the first
    q = [cam.matrix_world.inverted() @ p for p in pts]   # portrait would then be framed off the last
    xs = [p.x for p in q]; ys = [p.y for p in q]
    ex = max(xs) - min(xs); ey = max(ys) - min(ys)
    # Re-centre exactly: the camera slides in its own plane by the residual, which for an
    # orthographic camera shifts the projection by the same amount and nothing else.
    cam.location = cam.location + cam.matrix_world.to_3x3() @ Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, 0))
    cam.data.ortho_scale = max(ex, ey * w / h) / FILL
    s.render.resolution_x = w; s.render.resolution_y = h; s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)
    print('PORTRAIT %s ortho=%.3f fills %.1f%% wide %.1f%% tall'
          % (file, cam.data.ortho_scale, 100 * ex / cam.data.ortho_scale, 100 * ey / (cam.data.ortho_scale * h / w)))


PORTRAITS = [('select.png', 1600, 1200), ('card.png', 800, 600), ('thumb.png', 256, 192), ('png', 1200, 900)]
if '--probe' in sys.argv:
    # Framing aid: the same portrait camera at several azimuths, small and cheap, so which side of
    # a posed animal actually reads is decided by looking rather than by arithmetic.
    for i, loc in enumerate([(7.5, -5.5, 4.4), (8.5, -1.2, 3.0), (8.0, -3.0, 3.6), (-8.0, -3.0, 3.6),
                             (6.0, 6.0, 4.0), (8.6, -2.0, 1.6)]):
        portrait(LOCAL / ('probe-%d.png' % i), 400, 300, loc)
    sys.exit(0)
if POSED:
    for suffix, w, h in PORTRAITS: portrait(OUT / ('dinocephalosaurus.' + suffix), w, h)
    sys.exit(0)


# Every clip in which the neck is supposed to be the actor, at the phases its performance turns on:
# the cock, the drive, the follow-through and the gather. This is the sheet the animal is judged on.
NECK = ([('NeckStrike', t) for t in [0., .28, .48, .64, .80, .96, 1.25]]
        + [('Attack', t) for t in [.16, .34, .52, .80]]
        + [('Heavy', t) for t in [.20, .44, .68, 1.00]]
        + [('Ability', t) for t in [.14, .34, .54, .84]]
        + [('Bite', t) for t in [.06, .20, .36]]
        + [('Eat', t) for t in [.26, .80, 1.35]]
        + [('Grab', t) for t in [.15, .50, .85]]
        + [('Dodge', t) for t in [.08, .26, .44]]
        + [('Periscope', t) for t in [.4, 1.6, 2.8]] + [('TurnLeft', .85), ('Guard', .6)])
if '--mouth-only' in sys.argv:
    for name, clip, t in [('mouth-closed', 'Idle', 0), ('mouth-Bite', 'Bite', .25), ('mouth-Attack', 'Attack', .14)]:
        pose(clip, t); render(REVIEW / (name + '.png'), 1000, 750, (3.2, -5.6, .9), (0, -3.35, -.05), 1.5)
    sys.exit(0)
if '--neck-only' in sys.argv:
    for clip, t in NECK:
        pose(clip, t); render(REVIEW / ('%s-%s-nside.png' % (clip, t)), 900, 620, (8, -.85, .2), (0, -.85, .1), 7.8)
        pose(clip, t); render(REVIEW / ('%s-%s-ntop.png' % (clip, t)), 640, 900, (0, -.85, 9), (0, -.85, 0), 8.0)
    sys.exit(0)
pose('Idle', 0)
if SUFFIX and '--review-only' not in sys.argv:
    render(OUT / 'dinocephalosaurus.puppet.png', 1200, 900)
    if '--portrait-only' in sys.argv: sys.exit(0)
# The four roster portraits are NOT rendered here: they come from the generated pose, through
# `--posed` above. This pass renders the straightened body that ships and performs.
if '--portrait-only' in sys.argv: sys.exit(0)
POSES = [('Idle', 0), ('Swim', 0), ('Swim', .5), ('Swim', 1.), ('Swim', 1.5), ('Sprint', 0), ('Sprint', .32), ('Sprint', .65), ('Sprint', .97),
         ('TurnLeft', .85), ('TurnRight', .85), ('Dive', .75), ('Rise', .75), ('Attack', .14), ('Attack', .45), ('Attack', .8), ('Bite', .25),
         ('Heavy', .18), ('Heavy', .5), ('Heavy', .9), ('Hit', .3), ('Death', 1.8), ('Guard', .6), ('Parry', .2), ('Dodge', .25), ('Eat', .45),
         ('Stagger', .6), ('Ability', .2), ('Ability', .45), ('Ability', .8), ('Grab', .55), ('Breath', 1.2), ('Growth', .75),
         ('NeckStrike', .2), ('NeckStrike', .55), ('NeckStrike', .9), ('NeckStrike', 1.25),
         ('Periscope', .4), ('Periscope', 1.6), ('Periscope', 2.8), ('Breathe', .9), ('Breathe', 2.1)]
for clip, t in POSES:
    if not keep(clip): continue
    pose(clip, t); render(REVIEW / ('%s-%s.png' % (clip, t)))
for name, loc, tgt, scale, w, h in ([] if ONLY else [('side', (8, -.85, .1), (0, -.85, -.35), 7.6, 1000, 750),
                                    ('top', (0, -.85, 9), (0, -.85, 0), 8.0, 640, 900),
                                    ('front', (0, -9.5, -.35), (0, -.85, -.35), 2.8, 1000, 750),
                                    ('belly', (0, -.85, -9), (0, -.85, 0), 8.0, 640, 900)]):
    pose('Idle', 0); render(REVIEW / (name + '.png'), w, h, loc, tgt, scale)
MOUTH = [('mouth-closed', 'Idle', 0), ('mouth-Bite', 'Bite', .25), ('mouth-Attack', 'Attack', .14)]
for name, clip, t in MOUTH:
    if not keep(clip): continue
    pose(clip, t); render(REVIEW / (name + '.png'), 1000, 750, (3.2, -5.6, .9), (0, -3.35, -.05), 1.5)
for clip, t in NECK:
    if not keep(clip): continue
    pose(clip, t); render(REVIEW / ('%s-%s-nside.png' % (clip, t)), 900, 620, (8, -.85, .2), (0, -.85, .1), 7.8)
    pose(clip, t); render(REVIEW / ('%s-%s-ntop.png' % (clip, t)), 640, 900, (0, -.85, 9), (0, -.85, 0), 8.0)
