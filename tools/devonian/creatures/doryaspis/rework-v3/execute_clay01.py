"""Hash-verified Terra execution boundary. One immutable command group per call."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
ROOT=REPO.parent/'devonian-authoring/doryaspis/rework-v3'
OUT=ROOT/'clay01'
assert sys.argv[1:] in (['--build'],['--render']),'Require --build or --render'
group=sys.argv[1][2:]
manifest=json.loads((HERE/'frozen-inputs-clay01.json').read_text())
for path,expected in manifest['inputs'].items():
    actual=hashlib.sha256(Path(path).read_bytes()).hexdigest()
    assert actual==expected,'STOP frozen input mismatch: '+path
blender='/Applications/Blender.app/Contents/MacOS/Blender'
if group=='build':
    assert not OUT.exists(),'STOP: clay01 candidate exists; no overwrite or retry'
    cmd=[blender,'--background','--threads','2','--python-exit-code','1','--python',str(HERE/'build_clay01.py')]
else:
    construction=json.loads((OUT/'construction.json').read_text())
    assert construction['passed'],'STOP: failed construction'
    blend=OUT/'doryaspis-clay01.blend'
    assert hashlib.sha256(blend.read_bytes()).hexdigest()==construction['blend']['sha256'],'STOP: blend hash mismatch'
    assert not (OUT/'renders').exists(),'STOP: render folder exists; no overwrite or retry'
    cmd=[blender,'--background',str(blend),'--threads','2','--python-exit-code','1','--python',str(HERE/'render_clay01.py')]
logpath=ROOT/('clay01-'+group+'.log')
with logpath.open('x') as log:
    completed=subprocess.run(cmd,cwd=REPO,stdout=log,stderr=subprocess.STDOUT)
assert completed.returncode==0,'STOP: Blender failed; preserve '+str(logpath)
expected=OUT/('construction.json' if group=='build' else 'render-manifest.json')
assert expected.exists(),'STOP: expected report missing: '+str(expected)
print('DORYASPIS_FROZEN_GROUP_OK',group)
print(expected.read_text())
