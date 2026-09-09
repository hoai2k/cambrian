"""Validate source binding and exact shield rigidity through every authored action."""
import bpy,json,numpy as np
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/doryaspis/v2';bpy.ops.wm.open_mainfile(filepath=str(L/'doryaspis-v2.blend'));rig=bpy.data.objects['Doryaspis'];head=bpy.data.objects['head_shield_continuous_closed'];shield=head.vertex_groups['shield'].index
for o in bpy.data.objects:
 if o.type!='MESH':continue
 for v in o.data.vertices:
  weights=[g.weight for g in v.groups if o.vertex_groups[g.group].name in rig.pose.bones];assert weights and abs(sum(weights)-1)<1e-5,(o.name,v.index,weights)
rigid=[v.index for v in head.data.vertices if len(v.groups)==1 and v.groups[0].group==shield];rigidset=set(rigid);soft=[v.index for v in head.data.vertices if v.index not in rigidset];rest=np.array([v.co[:]for v in head.data.vertices]);results=[]
for action in bpy.data.actions:
 rig.animation_data.action=action;maxerr=0;softmax=0;lo,hi=action.frame_range
 for fr in np.linspace(lo,hi,9):
  bpy.context.scene.frame_set(int(fr),subframe=float(fr%1));bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();m=rig.pose.bones['shield'].matrix@rig.data.bones['shield'].matrix_local.inverted();expected=np.array([(m@Vector(p))[:]for p in rest]);ev=head.evaluated_get(deps);me=ev.to_mesh();actual=np.array([v.co[:]for v in me.vertices]);delta=np.linalg.norm(actual-expected,axis=1);maxerr=max(maxerr,float(delta[rigid].max()));softmax=max(softmax,float(delta.max()));assert np.isfinite(actual).all();ev.to_mesh_clear()
 assert maxerr<2e-5,(action.name,maxerr);assert softmax<.010,(action.name,softmax)
 results.append({'clip':action.name,'sampledPoses':9,'maxRigidShieldError':maxerr,'maxOralDeviation':softmax})
report={'allSourceVerticesHaveNormalizedNamedBoneWeights':True,'rigidShieldVertices':len(rigid),'oralBlendVertices':len(soft),'clips':results};(H/'pose-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('DORYASPIS_SOURCE_POSE_PASS',len(results),'clips',len(rigid),'rigid vertices',len(soft),'oral vertices')
