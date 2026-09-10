# Cambrian Conquest — project notes for Claude

## Policy: finish on `main`

When a task is done, merge the work into `main` and push `main`. Do not leave
finished work sitting only on a feature branch or waiting for a pull request
unless the user explicitly asks for a PR. Steps:

1. Make sure the build passes (`npm run build`) and the type check is clean
   (`npm run typecheck`).
2. Commit on the working branch with a clear message.
3. `git fetch origin main && git merge origin/main` on the working branch and
   resolve conflicts if any.
4. `git checkout main && git merge --no-ff <branch> && git push origin main`.
5. Push the working branch as well so the session history is preserved.

## Project shape

- Vite + TypeScript + React (menus, HUD) + Three.js (rendering).
- `src/sim` is pure TypeScript with no Three.js imports: a deterministic
  fixed-step simulation. `src/render` draws it. `src/app` is the React shell.
- Creature GLBs and card renders live in `public/assets/creatures/` and must
  not be modified in place; new animation clips are added, never replaced. The one sanctioned way
  to re-author a clip is `tools/creatures/motion/apply.mjs`, which keeps the shipped clip in the
  file as `replaced/<Name>` (shown under *Replaced* in the viewer) and is re-runnable on top of
  whatever else lands in the GLB; the performance is code in `performances/<id>.mjs`.
- Any change to a creature's model, colours or textures must go through
  `docs/creature-intake.md`: re-render, `npm run cards`, `npm run lods`, and
  `npm run check` must pass. The check flags stale images automatically.
- The sea is endless and streamed: `src/sim/world.ts` generates 64-unit chunks from the seed
  around every player, banded into nine biomes by distance from the one shoreline. Nothing may
  assume a world bound; anything that places things in the world must go through the biome
  weights and `shoreDistance`. Design and contract: `docs/redesign/04-infinite-ocean.md`;
  `tools/world-test.ts` must pass.
- `src/sim` must be reproducible: given the same seed and inputs a match replays exactly.
  Nothing there may call `Math.random` — take randomness from the game's `rng` (combat gets it
  through `HitContext.rng`). `tools/` tests rely on this; without it failures do not reproduce.
- The renderer interpolates between fixed simulation steps using each actor's `prevT` snapshot,
  so anything that moves an actor by more than it could swim in one step (teleport, respawn)
  must read as a jump. `tools/motion-test.ts` guards this.
- Two eras, one engine. `/` is the Cambrian; `/devonian/` (entry `src/devonian/main.tsx`) calls
  `selectEra(DEVONIAN)` and `setAppBase(nestedBase())` *before* dynamically importing the app, because
  many modules read `ACTIVE_ERA` at module top. Anything new that reads the era at import time must
  stay behind that import (or resolve lazily like `assetPaths` and `music()`); the entry page itself
  must not statically import the audio library or the sim for the same reason. Headless tests that
  need the Devonian do the same: select the era, then `await import(...)` (`tools/devonian-test.ts`).
- An era's `assets.sfx` names the shared sound library (`assets/sfx/`): bites, hits and the UI are the
  same files in both eras. Era-specific samples are addressed as `<era>/<name>` and resolve under
  `assets/<era>/sfx/` regardless. The two always-on beds are named per era in `audio.loops`, and a
  music track that names biomes is an *area theme*: reserved for them, never shuffled into the
  rotation, crossfaded to on a dwell and back again on a longer one, resuming where it left off
  (`stepArea` in `src/audio/audio.ts`, the constants in `src/audio/music.ts`, `npm run music`).
  Nothing synthesises a stand-in for a sound that has not loaded — it stays quiet and the file is
  fetched; anything genuinely missing goes in `docs/audio-requests.md`. Only creatures with their own delivered model are pickable
  (`PLAYABLE` in `src/sim/creatures.ts`); the rest borrow a body in the world but stay off the roster.
- Devonian gameplay lives in `src/sim/devonian/` and reaches the shared simulation only through the
  `RULES?.` hooks in `src/sim/era-rules.ts`. Do not branch on the era inside `game.ts`/`combat.ts`;
  add a hook. With `RULES` undefined the Cambrian takes exactly its old paths.
