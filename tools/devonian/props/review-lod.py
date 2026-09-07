"""Render representative LODs and animated poses to local review files only."""
import bpy,sys,importlib.util,os
os.environ.setdefault("DEVONIAN_PROP_SAMPLES","8")
from pathlib import Path
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('devonian_scenery_builder',HERE/'build.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
PUBLIC=module.OUT;module.OUT=module.LOCAL/'lod-reviews';module.OUT.mkdir(exist_ok=True)
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['stalked-crinoid','bryozoan-colony','cladoxylopsid-tree','archaeopteris']
for id in ids:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(PUBLIC/(id+'.lod1.glb')))
 bpy.context.scene.frame_set(31);bpy.context.view_layer.update();meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 module.LOCAL=module.OUT;(module.LOCAL/id).mkdir(exist_ok=True)
 module.render(id,meshes)
