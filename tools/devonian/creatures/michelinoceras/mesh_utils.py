def mesh(n,v,f,ma='body',bone='body',uvs=None,weights=None,sub=0):
 me=bpy.data.meshes.new(n);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.triangulate(bm,faces=[q for q in bm.faces if len(q.verts)>4]);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(n,me);S.collection.objects.link(o);o.parent=rig;me.materials.append(M[ma]);objects.append(o);uv=me.uv_layers.new(name='UVMap')
 for f in me.polygons:
  f.use_smooth=True
  for li in f.loop_indices:
   vi=me.loops[li].vertex_index;p=me.vertices[vi].co;uv.data[li].uv=uvs[vi]if uvs else(.5+p.x/2.2,(p.y+1.40)/3.65+max(0,min(1,(-p.y-1.04)/.34))*(p.z-.10)*.15)
 for face in me.polygons:
  ls=list(face.loop_indices);us=[uv.data[i].uv.x for i in ls]
  if max(us)-min(us)>.5:
   for li in ls:
    if uv.data[li].uv.x<.5:uv.data[li].uv.x+=1
 weights=weights or[{bone:1}for p in v];groups={k:o.vertex_groups.new(name=k)for k in set(k for w in weights for k in w)}
 for i,w in enumerate(weights):
  for k,val in w.items():
   if val>0:groups[k].add([i],val/sum(w.values()),'REPLACE')
 if sub:
  md=o.modifiers.new('Supported shell subdivision','SUBSURF');md.levels=sub;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=md.name)
 md=o.modifiers.new('Segmental articulation','ARMATURE');md.object=rig
 return o

def tube(n,pts,rads,ma,bone,N=10):
 vv=[];uu=[]
 for j,p in enumerate(pts):
  q=Vector(p);d=Vector(pts[min(len(pts)-1,j+1)])-Vector(pts[max(0,j-1)]);d.normalize();t=d.cross(Vector((0,0,1)))
  if t.length<.01:t=d.cross(Vector((1,0,0)))
  t.normalize();b=d.cross(t)
  if 'podomere' in n:b*=.58
  for k in range(N):vv.append(tuple(q+float(rads[j])*(t*cos(2*pi*k/N)+b*sin(2*pi*k/N))));uu.append((k/N,j/(len(pts)-1)))
 ff=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(pts)-1)for k in range(N)];ff.extend([tuple(range(N-1,-1,-1)),tuple((len(pts)-1)*N+k for k in range(N))]);return mesh(n,vv,ff,ma,bone,uu)
def oval(n,c,r,ma,bone,N=24,K=12,axes=None):
 c=Vector(c);axes=axes or[Vector((1,0,0)),Vector((0,1,0)),Vector((0,0,1))];vv=[tuple(c-axes[2]*r[2])];uu=[(.5,0)]
 for j in range(1,K):
  ph=-pi/2+pi*j/K
  for k in range(N):th=2*pi*k/N;vv.append(tuple(c+axes[0]*(r[0]*cos(ph)*cos(th))+axes[1]*(r[1]*cos(ph)*sin(th))+axes[2]*(r[2]*sin(ph))));uu.append((k/N,j/K))
 vv.append(tuple(c+axes[2]*r[2]));uu.append((.5,1));ff=[(0,1+(k+1)%N,1+k)for k in range(N)]
 for j in range(K-2):
  for k in range(N):ff.append((1+j*N+k,1+j*N+(k+1)%N,1+(j+1)*N+(k+1)%N,1+(j+1)*N+k))
 ff.extend([(len(vv)-1,1+(K-2)*N+k,1+(K-2)*N+(k+1)%N)for k in range(N)]);return mesh(n,vv,ff,ma,bone,uu)
