"""Rebuild Nothosaurus: measured voxel-volume puppet and authored Tripo skin, shared rig.
Blender 5.2. Geometry coordinates are raw Tripo metres before the final 5x engine transform.
"""
import bpy,bmesh,math,json,os,struct,hashlib,shutil,sys
import numpy as np
from mathutils import Vector,Matrix,Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
LOCAL=os.path.join(ROOT,'local/triassic-authoring/nothosaurus'); OUT=os.path.join(ROOT,'public/assets/triassic/creatures'); os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
RAW=os.path.join(HERE,'tripo-raw/nothosaurus.raw.glb'); ID='nothosaurus'
CLIPS={'Idle':2.4,'Swim':1.8,'Sprint':1.2,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.4,'Dodge':.5,'Eat':1.6,'Stagger':1.2,'Ability':1.0,'Grab':1.2,'Breath':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Sprint','Guard','Eat'];SCALE=5
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=RAW);auth=next(o for o in bpy.context.scene.objects if o.type=='MESH');auth.name='Nothosaurus authored body'
bpy.context.view_layer.objects.active=auth
# --- The neck -----------------------------------------------------------------------------------
# Nothosaurus giganteus carries a neck about a fifth of its length. The canonical pose this body was
# generated from draws the head almost on the shoulders, and the shipped body reproduces that pose
# faithfully, so the fix that matters is a redraw (docs/triassic/canonical/prompts-2026-09-13-
# nothosaurus-neck.json). This is the cheaper half-measure that can be done now, and it goes here:
# `neck-stretch-request.json` is the viewer's stretch export for this animal, `appliesTo: "builder"`.
# A rigged GLB cannot take a warped bind pose, because every clip in one re-specifies each joint's
# translation on every frame; in this script the mesh comes first and the rig, the axial weights,
# the procedural twin and all 21 clips are generated downstream of it, so the warp lands before any
# of them and everything else follows by itself.
#
# A port of `warp()` and `normalWarp()` in src/viewer/stretch/stretch.ts, reading that file's own
# numbers rather than retyped ones, so what lands is what was measured. The document is written in
# the exported model's root frame (glTF: body along +z, head at +z, +y up, five units long); raw
# space here is x snoutward, z up, y sideways, at 1/SCALE of it. tx() is the same permutation, so
# the two frames differ by an axis swap and one uniform scale, and the warp is the same map in each.
STRETCH=json.load(open(os.path.join(HERE,'neck-stretch-request.json')))['stretch']
def to_model(p):x,y,z=p;return [y*SCALE,z*SCALE,x*SCALE]
def to_raw(g):return Vector((g[2]/SCALE,g[0]/SCALE,g[1]/SCALE))
def _stretch_geometry(d):
 # Both cuts share one normal, built as forward + tan(tiltSide)*up + tan(tiltTop)*lateral, so the
 # region is a true uniform scale along it and "how far through" is plain distance over length.
 lim=70*pi/180;cl=lambda v:max(-lim,min(lim,v));A=0 if d['frame']['axis']=='x'else 2;L=2-A;U=1
 n=[0,0,0];n[A]=d['frame']['forward'];n[U]=math.tan(cl(d['tiltSide']));n[L]=math.tan(cl(d['tiltTop']))
 v=[c/(math.hypot(*n)or 1)for c in n];ends=[]
 for at in [d['from'],d['to']]:
  c=[0,0,0];c[A]=at;c[U]=d['bounds']['upMid'];c[L]=d['bounds']['lateralMid'];ends.append(sum(c[i]*v[i]for i in range(3)))
 span=ends[1]-ends[0];return v,ends[0],(1e-9 if abs(span)<1e-9 else span),(d['to']-d['from'])*v[A]*(d['factor']-1)
SDIR,SBASE,SSPAN,SSHIFT=_stretch_geometry(STRETCH)
def _through(g):return (g[0]*SDIR[0]+g[1]*SDIR[1]+g[2]*SDIR[2]-SBASE)/SSPAN
def stretch_raw(p):
 # Behind the first cut nothing moves; past the second the head is carried whole; between them a
 # point moves by the whole shift times its own fraction through the region, along the direction.
 g=to_model(p);t=max(0.,min(1.,_through(g)));return to_raw([g[i]+SDIR[i]*SSHIFT*t for i in range(3)])
def stretch_normal(p,n):
 # Inside the region the map is a uniform scale by `factor` along d and nothing across it, so a
 # normal follows its inverse transpose, I-(1-1/factor)*d dT. Carrying the shading normals is what
 # saves recomputing - and so reshading - every face of an animal whose neck alone changed.
 g=to_model(p);s=_through(g)
 if s<=0 or s>=1:return Vector(n)
 m=to_model(n);k=1-1/STRETCH['factor'];dn=sum(m[i]*SDIR[i]for i in range(3))*k
 out=to_raw([m[i]-SDIR[i]*dn for i in range(3)]);return out.normalized()if out.length>1e-9 else Vector(n)
