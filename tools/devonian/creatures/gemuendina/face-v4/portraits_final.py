"""Four delivery portraits rendered from the final position-transplanted gemuendina.glb, standalone
(no candidate-report.json / frozen production .blend dependency -- those belong to the sculpt-port
pipeline's own intermediate outputs, not to this file). Camera framing matches
render_candidate_06.py's own portrait shot (Idle pose, same camera/target/scale) so the delivered
crops read the same; lighting is a fresh three-point rig, as titanichthys/sculpt-port/portraits.py
already does for the same purpose.

    /opt/blender/blender --background --python tools/devonian/creatures/gemuendina/face-v4/portraits_final.py
"""
import bpy
from pathlib import Path
from mathutils import Vector

OUT = Path('/home/user/devonian-authoring/gemuendina/sculpt-final')
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(OUT / 'gemuendina.glb'))
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
for tr in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(tr)

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.cycles.samples = 32
scene.cycles.seed = 71204
scene.cycles.use_animated_seed = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'

world = bpy.data.worlds.new('Neutral studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.08, .09, .10, 1)
scene.world = world

for name, p, E, size, col in [('Key_softbox', (-4, -5, 7), 1050, 5.0, (1, .93, .83)),
                               ('Fill_softbox', (4, 0, 4), 600, 4.0, (.85, .92, 1)),
                               ('Rear_rim', (-2, 5, 5), 850, 3.8, (1, .96, .88))]:
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = E
    data.shape = 'DISK'
    data.size = size
    data.color = col
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = p
    obj.rotation_euler = (Vector((0, -1.4, .15)) - obj.location).to_track_quat('-Z', 'Y').to_euler()

bpy.ops.object.camera_add()
cam = bpy.context.object
cam.data.type = 'ORTHO'
scene.camera = cam
act = next(a for a in bpy.data.actions if a.name == 'Idle' or a.name.endswith('|Idle'))
rig.animation_data.action = act
if act.slots:
    rig.animation_data.action_slot = act.slots[0]
scene.frame_set(0)

camera, target, ortho_scale = (7, -7.8, 6.4), (0, .70, .10), 7.0
cam.location = camera
cam.rotation_euler = (Vector(target) - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.ortho_scale = ortho_scale

for name, w, h, alpha in [('gemuendina.select.png', 1600, 1200, True), ('gemuendina.card.png', 800, 600, True),
                           ('gemuendina.thumb.png', 256, 192, True), ('gemuendina.png', 1600, 1200, False)]:
    scene.render.resolution_x = w
    scene.render.resolution_y = h
    scene.render.film_transparent = alpha
    scene.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True)
    print('GEMUENDINA_SCULPT_FINAL_PORTRAIT_OK ' + name, flush=True)
print('GEMUENDINA_SCULPT_FINAL_PORTRAITS_READY', str(OUT), flush=True)
