"""New Gemuendina clay: pure shape specification, independent of Blender/V2.

Coordinates: +Y posterior, +Z dorsal, X paired. Units are authoring units.
This living thickness/soft silhouette is a reconstruction, not a fossil trace.
"""
from math import sin, cos, pi, exp, sqrt, atan2

VERSION = 'gemuendina-rework-v3-clay-02'
NY, NX = 272, 160
YMIN, YMAX = -1.98, 4.08
MOUTH_Y, MOUTH_HY, MOUTH_U = -1.68, .15, .30
APERTURE_Y = -1.75
MOUTH_I0, MOUTH_I1 = 16, 40
MOUTH_J0, MOUTH_J1 = 56, 104

# Shape-preserving interpolation retains deliberate inflections without ringing.
def profile(y, points):
    if y <= points[0][0]: return points[0][1]
    if y >= points[-1][0]: return points[-1][1]
    ds = [(points[k+1][1]-points[k][1])/(points[k+1][0]-points[k][0]) for k in range(len(points)-1)]
    slopes = [ds[0]]
    for k in range(1, len(points)-1):
        if ds[k-1]*ds[k] <= 0: slopes.append(0.)
        else:
            h0=points[k][0]-points[k-1][0]; h1=points[k+1][0]-points[k][0]
            w0=2*h1+h0; w1=h1+2*h0
            slopes.append((w0+w1)/(w0/ds[k-1]+w1/ds[k]))
    slopes.append(ds[-1])
    for k in range(len(points)-1):
        a, b = points[k], points[k+1]
        if a[0] <= y <= b[0]:
            h=b[0]-a[0]; t=(y-a[0])/h
            return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*h*slopes[k]+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*h*slopes[k+1]

WIDTH = [(-1.98,0),(-1.965,.24),(-1.92,.44),(-1.82,.66),(-1.66,.84),
         (-1.43,1.01),(-1.20,1.08),(-.93,1.31),(-.57,1.64),(-.17,1.86),
         (.15,1.90),(.46,1.80),(.70,1.54),(.94,1.10),(1.10,.64),
         (1.23,.42),(1.38,.47),(1.51,.47),(1.65,.36),(1.80,.245),
         (2.12,.175),(2.58,.111),(3.10,.061),(3.62,.027),(4.08,0)]
CORE = [(-1.98,.12),(-1.85,.46),(-1.55,.79),(-1.20,.91),(-.80,.88),
        (-.30,.72),(.30,.53),(.90,.35),(1.45,.245),(1.85,.20),
        (2.60,.125),(3.3,.070),(4.08,.015)]
CROWN = [(-1.98,0),(-1.955,.065),(-1.88,.13),(-1.74,.22),(-1.52,.37),(-1.18,.44),
         (-.76,.44),(-.20,.36),(.40,.275),(1.0,.205),(1.5,.153),
         (2.12,.115),(2.7,.078),(3.4,.039),(4.08,0)]
BELLY = [(-1.98,0),(-1.90,.048),(-1.60,.13),(-1.0,.185),(-.25,.18),
         (.5,.143),(1.4,.105),(2.1,.089),(2.7,.063),(3.4,.036),(4.08,0)]

def smooth(a,b,x):
    t=max(0.,min(1.,(x-a)/(b-a))); return t*t*(3-2*t)

def axis(y):
    # Mild living S-line begins in the posterior; root stays centered.
    t=smooth(1.30,4.08,y)
    nose=.095*exp(-((y+1.98)/.22)**2)
    return .16*t*sin((y-1.3)*1.9), .018+nose+.065*t*sin((y-1.30)*1.15)

