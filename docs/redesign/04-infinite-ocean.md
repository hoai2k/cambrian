# 04 · The endless sea: shore, biomes, streaming, teleport, radar

The 190-unit arena is gone. The sea is now a half-plane: one **shoreline** runs
along the x axis where players hatch, and everything else is generated on
demand from the seed as you swim. Along the shore the world stays gentle;
**away** from the shore it changes, band by band, into the deep. This document
is the design and the technical contract for that world, the biome set, and
the two tools that make an endless sea playable with friends: the **teleport
menu** and the **radar**.

Implementation: `src/sim/world.ts` (fields, biomes, chunks, streaming),
`src/render/sea.ts` (chunk views, biome atmosphere), `src/sim/game.ts`
(anchors, population, giants, teleport, radar), `src/app/Hud.tsx` (radar,
teleport menu, biome banner), `src/audio/audio.ts` (music moods).
Tests: `tools/world-test.ts`, `tools/biome-tour.mjs`.

## The shore

- The waterline is `z = shoreZ(x)`: about `z = 88` at the origin, wandering by
  ±40 units so it reads as a coast rather than a ruler. Distance into the sea
  is `s = shoreZ(x) − z`; the sea lies toward **−z**. Players hatch facing out
  to sea.
- The seabed climbs to the surface over the last 48 units and keeps climbing
  on land, so the beach is visible from the water. At `s ≈ 5` the water is too
  shallow to swim: `resolveStatic` treats it as a wall (scaled by body radius,
  so a giant cannot beach itself either). Nothing spawns or wanders within 20
  units of it.
- **Nurseries** are a row of sheltered sponge pockets `NURSERY_OFF = 88` units
  off the shore, every `NURSERY_SPACING = 260` units along it, jittered.
  Nursery 0 is at the origin: everybody's first spawn. Each nursery has a
  clearing at its heart (nothing grows within ~8 units of the centre) so a
  hatchling is never wedged in the sponges, ringed by the dense growth that is
  the cover.
- Respawns go to the nursery **nearest another living player** (so a party
  stays together), or the nearest to where you died when you are alone; a
  nursery with a giant loitering in it is skipped. Your home for the teleport
  menu is the nursery you last hatched in.

## Biomes

Nine biomes. Which ones you can meet depends on how far from the shore you
are; which one you are in inside a band is an along-shore mosaic of
low-frequency noise. All boundaries are soft: `biomeWeights(x, z)` returns a
membership for every biome summing to one, and flora density, fog colour,
light and music blend by those weights, so you morph from one biome into the
next rather than crossing a line. `biomeAt` is just the argmax, used for the
HUD banner and a few AI checks.

| # | Biome | Where (distance `s` from shore) | Seabed | Character | Role | Danger |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Sunlit Shallows** | 0–130 | +8 rising to the beach | Bright turquoise water, pale sand, meadows of tufts and a few thalli, plankton blooms low in the water column | The gentle strip along the shore. Filter feeders, snack schools, safe travel along the coast. | 0.08 |
| 2 | **Nursery Reef** | pockets at ~90, every 260 along the shore | +4 | Dense Vauxia and Choia sponges, filament undergrowth, a clearing at the heart | Spawn and hiding ground. Giants cannot enter. | 0.04 |
| 3 | **Open Shelf** | 130–660 (default) | ≈0, rippled | The standard reef look: scattered sponges, mud ripples, pebbles | Fast travel, exposed. Rival fights. | 0.40 |
| 4 | **Sponge Forest** | patches in 130–660; sparse deep "sponge gardens" beyond 800 | ≈0 | Tall stalked sponges and thalli at 1.6× scale, low light, short lines of sight | Mid-size cover. Opabinia's hunting ground. | 0.50 |
| 5 | **Boulder Field** | patches in 130–660, denser toward the escarpment; mounds in the basin | +1.6, rough | Rocks at ten times the base density, crevices, overhangs | Vertical play for crawlers, ambush spots. Olenoides' lair. | 0.50 |
| 6 | **Microbial Flats** | patches in 130–450 | very flat, +0.2 | Green-grey mats, almost no plants | Grazing (Wiwaxia, Odontogriphus). Nowhere to hide. | 0.32 |
| 7 | **The Channels** | winding cuts from 200 outward, draining away from the shore | −7 | Strong current flowing seaward, dark teal water, bare floor | Highways out to sea. Anomalocaris patrols them. | 0.72 |
| 8 | **The Escarpment** | a ragged band at 650–800 | drops 13 units | The shelf edge: a cliff running the length of the coast, talus boulders at its foot, near-dark water | The threshold. Landmark you navigate by; the giants' front door. | 0.80 |
| 9 | **Deep Basin** | beyond 800, deepening to −20 by 1700 | −13 to −20 | Navy-black water, thin fog that hides everything past 60 units, sparse rocks, deep sponge gardens | Where the giants live. Big nutrition, short lives. | 0.92 |

