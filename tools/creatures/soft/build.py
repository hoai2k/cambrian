"""Original fossil-informed soft-bodied Cambrian creatures, Blender 5.2.
Usage: blender -b -t 4 --factory-startup --python tools/creatures/soft/build.py -- pikaia ...
Reproducible analytic surfaces, anatomical skinning, procedural tissue maps.
Blender source +Z up / -Y forward exports glTF +Y up / +Z forward.
"""
import bpy,bmesh,math,os,sys,json,struct
import numpy as np
from mathutils import Vector,noise
from math import sin,cos,pi,exp
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
OUT=os.path.join(ROOT,'public/assets/creatures')
AUTHOR=os.environ.get('CAMBRIAN_SOFT_AUTHOR',os.path.abspath(os.path.join(ROOT,'../expansion-authoring/soft')))
os.makedirs(AUTHOR,exist_ok=True)
BASE_CLIPS={'Idle':2.4,'Swim':2.4,'Attack':1.0,'Hit':.6,'Death':1.6,'TurnLeft':2.4,'TurnRight':2.4,'Dive':2.4,'Rise':2.4,'Bite':.5,'Heavy':1.1,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':.8,'Stagger':1.2,'Ability':1.2,'Moult':1.5}
SOURCES={
'pikaia':['https://doi.org/10.1016/j.cub.2024.05.026','https://durham-repository.worktribe.com/OutputFile/2515077'],
'nectocaris':['https://www.bristol.ac.uk/news/2025/july/ancient-squid-mystery-solved.html','https://burgess-shale.rom.on.ca/fossils/nectocaris-pteryx/'],
'ottoia':['https://burgess-shale.rom.on.ca/fossils/ottoia-prolifica/','https://doi.org/10.1111/pala.12168'],
'odontogriphus':['https://burgess-shale.rom.on.ca/fossils/odontogriphus-omalus/','https://pmc.ncbi.nlm.nih.gov/articles/PMC3441091/'],
'vetulicola':['https://pmc.ncbi.nlm.nih.gov/articles/PMC3517509/','https://www.mdpi.com/2076-3263/9/8/354']}

def normal_texture():
 n=512;y,x=np.mgrid[0:n,0:n]/n;h=np.zeros_like(x)
 for freq,amp in [(7,1),(19,.4),(43,.17),(89,.07),(173,.026)]:
  h+=amp*(np.sin(2*pi*(freq*x+3*y)+.8*np.sin(2*pi*5*y))*np.cos(2*pi*(freq*y-2*x)))
 h+=.12*np.sin(2*pi*(64*y+2*np.sin(2*pi*x)))
 dx=(np.roll(h,-1,1)-np.roll(h,1,1))*.22;dy=(np.roll(h,-1,0)-np.roll(h,1,0))*.22
 v=np.stack([-dx,-dy,np.ones_like(dx)],-1);v/=np.linalg.norm(v,axis=-1)[...,None]
 a=np.ones((n,n,4),np.float32);a[:,:,:3]=v*.5+.5
 im=bpy.data.images.new('Original tissue micro-normal',n,n);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(a.ravel());im.filepath_raw=os.path.join(AUTHOR,'tissue-normal.png');im.file_format='PNG';im.save();im.pack()
 return im

class B:
 def __init__(self,id):
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
  for a in list(bpy.data.actions):bpy.data.actions.remove(a)
  self.id=id;self.V=[];self.C=[];self.U=[];self.W=[];self.F=[];self.M=[];self.B={};self.motion=[];self.body_names=[];self.n=0
  self.bone('root',(0,0,0),(0,1,0),None)
  self.bone('body',(0,-1.8,0),(0,-1.4,0),'root')
  self.mats=[];nm=normal_texture()
  for label,rough,strength,metal in [('Living integument',.46,.54,0),('Fin membrane',.43,.24,0),('Marginal tissue',.34,.23,0),('Oral cuticle',.36,.18,0),('Eyes',.12,.025,.02),('Gill filaments',.47,.18,0)]:
   m=bpy.data.materials.new(id+' '+label);m.use_nodes=True;m.diffuse_color=(.25,.25,.25,1)
   nd=m.node_tree.nodes;lk=m.node_tree.links;bs=nd.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
   bs.inputs['Coat Weight'].default_value=.09 if label!='Eyes' else .35
   bs.inputs['Coat Roughness'].default_value=.28
   vc=nd.new('ShaderNodeVertexColor');vc.layer_name='Color';lk.new(vc.outputs['Color'],bs.inputs['Base Color'])
   tx=nd.new('ShaderNodeTexImage');tx.image=nm;norm=nd.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=strength;lk.new(tx.outputs['Color'],norm.inputs['Color']);lk.new(norm.outputs['Normal'],bs.inputs['Normal']);self.mats.append(m)
 def bone(self,n,h,t,p='body'):
  self.B[n]=(Vector(h),Vector(t),p);return n
 def v(self,p,col,w='body',uv=(0,0),mottle=True):
  p=Vector(p);c=np.array(col)
  if mottle:
   a=noise.noise_vector(p*3.8)[0];fine=noise.noise_vector(p*27)[1];spot=noise.noise_vector(p*12)[2]
   c=c*(.90+.24*a+.085*fine)
   if spot>.38:c*=.76
  self.V.append(tuple(p));self.C.append(tuple(np.clip(c,.001,.94))+(1,));self.U.append(uv);self.W.append(w if isinstance(w,dict) else {w:1});return len(self.V)-1
 def f(self,f,m=0):self.F.append(tuple(f));self.M.append(m)
 def grid(self,rows,cols,fn,m=0,wrap=True):
  ids=[[fn(i,j) for j in range(cols)]for i in range(rows)]
  for i in range(rows-1):
   for j in range(cols if wrap else cols-1):self.f((ids[i][j],ids[i][(j+1)%cols],ids[i+1][(j+1)%cols],ids[i+1][j]),m)
  return ids
 def ell(self,c,s,col,w='body',m=0,seg=24,rings=14):
  c=Vector(c)
  def fn(i,j):
   a=pi*i/rings;d=2*pi*j/seg
   return self.v(c+Vector((s[0]*sin(a)*cos(d),s[1]*sin(a)*sin(d),s[2]*cos(a))),col,w,(j/seg,i/rings))
  self.grid(rings+1,seg,fn,m)
 def tube(self,pts,radii,col,w='body',m=0,sides=8):
  pts=[Vector(p)for p in pts];rows=[]
  for i,p in enumerate(pts):
   t=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized();u=t.cross(Vector((0,0,1)))
   if u.length<.01:u=t.cross(Vector((1,0,0)))
   u.normalize();v=t.cross(u).normalized();weight=w[i] if isinstance(w,list) else w
   rows.append([self.v(p+radii[i]*(u*cos(2*pi*j/sides)+v*sin(2*pi*j/sides)),col,weight,(j/sides,i/max(1,len(pts)-1)))for j in range(sides)])
  for i in range(len(rows)-1):
   for j in range(sides):self.f((rows[i][j],rows[i][(j+1)%sides],rows[i+1][(j+1)%sides],rows[i+1][j]),m)
  self.f(reversed(rows[0]),m);self.f(rows[-1],m)
 def chain(self,start,end,n,z=0):
  self.start=start;self.end=end;self.n=n
  for i in range(n):
   y=start+(end-start)*i/n;name='body_%02d'%i
   self.bone(name,(0,y,z),(0,y+(end-start)/n,z),'body' if i==0 else self.body_names[-1]);self.body_names.append(name)
 def bw(self,y):
  t=max(0,min(self.n-1,(y-self.start)/(self.end-self.start)*self.n));i=int(t);j=min(self.n-1,i+1)
  return {self.body_names[i]:1-(t-i),self.body_names[j]:t-i} if i!=j else {self.body_names[i]:1}
 def ring(self,center,rx,rz,col,w='body',r=.012,m=2):
  c=Vector(center);pts=[c+Vector((rx*cos(2*pi*j/48),0,rz*sin(2*pi*j/48)))for j in range(49)];self.tube(pts,[r]*49,col,w,m,7)
 def headmouth(self,center,rx,rz,depth,col,w='body'):
  # A genuinely recessed oral funnel, continuous nested wall and dark lumen.
  c=Vector(center)
  def fn(i,j):
   t=i/16;a=2*pi*j/48;rr=(1-.84*t);p=c+Vector((rx*rr*cos(a),depth*t,rz*rr*sin(a)))
   shade=np.array(col)*(1-.85*t)
   return self.v(p,shade,w,(j/48,t))
  rows=self.grid(17,48,fn,3);self.f(rows[-1],3);self.ring(center,rx,rz,col,w,.018,2)
 def ribbon(self,pts,width,col,w,m=1):
  pts=[Vector(p)for p in pts]
  for side in [-1,1]:
   def fn(i,j):
    t=i/(len(pts)-1);u=-1+2*j/6;p=pts[i]+Vector((width*sin(pi*t)**.35*u,0,side*.006*(1-u*u)))
    return self.v(p,np.array(col)*(.92+.18*abs(u)),w[i] if isinstance(w,list) else w,(t,(u+1)/2))
   self.grid(len(pts),7,fn,m,False)

def pikaia(b):
 b.chain(-2.,2.5,18)
 def shape(t,a):
  taper=(.38+.62*sin(pi*t)**.45)*(1-.65*t**3)*max(.002,1-t**6)**.5;width=.125*taper;height=.34*taper
  z=height*sin(a);x=width*cos(a);y=-2+4.5*t
  if sin(a)>0:z+=.28*exp(-((t-.80)/.18)**2)*max(0,sin(pi*t))**.45*sin(a)**8
  else:z-=.07*sin(pi*max(0,(t-.12)/.88))**2*abs(sin(a))**8
  return x,y,z
 def fn(i,j):
  t=i/180;a=2*pi*j/48;x,y,z=shape(t,a)
  muscle=1-.17*(.5+.5*cos(2*pi*(t*42+.24*sin(a)-.11*sin(2*a))))**10
  dorsal=(sin(a)+1)*.5;c=np.array((.20,.43,.40))*(.74+.25*(1-dorsal))*muscle
  if sin(a)>.84:c=np.array((.20,.38,.31))*.84
  if sin(a)<-.75:c=np.array((.42,.42,.27))*.9
  return b.v((x,y,z),c,b.bw(y),(j/48,t*5))
 ids=b.grid(181,48,fn);b.f(reversed(ids[0]));b.f(ids[-1])
 # Bilobed head and paired sensory tentacles, no speculative camera eyes.
 for s in [-1,1]:
  b.ell((s*.049,-2.065,.012),(.081,.18,.145),(.28,.49,.41),'body',seg=32,rings=20)
  pts=[Vector((s*(.055+.22*t),-2.18-.49*t,.075-.20*t+.025*sin(pi*t)))for t in np.linspace(0,1,17)]
  ns=[]
  for k in range(4):
   ns.append(b.bone('sensor_%s_%d'%(s,k),pts[k*4],pts[(k+1)*4],'body' if k==0 else ns[-1]));b.motion.append((ns[-1],'sensor',k,s))
  ww=[]
  for i in range(17):
   q=min(3,i/4);k=int(q);ww.append({ns[k]:1-(q-k),ns[min(3,k+1)]:q-k}if k<3 else {ns[3]:1})
  b.tube(pts,[.026*(1-i/19)for i in range(17)],(.40,.55,.40),ww,2,10)
  # Six small paired dorsally directed branched gill tufts (2024 interpretation).
  for k in range(6):
   y=-1.88+k*.068;name=b.bone('gill_%s_%d'%(s,k),(s*.085,y,.15),(s*.17,y+.035,.38),'body_00');b.motion.append((name,'gill',k,s))
   p=Vector((s*.085,y,.17));q=p+Vector((s*.07,.01,.20-k*.008));b.tube([p,p.lerp(q,.5),q],[.012,.010,.001],(.42,.49,.28),name,5,6)
   for j in range(3):
    o=p.lerp(q,.30+.18*j);b.tube([o,o+Vector((s*.044,.032,.050))],[.005,.001],(.44,.53,.30),name,5,5)
 b.headmouth((0,-2.23,-.10),.060,.052,.07,(.36,.32,.20))
 return ['2024 reoriented anatomy: dorsally directed anterior gills, dorsal posterior fin extension, long thin ventral keel, sigmoidal myomere pigment and bilobed head. No camera eyes or fin rays added.','Palette and behavior reconstructed; posterior dorsal fin is integrated tissue rather than a separate ray-supported fish fin.']

def nectocaris(b):
 b.chain(-1.35,1.85,12)
 def shape(t,a):
  tap=(.45+.55*sin(pi*t)**.6)*(1-.70*t**3)
  return (.36*tap*cos(a),-1.35+3.2*t,.20*tap*sin(a))
 def fn(i,j):
  t=i/120;a=2*pi*j/48;p=shape(t,a);c=np.array((.38,.19,.115))*(.76+.20*(1-sin(a)))
  # Irregular auburn saddles and teal mantle edge.
  c*=.84+.16*cos(t*13*pi+.7*cos(a*3))
  if abs(cos(a))>.82:c=c*.7+np.array((.10,.27,.25))*.3
  return b.v(p,c,b.bw(p[1]),(j/48,t*3))
 ids=b.grid(121,48,fn);b.f(reversed(ids[0]));b.f(ids[-1])
 for s in [-1,1]:
  ns=[]
  for k in range(12):
   y=-1.18+k*.244;name=b.bone('fin_%s_%02d'%(s,k),(s*.19,y,0),(s*.82,y+.1,0),'body_%02d'%k);ns.append(name);b.motion.append((name,'fin',k,s))
  def finweight(t,u):
   q=min(11,t*11);k=int(q);f=q-k;weights={ns[k]:1-f,ns[min(11,k+1)]:f}if k<11 else {ns[k]:1}
   y=-1.18+2.87*t;edge=min(1,u*2);bw=b.bw(y)
   return {key:val*edge for key,val in weights.items()}|{key:val*(1-edge)for key,val in bw.items()}
  for side in [-1,1]:
   def fn(i,j):
    t=i/132;u=j/16;span=1.10*sin(pi*t)**.57*(1-.2*t)
    x=s*(.17*(1-.50*t)+span*u);y=-1.18+2.87*t+.17*sin(pi*t)*u
    z=.018+(.035*sin(t*12*pi+.5)*u*u)+side*.012*sin(pi*u)
    c=np.array((.16,.34,.31))*(.81+.19*cos(t*48*pi)*(u*.5+.4))
    c=c*(1-u*.45)+np.array((.49,.29,.13))*u*.45
    if u>.92:c=np.array((.65,.40,.16))*(.8+.2*cos(t*12*pi))
    return b.v((x,y,z),c,finweight(t,u),(t*4,u))
   b.grid(133,17,fn,1,False)
  # Fine radial fiber ribbing beneath the golden outer margin.
  for k in range(48):
   t=.025+.95*k/47;span=1.10*sin(pi*t)**.57*(1-.2*t);pts=[];ww=[]
   for u in np.linspace(.10,.95,7):
    pts.append((s*(.17*(1-.5*t)+span*u),-1.18+2.87*t+.17*sin(pi*t)*u,.035+.035*sin(t*12*pi+.5)*u*u));ww.append(finweight(t,u))
   b.tube(pts,[.0035]*7,(.26,.42,.32),ww,1,4)
  # Stalked, large camera-type eyes with raised ocular collars.
  eye=b.bone('eye_%s'%s,(s*.18,-1.42,.02),(s*.43,-1.64,.08),'body');b.motion.append((eye,'eye',0,s))
  b.tube([(s*.15,-1.39,.02),(s*.29,-1.51,.04),(s*.44,-1.62,.08)],[.095,.075,.12],(.28,.24,.16),eye,0,16)
  b.ell((s*.445,-1.63,.083),(.165,.17,.155),(.017,.026,.022),eye,4,48,28)
  b.ell((s*.49,-1.70,.12),(.094,.088,.080),(.035,.055,.034),eye,4,32,18)
  # Exactly two long flexible sensory/capture tentacles; no suckers or siphon.
  pts=[Vector((s*(.13+.54*t+.10*sin(pi*t*1.2)),-1.68-1.78*t,.01-.20*sin(pi*t*.85)))for t in np.linspace(0,1,49)]
  names=[]
  for k in range(8):
   n=b.bone('tentacle_%s_%02d'%(s,k),pts[k*6],pts[(k+1)*6],'body'if k==0 else names[-1]);names.append(n);b.motion.append((n,'tentacle',k,s))
  ww=[]
  for i in range(49):
   q=min(7,i/6);k=int(q);ww.append({names[k]:1-(q-k),names[min(7,k+1)]:q-k}if k<7 else {names[k]:1})
  b.tube(pts,[.074*(1-i/51)**.80+.001 for i in range(49)],(.52,.29,.15),ww,0,14)
 b.ell((0,-1.45,0),(.24,.38,.18),(.40,.22,.11),'body',seg=40,rings=24)
 b.headmouth((0,-1.785,-.028),.072,.070,.12,(.35,.21,.10))
 return ['Broad continuous paired fins with 24 fin-control bones and longitudinal fiber detail; two long tentacles; prominent stalked camera eyes.','Nectocaridid interpretation follows 2025 chaetognath research. No squid siphon, jet propulsion, suckers, or speculative beak. Capture movements are game interpretation.']

def ottoia(b):
 b.chain(-1.45,2.05,16)
 def form(t,a):
  tap=(.67+.33*sin(pi*t)**.35)*(1-.64*t**5);r=.43*tap*(1+.038*cos(t*2*pi*74))
  return r*cos(a),-1.45+3.5*t,r*.86*sin(a)+.04*sin(pi*t)
 def fn(i,j):
  t=i/444;a=2*pi*j/48;p=form(t,a);c=np.array((.45,.27,.145))*(.78+.18*(1-sin(a)))*(.91+.09*cos(t*2*pi*74))
  return b.v(p,c,b.bw(p[1]),(j/48,t*6))
 ids=b.grid(445,48,fn);b.f(ids[-1])
 # Tapered telescoping introvert with 28 longitudinal hook rows.
 names=[]
 for k in range(4):
  n=b.bone('introvert_%02d'%k,(0,-1.42-k*.18,0),(0,-1.60-k*.18,0),'body'if k==0 else names[-1]);names.append(n);b.motion.append((n,'introvert',k,1))
 def iw(t):
  q=min(3,t*4);k=int(q);return {names[k]:1-(q-k),names[min(3,k+1)]:q-k}if k<3 else {names[k]:1}
 def fn(i,j):
  t=i/72;a=j*2*pi/56;r=.30*(1-.25*t)*(1+.035*cos(t*14*pi));p=(r*cos(a),-1.40-.79*t,r*sin(a))
  return b.v(p,np.array((.50,.33,.19))*(.91+.09*cos(t*14*pi)),iw(t),(j/56,t*2))
 b.grid(73,56,fn)
 for row in range(28):
  a=2*pi*row/28
  for k in range(8):
   t=.08+.108*k;r=.303*(1-.25*t);y=-1.40-.79*t;p=Vector((r*cos(a),y,r*sin(a)));n=Vector((cos(a),0,sin(a)))
   # Curved backward hook and smaller paired spines; distinct sclerotized tips.
   length=.067*(1-.23*t);pts=[p,p+n*length*.65+Vector((0,-.022,0)),p+n*length+Vector((0,.012,0)),p+n*length*.65+Vector((0,.055,0))]
   b.tube(pts,[.013,.012,.007,.001],(.32,.18,.07),iw(t),3,7)
 b.headmouth((0,-2.20,0),.224,.224,.23,(.46,.28,.12),names[-1])
 for row in range(20):
  a=row*2*pi/20;p=Vector((.167*cos(a),-2.18,.167*sin(a)))
  b.tube([p,p+Vector((-.058*cos(a),-.050,-.058*sin(a))),p+Vector((-.091*cos(a),-.042,-.091*sin(a)))],[.022,.014,.001],(.70,.50,.25),names[-1],3,8)
 # Two posterior rings each bearing four large holdfast hooks.
 for ring in range(2):
  t=.85+ring*.065;y=-1.45+3.5*t
  for j in range(4):
   a=j*pi/2+pi/4;x,_,z=form(t,a);p=Vector((x,y,z));n=Vector((cos(a),0,sin(a)));b.tube([p,p+n*.12+Vector((0,.04,0)),p+n*.14+Vector((0,-.035,0))],[.035,.025,.001],(.32,.19,.085),b.bw(y),3,9)
 b.tube([(0,1.92,0),(0,2.10,.01),(0,2.26,.015)],[.14,.09,.025],(.40,.24,.12),b.body_names[-1],0,18)
 return ['Annulated muscular trunk; mobile eversible introvert with 28 rows of backward-curved hooks and an actual recessed toothed oral funnel; two rings of four posterior hooks.','Burrowing and extension use bone rotations and introvert translations without animated scale. Body never becomes permanently rooted to a burrow.']

def odontogriphus(b):
 b.chain(-1.85,1.85,14)
 # Continuous smooth ovoid dorsal integument, sculpted marginal fold, broad foot.
 def top(i,j):
  t=i/140;a=2*pi*j/64;y=-1.85+3.7*t;wid=.72*sin(pi*t)**.45
  p=(wid*cos(a),y,.15*sin(a)*sin(pi*t)**.30+.025)
  c=np.array((.28,.37,.23))*(.78+.20*(1-sin(a)))
  if abs(cos(a))>.90:c=np.array((.55,.34,.17))*(.90+.07*cos(t*11*pi))
  c*=.9+.1*cos(t*2*pi+2*cos(a))
  return b.v(p,c,b.bw(y),(j/64,t*4))
 b.grid(141,64,top)
 # A discrete muscular foot below the mantle, subtly transverse muscle texture.
 def foot(i,j):
  t=i/112;a=2*pi*j/48;y=-1.58+3.29*t;w=.55*sin(pi*t)**.30
  z=-.105+.083*sin(a);c=np.array((.42,.31,.15))*(.9+.09*cos(t*37*pi))
  return b.v((w*cos(a),y,z),c,b.bw(y),(j/48,t*4))
 b.grid(113,48,foot)
 # Many fine lamellate gills tucked into the lateral mantle groove.
 for s in [-1,1]:
  for k in range(46):
   t=.095+k*.82/45;y=-1.85+3.7*t;w=.72*sin(pi*t)**.45
   name=b.bone('gill_%s_%02d'%(s,k),(s*w*.76,y,-.09),(s*w*.99,y+.025,-.13),b.body_names[min(13,int(t*14))]);b.motion.append((name,'gill',k,s))
   o=Vector((s*w*.74,y,-.08));q=Vector((s*w*.995,y+.055,-.11));b.tube([o,o.lerp(q,.5)+Vector((0,0,-.034)),q],[.016,.024,.002],(.48,.30,.16),name,5,6)
   for j in range(3):
    p=o.lerp(q,.3+j*.18);b.tube([p,p+Vector((s*.02,.033,-.02))],[.006,.001],(.59,.39,.21),name,5,5)
 # Small ventral radula with two tooth rows, deliberately no invented face/eyes.
 mouth=b.bone('radula',(0,-1.58,-.12),(0,-1.76,-.13),'body');b.motion.append((mouth,'radula',0,1))
 b.headmouth((0,-1.77,-.075),.12,.045,.08,(.39,.24,.12),mouth)
 for k in range(2):
  for j in range(13):
   x=(j-6)*.015;y=-1.785+k*.032+.025*abs(j-6)/6
   b.tube([(x,y,-.102),(x,y-.018,-.13),(x,y-.039,-.121)],[.008,.006,.001],(.71,.54,.29),mouth,3,5)
 return ['Unarmored, smooth dorsum; flattened oval outline; muscular crawling foot; fine marginal gills; small ventral radula with two tooth rows. No invented eyes, tentacles, spikes, or dorsal plates.','Foot peristalsis and traveling mantle bends supply motion. Surface pigmentation and combat shoves are reconstructed for readable gameplay.']

def vetulicola(b):
 b.chain(.40,2.80,7,z=.19)
 # Laterally compressed, angular pharyngeal chamber with pointed dorsal keel.
 def chamber(i,j):
  t=i/100;a=2*pi*j/64;y=-2.05+2.68*t
  profile=(.41+.59*sin(pi*t)**.45);x=.42*profile*cos(a)
  z=.60*profile*sin(a)-.04
  z+=.25*exp(-((t-.55)/.25)**2)*max(0,sin(a))**14
  z-=.16*sin(pi*t)**.8*max(0,-sin(a))**12
  c=np.array((.38,.26,.11))*(.85+.12*cos(t*2*pi*25))
  if abs(sin(a))>.7:c=c*.6+np.array((.16,.30,.27))*.4
  # Recessed lateral groove and five oval gill pouches, sculpted into skin.
  for s in [-1,1]:
   if s*cos(a)>.75:
    groove=exp(-((z+.06)/.065)**2);x-=s*.035*groove;c*=1-.34*groove
    for k in range(5):
     cy=-1.63+k*.43;d=((y-cy)/.115)**2+((z+.055)/.060)**2
     if d<5:
      q=exp(-d*1.8);x-=s*.105*q;c=c*(1-q)+np.array((.045,.06,.028))*q
  return b.v((x,y,z),c,'body',(j/64,t*4))
 ids=b.grid(101,64,chamber);b.f(ids[-1])
 for s in [-1,1]:
  # Five separate protective lappets and fringed gill openings per side.
  for k in range(5):
   y=-1.63+k*.43;t=(y+2.05)/2.68;x=s*.42*(.41+.59*sin(pi*t)**.45)
   name=b.bone('pouch_%s_%d'%(s,k),(x,y-.14,-.03),(x,y+.13,-.03),'body');b.motion.append((name,'pouch',k,s))
   for upper in [-1,1]:
    pts=[(x+s*.010,y-.14+u*.30,-.055+upper*.066*sin(pi*u))for u in np.linspace(0,1,18)]
    b.tube(pts,[.012]*18,(.52,.34,.13),name,2,6)
   for j in range(9):
    yy=y-.09+j*.022;b.tube([(x-s*.010,yy,-.052),(x+s*.003,yy+.012,-.09)],[.006,.002],(.55,.35,.16),name,5,5)
  pts=[]
  for t in np.linspace(.02,.97,60):
   y=-2.05+2.68*t;x=s*.42*(.41+.59*sin(pi*t)**.45);pts.append((x,y,.060))
  b.tube(pts,[.009]*60,(.46,.34,.16),'body',2,6)
 b.headmouth((0,-2.065,-.045),.17,.25,.24,(.44,.28,.12))
 # Seven tail segments separated by flexible, deeply grooved annuli; no legs.
 def tail(i,j):
  t=i/168;a=2*pi*j/40;y=.40+2.40*t;segment=sin(pi*(t*7%1))**.3
  w=(.205*(1-.77*t)+.005)*(.85+.15*segment);h=.31*(1-.54*t)*(.80+.2*segment)
  z=.19+.16*sin(pi*t*.9)+h*sin(a);c=np.array((.28,.38,.29))*(.72+.28*segment)
  if abs(cos(a))<.2:c=np.array((.49,.32,.12))*(.7+.3*segment)
  return b.v((w*cos(a),y,z),c,b.bw(y),(j/40,t*4))
 ids=b.grid(169,40,tail);b.f(ids[-1])
 for k in range(7):
  t=(k+.05)/7;y=.40+2.4*t;h=.31*(1-.54*t);w=.205*(1-.77*t)+.005;z=.19+.16*sin(pi*t*.9)
  b.ring((0,y,z),w*.94,h*.94,(.49,.33,.14),b.bw(y),.012,2)
 return ['Bipartite body: laterally compressed angular anterior chamber with dorsal point and ventral keel, five paired recessed pharyngeal openings, seven-segment swimming tail. No eyes, limbs, or antennae.','Gill pumping is shown as small lappet motions; chamber remains firm. Filter feeding and body-shove combat are game interpretations.']

def reset(rig):
 for p in rig.pose.bones:p.location=(0,0,0);p.rotation_euler=(0,0,0);p.scale=(1,1,1)

def animate(b,rig,obj):
 scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
 for p in rig.pose.bones:p.rotation_mode='XYZ'
 clips=BASE_CLIPS.copy()
 if b.id in ('ottoia','odontogriphus'):clips['Crawl']=clips.pop('Swim');clips['Idle']=clips['Crawl']=2.0
 if b.id=='nectocaris':clips['Grab']=.9
 b.clips=clips;b.seams={};b.validation={}
 loops={'Idle','Swim','Crawl','TurnLeft','TurnRight','Dive','Rise','Guard','Eat','Ability','Moult'}
 for clip,duration in clips.items():
  reset(rig);action=bpy.data.actions.new(clip);action.use_fake_user=True;rig.animation_data.action=action
  # Export full final sample; rescale only Parry time inputs to exact .35s afterward.
  last=math.ceil(duration*30);frames=list(range(last+1));first=None
  for f in frames:
   u=f/last;p=2*pi*u;reset(rig);pb=rig.pose.bones
   wave=lambda phase=0,freq=1:sin(p*freq-phase)-sin(-phase)
   env=sin(pi*u)**2
   attack=clip in ('Attack','Bite','Heavy');wind=0;strike=0
   if attack:
    wind=sin(pi*min(1,u/.37))**2 if u<.37 else 0
    strike=sin(pi*max(0,min(1,(u-.34)/.48)))**2
    if clip=='Bite':strike=sin(pi*min(1,u/.76))**2;wind=0
   hit=env*exp(-u*2) if clip=='Hit' else 0
   stagger=env*(.72+.28*sin(p*3)) if clip=='Stagger' else 0
   dodge=env if clip=='Dodge' else 0;parry=env if clip=='Parry' else 0
   death=u*u*(3-2*u) if clip=='Death' else 0
   moving=clip in ('Swim','Crawl','TurnLeft','TurnRight','Dive','Rise')
   energy=1 if moving else .27
   if clip not in loops:energy*=env
   if clip=='Death':energy=(1-death)*env*.25
   if clip in ('Guard','Eat','Ability'):energy=.18
   if clip=='Moult':energy=.7
   for i,name in enumerate(b.body_names):
    q=pb[name];t=i/max(1,b.n-1)
    if b.id=='pikaia':
     q.rotation_euler.z=.10*energy*wave(i*.48)
     q.rotation_euler.x=.014*energy*wave(i*.37)
     if clip=='Ability':q.rotation_euler.z+=.11*wave(i*.52,2)
     q.rotation_euler.z+=(.065*wind-.12*strike)*exp(-t*3)+.19*dodge*sin(t*pi+.4)
    elif b.id=='nectocaris':
     q.rotation_euler.z=.012*energy*wave(i*.4)
     q.rotation_euler.x=.008*energy*wave(i*.3)+(.038*wind-.048*strike)*exp(-t*3)
     q.rotation_euler.z+=.09*dodge*sin(pi*t)
    elif b.id=='ottoia':
     q.rotation_euler.z=.037*energy*wave(i*.37)
     q.rotation_euler.x=.014*energy*wave(i*.65)
     q.location.y=.013*energy*wave(i*.8)
     q.rotation_euler.x+=(.032*wind-.033*strike)*exp(-t*3)
     q.rotation_euler.z+=.10*dodge*sin(t*pi)
     if clip=='Ability':
      q.rotation_euler.x+=.029+.012*wave(i*.38)
      q.rotation_euler.z+=.046+.009*wave(i*.33)
    elif b.id=='odontogriphus':
     q.rotation_euler.x=.021*energy*wave(i*.76)
     q.location.y=.008*energy*wave(i*.76)
     q.rotation_euler.z=.009*energy*wave(i*.42)
     q.rotation_euler.x+=(.08*wind-.07*strike)*exp(-t*4)
     q.rotation_euler.z+=.04*dodge*sin(t*pi)
     if clip=='Ability':q.rotation_euler.x+=.028*wave(i*.75);q.location.y+=.013*wave(i*.75)
    elif b.id=='vetulicola':
     q.rotation_euler.z=.094*energy*wave(i*.52)
     q.rotation_euler.x=.022*energy*wave(i*.4)
     q.rotation_euler.z+=.19*dodge*sin(t*pi)+.06*strike*sin(t*pi)
     if clip=='Ability':q.rotation_euler.z+=.043*wave(i*.52,2)
    if clip in ('TurnLeft','TurnRight'):q.rotation_euler.z+=(-1 if clip=='TurnLeft'else 1)*.055*env
    if clip in ('Dive','Rise'):q.rotation_euler.x+=(-1 if clip=='Dive'else 1)*.036*env
    if clip=='Guard':q.rotation_euler.z+=.018*sin(i*.3);q.rotation_euler.x+=.018
    if clip=='Eat':q.rotation_euler.x+=(-.035+.014*wave(i*.3,2))*exp(-t*5)
    if clip=='Moult':q.rotation_euler.x+=.028*wave(i*.38,3)
    q.rotation_euler.z+=.13*hit*sin(i*.43+.6)+.12*stagger*sin(i*.55+.4)+.07*parry*exp(-t*2)
    q.rotation_euler.x+=.04*stagger*sin(i*.61)+.025*death
    q.rotation_euler.z+=.070*death*(.6+.4*sin(i*.32))
   for name,kind,i,s in b.motion:
    q=pb[name]
    if kind=='fin':
     q.rotation_euler.x=.29*energy*wave(i*.43)
     q.rotation_euler.y=.045*energy*wave(i*.43+.5)
     q.rotation_euler.x+=.16*wind-.23*strike+s*.50*dodge+.35*parry
     if clip=='Guard':q.rotation_euler.x+=.35
     if clip=='Ability':q.rotation_euler.x+=.13*wave(i*.43,2)
     q.rotation_euler.x-=.6*death
    elif kind=='tentacle':
     q.rotation_euler.z=s*.04*energy*wave(i*.4+s*.3)
     q.rotation_euler.x=.04*energy*wave(i*.33)
     q.rotation_euler.z+=s*(.20*wind-.13*strike)
     q.rotation_euler.x+=(.12*wind-.07*strike)
     if clip=='Guard':q.rotation_euler.z-=s*.18;q.rotation_euler.x+=.065
     if clip in ('Eat','Ability'):
      q.rotation_euler.z-=s*(.09+.04*wave(i*.4+s*.5));q.rotation_euler.x+=.045*wave(i*.36,2)
     if clip=='Grab':
      q.rotation_euler.z-=s*.19*env;q.rotation_euler.x+=.17*env*(.5+.5*sin(pi*u))
     q.rotation_euler.z+=s*.16*dodge+.12*parry*sin(i*.4)
     q.rotation_euler.x+=.14*death+.13*stagger*sin(i*.8)
    elif kind=='sensor':
     q.rotation_euler.z=s*.07*energy*wave(i*.4)
     q.rotation_euler.x=.06*energy*wave(i*.6)
     q.rotation_euler.x+=.16*wind-.13*strike+.20*death+.08*stagger
    elif kind=='eye':
     q.rotation_euler.z=s*.09*energy*wave(s*.5)
     q.rotation_euler.y=.05*energy*wave(.3)+s*.13*stagger
    elif kind=='gill':
     q.rotation_euler.y=s*.05*energy*wave(i*.31)
     q.rotation_euler.x=.032*energy*wave(i*.29)
     if b.id=='odontogriphus' and clip=='Ability':q.rotation_euler.x+=.055*wave(i*.24,2)
     q.rotation_euler.y+=s*.08*death
    elif kind=='introvert':
     q.rotation_euler.x=.009*energy*wave(i*.3)
     q.location.y=.015*energy*wave(i*.6)-.048*wind+.082*strike
     if clip=='Guard':q.location.y=-.060
     if clip=='Eat':q.location.y=.025+.022*wave(i*.35,2)
     if clip=='Ability':q.location.y=-.045+.042*(.5+.5*cos(p))**6;q.rotation_euler.x+=.05
     q.location.y-=.06*hit+.03*stagger+.045*death
    elif kind=='radula':
     q.rotation_euler.x=.04*energy*wave(0,2)-.12*strike
     q.location.y=.016*strike
     if clip=='Eat':q.location.y=.025*wave(0,2);q.rotation_euler.x=-.04+.07*wave(.1,2)
    elif kind=='pouch':
     q.rotation_euler.x=.012*energy*wave(i*.4)
     if clip in ('Eat','Ability'):q.rotation_euler.x+=.035*wave(i*.35,2)
    q.rotation_euler.z+=.07*hit*sin(i+.3)+.07*stagger*sin(i*.7)
   hub=pb['body'];hub.rotation_euler.x=.012*energy*wave()+.065*wind-.075*strike+.14*hit+.19*stagger
   hub.rotation_euler.y=-.22*dodge+.20*parry+.22*stagger+.95*death
   hub.location.z=-.15*death
   if b.id=='odontogriphus':hub.location.z-=.025 if clip in ('Guard','Ability') else 0
   if b.id=='ottoia'and clip=='Ability':hub.rotation_euler.x+=.11
   values=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb])
   if first is None:first=values.copy()
   if f==last:b.seams[clip]=float(np.abs(values-first).max())
   for q in pb:
    if q.name=='root':continue
    q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body' or q.name.startswith(('introvert_','body_')) or q.name=='radula':q.keyframe_insert('location',frame=f)
  # Sample actual evaluated, skinned mesh at several phases to catch rig errors.
  extents=[]
  for frac in [.0,.25,.5,.75,1.]:
   scene.frame_set(int(last*frac),subframe=last*frac%1);dg=bpy.context.evaluated_depsgraph_get();ev=obj.evaluated_get(dg);me=ev.to_mesh();co=np.array([tuple(v.co)for v in me.vertices]);extents.append([co.min(0).tolist(),co.max(0).tolist()]);assert np.isfinite(co).all();ev.to_mesh_clear()
  b.validation[clip]={'finite':True,'samples':5,'maxDimension':max(max(np.array(e[1])-np.array(e[0]))for e in extents)}
  rig.animation_data.action=None
  if clip in loops:assert b.seams[clip]<1e-5,(b.id,clip,b.seams[clip])
  elif clip!='Death':assert b.seams[clip]<1e-5,(b.id,clip,b.seams[clip])
 reset(rig);scene.frame_set(0)