def skin(x, y, dorsal=True):
    width=max(1e-8,profile(y,WIDTH)); core=profile(y,CORE)
    u=min(1.,abs(x)/width); rounding=sqrt(max(0.,1-u*u))
    wing=smooth(1.10,2.35,width/max(.02,core))
    outer=smooth(.38,.97,u)
    # Camber now changes visibly along the margin and through the lateral span.
    # Inner pectoral mass stays carried by the trunk; this is a resting shape,
    # not an exaggerated manta flapping pose.
    camber=wing*outer*(.105*sin((y+.83)*2.15)+.024*cos((y+.3)*4.4))
    camber+=wing*.05*sin(pi*u)*exp(-((y+.05)/.85)**2)
    # A broad continuous cranial vault, not a separate eye pad or head object.
    axial=exp(-.78*(abs(x)/max(.02,core))**2.7)
    tail=smooth(1.72,2.25,y)
    axial=axial*(1-tail)+tail
    # Crucially, fin thickness does not add a width-dependent bump to the axis.
    fin_field=wing*(1-exp(-(abs(x)/max(.02,core*.78))**4))
    z=axis(y)[1]+camber
    if dorsal:
        z+=rounding*(profile(y,CROWN)*axial+.067*fin_field)
        # Broad oblique cheek/branchial bed with a gently planar upper field.
        # Strong enough to survive neutral clay lighting, blended into the core.
        cheek_x=.63+.20*smooth(-1.35,-.58,y)
        z+=rounding*.14*exp(-((abs(x)-cheek_x)/.30)**4-((y+.99)/.39)**4)
        z+=rounding*.055*exp(-(x/.39)**4-((y+1.10)/.43)**4)
        # Open horseshoe-like brow merges posteriorly into that cheek field.
        # It is vertex displacement of true skin, not a torus or orbital pad.
        qx=abs(x)-.55; qy=y+1.30
        radius=sqrt((qx/.19)**2+(qy/.23)**2)
        brow=.075*exp(-((radius-1.0)/.48)**2)*smooth(-.16,.03,qy)
        socket=.030*exp(-(qx/.12)**2-(qy/.145)**2)
        z+=rounding*(brow-socket)
        # Medial/preorbital saddle and a broad caudal cranial plane transition.
        z-=rounding*.035*exp(-(x/.25)**4-((y+1.38)/.25)**4)
        rear_line=-.58+.15*(abs(x)/.94)**2
        head_mask=exp(-(x/.99)**6)
        z+=rounding*head_mask*.035*exp(-((y-rear_line+.12)/.18)**2)
        z-=rounding*head_mask*.025*exp(-((y-rear_line)/.075)**2)
        # Subtle, short dorsal branchial sulcus with a raised medial tissue bank.
        # This replaces the detached-looking dark tube landmarks entirely.
        gill_x=.89+.19*(y+.73)
        gill_mask=exp(-((y+.69)/.16)**4)
        z-=rounding*.039*gill_mask*exp(-((abs(x)-gill_x)/.027)**2)
        z+=rounding*.020*gill_mask*exp(-((abs(x)-gill_x+.048)/.047)**2)
        # Thick swept pectoral shoulder, changing camber through the fin field.
        ridge_x=core*.94+.27*smooth(-.8,.75,y)
        z+=rounding*wing*.073*exp(-((abs(x)-ridge_x)/.32)**2-((y+.20)/.74)**2)
        z-=rounding*wing*.024*exp(-((abs(x)-ridge_x-.37)/.22)**2-((y+.12)/.66)**2)
        z+=rounding*fin_field*.010*sin(7.5*y+3*u)*sin(pi*u)
        # Flatten the subterminal oral bed, then give the actual aperture short
        # integrated anterior/posterior lips and fleshy commissural transitions.
        z-=rounding*.055*exp(-(x/.46)**6-((y+1.73)/.12)**4)
        lip_y=-1.798+.047*(x/.36)**2
        lip_mask=exp(-(x/.39)**8)
        z+=rounding*lip_mask*.043*exp(-((y-lip_y)/.034)**2)
        z+=rounding*lip_mask*.028*exp(-((y+1.701-.02*(x/.34)**2)/.035)**2)
        z+=rounding*.045*exp(-((abs(x)-.39)/.125)**2-((y+1.735)/.115)**2)
    else:
        z-=rounding*(profile(y,BELLY)*axial+.033*fin_field)
        z-=rounding*.012*exp(-((abs(x)-.40)/.4)**2-((y+.6)/.7)**2)
        # The lower jaw has a short chin, which rounds into the preoral apron.
        z-=rounding*.024*exp(-(x/.43)**4-((y+1.78)/.15)**4)
    return z

def row_y(i):
    # Concentrate rows around the snout/aperture; tail has equal arc resolution.
    if i<=16: return YMIN+(.15)*i/16
    if i<=40: return -1.83+.30*(i-16)/24
    return -1.53+(YMAX+1.53)*(i-40)/(NY-40)

