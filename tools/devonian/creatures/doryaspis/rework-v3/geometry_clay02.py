"""Doryaspis V3 clay02 volume design. Pure Python; world X lateral, Y up, +Z forward.

Clay02 answers the user's direction directly. The front of the armoured body is
a **snout**; the pseudorostrum (the saw) projects forward from its **lower**
edge like a lower jaw; the **mouth is a terminal, forward-facing opening on the
front face directly above the saw's root**. It is not a hole on top, not an
upward recess, and not below the saw.

Substantive differences from clay01:

  1. The shield does not taper to a point in front. It runs forward as a short
     near-cylindrical muzzle and ends in a blunt rounded **front face** wide
     enough to carry an aperture with a rim all round it.
  2. The **mouth is terminal**. A transverse ellipse is bored straight back
     along -Z through that front face, so the aperture faces forward, never up,
     and never breaks the dorsal roof.  Behind it is a real recessed chamber,
     slightly wider inside than at the lip, closing on a terminal wall.  The
     cutter flares as it leaves the face, so the boolean leaves a smooth rolled
     rim rather than a knife edge or a jagged hole.
  3. The **pseudorostrum grows out of the lower front**. Its root is broad and
     buried in the ventral snout at z~0.55, and because the ventral line of the
     snout rises going forward while the saw's axis stays low, the saw emerges
     from underneath around z~0.85 and keeps going: a protruding lower jaw that
     narrows into the blade, not a spike glued to a nose.
  4. The **shield is a low dome over a deep ventral bowl** with a hard
     peripheral rim.  The rim line sits high (62% of the section height), the
     dorsal exponent is sub-linear so the roof reads flat-topped, and both
     relax to round through the tail behind and the muzzle in front.
  5. The **cornual plates leave wide thick roots** deep inside the shield and
     stay oval in section most of their length, so they read as horns rather
     than the glued sheets of clay01; forward-hooked, downturned tips, full
     length preserved.
  6. The **caudal region is hypocercal** with a substantial root: the body axis
     descends into a small ventral lobe under a larger dorsal web, and the axis
     wanders laterally so the posterior reads sinuous rather than straight.

Sizes are sculpt units in the same family as the shipped V2 authoring space
(V2: X lateral, -Y forward, Z up in Blender; this module's +Z forward maps onto
that by (x, y, z)_clay -> (x, -z, y)_blender, which is exactly the inverse of the
glTF +Y-up conversion, so exported glTF coordinates equal clay coordinates).
"""
from math import sin, cos, pi, sqrt, exp


# --------------------------------------------------------------------------
# pure interpolation helpers (same shape-preserving scheme as clay01)
# --------------------------------------------------------------------------
def pchip(points, steps=6):
    """Shape-preserving cubic interpolation; the first column is the parameter."""
    x = [p[0] for p in points]
    assert all(b > a for a, b in zip(x, x[1:])), 'stations must ascend'
    h = [b - a for a, b in zip(x, x[1:])]
    slopes = []
    for col in range(1, len(points[0])):
        vals = [p[col] for p in points]
        d = [(b - a) / hh for a, b, hh in zip(vals, vals[1:], h)]
        m = [d[0]]
        for i in range(1, len(x) - 1):
            if d[i - 1] * d[i] <= 0:
                m.append(0.)
            else:
                w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
                m.append((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]))
        m.append(d[-1])
        slopes.append(m)
    out = []
    for i in range(len(x) - 1):
        for j in range(steps):
            t = j / steps
            t2, t3 = t * t, t * t * t
            row = [x[i] + h[i] * t]
            for col, m in enumerate(slopes, 1):
                row.append((2 * t3 - 3 * t2 + 1) * points[i][col]
                           + (t3 - 2 * t2 + t) * h[i] * m[i]
                           + (-2 * t3 + 3 * t2) * points[i + 1][col]
                           + (t3 - t2) * h[i] * m[i + 1])
            out.append(tuple(row))
    return out + [tuple(points[-1])]


def capped_rows(rows, n):
    """Loft closed rings into a closed solid with fan caps at both ends."""
    vertices = [tuple(p) for row in rows for p in row]
    faces = [(j * n + k, j * n + (k + 1) % n, (j + 1) * n + (k + 1) % n, (j + 1) * n + k)
             for j in range(len(rows) - 1) for k in range(n)]
    for j in (0, len(rows) - 1):
        center = tuple(sum(p[d] for p in rows[j]) / n for d in range(3))
        vi = len(vertices)
        vertices.append(center)
        faces.extend((vi, j * n + (k + 1) % n, j * n + k) if j == 0
                     else (vi, j * n + k, j * n + (k + 1) % n) for k in range(n))
    return vertices, faces


