#!/usr/bin/env python3
"""Render corrected fixed-orbit study-02 evidence after storage is available."""
import hashlib
import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local')
STUDY = ROOT / 'devonian-authoring/titanichthys/rework-v3/eye-seating-study-02'
OUT = STUDY / 'orbit-renders04'
BLEND = ROOT / 'devonian-authoring/titanichthys/rework-v3/candidate-06/titanichthys-production-06.blend'
EXPECTED = {
    'titanichthys.glb': '73cdb8d610d2f6cbdec750127d406d51dda4d288ac6218f616c4f6560b1e1bee',
    'titanichthys.lod1.glb': 'd19e670f2b2c2b8ff0c5a56709a020708bbee4c4f302c5670cae53f960ab1a1f',
}
sys.path.insert(0, str(HERE))
from rig_actions_01 import CLIPS


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def clear_imported():
    for obj in list(bpy.data.objects):
        if obj.type in ('MESH', 'ARMATURE') or obj.name.startswith('anchor_'):
            bpy.data.objects.remove(obj, do_unlink=True)


def slot_label(slot):
    for attribute in ('identifier', 'name_display', 'name'):
        value = getattr(slot, attribute, None)
        if value is not None:
            return str(value)
    raise AssertionError(f'unrecordable ActionSlot: {slot!r}')


def action_metadata(rig, clip, phase):
    animation = rig.animation_data
    assert animation is not None
    tracks = list(animation.nla_tracks)
    assert {track.name for track in tracks} == set(CLIPS), 'unexpected imported NLA clip set'
    for track in tracks:
        track.mute = True
    if clip == 'Bind':
        if animation.action is not None:
            animation.action_slot = None
            animation.action = None
        assert animation.action is None and animation.action_slot is None
        for pose_bone in rig.pose.bones:
            pose_bone.matrix_basis.identity()
        bpy.context.scene.frame_set(0)
        return {'frame': 0, 'action': None, 'action_slot': None, 'strip': None}
    track = next(track for track in tracks if track.name == clip)
    assert len(track.strips) == 1
    strip = track.strips[0]
    animation.action = strip.action
    animation.action_slot = strip.action_slot
    frame = round(30 * phase * CLIPS[clip])
    bpy.context.scene.frame_set(frame)
    return {'frame': frame, 'action': animation.action.name,
            'action_slot': slot_label(animation.action_slot), 'strip': strip.name}


if OUT.exists():
    raise SystemExit(f'refuse existing output directory: {OUT}')
if CLIPS['Ability'] != 2.4:
    raise SystemExit(f'unexpected frozen clip set/duration: {CLIPS}')
for name, digest in EXPECTED.items():
    assert sha(STUDY / name) == digest, f'input hash mismatch: {name}'
OUT.mkdir(parents=True)

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
scene.frame_set(0)  # Must precede every derivative import.
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.resolution_x = 1400
scene.render.resolution_y = 1050
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.camera.data.type = 'ORTHO'
clear_imported()

views = {
    'Orbit-side': ((8, -2, .5), (0, -2, .5), 2.8),
    'Orbit-oblique': ((5, -6, 3.3), (0, -1.64, .24), 4.5),
}
manifest = {'renderer_sha256': sha(__file__), 'studio_blend_sha256': sha(BLEND),
            'inputs': EXPECTED, 'clips': CLIPS, 'renders': []}
for asset in EXPECTED:
    bpy.ops.import_scene.gltf(filepath=str(STUDY / asset))
    rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
    for clip, phase in (('Bind', 0.0), ('Ability', .5)):
        metadata = action_metadata(rig, clip, phase)
        bpy.context.view_layer.update()
        for label, (position, target, scale) in views.items():
            scene.camera.location = position
            scene.camera.rotation_euler = (Vector(target) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
            scene.camera.data.ortho_scale = scale
            image = OUT / f'{asset[:-4]}-{label}-{clip}.png'
            scene.render.filepath = str(image)
            bpy.ops.render.render(write_still=True)
            manifest['renders'].append({'path': str(image), 'sha256': sha(image), 'asset': asset,
                                        'clip': clip, 'phase': phase, 'camera': label, **metadata})
    clear_imported()

(OUT / 'orbit-render-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('EYE_SEATING_ORBITS03_OK', len(manifest['renders']))
