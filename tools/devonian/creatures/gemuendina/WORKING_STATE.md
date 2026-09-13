# Gemuendina working state

**Current — 2026-09-07T23:37:05+00:00:** individual candidate02 creative rework ACCEPTED.
Completed actual audit03 PASS (56poses; eye conservative minima86.87%full,
87.10%LOD; denticle contacts within.010), all54 actual action PNGs now reviewed.
Read `rework-v3/final-art-verdict.md` and `production-checkpoint.md`.
No further blocking creative defect identified. Parent owns current UI/default
palette, intake/build/tests/catalogue/release; child made no public/Git changes.
Frozen sources/exports and earlier/failed evidence remain preserved.

## 2026-09-07T21:22:03Z — gemuendina — total rework clay authoring

- Owner/model: Astra high.
- Status: candidate-ready (frozen scripts, Blender execution and visual review pending).
- Decision: replace V2 from scratch with a single continuous, materially fuller
  cranial/core/pectoral/pelvic/tail envelope; upward crescent oral recess, thick
  orbital cheek volumes, cambered flared pectorals and tapering finless tail.
- Research: supplied user image and Südkamp specimen pages inspected. Dorsal
  mouth/branchial orientation, reduced pectoral mobility, paired pelvic lobes and
  weak pectoral tubercles retained. Living thickness, pigments and soft tissues
  explicitly interpretive. Detailed sources and acceptance: `rework-v3/DESIGN.md`.
