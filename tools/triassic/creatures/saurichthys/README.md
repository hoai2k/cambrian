# Saurichthys — the straightest body in the set, and the one the thickness rule cannot read

> **Current repair, 21 September 2026 (T3D-32C).** Three things, two done and one measured and
> recorded.
>
> **The pectoral chains are measured off the fins (T3D-21).** They used to be typed as fractions of
> the body — a mirrored pair of chains on a generation whose two blades are not mirrored — and
> `pec_tip_R` stood 3.58 % of a body from the nearest skin vertex against the left's 1.67 %, with the
> right chain dominating 126 vertices to the left's 247. Each blade is now found as the largest
> connected blade-thin patch under the flank, flooded over the mesh's own edges (405 vertices left,
> 390 right), stationed in eight bands of geodesic distance from its tip, and the two stationed
> centrelines are checked against each other's mirror (worst 0.0267 raw, 2.5 % of a body — the
> generation's own asymmetry) and averaged; the root is the base station pulled 0.0128 into the trunk
> by ray parity against the closed skin. Which joint owns a point is arc along that fin's own
> centreline rather than distance out across the body, and the window each blade's bid reads is that
> blade's own measured extent. **After: owned area 0.004719 / 0.004344, 8.0 % apart; dominated
> vertices 169 / 140, 17.2 % apart; each chain dominates 0.417 / 0.359 of its own blade, 14.0 % apart; joint to
> nearest skin 1.03 / 1.42 % of a body at the root, 0.57 / 0.62 % at the mid and 0.22 / 0.38 % at the
> tip, a worst left-right gap of 0.39 % of a body against the 1.9 % this body shipped with.** Skin
> **3.61x → 3.32x**, and the worst bone is no longer `pec_tip_R`.
>
> **The twin was carrying the authored body's textures.** There was one `Mouth lining` object and it
> was exported with *both* bodies, so the vertex-coloured twin carried this lining's authored
> material — a 2048-square albedo and its normal map, **604,389 bytes of JPEG** — for a surface of a
> few hundred vertices. The twin now has its own copy on the twin's own vertex-colour material:
> `saurichthys.puppet.glb` **1,313,156 → 708,252 bytes**, and `lod1` with it, at identical triangle
> and vertex counts.
>
> **The mouth is measured and recorded, not re-cut.** See *The cut is earning its place — measured*
> below.


**Status: built, measured and rendered; not shipped.** `saurichthys` is deliberately *not* in
`tools/triassic/shipped.json` and its preview badge in
`src/content/triassic/pending-refinements.json` is untouched, so nothing in the game has changed.
The animal still borrows its Devonian stand-in in play. This directory is the candidate and the
evidence for it; a human decides whether it ships.

The delivered pair keeps the generation's needle body, its long rostrum with jaws of equal length,
its opposed dorsal and anal fins set far back and its near-symmetric caudal, on one 24-joint
skeleton with the same three sockets and **23 byte-for-byte identical decoded animation
performances**. The twin is also the runtime LOD.

| Delivery | Triangles | Vertices | Packaged bytes |
| --- | ---: | ---: | ---: |
| `saurichthys.glb` — worked Tripo body | 22,078 | 13,491 | 1,796,060 |
| `saurichthys.puppet.glb` — procedural twin | 8,443 | 4,288 | 1,311,040 |
| `saurichthys.lod1.glb` — byte-identical twin alias | 8,443 | 4,288 | 1,311,040 |

The reduced model is **38.2 %** of the authored triangles, inside the contract's 40 %. The model is
5.000 engine authoring units long, faces +Z in glTF and uses +Y up; the research registry gives the
animal 1 m.

---

## Which end is the head

Every other body in this batch is oriented by a rule that fails here. A tail tapers to a blade and
a head does not — so the head is the end whose first fifth carries the thicker shell — and on this
animal the two ends measure **0.0171 against 0.0143**, a margin of nothing, because the rostrum is
as thin as the caudal fin. The builder **asserts that the margin is inadequate** rather than
trusting it, so nobody later reads the fallback as a redundant belt and braces.

