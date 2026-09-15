"""Tiktaalik's individual surfaces, oral cavity and covered jointed fin anatomy.

V3: ports the approved shape study (scratchpad tikt/study.py, NEW dict) over V2's silhouette.
docs/reference/Tiktaalik.jpg read as a fuller rounded trunk and shoulder/pelvis, and a broad
rounded-arrow snout rather than a flat spear. Three changes, everything else — eyes, nares,
spiracles, teeth, pelvic fin, rig, materials sampling code — untouched, plus one one-number
carry-through the oral cavity needed to stay consistent with the narrower snout tip (below):
 - SEC is ported verbatim from the study's NEW table: the front stations (-2.80..-1.45) run
   deeper and a little narrower so the snout tip rounds instead of tapering to a blade; the neck
   pinch the old table dipped into at y=-1.05/-.68 (width/height briefly dropped there before
   rising again into the trunk, reading as a waist) is gone; the trunk stations -.2..1.65 are both
   wider and deeper for the fuller barrel. The tail stations (2.25 on) carry small matching bumps
   (e.g. 2.25's width .26->.32) so the curve into the unchanged far-tail tip (4.23/4.43) stays
   smooth rather than kinking at the trunk/tail seam.
 - surf()'s longitudinal sweep exponent moves from 1.46*|cos a|**1.85 to 1.30*|cos a|**2.6: a
   steeper falloff off the midline rounds the snout's leading corners into an arrow instead of
   sweeping them into a spear point. The section exponent on the body flank (abs(s)**.88) becomes
   abs(s)**1.0, which fills out the trunk's cross-section into a rounder barrel instead of a
   flattened one. bw()'s copy of the sweep term is changed identically so vertex-group weights
   stay aligned to the same longitudinal (yy) coordinate as the surface they sit on.
 - fin()'s pectoral widths/depths grow ([.23,.28,.38,.32,.0008]->[.27,.32,.40,.33,.0008] and
   [.15,.13,.073,.023,.0005]->[.18,.15,.08,.024,.0005]) for a fuller shoulder mass; pelvic is
   unchanged, matching the study.
 - oralPoint()'s front oral-tube ring width was a literal .63 — V2's snout-tip half-width
   (SEC[0][1]) — left as a constant it no longer tracked the narrower V3 tip (.52) and the tube
   poked through the outer surface at the mouth corners (check-oral-clearance.py: 20/625 negative
   samples, min -0.0063, all at t~0.033 and the wide-angle corners). Reads SEC[0][1] instead, so
   it stays the actual tip half-width whichever table is loaded; check-oral-clearance.py itself is
   unchanged. oralWeight() never referenced .63 and needed no change.

14 September: the user's viewer sculpt (docs/viewer-sculpt.md) ported into the same four places —
SEC, the pectoral fin, its bone chain, and the eyes. It asks for a deeper, narrower animal: the
head and neck much deeper top and bottom (stations 15-18, dorsal +26/+56/+28/+25%, ventral
+42/+76/+83/+50%), the tail deeper (stations 1-5), the trunk a little narrower (stations 9-11,
-1.4 to -5.8%), the fore body's outline pulled in over the pectoral fin (stations 12-15, -7.7 to
-18.7%), and the eyes .077 in towards the midline.

SEC's h and z columns carry the dorsal and ventral asks. They are not independent of each other:
in the trunk the section runs z-h..z+h, over the head it runs -.015-.44h..z+h, and the two blend
over -1.10..-.45, so each row solves h and z together.

15 September: how they are solved was rewritten, because the first attempt put an indent in the
snout. It read the *station table* — a windowed extreme on a grid that is not the builder's — and
corrected each row proportionally against it, three rounds. That metric cannot see a dip: a
station reports the highest point in its window, so a back that humps and then troughs inside one
window measures exactly as well as a smooth one. Every station landed within a few percent and the
head came out with a local maximum at y=-2.25 and a local minimum at y=-2.00, a visible dent in
front of the eye. Optimising against the measuring stick rather than the thing it measures.

What the user approved is the preview, and the preview is `profileWarp` in
src/viewer/sculpt/profile.ts: at each axis it reads the base and edited dorsal/ventral curves,
moves the section's midline to the edited midline, and scales the half-height about it — one
number, since a midline defined as the midpoint of two curves makes the "above" and "below" ratios
algebraically the same. `port-sculpt.mjs` beside this file applies exactly that to the builder's
own rows, importing `evaluate` from the viewer module rather than reimplementing its Hermite. One
pass, nothing free in it, and the rows land on a smooth curve because the curves they are read off
are smooth: the lofted back now wanders 0.2% of its own depth outside its rows against the
0.3% the pre-sculpt table managed and the 1.9% of the indent (`checkLoft`, asserted at build).

Measured against the viewer's own preview — the shipped mesh with `profileWarp` applied to every
vertex — this table is within 2.4% of the local depth at every station on both curves, where the
three-round table was out by 7.7%. Measured against `npm run sculpt:measure` it looks *worse*
than that table did, and deliberately so: that tool reads the target curve *linearly* between
stations while the viewer previews it as a cubic Hermite, and each station is a windowed extreme
half a station wide, so the two disagree wherever the edited curve bends sharply between stations.
Station 19 is the extreme of it — the sculpt pins the snout tip to no change while station 18 asks
+50% ventral, and the Hermite between them deepens everything inside station 19's window. The
viewer's own preview reads +26.4% there; this build reads +25.9%.

The width column is *not* re-derived here and is the three-round table's, within 4% of the
preview: it carries no visible artefact, and the snout's width is the one place the port knowingly
departs from the sculpt. That station's width is the snout's flank, swept back by surf()'s own
longitudinal map, and the same SEC rows feed stations 17-19 at every other angle, where the sculpt
asks for no change at all: +9.7% at 16 cannot be had without +9.7% at 17-19 too.
"""
import math,numpy as np
from math import sin,cos,pi,exp
from mathutils import Vector
SEC=[(-2.8,.52,.04,-.01),(-2.63,.6,.17019,-.0058),(-2.35,.67,.26716,-.03387),(-1.9,.725,.39487,-.12002),(-1.45,.75,.46084,-.05797),(-1.05,.73,.49454,-.04053),(-.68,.71,.45279,-.04029),(-.2,.7,.41419,-.01316),(.45,.64451,.405,0),(1.1,.61662,.365,0),(1.65,.5172,.31,0),(2.25,.32,.23974,-.00033),(2.85,.1394,.30395,.00579),(3.4,.0557,.4137,.00175),(3.85,.02568,.33827,-.02443),(4.23,.00894,.14957,-.00998),(4.43,.0004,.003,0)]
# The sculpt's top view pulled the fore body's outline in over the pectoral fin (stations 12-15,
# -7.7% to -18.7%). Out there that outline *is* the fin, so the port narrows the fin rather than
# the trunk under it: one lateral scale per control row, solved against the sculpt's own stations,
# applied to the row's centre and to its .84w spread but not to the .54w sweep, which is
# fore-and-aft and nothing the sculpt touched. PEC_BONE is the same scale at each pectoral joint,
# so the chain stays inside the fin it bends.
PEC_X=[.71587,.83195,.88171,.89615,.93714]
PEC_BONE={'pectoral':.74534,'elbow':.84082,'distal':.88171,'web':.89542}
# The globes moved .077 in towards the midline, and the roof over them rose with the deeper head;
# seating them at a fixed z would have buried them in it. EYE_DEPTH is where the shipped pair sat
# below the surface at its own station, measured the same way, so the seat follows the new roof.
EYE=(.20777,-1.58368);EYE_DEPTH=.06825
def smooth(t):
 if np.isscalar(t):
  t=max(0,min(1,t));return t*t*(3-2*t)
 t=np.clip(t,0,1);return t*t*(3-2*t)
