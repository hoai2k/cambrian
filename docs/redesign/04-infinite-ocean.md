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
- A nursery is safe because **nothing in one starts anything**, not because
  only small animals fit in it: `peaceful()` in `src/sim/ai.ts` drops any prey
  or rival standing inside the ring from an animal's reckoning, and drops what
  an animal inside the ring will pick a fight over — but it never touches the
  fight-or-flight answer, so anything bitten there still turns or runs. Full
  adults pass through the pockets, and that is deliberate: the first minute of
  a match should have something enormous in it.
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

## Landmarks

Procedural scenery is even everywhere, which is exactly what makes an endless sea
hard to navigate and hard to remember. Landmarks are the exception: structures big
enough to see across open water, rare enough to mean something, and placed by the
seed like everything else.

- **One candidate per `LANDMARK_CELL` (320 units, five chunks).** `landmarkAt(seed,
  lx, lz)` is pure — same seed, same cell, same landmark, whatever order chunks
  load in — and about 45% of cells come back empty. The chunk containing the
  candidate builds it, so exactly one chunk owns each landmark and no neighbour
  duplicates it. They are built *after* `applyBiomeProps`, which restyles loose
  rocks into spires and talus by position: a structure that has been deliberately
  shaped must not be taken apart by that pass.
- **Nothing within 70 units of the shore or inside a nursery**, and the landmark
  clears its own footprint of boulders and plants, so it stands in the open
  instead of being swallowed by a sponge forest.

| Kind | Where | What it is |
| --- | --- | --- |
| **Arch** | Shelf, forest, shallows | Two piers and a span, about 14 units tall. You swim under it; a crawler can climb over it. Shelter under the span. |
| **Stack** | Boulders, escarpment, flats | Five to seven boulders piled into a tapering tower. Steps for a crawler, a perch, crevices at the foot. |
| **Bones** | Basin and channels (30% of their landmarks), rarer elsewhere | A dead giant: a spine of vertebrae ~24 units long with ribs arching clear of the floor. The best cover in the deep, and the most dangerous place to use it. |

Raised pieces — an arch's lintel, a skeleton's ribs — set `Boulder.floor`, a
collision floor below which they do not block. Without it a span at height would
wall off the water underneath it, and an arch with no hole in it is a rock.

### A giant's bones

