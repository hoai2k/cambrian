# Creature expansion: 21 mobile animals

The roster adds 13 animals to the original eight. Every addition is selectable,
spawns in the ecosystem, has a skinned model and dedicated action clips, and
supports the same controller and keyboard verbs. No sessile animal is playable.

The setting is now a **Cambrian collection inspired by the Burgess Shale**.
Vetulicola (Chengjiang) and Tamisiocaris (Sirius Passet) are clearly labelled in
selection; this mixed assemblage is not a claim that all 21 taxa coexisted in
one place or time. Olenoides remains the representative trilobite.

## Distinct bodies and play styles

Numbers are balance parameters, not fossil measurements. Physical size is
compressed to preserve playability, as in the original game. Abilities are
invented interactions inspired by anatomy, not established fossil behavior.

| Creature | Anatomical identity / locomotion | Gameplay and special ability | Tradeoff |
| --- | --- | --- | --- |
| Pikaia gracilens | Laterally compressed chordate, axial muscle bands, continuous lateral body wave | Narrow collision profile, bottom deposit feeding; Ribbon slip breaks tracking and grants 0.3 s entry protection, then 3.6 s of faster weaving | Fragile, low damage |
| Nectocaris pteryx | Lateral fins, two long tentacles, prominent eyes; fin-driven swimming | Paired seize heavy can grapple; Tentacle seize pulls and clamps a forward target during a 1.2 s performance | Capture can miss; weak armor |
| Burgessomedusa phasmiformis | Bell pulsation with delayed motion through the tentacle fringe | Radial light/heavy; Bell corral strikes each nearby enemy once and pushes them away over 3.6 s | Broad, soft, slow acceleration |
| Odaraia alata | Tube-shaped carapace, large eyes, numerous limbs, three tail blades; inverted swimming reconstruction | Long glide, all-tier bloom feeding; Collector wake draws tiny wild snacks inward and triples bloom intake for 3.6 s | Turns slowly; weak finishing damage |
| Ottoia prolifica | Annulated retractile trunk and hooked eversible introvert; crawling | Sediment dive remains mobile for 2.4 s, hides from tracking until emergence, and ends in a frontal hooked strike | Entry protection only 0.3 s; not immune throughout burrowing; no free swimming |
| Cambroraster falcatus | Broad eye-notched shield, feeding basket and flaps | Wide sweep attacks; Basket rake exposes animals and pulls smaller victims through a broad forward arc in 1.2 s | Wide collision profile and slow turning |
| Sidneyia inexpectans | Nine thoracic segments, narrow posterior rings, tail fan, crushing limb bases | Ground-based shell crusher; heavy bypasses 50% of armor, Shell crush bypasses 75% and breaks guard in 1.2 s | Short reach, committed wind-up; bottom movement is a gameplay simplification of nektobenthic ecology |
| Leanchoilia superlata | Great appendages with three terminal whips each, stalked eyes and swimming limbs | Long sensing range, sweeping heavy; Whip search reveals nearby animals and pulls small wild snacks for 3.6 s | Fragile and low direct damage; range complements rather than duplicates Opabinia's single-target snatch |
| Isoxys acutangulus | Bivalved shield with long anterior/posterior spines, eyes, raptorial and swimming limbs | Fast interception; Spine intercept commits to a forward pass and hits each enemy once over 1.2 s | Turn commitment is punishable |
| Odontogriphus omalus | Flat unarmored body, broad foot, radula-like feeding apparatus; low crawling | Graze while moving; Adhesive glide reduces incoming damage and resists displacement, triples grazing for 3.6 s | No hard shell and short reach; adhesion is a game mechanic |
| Ctenorhabdotus capulus | 24 comb rows arranged as eight triplets, smooth ciliary propulsion; no invented long tentacles | Low drag and all-tier bloom feeding; Comb cruise accelerates, recovers stamina, and reduces damage for 3.6 s | Soft, low damage; bloom particles abstract small suspended food, not a claim of herbivory |
| Vetulicola cuneata | Broad anterior chamber with openings and a segmented tail; tail-driven swimmer | All-tier bloom feeder; Pharyngeal pump increases speed and quadruples intake for 3.6 s | Depends on locating blooms; pumping performance is reconstructed |
| Tamisiocaris borealis | Radiodont with finely bristled filtering appendages and reconstructed flapped body | All-tier specialist bloom feeder; Plankton comb gathers forward wild snacks and multiplies bloom intake by five for 3.6 s | Low damage and exposed apparatus; full body proportions are uncertain |

## Ecological progression and AI

- Filter-feeders gain nutrition from bloom volumes at every size tier, rather
  than losing this route above the original larval length cutoff. Ability
  multipliers apply only while the relevant ability is active inside a bloom.
- Deposit feeders and grazers need microbial mats close to the bottom. They
  retain mobility during their feeding abilities. Wiwaxia's original stationary
  grazing condition is preserved.
- AI filter-feeders seek the nearest bloom; grazers seek/occupy flats. They can
  defend themselves and flee, but no longer choose ordinary prey hunting ahead
  of their specialized feeding route.
- Ambient species selection uses the full roster. Existing redundant open-reef
  schools are replaced with new species without raising the school population.
