"""Prepare current V3 metadata and anchor specification in local release staging."""
from pathlib import Path
import json,hashlib,runpy,sys
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[4];LOCAL=ROOT.parent/'devonian-authoring/titanichthys/rework-v3'
OUT=LOCAL/'release-candidate08';SOURCE=LOCAL/'candidate-06/titanichthys.json';sys.dont_write_bytecode=True
meta=json.loads(SOURCE.read_text());meta['notes']=meta['notes'][:4]+[
 'Deep armored cranial and thoracic volume, a lined edentulous mouth, separate upper-cranial and lower-jaw bones, a deforming oral floor, six muscular tail sections and articulated long-fin trim.',
 'The revised oral skinning retains the broad feeding gape. Both globes are seated deeper along their original socket axes; orbital rim, eye size and skull attachment are preserved.',
 'Regional full-model PBR retains the 4096-pixel body albedo, with a reviewed vector-filtered 2048-pixel body normal. The reduced model retains vertex pigmentation and all 18 authored actions.',
 'Refined preview model: close-up reduced-model surface polish, broader controller playtesting and dependent environment illustration updates remain pending.'
]
assert not (OUT/'titanichthys.json').exists();(OUT/'titanichthys.json').write_text(json.dumps(meta,indent=2)+'\n')
anchors=runpy.run_path(str(HERE/'rig_actions_01.py'))['ANCHORS'];assert [x['name']for x in anchors]==meta['anchors']
(OUT/'anchors.json').write_text(json.dumps({'titanichthys':anchors},indent=2)+'\n')
print('Prepared local metadata and five anatomical anchors; public unchanged')
