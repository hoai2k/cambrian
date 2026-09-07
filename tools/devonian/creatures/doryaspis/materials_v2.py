"""Original Doryaspis V2 UV albedo and independently authored dermal relief."""
from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np
H=Path(__file__).resolve().parent;rng=np.random.default_rng(431)
W=2048;T=1024
src=Image.open(H/'pigment-source.png').convert('RGB').resize((W,T));calm=np.asarray(src.filter(ImageFilter.GaussianBlur(8)),float)/255;raw=np.asarray(src,float)/255
pig=.88*calm+.12*raw;pig=pig*.66+np.array([.025,.036,.025]);pig=np.clip(pig,0,1)
def save(name,a,height=None,rough=.5):
 Image.fromarray(np.uint8(np.clip(a,0,1)*255)).save(H/(name+'-albedo.png'))
 if height is None:height=np.zeros(a.shape[:2])
 gy,gx=np.gradient(height);nn=np.dstack((-gx*16,-gy*16,np.ones_like(gx)));nn/=np.linalg.norm(nn,axis=2)[:,:,None]
 Image.fromarray(np.uint8((nn*.5+.5)*255)).save(H/(name+'-normal.png'))
 rr=np.full(a.shape[:2],rough)if np.isscalar(rough)else rough;Image.fromarray(np.uint8(np.clip(rr,0,1)*255)).save(H/(name+'-roughness.png'))
# Posterior rhomboid squamation, shallow relief and quiet natural colour variation.
u,v=np.meshgrid(np.linspace(0,1,W),np.linspace(1,0,T));sx=u*72;sy=v*30;row=np.floor(sx);dx=np.abs((sx%1)-.5)*2;dy=np.abs(((sy+(row%2)*.5)%1)-.5)*2;diamond=np.clip(1-(dx+dy)*.78,0,1);scale=diamond**.7
save('posterior',pig*(.95+.075*scale[:,:,None]),.050*scale,.48-.025*scale)
# Head UV is planar in x/y. Pigment is coherent across the flat shield and cornua.
N=2048;x,y=np.meshgrid(np.linspace(-1.42,1.42,N),np.linspace(.69,-1.12,N));uu=np.clip((y+1.65)/4.4,0,1);vv=.50+.18*np.clip(x/.62,-1,1);head=pig[np.uint16((1-vv)*(T-1)),np.uint16(uu*(W-1))];head=.60*head+.40*np.array([.17,.19,.13]);field=np.sin(x*14+np.sin(y*9)*1.5)+.66*np.cos(y*21+np.sin(x*19))+.32*np.sin(x*43-y*27);islands=np.clip((field-.10)/1.8,0,1);central=np.exp(-(x/.48)**4);head*= (1-.35*islands-.10*central)[:,:,None];head+=np.exp(-((field+.45)/.34)**2)[:,:,None]*np.array([.023,.016,.005])
# Irregular stellate dentine ridges, not parallel extruded cables.
gX=(x+1.42)*33;gY=(y+1.12)*39;ix=np.floor(gX).astype(int);iy=np.floor(gY).astype(int);dist=np.full((N,N),99.);star=np.zeros((N,N))
for ax in [-1,0,1]:
 for ay in [-1,0,1]:
  a=ix+ax;b=iy+ay;jx=np.mod(np.sin(a*127.1+b*311.7)*43758.54,1);jy=np.mod(np.sin(a*269.5+b*183.3)*25741.22,1);dx=gX-(a+.18+.64*jx);dy=gY-(b+.18+.64*jy);d=dx*dx+dy*dy;replace=d<dist;ang=np.arctan2(dy,dx);arms=4+(np.mod(a+b,3));line=np.exp(-((np.sin(ang*arms+jx*2))/(.17+.10*jy))**2)*np.exp(-d*5);star=np.where(replace,line,star);dist=np.minimum(dist,d)
# Shallow plate-boundary traces in the continuous living covering.
seam=Image.new('L',(N,N));draw=ImageDraw.Draw(seam)
paths=[[(0,-.90),(.18,-.84),(.26,-.64),(.36,-.39),(.43,.04),(.34,.45),(0,.57)],[(.17,-1.0),(.28,-.88),(.38,-.68),(.49,-.48)],[(.47,.08),(.54,.30),(.42,.56)]]
for side in [-1,1]:
 for path in paths:
  pts=[(int((side*a+1.42)/2.84*N),int((.69-b)/1.81*N))for a,b in path];draw.line(pts,fill=200,width=3,joint='curve')
se=np.asarray(seam.filter(ImageFilter.GaussianBlur(2)),float)/255
head*=1-.26*se[:,:,None];head*=.95+.07*star[:,:,None];save('shield',head,.025*star-.090*se,.47+.05*se)
# Curved lateral/ventral atlas: quiet countershading and un-stretched fine relief.
flank=.68*pig+.32*np.array([.165,.177,.130]);flank*= (.91+.06*np.cos(u*17+np.sin(v*15)))[:,:,None];save('flank',flank,.009*np.sin(u*170)*np.sin(v*125),.51)
# Pseudorostrum and cornual margins share the shield palette, without pale piping.
save('margin',pig*.66,.008*np.sin(u*60)*np.sin(v*120),.53)
# Hypocercal fin membrane has fine radial structure, modest pigment continuation.
f=pig*.91;rays=(.5+.5*np.cos(u*2*np.pi*32+.13*np.sin(v*10)))**14;save('caudal',f*(1-.08*rays[:,:,None]),.024*rays*np.sin(v*np.pi),.46)
# Dark low-contrast iris, tight corneal highlights and no white scleral rim.
eW,eT=512,256;eu,ev=np.meshgrid(np.linspace(0,1,eW),np.linspace(1,0,eT));iris=np.clip((ev-.065)/.022,0,1)*np.clip((.245-ev)/.03,0,1);ec=np.zeros((eT,eW,3));ec[:]=(.009,.016,.015);ec+=iris[:,:,None]*(.72+.28*np.sin(eu*2*np.pi*53))[:,:,None]*np.array([.052,.065,.044]);save('eye',ec,rough=.34)
# Subdued aquatic oral tissue darkens gradually into the curved cavity.
oW,oT=1024,512;ou,ov=np.meshgrid(np.linspace(0,1,oW),np.linspace(1,0,oT));oc=(1-ov[:,:,None])*np.array([.29,.156,.124])+ov[:,:,None]*np.array([.10,.052,.043]);fold=(.5+.5*np.cos(ou*2*np.pi*13+.15*np.sin(ov*10)))**8;save('oral',oc*(1-.06*fold[:,:,None]),.010*fold,.39)
print('DORYASPIS_UV_MATERIALS_READY')
