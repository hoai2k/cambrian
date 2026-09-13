"""Independently authored Walliserops trifurcatus: rigid shell, compound eyes, biramous limbs."""
import bpy,bmesh,math,json,os,random
import numpy as np
from pathlib import Path
from math import sin,cos,pi,exp,sqrt
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/walliserops/v2';O=L/'candidate';O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);S=bpy.context.scene;S.render.fps=30
M={}
for n,c,r in [('body',(.29,.32,.30),.46),('underside',(.22,.25,.23),.53),('legs',(.25,.29,.27),.48),('gills',(.26,.32,.29),.54),('eyes',(.018,.026,.026),.24),('lens',(.022,.032,.034),.16),('oral',(.19,.12,.105),.47)]:
 m=bpy.data.materials.new('Walliserops_'+n);m.diffuse_color=(*c,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=r;bs.inputs['IOR'].default_value=1.46;bs.inputs['Specular IOR Level'].default_value=.30;M[n]=m
if os.environ.get('WAL_PBR')=='1':
 for key,m in M.items():
  if not (H/(key+'-albedo.png')).exists():continue
  bs=m.node_tree.nodes.get('Principled BSDF')
  for suffix,input in [('albedo','Base Color'),('normal','Normal'),('roughness','Roughness')]:
   im=bpy.data.images.load(str(H/(key+'-'+suffix+'.png')));im.pack();tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im
   if suffix!='albedo':im.colorspace_settings.name='Non-Color'
   if suffix=='normal':
    nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.35;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs[input])
   else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[input])
spec=[('root',(0,0,0),None),('body',(0,-.1,.20),'root'),('cephalon',(0,-.10,.20),'body')]
STEP=.153
for i in range(11):spec.append((f'thorax_{i+1:02d}',(0,-.04+i*STEP,.19), 'cephalon'if i==0 else f'thorax_{i:02d}'))
PY0=-.04+11*STEP
spec.append(('pygidium',(0,PY0,.16),'thorax_11'))
# Three comparatively reconstructed post-antennal cephalic pairs, eleven thoracic, four pygidial.
limbs=[]
for j,(y,pa,size)in enumerate([(-.83,'cephalon',.56),(-.52,'cephalon',.79),(-.21,'cephalon',.98)]+[(.045+i*STEP,f'thorax_{i+1:02d}',1-.018*i)for i in range(11)]+[(PY0+.11+i*.13,'pygidium',.64-i*.11)for i in range(4)]):
 for side in [-1,1]:
  sideN='L'if side>0 else'R';base=f'limb_{j:02d}_{sideN}';pts=[(side*x*size,y+dy*size,z-((.075+.10*max(0,min(1,(y-PY0)/.6)))*max(0,(z+.44)/.57) if pa=='pygidium'else 0))for x,dy,z in [(.20,0,.13),(.39,.01,.055),(.59,.035,-.055),(.75,.065,-.11),(.85,.08,-.23),(.88,.10,-.32),(.87,.11,-.40),(.83,.13,-.44)]]
  for k in range(7):spec.append((base+f'_{k}',pts[k],pa if k==0 else base+f'_{k-1}'))
  spec.append((base+'_gill',pts[0],pa));limbs.append((j,side,base,pts,size,pa))
for side in [-1,1]:
 ss='L'if side>0 else'R'
 for k,p in enumerate([(.26,-1.02,-.09),(.45,-1.35,-.10),(.62,-1.72,-.11),(.80,-2.06,-.135)]):spec.append((f'antenna_{ss}_{k}',(side*p[0],p[1],p[2]),'cephalon'if k==0 else f'antenna_{ss}_{k-1}'))
spec.extend([('hypostome',(0,-.73,.035),'cephalon'),('oral_pump',(0,-.59,.085),'cephalon')])
a=bpy.data.armatures.new('Walliserops_segmental_rig');rig=bpy.data.objects.new('Walliserops',a);S.collection.objects.link(rig);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=a.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.085,0));b.use_deform=n!='root'
 if pa:b.parent=a.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False);objects=[]