def smoothstep(t):
    t = max(0., min(1., t))
    return t * t * (3 - 2 * t)


# --------------------------------------------------------------------------
# main body: hypocercal tail -> shield -> snout -> blunt front face
# station: z, lateral centre, half-width, upper Y, lower Y
# --------------------------------------------------------------------------
BODY = [
    (-3.250, -.150, .002, -.252, -.268),
    (-3.190, -.150, .009, -.212, -.256),
    (-3.090, -.142, .020, -.144, -.208),
    (-2.950, -.120, .034, -.074, -.152),
    (-2.780, -.082, .050, -.014, -.118),
    (-2.580, -.028, .068, .030, -.114),
    (-2.360, .028, .088, .070, -.132),
    (-2.120, .066, .110, .108, -.160),
    (-1.860, .076, .140, .142, -.192),
    (-1.640, .048, .175, .168, -.220),
    (-1.460, .020, .215, .186, -.242),
    (-1.340, .006, .260, .198, -.258),
    (-1.180, .000, .372, .224, -.288),
    (-1.060, .000, .482, .250, -.316),
    (-.960, .000, .578, .274, -.340),
    (-.860, .000, .658, .296, -.360),
    (-.740, .000, .720, .316, -.374),
    (-.500, .000, .778, .342, -.382),
    (-.250, .000, .798, .356, -.384),
    (.000, .000, .800, .360, -.382),
    (.250, .000, .790, .356, -.374),
    (.480, .000, .760, .344, -.358),
    (.680, .000, .700, .330, -.336),
    (.850, .000, .630, .312, -.310),
    (1.000, .000, .540, .292, -.284),
    (1.110, .000, .450, .272, -.262),
    (1.190, .000, .385, .254, -.244),
    (1.250, .000, .340, .240, -.230),
    (1.310, .000, .300, .228, -.218),
    (1.370, .000, .272, .220, -.210),
    (1.420, .000, .254, .214, -.205),
    (1.455, .000, .240, .208, -.200),
    (1.480, .000, .216, .190, -.184),
    (1.500, .000, .176, .158, -.152),
    (1.515, .000, .120, .108, -.104),
    (1.525, .000, .060, .054, -.052),
    (1.530, .000, .008, .008, -.010),
]

SHIELD_BACK, SHIELD_FADE = -1.15, .28      # shield character fades in going forward
SNOUT_ROUND_Z, SNOUT_ROUND = .80, .48      # ... and relaxes to round through the snout

# Sparse shallow plate-field sutures on the dorsal roof, right side only; the
# left side is mirrored.  Reference character: a broad marginal band, a pair of
# longitudinal sutures bounding a central field, and short transverse sutures.
# Not a turtle hexagon lattice and not separate armour objects.
SUTURES_RIGHT = [
    [(.18, 1.30), (.30, 1.16), (.42, .98), (.53, .76), (.610, .50), (.662, .22),
     (.678, -.08), (.656, -.40), (.598, -.72), (.500, -1.00), (.370, -1.20), (.230, -1.32)],
    [(.045, 1.28), (.135, 1.02), (.225, .68), (.288, .28), (.302, -.10),
     (.276, -.50), (.200, -.86), (.092, -1.14), (.018, -1.28)],
    [(.175, .92), (.300, .98), (.415, 1.04)],
    [(.265, .44), (.415, .50), (.575, .565)],
    [(.286, -.48), (.430, -.55), (.575, -.64)],
    [(.150, -1.10), (.260, -1.06), (.372, -1.16)],
]
SUTURES = [p for p in SUTURES_RIGHT] + [[(-x, z) for x, z in p] for p in SUTURES_RIGHT]
SUTURE_DEPTH, SUTURE_SIGMA = .0290, .0235


def segment_distance(x, z, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    t = max(0., min(1., ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)))
    return sqrt((x - a[0] - t * dx) ** 2 + (z - a[1] - t * dz) ** 2)


def suture_distance(x, z):
    return min(segment_distance(x, z, a, b)
               for path in SUTURES for a, b in zip(path, path[1:]))


