"""Read-only structural export checks, restricted to the new local candidate."""
import json,struct,hashlib,math,sys,re,bisect
from pathlib import Path
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
OUT=ROOT.parent/'devonian-authoring/titanichthys/rework-v3/candidate-06'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
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
def sample(times,rows,t,mode,rotation):
    # Evaluate the actual exported LINEAR/STEP sampler, including constant
    # single-key channels; a terminal hold is not a key-density requirement.
    if t<=times[0]:return rows[0]
    if t>=times[-1]:return rows[-1]
    i=bisect.bisect_right(times,t)-1
    if mode=='STEP':return rows[i]
    u=(t-times[i])/(times[i+1]-times[i]);a,b=rows[i],rows[i+1]
    if rotation:
        def norm(q):
            length=math.sqrt(sum(v*v for v in q));assert length>1e-12
            return tuple(v/length for v in q)
        a,b=norm(a),norm(b);dot=sum(x*y for x,y in zip(a,b))
        if dot<0:b=tuple(-v for v in b);dot=-dot
        dot=max(-1.,min(1.,dot))
        if dot>1-1e-8:return norm(tuple((1-u)*x+u*y for x,y in zip(a,b)))
        angle=math.acos(dot);den=math.sin(angle)
        return norm(tuple((math.sin((1-u)*angle)*x+math.sin(u*angle)*y)/den for x,y in zip(a,b)))
    return tuple((1-u)*x+u*y for x,y in zip(a,b))

