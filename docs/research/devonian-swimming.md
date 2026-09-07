# Devonian roster: body length and swimming performance

Research brief for the Devonian era, September 2026. Companion data: `devonian-swimming.json`
(one object per roster id, every field filled). Nothing in this file is game tuning; it is the
biological envelope the tuning in `src/content/devonian/creatures.ts` should be checked against.

**Baselines.** Representative lengths for the eight delivered specimens are taken from
`public/assets/devonian/creatures/*.json` (`lengthMeters`, reviewed) and are not overridden. The
thirteen pending subjects use the literature values cited below. "Max" is the largest length
reported in the cited source, not a genus-wide guarantee (see `docs/redesign/07-devonian-design.md`
§2 on that distinction).

**Confidence labels.** `measured` = a speed actually recorded for a living analogue used directly;
`modelled` = a published biomechanical model or reconstruction of the fossil taxon (or a physical
model of it); `estimate` = our allometric estimate from the rules in §1.2. None of the 21 animals
has a measured speed; the label describes the strongest evidence behind the number.

## 1. Method

### 1.1 What exists in the literature

- **Dunkleosteus.** Engelman 2023 (Diversity 15:318) re-estimates length from orbit–opercular
  distance: ~3.4 m typical adult (CMNH 5768), ~4.1 m largest (CMNH 5936). Engelman 2024 (Palaeo.
  Electronica 27.3.a44) reconstructs a deep trunk (depth 25–28 % TL, fineness ratio 2.66–3.18) and
  argues that fused vertebrae and a horizontal septum are compatible with a stiff-bodied,
  thunniform-like stroke. Ferrón et al. 2017 (PeerJ 5:e4081) predict, from 31 extant sharks, a
  lunate caudal fin with a narrow peduncle and wide span and an active pelagic cruising habit;
  their 8.79 m length is superseded by Engelman 2023. No paper gives a speed.
- **Titanichthys.** Coatham et al. 2020 (R. Soc. Open Sci. 7:200272) show by finite-element
  analysis that the slender, edentulous jaw could not have withstood macrophagous biting and infer
  suspension feeding; no length or speed. Engelman 2023 places it at roughly Dunkleosteus size
  (~4 m); the repo baseline keeps 5 m, older reconstructions say 7 m.
- **Coccosteus.** Ferrón et al. 2017 explicitly contrast it with Dunkleosteus as a small arthrodire
  with "demersal habits using the bottom as an ambush site". Length 29.6–39.4 cm (Miles & Westoll
  1968, via Wikipedia).
- **Bothriolepis.** Béchard et al. 2014 (Palaeo. Electronica 17.1.2A) 3-D reconstruction: no
  head–thorax mobility, constrained pectoral articulation, 43.7 cm model. B. rex (Downs et al. 2016)
  reaches ~1.7 m. Benthic; the slender heterocercal tail is the only propulsor.
- **Doryaspis.** Ferrón et al. 2024 (Comms Biol 7:1129) CFD of the 15 cm shield: delta-wing lift
  with better lift/drag near the ground, i.e. a benthic-boundary-layer swimmer; hypocercal tail;
  no paired fins.
- **Cladoselache.** Tall lunate caudal fin with near-equal lobes on a narrow peduncle, prey found
  head-first in the gut, i.e. a pursuit predator (Frey et al. 2023, Swiss J. Palaeontol.; Wikipedia
  summary of Cleveland Shale material). Largest undisputed skeleton ~2.0 m; most specimens ~1 m.
- **Stethacanthus.** Spine-brush drag and small fins make it a slow swimmer (Maisey 2009;
  Wikipedia summary). S. altonensis ~1.5 m, S. productus ~3 m; the repo specimen is a 0.7 m
  Stethacanthus sp. anchored on CMNH 8988.
- **Nautiloid/ammonoid jet.** Neil & Askew 2018 (J. Exp. Biol. 221:jeb171587): Nautilus pompilius
  swims at 0.35–1.60 BL/s (mean 0.9 BL/s backwards, 0.73 BL/s forwards), ~0.08 m/s absolute.
  Peterman & Ritterbush 2021 (PeerJ 9:e11797): a 57 cm orthocone model with Nautilus-scaled
  cruising thrust reaches 0.50 m/s (0.88 BL/s) vertically, 1.62 m/s (2.85 BL/s) with peak thrust,
  and cannot reorient horizontally without losing most of the thrust to rocking.
- **Eurypterids.** Braddy et al. 2008 (Biol. Lett. 4:106) give 2.5 m for Jaekelopterus from a
  46 cm chelicera. Plotnick 1985 puts the Baltoeurypterus upper limit near 1 m/s by paddle-tip
  speed; Vrazo & Ciurca 2018 show drag-based in-phase rowing from Arcuites traces.
- **Trilobites.** Song et al. 2021 (Palaeontology 64:597) and Trenchard et al. 2017 (Palaeontology
  60:557) model Trimerocephalus queues at walking speeds of ~0.5–2 cm/s, with walking impaired only
  above ~42 cm/s flow. Phacopids enrol rather than flee.
