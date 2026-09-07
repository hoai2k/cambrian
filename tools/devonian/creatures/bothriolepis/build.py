"""Bothriolepis canadensis V2: continuous antiarch armour, embedded eyes, restrained fins.
Primary morphology: Bechard et al. 2014, doi:10.26879/417, figures 2-3.
Run Blender 5.2 --background --threads 2 --python this_file [-- --preview].
"""
import bpy,bmesh,math,json,sys,struct
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from math import sin,cos,pi
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[3];LOCAL=REPO.parent/'devonian-authoring/bothriolepis';OUT=REPO/'public/assets/devonian/creatures';PREVIEW='--preview' in sys.argv
LOCAL.mkdir(exist_ok=True,parents=True);OUT.mkdir(exist_ok=True,parents=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
scene=bpy.context.scene;scene.render.fps=30
arm=bpy.data.armatures.new('Bothriolepis V2 anatomical skeleton');rig=bpy.data.objects.new('Bothriolepis',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),None),('body',(0,-.3,0),'root'),('oral',(0,-1.34,-.19),'body'),('tail_base',(0,.13,-.02),'body'),('tail_mid',(0,.92,-.01),'tail_base'),('tail_tip',(0,1.71,.02),'tail_mid'),('caudal',(0,2.31,.04),'tail_tip'),('dorsal',(0,.90,.15),'tail_mid')]
for s in [-1,1]:
 side='L'if s>0 else'R';spec.extend([(f'pectoral_{side}',(s*.405,-1.025,-.15),'body'),(f'pectoral_tip_{side}',(s*.598,-.15,-.155),f'pectoral_{side}')])
for name,p,parent in spec:
 b=arm.edit_bones.new(name);b.head=p;b.tail=Vector(p)+Vector((0,0,.16) if name=='root' else (0,.16,0));b.use_deform=name!='root'
 if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
# Anatomical seams are encoded in a continuous shield surface and its UV material.
# UV U runs from snout to rear; V winds from right lateral through the dorsal midline.
SEAMS=[[(.255,.045),(.255,.15),(.263,.25),(.255,.35),(.255,.455)],[(.263,.25),(.365,.205),(.58,.205),(.70,.25)],[(.263,.25),(.365,.295),(.58,.295),(.70,.25)],[(.365,.205),(.40,.105),(.64,.045)],[(.365,.295),(.40,.395),(.64,.455)],[(.70,.25),(.83,.20),(.985,.215)],[(.70,.25),(.83,.30),(.985,.285)],[(.58,.205),(.64,.105),(.80,.085),(.98,.06)],[(.58,.295),(.64,.395),(.80,.415),(.98,.44)],[(.07,.10),(.15,.16),(.255,.15)],[(.07,.40),(.15,.34),(.255,.35)],[(.15,.16),(.17,.215)],[(.15,.34),(.17,.285)],[(.4,.57),(.57,.62),(.78,.58),(.97,.6)],[(.4,.93),(.57,.88),(.78,.92),(.97,.9)],[(.57,.62),(.52,.75),(.57,.88)],[(.78,.58),(.82,.75),(.78,.92)]]
def distance_lines(u,v):
 dist=np.full(np.broadcast(u,v).shape,100.,dtype=np.float32)
 for line in SEAMS:
  for a,b in zip(line,line[1:]):
   ax,ay=a;bx,by=b;dx,dy=bx-ax,by-ay;t=np.clip(((u-ax)*dx+(v-ay)*dy)/(dx*dx+dy*dy),0,1)
   dist=np.minimum(dist,np.sqrt((u-ax-t*dx)**2+(v-ay-t*dy)**2))
 return dist
N=1024;yy,xx=np.mgrid[0:N,0:N].astype(np.float32)/N
source=bpy.data.images.load(str(HERE/'dermal-source-v2.png'));sw,sh=source.size;sp=np.array(source.pixels[:],dtype=np.float32).reshape(sh,sw,4)
# Derive an original subdued material from the imagegen swatch. Image is detail, not anatomy.
ix=((xx*2.2)%1*(sw-1)).astype(int);iy=((yy*2.2)%1*(sh-1)).astype(int);sample=sp[iy,ix,:3];lum=sample.mean(2);lum=(lum-lum.mean())/(lum.std()+1e-8)
dist=distance_lines(xx,yy);groove=np.exp(-(dist/.0019)**2);lip=np.exp(-((dist-.006)/.0025)**2)
# Colour map is a near-neutral modulation; authored vertex pigments carry countershading.
shade=np.clip(.79+.043*lum-.24*groove+.012*lip,.35,.94)
rgba=np.ones((N,N,4),np.float32);rgba[:,:,:3]=shade[:,:,None]*np.array([1.0,.985,.95])
def save_image(name,data,noncolor=False):
 im=bpy.data.images.new(name,width=N,height=N);im.pixels.foreach_set(data.astype(np.float32).ravel());im.filepath_raw=str(HERE/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 if noncolor:im.colorspace_settings.name='Non-Color'
 return im
albedo=save_image('armour-detail-v2',rgba)
height=.08*lum-.48*groove;gx=(np.roll(height,1,1)-np.roll(height,-1,1))*.19;gy=(np.roll(height,1,0)-np.roll(height,-1,0))*.19
normal=np.ones((N,N,4),np.float32);length=np.sqrt(gx*gx+gy*gy+1);normal[:,:,0]=.5+.5*gx/length;normal[:,:,1]=.5+.5*gy/length;normal[:,:,2]=.5+.5/length
normalmap=save_image('armour-normal-v2',normal,True)
rough=np.ones((N,N,4),np.float32);rough[:,:,:3]=np.clip(.59+.025*lum+.07*groove,.49,.72)[:,:,None];roughmap=save_image('armour-roughness-v2',rough,True)
M={}
for name,base,r in [('armour',(.12,.138,.076),.59),('pectoral',(.15,.163,.091),.59),('body',(.11,.145,.066),.48),('fins',(.14,.17,.085),.44),('underside',(.31,.265,.17),.5),('eyes',(.004,.008,.007),.12),('oral',(.055,.043,.027),.52),('gill',(.024,.035,.022),.55)]:
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*base,1);mat.use_nodes=True;nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*base,1);bs.inputs['Roughness'].default_value=r;bs.inputs['Coat Weight'].default_value=.16 if name=='eyes'else .025
 if name!='eyes':
  vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name=='armour':
  tex=nodes.new('ShaderNodeTexImage');tex.image=albedo;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
  no=nodes.new('ShaderNodeNormalMap');no.inputs['Strength'].default_value=.55;nt=nodes.new('ShaderNodeTexImage');nt.image=normalmap;links.new(nt.outputs['Color'],no.inputs['Color']);links.new(no.outputs['Normal'],bs.inputs['Normal']);rt=nodes.new('ShaderNodeTexImage');rt.image=roughmap;links.new(rt.outputs['Color'],bs.inputs['Roughness'])
 M[name]=mat
