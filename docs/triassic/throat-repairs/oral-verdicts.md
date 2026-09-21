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

| Body | worst `through` | worst `opened` | note |
| --- | ---: | ---: | --- |
| **Nothosaurus** | **0** | **0** | ported in T3D-31: capped with its own rim |
| **Rhaeticosaurus** | **0** | **0** | ported in T3D-31: capped with its own rim |
| **Mosasaurus** | **0** | **0** | ported in T3D-31: not cut at all |
| Helicoprion | 0 | 0 | already clean; no legacy lining |
| Askeptosaurus | 1 | 193 | |
| Odontochelys | 6 | 236 | |
| Placodus | 23 | 454 | |
| Saurichthys | 123 | 523 | |
| Cartorhynchus | 2 | 693 | |
| Cymbospondylus | 4 | 933 | |
| Archelon | 1 | 1,262 | |
| Macrocnemus | 343 | 2,594 | |
| **Hybodus** | **0** | **0** | ported in T3D-32A: not cut at all (was 1,346 / 2,833) |
| Mixosaurus | 0 | 3,697 | |
| **Atopodentatus** | **0** | **0** | ported in T3D-32A: capped with its own rim (was 3,738 / 4,494) |
| Keichousaurus | 2 | 4,375 | |
| Hupehsuchus | 38 | 4,784 | |
| Coelophysis | 3 | 7,276 | |
| Mystriosuchus | 1 | 7,734 | |
| Aphaneramma | 5 | 10,730 | |
| Henodus | 407 | 462 | |
| Dinocephalosaurus | **120** | 197 | its verdict was **neither**, and it is still right about the lining — but the `Seated jaw hinge tissue` that closes its hinge cross-section is hidden in play, so as drawn the head is open there |
| Ceratites, Phragmoteuthis | — | — | no jaw and no mouth drawn; settled in T3D-02a and T3D-12B and unaffected by any of this |
| Birgeria | — | — | **not measured**: its `audit.mjs --decode` fails on an unrelated pre-existing assertion (`no root motion`) without `--package`, so the sweep could not decode it. It does have a jaw and opening clips, so it belongs in the rollout. |
| Shonisaurus | 13 | 1,943 | its verdict is **neither** and stays; the pixels are the generation's own open gape and the slivers at the tooth row this table already describes |
| Tanystropheus | 142 | 1,388 | |

The Dinocephalosaurus row is the one that changes a verdict rather than confirming it. T3D-12B
measured it three ways and concluded correctly that the **sac** closed nothing the hinge plug was
not already closing; what nobody asked was whether the hinge plug is drawn. It is not. So the
verdict "neither" is right about a *lining* and wrong about the mouth: what that head needs is its
hinge cross-section capped with its own vertices, which is `T.cap_cut`, and no lining at all.

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
