"""Frozen Titanichthys production candidate: approved rest geometry, custom rig.
Astra authors; Terra executes. New local output only; no public assets or audits.
"""
from pathlib import Path
import bpy,sys,hashlib,json,math,struct
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4]
LOCAL=REPO.parent/'devonian-authoring/titanichthys/rework-v3';OUT=LOCAL/'candidate-01'
MATERIAL=LOCAL/'material-02/titanichthys-material-02.blend'
MATERIAL_SHA='59754793e889e1d17b66c6bbce1b29e9502d4f57441db01dac1d4021a67ce34d'
REPORT=LOCAL/'material-02/material-report.json';REPORT_SHA='fdd0d63af70324a298ccc7d9dcc7a680e8db15f193ede4ae71cb1a8750162583'
VIEW=LOCAL/'material-02/renders/manifest.json';VIEW_SHA='9f1bb66bf72645cca6b4781e4cf65e4dc75e2081bf301cdb8224cb7faab8ab7d'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import bones,pose,CLIPS,LOOPS,ANCHORS,body_semantics,head_fields,head_weights,axial,normalize,smooth,HINGE,NECK
from export_patch_01 import patch_export
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for p,h in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA),(VIEW,VIEW_SHA)]:
    if sha(p)!=h:raise RuntimeError('Frozen material input mismatch '+str(p))
if OUT.exists():raise RuntimeError('Preserve existing candidate-01')
material_report=json.loads(REPORT.read_text())
for image in material_report['textures']:
    if sha(image['path'])!=image['sha256']:raise RuntimeError('Accepted source map changed')
OUT.mkdir();(OUT/'export-textures').mkdir()
bpy.ops.wm.open_mainfile(filepath=str(MATERIAL));scene=bpy.context.scene
scene.unit_settings.scale_length=1.;scene.unit_settings.system='NONE'
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.device='CPU'
body=bpy.data.objects['Titanichthys_new_continuous_sculpt']
meshes=sorted([o for o in bpy.data.objects if o.type=='MESH'],key=lambda o:o.name)
if len(meshes)!=9:raise RuntimeError('Unexpected mesh count')

def geo_hash(ob):
    h=hashlib.sha256()
    for v in ob.data.vertices:h.update(struct.pack('<fff',*v.co))
    for p in ob.data.polygons:
        h.update(struct.pack('<I',len(p.vertices)))
        for i in p.vertices:h.update(struct.pack('<I',i))
    for row in ob.matrix_world:h.update(struct.pack('<ffff',*row))
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:
            h.update(key.name.encode())
            for v in key.data:h.update(struct.pack('<fff',*v.co))
    return h.hexdigest()
accepted={o.name:geo_hash(o)for o in meshes}
if accepted!=material_report['geometry_sha256']:raise RuntimeError('Accepted rest geometry/key/transform mismatch')
semantics=body_semantics();W=[]
for vertex,(region,t,a)in zip(body.data.vertices,semantics):
    if region in ('head','oral','socket'):w=head_weights(t,a)
    elif region=='throat':w={'body':1.}
    else:w=axial(vertex.co.y)
    W.append(w)
# Verify semantic layout against every approved gape-study vertex. This proves
# jaw/floor/corner correspondence without importing or executing the old builder.
def rot_x(p,pivot,angle):
    q=p-Vector(pivot);c,s=math.cos(angle),math.sin(angle)
    return Vector(pivot)+Vector((q.x,c*q.y-s*q.z,s*q.y+c*q.z))
reference=body.data.shape_keys.key_blocks['Gape study 24 degrees'];maximum=0.
for i,(region,t,a)in enumerate(semantics):
    jw,sk,fl=head_fields(t,a)if region in ('head','oral','socket')else(0.,0.,0.)
    q=rot_x(body.data.vertices[i].co,HINGE,math.radians(24)*jw);q.z-=.055*fl
    q=rot_x(q,NECK,math.radians(-2)*sk)
    maximum=max(maximum,(q-reference.data[i].co).length)
