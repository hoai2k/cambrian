# Devonian Domination — what remains

Status as of the last asset check (7 Sept 2026, initial-delivery priority update). Devonian Domination is playable at
`/devonian/` from the pack in `src/content/devonian/` and the rules in `src/sim/devonian/`
([08](08-devonian-domination.md) has the design and its status note). This is the list of what is
still open, in the order it is worth doing. Nothing here blocks play; each item removes a placeholder
or a reuse of Cambrian material.

## 1. Initial roster complete; individual reworks remain

All 21 creatures have their own models, LODs, animations, anchors and portraits in
`tools/devonian/shipped.json`; no stand-ins remain. Three models are reviewed/final and
18 remain clearly labelled previews. Six user-reference total reworks take priority:
Titanichthys, Doryaspis, Gemuendina, Coccosteus, Bothriolepis and Stethacanthus.
Complete each rework before its eye/general quality audit. Preserve existing source backups.
See `docs/devonian/refinement-queue.md` and the enforced `src/content/devonian/pending-refinements.json`.

## 2. Initial scenery and supporting images delivered; refinement remains

The library has 47 authored scenery previews, nine runtime biome paintings, 29 scenery
appearance boards, nine regional environment boards, three lighting concepts, ten material
source sets, two atmosphere atlases and two calibrated creature scale plates. These are initial
assets with documented uncertainty and preview limitations; see `docs/devonian/supporting-assets.md`.

Placement, density, physics and cover still come from the era environment and streamed world.
`assets.instancedScenery` selects eleven validated game-space proxies: seven ordinary flora
kinds and four rock slots. High quality uses the authored flora. Performance retains procedural
flora; both use the authored rocks. The two giant flora silhouettes stay procedural pending
supported colony/framework compositions. Land plants are not substituted into submerged flora.

The concurrent `tools/devonian/props/instance.mjs` exporter and its 24 `scenery/` exports remain
available through `assets.props`, with `environment.floraProps` supported for collections without
an explicit proxy map. An explicit proxy map owns all its flora choices and its quality gate;
it does not fall through to another mapping for intentionally procedural kinds. The loader
supports compressed, transformed multi-mesh proxies and cleans up source resources.

Controlled proxy review measured Performance at 1,307,304 triangles versus 1,211,203 procedural
baseline (+7.93%), with 104 draw calls in each. High measured 8,087,473 triangles and 104 calls.
These are one-camera colour-pass measurements, not FPS claims; dense scenery optimization
remains. The earlier 24-export measurements describe that alternate implementation, not the
combined configuration. Original full inspection models remain unchanged.

Nine imagegen paintings replace the procedural biome banners. The generation tool preserves
painted banners unless explicitly asked to overwrite them. Regional and lighting boards are art
direction, not evidence that all pictured taxa coexisted; scale plates use labelled reconstruction
working sizes. Refresh dependent images when the corresponding creature rework lands.

## 3. Per-creature specials (done)

Implemented in `src/sim/devonian/specials.ts` behind the `useAbility` / `beginAbility` /
`stepAbility` / `camoDrain` hooks in `src/sim/era-rules.ts`, each with its own sample. Heavy
specials: jaw shear (Dunkleosteus, full pierce, guard-break), run-through (Cladoselache),
tusk lunge (Onychodus, half pierce), crush bite (Rhinodipterus, double against shells), neck snap
(Tiktaalik, snaps to the lock target), chelicerae grab (Jaekelopterus), trident shove (Walliserops),
shield push (Bothriolepis), armour flank (Coccosteus, more from behind). Guard: brush display
(Stethacanthus bluffs an AI rival once per encounter), enrol (Eldredgeops, the shared enrolment).
Y: shoal dart (Cheirolepis), shell jet and shell hover (the cephalopods), limb haul (Acanthostega,
stronger on the sand), floor sweep (Doryaspis) and filter gulp (Titanichthys) feed standing; sand
ambush is the shared burrow (Gemuendina); camouflage costs a quarter for Furcaster and Palaeoisopus.
Left for a tuning pass: the numbers were set by feel, not play; the guard visuals for hard shields;
Michelinoceras' jet versus Manticoceras' hover are the same jet with different Y specials.

## 4. Music (optional)

"Devonian Shells" opens; the Cambrian reef tracks fill the rotation. More Devonian music is a
nice-to-have, not pending work: the two biome theme tags in `src/content/devonian/music.ts`
(`theme-rivermouth`, `theme-opensea`) pick up files dropped into `public/music/` and are silent
otherwise. Nothing waits on them.

## 5. Sound

