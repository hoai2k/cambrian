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

A Tripo body is **worked, not authored** (`CLAUDE.md`): these generations carry more surface detail
than our own modelling matches, so anything built by hand beside them reads as built by hand. That
rule is why this kit's shape tools are all *reshaping* tools — `rigid_carry`, `carry_run`,
`yaw_straight_target`, `bisect_mouth`, `split` — and why the only geometry it creates from nothing is
the mouth: `oral_lining`, which is explicitly exempt because a gape that shows through a head is
worse than an authored interior, and the tooth rows each builder makes, which are the stated
tooth exception and which `seat_inside` embeds in the generation's own flesh rather than standing
them on it. Do not add a shape generator here for exterior anatomy. If a body is the wrong *shape*,
the answers are to reshape it with the tools above or to stretch it (`docs/viewer-stretch.md`); if it
is missing something, the answer is to say so and show what it costs — a regeneration, or a redraw
where the pose is what is wrong.

Raw-space convention, as in the other builders: the intake mesh is carried into Tripo metres with
+X snoutward, +Y left and +Z up, and the engine transform `tx()` is applied once at the end.

A note on `Albedo`, because it is the one part of this file with a history worth knowing. It went
missing: all three builders call `K.Albedo(auth)` and the class was not in the committed kit, so as
committed **none of them would run at all** — found by going back to rebuild one, not by any check,
and long after the artefacts had shipped. `tools/triassic/shorekit-check.mjs` now resolves every
`K.<name>` a builder reaches for, statically and without Blender, so that cannot happen quietly
again.

Reconstructing it took one non-obvious step, which is why this note is here. The first attempt
sampled the pixel buffer as it comes and produced bodies that were *nearly* right: the twin's mean
vertex colour came out 0.46 against the 0.24 of the body it doubles for, and the measured mouth line
moved — Tanystropheus from 0.21 to 0.32 of the head's section, Coelophysis past the 0.65 its own
builder refuses above, so that animal would not build at all. The missing step is the **sRGB
decode** (`_to_linear`): `img.pixels` hands back the stored values, the twin writes them straight
into a linear FLOAT_COLOR attribute, and the authored body goes through the image texture where the
shader decodes them. With it, all three reproduce their original geometry exactly and Tanystropheus'
seam comes back to 0.21156143783228093 against the original's 0.21156143783228093.

Two things to keep from that. A monotonic transform of the luminance is **not** neutral for the
mouth line, because the seam is the split that maximises a *difference of means* and that is not
invariant under a curve. And an intake whose geometry depends on a texture read has no slack in
that read at all.
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
import os
import struct
import sys

# `relax_weights` is not copied here, it is *the* one from the marine kit. It is the single thing
# that stops a gate tearing a skin -- diffusion over the mesh's own edge graph coupled by inverse
# edge length, trimmed to four influences every pass, with sliver runs welded into one weight set --
# and two implementations of it would drift apart exactly where a builder could least afford it.
# The shore animals were built before it existed and were bound straight off their gates; that is
# how Coelophysis reached 25.25x and Macrocnemus 23.31x while every body using the marine kit sat
# between 1.4x and 12x. See `tools/triassic/creatures/_pipeline/tripo.py` for the whole argument.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '_pipeline'))
from tripo import relax_weights, rim_flange, cap_cut, jaw_junction            # noqa: E402,F401
from tripo import oral_shells, oral_object, mouth_room                        # noqa: E402,F401


# Blender exits 0 when a script raises. In `--background --python` mode the traceback goes to stdout
# and the process still reports success, so a chain that checks exit codes calls a failed build a
# good one and leaves the previous artefacts sitting there looking fresh. That is not hypothetical:
# it is how a Coelophysis build that stopped on its own mouth-line assertion was recorded as "BUILD
# OK", and how the stale file it left behind was then mistaken for proof that the builder reproduced
# byte for byte. Every builder imports this module, so installing the hook here fixes all of them.
def _die(exc_type, exc, tb):
    import traceback
    traceback.print_exception(exc_type, exc, tb)
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(1)


sys.excepthook = _die


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


