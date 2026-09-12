"""Candidate-only full/reduced export and pigment baking, run by the builder."""
pix={}
for key,m in M.items():
 file=H/(key+'-albedo.png')
 if file.exists():
  im=bpy.data.images.load(str(file),check_existing=False);im.colorspace_settings.name='Non-Color';W,T=im.size;pix[m.name]=(W,T,np.array(im.pixels[:]).reshape(T,W,4));bpy.data.images.remove(im)
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
bpy.ops.wm.save_as_mainfile(filepath=str(L/'michelinoceras.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment'if '.lod1.'in path.name else'Color',export_all_vertex_colors=False,export_extras=True,export_yup=True)
export(O/'michelinoceras.glb')
# Preserve independent lens solids and their auditability; simplify every larger anatomical surface.
for o in objects:
 if len(o.data.polygons)>150:
  d=o.modifiers.new('Actual reduced distant geometry','DECIMATE');d.ratio=.26;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
 if len(o.data.materials)>1:
  first=o.data.materials[0];o.data.materials.clear();o.data.materials.append(first)
  for f in o.data.polygons:f.material_index=0
for m in M.values():
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for li in list(nt.links):
  if li.to_node==bs:nt.links.remove(li)
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='BakedPigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for ac in list(bpy.data.actions):
 if ac.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(ac)
export(O/'michelinoceras.lod1.glb')
meta={'id':'michelinoceras','name':'Michelinoceras','species':'Michelinoceras currens','provenance':'Lower Devonian, southwestern Sardinia; shell reference Modena19380, Gnoli1982 Plate2Fig1','description':'Smooth narrow orthoconic shell with simple chambered interior, subcentral siphuncle and an editable conservative cephalopod soft body. Ten tapering arms surround a modeled oral recess; a lined ventral funnel and recessed eyes fit inside the shell aperture.','lengthMeters':.5,'modelLength':6.3,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a[0]for a in anchors],'artVersion':1,'artStatus':'preview','sources':['https://www.paleoitalia.it/wp-content/uploads/2023/06/05_Gnoli.pdf','https://www.app.pan.pl/archive/published/app50/app50-329.pdf','https://pmc.ncbi.nlm.nih.gov/articles/PMC8288114/'],'eyes':{'headMesh':'head_continuous_closed','eyeMeshes':['eye_globe_L','eye_globe_R'],'interpretation':'Paired eyes are comparative soft-part reconstruction, not preserved in selected specimen.'},'refinementNeeded':['Exact arm-root surface fusion, adhesive-fold details and action-transition/self-contact refinement are pending.','Whole adult size, living chamber, arm count, eyes, jaws, funnel and pigment are comparative/artistic reconstructions, not direct observations of the fragmentary reference.'],'notes':['Vetted M.currens shell reference: circular section, near7degree expansion, smooth exterior. Internal septa remain inside intact conch.','Model .5m representative is a project working value; the best described fragment is28mm, not a complete animal.','Rigid shell weighted entirely to body; separate head retraction, ten arm chains, two corneous jaw bones and funnel motion.','Forward-aligned bind pose meets runtime convention and does not claim horizontal living trim. Ability/Dodge interpret shell-stable jet escape; Growth does not scale shell.','No squid fins, sucker discs, differentiated long capture clubs or invented closure operculum.']}
(O/'michelinoceras.json').write_text(json.dumps(meta,indent=2)+'\n');(H/'anchors.json').write_text(json.dumps({'michelinoceras':[{'name':n,'bone':b,'point':list(p),'role':r}for n,b,p,r in anchors]},indent=2)+'\n');print('MICHELINOCERAS_CANDIDATES_EXPORTED',flush=True)
