# 07 · Devonian: a place in the food web

**Status:** design proposal, 6 September 2026. No Devonian creatures, mechanics, maps or menu options are implemented by this document. Cambrian remains unchanged. This builds on the [era content boundary](06-era-content.md).

## The pitch

You are not becoming the biggest animal in the sea. You are becoming exceptionally good at being your animal.

A trilobite crosses a shell-strewn clearing, gathers food under a coral ledge and finds somewhere safe to moult. Above it, a small fish escapes a hunter by cutting through a gap in the reef. Farther offshore, Dunkleosteus abandons a costly chase and follows the scent of a substantial meal. All three can have a successful run. The trilobite never graduates into the same size class as the fish overhead.

**Recommended roster: 21 mobile animals, with 13 vertebrates and eight invertebrates.** The selection deliberately spans the Devonian rather than pretending to represent one fossil community. Regional expeditions use compatible subsets; an explicitly composite sandbox can offer the whole roster.

The core promise is **different lives in the same living system**. Preserve Cambrian's physical controls, readable danger and couch multiplayer. Change the reasons for moving, feeding, fighting and growing.

## 1. The eras should have different personalities

This comparison describes our game's emphasis, not a claim that Cambrian ecosystems lacked complexity or that evolution was progressing toward a superior kind of animal. Jawed vertebrates diversified extensively during the Devonian, and major fish lineages became more conspicuous. Jaws themselves originated earlier. [NHM fish timeline](https://www.nhm.ac.uk/discover/prehistoric-fish-timeline.html)

| Aspect | Cambrian game today | Proposed Devonian emphasis | Consequence for play and scenery |
| --- | --- | --- | --- |
| Emotional arc | The strange little animal becomes the monster | Learn where you belong, and prosper there | Mastery and ecological success replace a universal Apex finish |
| Animal identity | Alien body plans and signature appendages | Contrasting propulsion, jaws, armour, shells and limbs | A fish, trilobite, sea spider and shelled cephalopod need different movement models |
| Threat | Predominantly relative body length | Feeding compatibility, capture geometry, habitat and condition | A huge plankton feeder is not automatically a hunter of small players |
| Space | A streamed sea organized by distance from shore | Reef architecture, water-column layers, drainage networks and seasonal refuges | Routes branch through crevices, currents, channels and shallow backwaters |
| Resources | Food mainly drives growth | Food maintains condition and completes a species' life cycle | A safe feeding route can matter more than another kill |
| Shoreline | A boundary to the sea | A playable interface for selected animals | Submerged timber, flooded roots and shallow channels create another movement problem |
| Atmosphere | Discovery, pursuit, escalating power | Established abundance, specialization, and intermittent environmental stress | Calm busy reefs alternate with migration, murky water and shrinking refuges |