corner=[tuple(l.vector)for l in auth.data.corner_normals];source=[v.co.copy()for v in auth.data.vertices]
for v in auth.data.vertices:v.co=stretch_raw(v.co)
auth.data.normals_split_custom_set([stretch_normal(source[l.vertex_index],corner[i])for i,l in enumerate(auth.data.loops)])
# Forward of the second cut the map is one rigid shift, and everything this builder authors on the
# head takes it: the jaw cut, the mouth seam, the oral surfaces, the hinge, the sockets and the
# skull and jaw bones. Keeping it as the warp rather than as a typed number means a re-measured
# stretch moves all of them together.
HEAD=stretch_raw((.5,0,.1))-Vector((.5,0,.1))
neck_stretch={'from':STRETCH['from'],'to':STRETCH['to'],'factor':STRETCH['factor'],'tiltSideDegrees':round(STRETCH['tiltSide']*180/pi,3),'tiltTopDegrees':round(STRETCH['tiltTop']*180/pi,3),'shift':SSHIFT,'headShift':[round(v,6)for v in HEAD],'verticesInRegion':sum(1 for q in source if 0<_through(to_model(q))<1),'verticesCarried':sum(1 for q in source if _through(to_model(q))>=1),'sourceVertices':len(source)}
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
# Five slivers are all that is open in the welded intake: five two-edge loops of perimeter 0.0013
# to 0.0021 raw (0.006-0.011 in engine units), on the flank and the feet, and nothing to do with
# the gaps between the toes, which are absent geometry rather than an open boundary. Each is a
# hairline crack whose two sides are separate vertices a few ten-thousandths apart, so naming the
# missing triangle only moves the crack along; welding at SLIVER_WELD closes all five, and it is
# a second pass rather than a wider first one because the 1e-6 weld above is about texture seams.
# It merges six vertices of 9,608 and drops twelve degenerate faces: 0.0025 engine units, which
# is under three millimetres on a six-metre animal.
SLIVER_WELD=5e-4
bm=bmesh.new();bm.from_mesh(auth.data)
sliver_report={'openEdgesBefore':len([e for e in bm.edges if len(e.link_faces)<2]),
               'perimeter':round(sum(e.calc_length()for e in bm.edges if len(e.link_faces)<2),6),
               'verticesBefore':len(bm.verts),'weld':SLIVER_WELD}
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=SLIVER_WELD)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
sliver_report['openEdgesAfter']=len([e for e in bm.edges if len(e.link_faces)<2])
sliver_report['verticesAfter']=len(bm.verts)
sliver_report['verticesMerged']=sliver_report['verticesBefore']-sliver_report['verticesAfter']
bm.to_mesh(auth.data);bm.free()
assert sliver_report['openEdgesAfter']==0,sliver_report
assert sliver_report['verticesMerged']<=12,sliver_report
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
# --- The webbing -------------------------------------------------------------------------------
# `docs/triassic/research.md` asks for "webbed, paddle-like feet with retained digits" and the
# generation delivered the digits without the web: rendered against a saturated ground, all four
# paddles showed background straight through the notches between the toes, and the hind feet read
# as clawed hands. The gaps are absent geometry, not open boundaries -- the welded intake carries
# only the five slivers filled above -- so the fix is a membrane, authored here and seated on the
# digits it spans.
#
# It is authored, but its *shape* is measured off the foot rather than invented: each paddle is
# projected onto the horizontal plane (all four sit within 15 degrees of it), its silhouette is
# rasterised, and the web is the morphological closing of that silhouette minus the silhouette --
# that is, exactly the notches between the toes, filled by a disc of WEB_CLOSE rolling over the
# outline, which is what leaves a webbed foot its scalloped free edge. The membrane's two faces
# are the paddle's own upper and lower surfaces extrapolated off the digits and relaxed between
# them, so the web meets each digit at the digit's own surface and curves as the foot curves, and
# its thickness tapers to WEB_TAPER of the local flesh at the free edge. It is seated rather than
# butted: a collar of cells over the digits themselves is carried at WEB_SEAT of their thickness,
# so the sheet runs *inside* the toe and no seam shows where the two meet.
#
# It wears the animal's own skin: every web vertex takes its UV from the nearest point on the
# original surface through that triangle's own barycentric map, and COLOR_0 is white as everywhere
# else, so the membrane samples the same 2K Tripo albedo as the toes on either side of it. Nothing
# here is a flat-shaded patch in a pored hide, and no UVs are lost anywhere: the original mesh is
# not remeshed, only added to.
WEB_CLOSE=.026      # rolling-disc radius: the widest notch between two digits it has to bridge
WEB_CELL=.0018      # raster cell, ~60 across a paddle
WEB_TAPER=.28       # free-edge thickness as a fraction of the flesh the web grows out of
WEB_COLLAR=9.0      # cells of digit the membrane is seated into
WEB_SEAT=.60        # how far inside the digit's own surface that seated collar runs
WEB_ALONG=-.015     # no web behind this point along the limb, so the ankle is not bridged
WEB_DECIMATE=.26
WEB_PIN=.0016      # a web vertex this close to the original surface keeps its measured UV
WEB_UV_RELAX=120   # passes relaxing the rest of the sheet's UVs to those pinned edges
WEB_FOOT_R=.100
WEB_BACK=.030
# wrist and paddle joint of each limb, the same points the rig's limb chain is built on
WEB_PADDLES={'foreL':((.240,.224,-.060),(.238,.280,-.061)),
             'foreR':((.240,-.224,-.060),(.238,-.315,-.061)),
             'hindL':((-.087,.224,-.060),(-.094,.275,-.061)),
             'hindR':((-.087,-.224,-.060),(-.094,-.265,-.061))}


