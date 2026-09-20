"""Assemble the review sheets from the renders of the exported Rhaeticosaurus GLB.

One column, the authored body alone. Run after render.py has produced `authored-review/`:

  python3 tools/triassic/creatures/rhaeticosaurus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('rhaeticosaurus', {
    'review-volume-sheet': ['side', 'top', 'front'],
    'review-flight-sheet': ['Swim-0', 'Swim-0.22', 'Swim-0.45', 'Swim-0.68',
                            'Sprint-0', 'Sprint-0.14', 'Sprint-0.28', 'Sprint-0.42',
                            'Swim-0-top', 'Swim-0.22-top', 'Swim-0.45-top', 'Swim-0.68-top',
                            'Sprint-0-top', 'Sprint-0.14-top', 'Sprint-0.28-top',
                            'Sprint-0.42-top'],
    'review-powerstroke-sheet': ['Ability-0.15', 'Ability-0.35', 'Ability-0.55', 'Ability-0.8',
                                 'Ability-0.15-top', 'Ability-0.35-top', 'Ability-0.55-top',
                                 'Ability-0.8-top'],
    'review-deformation-sheet': ['Idle-0', 'Glide-0.8', 'TurnLeft-0.8', 'TurnRight-0.8',
                                 'Dive-0.7', 'Rise-0.7', 'Attack-0.2', 'Attack-0.4',
                                 'Attack-0.6', 'Heavy-0.3', 'Heavy-0.6', 'Bite-0.12'],
    'review-actions-sheet': ['Hit-0.3', 'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Dodge-0.25',
                             'Eat-0.4', 'Death-1.4', 'Grab-0.55', 'Breath-1.2', 'Breathe-1.5',
                             'Growth-0.75'],
    'review-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.1',
                           'mouth-below-Bite-0.1', 'mouth-Heavy-0.55', 'mouth-below-Heavy-0.55',
                           'mouth-Eat-0.4', 'mouth-below-Eat-0.4']})
