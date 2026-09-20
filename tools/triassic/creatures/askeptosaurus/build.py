"""Build Askeptosaurus from the regenerated skin, a voxel twin, and the preserved posed backup.

The pair shares exact rest skeleton, animations and anchors. The backup keeps its own curved
surface and pose-matched rest skeleton; it shares public action names and anatomical semantics.
All source GLBs are immutable. Blender 5.2; run this file, audit.mjs --package --decode, render.py.
"""
import bpy,bmesh,sys,json,math,shutil,hashlib,heapq
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]
sys.path.insert(0,str(HERE.parent/'_pipeline'))
import tripo as T
sys.path.insert(0,str(HERE.parent))
import shorekit as K
ID='askeptosaurus';NAME='Askeptosaurus';SCALE=6.
OUT=ROOT/'public/assets/triassic/creatures';LOCAL=ROOT/'local/triassic-authoring'/ID
LOCAL.mkdir(parents=True,exist_ok=True)
CLIPS={'Idle':2.8,'Swim':1.7,'Sprint':1.05,'TurnLeft':1.2,'TurnRight':1.2,'Dive':1.3,'Rise':1.3,
'Attack':.85,'Bite':.45,'Heavy':1.15,'Hit':.55,'Death':1.7,'Guard':1.2,'Parry':.4,'Dodge':.55,
'Eat':1.6,'Stagger':1.2,'Ability':1.1,'Grab':1.1,'Breath':2.4,'Growth':1.5,
'TailWhip':1.25,'Coil':1.3,'Dash':.65}
LOOPS=['Idle','Swim','Sprint','Guard','Eat','Grab']
TAIL=['tail_%02d'%i for i in range(12)]
NECK=['neck_%02d'%i for i in range(4)]

def at(P,cum,s):
 s=max(0,min(cum[-1],s));i=min(len(P)-2,max(0,int(np.searchsorted(cum,s))-1));t=(s-cum[i])/max(cum[i+1]-cum[i],1e-8)
 return P[i].lerp(P[i+1],t)

def smoothpulse(t,a,b,c,d):
 return T.smooth((t-a)/(b-a))*(1-T.smooth((t-c)/(d-c)))

