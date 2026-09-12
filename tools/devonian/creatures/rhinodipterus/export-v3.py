"""V3 port of export-v2.py: the mouth/attack anchors move with the stretched jaw/skull (same
stretchY() as build-v3.py, jaw pivot -.70 for the jaw-tip anchor, head pivot -.68 for the two
skull anchors), written to anchors-v3.json (never anchors.json), and output goes to the
v3-candidate/ family with a distinct source .blend name. Otherwise identical to export-v2.py."""
from mathutils import Matrix
anchors=[('anchor_mouth','jaw',(0,stretchY(-2.255,pivot=-.70),-.05),'mouth'),('anchor_mouth_inside','skull',(0,stretchY(-1.16),-.11),'swallow'),('anchor_attack_primary','skull',(0,stretchY(-2.29),.032),'attack')]
for name,bone,p,role in anchors:
 o=bpy.data.objects.new(name,None);s.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=bone;o['cambrianAnchor']={'version':1,'role':role,'parentBone':bone}
bpy.context.view_layer.update()
for name,bone,p,role in anchors:bpy.data.objects[name].matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update();(H/'anchors-v3.json').write_text(json.dumps({'rhinodipterus':[{'name':n,'bone':b,'point':p,'role':r}for n,b,p,r in anchors]},indent=2))
sourcepath=L/'rhinodipterus-v3.blend';bpy.ops.wm.save_as_mainfile(filepath=str(sourcepath))
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
export(C/'rhinodipterus.glb');full=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
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
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(C/'rhinodipterus.lod1.glb');lod=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
meta={'id':'rhinodipterus','name':'Rhinodipterus','species':'Rhinodipterus kimberleyensis','provenance':'Late Devonian, Gogo Formation, Western Australia','description':'Long-snouted marine lungfish with a narrow mandibular symphysis, small lateral eyes, rounded radial tooth plates, cosmine skull roof and comparative lobed fins with two posterior dorsals.','lengthMeters':.55,'modelLength':5.89,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://doi.org/10.1111/j.1475-4983.2011.01118.x','https://pmc.ncbi.nlm.nih.gov/articles/PMC2936207/','https://doi.org/10.1017/S0263593300003588'],'notes':['Cranial reconstruction informed by Clement2012; snout tip is inferred from the long symphysis and comparative specimens.','Body and fin outline follows the explicitly comparative proposal in Clement2012 Fig7G (after R.ulrichi); no complete R.kimberleyensis postcranium is known.','Seven upper and six lower rounded denticle rows; restrained gape and lateral grinding reflect the species description, not a crushing predator.','Exact pigment, skin thickness, oral soft tissues and movement are artistic. Representative length is a display assumption, not an observed complete animal or maximum.','Full uses regional vertex pigment multiplied once by near-neutral UV albedo; texture-free LOD bakes this factor once.','Air-gulping is a cranial anatomical interpretation; no claimed breathing frequency, terrestrial walk or aestivation.']}
(C/'rhinodipterus.json').write_text(json.dumps(meta,indent=2));(L/'build-stats-v3.json').write_text(json.dumps({'fullTriangles':full,'lodTriangles':lod,'ratio':lod/full,'clips':clips,'source':str(sourcepath)},indent=2))
print('RHINODIPTERUS_V3_CANDIDATE',full,lod,str(C),flush=True)
