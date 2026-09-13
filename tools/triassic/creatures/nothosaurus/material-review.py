"""Controlled identical-light source/processed material comparison."""
import bpy,math,json,os,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[4];LOCAL=ROOT/'local/triassic-authoring/nothosaurus';OUT=LOCAL/'material-fix';OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
RAW=ROOT/'tools/triassic/creatures/nothosaurus/tripo-raw/nothosaurus.raw.glb'
if not RAW.exists():RAW=ROOT/'intake/triassic-tests/nothosaurus/nothosaurus.raw.glb'
bpy.ops.import_scene.gltf(filepath=str(RAW));raw=next(o for o in bpy.context.scene.objects if o.type=='MESH');raw.rotation_mode='XYZ';raw.rotation_euler.z=-math.pi/2;raw.scale=(5,5,5);sourceMat=raw.data.materials[0];raw.name='original Tripo'
originals=set(bpy.context.scene.objects);bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(OUT/'before/nothosaurus.unpacked.glb'));imported=[o for o in bpy.context.scene.objects if o not in originals];meshes=[o for o in imported if o.type=='MESH'];rig=next(o for o in imported if o.type=='ARMATURE')
for tr in rig.animation_data.nla_tracks:tr.mute=True
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_quaternion=(1,0,0,0);pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1100;s.render.resolution_y=825;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.film_transparent=True;s.view_settings.view_transform='AgX';s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
for loc,power in [((3,-5,5),1000),((-3,-1,3),600),((0,4,4),1100),((0,-5,-2),230)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=5;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=6.8;cam.location=(7,-5,4.2);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler()
def render(name):
 if '--source-corrected-only' in sys.argv and name!='07-original-matte-normal-015':return
 s.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
for o in meshes:o.hide_render=True
render('01-original-tripo')
raw.hide_render=True
for o in meshes:o.hide_render=False
render('02-current-processed')
body=[o for o in meshes if any(m.name.startswith('Nothosaurus body pigmentation')for m in o.data.materials)]
for o in body:o.data.materials[0]=sourceMat
render('03-source-material-on-processed')
for n in sourceMat.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=0
render('04-source-material-no-normal')
for n in sourceMat.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.3
render('05-source-material-normal-030')
bs=sourceMat.node_tree.nodes.get('Principled BSDF')
for link in list(sourceMat.node_tree.links):
 if link.to_node==bs and link.to_socket.name in ['Metallic','Roughness']:sourceMat.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.7
for n in sourceMat.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.15
render('06-source-albedo-matte-normal-015')
raw.hide_render=False
for o in meshes:o.hide_render=True
render('07-original-matte-normal-015')
# Image pixels are recorded beside the actual extracted encoded PNG for gamma verification.
colnode=next(n for n in sourceMat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.colorspace_settings.name=='sRGB');im=colnode.image;im.filepath_raw=str(OUT/'source-albedo.png');im.file_format='PNG';im.save()
pixels=list(im.pixels);samples=[]
for x,y in [(400,400),(1000,1000),(1700,900)]:
 i=(y*im.size[0]+x)*4;samples.append({'x':x,'y':y,'blender':pixels[i:i+3]})
(OUT/'pixel-samples.json').write_text(json.dumps(samples,indent=2))
