"""Doryaspis V2: independently contoured rigid shield, oral recess and hypocercal posterior.
Candidate-only by default. Set DORY_PUBLISH=1 only after local visual review.
"""
import bpy,bmesh,math,json,os
import numpy as np
from pathlib import Path
from math import sin,cos,pi
from mathutils import Vector
from mathutils.bvhtree import BVHTree
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/doryaspis/v2';O=(R/'public/assets/devonian/creatures')if os.environ.get('DORY_PUBLISH')=='1'else L/'candidate';O.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
scene=bpy.context.scene;scene.render.fps=30
spec=[('root',(0,0,0),None),('body',(0,.2,-.08),'root'),('shield',(0,-.25,-.03),'body'),('oral_upper',(0,-.94,.067),'shield'),('oral_lower',(0,-.96,.055),'shield'),('oral_L',(.105,-.95,.055),'shield'),('oral_R',(-.105,-.95,.055),'shield'),('tail_base',(0,.56,-.06),'body'),('tail_mid',(0,1.02,-.055),'tail_base'),('tail_distal',(0,1.52,-.065),'tail_mid'),('tail_tip',(0,1.98,-.11),'tail_distal'),('caudal',(0,2.34,-.24),'tail_tip')]
arm=bpy.data.armatures.new('Doryaspis_anatomical_rig');rig=bpy.data.objects.new('Doryaspis',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.15,0));b.use_deform=n!='root'
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False);objects=[];M={};pix={}
for key in ['shield','posterior','margin','caudal','eye','oral','flank']:
 m=bpy.data.materials.new('Doryaspis_'+key);m.use_nodes=True;nt=m.node_tree;bs=nt.nodes.get('Principled BSDF');bs.inputs['IOR'].default_value=1.37 if key=='eye' else 1.20;bs.inputs['Specular IOR Level'].default_value=.40 if key=='eye' else .24
 for su,inp in [('albedo','Base Color'),('normal','Normal'),('roughness','Roughness')]:
  im=bpy.data.images.load(str(H/(key+'-'+su+'.png')));im.pack();tx=nt.nodes.new('ShaderNodeTexImage');tx.image=im
  if su!='albedo':im.colorspace_settings.name='Non-Color'
  else:pix[key]=(im.size[0],im.size[1],np.array(im.pixels[:]).reshape(im.size[1],im.size[0],4));m.diffuse_color=tuple(np.mean(pix[key][2],axis=(0,1)))
  if su=='normal':nm=nt.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.50;nt.links.new(tx.outputs['Color'],nm.inputs['Color']);nt.links.new(nm.outputs['Normal'],bs.inputs[inp])
  else:nt.links.new(tx.outputs['Color'],bs.inputs[inp])
 M[key]=m

def cat(points,steps=4):
 p=[np.array(q,float)for q in points];out=[]
 for j in range(len(p)-1):
  a=p[max(0,j-1)];b=p[j];c=p[j+1];d=p[min(len(p)-1,j+2)]
  for k in range(steps):t=k/steps;out.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3))
 out.append(p[-1]);return out

def uvplan(p):return((p[0]+1.42)/2.84,(p[1]+1.12)/1.81)
def uvbody(p):
 cz=float(np.interp(p[1],[.52,.86,1.37,1.64,1.93,2.2,2.43,2.62],[-.05,-.052,-.064,-.081,-.12,-.194,-.297,-.389]))
 return((p[1]+1.65)/4.43,((math.atan2(p[2]-cz,p[0])+pi/2)/(2*pi))%1)
