"""New Titanichthys sculpt, clay-02. Blender 4.5+, no prior assets imported.

Creative input, frozen by Astra. Executor must not tune, overwrite, or export it.
Outputs are confined to the new local rework-v3/clay-02 directory.
"""
from pathlib import Path
import bpy
import bmesh
import hashlib
import json
import math
from math import sin, cos, pi, exp, sqrt
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
OUT = REPO.parent / 'devonian-authoring/titanichthys/rework-v3/clay-02'
assert REPO.name == 'expansion-repo', REPO
if OUT.exists():
    raise RuntimeError(f'Candidate already exists; preserve it and return to Astra: {OUT}')
OUT.mkdir(parents=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials):
    bpy.data.materials.remove(block)

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
IRIS = mat('Iris relief clay', (.24, .245, .235), .40)

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
    return t*t*(3-2*t)

def gauss(v, c, s):
    return exp(-((v-c)/s)**2)

def adist(a, b):
    return (a-b+pi) % (2*pi)-pi

# Independent anatomical envelope: y, half-width, roof z, ventral z.
# The cranial roof remains short/broad. Cheeks/throat and thorax carry depth.
PROFILE = [
    (-2.92, 1.10, -.16, -.25),
    (-2.75, 1.23, .17, -.37),
    (-2.52, 1.39, .53, -.48),
    (-2.24, 1.46, .78, -.63),
    (-1.88, 1.455, .955, -.80),
    (-1.48, 1.37, 1.01, -.88),
    (-1.18, 1.30, 1.13, -.95),
    (-.75, 1.225, 1.13, -.96),
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
    k = next((i for i in range(len(PROFILE)-1)
              if PROFILE[i][0] <= y <= PROFILE[i+1][0]), None)
    if k is None:
        return PROFILE[0][1:] if y < PROFILE[0][0] else PROFILE[-1][1:]
    a, b = PROFILE[k], PROFILE[k+1]
    pre, post = PROFILE[max(0, k-1)], PROFILE[min(len(PROFILE)-1, k+2)]
    t = (y-a[0])/(b[0]-a[0])
    values = []
    for j in (1, 2, 3):
        m0 = (b[j]-pre[j])/(b[0]-pre[0])*(b[0]-a[0])
        m1 = (post[j]-a[j])/(post[0]-a[0])*(b[0]-a[0])
        values.append((2*t**3-3*t*t+1)*a[j] + (t**3-2*t*t+t)*m0
                      + (-2*t**3+3*t*t)*b[j] + (t**3-t*t)*m1)
    return values

def base_surface(y, a):
    w, top, bottom = profile(y)
    ss, cc = sin(a), cos(a)
    head = 1-smooth((y+1.3)/1.7)
    # Plate-bearing cross sections have planar cheeks and broad gently arched roofs.
    power_x = 1-.30*head
    power_z = 1-.38*head*max(0, ss)
    center = (top+bottom)/2
    half_h = (top-bottom)/2
    x = w*math.copysign(abs(cc)**power_x, cc)
    z = center + half_h*math.copysign(abs(ss)**power_z, ss)
    # The oral commissure is a long U in plan, terminating beneath the cheek
    # near the jaw hinge. A flat aperture ring produced the rejected bowl.
    # Linear parameter remapping keeps every longitudinal strip monotonic.
    mouth_sweep = 1.12*abs(cc)**4*clamp((-1.25-y)/1.67)
    yy = y+mouth_sweep
    # Rostral centre, downturned lower anterior margin, continuous cheek buttress.
    z -= .023*gauss(y, -2.92, .16)*max(0, -ss)**8
    yy -= .020*gauss(y, -2.92, .15)*max(0, -ss)**4
    cheek = gauss(y, -2.16, .36)*gauss(ss, .08, .28)
    x += math.copysign(.035*cheek, cc)
    z -= .025*gauss(y, -1.62, .42)*max(0, -ss)**4
    # Lower cheek hollow differentiates jaw sling from the upper skull.
    x -= math.copysign(.075*gauss(y, -2.15, .43)*gauss(ss, -.46, .19), cc)
    # Small orbital saddle with an actual brow in the continuous cranial surface.
    orbit = gauss(y, -2.56, .15)*gauss(abs(adist(a, .51 if cc >= 0 else pi-.51)), 0, .12)
    brow = gauss(y, -2.54, .22)*gauss(ss, .65, .13)
    x += math.copysign(-.034*orbit+.032*brow, cc)
    z += .033*brow
    # Broad dorsomedian crest and paired depressed regions behind the orbit.
    z += .035*gauss(y, -1.9, .45)*max(0, ss)**10
    x -= math.copysign(.018*gauss(y, -1.73, .24)*gauss(ss, .76, .12), cc)
    z -= .020*gauss(y, -1.73, .24)*gauss(ss, .76, .12)
    # Thoracic shoulder and fin-root musculature are skin sculpture, no attached balls.
    root = gauss(y, -.76, .45)*gauss(ss, -.40, .28)
    x += math.copysign(.145*root, cc)
    z -= .045*root
    # Strong posterior axial ridge and quiet segmental flank rhythm.
    muscle = smooth((y+.25)/.8)*(1-smooth((y-2.2)/.55))
    z += .035*muscle*max(0, ss)**8
    # Broad muscular fields only. Periodic displacement failed in actual clay.
    x += math.copysign(.025*gauss(y, .78, .70)*gauss(ss, .14, .38), cc)
    x -= math.copysign(.012*gauss(y, 1.78, .48)*gauss(ss, -.30, .32), cc)
    return Vector((x, yy, z))

# Plate-scale tangent planes are integrated into the skin. They create shape
# before narrow sutures; a line drawn on a smooth rounded envelope is inadequate.
PLATE_DOMAINS = [
    [(-2.83,.70),(-2.64,1.57),(-2.38,1.57),(-2.38,.76),(-2.60,.48)],
    [(-2.38,.78),(-2.38,1.57),(-1.98,1.57),(-1.98,.96)],
    [(-1.98,.96),(-1.98,1.57),(-1.44,1.57),(-1.46,.77)],
    [(-2.70,.28),(-2.59,.50),(-2.38,.76),(-2.17,.55),(-2.25,.15)],
    [(-2.64,-.18),(-2.70,.28),(-2.25,.15),(-2.12,-.05),(-1.62,-.19),(-1.83,-.44),(-2.33,-.44)],
    [(-2.25,.15),(-2.17,.55),(-1.98,.96),(-1.46,.77),(-1.48,.20),(-1.62,-.19),(-2.12,-.05)],
    [(-1.26,.70),(-1.26,1.57),(-.36,1.57),(.22,1.02),(-.03,.67),(-.55,.61)],
    [(-1.24,-.54),(-1.26,.70),(-.55,.61),(-.37,.09),(-.44,-.60),(-.88,-.87)],
    [(-.55,.61),(-.03,.67),(.22,1.02),(.37,.37),(.19,-.35),(-.44,-.60),(-.37,.09)],
    [(-1.19,-.95),(-.88,-.87),(-.44,-.60),(.19,-.35),(-.10,-1.40),(-.83,-1.55)],
]
PLATE_PLANES = []
for polygon in PLATE_DOMAINS:
    yc = sum(p[0] for p in polygon)/len(polygon)
    ac = sum(p[1] for p in polygon)/len(polygon)
    center_p = base_surface(yc, ac)
    normal_p = (base_surface(yc+.001, ac)-base_surface(yc-.001, ac)).cross(
        base_surface(yc, ac+.001)-base_surface(yc, ac-.001)).normalized()
    PLATE_PLANES.append((polygon, center_p, normal_p))

def polygon_weight(y, a, polygon):
    inside, distance = False, 1.e9
    for i, p0 in enumerate(polygon):
        p1 = polygon[(i+1) % len(polygon)]
        if (p0[1] > a) != (p1[1] > a):
            if y < (p1[0]-p0[0])*(a-p0[1])/(p1[1]-p0[1])+p0[0]:
                inside = not inside
        dx, dy = p1[0]-p0[0], 1.1*(p1[1]-p0[1])
        qx, qy = y-p0[0], 1.1*(a-p0[1])
        t = clamp((qx*dx+qy*dy)/max(1.e-12, dx*dx+dy*dy))
        distance = min(distance, math.hypot(qx-t*dx, qy-t*dy))
    return .94*smooth(distance/.072) if inside else 0.

def plane_surface(y, a):
    p = base_surface(y, a)
    sign = 1 if cos(a) >= 0 else -1
    ac = math.atan2(sin(a), abs(cos(a)))
    displacement = Vector((0,0,0))
    total = 0.
    if y < .4:
        for polygon, center, normal in PLATE_PLANES:
            weight = polygon_weight(y, ac, polygon)
            if not weight:
                continue
            cn = Vector((sign*center.x, center.y, center.z))
            nn = Vector((sign*normal.x, normal.y, normal.z))
            offset = clamp((cn-p).dot(nn), -.14, .14)
            displacement += nn*(weight*offset)
            total += weight
    return p+displacement/max(1.,total)

def catmull(points, subdivisions=16):
    points = [Vector(p) for p in points]
    result = []
    for i in range(len(points)-1):
        a, b = points[max(0, i-1)], points[i]
        c, d = points[i+1], points[min(len(points)-1, i+2)]
        for j in range(subdivisions):
            t = j/subdivisions
            result.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t
                              +(-a+3*b-3*c+d)*t*t*t))
    result.append(points[-1])
    return result

