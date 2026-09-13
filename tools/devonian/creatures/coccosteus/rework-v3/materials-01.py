"""Coccosteus material-01: region-authored plate relief, dermis and fin study.
Reads frozen clay-04, writes a new editable material study only. Does not publish.
Procedural shaders require a later authored bake before glTF/runtime validation.
"""
import argparse,hashlib,json,math,random,struct,sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
ROOT=REPO.parent/'devonian-authoring/coccosteus/rework-v3'
SOURCE=ROOT/'clay-04/coccosteus-clay-04.blend'
SOURCE_REPORT=ROOT/'clay-04/build-report.json'
OUT=ROOT/'material-01'
BLEND=OUT/'coccosteus-material-01.blend'
SCRIPT=Path(__file__).resolve()
LAYOUT=HERE/'armour-layout-01.json'
VIEWS=HERE/'material-views-01.json'
EXPECTED_BLEND='de46eb02497bbca59807d76bca5c97ab8b1998d019b6f415e71f34756e78ce9e'


def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def fresh(p):
    if p.exists():raise RuntimeError('Refusing to overwrite candidate evidence: '+str(p))
def smooth(x):
    x=np.clip(x,0,1);return x*x*(3-2*x)

def curve(points):
    p=np.asarray(points,float);out=[]
    for i in range(len(p)-1):
        a,b,c,d=p[max(0,i-1)],p[i],p[i+1],p[min(len(p)-1,i+2)]
        for j in range(10):
            t=j/10
            out.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    out.append(p[-1]);return out

def distance(U,S,points,head=False):
    # Approximate surface metric in authoring units, not a decorative UV grid.
    scales=np.array([.95 if head else 1.,.48])
    p=[x*scales for x in curve(points)]
    X=U*scales[0];Y=S*scales[1];out=np.full_like(X,100.)
    for a,b in zip(p,p[1:]):
        d=b-a;t=np.clip(((X-a[0])*d[0]+(Y-a[1])*d[1])/max(1e-12,float(d@d)),0,1)
        out=np.minimum(out,np.sqrt((X-a[0]-t*d[0])**2+(Y-a[1]-t*d[1])**2))
    return out

def relief_field(U,S,config,head=False):
    shade=np.zeros_like(U);height=np.zeros_like(U)
    for item in config['head' if head else 'thorax']:
        d=distance(U,S,item['points'],head)
        seam=np.exp(-(d/item['width'])**2)
        shade=np.maximum(shade,seam)
        # Narrow soft incision and a restrained rounded margin, part of the same skin.
        height-=item['depth']*seam
        height+=.00075*np.exp(-((d-item['width']*1.8)/(item['width']*.8))**2)
    for patch in config['head_curvature' if head else 'thorax_curvature']:
        c=patch['center'];r=patch['radius']
        field=np.exp(-1.7*((U-c[0])/r[0])**2-1.7*((S-c[1])/r[1])**2)
        height+=patch['height']*field*(1-.55*shade)
    return shade,height

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

