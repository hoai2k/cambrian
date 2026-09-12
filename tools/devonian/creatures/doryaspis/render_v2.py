"""Render local Doryaspis candidate and exact action reviews; never touches public files."""
import bpy,os
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/doryaspis/v2';Q=L/'review';Q.mkdir(exist_ok=True)
imported=os.environ.get('DORY_IMPORT')
if imported:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(L/'candidate'/('doryaspis.lod1.glb'if imported=='lod'else'doryaspis.glb')));Q=L/('review-export-'+imported);Q.mkdir(exist_ok=True)
else:bpy.ops.wm.open_mainfile(filepath=str(L/'doryaspis-v2.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Doryaspis']
if not scene.world:scene.world=bpy.data.worlds.new('Neutral studio')
if imported:
 for tr in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(tr)

scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_x=1100;scene.render.resolution_y=825;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.15,.17,.18,1);bg.inputs[1].default_value=.5
for name,p,E,col,size in [('Neutral key',(2,-3,4),650,(1,.95,.89),3.5),('Broad fill',(-3,-2,1.8),470,(.80,.89,1),4),('Soft rim',(1,3,3),760,(.86,.93,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=E;o.data.color=col;o.data.size=size;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam

def render(clip,fr,file,loc=(3,-4,3),target=(0,.45,-.04),scale=4.9):
 act=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('|'+clip));rig.animation_data.action=act
 if imported and act.slots:rig.animation_data.action_slot=act.slots[0]
 scene.frame_set(fr-1 if imported else fr);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(Q/(file+'.png'));bpy.ops.render.render(write_still=True)
mode=os.environ.get('DORY_RENDER','preview')
if mode in ['preview','all','specimen']:
 render('Idle',1,'threequarter')
 for file,loc,target,scale in [('side',(4,.2,.04),(0,.50,-.07),4.8),('dorsal',(0,.45,5),(0,.45,0),6.1),('front',(0,-4,.30),(0,-.1,-.07),3.2),('mouth',(0,-3,1.65),(0,-.96,.04),.90),('eye-oblique',(1,-2,1.6),(.255,-.846,.096),.32),('eye-side',(3,-.84,.38),(.255,-.846,.096),.33)]:render('Idle',1,file,loc,target,scale)
if mode in ['all','specimen']:
 scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.cycles.samples=48;render('Idle',1,'selection');scene.render.resolution_x=1100;scene.render.resolution_y=825;scene.cycles.samples=20
if mode=='neck':
 for clip,fr in [('Idle',1),('Swim',19),('Dodge',6),('TurnLeft',19)]:render(clip,fr,'neck-'+clip,(1.5,1.4,.6),(0,.60,-.03),1.15)
if mode=='lod':
 for clip,fr in [('Idle',1),('Swim',19),('Death',49)]:render(clip,fr,'lod-'+clip)
if mode=='quick':
 render('Idle',1,'threequarter');render('Idle',1,'side',(4,.2,.04),(0,.50,-.07),4.8);render('Dodge',6,'action-Dodge');render('Dive',18,'action-Dive')
if mode in ['all','actions']:
 for clip,fr in [('Idle',1),('Swim',19),('TurnLeft',19),('TurnRight',19),('Dive',18),('Rise',18),('Attack',15),('Bite',6),('Heavy',19),('Guard',16),('Parry',5),('Dodge',6),('Hit',9),('Stagger',16),('Death',49),('Eat',25),('Ability',28),('Growth',23)]:render(clip,fr,'action-'+clip)
 for clip,fr in [('Bite',6),('Eat',9),('Heavy',16),('Attack',14),('Ability',30)]:render(clip,fr,'oral-'+clip,(0,-3,1.65),(0,-.96,.04),.90)
if mode=='oral-lit':
 bpy.ops.object.light_add(type='AREA',location=(0,-1.6,1.5));o=bpy.context.object;o.data.energy=55;o.data.size=.8;o.rotation_euler=(Vector((0,-.94,.08))-o.location).to_track_quat('-Z','Y').to_euler()
 render('Bite',6,'lit-oblique',(.5,-1.6,.75),(0,-.94,.03),.65)
 for clip,fr in [('Idle',1),('Bite',6),('Bite',12),('Eat',9),('Heavy',16)]:render(clip,fr,'lit-'+clip+'-'+str(fr),(0,-2,2.8),(0,-.94,.06),.70)
if mode=='motion':
 scene.render.resolution_x=640;scene.render.resolution_y=480;scene.cycles.samples=8
 for clip,step,F in [('Swim',4,73),('TurnLeft',3,49),('Heavy',2,34),('Dodge',1,13),('Eat',3,49),('Death',3,49),('Ability',4,73)]:
  for fr in range(1,F+1,step):render(clip,fr,clip+'-'+str(fr).zfill(3))
print('DORYASPIS_RENDER_COMPLETE',mode)
