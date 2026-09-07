"""Original Devonian scenery sculpting library. Blender 4/5, metric dimensions.
Run from repo: blender -b --threads 2 --python tools/devonian/props/build.py -- [ids...]
Each family has independently authored morphology; shared helpers are geometry, not anatomy.
"""
import bpy, math, random, json, sys, os, struct
from mathutils.kdtree import KDTree
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise
from math import sin,cos,pi,sqrt,exp
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/devonian/props'
LOCAL=ROOT.parent/'devonian-authoring/props'
HERE=Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True); LOCAL.mkdir(parents=True,exist_ok=True)
TAU=2*pi
def linspace(a,b,n):return [float(x) for x in np.linspace(a,b,n)]
PALETTE={'sponge':(.065,.100,.048),'skeleton':(.49,.42,.29),'coral':(.35,.22,.18),'oral':(.24,.12,.1),'shell':(.38,.32,.22),'shell_inside':(.65,.61,.49),'crinoid':(.42,.29,.18),'foliage':(.10,.24,.075),'stalk':(.22,.29,.09),'bark':(.20,.145,.085),'wood':(.44,.33,.17),'carbonate':(.39,.39,.30),'rock':(.22,.27,.28),'mud':(.095,.071,.041),'sand':(.29,.235,.145),'film':(.14,.20,.12),'dark':(.07,.055,.04)}
class Sculpt:
 def __init__(self): self.v=[];self.f=[];self.c=[];self.uv=[];self.b=[];self.mi=[];self.bones={};self.rng=random.Random(913)
 def vertex(self,p,mat='skeleton',uv=(0,0),bone='root'):
  i=len(self.v);p=Vector(p);self.v.append(tuple(p));self.uv.append(uv);self.b.append(bone)
  col=PALETTE[mat];n=.94+.075*noise(p*9+Vector((13.1,4.7,8.2)))+.025*noise(p*97+Vector((5.9,12.3,2.1)))
  self.c.append(tuple(min(1,max(.005,x*n)) for x in col)+(1,));return i
 def face(self,idx,mat):self.f.append(tuple(idx));self.mi.append(list(PALETTE).index(mat))
 def bone(self,name,head,tail,parent='root'):self.bones[name]=(head,tail,parent);return name
 def tube(self,pts,radii,mat='skeleton',sides=10,bone='root',ridge=0,cap=True):
  pts=[Vector(p) for p in pts];rings=[]
  for j,p in enumerate(pts):
   tangent=(pts[min(j+1,len(pts)-1)]-pts[max(0,j-1)]).normalized();side=tangent.cross(Vector((0,1,0)))
   if side.length<.1:side=tangent.cross(Vector((1,0,0)))
   side.normalize();up=tangent.cross(side).normalized();r=radii[j] if isinstance(radii,list) else radii
   ring=[]
   for k in range(sides):
    a=k*TAU/sides;rr=r*(1+ridge*cos(6*a));ring.append(self.vertex(p+rr*(side*cos(a)+up*sin(a)),mat,(k/sides,j/max(1,len(pts)-1)),bone))
   rings.append(ring)
  for j in range(len(rings)-1):
   for k in range(sides): self.face((rings[j][k],rings[j][(k+1)%sides],rings[j+1][(k+1)%sides],rings[j+1][k]),mat)
  if cap:self.face(tuple(reversed(rings[0])),mat);self.face(rings[-1],mat)
 def path(self,a,b,c,n=12):return [Vector(a)*(1-t)**2+Vector(b)*2*t*(1-t)+Vector(c)*t*t for t in linspace(0,1,n)]
 def branch(self,a,b,c,r,mat='stalk',bone='root',n=16,sides=10):
  pts=self.path(a,b,c,n);self.tube(pts,[r*(1-.85*j/(n-1)) for j in range(n)],mat,sides,bone);return pts
 def mound(self,center,scale,mat='sponge',seed=0,rough=.07,n=32,m=64,flat=True):
  center=Vector(center);rings=[]
  for j in range(m+1):
   p=pi*j/m; row=[]
   for k in range(n):
    t=TAU*k/n;rr=1+rough*(sin(t*5+p*4+seed)+.4*sin(t*11-p*7+seed*2)+.22*sin(t*23+p*19))
    z=cos(p)*scale[2]*rr
    if flat:z=max(-scale[2]*.65,z)
    row.append(self.vertex(center+Vector((sin(p)*cos(t)*scale[0]*rr,sin(p)*sin(t)*scale[1]*rr,z)),mat,(k/n,j/m)))
   rings.append(row)
  for j in range(m):
   for k in range(n):self.face((rings[j][k],rings[j][(k+1)%n],rings[j+1][(k+1)%n],rings[j+1][k]),mat)
 def rock(self,center,scale,mat='carbonate',seed=0,rough=.1,**kwargs):
  # Weathered fractured block from a triangulated isotropic surface, without polar seams.
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=kwargs.get('subdivisions',4),radius=1);obj=bpy.context.object;start=len(self.v);center=Vector(center)
  for vert in obj.data.vertices:
   v=vert.co;x,y,z=v;rr=1+rough*(.65*sin(x*5+y*2+seed)*cos(z*4-y*3)+.26*sin(x*13-z*8+seed)*cos(y*11))
   x=math.copysign(abs(x)**.63,x)*rr;y=math.copysign(abs(y)**.66,y)*rr;z=math.copysign(abs(z)**.72,z)*rr
   x=min(x,.82+.025*sin(y*5+z*2));y=max(y,-.80+.025*sin(z*6));z=max(z,-.62)
   # Differential weathering along a weak bedding plane, not cartoon horizontal bands.
   x-=.065*exp(-((z-.15-.12*y)/.055)**2)*max(0,x)
   point=center+Vector((x*scale[0],y*scale[1],z*scale[2]));idx=self.vertex(point,mat,(x*3+z,y*3+z))
   tint=.83+.11*sin(x*7+y*4)*cos(z*5)+.06*sin(z*21+y*2)
   self.c[idx]=tuple(v*tint for v in self.c[idx][:3])+(1,)
  for face in obj.data.polygons:self.face([start+i for i in face.vertices],mat)
  bpy.data.objects.remove(obj,do_unlink=True)
 def disk(self,c,r,depth,mat='skeleton',septa=0,bone='root',sides=48):
  # Real shallow oral/calyx concavity with rolled raised edge.
  c=Vector(c);rs=[0,.18,.52,.82,1,1.05];zs=[-depth*(1-rr**1.7) for rr in rs[:-1]]+[-depth*.24];rows=[]
  for j,(rr,z) in enumerate(zip(rs,zs)):
   rows.append([self.vertex(c+Vector((r*rr*cos(TAU*k/sides),r*rr*sin(TAU*k/sides),z)),mat,(k/sides,j/5),bone) for k in range(sides)])
  for j in range(5):
   for k in range(sides):self.face((rows[j][k],rows[j][(k+1)%sides],rows[j+1][(k+1)%sides],rows[j+1][k]),mat)
  for i in range(septa):
   a=i*TAU/septa;rr=.25 if i%2 else .12
   self.tube([c+Vector((r*t*cos(a),r*t*sin(a),-depth*(1-t**1.7)+depth*.04)) for t in linspace(rr,.96,8)],r*.016,mat,5,bone)
 def ribbon(self,pts,width,mat='foliage',bone='root',n=8):
  rows=[]
  for j,p in enumerate(pts):
   t=j/(len(pts)-1);w=width*sin(pi*t)**.55
   rows.append([self.vertex(Vector(p)+Vector((w*(k/n*2-1),0,w*.17*cos(pi*(k/n*2-1)))),mat,(k/n,t),bone) for k in range(n+1)])
  for j in range(len(rows)-1):
   for k in range(n):self.face((rows[j][k],rows[j][k+1],rows[j+1][k+1],rows[j+1][k]),mat)
 def shell(self,center,size=.045,form='spirifer',open_angle=0,fragment=False):
  c=Vector(center);n=72;m=28
  if form=='atrypa':
   for side in [-1,1]:
    rows=[]
    for j in range(m+1):
     u=j/m;row=[]
     for k in range(n):
      a=k*TAU/n;x=size*.48*cos(a)*u;y=size*.55*sin(a)*u
      z=side*size*(.23 if side>0 else .14)*max(0,1-u*u)**.7+side*size*.012*cos(a*32)*u*sin(pi*u)
      z+=side*size*.004*sin(u*110)
      row.append(self.vertex(c+Vector((x,y,z)),'shell',(k/n,u)))
     rows.append(row)
    for j in range(m):
     for k in range(n):self.face((rows[j][k],rows[j][(k+1)%n],rows[j+1][(k+1)%n],rows[j+1][k]),'shell')
   return
  if form=='bivalve':
   # Elongate modiomorphid outline, offset umbo, concentric growth: no scallop ribs.
   for side in [-1,1]:
    rows=[]
    for j in range(m+1):
     u=j/m;row=[]
     for k in range(n):
      a=k*TAU/n;outerx=size*(.60*cos(a)+.08);outery=size*.29*sin(a)*(1+.14*cos(a));x=-size*.25+(outerx+size*.25)*u;y=outery*u
      z=side*size*.14*max(0,1-u*u)**.70+side*size*.003*sin(u*150)*sin(pi*u)
      if open_angle:z+=side*(size*.29-y)*sin(open_angle)
      row.append(self.vertex(c+Vector((x,y,z)),'shell',(k/n,u)))
     rows.append(row)
    for j in range(m):
     for k in range(n):
      if not fragment or not(j>m*.62 and k>n*.70):self.face((rows[j][k],rows[j][(k+1)%n],rows[j+1][(k+1)%n],rows[j+1][k]),'shell')
   return
  for side in [-1,1]:
   rows=[]
   for j in range(m+1):
    u=j/m;row=[]
    for k in range(n+1):
     a=k*pi/n
     if form=='spirifer':x=cos(a)*size*(.54*(sin(pi*u/2)**.58)+1.15*exp(-((u-.14)/.13)**2));y=sin(a)*size*u*.67
     else:x=cos(a)*size*.53*sin(pi*u/2);y=sin(a)*size*u*(1 if form=='bivalve' else .85)
     z=side*size*(.14 if side<0 else .25)*sin(pi*u)**.7*sin(a)**.45
     z+=side*size*.011*sin(a*36)*sin(pi*u)**.3
     if form=='spirifer':z+=side*size*.05*exp(-(x/(size*.17))**2)*sin(pi*u)
     z+=side*size*.003*sin(u*90)
     if open_angle:z+=side*y*sin(open_angle)
     row.append(self.vertex(c+Vector((x,y,z)), 'shell' if side>0 else 'shell_inside',(k/n,u)))
    rows.append(row)
   for j in range(m):
    for k in range(n):
     if not fragment or not (j>m*.5 and k>n*.65):self.face((rows[j][k],rows[j][k+1],rows[j+1][k+1],rows[j+1][k]),'shell' if side>0 else 'shell_inside')
 def horn(self,c,h=.12,r=.04,lean=.025,septa=True):
  c=Vector(c);pts=[c+Vector((lean*sin(t*pi/2),0,h*t)) for t in linspace(0,1,50)]
  self.tube(pts,[r*(.075+.925*t**.8)*(1+.024*sin(t*100)) for t in linspace(0,1,50)],'coral',64,cap=False)
  self.disk(pts[-1]+Vector((0,0,.001)),r*.97,h*.19,'skeleton',40 if septa else 0)
 def coral_branch(self,a,d,length,r,depth,seed=0,mat='coral',pores=True):
  a=Vector(a);d=Vector(d).normalized();b=a+d*length;c=b+Vector((.05*length*sin(seed),.03*length*cos(seed),0));pts=self.path(a,(a+b)/2,c,18)
  self.tube(pts,[r*(1-.24*j/17)*(1+.025*sin(j*4)) for j in range(18)],mat,14)
  if pores:
   for j in range(2,17,3):
    p=pts[j]
    for k in range(5):
     ang=TAU*(k/5+j*.07);v=Vector((cos(ang),sin(ang),.25)).normalized();self.tube([p+v*r*.94,p+v*r*1.06],[r*.13,r*.10],'oral',7)
  if depth:
   side=Vector((cos(seed*2.4),sin(seed*2.4),.25));
   for sign in [-1,1]:self.coral_branch(c,(d*.6+side*sign*.6+Vector((0,0,.3))).normalized(),length*.71,r*.68,depth-1,seed+1.7*sign,mat,pores)
 def columnal(self,c,r=.005,h=.005):
  c=Vector(c);n=24;rows=[]
  for zz,rr in [(-h/2,r*.96),(-h*.3,r),(h*.3,r),(h/2,r*.96),(h/2,r*.22),(-h/2,r*.22)]:
   rows.append([self.vertex(c+Vector((rr*cos(TAU*k/n),rr*sin(TAU*k/n),zz)),'skeleton',(k/n,zz/h+.5)) for k in range(n)])
  for j in range(len(rows)):
   for k in range(n):self.face((rows[j][k],rows[j][(k+1)%n],rows[(j+1)%len(rows)][(k+1)%n],rows[(j+1)%len(rows)][k]),'skeleton')
 def terrain(self,kind,variant=0):
  n=62;rows=[];span=2 if kind not in ['bank','rootbank'] else 3
  for j in range(n+1):
   row=[]
   for k in range(n+1):
    x=(k/n-.5)*span;y=(j/n-.5)*span
    z=.014*sin(x*7+y*4)+.011*sin(x*16-y*11)+.004*sin(x*71+y*37)
    if kind=='mud':z+=.018*sin((x+.1*sin(y*4))*30)*(1-variant*.65)
    if kind=='sand':z+=.03*sin((x+.08*sin(y*3))*20)
    if kind in ['bank','rootbank']:z+=.52*(1+math.tanh(y*4))+.06*sin(x*3+y)*(.5+y/span)
    mat='mud' if kind in ['mud','bank','rootbank'] else 'sand'
    row.append(self.vertex((x,y,z),mat,(k/n*4,j/n*4)))
   rows.append(row)
  for j in range(n):
   for k in range(n):self.face((rows[j][k],rows[j][k+1],rows[j+1][k+1],rows[j+1][k]),mat)
  border=rows[0]+[r[-1] for r in rows[1:]]+list(reversed(rows[-1][:-1]))+[r[0] for r in reversed(rows[1:-1])]
  lower=[self.vertex((self.v[i][0],self.v[i][1],-.18),mat) for i in border]
  for i in range(len(border)):j=(i+1)%len(border);self.face((border[i],lower[i],lower[j],border[j]),mat)
  self.face(tuple(reversed(lower)),mat)
 def leafy_branch(self,a,b,c,width,bone='root',primitive=False):
  pts=self.branch(a,b,c,width*.10,'stalk',bone,n=16)
  for j in range(3,15):
   t=j/15;p=pts[j];direction=(pts[min(j+1,15)]-pts[max(0,j-1)]).normalized();lat=direction.cross(Vector((0,0,1)))
   if lat.length<.1:lat=Vector((1,0,0))
   lat.normalize();L=width*sin(pi*t)**.5
   for s in [-1,1]:
    end=p+lat*L*s+direction*L*.24+Vector((0,0,L*.13))
    self.tube([p,end],[width*(.018 if primitive else .006),width*(.007 if primitive else .0025)],'stalk',5,bone)
    if primitive:
     for kk in range(3):self.branch(end,end+direction*L*.1,end+Vector((sin(kk*2)*L*.13,cos(kk*2)*L*.13,L*.4)),width*.025,'foliage',bone,n=5,sides=5)
    else:
     # This is a pinna axis, bearing centimetre-scale fan pinnules. The former
     # one-blade-per-axis study exaggerated leaf size and is not the final model.
     axis=(end-p).normalized();normal=axis.cross(Vector((0,0,1))).normalized()
     for q in range(1,8):
      u=q/8;center=p+(end-p)*u;length=.022*(.7+.3*sin(pi*u))
      for sign in [-1,1]:
       tip=center+normal*sign*length+axis*length*.22;sideaxis=axis*length*.38
       points=[center,center+(tip-center)*.43-sideaxis*.68,center+(tip-center)*.43+sideaxis*.68,tip-sideaxis*.72,tip+sideaxis*.72,tip+normal*sign*length*.09]
       ids=[self.vertex(v,'foliage',uv,bone) for v,uv in zip(points,[(.5,0),(0,.4),(1,.4),(.1,.92),(.9,.92),(.5,1)])]
       for face in [(0,1,2),(1,3,4,2),(3,5,4)]:self.face([ids[i] for i in face],'foliage')

 def tree(self,kind,variant=0,only_branch=False,dead=False):
  H=6.5 if kind=='clado' else 7.5
  if variant:H*=.76
  if only_branch:self.leafy_branch((0,0,0),(.1,0,.4),(1.1,0,.8),.38,primitive=kind=='clado');return
  pts=[( .06*sin(t*4),.04*sin(t*3),H*t) for t in linspace(0,1,72)]
  rad=[(.23*(1-t)**.75+.035)*(1+.38*exp(-t*32)) for t in linspace(0,1,72)]
  self.tube(pts,rad,'bark',32,ridge=.11)
  rootn=34 if kind=='clado' else 8
  for j in range(rootn):
   a=j*TAU/rootn;L=(.65 if kind=='clado' else 1.7)*(1+.18*sin(j*3))
   end=Vector((L*cos(a),L*sin(a),-.10));self.branch((.18*cos(a),.18*sin(a),.28),(.4*cos(a),.4*sin(a),-.01),end,.025 if kind=='clado' else .075,'bark',sides=8)
   if kind!='clado':
    for sign in [-1,1]:self.branch(end*.7,end+Vector((.1,0,-.08)),end+Vector((.45*cos(a+sign*.7),.45*sin(a+sign*.7),-.15)),.024,'bark',sides=7)
  bn=18 if kind=='clado' else 24
  for j in range(bn):
   a=j*2.39996;z=H*(.80+.16*j/bn) if kind=='clado' else H*(.28+.66*j/bn)
   L=(1.2 if kind=='clado' else 2.3)*(1-.65*j/bn)*(1+.12*sin(j*6))
   start=(.01,0,z);end=(L*cos(a),L*sin(a),z+L*.24)
   bone=self.bone('branch_%02d'%j,start,end)
   pts=self.branch(start,(L*.6*cos(a),L*.6*sin(a),z+L*.5),end,.025 if kind=='clado' else .045,'bark',bone,n=18)
   for k in range(4,18,2):
    p=pts[k]
    for s in [-1,1]:
     d=Vector((cos(a+s*.9),sin(a+s*.9),.25));e=p+d*(.5 if kind=='clado' else .65)*(1-.35*k/18)
     if not dead:self.leafy_branch(p,(p+e)/2+Vector((0,0,.08)),e,.22 if kind=='clado' else .26,bone,primitive=kind=='clado')
 def log(self,variant=0):
  a=Vector((-1.5,0,.24));b=Vector((1.5,.22,.30));pts=self.path(a,(0,-.13,.36),b,70)
  self.tube(pts,[.23*(1-.38*j/69)*(1+.05*sin(j*3)) for j in range(70)],'bark',48,ridge=.10)
  for end,axis,rr in [(a,(a-b).normalized(),.222),(b,(b-a).normalized(),.133)]:
   start=len(self.v);self.disk((0,0,0),rr,.006,'wood',0);q=Vector((0,0,1)).rotation_difference(axis)
   for i in range(start,len(self.v)):self.v[i]=tuple(end+axis*.004+q@Vector(self.v[i]))
  for j in range(3):
   p=pts[15+j*15];e=p+Vector((.1,(-1)**j*(.7-j*.1),.28));self.branch(p,(p+e)/2+Vector((0,0,.1)),e,.074,'bark',n=20)
  # Broken ragged end splinters follow axial wood grain.
  for j in range(11):
   a1=j*TAU/11;start=b+Vector((0,cos(a1)*.13,sin(a1)*.13));self.tube([start,start+Vector((.16+.07*sin(j*3),0,0))],[.014,.001],'wood',7)