# Boundaries authored in surface coordinates (y, angle). They are incisions in
# the continuous mesh; skin-covered plate outlines remain an interpretation.
SEAM_PATHS = [polygon+[polygon[0]] for polygon in PLATE_DOMAINS]
SEAM_PATHS += [[(-1.38,-1.30),(-1.35,-.55),(-1.37,.20),(-1.36,.80),(-1.38,1.57)]]
seam_samples = []
for path in SEAM_PATHS:
    for k in range(len(path)-1):
        for j in range(96):
            q = Vector(path[k]).lerp(Vector(path[k+1]),j/96)
            for a in (q.y, pi-q.y):
                seam_samples.append(plane_surface(q.x, a))
seam_tree = KDTree(len(seam_samples))
for i, p in enumerate(seam_samples):
    seam_tree.insert(p, i)
seam_tree.balance()

def surface(y, a):
    p = plane_surface(y, a)
    w, top, bottom = profile(y)
    half_h = (top-bottom)/2
    normal = Vector((cos(a)/max(.1, w), 0, sin(a)/max(.1, half_h))).normalized()
    if y < .5:
        _, _, distance = seam_tree.find(p)
        # Narrow recessed line plus shallow rolled shoulder; no protruding strips.
        incision = -.008*exp(-(distance/.016)**2)
        bevel = 0.
        p += normal*(incision+bevel)
        # Hinge recess under the cheek. The pectoral origin lies farther posterior.
        ss = sin(a)
        hinge = gauss(y, -1.47, .105)*gauss(ss, -.21, .18)
        p -= normal*.060*hinge
    return p

