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

## Finished: Dinocephalosaurus, Keichousaurus and Phragmoteuthis (T3D-12B)

Three of the six custom builders in the inventory below, decided one at a time and then acted on.
The decision per animal — palate, floor, or neither — and the measurement behind it are the
[verdict table](oral-verdicts.md); this section is what changed in the builders and what the
packaged bodies now measure. None of it touches the rig, the clips or the anchors, so every later
skinning and `Grab` fix on these bodies stands: the paired audits pass with exact decoded parity on
all three authored/puppet/LOD triplets, `idle-bones.mjs` finds every joint owning skin, and the skin
figures are what they were (7.00×, 2.34×, 5.37×).

**Dinocephalosaurus — neither.** The owner's expectation was that this head needs no oral geometry
at all, and it was measured rather than assumed: `gape-solid.py` at the peak jaw rotation of `Bite`,
`Attack`, `Heavy`, `Eat` and `NeckStrike` (read off the packaged rig), strict cull, backdrop test
`r > .90, g < .20, b > .90`, on three versions of the same body. Shipped with the one-sac lining, 0 px
through the head at every shot. With the sac stripped out of the unpacked GLB and everything else
left alone, **0, 2, 3, 1, 1 px** against a tolerance of 12. With the sac *and* the seated hinge
tissue stripped out, 98, 87, 113, 50, 101 px. So the sac closed nothing that the hinge tissue was
not already closing — what a plane cut leaves open is the head's cross-section at the hinge, and
the hinge plug fills it, as it does on every jawed body in the era — and the generation paints its
lip on a closed snout with no cavity behind it, so there is no lumen wall for a gape to open onto.
The `Mouth_lining` (364 vertices, every one blended between `skull` and `jaw`) is removed from the
builder and nothing is built in its place; fangs and hinge tissue are unchanged.
[Before](dinocephalosaurus-Heavy-before.png) is the sac at `Heavy`'s widest, a flat pink triangle
filling the gape from hinge to snout; [after](dinocephalosaurus-Heavy-after.png) is the fang trap.

