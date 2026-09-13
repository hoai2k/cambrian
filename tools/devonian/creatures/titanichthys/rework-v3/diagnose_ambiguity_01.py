"""Frozen source-corner ambiguity measurement against immutable candidate05.
Reconstructs exact nine reduced source parts, without actions, exports or render.
Astra authors; Terra executes. No repair and no pigment-threshold changes.
"""
from pathlib import Path
import bpy,sys,hashlib,json,math,struct
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4]
LOCAL=REPO.parent/'devonian-authoring/titanichthys/rework-v3';OUT=LOCAL/'diagnostic-ambiguity-01'
MATERIAL=LOCAL/'material-02/titanichthys-material-02.blend'
MATERIAL_SHA='59754793e889e1d17b66c6bbce1b29e9502d4f57441db01dac1d4021a67ce34d'
REPORT=LOCAL/'material-02/material-report.json';REPORT_SHA='fdd0d63af70324a298ccc7d9dcc7a680e8db15f193ede4ae71cb1a8750162583'
VIEW=LOCAL/'material-02/renders/manifest.json';VIEW_SHA='9f1bb66bf72645cca6b4781e4cf65e4dc75e2081bf301cdb8224cb7faab8ab7d'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import bones,pose,CLIPS,LOOPS,ANCHORS,body_semantics,head_fields,head_weights,axial,normalize,smooth,HINGE,NECK
from export_patch_02 import patch_export
from atlas_pigment_03 import sample_object,assert_pigment,stats,transfer_export_colors
from lod_pigment_03 import FilteredSurface,write_colors,channel_summary,verify_body_decimation
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for p,h in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA),(VIEW,VIEW_SHA)]:
    if sha(p)!=h:raise RuntimeError('Frozen material input mismatch '+str(p))
if OUT.exists():raise RuntimeError('Preserve existing diagnostic-ambiguity-01')
material_report=json.loads(REPORT.read_text())
for image in material_report['textures']:
    if sha(image['path'])!=image['sha256']:raise RuntimeError('Accepted source map changed')
OUT.mkdir()
failure=json.loads((HERE/'candidate05-ambiguity-failure.json').read_text())
for record in failure['files']:
    if sha(record['path'])!=record['sha256']:raise RuntimeError('Changed preserved failure '+record['path'])
(OUT/'preserved-inputs.json').write_text(json.dumps({'script_sha256':sha(__file__),'inventory_sha256':sha(HERE/'candidate05-ambiguity-failure.json'),'files':failure['files']},indent=2)+'\n')
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
# Diagnostic reads exact accepted albedo files; no texture copies or exports.
# Sample the candidate's exact mapped albedo to dense linear pigment. LOD uses
# filtered body pigment, never isolated high-frequency bright flecks on big triangles.
pigment={};pigment_stages={}
for ob in meshes:
    pigment[ob.name]=sample_object(ob);pigment_stages[ob.name]={'dense_sampled':stats(pigment[ob.name])}
    print('TITANICHTHYS_PIGMENT_OK '+ob.name,flush=True)
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
pigment[body.name]=filter_body(pigment[body.name]);assert_pigment(pigment[body.name],'filtered body')
pigment_stages[body.name]['dense_filtered']=stats(pigment[body.name]);scene.render.bake.target='IMAGE_TEXTURES'

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

scene.frame_set(0)
parts=[]
for source in meshes:
    ob=source.copy();ob.data=source.data.copy();scene.collection.objects.link(ob);ob.name=source.name+'_export'
    if ob.data.shape_keys:ob.shape_key_clear()
    for attr in list(ob.data.color_attributes):
        if attr.name!='Color':ob.data.color_attributes.remove(attr)
    ob.data.color_attributes['Color'].data.foreach_set('color',np.ones((len(ob.data.loops),4),dtype=np.float32).ravel())
    parts.append(ob)
