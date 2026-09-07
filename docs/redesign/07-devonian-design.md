# 07 · Devonian creatures, environments and asset brief

**Status:** proposed natural-history and art inventory, 6 September 2026. This document describes what to depict and which images and 3D models to create. It does not specify gameplay, abilities, objectives, progression, combat or controls. The gameplay design that builds on this inventory is [08 · Devonian Domination](08-devonian-domination.md). Model production and asset integration are tracked separately in the [Devonian specimen library](../devonian/README.md); this brief remains the natural-history reference.

**Scope:** 21 mobile creature subjects, plus regional environments, plants, attached organisms, geological props and supporting textures. Stationary organisms are important environmental subjects, but do not count toward the 21-creature roster. The existing [era content boundary](06-era-content.md) provides a future home for the resulting assets.

## 1. The visual and natural-history identity

The Devonian should read as a collection of richly differentiated aquatic worlds: armoured fishes, early sharks, ray-finned and lobe-finned fishes, shelled cephalopods, trilobites and other invertebrates; reefs with substantial skeletal structure; and, in appropriate later settings, wooded banks and submerged timber.

Relative to the current Cambrian collection, the strongest new visual subjects are **jaws and armoured fish heads, several genuinely different fish silhouettes, chambered shells, varied reef-building organisms, and bodies at the boundary between fins and limbs**. Jawed vertebrates diversified during the Devonian, but jaws originated earlier. This is not a transition from “primitive” animals to superior ones. [NHM fish timeline](https://www.nhm.ac.uk/discover/prehistoric-fish-timeline.html)

A trilobite and Dunkleosteus are different-sized organisms, not the same animal at different stages. References and scale plates should preserve that distinction: centimetre-scale animals do not become metre-scale giants for visual uniformity. Use camera framing for individual portraits rather than altering anatomical proportions or implying equal real-world length.

Devonian is an interval, not a single place. Early Devonian Hunsrück animals, Middle Devonian lake fishes and Late Devonian Cleveland or Gogo fishes do not all belong in one documentary scene. The regional boards below are separate reference environments. Plant distributions, water chemistry and forest structure must be checked for each locality and interval.

### Evidence and interpretation

- **Supported:** preserved anatomy, specimen provenance and observations directly described in cited research or collection records.
- **Inferred:** feeding, resting posture, locomotion and soft tissue reconstructed from anatomy or related organisms. Mark these on reference boards.
- **Artistic:** colours, patterns, lighting and most soft-surface appearance. Aim for coherent naturalistic animals without calling speculative pigmentation fossil evidence.

Every final asset should have a species-level or explicitly genus-level identity, a specimen/reference list, an age/locality, a size rationale and a short uncertainty note. Retain original source files and distinguish reference photographs from newly generated illustrations. Generated images can help explore materials and appearance; they cannot serve as anatomical evidence.

## 2. Creature roster overview

These are **21 subjects**, not 21 already-approved reconstructions. “Occurrence anchor” names a useful starting record, not the entire range of a genus. Approximate scale language is deliberately broad until a representative species and specimen have been chosen; it is not a table of fossil maximum lengths.

| ID | Subject | Occurrence anchor | Characteristic silhouette / surface |
| --- | --- | --- | --- |
| C01 | Dunkleosteus | Late Devonian, Cleveland Shale | Deep-bodied giant fish; head and trunk armour; cutting jaws |
| C02 | Titanichthys | Late Devonian marine records, Morocco / Ohio | Giant armoured fish with broad opening and slender toothless jaws |
| C03 | Coccosteus | Middle Devonian, Orcadian Basin | Much smaller arthrodire; armoured front and flexible tail |
| C04 | Bothriolepis | Late Devonian Miguasha representative | Boxy antiarch armour; jointed armoured pectoral appendages |
| C05 | Gemuendina | Early Devonian, Hunsrück | Flattened ray-like outline; upward-facing eyes; mosaic armour |
| C06 | Doryaspis | Early Devonian, Svalbard | Jawless shielded fish; long oral projection and lateral extensions |
| C07 | Cladoselache | Late Devonian, Cleveland Shale | Streamlined early chondrichthyan with distinctive fins and tail |
| C08 | Stethacanthus | Late Devonian representative to verify | Spine-brush complex; unusual dorsal silhouette |
| C09 | Cheirolepis | Middle–Late Devonian Scottish / Miguasha representatives | Early ray-finned fish; small scales, fin rays and relatively large mouth |
| C10 | Rhinodipterus | Late Devonian, Gogo | Lungfish skull, paired fins and evidence relevant to air breathing |
| C11 | Onychodus | Late Devonian, Gogo representative | Lobe-finned fish with distinctive paired tusk apparatus |
| C12 | Tiktaalik | Late Devonian, Ellesmere Island | Broad flattened head, mobile neck and robust paired fins |
| C13 | Acanthostega | Late Devonian, East Greenland | Aquatic early tetrapod; digit-bearing limbs and swimming tail |
| C14 | Eldredgeops | Middle Devonian, North American shelf | Prominent eyes, segmented exoskeleton and enrolling body |
| C15 | Walliserops | Devonian, Moroccan representative | Trident-bearing trilobite with elaborate rigid projections |
| C16 | Jaekelopterus | Early Devonian, Rhineland | Large eurypterid; grasping chelicerae, walking limbs and paddles |
| C17 | Nahecaris | Early Devonian, Hunsrück | Carapace-bearing arthropod with antennae and fine ventral appendages |
| C18 | Furcaster | Early Devonian, Hunsrück | Brittle star with distinct central disc and articulated arms |
| C19 | Palaeoisopus | Early Devonian, Hunsrück | Sea spider with swimming limbs and a long segmented abdomen |
| C20 | Manticoceras | Late Devonian, Frasnian marine records | Coiled chambered shell with an incompletely known soft body |
| C21 | Michelinoceras | Early Devonian Sardinian records | Long straight chambered shell; soft body and resting trim uncertain |

### Images and models needed for every creature

The following is the standard deliverable set for **each C01–C21**, with the special anatomy requirements described below:

| Deliverable | Quantity for 21 subjects | Description |
| --- | --- | --- |
| Anatomical reference board | 21 boards | Side, dorsal, frontal and ventral views where evidence allows; specimen images with credits, dimensions and uncertainty labels. Missing anatomy is shown as uncertain, not quietly filled in. |
| Appearance concept | 21 images | One naturalistic three-quarter reconstruction with a proposed material/colour treatment. At least one neutral-lighting view must remain available. |
| Anatomy detail sheet | 21 sheets | Close-ups of the subject's important structures: jaws, mouth, limbs, eyes, armour, shell aperture or fin attachments. |
| Original 3D source | 21 model projects | Editable high-quality source models with labelled anatomy, materials and a consistent scale convention. Preserve intermediate files. |
| Exported creature models | 42 GLBs | One full-detail and one reduced-detail model per subject, following the repository's existing asset standards. |
| Final specimen images | 84 PNGs | One studio render, one transparent selection portrait, one card image and one thumbnail per subject, rendered from the approved final model. |
| Material source set | 21 sets | Source texture images and material definitions as needed; these are sets, not a fixed number of maps. Preserve fine scale, cuticle, shell and membrane detail without baking scene lighting into colour. |

The three concept/reference images above may be multi-panel boards; their panels are not separate promised files. Regional colour variants, juvenile reconstructions and additional detail levels are optional additions, not silently included in these totals. Do not fabricate juvenile anatomy just by shrinking an adult.

Rigging should preserve anatomically meaningful joints and retain the established specimen anchor conventions. Natural resting and locomotion studies can help validate the models, but action sets and gameplay animation requirements are outside this brief.

## 3. Creature characteristics and special asset requirements

### C01 · Dunkleosteus

**Known characteristics and evidence:** armoured head and trunk, powerful gnathal cutting structures. Body proportions and feeding reconstructions continue to be revised; use a robust, deep-bodied interpretation and do not automatically inherit the familiar 8–10 m reconstruction. A recent length study estimated typical adults around 3.1–3.5 m and its largest example around 4.1 m; that is one reconstruction framework, not a universal genus maximum. [Length study](https://doi.org/10.3390/d15030318), [reconstruction study](https://www.palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction)

**Reconstruction focus:** Its presence should come from the depth of the torso, the articulated head armour and the shape of the gnathal cutting structures, rather than a stretched shark silhouette. Unarmoured rear-body reconstruction needs particular care.

**Additional image/model requirements:** Profile and frontal scale study; open/closed jaw detail; armour-to-skin transition. Build head, jaws and torso with anatomically consistent proportions. Keep a size-comparison plate separate from its portrait.

### C02 · Titanichthys

**Known characteristics and evidence:** giant placoderm with slender, toothless lower jaws. Biomechanical work supports suspension feeding, but a filtering apparatus has not been directly preserved. [Coatham et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/)

**Reconstruction focus:** The contrast with Dunkleosteus is anatomical as well as dietary: its jaw form is not a duplicate cutting apparatus. Its gigantic body and broad feeding opening are visually important, while any detailed internal filter reconstruction remains conjectural.

**Additional image/model requirements:** Mouth-aperture and lower-jaw board; full-body proportion alternatives marked by confidence. A source model with a carefully resolved oral cavity; no invented baleen presented as preserved anatomy.

### C03 · Coccosteus

**Known characteristics and evidence:** a smaller arthrodire known from Middle Devonian Scottish fish assemblages. [National Museums Scotland collection review](https://files.nms.ac.uk/production/Documents/Our-Impact/Collections-reviews/Fossil-collections/fossil-review-complete-_review-of-fossil-collections-in-scotland.pdf?dm=1736434705)

**Reconstruction focus:** A smaller arthrodire is valuable as a reference for a more completely understood armoured-fish body plan. It should have its own armour arrangement, head shape and body proportions rather than being a reduced Dunkleosteus model.

**Additional image/model requirements:** Specimen-based side and dorsal views; armour plate boundaries; fin positions and tail outline. A separate model and texture treatment, not a scaled copy of C01.

### C04 · Bothriolepis

**Known characteristics and evidence:** antiarch with a box-like armoured body and jointed armoured pectoral appendages. Bothriolepis canadensis is part of the Miguasha fish collection; detailed diet and locomotion remain reconstruction questions. [Québec collection record](https://www.patrimoine-culturel.gouv.qc.ca/rpcq/detail.do?id=93118&methode=consulter&type=bien)

**Reconstruction focus:** Its enclosed armoured front body and unusual pectoral appendages distinguish it immediately from conventional fish. The appendages are derived fins; describing them as proven terrestrial walking legs would overstate the evidence. Digital reconstruction found no head–thorax mobility and constrained pectoral articulation, so the authored shield remains rigid and the pectoral joints move conservatively. [Three-dimensional Bothriolepis study](https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis)

**Additional image/model requirements:** Dorsal and underside armour layouts; joint sequence of both pectoral appendages; small mouth and tail attachment. Model the appendage articulation and shield openings explicitly.

### C05 · Gemuendina

**Known characteristics and evidence:** flattened rhenanid placoderm, superficially ray-like, with upward-facing eyes and a mouth placement that has supported an upward-feeding interpretation. It is not a ray. [Hunsrück review](https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426)

**Reconstruction focus:** The flattened outline resembles a ray by convergence, but the upward-oriented head features and small armour elements are especially important. Avoid importing a modern ray’s underside mouth or sting.

**Additional image/model requirements:** Top and front views; mosaic armour close-up; mouth/eye orientation; fin-to-body transition. Build a low, broad model with distinguishable armour elements and flexible margins.

### C06 · Doryaspis

**Known characteristics and evidence:** heterostracan with a conspicuous oral projection and laterally extended shield; material from Svalbard includes caudal anatomy. The projection's exact function and diet should remain explicit uncertainties. [Genus revision](https://www.tandfonline.com/doi/abs/10.1671/0272-4634%282002%29022%5B0735%3ATGDWHF%5D2.0.CO%3B2)

**Reconstruction focus:** The shield, lateral extensions and long oral projection form an unusual jawless-fish outline. The projection is not evidence for swordfish-like hunting, and its function should remain unresolved on the board. The model places the mouth above the pseudorostrum base, keeps the cornual extensions rigid, omits paired fins and uses a hypocercal tail. The fixed shield and flexible posterior should remain visually distinct. [Hydrodynamic reconstruction study](https://www.nature.com/articles/s42003-024-06837-8)

**Additional image/model requirements:** Exact projection and mouth relationship; shield cross-section; tail-fin reconstruction. A rigid-front/flexible-tail source model with no fabricated hinged biting jaw.

### C07 · Cladoselache

**Known characteristics and evidence:** early shark-like chondrichthyan from the Cleveland Shale fauna, with unusually informative preservation among the local fishes. [Cleveland Museum ecosystem project](https://www.cmnh.org/science-conservation/areas-of-study/earth-sciences/projects/saving-a-lost-ecosystem), [Case Western specimen collection](https://caslabs.case.edu/hyde-collection/hyde-collection/)

**Reconstruction focus:** Use its own head, fin placements and caudal outline. An extant shark model is useful only for broad comparative context, not as a substitute for the fossil anatomy. Skin coverage and fin details should follow the selected specimen. The authored genus-level synthesis retains an anterior dorsal spine and omits the posterior spine identified as hypothetical in a recent comparison; it also omits an anal fin. [Frey et al. comparison](https://link.springer.com/article/10.1186/s13358-023-00266-6)

**Additional image/model requirements:** Lateral body outline, fin-ray/spine evidence and caudal-fin board; oral detail. A streamlined model with restrained soft-surface detail rather than generic modern shark textures.

### C08 · Stethacanthus

**Known characteristics and evidence:** the distinctive spine-brush complex gives a strong silhouette. The genus spans the Devonian–Carboniferous in the literature; function and reconstruction of the complex require care. Select a demonstrably Devonian specimen before authoring, and do not substitute a Carboniferous Akmonistion model. [Braincase study](https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-the-royal-society-of-edinburgh/article/abs/braincase-of-a-primitive-shark/E11D5DAAAFE25E9196D17BC1C4CCBD9C), [spine-brush anatomy study](https://www.tandfonline.com/doi/abs/10.1080/02724634.1984.10012016)

**Reconstruction focus:** The spine-brush is the central visual feature, but its anatomy, distribution and biological function need to be separated. Do not automatically claim a defensive purpose or apply a sex-specific interpretation beyond what the selected material supports. The asset is labelled **Stethacanthus sp.**, informed by CMNH 8988 from the upper Famennian Cleveland Shale. Its assignment to S. altonensis is disputed; the incomplete Devonian material anchors the occurrence while body and fin details remain an explicitly comparative reconstruction. [Ginter and Sun, p. 710](https://www.app.pan.pl/archive/published/app52/app52-705.pdf)

**Additional image/model requirements:** Devonian provenance sheet before any concept approval; dorsal complex from several angles; pectoral and pelvic anatomy. No substitution of a better-known Carboniferous Akmonistion reconstruction.

### C09 · Cheirolepis

**Known characteristics and evidence:** early ray-finned fish represented in Devonian Scottish and Miguasha assemblages. [Miguasha nomination dossier](https://whc.unesco.org/uploads/nominations/686rev.pdf)

**Reconstruction focus:** A recognizably early ray-finned fish should show the relationship between its small scales, fin rays, mouth and unequal-lobed tail. The chosen Scottish or Miguasha species should remain consistent across the entire model.

**Additional image/model requirements:** Scale field and ray arrangement; gape/head profile; tail outline. Fine surface breakup must remain readable without making every scale a raised plate.

### C10 · Rhinodipterus

**Known characteristics and evidence:** marine Devonian lungfish from Gogo with anatomical evidence interpreted as air-breathing adaptation. This is a stronger foundation for a respiratory mechanic than assigning modern lungfish abilities to every Devonian lungfish. [Air-breathing study](https://pmc.ncbi.nlm.nih.gov/articles/PMC2936207/)

**Reconstruction focus:** Air-breathing-related cranial evidence makes this a useful lungfish subject, but it does not establish every behaviour of living lungfish. Whole-body and fin reconstructions need their own evidence, particularly where material is mainly cranial.

**Additional image/model requirements:** Skull and palate board; clearly labelled comparative body reconstruction; external mouth/throat study. No mud cocoon, terrestrial posture or assumed aestivation scene in the required assets.

### C11 · Onychodus

**Known characteristics and evidence:** distinctive tusk apparatus and a predatory interpretation supported by a Gogo specimen associated with arthrodire prey. [WA Museum predation paper](https://museum.wa.gov.au/research/records-supplements/records/arthrodire-predation-oncychodus-pisces-crossopterygii-late-devo)

**Reconstruction focus:** The paired tusk apparatus and its relationship to the lower jaw require anatomical reference, not fantasy fang placement. The Gogo representative provides a strong basis for a distinctive lobe-finned fish.

**Additional image/model requirements:** Open/closed mouth study with tusk placement; head proportions; paired fins. The model should make the oral anatomy inspectable and distinguish it from ordinary marginal teeth.

### C12 · Tiktaalik

**Known characteristics and evidence:** flattened head, mobile neck and robust paired-fin skeleton. Recent work supports body support and movement in shallow water; ordinary terrestrial walking should not be assumed. [University of Chicago, 2024](https://biologicalsciences.uchicago.edu/news/how-change-hips-led-evolution-walking)

**Reconstruction focus:** Its broad head, separation of head and shoulder region, scales and robust fins should all remain visible. The fin skeleton is neither a modern fish fin nor a completed digit-bearing limb.

**Additional image/model requirements:** Dorsal skull and neck region; paired-fin skeletal overlay; buoyancy-supported shallow-water reconstruction. Build the fin attachments and body support proportions conservatively.

### C13 · Acanthostega

**Known characteristics and evidence:** early tetrapod with digit-bearing limbs and strongly aquatic anatomy. Histological study indicates a long aquatic juvenile phase; known growth history is incomplete. [Sanchez et al.](https://www.nature.com/articles/nature19354)

**Reconstruction focus:** A tail suited to swimming, splayed limbs and an eight-digit reconstruction distinguish it from Tiktaalik. The known sample’s age structure complicates a confident generic adult depiction.

**Additional image/model requirements:** Digit count and limb proportions; tail-fin outline; representative specimen age note. Source model should avoid a modern salamander body or unsupported upright terrestrial stance.

### C14 · Eldredgeops

**Known characteristics and evidence:** familiar phacopid trilobite, often encountered under the older name Phacops rana, with prominent eyes and an enrolling body. Middle Devonian North American material provides a good recognizable representative. [Devonian Atlas](https://devonianatlas.org/species/eldredgeops-rana/)

**Reconstruction focus:** Prominent compound eyes, a strongly segmented dorsal exoskeleton and the geometry of enrollment are defining subjects. Ventrally preserved anatomy may need comparative reconstruction and should be identified as such.

**Additional image/model requirements:** Eye close-up, dorsal segmentation, underside appendage study and enrolled profile. Create one coherent model that can be inspected in extended and enrolled poses.

### C15 · Walliserops

**Known characteristics and evidence:** trident-bearing trilobite. A study supports intraspecific combat as a possible function, while later modelling has proposed hydrodynamic alternatives. The function is not settled. [Combat hypothesis](https://pmc.ncbi.nlm.nih.gov/articles/PMC9942788/), [alternative hydrodynamic preprint](https://arxiv.org/abs/2506.15922)

**Reconstruction focus:** The long cephalic trident and other projections need exact three-dimensional treatment. Their shape should not be simplified into a generic horn, and the proposed functions should not be baked into the natural-history description as certainty.

**Additional image/model requirements:** Trident front/side/top studies; spine-root attachment detail; underside reconstruction. Provide a source model with intact, physically plausible projections and a silhouette-preserving reduced model.

### C16 · Jaekelopterus

**Known characteristics and evidence:** eurypterid with enlarged prey-catching chelicerae. The famous roughly 2.5 m estimate for J. rhenaniae is extrapolated from an isolated claw, not a complete giant body. Its Early Devonian occurrence must not be silently mixed into a Late Devonian Cleveland ecosystem. [Braddy et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC2412931/)

**Reconstruction focus:** The large chelicerae, several different limb functions, broad paddles and segmented trunk distinguish this eurypterid from both trilobites and modern scorpions. It should not receive an invented venomous sting.

**Additional image/model requirements:** Scale-estimate board distinguishing the preserved claw from the reconstructed body; cheliceral denticles; walking-limb and paddle anatomy. Articulate paired appendages independently.

### C17 · Nahecaris

**Known characteristics and evidence:** mobile crustacean-grade arthropod from the exceptionally preserved Hunsrück fauna. Fine feeding behaviour needs review rather than a direct copy of modern shrimp. [Hunsrück arthropod ecology review](https://pubmed.ncbi.nlm.nih.gov/26826500/)

**Reconstruction focus:** Its fine appendages and carapace need to remain visible under neutral lighting. A modern decapod shrimp is not a sufficient template; the fossil limb arrangement should determine the reconstruction.

**Additional image/model requirements:** Carapace and abdomen outline; antenna attachment; ventral limb board. Detailed source model with careful handling of fine appendages in the reduced export.

### C18 · Furcaster

**Known characteristics and evidence:** Devonian brittle star; reconstructed arm skeletons provide evidence relevant to locomotion. Fossil arm construction should guide the gait rather than assuming every detail of a living brittle star. [Locomotion study](https://rvc-repository.worktribe.com/output/1549616/three-dimensional-visualization-as-a-tool-for-interpreting-locomotion-strategies-in-ophiuroids-from-the-devonian-hunsruck-slate)

**Reconstruction focus:** The central disc, arm segmentation and associated spines or plates should follow the selected fossil form. Arm arrangement and flexibility should not simply be copied from any living brittle star.

**Additional image/model requirements:** Dorsal and oral-side disc views; arm-joint close-up; neutral spread and curved-arm poses. Keep the disc and arm bases legible in the source and reduced models.

### C19 · Palaeoisopus

**Known characteristics and evidence:** fossil sea spider with a segmented abdomen and swimming-adapted limbs. Predation on crinoids is an interpretation rather than observed behaviour. [Hunsrück review](https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426)

**Reconstruction focus:** The segmented abdomen and differing swimming-limb proportions separate it from an ordinary modern sea spider. The crinoid-feeding interpretation can be mentioned in notes, but is not a directly observed association to reproduce without qualification.

**Additional image/model requirements:** Complete appendage inventory; abdomen and anterior-body detail; swimming-limb outline. The model must retain the abdomen and fossil limb proportions rather than using a tiny-bodied modern pycnogonid template.

### C20 · Manticoceras

**Known characteristics and evidence:** Devonian ammonoid with a coiled chambered shell. Shells provide much firmer evidence than soft-body details; avoid presenting a modern nautilus' arm count as established ammonoid anatomy. [Museums Victoria specimen](https://collections.museumsvictoria.com.au/specimens/508262)

**Reconstruction focus:** Shell coiling, whorl expansion, aperture and surface sculpture are the strongest reconstruction constraints. Soft appendages are much less securely known. Internal sutures exposed by a fossil should not automatically become painted external markings on a living shell.

**Additional image/model requirements:** Side and aperture views; shell-section reference kept separate from living appearance; labelled soft-body alternatives. One rigid shell and a conservative editable soft-body reconstruction.

### C21 · Michelinoceras

**Known characteristics and evidence:** orthoconic cephalopod representative; Devonian occurrences exist, but this broad genus needs a specific vetted Devonian species and specimen before modelling. A generic shop fossil labelled “Orthoceras” is not an adequate reference. [Devonian cephalopod study](https://www.paleoitalia.it/wp-content/uploads/2023/06/05_Gnoli.pdf)

**Reconstruction focus:** A long orthoconic shell requires a coherent taper, aperture and chambered internal reference. A fragment does not establish total living length or resting orientation. The genus should not be treated as a synonym for any straight fossil cephalopod.

**Additional image/model requirements:** Chosen Devonian specimen/species sheet; shell taper and aperture board; uncertainty-labelled soft-body and trim studies. One straight-shell model with a restrained living reconstruction; optional cutaway belongs in reference art, not the default exterior.

## 4. Regional environment images

Create **nine landscape reference/concept boards**, E01–E09. Each board should show an establishing view, a close view of substrate/vegetation, a light-and-water study and a locality/age label. These are separate environments, not nine neighbouring zones in one historically continuous location. Exact animal lists remain subject to local occurrence checks.

| ID | Environment board | What the image should contain | Model families needed |
| --- | --- | --- | --- |
| E01 | Early Devonian Hunsrück marine mud shelf | Fine sediment, scattered living echinoderms and arthropods, crinoid stands, suspended particles; a relatively subdued marine palette | Mud substrate, low outcrops, crinoids, shell debris, restrained algae |
| E02 | Moroccan Devonian shelf | A researched Walliserops-bearing interval; carbonate substrate, shell accumulations and locally appropriate attached organisms | Carbonate outcrops, shell pavement, selected coral/sponge forms; no automatic Late Devonian fish assemblage |
| E03 | Middle Devonian Orcadian lake | Lake water, fine sediment and rocky margins; shoreline vegetation based on the selected age/locality | Lake sediment, rock margins, coarse and fine bed material; vegetation only after locality review |
| E04 | Late Devonian Gogo reef system | Substantial reef framework, open water around its margins, living surfaces and deeper adjacent water | Stromatoporoid growth forms, regionally appropriate corals/algae, carbonate framework and rubble |
| E05 | Late Devonian Miguasha waterway | Sediment-rich water, shore/bank section and a regionally researched terrestrial backdrop | Fine sediment, bank modules, appropriately sourced plant debris and shoreline vegetation |
| E06 | Latest Devonian Cleveland offshore sea | Open marine water, distant silhouettes and a subdued soft-bottom view; not a dense tropical coral garden | Fine bottom sediment, sparse local benthos, suspended-particle material and optional organic remains |
| E07 | Late Devonian Ellesmere waterway | Broad shallow channel, fine sediment, submerged banks and woody material appropriate to the Tiktaalik setting | Channel bed, bank faces, submerged branches and logs; reviewed plants |
| E08 | Late Devonian East Greenland waterway | Separate Acanthostega-associated floodplain/water-body interpretation, with its own sediment and vegetation board | Shallow-water substrate, banks, woody debris and locally appropriate vegetation |
| E09 | Early Devonian Svalbard water bodies | A researched Wood Bay Formation setting for Doryaspis; shoreline and sediment treatment distinct from later wooded environments | Fine/coarse substrate, low banks and cautiously selected early vegetation |

The Gogo and Cleveland museum records support very different aquatic settings, even though both contain striking fishes. Hunsrück is especially valuable for invertebrate anatomy and diversity. [WA Museum: Gogo](https://museum.wa.gov.au/explore/articles/gogo-fish), [Cleveland Museum ecosystem project](https://www.cmnh.org/science-conservation/areas-of-study/earth-sciences/projects/saving-a-lost-ecosystem), [Hunsrück ecology review](https://pubmed.ncbi.nlm.nih.gov/26826500/)

A fossil deposit is not a literal living surface. Hunsrück organisms should not be metallic gold because their fossils are pyritized, nor should their seabed consist of quarried slate slabs. Likewise, modern desert exposure of Devonian rocks does not establish a desert shoreline in the original marine setting. Distinguish the living community from its burial environment and its much later preservation.

Titanichthys, Manticoceras and Michelinoceras need a final species/locality assignment before appearing in an environment reconstruction. Occurrence in the Devonian alone does not justify putting them in every marine board.

## 5. Attached organisms and smaller biological props

These are **12 proposed 3D model families**, B01–B12, separate from the mobile creature roster. Each needs a small reference/appearance board and one editable source family. Variant counts below are initial art targets, not claims about the number of species. A named genus is a reference candidate until locality and age are confirmed.

| ID | Model family | Characteristics to depict | Initial variants / companion images |
| --- | --- | --- | --- |
| B01 | Massive stromatoporoid sponge | Low-domed to irregular skeletal growth; living surface distinct from a cut fossil section | Three silhouettes: low mound, taller dome, irregular fused-looking mass; surface detail sheet |
| B02 | Branching stromatoporoid form | Slender branching growth, with Amphipora-type forms considered only where regionally appropriate | Two colony densities; branch close-up |
| B03 | Encrusting stromatoporoid | Thin to layered growth conforming to an underlying surface | Two patches; edge and living-surface studies |
| B04 | Massive tabulate coral | Dense small corallites; honeycomb-like Favosites-type architecture after local review | Small and large colonies; close-up separating polyp reconstruction from exposed skeleton |
| B05 | Branching tabulate coral | Delicate branching skeletal framework, distinct from a modern reef coral template | Two branch patterns; colony silhouette and corallite detail |
| B06 | Solitary rugose coral | Horn-shaped skeleton and living oral surface; septa belong to the skeletal reference | Upright and inclined forms; living-versus-skeletal comparison |
| B07 | Colonial rugose coral | Multiple connected corallites in a researched Devonian colony form | Compact and open arrangements; colony section reference |
| B08 | Stalked crinoid | Jointed stem, attachment, cup and branching feeding arms | Three heights/poses from one vetted anatomical family; crown and stem detail |
| B09 | Brachiopod bed | Pedicle/brachial valve relationship, shell ribs/folds and an appropriate attachment interpretation | Two researched shell forms, plus sparse/dense arrangements; avoid treating them as generic clams |
| B10 | Bryozoan colony | Small repeated zooid structures; encrusting or branching form chosen from local fossils | Two growth forms only if supported locally; macro texture reference |
| B11 | Small gastropod shells | Vetted Devonian shell forms with coherent aperture and coiling | Two shell forms, living soft parts optional and separately labelled; empty-shell variants |
| B12 | Small bivalves | Paired left/right valves, hinge and locally appropriate shell outlines | Two shell forms and an open empty shell; living tissue only with reviewed reconstruction |

Stromatoporoids are sponge fossils, not stromatolites; the latter are sedimentary structures associated with microbial mats. Keep them distinct in names, source folders and appearance. Devonian brachiopods, corals, molluscs and crinoids provide a substantial reference base, but a locality-specific assemblage still needs curation. [Digital Atlas: stromatoporoids](https://www.digitalatlasofancientlife.org/learn/porifera/stromatoporoidea/), [Humboldt museum Devonian exhibit](https://natmus.humboldt.edu/exhibits/life-through-time/visual-timeline/devonian-period)

Do not cover every colony with modern-looking colourful polyps by default. Living soft surfaces are often less constrained than the skeleton. Produce a neutral anatomical reconstruction first, then colour studies marked as interpretation.

## 6. Plants and algae

Create **five source model families**, P01–P05, each with its own botanical/algal reference board and appearance study. These do not all belong together. Marine algae, early terrestrial vegetation and later forest trees should have separate source collections and regional tags.

| ID | Subject family | Characteristics | Required images and 3D parts |
| --- | --- | --- | --- |
| P01 | Rhynia-type early land vegetation | Small leafless branching axes with terminal reproductive structures; an Early Devonian Rhynie reference, not universal shoreline grass | Whole plant and sporangium board; single plant, small cluster and sparse patch. Place only in a justified early terrestrial setting. |
| P02 | Asteroxylon | Early lycophyte with small leaf-like appendages and a distinctive branching/rooting organization | Reference reconstruction, close-up of shoot appendages and basal system; individual and cluster models. Do not enlarge it into a later giant lycopsid tree. |
| P03 | Cladoxylopsid tree family | Devonian tree architecture with characteristic trunk/base and a branching crown; not a modern palm or generic tree fern | Whole tree, crown and base studies; two tree proportions, a juvenile/reduced form only if supported, and detached crown/branch material. Select a named regional reconstruction first. |
| P04 | Archaeopteris | Later Devonian woody tree with fern-like foliage; a spore-bearing plant, not a flowering tree | Whole-tree silhouette, branch/foliage and rooting boards; two tree forms, branch modules and deadwood derived from the same anatomy. |
| P05 | Marine algal thalli | Conservatively reconstructed sheet, tuft or branching forms tied to marine evidence | Submerged appearance board; two modest thallus forms. No default kelp forest, seagrass blades or rooted aquatic flowering plants. |

Rhynie studies provide unusually detailed early plant anatomy, including life stages that should not be casually combined into one invented plant. Middle Devonian forest reconstructions and later Archaeopteris forests supply different structures and regional contexts. [Rhynie plant anatomy](https://pmc.ncbi.nlm.nih.gov/articles/PMC5745331/), [National Museums Scotland: Asteroxylon reconstruction reference](https://www.nms.ac.uk/profile/dr-sandy-hetherington), [Middle Devonian forest ecosystem](https://pmc.ncbi.nlm.nih.gov/articles/PMC8409631/), [Archaeopteris study](https://www.nature.com/articles/19516)

P01 and P02 are research-backed additions to the broader Devonian asset library, not a claim that Rhynie vegetation grew at each of the nine illustrated sites. If none of the selected regional scenes justifies them, keep their production after the plants required for those scenes.

**Ground-cover images rather than extra tree models:** microbial films, thin algal coatings, sediment trapped around stems and small organic fragments. Treat these as material/decal studies; avoid introducing modern moss lawns or flowering meadow plants without evidence. Fungal-looking structures and Prototaxites-like forms are optional research subjects, not required props or a basis for filling every landscape with mushrooms.

## 7. Geological and organic prop models

Create **12 reusable model families**, G01–G12. Each family needs an appearance/reference board and several shape variants where indicated. Name assets for the material and form rather than for their role in a future game.

| ID | Model family | Needed shapes and detail |
| --- | --- | --- |
| G01 | Carbonate outcrop | Low slab, irregular mound and vertical face; natural fractures and submerged weathering |
| G02 | Reef framework section | Freestanding buttress, overhanging section and low shelf; texture and structure compatible with the chosen reef builders |
| G03 | Carbonate rubble | Several angular and rounded fragments; exposed interiors differentiated from living surfaces |
| G04 | Fine-sediment bed | Low-relief rippled patch, smoother patch and irregular depositional surface; predominantly material-driven detail |
| G05 | Sand-and-pebble bed | Two grain-size mixes and scattered stones, with scale appropriate to the region |
| G06 | Eroded bank / channel margin | Sloped bank, shallow undercut and exposed sediment face; rooted and unrooted versions kept separate |
| G07 | Large rock / boulder | Three locally plausible shapes; mineral/grain texture varies by environment rather than universally using the Cambrian rock material |
| G08 | Shell-hash cluster | Broken brachiopod, bivalve and cephalopod shell fragments derived from approved shell models |
| G09 | Crinoid debris | Disarticulated columnals, short stem lengths and occasional cup fragments, anatomically derived from B08 |
| G10 | Submerged log / woody branch | Intact, broken and partly buried forms; derived from approved later Devonian trees |
| G11 | Exposed root / root-bearing bank | Roots with plausible attachment and branching, matched to P03 or P04; no generic mangrove prop |
| G12 | Organic remains | Optional fish remains or an empty arthropod exuvia, derived from approved creature anatomy; fresh, exposed and sediment-covered appearance studies |

These props should have scale references in their boards: shell hash is not a field of giant bivalve shells, and tiny crinoid columnals should not become boulders. G08, G09 and G12 reuse approved anatomy instead of introducing unrelated generic bones or shells. G10 and G11 belong only in settings with appropriate woody vegetation.

## 8. Texture, material and atmosphere images

These are supporting asset sets, separate from the 21 creature material sets.

### T01–T10: ten environment material studies and source sets

| ID | Material | Source images needed |
| --- | --- | --- |
| T01 | Pale submerged carbonate | Tileable colour/albedo source, roughness and normal/height detail |
| T02 | Darker carbonate / weathered exposed interior | A related but distinct rock treatment; avoid baked directional shading |
| T03 | Fine marine mud | Smooth and slightly disturbed variants; grain scale appropriate for small animals |
| T04 | Freshwater fine sediment | Regionally suitable mineral colour and particle-size study |
| T05 | Fine sand and ripple surface | Neutral-lighting tile; shallow relief; repeat should be hard to detect |
| T06 | Mixed shell hash | Fragment atlas from B/G models, with matching normal/roughness sources |
| T07 | Microbial film / thin algal coating | Several restrained surface colours and coverage masks; no assumption of a single universal green layer |
| T08 | Submerged wood | Wet woody surface, broken end and softened sediment-covered treatment |
| T09 | Rooted bank / organic sediment | Layered sediment, root contact and localized organic staining |
| T10 | Living reef-surface reference atlas | Sponge/coral growth surfaces separated by taxon; skeletal texture distinct from speculative soft covering |

Normal, height and roughness maps should be derived or authored as material data. They are not automatically scientifically valid because an image generator produced convincing texture. Avoid baked highlights and shadows that conflict with the scene's lighting.

### Additional image sets

- **Three lighting/colour boards:** clear marine reef water; suspended-sediment marine/lake water; later Devonian shallow wooded waterway. Each should include neutral specimen illumination alongside atmospheric views.
- **One particle atlas:** fine silt, marine-snow-like flecks, small organic particles and a restrained plankton-density treatment. Any identifiable plankton illustration requires a separately researched taxon; generic specks do not.
- **One substrate decal atlas:** thin sediment drapes, localized microbial coating, shell fragments and organic fragments. Avoid arbitrary modern animal tracks.
- **Two scale-comparison plates:** one focused on fishes and one on invertebrates/early tetrapod subjects, with a consistent scale and uncertainty notes. A comparison plate may combine subjects from different places, but must label that explicitly and must not resemble a claim of co-occurrence.

No new interface, ability, progression or mode imagery is required by this brief. Brand/logo direction can be considered separately after the scientific and environmental look is established.

## 9. What is new and what can be reused

**New organism geometry:** all 21 creatures should be independently reconstructed. Do not reuse a Cambrian trilobite model by changing its colour and calling it Eldredgeops. Likewise, a Gemuendina is not a flattened shark and Acanthostega is not Tiktaalik with fingers added.

**Potentially shared production infrastructure:** specimen lighting, render sizes, file packaging, image generation workflow, texture tooling and anchor conventions can follow the existing collection. Shared tools do not imply shared anatomy.

**Potentially reused scene materials:** generic fine sediment or rock sources may be adapted after comparison with the regional boards. Living organisms, plant silhouettes and characteristic reef forms need Devonian-specific reference.

Use the existing card/thumbnail/selection rendering pipeline after final models are approved, so the displayed images match their models. Keep modelling sources, image-generation originals, material sources and intermediary renders in `cambrian/local/` during authoring, with retained provenance and final deliverables packaged according to repository conventions. This document requests an inventory; it does not start that production work.

## 10. Production inventory and order

The proposed baseline consists of:

| Category | Baseline quantity |
| --- | --- |
| Mobile creature subjects | 21 |
| Creature reference / concept / detail images | 63 boards/images |
| Creature editable source models | 21 projects |
| Creature full-detail and reduced-detail exports | 42 GLBs |
| Final creature studio / selection / card / thumbnail images | 84 PNGs |
| Creature material sources | 21 material sets |
| Regional environment concept boards | 9 |
| Attached-organism and biological prop families | 12 |
| Plant/algal source model families | 5 |
| Geological/organic prop families | 12 |
| Reference/appearance boards for the 29 scenery families above | 29 |
| Environment material studies/source sets | 10 |
| Lighting/colour boards | 3 |
| Particle and decal atlases | 2 |
| Scale-comparison plates | 2 |

The **29 scenery families** contain variants and may share derived components; they are not a promise of only 29 exported mesh files. The exact export and LOD counts should be established after the environment boards choose which variants are needed. These quantities describe the full proposed library, not a requirement to build everything before reviewing the first specimens.

Recommended art sequence:

1. **Resolve references and scope.** Choose the representative species/specimens and regional boards. Identify uncertain anatomy before generating polished concept art.
2. **Establish visual standards with six subjects:** Dunkleosteus, Bothriolepis, Eldredgeops, Manticoceras, Palaeoisopus and Tiktaalik. Together they sample armour, cuticle, shell, fine appendages and transitional fins. This is an anatomical/art-production sample, not a community reconstruction.
3. **Approve two contrasting environment boards:** a marine reef and a later Devonian shallow waterway. Use a few representative props and plants to establish scale, surface detail and lighting.
4. **Complete the remaining creature boards and models**, grouped by useful modelling techniques while retaining separate anatomical reviews.
5. **Build only the scenery variants supported by approved regional boards**, then render the remaining environment imagery and complete material libraries.
6. **Produce final specimen images from final models**, and archive source images, source models and provenance together.

Before approving a final organism, verify its identity, age/locality, proportions, appendage count, mouth orientation, shell/armour construction and known-versus-inferred anatomy. Colours and fine soft-tissue appearance should be described as interpretations unless supported directly. A beautiful model with the wrong anatomy should return to reference review rather than become the reference for later work.
