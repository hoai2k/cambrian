"""Cheirolepis trailli V3: the reference-led redesign of the V2 body, Blender 5.2 standalone builder.

V2 is kept beside this untouched. Everything here is V2 except the shape tables the 8 September
reference reopened — the head profile, the eye, the five fin outlines and the fin-tip bone that
follows them — worked out in redesign-study.py and carried over exactly. See the README's
"Redesign sculpt study" section for what was taken from the reference and what was refused.
"""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.abspath(os.path.join(ROOT,'../devonian-authoring/cheirolepis/v3-candidate'))
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/cheirolepis')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='cheirolepis';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-.9,.02));bone('jaw',(0,-1.16,-.06),'skull');bone('throat',(0,-1.02,-.18),'skull')
for i,y in enumerate([.15,.65,1.15,1.65,2.15,2.65]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R';bone('pectoral'+s,(side*.30,-.65,-.22));bone('pectoralTip'+s,(side*.58,-.28,-.37),'pectoral'+s);bone('pelvic'+s,(side*.22,1.2,-.21),'tail2');bone('gill'+s,(side*.25,-1.10,.10),'skull')
bone('dorsal',(0,1.25,.27),'tail2');bone('anal',(0,1.42,-.23),'tail2');bone('caudal',(0,2.62,.16),'tail5')
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

# Scottish C. trailli: narrow fusiform trunk, large head, short-based median fins.
sections=[(-1.16,.32,.365,.035),(-.75,.35,.405,.035),(-.25,.34,.405,.025),(.30,.30,.365,.025),(.90,.245,.29,.03),(1.5,.18,.21,.04),(2.1,.105,.125,.065),(2.65,.054,.082,.14),(3.15,.027,.056,.38),(3.50,.004,.007,.59)]
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
 if y<-.80:return {'skull':1}
 if y<.15:return {'body':1}
 q=min(5,(y-.15)/.5);i=int(q);f=q-i
 return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<5 else {'tail5':1}
def pigment(y,a):
 t=(sin(a)+1)/2;t=max(0,min(1,(t-.2)/.7));t=t*t*(3-2*t)
 flank=math.exp(-((sin(a)-.05)/.33)**2);saddle=max(0,cos(y*7+.5*cos(a)))**4*t
 return (.41*(1-t)+.080*t+.13*flank-.025*saddle,.36*(1-t)+.135*t+.045*flank-.045*saddle,.20*(1-t)+.095*t-.012*saddle)
def torso(i,j):
 y=-1.16+4.66*i/140;a=j*2*pi/72;return vertex(surf(y,a),pigment(y,a),bw(y,a),(j/72,(y+1.16)/4.66))
rows=grid(141,72,torso,0,True);face(rows[-1],0)
# Fine scale relief and pigmentation are integrated UV surfaces, with no loose
# diamond islands. The scaled upper caudal axis remains part of the body loft.
# Upper and lower head shells meet at a genuine long lateral gape. Inner surfaces form
# a deep oral cavity, with a flexible membrane at the jaw hinge rather than a solid snout.
HEAD=[(-2.35,.042,.032,.030,.004),(-2.22,.122,.130,.078,.000),(-1.98,.222,.272,.150,-.014),(-1.70,.288,.360,.245,-.026),(-1.38,.312,.396,.312,-.030),(-1.16,.320,.400,.330,0)]
def hd(y):
 if y<=HEAD[0][0]:return np.array(HEAD[0][1:])
 for k in range(len(HEAD)-1):
  a=np.array(HEAD[k]);b=np.array(HEAD[k+1])
  if a[0]<=y<=b[0]:
   pre=np.array(HEAD[max(0,k-1)]);post=np.array(HEAD[min(len(HEAD)-1,k+2)]);t=(y-a[0])/(b[0]-a[0])
   d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0])
   return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(HEAD[-1][1:])
