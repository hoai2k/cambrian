# 08 · Devonian Domination: game design

**Status:** design proposal, 7 September 2026. This is the gameplay half that the
[Devonian natural-history and asset brief](07-devonian-design.md) deliberately
left out. It assumes that brief's 21 creatures and nine regional boards, and the
[era content boundary](06-era-content.md) as the way the content ships. Nothing
here is built. Numbers are balance parameters, not fossil measurements, and
every behaviour described is a game mechanic inspired by anatomy, not a claim
about what these animals did.

## The pitch

*Cambrian Explosion* is a growth story: hatch tiny, eat, moult, become the
thing that frightened you. That story cannot be told in the Devonian. A
trilobite is never going to be a Dunkleosteus, and pretending otherwise would
throw away the most interesting fact about the period: it is the first sea
with a **food chain we would recognise**, with armoured jawed fishes at the
top, sharks and lobe-fins in the middle, a floor of arthropods and molluscs,
and the first animals with limbs testing the edge of the water.

So Devonian Domination is not about getting bigger. It is about **owning your
rung**. You pick an animal and with it a place in the chain. A trilobite and a
Dunkleosteus are both winnable picks, because the game measures how completely
you dominate *your* niche: how well you feed, how many rivals of your own kind
you drive off, how much reef you hold, and how often the rung above you tries
to eat you and fails. A tetrapod wins by exploiting the one place nothing
else can follow. A giant wins by staying fed in a sea that has learned to hide
from it. Success looks different at every rung, and the game scores them on
the same scale so friends can play different rungs at the same table.

The Cambrian game's whole verb set survives: camera-relative swimming, dash
and sprint, bite and heavy, block and parry, hiding, the endless streamed sea,
the radar, the teleport menu, local split-screen. What changes is **why** you
do those things, plus a handful of mechanics the Devonian earns on its own:
armour with a soft side, air, shells, and a shoreline you can climb.

## Design pillars

1. **Your rung is your game.** Every creature has a fixed adult size and a
   place in the chain. Progress is *standing* within the rung, not length.
2. **The chain is the world.** The animal above you is always somewhere on the
   radar; the animals below you are how you feed. Nobody is outside it, not
   even the top.
3. **Different rungs, one scoreboard.** Standing is normalised per rung so a
   trilobite and a shark race on equal terms. Winning as prey is as legitimate
   as winning as predator, and should feel it.
4. **Keep the hands, change the head.** The controller does exactly what it
   does in the Cambrian. Only the goals and a few era mechanics are new.
5. **Anatomy first, then mechanics.** A mechanic exists because the fossil
   suggests it (jaws, armour, lungs, limbs, chambered shells), and is labelled
   as invention.

## The food chain: rungs

Every creature belongs to one of four **rungs**, fixed by adult body length.
The size bands from the Cambrian rulebook (snack / prey / rival / threat /
giant) still decide what any two bodies can do to each other in the moment;
rungs decide what you are *for*.

| Rung | Approx. game length (adult) | Who | What success is |
| --- | --- | --- | --- |
| **I · Floor** | 0.6–1.2 | Eldredgeops, Walliserops, Nahecaris, Furcaster, Palaeoisopus, Manticoceras | Stay alive, stay fed, stay hidden. Out-scavenge and out-graze your rivals. Moult without being caught. |
| **II · Shoal** | 1.2–2.8 | Cheirolepis, Doryaspis, Gemuendina, Bothriolepis, Coccosteus, Michelinoceras, Acanthostega | Feed on the floor and the water, and do not get eaten doing it. Lead a shoal; hold a home stretch. |
| **III · Hunters** | 2.8–6 | Cladoselache, Stethacanthus, Onychodus, Rhinodipterus, Tiktaalik, Jaekelopterus | The Cambrian game as you know it: hunt II, fight your own kind, avoid IV. Hold a hunting range. |
| **IV · Giants** | 7–12 | Dunkleosteus, Titanichthys | Stay fed in a sea that hides from you (Dunkleosteus); or eat the sea itself and stay out of the other giant's way (Titanichthys). |

Lengths are compressed for playability as in the Cambrian, but the *ratios*
between rungs are the point and are preserved: rung IV is roughly ten times
rung I, so the size-band rules produce exactly the relationships you would
expect. A Dunkleosteus and a trilobite are `giant` and `snack` to each other
and always will be. Two Coccosteus are `rival`. A Cladoselache is `threat` to
a Cheirolepis, `prey` to a Dunkleosteus.

