"""Bounded interpolation fixtures from actual exports plus edge-case glTF curves."""
import sys,json,struct,hashlib,collections
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];LOCAL=ROOT.parent/'devonian-authoring/gemuendina/rework-v3'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE));from gltf_interpolation_03 import sample_channel
OUT=LOCAL/'interpolation-check-03';assert not OUT.exists();OUT.mkdir()
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
cases=[];diagnostic=[]
for suffix in ('','.lod1'):
 p=LOCAL/'candidate-02'/('gemuendina'+suffix+'.glb');raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:]
 def data(i):
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];k={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];assert a['componentType']==5126
  off=v.get('byteOffset',0)+a.get('byteOffset',0)
  return np.array([struct.unpack_from('<'+'f'*k,blob,off+j*v.get('byteStride',4*k))for j in range(a['count'])])
 counts=collections.Counter();step_constant=0
 for action in g['animations']:
  for ch in action['channels']:
   sp=action['samplers'][ch['sampler']];mode=sp.get('interpolation','LINEAR');times=data(sp['input']).ravel();values=data(sp['output']);counts[mode]+=1
   if mode=='STEP'and np.max(np.abs(values-values[0]))<1e-12:step_constant+=1
   cases.append({'origin':p.name+':'+action['name']+':'+g['nodes'][ch['target']['node']]['name'],
                 'mode':mode,'path':ch['target']['path'],'times':times.tolist(),'values':values.tolist()})
 diagnostic.append({'asset':str(p),'sha256':sha(p),'channel_modes':dict(counts),'constant_step_channels':step_constant})
# Nonconstant STEP, uneven key spacing, clamped endpoints, quaternion shortest
# path/near-coincident/half-turn, cubic dt scaling and normalized cubic rotation.
cases.extend([
 {'origin':'synthetic-changing-step','mode':'STEP','path':'translation','times':[.25,1.5,3.25],'values':[[0,1,2],[9,-3,4],[-2,8,1]]},
 {'origin':'synthetic-single-step','mode':'STEP','path':'translation','times':[.7],'values':[[1,2,3]]},
 {'origin':'synthetic-linear-vector','mode':'LINEAR','path':'translation','times':[.25,1.5,3.25],'values':[[0,1,2],[9,-3,4],[-2,8,1]]},
 {'origin':'synthetic-quaternion-sign','mode':'LINEAR','path':'rotation','times':[.25,1.5],'values':[[0,0,0,1],[0,0,0,-1]]},
 {'origin':'synthetic-quaternion-halfturn','mode':'LINEAR','path':'rotation','times':[.25,1.5],'values':[[0,0,0,1],[1,0,0,0]]},
 {'origin':'synthetic-quaternion-near','mode':'LINEAR','path':'rotation','times':[.25,1.5],'values':[[0,0,0,1],[.00001,0,0,.99999999995]]},
 {'origin':'synthetic-cubic-vector','mode':'CUBICSPLINE','path':'translation','times':[.25,2.75,4.0],'values':[[0,0,0],[1,2,3],[2,-3,1],[-1,2,3],[4,-2,1],[1,2,-1],[2,1,-1],[0,1,5],[0,0,0]]},
 {'origin':'synthetic-cubic-quaternion','mode':'CUBICSPLINE','path':'rotation','times':[.25,2.75],'values':[[0,0,0,0],[0,0,0,1],[.2,.1,0,0],[-.1,.05,0,.1],[.6,0,0,.8],[0,0,0,0]]}
])
for case in cases:
 case['times']=np.array(case['times'],dtype=np.float32).astype(float).tolist();case['values']=np.array(case['values'],dtype=np.float32).astype(float).tolist()
 ts=case['times'];queries=[ts[0]-.1,ts[-1]+.1]+ts
 for a,b in zip(ts,ts[1:]):queries.extend((a+(b-a)*.25,a+(b-a)*.5,a+(b-a)*.75,b-1e-7))
 case['queries']=sorted(set(queries));case['expected']=[sample_channel(ts,case['values'],t,case['mode'],case['path'])for t in case['queries']]
(OUT/'fixtures.json').write_text(json.dumps(cases,separators=(',',':')))
(OUT/'diagnostic.json').write_text(json.dumps({'helper_sha256':sha(HERE/'gltf_interpolation_03.py'),'assets':diagnostic,'cases':len(cases),'queries':sum(len(c['queries'])for c in cases)},indent=2)+'\n')
print('GEMUENDINA_INTERPOLATION_FIXTURES',len(cases),sum(len(c['queries'])for c in cases),OUT)