def mesh(n,v,f,ma,bone='shield',weights=None,uvs=None,sub=0):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);scene.collection.objects.link(o);o.parent=rig;me.materials.append(M[ma]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 uv=me.uv_layers.new(name='UVMap')
 for face in me.polygons:
  vals=[uvs[me.loops[li].vertex_index]if uvs else(uvplan(me.vertices[me.loops[li].vertex_index].co)if ma=='shield'else uvbody(me.vertices[me.loops[li].vertex_index].co))for li in face.loop_indices]
  if ma in ['posterior','margin']and max(q[1]for q in vals)-min(q[1]for q in vals)>.5:vals=[(a,b+1 if b<.5 else b)for a,b in vals]
  for li,p in zip(face.loop_indices,vals):uv.data[li].uv=p
 wts=weights or[{bone:1}for p in v];groups={g:o.vertex_groups.new(name=g)for g in set(k for w in wts for k in w)}
 for i,w in enumerate(wts):
  total=sum(w.values())
  for g,a in w.items():
   if a>0:groups[g].add([i],a/total,'REPLACE')
 if sub:
  su=o.modifiers.new('Supported sculpt contour','SUBSURF');su.levels=sub;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=su.name)
 md=o.modifiers.new('Anatomical motion','ARMATURE');md.object=rig
 return o

def tailweights(y):
 rows=[(.65,'body'),(.96,'tail_base'),(1.22,'tail_mid'),(1.71,'tail_distal'),(2.13,'tail_tip'),(2.53,'caudal')]
 if y<=rows[0][0]:return{'body':1}
 if y>=rows[-1][0]:return{'caudal':1}
 for (a,an),(b,bn)in zip(rows,rows[1:]):
  if a<=y<=b:t=(y-a)/(b-a);t=t*t*(3-2*t);return{an:1-t,bn:t}
# One continuous cephalic volume incorporates fixed lateral cornual extensions.
# The top is low and broad; the ventral shield is distinctly deeper.
controls=[(-1.675,.003,.003,.016,.012),(-1.63,.016,.016,.022,.006),(-1.46,.026,.026,.026,.004),(-1.25,.041,.041,.029,.001),(-1.14,.065,.065,.035,-.012),(-1.065,.111,.111,.045,-.05),(-1.01,.180,.180,.065,-.088),(-.93,.255,.255,.096,-.162),(-.79,.370,.370,.112,-.263),(-.56,.484,.484,.121,-.345),(-.31,.545,.545,.119,-.374),(-.08,.558,.552,.115,-.370),(.065,.720,.545,.111,-.347),(.235,1.190,.520,.106,-.300),(.365,1.355,.479,.098,-.252),(.455,1.312,.441,.092,-.220),(.540,.820,.393,.087,-.196),(.615,.339,.339,.076,-.166)]
controls=[(y,base,base,top,bot)for y,rx,base,top,bot in controls]
rows=cat(controls,5);N=120;v=[];uv=[]
for y,rx,base,top,bot in rows:
 for k in range(N):
  th=2*pi*k/N-pi/2;xx=rx*cos(th);sn=sin(th);frac=abs(xx)/max(.001,base)
  if frac<=1:
   thickness=max(.001,top-bot);zt=top-min(.035,thickness*.22)*frac**4;zb=bot+min(.145,thickness*.40)*frac**2
  else:
   t=max(0,min(1,(abs(xx)-base)/max(.001,rx-base)));zt=(top-.035)*(1-t)-(.20+.035*(y-.3))*t*t;zb=(bot+.145)*(1-t)-(.205+.035*(y-.3))*t*t
  mid=(zt+zb)/2;zz=mid+(zt-mid)*max(0,sn)**.32-(mid-zb)*max(0,-sn)**.92;v.append((xx,y,zz));uv.append(uvplan(v[-1]))
