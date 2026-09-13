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
bpy.ops.wm.save_as_mainfile(filepath=str(L/'furcaster.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment'if '.lod1.'in path.name else'Color',export_all_vertex_colors=False,export_extras=True,export_yup=True)
export(O/'furcaster.glb')
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
 if ac.name not in ['Idle','Swim','Crawl','Death']:bpy.data.actions.remove(ac)
export(O/'furcaster.lod1.glb')
meta={'id':'furcaster','name':'Furcaster','species':'Furcaster palaeozoicus','provenance':'Early Devonian, lower Emsian Hunsrück Slate, Germany','description':'Five long articulated arms surround a small granular disc. Opposing paired ambulacrals and curved lateral arm ossicles inform arm-powered motion, with delicate lateral and groove spines and a modeled oral underside.','lengthMeters':.12,'modelLength':6.0,'locomotion':'Crawl','clips':list(CLIPS),'looping':LOOPS,'anchors':[a[0]for a in anchors],'artVersion':1,'artStatus':'preview','sources':['https://doi.org/10.1098/rsos.201380','https://doi.org/10.1017/jpa.2025.10096'],'eyes':{'applicable':False,'reason':'No macroscopic paired eye globes reconstructed for this ophiuroid.'},'refinementNeeded':['Detailed disc/arm junction sculpting and complete multi-arm collision/transition refinement remain preview work.','Exact spine posture, podial dimensions, oral frame and disc plate layout are comparative interpretations, not directly resolved from the selected arm CT.'],'notes':['Primary fossil arm reference OKL96, Clark et al.2020 Fig3c. Five chains with36 articulated sections each are an authored reconstruction rather than a measured segment count.','No vertebrate jaw or trilobite moulting action. Five radial mouth-angle structures and a soft oral pump participate in feeding.','Swim is a compatibility arm-sculling interpretation, not a claim of habitual swimming. Growth is unscaled.','Representative12cm overall span is illustrative, not a species maximum; modelLength measures +Z bound of initial arm spread.','Pigmentation is artistic; source and imagegen provenance preserved.']}
(O/'furcaster.json').write_text(json.dumps(meta,indent=2)+'\n');(H/'anchors.json').write_text(json.dumps({'furcaster':[{'name':n,'bone':b,'point':list(p),'role':r}for n,b,p,r in anchors]},indent=2)+'\n');print('FURCASTER_CANDIDATES_EXPORTED',flush=True)
