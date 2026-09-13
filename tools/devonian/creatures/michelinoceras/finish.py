"""Build matching portraits and frozen preview source/evidence ledger."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,shutil,struct
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/michelinoceras/v1';O=L/'candidate';Q=L/'review-export-full'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
im=Image.open(Q/'selection.png').convert('RGBA');assert im.size==(1600,1200);assert im.getextrema()[3][0]==0;im.save(O/'michelinoceras.select.png')
for n,size in [('card',(800,600)),('thumb',(256,192))]:im.resize(size,Image.Resampling.LANCZOS).save(O/('michelinoceras.'+n+'.png'))
bg=Image.new('RGBA',(1200,900),(12,21,27,255));bg.alpha_composite(im.resize((1200,900),Image.Resampling.LANCZOS));bg.convert('RGB').save(O/'michelinoceras.png')
graphs=[]
for name in ['michelinoceras.glb','michelinoceras.lod1.glb']:
 b=(O/name).read_bytes();d=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]]);parents={c:i for i,n in enumerate(d['nodes'])for c in n.get('children',[])};graphs.append({d['nodes'][i]['name']:d['nodes'][parents[i]]['name']if i in parents else None for i in d['skins'][0]['joints']})
assert graphs[0]==graphs[1];(H/'skeleton-graph.json').write_text(json.dumps({'sameFullLOD':True,'boneCount':len(graphs[0]),'graph':graphs[0]},indent=2)+'\n')
ledger={p.name:{'bytes':p.stat().st_size,'sha256':sha(p)}for p in sorted(O.glob('michelinoceras*'))};(H/'delivery.json').write_text(json.dumps({'status':'initial-preview','files':ledger,'sourceBlend':str(L/'michelinoceras.blend'),'sourceBlendSha256':sha(L/'michelinoceras.blend')},indent=2)+'\n')
views=['threequarter','dorsal','side','eye-detail','oral-open','aperture-funnel','action-Bite','action-Swim','action-Eat','action-Heavy','action-Guard','action-Ability','action-Dodge','action-Death','action-Grab'];sheet=Image.new('RGB',(1600,1280),(17,25,31));draw=ImageDraw.Draw(sheet)
for i,n in enumerate(views):
 im=Image.open(Q/(n+'.png')).convert('RGBA');im.thumbnail((400,295));bg=Image.new('RGBA',(400,295),(17,25,31,255));bg.alpha_composite(im,((400-im.width)//2,(295-im.height)//2));x=i%4*400;y=i//4*320;sheet.paste(bg.convert('RGB'),(x,y));draw.text((x+8,y+300),n,fill='white')
sheet.save(L/'preview-review.jpg',quality=90)
seq=sorted(Q.glob('sequence-*.png'));sheet=Image.new('RGB',(1440,714),(17,25,31));draw=ImageDraw.Draw(sheet)
for i,p in enumerate(seq):
 im=Image.open(p).convert('RGBA');im.thumbnail((288,216));bg=Image.new('RGBA',(288,216),(17,25,31,255));bg.alpha_composite(im);x=i%5*288;y=i//5*238;sheet.paste(bg.convert('RGB'),(x,y));draw.text((x+3,y+219),p.stem,fill='white')
sheet.save(L/'sequence-review.jpg',quality=90)
(H/'review-evidence.json').write_text(json.dumps({'status':'initial-preview','fullSha256':ledger['michelinoceras.glb']['sha256'],'lodSha256':ledger['michelinoceras.lod1.glb']['sha256'],'fullViews':views,'lodViews':['Idle','Swim','Death'],'selectedSequenceFrames':[p.name for p in seq],'eyeAudit':{kind:json.loads((L/('audit-'+kind)/'report.json').read_text())for kind in ['full','lod']},'limits':['Detailed arm-root fusion, arm-to-arm contact and all transition combinations need later refinement.','Whole adult shell length, living chamber and soft parts are conservative comparative completions of fragmentary M.currens material.']},indent=2)+'\n')
D=L/'source';D.mkdir(exist_ok=True)
for p in H.iterdir():
 if p.is_file():shutil.copy2(p,D/p.name)
print(json.dumps(ledger,indent=2))