def jawWeight(y):
 q=max(0,min(1,(-1.16-y)/.15));return {'jaw':q,'skull':1-q}
def hp(y,a,inset=0):
 w,upper,lower,z=hd(y);ht=upper if sin(a)>=0 else lower
 return Vector(((w-inset)*cos(a),y,z+(ht-inset*.65)*sin(a)))
for low in [False,True]:
 shellrows=[];mi=7 if low else 6
 for inside in [False,True]:
  def hv(i,j):
   y=-2.35+1.19*i/64;a=(pi if low else 0)+pi*j/48;p=hp(y,a)
   if inside:
    # A true palate under the cranial volume, and a separate mandibular floor.
    # The mouth is not an inset duplicate that hollows out the entire braincase.
    if low:p=hp(y,a,.014);p.z+=.010
    else:
     w,upper,lower,z=hd(y);p.x*=.91;p.z=z-.011-.022*sin(a)
   col=(.080,.035,.027) if inside else pigment(y,a)
   return vertex(p,col,jawWeight(y) if low else 'skull',(j/48,i/64))
  shellrows.append(grid(65,49,hv,mi))
 outer,inner=shellrows
 for i in range(64):
  for j in [0,48]:face((outer[i][j],outer[i+1][j],inner[i+1][j],inner[i][j]),mi)
 for j in range(48):
  for i in [0,64]:face((outer[i][j],inner[i][j],inner[i][j+1],outer[i][j+1]),mi)
# Continuous deeper pharyngeal passage extends behind the separate closed jaws.
# Its near ring is inside the rear oral margins, never a cap across the gape.
throatrows=[]
for i in range(38):
 t=i/37;y=-1.19+.88*t;rad=.28*(1-.77*t);z=.015-.08*t
 throatrows.append([vertex((rad*cos(j*2*pi/64),y,z+rad*.80*sin(j*2*pi/64)),(.065*(1-.45*t),.027*(1-.4*t),.026*(1-.35*t)),{'skull':1},(j/64,t)) for j in range(64)])
for i in range(37):
 for j in range(64):face((throatrows[i][j],throatrows[i][(j+1)%64],throatrows[i+1][(j+1)%64],throatrows[i+1][j]),4)
face(throatrows[-1],4)
# Conical marginal teeth, decreasing posteriorly. The size and exact soft-tissue display
# are artistic; no modern serrations, crushing pavement, or giant exposed tusks.
for low in [False,True]:
 for side in [-1,1]:
  for k,y in enumerate(np.linspace(-2.26,-1.29,23)):
   x=side*(hd(y)[0]-.022);z=hd(y)[3]+(-.009 if low else .009);height=(.031+.020*sin(pi*k/22))*(.88+.16*sin(k*2.37)**2+.10*cos(k*.73)**2)
   tip=Vector((x-side*.012,y+.012,z+(height if low else-height)))
   tube([(x,y,z),Vector((x,y,z)).lerp(tip,.45),tip],[.009,.005,.0007],(.61,.57,.38),jawWeight(y)if low else'skull',2,7)
