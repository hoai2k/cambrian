"""Render specimen action evidence from editable .blend sources; no GLB mutation."""
import bpy,os
import numpy as np
from mathutils import Vector
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
AUTHOR=os.environ.get('CAMBRIAN_SOFT_AUTHOR',os.path.abspath(os.path.join(ROOT,'../expansion-authoring/soft')))
shots=[('pikaia','Swim',.5),('nectocaris','Grab',.5),('nectocaris','Swim',.35),('ottoia','Heavy',.55),('ottoia','Ability',.5),('odontogriphus','Crawl',.5),('vetulicola','Swim',.5)]
for id,clip,phase in shots:
 bpy.ops.wm.open_mainfile(filepath=os.path.join(AUTHOR,id+'.blend'))
 scene=bpy.context.scene;rig=bpy.data.objects[id+'_rig'];action=bpy.data.actions[clip];rig.animation_data.action=action
 start,end=action.frame_range;f=start+(end-start)*phase;scene.frame_set(int(f),subframe=f%1)
 scene.render.resolution_x=960;scene.render.resolution_y=720;scene.cycles.samples=24
 if id=='pikaia':
  scene.camera.location=(5,-2,7);scene.camera.rotation_euler=(-scene.camera.location).to_track_quat('-Z','Y').to_euler()
 dg=bpy.context.evaluated_depsgraph_get();obj=bpy.data.objects[id].evaluated_get(dg);me=obj.to_mesh();points=np.array([tuple(obj.matrix_world@v.co)for v in me.vertices]);obj.to_mesh_clear()
 center=Vector((points.min(0)+points.max(0))*.5);direction=scene.camera.location.normalized();scene.camera.location=center+direction*8;scene.camera.rotation_euler=(center-scene.camera.location).to_track_quat('-Z','Y').to_euler()
 inv=scene.camera.rotation_euler.to_matrix().transposed();proj=np.array([tuple(inv@Vector(p))for p in points]);extent=proj.max(0)-proj.min(0);scene.camera.data.ortho_scale=max(extent[0],extent[1]*scene.render.resolution_x/scene.render.resolution_y)*1.16
 scene.render.filepath=os.path.join(AUTHOR,id+'-'+clip+'.png');bpy.ops.render.render(write_still=True)
