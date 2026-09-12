"""MATERIAL05 bounded repair on the MATERIAL04 blend.  Geometry + materials.

Input: the re-derived MATERIAL04 editable blend at
  <authoring>/bothriolepis/rework-v3/material04/bothriolepis-material04.blend
VERIFIED BY VALUE, NOT BY HASH.  .blend files are not byte-reproducible across
Blender saves -- the chain proved this at MATERIAL04 already, which is why
build_material04-linux.py carries its own EXPECTED constant -- and the M04
blend in this environment was re-derived here rather than copied from the
machine that produced the reviewed one.  What is checked instead are the
invariants the M04 review bound its verdict to, all asserted below:
  * 55,802 vertices / 56,104 faces, one closed orientable surface;
  * 38,904 protected vertices (pectorals, posterior, oral cavity, throat,
    aperture) and their exact coordinates;
  * the 'Oral opening study only' shape-key delta, and five oral poses PASS;
  * both inset eye meshes byte-identical;
  * the M04 object's own recorded geometry_after_material04_sha256 matches a
    fresh hash of the mesh it is stored on.

What this stage changes, and nothing else:
  1. the accumulated physical relief on shield grid vertices, replaced by one
     resolved field (geometry_material05, material_fields05);
  2. the atlas micro height/contrast, halved and un-rowed, with the shared
     pore Bump dropped .18 -> .08 and the normal-map strength .82 -> .62;
  3. material slot 7, the rostral cap, which gains the shield atlas through a
     real two-dimensional mirrored local chart instead of sitting smooth.

Rendering is NOT done here; render_material05.py opens the saved blend.
"""
import bpy,sys,json,hashlib,math,struct,zlib,copy
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[4];sys.path.insert(0,str(HERE))
from geometry_clay02 import build_body,section,validate,TAU
from geometry_material04 import corrected_deltas
from geometry_material05 import resolved_offsets,step_angles,grid_tables,PATCHES,ROWS,COLS
from material_fields05 import (shield,pectoral,posterior,linear_to_srgb,srgb_to_linear,
                               extend_boundary_colors,PATHS,cap_chart,CAP_APEX)

AUTHORING=REPO.parent/'devonian-authoring/bothriolepis/rework-v3'
BASE=AUTHORING/'material04/bothriolepis-material04.blend'
VARIANT=(sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'material05')
# Appearance iterations.  The geometry repair is identical in every one of
# them; only the dermal micro weights and the rostral-cap surface response
# move, which is what the M05 close-up set is judged on.
#   material05  -- first pass.  Numerically on target but the shield read
#                  porcelain and the cap, driven from the atlas through the
#                  mirrored chart, smeared radially into a dark wedge because
#                  the atlas is already stretched ~3.3x circumferentially at
#                  the nose and the chart's own apex is a singularity.
#   material05b -- fine bone relief restored to about half of M04 instead of a
#                  third, and the cap's fine response taken from the shared
#                  rest-space field at the atlas's own tubercle scale, which
#                  has no chart and therefore no stretch or apex.
TUNING={'material05' :dict(micro_height=.00085,micro_contrast=.062,normal_strength=.62,bump=.08,cap='atlas',grain_colour=.0),
        'material05b':dict(micro_height=.00120,micro_contrast=.085,normal_strength=.72,bump=.08,cap='restspace',grain_colour=.075)}
TUNE=TUNING[VARIANT]
OUT=AUTHORING/VARIANT
OUT.mkdir(parents=True,exist_ok=True)
BLEND=OUT/('bothriolepis-%s.blend'%VARIANT)
assert not BLEND.exists(),'STOP existing MATERIAL05 candidate at '+str(BLEND)

bpy.ops.wm.open_mainfile(filepath=str(BASE));scene=bpy.context.scene
body=next(o for o in scene.objects if o.name.startswith('Bothriolepis V3 MATERIAL'))
me=body.data
raw=build_body()
assert len(me.vertices)==55802==len(raw.v) and len(me.polygons)==56104==len(raw.f)

def geometry_hash():
 h=hashlib.sha256()
 for block in me.shape_keys.key_blocks:h.update(np.array([p.co[:] for p in block.data],dtype='<f4').tobytes())
 h.update(np.array([v.co[:] for v in me.vertices],dtype='<f4').tobytes())
 for face in me.polygons:h.update(np.array(face.vertices[:],dtype='<u4').tobytes())
 return h.hexdigest()
