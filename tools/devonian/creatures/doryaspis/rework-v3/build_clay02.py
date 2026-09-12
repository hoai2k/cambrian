"""Doryaspis V3 clay02 construction (Blender 5.2.1 at /opt/blender/blender).

    /opt/blender/blender -b --threads 1 --python-exit-code 1 \
        --python tools/devonian/creatures/doryaspis/rework-v3/build_clay02.py -- clay02

The positional argument after `--` is the variant directory under
`<authoring>/doryaspis/rework-v3/`; `clay02`, `clay02b`, ... are iterations of
the same design, so an interrupted session resumes by pointing at the next
letter.  Nothing outside that directory is written.

Deltas from clay01's build, all of them the user's direction:
  * the oral negative volume is bored straight back along -Z through the blunt
    **front face** of the snout, above the pseudorostral root; there is no
    dorsal or upward aperture anywhere, and the build asserts that,
  * the pseudorostrum is unioned as a broad lower-front mass, not a spike,
  * eyes are seated in **flank** orbits (the seat must have a lateral surface
    normal) and inset only as far as the visibility target needs.

`.blend` files are not byte-reproducible across saves, so the hash gate is
satisfied by value: construction.json records the geometry invariants and the
source hashes, and the render stage re-checks the blend hash recorded here.
"""
import bpy
import bmesh
import json
import sys
import hashlib
from pathlib import Path
from math import isfinite, sin, cos, pi
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
ROOT = REPO.parent / 'devonian-authoring/doryaspis/rework-v3'
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
VARIANT = argv[0] if argv else 'clay02'
assert VARIANT.startswith('clay02'), 'variant must be a clay02 iteration'
OUT = ROOT / VARIANT
sys.path.insert(0, str(HERE))
import geometry_clay02 as design


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


assert not OUT.exists(), 'STOP: ' + VARIANT + ' already exists; use the next letter'
OUT.mkdir(parents=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.threads_mode = 'FIXED'
scene.render.threads = 1


def material(name, color, rough=.64):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, 1)
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Specular IOR Level'].default_value = .23
    return m


CLAY = material('Neutral warm sculpt clay', (.43, .405, .37))
ORAL = material('Same clay cavity wall', (.34, .318, .29))
EYE = material('Clay embedded eye placeholder', (.26, .252, .238), .42)
all_objects = []


def mesh(name, vertices, faces, mat=CLAY):
    me = bpy.data.meshes.new(name)
    me.from_pydata(vertices, [], faces)
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
    me.materials.append(mat)
    for f in me.polygons:
        f.use_smooth = True
    all_objects.append(ob)
    return ob


def boolean(target, tool, operation, label):
    bpy.context.view_layer.objects.active = target
    md = target.modifiers.new(label, 'BOOLEAN')
    md.operation = operation
    md.solver = 'EXACT'
    md.object = tool
    bpy.ops.object.modifier_apply(modifier=md.name)
    all_objects.remove(tool)
    bpy.data.objects.remove(tool, do_unlink=True)


g = design.all_base_geometry()
body = mesh('Doryaspis_continuous_shield_posterior', *g['body'])
body['anatomyRole'] = 'continuous_rigid_shield_and_flexible_posterior_clay'
for name in ('cornual_left', 'cornual_right', 'pseudorostrum', 'caudal_membrane'):
    boolean(body, mesh(name, *g[name]), 'UNION', 'Continuous attachment ' + name)

# The mouth: a real recessed chamber behind a smooth continuous rim, bored
# horizontally through the blunt front face above the pseudorostral root.
body.data.materials.append(ORAL)
tool = mesh('Terminal_oral_negative_volume', *g['oral_cutter'])
tool.data.materials.append(ORAL)
for f in tool.data.polygons:
    f.material_index = 1
boolean(body, tool, 'DIFFERENCE', 'Terminal forward-facing oral chamber')

oral_faces = [f for f in body.data.polygons if f.material_index == 1]
assert oral_faces, 'STOP: the oral boolean cut nothing'
oral_points = [body.data.vertices[i].co for f in oral_faces for i in f.vertices]
oral_bounds = {'x': [min(p.x for p in oral_points), max(p.x for p in oral_points)],
               'y': [min(p.y for p in oral_points), max(p.y for p in oral_points)],
               'z': [min(p.z for p in oral_points), max(p.z for p in oral_points)]}
