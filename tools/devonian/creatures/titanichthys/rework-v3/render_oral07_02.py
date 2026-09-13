"""Five bounded oral views of actual imported candidate07 full/LOD GLBs.
No geometry, rig, material edits or blend save. Terra CPU2, after numerical gate.
"""
from pathlib import Path
import bpy,sys,json,hashlib
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
SRC=ROOT.parent/'devonian-authoring/titanichthys/rework-v3/candidate-07';OUT=SRC/'oral-renders-02'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import CLIPS
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
candidate=json.loads((SRC/'candidate-report.json').read_text())
for name,h in candidate['source_sha256'].items():assert sha(HERE/name)==h
for f in candidate['files']:assert sha(f['path'])==f['sha256']
assert (SRC/'export-structural-review.json').exists()
sweep=json.loads((SRC/'oral-sweep-02/result.json').read_text());assert sweep['passed'] and sweep['sampled_pose_count']==58
assert not OUT.exists(),'Preserve actual mouth renders';OUT.mkdir()
bpy.ops.wm.open_mainfile(filepath=str(SRC/'titanichthys-production-07.blend'));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.film_transparent=False;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.exposure=-.35
scene.camera.data.type='ORTHO'
oral=bpy.data.objects['Oral inspection fill'];oral.location=(-.40,-4.30,-.17)
oral.rotation_euler=(Vector((0,-1.50,-.18))-oral.location).to_track_quat('-Z','Y').to_euler();oral.data.energy=200;oral.data.size=.70
light=bpy.data.lights.new('Candidate07 oral fill','AREA');light.energy=70;light.shape='DISK';light.size=.50;light.color=(.90,.95,1.)
fill=bpy.data.objects.new('Candidate07 oral fill',light);scene.collection.objects.link(fill);fill.location=(.55,-4.20,-.10)
fill.rotation_euler=(Vector((0,-1.50,-.18))-fill.location).to_track_quat('-Z','Y').to_euler()
manifest={'script_sha256':sha(__file__),'candidate_report_sha256':sha(SRC/'candidate-report.json'),
 'sweep_sha256':sha(SRC/'oral-sweep-02/result.json'),'renders':[],'scope':'Actual imported GLB materials and animation slots; oral correction review only; eyes unchanged for separate root study'}
def imported(name):
    for ob in list(bpy.data.objects):
        if ob.type in ('MESH','ARMATURE')or ob.name.startswith('anchor_'):bpy.data.objects.remove(ob,do_unlink=True)
    scene.frame_set(0);bpy.ops.import_scene.gltf(filepath=str(SRC/name))
    rigs=[ob for ob in bpy.data.objects if ob.type=='ARMATURE'];assert len(rigs)==1
    rig=rigs[0];assert rig.animation_data
    tracks=rig.animation_data.nla_tracks;assert set(t.name for t in tracks)==set(CLIPS)
    for track in tracks:track.mute=True
    return rig,tracks
def render(rig,tracks,asset,name,clip,phase,oblique=False):
    strip=next(t for t in tracks if t.name==clip).strips[0]
    rig.animation_data.action=strip.action;rig.animation_data.action_slot=strip.action_slot
    scene.frame_set(round(CLIPS[clip]*30*phase))
    if oblique:position=(2.5,-7,.45);target=(0,-1.95,-.2);scale=3.0
    else:position=(0,-8,-.16);target=(0,-1.65,-.16);scale=2.8
    scene.camera.location=position;scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=scale
    path=OUT/(name+'.png');scene.render.filepath=str(path);bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
    manifest['renders'].append({'path':str(path),'sha256':sha(path),'bytes':path.stat().st_size,'asset':asset,'asset_sha256':sha(SRC/asset),
      'clip':clip,'phase':phase,'frame':scene.frame_current,'imported_action':strip.action.name,'imported_slot':strip.action_slot.identifier,
      'camera':position,'target':target,'ortho_scale':scale})
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('TITANICHTHYS_ORAL07_VIEW_OK '+name,flush=True)
name='titanichthys.glb';rig,tracks=imported(name)
render(rig,tracks,name,'01-full-ability-front','Ability',.5)
render(rig,tracks,name,'02-full-eat-front','Eat',.5)
render(rig,tracks,name,'03-full-ability-oblique','Ability',.5,True)
name='titanichthys.lod1.glb';rig,tracks=imported(name)
render(rig,tracks,name,'04-lod-ability-front','Ability',.5)
render(rig,tracks,name,'05-lod-eat-front','Eat',.5)
for f in candidate['files']:assert sha(f['path'])==f['sha256']
print('TITANICHTHYS_ORAL07_RENDER_OK '+str(OUT/'manifest.json'),flush=True)