def eye_hash():
 h=hashlib.sha256()
 for eye in sorted([o for o in scene.objects if o.name.startswith('Closed inset eye')],key=lambda o:o.name):
  h.update(np.array(eye.matrix_world,dtype='<f4').tobytes())
  h.update(np.array([v.co[:] for v in eye.data.vertices],dtype='<f4').tobytes())
 return h.hexdigest()
incoming_geometry=geometry_hash();frozen_eyes=eye_hash()
assert body.get('geometry_after_material04_sha256')==incoming_geometry,'STOP MATERIAL04 mesh is not the one M04 recorded'
oral_key=me.shape_keys.key_blocks['Oral opening study only'];oral_key.value=0
basis=me.shape_keys.key_blocks['Basis']
incoming_key_delta=np.array([p.co[:] for p in oral_key.data])-np.array([p.co[:] for p in basis.data])
original_vertices=np.array([v.co[:] for v in me.vertices],dtype=np.float64)
aperture=set(raw.mouth_ids)
protected=[i for i,t in enumerate(raw.tags)
           if t.startswith('pectoral') or t=='posterior' or t=='oral_cavity' or t=='throat' or i in aperture]
assert len(protected)==38904,len(protected)
incoming_validation=[]
for value in [0.,.25,.5,.75,1.]:
 check=copy.copy(raw);check.v=(np.array([p.co[:] for p in basis.data])+incoming_key_delta*value).tolist()
 incoming_validation.append({'oral_key':value,**validate(check)})
assert all(v['status']=='PASS' for v in incoming_validation)

# ---------------------------------------------------------------------------
# 1. Resolved relief
# ---------------------------------------------------------------------------
offsets,index,base_grid,relief_report=resolved_offsets(raw,original_vertices)
assert not np.any(offsets[protected]),'STOP protected anatomy moved'
assert relief_report['maximum_offset']<.020
for block in me.shape_keys.key_blocks:
 for i,off in enumerate(offsets):
  if np.any(off):block.data[i].co+=Vector(off)
new_vertices=original_vertices+offsets
for i,p in enumerate(new_vertices):me.vertices[i].co=p
me.update()
new_key_delta=np.array([p.co[:] for p in oral_key.data])-np.array([p.co[:] for p in basis.data])
key_error=float(np.max(np.abs(new_key_delta-incoming_key_delta)));assert key_error<1.3e-7
assert np.array_equal(np.array([v.co[:] for v in me.vertices])[protected],original_vertices[protected])
assert eye_hash()==frozen_eyes
corrected_geometry=geometry_hash()
validation=[]
for value in [0.,.25,.5,.75,1.]:
 check=copy.copy(raw);check.v=(np.array([p.co[:] for p in basis.data])+new_key_delta*value).tolist()
 validation.append({'oral_key':value,**validate(check)})

# Numeric acceptance, measured on the mesh itself and against the smooth
# section form so the accepted clay shape is not credited to the relief.
valid=index>=0
P4=np.where(valid[...,None],np.zeros(base_grid.shape),np.nan);P4[valid]=original_vertices[index[valid]]
P5=np.where(valid[...,None],np.zeros(base_grid.shape),np.nan);P5[valid]=new_vertices[index[valid]]
aj_b,ak_b,_=step_angles(base_grid);aj_4,ak_4,_=step_angles(P4);aj_5,ak_5,_=step_angles(P5)
sel=np.isfinite(aj_5)&np.isfinite(aj_b);sel[90:]=False
selk=np.isfinite(ak_5)&np.isfinite(ak_b);selk[90:]=False
angle_report={
 'longitudinal_step_excess_over_section_form_deg':{
   'material04':float(np.nanmax(np.where(sel,aj_4-aj_b,-9))),
   'material05':float(np.nanmax(np.where(sel,aj_5-aj_b,-9)))},
 'circumferential_step_excess_over_section_form_deg':{
   'material04':float(np.nanmax(np.where(selk,ak_4-ak_b,-9))),
   'material05':float(np.nanmax(np.where(selk,ak_5-ak_b,-9)))},
 'note':'excess over the relief-free section() surface; the one step the section form itself turns through more than 15 deg is the posterior median crest apex at y=.15, which is accepted coarse anatomy and is preserved.',
}
assert angle_report['longitudinal_step_excess_over_section_form_deg']['material05']<15.
assert angle_report['circumferential_step_excess_over_section_form_deg']['material05']<15.

