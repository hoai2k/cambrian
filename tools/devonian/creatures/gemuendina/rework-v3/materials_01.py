"""Author and bake original regional materials onto accepted clay-02 geometry.

Run only through the frozen Terra handoff. Geometry positions remain unchanged.
Three separate scales: broad pigment, small mosaic fields, fine granulation.
"""
import bpy, math, json, hashlib, struct, sys
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/gemuendina/rework-v3'
SOURCE=LOCAL/'clay-02/gemuendina-clay-02.blend'
SOURCE_SHA='c4e65d1b0a37c9c034aaa6800bba8ad0b396d0547a4bf08faa276c62848c805f'
OUT=LOCAL/'material-01'
sys.dont_write_bytecode=True
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
if sha(SOURCE)!=SOURCE_SHA:raise RuntimeError('Accepted clay-02 hash mismatch')
if OUT.exists() and any(OUT.iterdir()):raise RuntimeError('material-01 already contains evidence')
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE));scene=bpy.context.scene
body=bpy.data.objects['Gemuendina_NEW_clay_envelope']
eyes=[bpy.data.objects['Dorsal_eye_'+s] for s in ('L','R')]
def geometry_hash(obj):
    return hashlib.sha256(b''.join(struct.pack('<fff',*v.co)for v in obj.data.vertices)).hexdigest()
initial_geometry={o.name:geometry_hash(o)for o in [body]+eyes}

class Field:
    def __init__(self,name):
        self.mat=bpy.data.materials.new(name);self.mat.use_nodes=True
        self.nodes=self.mat.node_tree.nodes;self.links=self.mat.node_tree.links
        self.nodes.clear();self.out=self.nodes.new('ShaderNodeOutputMaterial')
        self.bs=self.nodes.new('ShaderNodeBsdfPrincipled');self.links.new(self.bs.outputs['BSDF'],self.out.inputs['Surface'])
        self.bs.inputs['Metallic'].default_value=0;self.bs.inputs['Specular IOR Level'].default_value=.32
        self.bs.inputs['Coat Weight'].default_value=0
    def set(self,node,name,value):
        if hasattr(value,'is_output'):self.links.new(value,node.inputs[name])
        else:
            if isinstance(value,(int,float)) and node.inputs[name].type=='RGBA':value=(value,value,value,1)
            node.inputs[name].default_value=value
    def math(self,op,*values):
        n=self.nodes.new('ShaderNodeMath');n.operation=op
        for i,v in enumerate(values):self.set(n,i,v)
        return n.outputs[0]
    def add(self,a,b):return self.math('ADD',a,b)
    def mul(self,a,b):return self.math('MULTIPLY',a,b)
    def sub(self,a,b):return self.math('SUBTRACT',a,b)
    def div(self,a,b):return self.math('DIVIDE',a,b)
    def pow(self,a,b):return self.math('POWER',a,b)
    def clamp(self,a,lo=0,hi=1):return self.math('MINIMUM',self.math('MAXIMUM',a,lo),hi)
    def smooth(self,value,lo,hi):
        t=self.clamp(self.div(self.sub(value,lo),hi-lo))
        return self.mul(self.mul(t,t),self.sub(3,self.mul(2,t)))
    def mix(self,a,b,factor):
        n=self.nodes.new('ShaderNodeMixRGB');n.blend_type='MIX'
        self.set(n,0,factor);self.set(n,1,a);self.set(n,2,b);return n.outputs[0]
    def noise(self,vector,scale,detail=3,rough=.67):
        n=self.nodes.new('ShaderNodeTexNoise');self.set(n,'Vector',vector)
        self.set(n,'Scale',scale);self.set(n,'Detail',detail);self.set(n,'Roughness',rough)
        return n.outputs['Fac']
    def voronoi(self,vector,scale,feature):
        n=self.nodes.new('ShaderNodeTexVoronoi');n.voronoi_dimensions='3D';n.feature=feature
        self.set(n,'Vector',vector);self.set(n,'Scale',scale)
        if 'Randomness' in n.inputs:self.set(n,'Randomness',.93)
        return n
    def gauss(self,q):return self.math('EXPONENT',self.mul(-1,q))
    def ellipse(self,x,y,cx,cy,rx,ry,power=2):
        return self.add(self.pow(self.math('ABSOLUTE',self.div(self.sub(x,cx),rx)),power),
                        self.pow(self.math('ABSOLUTE',self.div(self.sub(y,cy),ry)),power))
    def finish(self,color,rough,height,distance=.010):
        self.color=color;self.rough=rough
        self.set(self.bs,'Base Color',color);self.set(self.bs,'Roughness',rough)
        bump=self.nodes.new('ShaderNodeBump');self.set(bump,'Height',height)
        self.set(bump,'Strength',.35);self.set(bump,'Distance',distance)
        self.links.new(bump.outputs['Normal'],self.bs.inputs['Normal'])
        return self

