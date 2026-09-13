"""Independent Nahecaris stuertzi initial phyllocarid reconstruction in Blender."""
import bpy,bmesh,math,json,sys,hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
from math import sin,cos,pi
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/nahecaris';C=L/'initial-candidate';C.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
s=bpy.context.scene;s.render.fps=30;objects=[];M={}
for n,c,r in [('head',(.20,.115,.057),.43),('body',(.18,.092,.035),.46),('carapace',(.25,.138,.059),.38),('limbs',(.235,.157,.085),.45),('antenna',(.25,.136,.058),.43),('joint',(.08,.045,.021),.59),('setae',(.27,.185,.106),.55),('mandible',(.084,.042,.019),.4),('oral',(.088,.033,.027),.55),('eyes',(.005,.008,.005),.16)]:
 m=bpy.data.materials.new(n);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=r;m.diffuse_color=(*c,1);M[n]=m
spec=[('root',(0,0,0),None),('body',(0,-.30,0),'root')]
for i in range(7):spec.append(('abdomen'+str(i),(0,.43+i*.25,.10),'body'if i==0 else'abdomen'+str(i-1)))
spec.append(('telson',(0,2.16,.075),'abdomen6'))
limbs={}
for sign in [1,-1]:
 q='L'if sign==1 else'R';spec.extend([('valve'+q,(0,-.2,.42),'body'),('mandible'+q,(sign*.10,-1.24,-.045),'body'),('furca'+q,(sign*.06,2.20,.07),'telson')])
 for k in range(2):
  origin=(sign*(.105+.085*k),-1.48+.09*k,.085-.12*k);elbow=(sign*(.26+.17*k),-1.88+.02*k,.065-.19*k);spec.extend([('antenna'+str(k)+q,origin,'body'),('antennaTip'+str(k)+q,elbow,'antenna'+str(k)+q)])
 for j in range(8):
  y=-1.05+j*.185;size=1-j*.075;pts=[(sign*.18,y,-.035),(sign*.265,y-.02,-.34-.10*sin(pi*j/7)),(sign*(.22+.02*size),y-.15,-.28-.25*size)];limbs[q,j]=pts;spec.extend([('thoracopod'+q+str(j),pts[0],'body'),('endopod'+q+str(j),pts[1],'thoracopod'+q+str(j)),('exopod'+q+str(j),(sign*.18,y,-.035),'thoracopod'+q+str(j))])
 for j in range(5):spec.append(('pleopod'+q+str(j),(sign*.12,.62+j*.25,-.02),'abdomen'+str(min(6,j))))
arm=bpy.data.armatures.new('Nahecaris biramous limb skeleton');rig=bpy.data.objects.new('nahecaris_rig',arm);s.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,0,.3)if n=='root'else(0,.18,0))
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');exec(compile((H/'geometry.py').read_text(),str(H/'geometry.py'),'exec'))
HEAD=[(-1.69,0,0,.065),(-1.655,.075,.068,.064),(-1.50,.16,.143,.052),(-1.32,.218,.164,.035),(-1.10,.259,.17,.025),(-.73,.265,.174,.025),(-.45,.235,.153,.024)]
def hp(y,a):
 w,h,z=interp(HEAD,y);x=w*cos(a);zz=z+h*sin(a)
 if sin(a)<0:zz+=.083*math.exp(-((x/.083)**4+((y+1.265)/.115)**4))*max(0,-sin(a))**4
 return Vector((x,y,zz))
head=loft('head_envelope_closed',HEAD,'head',ny=76,na=72,pointfn=hp)
loft('Thorax beneath shield',[(-.80,.23,.145,0),(-.3,.235,.148,.01),(.2,.214,.135,.04),(.75,.16,.12,.07)],'body',ny=65,na=54)
# Seven abdominal rings are long enough to read, with the anterior ones partly under shield.
for i in range(7):
 y=.55+i*.25;w=.185-.015*i;h=.16-.011*i;bn='abdomen'+str(i);rows=[(y-.15,w*.93,h*.90,.075),(y-.105,w,h,.075),(y+.09,w*.94,h*.91,.075),(y+.12,w*.87,h*.80,.075)];loft('Abdominal somite '+str(i+1),rows,'body',bn,ny=18,na=40)
