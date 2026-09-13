"""Read-only structured/mark-aligned LOD plan from the accepted actual full GLB.

No Blender and no geometric decimator. New samples interpolate the immutable
dense triangles with nonnegative barycentric coefficients. The full GLB is input
only. Fin station rows are structured; angular samples include original ray
centres/shoulders as well as geometric silhouette samples. Actual baked pigment,
not a recreated colour formula, supplies all output colours.
"""
import io,json,struct,hashlib,math,sys
from pathlib import Path
import numpy as np
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
SOURCE=ROOT/'candidate-04/coccosteus.glb'
OUT=ROOT/'lod-plan-05'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def bilinear(a,uv):
    h,w=a.shape[:2];x=np.clip(uv[:,0]*w-.5,0,w-1);y=np.clip(uv[:,1]*h-.5,0,h-1)
    ix=x.astype(int);iy=y.astype(int);jx=np.minimum(ix+1,w-1);jy=np.minimum(iy+1,h-1)
    fx=(x-ix)[:,None];fy=(y-iy)[:,None]
    return (a[iy,ix]*(1-fx)+a[iy,jx]*fx)*(1-fy)+(a[jy,ix]*(1-fx)+a[jy,jx]*fx)*fy

class GLB:
    def __init__(self,path):
        raw=Path(path).read_bytes();n=struct.unpack_from('<I',raw,12)[0]
        self.g=json.loads(raw[20:20+n]);self.blob=raw[28+n:];self.images={}
        skin=self.g['skins'][0];self.bones=[self.g['nodes'][i]['name']for i in skin['joints']]
        assert len(self.bones)==20
    def array(self,i):
        q=self.g['accessors'][i];v=self.g['bufferViews'][q['bufferView']]
        n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[q['type']]
        dt=np.dtype({5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[q['componentType']])
        a=np.ndarray((q['count'],n),dtype=dt,buffer=self.blob,offset=v.get('byteOffset',0)+q.get('byteOffset',0),strides=(v.get('byteStride',n*dt.itemsize),dt.itemsize)).astype(float)
        if q.get('normalized'):a/=255 if q['componentType']==5121 else 65535
        return a
    def pigment(self,material,uv):
        if material not in self.images:
            p=self.g['materials'][material]['pbrMetallicRoughness']
            assert p.get('baseColorFactor',[1,1,1,1])==[1,1,1,1]
            im=self.g['images'][self.g['textures'][p['baseColorTexture']['index']]['source']]
            v=self.g['bufferViews'][im['bufferView']]
            raw=np.asarray(Image.open(io.BytesIO(self.blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])))[...,:3].astype(float)/255
            self.images[material]=np.where(raw<=.04045,raw/12.92,((raw+.055)/1.055)**2.4)
        return bilinear(self.images[material],uv)
    def primitives(self,mesh):
        for p in mesh['primitives']:
            a=p['attributes'];pos=self.array(a['POSITION']);normal=self.array(a['NORMAL']);uv=self.array(a['TEXCOORD_0'])
            joints=self.array(a['JOINTS_0']).astype(int);weights=self.array(a['WEIGHTS_0']);dense=np.zeros((len(pos),20))
            np.put_along_axis(dense,joints,weights,axis=1)
            assert np.max(abs(self.array(a['COLOR_0'])-1))<1e-6
            yield np.column_stack([pos,normal,dense,uv]),self.array(p['indices']).astype(int).reshape(-1,3),p['material']

