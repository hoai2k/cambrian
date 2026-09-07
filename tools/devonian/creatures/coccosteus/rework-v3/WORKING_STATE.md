# Coccosteus total rework — current state

## 2026-09-07 — clay-01 — authoring frozen, awaiting Terra execution

- Owner/model: Astra high.
- Status: candidate-ready for execution; **not rendered, not reviewed, not approved**.
- Read first: repository CLAUDE.md, docs/devonian/agent-workflow.md, existing design.md and this
  state. Inspected actual user TUG image, saved Engelman Figure 7, old portrait and old builder.
- Decision: author new Coccosteus-specific cranial/cheek volume, rounded-planar thoracic shield,
  full short abdominal shoulder, rising compressed peduncle, low long dorsal, asymmetric tail,
  cambered thick-root paired fins, and a real lined jaw aperture. Clay contains no pigment or
  seam textures; volume must earn replacement of the old model.
- The existing complete named backup remains intact, as do public models and old source.
- Inputs (absolute + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay.py`: `7e91fe87c5ae33c67aa4aa747cc74d59e65d31919ccf037e2f8c080011911e3d`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views.json`: `54c15132c6be7692b58a2e9bc777b4f8dcfdc02b50c46c8da8aa83aceedcb63f`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/blender/coccosteus-v2.blend`: `251e55dee4cb7f3047e1d25ab9d6979977a201a903a8e992ce7950a22c6da146`
- Source changes: added clay.py, views.json, HANDOFF.md; appended design rationale here.
- Static validations: PASS Python AST and JSON parse, exact four body view names, positive axial
  widths, and monotone bounded interpolation over each HEAD/SHIELD/BODY/JAW interval. No Blender
  execution occurred. These checks do not establish visual acceptance.
- Outputs: no candidate files yet. Planned exclusive directory is
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-01/`.
- Expected validation/evidence: editable blend + report; six new clay images (four fixed body,
  mouth-rest, mouth-open); four old clay images; complete hash-bound manifests. See HANDOFF.md.
- Resource: one bounded authoring pass complete; execution allowance 20 minutes/group, 60 total.
- Stop condition: wait for parent-assigned Terra medium; no executor spawned by this agent.
- Resume: verify three input hashes then run HANDOFF.md Group 1 exactly. Record one command group
  per state entry, then continue Groups 2 and 3 only on expected success. Return actual images
  to Astra. No material, rig, animation, audits, public integration, shared metadata or git work.
