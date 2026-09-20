"""Prove a **beak inside an arm crown** opens onto a lining and never onto the backdrop.

  /opt/blender/blender -b --factory-startup --python tools/triassic/gape-crown.py -- <id> <Clip@t>...

This is the cephalopod complement to `gape-solid.py`, not a replacement for it. That tool is right
about the method — render at full gape twice against a saturated backdrop, once with a shim that
makes every backfacing surface transparent and once without, and look at what the cull *opened* —
and it stays the right method here. What it cannot do on this shape is aim, and what it cannot do
is judge:

- **It cannot aim.** Its camera is placed off the `jaw` bone's side, which frames a jawed head
  squarely and frames a cephalopod's crown from outside a thicket of arms. On Ceratites the mouth
  was behind three of them in every shot.
- **It cannot judge.** Its verdict is opened backdrop that the body *encloses*, found by flood
  filling the surround. A crown of arms encloses background between every pair of arms, so a
  one-pixel sliver at the silhouette of an arm — which its own comments say is not a hole you can
  see the world through — is counted as if it were the mouth. Ceratites reads 27 px that way, of
  which none is the mouth: the clusters sit on creases between arms at the frame's edge.

So this looks **down the crown's own axis, straight into the peristome**, and counts only what is
opened *where the mouth is actually drawn*. The axis is read off the rig rather than named: `head`
to `skull` is the mouth's own direction on every body built this way, and `anchor_mouth` is where
the opening is.

"Where the mouth is drawn" is a third render rather than a disc round the frame's centre. A disc was
the first attempt and it is not good enough: the arms stand in front of their own mouth, so a disc
sized to the peristome also contains several arm-to-arm creases, and this tool then reported those
creases as the mouth leaking (236 px on Ceratites, of which none was the mouth — every cluster sat
on a crease between two arms). The third pass paints the oral materials with a flat emissive marker
and leaves everything else alone, so the mask is exactly the pixels the lining and the mandibles
occupy after the arms have occluded whatever they occlude.

Everything opened anywhere in frame is still reported beside the verdict, because a hole elsewhere is
worth seeing even when it is not what this tool is deciding about. Note what it means and does not:
these bodies' skin is deliberately **double-sided** — the era's rule asks for it as the backstop
behind the lining — so the cull shim's premise, "this is what a single-sided runtime would draw",
holds for the lining and not for the skin. A sliver opened at an arm's silhouette is a fact about
the shim, not about the shipped body.

Writes the images and a `gape-crown.json` beside them.
"""
import bpy
import json
import math
import sys
from mathutils import Vector
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:]
ID = argv[0]
SHOTS = [(c, float(t)) for c, t in (a.split('@') for a in argv[1:] if '@' in a)]
TOLERANCE = 12                   # the same twelve pixels of 378,000 that `gape-solid.py` allows
ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / 'local/triassic-authoring' / ID
OUT = LOCAL / 'gape-crown'
OUT.mkdir(parents=True, exist_ok=True)
BACKDROP = (1.0, 0.0, 1.0, 1.0)


def scene_setup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(LOCAL / (ID + '.unpacked.glb')))
    s = bpy.context.scene
    s.render.fps = 30
    s.render.engine = 'CYCLES'
    s.cycles.samples = 24
    s.cycles.use_denoising = False
    s.render.image_settings.file_format = 'PNG'
    s.render.image_settings.color_mode = 'RGB'
    s.render.film_transparent = False
    s.view_settings.view_transform = 'Standard'
    s.world.use_nodes = True
    bg = s.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = BACKDROP
    bg.inputs[1].default_value = 1.0
    return s


def cull_shim():
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        nt = m.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out:
            continue
        link = next((ln for ln in nt.links if ln.to_node == out and ln.to_socket.name == 'Surface'), None)
        if not link:
            continue
        src = link.from_socket
        nt.links.remove(link)
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mix = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(geo.outputs['Backfacing'], mix.inputs['Fac'])
        nt.links.new(src, mix.inputs[1])
        nt.links.new(tr.outputs['BSDF'], mix.inputs[2])
        nt.links.new(mix.outputs['Shader'], out.inputs['Surface'])


MARKER = (0.0, 1.0, 0.0, 1.0)


def mark_oral():
    """Paint the oral materials with a flat emissive marker, so a third render says exactly which
    pixels the mouth occupies once the arms in front of it have had their say."""
    hit = 0
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        low = m.name.lower()
        if 'mouth' not in low and 'beak' not in low and 'lining' not in low:
            continue
        nt = m.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out:
            continue
        for ln in list(nt.links):
            if ln.to_node == out and ln.to_socket.name == 'Surface':
                nt.links.remove(ln)
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = MARKER
        em.inputs['Strength'].default_value = 1.0
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
        hit += 1
    assert hit, 'no oral material to mark: this body has no lining or beak'


