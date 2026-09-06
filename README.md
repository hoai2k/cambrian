# Cambrian Explosion

Eat. Grow. Fight. Run. A 3D hunting, growing, fighting and escaping game set on a
Burgess Shale reef 508 million years ago. Play one of eight real Cambrian
animals, start as a larva, and work your way up the food chain in single
player or 2–4 player split-screen with Xbox controllers.

## Play

```sh
npm install
npm run dev        # http://localhost:5173
```

Press any button on a connected Xbox controller, any key, or click to start.
Controls are in the in-game **?** panel (bottom right). Keyboard works too:
WASD swim, arrows look, PgUp/PgDn zoom, Shift sprint, Space rise, F bite, G pounce,
R ability, V dash, Q guard, Tab aim, E sense, Esc pause.

## Build

```sh
npm run typecheck
npm run build      # static site in dist/
npm run preview
```

`.github/workflows/pages.yml` builds and deploys `dist/` to GitHub Pages on
every push to `main` (set the repository's Pages source to "GitHub Actions").

## Layout

| Path | What |
| --- | --- |
| `src/sim/` | Pure TypeScript simulation: world, creatures, movement, combat, growth, AI, modes. No Three.js. |
| `src/render/` | Three.js: sea environment, creature views and animation layering, effects, cameras, split-screen engine. |
| `src/app/` | React shell: title, creature select, HUD, pause/results, help and settings. |
| `src/input/`, `src/audio/` | Gamepad/keyboard reading; fully synthesized audio. |
| `public/assets/creatures/` | The eight rigged GLB models and card renders (unchanged originals plus `.card.png` cutouts). |
| `docs/redesign/` | Design and technical plan. |
| `tools/` | Headless sim tests (`harness.ts`, `controls-test.ts`, `hunt-test.ts`, `fight-test.ts`, `corpse-test.ts`, `respawn-test.ts`, `flora-test.ts`), browser smoke tests (`smoke.mjs`, `viewer-smoke.mjs`), creature image intake (`make-cards.mjs`, `check-creature-assets.mjs`), LOD generator (`make-lods.mjs`), SFX generator (`gen-sfx.mjs`). |
| `image-requests.md` | Art still needed (logo, favicon, key art…). |
| `docs/creature-intake.md` | How to add a creature or change its look; `npm run check` enforces it. |

## Headless checks

```sh
run() { npx esbuild "$1" --bundle --platform=node --format=esm --outfile=/tmp/t.mjs && node /tmp/t.mjs "${@:2}"; }
run tools/controls-test.ts        # camera-relative movement directions
run tools/respawn-test.ts         # a giant eats a larva; it must come back
run tools/flora-test.ts           # plants: slide around sponges, fold algae, spring back
run tools/harness.ts all 240      # balance: hunting, growth, escapes per creature
run tools/harness.ts duel         # rival fights between creature pairs
npm run preview & node tools/smoke.mjs /tmp   # needs Chromium; writes screenshots
```

`window.__cambrian.stats()` in the browser console reports draw calls, triangles,
live views, actor count and sim/render milliseconds for the current frame.

## Rendering budget

Scenery is instanced in 64-unit chunks so each chunk has a real bounding sphere and can be
frustum- and distance-culled per viewport; the camera's far plane is pulled in to where fog
has hidden everything anyway. Creatures switch to decimated `*.lod1.glb` copies (about 15% of
the triangles, no textures, locomotion clips only) once they are small on screen, and only
nearby ones cast shadows. The shadow map is rendered once per frame rather than once per
split-screen viewport. Regenerate the LODs after changing a model:

```sh
node tools/make-lods.mjs 0.14
```