# ---------------------------------------------------------------------------
# 2. Atlases
# ---------------------------------------------------------------------------
N=1536;H=1024
vtex,uu=np.mgrid[0:H,0:N].astype(np.float32);uu=(uu+.5)/N;vtex=(vtex+.5)/H
vphysical=(vtex+.5)%1
source=bpy.data.images.load(str(HERE/'material01-inputs/dermal-source-material01.png'),check_existing=True)
sw,sh=source.size;px=np.array(source.pixels[:],dtype=np.float32).reshape(sh,sw,4)
lum=px[:,:,:3].mean(2);lum=(lum-lum.mean())/(lum.std()+1e-6)
# The source crop is sampled through an irregular warp rather than straight
# nearest-neighbour rows, so the one remaining image-derived term cannot print
# the swatch's own pixel grid onto the forehead.
from material_fields03 import noise as _noise
wx=.012*_noise(uu*9.3+1.7,vtex*7.1+3.3)+.006*_noise(uu*23.1+5.5,vtex*19.7+8.8)
wy=.012*_noise(uu*8.1+6.2,vtex*9.9+1.9)+.006*_noise(uu*21.3+2.2,vtex*17.1+4.4)
ix=np.clip(((.08+.84*uu+wx)*(sw-1)).astype(int),0,sw-1)
iy=np.clip(((.08+.84*vtex+wy)*(sh-1)).astype(int),0,sh-1)
detail=np.clip(lum[iy,ix],-2,2)/2*np.sin(np.pi*vtex)**2
source.pack();textures=[];encoding_checks=[]
def png_chunk(name,payload):
 return struct.pack('>I',len(payload))+name+payload+struct.pack('>I',zlib.crc32(name+payload)&0xffffffff)
def image(name,data,color=False):
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
 im=bpy.data.images.load(str(path),check_existing=False)
 im.colorspace_settings.name='sRGB' if color else 'Non-Color';im.pack();textures.append(im)
 return im
def atlas(name,c,h,r,width,circum,periodic):
 dx=np.gradient(h.astype(np.float32),axis=1)*N/width
 dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*.5*H/circum if periodic else np.gradient(h.astype(np.float32),axis=0)*H/circum
 normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
 return image(name+'-basecolor',c,True),image(name+'-normal',normal*.5+.5),image(name+'-roughness',r)
import material_fields05 as _f05
_f05.MICRO_HEIGHT=TUNE['micro_height'];_f05.MICRO_CONTRAST=TUNE['micro_contrast']
sc,shgt,sr,_,_=shield(uu,vphysical,detail);shield_maps=atlas('shield-%s'%VARIANT,sc,shgt,sr,1.775,3.,True)
pc,phgt,pr=pectoral(uu,vtex,detail);pectoral_maps=atlas('pectoral-%s'%VARIANT,pc,phgt,pr,1.294,.24,False)
bc,bh,br=posterior(uu,vphysical,detail);body_maps=atlas('posterior-%s'%VARIANT,bc,bh,br,3.20,.80,True)
# The metric the M04 diagnostic used, recomputed on the maps actually written.
def micro_metric(h,bump):
 dx=np.gradient(h.astype(np.float32),axis=1)*N/1.775
 dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*.5*H/3.
 n=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);n/=np.linalg.norm(n,axis=2,keepdims=True)
 lo,hi=(-1.50+1.62)/1.775,(-1.20+1.62)/1.775
 band=(uu>=lo)&(uu<hi)
 var=float(n[np.broadcast_to(band[:,:,None],n.shape)].var())
 return {'bump_strength':bump,'normal_map_variance_over_rostral_band':var,
         'amplitude_bump_strength_times_variance':bump*var,
         'rms_normal_map_slope_over_rostral_band':float(np.sqrt((dx[band]**2+dy[band]**2).mean())),
         'height_std_over_rostral_band':float(h[band].std())}
BUMP_STRENGTH=TUNE['bump'];NORMAL_STRENGTH=TUNE['normal_strength']
micro_report=micro_metric(shgt,BUMP_STRENGTH)

