"""Feature-connected texture-free LOD sampling from accepted full pigment/shape.
Reuses the frozen05 source-grid reader. Anatomical paths only place/associate
samples; colors remain positive footprint averages of the actual accepted atlas.
"""
import sys,json,math,random,ast
from pathlib import Path
import numpy as np
HERE=Path(__file__).resolve().parent;sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
import lod_plan_05 as old
ROOT=old.ROOT;OUT=ROOT/'lod-plan-07';AUDIT={};BASE_EVAL=old.Grid.evaluate
cfg=json.loads((HERE/'armour-layout-01.json').read_text())
# Execute only the existing pure curve function, never the bpy-bearing module.
tree=ast.parse((HERE/'materials-03.py').read_text());scope={'np':np}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='curve'],type_ignores=[]),'<accepted pure curve>','exec'),scope)
curve=scope['curve']

def merge(points,lo,hi):
    points=[(float(x),{str(key)})for x,key in points if lo+1e-5<x<hi-1e-5]+[(float(lo),{'boundary0'}),(float(hi),{'boundary1'})]
    result=[]
    for value,keys in sorted(points,key=lambda x:x[0]):
        if result and value-result[-1][0]<1e-4:result[-1][1].update(keys)
        else:result.append([value,keys])
    return result

def connect(a,b,aa,bb,reverse=False,max_shift=None):
    """Connect matching feature IDs before filling intervening regions.
    Baseline samples never override anatomical correspondences. Skip an anchor
    only at an actual feature intersection where its order reverses.
    """
    amap={key:i for i,(_,keys)in enumerate(aa)for key in keys if not key.startswith('base')}
    bmap={key:i for i,(_,keys)in enumerate(bb)for key in keys if not key.startswith('base')}
    common=sorted(set(amap)&set(bmap),key=lambda k:(amap[k],bmap[k],k));pairs=[]
    original_common=len(common)
    if max_shift is not None:common=[key for key in common if key.startswith('boundary')or abs(aa[amap[key]][0]-bb[bmap[key]][0])<=max_shift]
    for key in common:
        pair=(amap[key],bmap[key])
        if pairs and(pair[0]<=pairs[-1][0]or pair[1]<=pairs[-1][1]):continue
        pairs.append(pair)
    assert pairs[0]==(0,0)and pairs[-1]==(len(aa)-1,len(bb)-1)
    points=lambda station,value:(value,station)if reverse else(station,value)
    faces=[]
    for (ia,ib),(ja,jb)in zip(pairs,pairs[1:]):
        i,j=ia,ib
        while i<ja or j<jb:
            an=(aa[i+1][0]-aa[ia][0])/(aa[ja][0]-aa[ia][0])if i<ja else math.inf
            bn=(bb[j+1][0]-bb[ib][0])/(bb[jb][0]-bb[ib][0])if j<jb else math.inf
            if abs(an-bn)<1e-9:
                faces.extend([[points(a,aa[i][0]),points(a,aa[i+1][0]),points(b,bb[j+1][0])],[points(a,aa[i][0]),points(b,bb[j+1][0]),points(b,bb[j][0])]]);i+=1;j+=1
            elif an<bn:faces.append([points(a,aa[i][0]),points(a,aa[i+1][0]),points(b,bb[j][0])]);i+=1
            else:faces.append([points(a,aa[i][0]),points(b,bb[j+1][0]),points(b,bb[j][0])]);j+=1
    # Every retained feature correspondence is now an actual shared triangle edge.
    edges={frozenset((tuple(x),tuple(y)))for face in faces for x,y in zip(face,face[1:]+face[:1])}
    for i,j in pairs:assert frozenset((points(a,aa[i][0]),points(b,bb[j][0])))in edges
    return faces,max(0,len(pairs)-2),max(0,original_common-len(pairs))