# Two deep valves, open ventrally, form a nearly trapezoidal section; closed thickness.
valverows=[(-1.27,.055,.31,-.09),(-1.12,.28,.41,-.24),(-.85,.48,.47,-.39),(-.45,.59,.49,-.46),(.02,.595,.48,-.43),(.43,.49,.43,-.31),(.70,.30,.33,-.12),(.80,.09,.19,.065)]
for sign in [1,-1]:
 q='L'if sign==1 else'R';vv=[];ff=[];uv=[];NY=76;NA=40
 for inner in [False,True]:
  for j in range(NY):
   y=valverows[0][0]+(valverows[-1][0]-valverows[0][0])*j/(NY-1);w,top,bot=interp(valverows,y)
   for k in range(NA+1):
    t=k/NA;x=w*(.08+.92*sin(pi*t/2)**.68);z=top*(1-t)+bot*t+.057*sin(pi*t);ridge=.018*math.exp(-((t-.42)/.065)**2)*sin(pi*j/(NY-1))
    x+=ridge
    if inner:x-=.012*sin(pi*t/2);z-=.012*(1-t)
    vv.append((sign*x,y,z));uv.append((j/(NY-1),t))
 off=NY*(NA+1)
 for j in range(NY-1):
  for k in range(NA):a=j*(NA+1)+k;ff.extend([(a,a+1,a+NA+2,a+NA+1),(off+a+NA+1,off+a+NA+2,off+a+1,off+a)])
 for j in range(NY-1):
  a=j*(NA+1);ff.append((a,a+NA+1,off+a+NA+1,off+a));a+=NA;ff.append((a,off+a,off+a+NA+1,a+NA+1))
 for k in range(NA):ff.append((k,off+k,off+k+1,k+1));a=(NY-1)*(NA+1)+k;ff.append((a,a+1,off+a+1,off+a))
 mesh('Bivalved carapace '+q,vv,ff,'carapace','valve'+q,uv=uv)
# Small dorsal plate and subdued rostral plate. No shrimp-like toothed rostrum.
loft('Median dorsal plate',[(-1.18,.034,.023,.369),(-.86,.045,.032,.472),(-.3,.049,.033,.494),(.30,.041,.027,.454),(.61,.006,.005,.358)],'carapace',ny=46,na=28)
loft('Rostral plate',[(-1.85,.003,.002,.196),(-1.65,.062,.017,.223),(-1.37,.097,.020,.246),(-1.13,.066,.019,.258)],'carapace',ny=40,na=30)
# Stout biramous second antennae and finer biflagellate antennules are anatomically separate.
for sign in [1,-1]:
 q='L'if sign==1 else'R'
 for k in range(2):
  origin=Vector((sign*(.105+.085*k),-1.48+.09*k,.085-.12*k));elbow=Vector((sign*(.26+.17*k),-1.88+.02*k,.065-.19*k));r=.025 if k==0 else .048;podomere(('Antennule'if k==0 else'Antenna II')+' peduncle '+q,origin,elbow,r,r*.82,'antenna'+str(k)+q,'antenna',flat=.85)
  for branch in range(2):
   end=Vector((sign*(.27+.29*branch+.20*k),-2.71+.22*k+.13*branch,-.015-.15*k-.045*branch));mid=elbow.lerp(end,.52)+Vector((sign*.10,0,-.025));tube(('Antennule'if k==0 else'Antenna II')+' ramus '+q+str(branch),[elbow,mid,end],[r*.76,r*.39,.003 if k==0 else .008],'antenna','antennaTip'+str(k)+q,flat=.73,n=16,steps=32)
   if k==1:
    for j in range(8):
     t=.20+j*.085;p=elbow.lerp(end,t)+Vector((sign*.07*sin(pi*t),0,-.012));tube('Antenna II fine seta '+q+str(branch)+str(j),[p,p+Vector((sign*.028,-.035,-.028))],[.004,.0007],'setae','antennaTip1'+q,n=6,steps=4)
# Eight biramous thoracopods. Posterior endopods shorten into an anteriorly open basket.
for (q,j),pts in limbs.items():
 sign=1 if q=='L'else-1;size=1-j*.075;stem='thoracopod'+q+str(j);en='endopod'+q+str(j);ex='exopod'+q+str(j);podomere('Thoracic stem '+q+str(j),pts[0],pts[1],.039,.03,stem,'limbs',flat=.62);podomere('Basket endopod '+q+str(j),pts[1],pts[2],.029,.009,en,'limbs',flat=.72)
 # Finger-like exopod lobes, not a modern shrimp's paddle with fin rays.
 y=pts[0][1];root=Vector(pts[0]);bend=Vector((sign*.25,y+.015,-.405-.15*sin(pi*j/7)));tip=bend+Vector((sign*(.31+.055*size),.095,-.035));tube('Exopod stem '+q+str(j),[root,bend,tip],[.026,.022,.014],'limbs',ex,flat=.52,n=14,steps=28)
 for branch in range(5):
  t=.23+branch*.15;p=bend.lerp(tip,t);length=.16*size*(.72+.28*sin(pi*t));end=p+Vector((sign*length*.35,.065+length*.30,-length));tube('Exopod finger lobe '+q+str(j)+'_'+str(branch),[p,p.lerp(end,.65)+Vector((0,.012,0)),end],[.014,.014,.0025],'limbs',ex,flat=.54,n=10,steps=12)
 for jset in range(5):
  p=Vector(pts[1]).lerp(Vector(pts[2]),.25+jset*.13);end=p+Vector((-sign*.065,-.022,-.018));tube('Basket medial seta '+q+str(j)+str(jset),[p,end],[.0037,.0006],'setae',en,n=6,steps=4)