The channels also carry the current: `sampleCurrent` follows the channel
contour seaward at 2.4 units/s in mid-channel on top of the gentle
along-shore drift everywhere.

### Danger, mood and the art brief

`BIOME_DANGER` (the last column) is a single 0–1 number per biome. It drives
two things:

1. **Music.** The soundtrack (`src/audio/music.ts`) tags tracks with the
   biomes they were written for; entering a tagged biome cues one of its
   tracks (held for 90 s so jagged edges cannot flip the score). The danger
   scale is how tracks get tagged: `theme-calm` for the relaxing end
   (Shallows, Nursery), `theme-danger` for the extreme end (Channels,
   Escarpment, Basin), and the untagged reef tracks rotate everywhere else.
   Both tags are live in `MUSIC`, but the two theme files themselves are still
   outstanding ([audio-requests.md](../audio-requests.md)); a track whose file
   is missing drops out of the rotation, so until they arrive the reef rotation
   plays throughout. Tension (being hunted) still ducks whatever is playing and
   brings in the drone and heartbeat.
2. **Look.** The calm end and the deadly end get a visual language of their
   own; everything in the middle keeps the standard reef look as it is
   (it looks right and it is not to be touched):
   - **Relaxing (danger < 0.2: Shallows, Nursery)** — smaller, rounder forms.
     Bulbous sponges, soft tufts, pebbles, gentle pastel sand, bright
     turquoise fog, high sun. Nothing tall or pointed.
   - **Standard (0.2–0.7: Shelf, Forest, Boulders, Flats)** — the existing
     reef, unchanged. No restrictions.
   - **Extreme (danger > 0.7: Channels, Escarpment, Basin)** — larger, angular
     forms. Blade-like rock spires, jagged talus, tall spiny sponges, dark
     desaturated colours with cold blue-black fog, low sun. Anything that
     reads as "teeth".

   Both ends now have their own models, delivered 2026-09-06 and documented in
   [environment assets](../environment-assets.md): cushion sponges, lettuce
   tufts and pebble clusters for the calm end; blade spires, talus shards,
   spine sponges and glass fans for the deadly one. `generateChunk` swaps the
   standard reef plants for them by biome (`cushion`, `lettuce`, `spine` and
   `glass` are `FloraKind`s; `blade-spire` and `talus-shard` are boulder
   variants), each with its own entry in `FLORA_PHYS` so it collides and bends
   like the plant it is. The renderer loads each GLB once per sea, lazily, and
   instances it in place of the fallback geometry, so a missing or slow model
   costs nothing. On top of the models the biomes still differ by plant and
   rock density, terrain, and atmosphere (fog colour, density, sky and sun
   intensity blend per biome in `render/sea.ts`).

## Streaming

- **Chunks** are 64 units square (`CHUNK`), the same cells the renderer
  already used for culling. `generateChunk(seed, cx, cz)` is a pure function
  of the seed and the chunk coordinates (its RNG is `chunkSeed(seed, cx, cz)`),
  so a chunk is identical whatever order it is loaded in and both split-screen
  players agree on it. A chunk carries boulders, flora, cover volumes and
  blooms; flora are placed per 12.8-unit cell from the density table blended
  by the biome weights.
