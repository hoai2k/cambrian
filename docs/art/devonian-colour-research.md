# Devonian roster — colour research

Companion to `src/shared/palettes.ts` and `docs/art/devonian-schemes.json`. This is the same
exercise the Cambrian palettes went through: look at how palaeoartists actually paint each animal,
throw out the treatments that carry no colour information (fossil-cast greys, white lineart,
monochrome diagrams, pyrite-gold Hunsrück slabs), and distil what is left into a short list of
named schemes.

Two caveats that hold for every entry below:

- **Nothing here is evidence.** No Devonian animal on this roster preserves pigment. Every hex value
  is a reading off somebody's painting, and the paintings disagree with each other far more than
  the anatomy does. Where one artist's choice dominates only because there is one artist, that is
  said.
- **Hex values are eyeballed** from 500-px reference images (Wikimedia Commons thumbnails, plus a
  handful of artist-site images). Treat them as ±1 step in either direction, not as samples.

Method: Wikimedia Commons category listings (`<Genus>`, `<Genus> life restorations`, plus family
categories where the genus had none) via the Commons API, 2–7 images per creature downloaded to
`/tmp/devonian-ref/<creature>/` and inspected, with a few web searches per creature for
off-Commons work (Nix Illustration, Emily Damstra, Micah Owen, Mark Witton). Roughly 85 images were
looked at in total, of which about 60 carried usable colour.

---

## Placoderms

### C01 · Dunkleosteus

Seven restorations. The modern consensus is dark and cold; older work is warmer and spottier.

- **Charcoal over bone-cream, scalloped boundary, pale eye-patch** — Engelman 2023 and 2024
  (the Palaeo-electronica reconstruction). Body `#383a3b`, belly `#e0dbbf`, eye `#c9c08e`. The
  killer-whale read: dark dorsal, cream ventral, hard edge between them. This is now the "textbook"
  Dunkleosteus.
- **Gunmetal / steel grey, unpatterned** — PlacodermReconstructions render (2024). `#6c7074` body,
  `#9c9e9c` belly. Flat and metallic; reads as armour more than skin.
- **Blue-grey with white speckle and yellow-green fins** — Nobu Tamura (BW). `#7a98b0` body,
  `#d6e4ea` spots, `#b8c44a` fins. A whale-shark treatment.
- **Tan with dark brown blotches** — Nobu Tamura (NT). `#b39a78` body, `#4a3a2a` blotches.
- **Olive-brown-grey with pale striations** — Prehistorica 2021. `#5a5346`. *D. marsaisi*
  (PlacodermReconstructions) is a darker umber `#4a3f36` with `#857863` mottle.

Discarded: the "Common errors in reconstructions" plate and the trunk cross-section (diagrams).