def mesh(n,v,f,ma='body',bone='cephalon',uvs=None,weights=None,sub=0):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=[q for q in bm.faces if len(q.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);S.collection.objects.link(o);o.parent=rig;me.materials.append(M[ma]);objects.append(o);uv=me.uv_layers.new(name='UVMap')
 for f in me.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   vi=me.loops[li].vertex_index;p=me.vertices[vi].co;uv.data[li].uv=uvs[vi]if uvs else(.5+p.x/2.2,(p.y+1.40)/3.65+max(0,min(1,(-p.y-1.04)/.34))*(p.z-.10)*.15)
 weights=weights or[{bone:1}for p in v];groups={k:o.vertex_groups.new(name=k)for k in set(k for w in weights for k in w)}
 for i,w in enumerate(weights):
  for k,val in w.items():
   if val>0:groups[k].add([i],val/sum(w.values()),'REPLACE')
 if sub:
  md=o.modifiers.new('Supported shell subdivision','SUBSURF');md.levels=sub;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=md.name)
 md=o.modifiers.new('Segmental articulation','ARMATURE');md.object=rig
 return o

def tube(n,pts,rads,ma,bone,N=10):
 vv=[];uu=[]
 for j,p in enumerate(pts):
  q=Vector(p);d=Vector(pts[min(len(pts)-1,j+1)])-Vector(pts[max(0,j-1)]);d.normalize();t=d.cross(Vector((0,0,1)))
  if t.length<.01:t=d.cross(Vector((1,0,0)))
  t.normalize();b=d.cross(t)
  if 'podomere' in n:b*=.58
  for k in range(N):vv.append(tuple(q+rads[j]*(t*cos(2*pi*k/N)+b*sin(2*pi*k/N))));uu.append((k/N,j/(len(pts)-1)))
 ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(pts)-1)for k in range(N)];ff.extend([tuple(range(N-1,-1,-1)),tuple((len(pts)-1)*N+k for k in range(N))]);return mesh(n,vv,ff,ma,bone,uu)
def oval(n,c,r,ma,bone,N=24,K=12,axes=None):
 c=Vector(c);axes=axes or[Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))];vv=[tuple(c-axes[2]*r[2])];uu=[(.5,0)]
 for j in range(1,K):
  ph=-pi/2+pi*j/K
  for k in range(N):th=2*pi*k/N;vv.append(tuple(c+axes[0]*(r[0]*cos(ph)*cos(th))+axes[1]*(r[1]*cos(ph)*sin(th))+axes[2]*(r[2]*sin(ph))));uu.append((k/N,j/K))
 vv.append(tuple(c+axes[2]*r[2]));uu.append((.5,1));ff=[(0,1+(k+1)%N,1+k)for k in range(N)]
 for j in range(K-2):
  for k in range(N):ff.append((1+j*N+k,1+j*N+(k+1)%N,1+(j+1)*N+(k+1)%N,1+(j+1)*N+k))
 ff.extend([(len(vv)-1,1+(K-2)*N+k,1+(K-2)*N+(k+1)%N)for k in range(N)]);return mesh(n,vv,ff,ma,bone,uu)
# Cephalon: a single closed continuous mesh with glabella, cheeks, ocular platforms and occipital furrows.
outline=[(-1.40,.018),(-1.365,.29),(-1.25,.56),(-1.04,.79),(-.81,.92),(-.57,.985),(-.30,1.00),(-.12,.985),(-.055,.945)]
def wid(y):return float(np.interp(y,[q[0]for q in outline],[q[1]for q in outline]))
def headz(x,y):
 u=x/max(.018,wid(y));ry=min(1,((y+.055)/1.345)**2);r2=min(1,ry+(1-ry)*u*u);base=.075-.31*r2*r2+.08*sqrt(max(0,1-r2));gw=.37+.12*exp(-((y+1.10)/.30)**2)
 g=.29*exp(-(x/(gw*.86))**4-((y+.85)/.47)**4);ocular=.265*exp(-((abs(x)-.635)/.132)**2-((y+.59)/.282)**4)
 occ=.16*exp(-(x/.30)**4-((y+.105)/.050)**2);pre=.11*exp(-(x/.285)**4-((y+.245)/.065)**2)
 fur=.060*exp(-((abs(x)-gw*.93)/.027)**2-((y+.72)/.50)**4)
 return base+(g+ocular+occ+pre-fur)*min(1,8*(1-r2))