def init_body(grid):
    if hasattr(grid,'row_y'):return
    q=np.c_[np.arange(grid.rows),np.full(grid.rows,64.)];v,_,_=BASE_EVAL(grid,q);grid.row_y=-v[:,2]
    grid.cut=int(np.flatnonzero((grid.row_y>.30)&(np.arange(grid.rows)%2==0))[0])
    grid.paths=[];grid.metric_paths=[]
    for head in [True,False]:
        scales=np.array([.95 if head else 1.,.48])
        for pi,record in enumerate(cfg['head'if head else'thorax']):
            path=np.asarray(curve(record['points']));physical=path*scales
            delta=np.gradient(physical,axis=0);delta/=np.linalg.norm(delta,axis=1)[:,None];normal=np.c_[-delta[:,1],delta[:,0]]
            grid.metric_paths.append((head,physical,record['width']))
            for shoulder in [-2.3,0,2.3]:
                shifted=(physical+normal*record['width']*shoulder)/scales
                r=shifted[:,0]*112 if head else np.interp(shifted[:,0],grid.row_y,np.arange(len(grid.row_y)))
                for side in [-1,1]:
                    k=64+side*32*shifted[:,1];points=np.c_[r,k]
                    signs=np.sign(np.diff(r));changes=[0]+[i+1 for i in range(len(signs)-1)if signs[i]*signs[i+1]<0]+[len(r)-1]
                    for branch,(a,b)in enumerate(zip(changes,changes[1:])):
                        pp=points[a:b+1]
                        if pp[-1,0]<pp[0,0]:pp=pp[::-1]
                        if np.ptp(pp[:,0])>1e-7:grid.paths.append((f'plate-{head}-{pi}-{shoulder}-{side}-{branch}',pp))
    grid.bars={}
    for side in [-1,1]:
        rng=random.Random(1817152+side*173);cy=.14;bars=[]
        while cy<2.18:
            top=rng.uniform(.19,.34);bottom=rng.uniform(.85,1.09);lean=rng.uniform(.042,.085);wid=rng.uniform(.014,.025)
            amplitude=rng.uniform(.72,.96);sx=cy+rng.uniform(.004,.043);sc=rng.uniform(1.08,1.29);dash=rng.uniform(.65,.90)
            bars.append((cy,top,bottom,lean,wid));cy+=rng.uniform(.089,.158)
        grid.bars[side]=bars

def body_ring(grid,r):
    A=grid.angles;values=[(k,'base'+str(k))for k in np.arange(0,A,1 if r<=8 or r==112 else 2)]
    if 8<r<=24:values.extend((k,'basecomm'+str(k))for k in list(range(28,37))+list(range(92,101)))
    if r>8:
        for key,p in grid.paths:
            if p[0,0]+1e-7<r<p[-1,0]-1e-7:values.append((np.interp(r,p[:,0],p[:,1]),key))
    return merge(values,0,A)

def bar_column(grid,k,end):
    S=abs(k-64)/32;side=1 if k<64 else-1
    values=[(r,'base'+str(r))for r in range(grid.cut,end+1,4)]
    for i,(cy,top,bottom,lean,wid)in enumerate(grid.bars[side]):
        if top-.07<S<bottom+.08:
            center=cy+lean*(S-top)/(bottom-top)+.006*np.sin(S*33+cy*17)
            thickness=wid*(.62+.25*np.sin(S*21+cy*5)+.13*np.sin(S*63+cy*11))
            for shoulder in [-1.45,0,1.45]:
                y=center+shoulder*thickness;r=np.interp(y,grid.row_y,np.arange(len(grid.row_y)))
                values.append((r,f'bar{side}-{i}-{shoulder}'))
    return merge(values,grid.cut,end)

def fin_ring(grid,r):
    A=grid.angles
    if r in (0,grid.rows-1,grid.rows):return merge([(k,'base'+str(k))for k in range(A)],0,A)
    st,center,half,base=grid.profile[int(r)]
    values=[(k,'base'+str(k))for k in np.arange(0,A,4 if grid.paired else 2)]
    if grid.paired:
        kind='pectoral'if'pectoral'in grid.name else'pelvic';origin=(.22,-.48)if kind=='pectoral'else(.12,.42);freq=28 if kind=='pectoral'else 24;delta=max(.018,st-origin[0])
    else:
        origin=(.36,.31)if'dorsal'in grid.name else(1.54,.22);freq=35 if'dorsal'in grid.name else 38;delta=st-origin[0]
    for n in range(-freq,freq+1):
        for shoulder in [-.30,0,.30]:
            theta=(n*np.pi+shoulder-.026*np.sin(st*21))/freq
            if not(-np.pi/2+1e-5<theta<np.pi/2-1e-5):continue
            coord=origin[1]+delta*np.tan(theta);cosine=(coord-center)/half
            if abs(cosine)>=1:continue
            angle=float(np.arccos(cosine)/(2*np.pi)*A)
            values.extend([(angle,f'ray-{n}-{shoulder}-0'),(A-angle,f'ray-{n}-{shoulder}-1')])
    return merge(values,0,A)

