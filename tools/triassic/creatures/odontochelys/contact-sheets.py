"""Assemble the review sheets from the renders of the exported Odontochelys GLB.

One column, the authored body alone. Run after render.py has produced `authored-review/`:

  python3 tools/triassic/creatures/odontochelys/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('odontochelys', {
    'review-volume-sheet': ['side', 'top', 'front'],
    'review-rowing-sheet': ['Swim-0', 'Swim-0.25', 'Swim-0.5', 'Swim-0.75',
                            'Sprint-0', 'Sprint-0.15', 'Sprint-0.3', 'Sprint-0.45',
                            'Swim-0-top', 'Swim-0.25-top', 'Swim-0.5-top', 'Swim-0.75-top',
                            'Sprint-0-top', 'Sprint-0.15-top', 'Sprint-0.3-top',
                            'Sprint-0.45-top'],
    'review-shell-sheet': ['Ability-0.2', 'Ability-0.45', 'Ability-0.7', 'Ability-1.1',
                           'Ability-0.45-top', 'Guard-0.65', 'front', 'Parry-0.2'],
    'review-crawl-sheet': ['Crawl-0.3', 'Crawl-0.85', 'Crawl-1.4',
                           'Crawl-0.3-top', 'Crawl-0.85-top', 'Crawl-1.4-top'],
    'review-deformation-sheet': ['Idle-0', 'TurnLeft-0.85', 'TurnRight-0.85', 'Dive-0.75',
                                 'Rise-0.75', 'Attack-0.25', 'Attack-0.45', 'Attack-0.65',
                                 'Heavy-0.3', 'Heavy-0.55', 'Bite-0.09', 'Dodge-0.25'],
    'review-actions-sheet': ['Hit-0.3', 'Stagger-0.6', 'Death-1.5', 'Grab-0.55',
                             'Eat-0.42', 'Breath-1.2', 'Breathe-1.5', 'Growth-0.75'],
    'review-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.09',
                           'mouth-below-Bite-0.09', 'mouth-Attack-0.45',
                           'mouth-below-Attack-0.45', 'mouth-Eat-0.42', 'mouth-below-Eat-0.42']})