ys=np.linspace(-1.40,-.055,85);NX=89;vv=[]
for lower in [False,True]:
 for y in ys:
  w=wid(y)
  for j in range(NX):x=w*(-1+2*j/(NX-1));ry=min(1,((y+.055)/1.345)**2);r2=min(1,ry+(1-ry)*(x/w)**2);z=.035-.31*r2*r2 if lower else headz(x,y);yy=y+.13*abs(x/w)**3*exp(-((y+.055)/.18)**4);vv.append((x,yy,z))
ff=[];N=len(ys)*NX
for lower in [False,True]:
 off=N if lower else 0
 for i in range(len(ys)-1):
  for j in range(NX-1):q=(off+i*NX+j,off+i*NX+j+1,off+(i+1)*NX+j+1,off+(i+1)*NX+j);ff.append(tuple(reversed(q))if lower else q)
for i in range(len(ys)-1):
 for j in [0,NX-1]:q=i*NX+j;ff.append((q,q+NX,q+NX+N,q+N))
for i in [0,len(ys)-1]:
 for j in range(NX-1):q=i*NX+j;ff.append((q,q+N,q+1+N,q+1))
head=mesh('cephalon_continuous_closed',vv,ff,sub=1);head['anatomyRole']='continuous cephalon including anatomical ocular platforms, excluding ornaments'
head.data.materials.append(M['eyes'])
# Separate buried ocular organs and individually inset lenses. Sclera is on actual cephalic surface.
EYES=[];LENSES=[]
for side in [-1,1]:
 ss='L'if side>0 else'R';v=[];ncol=36;nrow=12
 for bot in [False,True]:
  for i in range(ncol):
   t=-1+2*i/(ncol-1);y=-.59+.238*t;half=.063*sqrt(max(.055,1-t*t));xc=.705-.018*t*t
   for j in range(nrow):x=side*(xc+half*(-1+2*j/(nrow-1)));z=headz(x,y)-(.043 if bot else .008);v.append((x,y,z))
 n=nrow*ncol;f=[]
 for off in [0,n]:
  for i in range(ncol-1):
   for j in range(nrow-1):q=(off+i*nrow+j,off+i*nrow+j+1,off+(i+1)*nrow+j+1,off+(i+1)*nrow+j);f.append(q)
 for i in range(ncol-1):
  for j in [0,nrow-1]:q=i*nrow+j;f.append((q,q+nrow,q+nrow+n,q+n))
 for i in [0,ncol-1]:
  for j in range(nrow-1):q=i*nrow+j;f.append((q,q+n,q+n+1,q+1))
 eye=mesh('ocular_volume_'+ss,v,f,'eyes');EYES.append(eye.name)
 for file in range(17):
  t=-1+2*file/16;count=3 if abs(t)>.93 else 4 if abs(t)>.70 else 5 if abs(t)>.32 else 6
  for row in range(count):
   a=(row+(6-count)/2)/5;x=side*(.650+.112*a-.012*t*t);y=-.59+.222*t+.007*(row%2-.5);z=headz(x,y);eps=.0001;normal=Vector((-(headz(x+eps,y)-headz(x-eps,y))/(2*eps),-(headz(x,y+eps)-headz(x,y-eps))/(2*eps),1)).normalized();tangent=Vector((0,1,0));tangent=(tangent-normal*tangent.dot(normal)).normalized();other=tangent.cross(normal).normalized();rad=.0182*(.90+.10*sin(pi*a));c=Vector((x,y,z))-normal*(rad*.50+.001)
   ob=oval(f'lens_{ss}_{file:02d}_{row}',c,(rad*.74,rad*.74,rad*1.20),'lens','cephalon',N=20,K=12,axes=[other,tangent,normal]);ob['anatomyRole']='individual schizochroal calcite lens';LENSES.append({'name':ob.name,'side':ss,'file':file,'row':row,'center':list(c),'radius':rad})
# Low irregular glabellar tubercles are continuous surface displacements, not detached beads.
rg=random.Random(74291);bumps=[]
for i in range(85):
 y=rg.uniform(-1.32,-.33);x=rg.uniform(-.40,.40)
 if abs(x)>(.37+.12*exp(-((y+1.10)/.30)**2))*.94:continue
 bumps.append((x,y,rg.uniform(.018,.034),rg.uniform(.003,.007)))
