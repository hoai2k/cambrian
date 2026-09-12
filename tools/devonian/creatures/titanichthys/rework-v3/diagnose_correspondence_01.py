"""Two-eye correspondence measurement against immutable failed candidate04.
No GLB writes/exports, actions, body reduction, render or blend save.
"""
from pathlib import Path
import bpy,sys,json,struct,hashlib
import numpy as np
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4]
LOCAL=REPO.parent/'devonian-authoring/titanichthys/rework-v3';OUT=LOCAL/'diagnostic-correspondence-01'
MATERIAL=LOCAL/'material-02/titanichthys-material-02.blend';REPORT=LOCAL/'material-02/material-report.json'
MATERIAL_SHA='59754793e889e1d17b66c6bbce1b29e9502d4f57441db01dac1d4021a67ce34d'
REPORT_SHA='fdd0d63af70324a298ccc7d9dcc7a680e8db15f193ede4ae71cb1a8750162583'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import bones
from atlas_pigment_02 import sample_object
from lod_pigment_03 import write_colors

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for p,digest in [(MATERIAL,MATERIAL_SHA),(REPORT,REPORT_SHA)]:
    if sha(p)!=digest:raise RuntimeError('Changed accepted input '+str(p))
failure=json.loads((HERE/'candidate04-correspondence-failure.json').read_text())
for record in failure['files']:
    if sha(record['path'])!=record['sha256']:raise RuntimeError('Changed failure evidence '+record['path'])