field=Field('Gemuendina_authored_olive_mosaic')
coord=field.nodes.new('ShaderNodeTexCoord');pos=coord.outputs['Object']
split=field.nodes.new('ShaderNodeSeparateXYZ');field.set(split,'Vector',pos)
x,y,z=[split.outputs[k]for k in 'XYZ'];ax=field.math('ABSOLUTE',x)
# Noise domains are independently rotated/distorted, so no common grid/band reads.
warp=field.nodes.new('ShaderNodeTexNoise');field.set(warp,'Vector',pos);field.set(warp,'Scale',2.7)
field.set(warp,'Detail',3.2);field.set(warp,'Roughness',.72)
vecscale=field.nodes.new('ShaderNodeVectorMath');vecscale.operation='SCALE'
field.set(vecscale,0,warp.outputs['Color']);field.set(vecscale,'Scale',.055)
vecadd=field.nodes.new('ShaderNodeVectorMath');vecadd.operation='ADD'
field.set(vecadd,0,pos);field.set(vecadd,1,vecscale.outputs['Vector']);organic=vecadd.outputs['Vector']
macro=field.noise(organic,1.55,3.5,.70);cloud=field.noise(organic,4.9,2.7,.71)
grain=field.noise(organic,148,2,.61)
base=field.mix((.042,.059,.018,1),(.172,.179,.059,1),field.smooth(macro,.24,.77))
base=field.mix(base,(.235,.203,.078,1),field.mul(.30,field.smooth(cloud,.53,.80)))
base=field.mix(base,(.046,.061,.027,1),field.mul(.24,field.smooth(cloud,.22,.49)))
# Regional controls use the accepted anatomy's world positions.
core_width=field.add(.13,field.mul(.80,field.gauss(field.pow(field.div(field.add(y,.9),1.5),2))))
fin=field.smooth(field.div(ax,core_width),.88,1.55)
dorsal=field.smooth(z,-.10,.12)
head=field.sub(1,field.smooth(y,-.60,-.24))
# Irregular tessera edges and varied cell tops; a separate finer granular field.
cells=field.voronoi(organic,19,'DISTANCE_TO_EDGE')
edge=field.sub(1,field.smooth(cells.outputs['Distance'],.008,.038))
tops=field.voronoi(organic,19,'F1')
celltone=field.nodes.new('ShaderNodeRGBToBW');field.set(celltone,'Color',tops.outputs['Color'])
tubercles=field.sub(1,field.smooth(tops.outputs['Distance'],.16,.44))
mosaic_strength=field.mul(dorsal,field.sub(1,field.mul(.78,fin)))
base=field.mix(base,(.032,.046,.016,1),field.mul(field.mul(edge,mosaic_strength),.39))
base=field.mix(base,(.244,.224,.095,1),field.mul(field.mul(celltone.outputs[0],mosaic_strength),.15))
# A few restrained cranial fields interpret broad bony/pigment regions. Exact
# homologous plate boundaries are not asserted, and their relief stays subtle.
cheek=field.ellipse(ax,y,.66,-1.00,.33,.36,4)
medial=field.ellipse(x,y,0,-1.20,.36,.43,4)
occipital=field.ellipse(x,y,0,-.61,.60,.15,2)
patch=field.math('MINIMUM',cheek,field.math('MINIMUM',medial,occipital))
patchinside=field.sub(1,field.smooth(patch,.72,1.04))
patchline=field.mul(field.smooth(patch,.68,.89),field.sub(1,field.smooth(patch,1.04,1.24)))
base=field.mix(base,(.191,.184,.064,1),field.mul(.20,patchinside))
base=field.mix(base,(.044,.057,.020,1),field.mul(.25,patchline))
# Fin ornament has the same pigment family but much quieter tubercle relief.
base=field.mix(base,(.152,.157,.064,1),field.mul(.17,fin))
under=field.mix((.161,.164,.083,1),(.285,.253,.132,1),macro)
color=field.mix(under,base,dorsal)
# No ornamental eye rings: soft local pigment subtly follows the real eye bed.
eye_radius=field.ellipse(ax,y,.55,-1.30,.21,.23,2)
eye_field=field.mul(.13,field.gauss(eye_radius))
color=field.mix(color,(.093,.109,.035,1),eye_field)
oralbed=field.gauss(field.ellipse(x,y,0,-1.75,.46,.105,4))
color=field.mix(color,(.215,.193,.103,1),field.mul(.25,oralbed))
rough=field.add(.51,field.add(field.mul(.08,grain),field.mul(.085,field.mul(edge,mosaic_strength))))
rough=field.add(rough,field.mul(.055,field.sub(1,dorsal)))
relief=field.add(field.mul(.34,grain),field.mul(.41,field.mul(tubercles,mosaic_strength)))
relief=field.sub(relief,field.mul(.13,field.mul(edge,mosaic_strength)))
relief=field.sub(relief,field.mul(.11,patchline))
relief=field.mul(relief,field.sub(1,field.mul(.75,oralbed)))
field.finish(color,rough,relief,.011)