def build_family(id,variant=0):
 s=Sculpt();random.seed(100+variant)
 if id=='massive-stromatoporoid':
  # Contiguous dome: mamelons emerge from the surface; astrorhizae are shallow grooves.
  H=.31 if not variant else .50;centers=[]
  for j in range(31):
   aa=j*2.39996;rr=.37*sqrt((j+.5)/31);centers.append((rr*cos(aa),rr*sin(aa)))
  rows=[];N=160;M=74
  for j in range(M+1):
   u=j/M;row=[]
   for k in range(N):
    a=k*TAU/N;rr=u*(1+.060*sin(a*3+.4)+.032*cos(a*7));x=.58*rr*cos(a);y=.45*rr*sin(a);z=.045+H*sqrt(max(0,1-u*u))+.006*sin(x*43+y*17)*sin(y*31)
    grooves=0
    for cx,cy in centers:
     dx=x-cx;dy=y-cy;dist=sqrt(dx*dx+dy*dy);phi=math.atan2(dy,dx)
     z+=.020*exp(-(dist/.030)**2)
     g=exp(-((sin(phi*2.5+dist*21))/.13)**2)*exp(-((dist-.032)/.025)**2)
     z-=.0035*g;grooves=max(grooves,g)
    vi=s.vertex((x,y,z),'sponge',(x*4,y*4));row.append(vi)
    mottle=.83+.20*noise(Vector((x*12,y*12,z*8)))+.10*noise(Vector((x*33,y*33,z*16)));s.c[vi]=tuple(v*mottle*(1-.22*grooves) for v in s.c[vi][:3])+(1,)
   rows.append(row)
  for j in range(M):
   for k in range(N):s.face((rows[j][k],rows[j][(k+1)%N],rows[j+1][(k+1)%N],rows[j+1][k]),'sponge')
  base=[s.vertex((s.v[i][0],s.v[i][1],0),'sponge') for i in rows[-1]]
  for k in range(N):s.face((rows[-1][k],rows[-1][(k+1)%N],base[(k+1)%N],base[k]),'sponge')
  s.face(tuple(reversed(base)),'sponge')
 elif id=='branching-stromatoporoid':
  for j in range(6 if not variant else 11):
   a=j*2.39996;s.coral_branch((.10*cos(a),.1*sin(a),.0),(.14*cos(a),.14*sin(a),1),.17,.012,3,j,'sponge',False)
 elif id=='encrusting-stromatoporoid':
  for j in range(5):s.mound((.045*cos(j*2),.04*sin(j*2),.02*j),(.32-.022*j,.25-.01*j,.034),'sponge',j+variant,n=72,m=18)
 elif id=='massive-tabulate-coral':
  # A continuous colony: neighboring corallites share rim vertices and walls.
  # Shallow polygonal calices replace independently capped, separated pipes.
  R=.10 if not variant else .14;cell=.004;limit=math.ceil(R/cell)+2
  rims={};edge_use={};corners={}
  def surface(x,y):
   radial=(x/R)**2+(y/(R*.91))**2
   return .018+.075*sqrt(max(0,1-radial*.93))+.003*math.sin(x*25+y*19)+.002*math.cos(x*49-y*16)
  def corner(x,y):
   key=(round(x,7),round(y,7))
   if key not in rims:
    # A shared smooth warp gives irregular polygonal cells without gaps.
    xx=x+.0007*math.sin(x*290+y*73)+.0004*math.cos(y*241-x*91)
    yy=y+.0006*math.cos(y*260-x*47)+.0003*math.sin(x*211+y*131)
    p=(xx,yy,surface(xx,yy));rims[key]=s.vertex(p,'coral',(xx*6,yy*6));corners[rims[key]]=p
   return rims[key]
  for i in range(-limit,limit+1):
   for j in range(-limit,limit+1):
    x=i*cell*1.5;y=(j+(i%2)/2)*cell*sqrt(3)
    theta=math.atan2(y,x);edge=1+.045*math.sin(theta*3+.8)+.026*math.cos(theta*7)
    if (x/R)**2+(y/(R*.91))**2>edge*edge:continue
    outer=[corner(x+cell*cos(k*TAU/6),y+cell*sin(k*TAU/6)) for k in range(6)]
    center=sum((Vector(corners[q]) for q in outer),Vector())/6
    inset=[];bottom=[];depth=.0018+.0007*(.5+.5*math.sin(i*1.13+j*1.77))
    for q in outer:
     v=Vector(corners[q]);p=center+(v-center)*.80;p.z-=.00022
     inset.append(s.vertex(p,'coral',(p.x*6,p.y*6)))
     p=center+(v-center)*.70;p.z-=depth
     bottom.append(s.vertex(p,'oral',(p.x*6,p.y*6)))
    floor=s.vertex((center.x,center.y,center.z-depth*1.10),'oral',(center.x*6,center.y*6))
    for k in range(6):
     n=(k+1)%6;a,b=outer[k],outer[n];edge_use.setdefault(tuple(sorted((a,b))),[]).append((a,b))
     s.face((a,b,inset[n],inset[k]),'coral')
     s.face((inset[k],inset[n],bottom[n],bottom[k]),'coral')
     s.face((bottom[k],bottom[n],floor),'oral')
  # Only the outer perimeter descends to the base. There are no buried tubes.
  low={};base=s.vertex((0,0,.003),'coral')
  for occurrences in edge_use.values():
   if len(occurrences)!=1:continue
   a,b=occurrences[0]
   for q in [a,b]:
    if q not in low:
     x,y,z=corners[q];low[q]=s.vertex((x*.98,y*.98,.003),'coral',(x*6,y*6))
   s.face((b,a,low[a],low[b]),'coral');s.face((low[b],low[a],base),'coral')
 elif id=='branching-tabulate-coral':s.coral_branch((0,0,0),(.1,.0,1),.22,.025,4,variant+2,'coral',True)
 elif id=='solitary-rugose-coral':s.horn((0,0,0),.10,.035,.03 if variant else .013)
 elif id=='colonial-rugose-coral':
  s.mound((0,0,.006),(.10,.098,.009),'coral',n=54,m=12)
  for i in range(-2,3):
   for j in range(-2,3):
    x=i*.038;y=(j+i%2*.5)*.043
    if x*x+y*y<.095**2:s.horn((x,y,0),.065+.035*max(0,1-(x*x+y*y)/.009),.023,.003)
 elif id=='stalked-crinoid':
  H=.46 if not variant else .32
  for j in range(72):
   z=j*H/72;s.columnal((.01*sin(z*5),0,z),.0055,.0054)
  for j in range(5):
   a=j*TAU/5;s.branch((0,0,.008),(.028*cos(a),.028*sin(a),.003),(.07*cos(a),.07*sin(a),-.005),.004,'crinoid',n=14,sides=7)
  s.mound((0,0,H),(.027,.027,.032),'crinoid',n=32,m=20)
  for j in range(5):
   a=j*TAU/5
   for side in [-1,1]:
    ang=a+side*.19;start=Vector((.013*cos(a),.013*sin(a),H+.013));end=Vector((.11*cos(ang),.11*sin(ang),H+.21));bone=s.bone('arm_%d_%d'%(j,side),start,end)
    pts=s.branch(start,(.12*cos(ang),.12*sin(ang),H+.16),end,.0047,'crinoid',bone,n=38,sides=10)
    for k in range(5,37):
     p=pts[k];t=k/37
     for sign in [-1,1]:
      q=p+Vector((cos(ang+pi/2)*sign*.020*(1-t*.55),sin(ang+pi/2)*sign*.020*(1-t*.55),.01))
      s.branch(p,(p+q)/2,q,.0009,'crinoid',bone,n=5,sides=5)
 elif id=='brachiopod-bed':
  for j in range(9 if not variant else 18):
   a=j*2.39996;r=.11*sqrt(j/18);s.shell((r*cos(a),r*sin(a),.015),(.021 if j%2 else .030)*(.82+.25*sin(j*5)**2),'spirifer' if j%2 else 'atrypa')
 elif id=='bryozoan-colony':
  # A growing fenestrate fan: branches bifurcate at staggered levels, while
  # short dissepiments bridge neighbours. No continuous horizontal grille bars.
  rng=random.Random(431);segments=[]
  def fanpoint(x,u):
   return Vector((x*(.025+.19*u**.84),.008*sin(u*5+x*4)+.004*x*x*sin(u*8),u*.24))
  def grow(x0,u0,left,right,level):
   u1=min(1,u0+(.23 if level==0 else .31 if level==1 else .50)+rng.uniform(-.045,.045))
   x1=(left+right)*.5+rng.uniform(-.018,.018)
   pts=[]
   for k in range(28):
    t=k/27;u=u0+(u1-u0)*t;x=x0+(x1-x0)*(t*t*(3-2*t))
    pts.append(fanpoint(x,u))
   radius=.00125*(1-.20*u0);s.tube(pts,[radius*(1-.10*k/27) for k in range(28)],'skeleton',8)
   segments.append((u0,u1,pts))
   for j in range(2,27,3):
    for side in [-1,1]:
     p=pts[j]+Vector((side*radius*.40,-radius*.80,0))
     s.tube([p,p+Vector((0,-.00028,.00008))],[.00034,.00027],'oral',6)
   if u1<.95:
    mid=(left+right)*.5
    grow(x1,u1,left,mid,level+1);grow(x1,u1,mid,right,level+1)
  for j in range(4):grow((j/3-.5)*.35,.035,(j/4-.5),(j+1)/4-.5,0)
  for row in range(1,27):
   u=row/28
   active=[]
   for lo,hi,pts in segments:
    if lo+.014<u<hi-.012:
     f=(u-lo)/(hi-lo)*27;k=min(26,int(f));active.append(pts[k].lerp(pts[k+1],f-k))
   active.sort(key=lambda p:p.x)
   for j in range(len(active)-1):
    if rng.random()<.075:continue
    a=active[j];b=active[j+1];b=b+Vector((0,0,.0006*sin(j*3+row)))
    if b.x-a.x>.021:continue
    pts=[a.lerp(b,t)+Vector((0,.00025*sin(pi*t),.00065*sin(pi*t)*sin(row+j))) for t in linspace(0,1,7)]
    s.tube(pts,.00072,'skeleton',6)
  s.mound((0,0,.004),(.010,.006,.005),'skeleton',rough=.07,n=24,m=16)
 elif id=='gastropod-shells':
  # Logarithmic tube surface; aperture left genuinely open with visible lip and dark interior.
  for shell in range(2):
   rows=[];n=170;m=36
   for i in range(n+1):
    t=i/n;theta=t*TAU*(2.2 if shell==0 else 4.7);r=.0017*exp(t*2.7);rr=.0016*exp(t*2.7);z=(.068 if shell else .020)*(1-(exp(t*2.7)-1)/(exp(2.7)-1))
    c=Vector((shell*.13+r*cos(theta),r*sin(theta),z+.012));out=Vector((cos(theta),sin(theta),0));row=[]
    for j in range(m):
     a=j*TAU/m;ridge=1+.013*sin(t*190);row.append(s.vertex(c+rr*ridge*(out*cos(a)+Vector((0,0,sin(a)))),'shell',(j/m,t)))
    rows.append(row)
   for i in range(n):
    for j in range(m):s.face((rows[i][j],rows[i][(j+1)%m],rows[i+1][(j+1)%m],rows[i+1][j]),'shell')
   s.face(tuple(reversed(rows[0])),'shell')
   # Recessed inner whorl surface and turned lip.
   lip=[s.vertex(Vector(s.v[i])*.97+Vector((shell*.13*.03,0,.0005)),'shell_inside') for i in rows[-1]]
   for j in range(m):s.face((rows[-1][j],rows[-1][(j+1)%m],lip[(j+1)%m],lip[j]),'shell_inside')
 elif id=='small-bivalves':
  for j in range(3):s.shell((j*.063,0,.016),.048,'bivalve',.30 if j==2 else 0)
 elif id=='rhynia':
  for j in range(7 if not variant else 15):
   a=j*2.39996;base=Vector((.045*cos(a)*sqrt(j/8),.045*sin(a)*sqrt(j/8),0));H=.16+.025*sin(j*4);s.branch((0,0,-.002),base*.5+Vector((0,0,-.003)),base,.0018,'stalk',n=10);fork=base+Vector((.005,0,H*.58));s.branch(base,(base+fork)/2,fork,.0018,'stalk',n=14)
   for sign in [-1,1]:
    tip=fork+Vector((sign*.016,.004*sin(j),H*.42));bone=s.bone('shoot_%d_%d'%(j,sign),fork,tip);s.branch(fork,(fork+tip)/2,tip,.0013,'stalk',bone,n=12)
    s.tube([tip+Vector((0,0,z)) for z in [0,.002,.008,.015,.017]],[.001,.0024,.0028,.0018,.0003],'stalk',10,bone)
  s.branch((-.06,0,-.002),(0,0,0),(.06,0,-.002),.002,'stalk',n=20)
 elif id=='asteroxylon':
  for j in range(4 if not variant else 7):
   a=j*2.39996;base=Vector((.035*cos(a),.035*sin(a),0));H=.27+.05*sin(j);tip=base+Vector((.025*cos(a),.025*sin(a),H));bone=s.bone('shoot_%d'%j,base,tip);pts=s.branch(base,(base+tip)/2,tip,.004,'stalk',bone,n=45)
   for k in range(4,43):
    p=pts[k]
    for q in range(4):
     aa=q*TAU/4+k*.76;e=p+Vector((.014*cos(aa),.014*sin(aa),.008));s.ribbon(s.path(p,(p+e)/2+Vector((0,0,.002)),e,6),.002,'foliage',bone,n=2)
   for sign in [-1,1]:s.branch(base,base+Vector((sign*.04,0,-.01)),base+Vector((sign*.08,.02,-.06)),.002,'stalk',n=20)
 elif id=='cladoxylopsid-tree':s.tree('clado',variant)
 elif id=='archaeopteris':s.tree('archaeo',variant)
 elif id=='marine-algae':
  # Forked flattened thalli, informed by the Late Devonian Waterloo Farm algal remains.
  def thallus(a,d,L,w,depth,bone):
   a=Vector(a);d=Vector(d).normalized();pts=s.path(a,a+d*L*.5+Vector((0,.005,0)),a+d*L,24);rows=[]
   for k,p in enumerate(pts):
    t=k/23;ww=w*(.86+.14*sin(pi*t));ww*=max(.06,min(1,(1-t)*8)) if depth==0 else 1
    tangent=(pts[min(k+1,23)]-pts[max(0,k-1)]).normalized();side=tangent.cross(Vector((0,1,0))).normalized()
    rows.append([s.vertex(p+side*ww*v+Vector((0,.002*sin(t*8)*(1-v*v),0)),'stalk',((v+1)/2,t),bone) for v in linspace(-1,1,7)])
   for k in range(23):
    for q in range(6):s.face((rows[k][q],rows[k][q+1],rows[k+1][q+1],rows[k+1][q]),'stalk')
   if depth:
    for sign in [-1,1]:thallus(pts[-1],d+Vector((sign*.5,.1*sin(depth),0)),L*.70,w*.68,depth-1,bone)
  for j in range(3):
   start=Vector(((j-1)*.04,.02*sin(j),0));end=start+Vector((.02*sin(j),0,.27 if not variant else .18));bone=s.bone('thallus_%d'%j,start,end)
   thallus(start,end-start,.095 if not variant else .06,.006 if not variant else .009,2 if not variant else 3,bone)
 elif id in ['carbonate-outcrop','reef-framework','carbonate-rubble','large-boulder']:
  if id=='carbonate-outcrop':s.rock((0,0,.19),(.9,.65,.35 if not variant else .7),'carbonate',variant,rough=.17,n=96,m=48)
  if id=='reef-framework':
   for j in range(8):
    a=j*2.39996;s.rock((.35*cos(a),.3*sin(a),.14+j*.055),(.40,.28,.21),'carbonate',j,rough=.13,n=40,m=24)
  if id=='carbonate-rubble':
   for j in range(14):
    a=j*2.39996+variant*.67;r=.4*sqrt(j/14)*(1+variant*.2*sin(j*2));s.rock((r*cos(a),r*sin(a),.03),(.04+.035*sin(j+variant)**2,.043,.045),'carbonate',j+variant*19,rough=.21,n=20,m=14)
  if id=='large-boulder':s.rock((0,0,.30),(.66,.55,.55),'rock',variant+3,rough=.14,n=92,m=48)
 elif id=='fine-sediment-bed':s.terrain('mud',variant)
 elif id=='sand-pebble-bed':
  s.terrain('sand',variant)
  for j in range(85 if not variant else 150):
   x=random.uniform(-.95,.95);y=random.uniform(-.95,.95);r=random.uniform(.007,.04);s.rock((x,y,.027), (r,r*.7,r*.6),'rock',j,rough=.08,subdivisions=2)
 elif id=='eroded-bank':s.terrain('bank',variant)
 elif id=='shell-hash':
  for j in range(28):
   a=j*2.39996;r=.16*sqrt(j/28);s.shell((r*cos(a),r*sin(a),.01+random.random()*.008),(random.uniform(.009,.016) if j%2 else random.uniform(.014,.039)),'spirifer' if j%2 else 'bivalve',fragment=True)
 elif id=='crinoid-debris':
  for j in range(40):
   a=j*2.39996;r=.10*sqrt(j/40);s.columnal((r*cos(a),r*sin(a),.003),.004+.001*sin(j)**2,.003)
  for j in range(3):
   for k in range(8):s.columnal((j*.024-.03,.03,k*.003+.001),.004,.0028)
 elif id=='submerged-log':s.log(variant)
 elif id=='organic-remains':
  # Derive real reconstructed plates from the reviewed creature, preserving their geometry.
  source=LOCAL/'remains-source.glb'
  if not source.exists():source=ROOT/'public/assets/devonian/creatures/dunkleosteus.glb'
  before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(source));imported=set(bpy.data.objects)-before
  bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
  wanted=['inferognathal_cutting_blade_1','inferognathal_cutting_blade_-1','posterior_supragnathal_blade_1','posterior_supragnathal_blade_-1']
  for j,name in enumerate(wanted):
   obj=next(o for o in imported if o.name==name);coords=np.array([tuple(obj.matrix_world@v.co) for v in obj.data.vertices]);center=coords.mean(axis=0);local=coords-center
   values,axes=np.linalg.eigh(np.cov(local.T));normal=Vector(axes[:,0]);rotation=normal.rotation_difference(Vector((0,0,1)));placed=np.array([tuple(rotation@Vector(p)) for p in local]);angle=j*1.37
   xy=placed[:,:2].copy();placed[:,0]=xy[:,0]*cos(angle)-xy[:,1]*sin(angle);placed[:,1]=xy[:,0]*sin(angle)+xy[:,1]*cos(angle)
   placed[:,0]+=(j%2-.5)*.73;placed[:,1]+=(j//2-.5)*.62;placed[:,2]-=placed[:,2].min()-.004
   offset=len(s.v)
   for v in placed:
    idx=s.vertex(v,'skeleton',(float(v[0])*5,float(v[1])*5));p=Vector(v);stain=.65+.35*noise(p*15+Vector((j*3,7,4)));tint=np.array((.24,.19,.115))*stain;s.c[idx]=(*tint,1)
   for poly in obj.data.polygons:s.face([offset+i for i in poly.vertices],'skeleton')
  for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
 elif id=='root-bearing-bank':
  s.terrain('rootbank',variant)
  s.tube([(0,.4,.89),(0,.4,1.06),(0,.4,1.21)],[.16,.15,.135],'bark',32,ridge=.06)
  s.disk((0,.4,1.212),.128,.009,'wood')
  for j in range(8):
   a=j*TAU/8;start=(.08*cos(a),.08*sin(a)+.4,1.0);end=(1.2*cos(a),.5+1.2*sin(a),.18 if sin(a)<0 else .8)
   pts=s.branch(start,(end[0]*.7,end[1],.48),end,.085,'bark',n=36,sides=14)
   for k in [-1,1]:s.branch(pts[22],Vector(end)+Vector((0,k*.13,-.05)),Vector(end)+Vector((.25*cos(a+k*.6),.25*sin(a+k*.6),-.13)),.025,'bark',n=20,sides=8)
 else:raise ValueError(id)
 metric_factor={'branching-stromatoporoid':.20,'branching-tabulate-coral':.25,'colonial-rugose-coral':.45,'bryozoan-colony':.25}.get(id,1)
 if metric_factor!=1:s.v=[tuple(c*metric_factor for c in v) for v in s.v]
 return s

FAMILIES=[
('B01','massive-stromatoporoid','Massive stromatoporoid','Clathrodictyon-type massive sponge','attached','Devonian Columbus Formation, Ontario comparative reference','Low irregular skeletal dome with mamelons and astrorhizal surface grooves; living surface colour inferred.',2),
('B02','branching-stromatoporoid','Branching stromatoporoid','Amphipora-type branching sponge','attached','Middle–Late Devonian reef-lagoon form; regional placement requires review','Slender gradually tapering branches; no coral polyps or stromatolite bands.',2),
('B03','encrusting-stromatoporoid','Encrusting stromatoporoid','Stromatoporoidea indet. encrusting growth','attached','Devonian carbonate shelf comparative reconstruction','Low successive irregular growth margins with living surfaces distinguished from fossil sections.',2),
('B04','massive-tabulate-coral','Massive tabulate coral','Favosites-type colony','attached','Devonian carbonate shelf; genus-level architecture only','Dense small polygonal corallites form a honeycomb colony; restrained soft covering is artistic.',2),
('B05','branching-tabulate-coral','Branching tabulate coral','Striatopora iowensis comparative form','attached','Middle Devonian Milwaukee Formation, Wisconsin','Ramose bifurcating branches with tapered distal axes and repeated apertures around branches.',2),
('B06','solitary-rugose-coral','Solitary rugose coral','Heliophyllum halli comparative skeleton','attached','Middle Devonian Hamilton/Traverse records, North America','Curved horn with incremental ridges, deep calyx and radial septa. This is an exposed skeleton, not a claim of living polyp anatomy.',2),
('B07','colonial-rugose-coral','Colonial rugose coral','Hexagonaria-type colony','attached','Middle Devonian North American shelf reference','Connected compact corallites with large radial calices, distinct from small tabulate honeycomb.',1),
('B08','stalked-crinoid','Stalked crinoid','Pinnulate camerate-type crinoid, indeterminate','attached','Devonian marine shelf; comparative crinoid anatomy, not Hunsrück species claim','Jointed column with lumen, attachment holdfast, calyx and five bifurcating pinnulate feeding rays.',2),
('B09','brachiopod-bed','Brachiopod bed','Mucrospirifer mucronatus and atrypide comparative forms','attached','Middle Devonian Hamilton fauna, North America','Paired dorsal/ventral valves with bilateral symmetry, hinge wings, radial ribs and median fold; shell widths about 3–5 cm.',2),
('B10','bryozoan-colony','Fenestrate bryozoan','Fenestrate bryozoan indet.','attached','Devonian marine shelf comparative growth form','Fine mesh colony with zooid-bearing longitudinal branches and connecting crossbars; not a coral fan.',1),
('B11','gastropod-shells','Small gastropod shells','Platyceratid and loxonematid comparative shell forms','biological-prop','Devonian North American shelly fauna reference','Two logarithmically coiled shells, broad low-spired and tall-spired, with open apertures. No uncertain living tissue.',1),
('B12','small-bivalves','Small bivalves','Modiomorpha-type comparative valves','biological-prop','Devonian North American shelf reference','Elongate paired left/right valves with growth sculpture and open empty-shell variant.',1),
('P01','rhynia','Rhynia-type early vegetation','Rhynia gwynne-vaughanii comparative sporophytes','plant','Early Devonian Rhynie chert, Scotland','Small leafless dichotomizing axes, creeping basal axis and terminal spindle-shaped sporangia. Not grass.',2),
('P02','asteroxylon','Asteroxylon','Asteroxylon mackiei','plant','Early Devonian Rhynie chert, Scotland','Leafy shoot axes bear narrow appendages; separate root-bearing and downward rooting axes. Roots lacked modern root caps.',2),
('P03','cladoxylopsid-tree','Cladoxylopsid tree','Eospermatopteris/Wattieza architectural reconstruction','plant','Middle Devonian Gilboa, New York reference','Bulbous trunk base, numerous small unbranched rootlets and a terminal crown of divided leafless branch systems.',2),
('P04','archaeopteris','Archaeopteris','Archaeopteris architectural reconstruction','plant','Middle–Late Devonian forest reference, New York comparative roots','Woody tapering trunk, hierarchical branching roots and lateral boughs bearing divided leafy axes with approximately 2 cm fan-shaped pinnules. Spore-bearing, no flowers.',2),
('P05','marine-algae','Marine algal thalli','Yeaia/Hungerfordia-type comparative thalli','plant','Late Devonian Waterloo Farm, South Africa comparative reference; not assigned to every marine scene','Flattened dichotomous strap and rounded terminal thallus forms informed by marine algal remains. Attachment, three-dimensional posture and pigmentation remain inferred.',2),
('G01','carbonate-outcrop','Carbonate outcrop','Weathered submerged carbonate','geology','Carbonate shelf, regional mineral colouring configurable','Irregular low and high weathered masses with natural relief and granular material.',2),
('G02','reef-framework','Reef framework','Carbonate reef framework section','geology','Devonian stromatoporoid/coral reef context; locality not asserted','Intergrown mounds and stepped carbonate ledges leave crevices and overhangs.',1),
('G03','carbonate-rubble','Carbonate rubble','Weathered carbonate fragments','geology','Marine carbonate substrate','Assorted centimetre-scale irregular fragments, muted freshly exposed interiors.',2),
('G04','fine-sediment-bed','Fine sediment bed','Fine mud and silt surface','geology','Marine or freshwater fine-bottom context','Low broad sediment module with shallow ripples, smooth variant and tiny disturbed relief.',2),
('G05','sand-pebble-bed','Sand and pebble bed','Rippled sand with dispersed pebbles','geology','Shallow-water coarse/fine sediment transition','Natural ripple relief and two pebble density mixes at centimetre scale.',2),
('G06','eroded-bank','Eroded bank','Unrooted channel margin','geology','Fluvial channel context, age-neutral geology','Sloping eroded sediment face with layered staining and surface irregularity.',1),
('G07','large-boulder','Large boulder','Weathered silicate rock','geology','Regional lithology requires placement review','Coherent uneven rock masses with muted silicate grain pigmentation.',2),
('G08','shell-hash','Shell hash','Derived B09/B12 shell fragments','biological-prop','Shelly Devonian sediment context','Broken ribbed brachiopod and bivalve valves derived from the same shell builders; real centimetre scale.',1),
('G09','crinoid-debris','Crinoid debris','Derived B08 columnals','biological-prop','Crinoid-bearing Devonian sediment context','Loose perforated columnals and short stacked stem fragments from the B08 anatomy.',1),
('G10','submerged-log','Submerged woody log','Archaeopteris-derived wood','organic-prop','Later Devonian wooded waterway only','Tapered woody trunk and branches with axial bark relief and ragged broken fibres.',1),
('G12','organic-remains','Disarticulated gnathal fragments','Dunkleosteus terrelli reconstructed cutting elements','organic-prop','Late Devonian Cleveland Shale reference','Four paired lower and posterior upper gnathal cutting fragments derived from the reviewed V2 Dunkleosteus asset at its representative scale. These interpreted fragments do not represent complete skeletal bones; no invented long bones or soft carcass.',1),
('G11','root-bearing-bank','Root-bearing bank','Archaeopteris-type roots in bank','organic-prop','Later Devonian wooded waterway only','Hierarchical lateral roots embedded into a channel bank; no invented mangrove pneumatophores.',1),
]
REFS={
'B01':['https://www.digitalatlasofancientlife.org/learn/porifera/stromatoporoidea/'],
'B02':['https://palass.org/publications/palaeontology-journal/archive/40/3/article_pp833-854'],
'B03':['https://onlinelibrary.wiley.com/doi/full/10.1111/j.1475-4983.2011.01037.x'],
'B04':['https://www.digitalatlasofancientlife.org/vc/cnidaria/anthozoa/tabulata/','https://collections.geoscienze.unipd.it/favosites'],
'B05':['https://devonianatlas.org/species/striatopora-iowensis/'],
'B06':['https://devonianatlas.org/species/heliophyllum-halli/'],
'B07':['https://umorf.ummp.lsa.umich.edu/wp/mi-backyard-fossils-corals/'],
'B08':['https://www.digitalatlasofancientlife.org/learn/echinodermata/crinoidea/','https://devonianatlas.org/species/'],
'B09':['https://devonianatlas.org/species/mucrospirifer-mucronatus/','https://devonianatlas.org/taxonomic-groups/brachiopods/'],
'B10':['https://www.digitalatlasofancientlife.org/learn/bryozoa/','https://data.wgnhs.wisc.edu/pubshare/B021.pdf'],
'B11':['https://devonianatlas.org/species/'], 'B12':['https://devonianatlas.org/species/'],
'P01':['https://pmc.ncbi.nlm.nih.gov/articles/PMC5745331/'],
'P02':['https://pmc.ncbi.nlm.nih.gov/articles/PMC8384418/'],
'P03':['https://pmc.ncbi.nlm.nih.gov/articles/PMC8409631/'],
'P04':['https://www.nature.com/articles/19516','https://pmc.ncbi.nlm.nih.gov/articles/PMC8409631/','https://orca.cardiff.ac.uk/id/eprint/10078/1/Berry%202000.pdf'],
'P05':['https://doi.org/10.1016/0034-6667(95)00062-3'],
'G12':['https://www.palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction','https://doi.org/10.3390/d15030318'],
}

def normalmap():
 path=HERE/'microrelief-normal-v2.png'
 if not path.exists():
  # Seeded isotropic stochastic relief; no directional sine waves or moire bands.
  n=1024;rng=np.random.default_rng(64138);h=np.zeros((n,n));fy,fx=np.meshgrid(np.fft.fftfreq(n),np.fft.fftfreq(n),indexing='ij');radius=np.sqrt(fx*fx+fy*fy)
  for scale,amplitude in [(.018,.20),(.045,.10),(.11,.035)]:
   field=np.fft.ifft2(np.fft.fft2(rng.normal(size=(n,n)))*np.exp(-(radius/scale)**2)).real
   h+=field/(field.std()+1e-9)*amplitude
  dx=(np.roll(h,-1,1)-np.roll(h,1,1))*.55;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*.55
  nrm=np.stack([-dx,-dy,np.ones_like(dx)],-1);nrm/=np.linalg.norm(nrm,axis=-1,keepdims=True);rgba=np.concatenate([nrm*.5+.5,np.ones((n,n,1))],-1).astype('float32')
  im=bpy.data.images.new('Original isotropic dermal and mineral microrelief',width=n,height=n);im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(path);im.file_format='PNG';im.save()
 return path

def materials():
 normal=bpy.data.images.load(str(normalmap()),check_existing=True);normal.colorspace_settings.name='Non-Color';normal.pack();out=[]
 for name in PALETTE:
  mat=bpy.data.materials.new('devonian_'+name);mat.use_nodes=True;mat.diffuse_color=(*PALETTE[name],1);mat.use_backface_culling=False
  nodes=mat.node_tree.nodes;bs=nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value={'sponge':.62,'coral':.68,'foliage':.51,'shell':.54,'shell_inside':.43,'oral':.43,'carbonate':.87,'rock':.85,'bark':.84,'wood':.79}.get(name,.76);bs.inputs['Metallic'].default_value=0
  vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
  tex=nodes.new('ShaderNodeTexImage');tex.image=normal;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.20 if name in ['foliage','oral'] else .36;mat.node_tree.links.new(tex.outputs['Color'],nm.inputs['Color']);mat.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal']);out.append(mat)
 return out

def make_mesh(s,id):
 mesh=bpy.data.meshes.new(id+'_sculpt');mesh.from_pydata(s.v,[],s.f);mesh.update();obj=bpy.data.objects.new(id,mesh);bpy.context.collection.objects.link(obj)
 for mat in materials():mesh.materials.append(mat)
 col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(s.c,dtype=np.float32).ravel())
 uv=mesh.uv_layers.new(name='Surface');
 for p,mi in zip(mesh.polygons,s.mi):p.material_index=mi;p.use_smooth=True
 for l in mesh.loops:uv.data[l.index].uv=s.uv[l.vertex_index]
 if not s.bones:return obj,None
 data=bpy.data.armatures.new(id+'_skeleton');rig=bpy.data.objects.new(id+'_rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT');root=data.edit_bones.new('root');root.head=(0,0,0);root.tail=(0,0,.01)
 for name,(head,tail,parent) in s.bones.items():b=data.edit_bones.new(name);b.head=head;b.tail=tail;b.parent=data.edit_bones.get(parent)
 bpy.ops.object.mode_set(mode='OBJECT')
 for name in ['root']+list(s.bones):
  ids=[i for i,b in enumerate(s.b) if b==name]
  if ids:obj.vertex_groups.new(name=name).add(ids,1,'REPLACE')
 mod=obj.modifiers.new('Anatomical_sway','ARMATURE');mod.object=rig;obj.parent=rig
 rig.animation_data_create();act=bpy.data.actions.new('Idle');rig.animation_data.action=act
 for frame in range(1,122,3):
  t=(frame-1)/120
  for j,name in enumerate(s.bones):
   pb=rig.pose.bones[name];pb.rotation_mode='XYZ';amp=.024 if id not in ['stalked-crinoid','marine-algae'] else .045;pb.rotation_euler=(amp*(sin(TAU*t+j*.7)-sin(j*.7)),amp*.6*(sin(TAU*t+j*.4)-sin(j*.4)),amp*.3*sin(TAU*t));pb.keyframe_insert('rotation_euler',frame=frame,group=name)
 track=rig.animation_data.nla_tracks.new();track.name='Idle';track.strips.new('Idle',1,act);rig.animation_data.action=None;bpy.context.scene.frame_set(1)
 return obj,rig

