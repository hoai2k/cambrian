"""Rhinodipterus V3 head study, ported: longer head, fuller cheek, inset eyes, mapped cranial
sutures. Candidate-only Blender authoring; build.py (the shipped V2 reproduction) is untouched.

Port of the approved study (scratchpad rhin/study.py NEW dict) into this builder's own tables:

1. Longer head: HEAD and JAW y-coordinates stretched x1.12 about the rear (pivot -.68 for HEAD,
   -.70 for JAW), exactly as study.py's stretch(). Everything downstream that positions itself
   along the head/jaw's own y-axis is carried through the same affine map (stretchY, pivot -.68
   by default) rather than re-derived by hand: the buccal-lining and dermal-commissure y spans in
   this file, the tooth-plate placement and eyelid UV domain in anatomy-v3.py, and the opercular
   weight-paint band in motion-v3.py. Anchors follow in anchors-v3.json / export-v3.py.
2. Fuller cheek: HEAD rows at y=-1.46/-1.17/-.91 (pre-stretch) widened x1.14/1.16/1.10 and their
   `bottom` lowered by .030/.035/.025, per CHEEK, applied before the stretch.
3. Inset eyes: inward offset .026 -> .036 (a first .058 buried the globe entirely, audit 100%); radii (.070,.050,.049) -> (.066,.048,.047); the eye
   station y=-1.43 is carried through stretchY with the rest of the head.
4. Suture grooves on the upper shell: z -= .016*groove(y,a) for sin(a) > .05, SUT list (y's
   stretched by the same rule inside groove()) and groove() ported verbatim from the study.
5. BODY, fins and materials-v2.py are unchanged. materials-v2.py's cheek/oral blend calls
   interp(HEAD, v.co.y) / interp(JAW, v.co.y) directly against this file's HEAD/JAW globals, so it
   automatically follows the new tables with no edit of its own (confirmed by reading it).

Writes to a separate v3-candidate/ directory and eyes-v3.json / anchors-v3.json so the shipped
V2 candidate, anchors.json and eyes-v2.json are never touched by running this file.
"""
import bpy,bmesh,math,json,sys,hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
H=Path(__file__).resolve().parent;R=H.parents[3];L=R.parent/'devonian-authoring/rhinodipterus';C=L/'v3-candidate';C.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
s=bpy.context.scene;s.render.fps=30;objects=[]
M={}
for name,color,rough in [('body',(.11,.165,.09),.46),('head',(.105,.16,.09),.41),('jaw',(.105,.16,.09),.47),('oral',(.064,.024,.019),.5),('fins',(.10,.125,.056),.51),('eyes',(.002,.005,.004),.11),('dentine',(.28,.205,.10),.38),('gill',(.035,.043,.024),.60)]:
 m=bpy.data.materials.new(name);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=0;m.diffuse_color=(*color,1);M[name]=m
spec=[('root',(0,0,0),None),('body',(0,0,0),'root'),('skull',(0,-.73,.06),'body'),('jaw',(0,-.96,-.14),'skull'),('throat',(0,-.85,-.18),'skull')]
for i,y in enumerate([.25,.95,1.64,2.32]):spec.append(('tail'+str(i),(0,y,0),'body'if i==0 else'tail'+str(i-1)))
for sign in [1,-1]:
 q='L'if sign==1 else'R';spec.extend([('pectoral'+q,(sign*.31,-.58,-.16),'body'),('pectoralTip'+q,(sign*.76,-.19,-.32),'pectoral'+q),('pelvic'+q,(sign*.19,1.25,-.18),'tail1'),('gill'+q,(sign*.40,-.70,-.07),'skull')])
spec.extend([('dorsal',(0,.98,.34),'tail1'),('dorsal2',(0,1.87,.24),'tail2'),('anal',(0,2.14,-.18),'tail2'),('caudal',(0,2.63,.06),'tail3')])
arm=bpy.data.armatures.new('Rhinodipterus feeding and fin skeleton');rig=bpy.data.objects.new('rhinodipterus_rig',arm);s.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,0,.3)if n=='root'else(0,.3,0))
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT')

