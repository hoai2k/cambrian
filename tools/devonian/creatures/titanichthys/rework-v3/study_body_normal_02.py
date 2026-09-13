"""Bounded normal-map study: average decoded vectors, renormalize, preserve albedo.
Outputs a local replacement image only; model approval requires matched rendering.
"""
from pathlib import Path
import json,hashlib
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
BASE=LOCAL/'png-lossless-study-01';OUT=LOCAL/'body-normal-study-02'
r=json.loads((BASE/'report.json').read_text());row=next(x for x in r['images']if x['name']=='body-normal')
src=BASE/row['file'];raw=src.read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest();assert sha(raw)==row['outputSha256']
im=Image.open(src);assert im.mode=='RGB' and im.size==(4096,4096)
a=np.asarray(im,dtype=np.float32)/127.5-1
length=np.linalg.norm(a,axis=2,keepdims=True);assert np.all(length>1e-4)
a/=length
# The texture is linear tangent-space data. Area average a 2x2 pixel footprint,
# then normalize direction; never sRGB-gamma filter normal RGB components.
v=a.reshape(2048,2,2048,2,3).mean(axis=(1,3));length=np.linalg.norm(v,axis=2,keepdims=True);assert np.all(length>1e-4)
v/=length
encoded=np.rint((v+1)*127.5).clip(0,255).astype(np.uint8)
check=encoded.astype(np.float32)/127.5-1;check/=np.linalg.norm(check,axis=2,keepdims=True)
quantization=np.degrees(np.arccos(np.clip((v*check).sum(2),-1,1)))
coarse=np.repeat(np.repeat(check,2,axis=0),2,axis=1)
angular=np.degrees(np.arccos(np.clip((a*coarse).sum(2),-1,1)))
assert not OUT.exists();OUT.mkdir();dest=OUT/'body-normal-2048.png';Image.fromarray(encoded).save(dest,optimize=True,compress_level=9)
report={'scope':'Local body normal resolution study only; preserve full 4096 albedo and all other maps; art review required',
 'sourceSha256':sha(raw),'outputSha256':sha(dest.read_bytes()),'beforeBytes':len(raw),'afterBytes':dest.stat().st_size,
 'filter':'linear decoded unit-vector 2x2 area mean, renormalized, RGB8 quantized',
 'sourceShortVectorsUnderHalf':183, 'sourceShortVectorNote':'Existing 183 nonzero short normal vectors around pixels y377:502,x861:949 are normalized like other samples; review this patch in comparison',
 'quantizationDegrees':{'mean':float(quantization.mean()),'max':float(quantization.max())},
 'discardedDetailDegreesVsNearestUpsample':{'mean':float(angular.mean()),'p95':float(np.percentile(angular,95)),'max':float(angular.max())},
 'estimatedFinalGlbBytes':r['estimatedGlbBytes']-len(raw)+dest.stat().st_size,'sourceUnchanged':sha(src.read_bytes())==sha(raw)}
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