def bounds(objs):
 pts=[o.matrix_world@Vector(v) for o in objs if o.type=='MESH' for v in o.bound_box];mn=Vector(tuple(min(p[i] for p in pts) for i in range(3)));mx=Vector(tuple(max(p[i] for p in pts) for i in range(3)));return mn,mx

def render(id,objs,variant=False):
 scene=bpy.context.scene;mn,mx=bounds(objs);c=(mn+mx)/2;size=mx-mn;r=size.length/2
 camera=bpy.data.objects.new('Specimen_camera',bpy.data.cameras.new('Specimen_camera'));scene.collection.objects.link(camera);camera.location=c+Vector((1.4,-2.0,1.2)).normalized()*r*4;camera.rotation_euler=(c-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=max(size.z*.98,size.x*.95,size.y*.95,r*1.65)*1.35;scene.camera=camera
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=int(os.environ.get('DEVONIAN_PROP_SAMPLES','24'));scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
 scene.world.color=(.18,.18,.18)
 for j,(direction,color,power) in enumerate([((1,-1,2),(1,.88,.70),500),((-1,-.5,1),(.62,.83,1),380),((0,1,1.5),(.90,1,.83),600)]):
  data=bpy.data.lights.new('Studio_%d'%j,'AREA');o=bpy.data.objects.new(data.name,data);scene.collection.objects.link(o);o.location=c+Vector(direction)*r*2;data.energy=power*r*r*.35;data.shape='DISK';data.size=r*2;o.rotation_euler=(c-o.location).to_track_quat('-Z','Y').to_euler()
 scene.view_settings.view_transform='AgX';scene.render.filepath=str(OUT/(id+'.png'));bpy.ops.render.render(write_still=True)
 # A second orthogonal view proves fine structure on the source review board.
 camera.location=c+Vector((-.1,-2,.35)).normalized()*r*4;camera.rotation_euler=(c-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.filepath=str(LOCAL/id/'lateral.png');bpy.ops.render.render(write_still=True)

def restore_vertex_colors(filepath,obj):
 # Blender5.2 can emit white COLOR_0 on later primitives of a joined mesh.
 # Restore those values from the authored POINT Color layer, matched in export coordinates.
 raw=bytearray(Path(filepath).read_bytes());jslen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jslen]);binary_start=20+jslen+8;trees={};colors=obj.data.color_attributes['Color'];total=0
 def data(accessor_index):
  a=doc['accessors'][accessor_index];view=doc['bufferViews'][a['bufferView']];fmt,width={5121:('B',1),5123:('H',2),5126:('f',4)}[a['componentType']];n={'VEC3':3,'VEC4':4}[a['type']];stride=view.get('byteStride',n*width);offset=binary_start+view.get('byteOffset',0)+a.get('byteOffset',0);return a,fmt,width,n,stride,offset
 for mesh in doc['meshes']:
  for primitive in mesh['primitives']:
   if 'COLOR_0' not in primitive['attributes']:raise ValueError('Missing vertex colour')
   ca,cf,cw,cn,cs,co=data(primitive['attributes']['COLOR_0']);scale=65535 if ca['componentType']==5123 else 255 if ca['componentType']==5121 else 1
   existing=[struct.unpack_from('<'+cf*cn,raw,co+i*cs) for i in range(ca['count'])]
   if not all(all(v>=scale*.999 for v in q[:3]) for q in existing):continue
   material=doc['materials'][primitive['material']]['name'];slot=next(i for i,m in enumerate(obj.data.materials) if m.name==material)
   if slot not in trees:
    vertices=set(v for poly in obj.data.polygons if poly.material_index==slot for v in poly.vertices);tree=KDTree(len(vertices))
    for v in sorted(vertices):p=obj.data.vertices[v].co;tree.insert((p.x,p.z,-p.y),v)
    tree.balance();trees[slot]=tree
   pa,pf,pw,pn,ps,po=data(primitive['attributes']['POSITION']);assert pa['count']==ca['count']
   for i in range(pa['count']):
    p=struct.unpack_from('<fff',raw,po+i*ps);_,idx,distance=trees[slot].find(p);assert distance<max(obj.dimensions)*1e-4+1e-6,(material,distance)
    color=colors.data[idx].color;values=[float(v) if cf=='f' else round(max(0,min(1,v))*scale) for v in color]
    struct.pack_into('<'+cf*cn,raw,co+i*cs,*values[:cn]);total+=1
 Path(filepath).write_bytes(raw)
 if total:print('Restored authored vertex pigmentation:',Path(filepath).name,total,flush=True)

