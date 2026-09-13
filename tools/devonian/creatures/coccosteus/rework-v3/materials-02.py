"""Coccosteus material-02: granular bronze armour and resolved dermal/fin pigment.
Opens frozen material-01. Changes material/colour/coordinate attributes only.
Geometry, shape keys, vertex groups and faces are hash checked before/after.
Packed original procedural textures; no photograph or ImageGen input.
"""
import argparse,hashlib,json,math,random,struct,sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
ROOT=REPO.parent/'devonian-authoring/coccosteus/rework-v3'
SOURCE=ROOT/'material-01/coccosteus-material-01.blend'
SOURCE_REPORT=ROOT/'material-01/material-report.json'
OUT=ROOT/'material-02'
BLEND=OUT/'coccosteus-material-02.blend'
SCRIPT=Path(__file__).resolve()
VIEWS=HERE/'material-views-02.json'
EXPECTED_BLEND='1d6b2f537e21f826bf3751eae380de999184cfa140725a49782b310baa7d4429'
EXPECTED_REPORT='a172b6860beeb68c73ff6347caa6d915d8c8f0e27c772e470bf40a7e2417fefd'

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


def packed_mask(name,values):
    assert values.ndim==2 and np.isfinite(values).all()
    assert values.min()>=0 and values.max()<=1
    H,W=values.shape
    im=bpy.data.images.new(name,width=W,height=H,alpha=True,float_buffer=False)
    im.colorspace_settings.name='Non-Color'
    pixels=np.ones((H,W,4),np.float32);pixels[:,:,:3]=values[:,:,None]
    im.pixels.foreach_set(pixels.reshape(-1));im.update();im.pack()
    return im


def pigment_marks(side,W=2048,H=1024):
    """Resolved broken oblique bars/flecks, varying length, width and spacing.
    Parameter domain y -2.05..2.60 and side angle S 0..2; texels ~.0023 units.
    """
    yy=np.linspace(-2.05,2.60,W)[None,:];ss=np.linspace(0,2,H)[:,None]
    U=np.broadcast_to(yy,(H,W));S=np.broadcast_to(ss,(H,W));mask=np.zeros((H,W))
    rng=random.Random(1817152+side*173);cy=.14
    while cy<2.18:
        top=rng.uniform(.19,.34);bottom=rng.uniform(.85,1.09)
        lean=rng.uniform(.042,.085);wid=rng.uniform(.014,.025)
        center=cy+lean*(S-top)/(bottom-top)+.006*np.sin(S*33+cy*17)
        thickness=wid*(.62+.25*np.sin(S*21+cy*5)+.13*np.sin(S*63+cy*11))
        bar=1-smooth((np.abs(U-center)-thickness*.60)/(thickness*.75))
        end=smooth((S-top)/.055)*(1-smooth((S-bottom)/.065))
        # Two to four lobed narrowings, occasional partial break, not dots on every ray.
        lobes=.68+.32*smooth((np.sin(S*34+cy*19)+.6)/1.2)
        mask=np.maximum(mask,bar*end*lobes*rng.uniform(.72,.96))
        # A short lower flank dash belonging to this region, offset from the tall bar.
        sx=cy+rng.uniform(.004,.043);sc=rng.uniform(1.08,1.29)
        dash=np.exp(-(((U-sx-.18*(S-sc))/.016)**2+((S-sc)/.023)**2)**1.25)
        mask=np.maximum(mask,dash*rng.uniform(.65,.90))
        cy+=rng.uniform(.089,.158)
    for _ in range(95):
        cy=rng.uniform(.01,2.22);cs=rng.uniform(.20,1.29)
        rx=rng.uniform(.006,.015);rs=rng.uniform(.010,.026)
        speck=np.exp(-(((U-cy-.16*(S-cs))/rx)**2+((S-cs)/rs)**2)**1.25)
        mask=np.maximum(mask,speck*rng.uniform(.35,.75))
    return np.clip(mask,0,1)


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


