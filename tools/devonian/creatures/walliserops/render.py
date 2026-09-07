import bpy,os
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/walliserops/v2';Q=L/'renders';Q.mkdir(exist_ok=True)
imported=os.environ.get('WAL_IMPORT')
if imported:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(L/'candidate'/('walliserops.lod1.glb'if imported=='lod'else'walliserops.glb')));Q=L/('review-export-'+imported);Q.mkdir(exist_ok=True)
else:bpy.ops.wm.open_mainfile(filepath=str(L/'walliserops-v2.blend'))
S=bpy.context.scene;rig=bpy.data.objects['Walliserops'];S.render.engine='CYCLES';S.cycles.samples=16;S.cycles.use_denoising=True;S.render.resolution_x=1200;S.render.resolution_y=900;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGBA';S.render.film_transparent=True;S.view_settings.view_transform='AgX'
if not S.world:S.world=bpy.data.worlds.new('Neutral studio')
S.world.use_nodes=True;bg=S.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.20,.23,.25,1);bg.inputs[1].default_value=.5
for name,p,E,col,size in [('Key',(3,-3,5),850,(1,.94,.87),4),('Fill',(-3,-2,3),550,(.86,.92,1),4),('Rim',(1,4,4),950,(.89,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=E;o.data.color=col;o.data.size=size;o.rotation_euler=(Vector((0,0,.1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';S.camera=cam

if imported and rig.animation_data:
 for tr in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(tr)
def render(clip,fr,file,loc=(4,-4,3.8),target=(0,-.55,.15),scale=6.7):
 act=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('|'+clip));rig.animation_data.action=act
 if imported and act.slots:rig.animation_data.action_slot=act.slots[0]
 S.frame_set(fr-1 if imported else fr);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;S.render.filepath=str(Q/(file+'.png'));bpy.ops.render.render(write_still=True)
mode=os.environ.get('WAL_RENDER','clay')
if mode in ['clay','all']:
 render('Idle',1,'clay-threequarter');render('Idle',1,'clay-side',(5,0,.5),(0,-.55,.05),6.7);render('Idle',1,'clay-dorsal',(0,0,6),(0,0,0),5.5);render('Idle',1,'clay-front',(0,-5,.8),(0,-.7,.15),2.7);render('Idle',1,'clay-eye',(2,-1.4,1.1),(.68,-.59,.30),.70);render('Idle',1,'clay-ventral',(3,-2,-5),(0,.1,0),4.9);render('Ability',30,'clay-enrolled',(4,-2,1.8),(0,-.5,-.4),3.4);render('Ability',30,'clay-enrolled-side',(5,-.4,-.3),(0,-.4,-.3),3.2)
if mode=='quick':render('Idle',1,'clay-threequarter');render('Ability',30,'clay-enrolled-side',(5,-.4,-.3),(0,-.4,-.3),3.2)
if mode=='preview':
 render('Idle',1,'threequarter');render('Idle',1,'side',(5,0,.5),(0,-.55,.05),6.7);render('Idle',1,'dorsal',(0,0,6),(0,-.55,0),9.2);render('Idle',1,'front',(0,-5,.6),(0,-.7,.05),2.7);render('Idle',1,'eye',(2,-1.4,1.1),(.70,-.59,.25),.75)
 for clip,fr in [('Crawl',19),('Swim',19),('Bite',6),('Eat',14),('Heavy',16),('Guard',16),('Ability',36),('Dodge',5),('Death',49)]:render(clip,fr,'action-'+clip)
 bpy.ops.object.light_add(type='AREA',location=(0,-.25,-1));o=bpy.context.object;o.data.energy=60;o.data.size=.8;o.rotation_euler=(Vector((0,-.6,.05))-o.location).to_track_quat('-Z','Y').to_euler();render('Eat',14,'oral-ventral',(0,.2,-1.4),(0,-.64,.05),1.1)
if mode=='dorsal':render('Idle',1,'dorsal',(0,0,6),(0,-.55,0),9.2)
if mode=='sequence':
 S.render.resolution_x=720;S.render.resolution_y=540;S.cycles.samples=8
 for clip,frames in [('Heavy',[1,8,18,27,34]),('Ability',[1,14,33,55,73]),('Crawl',[1,10,19,28])]:
  for fr in frames:render(clip,fr,f'sequence-{clip}-{fr:02d}',(5,0,.55),(0,-.55,.12),6.8)
if mode=='portrait':
 S.render.resolution_x=1600;S.render.resolution_y=1200;S.cycles.samples=32;render('Idle',1,'selection',scale=7.0)
if mode=='lod':
 for clip,fr in [('Idle',1),('Crawl',19),('Swim',19),('Death',49)]:render(clip,fr,'lod-'+clip)
 render('Idle',1,'lod-eye',(2,-1.4,1.1),(.70,-.59,.25),.75)
print('WALLISEROPS_RENDER_COMPLETE',mode,flush=True)
