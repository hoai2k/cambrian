"""Candidate-only Blender export, exact vertex-colour restoration and physical LOD."""
from mathutils import Matrix
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
bpy.context.view_layer.update()
anchors=[('anchor_mouth','head',(0,-1.491,.006),'mouth'),('anchor_mouth_inside','head',(0,-1.410,.006),'swallow'),('anchor_attack_primary','beak_lower',(0,-1.493,.003),'attack')]
for name,bone,p,role in anchors:
 o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=bone;o['cambrianAnchor']={'version':1,'role':role,'parentBone':bone}
bpy.context.view_layer.update()
for name,bone,p,role in anchors:bpy.data.objects[name].matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update();(H/'anchors.json').write_text(json.dumps({'manticoceras':[{'name':n,'bone':b,'point':p,'role':r}for n,b,p,r in anchors]},indent=2))
sourcepath=L/'manticoceras-initial.blend';bpy.ops.wm.save_as_mainfile(filepath=str(sourcepath))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for name,_,_,_ in anchors:bpy.data.objects[name].select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
# Blender's exporter currently emits white COLOR_0 for some secondary material
# primitives. Restore the exact source linear vertex colours in-place in the BIN,
# preserving topology, accessors, shader factors and matching source appearance.
def restore_export_colours(path):
 import struct
 from mathutils.kdtree import KDTree
 raw=bytearray(path.read_bytes());size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);binstart=28+size
 byname={o.data.name:o for o in objects};byname.update({o.name:o for o in objects})
 def access(i):
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dt={5126:'<f4',5123:'<u2',5121:'u1'}[a['componentType']];nc={'VEC3':3,'VEC4':4}[a['type']];stride=v.get('byteStride',np.dtype(dt).itemsize*nc)
  return np.ndarray((a['count'],nc),dtype=dt,buffer=raw,offset=binstart+v.get('byteOffset',0)+a.get('byteOffset',0),strides=(stride,np.dtype(dt).itemsize)),a
 for m in doc['meshes']:
  o=byname[m['name']];colors=o.data.color_attributes['Color']
  for prim in m['primitives']:
   if 'COLOR_0'not in prim['attributes']:continue
   material=doc['materials'][prim['material']]['name'];indices={vi for p in o.data.polygons if o.data.materials[p.material_index].name==material for vi in p.vertices};kd=KDTree(len(indices))
   for vi in indices:kd.insert(o.data.vertices[vi].co,vi)
   kd.balance()
   positions,_=access(prim['attributes']['POSITION']);out,accessor=access(prim['attributes']['COLOR_0']);eye=doc['materials'][prim['material']]['name']=='eyes'
   for i,(x,z,ny) in enumerate(positions):
    _,vi,dist=kd.find(Vector((float(x),float(-ny),float(z))));assert dist<2e-5,(m['name'],dist)
    c=np.ones(4)if eye else np.array(colors.data[vi].color);out[i]=np.round(np.clip(c,0,1)*np.iinfo(out.dtype).max)if accessor.get('normalized')else c
 path.write_bytes(raw)
_original_export=export
def export(path):_original_export(path);restore_export_colours(path)
export(C/'manticoceras.glb');full=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
for o in objects:
 for material,array in arrays.items():
  indices={vi for p in o.data.polygons if o.data.materials[p.material_index].name==material for vi in p.vertices}
  if not indices:continue
  uv=o.data.uv_layers[0];col=o.data.color_attributes['Color'];byvertex={l.vertex_index:uv.data[i].uv.copy()for i,l in enumerate(o.data.loops)}
  for i in indices:
   q=byvertex[i];c=col.data[i].color;detail=array[int((q.y%1)*(TX-1)),int((q.x%1)*(TX-1)),:3];col.data[i].color=(*[c[k]*float(detail[k])for k in range(3)],1)
for mat in M.values():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 for l in list(links):
  if l.to_node==bs and l.to_socket.name in ['Base Color','Normal','Roughness']:links.remove(l)
 vc=next((n for n in nodes if n.bl_idname=='ShaderNodeVertexColor'),None)
 if vc:links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for o in objects:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 if len(o.data.polygons)>40:
  bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Physical silhouette LOD','DECIMATE');dec.ratio=.24;bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(C/'manticoceras.lod1.glb');lod=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
meta={'id':'manticoceras','name':'Manticoceras','species':'Manticoceras regulare','provenance':'Late Devonian, Frasnian; Lime Creek Formation / Amana Beds, Iowa','description':'Compressed coiled ammonoid shell with embracing whorls, a genuine open body chamber and an editable conservative soft-body reconstruction.','lengthMeters':.16,'modelLength':3.3,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://scholarworks.uni.edu/pias/vol93/iss1/4/','https://igs.iihr.uiowa.edu/igs/publications/uploads/GB-29.pdf','https://www.app.pan.pl/archive/published/app49/app49-235.pdf','https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0235180'],'notes':['Initial preview; shell is anatomically constrained but exact soft parts and all living pigmentation are uncertain.','Representative shell diameter 0.11 m follows the Baker et al.1986 material; total living length 0.16 m includes artistically reconstructed soft parts and is not a species maximum. Larger M.regulare shells occur in the 2013 Iowa Survey figures.','Ten modest arms, small beak and funnel are conservative comparative choices, not directly preserved M.regulare soft anatomy. No hooks, suckers, long squid clubs or Nautilus arm count are asserted.','Smooth biconvex growth increments replace decorative fossil sutures; the visible fossil septal boundaries are internal structures.','Shell is rigid on body bone; flexible arms, mantle margins and open funnel interpret jetting and feeding actions. No scale channels or shell deformation.','Growth is relaxed extension, not a shell moult. Grab is a conservative arm-gathering interpretation.','Full regional vertex pigment multiplies near-neutral albedo once; texture-free LOD bakes the same factor once.']}
(C/'manticoceras.json').write_text(json.dumps(meta,indent=2));(L/'build-stats.json').write_text(json.dumps({'fullTriangles':full,'lodTriangles':lod,'ratio':lod/full,'clips':clips,'source':str(sourcepath)},indent=2));print('MANTICOCERAS_INITIAL_CANDIDATE',full,lod,str(C),flush=True)
