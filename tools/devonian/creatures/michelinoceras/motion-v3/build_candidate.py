"""Frozen candidate-only execution: reopen original, change 4 clips and sockets.

No imports of the historical builder/exporter, no public writes and no source
texture regeneration. Candidate directory must be new. Run with --threads 2.
"""
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion, Euler

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from performance import CLIPS, LOD_CLIPS, section_pose, soft_pose, carry_center, smooth

REPO = HERE.parents[4]
ROOT = REPO.parent/'devonian-authoring/michelinoceras/motion-v3'
SOURCE = REPO.parent/'devonian-authoring/michelinoceras/v1/michelinoceras.blend'
OUT = ROOT/'candidate-01'
if OUT.exists():
    raise RuntimeError(f'Frozen candidate must not be overwritten: {OUT}')
manifest = json.loads((HERE/'frozen-inputs.json').read_text())
for entry in manifest['inputs']:
    path = Path(entry['path'])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], f'Input hash changed: {path}'
OUT.mkdir(parents=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
S = bpy.context.scene
S.render.fps = 30
rig = bpy.data.objects['Michelinoceras']
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
assert len(rig.data.bones) == 166
assert len(bpy.data.actions) == 19
original_names = sorted(a.name for a in bpy.data.actions)


def action_digest(action):
    curves = []
    if hasattr(action, 'fcurves'):
        curves = list(action.fcurves)
    elif hasattr(action, 'layers'):
        for layer in action.layers:
            for strip in layer.strips:
                for slot in action.slots:
                    bag = strip.channelbag(slot)
                    if bag:
                        curves.extend(bag.fcurves)
    values = [(f.data_path, f.array_index, [(tuple(k.co), k.interpolation) for k in f.keyframe_points]) for f in curves]
    return hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()


preserved = {a.name: action_digest(a) for a in bpy.data.actions if a.name not in CLIPS}
geometry_before = {o.name: (len(o.data.vertices), len(o.data.polygons)) for o in meshes}
bone_graph = {b.name: b.parent.name if b.parent else None for b in rig.data.bones}
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
rig.animation_data.action = None
for b in rig.pose.bones:
    b.matrix_basis = Matrix.Identity(4)
S.frame_set(1)
bpy.context.view_layer.update()

# Existing mouth and swallow point locations remain exactly as authored.
# Arm contacts sit on section 12, leaving 3 distal bones for wrapping/release.
for name in [o.name for o in bpy.data.objects if o.name.startswith('anchor_') and o.name not in ('anchor_mouth', 'anchor_mouth_inside')]:
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)


def add_anchor(name, arm, role, grasp=False):
    bone_name = f'arm_{arm}_12'
    bone = rig.data.bones[bone_name]
    # A small inward offset places the grasp centre inside the arm's oral face.
    radial = Vector((math.cos(2*math.pi*arm/10+math.pi/10), 0, math.sin(2*math.pi*arm/10+math.pi/10)))
    point = bone.tail_local-radial*(.025 if grasp else .008)
    o = bpy.data.objects.new(name, None)
    S.collection.objects.link(o)
    o.parent, o.parent_type, o.parent_bone = rig, 'BONE', bone_name
    bpy.context.view_layer.update()
    o.matrix_world = rig.matrix_world @ Matrix.Translation(point)
    o['cambrianAnchor'] = {
        'version': 1, 'role': role, 'parentBone': bone_name,
        'chain': [f'arm_{arm}_{j:02d}' for j in range(13)],
        'effectorBone': bone_name, 'contactType': 'soft-arm-oral-surface',
        'approximate': True,
    }
    bpy.context.view_layer.update()
    local_contact = bone.matrix_local.inverted() @ point
    return o, local_contact


contacts = {}
for arm in range(10):
    contacts[arm] = add_anchor('anchor_attack_primary' if arm == 0 else f'anchor_attack_arm_{arm:02d}', arm, 'attack')
grasp, grasp_local = add_anchor('anchor_grasp', 0, 'grasp', True)
anchors = [o for o in bpy.data.objects if o.name.startswith('anchor_')]
assert len(anchors) == 13
rest_relative = {}
for arm in range(10):
    for j in range(16):
        bone = rig.data.bones[f'arm_{arm}_{j:02d}']
        rest_relative[bone.name] = bone.parent.matrix_local.inverted() @ bone.matrix_local


