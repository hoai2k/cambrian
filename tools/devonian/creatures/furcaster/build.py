"""Original Furcaster palaeozoicus preview; five arthrodial arm chains and oral disc."""
import bpy,bmesh,math,json,os,random
import numpy as np
from pathlib import Path
from math import sin,cos,pi,exp,sqrt
from mathutils import Vector
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/furcaster/v1';O=L/'candidate';O.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);S=bpy.context.scene;S.render.fps=30;objects=[];M={}
for n,c,r in [('body',(.26,.115,.068),.54),('ossicles',(.40,.27,.15),.48),('spines',(.37,.25,.12),.46),('underside',(.34,.23,.17),.56),('oral',(.22,.09,.065),.44),('podia',(.28,.20,.12),.48)]:
 m=bpy.data.materials.new('Furcaster_'+n);m.diffuse_color=(*c,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=r;bs.inputs['Specular IOR Level'].default_value=.26;M[n]=m
 if os.environ.get('FUR_CLAY')!='1'and (H/(n+'-albedo.png')).exists():
  for suffix,key in [('albedo','Base Color'),('normal','Normal'),('roughness','Roughness')]:
   im=bpy.data.images.load(str(H/(n+'-'+suffix+'.png')));im.pack();tx=m.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im
   if suffix!='albedo':im.colorspace_settings.name='Non-Color'
   if suffix=='normal':
    nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.30;m.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],bs.inputs[key])
   else:m.node_tree.links.new(tx.outputs['Color'],bs.inputs[key])
NSEG=36;ARMS=[];spec=[('root',(0,0,0),(0,.1,0),None),('body',(0,0,0),(0,.12,0),'root')]
for a in range(5):
 th=-pi/2+2*pi*a/5;di=Vector((cos(th),sin(th),0));side=Vector((-sin(th),cos(th),0));pts=[]
 for j in range(NSEG+1):
  t=j/NSEG;r=.43+2.62*t;p=di*r+side*(.13*sin(pi*t)*(1 if a in [0,1,3]else-1));p.z=.028-.032*t+.018*sin(pi*t);pts.append(p)
 for j in range(NSEG):spec.append((f'arm_{a}_{j:02d}',pts[j],pts[j+1],f'arm_{a}_{j-1:02d}'if j else'body'))
 ARMS.append((di,side,pts))
for a in range(5):
 th=-pi/2+2*pi*(a+.5)/5;d=Vector((cos(th),sin(th),0));p=d*.205;p.z=-.075;spec.append((f'oral_angle_{a}',p,p+d*.09,'body'))
spec.append(('oral_pump',(0,0,-.035),(0,.07,-.035),'body'))
a=bpy.data.armatures.new('Furcaster_radial_rig');rig=bpy.data.objects.new('Furcaster',a);S.collection.objects.link(rig);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,p,q,pa in spec:
 b=a.edit_bones.new(n);b.head=p;b.tail=q;b.use_deform=n!='root';b.align_roll(Vector((0,0,1)))
 if pa:b.parent=a.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
exec(compile((H/'mesh_utils.py').read_text(),str(H/'mesh_utils.py'),'exec'))
# Continuous living disc, annular ventral surface joined to a blind lined oral chamber.
N=160;v=[];rings=[]
for kind,radius,z in [('outerlow',.545,-.075),('outermid',.575,-.014),('outerupper',.557,.073),('upper1',.49,.12),('upper2',.31,.153),('upper3',.12,.166),('uppercentre',.001,.168),('ventral1',.41,-.096),('ventral2',.23,-.104),('mouthlip',.135,-.105),('pharynx',.105,-.035),('oralceiling',.07,.039),('ceilingcentre',.001,.055)]:
 ring=[]
 for k in range(N):
  th=2*pi*k/N;rad=radius*(1+.045*cos(5*(th+pi/2)));zz=z+(.009*sin(7*th+.4)+.005*cos(11*th))*(radius/.58) if kind.startswith('upper')else z
  ring.append(len(v));v.append((rad*cos(th),rad*sin(th),zz))
 rings.append(ring)
f=[];fm=[]
def connect(i,j,ma):
 for k in range(N):f.append((rings[i][k],rings[i][(k+1)%N],rings[j][(k+1)%N],rings[j][k]));fm.append(ma)