mouth=Field('Gemuendina_authored_oral_tissue')
tex=mouth.nodes.new('ShaderNodeTexCoord');mp=tex.outputs['Object']
noise=mouth.noise(mp,33,2,.66)
mouth.finish(mouth.mix((.082,.052,.032,1),(.207,.139,.080,1),noise),.59,mouth.noise(mp,91,2,.60),.003)

eye=Field('Gemuendina_authored_eye')
tex=eye.nodes.new('ShaderNodeTexCoord');ep=tex.outputs['Generated']
se=eye.nodes.new('ShaderNodeSeparateXYZ');eye.set(se,'Vector',ep)
ex,ey,ez=[se.outputs[k]for k in 'XYZ']
radius=eye.ellipse(ex,ey,.5,.5,.40,.40,2)
iris=eye.sub(1,eye.smooth(radius,.32,.70))
pupil=eye.sub(1,eye.smooth(radius,.12,.23))
upper=eye.smooth(ez,.66,.84)
iristone=eye.noise(ep,44,2,.68)
iriscol=eye.mix((.045,.054,.017,1),(.150,.134,.035,1),iristone)
eyecolor=eye.mix((.008,.015,.010,1),iriscol,eye.mul(iris,upper))
eyecolor=eye.mix(eyecolor,(.002,.006,.004,1),eye.mul(pupil,upper))
eye.finish(eyecolor,.25,eye.noise(ep,76,1,.5),.00012)
eye.bs.inputs['Coat Weight'].default_value=.045

original_material_indices=[p.material_index for p in body.data.polygons]
body.data.materials.clear();body.data.materials.append(field.mat);body.data.materials.append(mouth.mat)
for p,index in zip(body.data.polygons,original_material_indices):p.material_index=index
for obj in eyes:obj.data.materials.clear();obj.data.materials.append(eye.mat)
for obj in [body]+eyes:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    if obj==body:
        if not obj.data.uv_layers:obj.data.uv_layers.new(name='UVMap')
        obj.data.uv_layers.active.name='UVMap'
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(68),island_margin=.012,area_weight=.25,correct_aspect=True)
        bpy.ops.object.mode_set(mode='OBJECT')
    obj['material_version']='Gemuendina original regional material-01'