# Complete globes seated in the continuous cranial tissue; no applied orbital hoop.
for side in [-1,1]:
 eye=Vector((side*.130,-2.05,.110));ell(eye,(.052,.086,.078),(.002,.004,.003),'skull')
 nostril=Vector((side*.092,-2.20,.104));ell(nostril,(.012,.020,.010),(.006,.014,.009),'skull',4)
 # Mobile posterior gill cover follows the contour of the body, clear of pectoral bases.
 bn='gill'+('L'if side==1 else'R');nrow=25;ncol=32
 def op(i,j):
  t=i/(nrow-1);a=-.77+2.02*j/(ncol-1);y=-1.19+(.34+.13*sin(pi*j/(ncol-1)))*t+.035*sin(pi*j/(ncol-1));p=surf(y,a,.006+.006*sin(pi*t));p.x*=side
  return vertex(p,np.array(pigment(y,a))*(.94+.04*sin(t*pi)),{bn:t*t,'skull':1-t*t},(j/(ncol-1),t))
 grid(nrow,ncol,op,1)
 edge=[]
 for t in np.linspace(0,1,45):
  a=-.77+2.02*t;y=-.85+.165*sin(pi*t);p=surf(y,a,.008);p.x*=side;edge.append(p)
 tube(edge,[.0025]*45,(.034,.064,.033),bn,4,7)
 # Subtle sensory line and discrete small pores along the flank.
 pts=[]
 for y in np.linspace(-.64,2.8,100):
  p=surf(y,.08,.005);p.x*=side;pts.append(p)
 tube(pts,[.0011]*100,(.23,.25,.11),[bw(p.y)for p in pts],2,5)
 for k in range(13):
  y=-1.95+.050*k;a=.53+.20*sin(k*.35);p=hp(y,a,.0);p.x*=side
  ell(p,(.004,.006,.006),(.034,.050,.022),'skull',4)
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
  if p is not None and name in ['dorsal','anal','caudal']:
   w,h,z=section(p.y);outside=max(0,abs(p.z-z)-h);free=min(1,outside/.13)
   out={k:v*free for k,v in out.items()}
   for k,v in bw(p.y).items():out[k]=out.get(k,0)+v*(1-free)
  return out
 rows=[]
 for side in [-1,1]:
  def fv(i,j):
   t=.002+.998*i/steps;p=point(t,j)+normal*(side*thickness*.4*(.15+.85*sin(pi*t)));root=np.array(pigment(origin.y,.30))*.70;distal=np.array((.055,.075,.036));stripe=.92+.08*cos(j/(N-1)*pi*rays*2);col=(root*(1-t*.72)+distal*t*.72)*stripe;return vertex(p,col,weight(t,p),(j/(N-1),t))
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
  for seg in range(10):
   ts0=np.linspace(.06+seg*.087,.06+seg*.087+.081,4);points=[point(t,j)+normal*(thickness*.53)for t in ts0]
   tube(points,[.0010*(1-t)+.00035 for t in ts0],(.34,.285,.14),[weight(t,point(t,j))for t in ts0],2,5)

# Paired ray fans have compact insertion bases; the fins are not shark wings.
for side in [-1,1]:
 ss='L'if side==1 else'R'
 fin('pectoral',(side*.29,-.67,-.22),[(side*x,y,z)for x,y,z in[(.26,-.80,-.16),(.52,-.70,-.31),(.74,-.44,-.42),(.80,-.10,-.45),(.72,.16,-.42),(.52,.30,-.34),(.36,.13,-.26),(.25,-.20,-.21)]],'pectoral'+ss,'pectoralTip'+ss,thickness=.010,rays=20)
 fin('pelvic',(side*.215,.87,-.19),[(side*x,y,z)for x,y,z in[(.22,.74,-.20),(.44,.96,-.36),(.55,1.28,-.44),(.50,1.52,-.40),(.33,1.56,-.29),(.22,1.24,-.21),(.18,1.08,-.19)]],'pelvic'+ss,thickness=.008,rays=13)