- Rise-mode allied players are excluded from new ability damage and pull effects.
- Feeding classifications guide gameplay, but standard attacks and corpse/snack
  consumption remain accessible to all players for the shared game rules.

## Art direction and reconstruction boundaries

Use natural patterned tissue and cuticle, anatomical relief, articulated limbs,
soft tissue folds, and membrane detail. Pigmentation, exact tissue translucency,
and action performance are artistic reconstruction. Ciliary shimmer is visual
material treatment; it is not evidence for fossil bioluminescence.

Pikaia follows the 2024 revised orientation. Nectocaridids are interpreted in
light of 2025 work supporting chaetognath affinities; Nectocaris must not acquire
an assumed squid siphon, eight arms, ink attack, or automatic jet propulsion.
Cambroraster's sediment sifting versus suspension feeding is debated: the game
uses a basket sweep without claiming a settled feeding model. Tamisiocaris's
filter appendage is well supported, but the complete body is more speculative.

## Animation contract

All new rigs face +Z with +Y up after glTF export, keep the root fixed, and use
rotation/translation skinning rather than animated scale. Authored locomotion
owns the new animals' deformation; the legacy procedural spine wave is disabled
for them. The engine retains navigation, banking, pitch, hit timing and growth.

Required clips: Idle; Swim or Crawl; Attack; Hit; Death; TurnLeft; TurnRight;
Dive; Rise; Bite (0.5 s); Heavy (1.1 s); Guard (1 s loop); Parry (~0.35 s);
Dodge (0.4 s); Eat (0.8 s loop); Stagger (1.2 s); Ability (1.2 s loop);
Moult (1.5 s loop). Nectocaris additionally has Grab (0.9 s).

Ability duration is gameplay duration, independent of the repeating 1.2 s
performance. The loop continues while movement remains controllable, except
Isoxys's committed pass. On interruption, active ability effects stop. Each
new damaging ability tracks targets to prevent repeated damage every frame.
Locomotion and held actions must have matching endpoint poses; one-shot attacks
return to neutral, while Death ends in a collapsed pose. Wind-up, strike and
recovery should read at ordinary game camera distance.

Per-animal sources, geometry/rig statistics, renders, and clip manifests are
kept with the authoring delivery. See [technical plan](02-technical-plan.md)
and [animation brief](../animation-brief.md) for integration and verification.

## Attachment integration and delivery

Every new full/LOD model carries the shared v1 mouth, inner-mouth and primary
attack sockets. Dedicated feeding appendages also carry grasp/paired contacts
and CCD chains; body, root and locomotor bones are excluded. The 150 sockets
per detail level attach existing grabbed/swallowed actors to animated anatomy.
The merged [attachment runtime](../creature-anchors.md) also guides articulated
attack contacts and corpse transfer for all rigs. New animals keep their
authored Eat loops; Opabinia additionally scrubs its special feeding
performance against consumption progress.

Editable Blender scenes and intermediate review images stay in
`cambrian/local/expansion-authoring/`. Committed sources, neutral ImageGen
cuticle input, tissue normal-map generators, packaging and anchor manifests
live in `tools/creatures/`. Full models retain all actions/textures; actual
reduced LODs retain locomotion/death and vertex pigmentation. The preview,
transparent hero card and small grid thumbnail are generated from each model.

## Scientific references

- [ROM fossil gallery](https://burgess-shale.rom.on.ca/fossil-gallery/) and its
  accounts for [Odaraia](https://burgess-shale.rom.on.ca/fossils/odaraia-alata/),
  [Ottoia](https://burgess-shale.rom.on.ca/fossils/ottoia-prolifica/),
  [Sidneyia](https://burgess-shale.rom.on.ca/fossils/sidneyia-inexpectans/),
  [Leanchoilia](https://burgess-shale.rom.on.ca/fossils/leanchoilia-superlata/),
  [Isoxys](https://burgess-shale.rom.on.ca/fossils/isoxys-acutangulus/),
  [Odontogriphus](https://burgess-shale.rom.on.ca/fossils/odontogriphus-omalus/),
  and [Ctenorhabdotus](https://burgess-shale.rom.on.ca/fossils/ctenorhabdotus-capulus/).
- [Mussini et al. 2024, revised Pikaia anatomy](https://ora.ox.ac.uk/objects/uuid%3A0226b53e-a5c0-4494-b889-570095417ef6).
- [Bristol: 2025 nectocaridid study](https://www.bristol.ac.uk/biology/news/2025/ancient-squid-like-creatures-are-not-squid-after-all-study-finds.html).
- [ROM: swimming Burgessomedusa](https://www.rom.on.ca/news-releases/royal-ontario-museum-researchers-identify-oldest-known-species-swimming-jellyfish).
- [ROM: Cambroraster](https://www.rom.on.ca/news-releases/voracious-cambrian-predator-cambroraster-new-species-burgess-shale-discovered-rom);
  [alternative feeding interpretation](https://pmc.ncbi.nlm.nih.gov/articles/PMC8292756/).
- [Vetulicolian pharynx and gill slits](https://pmc.ncbi.nlm.nih.gov/articles/PMC3517509/).
- [Tamisiocaris suspension feeding, Nature 2014](https://www.nature.com/articles/nature13010).
