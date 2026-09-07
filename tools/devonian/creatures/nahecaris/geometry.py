"""Species-neutral mesh/UV/skinning helpers, copied without executing another builder."""
def mesh(name,v,f,mat,bone='body',weights=None,uv=None):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();o=bpy.data.objects.new(name,me);s.collection.objects.link(o);me.materials.append(M[mat]);objects.append(o)
 for p in me.polygons:p.use_smooth=True
 col=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for d in col.data:d.color=(*M[mat].diffuse_color[:3],1)
 layer=me.uv_layers.new(name='UVMap')
 for l in me.loops:layer.data[l.index].uv=uv[l.vertex_index]if uv else(v[l.vertex_index][0],v[l.vertex_index][1])
 weights=weights or[{bone:1}for _ in v]
 for bn in set(k for w in weights for k in w):
  g=o.vertex_groups.new(name=bn)
  for i,w in enumerate(weights):
   if w.get(bn,0)>0:g.add([i],float(w[bn]/sum(w.values())),'REPLACE')
 mod=o.modifiers.new('Anatomical articulation','ARMATURE');mod.object=rig;o.parent=rig;return o

def interp(rows,t):
 k=max(0,min(len(rows)-2,int(np.searchsorted([a[0]for a in rows],t))-1));a=np.array(rows[k]);b=np.array(rows[k+1]);q=np.clip((t-a[0])/(b[0]-a[0]),0,1);pre=np.array(rows[max(0,k-1)]);post=np.array(rows[min(len(rows)-1,k+2)]);d0=(b-pre)/(b[0]-pre[0])*(b[0]-a[0]);d1=(post-a)/(post[0]-a[0])*(b[0]-a[0]);return((2*q**3-3*q*q+1)*a+(q**3-2*q*q+q)*d0+(-2*q**3+3*q*q)*b+(q**3-q*q)*d1)[1:]

def loft(name,rows,mat,bone='body',ny=40,na=48,pointfn=None):
 vv=[];ff=[];uv=[]
 for j in range(ny):
  y=rows[0][0]+(rows[-1][0]-rows[0][0])*j/(ny-1);w,h,z=interp(rows,y)
  for k in range(na+1):
   a=2*pi*k/na;p=(w*cos(a),y,z+h*sin(a))if not pointfn else pointfn(y,a);vv.append(tuple(p));uv.append((j/(ny-1),k/na))
 for j in range(ny-1):
  for k in range(na):a=j*(na+1)+k;ff.append((a,a+1,a+na+2,a+na+1))
 ff.extend([tuple(reversed(range(na+1))),tuple((ny-1)*(na+1)+k for k in range(na+1))]);return mesh(name,vv,ff,mat,bone,uv=uv)

def tube(name,points,radii,mat,bone,flat=1,n=14,steps=18):
 pts=[Vector(p)for p in points];vv=[];ff=[];uv=[]
 for j in range(steps):
  t=j/(steps-1);u=t*(len(pts)-1);k=min(len(pts)-2,int(u));q=u-k;c=pts[k].lerp(pts[k+1],q);direction=(pts[k+1]-pts[k]).normalized();side=direction.cross(Vector((0,0,1))).normalized();normal=side.cross(direction).normalized();rr=float(np.interp(t,np.linspace(0,1,len(radii)),radii))
  for a in range(n+1):ang=2*pi*a/n;vv.append(tuple(c+side*rr*cos(ang)+normal*rr*flat*sin(ang)));uv.append((t,a/n))
 for j in range(steps-1):
  for k in range(n):a=j*(n+1)+k;ff.append((a,a+1,a+n+2,a+n+1))
 ff.extend([tuple(reversed(range(n+1))),tuple((steps-1)*(n+1)+k for k in range(n+1))]);return mesh(name,vv,ff,mat,bone,uv=uv)

def podomere(name,a,b,ra,rb,bone,mat='legs',flat=.8):
 a=Vector(a);b=Vector(b);return tube(name,[a,a.lerp(b,.15),a.lerp(b,.84),b],[ra*.79,ra,rb,rb*.78],mat,bone,flat,n=22,steps=20)