def animate(rig,backup=False):
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create();seams={}
 for p in rig.pose.bones:p.rotation_mode='XYZ'
 def reset():
  for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
 for clip,duration in CLIPS.items():
  action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action
  end=round(duration*30);first=None
  for f in range(end+1):
   t=f/end;p=math.tau*t;reset();pb=rig.pose.bones;e=math.sin(math.pi*t)**2
   # One traveling wave down the long tail. The head counter-steers, keeping the jaw steady.
   amp={'Idle':.008,'Swim':.075,'Sprint':.12,'Guard':.016,'Eat':.022,'Grab':.022}.get(clip,.035*e)
   if backup:amp*=.7
   for i,n in enumerate(TAIL):pb[n].rotation_euler.z=amp*(.30+.70*i/11)*math.sin(p-i*.50)
   pb['body'].rotation_euler.z=amp*.08*math.sin(p+.8)
   pb['chest'].rotation_euler.z=-amp*.08*math.sin(p+.8)
   jaw=0.;strike=smoothpulse(t,.10,.30,.42,.80)
   if clip in ('Attack','Bite'):
    jaw=(.26 if clip=='Bite' else .29)*smoothpulse(t,.08,.28,.36,.62)
    pb['body'].location.y=SCALE*(.012*smoothpulse(t,0,.15,.20,.36)-(.036 if clip=='Attack' else .010)*strike)
    for i,n in enumerate(NECK):pb[n].rotation_euler.x=-.022*strike
   if clip in ('Heavy','TailWhip'):
    whip=-.18*smoothpulse(t,.05,.22,.27,.43)+.30*smoothpulse(t,.28,.42,.50,.80)
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=whip*(.50+.50*i/11)
    pb['body'].rotation_euler.z=-.22*whip;pb['chest'].rotation_euler.z=.16*whip
   if clip in ('Ability','Coil'):
    coil=smoothpulse(t,.03,.32,.54,.96)
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=.20*coil
    for n in NECK:pb[n].rotation_euler.z=-.065*coil
    pb['body'].rotation_euler.z=.38*coil;pb['chest'].rotation_euler.z=-.18*coil
   if clip in ('TurnLeft','TurnRight'):
    sg=1 if clip=='TurnLeft' else -1
    pb['body'].rotation_euler.z=sg*.15*e;pb['body'].rotation_euler.y=sg*.10*e
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=sg*.035*e
    for n in NECK:pb[n].rotation_euler.z-=sg*.035*e
   if clip in ('Dive','Rise','Breath'):
    sg=1 if clip=='Dive' else -1
    pb['body'].rotation_euler.x=sg*(.12 if clip!='Breath' else .08)*e
    for n in NECK:pb[n].rotation_euler.x=sg*.025*e
   if clip in ('Dodge','Dash'):
    pb['body'].location.y=-SCALE*.055*strike
    pb['body'].rotation_euler.y=(.30 if clip=='Dodge' else .025)*e
    for i,n in enumerate(TAIL):pb[n].rotation_euler.z+=.10*e*math.sin(p*2-i*.55)
   if clip in ('Hit','Stagger'):
    pb['body'].rotation_euler.z=(.16 if clip=='Hit' else .26)*e*math.sin(p*2)
    pb['body'].rotation_euler.x=.12*e*math.sin(p*3)
   if clip=='Death':
    relax=T.smooth(t/.8);pb['body'].rotation_euler.y=1.15*relax;pb['body'].rotation_euler.x=.1*relax;jaw=.10*relax
    for n in TAIL:pb[n].rotation_euler.z=.04*relax
   if clip=='Parry':pb['body'].rotation_euler.z=.17*e;pb['chest'].rotation_euler.z=-.13*e
   if clip=='Eat':jaw=.13*(.5-.5*math.cos(p*2));pb['chest'].rotation_euler.x=.015*math.sin(p)
   if clip=='Grab':
    jaw=.12+.018*math.sin(p);pb['chest'].rotation_euler.x=.025*math.sin(p)
    for n in NECK:pb[n].rotation_euler.x=.014*math.sin(p)
   if clip=='Growth':
    pb['body'].rotation_euler.x=-.05*e
    for n in NECK:pb[n].rotation_euler.x=-.03*e
   pb['jaw'].rotation_euler.x=jaw
   for kind in ('fore','hind'):
    for side,sg in [('L',-1),('R',1)]:
     n=kind+'_upper_'+side;gain=.6 if kind=='hind' else 1
     row=(.16 if clip=='Swim' else .26 if clip=='Sprint' else .05)*gain
     if clip in LOOPS:stroke=row*math.sin(p-(.7 if kind=='hind' else 0))
     else:stroke=.08*e
     if clip in ('Dash','Dodge','Attack'):stroke+=.38*strike
     if clip in ('Heavy','TailWhip','Coil','Ability'):stroke+=.18*e
     if clip=='Parry':stroke+=.28*e
     if clip=='Growth':stroke-=.16*e
     if clip=='Death':stroke=.23*T.smooth(t/.8)
     pb[n].rotation_euler.z=sg*stroke
     pb[n].rotation_euler.y=sg*.18*stroke
     pb[kind+'_mid_'+side].rotation_euler.z=sg*.24*stroke
     pb[kind+'_tip_'+side].rotation_euler.y=sg*.30*stroke
   # The curled backup has less safe bend range than the new straight body.
   if backup and clip in ('Heavy','TailWhip','Ability','Coil'):
    for q in pb:q.rotation_euler=tuple(v*.28 for v in q.rotation_euler)
   state=np.array([tuple(q.rotation_euler)+tuple(q.location) for q in pb])
   if f==0:first=state.copy()
   if f==end:seams[clip]=float(abs(state-first).max())
   for q in pb:
    if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body':q.keyframe_insert('location',frame=f)
  rig.animation_data.action=None
 for name in LOOPS:assert seams[name]<1e-6,(name,seams[name])
 reset();scene.frame_set(0)
 return seams

