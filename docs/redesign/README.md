# Cambrian redesign

A plan to turn the current arena demo into a hunt / grow / fight / escape game
set in a Burgess Shale sea, reusing all existing creature models, animations
and the procedural environment.

| Doc | Contents |
| --- | --- |
| [00 · Current state](00-current-state.md) | **Historical.** The pre-redesign arena demo audited from its shipped bundle: what the assets could do and what was wrong with the gameplay. Kept because the redesign is grounded in it. |
| [01 · Game design](01-game-design.md) | Pitch, pillars, core loop, the size rule, growth, movement, combat verbs, every creature's powers, hunting, hiding from giants, world, modes, local multiplayer, HUD, onboarding. |
| [02 · Technical plan](02-technical-plan.md) | Architecture, simulation and combat data model, AI tiers, world streaming, rendering and LOD, input bindings, animation strategy without new art, milestones, testing, risks. |
| [03 · Expanded creature roster](03-creature-expansion.md) | The 13 additions: feeding routes, abilities, anatomy, animation contract and references. |
| [04 · The endless sea](04-infinite-ocean.md) | The shoreline, nine biomes banded by distance from it with danger levels and moods, chunk streaming, the teleport menu and the radar. Supersedes the bounded shelf in 01. |
| [05 · Hiding and native combat](05-hiding-and-combat.md) | Current heavy/block mapping, Y burrowing and camouflage, energy costs, idle sinking and verification. |
| [06 · Era content boundary](06-era-content.md) | Implemented configuration boundary for future content packs; Cambrian remains the only available era. |
| [07 · Devonian natural-history and asset brief](07-devonian-design.md) | Natural-history descriptions for 21 creatures; regional environments, plants, props, and a quantified image/3D asset inventory. No gameplay specification. |
| [08 · Devonian Domination](08-devonian-domination.md) | Game design for the Devonian era: rungs of a food chain instead of growth, standing and range as progress, armour, air, anoxia, shells, moulting, shoaling, a climbable shore, the biome set, modes and an implementation order. Proposal, not built. |

Start with the design doc if you want the game; start with the technical plan
if you want to build it. The audit is the shared set of facts both rely on, and
records the pre-redesign build rather than the game as it stands.

## Implementation status

The game is built and playable; the source is in `src/` (see the repository README
for layout). Against the milestones in the technical plan, **M0–M7 are complete**
and **M8 (polish) is complete except for two music files**:

| Area | Status |
| --- | --- |
| Movement, combat, growth, eating, death and respawn | Shipped. `src/sim/` is renderer-free and covered by the headless tests listed in the repository README. |
| Ecosystem, detection, giants, the Shadow | Shipped: swarms, needs brains, cover, alarm, patrol/notice/hunt/lose, giant lairs that follow the party. |
| Abilities and identity | Shipped for all 21 creatures. Offensive signatures use heavy, defensive signatures use block/evade, and Y now hides: free burrowing or stamina-powered camouflage with idle sinking. See [05](05-hiding-and-combat.md). |
| All four modes, split-screen, drop-in | Shipped. |
| The endless sea | Shipped, and it replaced the bounded shelf the design doc originally described — see [04 · The endless sea](04-infinite-ocean.md). |
| Art | Shipped and integrated: brand, key art, tier and band glyphs, mode panels, loading motif, 21 transparent portraits, nine biome paintings, five radar glyphs, seven biome props. Briefs and paths in [`docs/image-requests-history.md`](../image-requests-history.md). |
| Audio | Sound library, distance falloff, tension layer and soundtrack director shipped. **Outstanding:** `theme-calm.mp3` and `theme-danger.mp3` — the biome tags are already live in `music.ts`, the files are not there. See [`docs/audio-requests.md`](../audio-requests.md). |
| Onboarding, rumble, quality tiers, viewer | Shipped (`hintFor()` in `src/sim/game.ts`, `rumble()` wired to hits, deaths, parries, grabs, tier-ups). |
| Landmarks, co-op revive, spectating, the discovery record | Shipped; see below. |
| The View scoreboard, and turns in Hunter & Hunted | Shipped; see below. |

Designed but **not built** (nothing depends on them; listed so they are not
mistaken for shipped):

