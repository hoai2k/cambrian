"""Blender geometry regression checks; execute independently before trusting audit reports."""
import ast, math
from pathlib import Path
from collections import defaultdict
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
src=ast.parse(Path(__file__).with_name('eye-audit.py').read_text())
exec(compile(ast.Module(body=[n for n in src.body if isinstance(n,ast.FunctionDef)],type_ignores=[]),'<audit functions>','exec'))
p=[(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),(1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]
f=[(0,2,3),(0,3,1),(4,5,7),(4,7,6),(0,1,5),(0,5,4),(2,6,7),(2,7,3),(0,4,6),(0,6,2),(1,3,7),(1,7,5)]
d=Vector((1,.37,.19)).normalized()
for faces in [f,[tuple(reversed(t))for t in f]]:
 tree=BVHTree.FromPolygons(list(map(Vector,p)),faces,all_triangles=True)
 for point,expected in [((0,0,0),True),((.99,-.9,.7),True),((1.01,0,0),False),((-2,0,0),False)]:assert inside(tree,point,d)==expected
# A plane through a centrally symmetric closed octahedral globe cuts exactly half its volume.
ep=[(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]
ef=[(a,b,c)for a in [0,1]for b in [2,3]for c in [4,5]]
eyetr=BVHTree.FromPolygons(list(map(Vector,ep)),ef,all_triangles=True)
bodyp=[(x-1,y*2,z*2)for x,y,z in p];bodytr=BVHTree.FromPolygons(list(map(Vector,bodyp)),f,all_triangles=True)
rng=np.random.default_rng(982);raw=rng.uniform(-1,1,(60000,3));accepted=[q for q in raw if inside(eyetr,q,d)]
inside_n=sum(inside(bodytr,q,d)for q in accepted);ci=wilson(inside_n,len(accepted));assert ci[0]<50<ci[1],ci
# Closing a missing distal cap leaves a watertight classification with reported closure.
vp,vf,top=close_envelope({'positions':p,'faces':f[2:]});assert top['valid'] and len(top['cappedBoundaryLoops'])==1
assert inside(BVHTree.FromPolygons(vp,vf,all_triangles=True),(0,0,0),d)
print('PASS: inside/outside, reversed normals, actual-polyhedron uniform-volume 50% cut, explicit boundary closure.',ci)
