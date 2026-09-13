# Coccosteus clay-02 — frozen Astra handoff

Astra high authored; Terra medium executes. This is an unapproved clay revision. Clay-01 was
rejected after review of all ten actual images: toy helmet, sleeve/notched shield, ridged-prism
body, broken lips and rectangular cheek walls, hooked fin tips. Preserve clay-01 evidence,
old sources, full named backup and public models. No general/eye audits or material/rig work yet.

## Frozen inputs

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-02.py` | `a0813a5b6210eec66f0bd57b5098dd023d798209153a732648a00f5fb6e58380` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/views-02.json` | `7a935c568dd279632b229e3dd64c31d1b044e5909794afc5d65365d41e5a263a` |

Verify both hashes before each command. A mismatch requires return to Astra. The new source is
self-contained; it does not import clay.py or open the old model. No old comparison rerender.

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`

## Group 1 — build editable clay

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-02.py -- --stage build
```

Expected: exit zero and `COCCOSTEUS_CLAY_02_BUILD_COMPLETE`. Record Blender version, exact output,
elapsed time, output hashes and byte sizes in WORKING_STATE.md. Do not repeat the build.

## Group 2 — render five actual review views

Verify the blend hash against build-report.json in addition to the source hashes.

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/coccosteus/rework-v3/clay-02.py -- --stage render
```

Expected: exit zero and `COCCOSTEUS_CLAY_02_RENDER_COMPLETE`. Five 1280×960 PNGs, CPU Cycles,
32 fixed-seed samples, two threads, complete render manifest. Side/front/dorsal/oblique use rest;
mouth-open uses a 19.5-degree jaw opening with 2.35-degree skull lift. These are editable study
shape keys, not a final rig or animation approval. The saved source stays at rest.

## Exclusive output directory

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/coccosteus/rework-v3/clay-02/`

- `coccosteus-clay-02.blend`
- `build-report.json`
- `side.png`, `front.png`, `dorsal.png`, `oblique.png`, `mouth-open.png`
- `render-manifest.json`
- Optional captured command logs and evidence manifest within this directory.

Existing deliverable paths cause a stop rather than overwriting evidence. Do not delete output
or create another candidate directory to retry. Nothing writes to public, old sources or backups.

## Authored changes and Astra review gate

The head now has an organically curved roof, a continuously recessed orbit/cheek transition,
and an actual concave palate. A unique nose vertex joins its surrounding triangles; no
nonplanar nose cap creates a central slit/hole. The mandibular cup likewise has rounded ends,
a continuous concave floor and a slim convex underside. Mouth materials are assigned by exact
angular tissue region. The posterior oral lining starts behind the lips and shares the same
surface equations. Curved cheek leading edges replace the rectangular wall boundaries.

The armour and muscular posterior share a single continuous torso mesh. Its upper shield has
modest local compression/shoulder curvature and one shallow shaped edge, rather than a separate
shell around a ridged body. The muscle is elliptical, and retains the rising deep peduncle.
Pectorals are reduced and swept, with rounded span/chord construction and strictly descending
front-view height. Their roots begin within the torso. The dorsal camera scale is 6.65, giving
4.9875 units of vertical coverage for a 4.45-unit animal plus margin.

Astra must inspect actual images for:

1. Organic fish sculpture and reference appeal restored, with convincing anterior armour mass.
   No tall box forehead, side sleeve or deep abdominal notch.
2. Rounded posterior muscle and rising tail axis. No longitudinal prism ridges. Long low dorsal
   and asymmetric tail remain purposeful rather than forming a generic fish silhouette.
3. A clean nearly closed lip line in front/rest views, with no midline punched hole, torn zigzag
   fragments or exposed caps. Open mouth must show curved palate, floor and compliant sides,
   without a rectangular black cavity or abrupt wall edge. Reject any remaining intersections.
4. Smaller pectorals with thick continuous roots and natural rounded margins; no upward hooks.
5. Full uncropped dorsal, side and oblique body evidence. No framing changes by the executor.

Static checks passed without Blender: AST/JSON parse; monotone bounded anatomical interpolation;
finite main-volume coordinates; two-face edge incidence and no zero-area first triangles in
head, jaw and torso generated arrays; full dorsal framing arithmetic. This is not a rendered
visual review, global collision test or final mesh audit.

## Resource and stop conditions

One command group per state entry, at most 20 minutes each / 40 minutes total. Stop on command
error, timeout, input mismatch, missing output, incomplete manifest or need for visual/anatomical
judgment. Record exact evidence and return to Astra. No automatic mesh fixes, source edits,
engine changes, sample changes, source/hash edits or new directory decisions.
After both groups, return all five full-resolution PNGs and source/blend hashes for Astra review.
Do not package, export GLB, integrate, modify public/shared files or mutate git in this handoff.