f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(rows)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(rows)-1)*N+k for k in range(N))]);head=mesh('head_shield_continuous_closed',v,f,'shield',uvs=uv,sub=1);head['anatomyRole']='closed_eye_surrounding_head_envelope'
# Curved cornual plates: narrow anterior roots flare behind the shield, then
# sweep forward at their lateral tips. Boolean union creates one true shield.
hornControls=[(.43,-.08,.605,-.085,.106),(.56,.095,.598,-.116,.077),(.72,.165,.575,-.155,.047),(.93,.138,.550,-.188,.031),(1.13,.065,.492,-.214,.022),(1.30,-.045,.384,-.229,.016),(1.405,-.165,.207,-.238,.009),(1.442,-.215,-.196,-.242,.002)]
for side in [-1,1]:
 hv=[];hu=[];hr=cat(hornControls,6);hn=56
 for x,front,back,z,h in hr:
  for k in range(hn):
   a=2*pi*k/hn;hv.append((side*x,(front+back)/2+(back-front)/2*cos(a),z+h*sin(a)));hu.append(uvplan(hv[-1]))
 hf=[(j*hn+k,j*hn+(k+1)%hn,(j+1)*hn+(k+1)%hn,(j+1)*hn+k)for j in range(len(hr)-1)for k in range(hn)];hf.extend([tuple(range(hn-1,-1,-1)),tuple((len(hr)-1)*hn+k for k in range(hn))]);horn=mesh('temporary_cornual_plate',hv,hf,'shield',uvs=hu,sub=1)
 bo=head.modifiers.new('Continuous cornual root','BOOLEAN');bo.operation='UNION';bo.solver='EXACT';bo.object=horn;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=bo.name);bpy.ops.object.modifier_apply(modifier=bo.name);objects.remove(horn);bpy.data.objects.remove(horn,do_unlink=True)
# Sculpt the dorsally facing oral pocket into the actual closed shield.
# Boolean wall faces are living mucosa; no hidden body cap or black disk.
origin=Vector((0,-.953,.116));inward=Vector((0,.52,-.854)).normalized();across=Vector((1,0,0));rise=inward.cross(across).normalized();sections=[(-.11,.165,.042),(-.025,.155,.037),(.035,.151,.036),(.10,.145,.073),(.20,.115,.081),(.29,.071,.050),(.33,.030,.023),(.345,.003,.003)];cv=[];cu=[];cn=64
sections=[(t,rx*.82,rz)for t,rx,rz in sections]
for j,(t,rx,rz)in enumerate(cat(sections,4)):
 for k in range(cn):
  th=2*pi*k/cn;p=origin+inward*t+across*(rx*cos(th))+rise*(rz*sin(th));cv.append(tuple(p));cu.append((k/cn,j/(len(cat(sections,4))-1)))
cr=len(cv)//cn;cf=[(j*cn+k,j*cn+(k+1)%cn,(j+1)*cn+(k+1)%cn,(j+1)*cn+k)for j in range(cr-1)for k in range(cn)];cf.extend([tuple(range(cn-1,-1,-1)),tuple((cr-1)*cn+k for k in range(cn))]);cutter=mesh('temporary_oral_negative_volume',cv,cf,'oral',uvs=cu)
# Both share material indices so the boolean assigns its recessed inner wall material.
head.data.materials.append(M['oral']);cutter.data.materials.clear();cutter.data.materials.append(M['shield']);cutter.data.materials.append(M['oral'])
for p in cutter.data.polygons:p.material_index=1
bo=head.modifiers.new('True upward oral cavity','BOOLEAN');bo.operation='DIFFERENCE';bo.solver='EXACT';bo.object=cutter;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=bo.name);bpy.ops.object.modifier_apply(modifier=bo.name);objects.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
# Triangulate exact Boolean n-gons so exported normal-map tangents are valid.
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
# Fixed pseudorostrum: a flattened median blade growing below the oral opening.
def loft(n,rings,ma='posterior',bone='body',weights=False,N=64):
 rows=cat(rings,5);vv=[];ww=[];uu=[]
 for y,rx,rz,cz in rows:
  for k in range(N):a=2*pi*k/N;vv.append((rx*cos(a),y,cz+rz*sin(a)));ww.append(tailweights(y)if weights else{bone:1});uu.append(uvbody(vv[-1]))
 ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(rows)-1)for k in range(N)];ff.extend([tuple(range(N-1,-1,-1)),tuple((len(rows)-1)*N+k for k in range(N))]);return mesh(n,vv,ff,ma,bone,ww,uu,sub=1)
# The pseudorostrum is authored in the anterior rows of the same closed shield
# surface. A supported continuous root replaces overlapping caps entirely.
head.data.materials.append(M['margin'])
for f in head.data.polygons:
 if f.material_index==0 and f.center.y< -1.10:f.material_index=2
