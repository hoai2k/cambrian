"""Terminal snout correction after user's rejection of the set-back aperture.

The old preoral apron wraps under the jaw instead of projecting ahead of it.
At the median profile the lips are the anterior-most living edge. Posterior
material/topology correspondence is retained for rebuilding the established rig.
"""
import math
from mathutils import Vector
from sculpt_spec_02 import skin, smooth
from shape_02 import remove_old_orbit

def deform(p, region='dorsal'):
    x,y,z=p
    if y >= -1.12: return Vector(p)
    z=remove_old_orbit(x,y,z,region)
    dy=y+1.75
    top=remove_old_orbit(x,y,skin(x,y),'dorsal')
    # Reparameterize the cranial surface into a rounded snout. The surface
    # runs backward above AND below the terminal lip; there is no front apron.
    front=-2.14+3.3*dy*dy+.35*x*x
    depth=(top-z)*.90
    amp=.34 if dy>=0 else .14
    height=.035+amp*math.tanh(dy/.22)
    # Recover transverse cranial camber and the existing lateral cheek field.
    height*=max(.35,1-.38*(abs(x)/.70)**2)
    height-=(top-z)*.85
    q=Vector((x,front+depth,height))
    weight=(1-smooth(-1.57,-1.12,y))*(1-smooth(.51,.99,abs(x)))
    return Vector((x,y,z)).lerp(q,weight)
