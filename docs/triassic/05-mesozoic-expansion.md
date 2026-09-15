# 05 · The rest of the Mesozoic: Jurassic and Cretaceous seas

**Status:** design proposal, 14 September 2026; two bodies built, 15 September 2026, without the
decision below being taken. Nothing in the roster or the mechanics of this document is built. The question it answers:
if the Triassic game were widened to the whole Mesozoic — Archelon and the mosasaurs being the
obvious first asks — what else is out there worth putting under a controller, and what would each
body bring that the roster does not already have? Same shape as [01](01-triassic-design.md):
natural history with a confidence label from the literature (**S** supported, **I** inferred,
**C** contested), a game reading of the anatomy labelled as invention, and a kit written against
the traits and hooks the engine already has (`src/content/creature-types.ts`,
`src/sim/era-rules.ts`, `src/sim/locomotion.ts`). Numbers are balance parameters, not fossil
measurements. Game lengths use the Triassic's own rule, `4.0·m^0.55`
([01 · Sizes and rungs](01-triassic-design.md#sizes-and-rungs)), so every candidate lands on the
ladder the third era already draws.

## Two ways to do it, and a recommendation

The Triassic is *the return to the sea*: reptiles walking back into the water, every one of them
paying for effort with a lungful. The Jurassic and Cretaceous are what happened once they owned
it — ichthyosaurs with dinner-plate eyes hunting belemnites in the dark, plesiosaurs of two builds
splitting the sea between them, crocodiles going pelagic and losing their armour, a shark-shaped
bony fish the size of a whale that ate nothing bigger than a shrimp, and then, in the last thirty
million years, lizards taking the whole sea over from below. That is a second story, not a longer
first one.

**A. Widen the Triassic.** The era already mixes localities and says so in each biome's banner
(the Muschelkalk beside Monte San Giorgio beside Nevada, [02](02-biomes-and-depth.md)). The same
honesty stretches: a biome is named for its *period* as well as its place, the outer bands drawn
from the Jurassic and Cretaceous and the shore from the Triassic, and the codex says which animal
is from when. Cheap — one content pack, one rules file, the mechanics below as hooks — and it
gives the mosasaurs and Archelon a home without a fourth entry page. What it costs is the pitch:
a Nothosaurus and a Mosasaurus are 140 million years apart, the "return" stops being the whole
game, and a roster of 21 has no room for both without dropping half of each.

**B. A fourth game.** The era boundary ([06](../redesign/06-era-content.md)) makes a game a content
pack, a rules file and an entry that calls `selectEra` before importing the app; the Triassic
proved the seams (`breathing`, `birth`, `floorDepth`, `shore`) are optional and cost the other
eras nothing. A Jurassic–Cretaceous game keeps the Triassic's air rule, depth, live birth and
shore class as inherited engine, and adds what this document proposes: **the sky**, **the gape**,
**weight** and **the bends**. Its roster is written below as a full 21 with alternates, so it can
be read either as the fourth game or as the pool a widened Triassic would draw from.

**Recommendation: B**, and the roster below is written for it. The Triassic's identity is its
own and its 21 bodies exist; the Jurassic–Cretaceous has more than 21 good bodies of its own, four
mechanics the Triassic does not need, and one fauna (the Oxford Clay) that supplies half a roster
from a single sea floor. If only one expansion is affordable, A is the way to take it, and the
section [If the Triassic is widened instead](#if-the-triassic-is-widened-instead) says which
twelve bodies and which two mechanics to carry over. Title, in the series' habit: *Cretaceous
Crown* (the takeover is the story's end) or *Jurassic Jaws* (if the Oxford Clay leads).

## Design pillars for the fourth game

1. **The surface has teeth.** Air is still what effort costs, and the blow still pings the radar.
   Now something is *watching the surface from above*: pterosaurs and diving birds patrol the
   light window and stoop on a head that comes up. The one place every reptile has to go is the
   one place the sky can reach.
2. **Jaws, not length.** The Triassic ranks by body length and lets that decide who eats whom. This
   sea is full of animals whose mouth and body disagree: a 10 m elasmosaur with a rung II head, a
   16 m fish that swallows plankton, a 4.6 m turtle with a beak for ammonites, and a 5 m fish that
   died swallowing a 1.8 m one whole. Who can eat you is a question about *the gape*.
3. **The sea has a floor, and it is a long way down.** Weight, held back through three eras
   (`docs/research/locomotion-ideas.md` §1), arrives with the animals that make it interesting:
   sharks that sink when they stop, early mosasaurs ballasted with bone, turtles that settle to
   sleep. And the fossils of this era, not the Triassic's, carry the bends.
4. **Two builds of everything.** Long-neck and short-neck plesiosaurs, cutting and crushing
   mosasaurs, gharial and dolphin crocodiles, pursuit and filter fish. Every family on the roster
   splits into a pair that plays differently, so the roster is built from pairs.
5. **Keep the hands.** Same controller, same verbs, same three modes.

## New era mechanics

Each is a game reading of anatomy. None touches `game.ts` or `combat.ts`; each is a hook or a
`CreatureDef` field, in the Triassic's manner.

### The sky: a second class of non-player

The Triassic's shore animals (`shore: true`, `src/sim/triassic/shore.ts`) are brainless actors
pinned on the beach that telegraph and strike into the water. **Sky animals** are the same class
pinned *above* the water: a patrol path over the light window, placed by the world like a
landmark, that stoops on any body at the surface within its reach and, for a snack-sized victim,
takes it (`takeHold`) and climbs. Their shadow crosses the surface first, which is the telegraph,
and the radar draws them as the shore's hatched arc turned upward.

What it does to the game is price the blow a second time. Under the Triassic rule the surface is
where a body is paid and where everything hunting can hear it; here a small animal that comes up
under a Pteranodon's circuit is paid and then taken. A large one is merely pecked, which is a
poise hit at the worst possible moment. The counter is in the fossils: Solnhofen preserves
*Rhamphorhynchus* tangled in the jaws of the fish *Aspidorhynchus*, more than once (S; Frey &
Tischlinger 2012) — so a player big enough to hold the diver can **grab it back** on the stoop,
and the sky animal's own strike opens the window to do it. That is a sky animal's whole
vulnerability and it is `closeGrip` on a lunge, already built.

Candidates: *Pteranodon* (wingspan to 7 m, fish in the gut, Niobrara; S) as the standard
patroller; *Rhamphorhynchus* (1.8 m wingspan, Solnhofen) as the small one over the lagoon;
*Ichthyornis* flocks as surface snacks; *Hesperornis* is a diving bird and is playable, below.
Nothing ever lands; a stooped sky animal climbs out again. `sky: true` beside `shore: true`, the
same brainless stepper with a patrol instead of a post.

### The gape: what a mouth can take

The size-band rule decides who can eat whom by body length. Add one optional field, **`gape`**:
the rung the animal's *jaws* are worth, defaulting to its length rung, so nothing on the three
existing rosters changes. Eating, swallowing and `takeHold` test the gape; being eaten, chased
and ranked still test the body. Four animals need it and the rest of the roster is more
interesting for it:

- *Elasmosaurus*: a rung IV body with rung II jaws. Nothing rung III can eat it and it can eat
  nothing rung III. The giant that cannot bite you — and cannot be bitten by much.
- *Leedsichthys*: rung IV, gape 0, `noBite`. The biggest thing in the sea will not fight.
- *Archelon*: rung III body, a beak that takes shells and squid and nothing that swims fast.
- *Xiphactinus*: rung III body, **gape IV**: it swallows a rung up, whole, and it costs it —
  see its kit. The one animal whose gape is bigger than its body, because the fossil is.

The HUD shows the gape where it shows the rung, as a second mark, only where the two disagree.

### Weight

The unbuilt first idea of `docs/research/locomotion-ideas.md`, deliberately held back because it
changes every fight at once. This is the roster it was waiting for. **`buoyancy: 'heavy'`**: below
a fraction of cruise the body loses height, holding station costs stamina, and resting means the
floor or a ledge. The Triassic's `sink` is its floor-walking cousin (settles when idle, punts);
weight is the pelagic version — a shark that stops swimming is *falling*, not standing.

The fossils give it a shape the Triassic could not: mosasaurs began ballasted and ended light.
The early, near-shore forms (*Dallasaurus*, *Halisaurus*) have pachyostotic bone, dense as a
manatee's, and the late pelagic ones (*Mosasaurus*, *Plotosaurus*) are osteoporotic like a whale
(S; Houssaye 2013). So the family plays as a ladder from heavy to neutral, and the sharks stay
heavy throughout because they never had a bladder (S). An ichthyosaur, a plesiosaur and a bony
fish are neutral as before. Ammonite shells are buoyant as the ceratites already are.

### The bends

Avascular necrosis — the bone damage divers get from rising too fast — is common in Jurassic and
Cretaceous ichthyosaurs and in mosasaurs (*Platecarpus*, *Tylosaurus*), and **absent from every
Triassic ichthyosaur examined** (S; Rothschild, Xiaoting & Martin 2012; Rothschild & Martin 1987).
Deep diving was learned in this era, and the fossils show it being learned. As a mechanic, in one
optional field: **`deepDiver: true`** lets a body recover a *fraction* of stamina at depth (the
long-dive physiology the Triassic gives nobody), and in return a climb from below a depth on the
sprint — the fast rise — costs poise on arrival, so a deep diver that has to come up in a hurry
arrives at the surface staggered. A body without the field is exactly as it is now. Ichthyosaurs,
mosasaurs and the pliosaurs carry it; plesiosaurs of the long-necked build, turtles and the
crocodiles do not. It is the era's one new pressure on the climb and it should be tuned gently:
the Triassic learned that a climb which reads as the button not working is worse than no rule.

### Inherited whole from the Triassic

Air as the cost of effort; the surface state and the blow; the floor that sinks by biome
(`floorDepth`); live birth beside a mother (`birth: 'live'`, which here has its own fossil:
*Polycotylus* carrying one large fetus, a K-selected life history that implies care of the young —
S/I, O'Keefe & Chiappe 2011); leathery eggs laid in cover for everything else; the shore that
reaches in; armour with a facing; the held breath under a grip; heat and cold, with
`warmBlooded` now covering mosasaurs and plesiosaurs as well as ichthyosaurs (S; Bernard et al.
2010, Harrell et al. 2016); feeding stations on the floor, with the shell beds now inoceramid and
ammonite pavements; and **nobody leaves the water.** Two animals on this roster nested on land
(the turtle and the bird) and the codex says so; a player never goes ashore.

## Biomes: the seas to draw from

The nine slots recast again, as the Triassic recast the Devonian's, and every one named for a real
sea floor. The two periods are mixed by biome, as the Triassic mixes its three epochs, and the
banner says which is which. Depth keeps the Triassic's profile (shallows 10 → basin 88).

| Slot | Biome | Drawn from | Character |
| --- | --- | --- | --- |
| `shallows` | **Chalk Shallows** | Niobrara, Western Interior Seaway, Coniacian–Campanian | Milky white water over coccolith ooze; *Uintacrinus* crinoid mats lying free on the floor; giant *Platyceramus* clams two metres across that small fish shelter *inside* (S), which is a hiding place for rung I. |
| `nursery` | **Seagrass Meadow** | Late Cretaceous Tethys; the first seagrasses (S) | The first true marine grass. Cover for calves, a grazing station, brackish estuary mouths under cycads and conifers. The shore animals stand here. |
| `shelf` | **Solnhofen Lagoon** | Tithonian, Bavaria | Hypersaline, still, glass-clear, a dead floor under living water; *Leptolepides* schools, *Aspidorhynchus*, *Rhamphorhynchus* overhead. The sky's first appearance. |
| `forest` | **Rudist Reef** | Aptian–Maastrichtian Tethyan platforms | The Cretaceous reef is made of bivalves: rudist thickets in tubes and cones replacing coral (S). A prop family with no analogue in the other eras. |
| `boulders` | **Coral–Sponge Reef** | Late Jurassic Swabian and Tethyan sponge reefs | Siliceous sponge mounds and coral bushes: the last coral reef before the rudists take over. |
| `flats` | **Ammonite Pavement** | Pierre Shale, Campanian; Baculites zones | A floor of *Baculites* and *Placenticeras* shells, the crushing station for Globidens and Ptychodus; heteromorph ammonites drifting over it. |
| `channel` | **Kimmeridge Channels** | Kimmeridge Clay, Tithonian | Dark, current-swept, the pliosaurs' commute. |
| `escarpment` | **Oxford Clay Slope** | Callovian, Peterborough | The one sea floor that gives half the roster: Leedsichthys overhead, Cryptoclidus, Liopleurodon, Metriorhynchus, Ophthalmosaurus in one fauna (S). Log rafts of *Seirocrinus* on drift trunks — here best attested, on Posidonia logs eighteen metres long (S). |
| `basin` | **Posidonia Basin** | Toarcian, Holzmaden | Anoxic black-shale floor, nothing on it; ichthyosaurs birthing in the column; the Devonian's dead zones reused for the floor. The mosasaurs' hunting ground at the end. |

One more environment is worth a biome modifier rather than a slot: **the polar sea.** Maastrichtian
Antarctica (Seymour Island; *Aristonectes*, *Morturneria*) is cold water under a polar night (S), and
the game already has a day cycle and a cold modifier. A biome tagged polar runs the night long and
the cold hard, which is where a warm-blooded body's advantage is largest and a turtle's smallest.

## The roster

Twenty-one playable, in the Triassic's format: natural history, reconstruction note, kit. Game
length in brackets is `4.0·m^0.55` of the representative length.

| Rung | Game length | Who |
| --- | --- | --- |
| **IV · Giants** | 14–19 | Leedsichthys (18.4), Mosasaurus (16.4), Tylosaurus (16.0), Pliosaurus (15.7), Elasmosaurus (14.4), Ptychodus (14.2) |
| **III · Hunters** | 7–12 | Temnodontosaurus (13.8), Cretoxyrhina (12.1), Plesiosuchus (11.6), Globidens (10.8), Xiphactinus (10.2), Ophthalmosaurus (9.7), Archelon (9.3), Dakosaurus (9.1) |
| **II · Shelf** | 4–7 | Cryptoclidus (8.6), Stenopterygius (8.0), Dolichorhynchops (7.3), Metriorhynchus (7.3), Hesperornis (5.5), Enchodus (5.0), Lepidotes (5.4) |
| **I · Floor and shallows** | 1.4–3 | Aspidorhynchus (3.0), Baculites (2.7), Passaloteuthis (2.4), Gyrodus (2.4) |

Twenty-five names for twenty-one slots; the four the roster can spare are marked *(reserve)*
in the entries and the alternates list holds the rest. Temnodontosaurus sits at the top of rung
III on purpose: a hunter of hunters that is nearly a giant reads better than a small giant.

### Rung IV · Giants

#### M01 · Mosasaurus hoffmannii — the crown

*Maastrichtian (~68–66 Ma), Maastricht Formation, the Netherlands.* 11–13 m on current estimates
(S; the older 17 m is superseded), a 1.6 m skull, robust cutting teeth with a second row on the
palate that ratchets prey down the throat (S). Tail with a downturned end carrying a crescent fluke
(S by bracket from *Prognathodon* and *Platecarpus* soft tissue, Lindgren et al. 2010, 2013), skin
of small scales, dark pigment (S; Lindgren et al. 2014), live birth (S by bracket; Carsosaurus,
Field et al. 2015), warm-blooded (S; Harrell et al. 2016). Osteoporotic, pelagic, neutrally
buoyant (S; Houssaye). Ate everything: fish, turtles, ammonites, other mosasaurs (S from bite
marks and gut contents across the family).

*Reconstruction.* A lizard's head on a shark's body: forked tongue (I), scaled hide, the fluke.
Not a crocodile, not a whale.

*Kit.* Role: apex of the late sea. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`,
`deepDiver`, `buoyancy` neutral, `thunniform` (the fluke) with a body that still bends
(`pitchRate` free). `light` Snap; `heavy` **Ratchet bite** (`grab: true`; a held victim is drawn
a step further into the jaws each second, the `GRIP_MEAL` window shortening as it goes). Ability ★
**Sound the depth** (Y): the deep dive — `deepDiver` recovery at full for six seconds, then the
climb. Passive: the pterygoid teeth make a mouthful nearly impossible to tear loose from (the
tug-of-war strain is halved against it). Weakness: the sharks are `rival` and Tylosaurus is
`rival`; a mosasaur's turn is a lizard's, wide; and the eye is small — the dark is not its
friend, unlike the ichthyosaur's.

#### M02 · Tylosaurus proriger — the ram

*Santonian–Campanian (~85–80 Ma), Niobrara Chalk, Kansas.* 12–13 m (S; the Bunker specimen). A
long toothless bony rostrum ahead of the teeth, read as a ram (I). One Pierre Shale specimen holds
a fish, a shark, a smaller mosasaur and a diving bird in its gut at once (S; Martin & Bjork 1987),
and another a polycotylid plesiosaur (S; Everhart 2004). Dark countershading (S; the Lindgren
melanosome study's mosasaur is a tylosaurine).

*Reconstruction.* Slimmer and longer-snouted than Mosasaurus, the rostrum visibly blunt.

*Kit.* Role: the generalist giant. As M01 for breathing, birth, blood and diving. `light` Snap;
`heavy` **Ram** (the Devonian's `runThrough` re-aimed: a rostrum-first charge that stuns and
knocks back without a grip, high poise damage, low pierce), the counter to armour it cannot bite
through. Ability ★ **Everything is food** (passive, in place of a Y): eats any diet class — meat,
shell, the sky's birds when one is grabbed back — and takes full nutrition from each. Weakness: a
ram that misses leaves it broadside and drifting; the shallowest water is closed to it.

#### M03 · Pliosaurus funkei — Predator X

*Tithonian (~147 Ma), Slottsmøya Member, Svalbard.* 10–13 m (I; the estimate is from a partial
skeleton), a 2 m skull, teeth to 30 cm, four flippers each a metre and a half, a short neck (S).
The bite force estimates are the largest of any Mesozoic marine animal (I). *Kronosaurus
queenslandicus* (Albian, Queensland, 10–11 m on the revised figure, S) is the same kit in the
Cretaceous and the alternate skin. *Liopleurodon ferox* (Callovian, Oxford Clay) is the same
animal at 6.4 m (S; the 25 m of a television series is fiction) and is the rung III version if a
smaller pliosaur is wanted.

*Reconstruction.* A crocodile's head on a sea turtle's body, and the head is a third of it.

*Kit.* Role: the flying giant. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`, `flight`
(four-flipper underwater flight: the fastest acceleration at rung IV, wide turns, no reverse),
`deepDiver`. `light` Bite; `heavy` **Seize** (`grab: true`, lunge 1.6, the biggest bite band in
the sea). Ability ★ **Power stroke** (Rhaeticosaurus' Y, scaled: three body lengths in a shoulder
first burst). Passive: nose to the surface — an air-breather with `flight` climbs faster than
anything its size, so it is the giant that is least afraid of depth. Weakness: it cannot reverse
and cannot turn inside anything; a hunter that stays on its flank is safe until it is not.

#### M04 · Elasmosaurus platyurus — the neck

*Campanian (~80 Ma), Pierre Shale, Kansas.* 10.3 m, of which the neck is 7 m in 72 vertebrae (S);
*Albertonectes* has 76 and 11.2 m (S). The neck was **stiff**, bending mostly downward and only a
little side to side (S/I; Zammit et al. 2008, Noè et al. 2017): a stealth approach from below and
to the side of a school, the body left out of the school's sight (I). Gastroliths in the gut (S).
Live birth by bracket from *Polycotylus* (S), with the single large offspring that implies care of
the young (I). Late relatives (*Aristonectes*, *Morturneria*, Maastrichtian Antarctica and Chile)
have hundreds of fine interlocking teeth read as a sieve (S/I; O'Gorman et al. 2017), the filter
feeding elasmosaur.

*Reconstruction.* The neck as a straight beam, not a swan's curve: everything from the last
thirty years says it could not do the loop the old paintings gave it.

*Kit.* Role: the giant that cannot bite you. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`,
`flight` at the slow end, **`gape: 2`** (the head is rung II, and that is the whole kit),
`neckReach: 1.5`. `light` Snap (rung II damage, two body lengths from the trunk); no heavy that
bites — `heavy` **Neck sweep** (a wide, low-damage arc that scatters a school). Ability ★
**From below** (Y): a slow approach in which the body's own radar signature is suppressed and only
the head's counts, so a school or a rung II hunter sees a small thing coming and not the ten
units behind it. Passive: gastrolith ballast — the one plesiosaur that can hold still at depth
without drifting up (`buoyancy` neutral to slightly heavy). Weakness: nothing above rung II is
food, so its nutrition is schools and shells and it grows slowly; a pliosaur or a Tylosaurus can
take the neck in one grip and the body can do nothing about it — which is the pairing this
family was built on.

#### M05 · Leedsichthys problematicus — the sieve

*Callovian (~165 Ma), Oxford Clay, Peterborough.* 16.5 m (S; Liston 2013's revised figure — the
27 m of older books is superseded), the largest ray-finned fish that has ever lived; a pachycormid
with a toothless gape and gill rakers the size of a hand that strained plankton (S). Forty years to
full size (S/I). Bony fish: neutral buoyancy, a gill breather. *Bonnerichthys* (5 m, Niobrara) is
the same design in the Cretaceous and takes the rung III slot if one is wanted.

*Reconstruction.* A vast, slow, deep-bodied fish with a small head for its bulk, a mouth that
opens the whole front of it, and a tall forked tail. The Devonian's Titanichthys is its ancestor
in kit, not in blood.

*Kit.* Role: the giant that will not fight. `breathing: 'gill'`, `noBite`, `diet: 'filter'`,
`gape: 0`, `peaceful`, `ramFeed` (the pouch's gulp on schools and blooms), `thunniform`. No
`light`, no `heavy`. Ability ★ **Bow wave** (Y): a burst that shoves everything ahead of it clear
without touching it, mass-shared and uncapped as the grip's dash is. Passive: the biggest stamina
pool in the sea and a gill breather's recovery anywhere; anything rung II or under that clings to
it is carried across the map at cruise (`rideHost` is already built) and this is the one giant
that never shakes a rider. Weakness: it is rung IV food for every rung IV hunter, it cannot fight
back, and it can only outlast them — which, with a full bar and the deep, it can.

#### M06 · Ptychodus — the crusher (reserve)

*Cenomanian–Campanian (~95–80 Ma), Vallecillo, Mexico, and the chalk seas.* Known for a century
from pavements of flat crushing teeth alone; complete skeletons described in 2024 make it a
lamniform, shark-shaped and fast, up to about 10 m, and a pelagic durophage that took ammonites
and sea turtles (S/I; Vullo et al. 2024 — new enough that the size is the paper's own). The largest
hard-prey specialist there has ever been.

*Kit.* Role: the shell-cracker of the open sea. `breathing: 'gill'`, `buoyancy: 'heavy'`,
`thunniform`. `light` Bite; `heavy` **Mill** (`crushBite`, the Devonian's, at rung IV: full
damage against `shell` and armour, low against soft bodies). Ability ★ **Crack** (Y loop): feeds
from ammonite pavements and, alone on the roster, can crack Archelon's shell and a Baculites'
long cone in one mouthful. Weakness: soft prey is worth half to it; a shark sinks when it stops.

### Rung III · Hunters

#### M07 · Temnodontosaurus — the eye of the Lias

*Hettangian–Toarcian (~200–175 Ma), Lyme Regis and Holzmaden.* 9–10 m (S; a 12 m figure is C),
eyes 20 cm across (S), and a macropredator of other ichthyosaurs and large fish (S/I; gut
contents). Robust, deep-bodied, the biggest ichthyosaur of the Jurassic.

*Kit.* Role: the hunter of hunters. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`,
`thunniform`, `deepDiver`, `sense` high (the eye). `light` Snap; `heavy` **Long-jaw seize**
(`grab: true`, as Cymbospondylus). Ability ★ **Eye of the deep** (Y): night and depth do not
shorten its sense for eight seconds, and hidden bodies at the surface's edge are lit. Weakness: a
rung III body with rung IV appetite — it must eat other hunters, and the shallows starve it.

#### M08 · Cretoxyrhina mantelli — the Ginsu shark

*Cenomanian–Campanian (~100–80 Ma), the Western Interior Seaway.* 7–8 m (S), smooth cutting
teeth, bite marks on Tylosaurus, Xiphactinus and plesiosaurs (S), and a cruising speed and
regional endothermy inferred from body shape and analogy to lamnids (I; Ferrón 2017). The
Cretaceous's great white before there was one.

*Kit.* Role: the pursuit shark. `breathing: 'gill'`, `warmBlooded` (I, and the cold immunity is
the game reading), `buoyancy: 'heavy'`, `thunniform`. `light` Bite; `heavy` **Shear** (high
pierce, a bleed: damage over time for four seconds, the whorl saw's cost without its grip).
Ability ★ **Ram and release** (Y): the lamnid's hit-and-back-off — a dash-in strike that
disengages automatically to half a length, so a shark never has to stay in a fight it did not
choose. Passive: the scavenger's nose — a dead body within sixty units is on its radar. Weakness:
must swim to stay up; blocking costs it height.

#### M09 · Plesiosuchus manselii — the pelagic crocodile

*Kimmeridgian–Tithonian (~155–150 Ma), Kimmeridge Clay, Dorset.* About 6.9 m (S; Young et al.
2012), the largest metriorhynchid: a crocodile that lost its armour, turned its limbs to paddles,
grew a shark's downturned tail and salt glands, and never left the water (S; salt glands from
*Geosaurus*/*Dakosaurus* skulls; live birth I from the pelvis, Herrera et al. 2017). A
killer-whale-sized gape for other reptiles (I). *Dakosaurus maximus* (4.5 m, serrated
theropod-like teeth, S) and *Metriorhynchus* (3 m) are the same body at rungs III and II.

*Kit.* Role: the log. `breathing: 'air'`, `birth: 'live'`, `drift` at the surface (a body that
hangs still in the light window recovers *and* is hidden: it reads as one of the log rafts,
which is the one place an air-breather can be safe at the top). `light` Snap; `heavy` **Death
roll** (`grab: true`; a held victim is spun — poise damage each second, and its escape dash is
mis-aimed). Ability ★ **Float like a log** (Y): the surface hide, the crocodile's own camouflage
stamina-free while the stick is still. Weakness: cold water (an ectotherm that lives in the
deep's doorway), and no armour at all — the one crocodile with nothing on its back.

#### M10 · Globidens — the ball-toothed

*Campanian–Maastrichtian (~80–66 Ma), North America and Morocco.* Around 6 m (S), teeth like
hemispheres for crushing clams and ammonites (S), a robust short skull. *Prognathodon* (10 m,
Maastrichtian; the tail-fluke soft-tissue specimen, S) is the rung IV crusher if the roster wants
one.

*Kit.* Role: the mosasaur that eats the floor. `breathing: 'air'`, `warmBlooded`,
`birth: 'live'`, `buoyancy` slightly heavy. `light` Bite; `heavy` **Crush** (`crushBite`).
Ability ★ **Pry** (Y loop, Placodus') from inoceramid and ammonite pavements. Passive: sink to
the floor for free, walk it with `punt`. Weakness: slow, and soft-bodied prey is half value.

#### M11 · Xiphactinus audax — the bulldog fish

*Coniacian–Campanian (~90–80 Ma), Niobrara Chalk.* 5–6 m (S), a fanged, upturned jaw, a tall
forked tail, and the most famous fossil of the Western Interior: a 4 m specimen with a 1.8 m
*Gillicus* whole and undigested inside it, the swallowing having very likely killed it (S; FHSM
VP-333). A fast pursuit fish (I).

*Kit.* Role: the swallow. `breathing: 'gill'`, `thunniform`, **`gape: 4`**. `light` Snap; `heavy`
**Engulf** (`grab: true`; a victim up to a rung *above* the body is swallowed whole on release
inside `GRIP_MEAL`). Ability ★ **Bolt it** (Y, on a held meal): the swallow at once — full
nutrition, and for twenty seconds the body is slowed and its stamina recovery halted by the
weight in it: the fossil, as a rule. Weakness: exactly that. An Xiphactinus that bolts a rung IV
meal in front of a Tylosaurus has made a famous mistake.

#### M12 · Ophthalmosaurus icenicus — the eye

*Callovian–Kimmeridgian (~165–155 Ma), Oxford Clay.* 4–6 m (S), eyes up to 23 cm across, the
largest relative to body of any vertebrate (S), a nearly toothless jaw for squid (S), and avascular
necrosis in the bones that says it dived deep and sometimes came up too fast (S; Motani et al.
1999). Warm-blooded by isotope (S). Belemnite hooks in the gut of relatives (S).

*Kit.* Role: the night diver. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`, `thunniform`,
`deepDiver`, `sense` at the top of the roster and undimmed by night or depth (passive, always —
Temnodontosaurus has it on a timer, this animal has it for free). `light` Snap; `heavy` **Dart**
(a `shoalDart` burst that strikes through a belemnite school). Ability ★ **The long dive** (Y):
the deep-diver recovery doubled for ten seconds, at the cost of the bends on any fast rise after.
Weakness: the jaw — nothing rung III is food, so a hunter that lives on squid grows on squid.

#### M13 · Archelon ischyros — the turtle

*Campanian (~80–74 Ma), Pierre Shale, South Dakota.* 4.6 m long, 4 m across the flippers, around
2.2 t: the largest turtle known (S). The shell is not a dome but a frame of ribs under leathery
skin, as a leatherback's is (S); a hooked beak (S) for squid and ammonites (I); great front
flippers for underwater flight (S/I). Wieland, who described it, thought it overwintered in the mud
of the sea floor (I, and old), and the type specimen is missing a hind flipper that was bitten off
and healed. Nested on land (S by bracket); the codex says so.

*Reconstruction.* A leatherback with a hawk's beak, flippers longer than the shell is wide. Not
a Galápagos tortoise afloat.

*Kit.* Role: the armoured flyer. `breathing: 'air'`, `birth: 'egg'` (laid in the seagrass; the
codex notes the beach), `flight`, `armour: 0.6`, `armourFacing: 'dorsal'` (the leathery frame is
worth less than bone and the plastron is soft), `gape: 2`, `buoyancy: 'heavy'` when still.
`light` Beak; `heavy` **Bite off** (`crushBite` against `shell`, and against a *flipper* — a
directional hit on a `flight` animal's side slows its next power stroke). Ability ★ **Dig in**
(Y): settles into the floor and stops — stamina neither drains nor recovers, the body reads as
scenery to anything not on top of it, and a full winter's sleep costs nothing (the Triassic's
"lying still is free" made literal). Weakness: from below. A Tylosaurus that comes up under it
finds no armour at all, which is what the ventral facing is for; and it climbs like a turtle.

#### M14 · Dakosaurus maximus — the biter (reserve)

*Kimmeridgian–Tithonian, Germany and England.* 4.5 m, a short deep skull with serrated
theropod-like teeth (S), the metriorhynchid that went for large prey. The rung III body of M09's
family if Plesiosuchus is thought too big; otherwise the reserve.

### Rung II · Shelf

#### M15 · Cryptoclidus eurymerus — the trap

*Callovian (~165 Ma), Oxford Clay.* Up to 4 m (S), a small head with long fine interlocking
needle teeth (S), a moderate neck, big flippers. A trap for small fish and crustaceans that the
teeth strained out of a mouthful (I).

*Kit.* Role: the small-fish net. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`, `flight`,
`neckReach: 0.8`, `gape: 1`. `light` Snap; `heavy` **Sieve** (`filterGulp` against snack schools
rather than blooms). Ability ★ **Sweep** (Y): a slow neck arc that gathers a school into the
mouth's reach. Weakness: nothing but schools is food, and it is food to everything above it.

#### M16 · Stenopterygius quadriscissus — the dolphin

*Toarcian (~183 Ma), Posidonia Shale, Holzmaden.* 2–4 m (S), and the ichthyosaur every book's
picture is drawn from: mothers with embryos, a birth caught mid-way, tail first (S), a skin
outline with a dorsal fin and crescent fluke (S), blubber and countershading (S; Lindgren et al.
2018). Fish and belemnites (S).

*Kit.* Role: the shoaling starter, as Mixosaurus was: `breathing: 'air'`, `warmBlooded`,
`birth: 'live'`, `shoals: true`, `thunniform`, `deepDiver`. `light` Snap; `heavy` `shoalDart`.
Ability ★ **Countershade** (Y): the camouflage hide, cheaper at the surface where the light is
what it was built for. Weakness: rung II in a sea where everything at rung III eats
ichthyosaurs.

#### M17 · Dolichorhynchops osborni — the sprinter

*Campanian (~80 Ma), Niobrara.* About 3 m (S), a polycotylid: short neck, long narrow toothy
snout, big flippers, fast (I). *Polycotylus* is the pregnant one (S). Found in Tylosaurus' gut (S).

*Kit.* Role: the fast flyer. `breathing: 'air'`, `warmBlooded`, `birth: 'live'`, `flight` at the
fast end. `light` Snap; `heavy` **Power stroke** (the burst as a heavy rather than a Y).
Ability ★ **Breach** (Y): the Devonian's `airborne` driven from a flight stroke, landing with a
full bar and a blow the radar hears late. Weakness: the same as every flyer, the turn.

#### M18 · Metriorhynchus superciliosus — the small log (reserve)

*Callovian, Oxford Clay.* 3 m (S). M09 at rung II; kept for a roster that wants the log rafts
crowded.

#### M19 · Hesperornis regalis — the bird

*Campanian (~80 Ma), Niobrara and the Pierre Shale, and the Canadian Arctic.* 1.8 m (S), a
flightless diving bird with teeth (S), propelled by feet set so far back that on land it could
only shuffle on its belly (S/I), found in Tylosaurus' gut (S). Colonial, nesting ashore, probably
in the far north (I). The first bird ever put under a controller in these games.

*Reconstruction.* A toothed loon the size of a person: a long neck, tiny wings, huge lobed feet.

*Kit.* Role: the foot-paddler. `breathing: 'air'`, `birth: 'egg'` (laid in the seagrass; the
codex says the shore), `warmBlooded`, `paddleRow` (the nothosaur's two gears turned round: feet
for the burst, glide for the cruise), `gape: 1`. `light` Snap; `heavy` **Spear** (a neck strike
at a school). Ability ★ **Surface sprint** (Y): on the surface it is faster than anything rung II,
and the blow costs it nothing because it never left the air. Passive: the sky ignores it (a sky
animal will not stoop on a bird). Weakness: under water it is slow, and everything eats it.

#### M20 · Enchodus petrosus — the fanged herring

*Cenomanian–Maastrichtian, worldwide.* 1.5 m (S), two long fangs at the front of a small fish, the
commonest predator of the chalk seas and the commonest meal in every larger gut (S).

*Kit.* Role: the snack that bites back. `breathing: 'gill'`, `shoals: true`. `light` Snap;
`heavy` **Fang** (high pierce, low damage). Ability ★ **Scatter** (Y): the school bursts in all
directions and reforms behind the attacker. Weakness: it is what the sea eats.

#### M21 · Lepidotes — the scaled (reserve)

*Early Jurassic–Early Cretaceous.* Up to about a metre and a half (I), thick ganoid scales as
armour (S), pebble teeth for shells (S). The Jurassic's Bothriolepis in kit: `armour: 0.5`,
`armourFacing: 'all'`, `crushBite`, `sink`, `punt`. Reserve, because Gyrodus does the same at
rung I.

### Rung I · Floor and shallows

#### M22 · Aspidorhynchus acutirostris — the fish that caught a pterosaur

*Tithonian, Solnhofen.* About 60 cm (S), a long-snouted, ganoid-scaled fast fish. Several
specimens preserve one with its snout tangled in the wing of a *Rhamphorhynchus*, both dead of it
(S; Frey & Tischlinger 2012). The sky mechanic's founding fossil, at rung I.

*Kit.* `breathing: 'gill'`, `thunniform`, `armour: 0.3`, `armourFacing: 'all'`. `light` Snap;
`heavy` **Lunge** (`grab: true`). Ability ★ **Grab the sky** (Y): on a sky animal's stoop within
reach, a lunge that takes hold of it — the one rung I body that can, and what it holds is rung I
food. Weakness: a 60 cm fish.

#### M23 · Baculites — the straight shell

*Campanian–Maastrichtian, the Pierre Shale.* 0.5–1 m (S), an ammonite uncoiled into a straight
cone, thought to hang vertically in the column (S/I). The Cambrian's orthocone, again, and the
Ceratites kit with a direction: `shell`, `armour: 0.8`, `armourFacing: 'all'`, `grasp`,
`shellHover`/`shellJet`, `diet: 'scavenger'`. Ability ★ **Hang** (Y): vertical, still, unseen
against the pavement it stands on. *Nipponites* and *Didymoceras* (the heteromorphs) are the
`drift` variant.

#### M24 · Passaloteuthis — the belemnite

*Toarcian, Holzmaden.* About 40 cm (S), ten hooked arms (S), an internal bullet of a shell, the
food of every ichthyosaur on this roster (S). Schools. `breathing: 'gill'`, `grasp`,
`swimStyle: 'omnidirectional'`, `shoals: true`; the Phragmoteuthis kit with the ink, and the
hooks make its `takeHold` stick.

#### M25 · Gyrodus — the reef crusher

*Late Jurassic, Solnhofen and the sponge reefs.* 30–50 cm (S), a pycnodont: a disc of a fish with
pebble teeth for shells and corals (S). `armour: 0.4`, `crushBite`, a `sink` floor-walker for
the reef. The rung I durophage.

## New effects

| Effect | Kind | Who | What it does |
| --- | --- | --- | --- |
| Sky animals | actor class | Pteranodon, Rhamphorhynchus | Patrol the light window, stoop on a surfaced body, take a snack; can be grabbed back on the stoop. |
| Gape | field | Elasmosaurus, Leedsichthys, Archelon, Xiphactinus, Cryptoclidus, Hesperornis | The rung the jaws are worth, apart from the body. |
| Weight | field | sharks, Archelon, the early mosasaurs | Loses height below a fraction of cruise; holding station costs stamina. |
| The bends | field + Y | ichthyosaurs, mosasaurs, pliosaurs | Partial recovery at depth; a fast rise from below a depth costs poise on arrival. |
| Ratchet bite | heavy | Mosasaurus | A held meal is drawn in; the escape window shortens. |
| Ram | heavy | Tylosaurus | Rostrum-first stun and knockback, no grip. |
| From below | Y | Elasmosaurus | Only the head counts on the radar during the approach. |
| Bow wave | Y | Leedsichthys | Shoves everything ahead clear, mass-shared. |
| Engulf / Bolt it | heavy + Y | Xiphactinus | Swallows a rung up, whole; twenty seconds slowed and unrecovering after. |
| Float like a log | Y | Plesiosuchus, Metriorhynchus | A surface hide among the log rafts, stamina-free. |
| Death roll | heavy | the crocodiles | Poise damage per second held; the victim's dash is mis-aimed. |
| Dig in | Y | Archelon | Settles into the floor; stamina frozen; reads as scenery. |
| Bite off | heavy | Archelon | A side hit on a flyer slows its next stroke. |
| Eye of the deep | passive / Y | Ophthalmosaurus, Temnodontosaurus | Sense undimmed by night and depth. |
| Grab the sky | Y | Aspidorhynchus | Holds a stooping sky animal. |
| Surface sprint | Y | Hesperornis | Faster on the surface than below; the sky ignores it. |
| Hang | Y | Baculites | Vertical and still against the pavement. |
| Polar biome | modifier | one biome | Long night, hard cold. |

Reused as they are: everything the Triassic already added (`flight`, `thunniform`, `paddleRow`,
`neckReach`, `sink`, `pod`, `warmBlooded`, `armourFacing`, the held breath, the shore class), and
the older `crushBite`, `runThrough`, `snatch`, `shoalDart`, `filterGulp`, `shellHover`,
`shellJet`, `drift`, `grasp`, `shoals`, `shell`, `noBite`, `diet`, `airborne`, `rideHost`.
Still deliberately unused: `shoreReach`.

## The shore, and the sky

The Triassic's four shore animals are Triassic. This era's stand on the same class:

- **Deinosuchus** (Campanian, 10–12 m, an alligatoroid of the estuaries; bite marks on dinosaur
  bone and turtle shell, S): the surface lurker, in Mystriosuchus' post and bigger than anything
  rung III. It is the one shore animal that can take a rung III player.
- **Spinosaurus** (Cenomanian, 14 m, a tail fin and a wading-or-swimming life that is argued
  either way, C; Ibrahim et al. 2020, Sereno et al. 2022): stands in the estuary to the belly and
  strikes at what passes; the neck that reaches in, in a dinosaur. The game takes the wading
  reading, which is the one both sides allow.
- **Sarcosuchus** (Aptian, 9–9.5 m, river mouths, S) as the alternate lurker for a Jurassic-heavy
  biome set; **Baryonyx** at the Wealden estuary as the small spinosaur.
- **Pteranodon**, **Nyctosaurus** and **Rhamphorhynchus** above, and a **Hesperornis colony**
  as the snack that is not on the shore but at it.

## Snack schools and residents

Swarms: *Leptolepides* over the lagoon, belemnite schools in the column at night, *Enchodus*
everywhere, thylacocephalans still, *Ichthyornis* on the surface for the sky to share. Residents:
a Leedsichthys over the slope, a Pliosaurus in the channels, a Mosasaurus in the basin, a
Deinosuchus on every third estuary. The shadow predator is the Mosasaurus, and the sea it hunts
is the last one.

## Alternates and reserves

- **Kronosaurus**, **Liopleurodon**, **Rhomaleosaurus** (7 m, Toarcian): the pliosaurs at three
  sizes.
- **Prognathodon**, **Plotosaurus** (the most fish-shaped mosasaur, Maastrichtian California),
  **Platecarpus** (the fluke fossil), **Clidastes** (3–4 m, the coastal one), **Halisaurus** and
  **Dallasaurus** (1 m, the limbed, ballasted beginning of the family): six more mosasaurs, and
  the family alone could fill a roster's rungs II–IV.
- **Eurhinosaurus** (6 m, Toarcian, an upper jaw twice the lower, a swordfish's slash, S/I) and
  **Platypterygius** (7 m, the last ichthyosaur, a turtle hatchling and a bird in its gut, S).
- **Machimosaurus** (7–9 m, a teleosaurid turtle-crusher, the coastal crocodile, S) and the
  gharial-built **Steneosaurus** as the ambush crocodile.
- **Protostega** and **Desmatochelys** (the earliest sea turtle, Early Cretaceous): Archelon at
  rungs II and III.
- **Pachyrhachis** (1 m, a Cenomanian snake with hind limbs, S): rung II, anguilliform, `cling`.
- **Squalicorax** (3–5 m, the crow shark, scavenger of everything up to hadrosaurs, S) with
  `diet: 'scavenger'`; **Hybodus** carries over from the Triassic.
- **Mawsonia** (4 m coelacanth, Early Cretaceous), **Caturus**, **Pachycormus**, **Dapedium**.
- **Parapuzosia** (a 1.8 m ammonite shell, the largest, S), **Tusoteuthis** / *Enchoteuthis* (a
  giant squid-like vampyromorph of the chalk, size C: 6–11 m by arm, far less by mantle).
- **Uintacrinus** and **Seirocrinus**: crinoids as scenery, free-lying and hanging from logs.

## If the Triassic is widened instead

Carry twelve bodies and two mechanics. Bodies: Mosasaurus, Tylosaurus, Pliosaurus, Elasmosaurus,
Leedsichthys, Cretoxyrhina, Archelon, Ophthalmosaurus, Xiphactinus, Stenopterygius, Hesperornis,
Belemnite — one of each family, each with a kit no Triassic body has. Mechanics: **the gape**
(four of those twelve need it) and **the sky** (the surface's own danger, which the Triassic's
pillar "the surface is a place" was already asking for). Weight and the bends wait; both change
every existing Triassic fight. Drop from the Triassic's 21, if room must be made: Helicoprion
(the Permian relict is the honest cut), Aphaneramma, Askeptosaurus, Birgeria, Cartorhynchus and
Odontochelys — none of them carries a mechanic another body does not.

Biomes: keep the Triassic's inner five (flats, shore, lagoon, garden, reef) and recast the outer
four as Oxford Clay, Kimmeridge, Niobrara chalk and the Posidonia basin, so the further out a
player goes the later the sea gets — which is, in a way, the Mesozoic.

## What the engine needs

In order of size, none touching the shared paths:

1. **Sky animals** — the shore stepper with a patrol, the stoop, the shadow telegraph, the
   grab-back on the stoop. `sky: true`; `src/sim/<era>/sky.ts`.
2. **Gape** — `gape?: number` on `CreatureDef`, read by the eat, swallow and hold band tests in
   place of the length rung when present; a second HUD mark where it differs.
3. **Weight** — `buoyancy: 'heavy'` in `src/sim/locomotion.ts`, the idea already written up.
4. **The bends** — `deepDiver`, one `staminaRegen` case and one check in the `rise` hook.
5. **The polar modifier** and the rudist, inoceramid and seagrass prop families
   (`npm run shapes`, `npm run props`).
6. **Sizes and stats** generated as the Triassic's are: `docs/research/<era>-swimming.json` →
   a stats tool → the six movement fields, never by hand.
7. **Art**: canonical poses first, greenlit, then the Tripo pipeline
   ([04](04-tripo-pipeline.md)), and every animal borrows a Triassic body until its own lands,
   as the Triassic borrows the Devonian's.

## What has been built, and how it avoids answering the question

**Archelon and Mosasaurus now exist as finished bodies** — rigged, twinned, clipped, anchored,
gape-proofed and shipped into `public/assets/triassic/creatures/`. Neither is on any roster. The
decision below is still open, and building them did not touch it, because of the shape the
*standing visitor* takes:

- They are registered in [`src/content/triassic/expansion.json`](../../src/content/triassic/expansion.json),
  which is the file for a subject whose era is undecided, and their gameplay definitions are in
  `src/content/triassic/guests.ts`. Neither is in `TRIASSIC_CREATURES`, so neither is in the sea,
  in `population.ts`'s tables, on any pick grid, or in any bot's draw.
- They reach a match through the visitor mechanism (`standingVisitors` in
  `src/content/visitors.ts`): admitted to `creature()` by `admitVisitors`, never joining `CREATURES`
  or `PLAYABLE`, arriving full grown at the ladder's top scale. The difference from an earned
  visitor is that there is nothing to earn — there is no Cretaceous game to take them to the top of
  — so they are admitted unconditionally and gated only on their body having shipped.
- Their `Visitor.era` is `'triassic'` because that is where their files live and how `'<era>/<id>'`
  resolves. What they are actually *from* is a separate field, `origin`, which reads **Late
  Cretaceous** and is what the crew card shows. Nothing was rippled through `ERA_IDS`, `ROSTERS`,
  `SETTINGS_KEY` or `APEX_SCALE`; there is no fourth era id anywhere in the build.

So the two obvious first asks are answered as *guests* rather than as residents. Whichever way A or
B goes, they move: option A puts them on a widened Triassic roster and deletes the guest path;
option B moves their files into the fourth game's folder and they become that game's natives, and
visitors here by the ordinary earned route.

## Open decisions

1. **A or B** — widen or fourth game. This document argues B and is written to serve either. The
   two bodies above are built in a way that does not lean either way.
2. **The Mosasaurus generation gapes**, and the body ships with its jaw closed by a measured 32.55°
   rotation for every clip that is not a strike. That costs 0.72 % of a body length of mandible
   pushed out through the head's own section; a mouth-closed regeneration would remove it entirely.
   See `tools/triassic/creatures/mosasaurus/README.md`.
3. **Spinosaurus** — in the water or on the bank. The wading reading is proposed; a swimming
   Spinosaurus would be the first playable animal to leave the water, which the series does not
   do.
4. **Weight and the bends** — both are held back deliberately in the Triassic. This roster is
   where they earn their keep, but each changes every fight, and they should ship behind a
   setting the way *Equivalent sizing* did until they are tuned.
