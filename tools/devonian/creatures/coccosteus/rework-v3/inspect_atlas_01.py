"""Pure-Python actual-GLB atlas audit. Nearest centroid samples are diagnostic, not acceptance."""
import json, struct, hashlib, io
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
out=ROOT/'candidate-02-atlas-audit-01.json'
assert not out.exists(), 'Preserve prior audit'
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
path=ROOT/'candidate-02/coccosteus.glb';b=path.read_bytes();length=struct.unpack_from('<I',b,12)[0]
j=json.loads(b[20:20+length]);blob=b[28+length:]
def accessor(i):
    q=j['accessors'][i];v=j['bufferViews'][q['bufferView']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[q['type']]
    dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[q['componentType']])
    return np.ndarray((q['count'],n),dtype=dt,buffer=blob,offset=v.get('byteOffset',0)+q.get('byteOffset',0),strides=(v.get('byteStride',n*dt.itemsize),dt.itemsize))
def image(index):
    im=j['images'][j['textures'][index]['source']];view=j['bufferViews'][im['bufferView']]
    return np.array(Image.open(io.BytesIO(blob[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]))).astype(float)/255
report={'sourceGlb':{'path':str(path),'sha256':sha(path)},'method':'Actual embedded textures at nearest texel to triangle UV centroid; glTF top-down UV; not a raster or artistic acceptance test','materials':j['materials'],'body':[],'evidence':[]}
for mesh in j['meshes']:
    if not mesh['name'].startswith('Continuous'): continue
    for pi,p in enumerate(mesh['primitives']):
        uv=accessor(p['attributes']['TEXCOORD_0']);pos=accessor(p['attributes']['POSITION']);tri=accessor(p['indices']).ravel().reshape(-1,3)
        n=accessor(p['attributes']['NORMAL']);t=accessor(p['attributes']['TANGENT']);mat=j['materials'][p['material']]
        row={'primitive':pi,'material':mat['name'],'triangles':len(tri),'normalLengthBounds':[float(np.linalg.norm(n,axis=1).min()),float(np.linalg.norm(n,axis=1).max())],'maxNormalTangentDot':float(abs((n*t[:,:3]).sum(1)).max()),'uvBounds':[uv.min(0).tolist(),uv.max(0).tolist()],'maps':{}}
        for channel,index,component,threshold in [('albedo',mat['pbrMetallicRoughness']['baseColorTexture']['index'],None,None),('normal',mat['normalTexture']['index'],2,.85),('roughness',mat['pbrMetallicRoughness']['metallicRoughnessTexture']['index'],1,.2)]:
            im=image(index);h,w=im.shape[:2];uvc=uv[tri].mean(1);xy=np.clip((uvc*[w,h]).astype(int),0,[w-1,h-1]);rgb=im[xy[:,1],xy[:,0],:3]
            u=uv[tri[:,1]]-uv[tri[:,0]];v=uv[tri[:,2]]-uv[tri[:,0]];area=abs(u[:,0]*v[:,1]-u[:,1]*v[:,0])/2*w*h
            bad=np.zeros(len(tri),bool) if component is None else rgb[:,component]<threshold
            centers=pos[tri].mean(1)
            row['maps'][channel]={'resolution':[w,h],'centroidRGBBounds':[rgb.min(0).tolist(),rgb.max(0).tolist()],'triangleAreaPixelQuantiles':np.quantile(area,[0,.01,.1,.5,.9,1]).tolist(),'centroidsBelowThreshold':int(bad.sum()),'threshold':threshold,'badTriangles':[{'triangle':int(i),'positionGltfYup':centers[i].tolist(),'uv':uvc[i].tolist(),'rgb':rgb[i].tolist(),'areaPixels':float(area[i])}for i in np.flatnonzero(bad)]}
        report['body'].append(row)
for folder in ['portrait-evidence','pose-evidence']:
    m=json.loads((ROOT/'candidate-02'/folder/'manifest.json').read_text());assert m['complete']
    for row in m['renders']:
        assert sha(row['path'])==row['sha256'];report['evidence'].append({'path':row['path'],'sha256':row['sha256']})
out.write_text(json.dumps(report,indent=2)+'\n');print(out);print('COCCOSTEUS_ATLAS_AUDIT_01_COMPLETE')
