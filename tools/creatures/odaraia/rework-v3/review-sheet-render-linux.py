"""New file (not a modification of any tracked rework-v3 script): renders the extra
triage-style lateral/dorsal/quarter views this resume's parent asked for, on top of the six
views material_study02-linux.py already produced, and composes one comparison sheet with PIL.

Loads the produced odaraia-material02.blend (this session's own output, not a frozen input) and
adds three bbox-fit orthographic Cycles views in the same look-and-feel as
tools/devonian/triage-render.py (lateral / dorsal / three-quarter), respecting this creature's
own coordinate convention (forward +Z, world up +Y, inverted rest pose so legs point toward +Y
and the anatomical dorsal shell faces -Y) instead of that tool's +Z-up glTF convention.
Then composes a single PNG sheet from all nine renders with PIL for the parent to judge from.
"""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path('/home/user/expansion-authoring/odaraia-rework')
MAT02 = ROOT / 'material02'
BLEND = MAT02 / 'odaraia-material02.blend'
if not BLEND.exists():
    raise RuntimeError(f'material02 blend not found at {BLEND}; run execute_material02-linux.py first')

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
SCENE = bpy.context.scene
MODEL = [o for o in SCENE.objects if o.type == 'MESH' and not o.hide_render]
camera = SCENE.camera
camera.data.type = 'ORTHO'

world = SCENE.world
background = world.node_tree.nodes.get('Background')
background.inputs['Strength'].default_value = .45

def bbox():
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for ob in MODEL:
        for v in ob.data.vertices:
            p = ob.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    return lo, hi

LO, HI = bbox()
CENTRE = (LO + HI) / 2
SIZE = HI - LO

def camera_setup(pos, target, world_up=(0, 1, 0)):
    camera.location = Vector(pos)
    back = (camera.location - Vector(target)).normalized()
    up = Vector(world_up) - back * back.dot(Vector(world_up))
    if up.length < 1e-6:
        up = Vector((0, 0, 1)) - back * back.dot(Vector((0, 0, 1)))
    up.normalize()
    right = up.cross(back).normalized(); up = back.cross(right).normalized()
    camera.rotation_euler = Matrix((right, up, back)).transposed().to_euler()
    pts = [ob.matrix_world @ v.co for ob in MODEL for v in ob.data.vertices]
    xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]
    mx = (max(xs) + min(xs)) / 2; my = (max(ys) + min(ys)) / 2
    camera.location += right * (mx - camera.location.dot(right)) + up * (my - camera.location.dot(up))
    camera.data.ortho_scale = 1; f = camera.data.view_frame(scene=SCENE)
    w = max(p.x for p in f) - min(p.x for p in f); h = max(p.y for p in f) - min(p.y for p in f)
    camera.data.ortho_scale = max((max(xs) - min(xs)) / w, (max(ys) - min(ys)) / h) * 1.12

L = max(SIZE)
distance = L * 4
# lateral: pure broadside, world up +Y (matches the material02 side views' basis, no oblique tilt).
LATERAL = ((CENTRE.x - distance, CENTRE.y, CENTRE.z), CENTRE)
# dorsal: straight down the anatomical dorsal axis. The rest pose is inverted (legs +Y, anatomical
# dorsal shell -Y), so a camera below looking up along +Y shows the anatomical dorsal shell in
# plan, matching material02's own "dorsal-underside" naming rather than a glTF-style top-down shot.
DORSAL = ((CENTRE.x, CENTRE.y - distance, CENTRE.z), CENTRE)
# quarter: elevated three-quarter, matching triage-render.py's own (-1,-0.9,0.6) convention
# translated into this creature's +Y-up/+Z-forward axes (its dorsal is -Y, so tilt toward -Y).
qdir = Vector((-1, -0.6, 0.9)).normalized()
QUARTER = (CENTRE + qdir * distance, CENTRE)

VIEWS = [
    ('07-lateral', LATERAL[0], LATERAL[1], (0, 1, 0)),
    ('08-dorsal', DORSAL[0], DORSAL[1], (0, 0, 1)),
    ('09-quarter', QUARTER[0], QUARTER[1], (0, 1, 0)),
]

records = []
background.inputs['Color'].default_value = (.36, .48, .49, 1)  # light tone, matches material02's light views
for name, pos, target, up in VIEWS:
    camera_setup(pos, target, up)
    SCENE.render.filepath = str(MAT02 / (name + '.png'))
    bpy.ops.render.render(write_still=True)
    records.append({'view': name, 'position': list(camera.location), 'orthoScale': camera.data.ortho_scale})

(MAT02 / 'review-sheet-extra-views.json').write_text(json.dumps({'views': records, 'bboxSize': list(SIZE)}, indent=2))
print('ODARAIA_REVIEW_EXTRA_VIEWS_RENDERED')
