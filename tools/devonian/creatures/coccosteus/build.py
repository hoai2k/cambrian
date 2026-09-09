"""Coccosteus cuspidatus V2, an independently authored small arthrodire.
Anatomy: Miles & Westoll 1968; Engelman 2024 figure 7 and associated Coccosteus discussion.
Blender 5.2 --background --threads 2 --python this_file [-- --preview|--skip-renders].
"""
import bpy,bmesh,math,json,sys
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
HERE=Path(__file__).resolve().parent;REPO=HERE.parents[3];LOCAL=REPO.parent/'devonian-authoring/coccosteus';CAND=LOCAL/'v2-candidate';CAND.mkdir(parents=True,exist_ok=True);PREVIEW='--preview'in sys.argv
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
scene=bpy.context.scene;scene.render.fps=30
arm=bpy.data.armatures.new('Coccosteus V2 anatomical skeleton');rig=bpy.data.objects.new('Coccosteus',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),None),('body',(0,-.10,0),'root'),('skull',(0,-.79,.13),'body'),('jaw',(0,-.91,-.15),'skull'),('throat',(0,-.97,-.18),'skull')]
for i,y in enumerate([.36,.91,1.44,1.96]):spec.append(('tail'+str(i),(0,y,.015),'body'if i==0 else'tail'+str(i-1)))
for sign in [-1,1]:
 side='L'if sign>0 else'R';spec.extend([('pectoral'+side,(sign*.38,-.55,-.22),'body'),('pectoralTip'+side,(sign*.72,-.27,-.43),'pectoral'+side),('pelvic'+side,(sign*.24,.39,-.26),'tail0'),('gill'+side,(sign*.42,-.74,-.09),'skull')])
spec.extend([('dorsal',(0,.87,.24),'tail0'),('caudal',(0,2.04,.025),'tail3')])
for name,p,parent in spec:
 b=arm.edit_bones.new(name);b.head=p;b.tail=Vector(p)+Vector((0,0,.18)if name=='root'else(0,.18,0));b.use_deform=name!='root'
 if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
TX=1024;v,u=np.mgrid[0:TX,0:TX].astype(np.float32)/TX
im=bpy.data.images.load(str(HERE/'dermal-source-v2.png'));iw,ih=im.size;data=np.array(im.pixels[:],np.float32).reshape(ih,iw,4);sample=data[((v*2.1)%1*(ih-1)).astype(int),((u*2.1)%1*(iw-1)).astype(int),:3];micro=sample.mean(2);micro=(micro-micro.mean())/(micro.std()+1e-8)
# The angular UV boundary approaches the oral lip: attenuate microdetail there
# instead of stretching a final texture row into vertical comb-like streaks.
edge_distance=np.minimum(np.minimum(v,abs(v-.5)),1-v);micro*=np.where(u<.5,np.clip(edge_distance/.055,0,1)*np.clip((u-.02)/.075,0,1),1)
# Individually authored cranial and trunk suture layouts; shared material atlas U regions.
HEAD_SEAMS=[[(.03,.18),(.12,.18),(.21,.235),(.35,.25)],[(.03,.32),(.12,.32),(.21,.265),(.35,.25)],[(.21,.235),(.27,.13),(.43,.09)],[(.21,.265),(.27,.37),(.43,.41)],[(.27,.13),(.30,.045),(.445,.025)],[(.27,.37),(.30,.455),(.445,.475)],[(.34,.25),(.43,.215),(.46,.19)],[(.34,.25),(.43,.285),(.46,.31)]]
BODY_SEAMS=[[(.54,.25),(.65,.16),(.79,.15),(.935,.25)],[(.54,.25),(.65,.34),(.79,.35),(.935,.25)],[(.65,.16),(.66,.055),(.87,.04)],[(.65,.34),(.66,.445),(.87,.46)],[(.79,.15),(.87,.09),(.97,.09)],[(.79,.35),(.87,.41),(.97,.41)],[(.66,.055),(.68,.60),(.83,.65),(.96,.58)],[(.66,.445),(.68,.90),(.83,.85),(.96,.92)]]
def linedistance(U,V,lines=HEAD_SEAMS+BODY_SEAMS):
 out=np.full(np.broadcast(U,V).shape,10.,np.float32)
 for points in lines:
  for a,b in zip(points,points[1:]):
   ax,ay=a;dx,dy=b[0]-ax,b[1]-ay;t=np.clip(((U-ax)*dx+(V-ay)*dy)/(dx*dx+dy*dy),0,1);out=np.minimum(out,np.sqrt((U-ax-dx*t)**2+(V-ay-dy*t)**2))
 return out