# No opening on the dorsal surface: every oral vertex stays under the roof and
# in front of the shield, and the aperture's own outward normals face forward.
ROOF = design.ANATOMY_SUMMARY['dorsalRoofYOverMouth']
assert oral_bounds['y'][1] < ROOF - .05, 'STOP: oral cavity reaches the dorsal roof'
assert oral_bounds['z'][0] > design.ORAL[0][0] - .02, 'STOP: oral cavity runs back into the shield'
rim = [f for f in oral_faces if f.center.z > design.ORAL_PLANE - .02]
assert rim, 'STOP: no rim faces at the aperture plane'
rim_normal = sum((f.normal for f in rim), Vector((0, 0, 0))) / len(rim)
assert rim_normal.z > .30, 'STOP: the aperture does not face forward'
assert abs(rim_normal.y) < .35, 'STOP: the aperture is tilted up or down'

# Small single branchial outlets: real shallow recesses under the rear flank
# armour, independent of the mouth and never animated as joints.
bx, by, bz = design.BRANCHIAL_RADII


def ellipsoid(name, center, axes, mat):
    n, m = 48, 24
    v, f = [], []
    c = Vector(center)
    a, b, d = [Vector(q) for q in axes]
    v.append(tuple(c + d))
    for j in range(1, m):
        t = pi * j / m
        for k in range(n):
            s = 2 * pi * k / n
            v.append(tuple(c + a * (sin(t) * cos(s)) + b * (sin(t) * sin(s)) + d * cos(t)))
    end = len(v)
    v.append(tuple(c - d))
    f.extend((0, 1 + k, 1 + (k + 1) % n) for k in range(n))
    for j in range(m - 2):
        f.extend((1 + j * n + k, 1 + (j + 1) * n + k, 1 + (j + 1) * n + (k + 1) % n,
                  1 + j * n + (k + 1) % n) for k in range(n))
    f.extend((end, 1 + (m - 2) * n + (k + 1) % n, 1 + (m - 2) * n + k) for k in range(n))
    return mesh(name, v, f, mat)


for side in (-1, 1):
    tree = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                                [p.vertices for p in body.data.polygons])
    seed = Vector((side * design.BRANCHIAL_SEED[0], design.BRANCHIAL_SEED[1],
                   design.BRANCHIAL_SEED[2]))
    surf, norm, idx, dist = tree.find_nearest(seed)
    if norm.x * side < 0:
        norm = -norm
    fore = Vector((0, 0, 1))
    fore = (fore - norm * fore.dot(norm)).normalized()
    vert = norm.cross(fore).normalized()
    tool = ellipsoid('Branchial_negative_volume', surf - norm * .016,
                     (fore * bx, vert * by, norm * bz), CLAY)
    tool.data.materials.append(ORAL)
    for f in tool.data.polygons:
        f.material_index = 1
    boolean(body, tool, 'DIFFERENCE', 'Single branchial outlet ' + str(side))

# Eyes seated in the flank orbits.  The seat must be a lateral surface, the
# inset is the smallest one that reaches the visibility target, and the build
# refuses to bury the globe to make a number look good.
tree = BVHTree.FromPolygons([v.co for v in body.data.vertices],
                            [p.vertices for p in body.data.polygons])
