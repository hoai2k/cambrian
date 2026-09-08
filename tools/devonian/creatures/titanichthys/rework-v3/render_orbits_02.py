import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent;BLEND=OUT.parent/'candidate-06/titanichthys-production-06.blend'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(BLEND));s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=48;s.cycles.use_denoising=True;s.render.threads_mode='FIXED';s.render.threads=2;s.render.resolution_x=1400;s.render.resolution_y=1050;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.camera.data.type='ORTHO'
for o in list(bpy.data.objects):
 if o.type in ('MESH','ARMATURE') or o.name.startswith('anchor_'):bpy.data.objects.remove(o,do_unlink=True)
result=[];views={'Orbit-side':((8,-2,.5),(0,-2,.5),2.8),'Orbit-oblique':((5,-6,3.3),(0,-1.64,.24),4.5)}
for asset in ('titanichthys.glb','titanichthys.lod1.glb'):
 bpy.ops.import_scene.gltf(filepath=str(OUT/asset));rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');tracks=rig.animation_data.nla_tracks
 for t in tracks:t.mute=True
 for clip,phase in (('Bind',0.),('Ability',.5)):
  if clip=='Bind':rig.animation_data.action=None
  else:
   st=next(t for t in tracks if t.name==clip).strips[0];rig.animation_data.action=st.action;rig.animation_data.action_slot=st.action_slot
  s.frame_set(0 if clip=='Bind' else round(30*phase*1.0));bpy.context.view_layer.update()
  for label,(pos,target,scale) in views.items():
   s.camera.location=pos;s.camera.rotation_euler=(Vector(target)-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=scale;p=OUT/f'{asset[:-4]}-{label}-{clip}.png';s.render.filepath=str(p);bpy.ops.render.render(write_still=True);result.append({'path':str(p),'sha256':sha(p),'asset':asset,'clip':clip,'camera':label})
 for o in list(bpy.data.objects):
  if o.type in ('MESH','ARMATURE') or o.name.startswith('anchor_'):bpy.data.objects.remove(o,do_unlink=True)
(OUT/'orbit-render-manifest.json').write_text(json.dumps(result,indent=2)+'\n');print('EYE_SEATING_ORBITS_OK',len(result))
