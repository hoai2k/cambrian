"""Original fossil-informed pelagic models, deterministic, Blender 5.x.
Run: Blender -b -t 4 --python cambrian/scripts/creatures/pelagic_build.py -- opabinia waptia canadia
Geometry uses Z up, anterior -Y; glTF exports Y up, anterior +Z.
"""
import bpy, bmesh, math, random, os, sys, json, struct
import numpy as np
from mathutils import Vector, noise
from math import sin, cos, pi
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))

ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../../..'))
OUT=os.path.join(ROOT,'public/assets/creatures');os.makedirs(OUT,exist_ok=True)
LOCAL=os.environ.get('CAMBRIAN_AUTHORING',os.path.abspath(os.path.join(ROOT,'../expansion-authoring/arthropods')));os.makedirs(LOCAL,exist_ok=True)
CLIPS={'Idle':2.4,'Swim':2.4,'Attack':1.1,'Hit':.6,'Death':1.6,'TurnLeft':1.0,'TurnRight':1.0,'Dive':1.0,'Rise':1.0,'Bite':.5,'Heavy':1.1,'Guard':1.0,'Parry':.35,'Dodge':.4,'Eat':.8,'Stagger':1.2,'Ability':1.2,'Moult':1.5}

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
  if noise.noise_vector(p*16)[2]>.27:variation*=.64
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
   # Original surfaces have no externally supplied mesh dependencies.
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
    self.ell(p,(r*.015,)*3,(.011,.017,.013),w,3,5,3)


def fin(b,o,end,width,col,bone,vertical=False):
 o=Vector(o);end=Vector(end);d=end-o;lat=Vector((0,0,1)) if vertical else Vector((1,0,0));normal=d.cross(lat).normalized()
 def point(t,u,side=1):return o+d*t+lat*(width*sin(pi*t)**.8*u)+normal*(.016*side*sin(pi*t)*(1-u*u))
 for side in [-1,1]:
  def p(i,j):
   t=i/16;u=-1+j/4;return b.v(point(t,u,side),np.array(col)*(.8+.22*cos(u*21+t*6)+.15*abs(u)),bone,(j/8,t))
  b.grid(17,9,p,1,False)
 for k in range(7):
  pts=[point(.03+.94*i/16,-.85+k*.283,1) for i in range(17)];b.tube(pts,[.004]*17,np.array(col)*1.2,bone,2,4)

def feeler(b,name,points,parent,col,kind='antenna'):
 pts=[Vector(p) for p in points];n=len(pts)-1;names=[]
 for j in range(n):
  bn=b.bone(name+'_%02d'%j,pts[j],pts[j+1],parent if j==0 else names[-1]);names.append(bn);b.motion.append((bn,kind,j,1 if pts[0].x>0 else -1))
  r=(.017 if kind=='whip' else .034)*(1-j/(n+.3));b.tube([pts[j],pts[j].lerp(pts[j+1],.2),pts[j+1]],[r*.8,r,max(.001,r*.6)],col,bn,0,8)
 return names

def limbs(b,count,start,step,width,col,segcount,swim=False):
 for s in [-1,1]:
  for i in range(count):
   y=start+i*step;w=width*(.8+.2*sin(pi*(i+1)/(count+1)));parent='segment_%02d'%min(segcount-1,i)
   p=[Vector((s*.18,y,-.06)),Vector((s*w*.65,y-.03,-.18)),Vector((s*w,y+.08,-.37)),Vector((s*w*1.08,y-.1,-.60))];bn=[]
   for k in range(3):
    n=b.bone('leg_%s_%02d_%d'%(s,i,k),p[k],p[k+1],parent if k==0 else bn[-1]);bn.append(n);b.motion.append((n,'leg',i*3+k,s));r=.063 if b.id=='sidneyia' else .035
    b.tube([p[k],p[k].lerp(p[k+1],.20),p[k].lerp(p[k+1],.8),p[k+1]],[r*.7,r,r*.75,.012],col,n,0,8);b.ell(p[k],(r*.95,)*3,np.array(col)*.66,n,2,10,6)
    if k==0:
     for j in range(4):
      o=p[k].lerp(p[k+1],.18+j*.16);b.tube([o,o+Vector((-s*.12,-.09,-.06))],[.027,.001],np.array(col)*1.4,n,2,6)
   b.tube([p[-1],p[-1]+Vector((-s*.07,-.08,-.05))],[.016,.001],np.array(col)*.5,bn[-1],2,7)
   if swim or i>=4:
    o=Vector((s*.23,y,-.02));end=Vector((s*(w+.22),y+.28,-.12));n=b.bone('paddle_%s_%02d'%(s,i),o,end,parent);b.motion.append((n,'flap',i,s));b.leaf(o,end,step*.50,np.array(col)*1.25,n,1,8,4)
    for k in range(9):
     a=.2+k*.08;p0=o.lerp(end,a)+Vector((0,step*.45,0));b.tube([p0,p0+Vector((s*.09,.14,-.02))],[.006,.001],np.array(col)*1.7,n,4,4)

