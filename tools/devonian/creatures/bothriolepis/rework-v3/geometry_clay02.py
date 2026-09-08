"""Bothriolepis V3 CLAY02, newly authored continuous anatomical clay geometry.

No Blender imports: the executor and source reviewer use exactly the same mesh.
Coordinates: +Y posterior, +X animal left, +Z dorsal. Approximate length 5 units.
All body, oral walls and pectorals are one connected closed 2-manifold.
Neither old meshes nor old builder geometry is imported.
"""
from math import sin, cos, pi, sqrt, exp, atan2
from collections import Counter, defaultdict, deque
import json

TAU = 2*pi
def add(a,b): return tuple(x+y for x,y in zip(a,b))
def sub(a,b): return tuple(x-y for x,y in zip(a,b))
def mul(a,s): return tuple(x*s for x in a)
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])
def norm(a): return sqrt(dot(a,a))
def unit(a): return mul(a,1/norm(a))
def mix(a,b,t): return tuple(x*(1-t)+y*t for x,y in zip(a,b))
def smooth(t): t=max(0,min(1,t)); return t*t*(3-2*t)
def gauss(x,s): return exp(-(x/s)**2)

# Explicit longitudinal landmarks; widths and roof/floor have separate sculpture.
# The anterior is a pentagonal shield with a steep cephalic ramp and posterior
# median crest. Posterior columns retain independently authored epichordal and
# hypochordal contours, rather than scaling a constant-radius fish section.
# y, half-width, roof, floor, lateral shoulder-height fraction
LANDMARKS = [
 (-1.62,.155,-.055,-.310,.61), (-1.56,.242,.025,-.325,.63),
 (-1.45,.326,.215,-.338,.66), (-1.30,.389,.402,-.346,.70),
 (-1.15,.472,.463,-.350,.76), (-.94,.557,.463,-.352,.81),
 (-.61,.611,.476,-.350,.84), (-.27,.587,.510,-.345,.82),
 (.04,.489,.575,-.333,.79), (.155,.407,.600,-.323,.77),
 (.22,.359,.424,-.310,.70), (.38,.327,.335,-.283,.66),
 (.66,.263,.222,-.234,.61), (.96,.189,.145,-.185,.56),
 (1.28,.131,.105,-.148,.53), (1.64,.093,.083,-.117,.51),
 (1.83,.077,.111,-.143,.51), (2.13,.059,.140,-.285,.53),
 (2.45,.041,.164,-.393,.54), (2.70,.029,.194,-.327,.55),
 (2.91,.021,.234,-.139,.58), (3.10,.013,.279,.092,.59),
 (3.28,.006,.297,.244,.60), (3.38,.0015,.279,.272,.60),
]

def field(y,col):
 """Monotone cubic Hermite interpolation prevents thin-tail overshoot."""
 if y<=LANDMARKS[0][0]: return LANDMARKS[0][col]
 if y>=LANDMARKS[-1][0]: return LANDMARKS[-1][col]
 i=next(i for i in range(len(LANDMARKS)-1) if LANDMARKS[i][0]<=y<=LANDMARKS[i+1][0])
 def sec(k): return (LANDMARKS[k+1][col]-LANDMARKS[k][col])/(LANDMARKS[k+1][0]-LANDMARKS[k][0])
 def tangent(k):
  if k==0: return sec(0)
  if k==len(LANDMARKS)-1: return sec(k-1)
  a,b=sec(k-1),sec(k)
  return 0 if a*b<=0 else 2*a*b/(a+b)
 a,b=LANDMARKS[i],LANDMARKS[i+1];h=b[0]-a[0];t=(y-a[0])/h
 return (2*t**3-3*t*t+1)*a[col]+(t**3-2*t*t+t)*h*tangent(i)+(-2*t**3+3*t*t)*b[col]+(t**3-t*t)*h*tangent(i+1)

