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


## 2026-09-08 14:02 UTC — candidate-01 — scoped exported motion-art approval

- Owner/model: Astra high. Status: **APPROVED FOR RUNTIME INTEGRATION REVIEW**,
  limited to reviewed motion art; not shipping, gameplay or general anatomy.
- Reviewed all 60 actual exported pose images in 13 labelled sheets plus ten
  native-size critical closeups. Flare → sectional curl/hook → recovery reads
  clearly. Eat .22 contact, .48 curved basket and .78–1 oral cupping are credible
  in both detail levels. No blocking deformation found in these views.
- Full/LOD Attack/Bite/Heavy/Eat have exact channel/time/value parity, 498
  semantic tracks per clip. Small jaw visibility and dense late mouth cupping
  are recorded limits, not new anatomy proposals.
- Hash-bound verdict and complete image inventory: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/motion-v3/visual-review-01`.
  Verdict SHA-256 `993ef6fbf43e27cb2615aebc2f3b4b951bf3b95efad09beee3ffa07e86369e61`.
- Source/candidate correction: none justified. Preserve the frozen inputs and
  candidate-01. No Blender, public asset, Git or shared-doc mutation by reviewer.
- Next: parent integrates progress-driven Eat and a crown-reachable carry path
  in isolated runtime review, then validates actual prey attachment, oral
  transfer, swallow, cancellation and full/LOD continuous clip transitions.
  The cyan proxy starts attached; it does not approve real pickup/swallow.
- Remaining resource scope: no further authoring loop requested unless runtime
  evidence or parent review demonstrates a specific defect.


## 2026-09-08T14:32:45.707655+00:00 — bounded runtime and isolated packaging

- Owner/model: Astra high, explicitly assigned runtime files and packaging by
  parent. `creature.ts` reads asset-scene authored-grasp metadata only; old
  Michelin remains opted out and Opabinia retains its existing route.
- `attachments.ts` follows authored grasp carry with bounded per-arm pickup
  correction, zero correction by .78, oral-dimension aperture, actual-contact
  gate, and safe cancellation/target/view reset. Large or unreachable bodies
  remain at simulation position. No source art/action changes.
- New extras-only assets: `runtime-candidate-01`; original approved binary
  chunks and every non-extra document property were verified unchanged.
- Production full/LOD + actual Furcaster prey checks PASS at 12 scale/orientation
  combinations, including moving predator, 40,560 skinned vertex samples, exact
  late pose vs independent raw mixer, mid-feed interruption, target/LOD swap,
  unreachable/extension-limit/multi-bite/oversize safety, and old Michelin /
  actual Opabinia regression. Repeated on compressed derivatives: PASS.
- Real isolated package outputs `runtime-packaged-01`: 19 full and 7 LOD clips;
  exact meshopt round-trip, 13 sockets and scene metadata survive. Opt-out
  control retains old 3-clip LOD rule. Public Michelin + 126 Cambrian assets
  unchanged. `package.mjs` now supports DEVONIAN_ASSETS candidate root and
  keeps four performances only for asset metadata opt-in.
- Typecheck/build PASS; existing Toolbar/App circular-chunk warning unchanged.
- Parent additionally authorizes strict intake handling of static identity
  scale channels plus adversarial regression. That bounded distinction is next;
  no actual scale motion will be allowed. Browser/gameplay visual review and
  publication remain parent-owned. No Blender, public or Git mutation.


## 2026-09-08T14:46:23.244319+00:00 — final canonical compressed runtime handoff

- Owner/model: Astra high. Status: bounded runtime/package/intake work complete;
  parent browser/controller review and publication remain outstanding.
- Strict identity intake first rejected non-root Blender scale noise; original
  runtime-intake-01 and candidates preserved. Parent authorized hash-bound
  exporter-noise canonicalization, not a checker tolerance. New runtime-canonical-01
  changes only scale values within 5e-7; each changed sample/bind is recorded.
  Original binary prefix, geometry, rotation/location channels and materials
  unchanged. 127,605 real skinned vertex probes show maximum posed displacement
  4.956867291381293e-7 model units; local rotations/translations exactly equal.
- Actual canonical package runtime-packaged-02 PASS: full 19 / LOD 7 clips,
  13 sockets and opt-in metadata retained; opt-out policy stays 3 LOD clips.
  Public Michelinoceras and 126 Cambrian assets unchanged.
- Strict real intake runtime-intake-02 PASS: 4,316 exact identity scale channels;
  ten adversarial nonidentity/nonfinite/cubic curves rejected. No scale-motion
  tolerance in check.mjs. Final family is runtime-intake-02/family; original
  Idle portraits are explicitly reused, not new feeding renders.
- Actual canonical compressed runtime-review-packaged-02 PASS: 12 full/LOD
  scale/orientation scenarios, 40,560 skinned vertex probes, real prey, pickup/
  carry/swallow, interruption/target/LOD reset, unreachable/large bodies, exact
  late authored cupping, and old Michelinoceras/Opabinia regressions.
- Final full SHA 646fe1ec885296d6195783fb9fc591d49e5c7212d0d11a0214ed5aecb0495cc1;
  LOD SHA c1005758eee00eaca5b1e73ace492a5fcc5fda3ec60f5cb21c880e00e5fabf82.
- Frozen current source/evidence handoff: runtime-handoff-01, with exact source
  snapshots and manifest. See RUNTIME_HANDOFF.md. No Blender/public/Git writes.
