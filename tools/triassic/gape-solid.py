"""Prove an open gape shows lining and never background through the skin.

  /opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- <id> <Clip@t>...

The test is the pair, not either image on its own. The body is rendered at full gape twice, against a
**saturated** backdrop that appears nowhere on the animal: once with a backface-cull shim that makes
every backfacing surface transparent — which is what a single-sided runtime would draw — and once
without it. If the skin has a hole, or the lining is a tube that parts when the jaw swings, the
culled pass lets the backdrop through and the two images differ where the mouth is. Identical images
mean no through-holes.

The trap this is built to avoid: rendering against the *plain* background and looking for "nothing
odd" measures the backdrop and passes whatever the gape does. That mistake was already made once on
Placodus, which is why the backdrop here is a colour the animal cannot produce and why the check is a
difference between two renders rather than a look at one.

Writes the two images and a `gape-solid.json` beside them with the measured difference.
"""
import bpy
import json
import math
import re
import sys
from mathutils import Vector
from pathlib import Path

argv = sys.argv[sys.argv.index('--') + 1:]
ID = argv[0]
SHOTS = [(c, float(t)) for c, t in (a.split('@') for a in argv[1:] if '@' in a)]
# **What the game draws is not what this file contains.** `src/shared/oral-geometry.ts` is the
# runtime's classifier and the game hides everything it matches -- every `Oral cavity lining`, every
# `Seated jaw hinge tissue` -- so a body whose gape is closed *by* those parts is proved closed here
# and still shows a hole to a player. That is not a hypothetical: Mosasaurus measured 0 px through
# the body at every opening clip while its owner was looking at holes in its mouth. `--as-drawn`
# hides the same parts the runtime hides before rendering, so the proof is about the animal on
# screen. It is the honest default for any body whose oral parts are hidden in play; the plain run
# remains, because it is what the file contains and it is what every earlier verdict measured.
AS_DRAWN = '--as-drawn' in argv
ORAL = re.compile(r'lining|mouth[ _]interior|hinge[ _]tissue|beak|palate', re.I)
ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / 'local/triassic-authoring' / ID
OUT = LOCAL / ('gape-solid-as-drawn' if '--as-drawn' in sys.argv else 'gape-solid')
OUT.mkdir(parents=True, exist_ok=True)

# A backdrop the animal cannot produce: full-intensity magenta. Every one of these bodies is a brown
# or grey hide over a dark red mouth, so any magenta pixel inside the silhouette is background seen
# through the animal.
#
# **The test for it has to be the backdrop, not a half-space** -- and it has been too loose twice,
# in the same way, for the same reason. A magenta *world* also lights the scene, so anything on the
# animal that is pale or pink renders near magenta and a half-space catches it.
#
# The first time, at `r > .5, g < .3, b > .5`, what it caught was a mouth: Rhaeticosaurus' oral
# lining -- (0.30, 0.13, 0.115), the same dark red Mixosaurus ships -- renders under that world at
# (0.73, 0.29, 0.51), inside the window by a hair on green, and 394 of the 508 pixels that failed
# the body at full gape were its own lining, correctly drawn and correctly front-facing.
#
# The second time, at `r > .75, g < .45, b > .75`, what it caught was **skin**. Saurichthys is a
# pale silvery fish, and its flank and lip line render at about (0.78, 0.44, 0.76): inside that
# window by one part in two hundred on green. Seventeen pixels of it were being counted as
# background seen through the animal, and a ray cast through them -- measuring its own distance to
# each part rather than reading the render -- found solid front-facing skin at every one.
#
# Both times the tell was the same and is worth watching for in any check whose number will not
# move: five separate corrections to this fish's geometry, and a sixth to its cut rim, moved the
# count by nothing at all.
#
# So the test is now measured against **the backdrop itself** rather than set by eye. Over every
# render this repository has made, backdrop pixels come back with green below **0.063** and red and
# blue at 1.00; the tail above that is antialiasing along the silhouette and lit skin. At
# `r > .90, g < .20, b > .90` the window is still three times wider in green than any backdrop pixel
# measured, and it excludes a lit pale hide by a factor of two. The flood fill from the frame edge
# is unaffected because the surround is saturated.
#
# Tightening is *nearly* monotone but not quite, and the reason is worth knowing: a pixel is only
# counted as opened if none of its eight neighbours was backdrop in the *solid* pass, and narrowing
# the test can drop a neighbour out of that exclusion. In practice it moves single pixels either way
# along a silhouette. The change was re-run across every delivered body before it landed.
BACKDROP = (1.0, 0.0, 1.0, 1.0)
BG = (.90, .20, .90)             # r >, g <, b > for a pixel to be the backdrop