# Modest paired abdominal paddles, positioned by the comparative archaeostracan arrangement.
for sign in [1,-1]:
 q='L'if sign==1 else'R'
 for j in range(5):
  p=Vector((sign*.12,.62+j*.25,-.02));end=p+Vector((sign*(.14-.01*j),.25,-.18));podomere('Pleopod stem '+q+str(j),p,end,.025,.012,'pleopod'+q+str(j),'limbs',flat=.6)
  for b in range(2):
   tip=end+Vector((sign*(.025+.055*b),.21,-.015));tube('Pleopod ramus '+q+str(j)+str(b),[end,end.lerp(tip,.5),tip],[.012,.036,.002],'limbs','pleopod'+q+str(j),flat=.24,n=14,steps=16)
   for k in range(5):
    a=end.lerp(tip,.25+k*.12);tube('Pleopod fringe '+q+str(j)+str(b)+str(k),[a,a+Vector((sign*.039,.035,-.023))],[.0038,.0006],'setae','pleopod'+q+str(j),n=6,steps=4)
# Long narrow telson and paired furcal rami, no eumalacostracan fan.
tube('Median telson',[(0,2.13,.075),(0,2.45,.054),(0,3.05,.018)],[.09,.065,.001],'body','telson',flat=.60,n=30,steps=48)
for sign in [1,-1]:
 q='L'if sign==1 else'R';tube('Furcal ramus '+q,[(sign*.067,2.21,.070),(sign*.18,2.51,.034),(sign*.35,3.16,-.036)],[.046,.055,.001],'body','furca'+q,flat=.48,n=24,steps=42)
# Mandibles flank a recessed ventral opening with soft lining, floor and roof.
vv=[];ff=[];uv=[];N=24;A=40
for j in range(N):
 t=j/(N-1);w=.074*(1-.70*t);h=.095*(1-.73*t);z=-.127+.077*t
 for k in range(A+1):a=2*pi*k/A;vv.append((w*cos(a),-1.265+h*sin(a),z));uv.append((t,k/A))
for j in range(N-1):
 for k in range(A):a=j*(A+1)+k;ff.append((a,a+1,a+A+2,a+A+1))
ff.append(tuple((N-1)*(A+1)+k for k in range(A+1)));mesh('Recessed mandibular oral vestibule',vv,ff,'oral',uv=uv)
for sign in [1,-1]:
 q='L'if sign==1 else'R';p=(sign*.12,-1.265,-.09);end=(sign*.052,-1.28,-.139);podomere('Mandible '+q,p,end,.040,.031,'mandible'+q,'mandible',flat=.60)
 for k in range(4):a=Vector((sign*.06,-1.32+k*.026,-.139));tube('Mandibular incisor '+q+str(k),[a,a+Vector((-sign*.022,-.003,-.002))],[.011,.001],'mandible','mandible'+q,n=10,steps=6)
 for j in range(2):podomere('Maxillary lobe '+q+str(j),(sign*.13,-1.10+j*.08,-.08),(sign*.05,-1.15+j*.075,-.19),.028,.012,'mandible'+q,'limbs',flat=.45)
# Conservative compact ocular bases lie beneath rostrum; exact preservation is uncertain.
eyes=[]
for sign in [1,-1]:
 cy=-1.445;a=.36;surface=hp(cy,a);surface.x*=sign;normal=Vector((.86*sign,0,.51)).normalized();center=surface-normal*.030;basis=[Vector((0,1,0)),Vector((-.51*sign,0,.86)).normalized(),normal];radii=(.076,.057,.056);vv=[];ff=[];uv=[]
 for j in range(29):
  lat=pi*j/28
  for k in range(56):ang=2*pi*k/56;vv.append(tuple(center+basis[0]*(radii[0]*sin(lat)*cos(ang))+basis[1]*(radii[1]*sin(lat)*sin(ang))+basis[2]*(radii[2]*cos(lat))));uv.append((k/56,j/28))
 for j in range(28):
  for k in range(56):a=j*56+k;ff.append((a,j*56+(k+1)%56,(j+1)*56+(k+1)%56,a+56))
 mesh('eye_globe_'+('L'if sign==1 else'R'),vv,ff,'eyes',uv=uv);eyes.append({'center':list(center),'radii':radii,'basis':[list(b)for b in basis]})
(H/'eyes.json').write_text(json.dumps(eyes,indent=2))
exec(compile((H/'materials.py').read_text(),str(H/'materials.py'),'exec'));exec(compile((H/'motion.py').read_text(),str(H/'motion.py'),'exec'));exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
