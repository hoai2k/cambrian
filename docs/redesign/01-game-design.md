# 01 · Game design: Cambrian — Rise of the Apex

> Current combat and Y controls: [Hiding and native combat](05-hiding-and-combat.md) supersedes the original signature-ability mappings below.

> Working title. The subtitle changes; the pitch does not.

## The pitch

You hatch as a fingernail-sized larva on a Burgess Shale reef, 508 million
years ago. Everything around you is bigger than you. Eat what you can catch,
grow, and the reef reorganises itself around you: yesterday's monsters become
today's rivals, then tomorrow's food. Somewhere out in the channel the giants
still cruise, and when one of them turns toward you the only right answer is
to run, hide and wait.

Every creature has its own body, its own way of moving, and its own trick.
Every fight is fast, physical, three-dimensional, and decided by spacing,
timing and momentum, not by stat totals.

## Design pillars

1. **Being the animal.** Movement, senses and abilities come from the real
   anatomy: Anomalocaris grasps, Opabinia snatches, Waptia flicks, Wiwaxia
   armours up, Marrella burrows, Olenoides enrolls. Never a generic "attack".
2. **Size is everything.** One number, your body length relative to the
   other creature, decides whether you eat it, fight it, or flee it. The
   player *feels* the threshold flip as they grow.
3. **Water combat is momentum combat.** You are never standing still. Attacks
   commit you forward, dodges carry you sideways, retreats cost you stamina.
   The winner is the one who controls distance.
4. **Fear is a feature.** Giants exist from minute one. Detection, cover,
   silt, stillness and burrowing are real systems, and escaping a giant should
   feel as good as landing a kill.
5. **Couch first.** One to four players on one screen, drop-in, always
   readable. Every mode works solo with bots and better with friends.

## Core loop

```
   HATCH  ─►  HUNT smaller prey  ─►  EAT & GROW  ─►  new tier unlocks
     ▲            │                      │              (bigger, stronger,
     │            ▼                      ▼               new prey, new rivals)
   DIE/RESPAWN ◄─ FIGHT same-size rivals ◄─┘
     ▲            │
     └────────────┴──  FLEE / HIDE from giants  (always possible, always tense)
```

Minute to minute you are always doing one of five things, and the game is
tuned so the mix shifts as you grow:

| Activity | Larva | Juvenile | Adult | Giant | Apex |
| --- | --- | --- | --- | --- | --- |
| Hunting (eat) | 60% | 50% | 40% | 35% | 30% |
| Exploring / positioning | 20% | 20% | 20% | 20% | 20% |
| Fighting peers | 5% | 15% | 30% | 35% | 45% |
| Fleeing / hiding | 15% | 15% | 10% | 10% | 5% |

## The size rule

Every actor has a **mass** derived from body length (`mass ∝ length³`, but we
compare lengths because that is what the player sees). Given two creatures A
(you) and B:

| Ratio `len(B) / len(A)` | B is your… | What happens |
| --- | --- | --- |
| < 0.45 | **Snack** | Swim through it or bite once: instant consume, small growth. Schools of these are your bread and butter. |
| 0.45 – 0.7 | **Prey** | It has a health bar but can't hurt you much. It flees, you chase. Two to three bites. |
| 0.7 – 1.4 | **Rival** | Full combat: both can hurt each other, both have all their tools. Winner eats the loser (big growth). |
| 1.4 – 2.2 | **Threat** | You *can* hurt it, but you should not be here. Its hits stagger you, yours barely register. Bait it, chip it, or leave. |
| > 2.2 | **Giant** | It one- or two-shots you and can swallow you whole. You cannot meaningfully damage it. Flee or hide. |

Ratios are tunable per creature (a Wiwaxia in shell-up survives a Threat
longer, a Waptia never survives one). The HUD colours everything by this band
(see *Readability*), so the player always knows which rule applies.

## Growth

Growth is continuous but presented in five **tiers** so that each one feels
like an event.

| Tier | Scale (× adult model) | Typical length | Unlocks |
| --- | --- | --- | --- |
| Larva | 0.25 | 0.7 u | Light bite, dodge, sense pulse. Can hide inside filament tufts and under sponge fronds. |
| Juvenile | 0.5 | 1.4 u | Heavy attack, guard. Can still hide in sponge thickets. |
| Adult | 1.0 | 2.7–3.9 u (the current stat table) | Signature ability. Rivals now include other players. |
| Giant | 1.7 | 5–6.5 u | Ability upgrade. Can crash through small sponges. Ambient predators start avoiding you. |
| Apex | 2.6 | 7–10 u | Roar / territory. You *are* the shadow on the light window for smaller players. |

