"""New Doryaspis volume design. Pure Python; world X lateral, Y up, +Z forward.

Anatomical station contours are authored specifically for this animal. No old
builder is imported. Sizes are sculpt units, not measured fossil dimensions.
"""
from math import sin, cos, pi, sqrt, exp


def pchip(points, steps=6):
    """Shape-preserving cubic interpolation; the first column is the parameter."""
    x = [p[0] for p in points]
    assert all(b > a for a, b in zip(x, x[1:]))
    h = [b-a for a, b in zip(x, x[1:])]
    slopes = []
    for col in range(1, len(points[0])):
        vals = [p[col] for p in points]
        d = [(b-a)/hh for a, b, hh in zip(vals, vals[1:], h)]
        m = [d[0]]
        for i in range(1, len(x)-1):
            if d[i-1]*d[i] <= 0:
                m.append(0.)
            else:
                w1, w2 = 2*h[i]+h[i-1], h[i]+2*h[i-1]
                m.append((w1+w2)/(w1/d[i-1]+w2/d[i]))
        m.append(d[-1]); slopes.append(m)
    out = []
    for i in range(len(x)-1):
        for j in range(steps):
            t = j/steps; t2, t3 = t*t, t*t*t
            row = [x[i]+h[i]*t]
            for col, m in enumerate(slopes, 1):
                row.append((2*t3-3*t2+1)*points[i][col]
                           +(t3-2*t2+t)*h[i]*m[i]
                           +(-2*t3+3*t2)*points[i+1][col]
                           +(t3-t2)*h[i]*m[i+1])
            out.append(tuple(row))
    return out+[tuple(points[-1])]


def capped_rows(rows, n):
    vertices = [tuple(p) for row in rows for p in row]
    faces = [(j*n+k, j*n+(k+1)%n, (j+1)*n+(k+1)%n, (j+1)*n+k)
             for j in range(len(rows)-1) for k in range(n)]
    for j in (0, len(rows)-1):
        center = tuple(sum(p[d] for p in rows[j])/n for d in range(3))
        vi = len(vertices); vertices.append(center)
        faces.extend((vi, j*n+(k+1)%n, j*n+k) if j == 0
                     else (vi, j*n+k, j*n+(k+1)%n) for k in range(n))
    return vertices, faces


# Rear to front: z, lateral center, half-width, upper Y, lower Y.
# Anterior is a shield with a shallow convex roof, emphatic perimeter shoulder,
# deeper bowl and a distinct front face. Posterior narrows without a collar.
BODY = [
    (-3.20,-.165,.005,-.232,-.246),
    (-3.10,-.177,.015,-.181,-.222),
    (-2.94,-.175,.026,-.099,-.177),
    (-2.72,-.139,.037,-.028,-.109),
    (-2.45,-.049,.055,.031,-.077),
    (-2.17,.064,.081,.071,-.071),
    (-1.87,.107,.116,.094,-.101),
    (-1.58,.074,.172,.105,-.159),
    (-1.29,.026,.237,.120,-.220),
    (-1.03,.000,.318,.148,-.267),
    (-.84,.000,.425,.198,-.291),
    (-.62,.000,.552,.241,-.335),
    (-.34,.000,.636,.272,-.365),
    (-.04,.000,.648,.279,-.356),
    (.23,.000,.595,.257,-.306),
    (.46,.000,.484,.221,-.244),
    (.66,.000,.354,.170,-.163),
    (.81,.000,.232,.137,-.100),
    (.90,.000,.140,.110,-.059),
    (.95,.000,.064,.090,-.032),
    (.974,.000,.007,.057,.035),
]

# Soft sculpted boundaries of central dorsal/branchial/orbital fields. These
# are restrained sculpt interpretation guided by the primary plate regions,
# not a turtle hexagon pattern and not separately stacked armour objects.
PLATE_PATHS = [
    [(0,.65),(.17,.56),(.36,.32),(.46,-.04),(.45,-.37),(.32,-.67),(0,-.79)],
    [(0,.65),(-.17,.56),(-.36,.32),(-.46,-.04),(-.45,-.37),(-.32,-.67),(0,-.79)],
    [(.17,.56),(.30,.53),(.39,.42)],
    [(-.17,.56),(-.30,.53),(-.39,.42)],
    [(.45,-.37),(.53,-.49),(.54,-.68)],
    [(-.45,-.37),(-.53,-.49),(-.54,-.68)],
]


