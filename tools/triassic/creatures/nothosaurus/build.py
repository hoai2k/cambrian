"""Rebuild Nothosaurus: measured voxel-volume puppet and authored Tripo skin, shared rig.
Blender 5.2. Geometry coordinates are raw Tripo metres before the final 5x engine transform.
"""
import bpy,bmesh,math,json,os,struct,hashlib,shutil,sys
import numpy as np
from mathutils import Vector,Matrix,Quaternion
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
LOCAL=os.path.join(ROOT,'local/triassic-authoring/nothosaurus'); OUT=os.path.join(ROOT,'public/assets/triassic/creatures'); os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
RAW=os.path.join(ROOT,'intake/triassic-tests/nothosaurus/nothosaurus.raw.glb'); ID='nothosaurus'
CLIPS={'Idle':2.4,'Swim':1.8,'Sprint':1.2,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.4,'Dodge':.5,'Eat':1.6,'Stagger':1.2,'Ability':1.0,'Grab':1.2,'Breath':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Sprint','Guard','Eat'];SCALE=5
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=RAW);auth=next(o for o in bpy.context.scene.objects if o.type=='MESH');auth.name='Nothosaurus authored body'
bpy.context.view_layer.objects.active=auth
# Weld texture seams for topology analysis, retaining loop UVs. Remove only tiny detached flakes.
bm=bmesh.new();bm.from_mesh(auth.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bm.verts.ensure_lookup_table();seen=set();components=[]
for v in bm.verts:
 if v in seen:continue
 stack=[v];seen.add(v);part=[]
 while stack:
  q=stack.pop();part.append(q)
  for e in q.link_edges:
   w=e.other_vert(q)
   if w not in seen:seen.add(w);stack.append(w)
 components.append(part)
removed=sum(len(c)for c in components if len(c)<8)
for c in components:
 if len(c)<8:bmesh.ops.delete(bm,geom=c,context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(auth.data);bm.free()
source_triangles=len(auth.data.polygons)
# Preserve the full original 2K albedo. White COLOR_0 enables runtime recoloring without
# multiplying the texture by a second baked copy of its own pigment. The generated normal
# texture has exaggerated crumpled relief at strength 1; retain only restrained microrelief.
mat=auth.data.materials[0];mat.name='Nothosaurus body pigmentation';bs=mat.node_tree.nodes.get('Principled BSDF');colnode=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.colorspace_settings.name=='sRGB');im=colnode.image
pixels=np.array(im.pixels[:],dtype=np.float32).reshape(im.size[1],im.size[0],4);uv=auth.data.uv_layers.active
layer=auth.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for item in layer.data:item.color=(1,1,1,1)
for link in list(mat.node_tree.links):
 if link.to_node==bs and link.to_socket.name in ['Metallic','Roughness']:mat.node_tree.links.remove(link)
bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.7
for n in mat.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.15
# Blender exposes this byte image as encoded sRGB samples; convert exactly once when
# writing linear vertex pigment on the puppet. Bilinear lookup follows texel centers.
def sample_albedo(u,v):
 h,w=pixels.shape[:2];x=(float(u)%1)*w-.5;y=(float(v)%1)*h-.5;x0=math.floor(x);y0=math.floor(y);fx=x-x0;fy=y-y0
 rgb=(pixels[y0%h,x0%w,:3]*(1-fx)*(1-fy)+pixels[y0%h,(x0+1)%w,:3]*fx*(1-fy)+pixels[(y0+1)%h,x0%w,:3]*(1-fx)*fy+pixels[(y0+1)%h,(x0+1)%w,:3]*fx*fy)
 linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4)
 return (*[float(x)for x in linear],1.)