- **Nutrition** is the growth resource. Every consume grants nutrition
  proportional to prey mass, with a bonus for killing a Rival (× 2.5) and a
  penalty for eating snacks far below your size (× 0.3, so an Apex cannot farm
  plankton forever).
- Tier-up happens on the spot with a 1.5 s **moult**: the model scales up,
  the camera pulls back, a low sound thumps, nearby small creatures scatter.
  During the moult you are invulnerable but cannot act.
- **Death loses a tier** (never below Larva) and half the nutrition into the
  next tier, and you respawn in a nursery. Your corpse becomes food for
  whoever killed you. Losing a tier is the sting; keeping most progress keeps
  it fun.
- Bigger is not strictly better. Speed and turn rate scale *down* slightly
  with tier (`× 1 / tier^0.15`), hitboxes scale up, stamina pool grows. A
  Larva is genuinely hard for an Adult to catch in a sponge thicket.

## Movement: swimming that feels alive

The single biggest change from the current build is **camera-relative,
momentum-based movement**.

- **Left stick** pushes you in the direction you push *relative to the
  camera*, including pitch: look down and push forward to dive. Your body
  banks and turns to follow with a creature-specific turn rate. Release the
  stick and you **glide**: velocity decays over ~1.5 s, you keep drifting.
- **Right stick** orbits the camera. **A** kicks you upward, **left stick
  click** sinks you. These are nudges; most depth change comes from pitch. The
  view reaches ~54° above the horizon and ~76° below it (`PITCH_UP` /
  `PITCH_DOWN` in `src/render/engine.ts`): the water above you is where what
  eats you comes from, and the sand below is where what you eat lives, so both
  have to be lookable-at. Aiming up from the seabed pulls the camera in on a
  shorter arm rather than flattening the shot against the floor.
- **RT (analog) = burst.** Holding it drains stamina and multiplies speed
  (× 1.6–2.2 depending on creature). Tapping it gives a short lunge. Burst is
  how you close on prey and how you outrun a Threat, so stamina management is
  the heart of the chase. The drain (`BURST_STAMINA` in `src/sim/game.ts`) is
  set so a full bar sprints for the best part of fifteen seconds: long enough
  that a sprint is a crossing or a chase, short enough that the swim home is
  still paid for out of the same bar.
- **The floor is somewhere you swim, not a surface you hover over.** A swimmer
  may come down to a fraction of its resting clearance (`floorClearance`), so
  you can graze the sand and take what lives on it. Rocks are ridden over
  rather than run into: where a boulder's own surface is within a body's climb
  budget (`climbOver`), it stops blocking and the floor under you carries you
  up and across it. Only rock that genuinely stands above you is a wall.
- **Currents** are real. The existing current field pushes everyone; a
  larva in the channel current moves at half its burst speed for free. Giants
  patrol *with* the current, so the smart escape is across it.
- **Seafloor creatures** (Hallucigenia, Marrella, Olenoides, Wiwaxia) stick
  to terrain and climb boulders and sponges. **RB** is a **hop** (short
  ballistic arc, a dodge and a way onto a ledge) and, held, a **paddle**:
  they climb into open water and keep swimming there at roughly a third of
  their crawl, with no sprint and no dash until their legs are back on the
  floor, and the climb costs more stamina than they regain. So open water is
  a crossing, not a second home, and the seabed is where they hunt, are fed
  and get their burrow/anchor tools. They are the "ground fighter" archetypes.
- **Ambient body motion**: idle sway, fin/flap frequency tied to speed
  (already in the current animation layer), a small procedural bob so nothing
  is ever perfectly still.

## Combat: hit, block, dodge, move in, retreat

Every creature gets the same verbs so fights are learnable; every creature
expresses them differently so fights are varied.

### Verbs