def body_geometry():
    rows, n = [], 128
    for z, cx, width, upper, lower in pchip(BODY, 7):
        # `flat` is how much this station behaves as armoured shield rather
        # than as a round tail behind or a round muzzle in front.
        flat = smoothstep((z - SHIELD_BACK) / SHIELD_FADE)
        flat *= 1 - smoothstep((z - SNOUT_ROUND_Z) / SNOUT_ROUND)
        # Rim height: upper-biased across the shield, so the dome above the rim
        # is shallow and the ventral bowl below it is deep.
        mid = (upper + lower) / 2 * (1 - flat) + (lower + .62 * (upper - lower)) * flat
        up_exp = .95 - .27 * flat      # sub-linear -> flat-topped roof, sharp rim
        lo_exp = .92 - .10 * flat      # full ventral bowl
        dorsal_field = flat * smoothstep((z + 1.18) / .18)
        ring = []
        for k in range(n):
            a = 2 * pi * k / n
            co, si = cos(a), sin(a)
            x = cx + width * co
            if si >= 0:
                y = mid + (upper - mid) * si ** up_exp
                if dorsal_field > 0 and si > .20:
                    d = suture_distance(x, z)
                    y -= (SUTURE_DEPTH * exp(-(d / SUTURE_SIGMA) ** 2)
                          * dorsal_field * min(1., (si - .20) * 4))
                    # One broad paired dorsal fullness either side of the keel;
                    # large sculpted form, not microtexture.
                    y += .0190 * exp(-((abs(x) - .40) / .27) ** 2
                                     - ((z + .05) / .60) ** 2) * si * dorsal_field
            else:
                y = mid - (mid - lower) * (-si) ** lo_exp
            ring.append((x, y, z))
        rows.append(ring)
    return capped_rows(rows, n)


# --------------------------------------------------------------------------
# cornual plates: wide thick roots inside the shield, swept out and forward,
# staying oval in section, thinning to gently downturned hooked tips.
# Parameterised by |x|:  x, leading Z, trailing Z, centre Y, vertical half-thickness
# --------------------------------------------------------------------------
CORNUA = [
    (.30, .34, -.90, -.056, .215),
    (.58, .30, -.80, -.072, .200),
    (.82, .20, -.60, -.100, .172),
    (1.02, .11, -.44, -.132, .140),
    (1.20, .06, -.31, -.164, .112),
    (1.36, .05, -.20, -.196, .086),
    (1.50, .08, -.11, -.228, .064),
    (1.62, .13, -.03, -.258, .044),
    (1.72, .19, .05, -.286, .026),
    (1.78, .25, .13, -.306, .011),
    (1.81, .28, .20, -.316, .002),
]


def cornual_geometry(side):
    rows, n = [], 64
    for x, front, back, y, thick in pchip(CORNUA, 7):
        rows.append([(side * x,
                      y + thick * sin(2 * pi * k / n),
                      (front + back) / 2 + (front - back) / 2 * cos(2 * pi * k / n))
                     for k in range(n)])
    return capped_rows(rows, n)


# --------------------------------------------------------------------------
# pseudorostrum: a broad root buried in the ventral snout, emerging from
# underneath around z~0.85 and tapering forward into the denticled blade.
# z, half-width, centre Y, vertical half-thickness
# --------------------------------------------------------------------------
ROSTRUM = [
    (.62, .290, -.160, .108),
    (.85, .276, -.168, .102),
    (1.00, .262, -.175, .098),
    (1.12, .248, -.180, .094),
    (1.25, .232, -.184, .090),
    (1.42, .208, -.190, .085),
    (1.60, .182, -.198, .076),
    (1.82, .152, -.208, .064),
    (2.04, .124, -.218, .053),
    (2.26, .096, -.228, .042),
    (2.44, .072, -.236, .031),
    (2.60, .050, -.243, .021),
    (2.72, .028, -.249, .011),
    (2.82, .010, -.254, .004),
    (2.87, .002, -.257, .001),
]
DENTICLE_FROM, DENTICLE_TO, DENTICLE_PERIOD, DENTICLE_AMP = 1.72, 2.74, .086, .0135


def pseudorostrum_geometry():
    rows, n = [], 56
    for z, w, y, h in pchip(ROSTRUM, 26):
        envelope = max(0., min(1., (z - DENTICLE_FROM) / .18, (DENTICLE_TO - z) / .20))
        q = (z - DENTICLE_FROM) / DENTICLE_PERIOD
        tooth = DENTICLE_AMP * max(0., 1 - abs((q % 1) - .5) / .34) ** 1.3 * envelope
        rows.append([((w + tooth * abs(cos(2 * pi * k / n)) ** 12) * cos(2 * pi * k / n),
                      y + h * sin(2 * pi * k / n), z) for k in range(n)])
    return capped_rows(rows, n)