Thirty-four Devonian samples are generated and registered, including one per special (§3).
Two were flagged at delivery: `withdraw` is hissy and `ambient-open-sea` sits about 15 dB under
the reef bed. `anoxia-drone` and `ambient-open-sea` are loops but the loop table (`LOOPS` in
`src/audio/audio.ts`) is shared, so the Devonian still plays the Cambrian reef ambience; a per-era
loop table is a small change. `standing-up` and `withdraw` are registered but nothing emits them
yet (standing ticks; the shells' guard).

## 6. Balance and feel

Sizes and swimming now follow the animals. `docs/research/devonian-swimming.md` collects
representative lengths and cruise/burst speeds (measured where they exist, modelled or allometric
otherwise, sources listed); `tools/devonian/stats.mjs` turns them into game stats (length
4.6·m^0.6 for a playable 0.85–12 unit range in the real order; cruise from body lengths per second
with a pace factor and a 0.5 screens/s steering floor; sprint up to 4× cruise for the sharks, as
the fast-start literature has it; turn from cruise over a turning radius in body lengths).
The swim model (`src/sim/devonian/swim.ts`) makes a fish back up at a third of cruise, turn
sharply while slow or reversing, and throw itself forward on the first press of sprint. The water
column is 64 deep (the Cambrian's is 40), swimmers hatch and wander mid-column, giant sea lilies
and frond towers reach up into it, and a fish driving hard at the surface leaves the water and
splashes back in, throwing a sheet of spray on the way out and a crown of droplets with a foam
ring on the way in. Rhinodipterus moved to rung II by size (0.4 m).

Growth is five stages (Hatchling, Juvenile, Young, Adult, Prime), geometric: every moult multiplies
the body by the same factor from a hatchling of at least 0.6 units (a hatchling Dunkleosteus is a
small fish, shorter than an adult Coccosteus) to full adult size, then Prime a third bigger again.
Death costs one stage. Every hatchling is placed inside plant cover near the nursery — a floor
plant, or a lily crown up the column for a swimmer — never in open water.

Fixed after the first Dunkleosteus play-through: the roster's speed, agility and turn were authored
in Cambrian-sized numbers on Devonian-sized bodies, so the giants crawled (a Young Dunkleosteus at
0.39 screens/s against the Cambrian's 0.54–1.19); they are now tuned in screens per second and
`npm run devonian` holds every creature to that band. The heavy button, which is the creature's
special on this roster, played an animation on the spot: every heavy special now aims at the locked
or nearest body ahead and carries the body through its hit window, like the pounce it replaces. The
river-mouth reeds were thick enough to halve a giant's speed at spawn and were thinned. Still open:

- Nurseries are sanctuaries now (`src/sim/devonian/swim.ts`): bots hatch in the next nurseries along
  the shore, an AI body leaves anything under adult size alone inside the nursery ring unless it
  started the fight, hatchlings are protected for eight seconds and juveniles five, and hatchlings
  are placed inside the ring. The hatchling's crowded radar is fixed: the dial now carries the
  nearest predator and the nearest meal rather than every animal in reach, and its reach follows
  the body ([04](04-infinite-ocean.md#radar)).
- Range scoring at the nursery is zero for the first minute in the browser run but positive in the
  headless test; the difference is the bots (two fill seats), one of which was probably the same
  rung. Worth a look at `updateRange` so a same-rung bot does not silently cancel a player's range.
- The rung numeral in the HUD ring is a serif "II"; a set of four rung glyph SVGs (`rung-1..4.svg`
  under `assets/ui/`) in the style of the Cambrian tier glyphs would read better. Add to
  `docs/image-requests.md`.
- Stand-in bodies are recoloured but keep the stand-in's size ratios; a Manticoceras that jets
  backward as a Doryaspis looks wrong enough that the shell mechanics are best judged after the
  cephalopod models land.

## 7. Tests and tooling

- `npm run devonian` (337 checks) covers the pack, bands, standing, air, dead water, shore reach,
  armour, determinism, the mode endings, the specials, the movement band, the pickable roster, and
  that every sound and track the era asks for resolves to a file (the shared library lives under
  `assets/sfx/`, not the era folder; pointing the era at its own folder once made all 39 shared
  samples 404). It does not yet cover the shoal follower behaviour with real swarm schools.
- The browser smoke script used during integration lives outside the repo; a `tools/devonian-browser.mjs`
  in the style of `tools/hiding-browser.mjs` would make the `/devonian/` page part of the QA set.
- `tools/asset-audit.ts` and `tools/anchors-test.mjs` fail to run headless independent of this work
  (they need Vite's `import.meta.env` and a TypeScript loader respectively); not Devonian issues, noted
  so nobody chases them here.
