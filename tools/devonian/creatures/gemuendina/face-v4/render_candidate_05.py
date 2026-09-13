"""Actual GLB portraits and bounded pose/LOD views. No source blend mutations."""
import bpy,sys,json,argparse
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
import hashlib
ROOT=HERE.parents[4];OUT=ROOT.parent/'devonian-authoring/gemuendina/face-v4/candidate-05'
sys.path.insert(0,str(HERE.parent/'rework-v3'))
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def record(p):return {'path':str(p),'sha256':sha(p),'bytes':Path(p).stat().st_size}
def check_sources(r):
    for p,h in r['source_sha256'].items():assert sha(p)==h
from rig_spec_05 import CLIPS
parser=argparse.ArgumentParser();parser.add_argument('--group',choices=['portraits','review'],required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);report=json.loads((OUT/'candidate-report.json').read_text());check_sources(report)
for row in report['files']:
    if sha(row['path'])!=row['sha256']:raise RuntimeError('Frozen candidate output changed '+row['path'])
folder=OUT/('portrait-evidence'if args.group=='portraits'else'pose-evidence')
if folder.exists():raise RuntimeError('Preserve existing render group')
folder.mkdir();bpy.ops.wm.open_mainfile(filepath=str(OUT/'gemuendina-face-production-05.blend'));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.samples=32
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
    path=OUT/('gemuendina.lod1.glb'if lod else'gemuendina.glb');loaded=record(path)
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
    (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('GEMUENDINA_FACE_GLB_VIEW_OK '+name,flush=True)
load()
if args.group=='portraits':
    for name,w,h,alpha in [('gemuendina.select.png',1600,1200,True),('gemuendina.card.png',800,600,True),('gemuendina.thumb.png',256,192,True),('gemuendina.png',1600,1200,False)]:
        render(name,'Idle',0,(7,-7.8,6.4),(0,.70,.10),7.0,w,h,alpha)
else:
    rows=[
      ('front','Idle',0,(0,-5,.30),(0,-1.55,.13),1.9,False),
      ('face-oblique','Idle',0,(2.1,-3.9,1.55),(0,-1.51,.18),2.5,False),
      ('side','Idle',0,(6,-1.25,.20),(0,-1.40,.10),2.35,False),
      ('Heavy-front','Heavy',.45,(0,-5,.30),(0,-1.60,.40),2.7,False),
      ('Heavy-side','Heavy',.45,(6,-1.25,.20),(0,-1.45,.10),2.35,False),
      ('Bite-front','Bite',.45,(0,-5,.30),(0,-1.55,.13),1.9,False),
      ('Eat-oblique','Eat',.25,(2.1,-3.9,1.55),(0,-1.51,.18),2.5,False),
      ('oral-low','Idle',0,(1,-4,-.05),(0,-1.78,.04),1.6,False),
    ]
    for name,clip,phase,camera,target,scale,fill in rows:render(name+'.png',clip,phase,camera,target,scale,oral_fill=fill)
    load(True)
    render('LOD-front.png','Idle',0,(0,-5,.30),(0,-1.55,.13),1.9)
    render('LOD-Heavy.png','Heavy',.45,(2.1,-3.9,1.55),(0,-1.51,.18),2.5)
    render('LOD-Heavy-side.png','Heavy',.45,(6,-1.25,.20),(0,-1.45,.10),2.35)
    render('LOD-Eat.png','Eat',.25,(2.1,-3.9,1.55),(0,-1.51,.18),2.5)
manifest['complete']=True;(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');check_sources(report)
print('GEMUENDINA_FACE_CANDIDATE_'+args.group.upper()+'_COMPLETE',flush=True)
