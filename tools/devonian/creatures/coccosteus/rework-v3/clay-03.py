"""Coccosteus clay-03. Shared lip/collar boundary and one continuous oral lumen.
The body, cranial skin, mandibular skin, palate, floor and throat are one connected
mesh. Named vertex weights preserve anatomical editability. No old model is loaded.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
import bpy, bmesh
from mathutils import Matrix, Vector
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
OUT=REPO.parent/'devonian-authoring/coccosteus/rework-v3/clay-03'
SCRIPT=Path(__file__).resolve()
VIEWS=HERE/'views-03.json'
BLEND=OUT/'coccosteus-clay-03.blend'
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


# Retained clay-02 posterior profile. Only the anterior collar/armour curvature changes.
TORSO=[(-.72,.445,.421,-.391),(-.48,.458,.427,-.405),(-.20,.442,.409,-.398),
       (.08,.402,.375,-.359),(.37,.353,.341,-.302),(.69,.287,.319,-.222),
       (1.00,.220,.321,-.132),(1.29,.160,.351,-.050),(1.57,.108,.414,.059),
       (1.85,.068,.526,.216),(2.12,.030,.617,.384),(2.365,0,.616,.616)]
COLLAR_Y=-.72
THROAT_END=-.22


def torso_point(y,a):
    _,w,top,bottom=pchip(TORSO,y)
    sn,cs=math.sin(a),math.cos(a)
    mid=(top+bottom)/2;h=(top-bottom)/2
    shield=1-smooth((y+.04)/.42)
    x=w*cs*(1+.042*shield*sn)
    z=mid+h*sn-.033*shield*max(0,sn)**1.4*abs(cs)**1.6
    # Broad thoracic plate curvature: rounded dorsal crest, sloping upper flank,
    # and a firmer low shoulder around the pectoral region. No universal facets.
    anterior=math.exp(-((y+.35)/.44)**4)
    z-=.024*anterior*max(0,sn)*cs**2
    x+=.018*anterior*cs*math.exp(-((sn+.28)/.38)**2)
    border=.14-.23*(1-sn*sn)*smooth((sn+.6)/.8)
    relief=.0035*math.exp(-((y-border)/.018)**2)
    return (x-relief*cs,y,z-relief*sn)


def lip_point(a):
    """One ordered nonplanar lip loop; branches share finite commissures.
    The narrow resting opening follows a broad U-shaped muzzle, not an oval cutout.
    """
    sn,cs=math.sin(a),math.cos(a)
    y=-1.825+.625*abs(cs)**3.2
    upper=-.077-.141*abs(cs)**2.1
    gap=.009*abs(sn)**1.2
    return (.358*cs,y,upper if sn>=0 else upper-gap)


def hermite(a,b,ta,tb,t):
    return (2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*ta+(-2*t**3+3*t*t)*b+(t**3-t*t)*tb


def head_point(t,a):
    """Curved muzzle/crown/cheek surface ends at the actual shared thoracic collar."""
    p=lip_point(a);q=torso_point(COLLAR_Y,a)
    after=torso_point(COLLAR_Y+.0001,a)
    span=COLLAR_Y-p[1]
    deriv=[(after[k]-q[k])/.0001*span for k in range(3)]
    sn,cs=math.sin(a),math.cos(a)
    startx=.095*cs*span
    startz=(.72*max(0,sn)-.32*max(0,-sn)-.20*cs*cs)*span
    x=hermite(p[0],q[0],startx,deriv[0],t)
    y=p[1]+span*t
    z=hermite(p[2],q[2],startz,deriv[2],t)
    fade=math.sin(math.pi*t)**2
    # Lower cheek retains mass under/behind the orbit. The crown is restrained;
    # the anterior roof and cheek do not become a single circular helmet section.
    cheek=math.exp(-((y+1.18)/.205)**2-((z+.090)/.145)**2)
    temporal=math.exp(-((y+.97)/.15)**2-((z-.065)/.23)**2)
    orbit=math.exp(-((y+1.49)/.125)**2-((z-.112)/.092)**2)
    x+=(1 if cs>=0 else -1)*fade*(.047*cheek+.016*temporal-.020*orbit)*abs(cs)**.6
    crown=math.exp(-((y+1.20)/.27)**2)*max(0,sn)**5
    z-=.027*fade*crown
    # Broad upper cheek inflection, deliberately not a small raised decorative ridge.
    z-=.021*fade*math.exp(-((y+1.06)/.19)**2)*max(0,sn)*cs*cs
    z-=.080*fade*smooth(-sn/.24)*math.exp(-((sn+.53)/.34)**2)
    return (x,y,z)


def inner_point(s,a):
    """The sole oral boundary is inset from the same curved anterior skin.
    The full-width collar, not a closed jaw pole, supplies the pharyngeal ring.
    Upper and lower walls taper together to one posterior pole.
    """
    join=.70
    def inset(t):
        q=head_point(t,a)
        sn=math.sin(a)
        xf=1-.43*smooth(t/.38)
        # Palate and floor each retain real tissue thickness. Keeping the floor
        # near the mandibular underside makes it concave, not a raised central hill.
        roof=.22*max(0,sn)**.8*smooth(t/.45)
        floor=.065*max(0,-sn)**.8*smooth(t/.30)
        return (q[0]*xf,q[1],q[2]-roof+floor)
    if s<=join:return inset(s/join)
    u=(s-join)/(1-join)
    q=inset(1)
    top=head_point(1,math.pi/2);bottom=head_point(1,3*math.pi/2)
    start_center=(top[2]-.22+bottom[2]+.065)/2
    radius=(1-u)**.8
    center=start_center*(1-smooth(u))-.154*smooth(u)
    return (q[0]*radius,COLLAR_Y+(THROAT_END-COLLAR_Y)*u,center+(q[2]-start_center)*radius)


def skin_weights(p,a):
    # Exact same position/weight ownership on joined rim and collar vertices.
    # Rigid cranial/jaw regions transition through soft cheek and neck tissue.
    jaw_fraction=smooth((-math.sin(a)+.14)/.47)
    jaw_fade=1-smooth((p[1]+1.13)/.34)
    skull_fade=1-smooth((p[1]+.91)/.19)
    jw=jaw_fraction*jaw_fade;sw=(1-jaw_fraction)*skull_fade
    return (sw,jw,1-sw-jw)


def moved(p,weights,gape=1):
    x,y,z=p;sw,jw,bw=weights
    def rotate(cy,cz,ang):
        dy,dz=y-cy,z-cz;c=math.cos(ang*gape);s=math.sin(ang*gape)
        return (cy+dy*c-dz*s,cz+dy*s+dz*c)
    sy,sz=rotate(-.865,.245,-.041)
    jy,jz=rotate(-.99,-.224,.34)
    return (x,y*bw+sy*sw+jy*jw,z*bw+sz*sw+jz*jw)


def surface_arrays(na=128,nh=112,nt=172,ni=96):
    vv=[];ff=[];ids=[];weights=[];regions=[];inner_rings=[]
    def ring(points):
        ix=[]
        for k,p in enumerate(points):
            ix.append(len(vv));vv.append(tuple(p));weights.append(skin_weights(p,2*math.pi*k/na))
        return ix
    def bridge(a,b,oral=False,region=0):
        for k in range(na):
            kn=(k+1)%na
            face=(a[k],a[kn],b[kn],b[k])
            ff.append(tuple(reversed(face)) if oral else face);ids.append(int(oral));regions.append(region)
    rim=ring([lip_point(2*math.pi*k/na) for k in range(na)])
    prev=rim
    for j in range(1,nh+1):
        r=ring([head_point(j/nh,2*math.pi*k/na) for k in range(na)])
        bridge(prev,r,region=0);prev=r
    collar=prev[:]  # This ring is owned jointly; no new coincident torso ring is created.
    for j in range(1,nt):
        y=COLLAR_Y+(TORSO[-1][0]-COLLAR_Y)*j/nt
        r=ring([torso_point(y,2*math.pi*k/na) for k in range(na)])
        bridge(prev,r,region=1);prev=r
    pole=len(vv);vv.append((0,TORSO[-1][0],TORSO[-1][2]));weights.append((0,0,1))
    for k in range(na):ff.append((prev[k],prev[(k+1)%na],pole));ids.append(0);regions.append(1)
    prev=rim;inner_rings.append(rim)
    for j in range(1,ni):
        s=j/ni
        r=ring([inner_point(s,2*math.pi*k/na) for k in range(na)])
        assert vv[r[0]][0]>.00001 and vv[r[na//2]][0]<-.00001, 'Collapsed oral floor station'
        bridge(prev,r,oral=True,region=2);prev=r;inner_rings.append(r)
    pole=len(vv);vv.append((0,THROAT_END,-.154));weights.append((0,0,1))
    for k in range(na):ff.append((prev[(k+1)%na],prev[k],pole));ids.append(1);regions.append(2)
    return vv,ff,ids,weights,regions,{'lip':rim,'collar':collar,'innerRings':inner_rings,'throatPole':pole}


def local_integrity(vv,ff,weights,parts):
    """Local construction gate, not the later full creature/eye audit."""
    edges={}
    for p,w in zip(vv,weights):
        assert all(math.isfinite(x) for x in p+w)
        assert min(w)>=-1e-10 and abs(sum(w)-1)<1e-9
    for face in ff:
        assert len(set(face))==len(face)
        for a,b in zip(face,face[1:]+face[:1]):
            key=tuple(sorted((a,b)));edges[key]=edges.get(key,0)+1
    assert all(n==2 for n in edges.values()),'Unshared skin boundary'
    # Collar is fully body-owned, and the only mouth opening edge is shared by
    # exterior and oral faces. There are no duplicate oral or neck objects to patch.
    assert all(abs(weights[i][2]-1)<1e-9 for i in parts['collar'])
    minimum_width=100
    for r in parts['innerRings'][1:]:
        width=max(vv[i][0] for i in r)-min(vv[i][0] for i in r)
        minimum_width=min(minimum_width,width)
        assert width>.001,'Zero-width pharyngeal floor'
    return {'twoFaceEdges':True,'minimumNonterminalOralWidth':minimum_width,
            'oneSharedLipLoop':True,'oneSharedCollarRing':True,'oralPassages':1}


def build():
    global CLAY,ORAL,EYE
    OUT.mkdir(parents=True,exist_ok=True);fresh(BLEND);fresh(OUT/'build-report.json')
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    CLAY=material('Unpatterned warm grey clay',(.40,.385,.355))
    ORAL=material('Neutral oral lining',(.16,.145,.137),.72)
    EYE=material('Neutral dark eye',(.043,.040,.035),.38)
    vv,ff,ids,weights,regions,parts=surface_arrays()
    check=local_integrity(vv,ff,weights,parts)
    body=mesh('Continuous Coccosteus skin | shared lips collar and single lumen',vv,ff,CLAY,
              lambda p,i:moved(p,weights[i]),ids)
    attr=body.data.attributes.new('AnatomicalRegion','INT','FACE')
    for i,value in enumerate(regions):attr.data[i].value=value
    for name,index in [('skull',0),('jaw',1),('body',2)]:
        group=body.vertex_groups.new(name=name)
        for i,w in enumerate(weights):
            if w[index]>1e-8:group.add([i],w[index],'REPLACE')
    body['region_codes']='0 anterior skin, 1 thorax/posterior, 2 sole oral lumen'
    body['boundary_ownership']='One shared lip loop, one shared collar; no hidden caps or duplicate passages'
    from mathutils.bvhtree import BVHTree
    # Ray targets actual external cranial skin; the sole lumen lies below the orbit.
    tree=BVHTree.FromPolygons([Vector(p) for p in vv],[list(f) for f in ff])
    for sign in [-1,1]:
        hit,normal,_,_=tree.ray_cast(Vector((sign*2,-1.49,.112)),Vector((-sign,0,0)))
        if hit is None:raise RuntimeError('Orbital surface ray missed')
        normal.normalize()
        if normal.x*sign<0:normal=-normal
        center=hit-normal*.033
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,location=center)
        o=bpy.context.object;o.name='Recessed orbital study '+str(sign);o.scale=(.062,.077,.070)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        for v in o.data.vertices:v.co+=o.location
        o.location=(0,0,0);o.data.materials.append(EYE)
        for p in o.data.polygons:p.use_smooth=True
        o.shape_key_add(name='Basis');key=o.shape_key_add(name='GapeStudy')
        for i,v in enumerate(o.data.vertices):key.data[i].co=moved(tuple(v.co),(1,0,0))
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
    setup_scene()
    bpy.ops.object.light_add(type='AREA',location=(.4,-3,-.7));o=bpy.context.object
    o.name='Oral inspection fill';o.data.energy=28;o.data.size=1.8
    o.rotation_euler=(Vector((0,-1.1,-.15))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.context.scene['candidate']='Coccosteus clay-03 PREVIEW; single-boundary oral/neck correction'
    bpy.context.scene['source_sha256']=sha(SCRIPT);bpy.context.scene['views_sha256']=sha(VIEWS)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report={'stage':'build','candidate':'clay-03','sourceSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),
            'blend':str(BLEND),'blendSha256':sha(BLEND),'notApproved':True,'localConstructionChecks':check,
            'objects':[{'name':o.name,'vertices':len(o.data.vertices),'polygons':len(o.data.polygons)} for o in SCULPT]}
    (OUT/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_CLAY_03_BUILD_COMPLETE',flush=True)


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
    print('COCCOSTEUS_CLAY_03_RENDER_COMPLETE',flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--stage',required=True,choices=['build','render'])
    a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    if a.stage=='build':build()
    else:render()
