"""Render source GLBs into transparent 1600x1200 roster portraits.
Run decode-models.mjs first, then Blender -b --python this-file -- [IDs...].
No IDs preserves the original eight. CAMBRIAN_ART_MODELS must match decoding.
"""
import bpy, math, os, sys, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
ORIGINALS=['waptia','anomalocaris','canadia','hallucigenia','marrella','olenoides','opabinia','wiwaxia']
EXPANSION=['pikaia','nectocaris','burgessomedusa','odaraia','ottoia','cambroraster','sidneyia','leanchoilia','isoxys','odontogriphus','ctenorhabdotus','vetulicola','tamisiocaris']
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
ids=list(dict.fromkeys(requested or ORIGINALS))
assert all(id in ORIGINALS+EXPANSION for id in ids), 'Unknown creature ID'
INPUT=Path(os.environ.get('CAMBRIAN_ART_MODELS','/tmp/cambrian-art-models')).resolve()
OUTPUT=Path(os.environ.get('CAMBRIAN_ART_OUTPUT',str(ROOT/'public/assets/creatures'))).resolve()
OUTPUT.mkdir(parents=True,exist_ok=True)
for id in ids:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(INPUT/f'{id}.glb'))
 scene=bpy.context.scene
 for obj in list(scene.objects):
  if obj.name == 'Icosphere': bpy.data.objects.remove(obj,do_unlink=True)
 for obj in scene.objects:
  if obj.type=='ARMATURE':
   obj.animation_data_create()
   for track in obj.animation_data.nla_tracks: track.mute=True
   action=bpy.data.actions.get('TurnLeft') or bpy.data.actions.get('Swim')
   if action:
    obj.animation_data.action=action
    if action.slots: obj.animation_data.action_slot=action.slots[0]
 scene.frame_set(17)
 bpy.context.view_layer.update()
 deps=bpy.context.evaluated_depsgraph_get()
 points=[o.matrix_world@Vector(c) for o in scene.objects if o.type=='MESH' for c in o.evaluated_get(deps).bound_box]
 assert points, f'{id}: no renderable mesh geometry'
 low=Vector(tuple(min(p[i] for p in points) for i in range(3)))
 high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
 center=(low+high)/2; scale=max(high-low)
 bpy.ops.object.camera_add(location=center+Vector((1.05,-1.5,0.9))*scale)
 cam=bpy.context.object; cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO'
 inv=cam.rotation_euler.to_matrix().transposed()
 proj=[inv@(p-center) for p in points]
 cam.data.ortho_scale=max(max(p.x for p in proj)-min(p.x for p in proj),(max(p.y for p in proj)-min(p.y for p in proj))*4/3)*1.16
 scene.camera=cam
 def light(name,offset,power,color,size):
  bpy.ops.object.light_add(type='AREA',location=center+Vector(offset)*scale)
  o=bpy.context.object;o.name=name;o.data.energy=power*scale*scale;o.data.color=color;o.data.shape='DISK';o.data.size=size*scale;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 if os.environ.get('CAMBRIAN_ART_PALETTE_LIGHTING')=='1':
  # Neutral dominant illumination keeps palette differences legible in small images.
  light('soft key',(0,-1.3,2),65,(1,.97,.93),2)
  light('teal fill',(-1,-.6,.4),20,(.35,.8,1),1.6)
  light('coral rim',(.7,1.2,1),45,(1,.45,.35),1.2)
 else:
  light('soft key',(0,-1.3,2),180,(.78,.94,1),2)
  light('teal fill',(-1,-.6,.4),110,(.15,1,.8),1.6)
  light('coral rim',(.7,1.2,1),320,(1,.19,.26),1.2)
 scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.06,.12,.14,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
 scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
 scene.render.film_transparent=True;scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
 scene.render.filepath=str(OUTPUT/f'{id}.select.png')
 bpy.ops.render.render(write_still=True)
 # Keep the posed studio scene beside decoded inputs for repeatable review.
 if id in EXPANSION:
  bpy.ops.wm.save_as_mainfile(filepath=str(INPUT.parent/f'{id}.portrait.blend'))
  report={'id':id,'source':str(INPUT/f'{id}.glb'),'output':scene.render.filepath,'resolution':[1600,1200],'transparent':True,'frame':17,'action':action.name if action else None,'orthographicScale':cam.data.ortho_scale,'lighting':'existing roster soft-key / teal-fill / coral-rim'}
  (INPUT.parent/f'{id}.portrait.json').write_text(json.dumps(report,indent=2))
