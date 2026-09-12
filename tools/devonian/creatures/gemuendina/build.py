"""Bespoke Gemuendina stuertzi reconstruction; Blender 4.5+ standalone builder."""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi
HERE=os.path.dirname(os.path.abspath(__file__))
ROOT=os.path.abspath(os.path.join(HERE,'../../../..'))
OUT=os.environ.get('GEMUENDINA_OUTPUT',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/gemuendina/candidate')))
LOCAL=os.environ.get('DEVONIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../devonian-authoring/gemuendina')))
os.makedirs(LOCAL,exist_ok=True);os.makedirs(OUT,exist_ok=True)
ID='gemuendina';CLIPS={'Idle':2.4,'Swim':2.4,'TurnLeft':1.6,'TurnRight':1.6,'Dive':1.4,'Rise':1.4,'Attack':1.,'Bite':.5,'Heavy':1.1,'Hit':.6,'Death':1.6,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':1.6,'Stagger':1.2,'Ability':2.4,'Growth':1.5}
LOOPS=['Idle','Swim','Guard','Eat']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
V=[];C=[];W=[];U=[];F=[];M=[];B={}
def bone(n,p,parent='body'):
 B[n]=(Vector(p),Vector(p)+Vector((0,.35,0)),parent)
bone('root',(0,0,0),None);bone('body',(0,0,0),'root');bone('skull',(0,-.72,.08));bone('jaw',(0,-1.06,.08),'skull');bone('throat',(0,-1.0,.08),'skull')
for i,y in enumerate([.65,1.3,1.95,2.55]):bone('tail%d'%i,(0,y,0),'body' if i==0 else 'tail%d'%(i-1))
for side in [-1,1]:
 s='L' if side==1 else 'R'
 for k,y in enumerate([-.45,.20,.8]):
  bone('wing%d'%k+s,(side*.55,y,.015));bone('wingTip%d'%k+s,(side*1.25,y,.015),'wing%d'%k+s)
 bone('pelvic'+s,(side*.31,1.1,-.02),'tail0');bone('gill'+s,(side*.58,-.66,-.05),'skull')
bone('caudal',(0,2.75,.015),'tail3')
def vertex(p,col,w,uv=(0,0),var=True):
 p=Vector(p);v=.87+.19*noise.noise_vector(p*5)[0]+.10*noise.noise_vector(p*27)[1] if var else 1
 # Irregular small mottling with a faint warm lateral band, not scales pasted on armour.
 v*=1-.12*max(0,noise.noise_vector(p*13)[2])
 V.append(tuple(p));C.append(tuple(max(.001,min(.9,k*v))for k in col)+(1,));weights={w:1}if isinstance(w,str)else dict(sorted(((n,a)for n,a in w.items()if a>0),key=lambda kv:kv[1],reverse=True)[:4]);total=sum(weights.values());W.append({name:value/total for name,value in weights.items() if value>0});U.append(uv);return len(V)-1
def face(f,m=0):F.append(tuple(f));M.append(m)
def grid(nr,nc,fn,m=0,wrap=False):
 ids=[[fn(i,j)for j in range(nc)]for i in range(nr)]
 for i in range(nr-1):
  for j in range(nc if wrap else nc-1):face((ids[i][j],ids[i][(j+1)%nc],ids[i+1][(j+1)%nc],ids[i+1][j]),m)
 return ids
def tube(pts,radii,col,w,m=0,sides=10):
 pts=list(map(Vector,pts));rows=[]
 for i,p in enumerate(pts):
  t=(pts[min(len(pts)-1,i+1)]-pts[max(0,i-1)]).normalized();a=t.cross(Vector((0,0,1)))
  if a.length<.001:a=t.cross(Vector((1,0,0)))
  a.normalize();b=t.cross(a);wi=w[i]if isinstance(w,list)else w
  rows.append([vertex(p+float(radii[i])*(a*cos(j*2*pi/sides)+b*sin(j*2*pi/sides)),col,wi,(j/sides,i/max(1,len(pts)-1)))for j in range(sides)])
 for i in range(len(rows)-1):
  for j in range(sides):face((rows[i][j],rows[i][(j+1)%sides],rows[i+1][(j+1)%sides],rows[i+1][j]),m)
 face(reversed(rows[0]),m);face(rows[-1],m)
def ell(c,scale,col,w,m=3):
 c=Vector(c)
 grid(17,32,lambda i,j:vertex(c+Vector((scale[0]*sin(pi*i/16)*cos(2*pi*j/32),scale[1]*sin(pi*i/16)*sin(2*pi*j/32),scale[2]*cos(pi*i/16))),col,w,(j/32,i/16),False),m,True)
# Dedicated Gemuendina V2 anatomy, wholly separate from the former stock fish silhouette.
sys.path.insert(0,HERE)
exec(compile(open(os.path.join(HERE,'anatomy_v2.py')).read(),'anatomy_v2.py','exec'))
from materials_v2 import build_materials,cellular
# Fine tessera boundaries depress the continuous body; no individual overlapping hex tiles.
positions=np.array(V[bodyStart:bodyEnd]);gap,tone=cellular(positions[:,0],positions[:,1]);displacement=-.002*np.exp(-gap/.065)+.0006*(tone-.5)
for k,delta in enumerate(displacement):
 p=Vector(V[bodyStart+k]);w,h,z=section(p.y);upper=max(0,(p.z-z)/max(h,.001));cranial=math.exp(-((p.x/.24)**2+((p.y+1.12)/.42)**2));p.z+=float(delta)*upper*(1-.75*cranial);V[bodyStart+k]=tuple(p)
mats,texture_lookup=build_materials(HERE,sections)
for fi,mi in zip(F,M):
 family=['body','body',None,None,'oral','fin'][mi]
 for vi in fi:
  if family:
   data=texture_lookup[family];u,v=U[vi];yy=round(min(.999,max(0,v))*(data.shape[0]-1));xx=round(min(.999,max(0,u))*(data.shape[1]-1));rgb=data[max(0,yy-3):yy+4,max(0,xx-3):xx+4].mean(axis=(0,1));linear=np.where(rgb<=.04045,rgb/12.92,((rgb+.055)/1.055)**2.4);C[vi]=tuple(float(x)for x in linear)+(1,)
  else:C[vi]=(.004,.009,.006,1)if mi==3 else(.25,.16,.078,1)
mesh=bpy.data.meshes.new(ID+' contiguous anatomy');mesh.from_pydata(V,[],F);mesh.update();obj=bpy.data.objects.new(ID,mesh);bpy.context.collection.objects.link(obj)
for m in mats:mesh.materials.append(m)
for p,mi in zip(mesh.polygons,M):p.material_index=mi;p.use_smooth=True
col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(C,dtype=np.float32).ravel());uv=mesh.uv_layers.new(name='UVMap');loopUV=[U[l.vertex_index] for l in mesh.loops]
# Dorsal/ventral islands split along face corners, so shared side vertices never stretch across the atlas.
for poly in mesh.polygons:
 if poly.material_index==4:
  for li in poly.loop_indices:
   vi=mesh.loops[li].vertex_index
   if vi in oralUV:loopUV[li]=oralUV[vi]
  us=[loopUV[li][0]for li in poly.loop_indices]
  if max(us)-min(us)>.5:
   for li in poly.loop_indices:
    u,v=loopUV[li];loopUV[li]=(u+1 if u<.5 else u,v)
 if poly.material_index!=0:continue
 centre=poly.center;w,h,z=section(centre.y);offset=.5 if centre.z<z else 0;isSide=abs((centre.z-z)/max(.001,h))<.55
 for li in poly.loop_indices:
  p=Vector(V[mesh.loops[li].vertex_index]);loopUV[li]=((p.y+1.76)/5.17,.8+(p.z+.25)/.5*.2)if isSide else((p.x/.90+1)/4+offset,(p.y+1.76)/5.17*.8)
