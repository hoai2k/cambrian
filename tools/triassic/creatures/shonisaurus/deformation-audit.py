import bpy,json,numpy as np,bmesh
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
P=Path.cwd();H=P/'tools/triassic/creatures/shonisaurus';L=P/'local/triassic-authoring/shonisaurus';bpy.ops.wm.open_mainfile(filepath=str(L/'shonisaurus.shared-rig.blend'))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');scene=bpy.context.scene;full=bpy.data.objects['Shonisaurus authored skin'];twins=[o for o in scene.objects if o.type=='MESH'and o.name.startswith('Puppet')]
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
scene.frame_set(0)
def data(obs):
 ps=[];ts=[]
 for o in obs:
  start=len(ps);ps.extend(v.co[:]for v in o.data.vertices);o.data.calc_loop_triangles();ts.extend(tuple(start+i for i in t.vertices)for t in o.data.loop_triangles)
 return np.array(ps),np.array(ts)
a,at=data([full]);b,bt=data(twins)
def section(ps,tris,y):
 points=[]
 for edge in [(0,1),(1,2),(2,0)]:
  p=ps[tris[:,edge[0]]];q=ps[tris[:,edge[1]]];mask=((p[:,1]<=y)&(q[:,1]>y))|((q[:,1]<=y)&(p[:,1]>y));p=p[mask];q=q[mask];points.extend(p+(q-p)*((y-p[:,1])/(q[:,1]-p[:,1]))[:,None])
 p=np.array(points);return np.array([p[:,2].max(),p[:,2].min(),np.abs(p[:,0]).max()])
sections=[]
for y in np.linspace(-2.93,2.93,20):
 x=section(a,at,y);z=section(b,bt,y);err=np.abs(x-z);sections.append({'station':float(y),'full':x.tolist(),'puppet':z.tolist(),'absoluteError':err.tolist()})
maxerr=max(max(r['absoluteError'])for r in sections);assert maxerr<.24,('Envelope mismatch',maxerr)
def volume(ps,ts):
 p=ps[ts];return float(abs(np.einsum('ij,ij->i',p[:,0],np.cross(p[:,1],p[:,2])).sum()/6))
def distances(p,q,tri):
 tree=BVHTree.FromPolygons([Vector(x)for x in q],tri.tolist(),all_triangles=True);d=np.array([tree.find_nearest(Vector(x))[3]for x in p]);return {'p50':float(np.quantile(d,.5)),'p95':float(np.quantile(d,.95)),'max':float(d.max())}
close={'fullToPuppet':distances(a,b,bt),'puppetToFull':distances(b,a,at)}
tree=BVHTree.FromPolygons([Vector(x)for x in a],at.tolist(),all_triangles=True)
root_audit={}
for name in ['pectoral0L','pectoral0R','pelvic0L','pelvic0R']:
 p=rig.data.bones[name].head_local;loc,normal,index,distance=tree.find_nearest(p);signed=float((p-loc).dot(normal));root_audit[name]={'signedDistance':signed,'inside':signed<=0};assert signed<=0,('Unseated fin root',name,signed)
eye_audit={}
for o in [o for o in scene.objects if o.type=='MESH'and o.name.startswith('Eye globe')]:
 ps=np.array([v.co[:]for v in o.data.vertices]);center=(ps.min(0)+ps.max(0))/2;radius=(ps.max(0)-ps.min(0))/2;inside=0;count=0
 for x in np.linspace(-.95,.95,11):
  for y in np.linspace(-.95,.95,11):
   for z in np.linspace(-.95,.95,11):
    if x*x+y*y+z*z>1:continue
    p=Vector(center+radius*np.array([x,y,z]));loc,n,idx,dist=tree.find_nearest(p);inside+=int((p-loc).dot(n)<=0);count+=1
 fraction=inside/count;eye_audit[o.name]={'sampledVolumeEmbedded':fraction,'samples':count};assert fraction>=.5,('Eye not seated',o.name,fraction)
records={};rest={}
for o in [full]+twins:
 p=np.array([v.co[:]for v in o.data.vertices]);edges=np.array([e.vertices[:]for e in o.data.edges]);length=np.linalg.norm(p[edges[:,1]]-p[edges[:,0]],axis=1);rest[o.name]=(p,edges,length)
for action in bpy.data.actions:
 rig.animation_data.action=action;rows=[]
 for phase in [0,.2,.35,.5,.7,1]:
  scene.frame_set(round(action.frame_range[1]*phase));dg=bpy.context.evaluated_depsgraph_get()
  for o in [full]+twins:
   ev=o.evaluated_get(dg);m=ev.to_mesh();p=np.array([v.co[:]for v in m.vertices]);ev.to_mesh_clear();assert np.isfinite(p).all();rp,edges,length=rest[o.name];rat=np.linalg.norm(p[edges[:,1]]-p[edges[:,0]],axis=1)/np.maximum(length,1e-8)
   rows.append({'object':o.name,'phase':phase,'maxTravel':float(np.linalg.norm(p-rp,axis=1).max()),'stretch99':float(np.quantile(rat,.99)),'stretchMax':float(rat.max()),'edgesOver5x':int((rat>5).sum())})
 records[action.name]=rows
report={'passed':True,'stationTolerance':.24,'maximumStationError':maxerr,'maximumStationErrorPercentLength':maxerr/6*100,'sections':sections,'surfaceDistances':close,'signedVolume':{'full':volume(a,at),'puppet':volume(b,bt)},'finRootSeating':root_audit,'eyeContainment':eye_audit,'deformations':records}
(H/'deformation-validation.json').write_text(json.dumps(report,indent=2)+'\n');print('SHONISAURUS_ENVELOPE',maxerr,close,'VOLUME',report['signedVolume'],flush=True)
print('STRETCH_WORST',max((r['stretchMax'],clip,r['object'],r['phase'])for clip,rows in records.items()for r in rows))
