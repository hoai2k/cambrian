"""Validate raw Blender GLBs before meshopt compression (stdlib only)."""
import array,json,math,struct,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
NAMES={'Idle','Swim','Attack','Hit','Death','TurnLeft','TurnRight','Dive','Rise','Bite','Heavy','Guard','Parry','Dodge','Eat','Stagger','Ability','Moult'}
for name in ['odaraia','sidneyia','leanchoilia','isoxys']:
 for suffix in ['', '.lod1']:
  p=ROOT/'public/assets/creatures'/f'{name}{suffix}.glb';raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);base=28+n
  def data(ai):
   a=g['accessors'][ai];v=g['bufferViews'][a['bufferView']];sizes={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16};fm={5121:'B',5123:'H',5125:'I',5126:'f'};f=fm[a['componentType']];sz=struct.calcsize(f);ct=sizes[a['type']];stride=v.get('byteStride',ct*sz);off=base+v.get('byteOffset',0)+a.get('byteOffset',0);out=[struct.unpack_from('<'+f*ct,raw,off+i*stride)for i in range(a['count'])]
   if a.get('normalized') and f!='f':denom=255 if f=='B' else 65535;out=[tuple(x/denom for x in row)for row in out]
   assert all(math.isfinite(x)for row in out for x in row),(p,ai,'nonfinite');return out
  anims={a['name']:a for a in g['animations']};assert set(anims)==NAMES|({'Crawl'}if name=='sidneyia' else set());assert len(g['skins'])==1
  assert all('uri'not in im for im in g.get('images',[])),'external texture';root=next(i for i,node in enumerate(g['nodes'])if node.get('name')=='root')
  for an in anims.values():
   for ch in an['channels']:
    samples=data(an['samplers'][ch['sampler']]['output']);path=ch['target']['path'];node=ch['target']['node']
    if path=='scale':assert max(abs(x-1)for row in samples for x in row)<1e-6,(p,an['name'],'animated scale')
    if node==root:
     expect=g['nodes'][root].get(path,(0,0,0,1)if path=='rotation'else (1,1,1)if path=='scale'else(0,0,0))
     assert max(abs(x-y)for row in samples for x,y in zip(row,expect))<1e-6,(p,'root motion')
    if an['name']!='Death':assert max(abs(x-y)for x,y in zip(samples[0],samples[-1]))<1e-5,(p,an['name'],'seam')
  triangles=0
  for mesh in g['meshes']:
   for pr in mesh['primitives']:
    attrs=pr['attributes'];assert {'POSITION','NORMAL','TEXCOORD_0','COLOR_0','JOINTS_0','WEIGHTS_0'}<=set(attrs)
    pos=data(attrs['POSITION']);weights=data(attrs['WEIGHTS_0']);assert max(abs(sum(row)-1)for row in weights)<1e-4,(p,'weights')
    colors=data(attrs['COLOR_0']);assert min(x for row in colors for x in row[:3])<.8,'white colors'
    triangles+=g['accessors'][pr['indices']]['count']//3
  assert any('baseColorTexture'in m.get('pbrMetallicRoughness',{})for m in g['materials']);assert all('normalTexture'in m for m in g['materials'])
  print(p.name,len(g['skins'][0]['joints']),'bones',len(anims),'clips',triangles,'triangles: PASS')