def curvature_over_section(pts, section):
    """How bent a run of body is, in units of its own thickness.

    `meanCurvatureRadiusOverSection`, the measure Dinocephalosaurus' builder introduced: the arc
    length divided by the total turning gives the mean radius the run curves on, and dividing that
    by the run's own section radius says whether the curve is gentle or tight *for a body that
    thick*. It is the number that decides how a generation's rest pose can be brought to neutral —
    a high ratio (Dinocephalosaurus' tail is about 20) is a gentle sweep the rig can straighten by
    rotating joints, and a low one is a curve so tight for its girth that straightening it on the
    rig collapses the inside of the bend, so the mesh has to be unbent before binding.

    A run that is already straight has no curvature and returns `None` rather than dividing by zero.

    The turning is measured on every third station, as the unbend in each builder already does:
    band-to-band jitter is not anatomy, and summing it station by station reports a Tanystropheus
    tail turning through 500 degrees and a Coelophysis neck through 1383, which are the numbers of a
    noisy polyline rather than of an animal. The arc is measured on the full polyline, because
    length is not inflated by jitter the way an angle sum is.
    """
    if len(pts) < 3 or section <= 0:
        return None
    arc = sum((pts[i + 1] - pts[i]).length for i in range(len(pts) - 1))
    step = 3
    coarse = pts[::step] + ([pts[-1]] if (len(pts) - 1) % step else [])
    if len(coarse) < 3:
        return None
    turn = turning(coarse)
    if turn < 1e-6:
        return {'arc': round(arc, 4), 'totalTurningDeg': 0.0,
                'meanCurvatureRadius': None, 'sectionRadius': round(section, 4),
                'meanCurvatureRadiusOverSection': None}
    r = arc / math.radians(turn)
    # A run that turns through more than a full circle has not been measured, it has been polluted:
    # on a standing animal the band centroids where the limbs attach jump from side to side as each
    # band picks up a different amount of leg, and the angle sum runs away. The number is still
    # reported — it is evidence about the banding — but it is flagged, because the follow-up pass
    # that re-bases these bodies on a neutral pose must not read a trunk's 577 degrees as anatomy.
    reliable = turn <= 360.
    return {'arc': round(arc, 4), 'totalTurningDeg': round(turn, 1),
            'meanCurvatureRadius': round(r, 4), 'sectionRadius': round(section, 4),
            'meanCurvatureRadiusOverSection': round(r / section, 2),
            'reliable': reliable,
            'unreliableBecause': None if reliable else
            'the run turns through more than a full circle, which on a standing animal means the '
            'band centroids are picking up limb geometry rather than the axis'}


def limb_asymmetry(limbs, body_length, midline=0.):
    """How far a generation's paired limbs are from being mirror images of each other.

    The mean distance between each limb joint and its partner's mirrored position, over body length.
    These generations are *drawn*, not modelled to a rig, so the four limbs are posed mid-stride and
    do not match: this says by how much, in one number, for the pass that will re-base every body on
    a neutral pose. `midline` is the body's own lateral centre, which is not always zero.

    `limbs` is the builder's own {key: (points, names)} table; keys are paired by everything except
    a trailing L/R.
    """
    pairs, total, n = [], 0., 0
    for key, (pts, _) in limbs.items():
        if not key.endswith('L'):
            continue
        partner = key[:-1] + 'R'
        if partner not in limbs:
            continue
        other = limbs[partner][0]
        joints = min(len(pts), len(other))
        d = 0.
        for i in range(joints):
            a = Vector(pts[i])
            b = Vector(other[i])
            b = Vector((b.x, 2 * midline - b.y, b.z))        # mirrored across the body's midline
            d += (a - b).length
        pairs.append({'pair': key[:-1], 'joints': joints,
                      'meanJointOffset': round(d / joints, 5),
                      'overBodyLength': round(d / joints / body_length, 5)})
        total += d
        n += joints
    return {'pairs': pairs,
            'meanJointOffset': round(total / n, 5) if n else None,
            'overBodyLength': round(total / n / body_length, 5) if n else None}


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

