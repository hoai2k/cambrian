"""Authored anatomical plate/pigment fields for Bothriolepis MATERIAL01.

The shader atlas and actual mesh relief share these explicit paths. Noise cannot
move plate boundaries. U spans the shield length, Q the dorsal-to-ventral half
circumference. Paths are mirrored on the animal, not randomly tiled polygons.
"""
import numpy as np

# Primary 2014 figures 2/3 guide topological relationships. These are an authored
# surface interpretation, not a claimed metric tracing of each fossil bone.
PATHS = [
 ('cephalic-thoracic margin',[(.262,0),(.275,.19),(.270,.36),(.286,.52),(.294,.67)]),
 ('anterior median dorsal boundary',[(.262,.070),(.385,.190),(.594,.192),(.746,0)]),
 ('posterior median dorsal boundary',[(.746,0),(.830,.118),(.997,.125)]),
 ('anterior dorsolateral / mixilateral',[(.385,.190),(.425,.374),(.615,.546)]),
 ('mixilateral longitudinal',[(.270,.360),(.425,.374),(.682,.395),(.997,.440)]),
 ('posterior dorsolateral branch',[(.594,.192),(.682,.395),(.785,.657)]),
 ('ventrolateral floor boundary',[(.294,.670),(.560,.755),(.785,.727),(.997,.740)]),
 ('median ventral anterior half',[(.402,1),(.519,.854),(.640,1)]),
 ('median ventral anterior seam',[(.252,1),(.402,1)]),
 ('median ventral posterior seam',[(.640,1),(.997,1)]),
 ('posterior ventral plate margin',[(.785,.657),(.822,1)]),
 ('cephalic premedian-lateral',[(.035,.282),(.133,.300),(.262,.206)]),
 ('cephalic lateral-submarginal',[(.133,.300),(.184,.505),(.286,.520)]),
 ('cephalic nuchal branches',[(.204,.052),(.228,.102),(.262,.070)]),
]

def smooth(a):a=np.clip(a,0,1);return a*a*(3-2*a)
def line_distance(u,q):
 d=np.full(np.broadcast(u,q).shape,100.,dtype=np.float32)
 # Line segments retain purposeful plate corners rather than generic crack noise.
 for name,path in PATHS:
  for (ax,ay),(bx,by) in zip(path,path[1:]):
   ax*=1.775;bx*=1.775;ay*=1.50;by*=1.50
   dx,dy=bx-ax,by-ay;t=np.clip(((u*1.775-ax)*dx+(q*1.50-ay)*dy)/(dx*dx+dy*dy),0,1)
   d=np.minimum(d,np.hypot(u*1.775-ax-t*dx,q*1.50-ay-t*dy))
 return d

def shield(u,v,detail=None):
 q=np.minimum(v%1,1-v%1)*2
 d=line_distance(u,q)
 groove=np.exp(-(d/.0060)**2)
 edge=np.exp(-((d-.017)/.009)**2)
 # Fine texture fades near sutures so a pore field cannot erase bone boundaries.
 interior=smooth((d-.010)/.022)
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape,dtype=np.float32)
 upper=np.array([.205,.209,.095],np.float32)
 flank=np.array([.115,.155,.089],np.float32)
 ventral=np.array([.240,.216,.140],np.float32)
 side=smooth((q-.15)/.39)[...,None];belly=smooth((q-.56)/.23)[...,None]
 col=upper*(1-side)+flank*side;col=col*(1-belly)+ventral*belly
 # Warm central dorsal bone fields, quiet olive laterals. This coarse pigment
 # variation follows the median plates and never pretends to be another suture.
 central=(1-smooth((q-.105)/.105))*smooth((u-.26)/.15)
 col+=central[...,None]*np.array([.033,.017,.002],np.float32)
 plate_variation=.014*np.sin(u*9+.5)*np.cos(q*5)
 col*=1+plate_variation[...,None]
 col*=1-.48*groove[...,None]+.045*edge[...,None]
 col*=1+.025*(detail*interior)[...,None]
 # Exact exterior sculpt relief is bounded to a few thousandths of a model unit.
 relief=-.0042*groove+.0020*edge
 micro=.00075*detail*interior
 # Rounded fine tubercles remain a bump-scale feature. No polygonal scales or
 # large pebbles are introduced onto the scaleless posterior.
 x=u*89+.17*np.sin(q*53);y=q*119+.23*np.sin(u*47)
 ix=np.floor(x);iy=np.floor(y)
 jx=(np.sin(ix*127.1+iy*311.7)*43758.5453)%1
 jy=(np.sin(ix*269.5+iy*183.3)*24634.6345)%1
 dx=(x-ix)-(.28+.44*jx);dy=(y-iy)-(.28+.44*jy)
 tubercle=np.exp(-(dx*dx+dy*dy)/.044)*.0010*interior
 height=relief*.62+micro+tubercle
 rough=np.clip(.565+.07*groove-.035*edge+.010*detail,.45,.68)
 return np.clip(col,0,1),height,rough,relief,d

def pectoral(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape,dtype=np.float32)
 proximal=1-smooth((u-.57)/.065)
 d=np.minimum(np.abs(v-(.29+.045*np.sin(u*4))),np.abs(v-(.76-.09*u)))
 d=np.minimum(d,np.abs(u-.615)*2.1)
 seam=np.exp(-(d/.013)**2)
 # Quiet warm upper plate, olive lower margin. The blade's lateral face is broad.
 upper=smooth((v-.28)/.60)[...,None]
 col=np.array([.111,.146,.077])*(1-upper)+np.array([.205,.200,.092])*upper
 col*=1-.38*seam[...,None]+.018*detail[...,None]
 # Distal plates stay related in pigment. Actual joint recess remains geometric.
 col*=1-.045*(1-proximal)[...,None]
 edge=np.exp(-(np.minimum(v,1-v)/.033)**2)
 height=-.0017*seam+.00055*detail+.0005*edge
 rough=np.clip(.54+.065*seam+.008*detail,.46,.65)
 return np.clip(col,0,1),height,rough

def posterior(u,v):
 q=np.minimum(v%1,1-v%1)*2
 belly=smooth((q-.49)/.34)[...,None]
 col=np.array([.115,.151,.080])*(1-belly)+np.array([.205,.190,.117])*belly
 # Broad quiet organic modulation only. No scale reticulation or invented dorsal rays.
 col*=1+(.018*np.sin(u*10+q*4)+.009*np.sin(u*21-q*7))[...,None]
 return col