objects=[]
def pigment(p,material):
 x,y,z=p;base=np.array(M[material].diffuse_color[:3]);top=np.clip((z+.18)/.48,0,1);slow=.028*sin(4.1*y+1.7*x)+.013*sin(11.5*y-9*x+z*3)
 if material in ['body','armour','pectoral','fins']:
  base=base*(.78+.25*top+slow)
  belly=np.clip((-z-.04)/.18,0,1);base=base*(1-.47*belly)+np.array([.27,.235,.145])*.47*belly
 return (*np.clip(base,0,1),1)
def mesh(name,verts,faces,material,bone='body',weights=None,uvs=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);me.materials.append(M[material]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 uv=me.uv_layers.new(name='UVMap');col=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for i,v in enumerate(me.vertices):col.data[i].color=pigment(v.co,material)
 for p in me.polygons:
  for li in p.loop_indices:
   idx=me.loops[li].vertex_index;v=me.vertices[idx].co;uv.data[li].uv=uvs[idx]if uvs else((v.y+1.45)/1.6,(math.atan2(v.z-.03,v.x)/(2*pi))%1)
 if weights:
  groups={key:o.vertex_groups.new(name=key)for key in set(k for w in weights for k in w)}
  for i,w in enumerate(weights):
   total=sum(w.values())
   for key,val in w.items():
    if val>0:groups[key].add([i],val/total,'REPLACE')
 else:o.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
 mod=o.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;o.parent=rig
 return o
# A transverse polygon describes the characteristic flat floor, angular side shoulders,
# and median dorsal crest. Dense Catmull interpolation rounds surfaces without ballooning them.
RINGS=[(-1.47,.18,.00,-.205),(-1.425,.26,.065,-.21),(-1.32,.315,.22,-.215),(-1.16,.345,.38,-.22),(-1.025,.405,.445,-.22),(-.75,.465,.465,-.22),(-.39,.49,.49,-.22),(-.04,.43,.505,-.205),(.12,.345,.525,-.19),(.17,.305,.535,-.18)]
def interp(data,t):
 k=min(len(data)-2,max(0,int(t)));f=t-k;a=np.array(data[max(0,k-1)]);b=np.array(data[k]);c=np.array(data[k+1]);d=np.array(data[min(len(data)-1,k+2)])
 return .5*(2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)
def ring_section(y,width,top,bottom):
 # clockwise around cross-section, start lateral right at mid-height
 return [(width,y,bottom+.44*(top-bottom)),(.87*width,y,bottom+.73*(top-bottom)),(.52*width,y,top-.052),(0,y,top),(-.52*width,y,top-.052),(-.87*width,y,bottom+.73*(top-bottom)),(-width,y,bottom+.44*(top-bottom)),(-.89*width,y,bottom+.03),(-.50*width,y,bottom),(0,y,bottom),(.50*width,y,bottom),(.89*width,y,bottom+.03)]
def transverse(y,w,t,b,angle):
 points=ring_section(y,w,t,b);q=(angle%(2*pi))/(2*pi)*len(points);i=int(q);f=q-i
 a=np.array(points[(i-1)%len(points)]);bb=np.array(points[i]);c=np.array(points[(i+1)%len(points)]);d=np.array(points[(i+2)%len(points)])
 return .5*(2*bb+(-a+c)*f+(2*a-5*bb+4*c-d)*f*f+(-a+3*bb-3*c+d)*f*f*f)
verts=[];uvs=[];faces=[];NY=181;NA=120
for j in range(NY):
 y,w,t,b=interp(RINGS,j/(NY-1)*(len(RINGS)-1))
 for k in range(NA+1):
  angle=k*2*pi/NA;p=transverse(y,w,t,b,angle);u=(y+1.47)/1.64;v=k/NA
  seam=float(distance_lines(np.array(u),np.array(v)));p[2]-=.0013*math.exp(-(seam/.0038)**2)*max(0,sin(angle))
  verts.append(tuple(p));uvs.append((u,v))
for j in range(NY-1):
 for k in range(NA):a=j*(NA+1)+k;faces.append((a,a+1,a+NA+2,a+NA+1))
faces.extend([tuple(range(NA,-1,-1)),tuple((NY-1)*(NA+1)+k for k in range(NA+1))])
shield=mesh('head_envelope_closed',verts,faces,'armour',uvs=uvs)
# The anatomical front cap needs a real recessed oral aperture. Otherwise the
# separately animated oral folds sit in front of solid armour at maximum gape.
bm=bmesh.new();bm.from_mesh(shield.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bm.to_mesh(shield.data);bm.free()
shield.data.materials.append(M['oral']);shield.data.materials.append(M['pectoral'])
# The cap's longitudinal UV collapses to a line: use its authored pigmentation
# without the side-wall normal map, which would streak across the whole face.
shield.data.polygons[-2].material_index=2
cv=[];cf=[];CN=64;CR=20
for j in range(CR):
 t=j/(CR-1);cy=-1.51+.27*t;rx=.132*(1-.83*t);rz=.043*(1-.63*t);cz=-.205+.016*t
 for k in range(CN):
  a=2*pi*k/CN;cv.append((rx*cos(a),cy,cz+rz*sin(a)))
for j in range(CR-1):
 for k in range(CN):a=j*CN+k;cf.append((a,j*CN+(k+1)%CN,(j+1)*CN+(k+1)%CN,a+CN))
cf.extend([tuple(range(CN-1,-1,-1)),tuple((CR-1)*CN+k for k in range(CN))])
cm=bpy.data.meshes.new('Temporary oral recess cutter');cm.from_pydata(cv,[],cf);cm.update()
bm=bmesh.new();bm.from_mesh(cm);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(cm);bm.free()
cut=bpy.data.objects.new('Temporary oral recess cutter',cm);scene.collection.objects.link(cut)
cm.materials.append(M['oral'])
bpy.context.view_layer.objects.active=shield;shield.select_set(True)
mod=shield.modifiers.new('Recessed ventral oral aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cut
bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
# Weld the Boolean seam and explicitly triangulate concave cut faces before export.
bm=bmesh.new();bm.from_mesh(shield.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.dissolve_degenerate(bm,edges=list(bm.edges),dist=1e-7);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));assert all(e.is_manifold for e in bm.edges),'Open oral-recess seam';bm.to_mesh(shield.data);bm.free()
# Boolean cut faces use oral pigment and body weights; all final head tissue is
# still one closed volume, and the mouth's flexible floor is authored below.
oralverts={vi for poly in shield.data.polygons if poly.material_index==1 for vi in poly.vertices}
for vi in oralverts:shield.data.color_attributes['Color'].data[vi].color=pigment(shield.data.vertices[vi].co,'oral')
shield.vertex_groups['body'].add(list(range(len(shield.data.vertices))),1,'REPLACE')
shield.select_set(False)

# Actual outside surface, with no separate eye pads or ornament hoops.
tree=BVHTree.FromPolygons([v.co.copy()for v in shield.data.vertices],[list(p.vertices)for p in shield.data.polygons])
def ellipse(name,center,basis,radii,material,bone='body',N=64,R=32):
 center=Vector(center);basis=list(map(Vector,basis));vv=[];ff=[]
 for j in range(R+1):
  lat=pi*j/R
  for k in range(N):
   a=2*pi*k/N;vv.append(tuple(center+basis[0]*(radii[0]*sin(lat)*cos(a))+basis[1]*(radii[1]*sin(lat)*sin(a))+basis[2]*(radii[2]*cos(lat))))
 for j in range(R):
  for k in range(N):a=j*N+k;ff.append((a,j*N+(k+1)%N,(j+1)*N+(k+1)%N,a+N))
 return mesh(name,vv,ff,material,bone)
eye_specs=[]
for side in [-1,1]:
 point,normal,_,_=tree.ray_cast(Vector((side*.071,-1.285,1)),Vector((0,0,-1)))
 if normal.z<0:normal=-normal
 tangent=Vector((1,0,0));tangent=(tangent-normal*tangent.dot(normal)).normalized();across=normal.cross(tangent).normalized();radii=(.030,.033,.023)
 center=point-normal*.0095
 ellipse('eye_globe_'+('L'if side>0 else'R'),center,[tangent,across,normal],radii,'eyes')
 eye_specs.append({'name':'eye_globe_'+('L'if side>0 else'R'),'center':list(center),'basis':[list(v)for v in [tangent,across,normal]],'radii':radii,'surfacePoint':list(point)})
(HERE/'eyes-v2.json').write_text(json.dumps(eye_specs,indent=2))
# Fleshy posterior begins inside the armour's rear opening and relaxes to a slender tail.
TR=[(.09,.307,.31,.13),(.31,.28,.265,.105),(.68,.225,.16,.05),(1.05,.158,.106,.015),(1.40,.114,.074,.023),(1.80,.080,.054,.036),(2.17,.058,.038,.051),(2.52,.038,.025,.071),(2.85,.009,.011,.115)]
def tailweight(y):
 centers=[(.15,'body'),(.43,'tail_base'),(1.12,'tail_mid'),(1.88,'tail_tip'),(2.43,'caudal')]
 if y<=centers[0][0]:return {'body':1}
 if y>=centers[-1][0]:return {'caudal':1}
 for (a,an),(b,bn)in zip(centers,centers[1:]):
  if a<=y<=b:
   t=(y-a)/(b-a);return {an:1-t,bn:t}
v=[];f=[];weights=[];uv=[];rows=145;sides=64
for j in range(rows):
 y,rx,rz,z=interp(TR,j/(rows-1)*(len(TR)-1))
 for k in range(sides+1):
  a=2*pi*k/sides;v.append((rx*cos(a),y,z+rz*sin(a)));weights.append(tailweight(y));uv.append((y*.7,k/sides))
for j in range(rows-1):
 for k in range(sides):a=j*(sides+1)+k;f.append((a,a+1,a+sides+2,a+sides+1))
f.extend([tuple(range(sides,-1,-1)),tuple((rows-1)*(sides+1)+k for k in range(sides+1))]);mesh('Muscular flexible posterior',v,f,'body',weights=weights,uvs=uv)
# Small subterminal ventral oral vestibule: continuous curved funnel with tissue floor.
vv=[];ff=[];ww=[];N=64;rows=18
for j in range(rows):
 t=j/(rows-1);cy=-1.478+.19*t;rx=.118*(1-.79*t);rz=.020*(1-.50*t)
 for k in range(N):
  a=2*pi*k/N;vv.append((rx*cos(a),cy,-.205+.018*t+rz*sin(a)));w=max(0,-sin(a))*(1-t)*.8;ww.append({'body':1-w,'oral':w})
for j in range(rows-1):
 for k in range(N):a=j*N+k;ff.append((a,j*N+(k+1)%N,(j+1)*N+(k+1)%N,a+N))
ff.append(tuple((rows-1)*N+k for k in range(N)));mesh('Oral palate walls and throat',vv,ff,'oral',weights=ww)
# Lower oral fold is shallow and toothless, retained below the rigid anterior shield.
lipv=[];lipf=[];lipw=[];LS=64;LR=10
for j in range(LS+1):
 a=pi+pi*j/LS;center=Vector((.118*cos(a),-1.477,-.205+.021*sin(a)))
 for k in range(LR):
  b=2*pi*k/LR;lipv.append(tuple(center+Vector((0,.003*cos(b),.003*sin(b)))))
  weight=.8*max(0,-sin(a));lipw.append({'body':1-weight,'oral':weight})
for j in range(LS):
 for k in range(LR):n=j*LR+k;lipf.append((n,j*LR+(k+1)%LR,(j+1)*LR+(k+1)%LR,n+LR))
lipf.extend([tuple(range(LR-1,-1,-1)),tuple(LS*LR+k for k in range(LR))]);mesh('Mobile ventral oral fold',lipv,lipf,'oral',weights=lipw)
# Recessed gill slits occupy the posterior submarginal margin beside the pectoral origin.
for side in [-1,1]:
 ellipse('Branchial cleft '+str(side),(side*.388,-1.045,-.072),[(0,1,0),(0,0,1),(1,0,0)],(.045,.039,.008),'gill','body',40,20)
# Pectoral fins: rigid flattened dermal segments, overlapping scarf joints, no ball primitives.
def segment(name,a,b,width,depth,bone,tip=False):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=Vector((axis.y,-axis.x,0)).normalized();z=axis.cross(u).normalized();vv=[];ff=[];N=32;R=48
 for j in range(R+1):
  t=j/R;p=a.lerp(b,t);fall=(.86+.17*sin(pi*t))*(1-(.91 if tip else .30)*t);w=width*fall;d=depth*fall
  for k in range(N+1):
   ang=2*pi*k/N;rel=u*cos(ang)*w+z*sin(ang)*d;vv.append(tuple(p+rel))
 for j in range(R):
  for k in range(N):n=j*(N+1)+k;ff.append((n,n+1,n+N+2,n+N+1))
 ff.extend([tuple(range(N,-1,-1)),tuple(R*(N+1)+k for k in range(N+1))]);o=mesh(name,vv,ff,'pectoral',bone)
 return o
for s in [-1,1]:
 side='L'if s>0 else'R';a=Vector((s*.405,-1.025,-.15));b=Vector((s*.598,-.15,-.155));c=Vector((s*.66,.57,-.16))
 # Root begins within shield and continues as an angular flattened shoulder collar.
 segment('Embedded brachial shoulder '+side,a-Vector((s*.055,.065,0)),a+Vector((s*.015,.09,0)),.10,.044,'body')
 segment('Proximal dermal pectoral '+side,a-Vector((0,.015,0)),b+Vector((0,.037,0)),.105,.039,'pectoral_'+side)
 segment('Distal dermal pectoral '+side,b-Vector((0,.047,0)),c,.058,.024,'pectoral_tip_'+side,True)
 # Small edge denticles belong to the rigid segment, tapering into its flattened margins.
 for aa,bb,width,bone,number in [(a,b,.098,'pectoral_'+side,22),(b,c,.048,'pectoral_tip_'+side,18)]:
  axis=(bb-aa).normalized();edge=Vector((axis.y,-axis.x,0)).normalized();verts=[];faces=[]
  for j in range(number):
   t=.09+.82*j/(number-1);fall=(1-.30*t)if bone=='pectoral_'+side else(1-.91*t)
   for sign in [-1,1]:
    p=aa.lerp(bb,t)+edge*sign*width*fall;size=.0055*(1-.4*t);idx=len(verts)
    verts.extend([tuple(p-axis*.006),tuple(p+axis*.006),tuple(p+edge*sign*size+axis*.002+Vector((0,0,.002)))])
    faces.append((idx,idx+1,idx+2))
  mesh('Marginal dermal denticles '+bone,verts,faces,'pectoral',bone)
def fin(name,base,boundary,bone,tail=False):
 origin=Vector(base);outline=list(map(Vector,boundary));dense=[]
 for i in range(len(outline)-1):
  for j in range(6):dense.append(Vector(interp(outline,i+j/6)))
 dense.append(outline[-1]);vv=[];ff=[];ww=[];uv=[];R=15
 for i,p in enumerate(dense):
  for j in range(R+1):
   t=j/R;q=origin.lerp(p,t);q.x=.0045*sin(pi*t)*sin(i*pi/max(1,len(dense)-1));vv.append(tuple(q));ww.append(tailweight(q.y)if tail else {bone:1});uv.append((i/max(1,len(dense)-1),t))
 for i in range(len(dense)-1):
  for j in range(R):a=i*(R+1)+j;ff.append((a,a+1,a+R+2,a+R+1))
 o=mesh(name,vv,ff,'fins',bone,ww,uv);sol=o.modifiers.new('Fine fin membrane','SOLIDIFY');sol.thickness=.003;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
fin('Single rounded dorsal fin',(0,.93,.15),[(0,.62,.18),(0,.70,.39),(0,.83,.48),(0,1.07,.41),(0,1.24,.23),(0,1.27,.12)],'dorsal')
fin('Continuous heterocercal caudal membrane',(0,2.24,.05),[(0,1.91,.055),(0,2.38,.13),(0,2.88,.20),(0,3.055,.20),(0,2.93,.15),(0,2.75,-.085),(0,2.50,-.25),(0,2.19,-.23),(0,1.98,-.11),(0,1.91,.025)],'caudal',True)
# Fin rays remain fine pigmented striae rather than exposed cord geometry.
for o in objects:
 if o.data.materials[0].name!='fins':continue
 col=o.data.color_attributes['Color'];uv=o.data.uv_layers[0];vertex_uv={li.vertex_index:uv.data[i].uv.copy()for i,li in enumerate(o.data.loops)}
 for i,v in enumerate(o.data.vertices):
  a=vertex_uv.get(i,Vector((0,0)));stripe=.93+.07*cos(a.x*2*pi*19)**12;c=pigment(v.co,'fins');col.data[i].color=(c[0]*stripe,c[1]*stripe,c[2]*stripe,1)
anchors=[('anchor_mouth','oral',(0,-1.468,-.198),'mouth'),('anchor_mouth_inside','oral',(0,-1.351,-.184),'swallow'),('anchor_attack_primary','body',(0,-1.468,-.02),'attack')]
for name,bone,p,role in anchors:
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=bone;o['cambrianAnchor']={'version':1,'role':role,'parentBone':bone}
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Growth':1.5};loops=['Idle','Swim','Guard','Eat']
def smooth(t):return max(0,min(1,t))**2*(3-2*max(0,min(1,t)))
def pulse(t,start,peak,end):
 if t<start or t>end:return 0
 return smooth((t-start)/(peak-start))if t<peak else 1-smooth((t-peak)/(end-peak))
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;frames=round(duration*30)
 for frame in range(frames+1):
  t=frame/frames;phase=2*pi*t;env=sin(pi*t)**2
  for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def move(x=0,y=0,z=0):rig.pose.bones['body'].location=(x,y,z)
  def tail(amp,frequency=1,offset=0):
   # Delayed curvature travels from muscular posterior to caudal tip, not rigid shield.
   for i,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):rot(b,z=amp*(.35+.25*i)*sin(frequency*phase-.66*i+offset),x=.02*amp*sin(frequency*phase-.5*i))
  def fins(amount,phaseoffset=0):
   for side,sign in [('L',1),('R',-1)]:
    rot('pectoral_'+side,x=.025*amount*sin(phase+phaseoffset),y=sign*.040*amount*sin(phase+.5),z=sign*.07*amount*(1-cos(phase))/2)
    rot('pectoral_tip_'+side,z=sign*.040*amount*sin(phase-.55))
  if name=='Idle':
   tail(.043);fins(.28);rot('oral',x=.03*(1-cos(phase*2)));rot('dorsal',z=.026*sin(phase-.7));rot('body',y=.008*sin(phase));move(z=.007*sin(phase))
  elif name=='Swim':
   tail(.25,2);fins(.9);rot('body',y=.032*sin(phase*2+.5),z=-.018*sin(phase*2));move(z=.014*sin(phase*4+.7));rot('dorsal',z=.05*sin(phase*2-1));rot('oral',x=.014*(1-cos(phase*2)))
  elif name=='Eat':
   tail(.039);rot('body',x=.035*(1-cos(phase)));move(z=-.015*(1-cos(phase)));fins(.45)
   gape=.17*pulse(t,.02,.15,.31)+.23*pulse(t,.43,.60,.82);rot('oral',x=gape);rot('dorsal',z=.018*sin(phase));rot('tail_tip',z=.065*sin(phase-.9))
  elif name=='Guard':
   tail(.032);rot('body',x=.025*(1-cos(phase)),y=.014*sin(phase));rot('pectoral_L',z=.11+.018*sin(phase),x=.025*sin(phase));rot('pectoral_R',z=-.11-.018*sin(phase),x=.025*sin(phase));rot('dorsal',z=.018*sin(phase+.6));rot('oral',x=.022*(1-cos(phase)))
  elif name=='Death':
   fall=smooth((t-.10)/.7);settle=smooth((t-.55)/.4);tail(.13*(1-smooth(t/.55)),2)
   rot('body',y=.72*fall,z=.09*settle,x=.035*fall);move(z=-.14*fall,y=.02*settle)
   for i,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):rot(b,z=(.10+.035*i)*fall+.08*sin(phase*3-i*.7)*max(0,1-t/.65)**2)
   rot('pectoral_L',x=.06*fall,z=.07*fall);rot('pectoral_R',x=-.07*fall,z=-.13*fall);rot('pectoral_tip_R',z=-.065*fall);rot('oral',x=.08*fall);rot('dorsal',z=-.14*settle)
  else:
   tail(.07*env);fins(.5*env);rot('dorsal',z=.027*sin(phase-.5)*env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft'else-1;load=pulse(t,0,.18,.42);arc=pulse(t,.11,.52,.96);late=pulse(t,.30,.67,1)
    rot('body',z=s*(.40*arc-.045*load),y=s*.15*arc);move(x=s*.13*arc,z=.022*arc)
    rot('tail_base',z=-s*.25*arc);rot('tail_mid',z=-s*.22*late);rot('tail_tip',z=s*.16*late);rot('caudal',z=s*.19*pulse(t,.48,.76,1))
    rot('pectoral_L',z=.06*arc+s*.07*arc,x=.045*arc);rot('pectoral_R',z=-.06*arc+s*.07*arc,x=-.035*arc)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive'else-1;load=pulse(t,0,.18,.4);pitch=pulse(t,.08,.55,.98);late=pulse(t,.32,.70,1)
    rot('body',x=s*(.24*pitch-.035*load),y=.03*sin(phase)*env);move(z=-s*.12*pitch)
    rot('pectoral_L',x=s*.07*pitch,z=.08*pitch);rot('pectoral_R',x=s*.07*pitch,z=-.08*pitch);rot('tail_base',x=-s*.065*late);rot('caudal',x=-s*.055*late,z=.14*sin(phase*2)*env)
   elif name in ['Attack','Heavy']:
    heavy=name=='Heavy';load=pulse(t,0,.25,.45);drive=pulse(t,.26,.52,.86);recover=pulse(t,.58,.80,1)
    move(y=(.10 if heavy else .065)*load-(.23 if heavy else .16)*drive,z=.015*load-.035*drive)
    rot('body',x=.06*load-.085*drive,y=(.10 if heavy else .045)*drive,z=-.045*recover)
    rot('tail_base',z=.14*load-.23*drive);rot('tail_mid',z=-.11*load+.31*drive);rot('tail_tip',z=.33*pulse(t,.4,.63,.94));rot('caudal',z=-.32*pulse(t,.5,.70,1))
    rot('pectoral_L',z=.12*load-.035*drive,x=.045*load);rot('pectoral_R',z=-.12*load+.035*drive,x=.045*load);rot('oral',x=.07*drive);rot('dorsal',z=.08*drive-.03*recover)
   elif name=='Bite':
    opening=pulse(t,.04,.35,.70);close=pulse(t,.43,.67,.92);rot('oral',x=.28*opening);rot('body',x=.037*opening-.03*close);move(y=-.035*close,z=-.015*opening);rot('tail_mid',z=.055*pulse(t,.25,.7,1))
   elif name=='Ability':
    deploy=pulse(t,.02,.29,.64);asym=pulse(t,.38,.60,.86);relax=pulse(t,.62,.84,1)
    rot('body',y=.065*asym,z=.055*asym-.04*relax);move(z=.034*deploy)
    rot('pectoral_L',z=.19*deploy-.045*asym,y=.12*deploy,x=.055*deploy);rot('pectoral_R',z=-.19*deploy-.03*asym,y=-.12*deploy,x=.055*deploy)
    rot('pectoral_tip_L',z=.075*pulse(t,.10,.39,.79));rot('pectoral_tip_R',z=-.065*pulse(t,.15,.43,.82));tail(.16*env,2);rot('dorsal',z=.09*sin(phase*2)*env);rot('oral',x=.10*relax)
   elif name=='Hit':
    impact=pulse(t,0,.14,.45);recoil=pulse(t,.2,.52,.90);rot('body',y=.18*impact-.05*recoil,z=-.12*impact+.055*recoil);move(x=.055*impact,z=-.025*impact);rot('tail_base',z=.16*impact);rot('tail_tip',z=-.19*recoil);rot('oral',x=.095*impact);rot('pectoral_L',x=.05*impact);rot('pectoral_R',z=-.13*impact)
   elif name=='Stagger':
    a=pulse(t,0,.17,.43);b=pulse(t,.27,.46,.73);c=pulse(t,.62,.78,1);rot('body',y=.16*a-.10*b+.04*c,z=-.12*a+.085*b);move(x=.07*a-.04*b,z=-.025*(a+b));rot('tail_base',z=.17*a-.21*b);rot('tail_tip',z=-.20*a+.24*b-.08*c);rot('oral',x=.08*b);rot('pectoral_L',z=.12*a);rot('pectoral_R',z=-.09*b)
   elif name=='Parry':
    a=pulse(t,0,.33,.73);b=pulse(t,.4,.68,1);rot('body',y=.19*a,z=-.15*a+.025*b);move(x=.07*a);rot('tail_base',z=.21*a);rot('tail_tip',z=-.26*b);rot('pectoral_R',z=-.15*a);rot('pectoral_L',x=.06*a)
   elif name=='Dodge':
    coil=pulse(t,0,.23,.46);escape=pulse(t,.17,.56,.91);whip=pulse(t,.42,.75,1);rot('body',y=-.22*escape,z=.26*escape-.04*coil);move(x=.21*escape,z=.045*escape)
    rot('tail_base',z=.19*coil-.29*escape);rot('tail_mid',z=-.20*coil+.31*escape);rot('tail_tip',z=-.37*whip);rot('caudal',z=.28*whip);rot('pectoral_L',z=.13*coil-.04*escape);rot('pectoral_R',x=.065*escape);rot('dorsal',z=.11*whip)
   elif name=='Growth':
    stretch=pulse(t,0,.46,1);rot('body',x=-.04*stretch);move(z=.018*stretch);rot('pectoral_L',z=.13*stretch,y=.07*stretch);rot('pectoral_R',z=-.13*stretch,y=-.07*stretch);rot('oral',x=.12*pulse(t,.15,.40,.8));rot('dorsal',z=.07*pulse(t,.27,.60,1));rot('tail_tip',z=.12*sin(phase)*env)
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update()
for name,bone,p,role in anchors:bpy.data.objects[name].matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update();(HERE/'anchors.json').write_text(json.dumps({'bothriolepis':[{'name':n,'bone':b,'point':p,'role':r}for n,b,p,r in anchors]},indent=2))
CAND=LOCAL/'v2-candidate';CAND.mkdir(exist_ok=True)
sourcepath=LOCAL/'bothriolepis-v2.blend';bpy.ops.wm.save_as_mainfile(filepath=str(sourcepath))
def restore_vertex_colors(filepath,obj):
 # Blender5.2 can emit white COLOR_0 on later primitives of a joined mesh.
 # Restore those values from the authored POINT Color layer, matched in export coordinates.
 raw=bytearray(Path(filepath).read_bytes());jslen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jslen]);binary_start=20+jslen+8;trees={};colors=obj.data.color_attributes['Color'];total=0
 def data(accessor_index):
  a=doc['accessors'][accessor_index];view=doc['bufferViews'][a['bufferView']];fmt,width={5121:('B',1),5123:('H',2),5126:('f',4)}[a['componentType']];n={'VEC3':3,'VEC4':4}[a['type']];stride=view.get('byteStride',n*width);offset=binary_start+view.get('byteOffset',0)+a.get('byteOffset',0);return a,fmt,width,n,stride,offset
 for mesh in doc['meshes']:
  if mesh.get('name')!=obj.data.name:continue
  for primitive in mesh['primitives']:
   if 'COLOR_0' not in primitive['attributes']:continue
   ca,cf,cw,cn,cs,co=data(primitive['attributes']['COLOR_0']);scale=65535 if ca['componentType']==5123 else 255 if ca['componentType']==5121 else 1
   existing=[struct.unpack_from('<'+cf*cn,raw,co+i*cs) for i in range(ca['count'])]
   if not all(all(v>=scale*.999 for v in q[:3]) for q in existing):continue
   material=doc['materials'][primitive['material']]['name'];slot=next(i for i,m in enumerate(obj.data.materials) if m.name==material)
   if slot not in trees:
    vertices=set(v for poly in obj.data.polygons if poly.material_index==slot for v in poly.vertices);tree=KDTree(len(vertices))
    for v in sorted(vertices):p=obj.data.vertices[v].co;tree.insert((p.x,p.z,-p.y),v)
    tree.balance();trees[slot]=tree
   pa,pf,pw,pn,ps,po=data(primitive['attributes']['POSITION']);assert pa['count']==ca['count']
   for i in range(pa['count']):
    p=struct.unpack_from('<fff',raw,po+i*ps);_,idx,distance=trees[slot].find(p);assert distance<max(obj.dimensions)*1e-4+1e-6,(material,distance)
    color=colors.data[idx].color;values=[float(v) if cf=='f' else round(max(0,min(1,v))*scale) for v in color]
    struct.pack_into('<'+cf*cn,raw,co+i*cs,*values[:cn]);total+=1
 Path(filepath).write_bytes(raw)
 if total:print('Restored authored vertex pigmentation:',Path(filepath).name,total,flush=True)


