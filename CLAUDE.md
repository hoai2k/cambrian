# Cambrian Explosion — project notes for Claude

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
  not be modified in place; new animation clips are added, never replaced.
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
  `assets/<era>/sfx/` regardless. Only creatures with their own delivered model are pickable
  (`PLAYABLE` in `src/sim/creatures.ts`); the rest borrow a body in the world but stay off the roster.
- Devonian gameplay lives in `src/sim/devonian/` and reaches the shared simulation only through the
  `RULES?.` hooks in `src/sim/era-rules.ts`. Do not branch on the era inside `game.ts`/`combat.ts`;
  add a hook. With `RULES` undefined the Cambrian takes exactly its old paths.
- Devonian specimens land in batches (`tools/devonian/shipped.json`). When one lands: run
  `node tools/update-asset-sizes.mjs` (refreshes `src/content/devonian/asset-sizes.json`), remove its
  entry from `DEVONIAN_STAND_INS` in `src/content/devonian/index.ts`, and run `npm run devonian`.
- Devonian sizes and swimming stats are generated: `docs/research/devonian-swimming.json` (sourced lengths
  and body-lengths-per-second) → `npm run devonian:stats` → the six movement fields in
  `src/content/devonian/creatures.ts`. Edit the research or the formulas in `tools/devonian/stats.mjs`,
  never those fields by hand; `npm run devonian` checks they match. The water surface is per era
  (`environment.surfaceY`), fish leave the water through it (`airborne`), and the swim model (reverse
  slow, turn sharp when slow, fast-start on sprint) is the `swim` hook in `src/sim/devonian/swim.ts`.
  Devonian growth is five geometric stages per creature (`stageScale` in `src/sim/devonian/state.ts`,
  hatchlings no shorter than 0.6 units); hatchlings are placed inside plant cover (`spawnInCover`).
- Devonian scenery and biome plates are procedural stand-ins: flora kinds and their density table in
  `src/content/devonian/environment.ts` + `src/render/sea.ts`, plates from `npm run devonian:plates`.
  Authored sets replace them without touching placement; see `docs/redesign/09-devonian-remaining.md`.
- All docs live in `docs/`. Design docs are in `docs/redesign/`. Image, glyph and prop
  needs go in `docs/image-requests.md` and move to `docs/image-requests-history.md` once
  delivered and integrated; sound and music needs go in `docs/audio-requests.md`.
