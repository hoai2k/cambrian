"""Dunkleosteus V3: user-sculpt port onto the V2 builder. Never publishes assets; candidate
output is confined to wherever DUNK_OUT points (must not be public/), never V2's own output.

Ground truth check first: the actually shipped public asset is NOT a plain build_v2.py export.
git history (commit 379377d) and docs/devonian/current-state.md show it is
`face-v4/study_02.py` (candidate02: a cheek/brow/roof sculpt_face() displacement of the V2 head,
plus a first ray-cast-fitted gnathal set) followed by `face-v4/study_03.py` (candidate03: the
same head/eyes preserved byte-for-byte, only the three gnathal blades replaced by a refined
ray-cast-fitted set) — confirmed empirically: a fresh unmodified build_v2.py rebuild measured
against the shipped GLB (`npm run sculpt:measure`) matches exactly everywhere except the head
region (stations 15-19), where shipped is measurably wider/taller, consistent with candidate02's
outward cheek push and roof raise. The frozen local .blend inputs those two scripts require
(hashed, `assert sha(INPUT)==EXPECTED_INPUT`) do not exist in this environment (only their
public-asset *output* was ever committed), so they cannot be re-run verbatim here. This file
instead reconstructs the same pipeline from build_v2.py's own construction plus the two studies'
own functions (`sculpt_face`, `blade`/`fitted_root`/`support_tree`), copied in unmodified from
`face-v4/study_02.py` and `face-v4/study_03.py`, run against a head built from the sculpted
profile below instead of V2's original one — so the shipped cheek/brow/roof treatment and the
shipped gnathal fitting both react to the user's sculpt exactly as they would have reacted to a
hand-sculpted V2 head, because that is genuinely what they do (BVH ray-casts and position/normal-
based falloffs against whatever head they are handed, never against fixed V2 coordinates).

The sculpt (`docs/viewer-sculpt.md`, `/home/user/devonian-authoring/sculpts/dunkleosteus-sculpt.json`):
a taller crown behind the snout and a lower nose, at stations 16-19 (axis .94/1.12/1.31/1.49),
unchanged behind station 15 (axis <=.79). It is carried as one thing, not two: the exported
station table is embedded verbatim (`SCULPT`) and the builder reproduces the viewer's own warp
(`profileWarp` in `src/viewer/sculpt/profile.ts`) as a single per-vertex pass over the finished
geometry — the axial shifts as the same piecewise-linear axis remap, the dorsal edit as the same
scale of a vertex's height above the local centre line, the two pulled tangents (stations 18, 19)
in the same cubic Hermite. `sculpt_warp()` is that function in the builder's own frame; it is
applied once, at the end of the geometry pass, to head, jaw, oral lining, all three ray-cast-fitted
gnathal blades, both eye globes and the three feeding sockets. Nothing moves isolated control
points or ray-cast rows: that compresses their spacing to their neighbours and drags otherwise
untouched stations along with it (measured, five to thirty percent at nearby stations), where a
warp by each vertex's own axial position preserves relative spacing exactly and carries everything
seated against the head with it, with no separate seating logic anywhere. Behind station 15 the
edited and base curves agree and the warp is the identity to within a thousandth of a unit.

Why the viewer's warp and not the exported station numbers themselves: `npm run sculpt:measure`
reads a station as the *extreme* over a window half a station's spacing either side, not as a
point sample, so past station 17 the two cannot both be satisfied — hitting the numbers means
flattening the cranial roof over the whole window and bevelling the snout tip off, and the
viewer's own warp of the shipped GLB measures +65% against its own station-19 dorsal target.
The preview the user sculpted against and approved is the warp, so the warp is the port; the
deviations this build actually lands are in README.md under "V3 - sculpt port".
"""
import bpy,bmesh,math,json,random,os
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from math import sin,cos,pi
H=Path(__file__).resolve().parent;R=H.parents[3]
O=Path(os.environ['DUNK_OUT']) if os.environ.get('DUNK_OUT') else (R.parent/'devonian-authoring/dunkleosteus/sculpt-candidate')
assert 'public' not in O.parts, 'V3 candidate output must never point at public/'
O.mkdir(parents=True,exist_ok=True);L=O;V=L
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
scene=bpy.context.scene;scene.render.fps=30
arm=bpy.data.armatures.new('Dunkleosteus_v2_anatomical_rig');rig=bpy.data.objects.new('Dunkleosteus',arm);scene.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
spec=[('root',(0,0,0),None),('body',(0,-.2,0),'root'),('head',(0,-.64,.25),'body'),('jaw',(0,-.69,-.22),'head'),('tail_base',(0,.24,.06),'body'),('tail_mid',(0,.70,.07),'tail_base'),('tail_tip',(0,1.09,.035),'tail_mid'),('caudal',(0,1.33,.02),'tail_tip'),('dorsal',(0,.33,.40),'tail_base'),('anal',(0,.69,-.21),'tail_mid')]
for s in [-1,1]:
 side='L'if s>0 else'R';spec.extend([(f'pectoral_{side}',(s*.31,-.61,-.28),'body'),(f'pectoral_tip_{side}',(s*.72,-.31,-.42),f'pectoral_{side}'),(f'pelvic_{side}',(s*.16,.35,-.33),'body')])
for n,p,pa in spec:
 b=arm.edit_bones.new(n);b.head=p;b.tail=Vector(p)+Vector((0,.16,0));b.use_deform=n!='root'
 if pa:b.parent=arm.edit_bones[pa]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
M={};images={}
def image(n):
 if n not in images:
  im=bpy.data.images.load(str(H/n));im.pack();images[n]=im
 return images[n]
def material(n,col,rough=.45,pbr=None):
 m=bpy.data.materials.new(n);m.diffuse_color=(*col,1);m.use_nodes=True;nt=m.node_tree;bs=nt.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*col,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['IOR'].default_value=1.38
 if pbr:
  for suffix,inp in [('albedo','Base Color'),('roughness','Roughness'),('normal','Normal')]:
   im=image(f'{pbr}-{suffix}.png');tx=nt.nodes.new('ShaderNodeTexImage');tx.name=suffix;tx.image=im
   if suffix!='albedo':im.colorspace_settings.name='Non-Color'
   if suffix=='normal':no=nt.nodes.new('ShaderNodeNormalMap');no.inputs['Strength'].default_value=.55;nt.links.new(tx.outputs['Color'],no.inputs['Color']);nt.links.new(no.outputs['Normal'],bs.inputs[inp])
   else:nt.links.new(tx.outputs['Color'],bs.inputs[inp])
 M[n]=m;return m
material('body_armour_living_skin',(.12,.15,.13),pbr='body');material('fins_membrane',(.12,.17,.14),pbr='fin');material('eye_dark_cornea',(.006,.010,.009),.205,pbr='eye');material('gnathal_bone',(.42,.375,.255),.37,pbr='gnathal');material('oral_mucosa',(.105,.038,.032),.39,pbr='oral');material('pharynx_mucosa',(.047,.018,.021),.52)
# Image pixels are used only for the dedicated LOD vertex bake; full is proper UV PBR.
# Image.pixels returns the file's raw stored (gamma-encoded sRGB) values, not the linear
# values the shader graph gets from the same texture via an Image Texture node — that node
# decodes sRGB->linear automatically because the image keeps the default sRGB colorspace
# (never overridden to Non-Color for suffix=='albedo' in material()). Sampling im.pixels
# straight into BakedPigment skipped that decode, so the LOD's baked colour came out ~2.4x
# too bright relative to the full model's textured colour: a rendered-paler LOD. Decode here
# so the vertex bake matches what the full model's shader actually shows.
def srgb_to_linear(c):
 return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
