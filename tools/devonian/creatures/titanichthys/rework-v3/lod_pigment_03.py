"""Post-decimation pigment assignment; never interpolate albedo in the decimator.

Body: preserve the existing dense filtered field on each palette region's source
surface, using a convex combination of a closest source triangle's corners.
Fins/eyes: caller resamples exact accepted atlases using final corner UVs.
No colour clamping, extrapolation, geometry edits or filter redesign.
"""
import hashlib
from pathlib import Path
import numpy as np

DIAGNOSTIC_SHA='67623b7af8b8f786fafeea4446885788c4c0660387a7a7996fd80d472c931047'

def channel_summary(colors):
    a=np.asarray(colors)
    return {'count':len(a),'min':a.min(0).tolist(),'max':a.max(0).tolist(),
            'mean':a.mean(0).tolist(),'nonfinite':(~np.isfinite(a)).sum(0).tolist(),
            'negative':(a<0).sum(0).tolist(),'above_one':(a>1).sum(0).tolist()}

def closest_weights(point,triangle):
    """Closest point on a closed triangle as nonnegative barycentric weights.

    Test its plane interior and three closed edges. Edge parameters constrained
    to [0,1] describe the closed geometric segment; albedo is never clamped.
    This also handles zero-area source triangles via their remaining edges.
    """
    p=np.asarray(point,dtype=np.float64);t=np.asarray(triangle,dtype=np.float64)
    a,b,c=t;ab=b-a;ac=c-a;ap=p-a
    aa=float(ab@ab);bb=float(ab@ac);cc=float(ac@ac)
    determinant=aa*cc-bb*bb;candidates=[]
    if determinant>np.finfo(float).eps*max(aa*cc,1e-300)*16:
        u=(cc*float(ab@ap)-bb*float(ac@ap))/determinant
        v=(aa*float(ac@ap)-bb*float(ab@ap))/determinant
        w=np.array([1-u-v,u,v])
        if np.min(w)>=0:candidates.append(w)
    for i,j in ((0,1),(1,2),(2,0)):
        edge=t[j]-t[i];den=float(edge@edge)
        f=min(1.,max(0.,float((p-t[i])@edge)/den))if den>0 else 0.
        w=np.zeros(3);w[i]=1-f;w[j]=f;candidates.append(w)
    w=min(candidates,key=lambda q:float(np.sum((q@t-p)**2)))
    if not np.isfinite(w).all()or np.min(w)<0 or abs(float(w.sum())-1)>1e-12:
        raise RuntimeError('Invalid convex source triangle coefficients')
    return w

def write_colors(ob,colors):
    import bpy
    a=np.asarray(colors,dtype=np.float32)
    if a.shape!=(len(ob.data.loops),4):raise RuntimeError('Corner colour layout mismatch')
    old=ob.data.color_attributes.get('Color')
    if old:ob.data.color_attributes.remove(old)
    attr=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    attr.data.foreach_set('color',a.ravel());ob.data.color_attributes.active_color=attr
    ob.data.color_attributes.render_color_index=list(ob.data.color_attributes).index(attr)
    ob.data.update();ob.update_tag(refresh={'DATA'});bpy.context.view_layer.update()