- **Brittle stars.** Astley 2012 (J. Exp. Biol. 215:1923): Ophiocoma echinata rows at ~2 cm/s.
  Clark et al. 2020 (R. Soc. Open Sci. 7:201380) find Furcaster lacks the arm joints needed for
  that rowing gait and infer slower podial walking.
- **Tetrapodomorphs.** Tiktaalik 1.25–2.75 m (Daeschler et al. 2006; Shubin et al. 2014 on the
  enlarged pelvis for shallow-water body support). Acanthostega ~0.6 m, all known specimens
  juveniles at 6+ years (Sanchez et al. 2016), deep finned tail, paddle limbs.
- **Modern analogue cruise speeds.** Watanabe et al. 2015 (PNAS 112:6104): cruise speed of
  ectothermic fishes scales as mass^0.20 (≈ length^0.6); juvenile white sharks 1.5–3.2 m cruise at
  0.6 m/s = 0.3 TL/s (Watanabe et al. 2022, PMC9182713); 2 m shortfin mako cruise 0.85–0.90 m/s
  (≈0.45 BL/s) with a 5.0 m/s burst (Nosal et al. 2024, PMC10952363); basking sharks breach at
  5 m/s vertical (Johnston et al. 2018). Bainbridge 1958: stride 0.6–0.8 L per tail beat, small
  fish ~25 BL/s, 1 m fish ≤ ~4 BL/s burst.

### 1.2 Allometric rules used for the estimates

With L in metres:

- **Cruise (sustained, aerobic).** `U = k · L^0.6` m/s (the Watanabe 2015 mass^0.20 exponent).
  k = 0.9 for active bony fish, 0.6 for shark-like cruisers, 0.35 for armoured/benthic forms.
  This gives 1–2 BL/s at 0.2–0.5 m falling to 0.3–0.5 BL/s at 2–4 m, matching tagged sharks.
- **Burst (fast start, seconds).** `U = 4 · L^0.5` m/s, times 0.6–0.9 for armoured, spiny or
  benthic bodies. It reproduces ~12 BL/s at 10 cm, 4 BL/s at 1 m, and the 5 m/s mako burst at
  2 m, i.e. the Bainbridge/Wardle muscle-twitch ceiling that makes BL/s fall with size.
- **Non-fish.** Arthropod walkers from the trilobite queue models; rowers/paddlers from Plotnick's
  paddle-speed ceiling and crustacean analogues; jetters from Nautilus (small coiled shell) and
  the Peterman orthocone model.

## 2. Roster table

Speeds: cruise / burst, given as BL/s and m/s. Turning: sharp ≈ radius ≤ 0.1 L (flexible body or
paddles that can pivot), moderate ≈ 0.1–0.3 L, wide ≈ > 0.3 L (rigid or armoured fore-body, stiff
caudal). Reverse: slow = fin sculling at ≤ 0.3 BL/s, none = cannot back up, jet = backward is the
primary or fast direction.