def dermal_shader():
    mat,bs=make_mat('Coccosteus | bone armour and flexible dermis',(.22,.16,.07),.6)
    n=mat.node_tree.nodes;l=mat.node_tree.links
    pigment=n.new('ShaderNodeAttribute');pigment.attribute_name='Pigment';l.new(pigment.outputs['Color'],bs.inputs['Base Color'])
    mask=n.new('ShaderNodeAttribute');mask.attribute_name='ArmorMask'
    tex=n.new('ShaderNodeTexCoord')
    grain=n.new('ShaderNodeTexVoronoi');grain.inputs['Scale'].default_value=230.;l.new(tex.outputs['Object'],grain.inputs['Vector'])
    leather=n.new('ShaderNodeTexNoise');leather.inputs['Scale'].default_value=115;leather.inputs['Detail'].default_value=2.4;leather.inputs['Roughness'].default_value=.68;l.new(tex.outputs['Object'],leather.inputs['Vector'])
    mix=n.new('ShaderNodeMixRGB');mix.blend_type='MIX';l.new(mask.outputs['Fac'],mix.inputs[0]);l.new(leather.outputs['Fac'],mix.inputs[1]);l.new(grain.outputs['Distance'],mix.inputs[2])
    bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.0017
    l.new(mix.outputs['Color'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
    rough=n.new('ShaderNodeMapRange');rough.inputs['From Min'].default_value=0;rough.inputs['From Max'].default_value=1;rough.inputs['To Min'].default_value=.48;rough.inputs['To Max'].default_value=.69
    l.new(mask.outputs['Fac'],rough.inputs['Value']);l.new(rough.outputs['Result'],bs.inputs['Roughness'])
    bs.inputs['Specular IOR Level'].default_value=.22;bs.inputs['Coat Weight'].default_value=.018
    return mat

def fin_shader():
    mat,bs=make_mat('Coccosteus | cambered dermal fin membrane',(.15,.13,.065),.64)
    n=mat.node_tree.nodes;l=mat.node_tree.links
    pigment=n.new('ShaderNodeAttribute');pigment.attribute_name='Pigment';l.new(pigment.outputs['Color'],bs.inputs['Base Color'])
    tex=n.new('ShaderNodeTexCoord');noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=155.;noise.inputs['Detail'].default_value=2.;l.new(tex.outputs['Object'],noise.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.inputs['Distance'].default_value=.00065;bump.inputs['Strength'].default_value=.20;l.new(noise.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],bs.inputs['Normal'])
    bs.inputs['Specular IOR Level'].default_value=.17
    return mat

def rotate_delta(d,w):
    x,y,z=d;sw,jw,bw=w
    sy=y*math.cos(-.041)-z*math.sin(-.041);sz=y*math.sin(-.041)+z*math.cos(-.041)
    jy=y*math.cos(.34)-z*math.sin(.34);jz=y*math.sin(.34)+z*math.cos(.34)
    return Vector((x,y*bw+sy*sw+jy*jw,z*bw+sz*sw+jz*jw))

def paint_body(body,source_report):
    cfg=json.loads(LAYOUT.read_text());v=np.array([tuple(p.co) for p in body.data.vertices],float)
    N=len(v);assert N==48514,'Unexpected coarse specimen topology'
    ids=np.arange(N);a=2*np.pi*(ids%128)/128;sn=np.sin(a);S=np.arccos(np.clip(sn,-1,1))/(np.pi/2)
    y=v[:,1];t=(ids//128)/112
    head=(ids<=112*128+127);outer=(ids<=36352)
    before,oral_ids=oral_digest(body);protected=np.zeros(N,bool);protected[oral_ids]=True
    headshade,headh=relief_field(t,S,cfg,True);bodyshade,bodyh=relief_field(y,S,cfg,False)
    headfade=smooth((t-.045)/.12)*(1-smooth((t-.83)/.17))*(1-smooth((S-1.20)/.40))
    bodyfade=smooth((y+.72)/.13)*(1-smooth((y-.03)/.28))*(1-smooth((S-1.38)/.38))
    for eye in source_report['orbitalSites']:
        point=np.asarray(eye['surface'])
        dist=np.sqrt(((v-point)**2).sum(1))
        headfade*=smooth((dist-.085)/.070)
    relief=np.where(head,headh*headfade,bodyh*bodyfade)
    relief[protected|~outer]=0
    assert np.max(np.abs(relief))<.014,'Relief exceeded authored anatomical bound'
    seam=np.where(head,headshade*headfade,bodyshade*bodyfade)
    # Apply the same anatomical displacement to Basis and the study key.
    normals=[p.normal.copy() for p in body.data.vertices]
    group_names={g.index:g.name for g in body.vertex_groups}
    for i,value in enumerate(relief):
        if abs(value)<1e-12:continue
        delta=normals[i]*float(value)
        weights={group_names[g.group]:g.weight for g in body.data.vertices[i].groups}
        w=(weights.get('skull',0),weights.get('jaw',0),weights.get('body',0))
        body.data.shape_keys.key_blocks['Basis'].data[i].co+=delta
        body.data.shape_keys.key_blocks['GapeStudy'].data[i].co+=rotate_delta(delta,w)
        body.data.vertices[i].co=body.data.shape_keys.key_blocks['Basis'].data[i].co
    body.data.update()
    after,_=oral_digest(body);assert after==before,'Oral geometry/weights changed during relief'
    # Armour follows the actual shaped shield boundary; head/ventral jaw remain distinct.
    border=.14-.23*(1-sn*sn)*smooth((sn+.6)/.8)
    armor=1-smooth((y-border+.018)/.052)
    armor*=outer
    armor[head & (S>1.55)]*=.6
    variation=.035*np.sin(23*y+8*v[:,2])+.025*np.sin(57*v[:,0]-17*y+3*np.sin(y*8))
    bone=np.tile([.238,.163,.066],(N,1))*(1+variation[:,None])
    roofshade=.15*smooth((v[:,2]-.08)/.36);bone*=1-roofshade[:,None]
    bone*=1-.24*seam[:,None]
    # Soft back reads cooler, darker above, and lighter below. No large scales.
    dermis=np.tile([.137,.194,.204],(N,1))
    dorsal=smooth((1.0-S)/.70)
    dermis=dermis*(1-.34*dorsal[:,None])
    ventral=smooth((S-1.07)/.55)
    dermis=dermis*(1-.63*ventral[:,None])+np.array([.34,.337,.23])*.63*ventral[:,None]
    # Deterministic irregular short oblique bars plus smaller flecks, pigment only.
    rng=random.Random(1817152);dark=np.zeros(N);yy=.15
    U=y+np.sign(v[:,0])*.016*np.sin(y*7+.5)
    while yy<2.12:
        top=rng.uniform(.20,.43);bottom=top+rng.uniform(.23,.48);lean=rng.uniform(.025,.09)
        points=[[yy,top],[yy+lean*.3,(top+bottom)/2],[yy+lean,bottom]]
        d=distance(U,S,points)
        dark=np.maximum(dark,rng.uniform(.26,.43)*np.exp(-(d/rng.uniform(.010,.017))**2))
        yy+=rng.uniform(.075,.143)
    for _ in range(130):
        cy=rng.uniform(.06,2.12);cs=rng.uniform(.42,1.24);radius=rng.uniform(.008,.020)
        spot=np.exp(-((U-cy)/radius)**2-((S-cs)/(radius*1.7))**2)
        dark=np.maximum(dark,spot*rng.uniform(.18,.38))
    dermis*=1-dark[:,None]*(1-ventral[:,None]*.60)
    dermis*=1+variation[:,None]*.6
    color=bone*armor[:,None]+dermis*(1-armor[:,None])
    # Mandibular underside and lip tissue are lighter and less granular than roofing bone.
    jaw=head & (sn<0)
    jawblend=smooth((S-1.18)/.65)*head
    color=color*(1-.32*jawblend[:,None])+np.array([.31,.274,.178])*.32*jawblend[:,None]
    color=np.clip(color,.005,.65)
    attribute(body,'Pigment',color);attribute(body,'ArmorMask',armor,'FLOAT')
    body.data.materials[0]=dermal_shader()
    oral,bs=make_mat('Coccosteus | subdued living oral tissues',(.095,.034,.028),.54)
    bs.inputs['Specular IOR Level'].default_value=.22;body.data.materials[1]=oral
    return {'oralBefore':before,'oralAfter':after,'protectedOralVertices':len(oral_ids),
            'maxAbsoluteRelief':float(np.max(np.abs(relief))),'platePaths':len(cfg['head'])+len(cfg['thorax']),
            'unchangedTopology':True,'proceduralBakingStillRequired':True}

def paint_fins():
    mat=fin_shader();records=[]
    for o in bpy.context.scene.objects:
        if o.type!='MESH' or not any(x in o.name for x in ['pectoral','pelvic','dorsal','caudal']):continue
        vv=np.array([tuple(v.co) for v in o.data.vertices]);x=np.abs(vv[:,0]);y=vv[:,1];z=vv[:,2]
        if 'pectoral' in o.name:
            span=np.clip((x-.25)/.51,0,1);angle=np.arctan2(y+.48,np.maximum(.03,x-.22));phase=angle*15
        elif 'pelvic' in o.name:
            span=np.clip((x-.14)/.30,0,1);angle=np.arctan2(y-.42,np.maximum(.03,x-.12));phase=angle*13
        else:
            origin_y=.36 if 'dorsal' in o.name else 1.54
            angle=np.arctan2(z-(.31 if 'dorsal' in o.name else .22),y-origin_y)
            phase=angle*(19 if 'dorsal' in o.name else 21)
            span=np.clip(np.abs(z-(.33 if 'dorsal' in o.name else .25))/.40,0,1)
        rays=np.exp(-np.sin(phase+.06*np.sin(y*13))**2/.055)*smooth(span/.35)
        color=np.tile([.154,.140,.077],(len(vv),1))*(1-.29*rays[:,None])
        color=color*(1-.24*span[:,None])+np.array([.085,.118,.105])*.24*span[:,None]
        root=1-smooth(span/.30);color=color*(1-.18*root[:,None])+np.array([.20,.145,.065])*.18*root[:,None]
        attribute(o,'Pigment',np.clip(color,.008,.7));o.data.materials.clear();o.data.materials.append(mat)
        records.append(o.name)
    assert len(records)==6,'Unexpected fin family';return records

def paint_eyes(report):
    mat,bs=make_mat('Coccosteus | recessed dark pupil and muted iris',(.007,.010,.009),.17)
    bs.inputs['Coat Weight'].default_value=.20;bs.inputs['Coat Roughness'].default_value=.16
    n=mat.node_tree.nodes;l=mat.node_tree.links;vc=n.new('ShaderNodeAttribute');vc.attribute_name='Pigment';l.new(vc.outputs['Color'],bs.inputs['Base Color'])
    for spec in report['orbitalSites']:
        sign=spec['side'];o=bpy.data.objects['Lateral anatomical orbital study '+str(sign)]
        center=Vector(spec['center']);normal=Vector(spec['normal'])
        u=Vector((0,1,0));u=(u-normal*u.dot(normal)).normalized();v=normal.cross(u).normalized()
        colors=[]
        for vert in o.data.vertices:
            q=vert.co-center;xx=q.dot(u)/.078;yy=q.dot(v)/.071;rho=math.sqrt(xx*xx+yy*yy)
            iris=float(smooth((rho-.47)/.11)*(1-smooth((rho-.82)/.10))) if q.dot(normal)>0 else 0
            fleck=.9+.10*math.sin(math.atan2(yy,xx)*29+rho*15)
            colors.append(np.array([.004,.007,.008])*(1-iris)+np.array([.18,.157,.069])*iris*fleck)
        attribute(o,'Pigment',colors);o.data.materials.clear();o.data.materials.append(mat)

def prepare():
    if sha(SOURCE)!=EXPECTED_BLEND:raise RuntimeError('Frozen clay04 blend mismatch')
    OUT.mkdir(parents=True,exist_ok=True);fresh(BLEND);fresh(OUT/'material-report.json')
    source_report=json.loads(SOURCE_REPORT.read_text())
    if source_report['blendSha256']!=EXPECTED_BLEND:raise RuntimeError('Clay04 report does not identify frozen blend')
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    body=next(o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('Continuous Coccosteus skin'))
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.data.shape_keys:
            o.data.shape_keys.key_blocks['GapeStudy'].value=0
    geometry=paint_body(body,source_report);fins=paint_fins();paint_eyes(source_report)
    scene=bpy.context.scene;scene['candidate']='Coccosteus material-01 PREVIEW; anatomy-aware relief and dermis'
    scene['source_sha256']=sha(SCRIPT);scene['coarse_source_sha256']=EXPECTED_BLEND
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.cycles.seed=71204;scene.cycles.use_animated_seed=False;scene.cycles.samples=48
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
    report={'stage':'material-study','notApproved':True,'sourceBlend':str(SOURCE),'sourceBlendSha256':EXPECTED_BLEND,
            'sourceReportSha256':sha(SOURCE_REPORT),'scriptSha256':sha(SCRIPT),'layoutSha256':sha(LAYOUT),
            'viewsSha256':sha(VIEWS),'blend':str(BLEND),'blendSha256':sha(BLEND),
            'geometry':geometry,'fins':fins,'note':'Pigment is artistic inference. Procedural shaders need later baking before GLB/runtime palette checks.'}
    (OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('COCCOSTEUS_MATERIAL_01_PREPARE_COMPLETE',flush=True)

def render():
    r=json.loads((OUT/'material-report.json').read_text())
    for key,p in [('scriptSha256',SCRIPT),('layoutSha256',LAYOUT),('viewsSha256',VIEWS),('blendSha256',BLEND)]:
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
    print('COCCOSTEUS_MATERIAL_01_RENDER_COMPLETE',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',required=True,choices=['prepare','render'])
    args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    prepare() if args.stage=='prepare' else render()
