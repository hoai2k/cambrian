"""Linux re-derivation of execute_clay02.py for this checkout. Not a creative edit: the only
difference from the tracked wrapper is REPO/Blender/thread path rewriting per the resume
instructions, and running build_clay02-linux.py (a byte-for-byte copy of the tracked
build_clay02.py except for one line rewriting its hardcoded Mac authoring ROOT path -- verified
below rather than assumed. The tracked build_clay02.py and execute_clay02.py are never modified.
"""
from pathlib import Path
import hashlib, subprocess, sys, json, time

REPO=Path('/home/user/cambrian')
AUTHOR=REPO.parent/'expansion-authoring/odaraia-rework'
S=REPO/'tools/creatures/odaraia/rework-v3'

EXPECTED={
 S/'AUTHOR_REVIEW_CLAY01_AND_CLAY02_PLAN.md':'4d558bd689b02e273a8c3d5971b660d5bba1f24a8947bb34cb9c2db356ecf8c5',
 S/'build_clay02.py':'29b486d476b4de9dd661d6f0a7e8dc62f747b61d211616b6ad09f75b7d302c0b',
 S/'execute_clay02.py':'bc01cf399aaea992caff53612edbf3b26f2ad0872fc44964934017815929e703',
 S/'ANATOMY_SHAPE_BRIEF.md':'c0d8ab5203f8e1d2b018946ee734a13c0ad0793605d845f44896b1c95b2c50f9',
 AUTHOR/'user-reference/odaraia-user-reference-2026-09-07.png':'01c3449922bf37fb7e00956dc0c05c13650a7bdc3aa1a4d4e19d703cc2ffde7c',
 AUTHOR/'user-reference/odaraia-user-reference-02-2026-09-07.jpeg':'ff300aa259f28e7c433c3b0bfcc6eb57417494e37e0747ab4275383e67a96641',
}
for path,want in EXPECTED.items():
 got=hashlib.sha256(path.read_bytes()).hexdigest()
 if got!=want:raise RuntimeError(f'INPUT HASH MISMATCH: {path}: {got}; STOP AND RETURN TO ASTRA')
 print('VERIFIED',got,str(path),flush=True)

# Verify the -linux build script differs from the frozen, hash-verified build_clay02.py by
# exactly one line: the hardcoded Mac ROOT path rewritten to this checkout's authoring root.
frozen_lines=(S/'build_clay02.py').read_text().splitlines()
linux_lines=(S/'build_clay02-linux.py').read_text().splitlines()
diffs=[(i,a,b) for i,(a,b) in enumerate(zip(frozen_lines,linux_lines)) if a!=b]
if len(frozen_lines)!=len(linux_lines) or len(diffs)!=1:
 raise RuntimeError(f'build_clay02-linux.py diverges from build_clay02.py beyond the expected one-line ROOT rewrite: {diffs}')
i,a,b=diffs[0]
if a!="ROOT = Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework')" \
   or b!=f"ROOT = Path('{AUTHOR}')":
 raise RuntimeError(f'Unexpected one-line diff content: {a!r} -> {b!r}')
print('VERIFIED build_clay02-linux.py == build_clay02.py except the ROOT path line',flush=True)

if (AUTHOR/'clay02').exists():raise RuntimeError('Candidate directory exists. STOP; no overwrite or new directory choice authorized.')
log=AUTHOR/'clay02-execution.log'
if log.exists():raise RuntimeError('Execution log exists. STOP; preserve previous evidence, no retry authorized.')
command=['/opt/blender/blender','--background','--factory-startup','--threads','1','--python',str(S/'build_clay02-linux.py')]
print('EXECUTE',json.dumps(command),flush=True)
started=time.time()
AUTHOR.mkdir(parents=True,exist_ok=True)
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