def _to_linear(c):
    """The sRGB transfer function, inverted.

    Worth saying why this is not neutral for the mouth line: the seam is the split that maximises
    the difference of the mean luminance above it and below it, and a difference of means is *not*
    invariant under a curve. So decoding moves the measured seam, which is how a missing decode
    turned into a body that would not build.
    """
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


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
        assert obj.data.uv_layers.active is not None, 'the intake body has no active UV layer'
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
        """Bilinear, wrapped, **decoded to linear**. RGBA as a plain tuple, what a colour slot takes.

        The decode is the whole of it and is not optional. `img.pixels` hands back the stored values;
        the twin writes them straight into a linear FLOAT_COLOR attribute while the authored body
        goes through the image texture, where the shader decodes them — so sampling without decoding
        makes the twin the brighter of the two for the same skin, measured at a mean vertex colour of
        0.46 against the body's 0.24. It also moves the *geometry*, because the mouth seam is placed
        by measuring this pigment: undecoded, Tanystropheus' seam reads 0.32 of the head's section
        instead of 0.21 and Coelophysis' goes past the 0.65 its own builder refuses above, so that
        animal does not build at all. With the decode all three reproduce their original geometry
        exactly.

        V is *not* flipped: Blender's UV layer and its pixel buffer are both bottom-up, so they
        agree. Flipping it was tried and reads the mirror of the atlas — Tanystropheus' seam goes to
        0.83 and several stations return negative contrast, the instrument saying it is looking in
        the wrong place.

        Bilinear rather than nearest is the smaller point, but keep it: quantising every read to one
        of 2048 rows is avoidable noise in a measurement the jaw cut depends on.
        """
        fx = (u % 1.0) * (self.w - 1)
        fy = (v % 1.0) * (self.h - 1)
        x0, y0 = int(fx), int(fy)
        x1, y1 = min(x0 + 1, self.w - 1), min(y0 + 1, self.h - 1)
        tx_, ty = fx - x0, fy - y0
        p = (self.px[y0, x0] * (1 - tx_) * (1 - ty) + self.px[y0, x1] * tx_ * (1 - ty)
             + self.px[y1, x0] * (1 - tx_) * ty + self.px[y1, x1] * tx_ * ty)
        rgb = tuple(_to_linear(float(c)) for c in p[:3])
        return (rgb[0], rgb[1], rgb[2], float(p[3]))

    def triangle_uv(self, point, poly_index):
        """The UV at a point lying on one polygon of the authored mesh, or None.

        The polygon is fanned and the triangle that actually contains the point is the one used:
        `barycentric_transform` happily extrapolates off the end of a triangle, so picking the
        first of the fan every time would put a quad's far corner somewhere else on the texture.
        """
        me = self.obj.data
        if poly_index is None or poly_index < 0 or poly_index >= len(me.polygons):
            return None
        # The UV layer is looked up *now*, not cached in __init__. The builders split the body after
        # this object is made — the jaw is cut off it — and a layer captured beforehand then indexes
        # a mesh that has since changed: `wear_the_skin`, which runs after the split, asked loop
        # 41112 of a layer holding 18612 and the build died. Holding the object and asking it for its
        # current layer costs nothing and cannot go stale.
        uv = me.uv_layers.active
        if uv is None:
            return None
        p = me.polygons[poly_index]
        vs = [me.vertices[i].co for i in p.vertices]
        ls = [uv.data[li].uv for li in p.loop_indices]
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
    """One appendage as its own root→…→tip polyline with a radius that widens toward the foot.

    `radii` is the authored quadratic `(r_in0, r_in1, r_out0, r_out1)` — the radius as `r0 + r1·t²`.
    `measured`, once `measure_radii` has read the distal limb off the body, is a list of
    `(t, r_in, r_out)` rows that **widens** that quadratic where the limb is out in the open. The
    authored figure is never overruled downwards: see `measure_radii` for why.
    """

    def __init__(self, pts, names, radii, seat, axial, blend=None, blend_fraction=.35):
        self.P, self.cum = poly(pts)
        self.names = names
        self.radii = radii
        self.measured = None
        self.seat = seat
        self.rootw = axial.of(pts[0])
        # **The blend at a joint is a fraction of the segments that joint joins, never a number.**
        # A constant copied between animals is the fault that produces radiating spikes and ribboned
        # feet, and it is not obvious from the code: Rhaeticosaurus' 0.050 is a sixth of a flipper
        # reaching 0.30 from the axis, and the same figure on a theropod's forelimb — segments of
        # 0.069, 0.046 and 0.036 — is a band **wider than two whole segments**. `limb_chain` then
        # hands every vertex all four joints at nearly one weight, that busts the four-influence
        # budget once the root station is added, and `relax_weights` trims a *different* four on
        # neighbouring vertices, which is a worse discontinuity than any gate.
        seg = [self.cum[i + 1] - self.cum[i] for i in range(len(self.cum) - 1)]
        self.blend = blend if blend is not None else \
            [max(min(seg[k - 1], seg[k]) * blend_fraction, 1e-4) for k in range(1, len(seg))]

    def authored(self, t):
        r = self.radii
        return r[0] + r[1] * t * t, r[2] + r[3] * t * t

    def radius(self, t):
        rin, rout = self.authored(t)
        if self.measured:
            ts = [row[0] for row in self.measured]
            rin = max(rin, float(np.interp(t, ts, [row[1] for row in self.measured])))
            rout = max(rout, float(np.interp(t, ts, [row[2] for row in self.measured])))
        return rin, rout

    def chain(self, s, blend=None):
        """Which bone of this limb owns arc length `s`, blended over each joint's own width."""
        b = self.blend if blend is None else blend
        if not isinstance(b, (list, tuple)):
            b = [b] * (len(self.names) - 1)
        c = self.cum
        n = self.names
        if len(n) == 3:
            tl = smooth((s - (c[1] - b[0])) / (2 * b[0]))
            tp = smooth((s - (c[2] - b[1])) / (2 * b[1]))
            return {n[0]: 1 - tl, n[1]: tl * (1 - tp), n[2]: tl * tp}
        out = {}
        for k in range(len(n)):
            lo = smooth((s - (c[k] - b[k - 1])) / (2 * b[k - 1])) if k > 0 else 1.
            hi = 1 - smooth((s - (c[k + 1] - b[k])) / (2 * b[k])) if k + 1 < len(c) and k < len(b) else 1.
            out[n[k]] = lo * hi
        total = sum(out.values()) or 1.
        return {k: v / total for k, v in out.items()}


