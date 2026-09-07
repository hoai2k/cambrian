"""Independent Manticoceras regulare shell + conservative editable soft-body model."""
import bpy,bmesh,math,json,sys
from pathlib import Path
import numpy as np
from mathutils import Vector,Matrix
from math import sin,cos,pi
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/manticoceras';C=L/'initial-candidate';C.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
s=bpy.context.scene;s.render.fps=30;objects=[];M={}
for n,c,r in [('shell',(.62,.49,.31),.38),('lining',(.40,.34,.245),.34),('body',(.105,.175,.16),.48),('arms',(.13,.215,.191),.48),('underside',(.225,.27,.218),.5),('oral',(.085,.042,.04),.54),('beak',(.025,.024,.019),.28),('eyes',(.003,.006,.006),.15)]:
 m=bpy.data.materials.new(n);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=r;m.diffuse_color=(*c,1);M[n]=m
# One rigid shell; only soft tissue, arms, funnel and beak articulate independently.
spec=[('root',(0,0,0),None),('body',(0,0,.30),'root'),('head',(0,-.57,-.13),'body'),('mantleL',(.21,-.54,-.15),'head'),('mantleR',(-.21,-.54,-.15),'head'),('funnel',(0,-.61,-.42),'head'),('funnelTip',(0,-.94,-.46),'funnel'),('beak_upper',(0,-1.40,.045),'head'),('beak_lower',(0,-1.41,-.025),'head')]
armcurves={}
for j in range(10):
 a=2*pi*j/10+.12;length=.56+.13*(.5+.5*sin(a+.6));x=.143*cos(a);z=.006+.136*sin(a)
 points=[Vector((x,-1.385,z)),Vector((x*1.48,-1.54-length*.20,z+sin(a)*.042)),Vector((x*1.9,-1.53-length*.58,z+sin(a)*.09)),Vector((x*1.85+cos(a+.2)*.06,-1.51-length*.86,z+sin(a)*.055-.035)),Vector((x*1.40+cos(a+.2)*.055,-1.46-length,z-.046))];armcurves[j]=points
 for k,t in enumerate([0,.28,.56,.80]):
  u=t*4;i=min(3,int(u));p=points[i].lerp(points[i+1],u-i);spec.append(('arm'+str(j)+'_'+str(k),tuple(p),'head'if k==0 else'arm'+str(j)+'_'+str(k-1)))
arm=bpy.data.armatures.new('Manticoceras rigid shell and soft-body skeleton');rig=bpy.data.objects.new('manticoceras_rig',arm);s.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,0,.25)if n=='root'else(0,.16,0))
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');exec(compile((H/'geometry.py').read_text(),str(H/'geometry.py'),'exec'))
# Compressed embracing planispiral whorls. The inner shell is a real body chamber,
# not a coloured aperture cap. No external suture ornament: septa are internal.
END=-.94;START=END-3.2*2*pi;B=math.log(2.65)/(2*pi);N=330;A=84
# Radial cross section is slightly taller dorsoventrally than an exact ellipse;
# outer venter narrowly rounds into flatter flanks. W/d~0.27 at final whorl.
def shellpoint(th,a,inner=False):
 r=math.exp(B*(th-END));radial=.53*r*cos(a);width=.315*r*sin(a)*(1-.13*cos(a));radial+=.005*r*cos(a)**3
 if inner:radial*=.942;width*=.943
 # Biconvex increments define growth lines; a restrained fine normal map refines them.
 wave=.006*(sin(2*a)-.42*sin(4*a));th+=wave
 return Vector((width,-(r+radial)*cos(th),.57+(r+radial)*sin(th)))
vv=[];ff=[];uv=[]
for j in range(N):
 th=START+(END-START)*j/(N-1)
 for k in range(A+1):a=2*pi*k/A;vv.append(tuple(shellpoint(th,a)));uv.append(((th-END)/(2*pi),k/A))
for j in range(N-1):
 for k in range(A):a=j*(A+1)+k;ff.append((a,a+1,a+A+2,a+A+1))
