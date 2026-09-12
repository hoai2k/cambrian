"""Palaeoisopus: individually proportioned Hunsrück pycnogonid, after Sabroux2024 figs14–19."""
import numpy as np
from math import sin,cos,pi
from mathutils import Vector

def make(g):
 vertex,face,grid,bone,tube=(g[k]for k in ['vertex','face','grid','bone','tube']);g['appendages']={};g['roots']=[]
 def art(n,p,q,parent):
  p,q=Vector(p),Vector(q);g['B'][n]=(p,q if(q-p).length>.02 else p+Vector((0,.1,0)),parent)
 def shell(p,q,width,depth,w,mat=0,bulge=.1,angle=0,nr=17,nc=24,ornament=0):
  p,q=Vector(p),Vector(q);tangent=(q-p).normalized();a=tangent.cross(Vector((0,0,1)))
  if a.length<.01:a=Vector((1,0,0))
  a.normalize();b=tangent.cross(a);a,b=a*cos(angle)+b*sin(angle),b*cos(angle)-a*sin(angle)
  def v(i,j):
   t=i/(nr-1);u=j/nc;ang=2*pi*u;f=.24+.76*sin(pi*t)**.37;r=1+bulge*sin(pi*t)+.017*sin(ang*5+t*9);c=p.lerp(q,t);c.z+=.018*sin(pi*t)
   ridge=ornament*(np.exp(-((t-.13)/.055)**2)+np.exp(-((t-.88)/.055)**2));sc=f*r+ridge;pt=c+a*(width*cos(ang)*sc)+b*(depth*sin(ang)*sc)
   return vertex(pt,(1,1,1),w,(u,t),False)
  rows=grid(nr,nc,v,mat,True);face(reversed(rows[0]),mat);face(rows[-1],mat)
 def ball(p,r,w,mat=1):g['ell'](p,r,(1,1,1),w,mat)
 # Fused cephalon/trunk1 and three posterior tergites, each with true thickened edges.
 bodySpecs=[(-.77,-.08,.41,.17),(-.09,.31,.33,.15),(.29,.65,.285,.13),(.63,.96,.24,.12)]
 for k,(y0,y1,w,d)in enumerate(bodySpecs):
  name='body'if k==0 else'trunk'+str(k);art(name,(0,y0,0),(0,y1,0),'body')if k else None
  shell((0,y0,0),(0,y1,0),w,d,name,0,.025,0,24,40,.055)
  if k>0:ball((0,y0,.005),(w*.89,.09,d*.83),{'body':.25,name:.75},1)
  # Fossil V-shaped dorsal tuberculation, kept cuticular and low.
  for side in [-1,1]:
   for j in range(5):ball((side*(.045+j*w*.13),y0+.10+j*.024,d*.91),(.022,.023,.014),name,0)
 # Low sensory/ornamental features, explicitly not exposed eyeballs.
 for x,y,r in [(0,-.64,.046),(-.077,-.585,.032),(.077,-.585,.032),(0,-.545,.028),(-.095,-.49,.038),(.095,-.49,.038),(0,-.34,.025)]:ball((x,y,.157),(r,r*.8,.017),'body',0)
 # Abdomen: four increasingly elongate rectangular elements and a lanceolate fifth/telson complex.
 ys=[.89,1.26,1.72,2.18,2.63,4.10];ww=[.165,.150,.127,.095,.072]
 for i in range(5):
  name='abdomen'+str(i);par='trunk3'if i==0 else'abdomen'+str(i-1);art(name,(0,ys[i],0),(0,ys[i+1],0),par);shell((0,ys[i],0),(0,ys[i+1],-.035*i/5),ww[i],.075 if i<4 else .040,name,0,.02,0,22,24,.10 if i<4 else .02)
  if i<4:ball((0,ys[i],0),(ww[i]*.89,.07,.060),name,1)
  for side in [-1,1]:
   for j in range(6 if i<4 else 13):
    t=(j+1)/(7 if i<4 else 14);y=ys[i]+(ys[i+1]-ys[i])*t;x=side*ww[i]*.88*(.24+.76*sin(pi*t)**.37);p=Vector((x,y,.018*sin(pi*t)-.035*i/5*t));tube([p,p+Vector((side*.035,.035,-.025)),p+Vector((side*.052,.07,-.02))],[.003,.002,.0004],(1,1,1),name,2,4)
 # Tubular ventral proboscis, posteriorly folded at rest, with a true recessed lumen.
 pts=[Vector((0,-.54,-.15)),Vector((0,-.42,-.30)),Vector((0,-.11,-.42)),Vector((0,.18,-.44)),Vector((0,.38,-.44))];n=40;rows=[]
 for i in range(29):
  t=i/28;q=t*4;k=min(3,int(q));p=pts[k].lerp(pts[k+1],q-k);tangent=(pts[min(4,k+1)]-pts[k]).normalized();a=Vector((1,0,0));b=tangent.cross(a);rad=.135*(.95+.05*sin(pi*t));w={'proboscis':1-float(max(0,(t-.75)/.25)),'oralTip':float(max(0,(t-.75)/.25))};row=[]
  for j in range(n):ang=j*2*pi/n;row.append(vertex(p+rad*(a*cos(ang)+b*sin(ang)),(1,1,1),w,(j/n,t),False))
  rows.append(row)
 for i in range(28):
  for j in range(n):face((rows[i][j],rows[i][(j+1)%n],rows[i+1][(j+1)%n],rows[i+1][j]),0)
 face(reversed(rows[0]),0)
 # Lumen turns back into the tube, no teeth or broad hinged jaw.
 inner=[]
 for i in range(10):
  t=i/9;rad=.135*(1-.80*t);p=pts[-1]+Vector((0,-.29*t,0));inner.append([vertex(p+Vector((rad*cos(2*pi*j/n),0,-rad*sin(2*pi*j/n))),(1,1,1),'oralTip',(j/n,t),False)for j in range(n)])
 for j in range(n):face((rows[-1][j],rows[-1][(j+1)%n],inner[0][(j+1)%n],inner[0][j]),4)
 for i in range(9):
  for j in range(n):face((inner[i][j],inner[i+1][j],inner[i+1][(j+1)%n],inner[i][(j+1)%n]),4)
 face(inner[-1],4)
 # Four paired walking/swimming appendages. WL1 has one fewer distal article.
 paths=[[(.31,-.39,0),(.75,-.4,0),(1.16,-.45,.02),(1.37,-.56,.04),(1.56,-.68,.03),(2.27,-1.03,.06),(2.73,-1.56,.02),(2.98,-2.04,-.04),(3.03,-2.55,-.10),(2.85,-2.74,-.13)],[(.27,.15,0),(.50,.18,0),(1.31,.71,.02),(1.46,.78,.015),(1.64,.66,.02),(2.12,.19,.03),(2.60,-.10,0),(2.96,-.07,-.04),(3.20,.09,-.07),(3.27,.27,-.11),(3.18,.39,-.13)],[(.24,.53,-.01),(.44,.55,-.01),(1.22,1.27,0),(1.36,1.36,0),(1.51,1.28,.01),(1.95,.92,.01),(2.40,.79,-.03),(2.72,.85,-.06),(2.96,1.03,-.10),(3.0,1.23,-.14),(2.91,1.36,-.16)],[(.20,.83,-.015),(.39,.87,-.015),(.85,1.68,0),(.99,1.79,0),(1.12,1.88,0),(1.58,1.96,0),(1.94,2.15,-.04),(2.20,2.45,-.08),(2.27,2.77,-.12),(2.16,2.99,-.16),(2.04,3.07,-.18)]]
 for pair,path in enumerate(paths):
  for side in [-1,1]:
   tag='WL'+str(pair+1)+('L'if side>0 else'R');pts=[Vector((side*x,y,z))for x,y,z in path];names=[];parent='body'if pair==0 else'trunk'+str(pair);g['roots'].append((tag,list(pts[0])))
   for j in range(len(pts)-1):
    name=tag+'_'+str(j);names.append(name);art(name,pts[j],pts[j+1],parent if j==0 else names[j-1]);length=(pts[j+1]-pts[j]).length;last=j==len(pts)-2
    if j==0:width,depth=.12,.12
    elif j==1:width,depth=(.15,.11)if pair==0 else(.055,.065)
    elif j in [2,3]:width,depth=.09,.11
    elif last:width,depth=.024,.04
    else:width,depth=(.065,.185)if pair==0 else(.042,.12)
    if last:
     tip=pts[j+1];tube([pts[j],pts[j].lerp(tip,.5)+Vector((0,0,-.027)),tip],[.038,.020,.0009],(1,1,1),name,2,10)
    else:shell(pts[j],pts[j+1],width,depth,name,0,.02,side*.57,20 if j>=4 else 14,24,.07 if j<4 else .02)
    if j>0:ball(pts[j],(min(width,.08),min(width,.08),min(depth,.08)),{names[j-1]:.5,name:.5},1)
    # Coxa1 rings are cuticular divisions, not invented extra articulated segments.
    if j==0:
     for k in range([4,3,2,2][pair]):
      p=pts[j].lerp(pts[j+1],(k+.6)/([4,3,2,2][pair]+.2));shell(p-Vector((side*.015,0,0)),p+Vector((side*.015,0,0)),.125,.13,name,0,0,0,7,24,0)
    if 4<=j<len(pts)-2:
     tangent=(pts[j+1]-pts[j]).normalized();across=Vector((-tangent.y,tangent.x,0));count=7 if pair else 4
     for k in range(count):
      t=.22+.65*k/max(1,count-1);center=pts[j].lerp(pts[j+1],t);center.z+=.018*sin(pi*t);ext=(.13 if pair else .06)*(1-.25*k/count);aa=tangent.cross(Vector((0,0,1))).normalized();bb=tangent.cross(aa);aa,bb=aa*cos(side*.57)+bb*sin(side*.57),bb*cos(side*.57)-aa*sin(side*.57)
      for row in [-1,1]:
       ang=pi/2+row*.14;sc=(.24+.76*sin(pi*t)**.37)*(1+.02*sin(pi*t)+.017*sin(ang*5+t*9))+.02*(np.exp(-((t-.13)/.055)**2)+np.exp(-((t-.88)/.055)**2));offset=aa*(width*cos(ang)*sc)+bb*(depth*sin(ang)*sc);base=center+offset*.92;outward=offset.normalized();tip=base+outward*ext+tangent*.025;tube([base,base.lerp(tip,.55),tip],[.0037,.0023,.00035],(1,1,1),name,2,4)
   g['appendages'][tag]=names
 # Chelifores: two scapes, massive chela and movable finger; no scorpion tail.
 for side in [-1,1]:
  tag='L'if side>0 else'R';pts=[Vector((side*.23,-.72,.01)),Vector((side*.48,-.95,.05)),Vector((side*.56,-1.22,.08)),Vector((side*.35,-1.56,.04))];names=['scape1'+tag,'scape2'+tag,'chela'+tag]
  for i,name in enumerate(names):art(name,pts[i],pts[i+1],'body'if i==0 else names[i-1]);shell(pts[i],pts[i+1],.09 if i<2 else .17,.065 if i<2 else .09,name,0,.04,0,18,24,.07 if i<2 else .015)
  root=pts[-1];fixed=[root,root+Vector((-side*.12,-.13,-.005)),root+Vector((-side*.17,-.08,-.025))];tube(fixed,[.075,.036,.002],(1,1,1),names[-1],0,14)
  name='finger'+tag;art(name,root+Vector((side*.10,.04,0)),root+Vector((side*.05,-.20,0)),names[-1]);pts2=[root+Vector((side*.10,.04,0)),root+Vector((side*.12,-.12,-.01)),root+Vector((-side*.13,-.16,-.025))];tube(pts2,[.066,.045,.0015],(1,1,1),name,0,14)
 # Palps point anteriorly/laterally; clawless. Ovigers curl ventrally, terminating in small claws.
 for ov in [False,True]:
  for side in [-1,1]:
   tag=('oviger'if ov else'palp')+('L'if side>0 else'R');num=11 if ov else 9;pts=[]
   for j in range(num+1):
    t=j/num
    if ov:p=Vector((side*(.18+.38*sin(pi*t)), -.34-.57*sin(pi*t*.95),-.15-.21*sin(pi*t)+.05*t))
    else:p=Vector((side*(.30+1.08*t),-.64-.16*sin(pi*t)-.12*t,-.01+.06*sin(pi*t)))
    pts.append(p)
   names=[]
   for j in range(num):
    name=tag+str(j);art(name,pts[j],pts[j+1],'body'if j==0 else names[-1]);names.append(name);r=(.035 if ov else .045)*(1-.42*j/num)
    shell(pts[j],pts[j+1],r,r*.85,name,0,.035,0,9,14,.11)
    if j>0:ball(pts[j],(r*.73,)*3,{names[j-1]:.5,name:.5},1)
   if ov:tube([pts[-1],pts[-1]+Vector((0,.06,.04)),pts[-1]+Vector((0,.08,.09))],[.027,.014,.0005],(1,1,1),names[-1],2,8)
   g['appendages'][tag]=names