for v in head.data.vertices:
 p=v.co
 if p.z<headz(p.x,p.y)-.02:continue
 h=0
 for bx,by,rad,amp in bumps:
  d=((p.x-bx)/(rad*(1.45 if by< -1.12 else 1)))**2+((p.y-by)/rad)**2
  if d<6:h+=amp*exp(-d*1.6)
 p.z+=h
# Thoracic tergites each remain completely rigid. Broad axial ring and rounded pleural field.
def plate(i):
 y=-.04+i*STEP;bone=f'thorax_{i+1:02d}';w=.91-.022*i-.0012*i*i;v=[];NX=57;NY=11
 for lower in [False,True]:
  for j in range(NY):
   t=j/(NY-1)
   for k in range(NX):
    u=-1+2*k/(NX-1);x=w*u*(.935+.065*sin(pi*t));yy=y-.035+t*(STEP+.041)+.105*abs(u)**3;ax=.28-.007*i;arch=.095+.175*exp(-(x/ax)**6)+.070*max(0,1-u*u)**.7-.028*exp(-((abs(x)-ax*.99)/.034)**2)
    z=arch+.034*sin(pi*t)-.026*exp(-((t-.34)/.085)**2)*(1-exp(-(x/.29)**6))-.014*exp(-((t-.94)/.07)**2);z-=.37*abs(u)**4
    z-=.035 if lower else 0
    v.append((x,yy,z))
 n=NX*NY;f=[]
 for off in [0,n]:
  for j in range(NY-1):
   for k in range(NX-1):q=j*NX+k+off;f.append((q,q+1,q+1+NX,q+NX))
 for j in range(NY-1):
  for k in [0,NX-1]:q=j*NX+k;f.append((q,q+NX,q+NX+n,q+n))
 for j in [0,NY-1]:
  for k in range(NX-1):q=j*NX+k;f.append((q,q+n,q+n+1,q+1))
 o=mesh(f'thoracic_tergite_{i+1:02d}',v,f,bone=bone,sub=1);o['rigidAnatomy']=True
 # An anterior articulating half-ring slides beneath the preceding axial shell.
 oval(f'articulating_half_ring_{i+1:02d}',(0,y+.008,.235),(.29-.008*i,.072,.048),'underside',bone,N=32,K=12)
for i in range(11):
 plate(i)
 oval(f'ventral_sternite_{i+1:02d}',(0,-.01+i*STEP,.125),(.27-.006*i,.105,.080),'underside',f'thorax_{i+1:02d}',N=32,K=12)
# Compact pygidial shield: eight axial rings and six gently curved pleural ribs.
v=[];NY=49;NX=65
for bottom in [False,True]:
 for j in range(NY):
  t=j/(NY-1);y=PY0-.015+.66*t;w=.565*sqrt(max(.0007,1-t**1.7))
  for k in range(NX):
   u=-1+2*k/(NX-1);x=w*u;r2=t*t+(1-t*t)*u*u;z=.11-.25*r2*r2-.12*(1-t)*u*u+.18*(1-t)*exp(-(x/(.20*(1-t)+.02))**4)+.055*(1-u*u)*(1-t);phase=t+.22*abs(u)**1.8
   z+=.022*(.5+.5*cos(phase*2*pi*6))*(1-t)*(1-exp(-(x/.17)**6));z+=.028*(.5+.5*cos(t*2*pi*8))*(1-t)*exp(-(x/(.20*(1-t)+.02))**4)
   if bottom:z=.04-.25*r2*r2-.12*(1-t)*u*u
   v.append((x,y,z))
n=NX*NY;f=[]
for off in [0,n]:
 for j in range(NY-1):
  for k in range(NX-1):q=off+j*NX+k;f.append((q,q+1,q+1+NX,q+NX))
for j in range(NY-1):
 for k in [0,NX-1]:q=j*NX+k;f.append((q,q+NX,q+NX+n,q+n))
for j in [0,NY-1]:
 for k in range(NX-1):q=j*NX+k;f.append((q,q+n,q+n+1,q+1))
