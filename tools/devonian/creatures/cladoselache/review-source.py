"""Render local authoring model for anatomy inspection, without publishing candidates."""
import bpy,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));root=os.path.abspath(os.path.join(here,'../../../..'));local=os.path.abspath(os.path.join(root,'../devonian-authoring/cladoselache'));bpy.ops.wm.open_mainfile(filepath=os.path.join(local,'cladoselache-v2.blend'));scene=bpy.context.scene;cam=scene.camera;rig=bpy.data.objects['cladoselache_rig'];scene.render.resolution_x=1100;scene.render.resolution_y=825;scene.render.film_transparent=False;scene.cycles.samples=28
for name,pos,target,scale,clip,phase in [('draft',(6,-6,6.5),(0,.45,0),5.8,'Idle',0),('dorsal',(0,.7,9),(0,.7,0),6.8,'Idle',0),('front',(0,-8,2),(0,-.75,.03),4.3,'Idle',0),('side',(8,0,1),(0,.7,0),5.8,'Idle',0),('eye',(2.2,-2.4,.80),(.31,-1.69,.14),.95,'Idle',0),('oral',(.60,-3.7,.5),(0,-1.9,-.13),1.4,'Heavy',.30)]:
 if os.environ.get('CLADOSELACHE_SOURCE_DETAIL') and name not in ['eye','oral']:continue
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(rig.animation_data.action.frame_range[1]*phase));cam.location=pos;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=os.path.join(local,'v2-'+name+'.png');bpy.ops.render.render(write_still=True)