body=loft('scaled_posterior_body',[(.52,.324,.125,-.050),(.66,.297,.130,-.055),(.86,.255,.119,-.052),(1.10,.207,.103,-.055),(1.37,.155,.089,-.064),(1.64,.108,.074,-.081),(1.93,.068,.056,-.120),(2.20,.045,.044,-.194),(2.43,.031,.031,-.297),(2.62,.008,.014,-.389)],weights=True)
# Sparse small dermal denticles on leading margins, not functional jaw teeth.
def taper(n,pts,r,ma='margin',bone='shield',N=8):
 vv=[];rows=cat(pts,3)
 for j,p in enumerate(rows):
  q=Vector(p);t=j/max(1,len(rows)-1);tan=Vector(rows[min(len(rows)-1,j+1)])-Vector(rows[max(0,j-1)]);tan.normalize();a=tan.cross(Vector((0,0,1)))
  if a.length<.01:a=tan.cross(Vector((0,1,0)))
  a.normalize();b=tan.cross(a);rad=r*(1-t)**.7+.0007
  for k in range(N):vv.append(tuple(q+rad*(a*cos(2*pi*k/N)+b*sin(2*pi*k/N))))
 ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(rows)-1)for k in range(N)];ff.extend([tuple(range(N-1,-1,-1)),tuple((len(rows)-1)*N+k for k in range(N))]);return mesh(n,vv,ff,ma,bone)
for side in [-1,1]:
 for i,y in enumerate(np.linspace(-1.60,-1.10,20)):
  width=np.interp(y,[-1.675,-1.63,-1.46,-1.25,-1.065],[.003,.016,.026,.041,.083]);p=(side*width,y,.015);taper('pseudorostral_dermal_denticle_'+str(side)+'_'+str(i),[p,(side*(width+.006),y-.006,.014),(side*(width+.009),y-.008,.013)],.0035)
 for i,x in enumerate(np.linspace(.65,1.41,29)):
  y=float(np.interp(x,[h[0]for h in hornControls],[h[1]for h in hornControls]));z=float(np.interp(x,[h[0]for h in hornControls],[h[3]for h in hornControls]));taper('cornual_dermal_denticle_'+str(side)+'_'+str(i),[(side*x,y+.005,z),(side*(x+.002),y-.006,z),(side*(x+.004),y-.013,z-.001)],.0035,ma='shield')
# Caudal fin: the scaled axis continues down through its deeper ventral lobe.
finrows=cat([(-.43,2.63,2.685,.004),(-.37,2.40,2.725,.016),(-.28,2.22,2.65,.025),(-.15,2.14,2.52,.029),(-.045,2.15,2.47,.031),(.08,2.21,2.54,.023),(.19,2.39,2.565,.012),(.23,2.52,2.55,.003)],5);vv=[];uu=[];ww=[];N=48
for j,(z,front,back,thick)in enumerate(finrows):
 for k in range(N):a=2*pi*k/N;yy=front+(back-front)*(.5-.5*cos(a));vv.append((thick*sin(a),yy,z));uu.append(uvbody(vv[-1]));ww.append(tailweights(yy))
ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(finrows)-1)for k in range(N)];ff.extend([tuple(range(N-1,-1,-1)),tuple((len(finrows)-1)*N+k for k in range(N))]);mesh('hypocercal_caudal_membrane',vv,ff,'caudal','caudal',ww,uu,sub=1)
# One small recessed branchial outlet at each lateral rear shield margin.
for side in [-1,1]:
 bv=[];bu=[];bn=48;bc=Vector((side*.431,.399,-.144));axis=Vector((side*.88,.42,-.10)).normalized();ba=Vector((0,0,1));bb=axis.cross(ba).normalized()
 for j in range(10):
  t=j/9
  for k in range(bn):
   a=2*pi*k/bn;p=bc+axis*(.15-.22*t)+ba*(.027*(1-t*.94)*sin(a))+bb*(.063*(1-t*.94)*cos(a));bv.append(tuple(p));bu.append((k/bn,t))
 bf=[(j*bn+k,j*bn+(k+1)%bn,(j+1)*bn+(k+1)%bn,(j+1)*bn+k)for j in range(9)for k in range(bn)];bf.extend([tuple(range(bn-1,-1,-1)),tuple(9*bn+k for k in range(bn))]);cut=mesh('temporary_branchial_recess',bv,bf,'oral',uvs=bu);cut.data.materials.clear();cut.data.materials.append(M['shield']);cut.data.materials.append(M['oral'])
 for f in cut.data.polygons:f.material_index=1
 bo=head.modifiers.new('Recessed single branchial outlet','BOOLEAN');bo.operation='DIFFERENCE';bo.solver='EXACT';bo.object=cut;bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=bo.name);bpy.ops.object.modifier_apply(modifier=bo.name);objects.remove(cut);bpy.data.objects.remove(cut,do_unlink=True)
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
# Skinning belongs to the actual recessed mucosal surface. Its boundary with
# the dermal shield stays fixed; inward soft folds pulse without an external hoop.
bm=bmesh.new();bm.from_mesh(head.data);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(head.data);bm.free()
# Boolean-generated vertices do not reliably inherit groups. Rebind the entire
# united shield before authoring the small mucosal blends.
head.vertex_groups.clear();head.vertex_groups.new(name='shield').add(list(range(len(head.data.vertices))),1.0,'REPLACE')
oralVerts=set();armourVerts=set()
for f in head.data.polygons:
 (oralVerts if f.material_index==1 else armourVerts).update(f.vertices)