def scene_setup():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(LOCAL / (ID + '.unpacked.glb')))
    s = bpy.context.scene
    s.render.fps = 30
    s.render.engine = 'CYCLES'
    s.cycles.samples = 24
    s.cycles.use_denoising = False          # denoising would blur a one-pixel leak away
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
    """Make every backfacing surface transparent: what a single-sided runtime draws."""
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


def render_pass(culled, shots):
    s = scene_setup()
    if culled:
        cull_shim()
    if AS_DRAWN:
        for o in list(s.objects):
            if o.type != 'MESH':
                continue
            names = [o.name] + [m.name for m in o.data.materials if m]
            if any(ORAL.search(n) for n in names):
                o.hide_render = True
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
    files = []
    for clip, t in shots:
        a = next(x for x in bpy.data.actions
                 if x.name == clip or x.name.endswith('_' + clip) or x.name.endswith('|' + clip))
        rig.animation_data.action = a
        if a.slots:
            rig.animation_data.action_slot = a.slots[0]
        s.frame_set(round(t * 30))
        bpy.context.view_layer.update()
        pb = rig.pose.bones.get('jaw') or rig.pose.bones.get('skull')
        m = rig.matrix_world @ pb.matrix
        fwd = -(m.to_3x3() @ Vector((0, 1, 0))).normalized()
        down = -(m.to_3x3() @ Vector((0, 0, 1))).normalized()
        side = fwd.cross(down).normalized()
        tgt = (rig.matrix_world @ pb.head) + fwd * .12
        cam.location = tgt + side * 4.0 + fwd * .9 - down * .5
        cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = 1.30
        s.render.resolution_x, s.render.resolution_y = 700, 540
        f = OUT / ('%s-%s-%s.png' % (clip, t, 'culled' if culled else 'solid'))
        s.render.filepath = str(f)
        bpy.ops.render.render(write_still=True)
        files.append((clip, t, str(f)))
    return files


solid = render_pass(False, SHOTS)
culled = render_pass(True, SHOTS)

def enclosed_backdrop(px, w, h):
    """Backdrop pixels that are *inside* the silhouette, not the surround.

    Counting every backdrop pixel that changed between the passes counts the silhouette's own
    antialiasing — about a hundred edge pixels on these heads, which is noise and not a hole. What a
    through-hole means is backdrop the body encloses, so the surround is flood-filled from the frame
    edge and only backdrop the fill cannot reach is counted.
    """
    def is_bg(i):
        r, g, b = px[i * 4], px[i * 4 + 1], px[i * 4 + 2]
        return r > BG[0] and g < BG[1] and b > BG[2]

    seen = bytearray(w * h)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            i = y * w + x
            if is_bg(i) and not seen[i]:
                seen[i] = 1
                stack.append(i)
    for y in range(h):
        for x in (0, w - 1):
            i = y * w + x
            if is_bg(i) and not seen[i]:
                seen[i] = 1
                stack.append(i)
    while stack:
        i = stack.pop()
        x, y = i % w, i // w
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                j = ny * w + nx
                if not seen[j] and is_bg(j):
                    seen[j] = 1
                    stack.append(j)
    return [i for i in range(w * h) if is_bg(i) and not seen[i]]


