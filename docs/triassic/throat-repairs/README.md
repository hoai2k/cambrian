# Triassic throat repair audit — 19 September 2026

Owner: `/root/throat_audit`, claim T3D-02. Work remains active.

The 15 September checkpoint described a pending palate/floor branch. The rule was merged, but
its implementation (`worktree-agent-ab601ca5ebb512c9f`, through `395e3015`) was not. The shipped
Hupehsuchus and Henodus still contain a closed oral sac, and Ceratites still has the invented
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