# Save editable procedural authorship before baking; all outputs stay local.
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
scene.render.bake.margin=16;scene.render.bake.use_clear=True
scene.render.bake.use_selected_to_active=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gemuendina-procedural-material-01.blend'))

def bake_family(obj,fields,family,size):
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    baked={}
    for kind in ('albedo','roughness','normal'):
        im=bpy.data.images.new(f'gemuendina-{family}-{kind}',width=size,height=size,alpha=False,float_buffer=False)
        im.colorspace_settings.name='sRGB' if kind=='albedo' else 'Non-Color'
        emission=[]
        for f in fields:
            target=f.nodes.new('ShaderNodeTexImage');target.image=im;f.nodes.active=target
            if kind!='normal':
                node=f.nodes.new('ShaderNodeEmission');f.set(node,'Color',f.color if kind=='albedo' else f.rough)
                f.links.new(node.outputs[0],f.out.inputs['Surface']);emission.append((f,node))
            else:f.links.new(f.bs.outputs[0],f.out.inputs['Surface'])
        bpy.ops.object.bake(type='NORMAL' if kind=='normal' else 'EMIT')
        im.filepath_raw=str(OUT/f'{family}-{kind}.png');im.file_format='PNG';im.save();im.pack()
        baked[kind]=im
        for f,node in emission:f.links.new(f.bs.outputs[0],f.out.inputs['Surface']);f.nodes.remove(node)
        print('GEMUENDINA_MATERIAL_BAKE_OK '+family+' '+kind,flush=True)
    mat=bpy.data.materials.new('Gemuendina mapped '+family);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0
    bs.inputs['Specular IOR Level'].default_value=.32;bs.inputs['Coat Weight'].default_value=.045 if family=='eye' else 0
    for kind,im in baked.items():
        tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.interpolation='Linear';tx.extension='EXTEND'
        if kind=='normal':
            nm=mat.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=1
            mat.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);mat.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
        else:mat.node_tree.links.new(tx.outputs['Color'],bs.inputs['Base Color' if kind=='albedo' else 'Roughness'])
    return mat

bodymat=bake_family(body,[field,mouth],'body',2048)
eyemat=bake_family(eyes[0],[eye],'eye',512)
body.data.materials.clear();body.data.materials.append(bodymat)
for p in body.data.polygons:p.material_index=0
for obj in eyes:obj.data.materials.clear();obj.data.materials.append(eyemat)
for obj in [body]+eyes:
    if geometry_hash(obj)!=initial_geometry[obj.name]:raise RuntimeError('Material group changed accepted vertex coordinates: '+obj.name)
scene.cycles.samples=32
report={'phase':'material review pending','accepted_clay_sha256':SOURCE_SHA,
        'script_sha256':sha(HERE/'materials_01.py'),'geometry_sha256':initial_geometry,
        'geometry_unchanged':True,'uv':'Smart projected dedicated UVMap, unique packed surface islands',
        'texture_size':{'body':2048,'eye':512},'textures':[],
        'provenance':'Original authored procedural 3D fields; no external texture/paleoart pixels',
        'uncertainty':'Pigment, tessera spacing and cranial field boundaries are interpretations.'}
for p in sorted(OUT.glob('*.png')):report['textures'].append({'path':str(p),'bytes':p.stat().st_size,'sha256':sha(p)})
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'gemuendina-material-01.blend'))
report['blend_sha256']=sha(OUT/'gemuendina-material-01.blend')
(OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
for name,pos,target,scale in [
    ('material-oblique',(7,-7.8,6.4),(0,.70,.10),7.0),
    ('material-cranial',(2.1,-3.9,3.0),(0,-1.28,.25),2.7),
]:
    scene.camera.location=pos;scene.camera.rotation_euler=(Vector(target)-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera.data.ortho_scale=scale;scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    report.setdefault('renders',[]).append({'path':scene.render.filepath,'sha256':sha(scene.render.filepath)})
    (OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print('GEMUENDINA_MATERIAL_VIEW_OK '+name,flush=True)
(OUT/'material-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('GEMUENDINA_MATERIAL_GROUP_OK '+str(OUT/'material-report.json'))
