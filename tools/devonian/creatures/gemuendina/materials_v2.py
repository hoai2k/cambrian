"""Original UV material baking for the Gemuendina reconstruction."""
import bpy,os,numpy as np
from math import pi

def cellular(x,y,spacing=.070):
 x=np.asarray(x)/spacing;y=np.asarray(y)/spacing;ix=np.floor(x);iy=np.floor(y);d1=np.full(np.broadcast(x,y).shape,1e9);d2=d1.copy();tone=np.zeros_like(d1)
 for i in [-1,0,1]:
  for j in [-1,0,1]:
   hx=ix+i;hy=iy+j;seed=np.mod(np.sin(hx*127.1+hy*311.7)*43758.5453,1);seed2=np.mod(np.sin(hx*269.5+hy*183.3)*24634.6345,1);d=(x-hx-.15-.7*seed)**2+(y-hy-.15-.7*seed2)**2;yes=d<d1;d2=np.where(yes,d1,np.minimum(d2,d));tone=np.where(yes,seed,tone);d1=np.minimum(d1,d)
 return np.sqrt(d2)-np.sqrt(d1),tone

def build_materials(here,sections):
 src=bpy.data.images.load(os.path.join(here,'integument-source.png'),check_existing=False);sw,sh=src.size;pixels=np.array(src.pixels[:]).reshape(sh,sw,4)[...,:3]
 maps={};lookup={}
 def image(name,rgb,color):
  height,width=rgb.shape[:2];im=bpy.data.images.new(name,width=width,height=height);im.colorspace_settings.name='sRGB'if color else'Non-Color';rgba=np.concatenate((np.clip(rgb,0,1),np.ones((height,width,1))),axis=2).astype(np.float32);im.pixels.foreach_set(rgba.ravel());im.filepath_raw=os.path.join(here,name+'.png');im.file_format='PNG';im.save();bpy.data.images.remove(im);im=bpy.data.images.load(os.path.join(here,name+'.png'),check_existing=False);im.colorspace_settings.name='sRGB'if color else'Non-Color';im.pack();return im
 for family,w,h in [('body',2048,1280),('fin',1024,1024),('oral',512,512)]:
  v,u=np.mgrid[0:h,0:w]/np.array([h-1,w-1])[:,None,None];art=pixels[(v*(sh-1)).astype(int),(u*(sw-1)).astype(int)]
  if family=='body':
   side=v>=.8;y=np.where(side,-1.76+u*5.17,-1.76+v/.8*5.17);ww=np.interp(y,[s[0]for s in sections],[s[1]for s in sections]);hh=np.interp(y,[s[0]for s in sections],[s[2]for s in sections]);zc=np.interp(y,[s[0]for s in sections],[s[3]for s in sections]);x=(np.mod(u,.5)*4-1)*.90;zz=(v-.8)/.2*.5-.25;sideSS=np.clip((zz-zc)/np.maximum(hh,.01),-1,1);x=np.where(side,ww*np.sqrt(np.clip(1-sideSS**2,0,1)),x);ss=np.where(side,sideSS,np.sqrt(np.clip(1-(x/np.maximum(.01,ww))**2,0,1))*np.where(u<.5,1,-1));top=np.maximum(0,ss);gap,tone=cellular(x,y);sideGap,sideTone=cellular(y,zz);sideDetail=np.clip((.6-np.abs(sideSS))/.25,0,1);gap=np.where(side,sideGap,gap);tone=np.where(side,sideTone,tone);mask=top**.6
   # A few larger cranial fields soften into the much finer tesserae between them.
   cranial=np.exp(-((x/.24)**2+((y+1.12)/.42)**2));seams=np.exp(-gap/.065)*(1-.75*cranial)*mask*np.where(side,sideDetail,1)
   heightfield=.11*seams+.01*np.mean(art,axis=-1);dorsal=art*.38+np.array([.18,.145,.075]);regional=1-.23*np.exp(-(x/.35)**2)*np.clip((y+.9)*1.3,0,1);dorsal*=regional[...,None];band=.5+.5*np.sin(y*5.8+np.sin(x*4)*1.3);dorsal*=((.91+.09*band)*(1-.34*seams)*(1+.18*(tone-.5)*mask))[...,None]
   underside=np.array([.56,.48,.34])+art*.13;blend=np.clip((ss+.28)/.63,0,1);rgb=underside*(1-blend[...,None])+dorsal*blend[...,None];rough=.66+.12*seams+.04*(1-blend)
  elif family=='fin':
   x=u*3.6-1.8;y=v*2.26-.94;gap,tone=cellular(x,y,.074);band=.5+.5*np.sin(y*8.3+np.sin(x*4.2)*1.3);edge=np.clip((np.abs(x)-1)/.75,0,1);rgb=(art*.40+np.array([.19,.16,.09]))*(.93+.07*band)[...,None];rgb+=edge[...,None]*np.array([.045,.032,.018]);ww=np.interp(y,[s[0]for s in sections],[s[1]for s in sections]);rootColor=np.array([.32,.275,.185])*(.95+.08*band)[...,None]+.12*(art-.30);mix=np.clip((np.abs(x)-ww)/.70,0,1);mix=mix*mix*(3-2*mix);rgb=rootColor*(1-mix[...,None])+rgb*mix[...,None];heightfield=.015*np.exp(-gap/.04)+.012*np.sin(y*54+x*2);rough=np.full((h,w),.72)+.025*band
  else:
   mott=np.mean(art,axis=-1);depth=np.clip((v-.04)/.86,0,1);rgb=np.stack([.36-.27*depth,.23-.18*depth,.15-.12*depth],axis=-1)*(.94+.12*mott)[...,None];heightfield=.025*np.sin(u*6*pi+.6)*np.sin(v*pi)**2;rough=.72+.12*v
  dy,dx=np.gradient(heightfield);nx=-dx*17;ny=-dy*17;nz=np.ones_like(nx);length=np.sqrt(nx*nx+ny*ny+nz*nz);normal=np.stack([nx/length*.5+.5,ny/length*.5+.5,nz/length*.5+.5],axis=-1)
  maps[family]=(image(family+'-albedo',rgb,True),image(family+'-normal',normal,False),image(family+'-roughness',np.repeat(rough[...,None],3,axis=-1),False));lookup[family]=np.clip(rgb,0,1)
 mats=[]
 for name,family in [('body','body'),('armour','body'),('accent',None),('eyes',None),('oral','oral'),('fins','fin')]:
  m=bpy.data.materials.new('gemuendina '+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.004,.009,.006,1)if name=='eyes'else(.25,.16,.078,1)if name=='accent'else(1,1,1,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.18 if name=='eyes'else .74 if name=='oral'else .70;bs.inputs['Specular IOR Level'].default_value=.45 if name=='eyes'else .22;bs.inputs['Coat Weight'].default_value=.20 if name=='eyes'else 0.0;m.use_backface_culling=False
  if family:
   for kind,im in zip(['Base Color','Normal','Roughness'],maps[family]):
    tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.extension='EXTEND'
    if kind=='Normal':nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.28 if family=='body'else .16;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[kind])
  mats.append(m)
 return mats,lookup
