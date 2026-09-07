"""Rerender the review peaks from the preserved authored Blender model."""
import bpy,os
from mathutils import Vector
from pathlib import Path
here=Path(__file__).resolve().parent
root=here.parents[3]
local=Path(os.environ.get('DEVONIAN_AUTHORING',str(root.parent/'devonian-authoring/cladoselache')))
bpy.ops.wm.open_mainfile(filepath=str(local/'cladoselache.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['cladoselache_rig'];cam=scene.camera
for clip,frame,view in [('Eat',6,'front'),('Heavy',7,'threequarter'),('Ability',27,'front'),('Bite',8,'front')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame)
 cam.location=(0,-10,1)if view=='front'else(7,-6,4.2)
 cam.rotation_euler=(Vector((0,.65,0))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.resolution_x=900;scene.render.resolution_y=675;scene.render.film_transparent=False
 scene.render.filepath=str(local/(clip+'-'+view+'.png'));bpy.ops.render.render(write_still=True)
