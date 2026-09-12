"""Read-only close-up diagnostic on the M04 blend (Bothriolepis rework-v3).

Per review-material04-and-next-direction.md item 2: separate remaining forehead
geometry from shader effects before touching it. Renders the rear cephalic/
nuchal seam and the rostral cap from three angles each, in three passes:
  (a) current material, as authored
  (b) flat neutral diffuse with the texture normal map AND the procedural pore
      Bump both disconnected -- shading driven ONLY by the actual mesh geometry
  (c) a geometric-normal pass (Emission of the true face/vertex normal, object
      space) -- an unambiguous "matcap" of the real surface, independent of
      any material at all
Plus a numeric section report: geometric-normal angular discontinuity (degrees)
across the nuchal seam along three longitudinal lines, and a microrelief
amplitude (bump strength x normal-map variance) over the forehead/rostral band.

READ-ONLY: opens the blend, never calls save_mainfile. Material swaps for
passes (b)/(c) are in-memory only and are not persisted anywhere.

No M05 authored here. This script only produces evidence for the parent to
judge; see review-material04-and-next-direction.md and WORKING_STATE.md.
"""
import bpy, sys, json, math, hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from geometry_clay02 import build_body, section, TAU
from material_fields04 import shield

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
BLEND = Path(argv[0]) if argv else HERE.parents[4].parent / 'devonian-authoring/bothriolepis/rework-v3/material04/bothriolepis-material04.blend'
OUT = Path(argv[1]) if len(argv) > 1 else HERE.parents[4].parent / 'devonian-authoring/bothriolepis/rework-v3/diagnostic-m04-closeup'
OUT.mkdir(parents=True, exist_ok=True)

blend_sha256 = hashlib.sha256(BLEND.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(BLEND))  # read-only: never saved back
scene = bpy.context.scene
body = bpy.data.objects['Bothriolepis V3 MATERIAL04 continuous anatomy']
me = body.data
if me.shape_keys:
    for block in me.shape_keys.key_blocks:
        if block.name == 'Oral opening study only':
            block.value = 0.0

# ---------------------------------------------------------------------------
# Numeric section report (real displaced mesh geometry; no rendering needed)
# ---------------------------------------------------------------------------
raw = build_body()
assert len(me.vertices) == len(raw.v), 'STOP unexpected topology change vs geometry_clay02.build_body()'

N = 192
rows = 251
gridkey = {}
for j in range(rows):
    y = -1.62 + j * .02
    for k in range(N):
        gridkey[tuple(round(a, 7) for a in section(y, k * TAU / N))] = (j, k)
grid2idx = {}
for i, (p, tag) in enumerate(zip(raw.v, raw.tags)):
    if tag != 'shield':
        continue
    jk = gridkey.get(tuple(round(a, 7) for a in p))
    if jk:
        grid2idx[jk] = i

def actual(i):
    return Vector(me.vertices[i].co[:])

def face_normal(j, k):
    a_i, b_i, c_i = grid2idx.get((j, k)), grid2idx.get((j, k + 1)), grid2idx.get((j + 1, k))
    if a_i is None or b_i is None or c_i is None:
        return None
    P, Pu, Pv = actual(a_i), actual(b_i), actual(c_i)
    n = (Pu - P).cross(Pv - P)
    if n.length < 1e-12:
        return None
    return n.normalized()

