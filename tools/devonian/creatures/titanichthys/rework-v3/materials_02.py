"""Frozen anatomy-aware PBR study on coarse-form-approved Titanichthys clay04.

Astra authors; Terra executes. Coordinates, topology, shape keys and object
transforms remain unchanged. New local material-02 only; no export or rig work.
Uses one original built-in ImageGen pigment swatch; no reference pixels or old assets.
"""
from pathlib import Path
import bpy
import hashlib
import json
import math
import struct
from mathutils import Vector
from mathutils.kdtree import KDTree

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
LOCAL=REPO.parent/'devonian-authoring/titanichthys/rework-v3'
SOURCE=LOCAL/'clay-04/titanichthys-clay-04.blend'
SOURCE_SHA='69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec'
CONSTRUCTION=LOCAL/'clay-04/construction.json'
CONSTRUCTION_SHA='76af1d3f7c181a1dee47e6bffc854258d53041fd07ea99a39b7252a11dc74734'
ORAL_MANIFEST=LOCAL/'clay-04/oral-inspection-01/manifest.json'
ORAL_SHA='83f79de58ed6aee72cfb113a83091101b6f4299d32745f944bf6e5cf492e4503'
BUILDER=HERE/'build_clay04.py'
BUILDER_SHA='7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e'
SWATCH=LOCAL/'material-sources/titanichthys-dermal-imagegen-02.png'
SWATCH_SHA='2e208ae8f68a51c412a70dd3031a67adecb3512269d833984d8279974874643f'
PROVENANCE=HERE/'imagegen-dermal-provenance.json'
PROVENANCE_SHA='fdfc86c3feb44c7dafb3b5bd4429c66422c428fb1887da32ac2f5a6041f72fde'
OUT=LOCAL/'material-02'
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
if Path(bpy.data.filepath).resolve()!=SOURCE.resolve():raise RuntimeError('Wrong immutable clay04 blend')
for path,expected in ((SOURCE,SOURCE_SHA),(ORAL_MANIFEST,ORAL_SHA),(BUILDER,BUILDER_SHA),(CONSTRUCTION,CONSTRUCTION_SHA),(SWATCH,SWATCH_SHA),(PROVENANCE,PROVENANCE_SHA)):
    if sha(path)!=expected:raise RuntimeError('Frozen input hash mismatch: '+str(path))
if OUT.exists():raise RuntimeError('material-02 already exists; preserve it and return to Astra')
body=bpy.data.objects['Titanichthys_new_continuous_sculpt']
if len(body.data.vertices)!=90430 or len(body.data.polygons)!=90648:
    raise RuntimeError('Unexpected accepted body topology')
meshes=sorted([ob for ob in bpy.data.objects if ob.type=='MESH'],key=lambda ob:ob.name)
if len(meshes)!=9:raise RuntimeError('Unexpected mesh count')
for ob in meshes:
    if ob.data.shape_keys:
        for key in list(ob.data.shape_keys.key_blocks)[1:]:
            if abs(key.value)>1.e-8:raise RuntimeError('Source is not in the accepted rest pose')

def geometry_hash(ob):
    h=hashlib.sha256()
    for vertex in ob.data.vertices:h.update(struct.pack('<fff',*vertex.co))
    for polygon in ob.data.polygons:
        h.update(struct.pack('<I',len(polygon.vertices)))
        for index in polygon.vertices:h.update(struct.pack('<I',index))
    for row in ob.matrix_world:
        h.update(struct.pack('<ffff',*row))
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:
            h.update(key.name.encode())
            for vertex in key.data:h.update(struct.pack('<fff',*vertex.co))
    return h.hexdigest()
original_geometry={ob.name:geometry_hash(ob) for ob in meshes}

def clamp(x):return min(1.,max(0.,x))
def smooth(x,lo=0.,hi=1.):
    t=clamp((x-lo)/(hi-lo));return t*t*t*(t*(t*6-15)+10)

def color_attribute(ob,name,values):
    old=ob.data.color_attributes.get(name)
    if old:ob.data.color_attributes.remove(old)
    attr=ob.data.color_attributes.new(name=name,type='FLOAT_COLOR',domain='POINT')
    if len(values)!=len(attr.data):raise RuntimeError('Attribute correspondence mismatch: '+name)
    attr.data.foreach_set('color',[float(v) for row in values for v in row])
    return attr