# Measure the actual input volume, then resurface its occupancy field. This is regenerated topology,
# not the authored triangle mesh decimated into an LOD: no input vertex/face survives the remesh.
puppet=auth.copy();puppet.data=auth.data.copy();bpy.context.collection.objects.link(puppet);puppet.name='Nothosaurus procedural volume puppet'
bpy.context.view_layer.objects.active=puppet
puppet.data.remesh_voxel_size=.007;puppet.data.remesh_voxel_adaptivity=0;puppet.data.use_remesh_preserve_volume=True
bpy.ops.object.voxel_remesh()
mod=puppet.modifiers.new('Volume surface relaxation','SMOOTH');mod.factor=.45;mod.iterations=2;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=puppet.modifiers.new('Puppet topology budget','DECIMATE');mod.ratio=.22;bpy.ops.object.modifier_apply(modifier=mod.name)
# Transfer pigment from the nearest source triangle's own interpolated UV, never
# averaging unrelated atlas islands at welded seam vertices or using nearest-vertex colors.
from mathutils.geometry import barycentric_transform
bvh=BVHTree.FromPolygons([v.co for v in auth.data.vertices],[p.vertices[:]for p in auth.data.polygons],all_triangles=False)
if puppet.data.color_attributes.get('Color'):puppet.data.color_attributes.remove(puppet.data.color_attributes['Color'])
pl=puppet.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for v in puppet.data.vertices:
 hit=bvh.find_nearest(v.co);poly=auth.data.polygons[hit[2]];assert len(poly.vertices)==3
 p=[auth.data.vertices[j].co for j in poly.vertices];q=[Vector((*uv.data[j].uv,0))for j in poly.loop_indices]
 sample=barycentric_transform(hit[0],p[0],p[1],p[2],q[0],q[1],q[2]);pl.data[v.index].color=sample_albedo(sample.x,sample.y)
pmat=bpy.data.materials.new('Nothosaurus puppet body');pmat.use_nodes=True;pbs=pmat.node_tree.nodes.get('Principled BSDF');pvc=pmat.node_tree.nodes.new('ShaderNodeVertexColor');pvc.layer_name='Color';pmat.node_tree.links.new(pvc.outputs['Color'],pbs.inputs['Base Color']);pbs.inputs['Roughness'].default_value=.74;puppet.data.materials.clear();puppet.data.materials.append(pmat)
for p in puppet.data.polygons:p.material_index=0
# In raw space: X is snoutward, Z up, Y sideways. Global bone axes kept consistent.
CENTERS=[(-.50,.331,.062),(-.44,.267,.038),(-.38,.210,.006),(-.32,.157,-.015),(-.26,.104,-.031),(-.20,.060,-.044),(-.14,.023,-.046),(-.08,.006,-.046),(0,.0,-.031),(.1,-.004,-.034),(.2,-.009,-.029),(.28,-.02,.002),(.34,-.039,.064),(.4,-.057,.087),(.5,-.091,.085)]
def center(x):return Vector([x]+[float(np.interp(x,[p[0]for p in CENTERS],[p[k]for p in CENTERS]))for k in [1,2]])
def tx(p):x,y,z=p;return Vector((y*SCALE,-x*SCALE,z*SCALE))
B={}
def bone(n,p,parent):B[n]=(Vector(p),parent)
bone('root',(0,0,0),None);bone('body',(.06,0,-.035),'root');bone('chest',(.19,-.008,-.025),'body');bone('neck_base',(.265,-.013,.004),'chest');bone('neck_mid',(.303,-.025,.043),'neck_base');bone('neck_tip',(.336,-.038,.074),'neck_mid');bone('skull',(.355,-.04,.086),'neck_tip');bone('jaw',(.36,-.044,.084),'skull')
for i,x in enumerate([-.035,-.10,-.17,-.24,-.31,-.38,-.445]):bone('tail_%02d'%i,center(x),'body'if i==0 else'tail_%02d'%(i-1))
LIMBS={}
for side in [-1,1]:
 s='L'if side>0 else'R'
 for kind,x,yy in [('fore',.235,.315 if side<0 else .28),('hind',-.075,.265 if side<0 else .275)]:
  pts=[(x,side*.070,-.055),(x+(.007 if kind=='fore'else-.012),side*.155,-.066),(x+(.005 if kind=='fore'else-.012),side*.224,-.060),(x+(.003 if kind=='fore'else-.019),side*yy,-.061)]
  names=[kind+'_upper_'+s,kind+'_lower_'+s,kind+'_paddle_'+s];LIMBS[kind+s]=(pts,names)
  for i,n in enumerate(names):bone(n,pts[i],('chest'if kind=='fore'else'tail_00')if i==0 else names[i-1])
