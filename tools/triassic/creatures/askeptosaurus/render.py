"""Render the decoded delivery for pair, jaw, action and portrait review."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'_pipeline'))
import creature_render as C
PHASES=[('Idle',0),('Swim',.3),('Sprint',.4),('Attack',.28),('Bite',.13),('Heavy',.5),('Ability',.45),('Grab',.4),('Death',1.5)]
TOP=[('Swim',0),('Swim',.425),('Swim',.85),('Swim',1.275),('Heavy',.3),('Heavy',.5),('Ability',.45)]
MOUTH=[('Idle',0),('Bite',.13),('Attack',.26),('Grab',.3)]
# The roster cards are shot from a posed frame rather than from the bind (T3D-24), and the reason
# holds for both of this animal's bodies for opposite reasons. The straight regeneration's bind is
# a modelling pose -- a ramrod needle with four paddles, which is what the shipped card was. The
# posed generation now in front has the other problem: its bind is the pose Tripo drew it in, with
# the tail hooked round under the belly, and a card shot there is an animal tied in a knot. Both
# are answered the same way, because the animal's shape lives in its clips: `TurnLeft`'s own held
# shape -- the long C through trunk, neck and tail -- is where a three-quarter camera sees the most
# of it, the arch over the shoulders, the head brought round toward the lens and the tail sweeping
# away in a broad curve. **Early** in the clip on purpose: the held shape is constant across it and
# the swing is not, so at 0.20 s the card is mostly the hold, and by 0.50 s the tail has curled
# back over the animal. Nothing else on the roster names a pose, so nothing else's portraits move.
C.run('askeptosaurus',PHASES,TOP,MOUTH,mouth_scale=.72,portrait_pose=('TurnLeft',.2))
