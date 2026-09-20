# Canonical image review

**Generated — do not edit by hand.** Written by `node tools/triassic/apply-selections.mjs`
from a selection export made in the [reference viewer](https://games.hoai.net/cambrian/research/triassic/).
Latest pass: 2026-09-20.

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
| 25 | 0 | 0 | 78 |

## Delivered — the model exists

| Subject | Slot | Built from | Landed |
| --- | --- | --- | --- |
| **Aphaneramma rostratum** `aphaneramma` | T12 · Rung II · the sensor (marine amphibian) | the greenlit pose | 2026-09-15 |
| **Askeptosaurus italicus** `askeptosaurus` | T08 · Rung II · the turner | the greenlit pose | 2026-09-20 |
| **Atopodentatus unicus** `atopodentatus` | T07 · Rung III · the grazer (hammerhead) | the greenlit pose | 2026-09-15 |
| **Birgeria stensioei** `birgeria` | T11 · Rung II · the tuna | the greenlit pose | 2026-09-15 |
| **Cartorhynchus lenticarpus** `cartorhynchus` | T18 · Rung I · the shallow-water sucker | the greenlit pose | 2026-09-15 |
| **Ceratites nodosus** `ceratites` | T20 · Rung I · the shell | the greenlit pose | 2026-09-15 |
| **Coelophysis** `coelophysis` | S04 · optional · the dinosaur at the water | the greenlit pose | 2026-09-15 |
| **Cymbospondylus youngorum** `cymbospondylus` | T01 · Rung IV giant · the first giant | the greenlit pose | 2026-09-15 |
| **Dinocephalosaurus orientalis** `dinocephalosaurus` | T04 · Rung III · the reach (32-joint neck) | the greenlit pose | 2026-09-15 |
| **Helicoprion** `helicoprion` | T05 · Rung III · the whorl (Permian relict; see Fadenia) | the greenlit pose | 2026-09-15 |
| **Henodus chelyops** `henodus` | T14 · Rung II · the lagoon oddity | the greenlit pose | 2026-09-15 |
| **Hupehsuchus nanchangensis** `hupehsuchus` | T16 · Rung II · the armoured gulper | the greenlit pose | 2026-09-15 |
| **Hybodus** `hybodus` | T10 · Rung II · the spined shark | the greenlit pose | 2026-09-15 |
| **Keichousaurus hui** `keichousaurus` | T17 · Rung I · the crowd | `male` | 2026-09-15 |
| **Macrocnemus bassanii** `macrocnemus` | S03 · the runner (ambient) | the greenlit pose | 2026-09-15 |
| **Mixosaurus cornalianus** `mixosaurus` | T13 · Rung II · the small fin | the greenlit pose | 2026-09-15 |
| **Mystriosuchus** `mystriosuchus` | S02 · the surface lurker (marine phytosaur) | the greenlit pose | 2026-09-15 |
| **Nothosaurus giganteus** `nothosaurus` | T03 · Rung III · two-gear ambusher | the greenlit pose | 2026-09-13 |
| **Odontochelys semitestacea** `odontochelys` | T19 · Rung I · the half-shell | the greenlit pose | 2026-09-15 |
| **Phragmoteuthis bisinuata** `phragmoteuthis` | T21 · Rung I · the hooks | the greenlit pose | 2026-09-15 |
| **Placodus gigas** `placodus` | T09 · Rung II · the shell-cruncher | the greenlit pose | 2026-09-15 |
| **Rhaeticosaurus mertensi** `rhaeticosaurus` | T06 · Rung III · the flyer (first plesiosaur) | the greenlit pose | 2026-09-15 |
| **Saurichthys** `saurichthys` | T15 · Rung II · the needle | the greenlit pose | 2026-09-15 |
| **Shonisaurus popularis** `shonisaurus` | T02 · Rung IV giant · the pod | the greenlit pose | 2026-09-13 |
| **Tanystropheus hydroides** `tanystropheus` | S01 · the boom (13-joint stiff neck) | the greenlit pose | 2026-09-15 |

These keep their preview badge until a human approves the body itself. Where a procedural twin
shipped with the body, the specimen viewer switches between the two in place.

## Greenlit — build from the canonical pose

Nothing greenlit yet.

## Redo — regenerate the canonical pose

Nothing queued for rework.

## Not yet reviewed

`acrodus` · `anshunsaurus` · `antrimpos` · `aphaneramma` · `askeptosaurus` · `atopodentatus` · `birgeria` · `bjuvia` · `brachiopod-cluster` · `calcisponge` · `cartorhynchus` · `ceratites` · `chaohusaurus` · `choristoceras` · `cidaris` · `coelophysis` · `coral-head` · `cyamodus` · `cymbospondylus` · `cymbospondylus-buchseri` · `dachstein-reef` · `daonella` · `daonella-bed` · `dinocephalosaurus` · `diplopora` · `encrinus` · `encrinus-litter` · `eusaurosphargis` · `fadenia` · `germanonautilus` · `gipskeuper` · `guizhouichthyosaurus` · `helicoprion` · `helveticosaurus` · `henodus` · `hupehsuchus` · `hybodus` · `ichthyotitan` · `keichousaurus` · `log-raft` · `macrocnemus` · `mixosaurus` · `monte-san-giorgio` · `muschelkalk` · `mystriosuchus` · `nanchangosaurus` · `neocalamites` · `neusticosaurus` · `nothosaurus` · `odontochelys` · `phragmoteuthis` · `pistosaurus` · `placochelys` · `placodus` · `placunopsis` · `placunopsis-mound` · `pleuromeia` · `psephoderma` · `rebellatrix` · `reef-block` · `retiophyllia` · `rhaeticosaurus` · `saurichthys` · `saurosphargis` · `shastasaurus` · `shonisaurus` · `shore-boulder` · `sponge-mound` · `stromatolite` · `tanystropheus` · `thecosmilia` · `thylacocephala` · `traumatocrinus` · `tropites` · `utatsusaurus` · `voltzia` · `xinpusaurus` · `yunnanolimulus`
