"""Render the exported Odontochelys: the clips at chosen phases, the diagnostic views and the
mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/odontochelys/render.py \
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
          ('Crawl', 0.3), ('Crawl', 0.85), ('Crawl', 1.4),
          ('TurnLeft', 0.85), ('TurnRight', 0.85), ('Dive', 0.75), ('Rise', 0.75),
          ('Attack', 0.25), ('Attack', 0.45), ('Attack', 0.65), ('Bite', 0.09),
          ('Heavy', 0.3), ('Heavy', 0.55),
          ('Ability', 0.2), ('Ability', 0.45), ('Ability', 0.7), ('Ability', 1.1),
          ('Hit', 0.3), ('Death', 1.5), ('Guard', 0.65), ('Parry', 0.2), ('Dodge', 0.25),
          ('Eat', 0.42), ('Stagger', 0.6), ('Grab', 0.55), ('Breath', 1.2), ('Breathe', 1.5),
          ('Growth', 0.75)]
TOP = [('Swim', 0), ('Swim', 0.25), ('Swim', 0.5), ('Swim', 0.75),
       ('Sprint', 0), ('Sprint', 0.15), ('Sprint', 0.3), ('Sprint', 0.45),
       ('Crawl', 0.3), ('Crawl', 0.85), ('Crawl', 1.4), ('Ability', 0.45)]
MOUTH = [('Idle', 0), ('Bite', 0.09), ('Attack', 0.45), ('Eat', 0.42)]

C.run('odontochelys', PHASES, TOP, MOUTH, mouth_scale=0.85)
