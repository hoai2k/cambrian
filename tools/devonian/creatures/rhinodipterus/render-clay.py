"""Neutral clay views of the original Blender anatomy; not deliverable portraits."""
import bpy
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/rhinodipterus'
bpy.ops.wm.open_mainfile(filepath=str(L/'rhinodipterus-v2-clay.blend'));s=bpy.context.scene;rig=next(o for o in s.objects if o.type=='ARMATURE')
for m in bpy.data.materials:
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.24,.28,.29,1)if m.name not in ['eyes','oral']else(.002,.004,.004,1)if m.name=='eyes'else(.055,.054,.052,1);bs.inputs['Roughness'].default_value=.62 if m.name!='eyes'else .17
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.15,.18,.20,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
for loc,power,size in [((3,-4,5),650,4),((-4,-2,2),400,4),((1,5,3),650,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
for label,loc,target,scale in [('side',(7,.5,.4),(0,.55,0),6.3),('dorsal',(0,.5,7),(0,.55,0),8.1),('threequarter',(4,-5,3),(0,.5,0),6.2),('head-front',(0,-5,.3),(0,-1.48,.05),1.55),('head-side',(4,-1.5,.2),(0,-1.5,.05),2.05)]:
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.filepath=str(L/('clay-'+label+'-v2.png'));bpy.ops.render.render(write_still=True)
