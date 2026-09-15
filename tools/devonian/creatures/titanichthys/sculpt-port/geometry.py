"""Titanichthys body/eye/fin geometry, ported from rework-v3/build_clay04.py (the geometry stage
every later candidate treats as immutable rest geometry, per its own geo_hash checks). Reused
verbatim except for one addition: an optional nose loft (`nose_edit=True`) that re-authors the
snout's own profile rows per titanichthys-sculpt.json.

The head is not a swept profile table like the post-neck body: it is a cage of six control rows
per angle -- mouth rim, lip back, preoral, crown, occipital, neck -- that `cage_spline()` lofts
through. Those control rows ARE the snout's profile table, and the sculpt is applied to them and
to rows read off the same cage in between (`head_controls()`, `HEAD_KNOTS_LOFT`, and the same
lofted mouth rim inside `oral_surface()`), never to the finished vertices. A lateral scale applied
per vertex to a blunt rounded snout squeezes rows that wrapped round a wide nose into a narrow one
and folds them into pleats wherever the scale changes faster than the rows are spaced -- which is
what the first port of this sculpt did (adjacent face normals up to 170 degrees apart over the
snout, against 90 on the shipped file), and its one knot at station 15 creased the neck into a
hard ring as well (an 8% waist with a slope reversal at axis 1.22). Lofting the rows instead keeps
the surface as smooth as the shipped one by construction, and it is measured: the rebuilt snout's
99th-percentile face-normal angle is 39.7 degrees against the unedited rebuild's 40.4, and the
neck's 33.4 against 32.4 (`solve_nose.py`).

The snout's width taper was re-authored again on 14 September (see `_NOSE_WIDTH`): smooth by that
measure it was, but it ended on a floor rather than closing, and the tab that left standing off
the prow is what the user asked to have smoothed out.

Call `build(nose_edit)` inside a fresh Blender scene. Returns the constructed objects.
"""
import bpy
import bmesh
import math
from math import sin, cos, pi, exp
from mathutils import Vector
from mathutils.kdtree import KDTree

# ---- nose loft: the snout's re-authored profile table, keyed on the model's own unlofted GLB-z
# (= -Blender y). Each curve is (axis, value) knots read as a shape-preserving monotone cubic
# (`_hermite` below), with zero slope at both ends so the curve leaves the neck exactly as flat as
# the untouched body behind it -- the first knot is the neck itself (NECK_AXIS = -NECK_Y), where
# every curve is identity, which keeps the neck seam closed against the post-neck loft this never
# touches, with no step and no change of slope across it.
#
# The numbers are what `npm run sculpt:measure` asks for, not the sculpt's station percentages
# read literally: the port is 0.226 longer, so its 20-station grid no longer lands where the
# sculpt's did, and each station is a windowed extreme rather than a point on the curve. These
# were solved against the measured stations (see sculpt-port/solve_nose.py) so stations 15-19 of
# the rebuilt model land on the sculpt's edited curves, and stations 0-14 stay exactly as shipped.
NECK_AXIS = 1.08
_NOSE_SHIFT = [(NECK_AXIS, 0.), (1.55, .0066), (1.9765, .0111), (2.3561, .1516), (2.7357, .2293)]
# The width curve behind axis 2.15 is the first port's, untouched. Ahead of it the taper is
# re-authored so the snout *closes*: the first port fell to a .221 floor at 2.55 and held it to
# the frontmost row, and the rostral shelf that overhangs the mouth (the preoral cage row reaches
# 0.14 further forward than the mouth rim does) was left wrapping a nose that no longer had the
# width to carry it. What that squeezed out was a parallel-sided tab standing off the prow, a
# hand's breadth wide and pinched either side of its root, with the shield falling away into a
# hollow behind each shoulder -- read head-on, a nose with two nostrils. Ending the taper at the
# frontmost row instead lets the prow converge to a rounded point, and spreading the same
# narrowing over .49 of axis rather than .30 takes the hollows out with it.
_NOSE_WIDTH = [(NECK_AXIS, 1.), (1.15, .9836), (1.25, .9537), (1.4, .896), (1.55, .887),
               (1.7, .9636), (1.8, 1.0104), (1.95, 1.0051), (2.05, .988), (2.15, .964),
               (2.25, .90), (2.35, .795), (2.45, .66), (2.55, .50), (2.62, .385),
               (2.68, .255), (2.7357, .10)]