# ---------------------------------------------------------------------------
# 3. Materials
# ---------------------------------------------------------------------------
def mat(name,imgs=None,vertex=False,oral=False,extra_grain=False):
 # extra_grain: slots with no chart of their own (root collar, articulation
 # band, rostral cap) take their fine dermal response from a rest-space field
 # at the SAME physical scale as the atlas tubercles -- the brief's 'bake from
 # a shared rest-space field' option -- so they are not polished plastic beside
 # textured bone, and, having no chart, they cannot stretch or pinch.
 m=bpy.data.materials.new(name);m.use_nodes=True
 nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 bs.inputs['Base Color'].default_value=(.049,.035,.022,1) if oral else (.09,.11,.06,1)
 bs.inputs['Roughness'].default_value=.60 if oral else .565
 bs.inputs['Coat Weight'].default_value=.018;bs.inputs['Coat Roughness'].default_value=.48
 normal=None
 if vertex:
  attr=nodes.new('ShaderNodeVertexColor');attr.layer_name='AnatomicalPigmentM05'
  source=attr.outputs['Color']
  if extra_grain and TUNE['grain_colour']>0:
   coord0=nodes.new('ShaderNodeTexCoord')
   tint=nodes.new('ShaderNodeTexNoise');tint.inputs['Scale'].default_value=50
   tint.inputs['Detail'].default_value=3;tint.inputs['Roughness'].default_value=.55
   links.new(coord0.outputs['Object'],tint.inputs['Vector'])
   rng=nodes.new('ShaderNodeMapRange')
   rng.inputs['To Min'].default_value=1-TUNE['grain_colour']
   rng.inputs['To Max'].default_value=1+TUNE['grain_colour']
   links.new(tint.outputs['Fac'],rng.inputs['Value'])
   scale=nodes.new('ShaderNodeVectorMath');scale.operation='SCALE'
   links.new(source,scale.inputs[0]);links.new(rng.outputs['Result'],scale.inputs[3])
   source=scale.outputs[0]
  links.new(source,bs.inputs['Base Color'])
 if imgs:
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='AnatomicalUVM05'
  for im,socket in zip(imgs,['Base Color','Normal','Roughness']):
   tex=nodes.new('ShaderNodeTexImage');tex.image=im;tex.extension='REPEAT'
   links.new(uv.outputs['UV'],tex.inputs['Vector'])
   if socket=='Normal':
    normal=nodes.new('ShaderNodeNormalMap');normal.uv_map='AnatomicalUVM05'
    normal.inputs['Strength'].default_value=NORMAL_STRENGTH
    links.new(tex.outputs['Color'],normal.inputs['Color'])
   else:links.new(tex.outputs['Color'],bs.inputs[socket])
 if not oral:
  coord=nodes.new('ShaderNodeTexCoord')
  chain=normal
  if extra_grain:
   # Slots without a chart of their own (root collar, articulation band) get
   # the fine dermal response as a rest-space field at the SAME physical scale
   # as the atlas tubercles, so they are not polished plastic beside textured
   # bone.  This is the 'bake from a shared rest-space field' option.
   grain=nodes.new('ShaderNodeTexNoise');grain.inputs['Scale'].default_value=50
   grain.inputs['Detail'].default_value=3;grain.inputs['Roughness'].default_value=.55
   links.new(coord.outputs['Object'],grain.inputs['Vector'])
   gb=nodes.new('ShaderNodeBump');gb.inputs['Strength'].default_value=.22
   gb.inputs['Distance'].default_value=.0011
   links.new(grain.outputs['Fac'],gb.inputs['Height'])
   if chain:links.new(chain.outputs['Normal'],gb.inputs['Normal'])
   chain=gb
  noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=110
  noise.inputs['Detail'].default_value=2;noise.inputs['Roughness'].default_value=.6
  links.new(coord.outputs['Object'],noise.inputs['Vector'])
  bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=BUMP_STRENGTH
  bump.inputs['Distance'].default_value=.0013
  links.new(noise.outputs['Fac'],bump.inputs['Height'])
  if chain:links.new(chain.outputs['Normal'],bump.inputs['Normal'])
  links.new(bump.outputs['Normal'],bs.inputs['Normal'])
 elif normal:links.new(normal.outputs['Normal'],bs.inputs['Normal'])
 return m
