"""Publish the inspected candidate without altering its mesh/clip payloads.

The original candidate metadata remains immutable. This release derivative removes
obsolete V3 orientation copy and a duplicate note, documenting interpretive anatomy.
"""
from pathlib import Path
import hashlib, json, shutil

ROOT = Path(__file__).resolve().parents[5]
LOCAL = ROOT.parent / 'devonian-authoring/gemuendina/face-v4'
SOURCE = LOCAL / 'candidate-02'
DEST = ROOT / 'public/assets/devonian/creatures'
audit = json.loads((LOCAL / 'audit-candidate-02-03/audit.json').read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for record in audit['records']:
    assert sha(Path(record['asset'])) == record['asset_sha256']
    assert all(e['minimum50'] and e['target65'] for e in record['eyes'])
assert len(audit['records']) == 10
metadata = json.loads((SOURCE / 'gemuendina.json').read_text())
metadata['notes'] = list(dict.fromkeys(n for n in metadata['notes']
    if not n.startswith('Broad low rhenanid form, upward eye/oral orientation')))
metadata['notes'].append('Paired anterior eyes above the leading mouth follow the user reference direction; dorsal eye-like motifs are skin markings, not additional eyes. This living orientation is an artistic reconstruction rather than a fossil certainty.')
report = {'status': 'preview', 'candidate': 'candidate-02', 'files': {},
          'metadata_source_sha256': sha(SOURCE / 'gemuendina.json'),
          'eye_audit_sha256': sha(LOCAL / 'audit-candidate-02-03/audit.json'),
          'remaining': 'Broader final art review, distant LOD crease/pigment cleanup and controller playtest.'}
for suffix in ['glb', 'lod1.glb', 'png', 'select.png', 'card.png', 'thumb.png']:
    name = 'gemuendina.' + suffix
    shutil.copy2(SOURCE / name, DEST / name)
    assert sha(SOURCE / name) == sha(DEST / name)
    report['files'][name] = {'sha256': sha(DEST / name), 'bytes': (DEST / name).stat().st_size}
path = DEST / 'gemuendina.json'
path.write_text(json.dumps(metadata, indent=2) + '\n')
report['files'][path.name] = {'sha256': sha(path), 'bytes': path.stat().st_size}
(LOCAL / 'release-02.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
