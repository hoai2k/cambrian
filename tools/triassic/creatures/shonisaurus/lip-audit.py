"""Compare actual skinned cutaneous normals with transported rest normals."""
import bpy,json,numpy as np,sys,math
from pathlib import Path
P=Path.cwd();H=P/'tools/triassic/creatures/shonisaurus';L=P/'local/triassic-authoring/shonisaurus';args=sys.argv[sys.argv.index('--')+1:]if'--'in sys.argv else[]
file=Path(args[0])if args else L/'shonisaurus.shared-rig.blend';out=Path(args[1])if len(args)>1 else H/'lip-validation.json'
bpy.ops.wm.open_mainfile(filepath=str(file));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');obs=[o for o in bpy.data.objects if o.type=='MESH'and o.name.startswith('Shonisaurus authored')];scene=bpy.context.scene
names=[b.name for b in rig.data.bones];data=[]
for o in obs:
 rest=np.array([v.co[:]for v in o.data.vertices]);o.data.calc_loop_triangles();tris=np.array([t.vertices[:]for t in o.data.loop_triangles]);cross=np.cross(rest[tris[:,1]]-rest[tris[:,0]],rest[tris[:,2]]-rest[tris[:,0]])
 weights=np.zeros((len(rest),len(names)))
 for v in o.data.vertices:
  for g in v.groups:
   name=o.vertex_groups[g.group].name
   if name in names:weights[v.index,names.index(name)]=g.weight
 data.append((o,rest,tris,cross,weights[tris].mean(1),rest[tris].mean(1)[:,1]<-1.75))
rows=[]
for clip in ['Idle','Bite','Attack','Heavy','Eat']:
 a=bpy.data.actions.get(clip);rig.animation_data.action=a
 frames=[.35*30]if'--single'in args else sorted(set([.35*30]+[float(a.frame_range[1])*p for p in [0,.1,.2,.25,.35,.45,.5,.65,.85,1]]))
 for frame in frames:
  scene.frame_set(math.floor(frame),subframe=frame%1);dg=bpy.context.evaluated_depsgraph_get()
  matrices=np.array([(rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()).to_3x3()for n in names]);parts=[]
  for o,rest,tris,cross,fw,mouth in data:
   ev=o.evaluated_get(dg);me=ev.to_mesh();deformed=np.array([v.co[:]for v in me.vertices]);ev.to_mesh_clear();dc=np.cross(deformed[tris[:,1]]-deformed[tris[:,0]],deformed[tris[:,2]]-deformed[tris[:,0]])
   expected=np.einsum('tb,bij,tj->ti',fw,matrices,cross);dot=np.einsum('ij,ij->i',dc,expected)/np.maximum(np.linalg.norm(dc,axis=1)*np.linalg.norm(expected,axis=1),1e-20);valid=(np.linalg.norm(cross,axis=1)>1e-10)&mouth;flips=np.where(valid&(dot<-.001))[0]
   parts.append({'mesh':o.name,'invertedFaces':len(flips),'worstDot':float(dot[valid].min()),'maximumRestArea':float(np.linalg.norm(cross[flips],axis=1).max()/2)if len(flips)else 0})
  rows.append({'clip':clip,'seconds':frame/30,'phase':frame/float(a.frame_range[1]),'invertedMouthFaces':sum(p['invertedFaces']for p in parts),'parts':parts})
r={'file':str(file),'triangles':sum(len(d[2])for d in data),'method':'Geometric skinned face normal versus mean-weight transported rest normal; rostral/head mask author Y < -1.75; fractional frame evaluation. Counts all authored cutaneous meshes.','samples':rows};out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps([{k:v for k,v in r.items()if k!='parts'}for r in rows],indent=2),flush=True)

if not args:assert max(r['invertedMouthFaces']for r in rows)==0,'Authored mouth inversion regression'
