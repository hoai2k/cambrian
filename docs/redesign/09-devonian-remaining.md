# Devonian Domination — what remains

Status as of the last asset check (7 Sept 2026, 03:35 UTC). Devonian Domination is playable at
`/devonian/` from the pack in `src/content/devonian/` and the rules in `src/sim/devonian/`
([08](08-devonian-domination.md) has the design and its status note). This is the list of what is
still open, in the order it is worth doing. Nothing here blocks play; each item removes a placeholder
or a reuse of Cambrian material.

## 1. Models still in production (13 of 21)

Delivered: Dunkleosteus, Titanichthys, Coccosteus, Bothriolepis, Gemuendina, Doryaspis,
Cladoselache, Stethacanthus (`tools/devonian/shipped.json`). Everything else borrows a delivered
body through `DEVONIAN_STAND_INS` in `src/content/devonian/index.ts`, recoloured with its own scheme:

| Rung | Pending | Stands in as | Note |
| --- | --- | --- | --- |
| I | Eldredgeops, Walliserops | Bothriolepis | Trilobites read as a flat armoured crawler; `Moult` clip and enrolment pose missing. |
| I | Nahecaris, Palaeoisopus | Bothriolepis | Arthropod silhouettes are the furthest from their stand-in. |
| I | Furcaster | Gemuendina | Flat body works; five arms do not. |
| I | Manticoceras | Doryaspis | The shell has no model of any kind yet; the jet reads as a fish swimming backward. |
| II | Cheirolepis | Coccosteus | Close enough. |
| II | Michelinoceras | Doryaspis | As Manticoceras; the rostrum vaguely suggests the cone. |
| III | Onychodus | Cladoselache | Tusks absent, otherwise a fair hunter body. |
| III | Rhinodipterus | Coccosteus | Lungfish body pending. |
| III | Tiktaalik, Acanthostega | Bothriolepis | Limbs and the beach crawl are the visible loss; the shore-reach mechanic works. |
| III | Jaekelopterus | Bothriolepis | Ground creature; chelicerae grab has nothing to grab with. |

When a batch lands: `git fetch origin main`, `node tools/update-asset-sizes.mjs`, delete the ids
from `DEVONIAN_STAND_INS`, `npm run devonian` (it fails if a stand-in points at a pending model or a
shipped model is still listed), then the usual build and merge. Portraits for pending creatures use
the shared fallback card; nothing to do there until the renders arrive with the model.

## 2. Scenery and biome plates (procedural stand-ins in place)

Neither authored set has been delivered, so both are generated for now:

- **Scenery.** Seven Devonian flora kinds (`crinoid`, `stromatoporoid`, `tabulate`, `rugose`,
  `bryozoan`, `reed`, `log`) are placed by the era's own density table
  (`FLORA_DENSITY` in `src/content/devonian/environment.ts`, keyed by biome through the biome
  weights and `shoreDistance`; logs only within 120 of the shore) and drawn from procedural
  geometry in `src/render/sea.ts`, with physics and cover in `src/sim/flora.ts` / `world.ts`.
  When the authored GLBs land (`public/assets/devonian/props/` per the production contract),
  point `assets.props` at them and map each kind to its prop the way `floraProps` maps the
  Cambrian sponges; the placement and physics stay. The nursery reed density is thick; halve it
  if low-quality framerate suffers.
- **Biome plates.** `npm run devonian:plates` (`tools/devonian/biome-plates.mjs`) writes nine
  soft procedural banners to `public/assets/devonian/biomes/`, which the era now points at.
  Painted plates replace them file for file.

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

## 6. Balance and feel (from the first play-through)

- A Young rung II animal at the nursery sees a crowded radar: many nearby ambient animals count as
  threats at 0.6 scale. Either soften the threat band for stage 0 or thin the nursery ecology in
  Domination.
- Range scoring at the nursery is zero for the first minute in the browser run but positive in the
  headless test; the difference is the bots (two fill seats), one of which was probably the same
  rung. Worth a look at `updateRange` so a same-rung bot does not silently cancel a player's range.
- The rung numeral in the HUD ring is a serif "II"; a set of four rung glyph SVGs (`rung-1..4.svg`
  under `assets/ui/`) in the style of the Cambrian tier glyphs would read better. Add to
  `docs/image-requests.md`.
- Stand-in bodies are recoloured but keep the stand-in's size ratios; a Manticoceras that jets
  backward as a Doryaspis looks wrong enough that the shell mechanics are best judged after the
  cephalopod models land.
- Food Chain has not been played with four humans; the distinct-rung rule is enforced at start.

## 7. Tests and tooling

- `npm run devonian` (145 checks) covers the pack, bands, standing, air, dead water, shore reach,
  armour, determinism and the mode endings. It does not yet cover the specials (§3) or the shoal
  follower behaviour with real swarm schools.
- The browser smoke script used during integration lives outside the repo; a `tools/devonian-browser.mjs`
  in the style of `tools/hiding-browser.mjs` would make the `/devonian/` page part of the QA set.
- `tools/asset-audit.ts` and `tools/anchors-test.mjs` fail to run headless independent of this work
  (they need Vite's `import.meta.env` and a TypeScript loader respectively); not Devonian issues, noted
  so nobody chases them here.