dist=linedistance(u,v);seam=np.exp(-(dist/.0017)**2);relief=.052*micro-.28*seam;factor=np.clip(.86+.040*micro-.16*seam,.48,.98)
rgba=np.ones((TX,TX,4),np.float32);rgba[:,:,:3]=factor[:,:,None]*np.array([1.0,.98,.945])
def image_map(name,array,noncolor=False):
 im=bpy.data.images.new(name,width=TX,height=TX);im.pixels.foreach_set(array.astype(np.float32).ravel());im.filepath_raw=str(HERE/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 if noncolor:im.colorspace_settings.name='Non-Color'
 return im
albedo=image_map('armour-detail-v2',rgba);gx=(np.roll(relief,1,1)-np.roll(relief,-1,1))*.35;gy=(np.roll(relief,1,0)-np.roll(relief,-1,0))*.35;norm=np.ones_like(rgba);length=np.sqrt(gx*gx+gy*gy+1);norm[:,:,0]=.5+.5*gx/length;norm[:,:,1]=.5+.5*gy/length;norm[:,:,2]=.5+.5/length;normalmap=image_map('armour-normal-v2',norm,True)
rough=np.ones_like(rgba);rough[:,:,:3]=np.clip(.52+.035*micro+.07*seam,.43,.66)[:,:,None];roughmap=image_map('armour-roughness-v2',rough,True)
finvein=np.exp(-(np.sin(pi*(u*14+.085*np.sin(v*6+u*4)))**2)/.018)*np.clip((v-.10)/.35,0,1)
finnoise=(np.sin(u*171+v*87+np.sin(u*31)*2)+np.sin(v*149-u*73))/2
finrgba=np.ones_like(rgba);finfactor=np.clip(.96-.24*finvein+.016*finnoise,.68,.985);finrgba[:,:,:3]=finfactor[:,:,None]
finimage=image_map('fin-pigment-v2',finrgba);finrough=np.ones_like(rgba);finrough[:,:,:3]=(.61+.055*finvein+.02*finnoise)[:,:,None];finroughimage=image_map('fin-roughness-v2',finrough,True)
M={}
for name,col,r in [('armour',(.205,.132,.061),.54),('body',(.147,.123,.055),.47),('fins',(.052,.085,.033),.57),('jaw',(.23,.17,.09),.48),('oral',(.074,.027,.022),.48),('gnathal',(.38,.285,.15),.35),('eyes',(.003,.006,.006),.105),('gill',(.038,.030,.018),.55)]:
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*col,1);mat.use_nodes=True;n=mat.node_tree.nodes;l=mat.node_tree.links;bs=n.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=r;bs.inputs['Coat Weight'].default_value=.1 if name=='eyes'else 0 if name=='fins'else .035
 if name=='fins':bs.inputs['Specular IOR Level'].default_value=.17
 if name!='eyes':vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';l.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name=='armour':
  t=n.new('ShaderNodeTexImage');t.image=albedo;mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;l.new(vc.outputs['Color'],mix.inputs[1]);l.new(t.outputs['Color'],mix.inputs[2]);l.new(mix.outputs[0],bs.inputs['Base Color'])
  nt=n.new('ShaderNodeTexImage');nt.image=normalmap;nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;l.new(nt.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],bs.inputs['Normal']);rt=n.new('ShaderNodeTexImage');rt.image=roughmap;l.new(rt.outputs['Color'],bs.inputs['Roughness'])
 if name=='fins':
  tx=n.new('ShaderNodeTexImage');tx.image=finimage;mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;l.new(vc.outputs['Color'],mix.inputs[1]);l.new(tx.outputs['Color'],mix.inputs[2]);l.new(mix.outputs[0],bs.inputs['Base Color']);rr=n.new('ShaderNodeTexImage');rr.image=finroughimage;l.new(rr.outputs['Color'],bs.inputs['Roughness'])
 M[name]=mat
objects=[]
def pigment(p,material):
 x,y,z=p;base=np.array(M[material].diffuse_color[:3]);dorsal=np.clip((z+.1)/.44,0,1)
 if material in ['armour','body','jaw','fins']:
  base*=1-.22*dorsal
  ventral=np.clip((-z-.05)/.30,0,1);strength=.08 if material=='fins'else .6;base=base*(1-strength*ventral)+np.array([.285,.241,.154])*strength*ventral
  # Regional flank freckling is pigmentation, not a continuous lateral-line cord.
  stripe=math.exp(-((z-.075)/.065)**2);patch=max(0,sin(y*27+sin(x*29)*1.7+z*11))**5;amount=(.25 if material=='body'else .10)*stripe*patch;base*=1-amount
 return(*np.clip(base,0,1),1)

