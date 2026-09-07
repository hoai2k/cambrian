"""Bothriolepis canadensis. Bespoke armour/appendage reconstruction, Blender 5.x."""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector, Matrix
from math import sin, cos, pi
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[3];OUT=REPO/'public/assets/devonian/creatures';LOCAL=REPO.parent/'devonian-authoring/bothriolepis'
OUT.mkdir(parents=True,exist_ok=True);LOCAL.mkdir(parents=True,exist_ok=True)
random.seed(904)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
scene=bpy.context.scene;scene.render.fps=30
arm=bpy.data.armatures.new('Bothriolepis_anatomical_skeleton');rig=bpy.data.objects.new('Bothriolepis',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),None),('body',(0,-.25,0),'root'),('oral',(0,-1.20,-.14),'body'),('tail_base',(0,.32,0),'body'),('tail_mid',(0,.91,0),'tail_base'),('tail_tip',(0,1.46,0),'tail_mid'),('caudal',(0,1.98,.03),'tail_tip'),('dorsal',(0,.58,.17),'tail_base')]
for s in [-1,1]:
 side='L' if s>0 else 'R';spec.extend([(f'pectoral_{side}',(s*.48,-.61,-.12),'body'),(f'pectoral_tip_{side}',(s*.88,.15,-.14),f'pectoral_{side}')])
for n,p,par in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.18,0));b.use_deform=n!='root'
 if par:b.parent=arm.edit_bones[par]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
