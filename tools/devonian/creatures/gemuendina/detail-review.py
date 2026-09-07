"""Additional anatomy views of the saved original; does not edit exported models."""
import bpy,os
from mathutils import Vector
here=os.path.dirname(os.path.abspath(__file__));root=os.path.abspath(os.path.join(here,'../../../..'))
local=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(root,'../devonian-authoring/gemuendina')))
bpy.ops.wm.open_mainfile(filepath=os.path.join(local,'gemuendina.blend'))
scene=bpy.context.scene;cam=scene.camera;rig=bpy.data.objects['gemuendina_rig'];rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.film_transparent=False;scene.cycles.samples=16
for name,position,target,scale in [('dorsal',(0,.8,10),(0,.8,0),7.4),('mouth-armour',(2,-4,5),(0,-1.1,.12),1.65),('ventral',(0,.8,-10),(0,.8,0),7.4)]:
 if os.environ.get('DEVONIAN_REVIEW_ONLY') and name not in os.environ['DEVONIAN_REVIEW_ONLY'].split(','):continue
 cam.location=position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=os.path.join(local,name+'.png');bpy.ops.render.render(write_still=True)
