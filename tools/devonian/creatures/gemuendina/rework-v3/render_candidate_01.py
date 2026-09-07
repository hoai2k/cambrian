"""Fresh local portrait family and four targeted rig poses; no publication."""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
OUT=ROOT.parent/'devonian-authoring/gemuendina/rework-v3/candidate-01'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import CLIPS
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
report=json.loads((OUT/'candidate-report.json').read_text())
for name,digest in report['source_sha256'].items():
    if sha(HERE/name)!=digest:raise RuntimeError('Candidate creative source changed: '+name)
blend=OUT/'gemuendina-production-01.blend'
expected=next(v['sha256']for v in report['files']if v['path']==str(blend))
if sha(blend)!=expected:raise RuntimeError('Candidate blend changed')
portraits=[('gemuendina.select.png',1600,1200,True),('gemuendina.card.png',800,600,True),
           ('gemuendina.thumb.png',256,192,True),('gemuendina.png',1200,900,False)]
poses=[('Swim-side','Swim',.25,(10,.95,.20),(0,.95,.14),6.9),
       ('Heavy-oral','Heavy',.45,(1.0,-2.9,2.1),(0,-1.66,.19),1.45),
       ('TurnLeft-oblique','TurnLeft',.5,(7,-7.8,6.4),(0,.70,.10),7.0),
       ('Death-oblique','Death',1.,(7,-7.8,6.4),(0,.70,.10),7.0)]
paths=[OUT/p[0]for p in portraits]+[OUT/(p[0]+'.png')for p in poses]
if any(p.exists()for p in paths):raise RuntimeError('Fresh portrait/pose output already exists')
bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene;rig=bpy.data.objects['gemuendina_rig']
scene.cycles.samples=32;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.resolution_percentage=100
manifest={'blend_sha256':expected,'renderer_sha256':sha(HERE/'render_candidate_01.py'),'renders':[]}
def view(pos,target,scale):
    scene.camera.location=pos;scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera.data.ortho_scale=scale
def render(path,w,h,transparent):
    scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent
    scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
    manifest['renders'].append({'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path)})
    (OUT/'portrait-pose-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('GEMUENDINA_CANDIDATE_RENDER_OK '+path.name,flush=True)
view((7,-7.8,6.4),(0,.70,.10),7.0)
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
for name,w,h,alpha in portraits:render(OUT/name,w,h,alpha)
for name,clip,phase,pos,target,scale in poses:
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));view(pos,target,scale)
    render(OUT/(name+'.png'),1100,850,False)
print('GEMUENDINA_PORTRAIT_GROUP_OK '+str(OUT/'portrait-pose-manifest.json'))