def _disc(r):
 n=int(math.ceil(r));return[(dx,dy)for dx in range(-n,n+1)for dy in range(-n,n+1)if dx*dx+dy*dy<=r*r]


def _shift_or(mask,offsets):
 H,W=mask.shape;out=np.zeros_like(mask)
 for dx,dy in offsets:
  xs0,xs1=max(0,dx),min(W,W+dx);ys0,ys1=max(0,dy),min(H,H+dy)
  out[ys0:ys1,xs0:xs1]|=mask[ys0-dy:ys1-dy,xs0-dx:xs1-dx]
 return out


def _cell_distance(mask):
 d=np.where(mask,0,1<<20).astype(np.int32);cur=mask.copy()
 for k in range(1,80):
  nxt=_shift_or(cur,[(1,0),(-1,0),(0,1),(0,-1)]);new=nxt&~cur
  if not new.any():break
  d[new]=k;cur=nxt
 return d


def _spread(fld,where,nx,ny,passes):
 for _ in range(passes):
  acc=np.zeros_like(fld);cnt=np.zeros(fld.shape)
  for dx,dy in[(1,0),(-1,0),(0,1),(0,-1)]:
   sh=np.full_like(fld,np.nan);xs0,xs1=max(0,dx),min(nx,nx+dx);ys0,ys1=max(0,dy),min(ny,ny+dy)
   sh[ys0:ys1,xs0:xs1]=fld[ys0-dy:ys1-dy,xs0-dx:xs1-dx]
   m=~np.isnan(sh)&where;acc[m]+=sh[m];cnt[m]+=1
  ok=where&(cnt>0);fld[ok]=acc[ok]/cnt[ok]