def skin_point(i,j,dorsal):
    y=row_y(i); u=-1+2*j/NX
    if i in (0,NY): return (axis(y)[0],y,axis(y)[1])
    if dorsal:
        a=u/MOUTH_U; b=(y-MOUTH_Y)/MOUTH_HY
        r=max(abs(a),abs(b)); angle=atan2(b,a)
        if 0<r<2:
            blend=1-smooth(1,2,r)
            # Round the rectangular topology into a broad crescent aperture.
            u=MOUTH_U*(a*(1-blend)+r*cos(angle)*blend)
            yy=MOUTH_HY*(b*(1-blend)+.28*r*sin(angle)*blend)
            y=MOUTH_Y+yy+(APERTURE_Y-MOUTH_Y)*blend+.014*cos(angle)**2*blend
    x=profile(y,WIDTH)*sin(u*pi/2)
    z=skin(x,y,dorsal)
    return (x+axis(y)[0],y,z)

def make_mesh():
    vertices=[]; faces=[]; materials=[]; regions=[]; lookup={}
    def vert(p,region):
        key=tuple(round(c,10) for c in p)
        if key in lookup: return lookup[key]
        n=len(vertices); lookup[key]=n;vertices.append(p);regions.append(region);return n
    def face(ids,mat=0):
        ids=list(dict.fromkeys(ids))
        if len(ids)>=3: faces.append(tuple(ids));materials.append(mat)
    grids=[]
    for dorsal in (True,False):
        rows=[]
        for i in range(NY+1):
            row=[]
            for j in range(NX+1):
                # Do not leave disconnected unused vertices inside the mouth.
                if dorsal and MOUTH_I0<i<MOUTH_I1 and MOUTH_J0<j<MOUTH_J1:
                    row.append(None);continue
                p=skin_point(i,j,dorsal)
                region='dorsal' if dorsal else 'ventral'
                row.append(vert(p,region))
            rows.append(row)
        for i in range(NY):
            for j in range(NX):
                if dorsal and MOUTH_I0<=i<MOUTH_I1 and MOUTH_J0<=j<MOUTH_J1: continue
                ids=[rows[i][j],rows[i][j+1],rows[i+1][j+1],rows[i+1][j]]
                face(ids if dorsal else ids[::-1])
        grids.append(rows)
    top=grids[0];rim=[]
    for j in range(MOUTH_J0,MOUTH_J1): rim.append(top[MOUTH_I0][j])
    for i in range(MOUTH_I0,MOUTH_I1): rim.append(top[i][MOUTH_J1])
    for j in range(MOUTH_J1,MOUTH_J0,-1): rim.append(top[MOUTH_I1][j])
    for i in range(MOUTH_I1,MOUTH_I0,-1): rim.append(top[i][MOUTH_J0])
    oral=[rim];n=len(rim)
    for k in range(1,25):
        t=k/25; f=(1-t)**.72; row=[]
        for index in rim:
            x,y,z=vertices[index]
            # Recessed bowl curls posteriorly into an internal blind throat.
            p=(x*f,APERTURE_Y+(y-APERTURE_Y)*f+.15*t*t,
               z*(1-t)+.025*t-.034*sin(pi*t))
            row.append(vert(p,'oral'))
        for j in range(n): face((oral[-1][j],oral[-1][(j+1)%n],row[(j+1)%n],row[j]),0 if k<=3 else 1)
        oral.append(row)
    pole=vert((0,APERTURE_Y+.15,.025),'oral')
    for j in range(n): face((oral[-1][j],oral[-1][(j+1)%n],pole),1)
    return vertices,faces,materials,regions,{'rim':rim,'oral_rings':oral}

def eye_specs():
    eyes=[]
    for s in (-1,1):
        x=s*.55;y=-1.30;z=skin(x,y)-.054
        eyes.append({'side':'L' if s>0 else 'R','center':(x,y,z),
                     'radii':(.105,.121,.087)})
    return eyes

# Fixed views in world space: no pose/geometry edits between renders.
VIEWS=[
    ('threequarter',(7,-7.8,6.4),(0,.70,.10),7.0),
    ('dorsal',(0,1.05,12),(0,1.05,0),7.8),
    ('front',(0,-10,.30),(0,-.35,.16),4.55),
    ('side',(10,.95,.20),(0,.95,.14),6.9),
    ('rear_oblique',(6.8,7,3.8),(0,.60,.12),7.0),
    ('ventral',(0,1.05,-12),(0,1.05,0),7.8),
    ('cranial',(2.1,-3.9,3.0),(0,-1.28,.25),2.7),
    ('oral',(1.0,-2.9,2.1),(0,-1.66,.19),1.45),
]
