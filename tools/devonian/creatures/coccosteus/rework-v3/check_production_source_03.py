"""Source-only continuous-atlas regression check; never imports bpy."""
import ast,math,json,hashlib,sys,struct
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from body_uv_02 import loop_uvs,check_coverage
ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
OUT=ROOT/'production-03-static-report.json';assert not OUT.exists()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for row in json.loads((HERE/'frozen-candidate-02.json').read_text())['inputs']:assert sha(row['path'])==row['sha256']
diag=json.loads((ROOT/'diagnostic-shading-01/result.json').read_text());assert diag['complete'] and len(diag['renders'])==12
for row in diag['renders']:assert sha(row['path'])==row['sha256']
names=['body_uv_02.py','bake_02.py','production_common_03.py','candidate_03.py','render_candidate_03.py','check_candidate_03.py','check_export_atlas_03.py']
for name in names:ast.parse((HERE/name).read_text())
path=HERE/'clay-04.py';ns={'math':math}
keep={'smooth','pchip','base_torso_point','torso_point','lip_point','hermite','base_head_point','head_point','inner_point','skin_weights','surface_arrays'}
for node in ast.parse(path.read_text()).body:
    if isinstance(node,ast.FunctionDef)and node.name in keep:exec(compile(ast.Module([node],type_ignores=[]),str(path),'exec'),ns)
    elif isinstance(node,ast.Assign)and any(isinstance(t,ast.Name)and t.id in {'TORSO','COLLAR_Y','THROAT_END'}for t in node.targets):exec(compile(ast.Module([node],type_ignores=[]),str(path),'exec'),ns)
vv,ff,ids,*_=ns['surface_arrays']();before=hashlib.sha256(json.dumps([vv,ff,ids]).encode()).hexdigest()
uv=loop_uvs(len(vv),ff,ids);assert before==hashlib.sha256(json.dumps([vv,ff,ids]).encode()).hexdigest()
areas=[];at=0
for face in ff:
    q=uv[at:at+len(face)];at+=len(face)
    for i in range(1,len(q)-1):
        a=q[i]-q[0];b=q[i+1]-q[0];areas.append(abs(float(a[0]*b[1]-a[1]*b[0]))/2*2048**2)
assert min(areas)>30 and np.isfinite(uv).all() and uv.min()>=.01999 and uv.max()<=.98001
# A material-role or topology mismatch must stop before bake.
bad=ids[:];bad[0]=1
try:loop_uvs(len(vv),ff,bad)
except AssertionError:pass
else:raise AssertionError('Role mutation was accepted')
# Synthetic roughness field has valid living variation; a single uncovered texel
# anywhere within the supported strips must fail, including the filter border.
class Pixels:
    def __init__(self,data):self.data=data
    def foreach_get(self,target):target[:]=self.data.ravel()
class Image:
    size=(128,128)
    def __init__(self):
        self.data=np.ones((128,128,4),np.float32)
        self.data[:,:,:3]=np.linspace(.46,.79,128)[None,:,None]
        self.pixels=Pixels(self.data)
im=Image();check_coverage(im,'roughness');im.data[80,60,:3]=0
try:check_coverage(im,'roughness')
except AssertionError:pass
else:raise AssertionError('Uncovered roughness texel was accepted')
raw=(ROOT/'candidate-02/coccosteus.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];glb=json.loads(raw[20:20+n]);full=predicted=0
for mesh in glb['meshes']:
    triangles=sum(glb['accessors'][p['indices']]['count']/3 for p in mesh['primitives'])
    ratio=.25 if mesh['name'].startswith('Continuous')else .70 if 'orbital study'in mesh['name']else .45
    full+=triangles;predicted+=triangles*ratio
assert predicted/full<.4
result={'status':'SOURCE_ONLY_PASS; actual bake/export/render pending','source_sha256':{n:sha(HERE/n)for n in names},
        'diagnosticImagesVerified':12,'originalFrozenInputsVerified':22,'geometryInputUnchanged':True,
        'vertices':len(vv),'faces':len(ff),'UVloops':len(uv),'roughness2048TriangleAreaPixels':{'min':min(areas),'median':float(np.median(areas)),'max':max(areas)},
        'roleMutationRejected':True,'singleUncoveredRoughnessTexelRejected':True,'predictedLODtriangleRatio':predicted/full,
        'limitations':'No Blender/UV assignment/bake/decimation/export/runtime execution. Actual fin-ray and bar fidelity requires images.'}
OUT.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));print('COCCOSTEUS_PRODUCTION_SOURCE_03_COMPLETE')
