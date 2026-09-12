# 03 · Image and model requests

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
files. Twenty-five boards: T01–T21, S01–S04.

### A2 · Tripo source views (Tier 1 inputs, generated in-house from the boards)

For each Tier 1 subject, four images at 2048×2048, PNG, on a plain mid-grey ground, neutral light,
no cast shadow, no text: **left side**, **top**, **front** (orthographic) and **three-quarter**
(the view the portrait will use). Mouth closed; limbs in the rig's rest pose (flippers half
spread, neck straight, tail straight); the animal alone. Saved to
`intake/triassic/<id>/source-{side,top,front,threequarter}.png` with the prompt beside each in
`prompts.json`. The cross-check before a generation: the top view's width and the side view's
height must agree at every station within a tenth, or the body Tripo makes from them will be
warped.

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
| S01 Tanystropheus hydroides | 4 (head and trunk only) + whole side | As Dinocephalosaurus: the neck is procedural; head with the high nostrils and fang trap; the whole-animal side view for the profile. |
| S02 Mystriosuchus | 4 | Gharial snout with the nostril crest before the eyes; osteoderm rows; the tail half the body. |
| S03 Macrocnemus bassanii | 4 | Long hindlimbs, a runner's stance. |
| S04 Coelophysis (optional) | 4 | A 3 m theropod at a drinking stance. |

Twenty-five subjects, 26 bodies (two Keichousaurus), 112 images.

### A3 · Scenery source views (Tier 1 inputs)

Three views each (side, top, three-quarter), same conventions, for the organic scenery Tripo
makes: `intake/triassic/scenery/<id>/`.

| Subject | Notes |
| --- | --- |
| `log-raft` | A drift trunk at the surface; the crinoid colony is built procedurally and hung from it, so the images are the log alone, waterline marked. |
| `coral-head` | A massive scleractinian head, Dachstein type. |
| `sponge-mound` | A Tubiphytes and sponge crust mound with visible chambers. |
| `voltzia` | The shore conifer, three sizes; drooping shoots, cone clusters. |

### A4 · Paintings, glyphs and plates (Tier 2, in-house)

