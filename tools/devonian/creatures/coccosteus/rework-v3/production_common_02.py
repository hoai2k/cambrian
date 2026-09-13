"""Local immutable-input and geometric fingerprint helpers. No scene execution."""
from pathlib import Path
import hashlib,json,struct
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[4].parent/'devonian-authoring/coccosteus/rework-v3'
SOURCE=ROOT/'material-04/coccosteus-material-04.blend'
SOURCE_SHA='2bd0d3da5ed2ad73801e200325b51f3c776989e027d01020e196838f10e633c9'
REPORT=ROOT/'material-04/material-report.json'
REPORT_SHA='d01c4be81cc558584fbf2bfe18508fa8b32ef1c16f6e5cbb7e55bf68d1becfad'
MANIFEST=ROOT/'material-04/render-manifest.json'
MANIFEST_SHA='a7165aa26944f98deac59ad760914ed79699f86e7bc8621f3215ba2436639481'
BAKE=ROOT/'baked-01';OUT=ROOT/'candidate-02'
SOURCE_NAMES=('production_common_02.py','bake_01.py','atlas_pigment_01.py','rig_actions_01.py','candidate_02.py','export_patch_02.py','render_candidate_02.py','check_candidate_02.py','metadata_seed_01.json')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def verify():
    for p,h in [(SOURCE,SOURCE_SHA),(REPORT,REPORT_SHA),(MANIFEST,MANIFEST_SHA)]:
        if sha(p)!=h:raise RuntimeError('Frozen material04 input mismatch '+str(p))
    for row in json.loads((HERE/'frozen-candidate-02.json').read_text())['inputs']:
        if sha(row['path'])!=row['sha256']:raise RuntimeError('Frozen source changed '+row['path'])
def sources():return {name:sha(HERE/name)for name in SOURCE_NAMES}
def geo_hash(ob):
    h=hashlib.sha256()
    for v in ob.data.vertices:h.update(struct.pack('<3f',*v.co))
    for p in ob.data.polygons:
        h.update(struct.pack('<I',len(p.vertices)));h.update(struct.pack('<'+'I'*len(p.vertices),*p.vertices))
    for row in ob.matrix_world:h.update(struct.pack('<4f',*row))
    if ob.data.shape_keys:
        for key in ob.data.shape_keys.key_blocks:
            h.update(key.name.encode())
            for v in key.data:h.update(struct.pack('<3f',*v.co))
    return h.hexdigest()
def record(path):return {'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path)}
def check_sources(report):
    verify()
    for name,h in report['source_sha256'].items():
        if sha(HERE/name)!=h:raise RuntimeError('Stage source changed '+name)
