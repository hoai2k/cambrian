"""Actual exported-GLB portraits and close anatomical/action reviews."""
import bpy,sys,hashlib,shutil,json
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/coccosteus';C=L/'v2-candidate';preview='--preview'in sys.argv
loaded_sha=hashlib.sha256((C/'coccosteus.glb').read_bytes()).hexdigest();REVIEW=L/('review-'+loaded_sha[:12]);REVIEW.mkdir(exist_ok=True);render_records=[]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=str(C/'coccosteus.glb'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=24 if preview else 64;s.cycles.use_denoising=True;s.render.resolution_x=1000 if preview else 1600;s.render.resolution_y=750 if preview else 1200;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX'
s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.13,.16,.18,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.4
for name,loc,power,color,size in [('Warm key',(3,-4,5),520,(1,.93,.82),4),('Blue fill',(-3,-1,2.5),350,(.78,.9,1),3),('Rear rim',(1,4,3),650,(.87,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def render(name,frame,path,loc=(3.6,-4.6,2.6),target=(0,.45,0),scale=5.1):
 rig.animation_data_create();rig.animation_data.action=next(a for a in bpy.data.actions if a.name==name or a.name.endswith('_'+name)or a.name.endswith('|'+name))
 for track in rig.animation_data.nla_tracks:track.mute=True
 s.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;actual=REVIEW/path.name;s.render.filepath=str(actual);bpy.ops.render.render(write_still=True)
 if hashlib.sha256((C/'coccosteus.glb').read_bytes()).hexdigest()==loaded_sha:shutil.copy2(actual,path)
 render_records.append({'file':path.name,'clip':name,'frame':frame,'imageSha256':hashlib.sha256(actual.read_bytes()).hexdigest(),'sourceGlbSha256':loaded_sha});(REVIEW/'manifest.json').write_text(json.dumps(render_records,indent=2))
if '--gape-only'in sys.argv:
 s.render.resolution_x=1000;s.render.resolution_y=750;s.cycles.samples=24
 bpy.ops.object.light_add(type='AREA',location=(.1,-3,-.25));fill=bpy.context.object;fill.data.energy=45;fill.data.size=1.2;fill.rotation_euler=(Vector((0,-1.2,-.1))-fill.location).to_track_quat('-Z','Y').to_euler()
 render('Heavy',13,L/'mouth-gape-v2.png',(.17,-4,-.55),(0,-1.42,-.095),.85)
 sys.exit(0)
if '--oblique-only'in sys.argv:
 s.render.resolution_x=1000;s.render.resolution_y=750
 render('Idle',1,L/'portrait-preview-v2.png')
 bpy.ops.object.light_add(type='AREA',location=(.1,-3,-.25));fill=bpy.context.object;fill.data.energy=45;fill.data.size=1.2;fill.rotation_euler=(Vector((0,-1.2,-.1))-fill.location).to_track_quat('-Z','Y').to_euler()
 render('Bite',10,L/'mouth-closing-oblique-v2.png',(1.2,-3,-.45),(0,-1.35,-.12),1.15)
 render('Heavy',13,L/'mouth-gape-oblique-v2.png',(1.1,-3,-.35),(0,-1.23,-.11),1.3)
 render('Death',49,L/'Death-opposite-v2.png',(-4,-2,1.8))
 sys.exit(0)
if '--mouth-only'not in sys.argv:
 render('Idle',1,C/'coccosteus.select.png')
 if not preview:
  render('Idle',1,C/'coccosteus.png');s.render.resolution_x=800;s.render.resolution_y=600;render('Idle',1,C/'coccosteus.card.png');s.render.resolution_x=256;s.render.resolution_y=192;render('Idle',1,C/'coccosteus.thumb.png')
 s.render.resolution_x=1000;s.render.resolution_y=750
 for name,frame,loc in [('Idle',1,(5,.4,.6)),('Swim',16,(4,-2,1.5)),('Bite',7,(2,-4,.2)),('Eat',29,(1,-4,.15)),('Heavy',13,(4,-2,1.4)),('Ability',22,(4,-3,2)),('Guard',16,(0,-5,1)),('Dodge',7,(4,-2,1.4)),('Death',49,(4,-2,1.8)),('TurnLeft',25,(3,-3,3))]:
  if not preview or name in ['Idle','Heavy']:render(name,frame,L/(name+'-v2.png'),loc)
 for label,loc,target in [('front',(0,-4,.27),(0,-1.438,.156)),('side',(3,-1.438,.156),(0,-1.438,.156)),('dorsal',(0,-1.438,4),(0,-1.438,.156)),('threequarter',(2,-3,1),(0,-1.438,.156))]:render('Idle',1,L/('eyes-'+label+'-v2.png'),loc,target,.95)
bpy.ops.object.light_add(type='AREA',location=(.1,-3,-.25));fill=bpy.context.object;fill.name='Oral inspection fill';fill.data.energy=45;fill.data.size=1.2;fill.rotation_euler=(Vector((0,-1.2,-.1))-fill.location).to_track_quat('-Z','Y').to_euler()
for label,action,frame in [('gape','Heavy',13),('closing','Bite',10),('rest','Idle',1),('eat','Eat',29)]:render(action,frame,L/('mouth-'+label+'-v2.png'),(.17,-4,-.55),(0,-1.42,-.095),.85)
print('COCCOSTEUS_ACTUAL_GLB_RENDERS_COMPLETE',flush=True)
render('Heavy',13,L/'mouth-gape-oblique-v2.png',(1.1,-3,-.35),(0,-1.23,-.11),1.3)
render('Bite',10,L/'mouth-closing-oblique-v2.png',(1.2,-3,-.45),(0,-1.35,-.12),1.15)
render('Death',49,L/'Death-opposite-v2.png',(-4,-2,1.8))

if not preview:(H/'render-validation-v2.json').write_text(json.dumps({'sourceGlbSha256':loaded_sha,'renders':render_records},indent=2))