def layout(grid):
    A=grid.angles;R=grid.rows;faces=[];connected=skipped=0
    if grid.name=='body-exterior':
        init_body(grid);rows=sorted(set(list(range(9))+list(range(10,grid.cut+1,2))))
        rings={r:body_ring(grid,r)for r in rows}
        for a,b in zip(rows,rows[1:]):
            if b<=8:
                for k in range(A):faces.extend(q.tolist()for q,p,m in grid.cells[(a,k)])
            else:
                ff,n,s=connect(a,b,rings[a],rings[b]);faces+=ff;connected+=n;skipped+=s
        # Posterior strips run circumferentially so transverse bars are connected.
        end=R-2;columns={k:bar_column(grid,k,end)for k in range(0,A+1,2)}
        for a,b in zip(range(0,A,2),range(2,A+1,2)):
            ff,n,s=connect(a,b,columns[a],columns[b],True);faces+=ff;connected+=n;skipped+=s
        start=merge([(k,'base'+str(k))for k in range(0,A,2)],0,A);last=merge([(k,'base'+str(k))for k in range(A)],0,A)
        ff,n,s=connect(end,R-1,start,last);faces+=ff
    elif grid.name=='body-oral':return ORIGINAL_LAYOUT(grid)
    else:
        step=2 if'pectoral'in grid.name else 3;rows=sorted(set(list(range(0,R,step))+[0,1,R-1]+([]if grid.paired else[R])))
        rings={r:fin_ring(grid,r)for r in rows}
        for a,b in zip(rows,rows[1:]):
            ff,n,s=connect(a,b,rings[a],rings[b],max_shift=A/32);faces+=ff;connected+=n;skipped+=s
    if grid.name.startswith('body')or grid.paired:
        for k in range(A):faces.extend(q.tolist()for q,p,m in grid.cells[(R-1,k)])
    faces.extend(q.tolist()for q,p,m in grid.caps)
    AUDIT[grid.name]={'explicitFeatureEdges':connected,'mergedCrossingOrGeometricLimitAnchorsSkipped':skipped,'triangles':len(faces)}
    return np.asarray(faces,float)


def filtered_body(grid,queries,values,colors,materials):
    init_body(grid);queries=np.asarray(queries);sel=queries[:,0]<grid.cut
    if not sel.any():return colors
    q,inv=np.unique(np.round(queries[sel],7),axis=0,return_inverse=True);r=q[:,0];k=q[:,1]%128;head=r<=112
    x=np.where(head,r/112*.95,np.interp(r,np.arange(len(grid.row_y)),grid.row_y));s=abs(k-64)/32*.48
    distance=np.full(len(q),100.);tangent=np.tile([1.,0.],(len(q),1));width=np.full(len(q),.007)
    for ishead,path,w in grid.metric_paths:
        for a,b in zip(path,path[1:]):
            d=b-a;length=float(d@d);t=np.clip(((x-a[0])*d[0]+(s-a[1])*d[1])/length,0,1)
            dist=np.hypot(x-a[0]-t*d[0],s-a[1]-t*d[1]);mask=(head==ishead)&(dist<distance)
            distance[mask]=dist[mask];tangent[mask]=d/np.sqrt(length);width[mask]=w
    along=np.full(len(q),.013);across=np.where(distance<width*3,.22*width,.013)
    normal=np.c_[-tangent[:,1],tangent[:,0]];dr=np.where(head,.95/112,np.interp(r,np.arange(len(grid.row_y)),np.gradient(grid.row_y)))
    dk=np.where(k<64,-1.,1.)*.48/32
    nodes=np.linspace(-2,2,7);ww=np.exp(-nodes*nodes/2);ww/=ww.sum();result=np.zeros((len(q),3));uv=np.empty((len(q),2))
    # All49 weights positive, sum1. No sampling across oral/exterior rectangles.
    mat=int(materials[sel][0])
    for a,wa in zip(nodes,ww):
        for b,wb in zip(nodes,ww):
            offset=tangent*(a*along)[:,None]+normal*(b*across)[:,None]
            rr=np.clip(r+offset[:,0]/dr,0,grid.rows-1);kk=(k+offset[:,1]/dk)%128
            uv[:,0]=.02+.96*kk/128;uv[:,1]=1-(.26+.72*rr/284)
            result+=wa*wb*grid.glb.pigment(mat,uv)
    assert np.isfinite(result).all()and result.min()>=0 and result.max()<.75
    colors[sel]=result[inv];return colors