Devonian reefs deserve architecture, not just a different sponge colour. The Gogo record documents a diverse fish fauna associated with an ancient reef complex. Later Devonian forests add rooted banks, woody debris and a land-to-water connection absent from our Cambrian scenery. These developments did not occur uniformly throughout the entire period. [WA Museum: Gogo](https://museum.wa.gov.au/explore/articles/gogo-fish), [Archaeopteris research](https://www.nature.com/articles/19516)

## 2. Growth ends at your species; progression continues

### Life stages and condition

Use **young → growing → mature**, with species-specific size curves and an adult size envelope. Mature animals continue earning mastery and reproductive success, not unlimited length. Starting age can vary by scenario; do not force every fish through a generic free-swimming larval stage when its life history is uncertain.

Three separate systems replace the common scale ladder:

- **Growth:** nutrition advances development within the chosen species. A trilobite remains centimetre-scale; Dunkleosteus remains metre-scale. Growth cannot change species or trophic guild.
- **Condition:** a forgiving reserve of energy, health and, where relevant, respiratory capacity. Spending it well creates decisions; watching a hunger meter continually decay should not be the main game.
- **Life-cycle success:** a short sequence of ecological objectives followed by a safe settlement or spawning opportunity. Exact breeding behaviour is a game abstraction unless evidenced for the selected animal.

Mastery unlocks choices such as better food discrimination, improved burst efficiency, safer feeding posture or faster recovery from a failed grapple. Avoid permanent account-level combat bonuses and damage scaling that eventually lets every animal kill everything.

**Do not make fish moult.** Their size change should be gradual. Arthropod ecdysis becomes a species-specific refuge event, with a brief vulnerable recovery and clear escape choices. Cephalopod shell growth and vertebrate maturation use their own presentation. Existing Cambrian growth remains available through its own rules.

### Success has a comparable value, not a comparable body count

A first prototype should use 8–12 minute expeditions with three objective stages and a final safe finish. Tune difficulty by time, exposure and available routes, rather than calorie totals alone.

| Life | Example objective sequence | What makes it demanding |
| --- | --- | --- |
| Trilobite | Feed at three fresh patches → relocate across an exposed seam → complete a sheltered moult | Ground-level navigation, recognizing approaching mouths, timing exposure |
| Midwater hunter | Find a productive school → capture suitable prey efficiently → return in good condition | Interception, bite alignment, deciding when to abandon pursuit |
| Dunkleosteus | Locate worthwhile prey or carrion → secure enough food without exhausting reserves → retain access to a feeding area | Committed attacks, handling time, rivals and route width |
| Titanichthys | Locate a dense plankton front → maintain an efficient feeding pass → reach the next productive water mass | Current reading, feeding speed, oxygen and long turns |
| Shallow-water specialist | Feed in a refuge → follow a changing water connection → establish in another pool | Depth, substrate and access to breathing or escape routes |

Give objectives ecological wording. A trilobite should not be told to slay a boss to finish its run. Optional account rewards are discoveries, appearance choices and natural-history entries, with all body types available for ordinary play.

## 3. A food web instead of a universal size rule

Retain size and mass as physical properties. Replace “small enough means edible” with four checks:

1. **Diet:** is this food the animal can use? Plankton, suspended particles, detrital patches, soft prey, shelled prey, fish flesh and carrion are separate resources.
2. **Access:** can its mouth or appendages physically reach the target in this space?
3. **Capture and processing:** can it hold, swallow, shear, crush or extract this target? Gape width, prey cross-section, shell shape, armour and handling time matter.
4. **Motivation:** is the meal worth the pursuit and exposure given current condition? A hungry predator may try something an already-fed one ignores.

Length ratio remains a useful rough UI input, but cannot decide consumption by itself. A long narrow shell, broad armoured fish and compact trilobite with equal length are different mouthfuls.

Example **gameplay food web**, not a claim that all these genera coexisted:

| Resource or encounter | Actors that benefit | Players' decision |
| --- | --- | --- |
| Fine particles and detrital patches | Doryaspis, Bothriolepis, Eldredgeops and Furcaster under their proposed diets | Safe slow feeding versus richer exposed patches |
| Moving plankton fronts | Titanichthys | Follow density and current, not fleeing animals |
| Small mobile invertebrates | Nahecaris, Gemuendina, small fishes and cephalopods | Search structure, expose a mouth, handle the catch |
| Small fishes | Cheirolepis, Cladoselache, Onychodus and larger predators | Intercept or ambush instead of vacuuming a school on contact |
| Large prey or substantial carrion | Dunkleosteus | Spend energy on a meaningful meal; tiny prey cannot sustain it efficiently |
| Crinoid patches | Palaeoisopus under an explicitly inferred feeding interpretation | Climb exposed structure, feed briefly, move before detection |
| Carcass fragments | Appropriate scavengers, including several small animals | A large predator's meal creates a timed opportunity for smaller lives |

No default ambient animal should pursue players forever because it is larger. Titanichthys does not swallow a player just because that player fits inside its open mouth: its feeding interaction samples the configured particle resource. Conversely, shell protection is not immunity to a predator equipped to process it.

Use threat labels such as **hunting you**, **can crack your shell**, **cannot reach this refuge** and **passing through**. These can accompany a compact colour/icon vocabulary; no spreadsheet should be required during a chase.

## 4. Playing a fish versus playing a trilobite

| System | Dunkleosteus | Eldredgeops |
| --- | --- | --- |
| World perception | Distant routes, sizeable prey, passing silhouettes | Nearby cracks, foot placement, moving shadows and mouth approaches |
| Locomotion | Tail-driven acceleration, banking, fin braking and committed turns | Alternating leg waves, traction, ledge transitions and rapid local pivoting |
| Attack | Place the jaw opening around a target; commit to a bite and process the catch | Small food handling; defensive posture and escape against large fish |
| Defence | Present armoured surfaces, turn away, avoid a second attacker during recovery | Enrol or wedge under cover; protection buys time but does not defeat a crushing bite |
| Growth | Gradual fish maturation within a large-bodied species | Intermittent moulting within a small-bodied species |
| Route cost | Turning space and depth; cannot push its head into every feeding crevice | Exposure and surface continuity; cannot cross open water as if it were a fish |
| Good five-minute story | Follow a school, reject an unprofitable chase, contest a carcass, recover | Leave cover at the right moment, gather food, survive a pass, find a moult refuge |
| Bad design to avoid | A fast shark with extra hit points | A miniature tank expected to chip a giant fish to death |

Both remain active and skilful. Small-animal play needs frequent meaningful choices and short travel routes, not real-time hours of crawling. Compress travel time where necessary while preserving relative body sizes and recognizable gait.

Cameras must support the actual size spread. Give each player a body-relative camera, near-plane settings and readable target markers. A tiny teammate can have a world marker without receiving an enlarged physical collision body. Keep micro-refuges collidable at the close player view and ensure they survive scenery LOD changes.

## 5. Suggested roster: 21 distinct lives

**Reading the roster:** the time/locality column is an occurrence anchor, not the complete range of a genus. Size classes are art and gameplay categories, not finalized fossil measurements: **tiny/small** is centimetres to a few decimetres; **medium** is several decimetres to roughly a metre; **large** is metre-scale; **giant** is several metres. Individual species and specimens must be selected before numerical body lengths are committed. Soft tissue, colour, exact locomotor performance and cooldowns are interpretive.

All feeding rules, abilities, benefits and counters below are **proposed game mechanics**. Fossil-backed features and unresolved reconstructions are identified separately. No stationary animals occupy playable slots.

| # | Animal | Occurrence anchor | Size class | Distinct role |
| --- | --- | --- | --- | --- |
| 1 | Dunkleosteus | Late Devonian, Cleveland Shale | Giant | Committed large-prey hunter |
| 2 | Titanichthys | Late Devonian, marine Morocco / Ohio records | Giant | Migrating suspension feeder |
| 3 | Coccosteus | Middle Devonian, Orcadian Basin | Medium | Armoured close-range fish duelist |
| 4 | Bothriolepis | Late Devonian, Miguasha representative | Small–medium | Armoured bottom forager |
| 5 | Gemuendina | Early Devonian, Hunsrück marine basin | Small–medium | Flat-bodied upward ambusher |
| 6 | Doryaspis | Early Devonian, Svalbard | Small | Jawless current-feeding specialist |
| 7 | Cladoselache | Late Devonian, Cleveland Shale | Large | Open-water interceptor |
| 8 | Stethacanthus | Late Devonian representative; specimen gate required | Small–medium | Close-range display and disengagement specialist |
| 9 | Cheirolepis | Middle–Late Devonian; Scottish / Miguasha representatives | Medium | Precise small-fish hunter |
| 10 | Rhinodipterus | Late Devonian, Gogo marine lungfish | Medium | Surface-access and respiratory specialist |
| 11 | Onychodus | Late Devonian, Gogo representative | Medium–large | Tusked ambush and prey retention |
| 12 | Tiktaalik | Late Devonian, Ellesmere Island waterways | Large | Shallow-water bracing and channel crossing |
| 13 | Acanthostega | Late Devonian, East Greenland | Medium | Aquatic limb-assisted manoeuvring |
| 14 | Eldredgeops | Middle Devonian, North American shelf | Tiny–small | Enrolling crevice forager |
| 15 | Walliserops | Devonian, Moroccan representative | Tiny–small | Trident contests and displacement |
| 16 | Jaekelopterus | Early Devonian, Rhineland water bodies | Large | Grasping arthropod predator |
| 17 | Nahecaris | Early Devonian, Hunsrück | Small | Antenna-led scavenger and short swimmer |
| 18 | Furcaster | Early Devonian, Hunsrück | Small | Radial rubble runner |
| 19 | Palaeoisopus | Early Devonian, Hunsrück | Small | Swimming sea spider and structure raider |
| 20 | Manticoceras | Late Devonian, Frasnian marine records | Medium | Coiled-shell jet manoeuvring |
| 21 | Michelinoceras | Early Devonian Sardinian records; specimen gate required | Medium | Straight-shell trim and retreat specialist |

### 1. Dunkleosteus — commit to the bite

**Basis:** armoured head and trunk, powerful gnathal cutting structures. Body proportions and feeding reconstructions continue to be revised; use a robust, deep-bodied interpretation and do not automatically inherit the familiar 8–10 m reconstruction. A recent length study estimated typical adults around 3.1–3.5 m and its largest example around 4.1 m; that is one reconstruction framework, not a universal genus maximum. [Length study](https://doi.org/10.3390/d15030318), [reconstruction study](https://www.palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction)

**Play:** a slow commitment into a very consequential bite, followed by prey handling and recovery. “Shearing bite” processes substantial prey or opens a carcass. Armour protects particular surfaces; turning radius and feeding exposure are its costs. Preserve the terror of its silhouette without giving it effortless pursuit, perfect turning and crushing power simultaneously.

**Art/animation:** heavy tail strokes, visibly coordinated head/jaw motion, fin braking and a clear bite wind-up. Full body and feeding geometry need specimen review; recent work also challenges the familiar strong-suction interpretation, so the prototype should emphasize bite placement. [Jaw-mechanics study](https://doi.org/10.1002/ar.70075) Its mastery is choosing a profitable fight, not grinding small players.

### 2. Titanichthys — enormous without being an apex hunter

**Basis:** giant placoderm with slender, toothless lower jaws. Biomechanical work supports suspension feeding, but a filtering apparatus has not been directly preserved. [Coatham et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/)

**Play:** “Open-water sieve” feeds while maintaining an efficient speed through dense particle bands. Turning too sharply or sprinting sacrifices filtration. Migration and locating productive water are its objectives; low-density water is the main pressure. Its mass can displace animals, but offensive predation is unavailable.

**Art/animation:** continuous low-frequency propulsion, broad mouth opening and a restrained particle trail. Do not invent baleen as established anatomy. This slot is essential: it proves that size no longer predicts trophic rank.

### 3. Coccosteus — the armoured duelist

**Basis:** a smaller arthrodire known from Middle Devonian Scottish fish assemblages. [National Museums Scotland collection review](https://files.nms.ac.uk/production/Documents/Our-Impact/Collections-reviews/Fossil-collections/fossil-review-complete-_review-of-fossil-collections-in-scotland.pdf?dm=1736434705)

**Play:** “Brace and snap” briefly presents head armour, then delivers a short counter-bite. It fights appropriate fish close to cover and feeds on smaller prey. It wins by positioning within tight spaces rather than by becoming a scaled-down copy of Dunkleosteus. Exposed flanks and repeated missed counters are punishable.

**Art/animation:** pronounced front-body armour with a flexible tail, tight yaw corrections and short bites. Default controls teach fish combat at a manageable scale. If testing cannot distinguish its defensive rhythm from Dunkleosteus, it is an early roster cut rather than a cosmetic duplicate.

### 4. Bothriolepis — the living bottom shield

**Basis:** antiarch with a box-like armoured body and jointed armoured pectoral appendages. Bothriolepis canadensis is part of the Miguasha fish collection; detailed diet and locomotion remain reconstruction questions. [Québec collection record](https://www.patrimoine-culturel.gouv.qc.ca/rpcq/detail.do?id=93118&methode=consulter&type=bien)

**Play:** “Bottom brace” resists a current while feeding on configured soft bottom resources. Choose a proposed detrital/small-benthic-food niche, labelled as interpretation rather than certain herbivory. Reposition between patches with short swims; do not make it stationary. Limited turning while braced and exposed appendage motions give predators openings.

**Art/animation:** articulated pectoral movement, tail propulsion and a believable transition onto the substrate. No wheeled-tank movement and no assumption that the armoured fins were terrestrial walking legs.

### 5. Gemuendina — danger immediately above the mud

**Basis:** flattened rhenanid placoderm, superficially ray-like, with upward-facing eyes and a mouth placement that has supported an upward-feeding interpretation. It is not a ray. [Hunsrück review](https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426)

**Play:** “Upward snap” attacks a small vertical zone above the body after quiet repositioning along the floor. This makes altitude a real counter: prey that drops beside the animal or leaves its strike column can escape. Camouflage supports waiting, but food and objectives require relocation.

**Art/animation:** broad pectoral surfaces, mosaic armour and a flexible trailing body. Animate settling, fin adjustments and a short upward strike; avoid copying a modern stingray's underside mouth or adding a venomous barb.

### 6. Doryaspis — the jawless specialist

**Basis:** heterostracan with a conspicuous oral projection and laterally extended shield; material from Svalbard includes caudal anatomy. The projection's exact function and diet should remain explicit uncertainties. [Genus revision](https://www.tandfonline.com/doi/abs/10.1671/0272-4634%282002%29022%5B0735%3ATGDWHF%5D2.0.CO%3B2)

**Play:** assign “Current comb,” a proposed particle-feeding action that rewards positioning along a productive flow seam. It does not become a swordfish: the projection is not a spear attack. Players select between sheltered low-yield routes and exposed richer flow. A rigid shield and poor close combat make routing the skill.

**Art/animation:** tail-powered swimming behind a relatively rigid front body, visible small oral feeding motion, and shield-aware clearance checks. Its niche is precise current use at small scale, distinct from Titanichthys' broad migrations.

### 7. Cladoselache — win the interception

**Basis:** early shark-like chondrichthyan from the Cleveland Shale fauna, with unusually informative preservation among the local fishes. [Cleveland Museum ecosystem project](https://www.cmnh.org/science-conservation/areas-of-study/earth-sciences/projects/saving-a-lost-ecosystem), [Case Western specimen collection](https://caslabs.case.edu/hyde-collection/hyde-collection/)

**Play:** “Intercept burst” commits to a predicted crossing point. Good aim catches a fish in one pass; a miss costs speed and opens a turning window. It is the open-water speed option, vulnerable to structure and armoured prey it cannot process efficiently. Do not build its personality around an unsupported rule that all sharks must swim continuously to breathe.

**Art/animation:** streamlined body, tail-driven acceleration, strong banking and finite braking. Neither hovering like a helicopter nor swimming backwards at full speed should be its optimal tactic.

### 8. Stethacanthus — intimidation with a cost

**Basis:** the distinctive spine-brush complex gives a strong silhouette. The genus spans the Devonian–Carboniferous in the literature; function and reconstruction of the complex require care. Select a demonstrably Devonian specimen before authoring, and do not substitute a Carboniferous Akmonistion model. [Braincase study](https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-the-royal-society-of-edinburgh/article/abs/braincase-of-a-primitive-shark/E11D5DAAAFE25E9196D17BC1C4CCBD9C), [spine-brush anatomy study](https://www.tandfonline.com/doi/abs/10.1080/02724634.1984.10012016)

**Play:** “Broadside display” makes similarly sized AI hesitate briefly while slowing the player. This is an invented use of an uncertain structure, not a proven defensive behaviour. Large predators are unaffected, and human opponents can call the bluff. The animal then pivots toward cover or takes a quick small-prey bite.

**Art/animation:** brush-bearing silhouette and a deliberate lateral presentation. No suction-cup hitchhiking or magical stun. This is a conditional slot: retain it only if the display/disengagement rhythm earns a different playstyle from the other fishes.

### 9. Cheirolepis — the precise small hunter

**Basis:** early ray-finned fish represented in Devonian Scottish and Miguasha assemblages. [Miguasha nomination dossier](https://whc.unesco.org/uploads/nominations/686rev.pdf)

**Play:** “Snap pursuit” chains a short acceleration into a narrow, quick bite. It hunts manageable fish and invertebrates along broken cover rather than racing Cladoselache in open water. A school provides visual distraction and route opportunities, not invulnerability or guaranteed social behaviour attributed to the fossil.

**Art/animation:** fine scale detail, paired-fin corrections and short tail bursts. Its niche is the responsive generalist that remains a small predator throughout the match. A failed capture exposes it to larger hunters; it cannot swallow prey just by touching them.

### 10. Rhinodipterus — access to air is a route decision

**Basis:** marine Devonian lungfish from Gogo with anatomical evidence interpreted as air-breathing adaptation. This is a stronger foundation for a respiratory mechanic than assigning modern lungfish abilities to every Devonian lungfish. [Air-breathing study](https://pmc.ncbi.nlm.nih.gov/articles/PMC2936207/)

**Play:** “Surface gulp” replenishes an air reserve that makes a low-oxygen feeding route temporarily viable. The trip to the surface exposes the player. Normal water should not require repetitive gulping; reserve management matters in specific habitats and events. Feed on appropriate small resources, without giving every lungfish an identical shell-crushing attack.

**Art/animation:** a discrete surface gulp, buccal motion and controlled fin-assisted swimming. No land-running, mud cocoon or aestivation mechanic without separate evidence. This slot creates a different kind of navigation challenge within a marine setting.

### 11. Onychodus — seize, then hold your line

**Basis:** distinctive tusk apparatus and a predatory interpretation supported by a Gogo specimen associated with arthrodire prey. [WA Museum predation paper](https://museum.wa.gov.au/research/records-supplements/records/arthrodire-predation-oncychodus-pisces-crossopterygii-late-devo)

**Play:** “Tusk hold” retains suitable prey after a short ambush. Maintaining alignment sustains the hold; the victim can force release by turning around structure or making the predator lose position. It is a precision grappler, not another sustained chase fish. Large armoured targets remain expensive or inaccessible.

**Art/animation:** anatomically constrained jaw and tusk motion, a clearly visible attachment point, and a release animation. Tusk reconstruction must not become a projectile, extensible spear or detachable weapon. Specialist feeding anchors are a modelling priority.

### 12. Tiktaalik — inhabit the water's edge

**Basis:** flattened head, mobile neck and robust paired-fin skeleton. Recent work supports body support and movement in shallow water; ordinary terrestrial walking should not be assumed. [University of Chicago, 2024](https://biologicalsciences.uchicago.edu/news/how-change-hips-led-evolution-walking)

**Play:** “Plant and pivot” braces against a submerged bank or log so the head can reorient while the body holds position. It accesses shallows where deep-bodied hunters cannot follow. Crossing a barely submerged sill is a slow committed action, not an amphibious sprint shortcut across dry land.

**Art/animation:** body-supported fin planting, neck movement, push-off and tail-led swimming. Keep visible buoyant support and constrained joints. No automatic evolution into Acanthostega: they remain separate animals in different fossil settings.

### 13. Acanthostega — limbs for an aquatic maze

**Basis:** early tetrapod with digit-bearing limbs and strongly aquatic anatomy. Histological study indicates a long aquatic juvenile phase; known growth history is incomplete. [Sanchez et al.](https://www.nature.com/articles/nature19354)

**Play:** “Limb-assisted turn” redirects around submerged branches while the tail provides propulsion. Compared with Tiktaalik's braced ambush, it specializes in weaving through complex flooded structure, gathering small prey and escaping larger fish. Its objective route is underwater, not a land-conquest ladder.

**Art/animation:** eight-digit limb reconstruction where appropriate, splayed paddling and a swimming tail. Avoid a modern salamander walk. Dry exposure is a constraint, and age-specific interpretations must be checked before choosing a representative adult model.

### 14. Eldredgeops — a small life worth mastering

**Basis:** familiar phacopid trilobite, often encountered under the older name Phacops rana, with prominent eyes and an enrolling body. Middle Devonian North American material provides a good recognizable representative. [Devonian Atlas](https://devonianatlas.org/species/eldredgeops-rana/)

**Play:** “Enrol” protects vulnerable undersides and buys a short escape window against suitable attackers. It does not become an invulnerable rolling projectile. Proposed feeding combines soft detrital patches and small accessible food, with exact diet treated cautiously. Crack width, local vision, exposed crossings and moult-site selection matter more than damage output.

**Art/animation:** articulated enrollment with legs and antennae withdrawn, active leg waves while crawling, and unrolling after danger. Enrolled geometry must still be graspable by appropriate predators. Keep it centimetre-scale even at maximum maturity.

### 15. Walliserops — contest space, not hit points

**Basis:** trident-bearing trilobite. A study supports intraspecific combat as a possible function, while later modelling has proposed hydrodynamic alternatives. The function is not settled. [Combat hypothesis](https://pmc.ncbi.nlm.nih.gov/articles/PMC9942788/), [alternative hydrodynamic preprint](https://arxiv.org/abs/2506.15922)

**Play:** “Fork lift” displaces a similar-sized competitor from a feeding patch. Treat it as a playful interpretation of the combat hypothesis: lifting requires approach, contact and leverage. It cannot impale a giant fish or flip anything regardless of mass. Its long front projection makes some narrow routes unusable.

**Art/animation:** an actual rigid trident contact, leg bracing and a short lift, with a recoverable topple for the target. Keep this second trilobite only because positional contests differ from Eldredgeops' enrollment/refuge loop; do not add several more spiny skins.

### 16. Jaekelopterus — the grasping arthropod predator

**Basis:** eurypterid with enlarged prey-catching chelicerae. The famous roughly 2.5 m estimate for J. rhenaniae is extrapolated from an isolated claw, not a complete giant body. Its Early Devonian occurrence must not be silently mixed into a Late Devonian Cleveland ecosystem. [Braddy et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC2412931/)

**Play:** “Clamp and draw” uses two grasping contacts to restrain suitable prey and bring it toward the mouth. Bracing on the substrate improves the hold; swimming trades grip stability for repositioning. Victims escape by twisting, breaking contact or exploiting cover. Flanks and the moment after a failed grasp are vulnerable.

**Art/animation:** coordinated chelicerae, walking limbs and swimming paddles, with a tail that balances motion. No scorpion sting or invented venom. This demonstrates that fish-versus-arthropod is a movement distinction, not a rule that arthropods must all be tiny.

### 17. Nahecaris — steal the opportunity

**Basis:** mobile crustacean-grade arthropod from the exceptionally preserved Hunsrück fauna. Fine feeding behaviour needs review rather than a direct copy of modern shrimp. [Hunsrück arthropod ecology review](https://pubmed.ncbi.nlm.nih.gov/26826500/)

**Play:** “Snatch scrap” collects a small carcass fragment and carries it to shelter, at a swimming penalty. Antenna-led searching and short escape strokes make it an opportunist between hunters' feeding windows. Proposed scavenging is its game niche; it cannot haul whole fish larger than itself.

**Art/animation:** mobile antennae, ventral food handling, swimming appendage cycles and a short reversal. It needs a cargo anchor and a visible carried piece, with a drop action when threatened. This is a transport-and-risk loop, distinct from a Cambrian Waptia-style combat skirmisher.

### 18. Furcaster — change direction without turning a head

**Basis:** Devonian brittle star; reconstructed arm skeletons provide evidence relevant to locomotion. Fossil arm construction should guide the gait rather than assuming every detail of a living brittle star. [Locomotion study](https://rvc-repository.worktribe.com/output/1549616/three-dimensional-visualization-as-a-tool-for-interpreting-locomotion-strategies-in-ophiuroids-from-the-devonian-hunsruck-slate)

**Play:** “Change lead arm” changes movement direction with little whole-body turning, ideal for branching rubble passages. It reaches small detrital or soft-food patches with an arm while the disc stays sheltered. Its exposed disc is vulnerable, and open-water travel is poor. Do not make arm regeneration an instant heal or invulnerability button.

**Art/animation:** coordinated arm contacts, a stable central disc and radial feeding toward the underside mouth. This is an active low-altitude explorer; arm span and disc size need separate collision treatment.

### 19. Palaeoisopus — raid the vertical garden

**Basis:** fossil sea spider with a segmented abdomen and swimming-adapted limbs. Predation on crinoids is an interpretation rather than observed behaviour. [Hunsrück review](https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426)

**Play:** “Perch and feed” lands on reef structure, takes a brief feeding opportunity, then pushes off before attracting a hunter. Alternating swimming and attachment is the skill. Crinoid grazing/predation can be represented by a renewable feeding patch; a stationary crinoid remains scenery/NPC ecology rather than a playable slot.

**Art/animation:** paddle-like limbs must contribute to swimming; attachment uses visible limb contacts rather than hovering. Long appendages are vulnerable in open water. Its vertical perching routes distinguish it from Nahecaris' refuge-to-carcass shuttles and Furcaster's floor maze.

### 20. Manticoceras — the turning shell

**Basis:** Devonian ammonoid with a coiled chambered shell. Shells provide much firmer evidence than soft-body details; avoid presenting a modern nautilus' arm count as established ammonoid anatomy. [Museums Victoria specimen](https://collections.museumsvictoria.com.au/specimens/508262)

**Play:** “Jet turn” spends a stored pulse to redirect or escape, followed by recharge and a relatively exposed feeding extension. It takes small suitable prey and can withdraw into shell protection. Broad shell width limits crevice access, while orientation changes which part an attacker can reach.

**Art/animation:** shell stays rigid while soft parts extend, contract and drive a visible jet pulse. Use conservative, labelled soft-body reconstruction. Do not add ink by default. The central feel is pulse-and-coast movement, not a fish swim animation inside a spiral shell.

### 21. Michelinoceras — keep the long shell aligned

**Basis:** orthoconic cephalopod representative; Devonian occurrences exist, but this broad genus needs a specific vetted Devonian species and specimen before modelling. A generic shop fossil labelled “Orthoceras” is not an adequate reference. [Devonian cephalopod study](https://www.paleoitalia.it/wp-content/uploads/2023/06/05_Gnoli.pdf)

**Play:** “Jet retreat” moves away from the exposed feeding end while preserving shell alignment. The animal manages trim and turning clearance through tall gaps or open water. It can retreat through a passage that admits its narrow cross-section but struggles where its long shell cannot rotate. This contrasts directly with Manticoceras' wider but more compact turning envelope.

**Art/animation:** rigid shell, restrained soft-body extension and a conservative jet direction. Resting orientation, buoyancy distribution and soft anatomy are research gates; do not assume it permanently cruised horizontally or carried modern squid tentacles. The ability name describes the chosen game interaction, not a proven species behaviour.

### Keep the roster selective

Do not add another large arthrodire simply to increase the number of predators. Hold Eastmanosteus and similar candidates in reserve unless they introduce a tested new mechanic. Likewise, adding Eusthenopteron, Panderichthys and several close fish-to-tetrapod forms at once would crowd the ambush/shallow-water niches; the proposed Tiktaalik/Acanthostega pair must already justify two different movement experiences.

Mimetaster is visually excellent but risks repeating the Cambrian Marrella identity. Stationary corals, stromatoporoids, brachiopods and attached crinoids belong in the ecosystem, not the playable 21. Exclude later-period favourites such as Helicoprion and Meganeura. If Stethacanthus or Michelinoceras fails its provenance or gameplay gate, replace the slot after research rather than shipping an attractive but misdated substitute.

## 6. Ecosystems: an anthology of waters

### Historical scope

**Recommended default: regional expeditions with a visible locality and interval.** Unlocks operate across the Devonian collection, but individual scenarios expose compatible animals. Marine and freshwater communities are not automatically connected by a swim-through portal. Exact salinity tolerance is seldom recoverable; broad habitat assignments are conservative design constraints, not species-level physiological measurements.

Offer an optional **Devonian mix** sandbox later for friends who want any combination. Label it as a composite. This is also the appropriate place for Dunkleosteus-versus-trilobite demonstrations when the exact selected species do not overlap in time and place.

Suggested research anchors:

| Setting | Fossil anchor and intended roster subset | Distinct experience |
| --- | --- | --- |
| Hunsrück mud shelf | Early Devonian; Gemuendina, Nahecaris, Furcaster, Palaeoisopus; other residents vetted locally | Small-scale structure, suspended sediment, short swimming and crawling routes |
| Moroccan shelf | Devonian interval selected around Walliserops; matching contemporaries required | Trilobite contests, shell pavements, isolated cover and current-exposed feeding |
| Orcadian lake | Middle Devonian; Coccosteus and a local Cheirolepis species | Shore-to-deep-water gradients, fish competition, fluctuating lake connections |
| Gogo reef system | Late Devonian; Onychodus and Rhinodipterus, with local fish and invertebrate NPCs | Vertical reef passages, feeding ambushes, contrasting oxygen conditions |
| Miguasha waterway | Late Devonian; Bothriolepis and Cheirolepis representatives | Bottom foraging versus small-fish pursuit in a sediment-rich setting |
| Cleveland offshore sea | Latest Devonian; Dunkleosteus, Cladoselache and vetted associated fauna | Big routes, expensive hunts, carcasses and water-column tension |
| Ellesmere / Greenland waterways | Separate Late Devonian chapters for Tiktaalik and Acanthostega | Shallow support, submerged woody obstacles and changing pool connections |
| Svalbard water bodies | Early Devonian; Doryaspis and locally researched fauna | Jawless feeding and flow positioning without forcing it into a tropical reef |

Titanichthys, Manticoceras and Michelinoceras receive a specific regional assignment after species selection. They are not automatically residents of every marine chapter. These are research and production candidates, not eight launch maps promised at once.

### Scenery should change decisions

Build reusable habitat features, then assemble appropriate ones for each regional chapter:

| Feature | Art direction | Mechanical purpose |
| --- | --- | --- |
| Reef buttresses and overhangs | Massive stromatoporoid forms, tabulate colonies, solitary rugose corals, pale carbonate faces | Mouth-sized entrances, ambush columns, sheltered turns and routes inaccessible to large fish |
| Crinoid gardens | Fine articulated stems and feeding crowns, suspended particles | Vertical attachment routes, food patches and silhouettes broken by motion |
| Shell pavements | Brachiopod accumulations, broken shell, shallow sediment ripples | Centimetre-scale refuge networks; noisy exposed crossings; food trapped in lee pockets |
| Reef edge and open shelf | Stronger shafts of light, visible current lanes, deep blue beyond ledges | School interception and plankton migration without filling every space with obstacles |
| Quiet muddy basin | Settling flecks, subdued light and distant silhouettes | Carrion events and oxygen gradients; provide advance cues before an unsafe zone |
| Lake margin | Fine sediment, local early plants and exposed substrate appropriate to the selected interval | Receding-water routes, bottom feeding, water-depth decisions |
| Later Devonian rooted bank | Woody roots, fallen branches, spore-bearing vegetation and stained runoff | Buoyancy-supported bracing, small refuges, changing shallow connections |
| Flooded forest edge | Broken canopy reflections and submerged timber, only in suitable later settings | A navigable three-dimensional maze for limb-assisted swimmers |

No modern flowering reeds, grass lawns, mangrove trees, seagrass meadows, modern coral taxonomy or default giant Carboniferous swamp forest. Algae and rooted land plants have different roles; not every underwater green shape is a leafed plant. Forest stature and composition changed through the Devonian. [Middle Devonian forest ecosystem study](https://pmc.ncbi.nlm.nih.gov/articles/PMC8409631/)

Scenery scale is part of balance. A refuge needs an entrance, a protected interior and at least one tactically useful exit. An invulnerable hole next to infinitely renewing food is not a habitat; it is a camping exploit. Food depletion, short foraging circuits and changing local opportunities encourage movement without turning every refuge into a trap.

## 7. New experiences to prototype

### A. The meal becomes a meeting place

A large predator opens a carcass. Small scavengers wait outside its feeding arc, dart in for fragments, then transport food into cover. A rival fish arrives; the first predator must choose between defending its investment and leaving with enough energy. The carcass has finite nutrition and different usable pieces. This is a shared event with different objectives, not a raid in which every player attacks the same health bar.

### B. The moving plankton front

Particles collect along a current seam. Titanichthys follows the seam efficiently; small swimmers use its movement as temporary visual cover, at their own collision risk. Nearby predators hunt the smaller animals rather than treating the giant filter feeder as the event's universal boss. Currents, resource density and turning costs make route planning the main action.

### C. The refuge changes with the water

A slowly falling water level narrows an escape channel. A trilobite has a safe ledge but dwindling food; a fish must leave before its depth margin disappears. A shallow-water animal can take a different submerged route. Telegraph the change with moving shore marks, exposed substrate and animal movement. Do not punish players with an invisible salinity or oxygen timer.

### D. The water column compresses

An oxygen-poor zone grows upward, concentrating animals in remaining habitable water. Air access gives Rhinodipterus an alternative, not total immunity. The event changes routes and encounter rates. Anoxia is a plausible Devonian theme, but this short scenario is a game abstraction; do not compress the entire Late Devonian extinction into a routine instantaneous poison wave or claim one settled cause.

### E. The tiny crossing

At a trilobite's scale, a few body lengths of open sediment form a dangerous journey. Passing fins disturb light and particles; a predator's mouth cannot follow into a correctly sized crack. A second small player can exploit the same distraction without becoming an MMO healer. Success feels like completing a route under pressure.

### F. The shallow ambush

Tiktaalik braces behind a submerged log. The player turns the head toward a prey route, chooses when to push off, and risks losing the favourable position. Acanthostega's separate scenario emphasizes continuous manoeuvring among branches instead. Distinguish these prototypes before committing both expensive limb rigs.

## 8. Modes and cooperative balance

**Life in the reef / waterway** should be the main mode: choose a regional animal, meet ecological objectives, survive an event, and finish in good condition. It supports peaceful and predatory lives equally.

**Food-web co-op** gives compatible species different contributions to a shared expedition. Credit comes from completing role objectives during the same event window, not from dividing kill experience. Avoid mandatory artificial symbioses or an expectation that predators can never threaten smaller creatures in ordinary ecology. In co-op, player predation can be disabled as a clearly identified game rule.

**Asymmetric pursuit** is a separate competitive mode. One hunter tries to intercept prey; the others complete routes and escape. Rotate roles between short rounds. Prey are not expected to kill the hunter. Match suitable movement/habitat combinations, rather than offering unrestricted four-way deathmatch as the default balance target.

**Devonian mix sandbox** permits the deliberate anthology and experimental matchups, with its historical-composite label. It should not be the reference mode for documentary claims or food-web balancing.

Prevent dull extremes: predators need viable prey opportunities without being spoon-fed a kill; small players need exposed but achievable objectives without endless hiding; slow crawlers need dense local decisions; filter feeders need navigational action rather than a “hold mouth open” timer. Shared event timing and nearby parallel routes help couch players stay in the same story even when their bodies differ enormously in scale.

## 9. Animation, senses and interaction contracts

Reuse the anchor and animation infrastructure, not a single movement recipe.

| Body plan | Required distinct motion | Contacts and state that the engine needs |
| --- | --- | --- |
| Tail-driven fish | Speed-dependent tail amplitude, banked turns, braking, bite and prey handling | Mouth/gape, throat, jaw attack sweep, feeding hold; authored armour regions |
| Bottom-associated fish | Swim/settle/brace transitions and substrate-relative posture | Support contacts and clearance; no fake continuous foot cycle |
| Limb-assisted vertebrate | Buoyant paddling, supported planting, push-off, neck aim where anatomical | Limb end effectors, supported versus swimming state, shallow-water constraints |
| Trilobite | Leg waves, antenna motion, enrollment or trident bracing, ecdysis | Ground contacts, mouth, body outline in protective posture; trident contact if present |
| Eurypterid / crustacean | Walk/swim blend, grasp, carry and escape | Paired grasp contacts, mouth, cargo, support contacts |
| Sea spider | Swimming strokes, landing, perching and departure | Multiple attachment contacts, feeding reach and detachment |
| Brittle star | Lead-arm changes and coordinated disc movement | Arm contacts, central mouth, separate disc and appendage reach |
| Shelled cephalopod | Jet pulse, coast, soft-part extension and withdrawal | Feeding end, jet direction, shell collision volume and trim |

Every selected animal needs an authored version of the applicable game actions: idle, locomotion, turning, vertical movement where possible, feeding, primary interaction, defence, escape, hit, stagger and death. Viewer controls should display the supported action set. A no-bite feeder gets a feeding/interaction action instead of a fictional jaw attack. Fish do not need an ecdysis clip just to satisfy a Cambrian name list.

Fish should not all hover, but nor should they all be given identical negative buoyancy. Do not assume universal swim bladders, universal ram ventilation, exact electroreception or modern sensory ranges. Expose sensing profiles only where justified and label speculative capabilities. Use motion trails, occlusion, substrate vibration cues and current direction to produce information differences without pretending their precise fossil sensory physiology is known.

Retain mouth, swallowing and attack anchor compatibility. Add capability-driven optional support, jet, cargo and armour data. A long shell, a broad fish and a radial arm span require more than the current spherical body radius to make the proposed spaces work.

## 10. Implementation sequence and limits

The era refactor already supplies roster, ecology and presentation boundaries. This proposal requires additional engine work; inserting the 21 definitions into the current Cambrian scale-and-diet rules would not realize it.

1. **Prove three lives with inexpensive prototypes:** a small trilobite, a large biting fish and a large suspension feeder. Use an explicitly composite test habitat. Build species-bounded growth, diet-aware consumption, refuge clearance and comparable objective completion. Preserve Cambrian behind its existing progression/interaction policy.
2. **Prove the other movement families:** jetting shell, radial crawler and substrate-supported fish. Measure input feel, visibility, camera scale and contact accuracy before commissioning all final models.
3. **Deliver one researched regional expedition:** choose a locality and compatible starter subset, fill its food web with lightweight NPCs, and validate scenery/food/oxygen routes. Do not claim a completed historical ecosystem solely from the playable roster.
4. **Expand toward all 21:** author reviewed models in groups by rig family, but require a distinct playtest for each animal. Every addition needs provenance, diet uncertainty, body-size rationale, animation coverage and full/LOD anchors.
5. **Add later systems only after the ordinary life is fun:** changing water levels, hypoxic events, reproductive objectives and asymmetric versus. Defer elaborate persistent genetics, breeding simulations and broad dry-land traversal.

Likely new content concepts are `lifeHistory`, `feedingProfile`, `locomotionProfile`, `habitatAffinity`, `interactionGeometry`, `senseProfile` and `objectiveSet`. These are design concepts, not approved API names. A separate region/scenario definition should select time, locality, compatible roster, terrain and resources. Keep the era-wide catalogue separate from an individual encounter population.

Acceptance criteria for the first prototype:

- A mature trilobite remains small, has a rewarding run and never needs to damage a giant to progress.
- Titanichthys can complete objectives without hunting animals or exploiting collision consumption.
- Dunkleosteus has meaningful failed-hunt costs and cannot farm tiny players efficiently.
- A refuge excludes predators by geometry at every relevant LOD; no invisible invulnerability region substitutes for it.
- Fish feeding does not trigger arthropod moulting, and unsupported attacks do not appear in the viewer.
- Two players of very different sizes remain readable and have comparable useful activity, without equalizing physical size.
- At least one pair with similar size has a different predator/prey outcome because of diet, armour, gape or habitat.
- Seeded simulation stays reproducible and existing Cambrian regressions remain green.

## 11. Research gates before final art

The references beside entries establish a starting point, not a complete model-authoring bibliography. Before production, select species-level exemplars, inspect actual specimens and obtain reconstruction references for all hidden anatomy. Record date/locality, length estimate and its uncertainty, environmental interpretation and confidence in the feeding/locomotion model.

Prioritize Dunkleosteus proportions and feeding kinematics; Titanichthys' unpreserved filtering anatomy; Doryaspis' feeding interpretation; Devonian provenance for Stethacanthus; species identity and trim for Michelinoceras; cephalopod soft parts; and the actual joint limits of Tiktaalik/Acanthostega. Walliserops' combat hypothesis must remain labelled amid alternatives. Do not use an adult-size estimate from an uncertain specimen as a universal growth endpoint without review.

The strongest initial artistic contrast is already clear: **armoured jaws in open water, small articulated animals inside structural refuges, and supported bodies negotiating the edge of water.** Build those contrasts into movement, food and space before adding more spectacular silhouettes.
