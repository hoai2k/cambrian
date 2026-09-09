"""Material-03: legible existing anatomical plates with subordinate grain.
Read frozen material-02; replace outer-body shader only, adding mapped plate attributes.
No geometry, oral/eye materials, fin shaders or existing pigment-map changes.
"""
import argparse,hashlib,json,math,random,struct,sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
ROOT=REPO.parent/'devonian-authoring/coccosteus/rework-v3'
SOURCE=ROOT/'material-02/coccosteus-material-02.blend'
SOURCE_REPORT=ROOT/'material-02/material-report.json'
OUT=ROOT/'material-03'
BLEND=OUT/'coccosteus-material-03.blend'
SCRIPT=Path(__file__).resolve()
VIEWS=HERE/'material-views-03.json'
EXPECTED_BLEND='fb5d6149ca60af5109362d9080204c914b5a2f5e2003893a6cb0a6af76e35a49'
EXPECTED_REPORT='b94af6882e191e55feea273444d54eff36bee86347091e6a9a6fccabf3ddae1f'

LAYOUT=HERE/'armour-layout-01.json'
CLAY_REPORT=ROOT/'clay-04/build-report.json'
EXPECTED_LAYOUT='c703f3d02ea4595408173c8d1bad186b7e9721f8abbe4c580aae7b42b85d4b3a'
EXPECTED_CLAY_REPORT='c964de05f5f51b60545d2ad8637389eccc6955308a6ca7f02ed48142ee7fa9a2'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def fresh(p):
    if p.exists():raise RuntimeError('Refusing to overwrite candidate evidence: '+str(p))

def smooth(x):
    x=np.clip(x,0,1);return x*x*(3-2*x)

def oral_digest(body):
    faces=[tuple(p.vertices) for p in body.data.polygons if p.material_index==1]
    indices=sorted({i for f in faces for i in f})
    h=hashlib.sha256()
    for key in body.data.shape_keys.key_blocks:
        h.update(key.name.encode()+b'\0')
        for i in indices:h.update(struct.pack('<3f',*key.data[i].co))
    for i in indices:
        for g in body.data.vertices[i].groups:h.update(struct.pack('<IIf',i,g.group,g.weight))
    for face in faces:h.update(struct.pack('<I',len(face)));h.update(struct.pack('<'+'I'*len(face),*face))
    return h.hexdigest(),indices

def make_mat(name,color,rough=.6):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=rough
    return m,bs

def attribute(obj,name,values,kind='FLOAT_COLOR'):
    old=obj.data.attributes.get(name)
    if old:obj.data.attributes.remove(old)
    at=obj.data.attributes.new(name,kind,'POINT')
    for i,value in enumerate(values):
        if kind=='FLOAT_COLOR':at.data[i].color=(*value,1)
        else:at.data[i].value=float(value)
    return at

