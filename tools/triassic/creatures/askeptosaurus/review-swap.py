"""Render Askeptosaurus' held shapes and full-range clips, each framed on the pose it produces.

The shared review sheets frame one camera on the body's *bind* box and hold it there while the
clips play, which is right for judging deformation and useless for judging a **shape**: this animal
is two thirds tail and its held shapes change how much of its own bounding box it fills, so half
the frames came out cropped or mostly empty. Every shot here re-frames with `fit_ortho` on the
points the armature actually produced, so what a shot is about is the silhouette.

    blender -b --python review-swap.py -- --file <glb> --out <dir> [--tag <name>]

`--file` takes any of this animal's GLBs, which is how the before/after strips are made: the
shipped backup out of git is the same scene rendered by the same code.
"""
import bpy,sys,math,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'_pipeline'))
import review as R

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def opt(name,default=None):
 return argv[argv.index(name)+1] if name in argv else default
ROOT=Path(__file__).resolve().parents[4]
source=Path(opt('--file',str(ROOT/'public/assets/triassic/creatures/askeptosaurus.glb')))
out=Path(opt('--out',str(ROOT/'local/triassic-authoring/askeptosaurus/swap-review')));out.mkdir(parents=True,exist_ok=True)
tag=opt('--tag','after')

HOLDS=['Idle','Swim','Sprint','Guard','Eat','Grab','TurnLeft','TurnRight','Dive','Rise','Breath','Growth']
RANGE=[('Heavy',.30),('Heavy',.62),('TailWhip',.30),('TailWhip',.62),('Ability',.45),('Coil',.45)]
STRIP=[('Idle',0),('Idle',.7),('Idle',1.4),('Idle',2.1),('Swim',0),('Swim',.425),('Swim',.85),('Swim',1.275)]

scene,rig,cam=R.load(source)
R.emulate_backface_cull()
pose=R.poser(scene,rig)
render=R.renderer(scene,cam)
centre,size=R.subject_bounds()
span=max(size)*1.08;d=span*1.6;cx,cy,cz=centre
VIEWS={'side':(cx+d,cy,cz+.05*span),'top':(cx,cy,cz+d),'threeq':(cx+d*.75,cy-d*.55,cz+d*.45)}
# **Head-on, down this body's own trunk** (T3D-26). Whether the head is in line with the animal is
# an angle in a dorsal shot and invisible in a lateral one; looked at along the trunk's own run it
# is simply whether the head is in the middle of the frame or off to one side. The run is read off
# each file's own rest skeleton, hip to shoulder, so the before and after bodies are each framed
# down the line they actually hold rather than down a shared world axis.
_run=(rig.pose.bones['chest'].head-rig.pose.bones['tail_00'].head).normalized()
VIEWS['front']=tuple(v+_run[i]*d for i,v in enumerate(centre))

def shot(name,clip,t,view,w=760,h=570):
 pose(clip,t)
 loc,target,scale=R.fit_ortho(VIEWS[view],centre,R.posed_points(),w/h)
 render(out/('%s-%s-%s-%s-%s.png'%(tag,name,clip,t,view)),w,h,loc=loc,target=target,scale=scale,
        roll=math.pi/2 if view=='top' else 0.)

# Dorsal and three-quarter, not dorsal and lateral. This animal folds in the **horizontal** plane,
# so a camera on the file's own lateral axis looks straight across the curve and the body overlaps
# itself: twelve held shapes came out as twelve near-identical stubby arches. The curve is what
# these sheets are about, so the second view is one that can see it.
for clip in HOLDS:
 for view in ('threeq','top'):shot('hold',clip,0,view)
for clip,t in RANGE:
 for view in ('top','side'):shot('range',clip,t,view)
for clip,t in STRIP:shot('strip',clip,t,'threeq')
for view in ('side','top','threeq'):shot('card','TurnLeft',.2,view,900,675)
for clip in ('Idle','Swim','Sprint'):shot('frontal',clip,0,'front',760,570)
print('REVIEW_SWAP_OK',json.dumps({'tag':tag,'source':str(source),'out':str(out)}))