def backup_axis(o):
 # The old source's geometric double sweep ends on a forepaddle, not its snout. The true snout
 # is this visually identified source landmark in its normalized frame. Use that explicit seed.
 tip=Vector((.2459563613,-.2180387229,.1798989326))
 hinge0=Vector((.15813,-.226,.13047))
 along=(hinge0-tip).normalized();side=along.cross(Vector((0,0,1))).normalized();up=side.cross(along).normalized()
 for v in o.data.vertices:
  q=v.co-tip;v.co=Vector((q.dot(side),q.dot(along),q.dot(up)))
 o.data.update()
 P=np.array([v.co[:] for v in o.data.vertices]);seed=int(np.argmin(np.linalg.norm(P,axis=1)))
 adj=[[] for _ in P]
 for e in o.data.edges:
  a,b=e.vertices;d=float(np.linalg.norm(P[a]-P[b]));adj[a].append((b,d));adj[b].append((a,d))
 D=np.full(len(P),1e9);D[seed]=0.;queue=[(0.,seed)]
 while queue:
  d,i=heapq.heappop(queue)
  if d>D[i]+1e-12:continue
  for j,l in adj[i]:
   if d+l<D[j]-1e-12:D[j]=d+l;heapq.heappush(queue,(d+l,j))
 end=int(np.argmax(np.where(D<1e8,D,-1)));length=D[end];points=[Vector(P[seed])]
 for u in np.linspace(.015,.985,70):
  mask=(D>length*(u-.009))&(D<length*(u+.009))
  if mask.sum()>2:points.append(Vector(np.median(P[mask],axis=0)))
 points.append(Vector(P[end]));return T.polyline(points)