# Cut a true articulated lower jaw along the mouth seam for both bodies, preserving the exterior.
def seam(x):return .084-.010*(x-.36)
jawparts={}
def split_jaw(o):
 bm=bmesh.new();bm.from_mesh(o.data)
 # Make both boundary planes explicit before splitting; no triangles straddle the hinge.
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=(.355,0,0),plane_no=(1,0,0),clear_inner=False,clear_outer=False)
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=(.36,0,seam(.36)),plane_no=(.01,0,1),clear_inner=False,clear_outer=False)
 bm.to_mesh(o.data);bm.free()
 jaw=o.copy();jaw.data=o.data.copy();jaw.name=o.name+' lower jaw';bpy.context.collection.objects.link(jaw)
 for target,keep_lower in [(o,False),(jaw,True)]:
  bm=bmesh.new();bm.from_mesh(target.data)
  discard=[]
  for f in bm.faces:
   c=f.calc_center_median();lower=c.x>.355 and c.z<seam(c.x)-1e-7
   if lower!=keep_lower:discard.append(f)
  bmesh.ops.delete(bm,geom=discard,context='FACES')
  loose=[v for v in bm.verts if not v.link_faces]
  if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
  bm.to_mesh(target.data);bm.free()
 jawparts[o.name]=jaw
for o in [auth,puppet]:split_jaw(o)
# Region-restricted skin: trunk blends longitudinally, limbs radially blend into their own root.
AXIAL=[('tail_06',-.48),('tail_05',-.412),('tail_04',-.345),('tail_03',-.275),('tail_02',-.205),('tail_01',-.135),('tail_00',-.066),('body',.064),('chest',.22),('neck_base',.277),('neck_mid',.316),('neck_tip',.343),('skull',.385)]
def axial(x):
 xs=[v for _,v in AXIAL]
 if x<=xs[0]:return {AXIAL[0][0]:1.}
 if x>=xs[-1]:return {AXIAL[-1][0]:1.}
 i=int(np.searchsorted(xs,x))-1;t=(x-xs[i])/(xs[i+1]-xs[i]);return {AXIAL[i][0]:1-t,AXIAL[i+1][0]:t}
def weights(p,isjaw=False):
 x,y,z=p
 if isjaw:return {'jaw':1.}
 if x>.355:return {'skull':1.}
 w=axial(x)
 for key,(pts,names) in LIMBS.items():
  s=1 if key.endswith('L')else-1
  if s*y<.06:continue
  if not ((.165<x<.34)if key.startswith('fore')else(-.15<x<.022)):continue
  # Root starts 30% inside the visible torso; geometric smoothstep closes the attachment.
  t=max(0,min(1,(s*y-.073)/.072));blend=t*t*(3-2*t)
  if blend==0:continue
  d=s*y
  if d<.13:limb={names[0]:1.}
  elif d<.196:
   v=(d-.13)/.066;limb={names[0]:1-v,names[1]:v}
  else:
   v=max(0,min(1,(d-.196)/.049));limb={names[1]:1-v,names[2]:v}
  w={n:v*(1-blend)for n,v in w.items()};w.update({n:v*blend for n,v in limb.items()});break
 w={n:v for n,v in w.items()if v>1e-8};items=sorted(w.items(),key=lambda x:-x[1])[:4];total=sum(v for _,v in items);return {n:v/total for n,v in items}
