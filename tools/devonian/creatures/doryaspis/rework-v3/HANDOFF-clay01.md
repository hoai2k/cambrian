# Doryaspis V3 clay01 — frozen Terra handoff

Creative owner: Astra high. Executor: Terra medium. First-source clay candidate; no Blender construction or visual approval is claimed. Preserve old V1/V2 files, the verified pre-rework backup, and public assets.

## Frozen input boundary

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Manifest: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/frozen-inputs-clay01.json`.

Manifest SHA-256: `7bc9caeef43a413d6a5b1058384f30537b6856475caea0490b7732067fd58a5b`.

Verify that manifest hash, then use the wrapper below. It verifies every source, design, source-check and preserved reference hash in the manifest before any Blender invocation.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/geometry_clay01.py` | 8321 | `181983f576c5ce4e0f767df639ac244a7471175cf3169d962c529245119ab7bd` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/build_clay01.py` | 7930 | `4de2eee03863cd2ea26e850e2cc2615820d214bd28933d7858b2ef150bcf2194` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/render_clay01.py` | 6029 | `1d1991f398a250b2e7fcee6847cc6891003cffdb473ef9c53263c1351da7aab8` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/check_source_clay01.py` | 1984 | `3d667a4cc0e962aaf57dfe0be666943199344b255c6f73315a408c1f4edcb416` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/execute_clay01.py` | 1879 | `173e4049aaa77136abc4f910be100d9c06619cc2ba999866dc43ac7b86de12ea` |

`source-checks-clay01.json` records 2001 positive-width/positive-height body stations and six finite closed source solids with zero degenerate faces or nonmanifold edge incidence. All five Python source files parse. This does not test Boolean output, self-intersections, rendered anatomy, or visual quality.

## Group 1 — build once

Expected output directory `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/doryaspis/rework-v3/clay01` must not exist. Run:

```sh
python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/execute_clay01.py --build
```

Underlying frozen command:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/build_clay01.py
```

Expected: `DORYASPIS_CLAY01_BUILD_OK` and wrapper `DORYASPIS_FROZEN_GROUP_OK build`. The new `construction.json` must pass finite geometry, nondegenerate faces, zero nonmanifold edges, positive volume, and one connected component for each resulting mesh. Save `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/doryaspis/rework-v3/clay01/doryaspis-clay01.blend`; construction report records its bytes/hash. Log is `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/doryaspis/rework-v3/clay01-build.log`. Record this command group and actual evidence in the individual working state before the render group.

## Group 2 — six full views plus oral view

Only after group 1 passes, reverify the manifest hash and run:

```sh
python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/execute_clay01.py --render
```

Underlying frozen command:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/doryaspis/rework-v3/clay01/doryaspis-clay01.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/doryaspis/rework-v3/render_clay01.py
```

Cycles CPU, two threads, 40 samples; 1440 × 1080 PNG. Expected seven `DORYASPIS_CLAY01_VIEW_OK` markers, `DORYASPIS_CLAY01_RENDER_OK`, and wrapper `DORYASPIS_FROZEN_GROUP_OK render`. The renderer verifies the blend and authoring source hashes again. It must create a new `renders/` folder, these files, and `render-manifest.json`:

- `01-three-quarter.png`: cohesive shield volume and supported cornual roots.
- `02-side.png`: low curved dorsal roof, deeper ventral bowl, progressive posterior taper and hypocercal axis.
- `03-front.png`: substantial shield cross-section and small front oral region.
- `04-dorsal.png`: oval armour fields, curved cornual silhouette, saw edge and gently sinuous posterior.
- `05-ventral.png`: full bowl, attached plates and tail, one true oral opening.
- `06-posterior-quarter.png`: rear shield transition, root fullness and continuous caudal membrane attachment.
- `07-oral-front-oblique.png`: real compact oral cavity under the roof and above the pseudorostral root.

Whole views fit actual projected subject vertices with a ten-percent border. The oral view fits a declared local anatomical box and intentionally crops the posterior. All cameras explicitly respect world Y-up/+Z-forward. `render-manifest.json` records projected bounds, camera matrices, source/blend hashes and each PNG's bytes/hash. Log is `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/doryaspis/rework-v3/clay01-render.log`.

## Stop and return

On any hash mismatch, existing candidate/log/render output, unexpected Blender error, construction/camera failure, missing output, or need to change geometry/thresholds/paths/light/camera choices, stop and preserve exact partial evidence. Do not retry the same candidate, choose a new version, soften a threshold, or creatively repair. Return the exact error to Astra/root.

After seven renders, record output hashes and update this creature's working state; return for actual Astra image review. No materials, rig/actions, sockets, exports/LOD, public mutation, shared-doc changes, Git, or general eye/creature audits belong to this handoff.

The anatomical reconciliation is candid: the mouth is above the fixed ventral pseudorostrum and below the shield roof. The user's literal request for below-pseudorostrum anatomy remains unresolved; this tests a smaller front-integrated presentation. Do not report that literal request fulfilled or the clay visually approved.