def ringbody(b,n,start,step,width,height,col,sidney=False):
 b.n=n;b.start=start;b.end=start+n*step
 for i in range(n):
  y=start+i*step;nme=b.bone('segment_%02d'%i,(0,y,0),(0,y+step,0),'body' if i==0 else 'segment_%02d'%(i-1))
  if sidney:w=width*(.79+.21*sin(pi*min(i,8)/8)) if i<9 else width*.30
  else:w=width*(1-.65*(i/(n-1))**1.4)
  b.ell((0,y+step*.47,-.035),(w*.66,step*.64,height*.64),np.array(col)*.64,nme,0,20,8)
  def p(a,j):
   t=a/8;ang=pi*j/24;xx=w*cos(ang)*(1+.028*sin(j*3));yy=y+step*(t+.18*sin(ang));zz=height*sin(ang)*(.80+.20*sin(pi*t));c=np.array(col)*(.8+.18*sin(ang)+.2*t)
   if t>.85:c*=1.25
   return b.v((xx,yy,zz),c,nme,(j/24,t))
  b.grid(9,25,p,0,False)
  for s in [-1,1]:
   pts=[(s*w*(1+.018*sin(a*8)),y+step*a,0) for a in [j/8 for j in range(9)]];b.tube(pts,[.015]*9,np.array(col)*1.35,nme,2,6)
   if not sidney:
    b.tube([(s*w*.33,y+.03,height*.96),(s*w*.33,y+step*.8,height*.96)],[.013,.013],np.array(col)*1.4,nme,2,6)
    for j in range(3):b.tube([(s*w,y+step*(.25+j*.25),.015),(s*(w+.055),y+step*(.38+j*.25),-.01)],[.018,.001],np.array(col)*1.3,nme,2,6)

def bivalve(b,col,tubular=False):
 for s in [-1,1]:
  def shell(i,j):
   t=i/44;a=pi*j/30;y=-1.5+2.75*t
   length=(.80+.20*sin(pi*t)) if tubular else sin(pi*t)**.5
   x=s*(.55 if tubular else .60)*length*sin(a);z=(.04 if tubular else .23)+(.51 if tubular else .71)*length*cos(a)
   pigment=np.array(col)*(.78+.17*cos(t*39)+.12*cos(a*8)+.22*sin(a))
   if j>27:pigment*=1.40
   return b.v((x,y,z),pigment,'body',(j/30,t*2))
  b.grid(45,31,shell,0,False)
  # Fine raised growth lines and rolled hinge/lip are model geometry.
  for k in range(13):
   a=.10+k*pi/13;pts=[]
   for i in range(35):
    t=.015+.97*i/34;l=(.80+.20*sin(pi*t)) if tubular else sin(pi*t)**.5
    pts.append((s*(.553 if tubular else .603)*l*sin(a),-1.5+2.75*t,(.04 if tubular else .23)+(.513 if tubular else .713)*l*cos(a)))
   b.tube(pts,[.0038]*35,np.array(col)*1.23,'body',2,4)
  if tubular:
   for y in [-1.5,1.25]:
    pts=[(s*.55*.8*sin(pi*j/36),y,.04+.51*.8*cos(pi*j/36))for j in range(37)];b.tube(pts,[.022]*37,np.array(col)*1.5,'body',2,8)

