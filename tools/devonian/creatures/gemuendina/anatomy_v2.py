"""Gemuendina-specific continuous anatomy, executed by the dedicated builder namespace."""
# Low rounded preoral apron, shallow cranial wedge, tapering axial trunk, finless posterior.
sections=[(-1.76,.010,.008,.061),(-1.68,.29,.060,.046),(-1.49,.65,.126,.035),(-1.18,.81,.19,.025),(-.81,.76,.205,.015),(-.43,.64,.19,.005),(0,.49,.17,0),(.55,.37,.14,0),(1.12,.24,.105,.002),(1.72,.135,.080,.006),(2.33,.067,.052,.012),(2.91,.030,.027,.015),(3.41,.003,.005,.016)]
def section(y):
 if y<=sections[0][0]:return np.array(sections[0][1:])
 for k in range(len(sections)-1):
  if sections[k][0]<=y<=sections[k+1][0]:
   a=np.array(sections[k]);b=np.array(sections[k+1]);pre=np.array(sections[max(0,k-1)]);post=np.array(sections[min(len(sections)-1,k+2)]);t=(y-a[0])/(b[0]-a[0]);d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return np.array(sections[-1][1:])
def bw(y):
 if y<-.90:return {'skull':1}
 if y<-.50:
  f=(y+.90)/.40;f=f*f*(3-2*f);return {'skull':1-f,'body':f}
 if y<.60:return {'body':1}
 if y>2.8:return {'caudal':1}
 q=min(3,(y-.60)/.67);i=int(q);f=q-i;return {'tail%d'%i:1-f,'tail%d'%min(3,i+1):f}if i<3 else {'tail3':1}
def surf(y,a):
 w,h,z=section(y);ss=sin(a);x=w*cos(a);zz=z+h*math.copysign(abs(ss)**(.98 if y<-.60 else .94),ss)
 # Continuous bony cheek/cranial form, broad rather than separate orbital pads.
 zz+=.012*math.exp(-((y+1.06)/.29)**2)*max(0,ss)**4*(.35+.65*cos(a)**2)
 return Vector((x,y,zz))
def bodyuv(y,a):
 x=section(y)[0]*cos(a);p=surf(y,a)
 if abs(sin(a))<.55:return ((y+1.76)/5.17,.8+(p.z+.25)/.5*.2)
 return ((x/.90+1)/4+(.5 if sin(a)<0 else 0),(y+1.76)/5.17*.8)
def pigment(p,ventral=False):return (.27,.24,.17)if not ventral else(.49,.43,.31)
# Exact rectangular parameter-domain aperture is rounded to an ellipse, preserving a welded rim.
N=192;R=220;theta0=pi/2;ai0=38;ai1=58;yi0=11;yi1=27
ylo=-1.76+5.17*yi0/R;yhi=-1.76+5.17*yi1/R;mouthY=(ylo+yhi)/2;mouthHalfY=(yhi-ylo)/2;mouthHalfA=(ai1-ai0)*pi/N
bodyStart=len(V);rows=[];rim=[]
def oral_coordinates(y,a):
 xx=(a-theta0)/mouthHalfA;yy=(y-mouthY)/mouthHalfY;rad=max(abs(xx),abs(yy));angle=math.atan2(yy,xx)
 return xx,yy,rad,angle
def surfaceweight(y,a):
 base=bw(y);xx,yy,rad,angle=oral_coordinates(y,a)
 if rad<2.5:
  jaw=(max(0,-sin(angle))**1.3)*min(1,max(0,1-(rad-1)/1.5))*.88
  if jaw>0:return {'jaw':jaw,'skull':1-jaw}
 return base
for i in range(R+1):
 y=-1.76+5.17*i/R;row=[]
 for j in range(N):
  a=j*2*pi/N;xx,yy,rad,angle=oral_coordinates(y,a)
  if rad<2 and rad>.001:
   blend=max(0,min(1,2-rad));a=theta0+mouthHalfA*(xx*(1-blend)+rad*cos(angle)*1.09*blend);y2=mouthY+mouthHalfY*(yy*(1-blend)+rad*sin(angle)*.52*blend)+.028*cos(angle)**2*blend
   # Broad transverse jaw arc with shallow rounded commissures rather than a circular puncture.
  else:y2=y
  p=surf(y2,a)
  if 1<=rad<1.6:p.z+=.005*math.exp(-((rad-1.13)/.18)**2)*(.5+.5*max(0,sin(angle)))
  row.append(vertex(p,pigment(p,sin(a)<0),surfaceweight(y,a),bodyuv(y2,a)))
 rows.append(row)