def mesh(name,verts,faces,material,bone='body',weights=None,uvs=None):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);me.materials.append(M[material]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 uv=me.uv_layers.new(name='UVMap');col=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for i,v in enumerate(me.vertices):col.data[i].color=pigment(v.co,material)
 for p in me.polygons:
  for li in p.loop_indices:
   idx=me.loops[li].vertex_index;v=me.vertices[idx].co;uv.data[li].uv=uvs[idx]if uvs else((v.y+1.45)/1.6,(math.atan2(v.z-.03,v.x)/(2*pi))%1)
 if weights:
  groups={key:o.vertex_groups.new(name=key)for key in set(k for w in weights for k in w)}
  for i,w in enumerate(weights):
   total=sum(w.values())
   for key,val in w.items():
    if val>0:groups[key].add([i],val/total,'REPLACE')
 else:o.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
 mod=o.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;o.parent=rig
 return o

def ellipse(name,center,basis,radii,material,bone='body',N=64,R=32):
 center=Vector(center);basis=list(map(Vector,basis));vv=[];ff=[]
 for j in range(R+1):
  lat=pi*j/R
  for k in range(N):
   a=2*pi*k/N;vv.append(tuple(center+basis[0]*(radii[0]*sin(lat)*cos(a))+basis[1]*(radii[1]*sin(lat)*sin(a))+basis[2]*(radii[2]*cos(lat))))
 for j in range(R):
  for k in range(N):a=j*N+k;ff.append((a,j*N+(k+1)%N,(j+1)*N+(k+1)%N,a+N))
 return mesh(name,vv,ff,material,bone)

def interp(data,t):
 k=min(len(data)-2,max(0,int(t)));f=t-k;a=np.array(data[max(0,k-1)]);b=np.array(data[k]);c=np.array(data[k+1]);d=np.array(data[min(len(data)-1,k+2)])
 return .5*(2*b+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f)
# Continuous upper cranial mass. Its ventral surface is the concave palate itself;
# no complete body cross-section is allowed to close the oral aperture.
HEAD=[(-1.744,0,.055,.055,0),(-1.70,.204,.118,-.006,.009),(-1.61,.294,.191,-.028,.040),(-1.43,.373,.272,-.073,.094),(-1.20,.424,.342,-.152,.163),(-.96,.445,.391,-.204,.212),(-.77,.433,.352,-.220,.222)]
verts=[];uvs=[];faces=[];NA=120;NY=127
for j in range(NY):
 y,w,top,base,arch=interp(HEAD,j/(NY-1)*(len(HEAD)-1))
 for k in range(NA+1):
  a=2*pi*k/NA;sn=sin(a);x=w*cos(a);z=base+(top-base)*max(0,sn)**.78 if sn>=0 else base+arch*(-sn)**.80
  # Restrained cranial planes / cheek shoulders, not a spherical cranium.
  if sn>0:z-=.012*sin(a*4)**2*sin(pi*j/(NY-1))
  vv=k/NA;uu=.02+.445*(y+1.744)/.974;seamdist=float(linedistance(np.array(uu),np.array(vv)));z-=.0017*math.exp(-(seamdist/.0025)**2)*max(0,sn)
  verts.append((x,y,z));uvs.append((uu,vv))
for j in range(NY-1):
 for k in range(NA):a=j*(NA+1)+k;faces.append((a,a+1,a+NA+2,a+NA+1))
faces.append(tuple((NY-1)*(NA+1)+k for k in range(NA+1)));head=mesh('head_envelope_closed',verts,faces,'armour','skull',uvs=uvs)
# The underside is real oral palate material, in the SAME continuous closed tissue mesh.
head.data.materials.append(M['oral']);head.data.materials.append(M['jaw'])
for p in head.data.polygons:
 if len(p.vertices)==4:
  avg=sum(head.data.uv_layers[0].data[li].uv.y for li in p.loop_indices)/4
  if avg>.5:p.material_index=1
for p in head.data.polygons:
 if len(p.vertices)>4:
  p.material_index=0
  for li in p.loop_indices:
   q=head.data.vertices[head.data.loops[li].vertex_index].co;head.data.uv_layers[0].data[li].uv=(.10+.20*(q.x/.45+1)/2,.55+.20*(q.z+.22)/.62)
# Per-vertex underside colour transitions naturally to upper bony tissue at lip margin.
for i,p in enumerate(verts):
 if i//(NA+1)>0 and .5<(i%(NA+1))/NA<1:head.data.color_attributes['Color'].data[i].color=pigment(p,'oral')
tree=BVHTree.FromPolygons([v.co.copy()for v in head.data.vertices],[list(p.vertices)for p in head.data.polygons])
eye_specs=[]
for sign in [-1,1]:
 side='L'if sign>0 else'R';point,normal,_,_=tree.ray_cast(Vector((sign*2,-1.438,.156)),Vector((-sign,0,0)))
 normal=normal.normalized()
 if normal.x*sign<0:normal=-normal
 uvec=Vector((0,1,0));uvec=(uvec-normal*uvec.dot(normal)).normalized();vvec=normal.cross(uvec).normalized();radii=(.099,.083,.067);center=point-normal*.035
 ellipse('eye_globe_'+side,center,[uvec,vvec,normal],radii,'eyes','skull',64,36);eye_specs.append({'name':'eye_globe_'+side,'center':list(center),'basis':[list(x)for x in [uvec,vvec,normal]],'radii':radii})
 # Fitted, thin intersection skin ribbon. It does not add an envelope or conceal a protruding back.
 vv=[];ff=[];liduv=[];N=96
 for i in range(N+1):
  phi=2*pi*i/N;direction=uvec*(radii[0]*cos(phi))+vvec*(radii[1]*sin(phi));lo=0;hi=pi
  for _ in range(22):
   theta=(lo+hi)/2;p=center+direction*sin(theta)+normal*radii[2]*cos(theta);q,no,_,_=tree.find_nearest(p)
   if (p-q).dot(no)>0:lo=theta
   else:hi=theta
  p=center+direction*sin((lo+hi)/2)+normal*radii[2]*cos((lo+hi)/2);q,no,_,_=tree.find_nearest(p)
  tangent=direction.normalized();outer,ono,_,_=tree.find_nearest(q+tangent*.008)
  for t in [0,.33,.67,1]:
   p=q.lerp(outer,t)+no*(.0002+.0006*sin(pi*t));vv.append(tuple(p));ring=interp(HEAD,np.interp(p.y,[a[0]for a in HEAD],range(len(HEAD))));liduv.append((.02+.445*(p.y+1.744)/.974,math.acos(max(-1,min(1,p.x/ring[1])))/(2*pi)))
 for i in range(N):
  for j in range(3):a=i*4+j;ff.append((a,a+1,a+5,a+4))
 mesh('Fitted orbital skin '+side,vv,ff,'armour','skull',uvs=liduv)
(HERE/'eyes-v2.json').write_text(json.dumps(eye_specs,indent=2))
# Broad, shallow lower jaw forms an articulated cup with an actual dorsal floor.
JAW=[(-1.716,0,-.12,-.12),(-1.692,.195,-.093,-.156),(-1.565,.284,-.117,-.201),(-1.36,.348,-.166,-.267),(-1.11,.345,-.206,-.294),(-1.00,.23,-.223,-.283),(-.96,0,-.248,-.248)]
vv=[];ff=[];uv=[];NAJ=88;NYJ=87
for j in range(NYJ):
 y,w,top,bottom=interp(JAW,j/(NYJ-1)*(len(JAW)-1))
 for k in range(NAJ+1):
  a=2*pi*k/NAJ;z=top+.010*sin(a)if sin(a)>0 else top+(top-bottom)*sin(a);vv.append((w*cos(a),y,z));uv.append((j/(NYJ-1),k/NAJ))
for j in range(NYJ-1):
 for k in range(NAJ):a=j*(NAJ+1)+k;ff.append((a,a+1,a+NAJ+2,a+NAJ+1))
ff.append(tuple((NYJ-1)*(NAJ+1)+k for k in range(NAJ+1)));jaw=mesh('Mandibular cup and oral floor',vv,ff,'jaw','jaw',uvs=uv);jaw.data.materials.append(M['oral'])
for p in jaw.data.polygons:
 if len(p.vertices)==4 and sum(jaw.data.uv_layers[0].data[li].uv.y for li in p.loop_indices)/4<.5:p.material_index=1
for i,p in enumerate(vv):
 if 0<i//(NAJ+1)<NYJ-1 and 0<(i%(NAJ+1))/NAJ<.5:jaw.data.color_attributes['Color'].data[i].color=pigment(p,'oral')
# A single lining follows the actual palate, mandibular floor and cheek margins
# before narrowing into the torso aperture. There is no separate vestibular shelf.
vv=[];ff=[];ww=[];RN=92;HALF=64;AN=2*(HALF+1)
for j in range(RN):
 t=j/(RN-1);y=-1.53+.73*t
 upper=interp(HEAD,np.interp(y,[p[0]for p in HEAD],range(len(HEAD))));lower=interp(JAW,np.interp(min(y,-1.08),[p[0]for p in JAW],range(len(JAW))))
 blend=np.clip((y+1.13)/.33,0,1);blend=blend*blend*(3-2*blend)
 for k in range(AN):
  top=k<=HALF;a=pi*k/HALF if top else pi+pi*(k-HALF-1)/HALF
  if top:x=upper[1]*cos(a);z=upper[3]+upper[4]*max(0,sin(a))**.8+.003;weights={'skull':1-blend,'body':blend}
  else:x=lower[1]*cos(a);z=lower[2]+.010*abs(sin(a))-.004;weights={'jaw':1-blend,'body':blend}
  # End just within the torso opening so the two lining surfaces overlap inside tissue.
  x=x*(1-blend)+.345*cos(a)*blend;z=z*(1-blend)+(-.13+.145*sin(a))*blend
  vv.append((x,y,z));ww.append(weights)
for j in range(RN-1):
 for k in range(AN):a=j*AN+k;ff.append((a,j*AN+(k+1)%AN,(j+1)*AN+(k+1)%AN,a+AN))
mesh('Continuous buccopharyngeal lining',vv,ff,'oral',weights=ww)
# Dermal exteriors share the exact side-wall boundaries and weights of the lining.
# Separate old cheek pieces would leave their rear cut edges inside the vestibule.
for sign,ia,ib in [(1,AN-1,0),(-1,HALF,HALF+1)]:
 cv=[];cw=[];cf=[]
 for j in range(RN):
  for k in [ia,ib]:
   index=j*AN+k;p=Vector(vv[index]);p.x+=sign*.003;cv.append(tuple(p));cw.append(ww[index])
 for j in range(RN-1):cf.append((j*2,j*2+1,j*2+3,j*2+2))
 mesh('Dermal cheek skin '+str(sign),cv,cf,'jaw',weights=cw)

# Small paired gnathal cusps and bony margins, with genus-appropriate scale.
def tube(name,points,radii,material,bone,sides=10):
 points=list(map(Vector,points));vv=[];ff=[]
 for i,p in enumerate(points):
  tangent=(points[min(i+1,len(points)-1)]-points[max(i-1,0)]).normalized();u=tangent.cross(Vector((0,0,1)))
  if u.length<1e-6:u=tangent.cross(Vector((0,1,0)))
  u.normalize();v=tangent.cross(u)
  for k in range(sides):a=2*pi*k/sides;vv.append(tuple(p+radii[i]*(u*cos(a)+v*sin(a))))
 for i in range(len(points)-1):
  for k in range(sides):a=i*sides+k;ff.append((a,i*sides+(k+1)%sides,(i+1)*sides+(k+1)%sides,a+sides))
 ff.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+k for k in range(sides))]);return mesh(name,vv,ff,material,bone)