The one landmark that is also a system. `Game.feedOnBones` feeds anything that
reaches the body, at a rate scaled by the eater's own mass so it is a real meal at
every tier rather than a banquet for a larva and a trickle for a giant. Each set
has a pool that depletes as it is stripped and restocks over about three and a
half minutes, so a picked-over one is worth coming back to rather than dead for
good. (This is the standing skeleton the world places; unrelated to
`render/carcass.ts`, which cuts an eaten body out of a creature's own model.)

It is also a magnet. A hungry giant on patrol breaks off its route for one
within 260 units (`nearestBones` in `src/sim/ai.ts`) and settles there. So the
richest food in the deep is also where the giant is going, which is the whole
point: the reward and the reason to be careful are the same object.

Landmarks show on the radar as hollow diamonds within reach, and a player who
swims up to one has it recorded in `Game.discovery` for the results screen.

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
- **Ambient ages** are the sea's own, not the player's: 55% of what spawns is
  young (scale 0.28–0.7), a third half grown (0.7–1.3) and one in eight a full
  adult (up to 2.4), rarer the larger it is. It used to be rolled against the
  biggest player's tier, so a small animal met nothing bigger than itself,
  which is a mirror rather than a sea (`spawnAmbient` in `src/sim/game.ts`).
  Depth follows length: `columnY` in `src/sim/locomotion.ts` raises the floor of
  a swimmer's range with its size, so small animals of every age use the whole
  column including the sand and the big ones keep to the higher water — about
  one wander in six (`DIP_CHANCE`) brings one down over the bottom. Crawlers are
  on the floor whatever their size, and the Devonian's `wanderY` carries the same
  bias with its own benthic exceptions.
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

## Changing creature

The last entry on the teleport menu is not a destination: it opens the roster.
Left and right cycle through every playable creature starting on the one you
are, **Y** flips whether an animal you have never worn would arrive fully grown
or as a hatchling, **A** takes it and **B** backs out.

The point is that a body you put down is not thrown away. `Game.changeCreature`
writes the animal you are leaving into a per-player table at the size and the
ladder mark it had, and hands the one you pick up back exactly as you left it —
or hatches it fresh if it is new to you. So the toggle only decides how a
*stranger* arrives; a creature of your own comes back at its own progress
whichever way it is set, and the menu says which of the two you are looking at.
One session can therefore raise several animals rather than one.

Nothing else changes: the sea, the hour, the mode's clock and everything anyone
else has grown carry straight on, and the swap costs the same 20 s cooldown as a
teleport, from the same menu. It is refused while dead, mid-move, or grabbed.

That last part is why the swap is done **in place on the actor** rather than by
restarting anything. On a sofa with four people on it, one of them going off to
raise something new must not cost the other three their afternoon: the body is
edited, its player index keeps its own wardrobe of put-down creatures, and no
other actor, table or timer is touched. `npm run swap` asserts it — a second
player's species, size, mark, position, health and state all come through a
neighbour's swap untouched, and the two players' wardrobes stay separate, so
taking up the body somebody else grew still starts you at the bottom of it.

The era resyncs whatever it keeps outside the actor through the `onSwap` hook —
the Devonian stores the life stage in a side table rather than deriving it, so
without that the new animal would wear the old one's stage. `npm run swap`
covers the keeping and the refusals; `npm run devonian` covers the resync.

## Radar

A small circle at the top right of each viewport (the bottom right carries the
chips and the tally). Up is the way the camera looks. Its reach is
`24 + 11 × body length` units (`radarRange` in `src/sim/game.ts`), so it grows
with you: about 30 m for a hatchling and 200 m for the largest Devonian prime.
Size is the proxy for range — a small animal lives inside a few plants and a
giant crosses biomes, so a fixed sweep would be a map for one and a blur for
the other.

- **Other players** always, in their player colour, wherever they are.
- **The nearest predator**: the closest body in the `threat` or `giant` band
  relative to you, *inside the reach*, as a diamond (bigger for giants). One,
  not all of them. Same-size rivals, prey and snacks are never contacts.
- **Whatever is hunting you**, whatever its size, blinking — inside the reach.
  This is the only thing that puts a second creature on the dial.
- **Food**: the nearest shoal worth eating, as a disc the size of the school
  rather than a dot per body. Wild snack and prey band creatures only:
  another player is never marked as a meal.
- **Height**, because the dial is read from overhead and a shoal thirty metres
  up would otherwise sit on the same spot as one on the sand — swim to the
  mark and there is nothing there. Every creature contact carries `dy`; one
  more than a body or two above or below you gets a chevron, and a shoal
  overhead is drawn in its own colour (`FOOD_ABOVE`) rather than the snack
  green of one on the floor. Reach is a sphere for the same reason: food far
  above a body on the seabed is not food within reach of it.
- **Home** (your nursery) as a small house, and the **shore** as an arc of
  sand on the rim in its direction.

One predator and one meal is a decision; twenty of each is wallpaper. Listing
every animal in reach made the dial useless exactly where it mattered most —
at hatchling size almost everything alive outranks you, so the radar read as a
solid ring of threats.

Only the other players and the two bearings carry off the edge: they sit hollow
on the rim pointing the way. A creature outside the reach is simply not on the
dial — the radar tells you what is around you, not what exists.
The biome's name is announced in a banner for three seconds when it changes.

## Rocks, plants and the shapes they block

Everything on the seabed collides as the shape it is drawn with, and the shape
comes off the mesh: `npm run shapes` measures every instanced prop and writes
`src/content/prop-shapes.json`, which is what `src/sim` reads (it is
deterministic and never loads a GLB). A **footprint**
(`src/sim/footprint.ts`) is sixteen radii around the compass, starting at the
prop's local +z and turning toward +x, measured again in each of five height
bands. It turns with `rot` and scales the way the mesh is drawn.

That replaced two approximations that were fine for a big animal and
impassable for a small one, which is the size everything starts at now:

- A circle around a plant. A driftwood log two and a half units long and one
  wide blocked a disc two and a half units *across*, so there was an arm's
  length of invisible wall off each side of it. Bryozoan fans, glass fans and
  reed clumps — sheets, all of them — did the same.
- An ellipse fitted to a rock's drawing scale. That is right for the Cambrian's
  procedural boulder, which is a unit sphere; the Devonian's boulder puts its
  corners a third further out than its axes, so it could be swum straight
  through, and a blade spire or talus shard is a flat rock inside a round
  collider a third to twice too wide.

A rock uses the whole silhouette (`boulderQ`, `boulderReach`), and the same
footprint gives the dome height, so what you can see, what you bump into and
what you can stand on are one shape. `radius` is now only the furthest that
footprint reaches: a broad-phase bound and the size of the cover the rock gives.
A plant reads the band at the height it is touched (`fpReachAt`), so a crinoid
is a thin stalk under a wide crown and a spine sponge is a stalk down at the
sand — a floor-walker slips past its foot instead of climbing a pillar that is
not there. Kinds with no authored prop keep the round profile `FLORA_PHYS`
describes.

`resolveStatic` reports what it found (`StaticContact`): whether anything
blocked, the height to reach to get over a rock inside the climbing budget, and
the top of the tallest thing that blocked at all — which is what a crawler
leaning on a cliff eventually goes over. `resolveFlora` reports the same for
plants, plus whether the body was driving at the middle of one or clipping past
its edge. `Game.updateActor` turns those into `Actor.climbTo`.

## Tests

- `tools/prop-collider-test.ts` (`npm run props`): the seabed audit. The
  checked-in shapes are the meshes on disk; every prop's collider contains its
  mesh at every height, so nothing can be swum through; and the long, flat props
  block their own shape rather than a disc around it (a log gets three quarters
  of that disc back as open water, a glass fan almost all of it).
- `tools/swim-test.ts`: sprint endurance, how close to the sand a swimmer may
  ride, rock colliders matching the drawn silhouette (including a rotated rock
  and a carved prop that is twice as long as it is wide), riding over a boulder
  without being pushed back and without a jolt, climbing a steep face and
  handing over to the glide, a cliff still being a cliff for a swimmer, a
  crawler walking up and over both a rock and a wall, a plant climbed head-on,
  gone round when clipped and passed at the floor when it stands on a stalk,
  camera reach, and the radar's reading of height.
- `tools/world-test.ts`: the shore is a wall and swimmable beyond; all nine
  biomes occur with the bands in the right places; chunks are deterministic;
  a player sprinting out to sea for 90 s has chunks, ecosystem and giants
  around it and nothing stale behind; teleport home / to a player /
  cooldown / not while dead; radar contents; respawn near another player.
- `tools/biome-tour.mjs`: drives the built game through every band in a
  headless browser, screenshots each, reports streaming and render counters,
  then a two-player high-detail run with the players far apart.