# Reconstruct only the accepted outer cage's parameter correspondence from its
# frozen topology. This assigns pigment; it never rebuilds or moves a vertex.
N=192;HEAD_ROWS=112;POST_ROWS=178;NECK_Y=-1.08
windows=[(34,42,13,19),(34,42,77,83)]
head_lookup={};post_lookup={};meta={};index=0
for i in range(HEAD_ROWS+1):
    for j in range(N):
        if any(i0<i<i1 and j0<j<j1 for i0,i1,j0,j1 in windows):continue
        head_lookup[(i,j)]=index;meta[index]=('head',i/HEAD_ROWS,2*math.pi*j/N);index+=1
for i in range(1,POST_ROWS+1):
    for j in range(N):
        post_lookup[(i,j)]=index
        meta[index]=('posterior',NECK_Y+(3.72-NECK_Y)*i/POST_ROWS,2*math.pi*j/N)
        index+=1
if index!=55802:raise RuntimeError('Outer cage index correspondence changed')
head_tree=KDTree(len(head_lookup))
for n,vi in enumerate(head_lookup.values()):head_tree.insert(body.data.vertices[vi].co,vi)
head_tree.balance()

def head_point(t,a):
    row=clamp(t)*HEAD_ROWS;col=(a%(2*math.pi))/(2*math.pi)*N
    i=min(HEAD_ROWS-1,int(row));j=int(col)%N
    ti=row-i;aj=col-int(col)
    keys=[(i,j),(i+1,j),(i,(j+1)%N),(i+1,(j+1)%N)]
    if any(key not in head_lookup for key in keys):raise RuntimeError('Suture crossed orbital window')
    q=[body.data.vertices[head_lookup[key]].co for key in keys]
    return q[0].lerp(q[1],ti).lerp(q[2].lerp(q[3],ti),aj)

def post_point(y,a):
    row=clamp((y-NECK_Y)/(3.72-NECK_Y))*POST_ROWS
    i=min(POST_ROWS-1,int(row));ti=row-i
    col=(a%(2*math.pi))/(2*math.pi)*N;j=int(col)%N;aj=col-int(col)
    def point(ii,jj):
        vi=head_lookup[(HEAD_ROWS,jj)] if ii==0 else post_lookup[(ii,jj)]
        return body.data.vertices[vi].co
    return point(i,j).lerp(point(i+1,j),ti).lerp(point(i,(j+1)%N).lerp(point(i+1,(j+1)%N),ti),aj)

def catmull(points,steps=64):
    pts=[Vector(p) for p in points];out=[]
    for i in range(len(pts)-1):
        a,b,c,d=pts[max(0,i-1)],pts[i],pts[i+1],pts[min(len(pts)-1,i+2)]
        for j in range(steps):
            t=j/steps
            out.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    out.append(pts[-1]);return out
head_paths=[
    [(.22,1.57),(.26,1.22),(.37,.91),(.51,.65),(.60,.30)],
    [(.49,1.57),(.51,1.26),(.57,.98),(.67,.72)],
    [(.80,-.96),(.80,-.45),(.80,.10),(.80,.69),(.80,1.57)],
]
post_paths=[
    [(-1.07,.69),(-.95,.71),(-.62,.70),(-.30,.78),(-.03,.97)],
    [(-.63,.70),(-.49,.37),(-.39,.03),(-.38,-.35),(-.50,-.68)],
    [(-.11,.96),(.06,.57),(.08,.10),(-.01,-.37),(-.26,-.71)],
]
seam_points=[]
for paths,evaluate in ((head_paths,head_point),(post_paths,post_point)):
    for path in paths:
        for q in catmull(path):
            for angle in (q.y,math.pi-q.y):seam_points.append(evaluate(q.x,angle))
seam_tree=KDTree(len(seam_points))
for n,q in enumerate(seam_points):seam_tree.insert(q,n)
seam_tree.balance()

def boundary_at_angle(path,a):
    points=sorted((q[1],q[0]) for q in path)
    if a<=points[0][0]:return points[0][1]
    if a>=points[-1][0]:return points[-1][1]
    for (aa,t0),(bb,t1) in zip(points,points[1:]):
        if aa<=a<=bb:return t0+(t1-t0)*(a-aa)/(bb-aa)
    raise RuntimeError('Invalid plate boundary parameter')

