# Canonical image review

**Generated — do not edit by hand.** Written by `node tools/triassic/apply-selections.mjs`
from a selection export made in the [reference viewer](https://games.hoai.net/cambrian/research/triassic/).
Latest pass: 2026-09-13.

A subject is **greenlit** when a human picked our own generated pose as the image the animal
should be built from. Everything downstream — the four-view modelling sheet, the Tripo
generation, the skeleton and the shipped body — is made from that one image
([04 · The Tripo pipeline](../04-tripo-pipeline.md)). A subject marked **redo** is not cleared:
its pose is regenerated with the named picture as the steer, reviewed again, and only then built.

| Greenlit | Redo | Not yet reviewed |
| --- | --- | --- |
| 18 | 3 | 47 |

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
| **Nothosaurus giganteus** `nothosaurus` | T03 · Rung III · two-gear ambusher | the pose | — |
| **Phragmoteuthis bisinuata** `phragmoteuthis` | T21 · Rung I · the hooks | the pose | — |
| **Placodus gigas** `placodus` | T09 · Rung II · the shell-cruncher | the pose | — |
| **Saurichthys** `saurichthys` | T15 · Rung II · the needle | the pose | — |
| **Shonisaurus popularis** `shonisaurus` | T02 · Rung IV giant · the pod | the pose | — |

## Redo — regenerate the canonical pose toward the chosen image

Each row is a generator brief: take the subject's current pose in `docs/triassic/canonical/`,
regenerate it steered by the image named here, and put the result back through the viewer.
A reference is somebody else's artwork — use it as direction, keep its credit with the prompt,
and never ship it.

### Aphaneramma rostratum `aphaneramma`

- **Slot:** T12 · Rung II · the sensor (marine amphibian) · ~1.5–2 m
- **Steer toward:** Metoposaurus diagnosticus kraselovi 1DB.jpg
- **Credit:** Dmitry Bogdanov · CC BY-SA 3.0
- **File page:** https://commons.wikimedia.org/wiki/File:Metoposaurus_diagnosticus_kraselovi_1DB.jpg
- **Full size:** https://upload.wikimedia.org/wikipedia/commons/6/6b/Metoposaurus_diagnosticus_kraselovi_1DB.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original
- **Described as:** Reconstruction of Metoposaurus diagnosticus
- **Reviewer's note:** —

### Cymbospondylus youngorum `cymbospondylus`

- **Slot:** T01 · Rung IV giant · the first giant · ~17.6 m
- **Steer toward:** Cymbospondylus youngorum reconstruction 2023.jpg
- **Credit:** Mariolanzas · CC BY-SA 4.0
- **File page:** https://commons.wikimedia.org/wiki/File:Cymbospondylus_youngorum_reconstruction_2023.jpg
- **Full size:** https://upload.wikimedia.org/wikipedia/commons/6/61/Cymbospondylus_youngorum_reconstruction_2023.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original
- **Described as:** Life restoration of Cymbospondylus youngorum, a giant ichthyosaur from Nevada, USA.
- **Reviewer's note:** —

### Odontochelys semitestacea `odontochelys`

- **Slot:** T19 · Rung I · the half-shell · ~40 cm
- **Steer toward:** Thaichelys ruchae life restoration.png
- **Credit:** Tomasz Szczygielski, Dawid Dróżdż, Phornphen Chanthasit, Sita Manitkoon, Pitaksit Ditbanjong · CC BY 4.0
- **File page:** https://commons.wikimedia.org/wiki/File:Thaichelys_ruchae_life_restoration.png
- **Full size:** https://upload.wikimedia.org/wikipedia/commons/0/05/Thaichelys_ruchae_life_restoration.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original
- **Described as:** Fig 18. Thaichelys ruchae, life restoration as a proterochersid turtle. Digital drawing by Sita Manitkoon.
- **Reviewer's note:** —


## Not yet reviewed

`acrodus` · `anshunsaurus` · `antrimpos` · `chaohusaurus` · `choristoceras` · `coral-head` · `cyamodus` · `cymbospondylus-buchseri` · `dachstein-reef` · `daonella` · `diplopora` · `encrinus` · `eusaurosphargis` · `fadenia` · `germanonautilus` · `gipskeuper` · `guizhouichthyosaurus` · `helveticosaurus` · `ichthyotitan` · `log-raft` · `macrocnemus` · `monte-san-giorgio` · `muschelkalk` · `mystriosuchus` · `nanchangosaurus` · `neocalamites` · `neusticosaurus` · `pistosaurus` · `placochelys` · `placunopsis` · `pleuromeia` · `psephoderma` · `rebellatrix` · `retiophyllia` · `rhaeticosaurus` · `saurosphargis` · `shastasaurus` · `sponge-mound` · `stromatolite` · `tanystropheus` · `thylacocephala` · `traumatocrinus` · `tropites` · `utatsusaurus` · `voltzia` · `xinpusaurus` · `yunnanolimulus`
