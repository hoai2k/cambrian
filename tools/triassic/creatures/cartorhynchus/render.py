"""Render the exported Cartorhynchus: the clips at chosen phases, the diagnostic views and
the mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cartorhynchus/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', 0.35), ('Swim', 0.7), ('Swim', 1.05), ('Sprint', 0), ('Sprint', 0.22), ('Sprint', 0.45), ('TurnLeft', 0.6), ('TurnRight', 0.6), ('Dive', 0.6), ('Rise', 0.6), ('Attack', 0.14), ('Attack', 0.36), ('Attack', 0.5), ('Bite', 0.2), ('Heavy', 0.25), ('Heavy', 0.55), ('Haul', 0.1), ('Haul', 0.35), ('Haul', 0.6), ('Haul', 0.85), ('Hit', 0.25), ('Death', 1.3), ('Guard', 0.55), ('Parry', 0.18), ('Dodge', 0.22), ('Eat', 0.4), ('Stagger', 0.55), ('Ability', 0.25), ('Ability', 0.45), ('Grab', 0.5), ('Breath', 1.0), ('Breathe', 1.4), ('Growth', 0.6)]
TOP = [('Swim', 0), ('Swim', 0.18), ('Swim', 0.35), ('Swim', 0.53), ('Swim', 0.7), ('Sprint', 0), ('Sprint', 0.22), ('Sprint', 0.45), ('Haul', 0.1), ('Haul', 0.35), ('Haul', 0.6), ('Haul', 0.85)]
MOUTH = [('Idle', 0), ('Bite', 0.2), ('Ability', 0.25), ('Attack', 0.4)]

C.run('cartorhynchus', PHASES, TOP, MOUTH, mouth_scale=1.9)
