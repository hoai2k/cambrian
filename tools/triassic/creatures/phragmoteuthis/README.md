# Phragmoteuthis

> **Current repair, 20 September 2026 (T3D-12B):** the invented crown opening — the peristome cut,
> the sewn oral lining and the two authored mandibles — is removed, and the crown is the closed
> surface the generation delivered, exactly as Ceratites' has been since T3D-02a. The three mouth
> and attack anchors on the crown axis are the whole of the mouth. The jet bones, the mantle
> squeeze audit and the twelve-arm count are untouched. `gape-crown.py` is moot on this body and
> says so. The mouth section below describes what is now shipped; the older reconstruction it
> replaces is kept under it as history.

The era's second cephalopod. It shares an arm crown, a beak and a hyponome with Ceratites and almost
nothing else: where the ammonoid is a rigid house with a soft animal leaning out of it, this is soft
all the way through with one stiff plate buried in its back, and the two bodies needed opposite
answers to the same questions.

**State: built, awaiting review.** Registered in `src/content/triassic/review-bodies.json` and nowhere
else — `tools/triassic/shipped.json`, `TRIASSIC_STAND_INS` and the preview badge are untouched.

## Reproduce

```
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/phragmoteuthis/build.py
node tools/triassic/creatures/phragmoteuthis/audit.mjs --package --decode
node tools/triassic/skin-tears.mjs public/assets/triassic/creatures/phragmoteuthis.glb
node tools/triassic/idle-bones.mjs public/assets/triassic/creatures/phragmoteuthis.glb
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-solid.py -- phragmoteuthis Bite@0.22 Attack@0.4 Eat@0.37
/opt/blender/blender -b --factory-startup --python tools/triassic/gape-crown.py -- phragmoteuthis Bite@0.22 Attack@0.4 Eat@0.37   # moot: no mouth drawn
node tools/triassic/oral-shell-audit.mjs phragmoteuthis
/opt/blender/blender -b --factory-startup --python tools/triassic/creatures/phragmoteuthis/render.py -- --decoded --twin --portraits
node tools/triassic/review-bodies.mjs
```

## The frame, which the shared measurement *can* find — and is checked anyway

Unlike the ammonoid, this body has a long axis a principal component can see (0.23 and 0.18 against
1.0 on the other two) and real countershading: a dark dorsal stripe over a pale flank, measuring
**0.348** against `T.measure_frame`'s 0.30 floor. So the frame is the shared one — head at −Y, up +Z,
one unit long along Y, `export_yup` putting the head at glTF +Z.

It is corroborated rather than trusted. After the roll correction the terminal fins span **0.215**
across the body and **0.114** through it, and a fin pair that reads as lateral is what says the roll
landed the animal the right way up rather than on its side. The builder asserts it: if the fins ever
measured taller than they are wide, nothing further down the file — which flank is which, where the
funnel goes, which way the arms fan — would mean anything.

## The mantle is stiff, and its jet cannot be a scale channel

A phragmoteuthid carries a rigid internal shell — a phragmocone with a long pro-ostracum reaching up
the back — so the mantle is a stiffened tube rather than a bending one. It is one bone with no bend in
any clip, and `audit.mjs` proves it the way Ceratites' shell is proved: the pairwise distances between
the vertices `body` owns **outright** change by **0** across every phase of every clip.

That makes the jet the problem, because a mantle's jet is a **radial contraction** and the packaging
contract forbids scale channels outright. Rotation cannot express it either: a bone on the body axis
rotating about that axis carries a flank point round a circle of the same radius, which is not a
squeeze. So the squeeze is two bones seated inside the flanks with **translation** channels, which the
contract does allow and which every builder in this era already uses for a head or a body.

The check is not "were the flank bones keyed" but the animal's own measured width — the lateral span
of the skin those bones own, played out:

| Clip | Widest | Narrowest | Contraction |
| --- | --- | --- | --- |
| `Ability` (ink) | 0.772 | 0.441 | **0.331** |
| `Sprint` (dart) | 0.772 | 0.565 | **0.207** |
| `Idle` | 0.772 | 0.721 | 0.051 |
| `Swim` | 0.772 | 0.730 | 0.041 |
| `Attack`, `TurnLeft` | 0.772 | 0.772 | **0** |

