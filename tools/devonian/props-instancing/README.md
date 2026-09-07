# Devonian static scenery preview integration

Eleven independent static exports reuse the shipped specimen shapes and pigment in the game's existing placements. Original full/LOD metric models and their ambient rigs are untouched; all 47 specimen options remain available in the catalogue. These derivatives are game-space proxies, not revised scientific size claims.

| Placement | Source specimen | Proxy triangles |
|---|---|---:|
| crinoid | stalked-crinoid-v2 | 2,154 |
| stromatoporoid | massive-stromatoporoid-v2 | 1,400 |
| tabulate | massive-tabulate-coral-v2 | 1,800 |
| rugose | colonial-rugose-coral | 2,239 |
| bryozoan | bryozoan-colony | 1,621 |
| reed | marine-algae-v2 | 1,600 |
| log | submerged-log | 1,588 |
| boulder | large-boulder-v2 | 384 |
| blade-spire | carbonate-outcrop-v2 | 384 |
| talus-shard | carbonate-rubble-v2 | 1,400 |
| pebble-cluster | sand-pebble-bed-v2 | 891 |

The eleven GLBs total **15,461 triangles / 401,360 bytes**, with one static mesh/material each, no textures/skins/animations, vertex pigment and Meshopt storage. Compression preserves all decoded attributes and oriented triangles (the codec may rotate triangle indices cyclically). Each ground placement has minimum Y=0; the existing center-pivot boulder is centered at the origin. Exact game dimensions and radial envelopes are in `config.json` and `validation.json`.

## Runtime integration

`src/content/devonian/scenery.ts` owns the mappings and material/bend/wind choices. An optional `EraDefinition.assets.instancedScenery` field exposes these to the generic renderer. `assets.props` retains the concurrent Devonian `scenery/` export library as a fallback; explicit `instancedScenery` paths select the validated proxies. An explicit proxy collection owns the whole flora mapping, so Performance and the two giant procedural exceptions do not fall through to unintended land plants. The renderer retains seed, physics, flora dimensions, instance transforms, stream/culling logic and existing sea-shader wind/bending. New pigmented flora use the existing scalar shade without multiplying the pigment by a second brown flora colour.

`loadPropGeometry` installs Meshopt decoding, bakes world transforms for static multi-mesh overrides, normalizes attribute representation and merges indexed geometry. It returns a detached geometry owned by the caller, disposing parsed source geometry, materials, textures and skeleton resources on success or validation failure. Original Cambrian assets preserve their old raw geometry/pivot convention. Failed asynchronous loads keep their procedural fallback; late loads after sea disposal release their geometry.

## Intentional procedural exceptions

- `lilyColumn`: retains the existing 9.5-world-unit stalk/crown silhouette. A rock/framework composition carrying realistically proportioned crinoid colonies is deferred. The 0.543 m specimen is not stretched to fill this slot.
- `frondTower`: retains the existing 5.5-world-unit marine frond silhouette. A framework/algae composition is deferred. No Rhynia, Archaeopteris or other terrestrial tree is placed underwater.

These are initial integration exceptions, not final palaeoenvironment reconstructions. The small pebble-bed derivative still includes its specimen sediment patch; improving that scatter silhouette is deferred with the other prop refinement.

## Quality and performance

The era declares `minimumFloraQuality: 'high'`. The existing **Performance/low** renderer tier keeps procedural flora and its original colour path. **High** uses the seven authored flora proxies. All four authored rock slots are enabled in both tiers; no era-specific condition is embedded in the renderer. There is no separate medium tier in this codebase.

The same deterministic QA camera (seed 5052026) records:

| Mode | Draw calls | Triangles |
|---|---:|---:|
| Previous low baseline | 104 | 1,211,203 |
| Final low, authored rocks only | 104 | 1,307,304 |
| Final high, authored flora + rocks | 104 | 8,087,473 |

Low overhead is **96,101 triangles / 7.93%**, rather than the initial unrestricted candidate's 6.50× regression. High is still costly in dense scenes because thousands of crinoids/algae are instanced; dedicated scatter LODs remain future work. No seed or density was changed to hide cost. These counters are the colour pass with shadows disabled in the controlled QA renderer; the game's high shadow passes add their own cost. SwiftShader verifies correctness, so no real-device FPS claim is made.

## Reproduce

Run from the repository root with Node on PATH. The local authoring directory is `../devonian-authoring/props-instancing/`.

```sh
node tools/devonian/props-instancing/decode.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/props-instancing/build.py
node tools/devonian/props-instancing/package.mjs
node_modules/.bin/esbuild tools/devonian/props-instancing/loader-test.ts --bundle --platform=node --format=esm --external:three '--external:three/*' --outfile=node_modules/.cache/props-loader-test.mjs
node node_modules/.cache/props-loader-test.mjs
npm run typecheck
npm run devonian
npm run eras
npm run build
```

`decode.mjs` validates texture-free source LODs and bakes material colour factors into vertex pigment. Blender discards imported rig widgets, evaluates static rest geometry, normalizes pivots/dimensions, welds/reduces/validates topology and saves editable blends. `package.mjs` preserves raw exports locally and records hashes, bounds, triangle counts, colour checks, no skins/textures and unchanged original specimen hashes. For a reproducible fresh raw→packed comparison, run build before package rather than repack already compressed outputs.

For the actual Three.js comparison, start Vite on port 4177 and run:

```sh
npm run dev -- --host 127.0.0.1 --port 4177 --strictPort
node tools/devonian/props-instancing/review.mjs
node tools/devonian/props-instancing/review.mjs --baseline
node tools/devonian/props-instancing/review.mjs --high
```

Use a fresh Vite instance after source edits to avoid separate hot-reload module instances when selecting the era. Chrome is headless with SwiftShader. Review output lives under local `review/`: `static-proxy-contact.png`, `devonian-game.png`, `devonian-game-baseline.png`, `devonian-game-high.png`, `review.json`, `baseline.json`, `review-high.json`. The imported branch modules are used directly, with the era selected before the simulation/renderer import. Baseline disables only the optional scenery override. This review is a controlled actual-renderer scene, not a full interactive gameplay session.

If the review targets a fresh Vite instance on another local port, set its
origin explicitly:

```sh
DEVONIAN_QA_ORIGIN=http://127.0.0.1:4181 node tools/devonian/props-instancing/review.mjs
```

## Verified

- All eleven exact exported GLBs loaded through the production loader and rendered under common lighting; their shapes, pigment and pivots were visually inspected.
- Actual sea placements, sea shader, compressed loading and stream resources rendered with no browser errors; disposal returned to the twelve independent QA geometries (eleven contact props plus ground).
- Loader regression checks cover unchanged Cambrian paths/numeric pivots, detached ownership, transformed mixed-index source meshes, normalized pigment, normals, shared material/texture disposal and failure cleanup.
- Typecheck, build, 618 Devonian checks and the Cambrian/future-era validation suite pass.
- `validation.json` records the frozen GLB hashes. Source `.blend`, decoded/raw intermediate files, original-source hashes, render images and logs are retained locally.
