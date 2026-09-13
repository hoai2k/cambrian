"""Remove exporter-created identity scale tracks; audit decoded geometry/rig/clips."""
import json,struct,math,hashlib
from pathlib import Path
import numpy as np
H=Path(__file__).resolve().parent;R=H.parents[3];O=R.parent/'devonian-authoring/manticoceras/initial-candidate'

def read(p):
 b=p.read_bytes();N=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+N]);start=20+N;size=struct.unpack_from('<I',b,start)[0];return d,b[start+8:start+8+size]
def save(p,d,bin):
 j=json.dumps(d,separators=(',',':')).encode();j+=b' '*(-len(j)%4);p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(bin))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(bin),0x004e4942)+bin)
def acc(d,bin,i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];N={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];stride=v.get('byteStride',np.dtype(dt).itemsize*N)
 out=np.ndarray((a['count'],N),dtype=dt,buffer=bin,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(stride,np.dtype(dt).itemsize)).copy()
 if a.get('normalized'):out=out/np.iinfo(dt).max
 return out

def mat(n):
 if 'matrix'in n:return np.array(n['matrix']).reshape(4,4).T
 x,y,z,w=n.get('rotation',[0,0,0,1]);M=np.eye(4);M[:3,:3]=[[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],[2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],[2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]];M[:3,:3]=M[:3,:3]*np.array(n.get('scale',[1,1,1]));M[:3,3]=n.get('translation',[0,0,0]);return M
results=[]
for suffix in ['','.lod1']:
 p=O/('manticoceras'+suffix+'.glb');d,bin=read(p);removed=0
 for a in d['animations']:
  keep=[]
  for c in a['channels']:
   if c['target']['path']=='scale':
    assert np.allclose(acc(d,bin,a['samplers'][c['sampler']]['output']),1);removed+=1
   elif d['nodes'][c['target']['node']].get('name')=='root':
    v=acc(d,bin,a['samplers'][c['sampler']]['output']);assert np.allclose(v,v[0])
   else:keep.append(c)
  a['channels']=keep
 save(p,d,bin)
 parent={ch:i for i,n in enumerate(d['nodes']) for ch in n.get('children',[])};world={}
 def wm(i):
  if i not in world:world[i]=np.einsum('ij,jk->ik',wm(parent[i]) if i in parent else np.eye(4),mat(d['nodes'][i]))
  return world[i]
 bounds=[];tri=0;verts=0
 for i,n in enumerate(d['nodes']):
  if 'mesh'not in n:continue
  for prim in d['meshes'][n['mesh']]['primitives']:
   ps=acc(d,bin,prim['attributes']['POSITION']);assert np.isfinite(ps).all();verts+=len(ps);tri+=d['accessors'][prim['indices']]['count']//3
   ph=np.c_[ps,np.ones(len(ps))];bounds.append(np.einsum('ij,nj->ni',wm(i),ph)[:,:3])
   ws=acc(d,bin,prim['attributes']['WEIGHTS_0']);assert np.allclose(ws.sum(axis=1),1,atol=1e-4)
 q=np.concatenate(bounds);span=q.max(0)-q.min(0)
 sockets=[]
 for i,n in enumerate(d['nodes']):
  if n.get('name','').startswith('anchor_'):
   ex=n['extras']['cambrianAnchor'];assert isinstance(ex,dict) and ex['version']==1
   assert d['nodes'][parent[i]]['name']==ex['parentBone'];point=wm(i)[:3,3];sockets.append({'name':n['name'],'point':point.tolist()})
 manifest=json.loads((H/'anchors.json').read_text())['manticoceras']
 for s in manifest:
  q=next(q for q in sockets if q['name']==s['name']);x,y,z=s['point'];assert np.allclose(q['point'],[x,z,-y],atol=2e-5),(s,q)
 motions=[]
 for a in d['animations']:
  movement=0;maxdur=0;signature=hashlib.sha256()
  for c in a['channels']:
   target=d['nodes'][c['target']['node']]['name'];assert target!='root';assert c['target']['path']!='scale'
   sm=a['samplers'][c['sampler']];v=acc(d,bin,sm['output']);t=acc(d,bin,sm['input']);assert np.isfinite(v).all();maxdur=max(maxdur,float(t[-1,0]-t[0,0]));movement+=float(np.abs(v-v[0]).sum());signature.update(v.tobytes())
   if a['name']in ['Idle','Swim','Crawl','Guard','Eat']:assert np.allclose(v[0],v[-1],atol=1e-5),a['name']
   if a['name']=='Death':assert np.allclose(v[int(len(v)*.83):],v[-1],atol=1e-5),'Death terminal hold'
   elif a['name']not in ['Idle','Swim','Guard','Eat']:assert np.allclose(v[0],v[-1],atol=1e-5),(a['name'],'neutral recovery')
  assert maxdur>0 and movement>0;motions.append({'name':a['name'],'duration':maxdur,'motion':round(movement,3),'digest':signature.hexdigest()})
 assert len(set(m['digest'] for m in motions))==len(motions)
 results.append({'file':p.name,'bytes':p.stat().st_size,'vertices':verts,'triangles':tri,'bounds':span.tolist(),'bones':len(d['skins'][0]['joints']),'boneNames':[d['nodes'][i]['name']for i in d['skins'][0]['joints']],'textures':len(d.get('textures',[])),'sockets':sockets,'clips':motions,'removedIdentityScaleChannels':removed,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert results[1]['triangles']/results[0]['triangles']<.4
assert results[0]['boneNames']==results[1]['boneNames']
assert results[1]['textures']==0, 'LOD must use baked vertex pigmentation only'
meta=json.loads((O/'manticoceras.json').read_text());meta['modelLength']=results[0]['bounds'][2];meta['clips']=[x['name'] for x in results[0]['clips']];(O/'manticoceras.json').write_text(json.dumps(meta,indent=2)+'\n')
(H/'validation.json').write_text(json.dumps({'checks':'finite transforms, normalized weights, root stable, identity-scale removal, unique motion, seamless loops, socket bind alignment, true LOD reduction','models':results,'lodTriangleRatio':results[1]['triangles']/results[0]['triangles']},indent=2)+'\n')
print(json.dumps({'models':[{k:v for k,v in r.items()if k in ['file','bytes','triangles','vertices','bounds','bones']}for r in results],'lodRatio':results[1]['triangles']/results[0]['triangles']}))
