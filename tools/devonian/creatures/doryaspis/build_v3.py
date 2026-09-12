"""Doryaspis V3 production build: geometry, appearance, rig, clips and exports.

    /opt/blender/blender -b --threads 1 --python-exit-code 1 \
        --python tools/devonian/creatures/doryaspis/build_v3.py

Geometry is the approved clay (`rework-v3/geometry_clay02.py`, variant clay02e)
and appearance is `materials_v3.py`; neither is re-authored here.  The rig is
V2's: the same twelve bone names, the same eighteen clip names, durations and
loop set, plus a `Grab` held loop.  The three sockets move onto the new
terminal oral geometry and the saw's tip.

Writes only `<authoring>/doryaspis/v3-candidate/` and a `v3-bake/` sibling for
the generated microrelief maps.  Never touches public/ or the V2 candidate.

Authoring space is V2's: X lateral, **-Y forward**, Z up.  The clay design is
authored X lateral, Y up, **+Z forward**, so every clay point is mapped by
(x, y, z) -> (x, -z, y) as it is created, which is the inverse of the glTF
+Y-up conversion: exported glTF coordinates therefore equal clay coordinates.
"""
import bpy
import bmesh
import json
import sys
import math
from math import sin, cos, pi, atan2
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
LOCAL = REPO.parent / 'devonian-authoring/doryaspis'
OUT = LOCAL / 'v3-candidate'
BAKE = LOCAL / 'v3-bake'
OUT.mkdir(parents=True, exist_ok=True)
BAKE.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / 'rework-v3'))
import geometry_clay02 as design
import materials_v3 as appearance

HEAD_MESH = 'doryaspis_shield_v3'
EYE_MESHES = ['eye_globe_L', 'eye_globe_R']


def to_blender(p):
    """Clay (X lateral, Y up, +Z forward) -> authoring (X lateral, -Y forward, Z up)."""
    return (p[0], -p[2], p[1])


# ----------------------------------------------------------------- the rig
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = 30
BONES = [
    ('root', (0, 0, 0), None),
    ('body', (0, .25, -.05), 'root'),
    ('shield', (0, -.30, -.02), 'body'),
    ('oral_upper', (0, -1.34, .055), 'shield'),
    ('oral_lower', (0, -1.34, -.035), 'shield'),
    ('oral_L', (.09, -1.34, .012), 'shield'),
    ('oral_R', (-.09, -1.34, .012), 'shield'),
    ('tail_base', (0, 1.20, -.032), 'body'),
    ('tail_mid', (0, 1.75, -.026), 'tail_base'),
    ('tail_distal', (0, 2.30, -.036), 'tail_mid'),
    ('tail_tip', (0, 2.80, -.066), 'tail_distal'),
    ('caudal', (0, 3.15, -.190), 'tail_tip'),
]
BONE_LENGTH = Vector((0, .15, 0))
arm = bpy.data.armatures.new('Doryaspis_anatomical_rig')
rig = bpy.data.objects.new('Doryaspis', arm)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for name, head, parent in BONES:
    b = arm.edit_bones.new(name)
    b.head = head
    b.tail = Vector(head) + BONE_LENGTH
    b.use_deform = name != 'root'
    if parent:
        b.parent = arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)

# ------------------------------------------------------------- appearance
normal_px, rough_px = appearance.microrelief()
SIZE = normal_px.shape[0]


def image_from(name, rgb, non_color):
    """Write a generated map to disk and load it back.

    A purely in-memory generated image does not survive a blend save and never
    reaches the glTF exporter -- the first material study rendered a black
    roughness map, and mirror-black armour, for exactly that reason.
    """
    im = bpy.data.images.new(name, width=SIZE, height=SIZE, alpha=False,
                             float_buffer=False, is_data=non_color)
    flat = np.ones((SIZE, SIZE, 4), dtype=np.float32)
    flat[:, :, :3] = rgb
    im.pixels.foreach_set(flat.reshape(-1))
    im.update()
    im.filepath_raw = str(BAKE / (name + '.png'))
    im.file_format = 'PNG'
    im.save()
    bpy.data.images.remove(im)
    im = bpy.data.images.load(str(BAKE / (name + '.png')), check_existing=False)
    if non_color:
        im.colorspace_settings.name = 'Non-Color'
    im.pack()
    return im


