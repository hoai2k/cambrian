"""Stethacanthus V2, independent Devonian-informed candidate. Never publishes assets."""
import bpy,bmesh,math,json,os,random
import numpy as np
from math import sin,cos,pi
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/stethacanthus/v2';O=L/'candidate';O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.fps=30
spec=[('root',(0,0,0),None),('body',(0,-.13,0),'root'),('skull',(0,-.75,.025),'body'),('jaw',(0,-.79,-.16),'skull'),('throat',(0,-.51,-.13),'body'),('tail_base',(0,.25,0),'body'),('tail_mid',(0,.81,0),'tail_base'),('tail_distal',(0,1.36,.015),'tail_mid'),('tail_tip',(0,1.94,.032),'tail_distal'),('caudal',(0,2.38,.065),'tail_tip'),('brush',(0,-.12,.34),'body'),('rear_dorsal',(0,1.34,.21),'tail_mid')]
for s in [-1,1]:
 side='L'if s>0 else'R';spec.extend([(f'pectoral_{side}',(s*.255,-.20,-.18),'body'),(f'pectoral_tip_{side}',(s*.66,.18,-.22),f'pectoral_{side}'),(f'whip_{side}',(s*.83,.57,-.20),f'pectoral_tip_{side}'),(f'whip_tip_{side}',(s*.90,1.19,-.20),f'whip_{side}'),(f'pelvic_{side}',(s*.172,.95,-.19),'tail_mid'),(f'gill_{side}',(s*.23,-.68,-.025),'skull')])
arm=bpy.data.armatures.new('Stethacanthus_anatomical_rig');rig=bpy.data.objects.new('Stethacanthus',arm);scene.collection.objects.link(rig);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.15,0));b.use_deform=n!='root'
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False);objects=[];M={};pix={}
for key,col,rough in [('body',(.20,.28,.30),.44),('snout',(.20,.28,.30),.44),('fin',(.17,.26,.29),.43),('brush',(.22,.28,.27),.44),('denticle',(.41,.38,.29),.39),('eye',(.004,.009,.011),.20),('oral',(.19,.065,.058),.43),('gill',(.16,.25,.26),.48),('tooth',(.62,.56,.42),.38)]:
 m=bpy.data.materials.new('Stethacanthus_'+key);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['IOR'].default_value=1.37;bs.inputs['Specular IOR Level'].default_value=.28;m.diffuse_color=(*col,1);M[key]=m
 if (H/(key+'-albedo.png')).exists():
  for su,inp in [('albedo','Base Color'),('normal','Normal'),('roughness','Roughness')]:
   im=bpy.data.images.load(str(H/(key+'-'+su+'.png')));im.pack();tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im
   if su!='albedo':im.colorspace_settings.name='Non-Color'
   else:pix[key]=(im.size[0],im.size[1],np.array(im.pixels[:]).reshape(im.size[1],im.size[0],4))
   if su=='normal':nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.48;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs[inp])
   else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[inp])
def cat(points,steps=4,closed=False):
 p=[np.array(q,float)for q in points];out=[]
 for j in range(len(p)if closed else len(p)-1):
  a=p[(j-1)%len(p)]if closed else p[max(0,j-1)];b=p[j];c=p[(j+1)%len(p)];d=p[(j+2)%len(p)]if closed else p[min(len(p)-1,j+2)]
  for k in range(steps):t=k/steps;out.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3))
 if not closed:out.append(p[-1])
 return out

def bodyuv(p):return((p[1]+1.67)/4.91,((math.atan2(p[2],p[0])+pi/2)/(2*pi))%1)
def mesh(n,v,f,ma='body',bone='body',weights=None,uvs=None,sub=0):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=[p for p in bm.faces if len(p.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);scene.collection.objects.link(o);o.parent=rig;objects.append(o);me.materials.append(M[ma]);uv=me.uv_layers.new(name='UVMap')
 for f in me.polygons:
  f.use_smooth=True;vals=[uvs[me.loops[li].vertex_index]if uvs else bodyuv(me.vertices[me.loops[li].vertex_index].co)for li in f.loop_indices]
  if not uvs and max(q[1]for q in vals)-min(q[1]for q in vals)>.5:vals=[(u,v+1 if v<.5 else v)for u,v in vals]
  for li,q in zip(f.loop_indices,vals):uv.data[li].uv=q
 weights=weights or[{bone:1}for p in v];gg={g:o.vertex_groups.new(name=g)for g in set(g for w in weights for g in w)}
 for i,w in enumerate(weights):
  total=sum(w.values())
  for g,a in w.items():
   if a>0:gg[g].add([i],a/total,'REPLACE')
 if sub:
  su=o.modifiers.new('Supported anatomical subdivision','SUBSURF');su.levels=sub;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=su.name)
 md=o.modifiers.new('Anatomical motion','ARMATURE');md.object=rig
 return o

