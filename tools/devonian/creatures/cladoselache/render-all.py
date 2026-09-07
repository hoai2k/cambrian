"""Recreate all matching portraits and pose reviews from the preserved model."""
import bpy,os,json
from mathutils import Vector
from pathlib import Path
here=Path(__file__).resolve().parent;root=here.parents[3]
LOCAL=os.environ.get('DEVONIAN_AUTHORING',str(root.parent/'devonian-authoring/cladoselache'));OUT=str(root/'public/assets/devonian/creatures');ID='cladoselache'
CLIPS=json.loads((here/'validation.json').read_text())['clips']
bpy.ops.wm.open_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'));scene=bpy.context.scene;rig=bpy.data.objects[ID+'_rig'];cam=scene.camera
if 'Lower bounce'not in bpy.data.objects:
 d=bpy.data.lights.new('Lower bounce','AREA');d.energy=500;d.shape='DISK';d.size=6;d.color=(.58,.78,.91)
 o=bpy.data.objects.new('Lower bounce',d);bpy.context.collection.objects.link(o);o.location=(-2,2,-4);o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
cam.location=(7,-6,4.2);cam.rotation_euler=(Vector((0,.65,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.125,'front'),('Bite',.5,'side'),('Heavy',.20,'threequarter'),('Ability',.38,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,1.2),'front':(0,-10,1),'threequarter':(7,-6,4.2)}[view];cam.rotation_euler=(Vector((0,.65,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
