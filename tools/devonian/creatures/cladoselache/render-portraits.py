"""Regenerate the four matching portraits from the frozen local Cladoselache V2 source."""
import bpy,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));root=os.path.abspath(os.path.join(here,'../../../..'));local=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(root,'../devonian-authoring/cladoselache')));out=os.path.join(local,'v2-candidate')
bpy.ops.wm.open_mainfile(filepath=os.path.join(local,'cladoselache-v2.blend'));scene=bpy.context.scene;cam=scene.camera;rig=bpy.data.objects['cladoselache_rig'];rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);cam.location=(7,-6,4.2);cam.rotation_euler=(Vector((0,.65,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=6.7;scene.cycles.samples=32
for suffix,w,h,transparent in [('.select',1600,1200,True),('.card',800,600,True),('.thumb',256,192,True),('',1200,900,False)]:
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=os.path.join(out,'cladoselache'+suffix+'.png');bpy.ops.render.render(write_still=True)