def section(y,theta,relief=True):
 w,roof,floor,sh=[field(y,i) for i in range(1,5)]
 # Controls describe one half of a transverse pentagon. The shoulder and
 # ventrolateral keel remain distinct; the flank has slight anatomical concavity.
 controls=[(0,roof),(.42*w,roof-.047),(.83*w,floor+sh*(roof-floor)),
           (.96*w,floor+.45*(roof-floor)),(.88*w,floor+.045),(.43*w,floor),(0,floor)]
 angle=theta%TAU;sgn=1 if angle<=pi else -1;q=(angle if angle<=pi else TAU-angle)/pi*6
 k=min(5,int(q));t=q-k
 a=controls[max(0,k-1)];b=controls[k];c=controls[k+1];d=controls[min(6,k+2)]
 # Tensioned cubic curves keep broad plates from becoming ballooned.
 p=tuple((2*t**3-3*t*t+1)*b[j]+(t**3-2*t*t+t)*.62*(c[j]-a[j])+(-2*t**3+3*t*t)*c[j]+(t**3-t*t)*.62*(d[j]-b[j]) for j in range(2))
 x,z=sgn*p[0],p[1]
 flex=smooth((y-.14)/.36)
 mid=(roof+floor)/2
 # Flexible trunk gradually loses armoured corners; broad caudal membranes are
 # thin at their margins, while the notochord corridor retains a rounded core.
 ex=w*sin(theta);ez=mid+(roof-floor)/2*cos(theta)
 if y>1.64: ex*=1-smooth((y-1.64)/.25)*.63*(1-abs(sin(theta))**1.8)
 x=x*(1-flex)+ex*flex;z=z*(1-flex)+ez*flex
 # Single, approximately square and rayless dorsal, blended into continuous skin.
 if 1.105<y<1.50:
  height=.315*smooth((y-1.105)/.07)*(1-smooth((y-1.445)/.055))
  wrapped=min(angle,TAU-angle)
  z+=height*exp(-(wrapped/.046)**4)
 if relief and y<.17:
  # Anatomical seam depressions live in the actual shell, no applied plate islands.
  xn=abs(x)/(w+1e-8);up=max(0,cos(theta));side=max(0,sin(theta)**2)
  seam=gauss(y-(-1.16+.04*xn),.013)*(.5+.5*up)
  seam+=gauss(xn-(.32+.20*smooth((y+.94)/.60)),.018)*smooth((y+1.15)/.16)*up
  seam+=gauss(y-(-.30-.21*xn),.015)*(.55*side+.5*up)
  seam+=gauss(y-(.03-.22*xn),.012)*up*.8
  # The small cephalic ornament is recessed; no invented eye stalks/hoops.
  seam+=gauss(y-(-1.45+.16*xn),.009)*smooth((xn-.28)/.30)*up
  z-=.0065*min(1.5,seam)
  # Low-amplitude rounded dermal relief is a clay-scale suggestion only.
  tex=(sin(x*127+sin(y*29))*sin(y*109+sin(x*47)))**4
  z+=.0016*tex*max(.1,up)
 return (x,y,z)

class Mesh:
 def __init__(self): self.v=[];self.f=[];self.material=[];self.tags=[];self.oral_weight=[]
 def vertex(self,p,tag='shield',oral=0):
  self.v.append(tuple(p));self.tags.append(tag);self.oral_weight.append(oral);return len(self.v)-1
 def face(self,ids,mat=0): self.f.append(tuple(ids));self.material.append(mat)
 def bridge(self,a,b,mat=0):
  assert len(a)==len(b)
  for i in range(len(a)): self.face((a[i],a[(i+1)%len(a)],b[(i+1)%len(b)],b[i]),mat)
 def fan(self,ring,p,mat=0,tag='shield'):
  c=self.vertex(p,tag)
  for i in range(len(ring)):self.face((ring[i],ring[(i+1)%len(ring)],c),mat)

