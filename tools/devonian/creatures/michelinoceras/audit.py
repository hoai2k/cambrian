"""Reproduce actual-full/LOD ocular-organ and every-lens checks in one Blender process."""
import runpy,sys
from pathlib import Path
H=Path(__file__).resolve().parent;L=H.parents[3].parent/'devonian-authoring/michelinoceras/v1'
for suffix in ['full','lod']:
 sys.argv=['blender','--',str(L/('audit-'+suffix)),str(H/'audit-selectors.json')]
 runpy.run_path(str(H.parents[1]/'eye-audit.py'),run_name='__main__')
print('MICHELINOCERAS_ALL_EYE_AUDITS_COMPLETE',flush=True)
