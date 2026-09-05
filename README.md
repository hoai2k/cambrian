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
WASD swim, arrows look, Shift burst, Space rise, F bite, G heavy, R ability,
V dodge, Q guard, Tab lock-on, E sense, Esc pause.

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
| `tools/` | Headless sim harness (`harness.ts`), browser smoke test (`smoke.mjs`), card cutout script. |
| `image-requests.md` | Art still needed (logo, favicon, key art…). |

## Headless checks

```sh
npx esbuild tools/harness.ts --bundle --platform=node --format=esm --outfile=/tmp/harness.mjs && node /tmp/harness.mjs all 240
node /tmp/harness.mjs duel
npm run preview & node tools/smoke.mjs /tmp   # needs Chromium; writes screenshots
```