def web_paddle(name,wrist,tip,P,polys):
 """One paddle's membrane, as a closed slab over the notches between its digits."""
 W0,T0=np.array(wrist),np.array(tip);axis=(T0-W0)/np.linalg.norm(T0-W0)
 inside=(np.linalg.norm(P-T0,axis=1)<WEB_FOOT_R)&((P-W0)@axis>-WEB_BACK)
 faces=[f for f in polys if all(inside[v]for v in f)]
 Q=P[inside];lo=Q[:,:2].min(0)-WEB_CLOSE*1.5;hi=Q[:,:2].max(0)+WEB_CLOSE*1.5
 nx=int(np.ceil((hi[0]-lo[0])/WEB_CELL))+1;ny=int(np.ceil((hi[1]-lo[1])/WEB_CELL))+1
 occ=np.zeros((ny,nx),dtype=bool);zmax=np.full((ny,nx),-1e9);zmin=np.full((ny,nx),1e9)
 rng=np.random.default_rng(3)
 for f in faces:
  tri=P[list(f[:3])];area=np.linalg.norm(np.cross(tri[1]-tri[0],tri[2]-tri[0]))/2
  n=int(min(600,max(8,area/(WEB_CELL*WEB_CELL)*6)));u=rng.random((n,2));flip=u.sum(1)>1;u[flip]=1-u[flip]
  pts=tri[0]+u[:,:1]*(tri[1]-tri[0])+u[:,1:]*(tri[2]-tri[0])
  ix=((pts[:,0]-lo[0])/WEB_CELL).astype(int);iy=((pts[:,1]-lo[1])/WEB_CELL).astype(int)
  ok=(ix>=0)&(ix<nx)&(iy>=0)&(iy<ny);ix,iy,z=ix[ok],iy[ok],pts[ok,2]
  occ[iy,ix]=True;np.maximum.at(zmax,(iy,ix),z);np.minimum.at(zmin,(iy,ix),z)
 R=WEB_CLOSE/WEB_CELL
 closed=~_shift_or(~_shift_or(occ,_disc(R)),_disc(R))
 GX,GY=np.meshgrid(lo[0]+(np.arange(nx)+.5)*WEB_CELL,lo[1]+(np.arange(ny)+.5)*WEB_CELL)
 closed&=((GX-W0[0])*axis[0]+(GY-W0[1])*axis[1])>WEB_ALONG
 web=closed&~occ
 if not web.any():return None,{'webCells':0}
 top=np.where(occ,zmax,np.nan);bot=np.where(occ,zmin,np.nan);cur=occ.copy()
 for _ in range(90):
  grow=_shift_or(cur,[(1,0),(-1,0),(0,1),(0,-1)])&closed&~cur
  if not grow.any():break
  _spread(top,grow,nx,ny,1);_spread(bot,grow,nx,ny,1);cur=cur|grow
 _spread(top,web,nx,ny,40);_spread(bot,web,nx,ny,40)
 mid=(top+bot)/2;half=(top-bot)/2
 dist=_cell_distance(occ).astype(float);dmax=max(1.,float(dist[web].max()))
 half=half*np.clip(1.-(1.-WEB_TAPER)*dist/dmax,WEB_TAPER,1.)
 collar=occ&_shift_or(web,_disc(WEB_COLLAR));patch=web|collar
 half=np.where(collar,half*WEB_SEAT,half)
 nodes={};verts=[];quads=[]

 def node(ix,iy,side):
  key=(ix,iy,side)
  if key in nodes:return nodes[key]
  zs=[mid[cy,cx]+side*half[cy,cx]for cx,cy in[(ix-1,iy-1),(ix,iy-1),(ix-1,iy),(ix,iy)]
      if 0<=cx<nx and 0<=cy<ny and patch[cy,cx]and not np.isnan(mid[cy,cx])]
  i=len(verts);verts.append((lo[0]+ix*WEB_CELL,lo[1]+iy*WEB_CELL,float(np.mean(zs))if zs else 0.))
  nodes[key]=i;return i

 live=[(int(cy),int(cx))for cy,cx in np.argwhere(patch)if not np.isnan(mid[cy,cx])]
 for cy,cx in live:
  quads.append((node(cx,cy,1),node(cx+1,cy,1),node(cx+1,cy+1,1),node(cx,cy+1,1)))
  quads.append((node(cx,cy+1,-1),node(cx+1,cy+1,-1),node(cx+1,cy,-1),node(cx,cy,-1)))
 liveset=set(live)
 for cy,cx in live:
  for dx,dy,e0,e1 in[(1,0,(1,0),(1,1)),(-1,0,(0,1),(0,0)),(0,1,(1,1),(0,1)),(0,-1,(0,0),(1,0))]:
   if (cy+dy,cx+dx) in liveset:continue
   quads.append((node(cx+e0[0],cy+e0[1],1),node(cx+e1[0],cy+e1[1],1),
                 node(cx+e1[0],cy+e1[1],-1),node(cx+e0[0],cy+e0[1],-1)))
 mesh=bpy.data.meshes.new('Nothosaurus web '+name)
 mesh.from_pydata([Vector(v)for v in verts],[],quads);mesh.validate()
 ob=bpy.data.objects.new('Nothosaurus web '+name,mesh);bpy.context.collection.objects.link(ob)
 return ob,{'regionFaces':len(faces),'webCells':int(web.sum()),'patchCells':int(patch.sum())}