for g in ['oral_L','oral_R','oral_upper','oral_lower']:
 if not head.vertex_groups.get(g):head.vertex_groups.new(name=g)
for vi in oralVerts-armourVerts:
 p=head.data.vertices[vi].co;delta=p-origin;t=delta.dot(inward)
 if abs(p.x)>.16 or p.y>-.68 or not 0<t<.34:continue
 a=math.atan2(delta.dot(rise)/.05,delta.x/.12);g='oral_L'if cos(a)>.55 else'oral_R'if cos(a)<-.55 else'oral_upper'if sin(a)<0 else'oral_lower';w=.75*sin(pi*t/.34)**2;head.vertex_groups['shield'].add([vi],1-w,'REPLACE');head.vertex_groups[g].add([vi],w,'REPLACE')
# Re-project UVs after the Boolean/bevel operations: generated rim vertices must
# sample their own shield location, not an arbitrary cutter texture coordinate.
head.data.materials.append(M['flank'])
for f in head.data.polygons:
 f.use_smooth=True
 if f.material_index==0 and f.normal.z<.42 and abs(f.center.x)<.55 and f.center.y>-.70:f.material_index=3
 vals=[]
 for li in f.loop_indices:
  p=head.data.vertices[head.data.loops[li].vertex_index].co
  if f.material_index==0:uv=uvplan(p)
  elif f.material_index==2:uv=uvbody(p)
  elif f.material_index==3:uv=((p.y+1.12)/1.77,((math.atan2(p.z+.12,p.x)+pi/2)/(2*pi))%1)
  else:
   d=p-origin;uv=((math.atan2(d.dot(rise)/.05,d.x/.12)/(2*pi))%1,max(.015,min(.97,d.dot(inward)/.345)))
  vals.append(uv)
 if f.material_index in [2,3] and max(q[1]for q in vals)-min(q[1]for q in vals)>.5:vals=[(u,v+1 if v<.5 else v)for u,v in vals]
 if f.material_index==1 and max(q[0]for q in vals)-min(q[0]for q in vals)>.5:vals=[(u+1 if u<.5 else u,v)for u,v in vals]
 for li,uv in zip(f.loop_indices,vals):head.data.uv_layers.active.data[li].uv=uv
# The rigid dermal aperture is a genuine material/normal boundary. Avoid
# smoothing its outer shield normal through the inward mucosal wall.
edgeMaterials={}
for f in head.data.polygons:
 for e in f.edge_keys:edgeMaterials.setdefault(tuple(sorted(e)),set()).add(f.material_index)
for e in head.data.edges:
 mats=edgeMaterials.get(tuple(sorted(e.vertices)),set())
 if 1 in mats and len(mats)>1:e.use_edge_sharp=True
