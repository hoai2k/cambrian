"""Numerical material/triangle ray probe and sections for pale Ability floor patches.
Actual full/LOD exported skin poses; no blend import, render, save or repair.
"""
from pathlib import Path
import sys,json,hashlib
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4]
LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3';SRC=LOCAL/'candidate-06';OUT=LOCAL/'oral-numerical-candidate06-01'
sys.dont_write_bytecode=True;sys.path.insert(0,str(HERE))
from gltf_evaluate_01 import read_glb
HASHES={'titanichthys.glb':'e2c69eab63e50805c7d3980ee5e65e8b328b8d88e190a944e3f26db2b8ef36ad','titanichthys.lod1.glb':'27ca2ebdc5d40482dccc93d2fdc13f0390c6b4082407c245ba45913fa3773f40'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for name,digest in HASHES.items():assert sha(SRC/name)==digest
assert not OUT.exists(),'Preserve existing numerical oral evidence';OUT.mkdir()
def role(name):return 'oral'if 'oral accent'in name else 'underside'if 'underside'in name else'body'
COLORS={'body':'#22bccc','underside':'#e3be35','oral':'#cf6697'}
report={'inputs':HASHES,'script_sha256':sha(__file__),'method':'Actual exported skin/channel poses and closest triangle raycasts from exact fixed orthographic oral camera; planar triangle sections. No mesh editing.',
 'camera':{'blender_position':[0,-8,-.16],'target':[0,-1.65,-.16],'ortho_width':2.8,'pixels':[1400,1050]},
 'regions':'Paired visible pale patch neighborhoods from hash-bound Ability-oral.png; controls compare same pixels in Bite/Eat. Regions are screen-space measurements, not authored geometric changes.',
 'legend':COLORS,'records':[]}
def save(): (OUT/'result.json').write_text(json.dumps(report,indent=2)+'\n')
def section(points,faces,mats,x,path):
    t=points[faces];mask=(t[:,:,0].min(1)<=x)&(t[:,:,0].max(1)>=x);lines=[]
    for index in np.flatnonzero(mask):
        tri=t[index];hits=[]
        for a,b in ((tri[0],tri[1]),(tri[1],tri[2]),(tri[2],tri[0])):
            if (a[0]-x)*(b[0]-x)<0:
                q=a+(b-a)*((x-a[0])/(b[0]-a[0]));hits.append(q)
        if len(hits)==2 and all(1.7<p[2]<2.9 and -.95<p[1]<.1 for p in hits):lines.append((hits,role(mats[index])))
    def xy(p):return (40+(2.9-p[2])*400,40+(.1-p[1])*400)
    svg=['<svg xmlns="http://www.w3.org/2000/svg" width="600" height="500"><rect width="600" height="500" fill="white"/>',
         f'<text x="15" y="22" font-size="15">Actual sagittal section x={x:.4f}; front left; yellow underside / pink oral</text>']
    for pair,r in lines:
        a,b=map(xy,pair);svg.append(f'<path d="M{a[0]:.3f},{a[1]:.3f} L{b[0]:.3f},{b[1]:.3f}" fill="none" stroke="{COLORS[r]}" stroke-width="1.2"/>')
    svg.append('</svg>');path.write_text('\n'.join(svg));return {'path':str(path),'sha256':sha(path),'segments':len(lines)}
for name,digest in HASHES.items():
    g,evaluate=read_glb(SRC/name)
    poses=[('Bite',.35),('Eat',.5),('Ability',.5)]if '.lod1'not in name else[('Ability',.5)]
    for clip,phase in poses:
        meshes,_=evaluate(clip,phase);body=meshes['Titanichthys_new_continuous_sculpt_export']
        points=np.array(body['positions']);faces=np.array(body['indices']).reshape(-1,3);mats=body['triangle_materials'];assert len(mats)==len(faces)
        tree=BVHTree.FromPolygons(points.tolist(),faces.tolist(),all_triangles=True)
        rows=[];counts={};label=('lod'if '.lod1'in name else'full')+'-'+clip
        for side,cx in [('left',474),('right',927)]:
            for py in range(535,581,5):
                for px in range(cx-40,cx+41,5):
                    # Center of a pixel in the exact existing1400x1050 view.
                    x=((px+.5)/1400-.5)*2.8;y=(.5-(py+.5)/1050)*2.1-.16
                    origin=Vector((x,y,8.));hits=[];direction=Vector((0,0,-1))
                    for k in range(4):
                        p,normal,index,distance=tree.ray_cast(origin,direction)
                        if p is None:break
                        hits.append({'triangle':index,'material':mats[index],'role':role(mats[index]),'point':list(p),'normal':list(normal)})
                        origin=p+direction*2e-6
                    first=hits[0]['role']if hits else'no hit';counts[first]=counts.get(first,0)+1
                    rows.append({'side':side,'pixel':[px,py],'hits':hits})
        # A numerical ray-label map, not another beauty render.
        svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="420 520 570 85" width="1140" height="170"><rect x="420" y="520" width="570" height="85" fill="white"/>']
        for row in rows:
            x,y=row['pixel'];fill=COLORS[row['hits'][0]['role']]if row['hits']else'#000000'
            svg.append(f'<rect x="{x-2}" y="{y-2}" width="5" height="5" fill="{fill}"/>')
        svg.append('</svg>');map_path=OUT/(label+'-ray-material-map.svg');map_path.write_text('\n'.join(svg))
        sections=[section(points,faces,mats,((cx+.5)/1400-.5)*2.8,OUT/(label+'-'+side+'-section.svg'))for side,cx in [('left',474),('right',927)]]
        record={'asset':name,'sha256':digest,'clip':clip,'phase':phase,'first_hit_role_counts':counts,'rays':rows,'ray_map':{'path':str(map_path),'sha256':sha(map_path)},'sections':sections}
        report['records'].append(record);save();print('TITANICHTHYS_ORAL_NUMERICAL_RECORD',label,counts,flush=True)
report['measurement_complete']=True;save()
for name,digest in HASHES.items():assert sha(SRC/name)==digest
print('TITANICHTHYS_ORAL_NUMERICAL_OK '+str(OUT/'result.json'),flush=True)