for i in range(R):
 for j in range(N):
  if yi0<=i<yi1 and ai0<=j<ai1:continue
  face((rows[i][j],rows[i][(j+1)%N],rows[i+1][(j+1)%N],rows[i+1][j]))
face(reversed(rows[0]));face(rows[-1]);bodyEnd=len(V)
# Ring order around the parameter-domain cutout; vertices are reused by oral tissue.
for j in range(ai0,ai1):rim.append(rows[yi0][j])
for i in range(yi0,yi1):rim.append(rows[i][ai1])
for j in range(ai1,ai0,-1):rim.append(rows[yi1][j])
for i in range(yi1,yi0,-1):rim.append(rows[i][ai0])
# Preserve the exact skin boundary. A shaped bent oral basin is not a black plane/endcap.
ringPoints=[Vector(V[k])for k in rim];oralRows=[rim];ringN=len(rim);oralUV={vi:(j/ringN,.04)for j,vi in enumerate(rim)};mouthZ=sum(p.z for p in ringPoints)/ringN
for k in range(1,41):
 t=k/40;row=[]
 for j,p0 in enumerate(ringPoints):
  dx=p0.x;dy=p0.y-mouthY;angle=math.atan2(dy/(mouthHalfY*.52),dx/.30);f=.04+.96*(1-t)**.7
  p=Vector((dx*f, mouthY+dy*f+.06*t+.20*t**3, p0.z*(1-t)+mouthZ*t-.195*sin(t*pi/2)+.018*t*t));p.z+=.010*sin(angle*3+.6)*sin(pi*t)**2
  jaw=max(0,-sin(angle))**1.3*(1-t)*.88;th=.4*sin(pi*t)**2
  row.append(vertex(p,(.19,.09,.063),{'jaw':jaw,'throat':(1-jaw)*th,'skull':(1-jaw)*(1-th)},(j/ringN,.04+.86*t)))
 for j in range(ringN):face((oralRows[-1][j],oralRows[-1][(j+1)%ringN],row[(j+1)%ringN],row[j]),4)
 oralRows.append(row)
# End extends inside the body; no visible terminal plug. The tiny last ring remains open.
# Tiny lower-jaw denticles, attached to the actual anterior lower-jaw oral surface, low relief only.
for rr in range(3):
 row=oralRows[5+rr*3]
 eligible=[j for j,p in enumerate(ringPoints)if p.y<mouthY-mouthHalfY*.28]
 for j in eligible[::2]:
  vi=row[j];p=Vector(V[vi]);inward=Vector((-p.x,-(p.y-mouthY),.08)).normalized();p-=inward*.002;weight=W[vi]
  tangent=Vector((1,0,0));second=inward.cross(tangent).normalized();base=[vertex(p+tangent*.006*cos(q*pi/4)+second*.005*sin(q*pi/4),(.25,.16,.075),weight,(j/ringN,rr/3))for q in range(8)]
  tip=vertex(p+inward*.009+Vector((0,.002,0)),(.28,.18,.08),weight,(j/ringN,rr/3))
  for q in range(8):face((base[q],base[(q+1)%8],tip),2)
# Dorsal globes penetrate the true continuous cranial envelope: no rings, pads, beads or eye seats.
eyeDefs=[]
for s in [-1,1]:
 x=s*.45;y=-1.10;a=math.acos(x/section(y)[0]);surface=surf(y,a);center=surface-Vector((0,0,.045));scale=(.114,.137,.091)
 ell(center,scale,(.006,.010,.008),'skull',3);eyeDefs.append({'side':'L'if s>0 else'R','center':list(center),'radii':scale})
# Broad lobed pectorals with fleshy proximal continuity, a thin smooth flexible margin.
edgeY=[-.94,-.78,-.42,.02,.44,.82,1.13,1.32];edgeX=[.73,1.0,1.41,1.70,1.72,1.42,.85,.27]
def edge(y):
 for k in range(len(edgeY)-1):
  if y<=edgeY[k+1]:
   t=max(0,(y-edgeY[k])/(edgeY[k+1]-edgeY[k]));lo=max(0,k-1);hi=min(len(edgeY)-1,k+2);d0=(edgeX[k+1]-edgeX[lo])/(edgeY[k+1]-edgeY[lo])*(edgeY[k+1]-edgeY[k]);d1=(edgeX[hi]-edgeX[k])/(edgeY[hi]-edgeY[k])*(edgeY[k+1]-edgeY[k]);return (2*t**3-3*t*t+1)*edgeX[k]+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*edgeX[k+1]+(t**3-t*t)*d1
 return edgeX[-1]
