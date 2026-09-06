"""Real geometry LOD from editable sources, keeping rig, textures and every action."""
import bpy, bmesh, os, sys, json
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
LOCAL=os.environ.get('CAMBRIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../expansion-authoring/arthropods')))
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['odaraia','sidneyia','leanchoilia','isoxys']
for id in ids:
 bpy.ops.wm.open_mainfile(filepath=os.path.join(LOCAL,id+'.blend'))
 obj=bpy.data.objects[id];rig=next(o for o in bpy.data.objects if o.type=='ARMATURE');rig.animation_data.action=None;bpy.context.scene.frame_set(0)
 for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 before=len(obj.data.polygons)
 # Weld co-located sphere poles before QEM so shells retain their volume.
 bm=bmesh.new();bm.from_mesh(obj.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000001);bm.to_mesh(obj.data);bm.free()
 mod=obj.modifiers.new('Distant geometry','DECIMATE');mod.ratio=.50;mod.use_collapse_triangulate=True
 bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name);after=len(obj.data.polygons)
 assert after<before*.80,(id,before,after)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
 for part in list(bpy.context.selected_objects):bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=rig
 rig.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(ROOT,'public/assets/creatures',id+'.lod1.glb')
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True)
 p=os.path.join(LOCAL,id+'.json');r=json.load(open(p));r['lod']={'triangles':after,'originalTriangles':before,'ratio':after/before,'glbBytes':os.path.getsize(path),'allActions':True};open(p,'w').write(json.dumps(r,indent=2));print('LOD',id,before,after,flush=True)
