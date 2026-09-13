"""Actual exported compound-eye lens volumes; every lens must pass independently."""
from pathlib import Path
H=Path(__file__).resolve().parent
# Reuse frozen BVH parity, welding, closure validation and confidence functions, not its main loop.
source=(H.parents[1]/'eye-audit.py').read_text();exec(compile(source[:source.index('results=[]')],str(H.parents[1]/'eye-audit.py'),'exec'))
results=[]
for file in sorted(DIRECTORY.glob('*.geometry.json')):
 data=json.loads(file.read_text());headparts=[m for m in data['meshes']if m['name']=='cephalon_continuous_closed'];joined={'name':'cephalon_continuous_closed','material':'all actual head primitives','positions':[],'indices':[]}
 for p in headparts:
  off=len(joined['positions']);joined['positions']+=p['positions'];joined['indices'] += [i+off for i in p['indices']]
 head=components(joined)[0];hp,hf,ht=close_envelope(head);assert ht['valid'] and not ht['cappedBoundaryLoops'],ht;tree=BVHTree.FromPolygons(hp,hf,all_triangles=True);rows=[]
 for side in ['L','R']:
  comps=[]
  for m in data['meshes']:
   if m['name']=='lens_solids_'+side:comps+=components(m)
  assert len(comps)==82,(side,len(comps))
  for i,c in enumerate(comps):
   ps,fs,top=close_envelope(c);assert top['valid'] and not top['cappedBoundaryLoops'];lt=BVHTree.FromPolygons(ps,fs,all_triangles=True);pts=np.array(c['positions']);lo=pts.min(0);hi=pts.max(0);rng=np.random.default_rng(1717+i+(1000 if side=='R'else 0));candidates=rng.uniform(lo,hi,(10000,3));samples=[p for p in candidates if inside(lt,p,DIRECTIONS[0])];votes=np.array([[inside(tree,p,d)for d in DIRECTIONS]for p in samples]).sum(1);n=len(votes);k=int((votes>=2).sum());ci=wilson(int((votes==3).sum()),n)
   row={'side':side,'component':i,'center':((lo+hi)/2).tolist(),'actualClosedPolyhedronVolume':abs(sum(ps[a].dot(ps[b].cross(ps[c])) for a,b,c in fs)/6),'samples':n,'insidePercent':100*k/n,'conservative95LowerPercent':ci[0],'rayDisagreements':int(((votes>0)&(votes<3)).sum()),'pass50':ci[0]>=50,'target65':ci[0]>=65};rows.append(row)
  print('Per-lens audit',side,'minimum',min(r['insidePercent']for r in rows if r['side']==side),'conservative',min(r['conservative95LowerPercent']for r in rows if r['side']==side),flush=True)
 result={'assetSha256':data['sha256'],'revision':data['revision'],'headTopology':ht,'lensCount':len(rows),'allIndividualLensesPass50':all(r['pass50']for r in rows),'allIndividualLensesTarget65':all(r['target65']for r in rows),'lenses':rows};results.append(result)
(DIRECTORY/'lens-report.json').write_text(json.dumps({'method':'Every actual exported closed calcite lens solid individually sampled with 10000 uniform bounding candidates, own-polyhedron rejection, three-ray continuous-cephalon parity; 95% conservative Wilson lower bound. No averages can conceal a failed lens. Ocular organs are separately audited by shared tool.','results':results},indent=2));assert all(r['allIndividualLensesPass50']for r in results)
