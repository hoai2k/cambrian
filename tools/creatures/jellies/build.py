"""Original fossil-informed jellies and radiodonts, authored for Blender 5.x.
Run from the repository root: Blender -b -t 4 --python tools/creatures/jellies/build.py
Geometry uses Z up, anterior -Y; glTF exports Y up, anterior +Z.
"""
import bpy, bmesh, math, random, os, sys, json, struct
import numpy as np
from mathutils import Vector, noise
from math import sin, cos, pi
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
OUT=os.path.join(ROOT,'public/assets/creatures');os.makedirs(OUT,exist_ok=True)
LOCAL=os.environ.get('CAMBRIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../expansion-authoring/jellies')));os.makedirs(LOCAL,exist_ok=True)
CLIPS={'Idle':2.4,'Swim':2.4,'Attack':1.2,'Hit':.6,'Death':1.6,'TurnLeft':2.4,'TurnRight':2.4,'Dive':2.4,'Rise':2.4}

class Builder:
 def __init__(self,id):
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
  for a in list(bpy.data.actions):bpy.data.actions.remove(a)
  self.id=id;self.V=[];self.C=[];self.U=[];self.W=[];self.F=[];self.M=[];self.B={};self.motion=[];self.count=0
  self.bone('root',(0,0,0),(0,1,0),None)
  self.bone('body',(0,-1.7,0),(0,-1.3,0),'root')
  self.mats=[]
  normal=bpy.data.images.load(os.path.join(os.path.dirname(__file__),'cuticle_normal.png'),check_existing=True);normal.colorspace_settings.name='Non-Color';normal.pack()
  for name,rough,metal,strength in [('Cuticle',.52,0,.42),('Membrane',.53,0,.22),('Sclerotized edges',.36,0,.28),('Eyes',.17,.04,.10),('Bristles',.38,.18,.14)]:
   mat=bpy.data.materials.new(id+' '+name);mat.use_nodes=True
   bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
   vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';mat.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
   tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=normal;nm=mat.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=strength
   mat.node_tree.links.new(tx.outputs['Color'],nm.inputs['Color']);mat.node_tree.links.new(nm.outputs['Normal'],bs.inputs['Normal']);self.mats.append(mat)
 def bone(self,n,h,t,p='body'):
  self.B[n]=(Vector(h),Vector(t),p);return n
 def v(self,p,c,w,u=(0,0)):
  p=Vector(p);variation=.84+.27*noise.noise_vector(p*9)[0]+.11*noise.noise_vector(p*43)[1]
  if noise.noise_vector(p*16)[2]>.27:variation*=.84
  self.V.append(tuple(p));self.C.append(tuple(max(.002,min(.96,k*variation)) for k in c)+(1,));self.W.append(w if isinstance(w,dict) else {w:1});self.U.append(u);return len(self.V)-1
 def f(self,f,m=0):self.F.append(tuple(f));self.M.append(m)
 def grid(self,rows,cols,fn,m=0,wrap=True):
  ids=[[fn(i,j) for j in range(cols)]for i in range(rows)]
  for i in range(rows-1):
   for j in range(cols if wrap else cols-1):self.f([ids[i][j],ids[i][(j+1)%cols],ids[i+1][(j+1)%cols],ids[i+1][j]],m)
  return ids
 def ell(self,c,s,col,w='body',m=0,seg=24,rings=12,cavity=None):
  c=Vector(c)
  def p(i,j):
   a=pi*i/rings;b=2*pi*j/seg
   point=c+Vector((sin(a)*cos(b)*s[0],sin(a)*sin(b)*s[1],cos(a)*s[2]));pigment=col

   return self.v(point,pigment,w,(j/seg,i/rings))
  self.grid(rings+1,seg,p,m)
 def tube(self,pts,rad,col,w='body',m=0,sides=8):
  pts=[Vector(p)for p in pts];rows=[]
  for i,p in enumerate(pts):
   t=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized();u=t.cross(Vector((0,0,1)))
   if u.length<.01:u=t.cross(Vector((1,0,0)))
   u.normalize();v=t.cross(u).normalized();wi=w[i] if isinstance(w,list) else w
   rows.append([self.v(p+rad[i]*(cos(j*2*pi/sides)*u+sin(j*2*pi/sides)*v),col,wi,(j/sides,i/(len(pts)-1)))for j in range(sides)])
  for i in range(len(rows)-1):
   for j in range(sides):self.f((rows[i][j],rows[i][(j+1)%sides],rows[i+1][(j+1)%sides],rows[i+1][j]),m)
  self.f(reversed(rows[0]),m);self.f(rows[-1],m)
 def leaf(self,o,end,chord,col,w,m=1,steps=12,widthsteps=6):
  o=Vector(o);d=Vector(end)-o;lat=Vector((0,1,0));normal=d.cross(lat).normalized()
  def pt(t,u,side):
   wid=chord*(.15*(1-t)+sin(pi*t)**.8)
   return o+d*t+lat*(wid*u)+normal*(.035*sin(pi*t)+side*.018*sin(pi*t)*cos(u*pi/2))
  for side in [1,-1]:
   def fn(i,j):
    t=i/steps;u=-1+2*j/widthsteps;p=pt(t,u,side)
    c=np.array(col)*(.84+.13*cos(u*30+t*7)+.22*abs(u)**6+.12*t)
    return self.v(p,c,w,(t,(u+1)/2))
   self.grid(steps+1,widthsteps+1,fn,m,False)
  for k in range(5 if steps>5 else 3):
   nr=11 if steps>5 else 6;u=-.72+k*(.36 if steps>5 else .72);pts=[pt(.08+i*.85/(nr-1),u,1)+normal*.004 for i in range(nr)]
   self.tube(pts,[.004]*nr,tuple(x*1.2 for x in col),w,m,4)
 def torso(self,start,end,n,width,height,col):
  self.n=n;self.start=start;self.end=end
  for i in range(n):
   y=start+(end-start)*i/n;parent='body' if i==0 else 'segment_%02d'%(i-1)
   self.bone('segment_%02d'%i,(0,y,0),(0,y+(end-start)/n,0),parent)
  def weights(y):
   t=max(0,min(n-1,(y-start)/(end-start)*n));i=int(t);j=min(n-1,i+1)
   return {'segment_%02d'%i:1-(t-i),'segment_%02d'%j:t-i} if i!=j else {'segment_%02d'%i:1}
  self.bw=weights
  def p(i,j):
   t=i/(n*6);a=2*pi*j/40;y=start+(end-start)*t
   taper=(.45+.55*sin(pi*t)**.5)*(1-.40*t);rib=1+.045*cos(2*pi*t*n)
   pos=(width*taper*rib*cos(a),y,height*taper*rib*sin(a))
   c=np.array(col)*(.74+.28*(1-sin(a)))*(.87+.13*cos(2*pi*t*n))
   return self.v(pos,c,weights(y),(j/40,t*4))
  ids=self.grid(n*6+1,40,p);self.f(reversed(ids[0]));self.f(ids[-1])
 def eye(self,c,r,stalk,w):
  self.tube(stalk,[r*.42,r*.38,r*.58],(.13,.09,.055),w,0,12)
  self.ell(c,(r,r*.84,r),(.007,.011,.009),w,3,32,18)
  # Geometric minute facets remain black, responding to highlights rather than paint.
  for i in range(1,10):
   a=pi*i/10
   for j in range(18):
    b=j*2*pi/18;n=Vector((sin(a)*cos(b),sin(a)*sin(b),cos(a)))
    p=Vector(c)+Vector((n.x*r,n.y*r*.84,n.z*r))*1.004
    self.ell(p,(r*.035,)*3,(.011,.017,.013),w,3,5,3)