def boundary(j0,j1,k0,k1,cols):
 # Ordered perimeter of an explicitly removed local grid patch.
 return ([j0*cols+k for k in range(k0,k1)]+
         [j*cols+k1 for j in range(j0,j1)]+
         [j1*cols+k for k in range(k1,k0,-1)]+
         [j*cols+k0 for j in range(j1,j0,-1)])

def build_body():
 m=Mesh();N=192;rows=251;dy=.02;ys=[-1.62+j*dy for j in range(rows)]
 # Patch bounds are exact indices. Only faces inside these three patches are
 # omitted; each complete perimeter is consumed once by a continuous attachment.
 oral=(1,19,78,114)  # ventral anterior; generous transition patch, small mouth
 left=(25,34,48,68);right=(25,34,124,144)
 patches=[oral,left,right]
 for y in ys:
  for k in range(N):m.vertex(section(y,k*TAU/N),'shield' if y<.18 else 'posterior')
 for j in range(rows-1):
  for k in range(N):
   if any(a<=j<b and c<=k<d for a,b,c,d in patches):continue
   m.face((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k),0 if ys[j]<.18 else 1)
 m.fan(list(range(N)),(0,-1.62,-.195))
 m.fan([(rows-1)*N+k for k in range(N)],(0,3.38,.2755),1,'posterior')

 # Replace the underside patch with an annulus leading to a true open mouth.
 # Four narrowing wall rings and a recessed throat seal the animal INSIDE the
 # oral cavity, never across the visible aperture. No booleans/collapsed quads.
 ring=boundary(*oral,N);outer=[m.v[i] for i in ring];phis=[]
 for p in outer:phis.append(atan2((p[1]+1.42)/.18,p[0]/.255))
 aperture=[(.143*cos(a),-1.455+.091*sin(a),-.353-.010*max(0,sin(a))) for a in phis]
 for t in [.25,.50,.75,1.0]:
  new=[]
  for p,q,a in zip(outer,aperture,phis):
   pt=mix(p,q,t);weight=smooth((t-.4)/.6)*max(0,sin(a))
   new.append(m.vertex(pt,'oral_rim',weight))
  m.bridge(ring,new,0);ring=new
 mouth_ids=ring[:]
 for depth,scale,cy in [(.012,.995,-1.455),(.035,.97,-1.450),(.070,.87,-1.430),(.115,.69,-1.390),(.158,.43,-1.345),(.200,.20,-1.305)]:
  new=[m.vertex((.143*scale*cos(a),cy+.091*scale*sin(a),-.353+depth),'oral_cavity',.50*max(0,sin(a))*(1-depth/.200)) for a in phis]
  m.bridge(ring,new,2);ring=new
 m.fan(ring,(0,-1.290,-.139),2,'throat')

 # Two anatomical pectoral segments, connected through a recessed joint zone.
 # The root skin is continuous with the exact shield patch boundary. Its
 # flattened shoulder is a real surface transition, not intersecting primitives.
 for sign,patch in [(1,left),(-1,right)]:
  ring=boundary(*patch,N);outer=[m.v[i] for i in ring]
  root=(sign*.493,-1.046,-.166)
  root_axis=unit((sign*.49,.865,-.073))
  edge=unit((sign*root_axis[1],-abs(root_axis[0]),0))
  vertical=unit(cross(root_axis,edge))
  if vertical[2]<0:vertical=mul(vertical,-1)
  phis=[atan2((p[2]-root[2])/.12,(p[1]-root[1])/.14) for p in outer]
  # Parametrize a loop by local Y/Z on the shield; the sign may reverse its
  # orientation, resolved globally after all exact shared boundaries are built.
  phis=[pi-a for a in phis]
  stations=[
   (0.00,(sign*.615,-.966,-.178),.057,.100),
   (.18,(sign*.650,-.850,-.199),.058,.125),
   (.35,(sign*.730,-.690,-.225),.049,.123),
   (.53,(sign*.817,-.526,-.250),.042,.111),
   (.72,(sign*.889,-.365,-.274),.035,.090),
   (.91,(sign*.955,-.229,-.296),.029,.065),
   (.96,(sign*.970,-.196,-.302),.026,.054),
   (1.00,(sign*.980,-.175,-.306),.022,.048),
   (1.03,(sign*.987,-.150,-.310),.025,.052),
   (1.12,(sign*1.010,-.068,-.321),.024,.053),
   (1.27,(sign*1.040,.076,-.340),.019,.046),
   (1.42,(sign*1.052,.223,-.360),.013,.031),
   (1.52,(sign*1.042,.319,-.378),.006,.004),
  ]
  # Longitudinal smooth curves through independently changing section widths,
  # flattening and centerline bow. At the elbow a small collar depression marks
  # real articulation without a huge ball joint or soft-fan anatomy.
  dense=[]
  for j in range(len(stations)-1):
   a,b=stations[j],stations[j+1]
   for q in range(4):
    t=q/4;dense.append((a[0]*(1-t)+b[0]*t,mix(a[1],b[1],t),a[2]*(1-t)+b[2]*t,a[3]*(1-t)+b[3]*t))
  dense.append(stations[-1])
  for j,(arc,c,w,h) in enumerate(dense):
   prev=dense[max(0,j-1)][1];nxt=dense[min(len(dense)-1,j+1)][1]
   axis=unit(sub(nxt,prev));u=unit((sign*axis[1],-abs(axis[0]),0));v=unit(cross(axis,u))
   if v[2]<0:v=mul(v,-1)
   new=[]
   for a in phis:
    # Broad lateral plate faces with thin dorsal aspect (2014 figure 5).
    co=cos(a);si=sin(a);flat=sin(a)*(.82+.18*abs(si))
    p=add(c,add(mul(u,w*co),mul(v,h*flat)))
    new.append(m.vertex(p,('pectoral_proximal_' if arc<.985 else 'pectoral_distal_')+('L' if sign>0 else 'R')))
   if j==0:
    # A C1 Hermite collar replaces clay01's single twisted bridge. Start
    # tangents follow the actual shield surface into the removed patch;
    # terminal tangents follow the proximal axis. Every intermediate row is
    # anatomical skin, not a decorative intersecting collar or cap.
    original=ring[:];dest=new[:]
    tangents=[]
    for old,final in zip(original,dest):
     p=m.v[old];q=m.v[final]
     kk=old%N;jj=old//N;theta=kk*TAU/N;y=ys[jj]
     du=unit(sub(section(y,theta+.0001),section(y,theta-.0001)))
     dv=unit(sub(section(y+.0001,theta),section(y-.0001,theta)))
     normal=unit(cross(du,dv));delta=sub(q,p)
     tangent=sub(delta,mul(normal,dot(delta,normal)))
     tangents.append((mul(tangent,.90),mul(axis,norm(delta)*.75)))
    for t in [j/16 for j in range(1,16)]:
     intermediate=[]
     for old,final,(ta,tb) in zip(original,dest,tangents):
      p=m.v[old];q=m.v[final]
      co=add(add(mul(p,2*t**3-3*t*t+1),mul(ta,t**3-2*t*t+t)),add(mul(q,-2*t**3+3*t*t),mul(tb,t**3-t*t)))
      intermediate.append(m.vertex(co,'pectoral_root_'+('L' if sign>0 else 'R')))
     m.bridge(ring,intermediate,0);ring=intermediate
   m.bridge(ring,new,3 if .955<arc<1.025 else 0);ring=new
  m.fan(ring,(sign*1.039,.328,-.380),0,'pectoral_distal_'+('L' if sign>0 else 'R'))
 # Removed interior grid vertices must not remain as loose geometry.
 used=sorted(set(i for f in m.f for i in f));remap={v:k for k,v in enumerate(used)}
 m.v=[m.v[i] for i in used];m.tags=[m.tags[i] for i in used];m.oral_weight=[m.oral_weight[i] for i in used]
 m.f=[tuple(remap[i] for i in f) for f in m.f];mouth_ids=[remap[i] for i in mouth_ids]
 orient(m)
 m.mouth_ids=mouth_ids
 return m

