# 01 · Triassic Tide: era design and the roster

**Status:** design proposal, 12 September 2026. Nothing here is built. This is the third era's
equivalent of [07](../redesign/07-devonian-design.md) and [08](../redesign/08-devonian-domination.md)
in one document: the natural history of 21 playable animals and the non-playable shore animals,
each with the in-game effects it is matched to or given, and the era mechanics those effects hang
on. Every mechanic is a game reading of anatomy, labelled as invention; every natural-history claim
carries its confidence from [research.md](research.md), where the sources are. Numbers are balance
parameters, not fossil measurements. Biomes, depth and props are in
[02](02-biomes-and-depth.md); the art and model requests in [03](03-image-and-model-requests.md).

## The pitch

The Cambrian was a growth story and the Devonian a food chain. The Triassic is **the return to the
sea**: after the worst extinction there has ever been, reptiles walked back into the water and
within twenty million years were the biggest animals alive, and every one of them had to come up
for air. That is the era's whole game. Fish had the water; the reptiles took it from them with a
lungful at a time, and the surface, which in the earlier eras was a ceiling, is now the one place
every player has to go and the one place everything can see them.

So *Triassic Tide* is played between two edges, the surface and the floor, in a sea that gets
deeper the further out you go. Feeding is on the bottom or in the column; breathing is at the top;
the deep is where the giants are and where a breath does not stretch. Live-bearers are born at the
surface beside their mother. Egg-layers hatch on a red beach and run for the water past the things
that stand on it. And the shore is not safe ground: something with a three-metre neck is standing
at the waterline, and it fishes.

The verbs are the same as ever: camera-relative swimming, dash and sprint, bite and heavy, block
and parry, grip, hide, the endless streamed sea, the radar, split-screen. The three shared modes
(Rise, Hunter & Hunted, Reef) carry over as they did to the Devonian, and growth is the Devonian's
five geometric stages. What the era adds is *breath*, *birth*, *the shore*, *depth*, and a roster
of bodies the sea had never seen before and, in half the cases, never saw again.

## Design pillars

1. **Air is the clock.** Everything that matters breathes. A breath is a budget, the surface is
   where you spend it, and the depth of the water under you is the price of what you are doing.
2. **The surface is a place.** Bright, exposed, alive with logs, spray and the shadows of pods. It
   has its own presentation, its own sounds and its own dangers, and the camera reads *out* there.
3. **The shore bites back.** Land is not a sanctuary. It is where the necks are.
4. **Bodies that are trying things.** Hammerheads, buzzsaws, half-shells, four-flipper flight,
   necks of thirteen and thirty-two joints. Every animal on the roster plays like nothing else on
   it, and the kits are built from the fossils' oddities rather than a shared template.
5. **Keep the hands.** The controller does what it does in the other two eras.

## Era mechanics

### Breath

A new `breathing: 'air'` value beside `'gill'` and `'bimodal'`. Air-breathers carry a **breath
meter**, in seconds of dive at rest, that drains under water and refills in a few seconds at the
surface with a visible **blow** (spray, the era's signature sound, and a radar ping to anything
hunting). Sprinting, fighting and being held drain it faster; gliding and hanging still drain it
slowest. At empty, stamina drains, then health: an air-breather can **drown**, which the Devonian
deliberately had no mechanic for and this era needs one for, because the animals are obligate.
The HUD draws breath as the inner ring of the growth ring (where the Devonian drew standing), with
the last quarter red and a low pulse the player hears before they see it.

Dive time scales with body size, so a giant holds its breath for minutes and a pachypleurosaur
for forty seconds; the numbers are per creature (`breath`, seconds at adult scale) and grow with
the stage. Gill-breathers have no meter and that is their whole advantage: a Saurichthys never
comes up, and a Helicoprion never has to.

