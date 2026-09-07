"""Deterministic UV material bake from original imagegen pigment study and anatomical fields."""
import bpy,os
import numpy as np
from math import pi

def build_materials(here,shield_edges,sections):
 source=bpy.data.images.load(os.path.join(here,'integument-source.png'),check_existing=True)
 pixels=np.array(source.pixels[:],dtype=np.float32).reshape(source.size[1],source.size[0],4)
 def image(name,arr,color=True):
  im=bpy.data.images.new(name,width=arr.shape[1],height=arr.shape[0]);im.colorspace_settings.name='sRGB'if color else'Non-Color';arr=np.clip(arr,0,1).copy();im.pixels.foreach_set(arr.astype(np.float32).ravel());im.filepath_raw=os.path.join(here,name+'.png');im.file_format='PNG';im.save();im.colorspace_settings.name='sRGB'if color else'Non-Color';loaded=bpy.data.images.load(im.filepath_raw,check_existing=False);loaded.colorspace_settings.name='sRGB'if color else'Non-Color';loaded.pack();bpy.data.images.remove(im);return loaded
 def rgba(rgb):return np.concatenate([rgb,np.ones((*rgb.shape[:2],1))],axis=-1)
 maps={};lookup={}
 for family,res in [('body',(2048,1024)),('fin',(1024,1024)),('oral',(1024,512))]:
  width,height=res;vv,uu=np.mgrid[0:height,0:width];u=uu/(width-1);v=vv/(height-1)
  # Tile over UV with integer seam repeats; artwork supplies nonprocedural pigment variation.
  tx=((u*2.0+.027*np.sin(v*2*pi))%1*(source.size[0]-1)).astype(int);ty=((v*2.0+.015*np.sin(u*2*pi))%1*(source.size[1]-1)).astype(int);art=pixels[ty,tx,:3];lum=art.mean(2);lo,hi=np.percentile(lum,[5,95]);pattern=np.clip((lum-lo)/(hi-lo),0,1)
  if family=='body':
   a=u*2*pi;top=(np.sin(a)+1)/2;belly=(1-top)**2.2;flank=np.exp(-((np.sin(a)+.05)/.23)**2)
   dark=np.array([.18,.255,.205]);light=np.array([.65,.61,.44]);rgb=dark[None,None,:]*(1-belly[...,None])+light[None,None,:]*belly[...,None]
   y=-2.62+v*5.57;band=(.5+.5*np.sin(y*6.6+np.sin(a*3)*.5))**3*(1-belly)*np.clip((y+1.2)*.5,0,1)
   rgb*= (.77+.53*pattern-.14*band)[...,None];rgb+=flank[...,None]*np.array([.055,.028,.001]);rgb+=(pattern-.5)[...,None]*np.array([.035,.02,-.005])
   suture=np.zeros_like(u)
   for ep in shield_edges:
    ey=float(ep.y);ew=np.interp(ey,[r[0]for r in sections],[r[1]for r in sections]);eu=np.arccos(np.clip(float(ep.x)/ew,-.9999,.9999))/(2*pi);ev=(ey+2.62)/5.57;cx=int(eu*(width-1));cy=int(ev*(height-1));x0=max(0,cx-7);x1=min(width,cx+8);y0=max(0,cy-11);y1=min(height,cy+12)
    if x1<=x0 or y1<=y0:continue
    qy,qx=np.mgrid[y0:y1,x0:x1];field=np.exp(-((qx-cx)/2.2)**2-((qy-cy)/3.6)**2);suture[y0:y1,x0:x1]=np.maximum(suture[y0:y1,x0:x1],field)
   rgb*=(1-.24*suture[...,None]);rough=.58+.11*(1-pattern)+.03*belly+.09*suture
   heightfield=pattern*.032-.012*suture+.002*np.sin(v*2*pi*330+np.sin(a*17))*np.clip((y+.9),0,1)
  elif family=='fin':
   edge=v**4;bars=(.5+.5*np.cos(u*2*pi*24))**9
   rgb=np.array([.22,.30,.23])[None,None,:]*np.ones((*u.shape,1));rgb*= (.8+.44*pattern-.17*edge)[...,None];rgb+=bars[...,None]*np.array([.045,.037,.010])*(.5+.5*v)[...,None]
   rough=.55+.12*(1-pattern);heightfield=pattern*.022+bars*.015*np.sin(v*pi)
  else:
   rgb=np.array([.30,.115,.095])[None,None,:]*np.ones((*u.shape,1));rgb*= (1-.58*v[...,None]);rgb*= (.84+.22*pattern)[...,None]
   folds=(.5+.5*np.cos(u*2*pi*8))**7*np.sin(pi*v)**2;rgb+=folds[...,None]*np.array([.035,.008,.009]);rough=.77+.08*pattern;heightfield=pattern*.018+folds*.018
  dy,dx=np.gradient(heightfield);nx=-dx*22;ny=-dy*22;nz=np.ones_like(nx);norm=np.sqrt(nx*nx+ny*ny+nz*nz);normal=np.stack([nx/norm*.5+.5,ny/norm*.5+.5,nz/norm*.5+.5],axis=-1)
  maps[family]=(image(family+'-albedo',rgba(rgb)),image(family+'-normal',rgba(normal),False),image(family+'-roughness',rgba(np.repeat(rough[...,None],3,axis=-1)),False));lookup[family]=np.clip(rgb,0,1)
 mats=[]
 for name,family in [('body','body'),('armour','body'),('accent','oral'),('eyes',None),('oral','oral'),('fins','fin')]:
  mat=bpy.data.materials.new('titanichthys '+name);mat.use_nodes=True;n=mat.node_tree.nodes;links=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.18 if name=='eyes'else .5;bs.inputs['Coat Weight'].default_value=.22 if name=='eyes'else 0 if name in ['oral','accent']else .015
  bs.inputs['Coat Roughness'].default_value=.16 if name=='eyes'else .35;bs.inputs['Specular IOR Level'].default_value=.45 if name=='eyes'else .15 if name in ['oral','accent']else .28
  if family:
   albedo,normal,rough=maps[family]
   for label,im in [('Albedo',albedo),('Normal',normal),('Roughness',rough)]:
    tx=n.new('ShaderNodeTexImage');tx.name=label;tx.image=im
    if label=='Normal':nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.15 if name in ['armour','oral','accent']else .22;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
    else:links.new(tx.outputs['Color'],bs.inputs['Base Color'if label=='Albedo'else'Roughness'])
  else:bs.inputs['Base Color'].default_value=(.005,.012,.010,1)
  mat.use_backface_culling=False;mats.append(mat)
 return mats,lookup