def tailweights(y):
 rows=[(.04,'body'),(.49,'tail_base'),(.97,'tail_mid'),(1.55,'tail_distal'),(2.09,'tail_tip'),(2.58,'caudal')]
 if y<=rows[0][0]:return{'body':1}
 if y>=rows[-1][0]:return{'caudal':1}
 for (a,an),(b,bn)in zip(rows,rows[1:]):
  if a<=y<=b:t=(y-a)/(b-a);t=t*t*(3-2*t);return{an:1-t,bn:t}
# Deliberately short terminal head; lateral orbital region has real tissue volume.
controls=[(-1.64,.132,.065,-.095),(-1.61,.175,.102,-.128),(-1.52,.222,.180,-.176),(-1.35,.270,.258,-.225),(-1.12,.302,.306,-.274),(-.87,.327,.345,-.307),(-.56,.348,.377,-.322),(-.23,.350,.383,-.309),(.14,.317,.350,-.281),(.52,.270,.294,-.237),(.94,.212,.238,-.194),(1.35,.150,.184,-.145),(1.75,.092,.135,-.084),(2.10,.050,.100,-.029),(2.40,.037,.103,.017),(2.63,.022,.142,.092),(2.76,.003,.181,.174)]
rows=cat(controls,6);N=112;v=[]
for y,rx,top,bot in rows:
 for k in range(N):
  a=2*pi*k/N;sn=sin(a);xx=rx*cos(a);zz=(top+bot)/2+(top-bot)/2*sn
  # integrated very shallow orbital brow, part of closed head not a pad.
  xx*=1+.026*math.exp(-((y+1.33)/.14)**2-((zz-.205)/.060)**2)
  v.append((xx,y,zz))
f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(rows)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(rows)-1)*N+k for k in range(N))]);head=mesh('head_body_envelope_closed',v,f,sub=1);head['anatomyRole']='continuous_closed_cranial_and_trunk_envelope'
# A curved negative oral volume creates actual inner surfaces in the head.
# No exterior cap remains behind this mouth; the curved pharynx terminates deeply.
cv=[];cu=[];cn=80;oralrows=cat([(-1.77,.181,.037,-.027),(-1.65,.178,.035,-.025),(-1.54,.183,.065,-.060),(-1.36,.198,.107,-.091),(-1.14,.198,.135,-.107),(-.92,.171,.131,-.106),(-.73,.132,.111,-.089),(-.59,.083,.087,-.061),(-.49,.033,.051,-.027),(-.455,.002,.014,.010)],5)
for j,(y,rx,top,bot)in enumerate(oralrows):
 for k in range(cn):a=2*pi*k/cn;fold=.002*sin(j*1.12)*sin(pi*j/(len(oralrows)-1));cv.append(((rx+fold)*cos(a),y,(top+bot)/2+((top-bot)/2+fold)*sin(a)));cu.append((k/cn,j/(len(oralrows)-1)))
cf=[(j*cn+k,j*cn+(k+1)%cn,(j+1)*cn+(k+1)%cn,(j+1)*cn+k)for j in range(len(oralrows)-1)for k in range(cn)];cf.extend([tuple(range(cn-1,-1,-1)),tuple((len(oralrows)-1)*cn+k for k in range(cn))]);cut=mesh('oral_negative',cv,cf,'oral',uvs=cu);head.data.materials.append(M['oral']);cut.data.materials.clear();cut.data.materials.append(M['body']);cut.data.materials.append(M['oral'])
for f in cut.data.polygons:f.material_index=1
bo=head.modifiers.new('Sculpted palate cheeks floor pharynx','BOOLEAN');bo.operation='DIFFERENCE';bo.solver='EXACT';bo.object=cut;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=bo.name);bpy.ops.object.modifier_apply(modifier=bo.name);objects.remove(cut);bpy.data.objects.remove(cut,do_unlink=True)
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
# True paired branchial clefts are sculpted into the continuous head/body.
# Curved long cavities replace the V1 surface cords and avoid painted pixel strips.
head.data.materials.append(M['gill'])
for side in [-1,1]:
 for gi,gy in enumerate([-.88,-.765,-.65,-.535,-.42]):
  vv=[];uu=[];nr=32;rr=25
  for j in range(rr):
   t=-1+2*j/(rr-1);sn=[.46,.53,.56,.52,.45][gi]*t-.055;y=gy+.013*t+.040*(1-t*t);rx=float(np.interp(y,[c[0]for c in controls],[c[1]for c in controls]));top=float(np.interp(y,[c[0]for c in controls],[c[2]for c in controls]));bot=float(np.interp(y,[c[0]for c in controls],[c[3]for c in controls]));z=(top+bot)/2+(top-bot)/2*sn;xx=side*(rx*math.sqrt(1-sn*sn)+.022);rrx=.035*math.sqrt(max(.0001,1-t*t));rry=.014*math.sqrt(max(.0001,1-t*t))
   for k in range(nr):a=2*pi*k/nr;vv.append((xx+rrx*cos(a),y+rry*sin(a),z));uu.append((k/nr,j/(rr-1)))
  ff=[(j*nr+k,j*nr+(k+1)%nr,(j+1)*nr+(k+1)%nr,(j+1)*nr+k)for j in range(rr-1)for k in range(nr)];ff.extend([tuple(range(nr-1,-1,-1)),tuple((rr-1)*nr+k for k in range(nr))]);cut=mesh('temporary_branchial_negative',vv,ff,'oral',uvs=uu);cut.data.materials.clear();cut.data.materials.append(M['body']);cut.data.materials.append(M['oral']);cut.data.materials.append(M['gill'])
  for f in cut.data.polygons:f.material_index=2
  bo=head.modifiers.new('Recessed branchial cleft','BOOLEAN');bo.operation='DIFFERENCE';bo.solver='EXACT';bo.object=cut;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=bo.name);bpy.ops.object.modifier_apply(modifier=bo.name);objects.remove(cut);bpy.data.objects.remove(cut,do_unlink=True)
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
# Explicitly re-author every weight after the cavity Boolean.
head.vertex_groups.clear()
for n,_,_ in spec:
 if n!='root':head.vertex_groups.new(name=n)
