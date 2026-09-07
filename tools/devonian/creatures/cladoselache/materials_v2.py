"""Original imagegen swatch plus anatomically mapped countershading and PBR bake."""
import bpy,os,struct,zlib,numpy as np
from math import pi

def build_materials(here):
 src=bpy.data.images.load(os.path.join(here,'skin-source.png'),check_existing=False);sw,sh=src.size;art=np.array(src.pixels[:]).reshape(sh,sw,4)[...,:3];art=np.clip(art,0,1)
 maps={};lookup={}
 def image(name,rgb,color):
  h,w=rgb.shape[:2];data=(np.clip(rgb[::-1],0,1)*255+.5).astype(np.uint8);chunk=lambda name,data:struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff);raw=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r.tobytes()for r in data),8))+chunk(b'IEND',b'');path=os.path.join(here,name+'.png');open(path,'wb').write(raw);im=bpy.data.images.load(path,check_existing=False);im.colorspace_settings.name='sRGB'if color else'Non-Color';im.pack();return im
 for family,width,height in [('body',2048,1536),('fin',1024,1024),('eye',512,512)]:
  v,u=np.mgrid[0:height,0:width]/np.array([height-1,width-1])[:,None,None];sample=art[(v*(sh-1)).astype(int),(u*(sw-1)).astype(int)];grain=sample.mean(-1);detail=grain-np.mean(grain)
  if family=='body':
   y=-2.24+v/.8*4.96;a=u*2*pi-pi/2;ss=np.sin(a);dorsal=np.clip((ss+.28)/.85,0,1);dorsal=dorsal*dorsal*(3-2*dorsal);cloud=.91+.09*np.sin(y*3.9+np.sin(a*2.2));top=np.array([.17,.28,.32])+sample*.35;under=np.array([.66,.67,.57])+sample*.12;rgb=under*(1-dorsal[...,None])+top*dorsal[...,None];rgb*=cloud[...,None]
   # Gentle warm shoulder sheen and tapering tail darkness; no decorative lateral cord.
   shoulder=np.exp(-((y+1.0)/.8)**2)*np.exp(-((ss-.12)/.26)**2);rgb+=shoulder[...,None]*np.array([.044,.024,-.008]);rgb*=(1-.11*np.clip((y-1.4)/1.4,0,1))[...,None]
   clefts=np.zeros_like(u)
   for k in range(5):clefts+=np.exp(-((y-(-1.22+.117*k+.045*np.sin(a+.4)+.025*np.cos(2*a)))/.011)**2)
   clefts*=np.abs(np.cos(a))**5*np.clip((ss+.72)/.12,0,1)*np.clip((.60-ss)/.14,0,1);rgb*=1-.30*np.clip(clefts,0,1)[...,None]
   oral=v>=.8;t=np.clip((v-.8)/.2,0,1);soft=.5+.5*np.sin(6*a+.5);oralrgb=(np.array([.43,.26,.235])*(.09+.91*np.exp(-4*t[...,None])))*(.95+.05*soft[...,None]);rgb=np.where(oral[...,None],oralrgb,rgb);relief=.004*detail+.0012*clefts;relief=np.where(oral,.014*soft*np.sin(pi*t)**2,relief);rough=np.where(oral,.65+.13*t,.52+.08*(1-dorsal)+.04*detail)
  elif family=='fin':
   root=np.array([.46,.53,.49]);tip=np.array([.265,.385,.405]);mix=np.clip(v,0,1)**.65;rgb=root*(1-mix[...,None])+tip*mix[...,None];rgb+=.24*(sample-.5);rgb*=1-.08*np.sin(u*pi)[...,None]*v[...,None];relief=.006*detail+.0017*np.sin(u*26*pi+.6*v)*np.sin(v*pi);rough=.57+.10*v+.04*detail
  else:
   rgb=np.ones((*u.shape,3))*np.array([.055,.080,.082]);rgb*=((.92+.08*np.sin(u*13*pi)*np.sin(v*pi)))[...,None];relief=np.zeros_like(u);rough=np.full_like(u,.235)
  dy,dx=np.gradient(relief);nx=-dx*35;ny=-dy*35;nz=np.ones_like(nx);length=np.sqrt(nx*nx+ny*ny+nz*nz);normal=np.stack([nx/length*.5+.5,ny/length*.5+.5,nz/length*.5+.5],-1)
  lookup[family]=np.clip(rgb,0,1);maps[family]=(image(family+'-albedo',rgb,True),image(family+'-normal',normal,False),image(family+'-roughness',np.repeat(rough[...,None],3,-1),False))
 mats=[]
 for name,family in [('body','body'),('body_detail','body'),('accent',None),('eyes','eye'),('oral','body'),('fins','fin')]:
  m=bpy.data.materials.new('cladoselache '+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.40,.365,.235,1)if name=='accent'else(1,1,1,1);bs.inputs['Roughness'].default_value=.45;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.42 if name=='eyes'else .24;bs.inputs['Coat Weight'].default_value=.055 if name=='eyes'else .025;m.use_backface_culling=False
  if family:
   for kind,im in zip(['Base Color','Normal','Roughness'],maps[family]):
    tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.extension='EXTEND'
    if kind=='Normal':nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.22;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[kind])
  mats.append(m)
 return mats,lookup
