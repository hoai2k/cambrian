"""Read-only structural export checks, restricted to the new local candidate."""
import json,struct,hashlib,math,sys,re
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
OUT=ROOT.parent/'devonian-authoring/gemuendina/face-v4/candidate-01'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE.parent/'rework-v3'))
from rig_actions_01 import CLIPS,LOOPS,ANCHORS,bones

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
report=json.loads((OUT/'candidate-report.json').read_text())
for name,digest in report['source_sha256'].items():assert sha(HERE/name)==digest, 'Changed candidate source '+name
assert not (OUT/'export-structural-review.json').exists(), 'Preserve existing check evidence'
# Mirrors the relevant runtime slotFor branches for these named materials.
def slot(name):
    name=name.lower()
    if 'eye'in name:return 'eyes'
    if re.search('ventral|arthrodial|belly|underside|bone',name):return 'underside'
    if re.search('sclerotiz|oral|spine|accent|denticle|tooth|brush',name):return 'accent'
    if re.search(r'membrane|swimming|marginal|\bfin',name):return 'fins'
    return 'body'
reports=[];graphs=[];binds=[]
for suffix in ('','.lod1'):
    path=OUT/('gemuendina'+suffix+'.glb');raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    expected=next(v['sha256']for v in report['files']if v['path']==str(path));assert sha(path)==expected
    assert len(raw)<25*1024*1024, 'Uncompressed local candidate exceeds delivery size gate'
    g=json.loads(raw[20:20+n]);blob=raw[28+n:]
    def data(ai):
        a=g['accessors'][ai];view=g['bufferViews'][a['bufferView']]
        fmt={5126:'f',5123:'H',5125:'I',5121:'B'}[a['componentType']];size=struct.calcsize(fmt)
        count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        offset=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',count*size)
        rows=[struct.unpack_from('<'+fmt*count,blob,offset+i*stride)for i in range(a['count'])]
        if a.get('normalized'):rows=[tuple(v/(255 if a['componentType']==5121 else 65535)for v in row)for row in rows]
        return rows
    prims=[];tris=0
    for mesh in g['meshes']:
        for p in mesh['primitives']:
            attrs=p['attributes'];colors=data(attrs['COLOR_0']);rgb=[v for row in colors for v in row[:3]]
            assert all(math.isfinite(v)for v in rgb)
            ww=data(attrs['WEIGHTS_0']);assert all(abs(sum(row)-1)<1e-5 and min(row)>=0 for row in ww)
            for attr in attrs.values():assert all(math.isfinite(v)for row in data(attr)for v in row)
            mat=g['materials'][p['material']];pbr=mat.get('pbrMetallicRoughness',{})
            assert pbr.get('metallicFactor',1)==0
            if not suffix:
                assert max(abs(v-1)for v in rgb)<1e-6
                if slot(mat['name'])in ('body','eyes'):assert 'baseColorTexture'in pbr and 'TEXCOORD_0'in attrs
            else:
                assert not any(k.endswith('Texture')for k in pbr)
                assert 'normalTexture'not in mat
                assert pbr.get('baseColorFactor',[1,1,1,1])==[1,1,1,1]
                if 'body'in mesh.get('name','').lower():assert max(rgb)-min(rgb)>.005
            tris+=(g['accessors'][p['indices']]['count']if 'indices'in p else len(data(attrs['POSITION'])))/3
            prims.append({'material':mat['name'],'palette_slot':slot(mat['name']),'color_range':[min(rgb),max(rgb)],'texture':bool(pbr.get('baseColorTexture'))})
    assert {p['palette_slot']for p in prims}=={'body','eyes','accent'}
    names=[];signatures=[];durations={};seams={};motion_ranges={}
    for action in g['animations']:
        names.append(action['name']);motion=[];ends=[];dynamic=0.;seam=0.
        for ch in action['channels']:
            target=ch['target'];assert target['path']!='scale';assert g['nodes'][target['node']].get('name')!='root'
            sampler=action['samplers'][ch['sampler']];rows=data(sampler['output'])
            assert sampler.get('interpolation','LINEAR')in ('LINEAR','STEP'), 'Unexpected interpolation policy'
            assert all(math.isfinite(v)for row in rows for v in row)
            times=[r[0]for r in data(sampler['input'])]
            assert all(math.isfinite(t)for t in times) and all(a<b for a,b in zip(times,times[1:]))
            assert len(times)>1 and times[-1]>times[0];ends.append(times[-1]-times[0])
            dynamic=max(dynamic,max(abs(v-rows[0][k])for row in rows for k,v in enumerate(row)))
            direct=max(abs(a-b)for a,b in zip(rows[0],rows[-1]))
            negated=max(abs(a+b)for a,b in zip(rows[0],rows[-1]))if target['path']=='rotation'else math.inf
            seam=max(seam,min(direct,negated))
            motion.append((g['nodes'][target['node']]['name'],target['path'],rows))
        assert dynamic>1e-6, 'Static action '+action['name']
        durations[action['name']]=max(ends)
        assert abs(durations[action['name']]-CLIPS[action['name']])<1e-5, 'Duration drift '+action['name']
        if action['name']in LOOPS:assert seam<1e-4, 'Loop seam '+action['name']
        seams[action['name']]=seam;motion_ranges[action['name']]=dynamic
        signatures.append(hashlib.sha256(json.dumps(motion,sort_keys=True).encode()).hexdigest())
    assert len(signatures)==len(set(signatures)) and len(names)==len(set(names))
    assert set(names)==set(CLIPS)
    nodes=g['nodes'];parents={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
    anchors=[(i,node)for i,node in enumerate(nodes)if node.get('name','').startswith('anchor_')]
    assert len(anchors)==3
    for expected in ANCHORS:
        i,a=next((i,a)for i,a in anchors if a['name']==expected['name'])
        assert a['extras']['cambrianAnchor']=={'version':1,'role':expected['role'],'parentBone':expected['bone']}
        assert nodes[parents[i]]['name']==expected['bone']
        assert all(math.isfinite(v)for v in a.get('translation',[]))
    graph={node['name']:{'parent':nodes[parents[i]].get('name')if i in parents else None,
           **{k:node[k]for k in ('translation','rotation','scale','matrix','extras')if k in node}}
           for i,node in enumerate(nodes)if node.get('name')in bones()or node.get('name','').startswith('anchor_')}
    assert set(bones()).issubset(graph);graphs.append(graph)
    skin_records=[]
    for skin in g['skins']:
        joints=[nodes[i]['name']for i in skin['joints']];assert set(joints)==set(bones())
        inverse=data(skin['inverseBindMatrices']);assert all(math.isfinite(v)for row in inverse for v in row)
        skin_records.append(dict(zip(joints,inverse)))
    assert skin_records;assert all(s==skin_records[0]for s in skin_records);binds.append(skin_records[0])
    reports.append({'file':str(path),'sha256':sha(path),'bytes':len(raw),'triangles':tris,
                    'clips':names,'durations':durations,'channel_variation':motion_ranges,'seams':seams,
                    'materials':prims,'three_nested_anchors':True,'root_stable':True,
                    'no_scale_channels':True,'weights_normalized':True})
assert graphs[0]==graphs[1] and binds[0]==binds[1], 'Full/LOD skeleton, bind matrices or anchors differ'
assert reports[1]['triangles']<reports[0]['triangles']*.4
(OUT/'export-structural-review.json').write_text(json.dumps({'phase':'structural checks only; actual playback/palette/eye audit separate',
    'full_lod_skeleton_and_bind_matrices_match':True,'full_lod_anchor_graph_matches':True,'exports':reports},indent=2)+'\n')
print('GEMUENDINA_EXPORT_STRUCTURE_PASS',[(r['bytes'],len(r['clips']))for r in reports])
