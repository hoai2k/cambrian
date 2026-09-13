"""Rig the accepted continuous sculpt, add attached oral denticles, export locally.

Creative inputs are frozen separately; this file does not package public assets.
"""
import bpy, bmesh, sys, json, hashlib, struct, math
import numpy as np
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/gemuendina/rework-v3'
MATERIAL=LOCAL/'material-03/gemuendina-material-03.blend'
MATERIAL_SHA='810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada'
METADATA=ROOT/'public/assets/devonian/creatures/gemuendina.json'
METADATA_SHA='991a2cfcaf8450f4443438219b3c2639d2a4f6a1a5a1acd1a7cbfe901f8c0913'
OUT=LOCAL/'candidate-02'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import bones,weights,pose,CLIPS,LOOPS,ANCHORS
from sculpt_spec_02 import make_mesh,APERTURE_Y
from orbit_correction_02 import orbital_delta,eye_center,eye_local
from filter_lod_pigment_02 import filter_body
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
if sha(MATERIAL)!=MATERIAL_SHA:raise RuntimeError('Frozen material input mismatch; Astra must bind approved material')
if sha(METADATA)!=METADATA_SHA:raise RuntimeError('Frozen metadata input mismatch')
if OUT.exists() and any(OUT.iterdir()):raise RuntimeError('candidate-02 already contains evidence')
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(MATERIAL));scene=bpy.context.scene
scene.unit_settings.scale_length=1.;scene.unit_settings.system='NONE'
body=bpy.data.objects['Gemuendina_NEW_clay_envelope'];eyes=[bpy.data.objects['Dorsal_eye_'+s]for s in ('L','R')]
body.name='gemuendina_body'
for obj,s in zip(eyes,('L','R')):obj.name='gemuendina_eye_'+s
def geo_hash(obj):return hashlib.sha256(b''.join(struct.pack('<fff',*v.co)for v in obj.data.vertices)).hexdigest()
body_hash=geo_hash(body)
if body_hash!='0bae594a9fd11f82fd40b2cceae1374af90a3d75bfd2c9120208e5d149857648':raise RuntimeError('Accepted clay body geometry changed')
baseline_body_hash=body_hash
spec_vertices,_,_,spec_regions,_=make_mesh()
if len(spec_regions)!=len(body.data.vertices):raise RuntimeError('Orbital correction topology mismatch')
changed=[]
for v,region in zip(body.data.vertices,spec_regions):
    delta=orbital_delta(v.co,region)
    if abs(delta)>1e-12:v.co.z+=delta;changed.append((v.index,delta))
body.data.update();body_hash=geo_hash(body)
for eye,side in zip(eyes,('L','R')):
    eye.location=eye_center(side)
    for v in eye.data.vertices:v.co=eye_local(v.co)
    eye.data.update()
oral_group=body.vertex_groups['region_oral'].index
oral_ids={v.index for v in body.data.vertices if any(g.group==oral_group and g.weight>.5 for g in v.groups)}
W=[weights(v.co,oral=v.index in oral_ids)for v in body.data.vertices]

# Small lower oral denticles attach to actual existing oral vertices/normals.
# The underlying accepted continuous envelope is not changed.
vertices,_,_,_,oral_spec=make_mesh()
if len(vertices)!=len(body.data.vertices):raise RuntimeError('Accepted body topology no longer matches oral landmark specification')
for i in oral_spec['rim']:
    if (Vector(vertices[i])-body.data.vertices[i].co).length>1e-6:raise RuntimeError('Oral landmark vertex correspondence changed')
dv=[];df=[];dw=[]
for row_index in (6,9,12):
    row=oral_spec['oral_rings'][row_index]
    selected=[j for j,vi in enumerate(oral_spec['rim']) if vertices[vi][1]<APERTURE_Y-.020]
    for j in selected[::4]:
        vi=row[j];p=body.data.vertices[vi].co.copy();normal=body.data.vertices[vi].normal.normalized()
        tangent=normal.cross(Vector((0,1,0))).normalized()
        if tangent.length<.1:tangent=normal.cross(Vector((1,0,0))).normalized()
        bitangent=normal.cross(tangent);start=len(dv)
        base=p-normal*.0018
        for k in range(7):
            a=k*2*math.pi/7;dv.append(tuple(base+.0031*(tangent*math.cos(a)+bitangent*math.sin(a))));dw.append(W[vi])
        dv.append(tuple(p+normal*.0065+Vector((0,.0015,0))));dw.append(W[vi])
        for k in range(7):df.append((start+k,start+(k+1)%7,start+7))
        df.append(tuple(start+k for k in reversed(range(7))))
