"""Hash-bound actual GLB portraits plus basic action/eye/oral inspection.

v2: points C at build-v2-candidate/ instead of the shipped initial-candidate/, so this renders
and hash-binds the v2 redesign's own GLB rather than overwriting the shipped candidate's review
evidence. Also writes render-validation-v2(-lod).json rather than the shipped
render-validation(-lod).json, which is a tracked file in this directory."""
import bpy,sys,hashlib,json,shutil
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/jaekelopterus';C=L/'build-v2-candidate';lod='--lod'in sys.argv;preview='--preview'in sys.argv
file=C/('jaekelopterus'+('.lod1'if lod else'')+'.glb');sha=hashlib.sha256(file.read_bytes()).hexdigest();D=L/('review-'+sha[:12]);D.mkdir(exist_ok=True);records=[]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
s=bpy.context.scene;s.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(file));rig=next(o for o in s.objects if o.type=='ARMATURE');s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.max_bounces=4;s.cycles.diffuse_bounces=2;s.cycles.glossy_bounces=2;s.cycles.use_denoising=True;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.16,.18,.19,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
for name,loc,power,color,size in [('Key',(3,-4,5),700,(1,.94,.84),4),('Fill',(-3,-1,3),500,(.80,.9,1),4),('Rim',(1,4,4),700,(.87,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def render(label,clip,frame,loc=(4,-4.7,5),target=(0,.10,0),scale=7.6,size=(1000,750)):
 rig.animation_data_create();rig.animation_data.action=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('_'+clip)or a.name.endswith('|'+clip))
 for track in rig.animation_data.nla_tracks:track.mute=True
 s.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x,s.render.resolution_y=size;s.render.filepath=str(D/(label+'.png'));bpy.ops.render.render(write_still=True);records.append({'file':label+'.png','clip':clip,'frame':frame,'imageSha256':hashlib.sha256((D/(label+'.png')).read_bytes()).hexdigest(),'sourceGlbSha256':sha});(D/'manifest.json').write_text(json.dumps(records,indent=2))
if '--finish-basic' in sys.argv:
 records=json.loads((D/'manifest.json').read_text())
 for label,loc in [('side',(3,-1.10,.8)),('dorsal',(0,-1.10,4))]:render('eyes-'+label,'Idle',0,loc,(0,-1.10,.19),1.65,size=(600,450))
 bpy.ops.object.light_add(type='AREA',location=(.3,-1.1,-2));o=bpy.context.object;o.data.energy=45;o.data.size=1.2;o.rotation_euler=(Vector((0,-.85,-.15))-o.location).to_track_quat('-Z','Y').to_euler()
 render('oral-lit-Eat','Eat',18,(.6,-2,-3),(0,-.85,-.17),1.3,size=(600,450))
 (H/'render-validation-v2.json').write_text(json.dumps({'sourceGlbSha256':sha,'renders':records},indent=2));sys.exit(0)
if preview:
 render('silhouette','Idle',0);render('dorsal','Idle',0,(0,.1,8),scale=9.7);render('side','Idle',0,(7,.1,.4),scale=7.5);sys.exit(0)
if lod:
 for clip,frame in [('Idle',0),('Crawl',18),('Death',48)]:render('LOD-'+clip,clip,frame,size=(800,600))
else:
 render('lateral','Idle',0,(7,.1,.45),scale=7.5,size=(900,675))
 bpy.ops.object.light_add(type='AREA',location=(.3,-1.1,-2));oralfill=bpy.context.object;oralfill.data.energy=45;oralfill.data.size=1.2;oralfill.rotation_euler=(Vector((0,-.85,-.15))-oralfill.location).to_track_quat('-Z','Y').to_euler()
 render('oral-Idle','Idle',0,(.6,-2,-3),(0,-.85,-.17),1.3,size=(800,600));oralfill.hide_render=True
 render('jaekelopterus.select','Idle',0,size=(1600,1200));shutil.copy2(D/'jaekelopterus.select.png',C/'jaekelopterus.select.png');s.render.film_transparent=False;render('jaekelopterus','Idle',0,size=(1600,1200));shutil.copy2(D/'jaekelopterus.png',C/'jaekelopterus.png');s.render.film_transparent=True
 for label,size in [('card',(800,600)),('thumb',(256,192))]:render('jaekelopterus.'+label,'Idle',0,size=size);shutil.copy2(D/('jaekelopterus.'+label+'.png'),C/('jaekelopterus.'+label+'.png'))
 for clip,frame in [('Crawl',18),('Swim',18),('Bite',6),('Eat',18),('Heavy',14),('Ability',22),('Guard',15),('Dodge',4),('Death',48)]:render('action-'+clip,clip,frame,size=(800,600))
 render('frontal','Guard',15,(0,-8,1),(0,-.3,0),5.0,size=(900,675));render('lateral','Idle',0,(7,.1,.45),scale=7.5,size=(900,675))
 for label,loc in [('front',(0,-4,1)),('side',(3,-1.10,.8)),('dorsal',(0,-1.10,4)),('threequarter',(2,-3,2))]:render('eyes-'+label,'Idle',0,loc,(0,-1.10,.19),1.65,size=(700,525))
 bpy.ops.object.light_add(type='AREA',location=(.3,-1.1,-2));o=bpy.context.object;o.data.energy=45;o.data.size=1.2;o.rotation_euler=(Vector((0,-.85,-.15))-o.location).to_track_quat('-Z','Y').to_euler()
 for clip,frame in [('Idle',0),('Eat',18)]:render('oral-'+clip,clip,frame,(.6,-2,-3),(0,-.85,-.17),1.3,size=(800,600))
(H/('render-validation-v2-lod.json'if lod else'render-validation-v2.json')).write_text(json.dumps({'sourceGlbSha256':sha,'renders':records},indent=2));print('RENDER_COMPLETE',sha,flush=True)