for vert in head.data.vertices:
 p=vert.co;y=p.y
 if y<-.74:
  # A living commissure blends upper and lower jaw around their actual hinge.
  opening_z=float(np.interp(y,[-1.65,-1.36,-1.14,-.92,-.74],[.005,.008,.014,.013,.011]));lower=max(0,min(1,(opening_z+.025-p.z)/.055));jaww=lower*max(0,min(1,(-y-.74)/.22));w={'skull':1-jaww,'jaw':jaww}
 elif y<-.35:
  t=max(0,min(1,(y+.74)/.39));t=t*t*(3-2*t);w={'skull':1-t,'body':t}
 else:w=tailweights(y)
 for g,a in w.items():
  if a>0:head.vertex_groups[g].add([vert.index],a,'REPLACE')
oral_ids=set();gill_ids=set();skin_ids=set()
for face in head.data.polygons:
 (oral_ids if face.material_index==1 else gill_ids if face.material_index==2 else skin_ids).update(face.vertices)
for ids,bone,amount in [(oral_ids-skin_ids,'throat',.22),(gill_ids-skin_ids,'gill_L',.18)]:
 for vi in ids:
  vert=head.data.vertices[vi];p=vert.co
  if bone=='throat':
   if p.y<-.83:continue
   factor=amount*sin(pi*max(0,min(1,(p.y+.83)/.40)))**2;target=bone
  else:factor=amount;target='gill_L'if p.x>0 else'gill_R'
  existing=[(head.vertex_groups[g.group].name,g.weight)for g in vert.groups]
  for n,w in existing:head.vertex_groups[n].add([vi],w*(1-factor),'REPLACE')
  head.vertex_groups[target].add([vi],factor,'ADD')
uv=head.data.uv_layers.active
head.data.materials.append(M['snout'])
for f in head.data.polygons:
 if f.material_index==0 and f.center.y< -1.535 and f.normal.y<-.55:f.material_index=3
 vals=[]
 for li in f.loop_indices:
  p=head.data.vertices[head.data.loops[li].vertex_index].co
  if f.material_index==1:q=((math.atan2(p.z,p.x)/(2*pi))%1,(p.y+1.77)/1.315)
  elif f.material_index==3:q=(.5+p.x/.56,.5+p.z/.62)
  else:q=bodyuv(p)
  vals.append(q)
 if max(q[0]for q in vals)-min(q[0]for q in vals)>.5 and f.material_index==1:vals=[(u+1 if u<.5 else u,v)for u,v in vals]
 if max(q[1]for q in vals)-min(q[1]for q in vals)>.5 and f.material_index==0:vals=[(u,v+1 if v<.5 else v)for u,v in vals]
 for li,q in zip(f.loop_indices,vals):uv.data[li].uv=q
# A crisp tissue/material boundary prevents exterior normals from smearing
# across the concave palate at the oral and branchial apertures.
edgemats={}
for face in head.data.polygons:
 for ek in face.edge_keys:edgemats.setdefault(tuple(sorted(ek)),set()).add(face.material_index)
for edge in head.data.edges:
 mats=edgemats.get(tuple(sorted(edge.vertices)),set())
 if 1 in mats and len(mats)>1:edge.use_edge_sharp=True
# A tapered tube helper for fine tissue-supported appendages and denticles.
def taper(n,points,r,ma='denticle',bone='skull',N=10,weights=None):
 pts=cat(points,4);vv=[];ww=[];uu=[]
 for j,p in enumerate(pts):
  t=j/(len(pts)-1);q=Vector(p);tan=Vector(pts[min(j+1,len(pts)-1)])-Vector(pts[max(0,j-1)]);tan.normalize();a=tan.cross(Vector((1,0,0)))
  if a.length<.01:a=tan.cross(Vector((0,0,1)))
  a.normalize();b=tan.cross(a);rad=r*(1-t)**.68+.00055
  for k in range(N):vv.append(tuple(q+rad*(a*cos(2*pi*k/N)+b*sin(2*pi*k/N))));uu.append((k/N,t));ww.append(weights(t)if weights else{bone:1})
 ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(pts)-1)for k in range(N)];ff.extend([tuple(range(N-1,-1,-1)),tuple((len(pts)-1)*N+k for k in range(N))]);return mesh(n,vv,ff,ma,bone,ww,uu)