web_report={}
_P=np.array([v.co[:]for v in auth.data.vertices])
_polys=[p.vertices[:]for p in auth.data.polygons]
_bvh_web=BVHTree.FromPolygons([v.co for v in auth.data.vertices],_polys,all_triangles=False)
_uvname=auth.data.uv_layers.active.name
webs=[]
for _name,(_wrist,_tip)in WEB_PADDLES.items():
 ob,rep=web_paddle(_name,_wrist,_tip,_P,_polys)
 if ob is None:
  web_report[_name]=rep;continue
 bm=bmesh.new();bm.from_mesh(ob.data)
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6)
 bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
 for _ in range(6):bmesh.ops.smooth_vert(bm,verts=list(bm.verts),factor=.5,use_axis_x=True,use_axis_y=True,use_axis_z=True)
 bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
 bpy.context.view_layer.objects.active=ob
 m=ob.modifiers.new('Web topology budget','DECIMATE');m.ratio=WEB_DECIMATE
 bpy.ops.object.modifier_apply(modifier=m.name)
 # the animal's own skin: nearest point on the original surface, through that triangle's own UVs
 ob.data.uv_layers.new(name=_uvname);_ul=ob.data.uv_layers.active.data
 vuv=[];pin=[]
 for v in ob.data.vertices:
  hit=_bvh_web.find_nearest(v.co);poly=auth.data.polygons[hit[2]]
  p3=[auth.data.vertices[j].co for j in poly.vertices]
  q3=[Vector((*uv.data[j].uv,0))for j in poly.loop_indices]
  st=barycentric_transform(hit[0],p3[0],p3[1],p3[2],q3[0],q3[1],q3[2])
  vuv.append([st.x,st.y]);pin.append((v.co-hit[0]).length<WEB_PIN)
 # Nearest-surface alone puts a seam wherever the nearest digit changes, and the albedo then draws
 # contour lines across the membrane. The seated collar keeps its measured UVs and the free sheet
 # between the digits is relaxed to them, so the skin runs continuously from one toe to the next.
 nbr=[set()for _ in ob.data.vertices]
 for e in ob.data.edges:
  a,b=e.vertices;nbr[a].add(b);nbr[b].add(a)
 for _ in range(WEB_UV_RELAX):
  nxt=[u[:]for u in vuv]
  for i,ns in enumerate(nbr):
   if pin[i]or not ns:continue
   nxt[i]=[sum(vuv[j][0]for j in ns)/len(ns),sum(vuv[j][1]for j in ns)/len(ns)]
  vuv=nxt
 for p in ob.data.polygons:
  for li,vi in zip(p.loop_indices,p.vertices):_ul[li].uv=vuv[vi]
 rep['uvPinnedToSkin']=int(sum(pin));rep['uvRelaxed']=len(pin)-int(sum(pin))
 wl=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for item in wl.data:item.color=(1,1,1,1)
 ob.data.materials.append(mat)
 for p in ob.data.polygons:p.use_smooth=True
 rep['vertices']=len(ob.data.vertices);rep['triangles']=len(ob.data.polygons)
 web_report[_name]=rep;webs.append(ob)
if webs:
 bpy.ops.object.select_all(action='DESELECT')
 for ob in webs:ob.select_set(True)
 auth.select_set(True);bpy.context.view_layer.objects.active=auth;bpy.ops.object.join()
 # the join replaces the mesh datablock, so every reference taken off it has to be taken again
 uv=auth.data.uv_layers.active
 assert min(min(c.color[:3])for c in auth.data.color_attributes['Color'].data)>.999
web_report['total']={'triangles':len(auth.data.polygons),
                     'trianglesAdded':len(auth.data.polygons)-source_triangles}
print('NOTHOSAURUS_WEB',json.dumps(web_report))
print('NOTHOSAURUS_SLIVERS',json.dumps(sliver_report))

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
bone('root',(0,0,0),None);bone('body',(.06,0,-.035),'root');bone('chest',(.19,-.008,-.025),'body')
# Six cervical controls where three used to sit. The stretch nearly doubles the neck and only one
# of the old three falls inside it, so the new length would hang rigidly off the last of them and
# read as a rod; bones bend geometry that already exists, and lengthening without re-boning is
# worse than doing neither. The chain is the old one's centreline taken through the stretch and
# resampled at even arc length: five segments of 0.171 in a 5.26 body against the two of 0.257 it
# had, so the articulation is denser than before rather than merely as dense, and the clips'
# per-joint phasing spreads over a longer neck instead of bending it twice as far.
# Nothosaurs carry 19-25 cervicals, so six is still a summary; it is enough for a smooth arc.
def resample(points,n):
 lens=[(points[i+1]-points[i]).length for i in range(len(points)-1)];out=[]
 for k in range(n):
  u=sum(lens)*k/(n-1)
  for i,L in enumerate(lens):
   if u<=L or i==len(lens)-1:out.append(points[i]+(points[i+1]-points[i])*(u/L));break
   u-=L
 return out
NECK=['neck_base','neck_01','neck_02','neck_03','neck_04','neck_tip']
for i,(n,q) in enumerate(zip(NECK,resample([stretch_raw(q)for q in [(.265,-.013,.004),(.303,-.025,.043),(.336,-.038,.074)]],len(NECK)))):bone(n,q,'chest'if i==0 else NECK[i-1])
bone('skull',stretch_raw((.355,-.04,.086)),NECK[-1]);bone('jaw',stretch_raw((.36,-.044,.084)),'skull')
for i,x in enumerate([-.035,-.10,-.17,-.24,-.31,-.38,-.445]):bone('tail_%02d'%i,center(x),'body'if i==0 else'tail_%02d'%(i-1))
LIMBS={}
for side in [-1,1]:
 s='L'if side>0 else'R'
 for kind,x,yy in [('fore',.235,.315 if side<0 else .28),('hind',-.075,.265 if side<0 else .275)]:
  pts=[(x,side*.070,-.055),(x+(.007 if kind=='fore'else-.012),side*.155,-.066),(x+(.005 if kind=='fore'else-.012),side*.224,-.060),(x+(.003 if kind=='fore'else-.019),side*yy,-.061)]
  names=[kind+'_upper_'+s,kind+'_lower_'+s,kind+'_paddle_'+s];LIMBS[kind+s]=(pts,names)
  for i,n in enumerate(names):bone(n,pts[i],('chest'if kind=='fore'else'tail_00')if i==0 else names[i-1])
