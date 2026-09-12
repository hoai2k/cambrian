"""Finalize the Doryaspis V3 candidate GLBs in place.

Same job as bothriolepis/finalize_v3.py and stethacanthus/finalize_v3.py:
Blender 5.2.1 keeps a constant identity scale track per bone (a one-ULP value
that tools/devonian/check.mjs refuses) and a constant root channel; both are
stripped without touching the binary buffer.  Then the decoded geometry, rig,
clips, vertex-colour layout and anchor sockets are audited against the
candidate's own anchors.json.

Doryaspis V3 ships **no base-colour texture at all**: every scrap of pigment is
in COLOR_0 on both levels, and the full model's only maps are the tiled
microrelief normal and roughness.  So the check here is the mirror image of
bothriolepis's -- no material may carry a baseColorTexture, and no slot may
ship white COLOR_0, because a white slot would mean pigment was lost.

Run after build_v3.py and before tools/devonian/package.mjs.
"""
import json
import struct
import hashlib
from pathlib import Path
import numpy as np

H = Path(__file__).resolve().parent
R = H.parents[3]
O = R.parent / 'devonian-authoring/doryaspis/v3-candidate'

V2_BONES = ['root', 'body', 'shield', 'oral_upper', 'oral_lower', 'oral_L', 'oral_R',
            'tail_base', 'tail_mid', 'tail_distal', 'tail_tip', 'caudal']
V2_CLIPS = {'Idle': 2.4, 'Swim': 2.4, 'TurnLeft': 1.6, 'TurnRight': 1.6, 'Dive': 1.4,
            'Rise': 1.4, 'Attack': 1., 'Bite': .5, 'Heavy': 1.1, 'Hit': .6, 'Death': 1.6,
            'Guard': 1., 'Parry': 11 / 30, 'Dodge': .4, 'Eat': 1.6, 'Stagger': 1.2,
            'Ability': 2.4, 'Growth': 1.5}
LOOPS = ['Idle', 'Swim', 'Guard', 'Eat', 'Grab']
LOD_CLIPS = ['Idle', 'Swim', 'Death']


def read(p):
    b = p.read_bytes()
    n = struct.unpack_from('<I', b, 12)[0]
    d = json.loads(b[20:20 + n])
    start = 20 + n
    size = struct.unpack_from('<I', b, start)[0]
    return d, b[start + 8:start + 8 + size]


def save(p, d, binary):
    j = json.dumps(d, separators=(',', ':')).encode()
    j += b' ' * (-len(j) % 4)
    p.write_bytes(struct.pack('<III', 0x46546c67, 2, 28 + len(j) + len(binary))
                  + struct.pack('<II', len(j), 0x4e4f534a) + j
                  + struct.pack('<II', len(binary), 0x004e4942) + binary)


def acc(d, binary, i):
    a = d['accessors'][i]
    v = d['bufferViews'][a['bufferView']]
    dt = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    stride = v.get('byteStride', np.dtype(dt).itemsize * n)
    out = np.ndarray((a['count'], n), dtype=dt, buffer=binary,
                     offset=v.get('byteOffset', 0) + a.get('byteOffset', 0),
                     strides=(stride, np.dtype(dt).itemsize)).copy()
    if a.get('normalized'):
        out = out / np.iinfo(dt).max
    return out


def mat(n):
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    m = np.eye(4)
    m[:3, :3] = [[1 - 2 * y * y - 2 * z * z, 2 * x * y - 2 * z * w, 2 * x * z + 2 * y * w],
                 [2 * x * y + 2 * z * w, 1 - 2 * x * x - 2 * z * z, 2 * y * z - 2 * x * w],
                 [2 * x * z - 2 * y * w, 2 * y * z + 2 * x * w, 1 - 2 * x * x - 2 * y * y]]
    m[:3, :3] = m[:3, :3] * np.array(n.get('scale', [1, 1, 1]))
    m[:3, 3] = n.get('translation', [0, 0, 0])
    return m


