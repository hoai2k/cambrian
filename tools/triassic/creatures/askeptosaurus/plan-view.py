"""One dorsal (plan) shot of this animal at rest, plus the numbers the shot is about.

    blender -b --python plan-view.py -- [--file <glb>] [--out <dir>] [--tag before] [--clip Idle] [--t 0]

The acceptance test for the front correction is that **the head reads straight from directly
above**, so this renders exactly that view and prints, from the same file, the angles a reviewer
would otherwise have to take on trust -- and it prints them against *several* named references,
because the whole history of this animal's front is three defensible readings of "the trunk"
disagreeing by up to 43 degrees. Every angle here names both of its ends.

The head's direction is **geometry, not the bone chain**: the skull's own dominantly weighted
vertices, with the tip taken as the one furthest from the skull joint. The point of the
measurement is that the bone chain's last segment and the head a viewer sees can disagree.

It also writes the bones' own screen positions beside the shot (`--overlay`), so the picture can
be marked up and the reference a number names can be seen rather than believed.
"""
import bpy, sys, math, json
from pathlib import Path
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import review as R

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def opt(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
ROOT = Path(__file__).resolve().parents[4]
source = Path(opt('--file', str(ROOT / 'public/assets/triassic/creatures/askeptosaurus.glb')))
out = Path(opt('--out', str(ROOT / 'local/triassic-authoring/askeptosaurus/plan')))
out.mkdir(parents=True, exist_ok=True)
tag = opt('--tag', 'now')
clip = opt('--clip', 'Idle')
t = float(opt('--t', '0'))

scene, rig, cam = R.load(source)
R.emulate_backface_cull()
pose = R.poser(scene, rig)
render = R.renderer(scene, cam)
pose(clip, t)

mesh = max((o for o in scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
groups = {g.index: g.name for g in mesh.vertex_groups}
owned = {}
for v in mesh.data.vertices:
    if v.groups:
        owned.setdefault(groups.get(max(v.groups, key=lambda g: g.weight).group), []).append(v)
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
pb = arm.pose.bones
head = Vector(pb['skull'].head[:])
skull = owned.get('skull', [])
tip = max((mesh.matrix_world @ v.co for v in skull), key=lambda p: (p - head).length)
hd = (tip - head).normalized()

TAIL = ['tail_%02d' % i for i in range(12)]
P = {n: Vector(pb[n].head[:]) for n in list(pb.keys())}
refs = {
    'hipToShoulder': (P['chest'] - P['tail_00']).normalized(),
    'bodyToChest': (P['chest'] - P['body']).normalized(),
    'midTailToShoulder': (P['chest'] - P['tail_04']).normalized(),
    'tailRunToShoulder': (P['chest'] - P['tail_08']).normalized(),
}

def plan(v):
    w = Vector((v.x, v.y, 0.))
    return w.normalized() if w.length > 1e-9 else w

info = {'tag': tag, 'file': str(source), 'clip': clip, 't': t,
        'skullOwnedVertices': len(skull),
        'headDirection': [round(x, 5) for x in hd],
        'against': {k: {'vector': [round(x, 5) for x in r],
                        'headVsDegrees': round(math.degrees(hd.angle(r)), 2),
                        'headVsInPlanDegrees': round(math.degrees(plan(hd).angle(plan(r))), 2)}
                    for k, r in refs.items()}}

centre, size = R.subject_bounds()
span = max(size) * 1.08
d = span * 1.6
loc, target, scale = R.fit_ortho((centre[0], centre[1], centre[2] + d), centre, R.posed_points(), 4 / 3)
shot = out / ('%s-%s-%s-top.png' % (tag, clip, t))
render(shot, 900, 675, loc=loc, target=target, scale=scale, roll=math.pi / 2)

if '--overlay' in argv:
    scene.frame_set(scene.frame_current)
    bpy.context.view_layer.update()
    marks = {n: list(world_to_camera_view(scene, cam, P[n]))[:2] for n in P}
    marks['__snout'] = list(world_to_camera_view(scene, cam, tip))[:2]
    (out / ('%s-%s-%s-marks.json' % (tag, clip, t))).write_text(json.dumps(marks, indent=1))

print('PLAN_VIEW ' + json.dumps(info))
