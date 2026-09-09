"""Frozen Odaraia clay authoring source. Execute only through HASHED_HANDOFF.md.
New anatomy, no import/use of shared creature builder. No rig, GLB, public assets.
Coordinates: game forward +Z, world up +Y, anatomical ventral +Y (inverted swim).
"""
import bpy, bmesh, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi

ROOT = Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework')
OUT = ROOT / 'clay01'
if OUT.exists():
    raise RuntimeError('clay01 already exists: never overwrite a candidate. Return to Astra.')
OUT.mkdir(parents=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SCENE = bpy.context.scene
SCENE.render.engine = 'CYCLES'
SCENE.cycles.samples = 32
SCENE.cycles.use_denoising = True
SCENE.render.resolution_x = 1600
SCENE.render.resolution_y = 1200
SCENE.render.resolution_percentage = 100
SCENE.render.image_settings.file_format = 'PNG'
SCENE.render.film_transparent = False
SCENE.world.color = (.16, .16, .16)
SCENE.view_settings.view_transform = 'AgX'
MODEL=[]

def material(name, colour, roughness=.65):
    m=bpy.data.materials.new(name);m.diffuse_color=(*colour,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*colour,1)
    p.inputs['Roughness'].default_value=roughness
    return m
BODY=material('Clay | warm body',(.39,.32,.265))
SHELL=material('Clay | rigid pale shell',(.60,.57,.50))
LIMB=material('Clay | appendage',(.44,.36,.28))
FILTER=material('Clay | filtering branches',(.30,.26,.21))
EYE=material('Clay | compound eye',(.13,.17,.18),.38)
MOUTH=material('Clay | mouthpart',(.34,.285,.23))

class Mesh:
    def __init__(self):self.v=[];self.f=[]
    def add(self,vs,fs):
        offset=len(self.v);self.v.extend([tuple(v) for v in vs]);self.f.extend([tuple(i+offset for i in f) for f in fs])
    def obj(self,name,mat):
        me=bpy.data.meshes.new(name);me.from_pydata(self.v,[],self.f);me.update()
        bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
        ob=bpy.data.objects.new(name,me);SCENE.collection.objects.link(ob);ob.data.materials.append(mat)
        for p in me.polygons:p.use_smooth=True
        MODEL.append(ob);return ob

def tube(dst,points,radii,sides=10,flatten=1):
    """Continuous capped loft; no sphere-chain joints, no collapsed endpoint rings."""
    p=[Vector(x) for x in points];v=[];f=[]
    for i,c in enumerate(p):
        tangent=(p[min(i+1,len(p)-1)]-p[max(0,i-1)]).normalized()
        axis=Vector((0,0,1))
        if abs(tangent.dot(axis))>.92:axis=Vector((1,0,0))
        a=tangent.cross(axis).normalized();b=tangent.cross(a).normalized()
        for j in range(sides):
            q=2*pi*j/sides;v.append(c+radii[i]*(cos(q)*a+sin(q)*flatten*b))
    for i in range(len(p)-1):
        for j in range(sides):
            n=(j+1)%sides;f.append((i*sides+j,i*sides+n,(i+1)*sides+n,(i+1)*sides+j))
    # Non-degenerate flat cap fans.
    first=len(v);v.append(p[0]);last=len(v);v.append(p[-1])
    for j in range(sides):
        n=(j+1)%sides;f.extend([(first,n,j),(last,(len(p)-1)*sides+j,(len(p)-1)*sides+n)])
    dst.add(v,f)

def bezier(a,b,c,d,t):
    return (1-t)**3*Vector(a)+3*t*(1-t)**2*Vector(b)+3*t*t*(1-t)*Vector(c)+t**3*Vector(d)

def ellipsoid(dst,centre,scale,rings=16,sides=28,warp=0):
    """Pole-safe closed organic radial patch, with shoulder/face warp if requested."""
    c=Vector(centre);v=[c+Vector((0,scale[1],0))];f=[]
    for i in range(1,rings):
        theta=pi*i/rings
        for j in range(sides):
            a=2*pi*j/sides
            x=scale[0]*sin(theta)*cos(a);z=scale[2]*sin(theta)*sin(a)
            y=scale[1]*cos(theta)
            x*=1+warp*.14*sin(a)*sin(theta)**2
            y+=warp*.045*cos(2*a)*sin(theta)**2
            v.append(c+Vector((x,y,z)))
    bottom=len(v);v.append(c-Vector((0,scale[1],0)))
    for j in range(sides):f.append((0,1+j,1+(j+1)%sides))
    for i in range(rings-2):
        for j in range(sides):
            a=1+i*sides+j;b=1+i*sides+(j+1)%sides
            f.append((a,b,b+sides,a+sides))
    for j in range(sides):f.append((bottom,1+(rings-2)*sides+(j+1)%sides,1+(rings-2)*sides+j))
    dst.add(v,f)

def leaf(dst,points,widths,thickness,side_axis=(0,0,1),sides=12):
    # Organic closed hydrofoil loft; rounded tiny terminal ring avoids degenerate pole quads.
    p=[Vector(q) for q in points];axis=Vector(side_axis).normalized();v=[];f=[]
    for i,c in enumerate(p):
        tangent=(p[min(i+1,len(p)-1)]-p[max(0,i-1)]).normalized()
        a=(axis-axis.dot(tangent)*tangent).normalized();b=tangent.cross(a).normalized()
        for j in range(sides):
            q=2*pi*j/sides;v.append(c+widths[i]*cos(q)*a+thickness[i]*sin(q)*b)
    for i in range(len(p)-1):
        for j in range(sides):f.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    cap0=len(v);v.append(p[0]);cap1=len(v);v.append(p[-1])
    for j in range(sides):f.extend([(cap0,(j+1)%sides,j),(cap1,(len(p)-1)*sides+j,(len(p)-1)*sides+(j+1)%sides)])
    dst.add(v,f)

# Continuous segmented trunk. Shallow ridges define tergites without bead assembly.
trunk=Mesh();v=[];f=[];NR=32*8+1;NS=32
for k in range(NR):
    t=k/(NR-1);z=1.52-3.67*t
    r=.24*(1-.59*t)+.025*sin(pi*t)
    ridge=1+.075*cos(2*pi*32*t)-.025*cos(4*pi*32*t)
    cy=.015+.025*sin(pi*t)-.065*t*t
    for j in range(NS):
        a=2*pi*j/NS
        # Low sculpted pleural shoulders; ventral face flatter than dorsal.
        x=r*ridge*sin(a)*(1+.10*cos(a));y=cy-r*.84*ridge*cos(a)
        v.append((x,y,z))
for k in range(NR-1):
    for j in range(NS):f.append((k*NS+j,k*NS+(j+1)%NS,(k+1)*NS+(j+1)%NS,(k+1)*NS+j))
for row,z in [(0,1.52),(NR-1,-2.15)]:
    c=len(v);v.append((0,.015-.065*(row/(NR-1))**2,z))
    for j in range(NS):f.append((c,row*NS+j,row*NS+(j+1)%NS))
trunk.add(v,f);trunk.obj('Trunk | 32 integrated tergal segments',BODY)

# One continuous thick shell, open at both ends and at the longitudinal ventral channel.
def shell_mesh(half=False):
    dst=Mesh();v=[];f=[];NZ=64;NA=72 if not half else 36
    for layer in range(2):
        for k in range(NZ+1):
            t=k/NZ;limit=2.12+.19*sin(pi*t)-.09*t
            for j in range(NA+1):
                fraction=j/NA
                theta=(-limit+2*limit*fraction) if not half else (-limit+limit*fraction)
                edge=abs(theta)/limit
                front=1.80+.24*edge**2+.08*cos(theta)
                rear=-1.39+.43*edge**2
                z=rear*(1-t)+front*t
                w=.38+.50*sin(pi*t)**.78+.15*t
                h=.43+.19*sin(pi*t)+.08*t
                # Low broad growth relief molded into the surface, not painted ribs.
                relief=.006*sin(13*pi*t+1.7*cos(theta))*sin(pi*t)**2
                rim=.015*math.exp(-((1-edge)/.05)**2)
                thick=.021+.016*edge**8+.008*(sin(pi*t)**2)
                inset=thick if layer else 0
                x=(w+relief+rim-inset)*sin(theta)
                y=-.025-(h+relief+rim-inset)*cos(theta)
                v.append((x,y,z))
    STR=NA+1;L=(NZ+1)*STR
    for k in range(NZ):
        for j in range(NA):
            a=k*STR+j;b=a+1;c=b+STR;d=a+STR
            f.append((a,b,c,d));f.append((L+d,L+c,L+b,L+a))
    # Both end apertures and both free ventral margins have thickness, no end discs.
    for k in [0,NZ]:
        for j in range(NA):
            a=k*STR+j;b=a+1;f.append((a,L+a,L+b,b))
    for j in [0,NA]:
        for k in range(NZ):
            a=k*STR+j;b=a+STR;f.append((a,b,L+b,L+a))
    dst.add(v,f);return dst
coat=shell_mesh().obj('Carapace | continuous rigid valve fields',SHELL)
cutaway=shell_mesh(True).obj('Study only | anatomical half shell',SHELL)
cutaway.hide_render=True;cutaway.hide_viewport=True

head=Mesh();ellipsoid(head,(0,.005,1.78),(.345,.27,.43),20,36,1)
head.obj('Head | sculpted ocular and mouth volume',BODY)
# Short eye peduncles widening into seats; globes overlap the cup by ~0.10 units.
for s,label in [(-1,'L'),(1,'R')]:
    eye_c=Vector((s*.50,-.035,2.205))
    support=Mesh();path=[(s*.22,-.045,1.96),(s*.32,-.040,2.03),(s*.41,-.035,2.11),(s*.45,-.035,2.15)]
    tube(support,path,[.112,.108,.147,.184],20)
    support.obj(f'Eye {label} | peduncle and widened globe seat',BODY)
    globe=Mesh();ellipsoid(globe,eye_c,(.22,.205,.23),24,36,.0)
    globe.obj(f'Eye {label} | embedded compound globe',EYE)
# Conservative three small dorsal sensory organs, not a new ocular plate boundary.
sens=Mesh()
for x in [-.077,0,.077]:ellipsoid(sens,(x,-.245,2.015),(.035,.022,.037),8,12)
sens.obj('Head | three small dorsal sensory organs tentative',BODY)

# Triangular curved hypostome/labrum and medial toothed mandibles.
hyp=Mesh();leaf(hyp,[(0,.216,2.075),(0,.265,1.98),(0,.285,1.85),(0,.25,1.80)],[.017,.12,.255,.20],[.024,.04,.036,.018],(1,0,0),20)
hyp.obj('Mouth | curved triangular hypostome labrum',MOUTH)
for s,label in [(-1,'L'),(1,'R')]:
    jaw=Mesh();ellipsoid(jaw,(s*.14,.25,1.68),(.15,.085,.128),12,20,.7)
    # Six medial teeth and a larger incisor; all root into jaw flesh.
    for q in range(7):
        z=1.595+q*.026;length=.040+(.025 if q==6 else .004*sin(q))
        tube(jaw,[(s*.07,.29,z),(s*(.07-length),.298,z+.009)],[.018,.0025],6)
    jaw.obj(f'Mouth {label} | mandible seven tooth medial edge',MOUTH)
    lob=Mesh();ellipsoid(lob,(s*.094,.208,1.49),(.087,.029,.051),8,14)
    lob.obj(f'Mouth {label} | tentative posterior lobe',MOUTH)
    mx=Mesh();pts=[bezier((s*.21,.15,1.52),(s*.36,.27,1.53),(s*.30,.39,1.72),(s*.19,.35,1.82),q/16) for q in range(17)]
    tube(mx,pts,[.027*(1-.55*q/16) for q in range(17)],8)
    for q in range(8):
        a=pts[-1];b=a+Vector((s*(q-3.5)*.011,.063,.028+q*.006))
        tube(mx,[a,b],[.004,.0009],5)
    mx.obj(f'Mouth {label} | tentative maxillary brush',MOUTH)
ct=Mesh()
for x,z in [(0,1.76),(-.035,1.59),(.035,1.59),(0,1.62)]:tube(ct,[(0,.27,1.68),(x,.32,z)],[.022,.002],8)
ct.obj('Mouth | small central tooth',MOUTH)

# Each of 32 segments carries paired biramous limbs. Continuous curved endopod shafts
# expose 20 differentiated intervals, with short proximal podomeres and a distal pad.
LIMB_METADATA=[]
for i in range(32):
    t=i/31;z=1.40-3.47*t;body_r=.24*(1-.59*t)+.025*sin(pi*t)
    reach=(1.06-.48*t)*(1.07 if i<5 else 1)
    phase=.055*sin(i*.72)
    for s,label in [(-1,'L'),(1,'R')]:
        root=Vector((s*body_r*.79,.105-.075*t,z))
        # Front limbs lean toward +Z; posterior limbs follow the body taper.
        a=root;b=root+Vector((s*.07,reach*.38,-.035))
        c=Vector((s*(.39-.11*t),reach*.83,z+.08+phase))
        d=Vector((s*(.235-.045*t),reach,z+.27+phase))
        bounds=[(q/20)**1.22 for q in range(21)]
        pts=[];rads=[]
        for q in range(20):
            for frac in [0,.30,.70]:
                u=bounds[q]*(1-frac)+bounds[q+1]*frac
                pts.append(bezier(a,b,c,d,u))
                # Collars are integrated in the shaft, not disconnected beads.
                collar=.80 if frac==0 else 1.0
                rads.append((.027*(1-.63*u))*(1-.27*t)*collar)
        pts.append(Vector(d));rads.append(.008*(1-.25*t))
        end=Mesh();tube(end,pts,rads,8);end.obj(f'Limb {i+1:02d}{label} | 20 podomere endopod',LIMB)
        # Ovate paddle, shorter proximal exposure and near equal length as endopod.
        ex=Mesh();ep=[];ew=[];et=[]
        for q in range(17):
            u=q/16
            ep.append(bezier(root,root+Vector((s*.12,reach*.28,-.055)),(s*(.46-.12*t),reach*.8,z-.045),(s*(.405-.1*t),reach*1.02,z+.015),u))
            ew.append(.007+(.068-.022*t)*sin(pi*u)**.78)
            et.append(.004+(.008-.003*t)*sin(pi*u))
        leaf(ex,ep,ew,et,(0,0,1),10)
        tube(ex,ep,[.011*(1-.65*q/16) for q in range(17)],6)
        # Lamellae on exposed paddle surface.
        for q in range(2,15):
            center=ep[q]+Vector((s*.011,0,0));w=ew[q]*.91
            tube(ex,[center+Vector((0,-.012,-w)),center,center+Vector((0,.012,w))],[.002,.003,.002],5)
        ex.obj(f'Limb {i+1:02d}{label} | ovate rod and lamellate exopod',LIMB)
        filt=Mesh()
        for q in range(4,20):
            u=(bounds[q]+bounds[q+1])*.5;p=bezier(a,b,c,d,u)
            # Endites face toward the median filtering basket. Four longer spines
            # are resolved in clay; tiny endite-surface setules reserved for production.
            base=p+Vector((-s*.019,0,0))
            tube(filt,[p,base],[.014*(1-.3*u),.010*(1-.3*u)],6)
            for direction in [-1,1]:
                for layer in [0,1]:
                    length=(.064+.026*sin(pi*u))*(1-.35*t)*(1 if layer==0 else .68)
                    tip=base+Vector((-s*length,.024+layer*.017,direction*length*.7))
                    tube(filt,[base,(base+tip)*.5+Vector((0,.009,0)),tip],[.0045,.0028,.0008],5)
        filt.obj(f'Limb {i+1:02d}{label} | spinose filtering endites',FILTER)
        LIMB_METADATA.append({'segment':i+1,'side':label,'root':list(root),'tip':list(d),'podomeres':20})

terminal=Mesh();tube(terminal,[(0,-.05,-2.09),(0,-.058,-2.25),(0,-.072,-2.48),(0,-.08,-2.62)],[.115,.108,.085,.065],20,.8)
terminal.obj('Tail | elongated continuous terminal segment',BODY)
for s,label in [(-1,'L'),(1,'R')]:
    fin=Mesh();p=[];w=[];h=[]
    for q in range(21):
        u=q/20;p.append(bezier((s*.04,-.08,-2.48),(s*.38,-.11,-2.62),(s*.79,-.09,-2.76),(s*.94,-.08,-3.05),u))
        w.append(.016+.19*sin(pi*u)**.8);h.append(.008+.024*sin(pi*u))
    leaf(fin,p,w,h,(0,0,1),16);fin.obj(f'Tail | lateral caudal blade {label}',BODY)
fin=Mesh();p=[];w=[];h=[]
for q in range(21):
    u=q/20;p.append(bezier((0,-.07,-2.49),(0,-.36,-2.62),(0,-.76,-2.65),(0,-.98,-2.99),u))
    w.append(.012+.16*sin(pi*u)**.8);h.append(.006+.024*sin(pi*u))
leaf(fin,p,w,h,(0,0,1),16);fin.obj('Tail | dorsal blade downward in inverted swim',BODY)

# Bounded source hygiene audit. Does not certify visual quality or inter-object clearance.
def audit():
    report={'orientation':{'forward':'+Z','worldUp':'+Y','anatomicalVentral':'+Y'},'trunkSegments':32,'pairedBiramousLimbs':32,'limbs':LIMB_METADATA,'objects':[],'errors':[]}
    for ob in MODEL:
        me=ob.data;bm=bmesh.new();bm.from_mesh(me)
        degenerate=sum(1 for f in bm.faces if f.calc_area()<1e-12)
        boundary=sum(1 for e in bm.edges if len(e.link_faces)!=2)
        finite=all(math.isfinite(c) for v in me.vertices for c in v.co)
        positive=all(c>0 for c in ob.scale)
        row={'name':ob.name,'vertices':len(me.vertices),'faces':len(me.polygons),'degenerateFaces':degenerate,'nonTwoFaceEdges':boundary,'finite':finite,'positiveScale':positive}
        report['objects'].append(row);bm.free()
        if degenerate or boundary or not finite or not positive:report['errors'].append(row)
    report['status']='PASS' if not report['errors'] else 'FAIL'
    report['scope']='Closed surface incidence, nonzero face area, finite coordinates, positive scales. Not inter-object collisions or visual acceptance.'
    (OUT/'geometry-report.json').write_text(json.dumps(report,indent=2))
    if report['errors']:raise RuntimeError('Bounded geometry hygiene failed; return report to Astra. Do not repair in execution.')
    return report
report=audit()

# Studio background, deliberate game-up camera basis (Blender scene geometry remains +Y up).
world=bpy.data.worlds.new('Clay studio world');SCENE.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.095,.115,.14,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.45

def aim(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
def light(name,location,power,size):
    data=bpy.data.lights.new(name,'AREA');ob=bpy.data.objects.new(name,data);SCENE.collection.objects.link(ob);ob.location=location;data.energy=power;data.shape='DISK';data.size=size;aim(ob,(0,.2,-.3))
light('Key softbox',(4,6,5),1050,5)
light('Fill softbox',(-5,2,1),700,4)
light('Tail rim',(1,2,-5),1150,3)
light('Lower bounce',(-2,-4,-1),450,4)
data=bpy.data.cameras.new('Review camera');camera=bpy.data.objects.new('Review camera',data);SCENE.collection.objects.link(camera);SCENE.camera=camera;data.type='ORTHO';data.lens=55
VIEWS=[
 ('01-inverted-oblique',(6.4,4.5,7.3),(0,.08,-.35),6.4,False),
 ('02-inverted-side',(8.5,1.15,.1),(0,.14,-.39),6.0,False),
 ('03-inverted-front',(0,1.7,9),(0,.12,-.25),3.65,False),
 ('04-dorsal-underside',(-4.2,-6.2,5.7),(0,-.10,-.37),6.0,False),
 ('05-half-shell-cutaway',(6.2,4.4,6.8),(0,.16,-.30),6.0,True),
 ('06-appendage-head-closeup',(4.5,3.8,4.8),(0,.43,1.30),2.75,True),
]
# Save editable candidate in normal inverted oblique setup, all full shell geometry intact.
name,pos,target,scale,cut=VIEWS[0];camera.location=pos;aim(camera,target);data.ortho_scale=scale
SCENE['odaraia_stage']='clay01, UNREVIEWED, no rig/material/export approval'
SCENE['odaraia_forward']='+Z';SCENE['odaraia_up']='+Y';SCENE['odaraia_ventral']='+Y'
SCENE['odaraia_source_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'odaraia-clay01.blend'))
for name,pos,target,scale,cut in VIEWS:
    coat.hide_render=cut;cutaway.hide_render=not cut
    camera.location=pos;aim(camera,target);data.ortho_scale=scale
    SCENE.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
coat.hide_render=False;cutaway.hide_render=True
name,pos,target,scale,cut=VIEWS[0];camera.location=pos;aim(camera,target);data.ortho_scale=scale
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'odaraia-clay01.blend'))
outputs=[]
for p in sorted(OUT.iterdir()):
    if p.is_file():outputs.append({'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(OUT/'output-manifest.json').write_text(json.dumps({'status':'REVIEW NEEDED','sourceSha256':SCENE['odaraia_source_sha256'],'outputs':outputs},indent=2))
print('ODARAIA_CLAY01_SOURCE_HYGIENE_PASS; SIX_VIEWS_RENDERED; ASTRA_VISUAL_REVIEW_REQUIRED')