# Cut a true articulated lower jaw along the mouth seam for both bodies, preserving the exterior.
# The jaw cut and the mouth seam are authored on the head, which the stretch carries whole, so
# both are the original constants taken through the same shift and the cut still lands on the seam.
JAWCUT=.355+HEAD.x
def seam(x):return .084-.010*(x-.36-HEAD.x)+HEAD.z
jawparts={}
def split_jaw(o):
 bm=bmesh.new();bm.from_mesh(o.data)
 # Make both boundary planes explicit before splitting; no triangles straddle the hinge.
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=(JAWCUT,0,0),plane_no=(1,0,0),clear_inner=False,clear_outer=False)
 bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=1e-7,plane_co=(.36+HEAD.x,0,seam(.36+HEAD.x)),plane_no=(.01,0,1),clear_inner=False,clear_outer=False)
 bm.to_mesh(o.data);bm.free()
 jaw=o.copy();jaw.data=o.data.copy();jaw.name=o.name+' lower jaw';bpy.context.collection.objects.link(jaw)
 for target,keep_lower in [(o,False),(jaw,True)]:
  bm=bmesh.new();bm.from_mesh(target.data)
  discard=[]
  for f in bm.faces:
   c=f.calc_center_median();lower=c.x>JAWCUT and c.z<seam(c.x)-1e-7
   if lower!=keep_lower:discard.append(f)
  bmesh.ops.delete(bm,geom=discard,context='FACES')
  loose=[v for v in bm.verts if not v.link_faces]
  if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
  bm.to_mesh(target.data);bm.free()
 jawparts[o.name]=jaw
for o in [auth,puppet]:split_jaw(o)
# Region-restricted skin: trunk blends longitudinally, limbs radially blend into their own root.
# Every cervical needs its own station or the skin does not follow it. Each keeps the same small
# lead ahead of its own head that the three used to carry, measured on the stretched chain; the
# skull's station takes the head's rigid shift, which leaves the blend either side of the jaw cut
# exactly the fraction it was.
AXIAL=[('tail_06',-.48),('tail_05',-.412),('tail_04',-.345),('tail_03',-.275),('tail_02',-.205),('tail_01',-.135),('tail_00',-.066),('body',.064),('chest',.22)]+[(n,B[n][0].x+(.007 if n==NECK[-1]else .012))for n in NECK]+[('skull',.385+HEAD.x)]
assert all(AXIAL[i][1]<AXIAL[i+1][1]for i in range(len(AXIAL)-1)),AXIAL
def axial(x):
 xs=[v for _,v in AXIAL]
 if x<=xs[0]:return {AXIAL[0][0]:1.}
 if x>=xs[-1]:return {AXIAL[-1][0]:1.}
 i=int(np.searchsorted(xs,x))-1;t=(x-xs[i])/(xs[i+1]-xs[i]);return {AXIAL[i][0]:1-t,AXIAL[i+1][0]:t}
def weights(p,isjaw=False):
 x,y,z=p
 if isjaw:return {'jaw':1.}
 if x>JAWCUT:return {'skull':1.}
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
  u=i/17;x=.361+HEAD.x+.134*u;cy=HEAD.y+float(np.interp(x-HEAD.x,[.36,.40,.44,.48,.50],[-.045,-.055,-.071,-.087,-.091]));width=.021*(sin(pi*u)**.5)+.002
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
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=tx(stretch_raw((.354,-.043,.076))))
o=bpy.context.object;o.name='Seated jaw hinge tissue';o.scale=(.155,.11,.105);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for v in o.data.vertices:v.co=o.matrix_world@v.co
o.location=(0,0,0);o.parent=rig
hm=bpy.data.materials.new('Nothosaurus jaw hinge body');hm.diffuse_color=(.28,.26,.20,1);hm.use_nodes=True;hbs=hm.node_tree.nodes.get('Principled BSDF');hbs.inputs['Base Color'].default_value=(.28,.26,.20,1);hbs.inputs['Roughness'].default_value=.7;o.data.materials.append(hm)
for n in ['skull','jaw']:o.vertex_groups.new(name=n)
for v in o.data.vertices:
 t=max(0,min(1,(.395+HEAD.z*SCALE-v.co.z)/.1));o.vertex_groups['jaw'].add([v.index],t*.5,'REPLACE');o.vertex_groups['skull'].add([v.index],1-t*.5,'REPLACE')
for p in o.data.polygons:p.use_smooth=True
mo=o.modifiers.new('Hinge skin','ARMATURE');mo.object=rig;oralparts.append(o)

