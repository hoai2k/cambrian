"""Render matching delivery portraits and posed review from the actual exported GLB."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[4];LOCAL=ROOT.parent/'devonian-authoring/onychodus';OUT=LOCAL/'v2-candidate';REVIEW=LOCAL/'final-review-v2';REVIEW=LOCAL/('lod-review-v2' if '--lod' in sys.argv else 'final-review-v2');REVIEW.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(OUT/('onychodus.lod1.glb' if '--lod' in sys.argv else 'onychodus.glb')))
s=bpy.context.scene;s.render.fps=30;s.render.engine='CYCLES';s.cycles.samples=32;s.cycles.use_denoising=True;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
rig=next(o for o in s.objects if o.type=='ARMATURE')
for tr in rig.animation_data.nla_tracks:tr.mute=True
for loc,power in [((3,-5,5),850),((-3,-1,3),500),((0,4,4),900),((0,-5,-2),220)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=5;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def pose(clip,t):
 rig.animation_data.action=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('_'+clip)or a.name.endswith('|'+clip));s.frame_set(round(t*30))
def render(file,w,h,loc=(7,-6,4.2),target=(0,.5,0),scale=7.7):
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x=w;s.render.resolution_y=h;s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
pose('Idle',0)
render(LOCAL/'silhouette.png',1200,900,(7,-6,4.2),(0,.6,0),7.5)
render(LOCAL/'side.png',1200,900,(8,.55,.4),(0,.55,0),9.0)
pose('Heavy',.15)
render(LOCAL/'oral.png',1200,900,(1,-5,.8),(0,-2.,.08),1.8)