class Grid:
    def __init__(self,glb,name,rows,angles,triangles):
        self.glb=glb;self.name=name;self.rows=rows;self.angles=angles
        self.cells={};self.caps=[]
        for q,p,mat in triangles:
            if np.ptp(q[:,0])<1e-7:self.caps.append((q,p,mat));continue
            cell=(int(round(q[:,0].min())),int(math.floor(q[:,1].min()+1e-7))%angles)
            self.cells.setdefault(cell,[]).append((q,p,mat))
        assert len(self.cells)==rows*angles,(name,len(self.cells),rows*angles)
    def evaluate(self,queries):
        queries=np.asarray(queries,float);values=np.empty((len(queries),28));materials=np.empty(len(queries),int)
        cells={}
        for i,(r,k)in enumerate(queries):
            cell=(min(self.rows-1,int(math.floor(r+1e-8))),int(math.floor(k+1e-8))%self.angles)
            cells.setdefault(cell,[]).append(i)
        for cell,ids in cells.items():
            q=queries[ids].copy();q[:,1]%=self.angles
            if cell[1]==self.angles-1:q[q[:,1]<.5,1]+=self.angles
            pending=np.ones(len(ids),bool)
            for cq,cp,mat in self.cells[cell]:
                d=np.column_stack([cq[1]-cq[0],cq[2]-cq[0]])
                ab=(q-cq[0])@np.linalg.inv(d).T;bary=np.column_stack([1-ab.sum(1),ab])
                valid=pending&(bary.min(1)>-2e-6)&(bary.max(1)<1+2e-6)
                # Boundary tolerance only: project roundoff onto the closed simplex.
                b=np.maximum(bary[valid],0);b/=b.sum(1)[:,None]
                indices=np.asarray(ids)[valid];values[indices]=b@cp;materials[indices]=mat;pending[valid]=False
            assert not pending.any(),(self.name,cell,q[pending][:3])
        normals=values[:,3:6];normals/=np.linalg.norm(normals,axis=1)[:,None]
        colors=np.empty((len(queries),3))
        for mat in np.unique(materials):
            mask=materials==mat;colors[mask]=self.glb.pigment(mat,values[mask,26:28])
        assert np.isfinite(values).all() and np.isfinite(colors).all() and colors.min()>=0 and colors.max()<.75
        return values,colors,materials

def source_grids(glb,mesh):
    name=mesh['name'];prims=list(glb.primitives(mesh));allp=np.concatenate([p for p,t,m in prims])
    if name.startswith('Continuous'):
        groups={'body-exterior':[], 'body-oral':[]}
        for p,t,mat in prims:
            uv=p[:,26:28];v=1-uv[:,1];oral=v<.24
            assert np.all(oral==oral[0]);r=np.rint((v-.02)/.20*96 if oral[0]else(v-.26)/.72*284)
            k=(uv[:,0]-.02)/.96*128
            q=np.column_stack([r,k]);q[:,1]=np.round(q[:,1]*2)/2
            for face in t:groups['body-oral'if oral[0]else'body-exterior'].append((q[face],p[face],mat))
        return [Grid(glb,n,96 if n.endswith('oral')else 284,128,v)for n,v in groups.items()]
    paired='pectoral'in name or'pelvic'in name
    A=64 if paired else 52;R=58 if paired else 99
    # glTF is Y-up: authoring coordinates (x,y,z) = (X,-Z,Y).
    station=np.abs(allp[:,0])if paired else-allp[:,2]
    unique=np.unique(np.round(station,6));assert len(unique)==(59 if paired else 100),(name,len(unique))
    profile=[]
    for value in unique:
        pp=allp[np.abs(station-value)<6e-7]
        transverse=-pp[:,2]if paired else pp[:,1]
        lo,hi=float(transverse.min()),float(transverse.max())
        if paired:
            tips=pp[(abs(transverse-lo)<1e-7)|(abs(transverse-hi)<1e-7)]
            base=float(np.median(tips[:,1]))
        else:base=0.
        profile.append((value,(hi+lo)/2,(hi-lo)/2,base))
    profile=np.asarray(profile);triangles=[]
    for p,t,mat in prims:
        st=np.abs(p[:,0])if paired else-p[:,2];rr=np.argmin(abs(st[:,None]-unique[None,:]),axis=1)
        pr=profile[rr];trans=-p[:,2]if paired else p[:,1]
        cosine=np.divide(trans-pr[:,1],pr[:,2],out=np.ones(len(p)),where=pr[:,2]>1e-8)
        a=np.arccos(np.clip(cosine,-1,1));positive=p[:,1]>=pr[:,3]-1e-7 if paired else p[:,0]>=-1e-7
        a=np.where(positive,a,2*np.pi-a);kk=np.rint(a/(2*np.pi)*A)%A
        q=np.column_stack([rr,kk])
        for face in t:
            qq=q[face].copy();pole=qq[:,0]==58 if paired else np.zeros(3,bool)
            angles=qq[~pole,1]
            if np.ptp(angles)>A/2:angles=np.where(angles<A/2,angles+A,angles)
            qq[~pole,1]=angles
            if pole.any():qq[pole,1]=angles.mean()
            triangles.append((qq,p[face],mat))
    grid=Grid(glb,name,R,A,triangles);grid.profile=profile;grid.paired=paired
    return[grid]

