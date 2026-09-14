"""The body of every per-creature `render.py` in this group of four.

Each species' script supplies its id, the phases worth looking at and the mouth camera, and this
does the rest: load the decoded packaged GLB, emulate the backface cull, frame the cameras off the
subject's own bounding box rather than off the origin (these bodies are measured into a frame
whose origin is the generation's centroid, so a camera aimed at zero crops the tail), and render.
"""
import bpy, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import review as R                                                        # noqa: E402


def run(creature_id, phases, top_phases, mouth_phases, mouth_scale=1.3, mouth_lift=.25):
    here = Path(__file__).resolve().parents[1] / creature_id
    root = Path(__file__).resolve().parents[4]
    out = root / 'public/assets/triassic/creatures'
    local = root / 'local/triassic-authoring' / creature_id
    twin = '--twin' in sys.argv
    suffix = '.puppet' if twin else ''
    review = local / ('twin-review' if twin else 'authored-review')
    review.mkdir(parents=True, exist_ok=True)

    source = (local / (creature_id + suffix + '.unpacked.glb')) if '--decoded' in sys.argv \
        else (out / (creature_id + suffix + '.glb'))
    scene, rig, cam = R.load(source)
    R.emulate_backface_cull()
    pose = R.poser(scene, rig)
    render = R.renderer(scene, cam)
    centre, size = R.subject_bounds()
    span = max(size) * 1.08
    cx, cy, cz = centre
    d = span * 1.6
    SIDE = dict(loc=(cx + d, cy, cz + .05 * span), target=centre, scale=span)
    TOP = dict(loc=(cx, cy, cz + d), target=centre, scale=span)
    THREEQ = dict(loc=(cx + d * .75, cy - d * .55, cz + d * .45), target=centre, scale=span)
    # The head sits at Blender -Y once the glTF +Z-forward body is imported.
    head = (cx, cy - size[1] * .40, cz + size[2] * .10)
    FRONT = dict(loc=(cx, cy - d, cz), target=head, scale=span * .35)
    MOUTH = dict(loc=(head[0] + span * .30, head[1] - span * .34, head[2] + span * .10),
                 target=head, scale=span * mouth_scale * .22)
    MOUTH_BELOW = dict(loc=(head[0] + span * .05, head[1] - span * .30, head[2] - span * .26),
                       target=head, scale=span * mouth_scale * .22)

    if '--mouth-only' in sys.argv:
        for clip, t in mouth_phases:
            pose(clip, t)
            render(review / ('mouth-%s-%s.png' % (clip, t)), 900, 700, **MOUTH)
            render(review / ('mouth-below-%s-%s.png' % (clip, t)), 900, 700, **MOUTH_BELOW)
        return

    if '--portraits' in sys.argv:
        (here / 'portraits').mkdir(exist_ok=True)
        pose('Idle', 0)
        if twin:
            render(here / 'portraits' / (creature_id + '.puppet.png'), 1200, 900, **THREEQ)
        else:
            for name, w, h in ((creature_id + '.select.png', 1600, 1200),
                               (creature_id + '.card.png', 800, 600),
                               (creature_id + '.thumb.png', 256, 192),
                               (creature_id + '.png', 1200, 900)):
                render(here / 'portraits' / name, w, h, **THREEQ)
        return

    for clip, t in phases:
        pose(clip, t)
        render(review / ('%s-%s.png' % (clip, t)), 700, 525, **THREEQ)
    for clip, t in top_phases:
        pose(clip, t)
        render(review / ('%s-%s-top.png' % (clip, t)), 700, 525, **TOP)
    for name, kw in (('side', SIDE), ('top', TOP), ('front', FRONT)):
        pose('Idle', 0)
        render(review / (name + '.png'), 800, 600, **kw)
    for clip, t in mouth_phases:
        pose(clip, t)
        render(review / ('mouth-%s-%s.png' % (clip, t)), 900, 700, **MOUTH)
        render(review / ('mouth-below-%s-%s.png' % (clip, t)), 900, 700, **MOUTH_BELOW)
