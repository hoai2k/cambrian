"""Actual exported-GLB portraits and close anatomical/action reviews."""
import bpy,sys,hashlib,shutil,json
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/rhinodipterus';C=L/'v2-candidate';preview='--preview'in sys.argv
loaded_sha=hashlib.sha256((C/'rhinodipterus.glb').read_bytes()).hexdigest();REVIEW=L/('review-'+loaded_sha[:12]);REVIEW.mkdir(exist_ok=True);render_records=[]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(C/'rhinodipterus.glb'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=24 if preview else 64;s.cycles.use_denoising=True;s.render.resolution_x=1000 if preview else 1600;s.render.resolution_y=750 if preview else 1200;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX'
s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.13,.16,.18,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.4
for name,loc,power,color,size in [('Warm key',(3,-4,5),520,(1,.93,.82),4),('Blue fill',(-3,-1,2.5),350,(.78,.9,1),3),('Rear rim',(1,4,3),650,(.87,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def render(name,frame,path,loc=(3.6,-4.6,2.6),target=(0,.57,0),scale=6.45):
 rig.animation_data_create();rig.animation_data.action=next(a for a in bpy.data.actions if a.name==name or a.name.endswith('_'+name)or a.name.endswith('|'+name))
 for track in rig.animation_data.nla_tracks:track.mute=True
 s.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;actual=REVIEW/path.name;s.render.filepath=str(actual);bpy.ops.render.render(write_still=True)
 if hashlib.sha256((C/'rhinodipterus.glb').read_bytes()).hexdigest()==loaded_sha:shutil.copy2(actual,path)
 render_records.append({'file':path.name,'clip':name,'frame':frame,'imageSha256':hashlib.sha256(actual.read_bytes()).hexdigest(),'sourceGlbSha256':loaded_sha});(REVIEW/'manifest.json').write_text(json.dumps(render_records,indent=2))

for o in s.objects:
 if o.type!='MESH':continue
 n=o.name;col=(.07,.07,.07)
 if 'head_envelope'in n:col=(.15,.25,.03)
 elif 'mandibular'in n:col=(.04,.32,.08)
 elif 'Continuous scaled'in n:col=(.04,.09,.45)
 elif 'dermal commissure'in n:col=(.5,.20,.03)
 elif 'Inner commissural'in n:col=(.5,.025,.03)
 elif 'Buccal lining'in n:col=(.3,.035,.4)
 m=bpy.data.materials.new(n);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(*col,1);o.data.materials.clear();o.data.materials.append(m)
 for p in o.data.polygons:p.material_index=0
render('Bite',10,L/'diagnostic-closing.png',(1.2,-3,-.45),(0,-1.64,-.12),1.65)
render('Heavy',13,L/'diagnostic-gape.png',(1.1,-3,-.35),(0,-1.57,-.11),1.65)
