# Coccosteus clay-04 — frozen exterior head and lateral orbit study

Owner: Astra high. Executor: parent-assigned Terra medium. **Preview, not rendered or approved.**
The successful clay-03 oral geometry is preserved exactly; this is a bounded exterior
cranial/cheek/armour and orbit refinement. No Blender execution has occurred for clay-04.
Preserve all earlier candidates, old models and named backup. No public/Git/shared edits,
GLB export, packaging, texture/final-rig work or later eye/general audit suite in this handoff.

## Frozen inputs

Verify all three hashes before each command group. A mismatch stops execution.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-04.py` | `804d9932e9f3453aefc0a67b0aecdab4cb36491b2377b4839fbf7fe60605b0d3` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views-04.json` | `7a935c568dd279632b229e3dd64c31d1b044e5909794afc5d65365d41e5a263a` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay04-source.py` | `bfa02e5d2bf3ad3fd8ca652c5849fe344b1c60e4627aab6d8533754bf401a8be` |

Builder is self-contained and imports no earlier builder/model. The source checker already
passed; no repeat is needed unless a new issue requires it. Its immutable source is included
as review evidence. Keep all thresholds, shapes, camera settings and hashes unchanged.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`

## Group 1 — create editable source

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-04.py -- --stage build
```

Expected: zero exit; `COCCOSTEUS_CLAY_04_BUILD_COMPLETE`; editable blend + build-report.json.
The build asserts canonical oral geometry equality, positive throat width, shared boundary
ownership and lateral orbital normals. Record actual Blender version, exact command output,
elapsed time, files/bytes/hashes in WORKING_STATE.md. Never repeat a successful build.

## Group 2 — fixed five-view evidence

Verify the generated blend hash against build-report.json, plus all three source hashes.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-04.py -- --stage render
```

Expected: zero exit; `COCCOSTEUS_CLAY_04_RENDER_COMPLETE`; five PNGs and complete manifest.
CPU Cycles, fixed seed, 32 samples, two threads, 1280×960. Exact same side/front/dorsal/oblique
rest cameras and mouth-open camera as clay-03. Do not reframe or change samples/materials.

## Exclusive output directory

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-04/`

- `coccosteus-clay-04.blend`
- `build-report.json`
- `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`
- `render-manifest.json`
- Optional captured command logs/execution evidence list within this directory only.

Existing deliverable files cause a stop. Do not delete evidence, overwrite a candidate, select
a new directory or edit source to continue. Return exact unexpected output to Astra.

## Frozen anatomical intent

The source keeps the complete successful inner surface separate from the external refinement
functions while retaining one connected mesh. All 12,289 oral vertices/weights and 12,288 oral
faces, including the shared lip, match clay-03 canonical SHA
`698be716534a6e5cf1a35c32d4946a0cbbfe45e2577dcee55664f280b91d9c79`.
There is one lumen, one lip loop, one collar, no new cap or independent passage. Posterior and
fin broad shape are preserved. The source report records exact new orbital sites.

New exterior curvature produces a steeper smooth preoral rise, broader shoulders/cheek,
shallow curved cranial articulation and broad thoracic plate relief. Parametric orbital sites
are lateral (|normal.X|=.8409203), rather than chosen by a high fixed-Z side ray. The eye tangent
basis and inset follow that actual surface normal. This is not a final eye burial audit.

Astra must inspect all five actual images for:

1. A substantial rounded anterior with a sloping cranial roof and visible lateral cheek; reject
   another narrow pointed ray snout, spherical forehead or toy helmet.
2. Lateral eye placement appropriate to the supplied TUG reconstruction, with natural seating.
3. Readable cranial/thoracic armour curvature in the same unpatterned clay, without a sleeve,
   hard neck slice, floating plate, deep trench or generic smooth cone.
4. The previously coherent mouth still reads clearly; exterior changes must not hide problems.
5. Retained posterior, fins and full framing, and overall appeal compared with the old fallback.

If any art criterion remains unresolved, keep preview and return to Astra. Local checks passing
is not anatomical acceptance and does not authorize a material or integration pass.

## Recorded source-only validation

`python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/check-clay04-source.py`

PASS: unchanged oral digest; 48,514 main-skin vertices / 48,640 faces / 97,024 triangles;
joined two-face edges; finite geometry and normalized weights; positive areas at study key
values 0/.5/1; minimum nonterminal oral width .03498629; 279 clear centerline segments,
288 inner-wall containment samples, 120 vertical oral sections with at most one roof/floor
pair; lateral orbital site normals. These are sampled local checks, not exhaustive collision,
visual, rig or production audit evidence. AST and JSON parsing also passed.

## Resource and stop conditions

One command group per state entry; maximum 20 minutes per group / 40 minutes total. Stop on an
unexpected command error, timeout, changed hash, failed assertion, missing output, incomplete
manifest or need for a visual/anatomical decision. Preserve evidence and return to Astra. No
automatic fixes, metadata/source/hash changes, renderer substitutions or new directory choices.
After both groups, return five full-resolution actual PNGs and blend/manifest hashes for review.
