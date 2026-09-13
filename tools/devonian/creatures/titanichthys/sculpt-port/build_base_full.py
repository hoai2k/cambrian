"""Full-parity base rebuild for the position-transplant tool: geometry.build(nose_edit=False),
the SAME eye-seat nudge and body material-region split as build_candidate.py (so the exported
primitive boundaries -- and hence vertex layout -- line up with the candidate's), and the SAME
per-mesh decimate ratios for a matching LOD1. No rig, no textures, no pigment: this file only
needs to carry positions in the same primitive shape as the candidate rebuild.

Reads (does not modify) this directory's geometry.py and rework-v3/rig_actions_01.py. Writes
into /home/user/devonian-authoring/titanichthys/sculpt-base/ (outside the repo). build_base.py
beside this is the bare geometry-only proof; this is the file the transplant needs.

    /opt/blender/blender --background --factory-startup \
        --python tools/devonian/creatures/titanichthys/sculpt-port/build_base_full.py
"""
import bpy
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REWORK = HERE.parent / 'rework-v3'
OUT = Path('/home/user/devonian-authoring/titanichthys/sculpt-base')
OUT.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(HERE))
sys.path.insert(0, str(REWORK))
import geometry
import rig_actions_01 as ra

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)

built = geometry.build(nose_edit=False)
body, eye_L, eye_R = built['body'], built['eye_L'], built['eye_R']
fins = built['fins']
meshes = built['meshes']

# Same inward eye-seat nudge build_candidate.py applies (unconditional on nose_edit): the shipped
# model's eyes sit .030 units deeper along each globe's own outward normal than geometry.build()'s
# raw placement, so the base must carry the same nudge to actually reproduce shipped positions.
from mathutils import Vector
EYE_SEAT_DEPTH = 0.030
for info, ob in ((e, eye_L if e['side'] == 'L' else eye_R) for e in built['eyes']):
    normal = Vector(info['normal'])
    ob.location = ob.location - normal * EYE_SEAT_DEPTH

def flat_material(mat_name, rgb, roughness=.5):
    m = bpy.data.materials.new(mat_name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = 0
    return m

# Colours are arbitrary here (this file is never rendered) -- only the material *count* and the
# per-polygon region split matter, since that split is what determines primitive boundaries at
# export, and it must match build_candidate.py's split exactly for base/candidate to be index-
# aligned per primitive.
body.data.materials.clear()
body.data.materials.append(flat_material('Titanichthys body', (.33, .35, .36), .55))
body.data.materials.append(flat_material('Titanichthys underside', (.28, .30, .31), .55))
body.data.materials.append(flat_material('Titanichthys oral accent', (.23, .25, .25), .7))

semantics = ra.body_semantics()
regions = [2 if region in ('oral', 'throat') else 1 if region in ('head', 'posterior') and math.sin(a) < -.43 else 0
           for region, t, a in semantics]
for poly in body.data.polygons:
    ids = [regions[i] for i in poly.vertices]
    poly.material_index = max(set(ids), key=ids.count)

eye_mat = flat_material('Titanichthys eyes', (.05, .09, .11), .25)
for ob in (eye_L, eye_R):
    ob.data.materials.clear()
    ob.data.materials.append(eye_mat)

FIN_FAMILY = {
    'Long pectoral L': 'fins-pectoral', 'Long pectoral R': 'fins-pectoral',
    'Pelvic L': 'fins-pelvic', 'Pelvic R': 'fins-pelvic',
    'Modest swept dorsal': 'fins-dorsal', 'Strong heterocercal caudal': 'fins-caudal',
}
fin_materials = {family: flat_material('Titanichthys ' + family, (.31, .39, .40), .5)
                 for family in set(FIN_FAMILY.values())}
for name, ob in fins.items():
    ob.data.materials.clear()
    ob.data.materials.append(fin_materials[FIN_FAMILY[name]])

scene = bpy.context.scene
parts = []
for source in meshes:
    ob = source.copy()
    ob.data = source.data.copy()
    scene.collection.objects.link(ob)
    ob.name = source.name + '_export'
    if ob.data.shape_keys:
        ob.shape_key_clear()
    parts.append(ob)


def select_export():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]


kwargs = dict(export_format='GLB', use_selection=True, export_animations=False, export_skins=False,
              export_normals=True, export_tangents=False, export_texcoords=True,
              export_materials='EXPORT', export_yup=True, export_morph=False)
select_export()
bpy.ops.export_scene.gltf(filepath=str(OUT / 'titanichthys.glb'), **kwargs)
print('TITANICHTHYS_BASE_FULL_OK', str(OUT / 'titanichthys.glb'))

fulltris = sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in parts)
for ob, source in zip(parts, meshes):
    bpy.context.view_layer.objects.active = ob
    dec = ob.modifiers.new('Titanichthys base LOD', 'DECIMATE')
    dec.ratio = .26 if source is body else .66 if 'eye' in source.name.lower() else .22
    bpy.ops.object.modifier_apply(modifier=dec.name)
    lodmats = []
    for mat in source.data.materials:
        lodmat = bpy.data.materials.new('LOD ' + mat.name)
        lodmat.use_nodes = True
        bs = lodmat.node_tree.nodes.get('Principled BSDF')
        bs.inputs['Base Color'].default_value = (1, 1, 1, 1)
        bs.inputs['Metallic'].default_value = 0
        bs.inputs['Roughness'].default_value = .22 if 'eye' in mat.name.lower() else .36 if 'oral' in mat.name.lower() else .48
        lodmats.append(lodmat)
    retained_indices = [poly.material_index for poly in ob.data.polygons]
    ob.data.materials.clear()
    for mat in lodmats:
        ob.data.materials.append(mat)
    for poly, index in zip(ob.data.polygons, retained_indices):
        poly.material_index = index
lodtris = sum(sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in parts)
select_export()
bpy.ops.export_scene.gltf(filepath=str(OUT / 'titanichthys.lod1.glb'), **kwargs)
print('TITANICHTHYS_BASE_LOD_OK', str(OUT / 'titanichthys.lod1.glb'), 'full_tris', fulltris, 'lod_tris', lodtris, 'lod_ratio', lodtris / fulltris)