# The tab-ended curve the model on disk was built with. A position transplant matches the
# candidate against a base that reproduces the *shipped* vertices, so the base for this rework is
# this curve, not the unedited body: `build_base_full.py --previous-nose`.
_NOSE_WIDTH_PREVIOUS = [(NECK_AXIS, 1.), (1.15, .9836), (1.25, .9537), (1.4, .896), (1.55, .887),
                        (1.7, .9636), (1.8, 1.0104), (1.95, 1.0051), (2.05, .988), (2.15, .964),
                        (2.25, .9), (2.35, .6658), (2.45, .3976), (2.55, .221), (2.65, .221),
                        (2.7357, .221)]
_NOSE_DORSAL = [(NECK_AXIS, 1.), (1.6, 1.), (1.85, .982), (2.05, .9682), (2.25, .962),
                (2.45, .929), (2.62, .862), (2.7357, .86)]
_NOSE_VENTRAL = [(NECK_AXIS, 1.), (1.6, .9607), (1.85, 1.075), (2.05, 1.085), (2.25, 1.1),
                 (2.45, 1.08), (2.62, 1.), (2.7357, 1.)]


def _hermite(knots, z):
    """Fritsch-Carlson monotone cubic through (axis, value) knots, flat outside them. C1, and it
    cannot overshoot a knot -- an envelope curve that bulged between two rows would loft a fold."""
    n = len(knots)
    if z <= knots[0][0]:
        return knots[0][1]
    if z >= knots[-1][0]:
        return knots[-1][1]
    h = [knots[i + 1][0] - knots[i][0] for i in range(n - 1)]
    d = [(knots[i + 1][1] - knots[i][1]) / h[i] for i in range(n - 1)]
    m = [0.] * n
    for i in range(1, n - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    k = next(i for i in range(n - 1) if knots[i][0] <= z <= knots[i + 1][0])
    t = (z - knots[k][0]) / h[k]
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * knots[k][1] + (t3 - 2 * t2 + t) * h[k] * m[k]
            + (-2 * t3 + 3 * t2) * knots[k + 1][1] + (t3 - t2) * h[k] * m[k + 1])


def nose_loft(p):
    """Place one snout control row (or an anchor riding with it). p is a Blender-frame point
    (x, y, z); y<0 is forward (nose), z is up."""
    zc = -p.y
    if zc <= NECK_AXIS:
        return Vector(p)
    rw = _hermite(_NOSE_WIDTH, zc)
    rd, rv = _hermite(_NOSE_DORSAL, zc), _hermite(_NOSE_VENTRAL, zc)
    return Vector((p.x * rw, -(zc + _hermite(_NOSE_SHIFT, zc)), p.z * (rd if p.z >= 0 else rv)))


