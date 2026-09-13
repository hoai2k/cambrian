"""Exact anterior deformation from reviewed face study02; Blender math only."""
import math
from mathutils import Vector
from sculpt_spec_02 import smooth
def remove_old_orbit(x,y,z,region):
    if region != 'dorsal': return z
    # Undo the old raised horseshoe/socket field in actual continuous skin.
    # The posterior branchial relief and pigmentation remain untouched.
    from sculpt_spec_02 import profile, WIDTH
    rounding = math.sqrt(max(0,1-(abs(x)/max(1e-8,profile(y,WIDTH)))**2))
    qx=abs(x)-.55; qy=y+1.30
    radius=math.sqrt((qx/.19)**2+(qy/.23)**2)
    brow=.075*math.exp(-((radius-1)/.48)**2)*smooth(-.16,.03,qy)
    socket=.030*math.exp(-(qx/.12)**2-(qy/.145)**2)
    return z-rounding*(brow-socket)

def deform(p,region='dorsal'):
    x,y,z=p
    if y >= -1.04: return Vector(p)
    z=remove_old_orbit(x,y,z,region)
    weight=(1-smooth(-1.72,-1.08,y))*(1-smooth(.63,1.04,abs(x)))
    a=math.radians(55)*weight
    dy=y+1.70; dz=z-.15
    return Vector((x,-1.70+math.cos(a)*dy-math.sin(a)*dz-.18*weight,
                   .15+math.sin(a)*dy+math.cos(a)*dz-.045*weight))