def specimen_digest():
    """All mesh topology, coordinates in all keys, group membership and transforms."""
    h=hashlib.sha256()
    for o in sorted((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:o.name):
        h.update(o.name.encode()+b'\0')
        for row in o.matrix_world:h.update(struct.pack('<4f',*row))
        for v in o.data.vertices:
            h.update(struct.pack('<3f',*v.co))
            for g in v.groups:h.update(struct.pack('<IIf',v.index,g.group,g.weight))
        for g in o.vertex_groups:h.update(g.name.encode()+b'\0')
        if o.data.shape_keys:
            for key in o.data.shape_keys.key_blocks:
                h.update(key.name.encode()+b'\0')
                for v in key.data:h.update(struct.pack('<3f',*v.co))
        for p in o.data.polygons:
            h.update(struct.pack('<I',len(p.vertices)))
            h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
    return h.hexdigest()

def image_node(mat,im,vector):
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im
    node.interpolation='Linear';node.extension='EXTEND'
    mat.node_tree.links.new(vector,node.inputs['Vector']);return node.outputs['Color']

def ramp(mat,value,points):
    node=mat.node_tree.nodes.new('ShaderNodeValToRGB');r=node.color_ramp
    for e in list(r.elements)[2:]:r.elements.remove(e)
    for i,(pos,color) in enumerate(points):
        e=r.elements[i] if i<2 else r.elements.new(pos)
        e.position=pos;e.color=(*color,1)
    r.interpolation='EASE';mat.node_tree.links.new(value,node.inputs['Fac'])
    return node.outputs['Color']

def mix_rgb(mat,fac,a,b,mode='MIX'):
    node=mat.node_tree.nodes.new('ShaderNodeMixRGB');node.blend_type=mode
    for socket,value in [(node.inputs[0],fac),(node.inputs[1],a),(node.inputs[2],b)]:
        if isinstance(value,(int,float)):socket.default_value=value
        elif isinstance(value,tuple):socket.default_value=(*value,1)
        else:mat.node_tree.links.new(value,socket)
    return node.outputs['Color']

def math_node(mat,op,a,b):
    node=mat.node_tree.nodes.new('ShaderNodeMath');node.operation=op
    for socket,value in zip(node.inputs,[a,b]):
        if isinstance(value,(int,float)):socket.default_value=value
        else:mat.node_tree.links.new(value,socket)
    return node.outputs[0]

def curve(points):
    p=np.asarray(points,float);out=[]
    for i in range(len(p)-1):
        a,b,c,d=p[max(0,i-1)],p[i],p[i+1],p[min(len(p)-1,i+2)]
        for j in range(10):
            t=j/10
            out.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    out.append(p[-1]);return out

def signed_distance(U,S,points,head):
    scales=np.array([.95 if head else 1.,.48]);path=[p*scales for p in curve(points)]
    X=U*scales[0];Y=S*scales[1];best=np.full_like(X,100.);signed=np.zeros_like(X)
    for a,b in zip(path,path[1:]):
        d=b-a;length=max(float(d@d),1e-12)
        t=np.clip(((X-a[0])*d[0]+(Y-a[1])*d[1])/length,0,1)
        dx=X-a[0]-t*d[0];dy=Y-a[1]-t*d[1];dist=np.sqrt(dx*dx+dy*dy)
        sign=np.sign(d[0]*dy-d[1]*dx);replace=dist<best
        signed=np.where(replace,dist*sign,signed);best=np.minimum(best,dist)
    return best,signed


def plate_field(cfg,head,W=1536,H=1024):
    u=np.linspace(0,1,W) if head else np.linspace(-.8,.35,W)
    U=np.broadcast_to(u[None,:],(H,W));S=np.broadcast_to(np.linspace(0,2,H)[:,None],(H,W))
    seam=np.zeros_like(U);edge=np.zeros_like(U);tone=np.full_like(U,.47 if head else .38)
    for p in cfg['head' if head else 'thorax']:
        d,sd=signed_distance(U,S,p['points'],head);w=p['width']
        # Same ten anatomical paths/widths as accepted displacement, no invented lines.
        incision=np.exp(-(d/(w*1.15))**2)
        marginal=.17*np.exp(-(d/(w*2.5))**2)
        seam=np.maximum(seam,np.maximum(incision,marginal))
        # A restrained material response on just one existing margin, not a tube/ridge.
        edge=np.maximum(edge,np.exp(-((sd-w*1.8)/(w*.9))**2)*(1-incision))
    for p,offset in zip(cfg['head_curvature' if head else 'thorax_curvature'],[-.12,.16,.055]):
        c=p['center'];rad=p['radius']
        field=np.exp(-1.7*((U-c[0])/rad[0])**2-1.7*((S-c[1])/rad[1])**2)
        tone+=offset*field
    return np.stack((np.clip(seam,0,1),np.clip(edge,0,1),np.clip(tone,0,1)),axis=-1).astype(np.float32)


def packed_plate(name,rgb):
    H,W,_=rgb.shape;assert np.isfinite(rgb).all() and rgb.min()>=0 and rgb.max()<=1
    im=bpy.data.images.new(name,width=W,height=H,alpha=True,float_buffer=False)
    im.colorspace_settings.name='Non-Color'
    rgba=np.ones((H,W,4),np.float32);rgba[:,:,:3]=rgb
    im.pixels.foreach_set(rgba.reshape(-1));im.update();im.pack();return im


def retained_surface_digest(body,image_names):
    h=hashlib.sha256()
    for name in image_names:
        im=bpy.data.images[name];h.update(name.encode());h.update(struct.pack('<2I',*im.size))
        data=np.empty(len(im.pixels),np.float32);im.pixels.foreach_get(data);h.update(data.tobytes())
    for name in ['Pigment','ArmorMask','PatternUV','PatternSide']:
        attr=body.data.attributes[name];h.update(name.encode())
        for d in attr.data:
            if attr.data_type=='FLOAT':h.update(struct.pack('<f',d.value))
            else:h.update(struct.pack('<4f',*d.color))
    for o in sorted((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:o.name):
        for i,m in enumerate(o.data.materials):
            if o==body and i==0:continue
            h.update((o.name+'|'+str(i)+'|'+m.name).encode())
    return h.hexdigest()


def plate_shader(images,plate_images):
    mat,bs=make_mat('Coccosteus M03 | readable regional bone plates',(.18,.13,.06),.65)
    n=mat.node_tree.nodes;l=mat.node_tree.links
    def attr(name):
        node=n.new('ShaderNodeAttribute');node.attribute_name=name;return node
    mask=attr('ArmorMask').outputs['Fac'];pigment=attr('Pigment').outputs['Color']
    uv=attr('PatternUV').outputs['Color'];side=attr('PatternSide').outputs['Fac']
    # This dermal colour branch is identical to material02, using the same packed images.
    mark=mix_rgb(mat,side,image_node(mat,images[0],uv),image_node(mat,images[1],uv))
    dermis=mix_rgb(mat,math_node(mat,'MULTIPLY',mark,.83),pigment,(.015,.030,.034))
    pmap=attr('PlateUV').outputs['Color'];ishead=attr('PlateHead').outputs['Fac']
    response=mix_rgb(mat,ishead,image_node(mat,plate_images[1],pmap),image_node(mat,plate_images[0],pmap))
    separate=n.new('ShaderNodeSeparateColor');separate.mode='RGB';l.new(response,separate.inputs[0])
    strength=attr('PlateStrength').outputs['Fac']
    seam=math_node(mat,'MULTIPLY',separate.outputs['Red'],strength)
    edge=math_node(mat,'MULTIPLY',separate.outputs['Green'],strength)
    tone=separate.outputs['Blue']
    bone=ramp(mat,tone,[(.24,(.135,.100,.044)),(.43,(.170,.126,.057)),(.66,(.216,.159,.074))])
    tex=n.new('ShaderNodeTexCoord')
    def noise(scale,detail=2):
        node=n.new('ShaderNodeTexNoise');node.inputs['Scale'].default_value=scale;node.inputs['Detail'].default_value=detail
        node.inputs['Roughness'].default_value=.72;l.new(tex.outputs['Object'],node.inputs['Vector']);return node.outputs['Fac']
    # Close-value irregular grain; no bright all-over gold dots or broad cloud multiplier.
    cells=n.new('ShaderNodeTexVoronoi');cells.inputs['Scale'].default_value=145;l.new(tex.outputs['Object'],cells.inputs['Vector'])
    graincolor=ramp(mat,cells.outputs['Distance'],[(.14,(1.07,1.055,1.03)),(.54,(.89,.88,.86))])
    bone=mix_rgb(mat,.32,bone,graincolor,'MULTIPLY')
    fine=noise(230,2.2);mottle=noise(43,2)
    minor=ramp(mat,mottle,[(.23,(.95,.94,.92)),(.73,(1.035,1.025,1.01))])
    bone=mix_rgb(mat,.32,bone,minor,'MULTIPLY')
    # Boundary colour follows genuine sutures. Narrow umber, not a black outline.
    bone=mix_rgb(mat,math_node(mat,'MULTIPLY',seam,.72),bone,(.052,.037,.020))
    bone=mix_rgb(mat,math_node(mat,'MULTIPLY',edge,.12),bone,(.253,.184,.086))
    l.new(mix_rgb(mat,mask,dermis,bone),bs.inputs['Base Color'])
    bone_rough=ramp(mat,tone,[(.24,(.69,.69,.69)),(.66,(.59,.59,.59))])
    bone_rough=mix_rgb(mat,seam,bone_rough,(.79,.79,.79))
    bone_rough=mix_rgb(mat,math_node(mat,'MULTIPLY',edge,.35),bone_rough,(.52,.52,.52))
    l.new(mix_rgb(mat,mask,(.46,.46,.46),bone_rough),bs.inputs['Roughness'])
    # Preserve dermis microbump; sharply reduce armour bump so sculpted planes lead.
    skin=n.new('ShaderNodeBump');skin.inputs['Strength'].default_value=.48;skin.inputs['Distance'].default_value=.0028
    l.new(noise(150,2.4),skin.inputs['Height'])
    beadheight=math_node(mat,'SUBTRACT',1,cells.outputs['Distance'])
    bh=mix_rgb(mat,.36,beadheight,fine)
    armour=n.new('ShaderNodeBump');armour.inputs['Distance'].default_value=.0012
    microstrength=math_node(mat,'MULTIPLY',math_node(mat,'SUBTRACT',1,math_node(mat,'MULTIPLY',seam,.8)),.18)
    l.new(microstrength,armour.inputs['Strength']);l.new(bh,armour.inputs['Height'])
    normal=mix_rgb(mat,mask,skin.outputs['Normal'],armour.outputs['Normal'])
    norm=n.new('ShaderNodeVectorMath');norm.operation='NORMALIZE';l.new(normal,norm.inputs[0]);l.new(norm.outputs['Vector'],bs.inputs['Normal'])
    bs.inputs['Specular IOR Level'].default_value=.19;bs.inputs['Coat Weight'].default_value=0
    return mat


def prepare():
    for p,digest in [(SOURCE,EXPECTED_BLEND),(SOURCE_REPORT,EXPECTED_REPORT),(LAYOUT,EXPECTED_LAYOUT),(CLAY_REPORT,EXPECTED_CLAY_REPORT)]:
        if sha(p)!=digest:raise RuntimeError('Frozen source input mismatch '+str(p))
    report02=json.loads(SOURCE_REPORT.read_text());cfg=json.loads(LAYOUT.read_text());cr=json.loads(CLAY_REPORT.read_text())
    if report02['blendSha256']!=EXPECTED_BLEND:raise RuntimeError('Report does not identify material02')
    OUT.mkdir(parents=True,exist_ok=True);fresh(BLEND);fresh(OUT/'material-report.json')
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Continuous Coccosteus skin'))
    before=specimen_digest();oralbefore,_=oral_digest(body)
    old_images=report02['packedOriginalPigmentMaps'];retainedbefore=retained_surface_digest(body,old_images)
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.data.shape_keys:o.data.shape_keys.key_blocks['GapeStudy'].value=0
    v=np.array([tuple(p.co) for p in body.data.vertices]);N=len(v);assert N==48514
    ids=np.arange(N);sn=np.sin(2*np.pi*(ids%128)/128);S=np.arccos(np.clip(sn,-1,1))/(np.pi/2)
    t=(ids//128)/112;head=ids<=112*128+127;outer=ids<=36352;y=v[:,1]
    # These are the accepted displacement masks, retaining the successful lips and eye surrounds.
    hf=smooth((t-.045)/.12)*(1-smooth((t-.83)/.17))*(1-smooth((S-1.20)/.40))
    tf=smooth((y+.72)/.13)*(1-smooth((y-.03)/.28))*(1-smooth((S-1.38)/.38))
    for eye in cr['orbitalSites']:
        dist=np.sqrt(((v-np.asarray(eye['surface']))**2).sum(1));hf*=smooth((dist-.085)/.070)
    strength=np.where(head,hf,tf)*outer
    _,oral_ids=oral_digest(body);strength[oral_ids]=0
    attribute(body,'PlateStrength',strength,'FLOAT');attribute(body,'PlateHead',head.astype(float),'FLOAT')
    attribute(body,'PlateUV',np.column_stack((np.where(head,t,(y+.8)/1.15),S/2,np.zeros(N))))
    plate_images=[packed_plate('M03 '+name+' anatomical response',plate_field(cfg,ishead)) for name,ishead in [('cranial',True),('thoracic',False)]]
    body.data.materials[0]=plate_shader([bpy.data.images['M02 original dermal pigment '+str(side)] for side in [-1,1]],plate_images)
    after=specimen_digest();oralafter,_=oral_digest(body);retainedafter=retained_surface_digest(body,old_images)
    assert before==after,'Accepted geometry/deformation/topology changed'
    assert oralbefore==oralafter,'Oral ownership changed'
    assert retainedbefore==retainedafter,'Retained pigment/maps/material assignments changed'
    s=bpy.context.scene;s['candidate']='Coccosteus material-03 PREVIEW; existing anatomical plates lead surface detail'
    s['source_sha256']=sha(SCRIPT);s['material02_source_sha256']=EXPECTED_BLEND
    s.render.engine='CYCLES';s.cycles.device='CPU';s.render.threads_mode='FIXED';s.render.threads=2
    s.cycles.seed=71204;s.cycles.use_animated_seed=False;s.cycles.samples=48
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report={'stage':'material-only-study','notApproved':True,'sourceBlend':str(SOURCE),'sourceBlendSha256':EXPECTED_BLEND,
        'sourceReportSha256':sha(SOURCE_REPORT),'scriptSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),'layoutSha256':sha(LAYOUT),
        'clayReportSha256':sha(CLAY_REPORT),'blend':str(BLEND),'blendSha256':sha(BLEND),
        'geometry':{'before':before,'after':after,'oralBefore':oralbefore,'oralAfter':oralafter,'unchanged':before==after},
        'retainedSurface':{'before':retainedbefore,'after':retainedafter,'originalImages':old_images},
        'newPlateMaps':[im.name for im in plate_images],
        'note':'Same ten anatomy-defined suture paths; no new geometry. Original pigment inference. Rig and bake await actual material gate.'}
    (OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_MATERIAL_03_PREPARE_COMPLETE',flush=True)

def render():
    r=json.loads((OUT/'material-report.json').read_text())
    for key,p in [('scriptSha256',SCRIPT),('viewsSha256',VIEWS),('layoutSha256',LAYOUT),('clayReportSha256',CLAY_REPORT),('blendSha256',BLEND)]:
        if r[key]!=sha(p):raise RuntimeError('Frozen material input mismatch '+str(p))
    cfg=json.loads(VIEWS.read_text());manifest=OUT/'render-manifest.json';fresh(manifest)
    for view in cfg['views']:fresh(OUT/(view['name']+'.png'))
    bpy.ops.wm.open_mainfile(filepath=str(BLEND));s=bpy.context.scene
    s.render.resolution_x,s.render.resolution_y=cfg['resolution'];s.render.resolution_percentage=100;s.cycles.samples=cfg['samples']
    body=next(o for o in s.objects if o.type=='MESH' and o.name.startswith('Continuous Coccosteus skin'))
    material=body.data.materials[0];clay,_=make_mat('Relief inspection same neutral clay',(.40,.385,.355),.66)
    records=[]
    for spec in cfg['views']:
        for o in s.objects:
            if o.type=='MESH' and o.data.shape_keys:o.data.shape_keys.key_blocks['GapeStudy'].value=spec.get('gape',0)
        body.data.materials[0]=clay if spec.get('mode')=='clay' else material
        cam=s.camera;cam.location=spec['camera'];cam.rotation_euler=(Vector(spec['target'])-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=spec['scale']
        path=OUT/(spec['name']+'.png');s.render.filepath=str(path);bpy.context.view_layer.update();bpy.ops.render.render(write_still=True)
        records.append({'file':str(path),'bytes':path.stat().st_size,'sha256':sha(path),'view':spec})
        manifest.write_text(json.dumps({'source':str(BLEND),'sourceSha256':sha(BLEND),'scriptSha256':sha(SCRIPT),
            'viewsSha256':sha(VIEWS),'complete':len(records)==len(cfg['views']),'CPU':True,'threads':2,'renders':records},indent=2)+'\n')
    print('COCCOSTEUS_MATERIAL_03_RENDER_COMPLETE',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',required=True,choices=['prepare','render'])
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    prepare() if args.stage=='prepare' else render()
