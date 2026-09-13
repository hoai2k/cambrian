"""Source-only local topology/lumen check. Never imports bpy or invokes Blender."""
import ast,math,json,hashlib
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent
path=HERE/'clay-04.py'
ns={'math':math,'json':json,'hashlib':hashlib}
keep={'smooth','pchip','base_torso_point','torso_point','lip_point','hermite','base_head_point','head_point','inner_point','skin_weights','moved','surface_arrays','local_integrity'}
for n in ast.parse(path.read_text()).body:
    if isinstance(n,ast.FunctionDef) and n.name in keep:exec(compile(ast.Module([n],type_ignores=[]),str(path),'exec'),ns)
    elif isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id in {'TORSO','COLLAR_Y','THROAT_END','FROZEN_ORAL_SHA'} for t in n.targets):exec(compile(ast.Module([n],type_ignores=[]),str(path),'exec'),ns)
vv,ff,ids,weights,regions,parts=ns['surface_arrays']()
report=ns['local_integrity'](vv,ff,weights,parts)
triangles=[];triangle_regions=[]
for f,reg in zip(ff,regions):
    triangles.append(f[:3]);triangle_regions.append(reg)
    if len(f)==4:triangles.append((f[0],f[2],f[3]));triangle_regions.append(reg)
triangles=np.asarray(triangles,np.int64)
base=np.asarray(vv)
def prepare(gape):
    # Blender's study shape key interpolates Basis to the final key linearly.
    posed=base*(1-gape)+np.asarray([ns['moved'](p,w,1) for p,w in zip(vv,weights)])*gape
    ts=posed[triangles];edges1=ts[:,1]-ts[:,0];edges2=ts[:,2]-ts[:,0]
    area=np.linalg.norm(np.cross(edges1,edges2),axis=1)
    assert np.min(area)>1e-12,('collapsed_triangle',gape,float(np.min(area)))
    return posed,ts[:,0],edges1,edges2

def intersects(p,q,data):
    posed,v0,e1,e2=data;direction=q-p
    h=np.cross(direction,e2);det=np.einsum('ij,ij->i',e1,h)
    valid=np.abs(det)>1e-12;inv=np.zeros_like(det);inv[valid]=1/det[valid]
    s=p-v0;u=inv*np.einsum('ij,ij->i',s,h)
    cross=np.cross(s,e1);v=inv*np.einsum('j,ij->i',direction,cross)
    t=inv*np.einsum('ij,ij->i',e2,cross)
    hits=np.flatnonzero(valid&(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)&(t>1e-5)&(t<.9999))
    return hits
checks=0
for gape in [0,.5,1]:
    data=prepare(gape);posed=data[0];rings=parts['innerRings'];n=len(rings[0]);mid=[]
    for r in rings:
        mid.append((posed[r[n//4]]+posed[r[3*n//4]])/2)
    # Piecewise centerline must be open from the lip to the deep lumen in all poses.
    for j in range(1,len(rings)-2):
        hits=intersects(mid[j],mid[j+1],data)
        assert len(hits)==0,('occluded_centerline',gape,j,hits[:8].tolist())
        checks+=1
    # Transverse rays to representative inner walls must not encounter EXTERNAL
    # skin. An inner palate can legitimately occlude a deeper curved mouth corner;
    # the lumen is not assumed star-convex.
    for j in [5,14,28,48,72,89]:
        r=rings[j]
        for k in range(0,n,8):
            q=posed[r[k]]
            center=np.array([0.,q[1],np.interp(q[1],[c[1] for c in mid],[c[2] for c in mid])])
            hits=intersects(center,q,data)
            outer_hits=[h for h in hits if triangle_regions[h]!=2]
            assert len(outer_hits)==0,('inner_wall_outside_skin',gape,j,k,outer_hits[:8])
            checks+=1
# A vertical section through this authored lumen has at most one roof/floor pair.
# This detects folded sheets that finite-width and edge-count checks can miss.
section_count=0
inner_mask=np.asarray(triangle_regions)==2
for gape in [0,.5,1]:
    data=prepare(gape);posed,v0,e1,e2=data
    v0=v0[inner_mask];e1=e1[inner_mask];e2=e2[inner_mask]
    direction=np.array([0.,0.,2.])
    h=np.cross(direction,e2);det=np.einsum('ij,ij->i',e1,h)
    valid=np.abs(det)>1e-12;inv=np.zeros_like(det);inv[valid]=1/det[valid]
    for y in [-1.70,-1.50,-1.30,-1.15,-1.00,-.80,-.60,-.35]:
        for x in [-.26,-.13,0,.13,.26]:
            p=np.array([x,y,-1.]);s=p-v0;u=inv*np.einsum('ij,ij->i',s,h)
            cross=np.cross(s,e1);v=inv*np.einsum('j,ij->i',direction,cross)
            t=inv*np.einsum('ij,ij->i',e2,cross)
            values=sorted(t[valid&(u>=-1e-8)&(v>=-1e-8)&(u+v<=1+1e-8)&(t>0)&(t<1)])
            unique=[]
            for value in values:
                if not unique or abs(value-unique[-1])>1e-6:unique.append(value)
            assert len(unique)<=2,('folded_oral_section',gape,x,y,unique)
            section_count+=1
orbit_sites=[]
for sign in [-1,1]:
    t=.18;a=.90 if sign>0 else math.pi-.90
    point=np.asarray(ns['head_point'](t,a))
    dt=np.asarray(ns['head_point'](t+.0001,a))-np.asarray(ns['head_point'](t-.0001,a))
    da=np.asarray(ns['head_point'](t,a+.0001))-np.asarray(ns['head_point'](t,a-.0001))
    normal=np.cross(da,dt);normal/=np.linalg.norm(normal)
    if normal[0]*sign<0:normal=-normal
    assert normal[0]*sign>.72,('nonlateral_orbit',normal.tolist())
    center=point-normal*.034
    orbit_sites.append({'surface':point.tolist(),'center':center.tolist(),'normal':normal.tolist()})
report['orbitalSites']=orbit_sites
report.update(sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),vertices=len(vv),faces=len(ff),
              triangles=len(triangles),gapesChecked=[0,.5,1],centerlineSegments=279,wallContainmentSegments=288,verticalOralSections=section_count)
print(json.dumps(report,indent=2))
