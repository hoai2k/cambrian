"""Bake static, pigmented, placement-normalized scenery proxies; leave metric specimens untouched."""
import bpy,bmesh,json,os,sys,hashlib,numpy as np
from mathutils import Vector
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(os.path.join(HERE,'../../..'));LOCAL=os.path.abspath(os.path.join(ROOT,'../devonian-authoring/props-instancing'));OUT=os.path.join(ROOT,'public/assets/devonian/props-instanced');cfg=json.load(open(os.path.join(HERE,'config.json')));os.makedirs(OUT,exist_ok=True);reports=[]
for spec in cfg['props']:
 
 for obsolete in list(bpy.data.objects):bpy.data.objects.remove(obsolete,do_unlink=True)
 for block in list(bpy.data.meshes):
  if block.users==0:bpy.data.meshes.remove(block)
 bpy.ops.import_scene.gltf(filepath=os.path.join(LOCAL,'decoded',spec['id']+'.glb'))
 for o in bpy.context.scene.objects:
  if o.animation_data:o.animation_data_clear()
  if o.type=='ARMATURE':
   for pb in o.pose.bones:pb.matrix_basis.identity()
 bpy.context.scene.frame_set(0);bpy.context.view_layer.update();vertices=[];faces=[];colors=[];widgets={pb.custom_shape for o in bpy.context.scene.objects if o.type=='ARMATURE' for pb in o.pose.bones if pb.custom_shape is not None}
 for obj in list(bpy.context.scene.objects):
  if obj.type!='MESH' or obj.hide_render or obj in widgets:continue
  ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=ev.to_mesh();mat=obj.matrix_world;off=len(vertices);vertices.extend(tuple(mat@v.co)for v in mesh.vertices);attr=mesh.color_attributes.active_color or next(iter(mesh.color_attributes),None);assert attr is not None,(spec['id'],obj.name)
  for poly in mesh.polygons:
   faces.append(tuple(off+i for i in poly.vertices))
   for li in poly.loop_indices:colors.append(tuple(attr.data[mesh.loops[li].vertex_index if attr.domain=='POINT'else li].color))
  ev.to_mesh_clear()
 
 for obsolete in list(bpy.data.objects):bpy.data.objects.remove(obsolete,do_unlink=True)
 co=np.array(vertices);minimum=co.min(0);maximum=co.max(0);source_bounds=[minimum.tolist(),maximum.tolist()];center=(minimum+maximum)/2;co[:,0]-=center[0];co[:,1]-=center[1];co[:,2]-=center[2]if spec.get('pivot')=='center'else minimum[2]
 if 'radius'in spec:
  radial=float(np.sqrt(co[:,0]**2+co[:,1]**2).max());co[:,:2]*=spec['radius']/radial;co[:,2]*=spec['height']/(maximum[2]-minimum[2])
 else:
  dims=spec['dimensions'];co*=np.array([dims[0],dims[2],dims[1]])/(maximum-minimum)
 mesh=bpy.data.meshes.new(spec['id']);mesh.from_pydata(co.tolist(),[],faces);mesh.update();col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');col.data.foreach_set('color',np.array(colors,dtype=np.float32).ravel());obj=bpy.data.objects.new(spec['id'],mesh);bpy.context.collection.objects.link(obj);bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.validate(clean_customdata=False);mesh.update();before=len(mesh.polygons)
 if before>spec['triangles']:
  de=obj.modifiers.new('Static instance budget','DECIMATE');de.ratio=spec['triangles']/before;de.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=de.name)
 mesh=obj.data
 mesh.validate();mesh.update()
 # Collapse can move extrema slightly: restore the declared game-space footprint after reduction.
 reduced=np.array([tuple(v.co)for v in mesh.vertices]);lo=reduced.min(0);hi=reduced.max(0)
 reduced[:,:2]-=(lo[:2]+hi[:2])/2
 reduced[:,2]-=(lo[2]+hi[2])/2 if spec.get('pivot')=='center' else lo[2]
 if 'radius' in spec:
  reduced[:,:2]*=spec['radius']/np.sqrt((reduced[:,:2]**2).sum(1)).max();reduced[:,2]*=spec['height']/(hi[2]-lo[2])
 else:reduced*=np.array([spec['dimensions'][0],spec['dimensions'][2],spec['dimensions'][1]])/(hi-lo)
 for vertex,position in zip(mesh.vertices,reduced):vertex.co=position
 mesh.update();assert not mesh.validate()
 for p in mesh.polygons:p.use_smooth=True
 material=bpy.data.materials.new('Baked scenery pigment');material.use_nodes=True;bs=material.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1);bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.85;att=material.node_tree.nodes.new('ShaderNodeVertexColor');att.layer_name='Color';material.node_tree.links.new(att.outputs['Color'],bs.inputs['Base Color']);mesh.materials.append(material)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,spec['id']+'.blend'))
 target=os.path.join(OUT,spec['id']+'.glb');bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',use_selection=True,export_animations=False,export_skins=False,export_normals=True,export_texcoords=False,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True)
 final=np.array([tuple(v.co)for v in mesh.vertices]);triangles=sum(len(p.vertices)-2 for p in mesh.polygons);assert triangles<=spec['triangles'];assert len(mesh.materials)==1;assert np.isfinite(final).all();bounds=[final.min(0).tolist(),final.max(0).tolist()];radius=float(np.sqrt(final[:,0]**2+final[:,1]**2).max());reports.append({**spec,'sourceBoundsBlenderMeters':source_bounds,'triangles':triangles,'sourceTriangles':before,'ratio':triangles/before,'boundsBlenderGameUnits':bounds,'horizontalRadius':radius,'bytes':os.path.getsize(target),'sha256':hashlib.sha256(open(target,'rb').read()).hexdigest(),'static':True,'vertexPigment':True,'pivot':spec.get('pivot','ground')});print('INSTANCE_READY',spec['id'],triangles,flush=True)
json.dump({'props':reports,'proceduralExceptions':cfg['proceduralExceptions'],'coordinatePolicy':cfg['coordinatePolicy']},open(os.path.join(HERE,'build-report.json'),'w'),indent=2)