M={}
def mat(n,col,rough=.5,tex=False):
 m=bpy.data.materials.new(n);m.diffuse_color=(*col,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=rough
 if n!='eyes':
  vc=m.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';m.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 # Fine pore normal generated deterministically, exported as an actual tangent map.
 if n not in ['eyes','oral']:
  nm=m.node_tree.nodes.new('ShaderNodeTexImage');nm.image=bpy.data.images.get('dermal-normal') or make_normal();nm.image.colorspace_settings.name='Non-Color'
  no=m.node_tree.nodes.new('ShaderNodeNormalMap');no.inputs['Strength'].default_value=.07 if n=='armour' else .035;tc=m.node_tree.nodes.new('ShaderNodeTexCoord');mp=m.node_tree.nodes.new('ShaderNodeVectorMath');mp.operation='SCALE';mp.inputs[3].default_value=9;m.node_tree.links.new(tc.outputs['UV'],mp.inputs[0]);m.node_tree.links.new(mp.outputs[0],nm.inputs['Vector']);m.node_tree.links.new(nm.outputs['Color'],no.inputs['Color']);m.node_tree.links.new(no.outputs['Normal'],bs.inputs['Normal'])
 if tex and (HERE/'skin-albedo.png').exists():
  im=m.node_tree.nodes.new('ShaderNodeTexImage');im.image=bpy.data.images.load(str(HERE/'skin-albedo.png'));m.node_tree.links.new(im.outputs['Color'],bs.inputs['Base Color'])
 M[n]=m;return m
def make_normal():
 import numpy as np
 N=512;r=np.random.default_rng(14);h=r.random((N,N))
 for _ in range(3):h=(h+np.roll(h,1,0)+np.roll(h,-1,0)+np.roll(h,1,1)+np.roll(h,-1,1))/5
 gx=(np.roll(h,1,1)-np.roll(h,-1,1))*1.6;gy=(np.roll(h,1,0)-np.roll(h,-1,0))*1.6
 a=np.ones((N,N,4),dtype=np.float32);a[:,:,0]=gx+.5;a[:,:,1]=gy+.5;a[:,:,2]=np.sqrt(np.maximum(0,1-gx*gx-gy*gy))*.5+.5
 im=bpy.data.images.new('dermal-normal',width=N,height=N);im.pixels.foreach_set(a.ravel());im.filepath_raw=str(HERE/'dermal-normal.png');im.file_format='PNG';im.save();im.pack();return im
mat('body',(.075,.115,.041));mat('armour',(.13,.12,.038));mat('underside',(.40,.43,.37));mat('fins',(.10,.145,.052),.57);mat('accent',(.18,.14,.048));mat('gnathal',(.53,.48,.34),.38);mat('eyes',(.007,.012,.013),.13);mat('oral',(.008,.005,.007),.7)
objects=[]
def mesh(n,verts,faces,material,bone='body',weights=None):
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();import bmesh;bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);scene.collection.objects.link(o);me.materials.append(M[material]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 uv=me.uv_layers.new(name='UVMap')
 for p in me.polygons:
  for li in p.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=((v.y+1.5)*.7,(math.atan2(v.z,v.x)/(2*pi))%1)
 ca=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');base=M[material].diffuse_color[:3]
 for i,v in enumerate(verts):
  x,y,z=v;mot=.82+.22*sin(y*15+x*19+sin(z*22))+.085*sin(x*131+y*69+z*73)
  belly=max(0,min(1,(-z-.02)*2.3));col=[c*mot for c in base]
  if material in ['body','armour']:col=[col[k]*(1-.48*belly)+(.48,.43,.27)[k]*.48*belly for k in range(3)]
  # Sample the generated material source into vertex pigmentation, so GLB recolouring stays compatible.
  if False:
   global source_pixels,source_w,source_h
   if 'source_pixels' not in globals():
    im=bpy.data.images.load(str(HERE/'skin-albedo.png'));source_w,source_h=im.size;source_pixels=list(im.pixels[:])
   u=int(((y+1.5)*.55%1)*(source_w-1));v=int((math.atan2(z,x)/(2*pi)%1)*(source_h-1));sample=source_pixels[(v*source_w+u)*4:(v*source_w+u)*4+3]
   factor=(.60+1.5*sum(sample)/3)*(1-.25*max(0,min(1,z*2)));col=[c*factor for c in col]
  ca.data[i].color=(*col,1)
 if weights:
  groups={n:o.vertex_groups.new(name=n) for n in set(k for w in weights for k in w)}
  for i,w in enumerate(weights):
   for b,t in w.items():groups[b].add([i],t,'REPLACE')
 else:o.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
 mod=o.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;o.parent=rig
 return o
# Smooth interpolating loft. Separate head/jaw ensures an actual moving oral aperture.
def loft(n,rings,material,bone='body',N=56,steps=5,tail=False):
 pts=[]
 for j in range(len(rings)-1):
  a=rings[max(0,j-1)];b=rings[j];c=rings[j+1];d=rings[min(len(rings)-1,j+2)]
  for q in range(steps):
   t=q/steps;pts.append([.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t**3) for k in range(4)])
 pts.append(rings[-1]);v=[];w=[]
 for y,rx,rz,zc in pts:
  for i in range(N):
   th=2*pi*i/N;v.append((max(.004,rx)*cos(th),y,zc+max(.004,rz)*sin(th)))
   if tail:
    # Rigid anterior shield, distributed bending confined to unarmoured posterior.
    centers=[(.20,'body'),(.62,'tail_base'),(1.14,'tail_mid'),(1.68,'tail_tip'),(2.16,'caudal')]
    if y<=centers[0][0]:ww={'body':1}
    elif y>=centers[-1][0]:ww={'caudal':1}
    else:
     for (a,an),(b,bn) in zip(centers,centers[1:]):
      if a<=y<=b:t=(y-a)/(b-a);ww={an:1-t,bn:t};break
    w.append(ww)
 f=[]
 for j in range(len(pts)-1):
  for i in range(N):f.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 f.extend([tuple(range(N-1,-1,-1)),tuple((len(pts)-1)*N+i for i in range(N))]);return mesh(n,v,f,material,bone,w if tail else None)
def ellipsoid(n,p,sc,ma,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=36,ring_count=24,location=p);o=bpy.context.object;o.name=n;o.scale=sc;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 vv=[tuple(o.matrix_world@v.co) for v in o.data.vertices];ff=[tuple(p.vertices) for p in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True);return mesh(n,vv,ff,ma,bone)
def fin(n,base,outline,bone,tipbone=None):
 b=Vector(base);out=[Vector(p) for p in outline];v=[];weights=[];S=12
 for i,p in enumerate(out):
  for j in range(S+1):
   t=j/S;pt=b.lerp(p,t);pt.x+=.015*sin(pi*t)*sin(i*pi/(len(out)-1));v.append(tuple(pt))
   weights.append({bone:1-t*.75,tipbone:t*.75} if tipbone else {bone:1})
 f=[]
 for i in range(len(out)-1):
  for j in range(S):a=i*(S+1)+j;f.append((a,a+1,a+S+2,a+S+1))
 o=mesh(n,v,f,'fins',bone,weights);sol=o.modifiers.new('Membrane thickness','SOLIDIFY');sol.thickness=.006;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
 # Each radial narrow ribbon is geometrically raised for glTF-compatible definition.
 for k,p in enumerate(out[1:-1]):
  pts=[b.lerp(p,t/12) for t in range(13)];vv=[];ww=[]
  for j,q in enumerate(pts):
   width=.004*(1-j/15);q.z+=.0035;vv.extend([tuple(q+Vector((width,0,0))),tuple(q-Vector((width,0,0)))])
   wt={bone:1-j/12*.75,tipbone:j/12*.75} if tipbone else {bone:1};ww.extend([wt,wt])
  mesh(n+' radial '+str(k),vv,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(12)],'accent',bone,ww)