verts, faces, materials, gape_weights, roof_weights = [], [], [], [], []
def vertex(p, jaw=0., roof=0.):
    verts.append(tuple(p))
    gape_weights.append(clamp(jaw))
    roof_weights.append(clamp(roof))
    return len(verts)-1

def quad(indices, mat_index=0):
    faces.append(tuple(indices))
    materials.append(mat_index)

def jaw_weight(y, a):
    return smooth((-sin(a)-.012)/.26)*(1-smooth((y+1.73)/.31))

N = 192
ROWS = 244
outer = []
for i in range(ROWS+1):
    y = -2.92+(3.72+2.92)*i/ROWS
    row = []
    for j in range(N):
        a = 2*pi*j/N
        roof = smooth((sin(a)+.04)/.30)*(1-smooth((y+1.75)/.43))
        row.append(vertex(surface(y, a), jaw_weight(y, a), roof))
    outer.append(row)
for i in range(ROWS):
    for j in range(N):
        j1 = (j+1) % N
        quad((outer[i][j], outer[i+1][j], outer[i+1][j1], outer[i][j1]))
tail_end = vertex((0, 3.745, .855))
for j in range(N):
    quad((outer[-1][j], tail_end, outer[-1][(j+1) % N]))

# The lip and oral mesh reuse the opening's actual vertices: no shell left across
# the mouth. The rolled edge remains narrow, even in the wide-gape shape study.
last = outer[0]
for k in range(1, 5):
    t = k/4
    row = []
    for j in range(N):
        a = 2*pi*j/N
        p = surface(-2.92, a)
        p.x -= .018*t*cos(a)
        p.z -= .012*t*sin(a)
        p.y += .024*t-.006*sin(pi*t)
        row.append(vertex(p, jaw_weight(-2.92, a), smooth((sin(a)+.04)/.30)))
    for j in range(N):
        j1 = (j+1) % N
        quad((last[j], last[j1], row[j1], row[j]), 1)
    last = row