if maximum>2e-6:raise RuntimeError('Head/lining semantic correspondence failed '+str(maximum))
for key in body.data.shape_keys.key_blocks:key.value=0.

# Duplicate only materials, not geometry: preserve authored PBR while exposing
# body, underside and oral palette roles to the runtime on both full and LOD.
base=body.data.materials[0];body.data.materials.clear()
for name in ('Titanichthys body','Titanichthys underside','Titanichthys oral accent'):
    mat=base.copy();mat.name=name;body.data.materials.append(mat)
regions=[]
for region,t,a in semantics:
    regions.append(2 if region in ('oral','throat') else 1 if region in ('head','posterior')and math.sin(a)<-.43 else 0)
for poly in body.data.polygons:
    ids=[regions[i]for i in poly.vertices]
    poly.material_index=max(set(ids),key=ids.count)
for ob in meshes:
    if ob is body:continue
    mat=ob.data.materials[0].copy();mat.name='Titanichthys eyes'if 'eye'in ob.name.lower()else'Titanichthys fins '+ob.name
    ob.data.materials.clear();ob.data.materials.append(mat)

# Preserve the accepted study maps. Only new candidate image copies are scaled:
# 4096 body albedo remains intact; normal/roughness use their export frequency budget.
export_images={};texture_records=[]
for ob in meshes:
    for mat in ob.data.materials:
        for node in mat.node_tree.nodes:
            if node.type!='TEX_IMAGE' or not node.image:continue
            source=node.image;name=Path(source.filepath).name
            entry=next((v for v in material_report['textures']if Path(v['path']).name==name),None)
            if entry is None:raise RuntimeError('Unexpected material texture '+name)
            family,kind=entry['family'],entry['kind']
            target=entry['size'][0]
            if kind=='normal':target=min(target,2048 if family=='body'else 1024)
            if kind=='roughness':target=min(target,1024 if family=='body'else 512)
            if name not in export_images:
                image=source.copy();image.name='Candidate01 '+source.name
                if list(image.size)!=[target,target]:image.scale(target,target)
                path=OUT/'export-textures'/name;image.filepath_raw=str(path);image.file_format='PNG';image.save();image.pack()
                export_images[name]=image
                texture_records.append({'path':str(path),'sha256':sha(path),'size':[target,target],
                                        'source_sha256':entry['sha256'],'source_size':entry['size'],'kind':kind,'family':family})
            node.image=export_images[name]

# Bake the candidate's exact mapped albedo to dense linear pigment. LOD uses
# filtered body pigment, never isolated high-frequency bright flecks on big triangles.
def bake_vertex_pigment(obj):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if obj.data.color_attributes.get('Color'):obj.data.color_attributes.remove(obj.data.color_attributes['Color'])
    attr=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    obj.data.color_attributes.active_color=attr;obj.data.color_attributes.render_color_index=list(obj.data.color_attributes).index(attr)
    restore=[]
    for mat in obj.data.materials:
        nodes,links=mat.node_tree.nodes,mat.node_tree.links;bs=nodes.get('Principled BSDF');out=next(n for n in nodes if n.type=='OUTPUT_MATERIAL')
        em=nodes.new('ShaderNodeEmission');links.new(bs.inputs['Base Color'].links[0].from_socket,em.inputs['Color'])
        links.new(em.outputs[0],out.inputs['Surface']);restore.append((mat,bs,out,em))
    scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.target='VERTEX_COLORS'
    bpy.ops.object.bake(type='EMIT')
    for mat,bs,out,em in restore:mat.node_tree.links.new(bs.outputs[0],out.inputs['Surface']);mat.node_tree.nodes.remove(em)
    arr=np.array([v.color[:]for v in attr.data],dtype=np.float32)
    if not np.isfinite(arr).all()or arr[:,:3].max()<.001:raise RuntimeError('Invalid pigment '+obj.name)
    print('TITANICHTHYS_PIGMENT_OK '+obj.name,flush=True);return arr
