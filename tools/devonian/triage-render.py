"""Triage renders for the model queue (docs/model-queue-plan.md).

Imports decoded shipped GLBs with their materials and renders five views each — bind-pose lateral,
dorsal, three-quarter and head, plus the Ability (else Attack) midpoint — ortho-framed off the
bounding box, so a creature can be looked at without rebuilding it. Decode first, because the
shipped files are meshopt-compressed and Blender's importer cannot read them:

    npx @gltf-transform/cli cp public/assets/devonian/creatures/<id>.glb OUT/<id>.glb
    /opt/blender/blender --background --factory-startup --python tools/devonian/triage-render.py -- OUT <id> [<id>...]

Writes OUT/<id>-{lateral,dorsal,quarter,head,clip}.png. Low tier: no judgement in here.
"""
import bpy, sys, os, math
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; IDS = args[1:]
W, H, SAMPLES = 720, 450, 24

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    sc.render.resolution_x = W; sc.render.resolution_y = H
    sc.view_settings.view_transform = 'Standard'
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
    sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.16, .19, .22, 1)
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    for name, e, loc in (('key', 700, (-5, -4, 6)), ('fill', 250, (6, 3, 2)), ('rim', 300, (2, 6, 4))):
        L = bpy.data.objects.new(name, bpy.data.lights.new(name, 'AREA')); bpy.context.collection.objects.link(L)
        L.data.energy = e; L.data.size = 8; L.location = loc
        L.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; sc.camera = cam
    return sc, cam

def bbox():
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH': continue
        ev = ob.evaluated_get(dg)
        for v in ev.data.vertices:
            p = ev.matrix_world @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    return lo, hi

def shoot(sc, cam, centre, direction, extent, path):
    d = Vector(direction).normalized()
    cam.location = centre + d * 50
    cam.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    cam.data.ortho_scale = extent; cam.data.clip_end = 200
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

def relight(scale):
    for L in [o for o in bpy.context.scene.objects if o.type == 'LIGHT']:
        L.location = L.location * (scale / 6.0); L.data.size = 8 * scale / 6.0; L.data.energy *= (scale / 6.0) ** 2

for cid in IDS:
    sc, cam = clear()
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, cid + '.glb'))
    lo, hi = bbox(); c = (lo + hi) / 2; size = hi - lo; L = max(size)
    relight(max(L, 1.0))
    print('BBOX', cid, [round(x, 3) for x in size])
    pad = 1.12
    shoot(sc, cam, c, (-1, 0, 0), max(size.y, size.z) * pad, f'{OUT}/{cid}-lateral.png')
    shoot(sc, cam, c, (0, 0, 1), max(size.x, size.y) * pad, f'{OUT}/{cid}-dorsal.png')
    shoot(sc, cam, c, (-1, -0.9, 0.6), L * pad, f'{OUT}/{cid}-quarter.png')
    # head: the -y end, framed at a third of the length
    head_c = Vector((c.x, lo.y + size.y * 0.17, c.z)); shoot(sc, cam, head_c, (-1, -0.6, 0.35), size.y * 0.4, f'{OUT}/{cid}-head.png')
    # a mid-clip pose: Ability if there is one, else Attack
    arm = next((o for o in sc.objects if o.type == 'ARMATURE'), None)
    act = next((a for a in bpy.data.actions if a.name.split('|')[-1] in ('Ability',)), None) or next((a for a in bpy.data.actions if a.name.split('|')[-1] == 'Attack'), None)
    if arm and act:
        arm.animation_data_create(); arm.animation_data.action = act
        try: arm.animation_data.action_slot = act.slots[0]
        except Exception: pass
        f0, f1 = act.frame_range; sc.frame_set(int((f0 + f1) / 2))
        lo2, hi2 = bbox(); c2 = (lo2 + hi2) / 2; L2 = max(hi2 - lo2)
        shoot(sc, cam, c2, (-1, -0.9, 0.6), L2 * pad, f'{OUT}/{cid}-clip.png')
        print('CLIP', cid, act.name)
    else: print('CLIP', cid, 'none')
print('TRIAGE DONE')
