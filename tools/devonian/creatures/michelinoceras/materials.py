from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
H=Path(__file__).resolve().parent;N=1024;y,x=np.mgrid[0:N,0:N]/(N-1);rng=np.random.default_rng(72192)
def save(name,a):
 a=np.array(a,copy=True);mean=(a[:,:32].mean(1)+a[:,-32:].mean(1))/2
 for i in range(80):
  t=i/80;t=t*t*(3-2*t);a[:,i]=mean*(1-t)+a[:,i]*t;a[:,-i-1]=mean*(1-t)+a[:,-i-1]*t
 Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(H/(name+'.png'))
raw=np.asarray(Image.open(H/'imagegen-shell-source.png').convert('RGB').resize((N,N),Image.Resampling.LANCZOS)).astype(float)/255
# Feather both circumference edges to an identical mean, preserving continuous shell UV seam.
mean=(raw[:,:45].mean(1)+raw[:,-45:].mean(1))/2
for i in range(48):
 t=i/48;raw[:,i]=mean*(1-t)+raw[:,i]*t;raw[:,-i-1]=mean*(1-t)+raw[:,-i-1]*t
save('shell-albedo',raw);noise=np.asarray(Image.fromarray(np.uint8(rng.random((N,N))*255)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)/255
fine=(noise-.5)*.006+.0015*np.sin(y*2*np.pi*210+np.sin(2*np.pi*x));dy,dx=np.gradient(fine);normal=np.stack([-dx*3,dy*3,np.ones_like(dx)],2);normal/=np.linalg.norm(normal,axis=2)[:,:,None];save('shell-normal',normal*.5+.5);save('shell-roughness',.34+(noise-.5)*.08)
# Restrained original skin mottling, never the shell pigment copied onto soft tissue.
coarse=np.asarray(Image.fromarray(np.uint8(rng.random((48,48))*255)).resize((N,N),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(4))).astype(float)/255
spots=np.clip((coarse-.50)*2.1,0,.28);base=np.array([.45,.26,.145])+((coarse-.5)*.10)[:,:,None];base-=spots[:,:,None]*np.array([.55,.33,.18]);base+=(.5-.5*np.cos(2*np.pi*x))[:,:,None]*np.array([.065,.036,.017]);save('skin-albedo',base);save('skin-normal',normal*.5+.5);save('skin-roughness',.47+(noise-.5)*.09)
for n,col in [('nacre',[.78,.70,.55]),('ridge',[.54,.35,.20])]:
 save(n+'-albedo',np.array(col)+(noise-.5)[:,:,None]*.04);save(n+'-normal',normal*.5+.5);save(n+'-roughness',np.ones_like(x)*(.31 if n=='nacre'else.48))