uv.data.foreach_set('uv',np.array(loopUV,dtype=np.float32).ravel())
bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free();mesh.update()
arm=bpy.data.armatures.new(ID+' skeleton');rig=bpy.data.objects.new(ID+'_rig',arm);bpy.context.collection.objects.link(rig);obj.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
for n,(h,t,p)in B.items():
 b=arm.edit_bones.new(n);b.head=h;b.tail=t
 if p:b.parent=arm.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')
groups={n:obj.vertex_groups.new(name=n)for n in B}
for i,w in enumerate(W):
 total=sum(w.values());assert abs(total-1)<1e-6
 for n,value in w.items():
  if value>0:groups[n].add([i],value,'REPLACE')
mod=obj.modifiers.new('Anatomical deformation','ARMATURE');mod.object=rig;obj.parent=rig
scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
for pb in rig.pose.bones:pb.rotation_mode='XYZ'
def reset():
 for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0);pb.scale=(1,1,1)
seams={};bounds={}
for clip,duration in CLIPS.items():
 a=bpy.data.actions.new(clip);a.use_fake_user=True;rig.animation_data.action=a;last=round(duration*30);first=None
 for f in range(last+1):
  reset();u=f/last;p=2*pi*u;e=sin(pi*u)**2;loop=clip in LOOPS;env=1 if loop else e;pb=rig.pose.bones
  wave=lambda lag=0,freq=1:(sin(p*freq-lag)if loop else sin(p*freq-lag)-sin(-lag))*env
  amp={'Idle':.20,'Swim':1.0,'Eat':.38,'Guard':.24,'Dodge':1.3,'Ability':.55,'Growth':.32}.get(clip,.46)
  peak=sin(pi*(u-.24)/.4)**2 if .24<u<.64 else 0
  wind=sin(pi*u/.28)**2 if u<.28 else 0
  settle=sin(pi*(u-.64)/.36)**2 if u>.64 else 0
  dead=u*u*(3-2*u)if clip=='Death'else 0
  if clip=='Death':amp*=1-dead
  opening=.016*(1-cos(p*2))if loop else 0
  if clip=='Eat':opening=.19*(1-cos(p))
  if clip=='Bite':opening=.46*e
  if clip=='Attack':opening=.43*peak
  if clip=='Heavy':opening=.32*peak+.09*wind
  if clip=='Ability':opening=.34*e**.7
  if clip=='Growth':opening=.09*e
  opening+=.16*dead
  pb['jaw'].rotation_euler.x=opening;pb['throat'].rotation_euler.x=opening*.12+.017*wave(.6,2)
  pb['skull'].rotation_euler.x=-opening*.10
  body=pb['body'];body.rotation_euler.y=.015*amp*wave(.4);body.rotation_euler.x=.02*amp*wave();body.location.z=.018*amp*wave(.2)
  if clip in ['TurnLeft','TurnRight']:body.rotation_euler.z=(-1 if clip=='TurnLeft'else 1)*.24*e;body.rotation_euler.y=(-1 if clip=='TurnLeft'else 1)*.12*e
  if clip in ['Dive','Rise']:body.rotation_euler.x=(1 if clip=='Dive'else-1)*.22*e;body.location.z=(-1 if clip=='Dive'else 1)*.10*e
  if clip=='Attack':body.location.z=-.045*wind+.19*peak;body.location.y=.04*wind-.09*peak;body.rotation_euler.x=.04*wind-.11*peak
  if clip=='Heavy':body.rotation_euler.x=.07*wind-.19*peak+.025*settle;body.location.z=-.06*wind+.24*peak;body.location.y=-.08*peak
  if clip=='Parry':body.rotation_euler.z=.17*e;body.rotation_euler.y=-.16*e
  if clip=='Guard':body.location.z=-.026*(1-cos(p));body.rotation_euler.x=.023*(1-cos(p))
  if clip=='Dodge':body.rotation_euler.y=.26*e;body.rotation_euler.z=-.28*e;body.location.x=.24*e
  if clip in ['Hit','Stagger']:body.rotation_euler.z=.13*e*sin(p*(1 if clip=='Hit'else 2));body.rotation_euler.y=.16*e;body.location.z=-.05*e
  if clip=='Ability':body.location.z=.16*e;body.rotation_euler.x=-.12*e
  if clip=='Growth':body.rotation_euler.x=-.045*e;body.location.z=.04*e
  body.rotation_euler.y+=.55*dead;body.location.z-=.10*dead
  for i in range(4):
   q=pb['tail%d'%i];q.rotation_euler.z=(.085+i*.030)*amp*wave(i*.66)+.11*dead*sin(i*.65)
   if clip=='Dodge':q.rotation_euler.z+=.18*e*sin(i*.7+.5)
   if clip=='Heavy':q.rotation_euler.z-=.08*peak
   if clip in ['TurnLeft','TurnRight']:q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*(.065+i*.012)*e
  pb['caudal'].rotation_euler.z=.14*amp*wave(2.7)+.09*dead
  for s in [-1,1]:
   suffix='L'if s==1 else'R'
   for k in range(3):
    q=pb['wing%d'%k+suffix];tip=pb['wingTip%d'%k+suffix]
    # A wave travels front to rear through each fin; tips lag their proximal rays.
    q.rotation_euler.y=s*(.14*amp*wave(k*.91)+.12*dead)
    tip.rotation_euler.y=s*(.20*amp*wave(k*.91+.73)+.16*dead)
    q.rotation_euler.z=s*.018*amp*wave(k*.9+.3)
    if clip=='Guard':q.rotation_euler.y+=s*.13*(1-cos(p));tip.rotation_euler.y+=s*.12*(1-cos(p))
    if clip in ['Attack','Heavy']:q.rotation_euler.y+=s*(.12*wind-.22*peak+.06*settle);tip.rotation_euler.y+=s*(.15*wind-.18*peak)
    if clip=='Ability':q.rotation_euler.y-=s*.19*e;tip.rotation_euler.y-=s*.10*e
    if clip=='Dodge':q.rotation_euler.y+=s*(.28 if s==1 else-.14)*e
    if clip in ['TurnLeft','TurnRight']:q.rotation_euler.y+=s*(.15 if (s==1)==(clip=='TurnLeft')else-.06)*e
    if clip=='Growth':q.rotation_euler.y-=s*.16*e
   pb['pelvic'+suffix].rotation_euler.y=s*(.05*amp*wave(1.9)+.15*dead)
   pb['gill'+suffix].rotation_euler.z=s*(.075*opening+.02*wave(.4,2))
  state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb])
  if f==0:first=state.copy()
  if f==last:seams[clip]=float(abs(state-first).max())
  for q in pb:
   if q.name!='root':q.keyframe_insert('rotation_euler',frame=f)
   if q.name=='body':q.keyframe_insert('location',frame=f)
 points=[]
 for f in [0,int(last*.25),int(last*.5),int(last*.75),last]:
  scene.frame_set(f);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();co=np.array([v.co[:]for v in me.vertices]);assert np.isfinite(co).all();points.extend([co.min(0),co.max(0)]);ev.to_mesh_clear()
 bounds[clip]=[np.array(points).min(0).tolist(),np.array(points).max(0).tolist()]
 rig.animation_data.action=None