The mouth decides instead. Casting every vertex's own outward normal back into the mesh finds 927
that look across a slit at the surface opposite; **689 of them lie in the front sixth of one end and
0 in the front sixth of the other**. That is not a close call, and it is a measurement of the one
thing that distinguishes a head.

## Intake: mostly levelling, hardly any unbending

The proportion audit measured this animal's bent path at 1.006 of its straight axis — the straightest
body in the Triassic set — so the rigid section carry is very nearly the identity and most of what
intake does is *level* the animal.

| | |
| --- | ---: |
| centreline arc | 1.1511 |
| total turning | 94.6° |
| median section radius | 0.0312 |
| mean curvature radius ÷ section radius | **22.4** |
| largest vertex move | **0.1436** raw |
| tail tip's distance from its own chord, before | 0.1388 |
| tail tip's distance from the midline, after | **0.0060** |
| body length, before → after | 1.000 → **1.0684** |

The roll is read off the animal's own countershading — the first circular harmonic of the darkness
round each station points at dorsal — at mean harmonic strength **0.587** over 55 of 60 stations,
with 15.0° of measured drift along the body. The snout finishes 0.030 off the midline, which is the
one place this body does not land square: that is the generation's own asymmetry at the tip of a
rostrum a third of the animal long, and the carry does not invent a correction for it.

**How far from neutral the rest pose is**, which is what decides whether a curve can be straightened
on the rig or has to come out of the mesh:

| Region | arc | turning | section radius | mean curvature radius ÷ section |
| --- | ---: | ---: | ---: | ---: |
| whole spine | 1.132 | 94.6° | 0.0319 | **21.48** |
| head and trunk | 0.365 | 32.8° | 0.0464 | 13.73 |
| tail | 0.441 | 47.1° | 0.0218 | 24.65 |

No neck to measure separately. Nothing here is within a factor of seven of the 2.8 that forced
Dinocephalosaurus' neck to be unbent in the mesh.

**Left–right asymmetry of the paired fins.** The rig's own joints differ by **0.21 %** of body
length on average and 0.84 % at worst, because `seat()` pulled the two pectoral roots in by slightly
different amounts. The generation's own asymmetry, measured by mirroring the intake surface in x and
asking every paired-fin vertex how far it is from its reflection, is **0.87 %** on average and 2.13 %
at the 95th percentile.

## The mouth

| | |
| --- | ---: |
| method | geometric (normals cast back into the mesh) |
| cavity vertices found | 416 over 16 stations |
| the mouth's extent | raw y −0.5161 … −0.3558, 15 % of body length |
| how far the measured lip line departs from a straight line | 0.00207 raw, **0.19 % of body length** |
| **the cut's own deviation from that lip line** | **0, by construction** |

A needle fish's mouth is genuinely almost straight, which is the easy case, and the number says so:
two thousandths of a body length of curvature over a 15 % run. The cut follows the measured curve
anyway — the head is sheared by −seam(y) so the curve lands exactly on z = 0, the cut is taken there
and the shear undone.

**The generation arrived with its mouth shut for practical purposes.** The slit is a quarter of the
local head depth, but on a rostrum that shallow that is a closing rotation of only **2.5°**, so
nothing here has to fold a modelled gape closed. The jaw still rests shut in every clip that carries
the body and opens only for the strikes; posed shut, 518 of 1,425 mandible vertices touch the
skull's surface to a maximum of 3.2 % of body length and a mean of 0.2 %, which is the two tooth
rows meeting.

**The cut and the lining run to the very tip of the rostrum.** The jaws do, and the modelled cavity
stops a little short of them: left at the cavity's own front, the last 0.016 of the snout stayed on
the skull while the mandible swung away from it and the gape opened onto nothing there.

