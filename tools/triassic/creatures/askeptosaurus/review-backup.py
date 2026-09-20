"""Render the actual decoded backup GLB in its own rest geometry, whichever body is the backup."""
import math,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'_pipeline'))
import review as R
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[3];LOCAL=ROOT/'local/triassic-authoring/askeptosaurus'
scene,rig,cam=R.load(LOCAL/'askeptosaurus.backup.unpacked.glb');R.emulate_backface_cull();pose=R.poser(scene,rig);render=R.renderer(scene,cam)
centre,size=R.subject_bounds();span=max(size)*1.45;cx,cy,cz=centre;d=span*1.5
out=LOCAL/'backup-review';out.mkdir(exist_ok=True)
for name,t in [('Idle',0),('Swim',.4),('Attack',.28),('Heavy',.5),('Ability',.45),('Grab',.3)]:
 pose(name,t);render(out/(name+'.png'),900,675,loc=(cx+d*.7,cy-d*.6,cz+d*.65),target=centre,scale=span)
pose('Idle',0);render(out/'top.png',1000,1000,loc=(cx,cy,cz+d),target=centre,scale=span,roll=math.pi/2)
