# Saved state — scenery handoff

Implementation and visual integration candidate are frozen for parent review. No git changes were made by this agent. Parent handles commits/main integration.

Owned changes:
- `src/render/props.ts`: generic static override loader, Meshopt and resource cleanup; legacy Cambrian geometry retained.
- `src/render/sea.ts`: content-driven replacements, pigment/material selection, unchanged placement/shader/physics inputs.
- `src/content/era.ts`: optional `InstancedScenery` contract.
- `src/content/devonian/scenery.ts`: eleven props, seven ordinary flora and four rock slot mappings.
- `src/content/devonian/index.ts`: scenery import/asset field/comment only. Parent concurrently owns boot/standIns; preserve their edits.
- `tools/devonian/props-instancing/`: reproducible scripts, regression check, reports/docs.
- `public/assets/devonian/props-instanced/*.glb`: eleven new separate static derivatives only.

Do not include unrelated changes in materials, reference boards, other creature authoring or `__pycache__` in this handoff. All original public metric props and frozen creatures were untouched.

Exact asset/source hashes and verification are in `handoff.json` and `validation.json`. Editable Blender sources and intermediate files are under `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/props-instancing/`; images and actual-renderer reports are in its `review/` subfolder. README contains exact reproduction commands.

Tests complete: typecheck, 618 Devonian checks, eras, production Vite build, targeted loader regression, static bounds/budgets/pigment/source hash checks and real Three.js Meshopt/game scene render. No browser errors. Baseline and integrated sea each fully dispose their GPU geometries back to the twelve unrelated QA geometries.

Required performance fix completed: the generic `minimumFloraQuality: 'high'` field restricts Devonian authored flora to High. Performance/low retains its exact procedural flora while the four authored rock slots remain. Same camera low rises only **1,211,203 → 1,307,304 triangles (+7.93%)** at unchanged 104 calls. High records **8,087,473 triangles / 104 calls**, colour pass only, and remains a preview with dense-scatter LOD work deferred. No medium tier exists. Final low/high images and reports were visually inspected with no browser errors. No seed/physics/density changes.

Procedural exceptions: `lilyColumn` and `frondTower` retain existing silhouettes pending rock/framework compositions with properly proportioned crinoids/algae. No underwater terrestrial trees. All 47 specimen assets remain independently available. The pebble scatter derivative retains a small sediment base, a known initial art limitation.

Temporary Vite process was started by this agent at `http://127.0.0.1:4177` (exec session 62651). Parent's main server on 5173 is untouched. Browser review jobs exited; no Blender process remains. The Vite server may be stopped after root's inspection.