**The teeth are the generation's own** — 945 vertices in the oral zone, 45 standing proud of their
neighbourhood, the tallest by 0.0033 raw. Nothing is authored. 792 tooth-bearing vertices go whole
onto the mandible, and which jaw a tooth belongs to is decided by the height of the *smoothed*
surface it grows out of rather than by its own height. That correction is the one this animal
forced: with a graded height test, the upper tooth row came out of the first render as **a comb of
needles two head-depths long**, each tooth stretched between the skull and the jaw. Flood-filling
labels from the skin was tried as the fix and is worse here — the seeds are sparse on a tube this
thin and the label boundary wanders through the snout, which tore it into ribbons.

### The mouth's interior, and proving the gape is not a hole

**A palate and a floor, not one sac.** The skinned lining that stood here — roof on the skull,
floor on the jaw, wall stretching between them — could not part, and photographed as a mouth
webbed shut. It is now the era's contract, imported from `_pipeline/tripo.py`: `T.oral_shells`, a
**palate** rigid on `skull` and a **floor** rigid on `jaw`, each a closed shell wound outwards,
each filling its own jaw's interior to a room cast inwards from outside on the closed intake
surface, overlapping behind the hinge and joined nowhere. `tools/triassic/oral-shell-audit.mjs`
proves it in the packaged authored body, twin and LOD (one bone per vertex, no bridging triangle,
every edge on two faces, both halves closed); `throat-audit.mjs` reports 0 mixed jaw/skull
vertices in the lining, where 320 of 336 were mixed before.

What this rostrum taught the port, each recorded in `validation.json` under `oralShells`:

- **The generation arrived gaping, and a mouth built about the mouth line is built in the water.**
  Both shells about the cavity's mid-height hung in the gape: the palate sat 0.011 raw below the
  underside of its own upper jaw, and no room measured from mid-gape and held short of the skin
  ever reached the jaw it belonged to. Each shell is built about its own jaw's edge of the lumen —
  the roof and the mandible's top, read as the largest empty interval on the vertical line through
  the mouth's axis, never more than 0.0015 of a body from the jaw's real surface — with the room's
  width cast *in the jaw's flesh*, because at the line a side cast passes under the upper rod and
  `T.mouth_room`'s positive fallback then read as 0.02 of a body of room where there was open
  water, twice the width of the rostrum. The floor ends where there is mandible under the axis.
- **The rostrum is not on the midline.** After the intake unbend it runs 0.001–0.025 raw to one
  side (`lateralAxisAtStations`), and a lining on x = 0 stood beside the jaws: from its supposed
  axis, rays to every side and up and down met nothing at all. The mouth's lateral centre is now
  measured from the cavity itself and every width is taken about it.
- **Every shell vertex is seated inside the head's silhouette** by rays against the closed intake
  surface, with the two exceptions a gaping mouth needs (a point in the measured gape may look out
  through the parted lips; a palate point may look down through the gape). 174 pulled in, the
  furthest by 0.037 raw. The `np.interp` clearance is recorded and no longer asserted.
- **The throat is 0.35 of the mouth's length** and the shells fill 97 % of the room, so the corner
  wedge behind the mandible is a wall rather than a line of sight into the neck.