def orient(m):
 """Consistent face winding on every shared edge, then outward signed volume."""
 edges=defaultdict(list)
 for fi,f in enumerate(m.f):
  for a,b in zip(f,f[1:]+f[:1]):edges[tuple(sorted((a,b)))].append((fi,a,b))
 adj=defaultdict(list)
 for edge,items in edges.items():
  assert len(items)==2,('nonmanifold',edge,len(items))
  (a,u,v),(b,s,t)=items;adj[a].append((b,u==s));adj[b].append((a,u==s))
 seen={0:False};todo=deque([0])
 while todo:
  a=todo.popleft()
  for b,same in adj[a]:
   target=seen[a]^same
   if b in seen:assert seen[b]==target,('nonorientable',a,b)
   else:seen[b]=target;todo.append(b)
 assert len(seen)==len(m.f),'Disconnected anatomical surface'
 m.f=[tuple(reversed(f)) if seen[i] else f for i,f in enumerate(m.f)]
 volume=sum(dot(m.v[f[0]],cross(m.v[f[j]],m.v[f[j+1]]))/6 for f in m.f for j in range(1,len(f)-1))
 if volume<0:m.f=[tuple(reversed(f)) for f in m.f]

def validate(m):
 edges=Counter(tuple(sorted((a,b))) for f in m.f for a,b in zip(f,f[1:]+f[:1]))
 areas=[norm(cross(sub(m.v[f[j]],m.v[f[0]]),sub(m.v[f[j+1]],m.v[f[0]])))/2 for f in m.f for j in range(1,len(f)-1)]
 assert min(areas)>1e-11,('degenerate triangle',min(areas))
 assert set(edges.values())=={2},'nonmanifold edges'
 assert len(m.v)-len(edges)+len(m.f)==2,'Unexpected genus'
 assert all(all(abs(x)<10 for x in p) for p in m.v)
 oral=[m.v[i] for i in m.mouth_ids]
 report={'status':'PASS','vertices':len(m.v),'faces':len(m.f),'triangles':len(areas),
  'connected_components':1,'edge_use_counts':dict(Counter(edges.values())),
  'euler_characteristic':len(m.v)-len(edges)+len(m.f),'minimum_triangle_area':min(areas),
  'bounds':[[min(p[k] for p in m.v),max(p[k] for p in m.v)] for k in range(3)],
  'oral_aperture_width':max(p[0] for p in oral)-min(p[0] for p in oral),
  'oral_aperture_length':max(p[1] for p in oral)-min(p[1] for p in oral),
  'rigid_shield_fraction_total_length':1.775/5.0,'pectoral_centerline_design_length':1.52,
  'scope':'Numerical source check only; rendered sculpture/attachment review remains required.'}
 root_dots=[]
 for f in m.f:
  if len(f)!=4 or not any(m.tags[i].startswith('pectoral_root') for i in f):continue
  a,b,c,d=[m.v[i] for i in f]
  n=cross(sub(b,a),sub(c,a));nn=cross(sub(c,a),sub(d,a))
  root_dots.append(dot(n,nn)/(norm(n)*norm(nn)))
 assert min(root_dots)>.7,('Twisted pectoral transition quad',min(root_dots))
 report['root_transition_minimum_quad_triangle_normal_dot']=min(root_dots)
 report['root_transition_quads']=len(root_dots)
 return report

if __name__=='__main__': print(json.dumps(validate(build_body()),indent=2))
