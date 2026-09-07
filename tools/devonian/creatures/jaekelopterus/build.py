"""Jaekelopterus initial authored reconstruction. Blender +Z up / -Y forward."""
import bpy,bmesh,math,json,sys,hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/jaekelopterus';C=L/'initial-candidate';C.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
s=bpy.context.scene;s.render.fps=30;objects=[];M={}
for n,c,r in [('head',(.15,.105,.052),.36),('body',(.145,.096,.042),.4),('legs',(.12,.079,.034),.42),('paddle',(.13,.089,.039),.42),('underside',(.155,.13,.079),.54),('joint',(.059,.042,.024),.58),('denticle',(.072,.039,.014),.29),('oral',(.062,.024,.019),.56),('eyes',(.004,.008,.006),.16)]:
 m=bpy.data.materials.new(n);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=r;m.diffuse_color=(*c,1);M[n]=m
spec=[('root',(0,0,0),None),('body',(0,-.4,0),'root')]
# Twelve opisthosomal rings; each shell stays rigid, intersegmental membranes flex.
segs=[]
for i in range(12):
 y=-.18+i*.235;w=[.64,.68,.69,.67,.63,.58,.52,.465,.406,.346,.289,.236][i];h=[.235,.25,.25,.244,.23,.218,.20,.18,.164,.149,.132,.113][i];segs.append((y,w,h));spec.append(('segment%02d'%i,(0,y-.125,0),'body'if i==0 else'segment%02d'%(i-1)))
spec.append(('telson',(0,2.49,0),'segment11'))
legs={};claws={};paddles={}
for sign in [1,-1]:
 q='L'if sign==1 else'R';claws[q]=[(sign*.23,-1.13,-.09),(sign*.48,-1.61,-.015),(sign*.74,-2.08,.005)]
 for i,p in enumerate(claws[q]):spec.append(('chelicera'+q+str(i),p,'body'if i==0 else'chelicera'+q+str(i-1)))
 spec.append(('finger'+q,(sign*.58,-2.29,.008),'chelicera'+q+'2'))
 spec.append(('gnathobase'+q,(sign*.16,-.67,-.15),'body'))
 for j in range(4):
  y=-1.02+j*.205;reach=.70+.12*j;dy=[-.47,-.14,.24,.48][j];pts=[(sign*.32,y,-.14),(sign*.64,y+.035,-.19),(sign*(reach+.19),y+dy*.60,-.16),(sign*(reach+.31),y+dy,-.48)]
  legs[q,j]=pts
  for k in range(3):spec.append(('leg'+q+str(j)+'_'+str(k),pts[k],'body'if k==0 else'leg'+q+str(j)+'_'+str(k-1)))
 paddles[q]=[(sign*.44,-.23,-.14),(sign*.78,.04,-.11),(sign*1.19,.32,-.11)]
 for i,p in enumerate(paddles[q]):spec.append(('paddle'+q+str(i),p,'body'if i==0 else'paddle'+q+str(i-1)))