| File | Size | Brief | Replaces |
| --- | --- | --- | --- |
| `public/assets/triassic/biomes/<biome>.webp` × 9 | 1600×900 | The nine biome banners of [02](02-biomes-and-depth.md#the-nine-slots): the red shore, the milk-turquoise flats, the log rafts over the black basin. Text-free. Prompts kept in `tools/triassic/environment-image-prompts.json`. | The procedural banners the era would otherwise draw. |
| `public/assets/triassic/brand/keyart.webp` + mobile | 2560×1440, 1080×1920 | Low angle from below the surface: a Keichousaurus crowd in the Conifer Shore, the sun through the surface, and the boom of a Tanystropheus neck coming down out of the light. Upper third quiet for the wordmark. | Nothing; the era's title backdrop. |
| `public/assets/triassic/brand/logo-triassic.{svg,png}` | as the other eras | The era wordmark in the trilogy's lettering. | — |
| `public/assets/ui/breath-*.svg` × 3 | 64×64, currentColor | The breath ring's states: full, last quarter, empty (the blow). | The ring drawn procedurally in the HUD. |
| `public/assets/ui/shore-reach.svg` | 64×64 | The hatched arc the radar draws inside a shore animal's reach. | — |
| Regional boards × 9 | multi-panel | One per biome, art direction with the localities labelled, as `docs/devonian/supporting-assets.md` describes. Not evidence that the pictured animals coexisted. | — |
| Scale plates × 2 | multi-panel | Roster at true lengths; roster at game lengths under the 4.0·m^0.55 rule. | — |
| Portraits × 25 subjects | studio, select 1600×1200, card, thumb | Rendered from the shipped models by the intake tooling; not commissioned. | — |

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
| `cymbospondylus` | A2 T01 | Long spine chain, low fluke; jaw. `Grab` (held loop), `Breathe` (surface blow), `Dive`. | Mouth interior with the full tooth row; the drown-hold is `Grab` + `Dive`. |
| `shonisaurus` | A2 T02 | As above; `PodCall`. A calf model at 0.6 scale is the same rig, no separate build. | The deep chest; the calf as a stage, not a body. |
| `nothosaurus` | A2 T03 | Paddle chain for the forelimbs, a rowing `Crawl` on the bottom, `Swim` tail-driven, `HaulOut`, `Grab`, `Breathe`. | Two locomotion clips: row and burst. |
| `dinocephalosaurus` | A2 T04 | Procedural 32-joint neck; `NeckStrike`, `Periscope` (head up, body level), `Breathe`. | Neck built on the skeleton, stitched to the Tripo head and trunk. |
| `helicoprion` | A2 T05 | Whorl as a jaw-bone with a rotation channel; `WhorlSaw` (held loop with the whorl turning). | The whorl's rotation is a bone, so `apply.mjs` can drive it. |
| `rhaeticosaurus` | A2 T06 | Four flipper chains with a simultaneous stroke, `PowerStroke`, `Breach`, `Breathe`. | The flight loop is the model, as the medusa's pulse is: the renderer may scrub it to stroke phase. |
| `atopodentatus` | A2 T07 | Jaw with the bar; `Scrape` (loop, mouth open, sieve), `HammerSweep`, `Crawl` (bottom walk), `Breathe`. | Mouth interior with chisels and the needle mesh both. |
| `askeptosaurus` | A2 T08 | Long tail chain; `Coil`, `TailWhip`. | — |
| `placodus` | A2 T09 | `Crawl` (bottom walk), `Pry` (loop), `CrushBite`, `HaulOut`, `Breathe`. | Ventral armour as a separate rigid part. |
| `hybodus` | A2 T10 | `SpineBrace` (guard). Male hooks as a scheme-toggled part. | — |
| `birgeria` | A2 T11 | `RunThrough`, `Gulp`. | Wide gape; the mouth interior is most of the head. |
| `aphaneramma` | A2 T12 | `SideSwipe` (left and right), `HaulOut`, `Crawl`, `Breathe`. | — |
| `mixosaurus` | A2 T13 | Dorsal fin as a bone (it flexes); `ShoalDart`, `Breathe`. | — |
| `henodus` | A2 T14 | Shell rigid; `Comb` (loop), `Crawl`, `HaulOut`, `Breathe`. | Embedded albedo allowed for the plate mosaic. |
| `saurichthys` | A2 T15 | Stiff body, few spine joints; `AmbushSurge`, `Drift` (hang). | — |
| `hupehsuchus` | A2 T16 | Pouch as a blend-shaped throat; `Gulp` (pouch open), `Breathe`. | The pouch is Blender work, the one morph target on the roster. |
| `keichousaurus` | A2 T17 | Forelimb-driven `Swim`, `Crawl`, `KinScatter`, `Breathe`. Two schemes. | — |
| `cartorhynchus` | A2 T18 | Bending wrists as joints; `Crawl` (the strong one), `SuctionSnap`, `HaulOut`, `Breathe`. | — |
| `odontochelys` | A2 T19 | Plastron rigid; `BellyTurn` (guard: the roll), `Crawl`, `Breathe`, `BeachRun`. | The beach run is the hatch clip. |
| `ceratites` | A2 T20 | Shell rigid, soft body; `Jet`, `Hover`, `Withdraw` (aptychus). | The same shell mesh, unlit, is the `ceratite-drift` prop. |
| `phragmoteuthis` | A2 T21 | Ten arm chains with hooks; `Grab` (held loop), `Ink`, `Jet`. | Ink is a particle; the clip is the mantle squeeze. |

#### Shore animals (3 + 1 optional)

| Id | Blocked on | Clips |
| --- | --- | --- |
| `tanystropheus` | A2 S01 | Procedural 13-joint neck with the rib struts as ridges. `Watch` (idle, head under the surface), `Lower` (telegraph), `SnapLeft`, `SnapRight`, `Drag`, `Retract`, `Severed` (body one-shot), `Flee`. |
| `mystriosuchus` | A2 S02 | `Float` (crest showing), `Lunge`, `Bite`, `SlideIn`, `Bask`. |
| `macrocnemus` | A2 S03 | `Stand`, `Run`, `Bolt`. |
| `coelophysis` (optional) | A2 S04 | `Drink`, `Snatch`, `Look`. |

#### Organic scenery (4)

| Id | Blocked on | Notes |
| --- | --- | --- |
| `log-raft` | A3 | The Tripo log at the surface; the Traumatocrinus colony (root cirri at the log's ends, stems of differing length to eight units, ten-armed crowns) built procedurally under it; drifts on the current; grippable. Full and reduced. |
| `coral-head` | A3 | One mesh, a collider footprint from `npm run shapes`. Sparse. |
| `sponge-mound` | A3 | With an interior a rung I body can enter; footprint measured. |
| `voltzia` | A3 | Three sizes, on the shore; no collider needed above the waterline beyond the trunk. |

### B2 · Tier 2 — built in-house

Instanced props by builder script (`tools/triassic/props/`), one mesh, base pivot, vertex colours,
a few hundred triangles, at the scale-1 sizes in [02](02-biomes-and-depth.md#props-and-plants-the-models-each-biome-needs);
`npm run shapes` for anything collided with, `npm run props` to audit.

| Id | Variants | Blocked on | Notes |
| --- | --- | --- | --- |
| `encrinus` | 3 (stem height) | — | Segmented stem, ten-armed crown that opens and closes in the shader. |
| `encrinus-litter` | 2 | — | Columnal and stem-length scatter. |
| `diplopora` | 2 | — | Calcified whorled tuft; sways. |
| `thecosmilia` | 3 | — | Phaceloid bush of parallel tubes. |
| `calcisponge` | 2 | — | Stacked-chamber column. |
| `stromatolite` | 2 | — | Layered dome. |
| `salt-crust` | 2 | — | Curled gypsum plate. |
| `placunopsis-mound` | 2 | — | Stacked-shell dome, a feeding station. |
| `daonella-bed` | 3 | — | Overlapping flat-clam slab, a feeding station. |
| `ceratite-drift` | 1 | B1 `ceratites` | The live shell's mesh, unlit and half-buried. |
| `brachiopod-cluster` | 1 | — | Coenothyris. |
| `cidaris` | 1 | — | Club-spined urchin. |
| `reef-block` | 4 | — | Angular margin breccia; the rock slot. |
| `mud-ripple` | 2 | — | Laminated black-mud plate with an ash band. |
| `drift-log` | 1 | — | The Devonian `submerged-log` re-pivoted to float. |
| `neocalamites` | 2 | — | Jointed horsetail stand. |
| `pleuromeia` | 1 | — | Unbranched trunk, strap-leaf crown, one cone. |
| `bjuvia` | 1 | — | Cycad rosette. |
| `shore-boulder` | 3 | — | Red sandstone. |

Effects that are not meshes and are built with the renderer: the blow (spray and a foam ring at
the surface), the ink cloud, the ash fall in the basin, the surface underside with refracted sky,
and the sun through the surface in the flats. Sounds go on `docs/audio-requests.md` when the era
is built: the blow is the era's signature sample and needs a real recording, not a synthesis.

## Counts

| | Tier 1 (Tripo) | Tier 2 (in-house) |
| --- | --- | --- |
| Source images | 112 creature and shore-animal views + 12 scenery views (generated in-house as inputs) | 25 reference boards, 9 banners, 2 key art, 1 wordmark, 4 glyphs, 9 regional boards, 2 scale plates |
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