# Angular low antiarch cuirass, flatter ventral surface and a posterior dorsal crest.
shieldrings=[(-1.48,.006,.014,-.015),(-1.43,.11,.10,-.015),(-1.34,.27,.145,.005),(-1.15,.39,.19,.035),(-.89,.46,.27,.10),(-.53,.53,.345,.12),(-.12,.49,.38,.13),(.20,.35,.28,.11),(.39,.16,.13,.02)]
shield=loft('Joined cephalothoracic cuirass',shieldrings,'armour',N=72,steps=7)
# Flatten ventral face and make angular lateral shoulders while preserving loft continuity.
for v in shield.data.vertices:
 v.co.z=max(v.co.z,-.19)
 if abs(v.co.x)>.15 and v.co.y>-.92:v.co.x*=1.08
shield.data.update()
loft('Flexible unarmoured posterior',[(.28,.19,.135,.00),(.56,.16,.13,.015),(.90,.13,.12,.02),(1.25,.095,.1,.025),(1.63,.068,.08,.055),(1.97,.040,.065,.10),(2.18,.02,.045,.15)],'body',N=56,steps=7,tail=True)
# Plate mosaic follows the cuirass surface, leaving narrow organic sutures.
from mathutils.bvhtree import BVHTree
tree=BVHTree.FromPolygons([v.co for v in shield.data.vertices],[p.vertices for p in shield.data.polygons])
def plated(n,poly):
 center=sum((Vector(p) for p in poly),Vector())/len(poly);vs=[];fs=[];res=13
 for i in range(len(poly)):
  A=center;B=Vector(poly[i]);C=Vector(poly[(i+1)%len(poly)]);ids={}
  for j in range(res+1):
   for k in range(res-j+1):
    p=A+(B-A)*(j/res)+(C-A)*(k/res);q,no,ix,di=tree.find_nearest(p);ids[j,k]=len(vs);vs.append(tuple(q+no*.007))
  for j in range(res):
   for k in range(res-j):
    fs.append((ids[j,k],ids[j+1,k],ids[j,k+1]))
    if k<res-j-1:fs.append((ids[j+1,k],ids[j+1,k+1],ids[j,k+1]))
 o=mesh(n,vs,fs,'armour');return o
for s in [-1,1]:
 plated('Lateral head plate '+str(s),[(s*.06,-1.37,.1),(s*.25,-1.26,.15),(s*.37,-1.09,.16),(s*.31,-.96,.30),(s*.07,-1.03,.28)])
 plated('Posterior cranial plate '+str(s),[(s*.045,-.99,.27),(s*.29,-.92,.32),(s*.37,-.72,.36),(s*.04,-.73,.405)])
 plated('Anterior dorsolateral plate '+str(s),[(s*.05,-.68,.43),(s*.37,-.69,.36),(s*.50,-.49,.21),(s*.47,-.23,.32),(s*.12,-.27,.49)])
 plated('Posterior dorsolateral plate '+str(s),[(s*.1,-.23,.5),(s*.43,-.19,.32),(s*.35,.16,.22),(s*.06,.28,.24)])
 plated('Anterior ventrolateral plate '+str(s),[(s*.42,-.85,.02),(s*.535,-.54,.07),(s*.50,-.22,.08),(s*.42,-.20,-.17),(s*.38,-.74,-.17)])
 plated('Posterior ventrolateral plate '+str(s),[(s*.48,-.17,.02),(s*.39,.10,.10),(s*.29,.22,.025),(s*.23,.16,-.17),(s*.41,-.15,-.18)])
# Ornament: low dermal tubercles distributed over rigid shield, merged into a single draw surface.
vs=[];fs=[]
for _ in range(950):
 y=random.uniform(-1.32,.25);x=random.uniform(-.50,.50);p,no,_,d=tree.find_nearest(Vector((x,y,.8)))
 if d>.88 or p.z<.03:continue
 r=random.uniform(.004,.009);p+=no*.006;u=no.cross(Vector((0,1,0))).normalized();v=no.cross(u);base=len(vs)
 vs.append(tuple(p+no*r*.55))
 for k in range(6):vs.append(tuple(p+r*(u*cos(k*pi/3)+v*sin(k*pi/3))))
 fs.extend((base,base+1+k,base+1+(k+1)%6)for k in range(6))