arm=bpy.data.armatures.new('Jaekelopterus podomere skeleton');rig=bpy.data.objects.new('jaekelopterus_rig',arm);s.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,0,.3)if n=='root'else(0,.18,0))
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT')
def mesh(name,v,f,mat,bone='body',weights=None,uv=None):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);s.collection.objects.link(o);me.materials.append(M[mat]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 col=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for d in col.data:d.color=(*M[mat].diffuse_color[:3],1)
 layer=me.uv_layers.new(name='UVMap')
 for l in me.loops:layer.data[l.index].uv=uv[l.vertex_index]if uv else(v[l.vertex_index][0],v[l.vertex_index][1])
 weights=weights or[{bone:1}for _ in v]
 for bn in set(k for w in weights for k in w):
  g=o.vertex_groups.new(name=bn)
  for i,w in enumerate(weights):
   if w.get(bn,0)>0:g.add([i],float(w[bn]/sum(w.values())),'REPLACE')
 mod=o.modifiers.new('Anatomical articulation','ARMATURE');mod.object=rig;o.parent=rig;return o

def interp(rows,t):
 k=max(0,min(len(rows)-2,int(np.searchsorted([a[0]for a in rows],t))-1));a=np.array(rows[k]);b=np.array(rows[k+1]);q=np.clip((t-a[0])/(b[0]-a[0]),0,1);pre=np.array(rows[max(0,k-1)]);post=np.array(rows[min(len(rows)-1,k+2)]);d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return((2*q**3-3*q*q+1)*a+(q**3-2*q*q+q)*d0+(-2*q**3+3*q*q)*b+(q**3-q*q)*d1)[1:]
def loft(name,rows,mat,bone='body',ny=40,na=48,pointfn=None):
 vv=[];ff=[];uv=[]
 for j in range(ny):
  y=rows[0][0]+(rows[-1][0]-rows[0][0])*j/(ny-1);w,h,z=interp(rows,y)
  for k in range(na+1):
   a=2*pi*k/na;p=(w*cos(a),y,z+h*sin(a))if not pointfn else pointfn(y,a);vv.append(tuple(p));uv.append((j/(ny-1),k/na))
 for j in range(ny-1):
  for k in range(na):a=j*(na+1)+k;ff.append((a,a+1,a+na+2,a+na+1))
 ff.extend([tuple(reversed(range(na+1))),tuple((ny-1)*(na+1)+k for k in range(na+1))]);return mesh(name,vv,ff,mat,bone,uv=uv)
HEAD=[(-1.53,0,0,-.035),(-1.515,.15,.075,-.025),(-1.46,.37,.15,-.009),(-1.32,.52,.24,0),(-1.04,.62,.275,0),(-.73,.64,.27,0),(-.45,.625,.25,0),(-.28,.596,.225,0),(-.24,.54,.18,0)]
def hp(y,a):
 w,h,z=interp(HEAD,y);sn=sin(a);x=w*cos(a);height=h*sn**.63 if sn>=0 else .16*sn*min(1,w/.15)
 if sn>0:height+=.012*cos(x*10)*sn**3*min(1,w/.15)
 if sn<0:height+=.098*math.exp(-((x/.115)**4+((y+.90)/.18)**4))*max(0,-sn)**3
 return Vector((x,y,z+height))
head=loft('head_envelope_closed',HEAD,'head',ny=88,na=96,pointfn=hp)
# Complete dorsal shell and thin ventral sternites, not giant abdominal spheres.
for i,(y,w,h)in enumerate(segs):
 bn='segment%02d'%i;rows=[(y-.14,w*.97,h*.88,0),(y-.11,w,h,0),(y+.075,w*.98,h*.965,0),(y+.13,w*.944,h*.80,-.004)]
 def shellpoint(yy,a):
  ww,hh,zz=interp(rows,yy);ww+=.075*((yy-rows[0][0])/(rows[-1][0]-rows[0][0]))**3 if i==11 else 0;sn=sin(a);x=ww*cos(a);z=zz+hh*sn**.7 if sn>=0 else zz+.125*sn*(w/.64)**.6
  # Tapered posterolateral corners remain flush with the tergite outline.
  z+=.012*max(0,sn)**8;return(x,yy,z)
 o=loft('Opisthosomal tergite %02d'%(i+1),rows,'body',bn,ny=20,na=56,pointfn=shellpoint)
 # Small overlap zone is intentionally shell-like; no chain of inflated beads.
 if i<11:
  yy=y+.123
  membrane=loft('Intersegmental membrane %02d'%i,[(yy-.022,w*.925,h*.79,-.006),(yy+.04,w*.915,h*.78,-.006)],'joint',bn,ny=6,na=48)
  for vertex in membrane.data.vertices:
   if vertex.co.z<-.006:vertex.co.z=-.006+(vertex.co.z+.006)*(.108*(w/.64)**.6)/(h*.79)
  membrane.data.update()
 # Ventral broad opercular field remains inside lateral shell margin.
 if i<5:
  loft('Ventral operculum %02d'%i,[(y-.10,w*.025,.005,-.118),(y-.07,w*.76,.017,-.113),(y+.075,w*.78,.016,-.111),(y+.10,w*.05,.003,-.118)],'underside',bn,ny=18,na=36)
# Triangular non-stinging telson, broad at anterior lateral corners with a low dorsal keel.
telrows=[(2.44,.16,.046,0),(2.58,.26,.05,0),(2.74,.39,.047,-.013),(2.86,.35,.044,-.025),(3.15,.23,.031,-.043),(3.49,.005,.002,-.065)]
loft('Triangular keeled telson',telrows,'body','telson',ny=55,na=60)

def tube(name,points,radii,mat,bone,flat=1,n=14,steps=18):
 pts=[Vector(p)for p in points];vv=[];ff=[];uv=[]
 for j in range(steps):
  t=j/(steps-1);u=t*(len(pts)-1);k=min(len(pts)-2,int(u));q=u-k;c=pts[k].lerp(pts[k+1],q);direction=(pts[k+1]-pts[k]).normalized();side=direction.cross(Vector((0,0,1))).normalized();normal=side.cross(direction).normalized();rr=float(np.interp(t,np.linspace(0,1,len(radii)),radii))
  for a in range(n+1):ang=2*pi*a/n;vv.append(tuple(c+side*rr*cos(ang)+normal*rr*flat*sin(ang)));uv.append((t,a/n))
 for j in range(steps-1):
  for k in range(n):a=j*(n+1)+k;ff.append((a,a+1,a+n+2,a+n+1))
 ff.extend([tuple(reversed(range(n+1))),tuple((steps-1)*(n+1)+k for k in range(n+1))]);return mesh(name,vv,ff,mat,bone,uv=uv)
def podomere(name,a,b,ra,rb,bone,mat='legs',flat=.8):
 a=Vector(a);b=Vector(b);return tube(name,[a,a.lerp(b,.15),a.lerp(b,.84),b],[ra*.79,ra,rb,rb*.78],mat,bone,flat,n=22,steps=20)
# II–V four pairs of slender non-chelate walking limbs; VI is a distinct swimming paddle.
for (q,j),pts in legs.items():
 sign=1 if q=='L'else-1
 for k,(a,b)in enumerate(zip(pts,pts[1:])):
  bn='leg'+q+str(j)+'_'+str(k);a=Vector(a);b=Vector(b);r=.065-.014*k
  # Distinct cuticular podomere divisions, not sphere joints.
  mid=a.lerp(b,.52);podomere('Walking '+q+str(j)+' podomere '+str(k)+'a',a,mid,r,r*.90,bn)
  podomere('Walking '+q+str(j)+' podomere '+str(k)+'b',mid.lerp(b,.03),b,r*.89,r*.65,bn)
  if k<2:tube('Flexible walking articulation '+q+str(j)+str(k),[b-(b-a).normalized()*.034,b+(b-a).normalized()*.035],[r*.63,r*.60],'joint',bn,n=14,steps=5)
 tip=Vector(pts[-1]);tube('Terminal walking claw '+q+str(j),[tip,tip+Vector((sign*.055,-.055,-.033)),tip+Vector((sign*.065,-.085,-.066))],[.026,.019,.0008],'denticle','leg'+q+str(j)+'_2',n=14,steps=10)
for q,pts in paddles.items():
 sign=1 if q=='L'else-1
 for k in range(2):podomere('Swimming proximal '+q+str(k),pts[k],pts[k+1],.093-k*.018,.078-k*.016,'paddle'+q+str(k),flat=.57)
 # Expanded VI-7 / VI-8 surface, small terminal lobe. Closed cambered cuticle.
 origin=Vector(pts[2]);axis=Vector((sign*.61,.74,-.04));cross=Vector((-axis.y,axis.x,0)).normalized();vv=[];ff=[];uv=[];N=42;A=36
 for j in range(N):
  t=j/(N-1);cen=origin+axis*t;wid=np.interp(t,[0,.17,.36,.62,.82,1],[.052,.16,.235,.242,.18,.001]);th=.022*sin(pi*t)**.6+.008*(1-t)
  for k in range(A+1):a=2*pi*k/A;vv.append(tuple(cen+cross*wid*cos(a)+Vector((0,0,th*sin(a)))));uv.append((t,k/A))
 for j in range(N-1):
  for k in range(A):a=j*(A+1)+k;ff.append((a,a+1,a+A+2,a+A+1))
 ff.extend([tuple(reversed(range(A+1))),tuple((N-1)*(A+1)+k for k in range(A+1))]);mesh('Expanded swimming paddle '+q,vv,ff,'paddle','paddle'+q+'2',uv=uv)
# Large robust chelicerae are appendage I, not scorpion pedipalps.
for q,pts in claws.items():
 sign=1 if q=='L'else-1
 for k in range(2):podomere('Cheliceral stalk '+q+str(k),pts[k],pts[k+1],.074+.012*k,.082+.012*k,'chelicera'+q+str(k),flat=.80)
 bone='chelicera'+q+'2';base=Vector(pts[2]);podomere('Reinforced cheliceral manus '+q,base,(sign*.77,-2.42,.016),.113,.127,bone,flat=.77)
 fixed=[(sign*.80,-2.30,.015),(sign*.88,-2.56,.023),(sign*.87,-2.82,.017),(sign*.76,-3.15,.0),(sign*.685,-3.235,-.009)]
 free=[(sign*.58,-2.29,.008),(sign*.485,-2.54,.008),(sign*.48,-2.85,-.002),(sign*.515,-3.12,-.015),(sign*.60,-3.23,-.012)]
 tube('Fixed cheliceral ramus '+q,fixed,[.113,.085,.065,.035,.0015],'legs',bone,flat=.77,n=26,steps=48)
 tube('Moveable cheliceral ramus '+q,free,[.076,.062,.049,.030,.0015],'legs','finger'+q,flat=.78,n=26,steps=48)
 # Inclined principal denticles alternating with smaller teeth; no saw blade serrations.
 for freepart,curve,bn in [(False,fixed,bone),(True,free,'finger'+q)]:
  for j,t in enumerate([.24,.34,.43,.52,.62,.71,.80,.88]):
   u=t*(len(curve)-1);k=min(len(curve)-2,int(u));p=Vector(curve[k]).lerp(Vector(curve[k+1]),u-k);inner=sign*(1 if freepart else-1);size=[.085,.037,.113,.040,.073,.029,.060,.024][j];p.x+=inner*(.038 if freepart else .053);end=p+Vector((inner*size,-size*.25,0));tube(('Free'if freepart else'Fixed')+' denticle '+q+str(j),[p,p.lerp(end,.7)+Vector((0,-.004,.002)),end],[.027 if size>.06 else .015,.013 if size>.06 else .008,.001],'denticle',bn,flat=.76,n=14,steps=10)
# Ventral mouth is an actual recessed opening under prosoma, bounded by gnathobases/metastoma.
# Dorsal head underside is well above this oral vestibule; it is not a plate across the aperture.
vv=[];ff=[];uv=[];N=24;A=48
for j in range(N):
 t=j/(N-1);w=.112*(1-.72*t);h=.17*(1-.70*t);z=-.174+.094*t
 for k in range(A+1):a=2*pi*k/A;vv.append((w*cos(a),-.90+h*sin(a),z));uv.append((t,k/A))
for j in range(N-1):
 for k in range(A):a=j*(A+1)+k;ff.append((a,a+1,a+A+2,a+A+1))
ff.append(tuple((N-1)*(A+1)+k for k in range(A+1)));mesh('Recessed oral vestibule',vv,ff,'oral',uv=uv)
for sign in [1,-1]:
 q='L'if sign==1 else'R';podomere('Gnathobasic coxa '+q,(sign*.20,-.78,-.16),(sign*.105,-.88,-.187),.066,.043,'gnathobase'+q,'underside',flat=.55)
 for j in range(5):p=Vector((sign*.108,-.80-j*.031,-.19));tube('Gnathobasic tooth '+q+str(j),[p,p+Vector((-sign*.046,-.012,0))],[.013,.001],'denticle','gnathobase'+q,n=12,steps=6)
loft('Metastoma ventral plate',[(-.79,.058,.013,-.184),(-.73,.095,.023,-.18),(-.58,.080,.019,-.178),(-.50,.012,.007,-.172)],'underside',ny=28,na=36)
# Compound eye globes sit inside the real unpadded carapace; no decorative hoops.
eyes=[]
for sign in [1,-1]:
 y=-1.11;a=.46;surface=hp(y,a);normal=Vector((.64*sign,0,.768));center=surface.copy();center.x*=sign;center-=normal*.034
 basis=[Vector((0,1,0)),Vector((-.768*sign,0,.64)),normal];radii=(.152,.086,.068);vv=[];ff=[];uv=[]
 for j in range(33):
  lat=pi*j/32
  for k in range(64):ang=2*pi*k/64;vv.append(tuple(center+basis[0]*(radii[0]*sin(lat)*cos(ang))+basis[1]*(radii[1]*sin(lat)*sin(ang))+basis[2]*(radii[2]*cos(lat))));uv.append((k/64,j/32))
 for j in range(32):
  for k in range(64):a=j*64+k;ff.append((a,j*64+(k+1)%64,(j+1)*64+(k+1)%64,a+64))
 mesh('eye_globe_'+('L'if sign==1 else'R'),vv,ff,'eyes',uv=uv);eyes.append({'center':list(center),'radii':radii,'basis':[list(b)for b in basis]})
(H/'eyes.json').write_text(json.dumps(eyes,indent=2))
# Small median ocelli are flush dark lenses, distinct from the paired compound eyes.
for sign in [1,-1]:
 p=hp(-1.08,pi/2);p.x=sign*.032;tube('Median ocellus '+str(sign),[p-Vector((0,.008,.010)),p+Vector((0,.008,.000))],[.012,.011],'eyes','body',n=16,steps=6)
exec(compile((H/'materials.py').read_text(),str(H/'materials.py'),'exec'))
exec(compile((H/'motion.py').read_text(),str(H/'motion.py'),'exec'))
exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
