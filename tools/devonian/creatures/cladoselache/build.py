"""Bespoke Cladoselache sp. reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.join(ROOT,'public/assets/devonian/creatures')
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/cladoselache')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='cladoselache';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-.9,.02));bone('jaw',(0,-1.22,-.13),'skull');bone('throat',(0,-1.02,-.18),'skull')
for i,y in enumerate([.15,.65,1.15,1.65,2.15,2.65]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R';bone('pectoral'+s,(side*.35,-.5,-.22));bone('pectoralTip'+s,(side*.92,-.12,-.30),'pectoral'+s);bone('pelvic'+s,(side*.22,1.2,-.21),'tail2');bone('gill'+s,(side*.38,-.94,-.04),'skull')
bone('dorsal',(0,-.11,.38),'body');bone('dorsalRear',(0,1.32,.28),'tail2');bone('caudal',(0,2.62,.02),'tail5')
def vertex(p,col,w,uv=(0,0),var=True):
 p=Vector(p);v=.87+.19*noise.noise_vector(p*5)[0]+.10*noise.noise_vector(p*27)[1] if var else 1
 # Irregular sparse mottling preserves the smooth-skinned silhouette.
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

# Independent fusiform Cladoselache body: blunt broad snout, large eyes, tapering keeled peduncle.
sections=[(-2.15,.195,.045,-.10),(-2.02,.28,.21,-.005),(-1.75,.365,.30,.025),(-1.35,.405,.355,.018),(-.85,.435,.39,0),(-.3,.43,.39,0),(.3,.39,.365,0),(.9,.305,.30,0),(1.5,.205,.215,.005),(2.1,.105,.125,.015),(2.65,.060,.10,.025),(2.94,.014,.060,.14)]
def section(y):
 if y<=sections[0][0]:return np.array(sections[0][1:])
 for k in range(len(sections)-1):
  if sections[k][0]<=y<=sections[k+1][0]:
   a=np.array(sections[k]);b=np.array(sections[k+1]);t=(y-a[0])/(b[0]-a[0]);pre=np.array(sections[max(0,k-1)]);post=np.array(sections[min(len(sections)-1,k+2)])
   d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(sections[-1][1:])
def surf(y,a,offset=0):
 w,h,z=section(y);return Vector(((w+offset)*cos(a),y,z+(h+offset)*sin(a)))
def bw(y,a=0):
 if y<-.75:
  jaw=max(0,min(1,-sin(a)*4))*max(0,min(1,(-y-1.3)/.7));return {'jaw':jaw,'skull':1-jaw}if jaw>0 else {'skull':1}
 if y<.15:return {'body':1}
 q=min(5,(y-.15)/.5);i=int(q);f=q-i
 return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<5 else {'tail5':1}
def pigment(y,a):
 top=(sin(a)+1)/2;t=max(0,min(1,(top-.22)/.56));t=t*t*(3-2*t)
 # Cool blue-green countershading; sparse soft mottling, no all-over shark denticle relief.
 saddle=max(0,cos(y*5.5+1.2*cos(a)))**8*t;band=math.exp(-((sin(a)+.03)/.17)**2)
 return (.39*(1-t)+.045*t-.008*saddle+.025*band,.46*(1-t)+.12*t-.014*saddle+.020*band,.44*(1-t)+.15*t-.014*saddle+.008*band)
def torso(i,j):
 y=-2.15+5.09*i/170;a=j*2*pi/88;return vertex(surf(y,a),pigment(y,a),bw(y,a),(j/88,(y+2.15)*.7))
rows=grid(171,88,torso,0,True);face(rows[-1],0)
# Recessed terminal opening with a continuous flexible jaw/throat transition.
def mouth(i,j):
 t=i/20;a=2*pi*j/88;p=Vector((.195*(1-.78*t)*cos(a),-2.151+.72*t,-.10+.045*(1-.60*t)*sin(a)))
 jaw=max(0,min(1,-sin(a)*4))*(1-t);return vertex(p,(.095-.07*t,.040-.025*t,.044-.030*t),{'jaw':jaw,'skull':1-jaw},(j/88,t))
oral=grid(21,88,mouth,4,True);face(reversed(oral[-1]),4)
for upper in [False,True]:
 aa=0 if upper else pi;pts=[surf(-2.151,aa+pi*i/64,.006)for i in range(65)]
 tube(pts,[.009]*65,(.25,.32,.29),[bw(-2.15,aa+pi*i/64)for i in range(65)],2,8)
# Small central cusps flanked by accessory cusplets (cladodont grasping dentition).
# No great-white triangular serrated blades.
for upper in [False,True]:
 bn='skull'if upper else'jaw';sign=-1 if upper else 1
 for side in [-1,1]:
  for i in range(7):
   t=(i+.5)/7;x=side*(.176-.10*t);y=-2.12+.33*t;z=-.10+(-sign)*.035
   base=Vector((x,y,z));height=.033+.012*sin(pi*t)
   for shift,mul in [(0,1),(-.018,.46),(.018,.46)]:
    p=base+Vector((0,shift,0));tip=p+Vector((-side*.008,.008,sign*height*mul));tube([p,p.lerp(tip,.45),tip],[.008*mul,.005*mul,.0006],(.58,.56,.43),bn,2,7)
# Eyes and orbit margins fitted into the broad lateral head.
for side in [-1,1]:
 eye=Vector((side*.335,-1.79,.12));ell(eye,(.078,.139,.139),(.002,.004,.005),'skull')
 ring=[eye+Vector((side*.025,.145*cos(i*2*pi/64),.143*sin(i*2*pi/64)))for i in range(65)]
 tube(ring,[.015]*65,(.13,.22,.22),'skull',2,8)
 # Nostrils close to front of head: dark recessed marks, not an operculum.
 p=Vector((side*.21,-2.018,.115));ell(p,(.025,.018,.012),(.007,.014,.014),'skull',4)
 # Five paired branchial slits; no modern bony gill cover.
 for k in range(5):
  pts=[];lips=[]
  for t in np.linspace(0,1,28):
   a=-.73+1.35*t;y=-1.17+.115*k+.035*sin(pi*t);p=surf(y,a,.006);p.x*=side;pts.append(p)
   q=surf(y+.012,a,.007);q.x*=side;lips.append(q)
  tube(pts,[.008*sin(pi*i/27)**.4+.002 for i in range(28)],(.016,.041,.040),'gill'+('L'if side==1 else'R'),4,7)
  tube(lips,[.004]*28,(.21,.31,.29),'gill'+('L'if side==1 else'R'),2,6)
 # Subtle lateral sensory line; no continuous field of large modern placoid scales.
 pts=[]
 for y in np.linspace(-.6,2.5,90):
  p=surf(y,.03,.003);p.x*=side;pts.append(p)
 tube(pts,[.0028]*90,(.19,.29,.28),[bw(p.y)for p in pts],2,5)
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
   t=.002+.998*i/steps;p=point(t,j)+normal*(side*thickness*.4*(.15+.85*sin(pi*t)));col=(.105-.055*t,.185-.075*t,.215-.085*t);return vertex(p,col,weight(t),(j/(N-1),t))
  rows.append(grid(steps+1,N,fv,5))
 # Close all membrane boundaries so reversed views retain outward normals.
 for j in range(N-1):
  face((rows[0][-1][j],rows[0][-1][j+1],rows[1][-1][j+1],rows[1][-1][j]),5)
  face((rows[0][0][j+1],rows[0][0][j],rows[1][0][j],rows[1][0][j+1]),5)
 for i in range(steps):
  face((rows[0][i][0],rows[0][i+1][0],rows[1][i+1][0],rows[1][i][0]),5)
  face((rows[0][i+1][-1],rows[0][i][-1],rows[1][i][-1],rows[1][i+1][-1]),5)
 for j in np.linspace(1,N-2,rays).astype(int):
  ts=np.linspace(.06,.97,17);pts=[point(t,j)+normal*(thickness*.53)for t in ts]
  tube(pts,[.0030*(1-t)+.0007 for t in ts],(.19,.29,.31),[weight(t)for t in ts],2,5)

for side in [-1,1]:
 ss='L'if side==1 else'R'
 fin('pectoral',(side*.34,-.51,-.20),[(side*x,y,z)for x,y,z in[(.35,-.72,-.20),(.77,-.48,-.25),(1.25,-.04,-.30),(1.48,.25,-.34),(1.40,.38,-.34),(1.08,.45,-.31),(.67,.37,-.24),(.34,.10,-.22)]],'pectoral'+ss,'pectoralTip'+ss,thickness=.017,rays=16)
 fin('pelvic',(side*.215,1.16,-.19),[(side*x,y,z)for x,y,z in[(.25,.99,-.20),(.53,1.19,-.28),(.68,1.53,-.29),(.61,1.63,-.29),(.36,1.58,-.25),(.19,1.39,-.18)]],'pelvic'+ss,thickness=.010,rays=9)
 # Wide horizontal peduncular keels taper into the tail stalk.
 fin('keel',(side*.069,2.4,.016),[(side*x,y,z)for x,y,z in[(.085,2.12,.015),(.20,2.45,.015),(.20,2.66,.015),(.06,2.88,.025)]],'tail5',thickness=.008,rays=3)
fin('dorsal',(0,.05,.37),[(0,-.31,.39),(0,-.12,.91),(0,.11,1.02),(0,.28,.86),(0,.66,.45),(0,.72,.345)],'dorsal',thickness=.014,rays=13)
fin('dorsalRear',(0,1.42,.26),[(0,1.05,.27),(0,1.20,.57),(0,1.40,.65),(0,1.62,.48),(0,1.86,.17)],'dorsalRear',thickness=.012,rays=9)
# Curved anterior spine supported by the comparative 2023 study; posterior spine omitted as hypothetical.
pts=[(0,-.31+.25*t*t,.395+.64*t)for t in np.linspace(0,1,32)]
tube(pts,[.038*(1-i/31)**.65+.001 for i in range(32)],(.20,.25,.20),'dorsal',2,12)
# Almost externally symmetrical crescent, with slightly longer dorsal lobe and heterocercal axis.
fin('caudal',(0,2.67,.02),[(0,2.59,.10),(0,2.87,.42),(0,3.45,1.11),(0,3.53,1.08),(0,3.24,.48),(0,3.04,.09),(0,3.10,-.22),(0,3.49,-.89),(0,3.40,-.92),(0,2.86,-.49),(0,2.59,-.06)],'caudal',thickness=.020,rays=20)
# Texture is reproducible procedural micro-relief; neither a fossil observation nor scraped imagery.
normal=bpy.data.images.new('Cladoselache skin microrelief',width=512,height=512);yy,xx=np.mgrid[0:512,0:512]/512.;rng=np.random.default_rng(616);grain=rng.normal(size=(512,512));freq=np.fft.fftfreq(512);kernel=np.exp(-((freq[:,None]**2+freq[None,:]**2)*180));height=np.fft.ifft2(np.fft.fft2(grain)*kernel).real*.14;dy,dx=np.gradient(height);arr=np.stack((.5-dx*9,.5-dy*9,np.ones_like(dx),np.ones_like(dx)),axis=-1).astype(np.float32);normal.pixels.foreach_set(arr.ravel());normal.filepath_raw=os.path.join(HERE,'skin-normal.png');normal.file_format='PNG';normal.save();normal.colorspace_settings.name='Non-Color';normal.pack()
mats=[]
for name,rough,strength in [('body',.39,.12),('body_detail',.48,.16),('accent',.4,.24),('eyes',.12,0),('oral',.49,.10),('fins',.42,.14)]:
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
  reset();u=f/last;p=2*pi*u;e=sin(pi*u)**2;loop=clip in LOOPS;env=1 if loop else e;pb=rig.pose.bones
  wave=lambda lag=0,freq=1:(sin(p*freq-lag)-sin(-lag))*env
  amp={'Idle':.32,'Swim':1.20,'Eat':.24,'Guard':.18,'Dodge':1.65,'Ability':.92}.get(clip,.28)
  peak=sin(pi*max(0,min(1,(u-.24)/.40)))**2 if .24<u<.64 else 0
  wind=sin(pi*min(1,u/.28))**2 if u<.28 else 0
  settle=sin(pi*max(0,min(1,(u-.62)/.38)))**2 if u>.62 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.022*wave(0,2)if loop else 0
  if clip=='Eat':opening=.10*(1-cos(p*2))
  if clip=='Bite':opening=.34*sin(pi*u)**3 # Quick cladodont grasp, rapid closure and recovery.
  if clip=='Attack':opening=.34*wind+.12*peak
  if clip=='Heavy':opening=.40*wind+.10*peak
  if clip=='Ability':opening=.17*e*(1+.7*sin(p*2))
  if clip=='Growth':opening=.065*e
  opening+=.10*dead
  pb['jaw'].rotation_euler.x=opening;pb['skull'].rotation_euler.x=-opening*.13
  pb['throat'].rotation_euler.x=opening*.32+.017*wave(.6,2)
  body=pb['body'];body.rotation_euler.y=.023*amp*wave(.4);body.rotation_euler.x=.012*amp*wave();body.location.z=.012*amp*wave(.2)
  if clip in ['TurnLeft','TurnRight']:body.rotation_euler.z=(-1 if clip=='TurnLeft'else 1)*.22*e;body.rotation_euler.y=(-1 if clip=='TurnLeft'else 1)*.13*e
  if clip in ['Dive','Rise']:body.rotation_euler.x=(1 if clip=='Dive'else-1)*.19*e
  if clip=='Attack':body.location.y=.08*wind-.18*peak;body.rotation_euler.x=.05*wind-.03*peak
  if clip=='Heavy':body.rotation_euler.z=-.08*wind+.15*peak-.025*settle;body.location.y=.05*wind-.11*peak
  if clip=='Parry':body.rotation_euler.z=.16*e;body.rotation_euler.y=-.13*e
  if clip=='Guard':body.rotation_euler.x=.04*(1-cos(p));body.rotation_euler.y=.025*sin(p)
  if clip=='Dodge':body.rotation_euler.y=.30*e;body.rotation_euler.z=-.27*e;body.location.x=.20*e
  if clip in ['Hit','Stagger']:
   body.rotation_euler.z=.11*e*sin(p*(1 if clip=='Hit'else 2));body.rotation_euler.y=.17*e;body.location.y=.08*e
  if clip=='Ability':body.rotation_euler.z=.18*e*sin(p*2);body.rotation_euler.x=-.065*e;body.location.y=-.09*e*(1+.35*sin(p*2))
  if clip=='Growth':body.rotation_euler.x=-.035*e;body.rotation_euler.y=.045*e
  body.rotation_euler.y+=.72*dead;body.rotation_euler.x+=.06*dead;body.location.z-=.10*dead
  for i in range(6):
   q=pb['tail%d'%i];q.rotation_euler.z=(.045+i*.016)*amp*wave(i*.50,2 if clip=='Swim'else 1)+.06*dead*sin(i*.7)
   if clip=='Dodge':q.rotation_euler.z+=.17*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.06*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.04+i*.008)*e
  pb['caudal'].rotation_euler.z=.10*amp*wave(2.9,2 if clip=='Swim'else 1)+.05*dead
  pb['dorsal'].rotation_euler.y=.025*amp*wave(1.6)+.06*dead
  pb['dorsalRear'].rotation_euler.y=.045*amp*wave(2.0)+.09*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R';q=pb['pectoral'+suffix];q.rotation_euler.y=s*(.035*wave(.8)+.06*opening+.11*dead);q.rotation_euler.z=s*(.022*wave(.3)-.11*dead)
   if clip=='Guard':q.rotation_euler.y+=s*.10*(1-cos(p))
   if clip=='Ability':q.rotation_euler.y-=s*.12*e;q.rotation_euler.z-=s*.06*e
   if clip=='Dodge':q.rotation_euler.y+=s*(.24 if s==1 else-.12)*e
   if clip=='Heavy':q.rotation_euler.z+=s*(.05*wind-.06*peak)
   if clip=='Growth':q.rotation_euler.y-=s*.16*e
   pb['pectoralTip'+suffix].rotation_euler.y=s*(.045*wave(1.3)+.10*dead)
   pb['pelvic'+suffix].rotation_euler.y=s*(.025*amp*wave(1.9)+.15*dead)
   pb['gill'+suffix].rotation_euler.z=s*(.065*opening+.022*wave(.4,2))
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
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-2.15,-.145],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.60,-.085],'role':'swallow'},{'name':'anchor_attack_primary','bone':'skull','point':[0,-2.13,-.065],'role':'attack'}]
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
sources=[{'title':'Frey et al. (2023), Broad snouted cladoselachian with sensory specialization; Cladoselache comparisons','url':'https://link.springer.com/article/10.1186/s13358-023-00266-6'}, {'title':'The Development of the Chimaeroid Pelvic Skeleton and the Evolution of Chondrichthyan Pelvic Fins (2022), Cladoselache kepleri NHMUK PV P9269','url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC9782884/'},{'title':'Case Western Reserve University Hyde Collection, Cleveland Shale Cladoselache specimens','url':'https://caslabs.case.edu/hyde-collection/historical-geology/'},{'title':'Cleveland Museum of Natural History casting program: complete Cladoselache CMNH5371','url':'https://gsa.confex.com/gsa/2006NC/webprogram/Paper103585.html'}]
notes=['Genus-level Cladoselache reconstruction of a representative 1.5 m individual, not a specimen scan or a species maximum. Body outline informed by Cleveland Shale material, pelvic anatomy by C. kepleri NHMUK PV P9269.','Broad triangular paired fins, large lateral eyes, blunt snout, terminal cladodont mouth and strongly forked tail distinguish this animal from a modern great-white shark.','The anterior dorsal spine follows the 2023 comparative study. A second dorsal spine remains hypothetical and is omitted. Fin radials appear as restrained membrane relief, not exposed bony rays.','Smooth skin with sparse authored sensory detail; a modern all-over placoid-scale coat is not claimed. Pigmentation, soft-tissue volume and every animation are artistic reconstruction.','Growth is a relaxed fin-extension/breathing display. Ability is a short acceleration and bank display; compatible clip labels do not define Devonian gameplay.']
meta={'id':ID,'name':'Cladoselache','species':'Cladoselache sp. (Cleveland Shale reconstruction)','provenance':'Late Devonian, Famennian Cleveland Shale, Ohio, USA','description':'Streamlined early chondrichthyan with a broad terminal mouth, large eyes, broad paired fins, a curved anterior dorsal spine and a keeled crescent tail.','lengthMeters':1.5,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Studio and prescribed pose review.
world=bpy.data.worlds.new('Deep neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.033,.041,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size,color in [('Key',(3,-5,7),1300,5,(1,.89,.72)),('Fill',(-5,-2,3),900,5,(.53,.78,1)),('Rim',(1,5,5),1700,4,(.70,.89,1)),('Lower bounce',(-2,2,-4),500,6,(.58,.78,.91))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=6.7
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
cam.location=(7,-6,4.2);cam.rotation_euler=(Vector((0,.65,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=72
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.125,'front'),('Bite',.5,'side'),('Heavy',.20,'threequarter'),('Ability',.38,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,1.2),'front':(0,-10,1),'threequarter':(7,-6,4.2)}[view];cam.rotation_euler=(Vector((0,.65,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
print('CLADOSELACHE_COMPLETE',json.dumps(report),flush=True)
