"""Bespoke Onychodus jandemarrai reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.abspath(os.path.join(ROOT,'../devonian-authoring/onychodus/v2-candidate'))
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/onychodus')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='onychodus';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-1.15,.02));bone('jaw',(0,-1.37,.04),'skull');bone('throat',(0,-1.10,-.22),'skull')
for i,y in enumerate([.15,.65,1.15,1.65,2.15,2.65]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R';bone('pectoral'+s,(side*.30,-.65,-.22));bone('pectoralTip'+s,(side*.60,-.20,-.35),'pectoral'+s);bone('pelvic'+s,(side*.22,1.2,-.21),'tail2');bone('gill'+s,(side*.25,-1.10,.10),'skull')
bone('dorsal',(0,.65,.43),'tail1');bone('dorsal2',(0,1.9,.25),'tail3');bone('anal',(0,1.62,-.25),'tail2');bone('caudal',(0,2.62,.16),'tail5')
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

for s in [-1,1]:bone('whorl'+('L'if s==1 else'R'),(s*.105,-2.14,.073),'jaw')

# Gogo Onychodus: oval trunk and deep, scaled, nearly diphycercal tail axis.
sections=[(-1.25,.425,.47,.02),(-.8,.45,.52,.015),(-.2,.435,.51,.008),(.4,.40,.47,.01),(1.,.33,.40,.015),(1.6,.26,.32,.025),(2.2,.20,.255,.035),(2.8,.13,.20,.045),(3.3,.065,.13,.052),(3.7,.022,.055,.06),(3.92,.002,.007,.062)]
def interpolate(rows,y):
 if y<=rows[0][0]:return np.array(rows[0][1:])
 for k in range(len(rows)-1):
  a=np.array(rows[k]);b=np.array(rows[k+1])
  if a[0]<=y<=b[0]:
   pre=np.array(rows[max(0,k-1)]);post=np.array(rows[min(len(rows)-1,k+2)]);t=(y-a[0])/(b[0]-a[0]);d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(rows[-1][1:])
def section(y):return interpolate(sections,y)
def surf(y,a,offset=0):
 w,h,z=section(y);return Vector(((w+offset)*cos(a),y,z+(h+offset)*sin(a)))
def bw(y,a=0):
 if y<-.95:return {'skull':1}
 if y<.15:return {'body':1}
 q=min(5,(y-.15)/.5);i=int(q);f=q-i;return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<5 else {'tail5':1}
def pigment(y,a):
 t=max(0,min(1,(sin(a)+.30)/1.15));t=t*t*(3-2*t);flank=math.exp(-((sin(a)-.03)/.40)**2);mottle=noise.noise_vector(Vector((y*2,cos(a)*3,sin(a)*3)))[0]*.022
 return tuple(max(.008,x+mottle)for x in(.29*(1-t)+.067*t+.05*flank,.23*(1-t)+.080*t+.018*flank,.13*(1-t)+.048*t))
def torso(i,j):
 y=-1.25+5.17*i/156;a=j*2*pi/80;return vertex(surf(y,a),pigment(y,a),bw(y),(j/80,(y+1.25)/5.17))
rows=grid(157,80,torso,0,True);face(rows[-1],0)
# Blunt rostrum with large lateral gape; an internally recessed palate accommodates
# the paired symphysial tusks. The braincase remains a closed solid above it.
HEAD=[(-2.5,.17,.075,.060,.08),(-2.4,.24,.20,.09,.08),(-2.15,.35,.30,.15,.10),(-1.85,.40,.39,.23,.08),(-1.55,.43,.46,.38,.04),(-1.25,.425,.47,.47,.02)]
def hd(y):return interpolate(HEAD,y)
def jw(y):
 q=max(0,min(1,(-1.25-y)/.13));return {'jaw':q,'skull':1-q}
def hp(y,a):
 w,up,lo,z=hd(y);return Vector((w*cos(a),y,z+(up if sin(a)>=0 else lo)*sin(a)))
for low in [False,True]:
 mi=7 if low else 6;surfaces=[]
 for inside in [False,True]:
  def hv(i,j):
   y=-2.5+1.25*i/72;a=(pi if low else 0)+pi*j/56;p=hp(y,a)
   if inside:
    if low:p.x*=.93;p.z+=.018*sin(a)*-1+.012
    else:
     p.x*=.92;w,up,lo,z=hd(y);q=max(0,min(1,(y+2.46)/.12));fossa=.205*q*q*(3-2*q)*math.exp(-((abs(p.x)-.105)/.075)**4-((y+2.15)/.31)**4)
     p.z=min(z+up-.018,z+.009+fossa-.035*sin(a))
   col= pigment(y,a)
   if inside:
    fade=max(0,min(1,(y+2.5)/(.04 if low else .12)));fade=fade*fade*(3-2*fade);col=tuple(c*(1-fade)+d*fade for c,d in zip(col,(.086,.039,.033)))
   if i<6:p.y-=.065*sin(pi*j/56)*(1-i/6)**2
   return vertex(p,col,jw(y)if low else'skull',(j/56,i/72),not inside)
  surfaces.append(grid(73,57,hv,mi))
 outer,inner=surfaces
 for i in range(72):
  for j in [0,56]:face((outer[i][j],outer[i+1][j],inner[i+1][j],inner[i][j]),mi)
 # Rounded rostral lip bridge; its surface turns continuously into the palate.
 front=[outer[0]]
 for step in range(1,9):
  t=step/9;row=[]
  for j in range(57):
   if j in (0,56):row.append(outer[0][j]);continue
   a=Vector(V[outer[0][j]]);b=Vector(V[inner[0][j]]);p=a.lerp(b,t);p.y-=.027*sin(pi*t)*sin(pi*j/56)
   col=tuple(C[outer[0][j]][k]*(1-t)+C[inner[0][j]][k]*t for k in range(3));row.append(vertex(p,col,jw(-2.5)if low else 'skull',(j/56,0),False))
  front.append(row)
 front.append(inner[0])
 for k in range(len(front)-1):
  for j in range(56):
   indices=list(dict.fromkeys((front[k][j],front[k+1][j],front[k+1][j+1],front[k][j+1])))
   if len(indices)>2:face(indices,mi)
 for j in range(56):face((outer[72][j],inner[72][j],inner[72][j+1],outer[72][j+1]),mi)
# Rear pharynx is a curved lumen, never a front-facing plug at the jaw hinge.
th=[]
for i in range(41):
 t=i/40;y=-1.28+.9*t;rad=.37*(1-.78*t);z=.005-.12*t
 th.append([vertex((rad*cos(j*2*pi/72),y,z+rad*.73*sin(j*2*pi/72)),(.060*(1-.4*t),.023,.025),'skull',(j/72,t),False)for j in range(72)])
for i in range(40):
 for j in range(72):face((th[i][j],th[i][(j+1)%72],th[i+1][(j+1)%72],th[i+1][j]),4)
face(th[-1],4)
# Marginal and inner palatal dentitions frame, but do not replace, the tusk whorls.
for side in [-1,1]:
 for low in [False,True]:
  for k,y in enumerate(np.linspace(-2.39,-1.40,22)):
   w,up,lo,z=hd(y);x=side*(w-.019);height=(.039+.030*sin(pi*k/21))*(.82+.25*sin(k*2.33)**2)
   base=Vector((x,y,z+(-.009 if low else .009)));pts=[base,base+Vector((-side*.003,.006,(-1 if not low else 1)*height*.40)),base+Vector((-side*.012,.025,(-1 if not low else 1)*height))]
   tube(pts,[.011,.007,.0007],(.56,.47,.28),jw(y)if low else'skull',2,9)
 for k,y in enumerate(np.linspace(-2.02,-1.46,13)):
  w,up,lo,z=hd(y);x=side*(w*.66);base=Vector((x,y,z-.015));tube([base,base+Vector((side*.003,.014,-.035)),base+Vector((-side*.009,.033,-.07))],[.010,.007,.0007],(.53,.43,.25),'skull',2,8)
 # Paired crescent cartilage platforms, each with four curved functional tusks.
 bn='whorl'+('L'if side==1 else'R');center=Vector((side*.105,-2.14,.073));steps=49;cr=[]
 for i in range(steps):
  a=-.68+1.75*i/(steps-1);c=center+Vector((0,-.21*cos(a),.11*sin(a)))
  cr.append([vertex(c+Vector((.026*cos(j*2*pi/16),0,.026*sin(j*2*pi/16))),(.13,.065,.045),bn,(i/(steps-1),j/16))for j in range(16)])
 for i in range(steps-1):
  for j in range(16):face((cr[i][j],cr[i][(j+1)%16],cr[i+1][(j+1)%16],cr[i+1][j]),4)
 face(cr[0],4);face(cr[-1],4)
 for k,a in enumerate([-.56,-.04,.46,.98]):
  base=center+Vector((0,-.21*cos(a),.11*sin(a)));h=[.15,.17,.16,.135][k];lean=[-.105,-.052,.006,.066][k]
  pts=[base+Vector((0,lean*(t*t-.20*t),h*t))for t in np.linspace(0,1,13)]
  tube(pts,[.022*(1-t)**.72+.0006 for t in np.linspace(0,1,13)],(.59,.49,.29),bn,2,13)
 # Deeply embedded dark globes, avoiding bright annular iris geometry.
 eye=Vector((side*.277,-2.13,.225));ell(eye,(.061,.085,.081),(.002,.004,.003),'skull')
 # Paired nasal openings lie lateral to the enlarged internasal tusk recesses.
 for y in [-2.38,-2.30]:
  p=hp(y,.74);p.x*=side;p-=Vector((side*.005,0,.005));ell(p,(.010,.017,.011),(.008,.016,.010),'skull',4)
 # Rhombic opercular cover follows the flank and is attached at its anterior edge.
 bn='gill'+('L'if side==1 else'R')
 def ov(i,j):
  t=i/28;v=j/40;a=-.84+2.10*v;length=.26+.27*sin(pi*v);y=-1.29+.10*sin(pi*v)+length*t;p=surf(y,a,.006+.005*sin(pi*t));p.x*=side
  return vertex(p,pigment(y,a),{bn:t*t*.85,'skull':1-t*t*.85},(v,t))
 grid(29,41,ov,1)
 # Sensory pore pattern stays fine and conforms to the skull.
 for k in range(18):
  y=-2.28+.05*k;p=hp(y,.35+.30*sin(k*.18));p.x*=side;p-=Vector((side*.003,0,.003));ell(p,(.004,.005,.004),(.035,.039,.02),'skull',4)

def fin(name,origin,boundary,base,tip=None,thickness=.012,rays=9):
 origin=Vector(origin);controls=list(map(Vector,boundary));boundary=[]
 for k in range(len(controls)-1):
  a,b=controls[k:k+2];pre=controls[max(0,k-1)];post=controls[min(len(controls)-1,k+2)]
  for t0 in np.linspace(0,1,7,endpoint=False):
   t=float(t0);boundary.append((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*(b-pre)*.35+(-2*t**3+3*t*t)*b+(t**3-t*t)*(post-a)*.35)
 boundary.append(controls[-1]);N=len(boundary);steps=12;normal=Vector((1,0,0))if max(p.x for p in boundary)-min(p.x for p in boundary)<.001 else Vector((0,0,1))
 def point(t,j):return origin.lerp(boundary[j],t)+normal*(thickness*sin(pi*t)*sin(pi*j/(N-1)))
 def weight(t,p=None):
  out={base:1-max(0,(t-.45)/.55),tip:max(0,(t-.45)/.55)}if tip else {base:1}
  if p is not None and name in ['pectoral','pelvic']:
   free=max(0,min(1,(t-.08)/.52));free=free*free*(3-2*free);out={k:v*free for k,v in out.items()}
   for k,v in bw(p.y).items():out[k]=out.get(k,0)+v*(1-free)
  if p is not None and name in ['dorsal','dorsal2','anal','caudal']:
   w,h,z=section(p.y);outside=max(0,abs(p.z-z)-h);free=min(1,outside/.13)
   out={k:v*free for k,v in out.items()}
   for k,v in bw(p.y).items():out[k]=out.get(k,0)+v*(1-free)
  return out
 rows=[]
 for side in [-1,1]:
  def fv(i,j):
   t=.002+.998*i/steps;p=point(t,j)+normal*(side*thickness*.4*(.15+.85*sin(pi*t)));root=np.array(pigment(origin.y,.30))*.70;distal=np.array((.07,.056,.028));stripe=.92+.08*cos(j/(N-1)*pi*rays*2);col=(root*(1-t*.72)+distal*t*.72)*stripe;return vertex(p,col,weight(t,p),(j/(N-1),t))
  rows.append(grid(steps+1,N,fv,5))
 # Close all membrane boundaries so reversed views retain outward normals.
 for j in range(N-1):
  face((rows[0][-1][j],rows[0][-1][j+1],rows[1][-1][j+1],rows[1][-1][j]),5)
  face((rows[0][0][j+1],rows[0][0][j],rows[1][0][j],rows[1][0][j+1]),5)
 for i in range(steps):
  face((rows[0][i][0],rows[0][i+1][0],rows[1][i+1][0],rows[1][i][0]),5)
  face((rows[0][i+1][-1],rows[0][i][-1],rows[1][i][-1],rows[1][i+1][-1]),5)

# Robust lobed paired fins; exact outlines are comparative reconstructions.
for side in [-1,1]:
 ss='L'if side==1 else'R'
 fin('pectoral',(side*.39,-.73,-.25),[(side*x,y,z)for x,y,z in[(.37,-.90,-.20),(.55,-.71,-.32),(.76,-.45,-.39),(.87,-.09,-.40),(.81,.14,-.38),(.61,.12,-.31),(.40,-.30,-.24)]],'pectoral'+ss,'pectoralTip'+ss,thickness=.049,rays=20)
 fin('pelvic',(side*.29,1.13,-.24),[(side*x,y,z)for x,y,z in[(.30,1.02,-.23),(.44,1.15,-.35),(.65,1.56,-.39),(.62,1.77,-.37),(.46,1.72,-.30),(.24,1.34,-.22)]],'pelvic'+ss,thickness=.035,rays=15)
# A separate first dorsal, long posterior second dorsal and long anal precede
# the nearly symmetrical caudal. There is no coelacanth epicaudal filament.
fin('dorsal',(0,.67,.39),[(0,.28,.46),(0,.45,.79),(0,.66,.96),(0,.87,.91),(0,1.08,.66),(0,1.27,.31)],'dorsal',thickness=.018,rays=25)
fin('dorsal2',(0,2.18,.24),[(0,1.65,.32),(0,1.90,.56),(0,2.26,.74),(0,2.60,.72),(0,2.90,.54),(0,3.10,.25),(0,2.84,.20)],'dorsal2',thickness=.015,rays=30)
fin('anal',(0,1.88,-.20),[(0,1.40,-.29),(0,1.72,-.52),(0,2.05,-.68),(0,2.42,-.66),(0,2.76,-.40),(0,2.84,-.16)],'anal',thickness=.017,rays=29)
fin('caudal',(0,3.12,.055),[(0,2.76,.19),(0,3.08,.49),(0,3.48,.69),(0,3.88,.47),(0,4.15,.08),(0,4.02,-.18),(0,3.69,-.48),(0,3.34,-.57),(0,3.05,-.36),(0,2.78,-.13)],'caudal',thickness=.016,rays=40)
# Original imagegen colour modulation, kept quiet beneath regional pigment.
swatch=bpy.data.images.load(os.path.join(HERE,'scale-source.png'),check_existing=True);swatch.scale(1024,1024)
raw=np.asarray(swatch.pixels[:],dtype=np.float32).reshape(1024,1024,4);modulation=np.ones_like(raw);grey=raw[:,:,:3].mean(2);modulation[:,:,:3]=np.clip(.85+.40*(raw[:,:,:3]-grey.mean()),.64,1.05)
albedo=bpy.data.images.new('Onychodus original scale pigment',width=1024,height=1024);albedo.pixels.foreach_set(modulation.ravel());albedo.filepath_raw=os.path.join(HERE,'scale-albedo.png');albedo.file_format='PNG';albedo.save();albedo.pack()
# Rounded overlapping scale margins and restrained granular enamel relief.
yy,xx=np.mgrid[0:1024,0:1024]/1024.;row=np.floor(yy*42);u=(xx*31+.5*(row%2))%1;v=(yy*42)%1;r=np.sqrt(((u-.5)/.55)**2+((v-.07)/.96)**2)
height=.020*np.exp(-((r-.91)/.055)**2)+.003*np.sin(xx*2*pi*143)*np.sin(yy*2*pi*117);dy,dx=np.gradient(height);arr=np.stack((.5-dx*5,.5-dy*5,np.ones_like(dx),np.ones_like(dx)),axis=-1).astype(np.float32)
normal=bpy.data.images.new('Onychodus rounded scale microrelief',width=1024,height=1024);normal.pixels.foreach_set(arr.ravel());normal.filepath_raw=os.path.join(HERE,'scale-normal.png');normal.file_format='PNG';normal.save();normal.colorspace_settings.name='Non-Color';normal.pack()
# Ray supports are buried normal-map relief, avoiding grazing-angle tube flicker.
fh=.023*np.cos(xx*2*pi*29)*np.sin(pi*yy)**.65+.003*np.sin(xx*2*pi*29)*np.cos(yy*2*pi*36)
fdy,fdx=np.gradient(fh);fa=np.stack((.5-fdx*4,.5-fdy*4,np.ones_like(fdx),np.ones_like(fdx)),axis=-1).astype(np.float32)
fin_normal=bpy.data.images.new('Onychodus fin ray relief',width=1024,height=1024);fin_normal.pixels.foreach_set(fa.ravel());fin_normal.filepath_raw=os.path.join(HERE,'fin-normal.png');fin_normal.file_format='PNG';fin_normal.save();fin_normal.colorspace_settings.name='Non-Color';fin_normal.pack()
mats=[]
for name,rough,strength in [('body',.48,.22),('body_detail',.43,.08),('accent',.37,0),('eyes',.18,0),('oral',.53,0),('fins',.52,.19),('head',.46,.06),('mandible',.47,.06)]:
 mat=bpy.data.materials.new(ID+' '+name);mat.use_nodes=True;n=mat.node_tree.nodes;links=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.19 if name=='eyes'else .025
 vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name=='body':
  tx=n.new('ShaderNodeTexImage');tx.image=albedo;mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tx.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
 if strength:
  tx=n.new('ShaderNodeTexImage');tx.image=fin_normal if name=='fins' else normal;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
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
  amp={'Idle':.22,'Swim':.87,'Eat':.19,'Guard':.14,'Dodge':1.48,'Ability':1.10}.get(clip,.28)
  peak=sin(pi*max(0,min(1,(u-.24)/.40)))**2 if .24<u<.64 else 0
  wind=sin(pi*min(1,u/.28))**2 if u<.28 else 0
  settle=sin(pi*max(0,min(1,(u-.62)/.38)))**2 if u>.62 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.022*wave(0,2)if loop else 0
  if clip=='Eat':opening=.10*(1-cos(p*2))
  if clip=='Bite':opening=.51*sin(pi*u)**3 # Rapid jaw opening with a firm close; no protrusible teleost mouth.
  if clip=='Attack':opening=.51*wind+.22*peak
  if clip=='Heavy':opening=.62*wind+.13*peak
  if clip=='Ability':opening=.09*e*(1+.5*sin(p*2))
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
   q=pb['tail%d'%i];q.rotation_euler.z=(.052+i*.014)*amp*wave(i*.57,2 if clip=='Swim'else 1)+.06*dead*sin(i*.7)
   if clip=='Dodge':q.rotation_euler.z+=.17*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.06*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.04+i*.008)*e
  pb['caudal'].rotation_euler.z=0 # Keep scaled caudal axis and membrane attached.
  pb['dorsal2'].rotation_euler.y=.035*amp*wave(2.3)+.08*dead
  # Whorl deployment is disputed even among the describing authors. Only a
  # restrained 4-degree interpreted adjustment accompanies jaw opening.
  for side in [-1,1]:pb['whorl'+('L'if side==1 else'R')].rotation_euler.x=-min(.07,opening*.14)
  pb['dorsal'].rotation_euler.y=.025*amp*wave(1.6)+.06*dead
  pb['anal'].rotation_euler.y=.045*amp*wave(2.0)+.09*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R';q=pb['pectoral'+suffix];q.rotation_euler.y=s*(.055*wave(.8,2)+.09*opening+.18*dead);q.rotation_euler.z=s*(.018*wave(.3,2)-.11*dead)
   if clip=='Guard':q.rotation_euler.y+=s*.10*(1-cos(p))
   if clip=='Ability':q.rotation_euler.y-=s*.12*e;q.rotation_euler.z-=s*.06*e
   if clip=='Dodge':q.rotation_euler.y+=s*(.24 if s==1 else-.12)*e
   if clip=='Heavy':q.rotation_euler.z+=s*(.05*wind-.06*peak)
   if clip=='Growth':q.rotation_euler.y-=s*.16*e
   pb['pectoralTip'+suffix].rotation_euler.y=s*(.105*wave(1.3+s*.14,2)+.14*dead)
   pb['pelvic'+suffix].rotation_euler.y=s*(.025*amp*wave(1.9)+.15*dead)
   pb['gill'+suffix].rotation_euler.z=s*(.080*opening+.033*(1-cos(p*2))*env)
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
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-2.48,.07],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.70,.055],'role':'swallow'},{'name':'anchor_attack_primary','bone':'jaw','point':[0,-2.46,.10],'role':'attack'}]
open(os.path.join(HERE,'anchors.json'),'w').write(json.dumps({ID:anchors},indent=2))
# Parent inverse equals inverse bind bone tail transform; matrix_world sets real anatomical world point.
sockets=[]
for a in anchors:
 socket=bpy.data.objects.new(a['name'],None);bpy.context.collection.objects.link(socket);socket.parent=rig;socket.parent_type='BONE';socket.parent_bone=a['bone'];socket.matrix_world.translation=Vector(a['point']);socket['cambrianAnchor']={'version':1,'role':a['role'],'parentBone':a['bone']};sockets.append(socket)
# Split by material before export (avoids Blender multi-material colour-index exporter regression).
bpy.ops.object.select_all(action='DESELECT');temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);temp.select_set(True);bpy.context.view_layer.objects.active=temp;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
for part in parts:
 bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=ID+' '+part.data.materials[0].name
 bm=bmesh.new();bm.from_mesh(part.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-9);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(part.data);bm.free()
 if part.data.materials[0].name.endswith('head'):
  bm=bmesh.new();bm.from_mesh(part.data);assert all(e.is_manifold for e in bm.edges),'Head envelope must close';bm.free()
rig.select_set(True)
for s in sockets:s.select_set(True)
bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.glb'),**kwargs)
fulltris=sum(sum(len(p.vertices)-2 for p in part.data.polygons)for part in parts)
for part in parts:
 mat=part.data.materials[0].copy();part.data.materials[0]=mat
 if mat.name.startswith(ID+' body') and not mat.name.startswith(ID+' body_detail'):
  layer=part.data.color_attributes['Color'];uv=part.data.uv_layers.active
  seen=set()
  for loop in part.data.loops:
   if loop.vertex_index in seen:continue
   seen.add(loop.vertex_index);u,v=uv.data[loop.index].uv;factor=modulation[int((v%1)*1023),int((u%1)*1023),:3];col=layer.data[loop.vertex_index].color;layer.data[loop.vertex_index].color=(*[col[k]*float(factor[k])for k in range(3)],col[3])
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 for link in list(links):
  if link.to_node==bs and link.to_socket.name in ['Base Color','Normal','Roughness']:links.remove(link)
 vc=next(n for n in nodes if n.bl_idname=='ShaderNodeVertexColor');links.new(vc.outputs['Color'],bs.inputs['Base Color'])
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

sources=[{'title':'Andrews et al. 2006, The structure of Onychodus jandemarrai, Gogo; anatomy and competing functional interpretations','url':'https://doi.org/10.1017/S0263593300001309'},{'title':'Campbell and Barwick 2006, illustrated Onychodontiform oral anatomy','url':'https://ijdb.ehu.eus/article/pdf/052125kc'}]
notes=['Gogo O. jandemarrai reconstruction; 1.5 m represents the proportional estimate in the original paper from an isolated large tusk, not a measured whole individual.','Paired anterior tusk platforms are distinct from marginal and palatal teeth. Motion of the whorls during feeding is disputed within Andrews et al.; the slight modeled adjustment is an interpretation, not an established mechanical cycle.','Incomplete fin outlines are comparative; the caudal is nearly diphycercal without an extended coelacanth filament. Pectoral mobility is deliberately restrained.','Living pigment, soft tissue thickness and animations are interpreted. Original material swatch is imagegen; surface anatomy is authored in Blender.']
meta={'id':ID,'name':'Onychodus','species':'Onychodus jandemarrai','provenance':'Late Devonian (Frasnian), Gogo Formation, Western Australia','description':'Robust lobe-finned fish with paired crescent-shaped lower-jaw tusk platforms, interleaved marginal and palatal teeth, oval scales, lobed fins and a nearly symmetrical deep tail.','lengthMeters':1.5,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