| Verb | Button | What it is |
| --- | --- | --- |
| **Light attack** | RB | Fast bite / pinch. 3-hit chain. Low damage, low commitment, resets your momentum slightly. Interrupts prey. |
| **Heavy attack** | X | Creature's big strike (grasp, sweep, shove, ram). Long wind-up, high damage, knocks back, **breaks guard** if charged (hold X). Commits you forward one body length. |
| **Ability** | Y | The signature power (table below). Cooldown 8–20 s. |
| **Dodge** | B (+ stick) | 0.3 s invulnerable dash in the stick direction, or a back-dash with no stick. Costs stamina. Double-tap B is a **retreat burst**: longer, no invulnerability, drops a silt puff behind you. |
| **Guard** | LB (hold) | Halves damage, prevents knockback, drains stamina on each hit. A guard-broken creature is **staggered** for 1.2 s. |
| **Parry** | LB (tap, timing) | Guard in the first 0.15 s of an incoming hit: no damage, attacker is staggered 0.8 s and you get a free heavy. Swimmers parry with a body twist, armoured crawlers with a shell clank. |
| **Lock-on** | LT (toggle) | Camera frames you and the target, movement becomes **orbit/strafe** relative to the target, attacks home. Left stick left/right circles. Flick right stick to switch target. |
| **Sense pulse** | D-pad ↑ | 2 s highlight of everything within sense range through cover, colour-coded by size band. Cooldown 6 s. |
| **Eat** | automatic | Biting a dead body or a Snack consumes it. **Anything can feed on anything**, however much bigger it was: the carcass comes apart in whole bites, `ceil(3 × its length / yours)` of them (1–12), a bite every 0.62 s. A body under a third of your length goes down whole and is carried into your mouth; bigger, it stays where it fell, and each bite tears its share of the meat off the model and flies it into your mouth. Eating can be interrupted, so opening a giant carcass in the open is a long risk. |

> **The shipped bindings are different.** The layout above is the design's first
> proposal; play settled somewhere else, and `readGamepad()` in
> `src/input/input.ts` is the authority. What the game actually reads:
>
> | Control | Button | Does |
> | --- | --- | --- |
> | Left stick | axes 0–1 | Camera-relative swim |
> | Right stick | axes 2–3 | Orbit the camera |
> | RS click + stick up/down | 11 | Zoom |
> | LS click | 10 | Sink |
> | **A** | 0 | **Sprint / burst** (analog-free, held) |
> | **B** | 1 | **Guard** (hold) / **parry** (tap) |
> | **X** | 2 | **Light bite** |
> | **Y** | 3 | **Ability** |
> | **LB** | 4 | **Dodge / dash** |
> | **RB** | 5 | **Rise** / **hop**, held to paddle upward (crawlers) |
> | **LT** (analog) | 6 | **Aim** — the centred crosshair picks the target |
> | **RT** (analog) | 7 | **Heavy / pounce** |
> | D-pad ↑ | 12 | Sense pulse |
> | D-pad ↓ | 13 | Teleport menu (added with the endless sea) |
> | D-pad ←/→ | 14/15 | Menu navigation and creature select |
> | Menu | 9 | Pause |
> | View | 8 | Scoreboard (hold) |
>
> Keyboard layout 1: WASD swim, arrows look, PgUp/PgDn zoom, Shift sprint,
> Space rise, C sink, F bite, G pounce, R ability, V dash, Q guard, Tab aim,
> E sense, T teleport, Z scoreboard, Esc pause. Layout 2 mirrors it on IJKL,
> with H for teleport and comma for the scoreboard.
> The in-game **?** panel and `npm run bindings` are generated from the same
> source, so they never drift from the code.

### Rules that make it dynamic

- **Momentum carries into attacks.** Damage scales with closing speed
  (`× 1 + 0.35 × relativeSpeed / burstSpeed`). A burst-into-heavy is the
  hardest hit in the game and the easiest to dodge.
- **Attacks are directional.** Front-arc hits are normal; hits from behind or
  below deal × 1.4 (Hallucigenia and Wiwaxia invert this: their spines punish
  attacks from above). This rewards orbiting and vertical play.
- **Stamina is shared** between burst, dodge, guard and heavy. Regenerates
  fast when gliding, slowly when bursting, not while guarding. An exhausted
  creature swims at 70% speed and cannot dodge: the moment to go in.
- **Poise.** Each creature has a stagger threshold. Light hits chip poise,
  heavies break it; a staggered creature is a free target for one heavy. Poise
  regenerates in 3 s. Armoured crawlers have high poise, swimmers low.
- **Hit reactions** use the existing `Hit` clip with knockback along the hit
  direction and a 60 ms hit-stop on both actors. Big hits add camera shake and
  a bubble burst. Kills play `Death` and the body sinks slowly with the
  current, edible by anyone.
- **No stat walls.** A Larva cannot kill an Adult, but it can make a Rival
  fight go badly for the Adult by parrying. Every tool works at every tier.

### Fight shapes we are designing for

- **The circle.** Two rivals locked on, orbiting, each looking for the
  moment the other's stamina dips. Feints with light attacks, punish with
  heavies.
