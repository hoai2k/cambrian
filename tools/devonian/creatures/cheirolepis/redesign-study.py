"""Cheirolepis reference-led sculpt study: current shape beside a redesigned shape, clay only.

This is a study, not a builder. It exports nothing and publishes nothing: it lofts the same
surfaces `build_v2.py` does, from two sets of profile tables, and renders them side by side so
the silhouette can be judged before any of it is committed to a real rebuild. Materials, scales,
teeth, throat, opercula, rig and clips are all left out on purpose — the question it answers is
the shape.

The redesign reads `docs/reference/Cheirolepis.jpg` against the C. trailli sources the builder
already cites. It takes from the reference what is about form: a wedge snout instead of a rounded
bead, a straighter dorsal head profile over a fuller cheek, the large eye set further forward and
higher, and every fin redrawn as an angular swept blade — convex leading edge, pointed apex
trailing backwards, concave trailing edge — instead of a rounded paddle. It does not take the
reference's near-symmetrical fork: Cheirolepis is strongly epicercal and the sources, not the
picture, settle that, so the tail keeps its raised scaled axis and only gains drawn-out points and
a deeper notch between the lobes.

The eye is placed by measurement rather than by eye. `seating()` samples the globe against the
head cross-sections and reports the fraction inside; the redesign's forward, larger eye scores
above the current model's on the same measure, so moving it forward does not cost the seating the
packaged audit checks for.

Run it with a Blender Python that has numpy:

    blender --background --python tools/devonian/creatures/cheirolepis/redesign-study.py -- OUTDIR

It writes {old,new}-{lateral,dorsal,head}.png into OUTDIR.
"""
import bpy, bmesh, math, os, sys, numpy as np
from math import sin, cos, pi
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]

# ---------------------------------------------------------------- shared lofting

def spline(tbl, y):
    if y <= tbl[0][0]: return np.array(tbl[0][1:])
    for k in range(len(tbl) - 1):
        a = np.array(tbl[k]); b = np.array(tbl[k + 1])
        if a[0] <= y <= b[0]:
            pre = np.array(tbl[max(0, k - 1)]); post = np.array(tbl[min(len(tbl) - 1, k + 2)])
            t = (y - a[0]) / (b[0] - a[0])
            d0 = (b - pre) / (b[0] - pre[0]) * (b[0] - a[0])
            d1 = (post - a) / (post[0] - a[0]) * (b[0] - a[0])
            return ((2*t**3 - 3*t*t + 1) * a + (t**3 - 2*t*t + t) * d0 +
                    (-2*t**3 + 3*t*t) * b + (t**3 - t*t) * d1)[1:]
    return np.array(tbl[-1][1:])

class Build:
    def __init__(self): self.V = []; self.F = []
    def v(self, p): self.V.append(tuple(p)); return len(self.V) - 1
    def f(self, q): self.F.append(tuple(q))
    def grid(self, nr, nc, fn, wrap=False):
        rows = [[fn(i, j) for j in range(nc)] for i in range(nr)]
        for i in range(nr - 1):
            for j in range(nc - 1 + (1 if wrap else 0)):
                k = (j + 1) % nc
                self.f((rows[i][j], rows[i][k], rows[i+1][k], rows[i+1][j]))
        return rows
    def tube(self, pts, radii, sides=8):
        rings = []
        for k, p in enumerate(pts):
            p = Vector(p)
            d = (Vector(pts[min(k+1, len(pts)-1)]) - Vector(pts[max(k-1, 0)]))
            if d.length < 1e-9: d = Vector((0, 1, 0))
            d.normalize()
            u = d.cross(Vector((0, 0, 1)))
            if u.length < 1e-6: u = d.cross(Vector((1, 0, 0)))
            u.normalize(); w = d.cross(u)
            rings.append([self.v(p + (u*cos(2*pi*s/sides) + w*sin(2*pi*s/sides)) * radii[k]) for s in range(sides)])
        for k in range(len(rings) - 1):
            for s in range(sides):
                t = (s + 1) % sides
                self.f((rings[k][s], rings[k][t], rings[k+1][t], rings[k+1][s]))

# ---------------------------------------------------------------- variants

# Trunk sections are unchanged between the variants: the reference reopened the face and
# the fins, not the fusiform trunk the sources fix.
SECTIONS = [(-1.16,.32,.365,.035),(-.75,.35,.405,.035),(-.25,.34,.405,.025),(.30,.30,.365,.025),
            (.90,.245,.29,.03),(1.5,.18,.21,.04),(2.1,.105,.125,.065),(2.65,.054,.082,.14),
            (3.15,.027,.056,.38),(3.50,.004,.007,.59)]

