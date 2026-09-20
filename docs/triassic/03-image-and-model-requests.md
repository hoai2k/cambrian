# 03 · Image and model requests

## Delivery checkpoint — 2026-09-13

The 18 human-greenlit creatures now each have a dedicated single-model input and a qualitative four-view sheet under `canonical/model-inputs/<id>/`, derived from the approved pose. These sheets are visual guides; perspective drift is documented in each metadata file rather than treated as measured orthographic precision. Six replacement `candidate02` poses are available in the reference viewer and await human greenlight.

Nothosaurus and Shonisaurus now ship authored Tripo bodies plus procedural volume twins with **identical skeletons, inverse binds, action samples and anchors within each pair**. The puppet also supplies LOD1. Both pairs are registered in the game and viewer, with model-rendered portraits replacing their placeholders, and remain preview models pending human visual approval. See [delivery state](IMAGE-MODEL-HANDOFF.md), [Nothosaurus pipeline](../../tools/triassic/creatures/nothosaurus/README.md), and [Shonisaurus pipeline](../../tools/triassic/creatures/shonisaurus/README.md). Raw Tripo tests are preserved in `tools/triassic/creatures/<id>/tripo-raw/`. The request tables below remain the broader roster specification, not a claim that every listed deliverable is still missing.

**Plant and prop canonicals are delivered for review.** Fourteen original B2 subjects now have
square canonical images in the reference viewer. Their separate multi-view request was withdrawn:
once a pose is greenlit, its deterministic builder parameters and `npm run shapes` measurements are
the modeling constraints. The four Tier 1 scenery subjects still need four-view Tripo sheets.

**Status:** open requests, 12 September 2026. Everything the Triassic needs that does not exist,
in two tiers by who makes it, and in two passes by what it is: **source images** first (reference
boards and the orthographic views Tripo is fed), **3D models** second, each model request
standing against the images it is generated from and blocked until they are delivered. Nothing is
requested twice: the model rows point at their image rows. This page follows the rules of
[`docs/image-requests.md`](../image-requests.md) (destination path, dimensions, brief, what it
replaces; WebP for paintings, SVG for marks, PNG for transparency; props as one-mesh GLBs with a
base pivot) and, when the era is built, its open rows move there and its delivered rows to the
history file.

**Tier 1** is what goes through Tripo, following [04](04-tripo-pipeline.md): every creature, the
shore animals, and the handful of scenery pieces whose value is a convincing organic surface.
**Tier 2** is what is built in-house: procedural instanced plants, shells and rocks by builder
script, paintings and glyphs by the image tool, portraits rendered from the models.

## A · Source images

### A1 · Reference boards (Tier 2, in-house, before anything else)

One per creature and shore animal, `docs/triassic/boards/<id>.md`: skeletal and life
reconstructions from the sources in [research.md](research.md), specimen images with credits, the
representative length and its source, the anatomy that must be right (listed per subject in
[01](01-triassic-design.md)), and the uncertainty labels. Multi-panel; the panels are not separate
files. **All twenty-five boards are delivered** at `docs/triassic/boards/`: T01–T21, S01–S04.

### A2 · Tripo source views (Tier 1 inputs, generated in-house)

**Canonical first.** Each subject gets one approved pose — silhouette, species-defining anatomy,
the whole tail, every limb or fin — and the four-view sheet is generated *from that image*, never
from prose, so the four views agree with each other and with a picture somebody has actually
approved. **The 26 canonical poses are delivered** and live in
[`docs/triassic/canonical/`](canonical/README.md); `manifest.json` there tracks which subjects have
gone on to a turnaround. None have yet, so A2 below is the open half of this request.

For each Tier 1 subject, four images at 2048×2048, PNG, on a pale neutral studio grey, neutral
light, no cast shadow, no text: **left side**, **top**, **front** (orthographic) and
**three-quarter** (the view the portrait will use). Mouth closed; limbs in the rig's rest pose
(flippers half spread, neck straight, tail straight); the animal alone, and the same animal as its
canonical pose. Delivered through `intake/triassic/<id>/` and landed beside the pose. The
cross-check before a generation: the top view's width and the side view's height must agree at
every station within a tenth, or the body Tripo makes from them will be warped.

