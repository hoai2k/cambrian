import bpy, os, sys
base=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../../../expansion-authoring/jellies'))
for id in ['burgessomedusa','ctenorhabdotus','cambroraster','tamisiocaris']:
 bpy.ops.wm.open_mainfile(filepath=os.path.join(base,id+'.blend'));scene=bpy.context.scene;scene.render.resolution_x=650;scene.render.resolution_y=550;scene.cycles.samples=12;scene.render.film_transparent=False
 rig=bpy.data.objects[id+'_rig']
 for clip,frame in [('Swim',18),('Heavy',15),('Ability',9)]:
  rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(frame);scene.render.filepath=os.path.join(base,id+'-'+clip+'.png');bpy.ops.render.render(write_still=True)
