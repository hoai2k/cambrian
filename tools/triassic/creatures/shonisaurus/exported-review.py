"""Render delivered GLBs after meshopt decode, including lateral propulsion from above."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
P=Path.cwd();L=P/'local/triassic-authoring/shonisaurus';R=L/'review'
for kind in ['full','puppet']:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(L/('shonisaurus.'+kind+'.decoded.glb')))
 scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');actions=list(bpy.data.actions);print('EXPORTED_ACTIONS',[(a.name,list(a.slots))for a in actions],flush=True)
 for track in rig.animation_data.nla_tracks:track.mute=True
 scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.render.resolution_x=700;scene.render.resolution_y=450;scene.view_settings.view_transform='AgX'
 scene.world=bpy.data.worlds.new('Export studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.16,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
 center=Vector((0,0,.05))
 for loc,energy,size in [((5,-5,8),2400,7),((-5,-2,3),1800,6),((1,6,5),2200,5)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=(0,0,12));cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=7.2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.rotation_euler.z+=math.pi/2
 if '--mouth-only' in sys.argv:
  # Cycles normally renders both sides. Explicit backface transparency matches
  # the exported single-sided skin material for this packaged closeup audit.
  for mat in bpy.data.materials:
   if not mat.use_nodes or not mat.use_backface_culling:continue
   nt=mat.node_tree;output=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
   if not output.inputs['Surface'].links:continue
   original=output.inputs['Surface'].links[0].from_socket;geo=nt.nodes.new('ShaderNodeNewGeometry');mix=nt.nodes.new('ShaderNodeMixShader');transparent=nt.nodes.new('ShaderNodeBsdfTransparent');nt.links.new(geo.outputs['Backfacing'],mix.inputs[0]);nt.links.new(original,mix.inputs[1]);nt.links.new(transparent.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],output.inputs['Surface'])
  scene.render.resolution_x=1000;scene.render.resolution_y=700
  for clip,seconds in [('Idle',.35),('Heavy',.35),('Bite',.35),('Eat',.35)]:
   action=next(a for a in actions if a.name==clip or a.name.startswith(clip+'_')or a.name.startswith(clip+'.'));rig.animation_data.action=action
   if action.slots:rig.animation_data.action_slot=action.slots[0]
   scene.frame_set(math.floor(seconds*30),subframe=seconds*30%1)
   for sign in [-1,1]:
    target=Vector((0,-2.4,.02));cam.location=(sign*5,-4,1.0);cam.data.ortho_scale=2.;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(R/(kind+'-packaged-mouth-'+clip+'-'+str(sign)+'.png'));bpy.ops.render.render(write_still=True)
  continue
 for clip in ['Idle','Swim','Sprint','TurnLeft','Dodge','Heavy']:
  action=next(a for a in actions if a.name==clip or a.name.startswith(clip+'_')or a.name.startswith(clip+'.'))
  rig.animation_data.action=action
  if action.slots:rig.animation_data.action_slot=action.slots[0]
  for t in ([0]if clip=='Idle'else[.25,.5,.75]):
   scene.frame_set(round(action.frame_range[0]+(action.frame_range[1]-action.frame_range[0])*t));scene.render.filepath=str(R/(kind+'-export-'+clip+'-'+str(t)+'.png'));bpy.ops.render.render(write_still=True)