pigment={o.name:bake_vertex_pigment(o)for o in meshes}
def filter_body(colors):
    mesh=body.data;n=len(mesh.vertices);sums=np.zeros((n,4));area=np.zeros(n)
    points=np.array([v.co[:]for v in mesh.vertices]);normals=np.array([v.normal[:]for v in mesh.vertices])
    for poly in mesh.polygons:
        weight=max(poly.area/len(poly.vertices),1e-12)
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index;sums[vi]+=colors[li]*weight;area[vi]+=weight
    values=sums/np.maximum(area[:,None],1e-12);filtered=values.copy();tree=KDTree(n);region=np.array(regions)
    for i,p in enumerate(points):tree.insert(p,i)
    tree.balance()
    for i,p in enumerate(points):
        radius=.028 if regions[i]==2 else .055
        matches=tree.find_range(p,radius);ids=np.array([j for q,j,d in matches]);dist=np.array([d for q,j,d in matches])
        use=(region[ids]==region[i])&((normals[ids]@normals[i])>.7);ids=ids[use];dist=dist[use]
        if len(ids)>1:
            kernel=np.exp(-4*(dist/radius)**2)*area[ids];filtered[i]=(values[ids]*kernel[:,None]).sum(0)/kernel.sum()
    filtered[:,3]=1.
    return filtered[np.array([l.vertex_index for l in mesh.loops])].astype(np.float32)
pigment[body.name]=filter_body(pigment[body.name]);scene.render.bake.target='IMAGE_TEXTURES'

B=bones();arm=bpy.data.armatures.new('Titanichthys production skeleton');rig=bpy.data.objects.new('titanichthys_rig',arm);scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for name,spec in B.items():
    bone=arm.edit_bones.new(name);bone.head=spec['head'];bone.tail=spec['tail']
    if spec['parent']:bone.parent=arm.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def bind(ob,weights):
    for group in list(ob.vertex_groups):ob.vertex_groups.remove(group)
    groups={n:ob.vertex_groups.new(name=n)for n in B}
    for i,weights_i in enumerate(weights):
        if len(weights_i)>4 or abs(sum(weights_i.values())-1)>1e-7:raise RuntimeError('Invalid normalized anatomical weights')
        for n,w in weights_i.items():groups[n].add([i],w,'REPLACE')
    matrix=ob.matrix_world.copy();ob.parent=rig;ob.matrix_world=matrix
    mod=ob.modifiers.new('Titanichthys anatomical deformation','ARMATURE');mod.object=rig
bind(body,W)
for ob in meshes:
    if ob is body:continue
    name=ob.name
    if 'eye'in name.lower():ww=[{'skull':1.}]*len(ob.data.vertices)
    elif name.startswith(('Long pectoral','Pelvic')):
        side=name[-1];kind='pectoral'if name.startswith('Long')else'pelvic';knots=(0.,.38,.73)if kind=='pectoral'else(0.,.58)
        ww=[]
        for vertex in ob.data.vertices:
            span=ob.data.color_attributes['TitanFin'].data[vertex.index].color[0]
            if span>=knots[-1]:w={kind+str(len(knots)-1)+side:1.}
            else:
                k=next(k for k in range(len(knots)-1)if knots[k]<=span<knots[k+1]);f=smooth(span,knots[k],knots[k+1])
                w=normalize({kind+str(k)+side:1-f,kind+str(k+1)+side:f})
            # Fin's actual buried root remains carried by its axial parent.
            root=1-smooth(span,0.,.105);parent='body'if kind=='pectoral'else'tail2'
            w={n:v*(1-root)for n,v in w.items()};w[parent]=root;ww.append(normalize(w))
    elif name=='Modest swept dorsal':
        ww=[]
        for v in ob.data.vertices:
            w=axial(v.co.y);amount=.62*smooth(v.co.z,.64,1.30)
            w={n:q*(1-amount)for n,q in w.items()};w['dorsal']=amount;ww.append(normalize(w))
    elif name=='Strong heterocercal caudal':
        ww=[]
        for v in ob.data.vertices:
            # Shared axial response along the upper fleshy stalk avoids pulling
            # a rigid tail plate away from the retained epichordal body lobe.
            w=axial(v.co.y);amount=.40*smooth(abs(v.co.z-.22),.10,.70)*smooth(v.co.y,2.60,3.32)
            w={n:q*(1-amount)for n,q in w.items()};w['caudal']=w.get('caudal',0)+amount;ww.append(normalize(w))
    else:raise RuntimeError('Unspecified part weights '+name)
    bind(ob,ww)
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
scene.render.fps=30;rig.animation_data_create();seams={};bounds={};action_records={}
def reset():
    for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