CLIPS={'Idle':2.4,'Swim':2.4,'Attack':1.2,'Hit':.6,'Death':1.6,'TurnLeft':2.4,'TurnRight':2.4,'Dive':2.4,'Rise':2.4,'Bite':.5,'Heavy':1.1,'Guard':1.,'Parry':.35,'Dodge':.4,'Eat':.8,'Stagger':1.2,'Ability':1.2,'Moult':1.5}
LOOPS={'Idle','Swim','Guard','Eat','Ability','Moult'}

def gelatin(b):
 for i in [0,1]:
  bs=b.mats[i].node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.34;bs.inputs['Coat Weight'].default_value=.18;bs.inputs['Subsurface Weight'].default_value=.22;bs.inputs['Alpha'].default_value=.88 if i==0 else .92
  b.mats[i].surface_render_method='DITHERED'
  for node in b.mats[i].node_tree.nodes:
   if node.type=='NORMAL_MAP':node.inputs['Strength'].default_value=.07
 # Modest tissue transparency keeps the silhouette legible through game depth fog.
 b.mats[4].node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.12

def burgessomedusa(b):
 gelatin(b);b.n=0;b.B['body']=(Vector((0,0,0)),Vector((0,0,.5)),'root')
 N=16
 for k in range(N):
  a=2*pi*k/N;n=b.bone('bell_%02d'%k,(.30*cos(a),.30*sin(a),.75),(.92*cos(a),.92*sin(a),.02));b.motion.append((n,'bell',k,1))
 def w(a,t):
  v=(a/(2*pi)*N)%N;i=int(v);f=v-i;s=t**1.7
  return {'body':1-s,'bell_%02d'%i:s*(1-f),'bell_%02d'%((i+1)%N):s*f}
 def surface(i,j):
  t=i/36;a=2*pi*j/128;r=1.03*sin(t*pi*.54)*(1+.045*cos(a*4)*t)
  z=1.28*cos(t*pi*.47)-.16*t+.024*cos(a*48)*t**8
  pigment=(.15+.12*t,.29+.07*t,.35+.09*t);pigment=np.array(pigment)*(.96+.075*cos(a*16)+.10*cos(t*24))
  return b.v((r*cos(a),r*sin(a),z),pigment,w(a,t),(j/128,t))
 b.grid(37,128,surface,0)
 # Deep inset subumbrella, a thick rolled margin, radial internal canals.
 def underside(i,j):
  t=i/20;a=2*pi*j/128;r=1.03*sin(pi*.54)*t*(1+.045*cos(a*4));z=-.040+.43*(1-t*t)
  return b.v((r*cos(a),r*sin(a),z),(.12+.18*t,.26+.17*t,.31+.22*t),w(a,t),(j/128,t))
 b.grid(21,128,underside,1)
 for k in range(16):
  a=2*pi*k/16;pts=[];weights=[]
  for j in range(24):
   t=.08+.91*j/23;r=1.038*sin(t*pi*.54)*(1+.045*cos(a*4)*t);z=1.288*cos(t*pi*.47)-.16*t
   pts.append((r*cos(a),r*sin(a),z));weights.append(w(a,t))
  b.tube(pts,[.005+.004*j/23 for j in range(24)],(.43,.23,.25),weights,1,5)
 for j in range(48):
  a=2*pi*j/48;k=round(j/3)%16;length=.48+.13*(.5+.5*cos(j*2.13));p0=Vector((1.008*cos(a),1.008*sin(a),-.03))
  pts=[p0+Vector((.13*cos(a)*sin(t*pi*.8),.13*sin(a)*sin(t*pi*.8),-length*t)) for t in [i/10 for i in range(11)]]
  n=b.bone('tentacle_%02d'%j,pts[0],pts[5],'bell_%02d'%k);nn=b.bone('tentacle_tip_%02d'%j,pts[5],pts[-1],n)
  b.motion.extend([(n,'tentacle',j,1),(nn,'tentacle_tip',j,1)])
  weights=[{n:1-i/10,nn:i/10} for i in range(11)]
  b.tube(pts,[.022*(1-i/12) for i in range(11)],(.34,.19,.27),weights,1,8)
  for z in range(3,10,2):b.ell(pts[z],(.021*(1-z/14),)*3,(.49,.30,.17),weights[z],1,6,4)
 # Central manubrium and four short lobes, no modern jellyfish's long trailing oral arms.
 b.ell((0,0,.22),(.19,.19,.28),(.42,.19,.19),'body',1)
 for k in range(4):
  a=k*pi/2;n=b.bone('mouth_%d'%k,(0,0,.13),(.12*cos(a),.12*sin(a),-.18));b.motion.append((n,'mouth',k,1))
  b.tube([(0,0,.13),(.10*cos(a),.10*sin(a),-.08),(.16*cos(a),.16*sin(a),-.16)],[.095,.07,.025],(.43,.21,.16),n,1,12)
 return ['Bell with radial canals, thick margin, 48 short marginal tentacles and short central mouth lobes. Tentacle number simplified from the dense fossil fringe for gameplay.','Swimming bell and tentacle capture are fossil-informed; color, exact canal relief, combat effects, and coordinated tentacle corral are artistic reconstructions.']