def measure_radii(obj, limb, t_floor=.5, bins=4, inner=.99, outer=.999, margin=.018,
                  fade=.15, span=.65):
    """Measure, off the body itself, the radius inside which a vertex is wholly this limb's.

    **A radius guessed for a paddle is wrong for anything that swings.** The kit's fins take a
    percentile of a blade's own distances as the inner radius and blend from there out; the marine
    kit shipped the **55th**, which leaves nearly half the blade on a partial alpha. On a fin that
    steers nobody notices. On Rhaeticosaurus' flippers, sweeping 130°, the relaxation then spread
    *trunk* weight right out along the blade and `skin-tears.mjs` read 7.9x; the **92nd** percentile
    took it to 2.81x, the cleanest skin in the era. **A running biped swings harder than anything**,
    and Coelophysis' authored `(.014, .018, .040, .034)` hind radius left its toes carrying
    `hind_foot_L = 0.565` against `tail_00 = 0.298` and `body = 0.137` — 44 % of a *toe* on the
    trunk, which is why its feet trailed off in ribbons at 13.6x even after the weights were relaxed.

    **What the limb is, is found by walking the mesh, not by a distance test.** Rhaeticosaurus could
    take the percentile over a flipper's own vertex cluster because a thin-shell clustering had
    already said which vertices those were. Here there is no cluster, and the obvious substitute —
    "nearer this limb's polyline than the axial one" — is wrong in two ways at once. A limb polyline
    ends at its last joint, so everything past the foot projects to that one point with its arc
    length clamped, and half the animal lands in the distal bin: measured that way Coelophysis' foot
    radius read 0.22 of a body, three times the leg's own thickness. And proximally the trunk is
    nearer the thigh's line than the spine's, so the belly joins the thigh.

    So the limb is **flooded** from its tip over the mesh's own edges, never letting the arc position
    fall below `t_floor`, which is past the knee. The fill stops where the limb meets the body
    because that is where `t` drops, and it cannot reach the other leg or the tail because neither is
    joined to the foot inside that region. `span` asserts that what came back is limb-sized: a fill
    whose bounding box is more than that fraction of the body has leaked, and the build should stop
    rather than skin a trunk onto a foot.

    Because the flood *is* the segmentation, `inner` is near the top of it rather than at the 92nd
    percentile the marine kit takes over a cluster. A percentile leaves the outermost tenth of the
    limb on a partial alpha, and on a blade that steers nobody notices; on a theropod's splayed toes
    that tenth is the part that swings furthest, and at the 92nd they still came out
    `hind_foot_R = 0.62` against `body = 0.37` — an 11.19x tear. Nothing in that bin but the limb is
    inside the radius anyway: at `t_floor` and beyond, the flood has already said what is there.

    Below the flood the authored radius stands, and that is deliberate. Proximally a limb *is* fused
    to the trunk, the root is seated inside it, and the blend onto the body bones under it is what
    makes a seated root follow the flank. The measurement only ever widens, and only out in the open.

    Returns the `(t, r_in, r_out)` rows `Limb.radius` interpolates, and a record of the fill.
    """
    P, cum, total = limb.P, limb.cum, limb.cum[-1]
    verts = obj.data.vertices
    dist = np.empty(len(verts))
    tpos = np.empty(len(verts))
    for v in verts:
        d, s = project(P, cum, Vector(v.co))
        dist[v.index] = d
        tpos[v.index] = s / total
    tip = Vector(P[-1])
    seed = min(range(len(verts)), key=lambda i: (Vector(verts[i].co) - tip).length)
    adj = [[] for _ in verts]
    for e in obj.data.edges:
        a, b = e.vertices
        adj[a].append(b)
        adj[b].append(a)
    seen = {seed}
    stack = [seed]
    while stack:
        i = stack.pop()
        for j in adj[i]:
            if j in seen or tpos[j] < t_floor:
                continue
            seen.add(j)
            stack.append(j)
    fill = np.array(sorted(seen))
    assert len(fill) > 40, ('nothing flooded from this limb tip', limb.names, len(fill))
    box = np.array([verts[int(i)].co[:] for i in fill])
    reach = float((box.max(axis=0) - box.min(axis=0)).max())
    assert reach < span, ('the limb flood leaked out of the limb', limb.names, reach, span)
    rows = []
    for b in range(bins):
        t0 = t_floor + (1. - t_floor) * b / bins
        t1 = t_floor + (1. - t_floor) * (b + 1) / bins
        m = fill[(tpos[fill] >= t0) & (tpos[fill] < (t1 if b + 1 < bins else 1.0001))]
        if len(m) < 12:
            continue
        d = dist[m]
        rows.append([(t0 + t1) / 2, float(np.quantile(d, inner)), float(np.quantile(d, outer))])
    assert rows, ('the limb flood filled no bin', limb.names, len(fill))
    for r in rows:
        r[2] = max(r[2] + margin, r[1] * 1.10)
    # The authored radius at the station just inside the flood, so the interpolation ramps onto the
    # measurement rather than stepping onto it.
    t_hand = max(0., rows[0][0] - fade)
    rows.insert(0, [t_hand, *limb.authored(t_hand)])
    return [tuple(r) for r in rows], {'flooded': int(len(fill)), 'reach': round(reach, 4),
                                      'seedVertex': int(seed), 'tFloor': t_floor}


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
        rin, rout = limb.radius(t)
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


