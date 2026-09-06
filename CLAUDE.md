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
- Design docs live in `docs/redesign/`. Image needs go in `image-requests.md`; move each
  brief to `image-requests-history.md` once its assets are delivered and integrated.