report = {'id': ID, 'backdrop': list(BACKDROP), 'asDrawn': AS_DRAWN, 'shots': []}
for (clip, t, fa), (_, _, fb) in zip(solid, culled):
    a = bpy.data.images.load(fa)
    b = bpy.data.images.load(fb)
    pa, pb_ = list(a.pixels), list(b.pixels)
    w, h = a.size
    n = len(pa) // 4
    diff = sum(1 for i in range(n)
               if max(abs(pa[i * 4 + k] - pb_[i * 4 + k]) for k in range(3)) > 0.08)
    def bg(px, i):
        r, g, b = px[i * 4], px[i * 4 + 1], px[i * 4 + 2]
        return r > BG[0] and g < BG[1] and b > BG[2]

    # A hole is backdrop the cull *opened*: backdrop in the culled pass, body in the solid pass, and
    # not touching backdrop in the solid pass either — that last clause is what throws away the
    # silhouette's own antialiasing, which otherwise reports about a hundred edge pixels per head and
    # has nothing to do with the gape. Backdrop that is there in *both* passes is not a hole at all;
    # on these animals it is the honest gap between an open lower jaw and the throat behind it.
    opened = []
    for i in range(n):
        if not bg(pb_, i) or bg(pa, i):
            continue
        x, y = i % w, i // w
        if any(bg(pa, (y + dy) * w + (x + dx))
               for dx in (-1, 0, 1) for dy in (-1, 0, 1)
               if 0 <= x + dx < w and 0 <= y + dy < h):
            continue
        opened.append(i)
    # The verdict is about backdrop seen *through* the animal, so it is the opened pixels the body
    # encloses. An opened pixel on the silhouette is a one-polygon-thick edge losing its back face —
    # on these heads a sliver at the very tip of the mandible — which is not a hole you can see the
    # world through and is not what the requirement is about.
    enclosed_now = set(enclosed_backdrop(pb_, w, h))
    through = [i for i in opened if i in enclosed_now]
    # Write where they are, so a residual count is looked at rather than argued about: the culled
    # render with every opened pixel painted pure green.
    if opened:
        marked = bpy.data.images.new('%s-%s-opened' % (clip, t), w, h, alpha=False)
        buf = list(pb_)
        for i in opened:
            buf[i * 4], buf[i * 4 + 1], buf[i * 4 + 2] = 0., 1., 0.
        marked.pixels = buf
        marked.filepath_raw = str(OUT / ('%s-%s-opened.png' % (clip, t)))
        marked.file_format = 'PNG'
        marked.save()

    report['shots'].append({'clip': clip, 't': t, 'pixels': n, 'differingPixels': diff,
                            'holesOpenedByCulling': len(opened),
                            'seenThroughTheBody': len(through),
                            'backdropInBothPasses': len(enclosed_backdrop(pa, w, h)),
                            'markedImage': str(OUT / ('%s-%s-opened.png' % (clip, t))) if opened else None,
                            'solid': fa, 'culled': fb})
    print('GAPE %s@%s  differing %d of %d | opened by culling %d, of which seen through the body %d'
          % (clip, t, diff, n, len(opened), len(through)))

(OUT / 'gape-solid.json').write_text(json.dumps(report, indent=2))
worst = max((s['seenThroughTheBody'] for s in report['shots']), default=0)
print('GAPE_SOLID', json.dumps({
    'id': ID, 'maxSeenThroughTheBody': worst,
    'maxOpenedByCulling': max((s['holesOpenedByCulling'] for s in report['shots']), default=0),
    'maxDifferingPixels': max((s['differingPixels'] for s in report['shots']), default=0)}))
# A handful of pixels is the enclosure test meeting the silhouette's antialiasing at the tip of the
# mandible, where the jaw is one polygon thick and losing its back face costs a sliver. It is not a
# hole you can see the world through, and the shipped skin is double-sided so it does not arise at
# runtime at all. Anything above this is a real opening and the marked image says where.
TOLERANCE = 12
if worst > TOLERANCE:
    print('FAIL: the backdrop is visible through the body at full gape (%d px); see the -opened.png' % worst)
    sys.exit(1)
print('PASS: the gape shows lining and not backdrop with every backface culled '
      '(%d px through the body, tolerance %d)' % (worst, TOLERANCE))
