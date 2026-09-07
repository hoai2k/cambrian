"""Candidate/source specimen, exact action and dynamic sequence review."""
import bpy,os
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/stethacanthus/v2';Q=L/'renders';Q.mkdir(exist_ok=True);imported=os.environ.get('STETH_IMPORT')
if imported:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(L/'candidate'/('stethacanthus.lod1.glb'if imported=='lod'else'stethacanthus.glb')));Q=L/('review-export-'+imported);Q.mkdir(exist_ok=True)
else:bpy.ops.wm.open_mainfile(filepath=str(L/'stethacanthus-v2.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['Stethacanthus']
if not scene.world:scene.world=bpy.data.worlds.new('Neutral studio')
if imported:
 for tr in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(tr)
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_x=1100;scene.render.resolution_y=825;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.16,.18,.20,1);bg.inputs[1].default_value=.6
for name,p,E,col,size in [('Neutral key',(3,-3,4),720,(1,.95,.89),4),('Broad fill',(-3,-2,2),530,(.85,.92,1),4),('Soft rim',(1,3,3),790,(.89,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=E;o.data.color=col;o.data.size=size;o.rotation_euler=(Vector((0,.6,.2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam

def render(clip,fr,file,loc=(5,-3.7,2.8),target=(0,.70,.15),scale=5.6):
 if bpy.data.actions:
  act=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('|'+clip));rig.animation_data.action=act
  if imported and act.slots:rig.animation_data.action_slot=act.slots[0]
 scene.frame_set(fr-1 if imported else fr);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(Q/(file+'.png'));bpy.ops.render.render(write_still=True)
mode=os.environ.get('STETH_RENDER','clay')
if mode in ['clay','preview','all','specimen']:
 render('Idle',1,'threequarter')
 for file,loc,target,scale in [('side',(6,.75,.15),(0,.75,.15),5.5),('dorsal',(0,.65,6),(0,.65,.1),6.7),('front',(0,-5,.35),(0,-.25,.16),2.7),('eye-oblique',(2,-2.3,.70),(.235,-1.31,.14),.52),('mouth',(0,-3,.02),(0,-1.52,.02),.7)]:render('Idle',1,file,loc,target,scale)
if mode in ['all','specimen','portrait']:
 scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.cycles.samples=48;render('Idle',1,'selection');scene.render.resolution_x=1100;scene.render.resolution_y=825;scene.cycles.samples=20
if mode in ['all','actions']:
 scene.render.resolution_x=1000;scene.render.resolution_y=750;scene.cycles.samples=12
 for clip,fr in [('Idle',1),('Swim',19),('TurnLeft',19),('TurnRight',19),('Dive',18),('Rise',18),('Attack',15),('Bite',6),('Heavy',15),('Guard',16),('Parry',5),('Dodge',6),('Hit',9),('Stagger',16),('Death',49),('Eat',15),('Ability',28),('Growth',23)]:render(clip,fr,'action-'+clip)
if mode=='oral-lit':
 scene.render.resolution_x=960;scene.render.resolution_y=720;scene.cycles.samples=12
 bpy.ops.object.light_add(type='AREA',location=(0,-2.6,.4));o=bpy.context.object;o.data.energy=45;o.data.size=.8;o.rotation_euler=(Vector((0,-1.15,0))-o.location).to_track_quat('-Z','Y').to_euler()
 for clip,fr in [('Idle',1),('Bite',6),('Bite',11),('Heavy',15),('Heavy',23),('Eat',14),('Attack',13)]:render(clip,fr,'lit-'+clip+'-'+str(fr),(0,-3,.07),(0,-1.39,-.055),.8)
 render('Heavy',15,'lit-oblique',(1,-2.6,.4),(0,-1.25,-.04),1.1)
if mode=='motion':
 scene.render.resolution_x=640;scene.render.resolution_y=480;scene.cycles.samples=8
 for clip,step,F in [('Swim',4,73),('TurnLeft',3,49),('Heavy',2,34),('Dodge',1,13),('Eat',3,49),('Death',3,49),('Ability',4,73)]:
  for fr in range(1,F+1,step):render(clip,fr,clip+'-'+str(fr).zfill(3))
if mode=='lod':
 for clip,fr in [('Idle',1),('Swim',19),('Death',49)]:render(clip,fr,'lod-'+clip)
 render('Idle',1,'lod-eye',(2,-2.3,.70),(.235,-1.31,.14),.52)
if mode=='quick':
 render('Idle',1,'threequarter');render('Idle',1,'side',(6,.75,.15),(0,.75,.15),5.5);render('Idle',1,'mouth',(0,-3,.02),(0,-1.52,.02),.7);render('Dodge',6,'action-Dodge')
if mode=='attachments':
 for clip,fr in [('Idle',1),('Swim',19),('Dodge',6),('Heavy',15),('Ability',28)]:render(clip,fr,'attachment-'+clip,(3,-.3,1.5),(0,.3,.28),2.8)
print('STETH_RENDER_COMPLETE',mode,flush=True)
