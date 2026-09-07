"""Bake original imagegen pigment into anatomical UV atlases and author PBR channels.
This is model texture baking: the original bitmap is preserved without changes.
"""
from PIL import Image,ImageFilter
from pathlib import Path
import numpy as np
H=Path(__file__).resolve().parent
src=Image.open(H/'imagegen-skin-source.png').convert('RGB');N=1536

def save(key,col,height,rough):
 col=np.clip(col,0,1);Image.fromarray((col*255).astype('uint8')).save(H/(key+'-albedo.png'))
 gx=np.roll(height,-1,1)-np.roll(height,1,1);gy=np.roll(height,-1,0)-np.roll(height,1,0);n=np.stack([-gx,-gy,np.ones_like(height)],-1);n/=np.sqrt((n*n).sum(-1))[...,None];Image.fromarray(((n*.5+.5)*255).astype('uint8')).save(H/(key+'-normal.png'));Image.fromarray((np.clip(rough,0,1)*255).astype('uint8')).save(H/(key+'-roughness.png'))

def grids(w,h):
 u,v=np.meshgrid(np.linspace(0,1,w),np.linspace(1,0,h));return u,v

def generated(w,h):return np.array(src.resize((w,h),Image.Resampling.LANCZOS))/255

def ease(x):x=np.clip(x,0,1);return x*x*(3-2*x)
u,v=grids(2048,1024);g=generated(2048,1024);variation=g-np.mean(g,(0,1));d=(1-np.cos(v*2*np.pi))/2;flank=ease(d/.60);dorsal=ease((d-.54)/.46)
col=np.array([.72,.71,.62])[None,None,:]*(1-flank[...,None])+np.array([.43,.55,.56])[None,None,:]*flank[...,None];col=col*(1-dorsal[...,None])+np.array([.255,.37,.42])[None,None,:]*dorsal[...,None];col+=variation*(.72-.23*d[...,None]);fine=np.array(src.convert('L').resize((2048,1024),Image.Resampling.LANCZOS))/255;fine-=np.array(src.convert('L').resize((2048,1024)).filter(ImageFilter.GaussianBlur(5)))/255
# Smooth pale belly and fine restrained dorsal microstructure.
height=fine*(.25+.45*d);rough=.42+.035*d+.035*fine;save('body',col,height,rough)
u,v=grids(1024,1024);g=generated(1024,1024);variation=g-np.mean(g,(0,1));col=np.array([.34,.49,.51])[None,None,:]+variation*.54;root=ease(v/.22);col=col*.82+np.array([.11,.13,.125]);fade=ease((u-.72)/.28)*ease(v/.12);col=col*(1-fade[...,None]*.32)+np.array([.62,.64,.55])[None,None,:]*fade[...,None]*.32
# Darker translucent-looking distal web and regional trailing pigmentation.
shade=.13*ease((v-.34)/.66)*(1-ease((u-.87)/.13));col-=shade[...,None]*np.array([.58,.57,.47]);col+=variation*.30
# Fine buried ceratotrichial striation is authored in normal/roughness only.
ray=np.sin((u*(22-7*v)+.04*np.sin(v*5))*2*np.pi);col+=ray[...,None]*.010*ease(v/.3)[...,None];height=ray*.20*ease(v/.3)*(1-ease((u-.94)/.06));rough=.44+.018*ray;save('fin',col,height,rough)
u,v=grids(1024,1024);g=generated(1024,1024);variation=g-np.mean(g,(0,1));col=np.array([.30,.41,.42])[None,None,:]+variation*.55;top=ease((v-.85)/.15);col=col*(1-top[...,None]*.27)+np.array([.49,.53,.43])[None,None,:]*top[...,None]*.27;height=np.sin(u*2*np.pi*19+.2*np.sin(v*5))*.015;save('brush',col,height,np.full_like(u,.43))
u,v=grids(512,512);base=np.array([.39,.42,.35]);tips=ease((v-.30)/.65);col=np.broadcast_to(base,u.shape+(3,)).copy()*(1-tips[...,None])+np.array([.69,.64,.47])*tips[...,None];height=np.sin(u*2*np.pi*3)*.035;save('denticle',col,height,np.full_like(u,.42))
u,v=grids(512,512);tips=ease(v);col=np.array([.53,.46,.34])*(1-tips[...,None])+np.array([.81,.75,.57])*tips[...,None]+np.zeros(u.shape+(3,));save('tooth',col,np.sin(u*2*np.pi*4)*.018,np.full_like(u,.34))
u,v=grids(1024,512);fold=np.sin(v*2*np.pi*14+.5*np.sin(u*2*np.pi*5));col=np.zeros(u.shape+(3,))+np.array([.40,.18,.15]);col+=fold[...,None]*np.array([.018,.007,.006]);col*=1-.19*ease((v-.62)/.38)[...,None];height=.07*fold+.02*np.sin(u*2*np.pi*12);save('oral',col,height,.41+.02*fold)
u,v=grids(512,512);iris=np.exp(-((v-.22)/.07)**2);col=np.zeros(u.shape+(3,))+np.array([.014,.028,.033]);col+=iris[...,None]*np.array([.034,.043,.039]);col+=(iris*np.sin(u*2*np.pi*49))[:,:,None]*.003;save('eye',col,np.zeros_like(u),np.full_like(u,.265))
u,v=grids(1024,1024);xx=(u-.5)*.56;zz=(v-.5)*.62;d=(1+zz/np.sqrt(xx*xx+zz*zz+1e-10))/2;flank=ease(d/.60);dorsal=ease((d-.54)/.46);col=np.array([.72,.71,.62])*(1-flank[...,None])+np.array([.43,.55,.56])*flank[...,None];col=col*(1-dorsal[...,None])+np.array([.255,.37,.42])*dorsal[...,None];g=generated(1024,1024);col+=(g-g.mean((0,1)))*(.72-.23*d[...,None]);save('snout',col,np.zeros_like(u),np.full_like(u,.44))
u,v=grids(512,512);col=np.zeros(u.shape+(3,))+np.array([.25,.36,.37]);save('gill',col,np.zeros_like(u),np.full_like(u,.49))
print('STETH_PBR_ATLASES_READY')
