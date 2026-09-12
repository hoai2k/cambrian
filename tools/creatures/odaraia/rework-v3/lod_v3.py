"""Odaraia V3 authored LOD geometry.

The limbs are re-lofted from the *same* recovered curves the full model uses, at
a lower radial and ring density: all 32 pairs, all 20 endopod intervals, all 16
endite stations with their four spines, both exopod rami and all three tail
blades are kept, and only the cross-sections are simplified. Collars and tips
keep their own rings, so the interval relief survives. The body shells (valve,
trunk, head, eyes, mouthparts, tail) are quadric-collapsed from the accepted M02
surfaces, which carry their weights across with them.

Nothing here deletes a limb pair, a spine or a blade.
"""
from math import sin, cos, pi

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import odaraia_v3_lib as L

#: Two authored densities off one generator. `full` keeps the accepted body
#: surfaces untouched and re-lofts only the limbs, at a density that reaches the
#: production triangle brief without dropping a single pair, interval, spine,
#: lamella or blade. `lod` reduces the same elements further and collapses the
#: body shells.
PROFILES = {
    'full': {'endopodSides': 5, 'paddleStations': 11, 'leafSides': 7, 'rodSides': 4,
             'lamellae': 7, 'lamellaSides': 3, 'stubSides': 4, 'spinePoints': 3,
             'bodyRatio': None},
    'lod': {'endopodSides': 3, 'paddleStations': 7, 'leafSides': 5, 'rodSides': 3,
            'lamellae': 5, 'lamellaSides': 0, 'stubSides': 0, 'spinePoints': 2,
            'bodyRatio': {'Carapace | continuous rigid valve fields': .30,
                          'Trunk | 32 integrated tergal segments': .26},
            'bodyDefault': .45},
}


def _frame(points, i):
    p = points
    tangent = (p[min(i + 1, len(p) - 1)] - p[max(0, i - 1)]).normalized()
    axis = Vector((0, 0, 1))
    if abs(tangent.dot(axis)) > .92:
        axis = Vector((1, 0, 0))
    a = tangent.cross(axis).normalized()
    b = tangent.cross(a).normalized()
    return a, b


def tube(verts, faces, stations, points, radii, sides, us):
    p = [Vector(x) for x in points]
    rows = []
    for i, c in enumerate(p):
        a, b = _frame(p, i)
        row = []
        for j in range(sides):
            q = 2 * pi * j / sides
            row.append(len(verts))
            verts.append(c + radii[i] * (cos(q) * a + sin(q) * b))
            stations.append(us[i])
        rows.append(row)
    for i in range(len(rows) - 1):
        for j in range(sides):
            n = (j + 1) % sides
            faces.append((rows[i][j], rows[i][n], rows[i + 1][n], rows[i + 1][j]))
    c0 = len(verts)
    verts.append(p[0])
    stations.append(us[0])
    c1 = len(verts)
    verts.append(p[-1])
    stations.append(us[-1])
    for j in range(sides):
        n = (j + 1) % sides
        faces.append((c0, rows[0][n], rows[0][j]))
        faces.append((c1, rows[-1][j], rows[-1][n]))


def leaf(verts, faces, stations, points, widths, thickness, side_axis, sides, us):
    p = [Vector(q) for q in points]
    axis = Vector(side_axis).normalized()
    rows = []
    for i, c in enumerate(p):
        tangent = (p[min(i + 1, len(p) - 1)] - p[max(0, i - 1)]).normalized()
        a = (axis - axis.dot(tangent) * tangent).normalized()
        b = tangent.cross(a).normalized()
        row = []
        for j in range(sides):
            q = 2 * pi * j / sides
            row.append(len(verts))
            verts.append(c + widths[i] * cos(q) * a + thickness[i] * sin(q) * b)
            stations.append(us[i])
        rows.append(row)
    for i in range(len(rows) - 1):
        for j in range(sides):
            n = (j + 1) % sides
            faces.append((rows[i][j], rows[i][n], rows[i + 1][n], rows[i + 1][j]))
    c0 = len(verts)
    verts.append(p[0])
    stations.append(us[0])
    c1 = len(verts)
    verts.append(p[-1])
    stations.append(us[-1])
    for j in range(sides):
        n = (j + 1) % sides
        faces.append((c0, rows[0][n], rows[0][j]))
        faces.append((c1, rows[-1][j], rows[-1][n]))


def strip(verts, faces, stations, points, half, axis, us):
    """A flat blade: the LOD's simplified cross-section for a spine or lamella.
    The element keeps its root, length, direction and taper; only its thickness
    goes, and at 0.0045 model units it was never more than a hairline."""
    axis = Vector(axis).normalized()
    rows = []
    for c, w, u in zip(points, half, us):
        c = Vector(c)
        i0 = len(verts)
        verts.append(c - w * axis)
        stations.append(u)
        i1 = len(verts)
        verts.append(c + w * axis)
        stations.append(u)
        rows.append((i0, i1))
    for a, b in zip(rows[:-1], rows[1:]):
        faces.append((a[0], a[1], b[1], b[0]))


def _object(name, material, verts, faces, weights):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    buckets = {}
    for i, w in enumerate(weights):
        for bone, value in L.normalise(w).items():
            buckets.setdefault((bone, round(value, 6)), []).append(i)
    groups = {}
    for (bone, value), indices in buckets.items():
        g = groups.get(bone) or ob.vertex_groups.new(name=bone)
        groups[bone] = g
        g.add(indices, value, 'REPLACE')
    return ob


