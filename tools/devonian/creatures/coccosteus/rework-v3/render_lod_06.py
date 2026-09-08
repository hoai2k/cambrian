"""Actual GLB portraits and bounded pose/LOD views. No source blend mutations."""
import bpy,sys,json,argparse
from pathlib import Path
from mathutils import Vector,Matrix
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from lod_common_05 import *
from rig_actions_01 import CLIPS
report=json.loads((OUT/'candidate-report.json').read_text());check_sources(report)
for row in report['files']:
    if sha(row['path'])!=row['sha256']:raise RuntimeError('Frozen candidate output changed '+row['path'])
folder=OUT/'matched-evidence-06'
if folder.exists():raise RuntimeError('Preserve existing render group')
folder.mkdir();bpy.ops.wm.open_mainfile(filepath=str(PREVIOUS/'coccosteus-production-04.blend'));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.samples=48
scene.render.fps=30;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.cycles.seed=71204;scene.cycles.use_animated_seed=False
manifest={'group':'structured-lod-matched','renderer_sha256':sha(Path(__file__)),'source_sha256':report['source_sha256'],'complete':False,'renders':[]}
loaded=None;rig=None
oral=scene.objects.get('Oral inspection fill');oral_power=oral.data.energy if oral else 0

def load(lod=False):
    global loaded,rig
    for ob in list(scene.objects):
        if ob.type in ('MESH','ARMATURE','EMPTY'):bpy.data.objects.remove(ob,do_unlink=True)
    for action in list(bpy.data.actions):bpy.data.actions.remove(action)
    path=OUT/('coccosteus.lod1.glb'if lod else'coccosteus.glb');loaded=record(path)
    scene.frame_set(0)
    bpy.ops.import_scene.gltf(filepath=str(path));rig=next(o for o in scene.objects if o.type=='ARMATURE')
    rig.animation_data_create()
    for track in rig.animation_data.nla_tracks:track.mute=True
    if rig.animation_data.action is not None:rig.animation_data.action_slot=None
    rig.animation_data.action=None
    for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    scene.frame_set(0);bpy.context.view_layer.update()

def render(name,clip,phase,camera,target,scale,w=1280,h=960,alpha=False,oral_fill=False):
    tracks=[t for t in rig.animation_data.nla_tracks if t.name==clip or t.name.endswith('_'+clip)or t.name.endswith('|'+clip)]
    assert len(tracks)==1 and len(tracks[0].strips)==1,'Ambiguous imported track '+clip
    strip=tracks[0].strips[0];action=strip.action;slot=strip.action_slot
    assert slot is not None,'Missing imported action slot '+clip
    if rig.animation_data.action is not None:rig.animation_data.action_slot=None
    rig.animation_data.action=None
    for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
    scene.frame_set(0)
    rig.animation_data.action=action;rig.animation_data.action_slot=slot
    # Blender glTF importer uses the current 30 fps; compare actual range to requested seconds.
    start,end=action.frame_range;assert abs((end-start)/30-CLIPS[clip])<1e-4
    scene.frame_set(round(start+(end-start)*phase))
    cam=scene.camera;cam.data.type='ORTHO';cam.location=camera;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
    if oral:oral.data.energy=60 if oral_fill else oral_power
    path=folder/name
    if path.exists():raise RuntimeError('Preserve image '+str(path))
    scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=alpha;scene.render.filepath=str(path)
    bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
    assert sha(loaded['path'])==loaded['sha256']
    manifest['renders'].append({**record(path),'sourceGlb':loaded,'clip':clip,'phase':phase,'frame':scene.frame_current,
        'importedAction':action.name,'importedSlot':slot.identifier,'durationSeconds':(end-start)/30,
        'camera':camera,'target':target,'scale':scale,'resolution':[w,h],'oralFill':oral_fill})
    (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('COCCOSTEUS_GLB_VIEW_OK '+name,flush=True)
rows=[
 ('Idle-side','Idle',0,(7,.4,.1),(0,.4,.1),5.1,False),
 ('Idle-oblique','Idle',0,(4.6,-5.2,2.7),(0,.3,0),4.85,False),
 ('Fin-close','Idle',0,(3,-.25,1.0),(.45,-.18,-.20),1.65,False),
 ('Attack','Attack',.32,(1.65,-4.7,-.35),(0,-1.34,-.11),1.55,True),
 ('Eat','Eat',.25,(0,-4,-.22),(0,-1.32,-.14),1.05,True),
]
for lod in [False,True]:
    load(lod)
    for name,clip,phase,camera,target,scale,fill in rows:
        render(('LOD-'if lod else'Full-')+name+'.png',clip,phase,camera,target,scale,oral_fill=fill)
neutral=bpy.data.materials.new('Temporary structured LOD neutral');neutral.use_nodes=True
bs=neutral.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.40,.385,.355,1);bs.inputs['Roughness'].default_value=.66
for ob in scene.objects:
    if ob.type=='MESH':
        ob.data.materials.clear();ob.data.materials.append(neutral)
        for p in ob.data.polygons:p.material_index=0
render('LOD-neutral.png','Idle',0,(4.6,-5.2,2.7),(0,.3,0),4.85)
assert len(manifest['renders'])==11
manifest['complete']=True;(folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');check_sources(report)
print('COCCOSTEUS_LOD_05_MATCHED_COMPLETE',flush=True)
