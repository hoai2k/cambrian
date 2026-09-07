"""Author UV-space PBR sheets from the retained imagegen pigment study."""
from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import numpy as np
H=Path(__file__).resolve().parent
W,T=2048,1024
src=Image.open(H/'skin-atlas-v2-source.png').convert('RGB').resize((W,T),Image.Resampling.LANCZOS)
# Flatten tiny bright surface glints in the generated study; fine relief is a separate map.
soft=src.filter(ImageFilter.GaussianBlur(1.3));a=np.array(Image.blend(src,soft,.75),dtype=float)/255
# Subtle suture and sensory-canal lines are deliberately placed in this specimen's UV layout.
# Calm the generated stone-like microcontrast into coherent living pigmentation.
blur=np.array(src.filter(ImageFilter.GaussianBlur(7)),dtype=float)/255
finecolor=a-blur
a=blur+finecolor*.28
u,v=np.meshgrid(np.linspace(0,1,W),np.linspace(0,1,T));dorsal=np.exp(-((v-.5)/.24)**4)
base=np.zeros_like(a);base[:]=(.19,.235,.215)
# The head and thoracic armour have calm, dark living coverings; posterior flanks retain restrained pattern.
armormask=np.clip((.51-u)/.12,0,1)*np.clip((.36-abs(v-.5))/.10,0,1)
a=a*(1-armormask[:,:,None]*.70)+base*armormask[:,:,None]*.70
seam=Image.new('L',(W,T),0);d=ImageDraw.Draw(seam)
paths=[[(.016,.32),(.08,.40),(.15,.425),(.235,.39)],[(.064,.275),(.10,.335),(.155,.355),(.207,.30),(.238,.17)],[(.245,.10),(.23,.24),(.245,.37),(.25,.43)],[(.25,.43),(.325,.455),(.43,.44),(.475,.5)],[(.475,.5),(.43,.37),(.365,.21),(.29,.095)],[(.25,.32),(.295,.35),(.335,.31),(.347,.25),(.37,.26)],[(.29,.10),(.375,.085),(.425,.10)]]
for path in paths:
 for flip in [False,True]:
  pts=[]
  for j in range(len(path)-1):
   A=np.array(path[max(0,j-1)]);B=np.array(path[j]);C=np.array(path[j+1]);D=np.array(path[min(len(path)-1,j+2)])
   for t in np.linspace(0,1,24):
    q=.5*(2*B+(-A+C)*t+(2*A-5*B+4*C-D)*t*t+(-A+3*B-3*C+D)*t**3);u,v=q;pts.append((int(u*W),int((v if flip else 1-v)*T)))
  d.line(pts,fill=210,width=5,joint='curve')
se=np.array(seam.filter(ImageFilter.GaussianBlur(1.2)),dtype=float)/255
# Sutures appear as shallow soft integument recesses, never black cracks between floating plates.
a*=1-se[:,:,None]*.31
# Retain some illuminated colour read in a game studio without bleaching the dorsal pattern.
a=np.clip(a*1.10+.008,0,1)
Image.fromarray((a*255).astype('uint8')).save(H/'body-albedo.png')
noise=np.random.default_rng(73).random((T,W));fine=noise-np.array(Image.fromarray((noise*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.0)))/255
height=.006*fine-.125*se
# Tangent-space slopes from independently authored relief, not inferred physical depth from colour.
gy,gx=np.gradient(height);normal=np.dstack((-gx*13,-gy*13,np.ones_like(gx)));normal/=np.linalg.norm(normal,axis=2)[:,:,None]
Image.fromarray(np.uint8(np.clip(normal*.5+.5,0,1)*255)).save(H/'body-normal.png')
rough=np.clip(.55+.045*se+.055*fine,.44,.66);Image.fromarray(np.uint8(rough*255)).save(H/'body-roughness.png')
# Fin sheet: longitudinal radial grain with calm membranes and slightly worn margins.
u,v=np.meshgrid(np.linspace(0,1,W),np.linspace(0,1,T));rays=(.5+.5*np.cos(u*2*np.pi*27))**16
f=np.empty((T,W,3));f[:]=(.22,.265,.215);f*=((1.13-.48*v+.035*np.sin(u*12))*(1-.075*rays))[:,:,None];f+=fine[:,:,None]*.008
Image.fromarray(np.uint8(np.clip(f,0,1)*255)).save(H/'fin-albedo.png')
fh=.010*rays*np.sin(v*np.pi)+.002*fine;gy,gx=np.gradient(fh);nn=np.dstack((-gx*15,-gy*15,np.ones_like(gx)));nn/=np.linalg.norm(nn,axis=2)[:,:,None]
Image.fromarray(np.uint8((nn*.5+.5)*255)).save(H/'fin-normal.png');Image.fromarray(np.uint8((.44+.08*rays)*255)).save(H/'fin-roughness.png')
print('PBR textures authored')

