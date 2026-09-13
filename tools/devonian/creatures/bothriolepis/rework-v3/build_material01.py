"""MATERIAL01: anatomy-bound surface authoring on the exact accepted CLAY02.

CPU two-thread execution only. No rig, GLB, public output or final audit.
The accepted mesh is loaded, preserved as source provenance, and given bounded
suture relief plus explicit UV materials. No old Bothriolepis model is rebuilt.
"""
import bpy,sys,json,hashlib,math
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4]
sys.path.insert(0,str(HERE))
from geometry_clay02 import build_body,section,field,validate
from material_fields01 import shield,pectoral,posterior,smooth,PATHS
BASE=REPO.parent/'devonian-authoring/bothriolepis/rework-v3/clay02/bothriolepis-clay02.blend'
OUT=REPO.parent/'devonian-authoring/bothriolepis/rework-v3/material01'
assert hashlib.sha256(BASE.read_bytes()).hexdigest()=='55ca3b38a1de698a9e788ca9f76ab576476aa28785c84380754d27ebcbecc84b'
OUT.mkdir(parents=True,exist_ok=True)
assert not (OUT/'bothriolepis-material01.blend').exists(),'STOP existing frozen material candidate'
bpy.ops.wm.open_mainfile(filepath=str(BASE))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.threads_mode='FIXED';scene.render.threads=2
body=bpy.data.objects['Bothriolepis V3 continuous anatomy CLAY02'];body.name='Bothriolepis V3 MATERIAL01 continuous anatomy'
me=body.data;raw=build_body();report=validate(raw)
assert len(me.vertices)==len(raw.v) and len(me.polygons)==len(raw.f)
source_delta=max((me.vertices[i].co-Vector(p)).length for i,p in enumerate(raw.v))
assert source_delta<1e-6,('Accepted clay topology/coordinates changed',source_delta)
oral_key=body.data.shape_keys.key_blocks['Oral opening study only'];oral_key.value=0
original=np.array([v.co[:] for v in me.vertices],dtype=np.float64)

N=1536;H=1024
vv,uu=np.mgrid[0:H,0:N].astype(np.float32);uu/=N-1;vv/=H-1
source=bpy.data.images.load(str(HERE/'material01-inputs/dermal-source-material01.png'),check_existing=True)
sw,sh=source.size;pixels=np.array(source.pixels[:],dtype=np.float32).reshape(sh,sw,4)
lum=pixels[:,:,:3].mean(2);lum=(lum-lum.mean())/(lum.std()+1e-6)
# The original ImageGen source contributes at most +/-2.5% color and 0.00075
# height units. Fine organic detail cannot become a substitute plate layout.
ix=((uu*2.3)%1*(sw-1)).astype(int);iy=((vv*2.0)%1*(sh-1)).astype(int)
detail=np.clip(lum[iy,ix],-2,2)/2
source.pack()
textures=[]
def image(name,data,noncolor=False):
 im=bpy.data.images.new(name,width=N,height=H,alpha=True)
 if noncolor:im.colorspace_settings.name='Non-Color'
 rgba=np.ones((H,N,4),np.float32)
 if data.ndim==2:rgba[:,:,:3]=data[:,:,None]
 else:rgba[:,:,:3]=data
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=str(OUT/(name+'.png'));im.file_format='PNG';im.save();im.pack();textures.append(im)
 return im
def atlas(name,color,height,rough,world_width,world_circumference):
 dy,dx=np.gradient(height.astype(np.float32));dx*=N/world_width;dy*=H/world_circumference
 normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
 return (image(name+'-basecolor',color),image(name+'-normal',normal*.5+.5,True),image(name+'-roughness',rough,True))
sc,shgt,sr,_,_=shield(uu,vv,detail);shield_images=atlas('shield-material01',sc,shgt,sr,1.775,3.00)
pc,phgt,pr=pectoral(uu,vv,detail);pectoral_images=atlas('pectoral-material01',pc,phgt,pr,1.328,.24)