oral_start = len(verts)
for i in range(1, 71):
    t = i/70
    row = []
    for j in range(N):
        a = 2*pi*j/N
        entrance = surface(-2.92, a)
        entrance.x -= .018*cos(a)
        entrance.z -= .012*sin(a)
        entrance.y += .024
        # Spacious vestibule, concave cheeks, palatal dome and dished oral floor.
        width = 1.082-.21*t-.312*t*t
        hh = .031+.39*sin(pi*t/2)-.091*t**3
        center_z = -.207+.22*sin(pi*t/2)-.133*t
        p = Vector((width*cos(a), entrance.y*(1-t)-.30*t,
                    center_z+hh*sin(a)))
        # Exact rim continuity, with a broad passage remaining behind the jaw.
        p = entrance.lerp(p, smooth(t/.075)) if t < .075 else p
        p.x += .016*sin(pi*t)*gauss(t,.44,.26)*cos(a)**5
        p.z -= .025*sin(pi*t)*max(0,sin(a))**10
        p.z += .027*sin(pi*t)**2*max(0,-sin(a))**8
        row.append(vertex(p, jaw_weight(p.y, a)*(1-.30*t),
                          smooth((sin(a)+.04)/.30)*(1-smooth((p.y+1.8)/.5))))
    for j in range(N):
        j1 = (j+1) % N
        quad((last[j], last[j1], row[j1], row[j]), 2)
    last = row

# Rear lumen turns downward before its tiny hidden terminus, so the oral view
# contains a deep continuous space instead of a flat visible back-wall disc.
for i in range(1, 31):
    t = i/30
    row = []
    center = Vector((0, -.30+.52*sin(pi*t/2), -.12-.42*(1-cos(pi*t/2))))
    tangent = Vector((0, .52*cos(pi*t/2), -.42*sin(pi*t/2))).normalized()
    up = Vector((0, -tangent.z, tangent.y))
    for j in range(N):
        a = 2*pi*j/N
        p = center+Vector((.560*(1-.55*t)*cos(a), 0, 0))+up*(.330*(1-.70*t)*sin(a))
        row.append(vertex(p))
    for j in range(N):
        j1 = (j+1) % N
        quad((last[j], last[j1], row[j1], row[j]), 2)
    last = row
end = vertex((0, .22, -.565))
for j in range(N):
    quad((last[j], last[(j+1) % N], end), 2)

