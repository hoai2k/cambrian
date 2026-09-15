# Canonical image review

**Generated — do not edit by hand.** Written by `node tools/triassic/apply-selections.mjs`
from a selection export made in the [reference viewer](https://games.hoai.net/cambrian/research/triassic/).
Latest pass: 2026-09-15.

A subject is **greenlit** when a human picked our own generated pose as the image the animal
should be built from. Everything downstream — the four-view modelling sheet, the Tripo
generation, the skeleton and the shipped body — is made from that one image
([04 · The Tripo pipeline](../04-tripo-pipeline.md)). A subject marked **redo** is not cleared:
its pose is regenerated — steered toward a reference that beat it, or simply redrawn where the
reading is accepted and only the picture is wrong — then reviewed again, and only then built.

A subject whose model has landed reads **delivered**: the picture is settled and the body is
what is under review now. A regenerated pose clears whatever was decided about the old one and
sends the subject back to the undecided pile, where the viewer shows the candidate beside it.

| Delivered | Greenlit | Redo | Not yet reviewed |
| --- | --- | --- | --- |
| 17 | 8 | 7 | 63 |

## Delivered — the model exists

| Subject | Slot | Built from | Landed |
| --- | --- | --- | --- |
| **Birgeria stensioei** `birgeria` | T11 · Rung II · the tuna | the greenlit pose | 2026-09-15 |
| **Cartorhynchus lenticarpus** `cartorhynchus` | T18 · Rung I · the shallow-water sucker | the greenlit pose | 2026-09-15 |
| **Ceratites nodosus** `ceratites` | T20 · Rung I · the shell | the greenlit pose | 2026-09-15 |
| **Cymbospondylus youngorum** `cymbospondylus` | T01 · Rung IV giant · the first giant | the greenlit pose | 2026-09-15 |
| **Dinocephalosaurus orientalis** `dinocephalosaurus` | T04 · Rung III · the reach (32-joint neck) | the greenlit pose | 2026-09-15 |
| **Helicoprion** `helicoprion` | T05 · Rung III · the whorl (Permian relict; see Fadenia) | the greenlit pose | 2026-09-15 |
| **Henodus chelyops** `henodus` | T14 · Rung II · the lagoon oddity | the greenlit pose | 2026-09-15 |
| **Hupehsuchus nanchangensis** `hupehsuchus` | T16 · Rung II · the armoured gulper | the greenlit pose | 2026-09-15 |
| **Hybodus** `hybodus` | T10 · Rung II · the spined shark | the greenlit pose | 2026-09-15 |
| **Keichousaurus hui** `keichousaurus` | T17 · Rung I · the crowd | `male` | 2026-09-15 |
| **Mixosaurus cornalianus** `mixosaurus` | T13 · Rung II · the small fin | the greenlit pose | 2026-09-15 |
| **Nothosaurus giganteus** `nothosaurus` | T03 · Rung III · two-gear ambusher | the greenlit pose | 2026-09-13 |
| **Phragmoteuthis bisinuata** `phragmoteuthis` | T21 · Rung I · the hooks | the greenlit pose | 2026-09-15 |
| **Placodus gigas** `placodus` | T09 · Rung II · the shell-cruncher | the greenlit pose | 2026-09-15 |
| **Rhaeticosaurus mertensi** `rhaeticosaurus` | T06 · Rung III · the flyer (first plesiosaur) | the greenlit pose | 2026-09-15 |
| **Shonisaurus popularis** `shonisaurus` | T02 · Rung IV giant · the pod | the greenlit pose | 2026-09-13 |
| **Tanystropheus hydroides** `tanystropheus` | S01 · the boom (13-joint stiff neck) | the greenlit pose | 2026-09-15 |

These keep their preview badge until a human approves the body itself. Where a procedural twin
shipped with the body, the specimen viewer switches between the two in place.

## Greenlit — build from the canonical pose

| Subject | Slot | Canon image | Note |
| --- | --- | --- | --- |
| **Aphaneramma rostratum** `aphaneramma` | T12 · Rung II · the sensor (marine amphibian) | the pose | — |
| **Askeptosaurus italicus** `askeptosaurus` | T08 · Rung II · the turner | the pose | — |
| **Atopodentatus unicus** `atopodentatus` | T07 · Rung III · the grazer (hammerhead) | the pose | — |
| **Coelophysis** `coelophysis` | S04 · optional · the dinosaur at the water | the pose | — |
| **Macrocnemus bassanii** `macrocnemus` | S03 · the runner (ambient) | the pose | — |
| **Mystriosuchus** `mystriosuchus` | S02 · the surface lurker (marine phytosaur) | the pose | — |
| **Odontochelys semitestacea** `odontochelys` | T19 · Rung I · the half-shell | the pose | — |
| **Saurichthys** `saurichthys` | T15 · Rung II · the needle | the pose | — |

## Redo — regenerate the canonical pose

Each row is a generator brief: take the subject's current pose in `docs/triassic/canonical/`,
regenerate it with the steer given here, and put the result back through the viewer. Some steers
name somebody else's artwork — use it as direction, keep its credit with the prompt, and never
ship it. Others name our own image, which means the reading is accepted and only the picture is
wrong: there the note is the entire brief.

### Bjuvia cycadophyte `bjuvia`

- **Slot:** Low cycad rosette on shore · shore shrub
- **Redraw our own pose:** `docs/triassic/canonical/bjuvia-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. Two faults. First, the same as the other shore plants: it is drawn as an UPROOTED SPECIMEN with a wide spreading root mass fully exposed below the trunk, which would model as roots hovering over the beach. Cut at the ground line and show no free roots. Second, the leaves are wrong for the genus: this draws a normal pinnate cycad with divided, feather-like fronds, but Bjuvia is the cycad with SIMPLE, ENTIRE leaves — broad undivided strap- or tongue-shaped blades with a single midrib, not split into leaflets. That undivided leaf is the whole reason the plant is recognisable and the reason the genus is named for its simplicity. Redraw as a squat trunk in the ground carrying a rosette of broad, entire, strap-shaped leaves, 1.5 units overall.

### Coenothyris brachiopod cluster `brachiopod-cluster`

- **Slot:** Small lampshell cluster · low cluster
- **Redraw our own pose:** `docs/triassic/canonical/brachiopod-cluster-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. This is a 0.3-unit cluster of small food on the seabed. The image draws a FOSSIL NODULE: the shells are set into a large rounded lump of rock matrix that makes up most of the object's volume, so what gets built is a stone with shells in it rather than a cluster of animals. Redraw as living Coenothyris clustered on the sea floor: six to ten small, smooth, oval biconvex brachiopods with a clear beak and pedicle opening, attached close together and to each other on a thin patch of hard ground, shells clearly the bulk of the object and the substrate a low crust rather than a boulder. High three-quarter view, pale shells on pale sediment.

### Triassic cidaroid urchin `cidaris`

- **Slot:** Club-spined benthic prop · small benthic prop
- **Redraw our own pose:** `docs/triassic/canonical/cidaris-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. The urchin itself reads well — a cidaroid test with stout club-shaped primary spines is right. The fault is that it FLOATS: it is drawn as a specimen suspended in space with spines radiating equally in every direction including straight down, and there is no ground plane anywhere in the image. This prop is 0.3 units sitting on the reef floor, so built from this its lower spines drive through the sand. Redraw it resting on the substrate: oral surface down on the sediment, the test sitting just clear of the floor on the short ventral spines, the long club spines directed upward and outward, and the sediment surface visible under it so the contact is unambiguous.

### Daonella shell bed `daonella-bed`

- **Slot:** Overlapping flat-clam feeding slab · low patch
- **Redraw our own pose:** `docs/triassic/canonical/daonella-bed-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. This is the pavement biome's floor, 1.2 wide, instanced fourteen to the area — the thing the player swims over. The image draws a QUARRIED FOSSIL SLAB: shells compressed into dark grey-black shale, with a thick raised rim like a cut block. Built from this, the pavement becomes black stone plaques dropped on a pale carbonate floor, and the rim models as a plinth standing proud of the sand. Redraw as a living shell bed on the sea floor: flat Daonella valves, thin and near-circular with fine radial ribs, lying loose and overlapping at shallow angles directly on pale carbonate sediment, some half-buried, a few tilted. Pale buff and cream shells on light sediment, no dark shale, no matrix block, no cut edge or rim — the patch should fade into the sand at its margin rather than stopping at a wall. High three-quarter view. Three orientations are wanted, so keep the outline roughly circular rather than a rectangle.

### Encrinus columnal litter `encrinus-litter`

- **Slot:** Broken stem and columnal seafloor scatter · low patch
- **Redraw our own pose:** `docs/triassic/canonical/encrinus-litter-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. This is specified as a ground DECAL-MESH 0.6 wide — a flat scatter lying on the seabed where the moulted and the dead lie. The image draws a deep rounded HEAP of about a hundred columnals, several layers thick, with a domed profile. Built from this it becomes a mound of rubble, which is not what the pavement and the garden need and reads as a cairn among flat ground cover. Redraw as a single-layer scatter seen from a high three-quarter angle: ten to twenty loose columnals and two or three short stem lengths lying flat and separate on the sediment, the widest piece no more than a fifth of the patch, plenty of bare ground showing between them, and the whole thing essentially flat — height no more than one part in eight of its width. No pile, no mound, no container edge.

### Neocalamites / Equisetites `neocalamites`

- **Slot:** Horsetail reed beds at the estuary · 2–5 m
- **Redraw our own pose:** `docs/triassic/canonical/neocalamites-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. The plant is right — a jointed horsetail clump with whorled leaves is exactly the read. The fault is that it is drawn as an UPROOTED SPECIMEN: the rhizome and a full mass of fine roots hang below in open air, and that root ball is a third of the silhouette. The pose is the contract, so a modeller either builds those roots, and the game then draws a horsetail hovering above the sand with its roots in the air, or omits them and the body no longer matches the pose. Redraw with the plant standing in the ground: cut the image at the ground line, show the stems emerging from the substrate with at most a little basal swelling and some scattered litter where they enter it, and no visible roots. Keep the clump, the joints, the whorls and the 3-unit proportion.

### Pleuromeia `pleuromeia`

- **Slot:** The disaster-flora lycopsid on the shore · 1–2 m
- **Redraw our own pose:** `docs/triassic/canonical/pleuromeia-canonical pose.png`
- **Steer toward:** nothing external — the reading is accepted and the note below is the whole brief.
- **Reviewer's note:** These are instanced props: one mesh, no rig, a few hundred triangles, vertex colours, pivot at the base centre where the prop meets the ground, scattered by the thousand and bent and swayed in the shader. The canonical pose is what the model is built from, so it has to show the organism AS IT SITS ON THE GROUND, not as a museum specimen. The plant is right — unbranched trunk, rhomboid leaf scars, a crown of strap leaves and a terminal cone is exactly Pleuromeia, and it is a good distinctive silhouette. The fault is the same as the other two shore plants: it is drawn as an UPROOTED SPECIMEN, with the bulbous rhizomorph and a spreading mass of roots fully exposed below, making up nearly half the height. Redraw with the plant standing in the ground: cut at the ground line so the rhizomorph base is only just emerging, or buried entirely, and show no free roots. Keep the trunk, the scars, the strap-leaf crown and the cone, and keep the 2-unit proportion.


## Not yet reviewed

`acrodus` · `anshunsaurus` · `antrimpos` · `birgeria` · `calcisponge` · `cartorhynchus` · `ceratites` · `chaohusaurus` · `choristoceras` · `coral-head` · `cyamodus` · `cymbospondylus` · `cymbospondylus-buchseri` · `dachstein-reef` · `daonella` · `dinocephalosaurus` · `diplopora` · `encrinus` · `eusaurosphargis` · `fadenia` · `germanonautilus` · `gipskeuper` · `guizhouichthyosaurus` · `helicoprion` · `helveticosaurus` · `henodus` · `hupehsuchus` · `hybodus` · `ichthyotitan` · `keichousaurus` · `log-raft` · `mixosaurus` · `monte-san-giorgio` · `muschelkalk` · `nanchangosaurus` · `neusticosaurus` · `nothosaurus` · `phragmoteuthis` · `pistosaurus` · `placochelys` · `placodus` · `placunopsis` · `placunopsis-mound` · `psephoderma` · `rebellatrix` · `reef-block` · `retiophyllia` · `rhaeticosaurus` · `saurosphargis` · `shastasaurus` · `shonisaurus` · `shore-boulder` · `sponge-mound` · `stromatolite` · `tanystropheus` · `thecosmilia` · `thylacocephala` · `traumatocrinus` · `tropites` · `utatsusaurus` · `voltzia` · `xinpusaurus` · `yunnanolimulus`