for sign in [-1,1]:
 for upper in [True,False]:
  bone='skull'if upper else'jaw';z=-.020 if upper else-.092;pts=[(sign*(.15+.10*t),-1.66+.26*t,z-.07*t)for t in np.linspace(0,1,18)];tube('Gnathal margin '+bone+str(sign),pts,[.010]*18,'gnathal',bone)
  for i in range(5):
   t=(i+.25)/5;base=Vector((sign*(.15+.10*t),-1.66+.26*t,z-.07*t));tip=base+Vector((-sign*.010,-.003,(-1 if upper else 1)*(.029-.002*i)));tube('Small gnathal cusp '+bone+str(sign)+str(i),[base,base.lerp(tip,.7),tip],[.010,.006,.001],'gnathal',bone,8)
# Compact thoracic shield and muscular posterior are distinct authoring decisions from
# the much deeper Dunkleosteus trunk. The rear remains deep through the caudal peduncle.
BODY=[(-.82,.405,.325,.035),(-.72,.436,.359,.020),(-.61,.469,.414,-.016),(-.28,.470,.428,-.003),(.10,.424,.363,-.007),(.48,.350,.281,-.017),(.91,.280,.235,-.024),(1.35,.207,.192,-.028),(1.75,.139,.168,-.026),(2.08,.087,.151,-.003),(2.31,.047,.108,.091),(2.51,.010,.034,.190)]
def tailweight(y):
 if y<.31:return {'body':1}
 pts=[(.31,'body'),(.60,'tail0'),(1.12,'tail1'),(1.65,'tail2'),(2.10,'tail3'),(2.37,'caudal')]
 if y>=pts[-1][0]:return {'caudal':1}
 for(a,an),(b,bn)in zip(pts,pts[1:]):
  if a<=y<=b:t=(y-a)/(b-a);return {an:1-t,bn:t}