Depth prices the meter: with the sea floor sinking by biome ([02](02-biomes-and-depth.md#the-nine-slots)),
a floor feeder works the platform freely and cannot work the basin at all, and a hunt that ends
sixty units down is a hunt the hunter had better win quickly. The rise button is free (no stamina),
climbs at a per-creature rate (`riseRate`, replacing the shared `RISE_RATE`), and is faster for
anything with flippers than anything with paddles. Air-breathers that dash upward from just below
the surface **breach**, using the Devonian's `airborne`.

### Live birth and the beach

Viviparous species (`birth: 'live'`) are not laid as an egg on the sand. A new player is **born at
the surface**, head-first for the basal ichthyosaurs and tail-first for the rest, beside an AI
adult of their own species — the mother — who holds station for the first minute, answers anything
that comes for the calf, and then goes. That is the nursery sanctuary of the Devonian made into an
animal. The birth is the hatch performance: the calf's first act is its first breath, and the
tutorial hint is the blow.

Egg-layers whose eggs are on land (`birth: 'shore'`: the turtle, the placodonts, and the fishes'
egg-cases in the weed) hatch on the red beach strip above the waterline and **run for the water**.
The run is the hatch: thirty units of sand under the eye of whatever stands on the shore. The
Cambrian egg on the sand (`layEgg`) stays for the ammonoid and the coleoid, laid in the dasyclad
meadow.

### Haul-out

Amphibious animals (`shoreReach`, the Devonian's field, with a per-creature distance) can climb the
last of the shore slope onto the beach strip, where breath and stamina refill fully and nothing in
the water can reach them — and where the shore animals can. It is the trade every seal makes.
Hauled out, a body moves with the row/walk gait and cannot dash.

### The shore that reaches in

A new actor class, **shore animals**, stands on the beach strip and the estuary banks: placed by
the world like landmarks (pure in the seed and the place, so they are where they were when you
come back), non-playable, and with one job, which is to make the last twenty units of water and
the beach itself a place a small animal enters at a cost. They are described in
[The shore animals](#the-shore-animals) below. Their reach is drawn on the radar as a hatched arc
when a player is within it.

### Armour with a facing

The Devonian's armour fraction gains a facing: `armourFacing: 'dorsal' | 'ventral' | 'all'`.
Odontochelys has a plastron and no carapace, so it is armoured *from below* only; Hupehsuchus and
Placodus carry their plating on the back; Henodus and the cyamodontoids are armoured all round. A
hit tests the attacker's position against the facing, which the direction bonus already computes.

### The grip, and the breath it costs

The grip mechanics carry over whole (`GRIP_STRIKE`, `GRIP_MEAL`, `GRIP_BREAK`, the tug of war). The
era adds one thing: **a held air-breather's breath keeps running**, and its holder can take it
down. A giant that seizes a nothosaur and dives does not need to bite it; it needs to hold on for
longer than the nothosaur can hold its breath. The fossil for this is the thalattosaur inside a
Guizhouichthyosaurus. In play it is the giants' signature and the reason a big animal's grab is
frightening even though holding still costs it nothing: the held animal's dash-out is now a race
against its own meter, and the HUD's grip panel shows both.

### Feeding stations on the floor

The Devonian's plankton bloom is a station in the water; the Triassic adds three on the floor,
because half its roster eats what does not move: **shell beds** (the Daonella pavement and the
Placunopsis mounds, crushed by the durophages and slowly regrowing), **algal meadows** (the
Diplopora lagoon and the biofilm on reef rock, scraped by Atopodentatus) and **microbial mats** (the
gypsum flats, strained by Henodus alone). Each is a prop kind with a nutrition budget, and each
biome's danger is balanced against what it feeds.

### Heat, salt and cold

Two biome modifiers, blended like danger. The gypsum flats are **hot and salt**: a slow stamina
drain for everything but Henodus and the shells. The basin and the reef front are **cold**: a
slower stamina regeneration for ectotherms. Ichthyosaurs and the plesiosaur are treated as
endotherms (`warmBlooded: true`; fast-growth histology and isotope work, inferred) and are immune,
which is one reason they own the deep.

### What the engine needs

In order of size. Nothing here touches `game.ts` or `combat.ts` directly; each is a `RULES?.` hook
in `src/sim/era-rules.ts` or an era field read through `creature()`.

1. **Breath**: `breathing: 'air'`, `breath`, the meter, the blow, drowning, the HUD ring, the
   surface state and its sounds. Hooks: `stepBreath`, `atSurface`, `drownDamage`.
2. **Per-biome floor depth**: `environment.floorDepth`, the `sampleHeight` change and the
   `tools/world-test.ts` assertions in [02](02-biomes-and-depth.md#depth-the-engine-change).
3. **Shore animals**: a placed actor class with a reach test against the surface gap (the grip's
   own measure), a telegraph, a strike, and the `takeHold` outcome for snack-sized victims.
4. **Birth**: `birth: 'live' | 'shore' | 'egg'`, the surface birth with a mother, the beach run.
5. **Haul-out** as a `shoreReach` refinement: the beach strip as a walkable surface with refill.
6. **Armour facing**, **feeding stations**, **heat/salt/cold**, **the held breath**, and the new
   locomotion traits below — each a small hook.
7. **Locomotion traits** on `CreatureDef`, in `src/sim/locomotion.ts` because they are keyed off
   the creature: `swimStyle: 'flight'` (four-flipper underwater flight: high cruise and
   acceleration, wide turns, no reverse), `thunniform` (a stiff-bodied tail beat with a long
   glide), `paddleRow` (the nothosaur's two gears: rowing along the bottom, tail burst in the
   column), `neckReach` (a head that strikes at a distance from a body that stays put), `sink`
   (negative buoyancy: settles when idle, walks on the floor with the existing `punt`).

## Sizes and rungs

Sizes follow the animals as the Devonian's do: representative lengths with sources go in
`docs/research/triassic-swimming.json`, a `tools/triassic/stats.mjs` turns them into the six
movement fields, and `npm run triassic` checks they match. The Devonian's rule (4.6·m^0.6) puts a
17 m Cymbospondylus at 25 units in a 96-unit column and a 30 cm Keichousaurus at 2.2, a ratio of
eleven; the Triassic proposes **4.0·m^0.55**, which keeps the order, spreads 0.15 m to 17 m over
1.4 to 19 units, and leaves five giant lengths of water in the basin. Rungs are by adult game
length as in the Devonian, because the size-band rule is what decides who can eat whom, whether or
not standing is live in a given mode.

| Rung | Game length | Who |
| --- | --- | --- |
| **IV · Giants** | 14–19 | Cymbospondylus, Shonisaurus |
| **III · Hunters** | 7–12 | Nothosaurus, Dinocephalosaurus, Helicoprion, Rhaeticosaurus, Atopodentatus |
| **II · Shelf** | 4–7 | Askeptosaurus, Placodus, Hybodus, Birgeria, Aphaneramma, Mixosaurus, Henodus, Saurichthys, Hupehsuchus |
| **I · Floor and shallows** | 1.4–3 | Keichousaurus, Cartorhynchus, Odontochelys, Phragmoteuthis, Ceratites |

Growth is the Devonian's five stages from a hatchling of at least 0.6 units; a calf Shonisaurus
is a rung II animal for its first minutes and is born into a pod because of it.

## The roster

Twenty-one playable animals. For each: what is known and how well, the reconstruction it should
get, and the kit. Kit fields are the `CreatureDef` vocabulary of `src/content/creature-types.ts`
where an existing effect fits and a named new one where it does not; new ones are marked ★ and
collected in [New effects](#new-effects). Localities are labelled because the roster mixes
places and times as the other eras' do. Confidence: **S** supported, **I** inferred, **A**
artistic.

### Rung IV · Giants

#### T01 · Cymbospondylus youngorum — the first giant

*Anisian (~246 Ma), Fossil Hill Member, Augusta Mountains, Nevada.* About 17.6 m and up to 45 t,
the largest animal of its time on land or in the sea, and only eight million years after the first
ichthyosaurs (S). A very long narrow snout with small eyes, a full row of conical ridged teeth
along the jaw, an elongate eel-proportioned trunk with a long weakly differentiated tail and no
dorsal fin (S). Macropredator on squid, fish and probably other marine reptiles (I); anguilliform
undulation rather than a tuna's beat (I); viviparous by bracket (I).

*Reconstruction.* Long and low, not a Jurassic ichthyosaur scaled up: the fluke is a low fin on a
long tail, the flippers small for the body, and the head is a third of the animal's menace. Sander
et al. 2021 for the skull; keep a size plate separate from the portrait.

*Kit.* Role: apex hunter of the deep. `breathing: 'air'`, `breath` the longest in the sea, `warmBlooded`.
Locomotion: anguilliform — the slowest turn on the roster, a long glide, `pitchRate` limited.
`light` Snap; `heavy` **Long-jaw seize** (`grab: true`, lunge 1.4). Ability ★ **Drown-hold**: a held
air-breather's breath runs at double rate while this animal dives with it; the hold ends the meal
when the meter empties. Passive: nothing but Shonisaurus is `rival` to it; deep water is home
(cold-immune). Weakness: small eyes (`sense` low for its size), the turn, and a hunger clock —
it must eat big things, and a sea that hides in the shallows starves it because it cannot
enter water under 20 deep.

#### T02 · Shonisaurus popularis — the pod

*Latest Carnian (~230 Ma), Luning Formation, Berlin-Ichthyosaur State Park, Nevada.* 13.5–15 m,
the slimmer post-1990 body rather than the old whale-blimp, still deeper-chested than other
shastasaurids (S). Adults have robust cutting teeth and gut contents with vertebrate bone and
cephalopods, so the toothless squid-slurper of older books is superseded (S, Kelley et al. 2022).
Dozens of adults with embryos and neonates and no juveniles in one deep basin: a birthing ground
used across hundreds of thousands of years (I). Long narrow flippers, a long tail without a
crescent fluke, no dorsal fin.

*Reconstruction.* The slim Kosch body with a deep chest, a toothed jaw that reads as toothed, and
a calf beside it. Its identity in the game is the pod.

*Kit.* Role: pod giant. `breathing: 'air'`, long `breath`, `warmBlooded`, `shoals: true` at rung IV ★
(**pod**: two or three AI Shonisaurus that swim with a player and answer what attacks it). `light`
Bite; `heavy` **Sectorial bite** (high damage, low pierce). Ability ★ **Pod call** (Y): the pod
converges on the caller, and any calf within it is shielded (hits on the calf land on the nearest
pod-mate instead) for eight seconds. Passive: the birthing ground — a Shonisaurus player is always
born into a pod, and the basin's `PASSER_BY` traffic is its own kind. Weakness: the slowest
sprint at rung IV, and the pod is visible on every radar within sixty units: a Shonisaurus cannot
sneak.

### Rung III · Hunters

#### T03 · Nothosaurus giganteus — the amphibious ambusher

*Late Anisian, Upper Muschelkalk and the Besano Formation (Monte San Giorgio).* The largest
nothosaur, 5–7 m (S). A long flat low skull with elongate temporal fenestrae and five interlocking
fangs per side at the front, a fish-trap (S); nineteen cervicals; a stiffened undulating trunk;
humeri flat and wing-shaped with a thin cortex "comparable to aerial birds" (S); webbed feet with
digits, a long probably finned tail (I). Trunk-and-tail undulation for speed, forelimb rowing for
cruising and acceleration; Yunnan trackways read as paired paddle scrapes rowing along the sea
floor to flush prey (I). Seal-like haul-out: traditional and untested (A). Viviparous (I, embryos
in nothosaurids at Monte San Giorgio).

*Reconstruction.* A crocodile's head on a seal's front and an eel's back. The fangs interlock
visibly when the mouth is shut.

*Kit.* Role: two-gear ambusher. `breathing: 'air'`, `breath` long, `shoreReach` 14 (haul-out).
Locomotion ★ `paddleRow`: rows along the bottom at a walk, and a tail burst in the column that is
the best acceleration at rung III. `light` Snap; `heavy` **Fang trap** (`grab: true`: a held
animal smaller than the holder cannot dash free for the first two seconds, and the hold costs it
breath). Ability ★ **Bottom row** (Y, mobile): rowing the sand flushes anything burrowed or hidden
within a body length into the open. Passive: hauls out to breathe and rest where nothing in the
water can follow. Weakness: a cruise slower than the fishes it eats; its game is the wait.

#### T04 · Dinocephalosaurus orientalis — the neck in the water

*Late Anisian (~244 Ma), Guanling Formation, Guizhou and Yunnan.* Up to about 6 m with a neck of
2.3 m on **32** cervicals (S), paddle-shaped hands and feet with most wrist and ankle bones
unossified, useless on land (S); a low narrow skull with a cage of fangs at the front and folded
dentine in the teeth (S); an embryo inside the ribcage facing forward — the first archosauromorph
known to give live birth (S). Fully marine (S). Fed on small fish swallowed head-first, the fang
cage for gripping (I); the neck kept the body out of the prey's view (I); the old suction-feeding
idea is doubted (A).

*Reconstruction.* The neck must read as thirty-two joints, snaky and able to curl, which is the
whole contrast with Tanystropheus' rigid boom. Build the neck procedurally on the skeleton
([04](04-tripo-pipeline.md)); Tripo will not give a neck with rhythm.

*Kit.* Role: the reach. `breathing: 'air'`, medium `breath`. Locomotion: slow, body undulation with
paddles, ★ `neckReach` 2 body lengths. `light` Snap; `heavy` **Neck strike** (`neckSnap` reused
with the longer reach: snaps the head to the locked target while the body stays put behind cover).
Ability ★ **Periscope** (Y): raises the head to the surface to breathe while the body stays two
units down — a refill without surfacing, and without the blow's ping. Passive: strikes from behind
scenery a pursuer cannot see round. Weakness: the neck is the target — hits on the neck count as
from behind, and a rung IV grip on it is a drown-hold on a short meter.

#### T05 · Helicoprion — the whorl (a relict, by choice)

*Early–Middle Permian (Artinskian–Roadian, ~290–268 Ma), Phosphoria Formation, Idaho, and the
Urals.* **Helicoprion is not a Triassic animal.** Its peer-reviewed range ends about twenty million
years before the period begins, and claims of Early Triassic occurrences on some reference pages
are not supported (S, Tapanila & Pruitt 2013). It is on this roster because it was asked for and
because the game already mixes localities tens of millions of years apart; the honest way to ship
it is **as a labelled relict** — the codex entry and the card say Permian, and the tagline is that
it is the last of something — and the honest alternative, if that label is not wanted, is the real
Triassic eugeneodont *Fadenia uroclasmato* (Olenekian, British Columbia): a caseodontid with a low
symphyseal tooth arch rather than a spiral, fusiform, lunate-tailed, no pelvic fins, 1–2 m (I). The
decision is the user's; the kit below fits either body, and the whorl is what makes it worth the
licence.

What is known: a spiral tooth whorl of up to 130 teeth in the lower jaw's symphysis, housed in the
Meckel's cartilage, with the upper jaw toothless; the whorl's youngest teeth at the outside, the
oldest coiled in the centre, never shed (S, Tapanila et al. 2013 CT). The jaw closing rotated the
whorl backward, so the teeth raked in and down — a saw that drags prey inward, suited to soft
cephalopods rather than shells (I). Whorls to 40 cm across give 3–4 m bodies; the largest about
7.5 m (I). Body shape after *Fadenia*: fusiform, a lunate tail, no pelvic fins (I).

*Reconstruction.* The whorl sits inside the lower jaw with only its front arc exposed; the classic
"pizza cutter on the chin" is wrong. Tapanila's reconstruction is the reference.

*Kit.* Role: the saw. `breathing: 'gill'` — no meter; that is its edge in a sea of divers.
Locomotion: fast straight cruise, thunniform, poor turn. `light` Rake; `heavy` ★ **Whorl saw**
(`grab: true`; while held, the whorl's rotation deals damage over time that ignores half of armour
and *shortens* the victim's escape window — every second held is a second off its dash-out).
Ability: the same, on the heavy, as the Devonian's specials are. Passive: never surfaces; the
surface is where it waits for those that must. Weakness: **shells are immune to it** — the whorl
cannot bite a Ceratites, a Henodus or a Placodus at all — and its turn is the worst at rung III.

#### T06 · Rhaeticosaurus mertensi — the first plesiosaur

*Rhaetian (~205 Ma), Exter Formation, Bonenburg, Westphalia.* The only Triassic plesiosaur
skeleton, 2.4 m as a subadult, adults somewhat larger; recovered as a basal pliosaurid, so
short-necked and large-headed (S). The whole plesiosaur plan already in place: barrel trunk, four
hydrofoil flippers with extra finger joints, plate girdles, a short tail (S). Fibrolamellar bone
with few growth marks — fast continuous growth, read as an elevated metabolism (I). Four-flipper
underwater flight, tail for steering (I); open-water fish and cephalopods (I); live birth by
analogy with the Cretaceous *Polycotylus* (I). A 3 m Middle Triassic *Pistosaurus* is the
alternate if a longer neck is wanted.

*Reconstruction.* Penguin-and-turtle flight in one body: the flippers are wings, the stroke is
simultaneous, the trunk does not bend.

*Kit.* Role: the flyer. `breathing: 'air'`, medium-long `breath`, `warmBlooded`. Locomotion ★
`swimStyle: 'flight'`: the best acceleration and cruise at rung III, wide turns, no reverse, and a
rise rate that beats every paddler's. `light` Bite; `heavy` **Snatch** (the Cambrian `snatch`: a
fast reaching bite with a lunge). Ability ★ **Power stroke** (Y): four flippers together — a dash
carried three body lengths with a hit box on the shoulders, which knocks rung II aside. Passive:
cold-immune; the basin is its hunting ground and a breach is free. Weakness: no armour, and the
turn — a nothosaur inside its circle is safe.

#### T07 · Atopodentatus unicus — the grazer

*Anisian (~244 Ma), Guanling Formation, Luoping, Yunnan.* About 2.75–3 m (S). A hammerhead: the
premaxillae and dentaries expanded sideways into a T-shaped bar, chisel teeth along its front edge
and a mesh of needle teeth behind (S); the 2014 "zipper" split snout was a crushing artefact (S).
The earliest herbivorous marine reptile: it scraped algae off the floor with the chisels and
expelled the water through the needle sieve (I, Chun et al. 2016). Robust limbs with claws, a
slow bottom-grazing paddler, possibly able to haul onto flats (A).

*Reconstruction.* The bar is the animal. Front view first, and the sieve visible when the mouth
opens: water out of the sides is the feeding set-piece.

*Kit.* Role: the peaceful cow. `breathing: 'air'`, medium `breath`, `diet: 'grazer'`, `shoreReach`
6. Locomotion: slow, `sink` (settles to graze), bottom-walking with `punt`. `light` Nudge
(`nibble`); `heavy` **Hammer sweep** (`sweep: true`, high knockback, low damage: the bar as a
broad blunt shove). Ability ★ **Scrape and sieve** (Y, loop): feeds from algal meadows and reef
biofilm — the one animal for whom the Diplopora lagoon is a larder — and the feeding animation is
the sieve. Passive: peaceful — AI ignore it until it bites (the Cambrian's `peaceful()` reckoning
extended to a creature flag). Weakness: no bite to speak of, and rung III size with rung II teeth.

### Rung II · Shelf

#### T08 · Askeptosaurus italicus — the eel

*Late Anisian, Besano Formation, Monte San Giorgio.* A thalattosaur, 2–3 m; a long slender straight
snout, small sharp recurved teeth, thirteen cervicals, twenty-five dorsals and **sixty-plus
caudals** — a very long laterally compressed tail (S); small complete limbs with five clawed
digits. Tail-driven anguilliform swimmer, limbs for steering, possibly able to haul out (I);
fish and cephalopods (I).

*Reconstruction.* Two-thirds tail. The head is small and the body is a ribbon.

*Kit.* Role: the turner. `breathing: 'air'`, medium `breath`. Locomotion: the best `turnRate` on the
roster — turns in its own length — at a middling cruise. `light` Bite; `heavy` **Tail whip** (the
Cambrian `tailFlick`, 360°, knockback). Ability ★ **Coil** (Y): a full-body turn on the spot that
puts the head where the tail was — the counter to anything circling for the flank. Passive: a
hunter that gets behind it is in front of it a moment later. Weakness: fragile, no armour, shallow
breath.

#### T09 · Placodus gigas — the tank

*Anisian–Ladinian, Lower and Upper Muschelkalk (Winterswijk, Bayreuth, Steinsfurt).* 2–3 m (S, with
a 1–2 m reading in some reviews). Procumbent chisel incisors jutting from the snout, bean-shaped
crushing teeth on the maxillae and huge plates on the palate, a heavy akinetic skull (S); dense
pachyostotic bones and a tight basket of gastralia armouring the belly and acting as ballast (S); a
single row of osteoderm knobs along the spine; short limbs, a flattened tail (S). Durophagy on
bivalves and brachiopods prised loose with the incisors (S); negatively buoyant bottom-walker and
slow tail-sculler (I); haul-out speculative (A).

*Reconstruction.* Barrel body, the ventral basket visible as a texture, the front teeth sticking
out under a closed mouth. Not a turtle.

*Kit.* Role: the shell-cruncher. `breathing: 'air'`, short `breath` (it must surface often and
does it slowly), `armour` 0.45 `armourFacing: 'ventral'` plus the dorsal knob row, `defense` high,
`shoreReach` 6. Locomotion ★ `sink`: settles when idle, walks the floor with `punt`, sculls in the
column at the slowest cruise at rung II. `light` Bite; `heavy` **Crush bite** (`crushBite`
reused: double against shells and shell-armoured animals). Ability ★ **Pry** (Y, loop): prises
food off shell beds and mounds — the floor feeding stations — and feeds standing on them. Passive:
the only animal whose bite goes through Henodus and the cyamodontoids. Weakness: slow everywhere,
and helpless in water over 40 deep, where it cannot reach the floor and come back.

#### T10 · Hybodus — the spined shark

*Anisian–Ladinian, Muschelkalk; hybodonts span the Triassic.* Up to about 2 m (S). Two dorsal fins
each fronted by a stout ridged spine with a double row of denticles behind (S); males with one or
two pairs of hooked cephalic spines behind the eye (S); multicusped teeth (a generalist) where its
relative *Acrodus* has a crushing pavement (S); amphistylic jaws, a heterocercal tail, a notochord
(S). Generalist fish and cephalopod predator (I); the spines anti-predator (I); the hooks for
gripping females (I).

*Reconstruction.* A stocky shark with the two spines as its silhouette; the male's head hooks as a
cosmetic variant.

*Kit.* Role: the generalist with a price. `breathing: 'gill'`. Locomotion: a good cruise, a fair
turn. `light` Bite; `heavy` **Bite** (heavy). Ability **Spine brace** (`bristleFlare` reused as a
guard: while blocking, an attacker's bite costs the attacker damage from the spines). Passive: never
surfaces. Weakness: middling everything; its edge is time.

#### T11 · Birgeria stensioei — the tuna

*Anisian–Ladinian, Besano Formation; the genus is cosmopolitan across the period.* Typically over
1 m, 1.7–1.85 m in *B. americana*, a Spitsbergen fish over 2 m (S). Long jaws and a very wide gape
with three size-classes of conical teeth (S); scales almost entirely lost — a naked tuna-shaped
body with a deeply forked tail and a single dorsal set far back (S). Open-water pursuit predator
on fish including Saurichthys (I).

*Reconstruction.* A naked, fast body; the big head and the gape are the surprise.

*Kit.* Role: the pursuit fish. `breathing: 'gill'`. Locomotion ★ `thunniform`: the best sustained
cruise at rung II, a long glide, a wide turn. `light` Bite; `heavy` **Run-through** (`runThrough`
reused). Ability **Gulp** (`snatch`: swallows anything two bands down whole). Passive: outswims
every air-breather of its size on the flat. Weakness: no armour; a nothosaur's fang trap is a
Birgeria's end.

#### T12 · Aphaneramma rostratum — the marine amphibian

*Early Triassic (Smithian), Vikinghøgda Formation, Spitsbergen.* A trematosaur temnospondyl with
a gharial's snout, among the longest-snouted tetrapods ever; skull 40 cm and larger, total length
unpublished, about 1.5–2 m at trematosaur proportions (I, flagged). Numerous small marginal teeth
and palatal tusks; lateral-line grooves on the skull; eyes set far back; a laterally compressed
swimming tail, small limbs (S). Marine: the commonest of eight temnospondyls in a nearshore shelf
deposit, with coprolites of fish scale (S). Sideways jaw swipes at fish (I); lateral-line ambush
in murky water (I); how it bred is open (A).

*Reconstruction.* A crocodile that is not one: the flat skull, the far-back eyes, no armour, a
newt's limbs.

*Kit.* Role: the sensor. `breathing: 'air'` with a slow drain (a cold-blooded amphibian's
metabolism; the longest breath at rung II), `shoreReach` 10. Locomotion: an eel's tail, a fair
turn, slow. `light` Snap; `heavy` **Side swipe** (a half-arc `sweep` to one side, fast wind-up).
Ability ★ **Lateral line** (passive, and Y to pulse it): senses anything burrowed, camouflaged or
inked within `sense` range, and the silt of the Conifer Shore does not shorten its sense as it
does everyone else's. Passive: hauls out; at home in the murk. Weakness: no armour, slow, and the
first thing a phytosaur at the bank looks for.

#### T13 · Mixosaurus cornalianus — the small fin

*Anisian–Ladinian boundary (~242 Ma), Besano Formation, Monte San Giorgio and Besano.* 0.7–1 m
typical, the largest over 2 m; over 300 specimens in Zurich alone, the only Triassic ichthyosaur
known from fully articulated skeletons (S). A **dorsal fin**, the oldest known in any amniote,
preserved as soft tissue stiffened by fibre bundles (S, Renesto et al. 2020); a triangular dorsal
lobe on a long low tail; heterodont teeth, pointed in front, blunter crushers behind (S).
Cephalopod hooklets in most guts, small fish in some (S); stable sustained undulation (I); live
birth with in-situ embryos (S).

*Reconstruction.* The fin is the point — a 1 m body with a shark's silhouette, dolphin-smooth.

*Kit.* Role: the shoaling starter. `breathing: 'air'`, medium `breath`, `warmBlooded`, `shoals: true`,
`birth: 'live'`. Locomotion: quick, stable at speed, the best turn-at-speed at rung II. `light` Bite;
`heavy` **Crush** (the rear teeth: `crushBite` at half effect — it eats small shells). Ability
**Shoal dart** (`shoalDart` reused). Passive: born into a school; the fin holds a line at sprint.
Weakness: small, fragile, and the whole basin eats it.

#### T14 · Henodus chelyops — the lagoon oddity

*Early Carnian, Oberer Gipskeuper, Tübingen-Lustnau.* About 1 m, from a brackish, at times
hypersaline, ephemeral lagoon — the only placodont from non-marine deposits (S). A square flat body
wider than long under a carapace of many small polygonal osteoderms, a plastron below (S); nearly
toothless, one pair of small crushing teeth on the palate and one on the dentaries, horny jaw
edges, and paired grooves along the rostrum read as attachment for baleen-like keratin fringes (S,
mechanism I); eyes far forward; small weak limbs (S). Filter feeding, plant scraping and a mixed
small-particle diet are all argued; a diet of small things is supported, the mechanism inferred.

*Reconstruction.* Square. The shell is a mosaic of hundreds of plates, not a turtle's dozen, and the
face is short and wide with a fringed lip.

*Kit.* Role: the unkillable hoover of the flats. `breathing: 'air'`, medium `breath`, `shell: true`,
`armour` 0.9 `armourFacing: 'all'`, `noBite`, `diet: 'filter'`, `shoreReach` 8. Locomotion ★
`sink`, walks with `punt`; the slowest animal on the roster. `light`, `heavy`: `nibble`. Ability
★ **Comb** (Y, loop): strains the gypsum flats' microbial mats and brine — the one animal that
feeds there — and grazes the algal meadows at half rate. Passive: immune to the flats' heat and
salt; only Placodus' crush bite and a giant's drown-hold can hurt it. Weakness: no attack, no
speed; standing comes from feeding, surviving and the flats nobody else can use.

#### T15 · Saurichthys — the needle

*Early–Late Triassic worldwide; S. curionii and S. macrocephalus from the Meride Limestone, Monte
San Giorgio.* Most species 0.6–1 m, the largest about 1.5 m (S). A pike's body with a long rostrum
of equal jaws and a single row of pointed teeth; dorsal and anal fins far back and opposite,
forming a rudder with the tail; scales reduced to longitudinal rows; a stiff many-segmented column;
large eyes (S). Ambush with fast-start acceleration and pike-like low flow disturbance (S); a poor
sustained swimmer (I); **viviparous**, with litters of a dozen or two of phosphatised embryos (S).

*Reconstruction.* A spear with eyes. The scale rows as three lines along the body.

*Kit.* Role: strike from stillness. `breathing: 'gill'`, `birth: 'live'` (the one live-bearing fish
on the roster, a codex note). Locomotion: `drift` (hangs motionless), the best fast-start on the
roster, poor cruise. `light` Snap; `heavy` **Ambush surge** (`ambushSurge` reused: a one-shot dash
whose hit box is the rostrum). Passive: still, it is very hard to notice (the Cambrian's stillness
bonus). Weakness: stamina punishes a chase.

#### T16 · Hupehsuchus nanchangensis — the armoured gulper

*Olenekian (~248 Ma), Jialingjiang Formation, Hubei.* About 1 m; an ichthyosauromorph, not an
ichthyosaur (S). Rows of dorsal osteoderm plates over the back, bipartite neural spines beneath,
a basket of gastralia, extra fingers (S); a long narrow toothless snout with an unfused upper jaw
and grooves along its margins (S). Baleen-like filter feeding was proposed in 2023 and rebutted in
2025 — no room in the mouth for baleen, the skull closest to a **pelican's** — so a gulping
lunge-feeder on shoals is the stronger current reading (I).

*Reconstruction.* The pelican pouch and the crocodile ridge: a toothless mouth that opens into a
sac, and a back of plates.

*Kit.* Role: the pouch. `breathing: 'air'`, medium `breath`, `armour` 0.5 `armourFacing: 'dorsal'`,
`noBite`. Locomotion: stiff-trunked, tail-driven, slow. `light` Gape (`nibble`); `heavy` ★ **Gulp**
(`filterGulp` reused against snack *schools* rather than blooms: a lunge through a school with the
pouch open feeds on it; nothing else in the column feeds this way). Passive: hits from above do
half; the shoals are its larder. Weakness: soft below, and helpless against anything it cannot
swallow.

### Rung I · Floor and shallows

#### T17 · Keichousaurus hui — the crowd

*Ladinian, Zhuganpo Member, Xingyi, Guizhou.* 10–30 cm; over 1,600 specimens studied, often complete
(S). Tiny head, long neck and tail, a broad flattened ulna and a strong humerus — the forelimb is
the engine (S); needle teeth; pachyostotic ribs as ballast (S); males larger with more robust
limbs (S). Live birth, with two gravid females preserving articulated embryos (S, Cheng et al.
2004); piscivore by gut contents (S); dense populations supported, schooling itself speculative.

*Reconstruction.* A lizard swimming with its arms. Two builds, male and female, as a cosmetic scheme.

*Kit.* Role: the hatchling body of the era. `breathing: 'air'`, short `breath`, `shoals: true`,
`birth: 'live'`, `shoreReach` 4 (it can crawl up the last of the shallows). Locomotion: forelimb
paddling, nimble, poor cruise. `light` Nip; `heavy` **Nip** (heavy). Ability **Kin scatter**
(`shoalDart` reused: the school bursts in every direction, and the pursuer picks one). Passive: born
into a crowd in the Conifer Shore; the crowd is the cover. Weakness: everything.

#### T18 · Cartorhynchus lenticarpus — the crawler

*Spathian (~248 Ma), Nanlinghu Formation, Chaohu, Anhui.* About 40 cm reconstructed, the most
basal ichthyosauriform (S). A short snout with toothless tips and, hidden inside, rows of rounded
molariform teeth found by CT (S); large flexible poorly ossified flipper-wrists that bent like a
turtle's (S); thick pachyostotic ribs; a large hyoid (S). Amphibious, hauling out like a seal (I);
suction feeding on shelled invertebrates (I, the teeth S).

*Reconstruction.* Small, thick-ribbed, a blunt face, and wrists that visibly bend when it crawls.

*Kit.* Role: the amphibian at the bottom of the ladder. `breathing: 'air'`, short `breath`, `shoreReach`
12 — the strongest haul-out on the roster. Locomotion: slow swim, `limbHaul` reused on the sand
(stronger crawl than swim), `sink`. `light` Snap; `heavy` **Crush** (`crushBite` at half). Ability ★
**Suction snap** (Y): pulls any snack within half a body length into the mouth — reach for an
animal with no reach. Passive: the beach is its refuge and the shore animals its only predators
there. Weakness: everything in the water is faster.

#### T19 · Odontochelys semitestacea — the half-shell

*Carnian (~220 Ma), Xiaowa Formation, Guanling, Guizhou.* About 40 cm; the earliest turtle, with
**a complete plastron and no carapace**, teeth in both jaws, a long tail, unspecialised limbs (S).
Nearshore marine by setting and isotopes (S/I), with a minority view of a washed-in land animal
(A); a belly-first shell reads as protection against attack from below in open water (I); diet
small invertebrates or omnivory (A); eggs on land presumed (A).

*Reconstruction.* A toothed turtle with a bare back: the ribs broadened but unfused show as ridges
under the skin, and the plastron is the only shell.

*Kit.* Role: armoured from below. `breathing: 'air'`, medium `breath`, `armour` 0.85 `armourFacing:
'ventral'`, `birth: 'shore'` (the beach run), `shoreReach` 10. Locomotion: slow, bottom-walking with
`punt`, a fair swim. `light` Bite; `heavy` **Bite** (heavy). Ability ★ **Belly turn** (guard):
rolls to present the plastron to the attacker — a guard that re-faces, the era's enrolment — at a
cost of drifting. Passive: an attack from beneath bounces. Weakness: soft above; an ambush from
overhead beats it, and the beach run is the most dangerous minute of any life on the roster.

#### T20 · Ceratites nodosus — the shell

*Ladinian, Upper Muschelkalk, Germany and France.* 7–13 cm across, rarely 20 (S). A discoidal
evolute shell with strong ribs and ventrolateral nodes and the ceratitic suture (S); a chambered
phragmocone with a siphuncle (S). Neutral buoyancy by chamber exchange and jet propulsion by
analogy (S); a slow near-bottom scavenger-predator of a shallow sea (I). Sized up in game to the
playable floor, as the Devonian cephalopods were.

*Reconstruction.* The ribs and nodes are the surface; the soft body is nautilus-like with the
tentacles short and many, and an aptychus is shown when it withdraws.

*Kit.* Role: the buoyant snack. `breathing: 'gill'`, `shell: true`, `armour` 0.8 `armourFacing:
'all'`, `birth: 'egg'` (laid in the dasyclad meadow), `diet: 'scavenger'`. Locomotion: `shellHover`
and `shellJet` reused — hold to rise, release to sink, dash is a backward jet aimed with the shell
behind. `light` Beak; `heavy` **Withdraw** (`shellUp`: guard, all armour). Ability: the hover.
Passive: immune to Helicoprion entirely and to every bite but a crusher's. Weakness: the slowest
turn at rung I, and Placodus.

#### T21 · Phragmoteuthis bisinuata — the hooks

*Carnian, Polzberg, Lower Austria (a soft-tissue site).* Mantle and shell 20–30 cm (I). An
internal chambered phragmocone with a broad three-lobed pro-ostracum extending beyond it — an early
squid's sheet; paired arm hooks along the arms; an ink sac with preserved ink (S); coleoid beaks and
hooks in the guts of Cymbospondylus buchseri (S). Jet-propelled, ink-releasing, hook-armed grappler
of small fish and crustaceans (S); schooling speculative.

*Reconstruction.* A squid with a rigid internal shell: the mantle does not balloon as far as a
modern squid's, and the hooks show as pale points along the arms.

*Kit.* Role: the escape artist. `breathing: 'gill'`, `grasp: true` (the hooks: a `Grab` clip; it
can ride anything larger, and the ride is how it gets across the basin), `birth: 'egg'`. Locomotion:
`swimStyle: 'omnidirectional'`, jet backwards fastest, arms-first slowest. `light` Beak; `heavy` **Hook
latch** (`cheliceraeGrab` reused: a grip that latches rather than bites). Ability ★ **Ink** (Y): a
cloud two body lengths across that breaks every lock-on inside it and hides anything within it as
camouflage does for six seconds; costs a quarter of stamina. Passive: the smallest thing that can
ride a giant. Weakness: nothing between it and a beak but the cloud.

## New effects

Collected from the kits above; each is one hook or one trait, none touches the shared game paths.

| Effect | Kind | Who | What it does |
| --- | --- | --- | --- |
| Drown-hold | heavy special | Cymbospondylus | A held air-breather's breath drains at double rate while the holder dives; the meal ends at empty. |
| Pod / Pod call | trait + Y | Shonisaurus | `shoals` at rung IV: two or three pod-mates; the call converges them and shields a calf for 8 s. |
| Paddle row / Bottom row | trait + Y | Nothosaurus | Two gears; rowing the sand flushes hidden animals into the open. |
| Neck reach / Periscope | trait + Y | Dinocephalosaurus | The head strikes two body lengths from a body that stays put; breathe with the body submerged. |
| Whorl saw | heavy special | Helicoprion | A grip that saws: damage over time, half pierce, and the victim's escape window shortens. |
| Flight / Power stroke | trait + Y | Rhaeticosaurus | Four-flipper flight; a shoulder-first dash of three body lengths. |
| Scrape and sieve | Y loop | Atopodentatus | Feeds from algal meadows and biofilm. |
| Coil | Y | Askeptosaurus | Head where the tail was, on the spot. |
| Sink / Pry | trait + Y loop | Placodus, Henodus, Atopodentatus, Cartorhynchus | Negative buoyancy; feeding from shell beds and mounds. |
| Comb | Y loop | Henodus | Strains the flats' mats; immune to heat and salt. |
| Lateral line | passive + Y | Aphaneramma | Senses the hidden; silt does not shorten its sense. |
| Gulp on schools | heavy | Hupehsuchus | `filterGulp` against snack schools rather than blooms. |
| Suction snap | Y | Cartorhynchus | Pulls a snack half a length into the mouth. |
| Belly turn | guard | Odontochelys | Re-faces the plastron toward the attacker. |
| Ink | Y | Phragmoteuthis | A cloud that breaks lock and hides. |
| Armour facing | field | Odontochelys, Hupehsuchus, Placodus, Henodus, Ceratites | Which side the armour is on. |
| Warm blood | field | ichthyosaurs, Rhaeticosaurus | Immune to the cold modifier. |

Reused as they are: `neckSnap`, `crushBite`, `runThrough`, `snatch`, `ambushSurge`, `shoalDart`,
`tailFlick`, `bristleFlare`, `filterGulp`, `cheliceraeGrab`, `shellHover`, `shellJet`, `shellUp`,
`limbHaul`, `punt`, `drift`, `grasp`, `shoals`, `shell`, `noBite`, `diet`, `shoreReach`.

## The shore animals

Non-playable, modelled, rigged and animated; placed on the beach strip and the estuary banks by
the world as landmarks are. Their job is the fourth pillar. All are Tier 1 model requests.

A word on the brief's phrase *dinosaur necks*: Tanystropheus is an archosauromorph, a cousin of
the line that led to crocodiles and dinosaurs, not a dinosaur, and no dinosaur is known to have
fished from a Triassic shore. The idea is right and Tanystropheus is the animal for it; the codex
should say what it is. If an actual dinosaur is wanted on the shore, a Late Triassic
*Coelophysis* drinking at the estuary is plausible and is listed as an optional extra below.

#### S01 · Tanystropheus hydroides — the boom

*Anisian–Ladinian, Besano Formation, Monte San Giorgio.* About 5–6 m, of which the neck is half,
on **only thirteen** hyper-elongate cervicals, each braced beneath by cervical ribs running back
as struts across several joints (S). A crocodile-like snout with the nostrils set high and a
fish-trap of long recurved fangs at the front (S). The neck was **stiff**: the rib bundles blocked
ventral flexion, the overlapping zygapophyses limited lateral bending, and the low neural spines
gave little leverage — a nearly rigid beam swung as a unit from its base and raised a little
(I, Renesto & Saller 2018; Spiekman et al. 2020). The strike was a fast **sideways snap of the
skull**, not a swan's lunge (I). The current reading is an aquatic bottom-lurking ambush predator
in shallow water, keeping the bulky body out of the prey's sight (I), with shore excursions
possible (A) — and two Monte San Giorgio specimens preserve the head and front of the neck alone,
**bitten clean through** by something larger (S, Spiekman & Mujal 2023).

*In the game.* It stands at the estuary bank and on the beach with its neck out over the water and
its head just under the surface, still. Anything at the surface or in the top four units within
its reach — half its length, a rigid arc swung from the shoulders — is struck: the neck sweeps as
one boom and the head snaps sideways. A snack-sized victim is `takeHold` and dragged up the beach
(death, unless a dash-out inside two seconds); a larger one takes a heavy's damage and is released.
The telegraph is the still head lowering a hand's breadth and the neck going rigid, a second and a
half before the snap, with a warning arc on the radar. It cannot follow into deep water, cannot
turn its neck up or down more than a little, and its neck is its weak point: **a rung III or IV
player that bites the neck at its middle severs it** — the head drops as carrion, the body flees
up the beach, and the spot is safe for the rest of the match. That is the one way to clear a
bank, and it is a spectacle worth a landmark entry in the codex.

*Model.* A 13-joint neck built procedurally on the skeleton with the cervical-rib struts visible as
ridges; the trunk and head from Tripo. Clips: Idle-watch, Lower, Snap (left and right), Drag,
Retract, Severed (a one-shot on the body).

#### S02 · Mystriosuchus — the surface lurker

*Norian, marine lagoons of the Dachstein Limestone (Austria) and the Calcare di Zorzino (Italy).*
A phytosaur — an archosauriform, not a crocodile — of about 4 m from marine deposits (S). A
slender gharial-like snout, nostrils raised on a crest just in front of the eyes so it surfaces
without showing its head (S); a tail half the body; paddle-like limbs and dorsal and ventral
osteoderms (S). Fish and soft prey by microwear (I).

*In the game.* It lies at the surface along the bank with only the crest showing, in the Conifer
Shore and the estuary channels, and lunges a length and a half at anything that surfaces to breathe
within reach. Slow in open water; retreats to bask on the bank. The counter to surfacing at the
shore, and the reason the Periscope and the haul-out matter.

*Model.* Tripo body; the crest and the eyes must break the surface cleanly. Clips: Float, Lunge,
Bite, Bask, Slide-in.

#### S03 · Macrocnemus bassanii — the runner

*Anisian–Ladinian, Monte San Giorgio.* About 90 cm, a long-hindlimbed terrestrial tanystropheid
that ran, possibly on two legs, along the shore (S/I). Ambient only: it bolts when a player nears
the shallows and is a rare snack if it wades. Tripo body, a Run and a Stand.

#### S04 · Coelophysis (optional) — the dinosaur at the water

*Norian, Chinle Formation.* A 3 m theropod at the estuary, drinking, that snatches a hatchling on
the beach run and otherwise ignores the water. The only dinosaur on the shore and, if it is
included, the one the codex can call one.

## Alternates and reserves

Bodies that were weighed and left out, with the slot each could take. All have research in
[research.md](research.md).

- **Shastasaurus sikanniensis / Ichthyotitan** (21–25 m, toothless): a size alternative to
  Shonisaurus if a truly whale-scale body is wanted; the suction-feeding story is contested.
- **Guizhouichthyosaurus** (5–7 m, the thalattosaur in the stomach): the fossil the drown-hold is
  built on; a rung III ichthyosaur if one is wanted between Mixosaurus and the giants.
- **Pistosaurus** (3 m, Middle Triassic): the long-necked alternative to Rhaeticosaurus.
- **Psephoderma / Cyamodus / Placochelys**: the armoured placodonts, two-part shell with a soft
  waist; Psephoderma's sand-probing beak is a third feeding style. The natural third placodont.
- **Neusticosaurus**: the Monte San Giorgio pachypleurosaur, an alternative to Keichousaurus.
- **Xinpusaurus / Anshunsaurus**: a crushing and a piscivorous thalattosaur, the Guanling pair.
- **Helveticosaurus**: a 3 m fanged oddity with no clear analogue; **Eusaurosphargis**: a spiky
  shore lizard, ambient.
- **Chaohusaurus / Utatsusaurus**: the basal, lizard-bodied ichthyosaurs, head-first birth.
- **Nanchangosaurus / Saurosphargis**: small armoured floor animals.
- **Fadenia / Caseodus**: the honest Triassic eugeneodont, the Helicoprion alternative.
- **Rebellatrix**: the fork-tailed fast coelacanth, Early Triassic British Columbia.
- **Acrodus / Palaeobates**: the crushing hybodonts.
- **Thylacocephalans, Antrimpos shrimp, Yunnanolimulus** (horseshoe crab): the small-rung
  arthropods; Antrimpos already has the tail-flip trait in the engine. The roster has no
  arthropod, which is the first thing to change if a slot opens; they are the snack schools
  meanwhile.
- **Choristoceras / Tropites**: a heteromorph and a globose ammonoid, drift and ballast variants.

## Snack schools and residents

Swarms (the Cambrian's `swarms`): thylacocephalan clouds in the channels, Antrimpos shrimp on the
pavement, small colobodontid and peltopleurid fish over the lagoon, Keichousaurus crowds in the
shore, and a coleoid school over the front at night. Residents (`giants` with habitat preferences):
a Shonisaurus pod and a Cymbospondylus in the basin, a Nothosaurus giganteus in the channels, a
phytosaur on every third estuary bank. The shadow predator is the Cymbospondylus.

## Onboarding

The first minute teaches breath: the calf is born, blows, and the hint is the ring. The second
teaches the shore: a Keichousaurus crowd in the Conifer Shore, the boom's arc on the radar, and the
line "Something on the shore is fishing." The rest is the sea.