# Measured/profile evidence compares both surfaces in rest; nearest-distance works for asymmetry.
rawco=np.array([v.co[:]for v in auth.data.vertices]);pco=np.array([v.co[:]for v in puppet.data.vertices]);pv=BVHTree.FromPolygons([v.co for v in puppet.data.vertices],[p.vertices[:]for p in puppet.data.polygons]);distances=[pv.find_nearest(v.co)[3]for v in auth.data.vertices]
allco=np.concatenate([np.array([v.co[:]for v in o.data.vertices])for o in [auth,puppet]+list(jawparts.values())])
# The stretch makes the animal longer, so the stations and the declared length are read off the
# built meshes rather than assumed: for an unstretched body this is the old -2.45..2.45 exactly.
AXIS_LO=float(allco[:,1].min());AXIS_HI=float(allco[:,1].max());MODEL_LENGTH=AXIS_HI-AXIS_LO
def section(objects,y):
 points=[]
 for o in objects:
  for e in o.data.edges:
   a,b=[o.data.vertices[j].co for j in e.vertices]
   if (a.y-y)*(b.y-y)<=0 and abs(a.y-b.y)>1e-8:points.append(a+(b-a)*((y-a.y)/(b.y-a.y)))
 if not points:return None
 a=np.array(points);return {'min':a.min(0).tolist(),'max':a.max(0).tolist()}
profile=[]
for y in np.linspace(AXIS_LO+.05,AXIS_HI-.05,21):
 row={'stationY':float(y)}
 for label,o in [('authored',auth),('puppet',puppet)]:row[label]=section([o,jawparts[o.name]],y)
 if row['authored'] and row['puppet']:
  row['maximumEnvelopeDifference']=max(abs(a-b)for k in ['min','max']for a,b in zip(row['authored'][k],row['puppet'][k]));assert row['maximumEnvelopeDifference']<.2,row
 profile.append(row)
open(os.path.join(HERE,'nothosaurus-profile.json'),'w').write(json.dumps({'method':'21 exact plane-intersection envelopes; asymmetry retained; 0.007 raw-space voxel occupancy resurfacing','bodyLength':MODEL_LENGTH,'neckStretch':neck_stretch,'stations':profile,'surfaceDistanceMax':max(distances),'surfaceDistanceP95':float(np.quantile(distances,.95)),'surfaceTolerance':.2},indent=2))
assert max(distances)<.2
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
def reset():
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
def smooth(t):
 t=max(0,min(1,t));return t*t*(3-2*t)
