"""Reproduce first actual full-bind eye parity failure; diagnose, never certify.
Terra only. No import/export of blend, model changes, rendering or gate changes.
"""
from pathlib import Path
import sys,json,hashlib,runpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
SRC=LOCAL/'candidate-06/titanichthys.glb'; OUT=LOCAL/'diagnostic-eye-ray06-01'
DIGEST='e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(SRC)==DIGEST
assert not OUT.exists(),'Preserve prior diagnostic'; OUT.mkdir()
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from gltf_evaluate_01 import read_glb
argv=sys.argv[:];sys.argv=['eye-audit.py','--',str(OUT/'no-snapshot-input')]
core=runpy.run_path(str(ROOT/'tools/devonian/eye-audit.py'));sys.argv=argv
g,evaluate=read_glb(SRC);meshes,_=evaluate()
heads=core['components'](meshes['Titanichthys_new_continuous_sculpt_export']);assert len(heads)==1
hp,hf,ht=core['close_envelope'](heads[0]);assert ht['valid'] and not ht['cappedBoundaryLoops']
eyes=core['components'](meshes['Recessed socket eye L_export']);assert len(eyes)==1
ep,ef,et=core['close_envelope'](eyes[0]);assert et['valid'] and not et['cappedBoundaryLoops']
tree=BVHTree.FromPolygons(hp,hf,all_triangles=True);eye_tree=BVHTree.FromPolygons(ep,ef,all_triangles=True)
points=np.array(hp,dtype=np.float64);faces=np.array(hf,dtype=np.int32);tris=points[faces]
report={'input_sha256':DIGEST,'script_sha256':sha(__file__),'scope':'Reproduce full Bind left eye first canonical exception; NO containment approval',
 'body_topology':ht,'eye_topology':et,'canonical_epsilon':2e-6,'canonical_limit':64,
 'note':'No caps exist. Float64 direct intersections are independent diagnostic evidence, not substituted volume classifications.'}
def save(): (OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n')
save();core['section_svg'](OUT/'full-bind-left-section.svg',heads[0],eyes[0])
a=np.array(ep);rng=np.random.default_rng(719061)
accepted=[p for p in rng.uniform(a.min(0),a.max(0),(120000,3)) if core['inside'](eye_tree,p,core['DIRECTIONS'][0])]
report['accepted_eye_samples']=len(accepted);save()
def trace(p,d):
 origin=Vector(p);rows=[]
 for k in range(64):
  hit,normal,index,distance=tree.ray_cast(origin,d)
  if hit is None:return rows,False
  rows.append({'step':k,'triangle':index,'origin':list(origin),'hit':list(hit),'distance':distance,
   'global_parameter':float(np.dot(np.array(hit)-p,np.array(d))), 'normal':list(normal),
   'triangle_positions':points[faces[index]].tolist()})
  origin=hit+d*2e-6
 return rows,True
def exact_hits(p,d,bary_tolerance):
 # Float64 Moller-Trumbore against all actual triangles, without iterative origins.
 e1=tris[:,1]-tris[:,0];e2=tris[:,2]-tris[:,0];h=np.cross(np.broadcast_to(d,e2.shape),e2)
 det=np.einsum('ij,ij->i',e1,h);valid=np.abs(det)>1e-12
 inv=np.divide(1.,det,out=np.zeros_like(det),where=valid);s=p-tris[:,0]
 u=inv*np.einsum('ij,ij->i',s,h);q=np.cross(s,e1)
 v=inv*(q@d);t=inv*np.einsum('ij,ij->i',e2,q)
 ids=np.flatnonzero(valid&(u>=-bary_tolerance)&(v>=-bary_tolerance)&(u+v<=1+bary_tolerance)&(t>0))
 ids=ids[np.argsort(t[ids])]
 return [{'triangle':int(i),'parameter':float(t[i]),'barycentric':[float(1-u[i]-v[i]),float(u[i]),float(v[i])],
          'determinant':float(det[i]),'point':(p+t[i]*d).tolist()}for i in ids]
found=None
for sample,p in enumerate(accepted):
 for direction,d in enumerate(core['DIRECTIONS']):
  try:core['inside'](tree,p,d)
  except RuntimeError as error:
   assert str(error)=='Excess ray intersections: geometry not suitable for parity'
   rows,failed=trace(p,d);assert failed
   found={'sample_index':sample,'point':p.tolist(),'direction_index':direction,'direction':list(d),
    'exception':str(error),'trace':rows,'unique_trace_triangles':len(set(r['triangle']for r in rows)),
    'direct_float64':{str(tol):exact_hits(p,np.array(d),tol)for tol in (1e-10,1e-9,1e-8)},
    'reverse_float64':exact_hits(p,-np.array(d),1e-9)}
   break
 if found:break
report['failure']=found;report['reproduced']=found is not None;save()
assert found is not None,'Original exact sample sequence did not reproduce: return evidence; no volume PASS'
np.savez_compressed(OUT/'actual-failing-ray.npz',positions=points,faces=faces,eye_positions=np.array(ep),
 eye_faces=np.array(ef),point=np.array(found['point']),direction=np.array(found['direction']))
report['arrays_sha256']=sha(OUT/'actual-failing-ray.npz');save()
assert sha(SRC)==DIGEST
print('TITANICHTHYS_EYE_RAY_DIAGNOSTIC_OK',found['sample_index'],found['unique_trace_triangles'],str(OUT/'result.json'),flush=True)
