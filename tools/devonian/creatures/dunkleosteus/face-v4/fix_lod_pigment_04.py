"""Local COLOR_1 -> COLOR_0 binding repair. No geometry, shader factors or BIN edits.
Preserves candidate03/exports and creates new candidate03/exports-pigment04.
Carries geometry audit results only after exact non-colour JSON and BIN equality.
"""
import copy,hashlib,json,shutil,struct
from pathlib import Path
H=Path(__file__).resolve().parent;R=H.parents[4]
BASE=R.parent/'devonian-authoring/dunkleosteus/face-v4/candidate03'
OLD=BASE/'exports';OUT=BASE/'exports-pigment04'
assert not OUT.exists(),'Refuse to reuse prior pigment04 output'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
manifest=json.loads((OLD/'export-evidence.json').read_text())
summary=json.loads((OLD/'eye-oral-audit-summary.json').read_text())
renders=json.loads((OLD/'render-evidence-all.json').read_text())
assert len(manifest['models'])==2 and len(summary)==2 and len(renders['images'])==20
assert manifest['models'][0]['sha256']=='0ace6026c6b46d9d560528677ffdaf31769d74bea51065b884214c8b1037950d'
assert manifest['models'][1]['sha256']=='d34ec130e45a4540c89aade61e8ae3cc1c48f25fbf337e67296416b0bec0b4ea'
for model in manifest['models']:assert sha(model['path'])==model['sha256']
for row in summary:
    assert row['eyesPass'] and not row['opposingShellFailures'] and not row['opposingGnathalFailures']
    assert sha(row['report'])==row['reportSHA256']
for row in renders['images']:assert sha(row['file'])==row['sha256']


def read(path):
    b=Path(path).read_bytes();n=struct.unpack_from('<I',b,12)[0]
    g=json.loads(b[20:20+n]);tail=b[20+n:]
    assert struct.unpack_from('<I',tail,4)[0]==0x004e4942
    return g,tail


def write(path,g,tail):
    j=json.dumps(g,separators=(',',':')).encode();j+=b' '*(-len(j)%4)
    Path(path).write_bytes(struct.pack('<III',0x46546c67,2,20+len(j)+len(tail))+struct.pack('<II',len(j),0x4e4f534a)+j+tail)


def without_colors(g):
    g=copy.deepcopy(g)
    for m in g['meshes']:
        for p in m['primitives']:
            for k in list(p['attributes']):
                if k.startswith('COLOR_'):del p['attributes'][k]
    return g


