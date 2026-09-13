"""Coccosteus production candidate: retained geometry/PBR, bespoke bone motions."""
import bpy,sys,json,math
from pathlib import Path
import numpy as np
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from production_common_01 import *
from rig_actions_01 import bones,pose,CLIPS,LOOPS,ANCHORS,HINGE,NECK,axial,smooth,normalize
from atlas_pigment_01 import sample_object,stats,assert_pigment,transfer_export_colors
from export_patch_01 import patch_export
verify();br=json.loads((BAKE/'bake-report.json').read_text());check_sources(br)
for row in br['textures']+br['files']:
    if sha(row['path'])!=row['sha256']:raise RuntimeError('Changed frozen bake output '+row['path'])
if OUT.exists():raise RuntimeError('Preserve existing candidate-01')
OUT.mkdir();bpy.ops.wm.open_mainfile(filepath=str(BAKE/'coccosteus-baked-01.blend'));scene=bpy.context.scene
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.device='CPU'
meshes=sorted([o for o in scene.objects if o.type=='MESH'],key=lambda o:o.name);assert len(meshes)==9
body=next(o for o in meshes if o.name.startswith('Continuous'))
accepted={o.name:geo_hash(o)for o in meshes};assert accepted==br['geometry_sha256']
original_weights=[];names={g.index:g.name for g in body.vertex_groups}
for v in body.data.vertices:original_weights.append({names[g.group]:g.weight for g in v.groups})
# Mathematical LBS agreement first, then actual Blender armature agreement below.
def rotate(p,pivot,angle):
    x,y,z=p;cy,cz=pivot[1:];c,s=math.cos(angle),math.sin(angle)
    return np.array((x,cy+(y-cy)*c-(z-cz)*s,cz+(y-cy)*s+(z-cz)*c))
maximum=0.
for i,v in enumerate(body.data.vertices):
    w=original_weights[i];p=np.array(v.co[:]);q=w.get('body',0)*p+w.get('skull',0)*rotate(p,NECK,-.041)+w.get('jaw',0)*rotate(p,HINGE,.34)
    maximum=max(maximum,float(np.max(np.abs(q-np.array(body.data.shape_keys.key_blocks['GapeStudy'].data[i].co)))))