anatomy=[]
for vi,vertex in enumerate(body.data.vertices):
    q=vertex.co
    item=meta.get(vi)
    if item is None:
        # Socket walls inherit the real neighbouring cheek field. Other inner
        # vertices use their dedicated oral material, so this is not a cavity mask.
        near=head_tree.find(q)[1];item=meta[near]
    family,t,a=item;ss=math.sin(a)
    dorsal=smooth(ss,-.48,.35)
    armour=(1-smooth(q.y,.12,.62))*smooth(ss,-.60,-.06)
    distance=seam_tree.find(q)[2] if q.y<.40 else 1.e6
    seam=clamp(distance/.14) # shader evaluates a crisp distance-based suture core
    if family=='head':
        aa=math.atan2(ss,abs(math.cos(a)))
        edge_a=boundary_at_angle(head_paths[0],aa)
        edge_b=boundary_at_angle(head_paths[1],aa)
        # Broad plate tone changes track the actual suture layout.
        tone=.28+.48*smooth(t,edge_a-.014,edge_a+.014)
        tone-=.26*smooth(t,edge_b-.014,edge_b+.014)
        tone+=.30*smooth(t,.786,.814)
    else:
        tone=.48+.24*smooth(q.y,-.52,-.35)-.19*smooth(q.y,-.05,.15)
    anatomy.append((clamp(armour),dorsal,seam,clamp(tone)))
color_attribute(body,'TitanAnatomy',anatomy)

# Separate span/chord metadata for the full paired membranes and radial fields
# for median fins. Relief follows these anatomical fields instead of world axes.
fin_objects={name:bpy.data.objects[name] for name in ['Long pectoral L','Long pectoral R','Pelvic L','Pelvic R','Modest swept dorsal','Strong heterocercal caudal']}
for name,ob in fin_objects.items():
    values=[]
    if name.startswith(('Long pectoral','Pelvic')):
        if len(ob.data.vertices)!=6217:raise RuntimeError('Unexpected paired fin correspondence')
        for side in (0.,1.):
            for i in range(84):
                for j in range(37):values.append((i/84,j/36,side,1.))
        values.append((1.,.5,.5,1.))
    else:
        half=len(ob.data.vertices)//2
        nc=(half-1)//36
        if len(ob.data.vertices)!=2*(1+36*nc):raise RuntimeError('Unexpected median fin correspondence')
        for side in (0,1):
            values.append((0.,0.,.65,0.))
            for i in range(1,37):
                for j in range(nc):values.append((i/36,j/nc,.65,0.))
    color_attribute(ob,'TitanFin',values)

construction=json.loads(CONSTRUCTION.read_text())
eye_objects=[]
for info in construction['eye_placement_design']:
    ob=bpy.data.objects['Recessed socket eye '+info['side']];eye_objects.append(ob)
    axis=Vector(info['normal']).normalized();u=axis.cross(Vector((0,0,1))).normalized();v=axis.cross(u).normalized()
    values=[]
    for vertex in ob.data.vertices:
        q=vertex.co/info['radius'];x,y=q.dot(u),q.dot(v)
        values.append((clamp(math.hypot(x,y)),clamp((q.dot(axis)+1)*.5),(math.atan2(y,x)+math.pi)/(2*math.pi),1.))
    color_attribute(ob,'TitanEye',values)

class Field:
    def __init__(self,name,specular=.32,coat=0.):
        self.mat=bpy.data.materials.new(name);self.mat.use_nodes=True
        self.nodes=self.mat.node_tree.nodes;self.links=self.mat.node_tree.links;self.nodes.clear()
        self.out=self.nodes.new('ShaderNodeOutputMaterial');self.bs=self.nodes.new('ShaderNodeBsdfPrincipled')
        self.links.new(self.bs.outputs['BSDF'],self.out.inputs['Surface'])
        self.bs.inputs['Metallic'].default_value=0
        self.bs.inputs['Specular IOR Level'].default_value=specular
        self.bs.inputs['Coat Weight'].default_value=coat
        self.specular,self.coat=specular,coat
    def set(self,node,name,value):
        if hasattr(value,'is_output'):self.links.new(value,node.inputs[name])
        else:
            if isinstance(value,(int,float)) and node.inputs[name].type=='RGBA':value=(value,value,value,1.)
            node.inputs[name].default_value=value
    def math(self,op,*values):
        node=self.nodes.new('ShaderNodeMath');node.operation=op
        for i,value in enumerate(values):self.set(node,i,value)
        return node.outputs[0]
    def add(self,a,b):return self.math('ADD',a,b)
    def sub(self,a,b):return self.math('SUBTRACT',a,b)
    def mul(self,a,b):return self.math('MULTIPLY',a,b)
    def clamp(self,a):return self.math('MINIMUM',self.math('MAXIMUM',a,0.),1.)
    def smooth(self,a,lo,hi):
        t=self.clamp(self.math('DIVIDE',self.sub(a,lo),hi-lo))
        return self.mul(self.mul(t,t),self.sub(3.,self.mul(2.,t)))
    def mix(self,a,b,t):
        node=self.nodes.new('ShaderNodeMixRGB');node.blend_type='MIX'
        self.set(node,0,t);self.set(node,1,a);self.set(node,2,b);return node.outputs[0]
    def scale_color(self,color,factor):
        node=self.nodes.new('ShaderNodeMixRGB');node.blend_type='MULTIPLY'
        self.set(node,0,1.);self.set(node,1,color);self.set(node,2,factor);return node.outputs[0]
    def noise(self,position,scale,detail=3.,rough=.65):
        node=self.nodes.new('ShaderNodeTexNoise');self.set(node,'Vector',position)
        self.set(node,'Scale',scale);self.set(node,'Detail',detail);self.set(node,'Roughness',rough)
        return node.outputs['Fac']
    def attribute(self,name):
        node=self.nodes.new('ShaderNodeVertexColor');node.layer_name=name
        separate=self.nodes.new('ShaderNodeSeparateColor');separate.mode='RGB';self.set(separate,'Color',node.outputs['Color'])
        return [separate.outputs[k] for k in ('Red','Green','Blue')]+[node.outputs['Alpha']]
    def coords(self):return self.nodes.new('ShaderNodeTexCoord').outputs['Object']
    def finish(self,color,rough,height,distance=.002,strength=.22):
        self.color,self.rough=color,rough
        self.set(self.bs,'Base Color',color);self.set(self.bs,'Roughness',rough)
        bump=self.nodes.new('ShaderNodeBump');self.set(bump,'Height',height)
        self.set(bump,'Distance',distance);self.set(bump,'Strength',strength)
        self.links.new(bump.outputs['Normal'],self.bs.inputs['Normal'])
        return self