filtered_body=FilteredSurface(body,pigment[body.name])
for ob,source in zip(parts,meshes):
    # Full export copies already carry neutral Color. Reassert it explicitly:
    # Blender's collapse interpolation must not extrapolate physical albedo.
    write_colors(ob,np.ones((len(ob.data.loops),4),dtype=np.float32))
    bpy.context.view_layer.objects.active=ob
    dec=ob.modifiers.new('Authored candidate LOD','DECIMATE');dec.ratio=.26 if source is body else .66 if 'eye'in source.name.lower()else .22
    bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
    neutral=np.array([v.color[:]for v in ob.data.color_attributes['Color'].data])
    pigment_stages[source.name]['decimator_neutral_discarded']=channel_summary(neutral)
    if source is body:
        pigment_stages[source.name]['unchanged_decimated_geometry']=verify_body_decimation(ob,LOCAL/'diagnostic-decimation-01/actual-decimation-colours.npz')
        after,evidence=filtered_body.sample(ob)
        write_colors(ob,after)
        pigment_stages[source.name]['post_decimate_method']=evidence
    else:
        after=sample_object(ob)
        pigment_stages[source.name]['post_decimate_method']={'method':'Accepted atlas at final UV, bilinear raw sRGB then explicit linear conversion; no colour clipping'}
    actual=np.array([v.color[:]for v in ob.data.color_attributes['Color'].data])
    pigment_stages[source.name]['post_decimate']=channel_summary(actual)
    (OUT/'lod-pigment-stages.json').write_text(json.dumps(pigment_stages,indent=2)+'\n')
    assert_pigment(actual,source.name+' final pigment '+str(channel_summary(actual)))
    if np.max(np.abs(actual-after))>6e-8:raise RuntimeError('Final pigment write/read mismatch '+source.name)
    print('TITANICHTHYS_LOD_PIGMENT_OK '+source.name,flush=True)
    materials=[]
    for mat in source.data.materials:
        lodmat=bpy.data.materials.new(mat.name+' LOD');lodmat.use_nodes=True;bs=lodmat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0
        bs.inputs['Roughness'].default_value=.22 if 'eye'in mat.name.lower()else .36 if 'oral accent'in mat.name.lower()else .48
        color_node=lodmat.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name='Color'
        lodmat.node_tree.links.new(color_node.outputs['Color'],bs.inputs['Base Color'])
        materials.append(lodmat)
    retained_indices=[poly.material_index for poly in ob.data.polygons]
    ob.data.materials.clear()
    for mat in materials:ob.data.materials.append(mat)
    for poly,index in zip(ob.data.polygons,retained_indices):poly.material_index=index

