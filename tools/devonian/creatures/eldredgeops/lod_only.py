import bpy,json
from pathlib import Path
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/eldredgeops/v2';O=L/'candidate'
bpy.ops.wm.open_mainfile(filepath=str(L/'eldredgeops-v2.blend'))
rig=bpy.data.objects['Eldredgeops'];objects=[o for o in bpy.data.objects if o.type=='MESH'];M={m.name:m for m in bpy.data.materials};anchors=[(a['name'],a['bone'],a['point'],a['role'])for a in json.loads((H/'anchors.json').read_text())['eldredgeops']]
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment'if '.lod1.'in path.name else'Color',export_all_vertex_colors=False,export_extras=True,export_yup=True)
# Preserve independent lens solids and their auditability; simplify every larger anatomical surface.
for o in objects:
 if len(o.data.polygons)>150 and not o.name.startswith(('ocular_volume','lens_solids')):
  d=o.modifiers.new('Actual reduced distant geometry','DECIMATE');d.ratio=.23;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
 if len(o.data.materials)>1:
  first=o.data.materials[0];o.data.materials.clear();o.data.materials.append(first)
  for f in o.data.polygons:f.material_index=0
for m in M.values():
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for li in list(nt.links):
  if li.to_node==bs:nt.links.remove(li)
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='BakedPigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for ac in list(bpy.data.actions):
 if ac.name not in ['Idle','Swim','Crawl','Death']:bpy.data.actions.remove(ac)
export(O/'eldredgeops.lod1.glb')

print('ELDREDGEOPS_LOD_SWIM_FIXED',flush=True)
