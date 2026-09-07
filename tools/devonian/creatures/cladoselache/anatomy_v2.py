"""Cladoselache-specific compound surfaces; dimensions are reconstruction choices, not scans."""
import math,numpy as np
from math import sin,cos,pi,exp
from mathutils import Vector
SECTIONS=[(-2.24,.242,.044,-.064),(-2.10,.305,.145,-.025),(-1.88,.390,.248,.018),(-1.60,.424,.294,.026),(-1.25,.428,.333,.020),(-.88,.443,.374,.009),(-.35,.449,.402,0),(.22,.412,.382,0),(.83,.328,.318,.006),(1.4,.221,.236,.008),(1.96,.113,.138,.022),(2.45,.066,.097,.035),(2.72,.010,.025,.055)]
def smooth(t):t=np.clip(t,0,1);return t*t*(3-2*t)
def section(y):
 if y<=SECTIONS[0][0]:return np.array(SECTIONS[0][1:])
 for k in range(len(SECTIONS)-1):
  if SECTIONS[k][0]<=y<=SECTIONS[k+1][0]:
   a=np.array(SECTIONS[k]);b=np.array(SECTIONS[k+1]);t=(y-a[0])/(b[0]-a[0]);pre=np.array(SECTIONS[max(0,k-1)]);post=np.array(SECTIONS[min(len(SECTIONS)-1,k+2)]);d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(SECTIONS[-1][1:])
def gill(y,a):
 side=abs(cos(a))**5;vertical=smooth((sin(a)+.72)/.12)*smooth((.60-sin(a))/.14);v=0
 for k in range(5):
  line=-1.22+.117*k+.045*sin(a+.4)+.025*cos(2*a);v+=exp(-((y-line)/.016)**2)
 return min(1,v)*side*vertical

def surf(y,a):
 w,h,z=section(y);s=sin(a);c=cos(a)
 # Narrow V-shaped terminal jaw from below; short blunt nasal roof above.
 forward=exp(-((y+2.24)/.17)**2);yy=y+(.25*abs(c)**1.75+.070)*forward-.105*exp(-((y+2.08)/.16)**2)*max(0,s)**1.5
 x=w*c;zz=z+h*s
 # Compound snout, cheek and roof transitions: no added orbital pads.
 cheek=exp(-((y+1.58)/.42)**2);x*=1+.042*cheek*(1-s*s)
 zz+=.024*exp(-((y+1.74)/.26)**2)*max(0,s)**3*(.3+.7*c*c)
 zz-=.020*exp(-((y+1.1)/.30)**2)*max(0,-s)**3
 # Five restrained inset branchial clefts in the continuous skin.
 inset=.009*gill(y,a);x-=math.copysign(inset,x);zz-=inset*s*.35
 # A subtle peduncular keel changes the real cross section, not a surface cord.
 x+=math.copysign(.040*exp(-((y-2.22)/.29)**2)*exp(-(s/.18)**2),x)
 return Vector((x,yy,zz))
def bw(y,a=0):
 if y<-.65:
  jaw=smooth((-sin(a)-.02)/.48)*smooth((-y-1.1)/.65);branch=.13*gill(y,a)*(1-jaw);side='L'if cos(a)>0 else'R';return {'jaw':float(jaw),'gill'+side:float(branch),'skull':float(1-jaw-branch)}
 if y<.15:
  t=float(smooth((y+.75)/.35));return {'skull':1-t,'body':t}
 q=min(5,(y-.15)/.5);i=int(q);f=float(smooth(q-i));return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<5 else{'tail5':1}
