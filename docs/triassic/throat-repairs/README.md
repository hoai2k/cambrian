# Triassic throat repair audit — 19 September 2026

Owner: `/root/throat_audit`, claim T3D-02. The audit and priority repairs are finished;
remaining custom-builder recovery is pending as T3D-12. Roster-wide oral recovery is not complete.

The 15 September checkpoint described a pending palate/floor branch. The rule was merged, but
its implementation (`worktree-agent-ab601ca5ebb512c9f`, through `395e3015`) was not. At the audit baseline,
Hupehsuchus and Henodus contained a closed oral sac, and Ceratites had the invented
peristome/beak. Runtime hides the named oral parts; it does not repair the cut body underneath.

The restored shared helper closes the palate and floor separately and weights each rigidly to
its own bone. It is ported using the branch's changes from its merge base, so newer motion and
skinning work remains intact. Builders are rebuilt and reviewed individually before delivery.
The helper also preserves the relaxation mask's name before Blender applies its modifier:
Blender 5.2.0 invalidates the RNA group handle during that operation.

`tools/triassic/throat-audit.mjs` evaluates actual packaged authored and puppet GLBs at 25 phases
of every clip, with endpoints clamped. It records mouth-region skin strain separately from hidden
oral surfaces and includes each source SHA-256. This is a diagnostic for visual review; it does
not establish that a surface is free of self-intersections or that every possible camera sees a
closed throat.

Confirmed before repair:

- Hupehsuchus' cut ends before the eye, although the painted lip continues behind it. The square
  rear face of the isolated mandible detaches from the cheek in Gulp.
- Henodus' cut crosses the hanging upper denticle fringe. Tooth tips move with the mandible while
  the roots remain above it.
- Ceratites' old test samples only vertices already wholly weighted to `shell`. That proves those
  vertices rigid by construction, while the outer coil can still inherit head/arm motion. The
  replacement test must select the shell anatomically, independently of its weights.

## Finished: Ceratites

The coil envelope is now enforced after weight diffusion; the collar blends into it while distal
arms remain free. The existing forward attack performances are preserved. Both bodies retain
matching rigs, clips and anchors, and the LOD remains the puppet alias. Invented peristome/beak
geometry is removed, restoring the closed source crown. authored: 5502 anatomical shell vertices, 0 contaminated, maximum pairwise distance change 0. .puppet: 1870 anatomical shell vertices, 0 contaminated, maximum pairwise distance change 0. 

Visual playback frames: [before](ceratites-Attack-before.png), [after](ceratites-Attack-after.png).
The image change is small; the anatomical weight audit is the stronger evidence. The paired audit,
TypeScript check and production build pass; portraits are refreshed from the decoded packaged GLB.

## Finished: Hupehsuchus

The lip measurement now spans 0.255 body lengths behind the nose rather than 0.165. The body and
rear jaw share a weight field at the cut; the mandible blends onto its rigid jaw bone forward of
that attachment. This preserves the pouch motion without opening a slit through the throat.
`cut-attachment.mjs` pairs the actual exported rim vertices: 162 authored and 67 puppet vertices,
61 phases of every one of 23 clips, zero separation in both bodies. The cut's cross-sections are
closed with source skin and the hidden sac is replaced by separate palate/floor shells.

[Gulp before](hupehsuchus-Gulp-before.png) and [after](hupehsuchus-Gulp-after.png) show the mouth
extent and attachment; the automatic framing follows the new hinge, so the scales differ.
All existing paired rig, clip, stiff-trunk, pouch and anchor tests pass. Both portrait families
were rendered again from the decoded packaged deliveries.

## Finished: Henodus

The original height-only cut severed the hanging upper fringe. The revised cut follows the inner
mandible; a connectivity check returns detached tip candidates to the skull (80 authored and 18
puppet faces retained with their upper roots). The posterior jaw copies share the body weights:
80 authored and 53 puppet rim vertices stay coincident over 61 phases of all 24 clips. Separate
rigid palate/floor shells replace the sac, and Grab is correctly declared and checked as a loop.

[Bite before](henodus-Bite-before.png), [after](henodus-Bite-after.png), and
[after from below](henodus-Bite-below-after.png) show the intact upper fringe and inner mandible.
Historical gape figures are explicitly separated from current export validation. Paired assets,
rigs, clips, anchors and attachment checks pass; portraits are refreshed.

## Full roster diagnostic snapshot

