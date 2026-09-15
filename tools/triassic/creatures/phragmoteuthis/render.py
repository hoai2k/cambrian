"""Render the exported Phragmoteuthis: the clips at chosen phases, the diagnostic views and the mouth,
from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/phragmoteuthis/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
The twin's portrait is the exception the pipeline names, and lands in `public/`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Idle', 1.3), ('Swim', 0), ('Swim', 0.22), ('Swim', 0.45), ('Swim', 0.67),
          ('Swim', 0.9), ('Sprint', 0), ('Sprint', 0.13), ('Sprint', 0.28), ('TurnLeft', 0.7),
          ('TurnRight', 0.7), ('Dive', 0.65), ('Rise', 0.65), ('Attack', 0.12), ('Attack', 0.4),
          ('Attack', 0.65), ('Bite', 0.22), ('Heavy', 0.4), ('Heavy', 0.75), ('Hit', 0.27),
          ('Death', 1.4), ('Guard', 0.6), ('Parry', 0.17), ('Dodge', 0.22), ('Eat', 0.37),
          ('Stagger', 0.5), ('Ability', 0.2), ('Ability', 0.6), ('Grab', 0.55), ('Breath', 1.1),
          ('Growth', 0.7)]
TOP = [('Swim', 0), ('Swim', 0.22), ('Swim', 0.45), ('Swim', 0.67), ('Sprint', 0), ('Sprint', 0.13),
       ('TurnLeft', 0.7), ('TurnRight', 0.7), ('Ability', 0.2), ('Grab', 0.55)]
MOUTH = [('Idle', 0), ('Bite', 0.22), ('Attack', 0.4), ('Eat', 0.37)]

C.run('phragmoteuthis', PHASES, TOP, MOUTH, mouth_scale=1.6)
