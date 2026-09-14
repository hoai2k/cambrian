"""Photograph the gape at the phase each clip opens it widest and prove it is a mouth, not a hole.

  /opt/blender/blender -b --factory-startup --python <this file> -- <outdir>

The proof is a **saturated backdrop**, not a transparent film. An alpha film measures the backdrop
rather than the gape: every pixel the animal does not cover is transparent whether it is beside the
head or straight through it, so the count depends on the framing and passes regardless. Against a
magenta world nothing in the animal is magenta, so a magenta pixel *enclosed by the silhouette* is a
hole through the body and nothing else is.

And it is rendered twice, with and without the backface-cull shim. The runtime culls backfaces and
CYCLES does not, so a lining that is wound the wrong way looks solid in a review render and is a
window in play: the two images agree only when there is nothing to see through. The difference
between them is reported as well as the hole count -- on the first build of this body, wound the
other way round, the gape read 0.8 % with the shim and 0.0 % without it, and the shim was right.

Writes `mouth-seethrough.json` beside this file and the frames into <outdir>.
"""
import bpy, os, sys, json
import numpy as np
from mathutils import Vector
from pathlib import Path

ID = 'hybodus'
ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
LOCAL = ROOT / 'local/triassic-authoring' / ID
argv = sys.argv[sys.argv.index('--') + 1:]
OUTDIR = Path(argv[0]) if argv else (LOCAL / 'mouth')
OUTDIR.mkdir(parents=True, exist_ok=True)
SOURCE = LOCAL / (ID + '.unpacked.glb')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s = bpy.context.scene
s.render.fps = 30
s.render.engine = 'CYCLES'
s.cycles.device = 'CPU'
s.cycles.samples = 12
s.cycles.use_denoising = False
s.render.image_settings.file_format = 'PNG'
s.render.image_settings.color_mode = 'RGBA'
s.view_settings.view_transform = 'Standard'
s.world.use_nodes = True
s.world.node_tree.nodes['Background'].inputs[1].default_value = .35

BACKDROP = (1., 0., 1.)          # magenta: nothing on the animal is anywhere near it
# The backdrop is composited in rather than lit: a magenta world lights the animal magenta, and
# then the animal's own skin is the backdrop's colour and the measurement means nothing. The film
# stays transparent, the frame is saved over magenta so a reviewer sees a saturated backdrop, and
# a hole is a pixel of that backdrop enclosed by the silhouette.
s.render.film_transparent = True


def shim(on):
    """Emulate the runtime's backface cull, which CYCLES ignores: backfacing shading points go
    transparent. Removable, because the point is to render the same frame both ways."""
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        mix = next((n for n in nt.nodes if n.type == 'MIX_SHADER' and n.name.startswith('CullShim')), None)
        if not out or not bsdf:
            continue
        if on and not m.use_backface_culling:
            continue
        if on and mix is None:
            geo = nt.nodes.new('ShaderNodeNewGeometry')
            trans = nt.nodes.new('ShaderNodeBsdfTransparent')
            mix = nt.nodes.new('ShaderNodeMixShader')
            mix.name = 'CullShim'
            nt.links.new(geo.outputs['Backfacing'], mix.inputs[0])
            nt.links.new(bsdf.outputs['BSDF'], mix.inputs[1])
            nt.links.new(trans.outputs['BSDF'], mix.inputs[2])
            nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])
        elif not on and mix is not None:
            nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