dm=bpy.data.meshes.new('Attached_small_infragnathal_denticles');dm.from_pydata(dv,[],df);dm.update()
dent=bpy.data.objects.new('gemuendina_lower_oral_denticles',dm);scene.collection.objects.link(dent)
mat=bpy.data.materials.new('Gemuendina muted denticles');mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.17,.135,.068,1)
bs.inputs['Roughness'].default_value=.64;bs.inputs['Metallic'].default_value=0
dent.data.materials.append(mat)
for p in dent.data.polygons:p.use_smooth=True
dent['reconstruction_note']='Small attached lower-jaw denticles; illustrative count/spacing, no cutting blades'

# Bake linear vertex pigment before rigging for a texture-free reduced export.
# The full export uses explicitly white vertex multipliers with its albedo maps.
def bake_vertex_pigment(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if obj.data.color_attributes.get('Color'):obj.data.color_attributes.remove(obj.data.color_attributes['Color'])
    attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    obj.data.color_attributes.active_color=attr
    obj.data.color_attributes.render_color_index=list(obj.data.color_attributes).index(attr)
    restored=[]
    for mat in obj.data.materials:
        ns=mat.node_tree.nodes;ls=mat.node_tree.links;bs=ns.get('Principled BSDF');out=next(n for n in ns if n.type=='OUTPUT_MATERIAL')
        source=bs.inputs['Base Color'].links[0].from_socket if bs.inputs['Base Color'].is_linked else None
        em=ns.new('ShaderNodeEmission')
        if source:ls.new(source,em.inputs['Color'])
        else:em.inputs['Color'].default_value=bs.inputs['Base Color'].default_value
        ls.new(em.outputs[0],out.inputs['Surface']);restored.append((mat,bs,out,em))
    scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.target='VERTEX_COLORS'
    bpy.ops.object.bake(type='EMIT')
    for mat,bs,out,em in restored:mat.node_tree.links.new(bs.outputs[0],out.inputs['Surface']);mat.node_tree.nodes.remove(em)
    arr=np.array([a.color[:]for a in attr.data],dtype=np.float32)
    if not np.isfinite(arr).all() or arr[:,:3].max()<=.001:raise RuntimeError('Invalid vertex pigment bake '+obj.name)
    return arr
pigment={o.name:bake_vertex_pigment(o)for o in [body]+eyes+[dent]}
pigment[body.name],lod_filter_report=filter_body(body,pigment[body.name],spec_regions)
scene.render.bake.target='IMAGE_TEXTURES'

B=bones();arm=bpy.data.armatures.new('Gemuendina anatomical skeleton')
rig=bpy.data.objects.new('gemuendina_rig',arm);scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for name,spec in B.items():
    b=arm.edit_bones.new(name);b.head=spec['head'];b.tail=spec['tail']
    if spec['parent']:b.parent=arm.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def bind(obj,ww):
    for group in list(obj.vertex_groups):obj.vertex_groups.remove(group)
    groups={n:obj.vertex_groups.new(name=n)for n in B}
    for i,w in enumerate(ww):
        if len(w)>4 or abs(sum(w.values())-1)>1e-6:raise RuntimeError('Invalid weight set')
        for n,amount in w.items():groups[n].add([i],amount,'REPLACE')
    mod=obj.modifiers.new('Continuous anatomical deformation','ARMATURE');mod.object=rig;obj.parent=rig
bind(body,W)
for eye in eyes:bind(eye,[{'skull':1.}]*len(eye.data.vertices))
bind(dent,dw)
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
scene.render.fps=30;rig.animation_data_create();seams={};bounds={}
def set_pose(state):
    for name,v in state.items():
        pb=rig.pose.bones[name];pb.rotation_euler=v['rotation'];pb.location=v['location'];pb.scale=(1,1,1)
def reset():
    for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
for clip,duration in CLIPS.items():
    action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action
    last=round(duration*30)
    for frame in range(last+1):
        state=pose(clip,frame/last);set_pose(state)
        for pb in rig.pose.bones:
            if pb.name=='root':continue
            pb.keyframe_insert('rotation_euler',frame=frame)
            if pb.name in ('body','throat','branchialL','branchialR'):pb.keyframe_insert('location',frame=frame)
    # Dense authored keys interpolate without overshooting tissue limits.
    if hasattr(action,'fcurves'):
        for fc in action.fcurves:
            for key in fc.keyframe_points:key.interpolation='LINEAR'
    start,end=pose(clip,0),pose(clip,1)
    seams[clip]=max(abs(a-b)for n in B for prop in ('rotation','location')for a,b in zip(start[n][prop],end[n][prop]))
    if clip!='Death' and seams[clip]>1e-7:raise RuntimeError('Pose recovery/loop seam failed '+clip)
    samples=[]
    for frac in (0,.2,.4,.6,.8,1):
        scene.frame_set(round(last*frac));ev=body.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh()
        p=np.array([v.co[:]for v in mesh.vertices]);ev.to_mesh_clear()
        if not np.isfinite(p).all():raise RuntimeError('Nonfinite deformation '+clip)
        samples.extend([p.min(axis=0),p.max(axis=0)])
    bounds[clip]=[np.min(samples,axis=0).tolist(),np.max(samples,axis=0).tolist()]
    rig.animation_data.action=None
reset();scene.frame_set(0)

sockets=[]
for a in ANCHORS:
    obj=bpy.data.objects.new(a['name'],None);scene.collection.objects.link(obj)
    obj.parent=rig;obj.parent_type='BONE';obj.parent_bone=a['bone'];obj.matrix_world.translation=Vector(a['point'])
    obj['cambrianAnchor']={'version':1,'role':a['role'],'parentBone':a['bone']};sockets.append(obj)

source_objects=[body]+eyes+[dent]
parts=[]
for src in source_objects:
    obj=src.copy();obj.data=src.data.copy();scene.collection.objects.link(obj);obj.name=src.name+'_export'
    obj.data.color_attributes['Color'].data.foreach_set('color',np.ones((len(obj.data.loops),4),dtype=np.float32).ravel())
    parts.append(obj)
def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts+sockets+[rig]:o.select_set(True)
    bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',
    export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,
    export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',
    export_vertex_color_name='Color',export_yup=True,export_extras=True)
