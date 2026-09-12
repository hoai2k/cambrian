"""V3 port of attachment-audit-v2.py: reads the v3-candidate/ GLBs instead of v2-candidate/, and
writes attachment-validation-v3.json instead of attachment-validation-v2.json. The fin-root
origins (pectoral/pelvic) are BODY-mesh positions, unchanged by the head/jaw study, so they are
left as-is. Otherwise identical. Actual GLB fin-root immersion and finite skin checks through
every exported action."""
import bpy,json,hashlib,sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/rhinodipterus';results=[]
for suffix in ['', '.lod1']:
 p=L/'v3-candidate'/('rhinodipterus'+suffix+'.glb');sha=hashlib.sha256(p.read_bytes()).hexdigest()
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 bpy.context.scene.render.fps=30;bpy.ops.import_scene.gltf(filepath=str(p));s=bpy.context.scene;rig=next(o for o in s.objects if o.type=='ARMATURE');body=next(o for o in s.objects if o.name.startswith('Continuous scaled torso'))
 rig.animation_data.action=None
 for track in rig.animation_data.nla_tracks:track.mute=True
 for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
 s.frame_set(0);bpy.context.view_layer.update();roots={}
 for o in s.objects:
  if o.type!='MESH' or not o.name.startswith('Fleshy '):continue
  sign=1 if o.name.endswith('L')else -1;origin=Vector((sign*.28,-.64,-.16)if 'pectoral'in o.name else(sign*.145,1.20,-.17))
  roots[o.name]=[v.index for v in o.data.vertices if (o.matrix_world@v.co-origin).length<.049]
  assert roots[o.name],o.name
 clips=[]
 for action in bpy.data.actions:
  rig.animation_data.action=action;lo,hi=action.frame_range;poses=[]
  for fraction in [0,.15,.3,.5,.7,.85,1]:
   s.frame_set(round(lo+(hi-lo)*fraction));dg=bpy.context.evaluated_depsgraph_get();be=body.evaluated_get(dg);bm=be.to_mesh();bv=BVHTree.FromPolygons([be.matrix_world@v.co for v in bm.vertices],[list(f.vertices)for f in bm.polygons]);pose={'fraction':fraction,'fins':[]}
   for name,ids in roots.items():
    o=bpy.data.objects[name];ev=o.evaluated_get(dg);me=ev.to_mesh();dist=[]
    for i in ids:
     point=ev.matrix_world@me.vertices[i].co;q,n,_,_=bv.find_nearest(point);dist.append((point-q).dot(n))
    pose['fins'].append({'name':name,'samples':len(ids),'maxOutwardDistance':max(dist),'insideFraction':sum(d<=0 for d in dist)/len(dist)})
    ev.to_mesh_clear()
   be.to_mesh_clear();poses.append(pose)
  clips.append({'clip':action.name,'poses':poses})
 worst=max(v['maxOutwardDistance']for c in clips for p in c['poses']for v in p['fins']);results.append({'file':p.name if hasattr(p,'name')else 'rhinodipterus'+suffix+'.glb','sourceGlbSha256':sha,'method':'Evaluated actual skin root vertices against evaluated continuous torso BVH; signed nearest distance, review aid rather than eye-volume measurement','maxRootOutwardDistance':worst,'clips':clips})
(H/'attachment-validation-v3.json').write_text(json.dumps(results,indent=2));print(json.dumps([{'file':r['file'],'maxRootOutwardDistance':r['maxRootOutwardDistance'],'clips':len(r['clips'])}for r in results]))
