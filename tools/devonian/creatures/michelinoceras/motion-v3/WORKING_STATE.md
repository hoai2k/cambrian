# Michelinoceras motion-v3 working state

## 2026-09-08 13:36 UTC — Michelinoceras — bounded source audit and frozen handoff

- Owner/model: Astra high; independent Michelinoceras scope from parent.
- Status: candidate-ready **source only**, pending Terra export and Astra review.
- Decision: reuse all ten existing 16-section skinned arms and the original
  silhouette/materials. Change Attack/Bite/Heavy/Eat only. Keep every other
  action, all 166 joints and original head mouth/swallow anchors. Add arm-led
  grasp and ten independently articulated attack contacts. Eat is non-looping
  and uses real consumption phases 0/.22/.78/1.
- Inputs: absolute paths, sizes and hashes in `frozen-inputs.json` and
  `source-audit.json`; original blend SHA-256
  `dbd8ff9c84e476b69442e8ec340f8ca97e02f9e9d6e49ab8fea72bdaaf09de20`.
- Source: this new motion-v3 directory; durable exact snapshot in
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/motion-v3/source/`.
- Checks completed: all source parses; actual original full/LOD rig, clip and
  anchor metadata decoded. Pure numerical FK/CCD probe used actual exported
  rest transforms, maximum lead grasp error after pickup 0.001847 model units,
  maximum other-arm contact error 0.019857. This does not prove visual quality.
- Design correction during preflight: common pickup moved within shorter arms'
  reach; bounded contact passes set to 40 for stable initial contact without
  bone scaling. Original art, public files and frozen v1 were not changed.
- Execution: **none**. No Blender started by this author. Parent owns the
  Terra CPU/two-thread queue. Exact four command groups are in README.md.
- Expected outputs: new candidate-01 full blend, full/LOD GLBs, metadata, all
  sampled arm/contact positions, preserved-action fingerprints, output hashes,
  contract report and actual exported full/LOD pose sequences.
- Acceptance: inspect changed full/LOD crown side and oblique poses for clear
  anticipation → sectional whip → distal hook → recovery; progress Eat must
  retain credible arm curvature and place food at actual oral opening. Check
  kinks, arm/head intersections and grasp contact; preserve shell/material.
  No generic old eye audit has been requested or treated as new-model evidence.
- Runtime note to parent: existing feeding carry arc uses 0.13 total visible
  shell length and can exceed this short arm crown's reach. Runtime progress
  integration and actual-prey tests follow model review; proxy renders alone
  cannot approve gameplay attachment.
- Resource used/remaining: one bounded source audit, one authoring pass, two
  numerical reach probes; zero Blender execution groups. Next budget is one
  frozen build, one contract check and full/LOD evidence render groups.
- Stop condition: hash mismatch, unexpected execution error, occupied output
  directory, contract failure, or anatomy/motion judgment returns to Astra.
- Resume: parent dispatches README command group 1 to Terra after checking
  frozen-input hashes; do not overwrite/reuse any prior candidate directory.


## 2026-09-08 13:48 UTC — candidate-01 exported; root-channel failure diagnosed

- Owner/model: Astra high; read-only exported evidence review.
- Status: contract PASS with separate validator revision 2; visual review needed.
- Parent executed original frozen build successfully. Candidate full SHA-256
  `6578d9f6d1ca05d91520f17ceb8a73d484fb0f0cbb9b1ac5da11c7698c79446e`;
  LOD SHA-256 `fb23383110182f27d2e69fd2629f2a1ea8013206e87e6088e7613ee10a4e1719`.
- Original validator stopped at its blanket root-channel absence assertion.
  Decoded full has 57 and LOD 21 root channels: translation, rotation and scale
  each have two STEP samples exactly equal to the original static root bind
  transform. Maximum deviation is zero. Original v1 omitted those redundant
  channels. This is exporter key emission, not authored root movement.
- Decision: preserve candidate-01, original validator and frozen manifest. Add
  separate `validate_candidate_v2.py` which checks every root sample against
  unchanged original bind values; quaternion sign equivalence is allowed,
  unit norm and finiteness are required, nonconstant movement fails, and cubic
  tangent interpolation requires a separate audit. This replaces an invalid
  absence test with a strict motion-invariance test, not a relaxed motion limit.
- Executed: `python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/michelinoceras/motion-v3/validate_candidate_v2.py` — PASS. Geometry POSITION/NORMAL/UV/WEIGHTS payloads
  exactly match original full. Full/LOD have expected 19/7 clips, 166 joints and
  13 sockets. Every-frame Eat contact maximum residual is 0.01985635 model units.
- Evidence/snapshot/new hashes: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/motion-v3/validation-review-01`.
  Original frozen inputs, candidate assets and original snapshot unchanged.
- No Blender run or new renders by this author; no art acceptance, runtime
  acceptance, public writes, shared docs or Git actions.
- Resume: parent runs original frozen `render_candidate.py` with MIC_DETAIL=full
  and then MIC_DETAIL=lod, CPU/two threads. Return actual exported crown side/
  oblique Attack/Heavy/Bite/Eat sequence evidence for my review. Require clear
  flare-before-whip, travelling bend with unequal arm timing, smooth contact
  basket, distal wrapping and real oral transfer without arm/head intersections.
  Reject rather than infer approval from numeric contact or original eye audits.