rig = next(o for o in s.objects if o.type == 'ARMATURE')
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
for loc, power in [((3, -5, 5), 900), ((-3, -1, 3), 500), ((0, 4, 4), 900)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    o = bpy.context.object
    o.data.energy = power
    o.data.size = 5
    o.rotation_euler = (Vector((0, 0, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
s.camera = cam
cam.data.type = 'ORTHO'
skull = rig.pose.bones['skull']
mouth_socket = next(o for o in s.objects if o.name.startswith('anchor_mouth') and o.name.endswith('mouth'))
jaw = rig.pose.bones['jaw']

meta = json.load(open(ROOT / 'public/assets/triassic/creatures' / (ID + '.json')))
CLIPS = meta['clips']


def action(clip):
    return next(a for a in bpy.data.actions
                if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))


def widest(clip):
    """The phase the clip's own gape is widest at, which is the aperture worth measuring."""
    a = action(clip)
    rig.animation_data.action = a
    if a.slots:
        rig.animation_data.action_slot = a.slots[0]
    best, at = -1e9, 0
    frames = int(round(a.frame_range[1]))
    for f in range(frames + 1):
        s.frame_set(f)
        q = jaw.rotation_quaternion if jaw.rotation_mode == 'QUATERNION' else jaw.rotation_euler.to_quaternion()
        ang = 2 * np.arctan2(q.x, q.w)
        if ang > best:
            best, at = ang, f
    s.frame_set(at)
    return at, float(best)


def render(path, w=800, h=620):
    # Framed in the skull's own frame rather than the world's: the head is thrown about by the
    # clips, and a camera held level to the world photographs whatever happens to be in front of it.
    # Framed on the mouth itself, not on the animal: with the whole head in frame the gap between a
    # pectoral fin and the flank is counted as a hole through the body and the measurement carries a
    # floor of about 0.9 % that has nothing to do with the gape.
    # Framed in the *skull's* frame, not the jaw's: the mouth socket rides the jaw, so a camera
    # hung on it follows the gape down and photographs the underside of the head.
    centre = (rig.matrix_world @ skull.matrix).translation - Vector((0, .34, .02))
    cam.location = centre + Vector((2.0, -.55, .16))
    cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = 1.15
    s.render.resolution_x, s.render.resolution_y = w, h
    s.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(str(path))
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(img)
    # Save it again over the saturated backdrop, which is what a reviewer looks at.
    comp = px.copy()
    al = comp[:, :, 3:4]
    comp[:, :, :3] = comp[:, :, :3] * al + np.array(BACKDROP, dtype=np.float32) * (1 - al)
    comp[:, :, 3] = 1.
    out = bpy.data.images.new('composited', width=w, height=h, alpha=True)
    out.pixels = comp.reshape(-1).tolist()
    out.filepath_raw = str(path)
    out.file_format = 'PNG'
    out.save()
    bpy.data.images.remove(out)
    return px



def see_through(px):
    """A backdrop pixel enclosed by the animal is a hole straight through it. Enclosure is per
    column: between the topmost and bottommost pixel of the column that is not the backdrop."""
    solid = px[:, :, 3] > .5
    holes = 0
    span = 0
    for x in range(solid.shape[1]):
        col = np.nonzero(solid[:, x])[0]
        if len(col) < 2:
            continue
        lo, hi = col[0], col[-1]
        span += hi - lo + 1
        holes += (hi - lo + 1) - len(col)
    return holes, span


rows = []
for clip in CLIPS:
    at, ang = widest(clip)
    shim(True)
    px = render(OUTDIR / ('%s-widest.png' % clip))
    holes, span = see_through(px)
    shim(False)
    plain = render(OUTDIR / ('%s-widest-nocull.png' % clip))
    holes2, span2 = see_through(plain)
    diff = float(np.abs(px[:, :, :3] - plain[:, :, :3]).mean())
    rows.append({'clip': clip, 'frame': at, 'jawRadians': round(ang, 4),
                 'holePixels': int(holes), 'silhouettePixels': int(span),
                 'seeThroughPercent': round(100. * holes / max(1, span), 3),
                 'seeThroughPercentWithoutTheCullShim': round(100. * holes2 / max(1, span2), 3),
                 'meanImageDifferenceCulledVsNot': round(diff, 4)})
    print('MOUTH %s frame %d gape %.3f rad see-through %.3f %% (no shim %.3f %%, image diff %.4f)'
          % (clip, at, ang, 100. * holes / max(1, span), 100. * holes2 / max(1, span2), diff))
open(HERE / 'mouth-seethrough.json', 'w').write(json.dumps({
    'method': 'rendered against a saturated magenta backdrop at the phase each clip opens its own '
              'gape widest, framed in the skull\'s own frame; a backdrop-coloured pixel enclosed by '
              'the silhouette is a hole through the animal. Rendered twice, with and without the '
              'backface-cull shim, because the runtime culls and CYCLES does not.',
    'backdrop': list(BACKDROP), 'rows': rows}, indent=2) + '\n')
print('MOUTH_WORST ' + json.dumps(max(rows, key=lambda r: r['seeThroughPercent'])))