def export_parts(b,obj,rig,lod=False):
 bpy.ops.object.select_all(action='DESELECT')
 temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);temp.select_set(True);bpy.context.view_layer.objects.active=temp
 if lod:
  mod=temp.modifiers.get('Anatomical skin')
  # Apply decimation before skinning, preserving weights for the same animation rig.
  dc=temp.modifiers.new('True LOD triangle reduction','DECIMATE');dc.ratio=.38;dc.use_collapse_triangulate=True
  bpy.ops.object.modifier_move_up(modifier=dc.name);bpy.ops.object.modifier_apply(modifier=dc.name)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
 triangles=0
 for part in parts:
  bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=b.id+' '+part.data.materials[0].name
  triangles+=sum(len(p.vertices)-2 for p in part.data.polygons)
 rig.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(OUT,b.id+('.lod1' if lod else '')+'.glb')
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True)
 clean_export(path,b.clips)
 for part in parts:
  data=part.data;bpy.data.objects.remove(part,do_unlink=True);bpy.data.meshes.remove(data)
 return path,triangles

def clean_export(path,clips):
 # Blender force sampling includes redundant constant scale and root channels.
 raw=open(path,'rb').read();jl=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jl]);binary=bytearray(raw[28+jl:]);root={i for i,n in enumerate(g['nodes'])if n.get('name')=='root'}
 def arr(ai):
  ac=g['accessors'][ai];bv=g['bufferViews'][ac['bufferView']];w={'SCALAR':1,'VEC3':3,'VEC4':4}[ac['type']];off=bv.get('byteOffset',0)+ac.get('byteOffset',0);stride=bv.get('byteStride',w*4)
  return np.ndarray((ac['count'],w),dtype='<f4',buffer=binary,offset=off,strides=(stride,4)).copy()
 for a in g['animations']:
  channels=[]
  for c in a['channels']:
   if c['target']['path']=='scale' or c['target']['node']in root:
    v=arr(a['samplers'][c['sampler']]['output']);assert np.max(np.abs(v-v[0]))<1e-5,(a['name'],c)
   else:channels.append(c)
  a['channels']=channels
  maximum=max(float(arr(s['input'])[-1,0])for s in a['samplers']);duration=clips[a['name']]
  if abs(maximum-duration)>1e-5:
   repl={}
   for sampler in a['samplers']:
    old=sampler['input']
    if old not in repl:
     values=arr(old)*(duration/maximum);pad=(-len(binary))%4;binary.extend(b'\0'*pad);off=len(binary);encoded=values.astype('<f4').tobytes();binary.extend(encoded)
     bv=len(g['bufferViews']);g['bufferViews'].append({'buffer':0,'byteOffset':off,'byteLength':len(encoded)})
     ac=len(g['accessors']);g['accessors'].append({'bufferView':bv,'componentType':5126,'count':len(values),'type':'SCALAR','min':[float(values.min())],'max':[float(values.max())]});repl[old]=ac
    sampler['input']=repl[old]
 g['buffers'][0]['byteLength']=len(binary);js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary.extend(b'\0'*((-len(binary))%4))
 data=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary
 open(path,'wb').write(data)

