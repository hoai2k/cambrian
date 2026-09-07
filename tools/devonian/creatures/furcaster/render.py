import bpy,os
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/furcaster/v1';Q=L/'renders';Q.mkdir(exist_ok=True)
imp=os.environ.get('FUR_IMPORT')
if imp:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(L/'candidate'/('furcaster.lod1.glb'if imp=='lod'else'furcaster.glb')));Q=L/('review-export-'+imp);Q.mkdir(exist_ok=True)
else:bpy.ops.wm.open_mainfile(filepath=str(L/'furcaster.blend'))
S=bpy.context.scene;rig=bpy.data.objects['Furcaster'];S.render.engine=os.environ.get('FUR_ENGINE','BLENDER_EEVEE');S.cycles.samples=8;S.cycles.use_denoising=True;S.render.resolution_x=960;S.render.resolution_y=720;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGBA';S.render.film_transparent=True;S.view_settings.view_transform='AgX'
if not S.world:S.world=bpy.data.worlds.new('Neutral studio')
S.world.use_nodes=True;bg=S.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.20,.23,.25,1);bg.inputs[1].default_value=.45
for n,p,e,col,size in [('Key',(3,-3,5),800,(1,.94,.87),4),('Fill',(-3,-2,3),500,(.86,.92,1),4),('Rim',(1,4,4),900,(.89,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=e;o.data.color=col;o.data.size=size;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';S.camera=cam
if imp and rig.animation_data:
 for tr in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(tr)
def render(clip,fr,name,p=(3,-4,6),target=(0,0,0),scale=7.0):
 act=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('|'+clip));rig.animation_data.action=act
 if imp and act.slots:rig.animation_data.action_slot=act.slots[0]
 S.frame_set(fr-1 if imp else fr);cam.location=p;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;S.render.filepath=str(Q/(name+'.png'));bpy.ops.render.render(write_still=True)
mode=os.environ.get('FUR_RENDER','quick')
if mode=='quick':render('Idle',1,'clay-threequarter');render('Idle',1,'clay-dorsal',(0,0,6),scale=8.6)
if mode=='preview':
 render('Idle',1,'threequarter');render('Idle',1,'dorsal',(0,0,6),scale=8.6);render('Idle',1,'side',(5,0,1),scale=7);render('Idle',1,'arm-detail',(1.6,-1.6,1.8),(.05,-1.1,.02),1.6)
 for clip,fr in [('Crawl',19),('Swim',19),('Bite',6),('Eat',14),('Heavy',17),('Guard',16),('Ability',33),('Dodge',5),('Death',49)]:render(clip,fr,'action-'+clip)
 bpy.ops.object.light_add(type='AREA',location=(0,0,-1));o=bpy.context.object;o.data.energy=75;o.data.size=1;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler();render('Eat',14,'oral',(0,-.2,-2),(0,0,-.04),1.65);render('Idle',1,'ventral',(2,-2,-5),(0,0,0),7.5)
if mode=='lod':
 for clip,fr in [('Idle',1),('Crawl',19),('Swim',19),('Death',49)]:render(clip,fr,'lod-'+clip)
if mode=='portrait':S.render.resolution_x=1600;S.render.resolution_y=1200;S.cycles.samples=16;render('Idle',1,'selection',scale=7.2)
if mode=='sequence':
 S.render.resolution_x=720;S.render.resolution_y=540;S.cycles.samples=8
 for clip,frames in [('Crawl',[1,10,19,28,37]),('Heavy',[1,8,18,27,34]),('Ability',[1,17,33,56,73])]:
  for fr in frames:render(clip,fr,f'sequence-{clip}-{fr:02d}',(0,0,6),scale=8.6)
print('FURCASTER_RENDER_COMPLETE',mode,flush=True)
