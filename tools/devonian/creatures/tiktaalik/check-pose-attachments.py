"""Independent evaluated-mesh checks: fin-root burial and tooth-base attachment in every action.

TIKTAALIK_BLEND (default tiktaalik-v2.blend) selects the frozen .blend to open; TIKTAALIK_CHECK_SUFFIX
(default v2) selects the report filename (pose-attachments-<suffix>.json), so a v3 candidate can be
checked without overwriting the v2 report.
"""
import bpy,os,json,numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
BLEND=os.environ.get('TIKTAALIK_BLEND','tiktaalik-v2.blend');SUFFIX=os.environ.get('TIKTAALIK_CHECK_SUFFIX','v2')
HERE=os.path.dirname(os.path.abspath(__file__));LOCAL=os.path.abspath(os.path.join(HERE,'../../../../../devonian-authoring/tiktaalik'));bpy.ops.wm.open_mainfile(filepath=os.path.join(LOCAL,BLEND));obj=bpy.data.objects['tiktaalik'];rig=bpy.data.objects['tiktaalik_rig'];scene=bpy.context.scene;mesh=obj.data;uv=mesh.uv_layers.active.data
bodyFaces=[tuple(p.vertices)for p in mesh.polygons if p.material_index==0]
oralFaces=[tuple(p.vertices)for p in mesh.polygons if p.material_index==0 and min(uv[i].uv.y for i in p.loop_indices)>=.79999]
finRoots={};toothVerts=set()
for p in mesh.polygons:
 for li in p.loop_indices:
  i=mesh.loops[li].vertex_index
  if uv[li].uv.y>1e-6:continue
  if p.material_index==5:
   co=mesh.vertices[i].co;key=('pectoral'if co.y<1 else'pelvic')+('L'if co.x>0 else'R');finRoots.setdefault(key,set()).add(i)
  if p.material_index==2:toothVerts.add(i)
# Each tooth is a connected accent component. Average its basal ring, not its point.
adj={i:set()for i in toothVerts}
for e in mesh.edges:
 a,b=e.vertices
 if a in adj and b in adj:adj[a].add(b);adj[b].add(a)
seen=set();toothBases=[]
for i in adj:
 if i in seen:continue
 todo=[i];part=[];seen.add(i)
 while todo:
  q=todo.pop();part.append(q)
  for j in adj[q]:
   if j not in seen:seen.add(j);todo.append(j)
 if len(part)>3:toothBases.append(part)
def inside(bvh,p):
 d=Vector((.798,.332,.502)).normalized();o=Vector(p);count=0
 for _ in range(100):
  hit,n,index,dist=bvh.ray_cast(o,d,100)
  if hit is None:break
  count+=1;o=hit+d*.00001
 return count%2==1
results=[]
for action in sorted(bpy.data.actions,key=lambda a:a.name):
 rig.animation_data.action=action;last=action.frame_range[1]
 for phase in [0,.2,.3,.42,.5,.75,1]:
  scene.frame_set(round(last*phase));ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',co);co=co.reshape(-1,3);body=BVHTree.FromPolygons(co.tolist(),bodyFaces,all_triangles=True);oral=BVHTree.FromPolygons(co.tolist(),oralFaces,all_triangles=True);roots={}
  for key,ids in finRoots.items():
   p=co[list(ids)].mean(0);hit,n,idx,dist=body.find_nearest(Vector(p));roots[key]={'insideContinuousBody':inside(body,p),'surfaceDistance':float(dist)}
  distances=[]
  for ids in toothBases:
   p=co[ids].mean(0);hit,n,idx,dist=oral.find_nearest(Vector(p));distances.append(float(dist))
  results.append({'clip':action.name,'phase':phase,'finRoots':roots,'maximumToothBaseToLiningDistance':max(distances)});ev.to_mesh_clear()
report={'sampledPoses':len(results),'toothBases':len(toothBases),'finRoots':{k:len(v)for k,v in finRoots.items()},'allFinRootCentroidsBuried':all(v['insideContinuousBody']for r in results for v in r['finRoots'].values()),'maximumToothBaseToLiningDistance':max(r['maximumToothBaseToLiningDistance']for r in results),'results':results}
open(os.path.join(HERE,'pose-attachments-'+SUFFIX+'.json'),'w').write(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items()if k!='results'},indent=2))
