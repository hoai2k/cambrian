"""Authored alpha sprite data plus decals derived from our Blender source renders."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/assets/devonian/atmosphere';OUT.mkdir(parents=True,exist_ok=True)
S=256;N=S*4
y,x=np.mgrid[0:S,0:S]/(S-1);x=x*2-1;y=y*2-1
rng=np.random.default_rng(76291)

def noise(seed):
    r=np.random.default_rng(seed);z=np.zeros_like(x)
    for k in range(18):
        a,b=r.integers(1,14,size=2)
        z+=np.sin(x*a+y*b+r.uniform(0,6.28))/(1+a+b)
    return z

def rgba(alpha,color):
    v=np.zeros((S,S,4),dtype=np.uint8);v[:,:,:3]=color;v[:,:,3]=np.uint8(np.clip(alpha,0,1)*255+.5)
    return Image.fromarray(v)

def entry(atlas,index,label,scale,source=None):
    return {'id':label,'cell':[index%4,index//4],'uvRect':[index%4/4,index//4/4,.25,.25],
            'suggestedSpanMeters':scale,'source':source,'alpha':'straight; transparent padded exterior'}

particles=Image.new('RGBA',(N,N));ps=[]
for row,kind in enumerate(['fine-silt','marine-snow-fleck','organic-particle','sparse-density']):
    for col in range(4):
        if row==0:
            a=np.exp(-((x/(.05+.02*col))**2+(y/(.05+.025*col))**2)*2)
        elif row==1:
            theta=.4*col;u=x*np.cos(theta)+y*np.sin(theta);v=-x*np.sin(theta)+y*np.cos(theta)
            a=np.exp(-((u/(.19+.04*col))**2+(v/.055)**2)*2)*(1+.3*noise(20+col))
        elif row==2:
            a=np.clip((.22-np.sqrt((x*1.3)**2+y*y)+noise(40+col)*.12)*20,0,1)
        else:
            a=np.zeros_like(x)
            for _ in range(8+col*4):
                cx,cy=rng.uniform(-.7,.7,size=2);width=rng.uniform(.008,.025)
                a=np.maximum(a,np.exp(-((x-cx)**2+(y-cy)**2)/width**2))
        a*=np.clip((.86-np.maximum(np.abs(x),np.abs(y)))*20,0,1)
        idx=row*4+col;particles.paste(rgba(a,(235,232,216)),(col*S,row*S))
        ps.append(entry(particles,idx,kind+'-'+str(col+1),[.002,.008] if row==0 else [.01,.04] if row<3 else [.1,.3]))
particles.save(OUT/'particles.png')

# Connected source silhouettes keep fragments traceable to authored B/G models.
shell=Image.open(ROOT/'public/assets/devonian/materials/shell-hash/albedo.png').convert('RGBA')
mask=np.array(shell)[:,:,3]>40;visited=np.zeros_like(mask);boxes=[]
for yy,xx in np.argwhere(mask):
    if visited[yy,xx]:continue
    stack=[(int(yy),int(xx))];visited[yy,xx]=True;pts=[]
    while stack:
        py,px=stack.pop();pts.append((py,px))
        for qy,qx in [(py-1,px),(py+1,px),(py,px-1),(py,px+1)]:
            if 0<=qy<mask.shape[0] and 0<=qx<mask.shape[1] and mask[qy,qx] and not visited[qy,qx]:
                visited[qy,qx]=True;stack.append((qy,qx))
    if len(pts)>150:
        ay,ax=zip(*pts);boxes.append((len(pts),(min(ax),min(ay),max(ax)+1,max(ay)+1)))
boxes.sort(reverse=True)
wood=Image.open(ROOT/'public/assets/devonian/materials/submerged-log/albedo.png').convert('RGBA')
wood=wood.crop(wood.getchannel('A').getbbox())
decals=Image.new('RGBA',(N,N));ds=[]
for row,kind in enumerate(['sediment-drape','microbial-patch','shell-fragment','wood-fragment']):
    for col in range(4):
        idx=row*4+col;source=None
        if row<2:
            n=noise(100+idx);a=np.clip((.60-np.sqrt(x*x+y*y)+n*.35)*4,0,1)
            a*=.6 if row==0 else .5
            colors=[(126,119,99),(150,132,104),(106,113,107),(137,126,111)] if row==0 else [(88,96,51),(98,70,39),(73,89,69),(93,93,75)]
            cell=rgba(a,colors[col]);span=[.2,.8]
        else:
            cell=Image.new('RGBA',(S,S))
            fragment=shell.crop(boxes[col][1]) if row==2 else wood.copy()
            if row==3:
                # A close crop of the authored log surface supplies a broken
                # organic fragment; this is a decal, not another taxon model.
                w,h=fragment.size;left=int(w*col/5);fragment=fragment.crop((left,0,min(w,left+max(1,w//3)),h))
            fragment.thumbnail((int(S*.76),int(S*.76)),Image.Resampling.LANCZOS)
            cell.alpha_composite(fragment,((S-fragment.width)//2,(S-fragment.height)//2))
            source='assets/devonian/props/'+('shell-hash' if row==2 else 'submerged-log')+'.glb';span=[.01,.06] if row==2 else [.05,.25]
        decals.paste(cell,(col*S,row*S));ds.append(entry(decals,idx,kind+'-'+str(col+1),span,source))
decals.save(OUT/'substrate-decals.png')
records=[]
for name,cells in [('particles',ps),('substrate-decals',ds)]:
    target=OUT/(name+'.png')
    records.append({'id':name,'modelStatus':'preview','image':target.relative_to(ROOT/'public').as_posix(),
      'size':[N,N],'grid':[4,4],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'cells':cells,
      'notes':'Original seeded sprite masks and model-derived fragments. Generic particles carry no taxonomic identity. Scale and density are art settings requiring in-water review; no modern track decals.'})
(OUT/'manifest.json').write_text(json.dumps(records,indent=2)+'\n')
print('Two RGBA atlases, 32 padded cells, source links and UV rectangles saved.')