def mesh(name,v,f,mat,bone='body',weights=None,uv=None):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);s.collection.objects.link(o);me.materials.append(M[mat]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 col=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for d in col.data:d.color=(1,1,1,1)
 layer=me.uv_layers.new(name='UVMap')
 for loop in me.loops:layer.data[loop.index].uv=uv[loop.vertex_index]if uv else(0,0)
 weights=weights or[{bone:1}for _ in v]
 for bn in set(k for w in weights for k in w):
  g=o.vertex_groups.new(name=bn)
  for i,w in enumerate(weights):
   if w.get(bn,0)>0:g.add([i],float(w[bn]/sum(w.values())),'REPLACE')
 mod=o.modifiers.new('Anatomical deformation','ARMATURE');mod.object=rig;o.parent=rig
 return o

def interp(rows,y):
 ys=[r[0]for r in rows];k=max(0,min(len(rows)-2,int(np.searchsorted(ys,y))-1));a=np.array(rows[k]);b=np.array(rows[k+1]);t=np.clip((y-a[0])/(b[0]-a[0]),0,1);pre=np.array(rows[max(0,k-1)]);post=np.array(rows[min(len(rows)-1,k+2)]);d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]

# --- head/jaw study port: stretch(), CHEEK, and a shared stretchY() for every derived y below ---
def stretch(rows,sfac,pivot=-.68):
 return [(pivot+(r[0]-pivot)*sfac,)+tuple(r[1:]) for r in rows]
def stretchY(y,pivot=-.68,sfac=1.12):
 return pivot+(y-pivot)*sfac
CHEEK={-1.46:(1.14,-.030),-1.17:(1.16,-.035),-.91:(1.10,-.025)}
HEAD0=[(-2.32,0,-.060,-.060),(-2.285,.075,.052,-.047),(-2.20,.143,.106,-.062),(-1.99,.174,.163,-.070),(-1.73,.202,.221,-.083),(-1.46,.274,.306,-.099),(-1.17,.352,.365,-.123),(-.91,.405,.365,-.115),(-.68,.418,.350,.006)]
HEAD1=[(y,w*CHEEK[y][0],top,bot+CHEEK[y][1])if y in CHEEK else(y,w,top,bot)for y,w,top,bot in HEAD0]
HEAD=stretch(HEAD1,1.12)
SUT=[(-2.0,pi/2,-.75,pi/2),(-1.55,.55,-1.55,pi-.55),(-1.05,.5,-1.05,pi-.5),(-1.9,.75,-1.2,.75),(-1.9,pi-.75,-1.2,pi-.75),(-1.35,.30,-.85,.22),(-1.35,pi-.30,-.85,pi-.22)]
def groove(y,a):
 g=0
 for y0,a0,y1,a1 in SUT:
  y0=stretchY(y0);y1=stretchY(y1)
  Ln=math.hypot(y1-y0,(a1-a0)*.40);t=max(0,min(1,((y-y0)*(y1-y0)+(a-a0)*(a1-a0)*.16)/(Ln*Ln)))if Ln>0 else 0
  g+=math.exp(-(math.hypot(y-(y0+(y1-y0)*t),(a-(a0+(a1-a0)*t))*.40)/.020)**2)
 return min(1,g)
def hp(y,a):
 w,top,bottom=interp(HEAD,y);sn=sin(a);z=bottom+(top-bottom)*max(0,sn)**.78 if sn>=0 else bottom+min(1,w/.10)*(-.014*(-sn)**.5+.042*(-sn)**1.3)
 # Low sagittal fullness and shallow lateral cranial planes are part of the envelope.
 if sn>0:z+=.010*sn**7*sin(pi*np.clip((y-HEAD[0][0])/(HEAD[-1][0]-HEAD[0][0]),0,1))
 # Mapped cranial sutures relieved into the upper shell only (study.py's groove()).
 if sn>.05:z-=.016*groove(y,a)
 return Vector((w*cos(a),y,z))
v=[];f=[];uv=[];NY=164;NA=100
for j in range(NY):
 y=HEAD[0][0]+(HEAD[-1][0]-HEAD[0][0])*j/(NY-1)
 for k in range(NA+1):v.append(tuple(hp(y,2*pi*k/NA)));uv.append((j/(NY-1),k/NA))
for j in range(NY-1):
 for k in range(NA):a=j*(NA+1)+k;f.append((a,a+1,a+NA+2,a+NA+1))
f.extend([tuple(reversed(range(NA+1))),tuple((NY-1)*(NA+1)+k for k in range(NA+1))]);head=mesh('head_envelope_closed',v,f,'head','skull',uv=uv);head.data.materials.append(M['oral'])
for p in head.data.polygons:
 if p.index<(NY-1)*NA and p.index%NA>=NA//2:p.material_index=1
JAW0=[(-2.30,0,-.075,-.075),(-2.265,.070,-.062,-.104),(-2.18,.135,-.081,-.132),(-1.93,.17,-.112,-.177),(-1.65,.225,-.139,-.191),(-1.36,.298,-.16,-.215),(-1.13,.345,-.163,-.215),(-.94,.371,-.099,-.155),(-.79,.365,-.005,-.061),(-.70,0,-.015,-.015)]
JAW=stretch(JAW0,1.12,-.70)
def jp(y,a):
 w,floor,bottom=interp(JAW,y);sn=sin(a);return Vector((w*cos(a),y,floor+.018*min(1,w/.10)*max(0,sn) if sn>=0 else floor+(floor-bottom)*sn))
