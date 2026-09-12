"""v2 copy of render.py, pointed at v2-candidate instead of initial-candidate; writes
render-validation-v2(.-lod).json instead of the shipped candidate's own validation logs."""
import bpy,sys,hashlib,json,shutil
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/nahecaris';C=L/'v2-candidate';lod='--lod'in sys.argv;preview='--preview'in sys.argv
file=C/('nahecaris'+('.lod1'if lod else'')+'.glb');sha=hashlib.sha256(file.read_bytes()).hexdigest();D=L/('review-'+sha[:12]);D.mkdir(exist_ok=True);records=[]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
s=bpy.context.scene;s.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(file));rig=next(o for o in s.objects if o.type=='ARMATURE');s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.max_bounces=4;s.cycles.diffuse_bounces=2;s.cycles.glossy_bounces=2;s.cycles.use_denoising=True;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.16,.18,.19,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
for name,loc,power,color,size in [('Key',(3,-4,5),700,(1,.94,.84),4),('Fill',(-3,-1,3),500,(.80,.9,1),4),('Rim',(1,4,4),700,(.87,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def render(label,clip,frame,loc=(4,-4.8,2.7),target=(0,.10,0),scale=6.7,size=(1000,750)):
 rig.animation_data_create();rig.animation_data.action=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('_'+clip)or a.name.endswith('|'+clip))
 for track in rig.animation_data.nla_tracks:track.mute=True
 s.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x,s.render.resolution_y=size;s.render.filepath=str(D/(label+'.png'));bpy.ops.render.render(write_still=True);records.append({'file':label+'.png','clip':clip,'frame':frame,'imageSha256':hashlib.sha256((D/(label+'.png')).read_bytes()).hexdigest(),'sourceGlbSha256':sha});(D/'manifest.json').write_text(json.dumps(records,indent=2))
if preview:
 render('silhouette','Idle',0);render('lateral','Idle',0,(6,.1,.15),scale=6.6);sys.exit(0)
if lod:
 for clip,frame in [('Idle',0),('Swim',18),('Death',48)]:render('LOD-'+clip,clip,frame,size=(700,525))
else:
 render('nahecaris.select','Idle',0,size=(1600,1200));shutil.copy2(D/'nahecaris.select.png',C/'nahecaris.select.png')
 render('lateral','Idle',0,(6,.1,.15),scale=6.6,size=(800,600))
 for label,loc in [('front',(0,-4,.45)),('side',(3,-1.445,.30)),('dorsal',(0,-1.445,3))]:render('eyes-'+label,'Idle',0,loc,(0,-1.43,.10),.94,size=(600,450))
 bpy.ops.object.light_add(type='AREA',location=(.3,-1.3,-2));o=bpy.context.object;o.data.energy=35;o.data.size=1.2;o.rotation_euler=(Vector((0,-1.27,-.1))-o.location).to_track_quat('-Z','Y').to_euler()
 render('oral-lit-Eat','Eat',18,(.5,-2.2,-2),(0,-1.25,-.08),.8,size=(600,450))
 render('basket-Eat','Eat',18,(2,-2,-3),(0,-.25,-.2),2.5,size=(800,600))
(H/('render-validation-lod-v2.json'if lod else'render-validation-v2.json')).write_text(json.dumps({'sourceGlbSha256':sha,'renders':records},indent=2));print('RENDER_COMPLETE',sha,flush=True)
