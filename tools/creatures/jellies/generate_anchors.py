"""Rest-space anatomical contact sockets derived from build.py; no mesh/rig mutation.
The append-only GLB packager converts Blender coordinates (x,y,z) to (x,z,-y),
then into the named parent bone's rest space. CCD chains exclude body/locomotion.
"""
from pathlib import Path
import json, math, struct
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]

def anchor(name,bone,point,role,chain=None,contact=None):
    result={'name':name,'bone':bone,'point':[round(v,8) for v in point],'role':role}
    if chain:
        result.update(chain=chain,effectorBone=bone,solver='CCD')
    if contact:result['contactType']=contact
    return result

out={}
# Mouth lies between the four short oral lobes, below the central manubrium.
a=[anchor('anchor_mouth','body',(0,0,-.13),'mouth'),anchor('anchor_mouth_inside','body',(0,0,.08),'swallow')]
def medusa_tip(j):
    theta=2*math.pi*j/48
    length=.48+.13*(.5+.5*math.cos(j*2.13))
    r=1.008+.13*math.sin(math.pi*.8)
    return (r*math.cos(theta),r*math.sin(theta),-.03-length)
def medusa_contact(name,j,role):
    return anchor(name,f'tentacle_tip_{j:02}',medusa_tip(j),role,[f'tentacle_{j:02}',f'tentacle_tip_{j:02}'],'tentacle_tip')
# -Y is anterior; j=36 is the front midline tentacle.
a += [medusa_contact('anchor_attack_primary',36,'attack'),medusa_contact('anchor_grasp',36,'grasp'),medusa_contact('anchor_grasp_L',42,'grasp'),medusa_contact('anchor_grasp_R',30,'grasp')]
for j in range(48):a.append(medusa_contact(f'anchor_attack_tentacle_{j:02}',j,'attack'))
out['burgessomedusa']=a

# Oral opening is central on the lower pole; rim contact uses the outer surface
# of the modeled .055-radius scalloped lip tube, at its sector center.
a=[anchor('anchor_mouth','body',(0,0,-.96),'mouth'),anchor('anchor_mouth_inside','body',(0,0,-.78),'swallow'),anchor('anchor_attack_primary','oral_6',(0,-.44,-.94),'attack',contact='oral_margin')]
for j in range(8):
    theta=j*math.pi/4
    a.append(anchor(f'anchor_attack_oral_{j}',f'oral_{j}',(.44*math.cos(theta),.44*math.sin(theta),-.94),'attack',contact='oral_margin'))
out['ctenorhabdotus']=a

# Oral cones face ventrally: teeth end .10 below each builder mouth_ring center.
a=[anchor('anchor_mouth','body',(0,-1.27,-.32),'mouth'),anchor('anchor_mouth_inside','body',(0,-1.27,-.16),'swallow')]
def rake_contact(name,s,k,role):
    # Exact tip of the recurved endite attached at 60% of podomere k.
    p=(s*(.27+.045*(k+.6)-.28),-1.36-.15*(k+.6)-.48,-.16-.05*(k+.6)-.13)
    return anchor(name,f'rake_{s}_{k}',p,role,[f'rake_{s}_{j}' for j in range(k+1)],'hooked_endite')
a += [rake_contact('anchor_attack_primary',1,4,'attack'),rake_contact('anchor_grasp',1,4,'grasp')]
for s,label in [(1,'L'),(-1,'R')]:
    # Distal functional contact is the last recurved hook (podomere 4).
    # Podomere 5 is a short unhooked shaft tip and is deliberately not solved.
    a.append(rake_contact(f'anchor_grasp_{label}',s,4,'grasp'))
    a.append(rake_contact(f'anchor_attack_{label}',s,4,'attack'))
    for k in range(5):a.append(rake_contact(f'anchor_attack_endite_{label}_{k}',s,k,'attack'))
out['cambroraster']=a

def filter_point(s,k):return (s*(.25+.32*math.sin(k/12*math.pi*.75)),-1.71-k*.155,-.06-.035*k)
def filter_contact(name,s,role):
    return anchor(name,f'filter_{s}_12',filter_point(s,13),role,[f'filter_{s}_{j:02}' for j in range(13)],'filter_appendage_tip')
a=[anchor('anchor_mouth','body',(0,-1.59,-.33),'mouth'),anchor('anchor_mouth_inside','body',(0,-1.59,-.13),'swallow'),filter_contact('anchor_attack_primary',1,'attack')]
# These contacts collect small food; they do not claim a crushing claw.
a.append(filter_contact('anchor_grasp',1,'grasp'))
for s,label in [(1,'L'),(-1,'R')]:
    a.append(filter_contact(f'anchor_grasp_{label}',s,'grasp'))
    a.append(filter_contact(f'anchor_attack_{label}',s,'attack'))
    p=filter_point(s,12);q=filter_point(s,13)
    mid=tuple((x+y)/2 for x,y in zip(p,q));span=.31+.21*math.sin(math.pi*12/14)
    for side,edge in [(1,'outer'),(-1,'inner')]:
        end=(mid[0]+s*side*span,mid[1]-.06,mid[2]-.08)
        a.append(anchor(f'anchor_attack_comb_{label}_{edge}',f'filter_{s}_12',end,'attack',[f'filter_{s}_{j:02}' for j in range(13)],'filter_endite_tip'))
out['tamisiocaris']=a

# Validate every parent, effector, and contiguous feeding chain against BOTH LODs.
for id,anchors in out.items():
    assert len({a['name'] for a in anchors})==len(anchors)
    for suffix in ['', '.lod1']:
        raw=(ROOT/'public/assets/creatures'/f'{id}{suffix}.glb').read_bytes()
        n=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+n]);nodes=g['nodes'];named={n.get('name'):i for i,n in enumerate(nodes)}
        for a in anchors:
            assert a['bone'] in named,(id,suffix,a['bone'])
            assert all(math.isfinite(x) for x in a['point'])
            chain=a.get('chain',[])
            assert not any(n=='root' or n=='body' or n.startswith(('segment_','bell_','sector_','flap_','tail_','comb_'))for n in chain)
            for n in chain:assert n in named,(id,suffix,n)
            for p,c in zip(chain,chain[1:]):assert named[c] in nodes[named[p]].get('children',[]),(id,p,c)
            if chain:assert a['effectorBone']==chain[-1]==a['bone']
(HERE/'anchors.json').write_text(json.dumps(out,indent=2)+'\n')
print({id:len(a) for id,a in out.items()})