# Read the failed export; never rewrite it. Measure exact current lookup and
# proposed material-aware lookup without changing matching/error thresholds.
raw=(LOCAL/'candidate-05/titanichthys.lod1.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+n]);blob=raw[28+n:]
def rows(ai):
    a=g['accessors'][ai];v=g['bufferViews'][a['bufferView']]
    count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    fmt={5126:'f',5123:'H',5121:'B',5125:'I'}[a['componentType']];size=struct.calcsize(fmt)
    off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',count*size)
    out=np.array([struct.unpack_from('<'+fmt*count,blob,off+i*stride)for i in range(a['count'])])
    if a.get('normalized'):out=out/(65535 if fmt=='H'else 255)
    return out

by_name={ob.data.name:ob for ob in parts};records=[];archives=[];first_ambiguity=None
for mesh_index,mesh in enumerate(g['meshes']):
    ob=by_name[mesh['name']];me=ob.data
    loop_vertices=np.array([l.vertex_index for l in me.loops]);local=np.array([v.co[:]for v in me.vertices],dtype=np.float32)
    matrix=np.array(ob.matrix_world,dtype=float);world=(local@matrix[:3,:3].T+matrix[:3,3]).astype(np.float32)
    co=world[loop_vertices][:,[0,2,1]].copy();co[:,2]*=-1
    uv=np.array([l.uv[:]for l in me.uv_layers.active.data]);qsource=np.concatenate([co,np.stack([uv[:,0],1-uv[:,1]],1)],1)
    colors=np.array([c.color[:]for c in me.color_attributes['Color'].data])
    materials=np.empty(len(me.loops),dtype=int);polygons=np.empty(len(me.loops),dtype=int)
    for poly in me.polygons:materials[list(poly.loop_indices)]=poly.material_index;polygons[list(poly.loop_indices)]=poly.index
    # Source corner normals are evidence, not a newly introduced selector.
    normals=np.array([v.vector[:]for v in me.corner_normals])
    normals=normals@np.linalg.inv(matrix[:3,:3]);normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-30)
    normals=normals[:,[0,2,1]];normals[:,2]*=-1
    lookup={}
    for i,p in enumerate(qsource):lookup.setdefault(tuple(round(float(x),6)for x in p[:3]),[]).append(i)
    arrays={'source_position_uv':qsource,'source_rgba':colors,'source_material':materials,'source_polygon':polygons,'source_loop_vertex':loop_vertices,'source_normal_yup':normals}
    per_mesh=[]
    for pi,primitive in enumerate(mesh['primitives']):
        material_name=g['materials'][primitive['material']]['name']
        source_mi=next(i for i,m in enumerate(me.materials)if m.name==material_name)
        attrs=primitive['attributes'];queries=np.concatenate([rows(attrs['POSITION']),rows(attrs['TEXCOORD_0'])],1)
        export_normals=rows(attrs['NORMAL']);export_colors=rows(attrs['COLOR_0'])
        arrays['primitive_'+str(pi)+'_queries']=queries;arrays['primitive_'+str(pi)+'_normals']=export_normals;arrays['primitive_'+str(pi)+'_rgba']=export_colors
        counts={name:{'missing_bucket_or_material':0,'no_match_within_2e_6':0,'ambiguous_over_5e_5':0,'max_coordinate_uv_error':0.,'max_color_spread':0.}for name in ('original','same_material')}
        examples=[];ambiguous_query_indices=[]
        for qi,q in enumerate(queries):
            ids=np.array(lookup.get(tuple(round(float(v),6)for v in q[:3]),[]),dtype=int)
            for mode in counts:
                candidate_ids=ids if mode=='original'else ids[materials[ids]==source_mi]
                entry=counts[mode]
                if not len(candidate_ids):entry['missing_bucket_or_material']+=1;continue
                distances=np.max(np.abs(qsource[candidate_ids]-q),axis=1);best=int(np.argmin(distances));distance=float(distances[best])
                entry['max_coordinate_uv_error']=max(entry['max_coordinate_uv_error'],distance)
                close=candidate_ids[distances<=2e-6]
                if not len(close):entry['no_match_within_2e_6']+=1;continue
                selected=candidate_ids[best];spread=float(np.max(np.abs(colors[close]-colors[selected])))
                entry['max_color_spread']=max(entry['max_color_spread'],spread)
                if spread>5e-5:
                    entry['ambiguous_over_5e_5']+=1
                    if mode=='original':ambiguous_query_indices.append(qi)
                    if len(examples)<16 or first_ambiguity is None:
                        example={'mode':mode,'export_vertex':qi,'query':q.tolist(),'export_normal':export_normals[qi].tolist(),
                            'export_color':export_colors[qi].tolist(),'source_material_for_primitive':source_mi,
                            'color_spread':spread,'matches':[{'loop':int(i),'vertex':int(loop_vertices[i]),'polygon':int(polygons[i]),
                                'material_index':int(materials[i]),'material':me.materials[int(materials[i])].name,
                                'position_uv':qsource[i].tolist(),'rgba':colors[i].tolist(),'normal':normals[i].tolist(),
                                'normal_dot_export':float(normals[i]@export_normals[qi]),'position_uv_max_error':float(np.max(np.abs(qsource[i]-q)))}for i in close]}
                        examples.append(example)
                        if first_ambiguity is None:first_ambiguity={'object':ob.name,'mesh':mesh['name'],'primitive':pi,'material':material_name,**example}
        arrays['primitive_'+str(pi)+'_ambiguous_queries']=np.array(ambiguous_query_indices,dtype=int)
        per_mesh.append({'primitive':pi,'material':material_name,'export_vertices':len(queries),'strategies':counts,'examples':examples})
    archive=OUT/('source-corners-'+str(mesh_index).zfill(2)+'.npz');np.savez_compressed(archive,**arrays)
    archives.append({'mesh':mesh['name'],'path':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive)})
    records.append({'object':ob.name,'mesh':mesh['name'],'source_loops':len(me.loops),'material_names':[m.name for m in me.materials],'primitives':per_mesh})
    (OUT/'partial-result.json').write_text(json.dumps({'first_ambiguity':first_ambiguity,'meshes':records,'archives':archives},indent=2)+'\n')
    print('TITANICHTHYS_AMBIGUITY_MESH_MEASURED '+mesh['name'],flush=True)
for record in failure['files']:
    if sha(record['path'])!=record['sha256']:raise RuntimeError('Diagnostic changed failure evidence')
for p,digest in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA),(VIEW,VIEW_SHA)]:
    if sha(p)!=digest:raise RuntimeError('Diagnostic changed accepted source')
result={'scope':'Source-corner measurements only; no repair/export/render/blend save. Original round6,2e-6 coordinate and5e-5 colour thresholds unchanged.',
    'first_ambiguity':first_ambiguity,'meshes':records,'archives':archives,'failure_inventory_sha256':sha(HERE/'candidate05-ambiguity-failure.json')}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print('TITANICHTHYS_AMBIGUITY_DIAGNOSTIC_OK '+str(OUT/'result.json'),flush=True)
