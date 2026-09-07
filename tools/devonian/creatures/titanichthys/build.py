"""Bespoke Titanichthys termieri reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.path.join(ROOT,'public/assets/devonian/creatures')
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/titanichthys')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='titanichthys';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-1.03,.05));bone('jaw',(0,-1.12,-.12),'skull');bone('throat',(0,-1.1,-.28),'skull')
for i,y in enumerate([.5,1.25,2.,2.65]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R';bone('pectoral'+s,(side*.66,-.32,-.24));bone('pectoralTip'+s,(side*1.21,.11,-.29),'pectoral'+s);bone('pelvic'+s,(side*.27,1.30,-.26),'tail1');bone('gill'+s,(side*.73,-.74,-.11),'skull')
bone('dorsal',(0,.52,.47),'tail0');bone('caudal',(0,2.73,.08),'tail3')
def vertex(p,col,w,uv=(0,0),var=True):
 p=Vector(p);v=.87+.19*noise.noise_vector(p*5)[0]+.10*noise.noise_vector(p*27)[1] if var else 1
 # Irregular small mottling with a faint warm lateral band, not scales pasted on armour.
 v*=1-.12*max(0,noise.noise_vector(p*13)[2])
 V.append(tuple(p));C.append(tuple(max(.001,min(.9,k*v))for k in col)+(1,));W.append({w:1}if isinstance(w,str)else w);U.append(uv);return len(V)-1
def face(f,m=0):F.append(tuple(f));M.append(m)
def grid(nr,nc,fn,m=0,wrap=False):
 ids=[[fn(i,j)for j in range(nc)]for i in range(nr)]
 for i in range(nr-1):
  for j in range(nc if wrap else nc-1):face((ids[i][j],ids[i][(j+1)%nc],ids[i+1][(j+1)%nc],ids[i+1][j]),m)
 return ids
def tube(pts,radii,col,w,m=0,sides=10):
 pts=list(map(Vector,pts));rows=[]
 for i,p in enumerate(pts):
  t=(pts[min(len(pts)-1,i+1)]-pts[max(0,i-1)]).normalized();a=t.cross(Vector((0,0,1)))
  if a.length<.001:a=t.cross(Vector((1,0,0)))
  a.normalize();b=t.cross(a);wi=w[i]if isinstance(w,list)else w
  rows.append([vertex(p+float(radii[i])*(a*cos(j*2*pi/sides)+b*sin(j*2*pi/sides)),col,wi,(j/sides,i/max(1,len(pts)-1)))for j in range(sides)])
 for i in range(len(rows)-1):
  for j in range(sides):face((rows[i][j],rows[i][(j+1)%sides],rows[i+1][(j+1)%sides],rows[i+1][j]),m)
 face(reversed(rows[0]),m);face(rows[-1],m)
def ell(c,scale,col,w,m=3):
 c=Vector(c)
 grid(17,32,lambda i,j:vertex(c+Vector((scale[0]*sin(pi*i/16)*cos(2*pi*j/32),scale[1]*sin(pi*i/16)*sin(2*pi*j/32),scale[2]*cos(pi*i/16))),col,w,(j/32,i/16),False),m,True)
# Model length 6.2: broad low head shield, deep trunk, flexible posterior. Complete outline inferred.
sections=[(-2.45,.69,.29,.01),(-2.15,.84,.54,.04),(-1.65,.91,.66,.04),(-1.05,.83,.64,.03),(-.5,.73,.58,0),(0,.62,.51,-.015),(.65,.48,.40,-.02),(1.3,.32,.28,-.01),(1.95,.17,.18,.015),(2.55,.09,.11,.06),(2.9,.025,.04,.14)]
def section(y):
 if y<=sections[0][0]:return np.array(sections[0][1:])
 for k in range(len(sections)-1):
  if sections[k][0]<=y<=sections[k+1][0]:
   a=np.array(sections[k]);b=np.array(sections[k+1]);t=(y-a[0])/(b[0]-a[0]);
   # Hermite interpolation preserves the authored generous head and taper without faceting.
   pre=np.array(sections[max(0,k-1)]);post=np.array(sections[min(len(sections)-1,k+2)])
   d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);p=(2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1
   return p[1:]
 return np.array(sections[-1][1:])
def surf(y,a,offset=0):
 w,h,z=section(y);return Vector(((w+offset)*cos(a),y,z+(h+offset)*sin(a)))
def bw(y,a=0):
 if y<-.98:
  jaw=max(0,-sin(a))**3*max(0,1-(y+2.45)/1.0)
  return {'jaw':jaw,'skull':1-jaw}if jaw>0 else {'skull':1}
 if y<.5:return {'body':1}
 q=min(3,(y-.5)/.73);i=int(q);f=q-i
 return {'tail%d'%i:1-f,'tail%d'%min(3,i+1):f}if i<3 else {'tail3':1}
def pigment(y,a):
 top=(sin(a)+1)/2;warm=math.exp(-((sin(a)+.13)/.25)**2)
 return (.19-.115*top+.025*warm,.25-.105*top+.015*warm,.23-.095*top)
def torso(i,j):
 y=-2.45+5.35*i/145;a=j*2*pi/96;return vertex(surf(y,a),pigment(y,a),bw(y,a),(j/96,(y+2.45)*.7))
rows=grid(146,96,torso,0,True);face(rows[-1],0)
# Oral funnel remains open at the lip, with a dark recessed terminal cavity. No speculative filter combs.
def mouth(i,j):
 t=i/24;a=2*pi*j/96;p=Vector((.69*(1-.78*t)*cos(a),-2.451+1.03*t,.01+.29*(1-.77*t)*sin(a)))
 jaw=max(0,-sin(a))**2*(1-t);return vertex(p,(.095-.055*t,.057-.028*t,.045-.020*t),{'jaw':jaw,'skull':1-jaw},(j/96,t))
oral=grid(25,96,mouth,4,True);face(reversed(oral[-1]),4)
# Thin U-shaped edentulous lower margin, gently rounded rather than a cutting blade.
pts=[surf(-2.453,pi+pi*i/64,.009)for i in range(65)]
tube(pts,[.022+.009*sin(pi*i/64)for i in range(65)],(.25,.25,.17),[bw(-2.45,pi+pi*i/64)for i in range(65)],2,12)
pts=[surf(-2.453,pi*i/64,.007)for i in range(65)]
tube(pts,[.019]*65,(.22,.23,.17),'skull',2,10)
# Conforming shield plates with narrow organic sutures; never move with tail or fin bones.
for ya,yb,sectors,bname in [(-2.38,-1.83,4,'skull'),(-1.80,-1.10,5,'skull'),(-.965,-.37,5,'body'),(-.34,.14,5,'body')]:
 for k in range(sectors):
  aa=-.30+(pi+.60)*k/sectors;bb=-.30+(pi+.60)*(k+1)/sectors
  def plate(i,j):
   t=i/20;u=j/18;y=ya+(yb-ya)*t+.025*sin(pi*t)*sin(pi*u);a=aa+.012+(bb-aa-.024)*u;p=surf(y,a,.015+.008*sin(pi*u)*sin(pi*t));col=np.array(pigment(y,a))*np.array((1.11,1.01,.87));return vertex(p,col,bname,(u*1.2,t))
  grid(21,19,plate,1)
# Eyes small relative to skull, seated within raised orbital rims.
for s in [-1,1]:
 eye=Vector((s*.823,-1.91,.294));ring=[eye+Vector((s*.025,.090*cos(i*2*pi/40),.091*sin(i*2*pi/40)))for i in range(41)]
 tube(ring,[.015]*41,(.16,.17,.12),'skull',2,8);ell(eye,(.042,.070,.070),(.004,.009,.010),'skull')
 # Recessed single branchial margin under a small cover, no shark-style serial slits.
 pts=[(s*(.77-.09*t),-.89+.20*t,-.10-.31*t)for t in np.linspace(0,1,25)]
 tube(pts,[.019]*25,(.035,.056,.049),'gill'+('L'if s==1 else'R'),4,8)
# Closed thin fin fans with anatomically weighted ray structures.
def fin(name,origin,boundary,base,tip=None,thickness=.015,rays=10):
 origin=Vector(origin);boundary=list(map(Vector,boundary));N=len(boundary);steps=16;normal=Vector((1,0,0))if max(p.x for p in boundary)-min(p.x for p in boundary)<.001 else Vector((0,0,1))
 def point(t,j):return origin.lerp(boundary[j],t)+normal*(thickness*sin(pi*t)*sin(pi*j/(N-1)))
 def weight(t):return {base:1-max(0,(t-.4)/.6),tip:max(0,(t-.4)/.6)}if tip else {base:1}
 for side in [-1,1]:
  def fv(i,j):
   t=i/steps;p=point(t,j)+normal*(side*thickness*.45*(.15+.85*sin(pi*t)));col=(.12+.035*t,.19+.025*t,.18-.04*t);return vertex(p,col,weight(t),(j/(N-1),t))
  grid(steps+1,N,fv,5)
 for j in np.linspace(1,N-2,rays).astype(int):
  pts=[point(t,j)+normal*(thickness*.5)for t in np.linspace(.02,.97,22)]
  tube(pts,[.009*(1-t)+.0015 for t in np.linspace(.02,.97,22)],(.13,.18,.14),[weight(t)for t in np.linspace(.02,.97,22)],2,6)
for s in [-1,1]:
 side='L'if s==1 else'R';o=(s*.65,-.34,-.24)
 # Swept, broad pectoral with a fleshy base and rounded taper; neither ray nor wing.
 controls=[(.66,-.53,-.23),(1.06,-.34,-.25),(1.52,.02,-.31),(1.73,.37,-.34),(1.71,.53,-.36),(1.45,.52,-.34),(.99,.36,-.31),(.67,.17,-.26)]
 boundary=[]
 for a,b in zip(controls,controls[1:]):
  for t in np.linspace(0,1,7,endpoint=False):boundary.append((s*(a[0]*(1-t)+b[0]*t),a[1]*(1-t)+b[1]*t,a[2]*(1-t)+b[2]*t))
 boundary.append((s*controls[-1][0],*controls[-1][1:]));fin('pectoral',o,boundary,'pectoral'+side,'pectoralTip'+side,rays=15)
 boundary=[(s*x,y,z)for x,y,z in[(.27,1.25,-.25),(.63,1.56,-.29),(.61,1.83,-.30),(.39,1.85,-.28),(.22,1.59,-.24)]]
 fin('pelvic',(s*.25,1.43,-.24),boundary,'pelvic'+side,rays=4)
# Median fins: a conservative generalized arthrodire reconstruction, documented as uncertain.
fin('dorsal',(0,.92,.31),[(0,.32,.46),(0,.59,.96),(0,.79,1.03),(0,1.03,.65),(0,1.39,.28)],'dorsal',thickness=.014,rays=7)
# Heterocercal caudal outline, upper lobe elongate; fleshy peduncle already continuous with body.
fin('caudal',(0,2.60,.07),[(0,2.44,.17),(0,2.91,.55),(0,3.63,1.06),(0,3.71,.98),(0,3.36,.46),(0,3.02,.01),(0,3.33,-.59),(0,3.19,-.61),(0,2.74,-.35),(0,2.51,-.04)],'caudal',thickness=.026,rays=8)
# Texture is reproducible procedural micro-relief; neither a fossil observation nor scraped imagery.
normal=bpy.data.images.new('Titanichthys skin microrelief',width=512,height=512);yy,xx=np.mgrid[0:512,0:512]/512.;rng=np.random.default_rng(738);grain=rng.normal(size=(512,512));freq=np.fft.fftfreq(512);kernel=np.exp(-((freq[:,None]**2+freq[None,:]**2)*180));height=np.fft.ifft2(np.fft.fft2(grain)*kernel).real*.14;dy,dx=np.gradient(height);arr=np.stack((.5-dx*9,.5-dy*9,np.ones_like(dx),np.ones_like(dx)),axis=-1).astype(np.float32);normal.pixels.foreach_set(arr.ravel());normal.filepath_raw=os.path.join(HERE,'skin-normal.png');normal.file_format='PNG';normal.save();normal.colorspace_settings.name='Non-Color';normal.pack()
mats=[]
for name,rough,strength in [('body',.47,.28),('armour',.50,.4),('accent',.4,.24),('eyes',.12,0),('oral',.49,.10),('fins',.46,.20)]:
 mat=bpy.data.materials.new(ID+' '+name);mat.use_nodes=True;n=mat.node_tree.nodes;links=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.13 if name=='eyes'else .04
 vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if strength:
  tx=n.new('ShaderNodeTexImage');tx.image=normal;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal'])
 mat.use_backface_culling=False;mats.append(mat)
mesh=bpy.data.meshes.new(ID+' contiguous anatomy');mesh.from_pydata(V,[],F);mesh.update();obj=bpy.data.objects.new(ID,mesh);bpy.context.collection.objects.link(obj)
for m in mats:mesh.materials.append(m)
for p,mi in zip(mesh.polygons,M):p.material_index=mi;p.use_smooth=True
col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(C,dtype=np.float32).ravel());uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.array([U[l.vertex_index]for l in mesh.loops],dtype=np.float32).ravel())
bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
arm=bpy.data.armatures.new(ID+' skeleton');rig=bpy.data.objects.new(ID+'_rig',arm);bpy.context.collection.objects.link(rig);obj.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,(h,t,p)in B.items():
 b=arm.edit_bones.new(n);b.head=h;b.tail=t
 if p:b.parent=arm.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')
groups={n:obj.vertex_groups.new(name=n)for n in B}
for i,w in enumerate(W):
 total=sum(w.values());assert abs(total-1)<1e-6
 for n,value in w.items():
  if value>0:groups[n].add([i],value,'REPLACE')
mod=obj.modifiers.new('Anatomical deformation','ARMATURE');mod.object=rig;obj.parent=rig
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
def reset():
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
seams={};bounds={}
for clip,duration in CLIPS.items():
 a=bpy.data.actions.new(clip);a.use_fake_user=True;rig.animation_data.action=a;last=round(duration*30);first=None
 for f in range(last+1):
  reset();u=f/last;p=2*pi*u;e=sin(pi*u)**2;loop=clip in LOOPS;env=1 if loop else e;pb=rig.pose.bones
  wave=lambda lag=0,freq=1:(sin(p*freq-lag)-sin(-lag))*env
  amp={'Idle':.16,'Swim':.76,'Eat':.31,'Guard':.10,'Dodge':1.4,'Ability':.50}.get(clip,.28)
  peak=sin(pi*max(0,min(1,(u-.24)/.40)))**2 if .24<u<.64 else 0
  wind=sin(pi*min(1,u/.28))**2 if u<.28 else 0
  settle=sin(pi*max(0,min(1,(u-.62)/.38)))**2 if u>.62 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.022*wave(0,2)if loop else 0
  if clip=='Eat':opening=.12*(1-cos(p))
  if clip=='Bite':opening=.25*e # Gentle oral closure; no teeth or predatory strike.
  if clip=='Attack':opening=.11*peak
  if clip=='Heavy':opening=.07*wind
  if clip=='Ability':opening=.48*e**.6
  if clip=='Growth':opening=.065*e
  opening+=.10*dead
  pb['jaw'].rotation_euler.x=opening;pb['skull'].rotation_euler.x=-opening*.13
  pb['throat'].rotation_euler.x=opening*.32+.017*wave(.6,2)
  body=pb['body'];body.rotation_euler.y=.012*amp*wave(.4);body.rotation_euler.x=.012*amp*wave();body.location.z=.012*amp*wave(.2)
  if clip in ['TurnLeft','TurnRight']:body.rotation_euler.z=(-1 if clip=='TurnLeft'else 1)*.22*e;body.rotation_euler.y=(-1 if clip=='TurnLeft'else 1)*.13*e
  if clip in ['Dive','Rise']:body.rotation_euler.x=(1 if clip=='Dive'else-1)*.19*e
  if clip=='Attack':body.location.y=.08*wind-.18*peak;body.rotation_euler.x=.05*wind-.03*peak
  if clip=='Heavy':body.rotation_euler.z=-.08*wind+.15*peak-.025*settle;body.location.y=.05*wind-.11*peak
  if clip=='Parry':body.rotation_euler.z=.16*e;body.rotation_euler.y=-.13*e
  if clip=='Guard':body.rotation_euler.x=.04*(1-cos(p));body.rotation_euler.y=.025*sin(p)
  if clip=='Dodge':body.rotation_euler.y=.30*e;body.rotation_euler.z=-.27*e;body.location.x=.20*e
  if clip in ['Hit','Stagger']:
   body.rotation_euler.z=.11*e*sin(p*(1 if clip=='Hit'else 2));body.rotation_euler.y=.17*e;body.location.y=.08*e
  if clip=='Growth':body.rotation_euler.x=-.035*e;body.rotation_euler.y=.045*e
  body.rotation_euler.y+=.72*dead;body.rotation_euler.x+=.06*dead;body.location.z-=.10*dead
  for i in range(4):
   q=pb['tail%d'%i];q.rotation_euler.z=(.045+i*.022)*amp*wave(i*.60)+.06*dead*sin(i*.7)
   if clip=='Dodge':q.rotation_euler.z+=.17*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.06*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.04+i*.008)*e
  pb['caudal'].rotation_euler.z=.09*amp*wave(2.7)+.05*dead
  pb['dorsal'].rotation_euler.y=.04*amp*wave(1.6)+.12*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R';q=pb['pectoral'+suffix];q.rotation_euler.y=s*(.035*wave(.8)+.06*opening+.11*dead);q.rotation_euler.z=s*(.022*wave(.3)-.11*dead)
   if clip=='Guard':q.rotation_euler.y+=s*.10*(1-cos(p))
   if clip=='Ability':q.rotation_euler.y-=s*.12*e;q.rotation_euler.z-=s*.06*e
   if clip=='Dodge':q.rotation_euler.y+=s*(.24 if s==1 else-.12)*e
   if clip=='Heavy':q.rotation_euler.z+=s*(.05*wind-.06*peak)
   if clip=='Growth':q.rotation_euler.y-=s*.16*e
   pb['pectoralTip'+suffix].rotation_euler.y=s*(.045*wave(1.3)+.10*dead)
   pb['pelvic'+suffix].rotation_euler.y=s*(.025*amp*wave(1.9)+.15*dead)
   pb['gill'+suffix].rotation_euler.z=s*(.035*opening+.012*wave(.4,2))
  state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb])
  if f==0:first=state.copy()
  if f==last:seams[clip]=float(abs(state-first).max())
  for q in pb:
   if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
   if q.name=='body':q.keyframe_insert('location',frame=f)
 points=[]
 for f in [0,int(last*.25),int(last*.5),int(last*.75),last]:
  scene.frame_set(f);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.array([v.co[:]for v in me.vertices]);assert np.isfinite(co).all();points.extend([co.min(0),co.max(0)]);ev.to_mesh_clear()
 bounds[clip]=[np.array(points).min(0).tolist(),np.array(points).max(0).tolist()]
 rig.animation_data.action=None
for c in set(CLIPS)-{'Death'}:assert seams[c]<1e-6,(c,seams[c])
reset();scene.frame_set(0)
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-2.44,-.11],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.55,.01],'role':'swallow'},{'name':'anchor_attack_primary','bone':'skull','point':[0,-2.42,.22],'role':'attack'}]
open(os.path.join(HERE,'anchors.json'),'w').write(json.dumps({ID:anchors},indent=2))
# Parent inverse equals inverse bind bone tail transform; matrix_world sets real anatomical world point.
sockets=[]
for a in anchors:
 socket=bpy.data.objects.new(a['name'],None);bpy.context.collection.objects.link(socket);socket.parent=rig;socket.parent_type='BONE';socket.parent_bone=a['bone'];socket.matrix_world.translation=Vector(a['point']);socket['cambrianAnchor']={'version':1,'role':a['role'],'parentBone':a['bone']};sockets.append(socket)
# Split by material before export (avoids Blender multi-material colour-index exporter regression).
bpy.ops.object.select_all(action='DESELECT');temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);temp.select_set(True);bpy.context.view_layer.objects.active=temp;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
for part in parts:bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=ID+' '+part.data.materials[0].name
rig.select_set(True)
for s in sockets:s.select_set(True)
bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.glb'),**kwargs)
fulltris=sum(len(p.vertices)-2 for p in mesh.polygons)
for part in parts:
 bpy.context.view_layer.objects.active=part;de=part.modifiers.new('Reduced silhouette preserving topology','DECIMATE');de.ratio=.28;bpy.ops.object.modifier_move_up(modifier=de.name);bpy.ops.object.modifier_apply(modifier=de.name)
lodtris=sum(sum(len(p.vertices)-2 for p in part.data.polygons)for part in parts)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.lod1.glb'),**kwargs)
for part in parts:bpy.data.objects.remove(part,do_unlink=True)
# Resolve exact socket local transforms post-export from inverse exported parent world bind matrix.
def patch(path,lod=False):
 raw=open(path,'rb').read();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[20+n:];nodes=g['nodes'];parent={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
 from mathutils import Matrix,Quaternion
 def world(i):
  node=nodes[i]
  if 'matrix'in node:m=Matrix(np.array(node['matrix']).reshape(4,4).T.tolist())
  else:
   t=node.get('translation',[0,0,0]);q=node.get('rotation',[0,0,0,1]);s=node.get('scale',[1,1,1]);m=Matrix.LocRotScale(Vector(t),Quaternion((q[3],q[0],q[1],q[2])),Vector(s))
  return world(parent[i])@m if i in parent else m
 for a in anchors:
  i=next(i for i,n in enumerate(nodes)if n.get('name')==a['name']);b=next(i for i,n in enumerate(nodes)if n.get('name')==a['bone']);p=Vector((a['point'][0],a['point'][2],-a['point'][1]));local=world(b).inverted()@p
  if i in parent and i in nodes[parent[i]].get('children',[]):nodes[parent[i]]['children'].remove(i)
  nodes[b].setdefault('children',[]).append(i);nodes[i]={'name':a['name'],'translation':list(local),'extras':{'cambrianAnchor':{'version':1,'role':a['role'],'parentBone':a['bone']}}}
 for animation in g['animations']:
  kept=[]
  for channel in animation['channels']:
   target=channel['target'];name=nodes[target['node']].get('name');prop=target['path']
   if prop=='scale' or name=='root':
    acc=g['accessors'][animation['samplers'][channel['sampler']]['output']];view=g['bufferViews'][acc['bufferView']];count={'VEC3':3,'VEC4':4}[acc['type']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0);values=np.frombuffer(binary,dtype='<f4',count=acc['count']*count,offset=offset).reshape(-1,count)
    expected=np.array(nodes[target['node']].get(prop,[1,1,1]if prop=='scale'else[0,0,0,1]if prop=='rotation'else[0,0,0]));assert np.max(np.abs(values-expected))<1e-5,(name,prop,values)
   else:kept.append(channel)
  animation['channels']=kept
 if lod:g['animations']=[a for a in g['animations']if a['name']in ['Idle','Swim','Death']]
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);out=struct.pack('<III',0x46546c67,2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary;open(path,'wb').write(out);return g
full=patch(os.path.join(OUT,ID+'.glb'));lod=patch(os.path.join(OUT,ID+'.lod1.glb'),True)
for g in [full,lod]:
 assert len([n for n in g['nodes']if n.get('name','').startswith('anchor_')])==3
 for a in g['animations']:
  assert all(c['target']['path']!='scale'for c in a['channels'])
  assert all(g['nodes'][c['target']['node']].get('name')!='root'for c in a['channels'])
assert lodtris/fulltris<.4
sources=[{'title':'Coatham et al. (2020), Was the Devonian placoderm Titanichthys a suspension feeder?','url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/','doi':'10.1098/rsos.200272'}]
notes=['Slender edentulous jaw and small relative orbits supported by fossils; suspension feeding supported biomechanically, actual filtering organs unknown and omitted.','Complete body outline, tail and fin proportions, soft tissues, pigmentation and all motion are explicitly artistic reconstruction.','Representative reconstructed display length 5 m; not a measured complete specimen or claimed maximum.','Attack/Heavy are shield/contact motions, Bite is a gentle oral closing cycle, Ability is a broad ram-feeding gape; names are compatibility labels, not gameplay design.']
meta={'id':ID,'name':'Titanichthys','species':'Titanichthys termieri','provenance':'Late Devonian (Famennian), Southern Maïder basin, Morocco','description':'Broad-headed armoured giant with small eyes and slender toothless jaws, reconstructed as a suspension feeder.','lengthMeters':5,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Studio and prescribed pose review.
world=bpy.data.worlds.new('Deep neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.033,.041,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size,color in [('Key',(3,-5,7),1300,5,(1,.89,.72)),('Fill',(-5,-2,3),900,5,(.53,.78,1)),('Rim',(1,5,5),1700,4,(.70,.89,1))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=7.25
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.45;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
cam.location=(7,-6,4.2);cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=72
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.5,'front'),('Bite',.5,'side'),('Heavy',.45,'threequarter'),('Ability',.5,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,1.2),'front':(0,-10,1),'threequarter':(7,-6,4.2)}[view];cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
print('TITANICHTHYS_COMPLETE',json.dumps(report),flush=True)