def fin_angles(grid,r):
    A=grid.angles;profile=grid.profile[int(r)]
    if r in (0,grid.rows-1,grid.rows):return list(np.arange(A,dtype=float))
    st,center,half,base=profile
    if half<1e-8:return[0.]
    if grid.paired:
        kind='pectoral'if'pectoral'in grid.name else'pelvic';origin=(.22,-.48)if kind=='pectoral'else(.12,.42)
        freq=28 if kind=='pectoral'else 24;delta=st-origin[0];vertical=origin[1]
    else:
        origin=(.36,.31)if'dorsal'in grid.name else(1.54,.22)
        freq=35 if'dorsal'in grid.name else 38;delta=st-origin[0];vertical=origin[1]
    angles=set(np.arange(0,A,4 if grid.paired else 2,dtype=float).tolist())
    for n in range(-freq,freq+1):
        for shoulder in [-.22,0,.22]:
            theta=(n*np.pi+shoulder-.026*np.sin(st*21))/freq
            if not(-np.pi/2+1e-5<theta<np.pi/2-1e-5):continue
            coord=vertical+delta*np.tan(theta);cosine=(coord-center)/half
            if abs(cosine)>=1:continue
            a=float(np.arccos(cosine)/(2*np.pi)*A)
            angles.update([a,A-a])
    # Merge only numerically coincident samples; preserve narrow ray shoulders.
    result=[]
    for a in sorted(angles):
        if not result or a-result[-1]>1e-4:result.append(a)
    return result

def layout(grid):
    A=grid.angles;R=grid.rows
    if grid.name.startswith('body'):
        rows=sorted(set(list(range(9))+list(range(10,R,2))+[R-1]))
    else:
        step=2 if 'pectoral'in grid.name else 3
        rows=sorted(set(list(range(0,R,step))+[0,1,R-1]+([]if grid.paired else[R])))
    rings={}
    for r in rows:
        if grid.name.startswith('body'):
            angles=np.arange(A,dtype=float)if r<=8 or r==R-1 or r==112 else np.arange(0,A,2,dtype=float)
            if 8<r<=24:angles=np.unique(np.r_[angles,np.arange(28,37),np.arange(92,101)])
            rings[r]=list(angles)
        else:rings[r]=fin_angles(grid,r)
    faces=[]
    for a,b in zip(rows,rows[1:]):
        # Preserve the exact dense lip/commissure band triangles, not just samples.
        if grid.name.startswith('body')and b<=8:
            for k in range(A):
                for q,p,m in grid.cells[(a,k)]:faces.append(q.tolist())
            continue
        aa=rings[a]+[float(A)];bb=rings[b]+[float(A)];i=j=0
        while i<len(aa)-1 or j<len(bb)-1:
            an=aa[i+1]if i<len(aa)-1 else math.inf;bn=bb[j+1]if j<len(bb)-1 else math.inf
            if abs(an-bn)<1e-8:
                faces.extend([[(a,aa[i]),(a,an),(b,bn)],[(a,aa[i]),(b,bn),(b,bb[j])]]);i+=1;j+=1
            elif an<bn:faces.append([(a,aa[i]),(a,an),(b,bb[j])]);i+=1
            else:faces.append([(a,aa[i]),(b,bn),(b,bb[j])]);j+=1
    # Tail/throat/paired-fin pole fans and flat fin caps retain original triangles.
    if grid.name.startswith('body')or grid.paired:
        for k in range(A):
            for q,p,m in grid.cells[(R-1,k)]:faces.append(q.tolist())
    for q,p,m in grid.caps:faces.append(q.tolist())
    return np.asarray(faces,float)

