"""Produce final studio/card/thumb outputs from the rendered V2 selection image."""
from pathlib import Path
from PIL import Image
import numpy as np
H=Path(__file__).resolve().parent;O=H.parents[3]/'public/assets/devonian/creatures'
im=Image.open(O/'dunkleosteus.select.png').convert('RGBA');assert im.size==(1600,1200)
y,x=np.mgrid[0:1200,0:1600];glow=np.exp(-(((x-800)/750)**2+((y-560)/590)**2));rgb=np.dstack([9+10*glow,15+15*glow,19+19*glow]);back=Image.fromarray(rgb.astype('uint8')).convert('RGBA');back.alpha_composite(im);back.save(O/'dunkleosteus.png')
im.resize((800,600),Image.Resampling.LANCZOS).save(O/'dunkleosteus.card.png');im.resize((256,192),Image.Resampling.LANCZOS).save(O/'dunkleosteus.thumb.png')
print('Four final V2 PNGs ready')
