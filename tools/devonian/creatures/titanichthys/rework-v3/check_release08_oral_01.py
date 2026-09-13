"""Unrounded actual-GLB lower-floor sections and a bounded Ability sweep.
This sampled gate is not a claim of continuous-time whole-mesh intersection proof.
"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3';BASE=LOCAL/'candidate-07';SRC=LOCAL/'release-candidate08';OUT=SRC/'oral-sweep-01'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from gltf_evaluate_01 import read_glb
from oral_boundary_02 import boundary_indices,aperture_interval
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
candidate=json.loads((BASE/'candidate-report.json').read_text())
for name,h in candidate['source_sha256'].items():assert sha(HERE/name)==h
for f in candidate['files']:assert sha(f['path'])==f['sha256']
assert (BASE/'export-structural-review.json').exists(),'Run structural gate first'
HASHES={'titanichthys.glb':'e14f5ea5ac52e7d0b8c894ba31231099c341da85e6d0f463d4f1c22054122c62',
        'titanichthys.lod1.glb':'17837f5f66e08c7d34e9788faac38cd9b0578256cc2bade21b33483f3b7a5b98'}
for name,digest in HASHES.items():assert sha(SRC/name)==digest
assert not OUT.exists(),'Preserve existing sweep';OUT.mkdir()
PLANES=[-.68,-.60,-.52,-.451,-.40,-.30,-.18,-.003,.003,.18,.30,.40,.455,.52,.60,.68]
report={'script_sha256':sha(__file__),'base_candidate07_report_sha256':sha(BASE/'candidate-report.json'),'inputs':HASHES,'packaged_hashes':{'titanichthys.glb':'de056f4d2af273e5a2c279a2727158d285f20f97db2790729f4580b74ac89ef9','titanichthys.lod1.glb':'d99b2060c89ac1caa23ec9613c9de3b82c9604dc5669d54386d42e93f611f1a7'},
 'method':'Actual exported skin positions in float64; unrounded sagittal triangle/plane segments; strict interior segment crossings between underside and oral materials.',
 'planes_x':PLANES,'roi_height':[-.95,.10],'roi_depth':[1.70,2.90],
 'tolerances':{'parallel_determinant':1e-14,'strict_segment_parameter_margin':1e-10},
 'limitations':['16 sampled sagittal planes, not all 3D triangle pairs.','25 Ability phases plus Bind/Bite/Eat/Death controls, not continuous-time proof.',
                'Shared seam endpoints are excluded from strict crossings; final close oral visual review remains required.'],
 'ray_region':'Inside the exact actual posed oral-material boundary only; outer jaw and first lip collar remain recorded but are not interior occlusions.',
 'baseline':[],'records':[],'passed':False}
def save(): (OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n')
save()
def segments(body,x):
    p=np.asarray(body['positions'],dtype=np.float64);f=np.asarray(body['indices'],dtype=np.int32).reshape(-1,3)
    triangles=p[f];m=np.asarray(body['triangle_materials']);valid=(triangles[:,:,0].min(1)<x)&(triangles[:,:,0].max(1)>x)
    ids=np.flatnonzero(valid);tri=triangles[ids];rows=[]
    for a,b in ((0,1),(1,2),(2,0)):
        q,r=tri[:,a],tri[:,b];use=(q[:,0]-x)*(r[:,0]-x)<0
        ix=np.flatnonzero(use);v=q[ix]+(r[ix]-q[ix])*((x-q[ix,0])/(r[ix,0]-q[ix,0]))[:,None]
        rows.extend((int(ids[i]),point[1:])for i,point in zip(ix,v))
    by={}
    for i,point in rows:by.setdefault(i,[]).append(point)
    sets={'underside':[],'oral':[]}
    for i,pair in by.items():
        if len(pair)!=2:continue
        pair=np.asarray(pair);lo=pair.min(0);hi=pair.max(0)
        if hi[0]<-.95 or lo[0]>.10 or hi[1]<1.70 or lo[1]>2.90:continue
        role='oral'if 'oral accent'in m[i]else'underside'if 'underside'in m[i]else None
        if role:sets[role].append((i,pair))
    return sets
def crossings(sets):
    aa=sets['underside'];bb=sets['oral']
    if not aa or not bb:return []
    a=np.array([r[1]for r in aa]);b=np.array([r[1]for r in bb])
    p=a[:,0,None,:];q=b[None,:,0,:];r=(a[:,1]-a[:,0])[:,None,:];s=(b[:,1]-b[:,0])[None,:,:]
    def cross(u,v):return u[...,0]*v[...,1]-u[...,1]*v[...,0]
    den=cross(r,s);good=np.abs(den)>1e-14;delta=q-p
    t=np.divide(cross(delta,s),den,out=np.zeros_like(den),where=good)
    u=np.divide(cross(delta,r),den,out=np.zeros_like(den),where=good)
    hits=np.argwhere(good&(t>1e-10)&(t<1-1e-10)&(u>1e-10)&(u<1-1e-10));result=[]
    for i,j in hits:
        point=a[i,0]+t[i,j]*(a[i,1]-a[i,0])
        if -.95<point[0]<.10 and 1.70<point[1]<2.90:
            result.append({'underside_triangle':aa[i][0],'oral_triangle':bb[j][0],
                           'height_depth':point.tolist(),'parameters':[float(t[i,j]),float(u[i,j])]})
    return result
def svg(path,sets,x):
    def xy(p):return (40+(2.9-p[1])*400,40+(.1-p[0])*400)
    rows=['<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500"><rect width="600" height="500" fill="white"/>',
          f'<text x="15" y="22">Actual candidate07 section x={x}; yellow underside / pink oral</text>']
    for role,segments in sets.items():
        color='#e3be35'if role=='underside'else'#cf6697'
        for i,pair in segments:
            a,b=map(xy,pair);rows.append(f'<path d="M{a[0]:.6f},{a[1]:.6f} L{b[0]:.6f},{b[1]:.6f}" fill="none" stroke="{color}"/>')
    path.write_text('\n'.join(rows+['</svg>']))
def visible_roles(body,boundary):
    p=body['positions'];f=np.asarray(body['indices']).reshape(-1,3)
    tree=BVHTree.FromPolygons(p,f.tolist(),all_triangles=True);counts={};all_under=[];bad=[]
    for cx in (474,927):
        for py in range(535,581,5):
            for px in range(cx-40,cx+41,5):
                x=((px+.5)/1400-.5)*2.8;y=(.5-(py+.5)/1050)*2.1-.16
                hit,normal,index,distance=tree.ray_cast(Vector((x,y,8.)),Vector((0,0,-1)))
                mat=body['triangle_materials'][index]if hit is not None else'no hit'
                role='oral'if 'oral accent'in mat else'underside'if 'underside'in mat else'other'
                counts[role]=counts.get(role,0)+1
                if role=='underside':
                    lower,upper=aperture_interval(boundary,x)
                    record={'pixel':[px,py],'triangle':int(index),'point':list(hit),
                            'oral_boundary_heights':[lower,upper],'inside_oral_boundary':lower<y<upper}
                    all_under.append(record)
                    if record['inside_oral_boundary']:bad.append(record)
    return counts,all_under,bad

# Known failing immutable06 must trigger this independent, unrounded gate.
for name in ('titanichthys.glb','titanichthys.lod1.glb'):
    old=LOCAL/'candidate-06'/name;assert sha(old)==candidate['inputs'][name]
    _,evaluate=read_glb(old);bind,_=evaluate();bind=bind['Titanichthys_new_continuous_sculpt_export']
    ids=boundary_indices(bind['positions'],np.asarray(bind['indices']).reshape(-1,3),bind['triangle_materials'])
    meshes,_=evaluate('Ability',.5);body=meshes['Titanichthys_new_continuous_sculpt_export']
    baseline_counts,baseline_under,baseline_bad=visible_roles(body,np.asarray(body['positions'])[ids])
    rows=[{'x':x,'crossings':crossings(segments(body,x))}for x in (-.451,.455)]
    report['baseline'].append({'file':name,'sha256':sha(old),'sections':rows,'boundary_vertices':len(ids),'ray_counts':baseline_counts,'interior_underside_rays':baseline_bad});save()
    assert all(row['crossings']for row in rows)and baseline_bad,'Known oral inversion did not reproduce in unrounded and anatomical ray baselines'
poses=[(None,0.)]+[('Ability',float(p))for p in np.linspace(0.,1.,25)]+[('Bite',.35),('Eat',.5),('Death',1.)]
for name in ('titanichthys.glb','titanichthys.lod1.glb'):
    _,evaluate=read_glb(SRC/name);bind,_=evaluate();bind=bind['Titanichthys_new_continuous_sculpt_export']
    ids=boundary_indices(bind['positions'],np.asarray(bind['indices']).reshape(-1,3),bind['triangle_materials'])
    for clip,phase in poses:
        meshes,_=evaluate(clip,phase);body=meshes['Titanichthys_new_continuous_sculpt_export'];rows=[]
        for x in PLANES:
            sets=segments(body,x);hits=crossings(sets)
            rows.append({'x':x,'counts':{k:len(v)for k,v in sets.items()},'crossing_count':len(hits),'crossings':hits[:16]})
            if (clip,phase)==('Ability',.5) and x in (-.451,.455):
                svg(OUT/(name+'-'+str(x)+'-ability-section.svg'),sets,x)
        record={'asset':name,'sha256':sha(SRC/name),'clip':clip or'Bind','phase':phase,'sections':rows}
        if (clip,phase)==('Ability',.5):
            counts,all_under,bad=visible_roles(body,np.asarray(body['positions'])[ids])
            record['original_patch_ray_counts']=counts;record['underside_first_rays']=all_under
            record['oral_boundary_vertices']=len(ids);record['underside_inside_oral_boundary_rays']=bad
        report['records'].append(record);save()
        assert not any(r['crossing_count']for r in rows),'Unrounded oral/underside crossing: '+name+' '+str((clip,phase))
        if 'underside_inside_oral_boundary_rays'in record:assert not record['underside_inside_oral_boundary_rays'],'Actual underside occludes interior of maximum Ability oral boundary'
        print('TITANICHTHYS_ORAL_SWEEP_POSE_OK',name,clip or'Bind',phase,flush=True)
for f in candidate['files']:assert sha(f['path'])==f['sha256']
for name,digest in HASHES.items():assert sha(SRC/name)==digest
report['passed']=True;report['sampled_pose_count']=len(report['records']);save()
print('TITANICHTHYS_ORAL_SWEEP_PASS '+str(OUT/'result.json'),flush=True)