mesh('Fine dermal tuberculation',vs,fs,'accent')
# Dorsal shared orbital recess, with small upward and outward directed dark eyes.
ellipsoid('Dorsal orbital fenestra',(0,-1.09,.228),(.175,.095,.030),'oral','body')
for s in [-1,1]:
 ellipsoid('Raised orbital rim '+str(s),(s*.103,-1.10,.245),(.056,.052,.025),'accent','body')
 ellipsoid('Dorsal eye '+str(s),(s*.105,-1.109,.266),(.037,.035,.019),'eyes','body')
 ellipsoid('Gill aperture behind cheek '+str(s),(s*.414,-.86,-.055),(.025,.102,.051),'oral','body')
# Small ventral mouth with inset black opening, fleshy low lip; no invented gnathal teeth.
ellipsoid('Ventral oral vestibule',(0,-1.319,-.111),(.131,.076,.058),'oral','body')
loft('Mobile ventral lower lip',[(-1.416,.055,.016,-.125),(-1.367,.12,.024,-.15),(-1.289,.13,.028,-.17),(-1.19,.073,.022,-.166)],'underside','oral',N=40,steps=5)
# Jointed oar-shaped dermal fins, each built as a tapered angular solid.
def arm_segment(n,a,b,width,depth,bone):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=Vector((axis.y,-axis.x,0)).normalized();v=axis.cross(u).normalized();verts=[];faces=[];rings=24;segs=12
 for j in range(rings+1):
  t=j/rings;c=a.lerp(b,t);rad=(.75+.30*sin(pi*t))*(1-.68*t)
  for k in range(segs):
   th=2*pi*k/segs;verts.append(tuple(c+u*cos(th)*width*rad+v*sin(th)*depth*rad))
 for j in range(rings):
  for k in range(segs):a0=j*segs+k;faces.append((a0,j*segs+(k+1)%segs,(j+1)*segs+(k+1)%segs,a0+segs))
 faces+=[tuple(range(segs-1,-1,-1)),tuple(rings*segs+k for k in range(segs))]
 return mesh(n,verts,faces,'armour',bone)
for s in [-1,1]:
 side='L'if s>0 else'R';a=(s*.48,-.61,-.12);b=(s*.88,.15,-.14);c=(s*1.10,.85,-.155)
 ellipsoid('Brachial articulation '+side,a,(.103,.112,.075),'body','body')
 arm_segment('Proximal armoured pectoral '+side,a,b,.125,.065,'pectoral_'+side)
 ellipsoid('Distal pectoral hinge '+side,b,(.038,.053,.04),'body','pectoral_'+side)
 arm_segment('Distal armoured pectoral '+side,b,c,.072,.034,'pectoral_tip_'+side)
 # longitudinal dermal keels and striations on each articulated segment
 for a0,b0,w,bone in [(Vector(a),Vector(b),.038,'pectoral_'+side),(Vector(b),Vector(c),.018,'pectoral_tip_'+side)]:
  for k in [-1,0,1]:
   vv=[]
   for j in range(17):
    t=j/16;p=a0.lerp(b0,t);p.x+=k*w*(1-.6*t);p.z+=.037*(1-.5*t)
    vv.extend([tuple(p+Vector((.003,0,0))),tuple(p-Vector((.003,0,0)))])
   mesh('Appendage longitudinal ornament '+side,vv,[(j*2,j*2+1,j*2+3,j*2+2)for j in range(16)],'accent',bone)
