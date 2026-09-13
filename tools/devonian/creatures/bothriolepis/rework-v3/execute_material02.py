"""Terra medium frozen execution boundary. Verify every input, then build once."""
import hashlib,json,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
manifest=json.loads((HERE/'frozen-inputs-material02.json').read_text())
for path,expected in manifest['inputs'].items():
 actual=hashlib.sha256(Path(path).read_bytes()).hexdigest()
 if actual!=expected:raise SystemExit('STOP input hash mismatch: '+path)
assert sys.argv[1:]==['--run-frozen-material02'],'Require explicit --run-frozen-material02'
out=REPO.parent/'devonian-authoring/bothriolepis/rework-v3/material02'
if (out/'bothriolepis-material02.blend').exists():raise SystemExit('STOP material02 already exists; do not overwrite or choose a new directory.')
out.mkdir(parents=True,exist_ok=True)
command=['/Applications/Blender.app/Contents/MacOS/Blender','--background','--threads','2','--python',str(HERE/'build_material02.py')]
with (out/'execution.log').open('w') as log:
 result=subprocess.run(command,cwd=REPO,stdout=log,stderr=subprocess.STDOUT)
if result.returncode:raise SystemExit('STOP Blender error; preserve '+str(out/'execution.log'))
assert (out/'outputs-sha256.json').exists(),'STOP missing output manifest; preserve log'
print((out/'outputs-sha256.json').read_text())