for c in set(CLIPS)-{'Death'}:assert seams[c]<1e-6,(c,seams[c])
reset();scene.frame_set(0)
anchors=[{'name':'anchor_mouth','bone':'jaw','point':[0,-1.30,.20],'role':'mouth'}, {'name':'anchor_mouth_inside','bone':'skull','point':[0,-1.30,.05],'role':'swallow'},{'name':'anchor_attack_primary','bone':'jaw','point':[0,-1.36,.20],'role':'attack'}]
open(os.path.join(HERE,'anchors.json'),'w').write(json.dumps({ID:anchors},indent=2))
# Parent inverse equals inverse bind bone tail transform; matrix_world sets real anatomical world point.
sockets=[]
for a in anchors:
 socket=bpy.data.objects.new(a['name'],None);bpy.context.collection.objects.link(socket);socket.parent=rig;socket.parent_type='BONE';socket.parent_bone=a['bone'];socket.matrix_world.translation=Vector(a['point']);socket['cambrianAnchor']={'version':1,'role':a['role'],'parentBone':a['bone']};sockets.append(socket)
# Split by material before export (avoids Blender multi-material colour-index exporter regression).
bpy.ops.object.select_all(action='DESELECT');temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);temp.select_set(True);bpy.context.view_layer.objects.active=temp;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
for part in parts:bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=ID+' '+part.data.materials[0].name
rig.select_set(True)
for s in sockets:s.select_set(True)
bpy.context.view_layer.objects.active=rig
kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True,export_extras=True)
fullColors={}
for part in parts:
 col=part.data.color_attributes['Color'];fullColors[part.name]=np.array([c.color[:]for c in col.data]);col.data.foreach_set('color',np.ones_like(fullColors[part.name],dtype=np.float32).ravel())
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.glb'),**kwargs)
for part in parts:part.data.color_attributes['Color'].data.foreach_set('color',fullColors[part.name].astype(np.float32).ravel())
fulltris=sum(len(p.vertices)-2 for p in mesh.polygons)
for part in parts:
 bpy.context.view_layer.objects.active=part;de=part.modifiers.new('Reduced silhouette preserving topology','DECIMATE');de.ratio=.28;bpy.ops.object.modifier_move_up(modifier=de.name);bpy.ops.object.modifier_apply(modifier=de.name)
