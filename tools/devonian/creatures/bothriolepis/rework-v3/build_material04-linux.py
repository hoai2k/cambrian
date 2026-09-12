"""MATERIAL04 bounded shield/oral appearance candidate on immutable M03.
No production rig/export, public writes, or source blend overwrite. CPU2.
Same topology, aperture, interior, appendages, posterior and study-key motion.

-linux variant: identical to build_material04.py except EXPECTED below. .blend
files are not byte-reproducible across Blender saves (proven empirically), so
verified BY VALUE instead: material03's source-check.json invariants (cephalic
tangent delta ~0.0043, matching the handoff's 0.004317 within float32
cross-platform tolerance; 2,822 boundary vertices; only the declared change
touched geometry) were confirmed before this ran.
"""
import bpy,sys,json,hashlib,math,struct,zlib
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4];sys.path.insert(0,str(HERE))
from geometry_clay02 import build_body,section
from material_fields04 import shield,pectoral,posterior,linear_to_srgb,srgb_to_linear,extend_boundary_colors,PATHS
from material_fields01 import smooth
from geometry_material04 import corrected_deltas
from geometry_clay02 import validate
import copy
BASE=REPO.parent/'devonian-authoring/bothriolepis/rework-v3/material03/bothriolepis-material03.blend'
# Actual sha256 of the material03.blend rebuilt here by the unmodified frozen
# build_material03-linux.py, in place of the unreproducible original hash.
EXPECTED='cbf1089f43da720d6b1f295026dd75da953fc01edc51fb985dedd60b67270c53'
assert hashlib.sha256(BASE.read_bytes()).hexdigest()==EXPECTED
OUT=REPO.parent/'devonian-authoring/bothriolepis/rework-v3/material04';OUT.mkdir(parents=True,exist_ok=True)
assert not (OUT/'bothriolepis-material04.blend').exists(),'STOP existing MATERIAL04 candidate'
bpy.ops.wm.open_mainfile(filepath=str(BASE));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.threads_mode='FIXED';scene.render.threads=2
body=bpy.data.objects['Bothriolepis V3 MATERIAL03 continuous anatomy'];me=body.data
raw=build_body();assert len(me.vertices)==len(raw.v) and len(me.polygons)==len(raw.f)
def geometry_hash():
 h=hashlib.sha256()
 for block in me.shape_keys.key_blocks:h.update(np.array([p.co[:] for p in block.data],dtype='<f4').tobytes())
 h.update(np.array([v.co[:] for v in me.vertices],dtype='<f4').tobytes())
 for face in me.polygons:h.update(np.array(face.vertices[:],dtype='<u4').tobytes())
 return h.hexdigest()
frozen_geometry=geometry_hash()
original_vertices=np.array([v.co[:] for v in me.vertices],dtype=np.float64)
oral_key=me.shape_keys.key_blocks['Oral opening study only'];oral_key.value=0
original_key_delta=np.array([p.co[:] for p in oral_key.data])-np.array([p.co[:] for p in me.shape_keys.key_blocks['Basis'].data])
def eye_hash():
 h=hashlib.sha256()
 for eye in sorted([o for o in scene.objects if o.name.startswith('Closed inset eye')],key=lambda o:o.name):
  h.update(np.array(eye.matrix_world,dtype='<f4').tobytes());h.update(np.array([v.co[:] for v in eye.data.vertices],dtype='<f4').tobytes())
 return h.hexdigest()
frozen_eyes=eye_hash()
anatomy_offsets,oral_uv,lookup,local_report=corrected_deltas(raw)
assert local_report['maximum_oral_z_delta']<.013 and local_report['maximum_cephalic_z_delta']<.0044 and local_report['maximum_ventral_shield_delta']<.017


