"""Odaraia V3 stage 1 — kinematic evidence rig on the accepted material02 scene.

    /opt/blender/blender -b --factory-startup --python rig_v3.py -- build
    /opt/blender/blender -b --factory-startup --python rig_v3.py -- evidence

`build` loads M02 (never modifying it in place), verifies the recovered limb
curves against the loaded coordinates, creates the 406-bone deform skeleton and
the controlled skin weights, and saves `rig-v3/odaraia-rig-v3.blend`.
`evidence` poses Attack/Eat extremes on pairs 1-6 around a food proxy, renders
side / front / oblique plus a shell-cutaway diagnostic, and writes the numeric
shaft / filter / neighbour / shell / head / food clearance record.
"""
import json
import math
import os
import sys
import struct
import hashlib
from pathlib import Path

import bpy
from mathutils import Vector, Matrix, Euler, kdtree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import odaraia_v3_lib as L
import perform_v3 as P

AUTHORING = Path(os.environ.get('ODARAIA_AUTHORING', '/home/user/expansion-authoring/odaraia-rework'))
M02 = AUTHORING / 'material02/odaraia-material02.blend'
RIGDIR = AUTHORING / 'rig-v3'
RIGBLEND = RIGDIR / 'odaraia-rig-v3.blend'
HERE = Path(__file__).resolve().parent
ACCEPTED_GEOMETRY = 'b4086bbddf3bfb5a6551964df927f3a69fa8bbf79a2a1f405f23053a0df0023f'
CUTAWAY = 'Study only | anatomical half shell'
SHELL = 'Carapace | continuous rigid valve fields'
PROXY_RADIUS = .035


# --------------------------------------------------------------------------
# Scene helpers.
# --------------------------------------------------------------------------

def mesh_objects():
    return [o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('Food proxy')]


def geometry_hash():
    h = hashlib.sha256()
    for ob in sorted(mesh_objects(), key=lambda x: x.name):
        h.update(ob.name.encode())
        for row in ob.matrix_world:
            h.update(struct.pack('<4f', *row))
        for v in ob.data.vertices:
            h.update(struct.pack('<3f', *v.co))
        for p in ob.data.polygons:
            h.update(struct.pack('<I', len(p.vertices)) + struct.pack('<' + 'I' * len(p.vertices), *p.vertices))
    return h.hexdigest()


def nearest_u(points, target, samples=192):
    best, bu = 1e18, 0.0
    for k in range(samples + 1):
        u = k / samples
        d = (points(u) - target).length_squared
        if d < best:
            best, bu = d, u
    return bu


# --------------------------------------------------------------------------
# Verification of the recovered curves against the loaded coordinates.
# --------------------------------------------------------------------------

def verify_curves():
    report = {'endopodRingCentreMaxError': 0.0, 'paddleRingCentreMaxError': 0.0,
              'enditeStationMaxError': 0.0, 'ringsChecked': 0, 'limbsChecked': 0}
    for l in L.LIMBS:
        end = bpy.data.objects[f'Limb {l.number:02d}{l.label} | 20 podomere endopod']
        assert len(end.data.vertices) == 61 * 8 + 2, len(end.data.vertices)
        us = l.endopod_loft_u()
        co = [v.co for v in end.data.vertices]
        for ring, u in enumerate(us):
            centre = sum((co[ring * 8 + j] for j in range(8)), Vector()) / 8
            err = (centre - l.endopod_at(u)).length
            report['endopodRingCentreMaxError'] = max(report['endopodRingCentreMaxError'], err)
            report['ringsChecked'] += 1
        ex = bpy.data.objects[f'Limb {l.number:02d}{l.label} | ovate rod and lamellate exopod']
        assert len(ex.data.vertices) == 497, len(ex.data.vertices)
        xco = [v.co for v in ex.data.vertices]
        for ring in range(17):
            centre = sum((xco[172 + ring * 6 + j] for j in range(6)), Vector()) / 6
            err = (centre - l.paddle_at(ring / 16)).length
            report['paddleRingCentreMaxError'] = max(report['paddleRingCentreMaxError'], err)
        fi = bpy.data.objects[f'Limb {l.number:02d}{l.label} | spinose filtering endites']
        assert len(fi.data.vertices) == 16 * 82, len(fi.data.vertices)
        fco = [v.co for v in fi.data.vertices]
        for station, q in enumerate(Limb_endite_q()):
            base = station * 82
            centre = sum((fco[base + j] for j in range(6)), Vector()) / 6
            err = (centre - l.endopod_at(l.endite_u(q))).length
            report['enditeStationMaxError'] = max(report['enditeStationMaxError'], err)
        report['limbsChecked'] += 1
    return report


def Limb_endite_q():
    return list(L.Limb.ENDITE_Q)


# --------------------------------------------------------------------------
# Skeleton.
# --------------------------------------------------------------------------

def build_armature():
    arm = bpy.data.armatures.new('odaraia V3 rig')
    rig = bpy.data.objects.new('odaraia_rig', arm)
    bpy.context.collection.objects.link(rig)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (head, tail, parent, roll) in L.BONE_TABLE.items():
        b = arm.edit_bones.new(name)
        b.head, b.tail = head, tail
        b.use_connect = False
        if parent:
            b.parent = arm.edit_bones[parent]
    for name, (head, tail, parent, roll) in L.BONE_TABLE.items():
        b = arm.edit_bones[name]
        chord = (Vector(tail) - Vector(head)).normalized()
        ref = roll
        if ref is None:
            ref = Vector((0, 1, 0))
            if abs(chord.dot(ref)) > .93:
                ref = Vector((0, 0, 1))
        elif abs(chord.dot(Vector(ref).normalized())) > .93:
            ref = Vector((0, 0, 1))
        b.align_roll(Vector(ref))
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    rig.show_in_front = True
    arm.display_type = 'STICK'
    return rig


