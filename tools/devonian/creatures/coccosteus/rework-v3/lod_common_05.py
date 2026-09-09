"""Frozen LOD-only amendment inputs; accepted full and rig remain immutable."""
from pathlib import Path
import json,hashlib
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
PREVIOUS=ROOT/'candidate-04';PLAN=ROOT/'lod-plan-05';OUT=ROOT/'candidate-05'
SOURCE_NAMES=('lod_common_05.py','lod_plan_05.py','check_lod_plan_05.py','build_lod_05.py','render_lod_05.py','check_candidate_05.py','atlas_pigment_01.py','export_patch_02.py','rig_actions_01.py')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def record(p):return {'path':str(p),'bytes':Path(p).stat().st_size,'sha256':sha(p)}
def verify():
    for row in json.loads((HERE/'frozen-lod-05.json').read_text())['inputs']:
        assert sha(row['path'])==row['sha256'],'Frozen LOD05 input changed '+row['path']
def sources():return {n:sha(HERE/n)for n in SOURCE_NAMES}
def check_sources(report):
    verify()
    for name,h in report['source_sha256'].items():assert sha(HERE/name)==h
