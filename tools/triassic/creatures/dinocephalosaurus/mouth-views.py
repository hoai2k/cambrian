"""Render the head mid-gape and measure how much of the aperture is see-through.

    /opt/blender/blender --background --factory-startup --python .../mouth-views.py -- <outdir>

Reads the decoded review GLB that `audit.mjs --decode` writes, so what is judged is the packaged
delivery rather than the scene the builder happens to hold.

A gape is meant to show the inside of a mouth. The measurement is made on the true side view: for
every column of pixels, anything transparent that lies *between* the topmost and bottommost opaque
pixel of the head is a hole straight through the animal. Placodus was 20.4 % see-through by its own
measure before its lining was fixed and 0.2 % after.
"""
import bpy, os, sys, json
from mathutils import Vector
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
LOCAL = ROOT / 'local/triassic-authoring/dinocephalosaurus'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUTDIR = Path(argv[0]); OUTDIR.mkdir(parents=True, exist_ok=True)
SUFFIX = '.puppet' if '--puppet' in argv else ''
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(LOCAL / ('dinocephalosaurus' + SUFFIX + '.unpacked.glb')))
s = bpy.context.scene; s.render.fps = 30; s.render.engine = 'CYCLES'; s.cycles.samples = 48; s.cycles.use_denoising = True
s.render.resolution_percentage = 100; s.render.image_settings.file_format = 'PNG'; s.render.image_settings.color_mode = 'RGBA'
s.render.film_transparent = True; s.view_settings.view_transform = 'AgX'
s.world.use_nodes = True; s.world.node_tree.nodes['Background'].inputs[1].default_value = .35


# CYCLES ignores `use_backface_culling`, so a review render of a single-sided material shows the
# near wall the runtime throws away. Emulate the cull, so a sheet shows what a player sees.
def cull_backfaces():
    for m in bpy.data.materials:
        if not m.use_nodes or not m.use_backface_culling: continue
        nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        link = next((l for l in nt.links if l.to_node == out and l.to_socket.name == 'Surface'), None)
        if not link: continue
        src = link.from_socket; nt.links.remove(link)
        geo = nt.nodes.new('ShaderNodeNewGeometry'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
        nt.links.new(src, mix.inputs[1]); nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])


cull_backfaces()
rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks: tr.mute = True
for loc, power in [((3, -5, 5), 1000), ((-3, -1, 3), 600), ((0, 4, 4), 1100), ((0, -5, -2), 230)]:
    bpy.ops.object.light_add(type='AREA'); o = bpy.context.object; o.location = loc; o.data.energy = power; o.data.size = 5
    o.rotation_euler = (Vector((0, -3.35, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(); cam = bpy.context.object; s.camera = cam; cam.data.type = 'ORTHO'
TGT = (0, -3.35, -.05)
W, H = 900, 720
VIEWS = [('quarter', (2.0, -4.9, .8), 1.5), ('front', (0, -5.6, .10), 1.2), ('side', (4.2, -3.35, -.05), 1.5)]
SHOTS = [('Bite', .25), ('Attack', .14), ('NeckStrike', .52), ('Idle', 0.)]


def pose(clip, t):
    a = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = a
    if a.slots: rig.animation_data.action_slot = a.slots[0]
    s.frame_set(round(t * 30))


def render(file, loc, target, scale, w=W, h=H):
    cam.location = loc; cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale; s.render.resolution_x = w; s.render.resolution_y = h; s.render.filepath = str(file)
    bpy.ops.render.render(write_still=True)
    return file


def seethrough(path, w=W, h=H):
    """Transparent pixels enclosed by the head's own silhouette, column by column."""
    im = bpy.data.images.load(str(path)); px = list(im.pixels)
    hole = 0; enclosed = 0
    for x in range(w):
        col = [px[4 * (y * w + x) + 3] for y in range(h)]
        ys = [y for y, a in enumerate(col) if a > .5]
        if len(ys) < 2: continue
        for y in range(ys[0], ys[-1] + 1):
            enclosed += 1
            if col[y] <= .5: hole += 1
    bpy.data.images.remove(im)
    return hole, enclosed


out = {}
for clip, t in SHOTS:
    for name, loc, scale in VIEWS:
        pose(clip, t); f = render(OUTDIR / ('%s-%s-%s%s.png' % (clip, t, name, SUFFIX)), loc, TGT, scale)
        if name == 'side':
            hole, enclosed = seethrough(f)
            out['%s %.2f' % (clip, t)] = {'holePixels': hole, 'enclosedPixels': enclosed,
                                          'seeThroughPercent': round(100. * hole / max(1, enclosed), 2)}
print('MOUTH_SEETHROUGH', json.dumps(out))
