"""Freeze the seven reviewed local preview files; never copies into public assets."""
from pathlib import Path
import hashlib,json,datetime
from PIL import Image
here=Path(__file__).resolve().parent;root=here.parents[3];local=root.parent/'devonian-authoring/acanthostega';out=local/'v1-candidate'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
files=['acanthostega'+s for s in ['.glb','.lod1.glb','.json','.png','.select.png','.card.png','.thumb.png']]
manifest={'id':'acanthostega','status':'preview','frozenAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':{f:{'sha256':sha(out/f),'bytes':(out/f).stat().st_size}for f in files},'editableSource':{'file':str(local/'acanthostega-v1.blend'),'sha256':sha(local/'acanthostega-v1.blend')}}
validation=json.loads((here/'validation.json').read_text());exports=json.loads((here/'export-review-v1.json').read_text());eyes={}
for level,suffix in [('full',''),('lod','.lod1')]:
 r=json.loads((local/('eye-audit-'+level)/'report.json').read_text())['results'][0];assert r['assetSha256']==manifest['files']['acanthostega'+suffix+'.glb']['sha256'];assert r['headTopology']['valid'];assert all(e['conservative95Percent'][0]>=65 for e in r['eyes']);eyes[level]=r
for r in exports['exports']:assert r['sha256']==manifest['files'][Path(r['file']).name]['sha256']
attachments=json.loads((here/'pose-attachments-v1.json').read_text());assert attachments['allFinRootCentroidsBuried'];assert attachments['maximumToothBaseToLiningDistance']<.006
qa=json.loads((local/'viewer-v1/review.json').read_text());assert len(qa['clips'])==18;assert qa['errors']==[]
qa['audit']={'status':'not-applicable','reason':'Preview not registered in shared catalogue; direct GLB validation in export-review-v1.json. Actual Three.js geometry/actions rendered independently.'};(local/'viewer-v1/review.json').write_text(json.dumps(qa,indent=2))
portraits={}
for s in ['','.select','.card','.thumb']:
 p=out/('acanthostega'+s+'.png');im=Image.open(p);portraits[p.name]={'size':im.size,'mode':im.mode,'alphaRange':im.getchannel('A').getextrema()if'A'in im.getbands()else None}
report={'id':'acanthostega','status':'preview-ready','manifest':manifest,'geometry':{k:validation[k]for k in ['fullTriangles','lodTriangles','reductionRatio','bones','fullBytes','lodBytes','anchorCount']},'eyes':eyes,'sourcePoseChecks':{k:v for k,v in attachments.items()if k!='results'},'portraits':portraits,'reviewedActualGLB':'18 action midpoints, two additional phases per action, neutral front/side/dorsal/orbit, maximum gape from both sides, palate, and LOD Idle; still-frame review, not a claimed continuous biomechanical validation.','runtimeValidation':'Direct decoded GLB finite/normalized weights, 18/3 distinct action tracks, stable root, no animated scaling, full/LOD identical 56-bone graph and exact 3 version-1 sockets; loop seams and Death hold checked in source at every sampled frame. Shared catalogue runtime audit deferred to parent integration.','knownPreviewLimitations':['Wrist/palm skin transitions and proximal web intersections remain simplified and need finer sculpting in the later art pass.','Oral tissues have real attached depth but broad smooth shading; finer palate relief, marginal teeth and tooth counts need later reconstruction/art review.','Eyes satisfy actual-volume containment without decorative rims; orbital skin transitions and glossy highlight balance can be refined later.','Fine tail-ray relief, cranial sutures and individual limb scutes are intentionally understated in this first preview.','Aquatic movement uses individually articulated unequal digits but exact strokes/webbing extent and soft tissue are inferred; no ordinary terrestrial walking is claimed.']}
(out/'candidate-manifest.json').write_text(json.dumps(manifest,indent=2));(here/'final-review-v1.json').write_text(json.dumps(report,indent=2));print(json.dumps(manifest,indent=2))