body = mesh_object('Titanichthys_new_continuous_sculpt', verts, faces, [CLAY, LIP, ORAL], materials)
body['anatomical_regions'] = 'Cranial roof; cheeks; hinge; edentulous lower margin; oral cavity; thorax; posterior; caudal support'
body['source'] = 'Entirely new V3 clay-02; no V1/V2 geometry imported'
body.shape_key_add(name='Basis')
gape = body.shape_key_add(name='Gape study 24 degrees')
hinge = Vector((0, -1.42, -.24))
neck = Vector((0, -1.40, .72))
def rotate_x(p, pivot, angle):
    q = Vector(p)-pivot
    return pivot+Vector((q.x, cos(angle)*q.y-sin(angle)*q.z,
                         sin(angle)*q.y+cos(angle)*q.z))
for i, v in enumerate(body.data.vertices):
    p = v.co.copy()
    jaw_p = rotate_x(p, hinge, math.radians(24)*gape_weights[i])
    # A modest roof lift respects separate skull/thoracic articulation.
    jaw_p = rotate_x(jaw_p, neck, math.radians(-3)*roof_weights[i])
    gape.data[i].co = jaw_p
gape.value = 0

def surface_normal(y, a):
    tangent = surface(y+.0001, a)-surface(y-.0001, a)
    around = surface(y, a+.0001)-surface(y, a-.0001)
    return tangent.cross(around).normalized()

eyes = []
for sign, label in ((1, 'L'), (-1, 'R')):
    y, a = -2.56, (.51 if sign == 1 else pi-.51)
    p = surface(y, a)
    normal = surface_normal(y, a)
    radius = .078
    center = p-normal*.058
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=radius, location=center)
    eye = bpy.context.object
    eye.name = 'Small recessed eye '+label
    eye.data.materials.append(EYE)
    for poly in eye.data.polygons:
        poly.use_smooth = True
    # No high-contrast iris badge in a clay form review.
    eye['gape_skull_follow'] = True
    eye['gape_skull_weight'] = smooth((sin(a)+.04)/.30)
    eyes.append({'side':label, 'center':list(center), 'radius':radius,
                 'surface':list(p), 'normal':list(normal)})

def cubic(points, t):
    a, b, c, d = map(Vector, points)
    return a*(1-t)**3+b*(3*t*(1-t)**2)+c*(3*t*t*(1-t))+d*t**3

def paired_fin(name, sign, leading, trailing, root_thickness, rays):
    fv, ff = [], []
    spans, chords = 76, 34
    layers = []
    for side in (-1, 1):
        layer = []
        for i in range(spans):
            s = i/spans
            lead, trail = cubic(leading, s), cubic(trailing, s)
            row = []
            for j in range(chords+1):
                c = j/chords
                p = lead.lerp(trail, c)
                # Root is thick and buried. Distal membrane has camber and a
                # quiet trailing-edge droop, with integrated shallow ray relief.
                camber = (.55*root_thickness*(1-s)+.060*sin(pi*s))*sin(pi*c)
                # Every chord-dependent term vanishes at the single tip.
                # The old nonvanishing droop created the visible folded hook.
                droop = -.052*sin(pi*s)*c*c
                thick = (.0025+root_thickness*(1-s)**2.1)*(.15+.85*sin(pi*c)**.60)
                p.z += camber+droop+side*thick
                p.x *= sign
                row.append(len(fv))
                fv.append(tuple(p))
            layer.append(row)
        layers.append(layer)
    for side, layer in enumerate(layers):
        for i in range(spans-1):
            for j in range(chords):
                face = (layer[i][j], layer[i+1][j], layer[i+1][j+1], layer[i][j+1])
                ff.append(face if side else tuple(reversed(face)))
    lo, hi = layers
    for i in range(spans-1):
        for j in (0, chords):
            ff.append((lo[i][j], hi[i][j], hi[i+1][j], lo[i+1][j]))
    for j in range(chords):
        ff.append((lo[0][j], lo[0][j+1], hi[0][j+1], hi[0][j]))
    tip = (Vector(leading[-1])+Vector(trailing[-1]))*.5
    tip.x *= sign
    tip_index = len(fv)
    fv.append(tuple(tip))
    for j in range(chords):
        ff.append((lo[-1][j], lo[-1][j+1], tip_index))
        ff.append((hi[-1][j+1], hi[-1][j], tip_index))
    for j in (0,chords):
        ff.append((lo[-1][j], tip_index, hi[-1][j]))
    ob = mesh_object(name, fv, ff, [FIN])
    ob['attachment'] = 'Closed fleshy base embedded in continuously sculpted body root; visually review full circumference'
    return ob