def render_pass(culled, shots, marker=False):
    s = scene_setup()
    if culled:
        cull_shim()
    rig = next(o for o in s.objects if o.type == 'ARMATURE')
    for tr in rig.animation_data.nla_tracks:
        tr.mute = True
    socket = next(o for o in s.objects if o.name == 'anchor_mouth')
    if marker:
        mark_oral()
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
    files = []
    for clip, t in shots:
        a = next(x for x in bpy.data.actions
                 if x.name == clip or x.name.endswith('_' + clip) or x.name.endswith('|' + clip))
        rig.animation_data.action = a
        if a.slots:
            rig.animation_data.action_slot = a.slots[0]
        s.frame_set(round(t * 30))
        bpy.context.view_layer.update()
        # The mouth's own axis, off the rig: `head` to `skull` is the direction a beak faces on
        # every body built this way, and the mouth socket is where its opening is.
        head = rig.matrix_world @ rig.pose.bones['head'].head
        skull = rig.matrix_world @ rig.pose.bones['skull'].head
        axis = (skull - head).normalized()
        tgt = socket.matrix_world.translation.copy()
        # The frame is sized off the **oral lining's own bounding box**, because the mouth is a
        # small part of a whole animal and neither end of the scale works: a frame sized to the
        # body puts the peristome in a dozen pixels, and a frame sized to the gap between the
        # skull and jaw joints (0.036 of a five-unit animal) puts the camera inside the throat.
        span = max(o.dimensions.length for o in s.objects
                   if o.type == 'MESH' and 'lining' in o.name.lower()) * 2.2
        cam.location = tgt + axis * (span * 3)
        cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = span
        s.render.resolution_x, s.render.resolution_y = 700, 540
        f = OUT / ('%s-%s-%s.png' % (clip, t, 'marker' if marker else 'culled' if culled else 'solid'))
        s.render.filepath = str(f)
        bpy.ops.render.render(write_still=True)
        files.append((clip, t, str(f)))
    return files


# **A crown with no mouth drawn in it is nothing for this tool to judge.** Both cephalopods now keep
# the closed crown the generation delivered -- no peristome cut, no lining, no beak -- so there is no
# oral material to paint the marker with and no lining to size the frame off, and the verdict this
# tool gives ("backdrop opened where the mouth is drawn") has no subject. `gape-solid.py` still runs
# on the closed crown and is what proves it whole. Say so and stop, rather than fail on an empty
# `max()`: the record has to say the tool was moot, not that it crashed.
scene_setup()
if not any(o.type == 'MESH' and 'lining' in o.name.lower() for o in bpy.context.scene.objects):
    report = {'id': ID, 'moot': True, 'shots': [{'clip': c, 't': t} for c, t in SHOTS],
              'reason': 'no oral lining, beak or peristome on this body: the crown is the closed '
                        'surface the generation delivered, so there is nothing drawn where a mouth '
                        'would be for this tool to judge; gape-solid.py is the check that applies'}
    (OUT / 'gape-crown.json').write_text(json.dumps(report, indent=2))
    print('GAPE_CROWN_MOOT', json.dumps(report))
    sys.exit(0)

solid = render_pass(False, SHOTS)
culled = render_pass(True, SHOTS)
marked = render_pass(False, SHOTS, marker=True)

report = {'id': ID, 'backdrop': list(BACKDROP), 'marker': list(MARKER),
          'tolerance': TOLERANCE, 'shots': []}
worst = 0
for (clip, t, fa), (_, _, fb), (_, _, fc) in zip(solid, culled, marked):
    a = bpy.data.images.load(fa)
    b = bpy.data.images.load(fb)
    c = bpy.data.images.load(fc)
    pa, pbx, pc = list(a.pixels), list(b.pixels), list(c.pixels)
    w, h = a.size
    n = w * h

    def bg(px, i):
        r, g, bl = px[i * 4], px[i * 4 + 1], px[i * 4 + 2]
        return r > .5 and g < .3 and bl > .5

    def is_mouth(i):
        r, g, bl = pc[i * 4], pc[i * 4 + 1], pc[i * 4 + 2]
        return g > .5 and r < .3 and bl < .3

    opened_all, opened_mouth, mouth_pixels = 0, 0, 0
    for i in range(n):
        x, y = i % w, i // w
        inside = is_mouth(i)
        if inside:
            mouth_pixels += 1
        if not bg(pbx, i) or bg(pa, i):
            continue
        # Throw away the silhouette's own antialiasing, exactly as `gape-solid.py` does.
        if any(bg(pa, (y + dy) * w + (x + dx))
               for dx in (-1, 0, 1) for dy in (-1, 0, 1)
               if 0 <= x + dx < w and 0 <= y + dy < h):
            continue
        opened_all += 1
        if inside:
            opened_mouth += 1
    assert mouth_pixels > 200, ('the mouth is not visible in this shot at all', clip, t, mouth_pixels)
    worst = max(worst, opened_mouth)
    report['shots'].append({'clip': clip, 't': t, 'openedWhereTheMouthIsDrawn': opened_mouth,
                            'openedAnywhere': opened_all, 'mouthPixels': mouth_pixels,
                            'solid': fa, 'culled': fb, 'marker': fc})
    print('CROWN %s@%s  opened where the mouth is drawn %d | anywhere in frame %d | the mouth is %d px'
          % (clip, t, opened_mouth, opened_all, mouth_pixels))
    bpy.data.images.remove(a)
    bpy.data.images.remove(b)
    bpy.data.images.remove(c)
report['worstOpenedWhereTheMouthIsDrawn'] = worst
(OUT / 'gape-crown.json').write_text(json.dumps(report, indent=2))
print('GAPE_CROWN ' + json.dumps({k: v for k, v in report.items() if k != 'shots'}))
if worst > TOLERANCE:
    print('FAIL: the backdrop is visible through the mouth at full gape (%d px)' % worst)
    sys.exit(1)
print('PASS: the mouth opens onto its lining at full gape (%d px, tolerance %d)' % (worst, TOLERANCE))
