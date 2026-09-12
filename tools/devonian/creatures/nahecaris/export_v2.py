"""v2 copy of export.py: writes to v2-candidate/nahecaris-v2.blend/anchors-v2.json/build-stats-v2.json
instead of the shipped candidate/blend/anchors.json/build-stats.json, so nothing here can touch the
frozen initial delivery. Exec'd from build_v2.py, which has already bound C to .../v2-candidate."""
from mathutils import Matrix
for b in rig.pose.bones:b.rotation_euler=(0,0,0);b.location=(0,0,0)
bpy.context.view_layer.update()
anchors=[('anchor_mouth','body',(0,-1.265,-.135),'mouth'),('anchor_mouth_inside','body',(0,-1.265,-.065),'swallow'),('anchor_attack_primary','mandibleL',(.054,-1.29,-.135),'attack')]
for name,bone,p,role in anchors:
 o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=bone;o['cambrianAnchor']={'version':1,'role':role,'parentBone':bone}
bpy.context.view_layer.update()
for name,bone,p,role in anchors:bpy.data.objects[name].matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update();(H/'anchors-v2.json').write_text(json.dumps({'nahecaris':[{'name':n,'bone':b,'point':p,'role':r}for n,b,p,r in anchors]},indent=2))
sourcepath=L/'nahecaris-v2.blend';bpy.ops.wm.save_as_mainfile(filepath=str(sourcepath))
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
export(C/'nahecaris.glb');full=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
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
  bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Physical silhouette LOD','DECIMATE');dec.ratio=.27;bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Crawl','Death']:bpy.data.actions.remove(a)
export(C/'nahecaris.lod1.glb');lod=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
meta={'id':'nahecaris','name':'Nahecaris','species':'Nahecaris stuertzi','provenance':'Early Devonian, Hunsrück Slate, Germany','description':'Bivalved phyllocarid with a rostral plate, branching antennae, eight pairs of biramous basket-forming thoracopods, seven abdominal rings and narrow telson/furcal rami.','lengthMeters':.12,'modelLength':5.87,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://doi.org/10.1007/BF02985909','https://doi.org/10.1016/j.asd.2016.01.004','https://doi.org/10.1080/08912963.2025.2492356','https://pmc.ncbi.nlm.nih.gov/articles/PMC5378094/'],'notes':['Initial preview reconstruction with explicitly uncertain ocular bases, soft tissues and exact appendage proportions.','Eight biramous thoracopod pairs with finger-like exopod lobes and progressively shorter endopods; no generic decapod claw or tail fan.','Compact eyes beneath rostral plate are reconstructed; precise eye preservation is not asserted from the accessible species abstract.','The 0.12 m representative display length is an art assumption, not a measured maximum.','Historical whole-animal drawing and comparative archaeostracan abdomen/pleopods guide missing proportions.','Crawl is a restrained antenna-supported substrate gesture; Swim is compatibility locomotion using metachronal limbs. Precise cycles are inferred.','Moult is preparatory limb/rim extension, without shell splitting, scale channels or whole-model growth.','Full regional vertex pigment times near-neutral albedo once; texture-free LOD bakes that factor once.']}
(C/'nahecaris.json').write_text(json.dumps(meta,indent=2));(L/'build-stats-v2.json').write_text(json.dumps({'fullTriangles':full,'lodTriangles':lod,'ratio':lod/full,'clips':clips,'source':str(sourcepath)},indent=2));print('NAHECARIS_V2_CANDIDATE',full,lod,str(C),flush=True)
