"""Original Dunkleosteus terrelli specimen: Blender 5.2 procedural authoring."""
import bpy, math, json, random, struct, os
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[3]
OUT=REPO/'public/assets/devonian/creatures'
LOCAL=REPO.parent/'devonian-authoring/dunkleosteus'
OUT.mkdir(parents=True,exist_ok=True);LOCAL.mkdir(parents=True,exist_ok=True)
random.seed(41)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
scene=bpy.context.scene;scene.render.fps=30
# Each unit is one metre. -Y anterior; glTF conversion yields +Z anterior.
arm=bpy.data.armatures.new('Dunkleosteus_anatomical_skeleton');rig=bpy.data.objects.new('Dunkleosteus',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),None),('body',(0,-.25,0),'root'),('head',(0,-.62,.28),'body'),('jaw',(0,-.66,-.16),'head'),('tail_base',(0,.35,0),'body'),('tail_mid',(0,.80,0),'tail_base'),('tail_tip',(0,1.20,0),'tail_mid'),('caudal',(0,1.49,.02),'tail_tip'),('dorsal',(0,.28,.45),'tail_base'),('anal',(0,.80,-.20),'tail_mid')]
for s in [-1,1]:
 side='L' if s>0 else 'R';spec.extend([(f'pectoral_{side}',(s*.35,-.50,-.25),'body'),(f'pectoral_tip_{side}',(s*.76,-.22,-.29),f'pectoral_{side}'),(f'pelvic_{side}',(s*.18,.34,-.30),'body')])
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
mat('body',(.115,.19,.21));mat('armour',(.19,.245,.245));mat('underside',(.40,.43,.37));mat('fins',(.16,.215,.21),.57);mat('accent',(.35,.34,.245));mat('gnathal',(.53,.48,.34),.38);mat('eyes',(.007,.012,.013),.13);mat('oral',(.008,.005,.007),.7)
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
  x,y,z=v;mot=.92+.11*sin(y*19+x*22+sin(z*25))+.035*sin(x*131+y*69+z*73)
  belly=max(0,min(1,(-z-.02)*2.3));col=[c*mot for c in base]
  if material in ['body','armour']:col=[col[k]*(1-.48*belly)+(.42,.43,.35)[k]*.48*belly for k in range(3)]
  # Sample the generated material source into vertex pigmentation, so GLB recolouring stays compatible.
  if material in ['body','armour','fins'] and (HERE/'skin-albedo.png').exists():
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
    centers=[(-.15,'body'),(.48,'tail_base'),(.92,'tail_mid'),(1.29,'tail_tip'),(1.65,'caudal')]
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
loft('Deep muscular trunk', [(-.72,.34,.38,-.005),(-.50,.47,.55,.01),(-.10,.47,.56,.025),(.27,.37,.46,0),(.58,.255,.32,-.025),(.95,.125,.18,-.02),(1.30,.065,.095,0),(1.57,.055,.08,.035)],'body',tail=True)
loft('Cranial shield soft foundation',[(-1.36,.22,.10,.11),(-1.27,.31,.17,.16),(-1.08,.365,.27,.23),(-.83,.40,.32,.22),(-.59,.35,.34,.20)],'armour','head')
# Lower jaw spoon, broad ventral union and paired posterior processes.
loft('Mandibular soft tissue',[(-1.34,.15,.027,-.12),(-1.23,.28,.055,-.135),(-1.04,.32,.07,-.16),(-.80,.30,.09,-.145),(-.62,.255,.10,-.12)],'armour','jaw',N=48)
loft('Deep oral cavity',[(-1.21,.18,.045,-.035),(-1.10,.22,.09,-.02),(-.97,.255,.12,.025),(-.70,.23,.13,.07)],'oral','head',N=48)
# Shaped solid plates with bevelled margins; not a tiled scale field.
def plate(n,poly,bone,material='armour',depth=.02):
 center=sum((Vector(p) for p in poly),Vector())/len(poly)
 if material=='armour' and not n.startswith('Suborbital') and not n.startswith('Elongate'):
  from mathutils.bvhtree import BVHTree
  source=bpy.data.objects['Cranial shield soft foundation' if bone=='head' else 'Deep muscular trunk'];tree=BVHTree.FromPolygons([v.co for v in source.data.vertices],[p.vertices for p in source.data.polygons])
  verts=[];faces=[];N=10
  def project(p):
   q,norm,ix,dist=tree.find_nearest(p)
   if norm.dot(Vector((q.x,0,q.z)))<0:norm=-norm
   return tuple(q+norm*.009)
  for i in range(len(poly)):
   A=center;B=Vector(poly[i]);C=Vector(poly[(i+1)%len(poly)]);ids={}
   for j in range(N+1):
    for k in range(N-j+1):ids[j,k]=len(verts);verts.append(project(A+(B-A)*(j/N)+(C-A)*(k/N)))
   for j in range(N):
    for k in range(N-j):
     faces.append((ids[j,k],ids[j+1,k],ids[j,k+1]))
     if k<N-j-1:faces.append((ids[j+1,k],ids[j+1,k+1],ids[j,k+1]))
  o=mesh(n,verts,faces,material,bone);return o
 normal=Vector((center.x,0,center.z)).normalized();v=[tuple(Vector(p)+normal*depth) for p in poly]+[tuple(Vector(p)-normal*.006) for p in poly];N=len(poly);f=[tuple(range(N)),tuple(range(2*N-1,N-1,-1))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 o=mesh(n,v,f,material,bone);bev=o.modifiers.new('Soft living plate margins','BEVEL');bev.width=.008;bev.segments=3;bpy.context.view_layer.objects.active=o
 bpy.ops.object.modifier_apply(modifier=bev.name)
 return o
for s in [-1,1]:
 plate('Suborbital cheek '+str(s),[(s*.285,-1.23,.07),(s*.355,-1.06,.15),(s*.40,-.83,.17),(s*.37,-.65,.04),(s*.30,-.82,-.09),(s*.305,-1.09,-.055)],'head')
 plate('Anterior dorsolateral '+str(s),[(s*.30,-.59,.40),(s*.455,-.47,.20),(s*.478,-.15,.17),(s*.39,.09,.34),(s*.19,-.05,.54)],'body')
 plate('Anterior lateral '+str(s),[(s*.455,-.48,.16),(s*.46,-.16,.12),(s*.425,.05,-.17),(s*.34,-.20,-.40),(s*.39,-.52,-.26)],'body')
 plate('Posterior dorsolateral '+str(s),[(s*.19,-.01,.545),(s*.39,.12,.34),(s*.345,.32,.24),(s*.17,.35,.395),(s*.035,.17,.49)],'body')
 plate('Posterior ventrolateral '+str(s),[(s*.45,-.12,-.08),(s*.39,.10,-.16),(s*.30,.25,-.31),(s*.17,.10,-.46),(s*.325,-.15,-.44)],'body')
 plate('Central cranial '+str(s),[(s*.03,-1.26,.27),(s*.25,-1.16,.34),(s*.315,-.92,.44),(s*.28,-.67,.49),(s*.025,-.63,.54)],'head')
 # Gnathal cutting edges and paired anterior cusps, not a row of shark teeth.
 plate('Inferognathal blade '+str(s),[(s*.14,-1.335,-.08),(s*.245,-1.19,-.02),(s*.29,-.96,-.105),(s*.265,-.76,-.08),(s*.24,-.99,-.16),(s*.13,-1.30,-.15)],'jaw','gnathal',.013)
 plate('Anterior gnathal cusp '+str(s),[(s*.15,-1.30,.075),(s*.23,-1.21,.10),(s*.185,-1.24,-.085),(s*.14,-1.33,-.055)],'head','gnathal',.012)
# Spherical eyes only; body itself is a contiguous lofted anatomical mesh.
def ellipsoid(n,p,sc,ma,bone):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=36,ring_count=24,location=p);o=bpy.context.object;o.name=n;o.scale=sc;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 vv=[tuple(o.matrix_world@v.co) for v in o.data.vertices];ff=[tuple(p.vertices) for p in o.data.polygons];bpy.data.objects.remove(o,do_unlink=True);return mesh(n,vv,ff,ma,bone)
for s in [-1,1]:
 ellipsoid('Orbital soft rim', (s*.344,-1.105,.225),(.027,.068,.063),'body','head')
 ellipsoid('Dark reflective eye',(s*.367,-1.112,.234),(.025,.047,.045),'eyes','head')
 # Spiracular/gill transition seam, subtle elongated submarginal plate.
 plate('Elongate submarginal '+str(s),[(s*.39,-.97,.31),(s*.41,-.65,.28),(s*.405,-.65,.24),(s*.39,-.98,.285)],'head',depth=.009)
