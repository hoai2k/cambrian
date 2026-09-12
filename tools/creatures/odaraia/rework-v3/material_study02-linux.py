"""Astra-frozen Odaraia material02 study. Terra executes HASHED_HANDOFF_MATERIAL02.md.
Loads accepted clay02 unchanged; no shared builder, rig, GLB or public asset writes.
"""
import bpy, json, math, hashlib, struct
# Versioned root-authored material response study; original01 is immutable.
from pathlib import Path
from mathutils import Vector, Matrix
ROOT=Path('/home/user/expansion-authoring/odaraia-rework')
INPUT=ROOT/'clay02/odaraia-clay02.blend'
WANT='6f56f94f49b7b7528d085a95dacf8aaaac2dfc6adcb059f32a14586a6f1ee4d7'  # this checkout's re-derived clay02 blend; the Mac's d5ec458... does not reproduce byte-for-byte on a different machine/Blender build (geometry verified equivalent separately: 213 objects, 175868 vertices, Carapace 65x73x2=9490 vertices, matching geometry-report.json and material_study02.py's own hardcoded shell-sampling assertion)
OUT=ROOT/'material02'
if hashlib.sha256(INPUT.read_bytes()).hexdigest()!=WANT:raise RuntimeError('Accepted clay02 blend hash mismatch; return to Astra')
if OUT.exists():raise RuntimeError('material02 already exists; preserve evidence and return to Astra')
OUT.mkdir(parents=True)
bpy.ops.wm.open_mainfile(filepath=str(INPUT))
SCENE=bpy.context.scene
MODEL=[o for o in SCENE.objects if o.type=='MESH']

def geometry_hash():
    h=hashlib.sha256()
    for ob in sorted(MODEL,key=lambda x:x.name):
        h.update(ob.name.encode())
        for row in ob.matrix_world:
            h.update(struct.pack('<4f',*row))
        for v in ob.data.vertices:h.update(struct.pack('<3f',*v.co))
        for p in ob.data.polygons:h.update(struct.pack('<I',len(p.vertices))+struct.pack('<'+'I'*len(p.vertices),*p.vertices))
    return h.hexdigest()
BEFORE=geometry_hash()

def shader(name,lo,hi,roughness,scale=4.0,bump_strength=.10,bump_distance=.004):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes;l=m.node_tree.links;n.clear()
    output=n.new('ShaderNodeOutputMaterial');output.location=(660,80)
    p=n.new('ShaderNodeBsdfPrincipled');p.location=(350,80)
    p.inputs['Roughness'].default_value=roughness
    p.inputs['Metallic'].default_value=0
    p.inputs['IOR'].default_value=1.38
    geo=n.new('ShaderNodeNewGeometry');geo.location=(-900,50)
    noise=n.new('ShaderNodeTexNoise');noise.location=(-650,160)
    noise.inputs['Scale'].default_value=scale;noise.inputs['Detail'].default_value=3.0
    noise.inputs['Roughness'].default_value=.64;l.new(geo.outputs['Position'],noise.inputs['Vector'])
    ramp=n.new('ShaderNodeValToRGB');ramp.location=(-380,200)
    ramp.color_ramp.elements[0].position=.2;ramp.color_ramp.elements[0].color=(*lo,1)
    ramp.color_ramp.elements[1].position=.8;ramp.color_ramp.elements[1].color=(*hi,1)
    l.new(noise.outputs['Fac'],ramp.inputs['Fac']);l.new(ramp.outputs['Color'],p.inputs['Base Color'])
    fine=n.new('ShaderNodeTexNoise');fine.location=(-650,-160)
    fine.inputs['Scale'].default_value=95;fine.inputs['Detail'].default_value=2.0
    l.new(geo.outputs['Position'],fine.inputs['Vector'])
    bump=n.new('ShaderNodeBump');bump.location=(80,-130)
    bump.inputs['Strength'].default_value=bump_strength;bump.inputs['Distance'].default_value=bump_distance
    l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs['Normal'],p.inputs['Normal'])
    l.new(p.outputs['BSDF'],output.inputs['Surface'])
    m.diffuse_color=(*hi,1)
    return m,p,output,noise