v=[];f=[];uv=[];NJ=112;AJ=96
for j in range(NJ):
 y=JAW[0][0]+(JAW[-1][0]-JAW[0][0])*j/(NJ-1)
 for k in range(AJ+1):v.append(tuple(jp(y,2*pi*k/AJ)));uv.append((j/(NJ-1),k/AJ))
for j in range(NJ-1):
 for k in range(AJ):a=j*(AJ+1)+k;f.append((a,a+1,a+AJ+2,a+AJ+1))
f.extend([tuple(reversed(range(AJ+1))),tuple((NJ-1)*(AJ+1)+k for k in range(AJ+1))]);jaw=mesh('Slender mandibular symphysis and paired rami',v,f,'jaw','jaw',uv=uv);jaw.data.materials.append(M['oral'])
for p in jaw.data.polygons:
 if p.index<(NJ-1)*AJ and p.index%AJ<AJ//2:p.material_index=1
# Fin/body proportions follow the explicitly comparative outline in Clement2012 Fig7G. Unchanged from V2.
BODY=[(-.99,.335,.170,.005),(-.78,.399,.285,.065),(-.57,.438,.371,-.013),(-.18,.449,.419,-.02),(.3,.407,.397,-.015),(.85,.344,.332,-.009),(1.35,.279,.277,-.010),(1.87,.209,.218,-.008),(2.30,.137,.161,.018),(2.64,.070,.112,.068),(2.90,.012,.045,.155)]
def bp(y,a):
 w,h,z=interp(BODY,y);return Vector((w*cos(a),y,z+h*sin(a)))
def tw(y):
 nodes=[(.14,'body'),(.48,'tail0'),(1.10,'tail1'),(1.82,'tail2'),(2.49,'tail3'),(2.88,'caudal')]
 if y<=nodes[0][0]:return {'body':1}
 if y>=nodes[-1][0]:return {'caudal':1}
 for(a,an),(b,bn)in zip(nodes,nodes[1:]):
  if a<=y<=b:q=(y-a)/(b-a);return{an:1-q,bn:q}
v=[];f=[];uv=[];ww=[];NB=170;AB=100
for j in range(NB):
 y=BODY[0][0]+(BODY[-1][0]-BODY[0][0])*j/(NB-1)
 for k in range(AB+1):v.append(tuple(bp(y,2*pi*k/AB)));ww.append(tw(y));uv.append((j/(NB-1),k/AB))
for j in range(NB-1):
 for k in range(AB):a=j*(AB+1)+k;f.append((a,a+1,a+AB+2,a+AB+1))
f.append(tuple((NB-1)*(AB+1)+k for k in range(AB+1)));oral_start=len(v);oral_face=len(f)
for j in range(37):
 q=j/36;factor=max(0,1-q*q)**.58
 for k in range(AB+1):
  a=2*pi*k/AB;v.append((.29*factor*cos(a),-.99+.96*q,-.07-.18*q*q+.07*factor*sin(a)));ww.append({'body':1});uv.append((q,k/AB))
for k in range(AB):f.append((k,oral_start+k,oral_start+k+1,k+1))
for j in range(36):
 for k in range(AB):a=oral_start+j*(AB+1)+k;f.append((a,a+AB+1,a+AB+2,a+1))
body=mesh('Continuous scaled torso and oral passage',v,f,'body',weights=ww,uv=uv);body.data.materials.append(M['oral'])
for p in body.data.polygons:
 if p.index>=oral_face+AB:p.material_index=1
# Shared palate/mandible boundaries form the posterior oral lining and outer cheeks. This mesh's
# own y-span sits inside the head/jaw's y-domain (the "oral tube's start"), so it is carried
# through stretchY() the same as the head loft, rather than left at its old absolute y.
v=[];f=[];ww=[];UV=[];NL=64;AL=80
for j in range(NL):
 t=j/(NL-1);y=stretchY(-1.18+.41*t);blend=np.clip((t-.52)/.48,0,1);blend=blend*blend*(3-2*blend)
 for k in range(AL+1):
  a=2*pi*k/AL;sn=sin(a);top=hp(y,3*pi/2).z-.003;bottom=jp(y,pi/2).z+.003;hw=float(interp(HEAD,y)[0]);jw=float(interp(JAW,y)[0]);jaww=(1-sn)/2
  w=hw*(1-jaww)+jw*jaww;z=(top+bottom)/2+(top-bottom)/2*sn
  w=(1-blend)*w*.993+blend*.2813;z=(1-blend)*z+blend*(-.0794+.0678*sn)
  v.append((w*cos(a),y,z));UV.append((t,k/AL));pump=.35*sin(pi*t)*max(0,-sn)*(1-blend);ww.append({'jaw':(1-blend)*jaww-pump,'throat':pump,'skull':(1-blend)*(1-jaww),'body':blend})
