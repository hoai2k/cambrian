# Devonian roster: the everyday group each animal belongs to

Research brief, September 2026. The data lives in `src/content/devonian/creatures.ts` as two
fields per animal — `kind` (two or three everyday words) and `kindNote` (one plain sentence
saying what that group is). `tools/devonian-test.ts` fails if either is missing.

**Why.** "Gemuendina" tells a player nothing. "Placoderm" tells them *armoured fish*, and for
anyone who has met Dunkleosteus in a museum it says which family the thing on screen belongs to.
The group label is shown beside the genus wherever the genus appears: the select card, the
specimen viewer, the lock-on panel in play, and the results screen.

**Rules for the label.**

- Everyday words over rank names. "Sea scorpion", not "Eurypterida"; "Trilobite", not
  "Phacopida". The precise clade goes in the sentence, where there is room to explain it.
- Recognition beats precision only where the two do not actually conflict. Cladoselache is
  labelled *Early shark* because that is what a reader will recognise, and the sentence
  immediately says the group sits nearer the chimaera line than to modern sharks.
- Never a rank a reader would take as a claim about the specific animal. The note describes the
  **group**, not the individual's behaviour; behaviour is what `role`, `tagline`, `passive` and
  `weakness` are for, and those are game interpretation (see `docs/redesign/07-devonian-design.md`).

## The roster

| Animal | Group shown | Clade | Notes |
| --- | --- | --- | --- |
| Dunkleosteus | Placoderm | Arthrodira, Placodermi | The reference placoderm: head and shoulder armour, a hinge between the two, jaws of self-sharpening bone rather than teeth. |
| Titanichthys | Placoderm | Arthrodira, Placodermi | Same group and armour as Dunkleosteus, opposite feeding end: the slender edentulous jaw could not bite hard, and is read as a filter feeder (Coatham et al. 2020). |
| Cladoselache | Early shark | Cladoselachidae, Chondrichthyes | Shark-shaped cartilaginous fish. Phylogenies put Cladoselachidae as sister to the symmoriiforms, and both nearer the holocephalans (chimaeras) than to modern sharks — hence "early shark" with the caveat in the note. |
| Stethacanthus | Early shark | Symmoriiformes, Chondrichthyes | Same grade as Cladoselache; the anvil-shaped brush of enlarged denticles is the recognisable feature. |
| Onychodus | Lobe-finned fish | Onychodontiformes, Sarcopterygia | The fleshy-finned lineage — coelacanths, lungfish and, eventually, tetrapods. Onychodonts carried whorls of tusks that hinged inside the lower jaw. |
| Rhinodipterus | Lungfish | Dipnoi, Sarcopterygia | Air-breathing lobe-fin with crushing tooth plates; the group still has living members in Africa, South America and Australia. |
| Tiktaalik | Lobe-finned fish | Elpistostegalia, Tetrapodomorpha | Popularly a "fishapod": neck, ribs and weight-bearing front fins, immediately beside the first four-limbed animals. Labelled by its group rather than by "fishapod", which is a nickname for this one animal. |
| Jaekelopterus | Sea scorpion | Eurypterida, Chelicerata | The everyday name for eurypterids, and this is the largest known one. Not a scorpion, which the note does not need to belabour. |
| Cheirolepis | Ray-finned fish | Actinopterygii | An early actinopterygian: the body plan that became almost every fish alive today. |
| Doryaspis | Jawless fish | Pteraspidiformes, Heterostraci | Armoured and jawless; a bony head shield with a forward rostrum, and a mouth that scooped rather than bit. |
| Gemuendina | Placoderm | Rhenanida, Placodermi | The ray-shaped branch of the placoderms, armour broken into a mosaic of small plates over a flattened body. |
| Bothriolepis | Placoderm | Antiarcha, Placodermi | The branch with jointed, crab-like bony pectoral appendages on a boxy armoured head. |
| Coccosteus | Placoderm | Arthrodira, Placodermi | Dunkleosteus' own group at a tenth of the length: the same hinged head and shearing jaw plates. |
| Michelinoceras | Nautiloid | Orthocerida, Orthoceratoidea | A straight-shelled (orthocone) nautiloid — the chambered-shell lineage the living nautilus belongs to. |
| Acanthostega | Early tetrapod | Stem Tetrapoda | Four limbs, eight fingers per hand, gills still working: legs that were for water, not land. |
| Eldredgeops | Trilobite | Phacopida | The classic collector's trilobite (long known as *Phacops rana*), with schizochroal eyes of separate lenses. |
| Walliserops | Trilobite | Comuridae, Phacopida | A trilobite carrying a forked trident off its head — the ornament it is famous for. |
| Nahecaris | Crustacean | Phyllocarida, Crustacea | A shrimp-like crustacean under a hinged two-piece carapace. "Crustacean" is the group a reader knows; "phyllocarid" is the sentence's job. |
| Furcaster | Brittle star | Ophiuroidea, Echinodermata | A starfish relative with a small central disc and five whip-like arms. |
| Palaeoisopus | Sea spider | Pycnogonida | The first sea spider fossil ever described (Broili 1928, originally read upside down as an isopod). |
| Manticoceras | Ammonoid | Goniatitida, Ammonoidea | A goniatite: the coiled shelled cephalopods that preceded — and gave rise to — the ammonites. "Ammonite" would be the more familiar word and the wrong one. |

## Sources

Group placements are standard textbook systematics; the two that needed checking against current
literature are noted here.

- Cladoselache and Stethacanthus as symmoriiform-grade chondrichthyans nearer the holocephalans
  than to modern sharks: Klug et al. 2023, "Broad snouted cladoselachian with sensory
  specialization at the base of modern chondrichthyans", *Swiss Journal of Palaeontology* 142:2 —
  the description of *Maghriboselache* places Cladoselachidae as sister to the symmoriiforms and
  both as sister to the holocephalans. <https://doi.org/10.1186/s13358-023-00266-6>
- Michelinoceras within Orthocerida / Orthoceratoidea (orthoconic nautiloids):
  <https://en.wikipedia.org/wiki/Michelinoceras>, <https://en.wikipedia.org/wiki/Orthoceratoidea>
- Palaeoisopus as a pycnogonid (sea spider), with the cephalic appendages redescribed: "New
  insights into the Devonian sea spiders of the Hunsrück Slate (Arthropoda: Pycnogonida)",
  *PeerJ* 2024. <https://peerj.com/articles/17766/>
- Titanichthys as a filter feeder, which is why its note contrasts it with Dunkleosteus:
  Coatham et al. 2020, *Royal Society Open Science* 7:200272.

## Cambrian

The `kind` / `kindNote` fields live on the shared `CreatureDef`, so the Cambrian roster can take
the same treatment (Anomalocaris → "Radiodont", Olenoides → "Trilobite", Hallucigenia →
"Lobopodian", and so on). It has none of them yet, and every place that shows the label already
hides it when it is absent.
