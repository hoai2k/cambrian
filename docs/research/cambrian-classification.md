# Cambrian roster: the everyday group each animal belongs to

Research brief, September 2026. Companion to `docs/research/devonian-classification.md`, which set
the pattern. The data lives in `src/content/cambrian/creatures.ts` and
`src/content/cambrian/expansion.ts` as two fields per animal — `kind` (two or three everyday words)
and `kindNote` (one plain sentence saying what that group is). `tools/era-test.mjs` checks them, and
holds the list of animals that deliberately have neither.

**Why, and the one rule the Devonian did not need.** A group label earns its place when it lands an
unfamiliar genus somewhere familiar: "Sidneyia" says nothing, "Trilobite relative" says plenty. The
Cambrian is the other way round for its famous animals — *Anomalocaris* is a household fossil and
"radiodont" is a word almost nobody has met. So the Cambrian adds a rule to the Devonian's:

> **If the group name is less familiar than the genus it sits beside, show nothing.**

Everything else carries over from the Devonian brief: everyday words over rank names, the precise
clade goes in the sentence, and the note describes the **group**, never the individual's behaviour —
behaviour is what `role`, `tagline`, `passive` and `weakness` are for.

## Labelled

| Animal | Group shown | Clade | Notes |
| --- | --- | --- | --- |
| Waptia | Bivalved arthropod | Hymenocarina, Mandibulata (stem) | Shrimp-shaped, under a folded two-valved carapace. "Hymenocarine" is the sentence's job. |
| Canadia | Bristle worm | Polychaeta, Annelida | "Bristle worm" is the everyday name for polychaetes; the Burgess Shale ones sit outside any living subgroup (Conway Morris 1979; Parry & Caron 2019). |
| Hallucigenia | Velvet worm kin | Hallucigeniidae, Lobopodia | Hallucigeniids resolve as stem-group onychophorans on the cone-in-cone structure of the claws (Smith & Ortega-Hernández 2014), so the living velvet worms are the reference point. |
| Wiwaxia | Early mollusc | Halwaxiida, Lophotrochozoa | Mollusc or annelid stem has been argued both ways; the mouthparts read as a molluscan radula (Smith 2012). The note says so rather than pretending it is settled. |
| Marrella | Early arthropod | Marrellomorpha | An arthropod branch of its own, with no living descendants; "marrellomorph" is not a word to print on a card. |
| Olenoides | Trilobite | Corynexochida, Trilobita | The one Cambrian group everyone already knows. |
| Pikaia | Early chordate | Chordata (stem) | Reaffirmed as a stem chordate, and reoriented the other way up, by Mussini et al. 2024. |
| Burgessomedusa | Jellyfish | Medusozoa, likely stem Cubozoa | The oldest unequivocal swimming medusa (Moon, Caron & Moysiuk 2023). "Jellyfish" is exactly right and exactly familiar. |
| Odaraia | Bivalved arthropod | Hymenocarina, Mandibulata | Mandibles finally described in 2024, placing it among the earliest mandibulates (Izquierdo-López & Caron 2024). |
| Ottoia | Priapulid worm | Ottoiidae, Archaeopriapulida | Priapulids are nicknamed penis worms; the note carries the nickname and the fact that the group still lives in sea-floor mud. |
| Cambroraster | Anomalocaris kin | Hurdiidae, Radiodonta | Here the familiarity rule runs the other way: the genus is obscure and *Anomalocaris* is the anchor, so the label points at the famous relative and the note names the group as radiodonts. |
| Tamisiocaris | Anomalocaris kin | Tamisiocarididae, Radiodonta | Same anchor; the filter-feeding branch (Vinther et al. 2014). |
| Sidneyia | Trilobite relative | Vicissicaudata, Artiopoda | Artiopoda is the group that also holds the trilobites, so the label is literally true and instantly placed. |
| Leanchoilia | Early arthropod | Leanchoiliidae, Megacheira | Great-appendage arthropods, read either as stem-euarthropods or as the start of the chelicerate line; the note gives both. |
| Isoxys | Bivalved arthropod | Isoxyidae, Euarthropoda (stem) | Bivalved carapace over the whole animal, with raptorial front appendages; an early branching stem-euarthropod. |
| Odontogriphus | Early mollusc | Mollusca (stem) | Radula, broad foot, ctenidia in a mantle groove (Caron et al. 2006); same caveat as Wiwaxia, which the note carries. |
| Ctenorhabdotus | Comb jelly | Ctenophora | "Comb jelly" is the everyday name, and the Cambrian ones had 24 comb rows against a living ctenophore's eight. |