def ctenorhabdotus(b):
 gelatin(b);b.n=0;b.B['body']=(Vector((0,0,0)),Vector((0,0,.5)),'root')
 for k in range(8):
  a=k*pi/4;n=b.bone('sector_%d'%k,(0,0,.7),(.75*cos(a),.75*sin(a),-.3));b.motion.append((n,'sector',k,1))
 def point(t,a):
  r=(.48+.49*sin(pi*t)**.68)*(1+.035*cos(a*8));return Vector((r*cos(a),r*sin(a),1.12-2.05*t))
 def w(a):
  q=(a/(2*pi)*8)%8;i=int(q);f=q-i;return {'sector_%d'%i:1-f,'sector_%d'%((i+1)%8):f}
 def surface(i,j):
  t=i/48;a=2*pi*j/128;p=point(t,a);c=np.array((.07+.08*t,.20+.08*t,.29+.10*t))*(.88+.11*cos(a*8)+.06*cos(t*32))
  return b.v(p,c,w(a),(j/128,t))
 b.grid(49,128,surface,0)
 # Eight groups of THREE comb rows; central rows are shorter (not modern eight-row anatomy).
 for group in range(8):
  for lane in [-1,0,1]:
   basea=group*pi/4+lane*.14;start=.32 if lane==0 else .11;end=.88 if lane==0 else .91
   n=b.bone('comb_%d_%s'%(group,lane),point(.18,basea),point(.62,basea),'sector_%d'%group);b.motion.append((n,'comb',group*3+lane+1,1))
   pts=[point(start+(end-start)*j/32,basea)*(Vector((1.008,1.008,1.0))) for j in range(33)]
   b.tube(pts,[.009]*len(pts),(.17,.24,.32),n,1,6)
   for j in range(26):
    t=start+(end-start)*(j+.5)/26;p=point(t,basea);tangent=Vector((-sin(basea),cos(basea),0));normal=Vector((cos(basea),sin(basea),.08))
    # Tiny overlapping raised ciliary paddles catch moving colored highlights.
    color=(.12+.12*(.5+.5*sin(j*.35)),.20+.17*(.5+.5*sin(j*.35+2)),.34+.12*(.5+.5*sin(j*.35+4)))
    rows=[]
    for r in range(4):
     tt=r/3;width=.098*(.08+.92*sin(pi*tt)**.5)
     rows.append([b.v(p+tangent*((q/6-.5)*width)+normal*(.009+.012*sin(pi*tt)*sin(pi*q/6))+Vector((0,0,-tt*.029)),color,n,(q/6,tt)) for q in range(7)])
    for r in range(3):
     for q in range(6):b.f((rows[r][q],rows[r][q+1],rows[r+1][q+1],rows[r+1][q]),4)
  # Converging aboral strands.
  pts=[point(.01+.20*j/16,group*pi/4) for j in range(17)];b.tube(pts,[.025]*17,(.28,.18,.31),'sector_%d'%group,1,7)
 # Rounded flattened caps, central capsule, and undulating oral margin, NO invented tentacles.
 b.ell((0,0,1.12),(.49,.49,.07),(.16,.26,.33),'body',1,48,10)
 b.ell((0,0,1.23),(.14,.14,.16),(.27,.18,.27),'body',1,24,16)
 for k in range(8):
  a=k*pi/4;n=b.bone('oral_%d'%k,(.25*cos(a),.25*sin(a),-.84),(.42*cos(a),.42*sin(a),-1.03),'sector_%d'%k);b.motion.append((n,'oral',k,1))
  pts=[(.44*cos(a+(i/12-.5)*pi/4),.44*sin(a+(i/12-.5)*pi/4),-.94-.055*cos(i*pi/6))for i in range(13)]
  b.tube(pts,[.055]*13,(.39,.36,.43),n,1,8)
 b.ell((0,0,-.87),(.36,.36,.09),(.075,.13,.18),'body',1,36,10)
 return ['Ovoid lantern body; 24 ciliary comb rows grouped as eight triplets, central row shortened; flattened poles, aboral capsule and undulating oral margin. No tentacles added.','Feeding ecology is uncertain. Pearlescent color and visible comb shimmer are artistic reconstruction inspired by living ctenophores; recovery ability is game fiction.']