N=1536;H=1024
vtex,uu=np.mgrid[0:H,0:N].astype(np.float32);uu=(uu+.5)/N;vtex=(vtex+.5)/H
# Dorsal midline is now INSIDE the chart at V=.5. The chart boundary is ventral.
vphysical=(vtex+.5)%1
source=bpy.data.images.load(str(HERE/'material01-inputs/dermal-source-material01.png'),check_existing=True)
sw,sh=source.size;px=np.array(source.pixels[:],dtype=np.float32).reshape(sh,sw,4)
lum=px[:,:,:3].mean(2);lum=(lum-lum.mean())/(lum.std()+1e-6)
# One interior source crop avoids a source-tile join on the forehead. The
# small detail signal fades C1 to zero at the ventral chart wrap.
ix=((.08+.84*uu)*(sw-1)).astype(int);iy=((.08+.84*vtex)*(sh-1)).astype(int)
detail=np.clip(lum[iy,ix],-2,2)/2*np.sin(np.pi*vtex)**2
source.pack();textures=[];encoding_checks=[]
def png_chunk(name,payload):
 return struct.pack('>I',len(payload))+name+payload+struct.pack('>I',zlib.crc32(name+payload)&0xffffffff)
def image(name,data,color=False):
 # A deliberately explicit PNG path: float fields are linear, PNG color bytes
 # are sRGB, and Blender loads the file as sRGB exactly once. MATERIAL01 omitted
 # this encoding, leaving its textured regions 5-10 times darker than vertices.
 rgb=np.repeat(data[:,:,None],3,axis=2) if data.ndim==2 else data
 encoded=linear_to_srgb(rgb) if color else np.clip(rgb,0,1)
 bytes_rgb=np.rint(encoded*255).astype(np.uint8)
 if color:
  decoded=srgb_to_linear(bytes_rgb.astype(np.float32)/255)
  error=float(np.max(np.abs(decoded-rgb)));assert error<.0045
  encoding_checks.append({'image':name,'maximum_linear_roundtrip_error':error})
 path=OUT/(name+'.png')
 scan=b''.join(b'\0'+row.tobytes() for row in bytes_rgb[::-1])
 ihdr=struct.pack('>IIBBBBB',N,H,8,2,0,0,0)
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+png_chunk(b'IHDR',ihdr)+png_chunk(b'IDAT',zlib.compress(scan,6))+png_chunk(b'IEND',b''))
 im=bpy.data.images.load(str(path),check_existing=False);im.colorspace_settings.name='sRGB' if color else 'Non-Color';im.pack();textures.append(im)
 return im
def atlas(name,c,h,r,width,circum,periodic):
 dx=np.gradient(h.astype(np.float32),axis=1)*N/width
 dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*.5*H/circum if periodic else np.gradient(h.astype(np.float32),axis=0)*H/circum
 normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
 return image(name+'-basecolor',c,True),image(name+'-normal',normal*.5+.5),image(name+'-roughness',r)
sc,shgt,sr,_,_=shield(uu,vphysical,detail);shield_maps=atlas('shield-material04',sc,shgt,sr,1.775,3.,True)
pc,phgt,pr=pectoral(uu,vtex,detail);pectoral_maps=atlas('pectoral-material04',pc,phgt,pr,1.294,.24,False)
bc,bh,br=posterior(uu,vphysical,detail);body_maps=atlas('posterior-material04',bc,bh,br,3.20,.80,True)

def mat(name,imgs=None,vertex=False,oral=False):
 m=bpy.data.materials.new(name);m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(.049,.035,.022,1) if oral else (.09,.11,.06,1)
 bs.inputs['Roughness'].default_value=.60 if oral else .565;bs.inputs['Coat Weight'].default_value=.018;bs.inputs['Coat Roughness'].default_value=.48
 normal=None
 if vertex:
  attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='AnatomicalPigmentM04';links.new(attr.outputs['Color'],bs.inputs['Base Color'])
 if imgs:
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='AnatomicalUVM04'
  for im,socket in zip(imgs,['Base Color','Normal','Roughness']):
   tex=nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT';links.new(uv.outputs['UV'],tex.inputs['Vector'])
   if socket=='Normal':
    normal=nodes.new('ShaderNodeNormalMap');normal.uv_map='AnatomicalUVM04';normal.inputs['Strength'].default_value=.82
    links.new(tex.outputs['Color'],normal.inputs['Color'])
   else:links.new(tex.outputs['Color'],bs.inputs[socket])
 if not oral:
  # The SAME rest-space pore response crosses each true cap/rim/root boundary.
  # It is very small. The smooth patch materials no longer reveal construction
  # rectangles through a sudden change from granular skin to polished plastic.
  coord=nodes.new('ShaderNodeTexCoord');noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=110;noise.inputs['Detail'].default_value=2;noise.inputs['Roughness'].default_value=.6
  links.new(coord.outputs['Object'],noise.inputs['Vector']);bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.18;bump.inputs['Distance'].default_value=.0013
  links.new(noise.outputs['Fac'],bump.inputs['Height'])
  if normal:links.new(normal.outputs['Normal'],bump.inputs['Normal'])
  links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 elif normal:links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 return m
