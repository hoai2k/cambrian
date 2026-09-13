import bpy,json,sys,math
from pathlib import Path
from mathutils import Vector
P=Path.cwd();HERE=P/'tools/triassic/creatures/shonisaurus';LOCAL=P/'local/triassic-authoring/shonisaurus';R=LOCAL/'review';R.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(LOCAL/'shonisaurus.shared-rig.blend'))
scene=bpy.context.scene;rig=next(o for o in scene.objects if o.type=='ARMATURE');allmesh=[o for o in scene.objects if o.type=='MESH'];scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Review studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.14,.16,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
center=Vector((0,0,.05))
for name,loc,energy,size,color in [('key',(5,-5,8),2400,7,(1,.93,.86)),('fill',(-5,-2,3),1800,6,(.65,.83,1)),('rim',(1,6,5),2200,5,(.75,.9,1))]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.size=size;o.data.color=color;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';scene.view_settings.view_transform='AgX'
def render(kind,clip,t,view,name,w=900,h=600,transparent=False):
 for o in allmesh:o.hide_render=(o.name.startswith('Puppet') if kind=='full' else o.name.startswith('Shonisaurus authored'))
 rig.animation_data.action=bpy.data.actions.get(clip);last=rig.animation_data.action.frame_range[1];scene.frame_set(int(last*t));scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent
 target=Vector((0,0,.02));pos={'side':(10,0,1),'top':(0,0,12),'hero':(8,-9,5),'mouth':(5,-2.3,.1),'front':(0,-12,1.4)}[view]
 if view=='mouth':target=Vector((0,-2.4,0));scale=2.4
 elif view=='top':scale=7.2
 else:scale=7.3
 cam.location=Vector(pos);cam.data.ortho_scale=scale;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();
 if view=='top':cam.rotation_euler.z+=math.pi/2
 scene.render.filepath=str(R/(name+'.png'));bpy.ops.render.render(write_still=True)
if '--mouth-only' in sys.argv:
 for kind in ['full','puppet']:
  for clip in ['Idle','Swim','Sprint','Ability','Death','Heavy','Eat']:
   for t in ([0,.25,.5,.75]if clip in ['Heavy','Eat']else[.5]):render(kind,clip,t,'mouth',kind+'-closed-'+clip+'-'+str(t),900,600)
 sys.exit(0)
for kind in ['full','puppet']:
 for view in ['side','top','front','hero']:render(kind,'Idle',0,view,kind+'-'+view)
 for clip in ['Swim','Sprint','Heavy','Dodge','Death']:
  for t in [.25,.5,.75]:render(kind,clip,t,'side',kind+'-'+clip+'-'+str(t),700,450)
 for t in [0,.25,.5]:render(kind,'Heavy',t,'mouth',kind+'-mouth-'+str(t))
render('full','TurnLeft',.24,'hero','portrait',1600,1200,True)
render('full','Idle',.05,'hero','studio',1200,900,False)
render('puppet','TurnLeft',.24,'hero','puppet-portrait',1600,1200,True)
