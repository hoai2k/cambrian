"""MATERIAL05 fields: resolved bone relief and calmer, un-rowed dermal micro.

Three changes against material_fields04, each answering one item of
review-material04-and-next-direction.md as re-stated in the M05 brief:

1. GEOMETRY.  The physical relief that M04 put on the mesh (clay seams, the
   M01 suture displacement and the M04 plate relief) was authored at feature
   widths of .006-.018 model units and sampled on a .02 longitudinal row
   pitch: between one and three samples across a whole groove.  Stacked, they
   produced faceted notches -- 76.7 deg of geometric-normal step at y=-0.31 on
   the dorsal midline against a 1.6-7.4 deg median elsewhere.  `clay_relief`
   and `path_relief` below re-author that SAME anatomy at widths the row
   pitch can actually resolve (>= .045), with a smooth union over the plate
   segments instead of a `min()` (a min of distances creases along its medial
   axis, which is what put 10-20 deg steps on the nuchal branch).  Depths are
   preserved, so bone definition is not erased; only the sampling is fixed.

2. ROSTRAL CAP.  `cap_chart` gives material slot 7 a real two-dimensional
   local chart -- the nose disc mirrored back out along the shield's own U --
   so the cap can carry the shield atlas normal/roughness/basecolor instead of
   sitting smooth beside a textured field.  It is value-continuous at the rim
   (both sides sample U=0) and never collapses a UV edge.

3. MICRORELIEF.  `tubercles` replaces M04's anisotropic half-jittered lattice
   (u*115 by q*145: cells 1.5x longer than wide, hence the visible rows) with
   an isotropic, domain-warped, fully jittered, circumferentially PERIODIC
   field of varying blob radius, and the height/pigment weights that feed it
   are roughly halved.  The builder drops the shared pore Bump from .18 to
   .08 and the normal-map strength from .82 to .62 to match.

Pure numpy; no bpy import, so the source can be checked without Blender.
"""
import numpy as np
from material_fields01 import PATHS,smooth,line_distance
from material_fields02 import linear_to_srgb,srgb_to_linear,extend_boundary_colors
from material_fields03 import noise

# ---------------------------------------------------------------------------
# 1. Resolved physical relief
# ---------------------------------------------------------------------------
ROW_PITCH=.02          # longitudinal sample spacing of the 251-row shield grid
MIN_FEATURE=.045       # >= 2.25 samples per Gaussian sigma

# Plate boundary segments in model units (u*1.775 along the shield, q*1.50
# around the half circumference) -- the SAME fourteen paths, not new bones.
SEGMENTS=[]
for _name,_path in PATHS:
 for (_ax,_ay),(_bx,_by) in zip(_path,_path[1:]):
  SEGMENTS.append((_ax*1.775,_ay*1.50,_bx*1.775,_by*1.50))

def segment_distances(u,q):
 """Distance to every plate segment, kept separate so the field can take a
 smooth union.  `min()` over segments is only C0 on the medial axis."""
 pu=np.asarray(u)*1.775;pq=np.asarray(q)*1.50
 out=np.empty((len(SEGMENTS),)+np.broadcast(pu,pq).shape)
 for i,(ax,ay,bx,by) in enumerate(SEGMENTS):
  dx=bx-ax;dy=by-ay
  t=np.clip(((pu-ax)*dx+(pq-ay)*dy)/(dx*dx+dy*dy),0,1)
  out[i]=np.hypot(pu-ax-t*dx,pq-ay-t*dy)
 return out

def _union(d,sigma,centre=0.):
 return 1-np.prod(1-np.exp(-((d-centre)/sigma)**2),axis=0)

GROOVE_DEPTH=.0055;GROOVE_SIGMA=.052
RIDGE_HEIGHT=.0036;RIDGE_CENTRE=.090;RIDGE_SIGMA=.060
PLATE_LIFT=.0030;PLATE_SIGMA=.11