mats=[mat('M05 anatomical shield',shield_maps),
      mat('M05 dermal pectorals',pectoral_maps),
      mat('M05 quiet scaleless posterior',body_maps),
      mat('M05 internal oral mucosa',oral=True),
      mat('M05 continuous shield surface into exterior oral rim',shield_maps),
      mat('M05 boundary-matched pectoral roots',vertex=True,extra_grain=True),
      mat('M05 narrow dermal articulation',vertex=True,extra_grain=True),
      (mat('M05 rostral cap on a mirrored local chart',shield_maps)
       if TUNE['cap']=='atlas' else
       mat('M05 rostral cap on the shared rest-space dermal field',vertex=True,extra_grain=True))]
me.materials.clear()
for material in mats:me.materials.append(material)

# ---------------------------------------------------------------------------
# 4. Charts and pigment
# ---------------------------------------------------------------------------
_,oral_uv,lookup,_=corrected_deltas(raw)
uvs=[];colors=[];unknown=[]
centers=np.array([[-.966,.615,-.178,.100],[-.850,.650,-.199,.125],[-.690,.730,-.225,.123],[-.526,.817,-.250,.111],[-.365,.889,-.274,.090],[-.229,.955,-.296,.065],[-.175,.980,-.306,.048],[-.068,1.010,-.321,.053],[.076,1.040,-.340,.046],[.223,1.052,-.360,.031],[.328,1.039,-.380,.004]])
for i,(p,tag) in enumerate(zip(raw.v,raw.tags)):
 x,y,z=p;grid=lookup.get(tuple(round(a,7) for a in p));extend=False
 if i in oral_uv:
  u,v=oral_uv[i];col=shield(np.array(u),np.array((v+.5)%1))[0]
 elif tag.startswith('pectoral_proximal') or tag.startswith('pectoral_distal'):
  cz=np.interp(y,centers[:,0],centers[:,2]);h=np.interp(y,centers[:,0],centers[:,3])
  u=np.clip((y+.966)/1.294,0,1);v=np.clip(.5+.5*(z-cz)/h,0,1)
  col=pectoral(np.array(u),np.array(v))[0]
 elif grid:
  yy,v0=grid
  if tag=='posterior':u=(yy-.18)/3.2;col=posterior(np.array(u),np.array(v0))[0]
  else:u=(yy+1.62)/1.775;col=shield(np.array(u),np.array(v0))[0]
  v=(v0+.5)%1
 else:
  u=0;v=.5;col=np.array([.09,.11,.06])
  extend=tag.startswith('pectoral_root') or tag.startswith('oral') or tag=='throat' or tag=='shield'
 uvs.append((float(np.clip(u,.5/N,1-.5/N)),float(v)));colors.append(col);unknown.append(extend)
colors,extension_report=extend_boundary_colors(raw.f,np.asarray(colors),np.asarray(unknown))
assert extension_report['boundary_colors_unchanged']
for layer in list(me.color_attributes):
 if layer.name!='AnatomicalPigmentM05':me.color_attributes.remove(layer)
attr=me.color_attributes.new(name='AnatomicalPigmentM05',type='FLOAT_COLOR',domain='POINT')
for i,col in enumerate(colors):attr.data[i].color=(*col,1)
for layer in list(me.uv_layers):
 if layer.name!='AnatomicalUVM05':me.uv_layers.remove(layer)
uvlayer=me.uv_layers.new(name='AnatomicalUVM05')

# The nose cap: a real disc chart.  Rim radius per rim vertex, measured on the
# cap plane; the rim itself keeps U=0, so both sides of the join sample the
# identical anterior atlas texels, and the apex carries a per-loop V so the fan
# has no collapsed UV edge anywhere.
cap_apex=Vector(CAP_APEX)
rim_radius={}
for i,p in enumerate(raw.v):
 if abs(p[1]+1.62)<1e-8 and not (abs(p[0]-CAP_APEX[0])<1e-9 and abs(p[2]-CAP_APEX[2])<1e-9):
  rim_radius[i]=math.hypot(p[0]-CAP_APEX[0],p[2]-CAP_APEX[2])