def seat_inside(obj, axis_of, depth, to_raw, to_engine, margin=.0012, steps=40, rate=.10, keep=0.):
    """Pull every vertex of an authored interior part inside the closed intake surface.

    Dinocephalosaurus put its mouth outside the animal twice before an assertion caught it, and the
    fix there was to fit the head frame properly. That is necessary and not sufficient: a head three
    hundred vertices across has a section a smooth interpolation cannot promise to stay inside, so
    every oral vertex is finally seated the way a fin root is — drawn radially towards the mouth's
    own axis until the measured depth says it is in. Returns the largest correction, in raw units,
    so a part that needed a lot of seating shows up as a number rather than silently.

    `keep` is the least fraction of its own radius a vertex may retain, and a lining wants one.
    Unclamped, forty steps at a tenth take a vertex 98 % of the way onto the axis, so a ring the
    snout is narrower than **collapses to a point**: adjacent vertices end up 0.00017 apart, the
    quads between them invert, and the moment those two vertices ride different bones the pair reads
    as a **1076x** stretch — which is what Macrocnemus' lining did as soon as its floor was made to
    follow the mandible properly. Rhaeticosaurus clamps its own fit at 0.615 for the same reason.
    Zero, the default, is the behaviour every body built before this one was measured with.
    """
    worst = 0.
    for v in obj.data.vertices:
        p = to_raw(v.co)
        if depth(p) >= margin:
            continue
        a = axis_of(p)
        start = Vector(p)
        floor = keep * (start - Vector(a)).length
        for _ in range(steps):
            if depth(p) >= margin:
                break
            q = p + (Vector(a) - p) * rate
            if floor and (q - Vector(a)).length < floor:
                break
            p = q
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


