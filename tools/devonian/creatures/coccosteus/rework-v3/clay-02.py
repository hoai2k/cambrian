"""Coccosteus clay-02. Organic regional geometry, immutable preview only.
No import of clay-01, no old .blend access, no publication or game export.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
OUT=REPO.parent/'devonian-authoring/coccosteus/rework-v3/clay-02'
SCRIPT=Path(__file__).resolve()
VIEWS=HERE/'views-02.json'
BLEND=OUT/'coccosteus-clay-02.blend'
SCULPT=[]

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


# These independently shaped profiles represent different tissues. No polygon section
# is reused around the head, shield, muscle or fins. Y increases toward the tail.
HEAD=[(-1.825,0,-.062,-.062,0),(-1.795,.093,.004,-.065,.020),
      (-1.73,.207,.101,-.074,.053),(-1.60,.313,.194,-.105,.105),
      (-1.40,.381,.280,-.157,.170),(-1.17,.422,.356,-.211,.202),
      (-.965,.433,.392,-.239,.208),(-.84,.424,.390,-.237,.205)]
JAW=[(-1.822,0,-.070,.005),(-1.795,.091,-.074,.026),
     (-1.73,.202,-.083,.046),(-1.60,.306,-.114,.057),
     (-1.40,.374,-.166,.061),(-1.17,.413,-.220,.047),
     (-1.00,.324,-.244,.028),(-.89,0,-.231,.008)]
TORSO=[(-.905,.420,.389,-.353),(-.72,.445,.421,-.391),
       (-.48,.458,.427,-.405),(-.20,.442,.409,-.398),
       (.08,.402,.375,-.359),(.37,.353,.341,-.302),
       (.69,.287,.319,-.222),(1.00,.220,.321,-.132),
       (1.29,.160,.351,-.050),(1.57,.108,.414,.059),
       (1.85,.068,.526,.216),(2.12,.030,.617,.384),(2.365,0,.616,.616)]


def pose(p,part):
    center=Vector((0,-.91,-.224)) if part=='jaw' else Vector((0,-.865,.245))
    angle=.34 if part=='jaw' else -.041
    return center+Matrix.Rotation(angle,3,'X')@(p-center)


def head_point(y,a):
    _,w,top,lip,arch=pchip(HEAD,y)
    sn,cs=math.sin(a),math.cos(a)
    x=w*cs
    if sn>=0:
        z=lip+(top-lip)*sn**.91
        # Broad, shallow brow depression flows into a convex cheek below the eye.
        orbital=math.exp(-((y+1.56)/.15)**2-((z-.102)/.103)**2)
        x*=1-.041*orbital
        z-=.013*math.exp(-((y+1.22)/.23)**2)*sn**3*cs**2
    else:
        z=lip+arch*(-sn)**.80
    return Vector((x,y,z))


def jaw_point(y,a):
    _,w,lip,depth=pchip(JAW,y)
    sn=math.sin(a)
    # Continuous concave oral floor above a thin convex mandibular underside.
    floor=min(.020,depth*.36)
    z=lip-floor*sn**.85 if sn>=0 else lip-depth*(-sn)**.75
    return Vector((w*math.cos(a),y,z))


def torso_point(y,a):
    _,w,top,bottom=pchip(TORSO,y)
    sn,cs=math.sin(a),math.cos(a)
    center=(top+bottom)/2
    h=(top-bottom)/2
    shield=1-smooth((y+.04)/.42)
    # Regional shield shoulder compresses an oval modestly at upper quarters;
    # smooth muscle remains elliptical, so no constant ridge follows the tail.
    x=w*cs*(1+.042*shield*sn)
    z=center+h*sn
    z-=.033*shield*max(0,sn)**1.4*abs(cs)**1.6
    # A shallow shaped shield edge is cut into ONE continuous volume, not a sleeve.
    border=.14-.23*(1-sn*sn)*smooth((sn+.6)/.8)
    relief=.004*math.exp(-((y-border)/.016)**2)
    x-=relief*cs
    z-=relief*sn
    return Vector((x,y,z))


def rings_mesh(name,rows,point,mat,part=None,oral_half=None,front_tunnel=False,n=156):
    """One unique vertex at a closed nose/tail pole; no nonplanar end n-gon there."""
    na=112
    vv=[];ff=[];ids=[];rings=[]
    for j in range(n):
        y=rows[0][0]+(rows[-1][0]-rows[0][0])*j/(n-1)
        if (j==0 and rows[0][1]==0) or (j==n-1 and rows[-1][1]==0):
            rings.append([len(vv)]);vv.append(tuple(point(y,0)))
        else:
            rings.append(list(range(len(vv),len(vv)+na)))
            vv.extend(tuple(point(y,2*math.pi*k/na)) for k in range(na))
    for r0,r1 in zip(rings,rings[1:]):
        for k in range(na):
            kn=(k+1)%na
            if len(r0)==1:face=(r0[0],r1[kn],r1[k])
            elif len(r1)==1:face=(r0[k],r0[kn],r1[0])
            else:face=(r0[k],r0[kn],r1[kn],r1[k])
            ff.append(face)
            ids.append(int(oral_half=='lower' and k>=na//2 or oral_half=='upper' and k<na//2))
    if len(rings[-1])>1:ff.append(tuple(rings[-1]));ids.append(0)
    if len(rings[0])>1:
        if front_tunnel:
            # Annular armour anterior surrounds the real buccopharyngeal aperture.
            start=len(vv)
            for j in range(38):
                t=j/37;y=rows[0][0]+.62*t
                for k in range(na):
                    a=2*math.pi*k/na
                    p=oral_point(rows[0][0],a)
                    shrink=1-.93*smooth(t)
                    vv.append((p.x*shrink,y,-.155+(p.z+.155)*shrink))
            for k in range(na):
                ff.append((rings[0][k],start+k,start+(k+1)%na,rings[0][(k+1)%na]));ids.append(1)
            for j in range(37):
                for k in range(na):
                    a=start+j*na+k
                    ff.append((a,a+na,start+(j+1)*na+(k+1)%na,start+j*na+(k+1)%na));ids.append(1)
            ff.append(tuple(start+37*na+k for k in range(na)));ids.append(1)
        else:ff.append(tuple(reversed(rings[0])));ids.append(0)
    motion=(lambda p,i:pose(p,part)) if part else None
    return mesh(name,vv,ff,mat,motion,ids if oral_half or front_tunnel else None)


def oral_point(y,a):
    # Palate and floor boundaries derive from the same actual tissue equations.
    upper=math.sin(a)>=0
    hy=max(HEAD[0][0],min(HEAD[-1][0],y))
    jy=max(JAW[0][0],min(JAW[-1][0],y))
    if upper:
        p=head_point(hy,-a);p.z+=.002
    else:
        p=jaw_point(jy,-a);p.z-=.002
    p.y=y
    return p


def oral_build():
    # Lining begins well behind the lips: no duplicate sheets cross the visible rim.
    vv=[];ff=[];weights=[];na=112;nr=62
    for j in range(nr):
        y=-1.27+.91*j/(nr-1);back=smooth((y+.97)/.61)
        for k in range(na):
            a=2*math.pi*k/na;p=oral_point(y,a)
            factor=1-.91*back
            p.x*=factor;p.z=-.155+(p.z+.155)*factor
            vv.append(tuple(p));weights.append(((1-back) if math.sin(a)>=0 else 0,(1-back) if math.sin(a)<0 else 0))
    for j in range(nr-1):
        for k in range(na):
            a=j*na+k;ff.append((a,j*na+(k+1)%na,(j+1)*na+(k+1)%na,a+na))
    ff.append(tuple((nr-1)*na+k for k in range(na)))
    def move(p,i):
        h,j=weights[i];return p+(pose(p,'skull')-p)*h+(pose(p,'jaw')-p)*j
    mesh('Recessed continuous oral passage',vv,ff,ORAL,move)
    # Swept curved leading cheek margins, no vertical rectangular wall edge.
    # Both skins share every boundary and motion weight; no solidify edge surprises.
    for sign in [-1,1]:
        vv=[];ff=[];weights=[];ny,nt=62,17
        for layer in [0,1]:
            for i in range(ny):
                u=i/(ny-1)
                for k in range(nt):
                    t=k/(nt-1)
                    y=-1.31+.43*u+.115*math.sin(math.pi*t)*(1-u)**2
                    hp=head_point(min(y,HEAD[-1][0]),0 if sign>0 else math.pi)
                    jp=jaw_point(min(y,JAW[-1][0]),0 if sign>0 else math.pi)
                    p=hp.lerp(jp,t);p.y=y
                    p.x+=sign*((.010-.004*layer)*math.sin(math.pi*t)*math.sin(math.pi*u))
                    vv.append(tuple(p));weights.append(t)
        area=ny*nt
        for layer in [0,1]:
            for i in range(ny-1):
                for k in range(nt-1):
                    a=layer*area+i*nt+k
                    ff.append((a,a+1,a+nt+1,a+nt) if layer==0 else (a,a+nt,a+nt+1,a+1))
        for i in range(ny-1):
            for k in [0,nt-1]:
                a=i*nt+k;ff.append((a,a+nt,a+nt+area,a+area))
        for k in range(nt-1):
            for i in [0,ny-1]:
                a=i*nt+k;ff.append((a,a+area,a+area+1,a+1))
        def move_cheek(p,i,ww=weights):return pose(p,'skull').lerp(pose(p,'jaw'),ww[i])
        ob=mesh('Curved compliant cheek '+str(sign),vv,ff,CLAY,move_cheek)
        ob.data.materials.append(ORAL)
        for p in ob.data.polygons:
            if all(v>=area for v in p.vertices):p.material_index=1


def paired_fin(name,sign,root,span,y0,sweep,chord,z0,drop):
    # Half-ellipse span mapping gives a rounded end with a monotone downward slope.
    # The previous final upward control point is eliminated entirely.
    vv=[];ff=[];ns,nc=58,64
    for i in range(ns):
        u=i/ns;t=math.sin(math.pi*u/2)
        x=root+span*t
        half=chord*.5*math.cos(math.pi*u/2)*(1+.18*math.sin(math.pi*u))
        center=y0+sweep*t
        z=z0-drop*t**1.25
        thickness=.025*(1-t)**1.6+.0015
        for k in range(nc):
            a=2*math.pi*k/nc
            vv.append((sign*x,center+half*math.cos(a),z+thickness*math.sin(a)+.012*(1-t)*math.sin(a)**2))
    for i in range(ns-1):
        for k in range(nc):
            a=i*nc+k;ff.append((a,i*nc+(k+1)%nc,(i+1)*nc+(k+1)%nc,a+nc))
    end=len(vv);vv.append((sign*(root+span),y0+sweep,z0-drop))
    for k in range(nc):ff.append(((ns-1)*nc+k,(ns-1)*nc+(k+1)%nc,end))
    ff.append(tuple(range(nc-1,-1,-1)))
    mesh(name,vv,ff,CLAY)


def median_fin(name,rows):
    vv=[];ff=[];ny,na=100,52
    for j in range(ny):
        y=rows[0][0]+(rows[-1][0]-rows[0][0])*j/(ny-1)
        _,lo,hi,thick=pchip(rows,y)
        for k in range(na):
            a=2*math.pi*k/na
            vv.append((thick*math.sin(a),y,(lo+hi)/2+(hi-lo)*.5*math.cos(a)))
    for j in range(ny-1):
        for k in range(na):
            a=j*na+k;ff.append((a,j*na+(k+1)%na,(j+1)*na+(k+1)%na,a+na))
    ff.extend([tuple(range(na-1,-1,-1)),tuple((ny-1)*na+k for k in range(na))])
    mesh(name,vv,ff,CLAY)


def build():
    global CLAY,ORAL,EYE
    OUT.mkdir(parents=True,exist_ok=True)
    fresh(BLEND);fresh(OUT/'build-report.json')
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    CLAY=material('Unpatterned warm grey clay',(.40,.385,.355))
    ORAL=material('Neutral oral lining',(.16,.145,.137),.72)
    EYE=material('Neutral dark eye',(.043,.040,.035),.38)
    head=rings_mesh('Cranium | continuous curved roof cheek and palate',HEAD,head_point,CLAY,'skull','lower')
    rings_mesh('Mandible | thin curved cup with oral floor',JAW,jaw_point,CLAY,'jaw','upper')
    rings_mesh('Thoracic shield into rounded muscular abdomen',TORSO,torso_point,CLAY,front_tunnel=True,n=228)
    oral_build()
    from mathutils.bvhtree import BVHTree
    tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[list(p.vertices) for p in head.data.polygons])
    for sign in [-1,1]:
        hit,normal,_,_=tree.ray_cast(Vector((sign*2,-1.555,.102)),Vector((-sign,0,0)))
        if hit is None:raise RuntimeError('Orbital surface ray missed')
        normal.normalize()
        if normal.x*sign<0:normal=-normal
        center=hit-normal*.035
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=center)
        o=bpy.context.object;o.name='Recessed orbital study '+str(sign);o.scale=(.063,.078,.070)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        for v in o.data.vertices:v.co+=o.location
        o.location=(0,0,0);o.data.materials.append(EYE)
        for p in o.data.polygons:p.use_smooth=True
        o.shape_key_add(name='Basis');key=o.shape_key_add(name='GapeStudy')
        for i,v in enumerate(o.data.vertices):key.data[i].co=pose(v.co,'skull')
        SCULPT.append(o)
    for sign in [-1,1]:
        paired_fin('Restrained swept pectoral '+str(sign),sign,.25,.51,-.48,.40,.46,-.26,.27)
        paired_fin('Small anterior pelvic '+str(sign),sign,.14,.30,.42,.17,.27,-.165,.120)
    median_fin('Low long dorsal',[(.30,.342,.347,.017),(.43,.333,.480,.016),
               (.65,.318,.555,.012),(.91,.310,.551,.010),(1.14,.325,.484,.009),
               (1.39,.361,.407,.010),(1.48,.380,.383,.008)])
    median_fin('Angular asymmetric caudal with rounded margins',[
               (1.50,.080,.385,.025),(1.68,-.025,.470,.028),(1.86,-.216,.572,.020),
               (2.00,-.271,.641,.011),(2.10,-.196,.679,.007),(2.23,.217,.698,.006),
               (2.40,.420,.680,.004),(2.58,.551,.625,.0025),(2.625,.588,.594,.001)])
    for name,loc in [('Jaw pivot',(0,-.91,-.224)),('Cranial articulation',(0,-.865,.245))]:
        o=bpy.data.objects.new(name,None);bpy.context.scene.collection.objects.link(o);o.location=loc;o.hide_render=True
    setup_scene()
    # A restrained inspection fill reveals actual oral surfaces in the open study.
    bpy.ops.object.light_add(type='AREA',location=(.4,-3,-.7));o=bpy.context.object
    o.name='Oral inspection fill';o.data.energy=28;o.data.size=1.8
    o.rotation_euler=(Vector((0,-1.1,-.15))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene['candidate']='Coccosteus V3 clay-02 PREVIEW, not approved'
    bpy.context.scene['source_sha256']=sha(SCRIPT);bpy.context.scene['views_sha256']=sha(VIEWS)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report={'stage':'build','candidate':'clay-02','sourceSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),
            'blend':str(BLEND),'blendSha256':sha(BLEND),'notApproved':True,
            'objects':[{'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons)} for o in SCULPT]}
    (OUT/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_CLAY_02_BUILD_COMPLETE',flush=True)


def render():
    cfg=json.loads(VIEWS.read_text());r=json.loads((OUT/'build-report.json').read_text())
    for key,path in [('sourceSha256',SCRIPT),('viewsSha256',VIEWS),('blendSha256',BLEND)]:
        if r[key]!=sha(path):raise RuntimeError('Frozen input mismatch '+str(path))
    manifest=OUT/'render-manifest.json';fresh(manifest)
    for spec in cfg['views']:fresh(OUT/(spec['name']+'.png'))
    bpy.ops.wm.open_mainfile(filepath=str(BLEND))
    s=bpy.context.scene;s.render.resolution_x,s.render.resolution_y=cfg['resolution'];s.cycles.samples=cfg['samples']
    records=[]
    for spec in cfg['views']:
        for o in s.objects:
            if o.type=='MESH' and o.data.shape_keys:
                key=o.data.shape_keys.key_blocks.get('GapeStudy')
                if key:key.value=spec.get('gape',0)
        cam=s.camera;cam.location=spec['camera']
        cam.rotation_euler=(Vector(spec['target'])-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=spec['scale']
        path=OUT/(spec['name']+'.png');s.render.filepath=str(path)
        bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
        records.append({'file':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'view':spec})
        manifest.write_text(json.dumps({'source':str(BLEND),'sourceSha256':sha(BLEND),
            'scriptSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),'CPU':True,'threads':2,
            'complete':len(records)==len(cfg['views']),'renders':records},indent=2)+'\n')
    print('COCCOSTEUS_CLAY_02_RENDER_COMPLETE',flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--stage',required=True,choices=['build','render'])
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if a.stage=='build':build()
    else:render()
