"""Terminal snout study05: independent belly, continuous lower jaw, true oral rings.

Retains accepted material03 mesh/UV correspondence. The old anterior dorsal
apron becomes the OUTSIDE of the lower lip and chin, not an extra hanging flap.
The ventral surface follows a separate shallow belly profile. Oral coordinates
are rebuilt from the terminal rim by apply_oral, never warped as external skin.
"""
import math
from mathutils import Vector
from sculpt_spec_02 import skin, smooth, profile, WIDTH
from shape_02 import remove_old_orbit

def top_target(x,y):
    # The small transverse centre offset follows the original crescent rim.
    d=y-(-1.75+.014*min(1.,(x/.35)**2))
    front=-2.11+2.8*d*d+.34*x*x
    amp=.34 if d>=0 else .10
    z=.010+amp*math.tanh(d/(.20 if d>=0 else .10))
    z*=max(.5,1-.34*(abs(x)/.70)**2)
    return Vector((x,front,z))

def deform(p, region='dorsal'):
    x,y,z=p
    if y>=-1.04: return Vector(p)
    base=Vector(p)
    fade=1-smooth(-1.35,-1.04,y)
    if region=='dorsal':
        base.z += (remove_old_orbit(x,y,z,'dorsal')-z)*fade
    target=top_target(x,y)
    if region=='ventral':
        # The shared nose pole follows the chin; ventral rows then recede
        # monotonically into a shallow belly. No dorsal-depth shear is used.
        chin=top_target(0,-1.98)
        belly=Vector((x,y+(chin.y+1.98)*(1-smooth(-1.98,-1.60,y)),
                      chin.z-.055*smooth(-1.98,-1.60,y)))
        width=max(1e-9,profile(y,WIDTH))
        rounding=math.sqrt(max(0.,1-(abs(x)/width)**2))
        t=rounding
        target=target.lerp(belly,t)
    elif region=='oral':
        # Generic attachment/pivot approximation only. Mesh oral vertices must
        # use explicit ring reconstruction below, so lumen stays above belly.
        depth=max(0.,skin(x,y)-z)
        target.y+=depth*1.9
        target.z=target.z*.40-.015
    weight=(1-smooth(-1.55,-1.04,y))*(1-smooth(.51,.99,abs(x)))
    return base.lerp(target,weight)

def apply_oral(body, oral_spec):
    rim=oral_spec['rim']; rings=oral_spec['oral_rings']
    lips=[body.data.vertices[i].co.copy() for i in rim]
    # A short lip thickness leads into a deep, continuously closed oral cavity.
    # It runs posteriorly, rather than down through the lower jaw or belly.
    for k,row in enumerate(rings[1:],1):
        t=k/25.; shrink=(1-t)**.68
        for j,index in enumerate(row):
            p=lips[j]
            body.data.vertices[index].co=(p.x*shrink,
                p.y+(.66)*t,
                -.015+(p.z+.015)*shrink)
    # make_mesh appends this one throat pole after all oral ring vertices.
    body.data.vertices[-1].co=(0,-1.45,-.015)