# One posterior dorsal with a short base, paired visually with the anal fin.
fin('dorsal',(0,1.29,.27),[(0,1.00,.29),(0,1.06,.56),(0,1.17,.84),(0,1.28,.92),(0,1.45,.74),(0,1.66,.46),(0,1.86,.22)],'dorsal',thickness=.012,rays=24)
fin('anal',(0,1.50,-.16),[(0,1.25,-.19),(0,1.31,-.44),(0,1.42,-.66),(0,1.55,-.72),(0,1.72,-.56),(0,1.93,-.29),(0,2.03,-.09)],'anal',thickness=.010,rays=19)
# The scaled axial lobe is strongly extended upwards; a broad ventral ray fan originates
# below it. Still epicercal — the sources fix that, not the reference — but both lobes are
# drawn to points and the notch between them cut deeper.
fin('caudal',(0,2.52,.07),[(0,2.42,.10),(0,2.92,.34),(0,3.44,.64),(0,3.60,.66),(0,3.40,.38),(0,3.12,.10),(0,2.96,-.06),(0,3.10,-.36),(0,3.12,-.62),(0,2.96,-.66),(0,2.72,-.40),(0,2.46,-.11)],'caudal',thickness=.012,rays=31)
# Distinct leading-edge fulcra along the caudal axis, kept minute and flush.
for k,y in enumerate(np.linspace(2.26,3.40,24)):
 p=surf(y,pi/2,.007);tube([p+Vector((0,-.026,-.003)),p+Vector((0,.018,.018)),p+Vector((0,.034,.003))],[.007,.006,.001],(.30,.30,.14),'tail5',2,6)