lodtris=sum(sum(len(p.vertices)-2 for p in part.data.polygons)for part in parts)
materialLinks=[]
for mat in mats:
 bs=mat.node_tree.nodes.get('Principled BSDF')
 for name in ['Base Color','Normal','Roughness']:
  for link in list(bs.inputs[name].links):materialLinks.append((mat,link.from_socket,link.to_socket));mat.node_tree.links.remove(link)
 bs.inputs['Base Color'].default_value=(1,1,1,1)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,ID+'.lod1.glb'),**kwargs)
for mat,source,target in materialLinks:mat.node_tree.links.new(source,target)
mats[3].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.004,.009,.006,1)
mats[2].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.25,.16,.078,1)
for part in parts:bpy.data.objects.remove(part,do_unlink=True)
# Resolve exact socket local transforms post-export from inverse exported parent world bind matrix.
def patch(path,lod=False):
 raw=open(path,'rb').read();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);binary=raw[20+n:];nodes=g['nodes'];parent={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
 from mathutils import Matrix,Quaternion
 def world(i):
  node=nodes[i]
  if 'matrix'in node:m=Matrix(np.array(node['matrix']).reshape(4,4).T.tolist())
  else:
   t=node.get('translation',[0,0,0]);q=node.get('rotation',[0,0,0,1]);s=node.get('scale',[1,1,1]);m=Matrix.LocRotScale(Vector(t),Quaternion((q[3],q[0],q[1],q[2])),Vector(s))
  return world(parent[i])@m if i in parent else m
 for a in anchors:
  i=next(i for i,n in enumerate(nodes)if n.get('name')==a['name']);b=next(i for i,n in enumerate(nodes)if n.get('name')==a['bone']);p=Vector((a['point'][0],a['point'][2],-a['point'][1]));local=world(b).inverted()@p
  if i in parent and i in nodes[parent[i]].get('children',[]):nodes[parent[i]]['children'].remove(i)
  nodes[b].setdefault('children',[]).append(i);nodes[i]={'name':a['name'],'translation':list(local),'extras':{'cambrianAnchor':{'version':1,'role':a['role'],'parentBone':a['bone']}}}
 for animation in g['animations']:
  kept=[]
  for channel in animation['channels']:
   target=channel['target'];name=nodes[target['node']].get('name');prop=target['path']
   if prop=='scale' or name=='root':
    acc=g['accessors'][animation['samplers'][channel['sampler']]['output']];view=g['bufferViews'][acc['bufferView']];count={'VEC3':3,'VEC4':4}[acc['type']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0);values=np.frombuffer(binary,dtype='<f4',count=acc['count']*count,offset=offset).reshape(-1,count)
    expected=np.array(nodes[target['node']].get(prop,[1,1,1]if prop=='scale'else[0,0,0,1]if prop=='rotation'else[0,0,0]));assert np.max(np.abs(values-expected))<1e-5,(name,prop,values)
   else:kept.append(channel)
  animation['channels']=kept
 if lod:g['animations']=[a for a in g['animations']if a['name']in ['Idle','Swim','Death']]
 js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);out=struct.pack('<III',0x46546c67,2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary;open(path,'wb').write(out);return g
full=patch(os.path.join(OUT,ID+'.glb'));lod=patch(os.path.join(OUT,ID+'.lod1.glb'),True)
for g in [full,lod]:
 assert len([n for n in g['nodes']if n.get('name','').startswith('anchor_')])==3
 for a in g['animations']:
  assert all(c['target']['path']!='scale'for c in a['channels'])
  assert all(g['nodes'][c['target']['node']].get('name')!='root'for c in a['channels'])
assert lodtris/fulltris<.4
sources=[{'title':'Johanson and Smith (2005), Origin and evolution of gnathostome dentitions','url':'https://doi.org/10.1017/S1464793104006682','doi':'10.1017/S1464793104006682'},{'title':'Südkamp (2021), Ikonen des Hunsrückschiefers, illustrated specimens pp.17–18','url':'https://www.bundenbach-fossilien.de/Literatur/2021_S%C3%BCdkamp_Ikonen.pdf'},{'title':'Westoll (1967), Radotina and other tesserate fishes','url':'https://doi.org/10.1111/j.1096-3642.1967.tb01397.x','doi':'10.1111/j.1096-3642.1967.tb01397.x'}]
notes=['Broad low rhenanid form, upward eye/oral orientation, small lower-jaw denticles and regional differences in dermal ornament follow inspected fossil discussions.','A finless tapering tail follows the illustrated specimen account; generic shark dorsal/caudal fins, fin spokes, ventral gill rows and sting are omitted.','Living thickness, soft-tissue cavity, exact denticle/tessera arrangement, fin flexibility, pigmentation and motions are explicit reconstruction choices.','0.30 m is a representative reconstructed length close to the illustrated 304 mm specimen, not a claimed species maximum.','All action names are compatibility labels for specimen gestures; no Devonian gameplay rules are prescribed.']
meta={'id':ID,'name':'Gemuendina','species':'Gemuendina stuertzi','provenance':'Early Devonian (Emsian), Hunsrück Slate, Germany','description':'Low, broad rhenanid placoderm with a mosaic of small armour elements, undulating pectoral margins and upward-looking eyes and mouth.','lengthMeters':.30,'modelLength':max(p[1]for p in V)-min(p[1]for p in V),'locomotion':'Swim','clips':list(CLIPS),'looping':LOOPS,'anchors':[a['name']for a in anchors],'sources':sources,'notes':notes}
open(os.path.join(OUT,ID+'.json'),'w').write(json.dumps(meta,indent=2))
report={'vertices':len(V),'fullTriangles':fulltris,'lodTriangles':lodtris,'reductionRatio':lodtris/fulltris,'bones':len(B),'clips':CLIPS,'loopSeams':seams,'boundsAtFivePhases':bounds,'weightNormalization':True,'rootStable':True,'noScaleChannels':True,'eyeDefinitions':eyeDefs,'anchorCount':3,'fullBytes':os.path.getsize(os.path.join(OUT,ID+'.glb')),'lodBytes':os.path.getsize(os.path.join(OUT,ID+'.lod1.glb'))}
open(os.path.join(HERE,'validation.json'),'w').write(json.dumps(report,indent=2))
# Studio and prescribed pose review.
world=bpy.data.worlds.new('Deep neutral studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.033,.041,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size,color in [('Key',(3,-5,7),1300,5,(1,.89,.72)),('Fill',(-5,-2,3),900,5,(.53,.78,1)),('Rim',(1,5,5),1700,4,(.70,.89,1))]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.3,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=5.8
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.45;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
cam.location=(6,-6,6.5);cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.frame_start=0;scene.frame_end=72
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,ID+'.blend'))
if os.environ.get('GEMUENDINA_EXPORT_ONLY')=='1':print('GEMUENDINA_EXPORT_READY',flush=True);sys.exit(0)
def render(path,w,h,transparent=True):
 scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.film_transparent=transparent;scene.render.filepath=path;bpy.ops.render.render(write_still=True)
render(os.path.join(OUT,ID+'.select.png'),1600,1200);render(os.path.join(OUT,ID+'.card.png'),800,600);render(os.path.join(OUT,ID+'.thumb.png'),256,192);render(os.path.join(OUT,ID+'.png'),1200,900,False)
for clip,phase,view in [('Idle',0,'side'),('Swim',.35,'side'),('Eat',.5,'front'),('Bite',.5,'side'),('Heavy',.45,'threequarter'),('Ability',.5,'front'),('Guard',.5,'threequarter'),('Dodge',.5,'side'),('Death',1,'threequarter')]:
 rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(round(CLIPS[clip]*30*phase));cam.location={'side':(9,0,2.1),'front':(0,-10,3),'threequarter':(6,-6,6.5)}[view];cam.rotation_euler=(Vector((0,.45,0))-cam.location).to_track_quat('-Z','Y').to_euler();render(os.path.join(LOCAL,clip+'-'+view+'.png'),900,675,False)
print('GEMUENDINA_COMPLETE',json.dumps(report),flush=True)
