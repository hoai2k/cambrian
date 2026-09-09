"""Original imagegen cuticle + deliberately restrained UV pigment/PBR baking."""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
H=Path(__file__).resolve().parent;N=1024
source=Image.open(H/'imagegen-cuticle-source.png').convert('RGB').resize((N,N),Image.Resampling.LANCZOS);raw=np.asarray(source).astype(float)/255;y,x=np.mgrid[0:N,0:N]/(N-1);lum=raw[:,:,0]*.25+raw[:,:,1]*.60+raw[:,:,2]*.15;variation=(lum-lum.mean())*.72
base=raw*.66+np.array([.24,.28,.22])*.34
# Regionally lighter genae/pleurae, darker axial field; pigment continuity uses shared dorsal UVs.
edge=np.clip((abs(x-.5)-.22)/.27,0,1);base+=edge[:,:,None]*np.array([.065,.060,.044]);base-=np.exp(-((x-.5)/.12)**2)[:,:,None]*np.array([.025,.023,.014]);base=np.clip(base*1.13,0,1)
rng=np.random.default_rng(733);grain=np.asarray(Image.fromarray(np.uint8(rng.uniform(0,255,(N,N)))).filter(ImageFilter.GaussianBlur(.9))).astype(float)/255;h=(grain-.5)*.018+(lum-np.asarray(source.filter(ImageFilter.GaussianBlur(3))).astype(float).mean(2)/255)*.08
dy,dx=np.gradient(h);normal=np.stack([-dx*1.2,dy*1.2,np.ones_like(dx)],2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
def save(n,a):Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(H/n)
wy=(1-y)*3.65-1.40;wx=(x-.5)*2.2;et=(wy+.59)/.253;cx=.705-.017*et*et;ew=.075*np.maximum(0,1-et*et)**.30;field=np.clip((ew-abs(abs(wx)-cx))/.014,0,1)*np.clip((1-abs(et))/.12,0,1);body=base*(1-.28*field[:,:,None])
for key,col in [('body',body),('underside',base*.30+np.array([.32,.32,.235])*.70),('legs',base*.51+np.array([.27,.29,.21])*.49),('gills',base*.30+np.array([.31,.36,.29])*.70)]:
 save(key+'-albedo.png',col);save(key+'-normal.png',normal*.5+.5);save(key+'-roughness.png',np.clip(.46+(grain-.5)*.065+(lum-.3)*.07,0,1))
print('Eldredgeops original UV materials ready')
