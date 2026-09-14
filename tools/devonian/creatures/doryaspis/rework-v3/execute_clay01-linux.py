"""Linux execution boundary for clay01.  Counterpart of execute_clay01.py.

The frozen manifest `frozen-inputs-clay01.json` names macOS absolute paths for
the repository and for the two preserved reference images.  On this machine the
repository is /home/user/cambrian and the authoring tree /home/user/devonian-authoring,
so the wrapper verifies the five repo-local sources **by value** -- the frozen
SHA-256 of each file, matched by basename inside this directory -- and reports
the reference entries it cannot reach rather than silently skipping them.
`.blend` output is not byte-reproducible across saves, so no blend hash is
frozen here either; construction.json records the run's own invariants.

Usage:  python3 execute_clay01-linux.py --build | --render
Blender: /opt/blender/blender -b --threads 1 --python-exit-code 1 --python <script>
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
ROOT = REPO.parent / 'devonian-authoring/doryaspis/rework-v3'
OUT = ROOT / 'clay01'
BLENDER = '/opt/blender/blender'
assert sys.argv[1:] in (['--build'], ['--render']), 'Require --build or --render'
group = sys.argv[1][2:]

manifest = json.loads((HERE / 'frozen-inputs-clay01.json').read_text())
verified, unreachable = {}, []
for path, expected in manifest['inputs'].items():
    local = HERE / Path(path).name
    if local.exists():
        actual = hashlib.sha256(local.read_bytes()).hexdigest()
        assert actual == expected, 'STOP frozen input mismatch by value: ' + str(local)
        verified[local.name] = actual
    else:
        unreachable.append(path)
assert len(verified) >= 5, 'STOP: expected the five frozen repo sources, saw ' + repr(sorted(verified))
print('FROZEN_VERIFIED_BY_VALUE', json.dumps(sorted(verified)))
print('FROZEN_UNREACHABLE_ON_THIS_MACHINE', json.dumps(unreachable))

ROOT.mkdir(parents=True, exist_ok=True)
if group == 'build':
    assert not OUT.exists(), 'STOP: clay01 candidate exists; no overwrite or retry'
    script = HERE / 'build_clay01-linux.py'
    cmd = [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python', str(script)]
else:
    construction = json.loads((OUT / 'construction.json').read_text())
    assert construction['passed'], 'STOP: failed construction'
    blend = OUT / 'doryaspis-clay01.blend'
    assert hashlib.sha256(blend.read_bytes()).hexdigest() == construction['blend']['sha256'], 'STOP: blend changed since construction'
    assert not (OUT / 'renders').exists(), 'STOP: render folder exists; no overwrite or retry'
    script = HERE / 'render_clay01-linux.py'
    cmd = [BLENDER, '--background', str(blend), '--threads', '1', '--python-exit-code', '1', '--python', str(script)]
logpath = ROOT / ('clay01-' + group + '-linux.log')
with logpath.open('x') as log:
    completed = subprocess.run(cmd, cwd=REPO, stdout=log, stderr=subprocess.STDOUT)
assert completed.returncode == 0, 'STOP: Blender failed; preserve ' + str(logpath)
expected = OUT / ('construction.json' if group == 'build' else 'render-manifest.json')
assert expected.exists(), 'STOP: expected report missing: ' + str(expected)
print('DORYASPIS_FROZEN_GROUP_OK', group)
print(expected.read_text())
