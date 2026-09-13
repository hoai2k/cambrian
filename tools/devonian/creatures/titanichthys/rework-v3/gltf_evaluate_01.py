"""Actual exported GLB skin/channel evaluation; no builder or blend import."""
import json,struct
import numpy as np
from mathutils import Vector,Quaternion,Matrix
from rig_actions_01 import CLIPS
from gltf_interpolation_01 import sample_channel

def read_glb(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:];cache={}
 def data(i):
  if i in cache:return cache[i]
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt);off=v.get('byteOffset',0)+a.get('byteOffset',0)
  arr=np.array([struct.unpack_from('<'+fmt*count,blob,off+j*v.get('byteStride',count*size))for j in range(a['count'])])
  if a.get('normalized'):arr=arr/(255 if a['componentType']==5121 else 65535)
  cache[i]=arr;return arr
 nodes=g['nodes'];parents={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
 def evaluated(clip=None,phase=0.):
  transforms=[{k:list(node.get(k,default))for k,default in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]}for node in nodes]
  if clip:
   action=next(a for a in g['animations']if a['name']==clip)
   for ch in action['channels']:
    sampler=action['samplers'][ch['sampler']]
    times=data(sampler['input'])[:,0];values=data(sampler['output']);t=phase*CLIPS[clip]
    prop=ch['target']['path']
    value=sample_channel(times,values,t,sampler.get('interpolation','LINEAR'),prop)
    transforms[ch['target']['node']][prop]=value
  worlds={}
  def world(i):
   if i in worlds:return worlds[i]
   node=nodes[i];tr=transforms[i];q=tr['rotation']
   m=np.array(node['matrix']).reshape(4,4).T if 'matrix'in node else np.array(Matrix.LocRotScale(Vector(tr['translation']),Quaternion((q[3],*q[:3])),Vector(tr['scale'])))
   worlds[i]=world(parents[i])@m if i in parents else m;return worlds[i]
  meshes={}
  for ni,node in enumerate(nodes):
   if 'mesh'not in node:continue
   positions=[];indices=[];materials=[];triangle_materials=[]
   for prim in g['meshes'][node['mesh']]['primitives']:
    attrs=prim['attributes'];p=data(attrs['POSITION']);p4=np.column_stack((p,np.ones(len(p))));off=len(positions)
    if 'skin'in node:
     skin=g['skins'][node['skin']];inverse=data(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
     joints=data(attrs['JOINTS_0']).astype(int);weights=data(attrs['WEIGHTS_0']);result=np.zeros((len(p),4))
     for k,bone in enumerate(skin['joints']):
      amount=np.where(joints==k,weights,0).sum(1);mask=amount>0
      if np.any(mask):result[mask]+=(p4[mask]@(world(bone)@inverse[k]).T)*amount[mask,None]
    else:result=p4@world(ni).T
    assert np.isfinite(result).all();positions.extend(result[:,:3].tolist());indices.extend((data(prim['indices']).ravel().astype(int)+off).tolist());materials.append(g['materials'][prim['material']]['name']);triangle_materials.extend([g['materials'][prim['material']]['name']]*(len(data(prim['indices']).ravel())//3))
   meshes[node['name']]={'name':node['name'],'positions':positions,'indices':indices,'material':' + '.join(materials),'triangle_materials':triangle_materials}
  anchors={node['name']:world(i)[:3,3].tolist()for i,node in enumerate(nodes)if node.get('name','').startswith('anchor_')}
  return meshes,anchors
 return g,evaluated
