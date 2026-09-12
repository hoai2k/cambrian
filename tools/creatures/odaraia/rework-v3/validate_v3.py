"""Odaraia V3 candidate validation, independent of Blender.

    /tmp/bpyenv/bin/python validate_v3.py [candidate-dir]

Reads the two raw GLBs directly and checks what the runtime and the shared
packaging tools will require of them: finite transforms, positive constant
scales, no root translation, normalised skin weights with at most four
influences, a uint16 joint accessor, all eighteen clips at their intended
durations, seamless Idle/Swim/Guard/Eat, a held Death, real socket ancestry for
every record in `anchors_v3.json`, full/LOD skeleton and action parity, and the
feeding contract `src/render/creature.ts` actually tests for.
"""
import json
import struct
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
DEFAULT = Path('/home/user/expansion-authoring/odaraia-rework/v3-candidate')
COMPONENT = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
SIZES = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
COUNTS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
CLIPS = {'Idle': 2.4, 'Swim': 1.4, 'TurnLeft': 1.2, 'TurnRight': 1.2, 'Rise': 1.3, 'Dive': 1.3,
         'Dodge': .8, 'Guard': 1.6, 'Parry': .85, 'Attack': 1.3, 'Bite': .70, 'Heavy': 1.8,
         'Ability': 2.0, 'Eat': 3.0, 'Hit': .65, 'Stagger': 1.4, 'Moult': 3.2, 'Death': 2.8}
SEAMLESS = ('Idle', 'Swim', 'Guard', 'Eat')
DEATH_HOLD = .75
FPS = 24


class Glb:
    def __init__(self, path):
        data = path.read_bytes()
        assert struct.unpack_from('<4sII', data, 0)[0] == b'glTF'
        length = struct.unpack_from('<I', data, 12)[0]
        assert struct.unpack_from('<4s', data, 16)[0] == b'JSON'
        self.path = path
        self.bytes = len(data)
        self.json = json.loads(data[20:20 + length])
        offset = 20 + length
        self.bin = None
        while offset < len(data):
            size, kind = struct.unpack_from('<I4s', data, offset)
            if kind == b'BIN\x00':
                assert self.bin is None, 'multiple BIN chunks'
                self.bin = data[offset + 8:offset + 8 + size]
            offset += 8 + size
        assert self.bin is not None
        self.nodes = self.json['nodes']
        self.byName = {}
        for i, n in enumerate(self.nodes):
            self.byName.setdefault(n.get('name'), []).append(i)
        self.parent = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []):
                assert c not in self.parent, 'node with two parents'
                self.parent[c] = i

    def accessor(self, index):
        a = self.json['accessors'][index]
        assert 'sparse' not in a, 'sparse accessor'
        n = COUNTS[a['type']]
        view = self.json['bufferViews'][a['bufferView']]
        start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = view.get('byteStride') or SIZES[a['componentType']] * n
        raw = np.frombuffer(self.bin, dtype=np.uint8, count=stride * (a['count'] - 1) + SIZES[a['componentType']] * n,
                            offset=start)
        item = SIZES[a['componentType']] * n
        rows = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], item), strides=(stride, 1))
        out = np.frombuffer(np.ascontiguousarray(rows).tobytes(),
                            dtype=np.dtype('<' + COMPONENT[a['componentType']])).reshape(a['count'], n)
        return out.astype(np.float64) if a['componentType'] == 5126 else out

    def local(self, i):
        n = self.nodes[i]
        if 'matrix' in n:
            return np.array(n['matrix'], dtype=float).reshape(4, 4).T
        t = np.array(n.get('translation', [0, 0, 0]), dtype=float)
        r = np.array(n.get('rotation', [0, 0, 0, 1]), dtype=float)
        s = np.array(n.get('scale', [1, 1, 1]), dtype=float)
        x, y, z, w = r
        rot = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
        m = np.eye(4)
        m[:3, :3] = rot * s[None, :]
        m[:3, 3] = t
        return m

    def world(self, i, cache=None):
        cache = {} if cache is None else cache
        if i in cache:
            return cache[i]
        m = self.local(i)
        if i in self.parent:
            m = self.world(self.parent[i], cache) @ m
        cache[i] = m
        return m


