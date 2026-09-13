"""Execution boundary for the clay02 iterations.

    python3 tools/devonian/creatures/doryaspis/rework-v3/execute_clay02.py --build  [variant]
    python3 tools/devonian/creatures/doryaspis/rework-v3/execute_clay02.py --render [variant]

Each stage saves its own outputs under `<authoring>/doryaspis/rework-v3/<variant>/`
and appends to `<variant>-<stage>.log`, so an interruption loses at most the
stage in flight.  `.blend` is not byte-reproducible, so the hash gate is by
value: build records the blend's hash and the render stage re-checks it.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[4]
ROOT = REPO.parent / 'devonian-authoring/doryaspis/rework-v3'
BLENDER = '/opt/blender/blender'
assert sys.argv[1:2] in (['--build'], ['--render']), 'Require --build or --render'
group = sys.argv[1][2:]
variant = sys.argv[2] if len(sys.argv) > 2 else 'clay02'
OUT = ROOT / variant
ROOT.mkdir(parents=True, exist_ok=True)
if group == 'build':
    assert not OUT.exists(), 'STOP: ' + variant + ' exists; use the next letter'
    cmd = [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1',
           '--python', str(HERE / 'build_clay02.py'), '--', variant]
else:
    construction = json.loads((OUT / 'construction.json').read_text())
    assert construction['passed'], 'STOP: failed construction'
    cmd = [BLENDER, '--background', str(OUT / ('doryaspis-' + variant + '.blend')),
           '--threads', '1', '--python-exit-code', '1',
           '--python', str(HERE / 'render_clay02.py'), '--', variant]
logpath = ROOT / (variant + '-' + group + '.log')
with logpath.open('a') as log:
    completed = subprocess.run(cmd, cwd=REPO, stdout=log, stderr=subprocess.STDOUT)
assert completed.returncode == 0, 'STOP: Blender failed; see ' + str(logpath)
expected = OUT / ('construction.json' if group == 'build' else 'render-manifest.json')
assert expected.exists(), 'STOP: expected report missing: ' + str(expected)
print('DORYASPIS_CLAY02_GROUP_OK', group, variant)
