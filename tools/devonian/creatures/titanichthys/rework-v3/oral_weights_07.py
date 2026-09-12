"""Bounded physical-section weight field for the lower mandibular floor.
Coordinates are unskinned glTF space: X lateral, Y height, Z anterior depth.
One smooth spatial field transports both layers; no material/UV parameter key.
"""
from rig_actions_01 import smooth

SPEC={'jaw_transition_depth':[1.50,2.56], 'lateral_full_to_zero':[.72,1.02],
      'height_full_to_zero':[-.115,-.040], 'posterior_zero_to_full':[1.40,1.76],
      'floor_fraction_of_nonjaw':.66,'floor_recruitment_depth':[1.30,1.70],
      'protected':'Any existing skull influence; all non-body meshes; all zero-mask corners'}

def revised(position, old):
    x,height,depth=map(float,position)
    # Keep upper cranial/orbital and mixed palatal attachment exactly intact.
    if old.get('skull',0)>0:return dict(old),0.
    amount=(1-smooth(abs(x),.72,1.02))*(1-smooth(height,-.115,-.040))*smooth(depth,1.40,1.76)
    if amount==0:return dict(old),0.
    jaw=smooth(depth,1.50,2.56)
    floor=(1-jaw)*.66*smooth(depth,1.30,1.70)
    target={'jaw':jaw,'oral_floor':floor,'body':1-jaw-floor}
    weights={n:(1-amount)*old.get(n,0)+amount*target.get(n,0)for n in set(old)|set(target)}
    weights={n:w for n,w in weights.items()if w>0}
    # No top-four truncation: if a protected mixed region needs more bones,
    # stop for authorship instead of silently discarding an influence.
    assert len(weights)<=4,('Physical field requires additional influences',position,old,weights)
    total=sum(weights.values());assert abs(total-1)<1e-5 and min(weights.values())>=0
    return {n:w/total for n,w in weights.items()},amount