def wingweights(y,t,s):
 suffix='L'if s>0 else'R';q=max(0,min(2,(y+.45)/.625));a=int(q);f=q-a;tip=max(0,min(1,(t-.47)/.53));w={};width=section(y)[0];xx=width*.45+(edge(y)-width*.45)*t;blend=max(0,min(1,(xx-width*.85)/.48));blend=blend*blend*(3-2*blend)
 for k,wt in [(a,1-f),(min(2,a+1),f)]:
  for name,v in [('wing%d'%k+suffix,wt*(1-tip)),('wingTip%d'%k+suffix,wt*tip)]:w[name]=w.get(name,0)+v*blend
 for name,v in bw(y).items():w[name]=w.get(name,0)+v*(1-blend)
 return w
for s in [-1,1]:
 surfaces=[]
 for side in [1,-1]:
  def wingvert(i,j):
   y=-.94+2.26*i/92;t=j/48;w,h,z=section(y);root=w*.45;x=s*(root+(edge(y)-root)*t)
   # Buried root emerges through a broad, smoothly tapering fleshy transition.
   shoulder=math.exp(-((abs(x)-root)/max(.04,w*.40))**2)
   zz=(z+side*h*.78)*shoulder-.018*t+side*.008*sin(pi*t)
   # Small embedded fan relief, never external struts.
   zz+=side*.002*(.5+.5*cos((y+.94)*58+t*3))*sin(pi*t)**2
   p=Vector((x,y,zz));return vertex(p,pigment(p,side<0),wingweights(y,t,s),((x+1.8)/3.6,(y+.94)/2.26),False)
  surfaces.append(grid(93,49,wingvert,5))
 top,bottom=surfaces
 for i in range(92):
  for j in [0,48]:face((top[i][j],top[i+1][j],bottom[i+1][j],bottom[i][j]),5)
 for j in range(48):
  for i in [0,92]:face((top[i][j],bottom[i][j],bottom[i][j+1],top[i][j+1]),5)
# Small rounded pelvic lobes, no median or caudal fins inferred from generic sharks.
for s in [-1,1]:
 origin=Vector((s*.18,1.17,-.025));bound=[Vector((s*x,y,z))for x,y,z in[(.20,1.03,-.03),(.38,1.16,-.03),(.59,1.40,-.035),(.63,1.57,-.036),(.48,1.69,-.033),(.22,1.55,-.024)]];boundary=[]
 for k in range(len(bound)-1):
  for t in np.linspace(0,1,8,endpoint=False):
   p0=bound[max(0,k-1)];p1=bound[k];p2=bound[k+1];p3=bound[min(len(bound)-1,k+2)];boundary.append(.5*(2*p1+(-p0+p2)*float(t)+(2*p0-5*p1+4*p2-p3)*float(t*t)+(-p0+3*p1-3*p2+p3)*float(t**3)))
 boundary.append(bound[-1]);ns=len(boundary);surfaces=[]
 for side in [-1,1]:
  surfaces.append(grid(23,ns,lambda i,j:vertex(origin.lerp(boundary[j],.012+.988*i/22)+Vector((0,0,side*(.003+.02*(1-i/22)**2))),(.34,.29,.19),'pelvic'+('L'if s>0 else'R'),(j/(ns-1),i/22)),5))
 aa,bb=surfaces
 for i in range(22):
  for j in [0,ns-1]:face((aa[i][j],aa[i+1][j],bb[i+1][j],bb[i][j]),5)
 for j in range(ns-1):
  for i in [0,22]:face((aa[i][j],bb[i][j],bb[i][j+1],aa[i][j+1]),5)
# Dorsolateral opercular exit: shallow close-set lips in the actual branchial region.
for s in [-1,1]:
 pts=[]
 for t in np.linspace(0,1,42):
  y=-.82+.26*t;a=.48 if s>0 else pi-.48;p=surf(y,a);p.z+=.003;pts.append(p)
 tube(pts,[.007*sin(pi*i/41)**.7+.001 for i in range(42)],(.10,.08,.05),'gill'+('L'if s>0 else'R'),4,8)
