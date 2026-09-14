"""Read-only raw GLB material/skin/action validation for the authored Acanthostega exports."""
import json,struct,hashlib,math,os
from pathlib import Path
here=Path(__file__).resolve().parent;root=here.parents[3]
# ACA_CANDIDATE_DIR points this check at a candidate build (e.g. a v2-candidate/) instead of the
# shipped v1-candidate/; ACA_EXPORT_REPORT redirects the written report so a candidate run never
# overwrites the tracked export-review-v1.json.
out=Path(os.environ['ACA_CANDIDATE_DIR'])if os.environ.get('ACA_CANDIDATE_DIR')else root.parent/'devonian-authoring/acanthostega/v1-candidate';reports=[]
for suffix in ['', '.lod1']:
 path=out/('acanthostega'+suffix+'.glb');raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:]
 def data(ai):
  a=g['accessors'][ai];view=g['bufferViews'][a['bufferView']];fmt={5126:'f',5123:'H',5125:'I',5121:'B'}[a['componentType']];size=struct.calcsize(fmt);num={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];offset=view.get('byteOffset',0)+a.get('byteOffset',0);stride=view.get('byteStride',num*size);values=[struct.unpack_from('<'+fmt*num,blob,offset+i*stride)for i in range(a['count'])]
  if a.get('normalized'):values=[tuple(v/(255 if a['componentType']==5121 else 65535)for v in row)for row in values]
  return values
 parent={c:i for i,node in enumerate(g['nodes'])for c in node.get('children',[])}
 anchors=[(i,node)for i,node in enumerate(g['nodes'])if node.get('name','').startswith('anchor_')];assert len(anchors)==3
 roles=set();anchorGraph=[]
 for i,node in anchors:
  ex=node['extras']['cambrianAnchor'];assert ex['version']==1;roles.add(ex['role']);assert g['nodes'][parent[i]]['name']==ex['parentBone'];anchorGraph.append((node['name'],ex['role'],ex['parentBone'],node['translation']))
 assert roles=={'mouth','swallow','attack'}
 joints=g['skins'][0]['joints'];skeleton=[(g['nodes'][i]['name'],g['nodes'][parent[i]].get('name')if i in parent else None)for i in joints]
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
 reports.append({'file':str(path),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'clips':names,'distinctMotions':len(signatures),'materials':primitiveReports,'rootStable':True,'scaleChannels':False,'anchors':sorted(anchorGraph),'skeleton':skeleton})
assert reports[0]['anchors']==reports[1]['anchors'];assert reports[0]['skeleton']==reports[1]['skeleton']
assert len(reports[0]['clips'])==18;assert set(reports[1]['clips'])=={'Idle','Swim','Death'}
report_path=Path(os.environ['ACA_EXPORT_REPORT'])if os.environ.get('ACA_EXPORT_REPORT')else here/'export-review-v1.json'
report_path.write_text(json.dumps({'id':'acanthostega','fullColorPolicy':'White COLOR_0 multiplied by UV albedo; no duplicate pigment darkening.','lodColorPolicy':'Texture-free, atlas-sampled linear vertex pigment.','exports':reports},indent=2));print('PASS',[(r['file'],r['bytes'],r['distinctMotions'])for r in reports])
