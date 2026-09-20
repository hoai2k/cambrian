"""Assemble the review sheets from the renders of the exported Atopodentatus GLB.

One column, the authored body alone. Run after render.py has produced `authored-review/`:

  python3 tools/triassic/creatures/atopodentatus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('atopodentatus', {
    'review-volume-sheet': ['side', 'top', 'front'],
    'review-rowing-sheet': ['Swim-0', 'Swim-0.25', 'Swim-0.5', 'Swim-0.75',
                            'Sprint-0', 'Sprint-0.15', 'Sprint-0.3', 'Sprint-0.45',
                            'Swim-0-top', 'Swim-0.25-top', 'Swim-0.5-top', 'Swim-0.75-top',
                            'Sprint-0-top', 'Sprint-0.15-top', 'Sprint-0.3-top',
                            'Sprint-0.45-top'],
    'review-hammer-sheet': ['Heavy-0.2', 'Heavy-0.5', 'Heavy-0.75',
                            'Heavy-0.2-top', 'Heavy-0.5-top', 'Heavy-0.75-top',
                            'Attack-0.25', 'Attack-0.45', 'Attack-0.65', 'Bite-0.12'],
    'review-graze-sheet': ['Ability-0.3', 'Ability-0.9', 'Ability-1.6', 'Ability-0.9-top',
                           'Graze-0.6', 'Eat-0.45'],
    'review-deformation-sheet': ['Idle-0', 'TurnLeft-0.9', 'TurnRight-0.9', 'Dive-0.75',
                                 'Rise-0.75', 'Guard-0.65', 'Parry-0.2', 'Dodge-0.28'],
    'review-actions-sheet': ['Hit-0.3', 'Stagger-0.65', 'Death-1.5', 'Grab-0.55',
                             'Breath-1.3', 'Breathe-1.5', 'Growth-0.75'],
    'review-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.19',
                           'mouth-below-Bite-0.19', 'mouth-Attack-0.46',
                           'mouth-below-Attack-0.46', 'mouth-Ability-0.25',
                           'mouth-below-Ability-0.25', 'mouth-Eat-0.5', 'mouth-below-Eat-0.5']})