assert maximum<2e-6, 'Accepted gape ownership differs'
for ob in meshes:
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:key.value=0
pigment={o.name:sample_object(o)for o in meshes};stages={o.name:{'dense_sampled':stats(pigment[o.name])}for o in meshes}
# Dense sampling proves the bake carries colour; final LOD pigment is sampled
# after geometry reduction, so the decimator never extrapolates authored colour.
B=bones();arm=bpy.data.armatures.new('Coccosteus bespoke production skeleton');rig=bpy.data.objects.new('coccosteus_rig',arm);scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for name,data in B.items():
    bone=arm.edit_bones.new(name);bone.head=data['head'];bone.tail=data['tail']
    if data['parent']:bone.parent=arm.edit_bones[data['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def bind(ob,weights):
    for group in list(ob.vertex_groups):ob.vertex_groups.remove(group)
    groups={name:ob.vertex_groups.new(name=name)for name in B}
    for i,w in enumerate(weights):
        assert len(w)<=4 and abs(sum(w.values())-1)<1e-6 and min(w.values())>=0
        for name,value in w.items():groups[name].add([i],value,'REPLACE')
    matrix=ob.matrix_world.copy();ob.parent=rig;ob.matrix_world=matrix
    mod=ob.modifiers.new('Coccosteus anatomical deformation','ARMATURE');mod.object=rig
weights=[]
for v,w in zip(body.data.vertices,original_weights):
    result={name:value*w.get('body',0)for name,value in axial(v.co.y).items()}
    result['skull']=w.get('skull',0);result['jaw']=w.get('jaw',0);weights.append(normalize(result))
bind(body,weights)
for ob in meshes:
    if ob is body:continue
    if 'orbital study'in ob.name:ww=[{'skull':1.}]*len(ob.data.vertices)
    elif 'pectoral'in ob.name or 'pelvic'in ob.name:
        kind='pectoral'if 'pectoral'in ob.name else'pelvic';side='R'if ob.name.endswith('-1')else'L'
        root,span=(.25,.51)if kind=='pectoral'else(.14,.30);ww=[]
        for v in ob.data.vertices:
            u=min(1.,max(0.,(abs(v.co.x)-root)/span));tip=smooth(u,.18,.78);base=1-smooth(u,0,.11)
            w={kind+'0'+side:(1-tip)*(1-base),kind+'1'+side:tip*(1-base)}
            for n,q in ({'body':1.}if kind=='pectoral'else axial(v.co.y)).items():w[n]=w.get(n,0)+q*base
            ww.append(normalize(w))
    elif 'dorsal'in ob.name:
        ww=[]
        for v in ob.data.vertices:
            amount=.22*smooth(v.co.z,.365,.52);w={n:q*(1-amount)for n,q in axial(v.co.y).items()};w['dorsal']=amount;ww.append(normalize(w))
    elif 'caudal'in ob.name:
        ww=[]
        for v in ob.data.vertices:
            amount=.25*smooth(abs(v.co.z-.43),.14,.50)*smooth(v.co.y,1.72,2.20)
            w={n:q*(1-amount)for n,q in axial(v.co.y).items()};w['caudal']=w.get('caudal',0)+amount;ww.append(normalize(w))
    else:raise RuntimeError('Unspecified mesh '+ob.name)
    bind(ob,ww)
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
def reset():
    for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
rig.pose.bones['jaw'].rotation_euler.x=.34;rig.pose.bones['skull'].rotation_euler.x=-.041
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();actual_gape={}
for ob in [body]+[o for o in meshes if 'orbital study'in o.name]:
    ev=ob.evaluated_get(deps);mesh=ev.to_mesh();key=ob.data.shape_keys.key_blocks['GapeStudy']
    error=max((v.co-key.data[i].co).length for i,v in enumerate(mesh.vertices));ev.to_mesh_clear()
    assert error<3e-6,'Actual bone deformation fails approved gape '+ob.name
    actual_gape[ob.name]=error
reset();scene.render.fps=30;rig.animation_data_create();action_records={};bounds={};seams={}
def curves(action):
    if hasattr(action,'fcurves'):yield from action.fcurves
    else:
        for layer in action.layers:
            for strip in layer.strips:
                if hasattr(strip,'channelbags'):
                    for bag in strip.channelbags:yield from bag.fcurves
for clip,duration in CLIPS.items():
    action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action;last=round(duration*30)
    for frame in range(last+1):
        for name,data in pose(clip,frame/last).items():
            pb=rig.pose.bones[name];pb.rotation_euler=data['rotation'];pb.location=data['location']
            if name!='root':pb.keyframe_insert('rotation_euler',frame=frame);pb.keyframe_insert('location',frame=frame)
    for fc in curves(action):
        for key in fc.keyframe_points:key.interpolation='LINEAR'
    a,b=pose(clip,0),pose(clip,1);seams[clip]=max(abs(x-y)for n in B for key in ('rotation','location')for x,y in zip(a[n][key],b[n][key]))
    if clip!='Death':assert seams[clip]<1e-7
    samples=[]
    for phase in (0,.2,.4,.6,.8,1.):
        scene.frame_set(round(last*phase));deps=bpy.context.evaluated_depsgraph_get()
        for ob in meshes:
            ev=ob.evaluated_get(deps);mesh=ev.to_mesh();pts=np.array([ev.matrix_world@v.co for v in mesh.vertices]);ev.to_mesh_clear()
            assert np.isfinite(pts).all();samples.extend([pts.min(0),pts.max(0)])
    bounds[clip]=[np.min(samples,axis=0).tolist(),np.max(samples,axis=0).tolist()]
    action_records[clip]={'seconds':duration,'samples':last+1,'interpolation':'LINEAR'}
    rig.animation_data.action=None;print('COCCOSTEUS_ACTION_OK '+clip,flush=True)
reset();scene.frame_set(0);sockets=[]
for data in ANCHORS:
    ob=bpy.data.objects.new(data['name'],None);scene.collection.objects.link(ob);ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=data['bone'];ob.matrix_world.translation=Vector(data['point'])
    ob['cambrianAnchor']={'version':1,'role':data['role'],'parentBone':data['bone']};sockets.append(ob)
parts=[]
for source in meshes:
    ob=source.copy();ob.data=source.data.copy();scene.collection.objects.link(ob);ob.name=source.name+'_export'
    if ob.data.shape_keys:ob.shape_key_clear()
    for attr in list(ob.data.color_attributes):
        if attr.name!='Color':ob.data.color_attributes.remove(attr)
    ob.data.color_attributes['Color'].data.foreach_set('color',np.ones((len(ob.data.loops),4),np.float32).ravel());parts.append(ob)
def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts+sockets+[rig]:ob.select_set(True)
    bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,
    export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',
    export_vertex_color='NAME',export_vertex_color_name='Color',export_all_vertex_colors=False,export_yup=True,export_extras=True,export_morph=False)
select_export();bpy.ops.export_scene.gltf(filepath=str(OUT/'coccosteus.glb'),**kwargs)
fulltris=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in parts)
for ob,source in zip(parts,meshes):
    # Reduction sees neutral colour only. Do not propagate sampled colour through
    # Blender's decimator: a separate candidate measured large negative overshoot.
    values=np.array([v.color[:]for v in ob.data.color_attributes['Color'].data])
    assert np.isfinite(values).all() and np.max(np.abs(values-1))<1e-5
    stages[source.name]['pre_decimate_neutral']=stats(values)
    bpy.context.view_layer.objects.active=ob;dec=ob.modifiers.new('Coccosteus authored LOD','DECIMATE');dec.ratio=.25 if source is body else .70 if 'orbital study'in source.name else .24
    bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
    values=np.array([v.color[:]for v in ob.data.color_attributes['Color'].data])
    stages[source.name]['post_decimate_neutral']=stats(values)
    assert np.isfinite(values).all() and np.max(np.abs(values-1))<1e-5
    footprint=.0022 if source is body else 0. if 'orbital study'in source.name else .0008
    final_colour=sample_object(ob,footprint=footprint)
    assert_pigment(final_colour,source.name+' final LOD UV-sampled pigment')
    stages[source.name]['final_uv_sampled']=stats(final_colour);stages[source.name]['linear_atlas_filter_radius']=footprint
    mats=[]
    for old in source.data.materials:
        mat=bpy.data.materials.new(old.name+' LOD');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.18 if 'eyes'in old.name else .55
        color=mat.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Color';mat.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color']);mats.append(mat)
    indices=[p.material_index for p in ob.data.polygons];ob.data.materials.clear()
    for mat in mats:ob.data.materials.append(mat)
    for p,i in zip(ob.data.polygons,indices):p.material_index=i