Titanichthys is the deliberate oddity: a giant with no bite. It is `giant`
in the size band (small things bounce off it and cannot hurt it) but it has no
attack against anything above snack size. It is a moving landmark and, for
rung I and II, a moving shelter. As a pick it is the zen route: feed on blooms,
grow standing through range and survival, and mind the only animal that can
hurt you.

### Life stages instead of tiers

The five Cambrian tiers become three stages with a much smaller spread, so the
moult ceremony survives but never lets anyone leave their rung:

| Stage | Scale × adult | Notes |
| --- | --- | --- |
| Young | 0.6 | Where you start. Faster, more fragile, easier to hide. Rung I young can hide in shell hash and crinoid debris. |
| Adult | 1.0 | Full kit. Reached quickly — a few minutes of competent feeding. |
| Prime | 1.2 | A standing reward, not a growth one: slightly harder hitting, slightly more stamina, visibly larger and more marked. Lost on death; you respawn as an Adult with your standing intact minus a penalty. |

Death never drops you below Adult once reached, and never touches your rung.
The sting of dying is in **standing**, below.

## Standing: the progress that replaces growth

**Standing** is a 0–100 meter per player, drawn in the ring where the Cambrian
game draws tier progress, with the rung glyph in the centre. It is the score.
Every rung fills it from different sources, weighted so a well-played creature
of any rung fills it at about the same pace.

| Source | I · Floor | II · Shoal | III · Hunters | IV · Giants |
| --- | --- | --- | --- | --- |
| Feeding (nutrition of the right kind: grazing, scavenging, small prey, blooms, hunts) | ●●● | ●●● | ●●● | ●●●● |
| **Escapes** — being hunted by the rung above and losing it | ●●●● | ●●● | ●● | — |
| **Rival wins** — driving off or killing your own rung | ●● | ●● | ●●●● | ●● |
| **Range** — time spent as the dominant of your rung in a stretch of reef | ● | ●● | ●●● | ●●●● |
| **Shoal** — conspecifics following you (II) or grazing beside you (I) | ●● | ●●●● | — | — |
| Surviving a **moult** (I) / an **anoxia event** (gill breathers) | ●● | ● | ● | ● |

Standing decays very slowly when you do nothing, and takes a hit when you die
(a fifth of it, and you drop from Prime to Adult). It is what the match is
about: the first player to reach **Dominant** (100) and hold it for 90 seconds
wins, exactly as reaching Apex and surviving 90 s did. Because every source is
per-rung, a trilobite that has fed, moulted twice, escaped three hunts and
holds a patch of crinoid meadow is as Dominant as the shark that has eaten
twelve fish and run its rivals out of the reef.

Two consequences worth stating:

- **Escaping is scoring.** In the Cambrian, being hunted was a tax you paid.
  Here, for the lower rungs, a hunt you survive is one of the best things that
  can happen to you. The threat HUD stays exactly as tense; the outcome is
  rewarded. This is what makes playing prey a real choice rather than a
  handicap.
- **The top is not exempt.** Dunkleosteus fills standing mostly by range and
  feeding, and a sea that is hiding from it starves it. Its standing decays
  faster than anyone's when unfed. Smaller players can drive it off (see
  *Armour*), which costs it range. The giant has the strongest kit and the
  hardest meter.

## Range: holding ground

The endless sea gives every rung something to own. **Range** is a soft
territory: while you are the largest-standing member of your rung within
about 60 units, that stretch is yours, your standing ticks up from it, and AI
of your rung give way (they wander off rather than compete for food there).
Another player of your rung entering it contests it: whoever has more standing
after a rival exchange, or simply stays while the other leaves, holds it.

- Range is shown as a soft arc on the radar rim, in your colour, covering the
  angle of reef you hold; other players' ranges show in theirs. The biome
  banner reads "Your range" when you are inside it.
- Range decays when you leave it for more than a minute, so it is a reason to
  come back, not a wall to hide behind.
- Giants have a huge range and almost nothing else; that is the trade.

Range is the reason the sea needs to be endless in this era: when the reef you
are in is somebody's, you go and find your own.

## Era mechanics

These are the additions the Devonian pays for. Each is small, each maps to an
existing button, and each is justified by something in the brief.

### Armour has a soft side

Placoderms (Dunkleosteus, Coccosteus, Bothriolepis, Gemuendina) and the
shelled cephalopods carry **armour zones**: a fraction of the body, from the
head back, that takes greatly reduced damage. Hits behind the armour line, or
from below on a flat fish, do full damage and more. The Cambrian game already
has a direction bonus for hits from behind; this makes it a defined, readable,
per-creature property, drawn on the creature (the armour is the model) and on
the lock-on panel as a small silhouette with the soft region lit.

