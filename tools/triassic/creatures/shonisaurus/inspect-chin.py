"""Verify the apparent under-chin projection by isolating the far pectoral."""
import bpy,json
from pathlib import Path
from mathutils import Vector
P=Path.cwd();L=P/'local/triassic-authoring/shonisaurus';R=L/'review'
bpy.ops.wm.open_mainfile(filepath=str(L/'shonisaurus.shared-rig.blend'))
s=bpy.context.scene;rig=next(o for o in s.objects if o.type=='ARMATURE');rig.animation_data.action=bpy.data.actions['Idle'];s.frame_set(0)
for o in s.objects:
 if o.type=='MESH':o.hide_render=o.name.startswith('Shonisaurus authored')
s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.use_denoising=True;s.render.resolution_x=1000;s.render.resolution_y=750;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Chin inspection');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.16,1)
for loc,energy,size in [((5,-5,8),2400,7),((-5,-2,3),1800,6),((1,6,5),2200,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(8,-9,5));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=7.3;cam.rotation_euler=(Vector((0,0,.02))-cam.location).to_track_quat('-Z','Y').to_euler()
for name,hidden in [('chin-far-fin-present',False),('chin-far-fin-hidden',True)]:
 bpy.data.objects['Puppet pectoral R'].hide_render=hidden;s.render.filepath=str(R/(name+'.png'));bpy.ops.render.render(write_still=True)
# Isolate the mouth from every fin in an underside view.
for o in s.objects:
 if o.type=='MESH':o.hide_render=o.name.startswith('Shonisaurus authored')or any(k in o.name for k in ['pectoral','pelvic'])
cam.location=(5,-3,-2.2);target=Vector((0,-2.3,-.02));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.5;s.render.filepath=str(R/'chin-underside-no-fins.png');bpy.ops.render.render(write_still=True)