def glbcheck(path,clips):
 raw=open(path,'rb').read();jl=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jl]);names=[a['name']for a in g.get('animations',[])]
 assert set(clips)<=set(names),(path,names)
 assert len(g.get('skins',[]))>0
 assert all('JOINTS_0'in p['attributes'] and 'WEIGHTS_0'in p['attributes']and 'COLOR_0'in p['attributes']for m in g['meshes']for p in m['primitives'])
 assert not any(c['target']['path']=='scale'for a in g['animations']for c in a['channels'])
 rootnodes={i for i,n in enumerate(g['nodes'])if n.get('name')=='root'}
 assert not any(c['target']['node']in rootnodes for a in g['animations']for c in a['channels'])
 binstart=28+jl;statistics={}
 for mi,m in enumerate(g.get('materials',[])):
  values=[]
  for me in g['meshes']:
   for p in me['primitives']:
    if p.get('material')!=mi:continue
    ac=g['accessors'][p['attributes']['COLOR_0']];bv=g['bufferViews'][ac['bufferView']];off=binstart+bv.get('byteOffset',0)+ac.get('byteOffset',0);ct=ac['componentType'];dt={5126:'<f4',5123:'<u2',5121:'u1'}[ct];width=4 if ac['type']=='VEC4'else 3;stride=bv.get('byteStride',np.dtype(dt).itemsize*width)
    arr=np.ndarray((ac['count'],width),dtype=dt,buffer=raw,offset=off,strides=(stride,np.dtype(dt).itemsize)).astype(float)
    if ct!=5126:arr/=65535 if ct==5123 else 255
    values.append(arr[:,:3])
  a=np.concatenate(values);assert a.mean()<.94;statistics[m['name']]={'min':float(a.min()),'max':float(a.max()),'mean':float(a.mean())}
 return {'bytes':len(raw),'clips':names,'materials':statistics,'rootStatic':True,'noScaleAnimation':True}