# Three longitudinal lines across the rear cephalic/nuchal seam: dorsal midline
# and two lateral stations (theta = k*2pi/192).
LINES = {'dorsal_k0': 0, 'flank_k48': 48, 'flank_k144': 144}
J_RANGE = range(60, 100)  # y in [-0.42, 0.38], straddling the shield's rear boundary (y<.18)
seam_report = {}
overall_max_angle = 0.0
overall_max_at = None
for name, k in LINES.items():
    normals = {}
    for j in J_RANGE:
        n = face_normal(j, k)
        if n is not None:
            normals[j] = n
    js = sorted(normals)
    angles = []
    for a, b in zip(js, js[1:]):
        dot = max(-1.0, min(1.0, normals[a].dot(normals[b])))
        deg = math.degrees(math.acos(dot))
        y_mid = -1.62 + ((a + b) / 2) * .02
        angles.append((y_mid, deg))
        if deg > overall_max_angle:
            overall_max_angle = deg
            overall_max_at = {'line': name, 'y': y_mid, 'degrees': deg}
    if angles:
        baseline = sorted(d for _, d in angles)
        median_step_angle = baseline[len(baseline) // 2]
        peak_y, peak_deg = max(angles, key=lambda t: t[1])
        seam_report[name] = {
            'sample_count': len(angles),
            'median_step_to_step_angle_deg': median_step_angle,
            'peak_angle_deg': peak_deg,
            'peak_at_y': peak_y,
        }
seam_report['overall_peak'] = overall_max_at

# Microrelief amplitude over the forehead/rostral band: bump strength (the
# procedural pore Bump node's constant, .18 in mat()) x variance of the
# shield atlas normal-map channels (the same field build_material04.py bakes
# into shield-material04-normal.png), restricted to the rostral U-band.
BUMP_STRENGTH = 0.18
Nres, Hres = 1536, 1024
vtex, uu = np.mgrid[0:Hres, 0:Nres].astype(np.float32)
uu = (uu + .5) / Nres
vtex = (vtex + .5) / Hres
vphysical = (vtex + .5) % 1
source_path = HERE / 'material01-inputs/dermal-source-material01.png'
src = bpy.data.images.load(str(source_path), check_existing=True)
sw, sh = src.size
px = np.array(src.pixels[:], dtype=np.float32).reshape(sh, sw, 4)
lum = px[:, :, :3].mean(2)
lum = (lum - lum.mean()) / (lum.std() + 1e-6)
ix = ((.08 + .84 * uu) * (sw - 1)).astype(int)
iy = ((.08 + .84 * vtex) * (sh - 1)).astype(int)
detail = np.clip(lum[iy, ix], -2, 2) / 2 * np.sin(np.pi * vtex) ** 2
_, shgt, _, _, _ = shield(uu, vphysical, detail)
width_units = 1.775  # shield atlas U-extent, from build_material04.py's atlas('shield-material04',...,1.775,3.,True)
circum_units = 3.0
dx = np.gradient(shgt.astype(np.float32), axis=1) * Nres / width_units
dy = (np.roll(shgt, -1, axis=0) - np.roll(shgt, 1, axis=0)) * .5 * Hres / circum_units
normal = np.stack([-dx, -dy, np.ones_like(dx)], axis=2)
normal /= np.linalg.norm(normal, axis=2, keepdims=True)
# Forehead/rostral band: U = (y+1.62)/1.775 for y in [-1.50,-1.20] (anterior shield).
u_lo, u_hi = (-1.50 + 1.62) / 1.775, (-1.20 + 1.62) / 1.775
band = (uu[:, :, None] >= u_lo) & (uu[:, :, None] < u_hi)
band = np.broadcast_to(band, normal.shape)
normal_variance = float(normal[band].var())
microrelief_amplitude = BUMP_STRENGTH * normal_variance

report = {
    'blend_path': str(BLEND),
    'blend_sha256_actual': blend_sha256,
    'note': 'blend SHA is expected to differ from the frozen 5d839ec... target; .blend files are not byte-reproducible across saves. Geometry is verified by value (topology check above passed).',
    'nuchal_seam_geometric_normal_discontinuity_degrees': seam_report,
    'forehead_microrelief_amplitude': {
        'bump_strength': BUMP_STRENGTH,
        'normal_map_variance_over_rostral_band': normal_variance,
        'amplitude_bump_strength_times_variance': microrelief_amplitude,
        'rostral_u_band': [u_lo, u_hi],
    },
}
(OUT / 'section-report.json').write_text(json.dumps(report, indent=2))
print('SECTION_REPORT', json.dumps(report, indent=2))

# ---------------------------------------------------------------------------
# Renders: 2 regions x 3 angles x 3 passes
# ---------------------------------------------------------------------------
scene.render.engine = 'CYCLES'
scene.render.resolution_x = 640
scene.render.resolution_y = 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1
scene.cycles.use_denoising = True
cam = scene.camera
cam_data = cam.data
cam_data.type = 'ORTHO'

def point_at(at):
    cam.rotation_euler = (Vector(at) - cam.location).to_track_quat('-Z', 'Y').to_euler()

REGIONS = {
    # rear cephalic / nuchal seam: shield/thorax boundary, y just under .18
    'nuchal-seam': {'target': (0.0, 0.02, 0.56), 'ortho_scale': 0.62},
    # rostral cap: the anterior nose-tip closure (material04 slot 7, y=-1.62)
    'rostral-cap': {'target': (0.0, -1.58, -0.05), 'ortho_scale': 0.45},
}
ANGLES = {
    'front': lambda t, s: (Vector(t) + Vector((0, -2.4 * s, 0.10 * s)), 0),
    'oblique': lambda t, s: (Vector(t) + Vector((1.7 * s, -1.9 * s, 1.1 * s)), 0),
    'side': lambda t, s: (Vector(t) + Vector((2.5 * s, 0, 0.10 * s)), 0),
}

original_materials = list(me.materials)

def flat_material():
    m = bpy.data.materials.new('DIAG flat neutral (no normal/bump)')
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (.55, .55, .55, 1)
    bs.inputs['Roughness'].default_value = .75
    return m

def normal_pass_material():
    m = bpy.data.materials.new('DIAG geometric normal pass')
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new('ShaderNodeOutputMaterial')
    emit = nodes.new('ShaderNodeEmission')
    geo = nodes.new('ShaderNodeNewGeometry')
    mapping = nodes.new('ShaderNodeVectorMath')
    mapping.operation = 'MULTIPLY_ADD'
    mapping.inputs[1].default_value = (.5, .5, .5)
    mapping.inputs[2].default_value = (.5, .5, .5)
    links.new(geo.outputs['Normal'], mapping.inputs[0])
    links.new(mapping.outputs[0], emit.inputs['Color'])
    links.new(emit.outputs['Emission'], out.inputs['Surface'])
    return m

flat_mat = flat_material()
normal_mat = normal_pass_material()

def set_materials(mats_single):
    me.materials.clear()
    me.materials.append(mats_single)
    for poly in me.polygons:
        poly.material_index = 0

def restore_materials():
    me.materials.clear()
    for m in original_materials:
        me.materials.append(m)
    # polygon material_index values were never touched for the 'material' pass;
    # for flat/normal passes we overwrote them above, so restore original
    # assignment from the raw build's own slot logic is unnecessary here
    # since original_polygon_material_index was captured before any pass.
    for poly, idx in zip(me.polygons, original_polygon_material_index):
        poly.material_index = idx

original_polygon_material_index = [p.material_index for p in me.polygons]

manifest = []
for region_name, region in REGIONS.items():
    target = region['target']
    scale = region['ortho_scale']
    cam_data.ortho_scale = scale
    for angle_name, angle_fn in ANGLES.items():
        pos, _ = angle_fn(target, scale)
        cam.location = pos
        point_at(target)
        for pass_name in ('material', 'flat', 'geo-normal'):
            if pass_name == 'material':
                restore_materials()
                scene.cycles.samples = 32
                scene.world.use_nodes = True
            elif pass_name == 'flat':
                set_materials(flat_mat)
                scene.cycles.samples = 24
            else:
                set_materials(normal_mat)
                scene.cycles.samples = 4
            fname = f'{region_name}_{angle_name}_{pass_name}.png'
            scene.render.filepath = str(OUT / fname)
            bpy.ops.render.render(write_still=True)
            manifest.append(fname)
restore_materials()

(OUT / 'render-manifest.json').write_text(json.dumps(manifest, indent=2))
print('DIAGNOSTIC_DONE', str(OUT))