body,_,_,_=shader('Study02 | warm ochre organic trunk',(.046,.031,.014),(.23,.15,.048),.59,5.2,.14,.005)
limb,_,_,_=shader('Study02 | copper articulated endopods',(.075,.020,.012),(.31,.105,.037),.58,9,.13,.003)
paddle,_,_,_=shader('Study02 | amber lamellate paddles',(.072,.064,.022),(.28,.22,.065),.64,8,.10,.002)
filters,_,_,_=shader('Study02 | dark fine filter endites',(.070,.047,.016),(.19,.115,.034),.59,8,.05,.002)
mouth,_,_,_=shader('Study02 | ochre mouth apparatus',(.065,.034,.015),(.24,.15,.046),.58,8,.11,.003)
eye,eye_p,_,_=shader('Study02 | deep teal compound-eye surface',(.004,.010,.011),(.018,.040,.037),.44,30,.045,.0007)
# Restrained corneal sheen only: no invented luminous pupil or painted iris.
eye_p.inputs['Coat Weight'].default_value=.035;eye_p.inputs['Coat Roughness'].default_value=.45
eye_p.inputs['Specular IOR Level'].default_value=.26
shell,sp,so,snoise=shader('Study02 | translucent olive amber rigid shell',(.028,.044,.012),(.22,.205,.054),.63,4.6,.17,.0025)
sp.inputs['Coat Weight'].default_value=0;sp.inputs['Coat Roughness'].default_value=.60
sp.inputs['IOR'].default_value=1.16
sp.inputs['Specular IOR Level'].default_value=.24
# Coverage blending preserves clear internal silhouettes without refractive lens distortion.
# Per-surface coverage .28–.40, growing to .46–.58 at a true geometric margin.
# Existing real shell thickness means two surfaces accumulate naturally.
n=shell.node_tree.nodes;l=shell.node_tree.links
attr=n.new('ShaderNodeAttribute');attr.attribute_name='odaraia_shell_margin';attr.location=(-640,-420)
rm=n.new('ShaderNodeMath');rm.operation='MULTIPLY';rm.inputs[1].default_value=.18
l.new(attr.outputs['Fac'],rm.inputs[0])
var=n.new('ShaderNodeMath');var.operation='MULTIPLY';var.inputs[1].default_value=.12
l.new(snoise.outputs['Fac'],var.inputs[0])
a=n.new('ShaderNodeMath');a.operation='ADD';l.new(rm.outputs[0],a.inputs[0]);l.new(var.outputs[0],a.inputs[1])
b=n.new('ShaderNodeMath');b.operation='ADD';b.inputs[1].default_value=.28;l.new(a.outputs[0],b.inputs[0])
t=n.new('ShaderNodeBsdfTransparent');t.inputs[0].default_value=(1,1,1,1)
mix=n.new('ShaderNodeMixShader');mix.location=(640,80)
l.new(b.outputs[0],mix.inputs[0]);l.new(t.outputs[0],mix.inputs[1]);l.new(sp.outputs['BSDF'],mix.inputs[2]);l.new(mix.outputs[0],so.inputs['Surface'])
so.location=(870,80)
shell.diffuse_color=(.19,.20,.052,.34)
# Soft irregular pigment clouds retain cuticle opacity without glass-clear white bands.
# World-space modulation is temporary study shading; production must bake in rest space.
for mat in (body,limb,paddle,shell):
    ns=mat.node_tree.nodes;ls=mat.node_tree.links
    principal=next(q for q in ns if q.type=='BSDF_PRINCIPLED')
    original=principal.inputs['Base Color'].links[0].from_socket
    geo=next(q for q in ns if q.type=='NEW_GEOMETRY')
    cloud=ns.new('ShaderNodeTexNoise');cloud.inputs['Scale'].default_value=17
    cloud.inputs['Detail'].default_value=2.4;cloud.inputs['Roughness'].default_value=.68
    ls.new(geo.outputs['Position'],cloud.inputs['Vector'])
    shade=ns.new('ShaderNodeValToRGB')
    shade.color_ramp.elements[0].position=.30;shade.color_ramp.elements[0].color=(.30,.35,.28,1)
    shade.color_ramp.elements[1].position=.68;shade.color_ramp.elements[1].color=(1,1,.86,1)
    ls.new(cloud.outputs['Fac'],shade.inputs['Fac'])
    mult=ns.new('ShaderNodeMixRGB');mult.blend_type='MULTIPLY';mult.inputs[0].default_value=.58
    ls.new(original,mult.inputs[1]);ls.new(shade.outputs['Color'],mult.inputs[2]);ls.new(mult.outputs[0],principal.inputs['Base Color'])
# Fine compound surface cues: subtle cellular relief, no painted fish iris or pupil.
ns=eye.node_tree.nodes;ls=eye.node_tree.links
geo=next(q for q in ns if q.type=='NEW_GEOMETRY')
facets=ns.new('ShaderNodeTexVoronoi');facets.feature='DISTANCE_TO_EDGE';facets.inputs['Scale'].default_value=140
ls.new(geo.outputs['Position'],facets.inputs['Vector'])
facetbump=ns.new('ShaderNodeBump');facetbump.inputs['Strength'].default_value=.17;facetbump.inputs['Distance'].default_value=.0007
ls.new(facets.outputs['Distance'],facetbump.inputs['Height']);ls.new(facetbump.outputs['Normal'],eye_p.inputs['Normal'])
coat=None;cutaway=None
for ob in MODEL:
    if ob.name.startswith('Carapace |'):
        coat=ob;mat=shell
        # Frozen clay02 U-shell topology: 65 longitudinal samples ×73 angular samples ×2 skins.
        if len(ob.data.vertices)!=65*73*2:raise RuntimeError('Unexpected shell sampling; no attribute remap authorized')
        attribute=ob.data.attributes.new('odaraia_shell_margin','FLOAT','POINT')
        for index,d in enumerate(attribute.data):
            q=index%(65*73);row=q//73;column=q%73
            ventral=abs(column/72*2-1)**12
            aperture=math.exp(-(min(row,64-row)/2.0)**2)
            d.value=max(ventral,aperture)
    elif ob.name.startswith('Study only |'):
        cutaway=ob;ob.hide_render=True;continue
    elif 'compound globe' in ob.name:mat=eye
    elif ob.name.startswith('Mouth'):mat=mouth
    elif 'spinose filtering' in ob.name:mat=filters
    elif 'lamellate exopod' in ob.name:mat=paddle
    elif 'endopod' in ob.name:mat=limb
    else:mat=body
    ob.data.materials.clear();ob.data.materials.append(mat)
    ob.hide_render=False
