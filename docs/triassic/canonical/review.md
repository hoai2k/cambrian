# Canonical image review

**Generated — do not edit by hand.** Written by `node tools/triassic/apply-selections.mjs`
from a selection export made in the [reference viewer](https://games.hoai.net/cambrian/research/triassic/).
Latest pass: 2026-09-13.

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
| 2 | 16 | 0 | 52 |

## Delivered — the model exists

| Subject | Slot | Built from | Landed |
| --- | --- | --- | --- |
| **Nothosaurus giganteus** `nothosaurus` | T03 · Rung III · two-gear ambusher | the greenlit pose | 2026-09-13 |
| **Shonisaurus popularis** `shonisaurus` | T02 · Rung IV giant · the pod | the greenlit pose | 2026-09-13 |

These keep their preview badge until a human approves the body itself. Where a procedural twin
shipped with the body, the specimen viewer switches between the two in place.

## Greenlit — build from the canonical pose

| Subject | Slot | Canon image | Note |
| --- | --- | --- | --- |
| **Askeptosaurus italicus** `askeptosaurus` | T08 · Rung II · the turner | the pose | — |
| **Atopodentatus unicus** `atopodentatus` | T07 · Rung III · the grazer (hammerhead) | the pose | — |
| **Birgeria stensioei** `birgeria` | T11 · Rung II · the tuna | the pose | — |
| **Cartorhynchus lenticarpus** `cartorhynchus` | T18 · Rung I · the shallow-water sucker | the pose | — |
| **Ceratites nodosus** `ceratites` | T20 · Rung I · the shell | the pose | — |
| **Coelophysis** `coelophysis` | S04 · optional · the dinosaur at the water | the pose | — |
| **Dinocephalosaurus orientalis** `dinocephalosaurus` | T04 · Rung III · the reach (32-joint neck) | the pose | — |
| **Helicoprion** `helicoprion` | T05 · Rung III · the whorl (Permian relict; see Fadenia) | the pose | — |
| **Henodus chelyops** `henodus` | T14 · Rung II · the lagoon oddity | the pose | — |
| **Hupehsuchus nanchangensis** `hupehsuchus` | T16 · Rung II · the armoured gulper | the pose | — |
| **Hybodus** `hybodus` | T10 · Rung II · the spined shark | the pose | — |
| **Keichousaurus hui** `keichousaurus` | T17 · Rung I · the crowd | `male` | — |
| **Mixosaurus cornalianus** `mixosaurus` | T13 · Rung II · the small fin | the pose | — |
| **Phragmoteuthis bisinuata** `phragmoteuthis` | T21 · Rung I · the hooks | the pose | — |
| **Placodus gigas** `placodus` | T09 · Rung II · the shell-cruncher | the pose | — |
| **Saurichthys** `saurichthys` | T15 · Rung II · the needle | the pose | — |

## Redo — regenerate the canonical pose

Nothing queued for rework.

## Not yet reviewed

`acrodus` · `anshunsaurus` · `antrimpos` · `aphaneramma` · `chaohusaurus` · `choristoceras` · `coral-head` · `cyamodus` · `cymbospondylus` · `cymbospondylus-buchseri` · `dachstein-reef` · `daonella` · `diplopora` · `encrinus` · `eusaurosphargis` · `fadenia` · `germanonautilus` · `gipskeuper` · `guizhouichthyosaurus` · `helveticosaurus` · `ichthyotitan` · `log-raft` · `macrocnemus` · `monte-san-giorgio` · `muschelkalk` · `mystriosuchus` · `nanchangosaurus` · `neocalamites` · `neusticosaurus` · `nothosaurus` · `odontochelys` · `pistosaurus` · `placochelys` · `placunopsis` · `pleuromeia` · `psephoderma` · `rebellatrix` · `retiophyllia` · `rhaeticosaurus` · `saurosphargis` · `shastasaurus` · `shonisaurus` · `sponge-mound` · `stromatolite` · `tanystropheus` · `thylacocephala` · `traumatocrinus` · `tropites` · `utatsusaurus` · `voltzia` · `xinpusaurus` · `yunnanolimulus`