NORMAL_MAP = image_from('doryaspis-microrelief-normal', normal_px, True)
ROUGH_MAP = image_from('doryaspis-microrelief-roughness',
                       np.repeat(rough_px[:, :, None], 3, axis=2), True)


def make_material(name, textured, roughness=.62, specular=.17):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes.get('Principled BSDF')
    bs.inputs['IOR'].default_value = 1.22
    bs.inputs['Specular IOR Level'].default_value = specular
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    nt.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
    if textured:
        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.image = NORMAL_MAP
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(tx.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
        tr = nt.nodes.new('ShaderNodeTexImage')
        tr.image = ROUGH_MAP
        nt.links.new(tr.outputs['Color'], bs.inputs['Roughness'])
    else:
        bs.inputs['Roughness'].default_value = roughness
    return m


# The full model carries no base-colour texture at all: all pigment is in
# COLOR_0, which glTF multiplies into a white base factor, so nothing is
# multiplied twice and the reduced model keeps exactly the same colour.
ARMOUR = make_material('doryaspis armour', True)
MUCOSA = make_material('doryaspis oral mucosa', False, roughness=.54)
EYEMAT = make_material('doryaspis eye', False, roughness=.22, specular=.48)
objects = []


def mesh(name, vertices, faces, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata([to_blender(v) for v in vertices], [], faces)
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = rig
    me.materials.append(mat)
    for f in me.polygons:
        f.use_smooth = True
    objects.append(ob)
    return ob


def boolean(target, tool, operation, label):
    bpy.context.view_layer.objects.active = target
    md = target.modifiers.new(label, 'BOOLEAN')
    md.operation = operation
    md.solver = 'EXACT'
    md.object = tool
    bpy.ops.object.modifier_apply(modifier=md.name)
    objects.remove(tool)
    bpy.data.objects.remove(tool, do_unlink=True)


def triangulate(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(ob.data)
    bm.free()


# ------------------------------------------------------------- the sculpt
g = design.all_base_geometry()
head = mesh(HEAD_MESH, *g['body'], ARMOUR)
head['anatomyRole'] = 'continuous_rigid_shield_saw_cornua_and_flexible_posterior'
for part in ('cornual_left', 'cornual_right', 'pseudorostrum', 'caudal_membrane'):
    boolean(head, mesh(part, *g[part], ARMOUR), 'UNION', 'Continuous attachment ' + part)

# The mouth: a real recessed chamber behind a smooth continuous rim, bored
# horizontally through the blunt front face of the snout, above the saw's root.
head.data.materials.append(MUCOSA)
cutter = mesh('temporary_terminal_oral_volume', *g['oral_cutter'], ARMOUR)
cutter.data.materials.clear()
cutter.data.materials.append(ARMOUR)
cutter.data.materials.append(MUCOSA)
for f in cutter.data.polygons:
    f.material_index = 1
boolean(head, cutter, 'DIFFERENCE', 'Terminal forward-facing oral chamber')
triangulate(head)
oral_points = [head.data.vertices[i].co for f in head.data.polygons
               if f.material_index == 1 for i in f.vertices]
assert oral_points, 'STOP: the oral boolean cut nothing'
assert max(p.z for p in oral_points) < design.ANATOMY_SUMMARY['dorsalRoofYOverMouth'] - .05
assert min(-p.y for p in oral_points) > design.ORAL[0][0] - .02


def ellipsoid(name, center, axes, mat):
    n, m = 48, 24
    c = Vector(center)
    a, b, d = [Vector(q) for q in axes]
    v = [tuple(c + d)]
    for j in range(1, m):
        t = pi * j / m
        v.extend(tuple(c + a * (sin(t) * cos(s)) + b * (sin(t) * sin(s)) + d * cos(t))
                 for s in [2 * pi * k / n for k in range(n)])
    end = len(v)
    v.append(tuple(c - d))
    f = [(0, 1 + k, 1 + (k + 1) % n) for k in range(n)]
    for j in range(m - 2):
        f.extend((1 + j * n + k, 1 + (j + 1) * n + k, 1 + (j + 1) * n + (k + 1) % n,
                  1 + j * n + (k + 1) % n) for k in range(n))
    f.extend((end, 1 + (m - 2) * n + (k + 1) % n, 1 + (m - 2) * n + k) for k in range(n))
    # `mesh` re-maps clay coordinates; these centres are already authoring-space.
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    ob.parent = rig
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    objects.append(ob)
    return ob


# One small single branchial outlet under each rear flank.
bfore, bvert, binward = design.BRANCHIAL_RADII
for side in (-1, 1):
    tree = BVHTree.FromPolygons([v.co for v in head.data.vertices],
                                [p.vertices for p in head.data.polygons])
    seed = Vector(to_blender((side * design.BRANCHIAL_SEED[0],
                              design.BRANCHIAL_SEED[1], design.BRANCHIAL_SEED[2])))
    surf, norm, idx, dist = tree.find_nearest(seed)
    if norm.x * side < 0:
        norm = -norm
    fore = Vector((0, -1, 0))
    fore = (fore - norm * fore.dot(norm)).normalized()
    vert = norm.cross(fore).normalized()
    tool = ellipsoid('temporary_branchial_volume', surf - norm * .016,
                     (fore * bfore, vert * bvert, norm * binward), ARMOUR)
    tool.data.materials.clear()
    tool.data.materials.append(ARMOUR)
    tool.data.materials.append(MUCOSA)
    for f in tool.data.polygons:
        f.material_index = 1
    boolean(head, tool, 'DIFFERENCE', 'Single branchial outlet ' + str(side))
triangulate(head)

# Eyes seated in the flank orbits.  The seat must be a lateral surface and the
# globe is inset only as far as the visibility target needs; nothing here
# buries an eye to make the audit's number look better.
tree = BVHTree.FromPolygons([v.co for v in head.data.vertices],
                            [p.vertices for p in head.data.polygons])
rng = np.random.default_rng(20260912)
cloud = rng.uniform(-1, 1, (80000, 3))
cloud = cloud[(cloud * cloud).sum(1) <= 1]
eye_evidence = []
for side in (-1, 1):
    seed = Vector(to_blender((side * design.EYE_SEED[0], design.EYE_SEED[1],
                              design.EYE_SEED[2])))
    surf, norm, idx, dist = tree.find_nearest(seed)
    if norm.x * side < 0:
        norm = -norm
    assert abs(norm.x) > .55, 'STOP: eye seat is not a flank surface'
    fore = Vector((0, -1, 0))
    fore = (fore - norm * fore.dot(norm)).normalized()
    vert = norm.cross(fore).normalized()
    rn, ru, rv = design.EYE_RADII
    depth, fraction = 0., 0.
    while depth < rn * 1.2:
        center = surf - norm * depth
        pts = [center + norm * float(p[0]) * rn + fore * float(p[1]) * ru
               + vert * float(p[2]) * rv for p in cloud]
        hits = sum((p - tree.find_nearest(p)[0]).dot(tree.find_nearest(p)[1]) < 0
                   for p in pts)
        fraction = hits / len(pts)
        if fraction >= design.EYE_VISIBLE_TARGET:
            break
        depth += .002
    assert fraction >= design.EYE_VISIBLE_FLOOR, 'STOP: eye seat below the floor'
    name = 'eye_globe_L' if side > 0 else 'eye_globe_R'
    ob = ellipsoid(name, center, (fore * ru, vert * rv, norm * rn), EYEMAT)
    ob['anatomyRole'] = 'flank_seated_eye_globe'
    eye_evidence.append({'mesh': name, 'surroundingMeshes': [HEAD_MESH],
                         'seatBlender': list(surf), 'normal': list(norm),
                         'centerBlender': list(center), 'centerInset': round(depth, 4),
                         'radiiForeVertNormal': [ru, rv, rn],
                         'embeddedFraction': round(fraction, 4), 'sampleCount': len(cloud),
                         'method': 'seeded uniform ellipsoid volume samples against the '
                                   'closed head BVH signed nearest surface'})

# ---------------------------------------------------------------- pigment
U_TILES, V_SCALE = 14.0, 3.0
AXIS_FWD = np.array([-b[0] for b in design.BODY][::-1])       # ascending Blender y
AXIS_UP = np.array([(b[3] + b[4]) / 2 for b in design.BODY][::-1])
ROST_Z = np.array([r[0] for r in design.ROSTRUM])
ROST_Y = np.array([r[2] for r in design.ROSTRUM])
ROST_H = np.array([r[3] for r in design.ROSTRUM])
BODY_Z = np.array([b[0] for b in design.BODY])
BODY_W = np.array([b[2] for b in design.BODY])


def regions(clay):
    """(posterior mask, tip fraction, suture distance) for clay-space points."""
    x, y, z = clay[:, 0], clay[:, 1], clay[:, 2]
    half = np.interp(z, BODY_Z, BODY_W, left=0, right=0)
    ry = np.interp(z, ROST_Z, ROST_Y, left=0, right=ROST_Y[-1])
    rh = np.interp(z, ROST_Z, ROST_H, left=0, right=0)
    on_saw = (z > design.ORAL_PLANE - .05) & (y < ry + rh * 1.05)
    saw_t = np.clip((z - design.ORAL_PLANE)
                    / (design.ROSTRUM[-1][0] - design.ORAL_PLANE), 0, 1)
    on_horn = np.abs(x) > half * .96
    edge = np.maximum(half, .05)
    horn_t = np.clip((np.abs(x) - edge)
                     / np.maximum(.05, design.CORNUA[-1][0] - edge), 0, 1)
    tip = np.where(on_saw, saw_t, 0) + np.where(on_horn & ~on_saw, horn_t, 0)
    sut = np.array([design.suture_distance(float(a), float(b)) for a, b in zip(x, z)])
    return z < design.SHIELD_BACK + .10, np.clip(tip, 0, 1), sut


def apply_appearance(ob, is_eye):
    me = ob.data
    blend = np.array([v.co[:] for v in me.vertices])
    nrm = np.array([v.normal[:] for v in me.vertices])
    clay = np.column_stack([blend[:, 0], blend[:, 2], -blend[:, 1]])
    if is_eye:
        rgb = appearance.pigment(clay, 'eye')
    else:
        oral = np.zeros(len(clay), bool)
        for f in me.polygons:
            if f.material_index == 1:
                oral[list(f.vertices)] = True
        up = np.clip((nrm[:, 2] + .32) / 1.05, 0, 1)
        up = up * up * (3 - 2 * up)
        posterior, tip, sut = regions(clay)
        rgb = np.zeros((len(clay), 3))
        for mask, kind in ((~posterior, 'armour'), (posterior, 'posterior')):
            if mask.any():
                rgb[mask] = appearance.pigment(clay[mask], kind, dorsal=up[mask],
                                               suture_distance=sut[mask],
                                               tip_fraction=tip[mask])
        if oral.any():
            rgb[oral] = appearance.pigment(clay[oral], 'oral')
    attr = me.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    buf = np.ones((len(clay), 4), dtype=np.float32)
    buf[:, :3] = rgb
    attr.data.foreach_set('color', buf.reshape(-1))
    # One cylindrical parameterisation for the tiled microrelief.  The angular
    # span is an integer number of tiles, so only faces straddling the wrap
    # need their loops shifted and the seam itself is invisible.
    uv = me.uv_layers.new(name='UVMap')
    coords = {}
    for v in me.vertices:
        cz = float(np.interp(v.co.y, AXIS_FWD, AXIS_UP))
        a = (atan2(v.co.z - cz, v.co.x) / (2 * pi)) % 1.0
        coords[v.index] = (a * U_TILES, (-v.co.y + 3.4) * V_SCALE)
    for f in me.polygons:
        vals = [coords[me.loops[li].vertex_index] for li in f.loop_indices]
        if max(u for u, _ in vals) - min(u for u, _ in vals) > U_TILES / 2:
            vals = [(u + U_TILES if u < U_TILES / 2 else u, v) for u, v in vals]
        for li, p in zip(f.loop_indices, vals):
            uv.data[li].uv = p
    return rgb


for ob in objects:
    apply_appearance(ob, ob.name in EYE_MESHES)

# The rigid dermal aperture is a real material boundary: do not smooth the
# outer armour normal through the inward mucosal wall.
edge_materials = {}
for f in head.data.polygons:
    for e in f.edge_keys:
        edge_materials.setdefault(tuple(sorted(e)), set()).add(f.material_index)
for e in head.data.edges:
    mats = edge_materials.get(tuple(sorted(e.vertices)), set())
    if 1 in mats and len(mats) > 1:
        e.use_edge_sharp = True

# ---------------------------------------------------------------- skinning
TAIL_ROWS = [(1.05, 'body'), (1.20, 'tail_base'), (1.75, 'tail_mid'),
             (2.30, 'tail_distal'), (2.80, 'tail_tip'), (3.15, 'caudal')]


def tail_weights(y):
    if y <= TAIL_ROWS[0][0]:
        return {'shield': 1.}
    if y >= TAIL_ROWS[-1][0]:
        return {'caudal': 1.}
    for (a, an), (b, bn) in zip(TAIL_ROWS, TAIL_ROWS[1:]):
        if a <= y <= b:
            t = (y - a) / (b - a)
            t = t * t * (3 - 2 * t)
            return {an: 1 - t, bn: t}
    return {'shield': 1.}


ORAL_APERTURE_Y = -design.ORAL_PLANE
ORAL_DEPTH = design.ORAL_DEPTH
for ob in objects:
    me = ob.data
    groups = {}
    for name, _, _ in BONES:
        if name != 'root':
            groups[name] = ob.vertex_groups.new(name=name)
    for v in me.vertices:
        for g, w in tail_weights(v.co.y).items():
            groups[g].add([v.index], w, 'REPLACE')
    if ob is head:
        oral_v, armour_v = set(), set()
        for f in me.polygons:
            (oral_v if f.material_index == 1 else armour_v).update(f.vertices)
        for vi in oral_v - armour_v:
            p = me.vertices[vi].co
            t = p.y - ORAL_APERTURE_Y
            if not 0 < t < ORAL_DEPTH:
                continue
            a = atan2(p.z / .058, p.x / .105)
            g = ('oral_L' if cos(a) > .55 else 'oral_R' if cos(a) < -.55
                 else 'oral_upper' if sin(a) > 0 else 'oral_lower')
            w = .72 * sin(pi * t / ORAL_DEPTH) ** 2
            groups['shield'].add([vi], 1 - w, 'REPLACE')
            groups[g].add([vi], w, 'REPLACE')
    md = ob.modifiers.new('Anatomical motion', 'ARMATURE')
    md.object = rig

# ---------------------------------------------------------------- sockets
ANCHORS = [
    ('anchor_mouth', 'shield', to_blender((0, .012, design.ORAL_PLANE - .01)), 'mouth'),
    ('anchor_mouth_inside', 'shield', to_blender((0, .014, design.ORAL_PLANE - .30)), 'swallow'),
    ('anchor_attack_primary', 'shield',
     to_blender((0, design.ROSTRUM[-1][2], design.ROSTRUM[-1][0])), 'attack'),
]
for name, bone, point, role in ANCHORS:
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.parent = rig
    o.parent_type = 'BONE'
    o.parent_bone = bone
    o.matrix_parent_inverse = rig.pose.bones[bone].matrix.inverted()
    o.location = Vector(point) - BONE_LENGTH
    o['cambrianAnchor'] = {'version': 1, 'role': role, 'parentBone': bone}
(OUT / 'anchors.json').write_text(json.dumps(
    {'doryaspis': [{'name': n, 'bone': b, 'point': list(p), 'role': r}
                   for n, b, p, r in ANCHORS]}, indent=2) + '\n')

# ------------------------------------------------------------------ clips
# V2's eighteen actions, names, durations and loop set unchanged, plus Grab.
CLIPS = {'Idle': 2.4, 'Swim': 2.4, 'TurnLeft': 1.6, 'TurnRight': 1.6, 'Dive': 1.4,
         'Rise': 1.4, 'Attack': 1., 'Bite': .5, 'Heavy': 1.1, 'Hit': .6, 'Death': 1.6,
         'Guard': 1., 'Parry': 11 / 30, 'Dodge': .4, 'Eat': 1.6, 'Stagger': 1.2,
         'Ability': 2.4, 'Growth': 1.5, 'Grab': .9}
LOOPS = ['Idle', 'Swim', 'Guard', 'Eat', 'Grab']


def ease(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


def pulse(t, a, b, c):
    return ease((t - a) / (b - a)) if t <= b else 1 - ease((t - b) / (c - b))


rig.animation_data_create()
for name, duration in CLIPS.items():
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data.action = act
    frames = round(duration * 30)
    for frame in range(frames + 1):
        t = frame / frames
        ph = 2 * pi * t
        env = sin(pi * t) ** 2
        for pb in rig.pose.bones:
            pb.rotation_mode = 'XYZ'
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)

        def rot(n, x=0., y=0., z=0.):
            rig.pose.bones[n].rotation_euler = (x, y, z)

        def wave(amp, phase=ph, en=1., vertical=0.):
            for j, b in enumerate(['tail_base', 'tail_mid', 'tail_distal',
                                   'tail_tip', 'caudal']):
                rot(b, z=amp * (.26 + .22 * j) * sin(phase - .73 * j) * en,
                    x=vertical * sin(phase - .55 * j) * en)

        def oral(amount, phase=ph):
            rig.pose.bones['oral_L'].location.x = .008 * amount
            rig.pose.bones['oral_R'].location.x = -.008 * amount
            rig.pose.bones['oral_upper'].location = (0, 0, -.007 * amount)
            rig.pose.bones['oral_lower'].location = (0, .0025 * amount, .005 * amount)

        if name == 'Idle':
            wave(.12, vertical=.018)
            rot('body', x=.013 * sin(ph), y=.020 * sin(ph + .4))
            oral(.20 * (1 - cos(ph * 2)))
        elif name == 'Swim':
            phase = ph * 2 + .36 * sin(ph * 2)
            burst = .50 + .50 * (.5 + .5 * cos(ph)) ** 2
            wave(.36, phase, burst, .027)
            rot('body', z=.028 * sin(phase + .2), x=.025 * sin(ph - .4))
            oral(.22 * (1 - cos(ph * 2)))
        elif name == 'Guard':
            wave(.18, vertical=.038)
            rot('body', x=.038 * (1 - cos(ph)), y=.04 * sin(ph))
            oral(.27 * (1 - cos(ph)))
        elif name == 'Eat':
            wave(.15, ph * 2, 1, .016)
            oral((.5 - .5 * cos(ph * 3)) * (.72 + .28 * cos(ph) ** 2))
            rot('body', x=-.035 * (1 - cos(ph)), z=.016 * sin(ph))
            rot('caudal', x=.045 * sin(ph), z=.21 * sin(ph * 2 - 2))
        elif name == 'Grab':
            # Held: the front is steady and braced, the posterior only trims,
            # and the oral lining presses rhythmically on what is held.
            press = .5 - .5 * cos(ph)
            wave(.085, ph, 1, .010)
            rot('body', x=-.042 + .014 * press, y=.011 * sin(ph), z=.010 * sin(ph))
            rot('tail_base', z=.055 * sin(ph), x=.020 * sin(ph))
            oral(.32 + .26 * press)
        else:
            wave(.26, ph, env, .025)
            oral(.18 * env)
            if name in ['TurnLeft', 'TurnRight']:
                s = 1 if name == 'TurnLeft' else -1
                q = pulse(t, 0, .38, 1)
                rot('body', z=s * .43 * q, y=-s * .25 * q)
                rot('tail_base', z=-s * .30 * q)
                rot('tail_mid', z=-s * .38 * pulse(t, .06, .45, .92))
                rot('tail_distal', z=s * .25 * pulse(t, .16, .56, 1))
                rot('caudal', z=s * .49 * pulse(t, .22, .64, 1), x=.08 * q)
            elif name in ['Dive', 'Rise']:
                s = 1 if name == 'Dive' else -1
                q = pulse(t, 0, .40, 1)
                rot('body', x=s * .31 * q)
                wave(.25, ph + .4, env, -s * .105)
                rot('caudal', x=-s * .22 * pulse(t, 0, .26, .88), z=.24 * sin(ph - 1) * env)
            elif name == 'Attack':
                q = pulse(t, .02, .43, .85)
                rot('body', x=-.14 * pulse(t, .02, .25, .60) + .12 * pulse(t, .38, .60, .94))
                rig.pose.bones['body'].location.y = .12 * pulse(t, 0, .19, .42) - .27 * pulse(t, .25, .48, .92)
                wave(.43, ph + 1.2 * q, env, .05)
                oral(.85 * pulse(t, .16, .42, .72))
            elif name == 'Bite':
                q = pulse(t, .02, .32, .82)
                oral(q)
                rot('body', x=-.07 * q, z=.03 * sin(ph) * env)
                wave(.18, ph + .5, env, .02)
            elif name == 'Heavy':
                q = pulse(t, .04, .45, .9)
                rot('body', x=-.18 * pulse(t, 0, .28, .55) + .21 * pulse(t, .35, .61, 1), y=.12 * q)
                rig.pose.bones['body'].location.y = .13 * pulse(t, 0, .22, .46) - .32 * pulse(t, .34, .59, 1)
                wave(.49, ph + 1.8 * q, env, .08)
                oral(.70 * pulse(t, .20, .39, .75))
            elif name == 'Dodge':
                q = pulse(t, 0, .34, 1)
                rot('body', y=-.48 * q, z=.39 * q)
                rig.pose.bones['body'].location.x = .32 * q
                rot('tail_base', z=-.48 * q)
                rot('tail_mid', z=-.40 * pulse(t, .04, .43, .93))
                rot('tail_distal', z=.43 * pulse(t, .12, .53, 1))
                rot('caudal', z=.53 * pulse(t, .18, .64, 1), x=.12 * q)
            elif name == 'Parry':
                q = pulse(t, 0, .25, 1)
                rot('body', y=.38 * q, z=-.23 * q)
                wave(.39, ph + 1, env, .08)
                rot('caudal', z=.44 * pulse(t, .06, .44, 1))
            elif name in ['Hit', 'Stagger']:
                shock = sin((3 if name == 'Hit' else 5) * pi * t) * env
                rot('body', z=.28 * shock, y=.16 * env, x=.075 * shock)
                wave(.42, ph * 1.4, env, .08)
                oral(.4 * env)
            elif name == 'Ability':
                q = pulse(t, .04, .37, .80)
                rot('body', x=-.24 * q, y=.18 * sin(ph) * env,
                    z=.19 * pulse(t, .36, .60, .91) - .12 * pulse(t, .03, .20, .42))
                wave(.34, ph * 1.4 + .4, env, .11)
                oral(.80 * pulse(t, .18, .40, .63) + .35 * pulse(t, .66, .79, .95))
            elif name == 'Growth':
                q = pulse(t, 0, .48, 1)
                rot('body', x=-.08 * q, y=.08 * sin(ph) * env)
                wave(.20, ph, env, .055)
                oral(.30 * q)
            elif name == 'Death':
                q = ease(t / .82)
                kick = sin(ph * 2.5) * (1 - t) * env * (1 - ease((t - .58) / .26))
                rot('body', y=1.14 * q, x=.13 * q, z=-.08 * q)
                rig.pose.bones['body'].location.z = -.12 * q
                rot('tail_base', z=.18 * q + .12 * kick)
                rot('tail_mid', z=.17 * q + .22 * kick)
                rot('tail_distal', z=.12 * q + .30 * kick)
                rot('caudal', z=-.22 * q + .38 * kick, x=-.12 * q)
                oral(.22 * q)
        for pb in rig.pose.bones:
            if pb.name in ['root', 'shield']:
                continue
            pb.keyframe_insert(data_path='rotation_euler', frame=frame + 1, group=pb.name)
            if pb.name == 'body' or pb.name.startswith('oral_'):
                pb.keyframe_insert(data_path='location', frame=frame + 1, group=pb.name)
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_euler = (0, 0, 0)
    pb.location = (0, 0, 0)
scene.frame_set(1)
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL / 'doryaspis-v3.blend'))

# ----------------------------------------------------------------- export
def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for o in objects:
        o.select_set(True)
    for n, _, _, _ in ANCHORS:
        bpy.data.objects[n].select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=True, export_frame_range=False,
        export_optimize_animation_size=True,
        export_optimize_animation_keep_anim_armature=False,
        export_skins=True, export_normals=True, export_tangents=True,
        export_vertex_color='NAME', export_vertex_color_name='Color',
        export_all_vertex_colors=False, export_extras=True, export_yup=True)


