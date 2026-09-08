"""Lightweight source-only geometry/material preflight; never opens Blender."""
import sys,ast,json,copy,hashlib
from pathlib import Path
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
import numpy as np
from collections import defaultdict
from geometry_clay02 import build_body,validate,section
from geometry_material04 import corrected_deltas
from material_fields04 import shield,pectoral,posterior,linear_to_srgb,srgb_to_linear,PATHS
from material_fields03 import cephalic_tangent_delta,shield as previous_shield

def boundary_jumps(raw,xyz):
 edges=defaultdict(list)
 for fi,f in enumerate(raw.f):
  for a,b in zip(f,f[1:]+f[:1]):edges[tuple(sorted((a,b)))].append(fi)
 normals=[]
 for f in raw.f:
  p=xyz[list(f)];n=np.cross(p[1]-p[0],p[2]-p[0]);normals.append(n/np.linalg.norm(n))
 normals=np.asarray(normals);angles=[]
 for e,ff in edges.items():
  if all(raw.tags[i]=='shield' for i in e) and any(any(raw.tags[i]=='oral_rim' for i in raw.f[j]) for j in ff):
   angles.append(float(np.degrees(np.arccos(np.clip(np.dot(normals[ff[0]],normals[ff[1]]),-1,1)))))
 return {'edge_count':len(angles),'median_degrees':float(np.median(angles)),'p90_degrees':float(np.quantile(angles,.9)),'maximum_degrees':max(angles)}

def run():
 for name in ['build_material04.py','material_fields04.py','geometry_material04.py','execute_material04.py']:
  ast.parse((HERE/name).read_text())
 raw=build_body();xyz=np.asarray(raw.v);offsets,uv,lookup,report=corrected_deltas(raw)
 aperture=list(raw.mouth_ids);assert not np.any(offsets[aperture])
 keep=[i for i,t in enumerate(raw.tags) if t.startswith('pectoral') or t=='posterior' or t=='oral_cavity' or t=='throat']
 assert not np.any(offsets[keep])
 before=boundary_jumps(raw,xyz);after=boundary_jumps(raw,xyz+offsets)
 # Retain the old construction-boundary measurements. Better C1 source design
 # does not itself approve the actual resulting shading or anatomy.
 assert after['median_degrees']<before['median_degrees']
 assert after['p90_degrees']<before['p90_degrees']
 poses=[]
 for value in [0.,.25,.5,.75,1.]:
  m=copy.copy(raw);delta=np.asarray([[0,.012*w,-.028*w] for w in raw.oral_weight]);m.v=(xyz+offsets+delta*value).tolist()
  poses.append({'oral_key':value,**validate(m)})
 vv,uu=np.mgrid[0:192,0:288].astype(float);uu=(uu+.5)/288;vv=(vv+.5)/192
 fields={}
 for name,fn in [('shield',shield),('pectoral',pectoral),('posterior',posterior)]:
  c,h,r=fn(uu,vv)[:3]
  assert np.isfinite(c).all() and np.isfinite(h).all() and np.isfinite(r).all()
  assert c.min()>=0 and c.max()<=1 and r.min()>=0 and r.max()<=1
  restored=srgb_to_linear(np.rint(linear_to_srgb(c)*255)/255);error=float(np.max(np.abs(c-restored)));assert error<.0045
  fields[name]={'linear_rgb_min':c.min((0,1)).tolist(),'linear_rgb_max':c.max((0,1)).tolist(),'roughness_range':[float(r.min()),float(r.max())],'height_range':[float(h.min()),float(h.max())],'maximum_srgb_roundtrip_error':error}
 # Height-field derivatives across the physical dorsal seam, away from the
 # authored cephalic/thoracic transverse margin. This isolates mirror artifacts.
 derivative={}
 for label,fn in [('material03',previous_shield),('material04',shield)]:
  samples=[];eps=1e-6
  for u in [.012,.055,.10,.15,.19,.22]:
   center=float(fn(np.array(u),np.array(0.))[1]);left=float(fn(np.array(u),np.array(-eps))[1]);right=float(fn(np.array(u),np.array(eps))[1])
   samples.append(abs((center-left)/eps-(right-center)/eps))
  derivative[label]={'samples':samples,'maximum_height_derivative_jump':max(samples)}
 result={'dorsal_height_field_continuity':derivative,'status':'SOURCE_ONLY_PASS','scope':'No Blender, rendered art, actual M04 mesh relief, rig, runtime or final eye approval. Actual loaded M03 preservation and 5 oral pose checks repeated in build.', 'bounded_geometry':report,'oral_construction_boundary_before':before,'oral_construction_boundary_after':after,'pose_topology':poses,'materials':fields,'plate_paths':[n for n,p in PATHS],'protected_source_vertices':len(keep)}
 return result
if __name__=='__main__':
 assert sys.argv[1:] in [[],['--save-source-report']]
 result=run();out=json.dumps(result,indent=2)+'\n'
 if sys.argv[1:]:
  p=HERE/'source-check-material04-02.json';assert not p.exists(),'Preserve frozen report';p.write_text(out)
 print(out)
