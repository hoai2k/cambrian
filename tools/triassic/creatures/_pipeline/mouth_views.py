"""Measure how much of an open mouth you can see straight through.

Both worked examples in this pipeline shipped a gape that showed through the head: a lining that was
two separate closed tubes parting when the jaw swung, under a skin that culls its backfaces. The
number that caught it is this one -- every transparent pixel lying between the topmost and
bottommost opaque pixel of the head, column by column, is a hole straight through the animal.

Two things this has to get right, both learned on Dinocephalosaurus:

- photograph each clip at the phase **its own gape is widest**, which is the aperture worth
  measuring, rather than at a fixed time;
- frame in the **skull's own frame** rather than the world's, because a body that pitches and rolls
  will otherwise be photographed from above, and a silhouette curving through the frame encloses
  background that is not a hole at all.

CYCLES ignores `use_backface_culling`, so `review.emulate_backface_cull()` is what makes the shot
show what the runtime shows.
"""
import bpy, json, math, sys
import numpy as np
from mathutils import Vector
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import review as R                                                      # noqa: E402


def widest_gape(scene, rig, clip, samples=40):
    """The frame of `clip` at which the jaw is furthest open, and how far open that is."""
    action = next(a for a in bpy.data.actions
                  if a.name == clip or a.name.endswith('_' + clip) or a.name.endswith('|' + clip))
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    first, last = (int(round(v)) for v in action.frame_range)
    best = (first, -1e9)
    for f in np.linspace(first, last, samples):
        scene.frame_set(int(round(f)))
        pb = rig.pose.bones['jaw']
        q = pb.rotation_quaternion if pb.rotation_mode == 'QUATERNION' else \
            pb.rotation_euler.to_quaternion()
        angle = 2 * math.atan2(q.x, q.w)
        if angle > best[1]:
            best = (int(round(f)), angle)
    scene.frame_set(best[0])
    return best


