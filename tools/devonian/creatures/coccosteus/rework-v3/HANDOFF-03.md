# Coccosteus clay-03 — frozen single-boundary correction

Owner: Astra high. Executor: parent-assigned Terra medium. **Preview, not rendered or approved.**
Preserve clay-01, clay-02, original source and named backup. Do not run old scripts, edit public
files, export GLB, package, mutate Git/shared metadata, begin textures/final rig, or run the
later full eye/general audit suite. This handoff is build plus exactly five review images.

## Frozen inputs

All paths are absolute. Verify all three hashes before each execution group.

| Input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-03.py` | `5cd49f03f2038b2fbde3d31e94cd0e04ade8dc33aa4867d079c0f01d3a8ac286` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views-03.json` | `7a935c568dd279632b229e3dd64c31d1b044e5909794afc5d65365d41e5a263a` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay03-source.py` | `da33b170adc80d8ea59e42bcdeadb05e509f7351ee21dd5aaa06e4ddd2d8e066` |

The builder is self-contained and opens no historical model. The third file is the source-only
local check used during authorship; it does not import bpy or invoke Blender. Its recorded run
already passed and need not be repeated as an execution prerequisite. A hash mismatch stops
execution and returns to Astra, including a mismatch in this diagnostic evidence source.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`

## Group 1 — create editable source

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-03.py -- --stage build
```

Expected: exit zero, `COCCOSTEUS_CLAY_03_BUILD_COMPLETE`, editable blend and build-report.json.
The builder asserts joined topology, normalized shared weights, one lip loop/collar, and
positive-width nonterminal throat stations. Record command output, Blender version, elapsed
time, bytes and hashes in WORKING_STATE.md. Never repeat a successful build.

## Group 2 — render fixed clay evidence

Verify the generated blend against its build-report.json SHA in addition to the frozen inputs.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-03.py -- --stage render
```

Expected: exit zero, `COCCOSTEUS_CLAY_03_RENDER_COMPLETE`, complete render manifest, and five
1280×960 PNGs: side, front, dorsal, oblique and mouth-open. CPU Cycles, two threads, 32 samples,
fixed seed. The four body images show rest; mouth-open shows the study gape. Camera values
retain clay-02 framing including the uncropped 6.65 dorsal scale. Do not adjust cameras to hide
problems. Front/oblique are the resting lip evidence in this bounded five-view group.

## Exclusive output directory

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-03/`

- `coccosteus-clay-03.blend`
- `build-report.json`
- `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`
- `render-manifest.json`
- Optional command logs and execution evidence list within this directory only.

Existing deliverable paths cause a stop. Do not delete evidence or choose another directory.
No actual clay-03 outputs have been created by Astra.

## What changed and what must earn acceptance

The anterior external skin, mandibular skin, palate, floor and pharynx now belong to **one
connected mesh**. A swept thin lip loop is shared by the outer and inner surfaces. The head
ends on the exact same collar vertex ring used by the thorax; the collar is fully body-weighted.
There is no posterior head cap, independent torso tube, separate cheek cover, or jaw-pole sample
used for throat width. The one lumen remains broad at the collar and tapers both halves together
to one deep terminal pole. Region attributes and skull/jaw/body weights preserve editability.
Study shape keys use the same boundary weights; this is not the final rig or an animation pass.

Local crown, orbital, cheek and lower-cup curvature gives the anterior separate anatomical
regions. The posterior broad shape and fins are retained. The rim follows a U-shaped blunt
muzzle with shared commissures; the palate/floor inset follows the same curved tissue, then
continues through a positive-width pharynx. External clay is still unpatterned and uniform.

Astra must inspect the actual five images for:

1. No crossing central oral panels, stepped lip fragments, duplicate passage walls, exposed
   neck cuts or stationary gular flange. The open image should show a connected curved palate,
   floor and posterior passage, not a black geometric obstruction.
2. A substantial organic cheek and modest cranial roof, with differentiated armour curvature.
   Reject another generic cone or helmet; correctness of topology does not establish anatomy.
3. A natural neck articulation and front-to-soft-body transition under the same clay material.
4. Retained organic rising posterior, low dorsal, asymmetric tail and restrained fins.
5. Full body framing and natural resting lip closure. Keep preview on any unresolved issue.

## Source-only evidence already passed

`python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay03-source.py`

Results: 48,514 connected main-skin vertices, 48,640 faces, 97,024 triangulated faces; every edge
has two incident faces; finite coordinates/normalized weights; positive local triangle areas at
rest/half/full gape; one shared lip loop and collar; minimum nonterminal oral width 0.03498629.
At gape values 0, 0.5 and 1: 279 centerline segments unobstructed; 288 sampled rays to inner walls
encounter no external skin first; 120 vertical oral sections show at most one roof/floor pair.

These are local sampled construction checks. They do not prove all-pairs collision freedom,
rendered appearance, final rig validity or production acceptance. A curved palate can obscure
a deeper corner; the checks do not incorrectly require the whole mouth to be star-convex.
Actual render judgment remains mandatory. See review-clay02-plan-clay03.md for the verified
clay-02 cause: 1,890 lower-passage quads collapsed to X=0, plus duplicate passage ownership.

## Budget and stops

One command group per state entry; maximum 20 minutes per group / 40 minutes total. Stop on an
unexpected error, timeout, changed hash, missing output, incomplete manifest or any requirement
for a visual/anatomical decision. Preserve exact evidence and return to Astra. No automatic
geometry fixes, source/hash changes, renderer substitutions or lower samples.
After both groups, return five actual full-resolution PNGs, blend hash and manifests for Astra.
No further execution or integration follows without a new hash-bound handoff.