def solve_arm(arm, target, local_contact, strength):
    """Bounded distributed CCD in mathutils; never stretches or moves a root.

    Work on arrays of world transforms, then convert solved orientation back to
    the unchanged rest frames. No dependency-graph update inside the solver.
    """
    bones = [rig.pose.bones[f'arm_{arm}_{j:02d}'] for j in range(13)]
    positions, rotations = [], []
    parent = rig.pose.bones['head'].matrix.copy()
    for b in bones:
        world = parent @ rest_relative[b.name] @ b.rotation_euler.to_matrix().to_4x4()
        positions.append(world.translation.copy())
        rotations.append(world.to_quaternion())
        parent = world
    point = positions[-1]+rotations[-1] @ local_contact
    # Reach the weighted target instead of accumulating fractional blend every pass.
    destination = point.lerp(target, strength)
    identity = Quaternion()
    for _ in range(40):
        for j in range(12, -1, -1):
            a, z = point-positions[j], destination-positions[j]
            if a.length < 1e-9 or z.length < 1e-9:
                continue
            q = a.rotation_difference(z)
            angle = q.angle
            if angle > .13:
                q = identity.slerp(q, .13/angle)
            point = positions[j]+q @ (point-positions[j])
            for k in range(j, 13):
                rotations[k] = q @ rotations[k]
                if k > j:
                    positions[k] = positions[j]+q @ (positions[k]-positions[j])
        if (point-destination).length < .0015:
            break
    parent_rotation = rig.pose.bones['head'].matrix.to_quaternion()
    for j, b in enumerate(bones):
        local_rotation = rest_relative[b.name].to_quaternion().inverted() @ parent_rotation.inverted() @ rotations[j]
        b.rotation_euler = local_rotation.normalized().to_euler('XYZ')
        parent_rotation = rotations[j]
    return (point-destination).length


samples = []
contact_errors = []
for clip, duration in CLIPS.items():
    old = bpy.data.actions.get(clip)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new(clip)
    action.use_fake_user = True
    rig.animation_data.action = action
    previous_eulers = {}
    for frame in range(1, duration+2):
        t = (frame-1)/duration
        for b in rig.pose.bones:
            b.rotation_mode = 'XYZ'
            b.matrix_basis = Matrix.Identity(4)
        reach, jaw, funnel = soft_pose(clip, t)
        rig.pose.bones['head'].location.y = -reach
        rig.pose.bones['beak_upper'].rotation_euler = (-jaw, 0, 0)
        rig.pose.bones['beak_lower'].rotation_euler = (jaw, 0, 0)
        rig.pose.bones['funnel'].rotation_euler = (funnel, 0, 0)
        for arm in range(10):
            for j in range(16):
                rig.pose.bones[f'arm_{arm}_{j:02d}'].rotation_euler = section_pose(clip, t, arm, j)
        bpy.context.view_layer.update()
        errors = []
        if clip == 'Eat':
            center = Vector(carry_center(t))
            center += rig.pose.bones['head'].matrix.translation-rig.data.bones['head'].head_local
            carry = smooth(t, .22, .78)
            for arm in range(10):
                th = 2*math.pi*arm/10+math.pi/10
                radial = Vector((math.cos(th), 0, math.sin(th)))
                target = center if arm == 0 else center+radial*(.080-.029*carry)
                local = grasp_local if arm == 0 else contacts[arm][1]
                errors.append(solve_arm(arm, target, local, smooth(t, .015+(arm%3)*.012, .22)))
            contact_errors.append({'progress': t, 'solverErrors': errors})
            bpy.context.view_layer.update()
        for b in rig.pose.bones:
            if b.name == 'root':
                continue
            if b.name in previous_eulers:
                b.rotation_euler = b.rotation_euler.to_quaternion().to_euler('XYZ', previous_eulers[b.name])
            previous_eulers[b.name] = b.rotation_euler.copy()
            b.keyframe_insert(data_path='rotation_euler', frame=frame, group=b.name)
            b.keyframe_insert(data_path='location', frame=frame, group=b.name)
        S.frame_set(frame)
        bpy.context.view_layer.update()
        if frame in (1, duration+1) or frame%3 == 1:
            samples.append({'clip': clip, 'frame': frame, 'progress': t,
                'mouth': list(bpy.data.objects['anchor_mouth'].matrix_world.translation),
                'grasp': list(grasp.matrix_world.translation), 'solverErrors': errors,
                'arms': [[list(rig.pose.bones[f'arm_{arm}_{j:02d}'].head) for j in range(16)]+[list(rig.pose.bones[f'arm_{arm}_15'].tail)] for arm in range(10)]})
    # Dense per-frame keys should interpolate linearly. Handle legacy/slotted actions.
    curves = list(action.fcurves) if hasattr(action, 'fcurves') else [fc for layer in action.layers for strip in layer.strips for slot in action.slots for fc in (strip.channelbag(slot).fcurves if strip.channelbag(slot) else [])]
    for fc in curves:
        for key in fc.keyframe_points:
            key.interpolation = 'LINEAR'