# Original generated pigment is sampled in object space on three planes. Each
# plane uses four phase-shifted samples near tile edges, so opposite image
# boundaries need not be perfectly seamless. Geometry-normal weights prevent
# long stretched flecks on the vertical cheeks. This image drives colour ONLY.
swatch=bpy.data.images.load(str(SWATCH),check_existing=False)
swatch.name='Titanichthys original slate dermal pigment 02';swatch.colorspace_settings.name='sRGB';swatch.pack()
def xyz(field,vector):
    node=field.nodes.new('ShaderNodeSeparateXYZ');field.set(node,'Vector',vector)
    return [node.outputs[k] for k in ('X','Y','Z')]
def vector(field,x,y,z=0.):
    node=field.nodes.new('ShaderNodeCombineXYZ')
    for name,value in zip(('X','Y','Z'),(x,y,z)):field.set(node,name,value)
    return node.outputs['Vector']
def tiled_plane(field,u,v):
    def edge(value):
        f=field.math('FRACT',value)
        return field.sub(1.,field.smooth(field.math('MINIMUM',f,field.sub(1.,f)),.018,.085))
    def sample(du,dv):
        node=field.nodes.new('ShaderNodeTexImage');node.image=swatch
        node.interpolation='Linear';node.extension='EXTEND'
        field.set(node,'Vector',vector(field,field.math('FRACT',field.add(u,du)),field.math('FRACT',field.add(v,dv))))
        return node.outputs['Color']
    return field.mix(field.mix(sample(0,0),sample(.5,0),edge(u)),
                     field.mix(sample(0,.5),sample(.5,.5),edge(u)),edge(v))
def dermal_pigment(field,position):
    xx,yy,zz=xyz(field,position)
    warp=field.mul(.021,field.sub(field.noise(position,3.8,2,.6),.5))
    x=field.add(field.mul(xx,.82),warp);y=field.add(field.mul(yy,.82),warp);z=field.add(field.mul(zz,.82),warp)
    # Mildly rotate each plane to avoid obvious world-axis alignment.
    def plane(a,b,offset):
        u=field.add(offset,field.sub(field.mul(a,.94),field.mul(b,.342)))
        v=field.add(offset+.371,field.add(field.mul(a,.342),field.mul(b,.94)))
        return tiled_plane(field,u,v)
    cx=plane(y,z,.137);cy=plane(x,z,.619);cz=plane(x,y,.293)
    geometry=field.nodes.new('ShaderNodeNewGeometry')
    transform=field.nodes.new('ShaderNodeVectorTransform');transform.vector_type='NORMAL'
    transform.convert_from='WORLD';transform.convert_to='OBJECT';field.set(transform,'Vector',geometry.outputs['Normal'])
    weights=[field.math('POWER',field.math('ABSOLUTE',q),4.) for q in xyz(field,transform.outputs['Vector'])]
    wx,wy,wz=weights;xy=field.add(wx,wy);total=field.add(xy,wz)
    return field.mix(field.mix(cx,cy,field.math('DIVIDE',wy,field.math('MAXIMUM',xy,1.e-6))),
                     cz,field.math('DIVIDE',wz,field.math('MAXIMUM',total,1.e-6)))

