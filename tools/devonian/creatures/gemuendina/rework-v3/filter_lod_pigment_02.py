"""Surface-area low-pass for texture-free LOD; full UV maps remain untouched."""
import numpy as np
from mathutils.kdtree import KDTree

def filter_body(obj,corner_colors,regions):
    mesh=obj.data;count=len(mesh.vertices)
    positions=np.array([v.co[:]for v in mesh.vertices]);normals=np.array([v.normal[:]for v in mesh.vertices])
    color_sum=np.zeros((count,4));area=np.zeros(count)
    # Integrate the dense source before reducing it. Area weighting avoids the
    # concentrated oral topology biasing the average toward a tiny tissue patch.
    for poly in mesh.polygons:
        weight=max(1e-12,poly.area/len(poly.vertices))
        for li in poly.loop_indices:
            i=mesh.loops[li].vertex_index;color_sum[i]+=corner_colors[li]*weight;area[i]+=weight
    values=color_sum/np.maximum(area[:,None],1e-12)
    tree=KDTree(count)
    for i,p in enumerate(positions):tree.insert(p,i)
    tree.balance();out=values.copy();region=np.array(regions)
    for i,p in enumerate(positions):
        radius=.11 if regions[i]=='dorsal'else .080 if regions[i]=='ventral'else .024
        found=tree.find_range(p,radius);ids=np.array([j for co,j,d in found],dtype=int);dist=np.array([d for co,j,d in found])
        use=(region[ids]==region[i])&((normals[ids]@normals[i])>.65)
        ids=ids[use];dist=dist[use]
        if len(ids)>1:
            kernel=np.exp(-4*(dist/radius)**2)*area[ids]
            out[i]=(values[ids]*kernel[:,None]).sum(0)/kernel.sum()
    out[:,3]=1
    result=out[np.array([loop.vertex_index for loop in mesh.loops])].astype(np.float32)
    assert np.isfinite(result).all()
    return result,{'method':'Surface area weighted Gaussian low-pass of dense linear pigment before decimation',
                   'radii':{'dorsal':.11,'ventral':.080,'oral':.024},'same_region_only':True,'normal_dot_minimum':.65,
                   'dense_point_rgb_std_before':values[:,:3].std(0).tolist(),'dense_point_rgb_std_after':out[:,:3].std(0).tolist()}