mesh('pygidium_ribbed_shield',v,f,bone='pygidium',sub=1)
# Flattened seven-podomere endopods, differentiated protopod gnathobases and respiratory fans.
for j,side,base,pts,size,pa in limbs:
 for k in range(7):
  p=Vector(pts[k]);q=Vector(pts[k+1]);d=q-p;r=(.048-.0046*k)*size
  tube(base+f'_podomere_{k+1}',[tuple(p-d*.10),tuple(p+d*.08),tuple(p+d*.72),tuple(q+d*.10)],[r*.73,r,r*.81,r*.48],'legs',base+f'_{k}',N=10)
  if k<6:oval(base+f'_arthrodial_{k}',q,(r*.67,r*.73,r*.63),'underside',base+f'_{k}',N=12,K=8)
 p=Vector(pts[-1]);q=p+Vector((-side*.055*size,.024*size,-.020*size));tube(base+'_terminal_claw',[p,p.lerp(q,.6)+Vector((0,0,-.012)),q],[.014*size,.009*size,.0014],'legs',base+'_6',N=10)
 # Ventral coxal gnathobases point into the food groove, not a vertebrate jaw.
 for k in range(3):
  p=Vector(pts[0])+Vector((-side*.085,(k-1)*.033,-.018));tube(base+f'_gnathobase_{k}',[p,p+Vector((-side*.060,.004,-.025)),p+Vector((-side*.080,.009,-.015))],[.018*size,.012*size,.0015],'legs',base+'_0',N=8)
 # Lamellar exopod: separate curved thin blades attached continuously at the protopod.
 root=Vector(pts[0]);spine=[root,root+Vector((side*.21*size,.01,-.13)),root+Vector((side*.44*size,.045,-.34))]
 tube(base+'_exopod_axis',spine,[.023*size,.018*size,.006*size],'gills',base+'_gill',N=10)
 for k in range(14):
  t=.10+.85*k/13;start=root+Vector((side*.44*size*t,.045*t,-.34*t));length=(.11+.12*sin(pi*t))*size;v=[];f=[]
  for bot in [False,True]:
   for a in range(6):
    u=a/5
    for b in range(3):w=(b/2-.5)*.022*size;v.append(tuple(start+Vector((side*(.08*size*sin(pi*u)+w),length*u,-.014*sin(pi*u)+(-.003 if bot else .003)))))
  n=18
  for off in [0,n]:
   for a in range(5):
    for b in range(2):q=off+a*3+b;f.append((q,q+1,q+4,q+3))
  for a in range(5):
   for b in [0,2]:q=a*3+b;f.append((q,q+3,q+3+n,q+n))
  for a in [0,5]:
   for b in range(2):q=a*3+b;f.append((q,q+n,q+n+1,q+1))
  mesh(base+f'_branchial_lamella_{k:02d}',v,f,'gills',base+'_gill')
# Antennal flagella, fine articulated annuli and tapered terminal filaments.
for side in [-1,1]:
 ss='L'if side>0 else'R';ap=[Vector((side*x,y,z))for x,y,z in [(.26,-1.02,-.09),(.45,-1.35,-.10),(.62,-1.72,-.11),(.80,-2.06,-.135),(.87,-2.36,-.165)]]
 for k in range(4):
  for j in range(8):
   t=j/8;u=(j+.91)/8;p=ap[k].lerp(ap[k+1],t);q=ap[k].lerp(ap[k+1],u);r=.030*(1-(k+t)/4)**.9+.002;tube(f'antenna_{ss}_annulus_{k}_{j}',[p,p.lerp(q,.25),q],[r*.86,r,r*.80],'legs',f'antenna_{ss}_{k}',N=10)
# Ventral hypostome protects a posterior-facing modeled oral recess, with no invented jaw.
oval('hypostome_ventral_plate',(0,-.83,.014),(.225,.305,.062),'underside','hypostome',N=48,K=20)
# Sculpt the ventral posterior-facing aperture into the actual closed cephalon.
oralpts=[(0,-.455,.033,.087),(0,-.52,.075,.079),(0,-.61,.119,.073),(0,-.76,.155,.050),(0,-.84,.17,.022),(0,-.86,.172,.002)]
v=[];N=48
for j,(x,y,z,r)in enumerate(oralpts):
 for k in range(N):a=2*pi*k/N;v.append((x+r*cos(a),y,z+r*.68*sin(a)))