- **The pounce.** Burst from above and behind out of a sponge thicket,
  heavy on impact, 40% of a rival's health gone before it turns.
- **The stand.** A Wiwaxia or Olenoides guarding on a ledge, letting a faster
  swimmer waste stamina, then parrying into a shove off the ledge.
- **The bait.** Leading a Threat into a Giant's patrol line and watching it
  become food.
- **The steal.** An Opabinia snatching a snack out from under an Anomalocaris
  mid-fight.

## Creatures: strengths and powers

All eight existing models become playable at every tier. Stats below are for
the Adult tier and are the starting point for tuning; they deliberately spread
creatures across a speed / armour / reach / trick triangle. **The roster is now
21** — the thirteen additions and their kits are in
[03 · Expanded creature roster](03-creature-expansion.md), and the shipped
numbers live in `src/sim/creatures.ts` and `src/sim/expansion.ts`.

| Creature | Archetype | Movement | Light | Heavy (X) | Ability (Y) | Passive | Weakness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Anomalocaris** | Pursuit predator (swimmer) | Fastest sustained cruise, wide turns | Appendage rake, 3-hit | **Grasp**: frontal appendages seize a Rival or smaller; hold 1.5 s, deal crush ticks, then throw. Victim mashes RB to escape sooner. | **Ambush surge**: 2 s of silent burst at × 2.4 that does not drain stamina and does not trigger prey alarm. | Huge eyes: longest sight range, sense pulse reveals farther. | Large silhouette: easily seen; below-average poise for its size. |
| **Opabinia** | Reach specialist (swimmer) | Hovers well, precise, slow top speed | Proboscis jab, long reach | **Snatch**: proboscis shoots 2 body lengths, hooks target, **pulls** it to your mouth (or pulls you to it if heavier). | **Five-eye focus**: 5 s where lock-on shows enemy attack wind-ups as flashes (parry window doubled). | 360° vision: cannot be flanked for the × 1.4 backstab bonus. | Lowest HP among swimmers; heavy is a whiff if it misses. |
| **Waptia** | Skirmisher (swimmer) | Highest burst, tightest turns, worst glide (stops fast) | Rapid pinch, 4-hit chain | **Raptorial strike**: short forward lunge, high damage, resets combo. | **Tail flick**: instant back-dash with full invulnerability that leaves a **silt cloud** (breaks lock-on, blocks sight 4 s). | Eats while moving (snacks consumed at burst speed). | Cannot guard (LB is a second dodge). Lowest poise. |
| **Canadia** | Controller (swimmer) | Undulating; excellent lateral drift, average speed | Bristle brush, hits around the body | **Bristle sweep**: 360° spin, knocks back everything adjacent. | **Bristle flare**: 3 s spines-out; any light attack that hits you is auto-parried. | Passive damage to anything that grasps or bites you (× 0.25 reflected). | Weak single-target damage; slow to kill things. |
| **Hallucigenia** | Fortress (crawler) | Slow walker, hop is short | Spine jab upward | **Spine sweep**: arcs over the back, hits above and behind. | **Anchor**: dig legs in for 4 s; immune to knockback and grasp, guard costs no stamina, counter-heavy on every parry. | Attacks from above deal × 0.6 to you and reflect × 0.5. | Very slow; can be starved by anything that just leaves. |
| **Wiwaxia** | Tank (crawler) | Slowest; hop is a heavy stomp | Blade nudge | **Blade shove**: huge knockback, throws swimmers into rocks (bonus damage on wall hit). | **Shell-up**: 3 s of total guard; you can still crawl slowly. Ends with a burst that staggers adjacent enemies. | Highest HP and poise. **Grazes** microbial mats and algae for nutrition, so it can grow without hunting. | Cannot chase anything. Long recovery on heavy. |
| **Marrella** | Scout (crawler) | Fastest crawler, multi-hop | Limb sweep, quick | **Scuttle rush**: three rapid dashes that each hit. | **Burrow**: dig into sediment in 0.7 s; invisible to all detection, 8 s max, pop out with a free heavy. | Longest sense range (antennae); sense pulse cooldown halved. | Lowest damage; paper-thin outside a burrow. |
| **Olenoides** | Bruiser (crawler) | Steady, good climber | Cephalon bump | **Shield charge**: ramming run that gains damage with distance travelled, stagger on hit. | **Enroll**: curl into a ball for up to 5 s. Invulnerable to everything but Giants; you **roll** with slopes and the current, and hitting a rival while rolling staggers it. | High poise; guard costs 40% less stamina. | Short reach; predictable; bad in open water (falls). |