skin=Field('Titanichthys slate armour dermis and flexible skin',.31,.025)
p=skin.coords();armour,dorsal,seam_distance,plate=skin.attribute('TitanAnatomy')
# B encodes distance, not a preblurred per-vertex seam opacity. The shader owns
# the narrow suture core; every path still comes from the accepted cage map.
seam=skin.mul(armour,skin.sub(1.,skin.smooth(seam_distance,.07,.23)))
edge=skin.mul(armour,skin.mul(skin.smooth(seam_distance,.22,.39),skin.sub(1.,skin.smooth(seam_distance,.39,.64))))
macro=skin.noise(p,1.9,2.3,.57);meso=skin.noise(p,19.,3.4,.65);grain=skin.noise(p,142.,2.2,.62)
pigment=dermal_pigment(skin,p)
armour_base=skin.mix((.038,.079,.124,1),(.061,.116,.164,1),skin.add(.35,skin.mul(.30,macro)))
armour_color=skin.mix(armour_base,pigment,.67)
armour_color=skin.scale_color(armour_color,skin.add(.70,skin.mul(.74,plate)))
# Small pale and dark dermal freckles complement the generated pigment. No
# macro-noise light/dark islands, no polygonal plate or crack generator.
pepper=skin.sub(1.,skin.smooth(meso,.30,.46))
armour_color=skin.mix(armour_color,(.020,.047,.071,1),skin.mul(.16,pepper))
soft_color=skin.mix((.040,.077,.097,1),(.067,.106,.120,1),skin.add(.32,skin.mul(.34,macro)))
soft_color=skin.mix(soft_color,pigment,.24)
upper=skin.mix(soft_color,armour_color,armour)
under=skin.mix((.127,.158,.146,1),(.185,.207,.179,1),skin.add(.32,skin.mul(.35,meso)))
color=skin.mix(under,upper,dorsal)
color=skin.mix(color,(.014,.035,.048,1),skin.mul(.56,seam))
# A broad quiet tonal shoulder follows each existing suture; no bright outline.
color=skin.mix(color,(.100,.150,.172,1),skin.mul(.085,edge))
rough=skin.add(.405,skin.add(skin.mul(.060,skin.sub(1.,armour)),skin.mul(.075,skin.sub(grain,.5))))
rough=skin.add(rough,skin.add(skin.mul(.055,seam),skin.mul(.018,pepper)))
puncta=skin.nodes.new('ShaderNodeTexVoronoi');puncta.voronoi_dimensions='3D';puncta.feature='F1'
skin.set(puncta,'Vector',p);skin.set(puncta,'Scale',77.);skin.set(puncta,'Randomness',1.)
punctum=skin.sub(1.,skin.smooth(puncta.outputs['Distance'],.07,.32))
height=skin.add(skin.mul(.32,grain),skin.mul(skin.add(.075,skin.mul(.22,armour)),punctum))
# Pure shader relief; no displacement. Surface roughness and colour remain
# independent of the generated image's brightness.
skin.finish(color,rough,height,.0042,.43)
skin.bs.inputs['Coat Roughness'].default_value=.34

lip=Field('Titanichthys fine edentulous lip tissue',.32,.025)
p=lip.coords();x,y,z=xyz(lip,p);fine=lip.noise(p,118,2.4,.65);speck=lip.noise(p,32,2.6,.65)
lip_color=lip.mix((.109,.134,.118,1),(.179,.192,.151,1),lip.add(.23,lip.mul(.55,speck)))
lip_color=lip.mix(lip_color,(.062,.099,.103,1),lip.mul(.32,lip.smooth(z,-.10,.03)))
lip.finish(lip_color,lip.add(.355,lip.mul(.075,fine)),fine,.0017,.30)
oral=Field('Titanichthys moist palate floor and commissure tissue',.34,.035)
p=oral.coords();x,y,z=xyz(oral,p);fine=oral.noise(p,126,2.2,.61);meso=oral.noise(p,24,3.2,.64)
palate=oral.smooth(z,-.18,.08);rear=oral.smooth(y,-2.25,-.55)
floor_color=oral.mix((.106,.055,.048,1),(.171,.093,.073,1),meso)
roof_color=oral.mix((.068,.051,.053,1),(.121,.087,.085,1),meso)
color=oral.mix(floor_color,roof_color,palate)
color=oral.scale_color(color,oral.sub(1.,oral.mul(.32,rear)))
# Minute longitudinal tissue striation is strongest on the floor and fades
# toward the rear. It does not imply teeth, baleen or fabricated filter organs.
phase=oral.add(oral.mul(x,92.),oral.mul(oral.noise(p,9.,2,.6),1.3))
stria=oral.math('POWER',oral.add(.5,oral.mul(.5,oral.math('SINE',phase))),8.)
stria=oral.mul(stria,oral.mul(oral.sub(1.,oral.mul(.75,palate)),oral.sub(1.,oral.mul(.65,rear))))
color=oral.mix(color,(.193,.122,.110,1),oral.mul(.17,stria))
height=oral.add(oral.mul(.28,fine),oral.mul(.21,stria))
oral.finish(color,oral.add(.295,oral.mul(.085,meso)),height,.0024,.37)
oral.bs.inputs['Coat Roughness'].default_value=.27

