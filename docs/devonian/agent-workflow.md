# Devonian authoring and execution workflow

This is the boundary between visual/anatomical authorship and deterministic
execution. It does not authorize an executor to replace a creative decision
with an automated fix.

## Delivery order

Publish the complete initial 21-creature collection and every initial
non-creature asset (plants, scenery, props, supporting/source images,
atmosphere/scale assets, and runtime placements) to `main` first. Until then,
unfinished models remain `preview` in
`src/content/devonian/model-status.json` and in the game.

After that gate, complete the six total reworks — Titanichthys, Coccosteus,
Bothriolepis, Doryaspis, Gemuendina, and Stethacanthus — before general
individual refinements. Separate creature agents may rework distinct creatures
in parallel; there is no required order among the six. Each rework gets its eye
and general creature audits **after** its new candidate is frozen. Do not claim
an old audit applies to new geometry.

## Delegation

| Owner | Work | Budget and exit |
| --- | --- | --- |
| Astra, high | Research, anatomy reconciliation, sculpt/rig/action/material design, visual judgment, collision and attachment choices | One creature or asset family at a time; hand off a frozen candidate plan and acceptance criteria |
| Terra, medium | Run the frozen export, rendering, packaging, and validation commands; record hashes and outputs | One command group per state entry; report results without changing creative inputs |
| Astra, high | Inspect actual exported/package evidence and accept, return for authoring, or keep preview | Approval must be explicit and hash-bound |

Terra stops and returns to Astra on an unexpected command error, changed input
hash, visual/anatomical/collision judgment, new candidate-directory/version
choice, or any temptation to edit a source, selector, threshold, or metadata to
make a check pass. Preserve the evidence and exact error. Never reuse or
overwrite an archived candidate, such as a historical V2 directory, without an
explicit new Astra handoff.

## Reusable handoff

Each creature agent updates its own `WORKING_STATE.md` after every meaningful
decision, source change, candidate export, review, packaging run, or validation
result, then sends a concise summary to the parent. The parent alone maintains
the central authoring checkpoint.

```md
## [UTC timestamp] — [id] — [phase]

- Owner/model: [Astra high | Terra medium]
- Status: [authoring | candidate-ready | review-needed | preview-integrated |
  rework-approved | blocked]
- Decision and acceptance criteria: [concise, including anatomy/visual choices]
- Inputs (absolute path + SHA-256):
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/[id]/[new-source].blend`: `[sha256]`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/[id]/[new-frozen-script].py`: `[sha256]`
- Execution:
  - CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`
  - Command: `[exact absolute command supplied by Astra for this new candidate]`
- Outputs (absolute path, bytes, SHA-256): [candidate full, LOD, portraits,
  reports, and packaged files]
- Expected/actual validations: [commands and PASS output, or exact failure]
- Resource used/remaining: [bounded step/time budget]
- Stop condition: [none | exact error | decision required from Astra]
- Resume from: [the next exact command; do not repeat completed checks]
```

Terra verifies every recorded input hash before running the command. A mismatch
invalidates the old result and returns the work to Astra.

## Approved-candidate integration

Only after Astra approves a new, hash-bound candidate may Terra copy its
approved asset family into `public/assets/devonian/creatures/`. Package a single
approved id and run the established intake/integration commands from the
repository root:

```sh
node /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/package.mjs [approved-id]
node /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/check.mjs [approved-id]
node /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/catalogue.mjs --check
node /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/update-asset-sizes.mjs
npm run devonian
npm run typecheck
npm run build
```

Before a shipment, follow the intake rules: update asset sizes, remove the
matching `DEVONIAN_STAND_INS` entry only after acceptance, keep preview status
until approval, and never hand-edit generated swimming statistics.

## Execution record — 7 September 2026

Terra ran the established merge validation without model edits:

- `typecheck`, `build`, Devonian shipped intake (21/21 creatures, 47 props),
  `npm run devonian` (644 checks), `eras`, and the props loader test passed.
- Props-instancing headless reviews used the dedicated local Vite origin
  `http://127.0.0.1:4181` through `DEVONIAN_QA_ORIGIN`. Normal/low: 104 calls,
  1,307,304 triangles; high: 104 calls, 8,087,473 triangles; baseline: 104
  calls, 1,211,203 triangles. Each rendered 44 chunks with no pending loads or
  errors and reported `{ groupDetached: true, geometryMemory: 12 }` on cleanup.
- Logs are under
  `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/review/workflow-merge-*.log`.
