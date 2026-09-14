"""shorekit — the Tripo intake pipeline, factored out for the three shore animals.

Nothosaurus, Shonisaurus, Placodus, Helicoprion and Dinocephalosaurus each carry the whole of
`docs/triassic/04-tripo-pipeline.md` inside one self-contained `build.py`, because each landed on
its own. The three shore animals (Tanystropheus, Macrocnemus, Coelophysis) were built together in
one pass, and copying fifty kilobytes of identical intake three times would have guaranteed that
the three drifted apart on the parts that are *not* the animal — the weld, the voxel twin, the
arc-length skinning, the export patch, the envelope measurement.

So the machinery lives here and the animals live in their own `build.py`. What stays in a builder
is everything that is that species: its orientation and unbending, its skeleton, its mouth, its
anchors and its whole performance. Nothing here knows the name of an animal, reads a registry or
writes a file outside the species its caller names.

Raw-space convention, as in the other builders: the intake mesh is carried into Tripo metres with
+X snoutward, +Y left and +Z up, and the engine transform `tx()` is applied once at the end.

A note on `Albedo`, because it is the one part of this file with a history worth knowing. It went
missing: the three builders all call `K.Albedo(auth)` and the class was not in the committed kit,
so as committed **none of the three builders would run at all**, which was found by going back to
rebuild one of them rather than by any check. It has been restored to the contract its callers
need, but the restoration is a reconstruction and not the original, and it is *not* behaviourally
free: the mouth seam is read off the pigment, so the sampling decides `JAW_FRACTION`, which decides
where the jaw is cut. A rebuild with the restored class gives Macrocnemus 20,954 triangles against
the 20,950 of the artefact that was committed before it went missing — four triangles, from a seam
that moved by less than a texel's worth of luminance. The three animals were therefore rebuilt from
this kit and re-audited, so that source and artefact agree; the lesson is that an intake whose
*geometry* depends on a texture read has no slack in that read, and that nothing here checks a
builder still imports.
"""
import bpy
import bmesh
import math
import heapq
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform, intersect_point_tri
from math import sin, cos, pi
import json
import struct


def smooth(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


# ---- intake ------------------------------------------------------------------------------------

def reset_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)


