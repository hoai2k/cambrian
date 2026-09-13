"""Dunkleosteus: exact RGB-only sRGB-to-linear LOD correction; no public writes."""
from pathlib import Path
import hashlib,json,struct,shutil
H=Path(__file__).resolve().parent;R=H.parents[4]
BASE=R.parent/'devonian-authoring/dunkleosteus/face-v4/candidate03'
OLD=BASE/'exports-pigment04';OUT=BASE/'exports-linear05'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(OLD/'dunkleosteus.lod1.glb')=='2d57904f0a8a2c858f597730e38927b1f38126a51a9f87011b2f3f78d7c52bca'
assert sha(OLD/'dunkleosteus.glb')=='0ace6026c6b46d9d560528677ffdaf31769d74bea51065b884214c8b1037950d'
assert not OUT.exists(),'Preserve prior evidence'
b=(OLD/'dunkleosteus.lod1.glb').read_bytes();new=bytearray(b)
n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);start=20+n+8
assert struct.unpack_from('<I',b,start-4)[0]==0x004e4942
lut=[round((x/65535/12.92 if x/65535<=.04045 else ((x/65535+.055)/1.055)**2.4)*65535) for x in range(65536)]
used=set();allowed=set();rows=[]
for m in g['meshes']:
 for p in m['primitives']:
  i=p['attributes']['COLOR_0']
  if i in used:continue
  used.add(i);a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
  assert a['componentType']==5123 and a['normalized'] and a['type']=='VEC4'
  assert not ('min' in a or 'max' in a),'Version explicit metadata if extrema exist'
  off=start+v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',8)
  for k in range(a['count']):
   at=off+k*stride;vals=struct.unpack_from('<4H',b,at)
   struct.pack_into('<3H',new,at,*[lut[x] for x in vals[:3]])
   allowed.update(range(at,at+6))
   assert struct.unpack_from('<H',new,at+6)[0]==vals[3]
  rows.append({'accessor':i,'mesh':m['name'],'vertices':a['count']})
assert used and any(x!=y for x,y in zip(b,new))
assert all(x==y or i in allowed for i,(x,y) in enumerate(zip(b,new)))
assert new[:start]==b[:start]
OUT.mkdir();lod=OUT/'dunkleosteus.lod1.glb';lod.write_bytes(new)
shutil.copy2(OLD/'dunkleosteus.glb',OUT/'dunkleosteus.glb')
report={'sourceLOD':sha(OLD/'dunkleosteus.lod1.glb'),'newLOD':sha(lod),'full':sha(OUT/'dunkleosteus.glb'),
 'bytes':len(new),'changedOnly':'RGB components of referenced normalized-u16 COLOR_0 accessors; alpha and every other byte identical',
 'formula':'IEC sRGB EOTF: c/12.92 if c<=0.04045; ((c+0.055)/1.055)^2.4 otherwise; round to u16',
 'accessors':rows,'status':'Actual paired render review pending; no fresh geometry audit claimed'}
(OUT/'linear-color-proof.json').write_text(json.dumps(report,indent=2)+'\n')
manifest=json.loads((OLD/'export-evidence.json').read_text())
for m in manifest['models']:
 p=OUT/Path(m['path']).name;m.update(path=str(p),sha256=sha(p),bytes=p.stat().st_size)
manifest['status']='Color-only05 candidate; visual acceptance pending'
(OUT/'export-evidence.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(report))
