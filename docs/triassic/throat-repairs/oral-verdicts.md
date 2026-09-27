# Oral geometry verdicts — what each mouth needs, measured

`CLAUDE.md`'s rule is that the first question to ask of a mouth is whether it needs filling at all,
and that authored geometry inside one is justified per animal by a gape that actually shows through,
never added as a matter of course. This table is that question answered per body, so the answer is a
decision on the record rather than an absence of work.

**T3D-31, 21 September 2026, changed what the question is** and re-opened every answer below it.
Two things:

- There is a question **ahead** of "does this mouth need filling": *does this head need cutting at
  all?* Three kinds of generation arrive, and only one of them wants a cut. See
  [the README](README.md#the-mouth-is-the-cut-or-there-is-no-cut--t3d-31-21-september-2026).
- **The instrument was measuring a body the game does not draw.** `gape-solid.py` rendered the
  packaged file as it is, and the runtime hides everything `src/shared/oral-geometry.ts` matches —
  every `Oral cavity lining`, every `Seated jaw hinge tissue`. So a gape closed *by* one of those
  parts passed the proof and still showed a hole to a player. Every figure in the T3D-12B/T3D-14
  table below was taken that way. `--as-drawn` hides what the runtime hides and measures exactly as
  before; the as-drawn sweep is the second table.

## How each figure is measured

`tools/triassic/gape-solid.py` at the peak jaw rotation of the clips named — rendered against
saturated magenta twice, with and without a backface-cull shim, at the backdrop test
`r > .90, g < .20, b > .90`, counting only backdrop the cull *opened* and the body *encloses* —
against a tolerance of 12 px in 378,000. Where a body is measured with a part stripped out, the
part was removed from the unpacked packaged GLB by name and nothing else was changed.

**Two numbers, and on an as-drawn run read both.** `seenThroughTheBody` is opened backdrop the
silhouette encloses; `holesOpenedByCulling` is every pixel of the animal whose only surface is a
back face. The second is the larger and the more honest on a mouth held wide open from the side,
because a hole there reaches the frame edge through the gape and so is not enclosed. And the cull
shim models a *single-sided* runtime: most of these bodies export `doubleSided`, so what a player
actually sees through such a gap is the unlit **inside of the head** rather than the backdrop. That
is still a gap in the surface where there should be none —
[Mosasaurus at `Bite`](mosasaurus-Bite-corner-before.png) is what it looks like with no shim at all,
two black slashes at the corner of the mouth, and [after](mosasaurus-Bite-corner-after.png) is
continuous skin.

## As drawn: the roster, 21 September 2026

Three widest-opening clips per body, `--as-drawn`, on the shipped packaged files. **`opened` is the
column to read.** Nothing here is a claim about every camera: it is one side-on framing per clip.

**Nor about every clip, and on one body that mattered.** Three is a sample, and the three widest
are not where a leak is worst: Cartorhynchus reads 2 px through on its three and **36 px on the
sixteen its `paired-audit.json` reports a non-zero gape for** — at `Guard`, `Grab` and `Swim`,
which no sweep was ever going to take. Where a body is being ported rather than surveyed, run every
clip the audit says opens the jaw.

| Body | worst `through` | worst `opened` | note |
| --- | ---: | ---: | --- |
| **Nothosaurus** | **0** | **0** | ported in T3D-31: capped with its own rim |
| **Rhaeticosaurus** | **0** | **0** | ported in T3D-31: capped with its own rim |
| **Mosasaurus** | **0** | **0** | ported in T3D-31: not cut at all |
| **Dinocephalosaurus** | **0** | **0** | ported in T3D-32C: capped with its own rim; all ten opening clips |
| **Tanystropheus** | **0** | **0** | ported in T3D-32C: capped with its own rim; all thirteen opening clips |
| Helicoprion | 0 | 0 | already clean; no legacy lining |
| Askeptosaurus | 1 | 193 | |
| Odontochelys | 6 | 236 | |
| Placodus | 23 | 454 | |
| Saurichthys | 123 | 523 | **measured and recorded in T3D-32C, not re-cut**: the authored body and its twin are different kinds of generation and `T.cap_mouth` refuses on the authored half by construction — see [the README](../../../tools/triassic/creatures/saurichthys/README.md#the-cut-is-earning-its-place--measured-t3d-32c). Its pectorals and its twin's textures were repaired in the same pass. |
| **Cartorhynchus** | **1** | **1** | ported on 22 September 2026 on a human's re-aimed cut (`mouths/cartorhynchus-mouth.json`): capped with its own rim, no front bound, no lining, no hinge plug. Measured over **all sixteen** clips that open its jaw rather than the three this table samples, where the shipped body read **36 / 693** and the same re-aim on the sac read **189 / 2,155**. The one pixel is at `Guard`, a 0.06-rad gape; every wide gape is 0 / 0 |
| Cymbospondylus | 4 | 933 | |
| Archelon | 1 | 1,262 | |
| **Macrocnemus** | **0** | **0** | ported in T3D-32B: arrived shut, capped with its own rim on a *fitted* cut (was 934 / 2,594 over **all twelve** opening clips) |
| Hybodus | **1,346** | **2,833** | **reverted in T3D-36 at the owner's request.** T3D-32A took the cut out and read 0 / 0; the mouth was reported as not working well and `build.py` is restored verbatim to `a6d184c^` — the labelled cut, `T.cap_cut`, `T.rim_flange`, the pre-cut `T.seal_seams` and the two rigid `T.oral_shells`. Measured over **all fifteen** clips whose jaw leaves the shut pose rather than the three this table samples: the worst is `Heavy@0.4` 1,346 / 2,833, then `Bite@0.133` 1,261 / 2,670, `Bite@0.167` (its own peak) 1,073 / 2,328, `Attack@0.333` 875 / 1,985, `Grab@0.1` 158 / 518 and `Shake@0.6` 142 / 497; everything else 0 / 0, `Heavy` and `Attack` included at their own peaks. Plain run 52 / 1,046 — the rigid shells *are* what stands in the gap and the runtime hides them, which is the `--as-drawn` lesson on the body it was written about. Not re-engineered: the routes out are in [the README](../../../tools/triassic/creatures/hybodus/README.md#t3d-36--the-cut-put-back-at-the-owners-request) and the decision is the owner's |
| Mixosaurus | 0 | 3,697 | |
| **Atopodentatus** | **0** | **0** | ported in T3D-32A: capped with its own rim (was 3,738 / 4,494) |
| Keichousaurus | 2 | 4,375 | |
| Hupehsuchus | 38 | 4,784 | |
| Coelophysis | 3 | 7,276 | |
| Mystriosuchus | 1 | 7,734 | |
| **Aphaneramma** | **0** | **0** | ported in T3D-38 on a human's re-aimed cut (`mouths/aphaneramma-mouth.json`): capped with its own rim, lining and hinge plug retired. Measured over **all fifteen** opening clips: the shipped body read **77 / 10,730** (the 77 at `Sprint`, a mouth all but shut); see [T3D-38](#t3d-38-two-linings-out-through-the-cheek-and-two-aimed-cuts-taken) |
| **Birgeria** | **0** | **0** | ported in T3D-38 on a human's re-aimed cut (`mouths/birgeria-mouth.json`): capped with its own rim, lining and hinge plug retired. Measured over **all seventeen** opening clips: the shipped body read **203 / 15,357** — the widest `opened` on the roster at `Gape`, and 203 px through the head at `Swim` with the mouth all but shut; see [T3D-38](#t3d-38-two-linings-out-through-the-cheek-and-two-aimed-cuts-taken) |
| **Henodus** | **0** | **0** | ported in T3D-32B: the cut makes the aperture, capped with its own rim fanned to a sunk hub (was 407 / 462). T3D-19's fringe pixels were **not** the fringe — a ray through every one of them meets one back face of the mandible and nothing else |
| Dinocephalosaurus | **120** | 197 | its verdict was **neither**, and it is still right about the lining — but the `Seated jaw hinge tissue` that closes its hinge cross-section is hidden in play, so as drawn the head is open there |
| Ceratites, Phragmoteuthis | — | — | no jaw and no mouth drawn; settled in T3D-02a and T3D-12B and unaffected by any of this |
| Shonisaurus | 13 | 1,943 | its verdict is **neither** and stays; the pixels are the generation's own open gape and the slivers at the tooth row this table already describes |
| ~~Tanystropheus~~ | ~~142~~ | ~~1,388~~ | **superseded by T3D-32C**: capped with its own rim, `Oral cavity lining` and `Seated jaw hinge tissue` both retired, and its jaw cut re-fitted (T3D-20) from a median to a robust least-squares ramp over both flanks' own readings. |

The Dinocephalosaurus row is the one that changes a verdict rather than confirming it. T3D-12B
measured it three ways and concluded correctly that the **sac** closed nothing the hinge plug was
not already closing; what nobody asked was whether the hinge plug is drawn. It is not. So the
verdict "neither" is right about a *lining* and wrong about the mouth: what that head needs is its
hinge cross-section capped with its own vertices, which is `T.cap_cut`, and no lining at all.

## T3D-38: two linings out through the cheek, and two aimed cuts taken

**A body can pass every gape proof there is and still show its mouth on the outside of its face.**
`gape-solid.py` counts backdrop the cull *opens*; a lining that stands proud of a cheek draws lining
over skin, which is not backdrop. Birgeria and Aphaneramma were both doing it, and a reviewer saw it
through the viewer's *Mouth geometry* switch before any instrument did.

The instrument is a render and a ray. Painted an emissive marker the animal cannot produce, each
shut head is photographed from four units off both flanks and from above; every marker pixel is
mouth a camera outside the animal can see, and the camera's own ray cast through one asks every
surface on the line whether the lining is really the first.

| Body | marker pixels, shut head, shipped | the rays | the cause |
| --- | ---: | --- | --- |
| Birgeria | **14,868** (7,101 / 4,590 / 3,177) | 11 of 12 meet the lining first, 0.002–0.019 in front of the skin | seated by `depth()` beside the modelled slit, which reads the lumen's wall |
| Aphaneramma | **9,714** (5,007 / 3,194 / 1,513) | 11 of 12 meet the lining first; on 2 there is no skin on the line at all | a twelve-step shrink that returned the vertex at 0.615 of the way out when twelve steps were not enough |

Ray parity over the shipped meshes (nine oblique rays, majority) found only 35 of 816 and 2 of 720
lining vertices outside the solid — the lining lies a hair proud over large areas, which a
per-vertex vote barely registers and a picture shows at once.

Both mouths had also been re-aimed in the viewer's mouth editor, and both files hash-matched the
bodies they were aimed on. So the fix is not to re-seat the shells about the old line but to take
the cut the reviewer aimed and close it the way this page's verdicts already close a cut: **with its
own rim** (`T.cap_cut`, `T.cap_mouth`), following Cartorhynchus' builder. Neither body carries an
oral mesh now, so there is nothing to hide in play and nothing for the switch to show; each cap
vertex is asserted inside its own body's closed surface or within 0.0025 raw of its skin, and seen
along none of the cube's 26 directions from further out than that. Neither body goes on
`oral-greenlit.json`: that is a human's verdict, and there is no authored mouth geometry left on
either for it to be about.

`gape-solid.py` over every clip whose jaw leaves the shut pose, each at its own peak, before (the
shipped `134d7f01…` and `ad7ebb00…`) and after; *through / opened*:

#### Birgeria

| Shot | plain, before → after | as drawn, before → after | shown, before → after |
| --- | ---: | ---: | ---: |
| `Gape@0.4667` | 0 / 423 → 0 / 0 | 4 / 15,357 → 0 / 0 | 0 / 423 → 0 / 0 |
| `Ability@0.4667` | 0 / 122 → 0 / 0 | 4 / 8,416 → 0 / 0 | 0 / 122 → 0 / 0 |
| `Heavy@0.5333` | 0 / 78 → 0 / 0 | 2 / 7,239 → 0 / 0 | 0 / 78 → 0 / 0 |
| `Bite@0.1333` | 1 / 159 → 0 / 0 | 1 / 9,592 → 0 / 0 | 1 / 159 → 0 / 0 |
| `Attack@0.4` | 0 / 85 → 0 / 0 | 1 / 7,487 → 0 / 0 | 0 / 85 → 0 / 0 |
| `Eat@0.3667` | 0 / 107 → 0 / 0 | 1 / 8,067 → 0 / 0 | 0 / 107 → 0 / 0 |
| `FastStart@0.3` | 0 / 32 → 0 / 0 | 4 / 5,539 → 0 / 0 | 0 / 32 → 0 / 0 |
| `Hit@0.2667` | 0 / 21 → 0 / 0 | 1 / 4,724 → 0 / 0 | 0 / 21 → 0 / 0 |
| `Stagger@0.6` | 0 / 17 → 0 / 0 | 4 / 4,656 → 0 / 0 | 0 / 17 → 0 / 0 |
| `Death@1.8` | 0 / 17 → 0 / 0 | 0 / 4,842 → 0 / 0 | 0 / 17 → 0 / 0 |
| `Flop@0.1333` | 0 / 78 → 0 / 0 | 3 / 7,446 → 0 / 0 | 0 / 78 → 0 / 0 |
| `Grab@0.1` | 0 / 10 → 0 / 0 | 7 / 2,887 → 0 / 0 | 0 / 10 → 0 / 0 |
| `Breath@1.2` | 0 / 5 → 0 / 0 | 44 / 616 → 0 / 0 | 0 / 5 → 0 / 0 |
| `Guard@0.6` | 0 / 6 → 0 / 0 | 10 / 913 → 0 / 0 | 0 / 6 → 0 / 0 |
| `Idle@1.3` | 0 / 4 → 0 / 0 | 81 / 378 → 0 / 0 | 0 / 4 → 0 / 0 |
| `Sprint@0.4667` | 0 / 4 → 0 / 0 | 194 / 375 → 0 / 0 | 0 / 4 → 0 / 0 |
| `Swim@0.7333` | 0 / 4 → 0 / 0 | 203 / 407 → 0 / 0 | 0 / 4 → 0 / 0 |
| worst | **1 / 423 → 0 / 0** | **203 / 15,357 → 0 / 0** | **1 / 423 → 0 / 0** |

#### Aphaneramma

| Shot | plain, before → after | as drawn, before → after | shown, before → after |
| --- | ---: | ---: | ---: |
| `Bite@0.1` | 0 / 0 → 0 / 0 | 0 / 10,730 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Heavy@0.5667` | 0 / 0 → 0 / 0 | 2 / 6,360 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Ability@0.3333` | 0 / 0 → 0 / 0 | 1 / 10,156 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Attack@0.4` | 0 / 0 → 0 / 0 | 1 / 7,604 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Eat@0.3667` | 0 / 0 → 0 / 0 | 1 / 8,764 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Hit@0.3` | 0 / 0 → 0 / 0 | 1 / 6,623 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Stagger@0.5333` | 0 / 0 → 0 / 0 | 3 / 6,782 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Death@1.8` | 0 / 0 → 0 / 0 | 9 / 6,779 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Breath@1.1` | 0 / 0 → 0 / 0 | 8 / 3,914 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Grab@0.1` | 0 / 0 → 0 / 0 | 4 / 5,800 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Breathe@1.5` | 0 / 0 → 0 / 0 | 3 / 5,338 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Guard@0.6` | 0 / 0 → 0 / 0 | 11 / 3,406 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Idle@1.5` | 0 / 0 → 0 / 0 | 67 / 1,527 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Swim@0.9333` | 0 / 0 → 0 / 0 | 76 / 1,588 → 0 / 0 | 0 / 0 → 0 / 0 |
| `Sprint@0.5333` | 0 / 0 → 0 / 0 | 77 / 1,630 → 0 / 0 | 0 / 0 → 0 / 0 |
| worst | **0 / 0 → 0 / 0** | **77 / 10,730 → 0 / 0** | **0 / 0 → 0 / 0** |

The *shown* column is the switch's view: before, the lining closed every gape it was drawn in (so
the plain and shown runs agree) while standing out of the cheek at rest; after, there is nothing
to switch. Pictures: `verification/birgeria-mouth-space.png` and `aphaneramma-mouth-space.png`, and
the shipped linings as the switch drew them in `*-mouth-space-before-shown.png`.

## T3D-31: the three ported bodies

| Body | Kind | What ships | Measurement |
| --- | --- | --- | --- |
| **Rhaeticosaurus** | **shut** — one closed solid, the lip painted on it | no oral geometry: `cap_cut` over the hinge cross-section (50 faces authored / 31 twin) and `cap_mouth` over the lip (594 / 342 faces), domed at 0.34 of each vertex's own distance from the rim, bounded at 0.55 of the cast room. Lining and hinge ellipsoid retired. | `cut_rim`: one closed loop of 116 vertices per half, 68 on the seam. Plain gape 0 px through before and after, **166–177 opened → 0**. As drawn, `Heavy` **4,626 px through → 0**; `Attack`/`Bite`/`Eat` 4,427–6,066 opened → 0. Skin 2.81x unchanged. |
| **Nothosaurus** | **shut**, with a modelled slit and a **fitted, tilted** cut plane | no oral geometry: `cap_cut` at the skull joint (64 / 31 faces) and `cap_mouth` over the fitted lip (1,359 / 513 faces). `Oral floor`, `Palate` and both rigid hinge halves retired. | `cut_rim`: 225 boundary edges per half — 62 the cross-section at the skull joint, then **163 in six closed curves**, the lip (125) and five small loops the generation's own slit contributes, all capped. As drawn **2,790 / 2,509 / 2,044 / 1,849 opened → 0 / 0 / 0 / 0**. Skin 2.98x unchanged; `lag.mjs` unchanged (the same one pair at 0.28 % the shipped body had). |
| **Mosasaurus** | **gaping** — palate, floor, tongue and commissure all modelled | **no cut**: `T.jaw_field_uncut` weights the mouth the generation drew, band 0.50 of the head's half depth at the hinge. Lining and hinge ellipsoid retired. | `cut_rim` on the body it replaces: one loop of 156 vertices per half reaching 0.057 of a body behind the hinge, on a gape 0.176 of a body long — the back third of the mouth and nothing else. As drawn **71 / 292 / 0 / 222 through → 0 / 0 / 0 / 0**, 486 / 1,904 / 0 / 1,466 opened → 0. Skin 2.54x, exactly what the cut body shipped. |

The dome depth is `0.34` on both capped bodies and it is not a taste: each cap vertex is pushed into
its own half by that fraction of *its own distance from the nearest rim vertex*, which is zero at the
rim, deepest along the middle of the mouth and scaled to the local mouth size by construction.
Rhaeticosaurus' deepest push is 0.0160 raw on a mouth 0.10 long; Nothosaurus' 0.0106 on a mouth 0.13
long. Both are bounded by the head's own measured section, and Nothosaurus asserts every cap vertex
inside that section (0 outside) while *recording* the ray-parity count (58 of 604 on the palate) —
which is the rule from `CLAUDE.md`: beside a modelled slit a parity or normal test answers about the
lumen's wall rather than the skull.

## The earlier table, T3D-12B and T3D-14 — measured on the file rather than on what is drawn

These rows are kept because the reasoning in them is still right about the *lining*, and because
they are the record of what was measured when. Every figure is a plain (not `--as-drawn`) run.

| Body | Verdict | Palate | Floor | Measurement | State |
| --- | --- | --- | --- | --- | --- |
| **Dinocephalosaurus** | **neither** | — | — | Peak gape of `Bite`, `Attack`, `Heavy`, `Eat`, `NeckStrike`. Shipped with the one-sac `Mouth_lining`: 0, 0, 0, 0, 0 px through the head. **Sac stripped, everything else as it was: 0, 2, 3, 1, 1 px.** Sac *and* seated hinge tissue stripped: 98, 87, 113, 50, 101 px. The sac closed nothing the hinge plug was not already closing; the generation paints its lip on a closed snout and models no cavity, so there is no lumen wall for a gape to open onto. | Delivered: sac removed from the builder, no palate or floor built. **Superseded in part**: the hinge plug is hidden in play, so as drawn this head is open at the hinge (120 px). The repair is `T.cap_cut`, not a lining. |
| **Keichousaurus** | **palate + floor** | rigid `skull`, 100 vertices | rigid `jaw`, 100 vertices | Peak gape of `Bite`, `Heavy`, `Attack`, `Eat`, `Ability`. The 180-vertex sac (132 mixed): 0 px through the body; the palate/floor pair (`T.oral_shells`, 0.84 of the measured room): 0 px, and 55–62 silhouette pixels opened against the sac's 76–84. Oral strain 6.57× → 2.34×. | Delivered. As drawn it opens 4,267–4,375 px, so it is a candidate for the cap. |
| **Phragmoteuthis** | **neither** | — | — | `Bite@0.22`, `Attack@0.4`, `Eat@0.37`. With the peristome cut, the sewn lining and the two mandibles: 0 px. With the crown closed as delivered: 0 px, passes differing by 0–1 px. A beak inside an arm crown is never in frame. | Delivered; unaffected by T3D-31 (no jaw, no cut). |
| Ceratites | neither | — | — | Settled by T3D-02a; re-measured at `Bite@0.25`, `Attack@0.44`, `Eat@0.4`: 0, 0, 0 px through the body. | Delivered; unaffected by T3D-31. |
| **Shonisaurus** | **neither** | — | — | T3D-14. Rebuilt with the palate, floor, throat tube and both tooth rows removed. `Bite@0.3`, `Attack@0.5`, `Heavy@0.35`, `Eat@1.433`: **0, 0, 6, 87 px**. The `Eat` pixels are slivers along the tooth row at the commissure, between the generation's own tooth crowns and the lip, not a hole into the head. | Delivered: no oral geometry. Not re-measured as drawn in T3D-31's sweep. |
| **Nothosaurus** | superseded | — | — | T3D-14: `Bite@0.25`, `Heavy@0.3`, `Attack@0.25`: 53, 43, 47 px before, 1, 0, 0 after, with the head unbent and the cut fitted to the modelled lip on both flanks. | **Superseded by T3D-31**: the fitted cut stays, the shells and the hinge halves are gone and the cut is capped with its own rim. |

## What decided each one

**A plane cut through a closed head is open at the hinge, and the hinge plug is what closes it.**
Dinocephalosaurus' three renders separated the sac from the hinge tissue: stripping the sac moved
the count from 0 to 3; stripping the hinge tissue as well moved it to 113. That is still the right
reading, and T3D-31 adds the half of it nobody asked: the hinge plug is hidden in play, so it is
closing the hole for the audit and not for the player. What closes it for both is the cut's own
cross-section, fanned with its own vertices.

**A filled mouth is justified by a leak** — and by T3D-31 the leak has to be measured on the body
the game draws.

**A crown with no mouth modelled gets none.** Unchanged.

**What this table does not claim.** A count of zero at three or five side-on shots is what
`gape-solid.py` measures and no more: it is not every camera, and it does not see a mouth that
merely reads badly. That last question is `tools/triassic/mouth-space.py`'s, and it is a picture
rather than a number.


## T3D-32C: three more bodies, two ported and one measured

| Body | Kind | What ships | Measurement |
| --- | --- | --- | --- |
| **Dinocephalosaurus** | **shut** — the lip is *painted* on a closed snout; the cavity instrument finds nothing | no oral geometry at all: `cap_cut` over the hinge cross-section (27 faces authored / 18 twin) and `cap_mouth` over the lip (252 / 162 faces), domed at 0.34 of each vertex's own distance from the rim and bounded at 0.55 of the head's measured room under the mouth line. The `Seated jaw hinge tissue` ellipsoid is retired. **This head is now the only jawed body in the era that hides nothing.** | `cut_rim`: one closed loop of 55 vertices per half, reaching 0.083 of a body on a mouth 0.083 long; 92 of 94 boundary edges in the head on the seam or the hinge cross-section. As drawn **104 / 94 / 120 / 54 / 107 px through and 166 / 153 / 197 / 65 / 171 opened → 0 at all ten opening clips**; plain 0–3 through and 12–80 opened → 0. Deepest dome 0.0081 raw. Skin 7.00x unchanged, mouth region jaw 1.02x / skull 1.03x. |
| **Tanystropheus** | **shut**, with the mouth painted on and a cut re-fitted to it | no oral geometry: `cap_cut` (29 / 19 faces) and `cap_mouth` (65 / 38 rim edges, one cycle each), each cap bounded by **its own** room — palate 0.00915 deep, floor 0.00599 — because the mouth line falls to a fifteenth of the section at the snout tip and one shared bound would flatten one of the two. `Oral cavity lining` and `Seated jaw hinge tissue` retired; the authored fish-trap fangs kept. | `cut_rim`: one closed loop of 92 vertices per half reaching 0.0884 on a mouth 0.0889 long (twin 55 / 0.0874). As drawn **0 through and 0 opened at all thirteen opening clips**, from 167/1352 at `SnapLeft` and 628/701 at `Breath`. Skin 3.00x unchanged. Cut-to-measured-line 0.01159 → **0.00198 raw** (T3D-20). |
| **Saurichthys** | **the two bodies are different kinds** — recorded, not re-cut | unchanged: `cap_cut`, `rim_flange`, `seal_seams` and the `T.oral_shells` palate/floor pair. What *did* change is that the twin no longer carries the authored albedo the lining wears (1,313,156 → 708,252 B) and the pectoral chains are measured off the fins. | `cut_rim`: the **twin** one closed loop of 148 vertices (103 on the seam) spanning 0.1825 of a body on a mouth 0.18 long — the whole aperture, case 1, because a voxel remesh of an occupancy field is a closed solid whatever the generation was. The **authored body** 282 boundary edges in fragments, largest 165 vertices spanning 0.0824 and straddling the hinge with 65 on the seam; nothing open over 0.15 of the mouth's 0.18 run, because the generation's own slit was already there. `cap_mouth` refuses by construction: 32 of 141 rim vertices without a second rim edge, one with four. The hidden lining is worth 87 px through and 360 opened (2/162 drawn against 89/523 as drawn); the 162 that remain with it are slivers along the generation's own tooth row. |

**What Saurichthys adds to the three kinds.** A paired delivery can be two kinds at once, and it is
worth saying so because neither of T3D-31's constructions survives it: the authored body wants
`jaw_field_uncut` and the twin cannot have it, because the twin's surface is closed and its cut is
the only thing that makes an aperture at all. The routes out are a mouth-closed regeneration, or
`jaw_field_uncut` on the authored body with the cut kept on the twin — which has to answer what the
bind pose is on a body whose closing rotation is currently baked into a labelled mandible shell.

## Greenlit — the game draws these mouths (22 September 2026)

A human reviewed four bodies in the viewer and greenlit the mouth geometry they were already built
with, keeping their shape as it stands. They are listed in `src/shared/oral-greenlit.json`, which is
the one source the runtime, `hidden-parts.mjs`, `gape-solid.py` and `mouth-space.py` all read; the
rest of the roster is still hidden and still shows the mouth its generation arrived with.

`gape-solid.py --as-drawn` at the widest opening clips, before (the lining hidden, which is what the
roster sweep measured) and after (the lining drawn, which is what a player now sees). `through` is
opened backdrop the silhouette encloses; `opened` is every pixel whose only surface is a back face,
and on a mouth held wide from the side it is the larger and the more honest of the two.

| body | clips | `opened` before | `opened` after | `through` after |
|---|---|---:|---:|---:|
| Mystriosuchus | Heavy@0.5, Ability@0.4, Bite@0.1 | 7,716 / 7,734 / 7,577 | **0 / 0 / 0** | 0 |
| Keichousaurus | Bite@0.2, Heavy@0.133, Eat@0.967 | 4,375 / 4,353 / 4,267 | **34 / 35 / 35** | 0 |
| Mixosaurus | Heavy@0.367, Bite@0.067, Attack@0.267 | 3,697 / 3,337 / 2,861 | **44 / 40 / 37** | 0 |
| Hupehsuchus | Ability@0.667, Gulp@0.467, Heavy@0.467 | 4,784 / 4,444 / 4,215 | **175 / 149 / 98** | 0 |

All four pass the tool's own bar (0 px through the body against a tolerance of 12) and every one
improved by one to two orders of magnitude, which is the evidence the greenlight was right rather
than a preference: what those thousands of pixels were, was an open mouth with nothing closing it.
Mystriosuchus closes completely. Hupehsuchus keeps the largest residue, still 96 % down.

Counted across the roster, hiding drops from 75 oral meshes to 51 with 24 now drawn — 75 − 51 = 24,
so the change moved exactly these four bodies' parts and nothing else (`hidden-parts.mjs --check`).

## T3D-34: the seam web — a fill for a generation that arrived *partially* open

*Superseded on both bodies by T3D-37 below, which takes the cut out instead; the helpers are gone
from `_pipeline/tripo.py` (in git at `8161d0c`). Kept as the record of what was shipped and why.*

Two bodies were reported as showing "holes in the geometry near the back of the mouth ... for
creatures that have a mouth rendered already partially open". They are `cut_rim`'s **case 2** and
neither of T3D-31's two constructions fits them, which is why this is a third one.

**What is open, measured.** On both animals the cut runs *deeper than the generation's own mouth
does*. Cymbospondylus' mouth is 0.1375 of a body long and its cut left a rim over only the back
**0.042**; Shonisaurus' reaches 0.196 and its rim runs over the back **0.078**. Forward of the
commissure the two jaws are already separate sheets and the seam passes between them without
touching either — so there is nothing to fill at the front, and `cap_mouth` over the whole boundary
would seal the modelled mouth shut. Behind it the cut drew a rim through solid head, and
`T.jaw_junction` holds the two copies of that rim together **only at the hinge cross-section**
(55 of 125 pairs on Cymbospondylus, 40 of 164 on Shonisaurus, where it asserts their weights equal).
Everywhere else they part by design, which is the mouth opening — and on these two it is the mouth
opening *plus* a hole into the head along the run the cut made.

**The construction, and why it closes by construction.** `T.seam_web` is the **ruled surface between
the two copies of the rim** (`T.seam_rim` finds them as ordered cycles and refuses anything that is
not a set of closed curves). Three rows per rim point — the skull side, the jaw side, and a middle
row folded into the flesh so the mesh is not degenerate at a shut mouth. Every boundary vertex is a
rim vertex's **own rest position and own weight dictionary**, and linear blend skinning is a function
of those two alone, so the web's boundary curves *are* the two halves' rims in every pose: worst
rest-position difference **0.0**, worst weight difference **0.0** on all three bodies
(`T.seam_web_parity` asserts it). Every boundary edge of the web is therefore a boundary edge of a
half, and the union has no open edge along the cut, at rest and at full gape alike — by algebra
rather than by a render, which is the bar `cap_mouth` set and the one Cartorhynchus' 51 px failed.

It also answers *fill only where the cut went through* **by construction rather than by a bound**:
the web's extent is the rim's extent, and a rim exists only where the cut passed through surface.

**The albedo is the lumen's, not the cheek's.** `cap_mouth` inverse-distance weights off the rim,
which is right where the whole rim is a cut. Here it is not: more than half of Cymbospondylus' rim is
outer cheek. So `T.cavity_pigment` samples only the set `T.cavity_vertices` measured — every vertex
whose own outward normal, cast back into the mesh, meets the wall opposite, which is what makes it
interior (nothing on the outside of an animal has the animal in front of it). 280 such vertices on
Cymbospondylus, mean colour **(0.193, 0.102, 0.071)** against **(0.218, 0.212, 0.170)** for the rest
of the body; 1,215 on Shonisaurus, **(0.390, 0.381, 0.369)** against **(0.450, 0.455, 0.461)**.

**The fold is smoothed along the rim, and that was not a nicety.** Its depth follows the parting and
its direction the rim's own normal, both of which jump between neighbours — so a fold taken per
vertex came out corrugated, and a corrugated ribbon at the back of a mouth reads as a grille rather
than as tissue. Four passes of a [1 2 1] filter round each cycle took it out and took
Cymbospondylus' shown `opened` from 431 to **155** at `Heavy`. The rim itself is never moved, so the
smoothing cannot open the seam.

**It is off.** Both webs are named so `src/shared/oral-geometry.ts` matches them, so the game hides
them and the viewer's *Mouth geometry* switch starts with them hidden. Nothing here is turned on.

### What the switch now shows, per body

| | Cymbospondylus | Shonisaurus |
| --- | --- | --- |
| rim the cut drew twice | 125 shared vertices, 125 shared edges, 0 without two; cycles 112 + 13 (twin 101 + 9) | 164 shared vertices, 164 shared edges, 0 without two; one cycle |
| of those, held by the junction | 55 | 40 |
| web | 250 faces / 375 vertices (twin 220 / 330) | 328 faces / 492 vertices, authored body only |
| parity (rest position, weights) | 0.0, 0.0 | 0.0, 0.0 |
| fold, deepest / mean (of 6.0 units) | 0.0441 / 0.0147 | 0.0207 / 0.0089 |
| retired with it | `Oral cavity lining` **and** `Seated jaw hinge tissue` | — (it carried none) |
| skin (`skin-tears.mjs`) | 2.48x, unchanged | 1.44x, unchanged |
| worst including oral geometry | 9.98x → **2.79x** | 1.44x, unchanged |
| `lag.mjs` cut | 0 open past 0.2 % | 0 open past 0.2 % |
| twin triangle fraction | 38.76 % → 36.79 % | unchanged |

Shonisaurus' twin gets no web, and that is a fact about the twin rather than an omission: its
rostrum is two separate closed lofts, so it has no cut and nothing open. `package-audit.mjs` asserts
exactly that.

### The gape, as drawn, hidden and shown

`gape-solid.py --as-drawn` at the measured peak of every clip that opens the jaw, on the shipped
files. **The shipped (hidden) column cannot have moved**: the visible geometry of both bodies is
byte-identical to `main`'s — every attribute digest equal, and the six eye meshes' index buffers
differ only in meshopt's ordering, with identical triangle sets. `--show "seam web"` is the same run
with the web drawn, which is what the viewer's switch shows.

**Read `opened`.** `through` is opened backdrop the *silhouette encloses*, and the web closes the
route to the frame edge, so on a clip whose hole previously reached the edge `through` rises while
the hole itself shrinks — an enclosure artefact of the metric, not a regression. The honest figure
for "what did the fill cover" is the last column: backdrop in the hidden culled pass that is skin in
the shown one.

| Cymbospondylus | hidden `through`/`opened` | shown `through`/`opened` | backdrop the web covers |
| --- | ---: | ---: | ---: |
| `Heavy@0.6` | 1 / 744 | 155 / **155** | **3,114** |
| `Lunge@0.7333` | 3 / 719 | 143 / **143** | 2,954 |
| `Eat@0.4333` | 0 / 750 | 146 / **146** | 2,626 |
| `Bite@0.1667` | 0 / 647 | 116 / **116** | 2,224 |
| `Ability@0.3667` | 113 / 308 | **68** / **68** | 944 |
| `Attack@0.4667` | 106 / 286 | **61** / **61** | 884 |
| `Hit@0.3` | 113 / 301 | **64** / **64** | 879 |
| `Stagger@0.6` | 122 / 319 | **76** / **76** | 889 |
| `Death@2.0` | 99 / 244 | **55** / **55** | 704 |
| `Breathe@1.6` | 19 / 19 | 16 / 16 | 8 |
| `Breath@1.3` | 0 / 0 | 0 / 0 | 0 |

| Shonisaurus | hidden `through`/`opened` | shown `through`/`opened` | backdrop the web covers |
| --- | ---: | ---: | ---: |
| `Heavy@0.3333` | 6 / 1,863 | 1,671 / 1,671 | **4,747** |
| `Attack@0.2333` | 5 / 1,478 | 1,305 / 1,305 | 3,821 |
| `Bite@0.1667` | 306 / 381 | **248** / **248** | 884 |
| `Eat@0.6` | 9 / 13 | **2** / **5** | 13 |

The web opens nothing of its own: 0–3 px on Cymbospondylus and 0–10 on Shonisaurus go the other way,
all of it antialiasing along its own edge.

**What is left on Shonisaurus is not the cut.** The 1,671 px at `Heavy` are the generation's own
modelled lumen seen from outside with every back face culled — the inside of the upper jaw's pocket,
which is a back face from any camera outside the mouth, on a body whose skin exports `doubleSided`.
Filling that would mean filling the modelled mouth, which is exactly what this construction must not
do. Its `Bite` figure is the sliver along the tooth row at the commissure this table has described
since T3D-14, and the web took it from 306 to 248 without being aimed at it.

Sheets: `docs/triassic/verification/<id>-mouth-space.png` (the shipped state) and
`-mouth-space-seam-web.png` (with the switch on).

### Does this overturn "neither"?

**No, and one thing in the record was wrong.** The verdicts above are about a *lining* — a palate, a
floor, a sac — and neither body gets one. Shonisaurus' "neither" stands exactly as written: it
carries no lining, and the pixels its table describes are the generation's own gape and the slivers
at the tooth row. What the seam web is, is the optional geometry a reviewer asked to *look* at, and
it is off until they have.

The wrong thing was in a brief rather than in this file: Cymbospondylus was believed to carry no
lining. It carried the **one-sac `Oral cavity lining`** — the form CLAUDE.md names as the one that
reads as a mouthful of gum — and a `Seated jaw hinge tissue` ellipsoid. Both are now retired, and
both were measured before they went: as drawn, which is how they are drawn, that head reads 1 px
through at its widest gape with the plug already invisible, so it closed nothing a player could see;
and with the switch on it was a black blister standing proud of the cheek beside the mouth it was not
filling. Cymbospondylus' *Mouth geometry* switch now shows the seam web and nothing else.

### The aimed cut, measured rather than adopted

`docs/triassic/mouths/cymbospondylus-mouth.json` is that body's first human-aimed cut
(`mouth-cut/1`, 22 September). It was **not** adopted, and the reason is a measurement rather than a
preference (`docs/triassic/verification/cymbospondylus-aimed-cut-vs-measured.json`, both cuts carried
into the builder's own raw frame):

- the aimed **hinge** sits **0.047 of a body behind** the builder's, which is a rig change and not a
  cut change — the `jaw` bone, every clip drawn on it, the anchors and the junction all move with it;
- the aimed **plane** runs 0.0028–0.0044 of a body *below* the line the builder measures off the
  generation's own cavity, station by station. For scale, this builder records that a *straight* cut
  would have deviated from its measured curve by **0.0007** — so the disagreement is a height, six
  times the whole curve-versus-straight difference, and not a shape.

`npm run triassic:mouth` now refuses the file anyway ("the body has changed since the cut was aimed
... aim the cut again"), which is the right answer: a cut aimed at a body with a one-sac lining in it
should be re-aimed at the body that ships. The comparison is on the record so that whoever re-aims it
is arguing with numbers.


## T3D-37: Shonisaurus and Cymbospondylus go uncut — the jaws are separated by topology, not height

The owner's request: *"for Shonisaurus and Cymbospondylus can we move their interior mouth geometry
as a normal skinned deformation instead of cutting it or putting in 'mouth geometry' — I think a
basic deformation as a skinned bone movement for the jaw should probably work best, since the mouth
interior is modelled."*

That is CLAUDE.md's case-3 construction (`T.jaw_field_uncut`, Mosasaurus the worked example). It
supersedes T3D-34's seam web on exactly these two bodies. Both now carry **no oral geometry of any
kind** — no web, no lining, no plug — and one continuous skin; `oral-shell-audit.mjs` reports each
of authored, twin and LOD1 clean with no hidden oral parts, all three agreeing.

### What the cut was buying

`T.cut_rim` on the bodies this replaces (Cymbospondylus: its own builder's record in `validation.json`
at `cea726e`; Shonisaurus: the shipped web's boundary, which is the rim by construction, measured off
the packaged GLB):

| | mouth | cut rim | reach | on the seam |
|---|---:|---:|---:|---:|
| Cymbospondylus, authored | 0.1375 | 112-vertex loop (+13) | **0.042** (y −0.3525 to −0.3106) | 59 (+11) |
| Cymbospondylus, twin | 0.1375 | 101-vertex loop | **0.139** — the whole mouth | 64 |
| Shonisaurus, authored | 0.196 | 164-vertex loop | **0.078** (0.100–0.178 of a body from the snout) | — |

Case 2 on both authored bodies, as T3D-34 said: the cut runs through surface over the back third
and passes between two separate sheets at the front. The twin is not: Cymbospondylus' twin is a
voxel resurfacing whose occupancy field bridges the slit (`T.mouth_cavity` finds 0 lumen vertices
on it at 0.030 and 0.060 where the authored body finds 280), so its cut made the *whole* aperture.

### Why Mosasaurus' band does not work here, located rather than guessed

The first uncut build used Mosasaurus' height band and tore: 8.88x at a band of 0.30 of the local
half depth, 5.22x at 0.90 of the half depth at the hinge. `skin-tears.mjs`' worst edges at `Heavy`
were **not at the corner of the mouth**. They ran the whole length of the lower lip, from the hinge
to the snout, between vertices on jaw shares of 0.5-0.9 and 1.0.

Measured on the intake (a one-off dump of the authored Cymbospondylus' head from its builder, raw units):

- **forward of y −0.355 no edge of the mesh crosses the mouth line at all** — 85 crossing edges, every
  one of them between y −0.355 and the hinge and behind it. The jaws are separate sheets there;
- but the **lips come within 0.0006-0.004 raw of the mouth line** along that open run, against a
  head 0.018-0.022 half deep and a modelled lumen 0.007 half deep.

Shonisaurus is the same shape with a longer corner: `jaw_field_uncut` reports the step crossed by an
edge up to 0.064 raw ahead of its hinge (raw y 0.39) on a mouth that runs to 0.498, so its lips are
joined skin over the back third and two sheets over the front two.

So a height band cannot be both wide enough to spare the corner and narrow enough to miss the lip.
Every band wider than the lip's clearance gives the lower lip a partial share and tears the jaw's own
skin; the bands wide enough to spread that tear out take the tooth row off its bone instead. And
`lag.mjs`' *jaw follows its bone* cannot see the second half: it is taken over the ball round the
hinge, and reads 1.00 at a band where the front fifth of the mandible travels 45 % of what the jaw
bone would carry it. The tooth row is measured separately below (`tools/triassic/mandible-travel.mjs`:
skin travel between rest and the clip's widest gape over a rigid carry by the `jaw` bone, over every
jaw-weighted vertex in the front fifth of the jaw's reach).

### The construction: a step on the mouth line, diffused over the edge graph

`T.jaw_field_uncut` gains `spread`. The jaw share is made a **step** on the sign of the builder's
`below` (a band of 0.01 of the head's half depth, ~0.0002-0.0005 raw) and that scalar is then diffused
`spread` passes over the mesh's own edge graph, coupled by 1/length like `relax_weights`. A sheet no
edge connects across the line is uniform, and diffusion cannot move a uniform field: **the lower jaw
stays at exactly 1 and the palate at exactly 0**, and the step only softens where edges cross — the
corner of the mouth and the back of the lumen, which is where CLAUDE.md says the stretch belongs.
The band is then a distance along the skin from the commissure, not a height. `spread=0` (the
default) is the old code path exactly, so Mosasaurus is untouched.

### The sweeps

Skin is `skin-tears.mjs` ranked on skin (oral surfaces separately — there are none now), *mouth* its
mouth-region `jaw` / `skull` figures, *follows* `lag.mjs` at `Bite`/`Attack`/`Heavy`/`Eat`, *tooth
row* the front fifth's travel over a rigid carry at `Bite`. Every row is a full rebuild and repackage.

**Cymbospondylus** (was 2.48x — its right forelimb in `Death` — with the mouth reading 1.15x):

| construction | skin | mouth jaw / skull | follows | tooth row |
|---|---:|---:|---|---:|
| height 0.20 × half depth at the hinge | 9.85x | 9.85x / 9.29x | 0.98 1.00 1.00 0.96 | 0.980 |
| height 0.38 | 9.58x | 9.58x / 8.36x | 1.00 1.00 1.00 0.99 | 0.825 |
| height 0.50 | 7.43x | 7.43x / 6.84x | 1.00 1.00 1.00 0.99 | 0.713 |
| height 0.90 | 5.22x | 4.86x / 5.22x | 1.00 1.00 1.00 0.97 | 0.446 |
| height 0.30 × *local* half depth | 8.88x | 8.47x / 8.88x | 0.98 1.00 1.00 0.95 | 0.965 |
| step, spread 0 | 7.92x | 5.25x / 7.92x | 1.00 1.00 1.00 1.00 | 1.000 |
| step, spread 1 | 2.74x | 2.74x / 2.55x | 0.99 1.00 1.00 0.98 | 1.000 |
| **step, spread 2** | **2.48x** | **1.61x / 1.58x** | **0.99 1.00 1.00 0.96** | **1.000** |
| step, spread 3 | 2.48x | 1.31x / 1.46x | 0.99 1.00 1.00 0.95 | 1.000 |
| step, spread 6 | 2.48x | 1.22x / 1.30x | 0.97 1.00 1.00 0.92 | 1.000 |
| step, spread 12 | 2.48x | 1.16x / 1.19x | 0.96 1.00 1.00 0.88 | 1.000 |
| step, spread 24 | 2.48x | 1.14x / 1.15x | 0.96 1.00 1.00 0.88 | 1.000 |
| step, spread 48 | 2.48x | 1.12x / 1.15x | 0.97 1.00 1.00 0.86 | 1.000 |

The height rows reproduce the previous attempt's figures exactly (it preferred the local-section
band at 0.30: 8.88x, tooth row 0.965). **Spread 2 ships**: it is the widest spread whose follow stays
inside Mosasaurus' 0.96-1.00, the whole lower jaw takes the whole of its bone's rotation, and the
body's worst edge is no longer in the mouth — 2.48x is the right forelimb in `Death`, the figure it
shipped with.

**Shonisaurus** (was 1.44x, mouth 1.00x; a band here also closes the baked-open generation in bind
geometry through `close_rest`, so *shut* is `mouth-closure-audit.py` and *inverted* is
`lip-audit.py`'s neighbour test, rest / worst posed):

| construction | skin | follows | tooth row | shut | inverted |
|---|---:|---|---:|---|---:|
| height 0.06 × half depth at the hinge | 1.81x | 0.98 0.99 0.99 0.95 | 1.000 | yes | 29 / 29 |
| height 0.10 | 1.80x | 0.96 0.99 0.99 0.93 | 1.000 | yes | 14 / 18 |
| height 0.15 | 1.44x | 0.96 0.98 0.99 0.91 | 0.999 | yes | 31 / 31 |
| height 0.20 | 3.80x | 0.96 0.98 0.99 0.91 | 0.980 | yes | 49 / 49 |
| height 0.24 | 3.64x | 0.96 0.99 0.99 0.92 | 0.930 | yes | 40 / 40 |
| height 0.75 | 1.44x | 0.94 0.98 0.99 0.87 | 0.199 | **no** — 3,596 of 14,400 rays through | 11 / 11 |
| height 0.30 × local half depth | 1.44x | 0.96 0.98 0.99 0.92 | 1.000 | yes | 24 / 27 |
| step, spread 0 | 1.47x | 0.99 1.00 1.00 0.97 | 1.000 | yes | 77 / 78 |
| step, spread 1 | 1.44x | 0.98 0.99 1.00 0.96 | 1.000 | yes | 48 / 48 |
| step, spread 2 | 1.44x | 0.98 0.99 0.99 0.96 | 1.000 | yes | 43 / 43 |
| step, spread 3 | 1.44x | 0.98 0.99 0.99 0.95 | 1.000 | yes | 38 / 38 |
| step, spread 6 | 1.44x | 0.97 0.99 0.99 0.94 | 1.000 | yes | 40 / 40 |
| step, spread 12 | 1.44x | 0.96 0.99 0.99 0.93 | 1.000 | yes | 34 / 34 |
| step, spread 16 | 1.44x | 0.96 0.98 0.99 0.92 | 1.000 | yes | 30 / 30 |
| **step, spread 24** | **1.44x** | **0.95 0.98 0.99 0.90** | **1.000** | **yes** | **28 / 28** |
| *closing:* height 0.10, *skinning:* spread 2 | 7.94x | 0.98 0.99 0.99 0.95 | 1.000 | yes | 14 / 32 |
| *closing:* spread 12, *skinning:* spread 2 | 6.94x | 0.98 0.99 0.99 0.95 | 1.000 | yes | 34 / 34 |
| *closing:* spread 24, *skinning:* spread 2 | 8.11x | 0.98 0.99 0.99 0.95 | 1.000 | yes | 28 / 28 |

**On the numbers Cymbospondylus' rule would pick 2, and the bind pose overrules it.** This body is
shut in bind geometry by the same share (`close_rest`), and a narrow spread shuts the corner of the
mouth over two rings of skin: the skin that spanned the generation's open corner has nowhere to go
and folds out over the upper lip, a **pale flap beside the eye in `Idle`** — the pose the animal
spends its life in, and one the split body never had. The previous attempt's height band 0.10 did
not show it, and neither did `cea726e` (both rendered at the same shot for comparison). It shrinks as
the spread widens — clearly there at 2 and 6, a trace at 12 and 16 — and is gone at 24, which is what
ships: skin still exactly the 1.44x this animal shipped with (the mouth region 1.16x at `Heavy`), the
tooth row taking all of the jaw's rotation, the mouth shut, and what is left at rest is the lip line
running dark into the corner. The three *closing/skinning* rows are the obvious alternative — shut
the bind pose through a wider or a height field and skin through the narrow one — and are worse in
the other direction: a corner closed through one share and skinned through another is compressed at
rest and torn open again at the gape, 6.9x-8.1x on the corner edge. So one field does both.

What 24 costs is `lag.mjs`' follow at the hinge, **0.95 at `Bite` and 0.90 at `Eat`** against the
split body's 0.98 and 0.95: the corner's own skin blends over a wider run, while the front of the
mandible still travels all of its bone. The neighbour count falls with it, to **28** at every frame,
against **8** on the split body this replaces (re-measured by rebuilding `cea726e` in a scratch
worktree, whose rebuild is byte-identical to what shipped) and **11** on the uncut body with nothing
closed (the height-0.75 row). 28 is 0.025 % of the mouth's 113,904 triangles, under `lip-audit.py`'s
0.05 % bar, and none of it shows in `gape-solid.py`. The flap was judged by eye, on
`review.py --mouth-only`'s `Idle` shot of the corner at every spread named above.

### The twin keeps a height band, and pays for it in stretch

Cymbospondylus' twin has no lumen, so it has no topology to separate its jaws by: an edge crosses the
mouth line along the whole mouth, and a step there would be a crease. It carries the height band
instead, and its own `skin-tears.mjs` figure at `Heavy` is the price of a closed head whose lower half
swings:

| twin band | twin skin | twin tooth row at `Bite` |
|---|---:|---:|
| **0.30 × local half depth** | **12.63x** | **0.86** |
| 1.00 × local half depth | 7.65x | 0.61 |
| 0.90 × half depth at the hinge | 5.82x | 0.50 |
| 1.50 × half depth at the hinge | 3.52x | 0.34 |
| the cut twin this replaces (seam web hidden in play) | 2.47x | 0.89 |

0.30 local ships, so the LOD opens its jaw with the authored body and the gape does not change when the
renderer swaps models; the stretch is a pale membrane between the jaws, which is what a
6,600-triangle closed head can honestly offer and is judged by eye in
`docs/triassic/verification/cymbospondylus-twin-mouth-space.png`. The cut twin's 2.47x was not free
either: its web is hidden in play, so as drawn it opened a hole into its own head. Shonisaurus' twin
needs nothing: its rostrum is two separate closed lofts with the gap between them, unchanged.

### The gape, before and after, over every clip that moves the jaw

`gape-solid.py` at each clip's own widest jaw rotation, `opened / through` (and pixels differing
between the culled and solid passes). *Before* is the shipped `cea726e` bodies, decoded in a scratch
worktree; *after* is this delivery. The backdrop test is `r > .90, g < .20, b > .90`.

| Cymbospondylus | before, plain | before, as drawn | after, plain | after, as drawn |
|---|---:|---:|---:|---:|
| `Heavy@0.6` | 155 / 155 (2,044) | 744 / 1 (2,396) | **0 / 0** (0) | **0 / 0** (0) |
| `Lunge@0.7333` | 143 / 143 (2,050) | 719 / 3 (2,267) | **0 / 0** (0) | **0 / 0** (0) |
| `Bite@0.1667` | 116 / 116 (2,080) | 647 / 0 (2,089) | **0 / 0** (0) | **0 / 0** (0) |
| `Ability@0.3667` | 68 / 68 (1,614) | 308 / 113 (1,694) | **0 / 0** (1) | **0 / 0** (1) |
| `Attack@0.4667` | 61 / 61 (1,540) | 286 / 106 (1,530) | **0 / 0** (2) | **0 / 0** (2) |
| `Eat@0.4333` | 146 / 146 (2,036) | 750 / 0 (2,187) | **0 / 0** (0) | **0 / 0** (0) |
| `Hit@0.3` | 64 / 64 (1,593) | 301 / 113 (1,550) | **0 / 0** (3) | **0 / 0** (3) |
| `Stagger@0.6` | 76 / 76 (1,663) | 319 / 122 (1,568) | **0 / 0** (6) | **0 / 0** (6) |
| `Death@2` | 55 / 55 (991) | 244 / 99 (1,217) | **0 / 0** (2) | **0 / 0** (2) |
| `Grab@0.1` | 34 / 34 (1,069) | 63 / 49 (946) | **0 / 0** (5) | **0 / 0** (5) |
| `Breath@1.3` | 0 / 0 (321) | 0 / 0 (215) | **0 / 0** (7) | **0 / 0** (7) |
| `Breathe@1.6` | 16 / 16 (729) | 19 / 19 (627) | **0 / 0** (4) | **0 / 0** (4) |
| `Guard@0.6` | 9 / 9 (519) | 9 / 9 (391) | **0 / 0** (11) | **0 / 0** (11) |
| `Idle@1.5` | 0 / 0 (377) | 0 / 0 (256) | **0 / 0** (11) | **0 / 0** (11) |
| `Sprint@0.7` | 0 / 0 (375) | 0 / 0 (280) | **0 / 0** (7) | **0 / 0** (7) |
| `Swim@1.1` | 3 / 3 (370) | 3 / 3 (253) | **0 / 0** (12) | **0 / 0** (12) |

| Shonisaurus | before, plain | before, as drawn | after, plain | after, as drawn |
|---|---:|---:|---:|---:|
| `Heavy@0.3333` | 1,671 / 1,671 (6,358) | 1,863 / 6 (3,035) | **0 / 0** (0) | **0 / 0** (0) |
| `Attack@0.2333` | 1,305 / 1,305 (5,224) | 1,478 / 5 (2,579) | **0 / 0** (2) | **0 / 0** (2) |
| `Bite@0.1667` | 248 / 248 (1,618) | 381 / 306 (1,163) | **0 / 0** (0) | **0 / 0** (0) |
| `Eat@0.6` | 5 / 2 (287) | 13 / 9 (292) | **0 / 0** (0) | **0 / 0** (0) |

**Plain and as drawn now agree count for count on every shot**, which is what they must do on a body
the runtime hides nothing on. The residual *differing* pixels after (up to 12, on clips that barely
move the jaw) are never backdrop in either pass — no pixel is opened — and are the two passes'
sampling rather than a surface. The as-drawn *before* column reproduces the previous attempt's
figures exactly (744/719/750/647/308/286/301/319/244/19 and 1,863/1,478/381/13), and adds `Grab`
(63), which it had not shot.

### What else moved

| | Cymbospondylus | Shonisaurus |
|---|---|---|
| skin (`skin-tears.mjs`, ranked on skin) | 2.48x → **2.48x** (same forelimb in `Death`) | 1.44x → **1.44x** |
| mouth-region skin, `jaw` / `skull` | 1.15x / 1.15x → 1.61x / 1.58x | 1.00x / 1.00x → 1.16x / 1.00x |
| jaw follows its bone, `Bite`/`Attack`/`Heavy`/`Eat` | 1.00 1.00 1.00 1.00 → 0.99 1.00 1.00 0.96 | 0.98 0.99 0.99 0.95 → 0.95 0.98 0.99 0.90 |
| tooth row at `Bite` (front fifth over a rigid carry) | 1.000 → 1.000 | 1.000 → 1.000 |
| `lag.mjs` seam | 146 rest-coincident pairs → **none: nothing is cut** | 67 → **none** |
| twin skin | 2.47x (web hidden in play) → 12.63x (see above) | unchanged |
| bind-pose skin moved | 0 (every vertex within 3e-8 of a body of the shipped one; only the bisect's extra vertices are gone) | at the corner, where `close_rest` now shuts it through a blended share (the sweep above) |
| faces opposing their neighbours (`lip-audit.py`), bind / worst | — | 8 / 8 → 28 / 28 |
| oral meshes | web on authored + twin → **none** | web → **none** |

The mouth-region figures went *up* and that is the point: under a cut no edge crossed the commissure,
so the 1.15x and 1.00x were measurements of nothing. Uncut the commissure is skin and is measured.

### Judged by eye, not measured

`docs/triassic/verification/{cymbospondylus,shonisaurus}-mouth-space.png` (at `Heavy`'s peak) and
`cymbospondylus-twin-mouth-space.png`. Both authored mouths read as mouths — a pink modelled palate
and floor with the tooth rows along them on Cymbospondylus, a dark cavity between the rostra on
Shonisaurus — with no seam, plug or membrane in either. The twin reads as a closed head whose lower
half has swung down under a stretched pale membrane: an honest LOD stand-in, not a mouth.