fin('Single dorsal soft fin',(0,.69,.10),[(0,.37,.14),(0,.56,.50),(0,.76,.63),(0,.96,.44),(0,1.25,.20),(0,1.35,.12)],'dorsal')
fin('Heterocercal tail membrane',(0,1.97,.07),[(0,1.92,.11),(0,2.18,.35),(0,2.60,.58),(0,2.57,.36),(0,2.45,.15),(0,2.32,.03),(0,2.48,-.17),(0,2.36,-.29),(0,2.12,-.16),(0,1.96,.015)],'caudal')
anchors=[('anchor_mouth','oral',(0,-1.367,-.139),'mouth'),('anchor_mouth_inside','oral',(0,-1.265,-.132),'swallow'),('anchor_attack_primary','body',(0,-1.44,-.015),'attack')]
for n,b,p,r in anchors:
 o=bpy.data.objects.new(n,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=b;o.matrix_world=Matrix.Translation(p);o['cambrianAnchor']={'version':1,'role':r,'parentBone':b}
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Growth':1.5}
loops=['Idle','Swim','Guard','Eat']
def bump(t,a,b):return sin(pi*(t-a)/(b-a))**2 if a<t<b else 0
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;N=round(duration*30)
 for frame in range(N+1):
  t=frame/N;ph=2*pi*t;env=sin(pi*t)**2
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def tail(amp,cycles=1):
   for k,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):rot(b,z=amp*(.45+.28*k)*sin(cycles*ph-k*.7))
  def arms(e,phase=0):
   for s in [-1,1]:
    side='L'if s>0 else'R';rot('pectoral_'+side,x=.075*e*sin(ph+phase),y=s*.045*e*sin(ph+.8),z=s*.12*e*(1-cos(ph))/2);rot('pectoral_tip_'+side,z=s*.09*e*sin(ph-.5))
  if name in loops:
   tail(.065 if name=='Idle'else .22 if name=='Swim'else .06,2 if name=='Swim'else 1);arms(.5 if name=='Idle'else 1)
   rot('oral',x=(.16 if name=='Eat'else .018)*(1-cos(ph)));rot('dorsal',z=.035*sin(ph))
   if name=='Guard':rot('body',x=.035*(1-cos(ph)));rot('pectoral_L',z=.13+.035*sin(ph));rot('pectoral_R',z=-.13-.035*sin(ph))
   if name=='Eat':rot('body',x=-.018*(1-cos(ph)));rig.pose.bones['body'].location.z=-.025*(1-cos(ph))
  else:
   tail(.10*env);arms(env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft'else-1;rot('body',z=s*.23*env,y=s*.075*env);rot('tail_base',z=-s*.23*env);rot('pectoral_L',z=s*.15*env);rot('pectoral_R',z=s*.15*env)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive'else-1;rot('body',x=s*.22*env);rot('pectoral_L',x=s*.11*env);rot('pectoral_R',x=s*.11*env);rot('caudal',x=-s*.06*env)
   elif name in ['Attack','Bite','Heavy','Ability']:
    # Contact, short oral compression, shield brace and display; no predatory jaw or walking feet.
    peak=bump(t,.12,.65);snap=bump(t,.55,.88)
    if name=='Bite':rot('oral',x=.25*peak);rot('body',x=.035*snap)
    elif name=='Attack':rot('body',x=.035*peak-.06*snap);rig.pose.bones['body'].location.y=.055*bump(t,0,.25)-.09*snap;rot('oral',x=.06*peak);rot('caudal',z=.32*bump(t,.1,.6))
    elif name=='Heavy':rot('body',x=.09*peak,y=.12*peak);rig.pose.bones['body'].location.y=.09*peak-.13*snap;rot('pectoral_L',z=.22*peak);rot('pectoral_R',z=-.22*peak);rot('tail_mid',z=.35*snap)
    else:rot('pectoral_L',z=.24*peak,x=.08*peak);rot('pectoral_R',z=-.24*peak,x=.08*peak);rot('pectoral_tip_L',z=.14*peak);rot('pectoral_tip_R',z=-.14*peak);rot('dorsal',z=.1*sin(2*ph)*env);rot('oral',x=.12*bump(t,.65,.95));tail(.15*env,2)
   elif name in ['Hit','Stagger']:
    wave=sin((5 if name=='Stagger'else 3)*pi*t)*env;rot('body',z=.14*wave,y=.1*env);rot('tail_base',z=-.2*wave);rot('pectoral_L',x=.10*env);rot('pectoral_R',x=-.045*env);rot('oral',x=.075*env)
   elif name=='Parry':rot('body',y=.18*env,z=-.13*env);rot('pectoral_R',z=-.17*env);rot('tail_mid',z=.29*env)
   elif name=='Dodge':rot('body',y=-.20*env,z=.21*env);rig.pose.bones['body'].location.x=.17*env;rot('tail_base',z=-.32*env);rot('tail_tip',z=.38*env);rot('pectoral_L',z=.17*env)
   elif name=='Growth':rot('oral',x=.085*env);rot('pectoral_L',z=.12*env);rot('pectoral_R',z=-.12*env);rot('dorsal',z=.06*env);rot('body',x=-.035*env)
   elif name=='Death':
    q=t*t*(3-2*t);rot('body',y=.85*q,z=.10*q);rig.pose.bones['body'].location.z=-.12*q;rot('tail_base',z=.22*q);rot('tail_mid',z=.21*q);rot('tail_tip',z=.17*q);rot('caudal',z=-.13*q);rot('pectoral_L',z=.11*q,x=.08*q);rot('pectoral_R',z=-.18*q,x=-.045*q);rot('oral',x=.1*q)
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1)
# Resolve parent matrices after dependency update; socket world locations must equal manifest.
bpy.context.view_layer.update()
for n,b,p,r in anchors:
 o=bpy.data.objects[n];o.matrix_world=__import__('mathutils').Matrix.Translation(p)