# Curved paired fins have thick supported roots and thin supple trailing margins.
def paired_fin(side,kind,sections):
 bone=kind+'_'+('L'if side>0 else'R');vv=[];ww=[];uu=[];nr=48;rows=cat(sections,6)
 for j,(x,front,back,z,th)in enumerate(rows):
  for k in range(nr):
   a=2*pi*k/nr;u=.5-.5*cos(a);y=front+(back-front)*u;vv.append((side*x,y,z+th*sin(a)+.066*sin(pi*u)*sin(pi*.78*j/(len(rows)-1))*min(1,(back-front)/.60)));uu.append((u,j/(len(rows)-1)))
   t=max(0,min(1,(x-(.26 if kind=='pectoral'else.15))/(.22 if kind=='pectoral'else.10)));tip=max(0,min(1,(x-.64)/.27))if kind=='pectoral'else 0;w={'body'if kind=='pectoral'else'tail_mid':1-t,bone:t*(1-tip)}
   if tip:w['pectoral_tip_'+('L'if side>0 else'R')]=t*tip
   ww.append(w)
 ff=[(j*nr+k,j*nr+(k+1)%nr,(j+1)*nr+(k+1)%nr,(j+1)*nr+k)for j in range(len(rows)-1)for k in range(nr)];ff.extend([tuple(range(nr-1,-1,-1)),tuple((len(rows)-1)*nr+k for k in range(nr))]);mesh(kind+'_fin_'+str(side),vv,ff,'fin',bone,ww,uu,sub=1)
for s in [-1,1]:
 paired_fin(s,'pectoral',[(.22,-.35,.37,-.19,.055),(.32,-.29,.47,-.215,.043),(.46,-.16,.61,-.24,.029),(.64,.035,.70,-.265,.019),(.82,.27,.72,-.25,.010),(.94,.51,.67,-.217,.004),(.964,.605,.634,-.210,.001)])
 paired_fin(s,'pelvic',[(.135,.82,1.24,-.195,.035),(.22,.87,1.38,-.214,.025),(.35,1.02,1.43,-.229,.013),(.46,1.24,1.40,-.22,.004),(.478,1.345,1.37,-.21,.001)])
 side='L'if s>0 else'R'
 def whipweights(t):return{'pectoral_tip_'+side:max(0,1-t*5),'whip_'+side:max(0,1-abs(t-.42)/.42),'whip_tip_'+side:max(0,(t-.35)/.65)}
 taper('metapterygial_extension_'+side,[(s*.88,.61,-.219),(s*.96,.92,-.212),(s*.977,1.25,-.201),(s*.944,1.55,-.183),(s*.874,1.79,-.158)],.025,'fin','whip_'+side,N=16,weights=whipweights)
# Spine-brush with convex lateral walls, rounded crown and a broad integrated root.
vv=[];uu=[];ww=[];bn=72;brushrows=cat([(.328,-.27,.185,.042),(.37,-.275,.18,.065),(.44,-.27,.22,.075),(.58,-.245,.32,.089),(.79,-.21,.465,.127),(.97,-.18,.61,.150),(1.045,-.202,.697,.224),(1.090,-.224,.745,.273),(1.118,-.218,.739,.279),(1.13,-.185,.711,.258)],5)
for j,(z,front,back,rx)in enumerate(brushrows):
 for k in range(bn):
  a=2*pi*k/bn;yy=(front+back)/2+(back-front)/2*cos(a);xx=rx*sin(a);vv.append((xx,yy,z));uu.append((k/bn,j/(len(brushrows)-1)));w=max(0,min(1,(z-.34)/.14));ww.append({'body':1-w,'brush':w})
ff=[(j*bn+k,j*bn+(k+1)%bn,(j+1)*bn+(k+1)%bn,(j+1)*bn+k)for j in range(len(brushrows)-1)for k in range(bn)];ff.extend([tuple(range(bn-1,-1,-1)),tuple((len(brushrows)-1)*bn+k for k in range(bn))]);brush=mesh('spine_brush_tissue_envelope',vv,ff,'brush','brush',ww,uu,sub=1)
# Leading spine is integrated into the brush wall, a modest curved ridge.
taper('brush_anterior_spine',[(0,-.274,.34),(0,-.28,.46),(0,-.254,.65),(0,-.207,.88),(0,-.178,1.066)],.026,'denticle','brush',N=16,weights=lambda t:{'body':max(0,1-t*6),'brush':min(1,t*6)})
# Heterogeneous dermal crown teeth, forward orientation; no mechanical grid.
rng=random.Random(8913)
for i in range(96):
 y=rng.uniform(-.17,.71);x=rng.uniform(-.265,.265)
 if (x/.264)**2+((y-.276)/.441)**2>.91:continue
 size=rng.uniform(.030,.068)*(1-.28*abs(x)/.265);z=1.127+.006*(1-(x/.265)**2);taper('brush_dermal_denticle_%03d'%i,[(x,y,z),(x*.98,y-size*.45,z+size*.48),(x*.96,y-size*.91,z+size*.69)],size*.23,'denticle','brush',N=10)
