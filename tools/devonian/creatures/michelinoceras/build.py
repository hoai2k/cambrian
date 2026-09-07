"""Original M.currens preview: rigid orthocone and conservatively reconstructed soft body."""
import bpy,bmesh,json,math,os,random
import numpy as np
from math import sin,cos,pi,sqrt,exp
from pathlib import Path
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/michelinoceras/v1';O=L/'candidate';O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);S=bpy.context.scene;S.render.fps=30;objects=[];M={}
for n,c,r in [('shell',(.66,.47,.29),.33),('nacre',(.57,.48,.37),.28),('skin',(.27,.125,.071),.46),('oral',(.19,.080,.053),.4),('ridge',(.36,.22,.12),.46),('beak',(.07,.041,.024),.31),('eye',(.012,.016,.014),.17)]:
 m=bpy.data.materials.new('Michelinoceras_'+n);m.diffuse_color=(*c,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=r;bs.inputs['Specular IOR Level'].default_value=.3;M[n]=m
 if os.environ.get('MIC_CLAY')!='1' and(H/(n+'-albedo.png')).exists():
  for suffix,key in [('albedo','Base Color'),('normal','Normal'),('roughness','Roughness')]:
   path=H/(n+'-'+suffix+'.png')
   if not path.exists():continue
   im=bpy.data.images.load(str(path));im.pack();tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im
   if suffix!='albedo':im.colorspace_settings.name='Non-Color'
   if suffix=='normal':
    nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.23;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs[key])
   else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[key])
NSEG=16;ARMS=[];spec=[('root',(0,0,0),(0,.12,0),None),('body',(0,-.9,0),(0,-1.2,0),'root'),('head',(0,-1.27,0),(0,-1.63,0),'body'),('funnel',(0,-1.43,-.15),(0,-1.72,-.26),'head'),('beak_upper',(0,-1.80,.026),(0,-1.9,.026),'head'),('beak_lower',(0,-1.80,-.026),(0,-1.9,-.026),'head')]
for a in range(10):
 th=2*pi*a/10+pi/10;rad=Vector((cos(th),0,sin(th)));side=Vector((-sin(th),0,cos(th)));pts=[]
 for j in range(NSEG+1):
  t=j/NSEG;r=.162+.22*sin(t*pi*.70)+.05*sin(2*pi*t)*t;length=.87*(1+.07*cos(th*2));p=rad*r+side*(.035*sin(pi*t)*sin(th*3));p.y=-1.78-length*t+.06*t**4;pts.append(p)
 for j in range(NSEG):spec.append((f'arm_{a}_{j:02d}',pts[j],pts[j+1],f'arm_{a}_{j-1:02d}'if j else'head'))
 ARMS.append((rad,side,pts))
a=bpy.data.armatures.new('Michelinoceras_shell_softpart_rig');rig=bpy.data.objects.new('Michelinoceras',a);S.collection.objects.link(rig);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,p,q,pa in spec:
 b=a.edit_bones.new(n);b.head=p;b.tail=q;b.use_deform=n!='root'
 if n.startswith('arm_'):b.align_roll(ARMS[int(n.split('_')[1])][0])
 else:b.align_roll(Vector((0,0,1)))
 if pa:b.parent=a.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
exec(compile((H/'mesh_utils.py').read_text(),str(H/'mesh_utils.py'),'exec'))
# An intact smooth orthocone with a true wall-thickness rim and full internal lining.
N=128;v=[];uv=[];rings=[];slope=math.tan(math.radians(3.5))
for inner in [False,True]:
 for j in range(129):
  t=j/128;y=3.65-5*t;r=.006+5*t*slope
  if inner:r=max(.0015,r-(.004+.008*t))
  ring=[]
  for k in range(N):
   th=2*pi*k/N;ring.append(len(v));v.append((r*cos(th),y,r*sin(th)));uv.append((k/N,t))
  rings.append(ring)
f=[]
for offset in [0,129]:
 for j in range(128):
  a0=rings[offset+j];b0=rings[offset+j+1]
  for k in range(N):f.append((a0[k],a0[(k+1)%N],b0[(k+1)%N],b0[k]))
for j in [0,128]:
 for k in range(N):f.append((rings[j][k],rings[j][(k+1)%N],rings[j+129][(k+1)%N],rings[j+129][k]))