pix={}
for k in ['body','fin','gnathal','eye','oral']:
 im=image(k+'-albedo.png');arr=np.array(im.pixels[:]).reshape(im.size[1],im.size[0],4)
 arr[...,:3]=srgb_to_linear(arr[...,:3]);pix[k]=(im.size[0],im.size[1],arr)
objects=[]
def bodyuv(p):
 x,y,z=p;return((y+1.48)/3.48,((math.atan2(z,x)+pi/2)/(2*pi))%1)
def mesh(n,verts,faces,ma,bone='body',weights=None,uvs=None,sub=0,inward=False):
 me=bpy.data.meshes.new(n);me.from_pydata(verts,[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));
 if inward:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
 bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);scene.collection.objects.link(o);me.materials.append(M[ma]);o.parent=rig;objects.append(o)
 for p in me.polygons:p.use_smooth=True
 uv=me.uv_layers.new(name='UVMap')
 for f in me.polygons:
  vals=[uvs[me.loops[i].vertex_index] if uvs else bodyuv(me.vertices[me.loops[i].vertex_index].co) for i in f.loop_indices]
  if ma=='body_armour_living_skin' and max(v[1]for v in vals)-min(v[1]for v in vals)>.5:vals=[(u,v+1 if v<.5 else v)for u,v in vals]
  for li,p in zip(f.loop_indices,vals):uv.data[li].uv=p
 # Full vertex Color is neutral to avoid multiplying the albedo twice; BakedPigment retained in source.
 vc=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');bc=me.color_attributes.new(name='BakedPigment',type='FLOAT_COLOR',domain='POINT')
 for i,p in enumerate(verts):
  if ma.startswith('body')or ma.startswith('fins')or ma.startswith('gnathal')or ma.startswith('eye')or ma.startswith('oral'):
   key='body'if ma.startswith('body')else'fin'if ma.startswith('fins')else'gnathal'if ma.startswith('gnathal')else'eye'if ma.startswith('eye')else'oral';W,T,pp=pix[key];u,v=uvs[i]if uvs else bodyuv(p);col=pp[int((v%1)*(T-1)),int((u%1)*(W-1)),:3]
  else:col=M[ma].diffuse_color[:3]
  vc.data[i].color=(1,1,1,1);bc.data[i].color=(*col,1)
 if weights:
  groups={g:o.vertex_groups.new(name=g)for g in set(k for w in weights for k in w)}
  for i,w in enumerate(weights):
   ss=sum(w.values())
   for g,amount in w.items():
    if amount>0:groups[g].add([i],amount/ss,'REPLACE')
 else:o.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
 if sub:
  d=o.modifiers.new('Carefully supported subdivision','SUBSURF');d.levels=sub;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=d.name)
 md=o.modifiers.new('Anatomical deformation','ARMATURE');md.object=rig
 return o

def cat(points,steps=4,closed=False):
 points=[np.array(x,dtype=float)for x in points];out=[];N=len(points)
 for j in range(N if closed else N-1):
  a=points[(j-1)%N]if closed else points[max(0,j-1)];b=points[j];c=points[(j+1)%N];d=points[(j+2)%N]if closed else points[min(N-1,j+2)]
  for k in range(steps):
   t=k/steps;out.append(.5*(2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t**3))
 if not closed:out.append(points[-1])
 return out

def tailweight(y):
 centers=[(.07,'body'),(.42,'tail_base'),(.84,'tail_mid'),(1.19,'tail_tip'),(1.5,'caudal')]
 if y<=centers[0][0]:return{'body':1}
 if y>=centers[-1][0]:return{'caudal':1}
 for (a,an),(b,bn)in zip(centers,centers[1:]):
  if a<=y<=b:t=(y-a)/(b-a);t=t*t*(3-2*t);return{an:1-t,bn:t}
# Cross sections explicitly trace the cranial wedge and deep but streamlined trunk.
def loft(n,rings,bone='body',tail=False,N=64,steps=4,exp=.86,sub=1,ma='body_armour_living_skin',cap_front=True):
 rows=cat(rings,steps);v=[];w=[];uv=[]
 for y,rx,top,bot in rows:
  zc=(top+bot)/2;rz=(top-bot)/2
  for k in range(N):
   th=2*pi*k/N-pi/2;c=cos(th);s=sin(th);x=rx*math.copysign(abs(c)**exp,c);z=zc+rz*s
   # Shallow sagittal cranial ridge rather than a dome-shaped forehead.
   if bone=='head':z+=.010*max(0,s)**6*sin(pi*max(0,min(1,(y+1.48)/.93)))
   v.append((x,y,z));uv.append(((y+1.48)/3.48,k/N));w.append(tailweight(y)if tail else{bone:1})
 faces=[]
 for j in range(len(rows)-1):
  for k in range(N):faces.append((j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k))
 if cap_front:faces.append(tuple(range(N-1,-1,-1)))
 faces.append(tuple((len(rows)-1)*N+k for k in range(N)))
 o=mesh(n,v,faces,ma,bone,w,uv,sub);return o
# Closed cranial arch: flattened roof and integrated cheek walls, concave palate underside.
#
# The user's sculpt is carried the way the viewer's own preview carries it: as one smooth
# per-vertex warp of the finished body, driven by the exported station table (`SCULPT` below) —
# the axial shifts as a piecewise-linear remap of the axis, the dorsal edit as a scale of each
# vertex's height above the local centre line, with the two pulled tangents in the spline. That
# is what `src/viewer/sculpt/profile.ts` does to the loaded model (`profileWarp`), so it is what
# the user saw and approved; reproducing it here is what "port the sculpt" means, and it is also
# the only formulation that keeps everything seated for free — the jaw, the oral lining, all three
# ray-cast-fitted gnathal blades and both eye globes ride the head they sit against, with no
# separate seating logic. Applied once, at the end of the geometry pass ("global sculpt warp"
# below), never as a move of a handful of control points: moving isolated rows compresses their
# spacing to their neighbours and drags otherwise-untouched stations' measurements with them
# (measured: five to thirty percent at nearby stations), where a warp by the vertex's own axial
# position preserves relative spacing exactly. Behind station 15 the two curves agree and the
# warp is the identity to within a thousandth, so the body, tail and fins are untouched.
#
# A note on `npm run sculpt:measure`: a station's value is the *extreme* over a window ±half a
# station's spacing wide, not a point sample, so the exported station numbers and the curve the
# viewer warps by cannot both be hit at once wherever the profile changes fastest. They disagree
# most at station 19, the half-window behind the snout tip: the sculpt raises station 18 by 25%
# and drops 19 by 12.5%, and the edited spline between them still runs well above the shipped one
# over most of that window. Measured, the viewer's own warp of the shipped GLB reads +65% against
# the station-19 dorsal target (and this build tracks that warp, not the target). Chasing the
# number instead flattens the cranial roof and bevels the snout off; see README.md, "V3".
ORIG8=[(-1.48,.202,.104,.020),(-1.46,.232,.119,.004),(-1.40,.263,.153,-.025),(-1.23,.322,.231,-.096),(-1.03,.369,.319,-.211),(-.79,.391,.387,-.296),(-.61,.379,.409,-.333),(-.565,.361,.397,-.318)]
# ---- the sculpt itself: `docs/sculpts/dunkleosteus-sculpt.json` as exported from the viewer,
# in the GLB root frame (axis +z forward, up +y, width from the lateral midline at x=0). One row
# per station: (axis, axial shift, dorsal base, dorsal edit, ventral, width, pulled dorsal
# tangent). Ventral and width were not edited and carry no pulled tangent, so their two curves are
# the same; only the dorsal curve and the axis map differ between base and edit.
SCULPT=[(-1.961908,0,.73497,.73497,.565725,.00917,None),(-1.780334,0,.682477,.682477,-.579897,.021205,None),(-1.598759,0,.531225,.531225,-.508611,.04028,None),(-1.417185,0,.339728,.339728,-.357969,.051268,None),(-1.235611,0,.117986,.117986,-.155833,.067762,None),(-1.054037,0,.287176,.287176,-.119484,.10758,None),(-.872463,0,.569398,.569398,-.473889,.162741,None),(-.690889,0,.760718,.760718,-.479872,.445,None),(-.509315,0,.85489,.85489,-.425182,.392273,None),(-.327741,0,.699672,.699672,-.397732,.369987,None),(-.146167,0,.493336,.493336,-.44282,.413195,None),(.035407,0,.50469,.50469,-.522839,1.135,None),(.216981,0,.504893,.504893,-.522839,1.021818,None),(.398556,0,.493577,.493577,-.51423,.833182,None),(.58013,0,.452145,.452145,-.479629,.682273,None),(.761704,0,.406535,.406535,-.376836,.455909,None),(.943278,.002954,.372762,.3847,-.328336,.431341,None),(1.124852,.007931,.316859,.358313,-.292768,.41087,None),(1.306426,.038574,.240225,.301188,-.24796,.368338,-.659973),(1.488,-.03429,.171201,.149754,-.179369,.281244,-1.785891)]
_SA=[r[0]for r in SCULPT];_SS=[r[1]for r in SCULPT];_N=len(SCULPT)
# base values, edit values, explicit edit tangents — exactly `profile.ts`'s three curves.
_CURVES={'dorsal':([r[2]for r in SCULPT],[r[3]for r in SCULPT],[r[6]for r in SCULPT]),
         'ventral':([r[4]for r in SCULPT],[r[4]for r in SCULPT],[None]*_N),
         'width':([r[5]for r in SCULPT],[r[5]for r in SCULPT],[None]*_N)}
