"""Assemble the paired review sheets from the renders of the exported Cartorhynchus GLBs.

Run after render.py has produced both `authored-review/` and `twin-review/`:

  python3 tools/triassic/creatures/cartorhynchus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('cartorhynchus', {'paired-volume-sheet': ['side', 'top', 'front'], 'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.35', 'Swim-0.7', 'Swim-1.05', 'TurnLeft-0.6', 'TurnRight-0.6', 'Dive-0.6', 'Rise-0.6', 'Attack-0.14', 'Attack-0.36', 'Attack-0.5', 'Bite-0.2'], 'paired-stroke-sheet': ['Swim-0-top', 'Swim-0.18-top', 'Swim-0.35-top', 'Swim-0.53-top', 'Swim-0.7-top', 'Sprint-0-top', 'Sprint-0.22-top', 'Sprint-0.45-top'], 'paired-haul-sheet': ['Haul-0.1', 'Haul-0.35', 'Haul-0.6', 'Haul-0.85', 'Haul-0.1-top', 'Haul-0.35-top', 'Haul-0.6-top', 'Haul-0.85-top'], 'paired-actions-sheet': ['Sprint-0', 'Sprint-0.22', 'Sprint-0.45', 'Heavy-0.25', 'Heavy-0.55', 'Hit-0.25', 'Stagger-0.55', 'Guard-0.55', 'Parry-0.18', 'Dodge-0.22', 'Eat-0.4', 'Death-1.3', 'Ability-0.25', 'Ability-0.45', 'Grab-0.5', 'Breath-1.0', 'Breathe-1.4', 'Growth-0.6'], 'paired-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Bite-0.2', 'mouth-below-Bite-0.2', 'mouth-Ability-0.25', 'mouth-below-Ability-0.25', 'mouth-Attack-0.4', 'mouth-below-Attack-0.4']})
