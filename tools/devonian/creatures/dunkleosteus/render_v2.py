"""Render independent exact-pose reviews from the saved final Blender source."""
import bpy,os,json
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];O=R/'public/assets/devonian/creatures';L=R.parent/'devonian-authoring/dunkleosteus/v2';Q=L/'final-review';Q.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(L/'dunkleosteus-v2.blend'));scene=bpy.context.scene;rig=bpy.data.objects['Dunkleosteus']
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=750;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.15,.17,.19,1);bg.inputs[1].default_value=.5
for n,p,E,col,size in [('Neutral key',(2,-3,4),600,(1,.95,.88),3.5),('Soft fill',(-3,-2,1.0),440,(.80,.89,1),4),('Broad rim',(1,3,3),700,(.8,.9,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=E;o.data.color=col;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
def render(name,frame,file,loc=(4,-4,1.7),target=(0,.12,0),scale=4.25):
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(file);bpy.ops.render.render(write_still=True)
mode=os.environ.get('DUNK_RENDER','all')
if mode=='feeding':
 for clip,fr,suffix,loc in [('Eat',19,'eat-closeup',(0,-4,.04)),('Attack',11,'attack-closeup',(2,-3,.2)),('Ability',21,'ability-closeup',(0,-4,.04))]:render(clip,fr,Q/(suffix+'.png'),loc,(0,-.96,-.17),1.8)
if mode=='palate':
 bpy.ops.object.light_add(type='AREA',location=(0,-3,-.15));o=bpy.context.object;o.data.energy=140;o.data.size=1.5;o.rotation_euler=(Vector((0,-.65,-.1))-o.location).to_track_quat('-Z','Y').to_euler()
 render('Heavy',15,Q/'palate-lit.png',(0,-4,-.5),(0,-.82,-.10),1.55)
 render('Heavy',15,Q/'oral-lit-oblique.png',(1,-4,-.12),(0,-.82,-.10),1.55)
if mode=='quick':
 scene.cycles.samples=12
 render('Heavy',15,Q/'quick-front.png',(0,-4,.04),(0,-.96,-.17),1.80)
 render('Heavy',15,Q/'quick-oblique.png',(2,-3,.2),(0,-.96,-.17),1.80)
if mode in ['mouth','all']:
 for name,frame,suffix,loc in [('Heavy',15,'open-front',(0,-4,.04)),('Heavy',15,'open-oblique',(2,-3,.2)),('Heavy',22,'closing-oblique',(2,-3,.2)),('Bite',6,'bite',(2,-3,.2)),('Eat',19,'eat-closeup',(0,-4,.04))]:render(name,frame,Q/(suffix+'.png'),loc,(0,-.96,-.17),1.80)
if mode in ['specimen','all']:
 scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.cycles.samples=48;render('Idle',1,O/'dunkleosteus.select.png')
 scene.render.resolution_x=1100;scene.render.resolution_y=825;scene.cycles.samples=24
 for file,loc,target,scale in [('side',(4,0,.10),(0,.10,0),3.90),('front',(0,-5,.12),(0,-.5,0),2.4),('dorsal',(0,.2,5),(0,.1,0),4.95),('eye-side',(3,-1.23,.15),(.29,-1.23,.15),.40),('eye-front',(1,-3,.3),(.30,-1.22,.15),.50)]:render('Idle',1,Q/(file+'.png'),loc,target,scale)
if mode in ['actions','all']:
 scene.render.resolution_x=800;scene.render.resolution_y=600;scene.cycles.samples=16
 for name,fr in [('Idle',1),('Swim',17),('Attack',14),('Heavy',15),('Guard',16),('Dodge',6),('Death',49),('Ability',20),('Eat',19)]:render(name,fr,Q/(name+'.png'))
if mode=='playback':
 scene.render.resolution_x=640;scene.render.resolution_y=480;scene.cycles.samples=8
 for clip,frames in [('Swim',range(1,74,6)),('Heavy',range(1,35,3)),('Dodge',range(1,14,1)),('Eat',range(1,38,3)),('TurnLeft',range(1,50,4)),('Death',range(1,50,4))]:
  for fr in frames:render(clip,fr,Q/(clip+'-'+str(fr).zfill(3)+'.png'))
print('DUNKLEOSTEUS_V2_REVIEW_COMPLETE',mode)
