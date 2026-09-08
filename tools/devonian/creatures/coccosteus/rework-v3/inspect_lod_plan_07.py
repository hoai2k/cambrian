"""Parameter-space reconstruction plots and exact mouth preservation, no Blender.
These show the actual piecewise-linear color field; they are not 3D art renders.
"""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from lod_plan_05 import GLB,ROOT,SOURCE,sha,source_grids
OUT=ROOT/'lod-plan-07';report=json.loads((OUT/'plan-report.json').read_text());assert sha(report['archive']['path'])==report['archive']['sha256']
a=np.load(OUT/'mesh-plan.npz',allow_pickle=False);full=GLB(SOURCE);bi=next(r['index']for r in report['meshes']if r['name'].startswith('Continuous'))
folder=OUT/'field-plots';assert not folder.exists();folder.mkdir()
f=a[f'm{bi}_faces'];p=a[f'm{bi}_positions'];uv=a[f'm{bi}_uv'];rgb=a[f'm{bi}_colors'];materials=a[f'm{bi}_materials'];w=a[f'm{bi}_weights'];j=a[f'm{bi}_joints'];dw=np.zeros((len(w),20));np.put_along_axis(dw,j,w,axis=1)
def key(tri):return tuple(sorted(tuple(np.round(v,6))for v in tri))
lookup={key(p[t]):t for t in f};maxpos=maxweight=0.;count=0
for grid in source_grids(full,full.g['meshes'][bi]):
 for cell,triangles in grid.cells.items():
  if cell[0]>=8:continue
  for q,rows,mat in triangles:
   face=lookup[key(rows[:,:3])]
   for row in rows:
    ix=np.argmin(np.linalg.norm(p[face]-row[:3],axis=1));maxpos=max(maxpos,float(np.max(abs(p[face][ix]-row[:3]))));maxweight=max(maxweight,float(np.max(abs(dw[face][ix]-row[6:26]))))
   count+=1
assert count==4096 and maxpos<3e-6 and maxweight<3e-6
exterior=uv[:,:,1].max(1)<.75;q=np.stack([(1-uv[exterior,:,1]-.26)/.72*284,(uv[exterior,:,0]-.02)/.96*128],axis=-1);col=rgb[exterior]
mat=int(materials[exterior][0]);plots=[]
for title,rlo,rhi in [('armor',0,170),('posterior',170,281)]:
 W,H=1100,440;klo,khi=19.2,64.;xx=rlo+(np.arange(W)+.5)/W*(rhi-rlo);yy=khi-(np.arange(H)+.5)/H*(khi-klo)
 rr,kk=np.meshgrid(xx,yy);targetuv=np.c_[.02+.96*kk.ravel()/128,1-(.26+.72*rr.ravel()/284)];reference=full.pigment(mat,targetuv).reshape(H,W,3)
 reconstruction=np.zeros_like(reference);covered=np.zeros((H,W),bool)
 def pixel(a):return np.c_[(a[:,0]-rlo)/(rhi-rlo)*W,(khi-a[:,1])/(khi-klo)*H]
 for tri,colors in zip(q,col):
  if tri[:,0].max()<rlo or tri[:,0].min()>rhi or tri[:,1].max()<klo or tri[:,1].min()>khi:continue
  t=pixel(tri);lo=np.maximum(np.floor(t.min(0)).astype(int),[0,0]);hi=np.minimum(np.ceil(t.max(0)).astype(int),[W-1,H-1])
  if(hi<lo).any():continue
  dx,dy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5);query=np.c_[dx.ravel(),dy.ravel()]
  matrix=np.c_[t[1]-t[0],t[2]-t[0]]
  if abs(np.linalg.det(matrix))<1e-10:continue
  ab=(query-t[0])@np.linalg.inv(matrix).T;bary=np.c_[1-ab.sum(1),ab];mask=bary.min(1)>=-1e-6
  x=query[mask,0].astype(int);y=query[mask,1].astype(int);reconstruction[y,x]=bary[mask]@colors;covered[y,x]=True
 assert covered.all(),(title,int((~covered).sum()))
 for label,field in [('accepted-texture',reference),('new-linear-LOD',reconstruction)]:
  display=np.where(field<=.0031308,field*12.92,1.055*np.maximum(field,0)**(1/2.4)-.055)
  path=folder/(title+'-'+label+'.png');Image.fromarray(np.rint(display*255).astype(np.uint8)).save(path);plots.append({'path':str(path),'sha256':sha(path)})
validation={'phase':'Pure parameter-space field reconstruction; actual matched3D art still pending','source_sha256':sha(Path(__file__)),
 'plan_report_sha256':sha(OUT/'plan-report.json'),'protectedMouth':{'exactDenseTriangles':count,'maxPositionError':maxpos,'maxWeightError':maxweight},'plots':plots}
(OUT/'plan-validation.json').write_text(json.dumps(validation,indent=2)+'\n');print(json.dumps(validation,indent=2))
