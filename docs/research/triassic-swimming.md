# Triassic roster: body length and swimming performance

Research brief for the Triassic era, September 2026. Companion data: `triassic-swimming.json`, one
object per id in `src/content/triassic/creatures.ts` (all 25: 21 playable plus the four shore
animals). Nothing here is game tuning; it is the biological envelope that
`tools/triassic/stats.mjs` turns into the six generated movement fields — `adultLength`, `speed`,
`burst`, `agility`, `turnRate`, `glide` — the same relationship `docs/research/devonian-swimming.md`
and `tools/devonian/stats.mjs` have to the Devonian roster.

**Baselines.** Representative lengths are the design's own figures
(`docs/triassic/01-triassic-design.md`, `docs/triassic/research.md`): the largest reliably-sized
individual for most animals, a mid-range or subadult figure where the literature disagrees
(`rhaeticosaurus` 3 m against a 2.4 m subadult holotype; `dinocephalosaurus` 5.5 m against a
"commonly quoted ~5 m, as much as 6 m" spread), and a floor of 1 m for the four smallest fish
(`mixosaurus`, `henodus`, `saurichthys`, `hupehsuchus`) and 0.15 m for `ceratites`, sized up from an
actual shell diameter under 10 cm so it plays at the roster's floor rather than beneath it. "Max" is
the largest length in the cited source, not a genus-wide guarantee.

**Confidence labels.** `measured` = a speed actually recorded for a living analogue applied at
matching scale with no rescaling (only `ceratites`, against Nautilus); `modelled` = a published
biomechanical or kinematic analysis of the fossil taxon's own locomotion (`nothosaurus`, Krahl
2021's paraxial-swimming study); `analogue` = a specific named modern species' measured
performance, allometrically rescaled to the fossil's length; `estimate` = our own allometric
reasoning with no single named analogue. None of the 25 has a directly measured fossil speed.

## 1. Method

Same two rules as the Devonian brief (`docs/research/devonian-swimming.md` §1.2), with L in metres:

- **Cruise (sustained).** `U = k · L^0.6` m/s (Watanabe et al. 2015's mass^0.20 exponent). k ranges
  from ~0.9 for wide-gape pursuit fish (birgeria) down to ~0.1 for benthic placodonts and the
  Henodus lagoon oddity.
- **Burst (fast start).** `U = 4 · L^0.5` m/s, scaled down for slow/armoured/giant bodies and up for
  needlefish-style ambushers (`saurichthys`), reproducing the size-dependent fall in BL/s that
  Bainbridge 1958 and Domenici 2001 document.
- **Non-analogue rules stay qualitative**, not formulaic: crocodile-analogue phytosaurs, penguin/
  sea-turtle four-flipper flight for the one plesiosaur, Nautilus-measured jet propulsion for the
  ammonoid and a modern-coleoid jet analogue for the squid relative.

### Analogues used, by group

| Group | Analogue | Roster ids |
|---|---|---|
| Thunniform / lamnid shark cruise-burst | mako shark (Nosal et al. 2024) | helicoprion, birgeria, hybodus |
| Paraxial paddle-rowing | sea lion "flying-rowing" | nothosaurus |
| Four-flipper underwater flight | penguin / sea turtle | rhaeticosaurus |
| Benthic bottom-walking, very slow | manatee / dugong | placodus, henodus, atopodentatus |
| Shallow-flat crawl-swim | sea-turtle hatchling | cartorhynchus, odontochelys |
| Needlefish fast-start ambush | pike / needlefish (Kogan et al. 2015) | saurichthys |
| Cephalopod jet | Nautilus (Neil & Askew 2018, measured) | ceratites |
| Cephalopod jet | modern small coleoid | phragmoteuthis |
| Crocodilian surface ambush | crocodile / gharial | mystriosuchus |
| Giant anguilliform / whale-scale | Watanabe 2015 allometry, no living giant-eel analogue | cymbospondylus, shonisaurus |
| No swimming (shore) | — (terrestrial or bank-bound) | tanystropheus, macrocnemus, coelophysis |

Turning follows the Devonian convention: sharp ≈ radius ≤ 0.12 L (flexible, small, or a jetting
funnel that swivels in place), moderate ≈ 0.2 L (most of the roster), wide ≈ 0.35 L (giants, stiff
thunniform bodies, rigid armour). Reverse: `slow` = fin/limb sculling under ~0.3 BL/s, `none` =
sharks and other bodies with no reversing propulsor, `jet` = backward through the funnel is the
fast/primary direction.

## 2. Shore animals

`tanystropheus`, `mystriosuchus`, `macrocnemus` and `coelophysis` (`shore: true` in
`src/content/triassic/creatures.ts`) get an entry with the same schema so `adultLength` still comes
from the shared K/EXP formula, but their `cruiseBLs` is written straight through without the
screens-per-second floor the swimming roster gets (`tools/triassic/stats.mjs`, mirroring the
Devonian generator's floor) — a bank ambusher or a beach runner never has to be quick to steer in
open water, because it is never far from the shore. `macrocnemus` and `coelophysis` in particular
carry nominal placeholder values: neither is written to swim at all.

## 3. Regenerating

```
node tools/triassic/stats.mjs
```

reads this JSON and writes `adultLength`, `speed`, `burst`, `agility`, `turnRate` and `glide` into
`src/content/triassic/creatures.ts` for every id, in place. It is idempotent — rerunning it after no
change to the JSON reproduces the same six fields — so edit the research or the formulas in
`tools/triassic/stats.mjs`, never those six fields by hand, and commit both together. `K = 4.0`,
`EXP = 0.55` (`adultLength = K · metres^EXP`) puts the 17.6 m `cymbospondylus` at ~19.4 units and the
0.3 m `keichousaurus` at ~2.06 units, the same spread the design was authored against.

## 4. Sources

- Sander P.M. et al. 2021. Early giant reveals faster evolution of large body size in ichthyosaurs than in cetaceans. Science 374:eabf5787. https://www.science.org/doi/10.1126/science.abf5787
- Kelley N.P. et al. 2022. Grouping behavior in a Triassic marine apex predator. Current Biology 32:R939. https://doi.org/10.1016/j.cub.2022.11.005
- Klein N. et al. 2022. Osteology and relationships of Nothosaurus mirabilis. PMC9422981. https://pmc.ncbi.nlm.nih.gov/articles/PMC9422981/
- Krahl A. 2021. Diversity in paraxial swimming in nothosauroids. Paläontologische Zeitschrift. https://link.springer.com/article/10.1007/s12542-021-00563-w
- Spiekman S.N.F. et al. 2024. Dinocephalosaurus orientalis, a remarkable marine archosauromorph. EESTRSE. https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-royal-society-of-edinburgh/article/dinocephalosaurus-orientalis-li-2003-a-remarkable-marine-archosauromorph-from-the-middle-triassic-of-southwestern-china/C7D48539139475EFCAAC35342089ACB8
- Tapanila L., Pruitt J. 2013. Unraveling species concepts for the Helicoprion tooth whorl. https://www.researchgate.net/publication/277417042
- Wintrich T. et al. 2017. A Triassic plesiosaurian skeleton and its implications for the evolution of the plesiosaurian locomotor system. Science Advances 3:e1701144. https://www.uni-bonn.de/en/university/press-and-communications/press-service/archive-press-releases/2017/302-2017
- Chun L. et al. 2016. The earliest herbivorous marine reptile and its remarkable jaw apparatus. Science Advances 2:e1501659. https://www.science.org/doi/10.1126/sciadv.1501659
- Müller J. 2005. The anatomy of Askeptosaurus italicus. Canadian Journal of Earth Sciences. https://cdnsciencepub.com/doi/10.1139/e05-030
- Neenan J.M. Fossil Focus: Placodonts. Palaeontology Online. https://www.palaeontologyonline.com/?p=3247
- Romano C. et al. 2017 / Romano & Brinkmann 2009 on Birgeria size and ecology. https://www.researchgate.net/publication/292397824
- Nosal A.P. et al. 2024. Direct measurement of cruising and burst swimming speeds of the shortfin mako shark. https://pmc.ncbi.nlm.nih.gov/articles/PMC10952363/
- Xue Y. et al. 2015. Sexual dimorphism and allometry of Keichousaurus hui. Acta Palaeontologica Polonica. https://www.app.pan.pl/article/item/app000062013.html
- Pommery Y. et al. 2021. Dentition and feeding ecology of Henodus chelyops. PMC8256584. https://pmc.ncbi.nlm.nih.gov/articles/PMC8256584/
- Kogan I. et al. 2015. Swimming performance of the Triassic fish Saurichthys. https://journals.biologists.com/bio/article/4/12/1715/1391
- Motani R., Pyenson N.D., Jiang D. 2025. Feeding function of Hupehsuchus reconsidered. PMC12232927. https://pmc.ncbi.nlm.nih.gov/articles/PMC12232927/
- Renesto S. et al. 2020. A new look at Mixosaurus cornalianus. Acta Palaeontologica Polonica. https://www.app.pan.pl/article/item/app007312020.html
- Motani R. et al. 2014. A basal ichthyosauriform with a short snout from the Lower Triassic of China (Cartorhynchus). Nature. https://doi.org/10.1038/nature13866
- Li C. et al. 2008. An ancestral turtle from the Late Triassic of southwestern China (Odontochelys). Nature 456:497. https://www.nature.com/articles/nature07533
- Neil T.R., Askew G.N. 2018. Swimming mechanics and propulsive efficiency in the chambered nautilus. Royal Society Open Science 5:170467. https://pmc.ncbi.nlm.nih.gov/articles/PMC5830708/
- Butler R.J. et al. 2019. Mystriosuchus steinbergeri from a Late Triassic marine lagoon. Zoological Journal of the Linnean Society. https://academic.oup.com/zoolinnean/article-abstract/187/1/198/5487160
- Renesto S., Saller F. 2018. Evidence for a semi-aquatic lifestyle in Tanystropheus. https://www.researchgate.net/publication/323723699
- Spiekman S.N.F. et al. 2020. The three-dimensionally preserved skull of Tanystropheus. Current Biology / PeerJ. https://www.cell.com/current-biology/fulltext/S0960-9822(20)31017-4 · https://peerj.com/articles/10299/
- Miedema F. et al. 2020. Cranial morphology of Macrocnemus bassanii. PMC7381672. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7381672/
