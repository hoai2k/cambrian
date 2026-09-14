"""Densify the carapace's baked coverage for the runtime blend.

The shell's alpha is baked per vertex into COLOR_0 (export_v3.py, .311–1.0 with the physical
margins opaque). Cycles' transmission mix made that coverage read as an olive shell with the trunk
showing through; the runtime composites it as a plain alpha blend, where .31 reads as tinted
water. This remaps alpha a → a**GAMMA (GAMMA .6: .31 → .50, .60 → .74, 1 → 1) on the shell
primitive only, in place, on the candidate GLBs. Colour, geometry, rig and clips are untouched.
Run after export_v3.py and before package-expansion.mjs; re-running is idempotent because it
records the pass in the primitive's extras and refuses a second one."""
import json,struct,sys
from pathlib import Path
import numpy as np
GAMMA=.6
C=Path(sys.argv[1] if len(sys.argv)>1 else '/home/user/expansion-authoring/odaraia-rework/v3-candidate')
def read(p):
    b=p.read_bytes();N=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+N]);start=20+N;size=struct.unpack_from('<I',b,start)[0];return d,bytearray(b[start+8:start+8+size])
def save(p,d,bin):
    j=json.dumps(d,separators=(',',':')).encode();j+=b' '*(-len(j)%4);bin=bytes(bin)+b'\0'*(-len(bin)%4)
    p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(j)+len(bin))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(bin),0x004e4942)+bin)
for name in ['odaraia.glb','odaraia.lod1.glb']:
    p=C/name;d,bin=read(p);done=0
    for me in d['meshes']:
        for prim in me['primitives']:
            if not d['materials'][prim['material']]['name'].endswith('shell'):continue
            ex=prim.setdefault('extras',{})
            if ex.get('shellAlphaGamma'):print(name,'already remapped');continue
            a=d['accessors'][prim['attributes']['COLOR_0']];assert a['type']=='VEC4' and a['componentType']==5123 and a.get('normalized')
            v=d['bufferViews'][a['bufferView']];off=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',8)
            for i in range(a['count']):
                o=off+i*stride+6;al=struct.unpack_from('<H',bin,o)[0]/65535
                struct.pack_into('<H',bin,o,int(round(min(1,al**GAMMA)*65535)))
            ex['shellAlphaGamma']=GAMMA;done+=1
    save(p,d,bin);print(name,'shell primitives remapped',done)
