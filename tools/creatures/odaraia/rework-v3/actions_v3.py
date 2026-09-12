"""Odaraia V3 stage 2a — bake the eighteen actions onto the stage 1 rig.

    /opt/blender/blender -b --factory-startup --python actions_v3.py

Every clip is authored as FK controls plus author-time constrained solving (Eat's
lead pairs are solved onto the food path with the bounded CCD in `rig_v3.py`),
evaluated at 24 fps, converted to quaternions and then key-reduced with a
measured error. Root translation is never keyed, no scale is keyed, loops close
on their own first frame with matching derivatives and Death holds its final pose.
"""
import json
import math
import os
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion

sys.path.insert(0, str(Path(__file__).resolve().parent))
import odaraia_v3_lib as L
import perform_v3 as P
from rig_v3 import (AUTHORING, RIGBLEND, Kinematics, pose_to_basis, eat_solved_basis,
                    grasp_rest_point, EAT_TARGET_OFFSET, solve_ccd)

ACTIONS_BLEND = AUTHORING / 'rig-v3/odaraia-actions-v3.blend'
HERE = Path(__file__).resolve().parent
#: Reduction tolerance on a quaternion component; the induced end-effector error
#: is measured separately and reported.
KEY_TOLERANCE = .0015
#: Bones whose posed rotation never leaves identity get no channel at all.
IDENTITY_EPS = 1e-6


def clip_basis(kin, clip, u):
    """The full per-bone rotation basis for one clip at normalized time `u`."""
    if clip != 'Eat':
        return pose_to_basis(P.clip_pose(clip, u))
    basis, food, _ = eat_solved_basis(kin, u)
    # Release: the solved carry blends back into the free gait over .88-1 so the
    # clip closes on its own first frame and the tips let go, as the plan's
    # release/recover phase asks.
    weight = 1 - P.s01(u, .88, 1.0)
    if weight < 1:
        free = pose_to_basis(P.eat_pose(u))
        for (number, label) in EAT_TARGET_OFFSET:
            for seg in L.SEGMENTS:
                name = L.limb_bone(number, label, seg)
                a = free.get(name, Matrix.Identity(4)).to_quaternion()
                b = basis.get(name, Matrix.Identity(4)).to_quaternion()
                basis[name] = a.slerp(b, weight).to_matrix().to_4x4()
    return basis


def sample_clip(kin, clip, duration):
    last = round(duration * L.FPS)
    names = [b.name for b in BONES]
    index = {n: i for i, n in enumerate(names)}
    out = np.zeros((last + 1, len(names), 4))
    out[:, :, 0] = 1.0
    for frame in range(last + 1):
        u = frame / last
        basis = clip_basis(kin, clip, u)
        for name, m in basis.items():
            q = m.to_quaternion()
            out[frame, index[name]] = (q.w, q.x, q.y, q.z)
    # One hemisphere per track, so component interpolation never takes the long way.
    for j in range(len(names)):
        for f in range(1, last + 1):
            if float(np.dot(out[f, j], out[f - 1, j])) < 0:
                out[f, j] = -out[f, j]
    return last, names, out


def reduce_track(values, tolerance):
    """Greedy key reduction against linear interpolation, with measured error."""
    n = len(values)
    if n <= 2:
        return list(range(n)), 0.0
    keys = [0, n - 1]
    while True:
        idx = np.array(keys)
        interp = np.empty_like(values)
        for a, b in zip(idx[:-1], idx[1:]):
            if b == a + 1:
                interp[a] = values[a]
                continue
            t = (np.arange(a, b + 1) - a) / (b - a)
            seg = values[a][None, :] * (1 - t)[:, None] + values[b][None, :] * t[:, None]
            norm = np.linalg.norm(seg, axis=1, keepdims=True)
            interp[a:b + 1] = seg / np.maximum(norm, 1e-12)
        interp[-1] = values[-1]
        err = np.abs(interp - values).max(axis=1)
        worst = int(err.argmax())
        if err[worst] <= tolerance or worst in keys:
            return keys, float(err.max())
        keys = sorted(keys + [worst])