OLD = dict(
    head=[(-2.35,.085,.018,.012,.010),(-2.22,.15,.115,.045,.003),(-1.98,.23,.265,.13,-.015),
          (-1.70,.28,.35,.235,-.025),(-1.38,.305,.395,.30,-.028),(-1.16,.32,.40,.33,0)],
    eye=(.165,-1.99,.115), eyer=(.050,.080,.073),
    pectoral=[(.28,-.79,-.18),(.49,-.65,-.30),(.76,-.27,-.44),(.78,-.06,-.44),(.65,.13,-.40),(.46,.22,-.29),(.27,-.19,-.23)],
    pelvic=[(.24,.76,-.21),(.43,1.04,-.37),(.53,1.34,-.41),(.48,1.48,-.38),(.28,1.39,-.24),(.19,1.12,-.20)],
    dorsal=[(0,.99,.285),(0,1.08,.64),(0,1.24,.80),(0,1.43,.72),(0,1.71,.40),(0,1.88,.19)],
    anal=[(0,1.24,-.19),(0,1.33,-.47),(0,1.54,-.63),(0,1.70,-.54),(0,1.95,-.21),(0,2.02,-.08)],
    caudal=[(0,2.42,.10),(0,2.89,.31),(0,3.46,.59),(0,3.54,.57),(0,3.28,.30),(0,3.05,.035),
            (0,3.04,-.28),(0,3.00,-.54),(0,2.85,-.56),(0,2.67,-.34),(0,2.46,-.10)],
)

# Redesign, read off the user reference and reconciled with the C. trailli sources the
# builder already cites. What the reference changes: a wedge snout with a long straight
# gape carried well behind the eye, a fuller cheek and opercular shoulder behind it, the
# large eye further forward and higher, and every fin an angular swept blade with a
# convex leading edge, a pointed apex trailing backwards and a concave trailing edge.
# What the reference does NOT get to change: the tail stays strongly epicercal, because
# the sources fix that and the picture is art direction. The lobes are swept and pointed
# and the notch between them deepened, which is the part of the reference that is about
# shape rather than about taxon.
NEW = dict(
    head=[(-2.35,.042,.032,.030,.004),(-2.22,.122,.130,.078,.000),(-1.98,.222,.272,.150,-.014),
          (-1.70,.288,.360,.245,-.026),(-1.38,.312,.396,.312,-.030),(-1.16,.320,.400,.330,0)],
    eye=(.130,-2.050,.110), eyer=(.052,.086,.078),
    # apex swept back to y=+.30, leading edge convex out to .74, trailing edge cut concave
    pectoral=[(.26,-.80,-.16),(.52,-.70,-.31),(.74,-.44,-.42),(.80,-.10,-.45),(.72,.16,-.42),
              (.52,.30,-.34),(.36,.13,-.26),(.25,-.20,-.21)],
    pelvic=[(.22,.74,-.20),(.44,.96,-.36),(.55,1.28,-.44),(.50,1.52,-.40),(.33,1.56,-.29),(.22,1.24,-.21),(.18,1.08,-.19)],
    # a straight-ish leading edge to a sharp apex over its own base, then a long concave
    # trailing edge running back down the tail
    dorsal=[(0,1.00,.29),(0,1.06,.56),(0,1.17,.84),(0,1.28,.92),(0,1.45,.74),(0,1.66,.46),(0,1.86,.22)],
    anal=[(0,1.25,-.19),(0,1.31,-.44),(0,1.42,-.66),(0,1.55,-.72),(0,1.72,-.56),(0,1.93,-.29),(0,2.03,-.09)],
    # epicercal still: the upper lobe follows the scaled axis and overhangs the lower.
    # Both lobes are drawn to points and the notch between them is cut deeper.
    caudal=[(0,2.42,.10),(0,2.92,.34),(0,3.44,.64),(0,3.60,.66),(0,3.40,.38),(0,3.12,.10),
            (0,2.96,-.06),(0,3.10,-.36),(0,3.12,-.62),(0,2.96,-.66),(0,2.72,-.40),(0,2.46,-.11)],
)

def seating(P, samples=(32, 64)):
    """Fraction of the eye globe that lies inside the head cross-sections.

    A proxy for the packaged eye audit, not a substitute for it: it tests the lofted ellipse
    at each station rather than the exported closed polyhedron, so it reads a good deal lower
    than the real audit does. It is only ever used to compare two variants under the same
    measure, which is what choosing an eye position needs.
    """
    c = P['eye']; r = P['eyer']; ni, nj = samples; n = 0; tot = 0
    for i in range(1, ni):
        for j in range(nj):
            p = (c[0] + r[0] * sin(pi*i/ni) * cos(2*pi*j/nj),
                 c[1] + r[1] * sin(pi*i/ni) * sin(2*pi*j/nj),
                 c[2] + r[2] * cos(pi*i/ni))
            w, up, lo, z = spline(P['head'], p[1])
            h = up if p[2] >= z else lo
            tot += 1
            if (p[0]/w)**2 + ((p[2]-z)/h)**2 <= 1: n += 1
    return n / tot

