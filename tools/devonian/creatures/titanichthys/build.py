"""Bespoke Titanichthys termieri reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.join(ROOT,'public/assets/devonian/creatures')
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/titanichthys')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='titanichthys';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-1.03,.05));bone('jaw',(0,-1.12,-.12),'skull');bone('throat',(0,-1.1,-.28),'skull')
for i,y in enumerate([.5,1.25,2.,2.65]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R';bone('pectoral'+s,(side*.90,-.32,-.24));bone('pectoralTip'+s,(side*1.43,.11,-.29),'pectoral'+s);bone('pelvic'+s,(side*.27,1.30,-.26),'tail1');bone('gill'+s,(side*.73,-.74,-.11),'skull')
bone('dorsal',(0,.52,.47),'tail0');bone('caudal',(0,2.73,.08),'tail3')
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
# V2 sculpted body envelope. Shield length 1.37 / maximum width 2.72 = .504.
# The articulated front is low and broad; the postcranial outline remains an explicit inference.
sections=[(-2.62,.91,.115,.005),(-2.43,1.18,.245,.025),(-2.12,1.34,.34,.035),(-1.72,1.36,.36,.02),(-1.25,1.22,.335,.015),(-.92,1.09,.46,.015),(-.48,1.055,.63,.025),(0,.86,.595,0),(.65,.59,.46,-.025),(1.3,.35,.305,-.025),(1.95,.19,.19,.005),(2.55,.085,.10,.06),(2.95,.016,.022,.15)]
def section(y):
 if y<=sections[0][0]:return np.array(sections[0][1:])
 for k in range(len(sections)-1):
  if sections[k][0]<=y<=sections[k+1][0]:
   a=np.array(sections[k]);b=np.array(sections[k+1]);t=(y-a[0])/(b[0]-a[0]);pre=np.array(sections[max(0,k-1)]);post=np.array(sections[min(len(sections)-1,k+2)])
   d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);v=(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1
   return v[1:]
 return np.array(sections[-1][1:])
def surf(y,a,offset=0):
 w,h,z=section(y);x=w*cos(a);ss=sin(a);flatten=.72 if y<-1.15 else .96
 zz=z+h*math.copysign(abs(ss)**flatten,ss)
 # Soft snout corners sweep posteriorly rather than ending on a cut cylindrical plane.
 yy=y+.22*cos(a)**2*math.exp(-((y+2.62)/.33)**2)
 # Subtle continuous supraorbital/cheek shaping belongs to the actual envelope.
 orbit=math.exp(-((y+2.04)/.20)**2-((abs(cos(a))-.958)/.105)**2)
 zz+=.018*orbit*max(0,ss);x*=1+.010*orbit
 # Integrated muscular pectoral shoulders, no detached root spheres.
 shoulder=math.exp(-((y+.36)/.29)**2-((ss+.39)/.28)**2);x*=1+.045*shoulder
 # Axial keel and flank musculature soften away from the rigid shield.
 if y>-.9:zz+=.025*math.exp(-((y+.15)/.75)**2)*max(0,ss)**10
 radial=Vector((cos(a),0,sin(a))).normalized();return Vector((x,yy,zz))+radial*offset

def jaw_factor(a):
 t=min(1,max(0,-sin(a)/.72));return t*t*(3-2*t)
def bw(y,a=0):
 if y<-1.15:
  jaw=jaw_factor(a)*max(0,1-(y+2.62)/1.13)
  return {'jaw':jaw,'skull':1-jaw}if jaw>0 else {'skull':1}
 if y<.5:return {'body':1}
 q=min(3,(y-.5)/.73);i=int(q);f=q-i
 return {'tail%d'%i:1-f,'tail%d'%min(3,i+1):f}if i<3 else {'tail3':1}
def pigment(y,a):
 top=(sin(a)+1)/2;flank=math.exp(-((sin(a)+.1)/.28)**2)
 dorsal=np.array((.105,.17,.14));belly=np.array((.38,.36,.25));return tuple(belly*(1-top)**1.7+dorsal*(1-(1-top)**1.7)+np.array((.065,.030,.004))*flank)
def buv(y,a):return (a/(2*pi),(y+2.62)/5.57)
bodyStart=len(V)
def torso(i,j):
 y=-2.62+5.57*i/190;a=j*2*pi/160;return vertex(surf(y,a),pigment(y,a),bw(y,a),buv(y,a))
rows=grid(191,160,torso,0,True);face(rows[-1],0);bodyEnd=len(V)
# Real volumetric oral surfaces: deep palate, cheek folds, broad fleshy floor and throat bend.
def oralpoint(t,a):
 p0=surf(-2.62,a);width=(.91*(1-t)**.55+.03*t);y=-2.62+1.25*t+.22*cos(a)**2*(1-t)
 h=.115+.16*sin(pi*t)-.10*t;z=-.035*t+h*sin(a)
 # The entrance matches the outside; rear folds converge into a downturned pharynx.
 z-=.07*t**3;p=Vector((width*cos(a),y,z));p.z+=.009*sin(a*8)*sin(pi*t)**2;p.z-=.010*(.5+.5*cos((a-pi/2)*28))*max(0,sin(a))**8*sin(pi*t)**2;sidefold=.015*sin(t*pi*5)*sin(pi*t)**2;p.x+=sidefold*cos(a)**7;p.z+=.018*math.exp(-((a-1.5*pi)/.6)**2)*sin(pi*t)**2;return p
oralStart=len(V)
def mouth(i,j):
 t=i/48;a=j*2*pi/128;p=oralpoint(t,a);jaw=jaw_factor(a)*(1-t);throat=.35*sin(pi*t)**2
 return vertex(p,(.19-.09*t,.073-.035*t,.052-.022*t),{'jaw':jaw,'throat':(1-jaw)*throat,'skull':(1-jaw)*(1-throat)},(j/128,t))
oral=grid(49,128,mouth,4,True)
# A bent, narrow rear tube ends below the visible palate instead of a flat black cap.
for i in range(1,25):
 t=i/24;row=[];center=Vector((0,-1.37+.42*sin(pi*t/2),-.105-.31*(1-cos(pi*t/2))));tangent=Vector((0,.42*cos(pi*t/2),-.31*sin(pi*t/2))).normalized();vertical=Vector((0,-tangent.z,tangent.y))
 for j in range(128):
  a=2*pi*j/128;p=center+Vector((.03*(1-.65*t)*cos(a),0,0))+vertical*(.015*(1-.65*t)*sin(a))
  row.append(vertex(p,(.061,.024,.018),'throat',(j/128,.96+.039*t)))
 for j in range(128):face((oral[-1][j],oral[-1][(j+1)%128],row[(j+1)%128],row[j]),4)
 oral.append(row)
# The terminal lumen stays open and turns downward inside opaque body tissue; no visible end plug.
oralEnd=len(V)
# Smooth edentulous lip rails are narrow soft tissue over slender jaw margins, not exposed tusks.
for lower in [False,True]:
 pts=[];ws=[]
 for i in range(101):
  a=(pi if lower else 0)+pi*i/100;pts.append(surf(-2.622,a,.002));ws.append(bw(-2.62,a))
 tube(pts,[.016+.009*sin(pi*i/100)**2 for i in range(101)],(.28,.25,.15),ws,2,12)
# Palatal relief is part of the continuous oral envelope; no capped ridge tubes.
# The shield follows the published broad layout: central/pineal/nuchal fields and paired
# pre-/postorbital and marginal plates; fine exact outlines are not claimed species data.
def top_point(x,y,offset=0):
 w,h,z=section(y);a=math.acos(max(-.9999,min(.9999,x/w)));return surf(y,a,offset),a

def smooth_path(pts,steps=7,closed=True):
 pp=[Vector(p)for p in pts];out=[];N=len(pp)
 for k in range(N if closed else N-1):
  a=pp[(k-1)%N]if closed or k else pp[k];b=pp[k];c=pp[(k+1)%N];d=pp[(k+2)%N]if closed or k+2<N else c
  for t in np.linspace(0,1,steps,endpoint=False):out.append((2*b+(-a+c)*float(t)+(2*a-5*b+4*c-d)*float(t*t)+(-a+3*b-3*c+d)*float(t**3))*.5)
 if not closed:out.append(pp[-1])
 return out

shieldEdges=[]
def plate(poly,bname):
 # Plate boundaries become shallow grooves in the actual continuous mesh, never floating tiles.
 shieldEdges.extend(smooth_path(poly,40))
# Median rostral/pineal and nuchal plates.
plate([(-.31,-2.47),(0,-2.53),(.31,-2.47),(.24,-2.34),(0,-2.28),(-.24,-2.34)],'skull')
plate([(-.24,-2.31),(0,-2.36),(.24,-2.31),(.28,-2.07),(0,-1.96),(-.28,-2.07)],'skull')
plate([(-.45,-1.82),(0,-1.97),(.45,-1.82),(.56,-1.53),(.36,-1.32),(0,-1.25),(-.36,-1.32),(-.56,-1.53)],'skull')
for sign in [-1,1]:
 def pp(points):return [(sign*x,y)for x,y in points]
 for polygon in [
  [(.28,-2.30),(.56,-2.45),(.94,-2.35),(1.12,-2.16),(.81,-2.10),(.54,-2.03),(.28,-2.10)],
  [(.31,-2.04),(.59,-2.00),(.83,-1.87),(.66,-1.73),(.47,-1.81)],
  [(.84,-2.09),(1.16,-2.12),(1.32,-1.90),(1.26,-1.72),(.99,-1.77),(.85,-1.86)],
  [(.72,-1.72),(.98,-1.71),(1.23,-1.65),(1.13,-1.36),(.71,-1.25),(.47,-1.36)],
 ]:plate(pp(polygon),'skull')
 # Large thoracic lateral plates, genuinely different shapes from the cranial mosaic.
 plate(pp([(.34,-1.07),(.75,-1.12),(1.02,-.88),(1.01,-.48),(.77,-.16),(.59,-.41)]),'body')
 plate(pp([(.57,-.29),(.81,-.12),(.74,.13),(.44,.39),(.25,.22)]),'body')
plate([(-.28,-1.06),(-.55,-.77),(-.54,-.29),(-.30,.23),(0,.44),(.30,.23),(.54,-.29),(.55,-.77),(.28,-1.06),(0,-.87)],'body')
# Sculpt each suture into the continuous dorsal envelope; the outer surface stays one component.
from mathutils.kdtree import KDTree
edgeTree=KDTree(len(shieldEdges))
for index,point in enumerate(shieldEdges):edgeTree.insert(Vector((point.x,point.y,0)),index)
edgeTree.balance()
for vi in range(bodyStart,bodyEnd):
 point=Vector(V[vi]);w,h,zc=section(point.y)
 if point.y<.52 and point.z>zc+.01:
  nearest,index,distance=edgeTree.find(Vector((point.x,point.y,0)));depth=.0075*math.exp(-(distance/.023)**2)
  n=Vector((point.x/(w*w),0,(point.z-zc)/(h*h))).normalized();point-=n*depth;V[vi]=tuple(point)
# True spherical globes recessed into the continuous head; lids are small fitted patches, no hoops.
eyeDefs=[]
for sign in [-1,1]:
 y=-2.025;a=.285 if sign==1 else pi-.285;surface=surf(y,a);tangent=(surf(y+.0001,a)-surf(y-.0001,a)).normalized();circ=(surf(y,a+.0001)-surf(y,a-.0001)).normalized();normal=tangent.cross(circ).normalized()
 if normal.x*sign<0:normal=-normal
 radius=.071;center=surface-normal*.045
 start=len(V);ell(center,(radius,)*3,(.006,.013,.012),'skull',3);end=len(V)
 eyeDefs.append({'side':'L'if sign==1 else'R','center':list(center),'radius':radius,'surface':list(surface),'normal':list(normal),'vertexRange':[start,end]})
 # Tapered upper and lower lid ribbons hug the exposed cap boundary; their far edge fades into head.
 Ueye=tangent;Veye=normal.cross(Ueye).normalized()
 for upper in [1]:
  def lid(i,j):
   aa=.17+(pi-.34)*j/50;r=.048+.039*i/5;planar=Ueye*(r*cos(aa))+Veye*(r*sin(aa));q=center+planar+normal*math.sqrt(max(0,radius**2-min(radius*.998,r)**2));target,qa=top_point((surface+planar).x,(surface+planar).y,.0008);q=q.lerp(target,i/5)
   return vertex(q,(.13,.16,.11),'skull',buv(q.y,qa))
  grid(6,51,lid,0)
# Single branchial cover lip, broad and flush rather than thin hanging sticks.
for sign in [-1,1]:
 pts=[]
 for t in np.linspace(0,1,40):
  yy=-1.17+.17*float(t);aa=(-.15-.75*float(t))if sign==1 else pi+.15+.75*float(t);pts.append(surf(yy,aa,.011))
 tube(pts,[.009+.006*sin(pi*i/39)for i in range(40)],(.061,.105,.088),'gill'+('L'if sign==1 else'R'),0,8)
# Closed thin fin fans with anatomically weighted ray structures.
def fin(name,origin,boundary,base,tip=None,thickness=.015,rays=10):
 origin=Vector(origin);boundary=smooth_path(boundary,5,False)if len(boundary)<20 else list(map(Vector,boundary));N=len(boundary);steps=28;normal=Vector((1,0,0))if max(p.x for p in boundary)-min(p.x for p in boundary)<.001 else Vector((0,0,1))
 def point(t,j):
  relief=.0035*(.5+.5*cos(2*pi*j/(N-1)*rays))**8*sin(pi*t)
  return origin.lerp(boundary[j],t)+normal*(thickness*1.7*sin(pi*t)*sin(pi*j/(N-1))+relief)
 def weight(t):return {base:1-max(0,(t-.4)/.6),tip:max(0,(t-.4)/.6)}if tip else {base:1}
 surfaces=[]
 for side in [-1,1]:
  def fv(i,j):
   t=.012+.988*i/steps;p=point(t,j)+normal*(side*thickness*(.12+3.5*(1-t)**3+.4*sin(pi*t)));col=(.11+.055*t,.19+.025*t,.16-.025*t);return vertex(p,col,weight(t),(j/(N-1),t))
  surfaces.append(grid(steps+1,N,fv,5))
 back,front=surfaces
 # The membrane is a closed thickness shell, including the distal rim and buried root.
 for i in range(steps):
  for j in [0,N-1]:face((back[i][j],back[i+1][j],front[i+1][j],front[i][j]),5)
 for j in range(N-1):
  for i in [0,steps]:face((back[i][j],front[i][j],front[i][j+1],back[i][j+1]),5)
for s in [-1,1]:
 side='L'if s==1 else'R';o=(s*.91,-.34,-.25)
 # Swept, broad pectoral with a fleshy base and rounded taper; neither ray nor wing.
 controls=[(.87,-.59,-.24),(1.26,-.42,-.29),(1.79,.04,-.38),(2.03,.51,-.45),(1.97,.65,-.45),(1.65,.59,-.38),(1.16,.35,-.28),(.89,.13,-.24)]
 boundary=[(s*q.x,q.y,q.z)for q in smooth_path(controls,8,False)];fin('pectoral',o,boundary,'pectoral'+side,'pectoralTip'+side,thickness=.03,rays=23)
 boundary=[(s*x,y,z)for x,y,z in[(.27,1.25,-.25),(.63,1.56,-.29),(.61,1.83,-.30),(.39,1.85,-.28),(.22,1.59,-.24)]]
 fin('pelvic',(s*.25,1.43,-.24),boundary,'pelvic'+side,rays=4)
# Median fins: a conservative generalized arthrodire reconstruction, documented as uncertain.
fin('dorsal',(0,.92,.31),[(0,.32,.46),(0,.59,.96),(0,.79,1.03),(0,1.03,.65),(0,1.39,.28)],'dorsal',thickness=.018,rays=16)
# Heterocercal caudal outline, upper lobe elongate; fleshy peduncle already continuous with body.
fin('caudal',(0,2.60,.07),[(0,2.44,.17),(0,2.91,.55),(0,3.52,.94),(0,3.72,1.02),(0,3.57,.73),(0,3.21,.22),(0,3.06,.01),(0,3.24,-.45),(0,3.28,-.59),(0,3.10,-.57),(0,2.74,-.35),(0,2.51,-.04)],'caudal',thickness=.023,rays=25)
# UV albedo/normal/roughness atlas generation. Source art is original, not fossil evidence.
sys.path.insert(0,HERE)
from materials_v2 import build_materials
mats,texture_lookup=build_materials(HERE,shieldEdges,sections)
# Material-matched vertex pigmentation for the texture-free LOD.
for face_indices,mi in zip(F,M):
 family=['body','body','oral',None,'oral','fin'][mi]
 for vi in face_indices:
  if family:
   data=texture_lookup[family];u,v=U[vi];rgb=data[round((v%1)*(data.shape[0]-1)),round((u%1)*(data.shape[1]-1))]
   # Texture pixels are sRGB; glTF vertex colours are linear.
   linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4);C[vi]=tuple(float(x)for x in linear)+(1,)
  else:C[vi]=(.005,.012,.010,1)
# Monte Carlo globe-volume containment against the actual continuous envelope mesh.
from mathutils.bvhtree import BVHTree
bodyFaces=[list(f)for f in F if all(bodyStart<=i<bodyEnd for i in f)]
bodyFaces.append(list(reversed(rows[0])))
bodyTree=BVHTree.FromPolygons([Vector(p)for p in V],bodyFaces,all_triangles=False)
rng=np.random.default_rng(917);volumeReports=[]
for eye in eyeDefs:
 center=np.array(eye['center']);radius=eye['radius'];points=rng.uniform(-1,1,(70000,3));points=points[(points*points).sum(1)<=1][:30000]*radius+center;inside=0
 for point in points:
  # Outward ray from within the body intersects the nearest lateral head shell once.
  p=Vector(point);direction=Vector((1,.013,.007)).normalized();count=0
  for step in range(8):
   hit,n,idx,dist=bodyTree.ray_cast(p,direction,8)
   if hit is None:break
   count+=1;p=hit+direction*.00001
  inside+=count%2
 fraction=inside/len(points);assert fraction>=.65,(eye['side'],fraction)
 volumeReports.append({**eye,'sampleCount':len(points),'insideFraction':fraction,'method':'Uniform volume samples inside true spherical globe; parity rays against continuous torso envelope, front aperture capped away from eyes; eyelids and armour excluded.'})
open(os.path.join(HERE,'eyes-v2.json'),'w').write(json.dumps({'id':ID,'eyes':volumeReports,'minimumInsideFraction':min(e['insideFraction']for e in volumeReports),'coordinateSystem':'Blender world bind: Z up, -Y forward'},indent=2))
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
  wave=lambda lag=0,freq=1:(sin(p*freq-lag)if loop else sin(p*freq-lag)-sin(-lag))*env
  amp={'Idle':.28,'Swim':1.12,'Eat':.48,'Guard':.10,'Dodge':1.4,'Ability':.72}.get(clip,.28)
  peak=sin(pi*max(0,min(1,(u-.24)/.40)))**2 if .24<u<.64 else 0
  wind=sin(pi*min(1,u/.28))**2 if u<.28 else 0
  settle=sin(pi*max(0,min(1,(u-.62)/.38)))**2 if u>.62 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.022*wave(0,2)if loop else 0
  if clip=='Eat':opening=.12*(1-cos(p))
  if clip=='Bite':opening=.25*e # Gentle oral closure; no teeth or predatory strike.
  if clip=='Attack':opening=.11*peak
  if clip=='Heavy':opening=.07*wind
  if clip=='Ability':opening=.42*e**.55
  if clip=='Growth':opening=.065*e
  opening+=.10*dead
  pb['jaw'].rotation_euler.x=opening;pb['skull'].rotation_euler.x=-opening*.13
  pb['throat'].rotation_euler.x=opening*.32+.035*wave(.6,2)
  body=pb['body'];body.rotation_euler.y=.012*amp*wave(.4);body.rotation_euler.x=.012*amp*wave();body.location.z=.012*amp*wave(.2)
  if clip in ['TurnLeft','TurnRight']:body.rotation_euler.z=(-1 if clip=='TurnLeft'else 1)*.22*e;body.rotation_euler.y=(-1 if clip=='TurnLeft'else 1)*.13*e
  if clip in ['Dive','Rise']:body.rotation_euler.x=(1 if clip=='Dive'else-1)*.19*e
  if clip=='Attack':body.location.y=.08*wind-.18*peak;body.rotation_euler.x=.05*wind-.03*peak
  if clip=='Heavy':body.rotation_euler.z=-.08*wind+.15*peak-.025*settle;body.location.y=.05*wind-.11*peak
  if clip=='Parry':body.rotation_euler.z=.16*e;body.rotation_euler.y=-.13*e
  if clip=='Guard':body.rotation_euler.x=.04*(1-cos(p));body.rotation_euler.y=.025*sin(p)
  if clip=='Dodge':body.rotation_euler.y=.30*e;body.rotation_euler.z=-.27*e;body.location.x=.20*e
  if clip in ['Hit','Stagger']:
   body.rotation_euler.z=.11*e*sin(p*(1 if clip=='Hit'else 2));body.rotation_euler.y=.17*e;body.location.y=.08*e
  if clip=='Growth':body.rotation_euler.x=-.035*e;body.rotation_euler.y=.045*e
  body.rotation_euler.y+=.72*dead;body.rotation_euler.x+=.06*dead;body.location.z-=.10*dead
  for i in range(4):
   q=pb['tail%d'%i];q.rotation_euler.z=(.090+i*.038)*amp*wave(i*.76)+.06*dead*sin(i*.7)
   if clip=='Dodge':q.rotation_euler.z+=.24*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.06*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.04+i*.008)*e
  pb['caudal'].rotation_euler.z=.18*amp*wave(2.95)+.05*dead
  pb['dorsal'].rotation_euler.y=.04*amp*wave(1.6)+.12*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R';q=pb['pectoral'+suffix];q.rotation_euler.y=s*(.070*amp*wave(.8)+.10*opening+.11*dead);q.rotation_euler.z=s*(.022*wave(.3)-.11*dead)
   if clip=='Guard':q.rotation_euler.y+=s*.10*(1-cos(p))
   if clip=='Ability':q.rotation_euler.y-=s*.12*e;q.rotation_euler.z-=s*.06*e
   if clip=='Dodge':q.rotation_euler.y+=s*(.24 if s==1 else-.12)*e
   if clip=='Heavy':q.rotation_euler.z+=s*(.05*wind-.06*peak)
   if clip=='Growth':q.rotation_euler.y-=s*.16*e
   pb['pectoralTip'+suffix].rotation_euler.y=s*(.11*amp*wave(1.3)+.10*dead)
   pb['pelvic'+suffix].rotation_euler.y=s*(.075*amp*wave(1.9)+.15*dead)
   pb['gill'+suffix].rotation_euler.z=s*(.035*opening+.037*wave(.4,2))
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
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-2.61,-.07],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.43,-.08],'role':'swallow'},{'name':'anchor_attack_primary','bone':'skull','point':[0,-2.48,.14],'role':'attack'}]
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
fullColors={}
for part in parts:
 color=part.data.color_attributes['Color'];saved=np.array([c.color[:]for c in color.data]);fullColors[part.name]=saved;white=np.ones_like(saved);color.data.foreach_set('color',white.astype(np.float32).ravel())
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.glb'),**kwargs)
for part in parts:part.data.color_attributes['Color'].data.foreach_set('color',fullColors[part.name].astype(np.float32).ravel())
fulltris=sum(len(p.vertices)-2 for p in mesh.polygons)
for part in parts:
 bpy.context.view_layer.objects.active=part;de=part.modifiers.new('Reduced silhouette preserving topology','DECIMATE');de.ratio=.25;bpy.ops.object.modifier_move_up(modifier=de.name);bpy.ops.object.modifier_apply(modifier=de.name)
lodtris=sum(sum(len(p.vertices)-2 for p in part.data.polygons)for part in parts)
materialLinks=[]
for mat in mats:
 bs=mat.node_tree.nodes.get('Principled BSDF')
 for input_name in ['Base Color','Normal','Roughness']:
  for link in list(bs.inputs[input_name].links):materialLinks.append((mat,link.from_socket,link.to_socket));mat.node_tree.links.remove(link)
 bs.inputs['Base Color'].default_value=(1,1,1,1)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.lod1.glb'),**kwargs)
for mat,source,target in materialLinks:mat.node_tree.links.new(source,target)
mats[3].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.005,.012,.010,1)
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
sources=[{'title':'Coatham et al. (2020), Was the Devonian placoderm Titanichthys a suspension feeder?','url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/','doi':'10.1098/rsos.200272'},{'title':'Boyle and Ryan (2017), New information on Titanichthys from the Cleveland Shale','url':'https://doi.org/10.1017/jpa.2016.136','doi':'10.1017/jpa.2016.136'}]
notes=['Slender edentulous jaw and small relative orbits supported by fossils; suspension feeding supported biomechanically, actual filtering organs unknown and omitted.','Complete body outline, tail and fin proportions, soft tissues, pigmentation and all motion are explicitly artistic reconstruction.','Representative reconstructed display length 5 m; not a measured complete specimen or claimed maximum.','Attack/Heavy are shield/contact motions, Bite is a gentle oral closing cycle, Ability is a broad ram-feeding gape; names are compatibility labels, not gameplay design.']
meta={'id':ID,'name':'Titanichthys','species':'Titanichthys termieri','provenance':'Late Devonian (Famennian), Southern Maïder basin, Morocco','description':'Broad-headed armoured giant with small eyes and slender toothless jaws, reconstructed as a suspension feeder.','lengthMeters':5,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'v2Design':'Source-constrained broad compressed shield; integrated recessed eyes; UV pigment fields; shaped soft snout, deep oral tissues and continuous fleshy fin bases','noScaleChannels':True,'eyeVolumeReports':volumeReports,'materialMaps':'three UV atlas families, albedo + normal + roughness; original imagegen pigment artwork','anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Studio and prescribed pose review.
world=bpy.data.worlds.new('Deep neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.033,.041,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size,color in [('Key',(3,-5,7),1300,5,(1,.89,.72)),('Fill',(-5,-2,3),900,5,(.53,.78,1)),('Rim',(1,5,5),1700,4,(.70,.89,1))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=7.25
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=.10;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
cam.location=(7,-7.2,4.4);cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=72
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.5,'front'),('Bite',.5,'side'),('Heavy',.45,'threequarter'),('Ability',.5,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,1.2),'front':(0,-10,1),'threequarter':(7,-7.2,4.4)}[view];cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
inspectLightData=bpy.data.lights.new('Oral inspection fill','AREA');inspectLightData.energy=90;inspectLightData.size=1.5;inspectLight=bpy.data.objects.new('Oral inspection fill',inspectLightData);bpy.context.collection.objects.link(inspectLight);inspectLight.location=(0,-3.9,-.04);inspectLight.rotation_euler=(Vector((0,-1.5,-.04))-inspectLight.location).to_track_quat('-Z','Y').to_euler();inspectLight.hide_render=True
for view,position,target,scale in [('neutral-front',(0,-10,1.8),(0,-1.0,0),5.1),('neutral-dorsal',(0,-.6,10),(0,.35,0),9.0),('eye-close',(5,-4.5,2.2),(1.12,-2.02,.19),1.05),('mouth-close',(1.2,-7,-.1),(0,-2.1,-.12),3.0)]:
 inspectLight.hide_render=view!='mouth-close';rig.animation_data.action=bpy.data.actions['Ability'if view=='mouth-close'else'Idle'];scene.frame_set(36 if view=='mouth-close'else 0);cam.location=position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();d.ortho_scale=scale;render(os.path.join(LOCAL,'v2-'+view+'.png'),1200,900,False)
print('TITANICHTHYS_COMPLETE',json.dumps(report),flush=True)
