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
def render(file,w,h,loc=(7,-6,4.2),target=(0,.5,0),scale=8.1):
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x=w;s.render.resolution_y=h;s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
pose('Idle',0)
for suffix,w,h in ([] if '--lod' in sys.argv else [('select.png',1600,1200),('card.png',800,600),('thumb.png',256,192),('png',1200,900)]):render(OUT/('onychodus.'+suffix),w,h)
for clip,t in [('Idle',0),('Swim',.8),('TurnLeft',.8),('TurnRight',.8),('Dive',.7),('Rise',.7),('Attack',.34),('Bite',.25),('Heavy',.15),('Hit',.23),('Death',1.6),('Guard',.5),('Parry',.16),('Dodge',.2),('Eat',.42),('Stagger',.44),('Ability',.83),('Growth',.7)]:
 if '--refresh-mouth' in sys.argv:continue
 if '--lod' in sys.argv and clip not in ['Idle','Swim','Death']:continue
 pose(clip,t);render(REVIEW/(clip+'.png'),1000,750)
for clip,t in ([] if '--lod' in sys.argv else [('Bite',.25),('Eat',.4),('Heavy',.15)]):pose(clip,t);render(REVIEW/('mouth-'+clip+'.png'),1000,750,(1,-5,.7),(0,-1.95,-.08),2.1)

pose("Idle",0)
render(REVIEW/"side.png",1200,900,(8,.55,.4),(0,.55,0),9.0)
render(REVIEW/"dorsal.png",1200,900,(0,.6,8),(0,.6,0),8.1)

if "--lod" not in sys.argv:
 for t in [0,.10,.20,.30,.50,.8]:
  pose("Heavy",t);render(REVIEW/("oral-phase-"+str(t)+".png"),1000,750,(-1,-5,.7),(0,-1.95,-.08),2.1)