mats=[mat('M04 anatomical shield',shield_maps),mat('M04 dermal pectorals',pectoral_maps),mat('M04 quiet scaleless posterior',body_maps),mat('M04 internal oral mucosa',oral=True),mat('M04 continuous shield surface into exterior oral rim',shield_maps),mat('M04 boundary-matched pectoral roots',vertex=True),mat('M04 narrow dermal articulation',vertex=True),mat('M04 boundary-matched rostral closure',vertex=True)]
me.materials.clear()
for material in mats:me.materials.append(material)
uvs=[];colors=[];unknown=[]
centers=np.array([[-.966,.615,-.178,.100],[-.850,.650,-.199,.125],[-.690,.730,-.225,.123],[-.526,.817,-.250,.111],[-.365,.889,-.274,.090],[-.229,.955,-.296,.065],[-.175,.980,-.306,.048],[-.068,1.010,-.321,.053],[.076,1.040,-.340,.046],[.223,1.052,-.360,.031],[.328,1.039,-.380,.004]])
for i,(p,tag) in enumerate(zip(raw.v,raw.tags)):
 x,y,z=p;grid=lookup.get(tuple(round(a,7) for a in p));extend=False
 if i in oral_uv:
  u,v=oral_uv[i];col=shield(np.array(u),np.array((v+.5)%1))[0]
 elif tag.startswith('pectoral_proximal') or tag.startswith('pectoral_distal'):
  cz=np.interp(y,centers[:,0],centers[:,2]);h=np.interp(y,centers[:,0],centers[:,3]);u=np.clip((y+.966)/1.294,0,1);v=np.clip(.5+.5*(z-cz)/h,0,1)
  col=pectoral(np.array(u),np.array(v))[0]
 elif grid:
  yy,v0=grid
  if tag=='posterior':u=(yy-.18)/3.2;col=posterior(np.array(u),np.array(v0))[0]
  else:u=(yy+1.62)/1.775;col=shield(np.array(u),np.array(v0))[0]
  v=(v0+.5)%1
 else:
  u=0;v=.5;col=np.array([.09,.11,.06]);extend=tag.startswith('pectoral_root') or tag.startswith('oral') or tag=='throat' or tag=='shield'
 uvs.append((float(np.clip(u,.5/N,1-.5/N)),float(v)));colors.append(col);unknown.append(extend)
# One new physical armor field follows the SAME 14 boundaries. Preserve the
# oral exterior, eye seating, root joins, flexible trunk, and pectoral blades.
plate_offsets=np.zeros_like(anatomy_offsets);ids=[];us=[];vs=[]
for i,(p,tag) in enumerate(zip(raw.v,raw.tags)):
 grid=lookup.get(tuple(round(a,7) for a in p))
 if tag=='shield' and grid and p[1]<.16:
  y,v=grid;ids.append(i);us.append((y+1.62)/1.775);vs.append(v)
ids=np.array(ids);U=np.array(us);V=np.array(vs);xyz=original_vertices[ids]
q=np.minimum(V%1,1-V%1)*2;y=xyz[:,1]
mask=smooth((y+1.60)/.07)*(1-smooth((y-.08)/.08))
root_distance=np.sqrt(((y+1.03)/.20)**2+((q-.61)/.20)**2)
mask*=smooth((root_distance-.80)/.50)
mask*=1-(1-smooth((y+1.25)/.12))*smooth((q-.54)/.12)
mask*=1-.7*smooth((q-.60)/.16)
for sign in [-1,1]:
 distance=np.linalg.norm(xyz-np.array([sign*.084863,-1.410,.257]),axis=1)
 mask*=smooth((distance-.066)/.043)