def segment_distance(x, z, a, b):
    dx, dz = b[0]-a[0], b[1]-a[1]
    t = max(0., min(1., ((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)))
    return sqrt((x-a[0]-t*dx)**2+(z-a[1]-t*dz)**2)


def body_geometry():
    rows, n = [], 112
    for z, cx, width, upper, lower in pchip(BODY, 7):
        ring = []
        # Perimeter seam is carried in the body volume, with a broad smooth
        # shoulder; it is not a raised wire or plate glued around a capsule.
        shield = max(0., min(1., (z+1.03)/.22))
        shoulder = -.045 if z < .5 else -.045+max(0., z-.5)*.16
        mid = (upper+lower)/2*(1-shield)+shoulder*shield
        mid = max(lower+.20*(upper-lower),min(upper-.20*(upper-lower),mid))
        for k in range(n):
            a = 2*pi*k/n; co, si = cos(a), sin(a)
            x = cx+width*co
            if si >= 0:
                y = mid+(upper-mid)*si**(.92-.12*shield)
                if shield and si > .23:
                    dist = min(segment_distance(x,z,a,b) for path in PLATE_PATHS
                               for a,b in zip(path,path[1:]))
                    y -= .0060*exp(-(dist/.014)**2)*shield*min(1.,si*2)
                    # Large paired shoulder fullness, not noisy microtexture.
                    y += .0065*exp(-((abs(x)-.35)/.18)**2-((z+.12)/.42)**2)*si
            else:
                y = mid-(mid-lower)*(-si)**.91
            ring.append((x,y,z))
        rows.append(ring)
    return capped_rows(rows,n)


# x, anterior Z, posterior Z, middle Y, half-thickness. Long curved plates
# start within the shield; they flatten toward the swept forward hooked tip.
CORNua = [
    (.44,-.25,-.88,-.070,.130),
    (.57,-.31,-.91,-.080,.098),
    (.74,-.34,-.88,-.095,.069),
    (.94,-.30,-.82,-.119,.045),
    (1.16,-.20,-.70,-.151,.030),
    (1.36,-.04,-.51,-.177,.020),
    (1.52,.12,-.30,-.190,.013),
    (1.63,.235,-.04,-.187,.008),
    (1.675,.272,.213,-.179,.003),
    (1.681,.269,.262,-.177,.0015),
]


def cornual_geometry(side):
    rows, n = [], 56
    for x, front, back, y, thick in pchip(CORNua, 6):
        rows.append([(side*x, y+thick*sin(2*pi*k/n),
                      (front+back)/2+(front-back)/2*cos(2*pi*k/n)) for k in range(n)])
    return capped_rows(rows,n)


# Fixed sawtooth ventral plate. Denticles are part of the outline itself.
def pseudorostrum_geometry():
    controls = [(.82,.119,.018,.029),(.91,.097,.014,.026),
                (1.03,.070,.007,.018),(1.22,.046,-.003,.012),
                (1.43,.027,-.013,.009),(1.63,.009,-.022,.004),
                (1.67,.002,-.024,.002)]
    dense=pchip(controls,40); rows=[]; n=40
    for z,w,y,h in dense:
        q=(z-1.00)/.033
        triangular=max(0.,1-abs((q%1)-.47)/.31)
        envelope=max(0.,min(1.,(z-.98)/.07,(1.65-z)/.10))
        tooth=.0135*triangular**1.35*envelope
        ring=[]
        for k in range(n):
            a=2*pi*k/n
            ring.append(((w+tooth*abs(cos(a))**10)*cos(a),y+h*sin(a),z))
        rows.append(ring)
    return capped_rows(rows,n)


# Membrane vertical rows: Y, anterior Z, trailing Z, half-thickness, center X.
# Scaled body axis physically enters the lower lobe; the upper tip and lower
# tip reach farther back than the middle trailing margin. No forked shark tail.
FIN = [
    (-.273,-3.18,-3.215,.002,-.166),
    (-.240,-3.115,-3.246,.005,-.172),
    (-.178,-2.953,-3.229,.013,-.175),
    (-.086,-2.719,-3.121,.022,-.149),
    (.019,-2.650,-3.034,.024,-.120),
    (.127,-2.721,-3.074,.020,-.129),
    (.231,-2.842,-3.164,.013,-.147),
    (.308,-2.989,-3.203,.006,-.158),
    (.333,-3.143,-3.199,.002,-.165),
    (.335,-3.179,-3.190,.001,-.165),
]


def fin_geometry():
    rows=[]; n=56
    for y,front,back,thick,cx in pchip(FIN,6):
        rows.append([(cx+thick*sin(2*pi*k/n), y,
                      (front+back)/2+(front-back)/2*cos(2*pi*k/n)) for k in range(n)])
    return capped_rows(rows,n)


def cavity_geometry():
    # t measured inward; outward points up and forward. Above ventral
    # pseudorostrum, below roof. Aperture cannot turn into a biting jaw.
    origin=(0.,.082,.917); outward=(0.,.42,.9075241044)
    rise=(0.,outward[2],-outward[1])
    sections=[(-.16,.108,.030),(-.06,.106,.032),
              (.018,.101,.036),(.075,.094,.045),
              (.15,.073,.049),(.225,.043,.033),(.269,.006,.007)]
    rows=[]; n=64
    for t,w,h in pchip(sections,6):
        rows.append([(w*cos(2*pi*k/n),
                      origin[1]-outward[1]*t+rise[1]*h*sin(2*pi*k/n),
                      origin[2]-outward[2]*t+rise[2]*h*sin(2*pi*k/n)) for k in range(n)])
    return capped_rows(rows,n)


def all_base_geometry():
    return {'body':body_geometry(), 'cornual_left':cornual_geometry(1),
            'cornual_right':cornual_geometry(-1),
            'pseudorostrum':pseudorostrum_geometry(), 'caudal_membrane':fin_geometry(),
            'oral_cutter':cavity_geometry()}