cap_polygons=0
for poly in me.polygons:
 tags={raw.tags[i] for i in poly.vertices};old=raw.material[poly.index]
 if old==2:slot=3
 elif any(t.startswith('oral') for t in tags):slot=4
 elif any(t.startswith('pectoral_root') for t in tags):slot=5
 elif any(t.startswith('pectoral_') for t in tags):slot=6 if old==3 else 1
 elif all(abs(raw.v[i][1]+1.62)<1e-8 for i in poly.vertices):slot=7
 elif 'posterior' in tags:slot=2
 else:slot=0
 poly.material_index=slot
 if slot==7:
  cap_polygons+=1
  rim=[i for i in poly.vertices if i in rim_radius]
  apex=[i for i in poly.vertices if i not in rim_radius]
  assert len(rim)==2 and len(apex)==1,'STOP unexpected rostral cap polygon'
  va,vb=(uvs[rim[0]][1],uvs[rim[1]][1])
  if abs(va-vb)>.5:
   if va<vb:va+=1
   else:vb+=1
  mid_v=(va+vb)/2;mid_u=float(np.clip((rim_radius[rim[0]]+rim_radius[rim[1]])/2/1.775,.5/N,1-.5/N))
  per={rim[0]:(float(np.clip(0,.5/N,1-.5/N)),va),rim[1]:(float(np.clip(0,.5/N,1-.5/N)),vb),apex[0]:(mid_u,mid_v)}
  for loop in poly.loop_indices:uvlayer.data[loop].uv=per[me.loops[loop].vertex_index]
  continue
 local=[uvs[i] for i in poly.vertices]
 wrap=slot in [0,2,4] and max(p[1] for p in local)-min(p[1] for p in local)>.5
 for loop in poly.loop_indices:
  u,v=uvs[me.loops[loop].vertex_index];uvlayer.data[loop].uv=(u,v+1 if wrap and v<.5 else v)
assert cap_polygons==192,cap_polygons
cap_areas=[]
for poly in me.polygons:
 if poly.material_index!=7:continue
 a,b,c=[Vector(uvlayer.data[l].uv) for l in poly.loop_indices]
 cap_areas.append(abs((b-a).cross(c-a))/2)
assert min(cap_areas)>1e-7,('collapsed rostral cap chart',min(cap_areas))

assert geometry_hash()==corrected_geometry,'STOP unexpected geometry change after the declared M05 relief'
body.name='Bothriolepis V3 MATERIAL05 continuous anatomy'
body['appearance_variant']=VARIANT
body['appearance_tuning']=json.dumps(TUNE)
body['phase']='MATERIAL05 resolved relief + calmed micro + charted rostral cap; art review required'
body['geometry_before_material05_sha256']=incoming_geometry
body['geometry_after_material05_sha256']=corrected_geometry
body['resolved_relief_report']=json.dumps(relief_report)
body['step_angle_report']=json.dumps(angle_report)
body['normal_bake_dependency']='Shared rest-space pore/grain Bump must be baked into the final export normal map; do not drop it silently.'
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))

report={'status':'SOURCE_CHECK_PASS','variant':VARIANT,'tuning':TUNE,
 'phase':'MATERIAL05 actual appearance review still REQUIRED',
 'input_blend':str(BASE),'input_verified_by':'recorded invariants, not blend hash (see module docstring)',
 'input_geometry_sha256':incoming_geometry,'geometry_after_material05_sha256':corrected_geometry,
 'topology':{'vertices':len(me.vertices),'faces':len(me.polygons)},
 'protected_anatomy_vertices':len(protected),'protected_anatomy_unchanged':True,
 'eye_meshes_unchanged':eye_hash()==frozen_eyes,
 'oral_motion_delta_max_error':key_error,
 'oral_pose_validation':validation,
 'resolved_relief':relief_report,'step_angles':angle_report,
 'forehead_microrelief':micro_report,
 'rostral_cap':{'polygons':cap_polygons,'minimum_uv_triangle_area':float(min(cap_areas)),
   'chart':'nose disc mirrored back out along the shield U; rim at U=0 on both sides',
   'surface_response':TUNE['cap']},
 'color_encoding':encoding_checks,'pigment_boundary_extension':extension_report,
 'plate_paths_preserved':[n for n,p in PATHS],
 'material_slots':[m.name for m in mats]}
(OUT/'source-check.json').write_text(json.dumps(report,indent=2)+'\n')
files=[BLEND,OUT/'source-check.json']+[Path(im.filepath) for im in textures]
manifest={str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}
(OUT/'outputs-sha256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('BOTHRIOLEPIS_MATERIAL05_BUILD_DONE '+str(BLEND))
