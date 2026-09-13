import os
from pathlib import Path
os.environ.setdefault('WAL_PBR','1')
os.environ.setdefault('WAL_EXPORT','1')
exec(compile(Path(__file__).with_name('build_v2.py').read_text(),str(Path(__file__).with_name('build_v2.py')),'exec'))