def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for name,_,_,_ in anchors:bpy.data.objects[name].select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
 for o in objects:restore_vertex_colors(path,o)
export(CAND/'bothriolepis.glb')
full=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
# Bake texture pigmentation into vertex colours before removing textures from the LOD.
for o in objects:
 if o.data.materials[0].name=='armour':
  uv=o.data.uv_layers[0];col=o.data.color_attributes['Color'];byvertex={o.data.loops[li].vertex_index:uv.data[li].uv.copy() for p in o.data.polygons if p.material_index==0 for li in p.loop_indices}
  for i,v in enumerate(o.data.vertices):

   if i not in byvertex:continue
   t=byvertex[i];c=col.data[i].color;detail=rgba[int((t.y%1)*(rgba.shape[0]-1)),int((t.x%1)*(rgba.shape[1]-1)),:3];col.data[i].color=(*[c[k]*float(detail[k])for k in range(3)],1)
for mat in M.values():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 for l in list(links):
  if l.to_node==bs and l.to_socket.name in ['Base Color','Normal','Roughness']:links.remove(l)
 vc=next((n for n in nodes if n.bl_idname=='ShaderNodeVertexColor'),None)
 if vc:links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for o in objects:
 if len(o.data.polygons)>40:
  bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Physical silhouette LOD','DECIMATE');dec.ratio=.29;bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(CAND/'bothriolepis.lod1.glb');lod=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
