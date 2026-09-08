#!/usr/bin/env python3
"""Read-only COLOR_0 versus embedded albedo color-space diagnostic."""
import hashlib
import io
import json
from pathlib import Path
import struct

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
LOCAL = ROOT.parent / 'devonian-authoring/dunkleosteus/face-v4/candidate03/exports-pigment04'
FULL = LOCAL / 'dunkleosteus.glb'
LOD = LOCAL / 'dunkleosteus.lod1.glb'
OUT = ROOT.parent / 'devonian-authoring/dunkleosteus/face-v4/color-space-diagnostic-01'
HASHES = {'full': '0ace6026c6b46d9d560528677ffdaf31769d74bea51065b884214c8b1037950d',
          'lod': '2d57904f0a8a2c858f597730e38927b1f38126a51a9f87011b2f3f78d7c52bca'}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def glb(path):
    raw = path.read_bytes()
    size = struct.unpack_from('<I', raw, 12)[0]
    document = json.loads(raw[20:20 + size])
    offset = 20 + size
    binary_size, binary_type = struct.unpack_from('<II', raw, offset)
    assert binary_type == 0x004E4942
    return document, raw[offset + 8:offset + 8 + binary_size]


def accessor(document, binary, index):
    item = document['accessors'][index]
    view = document['bufferViews'][item['bufferView']]
    dtype = {5126: '<f4', 5123: '<u2'}[item['componentType']]
    width = {'VEC2': 2, 'VEC4': 4}[item['type']]
    stride = view.get('byteStride', np.dtype(dtype).itemsize * width)
    return np.ndarray((item['count'], width), dtype=dtype, buffer=binary,
                      offset=view.get('byteOffset', 0) + item.get('byteOffset', 0),
                      strides=(stride, np.dtype(dtype).itemsize)).copy()


def embedded_png(document, binary, image_index):
    view = document['bufferViews'][document['images'][image_index]['bufferView']]
    raw = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    return np.asarray(Image.open(io.BytesIO(raw)).convert('RGB'), dtype=np.float64) / 255.0, hashlib.sha256(raw).hexdigest()


def srgb_to_linear(values):
    return np.where(values <= .04045, values / 12.92, ((values + .055) / 1.055) ** 2.4)


assert sha(FULL) == HASHES['full'] and sha(LOD) == HASHES['lod']
assert not OUT.exists(), 'preserve existing diagnostic'
full, full_binary = glb(FULL)
lod, lod_binary = glb(LOD)
images = {name: embedded_png(full, full_binary, index) for name, index in
          {'gnathal-albedo': 1, 'body-albedo': 4, 'oral-albedo': 13}.items()}
cases = [
    ('anterior_supragnathal_cusp_1', 0, 'gnathal-albedo', [78, 135, 232]),
    ('body_envelope_with_pharyngeal_opening', 0, 'body-albedo', [0, 33, 143]),
    ('head_envelope_closed', 0, 'body-albedo', [122, 195, 2427]),
    ('head_envelope_closed', 1, 'oral-albedo', [98, 323, 818]),
]
rows = []
for mesh_name, primitive_index, image_name, fixed_indices in cases:
    primitive = [primitive for mesh in lod['meshes'] if mesh['name'] == mesh_name
                 for primitive in mesh['primitives']][primitive_index]
    colors = accessor(lod, lod_binary, primitive['attributes']['COLOR_0'])[:, :3] / 65535.0
    uvs = accessor(lod, lod_binary, primitive['attributes']['TEXCOORD_0'])
    pixels, image_hash = images[image_name]
    x = np.clip((uvs[:, 0] * (pixels.shape[1] - 1)).astype(int), 0, pixels.shape[1] - 1)
    y = np.clip((uvs[:, 1] * (pixels.shape[0] - 1)).astype(int), 0, pixels.shape[0] - 1)
    sampled = pixels[y, x]
    direct = np.abs(colors - sampled).mean(axis=1)
    linear = np.abs(colors - srgb_to_linear(sampled)).mean(axis=1)
    rows.append({'mesh': mesh_name, 'primitive': primitive_index, 'image': image_name,
                 'image_sha256': image_hash, 'vertex_count': len(colors),
                 'mean_absolute_error_direct_encoded': float(direct.mean()),
                 'mean_absolute_error_srgb_to_linear': float(linear.mean()),
                 'fixed_vertices': [{'index': index, 'uv': uvs[index].tolist(),
                                     'color0_rgb': colors[index].tolist(),
                                     'encoded_png_rgb': sampled[index].tolist(),
                                     'direct_mean_absolute_error': float(direct[index]),
                                     'srgb_to_linear_mean_absolute_error': float(linear[index])}
                                    for index in fixed_indices]})
report = {'purpose': 'Read-only LOD COLOR_0 color-space diagnosis; no art conclusion or correction.',
          'assets': {'full': {'path': str(FULL), 'sha256': sha(FULL)}, 'lod': {'path': str(LOD), 'sha256': sha(LOD)}},
          'source_code_locations': {
              'sampling': 'study_03.py:174-182 creates BakedPigment and writes tex.pixels directly after nearest UV lookup.',
              'lod_copy': 'export_03.py:96-101 assigns BakedPigment to Color before decimation and GLB export.',
              'binding': 'fix_lod_pigment_04.py:61-73 changes only COLOR_1 binding to COLOR_0; BIN remains identical.'},
          'interpretation': 'COLOR_0 numerically follows encoded PNG RGB. It does not follow the standard sRGB-to-linear transform. Rendering systems that decode full base-color textures as sRGB but treat vertex COLOR_0 as linear will display the LOD lighter.',
          'cases': rows}
OUT.mkdir(parents=True)
(OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
print('DUNK_COLOR_SPACE_DIAGNOSTIC_OK', OUT / 'result.json')
