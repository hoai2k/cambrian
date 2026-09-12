"""V3 delivery portraits: the four named PNGs check.mjs and the catalogue expect.

Imports the packaged candidate GLB (never the source blend), so the portraits
show exactly what ships.  Framing is V2 build.py's own portrait camera --
loc (3.8,-4.2,3), target (0,.65,0) -- widened from ortho 5.3 to 5.9 because the
V3 body is 5.0 units long against V2's 4.525.  Writes only into v3-candidate/.
"""
import bpy
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];OUT=R.parent/'devonian-authoring/bothriolepis/v3-candidate'
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(OUT/'bothriolepis.glb'))
rig=next(o for o in scene.objects if o.type=='ARMATURE')
if rig.animation_data:
 for tr in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(tr)
if not scene.world:scene.world=bpy.data.worlds.new('Neutral studio')
scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background')
bg.inputs[0].default_value=(.13,.16,.18,1);bg.inputs[1].default_value=.45
for name,p,E,col,size in [('Large warm key',(3,-4,5),560,(1,.93,.82),4),
                          ('Soft blue fill',(-3,-1,2.5),380,(.78,.9,1),3),
                          ('Broad rear rim',(1,4,3),700,(.87,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object
 o.name=name;o.data.energy=E;o.data.color=col;o.data.shape='DISK';o.data.size=size
 o.rotation_euler=(Vector((0,.4,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
rig.animation_data_create()
act=next(a for a in bpy.data.actions if a.name=='Idle' or a.name.endswith('|Idle') or a.name.endswith('_Idle'))
rig.animation_data.action=act
if act.slots:rig.animation_data.action_slot=act.slots[0]
scene.frame_set(1)
loc,target,ortho=(3.8,-4.2,3),(0,.65,0),5.9
cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=ortho
for suffix,w,h in [('select.png',1600,1200),('card.png',800,600),('thumb.png',256,192),('png',1200,900)]:
 scene.render.resolution_x=w;scene.render.resolution_y=h
 scene.render.filepath=str(OUT/('bothriolepis.'+suffix));bpy.ops.render.render(write_still=True)
print('BOTHRIOLEPIS_V3_PORTRAITS_READY',str(OUT),flush=True)
