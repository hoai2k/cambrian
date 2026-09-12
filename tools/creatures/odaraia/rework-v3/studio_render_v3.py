"""The studio render (public/assets/creatures/<id>.png) for a decoded expansion model.

Same decoded input, framing, pose (TurnLeft frame 17) and lighting as tools/art/render-creatures.py,
which makes the transparent select portrait; this one renders 1200×900 on the flat dark backdrop
the roster's studio renders share (docs/creature-intake.md, step 3 — an opaque backdrop is keyed
from the corner pixel by make-cards.mjs). Run: CAMBRIAN_ART_MODELS=<decoded dir> Blender -b
--python this-file -- <id>."""
import bpy, os, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[4]
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['odaraia']
INPUT=Path(os.environ.get('CAMBRIAN_ART_MODELS','/tmp/cambrian-art-models')).resolve()
OUTPUT=Path(os.environ.get('CAMBRIAN_ART_OUTPUT',str(ROOT/'public/assets/creatures'))).resolve()
for id in ids:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(INPUT/f'{id}.glb'))
 scene=bpy.context.scene
 for obj in scene.objects:
  if obj.type=='ARMATURE':
   obj.animation_data_create()
   action=bpy.data.actions.get('TurnLeft') or bpy.data.actions.get('Swim')
   if action:
    obj.animation_data.action=action
    if action.slots: obj.animation_data.action_slot=action.slots[0]
 scene.frame_set(17); bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get()
 points=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.evaluated_get(deps).bound_box]
 low=Vector(tuple(min(p[i] for p in points) for i in range(3))); high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 center=(low+high)/2; scale=max(high-low)
 bpy.ops.object.camera_add(location=center+Vector((1.05,-1.5,0.9))*scale)
 cam=bpy.context.object; cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'
 inv=cam.rotation_euler.to_matrix().transposed(); proj=[inv@(p-center) for p in points]
 cam.data.ortho_scale=max(max(p.x for p in proj)-min(p.x for p in proj),(max(p.y for p in proj)-min(p.y for p in proj))*4/3)*1.16
 scene.camera=cam
 def light(name,offset,power,color,size):
  bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*scale)
  o=bpy.context.object; o.name=name; o.data.energy=power*scale*scale; o.data.color=color; o.data.shape='DISK'; o.data.size=size*scale
  o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 light('soft key',(0,-1.3,2),180,(.78,.94,1),2); light('teal fill',(-1,-.6,.4),110,(.15,1,.8),1.6); light('coral rim',(.7,1.2,1),320,(1,.19,.26),1.2)
 scene.world=bpy.data.worlds.new('Studio'); scene.world.use_nodes=True
 bg=scene.world.node_tree.nodes['Background']; bg.inputs[0].default_value=(.06,.12,.14,1); bg.inputs[1].default_value=.3
 scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
 scene.render.film_transparent=False; scene.render.resolution_x=1200; scene.render.resolution_y=900; scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGB'
 scene.render.filepath=str(OUTPUT/f'{id}.png'); bpy.ops.render.render(write_still=True)
 print('studio render', scene.render.filepath)
