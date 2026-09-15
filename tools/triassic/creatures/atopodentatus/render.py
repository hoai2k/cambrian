"""Render the exported Atopodentatus: the clips at chosen phases, the diagnostic views and the
mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/atopodentatus/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
The one exception is the twin's `<id>.puppet.png`, which the specimen viewer draws.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', 0.25), ('Swim', 0.5), ('Swim', 0.75),
          ('Sprint', 0), ('Sprint', 0.15), ('Sprint', 0.3), ('Sprint', 0.45),
          ('TurnLeft', 0.9), ('TurnRight', 0.9), ('Dive', 0.75), ('Rise', 0.75),
          ('Attack', 0.25), ('Attack', 0.45), ('Attack', 0.65), ('Bite', 0.12),
          ('Heavy', 0.2), ('Heavy', 0.5), ('Heavy', 0.75),
          ('Ability', 0.3), ('Ability', 0.9), ('Ability', 1.6), ('Graze', 0.6),
          ('Hit', 0.3), ('Death', 1.5), ('Guard', 0.65), ('Parry', 0.2), ('Dodge', 0.28),
          ('Eat', 0.45), ('Stagger', 0.65), ('Grab', 0.55), ('Breath', 1.3), ('Breathe', 1.5),
          ('Growth', 0.75)]
TOP = [('Swim', 0), ('Swim', 0.25), ('Swim', 0.5), ('Swim', 0.75),
       ('Sprint', 0), ('Sprint', 0.15), ('Sprint', 0.3), ('Sprint', 0.45),
       ('Heavy', 0.2), ('Heavy', 0.5), ('Heavy', 0.75), ('Ability', 0.9)]
MOUTH = [('Idle', 0), ('Bite', 0.19), ('Attack', 0.46), ('Ability', 0.25), ('Eat', 0.5)]

C.run('atopodentatus', PHASES, TOP, MOUTH, mouth_scale=1.1)
