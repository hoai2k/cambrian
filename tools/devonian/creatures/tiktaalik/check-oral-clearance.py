"""Analytic neutral oral-floor clearance against the continuous external mandibular surface."""
import os,sys,math,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from anatomy_v2 import surf,section,oralPoint,physical_y
records=[]
for i in range(1,26):
 t=i/30
 for j in range(25):
  a=-math.pi/2+(j-12)*.10;p=oralPoint(t,a);lo=-2.8;hi=-.25
  for step in range(35):
   y=(lo+hi)/2;w,h,z=section(y);aa=-math.acos(max(-1,min(1,p.x/w)));q=surf(y,aa)
   if physical_y(q[1])<p.y:lo=y
   else:hi=y
  clearance=p.z-q[2];records.append({'t':t,'angle':a,'clearance':float(clearance),'floor':list(p),'outer':list(map(float,q))})
report={'neutralFloorSamples':len(records),'negativeSamples':sum(r['clearance']<0 for r in records),'minimum':min(records,key=lambda r:r['clearance']),'worst':sorted(records,key=lambda r:r['clearance'])[:12]}
import hashlib
report['anatomySourceSha256']=hashlib.sha256(open(os.path.join(os.path.dirname(__file__),'anatomy_v2.py'),'rb').read()).hexdigest()
open(os.path.join(os.path.dirname(__file__),'oral-clearance-v2.json'),'w').write(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