def mouth_ring(b,center,r,w):
 c=Vector(center)
 b.ell(c,(r,r,.07),(.055,.045,.034),w,1,32,8)
 for k in range(24):
  a=k*2*pi/24;o=c+Vector((r*cos(a),r*sin(a),-.055));e=c+Vector((r*.48*cos(a),r*.48*sin(a),-.10));b.tube([o,o.lerp(e,.6),e],[r*.11,r*.10,.009],(.40,.25,.105),w,2,6)

def radbody(b,compact=False):
 n=10 if compact else 12;start=-.35 if compact else -1.3;end=1.75 if compact else 2.1;width=.40 if compact else .42
 b.torso(start,end,n,width,.23,(.23,.155,.066) if compact else (.13,.24,.245))
 for s in [-1,1]:
  for i in range(n):
   y=start+(end-start)*(i+.25)/n;span=(.36 if compact else .65)*sin(pi*(i+2)/(n+3))+.12
   o=(s*.25,y,-.05);e=(s*(.25+span),y+.19,-.08);name=b.bone('flap_%s_%02d'%(s,i),o,(s*(.25+span*.55),y+.10,-.07),'segment_%02d'%i);b.motion.append((name,'flap',i,s))
   b.leaf(o,e,.13 if compact else .20,(.32,.21,.087) if compact else (.18,.36,.34),name,1,12,8)
   for j in range(5):
    x=s*(.27+j*.037);b.tube([(x,y,.10),(x+s*.035,y+.08,.20),(x+s*.04,y+.17,.10)],[.012,.016,.002],(.38,.29,.13) if compact else (.26,.40,.36),name,1,5)
  for i in range(3):
   o=(s*.06,end-.10,0);e=(s*(.59-i*.12),end+.62+i*.09,.08+i*.08);name=b.bone('tail_%s_%s'%(s,i),o,e,'segment_%02d'%(n-1));b.motion.append((name,'tail',i,s));b.leaf(o,e,.14,(.30,.22,.10) if compact else (.20,.36,.36),name,1,10,6)