def evaluate_faces(grid,q):
    # Flat caps have no 2-D parameter area; use their exact source payload.
    values=np.empty((len(q),3,28));colors=np.empty((len(q),3,3));mats=np.empty((len(q),3),int)
    cap=np.ptp(q[:,:,0],axis=1)<1e-8
    v,c,m=grid.evaluate(q[~cap].reshape(-1,2));values[~cap]=v.reshape(-1,3,28);colors[~cap]=c.reshape(-1,3,3);mats[~cap]=m.reshape(-1,3)
    for i in np.flatnonzero(cap):
        cq,cp,mat=next((a,b,m)for a,b,m in grid.caps if np.max(abs(a-q[i]))<1e-7)
        values[i]=cp;colors[i]=grid.glb.pigment(mat,cp[:,26:28]);mats[i]=mat
    return values,colors,mats,cap

PROBES=np.array([[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6],[.8,.1,.1],[.1,.8,.1],[.1,.1,.8]])
def diagnostic(grid,q,values,colors,cap):
    mask=~cap;qq=np.einsum('pk,tkd->tpd',PROBES,q[mask]);v,ref,m=grid.evaluate(qq.reshape(-1,2))
    predicted=np.einsum('pk,tkd->tpd',PROBES,colors[mask]).reshape(-1,3)
    positions=np.einsum('pk,tkd->tpd',PROBES,values[mask,:,:3]).reshape(-1,3)
    error=np.max(abs(ref-predicted),axis=1);geometry=np.linalg.norm(v[:,:3]-positions,axis=1)
    regions={'all':np.ones(len(error),bool)}
    if grid.name=='body-exterior':regions={'posterior':-v[:,2]>.30,'armor':-v[:,2]<=.30}
    return {name:{'interiorProbes':int(sel.sum()),'meanRGBmaxError':float(error[sel].mean()),'p95RGBmaxError':float(np.quantile(error[sel],.95)),
                  'p99RGBmaxError':float(np.quantile(error[sel],.99)),'maxRGBError':float(error[sel].max()),'maxSurfaceDeviation':float(geometry[sel].max())}
            for name,sel in regions.items()if sel.any()}

