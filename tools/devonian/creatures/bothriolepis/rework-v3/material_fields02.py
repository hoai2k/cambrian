"""MATERIAL02: consistent linear pigment, with quiet scaleless posterior skin.
Anatomical suture layout is inherited unchanged from the reviewed MATERIAL01.
"""
import numpy as np
from material_fields01 import PATHS,smooth,shield as _shield,pectoral as _pectoral

def linear_to_srgb(x):
 x=np.clip(x,0,1)
 return np.where(x<=.0031308,12.92*x,1.055*x**(1/2.4)-.055)

def srgb_to_linear(x):
 x=np.clip(x,0,1)
 return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)

def shield(u,v,detail=None):
 c,h,r,relief,d=_shield(u,v,detail)
 return c*.70,h,r,relief,d

def pectoral(u,v,detail=None):
 c,h,r=_pectoral(u,v,detail)
 return c*.70,h,r

def posterior(u,v,detail=None):
 if detail is None:detail=np.zeros(np.broadcast(u,v).shape,dtype=np.float32)
 q=np.minimum(v%1,1-v%1)*2
 belly=smooth((q-.49)/.34)[...,None]
 color=np.array([.075,.096,.052])*(1-belly)+np.array([.133,.126,.082])*belly
 broad=.033*np.sin(u*8.7+q*4.1)+.018*np.sin(u*17.3-q*6.4)
 color*=1+broad[...,None]+.012*detail[...,None]
 # Exact pigment agreement at the posterior shell boundary, followed by a
 # short organic transition. No pale ring marks the material slot change.
 boundary=shield(np.full(np.broadcast(u,v).shape,.999),v,detail)[0]
 transition=smooth(np.clip(u,0,1)/.14)[...,None]
 color=boundary*(1-transition)+color*transition
 # Subtle irregular, longitudinal skin response: not plates, scales or fin rays.
 height=.00012*detail+.000035*np.sin(q*91+1.4*np.sin(u*11))*smooth(u/.12)
 rough=np.clip(.565+.024*detail+.012*np.sin(u*15+q*3),.51,.61)
 return color,height,rough

def extend_boundary_colors(faces,colors,unknown,max_iterations=600):
 """Harmonic pigment continuation through the existing cap/rim/root patches.

Known shield/pectoral boundary colors are fixed. This changes pigment only;
it neither smooths geometry nor expands the color of a decorative patch.
"""
 ids=np.flatnonzero(unknown)
 if not len(ids):return colors,{'unknown_vertices':0,'iterations':0,'residual':0.}
 adjacency=[set() for _ in range(len(colors))]
 for face in faces:
  for a,b in zip(face,face[1:]+face[:1]):adjacency[a].add(b);adjacency[b].add(a)
 dest=[];src=[]
 for row,i in enumerate(ids):
  for j in adjacency[i]:dest.append(row);src.append(j)
 dest=np.array(dest);src=np.array(src);degree=np.bincount(dest,minlength=len(ids))[:,None]
 out=colors.copy();out[ids]=np.mean(colors[~unknown],axis=0)
 residual=1.;iteration=0
 while residual>1e-8 and iteration<max_iterations:
  sums=np.zeros((len(ids),3));np.add.at(sums,dest,out[src]);new=sums/degree
  residual=float(np.max(np.abs(new-out[ids])));out[ids]=new;iteration+=1
 assert np.isfinite(out).all()
 return out,{'unknown_vertices':int(len(ids)),'iterations':iteration,'residual':residual,
             'boundary_colors_unchanged':bool(np.array_equal(out[~unknown],colors[~unknown]))}