for sign, label in ((1, 'L'), (-1, 'R')):
    paired_fin('Long pectoral '+label, sign,
        [(1.005, -1.13, -.45), (1.90, -.90, -.42), (3.04, .75, -.62), (3.38, 1.70, -.45)],
        [(1.00, -.02, -.54), (1.65, .65, -.69), (2.69, 1.68, -.67), (3.38, 1.70, -.45)],
        .160, 0)
    paired_fin('Pelvic '+label, sign,
        [(.38, 1.20, -.34), (.74, 1.33, -.41), (1.01, 1.77, -.53), (1.08, 2.17, -.47)],
        [(.34, 1.78, -.35), (.55, 2.04, -.51), (.90, 2.23, -.57), (1.08, 2.17, -.47)],
        .065, 0)

def median_fin(name, center, outline, thickness, rays):
    center = Vector(center)
    boundary = catmull(outline+[outline[0]], 12)[:-1]
    fv, ff = [], []
    layers = []
    nr = 36
    nc = len(boundary)
    for side in (-1, 1):
        center_index = len(fv)
        cp = center.copy()
        cp.x += side*thickness
        fv.append(tuple(cp))
        rows = []
        for i in range(1, nr+1):
            t = i/nr
            row = []
            for j, edge in enumerate(boundary):
                p = center.lerp(edge, t)
                p.x += side*(.0015+thickness*(1-t*t))
                row.append(len(fv))
                fv.append(tuple(p))
            rows.append(row)
        for j in range(nc):
            ff.append((center_index, rows[0][j], rows[0][(j+1) % nc]))
        for i in range(nr-1):
            for j in range(nc):
                j1 = (j+1) % nc
                ff.append((rows[i][j], rows[i+1][j], rows[i+1][j1], rows[i][j1]))
        layers.append(rows)
    for j in range(nc):
        j1 = (j+1) % nc
        ff.append((layers[0][-1][j], layers[1][-1][j], layers[1][-1][j1], layers[0][-1][j1]))
    return mesh_object(name, fv, ff, [FIN])

median_fin('Modest swept dorsal', (0, .88, .80),
    [(0, .12, .83), (0, .45, 1.20), (0, .76, 1.57), (0, .89, 1.62),
     (0, 1.10, 1.43), (0, 1.40, .88), (0, 1.72, .45), (0, 1.02, .50)], .038, 17)
median_fin('Strong heterocercal caudal', (0, 3.02, .08),
    [(0, 2.58, .19), (0, 3.07, .53), (0, 3.80, 1.08), (0, 4.40, 1.25),
     (0, 4.44, 1.20), (0, 4.14, .89), (0, 3.66, .26), (0, 3.71, .05),
     (0, 4.00, -.65), (0, 4.01, -.87), (0, 3.84, -.87), (0, 3.35, -.55),
     (0, 2.78, -.12)], .042, 29)