vv=[];ff=[];ww=[];uv=[];NYB=183;NAB=104
for j in range(NYB):
 y,w,h,z=interp(BODY,j/(NYB-1)*(len(BODY)-1))
 for k in range(NAB+1):
  a=2*pi*k/NAB;sn=sin(a);p=Vector((w*cos(a),y,z+h*sn));uu=.52+.455*(y+.82)/1.25;v=k/NAB
  if y<.43:
   p.z-=.002*math.exp(-(float(linedistance(np.array(uu),np.array(v)))/.0023)**2)*max(0,sn)
  vv.append(tuple(p));ww.append(tailweight(y));uv.append((uu,v))
for j in range(NYB-1):
 for k in range(NAB):a=j*(NAB+1)+k;ff.append((a,a+1,a+NAB+2,a+NAB+1))
ff.append(tuple((NYB-1)*(NAB+1)+k for k in range(NAB+1)))
# The anterior torso cap has a real aperture and inward passage. Its oral tube
# continues behind the flexible lining rather than presenting a solid body plug.
oral_vertex_start=len(vv);oral_face_start=len(ff);NT=42
for j in range(NT):
 t=j/(NT-1);factor=(1-.20*(min(1,t/.6)**2)*(3-2*min(1,t/.6)))*max(0,1-max(0,(t-.6)/.4)**2)**.52;y=-.82+.87*t;zc=-.13-.13*t*t
 for k in range(NAB+1):
  a=2*pi*k/NAB;vv.append((.345*factor*cos(a),y,zc+.145*factor*sin(a)));ww.append({'body':1});uv.append((t,k/NAB))
for k in range(NAB):ff.append((k,oral_vertex_start+k,oral_vertex_start+k+1,k+1))
for j in range(NT-1):
 for k in range(NAB):
  a=oral_vertex_start+j*(NAB+1)+k;ff.append((a,a+NAB+1,a+NAB+2,a+1))
body=mesh('Continuous thorax and muscular posterior',vv,ff,'armour',weights=ww,uvs=uv);body.data.materials.append(M['body']);body.data.materials.append(M['oral'])
for p in body.data.polygons:
 if p.index>=oral_face_start:p.material_index=2
# The aperture's outer ring is also internal oral tissue. Leaving its original
# armoured vertex pigment made a pale crescent along the far wall at full gape.
# These shared boundary vertices remain continuous; only their pigment changes.
for i in list(range(NAB+1))+list(range(oral_vertex_start,len(body.data.vertices))):body.data.color_attributes['Color'].data[i].color=pigment(body.data.vertices[i].co,'oral')
for p in body.data.polygons:
 if sum(body.data.vertices[i].co.y for i in p.vertices)/len(p.vertices)>.40:p.material_index=1
for i,v in enumerate(body.data.vertices):
 if v.co.y>.40:body.data.color_attributes['Color'].data[i].color=pigment(v.co,'body')
# Short branchial opening beneath the articulated head-shield edge.
for sign in [-1,1]:
 tube('Branchial recess '+str(sign),[(sign*.417,-.775+.035*t,-.04-.14*t)for t in np.linspace(0,1,18)],[.013]*18,'gill','gill'+('L'if sign>0 else'R'),10)
# Rounded fin fans with thin compliant distal membranes and muted radial pigmentation.
def fin(name,origin,boundary,bone,tip=None,tail=False):
 origin=Vector(origin);outline=list(map(Vector,boundary));dense=[]
 for i in range(len(outline)-1):
  for j in range(7):dense.append(Vector(interp(outline,i+j/7)))
 dense.append(outline[-1]);vv=[];ff=[];ww=[];uv=[];R=18;normal=Vector((1,0,0))if all(abs(p.x)<1e-8 for p in dense)else Vector((0,0,1))
 for i,p in enumerate(dense):
  for j in range(R+1):
   t=j/R;q=origin.lerp(p,t)+normal*.010*sin(pi*t)*sin(pi*i/(len(dense)-1));vv.append(tuple(q));uv.append((i/(len(dense)-1),t));mix=max(0,(t-.35)/.65)
   if bone=='dorsal':
    profile=interp(BODY,np.interp(q.y,[r[0]for r in BODY],range(len(BODY))));base_z=profile[2]+profile[3];free=np.clip((q.z-base_z-.045)/.25,0,.78);weights={b:w*(1-free)for b,w in tailweight(q.y).items()};weights['dorsal']=float(free);ww.append(weights)
   else:ww.append(tailweight(q.y)if tail else {bone:1-mix,tip:mix}if tip else {bone:1})
 for i in range(len(dense)-1):
  for j in range(R):a=i*(R+1)+j;ff.append((a,a+1,a+R+2,a+R+1))
 o=mesh(name,vv,ff,'fins',bone,ww,uv);sol=o.modifiers.new('Fin membrane thickness','SOLIDIFY');sol.thickness=.004;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sol.name)
 col=o.data.color_attributes['Color'];vertex_uv={l.vertex_index:o.data.uv_layers[0].data[i].uv.copy()for i,l in enumerate(o.data.loops)}
 for i,p in enumerate(o.data.vertices):
  t=vertex_uv.get(i,Vector((0,0)));streak=1;edge=1-.18*max(0,(t.y-.72)/.28);c=np.array(pigment(p.co,'fins')[:3]);root=np.array(pigment(p.co,'armour'if p.co.y<.40 else'body')[:3])*.85;blend=np.clip(t.y/.52,0,1);c=root*(1-blend)+c*blend;col.data[i].color=(*[x*streak*edge for x in c],1)