# Smaller overlapping backward-directed cranial denticles concentrated dorsally.
for i in range(125):
 y=rng.uniform(-1.43,-.85);a=rng.uniform(.83,2.31);rx=float(np.interp(y,[c[0]for c in controls],[c[1]for c in controls]));top=float(np.interp(y,[c[0]for c in controls],[c[2]for c in controls]));bot=float(np.interp(y,[c[0]for c in controls],[c[3]for c in controls]));x=rx*cos(a);z=(top+bot)/2+(top-bot)/2*sin(a);size=rng.uniform(.020,.043)*(1-.25*abs(a-pi/2));taper('cranial_dermal_denticle_%03d'%i,[(x,y,z-.002),(x,y+size*.40,z+size*.38),(x*.97,y+size*.97,z+size*.50)],size*.27)
# Low spineless posterior dorsal and a caudal with nearly balanced external lobes.
def median_fin(n,sections,bone):
 rows=cat(sections,6);vv=[];ww=[];uu=[];nr=48
 for j,(z,front,back,th)in enumerate(rows):
  for k in range(nr):
   a=2*pi*k/nr;u=.5-.5*cos(a);y=front+(back-front)*u;vv.append((th*sin(a)+.014*sin(pi*u)*sin(pi*j/(len(rows)-1))*min(1,(back-front)/.36),y,z+(float(np.interp(y,[c[0]for c in controls],[c[2]for c in controls]))-.178)*max(0,1-(z-.16)/.13) if bone=='rear_dorsal' else z));uu.append((u,j/(len(rows)-1)));weight=tailweights(y)
   if bone!='caudal':
    localback=float(np.interp(y,[c[0]for c in controls],[c[2]for c in controls]));factor=max(0,min(1,(vv[-1][2]-localback+.012)/.18));factor=factor*factor*(3-2*factor);weight={b:w*(1-factor)for b,w in weight.items()};weight['rear_dorsal']=factor
   ww.append(weight)
 ff=[(j*nr+k,j*nr+(k+1)%nr,(j+1)*nr+(k+1)%nr,(j+1)*nr+k)for j in range(len(rows)-1)for k in range(nr)];ff.extend([tuple(range(nr-1,-1,-1)),tuple((len(rows)-1)*nr+k for k in range(nr))]);mesh(n,vv,ff,'fin',bone,ww,uu,sub=1)
median_fin('posterior_spineless_dorsal',[(.16,1.05,1.93,.031),(.23,1.11,1.88,.034),(.35,1.26,1.75,.023),(.48,1.45,1.62,.012),(.505,1.505,1.58,.003)],'rear_dorsal')
median_fin('epicercal_balanced_caudal',[(-.53,3.10,3.145,.002),(-.50,2.97,3.19,.005),(-.37,2.80,3.15,.014),(-.20,2.57,2.99,.024),(-.025,2.36,2.83,.040),(.12,2.41,2.88,.041),(.29,2.61,3.065,.029),(.47,2.82,3.22,.016),(.63,3.08,3.26,.007),(.666,3.195,3.24,.001)],'caudal')
# Deeply embedded closed ellipsoidal globes; visible iris is a shallow dark cap.
tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[p.vertices for p in head.data.polygons]);samples=np.random.default_rng(8988).uniform(-1,1,(45000,3));samples=samples[(samples*samples).sum(1)<=1];eye_evidence=[]
for s in [-1,1]:
 side='L'if s>0 else'R';surface,normal,_,_=tree.find_nearest(Vector((s*.28,-1.325,.145)));normal*=1 if normal.x*s>0 else-1;u=Vector((0,1,0));u=(u-normal*u.dot(normal)).normalized();up=normal.cross(u).normalized();rad=(.078,.100,.085);depth=.035
 while True:
  center=surface-normal*depth;inside=0
  for a,b,c in samples:
   p=center+normal*(a*rad[0])+u*(b*rad[1])+up*(c*rad[2]);q,no,_,_=tree.find_nearest(p);inside+=(p-q).dot(no)<0
  ratio=inside/len(samples)
  if ratio>=.79:break
  depth+=.002
 vv=[tuple(center+normal*rad[0])];uvv=[(.5,0)];ns=64;nt=40
 for j in range(1,nt):
  la=pi*j/nt
  for k in range(ns):a=2*pi*k/ns;vv.append(tuple(center+normal*(rad[0]*cos(la))+u*(rad[1]*sin(la)*cos(a))+up*(rad[2]*sin(la)*sin(a))));uvv.append((k/ns,j/nt))
 vv.append(tuple(center-normal*rad[0]));uvv.append((.5,1));ff=[]
 for k in range(ns):ff.append((0,1+k,1+(k+1)%ns))
 for j in range(nt-2):
  for k in range(ns):ff.append((1+j*ns+k,1+(j+1)*ns+k,1+(j+1)*ns+(k+1)%ns,1+j*ns+(k+1)%ns))
 for k in range(ns):ff.append((len(vv)-1,1+(nt-2)*ns+(k+1)%ns,1+(nt-2)*ns+k))
 mesh('eye_globe_'+side,vv,ff,'eye','skull',uvs=uvv);eye_evidence.append({'name':'eye_globe_'+side,'closedEnvelope':head.name,'centerBlender':list(center),'radii':rad,'surfaceInwardDepth':depth,'sourceVolumeFraction':ratio,'samples':len(samples),'method':'Uniform solid ellipsoid samples tested against nearest oriented actual head surface; independent exported polyhedron audit required.'})
