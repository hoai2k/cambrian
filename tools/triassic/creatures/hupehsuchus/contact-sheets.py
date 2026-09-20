"""Assemble the paired review sheets from the renders of the exported Hupehsuchus GLBs.

Run after render.py has produced both `authored-review/` and `twin-review/`:

  python3 tools/triassic/creatures/hupehsuchus/contact-sheets.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import sheets as S                                                       # noqa: E402

S.build('hupehsuchus', {'paired-volume-sheet': ['side', 'top', 'front'], 'paired-deformation-sheet': ['Idle-0', 'Swim-0', 'Swim-0.4', 'Swim-0.8', 'Swim-1.2', 'TurnLeft-0.75', 'TurnRight-0.75', 'Dive-0.7', 'Rise-0.7', 'Attack-0.14', 'Attack-0.36', 'Attack-0.5', 'Bite-0.25'], 'paired-wave-sheet': ['Swim-0-top', 'Swim-0.2-top', 'Swim-0.4-top', 'Swim-0.6-top', 'Swim-0.8-top', 'Sprint-0-top', 'Sprint-0.27-top', 'Sprint-0.55-top'], 'paired-gulp-sheet': ['Gulp-0.2', 'Gulp-0.38', 'Gulp-0.55', 'Gulp-0.8', 'Ability-0.3', 'Ability-0.7', 'Ability-1.4', 'Gulp-0.2-top', 'Gulp-0.38-top', 'Gulp-0.55-top', 'Ability-0.7-top'], 'paired-actions-sheet': ['Sprint-0', 'Sprint-0.27', 'Sprint-0.55', 'Heavy-0.25', 'Heavy-0.6', 'Hit-0.3', 'Stagger-0.6', 'Guard-0.6', 'Parry-0.2', 'Dodge-0.25', 'Eat-0.5', 'Death-1.4', 'Grab-0.55', 'Breath-1.2', 'Breathe-1.5', 'Growth-0.7'], 'paired-mouth-sheet': ['mouth-Idle-0', 'mouth-below-Idle-0', 'mouth-Gulp-0.38', 'mouth-below-Gulp-0.38', 'mouth-Ability-0.3', 'mouth-below-Ability-0.3', 'mouth-Attack-0.4', 'mouth-below-Attack-0.4']})
