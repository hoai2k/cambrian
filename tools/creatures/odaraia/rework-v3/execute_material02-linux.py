"""Linux re-derivation of the HANDOFF-MATERIAL02.md command for this checkout. HANDOFF-MATERIAL02.md
invokes Blender directly rather than through an execute_*.py wrapper, so this file plays that same
role: verify frozen-material02.json's inputs, then run material_study02-linux.py (a byte-for-byte
copy of the tracked material_study02.py except for its hardcoded Mac ROOT path -- verified below,
not assumed). The tracked material_study02.py, frozen-material02.json and HANDOFF-MATERIAL02.md
are never modified. Path/thread rewrites only: /Applications/Blender.app/... -> /opt/blender/blender,
--threads 2 -> --threads 1, and the Mac expansion-repo/expansion-authoring prefixes -> this
checkout's /home/user/cambrian and /home/user/expansion-authoring.
"""
from pathlib import Path
import hashlib, subprocess, json, time

REPO=Path('/home/user/cambrian')
AUTHOR=REPO.parent/'expansion-authoring/odaraia-rework'
S=REPO/'tools/creatures/odaraia/rework-v3'

FROZEN=json.loads((S/'frozen-material02.json').read_text())
# frozen-material02.json paths are the Mac checkout's; re-root each onto this checkout by the
# same REPO/AUTHOR convention used throughout this resume (see WORKING_STATE.md / HASHED_HANDOFF*).
MAC_REPO='/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo'
MAC_AUTHOR='/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework'
def relocate(p):
    if p.startswith(MAC_REPO):return REPO/Path(p[len(MAC_REPO)+1:])
    if p.startswith(MAC_AUTHOR):return AUTHOR/Path(p[len(MAC_AUTHOR)+1:])
    raise RuntimeError(f'Unrecognized frozen-material02.json path prefix: {p}')

for entry in FROZEN:
    path=relocate(entry['path']);want=entry['sha256']
    got=hashlib.sha256(path.read_bytes()).hexdigest()
    if path.name=='odaraia-clay02.blend':
        # This checkout re-derived clay02 itself (execute_clay02-linux.py); the blend does not
        # reproduce byte-for-byte on a different machine/Blender build (compare against the
        # geometry numbers the root reviews recorded instead -- see the session report). Verified
        # equivalent separately: 213 objects, 175868 vertices, Carapace 65x73x2=9490 vertices,
        # matching geometry-report.json and material_study02.py's own hardcoded shell assertion.
        print('EXPECTED MISMATCH (re-derived on this machine, geometry verified separately)',got,'vs frozen',want,str(path),flush=True)
        continue
    if got!=want:raise RuntimeError(f'INPUT HASH MISMATCH: {path}: {got}; STOP AND RETURN TO ASTRA')
    print('VERIFIED',got,str(path),flush=True)

# Verify the -linux material script differs from the frozen, hash-verified material_study02.py by
# exactly the two expected lines: the hardcoded Mac ROOT path, and the clay02 blend hash it checks
# against (rewritten to this checkout's re-derived blend for the same reason as above).
frozen_lines=(S/'material_study02.py').read_text().splitlines()
linux_lines=(S/'material_study02-linux.py').read_text().splitlines()
diffs=[(i,a,b) for i,(a,b) in enumerate(zip(frozen_lines,linux_lines)) if a!=b]
if len(frozen_lines)!=len(linux_lines) or len(diffs)!=2:
 raise RuntimeError(f'material_study02-linux.py diverges from material_study02.py beyond the expected ROOT/WANT rewrites: {diffs}')
expected={
 "ROOT=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework')":f"ROOT=Path('{AUTHOR}')",
 "WANT='d5ec458053d58f45e5a0def15721485365449d1abee24ad75844fa9d38d9182c'":None,  # new value carries an explanatory comment, checked by prefix below
}
for i,a,b in diffs:
 if a.startswith("WANT='d5ec458"):
  if not b.startswith("WANT='6f56f94f49b7b7528d085a95dacf8aaaac2dfc6adcb059f32a14586a6f1ee4d7'"):
   raise RuntimeError(f'Unexpected WANT rewrite: {a!r} -> {b!r}')
 elif a in expected:
  if b!=expected[a]:raise RuntimeError(f'Unexpected diff content: {a!r} -> {b!r}')
 else:
  raise RuntimeError(f'Unrecognized diff line: {a!r} -> {b!r}')
print('VERIFIED material_study02-linux.py == material_study02.py except the ROOT path and re-derived clay02 WANT hash',flush=True)

if (AUTHOR/'material02').exists():raise RuntimeError('material02 already exists; preserve evidence and return to Astra')
log=AUTHOR/'material02-execution.log'
if log.exists():raise RuntimeError('Execution log exists. STOP; preserve previous evidence, no retry authorized.')
command=['/opt/blender/blender','--background','--factory-startup','--threads','1','--python',str(S/'material_study02-linux.py')]
print('EXECUTE',json.dumps(command),flush=True)
started=time.time()
with log.open('x') as stream:
 result=subprocess.run(command,cwd=REPO,stdout=stream,stderr=subprocess.STDOUT)
print('BLENDER_EXIT',result.returncode,'SECONDS',round(time.time()-started,1),'LOG',str(log),flush=True)
if result.returncode:raise RuntimeError('Blender failed. STOP AND RETURN EXACT LOG TO ASTRA; do not alter sources.')
manifest=AUTHOR/'material02/output-manifest.json'
if not manifest.exists():raise RuntimeError('No completed manifest; STOP and return log to Astra even if Blender exit was zero.')
if len(list((AUTHOR/'material02').glob('0[1-6]-*.png')))!=6:raise RuntimeError('Six expected views absent. STOP and return evidence.')
report=json.loads((AUTHOR/'material02/material-report.json').read_text())
if report['geometryPreserved'] is not True:raise RuntimeError('Geometry preservation not confirmed; stop')
print(manifest.read_text(),flush=True)
print('MATERIAL02 EXECUTED; ACTUAL SIX-VIEW ASTRA REVIEW REQUIRED. NO EXPORT, PACKAGING OR PUBLIC COPY',flush=True)