- Dunkleosteus' cutting jaws **pierce armour** (its heavy ignores the zone).
  Nothing else does. That is the whole of its terror and the reason a fight
  with it is about staying out of its mouth.
- Two armoured fish fighting each other spend the fight circling for the tail.
  That is the intended rhythm: the *fight shapes* from the Cambrian design get
  a new one, "the flank".
- A trilobite's enrolment (Eldredgeops, Olenoides-style) is all armour for as
  long as the block is held.

### Air

Rhinodipterus, Tiktaalik and Acanthostega are **air breathers**. They have an
air meter under stamina. It drains slowly; when it is low their stamina
regeneration halves and sprint is disabled until they surface. Surfacing is
**RB held at the light window**: a gulp refills the meter and grants a short
"second wind" (a free sprint), but the surface is where the water is
brightest and every rung IV shadow is watching it.

Everyone else is a gill breather and has no meter. The difference matters in
one place:

### Anoxia events

The Late Devonian sea suffered repeated oxygen crises. As a mechanic: every
few minutes a **dead zone** blooms somewhere in the deeper biomes, announced
by the water going murky-green and the music thinning. Inside it gill
breathers lose stamina regeneration and, after a grace period, health; air
breathers are unaffected as long as they can reach the surface; anything that
dies in it leaves a corpse nobody can safely eat. Events are marked on the
radar as a hollow ring and drift slowly with the current, so the reef's
population moves and predator and prey are shoved into the same water.
Surviving one from inside earns standing. They are part of the deep biomes'
danger, never the shallows'.

### The shore you can climb

The shoreline is a wall for every Cambrian creature. For Tiktaalik and
Acanthostega it is a **refuge**: they can push into water too shallow for
anything else, right up onto the beach, where they move slowly, breathe air
freely, and cannot be followed by anything with gills. The Ellesmere and
Greenland waterway boards are exactly this environment. It is the era's
signature image and it is a mechanic that costs one line in `resolveStatic`: a
per-creature shore limit. Their standing does not tick while beached (you have
to come back into the chain), so the beach is a place to escape to, not to
live on. Bothriolepis gets a smaller version of this (its armoured pectoral
appendages let it push into the shallows further than a swimmer), clearly
labelled as an interpretation.

### Shells

Manticoceras and Michelinoceras are the era's strangest swimmers, and they
move like nothing in the Cambrian:

- **Jet**: sprint is a backward pulse, fast and blind, the way the shell
  points. Dash is a sideways pulse.
- **Buoyancy**: rise and sink are free and quiet (the chambered shell does the
  work), so they can hover motionless at any depth without spending stamina —
  the best campers in the game, and camouflage suits them.
- **Withdraw**: block pulls the soft body into the shell. Near-total armour
  from the front, none from the aperture; slow to come out of.

### Moulting (rung I)

Trilobites and the arthropods must **moult** to reach Adult and Prime. The
moult is the Cambrian ceremony with a cost: for its last two seconds you are
soft (double damage) and slow, and you leave behind an **exuvia** — a shed
exoskeleton that lies on the seabed as a decoy. Predators' AI will notice and
investigate an exuvia before a still trilobite nearby. Timing a moult under
cover, or using the shed shell to break a hunt, is the rung I skill. The
organic-remains prop family in the brief (G12) is exactly this object.

### Shoaling (rung II)

Rung II fishes gain standing from conspecifics following them. Swim near AI of
your own species for a few seconds and they fall in behind you; sprint and
they scatter; turn hard and the shoal turns a beat later. A bigger shoal is
worth more standing per second and confuses hunters (a hunter that dives on a
shoal has a real chance of taking a follower instead of you), but it is also
loud and visible from further away. Losing followers to a hunt costs no
standing; losing the whole shoal does. This is the schooling AI the Cambrian
already runs for swarms, pointed at the player.

### Grasp, tusks, tridents, brushes

The remaining creature identities map onto the existing native-special table
from [05](05-hiding-and-combat.md) without new systems:

