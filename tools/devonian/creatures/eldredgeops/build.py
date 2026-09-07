import os
from pathlib import Path
os.environ.setdefault('ELD_PBR','1')
os.environ.setdefault('ELD_EXPORT','1')
exec(compile(Path(__file__).with_name('build_v2.py').read_text(),str(Path(__file__).with_name('build_v2.py')),'exec'))