def check_file(g, label, results):
    def ok(name, condition, detail=''):
        results.append({'file': label, 'check': name, 'pass': bool(condition), 'detail': detail})
        return condition

    for i, n in enumerate(g.nodes):
        m = g.local(i)
        assert np.isfinite(m).all(), n.get('name')
        s = n.get('scale', [1, 1, 1])
        assert all(v > 0 for v in s), n.get('name')
    ok('finite node transforms, positive scales', True, f'{len(g.nodes)} nodes')

    skin = g.json['skins'][0]
    joints = [g.nodes[j]['name'] for j in skin['joints']]
    ok('406 joints', len(joints) == 406, str(len(joints)))
    root = skin['joints'][0]
    ok('skeleton root named root', g.nodes[root]['name'] == 'root', g.nodes[root]['name'])
    ok('root translation zero', tuple(g.nodes[root].get('translation', [0, 0, 0])) == (0, 0, 0),
       str(g.nodes[root].get('translation')))

    jt = None
    tris = 0
    weight_rows = 0
    worst_sum = 0.0
    worst_influences = 0
    max_joint = 0
    colours = []
    for mesh in g.json['meshes']:
        for prim in mesh['primitives']:
            assert prim.get('mode', 4) == 4
            tris += g.json['accessors'][prim['indices']]['count'] // 3
            attrs = prim['attributes']
            jt = g.json['accessors'][attrs['JOINTS_0']]['componentType']
            jj = g.accessor(attrs['JOINTS_0'])
            ww = g.accessor(attrs['WEIGHTS_0']).astype(np.float64)
            max_joint = max(max_joint, int(jj.max()))
            nonzero = (ww > 0).sum(axis=1)
            worst_influences = max(worst_influences, int(nonzero.max()))
            worst_sum = max(worst_sum, float(np.abs(ww.sum(axis=1) - 1).max()))
            weight_rows += len(ww)
            colours.append('COLOR_0' in attrs and g.json['accessors'][attrs['COLOR_0']]['type'] == 'VEC4')
    ok('JOINTS_0 is uint16', jt == 5123, str(jt))
    ok('joint indices within the skin', max_joint < len(joints), str(max_joint))
    ok('at most four influences', worst_influences <= 4, str(worst_influences))
    ok('weights normalised', worst_sum < 2e-3, f'max |sum-1| = {worst_sum:.2e} over {weight_rows} vertices')
    ok('COLOR_0 is VEC4 on every primitive', all(colours), f'{sum(colours)}/{len(colours)}')

    names = sorted(a['name'] for a in g.json['animations'])
    ok('all eighteen clips', names == sorted(CLIPS), str(names))
    clip_report = {}
    for anim in g.json['animations']:
        name = anim['name']
        last = 0.0
        rotations = 0
        for ch in anim['channels']:
            path = ch['target']['path']
            assert path == 'rotation', f'{name}: non-rotation channel {path}'
            rotations += 1
            sampler = anim['samplers'][ch['sampler']]
            t = g.accessor(sampler['input']).ravel()
            last = max(last, float(t[-1]))
        intended = round(CLIPS[name] * FPS) / FPS
        clip_report[name] = {'seconds': round(last, 5), 'intended': intended, 'channels': rotations}
        ok(f'{name} duration', abs(last - intended) < 1e-4, f'{last:.5f} vs {intended:.5f}')
    ok('rotation-only animation (no translation or scale channels)', True)

    for name in SEAMLESS:
        anim = next(a for a in g.json['animations'] if a['name'] == name)
        worst = 0.0
        for ch in anim['channels']:
            s = anim['samplers'][ch['sampler']]
            q = g.accessor(s['output'])
            a, b = q[0], q[-1]
            worst = max(worst, float(min(np.abs(a - b).max(), np.abs(a + b).max())))
        ok(f'{name} loops seamlessly', worst < 1e-5, f'max endpoint delta {worst:.2e}')

    anim = next(a for a in g.json['animations'] if a['name'] == 'Death')
    worst = 0.0
    for ch in anim['channels']:
        s = anim['samplers'][ch['sampler']]
        t = g.accessor(s['input']).ravel()
        q = g.accessor(s['output'])
        held = t >= DEATH_HOLD * t[-1] - 1e-9
        if held.sum() >= 2:
            worst = max(worst, float(np.abs(q[held] - q[-1]).max()))
    ok('Death holds its final pose', worst < 1e-6, f'max deviation over the last 25% {worst:.2e}')

    scene = g.json['scenes'][g.json.get('scene', 0)]
    feeding = (scene.get('extras') or {}).get('cambrianFeeding')
    ok('cambrianFeeding contract', bool(feeding) and feeding.get('version') == 1
       and feeding.get('mode') == 'authored-grasp' and feeding.get('clip') == 'Eat'
       and feeding.get('apertureDiameter', 0) > 0 and feeding.get('pickupOffsetLimit', 0) > 0,
       json.dumps(feeding))

    shell = [m for m in g.json['materials'] if m['name'] == 'odaraia shell']
    ok('shell is a separate blended draw', len(shell) == 1 and shell[0].get('alphaMode') == 'BLEND',
       str(shell[0].get('alphaMode') if shell else None))
    ok('no transmission extension', 'KHR_materials_transmission' not in json.dumps(g.json.get('extensionsUsed', [])))
    ok('textures embedded', not any('uri' in i for i in g.json.get('images', [])),
       f"{len(g.json.get('textures', []))} textures")
    return {'triangles': tris, 'joints': joints, 'clips': clip_report,
            'meshes': len(g.json['meshes']), 'materials': len(g.json['materials']),
            'bytes': g.bytes}