ff.append(tuple(reversed(range(A+1))));shell=mesh('Rigid living shell outer whorls',vv,ff,'shell',uv=uv)
# The posterior end is a recessed septum, well behind the mantle and aperture.
v=[];f=[];uv=[];IN=76
for j in range(IN):
 th=END-2.45+2.45*j/(IN-1)
 for k in range(A+1):a=2*pi*k/A;v.append(tuple(shellpoint(th,a,True)));uv.append((j/(IN-1),k/A))
for j in range(IN-1):
 for k in range(A):a=j*(A+1)+k;f.append((a+A+1,a+A+2,a+1,a))
f.append(tuple(range(A+1)));mesh('Hollow body chamber and posterior septum',v,f,'lining',uv=uv)
v=[];f=[];uv=[]
for j in range(5):
 t=j/4
 for k in range(A+1):a=2*pi*k/A;p=shellpoint(END,a).lerp(shellpoint(END,a,True),t);p+=Vector((0,-.004*sin(pi*t),.002*sin(pi*t)));v.append(tuple(p));uv.append((t,k/A))
for j in range(4):
 for k in range(A):a=j*(A+1)+k;f.append((a,a+1,a+A+2,a+A+1))
mesh('Thin rounded shell aperture lip',v,f,'shell',uv=uv)
# Compact head fits inside shell aperture, with a recessed closed mouth roof.
HEAD=[(-1.51,0,0,.006),(-1.488,.078,.073,.007),(-1.42,.172,.16,.007),(-1.26,.248,.215,-.022),(-1.07,.272,.228,-.055),(-.81,.255,.244,-.100),(-.58,.242,.260,-.150),(-.36,.155,.178,-.200),(-.20,0,0,-.225)]
def hp(y,a):
 w,h,z=interp(HEAD,y);x=w*cos(a);zz=z+h*sin(a);yy=y
 if y<-1.36:yy+=.115*math.exp(-((x/.083)**4+((zz-.006)/.080)**4))*min(1,(-y-1.36)/.09)
 return Vector((x,yy,zz))
head=loft('head_envelope_closed',HEAD,'body','head',ny=88,na=72,pointfn=hp)
# The mantle is a continuous recessed membrane, attached to head and shell wall.
# It is not a pair of ornamental rails on the outside of the aperture.
v=[];f=[];uv=[];weights=[];NM=20;AM=64
for j in range(NM):
 t=j/(NM-1)
 for k in range(AM+1):
  a=2*pi*k/AM;outer=shellpoint(END-.14,a,True);inner=Vector((.214*sin(a),-.52,-.17-.239*cos(a)));p=outer.lerp(inner,t);p.y+=.035*sin(pi*t);p.z-=.014*sin(pi*t);v.append(tuple(p));uv.append((t,k/AM));q='L'if sin(a)>=0 else'R';w=.24*(1-t);weights.append({'head':1-w,'mantle'+q:w})
for j in range(NM-1):
 for k in range(AM):a=j*(AM+1)+k;f.append((a,a+1,a+AM+2,a+AM+1))
mesh('Continuous recessed mantle membrane',v,f,'body',weights=weights,uv=uv)
# Tiny central protoconch closes the umbilical centre rather than a through-hole.
loft('Central embryonic shell',[(.0-.020,0,0,.57),(-.010,.013,.017,.57),(.0,.016,.020,.57),(.010,.013,.017,.57),(.020,0,0,.57)],'shell',ny=18,na=22)
# Ten similarly sized arms are a deliberately editable uncertain reconstruction.
for j,points in armcurves.items():
 vv=[];ff=[];uv=[];weights=[];NY=54;NA=20;rows=[(k/4,*p)for k,p in enumerate(points)]
 for i in range(NY):
  t=i/(NY-1);p=Vector(interp(rows,t));dt=.001;pre=Vector(interp(rows,max(0,t-dt)));post=Vector(interp(rows,min(1,t+dt)));direction=(post-pre).normalized();side=direction.cross(Vector((0,0,1))).normalized();normal=side.cross(direction).normalized();radius=.057*(1-t)**.80+.0016;u=t*3.3;k=min(2,int(u));q=min(1,u-k)
  for a in range(NA+1):ang=2*pi*a/NA;vv.append(tuple(p+side*radius*cos(ang)+normal*radius*.90*sin(ang)));uv.append((t,a/NA));weights.append({'arm'+str(j)+'_'+str(k):1-q,'arm'+str(j)+'_'+str(k+1):q})
 for i in range(NY-1):
  for k in range(NA):a=i*(NA+1)+k;ff.append((a,a+1,a+NA+2,a+NA+1))
 ff.extend([tuple(reversed(range(NA+1))),tuple((NY-1)*(NA+1)+k for k in range(NA+1))]);mesh('Soft arm '+str(j+1),vv,ff,'arms',weights=weights,uv=uv)
