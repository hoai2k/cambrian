"""Terminal snout articulation; accepted axial/body actions remain unchanged."""
import math
from rig_actions_01 import bones as old_bones, weights as old_weights, pose, CLIPS, LOOPS, normalize
from sculpt_spec_02 import smooth

def bones():
    b=old_bones()
    b['jaw']['head']=(0,-1.55,-.05); b['jaw']['tail']=(0,-1.25,-.05)
    b['throat']['head']=(0,-1.48,-.015); b['throat']['tail']=(0,-1.18,-.015)
    return b

ANCHORS=[
    {'name':'anchor_mouth','bone':'throat','point':(0,-2.115,.005),'role':'mouth'},
    {'name':'anchor_mouth_inside','bone':'throat','point':(0,-1.61,-.015),'role':'swallow'},
    {'name':'anchor_attack_primary','bone':'jaw','point':(0,-2.14,.005),'role':'attack'},
]

def build_weights(vertices,regions,oral):
    result=[]
    for p,region in zip(vertices,regions):
        x,y,z=p
        w=old_weights(p,oral=region=='oral')
        if region!='oral' and y < -1.04:
            # Strip old upward-mouth jaw field, then articulate the lower arc.
            # Upper snout/eyes follow the skull, so eye support cannot peel off.
            w={k:v for k,v in w.items() if k!='jaw'}
            w=normalize(w)
            across=math.exp(-(abs(x)/.49)**6)
            if region=='dorsal':
                d=y-(-1.75+.014*min(1.,(x/.35)**2))
                jaw=.96*(1-smooth(-.020,.020,d))*across
            else:
                jaw=.96*(1-smooth(-1.90,-1.43,y))*across
            w={k:v*(1-jaw)for k,v in w.items()};w['jaw']=jaw
            w=normalize(w)
        result.append(w)
    # Copy exact rim motion into adjacent oral rings. Deeper tissue transitions
    # toward throat continuously; lower jaw never pulls the upper lip downward.
    lips=[result[i] for i in oral['rim']]
    for k,row in enumerate(oral['oral_rings'][1:],1):
        t=k/25.; throat=smooth(.05,1.,t)
        for j,index in enumerate(row):
            w={n:a*(1-throat)for n,a in lips[j].items()}
            w['throat']=throat
            result[index]=normalize(w)
    result[-1]={'throat':1.}
    return result
