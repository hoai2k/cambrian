"""Apply original PBR and export the reviewed clay without rebuilding anatomy."""
import bpy,json,os
import numpy as np
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/furcaster/v1';O=L/'candidate'
bpy.ops.wm.open_mainfile(filepath=str(L/'furcaster.blend'));S=bpy.context.scene;rig=bpy.data.objects['Furcaster'];objects=[o for o in bpy.data.objects if o.type=='MESH'];M={m.name.removeprefix('Furcaster_'):m for m in bpy.data.materials}
for key,m in M.items():
 if not(H/(key+'-albedo.png')).exists():continue
 bs=m.node_tree.nodes.get('Principled BSDF')
 for suffix,input in [('albedo','Base Color'),('normal','Normal'),('roughness','Roughness')]:
  im=bpy.data.images.load(str(H/(key+'-'+suffix+'.png')));im.pack();tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im
  if suffix!='albedo':im.colorspace_settings.name='Non-Color'
  if suffix=='normal':
   nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.3;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs[input])
  else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[input])
CLIPS={a.name:round(a.frame_range[1]-a.frame_range[0])for a in bpy.data.actions};LOOPS=['Idle','Crawl','Swim','Guard','Eat'];anchors=[('anchor_mouth','body',(0,0,-.115),'mouth'),('anchor_mouth_inside','oral_pump',(0,0,.006),'swallow'),('anchor_attack_primary','arm_0_28',tuple(rig.data.bones['arm_0_29'].head_local),'attack')]
exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
