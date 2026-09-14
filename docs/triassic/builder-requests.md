# Triassic builder requests

Blender work on a Triassic creature builder, written up so it can be picked up and done. One
section per request; move a finished one to the bottom under *Done* with what actually shipped.

Every builder here is Blender 5.2 Python — `npm run blender` installs the pinned 5.2.1 to
`/opt/blender` first, and shipped GLBs are meshopt-compressed so Blender's importer needs
`npx @gltf-transform/cli cp in.glb out.glb` to read one.

---

## 1. Nothosaurus: lengthen the neck in the builder

**Status:** open, measured, not started.
**Builder:** `tools/triassic/creatures/nothosaurus/build.py`.
**Measurement:** taken in the viewer's stretch mode
(`/viewer/?specimen=triassic:nothosaurus&mode=stretch`) — see `docs/viewer-stretch.md`.

### What is wrong

*Nothosaurus giganteus* should carry a neck about a fifth of its length. The shipped body carries
the head almost on the shoulders: measured on `nothosaurus.glb`, the local half-width steps from
0.808 to 0.223 in one 0.075 slice at z ≈ 1.61. There is a neck, and it is 0.29 of a 5.00 body
between the shoulder and the base of the skull — 5.8%.

The pose it was built from draws it that way, which is why
`docs/triassic/canonical/prompts-2026-09-13-nothosaurus-neck.json` asks for a redraw. This request
is the cheaper half-measure that can be done now, and does not replace it.

### The change

In the model's own root frame (glTF, unscaled, body along +z, head at +z):

| | |
| --- | --- |
| First cut (`from`) | z **1.500** — in the shoulder |
| Second cut (`to`) | z **1.790** — the base of the skull |
| Direction | straight down the body (side 0°, top 0°) |
| Factor | **3×** (2× if 3 reads badly in motion) |
| Region | 0.290 → 0.870, so 5.8% of the body → 17.4% |
| The head moves | +0.580 along +z |

The map, exactly: a vertex behind the first cut does not move; one past the second moves by the
whole shift; one between moves by the shift times its own fraction through the region, measured
along the direction. That is `warp()` in `src/viewer/stretch/stretch.ts`, and the numbers above are
what `Export stretch` writes.

### Where it goes

`build.py` line 16 imports the raw Tripo body and every later step — the rig at line 79, the axial
weighting at 111, the twin, all 21 clips — is generated *downstream* of that mesh. So the stretch
belongs immediately after the import and before anything is built from it:

```python
bpy.ops.import_scene.gltf(filepath=RAW); auth = ...   # line 16
# ← here: move every vertex of `auth` by the map above, in this same frame
```

Doing it there is the whole point of doing it in the builder. The bones are placed from measured
stations and the clips are generated, so both follow the longer neck by themselves — no joint
moved by hand, no clip re-authored. This is exactly what cannot be done to the shipped GLB, where
27 joints across 21 clips already carry baked translation on every frame.

### What it costs, honestly

The albedo is the original Tripo texture and the UVs are not re-projected, so the neck's pigment
stretches with it. At 3× over a region that includes textured shoulder that is a visible smear on
a mottled hide, not the blank untextured sock that
`tools/triassic/creatures/nothosaurus/neck-study.py` produced at ×5–7 — that study stretched only
the 0.17 *visible* neck, so it needed a far larger factor for the same result. Compare the two
before committing.

A stretch also cannot invent cervical anatomy: the result is a longer version of this neck, not the
nineteen-vertebra neck of the genus. For that, the pose.

### Done means

- `build.py` rebuilt; packaging and `tools/triassic/creatures/nothosaurus/audit.mjs` pass.
- The pair still agrees: the procedural twin is built from the same mesh, so it lengthens with it.
- Anchors re-measured — `anchor_mouth` sits at z +2.475 today and moves with the head.
- `npm run triassic` and `node tools/update-asset-sizes.mjs`.
- The swimming clips looked at in the viewer: a longer neck on the same rotations swings further.