f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(oralpts)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(oralpts)-1)*N+k for k in range(N))]);cut=mesh('temporary_oral_negative',v,f,'oral')
head.data.materials.append(M['oral']);cut.data.materials.clear()
for ma in head.data.materials:cut.data.materials.append(ma)
for f in cut.data.polygons:f.material_index=2
bo=head.modifiers.new('Actual oral aperture and lined pharynx','BOOLEAN');bo.operation='DIFFERENCE';bo.solver='EXACT';bo.object=cut;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=bo.name);bpy.ops.object.modifier_apply(modifier=bo.name);objects.remove(cut);bpy.data.objects.remove(cut,do_unlink=True)
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free();head.vertex_groups.clear();vg=head.vertex_groups.new(name='cephalon');vg.add(list(range(len(head.data.vertices))),1,'REPLACE')
inside_ids=set();outer_ids=set()
for face in head.data.polygons:
 (inside_ids if face.material_index==2 else outer_ids).update(face.vertices)
gp=head.vertex_groups.new(name='oral_pump')
for i in inside_ids-outer_ids:
 p=head.data.vertices[i].co;amount=.30*exp(-((p.y+.67)/.11)**2);vg.add([i],1-amount,'REPLACE');gp.add([i],amount,'REPLACE')
head.data.materials.append(M['underside'])
for face in head.data.polygons:
 if face.material_index==0 and face.normal.z<-.45:face.material_index=3
# Consolidate anatomically related rigid parts while preserving all named skin weights.
def join_group(parts,name):
 if len(parts)<2:return
 bpy.ops.object.select_all(action='DESELECT')
 for ob in parts:ob.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();joined=bpy.context.object;joined.name=name
 for ob in parts[1:]:objects.remove(ob)
for j,side,base,pts,size,pa in limbs:join_group([o for o in objects if o.name.startswith(base+'_')],base+'_biramous_appendage')
for side in ['L','R']:
 join_group([o for o in objects if o.name.startswith('antenna_'+side+'_annulus')],'antenna_'+side+'_flagellum')
 join_group([o for o in objects if o.name.startswith('lens_'+side+'_')],'lens_solids_'+side)
# Three version-1 nested sockets refer to the real ventral feeding groove.
exec(compile((H/'special_anatomy.py').read_text(),str(H/'special_anatomy.py'),'exec'))
anchors=[('anchor_mouth','cephalon',(0,-.525,.067),'mouth'),('anchor_mouth_inside','oral_pump',(0,-.635,.12),'swallow'),('anchor_attack_primary','cephalon',(.018,-3.73,.67),'attack')]
for n,b,p,r in anchors:
 ob=bpy.data.objects.new(n,None);S.collection.objects.link(ob);ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=b;ob.location=Vector(p)-rig.data.bones[b].tail_local;ob['cambrianAnchor']={'version':1,'role':r,'parentBone':b}
# Clay articulation preview; full independently authored clips added after silhouette review.
CLIPS={'Idle':72,'Crawl':72,'Swim':72,'TurnLeft':48,'TurnRight':48,'Dive':48,'Rise':48,'Attack':30,'Bite':15,'Heavy':33,'Hit':18,'Death':48,'Guard':30,'Parry':11,'Dodge':12,'Eat':48,'Stagger':36,'Ability':72,'Growth':45,'Moult':45}
LOOPS=['Idle','Crawl','Swim','Guard','Eat']
exec(compile((H/'animations.py').read_text(),str(H/'animations.py'),'exec'))
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
S.frame_set(1);bpy.context.view_layer.update();(L/'eye-lens-layout.json').write_text(json.dumps({'ocularVolumes':EYES,'lenses':LENSES},indent=2));bpy.ops.wm.save_as_mainfile(filepath=str(L/'walliserops-v2.blend'));print('WALLISEROPS_CLAY_READY',len(objects),len(spec),flush=True)

if os.environ.get("WAL_EXPORT")=="1":exec(compile((H/"export.py").read_text(),str(H/"export.py"),"exec"))
