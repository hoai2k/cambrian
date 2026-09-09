"""Read-only numerical comparison at triangle interiors, not vertex agreement.
Baseline UV probes use actual LOD04 interpolated continuous body UV; structured05
probes use its source-surface parameterization (plan-report). Neither is art QA.
"""
import sys,json
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from lod_plan_05 import GLB,source_grids,PROBES,sha,ROOT,SOURCE,OUT
path=OUT/'plan-validation.json';assert not path.exists(),'Preserve numeric evidence'
full=GLB(SOURCE);old=GLB(ROOT/'candidate-04/coccosteus.lod1.glb');plan=json.loads((OUT/'plan-report.json').read_text());archive=np.load(OUT/'mesh-plan.npz',allow_pickle=False)
assert sha(plan['archive']['path'])==plan['archive']['sha256']
bi=next(i for i,m in enumerate(full.g['meshes'])if m['name'].startswith('Continuous'));mesh=full.g['meshes'][bi]
p=archive[f'm{bi}_positions'];f=archive[f'm{bi}_faces'];w=archive[f'm{bi}_weights'];j=archive[f'm{bi}_joints'];dense=np.zeros((len(p),20));np.put_along_axis(dense,j,w,axis=1)
def key(tri):return tuple(sorted(tuple(np.round(v,6))for v in tri))
lookup={key(p[t]):t for t in f};maximum_position=maximum_weight=0.;count=0
for grid in source_grids(full,mesh):
    for cell,triangles in grid.cells.items():
        if cell[0]>=8:continue
        for q,rows,mat in triangles:
            face=lookup[key(rows[:,:3])];actual=p[face];aw=dense[face]
            for row in rows:
                ix=np.argmin(np.linalg.norm(actual-row[:3],axis=1));maximum_position=max(maximum_position,float(np.max(abs(actual[ix]-row[:3]))));maximum_weight=max(maximum_weight,float(np.max(abs(aw[ix]-row[6:26]))))
            count+=1
assert count==4096 and maximum_position<3e-6 and maximum_weight<3e-6
posterior=-p[f,2].min(1)>.30;spans=np.ptp(p[f,2],axis=1)[posterior]
# Seven strict interior probes, linearly interpolated actual exported colors.
errors=[];positions=[];areas=[]
oldbody=next(m for m in old.g['meshes']if m['name'].startswith('Continuous'))
fullmats={m['name']:i for i,m in enumerate(full.g['materials'])}
for primitive in oldbody['primitives']:
    matname=old.g['materials'][primitive['material']]['name'].removesuffix(' LOD')
    if 'oral'in matname:continue
    a=primitive['attributes'];tri=old.array(primitive['indices']).astype(int).reshape(-1,3);v=old.array(a['POSITION'])[tri];uv=old.array(a['TEXCOORD_0'])[tri];rgb=old.array(a['COLOR_0'])[tri,:3]
    query=np.einsum('pk,tkd->tpd',PROBES,uv).reshape(-1,2);reference=full.pigment(fullmats[matname],query);predicted=np.einsum('pk,tkd->tpd',PROBES,rgb).reshape(-1,3)
    errors.extend(np.max(abs(reference-predicted),axis=1));positions.extend(np.einsum('pk,tkd->tpd',PROBES,v).reshape(-1,3))
    area=np.linalg.norm(np.cross(v[:,1]-v[:,0],v[:,2]-v[:,0]),axis=1)/2;areas.extend(np.repeat(area/len(PROBES),len(PROBES)))
errors=np.asarray(errors);positions=np.asarray(positions);areas=np.asarray(areas);baseline={}
for name,sel in [('posterior',-positions[:,2]>.30),('armor',-positions[:,2]<=.30)]:
    e=errors[sel];baseline[name]={'interiorProbes':len(e),'meanRGBmaxError':float(e.mean()),'areaWeightedMeanRGBmaxError':float(np.average(e,weights=areas[sel])),'p95RGBmaxError':float(np.quantile(e,.95)),'p99RGBmaxError':float(np.quantile(e,.99)),'maxRGBError':float(e.max())}
result={'phase':'Pure source-plan validation; no Blender/render/art acceptance','source_sha256':sha(Path(__file__)),
 'planReport_sha256':sha(OUT/'plan-report.json'),'baselineGlb_sha256':sha(ROOT/'candidate-04/coccosteus.lod1.glb'),
 'protectedMouth':{'exactDenseTriangles':count,'maxPositionError':maximum_position,'maxWeightError':maximum_weight},
 'structuredPosteriorAxialSpan':{'triangles':len(spans),'median':float(np.median(spans)),'p99':float(np.quantile(spans,.99)),'max':float(spans.max()),'abovePoint20':int((spans>.20).sum())},
 'baseline04InteriorUVPigment':baseline,'structured05InteriorSurfacePigment':plan['meshes'][bi]['audit'],
 'comparisonLimit':'Baseline probes follow its actual interpolated body UV; structured probes follow the original surface grid. Both probe triangle interiors. UV parameter distortion and material/normal/roughness differences still require actual matched renders.'}
path.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