**Keichousaurus — palate and floor.** The 180-vertex sac (132 mixed) is now `T.oral_shells`: a
palate rigid on `skull` and a floor rigid on `jaw`, each a closed shell, sized to 0.84 of the head's
measured room and placed through the head's own curved frame (the `point` hook), overlapping at the
corner of the mouth. The seam is exactly where it was — the thin dark lip line within the pale
zone, not the countershading boundary that fooled the albedo method on this head — and the `Grab`
loop from T3D-05 is untouched (the paired audit checks it). `oral-shell-audit.mjs`: 200 vertices,
one unit weight each, no triangle bridging the bones, every edge shared by two faces, both halves
present, on authored, puppet and LOD. `gape-solid.py` at `Bite@0.25 Heavy@0.1 Attack@0.1 Eat@0.4
Ability@0.1`: 0 px through the body on the sac *and* on the shells, at the same backdrop test; the
shells open fewer silhouette pixels (55–62 against 76–84). The oral figure in `skin-tears.mjs` went
from 6.57× (the sac's wall doing what a stretching wall does) to the skin's own 2.34×; nine clips
tore an edge past 2× before and two do now. [Before](keichousaurus-Bite-before.png) and
[after](keichousaurus-Bite-after.png) at `Bite`'s widest.

**Phragmoteuthis — neither**, exactly as Ceratites above. The peristome cut (317 authored faces,
79 rim vertices; 128 and 49 on the twin), the sewn `crown_lining` sac (224 vertices, 205 mixed) and
the two `crown_beak` mandibles are retired and the crown is the closed surface the generation
delivered; `cut_peristome` survives uncalled because it is the crown-axis measurement the three
anchors are placed from, and `skull`/`jaw` survive because the lip band of the crown's own skin is
weighted to them. The jet bones (translation channels; `Sprint` 0.207 and `Ability` 0.331 off a
0.772 mantle) and the twelve-arm count are untouched, and the paired audit still proves both.
`gape-solid.py` at `Bite@0.22 Attack@0.4 Eat@0.37`: 0 px, the two passes differing by at most one
pixel, because a closed crown gives the cull shim nothing to open. `gape-crown.py` is **moot** on a
body with no mouth drawn — it frames off the lining and masks on the oral materials — and it now
records that and exits rather than failing on an empty `max()`. Closing the hole changed the mesh
graph the weight relaxation runs over, so clips whose worst edge sat at the crown moved both ways
by a fraction (`TurnRight` 5.06× → 2.79×, `Dive` 4.19× → 2.11×, `TurnLeft` 1.71× → 2.57×); the
worst figure, `Guard`'s funnel at 5.37×, did not move. [Before](phragmoteuthis-Attack-before.png)
and [after](phragmoteuthis-Attack-after.png), both straight down the crown axis at `Attack`'s reach.

`oral-shell-audit.mjs` now reports a body with no lining cleanly — every variant must agree, and
the hidden oral parts it *does* carry (hinge tissue) are listed — rather than failing it; the
per-body records are `oral-shell-audit.json` in each creature folder, and `qa.json` beside each
builder carries the gape and skin figures into `validation.json` on every rebuild. The SHA-bound
throat audit of the three rebuilt pairs is [`t3d-12b-audit.json`](t3d-12b-audit.json).

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
priority repairs above. At that snapshot exactly six custom builders still retained a named lining
with mixed jaw/skull weights in **both** authored and puppet models; three of them
(Dinocephalosaurus, Keichousaurus, Phragmoteuthis) have since been decided and delivered in
T3D-12B, above, and the other three are T3D-12A's:

| Species | Mixed lining vertices per variant | Remaining bounded work |
| --- | ---: | --- |
| Dinocephalosaurus | 364 | Decided and delivered above (T3D-12B). |
| Hybodus | 320 → **0** | Done above (T3D-12A). |
| Keichousaurus | 132 | Decided and delivered above (T3D-12B). |
| Phragmoteuthis | 205 | Decided and delivered above (T3D-12B). |
| Placodus | 208 → **0** | Done above (T3D-12A). |
| Saurichthys | 320 → **0** | Done above (T3D-12A). |

All six are now delivered: the T3D-12B three were ported from the preserved branch's deltas onto
the current builders (never merged wholesale, since the branch predates the skinning and `Grab`
fixes on `main`) and rebuilt, and the T3D-12A three above are re-audited (`throat-audit.mjs
hybodus saurichthys placodus`: 0 mixed jaw/skull vertices in every lining on authored and puppet).
The counts in the table are this snapshot's, taken before either batch landed. Oral meshes remain
hidden in the runtime and by default in the viewer.
The inventory is not a request for optional Tripo regenerations.

The [ShoreKit record](shorekit.md) includes exact posterior attachment tests, selected strict gape
views, fresh portraits, cap-regression correction and the exact-frame Coelophysis deformation
review. That last review distinguishes a continuous stretched cervical edge from an opening;
forced-visible authoring oral parts still need fit review before enabling them. No document here
claims every posed surface or camera angle is intersection-free.

## Jaw junction — T3D-15, 20 September 2026

The class behind the owner's Hybodus and Saurichthys report: every jawed body's mandible is a
separate shell weighted `jaw` at 1 against a skull-weighted body, and the cut opened at the hinge by
the gape — 6.05 % of a body on Hybodus, eleven bodies past 0.5 %. `tools/triassic/lag.mjs` measures
it (the rest-coincident pairs at the cut, over every clip), `T.jaw_junction` closes it with one
weight field over both parts, and nineteen builders were ported and rebuilt. The whole record —
instrument, helper, the before/after table for all 27 bodies, what was left alone and why — is
[`../jaw-skinning.md`](../jaw-skinning.md); the renders are `<id>-jaw-before.png` / `-after.png`
beside this file. Nothing here touches the shells or the verdicts above: the helper writes weights
only, and `oral-shell-audit.mjs` passes on every rebuilt triplet as before.

## Oral verdicts — T3D-14, 20 September 2026

Per animal, the decision the mouth rule asks for first — whether the mouth needs filling at all —
with the measurement behind it. Both rows are strict-cull counts from `tools/triassic/gape-solid.py`
(backdrop seen *through* the body at full gape with every backface culled; tolerance 12).

| Species | Verdict | Before → after | Evidence |
| --- | --- | --- | --- |
| Shonisaurus | **neither** — no oral geometry | 4 px → 6 px (Heavy@0.35; Bite, Attack 0 → 0) | The closed generation shows no backdrop through its gape, so the authored palate, floor, throat tube and tooth rows were removed and `package-audit.mjs` now refuses anything the runtime classifier would match. The cull *opens* 1,863 px on Heavy that are not enclosed by the silhouette — the roof of the open mouth seen from above the lip line, which the game already showed because `Oral palate` was the one part it hid — so nothing a player sees got worse. `validation.json` records `oralGeometry: "none"`; skin 1.44x unchanged; anchors and all 21 clips unchanged. [eyes before](shonisaurus-eyes-before.png) / [after](shonisaurus-eyes-after.png). |
| Nothosaurus | **palate + floor + rigid hinge halves** | 53 / 43 / 47 px → **1 / 0 / 0 px** (Bite@0.25 / Heavy@0.3 / Attack@0.25) | The head is unbent in the mesh to face straight forward (yaw −20.35° → −0.29°) and the jaw cut is the plane fitted to the modelled lip on both flanks (old seam 0.0027 raw under the lip, 0.0048 on the left flank; new residual ±0.0009 per flank). The floor and palate stay as separate rigid shells; the hinge tissue — one ellipsoid blended 146 vertices between skull and jaw, and standing proud of the throat — is two rigid capped halves seated by ray parity (290/290 inside). All four are one `Nothosaurus oral lining` mesh: `oral-shell-audit.mjs` passes on authored, puppet and LOD; `throat-audit.mjs` reports 0 mixed vertices (was 146). Skin 2.98x unchanged. [head before](nothosaurus-head-before.png) / [after](nothosaurus-head-after.png). |

## The mouth is the cut, or there is no cut — T3D-31, 21 September 2026

The owner, twice. First: *"instead of just placing extra geometry there, can we actually fill in
the holes? ... following the actual cut that we create for cut mouths, and maybe just making it a
little bit concave toward the top and bottom palette to give a feeling of space inside."* Then,
looking at Mosasaurus: *"when his mouth opens I see some holes — shouldn't we just be stretching the
geometry instead of cutting it? the open mouth is essentially just a bone motion that should have
organic skinning inside of it."*

Both are right, and they are right about **different kinds of generation**. What this pass
establishes is that the question to ask first is not how to fill a mouth but whether the cut is
earning its place, and that there are three answers.

### The three kinds, and how to tell which you have

`T.cut_rim` is the instrument: it reports what a cut actually left open in one half of a head,
inside a region the builder names — how many loops, how long each is, the box it occupies, and how
many of its vertices are *on the seam* rather than pre-existing rim. It costs nothing and it is run
before anything is built.

1. **Shut.** The generation models no interior at all; Dinocephalosaurus is the extreme, its lip
   painted on a closed snout. Turning the jaw bone opens nothing, because there is no aperture. The
   cut is what makes one and what it leaves is a hole in each half, and something has to close it.
   Rhaeticosaurus is the worked example below.
2. **A slit or a shallow cavity.** Judge per body.
3. **Gaping.** A palate, a floor, a tongue, a commissure — all modelled. The aperture exists and so
   do its walls, and a cut through it makes a **boundary where the surface was continuous**.
   Mosasaurus is the worked example below, and the tell is unmistakable once it is measured: its
   cut left a loop reaching 0.057 of a body behind the hinge on a gape 0.176 of a body long, which
   is the back third of the mouth and nothing else. Cymbospondylus measures the same way (a loop
   0.042 of a body behind the hinge on a mouth 0.14 long) and is not ported here.

The measurement is per half and per body, and it is cheap: no render, no rebuild beyond the
cut the builder was taking anyway. Nothosaurus is the case that shows why it is a *report*
rather than a number: its cut leaves 225 boundary edges per half, 62 of them the head's
cross-section at the skull joint and the other 163 in six closed curves — the lip and five
small loops the generation's own modelled slit contributes at the snout. All six are filled
in one pass, because `triangle_fill` over the whole selection in the mouth's own plane does
not care how many curves it was given.

### 1 — the cut is capped with its own rim, and domed (`T.cap_mouth`)

Span a cut half's boundary and that half is a closed solid again, and the surface that spans it
*is* the roof or the floor of the mouth, following the measured seam exactly, because the rim is
what bounds it. Against a shell placed inside the opening, four things:

- **It closes by construction.** A surface spanning a closed curve leaves no hole. A shell has to
  be rendered against a backdrop to find out whether it covers the opening, which is how
  Cartorhynchus shipped leaking 51 px at its commissure with nobody knowing.
- **The geometry is the body's own.** The fill uses no new points at all (`triangle_fill` over the
  rim, projected along the mouth's own normal); the points the dome needs are face centroids of
  that fill, so every vertex is a convex combination of rim vertices. Nothing is invented, and a
  fitted or curved cut is followed for free with no per-body sizing.
- **It wears the skin it closes.** UVs and vertex colours are taken off the rim, inverse-distance
  weighted, so the palate is the head's own albedo rather than a flat-shaded island.
- **Each cap is part of its own half**, so it is rigid to that half's bone through the same weight
  field as the skin around it. There is no second surface to keep coincident with the first —
  the failure that cost Mosasaurus four rebuilds.

The lip run is what must not be filled, and the answer is *not* to separate it from the rest, which
cannot be done robustly on a curved cut (`cap_cut`'s docstring has always said the whole boundary is
one loop). It is to fill the whole loop on **each half separately** and dome each fill into its own
half: the two plates part, and what is between them is the cavity. The lip is then the one curve
where the two caps still meet, which is what a lip is.

The order is `T.cap_cut` over the transverse cross-sections at the ends of the cut first — they dip
out of the mouth's own plane and would fold under a planar fill — and then `T.cap_mouth` over what
is left, which is the two lip runs and the short chords those fans closed the ends with.

**The dome's depth is measured.** Each cap vertex is pushed into its own half by a fixed fraction of
*its own distance from the nearest rim vertex*. One rule, three properties: exactly zero on the rim,
so the cap meets the skin without a step; deepest along the middle of the mouth and shallow at the
lips, at the snout and in the corners, which is the shape a palate has; and scaled to the local
mouth size by construction, because the distance from a point on the midline to the rim *is* the
half-width there. A builder that has measured how much head there is above the mouth line passes it
as a ceiling, and the cap then cannot reach the skin whatever the fraction says.

**The fraction itself is a judgement and is recorded as one.** What is measured is the *rule* — the
depth is the local mouth size, per vertex, and the ceiling is the head's own section — and what a
person chose is how much of that to use: 0.34, on both bodies, from looking at the renders. Both
builders write the fraction and the deepest push it produced into `validation.json`
(0.0160 raw on Rhaeticosaurus' 0.10-long mouth, 0.0106 on Nothosaurus' 0.13-long one), so a
reviewer who wants a shallower or deeper mouth changes one number and can see what the last one
was worth.

### 2 — a gaping generation is not cut at all (`T.jaw_field_uncut`)

The body stays one surface and the mouth opening is a bone turning inside skin, which is what every
other joint on the animal already is. The weighting is full `jaw` below the mouth line and forward
of the hinge, full skull above it, and a band at the commissure that stretches.

**The band is the one number with a cost either way** — too wide and the front of the mandible takes
only part of the jaw's rotation, so the lower tooth row lags the bone it is drawn on; too narrow and
the whole swing is carried by a strip of skin at the corner, which is where linear blend skinning
pinches. So it is swept and the sweep is recorded rather than a value being asserted.

### The instrument was measuring the wrong body

`gape-solid.py` rendered the packaged file as it is. The game hides everything
`src/shared/oral-geometry.ts` matches — every `Oral cavity lining`, every `Seated jaw hinge tissue` —
so a gape closed *by* one of those parts passed the proof and still showed a hole to a player. Every
verdict in [`oral-verdicts.md`](oral-verdicts.md) before this pass was taken that way.

`--as-drawn` hides what the runtime hides and then measures exactly as before. On the shipped
bodies:

| Body | plain (what the file contains) | as drawn (what the game shows) |
| --- | --- | --- |
| Mosasaurus | 0 / 0 / 0 / 0 px through the body | **71 / 292 / 0 / 222** px through, 486 / 1,904 / 0 / 1,466 opened |
| Rhaeticosaurus | 0 px at six opening clips | **4,626** px through at `Heavy`, 4,427–6,066 opened at the others |

Both read 0 through and 0 opened after this pass. The number to read in an as-drawn run is
`holesOpenedByCulling` as much as `seenThroughTheBody`: an opened pixel is a pixel of the animal
drawn *only* by a back face, which a single-sided runtime does not draw at all, and on a mouth held
wide open from the side those pixels reach the frame edge through the gape and so are not counted as
enclosed.

### And whether it reads as a mouth is a picture

`tools/triassic/mouth-space.py` takes it: three views of one posed gape, framed on the animal's own
`anchor_mouth` and `anchor_mouth_inside` so the frame follows the pose, and lit from inside — into
the gape from in front and above the lip, square down the mouth's own axis, and a cutaway whose near
clipping plane is the animal's own midline. It applies the runtime's oral classifier, so the picture
is what a player sees.
