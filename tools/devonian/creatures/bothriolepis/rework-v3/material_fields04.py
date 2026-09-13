"""M04 anatomy-bound ochre/brown dermal armor. No new plate boundaries.
Pigment is an art interpretation; PATHS remain the fourteen anatomical fields.
"""
import numpy as np
from material_fields01 import PATHS,smooth,line_distance
from material_fields02 import linear_to_srgb,srgb_to_linear,extend_boundary_colors
from material_fields03 import noise

def half_coordinate(v):
 q=np.minimum(v%1,1-v%1)*2
 # Even, C1 ornament across the roof/floor; do not mirror a nonzero tangent.
 e=.035
 return np.where(q<e,q*q*(2*e-q)/(e*e),np.where(q>1-e,1-(1-q)**2*(2*e-(1-q))/(e*e),q))

def shield(u,v,detail=None):
 u,v=np.broadcast_arrays(u,v);q0=np.minimum(v%1,1-v%1)*2;q=half_coordinate(v)
 if detail is None:detail=np.zeros(u.shape)
 d=line_distance(u,q0);inside=smooth((d-.009)/.024)
 groove=np.exp(-(d/.0065)**2);edge=np.exp(-((d-.027)/.018)**2)
 # Warm bony roof, umber/olive lateral armor, related subdued ventral bone.
 side=smooth((q-.18)/.36)[...,None];belly=smooth((q-.68)/.23)[...,None]
 color=np.array([.073,.047,.022])*(1-side)+np.array([.038,.048,.026])*side
 color=color*(1-belly)+np.array([.069,.059,.034])*belly
 # World-like continuous circumferential noise avoids a forehead mirror seam.
 sv=np.sin(v*2*np.pi);cv=np.cos(v*2*np.pi)
 broad=.64*noise(u*5.3+sv*.8+2.3,cv*3.3+8.1)+.36*noise(u*13.2+sv*1.7+8.4,cv*7.3+2.4)
 pigment=.5+.5*noise(u*27.1+sv*4.1,cv*15.4+7.1)
 color*=1+(.56*broad+.13*(pigment-.5)*inside)[...,None]
 # Explicit growth centers, interpreted inside the existing bones. These
 # modulate rounded tubercles and radiating growth, never generate fake cracks.
 centers=[(.12,.12,.14,.20),(.18,.42,.15,.23),(.49,.075,.26,.14),(.405,.29,.17,.18),(.66,.49,.25,.20),(.875,.045,.15,.13),(.86,.29,.17,.18),(.53,.91,.25,.17),(.85,.86,.16,.19)]
 total=np.zeros(u.shape);growth=total.copy();warm=total.copy()
 for k,(cu,cq,su,sq) in enumerate(centers):
  dx=(u-cu)/su;dy=(q-cq)/sq;r=np.sqrt(dx*dx+dy*dy+.002);a=np.arctan2(dy,dx);w=np.exp(-r*r*1.7)
  phase=r*24+1.1*np.sin(a*3+k*.7)+.7*noise(u*31+k,q*39-k)
  segments=smooth((noise(u*65+k,q*73-k)+.1)/.5)
  growth+=w*(np.maximum(0,np.sin(phase))**3-.22)*segments;warm+=w*np.sin(k*2.1+.4);total+=w
 growth/=np.maximum(total,.12);warm/=np.maximum(total,.12)
 # Medium, irregular bony tubercles, plus finer dermal source detail.
 xx=u*115+.24*noise(u*13,q*17);yy=q*145+.21*noise(u*17+3,q*11)
 ix=np.floor(xx);iy=np.floor(yy);tub=np.zeros(u.shape)
 # Include neighbors, so crossing a sample cell never creates a square edge.
 for ox in [-1,0,1]:
  for oy in [-1,0,1]:
   cx=ix+ox;cy=iy+oy
   jx=(np.sin(cx*127.1+cy*311.7)*43758.5453)%1;jy=(np.sin(cx*269.5+cy*183.3)*24634.6345)%1
   tub+=np.exp(-((xx-cx-.25-.50*jx)**2+(yy-cy-.25-.5*jy)**2)/.052)
 color+=inside[...,None]*(warm[...,None]*np.array([.012,.004,-.001])+growth[...,None]*np.array([.006,.004,.0015]))
 color*=1-.43*groove[...,None]+.055*edge[...,None]
 color*=1+inside[...,None]*(.12*(tub-.18)+.028*detail)[...,None]
 # Supplement the existing M01 relief on geometry; this is not another layer
 # of overlapping masks that changes the outline or relocates bone boundaries.
 relief=-.0015*groove+.0055*edge+.0030*smooth(d/.065)
 height=.0004*growth*inside+.0018*(tub-.16)*inside+.0006*detail*inside-.00065*groove
 rough=np.clip(.57+.075*broad-.07*tub*inside+.055*groove-.025*growth,.43,.70)
 assert np.isfinite(color).all() and np.min(color)>=0 and np.max(color)<=1
 return color,height,rough,relief,d

def pectoral(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape)
 upper=smooth((v-.20)/.65)[...,None]
 c=np.array([.039,.047,.024])*(1-upper)+np.array([.084,.061,.028])*upper
 n=noise(u*12+2.6,v*5.2+8.2);c*=1+(.34*n+.035*detail)[...,None]
 d=np.minimum(np.abs(v-(.29+.045*np.sin(u*4))),np.abs(v-(.76-.09*u)))
 d=np.minimum(d,np.abs(u-.615)*2.1);seam=np.exp(-(d/.013)**2)
 # Jointed armor ornament, never fin rays or a soft membrane.
 grain=np.maximum(0,np.sin(u*210+1.2*np.sin(v*23)))**4
 h=-.0015*seam+.0008*detail+.0007*grain
 c*=1-.43*seam[...,None]+.045*grain[...,None]
 return c,h,np.clip(.55+.045*n+.075*seam-.025*grain,.45,.68)

def posterior(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape)
 q=half_coordinate(v);belly=smooth((q-.51)/.32)[...,None]
 c=np.array([.034,.045,.024])*(1-belly)+np.array([.060,.052,.031])*belly
 patch=.13*noise(u*6.3+np.sin(v*2*np.pi),np.cos(v*2*np.pi)*3.2+1.1)
 c*=1+patch[...,None]+.012*detail[...,None]
 boundary=shield(np.full(np.broadcast(u,v).shape,.999),v,detail)[0]
 transition=smooth(np.clip(u,0,1)/.14)[...,None];c=boundary*(1-transition)+c*transition
 return c,.00014*detail,np.clip(.55+.018*detail+.07*patch,.50,.61)
