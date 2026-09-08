"""Weights-only derivative of immutable06. No re-export, decimation or baking.
Terra CPU2: patch only body joint/weight accessor bytes, then save matching blend.
"""
from pathlib import Path
import bpy,sys,json,struct,hashlib
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3';SRC=LOCAL/'candidate-06';OUT=LOCAL/'candidate-07'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from oral_weights_07 import revised,SPEC
from gltf_evaluate_01 import read_glb
from rig_actions_01 import CLIPS
HASHES={'titanichthys.glb':'e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad',
 'titanichthys.lod1.glb':'27ca2ebdc5d40482dccc93d2fdc13f0390c6b4082407c245ba45913fa3773f40',
 'titanichthys-production-06.blend':'0965e540499f333fd6af34c196c9d3d1f90a0f59658cbb64b56d85e669eb3d82'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name,h in HASHES.items():assert sha(SRC/name)==h,name
assert not OUT.exists(),'Preserve candidate07';OUT.mkdir()
report={'phase':'Unapproved lower-floor weights derivative; oral sweep/visual and root eye/runtime/size gates pending',
 'inputs':HASHES,'weight_field':SPEC,'source_sha256':{},'derivatives':[],'files':[]}
def save(): (OUT/'candidate-report.json').write_text(json.dumps(report,indent=2)+'\n')
save()
for name in ('titanichthys.glb','titanichthys.lod1.glb'):
    source=SRC/name;raw=source.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);start=n+28
    changed=bytearray(raw);allowed=np.zeros(len(raw),dtype=bool)
    node=next(v for v in g['nodes']if v.get('name')=='Titanichthys_new_continuous_sculpt_export')
    assert not any(k in node for k in ('translation','rotation','scale','matrix')),'Body accessor coordinate assumption changed'
    bones=[g['nodes'][i]['name']for i in g['skins'][node['skin']]['joints']];bone_index={n:i for i,n in enumerate(bones)}
    permitted={p['attributes'][k]for p in g['meshes'][node['mesh']]['primitives']for k in ('JOINTS_0','WEIGHTS_0')}
    permitted_views={g['accessors'][i]['bufferView']for i in permitted}
    assert all(i in permitted or a.get('bufferView')not in permitted_views for i,a in enumerate(g['accessors'])), 'Shared weight storage requires explicit byte-range review'
    def layout(ai):
        a=g['accessors'][ai];v=g['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt)*width
        return a,'<'+fmt*width,start+v.get('byteOffset',0)+a.get('byteOffset',0),v.get('byteStride',size),size
    def rows(ai):
        a,fmt,off,stride,size=layout(ai)
        return [struct.unpack_from(fmt,raw,off+i*stride)for i in range(a['count'])]
    records=[]
    for prim in g['meshes'][node['mesh']]['primitives']:
        attrs=prim['attributes'];points=rows(attrs['POSITION']);js=rows(attrs['JOINTS_0']);ws=rows(attrs['WEIGHTS_0'])
        ja,jfmt,joff,jstride,jsize=layout(attrs['JOINTS_0']);wa,wfmt,woff,wstride,wsize=layout(attrs['WEIGHTS_0'])
        assert ja['componentType']==5121 and wa['componentType']==5126
        assert not any(k in wa or k in ja for k in ('normalized','min','max','sparse'))
        count=0;maximum=0.;masked=[]
        for i,(p,j,w)in enumerate(zip(points,js,ws)):
            old={bones[k]:v for k,v in zip(j,w)if v>0};new,amount=revised(p,old)
            if amount==0:continue
            order=sorted(new,key=lambda k:(-new[k],bone_index[k]));jj=[bone_index[k]for k in order];ww=[new[k]for k in order]
            jj+=[0]*(4-len(jj));ww+=[0.]*(4-len(ww))
            struct.pack_into(jfmt,changed,joff+i*jstride,*jj);struct.pack_into(wfmt,changed,woff+i*wstride,*ww)
            allowed[joff+i*jstride:joff+i*jstride+jsize]=True;allowed[woff+i*wstride:woff+i*wstride+wsize]=True
            maximum=max(maximum,max(abs(new.get(k,0)-old.get(k,0))for k in set(new)|set(old)));masked.append(p);count+=1
        records.append({'material':g['materials'][prim['material']]['name'],'affected_vertices':count,'max_weight_change':maximum,
                        'affected_rest_bounds':[np.min(masked,axis=0).tolist(),np.max(masked,axis=0).tolist()]if masked else None})
    assert sum(r['affected_vertices']for r in records)>100
    actual=np.frombuffer(raw,dtype=np.uint8)!=np.frombuffer(changed,dtype=np.uint8)
    assert not np.any(actual&~allowed),'Unapproved non-weight byte change'
    out=OUT/name;out.write_bytes(changed)
    # Exact byte equality covers every image, material, position, UV, normal,
    # color, triangle, anchor, bind matrix and all18 clips, including Ability24.
    assert raw[:start]==changed[:start] and set(a['name']for a in g['animations'])==set(CLIPS)
    _,before_eval=read_glb(source);_,after_eval=read_glb(out);before,_=before_eval();after,_=after_eval()
    errors={k:float(np.max(np.abs(np.array(before[k]['positions'])-np.array(after[k]['positions']))))for k in before}
    assert max(errors.values())<2e-6,'Bind/rest numerical change beyond normalized-weight rounding'
    report['derivatives'].append({'file':name,'sha256':sha(out),'bytes':len(changed),'changed_bytes':int(actual.sum()),
      'only_body_joint_weight_bytes_changed':True,'all18_animation_bytes_unchanged':True,'rest_position_max_errors':errors,'regions':records})
    save();print('TITANICHTHYS_WEIGHT_DERIVATIVE_OK',name,records,flush=True)

bpy.ops.wm.open_mainfile(filepath=str(SRC/'titanichthys-production-06.blend'))
scene=bpy.context.scene;scene.render.threads_mode='FIXED';scene.render.threads=2
body=bpy.data.objects['Titanichthys_new_continuous_sculpt'];groups={v.name:v for v in body.vertex_groups}
def geometry_digest(ob):
    h=hashlib.sha256()
    for v in ob.data.vertices:h.update(struct.pack('<fff',*v.co))
    for p in ob.data.polygons:h.update(struct.pack('<I',p.material_index)+struct.pack('<'+'I'*len(p.vertices),*p.vertices))
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:
            for v in key.data:h.update(struct.pack('<fff',*v.co))
    return h.hexdigest()
before_geometry=geometry_digest(body);changed_vertices=0
for v in body.data.vertices:
    old={body.vertex_groups[g.group].name:g.weight for g in v.groups if g.weight>0}
    new,amount=revised((v.co.x,v.co.z,-v.co.y),old)
    if amount==0:continue
    for name in old:groups[name].remove([v.index])
    for name,w in new.items():groups[name].add([v.index],w,'REPLACE')
    changed_vertices+=1
assert changed_vertices>100 and geometry_digest(body)==before_geometry
report['source_blend']={'changed_weight_vertices':changed_vertices,'rest_and_shape_key_geometry_unchanged':True,'geometry_digest':before_geometry}
blend=OUT/'titanichthys-production-07.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
(OUT/'titanichthys.json').write_bytes((SRC/'titanichthys.json').read_bytes())
for name,h in HASHES.items():assert sha(SRC/name)==h
for name in ('candidate_07.py','oral_weights_07.py','check_candidate_07.py','check_oral07_01.py','render_oral07_01.py',
             'gltf_evaluate_01.py','gltf_interpolation_01.py','rig_actions_01.py'):
    report['source_sha256'][name]=sha(HERE/name)
report['files']=[{'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(OUT.iterdir())if p.is_file()and p.name!='candidate-report.json']
save();print('TITANICHTHYS_CANDIDATE07_DERIVATIVE_OK '+str(OUT/'candidate-report.json'),flush=True)