| Subject | Views | Notes for the images |
| --- | --- | --- |
| T01 Cymbospondylus youngorum | 4 | Long and low; low tail fin, no dorsal fin; small eye; the full tooth row visible at the lip. |
| T02 Shonisaurus popularis | 4 + calf side | Slim Kosch body, deep chest; toothed jaw. A fifth image: the calf beside the adult, for scale. |
| T03 Nothosaurus giganteus | 4 | Interlocking fangs showing with the mouth shut; wing-shaped humeri under the skin; webbed feet with digits. |
| T04 Dinocephalosaurus orientalis | 4 (head and trunk only) | The neck is built procedurally; images of head and trunk with a short neck stub. A sixth image, side view of the whole animal, for the profile table. |
| T05 Helicoprion | 4 | Fadenia-type body; the whorl inside the lower jaw with only its front arc exposed. If the relict label is refused, these are Fadenia images instead. |
| T06 Rhaeticosaurus mertensi | 4 | Pliosaurid grade: short neck, large head, four hydrofoils, barrel trunk, short tail. |
| T07 Atopodentatus unicus | 4 + open-mouth front | The T-bar; the chisels along its front edge and the needle mesh behind; the fifth image has the mouth open to show the sieve. |
| T08 Askeptosaurus italicus | 4 | Two-thirds tail, laterally compressed; small head, sharp teeth. |
| T09 Placodus gigas | 4 + ventral | Barrel body, procumbent incisors under a closed mouth; the fifth image is the belly, for the gastral basket. |
| T10 Hybodus | 4 | The two spined dorsals; male with cephalic hooks (the female is a scheme). |
| T11 Birgeria stensioei | 4 | Naked tuna body, big head, wide gape shut; forked tail. |
| T12 Aphaneramma rostratum | 4 | Gharial snout, flat skull, far-back eyes, no armour, newt limbs, a deep tail. |
| T13 Mixosaurus cornalianus | 4 | The dorsal fin and the tail's dorsal lobe; heterodont teeth. |
| T14 Henodus chelyops | 4 + ventral | Square; the mosaic of hundreds of plates; fringed lip; the plastron. |
| T15 Saurichthys | 4 | The three scale rows; fins far back and opposed; large eye. |
| T16 Hupehsuchus nanchangensis | 4 | Dorsal plate rows; toothless snout; gastral basket; the pouch is built in Blender. |
| T17 Keichousaurus hui | 4 × 2 | Male and female builds (the male's limbs more robust); tiny head, broad flat ulna. |
| T18 Cartorhynchus lenticarpus | 4 | Short snout, thick ribs, bendable flipper-wrists. |
| T19 Odontochelys semitestacea | 4 + ventral | Toothed, no carapace, broadened ribs as ridges, long tail; the plastron. |
| T20 Ceratites nodosus | 4 | Ribbed, noded, evolute shell; nautilus-like soft body; the aptychus. |
| T21 Phragmoteuthis bisinuata | 4 | A squid with a rigid internal shell; paired hooks along the arms. |
| S01 Tanystropheus hydroides | 4 full-animal views + whole side | The complete extraordinarily long neck must be present in the model input and every turnaround view; Blender rigs it with 13 joints and adds cervical-rib ridges without replacing or shortening the approved silhouette. Head with the high nostrils and fang trap. |
| S02 Mystriosuchus | 4 | Gharial snout with the nostril crest before the eyes; osteoderm rows; the tail half the body. |
| S03 Macrocnemus bassanii | 4 | Long hindlimbs, a runner's stance. |
| S04 Coelophysis (optional) | 4 | A 3 m theropod at a drinking stance. |

Twenty-five subjects, 26 bodies (two Keichousaurus), 112 images.

### A3 · Scenery source views (Tier 1 inputs)

Three views each (side, top, three-quarter), same conventions, for the organic scenery Tripo
makes: `intake/triassic/scenery/<id>/`.

**Delivered.** Each of the four subjects has its canonical image plus dedicated `-side`, `-top`,
and `-turnaround` PNGs under `docs/triassic/canonical/` (twelve derived source views total).

| Subject | Notes |
| --- | --- |
| `log-raft` | A drift trunk at the surface; the crinoid colony is built procedurally and hung from it, so the images are the log alone, waterline marked. |
| `coral-head` | A massive scleractinian head, Dachstein type. |
| `sponge-mound` | A Tubiphytes and sponge crust mound with visible chambers. |
| `voltzia` | The shore conifer, three sizes; drooping shoots, cone clusters. |

### A5 · Canonical poses for plants and props (Tier 2, in-house)

**Delivered for human review on 13 September 2026.** The era's rule is that art is greenlit before it is built from: every subject gets one approved
canonical pose, and the modelling sheet and the shipped body are derived from that one image
(`CLAUDE.md`, [`canonical/README.md`](../triassic/canonical/README.md)). The original gap was that
the nineteen B2 prop and plant kinds were specified in prose alone. Fourteen now have an authored
pose beside their external references; the three already-built families and the two explicit mesh
reuse cases need no retroactive pose. This removes the prose-only drift while keeping the human
greenlight between generation and modeling.

Deliver per subject, in this order, the same way the creatures went:

1. **Canonical pose** — one image, `docs/triassic/canonical/<id>.png`, 2048×2048 PNG on the
   modelling-sheet background, the whole organism with nothing cropped: the holdfast or base where
   it meets the seabed, the full stem or wall, and the crown or margin. Side-on unless the subject
   reads better from three-quarters (`daonella-bed`, `placunopsis-mound` and the rock slots are
   plan-view subjects). Generated as candidates into the reference viewer, chosen by a human there,
   and applied with `node tools/triassic/apply-selections.mjs <file>` — the same three decisions the
   creatures had (greenlight ours, redraw ours, regenerate toward a reference that beat it).
2. **Tier 2 modeling source** — the approved canonical pose is sufficient for deterministic
   builder-script props. Orthogonal dimensions and variants are parameters recorded by the builder
   and verified by `npm run shapes`; separate generated multi-view sheets were withdrawn by the
   human reviewer on 13 September 2026 because they would add perspective drift without adding
   useful constraints. Tier 1 Tripo scenery still needs its four-view input sheet.

| Subjects | Canonical pose | Model-input sheet |
| --- | --- | --- |
| The 14 original B2 canonical subjects: `encrinus`, `encrinus-litter`, `diplopora`, `thecosmilia`, `calcisponge`, `placunopsis-mound`, `daonella-bed`, `brachiopod-cluster`, `cidaris`, `reef-block`, `neocalamites`, `pleuromeia`, `bjuvia`, `shore-boulder` | **Delivered as first-pass canonicals; awaiting human greenlight in the viewer.** | **Not requested.** The approved canonical plus builder parameters is sufficient. |
| The 3 built B2 kinds: `stromatolite`, `salt-crust`, `mud-ripple` | Not requested retroactively. | Not requested retroactively. |
| The 4 Tier 1 scenery: `log-raft`, `coral-head`, `sponge-mound`, `voltzia` | **Delivered** (A3), approved through `scenery-prompts.json` rather than the viewer. | **Delivered 19 September 2026.** The already-authored four-panel turnarounds are packaged with canonical and single-image inputs under `canonical/model-inputs/`; no regeneration was needed, avoiding visual drift from the approved scenery. |

`ceratite-drift` stays blocked on the `ceratites` model as B2 says: it is that shell reused, so it
takes the animal's canonical pose and needs no pose of its own — only the half-buried placement
note. `drift-log` is the Devonian `submerged-log` re-pivoted and likewise needs no new pose.

### A4 · Paintings, glyphs and plates (Tier 2, in-house)

| File | Size | Brief | Status |
| --- | --- | --- | --- |
| `public/assets/triassic/biomes/<biome>.webp` × 9 | 1600×900 | The nine biome banners of [02](02-biomes-and-depth.md#the-nine-slots): the red shore, the milk-turquoise flats, the log rafts over the black basin. Text-free. Prompts kept in `tools/triassic/environment-image-prompts.json`. | **Delivered and wired.** |
| `public/assets/triassic/brand/keyart.webp` + mobile | 2560×1440, 1080×1920 | Low angle from below the surface: a Keichousaurus crowd in the Conifer Shore, the sun through the surface, and the boom of a Tanystropheus neck coming down out of the light. Upper third quiet for the wordmark. | **Delivered and wired.** |
| `public/assets/triassic/brand/logo-triassic.{svg,png}` | as the other eras | The era wordmark in the trilogy's lettering. | **Delivered**, as the engraved set (`logo-engraved.webp`, `logo.svg`), which every era's own title screen and every cross-era link now uses. |
| `public/assets/ui/shore-reach.svg` | 64×64 | The hatched arc the radar draws inside a shore animal's reach. | **Delivered.** |
| **`public/assets/ui/air-recovery-off.svg`** | 64×64, `currentColor`, square | The stamina bar's *recovery off* mark, shown on the bar the whole time an air-breather is under water: the era's one new economy is that the bar does not refill down here, and nothing on screen currently says so. A struck-through or barred breath glyph reading at 16 px, in the line of `breath-empty.svg` / `breath-low.svg` so the three sit together. | **Delivered.** Shared SVG is ready for the HUD. |
| **`public/assets/ui/air-surface.svg`** | 64×64, `currentColor`, square | Its partner: *surface for air*, an arrow up shown on an empty bar, the prompt that the fix is the surface rather than waiting. Same weight and optical size as above. | **Delivered.** |
| Regional boards × 9 | multi-panel | One per biome, art direction with the localities labelled, as `docs/devonian/supporting-assets.md` describes. Not evidence that the pictured animals coexisted. | **Delivered** as PNG and editable SVG pairs at `public/assets/triassic/reference/regions/`. |
| Scale plates × 2 | multi-panel | Roster at true lengths; roster at game lengths under the 4.0·m^0.55 rule. | **Delivered** as PNG and editable SVG pairs at `public/assets/triassic/reference/scale/`. |
| **`public/assets/triassic/creatures/shonisaurus` texture re-bake** | replaces the shipped maps | The skin's baked maps carry triangular starburst faceting over the flank, belly and skull. It is the bake and not the mesh — the same geometry with the same vertex normals renders smooth untextured — so only the maps need redoing; the rig, the clips and the twin are unaffected. Nothosaurus' bake is clean and is the reference for what this should look like. | **Delivered and verified.** Original UV albedo restored pixel-for-pixel; restrained normal relief removes the starbursts, and an independent re-audit of the shipped GLB confirms both the faceting and the 286-face lip inversion are gone. See [the handoff](IMAGE-MODEL-HANDOFF.md). |
| **`public/assets/triassic/creatures/nothosaurus.puppet.png`** | as `shonisaurus.puppet.png` | A still of the procedural twin, matching the one Shonisaurus already has. The pair is the pipeline's verification step and the two animals should be presentable the same way — Shonisaurus has a twin render beside its body render, Nothosaurus has only the body. Same camera and framing as `nothosaurus.png`, so the two stills overlay. | **Delivered.** Same Idle pose, camera and 1200×900 framing as the authored render; reproducible with `render.py -- --decoded --puppet --portrait-only`. |
| Portraits × 25 subjects | studio, select 1600×1200, card, thumb | Rendered from the shipped models by the intake tooling; not commissioned. | **23 of 25 still placeholder.** Nothosaurus and Shonisaurus now carry real model-rendered portraits, which is the mechanism working: the rest are the canonical pose letterboxed onto each canvas by `tools/triassic/placeholder-portraits.mjs` — not cut-outs, because there is no model to cut around yet — and each is replaced the day its own model lands. Nothing needs commissioning. |

## B · 3D models

Every row is blocked on its images. Creatures and shore animals follow the step list in
[04](04-tripo-pipeline.md) and deliver the set in `docs/creature-intake.md` and the Devonian
production contract: `<id>.glb` under 25 MB, `<id>.lod1.glb` (the procedural twin), four
portraits, `<id>.json`, the builder and README under `tools/triassic/creatures/<id>/`. Props
follow the instanced-prop rules on the requests page.

### B1 · Tier 1 — through Tripo

#### Creatures (21)

| Id | Blocked on | Rig and clips beyond the contract set | Special |
| --- | --- | --- | --- |
| `cymbospondylus` | A2 T01 | Long spine chain, low fluke; jaw. `Grab` (held loop), `Breathe` (the surface blow; every air-breather needs it), `Dive`. | Mouth interior with the full tooth row; the exhaustion hold is `Grab` + `Dive`. |
| `shonisaurus` | A2 T02 | As above; `PodCall`. A calf model at 0.6 scale is the same rig, no separate build. | The deep chest; the calf as a stage, not a body. |
| `nothosaurus` | A2 T03 | Paddle chain for the forelimbs, a rowing `Crawl` on the bottom, `Swim` tail-driven, `Grab`, `Breathe`. | Two locomotion clips: row and burst. |
| `dinocephalosaurus` | A2 T04 | Procedural 32-joint neck; `NeckStrike`, `Periscope` (head up, body level), `Breathe`. | Neck built on the skeleton, stitched to the Tripo head and trunk. |
| `helicoprion` | A2 T05 | Whorl as a jaw-bone with a rotation channel; `WhorlSaw` (held loop with the whorl turning). | The whorl's rotation is a bone, so `apply.mjs` can drive it. |
| `rhaeticosaurus` | A2 T06 | Four flipper chains with a simultaneous stroke, `PowerStroke`, `Breach`, `Breathe`. | The flight loop is the model, as the medusa's pulse is: the renderer may scrub it to stroke phase. |
| `atopodentatus` | A2 T07 | Jaw with the bar; `Scrape` (loop, mouth open, sieve), `HammerSweep`, `Crawl` (bottom walk), `Breathe`. | Mouth interior with chisels and the needle mesh both. |
| `askeptosaurus` | A2 T08 | Long tail chain; `Coil`, `TailWhip`. | — |
| `placodus` | A2 T09 | `Crawl` (bottom walk), `Pry` (loop), `CrushBite`, `Breathe`. | Ventral armour as a separate rigid part. |
| `hybodus` | A2 T10 | `SpineBrace` (guard). Male hooks as a scheme-toggled part. | — |
| `birgeria` | A2 T11 | `RunThrough`, `Gulp`. | Wide gape; the mouth interior is most of the head. |
| `aphaneramma` | A2 T12 | `SideSwipe` (left and right), `Crawl`, `Breathe`. | — |
| `mixosaurus` | A2 T13 | Dorsal fin as a bone (it flexes); `ShoalDart`, `Breathe`. | — |
| `henodus` | A2 T14 | Shell rigid; `Comb` (loop), `Crawl`, `Breathe`. | Embedded albedo allowed for the plate mosaic. |
| `saurichthys` | A2 T15 | Stiff body, few spine joints; `AmbushSurge`, `Drift` (hang). | — |
| `hupehsuchus` | A2 T16 | Pouch as a blend-shaped throat; `Gulp` (pouch open), `Breathe`. | The pouch is Blender work, the one morph target on the roster. |
| `keichousaurus` | A2 T17 | Forelimb-driven `Swim`, `Crawl`, `KinScatter`, `Breathe`. Two schemes. | — |
| `cartorhynchus` | A2 T18 | Bending wrists as joints; `Crawl` (the strong bottom-walk), `SuctionSnap`, `Breathe`. | — |
| `odontochelys` | A2 T19 | Plastron rigid; `BellyTurn` (guard: the roll), `Crawl`, `Breathe`. | No beach clip: it hatches in the weed like everything else that lays. |
| `ceratites` | A2 T20 | Shell rigid, soft body; `Jet`, `Hover`, `Withdraw` (aptychus). | The same shell mesh, unlit, is the `ceratite-drift` prop. |
| `phragmoteuthis` | A2 T21 | Ten arm chains with hooks; `Grab` (held loop), `Ink`, `Jet`. | Ink is a particle; the clip is the mantle squeeze. |

#### Shore animals (3 + 1 optional)

| Id | Blocked on | Clips |
| --- | --- | --- |
| `tanystropheus` | A2 S01 (**approved full-neck pose and model inputs delivered**) | Procedural 13-joint neck rig with cervical-rib ridges. `Watch` (idle, head under the surface), `Lower` (telegraph), `SnapLeft`, `SnapRight`, `Drag`, `Retract`, `Severed` (body one-shot), `Flee`. **Spend the budget on the neck and head.** This animal strikes into the water from the bank, so the neck and head are nearly all a player ever sees; the torso, limbs and tail are usually out of frame behind the shoreline and can be comparatively simple. The full defining neck is present in every approved modeling image and must not be shortened during generation or rigging. |
| `mystriosuchus` | A2 S02 | `Float` (crest showing), `Lunge`, `Bite`, `SlideIn`, `Bask`. |
| `macrocnemus` | A2 S03 | `Stand`, `Run`, `Bolt`. |
| `coelophysis` (optional) | A2 S04 | `Drink`, `Snatch`, `Look`. |

#### Organic scenery (4)

| Id | Blocked on | Notes |
| --- | --- | --- |
| `log-raft` | A3 + A5 sheet | The Tripo log at the surface; the Traumatocrinus colony (root cirri at the log's ends, stems of differing length to eight units, ten-armed crowns) built procedurally under it; drifts on the current; grippable. Full and reduced. |
| `coral-head` | A3 + A5 sheet | One mesh, a collider footprint from `npm run shapes`. Sparse. |
| `sponge-mound` | A3 + A5 sheet | With an interior a rung I body can enter; footprint measured. |
| `voltzia` | A3 + A5 sheet | Three sizes, on the shore; no collider needed above the waterline beyond the trunk. |

### B2 · Tier 2 — built in-house

**Initial delivery, 12 September 2026:** six Blender-authored preview library models
cover both variants of `stromatolite`, `salt-crust`, and `mud-ripple`, with source
projects, renders, measured footprints and validation. See
[`tools/triassic/props/README.md`](../../tools/triassic/props/README.md).
**Placed 13 September 2026:** all three families are scattered at the densities this page's table
gives them and collided against their measured union envelopes. All other B2 rows remain unbuilt.

Instanced props by builder script (`tools/triassic/props/`), one mesh, base pivot, vertex colours,
a few hundred triangles, at the scale-1 sizes in [02](02-biomes-and-depth.md#props-and-plants-the-models-each-biome-needs);
`npm run shapes` for anything collided with, `npm run props` to audit.

| Id | Variants | Blocked on | Notes |
| --- | --- | --- | --- |
| `encrinus` | 3 (stem height) | A5 | Segmented stem, ten-armed crown that opens and closes in the shader. |
| `encrinus-litter` | 2 | A5 | Columnal and stem-length scatter. |
| `diplopora` | 2 | A5 | Calcified whorled tuft; sways. |
| `thecosmilia` | 3 | A5 | Phaceloid bush of parallel tubes. |
| `calcisponge` | 2 | A5 | Stacked-chamber column. |
| `stromatolite` | 2 | — | Layered dome. |
| `salt-crust` | 2 | — | Curled gypsum plate. |
| `placunopsis-mound` | 2 | A5 | Stacked-shell dome, a feeding station. |
| `daonella-bed` | 3 | A5 | Overlapping flat-clam slab, a feeding station. |
| `ceratite-drift` | 1 | B1 `ceratites` (no pose of its own) | The live shell's mesh, unlit and half-buried. |
| `brachiopod-cluster` | 1 | A5 | Coenothyris. |
| `cidaris` | 1 | A5 | Club-spined urchin. |
| `reef-block` | 4 | A5 | Angular margin breccia; the rock slot. |
| `mud-ripple` | 2 | — | Laminated black-mud plate with an ash band. |
| `drift-log` | 1 | — (re-pivot, no pose) | The Devonian `submerged-log` re-pivoted to float. |
| `neocalamites` | 2 | A5 | Jointed horsetail stand. |
| `pleuromeia` | 1 | A5 | Unbranched trunk, strap-leaf crown, one cone. |
| `bjuvia` | 1 | A5 | Cycad rosette. |
| `shore-boulder` | 3 | A5 | Red sandstone. |

Effects that are not meshes and are built with the renderer: the blow (spray and a foam ring at
the surface), the ink cloud, the ash fall in the basin, the surface underside with refracted sky,
and the sun through the surface in the flats. Sounds go on `docs/audio-requests.md` when the era
is built: the blow is the era's signature sample and needs a real recording, not a synthesis.

## Counts

| | Tier 1 (Tripo) | Tier 2 (in-house) |
| --- | --- | --- |
| Source images | 26 canonical poses **(delivered)** + 112 creature and shore-animal views + 12 scenery views **(delivered)** + 4 scenery model-input sheets **(A5, open)** | 25 reference boards **(delivered)**, 9 banners, 2 key art, 1 wordmark, 4 glyphs, 9 regional boards **(delivered)**, 2 scale plates **(delivered)**, 14 plant and prop canonical poses **(delivered for review)**; separate model-input sheets withdrawn |
| Models | 21 creatures, 3–4 shore animals, 4 scenery | 19 instanced prop kinds in 38 variants |
| Derived | 25 procedural twins as LODs | 100 portraits |

## Order

Boards first; then the source views and generations for the four animals that test the pipeline
hardest — Dinocephalosaurus (the procedural neck), Rhaeticosaurus (flight on a Tripo body),
Henodus (a rigid mosaic shell with a soft head), Ceratites (a shell and a soft body) — before the
other seventeen, so the step list in [04](04-tripo-pipeline.md) is proven on the hard cases. The
Tier 2 props can start at once; nothing blocks them, and the sea-lily garden and the flats are
playable stand-in biomes as soon as `encrinus`, `diplopora`, `stromatolite` and `daonella-bed`
exist.

## Blender correction delivered — Nothosaurus `Swim` and `Sprint`, 13 September 2026

**Delivered in Blender** through `tools/triassic/creatures/nothosaurus/build.py` and re-exported to
both the authored body and the procedural twin, which share the clips exactly. The diagnosis below
records the prior shipped GLB; the delivery measurements follow it.

**The complaint.** In play the animal reads as walking, or as swimming backwards.

**The cause is the limb sequence, not the tail.** The forelimbs row in *antiphase* — `fore_paddle_L`
is furthest aft at 0.13 of the cycle, `fore_paddle_R` at 0.67, half a cycle apart — while the hind
pair strokes *together* at 0.38. Left fore, then both hinds, then right fore is a trot: it is the
gait of something walking on a floor, and the eye reads it as one whether or not there is a floor.
The head then confirms it: the skull yaws at the stroke rate with the widest arc anywhere on the
front of the animal (lateral swing 0.100 units against the chest's 0.003), which is the head-sway of
a walking lizard rather than the steady head a swimmer holds.

**What the animal actually did.** Nothosaurs are reconstructed as **paraxial rowers driven by the
forelimbs**, with drag-based rowing rather than the lift-based underwater flight plesiosaurs later
evolved: the limb sweeps back broadside-on for the power stroke, then feathers edge-on and returns.
The decisive evidence for the sequence is trackway rather than anatomy — the Yunnan *Nothosaurus*
trackways (Zhang et al. 2014, *Nature Communications*) preserve **paired** forelimb impressions, so
the forelimbs rowed **bilaterally, together**. The hind limbs contribute little and trail. Trunk and
tail undulation is auxiliary: steering and a little thrust, not the engine.

**So:**

1. **Put the forelimbs in phase.** Both furthest aft at the same moment. This is the whole fix; the
   alternation is what makes it a gait.
2. **Make the stroke asymmetric in time.** Right now each paddle's fore-aft trace rises and falls
   evenly, so neither half reads as the push. Give the power sweep rearward the longer, broader half
   of the cycle with the paddle broadside, and the recovery the shorter half with it feathered
   edge-on. Without this the eye cannot tell which way the animal is pushing water, which is most of
   where "backwards" comes from.
3. **Quiet the head.** The skull should hold the line the shoulders hold; let the neck take the
   body's beat. The temporary renderer-side `steadyHead` correction was removed when the clips
   were fixed.
4. **Let the hind limbs trail.** They currently stroke as hard as the forelimbs and on their own
   rhythm; `hind_paddle_R` beats at four times the stroke rate against the left's two, which is a
   flutter rather than a stroke. Reduce them to a slow, mostly passive sweep in phase with the fore
   pair.
5. **Do not touch the tail.** It is already correct and it is the one part that is: amplitude grows
   cleanly from `tail_01` (0.015) to `tail_06` (0.398), and the wave lags rearward down the body.
   `Sprint` shares the same faults and the same fix.

**Delivered measurements.** In the packaged `Swim`, both fore paddles are furthest aft at 0.683 of
the cycle; in `Sprint`, both are aft at 0.667. The broadside power sweep occupies about 68% of the
cycle and the feathered recovery about 32%. Hind-paddle travel is below 65% of fore-paddle travel
and remains a secondary, trailing sweep. Skull lateral travel fell from 0.100/0.145 units to
0.006/0.009 in `Swim`/`Sprint`, without changing the tail-wave formula. The paired audit samples
both complete exports, asserts the gait measurements, and confirms exact rig, anchor and all
21-clip parity. Decoded top and three-quarter renders are retained in the paired review sheets.
