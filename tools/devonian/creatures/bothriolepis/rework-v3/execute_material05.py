"""Frozen execution boundary for MATERIAL05, in the shape of execute_material04.

Two differences from the M04 executor, both forced by this environment and
both recorded rather than papered over:

  * the MATERIAL04 input is a .blend, and .blend files are not byte-reproducible
    across Blender saves -- the chain established that at M04 already.  It is
    therefore verified BY VALUE: build_material05.py asserts the recorded
    geometry hash the M04 object carries, the 55,802/56,104 topology, the
    38,904 protected vertices and their coordinates, the oral study-key delta,
    five oral poses PASS and both eye meshes, before it changes anything.  Only
    the source files are hash-frozen here.
  * building and rendering are separate jobs (build_material05.py then
    render_material05.py), so a run can be resumed without repeating either.

Usage:  python3 execute_material05.py --run-frozen-material05 [variant]
"""
import hashlib,json,subprocess,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
REPO=HERE.parents[4]
BLENDER='/opt/blender/blender'
manifest=json.loads((HERE/'frozen-inputs-material05.json').read_text())
def verify():
 for path,expected in manifest['inputs'].items():
  actual=hashlib.sha256(Path(path).read_bytes()).hexdigest()
  if actual!=expected:raise SystemExit('STOP input hash mismatch: '+path)
verify()
assert sys.argv[1:2]==['--run-frozen-material05'],'Require explicit --run-frozen-material05'
variant=sys.argv[2] if len(sys.argv)>2 else manifest['variant']
out=REPO.parent/'devonian-authoring/bothriolepis/rework-v3'/variant
blend=out/('bothriolepis-%s.blend'%variant)
if blend.exists():raise SystemExit('STOP %s already exists; do not overwrite or choose a new directory.'%blend)
out.mkdir(parents=True,exist_ok=True)
log=(out/'execution.log').open('w')
for script,args in [('build_material05.py',[variant]),
                    ('render_material05.py',['closeups',variant]),
                    ('render_material05.py',['views',variant])]:
 command=[BLENDER,'--background','--threads','4','--python',str(HERE/script),'--']+args
 log.write('\n$ '+' '.join(command)+'\n');log.flush()
 result=subprocess.run(command,cwd=REPO,stdout=log,stderr=subprocess.STDOUT)
 if result.returncode:
  log.close();raise SystemExit('STOP Blender error in %s; preserve %s'%(script,out/'execution.log'))
command=[BLENDER,'--background','--threads','1','--python',str(HERE/'diagnostic_m05_closeup.py'),'--',
         str(blend),str(out),'material_fields05',
         str(json.loads((out/'source-check.json').read_text())['tuning']['bump'])]
log.write('\n$ '+' '.join(command)+'\n');log.flush()
result=subprocess.run(command,cwd=REPO,stdout=log,stderr=subprocess.STDOUT)
log.close()
if result.returncode:raise SystemExit('STOP diagnostic error; preserve '+str(out/'execution.log'))
verify()
assert (out/'outputs-sha256.json').exists(),'STOP missing output manifest; preserve log'
print((out/'source-check.json').read_text())