## Deliberately unlabelled

These four show the genus alone. `tools/era-test.mjs` lists them, so a new animal cannot quietly
arrive without the decision being made.

| Animal | Why no label |
| --- | --- |
| Anomalocaris | The genus is the famous one. "Radiodont" is the group, and printing it beside *Anomalocaris* explains the known by the unknown. |
| Opabinia | Same: *Opabinia* is a museum-poster animal, "opabiniid" is not a word a player has met. |
| Nectocaris | The group is not settled. Described as a stem cephalopod (Smith & Caron 2010), disputed as a panarthropod, and more recently argued to be a stem chaetognath (arrow worm). Nothing everyday is safe to print. |
| Vetulicola | Vetulicolians are somewhere in the deuterostomes — stem deuterostomes, or tunicate relatives, or arthropods, depending on the analysis (Aldridge et al. 2007). No everyday group exists yet. |

## Sources

- Hallucigenia's claws and onychophoran affinity: Smith & Ortega-Hernández 2014, "Hallucigenia's
  onychophoran-like claws and the case for Tactopoda", *Nature* 514:363–366.
  <https://www.nature.com/articles/nature13576>
- Odontogriphus and Wiwaxia mouthparts as a molluscan radula: Smith 2012, "Mouthparts of the Burgess
  Shale fossils *Odontogriphus* and *Wiwaxia*", *Proc. R. Soc. B* 279:4287–4295.
  <https://royalsocietypublishing.org/rspb/article/279/1745/4287/74339/Mouthparts-of-the-Burgess-Shale-fossils>
- Pikaia as a stem chordate, reoriented: Mussini et al. 2024, "A new interpretation of *Pikaia*
  reveals the origins of the chordate body plan", *Current Biology*.
  <https://www.cell.com/current-biology/fulltext/S0960-9822(24)00669-9>
- Burgessomedusa as a medusozoan: Moon, Caron & Moysiuk 2023, "A macroscopic free-swimming medusa
  from the middle Cambrian Burgess Shale", *Proc. R. Soc. B* 290:20222490.
  <https://royalsocietypublishing.org/rspb/article/290/2004/20222490/79694/A-macroscopic-free-swimming-medusa-from-the-middle>
- Odaraia as a mandibulate: Izquierdo-López & Caron 2024, "The Cambrian *Odaraia alata* and the
  colonization of nektonic suspension-feeding niches by early mandibulates", *Proc. R. Soc. B*
  291:20240622. <https://royalsocietypublishing.org/rspb/article/291/2027/20240622/104619/>
- Tamisiocaris as a filter-feeding radiodont: Vinther et al. 2014, *Nature* 507:496–499; summary at
  <https://en.wikipedia.org/wiki/Tamisiocaris>
- Sidneyia within Artiopoda (the group holding trilobites):
  <https://en.wikipedia.org/wiki/Sidneyia>, <https://en.wikipedia.org/wiki/Artiopoda>
- Canadia as a Burgess Shale polychaete: Parry & Caron 2019, "*Canadia spinosa* and the early
  evolution of the annelid nervous system", *Science Advances* 5:eaax5858.
  <https://www.science.org/doi/10.1126/sciadv.aax5858>
- Ottoia as an archaeopriapulid: Smith, Harvey & Butterfield 2015, "The macro- and microfossil record
  of the Cambrian priapulid *Ottoia*", *Palaeontology* 58:705–721.
  <https://onlinelibrary.wiley.com/doi/10.1111/pala.12168>
- Isoxys as a stem euarthropod with raptorial appendages: Legg & Vannier 2013, "The affinities of the
  cosmopolitan arthropod *Isoxys*", *Lethaia* 46:540–550.
  <https://onlinelibrary.wiley.com/doi/10.1111/let.12032>
- Nectocaris' contested affinity: Smith & Caron 2010, *Nature* 465:469–472, and the reply
  "Once again: is *Nectocaris pteryx* a stem-group cephalopod?", *Lethaia* 2011.
  <https://onlinelibrary.wiley.com/doi/10.1111/j.1502-3931.2011.00296.x>
- Vetulicolian systematics: Aldridge et al. 2007, "The systematics and phylogenetic relationships of
  vetulicolians", *Palaeontology* 50:131–168.
  <https://onlinelibrary.wiley.com/doi/full/10.1111/j.1475-4983.2006.00606.x>
- Ctenorhabdotus as a Burgess Shale ctenophore: Conway Morris & Collins 1996, and the ROM's Burgess
  Shale entry. <https://burgess-shale.rom.on.ca/fossils/ctenorhabdotus-capulus/>