def evaluate(grid,queries):
    values,colors,materials=BASE_EVAL(grid,queries)
    if grid.name=='body-exterior':colors=filtered_body(grid,queries,values,colors,materials)
    return values,colors,materials

ORIGINAL_LAYOUT=old.layout
old.layout=layout;old.Grid.evaluate=evaluate

def main():
    assert not OUT.exists(),'Preserve earlier plan';OUT.mkdir()
    for row in json.loads((HERE/'frozen-lod05-fields-01.json').read_text())['inputs']:assert old.sha(row['path'])==row['sha256']
    evidence=ROOT/'diagnostic-lod05-fields-01/manifest.json';em=json.loads(evidence.read_text());assert em['complete']and len(em['renders'])==6
    for row in em['renders']:assert old.sha(row['path'])==row['sha256']
    glb=old.GLB(old.SOURCE);arrays={};records=[];fulltri=0
    for i,mesh in enumerate(glb.g['meshes']):
        plan=old.mesh_plan(glb,mesh);record={k:v for k,v in plan.items()if k in ['name','audit','protectedDenseMouthTriangles']};record.update(index=i,vertices=len(plan['positions']),triangles=len(plan['faces']))
        for key in ['positions','faces','normals','uv','colors','joints','weights','materials']:arrays[f'm{i}_{key}']=plan[key]
        
        for regions in plan['audit'].values():
            for metric in regions.values():assert metric['maxSurfaceDeviation']<.010,'Feature correspondence distorts shape'
        records.append(record);fulltri+=sum(glb.g['accessors'][p['indices']]['count']//3 for p in mesh['primitives']);print('COCCOSTEUS_FEATURE_PLAN_MESH',record,flush=True)
    assert sum(r['protectedDenseMouthTriangles']for r in records)==4096
    triangles=sum(r['triangles']for r in records);assert triangles/fulltri<.4,('LOD budget',triangles,fulltri)
    np.savez_compressed(OUT/'mesh-plan.npz',**arrays)
    report={'phase':'Source plan only; actual art gate pending','sourceGlb':{'path':str(old.SOURCE),'sha256':old.sha(old.SOURCE)},'script_sha256':old.sha(Path(__file__)),
      'bones':glb.bones,'materials':[m['name']for m in glb.g['materials']],'meshes':records,'triangles':triangles,'fullTriangles':fulltri,'ratio':triangles/fulltri,
      'featureTopology':AUDIT,'pigmentPolicy':'Positive49-tap physical footprint on armor; narrow cross-seam/long along-seam kernel. Actual unchanged atlas colors. Posterior bars/fins use exact samples with connected feature trajectories.',
      'diagnosticLimit':'Interior reference is the filtered source field for armor; macro feature continuity and original accepted appearance still require actual views.',
      'archive':{'path':str(OUT/'mesh-plan.npz'),'sha256':old.sha(OUT/'mesh-plan.npz')},'actualFieldEvidence_sha256':old.sha(evidence)}
    (OUT/'plan-report.json').write_text(json.dumps(report,indent=2)+'\n');print('COCCOSTEUS_LOD_PLAN_07_COMPLETE',flush=True)
if __name__=='__main__':main()