# --------------------------------------------------------------------------
# Controlled weights, per authored object and per vertex provenance.
# --------------------------------------------------------------------------

def object_weights(ob):
    """[{bone: weight}] per vertex, from the authored provenance of each mesh."""
    name = ob.name
    n = len(ob.data.vertices)
    co = [v.co for v in ob.data.vertices]
    if name.startswith('Carapace |') or name == CUTAWAY:
        return [{'body_core': 1.0}] * n
    if name.startswith('Trunk |'):
        return [L.trunk_weights(c.z) for c in co]
    if name.startswith('Head |'):
        if 'sensory' in name:
            return [{'head': 1.0}] * n
        return [L.head_weights(c.z) for c in co]
    if name.startswith('Eye '):
        label = name.split()[1]
        return [{f'eye_{label}': 1.0}] * n
    if name.startswith('Mouth |'):
        return [{'labrum': 1.0}] * n
    if name.startswith('Mouth '):
        label = name.split()[1]
        if 'mandible' in name:
            return [{f'mandible_{label}': 1.0}] * n
        if 'posterior lobe' in name:
            return [{f'maxilla_{label}_base': 1.0}] * n
        s = -1 if label == 'L' else 1
        out = []
        for c in co:
            u = nearest_u(lambda t: L.maxilla_curve(s, t), c)
            a, b = .45, .66
            if u <= a:
                out.append({f'maxilla_{label}_base': 1.0})
            elif u >= b:
                out.append({f'maxilla_{label}_tip': 1.0})
            else:
                f = L.smooth((u - a) / (b - a))
                out.append({f'maxilla_{label}_base': 1 - f, f'maxilla_{label}_tip': f})
        return out
    if name.startswith('Tail |'):
        if 'terminal' in name:
            return [L.terminal_weights(c.z) for c in co]
        key = 'dorsal' if 'dorsal' in name else name.strip()[-1]
        return [L.tail_blade_weights(key, nearest_u(lambda t: L.tail_blade_at(key, t), c)) for c in co]
    if name.startswith('Limb '):
        number = int(name[5:7])
        label = name[7]
        l = L.limb_of(number, label)
        if 'endopod' in name:
            us = l.endopod_loft_u()
            out = []
            for i in range(n):
                u = us[i // 8] if i < 488 else (0.0 if i == 488 else 1.0)
                out.append(L.endopod_weights(l, u))
            return out
        if 'exopod' in name:
            out = []
            for i in range(n):
                if i < 170:
                    u = (i // 10) / 16
                elif i < 172:
                    u = 0.0 if i == 170 else 1.0
                elif i < 274:
                    u = ((i - 172) // 6) / 16
                elif i < 276:
                    u = 0.0 if i == 274 else 1.0
                else:
                    u = (2 + (i - 276) // 17) / 16
                out.append(L.paddle_weights(l, u))
            return out
        if 'endites' in name:
            qs = Limb_endite_q()
            return [L.endite_weights(l, qs[i // 82]) for i in range(n)]
    raise KeyError(name)


def skin(rig):
    stats = {'objects': 0, 'vertices': 0, 'maxInfluences': 0}
    for ob in mesh_objects():
        weights = object_weights(ob)
        groups = {}
        buckets = {}
        for i, w in enumerate(weights):
            w = L.normalise(w)
            stats['maxInfluences'] = max(stats['maxInfluences'], len(w))
            for name, value in w.items():
                buckets.setdefault((name, round(value, 6)), []).append(i)
        for (name, value), indices in buckets.items():
            g = groups.get(name) or ob.vertex_groups.new(name=name)
            groups[name] = g
            g.add(indices, value, 'REPLACE')
        mod = ob.modifiers.new('V3 skin', 'ARMATURE')
        mod.object = rig
        ob.parent = rig
        stats['objects'] += 1
        stats['vertices'] += len(weights)
    return stats


# --------------------------------------------------------------------------
# Author-time kinematics: pure-python FK plus a bounded CCD solver.
# --------------------------------------------------------------------------

#: Bounded per-segment joint limits used by the author-time solver, radians.
JOINT_LIMIT = {'prox': .55, 'mid': .80, 'dist': .90, 'tip': 1.00}


class Kinematics:
    def __init__(self, rig):
        self.local = {b.name: b.matrix_local.copy() for b in rig.data.bones}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in rig.data.bones}

    def world(self, name, basis, cache=None):
        cache = {} if cache is None else cache
        if name in cache:
            return cache[name]
        p = self.parent[name]
        rest = self.local[name] if p is None else self.local[p].inverted() @ self.local[name]
        base = self.world(p, basis, cache) if p else Matrix.Identity(4)
        m = base @ rest @ basis.get(name, Matrix.Identity(4))
        cache[name] = m
        return m

    def point(self, name, basis, rest_point, cache=None):
        return self.world(name, basis, cache) @ (self.local[name].inverted() @ Vector(rest_point))


def clamp_basis(m, limit):
    q = m.to_quaternion()
    angle = q.angle
    if angle > limit:
        q = q.copy()
        q.angle = limit
    return q.to_matrix().to_4x4()


def solve_ccd(kin, chain, basis, rest_effector, target, iterations=36, max_step=.14, bounded=True):
    """CCD on the four real bone rotations. Never scales or stretches. With
    `bounded=False` it reproduces the runtime's own unlimited solver, which has
    only a per-iteration step cap and no anatomical joint limits."""
    target = Vector(target)
    for _ in range(iterations):
        for name in reversed(chain):
            cache = {}
            eff = kin.point(chain[-1], basis, rest_effector, cache)
            W = kin.world(name, basis, cache)
            pivot = W.translation
            v1 = eff - pivot
            v2 = target - pivot
            if v1.length < 1e-7 or v2.length < 1e-7:
                continue
            q = v1.normalized().rotation_difference(v2.normalized())
            if q.angle > max_step:
                q = q.copy()
                q.angle = max_step
            A = (kin.world(kin.parent[name], basis) @ (kin.local[kin.parent[name]].inverted() @ kin.local[name])).to_3x3()
            delta = (A.inverted() @ q.to_matrix() @ A).to_4x4()
            seg = name.rsplit('_', 1)[-1]
            updated = basis.get(name, Matrix.Identity(4)) @ delta
            basis[name] = clamp_basis(updated, JOINT_LIMIT.get(seg, 1.0)) if bounded else updated
        if (kin.point(chain[-1], basis, rest_effector) - target).length < 1e-5:
            break
    return (kin.point(chain[-1], basis, rest_effector) - target).length


def pose_to_basis(pose):
    return {name: Euler(tuple(v), 'XYZ').to_matrix().to_4x4() for name, v in pose.items()}


def apply_basis(rig, basis):
    for pb in rig.pose.bones:
        pb.rotation_quaternion = basis.get(pb.name, Matrix.Identity(4)).to_quaternion()
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()


# --------------------------------------------------------------------------
# Eat: the food path is followed by the lead pairs, not dragged through them.
# --------------------------------------------------------------------------

def grasp_rest_point(l, medial=.048, up=.018):
    return Vector(l.dist) + Vector((-l.side * medial, up, 0))


EAT_TARGET_OFFSET = {
    (1, 'L'): Vector((0, 0, 0)),
    (1, 'R'): Vector((.020, -.004, .004)),
    (2, 'L'): Vector((-.026, -.020, -.030)),
    (2, 'R'): Vector((.026, -.020, -.030)),
    (3, 'L'): Vector((-.040, -.040, -.058)),
    (3, 'R'): Vector((.040, -.040, -.058)),
}


def eat_solved_basis(kin, u, reach_gain=1.0):
    """Base Eat pose plus the solved carry of pairs 1-3 onto the food path."""
    basis = pose_to_basis(P.eat_pose(u))
    food = P.food_at(u)
    errors = {}
    approach = L.smooth(min(1.0, u / .22)) if u < .22 else 1.0
    for (number, label), off in EAT_TARGET_OFFSET.items():
        l = L.limb_of(number, label)
        chain = [L.limb_bone(number, label, s) for s in L.SEGMENTS]
        rest = grasp_rest_point(l)
        start = kin.point(chain[-1], basis, rest)
        target = food + off
        target = start.lerp(target, approach * reach_gain)
        errors[f'{number}{label}'] = solve_ccd(kin, chain, basis, rest, target)
    return basis, food, errors


# --------------------------------------------------------------------------
# Clearance measurement.
#
# Two independent measures are recorded for every reviewed pose:
#  * analytic  - the posed hard shafts, filter roots, endite tips and paddle
#    blades are skinned as capsule/sphere probes, so a gap is a real surface
#    clearance rather than a vertex-to-vertex coincidence;
#  * mesh      - nearest-neighbour over the evaluated skinned vertices, which
#    catches anything the probe set does not model.
# A limb's own filtering branches grow from its own shaft; that one attachment
# is identified explicitly and never counted. Nothing else is excluded.
# --------------------------------------------------------------------------

import numpy as np

RIM = np.array(L.SHELL_RIM, dtype=float)


#: Sampling stride per part for the skinned-surface measures.
STRIDE = {'shaft': 1, 'filter': 2, 'paddle': 2}
LEAD = (1, 2, 3, 4, 5, 6, 7, 8)


def limb_parts(number, label):
    return (bpy.data.objects[f'Limb {number:02d}{label} | 20 podomere endopod'],
            bpy.data.objects[f'Limb {number:02d}{label} | ovate rod and lamellate exopod'],
            bpy.data.objects[f'Limb {number:02d}{label} | spinose filtering endites'])


def bone_buckets(weights, indices):
    buckets = {}
    for k, i in enumerate(indices):
        for name, value in L.normalise(weights[i]).items():
            buckets.setdefault(name, []).append((k, value))
    return {n: (np.array([k for k, _ in v]), np.array([x for _, x in v])[:, None]) for n, v in buckets.items()}


def build_samples():
    """Real authored surface vertices plus the hard-shaft centreline, with the
    weights they are actually skinned by, so clearance is measured on the
    surface the game will draw."""
    out = {}
    for number in LEAD:
        for _, side in L.SIDES:
            e, x, f = limb_parts(number, side)
            d = {}
            for ob, kind in ((e, 'shaft'), (x, 'paddle'), (f, 'filter')):
                w = object_weights(ob)
                indices = list(range(0, len(w), STRIDE[kind]))
                rest = np.array([tuple(ob.data.vertices[i].co) for i in indices])
                d[kind] = (rest, bone_buckets(w, indices))
            l = L.limb_of(number, side)
            us = l.endopod_loft_u()
            centre = np.array([tuple(l.endopod_at(u)) for u in us])
            radii = np.array([l.endopod_radius(u) for u in us])
            cw = [L.endopod_weights(l, u) for u in us]
            d['axis'] = (centre, bone_buckets(cw, list(range(len(us)))), radii)
            out[(number, side)] = d
    return out


def skin_samples(kin, basis, rest, buckets, cache):
    out = np.zeros_like(rest)
    hom = np.concatenate([rest, np.ones((len(rest), 1))], axis=1)
    for name, (ks, vs) in buckets.items():
        M = np.array(kin.world(name, basis, cache) @ kin.local[name].inverted())
        out[ks] += vs * (hom[ks] @ M.T)[:, :3]
    return out


def min_gap(a, b):
    return float(np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1)).min())


def capsule_gap(a, ra, b, rb):
    d = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1)) - ra[:, None] - rb[None, :]
    return float(d.min())


def shell_gaps(pts):
    x, y, z = pts[:, 0], pts[:, 1], pts[:, 2]
    t = (z + 1.39) / 3.27
    theta = edge = w = h = limit = None
    for _ in range(5):
        t = np.clip(t, 0, 1)
        w = .38 + .50 * np.sin(np.pi * t) ** .78 + .15 * t
        h = .43 + .19 * np.sin(np.pi * t) + .08 * t
        limit = 2.12 + .19 * np.sin(np.pi * t) - .09 * t
        theta = np.arctan2(x / w, -(y + .025) / h)
        edge = np.minimum(1, np.abs(theta) / limit)
        front = 1.80 + .24 * edge ** 2 + .08 * np.cos(theta)
        rear = -1.39 + .43 * edge ** 2
        t = (z - rear) / (front - rear)
    tc = np.clip(t, 0, 1)
    thick = .021 + .016 * edge ** 8 + .008 * np.sin(np.pi * tc) ** 2
    r = np.hypot(x / (w - thick), (y + .025) / (h - thick))
    enclosed = (np.abs(theta) < limit * .96) & (t >= .02) & (t <= .98)
    gap = np.where(enclosed, (1 - r) * np.minimum(w, h), np.inf)
    other = ~enclosed
    if other.any():
        gap[other] = np.sqrt(((pts[other][:, None, :] - RIM[None, :, :]) ** 2).sum(-1)).min(1)
    return gap, enclosed


def head_gaps(pts):
    c, s = L.HEAD_CENTRE, L.HEAD_SCALE
    d = np.sqrt(((pts[:, 0] - c.x) / s.x) ** 2 + ((pts[:, 1] - c.y) / s.y) ** 2 + ((pts[:, 2] - c.z) / s.z) ** 2)
    return (d - 1) * min(s)


def nan_to_none(v):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(v, 5)


#: Pairs whose contact during Eat is the choreography, not a failure: the lead
#: carrier, its counter-support and the two steadying pairs close on one food
#: centre. Every other pair is held to the rest geometry's own clearance.
CUPPING = {'1L', '1R', '2L', '2R', '3L', '3R'}


def delta_vs_rest(row, baseline):
    """How much worse than the accepted rest geometry this pose is.

    Only successive pairs on the same side are compared to rest: the two sides of
    the animal are 0.38+ apart at rest and every feeding or attack pose is
    *meant* to close that midline gap, so a delta there measures the
    choreography rather than a fault. Cross-midline pairs are reported by their
    absolute gap instead."""
    worst, worst_key, worst_free, worst_free_key = 1e9, None, 1e9, None
    midline, midline_key = 1e9, None
    for key, gap in row['pairGaps'].items():
        a, b, kind = key.split('|')
        if a[:-1] == b[:-1] and a[-1] != b[-1]:
            if gap < midline:
                midline, midline_key = gap, key
            continue
        base = baseline.get(key)
        if base is None:
            continue
        d = gap - base
        if d < worst:
            worst, worst_key = d, key
        if not (a in CUPPING and b in CUPPING) and d < worst_free:
            worst_free, worst_free_key = d, key
    return {'worstDelta': round(worst, 5), 'worstPair': worst_key,
            'worstDeltaOutsideCupping': round(worst_free, 5), 'worstPairOutsideCupping': worst_free_key,
            'midlineMinGap': round(midline, 5), 'midlinePair': midline_key,
            'scope': 'delta is successive same-side pairs; midline is absolute'}


def analytic_clearances(kin, basis, food, tag, samples, detail=True):
    cache = {}
    posed = {}
    for key, parts in samples.items():
        row = {k: skin_samples(kin, basis, parts[k][0], parts[k][1], cache) for k in ('shaft', 'paddle', 'filter')}
        row['axis'] = (skin_samples(kin, basis, parts['axis'][0], parts['axis'][1], cache), parts['axis'][2])
        posed[key] = row
    def neighbours():
        for number in LEAD:
            for _, side in L.SIDES:
                if number + 1 in LEAD:
                    yield (number, side), (number + 1, side)
                if side == 'L':
                    yield (number, side), (number, 'R')
    shaft_rows, filter_rows = [], []
    for a, b in neighbours():
        pa, pb = posed[a], posed[b]
        shaft_rows.append({'a': f'{a[0]}{a[1]}', 'b': f'{b[0]}{b[1]}', 'kind': 'hard shaft capsule',
                           'gap': round(capsule_gap(pa['axis'][0], pa['axis'][1], pb['axis'][0], pb['axis'][1]), 5)})
        for kind in ('filter', 'paddle'):
            filter_rows.append({'a': f'{a[0]}{a[1]}', 'b': f'{b[0]}{b[1]}', 'kind': kind,
                                'gap': round(min_gap(pa[kind], pb[kind]), 5)})
        filter_rows.append({'a': f'{a[0]}{a[1]}', 'b': f'{b[0]}{b[1]}', 'kind': 'filter vs shaft',
                            'gap': round(min_gap(pa['filter'], pb['shaft']), 5)})
    allpts = np.concatenate([v[k] for v in posed.values() for k in ('shaft', 'paddle', 'filter')])
    sgap, enclosed = shell_gaps(allpts)
    hgap = head_gaps(allpts)
    row = {'pose': tag, 'method': 'authored surface vertices skinned analytically',
           'sampledPoints': int(len(allpts)),
           'foodCentre': [round(c, 4) for c in food] if food is not None else None,
           'hardShaftMinGap': round(min(r['gap'] for r in shaft_rows), 5),
           'hardShaftWorst': min(shaft_rows, key=lambda r: r['gap']),
           'filterMinGap': round(min(r['gap'] for r in filter_rows), 5),
           'filterWorst': min(filter_rows, key=lambda r: r['gap']),
           'shellMarginMinGap': round(float(sgap[~enclosed].min()) if (~enclosed).any() else float('nan'), 5),
           'shellEnclosedMinGap': nan_to_none(float(sgap[enclosed].min()) if enclosed.any() else float('nan')),
           'shellWorstPoint': [round(float(c), 4) for c in allpts[int(sgap.argmin())]],
           'headMinGap': round(float(hgap.min()), 5),
           'headWorstPoint': [round(float(c), 4) for c in allpts[int(hgap.argmin())]]}
    row['shellMarginMinGap'] = nan_to_none(row['shellMarginMinGap'])
    row['pairGaps'] = {f"{r['a']}|{r['b']}|{r['kind']}": r['gap'] for r in shaft_rows + filter_rows}
    if detail:
        row['hardShaftTightest'] = sorted(shaft_rows, key=lambda r: r['gap'])[:4]
        row['filterTightest'] = sorted(filter_rows, key=lambda r: r['gap'])[:4]
    if food is not None:
        f = np.array(food, dtype=float)
        contact = {}
        for key, v in posed.items():
            pts = np.concatenate([v['shaft'], v['filter']])
            contact[f'{key[0]}{key[1]}'] = round(float(np.sqrt(((pts - f) ** 2).sum(-1)).min()) - PROXY_RADIUS, 5)
        row['foodProxyGap'] = contact
        row['foodProxyCupping'] = round(min(contact[k] for k in ('1L', '1R', '2L', '2R', '3L', '3R')), 5)
        row['foodProxyLane'] = round(min(contact[k] for k in ('4L', '4R', '5L', '5R', '6L', '6R')), 5)
        row['foodProxyShellMargin'] = round(float(shell_gaps(f[None, :])[0][0]) - PROXY_RADIUS, 5)
        row['foodProxyHead'] = round(float(head_gaps(f[None, :])[0]) - PROXY_RADIUS, 5)
    return row


def evaluated_points(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    pts = [ob.matrix_world @ v.co.copy() for v in me.vertices]
    ev.to_mesh_clear()
    return pts


def limb_parts(number, label):
    return (bpy.data.objects[f'Limb {number:02d}{label} | 20 podomere endopod'],
            bpy.data.objects[f'Limb {number:02d}{label} | ovate rod and lamellate exopod'],
            bpy.data.objects[f'Limb {number:02d}{label} | spinose filtering endites'])


def tree_of(points):
    t = kdtree.KDTree(len(points))
    for i, p in enumerate(points):
        t.insert(p, i)
    t.balance()
    return t


def mesh_clearances(tag, food, samples):
    """Independent cross-check against Blender's own evaluated deformation."""
    parts = {}
    for number in LEAD:
        for _, side in L.SIDES:
            e, x, f = limb_parts(number, side)
            parts[(number, side)] = {'shaft': evaluated_points(e), 'paddle': evaluated_points(x),
                                     'filter': evaluated_points(f)}
    rows = []
    for number in LEAD:
        for _, side in L.SIDES:
            others = ([(number + 1, side)] if number + 1 in LEAD else []) + ([(number, 'R')] if side == 'L' else [])
            for other in others:
                for kind in ('shaft', 'filter'):
                    t = tree_of(parts[other][kind])
                    d = min(t.find(p)[2] for p in parts[(number, side)][kind])
                    rows.append({'a': f'{number}{side}', 'b': f'{other[0]}{other[1]}', 'kind': kind, 'gap': round(d, 5)})
    allpts = np.array([tuple(p) for v in parts.values() for k in ('shaft', 'paddle', 'filter') for p in v[k]])
    sgap, enclosed = shell_gaps(allpts)
    hgap = head_gaps(allpts)
    row = {'pose': tag, 'method': 'Blender evaluated skinned vertices', 'vertices': int(len(allpts)),
           'neighbourMinGap': round(min(r['gap'] for r in rows), 5),
           'neighbourWorst': min(rows, key=lambda r: r['gap']),
           'shellMarginMinGap': nan_to_none(float(sgap[~enclosed].min()) if (~enclosed).any() else float('nan')),
           'shellEnclosedMinGap': nan_to_none(float(sgap[enclosed].min()) if enclosed.any() else float('nan')),
           'headMinGap': round(float(hgap.min()), 5),
           'headWorstPoint': [round(float(c), 4) for c in allpts[int(hgap.argmin())]]}
    if food is not None:
        f = np.array(food, dtype=float)
        row['foodProxyMinGap'] = round(float(np.sqrt(((allpts - f) ** 2).sum(-1)).min()) - PROXY_RADIUS, 5)
    return row


def mouthpart_points():
    return np.array([tuple(p) for o in bpy.data.objects
                     if o.type == 'MESH' and o.name.startswith('Mouth')
                     for p in evaluated_points(o)])


def measure_aperture(mouth, contact_y, z=1.69, top=.62):
    """The narrowest point of the corridor the food actually descends through,
    behind the labrum plate, with the mandibles in their presented pose."""
    ys = np.arange(contact_y, top, .004)
    line = np.stack([np.zeros_like(ys), ys, np.full_like(ys, z)], axis=1)
    d = np.sqrt(((line[:, None, :] - mouth[None, :, :]) ** 2).sum(-1)).min(1)
    hd = head_gaps(line)
    radius = np.minimum(d, np.where(hd > 0, hd, 0))
    k = int(radius.argmin())
    return float(radius[k]) * 2, [0.0, round(float(ys[k]), 4), z], float(d.min())


# --------------------------------------------------------------------------
# Rendering.
# --------------------------------------------------------------------------

def setup_render(width=760, height=480, samples=28):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.cycles.seed = 7
    sc.render.resolution_x = width
    sc.render.resolution_y = height
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'PNG'
    return sc


def aim(ob, target):
    back = (ob.location - Vector(target)).normalized()
    up = Vector((0, 1, 0)) - back * back.dot(Vector((0, 1, 0)))
    up.normalize()
    right = up.cross(back).normalized()
    up = back.cross(right).normalized()
    ob.rotation_euler = Matrix((right, up, back)).transposed().to_euler()


def camera(name, location, target, ortho):
    data = bpy.data.cameras.new(name)
    data.type = 'ORTHO'
    data.ortho_scale = ortho
    cam = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(cam)
    cam.location = Vector(location)
    aim(cam, target)
    return cam


VIEWS = (
    ('side', (-9, .55, 1.15), (0, .55, 1.15), 3.8),
    ('front', (0, .75, 9.0), (0, .45, 1.70), 3.0),
    ('oblique', (-6.4, 3.2, 6.4), (0, .50, 1.30), 3.6),
)


SKIP_RENDER = os.environ.get('ODARAIA_SKIP_RENDER') == '1'


def render_pose(tag, cutaway=False):
    sc = bpy.context.scene
    if SKIP_RENDER:
        return [str(RIGDIR / f'stage1-{tag}-{n}{"-cutaway" if cutaway else ""}.png')
                for n, _, _, _ in ((VIEWS if not cutaway else (VIEWS[2],)))]
    shell = bpy.data.objects[SHELL]
    cut = bpy.data.objects[CUTAWAY]
    shell.hide_render = cutaway
    cut.hide_render = not cutaway
    cut.hide_viewport = not cutaway
    out = []
    views = VIEWS if not cutaway else (VIEWS[2],)
    for name, pos, target, ortho in views:
        cam = camera(f'{tag}-{name}', pos, target, ortho)
        sc.camera = cam
        path = RIGDIR / f'stage1-{tag}-{name}{"-cutaway" if cutaway else ""}.png'
        sc.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam, do_unlink=True)
        out.append(str(path))
    shell.hide_render = False
    cut.hide_render = True
    cut.hide_viewport = True
    return out


# --------------------------------------------------------------------------
# Stages.
# --------------------------------------------------------------------------

def stage_build():
    RIGDIR.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(M02))
    before = geometry_hash()
    assert before == ACCEPTED_GEOMETRY, f'M02 geometry hash mismatch: {before}'
    curves = verify_curves()
    rig = build_armature()
    stats = skin(rig)
    after = geometry_hash()
    assert after == before, 'Rigging changed authored geometry'
    sc = bpy.context.scene
    sc['odaraia_stage'] = 'rig-v3 stage1: deform skeleton and controlled weights, UNREVIEWED'
    sc.render.fps = L.FPS
    bpy.ops.wm.save_as_mainfile(filepath=str(RIGBLEND))
    report = {'geometryHashBefore': before, 'geometryHashAfter': after, 'curveRecovery': curves,
              'bones': len(rig.data.bones), 'skin': stats}
    (RIGDIR / 'stage1-build.json').write_text(json.dumps(report, indent=2))
    print('ODARAIA_V3_BUILD', json.dumps(report), flush=True)


def stage_evidence():
    bpy.ops.wm.open_mainfile(filepath=str(RIGBLEND))
    rig = bpy.data.objects['odaraia_rig']
    kin = Kinematics(rig)
    samples = build_samples()
    setup_render()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=PROXY_RADIUS, segments=20, ring_count=12, location=(0, 0, 0))
    proxy = bpy.context.object
    proxy.name = 'Food proxy | eat evidence'
    proxy.data.materials.append(bpy.data.materials['Study02 | ochre mouth apparatus'])
    for f in proxy.data.polygons:
        f.use_smooth = True

    evidence = {'scope': 'Odaraia V3 stage 1 kinematic evidence on accepted M02 geometry',
                'geometryHash': ACCEPTED_GEOMETRY,
                'coordinates': {'up': '+Y', 'ventral': '+Y', 'forward': '+Z'},
                'bones': len(rig.data.bones), 'proxyDiameter': PROXY_RADIUS * 2,
                'jointLimitsRadians': JOINT_LIMIT,
                'attachmentExclusion': "only a limb's own endites on its own shaft",
                'poses': [], 'meshPoses': [], 'images': []}

    axes = {}
    for number, label in ((1, 'L'), (1, 'R'), (6, 'L')):
        l = L.limb_of(number, label)
        rest = grasp_rest_point(l)
        base = kin.point(L.limb_bone(number, label, 'tip'), {}, rest)
        row = {}
        for axis, key in ((0, 'flex'), (1, 'twist'), (2, 'swing')):
            b = P.Pose()
            v = [0, 0, 0]
            v[axis] = .20
            for seg in L.SEGMENTS:
                b.limb(l, seg, *v)
            moved = kin.point(L.limb_bone(number, label, 'tip'), pose_to_basis(b), rest)
            row[key] = [round(c, 4) for c in (moved - base)]
        axes[f'{number}{label}'] = row
    evidence['tipDisplacementPerControl'] = axes
    evidence['curlDirectionCheck'] = {
        'intent': 'positive flex must carry a tip toward the median filtering side',
        'leftMovesMedially': bool(axes['1L']['flex'][0] > .05),
        'rightMovesMedially': bool(axes['1R']['flex'][0] < -.05),
        'mirrored': bool(abs(axes['1L']['flex'][0] + axes['1R']['flex'][0]) < .05),
    }

    def record(tag, basis, food, cutaway=False, shrink=1.0):
        row = analytic_clearances(kin, basis, food, tag, samples)
        row['deltaVsRest'] = delta_vs_rest(row, BASE)
        evidence['poses'].append(row)
        apply_basis(rig, basis)
        if food is not None:
            proxy.location = food
            proxy.scale = (shrink, shrink, shrink)
            proxy.hide_render = False
        else:
            proxy.hide_render = True
        bpy.context.view_layer.update()
        evidence['meshPoses'].append(mesh_clearances(tag, food, samples))
        print('POSE', tag, 'shaft', row['hardShaftMinGap'], 'filter', row['filterMinGap'],
              'shellMargin', row['shellMarginMinGap'], 'head', row['headMinGap'],
              'cup', row.get('foodProxyCupping'), 'lane', row.get('foodProxyLane'), flush=True)
        evidence['images'].extend(render_pose(tag, cutaway=False))
        if cutaway:
            evidence['images'].extend(render_pose(tag, cutaway=True))
        return row

    baseline = analytic_clearances(kin, {}, None, 'rest-baseline', samples)
    BASE = baseline['pairGaps']
    evidence['restBaseline'] = {k: baseline[k] for k in
                                ('hardShaftMinGap', 'hardShaftWorst', 'filterMinGap', 'filterWorst',
                                 'shellMarginMinGap', 'headMinGap')}
    evidence['restBaseline']['note'] = (
        'The accepted M02 geometry already has adjacent distal endopod shafts inside one '
        'another as capsules at rest (the filtering comb interdigitates). Every pose is '
        'therefore judged by how much worse than this rest baseline it is, per pair, and '
        'the only contacts allowed to close further are the Eat cupping pairs.')
    record('rest', {}, None)
    for u in (.18, .50, .83):
        record(f'attack-{int(u * 100):03d}', pose_to_basis(P.attack_pose(u)), None, cutaway=(abs(u - .50) < 1e-6))
    eat_errors = {}
    for u in (.22, .52, .88):
        basis, food, errors = eat_solved_basis(kin, u)
        eat_errors[f'{u:.2f}'] = {k: round(v, 6) for k, v in errors.items()}
        # The runtime shrinks a carried body toward the aperture across the
        # carry phase, so the evidence proxy is drawn on the same schedule.
        carry = L.smooth((u - .22) / .56)
        record(f'eat-{int(u * 100):03d}', basis, food, cutaway=(abs(u - .52) < 1e-6),
               shrink=(1 - carry) + carry * .35)
    evidence['eatSolverResidual'] = eat_errors

    # Oral measurements, taken on the presented pose rather than assumed.
    basis, food, _ = eat_solved_basis(kin, 1.0)
    apply_basis(rig, basis)
    proxy.location = food
    bpy.context.view_layer.update()
    mouth = mouthpart_points()
    aperture, narrow, nearest = measure_aperture(mouth, contact_y=food.y)
    inside = Vector((0, .225, 1.655))
    c, s2 = L.HEAD_CENTRE, L.HEAD_SCALE
    inside_ratio = Vector(((inside.x - c.x) / s2.x, (inside.y - c.y) / s2.y, (inside.z - c.z) / s2.z)).length
    presentation = Vector((0, round(food.y - .04, 3), 1.69))
    evidence['oral'] = {
        'contactCentre': [round(v, 4) for v in food],
        'measuredApertureDiameter': round(aperture, 5),
        'narrowestCorridorPoint': narrow,
        'nearestMouthpartSurface': round(nearest, 5),
        'presentationCentre': [round(v, 4) for v in presentation],
        'insidePoint': list(inside),
        'insideHeadEllipsoidRatio': round(inside_ratio, 4),
        'insideIsWithinHead': bool(inside_ratio < 1),
        'labrumPlateEndsAtZ': 1.80,
        'descentZ': 1.69,
        'descentIsBehindLabrum': True,
    }

    # How far the runtime's unbounded CCD may be allowed to correct the authored
    # contact before a pose stops holding. Measured on the real chain.
    offsets = []
    directions = (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)),
                  Vector((-1, 0, 0)), Vector((0, -1, 0)), Vector((0, 0, -1)))
    control = None
    accept = aperture * .25   # the runtime's own contact-acceptance radius
    for magnitude in (0.0, .02, .04, .08, .12, .18, .24, .32, .44):
        worst, worst_dir, residual = 1e9, None, 0.0
        for direction in (directions if magnitude else (directions[0],)):
            basis = pose_to_basis(P.eat_pose(.36))
            food0 = P.food_at(.36)
            reach = 0.0
            for (number, label), off in EAT_TARGET_OFFSET.items():
                l = L.limb_of(number, label)
                chain = [L.limb_bone(number, label, sg) for sg in L.SEGMENTS]
                reach = max(reach, solve_ccd(kin, chain, basis, grasp_rest_point(l),
                                             food0 + off + direction * magnitude))
            row = analytic_clearances(kin, basis, food0 + direction * magnitude, f'offset-{magnitude}',
                                      samples, detail=False)
            d = delta_vs_rest(row, BASE)
            value = min(d['worstDeltaOutsideCupping'], row['headMinGap'],
                        row['shellMarginMinGap'] - .05)
            residual = max(residual, reach)
            if value < worst:
                worst, worst_dir = value, [round(v, 2) for v in direction]
        if magnitude == 0.0:
            control = worst
        offsets.append({'offset': magnitude, 'worstClearance': round(worst, 5),
                        'costVersusUnoffsetPose': round(worst - control, 5),
                        'worstDirection': worst_dir,
                        'maxContactResidual': round(residual, 5),
                        'reaches': bool(residual <= accept),
                        'pass': bool(magnitude == 0.0 or (worst - control > -.004 and residual <= accept
                                                          and worst > -.05))})
        print('OFFSET', offsets[-1], flush=True)
    evidence['pickupOffsetStudy'] = {'runtimeContactAcceptanceRadius': round(accept, 5), 'samples': offsets}
    good = [o['offset'] for o in offsets if o['pass']]
    bounded_limit = max(good) if good else 0.0

    # The same study under the runtime's own unbounded CCD, with the common
    # pickup offset transferred to every companion attack chain exactly as
    # `feedAuthored` does it. No joint limits, 10/24 iterations, .22 rad cap.
    runtime_rows = []
    companions = [(n, side) for n in range(1, 7) for _, side in L.SIDES if not (n == 1 and side == 'L')]
    for magnitude in (0.0, .04, .08, .12, .18, .24, .32):
        worst, residual = 1e9, 0.0
        for direction in (directions if magnitude else (directions[0],)):
            basis = pose_to_basis(P.eat_pose(.22))
            food0 = P.food_at(.22)
            offset = direction * magnitude
            for number, label in companions:
                l = L.limb_of(number, label)
                chain = [L.limb_bone(number, label, sg) for sg in L.SEGMENTS]
                rest = grasp_rest_point(l)
                target = kin.point(chain[-1], basis, rest) + offset
                solve_ccd(kin, chain, basis, rest, target, iterations=10, max_step=.22, bounded=False)
            l = L.limb_of(1, 'L')
            chain = [L.limb_bone(1, 'L', sg) for sg in L.SEGMENTS]
            rest = grasp_rest_point(l)
            target = food0 + offset
            residual = max(residual, solve_ccd(kin, chain, basis, rest, target,
                                               iterations=24, max_step=.22, bounded=False))
            row = analytic_clearances(kin, basis, food0 + offset, f'runtime-{magnitude}', samples, detail=False)
            d = delta_vs_rest(row, BASE)
            worst = min(worst, d['worstDeltaOutsideCupping'], row['headMinGap'],
                        row['shellMarginMinGap'] - .05)
        runtime_rows.append({'offset': magnitude, 'worstClearance': round(worst, 5),
                             'maxContactResidual': round(residual, 5),
                             'pass': bool(worst > -.03 and residual <= accept)})
        print('RUNTIME', runtime_rows[-1], flush=True)
    evidence['runtimeSolverStudy'] = {'solver': 'unbounded CCD as src/render/anchors.ts implements it',
                                      'samples': runtime_rows}
    rgood = [o['offset'] for o in runtime_rows if o['pass']]
    evidence['measuredPickupOffsetLimitBounded'] = bounded_limit
    evidence['measuredPickupOffsetLimitRuntime'] = max(rgood) if rgood else 0.0
    evidence['measuredPickupOffsetLimit'] = min(evidence['measuredPickupOffsetLimitBounded'],
                                                evidence['measuredPickupOffsetLimitRuntime'])

    (HERE / 'evidence_v3.json').write_text(json.dumps(evidence, indent=2) + '\n')
    bpy.data.objects.remove(proxy, do_unlink=True)
    apply_basis(rig, {})
    bpy.ops.wm.save_as_mainfile(filepath=str(RIGBLEND))
    print('ODARAIA_V3_EVIDENCE_DONE', flush=True)


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['build']
    if args[0] == 'build':
        stage_build()
    elif args[0] == 'evidence':
        stage_evidence()
    else:
        raise SystemExit(f'unknown stage {args[0]}')
