"""Frozen anatomy-aware PBR study on coarse-form-approved Titanichthys clay04.

Astra authors; Terra executes. Coordinates, topology, shape keys and object
transforms remain unchanged. New local material-01 only; no export or rig work.
No user-reference pixels, old material assets or external source art are used.
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
ORAL_MANIFEST=LOCAL/'clay-04/oral-inspection-01/manifest.json'
ORAL_SHA='83f79de58ed6aee72cfb113a83091101b6f4299d32745f944bf6e5cf492e4503'
BUILDER=HERE/'build_clay04.py'
BUILDER_SHA='7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e'
OUT=LOCAL/'material-01'
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
if Path(bpy.data.filepath).resolve()!=SOURCE.resolve():raise RuntimeError('Wrong immutable clay04 blend')
for path,expected in ((SOURCE,SOURCE_SHA),(ORAL_MANIFEST,ORAL_SHA),(BUILDER,BUILDER_SHA)):
    if sha(path)!=expected:raise RuntimeError('Frozen input hash mismatch: '+str(path))
if OUT.exists():raise RuntimeError('material-01 already exists; preserve it and return to Astra')
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
    seam=math.exp(-(distance/.026)**2)*armour
    if family=='head':
        aa=math.atan2(ss,abs(math.cos(a)))
        edge_a=boundary_at_angle(head_paths[0],aa)
        edge_b=boundary_at_angle(head_paths[1],aa)
        # Low-contrast broad plate tone changes track the actual suture layout.
        tone=.38+.20*smooth(t,edge_a-.022,edge_a+.022)
        tone-=.11*smooth(t,edge_b-.022,edge_b+.022)
        tone+=.12*smooth(t,.778,.822)
    else:
        tone=.48+.08*smooth(q.y,-.52,-.35)-.06*smooth(q.y,-.05,.15)
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

construction=json.loads((LOCAL/'clay-04/construction.json').read_text())
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

skin=Field('Titanichthys body armour and flexible skin')
p=skin.coords();armour,dorsal,seam,plate=skin.attribute('TitanAnatomy')
macro=skin.noise(p,1.65,3.2,.68);cloud=skin.noise(p,7.8,3.8,.70);grain=skin.noise(p,118,2.0,.60)
armour_color=skin.mix((.030,.066,.087,1),(.090,.146,.170,1),skin.smooth(macro,.27,.74))
armour_color=skin.scale_color(armour_color,skin.add(.86,skin.mul(.30,plate)))
armour_color=skin.mix(armour_color,(.135,.173,.173,1),skin.mul(.20,skin.smooth(cloud,.60,.79)))
soft_color=skin.mix((.026,.057,.057,1),(.085,.116,.102,1),skin.smooth(macro,.25,.76))
soft_color=skin.mix(soft_color,(.130,.148,.120,1),skin.mul(.12,skin.smooth(cloud,.62,.80)))
upper=skin.mix(soft_color,armour_color,armour)
under=skin.mix((.155,.175,.150,1),(.255,.265,.218,1),macro)
color=skin.mix(under,upper,dorsal)
color=skin.mix(color,(.023,.048,.055,1),skin.mul(.23,seam))
rough=skin.add(.48,skin.add(skin.mul(.070,skin.sub(1.,armour)),skin.mul(.037,grain)))
rough=skin.add(rough,skin.mul(.040,seam))
# Quiet puncta and fine grain; no tessellated scale/crack field, and no second
# suture displacement on top of the approved shallow sculpted boundaries.
puncta=skin.nodes.new('ShaderNodeTexVoronoi');puncta.voronoi_dimensions='3D';puncta.feature='F1'
skin.set(puncta,'Vector',p);skin.set(puncta,'Scale',68.);skin.set(puncta,'Randomness',.91)
punctum=skin.sub(1.,skin.smooth(puncta.outputs['Distance'],.10,.31))
height=skin.add(skin.mul(.19,grain),skin.mul(.13,skin.mul(punctum,armour)))
skin.finish(color,rough,height,.0030,.22)

lip=Field('Titanichthys underside edentulous lip tissue')
p=lip.coords();noise=lip.noise(p,15,2.5,.67)
lip.finish(lip.mix((.112,.128,.106,1),(.205,.212,.170,1),noise),lip.add(.43,lip.mul(.03,noise)),lip.noise(p,95,2,.6),.0007,.12)
oral=Field('Titanichthys oral lining')
p=oral.coords();noise=oral.noise(p,7.5,2.8,.62)
oral.finish(oral.mix((.070,.039,.034,1),(.165,.094,.077,1),noise),oral.add(.36,oral.mul(.055,noise)),oral.noise(p,74,2,.58),.0008,.13)

fin=Field('Titanichthys fins membrane and quiet rays')
p=fin.coords();span,chord,top,paired=fin.attribute('TitanFin')
cloud=fin.noise(p,5.2,3.2,.66);fine=fin.noise(p,115,2,.60)
upper=fin.mix((.025,.067,.076,1),(.095,.137,.132,1),cloud)
upper=fin.mix(upper,(.019,.050,.062,1),fin.mul(.40,fin.smooth(span,.56,1.)))
under=fin.mix((.113,.155,.141,1),(.192,.215,.182,1),cloud)
color=fin.mix(under,upper,fin.add(.28,fin.mul(.72,top)))
# Scalar ray count from the attribute's paired flag; local c is transverse
# chord for paired fins and perimeter angle for dorsal/caudal fins.
ray_count=fin.add(22.,fin.mul(-7.,paired))
phase=fin.add(fin.mul(chord,ray_count),fin.mul(.045,fin.noise(p,8.3,2,.63)))
ridge=fin.math('POWER',fin.add(.5,fin.mul(.5,fin.math('COSINE',fin.mul(2*math.pi,phase)))),12.)
ray_amount=fin.mul(fin.smooth(span,.08,.30),fin.sub(1.,fin.smooth(span,.84,1.)))
color=fin.mix(color,(.138,.175,.148,1),fin.mul(.075,fin.mul(ridge,ray_amount)))
height=fin.add(fin.mul(.12,fine),fin.mul(.15,fin.mul(ridge,ray_amount)))
fin.finish(color,fin.add(.48,fin.add(fin.mul(.06,fine),fin.mul(.025,span))),height,.0015,.19)

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
    ob['material_study']='Titanichthys regional PBR material-01; no geometry edits'
    if geometry_hash(ob)!=original_geometry[ob.name]:raise RuntimeError('UV preparation changed accepted geometry: '+ob.name)

OUT.mkdir(parents=True)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
scene.render.threads_mode='FIXED';scene.render.threads=2
scene.render.bake.margin=12;scene.render.bake.use_selected_to_active=False
scene.render.bake.normal_space='TANGENT'
scene.render.bake.normal_r='POS_X';scene.render.bake.normal_g='POS_Y';scene.render.bake.normal_b='POS_Z'
procedural=OUT/'titanichthys-procedural-material-01.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(procedural))

textures=[]
def bake_family(objects,fields,family,size,specular=.32,coat=0.):
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
    if coat:bs.inputs['Coat Roughness'].default_value=.18
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

apply(body,bake_family([body],[skin,lip,oral],'body',2048))
for family,left,right,size in [('fins-pectoral','Long pectoral L','Long pectoral R',1024),('fins-pelvic','Pelvic L','Pelvic R',512)]:
    material=bake_family([fin_objects[left]],[fin],family,size)
    apply(fin_objects[left],material);apply(fin_objects[right],material)
for family,name,size in [('fins-dorsal','Modest swept dorsal',512),('fins-caudal','Strong heterocercal caudal',1024)]:
    apply(fin_objects[name],bake_family([fin_objects[name]],[fin],family,size))
eye_material=bake_family(sorted(eye_objects,key=lambda item:item.name),[eye],'eyes',512,.36,.08)
for ob in eye_objects:apply(ob,eye_material)

for ob in meshes:
    if geometry_hash(ob)!=original_geometry[ob.name]:raise RuntimeError('Material study changed accepted geometry: '+ob.name)
if sha(SOURCE)!=SOURCE_SHA or sha(ORAL_MANIFEST)!=ORAL_SHA:raise RuntimeError('Immutable input changed during material study')
scene.cycles.samples=48;scene.render.bake.use_clear=True
mapped=OUT/'titanichthys-material-01.blend'
bpy.ops.wm.save_as_mainfile(filepath=str(mapped))
report={'phase':'UNREVIEWED MATERIAL STUDY; COARSE FORM APPROVAL ONLY',
        'source_blend':str(SOURCE),'source_blend_sha256':SOURCE_SHA,'oral_manifest_sha256':ORAL_SHA,
        'builder_sha256':BUILDER_SHA,'material_script_sha256':sha(Path(__file__)),
        'procedural_blend':str(procedural),'procedural_blend_sha256':sha(procedural),
        'blend':str(mapped),'blend_sha256':sha(mapped),'geometry_sha256':original_geometry,
        'geometry_topology_shape_keys_transforms_unchanged':True,'textures':textures,
        'atlas_policy':'Six families; paired fins share mirrored UVs; both eyes occupy separate atlas halves',
        'color_policy':'Mapped albedo; white Color attribute, no duplicate tint or baked illumination',
        'normal_policy':'Tangent-space +X +Y +Z; self-baked subtle shader relief, no geometry displacement',
        'provenance':'Original authored regional procedural pigment; no user-reference or legacy model texture pixels',
        'uncertainties':'Pigmentation, microscopic puncta/grain, exact plate tone and soft-tissue colours are interpretations',
        'next':'Astra/root actual material review before any final rig, eye/general audit, export or public intake'}
(OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('TITANICHTHYS_MATERIAL_BUILD_OK '+str(OUT/'material-report.json'))
