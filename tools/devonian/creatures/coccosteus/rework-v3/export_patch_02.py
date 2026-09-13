"""Local GLB anchor/root/channel utility, adapted from executed Gemuendina exporter.
No creature geometry, motion or source import; called only by frozen candidate.
"""
import json,struct,math
import numpy as np
from mathutils import Vector,Matrix,Quaternion
from rig_actions_01 import ANCHORS,CLIPS
def patch_export(path,lod=False):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0]
    g=json.loads(raw[20:20+length]);binary=raw[20+length:];nodes=g['nodes']
    parent={c:i for i,n in enumerate(nodes)for c in n.get('children',[])}
    def world(i):
        n=nodes[i]
        if 'matrix'in n:m=Matrix(np.array(n['matrix']).reshape(4,4).T.tolist())
        else:
            q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],*q[:3])),Vector(n.get('scale',[1,1,1])))
        return world(parent[i])@m if i in parent else m
    for a in ANCHORS:
        i=next(i for i,n in enumerate(nodes)if n.get('name')==a['name'])
        b=next(i for i,n in enumerate(nodes)if n.get('name')==a['bone'])
        p=Vector((a['point'][0],a['point'][2],-a['point'][1]));local=world(b).inverted()@p
        if i in parent:nodes[parent[i]]['children'].remove(i)
        nodes[b].setdefault('children',[]).append(i)
        nodes[i]={'name':a['name'],'translation':list(local),'extras':{'cambrianAnchor':{'version':1,'role':a['role'],'parentBone':a['bone']}}}
    for action in g.get('animations',[]):
        name=action['name'].split('|')[-1]
        if name not in CLIPS:raise RuntimeError('Unexpected animation '+action['name'])
        action['name']=name;kept=[]
        for ch in action['channels']:
            target=ch['target'];node=nodes[target['node']];prop=target['path']
            if prop=='scale' or node.get('name')=='root':
                acc=g['accessors'][action['samplers'][ch['sampler']]['output']];view=g['bufferViews'][acc['bufferView']]
                count={'VEC3':3,'VEC4':4}[acc['type']];offset=8+view.get('byteOffset',0)+acc.get('byteOffset',0)
                data=np.frombuffer(binary,dtype='<f4',count=acc['count']*count,offset=offset).reshape(-1,count)
                expected=node.get(prop,[1,1,1]if prop=='scale'else[0,0,0,1]if prop=='rotation'else[0,0,0])
                if np.max(np.abs(data-np.array(expected)))>=1e-5:raise RuntimeError('Unexpected nonconstant root/scale channel')
            else:kept.append(ch)
        action['channels']=kept
    # Full and reduced creatures retain every required dynamic game action.
    names=[a['name']for a in g['animations']]
    if set(names)!=set(CLIPS):raise RuntimeError('Export action set mismatch')
    js=json.dumps(g,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(js)+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+binary)
    return g