# Closed small oval eyes are placed by actual shield-volume tests.
head.data.update();tree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[p.vertices for p in head.data.polygons]);rng=np.random.default_rng(203);samples=rng.uniform(-1,1,(90000,3));samples=samples[(samples*samples).sum(1)<=1];eye_evidence=[]
for side in [-1,1]:
 surf,normal,idx,dist=tree.find_nearest(Vector((side*.257,-.846,.15)))
 if normal.z<0:normal=-normal
 U=Vector((1,0,0));U=(U-normal*U.dot(normal)).normalized();V=normal.cross(U).normalized();rad=(.026,.036,.039);depth=.011
 while True:
  center=surf-normal*depth;P=[center+normal*float(p[0])*rad[0]+U*float(p[1])*rad[1]+V*float(p[2])*rad[2]for p in samples];hits=0
  for p in P:
   q,n,ii,d=tree.find_nearest(p);hits+=(p-q).dot(n)<0
  fraction=hits/len(P)
  if fraction>=.80:break
  depth+=.001
 vv=[];uu=[];N=48;rr=32
 for j in range(rr+1):
  a=pi*j/rr
  for k in range(N):t=2*pi*k/N;p=center+normal*(rad[0]*cos(a))+U*(rad[1]*sin(a)*cos(t))+V*(rad[2]*sin(a)*sin(t));vv.append(tuple(p));uu.append((k/N,j/rr))
 ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(rr)for k in range(N)];name='eye_globe_L'if side>0 else'eye_globe_R';o=mesh(name,vv,ff,'eye',uvs=uu);o['anatomyRole']='eye_globe';eye_evidence.append({'mesh':name,'surroundingMeshes':[head.name],'centerBlender':list(center),'normal':list(normal),'radiiNormalUV':rad,'centerInset':depth,'embeddedFraction':fraction,'sampleCount':len(P),'method':'seeded uniform ellipsoid volume samples against actual closed shield BVH signed nearest surface'})
# Bake UV pigmentation independently for LOD; full COLOR_0 remains neutral white.
for o in objects:
 me=o.data;vc=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');bc=me.color_attributes.new(name='BakedPigment',type='FLOAT_COLOR',domain='POINT');colors=np.zeros((len(me.vertices),3));counts=np.zeros(len(me.vertices))
 for f in me.polygons:
  key=me.materials[f.material_index].name.removeprefix('Doryaspis_');W,T,pp=pix[key]
  for li in f.loop_indices:
   vi=me.loops[li].vertex_index;u,v=me.uv_layers.active.data[li].uv;colors[vi]+=pp[min(T-1,int((v%1)*(T-1))),min(W-1,int((u%1)*(W-1))),:3];counts[vi]+=1
 for i in range(len(me.vertices)):
  vc.data[i].color=(1,1,1,1);rgb=colors[i]/max(1,counts[i]);linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4);bc.data[i].color=(*linear,1)
