# Triassic proportion audit — 13 September 2026

Every Triassic body we have, measured against the animal's own documented anatomy, looking for the
failure found in *Nothosaurus*: **a body whose proportions contradict the research because the
canonical pose it was drawn from got them wrong.**

Twenty-three bodies were measured: the two delivered, rigged animals
(`public/assets/triassic/creatures/nothosaurus.glb`, `shonisaurus.glb`) and the twenty-one raw
Tripo previews listed in `src/content/triassic/preview-bodies.json`.

The finding is that Nothosaurus is not alone. **Shonisaurus — delivered, rigged and shipped — wears
a dorsal fin and a crescent tail fluke that [`research.md`](research.md) says it did not have**, and
both are in its greenlit canonical pose, so the fix is the same route the Nothosaurus neck takes:
back to the pose. Seven preview bodies carry proportion errors of the same kind: three go back to a
pose, one is the generation's alone, and three are both.

This document reports. It changes no pose, no manifest, no `shipped.json` and no
`pending-refinements.json`.

---

## Method

An impression from a render is a reason to go and measure; it is not a finding. Every number below
comes from one of three tools, all added with this audit:

- **`tools/triassic/proportions.py`** (Blender 5.2, headless) imports a GLB, works out the body's
  long axis from the geometry rather than trusting anything, and reports the body in forty axial
  cross-sections — half-width, local half-width, height, dorsal and ventral surface — plus every
  mesh object's own extent, every bone head and tail, every `anchor_*`, and two silhouettes with
  decile ticks under the body so a landmark seen in a picture can be named as a fraction and then
  looked up in the table. Everything is in glTF coordinates, so it can be compared directly with
  the figures already recorded for Nothosaurus.
- **`tools/triassic/proportion-regions.py`** turns boundary fractions into region lengths along
  both the straight axis and the bent centroid path.
- **`tools/triassic/pose-proportions.py`** measures a *pose* — a canonical image or a modelling
  sheet — the same way, so "the body disagrees with its pose" and "the body reproduces a wrong
  pose" can be told apart with numbers on both sides.

