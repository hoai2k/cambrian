"""V3 delivery portraits: select/card/thumb/base PNGs for the candidate GLB.

Neither build_v2.py/build_v3.py nor render_v2.py produce the four named delivery images
(<id>.select.png / .card.png / .thumb.png / .png) that check.mjs and the game's catalogue expect —
render_v2.py's own 'selection' render (STETH_RENDER=all/specimen/portrait) writes a differently
named, differently sized frame under a review directory, not these four. This is a v3 copy of the
render pattern cheirolepis/render-v3.py uses for the same four files, adapted to this creature's
own established threequarter framing (render_v2.py's default camera: loc (5,-3.7,2.8), target
(0,.70,.15), scale 5.6) instead of introducing a new angle. Added file; writes only into
../devonian-authoring/stethacanthus/v3-candidate/.
"""
import bpy
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];OUT=R.parent/'devonian-authoring/stethacanthus/v3-candidate'
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(OUT/'stethacanthus.glb'))
rig=next(o for o in scene.objects if o.type=='ARMATURE')
for tr in list(rig.animation_data.nla_tracks):rig.animation_data.nla_tracks.remove(tr)
if not scene.world:scene.world=bpy.data.worlds.new('Neutral studio')
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.16,.18,.20,1);bg.inputs[1].default_value=.6
for name,p,E,col,size in [('Neutral key',(3,-3,4),720,(1,.95,.89),4),('Broad fill',(-3,-2,2),530,(.85,.92,1),4),('Soft rim',(1,3,3),790,(.89,.95,1),3)]:
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=name;o.data.energy=E;o.data.color=col;o.data.size=size;o.rotation_euler=(Vector((0,.6,.2))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';scene.camera=cam
act=next(a for a in bpy.data.actions if a.name=='Idle' or a.name.endswith('|Idle'));rig.animation_data.action=act
if act.slots:rig.animation_data.action_slot=act.slots[0]
scene.frame_set(0)
loc,target,ortho=(5,-3.7,2.8),(0,.70,.15),5.6
cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=ortho
for suffix,w,h in [('select.png',1600,1200),('card.png',800,600),('thumb.png',256,192),('png',1200,900)]:
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.filepath=str(OUT/('stethacanthus.'+suffix));bpy.ops.render.render(write_still=True)
print('STETHACANTHUS_V3_PORTRAITS_READY',str(OUT),flush=True)
