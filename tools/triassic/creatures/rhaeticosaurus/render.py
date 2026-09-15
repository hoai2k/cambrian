"""Render the exported Rhaeticosaurus: the clips at chosen phases, the diagnostic views and the
mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/rhaeticosaurus/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
The one exception is the twin's `<id>.puppet.png`, which the specimen viewer draws.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', 0.22), ('Swim', 0.45), ('Swim', 0.68),
          ('Sprint', 0), ('Sprint', 0.14), ('Sprint', 0.28), ('Sprint', 0.42),
          ('TurnLeft', 0.8), ('TurnRight', 0.8), ('Dive', 0.7), ('Rise', 0.7),
          ('Attack', 0.2), ('Attack', 0.4), ('Attack', 0.6), ('Bite', 0.12),
          ('Heavy', 0.3), ('Heavy', 0.6), ('Ability', 0.15), ('Ability', 0.35),
          ('Ability', 0.55), ('Ability', 0.8), ('Glide', 0.8), ('Hit', 0.3), ('Death', 1.4),
          ('Guard', 0.6), ('Parry', 0.2), ('Dodge', 0.25), ('Eat', 0.4), ('Stagger', 0.6),
          ('Grab', 0.55), ('Breath', 1.2), ('Breathe', 1.5), ('Growth', 0.75)]
TOP = [('Swim', 0), ('Swim', 0.22), ('Swim', 0.45), ('Swim', 0.68),
       ('Sprint', 0), ('Sprint', 0.14), ('Sprint', 0.28), ('Sprint', 0.42),
       ('Ability', 0.15), ('Ability', 0.35), ('Ability', 0.55), ('Ability', 0.8)]
MOUTH = [('Idle', 0), ('Bite', 0.1), ('Heavy', 0.55), ('Eat', 0.4)]

C.run('rhaeticosaurus', PHASES, TOP, MOUTH, mouth_scale=1.2)
