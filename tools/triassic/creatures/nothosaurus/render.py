"""Render and inspect re-imported exported models, all clips and four portraits."""
import bpy,os,sys,json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4];OUT=ROOT/'public/assets/triassic/creatures';LOCAL=ROOT/'local/triassic-authoring/nothosaurus';SUFFIX='.puppet'if'--puppet'in sys.argv else'';REVIEW=LOCAL/('puppet-review'if SUFFIX else'authored-review');REVIEW.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.render.fps=30
SOURCE=(LOCAL/('nothosaurus'+SUFFIX+'.unpacked.glb')) if '--decoded' in sys.argv else (OUT/('nothosaurus'+SUFFIX+'.glb'))
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
s=bpy.context.scene;s.render.fps=30;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
rig=next(o for o in s.objects if o.type=='ARMATURE')
for tr in rig.animation_data.nla_tracks:tr.mute=True
for loc,power in [((3,-5,5),1000),((-3,-1,3),600),((0,4,4),1100),((0,-5,-2),230)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=5;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO'
def pose(clip,t):
 a=next(a for a in bpy.data.actions if a.name==clip or a.name.endswith('_'+clip)or a.name.endswith('|'+clip));rig.animation_data.action=a
 if a.slots:rig.animation_data.action_slot=a.slots[0]
 s.frame_set(round(t*30))
def render(file,w=800,h=600,loc=(7,-5,4.2),target=(0,0,0),scale=6.8):
 cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.resolution_x=w;s.render.resolution_y=h;s.render.filepath=str(file);bpy.ops.render.render(write_still=True)
if '--extras-only' in sys.argv:
 for clip,t in [('Ability',.5),('Grab',.6),('Breath',1.2)]:
  pose(clip,t);render(REVIEW/(clip+'-'+str(t)+'.png'))
 sys.exit(0)
if '--mouth-only' in sys.argv:
 pose('Bite',.25);render(REVIEW/'mouth-Bite.png',1000,750,(5,-3,.9),(-.33,-2.1,.38),1.3);sys.exit(0)
pose('Idle',0)
if SUFFIX and '--review-only'not in sys.argv:
 render(OUT/'nothosaurus.puppet.png',1200,900)
 if '--portrait-only'in sys.argv:sys.exit(0)
if not SUFFIX and '--review-only'not in sys.argv:
 for suffix,w,h in [('select.png',1600,1200),('card.png',800,600),('thumb.png',256,192),('png',1200,900)]:render(OUT/('nothosaurus.'+suffix),w,h)
for clip,t in [('Idle',0),('Swim',.225),('Swim',.675),('Swim',1.125),('Swim',1.575),('Sprint',.15),('Sprint',.45),('TurnLeft',.8),('TurnRight',.8),('Dive',.7),('Rise',.7),('Attack',.14),('Attack',.4),('Attack',.7),('Bite',.25),('Heavy',.15),('Heavy',.45),('Heavy',.8),('Hit',.3),('Death',1.6),('Guard',.5),('Parry',.2),('Dodge',.25),('Eat',.4),('Stagger',.6),('Ability',.5),('Grab',.6),('Breath',1.2),('Growth',.75)]:
 pose(clip,t);render(REVIEW/(clip+'-'+str(t)+'.png'))
for name,loc in [('side',(7,0,.1)),('top',(0,0,8))]:
 pose('Idle',0);render(REVIEW/(name+'.png'),1000,750,loc)
pose('Bite',.25);render(REVIEW/'mouth-Bite.png',1000,750,(5,-3,.9),(-.33,-2.1,.38),1.3)