if '--skip-renders' not in sys.argv:
 # Review and portraits use actual exported GLB, not a source-only render.
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 bpy.ops.import_scene.gltf(filepath=str(CAND/'bothriolepis.glb'));rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');scene=bpy.context.scene
 scene.render.engine='CYCLES';scene.cycles.samples=32 if PREVIEW else 64;scene.cycles.use_denoising=True;scene.render.resolution_x=1200 if PREVIEW else 1600;scene.render.resolution_y=900 if PREVIEW else 1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
 world=scene.world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.13,.16,.18,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.40
 # Imported GLB uses Blender native axes after importer axis conversion.
 def light(name,loc,power,color,size):
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,.4,0))-o.location).to_track_quat('-Z','Y').to_euler()
 light('Large warm key',(3,-4,5),520,(1,.93,.82),4);light('Soft blue fill',(-3,-1,2.5),350,(.78,.9,1),3);light('Broad rear rim',(1,4,3),650,(.87,.95,1),3)
 bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
 def view(loc,target=(0,.65,0),scale=5.3):cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
 # Blender importer names armature actions with a prefix; exact suffix retains contract names.
 def action_for(name):
  return next(a for a in bpy.data.actions if a.name==name or a.name.endswith('_'+name)or a.name.endswith('|'+name))
 def render(name,frame,path,loc=(3.8,-4.2,3),target=(0,.65,0),scale=5.3):
  rig.animation_data_create();rig.animation_data.action=action_for(name)
  # Importer may retain NLA tracks; mute them so only the selected action contributes.
  for track in rig.animation_data.nla_tracks:track.mute=True
  scene.frame_set(frame);view(loc,target,scale);scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
 render('Idle',1,CAND/'bothriolepis.select.png');render('Idle',1,CAND/'bothriolepis.png')
 scene.render.resolution_x=800;scene.render.resolution_y=600;render('Idle',1,CAND/'bothriolepis.card.png');scene.render.resolution_x=256;scene.render.resolution_y=192;render('Idle',1,CAND/'bothriolepis.thumb.png')
 scene.render.resolution_x=1000;scene.render.resolution_y=750
 for name,frame,loc in [('Idle',1,(4,.2,.9)),('Swim',19,(4,-2,1.4)),('Bite',6,(2,-4,.15)),('Eat',19,(0,-5,.4)),('Heavy',18,(4,-2,1.4)),('Ability',24,(4,-3,2)),('Guard',16,(0,-5,1)),('Dodge',8,(4,-2,1.4)),('Death',49,(4,-2,1.8)),('TurnLeft',26,(3,-3,3))]:render(name,frame,LOCAL/(name+'-v2.png'),loc)
 for label,loc,target in [('front',(0,-4,.5),(0,-1.21,.22)),('side',(3,-1.2,.35),(0,-1.20,.24)),('dorsal',(0,-1.21,4),(0,-1.21,.22)),('threequarter',(2,-3,2),(0,-1.20,.22))]:render('Idle',1,LOCAL/('eyes-'+label+'-v2.png'),loc,target,.61)
