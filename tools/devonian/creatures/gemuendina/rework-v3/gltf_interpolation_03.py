"""glTF 2.0 node-animation sampler evaluation in XYZW quaternion convention.

Khronos glTF 2.0, animation samplers and Appendix C. No exporter assumptions.
"""
import math
import numpy as np

def normalized(q):
    length=float(np.linalg.norm(q))
    if not math.isfinite(length) or length<1e-12:raise ValueError('Invalid interpolated zero quaternion')
    return q/length

def sample_channel(times,values,t,mode='LINEAR',path='translation'):
    times=np.asarray(times,dtype=float).reshape(-1);values=np.asarray(values,dtype=float)
    if mode not in ('LINEAR','STEP','CUBICSPLINE'):raise ValueError('Unsupported glTF interpolation '+str(mode))
    if len(times)==0 or not np.isfinite(times).all() or np.any(np.diff(times)<=0):raise ValueError('Invalid key times')
    if not np.isfinite(values).all() or not math.isfinite(t):raise ValueError('Nonfinite sampler')
    cubic=mode=='CUBICSPLINE'
    if len(values)!=(3 if cubic else 1)*len(times):raise ValueError('Sampler output count mismatch')
    if cubic and len(times)<2:raise ValueError('Cubic sampler requires two keys')
    if path=='rotation' and values.shape[1]!=4:raise ValueError('Quaternion requires XYZW')
    def key(i):return values[3*i+1 if cubic else i].copy()
    # Endpoint clamping includes the exact terminal key, crucial for STEP.
    if t<=times[0]:return key(0).tolist()
    if t>=times[-1]:return key(len(times)-1).tolist()
    i=int(np.searchsorted(times,t,side='right')-1)
    if mode=='STEP':return key(i).tolist()
    dt=float(times[i+1]-times[i]);u=float((t-times[i])/dt)
    a,b=key(i),key(i+1)
    if cubic:
        u2=u*u;u3=u2*u
        result=(2*u3-3*u2+1)*a+(u3-2*u2+u)*dt*values[3*i+2]+(-2*u3+3*u2)*b+(u3-u2)*dt*values[3*(i+1)]
        # Do not hemisphere-flip spline values/tangents; use the authored curve.
        if path=='rotation':result=normalized(result)
    elif path=='rotation':
        a=normalized(a);b=normalized(b);dot=float(np.dot(a,b))
        if dot<0:b=-b;dot=-dot
        dot=max(0.,min(1.,dot))
        if dot>1-1e-8:result=normalized((1-u)*a+u*b)
        else:
            angle=math.acos(dot);den=math.sin(angle)
            result=normalized(math.sin((1-u)*angle)/den*a+math.sin(u*angle)/den*b)
    else:result=(1-u)*a+u*b
    return result.tolist()
