#!/usr/bin/env bash
# Ship the Odaraia V3 candidate: the one step of the rework that writes into public/assets/creatures/.
#
# Everything before it is done and committed: the rig, clips, LOD and export (rig_v3.py …
# export_v3.py, validate_v3.py all passing), the shell alpha remap (shell_alpha_v3.py, already
# applied to the candidate), the feeding contract in the scene extras, and the renderer's
# translucency fix (src/render/translucency.ts). This script does the pipeline in
# tools/creatures/README.md for one creature and then the intake in docs/creature-intake.md.
#
#   bash tools/creatures/odaraia/rework-v3/integrate_v3.sh [candidate dir]
#
# Needs Blender at /opt/blender/blender for the select portrait and the studio render.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../../../.." && pwd); cd "$ROOT"
C=${1:-$ROOT/../expansion-authoring/odaraia-rework/v3-candidate}
BLENDER=${BLENDER:-/opt/blender/blender}
PUB=public/assets/creatures
test -f "$C/odaraia.glb" && test -f "$C/odaraia.lod1.glb"

# 0. Keep the shipped V2 files beside the candidate (git has them too).
mkdir -p "$C/../backup-v2-public"; cp -n $PUB/odaraia.* "$C/../backup-v2-public/" || true

# 1. Raw candidate in place of the shipped model.
cp "$C/odaraia.glb" "$C/odaraia.lod1.glb" $PUB/

# 2. Anchor manifest: the V3 sockets replace V2's in the arthropod group manifest.
python3 - <<'PY'
import json
m=json.load(open('tools/creatures/arthropods/anchors.json'))
v3=json.load(open('tools/creatures/odaraia/rework-v3/anchors_v3.json'))['odaraia']
keep=['name','bone','point','role','chain','effectorBone','solver','contactType']
m['odaraia']=[{k:r[k] for k in keep if k in r} for r in v3]
open('tools/creatures/arthropods/anchors.json','w').write(json.dumps(m,indent=2)+'\n')
print('anchors.json: odaraia ->',len(m['odaraia']),'sockets')
PY

# 3. Package (lossless meshopt, exact round-trip), then append the sockets, then validate.
node tools/creatures/package-expansion.mjs odaraia
node tools/creatures/add-anchors.mjs odaraia
node tools/creatures/add-anchors.mjs --check

# 4. Portraits: the transparent select render from the decoded model, then the studio render on
#    the dark backdrop (same framing, film not transparent), then cards/thumbnail + fingerprints.
ART=${CAMBRIAN_ART_MODELS:-/tmp/cambrian-art-models}
CAMBRIAN_ART_MODELS="$ART" node tools/art/decode-models.mjs odaraia
CAMBRIAN_ART_MODELS="$ART" "$BLENDER" -b --python tools/art/render-creatures.py -- odaraia
CAMBRIAN_ART_MODELS="$ART" "$BLENDER" -b --python tools/creatures/odaraia/rework-v3/studio_render_v3.py -- odaraia
node tools/make-cards.mjs odaraia
node tools/update-asset-sizes.mjs

# 5. The queue: the rebuild and the articulated attack/feeding pass both landed in this rig.
python3 - <<'PY'
import json
P='src/content/cambrian/pending-refinements.json'; d=json.load(open(P))
d=[e for e in d if e['id']!='odaraia']
open(P,'w').write(json.dumps(d,indent=2)+'\n'); print('odaraia badge and clip flags cleared')
PY

# 6. Checks.
node tools/check-creature-assets.mjs --strict
npm run eras
npm run typecheck
echo "Odaraia V3 integrated. Commit: $PUB/odaraia.* tools/creatures/arthropods/anchors.json src/content/cambrian/pending-refinements.json src/content/*asset-sizes* $PUB/images.json"