import numpy as np
rng = np.random.default_rng(20260912)
cloud = rng.uniform(-1, 1, (60000, 3))
cloud = cloud[(cloud * cloud).sum(1) <= 1]
eye_evidence = []
for side in (-1, 1):
    seed = Vector((side * design.EYE_SEED[0], design.EYE_SEED[1], design.EYE_SEED[2]))
    surf, norm, idx, dist = tree.find_nearest(seed)
    if norm.x * side < 0:
        norm = -norm
    assert abs(norm.x) > .55, 'STOP: eye seat is not a flank surface, nx=' + str(norm.x)
    fore = Vector((0, 0, 1))
    fore = (fore - norm * fore.dot(norm)).normalized()
    vert = norm.cross(fore).normalized()
    rn, ru, rv = design.EYE_RADII
    depth, fraction = 0., 0.
    while depth < rn * 1.2:
        center = surf - norm * depth
        pts = [center + norm * float(p[0]) * rn + fore * float(p[1]) * ru
               + vert * float(p[2]) * rv for p in cloud]
        hits = 0
        for p in pts:
            q, nn, ii, dd = tree.find_nearest(p)
            hits += (p - q).dot(nn) < 0
        fraction = hits / len(pts)
        if fraction >= design.EYE_VISIBLE_TARGET:
            break
        depth += .002
    assert fraction >= design.EYE_VISIBLE_FLOOR, 'STOP: eye seat below the floor'
    name = 'Clay_eye_L' if side > 0 else 'Clay_eye_R'
    ob = ellipsoid(name, center, (fore * ru, vert * rv, norm * rn), EYE)
    ob['anatomyRole'] = 'flank_seated_eye_globe_clay'
    eye_evidence.append({'mesh': name, 'seat': list(surf), 'normal': list(norm),
                         'centre': list(center), 'inset': round(depth, 4),
                         'radiiForeVertNormal': [ru, rv, rn],
                         'embeddedFraction': round(fraction, 4),
                         'samples': len(cloud),
                         'method': 'seeded uniform ellipsoid volume samples against the '
                                   'closed body BVH signed nearest surface'})


def construction_check(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if bm.calc_volume(signed=True) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    bm.verts.ensure_lookup_table()
    unseen = set(bm.verts)
    parts = []
    while unseen:
        todo = [unseen.pop()]
        count = 0
        while todo:
            ve = todo.pop()
            count += 1
            for edge in ve.link_edges:
                other = edge.other_vert(ve)
                if other in unseen:
                    unseen.remove(other)
                    todo.append(other)
        parts.append(count)
    result = {'name': ob.name, 'vertices': len(bm.verts), 'faces': len(bm.faces),
              'components': parts,
              'nonmanifoldEdges': sum(not e.is_manifold for e in bm.edges),
              'degenerateFaces': sum(f.calc_area() < 1e-12 for f in bm.faces),
              'finite': all(isfinite(c) for v in bm.verts for c in v.co),
              'volume': bm.calc_volume(signed=True)}
    bm.to_mesh(ob.data)
    bm.free()
    result['ok'] = (result['finite'] and result['volume'] > 0
                    and result['nonmanifoldEdges'] == 0
                    and result['degenerateFaces'] == 0 and len(parts) == 1)
    return result


checks = [construction_check(ob) for ob in all_objects]
report = {'stage': 'unreviewed ' + VARIANT, 'coordinates': 'world Y-up, +Z-forward',
          'oralDecision': 'terminal forward-facing mouth on the blunt front face of the '
                          'snout, directly above the pseudorostral root; no dorsal or '
                          'upward aperture anywhere',
          'anatomy': design.ANATOMY_SUMMARY, 'oralCutBounds': oral_bounds,
          'oralRimFaces': len(rim), 'oralWallFaces': len(oral_faces),
          'geometry': checks, 'eyes': eye_evidence,
          'inputHashes': {str(HERE / n): sha(HERE / n) for n in
                          ('geometry_clay02.py', 'build_clay02.py', 'render_clay02.py')},
          'passed': all(c['ok'] for c in checks)}
(OUT / 'construction.json').write_text(json.dumps(report, indent=2, default=float) + '\n')
assert report['passed'], 'STOP: construction check failed; preserve construction.json'
scene['authoringPhase'] = 'Doryaspis rework V3 ' + VARIANT + ', awaiting actual review'
scene['worldConvention'] = 'X lateral, Y up, Z forward'
scene['oralAnatomy'] = 'Terminal forward-facing mouth above the fixed pseudorostral root'
scene['noPublicMutation'] = True
scene['sourceGeometry'] = str(HERE / 'geometry_clay02.py')
blend = OUT / ('doryaspis-' + VARIANT + '.blend')
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
report['blend'] = {'path': str(blend), 'bytes': blend.stat().st_size, 'sha256': sha(blend)}
(OUT / 'construction.json').write_text(json.dumps(report, indent=2, default=float) + '\n')
print('DORYASPIS_CLAY02_BUILD_OK', json.dumps(report['blend']))