meta={'id':'bothriolepis','name':'Bothriolepis','species':'Bothriolepis canadensis','provenance':'Late Devonian (Frasnian), Escuminac Formation, Miguasha, Quebec, Canada','description':'Angular armoured antiarch with a steep immobile head, inset dorsal eyes, a posterior dorsal crest and jointed dermal pectoral fins. A long flexible posterior carries a small dorsal fin and asymmetrical tail.','lengthMeters':.40,'modelLength':4.525,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis','https://doi.org/10.26879/417'],'notes':['Original anatomical reconstruction informed by Bechard et al. 2014 figures 2-3; not a fossil scan. Representative 0.40 m adult.','Continuous rigid cephalic/thoracic armour, steep head roof and approximately 36% armoured body length; exact living tissue thickness and pigmentation are inferred.','Dorsal eyes are placed within continuous head tissue, with no separate pads or orbital hoops; volume audit accompanies the delivery.','Pectoral segments have limited articulation, no toy ball joints, no head hinge and no terrestrial walking or rowing claim.','UV dermal detail uses an original imagegen swatch with authored anatomical seam relief; distant LOD bakes pigment into vertex colours and removes textures.','Small ventral oral folds and interior tissues are interpreted; action labels are asset compatibility gestures rather than Devonian gameplay definitions.']}
(CAND/'bothriolepis.json').write_text(json.dumps(meta,indent=2));(LOCAL/'build-stats-v2.json').write_text(json.dumps({'fullTriangles':full,'lodTriangles':lod,'ratio':lod/full,'clips':clips,'source':str(sourcepath)},indent=2))
print('BOTHRIOLEPIS_V2_CANDIDATE_COMPLETE',full,lod,str(CAND),flush=True)
