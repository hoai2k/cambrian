"""Assemble the review sheets from the renders of the exported Mystriosuchus GLB.

One column, the authored body alone. Run after render.py has produced `authored-review/`:

  python3 tools/triassic/creatures/mystriosuchus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('mystriosuchus', {
    'review-volume-sheet': ['side', 'top', 'front'],
    'review-gait-sheet': ['Crawl-0', 'Crawl-0.42', 'Crawl-0.85', 'Crawl-1.27',
                          'Crawl-0-top', 'Crawl-0.42-top', 'Crawl-0.85-top', 'Crawl-1.27-top',
                          'Swim-0', 'Swim-0.45', 'Sprint-0', 'Sprint-0.28',
                          'Swim-0-top', 'Swim-0.45-top', 'Sprint-0-top', 'Sprint-0.28-top'],
    'review-shore-sheet': ['Lower-0.4', 'Lower-1.1', 'Lower-1.45',
                           'SnapLeft-0.15', 'SnapLeft-0.35', 'SnapLeft-0.55',
                           'SnapRight-0.35', 'Retract-0.4', 'Retract-0.85',
                           'SnapLeft-0.15-top', 'SnapLeft-0.35-top', 'SnapRight-0.35-top'],
    'review-deformation-sheet': ['Idle-0', 'TurnLeft-0.8', 'TurnRight-0.8', 'Dive-0.7',
                                 'Rise-0.7', 'Attack-0.2', 'Attack-0.45', 'Bite-0.1',
                                 'Heavy-0.35', 'Heavy-0.7', 'Ability-0.3', 'Ability-0.6'],
    'review-actions-sheet': ['Hit-0.3', 'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Dodge-0.25',
                             'Eat-0.4', 'Death-1.4', 'Grab-0.55', 'Breath-1.1', 'Breathe-1.5',
                             'Growth-0.75'],
    'review-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.1',
                           'mouth-below-Bite-0.1', 'mouth-Heavy-0.6', 'mouth-below-Heavy-0.6',
                           'mouth-SnapLeft-0.35', 'mouth-below-SnapLeft-0.35']})