def colors(g,tail,index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
    assert a['componentType']==5123 and a['normalized'] and a['type']=='VEC4'
    stride=v.get('byteStride',8);offset=8+v.get('byteOffset',0)+a.get('byteOffset',0)
    return [struct.unpack_from('<4H',tail,offset+i*stride) for i in range(a['count'])]


source=OLD/'dunkleosteus.lod1.glb';oldg,tail=read(source);newg=copy.deepcopy(oldg)
bindings=[]
for mi,m in enumerate(newg['meshes']):
    for pi,p in enumerate(m['primitives']):
        a=p['attributes'];assert 'COLOR_0' in a and 'COLOR_1' in a
        old=colors(oldg,tail,a['COLOR_0']);pigment=colors(oldg,tail,a['COLOR_1'])
        assert len(pigment)==oldg['accessors'][a['POSITION']]['count']
        assert all(c==(65535,65535,65535,65535) for c in old)
        assert any(min(c[:3])<60000 for c in pigment) and all(c[3]==65535 for c in pigment)
        bindings.append({'mesh':m['name'],'primitive':pi,'oldColor0Accessor':a['COLOR_0'],
                         'pigmentAccessor':a['COLOR_1'],'count':len(pigment),
                         'rgbMin':[min(c[i] for c in pigment)/65535 for i in range(3)],
                         'rgbMax':[max(c[i] for c in pigment)/65535 for i in range(3)]})
        a['COLOR_0']=a.pop('COLOR_1')
assert without_colors(oldg)==without_colors(newg),'Non-colour JSON changed'
OUT.mkdir()
newlod=OUT/source.name;write(newlod,newg,tail)
checkg,checktail=read(newlod)
assert checktail==tail and without_colors(checkg)==without_colors(oldg)
assert all('COLOR_1' not in p['attributes'] for m in checkg['meshes'] for p in m['primitives'])
shutil.copy2(OLD/'dunkleosteus.glb',OUT/'dunkleosteus.glb')
assert sha(OUT/'dunkleosteus.glb')==sha(OLD/'dunkleosteus.glb')
proof={'scriptSHA256':sha(__file__),'sourceLOD':str(source),'sourceLODSHA256':sha(source),
       'correctedLOD':str(newlod),'correctedLODSHA256':sha(newlod),
       'binChunkSHA256':hashlib.sha256(tail).hexdigest(),'binaryChunkUnchanged':True,
       'nonColorDocumentEquality':True,'unchangedData':'All positions, indices, normals, UVs, weights, joints, morphs, materials, node hierarchy/transforms, skins, animations, anchors, accessors and bufferViews. Only primitive COLOR bindings differ.',
       'bindings':bindings,'sourceExportEvidenceSHA256':sha(OLD/'export-evidence.json'),
       'sourceRenderEvidenceSHA256':sha(OLD/'render-evidence-all.json')}
(OUT/'pigment-repair-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
newmanifest=copy.deepcopy(manifest)
newmanifest['status']='Geometry/audits preserved; corrected LOD pigment awaits actual render review'
newmanifest['pigmentRepairScriptSHA256']=sha(__file__)
newmanifest['pigmentRepairProofSHA256']=sha(OUT/'pigment-repair-proof.json')
for m in newmanifest['models']:
    p=OUT/Path(m['path']).name;m['path']=str(p);m['sha256']=sha(p);m['bytes']=p.stat().st_size
(OUT/'export-evidence.json').write_text(json.dumps(newmanifest,indent=2)+'\n')

# Transfer only hash-verified full images: their source full GLB is byte-identical.
fullsha=newmanifest['models'][0]['sha256'];inherited=[]
for row in renders['images']:
    if row['asset']!='dunkleosteus.glb':continue
    assert row['assetSHA256']==fullsha
    source=Path(row['file']);dest=OUT/source.relative_to(OLD);dest.parent.mkdir(exist_ok=True)
    shutil.copy2(source,dest);assert sha(dest)==row['sha256']
    updated=copy.deepcopy(row);updated['file']=str(dest);inherited.append(updated)
assert len(inherited)==12
(OUT/'render-evidence-inherited-full.json').write_text(json.dumps({'images':inherited,
    'sourceEvidence':str(OLD/'render-evidence-all.json'),'sourceEvidenceSHA256':sha(OLD/'render-evidence-all.json'),
    'reason':'Same full GLB hash; these eight full views and four portraits were copied byte-for-byte, not re-rendered.'},indent=2)+'\n')

# Preserve original audit execution identity and explicitly record the exact
# geometry/rig/animation equality that allows transfer to the material derivative.
newsummary=[]
for model,row in zip(newmanifest['models'],summary):
    original=json.loads(Path(row['report']).read_text());updated=copy.deepcopy(original)
    updated['asset']=model['path'];updated['assetSHA256']=model['sha256']
    updated['carriedForwardFrom']={'report':row['report'],'reportSHA256':row['reportSHA256'],
        'assetSHA256':original['assetSHA256'],'proofSHA256':sha(OUT/'pigment-repair-proof.json'),
        'reason':'Exact non-colour glTF JSON and complete BIN chunk equality; geometry, rig, animations and anchor transforms unchanged. No new audit execution claimed.'}
    out=OUT/Path(row['report']).name;out.write_text(json.dumps(updated,indent=2)+'\n')
    newrow=copy.deepcopy(row);newrow['report']=str(out);newrow['reportSHA256']=sha(out)
    newrow['evidenceKind']='Carried-forward exact-geometry audit';newsummary.append(newrow)
(OUT/'eye-oral-audit-summary.json').write_text(json.dumps(newsummary,indent=2)+'\n')
meta=json.loads((OLD/'dunkleosteus.json').read_text());meta['status']='preview, corrected LOD material review pending'
meta['artCandidate']='face-v4-candidate03-pigment04'
(OUT/'dunkleosteus.json').write_text(json.dumps(meta,indent=2)+'\n')
print('DUNK_V4_PIGMENT_REPAIRED',json.dumps({'output':str(OUT),'proofSHA256':sha(OUT/'pigment-repair-proof.json'),'lodSHA256':sha(newlod),'fullSHA256':fullsha,'copiedFullImages':len(inherited)}))
