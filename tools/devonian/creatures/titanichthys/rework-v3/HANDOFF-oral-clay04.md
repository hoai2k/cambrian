# Clay04 — frozen two-view oral inspection

Owner: Astra high. Executor: Terra medium. Root authorized two diagnostic renders of the existing immutable clay04 blend. No build, geometry change or blend save is authorized. All four original renders remain untouched.

## Inputs

CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Absolute input | SHA-256 |
| --- | --- |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend` | `69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/render-manifest.json` | `dd109e9bfd3d0c577ce280469a1fbab1196d66be0aea38432408561899026591` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/build_clay04.py` | `7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_clay04.py` | `e45c9b6a72b32a7dddfbc7ccb4fd420f483dfa17fae3d20adfa4957f7273c613` |
| `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_oral_clay04.py` (6537 bytes) | `874ad7052a952e31c8fed36d58aa175a360d841c6c1f50254dd0f0a8cc9f4b53` |

Astra verified the blend and original manifest and parsed the new script with Python AST. No Blender execution occurred. The new script verifies all fixed inputs and original PNG hashes before and after rendering.

## One command group — verify and render exactly twice

Verify every hash above. The new output directory must not already exist:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/oral-inspection-01/`

Then run only:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b /Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-04/titanichthys-clay-04.blend --threads 2 --python-exit-code 1 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/render_oral_clay04.py
```

Expected outputs inside `oral-inspection-01/`:

- `01-oral-front-rest.png`: 1600×1200, existing gape value 0.
- `02-oral-front-open.png`: 1600×1200, existing gape value 1 (24-degree study).
- `manifest.json`: output hashes, exact camera/light settings and post-render immutable-input verification.

Expected markers: two `TITANICHTHYS_ORAL_INSPECTION_VIEW_OK` and one `TITANICHTHYS_ORAL_INSPECTION_OK`.

Both images use the same straight frontal camera `(0, -8, -0.16)`, target `(0, -1.65, -0.16)`, orthographic scale 2.8, CPU Cycles, two threads, 64 denoised samples and exposure −0.35. The frame intentionally crops the distant fin tips and a small part of the crown so the mouth and bilateral junctions are large enough to inspect. Two external area lights shine through the mouth with a 200 W / 70 W asymmetry; the rest of the saved studio rig is unchanged. No light is placed behind or inside a potentially occluding surface.

The recipe changes only existing shape-key values, their eye follower transforms, camera and lights in memory. It contains no blend-save operation and no mesh edits. It verifies the on-disk blend, original scripts, original manifest and original PNGs again after the two renders.

## Decision and stop boundary

`visual-review-clay04.md` records the independent four-view assessment. Preserve the improved fin area and connected anterior form. The unresolved question is whether the side-gape triangle is an inset floor in projection or a real broad wall/pinch/intersection. These close views are evidence to resolve that question; they do not authorize automatic geometry edits or material work.

Stop for a hash mismatch, wrong source blend, existing output directory, unexpected scene structure, command error, missing marker/output or any need to modify a path, light, view or geometry setting. Preserve partial outputs and return to Astra/root; no automatic repair or output reuse.

After both renders, record actual paths, bytes, hashes and unchanged source-blend hash in individual execution state, then return them to root and the author for inspection. No new geometry, textures, final rig/actions, exports, public/Git/shared-state changes or final eye audit in this command group.