# Curved fin membrane with explicit gently raised support ridges.
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
for s in [-1,1]:
 side='L' if s>0 else 'R'
 fin('Broad pectoral '+side,(s*.355,-.53,-.24),[(s*.40,-.62,-.22),(s*.64,-.49,-.28),(s*.89,-.30,-.32),(s*1.06,-.08,-.37),(s*.98,.04,-.39),(s*.80,.16,-.38),(s*.58,.16,-.31),(s*.39,-.05,-.27)],'pectoral_'+side,'pectoral_tip_'+side)
 fin('Small pelvic '+side,(s*.17,.34,-.30),[(s*.19,.26,-.32),(s*.32,.44,-.39),(s*.39,.66,-.43),(s*.23,.71,-.35),(s*.14,.55,-.30)],'pelvic_'+side)
fin('Posterior dorsal',(0,.31,.38),[(0,.24,.45),(0,.42,.70),(0,.59,.91),(0,.68,.86),(0,.78,.54),(0,.96,.22),(0,.80,.23)],'dorsal')
fin('Anal stabilizer',(0,.78,-.19),[(0,.67,-.22),(0,.82,-.41),(0,1.01,-.38),(0,1.1,-.14)],'anal')
fin('Heterocercal caudal',(0,1.47,.01),[(0,1.45,.08),(0,1.65,.39),(0,1.95,.70),(0,1.91,.39),(0,1.80,.14),(0,1.72,.02),(0,1.86,-.23),(0,1.98,-.51),(0,1.73,-.38),(0,1.48,-.08)],'caudal')
# Parent-local nondeforming sockets: export nested metadata, jaw correctly follows opening.
anchors=[('anchor_mouth','jaw',(0,-1.31,-.065),'mouth'),('anchor_mouth_inside','jaw',(0,-1.01,-.10),'swallow'),('anchor_attack_primary','jaw',(0,-1.36,-.045),'attack')]
for n,b,p,role in anchors:
 o=bpy.data.objects.new(n,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=b
 # Blender bone parenting is relative to tail with local bone orientation.
 o.matrix_world=__import__('mathutils').Matrix.Translation(p);o['cambrianAnchor']={'version':1,'role':role,'parentBone':b}
# Dynamic action language: stiff armoured forebody, caudal propulsion, independent paired fins.
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.35,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Growth':1.5}
loops=['Idle','Swim','Guard','Eat']
def bump(t,a,b):return sin(pi*(t-a)/(b-a))**2 if a<t<b else 0
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;N=round(duration*30)
 for frame in range(N+1):
  t=frame/N;ph=2*pi*t
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def swim(amp=.10,cycles=1):
   for k,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):rot(b,z=amp*(.32+k*.34)*sin(ph*cycles-k*.65))
  def fins(spread=.03,flutter=.02):
   for s in [-1,1]:
    side='L' if s>0 else 'R';rot('pectoral_'+side,x=.025*sin(ph),y=s*(spread+flutter*sin(ph+.4)),z=s*.02*sin(ph));rot('pectoral_tip_'+side,y=s*.05*sin(ph-.7));rot('pelvic_'+side,y=s*.04*sin(ph+.6))
  if name in loops:
   swim(.09 if name=='Idle' else .25 if name=='Swim' else .075,2 if name=='Swim' else 1);fins(.24 if name=='Guard' else .03,.04)
   rot('head',x=-.008*(1-cos(ph)));rot('jaw',x=(.035 if name!='Eat' else .19)*(1-cos(ph)));rot('dorsal',z=.025*sin(ph))
   if name=='Guard':rot('body',x=-.03*(1-cos(ph)))
  else:
   env=sin(pi*t)**2;swim(.12*env);fins(.05*env,.02*env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft' else -1;rot('body',z=s*.24*env,y=s*.15*env);rot('tail_base',z=-s*.20*env);rot('caudal',z=s*.32*env);rot('pectoral_L',y=.26*s*env);rot('pectoral_R',y=.26*s*env)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive' else -1;rot('body',x=s*.22*env);rot('head',x=-s*.035*env);rot('pectoral_L',y=.1*env,x=s*.25*env);rot('pectoral_R',y=-.1*env,x=s*.25*env);rot('caudal',x=-s*.1*env)
   elif name in ['Attack','Bite','Heavy','Ability','Eat']:
    peak=bump(t,.10,.66);close=bump(t,.53,.85);power={'Attack':.50,'Bite':.40,'Heavy':.73,'Ability':.63}.get(name,.45)
    rot('jaw',x=power*peak);rot('head',x=-power*.23*peak);rot('body',x=-.05*peak+.07*close,z=.045*env*sin(ph));rig.pose.bones['body'].location.y=.06*bump(t,0,.3)-.14*close
    rot('pectoral_L',y=.28*peak,x=-.12*close);rot('pectoral_R',y=-.28*peak,x=-.12*close);rot('caudal',z=.36*bump(t,0,.4)-.25*bump(t,.4,.9))
    if name=='Ability':rot('jaw',x=.58*bump(t,.15,.68)+.20*bump(t,.70,.95));rot('dorsal',z=.09*env)
   elif name in ['Hit','Stagger']:
    wave=sin((5 if name=='Stagger' else 3)*pi*t)*env;rot('body',z=.16*wave,y=.13*env);rot('head',x=-.055*env);rot('jaw',x=.14*env);rot('tail_base',z=-.2*wave);rot('pectoral_L',y=.35*env);rot('pectoral_R',y=.14*env)
   elif name=='Parry':rot('body',z=-.16*env,y=.17*env);rot('head',x=.04*env);rot('pectoral_L',y=.34*env);rot('caudal',z=.34*env)
   elif name=='Dodge':rot('body',z=.25*env,y=-.26*env);rig.pose.bones['body'].location.x=.20*env;rot('tail_base',z=-.38*env);rot('tail_tip',z=.40*env);rot('pectoral_R',y=-.34*env)
   elif name=='Growth':rot('body',x=-.035*env);rot('jaw',x=.16*env);rot('pectoral_L',y=.20*env);rot('pectoral_R',y=-.20*env);rot('dorsal',z=.045*env)
   elif name=='Death':
    q=t*t*(3-2*t);rot('body',y=1.35*q,z=.08*q);rig.pose.bones['body'].location.z=-.16*q;rot('jaw',x=.27*q);rot('head',x=-.07*q);rot('tail_base',z=.21*q);rot('tail_mid',z=.18*q);rot('caudal',z=-.17*q);rot('pectoral_L',y=.35*q);rot('pectoral_R',y=.12*q)
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
(HERE/'anchors.json').write_text(json.dumps({'dunkleosteus':[{'name':n,'bone':b,'point':p,'role':r} for n,b,p,r in anchors]},indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/'dunkleosteus.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
export(OUT/'dunkleosteus.glb')
full=sum(len(o.data.polygons) for o in objects)
# Applied decimation, retaining rig and sockets. Small anatomical features remain recognizable.
for o in objects:
 if len(o.data.polygons)>25:
  bpy.context.view_layer.objects.active=o;d=o.modifiers.new('Actual LOD geometry reduction','DECIMATE');d.ratio=.26;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(OUT/'dunkleosteus.lod1.glb')
# Restore full editable source for final image production.
bpy.ops.wm.open_mainfile(filepath=str(LOCAL/'dunkleosteus.blend'));scene=bpy.context.scene;rig=bpy.data.objects['Dunkleosteus']
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
scene.world.color=(.15,.15,.15)
world=scene.world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.11,.15,.17,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.5
scene.view_settings.view_transform='AgX'
def area(n,p,power,color,size):
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.color=color;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm broad key',(3,-4,5),650,(1,.87,.72),4);area('Cool fill',(-4,-1,2),500,(.58,.82,1),3);area('Silver rim',(1,4,3),850,(.75,.88,1),3)
bpy.ops.object.camera_add(location=(4,-4.8,2.25));cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=4.25

def view(loc,target=(0,.22,0),scale=4.25):cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale

def render(name,frame,path,loc=None,scale=4.25):
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame)
 if loc:view(loc,scale=scale)
 scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
view((4,-4.8,2.25));render('Idle',1,OUT/'dunkleosteus.select.png');render('Idle',1,OUT/'dunkleosteus.png')
scene.render.resolution_x=800;scene.render.resolution_y=600
render('Idle',1,OUT/'dunkleosteus.card.png')
scene.render.resolution_x=256;scene.render.resolution_y=192;render('Idle',1,OUT/'dunkleosteus.thumb.png')
scene.render.resolution_x=1000;scene.render.resolution_y=750
for name,frame,loc in [('Idle',1,(4,0,1)),('Swim',19,(4,-3,1.8)),('Bite',7,(3,-4,1)),('Eat',16,(0,-5,.5)),('Heavy',14,(4,-3,1.5)),('Ability',23,(4,-3,1.5)),('Guard',16,(0,-5,1)),('Dodge',7,(4,-2,2)),('Death',49,(4,-3,2))]:render(name,frame,LOCAL/(name+'.png'),loc)
meta={'id':'dunkleosteus','name':'Dunkleosteus','species':'Dunkleosteus terrelli','provenance':'Late Devonian (Famennian), Cleveland Shale, Ohio, USA','description':'Deep-bodied arthrodire with rigid cranial and thoracic armour, articulated gnathal cutting plates and a muscular posterior body.','lengthMeters':3.35,'modelLength':3.34,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0] for a in anchors],'sources':['https://www.palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction','https://doi.org/10.3390/d15030318'],'notes':['Original reconstruction informed by Engelman 2024, rather than a specimen scan.','Rear body, caudal outline, oral soft tissues and pigmentation remain interpretations.','Representative 3.35 m adult, not a genus maximum.','Growth is a relaxed maturation pose; no scale animation or moulting.','Armour boundaries are interpreted living plate outlines; detailed sutures should not be used as a research diagram.']}
(OUT/'dunkleosteus.json').write_text(json.dumps(meta,indent=2));(LOCAL/'build-stats.json').write_text(json.dumps({'sourcePolygons':full,'clips':clips},indent=2))
print('DUNKLEOSTEUS_COMPLETE')
