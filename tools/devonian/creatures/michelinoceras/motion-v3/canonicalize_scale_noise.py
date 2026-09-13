"""Hash-bound canonicalization of measured Blender unit-scale decomposition noise.

The author keyed only rotation/location and reset scale to one. This is not an
intake tolerance: strict intake still rejects every nonidentity emitted value.
Preserve original binary data; append fresh identity accessors to avoid aliases.
"""
from pathlib import Path
import copy
import hashlib
import json
import math
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4].parent/'devonian-authoring/michelinoceras/motion-v3'
SOURCE, OUT = ROOT/'runtime-candidate-01', ROOT/'runtime-canonical-01'
EXPECTED = {'michelinoceras.glb': '1fa137c03f976d711ed20035a06f93b554bc8164a072e0c6f1710fa7607c76c1',
    'michelinoceras.lod1.glb': '6145fdbcc07ff8b1ddca33abd40f6a5913f303f8d94aa492ab1cc20ae255d21d'}
BOUND = 5e-7  # Measured maximum 4.172325134277344e-7; fixed source hashes only.
assert not OUT.exists(), f'Preserve prior derivative: {OUT}'
raw_inputs = {name: (SOURCE/name).read_bytes() for name in EXPECTED}
assert all(hashlib.sha256(data).hexdigest() == EXPECTED[name] for name, data in raw_inputs.items())
OUT.mkdir()
reports = []
for name, raw in raw_inputs.items():
    json_length = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20+json_length]); original = copy.deepcopy(doc)
    bin_start = 20+json_length
    size, kind = struct.unpack_from('<I4s', raw, bin_start)
    assert kind == b'BIN\x00' and bin_start+8+size == len(raw) and len(doc['buffers']) == 1
    original_binary = raw[bin_start+8:]
    binary = bytearray(original_binary)
    replacements, accessor_changes, node_changes, channel_map = {}, [], {}, []
    for animation in doc['animations']:
        for channel in animation['channels']:
            if channel['target']['path'] != 'scale':
                continue
            node_index = channel['target']['node']; node = doc['nodes'][node_index]
            assert 'matrix' not in node
            if node_index not in node_changes:
                before = node.get('scale', [1, 1, 1])
                assert all(math.isfinite(v) and abs(v-1) <= BOUND for v in before), (name, node['name'], before)
                node_changes[node_index] = {'node': node['name'], 'before': before, 'after': [1, 1, 1]}
                node['scale'] = [1, 1, 1]
            sampler = animation['samplers'][channel['sampler']]
            assert sampler.get('interpolation', 'LINEAR') in ('LINEAR', 'STEP'), 'Unexpected cubic curve requires new audit'
            index = sampler['output']
            if index not in replacements:
                accessor = doc['accessors'][index]; view = doc['bufferViews'][accessor['bufferView']]
                assert accessor['componentType'] == 5126 and accessor['type'] == 'VEC3' and 'sparse' not in accessor
                start = view.get('byteOffset', 0)+accessor.get('byteOffset', 0)
                samples = [struct.unpack_from('<3f', original_binary, start+i*view.get('byteStride', 12)) for i in range(accessor['count'])]
                assert all(math.isfinite(v) and abs(v-1) <= BOUND for sample in samples for v in sample), (name, index)
                changes = [{'sample': i, 'before': list(sample), 'deltaToIdentity': [1-v for v in sample]} for i, sample in enumerate(samples) if any(v != 1 for v in sample)]
                accessor_changes.append({'originalAccessor': index, 'samples': len(samples), 'changedSamples': changes})
                payload = struct.pack('<3f', 1, 1, 1)*len(samples)
                doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(payload)})
                new_accessor = copy.deepcopy(accessor)
                new_accessor.update(bufferView=len(doc['bufferViews'])-1, byteOffset=0, min=[1, 1, 1], max=[1, 1, 1])
                doc['accessors'].append(new_accessor); replacements[index] = len(doc['accessors'])-1
                binary.extend(payload)
            replacement = dict(sampler, output=replacements[index])
            animation['samplers'].append(replacement); channel['sampler'] = len(animation['samplers'])-1
            channel_map.append({'clip': animation['name'], 'node': node['name'], 'oldOutput': index, 'newOutput': replacements[index]})
    # Everything other than the declared scale data and bind-scale slots is exact.
    assert bytes(binary[:len(original_binary)]) == original_binary
    for key in ('meshes', 'skins', 'materials', 'textures', 'images', 'scenes'):
        assert doc.get(key) == original.get(key), f'Changed {key}'
    for before, after in zip(original['nodes'], doc['nodes']):
        assert {k: v for k, v in before.items() if k != 'scale'} == {k: v for k, v in after.items() if k != 'scale'}
    for before, after in zip(original['animations'], doc['animations']):
        assert [c for c in before['channels'] if c['target']['path'] != 'scale'] == [c for c in after['channels'] if c['target']['path'] != 'scale']
        assert after['samplers'][:len(before['samplers'])] == before['samplers']
    doc['buffers'][0]['byteLength'] = len(binary)
    text = json.dumps(doc, separators=(',', ':')).encode(); text += b' '*((-len(text)) % 4)
    result = struct.pack('<4sII', b'glTF', 2, 28+len(text)+len(binary))+struct.pack('<I4s', len(text), b'JSON')+text+struct.pack('<I4s', len(binary), b'BIN\x00')+binary
    (OUT/name).write_bytes(result)
    report = {'file': name, 'inputSha256': EXPECTED[name], 'sha256': hashlib.sha256(result).hexdigest(), 'bytes': len(result),
        'bound': BOUND, 'originalBinaryPrefixUnchanged': True, 'geometryRotationLocationMaterialsSocketsUnchanged': True,
        'bindScaleChanges': list(node_changes.values()), 'scaleAccessors': accessor_changes, 'scaleChannels': channel_map}
    (OUT/(name+'.scale-changes.json')).write_text(json.dumps(report, indent=2)+'\n')
    reports.append({k: v for k, v in report.items() if k not in ('bindScaleChanges', 'scaleAccessors', 'scaleChannels')})
(OUT/'michelinoceras.json').write_bytes((SOURCE/'michelinoceras.json').read_bytes())
(OUT/'canonicalization-report.json').write_text(json.dumps({'status': 'bounded-unit-scale-canonicalization', 'outputs': reports}, indent=2)+'\n')
print(json.dumps(reports, indent=2))
