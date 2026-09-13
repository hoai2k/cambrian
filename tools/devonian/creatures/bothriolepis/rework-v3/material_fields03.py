"""MATERIAL03: living brown/moss dermal armor, not uniformly painted panels.
Keep the fourteen authored plate boundaries. Ornament and pigment develop
inside those plates at broader, lower-contrast scales than the fine pore source.
"""
import numpy as np
from material_fields01 import PATHS,smooth,shield as old_shield,pectoral as old_pectoral
from material_fields02 import linear_to_srgb,srgb_to_linear,extend_boundary_colors

def noise(x,y):
 ix=np.floor(x);iy=np.floor(y);fx=smooth(x-ix);fy=smooth(y-iy)
 def h(a,b):return ((np.sin(a*127.1+b*311.7)*43758.5453123)%1)*2-1
 a=h(ix,iy)*(1-fx)+h(ix+1,iy)*fx
 b=h(ix,iy+1)*(1-fx)+h(ix+1,iy+1)*fx
 return a*(1-fy)+b*fy

def shield(u,v,detail=None):
 _,height,rough,relief,d=old_shield(u,v,detail)
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape,dtype=np.float32)
 q=np.minimum(v%1,1-v%1)*2
 side=smooth((q-.16)/.37)[...,None];belly=smooth((q-.61)/.21)[...,None]
 color=np.array([.144,.126,.064])*(1-side)+np.array([.052,.078,.049])*side
 color=color*(1-belly)+np.array([.112,.102,.066])*belly
 coarse=.57*noise(u*4.1+2.3,q*5.0+8.1)+.28*noise(u*8.3+8.4,q*9.7+2.4)+.15*noise(u*17.1+5.2,q*19.4+7.1)
 # Local plate growth centers guide restrained radiating/coalescent ornament.
 # This is living surface interpretation; the coordinates do not claim fossil
 # pigment or exact ossification center measurements.
 centers=[(.125,.12,.14,.20),(.18,.42,.15,.23),(.49,.075,.26,.14),(.405,.29,.17,.18),(.66,.49,.25,.20),(.875,.045,.15,.13),(.86,.29,.17,.18),(.53,.91,.25,.17),(.85,.86,.16,.19)]
 total=np.zeros(np.broadcast(u,v).shape);ornament=total.copy();warm=total.copy()
 for index,(cu,cq,su,sq) in enumerate(centers):
  dx=(u-cu)/su;dy=(q-cq)/sq;r=np.sqrt(dx*dx+dy*dy+.002);a=np.arctan2(dy,dx)
  weight=np.exp(-r*r*1.7)
  phase=r*19+1.7*np.sin(a*3+index*.7)+1.1*noise(u*23+index,q*27-index)
  ridges=(np.maximum(0,np.sin(phase))**3-.22)
  ornament+=weight*ridges;warm+=weight*np.sin(index*2.1+.4);total+=weight
 ornament/=np.maximum(total,.12);warm/=np.maximum(total,.12)
 inside=smooth((d-.012)/.024)
 # Coarse mottling is modest and smooth, with a warm/olive regional shift.
 # Sutures stay decisive rather than disappearing beneath high-frequency spots.
 color*=1+(.19*coarse+.075*ornament*inside)[...,None]
 color+=warm[...,None]*inside[...,None]*np.array([.007,.003,-.001])
 groove=np.exp(-(d/.006)**2);edge=np.exp(-((d-.017)/.009)**2)
 color*=1-.39*groove[...,None]+.038*edge[...,None]
 color*=1+.018*(detail*inside)[...,None]
 height+=.00072*ornament*inside+.00024*coarse*inside
 rough=np.clip(rough+.045*coarse-.028*ornament*inside,.48,.69)
 return np.clip(color,0,1),height,rough,relief,d

def pectoral(u,v,detail=None):
 c,h,r=old_pectoral(u,v,detail)
 variation=.08*noise(u*7.5+2.6,v*3.2+8.2)
 c=c*.53*(1+variation[...,None])
 return c,h,r+.018*variation

def posterior(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape,dtype=np.float32)
 q=np.minimum(v%1,1-v%1)*2;belly=smooth((q-.51)/.32)[...,None]
 color=np.array([.049,.073,.045])*(1-belly)+np.array([.095,.091,.060])*belly
 patch=.07*noise(u*5.3+4.5,q*4.2+1.1)+.035*noise(u*11.1+2.8,q*7.4+8.0)
 color*=1+patch[...,None]+.012*detail[...,None]
 boundary=shield(np.full(np.broadcast(u,v).shape,.999),v,detail)[0]
 transition=smooth(np.clip(u,0,1)/.14)[...,None];color=boundary*(1-transition)+color*transition
 height=.00013*detail+.000045*np.sin(q*83+1.8*np.sin(u*12))*smooth(u/.12)
 rough=np.clip(.563+.022*detail+.08*patch,.51,.62)
 return color,height,rough

def cephalic_tangent_delta(y,angle):
 # Original half-profile clamps its endpoint tangent instead of mirroring it.
 # Cancel only that Z-tangent term on the cephalic roof. Keep the deliberately
 # ridged thoracic posterior. The exact dorsal center height is unchanged.
 q=np.minimum(angle%(2*np.pi),2*np.pi-angle%(2*np.pi))*6/np.pi
 weight=smooth((y+1.56)/.11)*(1-smooth((y+1.20)/.23))
 return np.where(q<1,.047*.62*(q**3-2*q*q+q)*weight,0.)
