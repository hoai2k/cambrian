#!/usr/bin/env python3
"""Safely make a parameterized eye-POSITION-only Titanichthys GLB derivative.

Usage: patch_eye_positions_02.py DEPTH OUTPUT_DIR [SOURCE_DIR]
"""
from pathlib import Path
import hashlib
import json
import struct
import sys

import numpy as np

ROOT = Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local')
DEFAULT_SOURCE = ROOT / 'devonian-authoring/titanichthys/rework-v3/candidate-06'
CONSTRUCTION = ROOT / 'devonian-authoring/titanichthys/rework-v3/clay-04/construction.json'
EXPECTED = {
    'titanichthys.glb': 'e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad',
    'titanichthys.lod1.glb': '27ca2ebdc5d40482dccc93d2fdc13f0390c6b4082407c245ba45913fa3773f40',
}

if len(sys.argv) not in (3, 4):
    raise SystemExit('usage: patch_eye_positions_02.py DEPTH OUTPUT_DIR [SOURCE_DIR]')
DEPTH = float(sys.argv[1])
OUT = Path(sys.argv[2]).resolve()
SRC = Path(sys.argv[3]).resolve() if len(sys.argv) == 4 else DEFAULT_SOURCE
if not np.isfinite(DEPTH) or DEPTH <= 0.0:
    raise SystemExit('DEPTH must be finite and positive')
if any((OUT / name).exists() for name in EXPECTED):
    raise SystemExit(f'refuse existing derivative: {OUT}')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def chunks(blob):
    magic, version, length = struct.unpack_from('<III', blob)
    assert (magic, version, length) == (0x46546C67, 2, len(blob))
    json_length, json_type = struct.unpack_from('<II', blob, 12)
    assert json_type == 0x4E4F534A
    json_bytes = blob[20:20 + json_length]
    offset = 20 + json_length
    bin_length, bin_type = struct.unpack_from('<II', blob, offset)
    assert bin_type == 0x004E4942
    return json_bytes, blob[offset + 8:offset + 8 + bin_length]


def pack(json_bytes, bin_bytes):
    json_bytes += b' ' * ((4 - len(json_bytes) % 4) % 4)
    bin_bytes += b'\0' * ((4 - len(bin_bytes) % 4) % 4)
    return (struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(json_bytes) + 8 + len(bin_bytes))
            + struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes
            + struct.pack('<II', len(bin_bytes), 0x004E4942) + bin_bytes)


def node_accessors(gltf):
    found = []
    for side in ('L', 'R'):
        node = next(n for n in gltf['nodes']
                    if n.get('name') == f'Recessed socket eye {side}_export')
        assert not any(k in node for k in ('translation', 'rotation', 'scale', 'matrix'))
        for primitive in gltf['meshes'][node['mesh']]['primitives']:
            found.append((side, primitive['attributes']['POSITION']))
    accessors = [index for _, index in found]
    assert len(accessors) == len(set(accessors)), 'eye POSITION accessors must be unshared'
    all_references = [index for mesh in gltf['meshes'] for primitive in mesh['primitives']
                      for index in primitive.get('attributes', {}).values()]
    assert all(all_references.count(index) == 1 for index in accessors), 'eye POSITION accessor shared'
    return found


OUT.mkdir(parents=True, exist_ok=True)
design = {entry['side']: entry for entry in json.loads(CONSTRUCTION.read_text())['eye_placement_design']}
report = {'depth_blender_units': DEPTH, 'source_directory': str(SRC), 'sources': {}, 'outputs': {}, 'patches': []}
for name, digest in EXPECTED.items():
    source = SRC / name
    assert sha(source) == digest, f'input hash mismatch: {source}'
    raw = source.read_bytes()
    json_bytes, bin_bytes = chunks(raw)
    gltf = json.loads(json_bytes)
    before = json.loads(json_bytes)
    mutable_bin = bytearray(bin_bytes)
    allowed = []
    for side, accessor_index in node_accessors(gltf):
        accessor = gltf['accessors'][accessor_index]
        view = gltf['bufferViews'][accessor['bufferView']]
        assert accessor['componentType'] == 5126 and accessor['type'] == 'VEC3'
        assert view.get('byteStride', 12) == 12, 'POSITION must be contiguous float32 VEC3'
        start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        size = accessor['count'] * 12
        assert start >= 0 and start + size <= len(mutable_bin)
        allowed.append([start, start + size])
        normal = np.asarray(design[side]['normal'], dtype=np.float64)
        normal_gltf = np.asarray([normal[0], normal[2], -normal[1]])
        delta = -DEPTH * normal_gltf
        positions = np.frombuffer(mutable_bin, dtype='<f4', count=accessor['count'] * 3,
                                  offset=start).reshape((-1, 3))
        positions[:] = positions + delta.astype(np.float32)
        accessor['min'] = positions.min(0).astype(float).tolist()
        accessor['max'] = positions.max(0).astype(float).tolist()
        report['patches'].append({'asset': name, 'side': side, 'accessor': accessor_index,
                                  'byteInterval': [start, start + size],
                                  'delta_gltf': delta.tolist(), 'count': accessor['count']})
    for _, accessor_index in node_accessors(before):
        before['accessors'][accessor_index]['min'] = gltf['accessors'][accessor_index]['min']
        before['accessors'][accessor_index]['max'] = gltf['accessors'][accessor_index]['max']
    assert before == gltf, 'JSON changed outside allowed eye POSITION min/max'
    changed = [index for index, (old, new) in enumerate(zip(bin_bytes, mutable_bin)) if old != new]
    assert changed, 'eye POSITION patch made no binary change'
    assert all(any(lo <= index < hi for lo, hi in allowed) for index in changed), 'BIN changed outside eye POSITION'
    output = OUT / name
    output.write_bytes(pack(json.dumps(gltf, separators=(',', ':')).encode(), bytes(mutable_bin)))
    report['sources'][name] = digest
    report['outputs'][name] = sha(output)
    report['outputs'][name + '_changed_bin_bytes'] = len(changed)

(OUT / 'patch-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
