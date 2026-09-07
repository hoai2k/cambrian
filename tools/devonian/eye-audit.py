"""Audit actual exported eye volume against the continuous head envelope.
Run in Blender: blender --background --threads 2 --python tools/devonian/eye-audit.py -- DIRECTORY
No creature authoring files are imported or executed. See eye-audit.README.md.
"""
import bpy, json, sys, math, hashlib
from pathlib import Path
from collections import defaultdict
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ARGS=sys.argv[sys.argv.index('--')+1:]; DIRECTORY=Path(ARGS[0]); N=120000
SELECTORS=json.loads(Path(ARGS[1]).read_text()) if len(ARGS)>1 else {}
DIRECTIONS=[Vector(x).normalized()for x in [(1,.371,.127),(-.237,1,.413),(.193,-.271,1)]]
HEAD_NAMES={'dunkleosteus':'Cranial shield soft foundation','bothriolepis':'Joined cephalothoracic cuirass'}
def components(m):
 # Weld only coincident positions; glTF UV seams otherwise appear falsely open.
 pos=[];lookup={};remap=[]
 for p in m['positions']:
  key=tuple(round(v,6)for v in p)
  if key not in lookup:lookup[key]=len(pos);pos.append(p)
  remap.append(lookup[key])
 faces=[];adj=defaultdict(set)
 for k in range(0,len(m['indices']),3):
  f=tuple(remap[x]for x in m['indices'][k:k+3])
  if len(set(f))<3:continue
  if (Vector(pos[f[1]])-Vector(pos[f[0]])).cross(Vector(pos[f[2]])-Vector(pos[f[0]])).length<1e-13:continue
  faces.append(f)
  for a,b in zip(f,f[1:]+f[:1]):adj[a].add(b);adj[b].add(a)
 unseen=set(adj);comps=[]
 while unseen:
  seed=min(unseen);stack=[seed];members={seed};unseen.remove(seed)
  while stack:
   for v in adj[stack.pop()]:
    if v in unseen:unseen.remove(v);members.add(v);stack.append(v)
  local={v:i for i,v in enumerate(sorted(members))}
  comps.append({'positions':[pos[v]for v in sorted(members)],'faces':[tuple(local[v]for v in f)for f in faces if f[0]in members],'mesh':m['name'],'material':m['material']})
 return sorted(comps,key=lambda c:len(c['faces']),reverse=True)
def close_envelope(c):
 p=list(map(Vector,c['positions']));f=c['faces'][:];edges=defaultdict(int)
 for t in f:
  for a,b in zip(t,t[1:]+t[:1]):edges[tuple(sorted((a,b)))]+=1
 bad=sum(n>2 for n in edges.values());boundary=[e for e,n in edges.items()if n==1];adj=defaultdict(set)
 for a,b in boundary:adj[a].add(b);adj[b].add(a)
 loops=[]
 if any(len(v)!=2 for v in adj.values()):return p,f,{'valid':False,'reason':'branched boundary','nonmanifoldEdges':bad}
 unseen=set(adj)
 while unseen:
  start=min(unseen);loop=[start];prev=None;cur=start
  while True:
   nxt=next(v for v in sorted(adj[cur])if v!=prev)
   if nxt==start:break
   loop.append(nxt);prev,cur=cur,nxt
   if len(loop)>len(adj):raise RuntimeError('boundary traversal')
  unseen.difference_update(loop);center=sum((p[i]for i in loop),Vector())/len(loop);ci=len(p);p.append(center)
  # These are envelope closures for missing oral apertures, not new model geometry.
  for a,b in zip(loop,loop[1:]+loop[:1]):f.append((a,b,ci))
  loops.append({'vertices':len(loop),'centroid':list(center),'radius':max((p[i]-center).length for i in loop)})
 return p,f,{'valid':bad==0,'nonmanifoldEdges':bad,'cappedBoundaryLoops':loops}
def inside(tree,p,d):
 count=0;origin=Vector(p);epsilon=2e-6
 for _ in range(64):
  hit,normal,index,distance=tree.ray_cast(origin,d)
  if hit is None:return count%2==1
  count+=1;origin=hit+d*epsilon
 raise RuntimeError('Excess ray intersections: geometry not suitable for parity')
def wilson(k,n):
 z=1.96;p=k/n;den=1+z*z/n;c=(p+z*z/(2*n))/den;h=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return [100*(c-h),100*(c+h)]
def section_svg(path,head,eye):
 # Section through each globe center perpendicular to body longitudinal (+Z) axis.
 z=float(np.mean(np.array(eye['positions'])[:,2]));lines=[]
 for item,color in [(head,'#46576a'),(eye,'#dc6419')]:
  pp=np.array(item['positions'])
  for f in item['faces']:
   hits=[]
   for a,b in zip(f,f[1:]+f[:1]):
    if (pp[a,2]-z)*(pp[b,2]-z)<0:
     t=(z-pp[a,2])/(pp[b,2]-pp[a,2]);hits.append(pp[a,:2]+t*(pp[b,:2]-pp[a,:2]))
   if len(hits)==2:lines.append((hits,color))
 ep=np.array(eye['positions']);cx,cy=(ep[:,:2].min(0)+ep[:,:2].max(0))/2;scale=400/max(np.ptp(ep[:,:2],axis=0))
 def xy(p):return (450+(p[0]-cx)*scale,400-(p[1]-cy)*scale)
 svg=['<svg xmlns="http://www.w3.org/2000/svg" width="900" height="800" viewBox="0 0 900 800"><rect width="900" height="800" fill="white"/>','<text x="25" y="30" font-family="sans-serif" font-size="20">Exported geometry: grey head envelope; orange eye; central cross-section</text>']
 for pts,color in lines:
  a,b=map(xy,pts);svg.append(f'<path d="M{a[0]:.2f},{a[1]:.2f} L{b[0]:.2f},{b[1]:.2f}" stroke="{color}" stroke-width="3"/>')
 svg.append('</svg>');path.write_text('\n'.join(svg))
