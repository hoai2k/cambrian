"""Render the exported Birgeria: the clips at chosen phases, the diagnostic views and the mouth,
from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/birgeria/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
The one exception is the twin's `<id>.puppet.png`, which the specimen viewer draws.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', 0.28), ('Swim', 0.55), ('Swim', 0.83),
          ('Sprint', 0), ('Sprint', 0.16), ('Sprint', 0.32), ('TurnLeft', 0.5), ('TurnRight', 0.5),
          ('Dive', 0.5), ('Rise', 0.5), ('Attack', 0.1), ('Attack', 0.25), ('Attack', 0.42),
          ('Attack', 0.6), ('Bite', 0.12), ('Heavy', 0.2), ('Heavy', 0.5), ('Gape', 0.3),
          ('Gape', 0.6), ('FastStart', 0.08), ('FastStart', 0.16), ('FastStart', 0.3),
          ('FastStart', 0.45), ('Hit', 0.2), ('Death', 1.3), ('Guard', 0.5), ('Parry', 0.15),
          ('Dodge', 0.2), ('Eat', 0.35), ('Stagger', 0.5), ('Ability', 0.45), ('Grab', 0.5),
          ('Breath', 0.9), ('Growth', 0.6)]
TOP = [('Swim', 0), ('Swim', 0.14), ('Swim', 0.28), ('Swim', 0.41), ('Swim', 0.55),
       ('Sprint', 0), ('Sprint', 0.16), ('Sprint', 0.32), ('FastStart', 0.05),
       ('FastStart', 0.14), ('FastStart', 0.24), ('FastStart', 0.4)]
MOUTH = [('Idle', 0), ('Bite', 0.12), ('Heavy', 0.5), ('Gape', 0.45)]

C.run('birgeria', PHASES, TOP, MOUTH, mouth_scale=1.5)
