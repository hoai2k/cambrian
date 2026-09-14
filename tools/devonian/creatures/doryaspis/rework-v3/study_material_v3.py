"""Doryaspis V3 material study: pigment and microrelief on the approved clay.

    /opt/blender/blender -b <clay>/doryaspis-<clay>.blend --threads 1 \
        --python-exit-code 1 \
        --python tools/devonian/creatures/doryaspis/rework-v3/study_material_v3.py \
        -- <clay-variant> <study-variant>

Loads the frozen clay blend, applies exactly the appearance the production
builder will apply -- `materials_v3.pigment` as per-vertex COLOR_0 and
`materials_v3.microrelief` as one tiled normal/roughness set -- and renders
nine views into `<authoring>/doryaspis/rework-v3/<study-variant>/renders/`.

Nothing here is the production export; this stage only decides whether the
colour and the relief are right before the rig is authored.
"""
import bpy
import bmesh
import json
import sys
import hashlib
from pathlib import Path
from math import atan2, pi
import numpy as np
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CLAY = argv[0] if argv else 'clay02d'
STUDY = argv[1] if len(argv) > 1 else 'material01'
ROOT = REPO.parent / 'devonian-authoring/doryaspis/rework-v3'
OUT = ROOT / STUDY
RENDERS = OUT / 'renders'
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import geometry_clay02 as design
import materials_v3 as appearance

OUT.mkdir(parents=True, exist_ok=True)
RENDERS.mkdir(exist_ok=True)
scene = bpy.context.scene
body = bpy.data.objects['Doryaspis_continuous_shield_posterior']
eyes = [bpy.data.objects[n] for n in ('Clay_eye_L', 'Clay_eye_R')]

# ---------------------------------------------------------------- appearance
normal_px, rough_px = appearance.microrelief()
SIZE = normal_px.shape[0]


BAKE = ROOT / 'v3-bake'
BAKE.mkdir(parents=True, exist_ok=True)


