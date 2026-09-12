"""Default to the reviewed V2 candidate-only authoring pipeline. V1 is preserved locally."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name("build_v2.py")),run_name="__main__")