def _auto(vals,i):
 p=max(0,i-1);q=min(_N-1,i+1);da=_SA[q]-_SA[p];return(vals[q]-vals[p])/da if da>0 else 0.
def _span(a):
 i=0
 while i<_N-2 and _SA[i+1]<=a:i+=1
 return i
def _eval(curve,which,a):
 """Cubic Hermite through the stations, clamped beyond them; a pulled tangent wins on the edit
 curve, which is `slope()`/`evaluate()` in src/viewer/sculpt/profile.ts."""
 base,edit,tans=_CURVES[curve];vals=edit if which=='edit' else base
 if a<=_SA[0]:return vals[0]
 if a>=_SA[_N-1]:return vals[_N-1]
 i=_span(a);da=_SA[i+1]-_SA[i]
 if da<=0:return vals[i]
 t=(a-_SA[i])/da;t2=t*t;t3=t2*t
 sl=lambda k:(tans[k] if which=='edit' and tans[k] is not None else _auto(vals,k))*da
 return(2*t3-3*t2+1)*vals[i]+(t3-2*t2+t)*sl(i)+(-2*t3+3*t2)*vals[i+1]+(t3-t2)*sl(i+1)
def _remap(a):
 """Edited axial position: piecewise linear through the shifted stations, monotone by construction."""
 if a<=_SA[0]:return a+_SS[0]
 if a>=_SA[_N-1]:return a+_SS[_N-1]
 i=_span(a);da=_SA[i+1]-_SA[i];t=(a-_SA[i])/da if da>0 else 0.
 return(_SA[i]+_SS[i])+((_SA[i+1]+_SS[i+1])-(_SA[i]+_SS[i]))*t
_EPS=1e-6
def sculpt_warp(x,y,z):
 """One Blender-frame point through the sculpt. The builder is z-up and its exporter maps y to
 -z, so the sculpt's axis is -y, its up is z and its lateral is x (docs/viewer-sculpt.md). Height
 above the base centre line scales to the edited dorsal line, depth below it to the edited
 ventral line, the lateral offset by the width ratio, and the axis follows the shifted stations."""
 a=-y;db=_eval('dorsal','base',a);vb=_eval('ventral','base',a);de=_eval('dorsal','edit',a);ve=_eval('ventral','edit',a)
 cb=(db+vb)/2;ce=(de+ve)/2
 zz=ce+(z-cb)*((de-ce)/max(db-cb,_EPS) if z>=cb else (ce-ve)/max(cb-vb,_EPS))
 return(x*(_eval('width','edit',a)/max(_eval('width','base',a),_EPS)),-_remap(a),zz)
headrings=cat(ORIG8,5)
section=cat([(0,1),(.45,.995),(.79,.82),(.97,.36),(1,-.28),(.92,-.91),(.76,-1),(.71,-.18),(.51,.27),(0,.34),(-.51,.27),(-.71,-.18),(-.76,-1),(-.92,-.91),(-1,-.28),(-.97,.36),(-.79,.82),(-.45,.995)],4,True)
v=[];uv=[];N=len(section)
for y,rx,top,bot in headrings:
 for x,z in section:
  zz=(top+bot)/2+(top-bot)/2*z;v.append((x*rx,y,zz));uv.append(((y+1.48)/3.48,((math.atan2(z,x)+pi/2)/(2*pi))%1))
f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(headrings)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(headrings)-1)*N+k for k in range(N))])
head=mesh('head_envelope_closed',v,f,'body_armour_living_skin','head',uvs=uv,sub=1)
body=loft('body_envelope_with_pharyngeal_opening',[(-.655,.368,.394,-.325),(-.60,.39,.415,-.365),(-.36,.43,.49,-.465),(-.05,.435,.505,-.465),(.22,.381,.47,-.410),(.49,.285,.37,-.304),(.78,.175,.24,-.194),(1.03,.09,.13,-.10),(1.28,.055,.086,-.065),(1.425,.051,.083,-.062)],tail=True,exp=.89,cap_front=False)
# Lower jaw is a closed, shallow muscular jaw envelope; all interior lining is separate below.
jaw=loft('lower_jaw_envelope_closed',[(-1.475,.176,-.091,-.141),(-1.445,.220,-.101,-.165),(-1.28,.278,-.139,-.232),(-1.06,.303,-.184,-.293),(-.82,.307,-.204,-.336),(-.66,.275,-.191,-.331)],'jaw',N=56,exp=.72)
# Hollow lined mouth: all around the aperture, into a curved recessed pharynx. No black end plate.
v=[];weights=[];uv=[];N=80
oralrows=cat([(-1.420,.247,.050,-.120),(-1.33,.257,.070,-.148),(-1.15,.267,.108,-.210),(-.92,.268,.131,-.248),(-.72,.250,.140,-.248),(-.55,.280,.139,-.282),(-.405,.246,.12,-.277),(-.24,.175,.077,-.258),(-.10,.079,-.012,-.205),(-.035,.024,-.073,-.145),(-.01,.002,-.105,-.107)],5)
for j,(y,rx,top,bot) in enumerate(oralrows):
 for k in range(N):
  th=2*pi*k/N-pi/2;sn=sin(th);cz=(top+bot)/2;rz=(top-bot)/2
  # Shallow transverse mucosal folds in the pharynx and longitudinal floor, anatomical art interpretation.
  corr=.0025*sin(j*1.8)*sin(pi*j/(len(oralrows)-1))
  jt=j/(len(oralrows)-1);swept_y=y+.65*cos(th)**4*(1-jt)**2;fold=.0025*cos(th*10)*sin(pi*jt);zoral=cz+(rz+corr+fold)*sn
  if sn<0 and y<-.68:
   floorfit=min(1,-sn*4);zoral=zoral*(1-floorfit)+(bot-.10*cos(th)**2)*floorfit
  v.append(((rx+corr+fold)*cos(th),swept_y,zoral));uv.append((k/N,j/(len(oralrows)-1)))
  lower=max(0,min(1,(.16-sn)/.32));front=max(0,min(1,(-y-.30)/.38));jw=lower*front;weights.append({'jaw':jw,'head':1-jw})