# Small five-cusped grasping teeth follow the real mouth margin, not a modern shark saw.
for lower in [False,True]:
 bone='jaw'if lower else'skull';sign=1 if lower else-1
 for i in range(9):
  x=-.145+i*.290/8;y=-1.633+.20*(abs(x)/.145)**2;z=-.027 if lower else .034
  size=.027*(.78+.22*sin(pi*i/8))
  for j,scale in [(-2,.67),(-1,.35),(0,1),(1,.35),(2,.67)]:
   xx=x+j*.006;taper(('lower'if lower else'upper')+'_cladodont_%02d_%d'%(i,j),[(xx,y,z),(xx,y+.006,z+sign*size*scale*.54),(xx,y+.011,z+sign*size*scale)],.0044 if j==0 else.0028,'tooth',bone,N=8)
# Consolidate related fine geometry without sacrificing named head/eye volumes.
for prefix,outname in [('cranial_dermal','cranial_denticle_field'),('brush_dermal','brush_crown_denticle_field'),('upper_cladodont','upper_cladodont_dentition'),('lower_cladodont','lower_cladodont_dentition'),('branchial_cleft','branchial_recess_lining')]:
 parts=[o for o in objects if o.name.startswith(prefix)]
 if len(parts)>1:
  bpy.ops.object.select_all(action='DESELECT')
  for o in parts:o.select_set(True);objects.remove(o)
  bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=outname;objects.append(o)
# UV pigmentation is separately baked in linear space for texture-free LOD.
for o in objects:
 me=o.data;vc=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');bc=me.color_attributes.new(name='BakedPigment',type='FLOAT_COLOR',domain='POINT');colors=np.zeros((len(me.vertices),3));counts=np.zeros(len(me.vertices))
 for f in me.polygons:
  ma=me.materials[f.material_index];key=ma.name.removeprefix('Stethacanthus_');W,T,pp=pix[key]
  for li in f.loop_indices:
   vi=me.loops[li].vertex_index;u,v=me.uv_layers.active.data[li].uv;colors[vi]+=pp[min(T-1,int((v%1)*(T-1))),min(W-1,int((u%1)*(W-1))),:3];counts[vi]+=1
 for i in range(len(me.vertices)):
  vc.data[i].color=(1,1,1,1);rgb=colors[i]/max(1,counts[i]);rgb=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4);bc.data[i].color=(*rgb,1)