def import_and_weld(raw, name, min_component=8):
    """Import the preserved raw GLB, weld its texture-seam duplicates, drop detached flakes.

    Tripo writes one vertex per UV island corner, so a closed shell arrives as tens of thousands of
    loose vertices and hundreds of apparent components. Welding at 1e-6 is what makes the surface
    measurable at all. `min_component` is the smallest island kept: the default drops specks, and a
    body with a real detached sliver beside it (Tanystropheus has one of 114 vertices) raises it.
    """
    bpy.ops.import_scene.gltf(filepath=raw)
    obj = next(o for o in bpy.context.scene.objects if o.type == 'MESH')
    obj.name = name
    bpy.context.view_layer.objects.active = obj
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-6)
    bm.verts.ensure_lookup_table()
    seen = set()
    components = []
    for v in bm.verts:
        if v in seen:
            continue
        stack = [v]
        seen.add(v)
        part = []
        while stack:
            q = stack.pop()
            part.append(q)
            for e in q.link_edges:
                w = e.other_vert(q)
                if w not in seen:
                    seen.add(w)
                    stack.append(w)
        components.append(part)
    dropped = [len(c) for c in components if len(c) < min_component]
    for c in components:
        if len(c) < min_component:
            bmesh.ops.delete(bm, geom=c, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(obj.data)
    bm.free()
    stats = {'sourceTriangles': len(obj.data.polygons),
             'sourceComponents': len(components),
             'componentSizes': sorted((len(c) for c in components), reverse=True)[:6],
             'removedComponents': dropped,
             'removedVertices': int(sum(dropped))}
    return obj, stats


# ---- the body's own centreline -----------------------------------------------------------------

def geodesic_line(obj, bands=90, seed_dir=None):
    """Band the welded surface by geodesic distance and take each band's centroid as the axis.

    Dinocephalosaurus' technique: an axial measurement under-reads a curled body, and the ring
    centroids of a geodesic banding do not.

    The seed matters and is worth saying out loud. A double sweep — farthest point from an
    arbitrary vertex, then farthest from that — finds the two ends of the longest path over the
    surface, which on a swimming body is snout to tail tip. On a *standing* body with long legs it
    is a **toe** to the tail tip: Macrocnemus' longest geodesic runs from a hind claw, and banding
    from there reads the shin as a neck. So a caller that knows which way its animal lies passes
    `seed_dir` and the banding starts at the extreme vertex along it, which is the tail tip; the
    double sweep stays the default for bodies where it is right.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    adj = {v.index: [(e.other_vert(v).index, e.calc_length()) for e in v.link_edges] for v in bm.verts}
    pos = {v.index: np.array(v.co[:]) for v in bm.verts}
    bm.free()

    def run(s):
        dist = {k: 1e18 for k in adj}
        dist[s] = 0.
        pq = [(0., s)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u] + 1e-12:
                continue
            for w, l in adj[u]:
                nd = d + l
                if nd < dist[w] - 1e-12:
                    dist[w] = nd
                    heapq.heappush(pq, (nd, w))
        return dist

    if seed_dir is not None:
        d = np.array(seed_dir, dtype=float)
        b = max(pos, key=lambda k: float(pos[k] @ d))
        a = b
        D = run(b)
    else:
        seed = min(pos, key=lambda k: pos[k][0])
        a = max(run(seed).items(), key=lambda kv: kv[1])[0]
        da = run(a)
        b = max(da.items(), key=lambda kv: kv[1])[0]
        D = run(b)
    maxd = max(D.values())
    bins = [[] for _ in range(bands)]
    for k, d in D.items():
        bins[min(bands - 1, int(d / maxd * bands))].append(pos[k])
    raw = []
    for i, bb in enumerate(bins):
        if len(bb) < 3:
            continue
        arr = np.array(bb)
        c = arr.mean(0)
        raw.append({'geo': (i + .5) / bands * maxd, 'c': c,
                    'r': float(np.linalg.norm(arr - c, axis=1).mean()), 'n': len(bb)})
    # One pass of [1 2 1] smoothing on the centroids: banding noise is not anatomy.
    line = [raw[0]] + [{'geo': raw[i]['geo'], 'c': (raw[i - 1]['c'] + 2 * raw[i]['c'] + raw[i + 1]['c']) / 4,
                        'r': raw[i]['r'], 'n': raw[i]['n']} for i in range(1, len(raw) - 1)] + [raw[-1]]
    return line, float(maxd), pos[b].tolist(), pos[a].tolist()


def frames(pts, n0=None):
    """Parallel-transported frames along a polyline: the roll a curve carries when nothing twists."""
    T = [(pts[i + 1] - pts[i]).normalized() for i in range(len(pts) - 1)]
    up = Vector((0, 0, 1))
    N = [n0.copy() if n0 else (up - T[0] * T[0].dot(up)).normalized()]
    for i in range(1, len(T)):
        axis = T[i - 1].cross(T[i])
        n = N[-1].copy()
        if axis.length > 1e-9:
            n.rotate(Matrix.Rotation(T[i - 1].angle(T[i]), 4, axis.normalized()))
        N.append((n - T[i] * T[i].dot(n)).normalized())
    return T, N, [T[i].cross(N[i]) for i in range(len(T))]


def turning(pts):
    T, _, _ = frames(pts)
    return sum(math.degrees(T[i].angle(T[i + 1])) for i in range(len(T) - 1))


def rigid_carry(cur, tgt, cur_frames=None, tgt_frames=None):
    """Return a map that carries every point rigidly from one polyline's frames onto another's.

    Placodus straightened a hooked tail this way and Dinocephalosaurus unbent a neck through 283°:
    each cross-section is carried out of its own measured frame and into the target's, so nothing
    is stretched, sheared or thinned and the arc length, depth and width survive exactly. The
    target must be built from the *same* segment lengths or the promise is broken, which is what
    `yaw_straight_target` below does.
    """
    CF = cur_frames or frames(cur)
    TF = tgt_frames or frames(tgt)

    def carry(v):
        best = (1e9, 0, 0.)
        for i in range(len(cur) - 1):
            a = cur[i]
            d = cur[i + 1] - a
            t = max(0., min(1., (v - a).dot(d) / max(d.length_squared, 1e-18)))
            dist = (v - (a + d * t)).length
            if dist < best[0]:
                best = (dist, i, t)
        _, i, t = best
        off = v - (cur[i] + (cur[i + 1] - cur[i]) * t)
        T, N, B = CF[0][i], CF[1][i], CF[2][i]
        T2, N2, B2 = TF[0][i], TF[1][i], TF[2][i]
        return tgt[i] + (tgt[i + 1] - tgt[i]) * t + T2 * off.dot(T) + N2 * off.dot(N) + B2 * off.dot(B)
    return carry


def carry_run(obj, cur, tgt, sign, ramp=.045, radius=None):
    """Apply a rigid carry to the vertices that belong to one run of body, and to nothing else.

    The gate cannot be "past the cut" alone. On a standing animal a hind foot sits *behind* the
    tail's base station and a forelimb *forward* of the neck's, so an axial gate carries a leg
    bodily round with the run: unbending Macrocnemus' tail that way swung its hindlimbs through the
    correction and folded the surface at the hip, which the depth probe then reported — correctly —
    as a tail whose own centreline was outside it. A vertex belongs to the run when it is past the
    cut *and* within `radius` of the run's own polyline (a number, or a callable taking arc length).

    Returns the largest vertex move, in raw units.
    """
    carry = rigid_carry(cur, tgt)
    P, cum = poly(cur)
    x0 = cur[0].x
    moved = 0.
    for v in obj.data.vertices:
        t = smooth(((v.co.x - x0) * sign) / ramp)
        if t <= 0:
            continue
        if radius is not None:
            d, s = project(P, cum, v.co)
            r = radius(s) if callable(radius) else radius
            t *= smooth((r - d) / (r * .35))
            if t <= 0:
                continue
        q = v.co + (carry(v.co) - v.co) * t
        moved = max(moved, (q - v.co).length)
        v.co = q
    return moved


def yaw_straight_target(cur, ease=.22, yaw=0.):
    """Take the sideways wander out of a run of body and leave its vertical profile alone.

    Each segment keeps its own length *and* its own rise, and only the heading in plan is turned
    onto `yaw`, eased over the first `ease` of the length so the root tangent is not snapped and the
    trunk is never disturbed. That is the correction these three bodies actually need: a generated
    tail or neck that curves across the plan while the greenlit pose holds it straight, with the
    droop of the head and the lift of the tail tip both part of the pose and kept.
    """
    segs = [cur[i + 1] - cur[i] for i in range(len(cur) - 1)]
    total = sum(d.length for d in segs)
    yaw0 = math.atan2(segs[0].y, segs[0].x)
    out = [cur[0].copy()]
    s = 0.
    for d in segs:
        s += d.length
        u = smooth(min(1., (s / total) / max(ease, 1e-6)))
        th = yaw0 * (1 - u) + yaw * u
        run = math.sqrt(max(0., d.length_squared - d.z * d.z))
        out.append(out[-1] + Vector((run * cos(th), run * sin(th), d.z)))
    return out


def authored_material(obj, name, relief=.15, roughness=.7):
    """The established authored-body material: source UV albedo, white COLOR_0, restrained relief.

    The skin is explicitly two-sided. Cutting a jaw off a closed Tripo shell leaves both halves open
    along the mouth, and the source material culls backfaces, so a culled skin is a hole an open
    gape looks straight out of (Placodus measured 20.4 % see-through before this was fixed).
    """
    mat = obj.data.materials[0]
    mat.name = name
    mat.use_backface_culling = False
    bs = mat.node_tree.nodes.get('Principled BSDF')
    for link in list(mat.node_tree.links):
        if link.to_node == bs and link.to_socket.name in ['Metallic', 'Roughness']:
            mat.node_tree.links.remove(link)
    bs.inputs['Metallic'].default_value = 0
    bs.inputs['Roughness'].default_value = roughness
    for n in mat.node_tree.nodes:
        if n.type == 'NORMAL_MAP':
            n.inputs['Strength'].default_value = relief
    layer = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for item in layer.data:
        item.color = (1, 1, 1, 1)
    return mat


# ---- the source texture ---------------------------------------------------------------------------

class Albedo:
    """The intake body's own painted texture, sampled through its own UVs.

    Two quite different things need it and they need it the same way. The **twin** takes each new
    vertex's colour from the point on the intake surface nearest it, which arrives as a polygon
    index and a point on that polygon. The **mouth-line instrument** reads the painted seam off the
    pigment station by station, and asks for a UV outright. So the image lookup, the wrap and the
    polygon-to-UV interpolation live here once rather than twice in each of three builders.

    The pixel buffer is pulled out whole with `foreach_get`: `img.pixels` is a Python-level
    accessor and reading a 2048-square texture through it a million times over is minutes rather
    than the second this takes. Blender hands back linear floats whatever the image's colour space,
    which is what both callers want — a `FLOAT_COLOR` attribute is linear, and a luminance
    comparison only has to be monotonic.
    """

    def __init__(self, obj):
        self.obj = obj
        self.uv = obj.data.uv_layers.active
        assert self.uv is not None, 'the intake body has no active UV layer'
        img = None
        for m in obj.data.materials:
            if not m or not m.use_nodes:
                continue
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    img = n.image
                    break
            if img:
                break
        assert img is not None, 'the intake body carries no image texture to read pigment from'
        self.image = img
        self.w, self.h = img.size
        buf = np.empty(self.w * self.h * 4, dtype=np.float32)
        img.pixels.foreach_get(buf)
        self.px = buf.reshape(self.h, self.w, 4)

    def at(self, u, v):
        """One texel, wrapped. Returns RGBA as a plain tuple, which is what a colour slot takes."""
        x = int((u % 1.0) * (self.w - 1) + .5) % self.w
        y = int((v % 1.0) * (self.h - 1) + .5) % self.h
        p = self.px[y, x]
        return (float(p[0]), float(p[1]), float(p[2]), float(p[3]))

    def triangle_uv(self, point, poly_index):
        """The UV at a point lying on one polygon of the authored mesh, or None.

        The polygon is fanned and the triangle that actually contains the point is the one used:
        `barycentric_transform` happily extrapolates off the end of a triangle, so picking the
        first of the fan every time would put a quad's far corner somewhere else on the texture.
        """
        me = self.obj.data
        if poly_index is None or poly_index < 0 or poly_index >= len(me.polygons):
            return None
        p = me.polygons[poly_index]
        vs = [me.vertices[i].co for i in p.vertices]
        ls = [self.uv.data[li].uv for li in p.loop_indices]
        if len(vs) < 3:
            return None
        fan = [(0, k, k + 1) for k in range(1, len(vs) - 1)]
        pick = None
        for a, b, c in fan:
            if intersect_point_tri(point, vs[a], vs[b], vs[c]):
                pick = (a, b, c)
                break
        a, b, c = pick if pick else fan[0]
        try:
            r = barycentric_transform(point, vs[a], vs[b], vs[c],
                                      Vector((ls[a].x, ls[a].y, 0.)),
                                      Vector((ls[b].x, ls[b].y, 0.)),
                                      Vector((ls[c].x, ls[c].y, 0.)))
        except ValueError:
            return None            # a degenerate triangle has no barycentric frame
        return r


# ---- the procedural twin -------------------------------------------------------------------------

def voxel_twin(auth, name, voxel, budget, albedo, matname, relax=.45, roughness=.76):
    """Resurface the intake volume: regenerated topology, not a decimation of the authored faces.

    No source vertex or face survives. The voxel has to be fine enough that the thinnest thing on
    the animal survives as itself — a 0.02-radius neck, a 0.01-radius shin — which is why these
    three run finer than Placodus' 0.0055.
    """
    puppet = auth.copy()
    puppet.data = auth.data.copy()
    bpy.context.collection.objects.link(puppet)
    puppet.name = name
    bpy.context.view_layer.objects.active = puppet
    puppet.data.remesh_voxel_size = voxel
    puppet.data.remesh_voxel_adaptivity = 0
    puppet.data.use_remesh_preserve_volume = True
    bpy.ops.object.voxel_remesh()
    mod = puppet.modifiers.new('Volume surface relaxation', 'SMOOTH')
    mod.factor = relax
    mod.iterations = 1
    bpy.ops.object.modifier_apply(modifier=mod.name)
    remesh_triangles = sum(len(p.vertices) - 2 for p in puppet.data.polygons)
    mod = puppet.modifiers.new('Puppet topology budget', 'DECIMATE')
    mod.ratio = min(1., budget / max(1, remesh_triangles))
    bpy.ops.object.modifier_apply(modifier=mod.name)

    bvh = BVHTree.FromPolygons([v.co for v in auth.data.vertices],
                               [p.vertices[:] for p in auth.data.polygons], all_triangles=False)
    if puppet.data.color_attributes.get('Color'):
        puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
    pl = puppet.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
    for v in puppet.data.vertices:
        hit = bvh.find_nearest(v.co)
        s = albedo.triangle_uv(hit[0], hit[2])
        pl.data[v.index].color = albedo.at(s.x, s.y) if s else (.5, .5, .5, 1.)
    pmat = bpy.data.materials.new(matname)
    pmat.use_nodes = True
    pbs = pmat.node_tree.nodes.get('Principled BSDF')
    pvc = pmat.node_tree.nodes.new('ShaderNodeVertexColor')
    pvc.layer_name = 'Color'
    pmat.node_tree.links.new(pvc.outputs['Color'], pbs.inputs['Base Color'])
    pbs.inputs['Roughness'].default_value = roughness
    pbs.inputs['Metallic'].default_value = 0
    pmat.use_backface_culling = False
    puppet.data.materials.clear()
    puppet.data.materials.append(pmat)
    for p in puppet.data.polygons:
        p.material_index = 0
    return puppet, remesh_triangles


# ---- polylines: arc length is the skinning parameter ----------------------------------------------

def poly(pts):
    P = [Vector(p) for p in pts]
    cum = [0.]
    for i in range(1, len(P)):
        cum.append(cum[-1] + (P[i] - P[i - 1]).length)
    return P, cum


def project(P, cum, q):
    best = (1e9, 0.)
    for i in range(len(P) - 1):
        a = P[i]
        d = P[i + 1] - a
        L2 = d.length_squared
        t = 0. if L2 < 1e-12 else max(0., min(1., (q - a).dot(d) / L2))
        c = a + d * t
        dist = (q - c).length
        if dist < best[0]:
            best = (dist, cum[i] + t * d.length)
    return best


class AxialChain:
    """The trunk chain as one polyline, with a bone blend at every arc position along it."""

    def __init__(self, pts, names):
        self.P, self.cum = poly(pts)
        self.names = names
        self.station = [(names[i - 1], self.cum[i]) for i in range(1, len(names) + 1)]

    def at(self, s):
        st = self.station
        if s <= st[0][1]:
            return {st[0][0]: 1.}
        if s >= st[-1][1]:
            return {st[-1][0]: 1.}
        for i in range(len(st) - 1):
            a, b = st[i], st[i + 1]
            if a[1] <= s <= b[1]:
                t = (s - a[1]) / (b[1] - a[1])
                return {a[0]: 1 - t, b[0]: t}
        return {st[-1][0]: 1.}

    def of(self, q):
        return self.at(project(self.P, self.cum, Vector(q))[1])


class Limb:
    """One appendage as its own root→…→tip polyline with a radius that widens toward the foot."""

    def __init__(self, pts, names, radii, seat, axial):
        self.P, self.cum = poly(pts)
        self.names = names
        self.radii = radii             # (r_in0, r_in1, r_out0, r_out1)
        self.seat = seat
        self.rootw = axial.of(pts[0])

    def chain(self, s, blend=.022):
        c = self.cum
        n = self.names
        if len(n) == 3:
            tl = smooth((s - (c[1] - blend)) / (2 * blend))
            tp = smooth((s - (c[2] - blend)) / (2 * blend))
            return {n[0]: 1 - tl, n[1]: tl * (1 - tp), n[2]: tl * tp}
        out = {}
        for k in range(len(n)):
            lo = smooth((s - (c[k] - blend)) / (2 * blend)) if k > 0 else 1.
            hi = 1 - smooth((s - (c[k + 1] - blend)) / (2 * blend)) if k + 1 < len(c) else 1.
            out[n[k]] = lo * hi
        total = sum(out.values()) or 1.
        return {k: v / total for k, v in out.items()}


def skin_weights(q, axial, limbs, extra=None):
    """Blend the axial chain with whichever limb owns this vertex, radially and by how far along.

    A limb's influence is gated by how far along that limb the vertex sits (`seat`), so a root
    seated inside the trunk blends onto the body bones under it and follows the flank when the
    body bends — which is the rule the Cambrian fin builders already work to.
    """
    v = Vector(q)
    w = dict(axial.of(v))
    best = 0.
    chosen = None
    for limb in limbs:
        dist, s = project(limb.P, limb.cum, v)
        t = s / limb.cum[-1]
        r = limb.radii
        rin = r[0] + r[1] * t * t
        rout = r[2] + r[3] * t * t
        if dist >= rout:
            continue
        alpha = (1. if dist <= rin else smooth(1 - (dist - rin) / (rout - rin))) * smooth(s / limb.seat)
        if alpha > best:
            best = alpha
            chosen = (limb.chain(s), limb.rootw, t)
    if chosen:
        limbw, rootw, t = chosen
        base = {}
        for n, val in w.items():
            base[n] = base.get(n, 0) + val * (1 - t)
        for n, val in rootw.items():
            base[n] = base.get(n, 0) + val * t
        w = {n: val * (1 - best) for n, val in base.items()}
        for n, val in limbw.items():
            w[n] = w.get(n, 0) + val * best
    if extra:
        w = extra(v, w)
    w = {n: val for n, val in w.items() if val > 1e-8}
    items = sorted(w.items(), key=lambda kv: -kv[1])[:4]
    total = sum(val for _, val in items) or 1.
    return {n: val / total for n, val in items}


# ---- seating ---------------------------------------------------------------------------------------

def depth_probe(obj):
    """Signed depth inside the closed intake surface: positive inside, negative outside.

    The sign is taken by **ray parity**, not by the nearest triangle's normal. The nearest-normal
    test is the obvious one and it is wrong exactly where a standing animal's builder needs it: at
    the hips, the nearest surface to a point on the midline is the *inner face of a thigh*, whose
    normal points across the midline, so a point plainly between the belly and the backbone reads
    as outside. Macrocnemus' hip joint measured 0.007 outside its own pelvis that way, and its
    build refused a root that was never outside anything.

    Three jittered directions and a majority vote: parity is exact for a closed surface along any
    direction, and the vote is only there to survive a ray that runs along an edge.
    """
    bvh = BVHTree.FromPolygons([v.co.copy() for v in obj.data.vertices],
                               [p.vertices[:] for p in obj.data.polygons], all_triangles=False)
    DIRS = [Vector((0.9731, 0.1721, 0.1511)).normalized(),
            Vector((0.1433, 0.9611, -0.2361)).normalized(),
            Vector((-0.2113, 0.1277, 0.9691)).normalized()]

    # The step off a hit has to be big enough to leave the triangle that was hit and small enough
    # not to step over the far wall of a 0.005-thick limb; a micro-epsilon re-hits the same face
    # for ever and the parity comes back even, which reads as "outside" everywhere.
    EPS = 1e-4

    def inside(p):
        votes = 0
        seen = 0
        for d in DIRS:
            o = Vector(p)
            n = 0
            while n < 80:
                hit = bvh.ray_cast(o + d * EPS, d, 1e4)
                if hit[0] is None:
                    break
                n += 1
                o = Vector(hit[0])
            if n >= 80:
                continue                       # inconclusive: this direction does not vote
            seen += 1
            votes += n % 2
        return votes * 2 > seen

    def depth(p):
        loc, nor, idx, dist = bvh.find_nearest(Vector(p))
        return dist if inside(p) else -dist
    return depth


def seat_inside(obj, axis_of, depth, to_raw, to_engine, margin=.0012, steps=40, rate=.10):
    """Pull every vertex of an authored interior part inside the closed intake surface.

    Dinocephalosaurus put its mouth outside the animal twice before an assertion caught it, and the
    fix there was to fit the head frame properly. That is necessary and not sufficient: a head three
    hundred vertices across has a section a smooth interpolation cannot promise to stay inside, so
    every oral vertex is finally seated the way a fin root is — drawn radially towards the mouth's
    own axis until the measured depth says it is in. Returns the largest correction, in raw units,
    so a part that needed a lot of seating shows up as a number rather than silently.
    """
    worst = 0.
    for v in obj.data.vertices:
        p = to_raw(v.co)
        if depth(p) >= margin:
            continue
        a = axis_of(p)
        start = Vector(p)
        for _ in range(steps):
            if depth(p) >= margin:
                break
            p = p + (a - p) * rate
        worst = max(worst, (Vector(p) - start).length)
        v.co = to_engine(p)
    return worst


def seat(p, axis_pt, margin, depth, steps=48):
    """Pull a root radially in towards a trunk point until it is `margin` inside the skin."""
    p = Vector(p)
    a = Vector(axis_pt)
    for _ in range(steps):
        if depth(p) >= margin:
            return p
        p = p + (a - p) * .08
    return p


# ---- the mouth, measured off the surface the source actually modelled -------------------------------

def mouth_cavity(obj, region, gap):
    """Vertices whose own outward normal runs back into the mesh within `gap` — the oral slit.

    A vertex looking across the slit at the lip opposite is inside the mouth; anywhere else on a
    closed convex-ish body the ray leaves. This is Placodus' measurement and the reason its seam is
    a curve rather than a guessed plane.
    """
    bvh = BVHTree.FromPolygons([v.co.copy() for v in obj.data.vertices],
                               [p.vertices[:] for p in obj.data.polygons], all_triangles=False)
    pts = []
    for v in obj.data.vertices:
        if not region(v.co):
            continue
        hit = bvh.ray_cast(v.co + v.normal * 3e-4, v.normal, gap)
        if hit[0] is not None:
            pts.append(v.co[:])
    return np.array(pts) if pts else np.zeros((0, 3))


def blur(v, s=2.):
    i = np.arange(len(v))
    return np.array([float((v * np.exp(-.5 * ((i - k) / s) ** 2)).sum() / np.exp(-.5 * ((i - k) / s) ** 2).sum())
                     for k in i])


def cavity_profile(cav, lo, hi, step, half, smoothing=2.):
    """Per-station mid height, half width and half depth of the measured cavity."""
    xs, mid, wide, tall = [], [], [], []
    for x in np.arange(lo, hi + 1e-9, step):
        m = (cav[:, 0] >= x - half) & (cav[:, 0] < x + half)
        if m.sum() < 4:
            continue
        q = cav[m]
        a = float(np.percentile(q[:, 2], 6))
        b = float(np.percentile(q[:, 2], 94))
        xs.append(float(x))
        mid.append((a + b) / 2)
        tall.append((b - a) / 2)
        wide.append(float(np.percentile(np.abs(q[:, 1]), 92)))
    return (np.array(xs), blur(np.array(mid), smoothing), blur(np.array(wide), smoothing),
            blur(np.array(tall), smoothing))


def protrusions(obj, front, floor, region=None, smooth_iters=8, smooth_factor=.6, min_patch=6):
    """Connected patches of snout standing proud of the same surface smoothed: the teeth.

    Returns (coords, proud distance per vertex, list of patches). A cut that passes through one of
    these puts half a tooth on the wrong jaw, which is exactly the fault Placodus had.
    """
    sm = obj.copy()
    sm.data = obj.data.copy()
    bpy.context.collection.objects.link(sm)
    bpy.context.view_layer.objects.active = sm
    m = sm.modifiers.new('Snout detail reference', 'SMOOTH')
    m.factor = smooth_factor
    m.iterations = smooth_iters
    bpy.ops.object.modifier_apply(modifier=m.name)
    bvh = BVHTree.FromPolygons([v.co.copy() for v in sm.data.vertices],
                               [p.vertices[:] for p in sm.data.polygons], all_triangles=False)
    co = np.array([v.co[:] for v in obj.data.vertices])
    out = np.zeros(len(co))
    keep = np.zeros(len(co), bool)
    for i, v in enumerate(obj.data.vertices):
        if v.co.x < front or (region is not None and not region(v.co)):
            continue
        keep[i] = True
        loc, nor, idx, dist = bvh.find_nearest(v.co)
        out[i] = dist * (1 if (v.co - loc).dot(nor) > 0 else -1)
    bpy.data.objects.remove(sm)
    adj = [[] for _ in range(len(co))]
    for e in obj.data.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    mask = keep & (out > floor)
    seen = np.zeros(len(co), bool)
    groups = []
    for i in np.nonzero(mask)[0]:
        if seen[i]:
            continue
        stack = [i]
        seen[i] = True
        g = []
        while stack:
            q = stack.pop()
            g.append(q)
            for w in adj[q]:
                if mask[w] and not seen[w]:
                    seen[w] = True
                    stack.append(w)
        if len(g) >= min_patch:
            groups.append(g)
    groups.sort(key=len, reverse=True)
    return co, out, groups


def bisect_mouth(obj, seam, x_back, x_front, head_from):
    """Cut along the measured seam *curve*, by shearing it onto a plane and back again.

    The shear carries `seam(x)` exactly onto z = 0, the bisection is taken there, and the shear is
    undone: every vertex the cut adds lands on the seam itself and every vertex that was already
    there returns to where it was. Only head faces are offered to the seam pass, so the rest of the
    body keeps its topology.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for cx in [x_back, x_front]:
        bmesh.ops.bisect_plane(bm, geom=list(bm.verts) + list(bm.edges) + list(bm.faces), dist=1e-7,
                               plane_co=(cx, 0, 0), plane_no=(1, 0, 0), clear_inner=False, clear_outer=False)
    for v in bm.verts:
        v.co.z -= seam(v.co.x)
    head = [f for f in bm.faces if f.calc_center_median().x > head_from]
    verts = set()
    edges = set()
    for f in head:
        verts.update(f.verts)
        edges.update(f.edges)
    bmesh.ops.bisect_plane(bm, geom=list(verts) + list(edges) + head, dist=1e-7,
                           plane_co=(0, 0, 0), plane_no=(0, 0, 1), clear_inner=False, clear_outer=False)
    for v in bm.verts:
        v.co.z += seam(v.co.x)
    bm.to_mesh(obj.data)
    bm.free()


def split(obj, label, test, parts):
    """Separate the faces `test` accepts into their own object, recorded under `label`."""
    part = obj.copy()
    part.data = obj.data.copy()
    part.name = obj.name + ' ' + label
    bpy.context.collection.objects.link(part)
    for target, keep in [(obj, False), (part, True)]:
        bm = bmesh.new()
        bm.from_mesh(target.data)
        discard = [f for f in bm.faces if test(f.calc_center_median()) != keep]
        bmesh.ops.delete(bm, geom=discard, context='FACES')
        loose = [v for v in bm.verts if not v.link_faces]
        if loose:
            bmesh.ops.delete(bm, geom=loose, context='VERTS')
        bm.to_mesh(target.data)
        bm.free()
    parts.setdefault(label, {})[obj.name] = part
    return part


def oral_lining(name, stations, section, seam, tx, rings=22, ring=14, centre=None):
    """One closed lining on the mouth's own measured section, wound inwards.

    What an open mouth shows is the far wall of the lumen, so the tube is wound with its normals
    *inwards*: 187 of Tanystropheus' 216 vertices face the lumen, the other 29 being the two end
    caps. `flat_material(cull=True)` asks for the backfaces to be dropped as well, but that does
    not survive the glTF export — the material ships `doubleSided`, which is the safe direction of
    the two and is why this is a note rather than a bug: a double-sided lining cannot read as a
    hole whichever way a face happens to be wound, and the skin around it is opaque anyway. Do not
    "fix" the export to honour the cull without checking the gape renders again. The lining is
    *skinned* rather than split — floor on the jaw, roof on the skull, the wall between them
    stretching — so no opening the clips reach can part it.

    `centre` is the head's own lateral axis at each station. It is not always zero: these
    generations are drawn, not symmetrical, and Macrocnemus' skull sits a third of its own width
    left of the body's midline. A lumen built on the body's midline would be outside that head.
    """
    lin_raw = []
    verts = []
    faces = []
    for i in range(rings):
        x = stations[0] + (stations[1] - stations[0]) * (i / (rings - 1))
        w, h = section(x)
        for j in range(ring):
            th = j * 2 * pi / ring
            cy = centre(x) if centre else 0.
            p = Vector((x, cy + w * cos(th), seam(x) + h * sin(th)))
            lin_raw.append(p)
            verts.append(tx(p))
    for i in range(rings - 1):
        for j in range(ring):
            a = i * ring + j
            b = i * ring + (j + 1) % ring
            faces.append((a, a + ring, b + ring, b))
    faces.append(tuple(range(ring)))
    faces.append(tuple(reversed(range((rings - 1) * ring, rings * ring))))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(obj)
    obj.location = (0, 0, 0)
    return obj, lin_raw


def flat_material(name, colour, roughness=.62, cull=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = cull
    bs = mat.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = colour
    bs.inputs['Roughness'].default_value = roughness
    bs.inputs['Metallic'].default_value = 0
    mat.diffuse_color = colour
    return mat


# ---- the shared skeleton --------------------------------------------------------------------------

def build_armature(bones, tx, name, rigname):
    """One armature from an ordered {name: (raw point, parent)} table. There is only ever one rig."""
    arm = bpy.data.armatures.new(name)
    rig = bpy.data.objects.new(rigname, arm)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for n, (p, parent) in bones.items():
        eb = arm.edit_bones.new(n)
        eb.head = tx(p)
        eb.tail = eb.head + Vector((0, .16, 0))
        if parent:
            eb.parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def bind(obj, rig, bones, weightfn, tx, influences):
    """Weight, carry into engine space and bind. Raw coordinates are gone after this."""
    for n in bones:
        obj.vertex_groups.new(name=n)
    for v in obj.data.vertices:
        w = weightfn(v.co)
        influences.append(len(w))
        for n, val in w.items():
            obj.vertex_groups[n].add([v.index], val, 'REPLACE')
    for v in obj.data.vertices:
        v.co = tx(v.co)
    for p in obj.data.polygons:
        p.use_smooth = True
    mod = obj.modifiers.new('Shared articulated skeleton', 'ARMATURE')
    mod.object = rig
    obj.parent = rig


def bind_rigid(obj, rig, bonename, tx=None, material=None):
    if material is not None:
        obj.data.materials.clear()
        obj.data.materials.append(material)
    g = obj.vertex_groups.new(name=bonename)
    g.add(list(range(len(obj.data.vertices))), 1., 'REPLACE')
    if tx is not None:
        for v in obj.data.vertices:
            v.co = tx(v.co)
    for p in obj.data.polygons:
        p.use_smooth = True
    mod = obj.modifiers.new('Rigid ' + bonename, 'ARMATURE')
    mod.object = rig
    obj.parent = rig
    obj.location = (0, 0, 0)


# ---- measured comparison of the two actual surfaces -------------------------------------------------

def merged(group):
    verts = []
    polys = []
    for o in group:
        base = len(verts)
        verts.extend(v.co.copy() for v in o.data.vertices)
        polys.extend(tuple(base + j for j in q.vertices) for q in o.data.polygons)
    return verts, polys


def surface_distances(auth_group, pup_group):
    pv = BVHTree.FromPolygons(*merged(pup_group))
    return [pv.find_nearest(v)[3] for v in merged(auth_group)[0]]


def section(objects, y):
    """An exact plane intersection of the actual meshes, not a sampled silhouette."""
    points = []
    for o in objects:
        for e in o.data.edges:
            a, b = [o.data.vertices[j].co for j in e.vertices]
            if (a.y - y) * (b.y - y) <= 0 and abs(a.y - b.y) > 1e-8:
                points.append(a + (b - a) * ((y - a.y) / (b.y - a.y)))
    if not points:
        return None
    a = np.array(points)
    return {'min': a.min(0).tolist(), 'max': a.max(0).tolist()}


def slab(objects, y, half):
    """The section widened to a slab one station thick, which is what a standing animal needs.

    A plane intersection is the right instrument for a body whose appendages run across it, and the
    wrong one for a body whose legs run *along* it: a leg that begins a thousandth of a unit either
    side of the plane is in one section and absent from the other, and the envelope then reports a
    whole limb's width of disagreement between two surfaces that are everywhere within a fifth of a
    percent of each other. Taking the slab instead makes the measurement about the envelope again.
    """
    lo = np.array([np.inf] * 3)
    hi = np.array([-np.inf] * 3)
    got = False
    for o in objects:
        arr = np.array([v.co[:] for v in o.data.vertices])
        m = np.abs(arr[:, 1] - y) <= half
        if m.sum():
            got = True
            lo = np.minimum(lo, arr[m].min(0))
            hi = np.maximum(hi, arr[m].max(0))
    cut = section(objects, y)
    if cut:
        got = True
        lo = np.minimum(lo, np.array(cut['min']))
        hi = np.maximum(hi, np.array(cut['max']))
    return {'min': lo.tolist(), 'max': hi.tolist()} if got else None


def envelopes(auth_group, pup_group, stations=21, inset=.02, thickness=0.):
    ylo = min(min(v.co.y for v in o.data.vertices) for o in auth_group)
    yhi = max(max(v.co.y for v in o.data.vertices) for o in auth_group)
    rows = []
    worst = 0.
    for y in np.linspace(ylo + inset, yhi - inset, stations):
        row = {'stationY': float(y)}
        for label, group in [('authored', auth_group), ('puppet', pup_group)]:
            row[label] = slab(group, y, thickness / 2) if thickness > 0 else section(group, y)
        if row['authored'] and row['puppet']:
            row['maximumEnvelopeDifference'] = max(abs(a - b) for k in ['min', 'max']
                                                   for a, b in zip(row['authored'][k], row['puppet'][k]))
            worst = max(worst, row['maximumEnvelopeDifference'])
        rows.append(row)
    return rows, worst, float(yhi - ylo)


# ---- export ------------------------------------------------------------------------------------------

EXPORT = dict(export_format='GLB', use_selection=True, export_animations=True,
              export_animation_mode='ACTIONS', export_force_sampling=True, export_frame_range=False,
              export_skins=True, export_normals=True, export_texcoords=True, export_materials='EXPORT',
              export_vertex_color='NAME', export_vertex_color_name='Color', export_yup=True, export_extras=True)


def make_sockets(rig, anchors):
    sockets = []
    for a in anchors:
        o = bpy.data.objects.new(a['name'], None)
        bpy.context.collection.objects.link(o)
        o.parent = rig
        o.parent_type = 'BONE'
        o.parent_bone = a['bone']
        o.matrix_world.translation = Vector(a['point'])
        o['cambrianAnchor'] = {'version': 1, 'role': a['role'], 'parentBone': a['bone']}
        sockets.append(o)
    return sockets


def patch(path, anchors, drop_nodes=()):
    """Re-seat the anchors on their bones and drop the channels the contract forbids."""
    raw = open(path, 'rb').read()
    n = struct.unpack_from('<I', raw, 12)[0]
    g = json.loads(raw[20:20 + n])
    binary = raw[20 + n:]
    nodes = g['nodes']
    parents = {c: i for i, nd in enumerate(nodes) for c in nd.get('children', [])}

    def world(i):
        no = nodes[i]
        q = no.get('rotation', [0, 0, 0, 1])
        m = (Matrix(np.array(no['matrix']).reshape(4, 4).T.tolist()) if 'matrix' in no
             else Matrix.LocRotScale(Vector(no.get('translation', [0, 0, 0])),
                                     Quaternion((q[3], q[0], q[1], q[2])),
                                     Vector(no.get('scale', [1, 1, 1]))))
        return world(parents[i]) @ m if i in parents else m
    for a in anchors:
        i = next(k for k, nd in enumerate(nodes) if nd.get('name') == a['name'])
        b = next(k for k, nd in enumerate(nodes) if nd.get('name') == a['bone'])
        pt = a['point']
        pt = Vector((pt[0], pt[2], -pt[1]))
        local = world(b).inverted() @ pt
        if i in parents:
            nodes[parents[i]]['children'].remove(i)
        nodes[b].setdefault('children', []).append(i)
        nodes[i] = {'name': a['name'], 'translation': list(local),
                    'extras': {'cambrianAnchor': {'version': 1, 'role': a['role'], 'parentBone': a['bone']}}}
    for an in g['animations']:
        an['channels'] = [c for c in an['channels'] if c['target']['path'] != 'scale'
                          and nodes[c['target']['node']].get('name') not in drop_nodes]
    js = json.dumps(g, separators=(',', ':')).encode()
    js += b' ' * ((-len(js)) % 4)
    open(path, 'wb').write(struct.pack('<III', 0x46546c67, 2, 20 + len(js) + len(binary))
                           + struct.pack('<II', len(js), 0x4e4f534a) + js + binary)


def triangles(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)
