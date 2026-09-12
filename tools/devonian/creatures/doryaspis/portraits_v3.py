"""V3 delivery portraits: the four named PNGs check.mjs and the catalogue expect.

Imports the candidate GLB (never the source blend), so the portraits show
exactly what ships.  Framing follows bothriolepis/portraits_v3.py's studio, but
the ortho scale is measured off the imported bounding box rather than hard-coded,
because the V3 body is 6.35 units long against V2's 4.4.  Writes only into
v3-candidate/.
"""
import bpy
from pathlib import Path
from mathutils import Vector

H = Path(__file__).resolve().parent
R = H.parents[3]
OUT = R.parent / 'devonian-authoring/doryaspis/v3-candidate'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(OUT / 'doryaspis.glb'))
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
if rig.animation_data:
    for tr in list(rig.animation_data.nla_tracks):
        rig.animation_data.nla_tracks.remove(tr)
if not scene.world:
    scene.world = bpy.data.worlds.new('Neutral studio')
scene.render.engine = 'CYCLES'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get('Background')
bg.inputs[0].default_value = (.13, .16, .18, 1)
bg.inputs[1].default_value = .45
for name, p, energy, col, size in [('Large warm key', (4, -5, 6), 900, (1, .93, .82), 5),
                                   ('Soft blue fill', (-4, -1.5, 3), 520, (.78, .9, 1), 4),
                                   ('Broad rear rim', (1.5, 5, 4), 900, (.87, .95, 1), 4)]:
    bpy.ops.object.light_add(type='AREA', location=p)
    o = bpy.context.object
    o.name = name
    o.data.energy = energy
    o.data.color = col
    o.data.shape = 'DISK'
    o.data.size = size
    o.rotation_euler = (Vector((0, .3, 0)) - o.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = 'ORTHO'
scene.camera = cam
rig.animation_data_create()
act = next(a for a in bpy.data.actions
           if a.name == 'Idle' or a.name.endswith('|Idle') or a.name.endswith('_Idle'))
rig.animation_data.action = act
if act.slots:
    rig.animation_data.action_slot = act.slots[0]
scene.frame_set(1)
bpy.context.view_layer.update()

lo = Vector((1e9,) * 3)
hi = Vector((-1e9,) * 3)
dg = bpy.context.evaluated_depsgraph_get()
for ob in scene.objects:
    if ob.type != 'MESH':
        continue
    me = ob.evaluated_get(dg).to_mesh()
    for v in me.vertices:
        w = ob.matrix_world @ v.co
        lo = Vector(map(min, lo, w))
        hi = Vector(map(max, hi, w))
    ob.evaluated_get(dg).to_mesh_clear()
target = (lo + hi) * .5
cam.location = target + Vector((4.6, -5.2, 3.4))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
bpy.context.view_layer.update()
basis = cam.matrix_world.to_3x3().transposed()
corners = [basis @ Vector((x, y, z)) for x in (lo.x, hi.x) for y in (lo.y, hi.y)
           for z in (lo.z, hi.z)]
span = max(max(c.x for c in corners) - min(c.x for c in corners),
           (max(c.y for c in corners) - min(c.y for c in corners)) * 4 / 3)
cam.data.ortho_scale = span / .92
for suffix, w, h in [('select.png', 1600, 1200), ('card.png', 800, 600),
                     ('thumb.png', 256, 192), ('png', 1200, 900)]:
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.filepath = str(OUT / ('doryaspis.' + suffix))
    bpy.ops.render.render(write_still=True)
print('DORYASPIS_V3_PORTRAITS_READY', str(OUT), flush=True)