**AI-only extras built from the same models**, at different scales:

- **Schools / swarms (Snacks):** Waptia at × 0.15 in schools of 20–40;
  Marrella swarms at × 0.15 on the seabed; Canadia "worms" at × 0.2 in
  burrows; Olenoides hatchlings at × 0.12 under rocks. Boid behaviour; scatter
  on alarm; re-form in cover.
- **Ambient adults:** every creature type at × 0.5–1.2 wandering with a simple
  needs AI (hungry → hunt, hurt → hide, threatened → flee). They are the
  rivals when no other player is nearby.
- **Giants:** Anomalocaris at × 3.5 (the classic apex) patrolling the channel;
  Olenoides at × 3 grazing the boulder field like a moving wall; Opabinia at
  × 2.8 in the sponge forest snatching unwary swimmers. Each has a patrol
  route, a detection cone, a chase, and a give-up. They eat ambient life too,
  so the reef visibly reacts to them.
- **The Shadow:** an Anomalocaris at × 6 that crosses the light window near
  the surface once every few minutes. It does not hunt players below a depth;
  it is there to make the surface a dare.

## Hunting: prey behaviour

Prey should be **catchable but never free**.

- Snacks flee at 80% of your cruise speed in a straight line, so you only
  catch them with burst or by cutting corners. Schools split around obstacles.
- Prey (0.45–0.7×) has a **panic meter**: it flees while you are within
  sense range, hides in the nearest cover when panic peaks, and forgets you
  after 6 s out of sight. Hunting it is a game of breaking line of sight and
  approaching from the current's downstream side.
- **Alarm** spreads: a fleeing creature alarms others within 6 units. Burst
  and heavy attacks make noise (alarm radius × 2). Anomalocaris' ambush surge
  and gliding do not.
- **Cover**: sponge thickets, filament tufts, rock overhangs, silt clouds and
  burrows all reduce detection. Smaller creatures fit in more cover. Being
  still (no stick, no burst) halves your detection radius: the *freeze* is a
  legitimate hunting and escaping tactic.
- **Wounded prey** leaves a faint particle trail (blood in the current) that
  Anomalocaris and Marrella can follow.

## The hours

The reef used to hunt around the clock. Every ambient animal counted as hungry
four seconds after its last meal, so anything that could see you was coming for
you — which made the sea exhausting, and, less obviously, dull: when everything
hunts all the time, nothing hunting is information.

The day now turns on an eight-minute cycle (`src/sim/daynight.ts`, a pure
function of simulation time so both split-screen players and the renderer agree
on it):

| Phase | Length | What it is |
| --- | --- | --- |
| **Dawn** | 48 s | Half light. The reef feeds. |
| **Day** | 230 s | Full light, long, and quiet. Most animals have eaten and are getting on with their lives. |
| **Dusk** | 48 s | Half light again, and the busiest hunting of the cycle. |
| **Night** | 154 s | Dark, shorter than the day, colour drained and the far water closed in. Hunting sits between the two extremes. |

The cycle drives one number, **hunting pressure**, which peaks through both
twilight bands (≈1), sits low through the middle of the day (0.12) and rests
above that at night (0.3). Pressure sets how long an animal will go after a meal
before it looks for another: about sixteen seconds at dusk, over two minutes at
noon. It changes how *often* things hunt rather than switching hunting on and
off — a hungry enough animal always eventually goes looking, whatever the hour.

Measured over four full days, the giants — which are what "something is hunting
me" actually means to a player — come down to hunt 1.3% of the time at midday
and 6–8% at dawn and dusk. The ambient roster follows the same curve. Both are
covered by `tools/ecology-test.ts`.

A brain standing in for a player is exempt: versus bots and the balance harness
are competitors in a game, not animals in an ecosystem, and the hour must not
decide how hard a rival plays.

## Temperament

On top of the clock, two dispositions are dealt out at spawn, because a sea
whose only question is *can it eat me* runs out of questions:

- **Grumpy** animals have a personal space and see off anything their own size
  that enters it, hungry or not, dawn or noon — and drop the matter once you
  have backed off. They are the reason you do not swim straight through a crowd.