def build(nose_edit=False):
    def mat(name, rgb, roughness=.64):
        m = bpy.data.materials.new(name)
        m.diffuse_color = (*rgb, 1)
        m.use_nodes = True
        bsdf = m.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Base Color'].default_value = (*rgb, 1)
        bsdf.inputs['Roughness'].default_value = roughness
        bsdf.inputs['Metallic'].default_value = 0
        return m

    CLAY = mat('Neutral sculpt clay', (.43, .405, .37))
    LIP = mat('Edentulous soft margin clay', (.395, .37, .34))
    ORAL = mat('Oral interior inspection clay', (.255, .235, .22), .72)
    FIN = mat('Fin clay', (.40, .38, .35), .63)
    EYE = mat('Recessed globe clay', (.10, .105, .105), .36)

    def mesh_object(name, verts, faces, materials, indices=None):
        mesh = bpy.data.meshes.new(name + '.mesh')
        mesh.from_pydata(verts, [], faces)
        mesh.update()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.collection.objects.link(obj)
        for material in materials:
            mesh.materials.append(material)
        if indices:
            for p, mi in zip(mesh.polygons, indices):
                p.material_index = mi
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons:
            p.use_smooth = True
        return obj

    def clamp(t, low=0., high=1.):
        return min(high, max(low, t))

    def smooth(t):
        t = clamp(t)
        return t * t * t * (t * (t * 6 - 15) + 10)

    def gauss(v, c, s):
        return exp(-((v - c) / s) ** 2)

    # Independent anatomical envelope: y, half-width, roof z, ventral z.
    PROFILE = [
        (-2.83, .99, -.11, -.255),
        (-2.76, 1.16, .16, -.265),
        (-2.62, 1.31, .42, -.29),
        (-2.40, 1.42, .67, -.36),
        (-2.08, 1.455, .86, -.52),
        (-1.70, 1.405, .965, -.735),
        (-1.38, 1.345, 1.02, -.89),
        (-1.08, 1.285, 1.065, -.945),
        (-.75, 1.225, 1.09, -.96),
        (-.28, 1.085, 1.035, -.895),
        (.23, .925, .905, -.77),
        (.79, .70, .72, -.59),
        (1.36, .470, .52, -.405),
        (1.91, .285, .34, -.25),
        (2.40, .165, .225, -.14),
        (2.82, .115, .245, -.045),
        (3.13, .080, .41, .14),
        (3.44, .047, .64, .44),
        (3.72, .010, .895, .81),
    ]

    def profile(y):
        k = next((i for i in range(len(PROFILE) - 1)
                  if PROFILE[i][0] <= y <= PROFILE[i + 1][0]), None)
        if k is None:
            return PROFILE[0][1:] if y < PROFILE[0][0] else PROFILE[-1][1:]
        a, b = PROFILE[k], PROFILE[k + 1]
        pre, post = PROFILE[max(0, k - 1)], PROFILE[min(len(PROFILE) - 1, k + 2)]
        t = (y - a[0]) / (b[0] - a[0])
        values = []
        for j in (1, 2, 3):
            m0 = (b[j] - pre[j]) / (b[0] - pre[0]) * (b[0] - a[0])
            m1 = (post[j] - a[j]) / (post[0] - a[0]) * (b[0] - a[0])
            values.append((2 * t ** 3 - 3 * t * t + 1) * a[j] + (t ** 3 - 2 * t * t + t) * m0
                          + (-2 * t ** 3 + 3 * t * t) * b[j] + (t ** 3 - t * t) * m1)
        return values

    def base_surface(y, a):
        w, top, bottom = profile(y)
        ss, cc = sin(a), cos(a)
        head = 1 - smooth((y + 1.3) / 1.7)
        power_x = 1 - .13 * head
        power_z = 1 - .18 * head * max(0, ss)
        center, half_h = (top + bottom) / 2, (top - bottom) / 2
        x = w * math.copysign(abs(cc) ** power_x, cc)
        z = center + half_h * math.copysign(abs(ss) ** power_z, ss)
        mouth_sweep = .99 * abs(cc) ** 3 * clamp((-1.38 - y) / 1.45)
        yy = y + mouth_sweep
        z -= .020 * gauss(y, -2.83, .11) * max(0, -ss) ** 8
        yy -= .012 * gauss(y, -2.83, .12) * max(0, -ss) ** 4
        cheek = gauss(y, -2.12, .52) * gauss(ss, .14, .40)
        x += math.copysign(.045 * cheek, cc)
        floor_inset = .105 * gauss(y, -2.33, .40) * smooth((-ss - .025) / .45)
        x *= 1 - floor_inset
        z += .045 * gauss(y, -2.34, .38) * max(0, -ss) ** 4
        orbit = gauss(y, -2.50, .18) * gauss(ss, .44, .17)
        x -= math.copysign(.013 * orbit, cc)
        z += .025 * gauss(y, -1.88, .48) * max(0, ss) ** 8
        root = gauss(y, -.76, .45) * gauss(ss, -.40, .28)
        x += math.copysign(.115 * root, cc)
        z -= .030 * root
        muscle = smooth((y + .25) / .8) * (1 - smooth((y - 2.2) / .55))
        z += .035 * muscle * max(0, ss) ** 8
        x += math.copysign(.025 * gauss(y, .78, .70) * gauss(ss, .14, .38), cc)
        x -= math.copysign(.012 * gauss(y, 1.78, .48) * gauss(ss, -.30, .32), cc)
        return Vector((x, yy, z))

    def catmull(points, subdivisions=16):
        points = [Vector(p) for p in points]
        result = []
        for i in range(len(points) - 1):
            a, b = points[max(0, i - 1)], points[i]
            c, d = points[i + 1], points[min(len(points) - 1, i + 2)]
            for j in range(subdivisions):
                t = j / subdivisions
                result.append(.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t
                                    + (-a + 3 * b - 3 * c + d) * t * t * t))
        result.append(points[-1])
        return result

    SEAM_PATHS = [
        [(-2.49, 1.57), (-2.40, 1.20), (-2.25, .84), (-2.04, .48), (-1.72, .24), (-1.39, .15)],
        [(-1.96, 1.57), (-1.94, 1.25), (-1.84, .93), (-1.60, .69), (-1.36, .61)],
        [(-1.34, -1.40), (-1.32, -.92), (-1.32, -.40), (-1.34, .15), (-1.34, .78), (-1.36, 1.57)],
        [(-1.30, .68), (-.95, .71), (-.62, .70), (-.30, .78), (-.03, .97)],
        [(-.63, .70), (-.49, .37), (-.39, .03), (-.38, -.35), (-.50, -.68)],
        [(-.11, .96), (.06, .57), (.08, .10), (-.01, -.37), (-.26, -.71)],
    ]
    seam_samples = []
    for path in SEAM_PATHS:
        for q in catmull(path, 72):
            for a in (q.y, pi - q.y):
                seam_samples.append(base_surface(q.x, a))
    seam_tree = KDTree(len(seam_samples))
    for i, p in enumerate(seam_samples):
        seam_tree.insert(p, i)
    seam_tree.balance()

    def surface(y, a):
        p = base_surface(y, a)
        if y < .4:
            w, top, bottom = profile(y)
            normal = Vector((cos(a) / max(.1, w), 0,
                             sin(a) / max(.1, (top - bottom) / 2))).normalized()
            _, _, distance = seam_tree.find(p)
            p -= normal * (.006 * exp(-(distance / .033) ** 2))
        return p

    HEAD_KNOTS = [0., .06, .22, .46, .73, 1.]
    # The sculpted snout is lofted through a DENSER profile table: the shipped cage's own six
    # rows, plus rows read off that same cage in between. Six rows cannot carry this edit -- the
    # span from the crown to the preoral row is most of the snout, and once the nose is drawn out
    # and pulled in to a point the spline between those two rows runs wide of the taper (40% over
    # the sculpt's width at the nose station, measured) and wobbles in and out between them, which
    # reads as creases running the length of the snout. Every row here is a point on the shipped
    # cage, so with the loft identity this table rebuilds the shipped head.
    HEAD_KNOTS_LOFT = [0., .06, .10, .16, .22, .28, .34, .40, .46, .55, .64, .73, .86, 1.]
    NECK_Y = -1.08

    def mouth_rim(a):
        cc, ss = cos(a), sin(a)
        x = .91 * cc
        y = -2.60 + .70 * abs(cc) ** 2.6
        z = -.080 + .064 * ss - .020 * max(0, ss) ** 3 - .014 * max(0, -ss) ** 8
        return Vector((x, y, z))

    def head_controls(a):
        cc, ss = cos(a), sin(a)
        up, down = max(0, ss), max(0, -ss)
        cx = math.copysign(abs(cc) ** (1 - .12 * smooth(up)), cc)
        m = mouth_rim(a)
        lip_back = m + Vector((.030 * cc, .030 * cc * cc - .025 * up + .020 * down,
                               .055 * up - .042 * down))
        preoral = Vector(((1.12 - .42 * smooth(down / .70)) * cx,
                          -1.72 - 1.00 * smooth(up) - .69 * smooth(down),
                          -.030 + .55 * up ** .72 - .22 * down ** .80))
        crown = Vector(((1.43 - .57 * smooth(down / .70)) * cx,
                        -1.60 - .58 * smooth(up) - .41 * smooth(down),
                        .080 + .88 * up ** .62 - .56 * down ** .85))
        occipital = Vector(((1.39 - .08 * smooth(down / .75)) * cx,
                            -1.30 - .31 * smooth(up) - .23 * smooth(down),
                            .045 + .98 * up ** .74 - .84 * down ** .85))
        rows = [m, lip_back, preoral, crown, occipital, surface(NECK_Y, a)]
        if not nose_edit:
            return rows
        # The sculpt is applied here, to the profile rows themselves, so everything lofted
        # through them (surface, oral lining, eye windows, the mouth rim seam) follows one
        # smooth set of rows. The neck row is identity by construction: its axis is NECK_AXIS
        # exactly, where every envelope curve is 1.
        return [nose_loft(cage_spline(rows, t)) for t in HEAD_KNOTS_LOFT]

    def cage_spline(points, t, knots=HEAD_KNOTS):
        if t <= 0:
            return points[0].copy()
        if t >= 1:
            return points[-1].copy()
        k = next(i for i in range(len(knots) - 1) if knots[i] <= t <= knots[i + 1])
        lo, hi = knots[k], knots[k + 1]
        q = (t - lo) / (hi - lo)
        before, after = max(0, k - 1), min(len(points) - 1, k + 2)
        d0 = (points[k + 1] - points[before]) / (knots[k + 1] - knots[before]) * (hi - lo)
        d1 = (points[after] - points[k]) / (knots[after] - knots[k]) * (hi - lo)
        return ((2 * q ** 3 - 3 * q * q + 1) * points[k] + (q ** 3 - 2 * q * q + q) * d0
                + (-2 * q ** 3 + 3 * q * q) * points[k + 1] + (q ** 3 - q * q) * d1)

    def head_base(t, a):
        return cage_spline(head_controls(a), t, HEAD_KNOTS_LOFT if nose_edit else HEAD_KNOTS)

    HEAD_SUTURES = [
        [(.22, 1.57), (.26, 1.22), (.37, .91), (.51, .65), (.60, .30)],
        [(.49, 1.57), (.51, 1.26), (.57, .98), (.67, .72)],
        [(.80, -.96), (.80, -.45), (.80, .10), (.80, .69), (.80, 1.57)],
    ]
    head_seam_points = []
    for path in HEAD_SUTURES:
        for q in catmull(path, 72):
            for a in (q.y, pi - q.y):
                head_seam_points.append(head_base(q.x, a))
    head_seams = KDTree(len(head_seam_points))
    for i, q in enumerate(head_seam_points):
        head_seams.insert(q, i)
    head_seams.balance()

    def head_surface(t, a):
        p = head_base(t, a)
        if .08 < t < .99:
            tangent = head_base(min(1, t + .0001), a) - head_base(max(0, t - .0001), a)
            around = head_base(t, a + .0001) - head_base(t, a - .0001)
            normal = tangent.cross(around).normalized()
            distance = head_seams.find(p)[2]
            p -= normal * (.0065 * exp(-(distance / .029) ** 2))
        return p

    def head_weights(t, a):
        ss = sin(a)
        jaw = smooth(-ss / .22) * (1 - smooth((t - .065) / .32))
        skull = smooth((ss + .09) / .25) * (1 - smooth((t - .64) / .36))
        floor = sin(pi * clamp((t - .07) / .48)) ** 2 * smooth((-ss - .05) / .40)
        return jaw, skull, floor

    verts, faces, materials, gape_weights, roof_weights, floor_weights = [], [], [], [], [], []

    def vertex(p, jaw=0., roof=0., floor=0.):
        verts.append(tuple(p))
        gape_weights.append(clamp(jaw))
        roof_weights.append(clamp(roof))
        floor_weights.append(clamp(floor))
        return len(verts) - 1

    def quad(indices, mat_index=0):
        faces.append(tuple(indices))
        materials.append(mat_index)

    N = 192
    HEAD_ROWS = 112
    head_rows = []
    for i in range(HEAD_ROWS + 1):
        t = i / HEAD_ROWS
        row = []
        for j in range(N):
            a = 2 * pi * j / N
            row.append(vertex(head_surface(t, a), *head_weights(t, a)))
        head_rows.append(row)

    ORBIT_WINDOWS = [(34, 42, 13, 19, 'L'), (34, 42, 77, 83, 'R')]

    def eye_cell(i, j):
        return any(i0 <= i < i1 and j0 <= j < j1 for i0, i1, j0, j1, label in ORBIT_WINDOWS)
    for i in range(HEAD_ROWS):
        for j in range(N):
            if not eye_cell(i, j):
                k = (j + 1) % N
                quad((head_rows[i][j], head_rows[i + 1][j], head_rows[i + 1][k], head_rows[i][k]))

    last = head_rows[-1]
    POST_ROWS = 178
    for i in range(1, POST_ROWS + 1):
        y = NECK_Y + (3.72 - NECK_Y) * i / POST_ROWS
        row = [vertex(surface(y, 2 * pi * j / N)) for j in range(N)]
        for j in range(N):
            k = (j + 1) % N
            quad((last[j], row[j], row[k], last[k]))
        last = row
    tail_end = vertex((0, 3.745, .855))
    for j in range(N):
        quad((last[j], tail_end, last[(j + 1) % N]))

    def oral_surface(t, a):
        # Duplicates head_surface's own computation (not a call to head_surface itself): the
        # lofted cage row and the lofted mouth rim here must be exactly the ones head_surface
        # lofted, so the mouth-rim seam the two share stays closed.
        q = head_base(t, a)
        if .08 < t < .99:
            tangent = head_base(min(1, t + .0001), a) - head_base(max(0, t - .0001), a)
            around = head_base(t, a + .0001) - head_base(t, a - .0001)
            normal = tangent.cross(around).normalized()
            distance = head_seams.find(q)[2]
            q -= normal * (.0065 * exp(-(distance / .029) ** 2))
        ss, cc = sin(a), cos(a)
        inner = q - Vector((cc * (.015 + .16 * t), 0, ss * (.015 + .12 * t)))
        inner.y += .018
        m = mouth_rim(a)
        palate = Vector(((.91 + .31 * sin(pi * t) - .11 * t) * cc,
                         m.y * (1 - t) + NECK_Y * t + .018,
                         -.080 + .064 * ss - .020 * max(0, ss) ** 3
                         + .42 * sin(pi * t / 2) * ss - .070 * t))
        if nose_edit:
            # The rim and the palate are built in the unlofted frame and lofted as the cage rows
            # they belong to -- the palate's own axis carries it, so the roof of the mouth travels
            # and narrows with the snout above it and never comes through the skin. At t=1 it is
            # at the neck, where the loft is identity, so the throat behind is untouched.
            m, palate = nose_loft(m), nose_loft(palate)
        inner = inner.lerp(palate, smooth(ss / .45))
        out = m.lerp(inner, smooth(t / .065)) if t < .065 else inner
        return out

    last = head_rows[0]
    ORAL_ROWS = 112
    for i in range(1, ORAL_ROWS + 1):
        t = i / ORAL_ROWS
        row = []
        for j in range(N):
            a = 2 * pi * j / N
            row.append(vertex(oral_surface(t, a), *head_weights(t, a)))
        for j in range(N):
            k = (j + 1) % N
            quad((last[j], last[k], row[k], row[j]), 1 if t < .075 else 2)
        last = row

    for i in range(1, 43):
        t = i / 42
        row = []
        for j in range(N):
            a = 2 * pi * j / N
            target = Vector(((.94 - .48 * t) * cos(a), NECK_Y + .018 + 1.10 * t,
                             -.18 - .16 * smooth(t) + (.47 - .22 * t) * sin(a)))
            start = oral_surface(1, a)
            q = start.lerp(target, smooth(t / .24)) if t < .24 else target
            row.append(vertex(q))
        for j in range(N):
            k = (j + 1) % N
            quad((last[j], last[k], row[k], row[j]), 2)
        last = row
    for i in range(1, 25):
        t = i / 24
        row = []
        for j in range(N):
            a = 2 * pi * j / N
            q = Vector((.46 * (1 - .92 * t) * cos(a), .038 + .18 * sin(pi * t / 2),
                       -.34 - .23 * (1 - cos(pi * t / 2)) + .25 * (1 - .90 * t) * sin(a)))
            row.append(vertex(q))
        for j in range(N):
            k = (j + 1) % N
            quad((last[j], last[k], row[k], row[j]), 2)
        last = row
    end = vertex((0, .218, -.57))
    for j in range(N):
        quad((last[j], last[(j + 1) % N], end), 2)

    eyes = []
    for i0, i1, j0, j1, label in ORBIT_WINDOWS:
        tc = (i0 + i1) / (2 * HEAD_ROWS)
        ac = (j0 + j1) * pi / N
        center = head_surface(tc, ac)
        along = (head_surface(tc + .0001, ac) - head_surface(tc - .0001, ac)).normalized()
        around = head_surface(tc, ac + .0001) - head_surface(tc, ac - .0001)
        around = (around - along * around.dot(along)).normalized()
        normal = along.cross(around).normalized()
        perimeter = ([(i0, j) for j in range(j0, j1)] + [(i, j1) for i in range(i0, i1)]
                     + [(i1, j) for j in range(j1, j0, -1)] + [(i, j0) for i in range(i1, i0, -1)])
        outer = [head_rows[i][j] for i, j in perimeter]
        angles = [math.atan2((j - (j0 + j1) / 2) / ((j1 - j0) / 2),
                             (i - (i0 + i1) / 2) / ((i1 - i0) / 2)) for i, j in perimeter]
        ring = outer
        for layer in range(1, 5):
            amount = layer / 4
            row = []
            for idx, angle in zip(outer, angles):
                aperture = center + along * (.070 * cos(angle)) + around * (.051 * sin(angle)) - normal * .004
                q = Vector(verts[idx]).lerp(aperture, smooth(amount))
                row.append(vertex(q, *head_weights(tc, ac)))
            for j in range(len(ring)):
                k = (j + 1) % len(ring)
                quad((ring[j], ring[k], row[k], row[j]))
            ring = row
        for layer in range(1, 5):
            t = layer / 4
            row = []
            for angle in angles:
                q = center + along * (.070 * (1 - .70 * t) * cos(angle)) + around * (.051 * (1 - .70 * t) * sin(angle)) - normal * (.004 + .118 * t)
                row.append(vertex(q, *head_weights(tc, ac)))
            for j in range(len(ring)):
                k = (j + 1) % len(ring)
                quad((ring[j], ring[k], row[k], row[j]))
            ring = row
        socket_end = vertex(center - normal * .127, *head_weights(tc, ac))
        for j in range(len(ring)):
            quad((ring[j], ring[(j + 1) % len(ring)], socket_end))
        eye_center = center - normal * .029
        radius = .075
        eyes.append({'side': label, 'center': list(eye_center), 'radius': radius,
                     'surface': list(center), 'normal': list(normal), 'cage_t': tc, 'cage_angle': ac,
                     'aperture_axes': [.140, .102]})

    used = sorted({index for face in faces for index in face})
    remap = {old: new for new, old in enumerate(used)}
    verts = [verts[i] for i in used]
    gape_weights = [gape_weights[i] for i in used]
    roof_weights = [roof_weights[i] for i in used]
    floor_weights = [floor_weights[i] for i in used]
    faces = [tuple(remap[i] for i in f) for f in faces]
    body = mesh_object('Titanichthys_new_continuous_sculpt', verts, faces, [CLAY, LIP, ORAL], materials)
    body.shape_key_add(name='Basis')
    gape = body.shape_key_add(name='Gape study 24 degrees')
    hinge = Vector((0, -1.90, -.080))
    neck = Vector((0, -1.40, .72))

    def rotate_x(p, pivot, angle):
        q = Vector(p) - pivot
        return pivot + Vector((q.x, cos(angle) * q.y - sin(angle) * q.z, sin(angle) * q.y + cos(angle) * q.z))
    for i, v in enumerate(body.data.vertices):
        q = rotate_x(v.co, hinge, math.radians(24) * gape_weights[i])
        q.z -= .055 * floor_weights[i]
        gape.data[i].co = rotate_x(q, neck, math.radians(-2) * roof_weights[i])
    gape.value = 0

    eye_objects = []
    for info in eyes:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=info['radius'], location=info['center'])
        eye = bpy.context.object
        eye.name = 'Recessed socket eye ' + info['side']
        eye.data.materials.append(EYE)
        for poly in eye.data.polygons:
            poly.use_smooth = True
        eye_objects.append(eye)

    def cubic(points, t):
        a, b, c, d = map(Vector, points)
        return a * (1 - t) ** 3 + b * (3 * t * (1 - t) ** 2) + c * (3 * (1 - t) * t * t) + d * t ** 3

    def paired_fin(name, sign, leading, trailing, root_thickness, rays):
        fv, ff, spans = [], [], []

        def spine(s):
            q = (cubic(leading, s) + cubic(trailing, s)) * .5
            q.z -= .22 * s
            q.x -= 1.7 * root_thickness * (1 - s) ** 3
            return q
        layers = []
        spans_count, chords = 84, 36
        for side in (-1, 1):
            layer = []
            for i in range(spans_count):
                s = i / spans_count
                center = spine(s)
                tangent = (spine(min(1, s + .0001)) - spine(max(0, s - .0001))).normalized()
                chord_dir = Vector((-tangent.y, tangent.x, 0)).normalized()
                if chord_dir.dot(cubic(trailing, s) - cubic(leading, s)) < 0:
                    chord_dir = -chord_dir
                normal = tangent.cross(chord_dir).normalized()
                if normal.z < 0:
                    normal = -normal
                twist = math.radians(11) * smooth(s)
                chord_dir = chord_dir * cos(twist) + normal * sin(twist)
                normal = tangent.cross(chord_dir).normalized()
                if normal.z < 0:
                    normal = -normal
                chord = (cubic(trailing, s) - cubic(leading, s)).length * (1 + .12 * sin(pi * s))
                row = []
                for j in range(chords + 1):
                    c = j / chords
                    p = center + chord_dir * ((c - .5) * chord)
                    camber = .027 * chord * sin(pi * c) * (1 - .60 * s)
                    half = (.0015 + root_thickness * (1 - s) ** 3.0) * (.10 + .90 * sin(pi * c) ** .70)
                    p += normal * (camber + side * half)
                    p.x *= sign
                    row.append(len(fv))
                    fv.append(tuple(p))
                    spans.append(s)
                layer.append(row)
            layers.append(layer)
        for side, layer in enumerate(layers):
            for i in range(spans_count - 1):
                for j in range(chords):
                    f = (layer[i][j], layer[i + 1][j], layer[i + 1][j + 1], layer[i][j + 1])
                    ff.append(f if side else tuple(reversed(f)))
        lo, hi = layers
        for i in range(spans_count - 1):
            for j in (0, chords):
                ff.append((lo[i][j], hi[i][j], hi[i + 1][j], lo[i + 1][j]))
        for j in range(chords):
            ff.append((lo[0][j], lo[0][j + 1], hi[0][j + 1], hi[0][j]))
        tip = spine(1)
        tip.x *= sign
        tip_i = len(fv)
        fv.append(tuple(tip))
        spans.append(1.0)
        for j in range(chords):
            ff.append((lo[-1][j], lo[-1][j + 1], tip_i))
            ff.append((hi[-1][j + 1], hi[-1][j], tip_i))
        for j in (0, chords):
            ff.append((lo[-1][j], tip_i, hi[-1][j]))
        ob = mesh_object(name, fv, ff, [FIN])
        attr = ob.data.color_attributes.new(name='TitanFin', type='FLOAT_COLOR', domain='POINT')
        for i, s in enumerate(spans):
            attr.data[i].color = (s, 0., 0., 1.)
        return ob

    fin_objects = {}
    for sign, label in ((1, 'L'), (-1, 'R')):
        fin_objects['Long pectoral ' + label] = paired_fin(
            'Long pectoral ' + label, sign,
            [(1.005, -1.13, -.45), (1.90, -.90, -.42), (3.04, .75, -.62), (3.38, 1.70, -.45)],
            [(1.00, -.02, -.54), (1.65, .65, -.69), (2.69, 1.68, -.67), (3.38, 1.70, -.45)], .070, 0)
        fin_objects['Pelvic ' + label] = paired_fin(
            'Pelvic ' + label, sign,
            [(.38, 1.20, -.34), (.74, 1.33, -.41), (1.01, 1.77, -.53), (1.08, 2.17, -.47)],
            [(.34, 1.78, -.35), (.55, 2.04, -.51), (.90, 2.23, -.57), (1.08, 2.17, -.47)], .033, 0)

    def median_fin(name, center, outline, thickness, rays):
        center = Vector(center)
        boundary = catmull(outline + [outline[0]], 12)[:-1]
        fv, ff = [], []
        layers = []
        nr = 36
        nc = len(boundary)
        for side in (-1, 1):
            center_index = len(fv)
            cp = center.copy()
            cp.x += side * thickness
            fv.append(tuple(cp))
            rows = []
            for i in range(1, nr + 1):
                t = i / nr
                row = []
                for j, edge in enumerate(boundary):
                    p = center.lerp(edge, t)
                    p.x += side * (.0015 + thickness * (1 - t * t))
                    row.append(len(fv))
                    fv.append(tuple(p))
                rows.append(row)
            for j in range(nc):
                ff.append((center_index, rows[0][j], rows[0][(j + 1) % nc]))
            for i in range(nr - 1):
                for j in range(nc):
                    j1 = (j + 1) % nc
                    ff.append((rows[i][j], rows[i + 1][j], rows[i + 1][j1], rows[i][j1]))
            layers.append(rows)
        for j in range(nc):
            j1 = (j + 1) % nc
            ff.append((layers[0][-1][j], layers[1][-1][j], layers[1][-1][j1], layers[0][-1][j1]))
        return mesh_object(name, fv, ff, [FIN])

    fin_objects['Modest swept dorsal'] = median_fin('Modest swept dorsal', (0, .88, .80),
        [(0, .12, .83), (0, .45, 1.20), (0, .76, 1.57), (0, .89, 1.62),
         (0, 1.10, 1.43), (0, 1.40, .88), (0, 1.72, .45), (0, 1.02, .50)], .038, 17)
    fin_objects['Strong heterocercal caudal'] = median_fin('Strong heterocercal caudal', (0, 3.02, .08),
        [(0, 2.58, .19), (0, 3.07, .53), (0, 3.80, 1.08), (0, 4.40, 1.25),
         (0, 4.44, 1.20), (0, 4.14, .89), (0, 3.66, .26), (0, 3.71, .05),
         (0, 4.00, -.65), (0, 4.01, -.87), (0, 3.84, -.87), (0, 3.35, -.55),
         (0, 2.78, -.12)], .042, 29)

    eye_L = next(o for o in eye_objects if o.name.endswith('L'))
    eye_R = next(o for o in eye_objects if o.name.endswith('R'))
    meshes = [body, eye_L, eye_R] + [fin_objects[k] for k in (
        'Long pectoral L', 'Long pectoral R', 'Pelvic L', 'Pelvic R',
        'Modest swept dorsal', 'Strong heterocercal caudal')]
    assert len(meshes) == 9, meshes
    # head_rows carries each cage row's vertex indices into the finished body mesh, so a
    # diagnostic (solve_nose.py) can say which profile row a measured extreme came off.
    return {'body': body, 'eye_L': eye_L, 'eye_R': eye_R, 'fins': fin_objects, 'meshes': meshes,
            'eyes': eyes, 'head_rows': [[remap.get(i) for i in row] for row in head_rows],
            'head_shape': (HEAD_ROWS, N)}
