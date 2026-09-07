"""Canonical entry point for the reviewed V2 Dunkleosteus authoring pipeline."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('build_v2.py')),run_name='__main__')