shell=mesh('rigid_shell_continuous_aperture_wall',v,f,'shell',uvs=uv);shell.data.materials.append(M['nacre'])
for f0 in shell.data.polygons:
 if f0.index>=128*N:f0.material_index=1
# Chambered reference is real geometry inside intact shell; body chamber begins at y=-.40.
# Boundaries are internal septa, not misrepresented as external annular ridges.
y=3.40;j=0
while y>-.36:
 r=.006+(3.65-y)*slope-.009;v=[];uv=[];Nr=48
 for q in range(9):
  u=.070+.930*q/8;rr=r*u
  for k in range(Nr):
   th=2*pi*k/Nr;v.append((rr*cos(th),y+.64*r*(1-u*u),rr*sin(th)+.04*r*(1-u)));uv.append((k/N,u))
 ff=[(q*Nr+k,q*Nr+(k+1)%Nr,(q+1)*Nr+(k+1)%Nr,(q+1)*Nr+k)for q in range(8)for k in range(Nr)];obj=mesh(f'internal_septum_reference_{j:02d}',v,ff,'nacre');mod=obj.modifiers.new('Thin chamber wall','SOLIDIFY');mod.thickness=.002;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_move_up(modifier=mod.name);bpy.ops.object.modifier_apply(modifier=mod.name);y-=max(.055,1.68*r);j+=1
tube('internal_subcentral_siphuncle',[(0,float(y),float(.04*(.006+(3.65-y)*slope)))for y in np.linspace(3.46,-.42,64)],[max(.0015,(.006+(3.65-y)*slope)/15)for y in np.linspace(3.46,-.42,64)],'oral','body',N=12)
# Continuous closed head/mantle envelope, shaped into a genuine blind-lined oral recess.
profile=[(-.86,.075),(-1.00,.19),(-1.15,.259),(-1.30,.276),(-1.43,.271),(-1.53,.263),(-1.64,.245),(-1.73,.217),(-1.81,.174),(-1.86,.126),(-1.877,.09),(-1.83,.073),(-1.73,.062),(-1.64,.027),(-1.625,.002)]
v=[];uv=[];ww=[];N=128
for j,(y,r)in enumerate(profile):
 for k in range(N):
  th=2*pi*k/N;zz=r*sin(th)*(.91 if j<10 else 1);v.append((r*cos(th),y,zz));uv.append((k/N,j/(len(profile)-1)));t=max(0,min(1,(-y-1.04)/.31));ww.append({'body':1-t,'head':t})
f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(profile)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(profile)-1)*N+k for k in range(N))]);head=mesh('head_continuous_closed',v,f,'skin',uvs=uv,weights=ww,sub=2);head.data.materials.append(M['oral'])
for q in head.data.polygons:
 c=q.center
 if c.y< -1.63 and sqrt(c.x*c.x+c.z*c.z)<.084:q.material_index=1
for si in [-1,1]:
 oval('eye_globe_'+('L'if si==1 else'R'),(si*.232,-1.535,.055),(.055,.070,.053),'eye','head',N=64,K=40)
# Skin-covered mantle margin remains inside shell aperture; no ornamental orbital rings.
# Ten continuous flexible tapering arms, flattened subtly toward oral side; no sucker discs.
for a,(rad,side,pts)in enumerate(ARMS):
 v=[];uv=[];ww=[];N=24;K=NSEG*4
 for q in range(K+1):
  t=q/K;j0=min(NSEG-1,int(t*NSEG));s=t*NSEG-j0;p=pts[j0].lerp(pts[j0+1],s);tangent=(pts[j0+1]-pts[j0]).normalized();cross=side;up=cross.cross(tangent).normalized();w=.053*(1-t)**.76+.0015
  for k in range(N):
   th=2*pi*k/N;v.append(tuple(p+cross*w*cos(th)+up*w*.79*sin(th)));uv.append((k/N,t));blend=s;ww.append({f'arm_{a}_{max(0,j0-1):02d}':1-blend,f'arm_{a}_{j0:02d}':blend}if j0 else{f'arm_{a}_00':1})
 f=[(q*N+k,q*N+(k+1)%N,(q+1)*N+(k+1)%N,(q+1)*N+k)for q in range(K)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple(K*N+k for k in range(N))]);mesh(f'arm_{a}_continuous_tapered_skin',v,f,'skin',uvs=uv,weights=ww)
 # Low soft transverse adhesive folds interpreted conservatively; no hooks or calcified suckers.
 for q in range(28):
  t=.07+.80*q/28;j0=min(NSEG-1,int(t*NSEG));s=t*NSEG-j0;p=pts[j0].lerp(pts[j0+1],s);w=.053*(1-t)**.76+.0015;p-=rad*w*.78;pp=[p+side*w*u+rad*(.005*(u*u))for u in [-.62,-.3,0,.3,.62]];tube(f'arm_{a}_oral_fold_{q:02d}',pp,[.001,.002,.0025,.002,.001],'ridge',f'arm_{a}_{j0:02d}',N=6)
