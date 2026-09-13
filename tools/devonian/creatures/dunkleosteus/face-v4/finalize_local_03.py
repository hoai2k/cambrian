"""Refresh only the local candidate03 metadata after explicit root visual acceptance.
Run with DUNK_V4_VISUAL_ACCEPTED=1 only after individual exported-image/motion review.
No public files, version control, geometry or actions are modified.
"""
import hashlib,json,os
from pathlib import Path
assert os.environ.get('DUNK_V4_VISUAL_ACCEPTED')=='1','Root must first review actual exported poses and portraits'
H=Path(__file__).resolve().parent;R=H.parents[4]
Q=R.parent/'devonian-authoring/dunkleosteus/face-v4/candidate03/exports'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert not (Q/'local-final-manifest.json').exists(), 'Local final manifest already exists'
manifest=json.loads((Q/'export-evidence.json').read_text())
summary=json.loads((Q/'eye-oral-audit-summary.json').read_text())
assert len(summary)==2
reports=[]
for model,row in zip(manifest['models'],summary):
    assert sha(model['path'])==model['sha256']
    assert row['eyesPass'] and row['opposingShellFailures']==0 and row['opposingGnathalFailures']==0,row
    audit=json.loads(Path(row['report']).read_text());assert audit['assetSHA256']==model['sha256']
    assert sha(row['report'])==row['reportSHA256'];reports.append(audit)
images={}
for name in ['dunkleosteus.png','dunkleosteus.select.png','dunkleosteus.card.png','dunkleosteus.thumb.png']:
    assert (Q/name).is_file();images[name]=sha(Q/name)
review_files=[*Q.glob('render-evidence-*.json')];assert review_files
verified={}
for file in review_files:
    for row in json.loads(file.read_text())['images']:
        assert sha(row['file'])==row['sha256']
        assert row['assetSHA256'] in [m['sha256'] for m in manifest['models']]
        verified[row['file']]=row
assert len([r for r in verified.values() if '/review-full/' in r['file']])>=8
assert len([r for r in verified.values() if '/review-lod/' in r['file']])>=8
meta=json.loads((Q/'dunkleosteus.json').read_text())
meta['artVersion']=4;meta['artCandidate']='face-v4-candidate03';meta['status']='final'
meta['clips']=manifest['models'][0]['actions'];meta['lodClips']=manifest['models'][1]['actions']
assert len(meta['clips'])==18 and meta['clips']==meta['lodClips']
meta['notes']=[n for n in meta.get('notes',[]) if not n.startswith('Focused V4 face:')]
meta['notes'].append('V4 focused cranial and gnathal refinement; preserved V2 body, oral lining, rig, eye globes and anchors. Actual full/LOD eye-volume and 173 feeding-pose checks refreshed; root completed individual visual review.')
meta['faceRefinementEvidence']={'assets':[{k:m[k] for k in ('path','sha256','triangles','bytes')} for m in manifest['models']],
    'eyes':[{name:r['eyes'][name] for name in r['eyes']} for r in reports],
    'oralPoseCount':[r['oralPoseCount'] for r in reports],
    'auditReports':[{'path':r['report'],'sha256':r['reportSHA256']} for r in summary],
    'portraits':images,'visualReview':'Root explicitly accepted actual exported full/LOD views and portraits; motion/contact review remains a human-reviewed requirement.'}
for eye in meta.get('eyes',[]):
    name=eye.get('mesh');actual=reports[0]['eyes'].get(name)
    if actual:
        eye['embeddedFraction']=actual['insideLowerFraction']
        eye['sampleCount']=actual['actualEyeVolumeSamples']
        eye['method']='V4 actual exported closed eye polyhedron volume with three-direction head parity; conservative95LowerFraction='+str(actual['conservative95LowerFraction'])
(Q/'dunkleosteus.json').write_text(json.dumps(meta,indent=2)+'\n')
(Q/'local-final-manifest.json').write_text(json.dumps({'metadataSHA256':sha(Q/'dunkleosteus.json'),'models':manifest['models'],'portraits':images,'publicModified':False,'scriptSHA256':sha(__file__)},indent=2)+'\n')
print('DUNK_V4_LOCAL_FINAL_READY',Q)