select_export();bpy.ops.export_scene.gltf(filepath=str(OUT/'gemuendina.glb'),**kwargs)
fulltris=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in parts)
for obj,src in zip(parts,source_objects):
    obj.data.color_attributes['Color'].data.foreach_set('color',pigment[src.name].ravel())
    bpy.context.view_layer.objects.active=obj
    de=obj.modifiers.new('Silhouette preserving LOD','DECIMATE');de.ratio=.24 if src==body else .68 if src in eyes else .50
    bpy.ops.object.modifier_move_up(modifier=de.name);bpy.ops.object.modifier_apply(modifier=de.name)
    lodmat=bpy.data.materials.new('Gemuendina vertex pigment '+src.name);lodmat.use_nodes=True
    bs=lodmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1)
    bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.27 if src in eyes else .59
    obj.data.materials.clear();obj.data.materials.append(lodmat)
    for poly in obj.data.polygons:poly.material_index=0
lodtris=sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in parts)
if lodtris/fulltris>=.4:raise RuntimeError('LOD reduction outside frozen criterion')
select_export();bpy.ops.export_scene.gltf(filepath=str(OUT/'gemuendina.lod1.glb'),**kwargs)

def patch_export(path,lod=False):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    g=json.loads(raw[20:20+length]);binary=raw[20+length:];nodes=g['nodes']
    parent={c:i for i,n in enumerate(nodes)for c in n.get('children',[])}
    def world(i):
        n=nodes[i]
        if 'matrix'in n:m=Matrix(np.array(n['matrix']).reshape(4,4).T.tolist())
        else:
            q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
        return world(parent[i])@m if i in parent else m
    for a in ANCHORS:
        i=next(i for i,n in enumerate(nodes)if n.get('name')==a['name'])
        b=next(i for i,n in enumerate(nodes)if n.get('name')==a['bone'])
        p=Vector((a['point'][0],a['point'][2],-a['point'][1]));local=world(b).inverted()@p
        if i in parent:nodes[parent[i]]['children'].remove(i)
        nodes[b].setdefault('children',[]).append(i)
        nodes[i]={'name':a['name'],'translation':list(local),'extras':{'cambrianAnchor':{'version':1,'role':a['role'],'parentBone':a['bone']}}}
    for action in g.get('animations',[]):
        name=action['name'].split('|')[-1]
        if name not in CLIPS:raise RuntimeError('Unexpected animation '+action['name'])
        action['name']=name;kept=[]
        for ch in action['channels']:
            target=ch['target'];node=nodes[target['node']];prop=target['path']
            if prop=='scale' or node.get('name')=='root':
                acc=g['accessors'][action['samplers'][ch['sampler']]['output']];view=g['bufferViews'][acc['bufferView']]
                count={'VEC3':3,'VEC4':4}[acc['type']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0)
                data=np.frombuffer(binary,dtype='<f4',count=acc['count']*count,offset=offset).reshape(-1,count)
                expected=node.get(prop,[1,1,1]if prop=='scale'else[0,0,0,1]if prop=='rotation'else[0,0,0])
                if np.max(np.abs(data-np.array(expected)))>=1e-5:raise RuntimeError('Unexpected nonconstant root/scale channel')
            else:kept.append(ch)
        action['channels']=kept
    if lod:g['animations']=[a for a in g['animations']if a['name']in ('Idle','Swim','Death')]
    names=[a['name']for a in g['animations']]
    if set(names)!=(set(('Idle','Swim','Death'))if lod else set(CLIPS)):raise RuntimeError('Export action set mismatch')
    js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary)
    return g