lodtris=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in parts);assert lodtris/fulltris<.4
select_export();bpy.ops.export_scene.gltf(filepath=str(OUT/'coccosteus.lod1.glb'),**kwargs)
transfer=transfer_export_colors(OUT/'coccosteus.lod1.glb',parts)
(OUT/'lod-pigment-transfer.json').write_text(json.dumps({'stages':stages,'export':transfer},indent=2)+'\n')
patch_export(OUT/'coccosteus.glb');patch_export(OUT/'coccosteus.lod1.glb',True)
for ob in parts:bpy.data.objects.remove(ob,do_unlink=True)
reset();rig.animation_data.action=None;scene.frame_set(0);bpy.context.view_layer.update()
for ob in meshes:assert geo_hash(ob)==accepted[ob.name], 'Accepted rest shape changed'
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.cycles.samples=48
blend=OUT/'coccosteus-production-01.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
metadata=json.loads((HERE/'metadata_seed_01.json').read_text());y=[v.co.y for ob in meshes for v in ob.data.vertices]
metadata.update(modelLength=max(y)-min(y),clips=list(CLIPS),looping=list(LOOPS),anchors=[a['name']for a in ANCHORS]);(OUT/'coccosteus.json').write_text(json.dumps(metadata,indent=2)+'\n')
report={'phase':'candidate; exported appearance/playback/eye/oral/general audits pending','source_sha256':sources(),
    'material_blend_sha256':SOURCE_SHA,'bake_report_sha256':sha(BAKE/'bake-report.json'),'accepted_geometry_sha256':accepted,
    'accepted_rest_geometry_unchanged':True,'mathematical_gape_max_error':maximum,'actual_armature_gape_error':actual_gape,
    'bones':B,'actions':action_records,'loop_recovery_seams':seams,'deformed_bounds':bounds,'anchors':ANCHORS,
    'full_triangles':fulltris,'lod_triangles':lodtris,'lod_ratio':lodtris/fulltris,'pigment_transfer':transfer,
    'files':[record(p)for p in [blend,OUT/'coccosteus.glb',OUT/'coccosteus.lod1.glb',OUT/'coccosteus.json']]}
(OUT/'candidate-report.json').write_text(json.dumps(report,indent=2)+'\n');verify()
print('COCCOSTEUS_CANDIDATE_01_COMPLETE',flush=True)