def limb_objects(l, materials, cfg):
    out = []
    # Endopod: collar ring plus mid ring for every one of the 20 intervals.
    verts, faces, us = [], [], []
    pts, rads, stations = [], [], []
    for q in range(L.INTERVALS):
        for frac in (0, .5):
            u = L.BOUNDS[q] * (1 - frac) + L.BOUNDS[q + 1] * frac
            pts.append(l.endopod_at(u))
            rads.append(l.endopod_radius(u, .80 if frac == 0 else 1.0))
            stations.append(u)
    pts.append(Vector(l.dist))
    rads.append(.008 * (1 - .25 * l.t))
    stations.append(1.0)
    tube(verts, faces, us, pts, rads, cfg['endopodSides'], stations)
    out.append(_object(f'LOD Limb {l.number:02d}{l.label} endopod',
                       materials['Study02 | copper articulated endopods'], verts, faces,
                       [L.endopod_weights(l, u) for u in us]))
    # Exopod: ovate blade, supporting rod and five flat lamellae.
    verts, faces, us = [], [], []
    n = cfg['paddleStations']
    eu = [k / (n - 1) for k in range(n)]
    ep = [l.paddle_at(u) for u in eu]
    leaf(verts, faces, us, ep, [l.paddle_width(u) for u in eu], [l.paddle_thick(u) for u in eu],
         (0, 0, 1), cfg['leafSides'], eu)
    tube(verts, faces, us, ep, [.011 * (1 - .65 * u) for u in eu], cfg['rodSides'], eu)
    span = 12 / max(1, cfg['lamellae'] - 1)
    for k in range(cfg['lamellae']):
        u = (2 + k * span) / 16
        centre = l.paddle_at(u) + Vector((l.side * .011, 0, 0))
        w = l.paddle_width(u) * .91
        rib = [centre + Vector((0, -.012, -w)), centre, centre + Vector((0, .012, w))]
        if cfg['lamellaSides']:
            tube(verts, faces, us, rib, [.002, .003, .002], cfg['lamellaSides'], [u, u, u])
        else:
            strip(verts, faces, us, rib, [.0025, .003, .0025], (1, 0, 0), [u, u, u])
    out.append(_object(f'LOD Limb {l.number:02d}{l.label} exopod',
                       materials['Study02 | amber lamellate paddles'], verts, faces,
                       [L.paddle_weights(l, u) for u in us]))
    # Endites: every one of the 16 stations keeps its root stub and four spines.
    verts, faces, qs = [], [], []
    for q in L.Limb.ENDITE_Q:
        u = l.endite_u(q)
        p = l.endopod_at(u)
        base = p + Vector((-l.side * .019, 0, 0))
        radii = [.014 * (1 - .3 * u), .010 * (1 - .3 * u)]
        if cfg['stubSides']:
            tube(verts, faces, qs, [p, base], radii, cfg['stubSides'], [q, q])
        else:
            strip(verts, faces, qs, [p, base], radii, (0, 1, 0), [q, q])
        for direction in (-1, 1):
            for layer in (0, 1):
                length = (.064 + .026 * sin(pi * u)) * (1 - .35 * l.t) * (1 if layer == 0 else .68)
                tip = base + Vector((-l.side * length, .024 + layer * .017, direction * length * .7))
                if cfg['spinePoints'] == 3:
                    mid = (base + tip) * .5 + Vector((0, .009, 0))
                    strip(verts, faces, qs, [base, mid, tip], [.0045, .0028, .0009], (0, 1, 0), [q, q, q])
                else:
                    strip(verts, faces, qs, [base, tip], [.0045, .0009], (0, 1, 0), [q, q])
    out.append(_object(f'LOD Limb {l.number:02d}{l.label} endites',
                       materials['Study02 | dark fine filter endites'], verts, faces,
                       [L.endite_weights(l, q) for q in qs]))
    return out


def collapse(ob, ratio):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bm.to_mesh(ob.data)
    bm.free()
    mod = ob.modifiers.new('LOD collapse', 'DECIMATE')
    mod.ratio = ratio
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)


def build(rig, objects, kind='lod'):
    cfg = PROFILES[kind]
    materials = {m.name: m for m in bpy.data.materials}
    keep = []
    for ob in list(objects):
        if ob.name.startswith('Limb '):
            mesh = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            bpy.data.meshes.remove(mesh)
            continue
        if cfg['bodyRatio'] is not None:
            collapse(ob, cfg['bodyRatio'].get(ob.name, cfg['bodyDefault']))
        keep.append(ob)
    made = []
    for l in L.LIMBS:
        made.extend(limb_objects(l, materials, cfg))
    for ob in made:
        mod = ob.modifiers.new('V3 skin', 'ARMATURE')
        mod.object = rig
        ob.parent = rig
    return keep + made


def surface_deviation(kind):
    """Max distance between the re-lofted polygonal cross-sections and the exact
    authored lofts they sample: r * (1 - cos(pi / sides)) per element."""
    cfg = PROFILES[kind]
    worst = {}
    thickest_shaft = max(l.endopod_radius(0, .80) for l in L.LIMBS)
    worst['endopod'] = round(thickest_shaft * (1 - cos(pi / cfg['endopodSides'])), 6)
    thickest_paddle = max(l.paddle_width(.5) for l in L.LIMBS)
    worst['exopodBlade'] = round(thickest_paddle * (1 - cos(pi / cfg['leafSides'])), 6)
    worst['exopodRod'] = round(.011 * (1 - cos(pi / cfg['rodSides'])), 6)
    worst['enditeRoot'] = round(.014 * (1 - cos(pi / cfg['stubSides'])) if cfg['stubSides'] else .014, 6)
    worst['spine'] = round(.0045, 6)
    worst['note'] = ('centrelines, radii, lengths and directions are the authored ones exactly; '
                     'only the cross-section polygons differ. Spines and, at LOD, endite roots and '
                     'lamellae become flat blades of the same length and taper.')
    return worst
