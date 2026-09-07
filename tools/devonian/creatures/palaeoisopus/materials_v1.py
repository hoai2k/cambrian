"""Baked original cuticle PBR atlases: muted copper, plum-brown pores and ivory wear."""
import bpy,os,struct,zlib,numpy as np
from math import pi

def build_materials(here):
 maps={};lookup={}
 def image(name,rgb,color):
  h,w=rgb.shape[:2];data=(np.clip(rgb[::-1],0,1)*255+.5).astype(np.uint8);chunk=lambda n,d:struct.pack('>I',len(d))+n+d+struct.pack('>I',zlib.crc32(n+d)&0xffffffff);raw=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r.tobytes()for r in data),8))+chunk(b'IEND',b'');path=os.path.join(here,name+'.png');open(path,'wb').write(raw);im=bpy.data.images.load(path,check_existing=False);im.colorspace_settings.name='sRGB'if color else'Non-Color';im.pack();return im
 for family,size in [('body',1024),('fin',512),('eye',128)]:
  v,u=np.mgrid[0:size,0:size]/(size-1);a=u*2*pi;cloud=np.zeros_like(u)
  for freq,amp,offset in [(3,.38,.3),(7,.23,1.5),(17,.16,2.2),(41,.10,1.4),(97,.075,2.1),(193,.04,.8)]:cloud+=amp*np.sin(a*freq+np.sin(v*freq*4+offset))*np.cos(v*freq*6+np.cos(a*3.0))
  stipple=(np.sin(a*121+np.sin(v*113))*np.cos(v*197+np.sin(a*31)))**8
  upper=(np.sin(a)*.5+.5);edge=np.exp(-((v-.12)/.06)**2)+np.exp(-((v-.88)/.06)**2)
  if family=='body':
   rgb=np.array([.37,.235,.19])+cloud[...,None]*np.array([.13,.12,.085]);rgb+=((1-upper)*.055+edge*.035)[...,None]*np.array([1,.89,.66]);rgb-=stipple[...,None]*np.array([.026,.020,.018]);relief=cloud*.018-stipple*.004;rough=.60+.045*cloud-.04*edge
  elif family=='fin':
   rgb=np.array([.18,.125,.10])+cloud[...,None]*.075;relief=cloud*.008;rough=.75+.05*cloud
  else:
   rgb=np.array([.255,.13,.115])+cloud[...,None]*.055;rgb*=1-.5*v[...,None];relief=cloud*.003;rough=.61+v*.1
  dy,dx=np.gradient(relief);nx=-dx*48;ny=-dy*48;nz=np.ones_like(nx);length=np.sqrt(nx*nx+ny*ny+nz*nz);normal=np.stack([nx/length*.5+.5,ny/length*.5+.5,nz/length*.5+.5],-1)
  lookup[family]=np.clip(rgb,0,1);maps[family]=(image(family+'-albedo',rgb,True),image(family+'-normal',normal,False),image(family+'-roughness',np.repeat(rough[...,None],3,-1),False))
 mats=[]
 for name,family in [('body','body'),('joint','fin'),('setae',None),('unused','eye'),('oral','eye'),('unused2','fin')]:
  m=bpy.data.materials.new('palaeoisopus '+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.26,.19,.12,1)if family is None else(1,1,1,1);bs.inputs['Roughness'].default_value=.66;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.23;m.use_backface_culling=False
  if family:
   for kind,im in zip(['Base Color','Normal','Roughness'],maps[family]):
    tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.extension='EXTEND'
    if kind=='Normal':nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.38;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[kind])
  mats.append(m)
 return mats,lookup
