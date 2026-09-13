"""M04 bounded coordinate deltas on the immutable M03 topology.
Oral annulus becomes a smooth ventral surface with an elliptic lip depression.
No edit to aperture, cavity, appendages, posterior, eye meshes, or study-key delta.
"""
import numpy as np
from geometry_clay02 import section
from material_fields01 import smooth
from material_fields03 import cephalic_tangent_delta

def ventral_chart(x,y):
 # Invert the monotone ventral quarter-profile at this exact longitudinal point.
 # 32 bisections have <2e-10 angular error; no nearest-grid UV quantization.
 lo=np.pi*.75;hi=np.pi
 for _ in range(32):
  mid=(lo+hi)/2
  if section(float(y),float(mid))[0]>abs(x):lo=mid
  else:hi=mid
 theta=(lo+hi)/2
 return (theta if x>=0 else 2*np.pi-theta),section(float(y),float(theta))[2]

def oral_surface(x,y):
 theta,z=ventral_chart(x,y)
 radius=np.hypot(x/.143,(y+1.455)/.091)
 angle=np.arctan2((y+1.455)/.091,x/.143)
 ax=.143*np.cos(angle);ay=-1.455+.091*np.sin(angle)
 _,az=ventral_chart(ax,ay)
 lip=-.353-.010*max(0,np.sin(angle))
 # Both endpoints have zero derivative of the blend. Outside r=1.55 the
 # annulus is exactly the same surface function as the surrounding shield.
 w=1-float(smooth(np.array((radius-1)/.55)))
 return z+w*(lip-az),theta

def corrected_deltas(raw):
 offsets=np.zeros((len(raw.v),3));uv_oral={};oralids=[i for i,t in enumerate(raw.tags) if t=='oral_rim']
 aperture=set(raw.mouth_ids)
 for i in oralids:
  x,y,z=raw.v[i];target,theta=oral_surface(x,y)
  # The exact aperture remains fixed. The interior is entirely untouched.
  if i not in aperture:offsets[i,2]=target-z
  uv_oral[i]=((y+1.62)/1.775,(theta/(2*np.pi)+.5)%1)
 # M03 cancelled the cusp only over a window. Finish it across the cephalic
 # rostrum, while ending at the SAME posterior fade as M03; thoracic crest stays.
 lookup={}
 for j in range(251):
  y=-1.62+j*.02
  for k in range(192):lookup[tuple(round(a,7) for a in section(y,k*2*np.pi/192))]=(y,k/192)
 cephalic=[];ventral_transition=[]
 for i,(p,tag) in enumerate(zip(raw.v,raw.tags)):
  if tag!='shield':continue
  grid=lookup.get(tuple(round(a,7) for a in p))
  if not grid:continue
  y,v=grid;q=min(v,1-v)*12
  # Continue the very SAME elliptic lip field beyond the old rectangular
  # construction boundary. Its C1 zero ends in real ventral shield tissue.
  x,yy,z=p
  if y<-1.20 and min(v,1-v)*2>.70 and np.hypot(x/.143,(y+1.455)/.091)<1.55:
   target,_=oral_surface(x,y);offsets[i,2]=target-z;ventral_transition.append(i)
  if q>=1 or y>=-1.20:continue
  full=.047*.62*(q**3-2*q*q+q)*(1-float(smooth(np.array((y+1.20)/.23))))
  old=float(cephalic_tangent_delta(np.array(y),np.array(v*2*np.pi)))
  offsets[i,2]+=full-old
  if full!=old:cephalic.append(i)
 return offsets,uv_oral,lookup,{'ventral_shield_transition_vertices':len(ventral_transition),'maximum_ventral_shield_delta':float(max([abs(offsets[i,2]) for i in ventral_transition]+[0])),'oral_annulus_vertices':len(oralids),'changed_nonaperture_annulus_vertices':sum(bool(offsets[i,2]) for i in oralids),'cephalic_vertices_changed':len(cephalic),'maximum_oral_z_delta':float(max(abs(offsets[i,2]) for i in oralids)),'maximum_cephalic_z_delta':float(max([abs(offsets[i,2]) for i in cephalic]+[0]))}
