"""Exact exported topology of the inner lip's oral-material boundary.
This is an anatomical material interface, not a fixed screen-space rectangle.
"""
from collections import defaultdict
import numpy as np

def boundary_indices(positions,faces,materials):
    # glTF splits normals/UV/material corners. Weld only IDENTICAL float32
    # positions, without enlarging a spatial threshold or merging near tissue.
    lookup={};remap=[];representatives=[]
    for i,p in enumerate(positions):
        key=tuple(map(float,p))
        if key not in lookup:lookup[key]=len(representatives);representatives.append(i)
        remap.append(lookup[key])
    counts=defaultdict(int)
    for f,material in zip(faces,materials):
        if 'oral accent'not in material:continue
        t=[remap[int(i)]for i in f]
        assert len(set(t))==3,'Degenerate oral face requires review'
        for a,b in zip(t,t[1:]+t[:1]):counts[tuple(sorted((a,b)))]+=1
    assert counts and max(counts.values())<=2,'Nonmanifold oral submesh'
    edges=[e for e,n in counts.items()if n==1];adj=defaultdict(list)
    for a,b in edges:adj[a].append(b);adj[b].append(a)
    assert adj and all(len(v)==2 for v in adj.values()),'Oral boundary is not a set of closed simple loops'
    start=min(adj);loop=[start];previous=None;current=start
    while True:
        nxt=next(v for v in sorted(adj[current])if v!=previous)
        if nxt==start:break
        assert nxt not in loop,'Repeated oral boundary vertex'
        loop.append(nxt);previous,current=current,nxt
    assert len(loop)==len(adj),'Multiple oral boundary loops require anatomical selection'
    return [representatives[i]for i in loop]

def aperture_interval(boundary,x):
    heights=[]
    for p,q in zip(boundary,np.roll(boundary,-1,axis=0)):
        if (p[0]<=x<q[0])or(q[0]<=x<p[0]):
            heights.append(float(p[1]+(q[1]-p[1])*(x-p[0])/(q[0]-p[0])))
    heights.sort()
    assert len(heights)==2,('Projected oral-material interface is not a simple interval',x,heights)
    return heights