def check_anchors(g, records, label, results):
    def ok(name, condition, detail=''):
        results.append({'file': label, 'check': name, 'pass': bool(condition), 'detail': detail})
        return condition

    rows = []
    for a in records:
        indices = g.byName.get(a['bone'], [])
        if not ok(f"{a['name']}: exactly one node named {a['bone']}", len(indices) == 1, str(len(indices))):
            continue
        parent = indices[0]
        world = g.world(parent)
        expected = np.array([a['point'][0], a['point'][2], -a['point'][1], 1.0])
        local = np.linalg.inv(world) @ expected
        chain = a.get('chain')
        if chain:
            ok(f"{a['name']}: chain ends at its own parent", a['bone'] == chain[-1] == a['effectorBone'])
            good = True
            for i in range(1, len(chain)):
                ci, pi = g.byName[chain[i]][0], g.byName[chain[i - 1]][0]
                good = good and g.parent.get(ci) == pi
            ok(f"{a['name']}: chain is ordered direct ancestry", good, ' -> '.join(chain))
            ok(f"{a['name']}: no locomotor bone in the chain",
               all(b != 'root' and b != 'body_core' and not b.startswith('trunk_') for b in chain))
            ok(f"{a['name']}: non-zero reach from the effector joint", np.linalg.norm(local[:3]) > 1e-8,
               f'{np.linalg.norm(local[:3]):.5f}')
        back = world @ local
        ok(f"{a['name']}: world point reconstructs", float(np.abs(back - expected).max()) < 1e-6)
        rows.append({'name': a['name'], 'role': a['role'], 'parent': a['bone'],
                     'gltfWorld': [round(float(v), 5) for v in expected[:3]],
                     'local': [round(float(v), 5) for v in local[:3]]})
    for required, role in (('anchor_mouth', 'mouth'), ('anchor_mouth_inside', 'swallow'),
                           ('anchor_attack_primary', 'attack')):
        ok(f'required socket {required}/{role}',
           any(r['name'] == required and r['role'] == role for r in records))
    ok('a grasp chain exists (runtime canGrasp)',
       any(r['name'] == 'anchor_grasp' and r.get('chain') for r in records))
    return rows


def main():
    base = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    records = json.loads((HERE / 'anchors_v3.json').read_text())['odaraia']
    results = []
    full = Glb(base / 'odaraia.glb')
    lod = Glb(base / 'odaraia.lod1.glb')
    summary = {'full': check_file(full, 'full', results), 'lod1': check_file(lod, 'lod1', results)}
    summary['anchors'] = check_anchors(full, records, 'full', results)
    check_anchors(lod, records, 'lod1', results)

    def ok(name, condition, detail=''):
        results.append({'file': 'parity', 'check': name, 'pass': bool(condition), 'detail': detail})

    ok('identical joint list and order', summary['full']['joints'] == summary['lod1']['joints'])
    a = full.accessor(full.json['skins'][0]['inverseBindMatrices'])
    b = lod.accessor(lod.json['skins'][0]['inverseBindMatrices'])
    ok('identical inverse bind matrices', a.shape == b.shape and float(np.abs(a - b).max()) < 1e-6,
       f'max delta {float(np.abs(a - b).max()):.2e}' if a.shape == b.shape else 'shape mismatch')
    ok('identical clip set and durations',
       {k: v['seconds'] for k, v in summary['full']['clips'].items()} ==
       {k: v['seconds'] for k, v in summary['lod1']['clips'].items()})
    ok('identical channel counts per clip',
       {k: v['channels'] for k, v in summary['full']['clips'].items()} ==
       {k: v['channels'] for k, v in summary['lod1']['clips'].items()})
    bone_trs = lambda g: [(g.nodes[j]['name'], g.nodes[j].get('translation'), g.nodes[j].get('rotation'),
                           g.nodes[j].get('scale')) for j in g.json['skins'][0]['joints']]
    ok('identical bind pose', bone_trs(full) == bone_trs(lod))
    ok('full in the authored triangle range', 80000 <= summary['full']['triangles'] <= 135000,
       str(summary['full']['triangles']))
    ok('LOD in the authored triangle range', 30000 <= summary['lod1']['triangles'] <= 50000,
       str(summary['lod1']['triangles']))

    failures = [r for r in results if not r['pass']]
    report = {'candidate': str(base), 'summary': {k: (v if k == 'anchors' else
                                                      {kk: vv for kk, vv in v.items() if kk != 'joints'})
                                                  for k, v in summary.items()},
              'checks': results, 'failures': failures,
              'status': 'PASS' if not failures else 'FAIL'}
    (HERE / 'validation_v3.json').write_text(json.dumps(report, indent=2) + '\n')
    for r in results:
        if not r['pass']:
            print('FAIL', r['file'], r['check'], r['detail'])
    print(f"{len(results)} checks, {len(failures)} failures — {report['status']}")
    print(f"full {summary['full']['triangles']} tris {summary['full']['bytes']} bytes; "
          f"lod1 {summary['lod1']['triangles']} tris {summary['lod1']['bytes']} bytes")
    return 0 if not failures else 1


if __name__ == '__main__':
    raise SystemExit(main())
