"""Add only scene feeding extras in a new candidate; approved binary is retained."""
from pathlib import Path
import json
import struct
import hashlib

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4].parent/'devonian-authoring/michelinoceras/motion-v3'
OUT = ROOT/'runtime-candidate-01'
EXPECTED = {'michelinoceras.glb': '6578d9f6d1ca05d91520f17ceb8a73d484fb0f0cbb9b1ac5da11c7698c79446e',
    'michelinoceras.lod1.glb': 'fb23383110182f27d2e69fd2629f2a1ea8013206e87e6088e7613ee10a4e1719'}
CONFIG = {'version': 1, 'mode': 'authored-grasp', 'clip': 'Eat', 'apertureDiameter': .14, 'pickupOffsetLimit': .24}
assert not OUT.exists(), f'Never overwrite a candidate: {OUT}'
inputs = {name: (ROOT/'candidate-01'/name).read_bytes() for name in EXPECTED}
assert all(hashlib.sha256(data).hexdigest() == EXPECTED[name] for name, data in inputs.items())
OUT.mkdir()
report = []
for name, data in inputs.items():
    old_length = struct.unpack_from('<I', data, 12)[0]
    document = json.loads(data[20:20+old_length])
    original_document = json.loads(json.dumps(document))
    scene = document['scenes'][document.get('scene', 0)]
    extras = scene.setdefault('extras', {})
    assert 'cambrianFeeding' not in extras
    extras['cambrianFeeding'] = CONFIG
    text = json.dumps(document, separators=(',', ':')).encode()
    text += b' '*((-len(text)) % 4)
    unchanged_chunks = data[20+old_length:]
    result = struct.pack('<4sII', b'glTF', 2, 20+len(text)+len(unchanged_chunks))+struct.pack('<I4s', len(text), b'JSON')+text+unchanged_chunks
    # Require exact semantic identity apart from the one declared scene extra.
    verify = json.loads(text)
    changed_scene = verify['scenes'][verify.get('scene', 0)]
    del changed_scene['extras']['cambrianFeeding']
    if 'extras' not in original_document['scenes'][original_document.get('scene', 0)]:
        del changed_scene['extras']
    assert verify == original_document
    assert result[20+len(text):] == unchanged_chunks
    (OUT/name).write_bytes(result)
    report.append({'file': name, 'approvedInputSha256': EXPECTED[name], 'runtimeSha256': hashlib.sha256(result).hexdigest(),
        'bytes': len(result), 'unchangedBinaryChunksSha256': hashlib.sha256(unchanged_chunks).hexdigest(),
        'geometryActionsMaterialsAndAnchorsUnchanged': True})
metadata = json.loads((ROOT/'candidate-01/michelinoceras.json').read_text())
metadata['cambrianFeeding'] = CONFIG
(OUT/'michelinoceras.json').write_text(json.dumps(metadata, indent=2)+'\n')
(OUT/'extras-only-report.json').write_text(json.dumps({'status': 'runtime-review-candidate', 'config': CONFIG, 'outputs': report}, indent=2)+'\n')
print(json.dumps(report, indent=2))
