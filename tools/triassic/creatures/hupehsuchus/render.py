"""Render the exported Hupehsuchus: the clips at chosen phases, the diagnostic views and
the mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/hupehsuchus/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', 0.4), ('Swim', 0.8), ('Swim', 1.2), ('Sprint', 0), ('Sprint', 0.27), ('Sprint', 0.55), ('TurnLeft', 0.75), ('TurnRight', 0.75), ('Dive', 0.7), ('Rise', 0.7), ('Attack', 0.14), ('Attack', 0.36), ('Attack', 0.5), ('Bite', 0.25), ('Heavy', 0.25), ('Heavy', 0.6), ('Gulp', 0.2), ('Gulp', 0.38), ('Gulp', 0.55), ('Gulp', 0.8), ('Hit', 0.3), ('Death', 1.4), ('Guard', 0.6), ('Parry', 0.2), ('Dodge', 0.25), ('Eat', 0.5), ('Stagger', 0.6), ('Ability', 0.3), ('Ability', 0.7), ('Ability', 1.4), ('Grab', 0.55), ('Breath', 1.2), ('Breathe', 1.5), ('Growth', 0.7)]
TOP = [('Swim', 0), ('Swim', 0.2), ('Swim', 0.4), ('Swim', 0.6), ('Swim', 0.8), ('Sprint', 0), ('Sprint', 0.27), ('Sprint', 0.55), ('Gulp', 0.2), ('Gulp', 0.38), ('Gulp', 0.55), ('Ability', 0.7)]
MOUTH = [('Idle', 0), ('Gulp', 0.38), ('Ability', 0.3), ('Attack', 0.4)]

C.run('hupehsuchus', PHASES, TOP, MOUTH, mouth_scale=1.6)