anchors=[('anchor_mouth','jaw',(0,-1.642,-.033),'mouth'),('anchor_mouth_inside','skull',(0,-1.06,.012),'swallow'),('anchor_attack_primary','skull',(0,-1.648,.031),'attack')]
for n,b,p,role in anchors:
 o=bpy.data.objects.new(n,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=b;o.matrix_parent_inverse=rig.pose.bones[b].matrix.inverted();o.location=Vector(p)-Vector((0,.15,0));o['cambrianAnchor']={'version':1,'role':role,'parentBone':b}
(H/'anchors.json').write_text(json.dumps({'stethacanthus':[{'name':n,'bone':b,'point':list(p),'role':r}for n,b,p,r in anchors]},indent=2)+'\n');(H/'eyes-v2.json').write_text(json.dumps(eye_evidence,indent=2)+'\n')
CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':11/30,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5};LOOPS=['Idle','Swim','Guard','Eat']
def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
def pulse(t,a,b,c):return ease((t-a)/(b-a))if t<=b else 1-ease((t-b)/(c-b))
rig.animation_data_create()
for name,dur in CLIPS.items():
 act=bpy.data.actions.new(name);act.use_fake_user=True;rig.animation_data.action=act;F=round(dur*30)
 for frame in range(F+1):
  t=frame/F;ph=2*pi*t;env=sin(pi*t)**2
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  def rot(n,x=0,y=0,z=0):rig.pose.bones[n].rotation_euler=(x,y,z)
  def wave(amp,phase,en=1):
   for j,b in enumerate(['tail_base','tail_mid','tail_distal','tail_tip','caudal']):rot(b,z=amp*(.27+.18*j)*sin(phase-.78*j)*en,x=.022*sin(phase-.65*j)*en)
  # Fin bases and tips react at different phases; whips follow the fin skeleton.
  phase=ph*(2 if name=='Swim'else 1);energy=1 if name in LOOPS else env;opening=0;bank=0;flare=0;sweep=0
  if name=='Idle':wave(.115,ph);rot('body',z=.012*sin(ph+.6),x=.012*sin(ph));opening=.030*(.5-.5*cos(ph*2))
  elif name=='Swim':
   phase=ph*2+.40*sin(ph*2);effort=.66+.34*(.5+.5*cos(ph))**2;wave(.285,phase,effort);rot('body',z=-.033*sin(phase-.3),y=.020*sin(phase+.5));opening=.027*(.5-.5*cos(ph*3));sweep=.035*sin(phase+.8)
  elif name=='Guard':wave(.16,ph);rot('body',x=-.035*(1-cos(ph)),y=.045*sin(ph));flare=.09*(1-cos(ph));opening=.044*(.5-.5*cos(ph*2))
  elif name=='Eat':
   wave(.10,ph*2);opening=.30*(.5-.5*cos(ph*3))**1.6*(.72+.28*cos(ph)**2);rot('body',x=-.04*(1-cos(ph)),z=.020*sin(ph));rot('skull',x=-opening*.18);flare=.035*(1-cos(ph));rig.pose.bones['throat'].rotation_euler.x=opening*.08
  else:
   wave(.20,ph,env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft'else-1;turn=pulse(t,.01,.37,.98);bank=-s*.27*turn;rot('body',z=s*.38*turn,y=bank);rot('tail_base',z=-s*.23*turn);rot('tail_mid',z=-s*.30*pulse(t,.04,.45,.94));rot('tail_distal',z=s*.25*pulse(t,.14,.58,1));rot('caudal',z=s*.39*pulse(t,.22,.67,1));sweep=-s*.10*turn
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive'else-1;q=pulse(t,0,.38,1);rot('body',x=s*.26*q);wave(.25,ph+.22,env);rot('caudal',x=-s*.19*pulse(t,.03,.25,.90),z=.23*sin(ph-2)*env);flare=-s*.17*q;sweep=s*.065*q
   elif name=='Bite':
    opening=.43*pulse(t,.03,.30,.72);rot('skull',x=-.10*pulse(t,.02,.25,.76));rot('body',x=.03*pulse(t,.48,.63,1));sweep=.05*pulse(t,.20,.48,.82);wave(.14,ph+.3,env)
   elif name=='Attack':
    coil=pulse(t,0,.23,.49);strike=pulse(t,.25,.46,.90);opening=.46*pulse(t,.10,.34,.59);rot('body',x=-.09*coil+.065*strike,z=-.045*coil+.035*strike);rig.pose.bones['body'].location.y=.11*coil-.31*strike;rot('skull',x=-opening*.23);wave(.34,ph+1.1*strike,env);sweep=.11*coil-.12*strike;flare=-.06*strike
   elif name=='Heavy':
    coil=pulse(t,.01,.24,.47);surge=pulse(t,.30,.54,.95);opening=.50*pulse(t,.15,.38,.69);bank=.14*pulse(t,.06,.37,.85);rot('body',x=-.13*coil+.115*surge,y=bank,z=-.12*coil+.10*surge);rig.pose.bones['body'].location.y=.15*coil-.36*surge;rot('skull',x=-opening*.22);wave(.40,ph+1.50*surge,env);flare=.10*coil-.08*surge;sweep=.12*coil-.13*surge
   elif name=='Parry':
    q=pulse(t,0,.24,1);bank=.32*q;rot('body',y=bank,z=-.25*q,x=.045*q);rot('tail_base',z=.22*q);rot('tail_mid',z=.27*pulse(t,.07,.44,.96));rot('caudal',z=-.31*pulse(t,.13,.59,1));flare=.12*q
   elif name=='Dodge':
    q=pulse(t,0,.30,1);bank=-.44*q;rot('body',y=bank,z=.33*q);rig.pose.bones['body'].location.x=.32*q;rot('tail_base',z=-.37*q);rot('tail_mid',z=-.33*pulse(t,.04,.40,.94));rot('tail_distal',z=.32*pulse(t,.14,.55,1));rot('caudal',z=.44*pulse(t,.22,.67,1));sweep=.10*q
   elif name=='Hit':
    shock=sin(3*pi*t)*env;rot('body',z=.20*shock,y=.13*env,x=.045*shock);opening=.12*pulse(t,.05,.30,.74);wave(.31,ph*1.2,env);flare=.10*env
   elif name=='Stagger':
    shock=sin(5*pi*t)*env;bank=.22*shock;rot('body',y=bank,z=.19*sin(3*pi*t)*env,x=.08*sin(ph)*env);wave(.36,ph*1.7,env);opening=.14*env;flare=.16*sin(ph)*env
   elif name=='Ability':
    display=pulse(t,.05,.34,.88);bank=.17*sin(ph)*env;rot('body',x=-.14*display,y=bank,z=.12*pulse(t,.28,.53,.9)-.08*pulse(t,.04,.18,.43));wave(.18,ph*1.35,env);flare=.23*display;sweep=-.10*display;opening=.085*pulse(t,.20,.40,.74);rot('skull',x=-.045*display)
   elif name=='Growth':q=pulse(t,.04,.49,.97);rot('body',x=-.055*q,y=.07*sin(ph)*env);wave(.15,ph,env);flare=.16*q;opening=.050*q
   elif name=='Death':
    sink=ease(t/.86);kick=sin(ph*2.4)*env*(1-ease((t-.52)/.28));rot('body',y=1.02*sink,x=.08*sink,z=-.07*sink);rig.pose.bones['body'].location.z=-.12*sink;rot('tail_base',z=.15*sink+.13*kick);rot('tail_mid',z=.13*sink+.19*kick);rot('tail_distal',z=.09*sink+.25*kick);rot('tail_tip',z=-.10*sink+.27*kick);rot('caudal',z=-.18*sink+.30*kick,x=-.10*sink);opening=.12*sink;flare=.11*sink;sweep=-.08*sink;energy=(1-sink)*env
  rot('throat',x=opening*.10);rot('jaw',x=opening);rig.pose.bones['skull'].rotation_euler.x-=opening*.08
  # Supported brush follows the trunk, with only minute plausible basal compliance.
  rot('brush',x=.006*sin(phase-1)*energy,y=.004*sin(phase-.4)*energy);rot('rear_dorsal',y=.055*sin(phase-1.8)*energy)
  for s in [-1,1]:
   side='L'if s>0 else'R';rot('pectoral_'+side,y=s*(.038*sin(phase-.45+s*.25)*energy+flare)+bank*.22,z=s*sweep,x=.012*sin(phase+s*.5)*energy)
   rot('pectoral_tip_'+side,y=s*.055*sin(phase-1.1+s*.2)*energy+s*flare*.22,z=-s*.020*sin(phase-.7)*energy)
   rot('pelvic_'+side,y=s*.045*sin(phase-1.9+s*.15)*energy+bank*.12,z=s*sweep*.3)
   rot('whip_'+side,z=.064*sin(phase-1.5+s*.2)*energy,x=.020*sin(phase-1.8)*energy)
   rot('whip_tip_'+side,z=.095*sin(phase-2.3+s*.2)*energy,x=.038*sin(phase-2.4)*energy)
   rot('gill_'+side,z=s*.015*(.5-.5*cos(phase*2))*energy+s*.030*opening)
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(L/'stethacanthus-v2.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,role in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment'if '.lod1.'in path.name else'Color',export_all_vertex_colors=False,export_extras=True,export_yup=True)
export(O/'stethacanthus.glb')
for o in objects:
 if len(o.data.polygons)>150 and not o.name.startswith('eye_globe'):
  d=o.modifiers.new('Real reduced LOD','DECIMATE');d.ratio=.27;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
 if len(o.data.materials)>1:
  first=o.data.materials[0];o.data.materials.clear();o.data.materials.append(first)
  for f in o.data.polygons:f.material_index=0
for m in M.values():
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for link in list(nt.links):
  if link.to_node==bs:nt.links.remove(link)
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='BakedPigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(O/'stethacanthus.lod1.glb')
meta={'id':'stethacanthus','name':'Stethacanthus','species':'Stethacanthus sp. (CMNH 8988-informed reconstruction)','provenance':'Late Devonian, upper Famennian Cleveland Shale, Ohio, USA','description':'A short-headed early chondrichthyan with opposing cranial and dorsal crown denticles, a supported spine-brush, slender metapterygial fin extensions, and an epicercal caudal axis.','lengthMeters':.7,'modelLength':4.9,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a[0]for a in anchors],'artVersion':2,'eyes':eye_evidence,'sources':['https://www.app.pan.pl/archive/published/app52/app52-705.pdf','https://doi.org/10.1080/02724634.1984.10012016','https://www.nature.com/articles/25467','https://repozytorium.uw.edu.pl/bitstreams/5cc9e710-1bcb-4353-a08d-f1f56bde31ec/download'],'notes':['Devonian specimen CMNH 8988 preserves spine-brush and associated teeth. Species assignment to S. altonensis is questioned in Ginter & Sun 2007; this is not Akmonistion zangerli.','Whole-animal proportions, exact brush crown width, fin-whip length, living pigmentation, soft-tissue lining and action timing are comparative artistic reconstruction, not measurements of a complete specimen.','Complex-bearing male configuration is comparative; the sex of CMNH 8988 is not established here. No brush inflation or mobile denticles.','Representative 0.7m illustrative individual, not a measured fossil total length or claimed species maximum.']}
(O/'stethacanthus.json').write_text(json.dumps(meta,indent=2)+'\n');print('STETHACANTHUS_V2_CANDIDATE_READY',str(O),flush=True)