- Inputs (absolute path + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/sculpt_spec.py`: `75a2f8e92e329677a0181f5d9114a3edd3cd6e5d306fa836ca68ed5ff116a653`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/build_clay.py`: `6e28c77295373ae8a16ab5d71f31a73769ada0305d427147cd411a21d53be7f3`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/render_clay.py`: `89cb9862ca4fda3f0abbecbed554609b668f60869e51b3e173fcb55b90b6a5d4`.
  - User reference `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/user-reference/gemuendina-user-reference-2026-09-07.webp`: `6f720118bfc7af5434b8ef79cc92b60ffbf2f8a4c4843b9aa05026cc3276a8b2`.
- Execution: exact commands and frozen input-manifest hash in `rework-v3/HANDOFF.md`.
  CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- Outputs: no Blender/generated output yet. Intended candidate folder:
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-01/`.
- Actual validation: Python AST parse PASS; pure mesh 89,298 vertices / 89,696
  polygons; zero nonmanifold edges or unused vertices. No old-model audits run.
- Expected validation: Blender closed positive-volume envelope, build marker,
  eight fixed multiview renders and hash manifest, then Astra visual judgment.
- Resource: bounded research plus first sculpt complete; Terra build ≤5 minutes,
  render group ≤20 minutes, report progress if exceeded. No heavy Blender jobs
  run by Astra and no execution agents spawned.
- Stop condition: execution required; return on any hash mismatch/error or visual
  decision. Never overwrite candidate evidence or modify inputs to pass a check.
- Resume from: manifest checks then exact build command in `rework-v3/HANDOFF.md`.
- Deferred: final oral tissue/denticle authoring, olive mosaic textures, rig and
  all actions, GLB/LOD, new eye/socket/general audit, portraits and integration.
  Old source/public preserved; pending rework remains preview.

## 2026-09-07T21:34:00Z — gemuendina — clay-01 review / clay-02 secondary sculpt

- Owner/model: Astra high.
- Status: candidate-ready (clay-02 source freeze); clay-01 rejected as final sculpt.
- Actual reviewed evidence: all eight clay-01 renders; blend
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-01/gemuendina-clay-01.blend`
  SHA `05b413fecf7e2fe8b68f06543d4b4beb091220ed52ed925d88cce5339c734883`;
  render manifest SHA `1edec804e11993510f6e036cbbe3f21de03feba2a889c6ec13ecd1d6a911e570`.
- Decision: continuous core is a useful foundation, but head is too uniform,
  mouth too oval, eyes bead-like, fins too flat, branchial curves scratch-like,
  and pelvic/root thickness pinches. Detailed accept/reject by view is in
  `rework-v3/visual-review.md`.
- Secondary sculpt: stronger integrated cheek and brow fields, short upturned
  gape with welded lips/commissures, rounded preoral/chin volume, sculpted dorsal
  branchial sulci, cambered fleshy pectoral roots, softened pelvic silhouette,
  and monotonically decreasing axial thickness through the posterior.
- Inputs (absolute path + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/sculpt_spec_02.py`: `908dcb05683cfa9d17c158fc85eb426f423542a3970cf67af54240d8c10f2466`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/build_clay_02.py`: `fcce7c4fd8ebb12549923bc64d4323e172a038731deeee8f81bce4eefe9ef364`.
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/render_clay_02.py`: `bcef55cd40c8eec36adcf4251ec6044d432054978dc6dc647ff829292e9f3c70`.
- Freeze manifest SHA: `7a321bd262c1fc98f974e7054996ed077c096fa2c9b8fc677b072915e5ac835a`.
- Execution: `rework-v3/HANDOFF-02.md`, exact absolute build/render commands.
  CWD `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- Outputs: clay-02 not executed yet; intended local directory
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-02/`.
- Actual validations: AST PASS for three new scripts; finite pure mesh with
  89,098 vertices / 89,488 polygons, no nonmanifold edges or unused vertices.
  Original clay-01 input manifest still PASS; old blend hash unchanged.
- Resource: secondary sculpt and bounded static checks complete; next Terra
  build ≤5 minutes and first four-view render group ≤10 minutes. Astra ran no Blender job.
- Stop: any error/hash mismatch/output collision or visual decision. Return
  evidence, do not modify frozen source or settings. No global eye audit yet.
- Resume: verify `frozen-inputs-02.sha256`, build then render, return actual
  four primary views for Astra review before materials/rig. Additional closeups
  follow only if justified by that review. Preview remains in force.

## 2026-09-07T21:49:30Z — clay-02 acceptance / material-01 ready

- Owner/model: Astra high; status: candidate-ready material group.
- Reviewed four actual clay-02 images. Accept coarse shape: short upturned lip,
  cranial/cheek differentiation and smooth axial taper. Final eye/material/action
  review is still required; no old eye audit is reused.
- Accepted clay blend SHA `c4e65d1b0a37c9c034aaa6800bba8ad0b396d0547a4bf08faa276c62848c805f`;
  render manifest SHA `acd93202eada543b4c44f7666c4ea8b040e7500fef63a879fc5dfecae76248e0`.
  Both paths are under the existing local `gemuendina/rework-v3/clay-02/`.
- New source `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_01.py`,
  SHA `d4b242f6f5893612992eacaab5beb11916128b24347094b163d3d7b783e10fcd`.
- Design: original anatomy-aware procedural regional olive/ochre, fine varied
  tesserae and independent granulation; understated cranial fields, quieter fin
  ornament and natural dark olive iris. No imported art pixels or eye pads.
- Exact execution/outputs/stop rules: `rework-v3/HANDOFF-MATERIAL-01.md`.
  Output local `gemuendina/rework-v3/material-01/`; two material review images.
- AST parsing PASS; no Blender run by Astra. Script requires unchanged accepted
  geometry hashes. Terra group budget 20 minutes; stop on error/hash mismatch.
- Resume: Terra material group; Astra prepares distinct anatomical rig/actions
  around unchanged accepted shape. Keep preview and all old/public files intact.

## 2026-09-07 — material-01 review / material-02 ready / rig authoring

- Owner/model: Astra high; status: candidate-ready material-02, rig authoring.
- Material-01 actual oblique/cranial inspected, blend SHA
  `af0b5ab285fb1d7770c9689aa7671c210adee79209f76b7e3694ac5216310210`.
  Reject finish: too pale/grey and cracked-stone-like. Preserve the successful
  geometry/UV work. Final eye housing/containment still requires rework audit.
- New frozen `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_02.py`
  SHA `8c3fd547afc63579b06572810e78eeec38688e80cd0a7e303d485ce3f67b4731`.
  Exact input/hash/command/output/stop rules in `HANDOFF-MATERIAL-02.md`.
- Decision: deeper green olive/ochre macro pigment, independent pale mottles,
  stronger cell-top variation, reduced edge grooves and restrained granular
  roughness. Source remains accepted clay-02; geometry hashes enforced.
- `rig_actions_01.py` authored independently: 28 anatomical bones, seven tail
  segments, restrained pectoral trim, welded jaw/throat/branchial weights, 18
  purposeful action curves. Pure pose/weight checks PASS: normalized ≤4
  influences, stable root, all loop/recovery seams zero except held Death.
- `candidate_01.py` is an unfrozen draft; it must not execute until a reviewed
  material blend hash is bound and the export handoff is supplied.
- Resume: Terra material-02, then Astra actual-image review and candidate freeze.
  No heavy Blender job run by Astra; no public/catalogue/status edits.

## 2026-09-07T22:10:01Z — safe production draft checkpoint

- Material-02 actual oblique/cranial images independently viewed: stronger olive
  pigment and much weaker crackle read better; parent material decision pending.
  Blend SHA `c3c65ac26c08ff51b0ccc621d2eb0181bd11f65f987eada3907c4aed76ed1d25`.
- Draft `candidate_01.py`, `render_candidate_01.py`, `check_candidate_01.py` and
  `rig_actions_01.py` are syntax-checked. Candidate is intentionally blocked by
  `MATERIAL_SHA='PENDING_MATERIAL_REVIEW'`, with no output created.
- All actual 89,098 sculpt vertices passed the new weight-spec checks (≤4,
  normalized, expected bones). All actions finite; root stable; loops/recovery
  seams zero except held Death. This is not actual Blender deformation review.
- Stop/resume: parent requested the creative slot be freed for Coccosteus. Resume
  from `production-checkpoint.md` after material-02 review, then freeze candidate
  inputs and Terra commands. No old/public files changed, no Blender job run.

## 2026-09-07T22:21:02Z — material-03 ready

- Owner/model: Astra high; status: candidate-ready material group.
- Root rejected material-02 final finish and authorised the original swatch.
  Actual swatch and prompt/provenance inspected: 1254² olive/ochre granular
  tesserae; apparent source relief/dark edges require restrained use.
- Frozen `materials_03.py` SHA
  `01ef1d8a1b9add51b490f167c719dbe00118f3ec422031b3ad28622a78e821e0`.
  Input manifest `frozen-material-03.sha256` SHA
  `6a01913c31f3ba6e4bc32e4d1df85929b32b0d1ca8e7af5f3a103c33527fa3b5`.
- Selective base-colour swatch only; anatomically controlled weaker fin/ventrum
  mix, moderate cell density, four-phase tile-edge crossfade, much weaker
  independent procedural granular normal, richer restrained iris fibres.
- AST and numerical four-phase boundary-continuity checks PASS. Material01/02
  script hashes remain unchanged. No Blender job run by Astra.
- Exact command, all absolute input/output paths and stop rules:
  `rework-v3/HANDOFF-MATERIAL-03.md`. Output local `rework-v3/material-03/` only.
- Resume: Terra material group, two comparable actual views, then Astra review.
  Candidate draft points at material-03 but refuses execution until its accepted
  hash is bound. No eye geometry/audit or public/Git action in this phase.