arm=bpy.data.armatures.new('Nothosaurus shared skeleton');rig=bpy.data.objects.new('Nothosaurus_Rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,(p,parent) in B.items():
 eb=arm.edit_bones.new(n);eb.head=tx(p);eb.tail=eb.head+Vector((0,.16,0))
 if parent:eb.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
for o in [auth,puppet]:
 for n in B:o.vertex_groups.new(name=n)
 for v in o.data.vertices:
  for n,w in weights(v.co).items():o.vertex_groups[n].add([v.index],w,'REPLACE')
 for v in o.data.vertices:v.co=tx(v.co)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Shared articulated skeleton','ARMATURE');mod.object=rig;o.parent=rig
for o in jawparts.values():
 g=o.vertex_groups.new(name='jaw');g.add(list(range(len(o.data.vertices))),1.,'REPLACE')
 for v in o.data.vertices:v.co=tx(v.co)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Rigid lower jaw','ARMATURE');mod.object=rig;o.parent=rig
# Interior oral floor and roof close the visible opening; both copies share exact rigid placement.
def oral(name,z,bone_name,material):
 # Closed inner tissue follows the same curved snout centerline as the source.
 verts=[];faces=[]
 for i in range(18):
  u=i/17;x=.361+.134*u;cy=float(np.interp(x,[.36,.40,.44,.48,.50],[-.045,-.055,-.071,-.087,-.091]));width=.021*(sin(pi*u)**.5)+.002
  for j in range(12):
   theta=j*2*pi/12;verts.append(tx((x,cy+width*cos(theta),seam(x)+(z-.084)+.0015*sin(theta))))
 for i in range(17):
  for j in range(12):a=i*12+j;b=i*12+(j+1)%12;faces.append((a,b,b+12,a+12))
 faces.append(tuple(reversed(range(12))));faces.append(tuple(range(17*12,18*12)))
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
 o.location=(0,0,0);o.data.materials.append(material);g=o.vertex_groups.new(name=bone_name);g.add(list(range(len(o.data.vertices))),1,'REPLACE');o.parent=rig;mo=o.modifiers.new('Jaw articulation','ARMATURE');mo.object=rig
 for p in o.data.polygons:p.use_smooth=True
 return o
mouthmat=bpy.data.materials.new('Nothosaurus mouth interior');mouthmat.diffuse_color=(.075,.032,.025,1);mouthmat.use_nodes=True;mouthmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.075,.032,.025,1)
oralparts=[oral('Oral floor',.083,'jaw',mouthmat),oral('Palate',.085,'skull',mouthmat)]
# A small closed cheek envelope surrounds the actual jaw hinge and follows both lips.
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=tx((.354,-.043,.076)))
o=bpy.context.object;o.name='Seated jaw hinge tissue';o.scale=(.155,.11,.105);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for v in o.data.vertices:v.co=o.matrix_world@v.co
o.location=(0,0,0);o.parent=rig
hm=bpy.data.materials.new('Nothosaurus jaw hinge body');hm.diffuse_color=(.28,.26,.20,1);hm.use_nodes=True;hbs=hm.node_tree.nodes.get('Principled BSDF');hbs.inputs['Base Color'].default_value=(.28,.26,.20,1);hbs.inputs['Roughness'].default_value=.7;o.data.materials.append(hm)
for n in ['skull','jaw']:o.vertex_groups.new(name=n)
for v in o.data.vertices:
 t=max(0,min(1,(.395-v.co.z)/.1));o.vertex_groups['jaw'].add([v.index],t*.5,'REPLACE');o.vertex_groups['skull'].add([v.index],1-t*.5,'REPLACE')
for p in o.data.polygons:p.use_smooth=True
mo=o.modifiers.new('Hinge skin','ARMATURE');mo.object=rig;oralparts.append(o)

# Measured/profile evidence compares both surfaces in rest; nearest-distance works for asymmetry.
rawco=np.array([v.co[:]for v in auth.data.vertices]);pco=np.array([v.co[:]for v in puppet.data.vertices]);pv=BVHTree.FromPolygons([v.co for v in puppet.data.vertices],[p.vertices[:]for p in puppet.data.polygons]);distances=[pv.find_nearest(v.co)[3]for v in auth.data.vertices]
def section(objects,y):
 points=[]
 for o in objects:
  for e in o.data.edges:
   a,b=[o.data.vertices[j].co for j in e.vertices]
   if (a.y-y)*(b.y-y)<=0 and abs(a.y-b.y)>1e-8:points.append(a+(b-a)*((y-a.y)/(b.y-a.y)))
 if not points:return None
 a=np.array(points);return {'min':a.min(0).tolist(),'max':a.max(0).tolist()}
