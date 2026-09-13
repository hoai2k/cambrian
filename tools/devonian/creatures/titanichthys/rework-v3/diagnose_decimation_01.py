"""Frozen focused diagnostic: exact body pigment and decimator, no repair.
Derived from frozen candidate02 through body binding only. No animation/export/render.
Astra authors; Terra executes. Preserve all candidate01/02 and source inputs.
"""
from pathlib import Path
import bpy,sys,hashlib,json,math,struct
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4]
LOCAL=REPO.parent/'devonian-authoring/titanichthys/rework-v3';OUT=LOCAL/'diagnostic-decimation-01'
MATERIAL=LOCAL/'material-02/titanichthys-material-02.blend'
MATERIAL_SHA='59754793e889e1d17b66c6bbce1b29e9502d4f57441db01dac1d4021a67ce34d'
REPORT=LOCAL/'material-02/material-report.json';REPORT_SHA='fdd0d63af70324a298ccc7d9dcc7a680e8db15f193ede4ae71cb1a8750162583'
VIEW=LOCAL/'material-02/renders/manifest.json';VIEW_SHA='9f1bb66bf72645cca6b4781e4cf65e4dc75e2081bf301cdb8224cb7faab8ab7d'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import bones,pose,CLIPS,LOOPS,ANCHORS,body_semantics,head_fields,head_weights,axial,normalize,smooth,HINGE,NECK
from export_patch_01 import patch_export
from atlas_pigment_02 import sample_object,assert_pigment,stats,transfer_export_colors
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for p,h in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA),(VIEW,VIEW_SHA)]:
    if sha(p)!=h:raise RuntimeError('Frozen material input mismatch '+str(p))
if OUT.exists():raise RuntimeError('Preserve existing diagnostic-decimation-01')
material_report=json.loads(REPORT.read_text())
for image in material_report['textures']:
    if sha(image['path'])!=image['sha256']:raise RuntimeError('Accepted source map changed')
OUT.mkdir()
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

# Diagnostic reads the same byte-identical accepted albedo maps directly.
# It does not create candidate texture copies or change map resolutions.
# Sample the candidate's exact mapped albedo to dense linear pigment. LOD uses
# filtered body pigment, never isolated high-frequency bright flecks on big triangles.
pigment={};pigment_stages={}
for ob in [body]:
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

# Stop before all actions, full/LOD export and other-mesh reduction. Only this
# copied body's existing Colour layer and exact .26 decimator are inspected.
ob=body.copy();ob.data=body.data.copy();scene.collection.objects.link(ob);ob.name='Diagnostic body copy'
if ob.data.shape_keys:ob.shape_key_clear()
for attr in list(ob.data.color_attributes):
    if attr.name!='Color':ob.data.color_attributes.remove(attr)
ob.data.color_attributes['Color'].data.foreach_set('color',pigment[body.name].ravel())
ob.data.update();ob.update_tag(refresh={'DATA'});bpy.context.view_layer.update()
before=np.array([v.color[:]for v in ob.data.color_attributes['Color'].data]);assert_pigment(before,'diagnostic body pre-decimate')
source_geometry=geo_hash(body)
def finite_value(v):return float(v)if np.isfinite(v)else str(v)
def summarize(colors):
    result={}
    for k,name in enumerate(('R','G','B','A')):
        column=colors[:,k];finite=column[np.isfinite(column)]
        result[name]={'count':len(column),'finite_count':len(finite),'nonfinite_count':int((~np.isfinite(column)).sum()),
            'min':float(finite.min())if len(finite)else None,'max':float(finite.max())if len(finite)else None,
            'mean':float(finite.mean())if len(finite)else None,'negative_count':int((column<0).sum()),
            'above_one_count':int((column>1).sum()),'above_guard_count':int((column>1.00001).sum()),
            'below_minus_16bit_step_count':int((column < -1/65535).sum()),
            'above_one_plus_16bit_step_count':int((column>1+1/65535).sum())}
    return result
