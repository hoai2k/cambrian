"""Read-only raw GLB material/skin/action validation for the authored Cladoselache exports."""
import json,struct,hashlib,math,os
from pathlib import Path
here=Path(__file__).resolve().parent;root=here.parents[3]
# CLADOSELACHE_CANDIDATE overrides which candidate directory is validated (e.g. a v3-candidate
# built by build_v3.py); default is unchanged so this still checks the shipped v2 candidate.
out=Path(os.environ.get('CLADOSELACHE_CANDIDATE',str(root.parent/'devonian-authoring/cladoselache/v2-candidate')));reports=[]
for suffix in ['', '.lod1']:
 path=out/('cladoselache'+suffix+'.glb');raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:]
 def data(ai):
  a=g['accessors'][ai];view=g['bufferViews'][a['bufferView']];fmt={5126:'f',5123:'H',5125:'I',5121:'B'}[a['componentType']];size=struct.calcsize(fmt);num={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];offset=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',num*size);values=[struct.unpack_from('<'+fmt*num,blob,offset+i*stride)for i in range(a['count'])]
  if a.get('normalized'):values=[tuple(v/(255 if a['componentType']==5121 else 65535)for v in row)for row in values]
  return values
 primitiveReports=[]
 for mesh in g['meshes']:
  for primitive in mesh['primitives']:
   c=data(primitive['attributes']['COLOR_0']);rgb=[x for row in c for x in row[:3]];weights=data(primitive['attributes']['WEIGHTS_0']);assert all(abs(sum(row)-1)<1e-5 for row in weights)
   mat=g['materials'][primitive['material']];pbr=mat.get('pbrMetallicRoughness',{});assert pbr.get('metallicFactor',1)==0
   if not suffix:assert max(abs(x-1)for x in rgb)<1e-6,'Full albedo multiplied by nonwhite vertex pigment'
   else:assert max(rgb)-min(rgb)>.0001 or 'eyes'in mat['name'] or 'accent'in mat['name'];assert not any(k.endswith('Texture')for k in pbr)
   primitiveReports.append({'material':mat['name'],'rgbRange':[min(rgb),max(rgb)],'baseColorTexture':bool(pbr.get('baseColorTexture')),'normalizedWeights':True})
 names=[];signatures=[]
 for a in g['animations']:
  motion=[];names.append(a['name'])
  for ch in a['channels']:
   target=ch['target'];assert target['path']!='scale';assert g['nodes'][target['node']].get('name')!='root';sam=a['samplers'][ch['sampler']];values=data(sam['output']);assert all(math.isfinite(x)for row in values for x in row);times=data(sam['input']);assert times[-1][0]>times[0][0];motion.append((target,values))
  signatures.append(hashlib.sha256(json.dumps(motion,sort_keys=True).encode()).hexdigest())
 assert len(signatures)==len(set(signatures))
 reports.append({'file':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'clips':names,'distinctMotions':len(signatures),'materials':primitiveReports,'rootStable':True,'scaleChannels':False})
assert len(reports[0]['clips'])==18;assert set(reports[1]['clips'])=={'Idle','Swim','Death'}
# Report written next to the checked candidate (not the tracked export-review-v2.json) whenever
# CLADOSELACHE_CANDIDATE points somewhere other than the shipped v2-candidate.
reviewPath=(here/'export-review-v2.json')if'CLADOSELACHE_CANDIDATE'not in os.environ else(out/'export-review.json')
reviewPath.write_text(json.dumps({'id':'cladoselache','fullColorPolicy':'White COLOR_0 multiplied by UV albedo; no duplicate pigment darkening.','lodColorPolicy':'Texture-free, atlas-sampled linear vertex pigment.','exports':reports},indent=2));print('PASS',[(r['file'],r['bytes'],r['distinctMotions'])for r in reports])
