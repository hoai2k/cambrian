"""Source-only specification/decoder/oral-motion checks. Never imports bpy."""
from pathlib import Path
import ast,math,json,hashlib,struct,zlib,io,contextlib
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
ns={};exec(compile((HERE/'rig_actions_01.py').read_text(),'rig_actions','exec'),ns)
for name in ['production_common_01.py','bake_01.py','atlas_pigment_01.py','rig_actions_01.py','candidate_01.py','export_patch_01.py','render_candidate_01.py','check_candidate_01.py']:ast.parse((HERE/name).read_text())
B=ns['bones']();C=ns['CLIPS'];assert len(B)==20 and len(C)==18
signatures={};ranges={}
for clip in C:
    values=[]
    for i in range(101):
        pose=ns['pose'](clip,i/100)
        row=[v for n,data in pose.items()for key in ('rotation','location')for v in data[key]]
        assert all(math.isfinite(v)for v in row)
        assert pose['root']=={'rotation':[0.,0.,0.],'location':[0.,0.,0.]}
        assert -.00001<=pose['jaw']['rotation'][0]<=.340001;values.append(row)
    a=np.array(values);ranges[clip]=float(np.max(np.ptp(a,axis=0)));assert ranges[clip]>.001
    if clip!='Death':assert np.max(abs(a[0]-a[-1]))<1e-7
    else:assert np.max(abs(a[90:]-a[-1]))<1e-7
    signatures[clip]=hashlib.sha256(a.tobytes()).hexdigest()
assert len(set(signatures.values()))==18
for y in np.linspace(-1.8,2.625,300):
    w=ns['axial'](y);assert set(w)<=set(B) and len(w)<=2 and abs(sum(w.values())-1)<1e-9
codec={'np':np,'Path':Path,'struct':struct,'zlib':zlib}
for f in ast.parse((HERE/'atlas_pigment_01.py').read_text()).body:
    if isinstance(f,ast.FunctionDef)and f.name in ('png_pixels','bilinear'):exec(compile(ast.Module([f],type_ignores=[]),'atlas','exec'),codec)
decoders=[]
for name in ('side.png','armour-material-close.png'):
    path=ROOT/'material-04'/name;actual=codec['png_pixels'](path)
    expected=np.asarray(Image.open(path).convert('RGB'))[::-1]/255
    error=float(np.max(abs(actual-expected)));assert error<1e-7;decoders.append({'path':str(path),'error':error})
probe=np.array([[[0,0,0],[1,0,0]],[[0,1,0],[1,1,0]]],float)
assert np.allclose(codec['bilinear'](probe,[[.5,.5]]),[[.5,.5,0]])
uv=np.random.default_rng(714).uniform(-.01,1.01,(100,2));a=np.random.default_rng(715).uniform(.03,.21,(32,32,3))
filtered=sum(wx*wy*codec['bilinear'](a,uv+np.array([dx,dy])*.0022)for dx,wx in [(-1,.25),(0,.5),(1,.25)]for dy,wy in [(-1,.25),(0,.5),(1,.25)])
assert filtered.min()>=a.min() and filtered.max()<=a.max()
raw=np.array([0.,.04045,.5,1.]);linear=np.where(raw<=.04045,raw/12.92,((raw+.055)/1.055)**2.4)
assert np.allclose(linear,[0,.00313080495,.21404114048,1],atol=1e-9)
# Retain the proven topology/containment checker, replace linear study-key mixing
# by the actual rotational LBS to test the new bone motion at five gapes.
p=HERE/'check-clay04-source.py';s=p.read_text()
s=s.replace("posed=base*(1-gape)+np.asarray([ns['moved'](p,w,1) for p,w in zip(vv,weights)])*gape","posed=np.asarray([ns['moved'](p,w,gape) for p,w in zip(vv,weights)])")
s=s.replace('for gape in [0,.5,1]:','for gape in [0,.25,.5,.75,1]:').replace('gapesChecked=[0,.5,1],centerlineSegments=279,wallContainmentSegments=288','gapesChecked=[0,.25,.5,.75,1],centerlineSegments=465,wallContainmentSegments=480')
stream=io.StringIO()
with contextlib.redirect_stdout(stream):exec(compile(s,str(p),'exec'),{'__file__':str(p)})
oral=json.loads(stream.getvalue())
report={'phase':'source-only checks; not Blender execution or actual candidate acceptance','bones':len(B),'actions':len(C),
 'dynamicRanges':ranges,'distinctMotionSignatures':True,'rootStable':True,'noScaleAuthored':True,'deathTerminalHold':True,
 'maxGapeRadians':.34,'decoderIndependentComparisons':decoders,'linearFilterConvexBounds':True,'oralRotationalLBS':oral,
 'source_sha256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in HERE.glob('*_01.py')},
 'unverified':'Blender bake/API/bone evaluation, exported appearance, LOD integrity, runtime playback, final eye/oral/general audits.'}
path=ROOT/'production-01-static-report.json';path.write_text(json.dumps(report,indent=2)+'\n')
print('COCCOSTEUS_PRODUCTION_SOURCE_PASS',str(path))
