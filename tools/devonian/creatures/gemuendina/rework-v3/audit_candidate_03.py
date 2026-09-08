"""Audit actual GLB eyes, continuous body and attachments; Blender math/BVH only.

No .blend import or creature builder is executed. Independent actual exported
skin matrices and sampled animation channels drive the measurements.
Usage: blender --background --threads 2 --python THIS -- candidate-01|candidate-02
"""
import sys,json,struct,hashlib,runpy,math
from pathlib import Path
import numpy as np
from mathutils import Vector,Quaternion,Matrix
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/gemuendina/rework-v3'
args=sys.argv[sys.argv.index('--')+1:];name=args[0]
assert name in ('candidate-01','candidate-02')
SRC=LOCAL/name;OUT=LOCAL/('audit-'+name+'-03')
assert not OUT.exists(), 'Preserve existing audit evidence'
OUT.mkdir(parents=True)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
# Reuse the unchanged, reviewed topology/parity/confidence implementation.
shared=ROOT/'tools/devonian/eye-audit.py'
argv=sys.argv[:];sys.argv=['eye-audit.py','--',str(OUT/'no-snapshot-inputs')]
core=runpy.run_path(str(shared));sys.argv=argv
components=core['components'];close=core['close_envelope'];inside=core['inside'];wilson=core['wilson'];directions=core['DIRECTIONS']
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from rig_actions_01 import CLIPS,pose
from gltf_interpolation_03 import sample_channel
report={'candidate':name,'method':'Actual exported eye-polyhedron volume rejection; continuous body three-direction triangle parity; canonical Wilson/conservative bounds. Actual exported channels and skin inverse binds evaluated.',
        'source_sha256':sha(__file__),'interpolation_source_sha256':sha(HERE/'gltf_interpolation_03.py'),'shared_audit_sha256':sha(shared),'records':[],
        'limitations':['Selected action extrema, not every interpolated instant.','Attachment distances and mesh closure do not prove absence of all self-intersection.','Numerical containment does not approve orbital appearance.']}
def save(): (OUT/'audit.json').write_text(json.dumps(report,indent=2)+'\n')

