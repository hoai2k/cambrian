"""Encode separate scheme portraits/cards/thumbs; never overwrite default assets."""
from pathlib import Path
from PIL import Image
import json, hashlib
root=Path(__file__).resolve().parents[2]
manifest=json.loads(Path('/tmp/cambrian-palette-models/manifest.json').read_text())
for id,record in manifest.items():
 image=Image.open(f'/tmp/cambrian-palette-renders/{id}.select.png').convert('RGBA')
 assert image.size==(1600,1200)
 assert image.getchannel('A').getextrema()==(0,255)
 record['sha256']={}
 for kind,size in [('select',(1600,1200)),('card',(1200,900)),('thumb',(256,192))]:
  out=image.resize(size,Image.Resampling.LANCZOS) if image.size!=size else image
  path=root/'public'/record['files'][kind];path.parent.mkdir(parents=True,exist_ok=True)
  for colors in [256,192,128]:
   out.quantize(colors=colors,method=Image.Quantize.FASTOCTREE).save(path,optimize=True)
   if path.stat().st_size<600000:break
  assert path.stat().st_size<600000
  record['sha256'][kind]=hashlib.sha256(path.read_bytes()).hexdigest()
 print(id,record['scheme'])
(root/'public/assets/creatures/schemes/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
