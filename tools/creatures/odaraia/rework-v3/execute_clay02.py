"""Terra-only deterministic frozen command group: no creative edits or retries."""
from pathlib import Path
import hashlib, subprocess, sys, json, time
REPO=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo')
AUTHOR=REPO.parent/'expansion-authoring/odaraia-rework'
EXPECTED={
 REPO/'tools/creatures/odaraia/rework-v3/AUTHOR_REVIEW_CLAY01_AND_CLAY02_PLAN.md':'4d558bd689b02e273a8c3d5971b660d5bba1f24a8947bb34cb9c2db356ecf8c5',
 REPO/'tools/creatures/odaraia/rework-v3/build_clay02.py':'29b486d476b4de9dd661d6f0a7e8dc62f747b61d211616b6ad09f75b7d302c0b',
 REPO/'tools/creatures/odaraia/rework-v3/ANATOMY_SHAPE_BRIEF.md':'c0d8ab5203f8e1d2b018946ee734a13c0ad0793605d845f44896b1c95b2c50f9',
 AUTHOR/'user-reference/odaraia-user-reference-2026-09-07.png':'01c3449922bf37fb7e00956dc0c05c13650a7bdc3aa1a4d4e19d703cc2ffde7c',
 AUTHOR/'user-reference/odaraia-user-reference-02-2026-09-07.jpeg':'ff300aa259f28e7c433c3b0bfcc6eb57417494e37e0747ab4275383e67a96641',
}
for path,want in EXPECTED.items():
 got=hashlib.sha256(path.read_bytes()).hexdigest()
 if got!=want:raise RuntimeError(f'INPUT HASH MISMATCH: {path}: {got}; STOP AND RETURN TO ASTRA')
 print('VERIFIED',got,str(path),flush=True)
if (AUTHOR/'clay02').exists():raise RuntimeError('Candidate directory exists. STOP; no overwrite or new directory choice authorized.')
log=AUTHOR/'clay02-execution.log'
if log.exists():raise RuntimeError('Execution log exists. STOP; preserve previous evidence, no retry authorized.')
command=['/Applications/Blender.app/Contents/MacOS/Blender','--background','--factory-startup','--python',str(REPO/'tools/creatures/odaraia/rework-v3/build_clay02.py')]
print('EXECUTE',json.dumps(command),flush=True)
started=time.time()
with log.open('x') as stream:
 result=subprocess.run(command,cwd=REPO,stdout=stream,stderr=subprocess.STDOUT)
print('BLENDER_EXIT',result.returncode,'SECONDS',round(time.time()-started,1),'LOG',str(log),flush=True)
if result.returncode:raise RuntimeError('Blender failed. STOP AND RETURN EXACT LOG TO ASTRA; do not alter sources.')
manifest=AUTHOR/'clay02/output-manifest.json'
if not manifest.exists():raise RuntimeError('No completed manifest; STOP and return log to Astra even if Blender exit was zero.')
meta=json.loads(manifest.read_text())
if len(list((AUTHOR/'clay02').glob('0[1-6]-*.png')))!=6:raise RuntimeError('Six expected views absent. STOP and return evidence.')
print(manifest.read_text(),flush=True)
print('EXECUTION COMPLETE; ACTUAL SIX-VIEW ASTRA REVIEW REQUIRED. NO EXPORT, PACKAGING OR PUBLIC COPY AUTHORIZED.',flush=True)
