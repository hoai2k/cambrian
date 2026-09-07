"""Bespoke Gemuendina stuertzi reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.join(ROOT,'public/assets/devonian/creatures')
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/gemuendina')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='gemuendina';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-.72,.08));bone('jaw',(0,-1.17,.15),'skull');bone('throat',(0,-1.0,.08),'skull')
for i,y in enumerate([.65,1.3,1.95,2.55]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R'
 for k,y in enumerate([-.45,.20,.8]):
  bone('wing%d'%k+s,(side*.55,y,.015));bone('wingTip%d'%k+s,(side*1.25,y,.015),'wing%d'%k+s)
 bone('pelvic'+s,(side*.31,1.1,-.02),'tail0');bone('gill'+s,(side*.58,-.66,-.05),'skull')
bone('dorsal',(0,.34,.22));bone('dorsalRear',(0,1.80,.12),'tail1');bone('caudal',(0,2.75,.015),'tail3')
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
# A low tessellated head flows into a narrow trunk and long tapering tail.
# Pectoral fans emerge behind the short head: a rhenanid, not a modern ray disc.
sections=[(-1.66,.025,.018,.065),(-1.57,.31,.105,.055),(-1.35,.57,.155,.05),(-1.02,.68,.205,.015),(-.58,.67,.22,0),(-.05,.55,.18,0),(.52,.38,.145,0),(1.12,.23,.11,.005),(1.8,.125,.085,.01),(2.50,.065,.055,.02),(3.18,.008,.014,.026)]
def section(y):
 if y<=sections[0][0]:return np.array(sections[0][1:])
 for k in range(len(sections)-1):
  if sections[k][0]<=y<=sections[k+1][0]:
   a=np.array(sections[k]);b=np.array(sections[k+1]);t=(y-a[0])/(b[0]-a[0]);pre=np.array(sections[max(0,k-1)]);post=np.array(sections[min(len(sections)-1,k+2)])
   d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);p=(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1;return p[1:]
 return np.array(sections[-1][1:])
def bw(y):
 if y<-.73:return {'skull':1}
 if y<.65:return {'body':1}
 q=min(3,(y-.65)/.64);i=int(q);f=q-i
 return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<3 else {'tail3':1}
def pigment(p,ventral=False):
 if ventral:return (.28,.30,.235)
 n=noise.noise_vector(Vector(p)*3.9)[0];patch=max(0,sin(p[1]*8+noise.noise_vector(Vector(p)*2)[2]*4))**4
 return (.085+.037*n-.038*patch,.168+.046*n-.080*patch,.133+.034*n-.062*patch)
def surf(y,a):
 w,h,z=section(y);return Vector((w*cos(a),y,z+h*sin(a)))
# Actual top-facing oral aperture cut out from the continuous skin surface.
def in_mouth(x,y):return (x/.205)**2+((y+1.405)/.127)**2<1.02
rows=[]
for i in range(153):
 y=-1.66+4.84*i/152;rows.append([])
 for j in range(112):
  a=j*2*pi/112;p=surf(y,a);rows[-1].append(vertex(p,pigment(p,sin(a)<-.2),bw(y),(j/112,(y+1.66)*.5)))
for i in range(152):
 for j in range(112):
  js=(j+1)%112;ids=[rows[i][j],rows[i][js],rows[i+1][js],rows[i+1][j]];c=np.mean([V[k]for k in ids],axis=0)
  if c[2]>.05 and in_mouth(c[0],c[1]):continue
  face(ids)
face(reversed(rows[0]));face(rows[-1])
# Mouth surrounded by a shaped rim, recessed funnel and mobile posterior lower lip.
def mouthpoint(a,t):
 x=.207*(1-.76*t)*cos(a);y=-1.405+.13*(1-.76*t)*sin(a);w,h,z=section(y);top=z+h*math.sqrt(max(0,1-(x/w)**2))
 return Vector((x,y,top-.165*t+.011))
def mouthweight(a,t):
 jaw=max(0,sin(a))**2*(1-t);return {'jaw':jaw,'skull':1-jaw}
r=grid(15,64,lambda i,j:vertex(mouthpoint(2*pi*j/64,i/14),(.085-.045*i/14,.054-.025*i/14,.039-.020*i/14),mouthweight(2*pi*j/64,i/14),(j/64,i/14)),4,True);face(reversed(r[-1]),4)
pts=[mouthpoint(i*2*pi/64,0)for i in range(65)];tube(pts,[.022]*65,(.28,.28,.17),[mouthweight(i*2*pi/64,0)for i in range(65)],2,10)
# Small separated bony tesserae with faceted edge and gently domed crown.
# Shape projected onto body/fin, so mosaic follows the organic outline.
def tessera(center,rx,ry,project,w,col,rotation=0):
 cx,cy=center;outer=[];inner=[]
 for k in range(6):
  a=rotation+2*pi*k/6
  for scale,row in [(1,outer),(.74,inner)]:
   x=cx+rx*cos(a)*scale;y=cy+ry*sin(a)*scale;p=project(x,y);p.z+=.002 if scale==1 else .008;row.append(vertex(p,col,w,((x+2)/4,(y+2)/5)))
 mid=vertex(project(cx,cy)+Vector((0,0,.010)),np.array(col)*1.04,w,((cx+2)/4,(cy+2)/5))
 for k in range(6):face((outer[k],outer[(k+1)%6],inner[(k+1)%6],inner[k]),1);face((inner[k],inner[(k+1)%6],mid),1)
def bodyproject(x,y):
 w,h,z=section(y);return Vector((x,y,z+h*math.sqrt(max(.001,1-(x/w)**2))))
rng=np.random.default_rng(721)
for row,y in enumerate(np.arange(-1.49,2.89,.086)):
 w,h,z=section(y)
 for x in np.arange(-w*.86,w*.87,.092):
  x+=.026*(row%2);yy=y+rng.uniform(-.009,.009)
  if abs(x)>w*.88 or in_mouth(x,yy):continue
  if ((abs(x)-.345)/.155)**2+((yy+1.07)/.20)**2<1:continue
  radius=min(.047*rng.uniform(.86,1.04),max(0,w*.86-abs(x)))
  if radius<.009:continue
  p=bodyproject(x,yy);tessera((x,yy),radius,min(.045,w*.48),bodyproject,bw(yy),np.array(pigment(p))*rng.uniform(.99,1.23),rng.uniform(-.10,.10))
# Upward-looking dorsolateral eyes in low armoured orbital rims.
for s in [-1,1]:
 eye=Vector((s*.35,-1.075,.204));ell(eye,(.109,.137,.056),(.010,.020,.018),'skull')
 ring=[eye+Vector((.119*cos(i*2*pi/48),.151*sin(i*2*pi/48),-.006))for i in range(49)]
 tube(ring,[.021]*49,(.20,.27,.20),'skull',2,10)
 # Anterior paired nasal depressions, not a shark spiracle behind each eye.
 ell((s*.218,-1.262,.192),(.031,.043,.011),(.025,.052,.042),'skull',4)
 pts=[(s*(.565+.022*sin(t*pi)),-.72+.25*t,-.092-.015*sin(pi*t))for t in np.linspace(0,1,22)]
 tube(pts,[.014]*22,(.027,.055,.044),'gill'+('L'if s==1 else'R'),4,8)
# Closed pectoral fans. Longitudinal skeletal rows permit travelling undulation.
def edge(y):
 ys=[-.81,-.60,-.28,.12,.52,.88,1.22,1.38];xs=[.62,1.,1.43,1.74,1.74,1.43,.83,.27]
 for k in range(len(ys)-1):
  if y<=ys[k+1]:
   t=max(0,(y-ys[k])/(ys[k+1]-ys[k]));a=xs[k];b=xs[k+1];lo=max(0,k-1);hi=min(len(ys)-1,k+2)
   d0=(xs[k+1]-xs[lo])/(ys[k+1]-ys[lo])*(ys[k+1]-ys[k]);d1=(xs[hi]-xs[k])/(ys[hi]-ys[k])*(ys[k+1]-ys[k])
   return (2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1
 return xs[-1]
def rootx(y):return section(y)[0]*.88
def wingpoint(x,y):
 t=(abs(x)-rootx(y))/max(.001,edge(y)-rootx(y));return Vector((x,y,-.015+.045*sin(pi*max(0,min(1,t)))-.028*t))
def wingweights(y,t,s):
 suffix='L'if s==1 else'R';k=max(0,min(2,(y+.45)/.625));a=int(k);f=k-a;tip=max(0,min(1,(t-.37)/.63));w={}
 for j,q in [(a,1-f),(min(2,a+1),f)]:
  for name,v in [('wing%d'%j+suffix,q*(1-tip)),('wingTip%d'%j+suffix,q*tip)]:w[name]=w.get(name,0)+v
 return w
for s in [-1,1]:
 tops=[];bottoms=[]
 for side,rows in [(1,tops),(-1,bottoms)]:
  for i in range(69):
   y=-.81+2.19*i/68;rows.append([])
   for j in range(25):
    t=j/24;x=s*(rootx(y)+(edge(y)-rootx(y))*t);p=wingpoint(x,y);p.z+=side*.018*(.20+.80*sin(pi*t));col=pigment(p,side<0);rows[-1].append(vertex(p,col,wingweights(y,t,s),(t,y*.6)))
  for i in range(68):
   for j in range(24):face((rows[i][j],rows[i][j+1],rows[i+1][j+1],rows[i+1][j]),5)
 for i in range(68):face((tops[i][-1],bottoms[i][-1],bottoms[i+1][-1],tops[i+1][-1]),5)
 # Raised flexible edge; no sharp sting or serrated ray barb.
 pts=[wingpoint(s*edge(y),y)for y in np.linspace(-.81,1.38,90)]
 tube(pts,[.012]*90,(.24,.28,.17),[wingweights(y,1,s)for y in np.linspace(-.81,1.38,90)],2,8)
 # Visible delicate radiating struts, mostly hidden beneath the tessellated skin.
 for y in np.linspace(-.68,1.24,21):
  pts=[wingpoint(s*(rootx(y)+(edge(y)-rootx(y))*t),y)+Vector((0,0,.020))for t in np.linspace(.08,.98,19)]
  tube(pts,[.0055*(1-t)+.001 for t in np.linspace(.08,.98,19)],(.19,.25,.18),[wingweights(y,t,s)for t in np.linspace(.08,.98,19)],2,5)
 for row,y in enumerate(np.arange(-.68,1.28,.09)):
  for x in np.arange(rootx(y)+.045,edge(y)-.055,.097):
   x+=.026*(row%2)
   if x>edge(y)-.055:continue
   t=(x-rootx(y))/(edge(y)-rootx(y));p=wingpoint(s*x,y)
   project=lambda xx,yy:wingpoint(xx,yy)+Vector((0,0,.018))
   tessera((s*x,y),.046,.043,project,wingweights(y,t,s),np.array(pigment(p))*rng.uniform(1.02,1.24),.05)
# Posterior pelvic fans and restrained median fins preserve rhenanid anatomy.
def fin(origin,boundary,bone,vertical=False):
 origin=Vector(origin);control=list(map(Vector,boundary));boundary=[]
 for k in range(len(control)-1):
  a=control[k];b=control[k+1];prev=control[max(0,k-1)];post=control[min(len(control)-1,k+2)]
  for t in np.linspace(0,1,8,endpoint=False):boundary.append((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*(b-prev)*.4+(-2*t**3+3*t*t)*b+(t**3-t*t)*(post-a)*.4)
 boundary.append(control[-1]);normal=Vector((1,0,0))if vertical else Vector((0,0,1));N=len(boundary)
 for side in [-1,1]:
  grid(14,N,lambda i,j:vertex(origin.lerp(boundary[j],i/13)+normal*(side*.008*sin(pi*i/13)),(.14+.08*i/13,.23+.045*i/13,.19),bone,(j/(N-1),i/13)),5)
 for p in boundary[4:-1:8]:tube([origin.lerp(p,t)+normal*.009 for t in np.linspace(.05,1,15)],[.008*(1-t)+.001 for t in np.linspace(.05,1,15)],(.23,.27,.17),bone,2,6)
for s in [-1,1]:
 fin((s*.22,1.12,-.02),[(s*x,y,z)for x,y,z in[(.22,1.0,-.02),(.52,1.3,-.04),(.64,1.53,-.04),(.52,1.7,-.045),(.23,1.63,-.02)]],'pelvic'+('L'if s==1 else'R'))
fin((0,.3,.18),[(0,.09,.19),(0,.25,.52),(0,.37,.49),(0,.60,.21)],'dorsal',True)
tube([(0,.08,.18),(0,.18,.43),(0,.25,.52)],[.024,.016,.003],(.25,.27,.17),'dorsal',2,8)
fin((0,1.94,.07),[(0,1.66,.09),(0,1.84,.34),(0,2.02,.32),(0,2.27,.09)],'dorsalRear',True)
fin((0,2.73,.02),[(0,2.54,.06),(0,2.89,.24),(0,3.23,.42),(0,3.40,.39),(0,3.25,.17),(0,3.18,.02),(0,3.29,-.20),(0,3.13,-.24),(0,2.78,-.06)],'caudal',True)
# Texture is reproducible procedural micro-relief; neither a fossil observation nor scraped imagery.
normal=bpy.data.images.new('Gemuendina skin microrelief',width=512,height=512);yy,xx=np.mgrid[0:512,0:512]/512.;rng=np.random.default_rng(738);grain=rng.normal(size=(512,512));freq=np.fft.fftfreq(512);kernel=np.exp(-((freq[:,None]**2+freq[None,:]**2)*180));height=np.fft.ifft2(np.fft.fft2(grain)*kernel).real*.14;dy,dx=np.gradient(height);arr=np.stack((.5-dx*9,.5-dy*9,np.ones_like(dx),np.ones_like(dx)),axis=-1).astype(np.float32);normal.pixels.foreach_set(arr.ravel());normal.filepath_raw=os.path.join(HERE,'skin-normal.png');normal.file_format='PNG';normal.save();normal.colorspace_settings.name='Non-Color';normal.pack()
mats=[]
for name,rough,strength in [('body',.47,.28),('armour',.50,.4),('accent',.4,.24),('eyes',.18,0),('oral',.49,.10),('fins',.46,.20)]:
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
  amp={'Idle':.20,'Swim':1.0,'Eat':.38,'Guard':.24,'Dodge':1.3,'Ability':.55,'Growth':.32}.get(clip,.46)
  peak=sin(pi*(u-.24)/.4)**2 if .24<u<.64 else 0
  wind=sin(pi*u/.28)**2 if u<.28 else 0
  settle=sin(pi*(u-.64)/.36)**2 if u>.64 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.016*(1-cos(p*2))if loop else 0
  if clip=='Eat':opening=.19*(1-cos(p))
  if clip=='Bite':opening=.46*e
  if clip=='Attack':opening=.43*peak
  if clip=='Heavy':opening=.32*peak+.09*wind
  if clip=='Ability':opening=.34*e**.7
  if clip=='Growth':opening=.09*e
  opening+=.16*dead
  pb['jaw'].rotation_euler.x=-opening;pb['throat'].rotation_euler.x=opening*.12+.017*wave(.6,2)
  pb['skull'].rotation_euler.x=-opening*.10
  body=pb['body'];body.rotation_euler.y=.015*amp*wave(.4);body.rotation_euler.x=.02*amp*wave();body.location.z=.018*amp*wave(.2)
  if clip in ['TurnLeft','TurnRight']:body.rotation_euler.z=(-1 if clip=='TurnLeft'else 1)*.24*e;body.rotation_euler.y=(-1 if clip=='TurnLeft'else 1)*.12*e
  if clip in ['Dive','Rise']:body.rotation_euler.x=(1 if clip=='Dive'else-1)*.22*e;body.location.z=(-1 if clip=='Dive'else 1)*.10*e
  if clip=='Attack':body.location.z=-.045*wind+.19*peak;body.location.y=.04*wind-.09*peak;body.rotation_euler.x=.04*wind-.11*peak
  if clip=='Heavy':body.rotation_euler.x=.07*wind-.19*peak+.025*settle;body.location.z=-.06*wind+.24*peak;body.location.y=-.08*peak
  if clip=='Parry':body.rotation_euler.z=.17*e;body.rotation_euler.y=-.16*e
  if clip=='Guard':body.location.z=-.026*(1-cos(p));body.rotation_euler.x=.023*(1-cos(p))
  if clip=='Dodge':body.rotation_euler.y=.26*e;body.rotation_euler.z=-.28*e;body.location.x=.24*e
  if clip in ['Hit','Stagger']:body.rotation_euler.z=.13*e*sin(p*(1 if clip=='Hit'else 2));body.rotation_euler.y=.16*e;body.location.z=-.05*e
  if clip=='Ability':body.location.z=.16*e;body.rotation_euler.x=-.12*e
  if clip=='Growth':body.rotation_euler.x=-.045*e;body.location.z=.04*e
  body.rotation_euler.y+=.55*dead;body.location.z-=.10*dead
  for i in range(4):
   q=pb['tail%d'%i];q.rotation_euler.z=(.065+i*.028)*amp*wave(i*.66)+.11*dead*sin(i*.65)
   if clip=='Dodge':q.rotation_euler.z+=.18*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.08*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.065+i*.012)*e
  pb['caudal'].rotation_euler.z=.14*amp*wave(2.7)+.09*dead
  pb['dorsal'].rotation_euler.y=.035*amp*wave(1.6)+.20*dead
  pb['dorsalRear'].rotation_euler.y=.06*amp*wave(2.2)+.23*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R'
   for k in range(3):
    q=pb['wing%d'%k+suffix];tip=pb['wingTip%d'%k+suffix]
    # A wave travels front to rear through each fin; tips lag their proximal rays.
    q.rotation_euler.y=s*(.12*amp*wave(k*.9)+.12*dead)
    tip.rotation_euler.y=s*(.16*amp*wave(k*.9+.7)+.16*dead)
    q.rotation_euler.z=s*.018*amp*wave(k*.9+.3)
    if clip=='Guard':q.rotation_euler.y+=s*.13*(1-cos(p));tip.rotation_euler.y+=s*.12*(1-cos(p))
    if clip in ['Attack','Heavy']:q.rotation_euler.y+=s*(.12*wind-.22*peak+.06*settle);tip.rotation_euler.y+=s*(.15*wind-.18*peak)
    if clip=='Ability':q.rotation_euler.y-=s*.19*e;tip.rotation_euler.y-=s*.10*e
    if clip=='Dodge':q.rotation_euler.y+=s*(.28 if s==1 else-.14)*e
    if clip in ['TurnLeft','TurnRight']:q.rotation_euler.y+=s*(.15 if (s==1)==(clip=='TurnLeft')else-.06)*e
    if clip=='Growth':q.rotation_euler.y-=s*.16*e
   pb['pelvic'+suffix].rotation_euler.y=s*(.05*amp*wave(1.9)+.15*dead)
   pb['gill'+suffix].rotation_euler.z=s*(.075*opening+.02*wave(.4,2))
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
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-1.34,.205],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.405,.035],'role':'swallow'},{'name':'anchor_attack_primary','bone':'jaw','point':[0,-1.405,.205],'role':'attack'}]
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
sources=[{'title':'Wilkin (2023), The Hunsrück Slate Konservat-Lagerstätte','url':'https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426','doi':'10.1111/gto.12426'},{'title':'American Museum of Natural History, Gemuendina stuertzi specimen cast, ptc-5860','url':'https://digitalcollections.amnh.org/archive/Gemuendina-stuertzi--rhenanid-placoderm-from-the-Early-Devonian-of-Hunsruck--Budenbach--Germany--cast---about-400-million-years-old-2URM1THI7W9X.html'}]
notes=['Low body, broad pectoral fins, upward-directed eyes and oral opening reflect fossil morphology; small unfused armouring tesserae are differentiated from arthrodire shield plates.','Tail outline, fin thickness, pigmentation and exact soft oral tissues are reconstruction choices. No modern-ray sting, ventral mouth or spiracles have been added.','0.30 m is a representative reconstructed animal, not a claimed species maximum.','Animations visualize plausible fin undulation and upward feeding; compatibility action names do not define Devonian gameplay. Fine ray struts are inferred support structures, not individually fossil-mapped.']
meta={'id':ID,'name':'Gemuendina','species':'Gemuendina stuertzi','provenance':'Early Devonian (Emsian), Hunsrück Slate, Germany','description':'Low, broad rhenanid placoderm with a mosaic of small armour elements, undulating pectoral margins and upward-looking eyes and mouth.','lengthMeters':.30,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Studio and prescribed pose review.
world=bpy.data.worlds.new('Deep neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.033,.041,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size,color in [('Key',(3,-5,7),1300,5,(1,.89,.72)),('Fill',(-5,-2,3),900,5,(.53,.78,1)),('Rim',(1,5,5),1700,4,(.70,.89,1))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=5.8
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.45;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
cam.location=(6,-6,6.5);cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=72
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.5,'front'),('Bite',.5,'side'),('Heavy',.45,'threequarter'),('Ability',.5,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,2.1),'front':(0,-10,3),'threequarter':(6,-6,6.5)}[view];cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
print('GEMUENDINA_COMPLETE',json.dumps(report),flush=True)