if coat is None or cutaway is None:raise RuntimeError('Required clay02 study objects absent')
AFTER=geometry_hash()
if BEFORE!=AFTER:raise RuntimeError('Material pass changed authored geometry; stop')

SCENE.render.engine='CYCLES';SCENE.cycles.samples=48;SCENE.cycles.use_denoising=True
SCENE.cycles.transparent_max_bounces=12
SCENE.render.resolution_x=1600;SCENE.render.resolution_y=1200;SCENE.render.resolution_percentage=100
SCENE.render.image_settings.file_format='PNG';SCENE.render.film_transparent=False
SCENE.view_settings.view_transform='AgX'
camera=SCENE.camera;camera.data.type='ORTHO'

def camera_setup(pos,target):
    camera.location=pos
    back=(camera.location-Vector(target)).normalized()
    up=Vector((0,1,0))-back*back.dot(Vector((0,1,0)));up.normalize()
    right=up.cross(back).normalized();up=back.cross(right).normalized()
    camera.rotation_euler=Matrix((right,up,back)).transposed().to_euler()
    pts=[ob.matrix_world@v.co for ob in MODEL if not ob.hide_render for v in ob.data.vertices]
    xs=[p.dot(right) for p in pts];ys=[p.dot(up) for p in pts]
    mx=(max(xs)+min(xs))/2;my=(max(ys)+min(ys))/2
    camera.location+=right*(mx-camera.location.dot(right))+up*(my-camera.location.dot(up))
    camera.data.ortho_scale=1;f=camera.data.view_frame(scene=SCENE)
    w=max(p.x for p in f)-min(p.x for p in f);h=max(p.y for p in f)-min(p.y for p in f)
    camera.data.ortho_scale=max((max(xs)-min(xs))/w,(max(ys)-min(ys))/h)*1.12
    return {'position':list(camera.location),'up':list(up),'orthoScale':camera.data.ortho_scale}

# Background world changes colour only; lighting strength is held to compare visibility.
VIEWS=[
 ('01-oblique-dark',(-8,3.3,5),(0,.12,-.30),'dark'),
 ('02-side-dark',(-10,.18,-.25),(0,.18,-.25),'dark'),
 ('03-front-dark',(0,.9,10),(0,.15,-.20),'dark'),
 ('04-oblique-light',(-8,3.3,5),(0,.12,-.30),'light'),
 ('05-side-light',(-10,.18,-.25),(0,.18,-.25),'light'),
 ('06-dorsal-underside-light',(-6,-6,4),(0,-.10,-.30),'light'),
]
world=SCENE.world;world.use_nodes=True
background=world.node_tree.nodes.get('Background')
if background is None:raise RuntimeError('Expected clay02 world background missing')
records=[]
for name,pos,target,tone in VIEWS:
    background.inputs['Color'].default_value=(*((.016,.046,.061) if tone=='dark' else (.36,.48,.49)),1)
    background.inputs['Strength'].default_value=.45
    record=camera_setup(pos,target);record.update({'view':name,'background':tone});records.append(record)
    SCENE.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
# Save editable normal dark-oblique study, preserving the accepted clay source separately.
background.inputs['Color'].default_value=(.016,.046,.061,1)
camera_setup(VIEWS[0][1],VIEWS[0][2])
SCENE['odaraia_stage']='material02 UNREVIEWED: study only, no game material/rig approval'
SCENE['odaraia_source_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'odaraia-material02.blend'))
report={'inputBlendSha256':WANT,'sourceSha256':SCENE['odaraia_source_sha256'],
 'geometryBefore':BEFORE,'geometryAfter':AFTER,'geometryPreserved':BEFORE==AFTER,
 'shellCoverage':{'base':.28,'noiseRange':.12,'physicalMarginAddition':.18,'transparentMaxBounces':12},
 'views':records,'status':'AUTHOR VISUAL REVIEW REQUIRED',
 'limits':['Cycles surface-coverage study, not measured shell optics','No GLB/Three.js sorting validation','No rig/actions or completed eye audit']}
(OUT/'material-report.json').write_text(json.dumps(report,indent=2))
files=[{'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.iterdir()) if p.is_file()]
(OUT/'output-manifest.json').write_text(json.dumps({'status':'REVIEW NEEDED','outputs':files},indent=2))
print('ODARAIA_MATERIAL02_GEOMETRY_PRESERVED; SIX_VIEWS_RENDERED; ASTRA_REVIEW_REQUIRED')