def rowing_cycle(u):
 # One deliberate stroke per locomotion clip. The broadside power sweep occupies
 # 68% of the cycle; the paddle then feathers edge-on for the short recovery.
 phase=u%1;power_end=.68
 if phase<power_end:return -1+2*smooth(phase/power_end),0
 recovery=smooth((phase-power_end)/(1-power_end))
 return 1-2*recovery,sin(pi*recovery)
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
  locomotor=clip in ['Swim','Sprint']
  body=pb['body'];body.rotation_euler.y=(.005 if locomotor else .025)*amp*wave(.3);body.location.z=.018*amp*wave(.2)
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
  pb['chest'].rotation_euler.z=(0 if locomotor else .022*amp*wave(.5))+.075*turn
  share=3./len(NECK)
  for j,n in enumerate(NECK):
   # Locomotion holds the skull on the shoulder line. Turns and authored actions
   # still use the neck; only the obsolete stroke-rate walking sway is removed.
   # Each joint's share is divided by the length of the chain, so six cervicals spread the bend
   # the three used to carry between them rather than bending a neck that is now nearly twice as
   # long twice as far - the phase lag off the joint's own index is what makes it an arc.
   pb[n].rotation_euler.z=((0 if locomotor else .025*amp*wave(.9+j*.4))+.04*turn)*share
   pb[n].rotation_euler.x=(-.04*wind+.055*peak if clip in ['Attack','Heavy']else(-.055*e if clip=='Breath'else .008*wave(j*.4)))*share
  if clip in ['Ability','Grab']:
   # The middle of the neck and its last joint, by index rather than by name.
   pb[NECK[len(NECK)//2]].rotation_euler.z=.055*e*sin(p*(2 if clip=='Ability'else 3));pb[NECK[-1]].rotation_euler.x=.04*e
  for i in range(7):
   q=pb['tail_%02d'%i];q.rotation_euler.z=(.045+i*.012)*amp*wave(i*.48,2 if clip in ['Swim','Sprint']else 1)+.045*dead*sin(i*.7)+turn*(.022+i*.008)
   if clip=='Dodge':q.rotation_euler.z+=.13*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.07*peak
  for key,(pts,names) in LIMBS.items():
   s=1 if key.endswith('L')else-1;hind=key.startswith('hind');lag=(pi if hind else 0)+(.12 if s<0 else 0);q=pb[names[0]]
   if locomotor:
    sweep,feather=rowing_cycle(u)
    if hind:
     # Hind limbs trail the paired forelimb drive: same phase, much smaller
     # excursion, with only enough feathering to avoid becoming rigid rudders.
     q.rotation_euler.z=s*.12*amp*sweep
     q.rotation_euler.y=s*.035*amp*sweep
     pb[names[1]].rotation_euler.z=s*.05*amp*sweep
     pb[names[2]].rotation_euler.y=s*(.035*amp*sweep+.20*feather)
    else:
     # The bones share axes but the limb geometry is mirrored across the body,
     # so opposite signed rotations produce the same physical fore-aft stroke.
     q.rotation_euler.z=s*.27*amp*sweep
     q.rotation_euler.y=s*.055*amp*sweep
     pb[names[1]].rotation_euler.z=s*.13*amp*sweep
     pb[names[2]].rotation_euler.y=s*(.055*amp*sweep+.52*feather)
   else:
    q.rotation_euler.z=s*(.27*amp*wave(lag)-.12*dead)
    q.rotation_euler.y=s*(.13*amp*wave(lag+pi/2)+.16*dead)
    pb[names[1]].rotation_euler.z=s*.13*amp*wave(lag+.7)
    pb[names[2]].rotation_euler.y=s*(.19*amp*wave(lag+1.3)+.12*dead)
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
# The sockets sit on the head and move with it: all three are forward of the second cut.
anchors=[{'name':'anchor_mouth','bone':'jaw','point':list(tx(stretch_raw((.495,-.088,.081)))),'role':'mouth'},{'name':'anchor_mouth_inside','bone':'skull','point':list(tx(stretch_raw((.366,-.047,.082)))),'role':'swallow'},{'name':'anchor_attack_primary','bone':'skull','point':list(tx(stretch_raw((.501,-.087,.077)))),'role':'attack'}]
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
meta={'id':ID,'name':'Nothosaurus','species':'Nothosaurus giganteus','description':'Canonical Tripo body with its neck lengthened from the measured viewer stretch, and a procedural volume twin resurfaced from the same mesh, sharing an articulated rowing, tail, six-joint cervical and jaw rig.','modelLength':round(MODEL_LENGTH,4),'lengthMeters':6,'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'puppet':'nothosaurus.puppet.glb','notes':['The curved tail and asymmetric paddle stance are retained from the accepted Tripo volume.','The procedural twin resurfaces a 0.007-unit voxel occupancy field, relaxes it and reduces the new topology. It does not reuse source vertices or faces.','Same rest rig, inverse binds, sockets and all 21 action sample arrays are used for authored and puppet. LOD deliberately retains all clips.','The neck is lengthened by the measured stretch in neck-stretch-request.json, applied to the intake mesh before anything is derived from it, so the twin, the rig, the weights, the sockets and every clip follow it. Six cervical controls replace three; the albedo and UVs are the originals, so the neck pigment stretches with the neck.','Original albedo retained with white COLOR_0; normal relief limited to 0.15 and skin set explicitly nonmetallic at roughness 0.7. Puppet pigment samples triangle-local UVs to avoid seam bleed. True jaw split and internal oral surfaces added; connected foot webbing retained.','Living colours, soft tissues and movements are artistic reconstruction. Ability performs the roster fang-trap clamp; Grab braces and tugs the held prey. Breath provides a separate in-place surface-breath/dive gesture. Locomotor translation remains engine-owned.']}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'sourceSha256':hashlib.sha256(open(RAW,'rb').read()).hexdigest(),'sourceTriangles':source_triangles,'removedFlakeVertices':removed,'fullTriangles':sum(len(p.vertices)-2 for p in auth.data.polygons)+sum(len(p.vertices)-2 for p in jawparts[auth.name].data.polygons)+sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in oralparts),'puppetTriangles':sum(len(p.vertices)-2 for p in puppet.data.polygons)+sum(len(p.vertices)-2 for p in jawparts[puppet.name].data.polygons)+sum(sum(len(p.vertices)-2 for p in o.data.polygons)for o in oralparts),'bones':len(B),'neckJoints':len(NECK),'neckStretch':neck_stretch,'modelLength':MODEL_LENGTH,'clips':CLIPS,'loopSeams':seams,'boundsAt13Phases':bounds,'surfaceDistanceMax':max(distances),'surfaceDistanceP95':float(np.quantile(distances,.95)),'profileTolerance':.2,'normalizedWeights':True,'rootStable':True,'noScaleChannels':True}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Save editable source with both renderable bodies. Export selection is the only difference.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,'nothosaurus-paired.blend'))
print('NOTHOSAURUS_REPORT',json.dumps(report))
