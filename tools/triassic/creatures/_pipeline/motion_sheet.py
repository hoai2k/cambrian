"""Render one clip through its cycle, from one or more fixed views, as a contact sheet.

The per-creature `render.py` files each carry a hand-picked pose list, which is the right thing for
a delivery review and the wrong thing for looking at a *motion* fault: a waddle, a wave running the
wrong way down a body or an attack that retreats is a question about the cycle, and the answer is
the cycle sampled evenly from the view the fault shows in.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/_pipeline/motion_sheet.py -- \
      --glb public/assets/triassic/creatures/keichousaurus.glb --clip Swim --views side,top --frames 8 \
      --out local/triassic-authoring/keichousaurus/swim-sheet.jpg

CYCLES on CPU: EEVEE and Workbench want EGL, which this container does not have.

Views are named in the creature's own frame after the glTF import (Blender +X the creature's left,
+Y behind it, +Z up): `side` looks in from the animal's left, `top` from above, `front` from the
snout, `quarter` from above its left shoulder. `--scale` is the orthographic width in world units
and defaults to the body's own measured size with a margin.
"""
import bpy, os, sys, subprocess, json, math
from mathutils import Vector, Quaternion
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def opt(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


ROOT = Path(__file__).resolve().parents[4]
GLB = Path(opt('--glb'))
if not GLB.is_absolute():
    GLB = ROOT / GLB
CLIP = opt('--clip')
VIEWS = opt('--views', 'side').split(',')
FRAMES = int(opt('--frames', '8'))
OUT = Path(opt('--out'))
if not OUT.is_absolute():
    OUT = ROOT / OUT
OUT.parent.mkdir(parents=True, exist_ok=True)
CELL_W, CELL_H = int(opt('--width', '420')), int(opt('--height', '320'))
SAMPLES = int(opt('--samples', '16'))

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(GLB))
s = bpy.context.scene; s.render.fps = 30; s.render.engine = 'CYCLES'; s.cycles.samples = SAMPLES
s.cycles.use_denoising = True
s.render.resolution_percentage = 100; s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGBA'; s.render.film_transparent = True
s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[1].default_value = .35
# CYCLES ignores `use_backface_culling`, so a review render would show the near wall of any mouth
# lining the runtime throws away. Emulate the cull, so a sheet shows what a player sees.
for m in bpy.data.materials:
    if not m.use_nodes or not m.use_backface_culling:
        continue
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
if rig.animation_data:
    for tr in rig.animation_data.nla_tracks:
        tr.mute = True
for loc, power in [((3, -5, 5), 1000), ((-3, -1, 3), 600), ((0, 4, 4), 1100), ((0, -5, -2), 230)]:
    bpy.ops.object.light_add(type='AREA', location=loc); o = bpy.context.object
    o.data.energy = power; o.data.size = 5
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(); cam = bpy.context.object; s.camera = cam; cam.data.type = 'ORTHO'

action = next(a for a in bpy.data.actions
              if a.name == CLIP or a.name.endswith('_' + CLIP) or a.name.endswith('|' + CLIP))
rig.animation_data.action = action
if action.slots:
    rig.animation_data.action_slot = action.slots[0]
LAST = int(round(max(action.frame_range)))

lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
for o in s.objects:
    if o.type != 'MESH':
        continue
    for c in o.bound_box:
        w = o.matrix_world @ Vector(c)
        lo = Vector((min(lo[i], w[i]) for i in range(3))); hi = Vector((max(hi[i], w[i]) for i in range(3)))
centre = (lo + hi) / 2
span = max(hi[i] - lo[i] for i in range(3))
SCALE = float(opt('--scale', str(span * 1.25)))
R = span * 3

VIEW_DIR = {'side': Vector((1, 0, .02)), 'top': Vector((0, 0, 1)), 'front': Vector((0, -1, .12)),
            'belly': Vector((0, 0, -1)), 'quarter': Vector((1, -.9, .55))}

# Frames go to the gitignored workbench whatever the sheet's own destination is: a sheet
# belongs beside the builder that it reviews, and a hundred loose PNGs do not.
tmp = ROOT / 'local/triassic-authoring/_motion-sheets' / (GLB.stem + '-' + OUT.stem)
tmp.mkdir(parents=True, exist_ok=True)
tiles = []
for view in VIEWS:
    d = VIEW_DIR[view].normalized()
    cam.location = centre + d * R
    # 'Y' is the camera's own up axis, not the world's: `to_track_quat` names a *local* axis, and
    # asking for 'Z' points the camera's back out of the scene and rolls the view on its side.
    q = (centre - cam.location).to_track_quat('-Z', 'Y')
    # Looking straight down or up, the body runs up the frame; roll a quarter turn so it lies along
    # the tile the way it does in the side view, which is what makes a row of them readable.
    if view in ('top', 'belly'):
        q = q @ Quaternion((0, 0, 1), math.pi / 2)
    cam.rotation_euler = q.to_euler()
    cam.data.ortho_scale = SCALE
    s.render.resolution_x, s.render.resolution_y = CELL_W, CELL_H
    for i in range(FRAMES):
        f = round(LAST * i / FRAMES)
        s.frame_set(f)
        name = '%s-%s-%02d' % (CLIP, view, i)
        s.render.filepath = str(tmp / name)
        bpy.ops.render.render(write_still=True)
        tiles.append({'file': str(tmp / (name + '.png')), 'label': '%s %s u=%.2f' % (CLIP, view, i / FRAMES)})

plan = {'tiles': tiles, 'out': str(OUT), 'cols': FRAMES, 'cell': [CELL_W, CELL_H],
        'title': '%s  %s  (%d frames, %s)' % (GLB.name, CLIP, FRAMES, '/'.join(VIEWS))}
spec = tmp / 'plan.json'
spec.write_text(json.dumps(plan))
# The tiling half runs on the system interpreter: Blender's bundled Python has no PIL.
subprocess.run(['python3', str(Path(__file__).resolve().parent / 'tile_sheet.py'), str(spec)], check=True)
print('wrote', OUT)