profile=[]
for y in np.linspace(-2.45,2.45,21):
 row={'stationY':float(y)}
 for label,o in [('authored',auth),('puppet',puppet)]:row[label]=section([o,jawparts[o.name]],y)
 if row['authored'] and row['puppet']:
  row['maximumEnvelopeDifference']=max(abs(a-b)for k in ['min','max']for a,b in zip(row['authored'][k],row['puppet'][k]));assert row['maximumEnvelopeDifference']<.2,row
 profile.append(row)
open(os.path.join(HERE,'nothosaurus-profile.json'),'w').write(json.dumps({'method':'21 exact plane-intersection envelopes; asymmetry retained; 0.007 raw-space voxel occupancy resurfacing','bodyLength':5,'stations':profile,'surfaceDistanceMax':max(distances),'surfaceDistanceP95':float(np.quantile(distances,.95)),'surfaceTolerance':.2},indent=2))
assert max(distances)<.2
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
  amp={'Idle':.28,'Swim':1.0,'Sprint':1.45,'Eat':.14,'Guard':.12,'Dodge':1.15,'Ability':.25,'Grab':.2,'Breath':.7}.get(clip,.23)
  peak=sin(pi*(u-.24)/.4)**2 if .24<u<.64 else 0;wind=sin(pi*u/.28)**2 if u<.28 else 0;dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.01*(1-cos(p))if loop else 0
  if clip=='Eat':opening=.19*(1-cos(p*2))
  if clip=='Bite':opening=.46*sin(pi*u)**2
  if clip=='Attack':opening=.40*wind+.18*peak
  if clip=='Heavy':opening=.5*wind+.08*peak
  if clip=='Ability':opening=.38*wind+.025*e
  if clip=='Grab':opening=.025*e
  opening+=.12*dead
  pb['jaw'].rotation_euler.x=opening;pb['skull'].rotation_euler.x=-.05*opening
  body=pb['body'];body.rotation_euler.y=.025*amp*wave(.3);body.location.z=.018*amp*wave(.2)
  turn=(-1 if clip=='TurnLeft'else 1)*e if clip in ['TurnLeft','TurnRight']else 0
  body.rotation_euler.z=.22*turn;body.rotation_euler.y+=.13*turn
  if clip in ['Dive','Rise']:body.rotation_euler.x=(1 if clip=='Dive'else-1)*.22*e
  if clip=='Attack':body.location.y=.08*wind-.28*peak;body.rotation_euler.x=.09*wind-.05*peak
  if clip=='Heavy':body.rotation_euler.z=-.1*wind+.2*peak;body.location.y=.14*wind-.22*peak
  if clip=='Parry':body.rotation_euler.z=.24*e;body.rotation_euler.y=-.21*e
  if clip=='Guard':body.rotation_euler.x=.05*(1-cos(p));body.rotation_euler.y=.025*sin(p)
  if clip=='Dodge':body.rotation_euler.y=.43*e;body.rotation_euler.z=-.35*e;body.location.x=.27*e
  if clip in ['Hit','Stagger']:body.rotation_euler.z=.18*e*sin(p*(1 if clip=='Hit'else 2));body.rotation_euler.y=.22*e;body.location.y=.12*e
  if clip=='Breath':body.rotation_euler.x=-.28*e;body.location.z=.20*e;body.rotation_euler.z=.1*e*sin(p)
  if clip=='Ability':body.location.y=-.20*e;body.rotation_euler.z=.035*e*sin(p*2)
  if clip=='Grab':body.location.y=.10*e;body.rotation_euler.z=.075*e*sin(p*3)
  if clip=='Growth':body.rotation_euler.x=-.045*e;body.rotation_euler.y=.04*e
  body.rotation_euler.y+=1.18*dead;body.rotation_euler.x+=.10*dead;body.location.z-=.18*dead
  pb['chest'].rotation_euler.z=.022*amp*wave(.5)+.075*turn
  for j,n in enumerate(['neck_base','neck_mid','neck_tip']):
   pb[n].rotation_euler.z=.025*amp*wave(.9+j*.4)+.04*turn
   pb[n].rotation_euler.x=-.04*wind+.055*peak if clip in ['Attack','Heavy']else(-.055*e if clip=='Breath'else .008*wave(j*.4))
  if clip in ['Ability','Grab']:
   pb['neck_mid'].rotation_euler.z=.055*e*sin(p*(2 if clip=='Ability'else 3));pb['neck_tip'].rotation_euler.x=.04*e
  for i in range(7):
   q=pb['tail_%02d'%i];q.rotation_euler.z=(.045+i*.012)*amp*wave(i*.48,2 if clip in ['Swim','Sprint']else 1)+.045*dead*sin(i*.7)+turn*(.022+i*.008)
   if clip=='Dodge':q.rotation_euler.z+=.13*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.07*peak
  for key,(pts,names) in LIMBS.items():
   s=1 if key.endswith('L')else-1;hind=key.startswith('hind');lag=(pi if hind else 0)+(.12 if s<0 else 0);q=pb[names[0]]
   # Rowing power stroke + feathered recovery; fore and hind pairs alternate.
   q.rotation_euler.z=s*(.27*amp*wave(lag,2 if clip in ['Swim','Sprint']else 1)-.12*dead)
   q.rotation_euler.y=s*(.13*amp*wave(lag+pi/2,2 if clip in ['Swim','Sprint']else 1)+.16*dead)
   pb[names[1]].rotation_euler.z=s*.13*amp*wave(lag+.7,2 if clip in ['Swim','Sprint']else 1)
   pb[names[2]].rotation_euler.y=s*(.19*amp*wave(lag+1.3,2 if clip in ['Swim','Sprint']else 1)+.12*dead)
   if clip=='Guard':q.rotation_euler.z-=s*.17*(1-cos(p))
   if clip=='Growth':q.rotation_euler.y-=s*.23*e
   if clip=='Dodge':q.rotation_euler.y+=s*(.28 if s==1 else-.1)*e
   if clip in ['Attack','Heavy']:q.rotation_euler.z+=s*(.12*wind-.21*peak)
  state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb])
  if f==0:first=state.copy()
  if f==last:seams[clip]=float(abs(state-first).max())
  for q in pb:
   if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
   if q.name=='body':q.keyframe_insert('location',frame=f)
 points=[]
 for f in np.linspace(0,last,13):
  scene.frame_set(int(f));dg=bpy.context.evaluated_depsgraph_get()
  for o in [auth,puppet]+list(jawparts.values()):
   ev=o.evaluated_get(dg);me=ev.to_mesh();co=np.array([v.co[:]for v in me.vertices]);assert np.isfinite(co).all();points.extend([co.min(0),co.max(0)]);ev.to_mesh_clear()
 bounds[clip]=[np.array(points).min(0).tolist(),np.array(points).max(0).tolist()];rig.animation_data.action=None
