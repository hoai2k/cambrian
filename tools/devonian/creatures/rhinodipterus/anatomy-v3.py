"""V3 port of anatomy-v2.py: tooth-plate placement and the eyelid-fit UV domain follow the
head/jaw stretch (build-v3.py's stretchY, pivot -.68, factor 1.12); the internal denticle
relief pattern (theta/rr rows) is unchanged since the port is about placement, not micro-relief.
Otherwise identical to anatomy-v2.py, including writing eyes-v3.json instead of eyes-v2.json."""
# The seven upper / six lower radiating denticle rows are rounded grinding surfaces.
# These are continuous sculpted plates, not an arcade of predator fangs.
PLATE_Y=stretchY(-1.49);PLATE_DYREF=stretchY(-1.22);PLATE_RANGE=.245*1.12
for upper in [True,False]:
 for sign in [-1,1]:
  vv=[];ff=[];UV=[];NR=28;NA=96;rows=7 if upper else 6
  for j in range(NR+1):
   r=j/NR
   for k in range(NA):
    a=2*pi*k/NA;x=sign*(.116+.073*r*cos(a));y=PLATE_Y+PLATE_RANGE*r*sin(a)
    # Radial rows diverge from the posteromedial corner; larger rounded denticles lie distally.
    dx=abs(x)-.042;dy=PLATE_DYREF-y;ang=math.atan2(dx,max(.002,dy));rad=math.hypot(dx,dy)
    ridge=0
    for n in range(rows):
     theta=.07+n*.175
     for m in range(1,5):
      rr=.049+m*.041;distance=(rad-rr)**2+(rad*(ang-theta))**2
      ridge+=.007*(.6+.4*m/4)*math.exp(-distance/(.008+.001*m)**2)
    edge=max(0,1-r*r)**.45;relief=(.006+ridge)*edge
    z=hp(y,3*pi/2).z-.002-relief if upper else jp(y,pi/2).z+.002+relief
    vv.append((x,y,z));UV.append(((x*sign-.043)/.146,(y-(PLATE_Y-PLATE_RANGE))/(2*PLATE_RANGE)))
  for j in range(NR):
   for k in range(NA):a=j*NA+k;ff.append((a,j*NA+(k+1)%NA,(j+1)*NA+(k+1)%NA,a+NA))
  o=mesh(('Pterygoid seven-row plate 'if upper else'Prearticular six-row plate ')+str(sign),vv,ff,'dentine','skull'if upper else'jaw',uv=UV)
  sol=o.modifiers.new('Plate embedded backing','SOLIDIFY');sol.thickness=.004;sol.offset=-1 if not upper else 1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
# Eye lids trace the intersection with the continuous closed head; they are excluded
# from the volume audit. Their minute thickness is skin, not a raised orbital pad.
bvh=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices)for p in head.data.polygons],all_triangles=False)
def signed(p):
 q,n,_,_=bvh.find_nearest(p);return (p-q).dot(n)
HY0,HY1=HEAD[0][0],HEAD[-1][0]
for eye in eyes:
 center=Vector(eye['center']);basis=list(map(Vector,eye['basis']));rr=eye['radii'];vv=[];ff=[];UV=[];N=100;K=5;cuts=[]
 for j in range(N):
  a=2*pi*j/N
  def ep(t):return center+basis[0]*(rr[0]*sin(t)*cos(a))+basis[1]*(rr[1]*sin(t)*sin(a))+basis[2]*(rr[2]*cos(t))
  lo=0.;hi=pi
  for _ in range(26):
   mid=(lo+hi)/2
   if signed(ep(mid))>0:lo=mid
   else:hi=mid
  cut=(lo+hi)/2;cuts.append(cut)
  for k in range(K):
   t=cut+.055*k/(K-1);q,n,_,_=bvh.find_nearest(ep(t));vv.append(tuple(q+n*(.00065*sin(pi*k/(K-1))+.00015)));UV.append(((q.y-HY0)/(HY1-HY0),(math.atan2(max(0,q.z-float(interp(HEAD,q.y)[2])),q.x)/(2*pi))%1))
 for j in range(N):
  for k in range(K-1):a=j*K+k;b=((j+1)%N)*K+k;ff.append((a,a+1,b+1,b))
 mesh('Fitted orbital skin '+str(eye['side']),vv,ff,'head','skull',uv=UV)
 eye['intersectionAngleRange']=[min(cuts),max(cuts)]
(H/'eyes-v3.json').write_text(json.dumps(eyes,indent=2))
