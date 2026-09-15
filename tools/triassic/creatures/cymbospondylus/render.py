"""Render the exported Cymbospondylus: the clips at chosen phases, the diagnostic views and
the mouth, from the re-imported GLB rather than from the authoring scene.

  /opt/blender/blender -b --factory-startup --python tools/triassic/creatures/cymbospondylus/render.py \
      -- [--decoded] [--twin] [--mouth-only] [--portraits]

Portraits go into this directory's `portraits/`, never into `public/assets/`: until a human decides
this body ships, the roster's placeholder cards cut from the canonical pose stay where they are.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / '_pipeline'))
import creature_render as C                                              # noqa: E402

PHASES = [('Idle', 0), ('Swim', 0), ('Swim', 0.55), ('Swim', 1.1), ('Swim', 1.65), ('Sprint', 0), ('Sprint', 0.35), ('Sprint', 0.7), ('TurnLeft', 0.9), ('TurnRight', 0.9), ('Dive', 0.8), ('Rise', 0.8), ('Attack', 0.12), ('Attack', 0.34), ('Attack', 0.46), ('Attack', 0.7), ('Bite', 0.25), ('Heavy', 0.2), ('Heavy', 0.6), ('Lunge', 0.3), ('Lunge', 0.72), ('Hit', 0.3), ('Death', 1.6), ('Guard', 0.6), ('Parry', 0.2), ('Dodge', 0.25), ('Eat', 0.45), ('Stagger', 0.6), ('Ability', 0.5), ('Grab', 0.55), ('Breath', 1.3), ('Breathe', 1.6), ('Growth', 0.75)]
TOP = [('Swim', 0), ('Swim', 0.28), ('Swim', 0.55), ('Swim', 0.83), ('Swim', 1.1), ('Sprint', 0), ('Sprint', 0.35), ('Sprint', 0.7), ('Attack', 0.12), ('Attack', 0.34), ('Attack', 0.46), ('Attack', 0.7)]
MOUTH = [('Idle', 0), ('Bite', 0.25), ('Attack', 0.42), ('Lunge', 0.6)]

C.run('cymbospondylus', PHASES, TOP, MOUTH, mouth_scale=1.3)
