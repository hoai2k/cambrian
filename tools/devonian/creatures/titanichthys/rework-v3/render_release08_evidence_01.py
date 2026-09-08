#!/usr/bin/env python3
"""Bounded raw release08 import evidence plus production08 Idle portraits."""
from pathlib import Path
import hashlib
import json
import sys

import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
LOCAL = ROOT.parent / 'devonian-authoring/titanichthys/rework-v3'
RELEASE = LOCAL / 'release-candidate08'
BLEND = RELEASE / 'titanichthys-production-08.blend'
OUT = RELEASE / 'combined-evidence-01'
PORTRAITS = RELEASE / 'portraits-01'
HASHES = {'titanichthys.glb': 'e14f5ea5ac52e7d0b8c894ba31231099c341da85e6d0f463d4f1c22054122c62',
          'titanichthys.lod1.glb': '17837f5f66e08c7d34e9788faac38cd9b0578256cc2bade21b33483f3b7a5b98',
          'production08': 'ca3bb83e38b1b6e1c58a5897eed3025c8f1c34b7dae10f956cef3c517d0720a3'}
sys.path.insert(0, str(HERE))
from rig_actions_01 import CLIPS


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def configure(scene):
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.render.threads_mode = 'FIXED'
    scene.render.threads = 2
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.exposure = -.35
    scene.camera.data.type = 'ORTHO'


def clear_imported():
    for obj in list(bpy.data.objects):
        if obj.type in ('MESH', 'ARMATURE') or obj.name.startswith('anchor_'):
            bpy.data.objects.remove(obj, do_unlink=True)


def aim(camera, position, target, scale):
    camera.location = position
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.ortho_scale = scale


if OUT.exists() or PORTRAITS.exists():
    raise SystemExit('refuse existing evidence/portrait outputs')
for name, digest in HASHES.items():
    path = BLEND if name == 'production08' else RELEASE / name
    assert sha(path) == digest, f'input hash mismatch: {name}'
OUT.mkdir()
PORTRAITS.mkdir()
manifest = {'source_sha256': sha(__file__), 'inputs': HASHES, 'raw_imports': [], 'portraits': []}

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
configure(scene)
oral = bpy.data.objects['Oral inspection fill']
oral.location = (-.40, -4.30, -.17)
oral.rotation_euler = (Vector((0, -1.50, -.18)) - oral.location).to_track_quat('-Z', 'Y').to_euler()
oral.data.energy = 200
oral.data.size = .70
light = bpy.data.lights.new('Release08 oral fill', 'AREA')
light.energy = 70
light.shape = 'DISK'
light.size = .50
light.color = (.90, .95, 1.)
fill = bpy.data.objects.new('Release08 oral fill', light)
scene.collection.objects.link(fill)
fill.location = (.55, -4.20, -.10)
fill.rotation_euler = (Vector((0, -1.50, -.18)) - fill.location).to_track_quat('-Z', 'Y').to_euler()
clear_imported()

for asset in ('titanichthys.glb', 'titanichthys.lod1.glb'):
    scene.frame_set(0)
    bpy.ops.import_scene.gltf(filepath=str(RELEASE / asset))
    rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
    tracks = list(rig.animation_data.nla_tracks)
    assert {track.name for track in tracks} == set(CLIPS)
    for track in tracks:
        track.mute = True
    track = next(track for track in tracks if track.name == 'Ability')
    assert len(track.strips) == 1
    strip = track.strips[0]
    rig.animation_data.action = strip.action
    rig.animation_data.action_slot = strip.action_slot
    scene.frame_set(round(CLIPS['Ability'] * 30 * .5))
    for label, position, target, scale in (
        ('Ability-oral-front', (0, -8, -.16), (0, -1.65, -.16), 2.8),
        ('Ability-Orbit-oblique', (5, -6, 3.3), (0, -1.64, .24), 4.5),
    ):
        aim(scene.camera, position, target, scale)
        image = OUT / f'{asset[:-4]}-{label}.png'
        scene.render.resolution_x = 1400
        scene.render.resolution_y = 1050
        scene.render.film_transparent = False
        scene.render.filepath = str(image)
        bpy.context.view_layer.update()
        bpy.ops.render.render(write_still=True)
        manifest['raw_imports'].append({'path': str(image), 'sha256': sha(image), 'bytes': image.stat().st_size,
                                        'asset': asset, 'asset_sha256': sha(RELEASE / asset), 'clip': 'Ability',
                                        'phase': .5, 'frame': scene.frame_current, 'action': strip.action.name,
                                        'action_slot': strip.action_slot.identifier, 'camera': position,
                                        'target': target, 'ortho_scale': scale})
    clear_imported()

bpy.ops.wm.open_mainfile(filepath=str(BLEND))
scene = bpy.context.scene
configure(scene)
scene.frame_set(0)
rig = bpy.data.objects['titanichthys_rig']
rig.animation_data.action = bpy.data.actions['Idle']
scene.frame_set(0)
aim(scene.camera, (8.4, -9.4, 4.7), (0, .10, .08), 9.4)
for filename, width, height, transparent in (
    ('titanichthys.select.png', 1600, 1200, True), ('titanichthys.card.png', 800, 600, True),
    ('titanichthys.thumb.png', 256, 192, True), ('titanichthys.png', 1600, 1200, False),
):
    image = PORTRAITS / filename
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = transparent
    scene.render.filepath = str(image)
    bpy.context.view_layer.update()
    bpy.ops.render.render(write_still=True)
    manifest['portraits'].append({'path': str(image), 'sha256': sha(image), 'bytes': image.stat().st_size,
                                  'clip': 'Idle', 'frame': 0, 'camera': list(scene.camera.location),
                                  'ortho_scale': scene.camera.data.ortho_scale, 'size': [width, height],
                                  'transparent': transparent})
(RELEASE / 'release08-render-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('TITANICHTHYS_RELEASE08_EVIDENCE_OK', len(manifest['raw_imports']), len(manifest['portraits']))
