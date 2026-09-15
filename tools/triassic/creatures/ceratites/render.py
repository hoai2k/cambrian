"""Render the exported Ceratites: the clips at chosen phases, the diagnostic views and the mouth,
from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/ceratites/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
The twin's portrait is the exception the pipeline names, and lands in `public/`.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Idle', 1.3), ('Swim', 0), ('Swim', 0.25), ('Swim', 0.5), ('Swim', 0.75),
          ('Swim', 1.0), ('Sprint', 0), ('Sprint', 0.14), ('Sprint', 0.3), ('TurnLeft', 0.8),
          ('TurnRight', 0.8), ('Dive', 0.7), ('Rise', 0.7), ('Attack', 0.14), ('Attack', 0.44),
          ('Attack', 0.7), ('Bite', 0.25), ('Heavy', 0.6), ('Heavy', 1.0), ('Hit', 0.3),
          ('Death', 1.4), ('Guard', 0.6), ('Parry', 0.2), ('Dodge', 0.25), ('Eat', 0.4),
          ('Stagger', 0.55), ('Ability', 0.6), ('Grab', 0.6), ('Breath', 1.2), ('Growth', 0.75)]
TOP = [('Swim', 0), ('Swim', 0.25), ('Swim', 0.5), ('Swim', 0.75), ('Sprint', 0), ('Sprint', 0.14),
       ('TurnLeft', 0.8), ('TurnRight', 0.8), ('Heavy', 0.6), ('Grab', 0.6)]
MOUTH = [('Idle', 0), ('Bite', 0.25), ('Attack', 0.44), ('Eat', 0.4)]

C.run('ceratites', PHASES, TOP, MOUTH, mouth_scale=1.6)
