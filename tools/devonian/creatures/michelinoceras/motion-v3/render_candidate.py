"""Actual exported full/LOD pose evidence; CPU only, 2 threads via command.

MIC_DETAIL must be full or lod. The cyan sphere in Eat views is a labelled
contact proxy, not a claim that runtime feeding has already been integrated.
"""
import bpy
import os
import json
import hashlib
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4].parent/'devonian-authoring/michelinoceras/motion-v3/candidate-01'
detail = os.environ.get('MIC_DETAIL', 'full')
assert detail in ('full', 'lod')
asset = ROOT/('michelinoceras.glb' if detail == 'full' else 'michelinoceras.lod1.glb')
OUT = ROOT/('review-'+detail)
assert not OUT.exists(), f'Review output must be new: {OUT}'
OUT.mkdir()
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(asset))
S = bpy.context.scene
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
for track in list(rig.animation_data.nla_tracks):
    rig.animation_data.nla_tracks.remove(track)
S.render.engine = 'CYCLES'
S.cycles.device = 'CPU'
S.cycles.samples = 12
S.cycles.use_denoising = True
S.render.resolution_x, S.render.resolution_y = 720, 540
S.render.resolution_percentage = 100
S.render.image_settings.file_format = 'PNG'
S.render.film_transparent = False
S.view_settings.view_transform = 'AgX'
S.world = bpy.data.worlds.new('Neutral motion review')
S.world.use_nodes = True
S.world.node_tree.nodes['Background'].inputs[0].default_value = (.085, .105, .13, 1)
S.world.node_tree.nodes['Background'].inputs[1].default_value = .6
for name, position, energy, size in [('Key', (2, -4, 4), 750, 4), ('Fill', (-3, -3, 2), 450, 3), ('Rim', (1, 2, 4), 650, 3)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.name = name
    light.data.energy, light.data.size = energy, size
    light.rotation_euler = (Vector((0, -1.8, 0))-light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.data.type = 'ORTHO'
S.camera = camera
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=.060)
proxy = bpy.context.object
proxy.name = 'QA_ONLY_cyan_food_contact_proxy'
material = bpy.data.materials.new('QA only cyan')
material.diffuse_color = (.04, .65, .85, 1)
material.use_nodes = True
material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.04, .65, .85, 1)
proxy.data.materials.append(material)


def pose(clip, progress):
    action = next(a for a in bpy.data.actions if a.name == clip or a.name.endswith('|'+clip))
    rig.animation_data.action = action
    if hasattr(action, 'slots') and action.slots:
        rig.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    frame = start+(end-start)*progress
    S.frame_set(int(frame), subframe=frame-int(frame))
    bpy.context.view_layer.update()
    proxy.hide_render = clip != 'Eat'
    proxy.location = bpy.data.objects['anchor_grasp'].matrix_world.translation
    proxy.scale = (1, 1, 1)
    if clip == 'Eat':
        shrink = 1-.8*max(0, min(1, (progress-.55)/.45))
        proxy.scale = (shrink,)*3


views = {
    'crown-oblique': ((2.6, -4.0, 1.6), (0, -2.05, 0), 1.95),
    'crown-side': ((3.8, -1.9, .13), (0, -2.02, 0), 1.90),
}
sequences = {'Attack': [0, .18, .36, .55, .76, 1], 'Heavy': [0, .18, .37, .57, .79, 1],
    'Bite': [0, .27, .53, 1], 'Eat': [0, .12, .22, .48, .78, 1]}
if detail == 'lod':
    sequences = {'Attack': [.18, .55, .76], 'Eat': [.22, .48, .78, 1]}
records = []
for clip, values in sequences.items():
    for progress in values:
        pose(clip, progress)
        for view, (position, target, scale) in views.items():
            camera.location = position
            camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z', 'Y').to_euler()
            camera.data.ortho_scale = scale
            name = f'{clip}-{round(progress*100):03d}-{view}.png'
            S.render.filepath = str(OUT/name)
            bpy.ops.render.render(write_still=True)
            records.append({'clip': clip, 'progress': progress, 'view': view, 'file': name})
pose('Idle', 0)
camera.location = (4, -6, 4)
camera.rotation_euler = (Vector((0, .3, 0))-camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.ortho_scale = 6.9
S.render.filepath = str(OUT/'Idle-whole-silhouette.png')
bpy.ops.render.render(write_still=True)
(OUT/'review-manifest.json').write_text(json.dumps({'asset': str(asset), 'sha256': hashlib.sha256(asset.read_bytes()).hexdigest(),
    'contactProxy': 'Cyan sphere follows actual anchor_grasp; no runtime integration claimed.', 'records': records}, indent=2)+'\n')
print('MICHELINOCERAS_MOTION_V3_RENDER_COMPLETE', detail, flush=True)