for i in range(6):connect(i,i+1,0)
connect(0,7,1);connect(7,8,1);connect(8,9,1)
for i in range(9,12):connect(i,i+1,2)
f.append(tuple(reversed(rings[6])));fm.append(0);f.append(tuple(rings[12]));fm.append(2)
disc=mesh('disc_continuous_oral_chamber',v,f,'body');disc.data.materials.append(M['underside']);disc.data.materials.append(M['oral'])
# Polygon order survives normals/recalc (quads; final caps triangulated by helper), classify by centroids.
for face in disc.data.polygons:
 c=face.center;r=sqrt(c.x*c.x+c.y*c.y)
 if c.z<-.06:face.material_index=1
 if r<.145 and c.z<.07:face.material_index=2
# Fine irregular ossicle mosaic of disc, embedded into the dermal envelope.
rng=random.Random(34509)
for i in range(390):
 th=rng.uniform(0,2*pi);r=.54*sqrt(rng.random());p=Vector((r*cos(th),r*sin(th),.168-.09*(r/.575)**2));rad=rng.uniform(.014,.027)
 oval(f'disc_granule_{i:03d}',p,(rad,rad*.83,rad*.22),'ossicles','body',N=10,K=6)
# Opposed paired ambulacrals and curved lateral ossicles; no modern dorsal shield rows are invented.
for a,(di,side,pts)in enumerate(ARMS):
 # Smooth narrow arm integument is weighted between adjacent joints; exposed plates are rigid.
 v=[];uv=[];ww=[];N=16
 for j,p in enumerate(pts):
  t=j/NSEG;w=.104*(1-t)**.74+.008;depth=.063*(1-t)**.85+.004
  tangent=(pts[min(j+1,NSEG)]-pts[max(j-1,0)]).normalized();sd=Vector((-tangent.y,tangent.x,0));up=Vector((0,0,1))
  for k in range(N):
   th=2*pi*k/N;v.append(tuple(p+sd*w*cos(th)+up*depth*sin(th)));uv.append((k/N,t));j0=max(0,j-1);j1=min(NSEG-1,j);ww.append({f'arm_{a}_{j0:02d}':.5,f'arm_{a}_{j1:02d}':.5}if j0!=j1 else{f'arm_{a}_{j0:02d}':1})
 f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(NSEG)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple(NSEG*N+k for k in range(N))]);mesh(f'arm_{a}_flexible_integument',v,f,'body',uvs=uv,weights=ww)
 for j in range(NSEG):
  p=pts[j];q=pts[j+1];d=(q-p).normalized();sd=Vector((-d.y,d.x,0));up=Vector((0,0,1));t=(j+.5)/NSEG;w=.104*(1-t)**.74+.008;depth=.063*(1-t)**.85+.004;bone=f'arm_{a}_{j:02d}';length=(q-p).length;c=(p+q)/2
  for si in [-1,1]:
   # Two opposed dorsal-visible ambulacral halves, triangular proximally and rectangular distally.
   vv=[]
   for lower in [False,True]:
    for k in range(5):
     u=k/4;center=p+d*(length*(.03+.94*u));half=w*(.33+.22*u if t<.48 else .41);xx=si*w*.27
     for b in [-1,1]:vv.append(tuple(center+sd*(xx+b*half*.48)+up*(depth*(.93+.09*sin(pi*u)) if not lower else depth*.23)))
   ff=[]
   for off in [0,10]:
    for k in range(4):z=off+k*2;ff.append((z,z+1,z+3,z+2))
   for k in range(4):
    for b in [0,1]:z=k*2+b;ff.append((z,z+2,z+12,z+10))
   ff.extend([(0,10,11,1),(8,9,19,18)]);mesh(f'arm_{a}_{j:02d}_ambulacral_{si}',vv,ff,'ossicles',bone,sub=1)
   oval(f'arm_{a}_{j:02d}_lateral_{si}',c+sd*si*w*.82,(length*.42,w*.30,depth*.64),'ossicles',bone,N=12,K=8,axes=[d,sd,up])
   for k in range(3):
    start=c+sd*si*w*.96+d*(length*(k-1)*.15)+up*(depth*(.3-.38*k));sl=(.15+.065*sin(pi*t))*(1-t)**.67+.018;end=start+sd*si*sl*(.48+.18*k)+d*sl*(.71-.12*k)+up*sl*(.30-.25*k)
    tube(f'arm_{a}_{j:02d}_spine_{si}_{k}',[start,start.lerp(end,.45)+up*.008*(1-t),end],[.0075*(1-t)+.0015,.005*(1-t)+.001,.0006],'spines',bone,N=7)
   # Oral groove spines are flatter/shorter than exterior needle spines.
   start=c+sd*si*w*.35-up*depth*.60;end=start+sd*si*.025*(1-t)-up*(.045*(1-t)+.009)+d*.018
   tube(f'arm_{a}_{j:02d}_groove_spine_{si}',[start,start.lerp(end,.5),end],[.006*(1-t)+.001,.009*(1-t)+.001,.001],'spines',bone,N=7)
   # Small unsuckered podia near ventral groove; soft-part reconstruction, not a walking sole.
   if j%2==0:
    start=c+sd*si*w*.20-up*depth*.58;end=start-up*(.065*(1-t)+.01)+d*.02; tube(f'arm_{a}_{j:02d}_podium_{si}',[start,start.lerp(end,.55)+sd*.007*si,end],[.005*(1-t)+.001,.004*(1-t)+.001,.002],'podia',bone,N=7)
