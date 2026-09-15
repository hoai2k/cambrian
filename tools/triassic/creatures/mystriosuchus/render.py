"""Render the exported Mystriosuchus: the clips at chosen phases, the diagnostic views and the
mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/mystriosuchus/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
The one exception is the twin's `<id>.puppet.png`, which the specimen viewer draws.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Crawl', 0), ('Crawl', 0.42), ('Crawl', 0.85), ('Crawl', 1.27),
          ('Swim', 0), ('Swim', 0.45), ('Sprint', 0), ('Sprint', 0.28),
          ('TurnLeft', 0.8), ('TurnRight', 0.8), ('Dive', 0.7), ('Rise', 0.7),
          ('Attack', 0.2), ('Attack', 0.45), ('Bite', 0.1),
          ('Heavy', 0.35), ('Heavy', 0.7), ('Ability', 0.3), ('Ability', 0.6),
          ('Lower', 0.4), ('Lower', 1.1), ('Lower', 1.45),
          ('SnapLeft', 0.15), ('SnapLeft', 0.35), ('SnapLeft', 0.55),
          ('SnapRight', 0.35), ('Retract', 0.4), ('Retract', 0.85),
          ('Hit', 0.3), ('Death', 1.4), ('Guard', 0.6), ('Parry', 0.2), ('Dodge', 0.25),
          ('Eat', 0.4), ('Stagger', 0.6), ('Grab', 0.55), ('Breath', 1.1), ('Breathe', 1.5),
          ('Growth', 0.75)]
TOP = [('Crawl', 0), ('Crawl', 0.42), ('Crawl', 0.85), ('Crawl', 1.27),
       ('Swim', 0), ('Swim', 0.45), ('Sprint', 0), ('Sprint', 0.28),
       ('SnapLeft', 0.15), ('SnapLeft', 0.35), ('SnapLeft', 0.55), ('SnapRight', 0.35)]
MOUTH = [('Idle', 0), ('Bite', 0.1), ('Heavy', 0.6), ('SnapLeft', 0.35)]

C.run('mystriosuchus', PHASES, TOP, MOUTH, mouth_scale=1.2)