def oral_lining(name, stations, section, seam, tx, rings=22, ring=14, centre=None, power=2.,
                overlap=.16, throat=.18, swell=1.60, behind=0., room=None, fill=.90, buried=.78):
    """A **palate on the skull and a floor on the jaw**, each closed on its own.

    This used to be one sac whose wall stretched between the two bones, and the wall is the reason
    it is not any more: it is a mouth webbed shut. What replaced it, and why the closure still
    holds, is `oral_shells` in `_pipeline/tripo.py` -- imported here rather than copied, so the
    marine kit and the shore kit have one implementation of the mouth between them.

    The object comes back already weighted: the palate rigid on `skull`, the floor rigid on `jaw`.
    A builder that re-weighted it per vertex would be reinventing the blend the wall needed.

    `centre` is the head's own lateral axis at each station. It is not always zero: these
    generations are drawn, not symmetrical, and Macrocnemus' skull sits a third of its own width
    left of the body's midline. `power` is the section's superellipse exponent -- a mouth's section
    is not an ellipse, and on a deep head the difference used to be a hole.
    """
    raw, faces, n_palate = oral_shells(seam, section, stations[0], stations[1], rings=rings,
                                       ring=ring, centre=centre, power=power, overlap=overlap,
                                       throat=throat, swell=swell, behind=behind, room=room,
                                       fill=fill, buried=buried, axis='x')
    obj = oral_object(name, tx, raw, faces, n_palate, None, measured_room=room is not None)
    return obj, raw


def wear_the_skin(obj, source, albedo, material, to_raw=None):
    """Give an authored patch the creature's own texture instead of a flat colour.

    `CLAUDE.md`: whatever is authored must wear the creature's own texture — it takes its UVs from
    the surrounding surface and samples the same albedo, so a patch is not a smooth flat-shaded
    island in a pored hide. That is what this does, and it is the requirement that makes
    hole-filling geometry acceptable at all.

    Every loop of `obj` is given the UV of the point on `source` nearest its vertex, so the patch
    reads the albedo exactly where the skin around it does and the texture runs continuously across
    the join. The patch then takes the body's own material, not one of its own: same image, same
    relief, same two-sidedness, and one less material in the file.

    This is for a patch that fills a hole in the skin. It is *not* for the oral lining or the teeth,
    which are interior and are meant to look like a mouth rather than like hide.

    `to_raw` carries a patch's vertices back into the intake surface's own space, because the
    authored parts are built in engine space and the intake mesh is still in raw Tripo metres.
    Call this *after* `seat_inside`, so the UVs answer where the patch finally sits.
    """
    bvh = BVHTree.FromPolygons([v.co for v in source.data.vertices],
                               [poly_.vertices[:] for poly_ in source.data.polygons],
                               all_triangles=False)
    uvl = obj.data.uv_layers.get('UVMap') or obj.data.uv_layers.new(name='UVMap')
    missed = 0
    for poly_ in obj.data.polygons:
        for vi, li in zip(poly_.vertices, poly_.loop_indices):
            co = obj.data.vertices[vi].co
            hit = bvh.find_nearest(to_raw(co) if to_raw else co)
            uv = albedo.triangle_uv(hit[0], hit[2]) if hit and hit[0] is not None else None
            if uv is None:
                missed += 1
                continue
            uvl.data[li].uv = (uv.x, uv.y)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for poly_ in obj.data.polygons:
        poly_.material_index = 0
    return {'loops': len(obj.data.loops), 'unprojected': missed}


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


def bind(obj, rig, bones, weightfn, tx, influences, passes=4, hold=.45, pin=None):
    """Weight, relax over the surface, carry into engine space and bind.

    The relaxation is not a polish step, it is the load-bearing half. `weightfn` is a stack of
    gates -- a radius round a limb polyline, a height off the axis, an arc position -- and a gate
    always has an edge: two vertices a hundredth of a body apart land on opposite sides of one and
    the skin between them is asked to span the difference between two bones. Bound straight off the
    gates, this kit's three animals read 25.25x, 23.31x and 5.0x on `tools/triassic/skin-tears.mjs`
    while every body on the marine kit, which has always relaxed, sat far below that.

    Raw coordinates are gone after this, so the diffusion runs first: it couples by inverse edge
    length, which is measured in whatever units `obj` is currently in.
    """
    for n in bones:
        obj.vertex_groups.new(name=n)
    relaxed = relax_weights(obj, [weightfn(v.co) for v in obj.data.vertices],
                            passes=passes, hold=hold)
    for v in obj.data.vertices:
        w = pin(v.co, relaxed[v.index]) if pin else relaxed[v.index]
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
