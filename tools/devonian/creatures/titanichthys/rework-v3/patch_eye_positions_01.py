#!/usr/bin/env python3
"""Parameterised eye-only GLB derivative; no source asset is modified."""
from pathlib import Path
import hashlib,json,struct,sys
import numpy as np

ROOT=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local')
SRC=ROOT/'devonian-authoring/titanichthys/rework-v3/candidate-06'
OUT=ROOT/'devonian-authoring/titanichthys/rework-v3/eye-seating-study-02'
CONSTRUCTION=ROOT/'devonian-authoring/titanichthys/rework-v3/clay-04/construction.json'
DEPTH=float(sys.argv[1]) if len(sys.argv)>1 else .030
EXPECTED={'titanichthys.glb':'e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad','titanichthys.lod1.glb':'27ca2ebdc5d40482dccc93d2fdc13f0390c6b4082407c245ba45913fa3773f40'}
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def chunks(b):
 m,v,l=struct.unpack_from('<III',b);assert(m,v,l)==(0x46546c67,2,len(b));n,t=struct.unpack_from('<II',b,12);assert t==0x4e4f534a
 js=b[20:20+n];o=20+n;bn,bt=struct.unpack_from('<II',b,o);assert bt==0x004e4942
 return js,b[o+8:o+8+bn]
def pack(js,binb):
 js+=b' ' *((4-len(js)%4)%4); binb+=b'\0'*((4-len(binb)%4)%4)
 return struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binb))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binb),0x004e4942)+binb
def node_accessors(g):
 out=[]
 for side in ('L','R'):
  n=next(n for n in g['nodes'] if n.get('name')==f'Recessed socket eye {side}_export');assert not any(k in n for k in ('translation','rotation','scale','matrix'))
  for p in g['meshes'][n['mesh']]['primitives']:out.append((side,p['attributes']['POSITION']))
 return out
if any((OUT/n).exists() for n in EXPECTED): raise SystemExit('refuse existing derivative')
OUT.mkdir(parents=True,exist_ok=True); design={x['side']:x for x in json.loads(CONSTRUCTION.read_text())['eye_placement_design']}; report={'depth_blender_units':DEPTH,'sources':{},'outputs':{},'patches':[]}
for name,digest in EXPECTED.items():
 src=SRC/name;assert sha(src)==digest;raw=src.read_bytes();js,binb=chunks(raw);g=json.loads(js);before=json.loads(js);bb=bytearray(binb);allowed=[]
 for side,ai in node_accessors(g):
  a=g['accessors'][ai];bv=g['bufferViews'][a['bufferView']];start=bv.get('byteOffset',0)+a.get('byteOffset',0);size=a['count']*12;allowed.append([start,start+size])
  normal=np.array(design[side]['normal'],dtype=np.float64);ng=np.array([normal[0],normal[2],-normal[1]]);delta=-DEPTH*ng
  xyz=np.frombuffer(bb,dtype='<f4',count=a['count']*3,offset=start).reshape((-1,3));xyz[:]=xyz+delta.astype(np.float32);a['min']=xyz.min(0).astype(float).tolist();a['max']=xyz.max(0).astype(float).tolist()
  report['patches'].append({'asset':name,'side':side,'accessor':ai,'byteInterval':[start,start+size],'delta_gltf':delta.tolist(),'count':a['count']})
 # semantic JSON proof, excluding exactly the permitted POSITION min/max fields
 for side,ai in node_accessors(before): before['accessors'][ai]['min']=g['accessors'][ai]['min'];before['accessors'][ai]['max']=g['accessors'][ai]['max']
 assert before==g
 changed=[i for i,(a,b) in enumerate(zip(binb,bb)) if a!=b];assert all(any(lo<=i<hi for lo,hi in allowed) for i in changed)
 out=OUT/name;out.write_bytes(pack(json.dumps(g,separators=(',',':')).encode(),bytes(bb)));report['sources'][name]=digest;report['outputs'][name]=sha(out);report['outputs'][name+'_changed_bin_bytes']=len(changed)
(OUT/'patch-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
