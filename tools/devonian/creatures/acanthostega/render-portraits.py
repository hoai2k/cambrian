"""Regenerate the four matching portraits from the frozen local Acanthostega initial preview source."""
import bpy,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));root=os.path.abspath(os.path.join(here,'../../../..'));local=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(root,'../devonian-authoring/acanthostega')));out=os.path.join(local,'v1-candidate')
bpy.ops.wm.open_mainfile(filepath=os.path.join(local,'acanthostega-v1.blend'));scene=bpy.context.scene;cam=scene.camera;rig=bpy.data.objects['acanthostega_rig'];rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);cam.location=(7,-6,6);cam.rotation_euler=(Vector((0,1.1,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=8.7;scene.cycles.samples=24
for suffix,w,h,transparent in [('.select',1600,1200,True),('.card',800,600,True),('.thumb',256,192,True),('',1200,900,False)]:
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=os.path.join(out,'acanthostega'+suffix+'.png');bpy.ops.render.render(write_still=True)
