"""Shonisaurus measured-volume puppet and authored intake on one literal rig.
Blender 5.2; run from repository root. Raw input is immutable.
"""
import bpy,bmesh,json,math,hashlib,sys
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from pathlib import Path
from math import sin,cos,pi
P=Path.cwd();HERE=P/'tools/triassic/creatures/shonisaurus';LOCAL=P/'local/triassic-authoring/shonisaurus';OUT=P/'public/assets/triassic/creatures';REVIEW=LOCAL/'review'
for d in [HERE,LOCAL,OUT,REVIEW]:d.mkdir(parents=True,exist_ok=True)
S=6.; CLOSED_REST_ANGLE=-.155; RAW=HERE/'tripo-raw/shonisaurus.raw.glb'
def vworld(v):return Vector((-v[0]*S,-v[1]*S,v[2]*S))
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def ramp(x,a,b):return smooth((x-a)/(b-a))
def blend(a,b,t):
 o={n:w*(1-t)for n,w in a.items()}
 for n,w in b.items():o[n]=o.get(n,0)+w*t
 return {n:w for n,w in o.items()if w>1e-7}
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(RAW))
source=next(o for o in bpy.context.scene.objects if o.type=='MESH');source.name='Shonisaurus authored skin'
bpy.context.view_layer.objects.active=source;source.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Source stores a few disconnected tooth fragments. Retain teeth; dissolve only tiny
# underside components at the chin, never a volume or limb.
bm=bmesh.new();bm.from_mesh(source.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bm.to_mesh(source.data);bm.free()
# Remove the small ventral rostral chip by seating only outliers back onto the
# measured smooth chin envelope. This bounded intake surgery precedes measurement.
chin_count=0;chin_max=0.
for vertex in source.data.vertices:
 x,y,z=vertex.co
 if .335<y<.493 and abs(x)<.022:
  floor=float(np.interp(y,[.335,.36,.40,.44,.48,.493],[-.046,-.0365,-.0275,-.022,-.0175,-.0145]))
  if z<floor and floor-z<.005:
   chin_count+=1;chin_max=max(chin_max,floor-z);vertex.co.z=floor
source.data.calc_loop_triangles();points=np.array([v.co[:]for v in source.data.vertices]);faces=[tuple(p.vertices)for p in source.data.polygons];raw_triangles=sum(len(p)-2 for p in faces)
bvh=BVHTree.FromPolygons([Vector(p)for p in points],faces,all_triangles=False)
mat=source.data.materials[0];mat.name='Body skin';tex=next(n for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image and n.image.name.startswith('Color'))
im=tex.image;pix=np.empty(len(im.pixels),np.float32);im.pixels.foreach_get(pix);pix=pix.reshape(im.size[1],im.size[0],4)
def sample(uv):
 uv=np.asarray(uv);x=np.clip(uv[:,0]*im.size[0]-.5,0,im.size[0]-1);y=np.clip(uv[:,1]*im.size[1]-.5,0,im.size[1]-1);a=x.astype(int);b=y.astype(int);c=np.minimum(a+1,im.size[0]-1);d=np.minimum(b+1,im.size[1]-1);u=(x-a)[:,None];v=(y-b)[:,None]
 return (pix[b,a]*(1-u)*(1-v)+pix[b,c]*u*(1-v)+pix[d,a]*(1-u)*v+pix[d,c]*u*v)
def bake(ob):
 uv=np.array([l.uv[:]for l in ob.data.uv_layers.active.data]);colors=sample(uv);colors[:,3]=1
 attr=ob.data.color_attributes.get('Color')or ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER');attr.data.foreach_set('color_srgb',colors.ravel());return colors
original_colors=bake(source);vertex_colors=np.zeros((len(points),4));counts=np.zeros(len(points))
for i,l in enumerate(source.data.loops):vertex_colors[l.vertex_index]+=original_colors[i];counts[l.vertex_index]+=1
vertex_colors/=np.maximum(counts[:,None],1)
kd=KDTree(len(points))
for i,p in enumerate(points):kd.insert(p,i)
kd.balance()
def nearest_color(p):
 hits=kd.find_n(Vector(p),3);ws=np.array([1/(d+1e-5)**2 for co,i,d in hits]);return (np.array([vertex_colors[i]for co,i,d in hits])*ws[:,None]).sum(0)/ws.sum()
# Measured radial loft: first surface from an interior station deliberately excludes
# flippers beyond the flank. Each flipper gets its own spanwise volume loft below.
profile=[];objects=[]
def mesh(name,verts,faces,color=True):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 if color:
  at=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');at.data.foreach_set('color_srgb',np.array([nearest_color(v)for v in verts]).ravel())
 return o
def loft(name,rings):
 n=len(rings[0]);verts=[p for r in rings for p in r];faces=[]
 for j in range(len(rings)-1):
  for k in range(n):a=j*n+k;b=j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
 faces.append(tuple(reversed(range(n))));faces.append(tuple((len(rings)-1)*n+k for k in range(n)))
 return mesh(name,verts,faces)
def ray(origin,direction,fallback):
 h=bvh.ray_cast(Vector(origin),Vector(direction),1.)
 return list(h[0]) if h[0]is not None else list(Vector(origin)+Vector(direction)*fallback)
# Raw +Y is rostral. Thin caudal needs a shifted internal centre behind the peduncle.
center_rows=[(-.5,.115),(-.47,.115),(-.44,.115),(-.40,.111),(-.36,.106),(-.33,.092),(-.28,.077),(-.2,.057),(-.1,.028),(0,.008),(.1,-.005),(.2,-.008),(.27,0),(.32,.001)]
ys=np.unique(np.r_[np.linspace(-.395,.32,58),[-.37,-.035,-.02,.185,.26]])
rings=[]
for y in ys:
 z=float(np.interp(y,[p[0]for p in center_rows],[p[1]for p in center_rows]));ring=[]
 for k in range(32):
  th=2*pi*k/32;direction=Vector((cos(th),0,sin(th)));origin=Vector((0,y,z));p=Vector(ray(origin,direction,.003))
  if (-.20<y<-.065)or(.17<y<.275):
   width=(Vector(ray(origin,(1,0,0),.08))-origin).length
   height=(Vector(ray(origin,(0,0,1 if sin(th)>0 else -1),.1))-origin).length
   limit=1.015/((cos(th)/max(width,.01))**2+(sin(th)/max(height,.01))**2)**.5
   if (p-origin).length>limit:p=origin+direction*limit
  ring.append(list(p))
 rings.append(ring);profile.append({'axis':'body','station':float(y),'center':[0,float(y),z],'ring':ring})
body=loft('Puppet measured trunk',rings)
# Crescent caudal is a vertical spanwise loft. Its concave trailing edge cannot
# be represented by an axial radial tube without filling the crescent notch.
rings=[]
for z in np.linspace(-.013,.241,31):
 near=points[(abs(points[:,2]-z)<.008)&(points[:,1]<-.348)]
 if len(near)<3:near=points[(abs(points[:,2]-z)<.015)&(points[:,1]<-.348)]
 ymin=float(near[:,1].min());ymax=float(near[:,1].max());cy=(ymin+ymax)/2;half=(ymax-ymin)/2
 thick=max(.002,min(.012,float(np.quantile(abs(near[:,0]),.9))))
 ring=[(thick*cos(2*pi*k/12),cy+half*sin(2*pi*k/12),float(z))for k in range(12)]
 rings.append(ring);profile.append({'axis':'caudal','station':float(z),'center':[0,cy,float(z)],'ring':ring})
loft('Puppet measured crescent caudal',rings)
# Two separate rostral branches retain the actual mouth gap instead of filling it.
for branch,zs in [('upper',[.017,.016,.017]),('lower',[-.025,-.019,-.013])]:
 rings=[]
 for y in np.linspace(.317,.495 if branch=='lower'else .498,18):
  z=float(np.interp(y,[.317,.4,.498],zs));ring=[]
  for k in range(16):
   th=2*pi*k/16;p=ray((0,y,z),(cos(th),0,sin(th)),.002)
   # The lower rostrum ends before the upper tip. Rays through empty space must
   # never catch the opposite jaw and become a spike when the mandible closes.
   if branch=='lower':p[2]=min(p[2],float(np.interp(y,[.317,.335,.37,.40,.495],[-.019,-.013,-.006,-.004,-.0047])))
   ring.append(p)
  rings.append(ring);profile.append({'axis':branch,'station':float(y),'center':[0,float(y),z],'ring':ring})
 o=loft('Puppet '+branch+' rostrum',rings);o['region']=branch
# Spanwise flipper sections, fitted independently to the actual long fins.
for kind,xstart,xend,ylo,yhi in [('pectoral',.060,.315,.17,.274),('pelvic',.030,.154,-.19,-.07)]:
 for side in [-1,1]:
  rings=[]
  for x in np.linspace(xstart,xend,15):
   near=points[(np.abs(points[:,0]-x*side)<.009)&(points[:,1]>ylo)&(points[:,1]<yhi)]
   if len(near)<3:near=points[(np.abs(points[:,0]-x*side)<.016)&(points[:,1]>ylo)&(points[:,1]<yhi)]
   expected=(-.006-.74*x)if kind=='pectoral'else(.077-1.30*x)
   filtered=near[abs(near[:,2]-expected)<.032]
   if len(filtered)>3:near=filtered
   ymin=float(near[:,1].min());ymax=float(near[:,1].max());y=(ymin+ymax)/2
   slope,offset=np.polyfit(near[:,1],near[:,2],1)if len(near)>3 else(0,float(np.median(near[:,2])))
   slope=float(np.clip(slope,-.8,.8));z=float(np.median(near[:,2]-slope*(near[:,1]-y)))
   half=max(.002,(ymax-ymin)/2);thick=max(.0015,min(.008,float(np.quantile(abs(near[:,2]-(z+slope*(near[:,1]-y))),.9))))
   ring=[]
   for k in range(12):
    th=2*pi*k/12;dy=half*cos(th);ring.append((x*side,y+dy,z+slope*dy+thick*sin(th)))
   rings.append(ring);profile.append({'axis':kind+str(side),'station':float(x),'center':[float(x*side),y,z],'ring':ring})
  loft('Puppet '+kind+(' L'if side==-1 else' R'),rings)
puppets=list(objects)
(HERE/'measured-profile.json').write_text(json.dumps({'units':'raw normalized length; Blender XYZ, head +Y','scale':S,'method':'interior radial first-hit body sections; separate paired spanwise fin sections and oral branches','sections':profile},indent=2)+'\n')
# Color authority is the Tripo albedo baked once into linear vertex pigment.
# A simple subdivision adds pigmentation samples without changing the authored shape.
bpy.ops.object.select_all(action='DESELECT');source.select_set(True);bpy.context.view_layer.objects.active=source
sub=source.modifiers.new('Pigment sampling density','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;bpy.ops.object.modifier_apply(modifier=sub.name);bake(source)
bsdf=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for link in list(bsdf.inputs['Base Color'].links):mat.node_tree.links.remove(link)
vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bsdf.inputs['Base Color']);bsdf.inputs['Metallic'].default_value=0;bsdf.inputs['Roughness'].default_value=.62
for input in ['Metallic','Roughness']:
 for link in list(bsdf.inputs[input].links):mat.node_tree.links.remove(link)
pm=mat.copy();pm.name='Body skin puppet';pbs=next(n for n in pm.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
for link in list(pbs.inputs['Normal'].links):pm.node_tree.links.remove(link)
for o in puppets:o.data.materials.append(pm)
# Palate, floor, throat and lateral buccal walls are anatomical meshes with exact
# skull/jaw ownership. They overlap the imported lip rims inside the mouth.
def solidmat(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.58;return m
oralmat=solidmat('Oral underside',(.075,.028,.031))
oral=[]
for part,zbase in [('palate',.003),('floor',-.011)]:
 verts=[];faces=[]
 for j,y in enumerate(np.linspace(.326,.478,18)):
  w=float(np.interp(y,[.326,.36,.42,.492],[.042,.027,.016,.005]))*.83
  for k in range(9):
   t=k/8*2-1;z=zbase+(.010 if part=='palate'else -.010)*(1-t*t)+(.006*(y-.326)/.166);verts.append((t*w,y,z))
 for j in range(17):
  for k in range(8):a=j*9+k;faces.append((a,a+1,a+10,a+9))
 o=mesh('Oral '+part,verts,faces,False);o.data.materials.append(oralmat);o['region']=part;oral.append(o)
verts=[];faces=[]
for j,y in enumerate(np.linspace(.321,.367,7)):
 w=float(np.interp(y,[.321,.367],[.042,.025]))*.84
 for k in range(12):
  th=2*pi*k/12;verts.append((w*cos(th),y,-.005+.013*sin(th)))
for j in range(6):
 for k in range(12):a=j*12+k;b=j*12+(k+1)%12;faces.append((a,b,b+12,a+12))
faces.append(tuple(reversed(range(12))))
o=mesh('Oral throat and cheeks',verts,faces,False);o.data.materials.append(oralmat);o['region']='throat';oral.append(o)
# Seated ocular globes and inset pupils are shared anatomical parts. Measured dark
# eye feature center: (+/-0.049, 0.343, 0.021), center inset by 0.003 length.
eye_mat=solidmat('Eyes dark globe',(.018,.023,.02));iris_mat=solidmat('Eyes bronze iris',(.065,.059,.034));pupil_mat=solidmat('Eyes black pupil',(.003,.004,.004))
for sign in [-1,1]:
 for kind,loc,scale,material in [('globe',(sign*.0512,.337,.014),(.006,.0075,.0075),eye_mat),('iris',(sign*.056,.337,.014),(.0018,.0052,.0052),iris_mat),('pupil',(sign*.0574,.337,.014),(.0009,.0026,.0026),pupil_mat)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,location=loc);o=bpy.context.object;o.name='Eye '+kind+(' L'if sign<0 else' R');o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.data.materials.append(material);o['region']='upper';oral.append(o)
# Small conical teeth lie inside the existing rim and follow upper/lower owners.
tooth_mat=solidmat('Teeth accent',(.53,.49,.34))
for upper in [True,False]:
 verts=[];faces=[]
 for sign in [-1,1]:
  for j,y in enumerate(np.linspace(.381,.482,17)):
   width=float(np.interp(y,[.381,.42,.482],[.024,.017,.007]))*.83
   z=(.006+.011*(y-.381)/.101)if upper else(-.010+.003*(y-.381)/.101)
   rad=.0012*(1-.35*j/17);height=.0038*(1-.30*j/17);start=len(verts)
   for k in range(6):th=2*pi*k/6;verts.append((sign*width+rad*cos(th),float(y)+rad*sin(th),z))
   verts.append((sign*width,float(y),z+(-height if upper else height)))
   for k in range(6):faces.append((start+k,start+(k+1)%6,start+6))
   faces.append(tuple(start+k for k in reversed(range(6))))
 o=mesh('Upper teeth'if upper else'Lower teeth',verts,faces,False);o.data.materials.append(tooth_mat);o['region']='palate'if upper else'floor';oral.append(o)
# One armature is created from the puppet stations and reused for BOTH exports.
B={}
def bone(n,p,parent):B[n]={'head':list(vworld(p)),'tail':list(vworld(p)+Vector((0,.18,0))),'parent':parent}
bone('root',(0,0,0),None);bone('body',(0,.09,0),'root');bone('chest',(0,.215,0),'body');bone('skull',(0,.302,.007),'chest');bone('jaw',(0,.326,-.013),'skull')
TY=[.00,-.10,-.20,-.29,-.36,-.415]
for k,y in enumerate(TY):bone('spine'+str(k),(0,y,float(np.interp(y,[p[0]for p in center_rows],[p[1]for p in center_rows]))),'body'if k==0 else'spine'+str(k-1))
bone('caudal',(0,-.452,.112),'spine5');bone('dorsal',(0,-.025,.110),'body')
for side,sign in [('L',-1),('R',1)]:
 for kind,ps,parent in [('pectoral',[(.060,.225,-.053),(.206,.215,-.164)],'chest'),('pelvic',[(.035,-.12,.020),(.103,-.145,-.071)],'spine1')]:
  for k,p in enumerate(ps):bone(kind+str(k)+side,(p[0]*sign,p[1],p[2]),parent if k==0 else kind+'0'+side)
arm=bpy.data.armatures.new('Shonisaurus shared armature');rig=bpy.data.objects.new('Shonisaurus shared rig',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,d in B.items():b=arm.edit_bones.new(n);b.head=d['head'];b.tail=d['tail'];b.use_deform=True
for n,d in B.items():
 if d['parent']:arm.edit_bones[n].parent=arm.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT');rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
def axial(y):
 if y>=.302:return {'skull':1}
 if y>.23:return blend({'chest':1},{'skull':1},ramp(y,.23,.302))
 if y>.12:return blend({'body':1},{'chest':1},ramp(y,.12,.23))
 if y>0:return blend({'spine0':1},{'body':1},ramp(y,0,.08))
 for k in range(5):
  if y>=TY[k+1]:return blend({'spine'+str(k):1},{'spine'+str(k+1):1},ramp(-y,-TY[k],-TY[k+1]))
 return blend({'spine5':1},{'caudal':1},ramp(-y,.415,.46))
def weights(p,region=''):
 x,y,z=p;a=axial(y);side='L'if x<0 else'R';x=abs(x)
 if region in ['palate','upper']:return {'skull':1}
 if region=='lower':return blend(axial(y),{'jaw':1},ramp(y,.315,.35))
 if region=='floor':return {'jaw':1}
 if region=='throat':return blend({'skull':1},{'jaw':1},ramp(-z,-.005,.016))
 if y>.305:
  line=float(np.interp(y,[.305,.33,.37,.395,.5],[-.027,-.017,-.005,-.0015,-.0015]))
  jaw=ramp(y,.305,.356)*(1-ramp(z,line-.003,line+.003))
  if jaw>0:return blend(a,{'jaw':1},jaw)
 if .17<y<.28 and x>.065 and z<-.035:
  fw=blend({'pectoral0'+side:1},{'pectoral1'+side:1},ramp(x,.15,.25));return blend(a,fw,ramp(x,.070,.13))
 if -.20<y<-.065 and x>.032 and z<.035:
  fw=blend({'pelvic0'+side:1},{'pelvic1'+side:1},ramp(x,.076,.128));return blend(a,fw,ramp(x,.034,.075))
 if -.07<y<.025 and z>.12:return blend(a,{'dorsal':1},ramp(z,.12,.16))
 return a
# Close the baked-open intake in bind geometry, using the same anatomical jaw
# weights on both meshes and oral parts. Jaw zero is now a closed mouth; actions
# only supply positive feeding gape. Skeleton and rest matrices remain identical.
jaw_pivot=Vector(B['jaw']['head']);rest_closure=Matrix.Rotation(CLOSED_REST_ANGLE,3,'X')
def close_rest(p,weight=1.):
 # The imported lips are not a perfect hinge wedge. A small smooth mandibular
 # seating correction closes the residual middle-rostrum slit without lifting
 # the tip through the upper jaw. Both skins receive this same rest fitting.
 seated=jaw_pivot+rest_closure@(p-jaw_pivot)
 yr=-p.y/S;seated.z+=S*.0045*math.exp(-((yr-.395)/.050)**2)
 return p.lerp(seated,weight)
allmesh=[source]+puppets+oral
weight_report={}
for o in allmesh:
 for n in B:o.vertex_groups.new(name=n)
 for v in o.data.vertices:
  w=weights(v.co,o.get('region',''));w=dict(sorted(w.items(),key=lambda t:-t[1])[:4]);total=sum(w.values());assert total>0
  for n,q in w.items():o.vertex_groups[n].add([v.index],q/total,'REPLACE')
  v.co=close_rest(vworld(v.co),w.get('jaw',0)/total)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Shared anatomical armature','ARMATURE');mod.object=rig;o.parent=rig
 weight_report[o.name]={'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'maxInfluences':max(len(v.groups)for v in o.data.vertices)}
# Seat the procedural mandibular upper half directly against its own upper
# rostrum underside. This closes the contact surface across the width, including
# the coarse proxy's lip edge, instead of leaving a visible slit under the lip.
upper=bpy.data.objects['Puppet upper rostrum'];lower=bpy.data.objects['Puppet lower rostrum']
utree=BVHTree.FromPolygons([v.co.copy()for v in upper.data.vertices],[tuple(p.vertices)for p in upper.data.polygons],all_triangles=False)
puppet_lip_seated=0;puppet_lip_max=0.
for v in lower.data.vertices:
 if v.index%16<=8 and v.co.y<-.365*S:
  origin=v.co.copy();origin.z-=1.;loc,normal,index,dist=utree.ray_cast(origin,Vector((0,0,1)),2.)
  if loc is not None and loc.z+.0015>v.co.z:
   delta=loc.z+.0015-v.co.z
   if delta<.18:v.co.z=loc.z+.0015;puppet_lip_seated+=1;puppet_lip_max=max(puppet_lip_max,delta)
# Closed lofts must face outward. Axial and mirrored span lofts have different
# parameter handedness; two-sided Blender preview concealed inward winding,
# but the exported skin intentionally uses single-sided rendering in Three.js.
winding_report={}
for o in puppets+[o for o in oral if o.name in ['Upper teeth','Lower teeth']]:
 bm=bmesh.new();bm.from_mesh(o.data);before=bm.calc_volume(signed=True)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
 after=bm.calc_volume(signed=True);assert after>0,('Inward closed surface',o.name,after)
 bm.to_mesh(o.data);bm.free();o.data.update();winding_report[o.name]={'signedVolumeBefore':before,'signedVolumeAfter':after,'outward':True}
# Performance specification is a separate reproducible source.
sys.path.insert(0,str(HERE));from performance import CLIPS,LOOPS,pose
for clip,duration in CLIPS.items():
 a=bpy.data.actions.new(clip);a.use_fake_user=True;rig.animation_data.action=a;last=round(duration*30)
 for f in range(last+1):
  state=pose(clip,f/last,list(B))
  for n,d in state.items():
   pb=rig.pose.bones[n];pb.rotation_euler=d['rotation'];pb.location=d['location']
   if n!='root':pb.keyframe_insert('rotation_euler',frame=f);pb.keyframe_insert('location',frame=f)
 for layer in a.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for fc in bag.fcurves:
     for k in fc.keyframe_points:k.interpolation='LINEAR'
 print('SHONISAURUS_ACTION',clip,flush=True)
rig.animation_data.action=None
for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_set(0)
anchors=[{'name':'anchor_mouth','bone':'jaw','point':list(close_rest(vworld((0,.48,-.009)))),'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'jaw','point':list(close_rest(vworld((0,.365,-.009)))),'role':'swallow'}, {'name':'anchor_attack_primary','bone':'skull','point':list(vworld((0,.498,.018))),'role':'attack'}]
(HERE/'anchors.json').write_text(json.dumps(anchors,indent=2)+'\n')
(HERE/'rig.json').write_text(json.dumps(B,indent=2)+'\n')
def export(obs,path):
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs+[rig]:o.select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_all_vertex_colors=False,export_yup=True,export_extras=True,export_morph=False)
export([source]+oral,LOCAL/'shonisaurus.full.uncompressed.glb');export(puppets+oral,LOCAL/'shonisaurus.puppet.uncompressed.glb')
# Authoring file carries both geometries; collection visibility is set by review.py.
bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/'shonisaurus.shared-rig.blend'))
meta={'id':'shonisaurus','name':'Shonisaurus','species':'Shonisaurus popularis','provenance':'Late Triassic · Berlin-Ichthyosaur, Nevada','description':'Deep-bodied shastasaurid with long paired flippers, slender rostrum and lateral tail propulsion. Authored Tripo body and measured procedural volume puppet share the exact armature and actions.','lengthMeters':14,'modelLength':6,'locomotion':'Swim','clips':list(CLIPS),'looping':list(LOOPS),'anchors':[a['name']for a in anchors],'sources':['docs/triassic/canonical/shonisaurus.png','tools/triassic/creatures/shonisaurus/tripo-raw/shonisaurus.raw.glb'],'notes':['Pigmentation is baked from source albedo to COLOR_0; full body retains source tangent-space normal detail.','Procedural geometry is rebuilt from measured radial/spanning sections, not mesh decimation.','Bind geometry has a sealed mouth; only Bite, Attack, Heavy and Eat open it.','Shared clips are applied verbatim to the authored and procedural exports. Oral articulation and swimming performance are inferred soft-tissue behaviour.']}
(OUT/'shonisaurus.json').write_text(json.dumps(meta,indent=2)+'\n')
(HERE/'build-report.json').write_text(json.dumps({'rawSHA256':hashlib.sha256(RAW.read_bytes()).hexdigest(),'closedRestJawAngleRadians':CLOSED_REST_ANGLE,'puppetLipContactFit':{'vertices':puppet_lip_seated,'maximumModelDisplacement':puppet_lip_max},'chinSurgery':{'adjustedVertices':chin_count,'maximumRawLengthDisplacement':chin_max},'closedSurfaceWinding':winding_report,'rawVertices':len(points),'rawTriangles':raw_triangles,'meshes':weight_report,'bones':len(B),'clips':list(CLIPS),'profileSections':len(profile)},indent=2)+'\n')
