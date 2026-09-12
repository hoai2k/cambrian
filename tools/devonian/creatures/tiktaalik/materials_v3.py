"""Original swatch mapped in physical space to avoid stretched snout pigmentation.

V3: identical to materials_v2.py except the anatomy import, so the albedo/normal/roughness
sampling (including the nares/spiracle darkening, which recomputes surf() itself) tracks the V3
surface. materials_v2.py's y-station range (y=-2.8..4.43, i.e. v/.8*7.23 starting at -2.8) is
unchanged by the V3 SEC table, which keeps its first/last y stations at -2.80/4.43, so the UV
y-range needs no mirroring here.

The body family's albedo/normal/roughness are resampled off surf(), which V3 changes, so they
differ in content from the tracked V2 PNGs (fin/eye do not call surf() and come out identical to
V2's). image() writes '<family>-albedo-v3.png' etc rather than the tracked V2 names, so a V3 build
never overwrites the shipped skin-source-derived textures in place.
"""
import bpy,os,struct,zlib,numpy as np
from math import pi
from anatomy_v3 import surf,smooth,physical_y

def build_materials(here):
 src=bpy.data.images.load(os.path.join(here,'skin-source.png'),check_existing=False);sw,sh=src.size;art=np.array(src.pixels[:]).reshape(sh,sw,4)[...,:3];maps={};lookup={}
 def sample(x,y):return art[(np.mod(y,1)*(sh-1)).astype(int),(np.mod(x,1)*(sw-1)).astype(int)]
 def image(name,rgb,color):
  h,w=rgb.shape[:2];data=(np.clip(rgb[::-1],0,1)*255+.5).astype(np.uint8);chunk=lambda n,d:struct.pack('>I',len(d))+n+d+struct.pack('>I',zlib.crc32(n+d)&0xffffffff);raw=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\0'+r.tobytes()for r in data),8))+chunk(b'IEND',b'');path=os.path.join(here,name+'.png');open(path,'wb').write(raw);im=bpy.data.images.load(path,check_existing=False);im.colorspace_settings.name='sRGB'if color else'Non-Color';im.pack();return im
 for family,width,height in [('body',2048,2048),('fin',1024,1024),('eye',256,256)]:
  v,u=np.mgrid[0:height,0:width]/np.array([height-1,width-1])[:,None,None];a=u*2*pi-pi/2;ss=np.sin(a)
  if family=='body':
   y=-2.8+v/.8*7.23;coords=np.array([surf(float(np.clip(yr[0],-2.8,4.43)),ar)for yr,ar in zip(y,a)]);x,yy,z=coords[...,0],coords[...,1],coords[...,2];yy=physical_y(yy)
   dorsal=np.abs(ss)**3;s1=sample(x*.48+.4,yy*.24+.3);s2=sample(z*.70+.5,yy*.24+.3);tex=s1*dorsal[...,None]+s2*(1-dorsal[...,None]);grain=tex.mean(-1);head=1-smooth((yy+.9)/.5)
   # The cranial roof has finer dermal sculpture than the scale-bearing trunk.
   micro=sample(x*1.05+.6,yy*.61+.4).mean(-1);fine=(micro-.38)*.32;scale=(grain-.38)*(1-head)+fine*head
   upper=smooth((ss+.22)/.93);cloud=.92+.045*np.sin(yy*3.8+np.sin(x*6))+.035*np.sin(yy*7.2-x*3)
   top=np.array([.35,.375,.205])+scale[...,None]*np.array([.44,.40,.25]);under=np.array([.64,.59,.405])+(grain-.4)[...,None]*.08;rgb=under*(1-upper[...,None])+top*upper[...,None];rgb*=cloud[...,None];rgb+=head[...,None]*(.017*np.sin(x*21+yy*11)+.012*np.sin(yy*28-x*17))[...,None]*np.array([1,.78,.42])
   flank=np.exp(-((ss-.1)/.25)**2)*(1-head);rgb+=flank[...,None]*np.array([.05,.02,-.015]);rgb*=1-.07*smooth((yy-2.4)/1.5)[...,None]
   nares=np.exp(-((yy+2.35)/.045)**2)*np.exp(-((abs(x)-.27)/.055)**2)*np.maximum(0,ss)**2;spiracle=np.exp(-((yy+.99)/.10)**2)*np.exp(-((abs(x)-.54)/.09)**2)*np.maximum(0,ss)**2;rgb*=1-(.28*nares*smooth((z-.06)/.07)+.26*spiracle)[...,None]
   # Fine skull roof sensory sculpture: quiet, uneven and flush with skin.
   groove=np.exp(-((abs(x)-(.16+.09*np.sin((yy+2.8)*1.4)))/.010)**2)*head*smooth((yy+2.53)/.14)*(1-smooth((yy+1.15)/.18))*np.maximum(0,ss)**3;rgb*=1-.055*groove[...,None]
   oral=v>=.8;t=np.clip((v-.8)/.2,0,1);tissue=np.array([.43,.30,.235])*(.22+.78*np.exp(-2.8*t[...,None]));tissue=tissue*(.94+.04*np.cos(6*a)[...,None]+.02*np.sin(t*29+a*5)[...,None]);rgb=np.where(oral[...,None],tissue,rgb);relief=.025*scale+.024*fine-.001*groove;relief=np.where(oral,.002*np.cos(6*a)*np.sin(pi*t)**2,relief);rough=np.where(oral,.59+.10*t,.62+.065*(1-upper)-.07*scale)
  elif family=='fin':
   # Same earthy proximal colour; translucent-looking distal web is pigment/roughness only.
   angle=u*2*pi;upper=smooth((np.sin(angle)+.16)/.9);tex=sample(np.cos(angle)*.18+.6,v*.44+.3);grain=tex.mean(-1);web=smooth((v-.35)/.50);top=np.array([.355,.37,.215])+(grain-.4)[...,None]*.18*(1-web[...,None]);under=np.array([.61,.56,.39]);rgb=under*(1-upper[...,None])+top*upper[...,None];rgb=rgb*(1-.10*web[...,None]);rays=(.5+.5*np.cos(32*angle+1.3*v))**8*np.sin(pi*v)**2*web;rgb*=1-.07*rays[...,None];rgb+=(.012*np.sin(v*18+np.cos(angle)*4))[...,None];relief=.009*(grain-.4)*(1-web)+.0012*rays;rough=.65+.075*web-.025*upper
  else:
   rgb=np.ones((*u.shape,3))*np.array([.045,.055,.037]);rgb*=((.95+.05*np.sin(u*15*pi)*np.sin(v*pi)))[...,None];relief=np.zeros_like(u);rough=np.full_like(u,.225)
  dy,dx=np.gradient(relief);nx=-dx*65;ny=-dy*65;nz=np.ones_like(nx);length=np.sqrt(nx*nx+ny*ny+nz*nz);normal=np.stack([nx/length*.5+.5,ny/length*.5+.5,nz/length*.5+.5],-1)
  lookup[family]=np.clip(rgb,0,1);maps[family]=(image(family+'-albedo-v3',rgb,True),image(family+'-normal-v3',normal,False),image(family+'-roughness-v3',np.repeat(rough[...,None],3,-1),False))
 mats=[]
 for name,family in [('body','body'),('body_detail','body'),('accent',None),('eyes','eye'),('oral','body'),('fins','fin')]:
  m=bpy.data.materials.new('tiktaalik '+name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.40,.365,.235,1)if name=='accent'else(1,1,1,1);bs.inputs['Roughness'].default_value=.54;bs.inputs['Metallic'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.40 if name=='eyes'else .25;bs.inputs['Coat Weight'].default_value=.045 if name=='eyes'else 0;m.use_backface_culling=False
  if family:
   for kind,im in zip(['Base Color','Normal','Roughness'],maps[family]):
    tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.extension='EXTEND'
    if kind=='Normal':nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.48;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[kind])
  mats.append(m)
 return mats,lookup
