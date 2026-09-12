"""Acanthostega anatomy v2: tail, trunk and limb silhouette port of the approved shape study
(scratchpad acan/study.py, variant NEW2, core=True), on top of v1's head/mouth/eye geometry which
is unchanged.

The 11 September triage (docs/model-queue-state.md) found three problems with v1: the tail read
as a solid paddle fused on the tip rather than a fin running most of the tail's length above and
below a tapering core; the trunk was a constant round tube instead of flat-bellied and wider than
deep; and the limbs attached as sticks. This module changes only what fixes those three things:

  - SEC: trunk stations widened, tail height now rises from y=1.7 and tapers to the tip instead of
    spiking late, and the z-offset (dorsal bias) is raised through the tail.
  - surf(y,a): a flat ventral belly through the trunk band (a superellipse blend, not a sharp
    crease), and for y>1.0 a "core + web" cross-section — a round muscular core carried on from the
    trunk's own taper, thinning to a fin web a few millimetres thick with a crease at the boundary.
    This replaces the old late "web" caudal-expansion branch entirely for y>1.0; the older
    y>1.85 ventral-flattening line is left in place (as in the study) since the core branch runs
    after it and supersedes its effect there.
  - Fin rays: short ray tubes from the core boundary out to the web edge, every 0.13 in y from 1.35
    to 4.7, dorsal and ventral, so the web reads as a fin rather than blank webbing. The core end
    sits at .75 of the core half-height (not .9) and the tube's three rings are weighted core/
    average/edge rather than one rigid weight end to end, so a ray does not poke through the
    bending skin under the deepest tail flexion (check-pose-attachments.py's fin-root burial check,
    once its own selector was corrected to exclude these midline rays — see that file).
  - Limbs: wider/deeper widths and depths, and the bolted-on palm ellipsoid is dropped — the limb
    loft already closes at the palm with face(rows[-1],5), so the paddle now flows from forearm to
    digits instead of joining a separate sphere.

Head, jaw, teeth, eyes, digits and inter-digit webbing are byte-for-byte the same code as v1.
"""
import math,numpy as np
from math import sin,cos,pi,exp
from mathutils import Vector
SEC=[(-2.20,.50,.022,0),(-2.06,.525,.135,.01),(-1.80,.605,.24,.025),(-1.45,.665,.29,.03),(-1.10,.66,.31,.02),(-.75,.54,.32,.005),(-.30,.50,.34,0),(.35,.48,.33,0),(1.1,.42,.33,0),(1.7,.30,.42,.04),(2.1,.22,.54,.08),(2.5,.15,.62,.11),(3.,.09,.64,.13),(3.8,.045,.55,.13),(4.5,.02,.32,.10),(5.,.0005,.008,.06)]
def smooth(t):
 if np.isscalar(t):t=max(0,min(1,t));return t*t*(3-2*t)
 t=np.clip(t,0,1);return t*t*(3-2*t)
