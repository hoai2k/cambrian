"""Shonisaurus measured-volume puppet and authored intake on one literal rig.
Blender 5.2; run from repository root. Raw input is immutable.
"""
import bpy,bmesh,json,math,hashlib,os,sys
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from pathlib import Path
from math import sin,cos,pi
sys.path.insert(0,str(Path.cwd()/'tools/triassic/creatures/_pipeline'))
import tripo as T                                                        # noqa: E402
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
# Preserve the source UV albedo instead of interpolating it across sparse color
# corners (which made triangular starbursts). White COLOR_0 avoids multiplying
# the authored texture twice. The measured puppet keeps its existing pigment.
for link in list(bsdf.inputs['Base Color'].links):mat.node_tree.links.remove(link)
mat.node_tree.links.new(tex.outputs['Color'],bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value=.7
for n in mat.node_tree.nodes:
 if n.type=='NORMAL_MAP':n.inputs['Strength'].default_value=.15
source.data.color_attributes['Color'].data.foreach_set('color_srgb',np.ones(len(source.data.loops)*4,dtype=np.float32))
mapdir=HERE/'maps';mapdir.mkdir(exist_ok=True)
im.filepath_raw=str(mapdir/'source-albedo.png');im.file_format='PNG';im.save()
# ----------------------------------------------- the mandible is not cut off at all ----
# **This generation modelled a mouth, so the split was buying nothing at the front and paying for a
# rim at the back.** Measured on the body this replaces, with `T.cut_rim`: the face-label split left
# **one closed loop of 164 vertices** reaching **0.0779** of a body, from y 0.322 to 0.400, on a
# mouth that runs from y 0.302 to the snout at 0.498 -- 0.196 long. Forward of the commissure the
# upper and lower jaws are already separate sheets of the generation's own surface and the label
# boundary passed between them without touching either; behind it the label ran through solid head,
# and the two copies of that run parted when the jaw opened. Closing them was the whole job of the
# seam web, and of the palate, floor and throat tube before it.
#
# So the body stays **one surface** and the mouth opening is a bone turning inside skin, which is
# what every other joint on this animal already is (`T.jaw_field_uncut`; Mosasaurus is the worked
# example and Cymbospondylus is this batch's other one). Nothing is cut, so nothing can part:
# `lag.mjs` has no seam to measure here and says so.
#
# The mouth's own measurement, and it is a measurement rather than the typed table the label used.
# `T.cavity_vertices` is the lumen's wall -- every vertex whose own outward normal, cast back into
# the mesh, meets the wall opposite, which is what makes it interior -- and `cavity_profile` reads
# the mid height of it station by station. The typed lip line the split used is kept only to record
# how far the two disagree (`mouthLineDeviation` in build-report.json).
CAV_WALL=T.cavity_vertices(source,lambda p:p.y>.30,gap=.030)
assert len(CAV_WALL)>80,('the lumen wall did not measure',len(CAV_WALL))
CAV=np.array([source.data.vertices[i].co[:]for i in CAV_WALL])
MY,MID,WIDE,TALL=T.cavity_profile(CAV,.306,.494,.0035,.006)
assert len(MY)>20,('the mouth line did not measure',len(MY))
HINGE_RAW=(0,.326,-.013)                 # the jaw bone's own head, in raw coordinates
def typed_lip(y):
 """The lip line this builder has always typed, five points read off the generation by hand. It is
 no longer the mouth line -- it is the reference the measured one is checked against, and it is what
 carries the line back behind the commissure, where there is no lumen left to measure."""
 return float(np.interp(y,[.305,.33,.37,.395,.5],[-.027,-.017,-.005,-.0015,-.0015]))
# **The measured line stops at the commissure and the hinge is behind it.** The modelled lumen runs
# forward from y 0.3555; behind that the head is solid, and the jaw bone sits at 0.326 with the
# field tapering for another 0.030 behind that. `np.interp` would hold the commissure's own height
# all the way back, which is the clamping lesson in miniature: an answer outside the table that
# looks like an answer inside it. Extending the measured line along its own fitted slope is worse
# rather than better -- the rear stations are a short noisy run where the lumen is closing, and the
# fit sends the line *up* to -0.0013 at the hinge where the typed lip says -0.0186. So behind the
# join the line is the typed one, offset to meet the measurement exactly at the join: measured
# where there is a mouth to measure, the human's line behind it, and continuous across.
_JOIN=float(MY[0]);_OFF=float(MID[0])-typed_lip(_JOIN)
_EY=np.arange(.296,_JOIN-1e-9,.0035)
MY=np.r_[_EY,MY];MID=np.r_[np.array([typed_lip(float(y))+_OFF for y in _EY]),MID]
def seam(y):
 """The mouth line: the measured mid height of the modelled lumen where there is one, carried back
 behind the commissure on the typed lip line. The jaw's weight field ramps across it; nothing is
 cut along it."""
 return float(np.interp(y,MY,MID))
# The head's own fine section, which `JAW_BAND` is a fraction of. The body's centreline table is
# too coarse for a rostrum that tapers.
_HY=np.linspace(.302,.498,26);_HW=[];_HD=[]
for _y in _HY:
 _m=np.abs(points[:,1]-_y)<.006
 _q=points[_m]if _m.sum()>5 else points[np.abs(points[:,1]-_y)<.015]
 _HW.append(float(np.quantile(np.abs(_q[:,0]),.90)));_HD.append(float(np.quantile(np.abs(_q[:,2]),.90)))
def head_half_depth(y):return float(np.interp(y,_HY,_HD))
MOUTH_LINE_DEVIATION={'measuredVersusTheTypedLipLineMaxRaw':float(max(abs(seam(y)-typed_lip(y))for y in MY if y>=_JOIN)),
                      'measuredVersusTheTypedLipLineMeanRaw':float(np.mean([abs(seam(y)-typed_lip(y))for y in MY if y>=_JOIN])),
                      'atTheHingeMeasuredRaw':seam(.326),'atTheHingeTypedRaw':typed_lip(.326),
                      'stations':len(MY),'yRange':[float(MY[0]),float(MY[-1])],
                      'measuredFromY':_JOIN,'joinOffsetRaw':_OFF,'stationsCarriedBackOnTheTypedLine':len(_EY),
                      'restSlitMaxHalfDepthRaw':float(np.max(TALL)),
                      'restSlitMaxHalfDepthOverHeadDepth':float(np.max(TALL)/max(np.interp(.40,_HY,_HD),1e-6))}
def below_mouth_line(c):
 """How far a point is below the mouth line, positive under it. `np.interp` holds `seam`'s end
 value behind the hinge and in front of the last open station, which is what the band wants."""
 return seam(c[1])-c[2]
# The band the commissure stretches over, in units of the head's own half depth at the hinge, which
# is Mosasaurus' measure. Too wide and the front of the mandible takes only part of the jaw's
# rotation, so the lower tooth row lags the bone it is drawn on; too narrow and the whole swing is
# carried by a strip of skin where the two lips meet.
#
# **And on this body the band has a third cost, which is the one that decides it.** `close_rest`
# shuts the generation's baked-open mouth in bind geometry through this same field, so a vertex only
# closes by its own jaw share -- and the mandible's dorsal margin sits one lumen half depth (0.012
# raw at its widest) below the mouth line. A band much wider than that never reaches 1 there, the
# lip never meets the palate, and the animal ships with its mouth ajar: `mouth-closure-audit.py`
# read **3,596 of 14,400 lateral rays passing clean through the rostrum**, a 0.098-unit aperture, at
# a band of 0.75. That bounds the band from above at about 0.24 whatever else is true.
#
# Swept inside that bound, against the closure, `skin-tears.mjs`, `lag.mjs` and the repaired
# `lip-audit.py` (see its own docstring -- the old mean-weight test cannot read a blend band and
# reports hundreds of faces that agree with every neighbour they have):
#
#     band   skin    jaw follows Bite/Attack/Heavy/Eat   mouth shut   inverted rest / worst posed
#     0.06   1.81x   0.98 0.99 0.99 0.95                 yes          29 / 29
#     0.10   1.80x   0.96 0.99 0.99 0.93                 yes          14 / 18
#     0.15   1.44x   0.96 0.98 0.99 0.91                 yes          31 / 31
#     0.20   3.80x   0.96 0.98 0.99 0.91                 yes          49 / 49
#     0.24   3.64x   0.96 0.99 0.99 0.92                 yes          40 / 40
#     0.75   1.44x   0.94 0.98 0.99 0.87                 NO           0 / 0
#
# The shipped split body reads 1.44x, 0.98/0.99/0.99/0.95, shut, and a constant **8** inverted faces
# at every frame including its own bind pose -- that floor is the intake mesh's own and no weighting
# moves it. 0.10 is the value with the fewest inversions of any that shuts the mouth, and its follow
# is within 0.02 of the split body's at every clip.
JAW_BAND_FRACTION=float(os.environ.get('SHONI_JAW_BAND','0.10'))
JAW_BAND=JAW_BAND_FRACTION*head_half_depth(.326)
JAW_BEHIND=.030
source['region']='authored';authored=[source]
# What the head leaves open now that nothing cuts it. `cut_rim` reports every boundary edge there
# is, and what it must not find any more is **the split**: a loop with vertices on the mouth line,
# running the length of the commissure. So the assertion is on the two properties a cut rim has and
# a pinhole in a generation does not -- it reaches, and it sits on the seam -- rather than on a
# count, which would be an assertion whose message says something it does not test.
UNCUT_RIM=T.cut_rim(source,lambda p:p.y>.29,seam=seam,axis=1)
for _loop in UNCUT_RIM['loops']:
 assert _loop['verticesOnTheSeam']==0,('a rim still sits on the mouth line',_loop)
 assert _loop['reach']<.010,('a rim still runs along the mouth',_loop)
print('SHONI_UNCUT_RIM',json.dumps(UNCUT_RIM),flush=True)
print('SHONI_MOUTH_LINE',json.dumps(MOUTH_LINE_DEVIATION),flush=True)

# No oral geometry. A palate, a floor, a throat-and-cheeks tube and two rows of conical teeth used
# to be authored here, and all of it was invented shape inside a Tripo body whose mouth is closed
# at rest and whose full gape, rendered against a saturated backdrop with every backface culled
# (tools/triassic/gape-solid.py), shows 4 px of backdrop through the body with nothing in it,
# against a tolerance of 12. A mouth that does not show through needs its anchors and nothing else,
# so this animal ships none; what is drawn inside the gape is the generation's own lip rims and
# tooth forms, and package-audit.mjs refuses any mesh or material the runtime's oral classifier
# would match.
def solidmat(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=.58;return m
features=[]
# Seated ocular globes with inset irises and pupils, shared by both bodies. The globe is placed
# where the albedo paints the eye rather than at a typed coordinate: the painted eye is the
# darkest patch of each flank *above* the lip line -- the lip is darker still, which is why the
# search starts a lip's width above `is_mandible`'s line, and why the first read of this albedo
# found the mouth -- and the globe's centre is set EYE_INSET under the skin at that spot, along
# the skin's own (area-averaged) normal, so the seat follows the surface: the globe neither floats
# off the flank nor sinks into it, and the iris and pupil face that normal. The pair had been
# authored 0.012 raw behind and below the painted centre; the move is a few percent of the head's
# length forward and up, measured here, bounded by the assertions and written to build-report.json.
EYE_INSET=.0025;EYE_SCALE=(.006,.0075,.0075);IRIS=(.0048,(.0018,.0052,.0052));PUPIL=(.0062,(.0009,.0026,.0026))
HEAD_LEN=.498-.302;EYE_BEFORE={-1:(-.0512,.337,.014),1:(.0512,.337,.014)}
lum=.2126*vertex_colors[:,0]+.7152*vertex_colors[:,1]+.0722*vertex_colors[:,2]
face_normals=np.array([p.normal[:]for p in source.data.polygons]);face_centres=np.array([p.center[:]for p in source.data.polygons]);face_areas=np.array([p.area for p in source.data.polygons])
def painted_eye(sign):
 lip=np.interp(points[:,1],[.305,.33,.37,.395,.5],[-.027,-.017,-.005,-.0015,-.0015])
 m=(points[:,1]>.30)&(points[:,1]<.38)&(sign*points[:,0]>.03)&(sign*points[:,0]<.075)&(points[:,2]>lip+.02)&(points[:,2]<.045)
 q=points[m];l=lum[m];thr=float(np.quantile(l,.08));dark=q[l<=thr];w=(thr-l[l<=thr])+1e-6
 return (dark*w[:,None]).sum(0)/w.sum(),int(m.sum()),int(len(dark))
def skin_normal(p):
 near=np.linalg.norm(face_centres-np.asarray(p),axis=1)<.008;n=(face_normals[near]*face_areas[near][:,None]).sum(0);return Vector(n).normalized()
def eye_seat(centre):
 c=Vector(centre);loc,nor,idx,dist=bvh.find_nearest(c);signed=dist*(1 if (c-loc).dot(nor)>0 else -1);inside=0;n=0
 for i in range(24):
  for j in range(12):
   th=2*pi*i/24;ph=pi*(j+.5)/12;p=c+Vector((EYE_SCALE[0]*sin(ph)*cos(th),EYE_SCALE[1]*sin(ph)*sin(th),EYE_SCALE[2]*cos(ph)))
   l2,n2,_,_=bvh.find_nearest(p);n+=1;inside+=(p-l2).dot(n2)<0
 return {'centre':[round(float(v),5)for v in c],'centreToSkin':round(float(signed),5),'surfaceFractionInside':round(inside/n,3)}
eye_mat=solidmat('Eyes dark globe',(.018,.023,.02));iris_mat=solidmat('Eyes bronze iris',(.065,.059,.034));pupil_mat=solidmat('Eyes black pupil',(.003,.004,.004))
eye_report={'inset':EYE_INSET,'headLengthRaw':HEAD_LEN,'method':'painted centre = darkness-weighted centroid of the darkest 8% of flank vertices above the lip line; globe centre = nearest skin point to it, inset along the area-averaged skin normal; seat = signed distance of the centre to the skin (negative inside) and the fraction of the globe surface under the skin'}
for sign in [-1,1]:
 painted,region_n,dark_n=painted_eye(sign);skin,_,_,_=bvh.find_nearest(Vector(painted));n=skin_normal(skin)
 if n.x*sign<0:n=-n
 centre=skin-n*EYE_INSET;before=Vector(EYE_BEFORE[sign]);move=centre-before
 assert .002<move.y<.012 and .002<move.z<.012,('the eye is meant to move slightly forward and up',sign,list(move))
 R=Vector((sign,0,0)).rotation_difference(n).to_matrix()
 for kind,offset,scale,material in [('globe',0,EYE_SCALE,eye_mat),('iris',IRIS[0],IRIS[1],iris_mat),('pupil',PUPIL[0],PUPIL[1],pupil_mat)]:
  bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=10,location=(0,0,0));o=bpy.context.object;o.name='Eye '+kind+(' L'if sign<0 else' R');o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
  for v in o.data.vertices:v.co=centre+R@v.co+n*offset
  o.data.materials.append(material);o['region']='upper';features.append(o)
 after=eye_seat(centre)
 assert -.004<after['centreToSkin']<-.0015 and after['surfaceFractionInside']>=.5,('the eye must stay seated in the skin',sign,after)
 eye_report['L'if sign<0 else'R']={'painted':[round(float(v),5)for v in painted],'paintedRegionVertices':region_n,'paintedDarkVertices':dark_n,'skinNormal':[round(float(v),3)for v in n],'before':eye_seat(before),'after':after,'move':[round(float(v),5)for v in move],'movePercentOfHeadLength':[round(float(v)/HEAD_LEN*100,2)for v in move],'centreToPaintedBefore':round((before-Vector(painted)).length,5),'centreToPaintedAfter':round((centre-Vector(painted)).length,5)}
print('SHONISAURUS_EYES',json.dumps(eye_report),flush=True)
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
 # The two procedural rostra are separate closed lofts with the modelled gap between them, so
 # they carry their own owner and no band: there is no seam there to open.
 if region=='upper':return {'skull':1}
 if region=='lower':return blend(axial(y),{'jaw':1},ramp(y,.315,.35))
 # The authored body's jaw share is **not** here. It is one smooth field over the whole uncut
 # surface (`T.jaw_field_uncut`, applied below), because the old branch -- a 0.006-wide ramp in z
 # about a typed lip line -- is exactly the thin strip CLAUDE.md warns about, and it is what folded
 # the lip triangles inside out and cost this animal its mandible split in the first place.
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
allmesh=authored+puppets+features
weight_report={};JAW_FIELD={}
for o in allmesh:
 for n in B:o.vertex_groups.new(name=n)
 field=[weights(v.co,o.get('region',''))for v in o.data.vertices]
 if o is source:
  # One field over one surface: full jaw below the measured mouth line and forward of the hinge,
  # full skull above it, and a band at the commissure that stretches. This runs while the mesh is
  # still in raw coordinates, which is the frame `HINGE_RAW` and `seam()` are in.
  field,JAW_FIELD[o.name]=T.jaw_field_uncut(o,field,HINGE_RAW,below_mouth_line,axis=(0.,1.,0.),
                                            band=JAW_BAND,behind=JAW_BEHIND)
 for v in o.data.vertices:
  w=field[v.index];w=dict(sorted(w.items(),key=lambda t:-t[1])[:4]);total=sum(w.values());assert total>0
  for n,q in w.items():o.vertex_groups[n].add([v.index],q/total,'REPLACE')
  v.co=close_rest(vworld(v.co),w.get('jaw',0)/total)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Shared anatomical armature','ARMATURE');mod.object=rig;o.parent=rig
 weight_report[o.name]={'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'maxInfluences':max(len(v.groups)for v in o.data.vertices)}
print('SHONI_JAW_FIELD',json.dumps(JAW_FIELD),flush=True)
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
for o in puppets:
 bm=bmesh.new();bm.from_mesh(o.data);before=bm.calc_volume(signed=True)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 if bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
 after=bm.calc_volume(signed=True);assert after>0,('Inward closed surface',o.name,after)
 bm.to_mesh(o.data);bm.free();o.data.update();winding_report[o.name]={'signedVolumeBefore':before,'signedVolumeAfter':after,'outward':True}
# Performance specification is a separate reproducible source.
sys.path.insert(0,str(HERE));from performance import CLIPS,LOOPS,pose
# ------------------------------------------------------------- the mouth interior ----
# **Nothing is built here, and that is a verdict rather than an omission.** A palate, a floor, a
# throat-and-cheeks tube and two rows of conical teeth were authored here once; then a seam web
# spanning the two copies of the rim the mandible split drew. All of it existed to close what a
# *cut* opened, and there is no cut: `UNCUT_RIM` above reports no boundary anywhere along the mouth
# line, and what a player sees inside the gape is the palate, floor and commissure the generation
# modelled. `package-audit.mjs` refuses any node, mesh or material the runtime's oral classifier
# would match, on either body.
#
# The twin needs nothing either, and that is a fact about the twin: its rostrum is two separate
# closed lofts, `Puppet upper rostrum` and `Puppet lower rostrum`, with the modelled gap between
# them, so it has no seam of any kind.
#
# The gape is still measured off `performance.pose` rather than named, because the jaw-band sweep
# and the gape proof are both quoted against it.
JAW_GAPE=max(abs(float(pose(clip,f/max(1,round(d*30)),list(B))['jaw']['rotation'][0]))
             for clip,d in CLIPS.items() for f in range(round(d*30)+1))
assert JAW_GAPE>.05,('no clip opens this jaw',JAW_GAPE)
ORAL_GEOMETRY={'construction':'uncut (T.jaw_field_uncut): the generation modelled a palate, a '
                              'floor and a commissure, so nothing is cut and the mouth opening is '
                              'the jaw bone turning inside one continuous surface. Full jaw below '
                              'the measured mouth line and forward of the hinge, full skull above '
                              'it, and a band at the commissure that stretches.',
               'authoredParts':[], 'lumenWallVertices':len(CAV_WALL),
               'mouthLine':MOUTH_LINE_DEVIATION, 'boundaryAtTheMouth':UNCUT_RIM,
               'jawBandFractionOfHeadHalfDepthAtTheHinge':JAW_BAND_FRACTION,
               'jawBandRaw':JAW_BAND,'jawBehindRaw':JAW_BEHIND,
               'gapeMeasuredFromTheClips':JAW_GAPE,'field':JAW_FIELD}
print('SHONI_ORAL',json.dumps({k:v for k,v in ORAL_GEOMETRY.items() if k!='construction'}),flush=True)

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
export(authored+features,LOCAL/'shonisaurus.full.uncompressed.glb');export(puppets+features,LOCAL/'shonisaurus.puppet.uncompressed.glb')
# Authoring file carries both geometries; collection visibility is set by review.py.
bpy.ops.wm.save_as_mainfile(filepath=str(LOCAL/'shonisaurus.shared-rig.blend'))
meta={'id':'shonisaurus','name':'Shonisaurus','species':'Shonisaurus popularis','provenance':'Late Triassic · Berlin-Ichthyosaur, Nevada','description':'Deep-bodied shastasaurid with long paired flippers, slender rostrum and lateral tail propulsion. Authored Tripo body and measured procedural volume puppet share the exact armature and actions.','lengthMeters':14,'modelLength':6,'locomotion':'Swim','clips':list(CLIPS),'looping':list(LOOPS),'anchors':[a['name']for a in anchors],'sources':['docs/triassic/canonical/shonisaurus.png','tools/triassic/creatures/shonisaurus/tripo-raw/shonisaurus.raw.glb'],'notes':['Authored skin retains source UV albedo with white COLOR_0 and restrained normal strength 0.15; procedural skin uses measured source pigment.','Procedural geometry is rebuilt from measured radial/spanning sections, not mesh decimation.','Bind geometry has a sealed mouth; only Bite, Attack, Heavy and Eat open it.','No authored oral geometry: the closed generation shows no backdrop through its gape, so the mouth is its anchors and the lip rims and tooth forms the generation drew. The eye globes sit where the albedo paints the eyes, seated 0.0025 raw under the skin along its normal.','Shared clips are applied verbatim to the authored and procedural exports. Oral articulation and swimming performance are inferred soft-tissue behaviour.']}
existing=json.loads((OUT/'shonisaurus.json').read_text())if(OUT/'shonisaurus.json').exists()else{}
meta={**existing,**meta}
(OUT/'shonisaurus.json').write_text(json.dumps(meta,indent=2)+'\n')
(HERE/'build-report.json').write_text(json.dumps({'materialCorrection':{'authoredAlbedo':'original UV texture; white COLOR_0','normalStrength':.15,'roughness':.7,'puppetMaterialUnchanged':True},'mandible':{'construction':'uncut: one continuous surface, one weight field (T.jaw_field_uncut)','bandFractionOfHeadHalfDepthAtTheHinge':JAW_BAND_FRACTION,'bandRaw':JAW_BAND,'behindRaw':JAW_BEHIND},'rawSHA256':hashlib.sha256(RAW.read_bytes()).hexdigest(),'closedRestJawAngleRadians':CLOSED_REST_ANGLE,'puppetLipContactFit':{'vertices':puppet_lip_seated,'maximumModelDisplacement':puppet_lip_max},'chinSurgery':{'adjustedVertices':chin_count,'maximumRawLengthDisplacement':chin_max},'oralGeometry':ORAL_GEOMETRY,'eyes':eye_report,'closedSurfaceWinding':winding_report,'rawVertices':len(points),'rawTriangles':raw_triangles,'meshes':weight_report,'bones':len(B),'clips':list(CLIPS),'profileSections':len(profile)},indent=2)+'\n')
