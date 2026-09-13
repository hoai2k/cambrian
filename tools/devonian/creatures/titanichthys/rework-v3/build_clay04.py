"""New Titanichthys sculpt, clay-04. Blender 4.5+, no prior assets imported.

Creative input, frozen by Astra. Executor must not tune, overwrite, or export it.
Outputs are confined to the new local rework-v3/clay-04 directory.
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
OUT = REPO.parent / 'devonian-authoring/titanichthys/rework-v3/clay-04'
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
    return t*t*t*(t*(t*6-15)+10)

def gauss(v, c, s):
    return exp(-((v-c)/s)**2)

def adist(a, b):
    return (a-b+pi) % (2*pi)-pi

# Independent anatomical envelope: y, half-width, roof z, ventral z.
# The cranial roof remains short/broad. Cheeks/throat and thorax carry depth.
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
    # One continuous armour volume. Shallow superellipse sections give a
    # broad cranial roof and rounded cheek turn, with no polygon projection.
    power_x = 1-.13*head
    power_z = 1-.18*head*max(0, ss)
    center, half_h = (top+bottom)/2, (top-bottom)/2
    x = w*math.copysign(abs(cc)**power_x, cc)
    z = center+half_h*math.copysign(abs(ss)**power_z, ss)
    mouth_sweep = .99*abs(cc)**3*clamp((-1.38-y)/1.45)
    yy = y+mouth_sweep
    # Blunt preoral vault, separate from the slender toothless oral margin.
    # Rostral depth comes from the profile's short curved rise, not a long wedge.
    z -= .020*gauss(y, -2.83, .11)*max(0, -ss)**8
    yy -= .012*gauss(y, -2.83, .12)*max(0, -ss)**4
    # A broad cheek buttress and subdued recess beneath it. Long field radii
    # avoid the intersecting sharp orbital dents present in clay02.
    cheek = gauss(y, -2.12, .52)*gauss(ss, .14, .40)
    x += math.copysign(.045*cheek, cc)
    floor_inset = .105*gauss(y, -2.33, .40)*smooth((-ss-.025)/.45)
    x *= 1-floor_inset
    z += .045*gauss(y, -2.34, .38)*max(0, -ss)**4
    orbit = gauss(y, -2.50, .18)*gauss(ss, .44, .17)
    x -= math.copysign(.013*orbit, cc)
    # Low nuchal crown and broad shoulder; actual station values carry most mass.
    z += .025*gauss(y, -1.88, .48)*max(0, ss)**8
    root = gauss(y, -.76, .45)*gauss(ss, -.40, .28)
    x += math.copysign(.115*root, cc)
    z -= .030*root
    muscle = smooth((y+.25)/.8)*(1-smooth((y-2.2)/.55))
    z += .035*muscle*max(0, ss)**8
    x += math.copysign(.025*gauss(y, .78, .70)*gauss(ss, .14, .38), cc)
    x -= math.copysign(.012*gauss(y, 1.78, .48)*gauss(ss, -.30, .32), cc)
    return Vector((x, yy, z))

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

# Sparse, rounded skin-covered sutures. These incisions never flatten or
# elevate entire polygon domains; no competing projected masks remain.
# The orbital region has no crossing seam or sharp field intersection.
SEAM_PATHS = [
    [(-2.49,1.57),(-2.40,1.20),(-2.25,.84),(-2.04,.48),(-1.72,.24),(-1.39,.15)],
    [(-1.96,1.57),(-1.94,1.25),(-1.84,.93),(-1.60,.69),(-1.36,.61)],
    [(-1.34,-1.40),(-1.32,-.92),(-1.32,-.40),(-1.34,.15),(-1.34,.78),(-1.36,1.57)],
    [(-1.30,.68),(-.95,.71),(-.62,.70),(-.30,.78),(-.03,.97)],
    [(-.63,.70),(-.49,.37),(-.39,.03),(-.38,-.35),(-.50,-.68)],
    [(-.11,.96),(.06,.57),(.08,.10),(-.01,-.37),(-.26,-.71)],
]
seam_samples = []
for path in SEAM_PATHS:
    for q in catmull(path, 72):
        for a in (q.y, pi-q.y):
            seam_samples.append(base_surface(q.x, a))
seam_tree = KDTree(len(seam_samples))
for i, p in enumerate(seam_samples):
    seam_tree.insert(p, i)
seam_tree.balance()

def surface(y, a):
    p = base_surface(y, a)
    if y < .4:
        w, top, bottom = profile(y)
        normal = Vector((cos(a)/max(.1,w), 0,
                         sin(a)/max(.1,(top-bottom)/2))).normalized()
        _, _, distance = seam_tree.find(p)
        # Wide shallow U incisions: a skin-covered plate boundary in grazing light.
        # At no point does this field displace the surface by more than .006.
        p -= normal*(.006*exp(-(distance/.033)**2))
    return p

# The anterior is an independently authored patch cage, not a longitudinal
# profile collapse onto the aperture. These six boundaries have anatomical
# owners documented in PATCH_MAP-clay04.md; neighbouring sectors share vertices.
HEAD_KNOTS = [0., .06, .22, .46, .73, 1.]
NECK_Y = -1.08

def mouth_rim(a):
    cc, ss = cos(a), sin(a)
    x = .91*cc
    y = -2.60+.70*abs(cc)**2.6
    # Restrained irregular curvature of an edentulous margin, never a blade.
    z = -.080+.064*ss-.020*max(0,ss)**3-.014*max(0,-ss)**8
    return Vector((x,y,z))

def head_controls(a):
    cc, ss = cos(a), sin(a)
    up, down = max(0,ss), max(0,-ss)
    cx = math.copysign(abs(cc)**(1-.12*smooth(up)),cc)
    m = mouth_rim(a)
    lip_back = m+Vector((.030*cc,.030*cc*cc-.025*up+.020*down,
                         .055*up-.042*down))
    # Upper sector: short rounded preoral face. Lower sector: narrow jaw
    # underside becoming a medial floor; the widest lateral cheek stays aft.
    preoral = Vector(((1.12-.42*smooth(down/.70))*cx,
                      -1.72-1.00*smooth(up)-.69*smooth(down),
                      -.030+.55*up**.72-.22*down**.80))
    crown = Vector(((1.43-.57*smooth(down/.70))*cx,
                    -1.60-.58*smooth(up)-.41*smooth(down),
                    .080+.88*up**.62-.56*down**.85))
    occipital = Vector(((1.39-.08*smooth(down/.75))*cx,
                        -1.30-.31*smooth(up)-.23*smooth(down),
                        .045+.98*up**.74-.84*down**.85))
    return [m,lip_back,preoral,crown,occipital,surface(NECK_Y,a)]

def cage_spline(points,t):
    if t <= 0: return points[0].copy()
    if t >= 1: return points[-1].copy()
    k=next(i for i in range(len(HEAD_KNOTS)-1) if HEAD_KNOTS[i]<=t<=HEAD_KNOTS[i+1])
    lo,hi=HEAD_KNOTS[k],HEAD_KNOTS[k+1]
    q=(t-lo)/(hi-lo)
    before,after=max(0,k-1),min(len(points)-1,k+2)
    d0=(points[k+1]-points[before])/(HEAD_KNOTS[k+1]-HEAD_KNOTS[before])*(hi-lo)
    d1=(points[after]-points[k])/(HEAD_KNOTS[after]-HEAD_KNOTS[k])*(hi-lo)
    return ((2*q**3-3*q*q+1)*points[k]+(q**3-2*q*q+q)*d0
            +(-2*q**3+3*q*q)*points[k+1]+(q**3-q*q)*d1)

def head_base(t,a):
    return cage_spline(head_controls(a),t)

HEAD_SUTURES = [
    [(.22,1.57),(.26,1.22),(.37,.91),(.51,.65),(.60,.30)],
    [(.49,1.57),(.51,1.26),(.57,.98),(.67,.72)],
    [(.80,-.96),(.80,-.45),(.80,.10),(.80,.69),(.80,1.57)],
]
head_seam_points=[]
for path in HEAD_SUTURES:
    for q in catmull(path,72):
        for a in (q.y,pi-q.y): head_seam_points.append(head_base(q.x,a))
head_seams=KDTree(len(head_seam_points))
for i,q in enumerate(head_seam_points): head_seams.insert(q,i)
head_seams.balance()

def head_surface(t,a):
    p=head_base(t,a)
    if .08<t<.99:
        tangent=head_base(min(1,t+.0001),a)-head_base(max(0,t-.0001),a)
        around=head_base(t,a+.0001)-head_base(t,a-.0001)
        normal=tangent.cross(around).normalized()
        distance=head_seams.find(p)[2]
        p-=normal*(.0065*exp(-(distance/.029)**2))
    return p

def head_weights(t,a):
    ss=sin(a)
    jaw=smooth(-ss/.22)*(1-smooth((t-.065)/.32))
    skull=smooth((ss+.09)/.25)*(1-smooth((t-.64)/.36))
    # The thin jaw itself remains rigid. Only the medial floor behind it unfolds.
    floor=sin(pi*clamp((t-.07)/.48))**2*smooth((-ss-.05)/.40)
    return jaw,skull,floor

verts,faces,materials,gape_weights,roof_weights,floor_weights=[],[],[],[],[],[]
def vertex(p,jaw=0.,roof=0.,floor=0.):
    verts.append(tuple(p));gape_weights.append(clamp(jaw))
    roof_weights.append(clamp(roof));floor_weights.append(clamp(floor))
    return len(verts)-1

def quad(indices,mat_index=0):
    faces.append(tuple(indices));materials.append(mat_index)

N=192
HEAD_ROWS=112
head_rows=[]
for i in range(HEAD_ROWS+1):
    t=i/HEAD_ROWS
    row=[]
    for j in range(N):
        a=2*pi*j/N
        row.append(vertex(head_surface(t,a),*head_weights(t,a)))
    head_rows.append(row)

# Each eye replaces a bounded cheek window. Its annulus and recessed socket
# use the window's real boundary vertices; there is no sphere pasted on a shell.
ORBIT_WINDOWS=[(34,42,13,19,'L'),(34,42,77,83,'R')]
def eye_cell(i,j):
    return any(i0<=i<i1 and j0<=j<j1 for i0,i1,j0,j1,label in ORBIT_WINDOWS)
for i in range(HEAD_ROWS):
    for j in range(N):
        if not eye_cell(i,j):
            k=(j+1)%N
            quad((head_rows[i][j],head_rows[i+1][j],head_rows[i+1][k],head_rows[i][k]))

# Shared exact neck loop; retained posterior and caudal construction follows.
last=head_rows[-1]
POST_ROWS=178
for i in range(1,POST_ROWS+1):
    y=NECK_Y+(3.72-NECK_Y)*i/POST_ROWS
    row=[vertex(surface(y,2*pi*j/N)) for j in range(N)]
    for j in range(N):
        k=(j+1)%N;quad((last[j],row[j],row[k],last[k]))
    last=row
tail_end=vertex((0,3.745,.855))
for j in range(N): quad((last[j],tail_end,last[(j+1)%N]))

# Inner lining shares the aperture itself. The lower lining is derived from
# the same outer floor cage and motion parameter, preventing detached rails.
def oral_surface(t,a):
    q=head_surface(t,a)
    ss,cc=sin(a),cos(a)
    inner=q-Vector((cc*(.015+.16*t),0,ss*(.015+.12*t)))
    inner.y+=.018
    m=mouth_rim(a)
    palate=Vector(((.91+.31*sin(pi*t)-.11*t)*cc,
                   m.y*(1-t)+NECK_Y*t+.018,
                   -.080+.064*ss-.020*max(0,ss)**3
                   +.42*sin(pi*t/2)*ss-.070*t))
    inner=inner.lerp(palate,smooth(ss/.45))
    # Exact shared edge, followed by a short rounded lip wall.
    return m.lerp(inner,smooth(t/.065)) if t<.065 else inner

last=head_rows[0]
ORAL_ROWS=112
for i in range(1,ORAL_ROWS+1):
    t=i/ORAL_ROWS
    row=[]
    for j in range(N):
        a=2*pi*j/N
        row.append(vertex(oral_surface(t,a),*head_weights(t,a)))
    for j in range(N):
        k=(j+1)%N;quad((last[j],last[k],row[k],row[j]),1 if t<.075 else 2)
    last=row

# Broad rear passage blends from the actual inner head boundary, then turns
# into the hidden throat. No little aperture or exposed flat back disc.
for i in range(1,43):
    t=i/42
    row=[]
    for j in range(N):
        a=2*pi*j/N
        target=Vector(((.94-.48*t)*cos(a),NECK_Y+.018+1.10*t,
                       -.18-.16*smooth(t)+(.47-.22*t)*sin(a)))
        start=oral_surface(1,a)
        q=start.lerp(target,smooth(t/.24)) if t<.24 else target
        row.append(vertex(q))
    for j in range(N):
        k=(j+1)%N;quad((last[j],last[k],row[k],row[j]),2)
    last=row
for i in range(1,25):
    t=i/24
    row=[]
    for j in range(N):
        a=2*pi*j/N
        q=Vector((.46*(1-.92*t)*cos(a),.038+.18*sin(pi*t/2),
                  -.34-.23*(1-cos(pi*t/2))+.25*(1-.90*t)*sin(a)))
        row.append(vertex(q))
    for j in range(N):
        k=(j+1)%N;quad((last[j],last[k],row[k],row[j]),2)
    last=row
end=vertex((0,.218,-.57))
for j in range(N): quad((last[j],last[(j+1)%N],end),2)

eyes=[]
for i0,i1,j0,j1,label in ORBIT_WINDOWS:
    tc=(i0+i1)/(2*HEAD_ROWS);ac=(j0+j1)*pi/N
    center=head_surface(tc,ac)
    along=(head_surface(tc+.0001,ac)-head_surface(tc-.0001,ac)).normalized()
    around=head_surface(tc,ac+.0001)-head_surface(tc,ac-.0001)
    around=(around-along*around.dot(along)).normalized()
    normal=along.cross(around).normalized()
    perimeter=([(i0,j) for j in range(j0,j1)]+[(i,j1) for i in range(i0,i1)]
               +[(i1,j) for j in range(j1,j0,-1)]+[(i,j0) for i in range(i1,i0,-1)])
    outer=[head_rows[i][j] for i,j in perimeter]
    angles=[math.atan2((j-(j0+j1)/2)/((j1-j0)/2),
                       (i-(i0+i1)/2)/((i1-i0)/2)) for i,j in perimeter]
    ring=outer
    for layer in range(1,5):
        amount=layer/4
        row=[]
        for idx,angle in zip(outer,angles):
            aperture=center+along*(.070*cos(angle))+around*(.051*sin(angle))-normal*.004
            q=Vector(verts[idx]).lerp(aperture,smooth(amount))
            row.append(vertex(q,*head_weights(tc,ac)))
        for j in range(len(ring)):
            k=(j+1)%len(ring);quad((ring[j],ring[k],row[k],row[j]))
        ring=row
    for layer in range(1,5):
        t=layer/4
        row=[]
        for angle in angles:
            q=center+along*(.070*(1-.70*t)*cos(angle))+around*(.051*(1-.70*t)*sin(angle))-normal*(.004+.118*t)
            row.append(vertex(q,*head_weights(tc,ac)))
        for j in range(len(ring)):
            k=(j+1)%len(ring);quad((ring[j],ring[k],row[k],row[j]))
        ring=row
    socket_end=vertex(center-normal*.127,*head_weights(tc,ac))
    for j in range(len(ring)):quad((ring[j],ring[(j+1)%len(ring)],socket_end))
    eye_center=center-normal*.029
    radius=.075
    eyes.append({'side':label,'center':list(eye_center),'radius':radius,
                 'surface':list(center),'normal':list(normal),'cage_t':tc,'cage_angle':ac,
                 'aperture_axes':[.140,.102]})

# Remove the unused vertices formerly inside the two eye windows, retaining
# one closed outer-surface/lining/socket mesh and all corresponding shape data.
used=sorted({index for face in faces for index in face})
remap={old:new for new,old in enumerate(used)}
verts=[verts[i] for i in used]
gape_weights=[gape_weights[i] for i in used]
roof_weights=[roof_weights[i] for i in used]
floor_weights=[floor_weights[i] for i in used]
faces=[tuple(remap[i] for i in f) for f in faces]
body=mesh_object('Titanichthys_new_continuous_sculpt',verts,faces,[CLAY,LIP,ORAL],materials)
body['anatomical_regions']='Joined preoral/cranial/cheek patches; inset mouth; thin mandibular envelope; medial floor; palate; socket openings; throat; retained posterior'
body['source']='New V3 clay-04 patch architecture; no prior mesh imported'
body.shape_key_add(name='Basis')
gape=body.shape_key_add(name='Gape study 24 degrees')
hinge=Vector((0,-1.90,-.080))
neck=Vector((0,-1.40,.72))
def rotate_x(p,pivot,angle):
    q=Vector(p)-pivot
    return pivot+Vector((q.x,cos(angle)*q.y-sin(angle)*q.z,sin(angle)*q.y+cos(angle)*q.z))
for i,v in enumerate(body.data.vertices):
    q=rotate_x(v.co,hinge,math.radians(24)*gape_weights[i])
    q.z-=.055*floor_weights[i]
    gape.data[i].co=rotate_x(q,neck,math.radians(-2)*roof_weights[i])
gape.value=0

for info in eyes:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,radius=info['radius'],location=info['center'])
    eye=bpy.context.object;eye.name='Recessed socket eye '+info['side']
    eye.data.materials.append(EYE)
    for poly in eye.data.polygons:poly.use_smooth=True
    eye['gape_skull_follow']=True
    eye['gape_skull_weight']=head_weights(info['cage_t'],info['cage_angle'])[1]

def cubic(points, t):
    a, b, c, d = map(Vector, points)
    return a*(1-t)**3+b*(3*t*(1-t)**2)+c*(3*t*t*(1-t))+d*t**3

def paired_fin(name,sign,leading,trailing,root_thickness,rays):
    # A local frame along the span owns chord, camber and section thickness.
    # This replaces global-Z top/bottom sheet offsets and accidental chord loss.
    fv,ff=[],[]
    spans,chords=84,36
    def spine(s):
        q=(cubic(leading,s)+cubic(trailing,s))*.5
        q.z-=.22*s
        q.x-=1.7*root_thickness*(1-s)**3
        return q
    layers=[]
    for side in (-1,1):
        layer=[]
        for i in range(spans):
            s=i/spans
            center=spine(s)
            tangent=(spine(min(1,s+.0001))-spine(max(0,s-.0001))).normalized()
            chord_dir=Vector((-tangent.y,tangent.x,0)).normalized()
            if chord_dir.dot(cubic(trailing,s)-cubic(leading,s))<0:chord_dir=-chord_dir
            normal=tangent.cross(chord_dir).normalized()
            if normal.z<0:normal=-normal
            # Distal washout is gradual; all section terms vanish at the tip.
            twist=math.radians(11)*smooth(s)
            chord_dir=chord_dir*cos(twist)+normal*sin(twist)
            normal=tangent.cross(chord_dir).normalized()
            if normal.z<0:normal=-normal
            chord=(cubic(trailing,s)-cubic(leading,s)).length*(1+.12*sin(pi*s))
            row=[]
            for j in range(chords+1):
                c=j/chords
                p=center+chord_dir*((c-.5)*chord)
                camber=.027*chord*sin(pi*c)*(1-.60*s)
                half=(.0015+root_thickness*(1-s)**3.0)*(.10+.90*sin(pi*c)**.70)
                p+=normal*(camber+side*half)
                p.x*=sign
                row.append(len(fv));fv.append(tuple(p))
            layer.append(row)
        layers.append(layer)
    for side,layer in enumerate(layers):
        for i in range(spans-1):
            for j in range(chords):
                f=(layer[i][j],layer[i+1][j],layer[i+1][j+1],layer[i][j+1])
                ff.append(f if side else tuple(reversed(f)))
    lo,hi=layers
    for i in range(spans-1):
        for j in (0,chords):ff.append((lo[i][j],hi[i][j],hi[i+1][j],lo[i+1][j]))
    for j in range(chords):ff.append((lo[0][j],lo[0][j+1],hi[0][j+1],hi[0][j]))
    tip=spine(1);tip.x*=sign
    tip_i=len(fv);fv.append(tuple(tip))
    for j in range(chords):
        ff.append((lo[-1][j],lo[-1][j+1],tip_i))
        ff.append((hi[-1][j+1],hi[-1][j],tip_i))
    for j in (0,chords):ff.append((lo[-1][j],tip_i,hi[-1][j]))
    ob=mesh_object(name,fv,ff,[FIN])
    ob['attachment']='Buried lenticular root; full local chord and normal sections; visible circumference requires actual review'
    return ob

for sign,label in ((1,'L'),(-1,'R')):
    paired_fin('Long pectoral '+label,sign,
        [(1.005,-1.13,-.45),(1.90,-.90,-.42),(3.04,.75,-.62),(3.38,1.70,-.45)],
        [(1.00,-.02,-.54),(1.65,.65,-.69),(2.69,1.68,-.67),(3.38,1.70,-.45)],.070,0)
    paired_fin('Pelvic '+label,sign,
        [(.38,1.20,-.34),(.74,1.33,-.41),(1.01,1.77,-.53),(1.08,2.17,-.47)],
        [(.34,1.78,-.35),(.55,2.04,-.51),(.90,2.23,-.57),(1.08,2.17,-.47)],.033,0)

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
landmarks = {'jaw_hinge':(0, -1.90, -.080), 'neck_pivot':(0, -1.40, .72),
             'pectoral_root_L':(1.24, -.73, -.46), 'pectoral_root_R':(-1.24, -.73, -.46),
             'posterior_root':(0, .20, .03), 'caudal_pivot':(0, 2.60, .08),
             'oral_front':(0, -2.60, -.10), 'oral_inside':(0, -2.18, -.16)}
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

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'titanichthys-clay-04.blend'))
report = {'candidate':'titanichthys/rework-v3/clay-04', 'status':'UNREVIEWED CLAY',
          'builder_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'blend_sha256':hashlib.sha256((OUT/'titanichthys-clay-04.blend').read_bytes()).hexdigest(),
          'construction':construction, 'eye_placement_design':eyes, 'landmarks':landmarks,
          'head_architecture':'Shared anatomical cage patches; inset oral rim; medial floor; orbital windows',
          'head_control_parameters':HEAD_KNOTS, 'neck_join_y':NECK_Y,
          'fin_architecture':'Local span frames, true chord, lenticular normal sections, 11-degree washout',
          'fossil_constraints':'broad short cranial roof; slender edentulous jaws; small eyes',
          'interpretations':'complete body and fins, tail, soft tissues, exact plate map',
          'render_recipe':str(HERE/'render_clay04.py'),
          'review_required':'Astra actual multiview review; not final eye/attachment/export audit'}
(OUT/'construction.json').write_text(json.dumps(report, indent=2)+'\n')
print('TITANICHTHYS_CLAY_BUILD_OK '+str(OUT))
