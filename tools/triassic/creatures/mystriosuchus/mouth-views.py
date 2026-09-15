"""Photograph the Mystriosuchus gape at the phase each clip's own mouth is widest, from the skull's
own frame, with the backface cull emulated, and measure how much of it is a hole straight through
the head.

  /opt/blender/blender -b --factory-startup --python \
      tools/triassic/creatures/mystriosuchus/mouth-views.py -- local/triassic-authoring/mystriosuchus/mouth
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / '_pipeline'))
import mouth_views as M                                                  # noqa: E402

out = sys.argv[-1] if sys.argv[-1].startswith('local/') else \
    str(HERE.parents[3] / 'local/triassic-authoring/mystriosuchus/mouth')
M.run('mystriosuchus', ['Idle', 'Bite', 'Attack', 'Heavy', 'Ability', 'SnapLeft', 'Eat'], out,
      cam_distance=1.15, ortho=0.7)