- Devonian specimens land in batches (`tools/devonian/shipped.json`). When one lands: run
  `node tools/update-asset-sizes.mjs` (refreshes `src/content/devonian/asset-sizes.json`), remove its
  entry from `DEVONIAN_STAND_INS` in `src/content/devonian/index.ts`, and run `npm run devonian`.
- The Cambrian roster ships at one size — every animal grows to within a third of every other — and
  *Equivalent sizing* (Settings, off by default) swaps in lengths taken from what the animals
  actually measured: `docs/research/cambrian-sizes.json` → `npm run cambrian:sizes` →
  `src/content/cambrian/equivalent-sizing.json`, which `npm run eras` checks. K is set so the
  largest animal stays exactly where it is today, so the sea does not change size; speed, health and
  poise come with the length so a body of a given length fights as it always did, and the growth
  ladder becomes per-creature (`tierScale` in `src/sim/tiers.ts`) so everything hatches the same
  length. Every consumer goes through `creature()`, which is where the swap happens, and the option
  is fixed when a match starts because `src/sim` has to replay the same way from the same inputs.
  `npm run sizing` checks both that off is the shipped game exactly and that on does what the brief
  says.
- Devonian sizes and swimming stats are generated: `docs/research/devonian-swimming.json` (sourced lengths
  and body-lengths-per-second) → `npm run devonian:stats` → the six movement fields in
  `src/content/devonian/creatures.ts`. Edit the research or the formulas in `tools/devonian/stats.mjs`,
  never those fields by hand; `npm run devonian` checks they match. The water surface is per era
  (`environment.surfaceY`), fish leave the water through it (`airborne`), and the swim model (reverse
  slow, turn sharp when slow, fast-start on sprint) is the `swim` hook in `src/sim/devonian/swim.ts`.
  Devonian growth is five geometric stages per creature (`stageScale` in `src/sim/devonian/state.ts`,
  hatchlings no shorter than 0.6 units); hatchlings are placed inside plant cover (`spawnInCover`).
- How a body gets about, where that is something other than swimming forward, is a set of traits on
  `CreatureDef` — the tail-flip, a body with no front, a medusa's pulse, hauling through weed,
  punting, the row/walk gait, a rate-limited pitch, ram feeding, drifting and clinging. The
  mechanics live in `src/sim/locomotion.ts` and are keyed off the creature, never the era, because
  the same trait turns up in both: `npm run locomotion` covers the Cambrian bodies and
  `npm run devonian` the Devonian ones. Which animal has what, and how well each is actually
  attested, is `docs/research/locomotion-ideas.md`.
- A body may shape itself to what it is on: `conformArms` bends a radial rig's arms onto the ground
  under them, or around a creature it is holding, after the mixer has written the pose
  (`src/render/conform.ts`, `npm run conform`). Presentation only, and asked for by name rather than
  read off the rig, because a nautiloid's tentacles carry the same `arm_<i>_<nn>` bone names.
- Seabed scenery collides as the shape it is drawn with: `src/content/prop-shapes.json` is measured
  off the prop GLBs by `npm run shapes` and is what `src/sim` collides against (footprints in
  `src/sim/footprint.ts`). Any new or changed instanced prop must re-run `npm run shapes`, and
  `npm run props` checks the table against the meshes and audits collider against geometry.
- Devonian scenery and biome plates are procedural stand-ins: flora kinds and their density table in
  `src/content/devonian/environment.ts` + `src/render/sea.ts`, plates from `npm run devonian:plates`.
  Authored sets replace them without touching placement; see `docs/redesign/09-devonian-remaining.md`.
- Every animal answers what bites it: `thinkNeeds` in `src/sim/ai.ts` turns any hit into fight or
  flight whatever the attacker's size and however hurt the animal is, and an animal that has been
  fleeing the same attacker for two seconds and is still in its reach turns and fights (cornered).
  Nurseries are safe by non-aggression, not by size — `peaceful()` drops prey and rivals inside the
  ring from an animal's reckoning (a mouthful taken in passing included) but never its answer to
  being bitten — and ambient size is rolled from the sea's own ages rather than the biggest player's
  tier, so something full grown passes by from the first minute. Where in the water a swimmer keeps
  itself follows its length: `columnY` in `src/sim/locomotion.ts` raises the floor of a big body's
  range and pulls small ones down towards the sand, and `keepOffTheFloor` in `src/sim/ai.ts` bends a
  large body's travel up whatever its goal asked for (`keepClear`), so the largest animals pass
  overhead rather than lying on the bottom — with about one wander in six (`DIP_CHANCE`) a run down
  over it. `npm run reactions` and `npm run locomotion` guard
  all of it.
