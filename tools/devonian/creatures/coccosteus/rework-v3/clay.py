"""Coccosteus V3 clay-01: authored anatomy, no export/publish or texture generation.
Frozen CPU execution has three independent stages: build, render-new, render-old.
Axes: X transverse; Y posterior; Z dorsal. Units are authoring units, not metres.
The OLD source is read only and never saved. All generated files live in OUT.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
LOCAL = REPO.parent / 'devonian-authoring'
OUT = LOCAL / 'coccosteus/rework-v3/clay-01'
OLD = LOCAL / 'backups/coccosteus-pre-rework-2026-09-07/blender/coccosteus-v2.blend'
VIEWS = HERE / 'views.json'
SCRIPT = Path(__file__).resolve()
BLEND = OUT / 'coccosteus-clay-01.blend'
SCULPT = []


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fresh(path):
    if path.exists():
        raise RuntimeError('Refusing to overwrite frozen evidence: ' + str(path))


def material(name, value, roughness=.66):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*value, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*value, 1)
    bs.inputs['Roughness'].default_value = roughness
    return m


def mesh(name, vertices, faces, mat, motion=None, indices=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(vertices, [], faces)
    me.update()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    if indices is not None:
        me.materials.append(ORAL)
        for p, idx in zip(me.polygons, indices):
            p.material_index = idx
    if motion:
        ob.shape_key_add(name='Basis')
        key = ob.shape_key_add(name='GapeStudy')
        for i, co in enumerate(vertices):
            key.data[i].co = motion(Vector(co), i)
    SCULPT.append(ob)
    return ob


def smooth(x):
    x = max(0.0, min(1.0, x))
    return x*x*(3-2*x)


def pchip(rows, y):
    """Monotone, non-oscillating axial interpolation: no washboard overshoot."""
    x = [r[0] for r in rows]
    i = next((i for i in range(len(x)-1) if y <= x[i+1]), len(x)-2)
    y = max(x[0], min(x[-1], y))
    h = x[i+1]-x[i]
    t = (y-x[i])/h
    vals = [y]
    for c in range(1, len(rows[0])):
        d = [(rows[k+1][c]-rows[k][c])/(x[k+1]-x[k]) for k in range(len(x)-1)]
        def slope(k):
            if k == 0:
                return d[0]
            if k == len(x)-1:
                return d[-1]
            if d[k-1]*d[k] <= 0:
                return 0.0
            a, b = x[k]-x[k-1], x[k+1]-x[k]
            w1, w2 = 2*b+a, b+2*a
            return (w1+w2)/(w1/d[k-1]+w2/d[k])
        vals.append((2*t**3-3*t*t+1)*rows[i][c] + (t**3-2*t*t+t)*h*slope(i)
                    + (-2*t**3+3*t*t)*rows[i+1][c] + (t**3-t*t)*h*slope(i+1))
    return vals


def rounded_section(half, samples=8, rounding=.18):
    """Filleted polygon: broad real planes, soft continuous corners, no plate stickers."""
    poly = [Vector(p) for p in half + [(-x,z) for x,z in half[-2:0:-1]]]
    ring = []
    for i, point in enumerate(poly):
        prev, nxt = poly[(i-1)%len(poly)], poly[(i+1)%len(poly)]
        entry, leave = point.lerp(prev, rounding), point.lerp(nxt, rounding)
        for j in range(samples//2):
            t = j/(samples//2)
            ring.append(entry*(1-t)**2 + point*2*t*(1-t) + leave*t*t)
        nextentry = nxt.lerp(point, rounding)
        for j in range(samples//2):
            ring.append(leave.lerp(nextentry, j/(samples//2)))
    return ring


def pose(point, part):
    pivot = Vector((0, -.89, -.205)) if part == 'jaw' else Vector((0, -.85, .245))
    angle = .43 if part == 'jaw' else -.055
    return pivot + Matrix.Rotation(angle, 3, 'X') @ (point-pivot)


# Sloping cranium, broad cheeks and modest muzzle. Topography comes before sutures.
HEAD = [
    (-1.82,.035,.027,-.068,.017), (-1.77,.172,.087,-.066,.041),
    (-1.65,.288,.165,-.087,.088), (-1.45,.374,.263,-.136,.150),
    (-1.23,.425,.352,-.205,.204), (-1.02,.444,.411,-.248,.220),
    (-.865,.422,.393,-.235,.195)]


def head_section(y):
    _,w,t,l,a = pchip(HEAD,y)
    return [(0,t),(.43*w,t-.014),(.80*w,t-.066),(w,l+.109),
            (.966*w,l),(.67*w,l+a*.70),(0,l+a)]


def cranial_point(y, x, z):
    # Recess orbital transition in the continuous cheek; brow/cheek remain anatomical.
    side = abs(x)
    orbit = math.exp(-((y+1.555)/.142)**2 - ((z-.108)/.107)**2)
    x *= 1-.075*orbit*smooth(side/.28)
    # One broad cheek eminence, no serial bumps or tiny decorative relief.
    cheek = math.exp(-((y+1.30)/.20)**2 - ((z+.083)/.14)**2)
    x += (1 if x>=0 else -1)*.012*cheek*smooth(side/.26)
    return x,y,z


def axial(name, rows, section, mat, n=150, motion=None, transform=None, oral=False, aperture=False):
    verts, faces, ids = [], [], []
    for j in range(n):
        y = rows[0][0]+(rows[-1][0]-rows[0][0])*j/(n-1)
        ring = rounded_section(section(y))
        for q in ring:
            verts.append(transform(y,q.x,q.y) if transform else (q.x,y,q.y))
    count = len(ring)
    for j in range(n-1):
        for k in range(count):
            faces.append((j*count+k,j*count+(k+1)%count,(j+1)*count+(k+1)%count,(j+1)*count+k))
            # Palate is the inside-facing ventral region of this closed cranial tissue.
            ids.append(int(oral and count*4/12 <= k < count*8/12))
    faces.append(tuple((n-1)*count+k for k in range(count)))
    ids.append(0)
    if aperture:
        # An annular anterior shield rim surrounds a real internal passage.
        # No solid thoracic cap is allowed to block the open-jaw study.
        inner = rounded_section([(0,.017),(.16,-.025),(.29,-.076),(.371,-.191),
                                 (.32,-.266),(.18,-.286),(0,-.287)])
        start = len(verts)
        for j in range(30):
            t=j/29
            factor=1-.91*smooth(t)
            for q in inner:
                verts.append((q.x*factor,rows[0][0]+.56*t,-.14+(q.y+.14)*factor))
        for k in range(count):
            faces.append((k,start+k,start+(k+1)%count,(k+1)%count));ids.append(1)
        for j in range(29):
            for k in range(count):
                a=start+j*count+k
                faces.append((a,a+count,start+(j+1)*count+(k+1)%count,start+j*count+(k+1)%count));ids.append(1)
        faces.append(tuple(start+29*count+k for k in range(count)));ids.append(1)
    else:
        faces.append(tuple(range(count-1,-1,-1)));ids.append(0)
    return mesh(name,verts,faces,mat,motion,ids if oral or aperture else None)


# Angular shield posterior edge varies around circumference and curves over soft trunk.
# Each section is a rounded heptagon, not an elliptical fish tube.
SHIELD = [(-.95,.407,.355,-.363),(-.83,.442,.422,-.397),
          (-.59,.477,.444,-.427),(-.27,.469,.436,-.438),
          (.05,.416,.385,-.391),(.18,.381,.354,-.352)]


def shield_section(y):
    _,w,t,b = pchip(SHIELD,y)
    return [(0,t),(.39*w,t-.010),(.78*w,t-.087),(w,t-.258),
            (.98*w,b+.190),(.73*w,b+.040),(0,b)]


def shield_transform(y,x,z):
    # Longer mid-dorsal shield; receding lateral cutaway permits pectoral articulation.
    t = smooth((y+.28)/.46)
    side = abs(x)/max(.001,pchip(SHIELD,y)[1])
    y -= .29*t*math.sin(math.pi*min(1,max(0,(z+.42)/.85)))**2*side
    return x,y,z


BODY = [(-.40,.437,.407,-.416),(-.10,.422,.391,-.403),
        (.20,.381,.353,-.354),(.56,.308,.317,-.257),
        (.94,.234,.307,-.137),(1.30,.164,.325,-.038),
        (1.58,.108,.392,.039),(1.88,.070,.510,.191),
        (2.15,.031,.609,.365),(2.37,.007,.628,.556)]


def body_section(y):
    _,w,t,b = pchip(BODY,y)
    # Dorsal epaxial mass stays shallow; belly carries anterior volume then rises sharply.
    return [(0,t),(.46*w,t-.030),(.85*w,t-(t-b)*.25),(w,b+(t-b)*.49),
            (.88*w,b+(t-b)*.22),(.53*w,b+.024),(0,b)]


JAW = [(-1.811,.028,-.083,.027),(-1.75,.18,-.080,.055),
       (-1.62,.281,-.101,.067),(-1.43,.352,-.151,.063),
       (-1.22,.384,-.219,.051),(-1.025,.327,-.251,.029),(-.91,.17,-.229,.018)]


def jaw_section(y):
    _,w,l,d = pchip(JAW,y)
    return [(0,l-.022),(.60*w,l-.014),(.92*w,l),(w,l-.010),
            (.83*w,l-d),(.44*w,l-d-.009),(0,l-d-.012)]


def shell_fin(name, rows, axis, mat):
    """Chord sections form a thick root and smoothly tapered, cambered free membrane.
    Rows: span coordinate, chord-leading, chord-trailing, height, half-thickness.
    No common fan origin, no radial folded triangles, no flat triangular sheet.
    """
    verts, faces = [], []
    ns,nc = 57,40
    for i in range(ns):
        span,a,b,height,thick = pchip(rows,rows[0][0]+(rows[-1][0]-rows[0][0])*i/(ns-1))
        for k in range(nc):
            theta = 2*math.pi*k/nc
            q = (1-math.cos(theta))/2
            chord = a+(b-a)*q
            camber = .023*math.sin(math.pi*q)*(1-i/(ns-1))
            if axis == 'x':
                point = (span,chord,height+camber+thick*math.sin(theta))
            else:
                point = (thick*math.sin(theta),span,chord)
            verts.append(point)
    for i in range(ns-1):
        for k in range(nc):
            a=i*nc+k
            faces.append((a,i*nc+(k+1)%nc,(i+1)*nc+(k+1)%nc,a+nc))
    faces.extend([tuple(range(nc-1,-1,-1)),tuple((ns-1)*nc+k for k in range(nc))])
    return mesh(name,verts,faces,mat)


def build():
    global CLAY, ORAL, EYE
    OUT.mkdir(parents=True,exist_ok=True)
    fresh(BLEND)
    fresh(OUT/'build-report.json')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    CLAY=material('Unpatterned warm grey clay',(.40,.385,.355))
    ORAL=material('Neutral oral lining',(.105,.097,.093),.76)
    EYE=material('Neutral dark eye',(.043,.040,.035),.38)
    axial('Cranium | integrated cheek roof and real palate',HEAD,head_section,CLAY,
          motion=lambda p,i:pose(p,'skull'),transform=cranial_point,oral=True)
    axial('Thoracic shield | dorsal and lateral planes',SHIELD,shield_section,CLAY,
          transform=shield_transform,aperture=True)
    axial('Muscular abdomen | compressed rising peduncle',BODY,body_section,CLAY,n=190)
    jaw=axial('Mandible | slender articulated cup',JAW,jaw_section,CLAY,n=120,
              motion=lambda p,i:pose(p,'jaw'))
    jaw.data.materials.append(ORAL)
    # Jaw central dorsal floor is real geometry; rim and underside stay clay.
    for p in jaw.data.polygons:
        c=p.center
        if len(p.vertices)==4:
            v=sum((jaw.data.vertices[k].co for k in p.vertices),Vector())/4
            _,w,l,d=pchip(JAW,v.y)
            if abs(v.x)<w*.88 and v.z>l-.032:p.material_index=1
    # Continuous soft oral sleeve: anterior aperture remains genuinely open.
    verts,faces,weights=[],[],[]
    nr,na=76,80
    for j in range(nr):
        y=-1.59+1.12*j/(nr-1)
        back=smooth((y+.94)/.47)
        hy=max(HEAD[0][0],min(HEAD[-1][0],y))
        jy=max(JAW[0][0],min(JAW[-1][0],y))
        _,hw,ht,hl,ha=pchip(HEAD,hy)
        _,jw,jl,jd=pchip(JAW,jy)
        for k in range(na):
            a=2*math.pi*k/na
            upper=math.sin(a)>=0
            w=hw*.955 if upper else jw*.96
            z=hl+ha*max(0,math.sin(a))**.8+.006 if upper else jl-.018-.006
            x=w*math.cos(a)
            # Upper/lower half rings meet through a flexible side wall, no front cap.
            if not upper:z-=.008*abs(math.sin(a))
            aperture=max(.045,1-.96*back)
            x=x*(1-back)+.27*aperture*math.cos(a)*back
            z=z*(1-back)+(-.12+.115*aperture*math.sin(a))*back
            verts.append((x,y,z))
            weights.append(((1-back)*(1 if upper else 0),(1-back)*(0 if upper else 1)))
    for j in range(nr-1):
        for k in range(na):
            faces.append((j*na+k,j*na+(k+1)%na,(j+1)*na+(k+1)%na,(j+1)*na+k))
    faces.append(tuple((nr-1)*na+k for k in range(na)))
    def lining_pose(p,i):
        skull,jaw=weights[i]
        return p+(pose(p,'skull')-p)*skull+(pose(p,'jaw')-p)*jaw
    mesh('Lined buccal chamber | recessed posterior passage',verts,faces,ORAL,lining_pose)
    # Flexible cheek wall closes posterior mouth sides; its lips share head/jaw trajectories.
    for sign in [-1,1]:
        vv,ff,ww=[],[],[]
        for j in range(55):
            y=-1.40+.53*j/54
            hy=min(HEAD[-1][0],y);jy=min(JAW[-1][0],y)
            _,hw,ht,hl,ha=pchip(HEAD,hy)
            _,jw,jl,jd=pchip(JAW,jy)
            for k in range(9):
                t=k/8
                vv.append((sign*(hw*.965*(1-t)+jw*.99*t),y,hl*(1-t)+(jl-.008)*t))
                ww.append(t)
        for j in range(54):
            for k in range(8):
                a=j*9+k;ff.append((a,a+1,a+10,a+9))
        def cheek_pose(p,i,ww=ww):
            return pose(p,'skull').lerp(pose(p,'jaw'),ww[i])
        ob=mesh('Flexible cheek wall '+str(sign),vv,ff,CLAY,cheek_pose)
        solid=ob.modifiers.new('Living cheek thickness','SOLIDIFY');solid.thickness=.006
    # Eyes follow the actual deformed cranium surface; larger burial is a later audit gate.
    head=SCULPT[0]
    from mathutils.bvhtree import BVHTree
    tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
    for sign in [-1,1]:
        hit,normal,_,_=tree.ray_cast(Vector((sign*2,-1.568,.100)),Vector((-sign,0,0)))
        if hit is None:raise RuntimeError('Orbital surface ray missed')
        normal.normalize()
        if normal.x*sign<0:normal=-normal
        center=hit-normal*.037
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=center)
        eye=bpy.context.object;eye.name='Recessed eye study '+str(sign)
        eye.scale=(.064,.082,.076)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        # Bake global coords so open study uses the same cranial pivot.
        for v in eye.data.vertices:v.co+=eye.location
        eye.location=(0,0,0)
        eye.data.materials.append(EYE)
        for p in eye.data.polygons:p.use_smooth=True
        eye.shape_key_add(name='Basis');key=eye.shape_key_add(name='GapeStudy')
        for i,v in enumerate(eye.data.vertices):key.data[i].co=pose(v.co,'skull')
        SCULPT.append(eye)
    # Pectoral roots emerge under the side shield; fan sweep projects down and back.
    pec=[(.29,-.74,-.035,-.335,.044),(.43,-.745,.087,-.416,.036),
         (.62,-.634,.235,-.555,.021),(.79,-.457,.255,-.631,.010),
         (.88,-.271,.171,-.646,.005),(.923,-.09,-.010,-.617,.002)]
    pel=[(.20,.20,.45,-.318,.026),(.32,.23,.58,-.374,.018),
         (.46,.36,.655,-.407,.008),(.51,.48,.57,-.386,.002)]
    for sign in [-1,1]:
        for name,rows in [('Pectoral',pec),('Anterior pelvic',pel)]:
            fin=shell_fin(name+' curved root '+str(sign),rows,'x',CLAY)
            if sign<0:
                for v in fin.data.vertices:v.co.x=-v.co.x
                bm=bmesh.new();bm.from_mesh(fin.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(fin.data);bm.free()
    shell_fin('Single low long-based dorsal',[
        (.26,.326,.338,0,.021),(.40,.333,.485,0,.019),(.62,.317,.560,0,.013),
        (.88,.302,.564,0,.010),(1.12,.306,.505,0,.008),
        (1.34,.322,.426,0,.011),(1.48,.345,.351,0,.008)],'y',CLAY)
    # The fleshy upward axial lobe is BODY. This envelope joins it to a substantial
    # lower lobe; the notch is anatomical, and both terminal margins are rounded.
    shell_fin('Asymmetric caudal | broad lower lobe',[
        (1.48,.022,.358,0,.026),(1.67,-.054,.431,0,.031),
        (1.86,-.254,.554,0,.020),(2.00,-.311,.625,0,.012),
        (2.10,-.237,.671,0,.008),(2.22,.163,.692,0,.006),
        (2.39,.389,.682,0,.005),(2.58,.535,.625,0,.003),
        (2.635,.577,.596,0,.0018)],'y',CLAY)
    for name,loc in [('Jaw hinge study',(0,-.89,-.205)),('Cranial articulation study',(0,-.85,.245))]:
        ob=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(ob)
        ob.location=loc;ob.empty_display_size=.07;ob.hide_render=True
    bpy.context.scene['candidate']='Coccosteus V3 clay-01; PREVIEW, visual review required'
    bpy.context.scene['source_sha256']=sha(SCRIPT)
    bpy.context.scene['views_sha256']=sha(VIEWS)
    bpy.context.scene['reference_note']='TUG 1817-152 form direction; Engelman 2024 Fig 7 proportions. No pigmentation claim.'
    setup_scene()
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report={'stage':'build','candidate':'clay-01','sourceSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),
            'blend':str(BLEND),'blendSha256':sha(BLEND),'objects':[
                {'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons)} for o in SCULPT],
            'notApproved':True,'notes':'No textures, game rig, glTF, public assets, or audits in clay phase.'}
    (OUT/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_CLAY_01_BUILD_COMPLETE',flush=True)


def setup_scene():
    s=bpy.context.scene
    for o in list(s.objects):
        if o.type in {'CAMERA','LIGHT'}:bpy.data.objects.remove(o,do_unlink=True)
    s.render.engine='CYCLES';s.cycles.device='CPU';s.cycles.samples=32
    s.cycles.seed=71204;s.cycles.use_animated_seed=False;s.cycles.use_denoising=True
    s.render.threads_mode='FIXED';s.render.threads=2
    s.render.resolution_x=1280;s.render.resolution_y=960;s.render.resolution_percentage=100
    s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
    s.render.film_transparent=False;s.view_settings.view_transform='AgX'
    s.view_settings.look='AgX - Medium High Contrast';s.view_settings.exposure=0;s.view_settings.gamma=1
    if s.world is None:s.world=bpy.data.worlds.new('Clay studio')
    s.world.use_nodes=True
    bg=s.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.105,.115,.128,1);bg.inputs[1].default_value=.5
    for name,loc,energy,size in [('Large upper key',(3,-3,5),480,4),('Soft front fill',(-3,-4,1),260,3),('Contour rim',(-1,4,3),580,3)]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object
        o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size
        o.rotation_euler=(Vector((0,.15,0))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();s.camera=bpy.context.object;s.camera.name='Fixed review camera';s.camera.data.type='ORTHO'


def render(old=False):
    cfg=json.loads(VIEWS.read_text())
    source=OLD if old else BLEND
    if not source.exists():raise RuntimeError('Missing frozen input '+str(source))
    if not old:
        r=json.loads((OUT/'build-report.json').read_text())
        for key,path in [('sourceSha256',SCRIPT),('viewsSha256',VIEWS),('blendSha256',BLEND)]:
            if r[key]!=sha(path):raise RuntimeError('Frozen input mismatch '+str(path))
    prefix='old' if old else 'new'
    manifest=OUT/(prefix+'-render-manifest.json');fresh(manifest)
    specs=cfg['body'] if old else cfg['body']+cfg['mouth']
    for spec in specs:fresh(OUT/(prefix+'-'+spec['name']+'.png'))
    bpy.ops.wm.open_mainfile(filepath=str(source))
    if old:
        clay=material('Comparison same clay',(.40,.385,.355))
        oral=material('Comparison same oral',(.105,.097,.093),.76)
        eye=material('Comparison same eye',(.043,.040,.035),.38)
        for o in bpy.context.scene.objects:
            if o.animation_data:o.animation_data_clear()
            if o.type=='ARMATURE':
                for bone in o.pose.bones:bone.matrix_basis=Matrix.Identity(4)
            if o.type=='MESH':
                for slot in o.material_slots:
                    name=slot.material.name.lower() if slot.material else ''
                    slot.material=eye if 'eye' in name else oral if 'oral' in name or 'gill' in name else clay
    setup_scene()
    s=bpy.context.scene;s.render.resolution_x,s.render.resolution_y=cfg['resolution'];s.cycles.samples=cfg['samples']
    records=[]
    for spec in specs:
        for o in s.objects:
            if o.type=='MESH' and o.data.shape_keys:
                key=o.data.shape_keys.key_blocks.get('GapeStudy')
                if key:key.value=spec.get('gape',0)
        cam=s.camera;cam.location=spec['camera']
        cam.rotation_euler=(Vector(spec['target'])-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.ortho_scale=spec['scale']
        path=OUT/(prefix+'-'+spec['name']+'.png');s.render.filepath=str(path)
        bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
        records.append({'file':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'view':spec})
        manifest.write_text(json.dumps({'source':str(source),'sourceSha256':sha(source),
            'scriptSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),'CPU':True,'threads':2,
            'complete':len(records)==len(specs),'renders':records},indent=2)+'\n')
    print('COCCOSTEUS_CLAY_01_'+prefix.upper()+'_RENDER_COMPLETE',flush=True)


if __name__=='__main__':
    import sys
    parser=argparse.ArgumentParser()
    parser.add_argument('--stage',required=True,choices=['build','render-new','render-old'])
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if args.stage=='build':build()
    else:render(old=args.stage=='render-old')
