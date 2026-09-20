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

## Finished: Placodus (T3D-12A)

The custom `Oral_cavity_lining` sac -- one tube on the cavity's measured section, skinned so its
wall stretched between the jaws -- is replaced by the era's `T.oral_shells`: a palate rigid on
`skull` and a floor rigid on `jaw`, each closed, each filling its own jaw's interior to a room cast
inwards from outside the closed intake surface and capped by the head's own measured section.
The mouth cut (head vertex normals cast back into the mesh, the seam the cavity's mid height) is
unchanged. The blended `Seated jaw hinge tissue` sphere is gone: what it stood in for -- the jaw's
rear face at the hinge plane and the skull's open section behind it -- is capped with the cut's own
vertices (`T.cap_cut`, 64 faces at the hinge and 36 at the mandible's front on each half of the
authored body, wearing the rim's UVs and vertex colour), and both halves' seam rims are folded in
by 0.0035 raw (`T.rim_flange`). The shells end 0.002 *inside* the mandible's front rather than
0.004 past it, because past it the axis itself is open water between the chisels and the jaw.
Every shell vertex is seated inside the head's silhouette by rays that cannot clamp (13 pulled in,
0.0117 raw at most); `oral-shell-audit.mjs` finds separate closed rigid shells in the authored
body, the twin and the LOD, and `throat-audit.mjs` reports 0 mixed jaw/skull vertices in the
lining (308 vertices, 208 mixed before).

Strict-cull gape (`gape-solid.py`, `CrushBite@0.25 Bite@0.25 Heavy@0.15`): 0 / 0 / 0 px seen
through the body with the sac and the hinge sphere, **10 / 10 / 0** now, against a tolerance of
12 -- the ten are the silhouette of the mandible's front cap at a grazing corner, none in the
mouth. Honest gape (backdrop in both passes) is 418 / 571 / 2 px where the sac had none: the mouth
has daylight in it. [CrushBite before](placodus-CrushBite-before.png) and
[after](placodus-CrushBite-after.png). Skin unchanged at 12.36x (`Pry`, on `fore_paddle_L`, not
the mouth); every joint owns skin; paired audit exact; portraits re-rendered from the packaged
files; asset sizes refreshed.

## Finished: Hybodus (T3D-12A)

The custom `Mouth_lining` sac (320 of 336 vertices blended between `jaw` and `skull`) is replaced
by the era's `T.oral_shells`, imported into this self-contained builder rather than copied: a
palate rigid on `skull`, a floor rigid on `jaw`, each closed, each to a room cast from outside on
the closed intake surface. The generation arrived gaping, so each shell is built about *its own
jaw's* edge of the lumen -- the roof of the mouth and the top of the mandible, read as the largest
empty interval on the vertical line through the mouth's measured lateral axis -- with the floor
ending where there is mandible under the axis, the room's width cast in the jaw's flesh, a throat
blend of half the mouth's length and shells filling 97 % of the room. Every shell vertex is seated
inside the head's silhouette by rays (125 pulled in, 0.069 raw at most). Three faults in the cut
went with it: the skull's open hinge section is capped with its own vertices (`T.cap_cut`, over the
window's rear band), the seam's rim is folded in (`T.rim_flange`, 88 vertices), and the mandible's
normals -- 1,330 of 1,641 faces inward in the shipped file, drawn transparent by a single-sided
pass -- are put to a vote against the intake surface and flipped. `oral-shell-audit.mjs` finds
separate closed rigid shells on authored, twin and LOD; `throat-audit.mjs` reports 0 mixed vertices.

Strict-cull gape (`Heavy@0.50 Attack@0.43 Bite@0.17`): 498 / 667 / 222 px seen through the body
before, **346 / 517 / 6** now. `Bite`, the widest gape, is the mouth's own verdict and passes. The
tool still fails on `Heavy` and `Attack`, and what it fails on is not the mouth: 343 of the 346 and
497 of the 517 coincide with pixels the shipped body already opened, in one vertical strip behind
the corner of the mouth, and a ray through each meets one back-facing skin surface and no front
face, exiting under the throat 0.06 of a body behind the hinge -- the generation's first opercular
slit into a hollow head. On this body those seams are not closed loops (178 head boundary edges
remain; `T.seal_seams` closes 8), and filling a non-manifold crack would invent geometry across
it, so it is recorded as a generation defect rather than modelled over. Runtime is double-sided
and draws none of it. [Attack before](hybodus-Attack-before.png) and
[after](hybodus-Attack-after.png). Skin 5.93x unchanged; every joint owns skin; paired audit
exact; portraits re-rendered.

## Finished: Saurichthys (T3D-12A)

The same port as Hybodus, on the same self-contained kit, and this body's own lessons: the unbent
rostrum runs 0.001-0.025 raw off the midline, so the mouth's lateral centre is measured from the
cavity and a lining on x = 0 had stood beside the jaws; at the mouth line a side cast passes under
the upper rod, and `T.mouth_room`'s positive fallback read as room where there was open water, so
each shell's width is cast in its jaw's flesh with a miss counting as nothing; and the residual
373 px the old count carried were the generation's opercular seams, open slits behind the corner
of the mouth, which seal as closed loops here (`T.seal_seams`, 12 faces wearing their rims' UVs).
Hinge section capped (33 faces), rim folded (99 vertices), 174 shell vertices seated (0.037 raw
at most), throat 0.35, mandible normals voted (+2377, already outward). `oral-shell-audit.mjs`
and `throat-audit.mjs` pass as above (320 of 336 mixed before, 0 now).

Strict-cull gape (`Heavy@0.50 Attack@0.40 Bite@0.15`): 373 / 372 / 0 px before, **1 / 1 / 2** now,
PASS at tolerance 12, with 16 / 16 / 4 px of honest gape where the sac had none.
[Heavy before](saurichthys-Heavy-before.png) and [after](saurichthys-Heavy-after.png). Skin 3.61x
unchanged; every joint owns skin; paired audit exact; portraits re-rendered.

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
| Dinocephalosaurus | 364 | Port its curved-head custom sac to measured rigid shells (T3D-12B). |
| Hybodus | 320 → **0** | Done above (T3D-12A). |
| Keichousaurus | 132 | Port its custom sac while retaining the recently corrected Grab loop (T3D-12B). |
| Phragmoteuthis | 205 | Retire the invented crown hole/sac/beak, preserving the closed source crown and anchors (T3D-12B). |
| Placodus | 208 → **0** | Done above (T3D-12A). |
| Saurichthys | 320 → **0** | Done above (T3D-12A). |

The three T3D-12A ports above are delivered and re-audited (`throat-audit.mjs hybodus saurichthys
placodus`: 0 mixed jaw/skull vertices in every lining on authored and puppet). The other three are
T3D-12B's; this snapshot's numbers for them stand until that batch lands. Oral meshes remain hidden in the runtime and by default in the viewer.
The inventory is not a request for optional Tripo regenerations.

The [ShoreKit record](shorekit.md) includes exact posterior attachment tests, selected strict gape
views, fresh portraits, cap-regression correction and the exact-frame Coelophysis deformation
review. That last review distinguishes a continuous stretched cervical edge from an opening;
forced-visible authoring oral parts still need fit review before enabling them. No document here
claims every posed surface or camera angle is intersection-free.