for j in range(NL-1):
 for k in range(AL):a=j*(AL+1)+k;f.append((a,a+1,a+AL+2,a+AL+1))
mesh('Buccal lining and compliant hyoid floor',v,f,'oral',weights=ww,uv=UV)
for sign in [1,-1]:
 vv=[];ff=[];weights=[];uv=[];NK=24
 for j in range(NL):
  t=j/(NL-1);y=stretchY(-1.62+.85*t);upper=hp(y,0);lower=jp(y,0);back=np.clip((t-.83)/.17,0,1);back=back*back*(3-2*back)
  # A tapered front commissure grows out of the real oral seam, without a rectangular patch.
  fullness=min(1,t/.18);middle=(upper.z+lower.z)/2
  for k in range(NK+1):
   # The local pucker (yy-y) is a fixed-scale skin wrinkle, not a head-length position: it is
   # left unscaled and only added on top of the already-stretched placement y.
   q=k/NK;yy=y+.11*sin(pi*q)*(1-t)**2;upper=hp(yy,0);lower=jp(yy,0);z=lower.z*(1-q)+upper.z*q;x=lower.x*(1-q)+upper.x*q
   x+=.002*sin(pi*q)*sin(pi*t);vv.append((sign*x,yy,z));uv.append(((yy-HEAD[0][0])/(HEAD[-1][0]-HEAD[0][0]),1-.020*(1-q) if sign>0 else .5+.020*(1-q)));weights.append({'jaw':(1-back)*(1-q),'skull':(1-back)*q,'body':back})
 for j in range(NL-1):
  for k in range(NK):a=j*(NK+1)+k;ff.append((a,a+1,a+NK+2,a+NK+1))
 mesh('Continuous dermal commissure '+str(sign),vv,ff,'head',weights=weights,uv=uv)
 inside=[(x-sign*.006,y,z)for x,y,z in vv];mesh('Inner commissural lining '+str(sign),inside,ff,'oral',weights=weights,uv=uv)
# One continuous tapered fleshy fin surface, never a cylindrical lobe on a separate paddle. Unchanged from V2.
def paired(name,sign,origin,end,width,bone,tip=None):
 origin=Vector(origin);end=Vector(end);axis=(end-origin).normalized();cross=Vector((-axis.y,axis.x,0)).normalized();normal=axis.cross(cross).normalized();vv=[];ff=[];ww=[];uv=[];NU=52;NV=56
 for j in range(NU):
  t=j/(NU-1);center=origin.lerp(end,t);center.z-=.022*sin(pi*t);half=width*(.20*(1-t)+sin(pi*t)**.76)*max(.025,1-t**8)
  for k in range(NV+1):
   a=2*pi*k/NV;lateral=cos(a);edge=sin(a);flesh=(.055*(1-t)**1.2+.032*sin(pi*t))*math.exp(-(lateral/.55)**4);thick=(.007*sin(pi*t)+flesh)*edge;p=center+cross*(half*lateral)+normal*thick;vv.append(tuple(p));uv.append((t,k/NV));rootw=max(0,1-t/.19)*.65;tipw=max(0,(t-.38)/.62)*.65 if tip else 0;wb={bone:1-rootw-tipw,'body'if 'pectoral'in bone else'tail1':rootw}
   if tip:wb[tip]=tipw
   ww.append(wb)
 for j in range(NU-1):
  for k in range(NV):a=j*(NV+1)+k;ff.append((a,a+1,a+NV+2,a+NV+1))
 ff.extend([tuple(reversed(range(NV+1))),tuple((NU-1)*(NV+1)+k for k in range(NV+1))]);return mesh(name,vv,ff,'fins',weights=ww,uv=uv)
for sign in [1,-1]:
 q='L'if sign==1 else'R';paired('Fleshy pectoral '+q,sign,(sign*.28,-.64,-.16),(sign*.91,.20,-.39),.22,'pectoral'+q,'pectoralTip'+q);paired('Fleshy pelvic '+q,sign,(sign*.145,1.20,-.17),(sign*.69,1.89,-.41),.19,'pelvic'+q)