- **Territorial** animals hold a patch and drive intruders out of it, then go
  home. They never follow past the edge, so they are a *decision* rather than a
  threat: the ground one is sitting on is often worth crossing, and you can
  always choose not to. Held ground is drawn on the radar as a dashed ring, so
  the choice is made before you are in it rather than after.

  "Past the edge" is 1.15 patch radii (`TERRITORY_LEASH` in `src/sim/ai.ts`) — a
  little slack so an intruder hovering on the line does not make the animal
  flicker between charging and turning back. The leash applies to *every* goal
  that chases something, not only to driving an intruder out, and it is a hard
  limit rather than a stamina one: the animal turns for home whatever it has
  left in the tank. Both halves matter. A grumpy exchange with a passing
  neighbour used to escape the leash entirely, and when sprinting got cheaper a
  territory holder simply chased further on the same behaviour — 94 m off a 40 m
  patch. `tools/ecology-test.ts` now holds it to 1.3 radii over twenty seconds.

About a third of grown, armed animals hold a patch; about a fifth of everything
grown is simply grumpy; the rest are indifferent. Grazers and filter feeders
mostly hold nothing, having somewhere to be rather than something to defend.

The one rule none of this softens: **hit something and it fights back**,
whatever the hour and whatever it was doing.

## Escaping: how detection and hiding work

Every AI has a **detection score** for each potential target, updated
continuously:

```
score += (sightFactor × sizeFactor × motionFactor × coverFactor) × dt
sightFactor  : 1 inside vision cone and range, 0.15 outside cone (they "feel" wakes)
sizeFactor   : bigger targets are easier to see (∝ length ratio)
motionFactor : 0.5 still, 1 cruising, 2.5 bursting, 1.5 attacking
coverFactor  : 1 open, 0.3 in cover, 0.05 burrowed, 0 enrolled-in-crevice
score decays at 0.5/s when nothing is contributing
```

- At `score > 1` the predator **notices** (turns, HUD shows an eye icon).
- At `score > 2` it **hunts**: chases at its burst speed, predicts your
  position, follows silt trails.
- If the score decays below 0.5 it **loses you**, searches the last known
  position for ~5 s, then resumes patrol.

Player tools against it: break line of sight with terrain, dive into a sponge
thicket (Giants cannot enter, they circle), hold still, drop silt (Waptia),
burrow (Marrella), enroll in a crevice (Olenoides), shell-up (Wiwaxia,
survives one Giant bite), or bait the Giant into another creature. The
**escape** is complete when the Giant loses you; a "heart rate" audio layer
and vignette fade out to make that moment land.

Giants also have **routines**: they sleep in a lair between patrols, they
feed on ambient adults (which you can watch happen), and they are drawn to
prolonged fights (noise). This means a long rival fight in the open is itself
a risk, which keeps fights short and mobile.

## The world

> **Superseded.** The bounded shelf below was the first implementation. The
> sea is now endless and streamed, anchored to one shoreline, with nine biomes
> banded by distance from it, a teleport menu and a radar: see
> [04 · The endless sea](04-infinite-ocean.md). The table below is kept for the
> biome roles it established.

The single 66-unit arena becomes a **~400 × 400 unit shelf** built by the
same procedural generator with a biome mask, plus a full 40-unit water column.
Everything is still procedural (seeded), so it costs no new art.

| Biome | Where | Character | Role |
| --- | --- | --- | --- |
| **Nursery reef** | Two or three pockets near spawn | Dense Vauxia and Choia sponges, filament tufts, shallow | Spawn and hiding ground. Snack schools. Giants cannot enter. |
| **Open shelf** | Most of the middle | Rippled mud, scattered fragments, microbial mats (Wiwaxia grazing) | Fast travel, exposed. Where rival fights happen. |
| **Boulder field** | One quadrant | The existing boulders at 3× density plus stacked overhangs and crevices | Vertical play for crawlers, ambush spots, Olenoides Giant lair. |
| **Sponge forest** | One quadrant | Tall stalked sponges and thalli, low light | Mid-size cover, Opabinia Giant hunting ground. Line of sight is short. |
| **The channel** | Diagonal cut across the map | Strong current, deep, dark, few features | Anomalocaris Giant patrol lane. Fast highway if you dare. |
| **The light window** | Top 8 units of water | Bright caustics, the existing surface plane | Plankton blooms (Larva snacks). The Shadow. |

- **Chunked streaming**: the heightfield and instanced flora are generated
  per 50-unit chunk within ~120 units of any player. The current build's
  instancing and shaders are reused as-is.