for c in set(CLIPS)-{'Death'}:assert seams[c]<1e-6
reset();scene.frame_set(0)
anchors=[{'name':'anchor_mouth','bone':'jaw','point':list(tx((.495,-.088,.081))),'role':'mouth'},{'name':'anchor_mouth_inside','bone':'skull','point':list(tx((.366,-.047,.082))),'role':'swallow'},{'name':'anchor_attack_primary','bone':'skull','point':list(tx((.501,-.087,.077))),'role':'attack'}]
sockets=[]
for a in anchors:
 o=bpy.data.objects.new(a['name'],None);bpy.context.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=a['bone'];o.matrix_world.translation=Vector(a['point']);o['cambrianAnchor']={'version':1,'role':a['role'],'parentBone':a['bone']};sockets.append(o)
open(os.path.join(HERE,'anchors.json'),'w').write(json.dumps({ID:anchors},indent=2))
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
def patch(path):
 raw=open(path,'rb').read();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[20+n:];nodes=g['nodes'];parents={c:i for i,n in enumerate(nodes)for c in n.get('children',[])}
 def world(i):
  no=nodes[i];q=no.get('rotation',[0,0,0,1]);m=Matrix(np.array(no['matrix']).reshape(4,4).T.tolist())if'matrix'in no else Matrix.LocRotScale(Vector(no.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(no.get('scale',[1,1,1])))
  return world(parents[i])@m if i in parents else m
 for a in anchors:
  i=next(i for i,n in enumerate(nodes)if n.get('name')==a['name']);b=next(i for i,n in enumerate(nodes)if n.get('name')==a['bone']);p=a['point'];p=Vector((p[0],p[2],-p[1]));local=world(b).inverted()@p
  if i in parents:nodes[parents[i]]['children'].remove(i)
  nodes[b].setdefault('children',[]).append(i);nodes[i]={'name':a['name'],'translation':list(local),'extras':{'cambrianAnchor':{'version':1,'role':a['role'],'parentBone':a['bone']}}}
 for a in g['animations']:a['channels']=[c for c in a['channels']if c['target']['path']!='scale' and nodes[c['target']['node']].get('name')!='root']
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);open(path,'wb').write(struct.pack('<III',0x46546c67,2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary)
for o,suffix in [(auth,''),(puppet,'.puppet')]:
 bpy.ops.object.select_all(action='DESELECT')
 for p in [o,jawparts[o.name],rig]+sockets+oralparts:p.select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+suffix+'.glb'),**kwargs);patch(os.path.join(OUT,ID+suffix+'.glb'))