def main():
    bpy.ops.wm.open_mainfile(filepath=str(RIGBLEND))
    rig = bpy.data.objects['odaraia_rig']
    scene = bpy.context.scene
    scene.render.fps = L.FPS
    kin = Kinematics(rig)
    global BONES
    BONES = list(rig.pose.bones)
    for pb in BONES:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    rig.animation_data_create()

    report = {'fps': L.FPS, 'tolerance': KEY_TOLERANCE, 'clips': {}, 'totalKeyframes': 0,
              'totalSamples': 0}
    for clip, duration in L.CLIPS.items():
        last, names, values = sample_clip(kin, clip, duration)
        moving, retained, errors = [], {}, {}
        for j, name in enumerate(names):
            track = values[:, j, :]
            if np.abs(track - np.array([1.0, 0, 0, 0])).max() < IDENTITY_EPS:
                continue
            keys, err = reduce_track(track, KEY_TOLERANCE)
            moving.append(name)
            retained[name] = set(keys)
            errors[name] = err
        action = bpy.data.actions.new(clip)
        action.use_fake_user = True
        rig.animation_data.action = action
        if action.slots:
            rig.animation_data.action_slot = action.slots[0]
        inserted = 0
        for frame in range(last + 1):
            for j, name in enumerate(names):
                q = values[frame, j]
                BONES[j].rotation_quaternion = (q[0], q[1], q[2], q[3])
            for name in moving:
                if frame in retained[name]:
                    rig.pose.bones[name].keyframe_insert('rotation_quaternion', frame=frame)
                    inserted += 4
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for key in fc.keyframe_points:
                            key.interpolation = 'LINEAR'
        # Measured consequence of the reduction, in model units at the tips that
        # matter: full-rate FK against the interpolated reduced tracks, over only
        # the bones those tips actually depend on.
        probe = [(L.limb_bone(n, side, 'tip'), grasp_rest_point(L.limb_of(n, side)))
                 for n in (1, 3, 6, 16, 32) for _, side in L.SIDES]
        needed = set()
        for bone, _ in probe:
            name = bone
            while name:
                needed.add(name)
                name = kin.parent[name]
        order = {n: names.index(n) for n in needed}
        approx = {}
        for name in needed:
            track = values[:, order[name], :]
            if name not in retained:
                approx[name] = track
                continue
            keys = sorted(retained[name])
            out = np.empty_like(track)
            for a, b in zip(keys[:-1], keys[1:]):
                t = (np.arange(a, b + 1) - a) / max(1, (b - a))
                seg = track[a][None, :] * (1 - t)[:, None] + track[b][None, :] * t[:, None]
                out[a:b + 1] = seg / np.maximum(np.linalg.norm(seg, axis=1, keepdims=True), 1e-12)
            approx[name] = out
        tip_error = 0.0
        for frame in range(last + 1):
            ex = {n: Quaternion(values[frame, order[n]]).to_matrix().to_4x4() for n in needed}
            ap = {n: Quaternion(approx[n][frame]).to_matrix().to_4x4() for n in needed}
            for bone, rest in probe:
                tip_error = max(tip_error, (kin.point(bone, ex, rest) - kin.point(bone, ap, rest)).length)
        seam = float(np.abs(values[-1] - values[0]).max())
        hold_from = int(math.ceil(L.DEATH_HOLD * last))
        held = float(np.abs(values[hold_from:] - values[-1]).max()) if clip == 'Death' else None
        report['clips'][clip] = {
            'intendedSeconds': duration, 'frames': last + 1, 'seconds': round(last / L.FPS, 4),
            'loop': clip in L.LOOPS, 'animatedBones': len(moving),
            'sampledKeys': (last + 1) * len(moving) * 4, 'retainedKeys': inserted,
            'reduction': round(1 - inserted / max(1, (last + 1) * len(moving) * 4), 4),
            'maxComponentError': round(max(errors.values()) if errors else 0.0, 6),
            'maxTipErrorModelUnits': round(tip_error, 6),
            'endpointSeam': round(seam, 8),
            'deathHoldMaxDeviation': None if held is None else round(held, 8),
        }
        report['totalKeyframes'] += inserted
        report['totalSamples'] += (last + 1) * len(moving) * 4
        rig.animation_data.action = None
        print('CLIP', clip, json.dumps(report['clips'][clip]), flush=True)
        if clip in L.LOOPS:
            assert seam < 1e-6, (clip, seam)
        if clip == 'Death':
            assert held < 1e-9, (clip, held)

    for pb in BONES:
        pb.rotation_quaternion = (1, 0, 0, 0)
    scene.frame_set(0)
    scene['odaraia_stage'] = 'rig-v3 stage2a: eighteen baked actions, UNREVIEWED'
    bpy.ops.wm.save_as_mainfile(filepath=str(ACTIONS_BLEND))
    report['totalReduction'] = round(1 - report['totalKeyframes'] / report['totalSamples'], 4)
    (AUTHORING / 'rig-v3/stage2-actions.json').write_text(json.dumps(report, indent=2) + '\n')
    print('ODARAIA_V3_ACTIONS', report['totalKeyframes'], report['totalSamples'], report['totalReduction'], flush=True)


if __name__ == '__main__':
    main()