f=[(j*N+k,(j+1)*N+k,(j+1)*N+(k+1)%N,j*N+(k+1)%N)for j in range(len(oralrows)-1)for k in range(N)];f.append(tuple((len(oralrows)-1)*N+k for k in range(N)))
oral=mesh('mouth_lining_palate_inner_cheeks_floor_pharynx',v,f,'oral_mucosa','head',weights,uv,inward=True)
# The oral floor and palate are the inward surfaces of the actual jaw/cranial
# envelope, with mucosa on those faces. This prevents an exterior skin layer
# from occluding the flexible lining at extreme gape.
def mucosal_faces(obj,predicate):
 obj.data.materials.append(M['oral_mucosa']);uv=obj.data.uv_layers.active
 for face in obj.data.polygons:
  if not predicate(face):continue
  face.material_index=len(obj.data.materials)-1
  for li in face.loop_indices:
   i=obj.data.loops[li].vertex_index;p=obj.data.vertices[i].co
   u=max(.001,min(.999,.5+p.x/.65));v=max(.001,min(.999,(p.y+1.48)/1.2));uv.data[li].uv=(u,v)
   W,T,pp=pix['oral'];obj.data.color_attributes['BakedPigment'].data[i].color=(*pp[int(v*(T-1)),int(u*(W-1)),:3],1)
mucosal_faces(jaw,lambda f:f.normal.z>.12)
mucosal_faces(head,lambda f:(f.normal.x*f.center.x<-.025 or (f.normal.z<-.65 and abs(f.center.x)<.19)))

# Eyes: closed oval globes, >65% actual volume inside the closed head mesh, not socket cups.
# Sculpt an integrated orbital brow into the closed cranial envelope, not an added socket rim.
# V2's own small per-eye brow bump runs first, exactly as it does in the real pipeline (baked into
# V2 before either face-v4 study ever sees the head).
for vertex in head.data.vertices:
 p=vertex.co;side=1 if p.x>=0 else -1
 amount=.008*math.exp(-((p.y+1.23)/.115)**2-((p.z-.192)/.027)**2)*max(0,min(1,(abs(p.x)-.19)/.08))
 p.x+=side*amount;p.z+=amount*.22
head.data.update()

# ---- face-v4/study_02.py's sculpt_face(), copied in unmodified (candidate02's own constants) ----
# "Shape the existing closed envelope, including the actual orbital support. Surface-normal masks
# exclude inward-facing palate and mucosal cheek walls." Runs against whatever head it is handed —
# here, the head already built with the sculpted dorsal override above — exactly as it ran against a
# hand-sculpted V2 head in the real pipeline.
def smooth(a,b,x):
 t=max(0.,min(1.,(x-a)/(b-a)));return t*t*(3.-2.*t)
def segment_distance(y,z,a,b):
 dy,dz=b[0]-a[0],b[1]-a[1];t=max(0.,min(1.,((y-a[0])*dy+(z-a[1])*dz)/(dy*dy+dz*dz)));return math.hypot(y-a[0]-t*dy,z-a[1]-t*dz)
def signed_polygon_distance(y,z,poly):
 inside=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>z)!=(b[1]>z) and y<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:inside=not inside
 d=min(segment_distance(y,z,a,b)for a,b in zip(poly,poly[1:]+poly[:1]));return d if inside else -d
def sculpt_face():
 cheek=[(-1.405,.016),(-1.327,.080),(-1.220,.108),(-1.089,.209),(-.885,.290),(-.698,.221),(-.639,.040),(-.661,-.222),(-.782,-.291),(-.980,-.228),(-1.153,-.095)]
 brow=[(-1.404,.113),(-1.328,.190),(-1.255,.225),(-1.177,.221),(-1.110,.176)]
 # "More evenly sampled support for narrow relief; all original input data remains in V2."
 refine=head.modifiers.new('Face study 02 continuous support','SUBSURF');refine.levels=1
 bpy.context.view_layer.objects.active=head;bpy.ops.object.modifier_move_up(modifier=refine.name);bpy.ops.object.modifier_apply(modifier=refine.name)
 head.data.update();frozen=[(v.co.copy(),v.normal.copy())for v in head.data.vertices]
 for v,(original,normal)in zip(head.data.vertices,frozen):
  p=v.co;x,y,z=original[:];s=1 if x>=0 else -1
  outside=smooth(.08,.60,normal.x*s);outside*=smooth(.12,.22,abs(x))
  d=signed_polygon_distance(y,z,cheek)
  raised=.043*smooth(-.012,.054,d);seam=-.0035*math.exp(-(d/.016)**2)
  browdist=min(segment_distance(y,z,a,b)for a,b in zip(brow,brow[1:]));supraorbital=.032*math.exp(-(browdist/.040)**2)
  p.x+=s*outside*(raised+seam+supraorbital);p.z+=outside*supraorbital*.30
  roof=smooth(.25,.75,normal.z);p.z+=roof*.017*math.exp(-((y+1.39)/.135)**2)*(1.-.38*smooth(.12,.25,abs(x)))
 head.data.update()
sculpt_face()

# ---- face-v4/study_03.py's support_tree/fitted_root/blade, copied in unmodified (candidate03's
# own row data below, which is what is actually shipped) ----
# The head/jaw are still at their *unwarped* axial position here (dorsal-edited, not yet shifted —
# the global axial warp runs after every mesh, gnathals included, is built, at the very end of the
# geometry pass), so V2's/candidate03's own clamp (y=-1.468) is unchanged and correct as-is.
def support_tree(name):
 obj=bpy.data.objects[name];return BVHTree.FromPolygons([v.co for v in obj.data.vertices],[p.vertices for p in obj.data.polygons])
def fitted_root(tree,x,y,lower):
 # Actual rigid envelope intersection; roots sink 6 mm into the supporting shell.
 direction=Vector((0,0,-1 if lower else 1))
 for attempt in range(32):
  xx=math.copysign(max(.015,abs(x)-.002*attempt),x)
  p,n,idx,d=tree.ray_cast(Vector((xx,max(y,-1.468)if not lower else y,1 if lower else -1)),direction,3)
  if p is not None:return xx,p.z+(-.006 if lower else .006)
 raise RuntimeError('No gnathal root support at '+repr((x,y,lower)))