def physical_y(y):
 return y+1.10*smooth((y+.70)/2.15)+1.0*smooth((y-1.45)/2.98)
def section(y):
 for k in range(len(SEC)-1):
  if SEC[k][0]<=y<=SEC[k+1][0]:
   a=np.array(SEC[k]);b=np.array(SEC[k+1]);t=(y-a[0])/(b[0]-a[0]);p=np.array(SEC[max(0,k-1)]);n=np.array(SEC[min(len(SEC)-1,k+2)]);d0=(b-p)/(b[0]-p[0])*(b[0]-a[0]);d1=(n-a)/(n[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(SEC[-1][1:])
def surf(y,a):
 w,h,z=section(y);s=np.sin(a);c=np.cos(a)
 # Monotonic longitudinal map: no reversed cheek folds or circular mouth termini.
 yy=y+1.30*np.abs(c)**2.6*(1-smooth((y+2.8)/2.5));x=w*c;head=1-smooth((y+1.10)/.65);power=1.28;bodyZ=z+h*np.sign(s)*np.abs(s)**1.0;headZ=-.015+(h+z+.015)*np.maximum(0,s)**power-.44*h*np.maximum(0,-s)**power;zz=bodyZ*(1-head)+headZ*head
 zz+=.048*np.exp(-((y+1.64)/.24)**2)*(np.exp(-((x-.153)/.12)**2)+np.exp(-((x+.153)/.12)**2))*np.maximum(0,s)**2
 zz-=.015*np.exp(-((y+1.8)/.75)**2)*np.maximum(0,s)**3*np.exp(-(x/.16)**2)
 # Small marginal nares and expanded spiracular skin notches, sculpted into skin.
 nare=np.exp(-((yy+2.35)/.045)**2)*np.exp(-((np.abs(x)-.27)/.055)**2)*np.maximum(0,s)**2
 spi=np.exp(-((yy+.99)/.10)**2)*np.exp(-((np.abs(x)-.54)/.09)**2)*np.maximum(0,s)**2
 zz-=.009*nare*smooth((zz-.06)/.07)+.014*spi
 return np.stack([x,yy,zz],axis=-1)
def bw(y,a):
 if y<-.50:
  s=sin(a);c=cos(a);yy=y+1.30*abs(c)**2.6*(1-smooth((y+2.8)/2.5));jaw=float(smooth((-s-.05)/.50)*(1-smooth((yy+1.55)/.37)));cheek=float(.48*abs(c)**4*(1-smooth((y+1.15)/.57))*(1-jaw));head=float(1-smooth((y+1.07)/.57));return {'jaw':jaw*head,'cheek'+('L'if c>0 else'R'):cheek*head,'skull':(1-jaw-cheek)*head,'neck':1-head}
 if y<.45:
  t=float(smooth((y+.50)/.70));return {'neck':1-t,'body':t}
 ys=[.45,1.25,2.05,2.75,3.4,3.95];i=min(5,max(0,np.searchsorted(ys,y,side='right')-1));f=float(smooth((y-ys[i])/(ys[i+1]-ys[i])))if i<5 else 0
 return {'tail%d'%i:1-f,'tail%d'%(i+1):f}if i<5 else{'tail5':1}
def oralPoint(t,a):
 # Tube's front ring half-width tracks the snout-tip half-width (SEC[0][1]); V2's .63 was the
 # old tip width and, left as a literal, would poke through the V3 tip's narrower .52.
 p=Vector(surf(-2.8,a));s=sin(a);q=Vector((SEC[0][1]*cos(a)*(1-.95*t),p.y+(-.37-p.y)*t,-.015+(.012+(.11 if s>=0 else .022)*sin(pi*t)**1.2)*s))
 # Palatal shelves separated by a low midline, broad cheek walls and a shallow floor.
 relief=(.020 if s>=0 else .004)*sin(pi*t)**2*(.50+.50*cos(4*a));q.z+=relief*s;q.z-=.003*sin(pi*t)*max(0,-s)
 f=float(smooth((t-.86)/.14));q=q.lerp(Vector((q.x*.06,q.y,q.z*.06-.02)),f)
 return p.lerp(q,float(smooth(t/.04)))
def oralWeight(t,a):
 s=sin(a);c=cos(a);yy=oralPoint(t,a).y;jaw=float(smooth((-s-.05)/.50)*(1-smooth((yy+1.55)/.37))*(1-smooth((t-.25)/.55)));cheek=float(.48*abs(c)**4*(1-jaw)*(1-smooth((t-.08)/.68)));throat=float(.32*sin(pi*t)**2*(1-jaw-cheek))
 return {'jaw':jaw,'cheek'+('L'if c>0 else'R'):cheek,'throat':throat,'skull':1-jaw-cheek-throat}
def dorsalLine(y):
 w,h,z=section(y);return float(z+h)
def ventralLine(y):
 w,h,z=section(y);head=1-smooth((y+1.10)/.65);return float((z-h)*(1-head)+(-.015-.44*h)*head)
def checkLoft(tol=.01):
 """The lofted back must stay inside the rows it passes between.

 A station in a sculpt is the *highest* point in a window, so a back that humps and then troughs
 inside one window measures exactly as well as a smooth one: the first port of the 14 September
 sculpt solved these rows against that metric and corrected them three times over, and what it
 left was a local maximum at y=-2.25 and a local minimum at y=-2.00 -- an indent in the snout in
 front of the eye that every station still read as within a few percent. So the shape is asserted
 here instead, where the metric cannot reach: between each pair of rows the dorsal line may not
 leave the range its own two rows span by more than `tol` of the section's height. The shipped
 table runs to 0.3% and the table this file carries to 0.2%; the indent was 1.9%."""
 worst=(0.,None)
 for k in range(len(SEC)-1):
  a,b=SEC[k][0],SEC[k+1][0];lo=min(dorsalLine(a),dorsalLine(b));hi=max(dorsalLine(a),dorsalLine(b))
  for i in range(1,80):
   y=a+(b-a)*i/80.;v=dorsalLine(y);height=max(1e-6,v-ventralLine(y));out=max(v-hi,lo-v)/height
   if out>worst[0]:worst=(out,(round(y,3),round(v,5),round(lo,5),round(hi,5)))
 assert worst[0]<=tol,'Dorsal line wanders %.2f%% of its own depth outside its rows at y=%s'%(100*worst[0],worst[1])
 return worst
def make(g):
 vertex,face,grid,tube=(g[k]for k in ['vertex','face','grid','tube']);g.update(surf=surf,bw=bw,sections=SEC)
 g['loftExcursion']=checkLoft()[0]
 n=128;ys=np.linspace(-2.8,4.43,290)
 def surface(y,a):
  p=surf(y,a);p[1]=physical_y(p[1]);return p
 rows=grid(len(ys),n,lambda i,j:vertex(surface(ys[i],2*pi*j/n-pi/2),(1,1,1),bw(ys[i],2*pi*j/n-pi/2),(j/n,.8*i/(len(ys)-1)),False),0,True);face(rows[-1],0)
 oral=grid(60,n,lambda i,j:vertex(oralPoint(i/59,2*pi*j/n-pi/2),(1,1,1),oralWeight(i/59,2*pi*j/n-pi/2),(j/n,.8+.2*i/59),False),0,True);face(reversed(oral[-1]),0)
 # Small marginal teeth and select inner coronoid/dentary teeth; each shares its gum weights.
 for upper in [False,True]:
  for side in [-1,1]:
   for k in range(17):
    a=(pi/2 if upper else -pi/2)+side*(.11+1.13*k/17);t=.025;inward=Vector((-cos(a)*.12,.06,-sin(a))).normalized();p=oralPoint(t,a)-inward*.004;w=oralWeight(t,a);h=.017+.018*sin(pi*k/19)
    tip=p+inward*h+Vector((0,.008,0));tube([p,p.lerp(tip,.40),p.lerp(tip,.8),tip],[.0055,.0045,.0025,.0004],(.5,.43,.28),w,2,8)
   if not upper:
    for k,a in enumerate([-.5,-.8]):
     a=-pi/2+side*abs(a);t=.10;p=oralPoint(t,a);w=oralWeight(t,a);tip=p+Vector((-side*.013,.008,.050-.01*k));tube([p,p.lerp(tip,.35),p.lerp(tip,.75),tip],[.010,.008,.004,.0004],(.5,.43,.28),w,2,10)
 # Dorsal eyes are actual globes seated deeply inside the original continuous roof.
 for side in [-1,1]:
  ea=math.acos(min(1.,EYE[0]/float(section(EYE[1])[0])));c=Vector((side*EYE[0],EYE[1],float(surf(EYE[1],ea)[2])-EYE_DEPTH));scale=Vector((.112,.146,.113))
  grid(37,64,lambda i,j:vertex(c+Vector((scale.x*sin(pi*i/36)*cos(2*pi*j/64),scale.y*sin(pi*i/36)*sin(2*pi*j/64),scale.z*cos(pi*i/36))),(1,1,1),'skull',(j/64,i/36),False),3,True)
 def fin(side,pelvic=False):
  suffix='L'if side>0 else'R'
  if pelvic:centers=[(.23,1.44,-.12),(.56,1.68,-.22),(.77,2.00,-.26),(.91,2.35,-.26),(.94,2.65,-.24)];widths=[.21,.26,.33,.28,.0008];depths=[.10,.095,.055,.018,.0005];names=['pelvic','pelvicDistal','pelvicWeb'];points=[0,.38,.76]
  else:centers=[(.33,-.78,-.10),(.74,-.48,-.20),(1.04,-.10,-.28),(1.23,.32,-.29),(1.25,.68,-.25)];widths=[.27,.32,.40,.33,.0008];depths=[.18,.15,.08,.024,.0005];names=['pectoral','elbow','distal','web'];points=[0,.27,.53,.78]
  spread=[1.]*5 if pelvic else PEC_X
  def param(t,a):
   q=t*4;k=min(3,int(q));u=q-k;p0=Vector(centers[max(0,k-1)]);p1=Vector(centers[k]);p2=Vector(centers[k+1]);p3=Vector(centers[min(4,k+2)]);c=.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3)
   w=(1-u)*widths[k]+u*widths[k+1];h=(1-u)*depths[k]+u*depths[k+1];w*=1+.035*sin(pi*t)
   sx=(1-u)*spread[k]+u*spread[k+1];c.x*=sx
   c+=Vector((.84*sx,-.54,0))*w*cos(a);c.z+=h*sin(a);c.z+=.008*sin(9*a+2*t)*sin(pi*t)**2*smooth((t-.4)/.4)*abs(sin(a));c.x*=side
   if pelvic:c.y+=1.10
   return c
  def weight(t,a):
   i=min(len(points)-1,max(0,np.searchsorted(points,t,side='right')-1));f=float(smooth((t-points[i])/(points[i+1]-points[i])))if i<len(points)-1 else 0;root=1-float(smooth(t/.20));parent=bw(1.45 if pelvic else-.72,-.8);w={k:v*root for k,v in parent.items()};w[names[i]+suffix]=(1-root)*(1-f)
   if f:w[names[i+1]+suffix]=(1-root)*f
   return w
  rows=grid(65,64,lambda i,j:vertex(param(i/64,2*pi*j/64),(1,1,1),weight(i/64,2*pi*j/64),(j/64,i/64),False),5,True);face(reversed(rows[0]),5);face(rows[-1],5)
 for side in [-1,1]:fin(side);fin(side,True)
 # Place the deformation skeleton in the same reviewed elongated trunk coordinates.
 for name,(h,t,parent)in list(g['B'].items()):
  if name.startswith('pelvic'):h.y+=1.10;t.y+=1.10
  elif name.startswith(('pectoral','elbow','distal','web')):
   sx=PEC_BONE[name[:-1]];h.x*=sx;t.x*=sx;g['B'][name]=(h,t,parent);continue
  elif name not in ['root','body']:
   h.y=float(physical_y(h.y));t.y=float(physical_y(t.y))
  g['B'][name]=(h,t,parent)
