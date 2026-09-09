"""Original living echinoderm pigment with restrained fine stereom/skin detail."""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
H=Path(__file__).resolve().parent;N=1024
im=Image.open(H/'imagegen-skin-source.png').convert('RGB').resize((N,N),Image.Resampling.LANCZOS);raw=np.asarray(im).astype(float)/255;y,x=np.mgrid[0:N,0:N]/(N-1);lum=raw.mean(2);rng=np.random.default_rng(6402);noise=np.asarray(Image.fromarray(np.uint8(rng.random((N,N))*255)).filter(ImageFilter.GaussianBlur(.8))).astype(float)/255
h=(noise-.5)*.018+(lum-np.asarray(im.filter(ImageFilter.GaussianBlur(4))).mean(2)/255)*.04;dy,dx=np.gradient(h);nm=np.stack([-dx,dy,np.ones_like(dx)],2);nm/=np.linalg.norm(nm,axis=2)[:,:,None]
def save(name,a):Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(H/name)
for name,mix,col in [('body',.75,[.24,.10,.068]),('ossicles',.44,[.46,.31,.17]),('spines',.28,[.44,.33,.21]),('underside',.28,[.43,.28,.19]),('podia',.34,[.34,.245,.15])]:
 base=raw*mix+np.array(col)*(1-mix);base+=.025*np.cos(y*2*np.pi*5)[:,:,None]*np.array([1,.7,.5]);save(name+'-albedo.png',base);save(name+'-normal.png',nm*.5+.5);save(name+'-roughness.png',.52+(noise-.5)*.10)
print('Furcaster original PBR maps ready')
