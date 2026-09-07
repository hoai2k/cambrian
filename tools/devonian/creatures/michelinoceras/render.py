import bpy,os
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/michelinoceras/v1';Q=L/'renders';Q.mkdir(exist_ok=True)
imp=os.environ.get('MIC_IMPORT')
if imp:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(L/'candidate'/('michelinoceras.lod1.glb'if imp=='lod'else'michelinoceras.glb')));Q=L/('review-export-'+imp);Q.mkdir(exist_ok=True)
else:bpy.ops.wm.open_mainfile(filepath=str(L/('michelinoceras-clay.blend'if os.environ.get('MIC_CLAY')=='1'else'michelinoceras.blend')))
S=bpy.context.scene;rig=bpy.data.objects['Michelinoceras'];S.render.engine=os.environ.get('MIC_ENGINE','BLENDER_EEVEE');S.cycles.samples=8;S.cycles.use_denoising=True;S.render.resolution_x=960;S.render.resolution_y=720;S.render.resolution_percentage=100;S.render.image_settings.file_format='PNG';S.render.image_settings.color_mode='RGBA';S.render.film_transparent=True;S.view_settings.view_transform='AgX'
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
mode=os.environ.get('MIC_RENDER','quick')
if mode=='sourcecheck':
 import json,hashlib
 actions={a.name:a.use_fake_user for a in bpy.data.actions};assert len(actions)==19 and all(actions.values());(H/'source-validation.json').write_text(json.dumps({'sourceBlend':str(L/'michelinoceras.blend'),'sha256':hashlib.sha256((L/'michelinoceras.blend').read_bytes()).hexdigest(),'persistedActions':actions,'boneCount':len(rig.data.bones)},indent=2)+'\n')
if mode=='dorsal':render('Idle',1,'dorsal',(0,0,7),(0,.3,0),9.2)
if mode=='quick':render('Idle',1,'threequarter',(4,-6,4),(0,.3,0),7.0);render('Idle',1,'side',(6,0,1),(0,.3,0),7.0);render('Idle',1,'head-detail',(2,-4,1.3),(0,-1.55,0),1.7)
if mode in ['preview','all']:
 render('Idle',1,'threequarter',(4,-6,4),(0,.3,0),7.0);render('Idle',1,'dorsal',(0,0,7),(0,.3,0),9.2);render('Idle',1,'side',(6,0,.15),(0,.3,0),7);render('Idle',1,'eye-detail',(2,-2.7,.8),(0,-1.52,0),.85)
 for clip,fr in [('Swim',19),('Bite',6),('Eat',14),('Heavy',18),('Guard',16),('Ability',33),('Dodge',7),('Grab',24),('Death',49)]:render(clip,fr,'action-'+clip,(3,-5,3),(0,-.8,0),5.6)
 render('Bite',6,'oral-open',(0,-4,.15),(0,-1.7,0),.90);render('Idle',1,'aperture-funnel',(1.7,-3,-1),(0,-1.52,-.1),1.1)
if mode=='lod':
 for clip,fr in [('Idle',1),('Swim',19),('Death',49)]:render(clip,fr,'lod-'+clip,(4,-6,4),(0,.3,0),7)
if mode in ['portrait','all']:S.render.resolution_x=1600;S.render.resolution_y=1200;render('Idle',1,'selection',(4,-6,4),(0,.30,0),6.9)
if mode in ['sequence','all']:
 S.render.resolution_x=720;S.render.resolution_y=540
 for clip,frames in [('Swim',[1,7,13,19,25]),('Heavy',[1,8,18,27,34]),('Grab',[1,10,22,33,43])]:
  for fr in frames:render(clip,fr,f'sequence-{clip}-{fr:02d}',(2.5,-4,2),(0,-1.7,0),2.3)
print('MICHELINOCERAS_RENDER_COMPLETE',mode,flush=True)