for sign in [-1,1]:
 side='L'if sign>0 else'R'
 fin('Broad pectoral '+side,(sign*.36,-.55,-.22),[(sign*x,y,z)for x,y,z in[(.36,-.69,-.16),(.56,-.63,-.30),(.84,-.46,-.57),(.96,-.16,-.61),(.85,.02,-.53),(.61,-.07,-.40),(.38,-.30,-.22)]],'pectoral'+side,'pectoralTip'+side)
 fin('Anterior pelvic '+side,(sign*.23,.41,-.24),[(sign*x,y,z)for x,y,z in[(.25,.29,-.22),(.43,.42,-.29),(.59,.65,-.36),(.51,.78,-.34),(.25,.65,-.25)]],'pelvic'+side)
fin('Low long-based dorsal',(0,.89,.225),[(0,.37,.26),(0,.58,.54),(0,.76,.64),(0,1.02,.57),(0,1.31,.42),(0,1.47,.14)],'dorsal')
fin('Heterocercal caudal',(0,2.08,.04),[(0,1.83,.13),(0,2.21,.26),(0,2.69,.46),(0,2.87,.54),(0,2.86,.43),(0,2.63,.25),(0,2.45,.08),(0,2.39,-.29),(0,2.26,-.46),(0,2.10,-.35),(0,1.89,-.14),(0,1.80,-.04)],'caudal',tail=True)
anchors=[('anchor_mouth','jaw',(0,-1.685,-.093),'mouth'),('anchor_mouth_inside','skull',(0,-1.01,-.12),'swallow'),('anchor_attack_primary','skull',(0,-1.744,.055),'attack')]
for name,bone,p,role in anchors:
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=bone;o['cambrianAnchor']={'version':1,'role':role,'parentBone':bone}
# Motion is authored in anatomical layers: rigid armour, cranio-mandibular linkage,
# posterior travelling wave and delayed compliant fin membranes. No root tracks.
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5};loops=['Idle','Swim','Guard','Eat']
def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)
def pulse(t,a,b,c):return smooth((t-a)/(b-a)) if t<b else 1-smooth((t-b)/(c-b))
rig.animation_data_create()
for name,duration in clips.items():
 action=bpy.data.actions.new(name);action.use_fake_user=True;rig.animation_data.action=action;frames=round(duration*30)
 for frame in range(frames+1):
  t=frame/frames;phase=2*pi*t;env=sin(pi*t)**2
  for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0);b.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def move(x=0,y=0,z=0):rig.pose.bones['body'].location=(x,y,z)
  def wave(a,cycles=1,phaseadd=0):
   for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=a*(.32+.18*i)*sin(phase*cycles-.67*i+phaseadd),x=.025*a*sin(phase*cycles-.8*i))
  def trim(a,cycles=1):
   for side,s in [('L',1),('R',-1)]:
    rot('pectoral'+side,x=.052*a*sin(phase*cycles+.4*s),y=s*.09*a*sin(phase*cycles-.2),z=s*.045*a*(1-cos(phase*cycles)))
    rot('pectoralTip'+side,x=.035*a*sin(phase*cycles-.8),z=s*.055*a*sin(phase*cycles-.65))
    rot('pelvic'+side,x=.025*a*sin(phase*cycles-.9),z=s*.032*a*sin(phase*cycles-.6))
   rot('dorsal',z=.042*a*sin(phase*cycles-1.1))
  def mouth(a):
   rot('jaw',x=a);rot('skull',x=-.21*a);rot('throat',x=.075*a)
   rot('gillL',z=.045*a);rot('gillR',z=-.045*a)
  if name=='Idle':
   wave(.043);trim(.23);mouth(.019*(1-cos(phase*2)));rot('body',y=.007*sin(phase),z=.007*sin(phase));move(z=.008*sin(phase))
  elif name=='Swim':
   wave(.22,3);trim(.65,3);rot('body',z=-.023*sin(phase*3+.2),y=.026*sin(phase*3+.9));move(z=.013*sin(phase*6));mouth(.014*(1-cos(phase*3)))
  elif name=='Guard':
   wave(.05);trim(.5);mouth(.045+.025*sin(phase));rot('body',x=-.025+.012*sin(phase),y=.018*sin(phase));
   for side,s in [('L',1),('R',-1)]:rot('pectoral'+side,y=s*.19,z=s*(.17+.02*sin(phase-.3)),x=.04)
  elif name=='Eat':
   wave(.042);trim(.30);chew=.23*pulse(t,.04,.18,.34)+.32*pulse(t,.43,.59,.79);mouth(chew);rot('body',x=.025*(1-cos(phase)));move(z=-.013*(1-cos(phase)))
  elif name=='Death':
   fall=smooth((t-.11)/.65);settle=smooth((t-.60)/.28);wave(.18*max(0,1-t/.6)**2,3)
   rot('body',y=1.10*fall,z=.07*settle,x=.045*fall);move(z=-.18*fall);mouth(.20*fall)
   for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=(.06+.027*i)*fall+.13*sin(phase*3-i*.7)*max(0,1-t/.64)**2)
   rot('pectoralL',y=.21*fall,z=.13*fall);rot('pectoralR',y=-.06*fall,z=-.21*fall);rot('pectoralTipR',z=-.17*settle);rot('dorsal',z=-.17*fall)
  else:
   wave(.11*env,2);trim(.5*env,2)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft' else -1;load=pulse(t,0,.16,.35);bend=pulse(t,.10,.48,.88);release=pulse(t,.37,.72,1)
    rot('body',z=s*(.39*bend-.06*load),y=s*.24*bend);move(x=s*.13*bend,z=.018*bend)
    for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=-s*(.12+.035*i)*pulse(t,.08+i*.06,.36+i*.09,.75+i*.055))
    rot('pectoralL',y=.16*bend,z=.11*bend+s*.12*bend);rot('pectoralR',y=-.16*bend,z=-.11*bend+s*.12*bend);rot('pectoralTipL',z=s*.15*release);rot('pectoralTipR',z=s*.15*release)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive'else-1;load=pulse(t,0,.18,.4);pitch=pulse(t,.14,.53,.95);late=pulse(t,.33,.74,1)
    rot('body',x=s*(.27*pitch-.045*load));move(z=-s*.14*pitch);rot('skull',x=-s*.024*late)
    for side,sgn in [('L',1),('R',-1)]:rot('pectoral'+side,x=s*.18*pitch,z=sgn*.11*pitch);rot('pectoralTip'+side,x=s*.10*late);rot('pelvic'+side,x=-s*.09*late)
    rot('tail0',x=-s*.06*late,z=.08*sin(phase*2)*env)
   elif name in ['Attack','Heavy','Bite']:
    heavy=name=='Heavy';short=name=='Bite';load=pulse(t,0,.20,.42);strike=pulse(t,.29,.53,.80);gape=pulse(t,.09,.37,.62);recover=pulse(t,.58,.81,1)
    mouth((.64 if heavy else .48 if short else .54)*gape)
    move(y=(.045 if short else .10)*load-(.055 if short else .22)*strike,z=.024*load-.035*strike)
    rot('body',x=-.045*load+.06*strike,y=(.075 if heavy else .028)*strike,z=-.04*recover)
    for i,b in enumerate(['tail0','tail1','tail2','tail3','caudal']):rot(b,z=(.13+.027*i)*load*(-1 if i<2 else 1)+(.18+.035*i)*pulse(t,.23+i*.06,.42+i*.085,.73+i*.06)*(-1 if i%2==0 else 1))
    for side,s in [('L',1),('R',-1)]:rot('pectoral'+side,y=s*.16*load,z=s*(.13*load-.07*strike),x=-.06*strike);rot('pectoralTip'+side,z=-s*.13*recover)
   elif name=='Hit':
    a=pulse(t,0,.16,.44);b=pulse(t,.2,.55,.93);rot('body',y=.22*a-.07*b,z=-.14*a+.06*b);move(x=.06*a,z=-.035*a);mouth(.21*a);rot('tail0',z=.20*a);rot('tail2',z=-.28*b);rot('pectoralR',z=-.26*a)
   elif name=='Stagger':
    a=pulse(t,0,.15,.43);b=pulse(t,.25,.48,.76);c=pulse(t,.61,.80,1);rot('body',y=.25*a-.16*b+.055*c,z=-.14*a+.09*b);move(x=.07*a-.04*b,z=-.04*(a+b));mouth(.12*b);rot('tail0',z=.24*a-.25*b);rot('tail2',z=-.25*a+.33*b-.09*c);rot('pectoralL',z=.19*a);rot('pectoralR',z=-.20*b)
   elif name=='Dodge':
    coil=pulse(t,0,.20,.40);drive=pulse(t,.16,.51,.85);late=pulse(t,.38,.72,1);rot('body',z=.31*drive-.08*coil,y=-.31*drive);move(x=.24*drive,z=.055*drive)
    rot('tail0',z=.28*coil-.33*drive);rot('tail1',z=.32*coil-.31*drive);rot('tail2',z=-.30*coil+.37*late);rot('tail3',z=.33*late);rot('caudal',z=-.32*late);rot('pectoralL',z=.19*coil-.11*drive);rot('pectoralR',x=.14*drive);rot('pectoralTipR',z=-.15*late)
   elif name=='Parry':
    a=pulse(t,0,.30,.72);b=pulse(t,.36,.69,1);rot('body',y=.29*a,z=-.18*a+.04*b);move(x=.085*a);rot('tail0',z=.24*a);rot('tail2',z=-.29*b);rot('pectoralR',y=-.23*a,z=-.23*a);rot('pectoralTipR',z=-.17*b)
   elif name=='Ability':
    watch=pulse(t,.02,.27,.55);scan=pulse(t,.32,.55,.82);release=pulse(t,.61,.82,1);rot('body',z=.11*watch-.14*scan+.04*release,y=.075*scan);move(z=.033*watch);mouth(.25*release);wave(.12*env,3)
    for side,s in [('L',1),('R',-1)]:rot('pectoral'+side,y=s*.27*watch,z=s*(.19*watch+.05*scan),x=.07*scan);rot('pectoralTip'+side,z=s*.13*pulse(t,.10,.37,.69))
    rot('gillL',z=.075*watch);rot('gillR',z=-.075*watch);rot('dorsal',z=.05*sin(phase*3)*env)
   elif name=='Growth':
    unfurl=pulse(t,0,.42,1);rot('body',x=-.055*unfurl);move(z=.022*unfurl);mouth(.34*pulse(t,.14,.41,.78));rot('dorsal',z=.09*pulse(t,.23,.56,1))
    for side,s in [('L',1),('R',-1)]:rot('pectoral'+side,z=s*.23*unfurl,y=s*.19*unfurl);rot('pectoralTip'+side,z=s*.15*pulse(t,.2,.58,1))
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update()
for name,bone,p,role in anchors:bpy.data.objects[name].matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update();(HERE/'anchors.json').write_text(json.dumps({'coccosteus':[{'name':n,'bone':b,'point':p,'role':r}for n,b,p,r in anchors]},indent=2))
sourcepath=LOCAL/'coccosteus-v2.blend';bpy.ops.wm.save_as_mainfile(filepath=str(sourcepath))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for name,_,_,_ in anchors:bpy.data.objects[name].select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
# Blender's exporter currently emits white COLOR_0 for some secondary material
# primitives. Restore the exact source linear vertex colours in-place in the BIN,
# preserving topology, accessors, shader factors and matching source appearance.
def restore_export_colours(path):
 import struct
 from mathutils.kdtree import KDTree
 raw=bytearray(path.read_bytes());size=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+size]);binstart=28+size
 byname={o.data.name:o for o in objects};byname.update({o.name:o for o in objects})
 def access(i):
  a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];dt={5126:'<f4',5123:'<u2',5121:'u1'}[a['componentType']];nc={'VEC3':3,'VEC4':4}[a['type']];stride=v.get('byteStride',np.dtype(dt).itemsize*nc)
  return np.ndarray((a['count'],nc),dtype=dt,buffer=raw,offset=binstart+v.get('byteOffset',0)+a.get('byteOffset',0),strides=(stride,np.dtype(dt).itemsize)),a
 for m in doc['meshes']:
  o=byname[m['name']];kd=KDTree(len(o.data.vertices))
  for v in o.data.vertices:kd.insert(v.co,v.index)
  kd.balance();colors=o.data.color_attributes['Color']
  for prim in m['primitives']:
   if 'COLOR_0'not in prim['attributes']:continue
   positions,_=access(prim['attributes']['POSITION']);out,accessor=access(prim['attributes']['COLOR_0']);eye=doc['materials'][prim['material']]['name']=='eyes'
   for i,(x,z,ny) in enumerate(positions):
    _,vi,dist=kd.find(Vector((float(x),float(-ny),float(z))));assert dist<2e-5,(m['name'],dist)
    c=np.ones(4)if eye else np.array(colors.data[vi].color);out[i]=np.round(np.clip(c,0,1)*np.iinfo(out.dtype).max)if accessor.get('normalized')else c
 path.write_bytes(raw)