reports=[];graphs=[];binds=[];animation_contracts=[]
for suffix in ('','.lod1'):
    path=OUT/('titanichthys'+suffix+'.glb');raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    expected=next(v['sha256']for v in report['files']if v['path']==str(path));assert sha(path)==expected
    # Raw candidate is prepackaging evidence. The <25 MB delivery gate applies
    # after lossless packaging; the exact raw byte count is reported below.
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
            attrs=p['attributes'];assert set(k for k in attrs if k.startswith('COLOR_'))=={'COLOR_0'}, 'Unexpected construction colour field leak';colors=data(attrs['COLOR_0']);rgb=[v for row in colors for v in row[:3]]
            assert all(math.isfinite(v)for v in rgb)
            ww=data(attrs['WEIGHTS_0']);assert all(abs(sum(row)-1)<1e-5 and min(row)>=0 for row in ww)
            for attr in attrs.values():assert all(math.isfinite(v)for row in data(attr)for v in row)
            mat=g['materials'][p['material']];pbr=mat.get('pbrMetallicRoughness',{})
            assert pbr.get('metallicFactor',1)==0
            if not suffix:
                assert max(abs(v-1)for v in rgb)<1e-6
                if slot(mat['name'])in ('body','eyes','fins','underside','accent'):assert 'baseColorTexture'in pbr and 'TEXCOORD_0'in attrs
            else:
                assert not any(k.endswith('Texture')for k in pbr)
                assert 'normalTexture'not in mat
                assert pbr.get('baseColorFactor',[1,1,1,1])==[1,1,1,1]
                if slot(mat['name'])in ('body','underside','accent','fins'):assert max(rgb)-min(rgb)>.005
                assert max(rgb)<.75, 'LOD pigment outside authored linear range'
                if slot(mat['name'])=='eyes':assert sum(rgb)/len(rgb)<.06, 'Lost dark eye pigment'
            tris+=(g['accessors'][p['indices']]['count']if 'indices'in p else len(data(attrs['POSITION'])))/3
            prims.append({'material':mat['name'],'palette_slot':slot(mat['name']),'color_range':[min(rgb),max(rgb)],'texture':bool(pbr.get('baseColorTexture'))})
    assert {p['palette_slot']for p in prims}=={'body','eyes','fins','underside','accent'}
    names=[];signatures=[];durations={};seams={};motion_ranges={};contracts={}
    for action in g['animations']:
        names.append(action['name']);motion=[];ends=[];dynamic=0.;seam=0.;channels=[]
        for ch in action['channels']:
            target=ch['target'];assert target['path']!='scale';assert g['nodes'][target['node']].get('name')!='root'
            sampler=action['samplers'][ch['sampler']];rows=data(sampler['output'])
            assert sampler.get('interpolation','LINEAR')in ('LINEAR','STEP'), 'Unexpected interpolation policy'
            assert all(math.isfinite(v)for row in rows for v in row)
            times=[r[0]for r in data(sampler['input'])]
            assert all(math.isfinite(t)for t in times) and all(a<b for a,b in zip(times,times[1:]))
            assert len(times)>=1 and len(times)==len(rows);ends.append(times[-1]-times[0])
            dynamic=max(dynamic,max(abs(v-rows[0][k])for row in rows for k,v in enumerate(row)))
            direct=max(abs(a-b)for a,b in zip(rows[0],rows[-1]))
            negated=max(abs(a+b)for a,b in zip(rows[0],rows[-1]))if target['path']=='rotation'else math.inf
            seam=max(seam,min(direct,negated))
            if action['name']=='Death':
                held=[sample(times,rows,CLIPS['Death']*phase,sampler.get('interpolation','LINEAR'),target['path']=='rotation')for phase in (.90,.95,1.)]
                assert max(abs(v-held[-1][k])for row in held for k,v in enumerate(row))<1e-5, 'Death terminal hold drift'
            motion.append((g['nodes'][target['node']]['name'],target['path'],rows))
            channels.append({'bone':g['nodes'][target['node']]['name'],'path':target['path'],'times':times,
                             'rows':rows,'interpolation':sampler.get('interpolation','LINEAR')})
        assert dynamic>1e-6, 'Static action '+action['name']
        durations[action['name']]=max(ends)
        assert abs(durations[action['name']]-CLIPS[action['name']])<1e-5, 'Duration drift '+action['name']
        if action['name']!='Death':assert seam<1e-4, 'Loop/recovery seam '+action['name']
        seams[action['name']]=seam;motion_ranges[action['name']]=dynamic
        signatures.append(hashlib.sha256(json.dumps(motion,sort_keys=True).encode()).hexdigest())
        contracts[action['name']]=sorted(channels,key=lambda c:(c['bone'],c['path']))
    for name in ('Attack','Bite','Heavy','Eat','Ability'):
        action=next(a for a in g['animations']if a['name']==name)
        for bone in ('jaw','skull','oral_floor'):
            rows=[data(action['samplers'][ch['sampler']]['output'])for ch in action['channels']if g['nodes'][ch['target']['node']].get('name')==bone and ch['target']['path']=='rotation']
            assert rows and max(abs(v-row[0][k])for row in rows for entry in row for k,v in enumerate(entry))>1e-5, 'Missing anatomical oral action '+name+' '+bone
    assert len(signatures)==len(set(signatures)) and len(names)==len(set(names))
    assert set(names)==set(CLIPS), 'Full/LOD must both retain all18 authored gameplay actions'
    animation_contracts.append(contracts)
    nodes=g['nodes'];parents={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
    anchors=[(i,node)for i,node in enumerate(nodes)if node.get('name','').startswith('anchor_')]
    assert len(anchors)==len(ANCHORS)
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
                    'materials':prims,'all_five_nested_anchors':True,'under_25mb_raw':len(raw)<25*1024*1024,'root_stable':True,
                    'no_scale_channels':True,'weights_normalized':True})
assert animation_contracts[0]==animation_contracts[1], 'Full/LOD animation channels, timing, interpolation or values differ'
assert graphs[0]==graphs[1] and binds[0]==binds[1], 'Full/LOD skeleton, bind matrices or anchors differ'
assert reports[1]['triangles']<reports[0]['triangles']*.4
(OUT/'export-structural-review.json').write_text(json.dumps({'phase':'structural candidate checks only; actual playback/palette/final eye and creature audits plus packaged size gate separate',
    'full_lod_all18_action_channels_timing_and_values_match':True,'dynamic_oral_actions_checked_on_both':True,
    'full_lod_skeleton_and_bind_matrices_match':True,'full_lod_anchor_graph_matches':True,'exports':reports},indent=2)+'\n')
print('TITANICHTHYS_EXPORT_STRUCTURE_PASS',[(r['bytes'],len(r['clips']))for r in reports])