def read_glb(path):
 raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);blob=raw[28+n:];cache={}
 def data(i):
  if i in cache:return cache[i]
  a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];size=struct.calcsize(fmt);off=v.get('byteOffset',0)+a.get('byteOffset',0)
  arr=np.array([struct.unpack_from('<'+fmt*count,blob,off+j*v.get('byteStride',count*size))for j in range(a['count'])])
  if a.get('normalized'):arr=arr/(255 if a['componentType']==5121 else 65535)
  cache[i]=arr;return arr
 nodes=g['nodes'];parents={c:i for i,node in enumerate(nodes)for c in node.get('children',[])}
 def evaluated(clip=None,phase=0.):
  transforms=[{k:list(node.get(k,default))for k,default in [('translation',[0,0,0]),('rotation',[0,0,0,1]),('scale',[1,1,1])]}for node in nodes]
  if clip:
   action=next(a for a in g['animations']if a['name']==clip)
   for ch in action['channels']:
    sampler=action['samplers'][ch['sampler']]
    times=data(sampler['input'])[:,0];values=data(sampler['output']);t=phase*CLIPS[clip]
    prop=ch['target']['path']
    value=sample_channel(times,values,t,sampler.get('interpolation','LINEAR'),prop)
    transforms[ch['target']['node']][prop]=value
  worlds={}
  def world(i):
   if i in worlds:return worlds[i]
   node=nodes[i];tr=transforms[i];q=tr['rotation']
   m=np.array(node['matrix']).reshape(4,4).T if 'matrix'in node else np.array(Matrix.LocRotScale(Vector(tr['translation']),Quaternion((q[3],*q[:3])),Vector(tr['scale'])))
   worlds[i]=world(parents[i])@m if i in parents else m;return worlds[i]
  meshes={}
  for ni,node in enumerate(nodes):
   if 'mesh'not in node:continue
   positions=[];indices=[];materials=[]
   for prim in g['meshes'][node['mesh']]['primitives']:
    attrs=prim['attributes'];p=data(attrs['POSITION']);p4=np.column_stack((p,np.ones(len(p))));off=len(positions)
    if 'skin'in node:
     skin=g['skins'][node['skin']];inverse=data(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
     joints=data(attrs['JOINTS_0']).astype(int);weights=data(attrs['WEIGHTS_0']);result=np.zeros((len(p),4))
     for k,bone in enumerate(skin['joints']):
      amount=np.where(joints==k,weights,0).sum(1);mask=amount>0
      if np.any(mask):result[mask]+=(p4[mask]@(world(bone)@inverse[k]).T)*amount[mask,None]
    else:result=p4@world(ni).T
    assert np.isfinite(result).all();positions.extend(result[:,:3].tolist());indices.extend((data(prim['indices']).ravel().astype(int)+off).tolist());materials.append(g['materials'][prim['material']]['name'])
   meshes[node['name']]={'name':node['name'],'positions':positions,'indices':indices,'material':' + '.join(materials)}
  anchors={node['name']:world(i)[:3,3].tolist()for i,node in enumerate(nodes)if node.get('name','').startswith('anchor_')}
  return meshes,anchors
 return g,evaluated

def phases_for(clip):
 count=round(CLIPS[clip]*30);states=[pose(clip,f/count)for f in range(count+1)]
 # Authored whole-pose peak plus maximum oral articulation and its recovery.
 magnitude=[sum(v*v for n,b in p.items()if n!='root'for prop in b.values()for v in prop)for p in states]
 jaw=[p['jaw']['rotation'][0]for p in states]
 frames={int(np.argmax(magnitude)),int(np.argmax(jaw)),count if clip=='Death'else round(count*.75)}
 if clip=='Swim':frames.update((round(count*.25),round(count*.5)))
 return sorted(f/count for f in frames)

for suffix in ('','.lod1'):
 path=SRC/('gemuendina'+suffix+'.glb');g,evaluate=read_glb(path);asset_sha=sha(path)
 original=json.loads((SRC/'candidate-report.json').read_text());assert asset_sha==next(f['sha256']for f in original['files']if f['path']==str(path))
 samples=[('Bind',0.)]
 if name=='candidate-02':
  for action in g['animations']:samples.extend((action['name'],phase)for phase in phases_for(action['name']))
 for clip,phase in samples:
  meshes,anchors=evaluate(None if clip=='Bind'else clip,phase);body=components(meshes['gemuendina_body_export'])
  assert len(body)==1, 'Body fragmented'
  hp,hf,topology=close(body[0]);assert topology['valid'] and not topology['cappedBoundaryLoops'], 'Continuous body must remain closed without audit caps'
  tree=BVHTree.FromPolygons(hp,hf,all_triangles=True)
  record={'asset':str(path),'asset_sha256':asset_sha,'clip':clip,'phase':phase,'topology':topology,'eyes':[]}
  for side in ('L','R'):
   eye=components(meshes['gemuendina_eye_'+side+'_export']);assert len(eye)==1
   ep,ef,et=close(eye[0]);assert et['valid'] and not et['cappedBoundaryLoops']
   eye_tree=BVHTree.FromPolygons(ep,ef,all_triangles=True);arr=np.array(ep);lo=arr.min(0);hi=arr.max(0)
   rng=np.random.default_rng(271902+(side=='R'));nbox=120000 if clip=='Bind'else 24000
   candidates=rng.uniform(lo,hi,(nbox,3));accepted=[p for p in candidates if inside(eye_tree,p,directions[0])]
   votes=np.array([[inside(tree,p,d)for d in directions]for p in accepted],dtype=np.uint8).sum(1);n=len(votes)
   lower=wilson(int((votes==3).sum()),n)[0];upper=wilson(int((votes>0).sum()),n)[1]
   er={'side':side,'samples':n,'inside_percent':100*float((votes>=2).mean()),'conservative95_percent':[lower,upper],
       'ray_disagreements':int(((votes>0)&(votes<3)).sum()),'minimum50':lower>=50,'target65':lower>=65}
   record['eyes'].append(er)
   if clip=='Bind':core['section_svg'](OUT/f'{"lod"if suffix else"full"}-{side}-section.svg',body[0],eye[0])
  # Each true denticle solid must continue to contact the same continuous lining.
  denticles=components(meshes['gemuendina_lower_oral_denticles_export']);contact=[]
  for dent in denticles:
   pp=np.array(dent['positions']);dist=[tree.find_nearest(Vector(p))[3]for p in pp]
   contact.append(min(dist))
  record['anchors']={n:{'world':p,'nearest_tissue_distance':tree.find_nearest(Vector(p))[3],
    'inside_body_tissue_votes':sum(inside(tree,p,d)for d in directions)}for n,p in anchors.items()}
  record['denticle_count']=len(denticles);record['maximum_denticle_nearest_contact']=max(contact)
  record['denticle_contact_tolerance']=.010;record['denticle_contacts_pass']=max(contact)<.010
  report['records'].append(record);save()
  print('GEMUENDINA_EYE_AUDIT_RECORD',suffix or 'full',clip,phase,[round(e['inside_percent'],2)for e in record['eyes']],flush=True)
  if name=='candidate-02':
   assert all(e['target65']for e in record['eyes']), 'Eye containment lacks target margin'
   assert record['denticle_contacts_pass'], 'Denticle lost oral attachment'
report['executed_pass']=True;report['measured_pose_count']=len(report['records']);save()
print('GEMUENDINA_ACTUAL_EYE_ATTACHMENT_AUDIT_03_OK',OUT)