def blade(name,rows,bone,s):
 # Each explicit row is y, lateral centre, broad buried root z, cutting edge z, root half-width,
 # edge half-width. Six- or eight-sided chisel section is never a cone.
 sections=[]
 for a,b in zip(rows,rows[1:]):
  for j in range(5):
   t=j/5;sections.append([a[k]*(1-t)+b[k]*t for k in range(6)])
 sections.append(rows[-1]);verts,uvs=[],[]
 lower=bone=='jaw';posterior=name.startswith('posterior_');count=8 if posterior else 6
 tree=support_tree('lower_jaw_envelope_closed'if lower else'head_envelope_closed')
 for i,(y,x,zr,ze,w,edge)in enumerate(sections):
  xo,zo=fitted_root(tree,s*(x+w),y,lower);xi,zi=fitted_root(tree,s*(x-w*.66),y,lower);_,zc=fitted_root(tree,s*x,y,lower)
  min_gap=(.004+.008*math.sin(math.pi*i/(len(sections)-1)))if posterior else .018
  ze=max(ze,zc+min_gap)if lower else min(ze,zc-min_gap)
  cross=[(xo,zo,.04),(xo*.45+s*(x+w*.70)*.55,zo*.58+ze*.42,.38),(s*(x+edge),ze,.94),(s*(x-edge),ze,.94),(xi*.45+s*(x-w*.48)*.55,zi*.58+ze*.42,.38),(xi,zi,.04)]
  if posterior:
   cross=[(xo,zo,.04),(s*(x+w*.90),zo*.72+ze*.28,.30),(s*(x+w*.48),zo*.30+ze*.70,.68),(s*(x+edge),ze,.94),(s*(x-edge),ze,.94),(s*(x-w*.38),zi*.30+ze*.70,.68),(s*(x-w*.60),zi*.72+ze*.28,.30),(xi,zi,.04)]
  for xx,zz,vv in cross:
   verts.append((xx,y,zz));uvs.append((.04+.90*i/(len(sections)-1),vv))
 faces=[(i*count+k,i*count+(k+1)%count,(i+1)*count+(k+1)%count,(i+1)*count+k)for i in range(len(sections)-1)for k in range(count)]
 faces.extend([tuple(range(count-1,-1,-1)),tuple((len(sections)-1)*count+k for k in range(count))])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
 for face in me.polygons:face.use_smooth=True
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 obj=bpy.data.objects.new(name,me);scene.collection.objects.link(obj);obj.parent=rig;objects.append(obj)
 me.materials.append(M['gnathal_bone']);uv=me.uv_layers.new(name='UVMap')
 for loop in me.loops:uv.data[loop.index].uv=uvs[loop.vertex_index]
 vc=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');bc=me.color_attributes.new(name='BakedPigment',type='FLOAT_COLOR',domain='POINT')
 W,T,pp=pix['gnathal']
 for i in range(len(verts)):
  vc.data[i].color=(1,1,1,1);u,v=uvs[i];bc.data[i].color=(*pp[int(v*(T-1)),int(u*(W-1)),:3],1)
 obj.vertex_groups.new(name=bone).add(list(range(len(verts))),1,'REPLACE')
 bevel=obj.modifiers.new('Worn chisel edge 1 mm','BEVEL');bevel.width=.001;bevel.segments=2
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.modifier_apply(modifier=bevel.name);obj.select_set(False)
 deform=obj.modifiers.new('Anatomical deformation','ARMATURE');deform.object=rig
 return obj
for s in [-1,1]:
 # Medial upper receiving lane and retained chisel tip. Built against the still-unwarped head/jaw
 # (candidate03's own rows, unmodified) — the global axial warp below carries this rigidly along
 # with the head surface it is fitted to, same as every other gnathal.
 blade('anterior_supragnathal_cusp_'+str(s),[
  (-1.488,.103,.045,.011,.009,.0020),
  (-1.477,.107,.057,-.069,.018,.0017),
  (-1.456,.111,.063,-.094,.024,.0011),
  (-1.428,.128,.066,-.086,.026,.0018),
  (-1.393,.150,.066,-.043,.022,.0022),
  (-1.364,.168,.056,.013,.009,.0020)],'head',s)
 # Lower cusp follows the free palatal corridor; jaw is untouched by this sculpt, no shift needed.
 blade('inferognathal_cutting_blade_'+str(s),[
  (-1.445,.151,-.145,-.081,.014,.0018),(-1.410,.174,-.157,-.035,.017,.0017),
  (-1.373,.187,-.173,.006,.018,.0013),(-1.349,.195,-.183,.012,.019,.0010),
  (-1.319,.205,-.195,-.075,.021,.0017),(-1.271,.232,-.218,-.113,.022,.0020),
  (-1.211,.260,-.241,-.136,.018,.0017),(-1.044,.250,-.281,-.171,.015,.0016),
  (-.883,.260,-.285,-.180,.012,.0017)],'jaw',s)
 # Posterior blade's forwardmost row (y=-1.333) is still behind the new nose tip; no shift needed.
 blade('posterior_supragnathal_blade_'+str(s),[
  (-1.333,.201,.046,.012,.005,.0012),(-1.303,.210,.058,-.020,.009,.0012),
  (-1.250,.227,.052,-.063,.015,.0014),(-1.170,.235,.030,-.080,.017,.0014),
  (-1.060,.249,-.004,-.110,.015,.0014),(-.960,.255,-.035,-.120,.012,.0014),
  (-.870,.255,-.060,-.096,.006,.0012)],'head',s)

headtree=BVHTree.FromPolygons([v.co for v in head.data.vertices],[p.vertices for p in head.data.polygons]);rng=np.random.default_rng(93);samples=rng.uniform(-1,1,(70000,3));samples=samples[(samples*samples).sum(1)<=1];eye_evidence=[]
def inside(p):
 q,n,idx,dist=headtree.find_nearest(Vector(p));return (Vector(p)-q).dot(n)<0
for s in [-1,1]:
 name='L'if s>0 else'R';surface,normal,idx,dist=headtree.find_nearest(Vector((s*.35,-1.235,.155)))
 if normal.x*s<0:normal=-normal
 u=Vector((0,1,0));u=(u-normal*u.dot(normal)).normalized();vv=normal.cross(u).normalized();radius=(.052,.073,.053);depth=.027
 while True:
  center=surface-normal*depth
  P=[center+normal*(float(a)*radius[0])+u*(float(b)*radius[1])+vv*(float(c)*radius[2])for a,b,c in samples]
  fraction=sum(inside(p)for p in P)/len(P)
  if fraction>=.79:break
  depth+=.002
 verts=[];faces=[];euv=[];rings=32;segs=48
 for j in range(rings+1):
  lat=pi*j/rings
  for k in range(segs):
   th=2*pi*k/segs;p=center+normal*(radius[0]*cos(lat))+u*(radius[1]*sin(lat)*cos(th))+vv*(radius[2]*sin(lat)*sin(th));verts.append(tuple(p));euv.append((k/segs,j/rings))
 for j in range(rings):
  for k in range(segs):faces.append((j*segs+k,j*segs+(k+1)%segs,(j+1)*segs+(k+1)%segs,(j+1)*segs+k))
 eye=mesh('eye_globe_'+name,verts,faces,'eye_dark_cornea','head',uvs=euv);eye['anatomyRole']='eye_globe';head['anatomyRole']='closed_eye_surrounding_head_envelope'
 # The short superior lid hugs the actual intersection and shares the skin shader. No orbital hoop.
 arc=[]
 for t in np.linspace(.17*pi,.83*pi,10):
  p=center+u*(radius[1]*.80*cos(t))+vv*(radius[2]*.80*sin(t));q,n,ii,dd=headtree.find_nearest(p);arc.append(tuple(q+n*.0015))
 # The fitted lid is the sculpted closed head brow; no external hoop geometry.
 eye_evidence.append({'mesh':eye.name,'surroundingMeshes':[head.name],'bone':'head','centerBlender':list(center),'normal':list(normal),'tangentU':list(u),'tangentV':list(vv),'radii':radius,'sampleCount':len(samples),'embeddedFraction':fraction,'centerInsetMeters':depth,'method':'Seeded uniform ellipsoid volume samples tested against the actual closed subdivided head BVH signed nearest surface.'})