results=[]
for file in sorted(DIRECTORY.glob('*.geometry.json')):
 data=json.loads(file.read_text());id=data['id'];eye_comps=[]
 selector=SELECTORS.get(id,{})
 for m in data['meshes']:
  selected=m['name'] in selector['eyeMeshes'] if 'eyeMeshes' in selector else m['material'].split()[-1]==selector.get('eyeMaterialSuffix','eyes')
  if selected:eye_comps.extend(components(m))
 if not eye_comps:raise RuntimeError(f'{id}: no eye globes selected; review selectors')
 if 'headMesh' in selector or id in HEAD_NAMES:body_mesh=next(m for m in data['meshes']if m['name']==selector.get('headMesh',HEAD_NAMES.get(id)))
 else:body_mesh=next(m for m in data['meshes']if m['material'].split()[-1]==selector.get('headMaterialSuffix','body'))
 head=components(body_mesh)[selector.get('headComponent',0)];hp,hf,topology=close_envelope(head)
 if not topology['valid']:raise RuntimeError(f'{id}: invalid head topology {topology}')
 body_tree=BVHTree.FromPolygons(hp,hf,all_triangles=True)
 result={'id':id,'revision':data['revision'],'assetSha256':data['sha256'],'headMesh':body_mesh['name'],'headTriangles':len(head['faces']),'headTopology':topology,'eyes':[]}
 for ei,eye in enumerate(eye_comps):
  ep,ef,et=close_envelope(eye)
  if not et['valid'] or et['cappedBoundaryLoops']:raise RuntimeError(f'{id}: eye globe not closed {et}')
  etr=BVHTree.FromPolygons(ep,ef,all_triangles=True);arr=np.array(eye['positions']);lo=arr.min(0);hi=arr.max(0)
  rng=np.random.default_rng(int.from_bytes(hashlib.sha256((id+str(ei)).encode()).digest()[:8],'little'))
  candidates=rng.uniform(lo,hi,(N,3));accepted=[p for p in candidates if inside(etr,p,DIRECTIONS[0])]
  classifications=np.array([[inside(body_tree,p,d)for d in DIRECTIONS]for p in accepted],dtype=np.int8);votes=classifications.sum(1);n=len(votes);k=int((votes>=2).sum());amb=int(((votes>0)&(votes<3)).sum());ci=wilson(k,n)
  # Mouth closure influence is explicit and constrained away from eyes by reporting distances.
  closure_distances=[float(np.linalg.norm(np.array(c['centroid'])-(lo+hi)/2)-c['radius']-np.linalg.norm((hi-lo)/2))for c in topology['cappedBoundaryLoops']]
  verified=all(d>0 for d in closure_distances)
  conservative=[wilson(int((votes==3).sum()),n)[0],wilson(int((votes>0).sum()),n)[1]]
  status='FAIL'if conservative[1]<50 else 'PASS'if conservative[0]>=50 else 'BORDERLINE'
  if not verified:status='AMBIGUOUS_'+status
  er={'eye':ei,'center':((lo+hi)/2).tolist(),'radii':((hi-lo)/2).tolist(),'eyeTriangles':len(ef),'boundingBoxCandidates':N,'volumeSamples':n,'inside':k,'insidePercent':100*k/n,'wilson95Percent':ci,'conservative95Percent':conservative,'rayDisagreements':amb,'insideLowerPercent':100*int((votes==3).sum())/n,'insideUpperPercent':100*int((votes>0).sum())/n,'closureClearanceLowerBounds':closure_distances,'criterion50':status,'target65':conservative[0]>=65 and verified}
  # Placement guidance only: translate the same globe toward continuous head, target 70%.
  inward=Vector((0,-1,0)) if id in ['bothriolepis','doryaspis','gemuendina'] else Vector((-1 if (lo[0]+hi[0])>0 else 1,0,0))
  probe=accepted[::max(1,len(accepted)//4000)];left=0;maximum=float(np.linalg.norm(hi-lo));right=maximum
  def fraction_at(distance):return sum(inside(body_tree,Vector(p)+inward*distance,DIRECTIONS[0])for p in probe)/len(probe)
  for step in range(1,33):
   right=maximum*step/32
   if fraction_at(right)>=.70:break
   left=right
  if fraction_at(right)>=.70:
   for _ in range(12):
    mid=(left+right)/2
    if fraction_at(mid)>=.70:right=mid
    else:left=mid
   delta=list(inward*right);er['guidanceOnly70PercentTranslationGlTF']=delta;er['guidanceOnly70PercentTranslationBlender']=[delta[0],-delta[2],delta[1]]
  result['eyes'].append(er);section_svg(DIRECTORY/f'{id}-eye-{ei}-section.svg',head,eye)
  print(id,ei,round(er['insidePercent'],2),status,'CI',ci,'disagree',amb,flush=True)
 results.append(result);(DIRECTORY/'report.json').write_text(json.dumps({'method':'actual-eye-polyhedron uniform-volume rejection samples; actual continuous-head triangle parity; three independent ray directions; explicit distant oral boundary closures','results':results},indent=2))
