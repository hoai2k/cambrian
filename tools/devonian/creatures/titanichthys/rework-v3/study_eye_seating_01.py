"""Local translation study only. Does not mutate or certify a model."""
from pathlib import Path
import json,hashlib
import numpy as np
from projected_parity_01 import ProjectedParity
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
f=np.load(LOCAL/'diagnostic-eye-ray06-01/actual-failing-ray.npz')
c=json.loads((LOCAL/'clay-04/construction.json').read_text())
print(list(c),flush=True)
# Match copied anatomy coordinates to the actual exported left globe.
options=[]
def visit(v):
    if isinstance(v,dict):
        if 'normal'in v and 'center'in v and 'side'in v:options.append(v)
        for x in v.values():visit(x)
    elif isinstance(v,list):
        for x in v:visit(x)
visit(c)
convert=lambda x:np.array([x[0],x[2],-x[1]])
center=f['eye_positions'].mean(0);spec=min(options,key=lambda x:np.linalg.norm(convert(x['center'])-center))
normal=convert(spec['normal']);normal/=np.linalg.norm(normal)
a=f['eye_positions'];rng=np.random.default_rng(3127);p=rng.uniform(a.min(0),a.max(0),(16000,3))
dirs=[[1,.371,.127],[-.237,1,.413],[.193,-.271,1]]
inside=ProjectedParity(a,f['eye_faces'],dirs[0]).classify(p);assert not np.any(inside<0);p=p[inside==1]
trees=[ProjectedParity(f['positions'],f['faces'],d)for d in dirs]
report={'scope':'Left bind guidance only; actual changed full/LOD pose audits and art review required','normalGlTF':normal.tolist(),'sourceEye':spec,'samples':len(p),'steps':[]}
for distance in np.arange(0,.061,.005):
    q=np.array([t.classify(p-normal*distance)for t in trees]).T
    row={'translation':float(distance),'allInsidePercent':100*float(np.all(q==1,axis=1).mean()),'uncertain':int((q<0).sum())}
    report['steps'].append(row);print(row,flush=True)
out=LOCAL/'eye-seating-study-01.json';assert not out.exists();out.write_text(json.dumps(report,indent=2)+'\n')
