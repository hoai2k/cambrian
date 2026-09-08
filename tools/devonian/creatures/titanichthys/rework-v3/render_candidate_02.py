"""Frozen candidate portraits and bounded actual rig/LOD deformation evidence.
No blend save, public files or final audit; all images belong to candidate01.
"""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
OUT=ROOT.parent/'devonian-authoring/titanichthys/rework-v3/candidate-02'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import CLIPS

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
report=json.loads((OUT/'candidate-report.json').read_text())
for name,h in report['source_sha256'].items():
    if sha(HERE/name)!=h:raise RuntimeError('Frozen candidate source changed '+name)
blend=OUT/'titanichthys-production-02.blend'
expected=next(v['sha256']for v in report['files']if v['path']==str(blend))
if sha(blend)!=expected:raise RuntimeError('Production blend changed')
RENDERS=OUT/'renders'
if RENDERS.exists():raise RuntimeError('Preserve existing candidate renders')
RENDERS.mkdir();bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene;rig=bpy.data.objects['titanichthys_rig']
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_percentage=100
scene.view_settings.exposure=-.35;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.camera.data.type='ORTHO';manifest={'blend_sha256':expected,'renderer_sha256':sha(Path(__file__)),'renders':[]}
oral_key=bpy.data.objects['Oral inspection fill'];oral_matrix=oral_key.matrix_world.copy();oral_size=oral_key.data.size
fill=bpy.data.lights.new('Candidate oral fill','AREA');fill.energy=0;fill.shape='DISK';fill.size=.50;fill.color=(.90,.95,1.)
ob=bpy.data.objects.new('Candidate oral fill',fill);scene.collection.objects.link(ob);ob.location=(.55,-4.20,-.10)
ob.rotation_euler=(Vector((0,-1.50,-.18))-ob.location).to_track_quat('-Z','Y').to_euler()
def view(pos,target,scale,oral=False):
    scene.camera.location=pos;scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=scale
    if oral:
        oral_key.location=(-.40,-4.30,-.17);oral_key.rotation_euler=(Vector((0,-1.50,-.18))-oral_key.location).to_track_quat('-Z','Y').to_euler()
        oral_key.data.energy=200;oral_key.data.size=.70;fill.energy=70
    else:oral_key.matrix_world=oral_matrix;oral_key.data.energy=0;oral_key.data.size=oral_size;fill.energy=0

def render(path,w,h,alpha,clip,phase,label):
    scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=alpha;scene.render.filepath=str(path)
    bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
    manifest['renders'].append({'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'clip':clip,'phase':phase,'purpose':label,
        'camera':list(scene.camera.location),'ortho_scale':scene.camera.data.ortho_scale,'size':[w,h]})
    (OUT/'portrait-pose-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('TITANICHTHYS_CANDIDATE_VIEW_OK '+path.name,flush=True)
view((8.4,-9.4,4.7),(0,.10,.08),9.4);rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
for name,w,h,alpha in [('titanichthys.select.png',1600,1200,True),('titanichthys.card.png',800,600,True),('titanichthys.thumb.png',256,192,True),('titanichthys.png',1600,1200,False)]:
    render(OUT/name,w,h,alpha,'Idle',0.,'candidate portrait from exact export materials')
poses=[
 ('Idle-side','Idle',0.,(11,.55,.08),(0,.55,.08),9.4,False),
 ('Swim-side','Swim',.25,(11,.55,.08),(0,.55,.08),9.4,False),
 ('TurnLeft-oblique','TurnLeft',.45,(8.4,-9.4,4.7),(0,.10,.08),9.6,False),
 ('Bite-oral','Bite',.35,(0,-8,-.16),(0,-1.65,-.16),2.8,True),
 ('Eat-oral','Eat',.5,(0,-8,-.16),(0,-1.65,-.16),2.8,True),
 ('Heavy-side','Heavy',.46,(11,.55,.08),(0,.55,.08),9.6,False),
 ('Ability-oral','Ability',.5,(0,-8,-.16),(0,-1.65,-.16),2.8,True),
 ('Ability-side','Ability',.5,(11,-1.65,.08),(0,-1.65,.08),4.4,False),
 ('Guard-front','Guard',.4,(0,-10,1.2),(0,.1,0),8.1,False),
 ('Dodge-oblique','Dodge',.45,(8.4,-9.4,4.7),(0,.10,.08),9.8,False),
 ('Death-oblique','Death',1.,(8.4,-9.4,4.7),(0,.10,.08),10.,False),
 ('Orbit-front','Idle',0.,(0,-7,1.0),(0,-1.94,.46),3.6,False),
 ('Orbit-side','Idle',0.,(8,-2.0,.5),(0,-2.,.5),2.8,False),
 ('Orbit-dorsal','Idle',0.,(0,-2.0,8),(0,-2.,.5),3.6,False),
 ('Orbit-oblique','Idle',0.,(5,-6,3.3),(0,-1.64,.24),4.5,False),
]
for name,clip,phase,pos,target,scale,oral in poses:
    rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));view(pos,target,scale,oral)
    render(RENDERS/(name+'.png'),1400,1050,False,clip,phase,'actual production pose; visual review pending')
# Actual imported LOD evidence, retaining only the saved studio lights/camera.
for obj in list(bpy.data.objects):
    if obj.type in ('MESH','ARMATURE')or obj.name.startswith('anchor_'):bpy.data.objects.remove(obj,do_unlink=True)
scene.frame_set(0);lod=OUT/'titanichthys.lod1.glb'
expected_lod=next(v['sha256']for v in report['files']if v['path']==str(lod))
if sha(lod)!=expected_lod:raise RuntimeError('LOD changed')
bpy.ops.import_scene.gltf(filepath=str(lod))
for obj in bpy.data.objects:
    if obj.type=='ARMATURE'and obj.animation_data:obj.animation_data.action=None
view((8.4,-9.4,4.7),(0,.10,.08),9.4)
render(RENDERS/'LOD-oblique.png',1400,1050,False,'bind',0.,'actual imported texture-free LOD pigment and silhouette')
neutral=bpy.data.materials.new('Temporary neutral LOD inspection');neutral.use_nodes=True
bs=neutral.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.35,.36,.35,1);bs.inputs['Roughness'].default_value=.65
for obj in bpy.data.objects:
    if obj.type=='MESH':
        obj.data.materials.clear();obj.data.materials.append(neutral)
        for poly in obj.data.polygons:poly.material_index=0
render(RENDERS/'LOD-neutral.png',1400,1050,False,'bind',0.,'actual LOD geometry independently of pigment')
if sha(blend)!=expected:raise RuntimeError('Renderer changed source blend')
print('TITANICHTHYS_CANDIDATE_RENDER_OK '+str(OUT/'portrait-pose-manifest.json'))