The [baseline sweep](baseline-audit.json) evaluates 52 actual delivered models (authored and puppet
for all 26 shipped species), 1,212 clip/model combinations and 30,300 sampled poses. The
[summary](audit-summary.json) records each SHA-256 and the [priority repair sweep](priority-repair-audit.json)
records the three repaired pairs. Hupehsuchus' worst mouth-region edge ratio fell from 5.81× to
3.17× authored and 4.70× to 2.93× puppet; its rear cut attachment is exactly coincident separately.
Henodus' unchanged 4.84×/5.17× maxima come from broader skinning candidates, not proof that its
repaired posterior seam still separates.

Twenty-three baseline species had a named lining with mixed jaw/skull weights. Nothosaurus
already used separate palate/floor meshes; Shonisaurus already had authored oral parts;
Helicoprion had no named legacy lining. After the three priority repairs, twenty legacy lining
species still require the separately tracked shared-kit/ShoreKit recovery. These measurements
confirm that the old claim of a completed roster-wide palate conversion was stale.

The earlier skinning-repair batch is present on main. High strain candidates in Placodus,
Helicoprion and Dinocephalosaurus still merit targeted visual review; this numerical report does
not classify all strain as a throat tear or mark unseen intersections as fixed. Askeptosaurus
was not a shipped authored/puppet pair at baseline and is covered by its separate regeneration.

`node tools/triassic/oral-shell-audit.mjs <id> ...` verifies the replacement in the actual packaged
files: each lining vertex has one unit skull or jaw weight, no triangle spans both bones, each
indexed edge belongs to exactly two faces, and both closed halves are present. Authored, puppet
and LOD variants are all checked. This catches the old stretching-sac architecture directly;
it does not substitute for a rendered check of the shells' fit inside the head.

## Current delivered snapshot after shared-kit and ShoreKit recovery

The [current SHA-bound sweep](final-audit.json) and [remaining inventory](final-audit-summary.json)
cover **54 actual models, 27 species, 1,264 clip/model combinations and 31,600 poses**. This includes
the newly shipped Askeptosaurus authored/puppet pair. Its optional backup and each LOD have separate
delivery audits and are not counted twice in this animation sweep.

The eleven shared-kit ports and three ShoreKit ports are delivered, in addition to the three
priority repairs above. Exactly six custom builders still retain a named lining with mixed
jaw/skull weights in **both** authored and puppet models:

| Species | Mixed lining vertices per variant | Remaining bounded work |
| --- | ---: | --- |
| Dinocephalosaurus | 364 | Port its curved-head custom sac to measured rigid shells. |
| Hybodus | 320 | Port the measured shark-mouth custom sac while retaining current fin/tail corrections. |
| Keichousaurus | 132 | Port its custom sac while retaining the recently corrected Grab loop. |
| Phragmoteuthis | 205 | Retire the invented crown hole/sac/beak, preserving the closed source crown and anchors. |
| Placodus | 208 | Port its custom cavity sac while retaining current skinning and Grab loop. |
| Saurichthys | 320 | Port its custom fish-mouth sac while retaining current fin/tail corrections. |

Those six changes exist as candidate deltas on the preserved branch but have not been ported or
rebuilt here. They are **pending T3D-12**, not hidden under the completed shared-kit claim, and no
new repair batch has started. Oral meshes remain hidden in the runtime and by default in the viewer.
The inventory is not a request for optional Tripo regenerations.

The [ShoreKit record](shorekit.md) includes exact posterior attachment tests, selected strict gape
views, fresh portraits, cap-regression correction and the exact-frame Coelophysis deformation
review. That last review distinguishes a continuous stretched cervical edge from an opening;
forced-visible authoring oral parts still need fit review before enabling them. No document here
claims every posed surface or camera angle is intersection-free.

## Oral verdicts — T3D-14, 20 September 2026

Per animal, the decision the mouth rule asks for first — whether the mouth needs filling at all —
with the measurement behind it. Both rows are strict-cull counts from `tools/triassic/gape-solid.py`
(backdrop seen *through* the body at full gape with every backface culled; tolerance 12).

| Species | Verdict | Before → after | Evidence |
| --- | --- | --- | --- |
| Shonisaurus | **neither** — no oral geometry | 4 px → 6 px (Heavy@0.35; Bite, Attack 0 → 0) | The closed generation shows no backdrop through its gape, so the authored palate, floor, throat tube and tooth rows were removed and `package-audit.mjs` now refuses anything the runtime classifier would match. The cull *opens* 1,863 px on Heavy that are not enclosed by the silhouette — the roof of the open mouth seen from above the lip line, which the game already showed because `Oral palate` was the one part it hid — so nothing a player sees got worse. `validation.json` records `oralGeometry: "none"`; skin 1.44x unchanged; anchors and all 21 clips unchanged. [eyes before](shonisaurus-eyes-before.png) / [after](shonisaurus-eyes-after.png). |
