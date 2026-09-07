"""Resize and encode delivery assets, preserving portrait transparency."""
from PIL import Image,ImageOps
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[2]
for item in json.loads((root/'tools/art/generation-prompts.json').read_text()):
 id=item['id'];size=(1080,1920) if id=='keyart-mobile' else (2560,1440) if id=='keyart' else (640,360)
 image=ImageOps.fit(Image.open(Path(sys.argv[1]) / item['source']).convert('RGB'),size,method=Image.Resampling.LANCZOS)
 path=root/f'public/assets/{"brand" if id.startswith("keyart") else "ui"}/{id}.webp'
 for quality in range(90,39,-5):
  image.save(path,quality=quality,method=6)
  if path.stat().st_size<600000:break
 assert path.stat().st_size<600000
for path in (root/'public/assets/creatures').glob('*.select.png'):
 image=Image.open(path).convert('RGBA')
 for colors in (256,192,128):
  image.quantize(colors=colors,method=Image.Quantize.FASTOCTREE).save(path,optimize=True)
  if path.stat().st_size<600000:break
 assert path.stat().st_size<600000
