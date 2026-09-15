"""Render and inspect the re-imported exported models: the portraits and the review sheets.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/henodus/render.py
  ... --python tools/triassic/creatures/henodus/render.py -- --puppet --decoded

CYCLES on CPU: EEVEE and Workbench want EGL, which this container does not have.
"""
import bpy, os, sys
from mathutils import Vector
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]; OUT = ROOT / 'public/assets/triassic/creatures'
LOCAL = ROOT / 'local/triassic-authoring/henodus'; SUFFIX = '.puppet' if '--puppet' in sys.argv else ''
REVIEW = LOCAL / ('puppet-review' if SUFFIX else 'authored-review'); REVIEW.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
SOURCE = (LOCAL / ('henodus' + SUFFIX + '.unpacked.glb')) if '--decoded' in sys.argv else (OUT / ('henodus' + SUFFIX + '.glb'))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s = bpy.context.scene; s.render.fps = 30; s.render.engine = 'CYCLES'; s.cycles.samples = 16; s.cycles.use_denoising = True
s.render.resolution_percentage = 100; s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True; s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[1].default_value = .35
# CYCLES ignores `use_backface_culling`, so a review render would show the near wall of the mouth
# lining that the runtime throws away. Emulate the cull, so a sheet shows what a player sees.
for m in bpy.data.materials:
    if not m.use_nodes or not m.use_backface_culling: continue
    nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
    link = next((l for l in nt.links if l.to_node == out and l.to_socket.name == 'Surface'), None)
    if link:
        src = link.from_socket; nt.links.remove(link)
        geo = nt.nodes.new('ShaderNodeNewGeometry'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
        nt.links.new(src, mix.inputs[1]); nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks: tr.mute = True
for loc, power in [((3, -5, 5), 1000), ((-3, -1, 3), 600), ((0, 4, 4), 1100), ((0, -5, -2), 230)]:
    bpy.ops.object.light_add(type='AREA', location=loc); o = bpy.context.object; o.data.energy = power; o.data.size = 5
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(); cam = bpy.context.object; s.camera = cam; cam.data.type = 'ORTHO'


def pose(clip, t):
    a = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = a
    if a.slots: rig.animation_data.action_slot = a.slots[0]
    s.frame_set(round(t * 30))


def render(file, w=800, h=600, loc=(6, -4.4, 3.4), target=(0, 0, 0), scale=6.0):
    cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale; s.render.resolution_x = w; s.render.resolution_y = h; s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)


pose('Idle', 0)
if SUFFIX and '--review-only' not in sys.argv:
    render(OUT / 'henodus.puppet.png', 1200, 900)
    if '--portrait-only' in sys.argv: sys.exit(0)
if not SUFFIX and '--review-only' not in sys.argv:
    for suffix, w, h in [('select.png', 1600, 1200), ('card.png', 800, 600), ('thumb.png', 256, 192), ('png', 1200, 900)]:
        render(OUT / ('henodus.' + suffix), w, h)
    if '--portrait-only' in sys.argv: sys.exit(0)
MOUTH = [('mouth-closed', 'Idle', 0), ('mouth-Bite', 'Bite', .25), ('mouth-Graze', 'Graze', .6)]
if '--mouth-only' in sys.argv:
    for name, clip, t in MOUTH:
        pose(clip, t); render(REVIEW / (name + '.png'), 1000, 750, (3.6, -3.6, .7), (0, -2.0, -.16), 1.7)
    sys.exit(0)
POSES = [('Idle', 0), ('Swim', 0), ('Swim', .5), ('Swim', 1.), ('Swim', 1.5), ('Sprint', 0), ('Sprint', .33), ('Sprint', .65),
         ('TurnLeft', .8), ('TurnRight', .8), ('Dive', .7), ('Rise', .7), ('Attack', .14), ('Attack', .45),
         ('Bite', .25), ('Heavy', .15), ('Heavy', .45), ('Hit', .3), ('Death', 1.6), ('Guard', .5), ('Parry', .2),
         ('Dodge', .25), ('Eat', .4), ('Stagger', .6), ('Ability', .45), ('Grab', .6), ('Breath', 1.2), ('Growth', .75),
         ('Crawl', .1), ('Crawl', .5), ('Crawl', 1.), ('Crawl', 1.5), ('Graze', .6), ('Graze', 1.8),
         ('Breathe', .9), ('Breathe', 2.1)]
for clip, t in POSES:
    pose(clip, t); render(REVIEW / ('%s-%s.png' % (clip, t)))
for name, loc, tgt, scale in [('side', (7, 0, .1), (0, 0, 0), 6.0), ('top', (0, 0, 8), (0, 0, 0), 6.0),
                              ('front', (0, -8, .9), (0, 0, .1), 3.6), ('belly', (0, 0, -8), (0, 0, 0), 6.0)]:
    pose('Idle', 0); render(REVIEW / (name + '.png'), 1000, 750, loc, tgt, scale)
for name, clip, t in MOUTH:
    pose(clip, t); render(REVIEW / (name + '.png'), 1000, 750, (3.6, -3.6, .7), (0, -2.0, -.16), 1.7)