export(OUT / 'doryaspis.glb')

# LOD: drop every texture, keep the same COLOR_0 pigment, physically reduce,
# and keep only the three clips the runtime plays at distance.
for m in (ARMOUR, MUCOSA, EYEMAT):
    nt = m.node_tree
    bs = nt.nodes.get('Principled BSDF')
    for n in [n for n in nt.nodes if n.bl_idname in ('ShaderNodeTexImage', 'ShaderNodeNormalMap')]:
        nt.nodes.remove(n)
    bs.inputs['Roughness'].default_value = .62
    vc = next(n for n in nt.nodes if n.bl_idname == 'ShaderNodeVertexColor')
    nt.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
for o in objects:
    if len(o.data.polygons) > 2000:
        d = o.modifiers.new('Actual reduced LOD', 'DECIMATE')
        d.ratio = .27
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_move_up(modifier=d.name)
        bpy.ops.object.modifier_apply(modifier=d.name)
for o in bpy.data.objects:
    if o.type == 'MESH' and len(o.data.materials) > 1:
        first = o.data.materials[0]
        o.data.materials.clear()
        o.data.materials.append(first)
        for f in o.data.polygons:
            f.material_index = 0
for a in list(bpy.data.actions):
    if a.name not in ['Idle', 'Swim', 'Death']:
        bpy.data.actions.remove(a)
