"""Identical geometry/camera/lighting, isolating vertex bake vs source albedo and relief."""
import bpy,json
from pathlib import Path
from mathutils import Vector
P=Path.cwd();L=P/'local/triassic-authoring/shonisaurus';O=L/'lip-material-fix';bpy.ops.wm.open_mainfile(filepath=str(O/'before.blend'))
s=bpy.context.scene;r=next(o for o in s.objects if o.type=='ARMATURE');r.animation_data.action=bpy.data.actions['Idle'];s.frame_set(0)
for o in s.objects:
 if o.type=='MESH':o.hide_render=o.name.startswith('Puppet')
body=bpy.data.objects['Shonisaurus authored skin'];mat=body.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE'and n.image and n.image.name.startswith('Color'));vc=next(n for n in mat.node_tree.nodes if n.type=='VERTEX_COLOR');normal=next(n for n in mat.node_tree.nodes if n.type=='NORMAL_MAP')
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1300;s.render.resolution_y=900;s.render.resolution_percentage=100;s.world=bpy.data.worlds.new('Neutral studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.16,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,energy,size in [((5,-5,8),2400,7),((-5,-2,3),1800,6),((1,6,5),2200,5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(8,-3,3));cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=6.7;cam.rotation_euler=(Vector((0,-.3,0))-cam.location).to_track_quat('-Z','Y').to_euler()
for name,mode,strength in [('01-before-vertex-normal1','vertex',1),('02-vertex-flat','vertex',0),('03-source-albedo-flat','source',0),('04-source-albedo-normal015','source',.15),('05-neutral-smooth','neutral',0)]:
 for link in list(bs.inputs['Base Color'].links):mat.node_tree.links.remove(link)
 if mode!='neutral':mat.node_tree.links.new((vc if mode=='vertex'else tex).outputs['Color'],bs.inputs['Base Color'])
 else:bs.inputs['Base Color'].default_value=(.26,.30,.33,1)
 normal.inputs['Strength'].default_value=strength;bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.7
 s.render.filepath=str(O/(name+'.png'));bpy.ops.render.render(write_still=True)
tex.image.filepath_raw=str(O/'source-albedo.png');tex.image.file_format='PNG';tex.image.save()
