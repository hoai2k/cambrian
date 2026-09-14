"""Where the tooth whorl actually sits in the raw Tripo body, measured rather than eyeballed.

The question this answers is the one the proportion audit raised: is the whorl a toothed disc
hanging outside and below the chin (the "pizza cutter" reconstruction Tapanila & Pruitt 2013
overturned), or is it seated in the lower-jaw symphysis with only its front arc exposed, which is
what the greenlit canonical pose draws?

The test is a ray, not an opinion. For every vertex in the head band, cast straight up and
straight down:

  * something above it and something below it  -> the vertex is inside the mouth cavity
  * something above it and nothing below it    -> the vertex is on the ventral silhouette
  * nothing above it                           -> the vertex is outer skin (back, flanks, snout)

A whorl seated inside the jaw is almost entirely the first case. A disc hanging off the chin is
almost entirely the second.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/helicoprion/whorl-audit.py
"""
import bpy, bmesh, json, os, sys
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'tripo-raw/helicoprion.raw.glb')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=RAW)
o = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
bm = bmesh.new()
bm.from_mesh(o.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
bm.to_mesh(o.data)
bm.free()

co = np.array([v.co[:] for v in o.data.vertices])
nr = np.array([v.normal[:] for v in o.data.vertices])
LENGTH = float(co[:, 1].max() - co[:, 1].min())        # 1.0 raw unit, head at -Y
SNOUT = float(co[:, 1].min())
bvh = BVHTree.FromPolygons([v.co for v in o.data.vertices],
                           [p.vertices[:] for p in o.data.polygons], all_triangles=False)

# The surface that separates palate from mandible down the head, measured in `build.py` from the
# palate above and the whorl/mouth floor below; used here only to tell upper teeth from lower.
_ZSEP = [(-.50, -.030), (-.46, -.030), (-.44, -.026), (-.43, -.013), (-.42, -.009), (-.41, -.004),
         (-.40, -.003), (-.39, -.004), (-.38, -.008), (-.37, -.009), (-.36, -.012), (-.35, -.022),
         (-.34, -.030), (-.32, -.040), (-.30, -.050)]
UPPER_JAW_FLOOR = lambda y: float(np.interp(y, [a for a, _ in _ZSEP], [b for _, b in _ZSEP]))

UP, DOWN = Vector((0, 0, 1)), Vector((0, 0, -1))
rows = []
for i, p in enumerate(co):
    y = p[1]
    if not (-.47 < y < -.33):
        continue
    start = Vector(p)
    above = bvh.ray_cast(start + UP * 3e-4, UP, .6)
    below = bvh.ray_cast(start + DOWN * 3e-4, DOWN, .6)
    rows.append({'i': i, 'frac': (y - SNOUT) / LENGTH, 'x': float(p[0]), 'y': float(y), 'z': float(p[2]),
                 'nz': float(nr[i][2]),
                 'above': None if above[0] is None else float(above[3]),
                 'below': None if below[0] is None else float(below[3])})

# The whorl is the tooth material in the lower jaw: it faces up or outward into the cavity, it is
# roofed by the palate, and it lives in the anterior half of the gape.
whorl = [r for r in rows if r['above'] is not None and r['nz'] > .15 and r['y'] < -.36]
enclosed = [r for r in whorl if r['below'] is not None]
exposed = [r for r in whorl if r['below'] is None]

ventral = {}
for r in rows:
    if r['below'] is None and r['above'] is not None:
        key = round(r['y'], 3)
        ventral[key] = min(ventral.get(key, 1.), r['z'])

report = {
    'source': 'tools/triassic/creatures/helicoprion/tripo-raw/helicoprion.raw.glb',
    'bodyLength': LENGTH, 'snoutY': SNOUT,
    'method': 'vertical ray casts up and down from every vertex in the head band; a vertex with '
              'mesh above it and mesh below it is inside the mouth, one with mesh above and '
              'nothing below is on the ventral silhouette',
    'whorlVertices': len(whorl),
    'whorlEnclosedByTheChin': len(enclosed),
    'whorlOnTheVentralSilhouette': len(exposed),
    'whorlEnclosedFraction': len(enclosed) / max(1, len(whorl)),
    'whorlExtentFractionOfBodyLength': [min(r['frac'] for r in whorl), max(r['frac'] for r in whorl)],
    'exposedArcFractionOfBodyLength': ([min(r['frac'] for r in exposed), max(r['frac'] for r in exposed)]
                                       if exposed else None),
    'clearanceAboveTheChin': {
        'method': 'for each enclosed whorl vertex, the gap to the chin skin straight below it',
        'min': min((r['below'] for r in enclosed), default=None),
        'median': float(np.median([r['below'] for r in enclosed])) if enclosed else None,
        'max': max((r['below'] for r in enclosed), default=None),
    },
    'whorlLateralHalfWidth': max(abs(r['x']) for r in whorl),
    'whorlLateralHalfWidthFractionOfBodyLength': max(abs(r['x']) for r in whorl) / LENGTH,
    'symphysealMassWithinThreeHundredthsOfTheMidline':
        sum(1 for r in whorl if abs(r['x']) < .030) / max(1, len(whorl)),
    'upwardFacingToothMaterialOutsideTheSymphysis':
        sum(1 for r in whorl if abs(r['x']) >= .030) / max(1, len(whorl)),
    # The palate. Helicoprion had no upper teeth at all: the whorl occluded against a cartilage
    # pad (Tapanila & Pruitt 2013). Anything counted here is dentition the animal did not have.
    'upperJawToothMaterial': sum(
        1 for r in rows if r['above'] is not None and r['below'] is not None and r['nz'] < -.15
        and r['z'] > UPPER_JAW_FLOOR(r['y']) - .40 * abs(r['x']) and r['y'] < -.35),
    'lowerJawToothMaterialOutsideTheSymphysis': sum(
        1 for r in rows if r['above'] is not None and r['nz'] > .15
        and r['z'] < UPPER_JAW_FLOOR(r['y']) - .40 * abs(r['x'])
        and abs(r['x']) >= .030 and r['y'] < -.35),
}
stations = []
for y in np.arange(-.47, -.325, .01):
    band = [r for r in whorl if abs(r['y'] - y) < .005]
    chin = [z for k, z in ventral.items() if abs(k - y) < .005]
    stations.append({
        'y': float(y), 'frac': float((y - SNOUT) / LENGTH),
        'whorlVertices': len(band),
        'whorlLowestZ': min((r['z'] for r in band), default=None),
        'ventralSilhouetteZ': min(chin) if chin else None,
        'whorlAboveTheSilhouetteBy': (min(chin) if chin else 0) and
                                     (min((r['z'] for r in band), default=0) - min(chin) if band and chin else None),
    })
report['stations'] = stations
open(os.path.join(HERE, 'whorl-audit.json'), 'w').write(json.dumps(report, indent=2) + '\n')
print('WHORL_AUDIT', json.dumps({k: report[k] for k in
      ('whorlVertices', 'whorlEnclosedByTheChin', 'whorlOnTheVentralSilhouette',
       'whorlEnclosedFraction', 'whorlExtentFractionOfBodyLength', 'exposedArcFractionOfBodyLength',
       'whorlLateralHalfWidthFractionOfBodyLength',
       'symphysealMassWithinThreeHundredthsOfTheMidline',
       'upwardFacingToothMaterialOutsideTheSymphysis',
       'upperJawToothMaterial',
       'lowerJawToothMaterialOutsideTheSymphysis')}, indent=2))
for s in stations:
    print('  frac %.3f  whorl n=%3d lowest %s  ventral %s' % (
        s['frac'], s['whorlVertices'],
        'n/a' if s['whorlLowestZ'] is None else '%+.4f' % s['whorlLowestZ'],
        'n/a' if s['ventralSilhouetteZ'] is None else '%+.4f' % s['ventralSilhouetteZ']))

# ------------------------------------------------------------- the picture ----
# A cutaway is the only honest way to show this: the near half of the head is removed, the whorl
# is painted, and what is above and below it is visible in one frame.
if '--no-render' not in sys.argv:
    whorl_index = {r['i'] for r in whorl}
    half = o.copy()
    half.data = o.data.copy()
    bpy.context.collection.objects.link(half)
    bm = bmesh.new()
    bm.from_mesh(half.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().x > .004], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bm.to_mesh(half.data)
    bm.free()
    half.data.materials.clear()
    paint = half.data.color_attributes.new(name='WhorlPaint', type='FLOAT_COLOR', domain='POINT')
    keep = {tuple(round(c, 6) for c in co[i]) for i in whorl_index}
    painted = 0
    for v in half.data.vertices:
        if tuple(round(c, 6) for c in v.co) in keep:
            paint.data[v.index].color = (.85, .10, .06, 1)
            painted += 1
        else:
            paint.data[v.index].color = (.62, .60, .58, 1)
    m = bpy.data.materials.new('Cutaway')
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    vc = m.node_tree.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'WhorlPaint'
    m.node_tree.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = .7
    half.data.materials.append(m)
    for f in half.data.polygons:
        f.material_index = 0
    o.hide_render = True
    s = bpy.context.scene
    s.render.engine = 'CYCLES'
    s.cycles.device = 'CPU'
    s.cycles.samples = 24
    s.cycles.use_denoising = True
    s.render.film_transparent = False
    s.view_settings.view_transform = 'Standard'
    s.world.use_nodes = True
    s.world.node_tree.nodes['Background'].inputs[0].default_value = (.05, .06, .07, 1)
    s.world.node_tree.nodes['Background'].inputs[1].default_value = 1.
    for loc, power in [((4, -2, 3), 240), ((2, -1, -3), 160), ((3, 1, 1), 200)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        lamp = bpy.context.object
        lamp.data.energy = power
        lamp.data.size = 3
        lamp.rotation_euler = (Vector((0, -.42, -.02)) - lamp.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add()
    cam = bpy.context.object
    s.camera = cam
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = .21
    cam.location = (1.2, -.415, -.022)
    cam.rotation_euler = (Vector((0, -.415, -.022)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
    s.render.resolution_x, s.render.resolution_y = 1100, 800
    s.render.image_settings.file_format = 'JPEG'
    s.render.filepath = os.path.join(HERE, 'whorl-section.jpg')
    bpy.ops.render.render(write_still=True)
    print('WHORL_SECTION painted', painted, 'of', len(half.data.vertices), '->', s.render.filepath)