- A day/night cycle. `01-game-design.md` marks it optional, after core.
- Swarm impostor billboards, from the technical plan's rendering section.
  Superseded: swarm members use the shared `*.lod1.glb` path instead, which met
  the performance targets.

### The scoreboard, and taking turns as the giant

- **View holds the scoreboard open** (`Z`, or comma on the second keyboard),
  per viewport, so each player can check without stopping. Everyone in the
  running is on it — the bots filling the empty seats included — sorted by
  whatever the mode is actually about: catch in Hunter & Hunted, size everywhere
  else. Each row carries rank, a progress bar, kills and meals, and either the
  viewer's own biome or the distance to that contender. The header is the mode
  stating its own terms, with a clock where one applies. An era that ranks its
  animals by something of its own fills in the rank through the optional
  `EraRules.scoreLine` — the Devonian shows stage and rung against standing.
- **Hunter & Hunted takes turns.** Every human gets one 100-second stint as the
  giant, and is scored on the same job: how many of the small ones they caught
  while they had the body. Most caught wins; a turn ends early if every small
  one grows to Adult, which is how prey play keeps a rival's score down. Between
  turns there is a short pause — nobody is the giant, everyone is invulnerable,
  and the hand-over is announced in every viewport — then bodies and positions
  are re-seated for the next one. A single human still plays it as one turn, so
  the mode is unchanged for them. Both era packs write the rule as "index 0 is
  the giant"; `Game.eraRoleIndex` presents whoever's turn it is as index 0, so
  neither pack has to know the role moves.

### Landmarks, spectating, revive and the record
### Landmarks, spectating, revive and the record

Four things the design called for and the first pass skipped are now in
(`tools/world-test.ts` covers all four):

- **Seeded landmarks.** `landmarkAt()` in `src/sim/world.ts` places one candidate
  per 320-unit cell, purely from the seed, and the chunk containing it builds it:
  an **arch** you swim under, a **stack** of boulders a crawler can climb, and a
  dead giant's **bones**. Which kind depends on the biome, and roughly half the
  cells draw a blank, so a landmark stays rare enough to navigate by. They clear
  their own ground of scatter, appear on the radar, and survive into the far
  view. The arch and the ribcage use `Boulder.floor`, a collision floor that lets
  a creature pass under a raised span while a crawler can still climb over it.
- **The bones are a feast and a magnet.** `Game.feedOnBones` feeds anything
  that reaches the body at a rate scaled to the eater, depleting a pool that
  restocks over about three and a half minutes; a hungry giant on patrol breaks
  off and comes to it (`nearestBones` in `src/sim/ai.ts`). Standing on the best
  food in the deep is therefore also standing where the giant is headed.
- **Co-op revive.** A downed player in Rise stays down for ten seconds instead of
  dissolving after three — but only when a team-mate was within 90 units when
  they fell, so a partner across an endless sea does not leave them waiting for
  somebody who was never coming. The body settles where it fell rather than
  drifting up like a corpse, and a team-mate who reaches it brings them back with
  their tier intact. The rescuer sees an arrow and a countdown; the downed player
  sees **DOWN** instead of **EATEN**.
- **Spectating.** A dead player in a versus mode watches the leader — whoever is
  furthest along — rather than their own sinking body, with a `SPECTATING` label
  naming them. Co-op deliberately does not: there you stay on your own body,
  because somebody may be swimming toward it.
- **The record.** `Game.discovery` notes the biomes the players swam through, the
  landmarks they found and the species they took to Apex. The results screen
  folds that into a per-era localStorage record (`src/app/codex.ts`) and shows
  the whole set — found in full, unfound as silhouettes — with this match's finds
  tagged NEW. The nine biome paintings, delivered long ago for exactly this page,
  are finally what it is made of.

## Superseded sections

Two parts of these documents describe an earlier shape of the game and are
marked in place rather than deleted, because the reasoning behind them still
holds:

- The bounded ~400 × 400 shelf in [01 · The world](01-game-design.md#the-world).
  Replaced by [04 · The endless sea](04-infinite-ocean.md); the biome roles it
  established survived.
- The controller layout in the design and technical plans. The shipped bindings
  are different — see the note in each doc, and `readGamepad()` in
  `src/input/input.ts`, which is the authority.
