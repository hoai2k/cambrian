"""Light pure-Python source geometry evidence. Never runs Blender or changes art."""
import ast
import hashlib
import json
from math import isfinite,sqrt
from collections import Counter
from pathlib import Path
import geometry_clay01 as design

HERE=Path(__file__).resolve().parent


def sub(a,b):return tuple(x-y for x,y in zip(a,b))
def cross(a,b):return (a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0])


def inspect(name,verts,faces):
    edges=Counter();degenerate=0
    for face in faces:
        for a,b in zip(face,face[1:]+face[:1]):edges[tuple(sorted((a,b)))]+=1
        area=0
        for i in range(1,len(face)-1):
            c=cross(sub(verts[face[i]],verts[face[0]]),sub(verts[face[i+1]],verts[face[0]]))
            area+=sqrt(sum(v*v for v in c))*.5
        degenerate+=area<1e-12
    result={'name':name,'vertices':len(verts),'faces':len(faces),
            'finite':all(isfinite(v) for p in verts for v in p),
            'nonmanifoldEdgeIncidence':sum(count!=2 for count in edges.values()),
            'degenerateFaces':degenerate,
            'bounds':[[min(p[d] for p in verts),max(p[d] for p in verts)] for d in range(3)]}
    assert result['finite'] and not degenerate and not result['nonmanifoldEdgeIncidence'],result
    return result


rows=design.pchip(design.BODY,100)
assert all(width>0 and up>low for z,cx,width,up,low in rows)
sources=['geometry_clay01.py','build_clay01.py','render_clay01.py','check_source_clay01.py']
for name in sources:ast.parse((HERE/name).read_text())
report={'status':'PASS source geometry only; Blender Booleans, construction and art unexecuted/unreviewed',
        'longitudinalSamples':len(rows),
        'meshes':[inspect(name,*g) for name,g in design.all_base_geometry().items()],
        'inputHashes':{str(HERE/name):hashlib.sha256((HERE/name).read_bytes()).hexdigest() for name in sources}}
(HERE/'source-checks-clay01.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