def path_relief(u,q):
 """Resolved suture groove + raised plate margin + plate-field lift.

 M01 contributed -.0042*exp(-(d/.006)^2)+.0020*exp(-((d-.017)/.009)^2) and
 M04 -.0015*exp(-(d/.0065)^2)+.0055*exp(-((d-.027)/.018)^2)+.0030*smooth(d/.065).
 Combined that swung -.0057 to +.0075 across .027 units -- roughly one row.
 The same swing is kept and spread over widths the mesh can carry.
 """
 d=segment_distances(u,q)
 groove=_union(d,GROOVE_SIGMA)
 margin=_union(d,RIDGE_SIGMA,RIDGE_CENTRE)
 lift=np.prod(1-np.exp(-(d/PLATE_SIGMA)**2),axis=0)
 return -GROOVE_DEPTH*groove+RIDGE_HEIGHT*margin+PLATE_LIFT*lift

CLAY_AMPLITUDE=.0065
CLAY_SIGMAS=(.050,.075,.055,.050,.045)
CLAY_TEX_AMPLITUDE=.0008;CLAY_TEX_FREQUENCY=24.

def clay_relief(y,x,xn,up,side):
 """geometry_clay02.section()'s own relief block at resolvable widths.

 Same five anatomical bands, same .0065 depth, same fine dermal suggestion --
 sigmas .009-.018 raised to .045-.075, `min(1.5,seam)` replaced by a C-infinity
 soft clamp, and the fine term dropped from an aliased sin(y*109) (2.18 rad per
 row!) to sin(y*24) (about 13 rows per period) at half the amplitude.  The
 y<.17 hard cut-off becomes a smooth fade so the thoracic crest keeps its own
 shape without a step where the relief stops.
 """
 s1,s2,s3,s4,s5=CLAY_SIGMAS
 seam =np.exp(-((y-(-1.16+.04*xn))/s1)**2)*(.5+.5*up)
 seam+=np.exp(-((xn-(.32+.20*smooth((y+.94)/.60)))/s2)**2)*smooth((y+1.15)/.16)*up
 seam+=np.exp(-((y-(-.30-.21*xn))/s3)**2)*(.55*side+.5*up)
 seam+=np.exp(-((y-(.03-.22*xn))/s4)**2)*up*.8
 seam+=np.exp(-((y-(-1.45+.16*xn))/s5)**2)*smooth((xn-.28)/.30)*up
 z=-CLAY_AMPLITUDE*1.5*np.tanh(seam/1.5)
 f=CLAY_TEX_FREQUENCY
 tex=(np.sin(x*f+np.sin(y*11))*np.sin(y*f+np.sin(x*13)))**4
 z=z+CLAY_TEX_AMPLITUDE*tex*np.maximum(.1,up)
 return z*(1-smooth((y-.12)/.06))

def cephalic_roof(y,v):
 """The net M03+M04 cephalic roof tangent correction, written once and
 continuously.  M04 applied `full` anterior of y=-1.20 and left M03's faded
 `old` behind it; both equal .047*.62*(q^3-2q^2+q)*(1-smooth((y+1.20)/.23))
 over the range where either is nonzero, so this single expression reproduces
 the accepted cephalic roof without M04's branch."""
 q=np.minimum(np.asarray(v)%1,1-np.asarray(v)%1)*12
 return np.where(q<1,.047*.62*(q**3-2*q*q+q)*(1-smooth((y+1.20)/.23)),0.)

def relief_mask(y,q,xyz):
 """The M01/M04 protection mask: no relief on the rostral tip, none behind the
 shield, none in the pectoral root collar, none on the ventral anterior around
 the mouth, none in either eye seat.  The eye taper is widened from .043 to
 .105 because .043 is itself only two rows wide."""
 m=smooth((y+1.60)/.07)*(1-smooth((y-.08)/.08))
 root=np.sqrt(((y+1.03)/.20)**2+((q-.61)/.20)**2)
 m=m*smooth((root-.80)/.50)
 m=m*(1-(1-smooth((y+1.25)/.12))*smooth((q-.54)/.12))
 for sign in (-1,1):
  d=np.linalg.norm(np.asarray(xyz)-np.array([sign*.084863,-1.410,.257]),axis=-1)
  m=m*smooth((d-.066)/.105)
 return m*(1-.35*smooth((q-.60)/.16))

# ---------------------------------------------------------------------------
# 2. Rostral cap chart
# ---------------------------------------------------------------------------
CAP_APEX=(0.,-1.62,-.195)