_original_export=export
def export(path):_original_export(path);restore_export_colours(path)
export(CAND/'coccosteus.glb');full=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
# Only textured material regions receive the albedo factor; oral and posterior
# regions in the same mesh remain plain vertex pigment. LOD never samples a map.
for o in objects:
 for material,array in [('armour',rgba),('fins',finrgba)]:
  indices={vi for p in o.data.polygons if o.data.materials[p.material_index].name==material for vi in p.vertices}
  if not indices:continue
  uv=o.data.uv_layers[0];col=o.data.color_attributes['Color'];byvertex={l.vertex_index:uv.data[i].uv.copy()for i,l in enumerate(o.data.loops)}
  for i in indices:
   q=byvertex[i];c=col.data[i].color;detail=array[int((q.y%1)*(array.shape[0]-1)),int((q.x%1)*(array.shape[1]-1)),:3];col.data[i].color=(*[c[k]*float(detail[k])for k in range(3)],1)
for mat in M.values():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF')
 for l in list(links):
  if l.to_node==bs and l.to_socket.name in ['Base Color','Normal','Roughness']:links.remove(l)
 vc=next((n for n in nodes if n.bl_idname=='ShaderNodeVertexColor'),None)
 if vc:links.new(vc.outputs['Color'],bs.inputs['Base Color'])
