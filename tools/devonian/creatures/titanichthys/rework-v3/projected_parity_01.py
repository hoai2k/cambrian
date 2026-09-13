"""Float64, non-iterative parity for actual triangles; asset-local audit utility.
Project each triangle perpendicular to the ray, then solve barycentric coordinates
and depth once from the original point. A spatial grid only culls triangle AABBs.
Boundary/tangent uncertainty returns -1; it never counts as definite containment.
No BVH float32 hits, shifted ray origins, caps, or intersection-count limit.
"""
import numpy as np

class ProjectedParity:
    def __init__(self, positions, faces, direction, cells=48):
        self.d = np.asarray(direction, dtype=np.float64)
        self.d /= np.linalg.norm(self.d)
        axis = np.eye(3)[np.argmin(np.abs(self.d))]
        u = np.cross(self.d, axis); u /= np.linalg.norm(u)
        v = np.cross(self.d, u)
        self.basis = np.array([u, v, self.d]).T
        self.tri = np.asarray(positions, dtype=np.float64)[np.asarray(faces)] @ self.basis
        self.lo = self.tri[:, :, :2].min(axis=(0, 1))
        self.hi = self.tri[:, :, :2].max(axis=(0, 1))
        self.cells = cells
        self.step = np.maximum(self.hi-self.lo, 1e-12)/cells
        self.e1 = self.tri[:, 1]-self.tri[:, 0]
        self.e2 = self.tri[:, 2]-self.tri[:, 0]
        self.det = self.e1[:, 0]*self.e2[:, 1]-self.e1[:, 1]*self.e2[:, 0]
        self.scale = max(float(np.ptp(self.tri[:, :, 2])), float(np.max(self.hi-self.lo)), 1.)
        self.depth_eps = self.scale*1e-10
        self.bary_eps = 1e-10
        self.bins = [[] for _ in range(cells*cells)]
        low = np.floor((self.tri[:, :, :2].min(1)-self.lo)/self.step-1e-8).astype(int)
        high = np.floor((self.tri[:, :, :2].max(1)-self.lo)/self.step+1e-8).astype(int)
        low = low.clip(0, cells-1); high = high.clip(0, cells-1)
        for i, (a,b) in enumerate(zip(low,high)):
            for x in range(a[0],b[0]+1):
                for y in range(a[1],b[1]+1): self.bins[x*cells+y].append(i)
        self.bins = [np.array(b,dtype=np.int32) for b in self.bins]

    def classify(self, points):
        p = np.atleast_2d(np.asarray(points,dtype=np.float64)) @ self.basis
        output = np.zeros(len(p),dtype=np.int8)
        valid = np.all((p[:,:2]>=self.lo)&(p[:,:2]<=self.hi),axis=1)
        xy = np.floor((p[:,:2]-self.lo)/self.step).astype(int).clip(0,self.cells-1)
        keys = xy[:,0]*self.cells+xy[:,1]
        for key in np.unique(keys[valid]):
            ids = np.flatnonzero(valid&(keys==key)); ts = self.bins[key]
            if not len(ts): continue
            # Tiny projected area is near-parallel; flag a point only if it lies
            # in that triangle's projected AABB, rather than invent a crossing.
            regular = np.abs(self.det[ts])>self.scale*self.scale*1e-14
            flat = ts[~regular]; ts = ts[regular]
            for start in range(0,len(ids),256):
                ix = ids[start:start+256]; q = p[ix,None,:]-self.tri[ts,0]
                a = (q[:,:,0]*self.e2[ts,1]-q[:,:,1]*self.e2[ts,0])/self.det[ts]
                b = (self.e1[ts,0]*q[:,:,1]-self.e1[ts,1]*q[:,:,0])/self.det[ts]
                w = 1-a-b
                t = a*self.e1[ts,2]+b*self.e2[ts,2]-q[:,:,2]
                possible = (a>=-self.bary_eps)&(b>=-self.bary_eps)&(w>=-self.bary_eps)
                boundary = possible & ((a<=self.bary_eps)|(b<=self.bary_eps)|(w<=self.bary_eps)) & (t>=-self.depth_eps)
                at_origin = possible & (np.abs(t)<=self.depth_eps)
                uncertain = np.any(boundary|at_origin,axis=1)
                hits = possible & ~boundary & (t>self.depth_eps)
                output[ix] = hits.sum(axis=1)%2
                if len(flat):
                    aabb_lo = self.tri[flat,:,:2].min(1)-self.depth_eps
                    aabb_hi = self.tri[flat,:,:2].max(1)+self.depth_eps
                    in_box = np.all((p[ix,None,:2]>=aabb_lo)&(p[ix,None,:2]<=aabb_hi),axis=2)
                    ahead = self.tri[flat,:,2].max(1)>=p[ix,None,2]-self.depth_eps
                    uncertain |= np.any(in_box&ahead,axis=1)
                output[ix[uncertain]] = -1
        return output