def finish(b,notes):
 mesh=bpy.data.meshes.new(b.id+' sculpted anatomy');mesh.from_pydata(b.V,[],b.F);mesh.update();obj=bpy.data.objects.new(b.id,mesh);bpy.context.collection.objects.link(obj)
 for mat in b.mats:mesh.materials.append(mat)
 for p,m in zip(mesh.polygons,b.M):p.material_index=m;p.use_smooth=True
 col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(b.C,np.float32).ravel())
 uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.array([b.U[l.vertex_index]for l in mesh.loops],np.float32).ravel())
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(mesh);bm.free();mesh.update()
 arm=bpy.data.armatures.new(b.id+' anatomical rig');rig=bpy.data.objects.new(b.id+'_rig',arm);bpy.context.collection.objects.link(rig)
 obj.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for name,(h,t,parent) in b.B.items():
  bone=arm.edit_bones.new(name);bone.head=h;bone.tail=t
  if parent:bone.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');groups={n:obj.vertex_groups.new(name=n)for n in b.B};buckets={}
 for i,w in enumerate(b.W):
  total=sum(w.values());assert abs(total-1)<1e-4,(b.id,w,total)
  for name,value in w.items():
   if value>0:buckets.setdefault((name,round(value,5)),[]).append(i)
 for (name,value),inds in buckets.items():groups[name].add(inds,value,'REPLACE')
 mod=obj.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;obj.parent=rig;rig.show_in_front=True;arm.display_type='STICK'
 animate(b,rig,obj)
 path,tri=export_parts(b,obj,rig,False);check=glbcheck(path,b.clips)
 path1,tri1=export_parts(b,obj,rig,True);check1=glbcheck(path1,b.clips);assert tri1<tri*.55
 scene=bpy.context.scene;world=bpy.data.worlds.new('Museum specimen lighting');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.055,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
 for name,pos,power,size,color in [('Warm key',(1,-4,6),820,4,(1,.88,.73)),('Cool fill',(-4,-1,3),640,4,(.58,.80,1)),('Edge',(2,4,4),1150,3,(.66,.89,1))]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata);bpy.context.collection.objects.link(cam);scene.camera=cam
 cam.location=(6,-4.5,2.8)if b.id in ('pikaia','vetulicola')else (6,-5.6,5.0)
 look=Vector((0,-.65 if b.id=='nectocaris'else -.1,0));cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=5.9 if b.id=='nectocaris'else 5.0
 scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True;scene.render.resolution_x=1120;scene.render.resolution_y=840;scene.render.resolution_percentage=100
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-.45;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.frame_start=0;scene.frame_end=72
 rig.animation_data.action=bpy.data.actions['Swim'if 'Swim'in b.clips else 'Crawl'];scene.frame_set(12)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(AUTHOR,b.id+'.blend'))
 scene.render.filepath=os.path.join(OUT,b.id+'.png');bpy.ops.render.render(write_still=True)
 scene.render.resolution_x=768;scene.render.resolution_y=768;camdata.ortho_scale*=1.10;scene.render.filepath=os.path.join(OUT,b.id+'.card.png');bpy.ops.render.render(write_still=True)
 co=np.array(b.V)
 report={'id':b.id,'sourceOrientation':'Blender +Z up, -Y anterior; glTF +Y up, +Z anterior','boundsBlender':{'min':co.min(0).tolist(),'max':co.max(0).tolist()},'triangles':tri,'lodTriangles':tri1,'vertices':len(b.V),'bones':len(b.B),'durations':b.clips,'clipFrames':{k:v*30 for k,v in b.clips.items()},'scientificNotes':notes,'sources':SOURCES[b.id],'validation':{'full':check,'lod':check1,'evaluatedSkin':b.validation,'endpointMaxRadiansOrUnits':b.seams,'renderInspected':False},'sourceBlend':os.path.join(AUTHOR,b.id+'.blend')}
 open(os.path.join(AUTHOR,b.id+'.report.json'),'w').write(json.dumps(report,indent=2))
 print('SOFT_REPORT '+json.dumps(report),flush=True)

ids=sys.argv[sys.argv.index('--')+1:]if '--'in sys.argv else ['pikaia','nectocaris','ottoia','odontogriphus','vetulicola']
for id in ids:
 b=B(id);notes=globals()[id](b);finish(b,notes)
