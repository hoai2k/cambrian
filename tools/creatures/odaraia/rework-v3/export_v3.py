"""Odaraia V3 stage 2b — pigment/PBR bake, consolidation, LOD and raw GLB export.

    /opt/blender/blender -b --factory-startup --python export_v3.py -- full
    /opt/blender/blender -b --factory-startup --python export_v3.py -- lod
    /opt/blender/blender -b --factory-startup --python export_v3.py -- anchors

Exports are **raw** (uncompressed): `package-expansion.mjs` applies the lossless
meshopt pass afterwards, and `add-anchors.mjs` appends the sockets from
`anchors_v3.json`. Both files carry the identical 406-bone skeleton, the same
eighteen actions and the same socket parents; the packager keeps every clip on
the full model and reduces the LOD to Idle/Swim/Death itself.
"""
import json
import math
import os
import struct
import sys
from pathlib import Path

import bpy
import bmesh
import numpy as np
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import odaraia_v3_lib as L
from rig_v3 import AUTHORING, grasp_rest_point
import lod_v3

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ACTIONS_BLEND = AUTHORING / 'rig-v3/odaraia-actions-v3.blend'
CANDIDATE = AUTHORING / 'v3-candidate'
CUTAWAY = 'Study only | anatomical half shell'
UV_SCALE = 3.0
#: The accepted M02 shader defines roughness per material as a constant; only
#: base colour, shell coverage and bump vary spatially, so those become COLOR_0
#: and a tiling normal map and roughness stays a factor.
EXPORT_MATERIALS = {
    'Study02 | warm ochre organic trunk': ('odaraia trunk', .59, False),
    'Study02 | copper articulated endopods': ('odaraia endopods', .58, False),
    'Study02 | amber lamellate paddles': ('odaraia exopods', .64, False),
    'Study02 | dark fine filter endites': ('odaraia endites', .59, False),
    'Study02 | deep teal compound-eye surface': ('odaraia eyes', .44, False),
    'Study02 | ochre mouth apparatus': ('odaraia mouthparts', .58, False),
    'Study02 | translucent olive amber rigid shell': ('odaraia shell', .63, True),
}
FEEDING = {'version': 1, 'mode': 'authored-grasp', 'clip': 'Eat',
           'apertureDiameter': .045, 'pickupOffsetLimit': .18}


# --------------------------------------------------------------------------
# Pigment, coverage and UVs, baked in rest space.
# --------------------------------------------------------------------------

def bake_pigment(objects):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 1
    sc.cycles.use_denoising = False
    sc.cycles.seed = 11
    for ob in objects:
        me = ob.data
        if 'Color' not in me.color_attributes:
            me.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        me.color_attributes.active_color_index = me.color_attributes.find('Color')
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bake = sc.render.bake
    bake.target = 'VERTEX_COLORS'
    bake.use_pass_direct = False
    bake.use_pass_indirect = False
    bake.use_pass_color = True
    bake.use_selected_to_active = False
    bpy.ops.object.bake(type='DIFFUSE')
    # Cycles returns albedo premultiplied by the surface's own coverage and the
    # coverage itself in alpha. Undo the premultiply so the shipped base colour
    # is the authored pigment and the alpha is the authored shell coverage.
    stats = {'minAlpha': 1.0, 'maxAlpha': 0.0}
    for ob in objects:
        data = ob.data.color_attributes['Color'].data
        raw = np.empty(len(data) * 4)
        data.foreach_get('color', raw)
        raw = raw.reshape(-1, 4)
        alpha = np.clip(raw[:, 3], 1e-4, 1.0)
        raw[:, :3] = np.clip(raw[:, :3] / alpha[:, None], 0, 1)
        raw[:, 3] = alpha
        data.foreach_set('color', raw.ravel())
        stats['minAlpha'] = min(stats['minAlpha'], float(alpha.min()))
        stats['maxAlpha'] = max(stats['maxAlpha'], float(alpha.max()))
    return stats


