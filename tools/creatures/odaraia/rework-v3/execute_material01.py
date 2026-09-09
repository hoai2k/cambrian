"""Frozen Terra material01 execution group. No changes, retry, export or public copy."""
from pathlib import Path
import hashlib,subprocess,json,time
REPO=Path('/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo')
A=REPO.parent/'expansion-authoring/odaraia-rework'
S=REPO/'tools/creatures/odaraia/rework-v3'
EXPECTED={
 S/'material_study01.py':'c91290a75a03e619598a1de62240deaad34330892576dcf7bf79d12655f7c13e',
 S/'AUTHOR_REVIEW_CLAY02_MATERIAL01.md':'be6a5b11974ad8b7c6a86cf8e56796770a709b8f903c5de21b849cde6f289d52',
 S/'ATTACK_EAT_RIG_DIRECTION.md':'0616cbd5d023193939635d6eb13968eac30d3ef3f648ad51bf231492a72f2221',
 A/'clay02/odaraia-clay02.blend':'d5ec458053d58f45e5a0def15721485365449d1abee24ad75844fa9d38d9182c',
 A/'clay02/output-manifest.json':'0222be3b7981649de1aa22028cbc7a00e4d54782f619957449bfcb452cec54a1',
 A/'user-reference/odaraia-user-reference-2026-09-07.png':'01c3449922bf37fb7e00956dc0c05c13650a7bdc3aa1a4d4e19d703cc2ffde7c',
 A/'user-reference/odaraia-user-reference-02-2026-09-07.jpeg':'ff300aa259f28e7c433c3b0bfcc6eb57417494e37e0747ab4275383e67a96641',
}
for path,want in EXPECTED.items():
 got=hashlib.sha256(path.read_bytes()).hexdigest()
 if got!=want:raise RuntimeError(f'INPUT MISMATCH {path}: {got}. STOP AND RETURN TO ASTRA')
 print('VERIFIED',str(path),got,flush=True)
log=A/'material01-execution.log'
if (A/'material01').exists() or log.exists():raise RuntimeError('Existing candidate/log; preserve and return to Astra, no retry')
command=['/Applications/Blender.app/Contents/MacOS/Blender','--background','--factory-startup','--python',str(S/'material_study01.py')]
print('EXECUTE',json.dumps(command),flush=True);start=time.time()
with log.open('x') as stream:r=subprocess.run(command,cwd=REPO,stdout=stream,stderr=subprocess.STDOUT)
print('BLENDER_EXIT',r.returncode,'SECONDS',round(time.time()-start,1),'LOG',str(log),flush=True)
if r.returncode:raise RuntimeError('Unexpected Blender failure; return exact log; do not repair')
manifest=A/'material01/output-manifest.json'
if not manifest.exists():raise RuntimeError('Completed manifest missing despite process exit; stop')
if len(list((A/'material01').glob('0[1-6]-*.png')))!=6:raise RuntimeError('Six material study views missing; stop')
report=json.loads((A/'material01/material-report.json').read_text())
if report['geometryPreserved'] is not True:raise RuntimeError('Geometry preservation not confirmed; stop')
print(manifest.read_text(),flush=True)
print('MATERIAL01 EXECUTED; ACTUAL SIX-VIEW AUTHOR REVIEW REQUIRED; NO RIG, EXPORT OR PUBLIC COPY',flush=True)