Regenerate everything with:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/proportions.py \
    -- OUTDIR public/assets/triassic/creatures/*.glb
```

### What the instrument does and does not do

- **The axis is measured, not assumed.** `preview-orientation.json`'s yaw is an estimate and the
  previews are normalised to one unit, so each body's long axis is taken as the cardinal glTF axis
  it is longest along, with the vertex cloud's principal component reported beside it. The two
  disagree by 19° on Nothosaurus (posed tail, flippers held out) and by 51° on Askeptosaurus
  (coiled tail): a fraction measured along a guessed axis would be nonsense.
  **Rhaeticosaurus had to be forced** (`--axis z`): its flipper span is longer than its body, so the
  bounding box's longest side is across the animal, not along it — which is itself a finding.
- **Widths come two ways.** `halfWidth` is measured from the body's midline; `localHalfWidth` from
  each slice's own centre. On a body posed into a curve only the second is thickness — the first is
  mostly the curve's displacement, and it will call a thread-thin tail the widest part of the animal.
- **Curved bodies are measured along themselves.** The polyline through the slice centroids gives
  the body's length along its own bend; the arc-to-straight ratio says how much to distrust a
  straight-axis fraction (1.00 Hupehsuchus, 1.73 Askeptosaurus).
- **A limb that trails backwards lies over the base of the tail**, so the thin run a slice table can
  call tail on its own begins behind the paddle, not at the hip. Keichousaurus measures 0.255 of the
  body by the first reading and about 0.40 by the second, and only the second is the animal's tail.
  Where the two differ the entry says so.
- **A standing land animal defeats the axial instrument.** Where the legs reach the ground, a slice
  through the shoulder runs from the foot to the top of the back, so neck and limb lengths on
  Macrocnemus and Coelophysis cannot be separated this way. Those are reported CANNOT TELL rather
  than guessed at.
- **Blender leaves a stray 42-vertex `Icosphere` of radius 1** behind when it imports the packaged,
  meshopt-compressed files. It is in neither file's node list; only meshes the glTF scene graph
  names are measured, or it would set the height of every animal thinner than two units.

Fractions run **nose = 1.0** or **nose = 0.0** depending on which way each body was built; each
entry says which, and the end was identified from a landmark (a jaw, an anchor, a named mesh), not
from an impression.

---

## Verdicts

| Subject | Verdict | The number |
| --- | --- | --- |
| **Shonisaurus** (shipped) | **WRONG** | dorsal fin 0.067 L tall at frac 0.51–0.59; caudal fluke 0.256 L deep with a 0.10 L ventral lobe — research says neither existed |
| **Nothosaurus** (shipped) | **WRONG** (settled) | visible neck 0.17 of 5.00 = 0.034 L against about 0.2 L |
| **Tanystropheus** | **WRONG** | neck 0.472 of the bent body; trunk 0.326; tail 0.157 against ≈0.55 / 0.17 / 0.25 |
| **Cymbospondylus** | **WRONG** | head 0.22–0.25 L against a documented 2 m skull on 17.65 m = 0.11 L |
| **Rhaeticosaurus** | **WRONG** | flipper span 1.00 L, each flipper ~0.36 L clear of the flank, against ~0.25 L |
| **Birgeria** | **WRONG** | two dorsal fins, the large one at frac 0.42–0.46, against "single dorsal set far back" |
| **Mixosaurus** | **WRONG** | caudal fin 0.284 L deep, deeply forked, two comparable lobes, against "not the post-Triassic lunate fluke" |
| **Helicoprion** | **WRONG** | whorl modelled outside the chin; research and its own pose put it inside the jaw |
| **Askeptosaurus** | **WRONG** | tail 0.49–0.54 against "about two-thirds"; no neck (body full width within 0.06 of the snout) against 13 elongate cervicals |
| Atopodentatus | OK | T-bar 0.208 L across and only 0.050 L deep; present and reading |
| Hybodus | OK | two spined dorsals at frac 0.29 and 0.46, heterocercal tail |
| Saurichthys | OK | rostrum 0.17 L, opposed dorsal/anal at frac 0.76–0.82, trunk 0.12 L deep |
| Hupehsuchus | OK | dorsal plate ridge frac 0.15–0.85, head+neck 0.34 L, body 0.156 L deep |
| Cartorhynchus | OK | snout 0.10 L on a body 0.425 L deep |
| Henodus | OK | carapace 0.49 L wide × 0.42 L long — wider than long, as documented |
| Odontochelys | OK | tail 0.214 of the bent body; no fused shell in the silhouette |
| Keichousaurus | OK | head 0.125 L, neck 0.179 of the bent body, tail ~0.40 L from the hip |
| Placodus | OK (noted) | trunk 0.29–0.36 L deep, tail 0.34 L and laterally flattened |
| Dinocephalosaurus | OK by design | neck stub 0.20 L — the neck is built procedurally and the paperwork asks for a stub |
| Coelophysis | OK | slender, long tail, small forelimbs; a shore visitor only |
| Ceratites | CANNOT TELL | shell 0.68 of total with nodes, but evolute-vs-involute is coiling, not silhouette |
| Phragmoteuthis | CANNOT TELL | the diagnostic (pro-ostracum, internal shell) is internal; arms and mantle read |
| Macrocnemus | CANNOT TELL | standing pose; the axial instrument cannot separate neck and limb from body |

---

## The WRONG ones, ranked by how much they show in play

A Triassic animal is seen swimming, in side and three-quarter view, at a distance. A silhouette
error is worth far more than a detail inside a mouth.

### 1. Shonisaurus — a dorsal fin and a crescent fluke the animal did not have

**Shipped, rigged, playable.** This is the audit's Nothosaurus.

Measured off `public/assets/triassic/creatures/nothosaurus.glb`'s sibling
`shonisaurus.glb` (length 6.000 along glTF −z, nose at frac 0, confirmed by `anchor_mouth` at frac
0.0225):

- **Dorsal fin.** The rig carries a bone called **`dorsal`**. At frac 0.512–0.562 the body's dorsal
  surface jumps from 0.70 to 1.099 while the ventral surface holds at −0.6: a fin standing **0.40
  units above the back on a 6.00 body, 0.067 L**.
- **Caudal fluke.** The tail stock at frac 0.812 spans 0.371–0.695 (centre ≈ 0.53). The last slice
  spans **−0.076 to 1.456**: a fluke **1.533 units deep, 0.256 L**, with an upper lobe of 0.93 and a
  **ventral lobe of 0.61 units (0.10 L)** — a deep, near-symmetric crescent.
- Trunk depth 1.425 units = **0.238 L**, flipper span 3.807 = 0.634 L.

[`research.md`](research.md) on *Shonisaurus popularis*: "Long, narrow flippers; long tail
**without the crescent fluke of Jurassic forms, no dorsal fin evidence**." The board
([`boards/shonisaurus.md`](boards/shonisaurus.md)) asks for the "Slim Kosch body; deep chest;
toothed jaw" and says nothing about a fin.

**Where it went wrong:** `docs/triassic/canonical/shonisaurus.png` draws both — a triangular dorsal
fin on the back and a crescent tail. The body reproduces its pose faithfully. **This has to go back
to the canonical pose** and a fresh greenlight, exactly as the Nothosaurus neck does. A brief would
state: **no dorsal fin at all; the caudal a long, low tail with at most a shallow dorsal lobe and no
ventral lobe — the tail's total depth under 0.10 L, not 0.26 L.**

Why it ranks first: it is a rung-IV giant, it is on the roster now, and a dorsal fin and a tail
shape are the two things you can still see of a whale-sized animal at a hundred units.

### 2. Tanystropheus — the neck is still short, and the trunk has eaten the tail

Preview, length 1.000 along glTF +x, bent path 1.304× the straight axis. Nose at frac 1.0 (the head
crop shows an open jaw at that end; the tail end is a smooth tapering curl).

| region | of the straight axis | of the bent body |
| --- | --- | --- |
| head | 0.050 | 0.045 |
| **neck** | 0.420 | **0.472** |
| trunk | 0.370 | 0.326 |
| tail | 0.160 | 0.157 |

[`research.md`](research.md): "**Neck ≈ trunk + tail combined**, so ~3 m on the big species" — on a
5.25 m *T. hydroides* that is a neck of 0.55 of the animal, a trunk near 0.17 and a tail near 0.25.
Measured, the neck (0.472) is **shorter** than trunk + tail + head (0.528), the trunk is **twice**
what it should be and the tail is **five-eighths** of it.

**Where it went wrong:** not the pose. The canonical was already redrawn for exactly this
(`prompts-2026-09-13-tanystropheus-candidate05.json`, greenlit 19:15Z on 13 September), and the
corrected model input was measured here with `pose-proportions.py` on the orthogonal side panel of
`canonical/model-inputs/tanystropheus/turnaround.png`: **head + neck 0.59, trunk 0.30, tail 0.115**.
The mesh lost 0.07 of body length off the neck and put it into the trunk. **Fixable downstream —
regenerate from the corrected input** (and the rig's 13 cervicals are in the plan already). If the
generation cannot hold it, the redraw brief needs: **neck alone ≥ 0.50 of total length, trunk ≤ 0.20,
tail ≥ 0.25** — note the pose's own tail (0.115) is short too and should be fixed at the same time.

### 3. Rhaeticosaurus — flippers that span more than the animal is long

Preview, forced to `--axis z` because **the bounding box's longest side is across the animal**: the
body is 0.998 long and the **flipper span is 1.002 — the span exceeds the body length**. Nose at
frac 0.

- head + neck 0.28 L, trunk 0.48 L, tail 0.24 L — a pliosaurid-grade short neck, which is right.
- Trunk half-width 0.143 → body 0.29 L wide. Flipper tip at half-width 0.500, so **each flipper
  stands ~0.36 L clear of the flank**, a limb of roughly 0.40 L.

The research gives a 237 cm animal with "four hydrofoil flippers with hyperphalangy"; a plesiosaur
forelimb runs about **0.25 of body length**, which puts the span near 0.75 L, not 1.00 L.

**Where it went wrong:** the pose. `canonical/rhaeticosaurus.png` already draws flippers about 0.4
of body length. **Back to the canonical pose.** Target for a brief: **fore- and hind-flipper each
about 0.25 L, total span about 0.75 L**, with the hind pair slightly the larger, and the barrel
trunk kept.

### 4. Birgeria — two dorsal fins, and the big one amidships

Preview, length 1.000 along glTF −x, nose at frac 0, body 0.631 L deep (fins included).

- A large dorsal fin peaking at **frac 0.42–0.46** (dorsal surface 0.146 → 0.190 against a back line
  of about 0.10).
- A **second** dorsal at **frac 0.66–0.71** (surface 0.119 → 0.160), with the caudal peduncle behind
  it at 0.74–0.81 (height 0.07–0.10) and the forked caudal from 0.84.

[`research.md`](research.md): "forked, deeply cleft caudal fin; **single dorsal set far back**".
Measured, there are two, and the principal one is at mid-body.

**Where it went wrong:** the pose. `canonical/birgeria.png` shows the same arrangement — a large
mid-body dorsal with smaller finlets behind it, a tuna template rather than the fish. **Back to the
canonical pose.** Target: **one dorsal fin, its leading edge no further forward than 0.65 of body
length, no finlets**; keep the naked skin, the big head and the deep fork.

### 5. Mixosaurus — a Jurassic fluke on a Triassic tail

Preview, length 1.000 along glTF +z, nose at frac 0.

- The caudal fin's total depth is **0.284 L** at the last slice, deeply forked, with two lobes of
  comparable size (the terminal slice spans 0.011–0.295 about a tail stock lying near 0.14–0.20).
- The dorsal fin is present at frac 0.29–0.41 (0.44–0.46 L tall with the flippers in the same
  slices) — correct, and the oldest dorsal fin in any amniote is the animal's headline.

[`research.md`](research.md): "Caudal fin with a well-developed triangular dorsal lobe of connective
tissue over a long, low tail — **not the post-Triassic lunate fluke**."

**Where it went wrong:** partly the pose (`canonical/mixosaurus.png` draws a large upper lobe with a
smaller ventral one), and the mesh has gone further and made the two lobes near-equal. **The pose
needs restating and the body regenerating.** Target: **ventral lobe no more than a third of the
dorsal lobe; total caudal depth about 0.15 L**, the tail otherwise long and low.

### 6. Askeptosaurus — the tail is short and there is no neck

Preview, length 1.000 along glTF −z; **bent path 1.729×** the straight axis, the most strongly posed
body in the set, so every straight-axis fraction here is a floor. Nose at frac 0.

- Snout to full body width in **0.06 of the length** (local half-width 0.055 at frac 0.013, 0.505 at
  frac 0.113): the head sits straight on the trunk.
- Tail from frac 0.46: **0.54 of the straight axis, 0.493 of the bent body**. It is genuinely
  laterally compressed — 0.024 L wide against 0.05 L deep, a blade twice as deep as it is wide —
  which is right.

[`research.md`](research.md): "**Elongate neck (13 cervicals)**, 25 dorsals, **60+ caudals** — a very
long, laterally compressed tail." [`boards/askeptosaurus.md`](boards/askeptosaurus.md): "a laterally
compressed tail **about two-thirds of body length**."

**Where it went wrong:** the pose draws the long tail correctly (`canonical/askeptosaurus.png` — it
sweeps right across the frame and back), but it sets the head close on the trunk in the same way the
mesh does. **The tail is fixable downstream** — regenerate and hold it at two-thirds — **but the
missing neck goes back to the pose.** Target: **tail 0.63–0.66
of total length; a neck of 13 cervicals reading as about 0.12–0.15 L between skull and shoulder.**

### 7. Cymbospondylus — the first giant has a head twice the size it should have

Preview, length 1.000 along glTF +z, nose at frac 0.

- The head runs to the pectoral girdle at about **frac 0.22–0.25** (slice heights stay under 0.12
  through frac 0.237; the flippers begin at 0.263).
- Tail 0.31 of the length behind the pelvic flippers; **no dorsal fin** (correct); the caudal is a
  low fin 0.098 L deep at the terminal slices (correct — "a long tail with a low fin, no lunate
  fluke").

[`research.md`](research.md) gives *C. youngorum* a **2 m skull on a ~17.65 m body — 0.11 of the
animal** — with an "elongate trunk with a long, weakly differentiated tail" and "basal, 'primitive'
body plan (eel-like proportions)".

**Where it went wrong:** the pose. `canonical/cymbospondylus.png` is a three-quarter view with the
head towards the camera, which is the classic way a correct drawing becomes an incorrect model — the
nearest thing in the frame is the thing the generator scales to. **Back to the pose, drawn side-on.**
Target: **skull 0.11–0.13 of total length; trunk and tail long enough to carry the remaining 0.87.**

### 8. Helicoprion — the pizza cutter the research explicitly rejects

Preview, length 1.000 along glTF −z, nose at frac 0.

The whorl is modelled as a **toothed disc projecting outside and below the chin** at frac
0.04–0.11, its serrations visible all the way round its exposed arc — a separate lobe of the
silhouette hanging below the jaw line, in a body whose ventral surface is otherwise smooth from the
snout back. The design says: "The whorl sits inside the lower jaw with only its
front arc exposed; **the classic 'pizza cutter on the chin' is wrong**."

Also, both the mesh and the pose carry **pelvic and anal fins**, where the body plan the design
specifies is *Fadenia*'s: "fusiform, a lunate tail, **no pelvic fins**".

**Where it went wrong:** the whorl is the *mesh*, not the pose — `canonical/helicoprion.png` draws
it correctly, coiled inside an open mouth. **Fixable downstream: regenerate, or model the jaw.** The
pelvic fins are in the pose and would need a redraw if they are to go.

*Helicoprion's builder directory is being worked on by another session; nothing here was touched.*

### Nothosaurus — already settled

Re-derived independently and confirmed, from the delivered file: length 5.000 along glTF −z; the
`skull` bone's head at glTF z +1.775 (frac 0.145) and the lower-jaw mesh beginning at exactly the
same z; the last of the shoulder mass at z +1.5625 (half-width 1.474, flippers out) and the first
narrow slice at z +1.688 (half-width 0.323). **Visible neck ≈ 0.17 of a 5.00 body**, a thirtieth of
the animal, against about a fifth on a nothosaur skeletal.
See [`tools/triassic/creatures/nothosaurus/README.md`](../../tools/triassic/creatures/nothosaurus/README.md),
"The neck". Route: back to the canonical pose.

---

## The rest, with their numbers

**Atopodentatus** — 1.000 along glTF −x, hammer end at frac 0. The T-bar is there and measurable: at
frac 0.013–0.037 the body is **0.208 L wide and only 0.050 L deep**, a flat transverse plate, and
behind it the snout narrows to 0.112 L wide before the trunk, paddles included, reaches 0.572 L
across at frac 0.31. Short neck, tail 0.36 L. Matches "skull a hammerhead: premaxillae and dentaries expanded sideways into a
broad T-shaped bar" and "long body, short neck". **OK.**

**Saurichthys** — 1.000 along glTF −z, rostrum at frac 0, arc 1.006× (the straightest body in the
set). Rostrum with its jaw slit **0.17 L**; trunk 0.12–0.13 L deep and 0.13 L wide — needle-bodied;
**dorsal and anal fins opposed at frac 0.76–0.82** and a near-symmetric caudal from 0.94. Matches
"dorsal and anal fins set far back, opposite each other, forming a rudder with the symmetrical
caudal fin". **OK.**

**Hybodus** — 1.000 along glTF +z. **Two dorsal fins, each with a serrated leading spine**, at frac
0.29 and 0.46; heterocercal tail; pectoral, pelvic and anal fins. Matches "two dorsal fins each
fronted by a stout spine with longitudinal ridges and a double row of posterior denticles" and
"heterocercal tail". **OK.**

**Hupehsuchus** — 1.000 along glTF +z, arc 0.995× (straight), snout at frac 1.0 (the larger paddle
pair, the forelimbs, sits at frac 0.61–0.66). The **dorsal osteoderm ridge runs frac 0.15–0.85** as a
row of bumps in the silhouette. Head + neck 0.34 L, trunk 0.156 L deep and 0.18 L wide, tail tapering
to a point. Matches "rows of dorsal osteoderm plates", "elongate neck and comparatively small head".
The trunk is marginally wider than deep where the fossils suggest a deep narrow rib cage, which is
too fine a call for a silhouette. **OK.**

**Cartorhynchus** — 1.000 along glTF +z, snout at frac 0. **Snout 0.10 L**, and through frac
0.19–0.26 the body with its flippers stands 0.40 L deep and 0.59 L across (thick and blunt, as a
pachyostotic body should be), tail 0.24 L. Matches "very short
snout (about half skull length)", "thick, pachyostotic ribs", "short trunk, few vertebrae". **OK.**

**Henodus** — 1.000 along glTF −x, head at frac 0. The carapace runs **frac 0.167–0.583 (0.42 L long)
and 0.49 L wide: wider than long, ratio 1.17**, exactly as documented ("a carapace wider than long").
Whole body only 0.245 L deep. The outline is a rounded oval rather than the documented *square*,
and the rostrum's denticulate fringe is not in the silhouette; both are shape and surface, not
proportion. **OK.**

**Odontochelys** — 1.000 along glTF +z, arc 1.210×, head at frac 0. Head + neck 0.10 of the bent
body, trunk 0.68, **tail 0.214**. The documented "long tail (longer than any later turtle)" is a
comparison, not a ratio, and 0.21 clears any later turtle comfortably; the pose's own tail reads
longer, so a regeneration would gain a little. No fused carapace can be confirmed or denied from a
silhouette — the broadened ribs are a surface, and the pose carries them as bands. **OK.**

**Keichousaurus** — 1.000 along glTF +z, head at frac 0. **Head 0.125 L** (0.02–0.04 L wide — tiny),
**neck 0.15 L straight / 0.179 of the bent body** (0.027–0.048 L wide, 0.07–0.11 L deep: slender),
trunk with the forelimbs at frac 0.29–0.39 (0.57 L across), hindlimbs attaching at about frac 0.57
and trailing back to 0.70, **tail from the hip at about 0.40 L** — of which only the run behind the
hind paddle, frac 0.725–1.0, is thin enough to measure as tail on its own (0.255 of the bent body).
The research's own figures — snout-vent 16.1 cm against a maximum total near 30 cm — imply a tail of
**0.43–0.46** of the animal, which the hip-to-tip measurement meets and the thin-run measurement
does not; this is the limb-contamination case the method warns about, and the generous reading is
the right one here because the paddle demonstrably overlies the tail base. Matches "tiny head, long
serpentine neck, long tail; lizard-like proportions". **OK.**

**Placodus** — 1.000 along glTF −x, head at frac 0. Trunk **0.29–0.36 L deep** and 0.34–0.40 L wide
(a genuinely barrel body, if a humped one), **tail 0.34 L and laterally flattened** (local half-width
0.04–0.06 against heights of 0.05–0.13). Matches "stocky trunk, long tail" and "laterally flattened
tail"; the trunk is deeper than most skeletal reconstructions would draw it, which is worth a look
but is not a contradiction. *Its builder directory is being worked on by another session; nothing
here was touched.* **OK, noted.**

**Dinocephalosaurus** — 1.000 along glTF −x, head at frac 0. Head 0.07 L, **neck stub 0.20 L**, trunk
to frac 0.71, tail 0.29 L. The paperwork asks for exactly this: "The neck is built procedurally;
images of head and trunk with **a short neck stub**" ([`03-image-and-model-requests.md`](03-image-and-model-requests.md),
T04). The documented neck is 2.3 m of a ~5–6 m animal — **0.38–0.46 of the whole animal, more than
twice the trunk** — and none of that is in this mesh or should be. The stub is present and is a
fifth of the preview's length. **OK by design**, with the note that the preview's fractions are not
the animal's and must not be read as if they were; what needs checking, when the neck is built, is
that the procedural chain delivers 32 joints and a neck longer than trunk plus tail.

**Coelophysis** — 1.000 along glTF −z, standing. Slender, long tail, small forelimbs, long
hindlimbs; the axial instrument cannot separate limb from body in a standing pose, so the
proportions quoted would be the silhouette's and not the animal's. The design asks only for
"slender theropod proportions and a drinking stance; optional shore visitor only", and the body is
slender (0.343 L wide overall). **OK.**

**Ceratites** — 1.000 along glTF −z. Shell 0.68 of the total span with **nodes around the venter**
(the bumps are in the silhouette), soft body and arms making up the rest. The documented diagnostic
is the **ceratitic suture** (a surface) and an **evolute** coil (whether the whorls overlap), and
neither can be read off a cross-section table or a silhouette. **CANNOT TELL** on the coiling; the
nodes and the discoidal shell are right.

**Phragmoteuthis** — 1.000 along glTF −x, arc 1.005×. Mantle about 0.41 L with a pointed rostrum at
the rear, arms and hooks at the front, body 0.256 L deep and 0.288 L wide. Its documented diagnostic
— "a broad three-lobed pro-ostracum extending beyond the phragmocone" — is an **internal** shell and
cannot be audited from the outside. **CANNOT TELL**, and no external proportion contradicts anything.

**Macrocnemus** — 1.000 along glTF −z, standing, head at frac 0, arc 1.279×. Documented: "small head
on a slender but not hyper-long neck; **very long hindlimbs**; long tail (52–53 caudals)". The tail
is long (the thin run begins by frac 0.53 and the hips sit near 0.31–0.35, so the tail is roughly
0.65 of the straight axis and more of the bent body) and the hindlimbs are visibly long. But at
every station from the shoulder to the hip the slice runs from the foot to the top of the back, so
**neck length and limb length cannot be separated from body depth** by this instrument, and a
number for either would be invented. **CANNOT TELL** — it needs measuring against a side-on pose
sheet, the way Tanystropheus was.

---

## Caveats

- Twenty-one of these bodies are **raw Tripo previews**: no rig, no anchors, normalised to one unit,
  and due to be thrown away the day each animal's real body ships. Where a preview is wrong, the
  finding is about the *pipeline input* — the pose, or the generation — not about a shipped asset.
- Where this report cites a published proportion not stated as a ratio in [`research.md`](research.md)
  (Cymbospondylus' skull fraction, plesiosaur flipper length, Tanystropheus' trunk and tail), the
  number is derived from the length figures the research does give, and is marked as such in the
  entry. Those are the weaker half of each finding; the stronger half is always a sentence in
  `research.md` or a board's "anatomy that must read".
- Three bodies are posed into curves severe enough (Askeptosaurus 1.73×, Tanystropheus 1.30×,
  Macrocnemus 1.28×) that their straight-axis fractions understate the curved part. The bent-path
  fractions are given for those and are the ones to quote.
- Nothing in the report was decided from a render alone. The silhouettes are in the tool's output
  and can be regenerated in about two seconds per animal.