# A real funnel lumen; no imaginary fish fins. Its flexible aperture changes angle.
v=[];f=[];uv=[];weights=[];N=42;A=36
for layer in [0,1]:
 for j in range(N):
  t=j/(N-1);p=Vector((0,-.59-.55*t,-.40-.06*sin(pi*t)));rad=.105*(1-t)+.052*t-(.016 if layer else 0)
  for k in range(A+1):a=2*pi*k/A;v.append(tuple(p+Vector((rad*cos(a),0,rad*.72*sin(a)))));uv.append((t,k/A));q=max(0,min(1,(t-.4)/.35));weights.append({'funnel':1-q,'funnelTip':q})
off=N*(A+1)
for j in range(N-1):
 for k in range(A):a=j*(A+1)+k;f.extend([(a,a+1,a+A+2,a+A+1),(off+a+A+1,off+a+A+2,off+a+1,off+a)])
for k in range(A):a=(N-1)*(A+1)+k;f.append((a,a+1,off+a+1,off+a));f.append((k,off+k,off+k+1,k+1))
mesh('Flexible open hyponome funnel',v,f,'body',weights=weights,uv=uv)
# Recessed mouth with mantle tissue, a curved roof, and articulated small beaks.
v=[];f=[];uv=[];N=20;A=40
for j in range(N):
 t=j/(N-1);w=.079*(1-.8*t);h=.074*(1-.8*t);y=-1.486+.086*t
 for k in range(A+1):a=2*pi*k/A;v.append((w*cos(a),y,.006+h*sin(a)));uv.append((t,k/A))
for j in range(N-1):
 for k in range(A):a=j*(A+1)+k;f.append((a,a+1,a+A+2,a+A+1))
f.append(tuple((N-1)*(A+1)+k for k in range(A+1)));mesh('Buccal vestibule lining',v,f,'oral','head',uv=uv)
for sign in [1,-1]:
 q='upper'if sign==1 else'lower';points=[(0,-1.407,.006+sign*.037),(0,-1.458,.006+sign*.030),(0,-1.495,.006+sign*.004)];tube('Reconstructed '+q+' beak',points,[.040,.036,.006],'beak','beak_'+q,flat=.48,n=26,steps=28)
# Actual closed oval globes seat well inside the continuous head, with no pads/rings.
eyes=[]
for sign in [1,-1]:
 cy=-1.17;a=.27;surface=hp(cy,a);surface.x*=sign;normal=Vector((.94*sign,-.08,.33)).normalized();center=surface-normal*.039;side=Vector((0,1,.242)).normalized();side=(side-normal*side.dot(normal)).normalized();up=normal.cross(side).normalized();basis=[side,up,normal];radii=(.090,.076,.067);vv=[];ff=[];uv=[]
 for j in range(29):
  lat=pi*j/28
  for k in range(56):ang=2*pi*k/56;vv.append(tuple(center+basis[0]*(radii[0]*sin(lat)*cos(ang))+basis[1]*(radii[1]*sin(lat)*sin(ang))+basis[2]*(radii[2]*cos(lat))));uv.append((k/56,j/28))
 for j in range(28):
  for k in range(56):a=j*56+k;ff.append((a,j*56+(k+1)%56,(j+1)*56+(k+1)%56,a+56))
 mesh('eye_globe_'+('L'if sign==1 else'R'),vv,ff,'eyes','head',uv=uv);eyes.append({'center':list(center),'radii':radii,'basis':[list(b)for b in basis]})
(H/'eyes.json').write_text(json.dumps(eyes,indent=2))
exec(compile((H/'materials.py').read_text(),str(H/'materials.py'),'exec'))
# UVs remain per-corner, but coincident anatomical surface vertices must share
# smooth normals. Preserve the BMesh deform/colour layers while welding seams.
for o in objects:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
exec(compile((H/'motion.py').read_text(),str(H/'motion.py'),'exec'));exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
