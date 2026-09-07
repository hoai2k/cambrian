"""Derive the three UI sizes and studio background from the final actual-GLB cutout."""
from pathlib import Path
from PIL import Image
import json,hashlib
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/manticoceras';C=L/'initial-candidate'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
digest=sha(C/'manticoceras.glb');D=L/('review-'+digest[:12]);records=json.loads((D/'manifest.json').read_text());p=C/'manticoceras.select.png';original=Image.open(p).convert('RGBA');assert original.size==(1600,1200);assert any(r['imageSha256']==sha(p)and r['sourceGlbSha256']==digest for r in records)
for suffix,size in [('',(1600,1200)),('.card',(800,600)),('.thumb',(256,192))]:
 im=original.resize(size,Image.Resampling.LANCZOS)
 if suffix=='':bg=Image.new('RGBA',size,(32,42,46,255));bg.alpha_composite(im);im=bg
 name='manticoceras'+suffix+'.png';im.save(C/name);im.save(D/name);records.append({'file':name,'clip':'Idle','frame':0,'imageSha256':sha(C/name),'sourceGlbSha256':digest,'derivedFrom':'manticoceras.select.png','method':'Same-camera GLB render; studio alpha composite or Lanczos UI downsample'})
records=list({r['file']:r for r in records}.values());(D/'manifest.json').write_text(json.dumps(records,indent=2))
if (H/'render-validation.json').exists():(H/'render-validation.json').write_text(json.dumps({'sourceGlbSha256':digest,'renders':records},indent=2))
print('Four matching portraits derived from',digest)