| Creature | Identity mechanic |
| --- | --- |
| Jaekelopterus | Heavy: chelicerae grab (the existing grab), holds and drags prey toward the floor; walks on the seabed, swims with paddles (ground creature with a rise-to-swim). |
| Onychodus | Heavy: tusk lunge, a long committed strike with guard-break, its heavy pierces armour *partially* (half the zone). |
| Cladoselache | Sprint onset: the fastest straight-line burst in the game; heavy is a run-through bite. |
| Stethacanthus | Block: the spine-brush is a display — holding block near a rival forces an AI rival to back off once per encounter (a bluff, no damage), and briefly raises the detection cost for hunters. |
| Cheirolepis | The everyman fish: no special, best acceleration in rung II, cheapest shoal. |
| Doryaspis | Jawless: cannot bite; feeds by sweeping the floor (grazing route); block is a hard bony shield. Its oral projection is *not* a weapon — the brief is explicit. |
| Gemuendina | Y: sand burial (the existing burrow) with an upward ambush emergence bite; flat body makes it near-immune to hits from above while buried. |
| Bothriolepis | Ground creature; block is armour; can enter the shallows further than swimmers (see *The shore*). |
| Coccosteus | The small arthrodire: a full armour zone and an ordinary bite. Rung II's fighter. |
| Rhinodipterus | Air breather; heavy is a crushing bite that does extra damage to shells (Manticoceras, Michelinoceras, snails). |
| Tiktaalik / Acanthostega | Air breathers with the shore refuge; Tiktaalik has the stronger bite and a neck (its lock-on turn is faster than its body's); Acanthostega is smaller, quicker, and can push further up the beach. |
| Eldredgeops | Block: enroll. Excellent eyes: its sense pulse has the longest reach in rung I. |
| Walliserops | Heavy: trident shove — a low-damage push that displaces a rival, meant for rival duels over grazing patches; the brief notes the function is unsettled, and the game says so. |
| Nahecaris | The scavenger: corpses give it double nutrition; fast and fragile. |
| Furcaster / Palaeoisopus | The slow benthos: hiding specialists (camouflage is nearly free for them), scavengers, and the only rung I animals that gain standing from *time alive in the open*. See *Risks* — these two are the picks most likely to need a prototype before commitment. |
| Manticoceras / Michelinoceras | Shells, above. Michelinoceras is the faster jet; Manticoceras the better hover. |
| Dunkleosteus | Armour-piercing heavy; the slowest turn in the game; a huge range; a hunger clock. |
| Titanichthys | No attack above snack size; feeds on blooms; a moving shelter; standing from range and survival only. |

## The world: a Devonian coast

The endless-sea structure from [04](04-infinite-ocean.md) — one shoreline,
biomes banded by distance from it, an along-shore mosaic inside each band —
carries over unchanged, and suits the Devonian better than it did the
Cambrian, because the Devonian's regional boards are *literally* a coast:
river mouths and wooded banks at the shore, reefs on the shelf, an open dark
sea beyond. The brief's nine boards do not all coexist, and the game says so
the same way the Cambrian roster does: this is a **collection inspired by the
Devonian**, labelled by locality in the selection screen, not a claim that
Hunsrück and Cleveland were one place.

Nine biomes, reusing the nine shared biome slots (so the terrain algorithm and
renderer need no structural change, only new content):

| Slot | Devonian biome | Board | Where | Character | Danger |
| --- | --- | --- | --- | --- | --- |
| shallows | **Sandy Shallows** | E09 / E03 | 0–130 | Bright water over sand and pebble beds, brachiopod pavements, low algal thalli. The gentle strip. | 0.10 |
| nursery | **River Mouth** | E05 / E07 / E08 | pockets along the shore | Sediment-brown freshwater pushing into the sea, submerged logs and roots, banks you can beach on. Spawn point. Tetrapods' home. | 0.06 |
| shelf | **Mud Shelf** | E01 / E06 | 130–660 default | Fine mud, scattered brittle stars and trilobites, shell debris. The open ground. | 0.40 |
| forest | **Crinoid Meadow** | E01 | patches | Stalked crinoids as tall as the sponge forest, waving in the current: rung I's larder and cover. | 0.45 |
| boulders | **Stromatoporoid Reef** | E04 | patches, denser seaward | Massive domed and branching skeletal sponges, tabulate and rugose corals, crevices and overhangs. The Devonian's built structure. | 0.50 |
| flats | **Carbonate Pavement** | E02 | patches | Hard pale rock with shell accumulations and Walliserops. Nowhere to hide, good grazing. | 0.35 |
| channel | **Tidal Channels** | — | from 200 out | Cuts draining the river mouths seaward; current, murk, and where the dead zones first appear. | 0.72 |
| escarpment | **Reef Front** | E04 | 650–800 | The buttressed edge of the reef dropping into dark water; Onychodus and Cladoselache country. | 0.80 |
| basin | **Open Sea** | E06 | beyond 800 | The Cleveland offshore: soft dark bottom, distant silhouettes, anoxia. Dunkleosteus. | 0.92 |

Danger drives music and the relaxing/extreme visual language exactly as in
[04](04-infinite-ocean.md): the river mouth and sandy shallows are the rounded,
bright end; the reef front and open sea the angular, dark one. The brief's
props map cleanly: B01–B07 build the reef and its front, B08 the meadow, B09
and B11–B12 the shallows and pavement, G10–G11 the river mouths, G08–G09 the
shelf's debris.

Two new environmental behaviours beyond the terrain: **anoxia events** in the
channels, reef front and open sea (above), and a **shore you can climb** at
the river mouths and shallows for the creatures that are allowed to.

## Modes

| Mode | Players | What it is |
| --- | --- | --- |
| **Domination** | 1–4, co-op or solo | The main mode. Pick any creature from any rung. First to Dominant standing and 90 s holding it wins; co-op shares standing from assists and ends when the party's combined standing crosses the line. Escalation: dead zones come more often and giants roam wider as standing rises. |
| **Food Chain** | 2–4 versus | Each player must pick from a *different rung*. Everyone's standing is on the board. The hunter needs the prey; the prey scores by surviving the hunter. The purest expression of the era, and the mode the name promises. |
| **Hunter & Hunted** | 2–4 versus | Carries over unchanged with Dunkleosteus as the giant; the small ones are rung II picks with the river mouth as their refuge. |
| **Reef** | 1–4 | Sandbox: any creature, any stage, any biome, dead zones on or off. |

Frenzy (the growth race) does not carry over: without growth it has nothing to
race. Food Chain replaces it.

## Readability, HUD and feedback

Keep everything the Cambrian HUD does and change the meaning of one element:

- The **tier ring becomes the standing ring**, with the rung glyph (I–IV) at
  its centre instead of the tier glyph. Filling it to the top is the win. Small
  ticks on the ring show the last few sources ("+escape", "+range") so the
  player learns what their rung scores from.
- The **radar** gains the range arc (yours and others'), and the hollow ring of
  a dead zone. The shore mark already exists; for air breathers a small surface
  mark shows the nearest good gulping spot when air is low.
- **Air meter** under stamina for the three air breathers only.
- The **lock-on panel** shows the target's armour silhouette with its soft
  region lit, for armoured targets.
- The biome banner reads "Your range" inside it, and the dead-zone warning is
  the tension treatment the hunted state already uses, in green.
- Onboarding hints are per rung, because the first thing a trilobite must
  learn ("hide, then moult") is the last thing a shark cares about.

## What carries over untouched

Movement, dash/sprint, bite/heavy/block/parry, the hide button (burrow and
camouflage), stamina, detection and cover, the needs-based AI, the giant
patrol/notice/hunt loop, swarms, the streamed world, teleport, radar, split-
screen and drop-in, corpses and respawn, distance haze, the soundtrack
director. The size-band rule stays exactly as it is; what changes is that
nobody moves between bands by growing.

## Implementation notes

**Status (Sept 2026): implemented and playable at `/devonian/`.** The content pack is
`src/content/devonian/`, the rules are `src/sim/devonian/rules.ts` behind the hooks in
`src/sim/era-rules.ts`, the HUD carries the standing ring (rung numeral), air bar, range chip,
dead-zone radar rings and the Dominant countdown, and `tools/devonian-test.ts` (`npm run
devonian`) covers the pack, rung bands, standing and staging, air, dead water, shore reach,
armour, determinism and the mode endings. Eight of the 21 models are delivered; the rest borrow
a delivered body (`assets.standIns`) until their own lands. Not yet built from the list below:
the per-creature grasp/tusk/trident/brush specials (they use the shared ability set for now),
the Devonian scenery and biome plates (Cambrian sets are reused), and the two biome music
themes. The notes below are kept as the build order that was followed.

1. **Content pack** (`src/content/devonian/`, per [06](06-era-content.md)):
   the 21 `CreatureDef`s with new fields — `rung`, `stages` (the three scales),
   `armour` (fraction of length from the front, and a pierce flag), `breathing`
   (`gill` | `air`), `shoreReach` (how far into the shallows it may go, 0 for
   most), `shell` flag, `feeding` route. Ecology: schools of Cheirolepis and
   Doryaspis young; giants Dunkleosteus (open sea, reef front), Onychodus (reef
   front), Jaekelopterus (channels); shadow Titanichthys. Nine biome names,
   danger and atmosphere.
2. **Standing** (`src/sim/game.ts`): replace `nutrition → tier` with
   `standing` per player; sources fire from the events that already exist
   (`eat`, `kill`, `escape`, `moult`, `routed`) plus two new ones, `range` and
   `shoal`. `TIER_SCALE`/`TIER_NEED` become per-era stage tables. Win check in
   `updateModes` becomes "standing ≥ 100 held 90 s".
3. **Range**: a per-player spatial claim evaluated every second from the
   actor hash (largest standing of the same rung within radius); the AI's
   `wander` for same-rung actors gets a "give way" pull out of a player's
   range. Radar arc from the same data.
4. **Armour zones** in `combat.ts`: a per-hit test of the contact angle
   against the victim's armour fraction, with a `pierce` bypass. The existing
   direction bonus is the hook.
5. **Air and anoxia**: an `air` field and drain on air breathers; a
   `DeadZone` list on the game (position, radius, drift, age) stepped like
   silt clouds; stamina and health effects in `updateActor`; a renderer fog
   tint and radar ring.
6. **Shore reach**: `resolveStatic` takes the actor's `shoreReach` and lets it
   past `SHORE_WALL`; ground movement on the beach slope; air refills there.
7. **Shells**: a movement profile flag that makes sprint a backward jet and
   rise/sink free; withdraw as the block state with a front-only armour zone.
8. **Moult with exuvia**: the moult state gains a soft window and spawns a
   static `Corpse`-like decoy that AI detection scores as a target.
9. **Shoaling**: the swarm brain already follows a `home`; point a school's
   home at a player of its species when they are near and calm.
10. **Modes**: Domination and Food Chain in `updateModes`; Frenzy removed for
    this era; selection screen enforces distinct rungs in Food Chain and shows
    the locality label.

Tests to add, in the spirit of the existing suite: a `rung-test` that every
creature pair produces the intended size band; a `standing-test` that a
scripted trilobite, shark and Dunkleosteus each reach Dominant in roughly the
same time under competent bot play (the normalisation check); an anoxia test;
a shore-reach test that a Tiktaalik can beach and a Cladoselache cannot.

## Risks and open questions

- **Are the slow benthos fun?** Furcaster and Palaeoisopus are the honest
  question mark in a 21-creature roster. The design gives them a niche
  (hiding, scavenging, standing from time alive) rather than pretending they
  are fish. Prototype them early with the Cambrian engine (a slow ground
  creature with cheap camouflage) and be willing to make them AI-only if the
  niche does not hold. The roster does not need to be 21 playable.
- **Normalising standing across rungs** is the balance job of this era, and
  it is a real one. The harness exists (`tools/harness.ts`); the standing test
  above is the acceptance criterion. Expect the weights table to move.
- **Titanichthys as a pick.** It may be the most relaxing thing in the game or
  the dullest. Ship it as a pick behind a "peaceful" label and watch.
- **Locality mixing.** The brief is emphatic that Hunsrück, Gogo, Cleveland,
  Miguasha and Ellesmere are different places and times. The game mixes them
  along one coast for the same reason the Cambrian roster mixes Chengjiang
  into the Burgess Shale, and must label it the same way. Jaekelopterus is
  Early Devonian in a sea otherwise dominated by Late Devonian fishes; its card
  says so.
- **Anoxia as a mechanic** is grounded in the period's extinction pulses but
  the in-game version is a dramatisation. The banner text should not claim
  more than "low oxygen".
- **Armour zones and the flank fight** could make placoderm-versus-placoderm
  duels long. Bound them with stamina (circling is not free) and give the
  heavy a guard-break so a patient player can end them.

## Asset implications beyond the brief

The brief covers creatures and environments. Gameplay adds a short list:

- Rung glyphs I–IV for the standing ring and selection cards (four small SVGs
  in the tier-glyph style).
- A range arc and dead-zone ring treatment for the radar (CSS only).
- Armour silhouettes for the lock-on panel: one small side-view per armoured
  creature, derived from the approved models.
- An exuvia model per moulting arthropod: the approved creature model, hollow,
  in the shed pose — the brief's G12 family already anticipates it.
- Two music themes tagged for the river mouth (calm) and the open sea /
  anoxia (danger), in the same family as the Cambrian's.

Everything else in this document reuses what is being built or already exists.