for o in objects:
 # Weld authoring UV seam duplicates before simplification so LOD skin remains closed.
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 if len(o.data.polygons)>40:
  bpy.context.view_layer.objects.active=o;dec=o.modifiers.new('Physical silhouette LOD','DECIMATE');dec.ratio=.28;bpy.ops.object.modifier_move_up(modifier=dec.name);bpy.ops.object.modifier_apply(modifier=dec.name)
for a in list(bpy.data.actions):
 if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
export(CAND/'coccosteus.lod1.glb');lod=sum(len(p.vertices)-2 for o in objects for p in o.data.polygons)
meta={'id':'coccosteus','name':'Coccosteus','species':'Coccosteus cuspidatus','provenance':'Middle Devonian, Scotland','description':'Compact arthrodire with a broad short jaw, sculpted dermal head and thoracic armour, rounded pectoral fans, anterior pelvic fins, one long low dorsal fin and a sharply heterocercal tail.','lengthMeters':.40,'modelLength':4.57,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-royal-society-of-edinburgh/article/abs/ixthe-placoderm-fish-coccosteus-cuspidatus-miller-ex-agassiz-from-the-middle-old-red-sandstone-of-scotland-part-i-descriptive-morphology/97AA5B04F2B9E00AA1FA5FC3D41627C7','https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction','https://palaeo-electronica.org/content/images/1343/figure7.jpg'],'notes':['Original anatomical reconstruction informed by Miles and Westoll 1968, revised body outline following Engelman 2024 figure 7.','Exact pigment, skin thickness, oral soft tissues and behaviour are inferred.','Continuous closed globe and head envelopes; fitted lid intersection does not count as eye-embedding tissue.','Full asset intentionally multiplies regional vertex pigment by a near-neutral UV dermal factor. Texture-free LOD bakes the factor once.','Jaw and cranial articulation coordinated with oral cheeks, palate, mandibular floor and rear throat; action labels are compatibility gestures, not gameplay design.']}
(CAND/'coccosteus.json').write_text(json.dumps(meta,indent=2));(LOCAL/'build-stats-v2.json').write_text(json.dumps({'fullTriangles':full,'lodTriangles':lod,'ratio':lod/full,'clips':clips,'source':str(sourcepath)},indent=2))
print('COCCOSTEUS_V2_GEOMETRY_COMPLETE',full,lod,str(CAND),flush=True)
