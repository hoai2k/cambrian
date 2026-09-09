"""Assemble matching final portrait derivatives and hash-bound evidence inventory."""
from PIL import Image,ImageDraw
from pathlib import Path
import json,hashlib,shutil
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/stethacanthus/v2';O=L/'candidate';Q=L/'renders'
source=Image.open(Q/'selection.png').convert('RGBA');assert source.size==(1600,1200);source.save(O/'stethacanthus.select.png')
for su,size in [('card',(800,600)),('thumb',(256,192))]:source.resize(size,Image.Resampling.LANCZOS).save(O/('stethacanthus.'+su+'.png'))
studio=Image.new('RGBA',source.size,(18,28,32,255));studio.alpha_composite(source);studio.convert('RGB').resize((1200,900),Image.Resampling.LANCZOS).save(O/'stethacanthus.png')
clips=json.loads((O/'stethacanthus.json').read_text())['clips'];sheet=Image.new('RGB',(1400,((len(clips)+3)//4)*283),(18,28,32));draw=ImageDraw.Draw(sheet)
for i,c in enumerate(clips):
 p=Q/('action-'+c+'.png');assert p.exists(),c;raw=Image.open(p).convert('RGBA');bg=Image.new('RGBA',raw.size,(18,28,32,255));bg.alpha_composite(raw);x=(i%4)*350;y=(i//4)*283;sheet.paste(bg.convert('RGB').resize((350,263),Image.Resampling.LANCZOS),(x,y));draw.text((x+10,y+265),c,fill=(232,230,217))
sheet.save(Q/'all-actions.jpg',quality=92)
audits=[]
for suffix,folder in [('','audit-full'),('.lod1','audit-lod')]:
 sha=hashlib.sha256((O/('stethacanthus'+suffix+'.glb')).read_bytes()).hexdigest();r=json.loads((L/folder/'report.json').read_text())['results'][0];assert r['assetSha256']==sha;assert r['headTopology']['valid'];assert not r['headTopology']['cappedBoundaryLoops'];assert all(e['conservative95Percent'][0]>65 for e in r['eyes']);audits.append({'asset':'stethacanthus'+suffix+'.glb','sha256':sha,'headTopology':r['headTopology'],'eyes':[{'insidePercent':e['insidePercent'],'conservative95Percent':e['conservative95Percent'],'samples':e['volumeSamples'],'rayDisagreements':e['rayDisagreements']}for e in r['eyes']]})
report={'anatomicalTarget':'Stethacanthus sp., Devonian CMNH 8988-informed comparative reconstruction','models':audits,'validationFile':'validation.json','sourcePoseValidationFile':'pose-validation.json','renderReview':['front','side','dorsal','threequarter','eye-oblique','mouth']+['action-'+c for c in clips],'sequentialActionReview':['Swim','TurnLeft','Heavy','Dodge','Eat','Death','Ability'],'motionSequenceNote':'Sequence sheets cover the authored action curves; final action extrema and imported LOD confirm corrected fin-root weighting and camber.','actualExportReview':{'full':'review-export-full/lit-*.png','lod':'review-export-lod/lod-*.png'},'candidateFiles':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in O.iterdir()if p.is_file()},'uncertainties':['Whole-body proportions and crown width reconstructed around an incomplete Devonian specimen.','Living pigmentation, exact metapterygial extension length, soft oral/branchial tissue and movement timing are artistic interpretation.','CMNH 8988 species and sex remain unresolved here; no substitution of a complete Carboniferous Akmonistion specimen.']}
(H/'review-evidence.json').write_text(json.dumps(report,indent=2)+'\n');shutil.copytree(H,L/'source',dirs_exist_ok=True)
print('STETHACANTHUS_FINAL_PORTRAITS_AND_EVIDENCE_READY')
