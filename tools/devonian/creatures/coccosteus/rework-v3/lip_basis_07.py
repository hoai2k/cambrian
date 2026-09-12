"""Exact accepted full-source basis for one protected ventral lip coordinate.
Only the existing four NORMAL/TANGENT rows can change; no geometry or color edits.
"""
import json,struct,hashlib
from pathlib import Path
import numpy as np
COORD=np.array([0.,-.086,1.825])
def digest(raw):return hashlib.sha256(raw).hexdigest()
class GLB:
 def __init__(self,raw):
  self.raw=raw;n=struct.unpack_from('<I',raw,12)[0];self.g=json.loads(raw[20:20+n]);self.base=28+n
 def rows(self,ai):
  a=self.g['accessors'][ai];v=self.g['bufferViews'][a['bufferView']];assert a['componentType']==5126 and not a.get('normalized')
  width={'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];offset=self.base+v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',width*4)
  values=np.ndarray((a['count'],width),dtype='<f4',buffer=self.raw,offset=offset,strides=(stride,4)).copy()
  return values,offset,stride,width
 def lip(self):
  result=[]
  for mesh in self.g['meshes']:
   if not mesh['name'].startswith('Continuous'):continue
   for p in mesh['primitives']:
    a=p['attributes'];pos,*_=self.rows(a['POSITION']);uv,*_=self.rows(a['TEXCOORD_0']);normal,no,ns,nw=self.rows(a['NORMAL']);tangent,to,ts,tw=self.rows(a['TANGENT'])
    assert nw==3 and tw==4
    name=self.g['materials'][p['material']]['name'].split(' LOD')[0]
    for i in np.flatnonzero(np.max(abs(pos-COORD),axis=1)<2e-6):
     result.append({'role':name,'position':pos[i],'uv':uv[i],'normal':normal[i],'tangent':tangent[i],'normalOffset':no+i*ns,'tangentOffset':to+i*ts})
  return result

def repair_bytes(full_raw,lod_raw):
 source=GLB(full_raw).lip();target=GLB(lod_raw).lip();assert len(source)==len(target)==4
 normals=np.array([v['normal']for v in source]);assert np.max(np.ptp(normals,axis=0))<1e-7 and np.max(abs(np.linalg.norm(normals,axis=1)-1))<1e-6
 out=bytearray(lod_raw);allowed=np.zeros(len(out),bool);rows=[]
 for row in target:
  matches=[r for r in source if r['role']==row['role']and np.max(abs(r['uv']-row['uv']))<2e-6];assert len(matches)==1,'Ambiguous accepted lip basis'
  expected=matches[0];angle=np.degrees(np.arccos(np.clip(np.dot(row['normal'],expected['normal'])/(np.linalg.norm(row['normal'])*np.linalg.norm(expected['normal'])),-1,1)))
  for field,width in [('normal',3),('tangent',4)]:
   offset=int(row[field+'Offset']);struct.pack_into('<'+'f'*width,out,offset,*expected[field]);allowed[offset:offset+4*width]=True
  rows.append({'role':row['role'],'uv':row['uv'].tolist(),'normalAngleBeforeDegrees':float(angle),'beforeNormal':row['normal'].tolist(),'acceptedNormal':expected['normal'].tolist(),'acceptedTangent':expected['tangent'].tolist()})
 assert np.array_equal(np.frombuffer(lod_raw,dtype=np.uint8)[~allowed],np.frombuffer(out,dtype=np.uint8)[~allowed]),'Changed non-basis bytes'
 for row in GLB(out).lip():
  expected=next(r for r in source if r['role']==row['role']and np.max(abs(r['uv']-row['uv']))<2e-6)
  assert np.array_equal(row['normal'],expected['normal'])and np.array_equal(row['tangent'],expected['tangent'])
 return bytes(out),{'scope':'Four protected ventral lip NORMAL/TANGENT rows only, exact accepted full-source values','sourceFull_sha256':digest(full_raw),'before_sha256':digest(lod_raw),'after_sha256':digest(out),'nonBasisBytesPreserved':True,'rows':rows}

def repair_file(full_path,lod_path):
 assert Path(lod_path).parent.name=='candidate-07','Only new candidate07 can be written'
 data,report=repair_bytes(Path(full_path).read_bytes(),Path(lod_path).read_bytes());Path(lod_path).write_bytes(data);return report