def image_from(name, rgb, non_color):
    """Write a generated map to disk and load it back.

    A purely in-memory generated image does not survive a blend save and does
    not reach the glTF exporter: the first material study rendered a black
    roughness map (mirror-black armour) for exactly that reason.  Saving the
    PNG and reloading it is what makes the map real.
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


def armour_material(name, textured):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bs = nt.nodes.get('Principled BSDF')
    bs.inputs['IOR'].default_value = 1.22
    bs.inputs['Specular IOR Level'].default_value = .17
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    nt.links.new(vc.outputs['Color'], bs.inputs['Base Color'])
    if textured:
        tx = nt.nodes.new('ShaderNodeTexImage')
        tx.image = NORMAL_MAP
        tx.interpolation = 'Smart'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = 1.0
        nt.links.new(tx.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bs.inputs['Normal'])
        tr = nt.nodes.new('ShaderNodeTexImage')
        tr.image = ROUGH_MAP
        nt.links.new(tr.outputs['Color'], bs.inputs['Roughness'])
    else:
        bs.inputs['Roughness'].default_value = .62
    return m


ARMOUR = armour_material('doryaspis armour', True)
MUCOSA = armour_material('doryaspis oral mucosa', False)
MUCOSA.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value = .54
EYEMAT = armour_material('doryaspis eye', False)
eb = EYEMAT.node_tree.nodes.get('Principled BSDF')
eb.inputs['Roughness'].default_value = .22
eb.inputs['Specular IOR Level'].default_value = .48

body.data.materials.clear()
body.data.materials.append(ARMOUR)
body.data.materials.append(MUCOSA)
for o in eyes:
    o.data.materials.clear()
    o.data.materials.append(EYEMAT)

# ------------------------------------------------------------ region fields
ROST_Z = np.array([r[0] for r in design.ROSTRUM])
ROST_W = np.array([r[1] for r in design.ROSTRUM])
ROST_Y = np.array([r[2] for r in design.ROSTRUM])
ROST_H = np.array([r[3] for r in design.ROSTRUM])
BODY_Z = np.array([b[0] for b in design.BODY])
BODY_W = np.array([b[2] for b in design.BODY])
CORN_X = np.array([c[0] for c in design.CORNUA])


def regions(points):
    """(kind flags, suture distance, tip fraction) for clay-space points."""
    x, y, z = points[:, 0], points[:, 1], points[:, 2]
    half = np.interp(z, BODY_Z, BODY_W, left=0, right=0)
    # On the saw: forward of the front face, or below the ventral line inside
    # the rostral envelope.
    ry = np.interp(z, ROST_Z, ROST_Y, left=0, right=ROST_Y[-1])
    rh = np.interp(z, ROST_Z, ROST_H, left=0, right=0)
    on_saw = (z > design.ORAL_PLANE - .05) & (y < ry + rh * 1.05)
    saw_t = np.clip((z - design.ORAL_PLANE) / (design.ROSTRUM[-1][0] - design.ORAL_PLANE), 0, 1)
    on_horn = np.abs(x) > half * .96
    edge = np.maximum(half, .05)
    horn_t = np.clip((np.abs(x) - edge) / np.maximum(.05, CORN_X[-1] - edge), 0, 1)
    tip = np.where(on_saw, saw_t, 0) + np.where(on_horn & ~on_saw, horn_t, 0)
    posterior = z < design.SHIELD_BACK + .10
    sut = np.array([design.suture_distance(float(a), float(b)) for a, b in zip(x, z)])
    return posterior, np.clip(tip, 0, 1), sut


def apply_pigment(ob, kinds):
    me = ob.data
    pts = np.array([v.co[:] for v in me.vertices])
    nrm = np.array([v.normal[:] for v in me.vertices])
    # How upward-facing the surface is: 0 at the keel, 1 on the roof.
    up = np.clip((nrm[:, 1] + .32) / 1.05, 0, 1)
    up = up * up * (3 - 2 * up)
    if kinds == 'eye':
        rgb = appearance.pigment(pts, 'eye')
    else:
        oral = np.zeros(len(pts), bool)
        for f in me.polygons:
            if f.material_index == 1:
                oral[list(f.vertices)] = True
        posterior, tip, sut = regions(pts)
        rgb = np.zeros((len(pts), 3))
        for mask, kind in ((~posterior, 'armour'), (posterior, 'posterior')):
            if mask.any():
                rgb[mask] = appearance.pigment(pts[mask], kind, dorsal=up[mask],
                                               suture_distance=sut[mask],
                                               tip_fraction=tip[mask])
        if oral.any():
            rgb[oral] = appearance.pigment(pts[oral], 'oral')
    attr = me.color_attributes.get('Color') or me.color_attributes.new(
        name='Color', type='FLOAT_COLOR', domain='POINT')
    buf = np.ones((len(pts), 4), dtype=np.float32)
    buf[:, :3] = rgb
    attr.data.foreach_set('color', buf.reshape(-1))
    return rgb


body_rgb = apply_pigment(body, 'body')
print('PIGMENT linear min/mean/max', body_rgb.min(0).round(4).tolist(),
      body_rgb.mean(0).round(4).tolist(), body_rgb.max(0).round(4).tolist(), flush=True)
for o in eyes:
    apply_pigment(o, 'eye')

# -------------------------------------------------------------------- UVs
# One cylindrical parameterisation around the body's own descending axis.
# The angular span is an integer number of tiles, so the wrap is seamless and
# only the faces that straddle it need their loops shifted.
U_TILES, V_SCALE = 14.0, 3.0
AXIS_Z = np.array([b[0] for b in design.BODY])
AXIS_Y = np.array([(b[3] + b[4]) / 2 for b in design.BODY])
for ob in [body] + eyes:
    me = ob.data
    uv = me.uv_layers.get('UVMap') or me.uv_layers.new(name='UVMap')
    coords = {}
    for v in me.vertices:
        cy = float(np.interp(v.co.z, AXIS_Z, AXIS_Y))
        a = (atan2(v.co.y - cy, v.co.x) / (2 * pi)) % 1.0
        coords[v.index] = (a * U_TILES, (v.co.z + 3.4) * V_SCALE)
    for f in me.polygons:
        vals = [coords[me.loops[li].vertex_index] for li in f.loop_indices]
        if max(u for u, _ in vals) - min(u for u, _ in vals) > U_TILES / 2:
            vals = [(u + U_TILES if u < U_TILES / 2 else u, v) for u, v in vals]
        for li, p in zip(f.loop_indices, vals):
            uv.data[li].uv = p

# ------------------------------------------------------------------ render
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 760
scene.render.resolution_y = 480
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.world = bpy.data.worlds.new('Neutral studio')
scene.world.use_nodes = True
bgn = scene.world.node_tree.nodes.get('Background')
bgn.inputs[0].default_value = (.13, .15, .17, 1)
bgn.inputs[1].default_value = .60
for name, loc, energy, color, size in [
    ('Broad warm key', (3.5, 5.5, 4.0), 900, (1., .94, .86), 5.0),
    ('Soft cool fill', (-4.0, 2.2, 1.0), 560, (.82, .90, 1.), 5.0),
    ('Rear contour light', (1.0, 3.5, -5.0), 950, (.94, .97, 1.), 4.0),
    ('Ventral bounce', (-1.0, -4.0, 1.0), 320, (.91, .92, .96), 4.5),
    ('Snout raking light', (2.2, .6, 5.2), 460, (1., .96, .90), 2.0),
]:
    d = bpy.data.lights.new(name, 'AREA')
    d.energy, d.color, d.shape, d.size = energy, color, 'DISK', size
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector((0, -.02, -.4)) - o.location).to_track_quat('-Z', 'Y').to_euler()
cd = bpy.data.cameras.new('Study camera')
cd.type = 'ORTHO'
cd.clip_start, cd.clip_end = .01, 100
cam = bpy.data.objects.new('Study camera', cd)
scene.collection.objects.link(cam)
scene.camera = cam
points = [ob.matrix_world @ v.co for ob in [body] + eyes for v in ob.data.vertices]


def orientation(back, up):
    back = Vector(back).normalized()
    right = Vector(up).cross(back).normalized()
    return Matrix((right, back.cross(right).normalized(), back)).transposed().to_4x4()


def fit(pts, back, up, margin=.10):
    rot = orientation(back, up)
    basis = rot.to_3x3()
    q = [basis.transposed() @ p for p in pts]
    lo = Vector(tuple(min(p[i] for p in q) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in q) for i in range(3)))
    cam.matrix_world = rot
    cam.location = basis @ ((lo + hi) * .5) + Vector(back).normalized() * 14
    cd.ortho_scale = 1
    bpy.context.view_layer.update()
    uvp = [world_to_camera_view(scene, cam, p) for p in pts]
    span = max(max(p.x for p in uvp) - min(p.x for p in uvp),
               max(p.y for p in uvp) - min(p.y for p in uvp))
    aspect = scene.render.resolution_x / scene.render.resolution_y
    cd.ortho_scale = span / (1 - 2 * margin) * max(1., aspect)
    bpy.context.view_layer.update()
    return {'orthoScale': cd.ortho_scale, 'position': list(cam.location), 'back': back}


def box(x, ylo, yhi, zlo, zhi):
    return [Vector((sx, sy, sz)) for sx in (-x, x) for sy in (ylo, yhi) for sz in (zlo, zhi)]


VIEWS = [
    ('01-three-quarter', points, (3.0, 2.25, 4.0), (0, 1, 0), .10),
    ('02-side', points, (1, 0, 0), (0, 1, 0), .10),
    ('03-front', points, (0, .08, 1), (0, 1, 0), .10),
    ('04-dorsal', points, (0, 1, 0), (0, 0, 1), .10),
    ('05-ventral', points, (0, -1, 0), (0, 0, 1), .10),
    ('06-posterior-quarter', points, (-3.0, 1.4, -4.0), (0, 1, 0), .10),
    ('07-oral-close', box(.42, -.46, .40, 1.02, 2.00), (.45, .22, 1.5), (0, 1, 0), .12),
    ('08-shield-dorsal-close', box(.95, -.10, .46, -1.30, 1.20), (.35, 1, .25), (0, 0, 1), .08),
    ('09-snout-side', box(.30, -.48, .44, .55, 2.92), (1, 0, 0), (0, 1, 0), .10),
]
records = []
for name, pts, back, up, margin in VIEWS:
    f = RENDERS / (name + '.png')
    if f.exists():
        print('DORYASPIS_MATERIAL_VIEW_SKIP', name, flush=True)
        continue
    rec = {'view': name, **fit(pts, back, up, margin)}
    scene.render.filepath = str(f)
    bpy.ops.render.render(write_still=True)
    rec['sha256'] = hashlib.sha256(f.read_bytes()).hexdigest()
    records.append(rec)
    (OUT / 'study-manifest.json').write_text(json.dumps(
        {'clay': CLAY, 'study': STUDY, 'views': records,
         'bumpSlope': appearance.BUMP_SLOPE, 'microTexture': SIZE,
         'uvTiles': [U_TILES, V_SCALE],
         'pigmentAnchorsSRGB': {'armourRoof': appearance.ARMOUR_ROOF,
                                'armourFlank': appearance.ARMOUR_FLANK,
                                'armourBelly': appearance.ARMOUR_BELLY,
                                'suture': appearance.SUTURE_PIGMENT,
                                'bonyTip': appearance.BONE_TIP,
                                'posteriorRoof': appearance.POSTERIOR_ROOF,
                                'posteriorBelly': appearance.POSTERIOR_BELLY,
                                'oral': appearance.ORAL_TISSUE},
         'status': 'review-needed, not visual approval'}, indent=2) + '\n')
    print('DORYASPIS_MATERIAL_VIEW_OK', name, flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / ('doryaspis-' + STUDY + '.blend')))
print('DORYASPIS_MATERIAL_STUDY_OK', str(OUT), flush=True)