relief=shield(U,V)[3]
for idx,h in zip(ids,relief*mask):plate_offsets[idx]=np.array(me.vertices[int(idx)].normal[:])*h
assert float(np.max(np.linalg.norm(plate_offsets,axis=1)))<.009
all_offsets=anatomy_offsets+plate_offsets
for block in me.shape_keys.key_blocks:
 for i,off in enumerate(all_offsets):
  if np.any(off):block.data[i].co+=Vector(off)
for i,p in enumerate(original_vertices+all_offsets):me.vertices[i].co=p
me.update()
# Production semantic groups and topology are preserved. Shape-key deltas can
# differ only by float32 addition roundoff, not by a newly authored motion.
new_key_delta=np.array([p.co[:] for p in oral_key.data])-np.array([p.co[:] for p in me.shape_keys.key_blocks['Basis'].data])
key_error=float(np.max(np.abs(new_key_delta-original_key_delta)));assert key_error<1.3e-7
aperture_ids=set(raw.mouth_ids)
unchanged=[i for i,t in enumerate(raw.tags) if t.startswith('pectoral') or t=='posterior' or t=='oral_cavity' or t=='throat' or i in aperture_ids]
assert not np.any(all_offsets[unchanged]),'Protected anatomy moved'
assert np.array_equal(np.array([v.co[:] for v in me.vertices])[unchanged],original_vertices[unchanged])
assert eye_hash()==frozen_eyes
validation=[]
for value in [0.,.25,.5,.75,1.]:
 check=copy.copy(raw);check.v=(np.array([p.co[:] for p in me.shape_keys.key_blocks['Basis'].data])+new_key_delta*value).tolist()
 validation.append({'oral_key':value,**validate(check)})
corrected_geometry=geometry_hash()
colors,extension_report=extend_boundary_colors(raw.f,np.asarray(colors),np.asarray(unknown))
assert extension_report['boundary_colors_unchanged']
attr=me.color_attributes.new(name='AnatomicalPigmentM04',type='FLOAT_COLOR',domain='POINT')
for i,col in enumerate(colors):attr.data[i].color=(*col,1)
uvlayer=me.uv_layers.new(name='AnatomicalUVM04')
for poly in me.polygons:
 tags={raw.tags[i] for i in poly.vertices};old=raw.material[poly.index]
 if old==2:slot=3
 elif any(t.startswith('oral') for t in tags):slot=4
 elif any(t.startswith('pectoral_root') for t in tags):slot=5
 elif any(t.startswith('pectoral_') for t in tags):slot=6 if old==3 else 1
 elif all(abs(raw.v[i][1]+1.62)<1e-8 for i in poly.vertices):slot=7
 elif 'posterior' in tags:slot=2
 else:slot=0
 poly.material_index=slot;local=[uvs[i] for i in poly.vertices]
 wrap=slot in [0,2,4] and max(p[1] for p in local)-min(p[1] for p in local)>.5
 for loop in poly.loop_indices:
  u,v=uvs[me.loops[loop].vertex_index];uvlayer.data[loop].uv=(u,v+1 if wrap and v<.5 else v)
# An oral-rim vertex borders mucosa but is still EXTERIOR: only polygon slot 3
# assigns mucosa. No pale region is defined by the annulus construction boundary.
assert geometry_hash()==corrected_geometry,'STOP unexpected geometry change after declared M04 sculpture'
body.name='Bothriolepis V3 MATERIAL04 continuous anatomy'
body['source_material03_sha256']=EXPECTED;body['phase']='MATERIAL04 bounded appearance correction; art review required'
body['geometry_before_material04_sha256']=frozen_geometry;body['geometry_after_material04_sha256']=corrected_geometry
body['bounded_geometry_report']=json.dumps(local_report)
body['physical_plate_relief_maximum']=float(np.max(np.linalg.norm(plate_offsets,axis=1)))
body['normal_bake_dependency']='Shared tiny Object-space pore Bump must be baked into final export normal map; do not drop procedural pores silently.'

