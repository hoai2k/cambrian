"""Produce final studio/card/thumb outputs for the V3 candidate from its rendered selection image
(adapted from portraits.py: same glow composite, redirected to the candidate directory only)."""
from pathlib import Path
from PIL import Image
import numpy as np
import os
H=Path(__file__).resolve().parent;R=H.parents[3]
O=Path(os.environ['DUNK_OUT']) if os.environ.get('DUNK_OUT') else (R.parent/'devonian-authoring/dunkleosteus/sculpt-candidate')
assert 'public' not in O.parts, 'V3 candidate portraits must never touch public/'
im=Image.open(O/'dunkleosteus.select.png').convert('RGBA');assert im.size==(1600,1200)
y,x=np.mgrid[0:1200,0:1600];glow=np.exp(-(((x-800)/750)**2+((y-560)/590)**2));rgb=np.dstack([9+10*glow,15+15*glow,19+19*glow]);back=Image.fromarray(rgb.astype('uint8')).convert('RGBA');back.alpha_composite(im);back.save(O/'dunkleosteus.png')
im.resize((800,600),Image.Resampling.LANCZOS).save(O/'dunkleosteus.card.png');im.resize((256,192),Image.Resampling.LANCZOS).save(O/'dunkleosteus.thumb.png')
print('Four V3 candidate portraits ready in',O)
