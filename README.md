# Cambrian Explosion

Eat. Grow. Fight. Run. A 3D hunting, growing, fighting and escaping game set on a
Cambrian sea inspired by the Burgess Shale. Play one of 21 real Cambrian
animals, start as a larva, and work your way up the food chain in single
player or 2–4 player split-screen with Xbox controllers.

## Play

```sh
npm install
npm run dev        # http://localhost:5173
```

Press any button on a connected Xbox controller, any key, or click to start.
Controls are in the in-game **?** panel (bottom right). Keyboard works too:
WASD swim, arrows look, PgUp/PgDn zoom, Shift sprint, Space rise, C sink, F bite,
G heavy/pounce, R hide, V dash, Q guard, Tab aim, E sense, T teleport, Esc pause.
(A second keyboard layout — IJKL, ;'POU/YH — lets two players share one machine.)

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
| `src/input/`, `src/audio/` | Gamepad/keyboard reading; the WebAudio graph, its sample library and the distance falloff for world sounds. |
| `src/workbench/` | Development workbenches at `/workbench/?edit=<name>`. `?edit=audio` plays every sound through the real audio module; `?edit=environment` previews biome paintings, 3D props and radar marks. |
| `src/shared/palettes.ts` | Creature colour schemes and the material-name to slot mapping they apply through (`src/render/recolor.ts`). |
| `public/assets/creatures/` | 21 rigged full models, reduced LODs, anatomical anchors, studio renders, hero cards, thumbnails and transparent `.select.png` portraits. |
| `docs/redesign/` | Design and technical plan. |
| `tools/` | Headless sim tests (`harness.ts`, `controls-test.ts`, `hunt-test.ts`, `fight-test.ts`, `corpse-test.ts`, `respawn-test.ts`, `flora-test.ts`, `world-test.ts`, `environment-test.ts`, `expansion-test.ts`, `motion-test.ts`), asset tests (`anchors-test.mjs`, `feeding-test.mjs`, `hallucigenia-test.mjs`, `asset-audit.ts`, `portrait-test.mjs`), browser smoke tests (`smoke.mjs`, `viewer-smoke.mjs`, `workbench-smoke.mjs`, `biome-tour.mjs`, `expansion-browser.mjs`), menu button-binding check (`menu-bindings-test.ts`), creature image intake (`make-cards.mjs`, `check-creature-assets.mjs`), colour-slot check (`palette-test.mjs`), audio density check (`audio-mix-test.ts`), LOD generator (`make-lods.mjs`), SFX generator (`gen-sfx.mjs`). |
| `public/assets/brand/`, `public/assets/ui/` | Delivered art: logo and key art, tier and band glyphs, mode panels, loading motif. |
| `tools/art/` | How that art was made: generation prompts, the Blender portrait render, vector export and review scripts. |
| `docs/` | Everything written down. See the index below. |

## Documentation

| Doc | What |
| --- | --- |
| [`docs/redesign/`](docs/redesign/) | The design and technical plan, and the implementation status against it: [current-state audit](docs/redesign/00-current-state.md), [game design](docs/redesign/01-game-design.md), [technical plan](docs/redesign/02-technical-plan.md), [creature expansion](docs/redesign/03-creature-expansion.md), [the endless sea](docs/redesign/04-infinite-ocean.md). |
| [`docs/creature-intake.md`](docs/creature-intake.md) | How to add a creature or change its look; `node tools/check-creature-assets.mjs --strict` enforces it. |
| [`docs/creature-anchors.md`](docs/creature-anchors.md) | The attachment-socket contract every rig ships with, and the feeding/attack solver that uses it. |
| [`docs/animation-brief.md`](docs/animation-brief.md) | The clip set, names and timings a rig must deliver; [`docs/animation-delivery/`](docs/animation-delivery/) records the delivery that satisfied it. |
| [`docs/hallucigenia-motion.md`](docs/hallucigenia-motion.md) | The revised Hallucigenia rig and its baked gait. |
| [`docs/audio.md`](docs/audio.md) | The sound library, how to regenerate a sound, the distance falloff, the soundtrack director and the audio workbench. |
| [`docs/environment-assets.md`](docs/environment-assets.md) | The seven biome props, nine biome paintings and five radar glyphs, and how the streamed sea consumes them. |
| [`docs/art/colour-rendering.md`](docs/art/colour-rendering.md) | Runtime creature palettes and the portrait-variant fallback policy. |
| [`docs/image-requests.md`](docs/image-requests.md) | Open image, glyph and prop requests — **currently none**. Delivered briefs: [`docs/image-requests-history.md`](docs/image-requests-history.md). |
| [`docs/audio-requests.md`](docs/audio-requests.md) | Open sound and music requests — **two biome music loops**, the only outstanding asset in the project. |

## Headless checks

```sh
run() { npx esbuild "$1" --bundle --platform=node --format=esm --outfile=/tmp/t.mjs && node /tmp/t.mjs "${@:2}"; }
npm run bindings                  # no two menu actions share a controller button
run tools/controls-test.ts        # camera-relative movement directions
run tools/respawn-test.ts         # a giant eats a larva; it must come back
run tools/flora-test.ts           # plants: slide around sponges, fold algae, spring back
run tools/expansion-test.ts       # all new kits, feeding, tracking and body clearance
run tools/world-test.ts           # the endless sea: shore, biome bands, streaming, teleport, radar
run tools/environment-test.ts     # biome prop placement, collision bounds, deterministic regeneration
run tools/motion-test.ts          # smooth motion: the interpolation snapshot, no step-to-step oscillation
node --experimental-transform-types tools/anchors-test.mjs
node --experimental-transform-types tools/feeding-test.mjs
node tools/hallucigenia-test.mjs  # the revised rig: skinning, loop seams, gait
node tools/check-creature-assets.mjs --strict
npm run palettes                  # every material lands in the colour slot its scheme assumes
npm run portraits                 # palette-aware portraits match their snapshot, or fall back
run tools/audio-mix-test.ts       # audio density: how much of the reef's noise is in earshot
run tools/harness.ts all 240      # balance: hunting, growth, escapes per creature
run tools/harness.ts duel         # rival fights between creature pairs
npm run preview & node tools/smoke.mjs /tmp   # needs Chromium; writes screenshots
npm run preview & node tools/biome-tour.mjs /tmp   # drives through every biome band; screenshots and streaming stats
npm run preview & node tools/workbench-smoke.mjs /tmp   # audio workbench: plays sounds, flags missing samples
```

`window.__cambrian.stats()` in the browser console reports draw calls, triangles,
live views, actor count and sim/render milliseconds for the current frame.

## Rendering budget

Scenery is instanced in 64-unit chunks so each chunk has a real bounding sphere and can be
frustum- and distance-culled per viewport; the camera's far plane is pulled in to where fog
has hidden everything anyway. Creatures switch to decimated `*.lod1.glb` copies (about 15% for original
models and 38–51% for the detailed new rigs, no textures, locomotion/death clips) once they are small on screen, and only
nearby ones cast shadows. The shadow map is rendered once per frame rather than once per
split-screen viewport. For expansion changes, use the [anatomical authoring and packaging pipeline](tools/creatures/README.md),
which preserves limbs, source rigs and matching sockets in reduced models. The
legacy `tools/make-lods.mjs` remains available for original-roster work.

The [expanded creature design](docs/redesign/03-creature-expansion.md) covers the
13 additions, their feeding routes and abilities, scientific interpretation,
and animation contract. The selection gallery identifies the two Early
Cambrian taxa from outside the Burgess Shale. Editable authoring files and
intermediates are stored locally under `cambrian/local/expansion-authoring/`;
reproducible generation scripts are in `tools/creatures/`.

## Era content

Cambrian remains the only available era. Its roster, ecosystem defaults, presentation and asset
paths are isolated in `src/content/cambrian/`, selected by `src/content/index.ts`. The game and
viewer share that configuration. See [the era content plan](docs/redesign/06-era-content.md) for
adding Devonian without duplicating the engine. Run `npm run eras` to validate the content contract.

The [Devonian design proposal](docs/redesign/07-devonian-design.md) lays out 21 suggested creatures,
regional ecosystems and progression through ecological mastery rather than universal giant size.
This is a future design, not an available game mode.
