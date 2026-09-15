"""Assemble the paired review sheets from the renders of the exported Cymbospondylus GLBs.

Run after render.py has produced both `authored-review/` and `twin-review/`:

  python3 tools/triassic/creatures/cymbospondylus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('cymbospondylus', {'paired-volume-sheet': ['side', 'top', 'front'], 'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.55', 'Swim-1.1', 'Swim-1.65', 'TurnLeft-0.9', 'TurnRight-0.9', 'Dive-0.8', 'Rise-0.8', 'Attack-0.12', 'Attack-0.34', 'Attack-0.46', 'Attack-0.7', 'Bite-0.25'], 'paired-wave-sheet': ['Swim-0-top', 'Swim-0.28-top', 'Swim-0.55-top', 'Swim-0.83-top', 'Swim-1.1-top', 'Sprint-0-top', 'Sprint-0.35-top', 'Sprint-0.7-top', 'Attack-0.12-top', 'Attack-0.34-top', 'Attack-0.46-top', 'Attack-0.7-top'], 'paired-actions-sheet': ['Sprint-0', 'Sprint-0.35', 'Sprint-0.7', 'Heavy-0.2', 'Heavy-0.6', 'Hit-0.3', 'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Dodge-0.25', 'Eat-0.45', 'Death-1.6', 'Ability-0.5', 'Grab-0.55', 'Breath-1.3', 'Breathe-1.6', 'Growth-0.75'], 'paired-era-clips-sheet': ['Lunge-0.3', 'Lunge-0.72', 'Breathe-1.6', 'Ability-0.5'], 'paired-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.25', 'mouth-below-Bite-0.25', 'mouth-Attack-0.42', 'mouth-below-Attack-0.42', 'mouth-Lunge-0.6', 'mouth-below-Lunge-0.6']})