And three faults in the cut: the skull's hinge cross-section was open and is capped with its own
cut vertices (`T.cap_cut`, 33 faces on the authored body); the seam's rim is folded in by 0.0035
raw (`T.rim_flange`, 99 vertices, running out at the tip where the two rims meet); and **the
generation's own opercular seams**, open slits into a hollow head behind the corner of the mouth,
are sealed with their own vertices (`T.seal_seams`, 12 faces, each new face wearing its rim's UVs).
Those seams were the whole of what the old count had been reading: 373 px with the sac, in the same
places with the shells until they were sealed, every one of them a line of sight through one
back-facing skin surface. The mandible's normals are put to a vote against the intake surface
(+2377 here, already outward; Hybodus' were not).

```
blender -b --python tools/triassic/gape-solid.py -- saurichthys Heavy@0.50 Attack@0.40 Bite@0.15
```

| shot | seen through the body, before this port | now |
| --- | ---: | ---: |
| `Heavy` @ 0.50 | 373 | **1** |
| `Attack` @ 0.40 | 372 | **1** |
| `Bite` @ 0.15 | 0 | **2** |

**PASS**, 2 px of 378,000 at the worst of three shots against a tolerance of 12 — and honest gape
(backdrop in both passes) of 16 / 16 / 4 px where the sac had a mouth webbed shut. The record is
[`gape-solid.json`](gape-solid.json), with the shipped body's counts under `beforeThisPort`, and
the builder folds it into `validation.json`. The 15 September note below, on what the tool was
reading before its backdrop test was tightened, stands as history.

## Rig

24 joints: `root`, `body`, `chest`, `skull`, `jaw`; `tail_00…tail_06`; `caudal_upper` and
`caudal_lower`; `dorsal` and `anal`; `pec_upper/pec_mid/pec_tip` per side; `pelvic` per side. The
rostrum and skull are one rigid piece on one joint, which is what an elongate, partly ossified
column with the fins set far back actually is. Dorsal and anal ride the caudal chain and are
opposite each other, because with the caudal they are one rudder.

Every root is seated inside the trunk's own cross-section: pectorals 0.0165/0.0179 raw deep,
pelvics 0.0173/0.0251, the jaw hinge 0.0129. Every vertex on both bodies has normalised non-zero
weights and at most four influences.

**Three corrections took the worst edge stretch in this animal's skin from 23.1× to 3.6×**, and a
fourth put two bones back to work:

1. **Every fin's region gate is feathered.** They were hard tests — `F(.30) < y < F(.42)` and the
   like — and a blade runs past the end of its window, so at a fin's distal edge one vertex carried
   `pec_tip_R: 1.000` and the vertex a hundredth of a unit away from it carried none. Each fin now
   bids for a point as a product of slopes and the strongest bid wins.
2. **The weights are relaxed over the mesh's own graph** — ten passes, each keeping 45 % of a
   vertex's own weights and sharing the rest among its edge-neighbours. The blade mask reads a
   *measured* shell thickness and that measurement is noisy at a fin's base; averaging cannot invent
   an influence that was not already next to a vertex, and it removes the step rather than moving
   it.
3. **A fin's radial ramp is measured, not named** — the quartile to the 80th percentile of how far
   out that stretch's thin vertices actually lie.
4. **Two bones were animating nothing at all.** `verticesPerBone` came back with `pelvic_L`,
   `pelvic_R` and `caudal_lower` owning **no geometry**, so the clips were swinging joints that
   moved no skin and the swept angles recorded for them were about nothing. Both causes were
   measurable. The pelvic bone was at 0.63 of the body and the generation's pelvic blade is at
   **0.50–0.60** (`bladeVerticesByStation` in `validation.json` is the scan that says so), so the
   root moved to 0.545 and hangs off `tail_00` instead of `tail_01`. And the caudal's two lobes were
   split at the trunk's extrapolated axis, which this fin sits almost entirely above — 80 thin
   vertices above it in the last twentieth of the body against 5 below — so the split is now the
   fin's own mid-height, 0.0044 of the body up from the axis. All 22 skinned joints now own
   geometry — `pelvic_L` 339 vertices, `pelvic_R` 395, `caudal_upper` 212, `caudal_lower` 140 — with
   `jaw` carrying the mandible and the lining and only `root` unskinned.

| | Measured | Fraction of the 5.000 body | Tolerance |
| --- | ---: | ---: | ---: |
| maximum envelope difference over 21 stations | **0.0724** | **1.45 %** | 4 % |
| nearest-twin-surface distance, max | 0.0470 | 0.94 % | — |
| the same, 95th percentile | 0.0244 | 0.49 % | — |
| `anchor_mouth` to the nearest authored surface | 0.0812 | **1.62 %** | 2 % |
| `anchor_mouth_inside` | 0.0044 | 0.09 % | 2 % |
| `anchor_attack_primary` | 0.0887 | **1.77 %** | 2 % |

`anchor_mouth` (role mouth) is on the **jaw**, `anchor_mouth_inside` (role swallow) on the **skull**,
`anchor_attack_primary` (role attack) on the **skull** — the roster's heavy attack here is *Spear*,
delivered by the rostrum, which is rigid on the skull. Both of the front two anchors sit further
from the surface than the others because the rostrum is a needle and the mouth line runs down the
middle of it: 1.6–1.8 % of body length, inside the 2 % the pipeline allows but the least comfortable
number on this animal.

The twin is a voxel volume resurfacing at **0.0042** raw units — finer than the shark's, because a
rostrum 0.01 across has to survive the occupancy field as a rostrum — relaxed under a thickness mask
and reduced. No source vertex or face survives it; pigment is sampled through the nearest source
triangle's own interpolated UV.

## Motion

21 contract clips plus this animal's own **FastStart** and **Hover**.

| Clip | s | | Clip | s | | Clip | s |
| --- | ---: | --- | --- | ---: | --- | --- | ---: |
| Idle\* | 3.0 | | Attack | 0.9 | | Stagger | 1.2 |
| Swim\* | 1.6 | | Bite | 0.45 | | Ability | 1.0 |
| Sprint\* | 0.9 | | Heavy | 1.1 | | **Grab\*** | **1.1** |
| TurnLeft | 1.5 | | Hit | 0.6 | | Breath | 2.4 |
| TurnRight | 1.5 | | Death | 1.7 | | Growth | 1.5 |
| Dive | 1.4 | | Guard\* | 1.2 | | **FastStart** | **0.8** |
| Rise | 1.4 | | Parry | 0.4 | | **Hover\*** | **3.4** |
| | | | Dodge | 0.45 | | Eat\* | 1.5 |

`*` loops exactly, seam 0.0 to the float. Grab is a 1.1 s held loop. Root motion and scale animation
are absent. `locomotion` is **Swim**.

**This is not the shark's performance and does not read like it.** Kogan et al. 2015's flow-tank and
CFD work reads *Saurichthys* as a pike-like fast start on a body that is a poor sustained swimmer, so
the cruise is small and stiff and the burst is enormous:

| | Swim | Sprint |
| --- | ---: | ---: |
| skull lateral travel | **0.004** | 0.012 |
| `tail_03` | 0.084 | 0.228 |
| `tail_06` | 0.285 | 0.712 |
| caudal lobe tip | **0.613** | **1.462** |
| caudal lobe lag behind the peduncle | 0.041 of a beat | 0.043 |

The head moves four thousandths of a unit through a whole Swim cycle — 141 times less than the tail
tip — which is what a stiff-bodied ambusher looks like from above.

**The strike is a C-start, not a swim that speeds up.** The chain folds one way in unison over the
wind-up and unrolls from the front, the pectorals clamp back against the flank for it, and the
rostrum leads and holds the line through the drive:

| | skull reach | peak forward speed | fastest frame at | peak gape |
| --- | ---: | ---: | ---: | ---: |
| `Attack` (0.9 s) | 0.629 | 8.11 u/s | phase 0.31 | 0.65 rad |
| `Heavy` (1.1 s) | 0.841 | 11.81 u/s | phase 0.32 | 0.75 rad |
| `FastStart` (0.8 s) | **0.907** | 11.27 u/s | phase 0.30 | 0.55 rad |
| `Bite` (0.45 s) | 0.080 | — | — | 0.70 rad |

FastStart is the roster's *ambush surge* and has to out-reach the ordinary attack or it is the same
clip twice under two names: it does, by **1.44×**, and the audit asserts both that and that it
out-accelerates Attack.

**Hover is the passive the roster names** — "hangs motionless and is very hard to notice while it
does" — so it has to be measurably still, and the audit holds it to that: the skull travels
**0.038** of an engine unit over the whole 3.4 s clip and the tail tip 0.166. Only the paired fins
scull, and the body breathes.

**The paired fins work the dash.** Swept angle at each root over the whole Sprint clip (two beats):
**0.77 rad** at each pectoral, **0.95 rad** at each pelvic. Both numbers are now about a fin rather
than about a joint: the pelvic bones owned no geometry at all until the root was moved onto the
blade the generation actually carries (see the Rig section), and a swept angle recorded for a bone
that moves no skin is worse than no number.

## Verification

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/saurichthys/build.py
node tools/triassic/creatures/saurichthys/audit.mjs --package --decode
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- saurichthys Heavy@0.50 Attack@0.40 Bite@0.15
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/saurichthys.glb
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/saurichthys/render.py -- --decoded
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/saurichthys/render.py -- --decoded --twin   # the twin's portrait only
python3 tools/triassic/creatures/saurichthys/contact-sheets.py
node tools/triassic/review-bodies.mjs
```

`build.py` authors both geometry and performance, writes only this species' asset family, touches no
shared registry and performs no git operations. It installs an excepthook that kills the process
with a non-zero status on any exception, because Blender exits 0 when a script raises.

`audit.mjs --package --decode` does everything the Hybodus audit does — exact rig, inverse-bind,
socket and per-clip sample parity between the three files, normalised weights, loop seams, no root
or scale channels, the twin under 40 % — and then plays 61 phases of every clip on both models
through the real loader and mixer and asserts this animal's own motion: the beat grows backwards
from a still head, the caudal lobe lags the peduncle, the strike commits, FastStart out-reaches and
out-accelerates Attack, Hover is still, and the jaw never closes past the measured shut pose. It
also sweeps every edge of every clip and **asserts the skin's own worst stretch is under 8×**, split
by surface so the oral lining — which is built to stretch — cannot mask a weight fault in the skin.

Repository checks run green: `npm run triassic`, `npm run typecheck`, `npm run build`,
`npm run eras`, `npm run props`.

Sheets, rendered from the decoded packaged file, and of the **authored body alone**: the second
column used to be the same frame on the twin, and that comparison almost never earned its cost — a
twin has no fin rays and no lip corners, so a clip that reads perfectly on it can be tearing the
shipping body, which is what was happening here at 23× and was invisible in the paired pictures. The
pairing is still checked by measurement — the envelope and nearest-surface numbers above and the
rig, clip and anchor parity assertions in `audit.mjs` — and `render.py --twin` still renders the
twin's delivered portrait and then stops. The files keep the `paired-` prefix the rest of the era
uses: [volume](paired-volume-sheet.jpg), [deformation](paired-deformation-sheet.jpg),
[the lunge](paired-lunge-sheet.jpg), [remaining actions](paired-actions-sheet.jpg),
[the beat from above](paired-beat-sheet.jpg), [this animal's own clips](paired-era-clips-sheet.jpg),
[the mouth](paired-mouth-sheet.jpg).

## What I actually looked at, and what is weak

I rendered every clip and looked at the sheets; there was no human reviewer and none is claimed.

What I saw, on the authored body, which is the one that ships and the only one the sheets now draw:
the needle body is straight and level, the opposed dorsal and anal read as one rudder
with the caudal, the rostrum holds its line through the dash, and the gape opens as a long lined
cavity with both tooth rows on their own jaws.

Honest limitations, worst first:

1. **The gape check passes, at 3 see-through pixels of 378,000 against a tolerance of 12** — and
   what changed to get there was the instrument, not the fish. The backdrop discriminator was
   catching this animal's own pale skin. The whole argument and the era-wide re-run are in the gape
   section above; no geometry changed. What is left is three isolated pixels at the edge of the
   frame where a surface one polygon thick loses its back face, and the shipped material is
   double-sided so none of it arises at runtime.
2. **Skinning tears — mostly fixed, and here is what is left.** `node tools/triassic/skin-tears.mjs`
   reports a worst edge stretch of **6.56×** (Bite), against **23.11×** before the corrections in
   the Rig section. But the shared tool names the **bone** an edge follows, not the surface it is
   in, and every one of this animal's worst clips is the **oral lining** — a sac whose whole job is
   to stretch from a shut mouth to a full gape. `audit.mjs` splits the same measurement by surface,
   records it as `skinTearsPerSurface`, and asserts the skin's own worst is under 8×:

   | surface | worst | clip | grew from → to | edges over 2× |
   | --- | ---: | --- | ---: | ---: |
   | `Saurichthys_authored_body` (the skin) | **3.61×** | Death | 0.024 → 0.086 | 30 |
   | `Mouth_lining` (built to stretch) | 6.56× | Bite | 0.023 → 0.153 | 2,730 |
   | `Seated_jaw_hinge_tissue` | 1.00× | — | — | 0 |
   | `Saurichthys_authored_body_lower_jaw` | 1.00× | — | — | 0 |

   3.61× in the skin is close to Nothosaurus' 2.98× era reference and far below the 12.4× the sweep
   called broken. The lining's 6.56× is a mouth opening. Full per-clip table in
   [`skin-tears.txt`](skin-tears.txt).
3. **The mouth and attack anchors sit 1.6–1.8 % of body length off the nearest surface**, against
   0.24–0.34 % on the shark. The rostrum is a needle and the mouth line runs down the middle of it,
   so there is very little surface near the midline to be close to. Inside tolerance, but it is the
   number I would look at first if a grip reads as landing in air.
4. **A few long strands still cross the front of the gape** at the widest openings — the last of the
   sac's front cap being dragged open by a jaw this long. They are two or three edges wide and the
   `gape-solid` test does not see them as holes, but they are visible in the mouth sheet.
5. **The resting slit shows as a dark wedge at the tip of the rostrum in a three-quarter view.**
   Square from the side the jaws read as closed with a fine dark line between them, which is right;
   turned a little, the eye looks down the slit and sees the lining behind it. That is the
   generation's own 2.5° resting gape carried to the very tip by the cut, not a hole — but on a
   snout this thin it is a noticeable black patch in a portrait, and it is another thing a
   mouth-closed regeneration would take away.
6. **The snout finishes 0.030 raw off the midline** (2.8 % of body length). That is the generation's
   own asymmetry at the tip of a very long rostrum; the carry does not invent a correction for it.
7. **No eye globes**, as on every other body in the era so far.
8. **The lining wears the skin's pigment stretched**, which reads as flesh at distance and as a smear
   in a close-up.
9. Living colours, soft tissue and movement are artistic reconstruction. Travel, the live birth the
   roster gives this animal, and the grip rules remain engine-owned.

## Re-checked under the corrected gape test — 15 September 2026

`gape-solid.py` identified its backdrop by a half-space, and it has now been too loose twice, in the
same way. At `r > .5, g < .3, b > .5` it caught a lit *oral lining*: on Rhaeticosaurus 394 of 508
failing pixels were its own mouth, correctly drawn. Tightened to `r > .75, g < .45, b > .75`, this
body went 18 px to **17**, and that one-pixel move was read as proof that the remaining hole was
real geometry.

It was not. The window still caught the animal, and here it caught the **skin**: a pale silvery
fish renders at about (0.78, 0.44, 0.76) under a magenta world, inside that window by one part in
two hundred on green, while the backdrop itself comes back below 0.063 on green everywhere
measured. The test is now `r > .90, g < .20, b > .90`, this body reads **3**, and across seven
delivered animals and 33 shots nothing goes up. The section above has the evidence.

Two lessons worth keeping. **A count that will not move is a count about something else** — that is
now twice — and **the right way to find out what a failing pixel is, is to cast a ray through it**
and ask every surface on the line, rather than to keep changing geometry and re-reading renders.


## The cut is earning its place — measured (T3D-32C)

T3D-31's first question is whether the cut should be there at all, and `T.cut_rim` answers it by
reporting what the cut actually left open in each half. On this animal it returns **two different
answers for the two bodies**, which is worth saying plainly because it is the reason neither of
T3D-31's two constructions can simply be applied here.

| | boundary edges in the head | largest loop | closed? | reach over body | on the seam |
| --- | ---: | ---: | :--: | ---: | ---: |
| authored | 282 (+8 elsewhere) | 165 vertices | no | 0.0824 | 65 of 165 |
| authored, mandible | 222 | 162 vertices | no | 0.0824 | 65 |
| twin | 148 | 148 vertices | **yes** | **0.1825** | 103 |
| twin, mandible | 0 | — | — | — | — |

The mouth runs 0.18 of a body. **The twin's cut makes the whole aperture** — one closed loop the
length of the mouth, every other vertex of it on the seam — which is case 1, a head that arrived
shut, and it arrived shut because a voxel remesh of an occupancy field is a closed solid whatever
the generation was. **The authored body's does not.** Its largest run spans 0.0824 of a body and
sits at y −0.377 to −0.289 against a hinge at −0.340: it straddles the hinge, which is the cut's
cross-section and the generation's own opercular seams behind it. Forward of that, over 0.15 of the
mouth's 0.18 run, the cut left nothing open at all, because the generation's own modelled slit was
already open there. That is case 2 shading into case 3.

`T.cap_mouth` was tried on the authored half and **refuses, correctly and by construction**:
`_rim_cycles` finds 32 of 141 rim vertices without exactly two rim edges — including one with four
boundary edges at y −0.363 — because the generation's slit rim and the cut's rim are one connected
branching boundary, and the lip run is open at the snout where the slit already opens. A cap that
claims to close by construction has to know it is spanning a closed curve. The twin's rim is nearly
closed (4 bad vertices of 107), and capping one body of a pair and not the other is not an option.

What the lining is worth, measured by drawing it and not drawing it at the peak of every opening
clip: **2 px through / 162 opened with it, 89 / 523 as drawn without it.** So it is doing real
work — about 87 through and 360 opened — and the runtime hides it, which is exactly T3D-31's
complaint. The 162 that remain *with* the lining are slivers along the generation's own tooth row,
which is geometry `CLAUDE.md`'s simplicity bar forbids re-modelling.

So this body does **not** reach 0 through and 0 opened as drawn in this pass, and it is recorded
rather than papered over. The routes out are the two T3D-31 names for this case and both are larger
than a weighting change: a mouth-closed regeneration, or `T.jaw_field_uncut` on the authored body
with the cut kept on the twin — which would have to answer what the bind pose is on a body whose
`RESTING_GAPE` closing rotation is currently baked into a labelled mandible shell.

As drawn, at the measured peak of every clip that opens the jaw past a degree:

| clip | phase | through | opened |
| --- | ---: | ---: | ---: |
| Bite | 0.133 | 89 | 523 |
| Attack | 0.267 | 123 | 507 |
| Heavy | 0.333 | 82 | 451 |
| FastStart | 0.233 | 30 | 387 |
| Grab | 0.667 | 37 | 380 |
| Ability | 0.300 | 34 | 395 |
| Eat | 0.300 | 33 | 387 |
| Breath | 0.967 | 24 | 82 |
| Death | 1.333 | 30 | 90 |

Plain (the file as it is, lining drawn): 2 / 2 / 4 through and 162 / 164 / 152 opened at
`Bite` / `Attack` / `Heavy`.

**A note on the audit.** `audit.mjs` cannot run on the shipped file at all, with or without
`--package`, once the shore gait `Flop` has been applied: the clip's `root` channels are constant
(the contract is that the root does not move) and the audit asserts the channel does not *exist*.
That is a central tooling defect and not this body's. Parity was therefore measured on the body
**immediately before `Flop` was applied**, which is the same geometry: exact rig, inverse-bind,
socket and per-clip sample parity, `saurichthys.glb` 1,806,412 B / 22,078 triangles / 13,491
vertices and `saurichthys.puppet.glb` = `saurichthys.lod1.glb` byte for byte at 708,252 B / 8,443
triangles / 4,288 vertices (38.2 % of the authored triangles).
