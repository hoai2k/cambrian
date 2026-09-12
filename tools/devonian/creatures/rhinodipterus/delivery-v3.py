"""V3 port of delivery-v2.py: identical, pointed at the v3-candidate/v3-eye-audit family and
-v3 review filenames. Not run in the head-study port itself: it requires the full webgl
playback/motion-review artifacts (playback-validation-v3.json, motion-review-v3.webm,
webgl-<clip>-v3.png x18) that only the three.js review harness produces, beyond the port's
build/package/check/audit/finalize/eye-audit/portrait scope. Provided so the family of v3
scripts is complete and re-runnable once that review is done.
Assemble a hash-bound handoff only after the complete final review exists."""
from pathlib import Path
import json,hashlib,shutil
from PIL import Image,ImageOps,ImageDraw
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/rhinodipterus';C=L/'v3-candidate'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
full=sha(C/'rhinodipterus.glb');lod=sha(C/'rhinodipterus.lod1.glb')
validation=json.loads((H/'validation.json').read_text());assert validation['models'][0]['sha256']==full and validation['models'][1]['sha256']==lod
for folder,name,digest in [('v3-eye-audit','eye-audit-full-v3.json',full),('v3-eye-audit-lod','eye-audit-lod-v3.json',lod)]:
 r=json.loads((L/folder/'report.json').read_text());assert r['results'][0]['assetSha256']==digest
 assert all(e['criterion50']=='PASS' and e['target65']for e in r['results'][0]['eyes']);shutil.copy2(L/folder/'report.json',H/name)
for file,digest in [('render-validation-v3.json',full),('render-validation-lod-v3.json',lod),('profile-validation-v3.json',full)]:
 r=json.loads((H/file).read_text());assert r['sourceGlbSha256']==digest
 for record in r['renders']:
  p=C/record['file']if (C/record['file']).exists()else L/record['file'];assert sha(p)==record['imageSha256'],p
for suffix,size in [('',(1600,1200)),('.select',(1600,1200)),('.card',(800,600)),('.thumb',(256,192))]:
 p=C/('rhinodipterus'+suffix+'.png');assert Image.open(p).size==size
play=json.loads((L/'playback-validation-v3.json').read_text());assert play['sourceGlbSha256']==full and len(play['audit'])==18 and not play['errors'];assert all(r['finite']and r['rootStable']for r in play['audit']);assert sha(L/'motion-review-v3.webm')==play['videoSha256'];shutil.copy2(L/'playback-validation-v3.json',H/'playback-validation-v3.json')
attach=json.loads((H/'attachment-validation-v3.json').read_text());assert [r['sourceGlbSha256']for r in attach]==[full,lod];assert all(r['maxRootOutwardDistance']<0 for r in attach)
names=['Idle','Swim','TurnLeft','TurnRight','Dive','Rise','Attack','Bite','Heavy','Hit','Guard','Parry','Dodge','Eat','Stagger','Ability','Growth','Death'];out=Image.new('RGB',(1600,1450),'#172026');draw=ImageDraw.Draw(out)
for i,name in enumerate(names):
 p=L/f'webgl-{name}-v3.png';im=ImageOps.contain(Image.open(p).convert('RGB'),(395,278));x=(i%4)*400;y=(i//4)*290;out.paste(im,(x,y));draw.text((x+8,y+265),name,fill='white')
out.save(L/'webgl-action-contact-v3.jpg',quality=94);shutil.copy2(L/'webgl-action-contact-v3.jpg',H/'action-review-v3.jpg')
files={p.name:{'sha256':sha(p),'bytes':p.stat().st_size}for p in sorted(C.glob('rhinodipterus*'))};source=L/'rhinodipterus-v3.blend'
report={'candidateOnly':True,'species':'Rhinodipterus kimberleyensis','files':files,'originalBlend':{'path':str(source),'sha256':sha(source),'bytes':source.stat().st_size},'validation':validation,'reviewReports':{p.name:sha(p)for p in H.glob('*validation*.json')},'eyeReports':{p.name:sha(p)for p in H.glob('eye-audit-*-v3.json')},'sourceScripts':{p.name:sha(p)for p in sorted(H.glob('*.py'))},'notes':['Parent performs independent viewer review and public promotion/commit.','Source anatomy and pigment frozen before matching final renders, full/LOD eye audits and all-action playback.','Full source and every original/intermediate remain in the authoring directory; V1 was preserved before editing.']}
(H/'delivery-v3.json').write_text(json.dumps(report,indent=2));print(json.dumps({'full':full,'lod':lod,'blend':report['originalBlend']['sha256'],'files':len(files)},indent=2))
