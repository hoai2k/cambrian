"""Actual GLB portraits and bounded pose/LOD views. No source blend mutations."""
import bpy,sys,json,argparse
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from production_common_02 import *
from rig_actions_01 import CLIPS
parser=argparse.ArgumentParser();parser.add_argument('--group',choices=['portraits','review'],required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);report=json.loads((OUT/'candidate-report.json').read_text());check_sources(report)
for row in report['files']:
    if sha(row['path'])!=row['sha256']:raise RuntimeError('Frozen candidate output changed '+row['path'])
folder=OUT/('portrait-evidence'if args.group=='portraits'else'pose-evidence')
if folder.exists():raise RuntimeError('Preserve existing render group')
folder.mkdir();bpy.ops.wm.open_mainfile(filepath=str(OUT/'coccosteus-production-02.blend'));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.samples=48
scene.render.fps=30;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.cycles.seed=71204;scene.cycles.use_animated_seed=False
manifest={'group':args.group,'renderer_sha256':sha(Path(__file__)),'source_sha256':report['source_sha256'],'complete':False,'renders':[]}
loaded=None;rig=None
oral=scene.objects.get('Oral inspection fill');oral_power=oral.data.energy if oral else 0

def load(lod=False):
    global loaded,rig
    for ob in list(scene.objects):
        if ob.type in ('MESH','ARMATURE','EMPTY'):bpy.data.objects.remove(ob,do_unlink=True)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    path=OUT/('coccosteus.lod1.glb'if lod else'coccosteus.glb');loaded=record(path)
    bpy.ops.import_scene.gltf(filepath=str(path));rig=next(o for o in scene.objects if o.type=='ARMATURE')
    rig.animation_data_create()
    for track in rig.animation_data.nla_tracks:track.mute=True
    for pb in rig.pose.bones:pb.scale=(1,1,1)

def render(name,clip,phase,camera,target,scale,w=1280,h=960,alpha=False,oral_fill=False):
    matches=[a for a in bpy.data.actions if a.name==clip or a.name.endswith('_'+clip)or a.name.endswith('|'+clip)]
    assert len(matches)==1, 'Ambiguous imported action '+clip
    rig.animation_data.action=matches[0]
    # Blender glTF importer uses the current 30 fps; compare actual range to requested seconds.
    start,end=matches[0].frame_range;assert abs((end-start)/30-CLIPS[clip])<1e-4
    scene.frame_set(round(start+(end-start)*phase))
    cam=scene.camera;cam.data.type='ORTHO';cam.location=camera;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
    if oral:oral.data.energy=60 if oral_fill else oral_power
    path=(OUT if args.group=='portraits'else folder)/name
    if path.exists():raise RuntimeError('Preserve image '+str(path))
    scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=alpha;scene.render.filepath=str(path)
    bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
    assert sha(loaded['path'])==loaded['sha256']
    manifest['renders'].append({**record(path),'sourceGlb':loaded,'clip':clip,'phase':phase,'frame':scene.frame_current,
        'camera':camera,'target':target,'scale':scale,'resolution':[w,h],'oralFill':oral_fill})
    (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('COCCOSTEUS_GLB_VIEW_OK '+name,flush=True)
load()
if args.group=='portraits':
    for name,w,h,alpha in [('coccosteus.select.png',1600,1200,True),('coccosteus.card.png',800,600,True),('coccosteus.thumb.png',256,192,True),('coccosteus.png',1600,1200,False)]:
        render(name,'Idle',0,(4.6,-5.2,2.7),(0,.30,0),4.85,w,h,alpha)
else:
    rows=[
      ('Idle-side','Idle',0,(7,.4,.1),(0,.4,.1),5.1,False),
      ('Idle-front','Idle',0,(0,-7,.03),(0,-.4,.03),2.4,False),
      ('Idle-dorsal','Idle',0,(0,.4,7),(0,.4,0),6.65,False),
      ('Idle-oblique','Idle',0,(4.6,-5.2,2.7),(0,.3,0),4.85,False),
      ('Armour-close','Idle',0,(3.3,-4.2,2.5),(0,-.91,.04),2.28,False),
      ('Heavy-gape-oblique','Heavy',.40,(1.65,-4.7,-.35),(0,-1.34,-.11),1.55,True),
      ('Eat-oral','Eat',.25,(0,-4,-.22),(0,-1.32,-.14),1.05,True),
      ('Bite-closing','Bite',.60,(1.2,-3,-.40),(0,-1.34,-.11),1.28,True),
      ('Swim-side','Swim',.25,(7,.4,.1),(0,.4,.1),5.3,False),
      ('TurnLeft-oblique','TurnLeft',.40,(4.6,-5.2,2.7),(0,.3,0),5.1,False),
      ('Dodge-oblique','Dodge',.42,(4.6,-5.2,2.7),(0,.3,0),5.3,False),
      ('Death-oblique','Death',1.,(4.6,-5.2,2.7),(0,.3,0),5.4,False),
      ('Orbit-front','Idle',0,(0,-4,.15),(0,-1.49,.065),1.0,False),
      ('Orbit-side','Idle',0,(3,-1.49,.065),(0,-1.49,.065),1.0,False),
    ]
    for name,clip,phase,camera,target,scale,fill in rows:render(name+'.png',clip,phase,camera,target,scale,oral_fill=fill)
    load(True)
    render('LOD-oblique.png','Idle',0,(4.6,-5.2,2.7),(0,.3,0),4.85)
    render('LOD-Swim.png','Swim',.25,(7,.4,.1),(0,.4,.1),5.3)
    render('LOD-Attack.png','Attack',.32,(1.65,-4.7,-.35),(0,-1.34,-.11),1.55,oral_fill=True)
    render('LOD-Eat.png','Eat',.25,(0,-4,-.22),(0,-1.32,-.14),1.05,oral_fill=True)
    neutral=bpy.data.materials.new('Temporary LOD neutral inspection');neutral.use_nodes=True
    bs=neutral.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.40,.385,.355,1);bs.inputs['Roughness'].default_value=.66
    for ob in scene.objects:
        if ob.type=='MESH':
            ob.data.materials.clear();ob.data.materials.append(neutral)
            for p in ob.data.polygons:p.material_index=0
    render('LOD-neutral.png','Idle',0,(4.6,-5.2,2.7),(0,.3,0),4.85)
manifest['complete']=True;(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');check_sources(report)
print('COCCOSTEUS_CANDIDATE_'+args.group.upper()+'_COMPLETE',flush=True)
