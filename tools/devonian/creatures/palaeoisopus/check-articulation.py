"""Basic preview checks: actual evaluated bone articulation, limb counts and oral binding."""
import bpy,os,json,hashlib,numpy as np
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));local=os.path.abspath(os.path.join(here,'../../../../../devonian-authoring/palaeoisopus'));path=os.path.join(local,'palaeoisopus-v1.blend');bpy.ops.wm.open_mainfile(filepath=path);rig=bpy.data.objects['palaeoisopus_rig'];obj=bpy.data.objects['palaeoisopus'];scene=bpy.context.scene
chains={}
for pair in range(1,5):
 for side in ['L','R']:
  tag='WL'+str(pair)+side;names=[tag+'_'+str(i)for i in range(9 if pair==1 else 10)];assert all(n in rig.pose.bones for n in names);chains[tag]=names
checks=[]
for action in bpy.data.actions:
 rig.animation_data.action=action
 for phase in [0,.3,.5,1]:
  scene.frame_set(round(action.frame_range[1]*phase));bpy.context.view_layer.update();errors=[]
  for tag,names in chains.items():
   for parent,child in zip(names,names[1:]):errors.append((rig.pose.bones[parent].tail-rig.pose.bones[child].head).length)
  checks.append({'clip':action.name,'phase':phase,'maximumArticulationGap':max(errors)})
oralVerts=set(i for p in obj.data.polygons if p.material_index==4 for i in p.vertices);gn={g.index:g.name for g in obj.vertex_groups};oralBones=set(gn[g.group]for i in oralVerts for g in obj.data.vertices[i].groups if g.weight>0);assert oralBones=={'oralTip'}
# Actual cuticle-surface burial of fine setal basal rings in the neutral source.
from mathutils.bvhtree import BVHTree
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
bpy.context.view_layer.update();mesh=obj.data;uv=mesh.uv_layers.active.data;roots=set()
for poly in mesh.polygons:
 if poly.material_index==2:
  for li in poly.loop_indices:
   if uv[li].uv.y<.000001:roots.add(mesh.loops[li].vertex_index)
adj={i:set()for i in roots}
for edge in mesh.edges:
 a,b=edge.vertices
 if a in adj and b in adj:adj[a].add(b);adj[b].add(a)
seen=set();basal=[]
for i in roots:
 if i in seen:continue
 todo=[i];component=[];seen.add(i)
 while todo:
  j=todo.pop();component.append(j)
  for k in adj[j]:
   if k not in seen:seen.add(k);todo.append(k)
 if len(component)==4:basal.append(component)
co=[v.co.copy()for v in mesh.vertices];cuticle=BVHTree.FromPolygons(co,[list(p.vertices)for p in mesh.polygons if p.material_index==0],all_triangles=True);signed=[]
for ids in basal:
 center=sum((co[i]for i in ids),Vector())/len(ids);hit,normal,index,distance=cuticle.find_nearest(center);signed.append(float((center-hit).dot(normal)))
setae={'fineSetalBases':len(basal),'maximumSignedDistanceFromCuticle':max(signed),'allInsideOrAtSurface':max(signed)<.0001,'method':'Basal-ring centroids against nearest actual cuticle triangle and oriented normal in bind pose; each bristle shares its supporting cuticle article bone.'}
assert setae['allInsideOrAtSurface'],setae
report={'sourceSha256':hashlib.sha256(open(path,'rb').read()).hexdigest(),'setae':setae,'sampledPoses':len(checks),'walkingLegArticleCounts':{k:len(v)for k,v in chains.items()},'maximumArticulationGap':max(r['maximumArticulationGap']for r in checks),'oralVertexCount':len(oralVerts),'oralBones':sorted(oralBones),'eyes':{'status':'not-applicable','reason':'Fossil ocular bumps reinterpreted as cuticular/sensory tubercles by Sabroux2024. Actual lens positions unresolved; no invented eye globes.'},'scope':'Bone-chain joint alignment and oral binding, not a universal mesh-intersection proof. Actual exported visual review also required.','results':checks};assert report['maximumArticulationGap']<.00002;open(os.path.join(here,'articulation-v1.json'),'w').write(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items()if k!='results'},indent=2))