# Repeatable diamond enamel micro-normal (authored, not sampled from a fossil).
normal=bpy.data.images.new('Cheirolepis fine ganoine scale relief',width=1024,height=1024)
yy,xx=np.mgrid[0:1024,0:1024]/1024.;a=(xx*42+yy*53)%1;b=(xx*42-yy*53)%1
edge=(np.exp(-((a-.50)/.11)**2)+np.exp(-((b-.50)/.11)**2));height=.08*edge+.015*np.sin(xx*2*pi*143)*np.sin(yy*2*pi*117)
dy,dx=np.gradient(height);arr=np.stack((.5-dx*7,.5-dy*7,np.ones_like(dx),np.ones_like(dx)),axis=-1).astype(np.float32)
normal.pixels.foreach_set(arr.ravel());normal.filepath_raw=os.path.join(HERE,'scale-normal-v2.png');normal.file_format='PNG';normal.save();normal.colorspace_settings.name='Non-Color';normal.pack()
# Original imagegen swatch supplies restrained enamel pigmentation. Anatomical
# diamond spacing remains the authored micro-normal, rather than large shingled plates.
swatch=bpy.data.images.load(os.path.join(HERE,'ganoine-source-v2.png'),check_existing=True)
swatch.scale(1024,1024);raw=np.asarray(swatch.pixels[:],dtype=np.float32).reshape(1024,1024,4)
modulation=np.ones_like(raw);grey=raw[:,:,:3].mean(2);modulation[:,:,:3]=np.clip(.91+.18*(raw[:,:,:3]-grey.mean()),.82,1)
albedo=bpy.data.images.new('Cheirolepis enamel modulation',width=1024,height=1024);albedo.pixels.foreach_set(modulation.ravel());albedo.filepath_raw=os.path.join(HERE,'ganoine-albedo-v2.png');albedo.file_format='PNG';albedo.save();albedo.pack()
mats=[]
for name,rough,strength in [('body',.42,.20),('body_detail',.36,.10),('accent',.39,.07),('eyes',.17,0),('oral',.51,0),('fins',.53,0),('head',.44,0),('mandible',.45,0)]:
 mat=bpy.data.materials.new(ID+' '+name);mat.use_nodes=True;n=mat.node_tree.nodes;links=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.20 if name=='eyes'else .025
 vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name=='body':
  tx=n.new('ShaderNodeTexImage');tx.image=albedo;mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tx.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
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
  amp={'Idle':.38,'Swim':1.13,'Eat':.21,'Guard':.16,'Dodge':1.62,'Ability':1.20}.get(clip,.28)
  peak=sin(pi*max(0,min(1,(u-.24)/.40)))**2 if .24<u<.64 else 0
  wind=sin(pi*min(1,u/.28))**2 if u<.28 else 0
  settle=sin(pi*max(0,min(1,(u-.62)/.38)))**2 if u>.62 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.022*wave(0,2)if loop else 0
  if clip=='Eat':opening=.10*(1-cos(p*2))
  if clip=='Bite':opening=.40*sin(pi*u)**3 # Rapid jaw opening with a firm close; no protrusible teleost mouth.
  if clip=='Attack':opening=.40*wind+.14*peak
  if clip=='Heavy':opening=.48*wind+.08*peak
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
   q=pb['tail%d'%i];q.rotation_euler.z=(.052+i*.014)*amp*wave(i*.57,3 if clip=='Swim'else 1)+.06*dead*sin(i*.7)
   if clip=='Dodge':q.rotation_euler.z+=.17*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.06*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.04+i*.008)*e
  pb['caudal'].rotation_euler.z=0 # Scaled axial lobe and ray fan remain continuous under tail5.
  pb['dorsal'].rotation_euler.y=.025*amp*wave(1.6)+.06*dead
  pb['anal'].rotation_euler.y=.045*amp*wave(2.0)+.09*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R';q=pb['pectoral'+suffix];q.rotation_euler.y=s*(.095*wave(.8,2)+.09*opening+.18*dead);q.rotation_euler.z=s*(.040*wave(.3,2)-.11*dead)
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
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-2.32,-.018],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.62,-.010],'role':'swallow'},{'name':'anchor_attack_primary','bone':'skull','point':[0,-2.33,.01],'role':'attack'}]
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
sources=[{'title':'Giles et al. (2015), Endoskeletal structure in Cheirolepis; Scottish C. trailli specimens and pectoral anatomy','url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC4950109/'},{'title':'Igielman et al. (2026), Devonian ray-finned fish lower jaws; C. trailli NHMUK PV P62908b and P1370','url':'https://anatomypubs.onlinelibrary.wiley.com/doi/10.1002/ar.70005'},{'title':'AMNH Digital Collections, Cheirolepis trailli ptc-5970, 25 cm Middle Devonian Nairnshire specimen','url':'https://digitalcollections.amnh.org/archive/Cheirolepis-trailli--primitive-ray-finned-fish--approximately-380-million-years-old--L-25-cm--Middle-Devonian-of-Nairnshire--Scotland-2URM1THIF2SU.html'},{'title':'National Museums Scotland, fossil collections review; Scottish Middle Devonian assemblages','url':'https://files.nms.ac.uk/production/Documents/Our-Impact/Collections-reviews/Fossil-collections/fossil-review-complete-_review-of-fossil-collections-in-scotland.pdf'}]
notes=['Consistent Scottish Cheirolepis trailli reconstruction; no mixing with the Late Devonian Canadian species. Representative 0.25 m size follows the AMNH collection record ptc-5970, not an adult maximum.','Small rhombic enamel windows, posterior short-based dorsal and anal fins, separate opercular covers, large terminal jaw, segmented fin rays and the scaled upper caudal axis distinguish this early ray-finned fish.','Pigmentation, fin-membrane thickness, three-dimensional soft tissue, individual tooth arrangement and all motion are artistic reconstruction rather than fossil observations.','Growth is a relaxed ventilation and fin-spreading gesture, without scaling or moulting. Ability is a burst-and-bank display, not a Devonian gameplay rule.','Original source and review renders are preserved in cambrian/local/devonian-authoring/cheirolepis.','V3 (11 September 2026) takes the user reference for what is form: a wedge snout over a fuller cheek, a larger more anterior eye, and swept angular fins with pointed apices; the strongly epicercal tail is kept because the sources settle it.']
meta={'id':ID,'name':'Cheirolepis','species':'Cheirolepis trailli','provenance':'Middle Devonian, Scottish Orcadian Basin / Nairnshire assemblages','description':'Small early ray-finned fish with fine rhombic scales, a large toothed terminal mouth, mobile gill covers, ray-supported fins and a strongly unequal tail with an elongated scaled upper lobe.','lengthMeters':.25,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'-v3.blend'))
if '--skip-renders' not in sys.argv:
 import runpy
 runpy.run_path(os.path.join(HERE,'render-v2.py'),run_name='__main__')