# Five mouth-angle ossicles/papillae surround actual central aperture, moved by separate radial bones.
for a in range(5):
 th=-pi/2+2*pi*(a+.5)/5;di=Vector((cos(th),sin(th),0));sd=Vector((-sin(th),cos(th),0));p=di*.184;p.z=-.104;bone=f'oral_angle_{a}'
 oval(f'oral_angle_ossicle_{a}',p,(.085,.048,.027),'underside',bone,N=24,K=12,axes=[di,sd,Vector((0,0,1))])
 for si in [-1,1]:
  start=di*.137+sd*si*.018;start.z=-.11;end=di*.104+sd*si*.011;end.z=-.12;tube(f'oral_papilla_{a}_{si}',[start,(start+end)/2,end],[.010,.009,.003],'ossicles',bone,N=10)
oval('oral_soft_pump',(0,0,.016),(.061,.061,.032),'oral','oral_pump',N=32,K=16)
# Consolidation keeps a compact draw graph while skin weights retain all anatomical joints.
def join(parts,name):
 if len(parts)<2:return
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();parts[0].name=name
 for o in parts[1:]:objects.remove(o)
join([o for o in objects if o.name.startswith('disc_granule')],'disc_ossicle_mosaic')
for a in range(5):join([o for o in objects if o.name.startswith(f'arm_{a}_') and 'integument'not in o.name],f'arm_{a}_articulated_ossicles_spines')
anchors=[('anchor_mouth','body',(0,0,-.115),'mouth'),('anchor_mouth_inside','oral_pump',(0,0,.006),'swallow'),('anchor_attack_primary','arm_0_28',tuple(ARMS[0][2][29]),'attack')]
for n,b,p,r in anchors:
 ob=bpy.data.objects.new(n,None);S.collection.objects.link(ob);ob.parent=rig;ob.parent_type='BONE';ob.parent_bone=b;ob.matrix_world=rig.matrix_world.copy();ob.matrix_world.translation=Vector(p);bpy.context.view_layer.update();ob.matrix_parent_inverse=(rig.matrix_world@rig.data.bones[b].matrix_local).inverted();ob.location=Vector(p);ob['cambrianAnchor']={'version':1,'role':r,'parentBone':b}
# Set exact bone-local position via full parent inverse, accounting for Blender bone-tail parenting.
for n,b,p,r in anchors:
 ob=bpy.data.objects[n];ob.matrix_parent_inverse.identity();ob.location=rig.data.bones[b].matrix_local.inverted()@Vector(p)-Vector((0,rig.data.bones[b].length,0));ob.rotation_euler=(0,0,0)
CLIPS={'Idle':72,'Crawl':72,'Swim':72,'TurnLeft':48,'TurnRight':48,'Dive':48,'Rise':48,'Attack':30,'Bite':15,'Heavy':33,'Hit':18,'Death':48,'Guard':30,'Parry':11,'Dodge':12,'Eat':48,'Stagger':36,'Ability':72,'Growth':45};LOOPS=['Idle','Crawl','Swim','Guard','Eat']
exec(compile((H/'animations.py').read_text(),str(H/'animations.py'),'exec'))
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
S.frame_set(1);bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(L/'furcaster.blend'));print('FURCASTER_SOURCE_READY',len(objects),len(spec),flush=True)
if os.environ.get('FUR_CLAY')!='1':exec(compile((H/'export.py').read_text(),str(H/'export.py'),'exec'))