def odaraia(b):
 col=(.19,.40,.34);b.n=12
 # 47 fine body divisions, skin animation grouped into 12 low-cost chain bones.
 for i in range(12):b.bone('segment_%02d'%i,(0,-1.45+i*.255,0),(0,-1.2+i*.255,0),'body' if i==0 else 'segment_%02d'%(i-1))
 for i in range(47):
  y=-1.48+i*.063;n='segment_%02d'%min(11,i//4);b.ell((0,y,0),(.16,.041,.145),(.20,.30,.18),n,0,16,6)
  for s in [-1,1]:
   n=b.bone('filter_%s_%02d'%(s,i),(s*.10,y,.04),(s*.36,y+.02,.32),'segment_%02d'%min(11,i//4));b.motion.append((n,'flap',i,s))
   b.tube([(s*.10,y,.04),(s*.30,y,.20),(s*.26,y,.36)],[.018,.015,.003],(.36,.48,.26),n,0,6)
   for j in range(4):
    o=Vector((s*(.15+j*.039),y,.10+j*.04));b.tube([o,o+Vector((-s*.035,.055,.08))],[.004,.0006],(.55,.57,.32),n,4,4)
 bivalve(b,col,True)
 b.ell((0,-1.62,.02),(.20,.20,.20),col,'body',0,32,16)
 for s in [-1,1]:
  n=b.bone('eye_'+str(s),(s*.1,-1.6,.04),(s*.62,-1.86,-.02),'body');b.motion.append((n,'eye',0,s));b.eye((s*.62,-1.86,-.02),.265,[(s*.1,-1.6,.04),(s*.39,-1.76,.02),(s*.62,-1.86,-.02)],n)
 for x,z in [(-.075,.02),(.075,.02),(0,.11)]:b.ell((x,-1.805,z),(.027,.013,.027),(.01,.025,.01),'body',3,12,8)
 for s in [-1,1]:
  n=b.bone('tail_'+str(s),(0,1.37,0),(s*.53,1.92,0),'segment_11');b.motion.append((n,'tail',0,s));fin(b,(0,1.37,0),(s*.90,2.12,.01),.30,(.31,.51,.31),n)
 n=b.bone('tail_vertical',(0,1.45,0),(0,1.95,-.45),'segment_11');b.motion.append((n,'tail',1,1));fin(b,(0,1.45,0),(0,2.22,-.62),.31,(.30,.50,.30),n,True)
 # Dorsal side down: ventral filter limbs point up and third tail blade down.
 return ['47 repeated trunk/limb pairs, arranged inside open tubular bivalved carapace; enlarged compound eyes, three median eye spots, three tail blades.','Inverted swimming is a reconstruction; filter limbs are directed upward. Limbs simplified to low-poly branch units, grouped body bones. Color speculative.']

def sidneyia(b):
 col=(.34,.22,.095);ringbody(b,12,-1.15,.255,.70,.22,col,True)
 b.ell((0,-1.39,.07),(.62,.43,.25),col,'body',0,44,20)
 for s in [-1,1]:
  n=b.bone('eye_'+str(s),(s*.43,-1.52,.09),(s*.58,-1.68,.20),'body');b.motion.append((n,'eye',0,s));b.eye((s*.58,-1.68,.20),.095,[(s*.43,-1.52,.09),(s*.53,-1.63,.17),(s*.58,-1.68,.20)],n)
  feeler(b,'antenna_'+str(s),[(s*(.40+.60*t),-1.63-1.32*t,.02+.16*sin(t*pi)) for t in [i/12 for i in range(13)]],'body',(.44,.31,.13))
 limbs(b,9,-1.06,.255,.86,(.35,.22,.105),12)
 for s in [-1,1]:
  n=b.bone('tail_'+str(s),(s*.10,1.85,0),(s*.40,2.30,.03),'segment_11');b.motion.append((n,'tail',0,s));fin(b,(s*.10,1.85,0),(s*.57,2.64,.02),.27,(.43,.30,.14),n)
 b.tube([(0,1.85,0),(0,2.22,.03),(0,2.70,.02)],[.16,.14,.001],col,'segment_11',0,12)
 return ['Broad convex head shield, nine broad thoracic segments and three narrow abdominal rings; segmented antennae, stalked eyes, paired tail flaps and triangular telson.','Nine jointed walking limb pairs carry enlarged toothed gnathobases; posterior five pairs also have fringed swimming exopods. Four anterior pairs lead crushing actions. Color speculative.']

def leanchoilia(b):
 col=(.29,.19,.37);ringbody(b,11,-.85,.235,.43,.22,col)
 b.ell((0,-1.18,.06),(.43,.43,.25),col,'body',0,40,18)
 for s in [-1,1]:
  for j in [0,1]:
   n=b.bone('eye_%s_%s'%(s,j),(s*(.15 if j else .30),-1.38,.08),(s*(.16 if j else .42),-1.49,.14),'body');b.motion.append((n,'eye',j,s));r=.053 if j else .095;b.eye((s*(.16 if j else .42),-1.49,.14),r,[(s*.2,-1.33,.08),(s*(.16 if j else .35),-1.41,.12),(s*(.16 if j else .42),-1.49,.14)],n)
  # Great appendage with 2-joint stout base and three separate elongated claws/flagella.
  o=Vector((s*.27,-1.37,-.07));el=Vector((s*.49,-1.64,-.28));tip=Vector((s*.53,-1.94,.18));n=b.bone('great_base_'+str(s),o,el,'body');b.motion.append((n,'great',0,s));b.tube([o,o.lerp(el,.3),el],[.10,.105,.069],np.array(col)*1.25,n,0,12)
  n2=b.bone('great_hand_'+str(s),el,tip,n);b.motion.append((n2,'great',1,s));b.tube([el,el.lerp(tip,.3),tip],[.079,.07,.043],np.array(col)*1.4,n2,0,12)
  for j in range(3):
   a=el.lerp(tip,.27+j*.32);pts=[a,a+Vector((s*(.09+j*.07),-.46,.20+j*.12)),a+Vector((s*(.16+j*.12),-.72,.26+j*.1))]
   bn=feeler(b,'claw_%s_%d'%(s,j),pts,n2,(.45,.32,.46),'great')[-1]
   q=pts[-1];pts2=[q+Vector((s*(.40*t+.13*(sin(t*pi+j)-sin(j))), -1.35*t, -.16*t+.16*(sin(t*pi+j*.3)-sin(j*.3)))) for t in [i/7 for i in range(8)]]
   feeler(b,'flagellum_%s_%d'%(s,j),pts2,bn,(.58,.42,.52),'whip')
 limbs(b,11,-.78,.235,.64,(.35,.23,.39),11,True)
 n=b.bone('tail',(0,1.65,0),(0,2.2,0),'segment_10');b.motion.append((n,'tail',0,1));fin(b,(0,1.65,0),(0,2.6,0),.20,(.41,.28,.42),n)
 for s in [-1,1]:
  for j in range(9):
   y=1.85+j*.07;x=s*.20*sin(pi*(y-1.65)/.95);b.tube([(x,y,0),(x+s*.06,y+.065,0)],[.01,.001],(.55,.39,.53),n,2,5)
 return ['11 serrated tergites with paired dorsal ridges; four eyes (two large lateral, two small median); jointed great appendages with three claws and long articulated flagella per side; biramous limbs; lanceolate serrated telson.','Great appendages sweep for prey then fold inward for feeding; whip tails have independent delayed animation. Color and combat extrapolated.']

def isoxys(b):
 col=(.24,.34,.43);b.n=13
 for i in range(13):
  y=-1.22+i*.182;b.bone('segment_%02d'%i,(0,y,-.07),(0,y+.182,-.07),'body' if i==0 else 'segment_%02d'%(i-1));b.ell((0,y,-.08),(.17,.125,.17),np.array(col)*.73,'segment_%02d'%i,0,14,6)
 bivalve(b,col)
 # Continuous anterior and posterior cardinal spines grow from dorsal hinge.
 for y,end in [(-1.36,-2.67),(1.12,2.5)]:
  b.tube([(0,y,.46),(0,y+(end-y)*.25,.63),(0,end,.69)],[.14,.09,.001],np.array(col)*1.3,'body',0,16)
 for s in [-1,1]:
  n=b.bone('eye_'+str(s),(s*.18,-1.32,.03),(s*.54,-1.57,-.01),'body');b.motion.append((n,'eye',0,s));b.eye((s*.54,-1.57,-.01),.17,[(s*.18,-1.32,.03),(s*.41,-1.46,0),(s*.54,-1.57,-.01)],n)
  pts=[Vector((s*.20,-1.31,-.16)),Vector((s*.36,-1.55,-.39)),Vector((s*.40,-1.84,-.44)),Vector((s*.36,-2.07,-.32)),Vector((s*.27,-2.22,-.15)),Vector((s*.19,-2.16,-.02))];parent='body'
  for k in range(5):
   n=b.bone('raptor_%s_%d'%(s,k),pts[k],pts[k+1],parent);parent=n;b.motion.append((n,'raptor',k,s));b.tube([pts[k],pts[k].lerp(pts[k+1],.25),pts[k+1]],[.074*(1-k*.13),.07*(1-k*.13),.001 if k==4 else .038],np.array(col)*1.3,n,0,12)
   if 1<=k<=3:
    q=pts[k].lerp(pts[k+1],.55);b.tube([q,q+Vector((-s*.08,.035,.14))],[.033,.001],(.51,.51,.33),n,2,8)
 limbs(b,13,-1.20,.182,.56,(.25,.38,.44),13,True)
 for s in [-1,1]:
  n=b.bone('tail_'+str(s),(s*.06,1.12,-.08),(s*.29,1.72,-.12),'segment_12');b.motion.append((n,'tail',0,s));fin(b,(s*.06,1.12,-.08),(s*.42,1.88,-.11),.15,(.32,.47,.51),n)
 return ['Paired rounded valves and conspicuous anterior/posterior cardinal spines; bulbous lateral eyes; five-part uniramous frontal graspers with three stout endites; 13 paired biramous paddling limbs and a tailfan.','Model represents I. acutangulus, avoiding the extreme spines of I. longissimus. Color and attack behavior reconstructed.']

def finish(b,notes):
 mesh=bpy.data.meshes.new(b.id+' anatomy');mesh.from_pydata(b.V,[],b.F);mesh.update();obj=bpy.data.objects.new(b.id,mesh);bpy.context.collection.objects.link(obj)
 # glTF multiplies the image base color with COLOR_0. Neutral albedo preserves species pigments.
 texpath=os.path.join(ROOT,'tools/creatures/textures/chitin-albedo.png')
 for mi,mat in enumerate(b.mats):
  if mi in (0,1,2) and os.path.exists(texpath):
   tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=bpy.data.images.load(texpath,check_existing=True);tx.image.pack()
   vc=next(n for n in mat.node_tree.nodes if n.type=='VERTEX_COLOR');mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
   mat.node_tree.links.new(tx.outputs['Color'],mix.inputs[1]);mat.node_tree.links.new(vc.outputs['Color'],mix.inputs[2]);mat.node_tree.links.new(mix.outputs[0],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
  mesh.materials.append(mat)
 for p,m in zip(mesh.polygons,b.M):p.material_index=m;p.use_smooth=True
 col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');col.data.foreach_set('color',np.array(b.C,np.float32).ravel())
 uv=mesh.uv_layers.new(name='UVMap');uv.data.foreach_set('uv',np.array([b.U[l.vertex_index]for l in mesh.loops],np.float32).ravel())
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.ops.triangulate(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 arm=bpy.data.armatures.new(b.id+' anatomical rig');rig=bpy.data.objects.new(b.id+'_rig',arm);bpy.context.collection.objects.link(rig)
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for name,(h,t,parent) in b.B.items():
  bone=arm.edit_bones.new(name);bone.head=h;bone.tail=t
  if parent:bone.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');groups={n:obj.vertex_groups.new(name=n)for n in b.B};buckets={}
 for i,w in enumerate(b.W):
  for name,v in w.items():
   if v>0:buckets.setdefault((name,round(v,5)),[]).append(i)
 for (name,v),inds in buckets.items():groups[name].add(inds,v,'REPLACE')
 mod=obj.modifiers.new('Anatomical skin','ARMATURE');mod.object=rig;obj.parent=rig
 rig.show_in_front=True;arm.display_type='STICK';scene=bpy.context.scene;scene.render.fps=30;rig.animation_data_create()
 for pb in rig.pose.bones:pb.rotation_mode='XYZ'
 def reset():
  for pb in rig.pose.bones:pb.location=(0,0,0);pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
 clips=dict(CLIPS)
 if b.id=='sidneyia':clips['Crawl']=2.0
 loops={'Idle','Swim','Crawl','Guard','Eat','Ability','Moult'};seams={};finite={};bounding={}
 for clip,duration in clips.items():
  reset();a=bpy.data.actions.new(clip);a.use_fake_user=True;rig.animation_data.action=a;last=round(duration*30);first=None
  for frame in range(last+1):
   u=frame/last;phase=2*pi*u;reset();pb=rig.pose.bones;oneshot=clip not in loops;env=sin(pi*u)**2 if oneshot else 1
   moving=clip in ('Swim','Crawl');amp=.85 if moving else .16
   if clip=='Ability':amp=.65
   if clip=='Moult':amp=.28
   if oneshot:amp*=env
   death=(u*u*(3-2*u)) if clip=='Death' else 0
   if clip=='Death':amp=.2*(1-death)*sin(pi*u)
   # Smooth attack envelopes: readable wind-up followed by much faster strike.
   wind=sin(pi*u/.42)**2 if u<.42 else 0
   strike=sin(pi*(u-.36)/.34)**2 if .36<u<.70 else 0
   bite=sin(pi*min(1,max(0,(u-.10)/.65)))**2
   attack=(strike-.45*wind) if clip in ('Heavy','Attack') else bite if clip=='Bite' else 0
   hit=env*(.65+.35*sin(phase*2)) if clip in ('Hit','Stagger') else 0
   guard=(.6+.04*sin(phase)) if clip=='Guard' else 0
   for i in range(b.n):
    pose=pb['segment_%02d'%i];pose.rotation_euler.z=.009*amp*sin(phase-i*.39);pose.rotation_euler.x=.008*amp*sin(phase-i*.32)
    if clip in ('TurnLeft','TurnRight'):pose.rotation_euler.z+=(-1 if clip=='TurnLeft' else 1)*.034*env
    if clip in ('Dive','Rise'):pose.rotation_euler.x+=(-1 if clip=='Dive' else 1)*.027*env
    if clip=='Dodge':pose.rotation_euler.z+=.075*env*sin(i*.15+.5)
    pose.rotation_euler.x+=.016*attack+.04*hit*sin(i*.42)+.025*death
    if clip=='Moult':pose.rotation_euler.x+=.015*sin(phase*3-i*.4)
   for name,kind,i,s in b.motion:
    pose=pb[name];p=phase*2-i*.55
    if kind=='flap':
     pose.rotation_euler.x=s*.26*amp*sin(p);pose.rotation_euler.z=.10*amp*cos(p)
     if clip=='Ability' and b.id=='odaraia':pose.rotation_euler.x+=s*.12
     pose.rotation_euler.x+=s*(.17*attack+.23*death)
    elif kind=='leg':
     seg=i%3;leg=i//3;ph=phase*2-leg*.75+(pi if s<0 else 0)
     pose.rotation_euler.z=s*(.26 if seg==0 else .13)*amp*sin(ph);pose.rotation_euler.x=.19*amp*cos(ph+.5*seg)
     if leg<4 and b.id=='sidneyia':
      pose.rotation_euler.z+=-s*(.52 if seg==0 else .20)*attack
      if clip=='Ability':pose.rotation_euler.z+=-s*(.24+.13*sin(phase*2-leg*.7))
      if clip=='Eat':pose.rotation_euler.z+=-s*(.2+.12*sin(phase*2-leg*.7))
     pose.rotation_euler.x+=.20*guard+.50*death+.2*hit
    elif kind in ('great','raptor'):
     pose.rotation_euler.x=.025*amp*sin(p);pose.rotation_euler.z=s*.04*amp*cos(p)
     pose.rotation_euler.x+=(.60 if kind=='great' and i<2 else .25)*attack
     pose.rotation_euler.z+=-s*(.30 if i<2 else .12)*attack
     if clip=='Ability':pose.rotation_euler.z+=s*(.18+.14*sin(phase-i*.8));pose.rotation_euler.x+=.12*cos(phase-i*.4)
     if clip=='Eat':pose.rotation_euler.x+=.18+.15*sin(phase*2-i*.6);pose.rotation_euler.z-=s*.12
     pose.rotation_euler.x+=.27*guard+.34*death+.25*hit
    elif kind in ('antenna','whip'):
     pose.rotation_euler.z=s*(.035 if kind=='whip' else .025)*sin(phase-i*.4)*amp;pose.rotation_euler.x=.028*sin(phase-i*.5)*amp
     pose.rotation_euler.x+=.055*attack*sin(i*.7)+.06*death
     if clip=='Ability' and kind=='whip':pose.rotation_euler.z+=s*.038*sin(phase-i*.6)
    elif kind=='tail':
     pose.rotation_euler.x=s*.13*amp*sin(phase-i*.4);pose.rotation_euler.z=.07*amp*sin(phase)
     if clip in ('Dodge','Parry'):pose.rotation_euler.x+=s*.6*env
     pose.rotation_euler.x+=s*.25*attack+s*.2*guard+s*.34*death
     if clip=='Ability' and b.id=='isoxys':pose.rotation_euler.x+=s*.22
    elif kind=='eye':pose.rotation_euler.z=s*.05*amp*sin(phase+i);pose.rotation_euler.x=.04*amp*cos(phase)
    if clip=='Parry':pose.rotation_euler.z+=s*.17*env
    if clip=='Stagger':pose.rotation_euler.z+=.09*hit*sin(i*1.8)
   body=pb['body'];body.rotation_euler.x=.022*amp*sin(phase)+.10*attack+.12*hit;body.rotation_euler.y=.8*death
   if clip=='Dodge':body.rotation_euler.y=.23*env;body.location.x=.06*env
   if clip=='Eat':body.rotation_euler.x=-.11+.018*sin(phase*2)
   if clip=='Guard':body.rotation_euler.x=-.05
   if clip=='Stagger':body.rotation_euler.y+=.30*env*sin(pi*u)
   if clip=='Ability' and b.id=='odaraia':body.rotation_euler.x=.055*sin(phase)
   if clip=='Ability' and b.id=='isoxys':body.rotation_euler.x=.025*sin(phase*2)
   rots=np.array([tuple(p.rotation_euler) for p in pb]);locs=np.array([tuple(p.location)for p in pb]);vals=np.concatenate([rots,locs])
   if frame==0:first=vals.copy()
   if frame==last:seams[clip]=float(abs(vals-first).max())
   for pose in pb:
    pose.keyframe_insert('rotation_euler',frame=frame)
    if pose.name=='body':pose.keyframe_insert('location',frame=frame)
  for layer in a.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for fc in bag.fcurves:
      for key in fc.keyframe_points:key.interpolation='LINEAR'
  positions=[]
  for fr in [0,last//3,last//2,last*2//3,last]:
   scene.frame_set(fr);dg=bpy.context.evaluated_depsgraph_get();ev=obj.evaluated_get(dg);me=ev.to_mesh();arr=np.array([tuple(v.co) for v in me.vertices]);positions.append(arr);ev.to_mesh_clear()
  finite[clip]=all(np.isfinite(p).all()for p in positions);bounding[clip]=[np.min(np.concatenate(positions),axis=0).tolist(),np.max(np.concatenate(positions),axis=0).tolist()]
  rig.animation_data.action=None
  if clip!='Death':assert seams[clip]<1e-5,(b.id,clip,seams[clip])
 reset();scene.frame_set(0)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
 # Separate export copy per material to preserve vertex colors in Blender 5.
 temp=obj.copy();temp.data=obj.data.copy();bpy.context.collection.objects.link(temp);obj.select_set(False);rig.select_set(False);temp.select_set(True);bpy.context.view_layer.objects.active=temp
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT');parts=list(bpy.context.selected_objects)
 for part in parts:
  bpy.context.view_layer.objects.active=part;bpy.ops.object.material_slot_remove_unused();part.parent=None;part.name=b.id+' '+part.data.materials[0].name
 rig.select_set(True);bpy.context.view_layer.objects.active=rig
 path=os.path.join(OUT,b.id+'.glb')
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_normals=True,export_tangents=True,export_texcoords=True,export_materials='EXPORT',export_vertex_color='NAME',export_vertex_color_name='Color',export_yup=True)
 for part in parts:data=part.data;bpy.data.objects.remove(part,do_unlink=True);bpy.data.meshes.remove(data)
 raw=open(path,'rb').read();jslen=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jslen]);names=[a['name']for a in g.get('animations',[])];assert set(clips)==set(names),(b.id,names)
 # If exporter does not recognize a multiplied shader tree, set standard glTF texture explicitly.
 # At least normal and albedo textures must actually be embedded in the final GLB.
 texturecheck=[('baseColorTexture' in m.get('pbrMetallicRoughness',{}),'normalTexture'in m)for m in g['materials']]
 assert all(finite.values())
 world=bpy.data.worlds.new('Specimen studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.014,.028,.035,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
 for name,pos,power,size,color in [('Key',(2,-4,6),1100,4,(1,.88,.73)),('Fill',(-4,-2,3),900,4,(.58,.79,1)),('Rim',(3,4,4),1400,3,(.67,.92,1))]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=pos;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
 camdata=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camdata);bpy.context.collection.objects.link(cam);scene.camera=cam;cam.location=(6,-7,5.8);look=Vector((0,-.6 if b.id=='leanchoilia' else 0,0));cam.rotation_euler=(look-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=6.7 if b.id=='leanchoilia' else 5.7
 scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1120;scene.render.resolution_y=840;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.frame_start=0;scene.frame_end=72
 rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_set(0);scene.render.film_transparent=True
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(LOCAL,b.id+'.blend'));scene.render.filepath=os.path.join(OUT,b.id+'.card.png');bpy.ops.render.render(write_still=True)
 scene.render.film_transparent=False;scene.render.filepath=os.path.join(OUT,b.id+'.png');bpy.ops.render.render(write_still=True)
 # Review sheets retain consistent camera while exposing high-action deformations.
 for clip,fr in [('Heavy',17),('Ability',12),('Dodge',6),('Death',48)]:
  rig.animation_data.action=bpy.data.actions[clip];scene.frame_set(fr);scene.render.resolution_percentage=65;scene.render.filepath=os.path.join(LOCAL,b.id+'-'+clip+'.png');bpy.ops.render.render(write_still=True)
 report={'id':b.id,'orientation':'glTF +Y up +Z forward','clips':{c:{'frames':round(t*30),'duration':round(t*30)/30,'loop':c in loops}for c,t in clips.items()},'bones':len(b.B),'vertices':len(b.V),'triangles':len(mesh.polygons),'glbBytes':len(raw),'notes':notes,'source':'https://burgess-shale.rom.on.ca/fossils/'+{'odaraia':'odaraia-alata','sidneyia':'sidneyia-inexpectans','leanchoilia':'leanchoilia-superlata','isoxys':'isoxys-acutangulus'}[b.id]+'/','validation':{'finiteAllClips':finite,'endpointSeams':seams,'sampledBounds':bounding,'materialTextures':texturecheck,'rootMotion':False,'animatedScale':False,'visualInspection':False}}
 open(os.path.join(LOCAL,b.id+'.json'),'w').write(json.dumps(report,indent=2));print('ARTHROPOD_REPORT',b.id,len(b.B),len(b.V),len(mesh.polygons),texturecheck,flush=True)

if __name__=='__main__':
 ids=sys.argv[sys.argv.index('--')+1:] if '--'in sys.argv else ['odaraia','sidneyia','leanchoilia','isoxys']
 for id in ids:
  b=Builder(id);notes=globals()[id](b);finish(b,notes)
