"""Doryaspis V2 reproducible entry point; local candidate output by default."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('build_v2.py')),run_name='__main__')