def section(y):
 for k in range(len(SEC)-1):
  if SEC[k][0]<=y<=SEC[k+1][0]:
   a=np.array(SEC[k]);b=np.array(SEC[k+1]);t=(y-a[0])/(b[0]-a[0]);p=np.array(SEC[max(0,k-1)]);n=np.array(SEC[min(len(SEC)-1,k+2)]);d0=(b-p)/(b[0]-p[0])*(b[0]-a[0]);d1=(n-a)/(n[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(SEC[-1][1:])
def surf(y,a):
 w,h,z=section(y);s=np.sin(a);c=np.cos(a);head=1-smooth((y+.88)/.53);yy=y+.95*np.abs(c)**1.7*(1-smooth((y+2.2)/1.8));x=w*c
 # A deeper cranial roof and shallow hooked dentary, not a stretched Tiktaalik skull.
 hz=-.018+(h+z+.018)*np.maximum(0,s)**1.08-.60*h*np.maximum(0,-s)**1.08;bz=z+h*s
 # Flat belly through the trunk band: the ventral half is a superellipse, flat under the body.
 k=smooth((y+1.1)/.5)*(1-smooth((y-1.2)/.6));bz=np.where(s<0,z-h*(np.abs(s)**(1-.45*k)),bz)
 zz=hz*head+bz*(1-head);zz+=.018*np.exp(-((y+2.08)/.14)**2)*np.maximum(0,-s)**3
 zz+=.031*np.exp(-((y+1.45)/.22)**2)*(np.exp(-((x-.25)/.13)**2)+np.exp(-((x+.25)/.13)**2))*np.maximum(0,s)**2
 # Skin-covered tabular region; broad rear cheek transition without added horns.
 x*=1+.05*np.exp(-((y+.98)/.13)**2)*np.abs(c)**5
 # Caudal web expands dorsally earlier than ventrally, as in the preserved supports; superseded by
 # the core+web branch below for y>1.0 (kept, as in the study, rather than removed).
 if y>1.85:zz=np.where(s<0,z+(zz-z)*(.55+.45*smooth((y-2.45)/.65)),zz)
 if y>1.0:
  # Core + web: a round muscular core carried on from the trunk's own taper (hc), thinning to a
  # fin web a few millimetres thick, with a crease (inside=0/1) at the core/web boundary.
  kk=smooth((y-1.0)/.6);hc=.33*(1-smooth((y-1.1)/3.6))+.04
  ext=np.where(s>=0,h,h*.62)
  zz=z+ext*s
  inside=smooth((hc-np.abs(zz-z))/.06)
  x=x*((1-kk)+kk*(inside*1.0+(1-inside)*(.05+.10*(1-np.abs(s)))))
 nares=np.exp(-((yy+1.99)/.035)**2)*np.exp(-((np.abs(x)-.30)/.05)**2)*np.maximum(0,s)**2;zz-=.01*nares
 return np.stack([x,yy,zz],axis=-1)
def bw(y,a):
 if y<-.48:
  yy=y+.95*abs(cos(a))**1.7*(1-smooth((y+2.2)/1.8));j=float(smooth((-sin(a)-.02)/.45)*(1-smooth((yy+1.18)/.31)));h=float(1-smooth((y+.88)/.4));return {'jaw':j*h,'skull':(1-j)*h,'neck':1-h}
 if y<.25:
  t=float(smooth((y+.48)/.65));return {'neck':1-t,'body':t}
 ys=[.25,1.05,1.8,2.65,3.55,4.4];i=min(5,max(0,np.searchsorted(ys,y,side='right')-1));t=float(smooth((y-ys[i])/(ys[i+1]-ys[i])))if i<5 else 0;return {'tail%d'%i:1-t,'tail%d'%(i+1):t}if i<5 else{'tail5':1}
def oralPoint(t,a):
 front=Vector(surf(-2.2,a));s=sin(a);q=Vector((.50*cos(a)*(1-.96*t),front.y+(-.44-front.y)*t,-.018+(.022+(.11 if s>=0 else .038)*sin(pi*t))*s));q.z+=.010*sin(pi*t)**2*cos(4*a)*s
 end=float(smooth((t-.87)/.13));q=q.lerp(Vector((q.x*.08,q.y,q.z*.08-.018)),end);return front.lerp(q,float(smooth(t/.07)))
def oralWeight(t,a):
 p=oralPoint(t,a);j=float(smooth((-sin(a)-.02)/.45)*(1-smooth((p.y+1.18)/.31))*(1-smooth((t-.25)/.58)));th=.26*sin(pi*t)**2*(1-j);return {'jaw':j,'throat':th,'skull':1-j-th}
def make(g):
 vertex,face,grid,tube,bone=(g[k]for k in ['vertex','face','grid','tube','bone']);g.update(surf=surf,bw=bw,sections=SEC)
 n=112;ys=np.linspace(-2.2,5.,210);body=grid(len(ys),n,lambda i,j:vertex(surf(ys[i],2*pi*j/n-pi/2),(1,1,1),bw(ys[i],2*pi*j/n-pi/2),(j/n,.8*i/(len(ys)-1)),False),0,True);face(body[-1],0)
 mouth=grid(42,n,lambda i,j:vertex(oralPoint(i/41,2*pi*j/n-pi/2),(1,1,1),oralWeight(i/41,2*pi*j/n-pi/2),(j/n,.8+.2*i/41),False),0,True);face(reversed(mouth[-1]),0)
 for upper in [False,True]:
  for side in [-1,1]:
   for k in range(20):
    a=(pi/2 if upper else-pi/2)+side*(.10+1.17*k/20);t=.036;inward=Vector((-cos(a)*.15,.05,-sin(a))).normalized();p=oralPoint(t,a)-inward*.003;h=.024+.017*sin(pi*k/22);tip=p+inward*h+Vector((0,.006,0));tube([p,p.lerp(tip,.45),p.lerp(tip,.78),tip],[.006,.0047,.0025,.0003],(.5,.45,.32),oralWeight(t,a),2,7)
   for a in [(pi/2 if upper else-pi/2)+side*.34]:
    t=.085;p=oralPoint(t,a);tip=p+Vector((-side*.012,.008,-.065 if upper else .065));tube([p,p.lerp(tip,.4),p.lerp(tip,.8),tip],[.013,.009,.004,.0005],(.5,.45,.32),oralWeight(t,a),2,9)
 for side in [-1,1]:
  c=Vector((side*.305,-1.42,.202));r=Vector((.132,.167,.133));grid(31,48,lambda i,j:vertex(c+Vector((r.x*sin(pi*i/30)*cos(2*pi*j/48),r.y*sin(pi*i/30)*sin(2*pi*j/48),r.z*cos(pi*i/30))),(1,1,1),'skull',(j/48,i/30),False),3,True)
 # Fin rays: strokes from the core boundary out to the dorsal and ventral edges of the tail web,
 # following the core+web crossection above; weighted at their own station so they follow the tail
 # bones like the digits/web (material 5). The core end starts inside the core proper (.75 of hc,
 # not .9) so it keeps clear of the crease under a bend, not just at bind pose; the intermediate
 # ring takes the average of the two ends' weights rather than reusing one end's rigidly, so the
 # tube is not a single unbending transform end to end under the deepest tail flexion.
 for yr in np.arange(1.35,4.7,.13):
  y=float(yr)
  for sg in (1,-1):
   w_,h_,z_=section(y);hc=.33*(1-smooth((y-1.1)/3.6))+.04
   core=Vector((0,y,z_+sg*hc*.75));edge=Vector(surf(y,sg*pi/2));mid=core.lerp(edge,.5)+Vector((0,.02,0))
   coreW=bw(y,sg*pi/2);edgeW=bw(y,sg*pi/2);midW={k:(coreW.get(k,0)+edgeW.get(k,0))/2 for k in set(coreW)|set(edgeW)}
   tube([core,mid,edge],[.022,.016,.006],(1,1,1),[coreW,midW,edgeW],5,6)
 # Four short limbs have distinct upper/forearm/palm regions and octodactyl terminal paddles.
 for hind in [False,True]:
  for side in [-1,1]:
   tag=('Hind'if hind else'Fore')+('L'if side>0 else'R');parent='tail1'if hind else'body'
   # Hind root seated inward/up from (.25,1.48,-.10) to (.22,1.48,-.06): the wider hind limb
   # (widths/depths raised for the study) met the wider hip and left the trunk under Dodge@0.5;
   # fore already passes and is untouched.
   centers=[(.22,1.48,-.06),(.59,1.78,-.18),(.85,1.78,-.23),(1.08,2.01,-.25)]if hind else[(.26,-.53,-.09),(.62,-.50,-.18),(.84,-.22,-.25),(1.12,-.15,-.27)]
   widths=[.17,.18,.15,.20]if hind else[.17,.185,.14,.19];depths=[.145,.145,.12,.075];centers=[Vector((side*x,y,z))for x,y,z in centers]
   names=['upper'+tag,'lower'+tag,'palm'+tag]
   for k,name in enumerate(names):bone(name,centers[k],parent if k==0 else names[k-1])
   def limbPoint(t,a):
    q=t*3;k=min(2,int(q));u=q-k;p0=centers[max(0,k-1)];p1=centers[k];p2=centers[k+1];p3=centers[min(3,k+2)];c=.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3);width=widths[k]*(1-u)+widths[k+1]*u;depth=depths[k]*(1-u)+depths[k+1]*u;return c+Vector((0,width*cos(a),depth*sin(a)))
   def limbWeight(t):
    if t<.18:
     f=float(smooth(t/.18));return {parent:1-f,names[0]:f}
    q=min(2,(t-.18)/.34);k=int(q);f=float(smooth(q-k));return {names[k]:1-f,names[k+1]:f}if k<2 else{names[2]:1}
   rows=grid(43,40,lambda i,j:vertex(limbPoint(i/42,j*2*pi/40),(1,1,1),limbWeight(i/42),(j/40,i/42),False),5,True);face(reversed(rows[0]),5);face(rows[-1],5)
   # The limb loft already ends at the palm centre with the palm's own width/depth and is closed by
   # face(rows[-1],5) above; no bolted-on palm ellipsoid (dropped per the approved study).
   palm=centers[-1];digitPoints=[]
   for k in range(8):
    angle=-1.12+k*2.24/7+.22*(1 if hind else 0);direction=Vector((side*cos(angle),sin(angle),0));length=([.23,.32,.41,.47,.48,.46,.40,.28]if hind else[.28,.30,.34,.37,.46,.47,.43,.34])[k];base=palm+direction*.035;tip=palm+direction*length;tip.z+=.008;name='digit'+tag+str(k+1);bone(name,base,names[2]);g['B'][name]=(base,base+direction*.18,names[2]);pts=[];radii=[];weights=[]
    for j in range(10):
     t=j/9;p=base.lerp(tip,t);p.z+=.015*sin(pi*t);pts.append(p);radii.append((.035*(1-t)**.40+.003)*(1+.065*sin(t*pi*6)));f=float(smooth((t-.20)/.55));weights.append({names[2]:1-f,name:f})
    tube(pts,radii,(1,1,1),weights,5,12);digitPoints.append((base,tip,name))
   # Inferred soft web between proximal digit lengths; distal tips remain individually visible.
   for k in range(7):
    b0,t0,n0=digitPoints[k];b1,t1,n1=digitPoints[k+1];layers=[]
    for sg in [-1,1]:
     layer=[]
     for i in range(13):
      u=i/12;row=[]
      for j in range(9):
       q=j/8;extent=.57-.12*sin(pi*q);t=u*extent;p=b0.lerp(t0,t).lerp(b1.lerp(t1,t),q);p.z+=sg*.003*sin(pi*u)+.008*sin(pi*u);f=float(smooth((t-.20)/.55));row.append(vertex(p,(1,1,1),{names[2]:1-f,n0:f*(1-q),n1:f*q},(q,u),False))
      layer.append(row)
     layers.append(layer)
     for i in range(12):
      for j in range(8):
       f=(layer[i][j],layer[i][j+1],layer[i+1][j+1],layer[i+1][j]);face(f if sg>0 else reversed(f),5)
    for j in range(8):face((layers[0][-1][j],layers[1][-1][j],layers[1][-1][j+1],layers[0][-1][j+1]),5)
