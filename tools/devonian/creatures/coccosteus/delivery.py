"""Freeze reviewed candidate evidence; does not publish or change model files."""
from pathlib import Path
import hashlib,json,shutil
from PIL import Image

H=Path(__file__).resolve().parent
L=H.parents[3].parent/'devonian-authoring/coccosteus'
C=L/'v2-candidate'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def read(p):return json.loads(p.read_text())
def write(p,data):p.write_text(json.dumps(data,indent=2)+'\n')
validation=read(H/'validation.json')
models=validation['models']
for model in models:assert sha(C/model['file'])==model['sha256']
full,lod=[model['sha256'] for model in models]
for subdir,dest,expected in [('v2-eye-audit','eye-audit-v2.json',full),('v2-eye-audit-lod','eye-audit-lod-v2.json',lod)]:
 report=read(L/subdir/'report.json');result=report['results'][0]
 assert result['assetSha256']==expected and result['headTopology']['valid']
 assert not result['headTopology']['cappedBoundaryLoops']
 assert all(e['criterion50']=='PASS' and e['conservative95Percent'][0]>75 for e in result['eyes'])
 shutil.copy2(L/subdir/'report.json',H/dest)
playback=read(L/'playback-validation-v2.json')
assert playback['sourceGlbSha256']==full and len(playback['audit'])==18 and not playback['errors']
assert all(c['finite'] and c['rootStable'] for c in playback['audit'])
assert sha(L/'motion-review-v2.webm')==playback['videoSha256']
shutil.copy2(L/'playback-validation-v2.json',H/'playback-validation-v2.json')
renders=read(H/'render-validation-v2.json')
assert renders['sourceGlbSha256']==full and len(renders['renders'])==25
review=L/('review-'+full[:12])
for render in renders['renders']:
 assert render['sourceGlbSha256']==full
 assert sha(review/render['file'])==render['imageSha256']
portraits=[]
for name,dim in [('coccosteus.png',(1600,1200)),('coccosteus.select.png',(1600,1200)),('coccosteus.card.png',(800,600)),('coccosteus.thumb.png',(256,192))]:
 im=Image.open(C/name);assert im.size==dim and im.mode=='RGBA'
 assert sha(C/name)==sha(review/name)
 portraits.append({'file':name,'dimensions':dim,'sha256':sha(C/name)})
write(H/'lod-render-validation-v2.json',{'sourceGlbSha256':lod,'renderer':'Blender actual imported GLB, Cycles 24 samples','reviewed':['Idle','Swim','Death'],'images':[{'file':'LOD-'+n+'-v2.png','sha256':sha(L/('LOD-'+n+'-v2.png'))}for n in ['Idle','Swim','Death']]})
write(H/'delivery-v2.json',{
 'status':'reviewed candidate; awaiting parent lossless packaging and viewer intake',
 'candidateDirectory':str(C),'sourceBlend':{'path':str(L/'coccosteus-v2.blend'),'sha256':sha(L/'coccosteus-v2.blend')},
 'models':[{'file':m['file'],'sha256':m['sha256'],'bytes':m['bytes'],'triangles':m['triangles'],'joints':m['bones'],'textures':m['textures']}for m in models],
 'portraits':portraits,'metadata':{'file':'coccosteus.json','sha256':sha(C/'coccosteus.json')},
 'evidence':{n:sha(H/n)for n in ['validation.json','eye-audit-v2.json','eye-audit-lod-v2.json','playback-validation-v2.json','render-validation-v2.json','lod-render-validation-v2.json','action-review-v2.jpg','eye-review-v2.jpg','mouth-review-v2.jpg','playback-review-v2.jpg']},
 'visualReview':{'fullPoses':10,'threePlaybackClips':18,'eyeAngles':4,'litMouthAngles':6,'oppositeDeath':True,'lodPoses':3},
 'notes':['No model shape or animation changed after accepted form; final aperture-rim correction is oral pigmentation only.','A narrow oral rim highlight is continuous tissue, not a separate blade.','LOD has matching skin graph and sockets, no textures and 28.19% of full triangles.','No public assets, shared catalogue, git branches or commits are changed by this script.']})
print('Coccosteus delivery provenance verified and frozen:',full,lod)