# Explicit landmarks support later rig authorship, hidden from all clay views.
landmarks = {'jaw_hinge':(0, -1.42, -.24), 'neck_pivot':(0, -1.40, .72),
             'pectoral_root_L':(1.24, -.73, -.46), 'pectoral_root_R':(-1.24, -.73, -.46),
             'posterior_root':(0, .20, .03), 'caudal_pivot':(0, 2.60, .08),
             'oral_front':(0, -2.93, -.10), 'oral_inside':(0, -2.18, -.16)}
for name, p in landmarks.items():
    ob = bpy.data.objects.new('LANDMARK_'+name, None)
    bpy.context.collection.objects.link(ob)
    ob.location = p
    ob.empty_display_size = .08
    ob.hide_render = True
    ob.hide_viewport = True

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 48
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = 2
scene.render.resolution_x = 1440
scene.render.resolution_y = 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.105, .12, .14, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .40
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = -.35
scene.view_settings.gamma = 1
scene.unit_settings.system = 'NONE'

def area(name, loc, power, size, color):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.shape, data.size, data.color = power, 'DISK', size, color
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector((0, -.3, 0))-ob.location).to_track_quat('-Z', 'Y').to_euler()
    return ob
area('Studio key', (4, -6, 7), 1000, 4.5, (1., .94, .85))
area('Studio fill', (-5, -2, 3.5), 480, 5., (.79, .87, 1.))
area('Posterior rim', (2, 6, 5), 1200, 4., (.93, .97, 1.))
oral_light = area('Oral inspection fill', (0, -5.0, -.05), 0, 2., (1., .96, .91))
oral_light.rotation_euler = (Vector((0, -1.8, -.20))-oral_light.location).to_track_quat('-Z', 'Y').to_euler()
camera_data = bpy.data.cameras.new('Clay inspection camera')
camera = bpy.data.objects.new('Clay inspection camera', camera_data)
bpy.context.collection.objects.link(camera)
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 9.5
camera.location = (8, -9, 5)
camera.rotation_euler = (Vector((0, .4, 0))-camera.location).to_track_quat('-Z', 'Y').to_euler()
scene.camera = camera

construction = []
for ob in bpy.data.objects:
    if ob.type != 'MESH':
        continue
    if any(not math.isfinite(v) for p in ob.data.vertices for v in p.co):
        raise RuntimeError('Nonfinite geometry: '+ob.name)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    boundary = sum(1 for edge in bm.edges if edge.is_boundary)
    nonmanifold = sum(1 for edge in bm.edges if not edge.is_manifold)
    degenerate = sum(1 for face in bm.faces if face.calc_area() < 1.e-12)
    bm.free()
    # Iris caps intentionally have an open perimeter lying directly on the globe.
    if not ob.name.startswith('Quiet iris') and (nonmanifold or degenerate):
        raise RuntimeError(f'Construction topology failure {ob.name}: nonmanifold={nonmanifold}, degenerate={degenerate}')
    construction.append({'object':ob.name, 'vertices':len(ob.data.vertices),
                         'polygons':len(ob.data.polygons), 'boundary_edges':boundary,
                         'nonmanifold_edges':nonmanifold, 'degenerate_faces':degenerate})

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'titanichthys-clay-02.blend'))
report = {'candidate':'titanichthys/rework-v3/clay-02', 'status':'UNREVIEWED CLAY',
          'builder_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'blend_sha256':hashlib.sha256((OUT/'titanichthys-clay-02.blend').read_bytes()).hexdigest(),
          'construction':construction, 'eye_placement_design':eyes, 'landmarks':landmarks,
          'fossil_constraints':'broad short cranial roof; slender edentulous jaws; small eyes',
          'interpretations':'complete body and fins, tail, soft tissues, exact plate map',
          'render_recipe':str(HERE/'render_clay02.py'),
          'review_required':'Astra actual multiview review; not final eye/attachment/export audit'}
(OUT/'construction.json').write_text(json.dumps(report, indent=2)+'\n')
print('TITANICHTHYS_CLAY_BUILD_OK '+str(OUT))
