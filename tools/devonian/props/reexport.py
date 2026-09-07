"""Re-export saved high-detail sources without rerendering; preserves authored pigmentation."""
import bpy,sys,importlib.util,json
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('props_builder',HERE/'build.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
manifest=json.loads((m.OUT/'manifest.json').read_text())
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
for prop in manifest['props']:
 id=prop['id']
 if ids and id not in ids:continue
 print('REEXPORT',id,flush=True)
 bpy.ops.wm.open_mainfile(filepath=str(m.LOCAL/id/(id+'.blend')))
 obj=bpy.data.objects[id];rig=bpy.data.objects.get(id+'_rig');bpy.context.scene.frame_set(1);bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
 if id.startswith(('archaeopteris','cladoxylopsid-tree')):
  modifier=obj.modifiers.new('Game_detail_optimization','DECIMATE');modifier.ratio=.25 if id.startswith('archaeopteris') else .40;bpy.ops.object.modifier_apply(modifier=modifier.name);obj.data.validate(clean_customdata=False);obj.data.update()
 m.export(id,obj,rig)
 full=sum(len(p.vertices)-2 for p in obj.data.polygons)
 bpy.context.view_layer.objects.active=obj;modifier=obj.modifiers.new('Genuine_LOD_reduction','DECIMATE');modifier.ratio=.30;bpy.ops.object.modifier_apply(modifier=modifier.name);obj.data.validate(clean_customdata=False);obj.data.update();reduced=sum(len(p.vertices)-2 for p in obj.data.polygons)
 m.export(id,obj,rig,True)
 prop.update(fullTriangles=full,lodTriangles=reduced,lodRatio=reduced/full)
 (m.OUT/(id+'.json')).write_text(json.dumps(prop,indent=2)+'\n')
print('DONE',flush=True)