- What lives where is the place's own business, not the player's: `src/sim/population.ts` gives every
  210-unit area a size profile and a density from a hash bent by the biome (hatcheries inshore, grown
  animals in the deep), pure in the place and the world seed so an area is the same when you return.
  `spawnAmbient` draws from it; `spawnPreyFor` still keeps food of your own size within reach, and
  `PASSER_BY` sends a large animal through the upper water whatever the seabed holds. Ambient brains
  wander within ~32 units of where they spawned, so a population stays in its biome.
- Every player hatches out of an egg on the bottom rung: `HATCH_TIME` in `src/sim/game.ts` holds the
  body still for five seconds (`skipHatch()` ends it for headless harnesses), `layEgg` puts the
  Cambrian egg on the sand nose-to the nearest rock or plant (the Devonian's `spawnInCover` has
  already chosen), and `src/render/eggs.ts` draws the shell — small, opaque, filled by the body,
  pokes from inside, split open by the body growing into it. A moult above that rung is the old
  one-second swell.
- What a player has found — biomes, landmarks, species taken to the top, the Rise record — is
  written to `localStorage` as the match finds it (`recordFinds` in `src/app/codex.ts`), never at
  the results screen: a player who quits mid-match keeps what they found. The results screen marks
  finds new from a list the shell accumulates, because the store already holds them by then.
  `npm run codex` guards both halves.
- `src/content/<era>/pending-refinements.json` is the one queue of outstanding creature art, and it
  separates the two kinds: `model: true` (geometry, materials, rig, LOD art) is what shows the
  creature's ⚠ preview badge in the specimen viewer, with `reason` on hover (the game itself shows
  no badge for now — see `src/shared/ModelStatusBadge.tsx`); `clips` are
  animation clips queued for rework on a body that is already right, flagged on those clip buttons
  in the viewer with `clipReason` and never on the creature. `src/content/pending-refinements.ts`
  derives both eras' tables and `npm run eras` enforces the split — an entry must claim model or
  clip work, whichever it claims must carry its reason, and animation-only work must not badge the
  animal.
- `?debug=local` on either page (`/?debug=local`, `/devonian/?debug=local`) opens an editor for that
  era's saved state — `src/app/DebugLocal.tsx`, gated by `src/shared/debug.ts`, mounted by
  `src/app/Root.tsx` so both entry points get it without knowing about it. A new thing kept in
  `localStorage` should get a control there; `npm run debug` checks the gate.
- The two typefaces are served from `public/fonts/`, not from fonts.googleapis.com: four
  variable WOFF2 files (one per family per Latin subset) declared over a weight range in
  `public/fonts/fonts.css`, which each entry page links. Both are OFL, and the licences ship
  beside them. Going through Google cost a render-blocking third-party request and failed outright
  on any network that does not allow it, our own headless browser included.
- Delivered brand art lands in `intake/` as the original PNG and is converted by `npm run brand`
  (`tools/brand-intake.mjs`) into `public/assets/brand/`. The wordmark's white page is knocked out
  by how *colourless* a bright pixel is, not how bright — the gold has highlights as bright as the
  paper — and edge pixels are un-blended from that white so no pale fringe shows over the sea.
  `intake/` is a handoff inbox, not an archive: convert, check the result where it is actually used,
  then delete the sources from it in the same commit, so anything left sitting there means art has
  been handed over and not yet integrated. Nothing is lost — the originals stay in git history and
  the conversion is deterministic, so a recovered source reproduces the shipped asset exactly.
  See `intake/README.md`.
- All docs live in `docs/`. Design docs are in `docs/redesign/`. Image, glyph and prop
  needs go in `docs/image-requests.md` and move to `docs/image-requests-history.md` once
  delivered and integrated; sound and music needs go in `docs/audio-requests.md`.
