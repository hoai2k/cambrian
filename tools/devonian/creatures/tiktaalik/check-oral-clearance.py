"""Analytic neutral oral-floor clearance against the continuous external mandibular surface.

TIKTAALIK_ANATOMY (default anatomy_v2) selects the anatomy module; TIKTAALIK_CHECK_SUFFIX
(default v2) selects the report filename (oral-clearance-<suffix>.json), so a v3 candidate can be
checked without overwriting the v2 report.
"""
import importlib,os,sys,math,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
ANATOMY=os.environ.get('TIKTAALIK_ANATOMY','anatomy_v2');SUFFIX=os.environ.get('TIKTAALIK_CHECK_SUFFIX','v2')
_mod=importlib.import_module(ANATOMY);surf,section,oralPoint,physical_y=_mod.surf,_mod.section,_mod.oralPoint,_mod.physical_y
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
report['anatomySourceSha256']=hashlib.sha256(open(os.path.join(os.path.dirname(__file__),ANATOMY+'.py'),'rb').read()).hexdigest()
open(os.path.join(os.path.dirname(__file__),'oral-clearance-'+SUFFIX+'.json'),'w').write(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
