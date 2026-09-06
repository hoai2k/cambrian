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

Designed but **not built** (nothing depends on them; listed so they are not
mistaken for shipped):

- A day/night cycle. `01-game-design.md` marks it optional, after core.
- Hand-placed seeded landmarks — the sponge archway, the hoppable boulder stack,
  the dead giant's carcass. The streamed world places scenery procedurally only.
- Spectating: a dead player in versus gets no free camera.
- Co-op revive by bumping a downed ally within 10 s. Co-op *does* share
  nutrition from nearby kills.
- The **View** button's scoreboard / map. The button is read (`view` in
  `src/input/input.ts`) and nothing consumes it.
- Rotating who plays the giant in Hunter & Hunted — player 1 holds the role for
  the match.
- The "biomes discovered" results page. Its nine paintings are already delivered
  and are used behind the biome banner.
- Swarm impostor billboards, from the technical plan's rendering section.
  Superseded: swarm members use the shared `*.lod1.glb` path instead, which met
  the performance targets.

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