def export(id,obj,rig,lod=False):
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
 if rig:rig.select_set(True)
 bpy.context.view_layer.objects.active=obj
 bpy.ops.export_scene.gltf(filepath=str(OUT/(id+('.lod1' if lod else '')+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_yup=True,export_extras=True,export_apply=False,export_texcoords=True,export_normals=True,export_vertex_color='NAME',export_vertex_color_name='Color',export_all_vertex_colors=False)
 restore_vertex_colors(OUT/(id+('.lod1' if lod else '')+'.glb'),obj)

def main():
 requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 entries=[]
 for code,id,name,taxon,cat,provenance,desc,count in FAMILIES:
  if requested and id not in requested and not any(q.startswith(id+'-v') for q in requested):continue
  variant_entries=[]
  for variant in range(count):
   vid=id if variant==0 else id+'-v%d'%(variant+1)
   if requested and id not in requested and vid not in requested:continue
   print('BUILDING',vid,flush=True);bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
   s=build_family(id,variant);obj,rig=make_mesh(s,vid);scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=121;scene.frame_set(1);bpy.context.view_layer.update();mn,mx=bounds([obj]);dimensions=list(mx-mn);(LOCAL/vid).mkdir(exist_ok=True)
   bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/vid/(vid+'.blend')))
   if id in ['cladoxylopsid-tree','archaeopteris']:
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);opt=obj.modifiers.new('Game_detail_optimization','DECIMATE');opt.ratio=.25 if id=='archaeopteris' else .40;bpy.ops.object.modifier_apply(modifier=opt.name);obj.data.validate(clean_customdata=False);obj.data.update()
   export(vid,obj,rig)
   full=sum(len(p.vertices)-2 for p in obj.data.polygons)
   render(vid,[obj],variant>0)
   bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);dec=obj.modifiers.new('Genuine_LOD_reduction','DECIMATE');dec.ratio=.30;bpy.ops.object.modifier_apply(modifier=dec.name);obj.data.validate(clean_customdata=False);obj.data.update();reduced=sum(len(p.vertices)-2 for p in obj.data.polygons);export(vid,obj,rig,True)
   item={'id':vid,'family':code,'name':name+(' — variant %d'%(variant+1) if variant else ''),'taxon':taxon,'category':cat,'description':desc,'provenance':provenance,'model':'assets/devonian/props/'+vid+'.glb','lod':'assets/devonian/props/'+vid+'.lod1.glb','image':'assets/devonian/props/'+vid+'.png','lengthMeters':max(dimensions),'dimensionsMeters':{'x':dimensions[0],'y':dimensions[2],'z':dimensions[1]},'clips':['Idle'] if rig else [],'looping':['Idle'] if rig else [],'sources':REFS.get(code,[]),'notes':['Original parametric mesh, no downloaded model.','1 glTF unit = 1 metre. Dimensions describe this art specimen, not a taxon maximum.','Pigmentation and soft appearance are artistic interpretations.','Locality tags constrain future placement; library membership does not assert co-occurrence.'],'fullTriangles':full,'lodTriangles':reduced,'lodRatio':reduced/full,'sourceBlend':'../devonian-authoring/props/'+vid+'/'+vid+'.blend'}
   (OUT/(vid+'.json')).write_text(json.dumps(item,indent=2)+'\n');variant_entries.append(vid)
  entries.append(variant_entries)
 allprops=[json.loads(p.read_text()) for p in sorted(OUT.glob('*.json')) if p.name!='manifest.json' and isinstance(json.loads(p.read_text()),dict) and 'model' in json.loads(p.read_text())]
 allprops.sort(key=lambda x:({'B':0,'P':1,'G':2}.get(x['family'][0],3),x['family'],x['id']))
 (OUT/'manifest.json').write_text(json.dumps({'schemaVersion':1,'era':'devonian','units':'metres','props':allprops},indent=2)+'\n')
 print('COMPLETE',entries,flush=True)
if __name__=='__main__':main()
