"""Closed-mouth lateral aperture probe, excluding all oral fillers and teeth.
An open control checks that the same rays detect the former baked-open gap.
"""
import bpy,json,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=Path.cwd();L=P/'local/triassic-authoring/shonisaurus';H=P/'tools/triassic/creatures/shonisaurus'
def audit(file):
 bpy.ops.wm.open_mainfile(filepath=str(file));result={}
 for kind in ['full','puppet']:
  obs=[bpy.data.objects['Shonisaurus authored skin']]if kind=='full'else[bpy.data.objects[n]for n in ['Puppet measured trunk','Puppet upper rostrum','Puppet lower rostrum']]
  ps=[];ts=[]
  for o in obs:
   start=len(ps);ps.extend(v.co[:]for v in o.data.vertices);o.data.calc_loop_triangles();ts.extend(tuple(start+i for i in t.vertices)for t in o.data.loop_triangles)
  ps=np.array(ps);ts=np.array(ts);tree=BVHTree.FromPolygons([Vector(p)for p in ps],ts.tolist(),all_triangles=True);rows=[]
  for y in np.linspace(-.482*6,-.373*6,60):
   cross=[]
   for a,b in [(0,1),(1,2),(2,0)]:
    p=ps[ts[:,a]];q=ps[ts[:,b]];mask=((p[:,1]<=y)&(q[:,1]>y))|((q[:,1]<=y)&(p[:,1]>y));p=p[mask];q=q[mask];cross.extend(p+(q-p)*((y-p[:,1])/(q[:,1]-p[:,1]))[:,None])
   cross=np.array(cross);zmin=cross[:,2].min();zmax=cross[:,2].max();zs=np.linspace(zmin+.0005,zmax-.0005,240);miss=[]
   for z in zs:
    hit=tree.ray_cast(Vector((3,y,float(z))),Vector((-1,0,0)),6.)[0];miss.append(hit is None)
   runs=[];length=0
   for m in miss+[False]:
    if m:length+=1
    elif length:runs.append(length);length=0
   rows.append({'stationY':float(y),'missedRays':sum(miss),'maximumOpenSpan':max(runs,default=0)*(zmax-zmin)/239})
  result[kind]={'rays':60*240,'missedRays':sum(r['missedRays']for r in rows),'maximumOpenSpan':max(r['maximumOpenSpan']for r in rows),'stations':rows}
 return result
r={'method':'Lateral through-aperture scan over 60 rostral sections and 240 heights, only external cutaneous meshes; oral fillers and teeth excluded.','closed':audit(L/'shonisaurus.shared-rig.blend')}
control=L/'shonisaurus.before-mouth-closure.blend'
if control.exists():r['priorOpenControl']=audit(control)
assert all(v['missedRays']==0 for v in r['closed'].values()),'Closed mouth has an aperture'
r['passed']=True
(H/'mouth-closure-validation.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({k:{t:{n:x for n,x in v.items()if n!='stations'}for t,v in val.items()}for k,val in r.items()if isinstance(val,dict)},indent=2))
