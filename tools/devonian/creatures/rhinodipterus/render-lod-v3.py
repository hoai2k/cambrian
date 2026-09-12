"""V3 port of render-lod-v2.py: identical, pointed at the v3-candidate/ LOD GLB and writing -v3
review filenames. Actual exported-GLB portraits and close anatomical/action reviews."""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/rhinodipterus';C=L/'v3-candidate';preview='--preview'in sys.argv
loaded_sha=hashlib.sha256((C/'rhinodipterus.lod1.glb').read_bytes()).hexdigest();records=[]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(C/'rhinodipterus.lod1.glb'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');s=bpy.context.scene
s.render.engine='CYCLES';s.cycles.samples=24 if preview else 64;s.cycles.use_denoising=True;s.render.resolution_x=1000 if preview else 1600;s.render.resolution_y=750 if preview else 1200;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX'
# Use the host's Metal device when available; this changes rendering only.
try:
 prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='METAL';prefs.get_devices();gpu=[d for d in prefs.devices if d.type=='METAL']
 if gpu and '--metal' in sys.argv:
  for device in prefs.devices:device.use=device.type=='METAL'
  s.cycles.device='GPU'
except (TypeError,RuntimeError):pass
s.world.use_nodes=True;s.world.node_tree.nodes.get('Background').inputs[0].default_value=(.13,.16,.18,1);s.world.node_tree.nodes.get('Background').inputs[1].default_value=.4
for name,loc,power,color,size in [('Warm key',(3,-4,5),520,(1,.93,.82),4),('Blue fill',(-3,-1,2.5),350,(.78,.9,1),3),('Rear rim',(1,4,3),650,(.87,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def render(name,frame,path,loc=(3.6,-4.6,2.6),target=(0,.57,0),scale=6.45):
 rig.animation_data_create();rig.animation_data.action=next(a for a in bpy.data.actions if a.name==name or a.name.endswith('_'+name)or a.name.endswith('|'+name))
 for track in rig.animation_data.nla_tracks:track.mute=True
 s.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.filepath=str(path);bpy.ops.render.render(write_still=True);records.append({'file':path.name,'clip':name,'frame':frame,'imageSha256':hashlib.sha256(path.read_bytes()).hexdigest()})

s.render.resolution_x=1000;s.render.resolution_y=750;s.cycles.samples=24
for name,frame in [('Idle',1),('Swim',18),('Death',49)]:render(name,frame,L/('LOD-'+name+'-v3.png'))

assert loaded_sha==hashlib.sha256((C/'rhinodipterus.lod1.glb').read_bytes()).hexdigest()
(H/'render-validation-lod-v3.json').write_text(json.dumps({'sourceGlbSha256':loaded_sha,'renders':records},indent=2))