- **Landmarks** (a few hand-placed by seed): a sponge archway, a boulder
  stack you can hop, a dead Giant's bones that are a temporary feast and a
  predator magnet. *(Built, and procedural rather than hand-placed: one candidate
  per 320-unit cell, drawn from the seed and gated on the biome, so they are
  spread out and rare without anybody placing them. All three exist —
  `landmarkAt()` in `src/sim/world.ts` — and the bones really are both a feast
  and a magnet. See* [the endless sea](04-infinite-ocean.md#landmarks).*)*
- **Time and light**: a slow day cycle (20 min) that changes caustic intensity
  and Giant activity (they hunt more at dusk). Optional; ships after core.
  *(Built, at eight minutes rather than twenty, and it turned out to be the
  spine of the ecology rather than a lighting effect — see* **The hours**
  *below.)*

## Modes

All modes share the same world and rules; they differ in win condition and
population.

| Mode | Players | Description |
| --- | --- | --- |
| **Rise** (single / co-op) | 1–4 | The main experience. Everyone hatches as a Larva in the nursery. Reach Apex. Co-op shares nutrition from assisted kills, players can revive a downed ally by bumping them within 10 s. Players *can* turn on each other — bites land, and a dead player can be fed on — but nothing aims at another player for you: no aim snap, no auto-pounce, no auto-lock. Area abilities still spare a co-op partner, so nobody kills a friend by accident. Session ends when any player reaches Apex and survives 90 s, or continues in free-play. Escalation: the reef's giant population grows as players grow. |
| **Feeding frenzy** (versus) | 2–4 | Growth race. Everyone starts Juvenile in separate nurseries. First to Apex wins; killing a player takes a third of their tier progress and gives it to you. Bots fill empty slots. 12-minute cap, biggest wins. |
| **Hunter & hunted** (versus, asymmetric) | 2–4 | One player is a Giant (× 3) with a shrinking hunger meter; the others are Juveniles who must survive and reach Adult. Giant eats to stay alive; small ones hide, bait, and grow. Rotates who is the Giant. *(As built: one **turn** each, 100 s, and your score is what you caught on your own turn — the same job for everyone, so the winner is the best hunter and prey play is how you keep the others' scores down. A turn ends early if every small one reaches Adult. One human plays it as a single turn, exactly as before.)* |
| **Reef** (sandbox) | 1–4 | No win condition, pick any tier, tune giant density. For messing around and screenshots. |

Bots (the current "nearest enemy" bots become the needs-based AI above) fill
every mode, so nothing requires a second controller.

> **As built.** All four modes ship (`updateModes()` in `src/sim/game.ts`), with
> everything this table asks of them: co-op's shared nutrition and its **revive**
> (a downed ally stays down for ten seconds when a team-mate was near enough to
> matter, and holding station over them brings them back with their tier
> intact), **spectating** for a dead player in versus, and **rotation** in
> Hunter & Hunted — see below.

## Local multiplayer specifics

- 1 player: full screen. 2: vertical split. 3–4: quadrants (the current
  viewport code, kept).
- **Drop-in**: press A on a new controller in any mode; you hatch in the
  nearest nursery at Larva (Rise) or at the lowest current player tier
  (versus).
- **Shared world simulation**, per-player cameras and HUD. Split-screen
  budget: creature LOD switches per viewport; giants use the high LOD only in
  the viewport they are close to.
- **Readability at quarter size**: every band colour (Snack green, Prey teal,
  Rival amber, Threat orange, Giant red) is also encoded as an outline width
  and a HUD marker shape, so it reads at 480 px wide.
- **Spectating**: a dead player in versus gets a free camera following the
  leader until respawn. *(Built. Versus only: in co-op the camera stays on your
  own body, because a team-mate may be on the way to it.)*

## Readability, HUD and feedback

- Diegetic where possible: your own **size** is read from the camera distance
  (pulls back as you grow) and the scale of the sponges around you.
- HUD per viewport: health bar, stamina bar, nutrition ring around a tier
  glyph, ability cooldown, lock-on reticle with target band colour, an eye
  icon that fills as a predator's detection score rises, and off-screen
  arrows for Giants. *(All shipped, plus a radar and a biome banner that came
  with [the endless sea](04-infinite-ocean.md).)*
- Sound is a gameplay system: burst has a swoosh others hear; Giant proximity
  brings a low drone and heartbeat; escape resolves with silence and a
  single chime; tier-up thumps.
- Camera: follow cam with lag, pulls in during lock-on to frame both
  creatures, shakes on heavy hits, pushes close and low when a Giant is
  hunting you.

## Onboarding

The first two minutes of Rise teach everything through play, no text walls:

1. Hatch in the nursery among a plankton bloom: push the stick, eat by
   swimming through (movement, eat).
2. A Waptia school flees: hold RT to catch one (burst, stamina).
3. A juvenile Marrella (Prey) hides in a tuft: sense pulse finds it, bite it
   (RB, sense).
4. A rival larva appears: prompts for guard and dodge appear the first time
   it winds up. Win, eat it, **tier up**.
5. The nursery darkens: a Giant passes. Prompt: "Stay still." It leaves.

After that, one short contextual prompt per new tool, once, then never again.

## Success criteria for the design

We consider the redesign working when playtests show:

- A new player, without reading anything, is hunting with burst and eating
  within 60 seconds.
- Players describe rival fights in terms of *spacing and timing* ("I baited
  the heavy and parried") rather than button presses.
- At least one moment per session of a player audibly reacting to a Giant.
- Players choose different creatures for reasons they can articulate.
- Four-player split-screen holds 60 fps on a mid-range GPU laptop at `low`
  quality and 30 fps minimum at `high`.

## Magnification

The same reef has to feel right whether you are a 0.7-unit larva or a 10-unit
apex. We treat body length as a **magnification level** and let the camera,
the fog and the detail layers follow it. Everything below is driven by one
number, the viewing player's body length `L`, and is applied per viewport in
split-screen so two players at different tiers see different reefs at once.

| Level | Body length | Camera | What the reef reads as | Detail layers |
| --- | --- | --- | --- | --- |
| **Micro** | < 1.0 | ~3.3–3.6 units back, FOV 64 | Sponges are a forest; tufts are undergrowth; a boulder is a cliff; ambient adults are monsters. Fog is at its densest, so the world feels enormous and close. | Micro-tufts (filament grass) and pebble fragments on. |
| **Small** | 1.0–2.0 | ~4–6 units back, FOV ~62 | Sponges are trees you can still hide in. Adults become rivals. | Micro-tufts fade out above 2.2. |
| **Mid** | 2.0–4.5 | ~6–11 units back, FOV ~59 | The current stat-table scale. Sponge thickets are hedges: cover for the small, obstacles for you. Boulders are boulders. | Pebbles off above 4.5. Particle motes scale up. |
| **Large** | 4.5–8 | ~11–18 units back, FOV ~57 | Sponges are shrubs, tufts are grass, the nursery is a lawn you cannot enter. Fog thins to half density: you see the channel from the shelf. | Only structural flora and boulders are drawn as geometry. |
| **Colossal** | > 8 | ~18–24 units back, FOV 55 | Everything below is texture. You are the shadow on the light window for smaller players. | Same as Large. |

Rules that fall out of this:

- **Camera distance** is `2 × L + 2` units with a small floor for larvae, so
  the creature always occupies roughly the same fraction of the frame.
  Lock-on and being hunted pull the camera closer; death pulls it back.
- **Fog density** scales with `2.2 / (L + 1.5)`, clamped between half and
  1.15× the base. A larva's world ends 60 units away; an apex sees ~120.
- **Distance haze**: fog alone leaves a far-off giant reading as a solid dark
  silhouette, because a big body stays large on screen long after everything
  else has been culled. Each body is additionally mixed toward the water colour
  by `distanceHaze(d, camera.far)` — nothing inside about an eighth of the view
  distance, ramping to 0.9 by about two-thirds of it — so something across the
  reef is pale background ambience and only resolves into a dark, obviously
  present animal as it closes. It is applied per viewport, after fog, in the
  fragment shader, so split-screen players each get their own distance and the
  wash matches whatever water they are looking through. Anything **hunting
  you** keeps most of its presence (`HUNTER_HAZE`) at any range: the warning
  has to read.
- **Detail layers are per-viewport toggles**, not per-object LOD, so they
  cost nothing to switch and never desynchronise between players. They are
  purely visual: cover volumes and collision come from the simulation, which
  does not know about magnification.
- **Creatures do not get a magnification treatment**: the same models render
  at every tier. That is the point; the Marrella that terrified you as a
  larva is the same mesh you swallow as an adult. Only their animation
  frequency scales (smaller beats faster).
- **Small creatures beyond fog range are culled**, and swarm members far
  from every camera skip animation, which keeps four viewports at different
  magnifications inside budget.


## Expanded roster update

The game now includes 21 selectable mobile species. The original eight retain
their kits, while [the 13 additions](03-creature-expansion.md) extend movement,
feeding and combat: axial undulation, bell pulsation, comb-row propulsion,
burrowing, low-foot grazing, shell crushing, basket capture and suspension
feeding. This collection spans Cambrian deposits; selection labels provenance.
The expanded design supersedes earlier eight-creature counts and a strictly
single-locality interpretation. Filter-feeding and grazing are playable growth
routes, including after adulthood. Every animal remains actively controllable.