shutil.copyfile(os.path.join(OUT,ID+'.puppet.glb'),os.path.join(OUT,ID+'.lod1.glb'))
meta={'id':ID,'name':'Nothosaurus','species':'Nothosaurus giganteus','description':'Canonical Tripo body and procedural volume twin with identical articulated rowing, tail, neck and jaw rig.','modelLength':5,'lengthMeters':6,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'puppet':'nothosaurus.puppet.glb','notes':['The curved tail and asymmetric paddle stance are retained from the accepted Tripo volume.','The procedural twin resurfaces a 0.007-unit voxel occupancy field, relaxes it and reduces the new topology. It does not reuse source vertices or faces.','Same rest rig, inverse binds, sockets and all 21 action sample arrays are used for authored and puppet. LOD deliberately retains all clips.','Original albedo retained with white COLOR_0; normal relief limited to 0.15 and skin set explicitly nonmetallic at roughness 0.7. Puppet pigment samples triangle-local UVs to avoid seam bleed. True jaw split and internal oral surfaces added; connected foot webbing retained.','Living colours, soft tissues and movements are artistic reconstruction. Ability performs the roster fang-trap clamp; Grab braces and tugs the held prey. Breath provides a separate in-place surface-breath/dive gesture. Locomotor translation remains engine-owned.']}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'sourceSha256':hashlib.sha256(open(RAW,'rb').read()).hexdigest(),'sourceTriangles':source_triangles,'removedFlakeVertices':removed,'fullTriangles':sum(len(p.vertices)-2 for p in auth.data.polygons)+sum(len(p.vertices)-2 for p in jawparts[auth.name].data.polygons)+sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in oralparts),'puppetTriangles':sum(len(p.vertices)-2 for p in puppet.data.polygons)+sum(len(p.vertices)-2 for p in jawparts[puppet.name].data.polygons)+sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in oralparts),'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAt13Phases':bounds,'surfaceDistanceMax':max(distances),'surfaceDistanceP95':float(np.quantile(distances,.95)),'profileTolerance':.2,'normalizedWeights':True,'rootStable':True,'noScaleChannels':True}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Save editable source with both renderable bodies. Export selection is the only difference.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,'nothosaurus-paired.blend'))
print('NOTHOSAURUS_REPORT',json.dumps(report))
