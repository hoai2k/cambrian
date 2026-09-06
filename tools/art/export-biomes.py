"""Production WebP encoding only; paintings are created with built-in imagegen."""
from PIL import Image, ImageOps
from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[2]
source=Path(sys.argv[1])
for item in json.loads((root/'tools/art/biome-prompts.json').read_text()):
    im=ImageOps.fit(Image.open(source/item['source']).convert('RGB'),(1024,576),method=Image.Resampling.LANCZOS)
    target=root/f"public/assets/biomes/{item['id']}.webp"
    for quality in range(90,39,-5):
        im.save(target,quality=quality,method=6)
        if target.stat().st_size<250000: break
    assert target.stat().st_size<250000
    print(item['id'],target.stat().st_size)
