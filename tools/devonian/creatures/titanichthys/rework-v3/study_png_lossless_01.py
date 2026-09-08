"""Read-only asset study: PNG recompression with exact decoded RGB proof.
No model written or changed; original embedded images preserved in source GLB.
"""
from pathlib import Path
from io import BytesIO
import hashlib,json,struct
from PIL import Image
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
SRC=LOCAL/'packaging-study-candidate06-01/titanichthys.glb';OUT=LOCAL/'png-lossless-study-01'
sha=lambda b:hashlib.sha256(b).hexdigest()
b=SRC.read_bytes();assert sha(b)=='54a56a7490f1510b805f2d18968522cb782a7237c92d76d6e737e7f7296b8a25'
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);binary=b[28+n:]
assert not OUT.exists();OUT.mkdir()
report={'sourceSha256':sha(b),'scope':'Local PNG study only; no model replacement','images':[]}
for i,entry in enumerate(g['images']):
    view=g['bufferViews'][entry['bufferView']];raw=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    assert entry['mimeType']=='image/png'
    im=Image.open(BytesIO(raw));im.load();dest=BytesIO()
    im.save(dest,format='PNG',optimize=True,compress_level=9)
    encoded=dest.getvalue();check=Image.open(BytesIO(encoded));check.load()
    assert check.mode==im.mode and check.size==im.size and check.tobytes()==im.tobytes()
    chosen=encoded if len(encoded)<len(raw) else raw
    file=f'{i:02d}.png';(OUT/file).write_bytes(chosen)
    report['images'].append({'index':i,'name':entry.get('name'),'file':file,'mode':im.mode,'size':im.size,'before':len(raw),'after':len(chosen),'originalSha256':sha(raw),'outputSha256':sha(chosen),'decodedPixelsSha256':sha(im.tobytes()),'decodedExact':True,'originalMetadataKeys':list(im.info)})
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(i,len(raw),len(chosen),flush=True)
report['beforeImageBytes']=sum(i['before']for i in report['images']);report['afterImageBytes']=sum(i['after']for i in report['images'])
report['estimatedGlbBytes']=len(b)-report['beforeImageBytes']+report['afterImageBytes'];report['complete']=True
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
assert sha(SRC.read_bytes())==report['sourceSha256']
print('PNG_LOSSLESS_STUDY',report['estimatedGlbBytes'],flush=True)