| id | L rep (m) | L max (m) | Mode | Cruise | Burst | Turn | Reverse | Conf. | Justification |
|---|---|---|---|---|---|---|---|---|---|
| dunkleosteus | 3.35 | 4.1 | thunniform-ish, stiff deep trunk, lunate tail | 0.4 BL/s · 1.3 m/s | 2.0 BL/s · 6.7 m/s | wide | slow | modelled (length, body form); estimate (speed) | Engelman 2023/2024 length and fineness 2.7–3.2; Ferrón 2017 lunate fin, pelagic cruiser; cruise from lamnid analogues (mako 0.45 BL/s at 2 m, scaled by L^0.6); burst 0.9 × 4√L. [Engelman 2023](https://doi.org/10.3390/d15030318), [Engelman 2024](https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction), [Ferrón 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5723140/) |
| titanichthys | 5.0 | 7.0 | subcarangiform slow cruiser, ram suspension feeder | 0.2 BL/s · 1.0 m/s | 1.0 BL/s · 5.0 m/s | wide | slow | modelled (feeding); estimate (speed) | Coatham 2020 suspension feeding; basking-shark analogue: filter cruise ~0.85 m/s at 6–8 m, breach at 5 m/s vertical. Repo baseline 5 m; Engelman 2023 ~4 m; 7 m is the older reconstruction. [Coatham 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/), [Johnston 2018](https://royalsocietypublishing.org/doi/10.1098/rsbl.2018.0537) |
| coccosteus | 0.35 | 0.40 | subcarangiform, heterocercal tail, demersal ambusher | 1.2 BL/s · 0.42 m/s | 5.0 BL/s · 1.75 m/s | moderate | slow | estimate | Ferrón 2017 calls it a bottom-ambush form; 29.6–39.4 cm; cruise 0.9·L^0.6 with armour discount; burst 0.75 × 4√L. [Ferrón 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5723140/), [Coccosteus size](https://en.wikipedia.org/wiki/Coccosteus) |
| bothriolepis | 0.40 | 1.7 | benthic; rigid box, slender heterocercal tail, pectoral props | 0.7 BL/s · 0.28 m/s | 3.0 BL/s · 1.2 m/s | wide | slow | modelled (rigidity); estimate (speed) | Béchard 2014: no head–thorax joint, constrained pectorals; B. rex 1.7 m max. Armoured-benthic k = 0.35 cruise; burst 0.6 × 4√L. [Béchard 2014](https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis), [Downs 2016](https://www.tandfonline.com/doi/abs/10.1080/02724634.2016.1221833) |
| gemuendina | 0.30 | 1.0 | undulating pectoral fins (rajiform-like), benthic | 0.8 BL/s · 0.24 m/s | 3.0 BL/s · 0.9 m/s | sharp | slow | estimate | Ray-like disc, upward mouth, ambush from the bottom; skate/ray analogues cruise ~1 disc-length/s and can pivot and reverse the fin wave. 30–100 cm range. [Gemuendina](https://en.wikipedia.org/wiki/Gemuendina), [Hunsrück review](https://onlinelibrary.wiley.com/doi/full/10.1111/gto.12426) |
| doryaspis | 0.20 | 0.20 | rigid delta-wing shield + hypocercal tail, near-bottom | 1.5 BL/s · 0.30 m/s | 6.0 BL/s · 1.2 m/s | wide | none | modelled (lift/drag); estimate (speed) | Ferrón 2024 CFD: ground-effect lift, 15 cm; no paired fins so no sculling or backing. Burst 0.85 × 4√L. [Ferrón 2024](https://www.nature.com/articles/s42003-024-06837-8) |
| cladoselache | 1.5 | 2.0 | carangiform/thunniform-ish, tall lunate tail, pelagic pursuit | 0.5 BL/s · 0.77 m/s | 3.3 BL/s · 5.0 m/s | moderate | none | estimate (mako analogue) | Lunate tail with near-equal lobes; prey swallowed head-first. Mako 2 m: cruise 0.9 m/s, burst 5.0 m/s measured. Shark-like k = 0.6; burst 4√L. [Frey 2023](https://link.springer.com/article/10.1186/s13358-023-00266-6), [Cladoselache](https://en.wikipedia.org/wiki/Cladoselache), [Mako](https://pmc.ncbi.nlm.nih.gov/articles/PMC10952363/) |
| stethacanthus | 0.70 | 3.0 | subcarangiform, heterocercal; spine-brush drag | 0.6 BL/s · 0.42 m/s | 3.0 BL/s · 2.1 m/s | moderate | none | estimate | Spine-brush produces drag at speed and fins are small: "probably a slow-moving shark". Cruise k ≈ 0.5; burst 0.65 × 4√L. Max 3 m is S. productus; asset is 0.7 m Stethacanthus sp. [Stethacanthus](https://en.wikipedia.org/wiki/Stethacanthus), [Ginter & Sun 2007](https://www.app.pan.pl/archive/published/app52/app52-705.pdf) |
| cheirolepis | 0.35 | 0.55 | subcarangiform, heterocercal, active predator | 1.5 BL/s · 0.53 m/s | 7.0 BL/s · 2.45 m/s | moderate | slow | estimate | Fusiform early actinopterygian, large gape; teleost-like rules k = 0.9 and 4√L. 30–55 cm. [Cheirolepis](https://en.wikipedia.org/wiki/Cheirolepis), [Giles 2015](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4950109/) |
| rhinodipterus | 0.40 | 0.60 | anguilliform/subcarangiform, sluggish benthic lungfish | 0.6 BL/s · 0.24 m/s | 3.5 BL/s · 1.4 m/s | sharp | slow | estimate | Gogo dipnoans are 30–60 cm; the R. kimberleyensis concretion is ~12.5 cm of skull and girdle. Modern lungfish cruise well under 1 BL/s and back up with pectoral fins. [Clement 2012](https://onlinelibrary.wiley.com/doi/full/10.1111/j.1475-4983.2011.01118.x), [Clement & Long 2010](https://pmc.ncbi.nlm.nih.gov/articles/PMC2936207/) |
| onychodus | 1.5 | 4.0 | subcarangiform lobe-fin, ambush lunge | 0.6 BL/s · 0.9 m/s | 3.5 BL/s · 5.2 m/s | moderate | slow | estimate | O. jandemarrai known from 47 cm (head 10 cm) with larger material to ~2 m; O. sigmoides ~3–4 m. Grouper-like ambush: low cruise, strong lunge (4√L × 0.9). [Andrews 2006](https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-royal-society-of-edinburgh/article/abs/structure-of-the-sarcopterygian-onychodus-jandemarrai-n-sp-from-gogo-western-australia-with-a-functional-interpretation-of-the-skeleton/83E7A7DC0B81B0C2E9BED0C3846C349C), [Onychodus](https://en.wikipedia.org/wiki/Onychodus) |
| tiktaalik | 1.5 | 2.75 | subcarangiform in shallows, bottom-propped on pectoral fins | 0.5 BL/s · 0.75 m/s | 2.5 BL/s · 3.75 m/s | moderate | slow | estimate | 1.25–2.75 m; flattened head, enlarged pelvis for shallow-water support (Shubin 2014). Crocodile-like: slow, then a short lunge. [Daeschler 2006](https://www.nature.com/articles/nature04639), [Shubin 2014](https://www.pnas.org/doi/10.1073/pnas.1322559111) |
| acanthostega | 0.60 | 1.0 | anguilliform tail + paddling limbs, aquatic | 0.7 BL/s · 0.42 m/s | 3.0 BL/s · 1.8 m/s | sharp | slow | estimate | 60 cm, deep finned tail, elbows unable to flex forward (paddles); all known specimens juvenile. Salamander analogue: flexible body, tight turns. [Sanchez 2016](https://www.nature.com/articles/nature19354) |
| eldredgeops | 0.06 | 0.13 | crawling/walking on biramous limbs; enrols | 0.2 BL/s · 0.012 m/s | 1.0 BL/s · 0.06 m/s | sharp | slow | modelled (queue CFD); estimate (burst) | Phacopid queue models give 0.5–2 cm/s walking; 1–10 cm typical, ~13 cm largest. Legged: pivots in place, steps backward slowly. [Song 2021](https://onlinelibrary.wiley.com/doi/10.1111/pala.12562), [Trenchard 2017](https://onlinelibrary.wiley.com/doi/10.1111/pala.12301), [Devonian Atlas](https://devonianatlas.org/species/eldredgeops-rana/) |
| walliserops | 0.06 | 0.10 | crawling/walking; trident carried ahead | 0.15 BL/s · 0.009 m/s | 0.8 BL/s · 0.05 m/s | moderate | slow | estimate | 4–10 cm including a trident as long as the body; same gait as Eldredgeops with extra drag and a long lever ahead of the pivot. [Walliserops](https://en.wikipedia.org/wiki/Walliserops), [Knell & Fortey 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC9942788/) |
| jaekelopterus | 2.5 | 2.6 | drag-based paddle rowing with lift; bottom walking | 0.25 BL/s · 0.6 m/s | 0.6 BL/s · 1.5 m/s | moderate | slow | modelled (length, rowing); estimate (speed) | 2.5 m from a 46 cm claw (Braddy 2008); Plotnick's paddle-tip limit ~1 m/s for a much smaller eurypterid; Vrazo 2018 in-phase backstroke. Paddles can row asymmetrically or in reverse. [Braddy 2008](https://pmc.ncbi.nlm.nih.gov/articles/PMC2412931/), [Plotnick 1985](https://www.cambridge.org/core/journals/earth-and-environmental-science-transactions-of-royal-society-of-edinburgh/article/abs/lift-based-mechanisms-for-swimming-in-eurypterids-and-portunid-crabs/89954954F4CB25CD197F5BC4BB1F55D6), [Vrazo 2018](https://onlinelibrary.wiley.com/doi/full/10.1111/pala.12336) |
| nahecaris | 0.12 | 0.15 | pleopod (metachronal) swimming; abdominal tail-flip escape | 2.0 BL/s · 0.24 m/s | 8.0 BL/s · 1.0 m/s | sharp | jet | estimate | Nebalia-model phyllocarid (Bergström et al. 1987): natatory pleopods, flexible abdomen, furcal rami; crustacean tail-flip is a fast backward escape (shrimp ~1 m/s). ~12–15 cm. [Bergström 1987](https://link.springer.com/article/10.1007/BF02985909), [Nebalia](https://animaldiversity.org/accounts/Nebalia_bipes/) |
| furcaster | 0.08 | 0.10 | podial walking (tube feet), no arm rowing | 0.05 BL/s · 0.004 m/s | 0.15 BL/s · 0.012 m/s | sharp | slow | modelled (gait); measured analogue (rowing 2 cm/s) | Clark 2020: no joint interfaces for rowing, so slower than Ophiocoma's 2 cm/s row. Length is arm-tip span (~8.5 cm). Any arm can lead, so "turning" and "reversing" are free but slow. [Clark 2020](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7813258/), [Astley 2012](https://journals.biologists.com/jeb/article/215/11/1923/10888/) |
| palaeoisopus | 0.125 | 0.25 | paddling with flattened legs; walking | 0.3 BL/s · 0.04 m/s | 1.0 BL/s · 0.125 m/s | moderate | slow | estimate | Body ≥12.5 cm, leg span ~32 cm, flattened paddle legs of alternating size (Bergström et al. 1980); living pycnogonids swim by slow leg beats. [Bergström 1980](https://www.academia.edu/5146832/), [Palaeoisopus](https://en.wikipedia.org/wiki/Palaeoisopus) |
| manticoceras | 0.10 | 0.17 | jet (funnel), aperture-backward primary | 0.6 BL/s · 0.06 m/s | 2.0 BL/s · 0.20 m/s | sharp | jet | measured analogue (Nautilus) | Nautilus 0.35–1.6 BL/s, mean ~0.08 m/s (Neil & Askew 2018); the compressed, narrow-ventered Manticoceras conch sits on the low-drag side of Westermann morphospace. Shell diameters 7–17 cm. [Neil & Askew 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC5830708/), [Ritterbush 2015](https://sjpp.springeropen.com/articles/10.1007/s13358-015-0096-8) |
| michelinoceras | 0.50 | 1.0 | jet, vertically stable orthocone; up-dodge escape | 0.5 BL/s · 0.25 m/s | 2.5 BL/s · 1.25 m/s | wide | jet | modelled (Peterman 2021) | 57 cm orthocone model: 0.88 BL/s vertical with cruising thrust, 2.85 BL/s with peak thrust, horizontal reorientation wastes thrust. Devonian Michelinoceras material is fragmentary; 0.5 m is a working value, 1 m a large orthocerid. [Peterman & Ritterbush 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8288114/), [Gnoli](https://www.paleoitalia.it/wp-content/uploads/2023/06/05_Gnoli.pdf) |

Reading the table for the game: three tiers fall out. Pursuit swimmers (cladoselache, cheirolepis,
dunkleosteus) cruise at 0.4–1.5 BL/s and burst at 2–7 BL/s. Armoured or benthic fish (coccosteus,
bothriolepis, gemuendina, doryaspis, stethacanthus, the lungfish and tetrapodomorphs) cruise at
0.5–1.2 BL/s and burst at 2.5–6 BL/s but turn worse and cannot hold speed. Invertebrates are an
order of magnitude slower in m/s except the tail-flipping phyllocarid and the vertical orthocone.

## 3. How fish move: what a simulation should copy

### 3.1 Fast starts (C-starts)

An escape is a Mauthner-cell reflex with 5–20 ms latency, then **stage 1**: the body bends into a
C in 10–40 ms (the fish rotates without moving far), then **stage 2**: a single propulsive tail
stroke of 20–60 ms, then variable swimming or a glide. Peak velocities in the first ~100 ms are
10–25 BL/s for 5–30 cm fish (1.5–3 m/s), accelerations 20–100 m/s² (pike ~120 m/s²), distance
covered in the first 100 ms about 0.3–1 BL. Absolute peak speed scales roughly as √L, so BL/s
falls with size; acceleration in m/s² is nearly size-independent. Turning rate scales as 1/L and
over 90 % of the variation in turning rate among aquatic vertebrates is body size. Sources:
Domenici & Blake 1997 (review of the above numbers); Domenici 2001 (scaling); Domenici & Hale 2019
(latency and stage kinematics).

Game rule: an escape is a two-phase animation, ~40 ms pivot then ~50 ms stroke, reaching burst
speed within 0.1 s and holding it for about 1 s (anaerobic muscle; the mako held 2.4 m/s for
14 s). Acceleration in world units should be set from m/s², not from BL/s, so big animals take
proportionally longer to reach top speed.

### 3.2 Turning

Minimum turning radius is a roughly constant fraction of length: ~0.10–0.15 L for fusiform
generalists (trout, bass; Webb 1983), 0.065 L for the manoeuvring specialist angelfish (Domenici &
Blake 1991), ~0.4 L for stiff-bodied tuna (Domenici 2001); painted turtles with a rigid shell
show the same penalty (Rivera et al. 2006). Deeper bodies turn tighter because lateral area and
added mass give more turning force (bass vs trout; Howe & Astley 2022). Turning angular velocity
falls with size (∝ 1/L), so a 3 m arthrodire pivots about ten times slower than a 30 cm one even
though both turn in about the same number of body lengths. Turns are executed as part of the
C-start: the stage-1 bend sets the heading, stage 2 launches along it.

Game rule: turn radius = k·L with k 0.07 (flexible eel-like), 0.12 (generalist), 0.3–0.4 (rigid
fore-body: arthrodires, antiarchs, orthocones); turn rate cap ∝ 1/L.

### 3.3 Burst-and-coast and glide deceleration

Fish swimming below maximum aerobic speed alternate a few tail beats with a passive coast, which
Weihs 1974 showed saves energy because a straight rigid body has less drag than an undulating
one; Videler & Weihs 1982 measured >50 % savings in cod and saithe. During the coast, speed decays
quasi-exponentially under quadratic drag: `v(t) = v0 / (1 + v0·t/λ)` with a characteristic
coasting distance `λ = m / (½·ρ·Cd·A)`, typically 2–5 BL for streamlined fish and about 1 BL for a
blunt armoured body. Fish choose the burst so that the coast drops them to about half the top
speed before the next kick. Sharks are negatively buoyant and sink while coasting; swim-bladdered
fish hold depth.

Game rule: after a burst, decelerate with the quadratic law and a per-creature λ (glide) rather
than a linear friction; let the armoured fish's λ be short so bursts feel like lunges.

### 3.4 Why fish reverse slowly

Body-caudal propulsion only pushes forward. Backing up is a multi-fin behaviour: bluegill use
alternating pectoral fin beats (flared on the outstroke, feathered on the instroke) plus reverse
jets from the dorsal and anal fins, at less than half the tail-beat rate of forward swimming
(Flammang & Lauder 2016); deep-sea eel-like fishes reverse at 0.2–0.5 Hz undulation (Priede et al.
2025). Speeds are a small fraction of a body length per second; 0.1–0.3 BL/s is a safe game value.
Sharks and any fish without mobile paired fins (Doryaspis, Cladoselache, Stethacanthus) do not
back up at all; they drift or turn. The typical escape from a threat ahead is therefore not a
reverse but **back-off, turn, dart**: a brief pectoral back-paddle to gain clearance (< 0.3 BL),
a stage-1 C-bend that rotates the body 90–180° away from the threat, then the stage-2 dart.
Angelfish escape trajectories cluster around 90–180° from the stimulus (Domenici & Blake 1993).

### 3.5 Armour, body depth and tail shape

Webb 1984 separates three designs. **Cruise specialists** (thunniform: tuna, lamnid sharks, the
Engelman Dunkleosteus): stiff body, narrow peduncle, high-aspect-ratio lunate tail; high sustained
speed, poor acceleration, wide turns. **Acceleration specialists** (pike): flexible, deep caudal
region, large tail area; explosive starts, mediocre cruise. **Manoeuvre specialists** (reef fish,
angelfish): deep laterally compressed body, propulsion by pectoral and median fins at low speed,
tight turns, low top speed. A heterocercal (shark-type) tail has a lower aspect ratio and adds
lift, which suits negatively buoyant and benthic fish (Cladoselache's tall, near-symmetrical
lunate tail is the exception that makes it the pursuit shark of the roster). Dermal armour fixes
part of the body length as a rigid segment, which raises the effective turning radius (the tuna
and turtle cases) and lowers acceleration per unit muscle; it does not much affect cruise once the
animal is moving. In this roster the rigid fraction is ~40 % of length in arthrodires, most of the
length in antiarchs and heterostracans, and all of it in cephalopods.

### 3.6 Jumping and breaching

To clear height h the centre of mass must leave the water at `v² ≥ 2gh` plus the momentum lost
as the body exits: ~3.1 m/s for 0.5 m, ~4.4 m/s for 1 m, ~7.7 m/s for 3 m. Chinook salmon exit at
~6.3 m/s and clear ~2 m falls; mullet reach ~1 m, tarpon ~3 m, silver carp 2–3 m; great whites
and makos breach 2–3 m at exit speeds of 8–11 m/s after a 2–2.5 s vertical run; even 8 m basking
sharks breach at 5 m/s (Johnston et al. 2018). Leaping needs a fast-start capable body: benthic,
armoured and eel-like fish do not jump. For this roster only cladoselache (5 m/s burst, a ~1 m
clearance) and cheirolepis (2.4 m/s, a few tens of cm) are plausible leapers; dunkleosteus at
6–7 m/s could physically clear a metre like a breaching shark but there is no reason to think it
did. Invertebrates and the orthocone are out; the orthocone's vertical dodge (Peterman 2021) is
the one "leap" they have, and it stays under water.

### 3.7 Water-column use

Reef fish are strongly bottom-associated: most sit within a metre or two of the substrate, with
planktivores hovering above the reef crest and retreating to it; abundance drops sharply with
distance from structure (Champion et al. 2018 on artificial reefs). Demersal fish split into
strictly benthic forms that rest on the bottom (gobies, flatfish; a goby holds station cheaply in
the bottom boundary layer) and benthopelagic forms hovering just above it. Pelagic fish swim
almost continuously, hold no fixed height, and use the whole column; open-water sharks and tunas
add vertical excursions of tens to hundreds of metres. For the roster: benthic = bothriolepis,
gemuendina, doryaspis, rhinodipterus, tiktaalik, acanthostega, both trilobites, furcaster,
palaeoisopus; demersal/benthopelagic = coccosteus (ambush from the bottom), stethacanthus,
onychodus, jaekelopterus, nahecaris (buried by day, swimming at night); pelagic = dunkleosteus,
titanichthys, cladoselache, cheirolepis, manticoceras, with michelinoceras a vertical migrant.

Game rule: give each creature a preferred height band above the substrate in body lengths
(benthic 0–0.5, demersal 0.5–3, pelagic unbounded) and a return pull toward it.

## 4. Sources

Fossil taxa

- Engelman R.K. 2023. A Devonian fish tale: a new method of body length estimation suggests much smaller sizes for Dunkleosteus terrelli. Diversity 15:318. https://doi.org/10.3390/d15030318
- Engelman R.K. 2024. Reconstructing Dunkleosteus terrelli: a new look for an iconic Devonian predator. Palaeontologia Electronica 27(3):a44. https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction
- Ferrón H.G., Martínez-Pérez C., Botella H. 2017. Ecomorphological inferences in early vertebrates: reconstructing Dunkleosteus terrelli caudal fin from palaeoecological data. PeerJ 5:e4081. https://pmc.ncbi.nlm.nih.gov/articles/PMC5723140/
- Coatham S.J. et al. 2020. Was the Devonian placoderm Titanichthys a suspension feeder? R. Soc. Open Sci. 7:200272. https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/
- Béchard I. et al. 2014. The Devonian placoderm fish Bothriolepis canadensis revisited with three-dimensional digital imagery. Palaeontologia Electronica 17.1.2A. https://www.palaeo-electronica.org/content/2014/647-3d-bothriolepis
- Downs J.P. et al. 2016. A new large-bodied species of Bothriolepis from the Upper Devonian of Ellesmere Island. J. Vert. Paleontol. 36:e1221833. https://www.tandfonline.com/doi/abs/10.1080/02724634.2016.1221833
- Ferrón H.G. et al. 2024. Delta wing design in earliest nektonic vertebrates. Comms Biol 7:1129. https://www.nature.com/articles/s42003-024-06837-8
- Frey L. et al. 2023. The pelvic girdle and fin of Cladoselache. Swiss J. Palaeontol. https://link.springer.com/article/10.1186/s13358-023-00266-6
- Ginter M., Sun Y. 2007. Chondrichthyan remains from the Lower Carboniferous of Muhua. Acta Palaeontol. Pol. 52:705. https://www.app.pan.pl/archive/published/app52/app52-705.pdf
- Giles S. et al. 2015. Endoskeletal structure in Cheirolepis. Zool. J. Linn. Soc. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4950109/
- Clement A.M. 2012. A new species of long-snouted lungfish from the Late Devonian of Australia. Palaeontology 55:51. https://onlinelibrary.wiley.com/doi/full/10.1111/j.1475-4983.2011.01118.x
- Clement A.M., Long J.A. 2010. Air-breathing adaptation in a marine Devonian lungfish. Biol. Lett. https://pmc.ncbi.nlm.nih.gov/articles/PMC2936207/
- Andrews M. et al. 2006. The structure of the sarcopterygian Onychodus jandemarrai from Gogo. Earth Env. Sci. Trans. R. Soc. Edinb. 96:197. https://doi.org/10.1017/S0263593300001309
- Daeschler E.B., Shubin N.H., Jenkins F.A. 2006. A Devonian tetrapod-like fish. Nature 440:757. https://www.nature.com/articles/nature04639
- Shubin N.H. et al. 2014. Pelvic girdle and fin of Tiktaalik roseae. PNAS 111:893. https://www.pnas.org/doi/10.1073/pnas.1322559111
- Sanchez S. et al. 2016. Life history of the stem tetrapod Acanthostega. Nature 537:408. https://www.nature.com/articles/nature19354
- Song H. et al. 2021. CFD confirms drag reduction associated with trilobite queuing behaviour. Palaeontology 64:597. https://onlinelibrary.wiley.com/doi/10.1111/pala.12562
- Trenchard H. et al. 2017. Trilobite pelotons. Palaeontology 60:557. https://onlinelibrary.wiley.com/doi/10.1111/pala.12301
- Knell R.J., Fortey R.A. 2023. Trilobite spines and the trident of Walliserops. PNAS. https://pmc.ncbi.nlm.nih.gov/articles/PMC9942788/
- Braddy S.J., Poschmann M., Tetlie O.E. 2008. Giant claw reveals the largest ever arthropod. Biol. Lett. 4:106. https://pmc.ncbi.nlm.nih.gov/articles/PMC2412931/
- Plotnick R.E. 1985. Lift based mechanisms for swimming in eurypterids and portunid crabs. Trans. R. Soc. Edinb. 76:325. https://doi.org/10.1017/S0263593300010543
- Vrazo M.B., Ciurca S.J. 2018. New trace fossil evidence for eurypterid swimming behaviour. Palaeontology 61:235. https://onlinelibrary.wiley.com/doi/full/10.1111/pala.12336
- Bergström J. et al. 1987. Nahecaris stuertzi, a phyllocarid crustacean from the Lower Devonian Hunsrück Slate. Paläont. Z. 61:273. https://link.springer.com/article/10.1007/BF02985909
- Bergström J., Stürmer W., Winter G. 1980. Palaeoisopus, Palaeopantopus and Palaeothea, pycnogonid arthropods from the Lower Devonian Hunsrück Slate. Paläont. Z. 54:7. https://doi.org/10.1007/BF02985882
- Clark E.G. et al. 2020. Three-dimensional visualization as a tool for interpreting locomotion strategies in ophiuroids from the Devonian Hunsrück Slate. R. Soc. Open Sci. 7:201380. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7813258/
- Peterman D.J., Ritterbush K.A. 2021. Vertical escape tactics and movement potential of orthoconic cephalopods. PeerJ 9:e11797. https://pmc.ncbi.nlm.nih.gov/articles/PMC8288114/
- Ritterbush K.A. 2015. Interpreting drag consequences of ammonoid shells in Westermann Morphospace. Swiss J. Palaeontol. https://sjpp.springeropen.com/articles/10.1007/s13358-015-0096-8
- Gnoli M. Devonian cephalopods of Sardinia (Paleoitalia). https://www.paleoitalia.it/wp-content/uploads/2023/06/05_Gnoli.pdf

Living-animal locomotion

- Bainbridge R. 1958. The speed of swimming of fish as related to size and to the frequency and amplitude of the tail beat. J. Exp. Biol. 35:109. https://doi.org/10.1242/jeb.35.1.109
- Videler J.J. 1993. Fish Swimming. Chapman & Hall. https://doi.org/10.1007/978-94-011-1580-3
- Videler J.J., Weihs D. 1982. Energetic advantages of burst-and-coast swimming of fish at high speeds. J. Exp. Biol. 97:169. https://doi.org/10.1242/jeb.97.1.169
- Weihs D. 1974. Energetic advantages of burst swimming of fish. J. Theor. Biol. 48:215. https://doi.org/10.1016/0022-5193(74)90192-1
- Webb P.W. 1983. Speed, acceleration and manoeuvrability of two teleost fishes. J. Exp. Biol. 102:115. https://doi.org/10.1242/jeb.102.1.115
- Webb P.W. 1984. Body form, locomotion and foraging in aquatic vertebrates. Am. Zool. 24:107. https://doi.org/10.1093/icb/24.1.107
- Domenici P., Blake R.W. 1991. The kinematics and performance of the escape response in the angelfish. J. Exp. Biol. 156:187. https://doi.org/10.1242/jeb.156.1.187
- Domenici P., Blake R.W. 1997. The kinematics and performance of fish fast-start swimming. J. Exp. Biol. 200:1165. https://doi.org/10.1242/jeb.200.8.1165
- Domenici P. 2001. The scaling of locomotor performance in predator–prey encounters: from fish to killer whales. Comp. Biochem. Physiol. A 131:169. https://doi.org/10.1016/S1095-6433(01)00465-2
- Domenici P., Hale M.E. 2019. Escape responses of fish: a review of the diversity in motor control, kinematics and behaviour. J. Exp. Biol. 222:jeb166009. https://doi.org/10.1242/jeb.166009
- Howe S.P., Astley H.C. 2022. Testing the effects of body depth on fish maneuverability via robophysical models. Bioinspir. Biomim. 17:016002. https://doi.org/10.1088/1748-3190/ac33c1
- Rivera G., Rivera A.R.V., Dougherty E.E., Blob R.W. 2006. Aquatic turning performance of painted turtles and functional consequences of a rigid body design. J. Exp. Biol. 209:4203. https://doi.org/10.1242/jeb.02488
- Flammang B.E., Lauder G.V. 2016. Functional morphology and hydrodynamics of backward swimming in bluegill sunfish. Zoology 119:414. https://doi.org/10.1016/j.zool.2016.05.002
- Priede I.G. et al. 2025. Backward swimming in elongated-bodied abyssal demersal fishes. J. Fish Biol. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12327160/
- Watanabe Y.Y. et al. 2015. Comparative analyses of animal-tracking data reveal ecological significance of endothermy in fishes. PNAS 112:6104. https://doi.org/10.1073/pnas.1500316112
- Watanabe Y.Y. et al. 2022. High resolution acoustic telemetry reveals swim speeds and inferred field metabolic rates in juvenile white sharks. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9182713/
- Nosal A.P. et al. 2024. Direct measurement of cruising and burst swimming speeds of the shortfin mako shark. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10952363/
- Johnston E.M. et al. 2018. Latent power of basking sharks revealed by exceptional breaching events. Biol. Lett. 14:20180537. https://royalsocietypublishing.org/doi/10.1098/rsbl.2018.0537
- Neil T.R., Askew G.N. 2018. Swimming mechanics and propulsive efficiency in the chambered nautilus. R. Soc. Open Sci. 5:170467. https://pmc.ncbi.nlm.nih.gov/articles/PMC5830708/
- Astley H.C. 2012. Getting around when you're round: locomotion of the brittle star Ophiocoma echinata. J. Exp. Biol. 215:1923. https://journals.biologists.com/jeb/article/215/11/1923/10888/
- Champion C. et al. 2018. Distribution of pelagic and epi-benthic fish around a multi-module artificial reef-field. Fish. Res. https://www.sciencedirect.com/science/article/abs/pii/S0165783618302546
- Bottom-holding in gobies: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11575849/