def body_shader(images):
    mat,bs=make_mat('Coccosteus M02 | granular bone and patterned dermis',(.16,.10,.036),.76)
    n=mat.node_tree.nodes;l=mat.node_tree.links
    def attr(name):
        node=n.new('ShaderNodeAttribute');node.attribute_name=name;return node
    mask=attr('ArmorMask').outputs['Fac'];pigment=attr('Pigment').outputs['Color']
    uv=attr('PatternUV').outputs['Color'];side=attr('PatternSide').outputs['Fac']
    mark=mix_rgb(mat,side,image_node(mat,images[0],uv),image_node(mat,images[1],uv))
    dermis=mix_rgb(mat,math_node(mat,'MULTIPLY',mark,.83),pigment,(.015,.030,.034))
    tex=n.new('ShaderNodeTexCoord')
    def noise(scale,detail=2):
        t=n.new('ShaderNodeTexNoise');t.inputs['Scale'].default_value=scale;t.inputs['Detail'].default_value=detail
        t.inputs['Roughness'].default_value=.72;l.new(tex.outputs['Object'],t.inputs['Vector']);return t.outputs['Fac']
    patch=noise(10,3.2);mottle=noise(38,2.5);fine=noise(245,2)
    bronze=ramp(mat,patch,[(.22,(.063,.033,.011)),(.45,(.142,.083,.026)),(.65,(.257,.174,.061)),(.81,(.32,.242,.111))])
    # Nonuniform bony nodules at two scales; the low-frequency bronze remains visible.
    cells=n.new('ShaderNodeTexVoronoi');cells.inputs['Scale'].default_value=110
    l.new(tex.outputs['Object'],cells.inputs['Vector'])
    beads=ramp(mat,cells.outputs['Distance'],[(.13,(1.30,1.23,1.11)),(.35,(1.06,1.00,.89)),(.56,(.46,.42,.35))])
    bone=mix_rgb(mat,.58,bronze,beads,'MULTIPLY')
    mottles=ramp(mat,mottle,[(.25,(.66,.61,.49)),(.68,(1.09,1.08,1.04))])
    bone=mix_rgb(mat,.48,bone,mottles,'MULTIPLY')
    l.new(mix_rgb(mat,mask,dermis,bone),bs.inputs['Base Color'])
    # Fine grain is shader bump only; accepted anatomical displacement is untouched.
    beadheight=math_node(mat,'SUBTRACT',1,cells.outputs['Distance'])
    skinheight=noise(150,2.4)
    height=mix_rgb(mat,mask,skinheight,mix_rgb(mat,.20,beadheight,fine))
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.48;bump.inputs['Distance'].default_value=.0028
    l.new(height,bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
    rough=ramp(mat,mottle,[(.20,(.62,.62,.62)),(.75,(.83,.83,.83))])
    l.new(mix_rgb(mat,mask,(.46,.46,.46),rough),bs.inputs['Roughness'])
    bs.inputs['Specular IOR Level'].default_value=.19;bs.inputs['Coat Weight'].default_value=0
    return mat


def paint_body(body):
    v=np.array([tuple(p.co) for p in body.data.vertices]);N=len(v);assert N==48514
    ids=np.arange(N);sn=np.sin(2*np.pi*(ids%128)/128)
    S=np.arccos(np.clip(sn,-1,1))/(np.pi/2);outer=ids<=36352
    y=v[:,1];armor=np.array([d.value for d in body.data.attributes['ArmorMask'].data])
    # Keep the exact material01 anatomical region boundary; relief alone owns sutures.
    dorsal=smooth((.98-S)/.75);ventral=smooth((S-1.08)/.53)
    color=np.tile([.142,.181,.185],(N,1))*(1-.32*dorsal[:,None])
    color=color*(1-.79*ventral[:,None])+np.array([.281,.277,.188])*.79*ventral[:,None]
    color*=1+(.035*np.sin(y*19+v[:,2]*13))[:,None]
    attribute(body,'Pigment',color)
    attribute(body,'PatternUV',np.column_stack(((y+2.05)/4.65,S/2,np.zeros(N))))
    attribute(body,'PatternSide',smooth((v[:,0]+.025)/.05),'FLOAT')
    images=[packed_mask('M02 original dermal pigment '+str(side),pigment_marks(side)) for side in [-1,1]]
    body.data.materials[0]=body_shader(images)
    return [im.name for im in images]


def fin_field(kind,W=1024,H=1024):
    # Coordinate domains match each physical fan. Resolve rays per texel, not per vertex.
    if kind in ['pectoral','pelvic']:
        u=np.linspace(0,.90,W)[None,:];v=np.linspace(-.95,1.20,H)[:,None]
        rootx,rooty=(.22,-.48) if kind=='pectoral' else (.12,.42)
        dx=u-rootx;dy=v-rooty
        angle=np.arctan2(dy,np.maximum(.018,dx));span=np.clip(dx/(.53 if kind=='pectoral' else .32),0,1)
        phase=angle*(28 if kind=='pectoral' else 24)
    else:
        u=np.linspace(.05,2.70,W)[None,:];v=np.linspace(-.55,1.10,H)[:,None]
        oy,oz=(.36,.31) if kind=='dorsal' else (1.54,.22)
        angle=np.arctan2(v-oz,u-oy);span=np.clip(np.abs(v-oz)/.35,0,1)
        phase=angle*(35 if kind=='dorsal' else 38)
    rays=np.exp(-(np.sin(phase+.026*np.sin(u*21))/.14)**2)
    return np.clip(rays*smooth(span/.14),0,1)


def paint_fins():
    records=[];textures=[]
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        kind=next((x for x in ['pectoral','pelvic','dorsal','caudal'] if x in o.name),None)
        if not kind:continue
        vv=np.array([tuple(v.co) for v in o.data.vertices]);x=np.abs(vv[:,0]);y=vv[:,1];z=vv[:,2]
        if kind in ['pectoral','pelvic']:
            uv=np.column_stack((x/.90,(y+.95)/2.15,np.zeros(len(vv))))
            span=np.clip((x-(.22 if kind=='pectoral' else .12))/(.53 if kind=='pectoral' else .32),0,1)
        else:
            uv=np.column_stack(((y-.05)/2.65,(z+.55)/1.65,np.zeros(len(vv))))
            span=np.clip(np.abs(z-(.31 if kind=='dorsal' else .22))/.35,0,1)
        attribute(o,'PatternUV',uv)
        color=np.tile([.147,.120,.052],(len(vv),1))*(1-.16*span[:,None])
        color=color*(1-.32*span[:,None])+np.array([.107,.137,.111])*.32*span[:,None]
        attribute(o,'Pigment',color)
        im=packed_mask('M02 original '+o.name+' fine rays',fin_field(kind));textures.append(im.name)
        mat,bs=make_mat('Coccosteus M02 | '+o.name+' resolved fin rays',(.14,.12,.06),.62)
        n=mat.node_tree.nodes;l=mat.node_tree.links
        uvnode=n.new('ShaderNodeAttribute');uvnode.attribute_name='PatternUV'
        rays=image_node(mat,im,uvnode.outputs['Color'])
        p=n.new('ShaderNodeAttribute');p.attribute_name='Pigment'
        col=mix_rgb(mat,math_node(mat,'MULTIPLY',rays,.66),p.outputs['Color'],(.034,.042,.021))
        l.new(col,bs.inputs['Base Color'])
        bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00085;bump.inputs['Strength'].default_value=.30
        l.new(rays,bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
        bs.inputs['Specular IOR Level'].default_value=.17
        o.data.materials.clear();o.data.materials.append(mat);records.append(o.name)
    assert len(records)==6;return records,textures


def prepare():
    if sha(SOURCE)!=EXPECTED_BLEND:raise RuntimeError('Frozen material01 blend mismatch')
    if sha(SOURCE_REPORT)!=EXPECTED_REPORT:raise RuntimeError('Frozen source report hash mismatch')
    report01=json.loads(SOURCE_REPORT.read_text())
    if report01['blendSha256']!=EXPECTED_BLEND:raise RuntimeError('Frozen source report mismatch')
    OUT.mkdir(parents=True,exist_ok=True);fresh(BLEND);fresh(OUT/'material-report.json')
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Continuous Coccosteus skin'))
    before=specimen_digest();oralbefore,_=oral_digest(body)
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.data.shape_keys:o.data.shape_keys.key_blocks['GapeStudy'].value=0
    images=paint_body(body);fins,finimages=paint_fins()
    after=specimen_digest();oralafter,_=oral_digest(body)
    assert before==after,'Geometry, deformation or topology changed during material-only pass'
    assert oralbefore==oralafter,'Oral ownership changed'
    s=bpy.context.scene;s['candidate']='Coccosteus material-02 PREVIEW; original continuous pigment and granular bronze'
    s['source_sha256']=sha(SCRIPT);s['material01_source_sha256']=EXPECTED_BLEND
    s.render.engine='CYCLES';s.cycles.device='CPU';s.render.threads_mode='FIXED';s.render.threads=2
    s.cycles.seed=71204;s.cycles.use_animated_seed=False;s.cycles.samples=48
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report={'stage':'material-only-study','notApproved':True,'sourceBlend':str(SOURCE),'sourceBlendSha256':EXPECTED_BLEND,
        'sourceReportSha256':sha(SOURCE_REPORT),'scriptSha256':sha(SCRIPT),'viewsSha256':sha(VIEWS),'blend':str(BLEND),'blendSha256':sha(BLEND),
        'geometry':{'before':before,'after':after,'oralBefore':oralbefore,'oralAfter':oralafter,'unchanged':before==after},
        'packedOriginalPigmentMaps':images+finimages,'fins':fins,
        'note':'Original procedural pigment; artistic colour inference. No geometry changes. Full shader bake/runtime palette review still required.'}
    (OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_MATERIAL_02_PREPARE_COMPLETE',flush=True)

def render():
    r=json.loads((OUT/'material-report.json').read_text())
    for key,p in [('scriptSha256',SCRIPT),('viewsSha256',VIEWS),('blendSha256',BLEND)]:
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
    print('COCCOSTEUS_MATERIAL_02_RENDER_COMPLETE',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',required=True,choices=['prepare','render'])
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    prepare() if args.stage=='prepare' else render()