def box_uvs(ob):
    """Deterministic dominant-axis box projection: the detail maps tile over the
    body without an unwrap pass across 4 096 individual spines."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    lv = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get('vertex_index', lv)
    normals = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get('normal', normals)
    normals = normals.reshape(-1, 3)
    totals = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_total', totals)
    starts = np.empty(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('loop_start', starts)
    assert np.array_equal(starts, np.concatenate([[0], np.cumsum(totals)[:-1]])), ob.name
    axis = np.repeat(np.abs(normals).argmax(1), totals)
    p = co[lv]
    u = np.where(axis == 0, p[:, 1], p[:, 0])
    v = np.where(axis == 2, p[:, 1], p[:, 2])
    me.uv_layers[0].data.foreach_set('uv', np.stack([u * UV_SCALE, v * UV_SCALE], 1).ravel())


# --------------------------------------------------------------------------
# Export materials: standard PBR, no transmission.
# --------------------------------------------------------------------------

def load_image(path, non_color=False):
    image = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        image.colorspace_settings.name = 'Non-Color'
    image.pack()
    return image


def export_material(name, roughness, transparent, albedo, normal, double_sided=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = not double_sided
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    bsdf.inputs['IOR'].default_value = 1.38
    vc = nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = albedo
    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MULTIPLY'
    mix.inputs[0].default_value = 1.0
    links.new(tex.outputs['Color'], mix.inputs[1])
    links.new(vc.outputs['Color'], mix.inputs[2])
    links.new(mix.outputs[0], bsdf.inputs['Base Color'])
    nrm = nodes.new('ShaderNodeTexImage')
    nrm.image = normal
    nmap = nodes.new('ShaderNodeNormalMap')
    nmap.inputs['Strength'].default_value = .38
    links.new(nrm.outputs['Color'], nmap.inputs['Color'])
    links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    if transparent:
        # The shell's coverage rides in COLOR_0's alpha channel, which glTF
        # multiplies into base colour and three.js honours as vertex alpha.
        # Linking it into the Blender BSDF's Alpha socket instead makes the
        # exporter drop COLOR_0 from that primitive entirely.
        for attribute, value in (('blend_method', 'BLEND'), ('surface_render_method', 'BLENDED')):
            if hasattr(mat, attribute):
                setattr(mat, attribute, value)
    return mat


# --------------------------------------------------------------------------
# Consolidation.
# --------------------------------------------------------------------------

def consolidate(rig, objects, double_sided=()):
    """One skinned draw per material, the transparent shell kept separate."""
    albedo = load_image(REPO / 'tools/creatures/textures/chitin-albedo.png')
    normal = load_image(REPO / 'tools/creatures/arthropods/cuticle_normal.png', non_color=True)
    groups = {}
    for ob in objects:
        groups.setdefault(ob.data.materials[0].name, []).append(ob)
    parts = []
    for source, (name, roughness, transparent) in EXPORT_MATERIALS.items():
        members = sorted(groups.get(source, []), key=lambda o: o.name)
        if not members:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for ob in members:
            ob.parent = None
            ob.select_set(True)
        bpy.context.view_layer.objects.active = members[0]
        if len(members) > 1:
            bpy.ops.object.join()
        part = bpy.context.view_layer.objects.active
        part.name = name
        part.data.name = name
        part.data.materials.clear()
        part.data.materials.append(export_material(name, roughness, transparent, albedo, normal,
                                                   double_sided=name in double_sided))
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.vertex_group_limit_total(limit=4)
        bpy.ops.object.vertex_group_normalize_all(lock_active=False)
        bm = bmesh.new()
        bm.from_mesh(part.data)
        bmesh.ops.triangulate(bm, faces=list(bm.faces))
        bm.to_mesh(part.data)
        bm.free()
        for polygon in part.data.polygons:
            polygon.use_smooth = True
        mod = part.modifiers.new('V3 skin', 'ARMATURE')
        mod.object = rig
        part.parent = rig
        parts.append(part)
    return parts


def triangles(parts):
    return sum(len(p.data.polygons) for p in parts)


# --------------------------------------------------------------------------
# Export and GLB post-patch.
# --------------------------------------------------------------------------

def export(rig, parts, path):
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    kwargs = dict(filepath=str(path), export_format='GLB', use_selection=True,
                  export_animations=True, export_animation_mode='ACTIONS',
                  export_force_sampling=False, export_frame_range=False, export_skins=True,
                  export_normals=True, export_tangents=True, export_texcoords=True,
                  export_materials='EXPORT', export_vertex_color='NAME',
                  export_vertex_color_name='Color', export_all_vertex_colors=False,
                  export_yup=False, export_extras=True)
    try:
        bpy.ops.export_scene.gltf(**kwargs, export_optimize_animation_size=False)
    except TypeError:
        bpy.ops.export_scene.gltf(**kwargs)


def patch(path, transparent_material):
    """Declare the runtime feeding contract and the shell's alpha mode on the
    exported file, without touching a byte of the binary chunk."""
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20 + length])
    scene = document['scenes'][document.get('scene', 0)]
    scene.setdefault('extras', {})['cambrianFeeding'] = FEEDING
    found = False
    for material in document.get('materials', []):
        if material.get('name') == transparent_material:
            material['alphaMode'] = 'BLEND'
            material['doubleSided'] = False
            found = True
    assert found, f'{path.name}: transparent material {transparent_material} missing'
    text = json.dumps(document, separators=(',', ':')).encode()
    text += b' ' * ((-len(text)) % 4)
    rest = data[20 + length:]
    out = struct.pack('<4sII', b'glTF', 2, 20 + len(text) + len(rest)) + \
        struct.pack('<I4s', len(text), b'JSON') + text + rest
    path.write_bytes(out)
    assert out[20 + len(text):] == rest
    return len(out)


def summarise(path):
    data = path.read_bytes()
    length = struct.unpack_from('<I', data, 12)[0]
    g = json.loads(data[20:20 + length])
    joints = len(g['skins'][0]['joints']) if g.get('skins') else 0
    component = None
    for mesh in g['meshes']:
        for prim in mesh['primitives']:
            if 'JOINTS_0' in prim['attributes']:
                component = g['accessors'][prim['attributes']['JOINTS_0']]['componentType']
    tris = 0
    for mesh in g['meshes']:
        for prim in mesh['primitives']:
            tris += g['accessors'][prim['indices']]['count'] // 3
    animation_bytes = 0
    used = set()
    for anim in g.get('animations', []):
        for sampler in anim['samplers']:
            used.add(sampler['input'])
            used.add(sampler['output'])
    for index in used:
        a = g['accessors'][index]
        view = g['bufferViews'][a['bufferView']]
        animation_bytes += view['byteLength']
    return {'file': path.name, 'bytes': len(data), 'joints': joints, 'triangles': tris,
            'meshes': len(g['meshes']), 'materials': len(g['materials']),
            'textures': len(g.get('textures', [])),
            'jointsComponentType': component,
            'jointsAreUint16': component == 5123,
            'clips': sorted(a['name'] for a in g.get('animations', [])),
            'animationBytes': animation_bytes,
            'sceneExtras': g['scenes'][g.get('scene', 0)].get('extras')}


# --------------------------------------------------------------------------
# Stages.
# --------------------------------------------------------------------------

def prepare():
    bpy.ops.wm.open_mainfile(filepath=str(ACTIONS_BLEND))
    rig = bpy.data.objects['odaraia_rig']
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.scene.frame_set(0)
    bpy.context.scene['odaraia_stage'] = 'rig-v3 stage2b export candidate, UNREVIEWED'
    cut = bpy.data.objects.get(CUTAWAY)
    if cut:
        mesh = cut.data
        bpy.data.objects.remove(cut, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    for ob in list(bpy.data.objects):
        if ob.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(ob, do_unlink=True)
    return rig, [o for o in bpy.data.objects if o.type == 'MESH']


def stage(kind):
    CANDIDATE.mkdir(parents=True, exist_ok=True)
    rig, objects = prepare()
    objects = lod_v3.build(rig, objects, kind)
    stats = bake_pigment(objects)
    for ob in objects:
        box_uvs(ob)
    # The LOD's spines and lamellae are flat blades, so those two draws are two-sided.
    parts = consolidate(rig, objects,
                        double_sided=('odaraia endites', 'odaraia exopods') if kind == 'lod' else ())
    name = 'odaraia.glb' if kind == 'full' else 'odaraia.lod1.glb'
    path = CANDIDATE / name
    export(rig, parts, path)
    patch(path, EXPORT_MATERIALS['Study02 | translucent olive amber rigid shell'][0])
    report = summarise(path)
    report['bakedAlphaRange'] = [round(stats['minAlpha'], 4), round(stats['maxAlpha'], 4)]
    report['drawParts'] = [{'name': p.name, 'triangles': len(p.data.polygons),
                            'vertices': len(p.data.vertices)} for p in parts]
    report['surfaceDeviation'] = lod_v3.surface_deviation(kind)
    report['profile'] = lod_v3.PROFILES[kind]
    (AUTHORING / f'rig-v3/stage2-{kind}.json').write_text(json.dumps(report, indent=2) + '\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(AUTHORING / f'rig-v3/odaraia-export-{kind}-v3.blend'))
    print('ODARAIA_V3_EXPORT', json.dumps(report)[:900], flush=True)


# --------------------------------------------------------------------------
# Anchors.
# --------------------------------------------------------------------------

def anchor_records():
    """`add-anchors.mjs` reads `point` in the shared source convention (X lateral,
    Z up, -Y anterior) and maps it to glTF `[x, z, -y]`. This scene is authored
    directly in game coordinates (+Y up, +Z forward) and exported with
    `export_yup=False`, so a Blender world point (bx, by, bz) is written here as
    (bx, -bz, by) and lands in the GLB exactly where it was authored. Both forms
    are recorded; the extra keys are documentation and the tool ignores them."""
    def record(name, bone, world, role, chain=None, note=''):
        row = {'name': name, 'bone': bone,
               'point': [round(world.x, 6), round(-world.z, 6), round(world.y, 6)],
               'role': role, 'blenderWorld': [round(c, 6) for c in world],
               'gltfWorld': [round(c, 6) for c in world], 'note': note}
        if chain:
            row['chain'] = chain
            row['effectorBone'] = chain[-1]
            row['solver'] = 'CCD'
            row['contactType'] = 'filtering endopod terminal pad'
        return row

    def limb_chain(number, label):
        return [L.limb_bone(number, label, seg) for seg in L.SEGMENTS]

    lead = L.limb_of(1, 'L')
    lead_point = grasp_rest_point(lead)
    out = [
        record('anchor_mouth', 'head', Vector((0, .305, 1.690)), 'mouth',
               note='measured oral presentation centre between the moving mandibles, '
                    'behind the labrum plate (which ends at z=1.80)'),
        record('anchor_mouth_inside', 'head', Vector((0, .225, 1.655)), 'swallow',
               note='shallow concealment point inside the sculpted head volume; '
                    'head-ellipsoid ratio 0.8651, proven in evidence_v3.json'),
        record('anchor_attack_primary', 'limb_01_L_tip', lead_point, 'attack',
               chain=limb_chain(1, 'L'),
               note='exact alias of the lead 1L contact so runtime deduplication '
                    'spends its two-contact budget on distinct tips'),
        record('anchor_grasp', 'limb_01_L_tip', lead_point, 'grasp',
               chain=limb_chain(1, 'L'),
               note='offset from the lead filtering pad to the food centre in the '
                    'verified secure pose; companion limbs are authored around the '
                    'same physical centre'),
    ]
    for number in range(1, 7):
        for _, label in L.SIDES:
            l = L.limb_of(number, label)
            out.append(record(f'anchor_attack_{number:02d}_{label}',
                              L.limb_bone(number, label, 'tip'), grasp_rest_point(l), 'attack',
                              chain=limb_chain(number, label),
                              note='anterior endopod terminal contact; body, head, shell '
                                   'and eyes never enter a strike chain'))
    return out


def stage_anchors():
    records = anchor_records()
    (HERE / 'anchors_v3.json').write_text(json.dumps({'odaraia': records}, indent=2) + '\n')
    (HERE / 'runtime_v3.json').write_text(json.dumps({
        'cambrianFeeding': FEEDING,
        'source': 'measured in evidence_v3.json: aperture 0.04513 model units, '
                  'pickup offset limit 0.18 under the runtime\'s own unbounded CCD',
        'sockets': [r['name'] for r in records],
    }, indent=2) + '\n')
    print('ODARAIA_V3_ANCHORS', len(records), flush=True)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['full']
    if args[0] == 'anchors':
        stage_anchors()
    else:
        stage(args[0])
