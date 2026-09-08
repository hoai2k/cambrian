"""Frozen first-clay build and seven views. Run only through execute_clay02.py.

No old .blend or GLB is read. Writes only local Bothriolepis rework-v3/clay02.
This phase intentionally has no production rig, action library, materials or GLB.
"""
import bpy, sys, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
from geometry_clay02 import build_body, validate, section, sub, unit, cross
REPO=HERE.parents[4]
OUT=REPO.parent/'devonian-authoring/bothriolepis/rework-v3/clay02'
OUT.mkdir(parents=True,exist_ok=True)
assert not (OUT/'bothriolepis-clay02.blend').exists(),'Frozen clay already exists; return to Astra, never overwrite.'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=880;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True
background=scene.world.node_tree.nodes.get('Background');background.inputs['Color'].default_value=(.10,.10,.10,1);background.inputs['Strength'].default_value=.4
scene.view_settings.view_transform='AgX'

def material(name,color,rough=.62):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
 return m
mats=[material('CLAY - rigid dermal armour',(.43,.38,.31)),
      material('CLAY - flexible scaleless posterior',(.39,.36,.31)),
      material('CLAY - oral tissue and vestibule',(.115,.085,.063)),
      material('CLAY - restricted pectoral joint',(.31,.28,.24))]
raw=build_body();report=validate(raw)
me=bpy.data.meshes.new('New continuous shield-body-oral-pectoral sculpture')
me.from_pydata(raw.v,[],raw.f);me.update()
body=bpy.data.objects.new('Bothriolepis V3 continuous anatomy CLAY02',me);scene.collection.objects.link(body)
for mat in mats:me.materials.append(mat)
for p,mat in zip(me.polygons,raw.material):p.material_index=mat;p.use_smooth=True
for tag in sorted(set(raw.tags)):
 group=body.vertex_groups.new(name=tag);group.add([i for i,t in enumerate(raw.tags) if t==tag],1,'REPLACE')
body['authorship']='New V3 geometry; Bechard et al. 2014 figures 2/3/5/7; user image art direction'
body['anatomical_limits']='Head and thorax rigid. Pectorals have proximal/distal dermal segments. Ventral toothless mouth. One rayless dorsal. No pelvic/anal fins. Scaleless posterior.'
body['phase']='First clay sculpture, awaiting Astra review; not production rig or export approval.'
body.shape_key_add(name='Basis')
oral=body.shape_key_add(name='Oral opening study only')
for i,w in enumerate(raw.oral_weight):
 oral.data[i].co.z-=.028*w;oral.data[i].co.y+=.012*w
oral.value=0

# Complete closed, small eyes embedded directly in the actual sloping head.
# No surrounding pads/hoops. Final eye-volume audit belongs after clay approval.
eye_mat=material('CLAY - inset eye',(.072,.065,.057),.30)
eye_records=[]
for sign,side in [(1,'L'),(-1,'R')]:
 y=-1.410;theta=sign*.34
 p=Vector(section(y,theta));du=Vector(sub(section(y,theta+.0001),section(y,theta-.0001))).normalized()
 dv=Vector(sub(section(y+.0001,theta),section(y-.0001,theta))).normalized()
 normal=du.cross(dv).normalized()
 if normal.z<0:normal=-normal
 across=du.normalized();along=normal.cross(across).normalized()
 center=p-normal*.024
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,location=center)
 eye=bpy.context.object;eye.name='Closed inset eye '+side
 basis=Matrix(((across.x,along.x,normal.x),(across.y,along.y,normal.y),(across.z,along.z,normal.z)))
 eye.rotation_euler=basis.to_euler();eye.scale=(.040,.052,.033)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 eye.data.materials.append(eye_mat)
 for f in eye.data.polygons:f.use_smooth=True
 eye_records.append({'name':eye.name,'surface_point':list(p),'center':list(center),'outward_normal':list(normal),'normal_radius':.033,'center_recess':.024})