# Gnathal roots are darker; only the actual cutting margins are pale worn bone.
gW,gT=512,256;gu,gv=np.meshgrid(np.linspace(0,1,gW),np.linspace(0,1,gT));g=np.zeros((gT,gW,3));root=np.array([.19,.15,.095]);edge=np.array([.59,.53,.38]);blend=np.clip((1-gv-.24)/.70,0,1)**.7;g=root[None,None,:]*(1-blend[:,:,None])+edge[None,None,:]*blend[:,:,None];g*=1+(.025*np.sin(gu*240+gv*12))[:,:,None]
Image.fromarray(np.uint8(np.clip(g,0,1)*255)).save(H/'gnathal-albedo.png')
Image.fromarray(np.uint8(np.full((gT,gW),.39)*255)).save(H/'gnathal-roughness.png');normal=np.zeros((gT,gW,3));normal[:]=(.5,.5,1);Image.fromarray(np.uint8(normal*255)).save(H/'gnathal-normal.png')

# One eye globe texture: dark pupil, subdued radial iris, no luminous sclera.
eW,eT=512,256;eu,ev=np.meshgrid(np.linspace(0,1,eW),np.linspace(1,0,eT));pupil=np.clip((ev-.075)/.028,0,1);rim=np.clip((.235-ev)/.035,0,1);ir=pupil*rim;streak=.8+.2*np.sin(eu*2*np.pi*67+ev*22);ec=np.zeros((eT,eW,3));ec[:]=(.012,.017,.015);ec+=ir[:,:,None]*streak[:,:,None]*np.array([.090,.071,.026])[None,None,:];Image.fromarray(np.uint8(ec*255)).save(H/'eye-albedo.png')
Image.fromarray(np.uint8(np.full((eT,eW),.205)*255)).save(H/'eye-roughness.png');normal=np.zeros((eT,eW,3));normal[:]=(.5,.5,1);Image.fromarray(np.uint8(normal*255)).save(H/'eye-normal.png')

# Oral mucosa: a subdued moist surface with longitudinal folds, darkening into the pharynx.
oW,oT=1024,512;ou,ov=np.meshgrid(np.linspace(0,1,oW),np.linspace(1,0,oT));front=np.array([.31,.12,.095]);back=np.array([.085,.027,.029]);oc=front[None,None,:]*(1-ov[:,:,None]) + back[None,None,:]*ov[:,:,None];fold=(.5+.5*np.cos(ou*2*np.pi*11+.12*np.sin(ov*18)))**8;oc*=1-.09*fold[:,:,None];Image.fromarray(np.uint8(oc*255)).save(H/'oral-albedo.png')
Image.fromarray(np.uint8((.37+.06*ov)*255)).save(H/'oral-roughness.png');oh=.015*fold*np.sin(ov*np.pi);gy,gx=np.gradient(oh);nn=np.dstack((-gx*8,-gy*8,np.ones_like(gx)));nn/=np.linalg.norm(nn,axis=2)[:,:,None];Image.fromarray(np.uint8((nn*.5+.5)*255)).save(H/'oral-normal.png')