# ---- global sculpt warp: the whole sculpt (the crown raise, the lowered snout and the axial
# shifts) applied the way the viewer's own preview applies it — per vertex, by that vertex's own
# axial position — to every mesh built so far: head, jaw, oral lining, all three gnathal blades
# and both eye globes. Nothing here is a move of isolated rows, so relative spacing is preserved
# and everything that sits on or is BVH-fitted against the head follows it by construction. The
# warp is the identity behind station 15, which is everything the body, tail and fins occupy.
for o in objects:
 me=o.data
 for v in me.vertices:v.co=Vector(sculpt_warp(v.co.x,v.co.y,v.co.z))
 me.update()
# The eye evidence's centre moves with the globes it describes. Its radii, normal and tangents
# were measured against the head as fitted, before this warp; the warp is a smooth vertical scale
# about the section centre (1.00 to 1.13 over the head, no shear), so the seat it recorded — 0.87
# of the globe inside the skin — is carried unchanged, and the measured figure is left as taken.
for e in eye_evidence:e['centerBlender']=list(sculpt_warp(*e['centerBlender']))
# Curved pectoral fins have broad root chords and cambered closed surfaces.
def paired_fin(s,pelvic=False):
 side='L'if s>0 else'R';bone=('pelvic_'if pelvic else'pectoral_')+side;tip='pectoral_tip_'+side
 A=22;B=26;verts=[];uv=[];w=[]
 for face in [-1,1]:
  for i in range(A+1):
   span=i/A;x=(.155+.29*span)if pelvic else(.305+.83*span);y=(.33+.36*span)if pelvic else(-.63+.66*span**1.18);z=(-.326-.12*span)if pelvic else(-.285-.23*span-.09*sin(pi*span))
   chord=(.20 if pelvic else .34)*max(.003,1-span)**.57
   for j in range(B+1):
    c=j/B;yy=y+chord*(c-.5);thick=(.027 if not pelvic else .014)*(1-span)**.8*sin(pi*c)+.001;zz=z+.037*sin(pi*c)*sin(pi*span)+face*thick
    verts.append((s*x,yy,zz));uv.append((c,span));t=max(0,min(1,(span-.12)/.62))
    w.append({bone:1}if pelvic else{'body':max(0,1-span/.16),bone:min(1,span/.16)*(1-t*.8),tip:min(1,span/.16)*t*.8})
 count=(A+1)*(B+1);faces=[]
 for f in range(2):
  for i in range(A):
   for j in range(B):a=f*count+i*(B+1)+j;faces.append((a,a+1,a+B+2,a+B+1))
 for i in range(A):
  for j in [0,B]:a=i*(B+1)+j;b=(i+1)*(B+1)+j;faces.append((a,b,b+count,a+count))
 for j in range(B):
  for i in [0,A]:a=i*(B+1)+j;faces.append((a,a+1,a+1+count,a+count))
 return mesh(('pelvic'if pelvic else'pectoral')+'_cambered_fin_'+side,verts,faces,'fins_membrane',bone,w,uv)
for s in [-1,1]:paired_fin(s);paired_fin(s,True)
# Closed thickened median fins with smoothly curved trailing margins and tapered roots.
def median_fin(n,outline,center,bone,rootblend=False):
 edge=cat(outline,7,True);C=Vector(center);N=len(edge);S=18;v=[];w=[];uv=[]
 for face in [-1,1]:
  for j in range(S+1):
   t=j/S
   for k,e in enumerate(edge):
    P=C.lerp(Vector(e),t);thick=.038*(1-t)**1.25+.0012;P.x+=face*thick;P.x+=.004*sin(k/N*2*pi)*sin(pi*t);v.append(tuple(P));uv.append((k/N,t));w.append({bone:1})
 count=(S+1)*N;f=[]
 for face in range(2):
  for j in range(S):
   for k in range(N):a=face*count+j*N+k;b=face*count+j*N+(k+1)%N;f.append((a,b,b+N,a+N))
 for k in range(N):a=S*N+k;b=S*N+(k+1)%N;f.append((a,b,b+count,a+count))
 return mesh(n,v,f,'fins_membrane',bone,w,uv)
def airfoil_fin(n,sections,bone):
 rows=cat(sections,6);N=36;v=[];uv=[]
 for j,(z,leading,trailing,thick) in enumerate(rows):
  for k in range(N):
   th=2*pi*k/N;x=thick*sin(th);y=leading+(trailing-leading)*(.5-.5*cos(th));v.append((x,y,z));uv.append((k/N,j/(len(rows)-1)))
 f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(rows)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(rows)-1)*N+k for k in range(N))]);return mesh(n,v,f,'fins_membrane',bone,uvs=uv,sub=1)
airfoil_fin('curved_heterocercal_caudal',[(-.58,1.78,1.783,.001),(-.46,1.62,1.745,.011),(-.28,1.425,1.65,.024),(-.10,1.28,1.565,.046),(.02,1.255,1.57,.049),(.20,1.395,1.66,.035),(.44,1.58,1.79,.020),(.64,1.805,1.924,.009),(.735,1.96,1.962,.001)],'caudal')
airfoil_fin('swept_dorsal_fin',[(.24,.66,.98,.022),(.35,.14,.94,.028),(.48,.265,.86,.030),(.66,.39,.70,.023),(.80,.46,.572,.010),(.855,.487,.50,.002)],'dorsal')
airfoil_fin('small_anal_fin',[(-.48,.73,.775,.003),(-.42,.60,.87,.017),(-.30,.49,.94,.026),(-.21,.64,.95,.022)],'anal')
# Feeding/contact sockets follow the true mandibular opening.
# Mouth/attack sockets sit right at the snout that moved (jaw included, per the global sculpt
# warp above); they go through the same sculpt_warp() so they stay bound to the jaw tip they name.
anchors=[('anchor_mouth','jaw',sculpt_warp(0,-1.445,-.055),'mouth'),('anchor_mouth_inside','jaw',sculpt_warp(0,-.91,-.16),'swallow'),('anchor_attack_primary','jaw',sculpt_warp(0,-1.478,-.065),'attack')]
for n,b,p,role in anchors:
 o=bpy.data.objects.new(n,None);scene.collection.objects.link(o);o.parent=rig;o.parent_type='BONE';o.parent_bone=b;o['cambrianAnchor']={'version':1,'role':role,'parentBone':b};o.matrix_world=Matrix.Translation(p)
bpy.context.view_layer.update()
for n,b,p,r in anchors:bpy.data.objects[n].matrix_world=Matrix.Translation(p)
# Written into the candidate directory only: build_v2.py's own tracked anchors.json/eyes-v2.json
# in tools/devonian/creatures/dunkleosteus/ are never touched by this port.
(O/'anchors.json').write_text(json.dumps({'dunkleosteus':[{'name':n,'bone':b,'point':p,'role':r}for n,b,p,r in anchors]},indent=2))
(O/'eyes-v3.json').write_text(json.dumps(eye_evidence,indent=2))
# Individually timed action posing, posterior delay and jaw anticipation/contact/recovery.
clips={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1,'Parry':.3666666667,'Dodge':.4,'Eat':1.2,'Stagger':1.2,'Ability':1.8,'Growth':1.5};loops=['Idle','Swim','Guard','Eat']
def pulse(t,a,b,c):
 if t<=a or t>=c:return 0
 q=(t-a)/(b-a)if t<b else(c-t)/(c-b);return q*q*(3-2*q)
