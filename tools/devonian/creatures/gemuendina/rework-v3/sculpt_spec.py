"""New Gemuendina clay: pure shape specification, independent of Blender/V2.

Coordinates: +Y posterior, +Z dorsal, X paired. Units are authoring units.
This living thickness/soft silhouette is a reconstruction, not a fossil trace.
"""
from math import sin, cos, pi, exp, sqrt, atan2

VERSION = 'gemuendina-rework-v3-clay-01'
NY, NX = 272, 160
YMIN, YMAX = -1.98, 4.08
MOUTH_Y, MOUTH_HY, MOUTH_U = -1.68, .15, .35
MOUTH_I0, MOUTH_I1 = 16, 40
MOUTH_J0, MOUTH_J1 = 52, 108

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

WIDTH = [(-1.98,0),(-1.955,.19),(-1.90,.42),(-1.80,.66),(-1.64,.83),
         (-1.40,.98),(-1.14,1.13),(-.88,1.40),(-.52,1.70),(-.15,1.84),
         (.20,1.87),(.49,1.77),(.73,1.55),(.94,1.16),(1.10,.58),
         (1.22,.36),(1.34,.49),(1.51,.58),(1.64,.46),(1.78,.245),
         (2.12,.175),(2.58,.111),(3.10,.061),(3.62,.027),(4.08,0)]
CORE = [(-1.98,.12),(-1.85,.46),(-1.55,.79),(-1.20,.91),(-.80,.88),
        (-.30,.72),(.30,.53),(.90,.35),(1.45,.245),(1.85,.20),
        (2.60,.125),(3.3,.070),(4.08,.015)]
CROWN = [(-1.98,0),(-1.91,.095),(-1.78,.255),(-1.54,.41),(-1.18,.49),
         (-.76,.47),(-.20,.39),(.40,.29),(1.0,.20),(1.5,.145),
         (2.12,.115),(2.7,.078),(3.4,.039),(4.08,0)]
BELLY = [(-1.98,0),(-1.90,.048),(-1.60,.13),(-1.0,.185),(-.25,.18),
         (.5,.143),(1.4,.105),(2.1,.089),(2.7,.063),(3.4,.036),(4.08,0)]

def smooth(a,b,x):
    t=max(0.,min(1.,(x-a)/(b-a))); return t*t*(3-2*t)

def axis(y):
    # Mild living S-line begins in the posterior; root stays centered.
    t=smooth(1.30,4.08,y)
    return .16*t*sin((y-1.3)*1.9), .018+.065*t*sin((y-1.30)*1.15)

def skin(x, y, dorsal=True):
    width=max(1e-8,profile(y,WIDTH)); core=profile(y,CORE)
    u=min(1.,abs(x)/width); rounding=sqrt(max(0.,1-u*u))
    wing=smooth(1.10,2.35,width/max(.02,core))
    outer=smooth(.50,.96,u)
    camber=wing*outer*(.045*sin((y+.9)*2.35)+.014*cos((y+.4)*4.8))
    # A broad continuous cranial vault, not a separate eye pad or head object.
    axial=exp(-.85*(abs(x)/max(.02,core))**2.65)
    z=axis(y)[1]+camber
    if dorsal:
        z+=rounding*(profile(y,CROWN)*axial+.046*wing)
        # Cheeks widen around the orbit and run backward into the shoulder.
        z+=rounding*.065*exp(-((abs(x)-.52)/.25)**2-((y+1.15)/.42)**2)
        # Broad postorbital crest and medial saddle remain low relief.
        z+=rounding*.020*exp(-((abs(x)-.67)/.26)**2-((y+.65)/.43)**2)
        z-=rounding*.015*exp(-(x/.23)**2-((y+1.10)/.34)**2)
        # Natural swept shoulder contour is mass, never external fin spokes.
        ridge_x=core*.96+.18*smooth(-.7,.8,y)
        z+=rounding*wing*.035*exp(-((abs(x)-ridge_x)/.34)**2-((y+.15)/.85)**2)
        z+=rounding*wing*.004*sin(15*y+5*u)*outer*(1-outer)
    else:
        z-=rounding*(profile(y,BELLY)*axial+.026*wing)
        z-=rounding*.012*exp(-((abs(x)-.40)/.4)**2-((y+.6)/.7)**2)
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
            yy=MOUTH_HY*(b*(1-blend)+.76*r*sin(angle)*blend)
            y=MOUTH_Y+yy+.020*cos(angle)**2*blend
    x=profile(y,WIDTH)*sin(u*pi/2)
    z=skin(x,y,dorsal)
    if dorsal:
        # Integrated preoral roll; feather into true cranial volume.
        edge=sqrt(max(0,1-(x/max(1e-8,profile(y,WIDTH)))**2))
        z+=edge*.024*exp(-(x/.46)**4-((y+1.818)/.058)**2)
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
            p=(x*f,MOUTH_Y+(y-MOUTH_Y)*f+.12*t*t,
               z*(1-t)+.024*t-.055*sin(pi*t))
            row.append(vert(p,'oral'))
        for j in range(n): face((oral[-1][j],oral[-1][(j+1)%n],row[(j+1)%n],row[j]),1)
        oral.append(row)
    pole=vert((0,MOUTH_Y+.12,.024),'oral')
    for j in range(n): face((oral[-1][j],oral[-1][(j+1)%n],pole),1)
    return vertices,faces,materials,regions,{'rim':rim,'oral_rings':oral}

def eye_specs():
    eyes=[]
    for s in (-1,1):
        x=s*.55;y=-1.22;z=skin(x,y)-.047
        eyes.append({'side':'L' if s>0 else 'R','center':(x,y,z),
                     'radii':(.112,.132,.091)})
    return eyes

# Fixed views in world space: no pose/geometry edits between renders.
VIEWS=[
    ('threequarter',(7,-7.8,6.4),(0,.70,.10),7.0),
    ('dorsal',(0,.90,12),(0,.90,0),7.0),
    ('front',(0,-10,.30),(0,-.35,.16),4.55),
    ('side',(10,.95,.20),(0,.95,.14),6.9),
    ('rear_oblique',(6.8,7,3.8),(0,.60,.12),7.0),
    ('ventral',(0,.90,-12),(0,.90,0),7.0),
    ('cranial',(2.1,-3.9,3.0),(0,-1.28,.25),2.7),
    ('oral',(1.0,-2.9,2.1),(0,-1.66,.19),1.45),
]
