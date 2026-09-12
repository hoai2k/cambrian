"""Four delivery portraits for the sculpt-port candidate (pattern: stethacanthus/portraits_v3.py,
adapted to titanichthys's own bounding box and a three-quarter framing that fits its longer body).

    /opt/blender/blender --background --python tools/devonian/creatures/titanichthys/sculpt-port/portraits.py
"""
import bpy
from pathlib import Path
from mathutils import Vector
OUT = Path('/home/user/devonian-authoring/titanichthys/sculpt-candidate')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(OUT / 'titanichthys.glb'))
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
for tr in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(tr)
if not scene.world:
    scene.world = bpy.data.worlds.new('Neutral studio')
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (.16, .18, .20, 1)
bg.inputs[1].default_value = .6
for name, p, E, col, size in [('Neutral key', (7, -7, 6), 1400, (1, .95, .89), 6),
                               ('Broad fill', (-7, -4, 3), 1000, (.85, .92, 1), 6),
                               ('Soft rim', (2, 6, 5), 1500, (.89, .95, 1), 5)]:
    bpy.ops.object.light_add(type='AREA', location=p)
    o = bpy.context.object
    o.name = name
    o.data.energy = E
    o.data.color = col
    o.data.size = size
    o.rotation_euler = (Vector((0, .5, .1)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = 'ORTHO'
scene.camera = cam
act = next(a for a in bpy.data.actions if a.name == 'Idle' or a.name.endswith('|Idle'))
rig.animation_data.action = act
if act.slots:
    rig.animation_data.action_slot = act.slots[0]
scene.frame_set(0)

# Bounding box (evaluated, so it accounts for the Idle pose) drives the framing so the longer
# ported body still fits the same four crops the pipeline expects.
dg = bpy.context.evaluated_depsgraph_get()
lo = Vector((1e9,) * 3)
hi = Vector((-1e9,) * 3)
for ob in scene.objects:
    if ob.type != 'MESH':
        continue
    ev = ob.evaluated_get(dg)
    for v in ev.data.vertices:
        p = ev.matrix_world @ v.co
        lo = Vector(map(min, lo, p))
        hi = Vector(map(max, hi, p))
centre = (lo + hi) / 2
size = hi - lo
loc = (centre.x + size.x * .62, centre.y - size.y * .62, centre.z + size.z * .40)
target = (centre.x, centre.y + size.y * .05, centre.z - size.z * .10)
ortho = max(size.x, size.y, size.z) * .82
cam.location = loc
cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.ortho_scale = ortho
for suffix, w, h in [('select.png', 1600, 1200), ('card.png', 800, 600), ('thumb.png', 256, 192), ('png', 1200, 900)]:
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.filepath = str(OUT / ('titanichthys.' + suffix))
    bpy.ops.render.render(write_still=True)
print('TITANICHTHYS_SCULPT_CANDIDATE_PORTRAITS_READY', str(OUT), flush=True)