def make(g):
 vertex,face,grid,tube,bone=(g[k]for k in ['vertex','face','grid','tube','bone']);g['sections']=SECTIONS;g['surf']=surf;g['bw']=bw
 n=128;ys=np.unique(np.r_[np.linspace(-2.24,2.72,210),*[np.linspace(-1.22+.117*k-.048,-1.22+.117*k+.048,11)for k in range(5)]])
 body=grid(len(ys),n,lambda i,j:vertex(surf(float(ys[i]),2*pi*j/n-pi/2),(1,1,1),bw(float(ys[i]),2*pi*j/n-pi/2),(j/n,.8*(ys[i]+2.24)/4.96),False),0,True);face(body[-1],0)
 # The same mouth aperture continues into a real palate, cheeks and weighted floor.
 # A long gradually contracting pharyngeal passage ends deep inside the body.
 def oralPoint(t,a):
  s=sin(a);front=surf(-2.24,a);width=.242*(1-.84*t);height=.044+.10*sin(pi*t)**1.4
  p=Vector((width*cos(a),front.y+(1.37-.25*abs(cos(a))**1.75)*t,-.064+height*s-.035*t))
  relief=.006*sin(6*a+.5)**2*sin(pi*t)**2;p.x*=1+relief;p.z+=relief*s
  p=p.lerp(Vector((p.x*.07,p.y,p.z*.07-.11)),float(smooth((t-.83)/.17)))
  return front.lerp(p,float(smooth(t/.09)))
 def oralWeight(t,a):
  jaw=float(smooth((-sin(a)-.02)/.48)*(1-smooth((t-.32)/.53)));throat=.18*sin(pi*t)**2*(1-jaw)
  return {'jaw':jaw,'throat':throat,'skull':1-jaw-throat}
 mouth=[]
 for i in range(49):
  t=i/48;row=[]
  for j in range(n):
   a=2*pi*j/n-pi/2;row.append(vertex(oralPoint(t,a),(1,1,1),oralWeight(t,a),(j/n,.8+.2*t),False))
  mouth.append(row)
 for i in range(48):
  for j in range(n):face((mouth[i][j],mouth[i+1][j],mouth[i+1][(j+1)%n],mouth[i][(j+1)%n]),0)
 face(reversed(mouth[-1]),0)
 # Cladodont cusps rooted in gum: multiple small accessory cusplets, no cutting blades.
 for upper in [False,True]:
  bn='skull'if upper else'jaw';sg=-1 if upper else 1
  for side in [-1,1]:
   for k in range(8):
    t=(k+.6)/11;a=(pi/2 if upper else -pi/2)+side*(.12+1.30*t)
    # Exact lining parameter and weights keep posterior cusps attached during gape.
    depth=.058;inward=Vector((-cos(a)*.45,.10,-sin(a))).normalized();p=oralPoint(depth,a)-inward*.005;weights=oralWeight(depth,a)
    height=.024+.021*sin(pi*t)**.7
    tangent=Vector((-sin(a),.10,cos(a)*.25)).normalized()
    for shift,mul in [(0,1),(-.010,.38),(.010,.42)]:
     q=p+tangent*shift;tip=q+inward*height*mul+Vector((0,.010*mul,0));tube([q,q.lerp(tip,.32),q.lerp(tip,.72),tip],[.008*mul,.0065*mul,.0035*mul,.0004],(.64,.61,.48),weights,2,8)
 # Large lateral globes seated in the existing cranial surface. No rim geometry.
 for side in [-1,1]:
  c=Vector((side*.322,-1.69,.139));scale=Vector((.115,.157,.150));N=56;R=32;rows=[]
  # Ellipsoid sampled about outward lateral axis; iris/pupil are pigment, not stacked pads.
  for i in range(R+1):
   th=pi*i/R;row=[]
   for j in range(N):
    a=2*pi*j/N;p=c+Vector((side*scale.x*cos(th),scale.y*sin(th)*sin(a),scale.z*sin(th)*cos(a)))
    row.append(vertex(p,(1,1,1),'skull',(j/N,i/R),False))
   rows.append(row)
  for i in range(R):
   for j in range(N):face((rows[i][j],rows[i][(j+1)%N],rows[i+1][(j+1)%N],rows[i+1][j]),3)
 def fin(name,rootA,rootB,edge,base,tip=None,normal=(0,0,1),thick=.05):
  # Smooth span/chord patch with continuous wide roots; no exposed spokes or fan apex.
  a=Vector(rootA);b=Vector(rootB);normal=Vector(normal);edge=list(map(Vector,edge));nr=28;nc=48;rows=[]
  def spline(t):
   q=t*(len(edge)-1);k=min(len(edge)-2,int(q));u=q-k;p0=edge[max(0,k-1)];p1=edge[k];p2=edge[k+1];p3=edge[min(len(edge)-1,k+2)];return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3)
  for side in [-1,1]:
   sheet=[]
   for i in range(nr+1):
    t=i/nr;row=[]
    for j in range(nc+1):
     q=j/nc;root=a.lerp(b,q);end=spline(q);p=root.lerp(end,t);p+=normal*(.035*sin(pi*t)*sin(pi*q)*(.6+t))
     thickness=(thick*(1-t)**1.45+.0018)*sin(pi*q)**.45;p+=normal*side*thickness
     follow=float(smooth((t-.42)/.55))*.75 if tip else 0;rootWeight=1-float(smooth(t/.32));parent=bw(root.y,-.6 if normal.z else pi/2);w={k:v*rootWeight for k,v in parent.items()};w[base]=w.get(base,0)+(1-rootWeight)*(1-follow)
     if tip:w[tip]=w.get(tip,0)+(1-rootWeight)*follow
     uv=(q,t);row.append(vertex(p,(1,1,1),w,uv,False))
    sheet.append(row)
   rows.append(sheet)
   for i in range(nr):
    for j in range(nc):
     f=(sheet[i][j],sheet[i][j+1],sheet[i+1][j+1],sheet[i+1][j]);face(f if side==1 else reversed(f),5)
  for i in range(nr):
   face((rows[0][i][0],rows[1][i][0],rows[1][i+1][0],rows[0][i+1][0]),5);face((rows[0][i+1][-1],rows[1][i+1][-1],rows[1][i][-1],rows[0][i][-1]),5)
  for j in range(nc):
   face((rows[0][-1][j],rows[1][-1][j],rows[1][-1][j+1],rows[0][-1][j+1]),5);face((rows[0][0][j+1],rows[1][0][j+1],rows[1][0][j],rows[0][0][j]),5)
 for side in [-1,1]:
  s='L'if side==1 else'R'
  cv=lambda p:(p[0]*side,p[1],p[2])
  fin('pectoral',cv((.26,-.64,-.21)),cv((.29,.34,-.24)),[cv(p)for p in[(.29,-.64,-.21),(.96,-.29,-.27),(1.48,.15,-.39),(1.43,.42,-.36),(.92,.58,-.29),(.29,.34,-.24)]],'pectoral'+s,'pectoralTip'+s,thick=.058)
  fin('pelvic',cv((.16,1.01,-.17)),cv((.105,1.69,-.13)),[cv(p)for p in[(.16,1.01,-.17),(.50,1.24,-.25),(.69,1.61,-.27),(.48,1.79,-.22),(.105,1.69,-.13)]],'pelvic'+s,thick=.033)
 fin('dorsal',(0,-.35,.32),(0,.73,.28),[(0,-.35,.32),(0,-.08,.90),(0,.10,1.01),(0,.35,.77),(0,.73,.28)],'dorsal',normal=(1,0,0),thick=.042)
 fin('rear',(0,1.00,.22),(0,1.84,.14),[(0,1.00,.22),(0,1.19,.56),(0,1.38,.64),(0,1.60,.40),(0,1.84,.14)],'dorsalRear',normal=(1,0,0),thick=.028)
 # Anterior spine is a stout recurved blade with a buried broad base, not a thin horn.
 fin('spine',(0,-.48,.29),(0,-.01,.36),[(0,-.48,.29),(0,-.37,.68),(0,-.08,.94),(0,-.13,.60),(0,-.01,.36)],'dorsal',normal=(1,0,0),thick=.040)
 # High aspect crescent with slight dorsal extension; broad root envelops peduncle.
 fin('caudal',(0,2.52,.10),(0,2.51,-.025),[(0,2.52,.10),(0,2.82,.57),(0,3.35,1.11),(0,3.44,1.10),(0,3.17,.55),(0,2.95,.08),(0,3.10,-.42),(0,3.43,-.94),(0,3.32,-.91),(0,2.80,-.43),(0,2.51,-.025)],'caudal',normal=(1,0,0),thick=.029)