fin=Field('Titanichthys cambered blue membranes and local fin rays',.31,.015)
p=fin.coords();span,chord,top,paired=fin.attribute('TitanFin')
meso=fin.noise(p,28.,3.1,.65);fine=fin.noise(p,135.,2.2,.60)
upper=fin.mix((.036,.083,.111,1),(.072,.126,.147,1),fin.add(.20,fin.mul(.58,meso)))
upper=fin.mix(upper,(.024,.062,.090,1),fin.mul(.46,fin.smooth(span,.66,1.)))
under=fin.mix((.099,.143,.139,1),(.153,.184,.162,1),meso)
color=fin.mix(under,upper,fin.add(.24,fin.mul(.76,top)))
# The local transverse coordinate produces rays from the actual fin base.
# Finer paired raylets emerge distally without any free rods or mesh changes.
ray_count=fin.add(24.,fin.mul(-7.,paired))
phase=fin.add(fin.mul(chord,ray_count),fin.mul(.035,fin.noise(p,9.3,2,.63)))
wave=fin.add(.5,fin.mul(.5,fin.math('COSINE',fin.mul(2*math.pi,phase))))
ridge=fin.math('POWER',wave,7.)
raylets=fin.math('POWER',fin.add(.5,fin.mul(.5,fin.math('COSINE',fin.mul(4*math.pi,phase)))),13.)
ray_amount=fin.mul(fin.smooth(span,.035,.21),fin.sub(1.,fin.smooth(span,.92,1.)))
ray=fin.mul(ray_amount,fin.add(fin.mul(.80,ridge),fin.mul(.20,fin.mul(raylets,fin.smooth(span,.40,.79)))))
color=fin.mix(color,(.126,.188,.190,1),fin.mul(.42,ray))
# Restrained dark membrane pigment next to the primary rays gives the broad
# membrane a living structure at full-body view rather than a flat ribbon.
trough=fin.math('POWER',fin.sub(1.,wave),5.)
color=fin.mix(color,(.018,.052,.078,1),fin.mul(.14,fin.mul(trough,ray_amount)))
height=fin.add(fin.mul(.20,fine),fin.mul(.43,ray))
fin.finish(color,fin.add(.405,fin.add(fin.mul(.075,fine),fin.mul(.020,span))),height,.0040,.42)

eye=Field('Titanichthys eyes dark optical surface',.36,.08)
p=eye.coords();radius,facing,angle,_=eye.attribute('TitanEye')
noise=eye.noise(p,380,2,.62)
iris=eye.mul(eye.sub(1.,eye.smooth(radius,.56,.71)),eye.smooth(facing,.62,.80))
pupil=eye.mul(eye.sub(1.,eye.smooth(radius,.24,.32)),eye.smooth(facing,.70,.83))
fibres=eye.add(.5,eye.mul(.5,eye.math('SINE',eye.add(eye.mul(angle,2*math.pi*62),eye.mul(noise,2.)))))
iris_color=eye.mix((.017,.020,.014,1),(.060,.053,.028,1),eye.add(eye.mul(.72,noise),eye.mul(.28,fibres)))
color=eye.mix((.003,.008,.011,1),iris_color,iris)
color=eye.mix(color,(.0015,.003,.004,1),pupil)
eye.finish(color,eye.add(.185,eye.mul(.030,noise)),noise,.000035,.08)
eye.bs.inputs['Coat Roughness'].default_value=.18

