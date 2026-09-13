"""Repack immutable raw06 with reviewed study image bytes for Blender comparison.
All non-image bufferViews remain byte-identical. No mesh/animation/node changes.
"""
from pathlib import Path
import json,struct,hashlib,copy
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
SRC=LOCAL/'candidate-06/titanichthys.glb';OUT=LOCAL/'normal-render-study-02';sha=lambda b:hashlib.sha256(b).hexdigest()
b=SRC.read_bytes();assert sha(b)=='e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad'
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);blob=b[28+n:];original=copy.deepcopy(g)
assert len(g['buffers'])==1 and not g.get('extensionsRequired')
r=json.loads((LOCAL/'png-lossless-study-01/report.json').read_text());nr=json.loads((LOCAL/'body-normal-study-02/report.json').read_text());changes={}
for entry in g['images']:
    view=g['bufferViews'][entry['bufferView']];raw=blob[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
    row=next(x for x in r['images']if x['originalSha256']==sha(raw))
    if row['name']=='body-normal':data=(LOCAL/'body-normal-study-02/body-normal-2048.png').read_bytes();assert sha(data)==nr['outputSha256']
    else:data=(LOCAL/'png-lossless-study-01'/row['file']).read_bytes();assert sha(data)==row['outputSha256']
    changes[entry['bufferView']]=data
new=bytearray();verified=[]
for i,v in enumerate(g['bufferViews']):
    assert v.get('buffer',0)==0 and not v.get('extensions')
    raw=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
    data=changes.get(i,raw);new.extend(b'\0'*((-len(new))%4));v['byteOffset']=len(new);v['byteLength']=len(data);new.extend(data)
    if i not in changes:assert bytes(new[v['byteOffset']:v['byteOffset']+v['byteLength']])==raw;verified.append(i)
new.extend(b'\0'*((-len(new))%4));g['buffers'][0]['byteLength']=len(new)
a=copy.deepcopy(g);a['buffers']=original['buffers'];a['bufferViews']=original['bufferViews'];assert a==original
j=json.dumps(g,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
output=struct.pack('<III',0x46546c67,2,28+len(j)+len(new))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(new),0x004e4942)+new
assert not OUT.exists();OUT.mkdir();(OUT/'titanichthys.glb').write_bytes(output)
(OUT/'report.json').write_text(json.dumps({'sourceSha256':sha(b),'outputSha256':sha(output),'unchangedNonImageViews':verified,'changedImageViews':list(changes),'allOtherJsonExact':True},indent=2)+'\n')
print('NORMAL_RENDER_INPUT_READY',sha(output),len(output))