def cap_chart(point,v_rim,rim_radius):
 """(u,v) for a point on the nose cap disc.

 The cap is mirrored back out along the shield's own longitudinal axis: the
 rim is U=0 on both sides, and inward radial distance becomes +U, so the cap
 reads as the anterior band of the shield folded over the nose.  Both chart
 directions have real extent -- no collapsed longitudinal UV.
 """
 r=np.hypot(point[0]-CAP_APEX[0],point[2]-CAP_APEX[2])
 return float(np.clip((rim_radius-r)/1.775,0,1)),float(v_rim)

# ---------------------------------------------------------------------------
# 3. Dermal micro: isotropic, warped, periodic, fully jittered
# ---------------------------------------------------------------------------
TUBERCLE_CELL=.020                 # model units; 150 cells round the circumference
TUBERCLE_RING=int(round(3./TUBERCLE_CELL))

def tubercles(u,v):
 """Irregular bony tubercles with no row organisation and no mirror line.

 M04 laid these on a u*115 by q*145 lattice -- cells half again as long as
 they are wide, jittered over only half a cell, and mirrored about the dorsal
 and ventral midlines by q.  That reads as ruled rows of embossing.  Here the
 lattice is isotropic in model units, domain-warped by two octaves, jittered
 over a whole cell, given a per-blob radius, and indexed by the FULL
 circumferential coordinate modulo the ring count, so it wraps instead of
 mirroring.
 """
 u=np.asarray(u,dtype=np.float64);v=np.asarray(v,dtype=np.float64)
 u,v=np.broadcast_arrays(u,v)
 sv=np.sin(v*2*np.pi);cv=np.cos(v*2*np.pi)
 x=u*1.775/TUBERCLE_CELL+1.7*noise(u*6.1+1.3,sv*3.1+4.7)+.8*noise(u*17.9+5.1,cv*7.3+2.9)
 y=(v%1)*3./TUBERCLE_CELL+1.7*noise(u*7.7+8.2,cv*2.9+1.1)+.8*noise(u*21.1+3.3,sv*6.7+6.7)
 ix=np.floor(x);iy=np.floor(y);total=np.zeros(u.shape)
 for ox in (-1,0,1):
  for oy in (-1,0,1):
   cx=ix+ox;cy=iy+oy;cw=np.mod(cy,TUBERCLE_RING)
   jx=(np.sin(cx*127.1+cw*311.7)*43758.5453)%1
   jy=(np.sin(cx*269.5+cw*183.3)*24634.6345)%1
   jr=(np.sin(cx*419.2+cw*371.9)*15731.7431)%1
   s=.30+.34*jr
   dx=x-cx-jx;dy=y-cy-jy
   total+=np.exp(-(dx*dx+dy*dy)/(s*s))*(.55+.45*jr)
 return total

# ---------------------------------------------------------------------------
# Atlas fields.  Pigment, plate ornament and roughness follow material_fields04
# unchanged; only the micro height/contrast weights move.
# ---------------------------------------------------------------------------
def half_coordinate(v):
 q=np.minimum(v%1,1-v%1)*2
 e=.035
 return np.where(q<e,q*q*(2*e-q)/(e*e),np.where(q>1-e,1-(1-q)**2*(2*e-(1-q))/(e*e),q))

# Tunable by the builder per M05 iteration; the M05 pass shipped .00085/.062,
# which read too porcelain against the reference, and M05b raises them while
# keeping the isotropic un-rowed lattice and the halved pore Bump.
MICRO_HEIGHT=.00085
MICRO_CONTRAST=.062

