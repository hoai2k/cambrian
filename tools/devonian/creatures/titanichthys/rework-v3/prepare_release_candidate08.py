#!/usr/bin/env python3
"""Prepare candidate08 by composing accepted candidate07, eye02, and normal02 bytes.

This source is deliberately inert until explicitly executed after artist approval.
It writes a new local release-candidate08 directory and never changes an input.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import struct

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
LOCAL = ROOT.parent / 'devonian-authoring/titanichthys/rework-v3'
BASE = LOCAL / 'candidate-07'
EYES = LOCAL / 'eye-seating-study-02'
NORMAL = LOCAL / 'normal-render-study-02'
PNG = LOCAL / 'png-lossless-study-01'
BODY_NORMAL = LOCAL / 'body-normal-study-02'
OUT = LOCAL / 'release-candidate08'
MANIFEST = HERE / 'frozen-release-candidate08.sha256'


def sha(data):
    if isinstance(data, Path):
        data = data.read_bytes()
    return hashlib.sha256(data).hexdigest()


def verify_manifest():
    for line in MANIFEST.read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        digest, raw_path = line.split('  ', 1)
        path = Path(raw_path)
        if sha(path) != digest:
            raise AssertionError(f'frozen input changed: {path}')


def unpack(blob):
    magic, version, total = struct.unpack_from('<III', blob)
    assert (magic, version, total) == (0x46546C67, 2, len(blob))
    json_length, json_type = struct.unpack_from('<II', blob, 12)
    assert json_type == 0x4E4F534A
    offset = 20 + json_length
    bin_length, bin_type = struct.unpack_from('<II', blob, offset)
    assert bin_type == 0x004E4942 and offset + 8 + bin_length == len(blob)
    return json.loads(blob[20:offset]), blob[offset + 8:]


def pack(gltf, binary):
    encoded = json.dumps(gltf, separators=(',', ':')).encode()
    encoded += b' ' * ((-len(encoded)) % 4)
    binary += b'\0' * ((-len(binary)) % 4)
    return (struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(binary))
            + struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
            + struct.pack('<II', len(binary), 0x004E4942) + binary)


def view_bytes(gltf, binary, index):
    view = gltf['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return binary[start:start + view['byteLength']]


def eye_accessors(gltf):
    result = []
    for side in ('L', 'R'):
        node = next(node for node in gltf['nodes']
                    if node.get('name') == f'Recessed socket eye {side}_export')
        assert not any(key in node for key in ('translation', 'rotation', 'scale', 'matrix'))
        for primitive in gltf['meshes'][node['mesh']]['primitives']:
            result.append((side, primitive['attributes']['POSITION']))
    assert len(result) == 2 and len({index for _, index in result}) == 2
    return result


def accessor_span(gltf, index, binary_length):
    accessor = gltf['accessors'][index]
    view = gltf['bufferViews'][accessor['bufferView']]
    assert accessor['componentType'] == 5126 and accessor['type'] == 'VEC3'
    assert view.get('byteStride', 12) == 12
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    length = accessor['count'] * 12
    assert 0 <= start <= start + length <= binary_length
    return start, start + length


def json_proof(before, after, eye_indices, image_views):
    allowed = deepcopy(before)
    for index in eye_indices:
        allowed['accessors'][index]['min'] = after['accessors'][index]['min']
        allowed['accessors'][index]['max'] = after['accessors'][index]['max']
    for index in image_views:
        for key in ('byteOffset', 'byteLength'):
            if key in after['bufferViews'][index]:
                allowed['bufferViews'][index][key] = after['bufferViews'][index][key]
            else:
                allowed['bufferViews'][index].pop(key, None)
    allowed['buffers'][0]['byteLength'] = after['buffers'][0]['byteLength']
    assert allowed == after, 'JSON changed outside eyes min/max and image bufferView layout'


def compose_full():
    base_bytes = (BASE / 'titanichthys.glb').read_bytes()
    eyes_bytes = (EYES / 'titanichthys.glb').read_bytes()
    normal_bytes = (NORMAL / 'titanichthys.glb').read_bytes()
    base, base_bin = unpack(base_bytes)
    eyes, eyes_bin = unpack(eyes_bytes)
    normal, normal_bin = unpack(normal_bytes)
    before = deepcopy(base)
    base_eye = eye_accessors(base)
    eye_eye = eye_accessors(eyes)
    assert base_eye == eye_eye, 'eye accessor identities differ from candidate07'
    eye_indices = [index for _, index in base_eye]
    mutable = bytearray(base_bin)
    allowed = []
    for (_, index), (_, source_index) in zip(base_eye, eye_eye):
        target_span = accessor_span(base, index, len(base_bin))
        source_span = accessor_span(eyes, source_index, len(eyes_bin))
        assert target_span[1] - target_span[0] == source_span[1] - source_span[0]
        assert base['accessors'][index]['count'] == eyes['accessors'][source_index]['count']
        mutable[target_span[0]:target_span[1]] = eyes_bin[source_span[0]:source_span[1]]
        base['accessors'][index]['min'] = eyes['accessors'][source_index]['min']
        base['accessors'][index]['max'] = eyes['accessors'][source_index]['max']
        allowed.append(target_span)
    changed_eye = [i for i, (old, new) in enumerate(zip(base_bin, mutable)) if old != new]
    assert changed_eye and all(any(lo <= i < hi for lo, hi in allowed) for i in changed_eye)

    png_report = json.loads((PNG / 'report.json').read_text())
    body_report = json.loads((BODY_NORMAL / 'report.json').read_text())
    assert len(base['images']) == len(normal['images']) == len(png_report['images']) == 18
    changed_images = []
    for image_index, image in enumerate(base['images']):
        base_view = image['bufferView']
        normal_view = normal['images'][image_index]['bufferView']
        original = sha(view_bytes(base, base_bin, base_view))
        row = next(row for row in png_report['images'] if row['originalSha256'] == original)
        replacement = view_bytes(normal, normal_bin, normal_view)
        assert sha(replacement) == row['outputSha256'] or row['name'] == 'body-normal'
        if row['name'] == 'body-normal':
            assert sha(replacement) == body_report['outputSha256']
        else:
            assert sha(replacement) == row['outputSha256']
        offset = len(mutable) + ((-len(mutable)) % 4)
        mutable.extend(b'\0' * (offset - len(mutable)))
        mutable.extend(replacement)
        base['bufferViews'][base_view]['byteOffset'] = offset
        base['bufferViews'][base_view]['byteLength'] = len(replacement)
        changed_images.append({'image': row['name'], 'bufferView': base_view,
                               'originalSha256': original, 'replacementSha256': sha(replacement),
                               'replacementBytes': len(replacement)})
    base['buffers'][0]['byteLength'] = len(mutable) + ((-len(mutable)) % 4)
    json_proof(before, base, eye_indices, [item['bufferView'] for item in changed_images])
    changed = [i for i, (old, new) in enumerate(zip(base_bin, mutable[:len(base_bin)])) if old != new]
    assert changed == changed_eye, 'original BIN changed outside eye POSITION intervals'
    return pack(base, bytes(mutable)), {'eyeAccessors': eye_indices, 'eyeChangedBinBytes': len(changed_eye),
                                        'eyeByteIntervals': [list(span) for span in allowed],
                                        'imageReplacements': changed_images,
                                        'allOtherJsonExact': True}


def compose_lod():
    base_bytes = (BASE / 'titanichthys.lod1.glb').read_bytes()
    eyes_bytes = (EYES / 'titanichthys.lod1.glb').read_bytes()
    base, base_bin = unpack(base_bytes)
    eyes, eyes_bin = unpack(eyes_bytes)
    before = deepcopy(base)
    base_eye = eye_accessors(base)
    eye_eye = eye_accessors(eyes)
    assert base_eye == eye_eye
    mutable = bytearray(base_bin)
    allowed = []
    for (_, index), (_, source_index) in zip(base_eye, eye_eye):
        target_span = accessor_span(base, index, len(base_bin))
        source_span = accessor_span(eyes, source_index, len(eyes_bin))
        assert target_span[1] - target_span[0] == source_span[1] - source_span[0]
        assert base['accessors'][index]['count'] == eyes['accessors'][source_index]['count']
        mutable[target_span[0]:target_span[1]] = eyes_bin[source_span[0]:source_span[1]]
        base['accessors'][index]['min'] = eyes['accessors'][source_index]['min']
        base['accessors'][index]['max'] = eyes['accessors'][source_index]['max']
        allowed.append(target_span)
    for _, index in base_eye:
        before['accessors'][index]['min'] = base['accessors'][index]['min']
        before['accessors'][index]['max'] = base['accessors'][index]['max']
    assert before == base, 'LOD JSON changed outside eye min/max'
    changed = [i for i, (old, new) in enumerate(zip(base_bin, mutable)) if old != new]
    assert changed and all(any(lo <= i < hi for lo, hi in allowed) for i in changed)
    return pack(base, bytes(mutable)), {'eyeAccessors': [index for _, index in base_eye],
                                        'eyeChangedBinBytes': len(changed),
                                        'eyeByteIntervals': [list(span) for span in allowed],
                                        'allOtherJsonExact': True}


if OUT.exists():
    raise SystemExit(f'refuse existing release directory: {OUT}')
verify_manifest()
OUT.mkdir()
full, full_report = compose_full()
lod, lod_report = compose_lod()
(OUT / 'titanichthys.glb').write_bytes(full)
(OUT / 'titanichthys.lod1.glb').write_bytes(lod)
report = {'scope': 'candidate07 base; eye02 POSITION/minmax; normal02 full image bytes only',
          'inputs': {str(path): sha(path) for path in [BASE / 'titanichthys.glb', BASE / 'titanichthys.lod1.glb',
                     BASE / 'candidate-report.json', EYES / 'titanichthys.glb', EYES / 'titanichthys.lod1.glb',
                     EYES / 'patch-report.json', EYES / 'audit-float64-02-rerun/eye-volume.json',
                     NORMAL / 'titanichthys.glb', NORMAL / 'report.json', HERE / 'normal-study-review-02.json']},
          'outputs': {'titanichthys.glb': sha(full), 'titanichthys.lod1.glb': sha(lod)},
          'full': full_report, 'lod': lod_report}
(OUT / 'release-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('RELEASE_CANDIDATE08_PREPARED', json.dumps(report['outputs']))