# Real rigid contact/oral sockets; no artificial biting jaw or CCD chain.
anchors=[('anchor_mouth','shield',(0,-.953,.116),'mouth'),('anchor_mouth_inside','shield',tuple(origin+inward*.22),'swallow'),('anchor_attack_primary','shield',(0,-1.675,.014),'attack')]
for n,b,p,role in anchors:
 o=bpy.data.objects.new(n,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=b;o.matrix_parent_inverse=rig.pose.bones[b].matrix.inverted();o.location=Vector(p)-Vector((0,.15,0));o['cambrianAnchor']={'version':1,'role':role,'parentBone':b}
(H/'anchors.json').write_text(json.dumps({'doryaspis':[{'name':n,'bone':b,'point':list(p),'role':r}for n,b,p,r in anchors]},indent=2)+'\n');(H/'eyes-v2.json').write_text(json.dumps(eye_evidence,indent=2)+'\n')
# Individually timed actions: fixed cephalic armour, posterior wave/trim, small oral pulses.
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
  def wave(amp,phase=ph,en=1,vertical=0):
   for j,b in enumerate(['tail_base','tail_mid','tail_distal','tail_tip','caudal']):rot(b,z=amp*(.26+.22*j)*sin(phase-.73*j)*en,x=vertical*sin(phase-.55*j)*en)
  def oral(amount,phase=ph):
   for side in [-1,1]:rig.pose.bones['oral_L'if side>0 else'oral_R'].location.x=side*.008*amount
   rig.pose.bones['oral_upper'].location=tuple(-rise*.006*amount);rig.pose.bones['oral_lower'].location=tuple(rise*.004*amount+inward*.0025*amount)
  if name in LOOPS:
   if name=='Idle':wave(.12,vertical=.018);rot('body',x=.013*sin(ph),y=.020*sin(ph+.4));oral(.20*(1-cos(ph*2)))
   elif name=='Swim':phase=ph*2+.36*sin(ph*2);burst=.50+.50*(.5+.5*cos(ph))**2;wave(.36,phase,burst,.027);rot('body',z=.028*sin(phase+.2),x=.025*sin(ph-.4));oral(.22*(1-cos(ph*2)))
   elif name=='Guard':wave(.18,vertical=.038);rot('body',x=.038*(1-cos(ph)),y=.04*sin(ph));oral(.27*(1-cos(ph)))
   else:wave(.15,ph*2,1,.016);g=(.5-.5*cos(ph*3))*(.72+.28*cos(ph)**2);oral(g);rot('body',x=-.035*(1-cos(ph)),z=.016*sin(ph));rot('caudal',x=.045*sin(ph),z=.21*sin(ph*2-2))
  else:
   wave(.26,ph,env,.025);oral(.18*env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft'else-1;q=pulse(t,0,.38,1);rot('body',z=s*.43*q,y=-s*.25*q);rot('tail_base',z=-s*.30*q);rot('tail_mid',z=-s*.38*pulse(t,.06,.45,.92));rot('tail_distal',z=s*.25*pulse(t,.16,.56,1));rot('caudal',z=s*.49*pulse(t,.22,.64,1),x=.08*q)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive'else-1;q=pulse(t,0,.40,1);rot('body',x=s*.31*q);wave(.25,ph+.4,env,-s*.105);rot('caudal',x=-s*.22*pulse(t,0,.26,.88),z=.24*sin(ph-1)*env)
   elif name=='Attack':q=pulse(t,.02,.43,.85);rot('body',x=-.14*pulse(t,.02,.25,.60)+.12*pulse(t,.38,.60,.94));rig.pose.bones['body'].location.y=.12*pulse(t,0,.19,.42)-.27*pulse(t,.25,.48,.92);wave(.43,ph+1.2*q,env,.05);oral(.85*pulse(t,.16,.42,.72))
   elif name=='Bite':q=pulse(t,.02,.32,.82);oral(q);rot('body',x=-.07*q,z=.03*sin(ph)*env);wave(.18,ph+.5,env,.02)
   elif name=='Heavy':q=pulse(t,.04,.45,.9);rot('body',x=-.18*pulse(t,0,.28,.55)+.21*pulse(t,.35,.61,1),y=.12*q);rig.pose.bones['body'].location.y=.13*pulse(t,0,.22,.46)-.32*pulse(t,.34,.59,1);wave(.49,ph+1.8*q,env,.08);oral(.70*pulse(t,.20,.39,.75))
   elif name=='Dodge':q=pulse(t,0,.34,1);rot('body',y=-.48*q,z=.39*q);rig.pose.bones['body'].location.x=.32*q;rot('tail_base',z=-.48*q);rot('tail_mid',z=-.40*pulse(t,.04,.43,.93));rot('tail_distal',z=.43*pulse(t,.12,.53,1));rot('caudal',z=.53*pulse(t,.18,.64,1),x=.12*q)
   elif name=='Parry':q=pulse(t,0,.25,1);rot('body',y=.38*q,z=-.23*q);wave(.39,ph+1,env,.08);rot('caudal',z=.44*pulse(t,.06,.44,1))
   elif name in ['Hit','Stagger']:shock=sin((3 if name=='Hit'else 5)*pi*t)*env;rot('body',z=.28*shock,y=.16*env,x=.075*shock);wave(.42,ph*1.4,env,.08);oral(.4*env)
   elif name=='Ability':q=pulse(t,.04,.37,.80);rot('body',x=-.24*q,y=.18*sin(ph)*env,z=.19*pulse(t,.36,.60,.91)-.12*pulse(t,.03,.20,.42));wave(.34,ph*1.4+.4,env,.11);oral(.80*pulse(t,.18,.40,.63)+.35*pulse(t,.66,.79,.95))
   elif name=='Growth':q=pulse(t,0,.48,1);rot('body',x=-.08*q,y=.08*sin(ph)*env);wave(.20,ph,env,.055);oral(.30*q)
   elif name=='Death':q=ease(t/.82);kick=sin(ph*2.5)*(1-t)*env*(1-ease((t-.58)/.26));rot('body',y=1.14*q,x=.13*q,z=-.08*q);rig.pose.bones['body'].location.z=-.12*q;rot('tail_base',z=.18*q+.12*kick);rot('tail_mid',z=.17*q+.22*kick);rot('tail_distal',z=.12*q+.30*kick);rot('caudal',z=-.22*q+.38*kick,x=-.12*q);oral(.22*q)
  for pb in rig.pose.bones:
   if pb.name in ['root','shield']:continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body'or pb.name.startswith('oral_'):pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(L/'doryaspis-v2.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,role in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_vertex_color='NAME',export_vertex_color_name='BakedPigment' if '.lod1.' in path.name else 'Color',export_all_vertex_colors=False,export_extras=True,export_yup=True)
export(O/'doryaspis.glb')
for o in objects:
 c=o.data.color_attributes['Color'];b=o.data.color_attributes['BakedPigment']
 for i in range(len(c.data)):c.data[i].color=b.data[i].color
 o.data.update();bpy.context.view_layer.update()
 if len(o.data.polygons)>150 and not o.name.startswith('eye_globe'):
  d=o.modifiers.new('Actual reduced LOD','DECIMATE');d.ratio=.27;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
for m in M.values():
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
 for link in list(nt.links):
  if link.to_node==bs:nt.links.remove(link)
 vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='BakedPigment';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
# One vertex-colour material per LOD mesh avoids Blender's multi-material
# colour-layer remapping and retains every baked tissue colour.
for o in bpy.data.objects:
 if o.type=='MESH' and len(o.data.materials)>1:
  first=o.data.materials[0];o.data.materials.clear();o.data.materials.append(first)
  for f in o.data.polygons:f.material_index=0
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
bpy.context.view_layer.update()
export(O/'doryaspis.lod1.glb')
meta={'id':'doryaspis','name':'Doryaspis','species':'Doryaspis nathorsti','provenance':'Early Devonian, Wood Bay Formation, Spitsbergen, Svalbard','description':'A jawless fish with a flat dorsal headshield, deep ventral armour, short fixed pseudorostrum and laterally extended rigid cornual plates; flexible scaled posterior with a hypocercal tail.','lengthMeters':.20,'modelLength':4.4,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a[0]for a in anchors],'eyes':eye_evidence,'artVersion':2,'sources':['https://doi.org/10.1038/s42003-024-06837-8','https://doi.org/10.1671/0272-4634(2002)022[0735:TGDWHF]2.0.CO;2','https://www.app.pan.pl/archive/published/app07/app07-249.pdf'],'notes':['Original reconstruction, not a scan; head/projection/tail proportions guided by the D. nathorsti reconstruction in Botella et al. 2024 supplementary figure 1b.','Living pigmentation, exact soft-tissue lining and action timing are artistic interpretation.','No jaws, paired fins, hinged cornua, or moving pseudorostrum; action labels retain runtime compatibility.','Enlarged authoring coordinates; lengthMeters is the representative ecological size and modelLength supports runtime normalization.']}
(O/'doryaspis.json').write_text(json.dumps(meta,indent=2)+'\n');print('DORYASPIS_V2_CANDIDATE_READY',str(O))