old_indices=[poly.material_index for poly in body.data.polygons]
body.data.materials.clear()
for field in (skin,lip,oral):body.data.materials.append(field.mat)
for poly,index in zip(body.data.polygons,old_indices):poly.material_index=index
for ob in fin_objects.values():ob.data.materials.clear();ob.data.materials.append(fin.mat)
for ob in eye_objects:ob.data.materials.clear();ob.data.materials.append(eye.mat)

# Dedicated bake UVs leave all accepted vertex/key coordinates intact.
def unwrap(ob):
    bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
    if ob.data.shape_keys:ob.active_shape_key_index=0
    if not ob.data.uv_layers:ob.data.uv_layers.new(name='UVMap')
    ob.data.uv_layers.active.name='UVMap'
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.018,area_weight=.25,correct_aspect=True)
    bpy.ops.object.mode_set(mode='OBJECT')

def copy_uv(source,dest):
    if len(source.data.loops)!=len(dest.data.loops):raise RuntimeError('Mirrored UV topology differs')
    if not dest.data.uv_layers:dest.data.uv_layers.new(name='UVMap')
    dest.data.uv_layers.active.name='UVMap'
    for source_poly,dest_poly in zip(source.data.polygons,dest.data.polygons):
        if set(source_poly.vertices)!=set(dest_poly.vertices):raise RuntimeError('Mirrored polygon correspondence differs')
        per_vertex={source.data.loops[li].vertex_index:source.data.uv_layers.active.data[li].uv.copy() for li in source_poly.loop_indices}
        for li in dest_poly.loop_indices:dest.data.uv_layers.active.data[li].uv=per_vertex[dest.data.loops[li].vertex_index]

for ob in [body,fin_objects['Long pectoral L'],fin_objects['Pelvic L'],fin_objects['Modest swept dorsal'],fin_objects['Strong heterocercal caudal']]:unwrap(ob)
copy_uv(fin_objects['Long pectoral L'],fin_objects['Long pectoral R'])
copy_uv(fin_objects['Pelvic L'],fin_objects['Pelvic R'])
# Separate atlas halves preserve each eye's distinct socket-facing axis. Copying
# the left eye's pigment unchanged onto the right sphere would face it inward.
for side,ob in enumerate(sorted(eye_objects,key=lambda item:item.name)):
    if not ob.data.uv_layers:raise RuntimeError('Expected sphere UVs are absent')
    ob.data.uv_layers.active.name='UVMap'
    for loop in ob.data.uv_layers.active.data:
        loop.uv=(.014+side*.5+loop.uv.x*.472,.025+loop.uv.y*.950)
for ob in meshes:
    color_attribute(ob,'Color',[(1.,1.,1.,1.)]*len(ob.data.vertices))
    ob['material_study']='Titanichthys regional PBR material-02; no geometry edits'
    if geometry_hash(ob)!=original_geometry[ob.name]:raise RuntimeError('UV preparation changed accepted geometry: '+ob.name)

