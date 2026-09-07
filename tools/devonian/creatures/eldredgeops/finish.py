"""Create matching preview portraits and a hash-bound initial handoff record. Local candidates only."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,shutil
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/eldredgeops/v2';O=L/'candidate';Q=L/'review-export-full'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
selection=Image.open(Q/'selection.png').convert('RGBA');assert selection.size==(1600,1200);assert selection.getextrema()[3][0]==0 and selection.getextrema()[3][1]==255
selection.save(O/'eldredgeops.select.png')
for suffix,size in [('card',(800,600)),('thumb',(256,192))]:selection.resize(size,Image.Resampling.LANCZOS).save(O/('eldredgeops.'+suffix+'.png'))
studio=Image.new('RGBA',(1200,900),(11,20,27,255));studio.alpha_composite(selection.resize((1200,900),Image.Resampling.LANCZOS));studio.convert('RGB').save(O/'eldredgeops.png')
eyes=[]
for variant in ['full','lod']:
 a=L/('audit-'+variant);ocular=json.loads((a/'report.json').read_text())['results'][0];lens=json.loads((a/'lens-report.json').read_text())['results'][0];asset=O/('eldredgeops.lod1.glb'if variant=='lod'else'eldredgeops.glb');digest=sha(asset);assert ocular['assetSha256']==digest and lens['assetSha256']==digest;assert lens['allIndividualLensesTarget65'];assert all(e['target65']for e in ocular['eyes'])
 eyes.append({'variant':variant,'assetSha256':digest,'ocularInsidePercent':[e['insidePercent']for e in ocular['eyes']],'lensCount':lens['lensCount'],'minimumIndividualLensInsidePercent':min(e['insidePercent']for e in lens['lenses']),'minimumConservative95LowerPercent':min(e['conservative95LowerPercent']for e in lens['lenses']),'allIndividualLensesTarget65':True,'ocularReport':str(a/'report.json'),'lensReport':str(a/'lens-report.json')})
(H/'eye-evidence.json').write_text(json.dumps({'criterion':'Both embedded ocular organs AND every individual calcite lens; continuous actual cephalon; no rims or aggregate-only pass','models':eyes},indent=2)+'\n')
meta=json.loads((O/'eldredgeops.json').read_text());meta['eyes']=eyes;meta['artStatus']='preview';(O/'eldredgeops.json').write_text(json.dumps(meta,indent=2)+'\n')
files=sorted(O.glob('eldredgeops*'));ledger={p.name:{'bytes':p.stat().st_size,'sha256':sha(p)}for p in files};(H/'delivery.json').write_text(json.dumps({'status':'initial-preview','files':ledger,'sourceBlend':str(L/'eldredgeops-v2.blend'),'sourceBlendSha256':sha(L/'eldredgeops-v2.blend')},indent=2)+'\n')
views=['threequarter','side','dorsal','front','eye','oral-ventral','action-Crawl','action-Swim','action-Eat','action-Heavy','action-Guard','action-Ability','action-Dodge','action-Death']
sheet=Image.new('RGB',(4*400,4*320),(20,27,33));draw=ImageDraw.Draw(sheet)
for i,name in enumerate(views):
 im=Image.open(Q/(name+'.png')).convert('RGBA');im.thumbnail((400,295),Image.Resampling.LANCZOS);tile=Image.new('RGBA',(400,295),(20,27,33,255));tile.alpha_composite(im,((400-im.width)//2,(295-im.height)//2));x=(i%4)*400;y=(i//4)*320;sheet.paste(tile.convert('RGB'),(x,y));draw.text((x+8,y+301),name,fill='white')
sheet.save(L/'preview-review.jpg',quality=90)
(H/'review-evidence.json').write_text(json.dumps({'status':'initial-preview','actualGLBViews':views,'sourceDirectory':str(Q),'contactSheet':str(L/'preview-review.jpg'),'lodViews':['lod-Idle','lod-Crawl','lod-Death','lod-eye'],'limits':['Static basic action and anatomical review completed; exhaustive sequential playback and all transition combinations deferred.','Enrollment coaptation and complete appendage enclosure remain refinement work.'],'modelSha256':ledger['eldredgeops.glb']['sha256'],'lodSha256':ledger['eldredgeops.lod1.glb']['sha256']},indent=2)+'\n')
D=L/'source';D.mkdir(exist_ok=True)
for p in H.iterdir():
 if p.is_file():shutil.copy2(p,D/p.name)
print(json.dumps({'delivery':ledger,'eyes':eyes},indent=2))
