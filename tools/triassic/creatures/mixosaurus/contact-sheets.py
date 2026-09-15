"""Assemble the paired review sheets from the renders of the exported Mixosaurus GLBs.

Run after render.py has produced both `authored-review/` and `twin-review/`:

  python3 tools/triassic/creatures/mixosaurus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('mixosaurus', {'paired-volume-sheet': ['side', 'top', 'front'], 'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.28', 'Swim-0.55', 'Swim-0.83', 'TurnLeft-0.5', 'TurnRight-0.5', 'Dive-0.5', 'Rise-0.5', 'Attack-0.1', 'Attack-0.25', 'Attack-0.33', 'Attack-0.5', 'Bite-0.12'], 'paired-wave-sheet': ['Swim-0-top', 'Swim-0.14-top', 'Swim-0.28-top', 'Swim-0.41-top', 'Swim-0.55-top', 'Sprint-0-top', 'Sprint-0.18-top', 'Sprint-0.35-top'], 'paired-dart-sheet': ['Dart-0.1', 'Dart-0.18', 'Dart-0.3', 'Dart-0.45', 'Dart-0.05-top', 'Dart-0.15-top', 'Dart-0.25-top', 'Dart-0.4-top'], 'paired-actions-sheet': ['Sprint-0', 'Sprint-0.18', 'Sprint-0.35', 'Heavy-0.2', 'Heavy-0.45', 'Hit-0.2', 'Stagger-0.5', 'Guard-0.5', 'Parry-0.15', 'Dodge-0.2', 'Eat-0.35', 'Death-1.3', 'Ability-0.4', 'Grab-0.5', 'Breath-0.9', 'Breathe-1.2', 'Growth-0.6'], 'paired-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.12', 'mouth-below-Bite-0.12', 'mouth-Attack-0.3', 'mouth-below-Attack-0.3', 'mouth-Heavy-0.4', 'mouth-below-Heavy-0.4']})