def mesh_plan(glb,mesh):
    name=mesh['name'];vertices=[];normals=[];weights=[];faces=[];uv=[];colors=[];materials=[];lookup={};audit={};protected=0
    if all('eyes'in glb.g['materials'][p['material']]['name']for p in mesh['primitives']):
        for p,t,mat in glb.primitives(mesh):
            mapping=[]
            for row in p:
                key=tuple(np.round(row[:3],7))
                if key not in lookup:lookup[key]=len(vertices);vertices.append(row[:3]);weights.append(row[6:26])
                mapping.append(lookup[key])
            faces.extend(np.asarray(mapping)[t])
            uv.extend(p[t,26:28]);normals.extend(p[t,3:6]);colors.extend(glb.pigment(mat,p[t,26:28].reshape(-1,2)).reshape(-1,3,3));materials.extend([mat]*len(t))
    else:
        for grid in source_grids(glb,mesh):
            q=layout(grid);v,c,m,cap=evaluate_faces(grid,q);audit[grid.name]=diagnostic(grid,q,v,c,cap)
            for ti,(qq,vv,cc,mm)in enumerate(zip(q,v,c,m)):
                face=[]
                for qi,p in zip(qq,vv):
                    row,a=qi;a=a%grid.angles
                    shared=grid.name
                    if grid.name.startswith('body')and row==0:shared='shared-lip'
                    if row==grid.rows and(grid.name.startswith('body')or grid.paired):a=-1
                    key=(shared,round(float(row),7),round(float(a),7))
                    if key not in lookup:
                        lookup[key]=len(vertices);vertices.append(p[:3]);weights.append(p[6:26])
                    else:
                        previous=lookup[key];assert np.max(abs(vertices[previous]-p[:3]))<3e-6,(name,key)
                        assert np.max(abs(weights[previous]-p[6:26]))<3e-6,(name,'weight seam',key)
                    face.append(lookup[key])
                nn=vv[:,3:6];cross=np.cross(vv[1,:3]-vv[0,:3],vv[2,:3]-vv[0,:3])
                assert np.linalg.norm(cross)>1e-13,(name,'degenerate',qq)
                if np.dot(cross,nn.mean(0))<0:face.reverse();vv=vv[::-1];cc=cc[::-1];mm=mm[::-1];nn=nn[::-1]
                faces.append(face);normals.append(nn);uv.append(vv[:,26:28]);colors.append(cc);materials.append(int(mm[0]))
                if grid.name.startswith('body')and qq[:,0].max()<=8:protected+=1
    vertices=np.asarray(vertices);weights=np.asarray(weights);faces=np.asarray(faces);colors=np.asarray(colors)
    # New interpolation remains convex. Use strongest four only if their dropped
    # mass is demonstrably negligible; otherwise stop, never silently renormalize.
    order=np.argsort(weights,axis=1)[:,::-1];kept=np.take_along_axis(weights,order[:,:4],1);dropped=1-kept.sum(1)
    assert dropped.max()<1e-5,(name,'more than four meaningful influences',dropped.max())
    kept/=kept.sum(1)[:,None];assert colors.min()>=0 and colors.max()<.75
    edges={}
    for face in faces:
        for a,b in zip(face,np.roll(face,-1)):
            key=(min(a,b),max(a,b));edges[key]=edges.get(key,0)+1
    assert all(n==2 for n in edges.values()),(name,'nonmanifold',sum(n!=2 for n in edges.values()))
    return {'name':name,'positions':vertices,'faces':faces,'normals':np.asarray(normals),'uv':np.asarray(uv),'colors':colors,
            'joints':order[:,:4],'weights':kept,'materials':np.asarray(materials),'audit':audit,'protectedDenseMouthTriangles':protected}

def main():
    assert not OUT.exists(),'Preserve old LOD plan';OUT.mkdir()
    for row in json.loads((HERE/'frozen-review-candidate04-hold.json').read_text())['inputs']:assert sha(row['path'])==row['sha256']
    glb=GLB(SOURCE);arrays={};records=[];fulltri=0
    for i,mesh in enumerate(glb.g['meshes']):
        plan=mesh_plan(glb,mesh);record={k:v for k,v in plan.items()if k in ['name','audit','protectedDenseMouthTriangles']}
        record.update(index=i,vertices=len(plan['positions']),triangles=len(plan['faces']))
        for key in ['positions','faces','normals','uv','colors','joints','weights','materials']:arrays[f'm{i}_{key}']=plan[key]
        records.append(record);fulltri+=sum(glb.g['accessors'][p['indices']]['count']//3 for p in mesh['primitives'])
        print('COCCOSTEUS_STRUCTURED_PLAN_MESH',record,flush=True)
    triangles=sum(r['triangles']for r in records);assert triangles/fulltri<.4,('LOD budget',triangles,fulltri)
    np.savez_compressed(OUT/'mesh-plan.npz',**arrays)
    report={'phase':'Source plan and interior diagnostic; no Blender/render approval','sourceGlb':{'path':str(SOURCE),'sha256':sha(SOURCE)},
            'script_sha256':sha(Path(__file__)),'bones':glb.bones,'materials':[m['name']for m in glb.g['materials']],
            'meshes':records,'triangles':triangles,'fullTriangles':fulltri,'ratio':triangles/fulltri,
            'archive':{'path':str(OUT/'mesh-plan.npz'),'sha256':sha(OUT/'mesh-plan.npz')}}
    (OUT/'plan-report.json').write_text(json.dumps(report,indent=2)+'\n');print('COCCOSTEUS_LOD_PLAN_05_COMPLETE',flush=True)
if __name__=='__main__':main()