class FilteredSurface:
    def __init__(self,source,colors):
        from mathutils.bvhtree import BVHTree
        mesh=source.data;mesh.calc_loop_triangles()
        self.colors=np.asarray(colors,dtype=np.float64).copy()
        if self.colors.shape!=(len(mesh.loops),4)or not np.isfinite(self.colors).all()or self.colors.min()<0 or self.colors.max()>1:
            raise RuntimeError('Invalid preserved dense field '+str(channel_summary(self.colors)))
        self.vertices=np.array([v.co[:]for v in mesh.vertices],dtype=np.float64)
        self.groups={};self.material_names=[m.name for m in mesh.materials]
        for mi,name in enumerate(self.material_names):
            triangles=[t for t in mesh.loop_triangles if t.material_index==mi]
            if not triangles:raise RuntimeError('Missing source material surface '+name)
            vertex_ids=np.array([t.vertices[:]for t in triangles],dtype=int)
            loop_ids=np.array([t.loops[:]for t in triangles],dtype=int)
            values=self.colors[loop_ids]
            tree=BVHTree.FromPolygons(self.vertices.tolist(),vertex_ids.tolist(),all_triangles=True)
            self.groups[mi]=(tree,vertex_ids,values)

    def sample(self,ob):
        if [m.name for m in ob.data.materials]!=self.material_names:
            raise RuntimeError('LOD/source palette surface mismatch')
        colors=np.ones((len(ob.data.loops),4),dtype=np.float64);records={};cache={}
        for mi,name in enumerate(self.material_names):
            tree,vertex_ids,values=self.groups[mi];distances=[];weights=[];ids=[]
            for poly in ob.data.polygons:
                if poly.material_index!=mi:continue
                for li in poly.loop_indices:
                    vi=ob.data.loops[li].vertex_index;key=(mi,vi)
                    if key not in cache:
                        point=np.array(ob.data.vertices[vi].co[:],dtype=np.float64)
                        location,normal,index,distance=tree.find_nearest(tuple(point))
                        if index is None:raise RuntimeError('No same-role source surface '+name)
                        triangle=self.vertices[vertex_ids[index]];w=closest_weights(point,triangle)
                        rgb=w@values[index,:,:3]
                        # Convexity must hold both locally and across the role.
                        if np.any(rgb<values[index,:,:3].min(0)-1e-12)or np.any(rgb>values[index,:,:3].max(0)+1e-12):
                            raise RuntimeError('Nonconvex source pigment '+name)
                        actual_distance=float(np.linalg.norm(w@triangle-point))
                        if abs(actual_distance-float(distance))>2e-5:
                            raise RuntimeError('Closest triangle/BVH distance mismatch '+name+' vertex '+str(vi)+' computed '+str(actual_distance)+' BVH '+str(distance))
                        cache[key]=(rgb,actual_distance,w)
                    rgb,distance,w=cache[key];colors[li,:3]=rgb
                    ids.append(li);distances.append(distance);weights.append(w)
            if not ids:raise RuntimeError('LOD lost material surface '+name)
            source_min=values[:,:,:3].min((0,1));source_max=values[:,:,:3].max((0,1));target=colors[ids,:3]
            if np.any(target.min(0)<source_min-1e-12)or np.any(target.max(0)>source_max+1e-12):
                raise RuntimeError('Pigment escaped source role range '+name)
            records[name]={'loops':len(ids),'source_triangles':len(vertex_ids),
                'source_rgb_min':source_min.tolist(),'source_rgb_max':source_max.tolist(),
                'target_rgb_min':target.min(0).tolist(),'target_rgb_max':target.max(0).tolist(),
                'projection_distance_max':float(np.max(distances)),
                'projection_distance_p50_p95_p99':np.percentile(distances,[50,95,99]).tolist(),
                'barycentric_min':float(np.min(weights)),'barycentric_max':float(np.max(weights))}
        return colors.astype(np.float32),{'method':'Closest source triangle within exact material role; convex barycentric interpolation of preserved dense filtered linear RGB; alpha authored 1; no colour clamp',
            'material_regions':records,'cache_points':len(cache)}

def verify_body_decimation(ob,path):
    """Neutral attributes must leave the measured body LOD geometry/UV unchanged."""
    path=Path(path)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=DIAGNOSTIC_SHA:
        raise RuntimeError('Measured diagnostic reference changed')
    with np.load(path)as data:
        actual={'vertices':np.array([v.co[:]for v in ob.data.vertices]),
                'loop_vertices':np.array([l.vertex_index for l in ob.data.loops]),
                'uv':np.array([l.uv[:]for l in ob.data.uv_layers.active.data]),
                'material_ids':np.array([p.material_index for p in ob.data.polygons for li in p.loop_indices])}
        record={}
        for key,values in actual.items():
            expected=data[key]
            if values.shape!=expected.shape:raise RuntimeError('Neutral decimation changed '+key+' shape')
            error=float(np.max(np.abs(values-expected)))
            # Deterministic replay is required; no topology/UV/position tolerance.
            if error!=0:raise RuntimeError('Neutral decimation changed '+key+' max error '+str(error))
            record[key]={'shape':list(values.shape),'maximum_error':error}
        return {'diagnostic_sha256':DIAGNOSTIC_SHA,'exact_match':record}