cam=scene.camera;cam_data=cam.data
def point(at):cam.rotation_euler=(Vector(at)-cam.location).to_track_quat('-Z','Y').to_euler()
views=[('01-front',(0,-8,.80),(0,-.40,.04),'full',False),('02-side',(8,.78,.14),(0,.78,.04),'full',False),('03-dorsal',(0,.88,9),(0,.88,0),'full',False),('04-oblique',(5.6,-6.2,4.2),(0,.67,.02),'full',False),('05-underside',(0,.8,-9),(0,.8,0),'full',False),('06-mouth-open',(0,-2.10,-4.0),(0,-1.40,-.25),'oral',True),('07-mouth-depth-oblique',(.82,-1.90,-1.3),(0,-1.455,-.27),'oral',True),('08-armour-detail',(3.8,-4.3,3.4),(0,-.72,.12),'armour',False),('09-forehead-continuity',(0,-4,.95),(0,-1.30,.18),'cephalic',False)]
framing=[]
def fit(view):
 name,pos,target,scope,opened=view;oral_key.value=1 if opened else 0;cam.location=pos;point(target)
 r=cam.rotation_euler.to_quaternion();right=r@Vector((1,0,0));up=r@Vector((0,1,0))
 pts=[v.co.copy() for v in me.vertices if scope=='full' or (scope=='armour' and v.co.y<.20) or (scope=='cephalic' and v.co.y<-1.05) or (scope=='oral' and abs(v.co.x)<.36 and v.co.y<-1.15 and v.co.z<-.10)]
 origin=Vector(target);xs=[(p-origin).dot(right) for p in pts];ys=[(p-origin).dot(up) for p in pts]
 width=max(xs)-min(xs);height=max(ys)-min(ys);aspect=scene.render.resolution_x/scene.render.resolution_y
 cam_data.ortho_scale=1.16*max(width,height*aspect);shift=right*((min(xs)+max(xs))/2)+up*((min(ys)+max(ys))/2)
 cam.location=Vector(pos)+shift;point(origin+shift)
 margin=min((1-width/cam_data.ortho_scale)/2,(1-height/(cam_data.ortho_scale/aspect))/2);assert margin>.065
 framing.append({'view':name,'scope':scope,'minimum_fractional_margin':margin})
fit(views[3]);framing.clear();blend=OUT/'bothriolepis-material04.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
for view in views:fit(view);scene.render.filepath=str(OUT/(view[0]+'.png'));bpy.ops.render.render(write_still=True)
oral_key.value=0
report={'status':'SOURCE_CHECK_PASS','phase':'MATERIAL04 actual appearance review still REQUIRED','source_material03_sha256':EXPECTED,'geometry_and_shape_keys_before':frozen_geometry,'geometry_and_shape_keys_after':geometry_hash(),'only_declared_material04_change':geometry_hash()==corrected_geometry,'bounded_geometry':local_report,'maximum_new_plate_relief':float(np.max(np.linalg.norm(plate_offsets,axis=1))),'oral_motion_delta_max_error':key_error,'protected_anatomy_vertices':len(unchanged),'eye_meshes_unchanged':eye_hash()==frozen_eyes,'oral_pose_validation':validation,'color_encoding':encoding_checks,'pigment_boundary_extension':extension_report,'uv_wrap':'ventral; dorsal midline inside chart','normal_derivatives':'periodic in wrapped V, centered inside forehead','plate_paths_preserved':[n for n,p in PATHS],'camera_framing':framing,'pending_export_dependency':'Bake the common low-amplitude Object-space pore normal before final GLB export.'}
assert report['only_declared_material04_change']
(OUT/'source-check.json').write_text(json.dumps(report,indent=2)+'\n')
files=[blend,OUT/'source-check.json']+[OUT/(v[0]+'.png') for v in views]+[Path(im.filepath) for im in textures]
manifest={str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}
(OUT/'outputs-sha256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('BOTHRIOLEPIS_MATERIAL04_DONE '+str(OUT/'outputs-sha256.json'))
