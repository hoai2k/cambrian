"""Export the texture-free LOD from the saved source, with one explicit colour attribute."""
import bpy,os,numpy as np
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/doryaspis/v2';O=(R/'public/assets/devonian/creatures')if os.environ.get('DORY_PUBLISH')=='1'else L/'candidate';bpy.ops.wm.open_mainfile(filepath=str(L/'doryaspis-v2.blend'));rig=bpy.data.objects['Doryaspis']
for o in bpy.data.objects:
 if o.type!='MESH':continue
 if len(o.data.polygons)>150 and not o.name.startswith('eye_globe'):
  d=o.modifiers.new('Actual reduced LOD','DECIMATE');d.ratio=.27;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
for m in bpy.data.materials:
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 if not bs:continue
 for link in list(nt.links):
  if link.to_node==bs:nt.links.remove(link)
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='BakedPigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
# One vertex-colour material per LOD mesh avoids Blender's multi-material
# colour-layer remapping and retains every baked tissue colour.
for o in bpy.data.objects:
 if o.type=='MESH' and len(o.data.materials)>1:
  first=o.data.materials[0];o.data.materials.clear();o.data.materials.append(first)
  for f in o.data.polygons:f.material_index=0
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
bpy.context.view_layer.update();bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=rig
for n in ['head_shield_continuous_closed','eye_globe_L']:
 print('LOD_PIGMENT',n,np.mean([c.color[:]for c in bpy.data.objects[n].data.color_attributes['BakedPigment'].data],axis=0))
bpy.ops.export_scene.gltf(filepath=str(O/'doryaspis.lod1.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment',export_all_vertex_colors=False,export_extras=True,export_yup=True)
print('DORYASPIS_FRESH_SCENE_LOD_READY')
