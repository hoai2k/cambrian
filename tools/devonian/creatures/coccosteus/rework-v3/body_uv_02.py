"""Continuous UV strips for the frozen clay04 ring topology; no geometric edits.

The exterior and oral material have separate padded rectangles. Every ring quad
gets a finite rectangular footprint instead of a fragmented smart-project island.
The only circumferential seam is at the ventral midline. Pole UVs are per-face.
"""
import numpy as np
NA=128
EXTERIOR_RINGS=284
TAIL_POLE=NA*EXTERIOR_RINGS
ORAL_START=TAIL_POLE+1
THROAT_POLE=ORAL_START+NA*95
RECTANGLES=((.02,.26,.98,.98),(.02,.02,.98,.22))

def loop_uvs(vertex_count,faces,material_indices):
    assert vertex_count==48514 and len(faces)==48640, 'Unexpected accepted topology'
    expected={}
    def bridge(a,b,oral):
        for k in range(NA):
            kn=(k+1)%NA
            expected[frozenset((a+k,a+kn,b+kn,b+k))]=oral
    for j in range(EXTERIOR_RINGS-1): bridge(j*NA,(j+1)*NA,0)
    for k in range(NA): expected[frozenset(((EXTERIOR_RINGS-1)*NA+k,(EXTERIOR_RINGS-1)*NA+(k+1)%NA,TAIL_POLE))]=0
    bridge(0,ORAL_START,1)
    for j in range(94): bridge(ORAL_START+j*NA,ORAL_START+(j+1)*NA,1)
    for k in range(NA): expected[frozenset((ORAL_START+94*NA+k,ORAL_START+94*NA+(k+1)%NA,THROAT_POLE))]=1
    rows=[]
    for face,role in zip(faces,material_indices):
        assert expected.pop(frozenset(face))==role, 'Changed accepted face/role'
        pole=THROAT_POLE if role else TAIL_POLE
        def station(i):
            if i==pole:return 96 if role else 284
            if not role:return i//NA
            return 0 if i<NA else 1+(i-ORAL_START)//NA
        def angular(i):
            k=(i if i<TAIL_POLE else i-ORAL_START)%NA
            return (k-96)%NA
        angles=[angular(i)for i in face if i!=pole]
        if max(angles)-min(angles)>NA/2: angles=[x+NA if x<NA/2 else x for x in angles]
        lookup={i:a for i,a in zip([i for i in face if i!=pole],angles)}
        for i in face:
            a=sum(angles)/len(angles) if i==pole else lookup[i]
            v=.02+.20*station(i)/96 if role else .26+.72*station(i)/284
            rows.append((.02+.96*a/NA,v))
    assert not expected, 'Missing accepted faces'
    return np.asarray(rows,dtype=np.float32)

def assign(ob):
    me=ob.data
    uv=loop_uvs(len(me.vertices),[tuple(p.vertices)for p in me.polygons],[p.material_index for p in me.polygons])
    me.uv_layers.active.data.foreach_set('uv',uv.ravel());me.update()
    return {'method':'Two continuous ring strips; separate exterior/oral rectangles; ventral seam',
            'rectangles':RECTANGLES,'loops':len(uv),'uvBounds':[uv.min(0).tolist(),uv.max(0).tolist()]}

def check_coverage(image,channel):
    """All texels supporting the strips plus a one-pixel bilinear border must be baked.

    These bounds follow the accepted material, not a post-bake clamp or fill.
    The existing bake margin fills the tiny unused half-cells of each pole fan.
    """
    w,h=image.size;pixels=np.empty(w*h*4,np.float32);image.pixels.foreach_get(pixels)
    pixels=pixels.reshape(h,w,4);regions=[]
    for ri,(u0,v0,u1,v1) in enumerate(RECTANGLES):
        x0=max(0,int(np.floor(u0*w-.5))-1);x1=min(w,int(np.ceil(u1*w-.5))+3)
        y0=max(0,int(np.floor(v0*h-.5))-1);y1=min(h,int(np.ceil(v1*h-.5))+3)
        field=pixels[y0:y1,x0:x1,:3];assert np.isfinite(field).all()
        lo,hi=float(field.min()),float(field.max())
        if channel=='roughness':
            assert lo>=.30 and hi<=.85, 'Uncovered/invalid roughness strip '+str((lo,hi))
            if ri==0: assert hi-lo>.02, 'Authored exterior roughness variation disappeared'
        elif channel=='albedo': assert lo>.002 and hi<.75, 'Uncovered/invalid albedo strip '+str((lo,hi))
        regions.append({'pixelBounds':[x0,y0,x1,y1],'samples':int(field.size),'min':lo,'max':hi})
    return {'channel':channel,'method':'Every rectangle texel plus bilinear border; no pixel repair', 'regions':regions}