def cambroraster(b):
 radbody(b,True)
 # Broad domed horseshoe/spaceship shield, rear horns and deep lateral eye notches.
 outline=[(0,-2.0),(.55,-1.96),(1.10,-1.76),(1.45,-1.34),(1.57,-.76),(1.55,-.18),(1.45,.57),(1.17,.82),(.99,.05),(.68,-.03),(.60,.52),(0,.42)]
 outline=outline+[(-x,y)for x,y in outline[-2:0:-1]]
 # Smooth periodic Catmull-Rom outline; radial panels have sculpted concentric growth ridges.
 poly=[Vector((x,y,0)) for x,y in outline]
 def edge(a):
  q=a/(2*pi)*len(poly);i=int(q)%len(poly);t=q-int(q);p0,p1,p2,p3=[poly[k%len(poly)]for k in [i-1,i,i+1,i+2]]
  return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
 center=Vector((0,-.69,.30))
 def shield(i,j):
  t=i/32;a=j*2*pi/160;e=edge(a);p=center.lerp(e,t);p.z=.13+.52*(1-t*t)+.012*cos(t*75)*t
  col=np.array((.27,.185,.082))*(.80+.20*cos(t*34)+.16*cos(a*6)**2+.12*t**5)
  return b.v(p,col,'body',(a/(2*pi),t*2))
 b.grid(33,160,shield,0)
 pts=[edge(j*2*pi/240)+Vector((0,0,.132))for j in range(241)];b.tube(pts,[.028]*241,(.41,.285,.13),'body',2,8)
 for s in [-1,1]:
  n=b.bone('eye_%s'%s,(s*.69,-.05,.13),(s*.87,.11,.51));b.eye((s*.87,.12,.53),.115,[(s*.69,-.05,.13),(s*.80,.06,.36),(s*.87,.12,.53)],n)
  # Ventral articulated frontal appendage and five parallel recurved endites.
  pts=[Vector((s*(.27+.045*k),-1.36-.15*k,-.16-.05*k))for k in range(7)];names=[]
  for k in range(6):
   n=b.bone('rake_%s_%s'%(s,k),pts[k],pts[k+1],'body' if k==0 else names[-1]);names.append(n);b.motion.append((n,'rake',k,s));b.tube([pts[k],pts[k].lerp(pts[k+1],.5),pts[k+1]],[.082,.09,.065],(.35,.235,.10),n,0,12)
   if k<5:
    o=pts[k].lerp(pts[k+1],.6);points=[o,o+Vector((s*.11,-.23,-.18)),o+Vector((-s*.12,-.43,-.27)),o+Vector((-s*.28,-.48,-.13))]
    b.tube(points,[.04,.037,.023,.003],(.44,.31,.13),n,2,9)
    for q in range(12):
     t=(q+1)/13;p=points[1].lerp(points[2],t);b.tube([p,p+Vector((s*.05,-.08-.035*sin(pi*t),-.025))],[.010,.001],(.50,.37,.19),n,4,5)
 mouth_ring(b,(0,-1.27,-.22),.24,'body')
 return ['Broad dorsal head shield with posterolateral horns and recessed eye notches; compact flapped trunk; pair of jointed feeding appendages with five long recurved rake endites and fine subsidiary spines; ventral toothed oral cone.','Sediment-sifting interpretation follows ROM research. Color, exact flap count and animation timing reconstructed; feeding sweep area damage is game abstraction.']