def make(P, name):
    b = Build()
    surf = lambda y, a, off=0: Vector(((spline(SECTIONS, y)[0] + off) * cos(a), y,
                                       spline(SECTIONS, y)[2] + (spline(SECTIONS, y)[1] + off) * sin(a)))
    hd = lambda y: spline(P['head'], y)
    def hp(y, a):
        w, up, lo, z = hd(y)
        return Vector((w * cos(a), y, z + (up if sin(a) >= 0 else lo) * sin(a)))
    b.grid(141, 72, lambda i, j: b.v(surf(-1.16 + 4.66 * i / 140, j * 2 * pi / 72)), True)
    for low in (False, True):
        b.grid(65, 49, lambda i, j: b.v(hp(-2.35 + 1.19 * i / 64, (pi if low else 0) + pi * j / 48)))
    for side in (-1, 1):
        c = Vector((side * P['eye'][0], P['eye'][1], P['eye'][2])); s = P['eyer']
        b.grid(17, 32, lambda i, j: b.v(c + Vector((s[0]*sin(pi*i/16)*cos(2*pi*j/32),
                                                    s[1]*sin(pi*i/16)*sin(2*pi*j/32), s[2]*cos(pi*i/16)))), True)
    def fin(origin, controls, thickness=.012):
        controls = [Vector(c) for c in controls]; bd = []
        for k in range(len(controls) - 1):
            a, bb = controls[k:k+2]; pre = controls[max(0,k-1)]; post = controls[min(len(controls)-1,k+2)]
            for t in np.linspace(0, 1, 7, endpoint=False):
                t = float(t)
                bd.append((2*t**3-3*t*t+1)*a + (t**3-2*t*t+t)*(bb-pre)*.35 + (-2*t**3+3*t*t)*bb + (t**3-t*t)*(post-a)*.35)
        bd.append(controls[-1]); N = len(bd); steps = 12
        origin = Vector(origin)
        normal = Vector((1,0,0)) if max(p.x for p in bd) - min(p.x for p in bd) < .001 else Vector((0,0,1))
        pt = lambda t, j: origin.lerp(bd[j], t) + normal * (thickness * sin(pi*t) * sin(pi*j/(N-1)))
        for side in (-1, 1):
            b.grid(steps+1, N, lambda i, j: b.v(pt(.002 + .998*i/steps, j) +
                    normal * (side * thickness * .4 * (.15 + .85 * sin(pi*(.002+.998*i/steps))))))
    for side in (-1, 1):
        fin((side*.29,-.67,-.22), [(side*x,y,z) for x,y,z in P['pectoral']], .010)
        fin((side*.215,.87,-.19), [(side*x,y,z) for x,y,z in P['pelvic']], .008)
    fin((0,1.29,.27), P['dorsal'], .012)
    fin((0,1.50,-.16), P['anal'], .010)
    fin((0,2.52,.07), P['caudal'], .012)
    for k, y in enumerate(np.linspace(2.26, 3.40, 24)):
        p = surf(y, pi/2, .007)
        b.tube([p + Vector((0,-.026,-.003)), p + Vector((0,.018,.018)), p + Vector((0,.034,.003))], [.007,.006,.001], 6)
    me = bpy.data.meshes.new(name); me.from_pydata(b.V, [], b.F); me.validate(); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob

# ---------------------------------------------------------------- scene + render

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24
sc.cycles.use_denoising = True
sc.render.resolution_x = 900; sc.render.resolution_y = 420
sc.render.film_transparent = False
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True
sc.world.node_tree.nodes['Background'].inputs[0].default_value = (.06, .07, .08, 1)

clay = bpy.data.materials.new('clay'); clay.use_nodes = True
bsdf = clay.node_tree.nodes['Principled BSDF']
bsdf.inputs['Base Color'].default_value = (.62, .60, .56, 1)
bsdf.inputs['Roughness'].default_value = .55

key = bpy.data.objects.new('key', bpy.data.lights.new('key', 'AREA')); bpy.context.collection.objects.link(key)
key.data.energy = 900; key.data.size = 6; key.location = (-4, -3, 5); key.rotation_euler = (0.8, -0.5, -0.6)
fill = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'AREA')); bpy.context.collection.objects.link(fill)
fill.data.energy = 260; fill.data.size = 8; fill.location = (5, 2, 1); fill.rotation_euler = (1.5, 0, 1.9)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam)
cam.data.type = 'ORTHO'; sc.camera = cam

objs = {'old': make(OLD, 'old'), 'new': make(NEW, 'new')}
for o in objs.values(): o.data.materials.append(clay)

def shot(ob, view, path, ortho, loc, rot):
    for name, other in objs.items():
        other.hide_render = other is not ob
    cam.data.ortho_scale = ortho; cam.location = loc; cam.rotation_euler = rot
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

views = {
    'lateral': (6.4, (-8, 1.1, .05), (pi/2, 0, -pi/2)),
    'dorsal':  (6.4, (0, 1.1, 8), (0, 0, -pi/2)),
    'head':    (1.9, (-8, -1.85, .08), (pi/2, 0, -pi/2)),
}
for key_, ob in objs.items():
    for vname, (o, l, r) in views.items():
        shot(ob, vname, os.path.join(OUT, '%s-%s.png' % (key_, vname)), o, l, r)
print('eye seating  current %.3f  redesign %.3f' % (seating(OLD), seating(NEW)))
print('done')