def see_through(path):
    """The fraction of the animal's own area that is a hole straight through it.

    A hole is transparent film **enclosed by the animal**: not reachable from the edge of the frame
    without crossing the body. The column-wise version of this test -- every transparent pixel
    between the topmost and bottommost opaque pixel of a column -- is what the two worked examples
    used, and it counts any gap between two parts of the animal that happen to be in the same
    column as a hole through it. On this batch that read 7 to 11 % of the aperture on a mouth the
    backdrop proof showed to be sound, because the shoulder is behind the head in the same columns.
    A flood fill from the border is immune to that and is what a hole actually is.
    """
    from collections import deque
    from PIL import Image
    im = Image.open(path).convert('RGBA')
    a = np.array(im)[:, :, 3] > 12
    h, w = a.shape
    seen = np.zeros_like(a)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not a[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not a[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not a[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    holes = int((~a & ~seen).sum())
    body = int(a.sum())
    area = holes + body
    return (holes / area) if area else 0., holes, area


def saturated_backdrop(scene, colour=(1., 0., 1., 1.)):
    """Put a saturated ground behind the animal and stop the film being transparent, so anything
    seen *through* the head is that colour and nothing else."""
    scene.render.film_transparent = False
    bg = scene.world.node_tree.nodes['Background']
    bg.inputs[0].default_value = colour
    bg.inputs[1].default_value = 1.6


def undo_cull_shim():
    """Remove the emulated backface cull: every material draws both sides again."""
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue
        nt = mat.node_tree
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if not out or not out.inputs['Surface'].links:
            continue
        node = out.inputs['Surface'].links[0].from_node
        if node.type != 'MIX_SHADER':
            continue
        src = node.inputs[1].links[0].from_node
        nt.links.new(src.outputs[0], out.inputs['Surface'])


def image_difference(a, b):
    """The fraction of pixels that differ between two renders, and the worst channel difference."""
    from PIL import Image
    import numpy as _np
    x = _np.asarray(Image.open(a).convert('RGB'), dtype=_np.int16)
    y = _np.asarray(Image.open(b).convert('RGB'), dtype=_np.int16)
    d = _np.abs(x - y).max(axis=2)
    return float((d > 8).mean()), int(d.max())


def run(creature_id, clips, out_dir, cam_distance=1.6, ortho=1.4, offsets=None):
    """Render each clip at its widest gape from the skull's own frame and measure the hole."""
    root = Path(__file__).resolve().parents[4]
    local = root / 'local/triassic-authoring' / creature_id
    source = local / (creature_id + '.unpacked.glb')
    if not source.exists():
        source = root / 'public/assets/triassic/creatures' / (creature_id + '.glb')
    scene, rig, cam = R.load(source)
    # This pass is a **measurement**, not a picture: what is counted is which pixels are opaque, and
    # a path-traced sample count that matters for skin noise does not matter for a silhouette. Four
    # samples with denoising is a quarter of the cost of the review renders and the same alpha.
    scene.cycles.samples = 4
    R.emulate_backface_cull()
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    offsets = offsets or {'side': (1., .05, .10), 'three-quarter': (.75, -.55, .35),
                          'front': (.06, -1., .10)}
    # **Frame on the mouth, not on the animal.** The column-wise hole count reads every transparent
    # pixel lying between the topmost and bottommost opaque pixel of a column, and if the shot holds
    # the head *and* the shoulder behind it then the gap between them is counted as a hole through
    # the animal. That is the trap Dinocephalosaurus' README names, and on this body it read 7 % of
    # the aperture while the backdrop proof was clean at 0 %, which is exactly the signature of it.
    # So the camera aims at the midpoint of skull → `anchor_mouth` and is scaled to that distance:
    # the mouth fills the frame and nothing else is in it.
    mouth_socket = next((o for o in bpy.context.scene.objects if o.name == 'anchor_mouth'), None)
    rows = []
    for clip in clips:
        frame, angle = widest_gape(scene, rig, clip)
        skull = rig.pose.bones['skull']
        M = rig.matrix_world @ skull.matrix
        origin = M.translation
        if mouth_socket is not None:
            tip = mouth_socket.matrix_world.translation
            reach = (tip - origin).length
            if reach > 1e-4:
                origin = origin + (tip - origin) * .55
                cam_distance = max(reach * 2.4, 1e-3)
                ortho = reach * 1.7
        for label, off in offsets.items():
            d = (M.to_3x3() @ Vector(off)).normalized() * cam_distance
            cam.location = origin + d
            cam.rotation_euler = (origin - cam.location).to_track_quat('-Z', 'Y').to_euler()
            cam.data.ortho_scale = ortho
            scene.render.resolution_x = 700
            scene.render.resolution_y = 700
            f = out / ('%s-%s.png' % (clip, label))
            scene.render.filepath = str(f)
            bpy.ops.render.render(write_still=True)
            frac, holes, aperture = see_through(f)
            rows.append({'clip': clip, 'view': label, 'frame': frame,
                         'gapeRadians': angle, 'seeThroughFraction': frac,
                         'holePixels': int(holes), 'aperturePixels': int(aperture)})
            print('MOUTH_VIEW', json.dumps(rows[-1]))
    # ---- the backdrop proof -------------------------------------------------------------
    # The see-through count above is one test; this is the other, and it is the one the reviewer
    # asked for. Against a **saturated backdrop**, render each widest gape twice: once with the
    # backface cull emulated (what the runtime draws) and once without it (both sides drawn, so any
    # hole is plugged by the far wall of the skin). If the two images are identical, the cull is
    # changing nothing and there is no hole for it to open. The trap this avoids is comparing the
    # culled render against the *background*, which measures the backdrop and passes regardless.
    saturated_backdrop(scene)
    proof = []
    for clip in clips:
        frame, angle = widest_gape(scene, rig, clip)
        skull = rig.pose.bones['skull']
        M = rig.matrix_world @ skull.matrix
        origin = M.translation
        if mouth_socket is not None:
            tip = mouth_socket.matrix_world.translation
            if (tip - origin).length > 1e-4:
                origin = origin + (tip - origin) * .55
        for label, off in list(offsets.items())[:2]:
            d = (M.to_3x3() @ Vector(off)).normalized() * cam_distance
            cam.location = origin + d
            cam.rotation_euler = (origin - cam.location).to_track_quat('-Z', 'Y').to_euler()
            cam.data.ortho_scale = ortho
            scene.render.resolution_x = 500
            scene.render.resolution_y = 500
            culled = out / ('proof-%s-%s-culled.png' % (clip, label))
            scene.render.filepath = str(culled)
            bpy.ops.render.render(write_still=True)
            proof.append({'clip': clip, 'view': label, 'file': culled.name})
    undo_cull_shim()
    for row in proof:
        clip, label = row['clip'], row['view']
        widest_gape(scene, rig, clip)
        skull = rig.pose.bones['skull']
        M = rig.matrix_world @ skull.matrix
        origin = M.translation
        if mouth_socket is not None:
            tip = mouth_socket.matrix_world.translation
            if (tip - origin).length > 1e-4:
                origin = origin + (tip - origin) * .55
        d = (M.to_3x3() @ Vector(offsets[label])).normalized() * cam_distance
        cam.location = origin + d
        cam.rotation_euler = (origin - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = ortho
        both = out / ('proof-%s-%s-twosided.png' % (clip, label))
        scene.render.filepath = str(both)
        bpy.ops.render.render(write_still=True)
        frac, worst = image_difference(out / row['file'], both)
        row['pixelsChangedByTheCull'] = frac
        row['worstChannelDifference'] = worst
        print('MOUTH_PROOF', json.dumps(row))

    report = {'seeThrough': rows, 'backdropProof': proof}
    (out / 'see-through.json').write_text(json.dumps(report, indent=2) + '\n')
    worst = max(rows, key=lambda r: r['seeThroughFraction'])
    print('MOUTH_WORST', json.dumps(worst))
    if proof:
        print('MOUTH_PROOF_WORST', json.dumps(max(proof, key=lambda r: r['pixelsChangedByTheCull'])))
    return report