def tamisiocaris(b):
 radbody(b,False)
 b.ell((0,-1.49,.02),(.46,.44,.29),(.14,.27,.27),'body',0,48,24)
 for s in [-1,1]:
  n=b.bone('eye_%s'%s,(s*.24,-1.52,.14),(s*.53,-1.80,.32));b.eye((s*.56,-1.80,.32),.13,[(s*.24,-1.52,.14),(s*.43,-1.71,.26),(s*.56,-1.80,.32)],n)
  # Long appendages with slender paired filtering endites; fine setules form actual comb geometry.
  pts=[Vector((s*(.25+.32*sin(k/12*pi*.75)),-1.71-k*.155,-.06-.035*k))for k in range(14)]
  names=[]
  for k in range(13):
   n=b.bone('filter_%s_%02d'%(s,k),pts[k],pts[k+1],'body' if k==0 else names[-1]);names.append(n);b.motion.append((n,'filter',k,s));p,q=pts[k:k+2]
   b.tube([p,p.lerp(q,.2),p.lerp(q,.8),q],[.055,.065,.058,.045],(.24,.37,.33),n,0,10)
   if k>0:
    for side in [-1,1]:
     o=p.lerp(q,.5);end=o+Vector((s*side*(.31+.21*sin(pi*k/14)),-.06,-.08));b.tube([o,o.lerp(end,.7),end],[.020,.012,.002],(.47,.49,.30),n,4,7)
     for j in range(10):
      t=(j+.5)/10;z=o.lerp(end,t);b.tube([z,z+Vector((s*side*.015,-.09,-.012))],[.0045,.0005],(.54,.53,.35),n,4,4)
 mouth_ring(b,(0,-1.59,-.23),.18,'body')
 return ['Elongated frontal appendages with long slender endites and close-set filtering setules; reconstructed radiodont trunk, swimming flaps, stalked eyes and tail fan.','Tamisiocaris is known chiefly from frontal appendages: the complete body is an explicitly conjectural generalized radiodont reconstruction, not fossil-established anatomy. Color, body proportions and motions are artistic; filter feeding is supported by appendage microstructure.']

