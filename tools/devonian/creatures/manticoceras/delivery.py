"""Freeze the complete initial candidate family with actual-GLB evidence."""
from pathlib import Path
import json,hashlib,shutil
from PIL import Image,ImageOps,ImageDraw
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/manticoceras';C=L/'initial-candidate'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
full=sha(C/'manticoceras.glb');lod=sha(C/'manticoceras.lod1.glb');validation=json.loads((H/'validation.json').read_text());assert [m['sha256']for m in validation['models']]==[full,lod]
rigidity=json.loads((H/'rigid-shell-validation.json').read_text());assert [r['sha256']for r in rigidity]==[full,lod];assert all(len(r['shell'])==4 for r in rigidity)
for folder,name,digest in [('v2-eye-audit','eye-audit-full.json',full),('v2-eye-audit-lod','eye-audit-lod.json',lod)]:
 r=json.loads((L/folder/'report.json').read_text());assert r['results'][0]['assetSha256']==digest;assert r['results'][0]['headTopology']['valid'];assert not r['results'][0]['headTopology']['cappedBoundaryLoops'];assert len(r['results'][0]['eyes'])==2;assert all(e['criterion50']=='PASS'and e['target65']for e in r['results'][0]['eyes']);shutil.copy2(L/folder/'report.json',H/name)
for filename,digest in [('render-validation.json',full),('render-validation-lod.json',lod)]:
 r=json.loads((H/filename).read_text());assert r['sourceGlbSha256']==digest
 for record in r['renders']:assert sha(L/('review-'+digest[:12])/record['file'])==record['imageSha256']
for suffix,size in [('',(1600,1200)),('.select',(1600,1200)),('.card',(800,600)),('.thumb',(256,192))]:assert Image.open(C/('manticoceras'+suffix+'.png')).size==size
play=json.loads((L/'playback-validation-v2.json').read_text());assert play['sourceGlbSha256']==full and len(play['audit'])==19 and not play['errors'];assert all(r['finite']and r['rootStable']for r in play['audit']);assert sha(L/'motion-review-v2.webm')==play['videoSha256'];shutil.copy2(L/'playback-validation-v2.json',H/'playback-validation.json')
intake=json.loads((L/'intake-review/intake.json').read_text());assert intake[0]['files']['glb']['sha256']==full;shutil.copy2(L/'intake-review/intake.json',H/'intake-validation.json')
names=[r['name']for r in play['audit']];out=Image.new('RGB',(1600,1450),'#172026');draw=ImageDraw.Draw(out)
for i,name in enumerate(names):
 im=ImageOps.contain(Image.open(L/('webgl-'+name+'-v2.png')).convert('RGB'),(395,278));x=(i%4)*400;y=(i//4)*290;out.paste(im,(x,y));draw.text((x+8,y+265),name,fill='white')
out.save(H/'action-review.jpg',quality=93)
files={p.name:{'sha256':sha(p),'bytes':p.stat().st_size}for p in sorted(C.glob('manticoceras*'))};assert len(files)==7
source=L/'manticoceras-initial.blend';report={'candidateOnly':True,'stage':'initial-preview','species':'Manticoceras regulare','files':files,'originalBlend':{'path':str(source),'sha256':sha(source),'bytes':source.stat().st_size},'validation':validation,'reviewReports':{p.name:sha(p)for p in H.glob('*validation*.json')},'eyeReports':{p.name:sha(p)for p in H.glob('eye-audit-*.json')},'sourceScripts':{p.name:sha(p)for p in sorted(H.glob('*.py'))},'notes':['Complete initial preview; integration agent owns packaging, viewer review and main commits.','No pre-existing model existed. Original blend and imagegen source preserved.','Three anchor nodes are explicitly supported by shared check.mjs; full and LOD metadata match.','LOD retains Idle, Swim and Death with the full rig.','Later refinement may improve shell aperture/mantle fit, finer shell growth increments and arm-membrane deformation. Initial eye volume and export validity are mandatory and passed.']}
(H/'delivery.json').write_text(json.dumps(report,indent=2));print(json.dumps({'full':full,'lod':lod,'blend':report['originalBlend']['sha256'],'files':len(files)},indent=2))
