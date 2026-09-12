"""Source weights, jaw rigidity, appendage attachment and finite extreme poses."""
import bpy,json,numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/stethacanthus/v2';bpy.ops.wm.open_mainfile(filepath=str(L/'stethacanthus-v2.blend'));rig=bpy.data.objects['Stethacanthus'];objects=[o for o in bpy.data.objects if o.type=='MESH']
for o in objects:
 for v in o.data.vertices:
  ws=[g.weight for g in v.groups if o.vertex_groups[g.group].name in rig.pose.bones];assert ws and abs(sum(ws)-1)<2e-5,(o.name,v.index,ws)
results=[]
for action in bpy.data.actions:
 rig.animation_data.action=action;lo,hi=action.frame_range;jawerr=0;rootgap=0;minmax=[]
 for fr in np.linspace(lo,hi,9):
  bpy.context.scene.frame_set(int(fr),subframe=float(fr%1));bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get()
  for o in objects:
   ev=o.evaluated_get(deps);me=ev.to_mesh();actual=np.array([v.co[:]for v in me.vertices]);assert np.isfinite(actual).all();minmax.extend([actual.min(0),actual.max(0)])
   if o.name in ['upper_cladodont_dentition','lower_cladodont_dentition']:
    b='jaw'if o.name.startswith('lower')else'skull';matrix=rig.pose.bones[b].matrix@rig.data.bones[b].matrix_local.inverted();expected=np.array([(matrix@v.co)[:]for v in o.data.vertices]);jawerr=max(jawerr,float(np.linalg.norm(actual-expected,axis=1).max()))
   ev.to_mesh_clear()
  for s in [-1,1]:
   side='L'if s>0 else'R';fin=bpy.data.objects['pectoral_fin_'+str(s)].evaluated_get(deps);fm=fin.to_mesh();tree=BVHTree.FromPolygons([v.co for v in fm.vertices],[p.vertices for p in fm.polygons]);whip=bpy.data.objects['metapterygial_extension_'+side].evaluated_get(deps);wm=whip.to_mesh();center=sum((wm.vertices[i].co for i in range(16)),Vector())/16;q,no,ii,d=tree.find_nearest(center);rootgap=max(rootgap,d);fin.to_mesh_clear();whip.to_mesh_clear()
 assert jawerr<2e-5,(action.name,jawerr);assert rootgap<.045,(action.name,rootgap)
 results.append({'clip':action.name,'sampledPoses':9,'maxDentitionRigidityError':jawerr,'maxWhipRootDistanceToFin':rootgap,'poseBounds':[np.array(minmax).min(0).tolist(),np.array(minmax).max(0).tolist()]})
report={'allSourceVerticesHaveNormalizedNamedBoneWeights':True,'sourceMeshes':len(objects),'clips':results};(H/'pose-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('STETHACANTHUS_SOURCE_POSE_PASS',len(results),'clips')
