"""Run the current individually authored Blender model; writes local candidates."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("build_v3.py")), run_name="__main__")
