"""Resume only the final normal2048 oral render after disk-full failure; preserve prior five images."""
from pathlib import Path
import bpy,sys,json,hashlib
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
OUT=LOCAL/'normal-render-study-02/renders-resume-03';sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import CLIPS
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
SOURCES={'original':(LOCAL/'candidate-06/titanichthys.glb','e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad'),
 'normal2048':(LOCAL/'normal-render-study-02/titanichthys.glb','8168ca30b53bfde2454349232ac84fffa02de182b7b738cad172c8d3c3bce06a')}
for file,digest in SOURCES.values():assert sha(file)==digest
assert not OUT.exists();OUT.mkdir()
blend=LOCAL/'candidate-06/titanichthys-production-06.blend';blend_hash=sha(blend)
bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=False;scene.cycles.seed=27
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.film_transparent=False;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.exposure=-.35
scene.camera.data.type='ORTHO';oral=bpy.data.objects['Oral inspection fill'];oral.data.energy=0
manifest={'source_sha256':sha(__file__),'studio_sha256':blend_hash,'scope':'Matched actual exported full models; body normal2048 and lossless PNG only; no eye or oral07 changes','renders':[]}
views=[('head',(5,-6,3.3),(0,-1.64,.24),4.5,'Idle',0.),('body',(11,.55,.08),(0,.55,.08),9.4,'Idle',0.),('oral',(0,-8,-.16),(0,-1.65,-.16),2.8,'Ability',.5)]
for label,(file,digest)in SOURCES.items():
    if label!='normal2048':continue
    for ob in list(bpy.data.objects):
        if ob.type in ('MESH','ARMATURE')or ob.name.startswith('anchor_'):bpy.data.objects.remove(ob,do_unlink=True)
    scene.frame_set(0);bpy.ops.import_scene.gltf(filepath=str(file))
    rigs=[o for o in bpy.data.objects if o.type=='ARMATURE'];assert len(rigs)==1;rig=rigs[0];tracks=rig.animation_data.nla_tracks
    assert set(t.name for t in tracks)==set(CLIPS)
    for t in tracks:t.mute=True
    for name,pos,target,scale,clip,phase in views:
        if name!='oral':continue
        strip=next(t for t in tracks if t.name==clip).strips[0];rig.animation_data.action=strip.action;rig.animation_data.action_slot=strip.action_slot
        scene.frame_set(round(CLIPS[clip]*30*phase));scene.camera.location=pos;scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=scale
        oral.data.energy=200 if name=='oral'else 0
        if name=='oral':
            oral.location=(-.40,-4.30,-.17);oral.rotation_euler=(Vector((0,-1.50,-.18))-oral.location).to_track_quat('-Z','Y').to_euler();oral.data.size=.70
        targetfile=OUT/(label+'-'+name+'.png');scene.render.filepath=str(targetfile);bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
        manifest['renders'].append({'file':str(targetfile),'sha256':sha(targetfile),'asset':str(file),'asset_sha256':digest,'clip':clip,'phase':phase,'camera':pos,'target':target,'scale':scale})
        (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('NORMAL_STUDY_VIEW',label,name,flush=True)
for file,digest in SOURCES.values():assert sha(file)==digest
assert sha(blend)==blend_hash
print('NORMAL_STUDY_RENDER_COMPLETE',flush=True)
