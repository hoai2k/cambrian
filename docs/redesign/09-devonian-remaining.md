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

## 2. Scenery and biome plates (nothing delivered yet)

- `public/assets/devonian/props/` (manifest + GLBs, 29 scenery families in [07](07-devonian-design.md) §5)
  does not exist. The era's `assets.props` points at the Cambrian `assets/props/`, so the Devonian
  coast is dressed with Cambrian sponges and algae. Integration when it lands: point `assets.props`
  at the new folder, add the Devonian families to the flora/prop tables keyed by biome
  (`src/sim/flora.ts`, `src/render/props.ts`) through the biome weights and `shoreDistance`
  exactly as the Cambrian sets are, then the `tools/environment-test.ts` and `tools/flora-test.ts`
  runs. Crinoid meadows, stromatoporoid heads and the river-mouth wood are the three that change
  the look most.
- `public/assets/devonian/biomes/` (the nine banner plates the HUD shows on entering a biome) does
  not exist; `assets.biomes` points at the Cambrian plates, so a Devonian "Crinoid Meadow" banner
  shows a Cambrian painting. Integration: drop nine `<biome>.webp` files in and flip the path.
  These belong in `docs/image-requests.md` if they are not already being produced with the scenery.

## 3. Per-creature specials

Every Devonian creature carries an `ability` id (`jawShear`, `tuskLunge`, `shellJet`, …) and a
description, but none of those ids reach `src/sim/expansion-abilities.ts`, so Y currently gives
everyone the shared hide (camouflage or burrow). The rung mechanics that the identity table in
[08](08-devonian-domination.md) *Grasp, tusks, tridents, brushes* leans on already work through
`RULES` (armour and pierce, jet and hover, shore reach, shoaling, moult exuvia, scavenger double
nutrition, benthos open-water standing, Titanichthys no-bite). Still to do, roughly a day:

- Heavy variants: Onychodus tusk lunge (guard-break, half pierce is already in `armour()`), Walliserops
  trident shove (displace, low damage), Rhinodipterus crush bite (bonus versus `shell`), Jaekelopterus
  chelicerae grab (reuse the existing grab), Dunkleosteus already has full pierce.
- Block variants: Eldredgeops enrol (already full armour while guarding), Stethacanthus brush display
  (AI rival backs off once per encounter, hunter detection cost up), Doryaspis and Bothriolepis hard
  shield (already armour while guarding, needs the visual).
- Y variants: Gemuendina sand ambush (the existing burrow with an emergence bite is close),
  Doryaspis floor sweep (grazing route), shell withdraw for the two cephalopods (armour already
  reads `guard` on a `shell` as withdrawn; the `withdraw` SFX is registered but unused).
- Wire the Devonian ids into the ability dispatcher behind a `RULES` hook rather than branching in
  `game.ts`, per CLAUDE.md.

## 4. Music

"Devonian Shells" is the opener. The rotation is still filled by the two Cambrian tracks. The two
biome themes (`theme-rivermouth` for Sandy Shallows / River Mouth, `theme-opensea` for Tidal
Channels / Reef Front / Open Sea) are tagged in `src/content/devonian/music.ts` and drop out of the
rotation until the files exist in `public/music/`. Request is open in `docs/audio-requests.md`.

## 5. Sound

Nineteen Devonian samples are generated and registered. Two were flagged at delivery: `withdraw`
is hissy and `ambient-open-sea` sits about 15 dB under the reef bed. `anoxia-drone` and
`ambient-open-sea` are loops but the loop table (`LOOPS` in `src/audio/audio.ts`) is shared, so the
Devonian still plays the Cambrian reef ambience; a per-era loop table is a small change.
`standing-up` and `shell-crush` are registered but nothing emits them yet (standing ticks and the
crush bite from §3).

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
