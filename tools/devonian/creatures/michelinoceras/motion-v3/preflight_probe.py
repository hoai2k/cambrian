import json,struct,sys,math
from pathlib import Path
import numpy as np
from scipy.spatial.transform import Rotation as R
repo=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo');h=repo/'tools/devonian/creatures/michelinoceras/motion-v3';sys.path.insert(0,str(h));import performance as m
b=(repo.parent/'devonian-authoring/michelinoceras/v1/candidate/michelinoceras.glb').read_bytes();g=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]);nodes=g['nodes'];named={n['name']:i for i,n in enumerate(nodes)};parents={c:i for i,n in enumerate(nodes) for c in n.get('children',[])}
def matrix(n):
 a=np.eye(4);a[:3,:3]=R.from_quat(n.get('rotation',[0,0,0,1])).as_matrix();a[:3,3]=n.get('translation',[0,0,0]);return a
local=[matrix(n) for n in nodes]
def world(i):return world(parents[i])@local[i] if i in parents else local[i]
head=world(named['head']); conversion=np.array([[1,0,0],[0,0,1],[0,-1,0]])
rows=[]
for frame in range(43):
 t=frame/42;reach,_,_=m.soft_pose('Eat',t);hp=head.copy();hp[:3,3]+=head[:3,:3]@np.array([0,-reach,0]);center=conversion@np.array(m.carry_center(t))+hp[:3,3]-head[:3,3]
 for arm in range(10):
  pos=[];rot=[];parent=hp.copy();th=2*math.pi*arm/10+math.pi/10;rad=conversion@np.array([math.cos(th),0,math.sin(th)])
  for j in range(13):
   n=named[f'arm_{arm}_{j:02d}'];pm=np.eye(4);pm[:3,:3]=R.from_euler('xyz',m.section_pose('Eat',t,arm,j)).as_matrix();parent=parent@local[n]@pm;pos.append(parent[:3,3].copy());rot.append(parent[:3,:3].copy())
  rest=world(named[f'arm_{arm}_12']);nextp=local[named[f'arm_{arm}_13']][:3,3];lc=nextp-rest[:3,:3].T@rad*(.025 if arm==0 else .008)
  point=pos[-1]+rot[-1]@lc;c=m.smooth(t,.22,.78);target=center if arm==0 else center+rad*(.080-.029*c);weight=m.smooth(t,.015+(arm%3)*.012,.22);dest=point+(target-point)*weight
  for _ in range(40):
   for j in range(12,-1,-1):
    a,z=point-pos[j],dest-pos[j];a/=np.linalg.norm(a);z/=np.linalg.norm(z);axis=np.cross(a,z);length=np.linalg.norm(axis)
    if length<1e-9:continue
    angle=min(.13,math.atan2(length,np.dot(a,z)));q=R.from_rotvec(axis/length*angle).as_matrix();point=pos[j]+q@(point-pos[j])
    for k in range(j,13):
     rot[k]=q@rot[k]
     if k>j:pos[k]=pos[j]+q@(pos[k]-pos[j])
   if np.linalg.norm(point-dest)<.0015:break
  residual=float(np.linalg.norm(point-dest));rows.append({'progress':t,'arm':arm,'error':residual})
report={'method':'Non-Blender scipy FK/CCD sanity probe using actual v1 GLB rest transforms and motion-v3 timing. Not visual or export acceptance.','maxLeadGraspErrorAfterPickup':max(x['error'] for x in rows if x['progress']>=.22 and x['arm']==0),'maxErrorAfterPickup':max(x['error'] for x in rows if x['progress']>=.22),'worst':sorted(rows,key=lambda x:x['error'],reverse=True)[:12]}
(h/'preflight-contact-probe.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
