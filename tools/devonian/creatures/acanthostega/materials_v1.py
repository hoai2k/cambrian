"""Original swatch mapped in physical space to avoid stretched snout pigmentation."""
import bpy,os,struct,zlib,numpy as np
from math import pi
from anatomy_v1 import surf,smooth

def build_materials(here):
 src=bpy.data.images.load(os.path.join(here,'skin-source.png'),check_existing=False);sw,sh=src.size;art=np.array(src.pixels[:]).reshape(sh,sw,4)[...,:3];maps={};lookup={}
 def sample(x,y):return art[(np.mod(y,1)*(sh-1)).astype(int),(np.mod(x,1)*(sw-1)).astype(int)]
 def image(name,rgb,color):
  h,w=rgb.shape[:2];data=(np.clip(rgb[::-1],0,1)*255+.5).astype(np.uint8);chunk=lambda n,d:struct.pack('>I',len(d))+n+d+struct.pack('>I',zlib.crc32(n+d)&0xffffffff);raw=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r.tobytes()for r in data),8))+chunk(b'IEND',b'');path=os.path.join(here,name+'.png');open(path,'wb').write(raw);im=bpy.data.images.load(path,check_existing=False);im.colorspace_settings.name='sRGB'if color else'Non-Color';im.pack();return im
 for family,width,height in [('body',1536,1536),('fin',1024,1024),('eye',256,256)]:
  v,u=np.mgrid[0:height,0:width]/np.array([height-1,width-1])[:,None,None];a=u*2*pi-pi/2;ss=np.sin(a)
  if family=='body':
   y=-2.2+v/.8*7.2;coords=np.array([surf(float(np.clip(yr[0],-2.2,5)),ar)for yr,ar in zip(y,a)]);x,yy,z=coords[...,0],coords[...,1],coords[...,2]
   dorsal=np.abs(ss)**3;tex=sample(x*.55+.4,yy*.26+.3)*dorsal[...,None]+sample(z*.65+.5,yy*.26+.3)*(1-dorsal[...,None]);grain=tex.mean(-1);head=1-smooth((yy+.85)/.45)
   upper=smooth((ss+.25)/.95);top=np.array([.33,.215,.12])+(grain-.38)[...,None]*np.array([.5,.37,.23]);under=np.array([.59,.46,.29])+(grain-.38)[...,None]*.12;rgb=under*(1-upper[...,None])+top*upper[...,None]
   cloud=.96+.045*np.sin(yy*5+np.sin(x*7))+.025*np.cos(yy*11+x*4);rgb*=cloud[...,None];micro=sample(x*1.1+.6,yy*.7+.4).mean(-1)
   # Fine integrated cranial sculpture and ventral chevron gastralia; no invented dorsal scale coat.
   cranial=.02*(micro-.38)*head;ventral=(1-upper)*(1-head)*(1-smooth((yy-1.7)/.4));chevron=np.cos(yy*54+abs(x)*19)**12*ventral;rgb*=1-.055*chevron[...,None];relief=.023*(grain-.38)+cranial+.003*chevron
   nares=np.exp(-((yy+1.92)/.045)**2-((abs(x)-.38)/.06)**2)*np.maximum(0,ss)**2;rgb*=1-.28*nares[...,None]
   oral=v>=.8;t=np.clip((v-.8)/.2,0,1);tissue=np.array([.46,.285,.235])*(.34+.66*np.exp(-2.2*t[...,None]));tissue=tissue*(.96+.025*np.cos(6*a)[...,None]+.015*np.sin(t*25+a*5)[...,None]);rgb=np.where(oral[...,None],tissue,rgb);relief=np.where(oral,.002*np.cos(6*a)*np.sin(pi*t)**2,relief);rough=np.where(oral,.60+.09*t,.67-.035*upper-.07*(grain-.38))
  elif family=='fin':
   angle=u*2*pi;upper=smooth((np.sin(angle)+.25)/.95);tex=sample(np.cos(angle)*.35+.4,v*.40+.3);grain=tex.mean(-1);rgb=np.array([.39,.27,.15])+(grain-.38)[...,None]*np.array([.32,.25,.16]);rgb+=(.022*(1-upper))[...,None];relief=.012*(grain-.38);rough=.68-.04*upper
  else:
   rgb=np.ones((*u.shape,3))*np.array([.045,.055,.037]);rgb*=((.95+.05*np.sin(u*15*pi)*np.sin(v*pi)))[...,None];relief=np.zeros_like(u);rough=np.full_like(u,.225)
  dy,dx=np.gradient(relief);nx=-dx*65;ny=-dy*65;nz=np.ones_like(nx);length=np.sqrt(nx*nx+ny*ny+nz*nz);normal=np.stack([nx/length*.5+.5,ny/length*.5+.5,nz/length*.5+.5],-1)
  lookup[family]=np.clip(rgb,0,1);maps[family]=(image(family+'-albedo',rgb,True),image(family+'-normal',normal,False),image(family+'-roughness',np.repeat(rough[...,None],3,-1),False))
 mats=[]
 for name,family in [('body','body'),('body_detail','body'),('accent',None),('eyes','eye'),('oral','body'),('fins','fin')]:
  m=bpy.data.materials.new('acanthostega '+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.40,.365,.235,1)if name=='accent'else(1,1,1,1);bs.inputs['Roughness'].default_value=.54;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.40 if name=='eyes'else .25;bs.inputs['Coat Weight'].default_value=.045 if name=='eyes'else 0;m.use_backface_culling=False
  if family:
   for kind,im in zip(['Base Color','Normal','Roughness'],maps[family]):
    tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.extension='EXTEND'
    if kind=='Normal':nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.48;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[kind])
  mats.append(m)
 return mats,lookup
