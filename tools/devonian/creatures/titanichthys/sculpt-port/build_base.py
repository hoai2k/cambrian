"""Geometry-only rebuild proof: build_clay04.py's own construction (unedited), exported as a bare
GLB (no rig/materials needed -- `npm run sculpt:measure` only reads POSITION). Confirms this is
the right builder/frame before any nose edit is made.

    /opt/blender/blender --background --python tools/devonian/creatures/titanichthys/sculpt-port/build_base.py
"""
import bpy
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import geometry

OUT = Path('/home/user/devonian-authoring/titanichthys/sculpt-base')
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)

result = geometry.build(nose_edit=False)
meshes = result['meshes']

bpy.ops.object.select_all(action='DESELECT')
for ob in meshes:
    ob.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.export_scene.gltf(filepath=str(OUT / 'titanichthys.glb'), export_format='GLB',
                           use_selection=True, export_animations=False, export_skins=False,
                           export_materials='NONE', export_yup=True)
print('TITANICHTHYS_SCULPT_BASE_OK', str(OUT / 'titanichthys.glb'))