def ease(t):return max(0,min(1,t))**2*(3-2*max(0,min(1,t)))
rig.animation_data_create()
for name,duration in clips.items():
 act=bpy.data.actions.new(name);act.use_fake_user=True;rig.animation_data.action=act;N=round(duration*30)
 for frame in range(N+1):
  t=frame/N;ph=2*pi*t
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  def rot(b,x=0,y=0,z=0):rig.pose.bones[b].rotation_euler=(x,y,z)
  def wave(amp,phase=ph,env=1):
   for k,b in enumerate(['tail_base','tail_mid','tail_tip','caudal']):rot(b,z=amp*env*(.25+.32*k)*sin(phase-k*.8))
  def balance(torque=0,spread=.04,phase=ph,env=1):
   for s in [-1,1]:
    side='L'if s>0 else'R';rot('pectoral_'+side,x=(.09*sin(phase)+torque)*env,y=s*(spread+.08*sin(phase+s*.3))*env,z=s*.07*sin(phase-.5)*env);rot('pectoral_tip_'+side,x=.13*sin(phase-.7)*env,y=s*.12*sin(phase-1.0)*env);rot('pelvic_'+side,y=s*.10*sin(phase+.7)*env)
  if name in loops:
   if name=='Swim':
    phase=ph*2+.20*sin(ph*2);wave(.38,phase);balance(phase=phase,spread=.075);rot('body',y=.045*sin(phase),z=.035*sin(phase+.6));rot('dorsal',z=.095*sin(phase-1.3));rot('anal',z=.075*sin(phase-1.1));rot('jaw',x=.025*(1-cos(ph*2)))
   elif name=='Idle':wave(.13);balance(spread=.025);rot('head',x=-.012*(1-cos(ph)));rot('jaw',x=.040*(1-cos(ph)));rot('body',x=.012*sin(ph));rot('dorsal',z=.035*sin(ph-.8))
   elif name=='Guard':wave(.19);balance(spread=.23,phase=ph);rot('body',x=-.045*(1-cos(ph)),z=.04*sin(ph));rot('jaw',x=.055*(1-cos(ph)));rot('dorsal',z=.065*sin(ph))
   else:
    wave(.16);balance(spread=.08);g=.5-.5*cos(ph);rot('jaw',x=.48*g);rot('head',x=-.09*g);rot('body',x=-.045*g);rot('caudal',z=.18*sin(ph-.5));rot('dorsal',z=.055*sin(ph))
  else:
   env=sin(pi*t)**2;wave(.28,ph,env);balance(env=env)
   if name in ['TurnLeft','TurnRight']:
    s=1 if name=='TurnLeft'else-1;q=pulse(t,0,.37,1);rot('body',z=s*.42*q,y=-s*.28*q);rot('tail_base',z=-s*.24*q);rot('tail_mid',z=-s*.30*pulse(t,.08,.49,1));rot('caudal',z=s*.49*pulse(t,.12,.58,1));rot('pectoral_L',x=s*.22*q,y=.27*q);rot('pectoral_R',x=-s*.22*q,y=-.27*q)
   elif name in ['Dive','Rise']:
    s=1 if name=='Dive'else-1;q=pulse(t,0,.40,1);rot('body',x=s*.34*q);rot('head',x=-s*.075*q);balance(torque=s*.26,spread=.08,env=env);rot('caudal',x=-s*.12*q,z=.27*env*sin(ph-1))
   elif name in ['Attack','Bite','Heavy','Ability']:
    if name=='Bite':a,b,c,power=.02,.30,.64,.66
    elif name=='Heavy':a,b,c,power=.02,.42,.72,.99
    elif name=='Ability':a,b,c,power=.08,.37,.68,.86
    else:a,b,c,power=.02,.34,.63,.83
    gape=pulse(t,a,b,c);strike=pulse(t,b-.035,c-.08,.91);anticip=pulse(t,0,a+.14,b+.02)
    rot('jaw',x=power*gape);rot('head',x=-power*.19*gape+.035*strike);rot('body',x=-.055*anticip+.11*strike,y=.08*strike*sin(ph));rig.pose.bones['body'].location.y=.10*anticip-.28*strike
    phase=ph+2.5*strike;wave(.44,phase,env);balance(torque=-.20*strike,spread=.30*gape,phase=phase,env=env);rot('dorsal',z=.13*env*sin(phase-1.2))
    if name=='Ability':rot('jaw',x=power*gape+.35*pulse(t,.68,.79,.96));rot('tail_base',z=.32*pulse(t,.30,.52,.85)-.20*pulse(t,.04,.20,.40))
   elif name in ['Hit','Stagger']:
    wavephase=(3 if name=='Hit' else 5)*pi*t;shock=env*sin(wavephase);rot('body',z=.30*shock,y=.22*env);rot('head',x=-.095*env);rot('jaw',x=.23*env);wave(.48,wavephase-.7,env);balance(spread=.26,env=env);rot('pectoral_R',y=.18*env,x=-.2*shock)
   elif name=='Parry':q=pulse(t,0,.27,1);rot('body',z=-.27*q,y=.32*q);rot('head',x=.06*q);rot('pectoral_L',x=.23*q,y=.40*q);rot('caudal',z=.49*pulse(t,.07,.46,1))
   elif name=='Dodge':q=pulse(t,0,.36,1);rot('body',z=.40*q,y=-.43*q);rig.pose.bones['body'].location.x=.31*q;rot('tail_base',z=-.43*q);rot('tail_mid',z=-.34*pulse(t,.06,.48,1));rot('tail_tip',z=.44*pulse(t,.09,.58,1));rot('caudal',z=.50*pulse(t,.15,.68,1));rot('pectoral_R',x=-.25*q,y=-.42*q)
   elif name=='Growth':q=pulse(t,0,.50,1);rot('body',x=-.065*q);rot('head',x=-.055*q);rot('jaw',x=.22*q);balance(spread=.22,env=env);wave(.25,ph,env)
   elif name=='Death':
    q=ease(t/.82);kick=sin(6*pi*t)*sin(pi*t)**2*(1-t)*(1-ease((t-.57)/.25));rot('body',y=1.31*q,z=.10*q);rig.pose.bones['body'].location.z=-.17*q;rot('head',x=-.09*q);rot('jaw',x=.39*q);rot('tail_base',z=.24*q+.18*kick);rot('tail_mid',z=.23*q+.3*kick);rot('caudal',z=-.20*q+.35*kick);rot('pectoral_L',y=.40*q);rot('pectoral_R',y=.17*q);rot('dorsal',z=.08*q)
  for pb in rig.pose.bones:
   if pb.name=='root':continue
   pb.keyframe_insert(data_path='rotation_euler',frame=frame+1,group=pb.name)
   if pb.name=='body':pb.keyframe_insert(data_path='location',frame=frame+1,group=pb.name)
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
scene.frame_set(1);bpy.context.view_layer.update();bpy.ops.wm.save_as_mainfile(filepath=str(V/'dunkleosteus-v3-candidate.blend'))
# Export unless a quick geometry/material preview is requested.
def export(path):
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
 for o in objects:o.select_set(True)
 for n,b,p,r in anchors:bpy.data.objects[n].select_set(True)
 bpy.context.view_layer.objects.active=rig;bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_extras=True,export_yup=True)