bpy.context.view_layer.update()
(HERE/'anchors.json').write_text(json.dumps({'bothriolepis':[{'name':n,'bone':b,'point':p,'role':r} for n,b,p,r in anchors]},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/'bothriolepis.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
export(OUT/'bothriolepis.glb')
full=sum(len(o.data.polygons) for o in objects)
# Applied decimation, retaining rig and sockets. Small anatomical features remain recognizable.
for o in objects:
 if len(o.data.polygons)>25:
  bpy.context.view_layer.objects.active=o;d=o.modifiers.new('Actual LOD geometry reduction','DECIMATE');d.ratio=.26;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(OUT/'bothriolepis.lod1.glb')
# Restore full editable source for final image production.
bpy.ops.wm.open_mainfile(filepath=str(LOCAL/'bothriolepis.blend'));scene=bpy.context.scene;rig=bpy.data.objects['Bothriolepis']
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world.color=(.15,.15,.15)
world=scene.world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.11,.15,.17,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
def area(n,p,power,color,size):
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm broad key',(3,-4,5),650,(1,.87,.72),4);area('Cool fill',(-4,-1,2),500,(.58,.82,1),3);area('Silver rim',(1,4,3),850,(.75,.88,1),3)
bpy.ops.object.camera_add(location=(3.8,-5,3.7));cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=5.2

def view(loc,target=(0,.5,0),scale=5.2):cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale

def render(name,frame,path,loc=None,scale=5.2):
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame)
 if loc:view(loc,scale=scale)
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
view((3.8,-5,3.7));render('Idle',1,OUT/'bothriolepis.select.png');render('Idle',1,OUT/'bothriolepis.png')
scene.render.resolution_x=800;scene.render.resolution_y=600
render('Idle',1,OUT/'bothriolepis.card.png')
scene.render.resolution_x=256;scene.render.resolution_y=192;render('Idle',1,OUT/'bothriolepis.thumb.png')
scene.render.resolution_x=1000;scene.render.resolution_y=750
for name,frame,loc in [('Idle',1,(4,0,1)),('Swim',19,(4,-3,1.8)),('Bite',7,(3,-4,1)),('Eat',16,(0,-5,.5)),('Heavy',14,(4,-3,1.5)),('Ability',23,(4,-3,1.5)),('Guard',16,(0,-5,1)),('Dodge',7,(4,-2,2)),('Death',49,(4,-3,2))]:render(name,frame,LOCAL/(name+'.png'),loc)
meta={'id':'bothriolepis','name':'Bothriolepis','species':'Bothriolepis canadensis','provenance':'Late Devonian (Frasnian), Escuminac Formation, Miguasha, Québec, Canada','description':'Low armoured antiarch with dorsal eyes, a rigid joined head and thoracic cuirass, narrow jointed dermal pectoral fins and a slender heterocercal tail.','lengthMeters':.40,'modelLength':4.03,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis','https://www.patrimoine-culturel.gouv.qc.ca/rpcq/detail.do?id=93118&methode=consulter&type=bien'],'notes':['Original artistic reconstruction, not a fossil scan; 0.40 m representative body length, not a maximum.','Head and thoracic cuirass remain rigidly joined following Béchard et al. 2014.','Paired dermal fins use restrained articulation; animations make no claim of terrestrial walking, powerful rowing or substrate anchoring.','Pigmentation, detailed living plate edges and oral soft tissues are interpretations.','Attack and Heavy are contact/brace asset gestures; Ability is a paired-fin display, with no gameplay rules.','Growth is a relaxed maturation gesture, never moulting or scale animation.']}
(OUT/'bothriolepis.json').write_text(json.dumps(meta,indent=2));(LOCAL/'build-stats.json').write_text(json.dumps({'sourcePolygons':full,'clips':clips},indent=2))
print('BOTHRIOLEPIS_COMPLETE')
