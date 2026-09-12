"""Read-only GLB/metadata contract check before the changed-model visual review.

No generic eye audit, selector edits, packaging, fixes or public writes.
"""
import hashlib
import math
import json
import struct
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
ROOT = REPO.parent/'devonian-authoring/michelinoceras/motion-v3/candidate-01'
REVIEW = REPO.parent/'devonian-authoring/michelinoceras/motion-v3/validation-review-01'
ORIGINAL = REPO.parent/'devonian-authoring/michelinoceras/v1/candidate/michelinoceras.glb'


def read(path):
    raw = path.read_bytes()
    assert raw[:4] == b'glTF'
    count = struct.unpack_from('<I', raw, 12)[0]
    document = json.loads(raw[20:20+count])
    return document, raw[28+count:], hashlib.sha256(raw).hexdigest()


def payload(doc, binary, index):
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    dimensions = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[accessor['type']]
    width = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}[accessor['componentType']]*dimensions
    start = view.get('byteOffset', 0)+accessor.get('byteOffset', 0)
    stride = view.get('byteStride', width)
    return b''.join(binary[start+i*stride:start+i*stride+width] for i in range(accessor['count']))


def geometry(doc, binary):
    result = {}
    for node in doc['nodes']:
        if 'mesh' not in node:
            continue
        parts = []
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            data = {name: hashlib.sha256(payload(doc, binary, index)).hexdigest() for name, index in primitive['attributes'].items() if name in ('POSITION', 'NORMAL', 'TEXCOORD_0', 'WEIGHTS_0')}
            parts.append(data)
        result[node['name']] = parts
    return result


original, original_binary, _ = read(ORIGINAL)
report = []
root_evidence = []
original_root = next(n for n in original['nodes'] if n['name'] == 'root')
for detail in ('full', 'lod'):
    path = ROOT/('michelinoceras.glb' if detail == 'full' else 'michelinoceras.lod1.glb')
    doc, binary, digest = read(path)
    expected = {a['name'] for a in original['animations']} if detail == 'full' else {'Idle', 'Swim', 'Death', 'Attack', 'Bite', 'Heavy', 'Eat'}
    assert {a['name'] for a in doc['animations']} == expected
    joints = {doc['nodes'][j]['name'] for skin in doc['skins'] for j in skin['joints']}
    assert len(joints) == 166
    assert all(f'arm_{arm}_{section:02d}' in joints for arm in range(10) for section in range(16))
    anchors = {n['name']: n['extras']['cambrianAnchor'] for n in doc['nodes'] if n.get('extras', {}).get('cambrianAnchor')}
    assert len(anchors) == 13
    assert anchors['anchor_grasp']['chain'] == [f'arm_0_{j:02d}' for j in range(13)]
    assert anchors['anchor_mouth']['parentBone'] == anchors['anchor_mouth_inside']['parentBone'] == 'head'
    for info in anchors.values():
        assert info['parentBone'] in joints
        assert all(name in joints for name in info.get('chain', []))
    for animation in doc['animations']:
        for channel in animation['channels']:
            target = channel['target']
            if target['path'] == 'scale':
                sampler = animation['samplers'][channel['sampler']]
                values = payload(doc, binary, sampler['output'])
                assert all(abs(v-1) < 1e-5 for v in struct.unpack('<'+'f'*(len(values)//4), values)), 'Nonidentity animation scale'
            if doc['nodes'][target['node']]['name'] == 'root':
                node = doc['nodes'][target['node']]
                path_name = target['path']
                defaults = {'translation': [0, 0, 0], 'rotation': [0, 0, 0, 1], 'scale': [1, 1, 1]}
                assert path_name in defaults, 'Unexpected root animation property'
                rest = node.get(path_name, defaults[path_name])
                original_rest = original_root.get(path_name, defaults[path_name])
                assert rest == original_rest, 'Exported root bind transform changed from original'
                sampler = animation['samplers'][channel['sampler']]
                interpolation = sampler.get('interpolation', 'LINEAR')
                assert interpolation in ('LINEAR', 'STEP'), 'Root interpolation requires explicit tangent audit'
                accessor = doc['accessors'][sampler['output']]
                assert accessor['componentType'] == 5126
                dimension = len(rest)
                assert accessor['type'] == ('VEC4' if dimension == 4 else 'VEC3')
                data = payload(doc, binary, sampler['output'])
                samples = list(struct.iter_unpack('<'+'f'*dimension, data))
                assert len(samples) == accessor['count'] and samples
                maximum = 0.0
                for values in samples:
                    assert all(math.isfinite(v) for v in values), 'Nonfinite root animation value'
                    deviation = max(abs(a-b) for a, b in zip(values, rest))
                    if path_name == 'rotation':
                        assert abs(sum(v*v for v in values)-1) < 1e-5, 'Invalid root quaternion'
                        deviation = min(deviation, max(abs(a+b) for a, b in zip(values, rest)))
                    maximum = max(maximum, deviation)
                assert maximum < 1e-6, f'Root moves away from original bind transform: {animation["name"]} {path_name} {maximum}'
                root_evidence.append({'detail': detail, 'clip': animation['name'], 'property': path_name,
                    'sampleCount': len(samples), 'interpolation': interpolation, 'maxDeviationFromOriginalBind': maximum})
    if detail == 'full':
        assert geometry(doc, binary) == geometry(original, original_binary), 'Full mesh position/normal/UV/weights changed'
    report.append({'detail': detail, 'path': str(path), 'sha256': digest, 'clips': sorted(expected), 'joints': len(joints), 'anchors': len(anchors)})
metadata = json.loads((ROOT/'michelinoceras.json').read_text())
assert 'Eat' not in metadata['looping']
assert metadata['feedingPerformance']['progressDriven'] is True
evidence = json.loads((ROOT/'pose-evidence.json').read_text())
late_eat = [row for row in evidence['contactErrorsEveryFrame'] if row['progress'] >= .22]
assert late_eat
worst_contact = max(max(row['solverErrors']) for row in late_eat)
# This is a delivery gate only. The executor must return an error, never loosen
# the threshold or alter the motion to pass. Visual acceptance remains separate.
assert worst_contact < .035, f'Authored arm contact residual {worst_contact:.6f} exceeds .035 model units'
(REVIEW/'contract-validation-v2.json').write_text(json.dumps({'status': 'PASS', 'validatorRevision': 2, 'rootChannels': root_evidence, 'assets': report, 'maxAuthoredContactError': worst_contact,
    'limit': 'Actual mesh/action sequence and runtime feeding still require review; this is not art acceptance.'}, indent=2)+'\n')
print('MICHELINOCERAS_MOTION_V3_CONTRACT_PASS', json.dumps(report), 'contact residual', worst_contact)