def action_curves(action):
    if hasattr(action,'fcurves'):yield from action.fcurves
    else:
        for layer in action.layers:
            for strip in layer.strips:
                if hasattr(strip,'channelbags'):
                    for bag in strip.channelbags:yield from bag.fcurves
for clip,duration in CLIPS.items():
    action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action;last=round(duration*30)
    for frame in range(last+1):
        state=pose(clip,frame/last)
        for name,data in state.items():
            pb=rig.pose.bones[name];pb.rotation_euler=data['rotation'];pb.location=data['location']
            if name!='root':pb.keyframe_insert('rotation_euler',frame=frame);pb.keyframe_insert('location',frame=frame)
    for fc in action_curves(action):
        for key in fc.keyframe_points:key.interpolation='LINEAR'
    a,b=pose(clip,0),pose(clip,1)
    seams[clip]=max(abs(x-y)for n in B for prop in ('rotation','location')for x,y in zip(a[n][prop],b[n][prop]))
    if clip!='Death'and seams[clip]>1e-7:raise RuntimeError('Recovery/loop seam '+clip)
    samples=[]
    for phase in (0.,.2,.4,.6,.8,1.):
        scene.frame_set(round(last*phase));deps=bpy.context.evaluated_depsgraph_get()
        for ob in meshes:
            evaluated=ob.evaluated_get(deps);me=evaluated.to_mesh();pts=np.array([evaluated.matrix_world@v.co for v in me.vertices]);evaluated.to_mesh_clear()
            if not np.isfinite(pts).all():raise RuntimeError('Nonfinite evaluated geometry '+clip+' '+ob.name)
            samples.extend([pts.min(0),pts.max(0)])
    bounds[clip]=[np.min(samples,axis=0).tolist(),np.max(samples,axis=0).tolist()]
    action_records[clip]={'seconds':duration,'samples':last+1,'interpolation':'LINEAR','held_death_from_phase':.84 if clip=='Death'else None}
    rig.animation_data.action=None;print('TITANICHTHYS_ACTION_OK '+clip,flush=True)
reset();scene.frame_set(0)
sockets=[]
for spec in ANCHORS:
    ob=bpy.data.objects.new(spec['name'],None);scene.collection.objects.link(ob)
    ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=spec['bone'];ob.matrix_world.translation=Vector(spec['point'])
    ob['cambrianAnchor']={'version':1,'role':spec['role'],'parentBone':spec['bone']};sockets.append(ob)
# Source copies retain original shape-key evidence; only export duplicates strip
# the zero-valued clay study. All production movement comes from real bones.
parts=[]
for source in meshes:
    ob=source.copy();ob.data=source.data.copy();scene.collection.objects.link(ob);ob.name=source.name+'_export'
    if ob.data.shape_keys:ob.shape_key_clear()
    ob.data.color_attributes['Color'].data.foreach_set('color',np.ones((len(ob.data.loops),4),dtype=np.float32).ravel())
    parts.append(ob)
def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts+sockets+[rig]:ob.select_set(True)
    bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',
    export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,
    export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',
    export_vertex_color_name='Color',export_yup=True,export_extras=True,export_morph=False)
