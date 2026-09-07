"""Candidate-only full/reduced export and pigment baking, run by the builder."""
pix={}
for key,m in M.items():
 file=H/(key+'-albedo.png')
 if file.exists():
  im=bpy.data.images.load(str(file));W,T=im.size;pix[m.name]=(W,T,np.array(im.pixels[:]).reshape(T,W,4))
for o in objects:
 me=o.data;vc=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');bc=me.color_attributes.new(name='BakedPigment',type='FLOAT_COLOR',domain='POINT');cols=np.zeros((len(me.vertices),3));cnt=np.zeros(len(me.vertices));uv=me.uv_layers.active
 for f in me.polygons:
  ma=me.materials[f.material_index]
  for li in f.loop_indices:
   vi=me.loops[li].vertex_index
   if ma.name in pix:
    W,T,pp=pix[ma.name];u,v=uv.data[li].uv;rgb=pp[min(T-1,int((v%1)*(T-1))),min(W-1,int((u%1)*(W-1))),:3];rgb=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
   else:rgb=np.array(ma.diffuse_color[:3])
   cols[vi]+=rgb;cnt[vi]+=1
 for i in range(len(me.vertices)):vc.data[i].color=(1,1,1,1);bc.data[i].color=(*np.clip(cols[i]/max(1,cnt[i]),0,1),1)
bpy.ops.wm.save_as_mainfile(filepath=str(L/'eldredgeops-v2.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment'if '.lod1.'in path.name else'Color',export_all_vertex_colors=False,export_extras=True,export_yup=True)
export(O/'eldredgeops.glb')
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
meta={'id':'eldredgeops','name':'Eldredgeops','species':'Eldredgeops rana','provenance':'Middle Devonian, Givetian Hamilton Group, northeastern North America','description':'Rounded, tuberculate phacopid trilobite with seventeen-file schizochroal compound eyes, eleven articulated thoracic tergites and a ribbed pygidium. Ventral biramous limbs and antennae are comparative soft-part reconstruction.','lengthMeters':.06,'modelLength':3.70,'locomotion':'Crawl','clips':list(CLIPS),'looping':LOOPS,'anchors':[a[0]for a in anchors],'artVersion':2,'artStatus':'preview','refinementNeeded':['Exact enrollment coaptation remains incomplete; the rolling animation is a defensive flexion preview, not a verified closed enrolled shell.','Extended action playback and detailed appendage collision refinement are deferred under the preview-first production priority.'],'sources':['https://devonianatlas.org/species/eldredgeops-rana/','https://doi.org/10.1016/j.asd.2006.08.002','https://doi.org/10.1111/j.1502-3931.2009.00205.x','https://doi.org/10.1002/spp2.1401'],'notes':['Shell uses E. rana sensu Eldredge1972, not E. milleri or spiny Moroccan phacopids.','Three cephalic post-antennal pairs, eleven thoracic pairs and four pygidial pairs are a comparative reconstruction; exact E. rana appendage anatomy and living pigmentation are uncertain.','Individual calcite lens solids are seated in continuous anatomical ocular platforms. Eye volume reports test each lens, not only aggregate eye volume.','All rigid shells move by joints. Growth is an unscaled compatibility posture; Moult is a separate preparation/withdrawal gesture. Swim is a plausible limb-powered compatibility action, not a claim of habitual pelagic swimming.','Representative 6cm shell length is illustrative, not a species maximum. Antennae extend the exported bounds.']}
(O/'eldredgeops.json').write_text(json.dumps(meta,indent=2)+'\n');(H/'anchors.json').write_text(json.dumps({'eldredgeops':[{'name':n,'bone':b,'point':list(p),'role':r}for n,b,p,r in anchors]},indent=2)+'\n');(H/'audit-selectors.json').write_text(json.dumps({'eldredgeops':{'headMesh':'cephalon_continuous_closed','eyeMeshes':['ocular_volume_L','ocular_volume_R']}},indent=2)+'\n');print('ELDREDGEOPS_CANDIDATES_EXPORTED',flush=True)