Sources: [Engelman 2024](https://commons.wikimedia.org/wiki/File:Dunkleosteus_terrelli_2024_reconstruction.jpg) ·
[Engelman 2023](https://commons.wikimedia.org/wiki/File:Dunkleosteus_terrelli_2023_reconstruction.png) ·
[PlacodermReconstructions 2024](https://commons.wikimedia.org/wiki/File:Dunkleosteus_terrelli_(2024).png) ·
[Tamura BW](https://commons.wikimedia.org/wiki/File:Dunkleosteus_BW.jpg) ·
[Tamura NT](https://commons.wikimedia.org/wiki/File:Dunkleosteus_NT.jpg) ·
[Prehistorica 2021](https://commons.wikimedia.org/wiki/File:Dunkleosteus2021.jpg) ·
[D. marsaisi](https://commons.wikimedia.org/wiki/File:Dunkleosteus_marsaisi_life_reconstruction.png) ·
[Palaeo-electronica reconstruction paper](https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction)

### C02 · Titanichthys

Six images, five coloured. Everyone reaches for a filter-feeder analogue.

- **Sea-green / teal with pale lichen-white flecks and ridges** — Mark Witton's shoal. Body
  `#7ea89a`, highlights `#d6ece4`, belly `#c8e0d6`. Whale-shark spotting in a green sea.
- **Steel blue with darker vertical bars** — Apokryltaros. Body `#6b8db0`, bars `#2e4c72`.
- **Teal-slate body, blue fins, cream jaw/throat** — Entelognathus (*T. termieri*). Body
  `#566566`, fins `#3f6f8c`, underside `#b7b39c`.
- **Gunmetal render** — PlacodermReconstructions (2024), `#7d8286`; an older version from the same
  hand is dark brown-grey `#4a423a` with darker blotches.

Discarded: the Cleveland Museum wall-mount fossil photo (matrix brown).

Sources: [Witton (Science Photo Library)](https://sciencephotogallery.com/featured/titanichthys-prehistoric-fish-mark-p-wittonscience-photo-library.html) ·
[Apokryltaros](https://commons.wikimedia.org/wiki/File:Titanichthys_agassizi.jpg) ·
[Entelognathus](https://commons.wikimedia.org/wiki/File:Titanichthys_termieri.png) ·
[PlacodermReconstructions 2024](https://commons.wikimedia.org/wiki/File:Titanichthys_clarki_(2024).png) ·
[PlacodermReconstructions (older)](https://commons.wikimedia.org/wiki/File:Titanichthys_clarkii_reconstruction.png)

### C03 · Coccosteus

Six images. Unusually for a placoderm, **green** is the recurring choice — it is a lake fish.

- **Leaf green over cream, yellow eye** — Engelman. Body `#4e8a2c`, belly `#d8d6b4`, eye `#d7c62a`.
- **Olive-green striping over dark brown** — Tamura (BW). `#6f8a4c` / `#4b3b2b`.
- **Dark green, green fins** — Apokryltaros. `#2f6b3c`.
- **Dark brown mottle** — PlacodermReconstructions. `#4b3f35` body, `#7a6c5f` belly.
- **Black-and-cream patchwork with pink tints** — Entelognathus. `#2b2420` / `#e8dcc0` / `#b98e84`.
  Striking, and unlike anything else in the set.

Discarded: Pander's 19th-century engraving.

Sources: [Engelman](https://commons.wikimedia.org/wiki/File:Coccosteus_reconstruction.png) ·
[Tamura](https://commons.wikimedia.org/wiki/File:Coccosteus_BW.jpg) ·
[Apokryltaros](https://commons.wikimedia.org/wiki/File:Coccosteus_cuspidatus.jpg) ·
[PlacodermReconstructions](https://commons.wikimedia.org/wiki/File:Coccosteus_for_Wikipedia.png) ·
[Entelognathus](https://commons.wikimedia.org/wiki/File:C_cuspidatus.png)

### C04 · Bothriolepis

Six images, four coloured. Warm tans and muds dominate; one modern render goes dark.

- **Sandy tan, flat** — Gess & Ahlberg 2023 (*B. africana*, paper figure). `#c4a06c`, shading `#8a6b45`.
- **Mauve-brown armour, tan tail** — Paleobiome (after the 2014 3D reconstruction). `#8b6d66` /
  `#a08a72`.
- **Mud-brown speckled armour, pale fins** — Tamura. `#6f6250` with `#a89a80`, fins `#b9b0a0`.
- **Charcoal armour with cream lichen-mottle and green fin tips** — PlacodermReconstructions
  (2024). `#3d3f41`, mottle `#cfc3a0`, fin `#6f9a2e`.

Discarded: Moloshnikov's *B. zadonica* (stippled lineart), the pencil sketch `Bothriolepis.jpg`.

Sources: [Gess & Ahlberg 2023](https://commons.wikimedia.org/wiki/File:Gessetal2023_Bothriolepis_africana_reconstruction.png) ·
[Paleobiome](https://commons.wikimedia.org/wiki/File:Bothriolepis_canadensis_based_on_2014_reconstruction.jpg) ·
[Tamura](https://commons.wikimedia.org/wiki/File:Bothriolepis_NT_small.jpg) ·
[PlacodermReconstructions 2024](https://commons.wikimedia.org/wiki/File:Bothriolepis_canadensis_(2024).png)

### C05 · Gemuendina

Four images, two coloured, both by Apokryltaros — so this one is a single artist's convention.

- **Ochre-yellow with grey-blue mottling, white-ringed tubercles, yellow eyes** — Apokryltaros
  (two pieces). Body `#b3a04a`, mottle `#6e7a7a`, tubercles `#e6e4d0`, eye `#e8d020`. The
  stargazer/flounder read for an upward-looking bottom fish.
- **Plain sandy tan** — BTMTheMarshmallow. `#c9a870`. Flat, no pattern.

Discarded: the *Placoderm Variety* plate (lineart), fossil casts.

Sources: [Apokryltaros (avancna)](https://commons.wikimedia.org/wiki/File:Gemuendina_stuertzi_by_avancna.jpg) ·
[Apokryltaros, Devonian life](https://commons.wikimedia.org/wiki/File:Devonian_life.jpg) ·
[BTMTheMarshmallow](https://commons.wikimedia.org/wiki/File:Gemuendia_stuertzi_life_restoration.jpg)

## Jawless fish

### C06 · Doryaspis

Four coloured restorations, and they split cleanly into "pale and speckled" and "flat colour".

- **Sand/khaki mottle with darker speckle, dark tail scales** — Nix Illustration. `#a89a6a` /
  `#6a6244`, black eye.
- **Pale grey with dark-grey spotting, darker scaled tail** — Tamura. `#a09890`, spots `#4a4440`,
  tail `#5a5048`.
- **Ice blue-white** — Apokryltaros (*D. arctica*), `#c5d9e6`; **yellow-cream** — Stanton Fink,
  `#d8d070`. Both flat fills; the yellow is discarded as arbitrary, the blue-white noted as a
  legitimate "Arctic" read.

Sources: [Nix Illustration](https://nixillustration.com/science-illustration/2021/doryaspis/) ·
[Tamura](https://commons.wikimedia.org/wiki/File:Doryaspis_NT.jpg) ·
[Apokryltaros](https://commons.wikimedia.org/wiki/File:Doryaspis_arctica.JPG) ·
[Fink](https://commons.wikimedia.org/wiki/File:Doryaspis.jpg)

## Chondrichthyans

### C07 · Cladoselache

Three coloured restorations; two of the three are classic shark countershade.

- **Blue-grey dorsal, pale belly** — Tamura. `#5f7a90` over `#c6d1d8`.
- **Deep navy dorsal, white belly, rosy cheek, blue eye** — EvolutionIncarnate. `#1f2f42` /
  `#e4e7e6`, cheek `#b07a70`, eye `#4a7ab0`. A mako read.
- **Lavender-violet** — DiBgd's Cladoselachidae plate. `#7b6fb0` with `#a89ad0`. Pure invention,
  but it is the one bright Cladoselache anyone has painted — kept for the bright end.

Discarded: the 1904, 1911 and 1917 engravings.

Sources: [Tamura](https://commons.wikimedia.org/wiki/File:Cladoselache_NT_small.jpg) ·
[EvolutionIncarnate](https://commons.wikimedia.org/wiki/File:Cladoselache.png) ·
[DiBgd plate](https://commons.wikimedia.org/wiki/File:Cladoselachidae.jpg)

### C08 · Stethacanthus

Four images (three Bogdanov / DiBgd pieces and a museum diorama model). Note: most of this art is
Carboniferous *Stethacanthus*; the colour convention transfers, the anatomy should not.

- **Grey-lavender over pink-white belly, rust-brown spine-brush, yellow fin margins** — Bogdanov.
  Body `#857a92`, belly `#dcd0d8`, brush `#7a4a3a`, fin edge `#c8b040`.
- **Blue-silver countershade with a yellow belly stripe, purple denticle brush** — "Steth pair".
  `#7b8fa8` / `#e0e0b8`, brush `#6a5070`.
- **Slate grey with white belly, rust brush** — Mammoth Cave diorama model. `#4a5560` / `#c8ccd0`,
  brush `#7a4a3a`.

The consistent signal: the brush is *always* a different, warmer colour than the body.

Sources: [Bogdanov](https://commons.wikimedia.org/wiki/File:Stethacanthus1DB.jpg) ·
[DiBgd pair](https://commons.wikimedia.org/wiki/File:StethacanthusesDB_2.jpg) ·
[Steth pair](https://commons.wikimedia.org/wiki/File:Steth_pair1_cropped.jpg) ·
[Diorama model](https://commons.wikimedia.org/wiki/File:Diorama_of_Mississippian_fossil_fish_-_Stethacanthus_(31828333408).jpg)

## Bony fish

### C09 · Cheirolepis

Only one coloured restoration found (Smokeybjb); the rest are fossils, engravings and papers.

- **Teal-grey body with pale saddle bands, sand-coloured fins, yellow eye** — Smokeybjb.
  `#6f8a80`, bands `#b0c0b0`, fins `#c8bc98`, eye `#c8b040`.
- Convention for early actinopterygians generally is silvery ganoine grey-green; treat the above
  as that convention rather than a Cheirolepis-specific choice.

Sources: [Smokeybjb](https://commons.wikimedia.org/wiki/File:Cheirolepis.jpg) ·
[Wikipedia article](https://en.wikipedia.org/wiki/Cheirolepis)

### C10 · Rhinodipterus

**No life restoration of Rhinodipterus was found** anywhere — Commons, Wikipedia, Alice Clement's
research blog and the Flinders press items all show skulls, endocasts and CT figures. Colour has to
come from lungfish convention.

- **Grey mottle with dark blotches** — Tamura's *Dipterus*. `#8a8a84` / `#4a4a48`.
- Modern lungfish (Neoceratodus, Protopterus) are olive-brown to grey-brown with darker mottling
  and paler bellies — the same family as the dark-brown-mottle placoderm treatment.

Sources: [Tamura Dipterus](https://commons.wikimedia.org/wiki/File:Dipterus_NT.jpg) ·
[Clement, "10 years of Rhinodipterus"](https://draliceclement.com/2020/04/02/10-years-of-rhinodipterus/) ·
[Wikipedia Rhinodipterus (no restoration)](https://en.wikipedia.org/wiki/Rhinodipterus)

### C11 · Onychodus

Two coloured restorations, at opposite ends.

- **Silver-grey with a blue sheen, pale belly, white tusks** — Tamura. `#8c98a4` / `#c4ccd2`,
  tusks `#e6e6dc`. A barracuda read.
- **Teal-green head, copper-orange flank bands, violet fins** — Bogdanov. `#3f8a6a`, `#c46a2a`,
  `#7a4aa8`. Reef-wrasse colouring; entirely speculative and gloriously loud.

Sources: [Tamura](https://commons.wikimedia.org/wiki/File:Onychodus_BW.jpg) ·
[Bogdanov](https://commons.wikimedia.org/wiki/File:OnychodusDB15.jpg)

### C12 · Tiktaalik

Six images. **Olive** is close to unanimous.

- **Olive-bronze with dark dorsal bands, paler belly** — Tamura. `#7a6a3a`, bands `#3a3222`,
  belly `#a89a70`.
- **Olive-green scales, yellow throat, blue-grey tail** — Zina Deretsky / NSF. `#5a6a3a`, `#b8a040`.
- **Olive-khaki** — Harvard MNH model. `#6a6a3a`.
- **Dark blue-slate with brown** — Obsidian Soul render. `#2e3a48` / `#5a4a3a`. The one outlier.
- Conty's grass-green cartoon (`#4a9a3a`) is discarded as stylised.

Sources: [Tamura](https://commons.wikimedia.org/wiki/File:Tiktaalik_BW.jpg) ·
[Deretsky / NSF](https://commons.wikimedia.org/wiki/File:Tiktaalik_roseae_life_restor.jpg) ·
[Harvard model](https://commons.wikimedia.org/wiki/File:Tiktaalik_model_at_the_Harvard_Museum_of_Natural_History.jpg) ·
[Obsidian Soul](https://commons.wikimedia.org/wiki/File:Tiktaalik_restoration_by_ObsidianSoul_01.png)

### C13 · Acanthostega

Six images, five coloured. More variety than Tiktaalik — artists reach for salamanders.

- **Tan with brown leopard spots; red-and-green tail fringe; gold eye** — Tamura. `#a8907a`,
  spots `#4a3a2a`, tail fin `#c86040` / `#8a9a30`, eye `#c8a040`.
- **Grey-brown with pale mottling** — SeismicShrimp. `#6a5f57` / `#a89a90`.
- **Olive-brown mottle** — Bechly's museum model photo. `#6a5a3a` / `#a08050`.
- **Amber-orange salamander** — Maija Karala. `#d08a30`, belly `#e8d8a0`.
- **Teal-green camouflage** — Foolp. `#3a7a6a` / `#8ac8a0`.

Discarded: the ZICA outline (lineart).

Sources: [Tamura](https://commons.wikimedia.org/wiki/File:Acanthostega_BW.jpg) ·
[SeismicShrimp](https://commons.wikimedia.org/wiki/File:Acanthostega_gunnari.png) ·
[Bechly model](https://commons.wikimedia.org/wiki/File:Acanthostega_model.jpg) ·
[Karala](https://commons.wikimedia.org/wiki/File:Acanthostega.jpg) ·
[Foolp](https://commons.wikimedia.org/wiki/File:AcanthostegaNV.jpg)

## Trilobites

### C14 · Eldredgeops

Five images, two of them fossils. Living trilobites are almost always painted dark and cool, with
the eye lenses as the highlight.

- **Slate blue-grey with lilac highlights, red-brown freckling, indigo eyes** — Emily Damstra.
  Body `#6d7a92`, highlights `#c8c8d8`, freckles `#7a3a30`, eyes `#262a52`. The best-observed
  living-phacopid painting there is.
- **Umber brown, dark eye** — Tamura (*Phacops and Walliserops*). `#7a5a3a`.
- **Teal-blue and mustard** — Apokryltaros (*Trypaulites*, a related phacopid). `#7ac8c0` /
  `#b89a30`. Speculative.
- Fossil: black-brown calcite `#2a2622` with pale lenses — the "shop fossil" look, discarded.

Sources: [Damstra](https://www.emilydamstra.com/portfolio/devonian-trilobite/) ·
[Tamura](https://commons.wikimedia.org/wiki/File:Phacops_and_Walliserops.jpg) ·
[Apokryltaros Trypaulites](https://commons.wikimedia.org/wiki/File:Trypaulites_calypso.jpg) ·
[Devonian Atlas](https://devonianatlas.org/species/eldredgeops-rana/)

### C15 · Walliserops

Three images, one of them a life restoration in colour (Nix) plus Tamura's, plus fossils.

- **Rust-orange body, teal-to-cream spines and trident, grey-brown eyes** — Nix Illustration
  (*W. hammii*). Body `#c05a2a` → `#e08a40`, spines `#3a9ab0` → `#e8e8c8`, eye `#5a4a48`.
- **Umber body with blood-red trident and spine tips** — Tamura. `#7a5a3a`, trident `#c02a2a`.
- Both artists make the **trident a signal colour against the body** — that is the recurring idea.
- Fossils: black `#1e1c1a` on tan `#c8b898` matrix; discarded.

Sources: [Nix Illustration](https://nixillustration.com/tag/walliserops/) ·
[Tamura](https://commons.wikimedia.org/wiki/File:Phacops_and_Walliserops.jpg) ·
[Fossil, James St. John](https://commons.wikimedia.org/wiki/File:Walliserops_trifurcatus_fossil_trilobite_(Devonian,_Morocco).jpg)

## Chelicerates and Hunsrück arthropods

### C16 · Jaekelopterus

Three images (two of the genus, one pterygotid plate).

- **Red-brown with yellow segment margins, blue eyes** — DiBgd. `#8a4a3a`, edges `#d8a030`,
  eye `#2a3a6a`.
- **Slate lavender-grey with darker joints** — Junnn11. `#6a6270` / `#4a4450`. The same artist's
  pterygotid plate cycles through grey, olive and tan variants.
- Museum/toy convention (CollectA etc.) is also red-brown; that is the majority colour.

Sources: [DiBgd](https://commons.wikimedia.org/wiki/File:Jaekelopterus_rhenaniae_reconstruction.jpg) ·
[Junnn11](https://commons.wikimedia.org/wiki/File:20210106_Jaekelopterus_rhenaniae.png) ·
[Junnn11 pterygotids](https://commons.wikimedia.org/wiki/File:20201227_Pterygotidae_pterygotid.png)

### C17 · Nahecaris

**No coloured life restoration found.** Everything on Commons and in the literature is a slate
slab — dark grey `#3a3d42` with a pale pyrite/mineral film. The Bristol "Nahecaris project" and
Bergström & Briggs papers are anatomy only.

- Fall back to phyllocarid / leptostracan convention: translucent tan-orange carapace with the
  gut showing through, dark stalked eyes. This is exactly the "Amber Lantern" idea from the
  Cambrian set, re-tuned.
- Do **not** use the pyrite gold of the fossils.

Sources: [Bundenbach specimen](https://commons.wikimedia.org/wiki/File:Nahecaris_stuertzi_Bundenbach.JPG) ·
[Bergström & Briggs, PalZ](https://link.springer.com/article/10.1007/BF02985909) ·
[Nahecaris project](https://research-information.bris.ac.uk/en/publications/the-inahecarisi-project-releasing-the-marine-life-of-the-devonian/)

### C18 · Furcaster

**No coloured life restoration found.** Fossils are pyritised (gold-silver on black slate:
`#8a7a5a` on `#2a2c30`); the Bremerhaven museum piece is the same slab look.

- Fall back to modern ophiuroid convention: banded brown/tan arms with a darker disc, or rust-red.
- Discard the pyrite.

Sources: [Bundenbach specimen](https://commons.wikimedia.org/wiki/File:Furcaster_1_Bundenbach.JPG) ·
[Bremerhaven](https://commons.wikimedia.org/wiki/File:Furcaster_decheni_-_Zoo_am_Meer_-_Bremerhaven_01.jpg) ·
[Locomotion study](https://rvc-repository.worktribe.com/output/1549616/three-dimensional-visualization-as-a-tool-for-interpreting-locomotion-strategies-in-ophiuroids-from-the-devonian-hunsruck-slate)

### C19 · Palaeoisopus

One coloured restoration (Junnn11) plus fossils and the Sabroux et al. modern-pycnogonid collage.

- **Tan-beige cuticle with red-brown segment shading and joints** — Junnn11. `#c8b080` /
  `#7a4a3a`.
- Modern sea spiders (collage): translucent white, orange-red, tan; none of them dark.
- Fossils: dark brown on grey slate; discarded.

Sources: [Junnn11](https://commons.wikimedia.org/wiki/File:20200503_Palaeoisopus_problematicus.png) ·
[Pycnogonida collage](https://commons.wikimedia.org/wiki/File:Pycnogonida_collage.png) ·
[Sabroux et al. 2024](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11485130/)

## Cephalopods

### C20 · Manticoceras

**No coloured life restoration of Manticoceras found**; the Korn & Klug life-cycle figures are
line diagrams and the Commons material is fossils (rust-brown `#8a5a30` and grey internal moulds
showing sutures — which must *not* become surface markings, per the design doc).

- Ammonoid convention (Springer "Ammonoid Color Patterns"; palaeoart generally): pale cream/tan
  shell with red-brown **radial bands** across the whorls, soft parts greyish-pink.
- Devonian goniatite *Anetoceras* (Apokryltaros) is painted blue with dark bands — a bright
  outlier worth keeping for the loud end.

Sources: [NMNH fossil](https://commons.wikimedia.org/wiki/File:Manticoceras_NMNH.jpg) ·
[Klug 2001, life cycles](https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1502-3931.2001.tb00051.x) ·
[Ammonoid Color Patterns](https://link.springer.com/chapter/10.1007/978-94-017-9630-9_2) ·
[Apokryltaros Anetoceras](https://commons.wikimedia.org/wiki/File:Anetoceras_hunsrueckianium.jpg)

### C21 · Michelinoceras

Five images; one dedicated restoration (Micah Owen) plus orthocone convention.

- **Pale grey shell with dark red-brown dorsal zigzag bands; pink-grey mottled soft parts; tan
  hood** — Micah Owen. Shell `#c8c4bc`, zigzag `#5a1a14`, soft parts `#9a8078`, hood `#b0a080`.
  This is the one orthocone with a *fossil* argument (preserved colour bands on Orthocerida).
- **Grey-white ribbed shell, cream arms, dark eye** — Tamura's *Cyrtoceras*. `#b8b8b0` / `#c8b898`.
- **Tan-brown shell** — Antonov's orthocone plate, `#a08050`.
- **Teal-blue shells** — Klug et al. Meride Limestone scene (tiny, background). Bright outlier.

Sources: [Micah Owen](https://micahowen.com/2021/12/26/bringing-invertebrates-to-life-michelinoceras/) ·
[Tamura Cyrtoceras](https://commons.wikimedia.org/wiki/File:Cyrtoceras_NT_small.jpg) ·
[Antonov orthocones](https://commons.wikimedia.org/wiki/File:Orthocone_nautiloids_reconstruction.png) ·
[Meride Limestone scene](https://commons.wikimedia.org/wiki/File:Meride_Limestone_paleofauna.png)

---

## What recurs across the roster

- **Armoured placoderms** — dark, cool armour (charcoal, gunmetal, slate) over a pale cream or
  grey ventral, with a hard edge between them; the alternative family is warm mud-brown or sandy
  tan with speckle. Green is specific to the lake arthrodire *Coccosteus*. Eyes are small and
  usually left dark, except Engelman's pale eye-patch on *Dunkleosteus*.
- **Filter feeders** (*Titanichthys*) borrow whale-shark clothes: sea-green or blue with white
  flecks.
- **Sharks** — classic countershade, blue-grey or navy over white. The *Stethacanthus* brush is
  always a warm contrasting colour (rust, purple) against a cool body.
- **Jawless fish** — pale, speckled, sandy or grey; the shield reads as shell, not skin.
- **Lobe-fins and tetrapods** — olive/khaki/bronze mottle is near-universal for *Tiktaalik*;
  *Acanthostega* wanders into tan-with-spots and salamander orange. *Onychodus* is silver unless
  someone decides to make it a reef fish.
- **Trilobites** — dark, cool exoskeleton (slate blue-grey, umber) with pale eye lenses; spines
  and the trident get a signal colour (red, teal-white).
- **Eurypterids** — red-brown with yellow margins, or lavender-grey.
- **Hunsrück arthropods and echinoderms** — no colour art exists; the fossils are pyrite-gold on
  slate and that must be discarded. Use translucent tan/orange for the arthropods and banded brown
  for the brittle star.
- **Cephalopod shells** — cream to pale grey with red-brown zigzags (orthocones) or radial bands
  (coiled ammonoids); soft parts pink-grey; the occasional blue-striped shell exists as a bright
  outlier.

## Which schemes suit which creatures

See `creatureSchemes` in `devonian-schemes.json`. In short: *Dunkleosteus* → Cleveland Charcoal;
*Titanichthys* → Shoal Sea-Green; *Coccosteus* → Orcadie Leaf; *Bothriolepis* → Miguasha Sand;
*Gemuendina* → Stargazer Ochre; *Doryaspis* → Svalbard Shingle; *Cladoselache* → Cleveland
Countershade; *Stethacanthus* → Lavender Brush; *Cheirolepis* → Ganoine Teal; *Rhinodipterus* →
Orcadian Mud (lungfish convention, no direct art); *Onychodus* → Gogo Silver; *Tiktaalik* →
Ellesmere Olive; *Acanthostega* → Greenland Leopard; *Eldredgeops* → Slate and Bone; *Walliserops*
→ Trident Ember; *Jaekelopterus* → Rhineland Rust; *Nahecaris* and *Palaeoisopus* → Hunsrück
Glass; *Furcaster* → Brittle-star Band; *Manticoceras* → Goniatite Band; *Michelinoceras* →
Orthocone Zigzag.

Reasonable alternates seen in the art: *Dunkleosteus* and *Titanichthys* both wear Gunmetal-type
grey in the PlacodermReconstructions renders (covered by Cleveland Charcoal's mid-tones);
*Cladoselache* could take Cladoselachid Violet; *Onychodus* could take Gogo Carnival; *Manticoceras*
could take Hunsrück Blue-stripe; *Bothriolepis* could take Cleveland Charcoal (the 2024 render).

Slot roles for these animals: body = skin/armour/shell; eyes; fins = fins, membranes, fin folds,
aperture soft parts; legs = limbs, arms, appendages, tentacles; accent = armour plates, spines,
trident, tusks, shell ornament, spine-brush; underside = belly.
