import bpy,json,math
from mathutils import Vector
from pathlib import Path
P=Path.cwd(); O=P/'local/triassic-authoring/shonisaurus/review'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(P/'intake/triassic-tests/shonisaurus/shonisaurus.raw.glb'))
obs=[o for o in bpy.context.scene.objects if o.type=='MESH']; print('MESHES',[(o.name,len(o.data.vertices),len(o.data.polygons),[list(o.matrix_world@Vector(c)) for c in o.bound_box])for o in obs])
for o in obs: print('MATS',[(m.name,[(n.type,n.image.name if n.type=='TEX_IMAGE' and n.image else '')for n in m.node_tree.nodes])for m in o.data.materials])
vs=[o.matrix_world@v.co for o in obs for v in o.data.vertices]; lo=Vector([min(v[i]for v in vs)for i in range(3)]);hi=Vector([max(v[i]for v in vs)for i in range(3)]);center=(lo+hi)/2;dim=hi-lo
print('BOUNDS',list(lo),list(hi))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.18,.18,1)
for pos,power,size in [((1,-2,3),160,4),((-2,0,1),100,3)]:
 bpy.ops.object.light_add(type='AREA',location=center+Vector(pos)*max(dim));bpy.context.object.data.energy=power*max(dim)**2;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=size*max(dim);bpy.context.object.rotation_euler=(center-bpy.context.object.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=max(dim)*1.2
for name,pos in [('side',(1,0,.15)),('top',(0,0,1)),('front',(0,-1,.1))]:
 cam.location=center+Vector(pos)*max(dim)*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(O/(name+'.png'));bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(O/'raw-inspection.blend'))