def point(o,at):o.rotation_euler=(Vector(at)-o.location).to_track_quat('-Z','Y').to_euler()
for name,pos,energy,size in [('Key',(-3,-4,6),650,5),('Fill',(4,-1,3),280,4),('Rim',(1,5,5),600,4),('Ventral fill',(0,-2,-4),160,4)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size
 o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=pos;point(o,(0,.35,0))
cam_data=bpy.data.cameras.new('Clay review orthographic');cam=bpy.data.objects.new('Clay review orthographic',cam_data);scene.collection.objects.link(cam);scene.camera=cam;cam_data.type='ORTHO';cam_data.lens=50
views=[
 ('01-front',(0,-8,.80),(0,-.40,.04),'full',False),
 ('02-side',(8,.78,.14),(0,.78,.04),'full',False),
 ('03-dorsal',(0,.88,9),(0,.88,0),'full',False),
 ('04-oblique',(5.6,-6.2,4.2),(0,.67,.02),'full',False),
 ('05-underside',(0,.8,-9),(0,.8,0),'full',False),
 ('06-mouth-open',(0,-2.10,-4.0),(0,-1.40,-.25),'oral',True),
 ('07-mouth-depth-oblique',(.82,-1.90,-1.3),(0,-1.455,-.27),'oral',True),
]
framing=[]
def fit_view(view):
 name,pos,target,scope,opened=view
 oral.value=1 if opened else 0
 cam.location=pos;point(cam,target)
 rotation=cam.rotation_euler.to_quaternion()
 right=rotation@Vector((1,0,0));up=rotation@Vector((0,1,0))
 points=[Vector(p) for p in raw.v] if scope=='full' else [Vector(p) for p,tag in zip(raw.v,raw.tags) if tag.startswith('oral') or tag=='throat' or (abs(p[0])<.36 and -1.62<=p[1]<-1.15 and p[2]<-.10)]
 # Blender's landscape orthographic scale is its WIDTH, not its height.
 # Project actual geometry into this camera basis and fit both dimensions.
 origin=Vector(target);xs=[(p-origin).dot(right) for p in points];ys=[(p-origin).dot(up) for p in points]
 width=max(xs)-min(xs);height=max(ys)-min(ys)
 aspect=scene.render.resolution_x/scene.render.resolution_y
 cam_data.ortho_scale=1.16*max(width,height*aspect)
 shift=right*((min(xs)+max(xs))/2)+up*((min(ys)+max(ys))/2)
 cam.location=Vector(pos)+shift;point(cam,origin+shift)
 margins=[(1-width/cam_data.ortho_scale)/2,(1-height/(cam_data.ortho_scale/aspect))/2]
 assert min(margins)>.065,('framing margin failure',name,margins)
 framing.append({'view':name,'scope':scope,'ortho_width':cam_data.ortho_scale,'geometry_width':width,'geometry_height':height,'minimum_fractional_margin':min(margins)})
# Save before rendering with neutral oral shape; render-only state cannot silently
# become a production rest pose. The .blend is the frozen source created by Terra.
fit_view(views[3]);framing.clear()
scene['source_phase']='Bothriolepis V3 clay02 review only'
scene['source_geometry_sha256']=hashlib.sha256((HERE/'geometry_clay02.py').read_bytes()).hexdigest()
blend=OUT/'bothriolepis-clay02.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
for view in views:
 name=view[0];fit_view(view)
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
oral.value=0
report.update({'eye_studies':eye_records,'camera_framing':framing,'views':[v[0]+'.png' for v in views],
 'anatomy_review':'REQUIRED: inspect all seven actual clay images before later authoring phases.',
 'source_blend_sha256':hashlib.sha256(blend.read_bytes()).hexdigest(),
 'source_blend_bytes':blend.stat().st_size})
(OUT/'source-check.json').write_text(json.dumps(report,indent=2)+'\n')
files=[blend]+[OUT/(v[0]+'.png') for v in views]+[OUT/'source-check.json']
manifest={str(p):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}
(OUT/'outputs-sha256.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('BOTHRIOLEPIS_CLAY02_DONE '+str(OUT/'outputs-sha256.json'))