# --------------------------------------------------------------------------
# caudal membrane: hypocercal.  The descending body axis enters a small ventral
# lobe; the larger web stands above it.
# Y, leading Z, trailing Z, half-thickness, lateral centre
# --------------------------------------------------------------------------
MEMBRANE = [
    (-.560, -3.268, -3.310, .0015, -.150),
    (-.525, -3.228, -3.332, .005, -.149),
    (-.435, -3.105, -3.390, .015, -.147),
    (-.315, -2.935, -3.450, .024, -.143),
    (-.180, -2.805, -3.480, .028, -.136),
    (-.020, -2.762, -3.472, .026, -.128),
    (.135, -2.805, -3.422, .020, -.120),
    (.285, -2.895, -3.320, .012, -.112),
    (.400, -2.995, -3.220, .005, -.106),
    (.465, -3.080, -3.126, .0015, -.102),
]


def membrane_geometry():
    rows, n = [], 64
    for y, front, back, thick, cx in pchip(MEMBRANE, 7):
        rows.append([(cx + thick * sin(2 * pi * k / n), y,
                      (front + back) / 2 + (front - back) / 2 * cos(2 * pi * k / n))
                     for k in range(n)])
    return capped_rows(rows, n)


# --------------------------------------------------------------------------
# terminal oral chamber: a transverse ellipse bored straight back along -Z
# through the middle of the front face, slightly wider inside than at the lip,
# closing on a terminal wall.  The axis is horizontal: there is no upward
# component anywhere, the bore never reaches the dorsal roof, and the flare
# that rolls the lip opens upward and sideways only -- its floor stays above
# the pseudorostral root, so the saw is never shaved by the boolean.
# z, half-width, top Y, bottom Y
# --------------------------------------------------------------------------
ORAL = [
    (1.020, .005, .022, .018),
    (1.070, .036, .038, .004),
    (1.135, .070, .056, -.016),
    (1.205, .094, .070, -.032),
    (1.275, .108, .078, -.044),
    (1.345, .112, .081, -.048),
    (1.410, .108, .077, -.044),
    (1.455, .105, .074, -.042),
    (1.482, .122, .086, -.050),
    (1.512, .156, .110, -.060),
    (1.580, .222, .158, -.068),
    (1.670, .305, .215, -.072),
]
ORAL_PLANE = 1.470          # where the bore leaves the front face
ORAL_DEPTH = ORAL_PLANE - ORAL[0][0]


def oral_geometry():
    rows, n = [], 96
    for z, w, top, bot in pchip(ORAL, 7):
        cy, h = (top + bot) / 2, (top - bot) / 2
        rows.append([(w * cos(2 * pi * k / n), cy + h * sin(2 * pi * k / n), z)
                     for k in range(n)])
    return capped_rows(rows, n)


def all_base_geometry():
    return {'body': body_geometry(),
            'cornual_left': cornual_geometry(1),
            'cornual_right': cornual_geometry(-1),
            'pseudorostrum': pseudorostrum_geometry(),
            'caudal_membrane': membrane_geometry(),
            'oral_cutter': oral_geometry()}


# --------------------------------------------------------------------------
# seats used by the build script (declared here so the design stays in one file)
# --------------------------------------------------------------------------
EYE_SEED = (.500, -.060, .950)      # right/left flank orbit seed, mirrored in x
EYE_RADII = (.052, .072, .060)      # along normal, along U (fore-aft), along V
EYE_VISIBLE_TARGET, EYE_VISIBLE_FLOOR = .65, .50
BRANCHIAL_SEED = (.660, -.180, -.620)
BRANCHIAL_RADII = (.070, .022, .052)   # fore-aft, vertical, inward

ANATOMY_SUMMARY = {
    'mouth': 'terminal transverse ellipse on the blunt front face, axis -Z, no upward component',
    'mouthApertureZ': ORAL_PLANE,
    'mouthChamberDepth': round(ORAL_DEPTH, 4),
    'mouthLipHalfWidth': ORAL[7][1],
    'mouthLipTopY': ORAL[7][2],
    'mouthLipBottomY': ORAL[7][3],
    'rostrumTopYAtFace': round(ROSTRUM[5][2] + ROSTRUM[5][3], 4),
    'lipToSawRoot': round(ORAL[7][3] - (ROSTRUM[5][2] + ROSTRUM[5][3]), 4),
    'snoutFrontFaceZ': BODY[-1][0],
    'snoutFaceHalfWidth': BODY[-6][2],
    'dorsalRoofYOverMouth': BODY[-6][3],
    'bodyLength': round(BODY[-1][0] - BODY[0][0], 4),
    'totalLength': round(ROSTRUM[-1][0] - BODY[0][0], 4),
    'sawFreeLength': round(ROSTRUM[-1][0] - ORAL_PLANE, 4),
    'cornualSpan': 2 * CORNUA[-1][0],
}