select_export();bpy.ops.export_scene.gltf(filepath=str(OUT/'titanichthys.glb'),**kwargs)
fulltris=sum(sum(len(p.vertices)-2 for p in ob.data.polygons)for ob in parts)
for ob,source in zip(parts,meshes):
    ob.data.color_attributes['Color'].data.foreach_set('color',pigment[source.name].ravel())
    bpy.context.view_layer.objects.active=ob
    dec=ob.modifiers.new('Authored candidate LOD','DECIMATE');dec.ratio=.26 if source is body else .66 if 'eye'in source.name.lower()else .22
    bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
    materials=[]
    for mat in source.data.materials:
        lodmat=bpy.data.materials.new(mat.name+' LOD');lodmat.use_nodes=True;bs=lodmat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0
        bs.inputs['Roughness'].default_value=.22 if 'eye'in mat.name.lower()else .36 if 'oral'in mat.name.lower()else .48
        materials.append(lodmat)
    retained_indices=[poly.material_index for poly in ob.data.polygons]
    ob.data.materials.clear()
    for mat in materials:ob.data.materials.append(mat)
    for poly,index in zip(ob.data.polygons,retained_indices):poly.material_index=index
lodtris=sum(sum(len(p.vertices)-2 for p in ob.data.polygons)for ob in parts)
if lodtris/fulltris>=.4:raise RuntimeError('LOD reduction failed')
select_export();bpy.ops.export_scene.gltf(filepath=str(OUT/'titanichthys.lod1.glb'),**kwargs)
full=patch_export(OUT/'titanichthys.glb');lod=patch_export(OUT/'titanichthys.lod1.glb',True)
for ob in parts:bpy.data.objects.remove(ob,do_unlink=True)
reset();rig.animation_data.action=None;scene.frame_set(0);bpy.context.view_layer.update()
for ob in meshes:
    if geo_hash(ob)!=accepted[ob.name]:raise RuntimeError('Production altered accepted rest geometry '+ob.name)
    ob.data.color_attributes['Color'].data.foreach_set('color',np.ones((len(ob.data.loops),4),dtype=np.float32).ravel())
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.cycles.samples=48
blend=OUT/'titanichthys-production-01.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
metadata=json.loads((HERE/'metadata_seed_01.json').read_text())
y=[(ob.matrix_world@v.co).y for ob in meshes for v in ob.data.vertices]
metadata.update(modelLength=max(y)-min(y),clips=list(CLIPS),looping=list(LOOPS),anchors=[a['name']for a in ANCHORS])
metadata['notes']+=['V3 approved clay04 rest geometry and material02 pigment retained; export normal/roughness resolution is explicitly reduced in candidate report.',
    'Separate upper-cranial and edentulous lower-jaw bones, shared oral floor/commissure weights, six sequential muscular tail sections, caudal trim and segmented long-fin trim.',
    'Candidate only: actual playback, eye-volume/orbital and general creature audits remain required after completed export.']
(OUT/'titanichthys.json').write_text(json.dumps(metadata,indent=2)+'\n')
for p,h in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA),(VIEW,VIEW_SHA)]:
    if sha(p)!=h:raise RuntimeError('Immutable accepted input changed')
source_names=('candidate_01.py','rig_actions_01.py','export_patch_01.py','metadata_seed_01.json','render_candidate_01.py','check_candidate_01.py')
report={'phase':'animated candidate; actual playback and final eye/general audits pending',
    'material_blend_sha256':MATERIAL_SHA,'material_report_sha256':REPORT_SHA,'material_views_sha256':VIEW_SHA,
    'source_sha256':{n:sha(HERE/n)for n in source_names},'accepted_geometry_sha256':accepted,'accepted_rest_geometry_unchanged':True,
    'semantic_gape_comparison_max_error':maximum,'bones':B,'actions':action_records,'loop_recovery_seams':seams,
    'deformed_bounds':bounds,'weights_normalized':True,'anchors':ANCHORS,'full_triangles':fulltris,'lod_triangles':lodtris,'lod_ratio':lodtris/fulltris,
    'textures':texture_records,'palette_slots':['body','underside','accent','fins','eyes'],
    'lod_pigment':'Dense linear area-weighted same-region normal-compatible filtering; radii body .055, oral .028 before decimation',
    'size_policy':'Raw local exports reported; final lossless packaging must meet 25 MB before delivery',
    'files':[{'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(OUT.iterdir())if p.is_file()]}
(OUT/'candidate-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('TITANICHTHYS_CANDIDATE_BUILD_OK '+str(OUT/'candidate-report.json'))
