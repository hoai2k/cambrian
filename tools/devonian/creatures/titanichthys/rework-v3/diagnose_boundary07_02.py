"""Read-only CPU arithmetic: classify recorded rays against the actual mouth rim.
No Blender, new GLB, geometry correction or render. At most two single poses.
"""
from pathlib import Path
import sys,json,struct,hashlib,math
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
OUT=HERE/'candidate07-boundary-classification-02.json'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from gltf_interpolation_01 import sample_channel
from rig_actions_01 import CLIPS
from oral_boundary_02 import boundary_indices,aperture_interval
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert not OUT.exists(),'Preserve classification evidence'
report={'scope':'Read-only independently evaluated actual aperture boundary; no shape or gate edits',
        'source_sha256':sha(__file__),'records':[]}
for version in ('06','07'):
    path=LOCAL/('candidate-'+version)/'titanichthys.glb';raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    g=json.loads(raw[20:20+n]);blob=raw[n+28:];cache={}
    def data(ai):
        if ai in cache:return cache[ai]
        a=g['accessors'][ai];v=g['bufferViews'][a['bufferView']];width={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt)*width;off=v.get('byteOffset',0)+a.get('byteOffset',0)
        rows=np.array([struct.unpack_from('<'+fmt*width,blob,off+i*v.get('byteStride',size))for i in range(a['count'])])
        if a.get('normalized'):rows=rows/(255 if a['componentType']==5121 else 65535)
        cache[ai]=rows;return rows
    nodes=g['nodes'];parents={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
    tr=[{k:list(node.get(k,d))for k,d in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]}for node in nodes]
    action=next(a for a in g['animations']if a['name']=='Ability')
    for channel in action['channels']:
        s=action['samplers'][channel['sampler']];target=channel['target'];prop=target['path']
        tr[target['node']][prop]=sample_channel(data(s['input'])[:,0],data(s['output']),CLIPS['Ability']*.5,s.get('interpolation','LINEAR'),prop)
    worlds={}
    def world(i):
        if i in worlds:return worlds[i]
        if 'matrix'in nodes[i]:m=np.array(nodes[i]['matrix']).reshape(4,4).T
        else:
            x,y,z,w=np.array(tr[i]['rotation'])/np.linalg.norm(tr[i]['rotation'])
            m=np.eye(4);m[:3,:3]=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],
                                         [2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],
                                         [2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])@np.diag(tr[i]['scale'])
            m[:3,3]=tr[i]['translation']
        worlds[i]=world(parents[i])@m if i in parents else m;return worlds[i]
    node=next(n for n in nodes if n.get('name')=='Titanichthys_new_continuous_sculpt_export')
    skin=g['skins'][node['skin']];ibm=data(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
    matrices=np.array([world(b)@ibm[i]for i,b in enumerate(skin['joints'])])
    ps=[];js=[];ws=[];faces=[];mats=[]
    for prim in g['meshes'][node['mesh']]['primitives']:
        a=prim['attributes'];off=sum(len(v)for v in ps);p=data(a['POSITION']);ps.append(p);js.append(data(a['JOINTS_0']).astype(int));ws.append(data(a['WEIGHTS_0']))
        tri=data(prim['indices']).astype(int).reshape(-1,3)+off;faces.append(tri);mats.extend([g['materials'][prim['material']]['name']]*len(tri))
    ps=np.concatenate(ps);js=np.concatenate(js);ws=np.concatenate(ws);faces=np.concatenate(faces)
    def posed(ids):
        p=np.column_stack((ps[ids],np.ones(len(ids))));r=np.zeros((len(ids),4))
        for k in range(4):r+=np.einsum('ijk,ik->ij',matrices[js[ids,k]],p)*ws[ids,k,None]
        return r[:,:3]
    boundary=boundary_indices(ps,faces,mats)
    rim=posed(np.array(boundary));selection_errors=[0.];duplicate_spreads=[0.]
    if version=='06':
        evidence=LOCAL/'oral-numerical-candidate06-01/result.json';old=json.loads(evidence.read_text())
        rows=next(r for r in old['records']if r['asset']=='titanichthys.glb'and r['clip']=='Ability')['rays']
        rays=[{'pixel':r['pixel'],'triangle':r['hits'][0]['triangle'],'point':r['hits'][0]['point']}for r in rows if r['hits'][0]['role']=='underside']
    else:
        evidence=LOCAL/'candidate-07/oral-sweep-01/result.json';old=json.loads(evidence.read_text());rays=old['records'][-1]['underside_first_rays']
    classified=[];maximum=0.
    for row in rays:
        px,py=row['pixel'];x=((px+.5)/1400-.5)*2.8;y=(.5-(py+.5)/1050)*2.1-.16
        heights=aperture_interval(rim,x)
        inside=heights[0]<y<heights[1];signed_margin=min(y-heights[0],heights[1]-y)
        tri=posed(faces[row['triangle']]);normal=np.cross(tri[1]-tri[0],tri[2]-tri[0]);assert abs(normal[2])>1e-12
        z=tri[0,2]-(normal[0]*(x-tri[0,0])+normal[1]*(y-tri[0,1]))/normal[2]
        error=float(np.linalg.norm(np.array((x,y,z))-np.array(row['point'])));maximum=max(maximum,error)
        assert error<1e-5,('Independent transform does not reproduce recorded ray',error,row)
        classified.append({**row,'actual_material':mats[row['triangle']],'inside_projected_aperture':inside,
            'aperture_heights':heights,'signed_inside_margin':signed_margin,'independent_ray_point_error':error})
    report['records'].append({'asset':str(path),'sha256':sha(path),'evidence':str(evidence),'evidence_sha256':sha(evidence),
        'actual_oral_material_boundary_vertices':len(boundary),'rim_selection_max_error':max(selection_errors),'rim_duplicate_pose_spread':max(duplicate_spreads),'actual_posed_rim':rim.tolist(),
        'max_recorded_hit_reproduction_error':maximum,'inside_count':sum(r['inside_projected_aperture']for r in classified),
        'outside_count':sum(not r['inside_projected_aperture']for r in classified),'rays':classified})
OUT.write_text(json.dumps(report,indent=2)+'\n')
print('TITANICHTHYS_PATCH_APERTURE_CLASSIFIED',[(r['inside_count'],r['outside_count'],r['max_recorded_hit_reproduction_error'])for r in report['records']],sha(OUT))