bpy.context.view_layer.update()
export(OUT / 'doryaspis.lod1.glb')

meta = {
    'id': 'doryaspis', 'name': 'Doryaspis', 'species': 'Doryaspis nathorsti',
    'provenance': 'Early Devonian, Wood Bay Formation, Spitsbergen, Svalbard',
    'description': 'A jawless fish with a low domed head shield over a deep ventral bowl, '
                   'rigid cornual plates, a terminal forward-facing mouth on the front of '
                   'the snout and a fixed pseudorostral saw projecting from the lower jaw '
                   'beneath it; flexible scaled posterior with a hypocercal tail.',
    'lengthMeters': .20, 'modelLength': design.ANATOMY_SUMMARY['totalLength'],
    'locomotion': 'Swim', 'clips': list(CLIPS), 'looping': LOOPS,
    'anchors': [a[0] for a in ANCHORS], 'eyes': eye_evidence, 'artVersion': 3,
    'sources': ['https://doi.org/10.1038/s42003-024-06837-8',
                'https://doi.org/10.1671/0272-4634(2002)022[0735:TGDWHF]2.0.CO;2',
                'https://www.app.pan.pl/archive/published/app07/app07-249.pdf'],
    'anatomy': design.ANATOMY_SUMMARY,
    'notes': [
        'V3 is a complete new sculpture, not a reskin of V2. The mouth is terminal: a real '
        'recessed chamber bored horizontally through the blunt front face of the snout, '
        'directly above the pseudorostral root. There is no dorsal or upward aperture.',
        'The pseudorostrum grows out of the lower front of the snout as a protruding lower '
        'jaw, and remains fixed: this animal is jawless and nothing here hinges or gapes.',
        'Cornual plates are rigid armour continuous with the shield at wide thick roots, at '
        'full length; they are not hinged appendages or paired fins.',
        'All pigment ships in COLOR_0 for both levels and no base-colour texture exists, so '
        'nothing is multiplied twice; the full model carries only a tiled microrelief normal '
        'and roughness pair, which the reduced model drops.',
        'Living pigmentation, soft oral lining and action timing are artistic interpretation.',
        'Enlarged authoring coordinates; lengthMeters is the representative ecological size '
        'and modelLength supports runtime normalization.'],
}
(OUT / 'doryaspis.json').write_text(json.dumps(meta, indent=2) + '\n')
(OUT / 'audit-selectors.json').write_text(json.dumps(
    {'doryaspis': {'headMesh': HEAD_MESH, 'eyeMeshes': EYE_MESHES}}, indent=1) + '\n')
(HERE / 'eyes-v3.json').write_text(json.dumps(eye_evidence, indent=2) + '\n')
print('DORYASPIS_V3_CANDIDATE_READY', str(OUT), flush=True)