# Fitted ventral hyponome: open tube with a returned wall and closed inner mantle reservoir.
Nr=64;v=[];uv=[];pr=[((0,-1.34,-.16),.093),((0,-1.46,-.225),.083),((0,-1.59,-.265),.062),((0,-1.72,-.27),.044),((0,-1.74,-.269),.038),((0,-1.68,-.262),.033),((0,-1.56,-.225),.042),((0,-1.43,-.16),.047),((0,-1.38,-.12),.001)]
for j,(p,r)in enumerate(pr):
 for k in range(Nr):
  th=2*pi*k/Nr;v.append((p[0]+r*cos(th),p[1],p[2]+r*sin(th)));uv.append((k/N,j/(len(pr)-1)))
f=[(j*Nr+k,j*Nr+(k+1)%Nr,(j+1)*Nr+(k+1)%Nr,(j+1)*Nr+k)for j in range(len(pr)-1)for k in range(Nr)];f.extend([tuple(range(Nr-1,-1,-1)),tuple((len(pr)-1)*Nr+k for k in range(Nr))]);funnel=mesh('funnel_open_lined_hyponome',v,f,'skin','funnel',uvs=uv,sub=1);funnel.data.materials.append(M['oral'])
for f0 in funnel.data.polygons:
 if f0.center.y< -1.59 and abs(f0.center.x)<.031:f0.material_index=1
# Small paired corneous jaws remain inside the perioral chamber, each truly articulated.
for si in [-1,1]:
 bone='beak_upper'if si==1 else'beak_lower';v=[];N=40
 jaw_profile=[(-1.71,.035,.040,.013),(-1.75,.044,.037,.018),(-1.80,.040,.028,.018),(-1.84,.028,.020,.014),(-1.88,.016,.010,.008),(-1.90,.0015,0,.001)]
 for y,w,z,thick in jaw_profile:
  for k in range(N):
   th=2*pi*k/N;v.append((w*cos(th),y,si*z+sin(th)*thick))
 f=[(q*N+k,q*N+(k+1)%N,(q+1)*N+(k+1)%N,(q+1)*N+k)for q in range(len(jaw_profile)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(jaw_profile)-1)*N+k for k in range(N))]);mesh(bone+'_corneous_plate',v,f,'beak',bone,sub=1)
anchors=[('anchor_mouth','head',(0,-1.89,0),'mouth'),('anchor_mouth_inside','head',(0,-1.72,0),'swallow'),('anchor_attack_primary','arm_0_12',tuple(ARMS[0][2][13]),'attack')]
for n,b,p,role in anchors:
 o=bpy.data.objects.new(n,None);S.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=b;world=bpy.data.objects.new('tmp',None);o.matrix_world=__import__('mathutils').Matrix.Translation(Vector(p));bpy.context.view_layer.update();o.matrix_world=__import__('mathutils').Matrix.Translation(Vector(p));o['cambrianAnchor']={'version':1,'role':role,'parentBone':b}
exec(compile((H/'animations.py').read_text(),str(H/'animations.py'),'exec'))
if os.environ.get('MIC_CLAY')=='1':bpy.ops.wm.save_as_mainfile(filepath=str(L/'michelinoceras-clay.blend'))
if os.environ.get('MIC_CLAY')!='1':exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
print('MICHELINOCERAS_BUILD_DONE',len(objects),len(spec),flush=True)
