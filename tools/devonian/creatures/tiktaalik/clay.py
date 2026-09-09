"""First independent Tiktaalik clay silhouette; not the final export."""
import bpy,math,os,sys
import numpy as np
from mathutils import Vector
from math import sin,cos,pi,exp
HERE=os.path.dirname(os.path.abspath(__file__));LOCAL=os.path.abspath(os.path.join(HERE,'../../../../../devonian-authoring/tiktaalik'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
V=[];F=[];MI=[]
def v(p):V.append(tuple(p));return len(V)-1
def face(ids,m=0):F.append(tuple(ids));MI.append(m)
def grid(rows,cols,fn,m=0,wrap=True):
 ids=[[v(fn(i,j))for j in range(cols)]for i in range(rows)]
 for i in range(rows-1):
  for j in range(cols if wrap else cols-1):face((ids[i][j],ids[i][(j+1)%cols],ids[i+1][(j+1)%cols],ids[i+1][j]),m)
 return ids
SEC=[(-2.80,.63,.025,-.015),(-2.63,.645,.15,.018),(-2.35,.68,.19,.025),(-1.9,.725,.205,.028),(-1.45,.74,.205,.035),(-1.05,.64,.25,.018),(-.68,.57,.30,0),(-.2,.61,.36,0),(.45,.585,.345,0),(1.1,.52,.31,0),(1.65,.43,.26,0),(2.25,.29,.225,0),(2.85,.19,.21,0),(3.4,.10,.18,0),(3.85,.04,.11,0),(4.2,.005,.02,0)]
def sm(t):t=max(0,min(1,t));return t*t*(3-2*t)
def section(y):
 for k in range(len(SEC)-1):
  if SEC[k][0]<=y<=SEC[k+1][0]:
   a=np.array(SEC[k]);b=np.array(SEC[k+1]);t=(y-a[0])/(b[0]-a[0]);p=np.array(SEC[max(0,k-1)]);n=np.array(SEC[min(len(SEC)-1,k+2)]);d0=(b-p)/(b[0]-p[0])*(b[0]-a[0]);d1=(n-a)/(n[0]-a[0])*(b[0]-a[0]);return ((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*d0+(-2*t**3+3*t*t)*b+(t**3-t*t)*d1)[1:]
 return SEC[-1][1:]
def surf(y,a):
 w,h,z=section(y);s=sin(a);c=cos(a);head=1-sm((y+1.35)/.55)
 yy=y+1.46*abs(c)**1.85*(1-sm((y+2.8)/1.8));x=w*c;zz=z+h*math.copysign(abs(s)**.66,s)
 # Integrated paired postfrontal relief belongs to the head, never a rim.
 zz+=.057*exp(-((y+1.64)/.23)**2)*(exp(-((x-.23)/.115)**2)+exp(-((x+.23)/.115)**2))*max(0,s)**2
 zz-=.018*exp(-((y+1.80)/.75)**2)*max(0,s)**3*exp(-(x/.16)**2)
 return (x,yy,zz)
ys=np.linspace(-2.8,4.2,180);n=96
body=grid(len(ys),n,lambda i,j:surf(ys[i],2*pi*j/n-pi/2));face(body[-1])
def oral(t,a):
 p=Vector(surf(-2.8,a));q=Vector((.63*cos(a)*(1-.88*t),p.y+(-.36-p.y)*t,-.015+(.025+.10*sin(pi*t))*sin(a)));return p.lerp(q,sm(t/.05))
oralrows=grid(36,n,lambda i,j:oral(i/35,2*pi*j/n-pi/2),1);face(reversed(oralrows[-1]),1)
# Pectoral and pelvic appendages are stout, jointed fins. Endoskeleton stays covered.
def fin(side,pelvic=False):
 if pelvic:centers=[(.36,1.42,-.14),(.64,1.67,-.23),(.83,2.05,-.27),(.88,2.43,-.27),(.84,2.65,-.24)];widths=[.23,.28,.36,.26,.008];depths=[.11,.10,.058,.018,.002]
 else:centers=[(.47,-.78,-.12),(.83,-.48,-.22),(1.08,-.12,-.29),(1.22,.32,-.30),(1.16,.63,-.26)];widths=[.26,.29,.42,.34,.01];depths=[.16,.14,.075,.024,.003]
 def param(i,j):
  t=i/48;q=t*4;k=min(3,int(q));u=q-k;p0=Vector(centers[max(0,k-1)]);p1=Vector(centers[k]);p2=Vector(centers[k+1]);p3=Vector(centers[min(4,k+2)]);c=.5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u**3);w=(1-sm(u))*widths[k]+sm(u)*widths[k+1];h=(1-sm(u))*depths[k]+sm(u)*depths[k+1];a=j*2*pi/48;c+=Vector((.84,-.54,0))*w*cos(a);c.z+=h*sin(a);c.x*=side;return c
 ids=grid(49,48,param);face(reversed(ids[0]));face(ids[-1])
for side in [-1,1]:fin(side);fin(side,True)
# Low median tail membrane, continuous thick root beneath the axial taper.
for sign in [-1,1]:
 def tail(i,j):
  y=2.60+1.65*i/64;t=j/24;z=(.18+.14*sin(pi*(y-2.6)/1.65)**.7)*sign*t;return (.004*sin(pi*t),y,z)
 grid(65,25,tail,0,False)
mesh=bpy.data.meshes.new('Tiktaalik clay');mesh.from_pydata(V,[],F);mesh.update();obj=bpy.data.objects.new('tiktaalik clay',mesh);bpy.context.collection.objects.link(obj)
for name,color in [('clay',(.26,.32,.30,1)),('oral',(.13,.085,.075,1)),('eyes',(.007,.009,.01,1))]:
 mat=bpy.data.materials.new(name);mat.diffuse_color=color;mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Roughness'].default_value=.57 if name!='eyes'else .21;mesh.materials.append(mat)
for p,mi in zip(mesh.polygons,MI):p.material_index=mi;p.use_smooth=True
bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
for side in [-1,1]:
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,location=(side*.29,-1.61,.194));eye=bpy.context.object;eye.name='deeply seated eye';eye.scale=(.113,.15,.116);eye.data.materials.append(mesh.materials[2]);bpy.ops.object.shade_smooth()
scene=bpy.context.scene;world=bpy.data.worlds.new('Studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.05,.07,.075,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4
for name,pos,power,size in [('Key',(4,-5,7),1400,5),('Fill',(-5,-1,4),950,5),('Rim',(2,6,5),1800,4)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,.5,0))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',d);bpy.context.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=8.1
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
for view,pos in [('threequarter',(7,-6,6)),('side',(10,0,1)),('dorsal',(0,.5,12)),('front',(0,-10,2))]:
 cam.location=pos;cam.rotation_euler=(Vector((0,.6,0))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=os.path.join(LOCAL,'clay-'+view+'.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,'tiktaalik-clay.blend'))
