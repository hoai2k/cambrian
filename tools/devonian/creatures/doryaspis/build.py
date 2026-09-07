"""Bespoke Doryaspis nathorsti reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.join(ROOT,'public/assets/devonian/creatures')
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/doryaspis')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='doryaspis';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('shield',(0,-.5,0));bone('oral',(0,-1.30,.12),'shield')
for i,y in enumerate([.62,1.06,1.5,1.94,2.38]):bone('tail%d'%i,(0,y,-.03),'body' if i==0 else 'tail%d'%(i-1))
bone('caudal',(0,2.38,-.08),'tail4')
def vertex(p,col,w,uv=(0,0),var=True):
 p=Vector(p);v=.87+.19*noise.noise_vector(p*5)[0]+.10*noise.noise_vector(p*27)[1] if var else 1
 # Irregular small mottling with a faint warm lateral band, not scales pasted on armour.
 v*=1-.12*max(0,noise.noise_vector(p*13)[2])
 V.append(tuple(p));C.append(tuple(max(.001,min(.9,k*v))for k in col)+(1,));W.append({w:1}if isinstance(w,str)else w);U.append(uv);return len(V)-1
def face(f,m=0):F.append(tuple(f));M.append(m)
def grid(nr,nc,fn,m=0,wrap=False):
 ids=[[fn(i,j)for j in range(nc)]for i in range(nr)]
 for i in range(nr-1):
  for j in range(nc if wrap else nc-1):face((ids[i][j],ids[i][(j+1)%nc],ids[i+1][(j+1)%nc],ids[i+1][j]),m)
 return ids
def tube(pts,radii,col,w,m=0,sides=10):
 pts=list(map(Vector,pts));rows=[]
 for i,p in enumerate(pts):
  t=(pts[min(len(pts)-1,i+1)]-pts[max(0,i-1)]).normalized();a=t.cross(Vector((0,0,1)))
  if a.length<.001:a=t.cross(Vector((1,0,0)))
  a.normalize();b=t.cross(a);wi=w[i]if isinstance(w,list)else w
  rows.append([vertex(p+float(radii[i])*(a*cos(j*2*pi/sides)+b*sin(j*2*pi/sides)),col,wi,(j/sides,i/max(1,len(pts)-1)))for j in range(sides)])
 for i in range(len(rows)-1):
  for j in range(sides):face((rows[i][j],rows[i][(j+1)%sides],rows[i+1][(j+1)%sides],rows[i+1][j]),m)
 face(reversed(rows[0]),m);face(rows[-1],m)
def ell(c,scale,col,w,m=3):
 c=Vector(c)
 grid(17,32,lambda i,j:vertex(c+Vector((scale[0]*sin(pi*i/16)*cos(2*pi*j/32),scale[1]*sin(pi*i/16)*sin(2*pi*j/32),scale[2]*cos(pi*i/16))),col,w,(j/32,i/16),False),m,True)

# Flattened, rigid cephalic shield and tapering flexible posterior. No pectoral or pelvic fins.
sections=[(-1.36,.19,.046,.055),(-1.19,.43,.19,-.01),(-.92,.60,.25,-.04),(-.45,.69,.27,-.04),(0,.64,.25,-.04),(.48,.45,.21,-.03),(.72,.285,.175,-.035),(1.14,.22,.145,-.05),(1.64,.155,.117,-.07),(2.1,.095,.095,-.12),(2.48,.025,.054,-.25)]
def section(y):
 if y<=sections[0][0]:return np.array(sections[0][1:])
 for k in range(len(sections)-1):
  if sections[k][0]<=y<=sections[k+1][0]:
   a=np.array(sections[k]);b=np.array(sections[k+1]);t=(y-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);return (a*(1-t)+b*t)[1:]
 return np.array(sections[-1][1:])
def surf(y,a,offset=0):
 w,h,z=section(y);sn=sin(a);return Vector(((w+offset)*cos(a),y,z+(h+offset)*(sn*.72 if sn>0 else sn)))
def bw(y,a=0):
 if y<.60:return {'shield':1}
 q=max(0,min(4,(y-.62)/.44));i=int(q);f=q-i
 return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<4 else {'tail4':1}
def pigment(y,a):
 top=max(0,sin(a));saddle=max(0,sin(y*10+.7*cos(a)))**7 if y>.6 else 0
 return (.22-.16*top-.035*saddle,.205-.09*top-.045*saddle,.12-.067*top-.026*saddle)
def torso(i,j):
 y=-1.36+3.84*i/142;a=j*2*pi/88;return vertex(surf(y,a),pigment(y,a),bw(y,a),(j/88,(y+1.36)))
rows=grid(143,88,torso,0,True);face(rows[-1],0)
# Anterior, upward-facing shallow mouth above the long ventral projection. No teeth or hinged jaw.
def mouth(i,j):
 t=i/16;a=j*2*pi/72;p=Vector((.19*(1-.76*t)*cos(a),-1.361+.28*t-.035*sin(a),.055+.046*(1-.6*t)*sin(a)))
 return vertex(p,(.085-.053*t,.055-.034*t,.045-.026*t),{'oral':1-t,'shield':t},(j/72,t))
mouthrows=grid(17,72,mouth,4,True);face(reversed(mouthrows[-1]),4)
pts=[( .193*cos(a),-1.363-.035*sin(a),.055+.048*sin(a))for a in np.linspace(0,2*pi,73)]
tube(pts,[.008]*73,(.34,.265,.153),'oral',2,8)
# Dorsal plate subtle fitted raised border and concentric longitudinal ornament.
for aa in [.06,pi-.06]:
 pts=[surf(y,aa,.005)for y in np.linspace(-1.13,.52,60)]
 tube(pts,[.009]*60,(.12,.105,.060),'shield',4,6)
for k in range(29):
 x0=(k-14)/14
 pts=[]
 for t in np.linspace(0,1,61):
  y=-1.23+1.77*t;w,h,z=section(y);x=x0*w*.92;aa=math.acos(max(-1,min(1,x/w)));p=surf(y,aa,.006);p.z+=.003*sin(t*25+k);pts.append(p)
 tube(pts,[.004]*len(pts),(.15,.19,.105),'shield',1,6)
# Ventral shield ornament follows the bulged lower surface.
for k in range(13):
 a=pi+.20+(pi-.4)*k/12;pts=[surf(y,a,.005)for y in np.linspace(-1.13,.48,45)]
 tube(pts,[.0045]*45,(.35,.30,.20),'shield',1,5)
# Cornual plates: thick at attachment, flattened, lateral, gently recurved forward/down tips.
def cornu(side):
 rows=[]
 for i in range(45):
  t=i/44;x=side*(.46+1.40*t);cy=-.05-.26*t*t;z=-.055-.22*t**2
  half=.31*(1-t)**.70+.005;thick=.105*(1-t)**1.1+.004
  rows.append([vertex((x,cy+half*cos(a),z+thick*sin(a)),(.14+.05*t,.175+.025*t,.078+.012*t),'shield',(j/36,t))for j,a in enumerate(np.linspace(0,2*pi,36,endpoint=False))])
 for i in range(44):
  for j in range(36):face((rows[i][j],rows[i][(j+1)%36],rows[i+1][(j+1)%36],rows[i+1][j]),1)
 face(rows[-1],1)
 for k in range(7):
  a=.18+(pi-.36)*k/6;pts=[]
  for t in np.linspace(.05,.96,45):pts.append((side*(.46+1.4*t),-.05-.26*t*t+(.31*(1-t)**.70+.005)*cos(a),-.055-.22*t*t+(.105*(1-t)**1.1+.006)*sin(a)))
  tube(pts,[.0048]*len(pts),(.24,.235,.115),'shield',2,5)
 # Tiny edge tubercles, not a sawfish row of teeth.
 for t in np.linspace(.24,.92,24):
  p=Vector((side*(.46+1.40*t),-.05-.26*t*t-(.31*(1-t)**.70+.005),-.055-.22*t*t));q=p+Vector((side*.008,-.020,0))
  tube([p,p.lerp(q,.55),q],[.011,.009,.001],(.34,.265,.14),'shield',2,6)
for side in [-1,1]:cornu(side)
# Pseudorostrum grows continuously from the ventral anterior shield; it is fixed, not a sword jaw.
pts=[];radii=[]
for t in np.linspace(0,1,80):
 pts.append((0,-1.15-1.87*t,-.070-.07*t));radii.append(.115*(1-t)**.8+.009)
# Flattened oval cross section with a medial raised crest.
rows=[]
for i,p in enumerate(pts):
 t=i/(len(pts)-1);r=radii[i];rows.append([vertex(Vector(p)+Vector((r*cos(a),0,r*.39*sin(a))),(.34+.04*t,.26+.03*t,.12+.015*t),'shield',(j/32,t*3))for j,a in enumerate(np.linspace(0,2*pi,32,endpoint=False))])
for i in range(len(rows)-1):
 for j in range(32):face((rows[i][j],rows[i][(j+1)%32],rows[i+1][(j+1)%32],rows[i+1][j]),1)
face(rows[-1],1)
for side in [-1,1]:
 for t in np.linspace(.14,.92,31):
  r=.115*(1-t)**.8+.009;p=Vector((side*r,-1.15-1.87*t,-.07-.07*t));q=p+Vector((side*.018,.008,0));tube([p,p.lerp(q,.5),q],[.007,.006,.001],(.41,.30,.15),'shield',2,5)
# Small dorsal black eyes inset in thick orbit rims; one branchial opening on either side.
for side in [-1,1]:
 eye=Vector((side*.38,-1.05,.147));ell(eye,(.068,.08,.046),(.002,.004,.004),'shield')
 ring=[eye+Vector((.077*cos(a),.091*sin(a),.012))for a in np.linspace(0,2*pi,49)]
 tube(ring,[.010]*49,(.34,.275,.16),'shield',1,8)
 pts=[(side*.58,.21+.14*cos(a),-.015+.052*sin(a))for a in np.linspace(0,2*pi,43)]
 tube(pts,[.017]*43,(.10,.085,.055),'shield',4,8)
# Small lozenge scale relief only on flexible posterior, each scale follows local bone weights.
for iy,y in enumerate(np.linspace(.69,2.34,39)):
 for ia in range(20):
  a=2*pi*(ia+(iy%2)*.5)/20;w=bw(y);p=surf(y,a,.005);normal=Vector((cos(a),0,sin(a)));along=Vector((0,.027,0));across=Vector((-sin(a),0,cos(a)))*.022
  center=vertex(p+normal*.010,tuple(np.array(pigment(y,a))*1.2),w);rim=[vertex(q,tuple(np.array(pigment(y,a))*.95),w)for q in[p-along,p+across,p+along,p-across]]
  for j in range(4):face((center,rim[j],rim[(j+1)%4]),0)

def fin(name,origin,boundary,base,tip=None,thickness=.012,rays=9):
 origin=Vector(origin);controls=list(map(Vector,boundary));boundary=[]
 for k in range(len(controls)-1):
  a,b=controls[k:k+2];pre=controls[max(0,k-1)];post=controls[min(len(controls)-1,k+2)]
  for t0 in np.linspace(0,1,7,endpoint=False):
   t=float(t0);boundary.append((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*(b-pre)*.35+(-2*t**3+3*t*t)*b+(t**3-t*t)*(post-a)*.35)
 boundary.append(controls[-1]);N=len(boundary);steps=12;normal=Vector((1,0,0))if max(p.x for p in boundary)-min(p.x for p in boundary)<.001 else Vector((0,0,1))
 def point(t,j):return origin.lerp(boundary[j],t)+normal*(thickness*sin(pi*t)*sin(pi*j/(N-1)))
 def weight(t):return {base:1-max(0,(t-.45)/.55),tip:max(0,(t-.45)/.55)}if tip else {base:1}
 rows=[]
 for side in [-1,1]:
  def fv(i,j):
   t=i/steps;p=point(t,j)+normal*(side*thickness*.4*(.15+.85*sin(pi*t)));col=(.22-.09*t,.145-.06*t,.063-.014*t);return vertex(p,col,weight(t),(j/(N-1),t))
  rows.append(grid(steps+1,N,fv,5))
 for j in range(N-1):face((rows[0][-1][j],rows[0][-1][j+1],rows[1][-1][j+1],rows[1][-1][j]),5)
 for j in np.linspace(1,N-2,rays).astype(int):
  ts=np.linspace(.06,.97,17);pts=[point(t,j)+normal*(thickness*.53)for t in ts]
  tube(pts,[.0045*(1-t)+.0008 for t in ts],(.27,.19,.086),[weight(t)for t in ts],2,5)

fin('caudal',(0,2.23,-.12),[(0,2.10,.02),(0,2.45,.27),(0,2.91,.35),(0,2.80,.11),(0,2.69,-.08),(0,3.13,-.68),(0,3.03,-.76),(0,2.65,-.50),(0,2.30,-.23)],'caudal',thickness=.016,rays=17)

# Texture is reproducible procedural micro-relief; neither a fossil observation nor scraped imagery.
normal=bpy.data.images.new('Doryaspis skin microrelief',width=512,height=512);yy,xx=np.mgrid[0:512,0:512]/512.;rng=np.random.default_rng(616);grain=rng.normal(size=(512,512));freq=np.fft.fftfreq(512);kernel=np.exp(-((freq[:,None]**2+freq[None,:]**2)*180));height=np.fft.ifft2(np.fft.fft2(grain)*kernel).real*.14;dy,dx=np.gradient(height);arr=np.stack((.5-dx*9,.5-dy*9,np.ones_like(dx),np.ones_like(dx)),axis=-1).astype(np.float32);normal.pixels.foreach_set(arr.ravel());normal.filepath_raw=os.path.join(HERE,'skin-normal.png');normal.file_format='PNG';normal.save();normal.colorspace_settings.name='Non-Color';normal.pack()
mats=[]
for name,rough,strength in [('body',.47,.28),('armour',.50,.4),('accent',.4,.24),('eyes',.12,0),('oral',.49,.10),('fins',.50,.20)]:
 mat=bpy.data.materials.new(ID+' '+name);mat.use_nodes=True;n=mat.node_tree.nodes;links=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.13 if name=='eyes'else .04
 vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if strength:
  tx=n.new('ShaderNodeTexImage');tx.image=normal;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 mat.use_backface_culling=False;mats.append(mat)
mesh=bpy.data.meshes.new(ID+' contiguous anatomy');mesh.from_pydata(V,[],F);mesh.update();obj=bpy.data.objects.new(ID,mesh);bpy.context.collection.objects.link(obj)
for m in mats:mesh.materials.append(m)
for p,mi in zip(mesh.polygons,M):p.material_index=mi;p.use_smooth=True
col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(C,dtype=np.float32).ravel());uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.array([U[l.vertex_index]for l in mesh.loops],dtype=np.float32).ravel())
bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
arm=bpy.data.armatures.new(ID+' skeleton');rig=bpy.data.objects.new(ID+'_rig',arm);bpy.context.collection.objects.link(rig);obj.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,(h,t,p)in B.items():
 b=arm.edit_bones.new(n);b.head=h;b.tail=t
 if p:b.parent=arm.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')
groups={n:obj.vertex_groups.new(name=n)for n in B}
for i,w in enumerate(W):
 total=sum(w.values());assert abs(total-1)<1e-6
 for n,value in w.items():
  if value>0:groups[n].add([i],value,'REPLACE')
mod=obj.modifiers.new('Anatomical deformation','ARMATURE');mod.object=rig;obj.parent=rig
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
def reset():
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)

seams={};bounds={}
for clip,duration in CLIPS.items():
 a=bpy.data.actions.new(clip);a.use_fake_user=True;rig.animation_data.action=a;last=round(duration*30);first=None
 for f in range(last+1):
  reset();u=f/last;p=2*pi*u;e=sin(pi*u)**2;env=1 if clip in LOOPS else e;pb=rig.pose.bones
  wave=lambda lag=0,freq=1:(sin(p*freq-lag)-sin(-lag))*env
  amp={'Idle':.24,'Swim':1.12,'Eat':.20,'Guard':.14,'Dodge':1.65,'Ability':.90,'Growth':.32}.get(clip,.35)
  peak=sin(pi*(u-.25)/.40)**2 if .25<u<.65 else 0
  wind=sin(pi*u/.27)**2 if u<.27 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  amp*=1-dead
  b=pb['body'];b.rotation_euler.x=.012*amp*wave();b.rotation_euler.y=.018*amp*wave(.4);b.location.z=.014*amp*wave(.2)
  # Minimal oral membrane pulses, not movement of a lower jaw or rostrum.
  oral=.009*wave(0,2)
  if clip=='Eat':oral=.022*(1-cos(p*2))
  if clip=='Bite':oral=.042*e;b.rotation_euler.x=-.065*e
  if clip=='Attack':oral=.02*peak;b.location.y=.10*wind-.14*peak;b.rotation_euler.x=-.055*peak
  if clip=='Heavy':b.rotation_euler.z=-.08*wind+.16*peak;b.location.y=.075*wind-.09*peak;oral=.03*peak
  if clip in ['TurnLeft','TurnRight']:
   s=-1 if clip=='TurnLeft'else 1;b.rotation_euler.z=s*.24*e;b.rotation_euler.y=s*.14*e
  if clip in ['Dive','Rise']:b.rotation_euler.x=(1 if clip=='Dive'else -1)*.21*e
  if clip=='Guard':b.rotation_euler.x=.035*(1-cos(p));b.rotation_euler.y=.02*sin(p)
  if clip=='Parry':b.rotation_euler.y=-.22*e;b.rotation_euler.z=.13*e
  if clip=='Dodge':b.rotation_euler.y=.32*e;b.rotation_euler.z=-.26*e;b.location.x=.18*e
  if clip=='Hit':b.rotation_euler.y=.13*e;b.rotation_euler.z=.10*e*sin(p);b.location.y=.08*e
  if clip=='Stagger':b.rotation_euler.y=.19*e;b.rotation_euler.z=.14*e*sin(2*p);b.location.z=-.06*e
  if clip=='Ability':b.rotation_euler.x=-.14*e;b.rotation_euler.z=.11*e*sin(p);oral=.015*e
  if clip=='Growth':b.rotation_euler.x=-.06*e;b.rotation_euler.y=.06*e;oral=.01*e
  b.rotation_euler.y+=.90*dead;b.location.z-=.09*dead;b.rotation_euler.x+=.10*dead
  pb['oral'].rotation_euler.x=oral
  for i in range(5):
   q=pb['tail%d'%i];q.rotation_euler.z=(.06+i*.020)*amp*wave(i*.62);q.rotation_euler.x=.025*amp*wave(i*.60+.8)
   if clip=='Swim':q.rotation_euler.z*=.7+.3*cos(p*2)**2
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.035+i*.01)*e
   if clip in ['Dive','Rise']:q.rotation_euler.x+=(1 if clip=='Dive'else -1)*.025*(i+1)*e
   if clip=='Dodge':q.rotation_euler.z+=.11*e*sin(i*.6+.5)
   if clip=='Heavy':q.rotation_euler.z-=.075*peak
   if clip=='Growth':q.rotation_euler.x-=.019*e
   q.rotation_euler.z+=.07*dead*sin(i*.65+.4)
  pb['caudal'].rotation_euler.z=.09*amp*wave(3.1)+.07*dead;pb['caudal'].rotation_euler.x=.045*amp*wave(2.8)+.10*dead

  state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb])
  if f==0:first=state.copy()
  if f==last:seams[clip]=float(abs(state-first).max())
  for q in pb:
   if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
   if q.name=='body':q.keyframe_insert('location',frame=f)
 points=[]
 for f in [0,int(last*.25),int(last*.5),int(last*.75),last]:
  scene.frame_set(f);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.array([v.co[:]for v in me.vertices]);assert np.isfinite(co).all();points.extend([co.min(0),co.max(0)]);ev.to_mesh_clear()
 bounds[clip]=[np.array(points).min(0).tolist(),np.array(points).max(0).tolist()]
 rig.animation_data.action=None
for c in set(CLIPS)-{'Death'}:assert seams[c]<1e-6,(c,seams[c])
reset();scene.frame_set(0)
anchors=[{'name':'anchor_mouth','bone':'oral','point':[0,-1.355,.08],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'shield','point':[0,-1.20,.015],'role':'swallow'},{'name':'anchor_attack_primary','bone':'shield','point':[0,-1.40,-.03],'role':'attack'}]
open(os.path.join(HERE,'anchors.json'),'w').write(json.dumps({ID:anchors},indent=2))
# Parent inverse equals inverse bind bone tail transform; matrix_world sets real anatomical world point.
sockets=[]
for a in anchors:
 socket=bpy.data.objects.new(a['name'],None);bpy.context.collection.objects.link(socket);socket.parent=rig;socket.parent_type='BONE';socket.parent_bone=a['bone'];socket.matrix_world.translation=Vector(a['point']);socket['cambrianAnchor']={'version':1,'role':a['role'],'parentBone':a['bone']};sockets.append(socket)
# Split by material before export (avoids Blender multi-material colour-index exporter regression).
bpy.ops.object.select_all(action='DESELECT');temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);temp.select_set(True);bpy.context.view_layer.objects.active=temp;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
for part in parts:bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=ID+' '+part.data.materials[0].name
rig.select_set(True)
for s in sockets:s.select_set(True)
bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.glb'),**kwargs)
fulltris=sum(len(p.vertices)-2 for p in mesh.polygons)
for part in parts:
 bpy.context.view_layer.objects.active=part;de=part.modifiers.new('Reduced silhouette preserving topology','DECIMATE');de.ratio=.28;bpy.ops.object.modifier_move_up(modifier=de.name);bpy.ops.object.modifier_apply(modifier=de.name)
lodtris=sum(sum(len(p.vertices)-2 for p in part.data.polygons)for part in parts)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.lod1.glb'),**kwargs)
for part in parts:bpy.data.objects.remove(part,do_unlink=True)
# Resolve exact socket local transforms post-export from inverse exported parent world bind matrix.
def patch(path,lod=False):
 raw=open(path,'rb').read();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[20+n:];nodes=g['nodes'];parent={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
 from mathutils import Matrix,Quaternion
 def world(i):
  node=nodes[i]
  if 'matrix'in node:m=Matrix(np.array(node['matrix']).reshape(4,4).T.tolist())
  else:
   t=node.get('translation',[0,0,0]);q=node.get('rotation',[0,0,0,1]);s=node.get('scale',[1,1,1]);m=Matrix.LocRotScale(Vector(t),Quaternion((q[3],q[0],q[1],q[2])),Vector(s))
  return world(parent[i])@m if i in parent else m
 for a in anchors:
  i=next(i for i,n in enumerate(nodes)if n.get('name')==a['name']);b=next(i for i,n in enumerate(nodes)if n.get('name')==a['bone']);p=Vector((a['point'][0],a['point'][2],-a['point'][1]));local=world(b).inverted()@p
  if i in parent and i in nodes[parent[i]].get('children',[]):nodes[parent[i]]['children'].remove(i)
  nodes[b].setdefault('children',[]).append(i);nodes[i]={'name':a['name'],'translation':list(local),'extras':{'cambrianAnchor':{'version':1,'role':a['role'],'parentBone':a['bone']}}}
 for animation in g['animations']:
  kept=[]
  for channel in animation['channels']:
   target=channel['target'];name=nodes[target['node']].get('name');prop=target['path']
   if prop=='scale' or name=='root':
    acc=g['accessors'][animation['samplers'][channel['sampler']]['output']];view=g['bufferViews'][acc['bufferView']];count={'VEC3':3,'VEC4':4}[acc['type']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0);values=np.frombuffer(binary,dtype='<f4',count=acc['count']*count,offset=offset).reshape(-1,count)
    expected=np.array(nodes[target['node']].get(prop,[1,1,1]if prop=='scale'else[0,0,0,1]if prop=='rotation'else[0,0,0]));assert np.max(np.abs(values-expected))<1e-5,(name,prop,values)
   else:kept.append(channel)
  animation['channels']=kept
 if lod:g['animations']=[a for a in g['animations']if a['name']in ['Idle','Swim','Death']]
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);out=struct.pack('<III',0x46546c67,2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary;open(path,'wb').write(out);return g
full=patch(os.path.join(OUT,ID+'.glb'));lod=patch(os.path.join(OUT,ID+'.lod1.glb'),True)
for g in [full,lod]:
 assert len([n for n in g['nodes']if n.get('name','').startswith('anchor_')])==3
 for a in g['animations']:
  assert all(c['target']['path']!='scale'for c in a['channels'])
  assert all(g['nodes'][c['target']['node']].get('name')!='root'for c in a['channels'])
assert lodtris/fulltris<.4
sources=[{'title':'Pernègre (2002), genus revision and first complete caudal fin','url':'https://www.tandfonline.com/doi/abs/10.1671/0272-4634%282002%29022%5B0735%3ATGDWHF%5D2.0.CO%3B2'},{'title':'Botella et al. (2024), Delta wing design in earliest nektonic vertebrates','url':'https://www.nature.com/articles/s42003-024-06837-8'},{'title':'Purnell (2002), Feeding in extinct jawless heterostracan fishes','url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC1690863/'}]
notes=['Broad rigid flattened shield with fixed cornual plates, ventral pseudorostrum and hypocercal tail; no invented paired fins or hinged jaws.','Mouth lies above the pseudorostrum base, not at its tip. Oral soft tissue and opening depth are reconstruction choices.','Pseudorostrum function and diet remain uncertain. Bite/Eat are small oral pulses; Attack and Heavy are compatibility-labelled contact/withdrawal gestures, not evidence of predatory sword use.','Pigmentation, scale relief, precise soft tissues and motion are artistic inference. Representative length 0.20 m is an illustrative individual, not a maximum.','Only the posterior body and caudal fin generate locomotor flexion; fixed shield extensions do not flap. Growth is a relaxed trim and tail extension with no scaling.']
meta={'id':ID,'name':'Doryaspis','species':'Doryaspis nathorsti','provenance':'Early Devonian, Wood Bay Formation, Svalbard; coastal deposits with continental input','description':'Small jawless fish with a broad ridged shield, fixed lateral cornual extensions, a slender ventral pseudorostrum and a flexible downward-weighted tail.','lengthMeters':.20,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Studio and prescribed pose review.
world=bpy.data.worlds.new('Deep neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.033,.041,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size,color in [('Key',(3,-5,7),1300,5,(1,.89,.72)),('Fill',(-5,-2,3),900,5,(.53,.78,1)),('Rim',(1,5,5),1700,4,(.70,.89,1))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=7.7
scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
cam.location=(7,-6,4.2);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=72
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.5,'front'),('Bite',.5,'side'),('Heavy',.45,'threequarter'),('Ability',.5,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,1.2),'front':(0,-10,1),'threequarter':(7,-6,4.2)}[view];cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
print('DORYASPIS_COMPLETE',json.dumps(report),flush=True)