def mat(name,color,rough=.55,imgs=None,vertex=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
 nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 bs.inputs['Coat Weight'].default_value=.035;bs.inputs['Coat Roughness'].default_value=.44
 if vertex:
  attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='AnatomicalPigment';links.new(attr.outputs['Color'],bs.inputs['Base Color'])
 if imgs:
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='AnatomicalUV'
  for index,(im,socket) in enumerate(zip(imgs,['Base Color','Normal','Roughness'])):
   tex=nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT';links.new(uv.outputs['UV'],tex.inputs['Vector'])
   if socket=='Normal':
    no=nodes.new('ShaderNodeNormalMap');no.uv_map='AnatomicalUV';no.inputs['Strength'].default_value=.48
    links.new(tex.outputs['Color'],no.inputs['Color']);links.new(no.outputs['Normal'],bs.inputs['Normal'])
   else:links.new(tex.outputs['Color'],bs.inputs[socket])
 return m
mats=[mat('M01 anatomical dermal shield',(.205,.209,.095),imgs=shield_images),
      mat('M01 jointed dermal pectorals',(.16,.18,.087),imgs=pectoral_images),
      mat('M01 scaleless flexible posterior',(.12,.155,.08),.46,vertex=True),
      mat('M01 recessed toothless oral tissue',(.070,.050,.032),.61),
      mat('M01 continuous ventral oral rim',(.240,.216,.140),.54,vertex=True),
      mat('M01 anatomical pectoral root transition',(.115,.155,.089),.55,vertex=True),
      mat('M01 restricted dermal pectoral articulation',(.089,.109,.061),.60),
      mat('M01 rostral cap - no collapsed UV normal map',(.15,.17,.085),.55,vertex=True)]
me.materials.clear()
for m in mats:me.materials.append(m)

# Recover exact angular chart coordinates from the unchanged clay generator.
# The front cap and oral patches get explicit local boundaries/materials instead
# of a longitudinal UV collapse or a rectangular colored oral surround.
lookup={}
for j in range(251):
 y=-1.62+j*.02
 for k in range(192):
  p=section(y,k*2*math.pi/192);lookup[tuple(round(a,7) for a in p)]=(y,k/192)
uvs=[];colors=[];sculpt_ids=[];sculpt_u=[];sculpt_v=[]
centers=np.array([[-.966,.615,-.178,.100],[-.850,.650,-.199,.125],[-.690,.730,-.225,.123],[-.526,.817,-.250,.111],[-.365,.889,-.274,.090],[-.229,.955,-.296,.065],[-.175,.980,-.306,.048],[-.068,1.010,-.321,.053],[.076,1.040,-.340,.046],[.223,1.052,-.360,.031],[.328,1.039,-.380,.004]])
for i,(p,tag) in enumerate(zip(raw.v,raw.tags)):
 x,y,z=p;grid=lookup.get(tuple(round(a,7) for a in p))
 if tag.startswith('pectoral_proximal') or tag.startswith('pectoral_distal'):
  cz=np.interp(y,centers[:,0],centers[:,2]);h=np.interp(y,centers[:,0],centers[:,3]);u=np.clip((y+.966)/1.294,0,1);v=np.clip(.5+.5*(z-cz)/h,0,1)
  col=pectoral(np.array(u),np.array(v))[0]
 elif tag.startswith('pectoral_root'):
  u=0.;v=.5;col=np.array([.115,.155,.089])
 elif grid:
  yy,v=grid;u=(yy+1.62)/1.775
  if tag=='posterior':u=(yy-.18)/3.20;col=posterior(np.array(u),np.array(v))
  else:
   col=shield(np.array(u),np.array(v))[0]
   if y<.16:  # non-cap shield; masks below protect anatomical boundaries
    sculpt_ids.append(i);sculpt_u.append(u);sculpt_v.append(v)
 else:
  u=0.;v=.5
  col=np.array([.240,.216,.140]) if tag.startswith('oral') else np.array([.145,.169,.087])
 uvs.append((float(u),float(v)));colors.append((*np.asarray(col).tolist(),1))

# True shallow suture/edge relief on the loaded accepted mesh. Texture relief
# uses the same authored paths. Protect the actual mouth, eyes and root collars.
ids=np.array(sculpt_ids);U=np.array(sculpt_u);V=np.array(sculpt_v)
_,_,_,relief,_=shield(U,V)
xyz=original[ids];q=np.minimum(V%1,1-V%1)*2;y=xyz[:,1]
mask=smooth((y+1.60)/.07)*(1-smooth((y-.08)/.08))
root_distance=np.sqrt(((y+1.03)/.20)**2+((q-.61)/.20)**2)
mask*=smooth((root_distance-.80)/.50)
mask*=1-(1-smooth((y+1.25)/.12))*smooth((q-.54)/.12)
for sign in [-1,1]:
 d=np.linalg.norm(xyz-np.array([sign*.084863,-1.410,.257]),axis=1)
 mask*=smooth((d-.066)/.043)
offsets=np.zeros_like(original)
for idx,h in zip(ids,relief*mask):offsets[idx]=np.array(me.vertices[int(idx)].normal[:])*h
assert np.max(np.linalg.norm(offsets,axis=1))<.0043
for block in me.shape_keys.key_blocks:
 for i,off in enumerate(offsets):block.data[i].co+=Vector(off)
for i,p in enumerate(original+offsets):me.vertices[i].co=p
me.update()
attr=me.color_attributes.new(name='AnatomicalPigment',type='FLOAT_COLOR',domain='POINT')
for i,col in enumerate(colors):attr.data[i].color=col
uvlayer=me.uv_layers.new(name='AnatomicalUV')
for polygon in me.polygons:
 tags={raw.tags[i] for i in polygon.vertices};orig=raw.material[polygon.index]
 if orig==2:slot=3
 elif any(t.startswith('oral') for t in tags):slot=4
 elif any(t.startswith('pectoral_root') for t in tags):slot=5
 elif any(t.startswith('pectoral_') for t in tags):slot=6 if orig==3 else 1
 elif all(abs(raw.v[i][1]+1.62)<1e-8 for i in polygon.vertices):slot=7
 elif 'posterior' in tags:slot=2
 else:slot=0
 polygon.material_index=slot
 local=[uvs[i] for i in polygon.vertices];wrap=(slot in [0,2] and max(t[1] for t in local)-min(t[1] for t in local)>.5)
 for loop in polygon.loop_indices:
  u,v=uvs[me.loops[loop].vertex_index];uvlayer.data[loop].uv=(u,v+1 if wrap and v<.5 else v)
for eye in [o for o in scene.objects if o.name.startswith('Closed inset eye')]:
 em=mat('M01 small embedded eye '+eye.name, (.010,.014,.008),.24)
 em.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.16
 eye.data.materials.clear();eye.data.materials.append(em)
body['source_clay02_sha256']=hashlib.sha256(BASE.read_bytes()).hexdigest()
body['phase']='MATERIAL01 appearance candidate only; no production rig or final audit approval.'
body['plate_relief']='Explicit shared anatomical UV paths, max actual displacement below 0.0043 units; oral and eye/root boundaries protected.'

cam=scene.camera;cam_data=cam.data
def point(at):cam.rotation_euler=(Vector(at)-cam.location).to_track_quat('-Z','Y').to_euler()
views=[('01-front',(0,-8,.80),(0,-.40,.04),'full',False),('02-side',(8,.78,.14),(0,.78,.04),'full',False),('03-dorsal',(0,.88,9),(0,.88,0),'full',False),('04-oblique',(5.6,-6.2,4.2),(0,.67,.02),'full',False),('05-underside',(0,.8,-9),(0,.8,0),'full',False),('06-mouth-open',(0,-2.10,-4.0),(0,-1.40,-.25),'oral',True),('07-mouth-depth-oblique',(.82,-1.90,-1.3),(0,-1.455,-.27),'oral',True),('08-armour-detail',(3.8,-4.3,3.4),(0,-.72,.12),'armour',False)]
framing=[]
def fit(view):
 name,pos,target,scope,opened=view;oral_key.value=1 if opened else 0
 cam.location=pos;point(target);r=cam.rotation_euler.to_quaternion();right=r@Vector((1,0,0));up=r@Vector((0,1,0))
 pts=[v.co.copy() for v in me.vertices if scope=='full' or (scope=='armour' and v.co.y<.20) or (scope=='oral' and abs(v.co.x)<.36 and v.co.y<-1.15 and v.co.z<-.10)]
 origin=Vector(target);xs=[(p-origin).dot(right) for p in pts];ys=[(p-origin).dot(up) for p in pts]
 width=max(xs)-min(xs);height=max(ys)-min(ys);aspect=scene.render.resolution_x/scene.render.resolution_y
 cam_data.ortho_scale=1.16*max(width,height*aspect);shift=right*((min(xs)+max(xs))/2)+up*((min(ys)+max(ys))/2)
 cam.location=Vector(pos)+shift;point(origin+shift)
 margin=min((1-width/cam_data.ortho_scale)/2,(1-height/(cam_data.ortho_scale/aspect))/2)
 assert margin>.065
 framing.append({'view':name,'scope':scope,'minimum_fractional_margin':margin})
fit(views[3]);framing.clear()
blend=OUT/'bothriolepis-material01.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
for view in views:
 fit(view);scene.render.filepath=str(OUT/(view[0]+'.png'));bpy.ops.render.render(write_still=True)
oral_key.value=0
report.update({'phase':'MATERIAL01 appearance review REQUIRED','source_clay02_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'unchanged_base_max_coordinate_error':source_delta,'maximum_suture_displacement':float(np.max(np.linalg.norm(offsets,axis=1))),'plate_paths':[name for name,path in PATHS],'camera_framing':framing,'material_slots':[m.name for m in mats],'imagegen_usage':'Original dermal swatch at maximum +/-2.5% color and 0.00075 height; not anatomical evidence.'})
(OUT/'source-check.json').write_text(json.dumps(report,indent=2)+'\n')
files=[blend,OUT/'source-check.json']+[OUT/(v[0]+'.png') for v in views]+[Path(im.filepath_raw) for im in textures]
manifest={str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}
(OUT/'outputs-sha256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('BOTHRIOLEPIS_MATERIAL01_DONE '+str(OUT/'outputs-sha256.json'))
