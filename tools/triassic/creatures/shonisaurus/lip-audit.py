"""Does any mouth face turn inside out when the jaw opens?

**The first version of this asked a question that only a rigid shell can answer.** It compared each
deformed face normal with its rest normal transported by the *mean* of its three vertices' weights.
That is exact where the three share one transform, which is what the mandible shell this body used
to carry gave it -- and it is only an approximation across a blend band, where the three vertices
are on different mixtures. When the mandible stopped being cut off and the commissure became a band,
the old test reported 415 inverted faces at `Heavy` on a body where **none** is inverted: every one
of them agrees with its own neighbours, and `gape-solid.py` reports the culled and solid passes as
*pixel for pixel identical*, so nothing renders backfacing at all. An assertion whose message says
something it does not test is the `np.interp` lesson in another costume.

So the verdict is the **neighbour test**, which uses no weights: a face that has really turned inside
out points the opposite way to the faces it shares edges with. The mean-weight figure is kept beside
it, because it is what every earlier verdict on this animal measured and because it is a fair
strain reading -- it says how far a face's three vertices have come apart in the blend.

  /opt/blender/blender -b --factory-startup --python .../lip-audit.py [-- <blend> <out.json> [--single]]
"""
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
 # Every face that shares an edge with each face, once, so the neighbour test costs nothing per frame.
 edges={}
 for t,(i,j,k) in enumerate(tris):
  for u,v in ((i,j),(j,k),(k,i)):edges.setdefault((min(u,v),max(u,v)),[]).append(t)
 neighbours=[[s for u,v in ((i,j),(j,k),(k,i)) for s in edges[(min(u,v),max(u,v))] if s!=t]for t,(i,j,k) in enumerate(tris)]
 data.append((o,rest,tris,cross,weights[tris].mean(1),rest[tris].mean(1)[:,1]<-1.75,neighbours))
rows=[]
for clip in ['Idle','Bite','Attack','Heavy','Eat']:
 a=bpy.data.actions.get(clip);rig.animation_data.action=a
 frames=[.35*30]if'--single'in args else sorted(set([.35*30]+[float(a.frame_range[1])*p for p in [0,.1,.2,.25,.35,.45,.5,.65,.85,1]]))
 for frame in frames:
  scene.frame_set(math.floor(frame),subframe=frame%1);dg=bpy.context.evaluated_depsgraph_get()
  matrices=np.array([(rig.pose.bones[n].matrix@rig.data.bones[n].matrix_local.inverted()).to_3x3()for n in names]);parts=[]
  for o,rest,tris,cross,fw,mouth,neighbours in data:
   ev=o.evaluated_get(dg);me=ev.to_mesh();deformed=np.array([v.co[:]for v in me.vertices]);ev.to_mesh_clear();dc=np.cross(deformed[tris[:,1]]-deformed[tris[:,0]],deformed[tris[:,2]]-deformed[tris[:,0]])
   expected=np.einsum('tb,bij,tj->ti',fw,matrices,cross);dot=np.einsum('ij,ij->i',dc,expected)/np.maximum(np.linalg.norm(dc,axis=1)*np.linalg.norm(expected,axis=1),1e-20);valid=(np.linalg.norm(cross,axis=1)>1e-10)&mouth;flags=np.where(valid&(dot<-.001))[0]
   # The verdict: does the face oppose the faces it shares edges with? No weights are involved.
   unit=dc/np.maximum(np.linalg.norm(dc,axis=1)[:,None],1e-20);inverted=0;worst=1.
   for t in np.where(valid)[0]:
    acc=dc[neighbours[t]].sum(0);n=np.linalg.norm(acc)
    if n<1e-20:continue
    agree=float(unit[t]@(acc/n));worst=min(worst,agree)
    if agree<0:inverted+=1
   parts.append({'mesh':o.name,'invertedFaces':inverted,'worstNeighbourAgreement':worst,
                 'flaggedByTheMeanWeightTest':len(flags),'worstDot':float(dot[valid].min()),
                 'maximumRestArea':float(np.linalg.norm(cross[flags],axis=1).max()/2)if len(flags)else 0})
  rows.append({'clip':clip,'seconds':frame/30,'phase':frame/float(a.frame_range[1]),'invertedMouthFaces':sum(p['invertedFaces']for p in parts),'flaggedByTheMeanWeightTest':sum(p['flaggedByTheMeanWeightTest']for p in parts),'parts':parts})
r={'file':str(file),'triangles':sum(len(d[2])for d in data),
   'method':'Inversion is the neighbour test: a face that has turned inside out points the opposite way to the faces it shares edges with, which uses no weights at all. The mean-weight transported rest normal is reported beside it -- it is exact only where a face\'s three vertices share one transform, so on the blended commissure it reads strain rather than inversion, and it is what every earlier verdict on this animal measured. Rostral/head mask author Y < -1.75; fractional frame evaluation; all authored cutaneous meshes.',
   'samples':rows};out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps([{k:v for k,v in r.items()if k!='parts'}for r in rows],indent=2),flush=True)

# **The bar is a share of the mesh, because the floor is not zero and never was.** The intake's own
# geometry carries a handful of faces that oppose their neighbours in the bind pose itself -- 8 on
# the split body this replaces, at every frame of every clip, and 14 on the uncut one -- so
# "inverts nothing" is not a thing any weighting can deliver and an assertion that said so would be
# measuring the generation. What it has to catch is the 2026-09-13 regression, which was 259 faces
# of 113,904 at `Heavy` 0.35 s: 0.23 % of the mesh, against a good build's 1. A twentieth of a
# percent is an order of magnitude under that and an order of magnitude over the floor.
if not args:
 worst=max(r['invertedMouthFaces']for r in rows);rest=[r for r in rows if r['clip']=='Idle'][0]['invertedMouthFaces']
 share=worst/max(r['triangles'],1)
 assert share<5e-4,('authored mouth inversion regression',worst,rest,r['triangles'],share)