full=patch_export(OUT/'gemuendina.glb');lod=patch_export(OUT/'gemuendina.lod1.glb',True)
def skeleton(g):
    nodes=g['nodes'];parents={c:nodes[i].get('name')for i,n in enumerate(nodes)for c in n.get('children',[])}
    return {n['name']:{'parent':parents.get(i),'translation':n.get('translation'),'rotation':n.get('rotation'),'scale':n.get('scale')}
            for i,n in enumerate(nodes)if n.get('name')in B or n.get('name','').startswith('anchor_')}
if skeleton(full)!=skeleton(lod):raise RuntimeError('Full/LOD skeleton or anchor graph differs')
for obj in parts:bpy.data.objects.remove(obj,do_unlink=True)
if geo_hash(body)!=body_hash:raise RuntimeError('Rig authoring changed accepted base vertex coordinates')
reset();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
scene.cycles.samples=32;scene.render.bake.target='IMAGE_TEXTURES'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gemuendina-production-02.blend'))
meta=json.loads(METADATA.read_text())
meta.update(modelLength=6.06,clips=list(CLIPS),looping=list(LOOPS),anchors=[a['name']for a in ANCHORS],
    description='Broad, sculpted rhenanid with dorsal eyes and mouth, small mosaic armour and a long finless tail; tail-driven swimming with restrained pectoral trim.')
meta['notes']+=['V3 living mass and regional pigmentation follow user art direction as explicit interpretations; accepted clay-02 volume is retained except for the documented continuous orbital integration correction.',
    'Seven sequential axial tail segments provide locomotor waves; limited pectoral-edge motion steers and trims the body.']
(OUT/'gemuendina.json').write_text(json.dumps(meta,indent=2)+'\n')
report={'phase':'local candidate; visual and post-rework audit pending','input_material_sha256':MATERIAL_SHA,
        'source_sha256':{n:sha(HERE/n)for n in ('candidate_02.py','rig_actions_01.py','sculpt_spec_02.py','orbit_correction_02.py','filter_lod_pigment_02.py','render_candidate_02.py','check_candidate_02.py')},
        'metadata_input_sha256':METADATA_SHA,'lod_filter':lod_filter_report,
        'palette_policy':'Matching body/eyes/accent slots. Full textured albedo with white COLOR_0; LOD linear vertex pigment with white material factor. Runtime palette visual review pending.',
        'body_bind_geometry_sha256':body_hash,'accepted_body_unchanged':False,'baseline_body_geometry_sha256':baseline_body_hash,
        'body_changes':'Bounded continuous orbital bed only; all other body vertices preserved',
        'orbital_changed_vertices':len(changed),'orbital_delta_range':[min(d for i,d in changed),max(d for i,d in changed)],'bones':len(B),'clips':CLIPS,
        'loop_and_recovery_seams':seams,'deformed_bounds':bounds,'weights_normalized':True,
        'full_triangles':fulltris,'lod_triangles':lodtris,'lod_ratio':lodtris/fulltris,
        'full_lod_skeleton_anchors_match':True,'anchors':ANCHORS,'files':[]}
for p in sorted(OUT.iterdir()):
    if p.is_file():report['files'].append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)})
(OUT/'candidate-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('GEMUENDINA_CANDIDATE_02_GROUP_OK '+str(OUT/'candidate-report.json'))
