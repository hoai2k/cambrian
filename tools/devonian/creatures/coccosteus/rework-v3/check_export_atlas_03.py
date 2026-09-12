"""Read-only exported-map equality and coverage gate; run with bundled numpy/Pillow."""
import sys,json,struct,io
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from production_common_03 import OUT,BAKE,verify,sha,record
from body_uv_02 import RECTANGLES
verify();dest=OUT/'export-atlas-review.json';assert not dest.exists()
report=json.loads((OUT/'candidate-report.json').read_text())
for row in report['files']:assert sha(row['path'])==row['sha256']
path=OUT/'coccosteus.glb';raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:]
def embedded(index):
    im=g['images'][g['textures'][index]['source']];v=g['bufferViews'][im['bufferView']]
    return np.asarray(Image.open(io.BytesIO(blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])))[...,:3]
records=[]
for mat in g['materials']:
    if not any(role in mat['name']for role in ['body 01-body','oral accent 01-body','underside']):continue
    pbr=mat['pbrMetallicRoughness']
    for channel,index in [('albedo',pbr['baseColorTexture']['index']),('roughness',pbr['metallicRoughnessTexture']['index']),('normal',mat['normalTexture']['index'])]:
        source=BAKE/('01-body-'+channel+'.png');expected=np.asarray(Image.open(source))[...,:3];actual=embedded(index)
        expected=expected[...,0]if channel=='roughness'else expected
        actual=actual[...,1]if channel=='roughness'else actual
        assert actual.shape==expected.shape and np.array_equal(actual,expected), 'Exporter changed baked field '+mat['name']+' '+channel
        h,w=actual.shape[:2];regions=[]
        for ri,(u0,v0,u1,v1)in enumerate(RECTANGLES):
            x0=max(0,int(np.floor(u0*w-.5))-1);x1=min(w,int(np.ceil(u1*w-.5))+3)
            # Stored PNG rows run downward; authored Blender UV v runs upward.
            y0=max(0,int(np.floor(v0*h-.5))-1);y1=min(h,int(np.ceil(v1*h-.5))+3)
            field=actual[::-1][y0:y1,x0:x1].astype(float)/255.;lo,hi=float(field.min()),float(field.max())
            if channel=='roughness':
                assert lo>=.30 and hi<=.85, 'Exported roughness coverage failure'
                if ri==0:assert hi-lo>.02, 'Lost exterior roughness variation'
            elif channel=='albedo':assert lo>.01 and hi<.9, 'Exported albedo coverage failure'
            regions.append({'min':lo,'max':hi,'values':int(field.size)})
        records.append({'material':mat['name'],'channel':channel,'source':record(source),'exactDecodedPixelEquality':True,'regions':regions})
assert len(records)==9
dest.write_text(json.dumps({'complete':True,'sourceGlb':record(path),'checks':records},indent=2)+'\n')
verify();print('COCCOSTEUS_EXPORT_ATLAS_03_COMPLETE')