if os.environ.get('DUNK_PREVIEW')!='1':
 export(O/'dunkleosteus.glb')
 for o in objects:
  ca=o.data.color_attributes.get('Color');ba=o.data.color_attributes.get('BakedPigment')
  if ca and ba:
   for i in range(len(ca.data)):ca.data[i].color=ba.data[i].color
   # BakedPigment (created after Color) is Blender's active color attribute; leaving both
   # on the mesh means the DECIMATE modifier below only carries the active one through
   # collapse and resets the inactive 'Color' layer to its neutral (1,1,1,1) default, so
   # the LOD ships with no pigment at all (COLOR_0 measured as pure white). Drop it now
   # that its values are copied, so 'Color' is the only — and so the active — attribute.
   o.data.color_attributes.remove(ba)
  if len(o.data.polygons)>150 and not o.name.startswith('eye_globe'):
   d=o.modifiers.new('True reduced geometry','DECIMATE');d.ratio=.12 if o.name=='head_envelope_closed' else .65 if 'gnathal' in o.name else .25;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_move_up(modifier=d.name);bpy.ops.object.modifier_apply(modifier=d.name)
 for m in M.values():
  nt=m.node_tree;bs=nt.nodes.get('Principled BSDF')
  for l in list(nt.links):
   if l.to_node==bs:nt.links.remove(l)
  vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 for a in list(bpy.data.actions):
  if a.name not in ['Idle','Swim','Death']:bpy.data.actions.remove(a)
 export(O/'dunkleosteus.lod1.glb')
 bpy.ops.wm.open_mainfile(filepath=str(V/'dunkleosteus-v3-candidate.blend'));scene=bpy.context.scene;rig=bpy.data.objects['Dunkleosteus']
# Metadata is available as soon as the candidate GLBs are exported, before long render review.
if os.environ.get('DUNK_PREVIEW')!='1':
 meta={'id':'dunkleosteus','name':'Dunkleosteus','species':'Dunkleosteus terrelli','provenance':'Late Devonian (Famennian), Cleveland Shale, Ohio, USA','description':'An armoured pelagic arthrodire with a short cranial wedge, articulated cutting jaws and a compact muscular trunk.','lengthMeters':3.5,'modelLength':3.48,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://doi.org/10.26879/1343','https://doi.org/10.3390/d15030318'],'notes':['V2 reconstructs the profile from Engelman 2024 figures 3–4; not a specimen scan.','Rear-body proportions, caudal silhouette, living integument and oral soft tissues remain interpretations.','Representative 3.5 m adult, not a genus maximum.','PBR UV albedo, normal and roughness; independent vertex pigment bake for LOD.','Growth is maturation display, no scaling or moulting.','V4 cranial and gnathal treatment reconstructed from face-v4/study_02.py and study_03.py on the V2 body, oral lining, rig, eye globes and anchors.','V3 carries the viewer sculpt docs/sculpts/dunkleosteus-sculpt.json: crown raised over stations 16-18, snout lowered and shortened, applied as the same profile warp the viewer previews.'],'eyes':eye_evidence,'artVersion':3,'artCandidate':'sculpt-v3-nose-crown'}
 (O/'dunkleosteus.json').write_text(json.dumps(meta,indent=2)+'\n')
if os.environ.get('DUNK_SKIP_RENDER')=='1':
 print('DUNKLEOSTEUS_V3_EXPORT_COMPLETE');raise SystemExit
# Neutral studio review first, transparent portraits separately from the final model.
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True;scene.view_settings.view_transform='AgX'
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.13,.16,.18,1);bg.inputs[1].default_value=.38

def light(n,p,E,col,size):
 bpy.ops.object.light_add(type='AREA',location=p);o=bpy.context.object;o.name=n;o.data.energy=E;o.data.color=col;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
light('Neutral key',(2,-3,4),600,(1,.95,.88),3.5);light('Soft blue fill',(-3,-1,1.5),380,(.75,.86,1),4);light('Broad rim',(1,3,3),700,(.80,.9,1),3)
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
def render(name,frame,path,loc=(4,-4,1.7),target=(0,.12,0),scale=4.25):
 rig.animation_data.action=bpy.data.actions[name];scene.frame_set(frame);cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
render('Idle',1,V/'portrait.png')
scene.render.resolution_x=1200;scene.render.resolution_y=900
for n,loc,target,scale in [('side',(4,0,.12),(0,.1,0),4.1),('front',(0,-5,.20),(0,-.5,0),2.2),('dorsal',(0,.2,5),(0,.1,0),4.1),('eye-side',(3,-1.23,.15),(.29,-1.23,.15),.48),('eye-front',(1,-3,.4),(.30,-1.22,.15),.60)]:render('Idle',1,V/(n+'.png'),loc,target,scale)
for clip,frame,loc,target,scale in [('Bite',6,(2,-3,.4),(0,-.95,-.10),1.8),('Heavy',15,(2,-3,.4),(0,-.94,-.17),1.9),('Heavy',22,(2,-3,.4),(0,-.94,-.17),1.9),('Eat',19,(0,-4,.1),(0,-.94,-.12),1.65)]:render(clip,frame,V/(clip+'-'+str(frame)+'.png'),loc,target,scale)
if os.environ.get('DUNK_PREVIEW')!='1':
 scene.render.resolution_x=1600;scene.render.resolution_y=1200;render('Idle',1,O/'dunkleosteus.select.png');render('Idle',1,O/'dunkleosteus.png')
 scene.render.resolution_x=800;scene.render.resolution_y=600;render('Idle',1,O/'dunkleosteus.card.png');scene.render.resolution_x=256;scene.render.resolution_y=192;render('Idle',1,O/'dunkleosteus.thumb.png')
 scene.render.resolution_x=1000;scene.render.resolution_y=750
 for name,fr in [('Swim',17),('Attack',14),('Heavy',15),('Guard',16),('Dodge',6),('Death',49),('Ability',20)]:render(name,fr,V/(name+'.png'))
 meta={'id':'dunkleosteus','name':'Dunkleosteus','species':'Dunkleosteus terrelli','provenance':'Late Devonian (Famennian), Cleveland Shale, Ohio, USA','description':'An armoured pelagic arthrodire with a short cranial wedge, articulated cutting jaws and a compact muscular trunk.','lengthMeters':3.5,'modelLength':3.48,'locomotion':'Swim','clips':list(clips),'looping':loops,'anchors':[a[0]for a in anchors],'sources':['https://doi.org/10.26879/1343','https://doi.org/10.3390/d15030318'],'notes':['V2 reconstructs the profile from Engelman 2024 figures 3–4; not a specimen scan.','Rear-body proportions, caudal silhouette, living integument and oral soft tissues remain interpretations.','Representative 3.5 m adult, not a genus maximum.','PBR UV albedo, normal and roughness; independent vertex pigment bake for LOD.','Growth is maturation display, no scaling or moulting.','V4 cranial and gnathal treatment reconstructed from face-v4/study_02.py and study_03.py on the V2 body, oral lining, rig, eye globes and anchors.','V3 carries the viewer sculpt docs/sculpts/dunkleosteus-sculpt.json: crown raised over stations 16-18, snout lowered and shortened, applied as the same profile warp the viewer previews.'],'eyes':eye_evidence,'artVersion':3,'artCandidate':'sculpt-v3-nose-crown'}
 (O/'dunkleosteus.json').write_text(json.dumps(meta,indent=2)+'\n')
print('DUNKLEOSTEUS_V3_COMPLETE')
