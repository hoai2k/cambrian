"""Read-only actual export correspondence audit, no Blender or image mutations."""
import sys,json
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from lod_plan_05 import GLB,ROOT,sha
folder=ROOT/'candidate-05';out=folder/'attribute-diagnostic-01.json';assert not out.exists()
manifest=json.loads((folder/'matched-evidence-06/manifest.json').read_text());assert manifest['complete'] and len(manifest['renders'])==11
for r in manifest['renders']:
 assert sha(r['path'])==r['sha256'] and sha(r['sourceGlb']['path'])==r['sourceGlb']['sha256']
glb=GLB(folder/'coccosteus.lod1.glb');plan=json.loads((ROOT/'lod-plan-05/plan-report.json').read_text());a=np.load(ROOT/'lod-plan-05/mesh-plan.npz',allow_pickle=False);records=[]
for mesh in glb.g['meshes']:
 row=next(r for r in plan['meshes']if mesh['name']==r['name']+' structured05');i=row['index'];faces=a[f'm{i}_faces'];positions=a[f'm{i}_positions'].astype(np.float32).astype(float);j=a[f'm{i}_joints'];w=a[f'm{i}_weights'];dense=np.zeros((len(w),20));np.put_along_axis(dense,j,w,axis=1)
 query=np.column_stack([positions[faces].reshape(-1,3),a[f'm{i}_uv'].reshape(-1,2)]);normals=a[f'm{i}_normals'].reshape(-1,3);colors=a[f'm{i}_colors'].reshape(-1,3)
 lookup={}
 for ix,p in enumerate(query):lookup.setdefault(tuple(np.round(p[:3],6)),[]).append(ix)
 errors={k:[]for k in ['position','uv','normalAngleDegrees','RGB','weights']}
 for primitive in mesh['primitives']:
  at=primitive['attributes'];p=glb.array(at['POSITION']);uv=glb.array(at['TEXCOORD_0']);n=glb.array(at['NORMAL']);c=glb.array(at['COLOR_0'])[:,:3];jj=glb.array(at['JOINTS_0']).astype(int);ww=glb.array(at['WEIGHTS_0']);dw=np.zeros((len(p),20));np.put_along_axis(dw,jj,ww,axis=1)
  for vi,(pp,uu,nn,cc)in enumerate(zip(p,uv,n,c)):
   ids=lookup.get(tuple(np.round(pp,6)),[]);assert ids,(mesh['name'],pp)
   target=np.r_[pp,uu];ix=min(ids,key=lambda k:np.max(abs(query[k]-target)));assert np.max(abs(query[ix]-target))<2e-6
   src=faces.reshape(-1)[ix];errors['position'].append(np.max(abs(query[ix,:3]-pp)));errors['uv'].append(np.max(abs(query[ix,3:]-uu)))
   dot=np.dot(nn,normals[ix])/(np.linalg.norm(nn)*np.linalg.norm(normals[ix]));errors['normalAngleDegrees'].append(np.degrees(np.arccos(np.clip(dot,-1,1))))
   errors['RGB'].append(np.max(abs(colors[ix]-cc)));errors['weights'].append(np.max(abs(dense[src]-dw[vi])))
 records.append({'mesh':mesh['name'],'exportedVertices':len(errors['RGB']),'errors':{k:{'max':float(np.max(v)),'p95':float(np.quantile(v,.95)),'mean':float(np.mean(v))}for k,v in errors.items()}})
result={'phase':'Actual export versus frozen plan attribute correspondence; art HOLD','script_sha256':sha(Path(__file__)),'lod_sha256':sha(folder/'coccosteus.lod1.glb'),'image_manifest_sha256':sha(folder/'matched-evidence-06/manifest.json'),'verifiedActualImages':11,'meshes':records}
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