assert sorted(a.name for a in bpy.data.actions) == original_names
assert preserved == {a.name: action_digest(a) for a in bpy.data.actions if a.name not in CLIPS}
assert geometry_before == {o.name: (len(o.data.vertices), len(o.data.polygons)) for o in meshes}
assert bone_graph == {b.name: b.parent.name if b.parent else None for b in rig.data.bones}
for b in rig.pose.bones:
    b.rotation_mode = 'XYZ'
    b.matrix_basis = Matrix.Identity(4)
rig.animation_data.action = bpy.data.actions['Idle']
S.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'michelinoceras-motion-v3.blend'))


def export(path, reduced=False):
    bpy.ops.object.select_all(action='DESELECT')
    for o in [rig, *meshes, *anchors]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True,
        export_frame_range=False, export_skins=True, export_normals=True, export_tangents=True,
        export_vertex_color='NAME', export_vertex_color_name='BakedPigment' if reduced else 'Color',
        export_all_vertex_colors=False, export_extras=True, export_yup=True)


export(OUT/'michelinoceras.glb')
for o in meshes:
    if len(o.data.polygons) > 150:
        d = o.modifiers.new('motion-v3 established reduction', 'DECIMATE')
        d.ratio = .26
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_move_up(modifier=d.name)
        bpy.ops.object.modifier_apply(modifier=d.name)
    if len(o.data.materials) > 1:
        first = o.data.materials[0]
        o.data.materials.clear()
        o.data.materials.append(first)
        for poly in o.data.polygons:
            poly.material_index = 0
for material in bpy.data.materials:
    if not material.use_nodes:
        continue
    tree = material.node_tree
    bsdf = tree.nodes.get('Principled BSDF')
    if not bsdf:
        continue
    for link in list(tree.links):
        if link.to_node == bsdf:
            tree.links.remove(link)
    vc = tree.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'BakedPigment'
    tree.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
for action in list(bpy.data.actions):
    if action.name not in LOD_CLIPS:
        bpy.data.actions.remove(action)
export(OUT/'michelinoceras.lod1.glb', True)
metadata = json.loads((SOURCE.parent/'candidate/michelinoceras.json').read_text())
metadata['looping'] = [name for name in metadata['looping'] if name != 'Eat']
metadata['anchors'] = [o.name for o in anchors]
metadata['motionVersion'] = 3
metadata['motionStatus'] = 'candidate-awaiting-visual-review'
metadata['feedingPerformance'] = {'clip': 'Eat', 'progressDriven': True, 'pickup': [0, .22], 'carry': [.22, .78], 'swallow': [.78, 1], 'socket': 'anchor_grasp'}
metadata['notes'].append('Motion-v3 retains original ten-arm anatomy and every other full action. Distinct sectional anticipation, whip, contact and recovery; Eat is consumption-progress driven. Comparative soft-part movement is uncertain.')
(OUT/'michelinoceras.json').write_text(json.dumps(metadata, indent=2)+'\n')
(OUT/'pose-evidence.json').write_text(json.dumps({'samples': samples, 'contactErrorsEveryFrame': contact_errors, 'preservedActions': preserved, 'boneGraph': bone_graph, 'geometryBefore': geometry_before}, indent=2)+'\n')
outputs = [{'path': str(p), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in OUT.iterdir() if p.is_file()]
(OUT/'execution-report.json').write_text(json.dumps({'status': 'review-needed', 'inputs': manifest['inputs'], 'outputs': outputs}, indent=2)+'\n')
print('MICHELINOCERAS_MOTION_V3_CANDIDATE_READY', str(OUT), flush=True)