OUT.mkdir(parents=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.bake.margin=12;scene.render.bake.use_selected_to_active=False
scene.render.bake.normal_space='TANGENT'
scene.render.bake.normal_r='POS_X';scene.render.bake.normal_g='POS_Y';scene.render.bake.normal_b='POS_Z'
procedural=OUT/'titanichthys-procedural-material-02.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(procedural))

textures=[]
def bake_family(objects,fields,family,size,specular=.32,coat=0.,coat_rough=.32):
    maps={}
    for kind in ('albedo','roughness','normal'):
        image=bpy.data.images.new('Titanichthys '+family+' '+kind,width=size,height=size,alpha=False,float_buffer=False)
        image.colorspace_settings.name='sRGB' if kind=='albedo' else 'Non-Color'
        changed=[]
        for field in fields:
            target=field.nodes.new('ShaderNodeTexImage');target.image=image;field.nodes.active=target
            if kind=='normal':field.links.new(field.bs.outputs['BSDF'],field.out.inputs['Surface'])
            else:
                emission=field.nodes.new('ShaderNodeEmission')
                field.set(emission,'Color',field.color if kind=='albedo' else field.rough)
                field.links.new(emission.outputs[0],field.out.inputs['Surface']);changed.append((field,emission))
        for i,ob in enumerate(objects):
            bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
            scene.render.bake.use_clear=(i==0)
            bpy.ops.object.bake(type='NORMAL' if kind=='normal' else 'EMIT')
        image.filepath_raw=str(OUT/(family+'-'+kind+'.png'));image.file_format='PNG';image.save();image.pack()
        for field,node in changed:
            field.links.new(field.bs.outputs['BSDF'],field.out.inputs['Surface']);field.nodes.remove(node)
        maps[kind]=image
        path=Path(image.filepath_raw)
        textures.append({'family':family,'kind':kind,'path':str(path),'size':[size,size],
                         'bytes':path.stat().st_size,'sha256':sha(path),'color_space':image.colorspace_settings.name})
        print('TITANICHTHYS_MATERIAL_BAKE_OK '+family+' '+kind,flush=True)
    material=bpy.data.materials.new('Titanichthys mapped '+family);material.use_nodes=True
    nodes,links=material.node_tree.nodes,material.node_tree.links
    bs=nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0
    bs.inputs['Specular IOR Level'].default_value=specular;bs.inputs['Coat Weight'].default_value=coat
    if coat:bs.inputs['Coat Roughness'].default_value=coat_rough
    for kind,image in maps.items():
        tx=nodes.new('ShaderNodeTexImage');tx.image=image;tx.interpolation='Linear';tx.extension='EXTEND'
        if kind=='normal':
            normal=nodes.new('ShaderNodeNormalMap');normal.space='TANGENT';normal.inputs['Strength'].default_value=1
            links.new(tx.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bs.inputs['Normal'])
        else:links.new(tx.outputs['Color'],bs.inputs['Base Color' if kind=='albedo' else 'Roughness'])
    return material

def apply(ob,material):
    ob.data.materials.clear();ob.data.materials.append(material)
    for poly in ob.data.polygons:poly.material_index=0

apply(body,bake_family([body],[skin,lip,oral],'body',4096,.31,.025))
for family,left,right,size in [('fins-pectoral','Long pectoral L','Long pectoral R',2048),('fins-pelvic','Pelvic L','Pelvic R',1024)]:
    material=bake_family([fin_objects[left]],[fin],family,size,.31,.015)
    apply(fin_objects[left],material);apply(fin_objects[right],material)
for family,name,size in [('fins-dorsal','Modest swept dorsal',1024),('fins-caudal','Strong heterocercal caudal',2048)]:
    apply(fin_objects[name],bake_family([fin_objects[name]],[fin],family,size,.31,.015))
eye_material=bake_family(sorted(eye_objects,key=lambda item:item.name),[eye],'eyes',512,.36,.08,.18)
for ob in eye_objects:apply(ob,eye_material)

for ob in meshes:
    if geometry_hash(ob)!=original_geometry[ob.name]:raise RuntimeError('Material study changed accepted geometry: '+ob.name)
for path,expected in ((SOURCE,SOURCE_SHA),(ORAL_MANIFEST,ORAL_SHA),(BUILDER,BUILDER_SHA),(CONSTRUCTION,CONSTRUCTION_SHA),(SWATCH,SWATCH_SHA),(PROVENANCE,PROVENANCE_SHA)):
    if sha(path)!=expected:raise RuntimeError('Immutable input changed during material study: '+str(path))
scene.cycles.samples=48;scene.render.bake.use_clear=True
mapped=OUT/'titanichthys-material-02.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(mapped))
report={'phase':'UNREVIEWED MATERIAL STUDY; COARSE FORM APPROVAL ONLY',
        'source_blend':str(SOURCE),'source_blend_sha256':SOURCE_SHA,'oral_manifest_sha256':ORAL_SHA,
        'builder_sha256':BUILDER_SHA,'construction_sha256':CONSTRUCTION_SHA,'material_script_sha256':sha(Path(__file__)),
        'procedural_blend':str(procedural),'procedural_blend_sha256':sha(procedural),
        'blend':str(mapped),'blend_sha256':sha(mapped),'geometry_sha256':original_geometry,
        'geometry_topology_shape_keys_transforms_unchanged':True,'textures':textures,
        'atlas_policy':'Six families; paired fins share mirrored UVs; both eyes occupy separate atlas halves',
        'color_policy':'Mapped albedo; white Color attribute, no duplicate tint or baked illumination',
        'normal_policy':'Tangent-space +X +Y +Z; independently authored dermal/ray/tissue shader relief, no displacement or image-luminance normals',
        'imagegen_source':str(SWATCH),'imagegen_source_sha256':SWATCH_SHA,'imagegen_provenance':str(PROVENANCE),'imagegen_provenance_sha256':sha(PROVENANCE),
        'provenance':'Original built-in ImageGen pigment swatch plus authored anatomical fields; no user-reference or legacy texture pixels',
        'uncertainties':'Pigmentation, microscopic puncta/grain, exact plate tone and soft-tissue colours are interpretations',
        'next':'Astra/root actual material review before any final rig, eye/general audit, export or public intake'}
(OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('TITANICHTHYS_MATERIAL_BUILD_OK '+str(OUT/'material-report.json'))