def finish(b,notes):
 mesh=bpy.data.meshes.new(b.id+' anatomy');mesh.from_pydata(b.V,[],b.F);mesh.update();obj=bpy.data.objects.new(b.id,mesh);bpy.context.collection.objects.link(obj)
 # Generated chitin texture used on the hard radiodont cuticle; gel uses fine cuticle normal at very low strength.
 if b.id in ('cambroraster','tamisiocaris'):
  texpath=os.path.join(ROOT,'tools/creatures/textures/chitin-albedo.png')
  if os.path.exists(texpath):
   im=bpy.data.images.load(texpath,check_existing=True);im.pack()
   for mi in [0,2]:
    mat=b.mats[mi];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');vc=next(n for n in nodes if n.type=='VERTEX_COLOR');tx=nodes.new('ShaderNodeTexImage');tx.image=im;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.30;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tx.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
 for mat in b.mats:mesh.materials.append(mat)
 for p,m in zip(mesh.polygons,b.M):p.material_index=m;p.use_smooth=True
 col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(b.C,np.float32).ravel())
 uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.array([b.U[l.vertex_index]for l in mesh.loops],np.float32).ravel())
 bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.triangulate(bm,faces=[f for f in bm.faces if len(f.verts)>4]);bm.to_mesh(mesh);bm.free();mesh.update()
 arm=bpy.data.armatures.new(b.id+' anatomical rig');rig=bpy.data.objects.new(b.id+'_rig',arm);bpy.context.collection.objects.link(rig);obj.select_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for name,(h,t,parent) in b.B.items():
  bone=arm.edit_bones.new(name);bone.head=h;bone.tail=t
  if parent:bone.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');groups={n:obj.vertex_groups.new(name=n)for n in b.B};buckets={}
 for i,w in enumerate(b.W):
  for name,v in w.items():
   if v>0:buckets.setdefault((name,round(v,5)),[]).append(i)
 for (name,v),inds in buckets.items():groups[name].add(inds,v,'REPLACE')
 mod=obj.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;obj.parent=rig;rig.show_in_front=True;arm.display_type='STICK';scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=72;rig.animation_data_create()
 for pb in rig.pose.bones:pb.rotation_mode='XYZ'
 def reset():
  for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
 seams={};finite={};bounds={}
 for clip,duration in CLIPS.items():
  reset();a=bpy.data.actions.new(clip);a.use_fake_user=True;rig.animation_data.action=a;last=round(duration*30);first=None
  for f in range(last+1):
   reset();u=f/last;p=2*pi*u;pb=rig.pose.bones;loop=clip in LOOPS;env=1 if loop else sin(pi*u)**2
   amp=.25 if clip=='Idle' else .95 if clip=='Swim' else .3
   wave=lambda lag=0: (sin(p-lag)-sin(-lag))*env
   impact=sin(pi*min(1,max(0,(u-.32)/.36)))**2 if .32<u<.68 else 0
   wind=sin(pi*min(1,u/.4))**2 if u<.4 else 0
   recoil=sin(pi*min(1,max(0,(u-.62)/.38)))**2 if u>.62 else 0
   strike=(impact-.45*wind) if clip in ('Heavy','Attack') else sin(pi*u)**4 if clip in ('Bite','Parry') else 0
   eat=.5+.5*sin(p*2) if clip=='Eat' else 0;guard=.30+.05*sin(p) if clip=='Guard' else 0;ability=.45+.20*sin(p) if clip=='Ability' else 0
   death=u*u*(3-2*u) if clip=='Death' else 0
   stagger=(sin(pi*u)**2*(.8+.2*sin(p*3))) if clip in ('Hit','Stagger') else 0
   dodge=sin(pi*u)**2 if clip=='Dodge' else 0;moult=.09*sin(p*5) if clip=='Moult' else 0
   if clip=='Death':amp*=1-death
   body=pb['body'];body.rotation_euler.x=.025*amp*wave()+.10*strike-.18*stagger+.10*death+moult
   body.rotation_euler.y=.025*amp*wave(.5)+.50*dodge+.28*stagger+.9*death
   body.rotation_euler.z=.12*strike if clip=='Parry' else .03*amp*wave(.8)
   if clip in ('TurnLeft','TurnRight'):body.rotation_euler.z+=(-1 if clip=='TurnLeft' else 1)*.23*env
   if clip in ('Dive','Rise'):body.rotation_euler.x+=(-1 if clip=='Dive' else 1)*.22*env
   body.location.z=.018*amp*wave()-.04*stagger
   for i in range(b.n):
    q=pb['segment_%02d'%i];q.rotation_euler.z=.016*amp*wave(i*.43)+.035*dodge*sin(i*.35);q.rotation_euler.x=.008*amp*wave(i*.38)+.015*strike+.022*death
   for name,kind,i,s in b.motion:
    q=pb[name];lag=i*.39;v=wave(lag)
    if kind=='bell':
     # Hinged umbrella sectors contract inward, tentacles inherit the rim movement.
     q.rotation_euler.x=.16*amp*wave() +.23*strike+.20*ability-.10*guard+.12*stagger+.22*death
     q.rotation_euler.z=.018*amp*wave(lag)
    elif kind in ('tentacle','tentacle_tip'):
     q.rotation_euler.x=(.14 if kind=='tentacle' else .24)*amp*wave(lag+.7)+.25*strike+.17*ability+.11*guard+.24*death
     q.rotation_euler.z=.09*amp*wave(lag+1.2)+.10*stagger*sin(i)+.08*dodge
    elif kind=='mouth':q.rotation_euler.x=.06*wave(lag)+.22*strike+.22*eat+.16*ability
    elif kind=='sector':
     q.rotation_euler.x=.016*amp*wave(lag)+.022*strike+.025*guard+.016*death;q.rotation_euler.z=.018*amp*wave(lag+.8)+.018*dodge
    elif kind=='comb':
     q.rotation_euler.x=.010*(amp+ability)*wave(lag)+.013*sin(p*4-lag)*env*(.25+ability);q.rotation_euler.z=.008*amp*wave(lag)
    elif kind=='oral':q.rotation_euler.x=.045*wave(lag)+.15*eat+.12*strike+.08*guard
    elif kind=='flap':
     q.rotation_euler.x=s*(.23*amp*wave(lag)+.18*strike+.10*ability-.16*guard+.28*dodge*(1 if s==1 else -.5)+.35*death)
     q.rotation_euler.z=.07*amp*wave(lag+.5)+.08*stagger
    elif kind=='tail':q.rotation_euler.x=s*(.09*amp*wave(i*.5)+.25*dodge+.14*strike+.12*death)
    elif kind=='rake':
     q.rotation_euler.z=s*(.06*amp*wave(lag)+(.25 if i<2 else .06)*strike+(.16 if i<2 else .025)*ability+.055*eat-.07*guard)
     q.rotation_euler.x=.035*amp*wave(lag)+.12*strike+.065*ability+.07*eat+.12*death+.10*stagger
    elif kind=='filter':
     q.rotation_euler.z=s*(.013*amp*wave(lag)+(.14 if i==0 else .016)*ability-(.18 if i==0 else .009)*guard+(.12 if i<2 else .012)*strike+.01*eat)
     q.rotation_euler.x=.010*amp*wave(lag)+.028*strike+.025*death+.025*stagger
    q.rotation_euler.x+=moult*(.45+.35*sin(i))
   state=np.array([tuple(q.rotation_euler)+tuple(q.location)for q in pb])
   if f==0:first=state.copy()
   if f==last:seams[clip]=float(np.max(np.abs(state-first)))
   for q in pb:
    q.keyframe_insert('rotation_euler',frame=f)
    if q.name=='body':q.keyframe_insert('location',frame=f)
  # Check several action phases, including peak impact, against finite skin deformation.
  pts=[]
  for frame in [0,round(last*.3),round(last*.5),round(last*.7),last]:
   scene.frame_set(frame);ev=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());me=ev.to_mesh();coords=np.array([tuple(v.co)for v in me.vertices]);pts.extend([coords.min(0),coords.max(0)]);assert np.isfinite(coords).all();ev.to_mesh_clear()
  finite[clip]=True;bounds[clip]=[np.array(pts).min(0).tolist(),np.array(pts).max(0).tolist()];rig.animation_data.action=None
 reset();scene.frame_set(0)
 for c in LOOPS:assert seams[c]<1e-5,(c,seams[c])
 for c in set(CLIPS)-LOOPS-{'Death'}:assert seams[c]<1e-5,(c,seams[c])
 # Split export copies by material to avoid Blender 5.2 color-layer slot issue.
 bpy.ops.object.select_all(action='DESELECT');temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);temp.select_set(True);bpy.context.view_layer.objects.active=temp
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
 for part in parts:
  bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=b.id+' '+part.data.materials[0].name
 rig.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(OUT,b.id+'.glb')
 kwargs=dict(export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True)
 # Explicit texture shader for glTF; COLOR_0 multiplication is native in glTF.
 original_links=[]
 if b.id in ('cambroraster','tamisiocaris'):
  for mi in [0,2]:
   mat=b.mats[mi];nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');mix=next((n for n in nodes if n.type=='MIX_RGB'),None)
   if mix:
    tx=next(n for n in nodes if n.type=='TEX_IMAGE' and n.image.colorspace_settings.name!='Non-Color');links.new(tx.outputs['Color'],bs.inputs['Base Color']);original_links.append((mat,mix,bs))
 bpy.ops.export_scene.gltf(filepath=path,**kwargs)
 # True mesh-decimated LOD, retaining exactly the same animation library and skin.
 for part in parts:
  bpy.context.view_layer.objects.active=part;de=part.modifiers.new('Distant topology reduction','DECIMATE');de.ratio=.42;bpy.ops.object.modifier_move_up(modifier=de.name);bpy.ops.object.modifier_apply(modifier=de.name)
 bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,b.id+'.lod1.glb'),**kwargs)
 for mat,mix,bs in original_links:mat.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
 for part in parts:
  data=part.data;bpy.data.objects.remove(part,do_unlink=True);bpy.data.meshes.remove(data)
 raw=open(path,'rb').read();jslen=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jslen]);names=[a['name']for a in g.get('animations',[])];assert set(CLIPS)==set(names),(b.id,names)
 world=bpy.data.worlds.new('Specimen studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.022,.040,.046,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
 for name,pos,power,size,color in [('Key',(1,-4,6),1050,4,(1,.91,.77)),('Fill',(-4,-1,3),800,4,(.52,.77,1)),('Rim',(2,4,4),1300,3,(.62,.90,1))]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata);bpy.context.collection.objects.link(cam);scene.camera=cam;cam.location=(6,-7,5.2) if b.id in ('cambroraster','tamisiocaris') else (5,-7,3.3);look=Vector((0,-.55 if b.id=='tamisiocaris' else -.15 if b.id=='cambroraster' else 0,0));cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=6.7 if b.id=='tamisiocaris' else 5.9 if b.id=='cambroraster' else 3.9
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1000;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.6;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
 rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,b.id+'.blend'));scene.render.filepath=os.path.join(OUT,b.id+'.card.png');bpy.ops.render.render(write_still=True)
 scene.render.film_transparent=False;scene.render.filepath=os.path.join(OUT,b.id+'.png');bpy.ops.render.render(write_still=True)
 report={'id':b.id,'bones':len(b.B),'vertices':len(b.V),'triangles':sum(len(p.vertices)-2 for p in mesh.polygons),'clips':CLIPS,'loopClips':sorted(LOOPS),'clipFrames':{k:round(v*30)for k,v in CLIPS.items()},'seamErrors':seams,'finiteSkinningAtFivePhases':finite,'animatedBounds':bounds,'scientificNotes':notes,'orientation':'glTF +Y up, +Z anterior. Radial jellies have a designated gameplay heading.','root':'fixed identity, no animated scale','localSource':os.path.join(LOCAL,b.id+'.blend'),'renderInspected':False}
 open(os.path.join(LOCAL,b.id+'.json'),'w').write(json.dumps(report,indent=2));open(os.path.join(os.path.dirname(__file__),b.id+'.json'),'w').write(json.dumps(report,indent=2));print('EXPANSION_REPORT',json.dumps(report),flush=True)

ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['burgessomedusa','ctenorhabdotus','cambroraster','tamisiocaris']
for id in ids:
 b=Builder(id);notes=globals()[id](b);finish(b,notes)
