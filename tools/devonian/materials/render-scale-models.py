"""Actual bind-pose orthographic clay LODs with mathematically calibrated framing."""
from pathlib import Path
import bpy,json,hashlib,sys,math
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[3];LOCAL=ROOT.parent/'devonian-authoring/scale-reference';OUT=LOCAL/'renders';OUT.mkdir(parents=True,exist_ok=True)
RENDERER_SHA=hashlib.sha256(Path(__file__).read_bytes()).hexdigest();IDS=sys.argv[sys.argv.index('--')+1:]if'--'in sys.argv else json.loads((ROOT/'tools/devonian/shipped.json').read_text())['creatures']
TOP={'gemuendina','doryaspis','bothriolepis','eldredgeops','walliserops','jaekelopterus','furcaster','palaeoisopus','tiktaalik','acanthostega'}
WIDTH,HEIGHT=1200,700
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for ident in IDS:
 source=LOCAL/'decoded'/(ident+'.glb');recordpath=OUT/(ident+'.json');decoded=json.loads(source.with_suffix('.json').read_text());metadataPath=ROOT/'public/assets/devonian/creatures'/(ident+'.json');metadata=json.loads(metadataPath.read_text());cache={'decodedSHA256':sha(source),'metadataSHA256':sha(metadataPath),'rendererSHA256':RENDERER_SHA,'sourcePublicSHA256':decoded['sourceSHA256']}
 assert cache['decodedSHA256']==decoded['decodedSHA256'];assert cache['metadataSHA256']==decoded['metadataSHA256']
 if recordpath.exists():
  old=json.loads(recordpath.read_text())
  if all(old.get(k)==v for k,v in cache.items())and (OUT/(ident+'.png')).exists()and old.get('imageSHA256')==sha(OUT/(ident+'.png')):continue
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source));scene=bpy.context.scene
 # glTF importer creates a material-less Icosphere for bone display. Its bounds
 # must never enter camera framing. Select only named source model mesh nodes.
 sourceNames=set(decoded['modelNodes']);meshes=[o for o in scene.objects if o.type=='MESH'and o.name in sourceNames];assert len(meshes)==len(sourceNames),(ident,sourceNames-set(o.name for o in meshes))
 for o in scene.objects:
  if o.animation_data:o.animation_data_clear()
  if o.type=='ARMATURE':
   for bone in o.pose.bones:bone.matrix_basis.identity()
  elif o.type=='MESH'and o not in meshes:o.hide_render=True
 scene.frame_set(0);bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();points=[]
 for o in meshes:
  ev=o.evaluated_get(deps);me=ev.to_mesh();points.extend(ev.matrix_world@v.co for v in me.vertices);ev.to_mesh_clear()
 low=Vector([min(p[i]for p in points)for i in range(3)]);high=Vector([max(p[i]for p in points)for i in range(3)]);center=(low+high)/2;size=high-low
 # Consistent neutral model clay; retain darkness only for explicitly eye-named
 # materials. This is a size reference, not a claim about fossil pigmentation.
 clay=bpy.data.materials.new('Scale reference neutral clay');clay.use_nodes=True;bs=clay.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.30,.36,.35,1);bs.inputs['Roughness'].default_value=.68
 eye=bpy.data.materials.new('Scale reference semantic eyes');eye.use_nodes=True;eye.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.012,.019,.020,1);eye.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.35;eyeMaterials=[]
 for o in meshes:
  for i,m in enumerate(o.data.materials):
   dark=m and 'eye'in m.name.lower()
   if dark:eyeMaterials.append(m.name)
   o.data.materials[i]=eye if dark else clay
 camera=bpy.data.objects.new('Scale_camera',bpy.data.cameras.new('Scale_camera'));scene.collection.objects.link(camera);dorsal=ident in TOP;direction=Vector((0,0,1)if dorsal else(1,0,0));camera.location=center+direction*max(size)*3
 # Camera right is +Y (forward -Y appears at image left) in BOTH views.
 # The dorsal camera up is -X; lateral up is +Z. Explicit orthonormal bases
 # avoid to_track_quat's unexpected roll when track and world-up are parallel.
 right=Vector((0,1,0));up=Vector((-1,0,0)if dorsal else(0,0,1));camera.rotation_euler=Matrix((right,up,direction)).transposed().to_euler();camera.data.type='ORTHO'
 vertical=size.x if dorsal else size.z;camera.data.ortho_scale=max(size.y,vertical*12/7)*1.12;scene.camera=camera
 # Supply native pixels for large figures on the 600px/m main comparison.
 requiredWidth=camera.data.ortho_scale*metadata['lengthMeters']/metadata['modelLength']*600
 WIDTH=64*math.ceil(max(1200,requiredWidth)/64);HEIGHT=round(WIDTH*7/12)
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=4;scene.cycles.max_bounces=4;scene.cycles.use_denoising=True;scene.render.resolution_x=WIDTH;scene.render.resolution_y=HEIGHT;scene.render.resolution_percentage=100
 for label,offset,power in [('Key',(3,-2,4),800),('Fill',(-3,-1,2),500),('Rim',(1,3,3),600)]:
  lamp=bpy.data.objects.new(label,bpy.data.lights.new(label,'AREA'));scene.collection.objects.link(lamp);lamp.location=center+Vector(offset)*max(size)/3;lamp.rotation_euler=(center-lamp.location).to_track_quat('-Z','Y').to_euler();lamp.data.energy=power*(max(size)/4)**2;lamp.data.shape='DISK';lamp.data.size=max(size)*1.3
 scene.world=bpy.data.worlds.new('Neutral');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.3,.3,.3,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.view_settings.view_transform='AgX';scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.filepath=str(OUT/(ident+'.png'));bpy.ops.render.render(write_still=True)
 modelLength=metadata['modelLength'];metersPerUnit=metadata['lengthMeters']/modelLength;projectedSpanMeters=size.y*metersPerUnit
 record={'id':ident,**cache,'sourcePublicModel':decoded['sourcePath'],'sourcePublicSHA256':decoded['sourceSHA256'],'imageSHA256':sha(OUT/(ident+'.png')),'view':'dorsal'if dorsal else'lateral','pose':'bind pose; all imported animation cleared','renderStyle':'neutral clay; explicitly eye-named materials dark','semanticEyeMaterials':sorted(set(eyeMaterials)),'sourceMeshNodes':sorted(sourceNames),'modelExtents':list(size),'horizontalModelUnits':camera.data.ortho_scale,'renderWidth':WIDTH,'renderHeight':HEIGHT,'cameraRight':list(right),'cameraUp':list(up),'representativeLengthMeters':metadata['lengthMeters'],'sourceModelLength':modelLength,'metersPerModelUnit':metersPerUnit,'horizontalMetersPerPixel':camera.data.ortho_scale*metersPerUnit/WIDTH,'projectedLongitudinalSpanMeters':projectedSpanMeters,'lodToMetadataLengthRatio':size.y/modelLength,'name':metadata['name'],'species':metadata['species'],'provenance':metadata['provenance'],'notes':metadata.get('notes',[]),'sourceURLs':metadata.get('sources',[]),'note':'Metadata supplies representative reconstructed extent, not maximum. The original scalar applies uniformly to every dimension; radial/long-appendage forms inherit the metadata extent convention. Mixed localities and ages are not a co-occurrence reconstruction.'}
 recordpath.write_text(json.dumps(record,indent=2)+'\n');print('SCALE VIEW',ident,'length ratio',size.y/modelLength,flush=True)
