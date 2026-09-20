"""Render the decoded delivery for pair, jaw, action and portrait review."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'_pipeline'))
import creature_render as C
PHASES=[('Idle',0),('Swim',.3),('Sprint',.4),('Attack',.28),('Bite',.13),('Heavy',.5),('Ability',.45),('Grab',.4),('Death',1.5)]
TOP=[('Swim',0),('Swim',.425),('Swim',.85),('Swim',1.275),('Heavy',.3),('Heavy',.5),('Ability',.45)]
MOUTH=[('Idle',0),('Bite',.13),('Attack',.26),('Grab',.3)]
C.run('askeptosaurus',PHASES,TOP,MOUTH,mouth_scale=.72)