# Median fins preserve local body-chain attachment; distal lobes have independent timing. Unchanged from V2.
def median(name,outline,bone):
 vv=[];ff=[];ww=[];uv=[];N=88;K=30
 # outline entries y, baseZ, edgeZ; a closed top/bottom sheet naturally tapers at each end.
 for j in range(N):
  y=outline[0][0]+(outline[-1][0]-outline[0][0])*j/(N-1);base,edge=interp(outline,y)
  if bone in ['dorsal','dorsal2']:base=bp(y,pi/2).z-.014
  elif bone=='anal':base=bp(y,3*pi/2).z+.014
  for k in range(K+1):
   a=2*pi*k/K;h=(edge-base)*.5;z=(edge+base)/2+h*cos(a);th=.008*sin(pi*j/(N-1))*sin(a);vv.append((th,y,z));uv.append((j/(N-1),k/K));free=np.clip(abs(z-base)/max(.08,abs(edge-base))*.72,0,.72);wb={b:w*(1-free)for b,w in tw(y).items()};wb[bone]=wb.get(bone,0)+free;ww.append(wb)
 for j in range(N-1):
  for k in range(K):a=j*(K+1)+k;ff.append((a,a+1,a+K+2,a+K+1))
 ff.extend([tuple(reversed(range(K+1))),tuple((N-1)*(K+1)+k for k in range(K+1))]);mesh(name,vv,ff,'fins',weights=ww,uv=uv)
median('First dorsal',[(.70,.34,.34),(.95,.32,.54),(1.24,.30,.63),(1.42,.27,.49),(1.51,.255,.255)],'dorsal')
median('Second dorsal',[(1.56,.26,.26),(1.84,.23,.52),(2.08,.20,.54),(2.27,.19,.40),(2.40,.18,.18)],'dorsal2')
median('Anal fin',[(1.91,-.205,-.205),(2.09,-.17,-.39),(2.37,-.12,-.42),(2.61,-.045,-.045)],'anal')
median('Heterocercal caudal',[(2.42,.09,.09),(2.69,-.04,.26),(2.98,-.27,.46),(3.31,-.20,.62),(3.49,.20,.61),(3.57,.46,.46)],'caudal')
# Closed oval eyes remain seated in cranial tissue; fitted lids will follow actual intersection.
# Study port: eye station y stretched with the head; inset offset .026->.058; radii shrunk.
eyes=[]
for sign in [1,-1]:
 cy=stretchY(-1.43);a=.27;surface=hp(cy,a);normal=Vector((1,0,.30)).normalized();center=surface-normal*.036;center.x*=sign;basis=[Vector((0,1,0)),Vector((-.287*sign,0,.958)),Vector((.958*sign,0,.287))];radii=(.066,.048,.047);vv=[];ff=[]
 for j in range(33):
  lat=pi*j/32
  for k in range(64):ang=2*pi*k/64;vv.append(tuple(center+basis[0]*(radii[0]*sin(lat)*cos(ang))+basis[1]*(radii[1]*sin(lat)*sin(ang))+basis[2]*(radii[2]*cos(lat))))
 for j in range(32):
  for k in range(64):a=j*64+k;ff.append((a,j*64+(k+1)%64,(j+1)*64+(k+1)%64,a+64))
 mesh('eye_globe_'+('L'if sign==1 else'R'),vv,ff,'eyes','skull');eyes.append({'side':sign,'center':list(center),'radii':radii,'basis':[list(b)for b in basis]})
(H/'eyes-v3.json').write_text(json.dumps(eyes,indent=2))
if '--clay' not in sys.argv:exec(compile((H/'anatomy-v3.py').read_text(),str(H/'anatomy-v3.py'),'exec'))
# Clay stage: preserve complete source and inspect head/fin silhouette before texture production.
rig.animation_data_create();a=bpy.data.actions.new('Idle');rig.animation_data.action=a
for b in rig.pose.bones:b.rotation_mode='XYZ';b.rotation_euler=(0,0,0)
for b in rig.pose.bones:
 if b.name!='root':b.keyframe_insert('rotation_euler',frame=0);b.keyframe_insert('rotation_euler',frame=72)
s.frame_set(0);bpy.ops.wm.save_as_mainfile(filepath=str(L/'rhinodipterus-v3-clay.blend'))
if '--clay' not in sys.argv:
 exec(compile((H/'materials-v2.py').read_text(),str(H/'materials-v2.py'),'exec'))
 exec(compile((H/'motion-v3.py').read_text(),str(H/'motion-v3.py'),'exec'))
 exec(compile((H/'export-v3.py').read_text(),str(H/'export-v3.py'),'exec'))