- The sim keeps chunks loaded within `SIM_RADIUS = 192` units of every
  **anchor** (players and bots), loading the nearest two per step and dropping
  chunks nobody is within `SIM_RADIUS + 1.5 × CHUNK` of. On any change the
  flat arrays and the three spatial hashes are rebuilt, so the rest of the sim
  never sees chunks at all (`World.rebuild`). Match start, respawn and
  teleport call `loadAround` so the ground is there before anyone stands on
  it. Tests can `freeze` the world.
- **Nothing is ever a hole.** A chunk with no view yet would draw no seabed at
  all, so the cheap coarse tile is always laid down first, nearest camera
  first, and only then upgraded to full detail. `prime()` builds that coarse
  ring synchronously at match start, when the attract scene begins and on
  arrival from a teleport, so the first frame of a new view is solid ground.
- The renderer builds a **full view** (seabed tile with per-vertex biome
  colour and apron-correct normals, rocks, every plant, undergrowth, blooms)
  for each sim chunk and a **far view** (coarse tile, big rocks only) for the
  ring out to `FAR_RADIUS = 340` around every camera, which is past the fog
  limit at any magnification. Builds run nearest-first inside a 6 ms time
  budget per frame. Each instanced mesh keeps the range and magnification
  cut-offs the culling relied on before.
- **Population** is local to the anchors: each player keeps a dozen-plus
  ambient adults within 170 units and fourteen-plus things smaller than
  itself within reach; wild creatures more than ~250–290 units from every
  anchor are dropped. The three giants and the shadow move with the players:
  one left more than 420 units behind (300 for the shadow) while not hunting
  is given a new lair 130–210 units from a player, in the biome it belongs to
  (Anomalocaris in channels, escarpment and basin; Olenoides in boulders;
  Opabinia in the forest), never in a nursery.
- **Precision.** Positions are doubles in the sim; the renderer's floats are
  good to a centimetre out to about 50 000 units from the origin, which is a
  couple of hours of sprinting in a straight line. A floating origin is the
  obvious next step if that ever matters; nothing else assumes a bound.

## Teleport (D-pad down)

The sea is endless, so a party needs a way to regroup.

- **D-pad down** (`T` on the keyboard, `H` for the second keyboard) opens a
  menu in that player's viewport: **Your nursery**, then every other player
  with creature, tier and distance. The same button steps down the list, the
  D-pad or stick moves, **A** goes, **B** backs out. The creature drifts while
  the menu is up; the other players are unaffected.
- Arriving beside a player puts you two body lengths behind them, facing
  their way; home puts you in your nursery's clearing facing out to sea.
  Arrival comes with sparkles at both ends, a camera snap behind the creature
  with a fade, 2.5 s of spawn protection, and a 20 s cooldown. Not while
  dead, swallowed, grabbed or mid-move.

## Radar

A small circle at the bottom right of each viewport. Up is the way the camera
looks. Its reach is `55 + 12 × body length` units, so it grows with you.

- **Other players** always, in their player colour, wherever they are.
- **Threats and giants**: anything in the `threat` or `giant` band relative to
  you within about twice the radar's reach, as diamonds (bigger for giants).
  Prey and rivals are deliberately not shown: there are far too many.
- **Whatever is hunting you**, whatever its size, blinking.
- **Home** (your nursery) as a small house, and the **shore** as an arc of
  sand on the rim in its direction.

Contacts beyond the radar's reach sit hollow on the rim, pointing the way.
The biome's name is announced in a banner for three seconds when it changes.

## Tests

- `tools/world-test.ts`: the shore is a wall and swimmable beyond; all nine
  biomes occur with the bands in the right places; chunks are deterministic;
  a player sprinting out to sea for 90 s has chunks, ecosystem and giants
  around it and nothing stale behind; teleport home / to a player /
  cooldown / not while dead; radar contents; respawn near another player.
- `tools/biome-tour.mjs`: drives the built game through every band in a
  headless browser, screenshots each, reports streaming and render counters,
  then a two-player high-detail run with the players far apart.
