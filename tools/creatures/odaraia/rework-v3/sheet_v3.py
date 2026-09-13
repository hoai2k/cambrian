"""Odaraia V3 review sheet frames.

    /opt/blender/blender -b --factory-startup --python sheet_v3.py

Renders the rest views, every Attack and Eat evidence station the production
plan names, the decisive contact/carry poses matched full against LOD, and a
Swim mid-cycle frame, from the two exported candidate scenes. `compose_sheet.py`
then lays them out. Cheap Cycles: 520x390, 24 samples, fixed seed.
"""
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector, Matrix

sys.path.insert(0, str(Path(__file__).resolve().parent))
import odaraia_v3_lib as L

AUTHORING = Path(os.environ.get('ODARAIA_AUTHORING', '/home/user/expansion-authoring/odaraia-rework'))
OUT = Path(os.environ.get('ODARAIA_SHEET',
                          '/tmp/claude-0/-home-user-cambrian/343f5125-052a-5056-8c64-4d5c3d45b1ce/scratchpad/odar'))
WIDE = (-9.5, .35, .0), (0, .30, .0), 6.9
VIEWS = {
    'lateral': WIDE,
    'dorsal': ((-2.2, -8.5, 1.6), (0, -.05, -.30), 6.9),
    'front': ((0, .62, 10.5), (0, .10, .20), 3.4),
    'quarter': ((-7.0, 3.6, 6.8), (0, .18, -.15), 7.0),
    'anterior': ((-6.4, 3.2, 6.4), (0, .52, 1.28), 3.5),
}
REST = ('lateral', 'dorsal', 'front', 'quarter')
DECISIVE = (('Attack', .50), ('Eat', .36), ('Eat', .78), ('Swim', .50))


def aim(ob, target):
    back = (ob.location - Vector(target)).normalized()
    up = Vector((0, 1, 0)) - back * back.dot(Vector((0, 1, 0)))
    if up.length < 1e-6:
        up = Vector((0, 0, 1)) - back * back.dot(Vector((0, 0, 1)))
    up.normalize()
    right = up.cross(back).normalized()
    up = back.cross(right).normalized()
    ob.rotation_euler = Matrix((right, up, back)).transposed().to_euler()


def preview_shell_alpha():
    """Cycles has no idea that COLOR_0's alpha is the shell's coverage, so the
    review renders hook it up here only. The exported file is untouched."""
    mat = bpy.data.materials.get('odaraia shell')
    if not mat or not mat.use_nodes:
        return
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    vc = next((n for n in nodes if n.type == 'VERTEX_COLOR'), None)
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if vc and bsdf:
        links.new(vc.outputs['Alpha'], bsdf.inputs['Alpha'])


def setup():
    preview_shell_alpha()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = True
    sc.cycles.seed = 5
    sc.render.resolution_x = 520
    sc.render.resolution_y = 390
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'PNG'
    world = bpy.data.worlds.new('Sheet studio')
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.055, .075, .095, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .55
    for name, location, power, size, colour in (
            ('Key', (-4.5, 6.5, 5.5), 1500, 5, (1, .93, .82)),
            ('Fill', (5.5, 2.0, 1.5), 900, 4.5, (.66, .82, 1)),
            ('Rim', (-1.5, 2.5, -6.0), 1400, 3.5, (.72, .93, 1)),
            ('Bounce', (2.5, -4.5, -1.0), 600, 4.5, (.9, .9, .95))):
        data = bpy.data.lights.new(name, 'AREA')
        data.energy = power
        data.shape = 'DISK'
        data.size = size
        data.color = colour
        ob = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(ob)
        ob.location = location
        aim(ob, (0, .2, .1))
    data = bpy.data.cameras.new('Sheet camera')
    data.type = 'ORTHO'
    cam = bpy.data.objects.new('Sheet camera', data)
    bpy.context.collection.objects.link(cam)
    sc.camera = cam
    return sc, cam, data


def shoot(sc, cam, data, view, path):
    location, target, ortho = VIEWS[view]
    cam.location = Vector(location)
    aim(cam, target)
    data.ortho_scale = ortho
    sc.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def pose(rig, sc, clip, u):
    action = bpy.data.actions[clip]
    rig.animation_data.action = action
    if action.slots:
        rig.animation_data.action_slot = action.slots[0]
    last = round(L.CLIPS[clip] * L.FPS)
    sc.frame_set(round(u * last))
    bpy.context.view_layer.update()


def run(kind):
    bpy.ops.wm.open_mainfile(filepath=str(AUTHORING / f'rig-v3/odaraia-export-{kind}-v3.blend'))
    rig = bpy.data.objects['odaraia_rig']
    rig.animation_data_create()
    sc, cam, data = setup()
    made = []
    if kind == 'full':
        rig.animation_data.action = None
        sc.frame_set(0)
        for view in REST:
            path = OUT / f'sheet-rest-{view}.png'
            shoot(sc, cam, data, view, path)
            made.append(path)
        for clip, stations in (('Attack', L.ATTACK_STATIONS), ('Eat', L.EAT_STATIONS)):
            for u in stations:
                pose(rig, sc, clip, u)
                path = OUT / f'sheet-{clip.lower()}-{int(round(u * 100)):03d}-full.png'
                shoot(sc, cam, data, 'anterior', path)
                made.append(path)
    for clip, u in DECISIVE:
        pose(rig, sc, clip, u)
        view = 'lateral' if clip == 'Swim' else 'anterior'
        path = OUT / f'sheet-decisive-{clip.lower()}-{int(round(u * 100)):03d}-{kind}.png'
        shoot(sc, cam, data, view, path)
        made.append(path)
    return made


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in ('full', 'lod'):
        for path in run(kind):
            print('SHEET', path, flush=True)
