"""Assemble the review sheets from the renders of the exported Birgeria GLB.

One column, the authored body alone: the twin's pairing is verified by the audit's parity checks,
and a twin has no fin rays and no lip corners, so a clip that reads perfectly on it can be tearing
the shipping body. Run after render.py has produced `authored-review/`:

  python3 tools/triassic/creatures/birgeria/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('birgeria', {
    'review-volume-sheet': ['side', 'top', 'front'],
    'review-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.28', 'Swim-0.55', 'Swim-0.83',
                                 'TurnLeft-0.5', 'TurnRight-0.5', 'Dive-0.5', 'Rise-0.5',
                                 'Attack-0.1', 'Attack-0.25', 'Attack-0.42', 'Attack-0.6',
                                 'Bite-0.12'],
    'review-beat-sheet': ['Swim-0-top', 'Swim-0.14-top', 'Swim-0.28-top', 'Swim-0.41-top',
                          'Swim-0.55-top', 'Sprint-0-top', 'Sprint-0.16-top', 'Sprint-0.32-top'],
    'review-faststart-sheet': ['FastStart-0.08', 'FastStart-0.16', 'FastStart-0.3',
                               'FastStart-0.45', 'FastStart-0.05-top', 'FastStart-0.14-top',
                               'FastStart-0.24-top', 'FastStart-0.4-top'],
    'review-actions-sheet': ['Sprint-0', 'Sprint-0.16', 'Sprint-0.32', 'Heavy-0.2', 'Heavy-0.5',
                             'Hit-0.2', 'Stagger-0.5', 'Guard-0.5', 'Parry-0.15', 'Dodge-0.2',
                             'Eat-0.35', 'Death-1.3', 'Ability-0.45', 'Grab-0.5', 'Breath-0.9',
                             'Growth-0.6'],
    'review-mouth-sheet': ['Gape-0.3', 'Gape-0.6', 'mouth-Idle-0', 'mouth-below-Idle-0',
                           'mouth-Bite-0.12', 'mouth-below-Bite-0.12', 'mouth-Heavy-0.5',
                           'mouth-below-Heavy-0.5', 'mouth-Gape-0.45', 'mouth-below-Gape-0.45']})