results = []
for suffix in ['', '.lod1']:
    p = O / ('doryaspis' + suffix + '.glb')
    d, binary = read(p)
    removed = 0
    for a in d['animations']:
        keep = []
        for c in a['channels']:
            if c['target']['path'] == 'scale':
                assert np.allclose(acc(d, binary, a['samplers'][c['sampler']]['output']), 1)
                removed += 1
            elif d['nodes'][c['target']['node']].get('name') == 'root':
                v = acc(d, binary, a['samplers'][c['sampler']]['output'])
                assert np.allclose(v, v[0])
            else:
                keep.append(c)
        a['channels'] = keep
    save(p, d, binary)
    parent = {ch: i for i, n in enumerate(d['nodes']) for ch in n.get('children', [])}
    world = {}

    def wm(i):
        if i not in world:
            world[i] = np.einsum('ij,jk->ik',
                                 wm(parent[i]) if i in parent else np.eye(4),
                                 mat(d['nodes'][i]))
        return world[i]

    bounds, tri, verts, colour = [], 0, 0, {}
    for i, n in enumerate(d['nodes']):
        if 'mesh' not in n:
            continue
        for prim in d['meshes'][n['mesh']]['primitives']:
            ps = acc(d, binary, prim['attributes']['POSITION'])
            assert np.isfinite(ps).all()
            verts += len(ps)
            tri += d['accessors'][prim['indices']]['count'] // 3
            bounds.append(np.einsum('ij,nj->ni', wm(i), np.c_[ps, np.ones(len(ps))])[:, :3])
            ws = acc(d, binary, prim['attributes']['WEIGHTS_0'])
            assert np.allclose(ws.sum(axis=1), 1, atol=1e-4), 'weights must be normalised'
            name = d['materials'][prim['material']]['name']
            assert 'baseColorTexture' not in d['materials'][prim['material']].get(
                'pbrMetallicRoughness', {}), (name, 'must not carry a base-colour texture')
            cols = acc(d, binary, prim['attributes']['COLOR_0'])[:, :3]
            colour[name] = {'white_fraction': float((cols > .99).all(axis=1).mean()),
                            'mean': cols.mean(0).round(5).tolist()}
    for name, stat in colour.items():
        assert stat['white_fraction'] < .01, (name, 'lost its pigment', stat)
    q = np.concatenate(bounds)
    span = q.max(0) - q.min(0)
    sockets = []
    for i, n in enumerate(d['nodes']):
        if n.get('name', '').startswith('anchor_'):
            ex = n['extras']['cambrianAnchor']
            assert isinstance(ex, dict) and ex['version'] == 1
            assert d['nodes'][parent[i]]['name'] == ex['parentBone']
            sockets.append({'name': n['name'], 'point': wm(i)[:3, 3].tolist()})
    manifest = json.loads((O / 'anchors.json').read_text())['doryaspis']
    for s in manifest:
        got = next(g for g in sockets if g['name'] == s['name'])
        x, y, z = s['point']
        assert np.allclose(got['point'], [x, z, -y], atol=2e-5), (s, got)
    motions = []
    for a in d['animations']:
        movement, maxdur = 0, 0
        signature = hashlib.sha256()
        for c in a['channels']:
            target = d['nodes'][c['target']['node']]['name']
            assert target != 'root'
            assert c['target']['path'] != 'scale'
            sm = a['samplers'][c['sampler']]
            v = acc(d, binary, sm['output'])
            t = acc(d, binary, sm['input'])
            assert np.isfinite(v).all()
            maxdur = max(maxdur, float(t[-1, 0] - t[0, 0]))
            movement += float(np.abs(v - v[0]).sum())
            signature.update(v.tobytes())
            if a['name'] in LOOPS:
                assert np.allclose(v[0], v[-1], atol=1e-5), (a['name'], target)
        assert maxdur > 0 and movement > 0
        motions.append({'name': a['name'], 'duration': maxdur,
                        'motion': round(movement, 3), 'digest': signature.hexdigest()})
    assert len(set(m['digest'] for m in motions)) == len(motions), 'clips must be distinct'
    names = [m['name'] for m in motions]
    if not suffix:
        # V2's eighteen, unchanged in name and duration, plus Grab.
        assert set(names) == set(V2_CLIPS) | {'Grab'}, names
        for m in motions:
            if m['name'] in V2_CLIPS:
                assert abs(m['duration'] - V2_CLIPS[m['name']]) < 1.5 / 30, m
        assert .8 < next(m['duration'] for m in motions if m['name'] == 'Grab') < 1.0
    else:
        assert sorted(names) == sorted(LOD_CLIPS), names
    joints = [d['nodes'][i]['name'] for i in d['skins'][0]['joints']]
    results.append({'file': p.name, 'bytes': p.stat().st_size, 'vertices': verts,
                    'triangles': tri, 'bounds': span.tolist(), 'bones': len(joints),
                    'boneNames': joints, 'textures': len(d.get('textures', [])),
                    'materials': [m['name'] for m in d['materials']],
                    'vertexColourByMaterial': colour, 'sockets': sockets, 'clips': motions,
                    'removedIdentityScaleChannels': removed,
                    'sha256': hashlib.sha256(p.read_bytes()).hexdigest()})

assert results[1]['triangles'] / results[0]['triangles'] < .4, 'LOD must actually reduce'
assert results[0]['boneNames'] == results[1]['boneNames']
assert sorted(results[0]['boneNames']) == sorted(V2_BONES), results[0]['boneNames']
assert results[1]['textures'] == 0, 'LOD must use baked vertex pigmentation only'
meta = json.loads((O / 'doryaspis.json').read_text())
meta['modelLength'] = results[0]['bounds'][2]
meta['clips'] = [x['name'] for x in results[0]['clips']]
(O / 'doryaspis.json').write_text(json.dumps(meta, indent=2) + '\n')
(H / 'validation_v3.json').write_text(json.dumps({
    'checks': 'finite transforms, normalized weights, root stable, identity-scale removal, '
              'unique motion, seamless loops, no base-colour texture, pigment present in '
              'COLOR_0 on both levels, V2 bone names and clip durations preserved, Grab '
              'present, socket bind alignment, true LOD reduction',
    'models': results,
    'lodTriangleRatio': results[1]['triangles'] / results[0]['triangles']}, indent=2) + '\n')
print(json.dumps({'models': [{k: v for k, v in r.items() if k in
                              ['file', 'bytes', 'triangles', 'vertices', 'bounds', 'bones',
                               'textures', 'removedIdentityScaleChannels']} for r in results],
                  'lodRatio': round(results[1]['triangles'] / results[0]['triangles'], 4)},
                 indent=1))