def shield(u,v,detail=None):
 u,v=np.broadcast_arrays(np.asarray(u,dtype=np.float64),np.asarray(v,dtype=np.float64))
 q0=np.minimum(v%1,1-v%1)*2;q=half_coordinate(v)
 if detail is None:detail=np.zeros(u.shape)
 d=line_distance(u,q0);inside=smooth((d-.009)/.024)
 groove=np.exp(-(d/.0065)**2);edge=np.exp(-((d-.027)/.018)**2)
 side=smooth((q-.18)/.36)[...,None];belly=smooth((q-.68)/.23)[...,None]
 color=np.array([.073,.047,.022])*(1-side)+np.array([.038,.048,.026])*side
 color=color*(1-belly)+np.array([.069,.059,.034])*belly
 sv=np.sin(v*2*np.pi);cv=np.cos(v*2*np.pi)
 broad=.64*noise(u*5.3+sv*.8+2.3,cv*3.3+8.1)+.36*noise(u*13.2+sv*1.7+8.4,cv*7.3+2.4)
 pigment=.5+.5*noise(u*27.1+sv*4.1,cv*15.4+7.1)
 color*=1+(.56*broad+.13*(pigment-.5)*inside)[...,None]
 centers=[(.12,.12,.14,.20),(.18,.42,.15,.23),(.49,.075,.26,.14),(.405,.29,.17,.18),(.66,.49,.25,.20),(.875,.045,.15,.13),(.86,.29,.17,.18),(.53,.91,.25,.17),(.85,.86,.16,.19)]
 total=np.zeros(u.shape);growth=total.copy();warm=total.copy()
 for k,(cu,cq,su,sq) in enumerate(centers):
  dx=(u-cu)/su;dy=(q-cq)/sq;r=np.sqrt(dx*dx+dy*dy+.002);a=np.arctan2(dy,dx);w=np.exp(-r*r*1.7)
  phase=r*24+1.1*np.sin(a*3+k*.7)+.7*noise(u*31+k,q*39-k)
  segments=smooth((noise(u*65+k,q*73-k)+.1)/.5)
  growth+=w*(np.maximum(0,np.sin(phase))**3-.22)*segments;warm+=w*np.sin(k*2.1+.4);total+=w
 growth/=np.maximum(total,.12);warm/=np.maximum(total,.12)
 tub=tubercles(u,v)
 color+=inside[...,None]*(warm[...,None]*np.array([.012,.004,-.001])+growth[...,None]*np.array([.006,.004,.0015]))
 color*=1-.43*groove[...,None]+.055*edge[...,None]
 # Half of M04's .12 tubercle contrast and .028 source-detail contrast: the
 # large-scale read is carried by bone curvature and pigment, not embossing.
 color*=1+inside[...,None]*(MICRO_CONTRAST*(tub-.59)+.013*detail)[...,None]
 relief=-.0015*groove+.0055*edge+.0030*smooth(d/.065)
 # Micro height roughly halved (M04: .0004/.0018/.0006/-.00065).
 height=.00022*growth*inside+MICRO_HEIGHT*(tub-.59)*inside+.00028*detail*inside-.00050*groove
 rough=np.clip(.57+.075*broad-.042*tub*inside+.055*groove-.025*growth,.43,.70)
 assert np.isfinite(color).all() and np.min(color)>=0 and np.max(color)<=1
 return color,height,rough,relief,d

def pectoral(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape)
 upper=smooth((v-.20)/.65)[...,None]
 c=np.array([.039,.047,.024])*(1-upper)+np.array([.084,.061,.028])*upper
 n=noise(u*12+2.6,v*5.2+8.2);c*=1+(.34*n+.035*detail)[...,None]
 d=np.minimum(np.abs(v-(.29+.045*np.sin(u*4))),np.abs(v-(.76-.09*u)))
 d=np.minimum(d,np.abs(u-.615)*2.1);seam=np.exp(-(d/.013)**2)
 # The jointed armour grain loses M04's hard sin()^4 ruling; a warped, lower
 # frequency version keeps the plate reading without printed corduroy.
 grain=np.maximum(0,np.sin(u*128+1.2*np.sin(v*23)+1.6*noise(u*9,v*11)))**4
 h=-.0015*seam+.0004*detail+.00035*grain
 c*=1-.43*seam[...,None]+.024*grain[...,None]
 return c,h,np.clip(.55+.045*n+.075*seam-.018*grain,.45,.68)

def posterior(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape)
 q=half_coordinate(v);belly=smooth((q-.51)/.32)[...,None]
 c=np.array([.034,.045,.024])*(1-belly)+np.array([.060,.052,.031])*belly
 patch=.13*noise(u*6.3+np.sin(v*2*np.pi),np.cos(v*2*np.pi)*3.2+1.1)
 c*=1+patch[...,None]+.012*detail[...,None]
 boundary=shield(np.full(np.broadcast(u,v).shape,.999),v,detail)[0]
 transition=smooth(np.clip(u,0,1)/.14)[...,None];c=boundary*(1-transition)+c*transition
 return c,.00010*detail,np.clip(.55+.018*detail+.07*patch,.50,.61)
