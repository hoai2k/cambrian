"""Actual full/LOD globe-volume audit in bind and maximum Ability gape.
Terra executes. No geometry alteration, build, render or blend import/save.
"""
from pathlib import Path
import sys,json,hashlib,runpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;ROOT=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo');SOURCE=ROOT/'tools/devonian/creatures/titanichthys/rework-v3'
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3';SRC=LOCAL/'release-candidate08';OUT=SRC/'audit-eye-float64-01'
sys.dont_write_bytecode=True;sys.path.insert(0,str(SOURCE))
from gltf_evaluate_01 import read_glb
from projected_parity_01 import ProjectedParity
HASHES={'titanichthys.glb':'e14f5ea5ac52e7d0b8c894ba31231099c341da85e6d0f463d4f1c22054122c62',
        'titanichthys.lod1.glb':'17837f5f66e08c7d34e9788faac38cd9b0578256cc2bade21b33483f3b7a5b98'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name,digest in HASHES.items():assert sha(SRC/name)==digest
assert not OUT.exists(),'Preserve existing audit';OUT.mkdir()
argv=sys.argv[:];sys.argv=['eye-audit.py','--',str(OUT/'no-snapshot-input')]
core=runpy.run_path(str(ROOT/'tools/devonian/eye-audit.py'));sys.argv=argv
report={'source_sha256':sha(__file__),'inputs':HASHES,'packaged_hashes':{'titanichthys.glb':'de056f4d2af273e5a2c279a2727158d285f20f97db2790729f4580b74ac89ef9','titanichthys.lod1.glb':'d99b2060c89ac1caa23ec9613c9de3b82c9604dc5669d54386d42e93f611f1a7'},'classifier_sha256':sha(SOURCE/'projected_parity_01.py'),'method':'Actual exported eye-polyhedron rejection volume; original-origin float64 projected triangle parity in three directions; uncertain rays count outside lower and inside upper confidence bounds; no oral caps',
        'limitations':['Bind and Ability .5 only; runtime playback and other phases still require review.','Volume containment does not approve orbital appearance or prove no self-intersection.'], 'records':[]}
def save(): (OUT/'eye-volume.json').write_text(json.dumps(report,indent=2)+'\n')
passes=[]
for name,digest in HASHES.items():
    g,evaluate=read_glb(SRC/name)
    for clip,phase in [(None,0.),('Ability',.5)]:
        meshes,anchors=evaluate(clip,phase)
        bodies=core['components'](meshes['Titanichthys_new_continuous_sculpt_export'])
        assert len(bodies)==1,'Body component count changed'
        head=bodies[0];hp,hf,topology=core['close_envelope'](head)
        record={'asset':name,'sha256':digest,'clip':clip or 'Bind','phase':phase,'body_topology':topology,'eyes':[]}
        report['records'].append(record);save();assert topology['valid'] and not topology['cappedBoundaryLoops'],'Head must be closed without synthetic caps'
        trees=[ProjectedParity(hp,hf,d) for d in core['DIRECTIONS']]
        for side in ('L','R'):
            eyes=core['components'](meshes['Recessed socket eye '+side+'_export']);assert len(eyes)==1
            eye=eyes[0];ep,ef,et=core['close_envelope'](eye);assert et['valid']and not et['cappedBoundaryLoops'],'Eye globe is not closed'
            eye_tree=ProjectedParity(ep,ef,core['DIRECTIONS'][0]);a=np.array(ep);lo=a.min(0);hi=a.max(0)
            rng=np.random.default_rng(719061+(side=='R'));nbox=120000 if clip is None else 24000
            points=rng.uniform(lo,hi,(nbox,3));eye_class=eye_tree.classify(points)
            assert not np.any(eye_class<0),'Uncertain eye rejection samples: report instead of biased denominator'
            accepted=points[eye_class==1]
            classes=np.array([tree.classify(accepted)for tree in trees]).T
            votes=(classes==1).sum(1);possible=(classes!=0).sum(1);n=len(votes);assert n>1000
            lower=core['wilson'](int((votes==3).sum()),n)[0];upper=core['wilson'](int((possible>0).sum()),n)[1]
            center=(lo+hi)/2;radius=float(np.linalg.norm(hi-lo)/2)
            clearance=[float(np.linalg.norm(center-np.array(c['centroid']))-radius-c['radius'])for c in topology['cappedBoundaryLoops']]
            verified=all(v>0 for v in clearance);passed=lower>=50 and verified
            er={'side':side,'actual_globe_volume_samples':n,'inside_percent':100*float((votes>=2).mean()),'conservative95_percent':[lower,upper],
                'uncertain_ray_count':int((classes<0).sum()),'ray_disagreement_count':int(((votes>0)&(votes<3)).sum()),'closure_clearance_lower_bounds':clearance,'minimum50_pass':passed,'target65':lower>=65 and verified}
            record['eyes'].append(er);passes.append(passed);save()
            if clip is None:core['section_svg'](OUT/((name.replace('.glb',''))+'-'+side+'-section.svg'),head,eye)
            print('TITANICHTHYS_ACTUAL_EYE_VOLUME',name,clip or 'Bind',side,er,flush=True)
report['measurement_complete']=True;report['all_minimum50_pass']=all(passes);save()
for name,digest in HASHES.items():assert sha(SRC/name)==digest
assert all(passes),'Actual eye containment below50 or closure ambiguity; preserve measurements and return to Astra'
print('TITANICHTHYS_EYE_VOLUME_AUDIT_OK '+str(OUT/'eye-volume.json'),flush=True)