## Twelve appendages, and only ten are right

A cut-sphere sweep about the measured crown settles on **12** over three radii at two centres. A
phragmoteuthid is a decabrachian with **ten**, and the greenlit pose draws eight arms and two clubbed
tentacles.

**This is recorded as an open defect and is not corrected.** The Tripo mesh is never edited after
intake and a shape change goes back to the pose, a fresh generation and another greenlight — cutting
two appendages out of the crown here would put the model and the picture permanently at odds with
nobody able to say which is the animal. The two longest are rigged as the tentacles (seven joints
against the arms' five), which is what the animal catches with, and the extra pair rigs and animates
like any other arm.

## The locomotion, which the flavour text disagrees with

`src/content/triassic/creatures.ts` gives this animal `swimStyle: 'omnidirectional'` and **no
`shell: true`** — and `shell` is what `RULES.jet()` in `src/sim/triassic/rules.ts` reads. So in the
game Phragmoteuthis does **not** jet: it has no free hover and no backwards travel, and what
`omnidirectional` buys it is that it never turns to face where it is going (`game.ts` skips the yaw).
Its tagline is "Hooks, ink, and a jet in the wrong direction" and its passive is about riding giants;
the jet is flavour that the rules do not implement.

That is recorded, not papered over — nothing in this builder changes `creatures.ts` — and it happens
to point at the honest clip anyway. A squid with fins this size holds station and moves in any
direction on a **travelling wave down the two lateral fins**, which is exactly what `omnidirectional`
describes. `Sprint` is the mantle dart, arms drawn to a point and fins clamped. It is not
`swimStyle: 'pulse'` either, so nothing scrubs `Swim` to a phase.

A turn **reverses the inside fin's wave** rather than damping its amplitude. Damping was the first
version and it left the left fin sweeping 5.6° against the right's 32° in a left turn, which is a fin
that has stopped rather than a body pivoting about its own middle.

## The mouth

**There is no mouth modelled on this animal, and that is the verdict.** The generation models none
— `T.mouth_cavity` returns 499 hits spread over the crown, neighbouring arms across the gaps rather
than a lip opposite — and a beak inside an arm crown faces down the crown's own axis inside a
thicket of arms, where the player never sees it. Everything that used to be built here (a hole cut
in the crown, a sac sewn to its rim, two mandibles behind it) was geometry invented to close a hole
the builder had itself cut, so it is retired and the crown stays the closed surface it was
delivered as ([before](../../../../docs/triassic/throat-repairs/phragmoteuthis-Attack-before.png),
[after](../../../../docs/triassic/throat-repairs/phragmoteuthis-Attack-after.png), both straight
down the crown axis at `Attack`'s reach). What the game needs there — `anchor_mouth`,
`anchor_mouth_inside` and `anchor_attack_primary` — are bones and cost no geometry, and they are
still placed off the crown-axis measurement below, which is why `cut_peristome` survives in the
builder uncalled. `skull` and `jaw` survive too: the lip band of the crown's own skin is weighted to
them, so they are joints that own skin and the clips that hold them still hold the animal.

Measured on the rebuilt body: `gape-solid.py` 0 px through the body at `Bite@0.22`, `Attack@0.4` and
`Eat@0.37`, the two passes differing by at most one pixel, because a closed crown gives the cull
shim nothing to open; `gape-crown.py` **moot** — it frames off the lining and masks on the oral
materials, and there are none, so it now records that and exits rather than failing on an empty
`max()`. `oral-shell-audit.mjs` reports no oral lining on authored, puppet or LOD. The skin figure
is unchanged at 5.37× (`Guard`, the funnel); the clips whose worst edge sat at the crown moved both
ways by a fraction because closing the hole changed the mesh graph the weight relaxation runs over
(`TurnRight` 5.06× → 2.79×, `Dive` 4.19× → 2.11×, `TurnLeft` 1.71× → 2.57×), and every joint still
owns skin.

### The mouth as it was built before (historical)

The peristome was authored on the crown's own axis (the mean direction of the twelve appendages),
with one closed skinned lining sewn to the skin's cut rim and flanged behind it, and two keeled
mandibles on `skull` and `jaw`.

The crown's dome is found by casting **from inside the head outwards**, where Ceratites casts the other
way. That difference is the animal: an ammonoid's crown dome faces open water, and this crown's
appendages converge on the axis in front of the head, so a ray coming in from outside lands on an arm
and calls it the mouth — which is how a first build got a peristome with 0.022 of head behind it.

Proof at the time, tolerance 12 px: `gape-solid.py` **2 px** through the body; `gape-crown.py`
**8 px** where the mouth was drawn — the sewn sac's own rim, which no longer exists.

## Anchors

| Socket | Bone | Role | Why |
| --- | --- | --- | --- |
| `anchor_mouth` | `jaw` | mouth | where the lower mandible's edge would be, on the crown axis |
| `anchor_mouth_inside` | `skull` | swallow | 0.55 of the measured head room back along the crown axis |
| `anchor_attack_primary` | longer tentacle's tip | attack | **not the beak.** `heavy: 'Hook latch'` is the tentacle pair shooting out and hooking; the beak only ever gets what they bring back. Carries that tentacle's whole chain for IK. |
| `anchor_grasp` | other tentacle's tip | grasp | what `attachments.ts` reads to decide where a held animal rides |

## Numbers

| | |
| --- | --- |
| Joints | 77 (root, body, mantle_L/R, tail, 2 fins × 3, head, funnel, skull, jaw + 12 appendages) |
| Clips | 21, the contract set |
| Triangles | 20,387 authored · 7,861 twin (37.8 %, the contract's ceiling is 40 %) |
| Envelope, 21 stations | max **0.017** against a 0.20 tolerance |
| Surface distance, twin vs authored | p95 0.022, max 0.122 |
| Skin tears (`skin-tears.mjs`) | **5.37×** — era: Nothosaurus 2.98× clean, Henodus 4.81×, Cartorhynchus 5.17×, Hupehsuchus 5.79× |
| Idle bones | every joint owns skin; one at 0.030 % (`arm_02_00`) |
| Mean influences | 3.58, max 4 |
| Fin sweep per cycle | Swim 38.8° both sides, turns 22.8° both sides |
| Tentacle sweep per cycle | Attack and Heavy both over 40°, and out-reaching the arms by 1.4× |
| `meanCurvatureRadiusOverSection` | mantle 7.65, arms 13.16 |
| Appendage asymmetry | mean 0.088, max 0.268 of body length; fins reach 0.1099 left and 0.1055 right |

## Known weaknesses

- **Twelve appendages instead of ten**, above. The route out is a regeneration, not a cut.
- **The generation meshes its left fin with 1141 thin vertices and its right with 652** while the two
  reach 0.1099 and 0.1055 from the axis — the fins are geometrically near-symmetric and unevenly
  triangulated. The rig is symmetric (both fins swing through the same 38.8°), and this is why the
  audit measures each fin's **outermost** vertex rather than a weighted centroid, which sat at a
  different radius per side and reported the right fin travelling 45 % of the left.
- **`arm_02_00` owns 0.030 % of the skin.** Non-zero, so `idle-bones.mjs` passes it, but that root
  joint moves very little skin. It is the shortest appendage's first segment; its fade-in is already
  a fraction of its own first segment rather than a fixed arc length.
- **5.37× skin tears** is mid-pack for the era and the worst edges are on `Guard` — a held pose with
  the crown folded over the head — and around `mantle_R`, where the squeeze moves flank skin sideways
  while the skin above and below it stays put. The squeeze's feather is already spread over most of
  the flank; going further would start to hide the jet.
- **`conformArms` must not be set** on this creature. It has the `arm_<i>_<nn>` naming that
  `ArmConform` looks for, but it is a midwater squid: this is precisely the nautiloid case
  `src/render/conform.ts` warns about, where arms would be laid out on the seabed.
- `portraits/` holds this body's own cards and they are **not** in `public/assets/`.
