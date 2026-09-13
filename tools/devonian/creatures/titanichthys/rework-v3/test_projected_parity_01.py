"""Meaningful independent regression: original real ray + analytical cube/shell.
Run with bundled Python/numpy; no Blender or asset mutations.
"""
from pathlib import Path
import json
import numpy as np
from projected_parity_01 import ProjectedParity
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
P=np.array([[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],float)
F=np.array([[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]])
rng=np.random.default_rng(813);points=rng.uniform(-2,2,(10000,3));expected=np.all(np.abs(points)<1,axis=1)
for d in ([1,.371,.127],[-.237,1,.413],[.193,-.271,1]):
    for cells in (7,48):
        actual=ProjectedParity(P,F,d,cells).classify(points)
        assert not np.any(actual<0)
        assert np.array_equal(actual,expected)
        # Hollow shell distinguishes crossing parity from nearest-surface sign.
        hollow=ProjectedParity(np.concatenate([P,P*.4]),np.concatenate([F,F[:,::-1]+8]),d,cells).classify(points)
        assert np.array_equal(hollow,expected&~np.all(np.abs(points)<.4,axis=1))
# Shared-edge, coplanar and exact-surface rays remain uncertain, never an approval.
assert ProjectedParity(P,F,[1,0,0]).classify([[0,0,0],[1,.2,.3],[0,1,.3]]).tolist()==[-1,-1,-1]
fixture=ROOT.parent/'devonian-authoring/titanichthys/rework-v3/diagnostic-eye-ray06-01/actual-failing-ray.npz'
f=np.load(fixture)
for cells in (13,48):
    for direction in (f['direction'],-f['direction']):
        assert ProjectedParity(f['positions'],f['faces'],direction,cells).classify([f['point']]).tolist()==[0]
print(json.dumps({'analytical_random_rays':120000,'original_ray_forward_reverse_two_grids':'outside','boundary_cases':'uncertain','status':'PASS'}))
