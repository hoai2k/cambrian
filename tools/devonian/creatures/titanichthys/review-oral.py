"""Additional inspection-only illumination for the real rigged oral geometry."""
import bpy,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));root=os.path.abspath(os.path.join(here,'../../../..'));local=os.path.abspath(os.path.join(root,'../devonian-authoring/titanichthys'))
bpy.ops.wm.open_mainfile(filepath=os.path.join(local,'titanichthys.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['titanichthys_rig'];rig.animation_data.action=bpy.data.actions['Ability'];scene.frame_set(36)
cam=scene.camera;cam.location=(.8,-6.8,-.25);cam.rotation_euler=(Vector((0,-2.10,-.04))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=2.8
for name,position,power in [('Inspection aperture lamp',(0,-3.1,-.1),45),('Inspection cavity lamp',(0,-2.11,-.05),4)]:
 data=bpy.data.lights.new(name,'POINT');data.energy=power;data.shadow_soft_size=.22;obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position
scene.render.resolution_x=1400;scene.render.resolution_y=1050;scene.render.film_transparent=False;scene.cycles.samples=48;scene.render.filepath=os.path.join(local,'v2-oral-inspection.png');bpy.ops.render.render(write_still=True)
