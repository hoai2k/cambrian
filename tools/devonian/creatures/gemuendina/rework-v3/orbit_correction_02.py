"""Bounded orbital integration correction; continuous body vertices, no added rim mesh.

The candidate01 globe can pass volume while its oblique exposed black surface
looks like a bead. Establish a softly curved oblique orbital bed, preserve the
broad posterior brow, and align the iris-bearing corneal cap with that bed.
"""
from math import exp,sin,cos,atan
from sculpt_spec_02 import skin
TILT=atan(.36)
EYE_SCALE=(.94,.94,.94)
EYE_DEPTH=.044

def orbital_delta(point,region):
    if region!='dorsal':return 0.
    x,y,z=point;dx=abs(x)-.55;dy=y+1.30
    if abs(dx)>.36 or abs(dy)>.43:return 0.
    # No discrete pad/hoop: a smooth compact field edits the existing skin.
    r2=(dx/.185)**2+(dy/.235)**2
    blend=exp(-1.7*r2*r2)
    base=skin(.55,-1.30)-.004
    plane=base+.36*dy+.007*((dx/.13)**2+(dy/.155)**2)
    delta=max(-.035,min(.058,plane-z))*blend
    return delta

def eye_center(side):
    base=skin(.55,-1.30)-.004
    return (.55 if side=='L'else -.55,-1.30+sin(TILT)*EYE_DEPTH,base-cos(TILT)*EYE_DEPTH)

def eye_local(point):
    x,y,z=(point[i]*EYE_SCALE[i]for i in range(3))
    return (x,y*cos(TILT)-z*sin(TILT),y*sin(TILT)+z*cos(TILT))
