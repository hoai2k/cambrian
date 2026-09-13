"""Actual exported full/LOD face views and four full-model portraits, local only.
Run after export/audit. DUNK_FINAL_RENDER=poses|portraits|all (default all).
"""
import bpy,hashlib,json,os
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[4]
Q=R.parent/'devonian-authoring/dunkleosteus/face-v4/candidate03/exports'
manifest=json.loads((Q/'export-evidence.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
mode=os.environ.get('DUNK_FINAL_RENDER','all');assert mode in ('all','poses','portraits')
assert not (Q/('render-evidence-'+mode+'.json')).exists(), 'Refuse to overwrite render evidence'
if mode in ('all','poses'):
    assert all(not (Q/n).exists() or not any((Q/n).iterdir()) for n in ('review-full','review-lod')), 'Refuse to overwrite prior review images'
if mode in ('all','portraits'):
    assert all(not (Q/n).exists() for n in ('dunkleosteus.png','dunkleosteus.select.png','dunkleosteus.card.png','dunkleosteus.thumb.png')), 'Refuse to overwrite prior portraits'
records=[]
def bind_action(rig,action):
    assert len(action.slots)==1, ('Ambiguous action slots',action.name)
    rig.animation_data.action=action
    rig.animation_data.action_slot=action.slots[0]
    assert rig.animation_data.action_slot.handle==action.slots[0].handle


def verify_action_frame(rig,action,frame):
    slot=rig.animation_data.action_slot
    assert slot is not None and slot.handle==action.slots[0].handle
    samples=[]
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                if bag.slot_handle!=slot.handle:continue
                for fc in bag.fcurves:
                    if 'jaw' not in fc.data_path or '.rotation_' not in fc.data_path:continue
                    expected=fc.evaluate(frame)
                    actual=rig.path_resolve(fc.data_path)[fc.array_index]
                    assert abs(actual-expected)<2e-4, ('Action did not evaluate',action.name,frame,fc.data_path,actual,expected)
                    samples.append([fc.data_path,fc.array_index,actual,expected])
    assert samples, ('No jaw curves in bound slot',action.name)
    return {'slot':slot.identifier,'verifiedJawChannels':samples}


views=[('rest-side','Idle',1,(4,-1,.13),(0,-1.03,.025),1.42),
       ('rest-oblique','Idle',1,(2,-3,.58),(0,-1.02,.025),1.52),
       ('rest-front','Idle',1,(0,-4,.1),(0,-1.03,.025),1.42),
       ('max-oblique','Heavy',15,(2,-3,.2),(0,-.96,-.17),1.80),
       ('max-front','Heavy',15,(0,-4,.04),(0,-.96,-.17),1.80),
       ('mid-bite-side','Bite',6,(4,-1,.1),(0,-.97,-.10),1.70),
       ('eat-oblique','Eat',19,(2,-3,.2),(0,-.96,-.12),1.75),
       ('recovery-oblique','Heavy',28,(2,-3,.2),(0,-.96,-.12),1.70)]
for model in manifest['models']:
    p=Path(model['path']);assert sha(p)==model['sha256']
    lod='.lod1.' in p.name
    if mode=='portraits' and lod:continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps=30
    bpy.ops.import_scene.gltf(filepath=str(p))
    scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE')
    for t in rig.animation_data.nla_tracks:t.mute=True
    actions={a.name.split('|')[-1]:a for a in bpy.data.actions};assert len(actions)==18
    scene.render.engine='CYCLES';scene.cycles.device='CPU'
    scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
    scene.world=bpy.data.worlds.new('V4 export studio');scene.world.use_nodes=True
    bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.15,.17,.19,1);bg.inputs[1].default_value=.45
    for name,loc,energy,col,size in [('Key',(2,-3,4),600,(1,.95,.88),3.5),('Fill',(-3,-2,1),440,(.8,.89,1),4),('Rim',(1,3,3),700,(.8,.9,1),3),('Oral fill',(0,-3,-.25),80,(1,.94,.89),1.5)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name
        o.data.energy=energy;o.data.color=col;o.data.shape='DISK';o.data.size=size
        o.rotation_euler=(Vector((0,-.8,0))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
    def render(path,clip,frame,loc,target,scale,width,height):
        bind_action(rig,actions[clip]);scene.frame_set(frame);bpy.context.view_layer.update()
        binding=verify_action_frame(rig,actions[clip],frame)
        cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
        scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True)
        records.append({'file':str(path),'sha256':sha(path),'assetSHA256':model['sha256'],
                        'asset':p.name,'clip':clip,'frame':frame,'actionBinding':binding,'camera':loc,'target':target,'scale':scale,'size':[width,height]})
    if mode in ('all','poses'):
        out=Q/('review-lod' if lod else 'review-full');out.mkdir(exist_ok=True)
        for name,clip,frame,loc,target,scale in views:render(out/(name+'.png'),clip,frame,loc,target,scale,1000,800)
    if not lod and mode in ('all','portraits'):
        scene.cycles.samples=48
        for name,loc,size in [('dunkleosteus.png',(3.8,-4,1.5),(1600,1200)),('dunkleosteus.select.png',(4,-4,1.7),(1600,1200)),('dunkleosteus.card.png',(4,-4,1.7),(800,600)),('dunkleosteus.thumb.png',(4,-4,1.7),(256,192))]:
            render(Q/name,'Idle',1,loc,(0,.12,0),4.25,*size)
(Q/('render-evidence-'+mode+'.json')).write_text(json.dumps({'scriptSHA256':sha(__file__),'images':records,'status':'actual exported images awaiting individual visual review'},indent=2)+'\n')
print('DUNK_FACE_EXPORT_RENDER_COMPLETE',len(records),mode)
