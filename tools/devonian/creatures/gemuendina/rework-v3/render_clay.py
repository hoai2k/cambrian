"""Render exactly the frozen eight-view clay recipe; no creative mutations."""
import bpy,sys,json,hashlib
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
OUT=ROOT.parent/'devonian-authoring/gemuendina/rework-v3/clay-01'
sys.dont_write_bytecode=True
sys.path.insert(0,str(HERE))
from sculpt_spec import VIEWS
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
report=json.loads((OUT/'build-report.json').read_text())
for name,digest in report['source_sha256'].items():
    if sha(HERE/name)!=digest:raise RuntimeError('Frozen source changed: '+name)
blend=OUT/'gemuendina-clay-01.blend'
if sha(blend)!=report['blend_sha256']:raise RuntimeError('Clay blend hash changed')
if any((OUT/(n+'.png')).exists() for n,*_ in VIEWS):
    raise RuntimeError('View output exists; do not overwrite archived evidence')
bpy.ops.wm.open_mainfile(filepath=str(blend));scene=bpy.context.scene;camera=scene.camera
manifest={'blend_sha256':sha(blend),'source_sha256':report['source_sha256'],'renders':[]}
for name,pos,target,scale in VIEWS:
    camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=scale;path=OUT/(name+'.png');scene.render.filepath=str(path)
    bpy.ops.render.render(write_still=True)
    manifest['renders'].append({'name':name,'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path)})
    (OUT/'render-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print('GEMUENDINA_CLAY_VIEW_OK '+name,flush=True)
print('GEMUENDINA_CLAY_RENDER_OK '+str(OUT/'render-manifest.json'))
