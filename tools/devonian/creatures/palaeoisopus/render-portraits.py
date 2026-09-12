"""Regenerate the four matching portraits from the frozen local Palaeoisopus initial preview source."""
import bpy,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));root=os.path.abspath(os.path.join(here,'../../../..'));local=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(root,'../devonian-authoring/palaeoisopus')));ANATOMY=os.environ.get('PAL_ANATOMY','v1');out=os.path.join(local,ANATOMY+'-candidate')
bpy.ops.wm.open_mainfile(filepath=os.path.join(local,'palaeoisopus-'+ANATOMY+'.blend'));scene=bpy.context.scene;cam=scene.camera;rig=bpy.data.objects['palaeoisopus_rig'];rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);cam.location=(7,-6,6);cam.rotation_euler=(Vector((0,.4,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=9.2;scene.cycles.samples=12
for suffix,w,h,transparent in [('.select',1600,1200,True),('.card',800,600,True),('.thumb',256,192,True),('',1200,900,False)]:
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=os.path.join(out,'palaeoisopus'+suffix+'.png');bpy.ops.render.render(write_still=True)