pre={'purpose':'Diagnostic only; no threshold change, clipping or repair',
     'source_script_sha256':sha(HERE/'candidate_02.py'),'helper_sha256':sha(HERE/'atlas_pigment_02.py'),
     'diagnostic_script_sha256':sha(Path(__file__)),'material_blend_sha256':MATERIAL_SHA,
     'source_body_geometry_sha256':source_geometry,'semantic_gape_max_error':maximum,
     'body_vertices':len(ob.data.vertices),'body_polygons':len(ob.data.polygons),'body_loops':len(ob.data.loops),
     'dense_sampled':pigment_stages[body.name]['dense_sampled'],'dense_filtered':pigment_stages[body.name]['dense_filtered'],
     'before':summarize(before),'modifiers_before':[{'name':m.name,'type':m.type}for m in ob.modifiers]}
(OUT/'before-summary.json').write_text(json.dumps(pre,indent=2,allow_nan=False)+'\n')
bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
modifier=ob.modifiers.new('Authored candidate LOD','DECIMATE');modifier.ratio=.26
bpy.ops.object.modifier_move_up(modifier=modifier.name);bpy.ops.object.modifier_apply(modifier=modifier.name)
after=np.array([v.color[:]for v in ob.data.color_attributes['Color'].data])
vertices=np.array([v.co[:]for v in ob.data.vertices]);loop_vertices=np.array([l.vertex_index for l in ob.data.loops])
uv=np.array([l.uv[:]for l in ob.data.uv_layers.active.data]);material_ids=np.zeros(len(ob.data.loops),dtype=int)
for poly in ob.data.polygons:
    material_ids[list(poly.loop_indices)]=poly.material_index
invalid=(~np.isfinite(after))|(after<0)|(after>1.00001)
selected=set(np.flatnonzero(np.any(invalid,axis=1))[:32].tolist())
for k in range(4):
    valid=np.flatnonzero(np.isfinite(after[:,k]))
    if len(valid):
        selected.add(int(valid[np.argmin(after[valid,k])]))
        selected.add(int(valid[np.argmax(after[valid,k])]))
examples=[]
for i in sorted(selected):
    vi=int(loop_vertices[i]);mi=int(material_ids[i])
    examples.append({'loop':i,'vertex':vi,'material_index':mi,'material':ob.data.materials[mi].name,
        'position':[finite_value(v)for v in vertices[vi]],'uv':[finite_value(v)for v in uv[i]],
        'rgba':[finite_value(v)for v in after[i]],'invalid_channels':[n for k,n in enumerate('RGBA')if invalid[i,k]]})
archive=OUT/'actual-decimation-colours.npz'
np.savez_compressed(archive,before=before,after=after,vertices=vertices,loop_vertices=loop_vertices,uv=uv,material_ids=material_ids)
clip_delta=np.abs(np.clip(after,0,1)-after)
result={**pre,'after':summarize(after),'after_vertices':len(ob.data.vertices),'after_polygons':len(ob.data.polygons),
    'after_loops':len(ob.data.loops),'guard_invalid_loops':int(np.any(invalid,axis=1).sum()),'examples':examples,
    'per_material':{mat.name:summarize(after[material_ids==i])for i,mat in enumerate(ob.data.materials)if np.any(material_ids==i)},
    'hypothetical_physical_range_clip_NOT_APPLIED':{'finite':bool(np.isfinite(after).all()),
        'affected_components':int(((after<0)|(after>1)).sum()),
        'max_absolute_change_per_channel':[float(v)if np.isfinite(v)else str(v)for v in np.max(clip_delta,axis=0)]},
    'archive':{'path':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive)},
    'conclusion':'Measured evidence only. Astra must decide a new bounded correction; no clamp or accepted export produced.'}
if geo_hash(body)!=source_geometry:raise RuntimeError('Diagnostic altered original body')
for path,expected in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA),(VIEW,VIEW_SHA)]:
    if sha(path)!=expected:raise RuntimeError('Diagnostic changed immutable input')
(OUT/'result.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print('TITANICHTHYS_DECIMATION_DIAGNOSTIC_OK '+str(OUT/'result.json'),flush=True)
print(json.dumps({'after':result['after'],'guard_invalid_loops':result['guard_invalid_loops'],
                  'hypothetical_clip_NOT_APPLIED':result['hypothetical_physical_range_clip_NOT_APPLIED']},indent=2),flush=True)
