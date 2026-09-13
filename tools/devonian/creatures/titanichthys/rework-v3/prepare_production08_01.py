#!/usr/bin/env python3
"""Make the one approved editable production08 derivative from immutable production07."""
from pathlib import Path
import hashlib
import json
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
LOCAL = ROOT.parent / 'devonian-authoring/titanichthys/rework-v3'
BASE = LOCAL / 'candidate-07'
RELEASE = LOCAL / 'release-candidate08'
BLEND = BASE / 'titanichthys-production-07.blend'
OUT = RELEASE / 'titanichthys-production-08.blend'
REPORT = RELEASE / 'production08-proof.json'
NORMAL = LOCAL / 'body-normal-study-02/body-normal-2048.png'
HASHES = {
    'base_blend': 'e64023a65ad8be237c811f421a95bd9f1a4a5fa70c8220446100311d20115b1e',
    'raw_full': 'e14f5ea5ac52e7d0b8c894ba31231099c341da85e6d0f463d4f1c22054122c62',
    'raw_lod': '17837f5f66e08c7d34e9788faac38cd9b0578256cc2bade21b33483f3b7a5b98',
    'body_normal_2048': '7ff7c15e6bbb2ff0d48eaefe888bd36b7237e934dbc79a2999d4c7561570c6a0',
}
EYES = {
    'L': {'object': 'Recessed socket eye L', 'delta': (-.025553648471832273, .013796152174472808, .007528432309627533)},
    'R': {'object': 'Recessed socket eye R', 'delta': (.025553648471832273, .013796152174472808, .007528432309627533)},
}
BODY_MATERIALS = ('Titanichthys body', 'Titanichthys underside', 'Titanichthys oral accent')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def blender_to_gltf(values):
    values = np.asarray(values, dtype=np.float64)
    return values[:, [0, 2, 1]] * np.array([1., 1., -1.])


def evaluated_points(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        points = np.array([evaluated.matrix_world @ vertex.co for vertex in mesh.vertices], dtype=np.float64)
    finally:
        evaluated.to_mesh_clear()
    return blender_to_gltf(points)


def raw_points(evaluate, side, clip, phase):
    meshes, _ = evaluate(clip, phase)
    return np.asarray(meshes[f'Recessed socket eye {side}_export']['positions'], dtype=np.float64)


def bidirectional_nearest_error(left, right):
    def nearest_max(source, target):
        tree = KDTree(len(target))
        for index, point in enumerate(target):
            tree.insert(Vector(point), index)
        tree.balance()
        return max(tree.find(Vector(point))[2] for point in source)
    return max(nearest_max(left, right), nearest_max(right, left))


if OUT.exists() or REPORT.exists():
    raise SystemExit('refuse existing production08 output/proof')
for key, path in {'base_blend': BLEND, 'raw_full': RELEASE / 'titanichthys.glb',
                  'raw_lod': RELEASE / 'titanichthys.lod1.glb', 'body_normal_2048': NORMAL}.items():
    assert sha(path) == HASHES[key], f'input hash mismatch: {key}'

sys.path.insert(0, str(HERE))
from gltf_evaluate_01 import read_glb
from rig_actions_01 import CLIPS
_, evaluate_raw = read_glb(RELEASE / 'titanichthys.glb')

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
rig = bpy.data.objects['titanichthys_rig']
scene.frame_set(0)
rig.animation_data.action = None
for pose_bone in rig.pose.bones:
    pose_bone.matrix_basis.identity()
bpy.context.view_layer.update()

report = {'source_sha256': sha(__file__), 'inputs': HASHES, 'eye_objects': {}, 'body_normal_materials': [], 'evaluated': {}}
for side, spec in EYES.items():
    obj = bpy.data.objects[spec['object']]
    assert obj.type == 'MESH' and obj.data.users == 1, 'eye mesh must not be shared'
    before = tuple(obj.matrix_world.translation)
    obj.matrix_world.translation += Vector(spec['delta'])
    report['eye_objects'][side] = {'object': obj.name, 'mesh': obj.data.name, 'mesh_users': obj.data.users,
                                   'bind_world_before': before, 'bind_world_delta': spec['delta'],
                                   'bind_world_after': tuple(obj.matrix_world.translation)}

normal = bpy.data.images.load(str(NORMAL), check_existing=False)
normal.name = 'Production08 accepted body normal 2048'
normal.colorspace_settings.name = 'Non-Color'
for material_name in BODY_MATERIALS:
    material = bpy.data.materials[material_name]
    node = next(node for node in material.node_tree.nodes
                if node.type == 'TEX_IMAGE' and node.image and 'body normal' in node.image.name.lower())
    old = node.image
    node.image = normal
    report['body_normal_materials'].append({'material': material_name, 'node': node.name,
                                            'before_image': old.name, 'after_image': normal.name,
                                            'after_sha256': sha(NORMAL),
                                            'colorspace': normal.colorspace_settings.name})
assert len(report['body_normal_materials']) == 3

for clip, phase in ((None, 0.0), ('Ability', .5)):
    if clip is None:
        rig.animation_data.action = None
        for pose_bone in rig.pose.bones:
            pose_bone.matrix_basis.identity()
        scene.frame_set(0)
    else:
        rig.animation_data.action = bpy.data.actions['Ability']
        scene.frame_set(round(CLIPS['Ability'] * 30 * phase))
    bpy.context.view_layer.update()
    label = clip or 'Bind'
    report['evaluated'][label] = {}
    for side, spec in EYES.items():
        actual = evaluated_points(bpy.data.objects[spec['object']])
        expected = raw_points(evaluate_raw, side, clip, phase)
        maximum = float(bidirectional_nearest_error(actual, expected))
        assert maximum <= 2e-5, f'{label} {side} eye differs from raw08: {maximum}'
        report['evaluated'][label][side] = {'blender_evaluated_vertex_count': len(actual),
                                             'raw_gltf_vertex_count': len(expected),
                                             'bidirectional_nearest_gltf_position_error': maximum}

scene.frame_set(0)
rig.animation_data.action = None
for pose_bone in rig.pose.bones:
    pose_bone.matrix_basis.identity()
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT), check_existing=False)
assert sha(BLEND) == HASHES['base_blend'], 'immutable production07 changed'
report['output_blend_sha256'] = sha(OUT)
REPORT.write_text(json.dumps(report, indent=2) + '\n')
print('TITANICHTHYS_PRODUCTION08_OK', OUT, report['output_blend_sha256'])