if OUT.exists():raise RuntimeError('Preserve existing diagnostic-correspondence-01')
OUT.mkdir()
(OUT/'preserved-inputs.json').write_text(json.dumps({'diagnostic_sha256':sha(__file__),'failure_inventory_sha256':sha(HERE/'candidate04-correspondence-failure.json'),'files':failure['files']},indent=2)+'\n')
raw=(LOCAL/'candidate-04/titanichthys.lod1.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0]
g=json.loads(raw[20:20+n]);blob=raw[28+n:]
def rows(ai):
    a=g['accessors'][ai];v=g['bufferViews'][a['bufferView']]
    count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    fmt={5126:'f',5123:'H',5121:'B',5125:'I'}[a['componentType']];size=struct.calcsize(fmt)
    off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',count*size)
    result=np.array([struct.unpack_from('<'+fmt*count,blob,off+i*stride)for i in range(a['count'])])
    if a.get('normalized'):result=result/(65535 if fmt=='H'else 255)
    return result

def geometry_hash(ob):
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

bpy.ops.wm.open_mainfile(filepath=str(MATERIAL));scene=bpy.context.scene
scene.render.threads_mode='FIXED';scene.render.threads=2
accepted=json.loads(REPORT.read_text())['geometry_sha256']
# Reproduce candidate04's exact bones/eye binding and .66 modifier ordering.
B=bones();arm=bpy.data.armatures.new('Titanichthys production skeleton')
rig=bpy.data.objects.new('titanichthys_rig',arm);scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
for name,spec in B.items():
    bone=arm.edit_bones.new(name);bone.head=spec['head'];bone.tail=spec['tail']
    if spec['parent']:bone.parent=arm.edit_bones[spec['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
arrays={};results=[]

def analyse(source,queries,colors,exported_colors):
    buckets={}
    for i,p in enumerate(source):buckets.setdefault(tuple(round(float(x),6)for x in p[:3]),[]).append(i)
    missing=0;over=0;ambiguous=0;distance=[];colour_errors=[];examples=[]
    for qi,q in enumerate(queries):
        ids=buckets.get(tuple(round(float(v),6)for v in q[:3]),[])
        if not ids:missing+=1
        nearest_distances=np.max(np.abs(source-q),axis=1);i=int(np.argmin(nearest_distances));d=float(nearest_distances[i]);distance.append(d)
        close=np.flatnonzero(nearest_distances<=2e-6)
        if d>2e-6:over+=1
        if len(close):
            if np.max(np.abs(colors[close]-colors[i]))>5e-5:ambiguous+=1
            colour_errors.append(float(np.max(np.abs(colors[i]-exported_colors[qi]))))
        if qi==0 or (not ids and len(examples)<8):
            examples.append({'export_vertex':qi,'query':q.tolist(),'nearest_source_loop':i,
                'source':source[i].tolist(),'absolute_delta':np.abs(source[i]-q).tolist(),
                'round6_query':list(tuple(round(float(v),6)for v in q[:3])),
                'round6_source':list(tuple(round(float(v),6)for v in source[i,:3]))})
    return {'export_vertices':len(queries),'source_loops':len(source),'round6_missing_buckets':missing,
        'all_source_search_above_original_2e_6_tolerance':over,'ambiguous_above_original_5e_5_colour_limit':ambiguous,
        'nearest_5d_max_error':max(distance),'nearest_5d_p50_p95_p99':np.percentile(distance,[50,95,99]).tolist(),
        'actual_export_color_max_error':max(colour_errors)if colour_errors else None,'examples':examples}

for side in ('L','R'):
    source=bpy.data.objects['Recessed socket eye '+side]
    if geometry_hash(source)!=accepted[source.name]:raise RuntimeError('Accepted eye geometry mismatch '+side)
    matrix=source.matrix_world.copy()
    for group in list(source.vertex_groups):source.vertex_groups.remove(group)
    groups={name:source.vertex_groups.new(name=name)for name in B}
    groups['skull'].add(list(range(len(source.data.vertices))),1.,'REPLACE')
    source.parent=rig;source.matrix_world=matrix
    mod=source.modifiers.new('Titanichthys anatomical deformation','ARMATURE');mod.object=rig
    ob=source.copy();ob.data=source.data.copy();scene.collection.objects.link(ob);ob.name=source.name+'_export'
    if ob.data.shape_keys:ob.shape_key_clear()
    for attr in list(ob.data.color_attributes):
        if attr.name!='Color':ob.data.color_attributes.remove(attr)
    write_colors(ob,np.ones((len(ob.data.loops),4),dtype=np.float32))
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    dec=ob.modifiers.new('Authored candidate LOD','DECIMATE');dec.ratio=.66
    bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
    colors=sample_object(ob)
    loop_ids=np.array([l.vertex_index for l in ob.data.loops]);uv=np.array([l.uv[:]for l in ob.data.uv_layers.active.data])
    local=np.array([v.co[:]for v in ob.data.vertices],dtype=np.float32)
    matrix=np.array(ob.matrix_world,dtype=float)
    # Exactly matches installed primitive_extract.py: float64 matrix operation,
    # assigned back into the exporter's float32 location array before Y-up.
    world_export=(local@matrix[:3,:3].T+matrix[:3,3]).astype(np.float32)
    world_mathutils=np.array([ob.matrix_world@v.co for v in ob.data.vertices])
    def qspace(vertices):
        p=vertices[loop_ids][:,[0,2,1]].copy();p[:,2]*=-1
        return np.concatenate([p,np.stack([uv[:,0],1-uv[:,1]],axis=1)],axis=1)
    node=next(v for v in g['nodes']if v.get('name')==source.name+'_export');mesh=g['meshes'][node['mesh']]
    if len(mesh['primitives'])!=1:raise RuntimeError('Unexpected eye primitive layout')
    attrs=mesh['primitives'][0]['attributes'];queries=np.concatenate([rows(attrs['POSITION']),rows(attrs['TEXCOORD_0'])],axis=1)
    exported_colors=rows(attrs['COLOR_0'])
    strategies={'old_local':qspace(local),'world_mathutils':qspace(world_mathutils),'world_export_float32':qspace(world_export)}
    record={'side':side,'source_object':source.name,'export_mesh':mesh['name'],'matrix_world':matrix.tolist(),
        'local_bounds':[local.min(0).tolist(),local.max(0).tolist()],
        'strategies':{name:analyse(q,queries,colors,exported_colors)for name,q in strategies.items()}}
    results.append(record)
    for name,a in {**strategies,'queries':queries,'colors':colors,'exported_colors':exported_colors,'loop_vertices':loop_ids}.items():arrays[side+'_'+name]=a
    (OUT/'partial-result.json').write_text(json.dumps(results,indent=2)+'\n')
    print('TITANICHTHYS_EYE_CORRESPONDENCE_MEASURED '+side,flush=True)
archive=OUT/'actual-eye-correspondence.npz';np.savez_compressed(archive,**arrays)
for record in failure['files']:
    if sha(record['path'])!=record['sha256']:raise RuntimeError('Diagnostic changed failure evidence')
if sha(MATERIAL)!=MATERIAL_SHA or sha(REPORT)!=REPORT_SHA:raise RuntimeError('Diagnostic changed accepted inputs')
result={'scope':'Measurements only; no repair/export/render/blend save; original 2e-6 mapping and 5e-5 ambiguity limits unchanged',
    'result':results,'archive':{'path':str(archive),'bytes':archive.stat().st_size,'sha256':sha(archive)},
    'original_failure_inventory_sha256':sha(HERE/'candidate04-correspondence-failure.json'),
    'conclusion':'Astra must inspect measured local/world/bucket/colour errors before authoring another candidate.'}
(OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print('TITANICHTHYS_CORRESPONDENCE_DIAGNOSTIC_OK '+str(OUT/'result.json'),flush=True)