def build(backup=False):
 raw=HERE/'askeptosaurus.preview.glb' if backup else HERE/'tripo-regenerated-2026-09-19/askeptosaurus.raw.glb'
 auth,intake=T.load_raw(str(raw),NAME+(' backup body' if backup else ' authored body'))
 albedo,lum,albedo_sha,skin=T.retain_albedo(auth,NAME+(' backup pigmentation' if backup else ' body pigmentation'),.7)
 skin.use_backface_culling=False
 frame=T.measure_frame(auth,True,lum)
 if backup:AP,AC=backup_axis(auth)
 P=np.array([v.co[:] for v in auth.data.vertices]);Y0,Y1=float(P[:,1].min()),float(P[:,1].max())
 bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:] for p in auth.data.polygons]);th=T.neighbourhood_minimum(auth.data,T.shell_thickness(auth.data,bvh))
 cx,cz,hw,hd,centre=T.measured_centreline(auth,th<(.025 if backup else .012),band=.009,smoothing=3)
 if backup:
  geo=AC[-1]
  # The mouth uses its own head frame, independent of the curled torso and tail.
  HY=np.linspace(-.005,.10,36);rows=[]
  for y in HY:
   q=P[(abs(P[:,1]-y)<.008)&(abs(P[:,0])<.055)&(abs(P[:,2])<.045)]
   rows.append([float(np.median(q[:,0])),float(np.median(q[:,2])),float((q[:,0].max()-q[:,0].min())/2),float((q[:,2].max()-q[:,2].min())/2)] if len(q)>3 else [0,0,.005,.005])
  H=np.array(rows)
  cx=lambda y:float(np.interp(y,HY,H[:,0]));cz=lambda y:float(np.interp(y,HY,H[:,1]));hw=lambda y:float(np.interp(y,HY,H[:,2]));hd=lambda y:float(np.interp(y,HY,H[:,3]))
 else:
  # Mild generated lateral drift is carried to a neutral centerline by axial translation only.
  # There is no overlap; unlike the rejected backup unbending this map is continuous everywhere.
  for v in auth.data.vertices:v.co.x-=cx(v.co.y);v.co.z-=cz(v.co.y)
  P=np.array([v.co[:] for v in auth.data.vertices]);cx,cz,hw,hd,centre=T.measured_centreline(auth,th<.012,band=.009,smoothing=3)
  AP,AC=T.polyline([Vector((0,Y0,0)),Vector((0,Y1,0))]);geo=AC[-1]
 clusters=T.thin_clusters(auth,th<(.025 if backup else .016),cx,cz,min_size=100)
 limb_candidates=[]
 for c in clusters:
  distances=[T.project(AP,AC,Vector(P[i])) for i in c['indices']]
  k=int(np.argmax([d[0] for d in distances]));root=int(np.argmin([d[0] for d in distances]))
  reach=distances[k][0]
  if reach<.10:continue
  c['tip']=P[c['indices'][k]].tolist();c['root']=P[c['indices'][root]].tolist();c['arc']=distances[root][1]
  limb_candidates.append(c)
 limb_candidates=sorted(limb_candidates,key=lambda c:c['count'],reverse=True)[:4]
 assert len(limb_candidates)==4,[(c['count'],c['arc']) for c in limb_candidates]
 limb_candidates.sort(key=lambda c:c['arc']);fore=limb_candidates[:2];hind=limb_candidates[2:]
 shoulder=float(np.mean([c['arc'] for c in fore]));hip=float(np.mean([c['arc'] for c in hind]))
 # Use fixed measured rostrum bounds, held well forward of the flexible neck.
 hinge=.072 if backup else Y0+.065;front=.001 if backup else Y0+.002
 lip_source=auth
 if backup:
  lip_source=auth.copy();lip_source.data=auth.data.copy()
  bm=bmesh.new();bm.from_mesh(lip_source.data)
  drop=[v for v in bm.verts if abs(v.co.x)>.055 or abs(v.co.z)>.055 or not -.02<v.co.y<.11]
  bmesh.ops.delete(bm,geom=drop,context='VERTS');bm.to_mesh(lip_source.data);bm.free()
 lip=T.albedo_mouth_line(lip_source,lum,front,hinge,cz,hd,stations=20)
 if backup:bpy.data.objects.remove(lip_source)
 assert len(lip)>8,len(lip)
 ly=np.array([r['y'] for r in lip]);lz=T.blur1d(np.array([r['mid'] for r in lip]),1.)
 def seam(y):return float(np.interp(y,ly,lz))
 skull_arc=T.project(AP,AC,Vector((cx(hinge),hinge,cz(hinge))))[1]
 B={};bone=lambda n,p,parent:B.update({n:(Vector(p),parent)})
 bone('root',(0,0,0),None);bone('body',at(AP,AC,(shoulder+hip)/2),'root');bone('chest',at(AP,AC,shoulder),'body')
 for i,n in enumerate(NECK):bone(n,at(AP,AC,shoulder-(shoulder-skull_arc)*(i+1)/5),'chest' if i==0 else NECK[i-1])
 bone('skull',at(AP,AC,skull_arc),NECK[-1]);bone('jaw',(cx(hinge),hinge,seam(hinge)),'skull')
 tailstations=np.linspace(hip,AC[-1]-.008,13)
 for i,n in enumerate(TAIL):bone(n,at(AP,AC,float(tailstations[i])),'body' if i==0 else TAIL[i-1])
 limb_defs={}
 for kind,cs in [('fore',fore),('hind',hind)]:
  # Signs are relative to the local body's tangent, essential for the curled backup.
  tangent=(at(AP,AC,cs[0]['arc']+.02)-at(AP,AC,cs[0]['arc']-.02)).normalized();side_axis=tangent.cross(Vector((0,0,1))).normalized()
  cs.sort(key=lambda c:(Vector(c['tip'])-at(AP,AC,c['arc'])).dot(side_axis))
  for side,c in zip(('L','R'),cs):
   centrept=at(AP,AC,c['arc']);root=centrept.lerp(Vector(c['root']),.65);tip=Vector(c['tip'])
   pts=[root,root.lerp(tip,.46),root.lerp(tip,.78),tip];names=[kind+'_'+part+'_'+side for part in ('upper','mid','tip')]
   for i,n in enumerate(names):bone(n,pts[i],('chest' if kind=='fore' else 'tail_00') if i==0 else names[i-1])
   PP,CC=T.polyline(pts);ds=[T.project(PP,CC,Vector(P[j]))[0] for j in c['indices']]
   limb_defs[kind+side]={'P':PP,'cum':CC,'names':names,'radius':float(np.quantile(ds,.995))+.003,'arc':c['arc']}
 tx=lambda p:Vector(p)*SCALE
 rig=K.build_armature(B,tx,NAME+' shared skeleton',NAME+'_Rig')
 stations=[('skull',skull_arc)]+[(n,T.project(AP,AC,B[n][0])[1]) for n in reversed(NECK)]+[('chest',shoulder),('body',(shoulder+hip)/2)]+[(n,float((tailstations[i]+tailstations[i+1])/2)) for i,n in enumerate(TAIL)]
 stations.sort(key=lambda kv:kv[1])
 def weights(p):
  d,s=T.project(AP,AC,p);w=dict(T.station_weights(stations,s))
  if front-.02<p.y<hinge+.003 and (not backup or (abs(p.x)<.07 and abs(p.z)<.06)):w={'skull':1.}
  best=0;chosen=None
  for item in limb_defs.values():
   dist,u=T.project(item['P'],item['cum'],p);radius=item['radius'];reach=item['cum'][-1]
   alpha=T.smooth((radius+.018-dist)/.018)*T.smooth(u/max(.025,reach*.20))
   if alpha>best:best=alpha;chosen=(item,u)
  if chosen and best>0:
   item,u=chosen;chain=T.limb_chain(item['names'],item['cum'],u,blend=.015)
   w={n:v*(1-best) for n,v in w.items()}
   for n,v in chain.items():w[n]=w.get(n,0)+v*best
  items=sorted(((n,v) for n,v in w.items() if v>1e-7),key=lambda nv:-nv[1])[:4];total=sum(v for n,v in items)
  return {n:v/total for n,v in items}
 objects=[auth];twin_report={}
 if not backup:
  twin,_,twin_report,_=T.build_twin(auth,th,NAME+' procedural volume twin',.0026,5500,albedo,blade_dilation=.001,thin=.016,band=.01)
  objects.append(twin)
 head_bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:] for p in auth.data.polygons])
 def room(y):
  return T.mouth_room(head_bvh,Vector((cx(y),y,seam(y))),Vector((1,0,0)),Vector((0,0,1)),limit=.08,fallback=.003)
 def section(y):
  w,up,down=room(y);return max(.0005,w*.84),max(.0005,up*.32),max(.0005,down*.32)
 oralmat=T.inward_material(NAME+' mouth interior',(.20,.075,.055,1))
 lining,lining_raw=T.lining('Oral cavity lining',rig,tx,seam,section,hinge-.0003,front+.001,lambda p:0,oralmat,centre_x=cx,room=room,fill=.86,rings=24,ring=12)
 parts={};groups=[];caps={}
 for o in objects:
  T.bisect_on_curve(o,seam,hinge,front-.004,margin=.012)
  T.split_part(o,'lower jaw',lambda c:front-.015<c.y<hinge and c.z<seam(c.y)-1e-7 and (not backup or (abs(c.x)<.055 and abs(c.z)<.055)),parts)
  jaw=parts['lower jaw'][o.name]
  assert len(jaw.data.polygons)>12,(o.name,len(jaw.data.polygons))
  caps[o.name]=T.cap_cut(o,lambda p:abs(p.y-hinge)<.00001,Vector((0,-1,0)))
  caps[jaw.name]=T.cap_cut(jaw,lambda p:abs(p.y-hinge)<.00001,Vector((0,1,0)))
  # A narrow rigid inner floor/roof occupies each jaw's own volume. The throat section itself
  # is capped above; there is no rubber membrane pulling from skull to jaw across the gape.
  influences=[];K.bind(o,rig,B,weights,tx,influences,passes=24)
  def jaw_weights(p):
   a=T.smooth((hinge-p.y)/.014)
   return {'skull':1-a,'jaw':a} if 0<a<1 else {'jaw' if a>=1 else 'skull':1.}
  K.bind(jaw,rig,B,jaw_weights,tx,influences,passes=0)
  # Duplicate posterior cut vertices must follow precisely the same bone weights in both
  # meshes. A cap alone blocks see-through but cannot keep a separately rigid jaw attached.
  tree=KDTree(len(o.data.vertices))
  for v in o.data.vertices:tree.insert(v.co,v.index)
  tree.balance()
  for v in jaw.data.vertices:
   if abs(v.co.y-hinge*SCALE)>1e-5:continue
   loc,idx,dist=tree.find(v.co)
   if dist>1e-5:continue
   for group in jaw.vertex_groups:group.remove([v.index])
   for weight in o.data.vertices[idx].groups:
    name=o.vertex_groups[weight.group].name
    jaw.vertex_groups[name].add([v.index],weight.weight,'REPLACE')
  groups.append([o,jaw,lining])
 anchorpts={'anchor_mouth':('jaw',(cx(front+.008),front+.008,seam(front+.008)-.002),'mouth'),
 'anchor_mouth_inside':('skull',(cx(hinge-.015),hinge-.015,seam(hinge-.015)),'swallow'),
 'anchor_attack_primary':('skull',(cx(front+.002),front+.002,seam(front+.002)),'attack')}
 anchors=[{'name':n,'bone':b,'point':list(tx(p)),'role':r} for n,(b,p,r) in anchorpts.items()]
 seams=animate(rig,backup);sockets=T.make_sockets(rig,anchors)
 tri=lambda o:sum(len(p.vertices)-2 for p in o.data.polygons)
 reports=[]
 for idx,group in enumerate(groups):
  suffix='.backup' if backup else '' if idx==0 else '.puppet'
  bpy.ops.object.select_all(action='DESELECT')
  for o in group+[rig]+sockets:o.select_set(True)
  bpy.context.view_layer.objects.active=rig;path=OUT/(ID+suffix+'.glb')
  bpy.ops.export_scene.gltf(filepath=str(path),**T.EXPORT_KWARGS);T.patch_glb(str(path),anchors)
  reports.append({'suffix':suffix,'triangles':sum(tri(o) for o in group)})
 report={'id':ID,'backup':backup,'intake':intake,'sourceAlbedoSha256':albedo_sha,'frame':frame,'bones':len(B),'boneNames':list(B),
 'limbs':{k:{'points':[list(p) for p in v['P']],'radius':v['radius']} for k,v in limb_defs.items()},
 'hipFraction':hip/AC[-1],'tailFraction':1-hip/AC[-1],'mouth':{'hingeY':hinge,'lip':lip,'throatCaps':caps,'maxGapeRadians':.29},
 'models':reports,'clips':CLIPS,'looping':LOOPS,'loopSeams':seams,'anchors':anchors,'maxInfluences':4,'rootStable':True,'noScaleChannels':True,**twin_report}
 if not backup:
  shutil.copyfile(OUT/(ID+'.puppet.glb'),OUT/(ID+'.lod1.glb'))
  profile,worst=T.paired_profile(groups[0],groups[1],(Y0+.01)*SCALE,(Y1-.01)*SCALE,.04*SCALE)
  dist=K.surface_distances(groups[0],groups[1]);assert max(dist)<.04*SCALE,max(dist)
  report['envelope']={'maximumEnvelopeDifference':worst,'surfaceDistanceMax':max(dist),'surfaceDistanceP95':float(np.quantile(dist,.95)),'envelopeTolerance':.04*SCALE}
  (HERE/(ID+'-profile.json')).write_text(json.dumps({'bodyLength':SCALE,'stations':profile,**report['envelope']},indent=2)+'\n')
  meta={'id':ID,'name':NAME,'species':'Askeptosaurus italicus','provenance':'Middle Triassic · Monte San Giorgio','description':'Slender thalattosaur with a long lateral swimming tail. Authored body and volume twin share one rig; original posed generation retained as an animated backup.','modelLength':SCALE,'lengthMeters':2.5,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':list(anchorpts),'puppet':ID+'.puppet.glb','sources':[str(raw.relative_to(ROOT)),'docs/triassic/canonical/askeptosaurus.png'],'notes':['The preserved backup has a pose-matched rest skeleton and the same public clip names.','Heavy and TailWhip strike with the long tail; Ability and Coil curl and recover. World turning is simulation-owned.','Living colours, soft tissues and movements are artistic reconstruction.']}
  (OUT/(ID+'.json')).write_text(json.dumps(meta,indent=2)+'\n');(HERE/'anchors.json').write_text(json.dumps({ID:anchors},indent=2)+'\n')
 (HERE/('backup-validation.json' if backup else 'validation.json')).write_text(json.dumps(report,indent=2)+'\n')
 bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/(ID+('-backup' if backup else '-paired')+'.blend')))
 print('ASKEPTOSAURUS_BUILD_OK',json.dumps({'backup':backup,'models':reports,'bones':len(B),'tailFraction':report['tailFraction']}))

build('--backup' in sys.argv)
