# Triassic builder requests

Blender work on a Triassic creature builder, written up so it can be picked up and done. One
section per request; move a finished one to the bottom under *Done* with what actually shipped.

Every builder here is Blender 5.2 Python — `npm run blender` installs the pinned 5.2.1 to
`/opt/blender` first, and shipped GLBs are meshopt-compressed so Blender's importer needs
`npx @gltf-transform/cli cp in.glb out.glb` to read one.

---

## 1. Nothosaurus: lengthen the neck, and give it bones to bend at

**Status:** open, measured by hand in the viewer, not started.
**Builder:** `tools/triassic/creatures/nothosaurus/build.py`.
**The measurement:** `tools/triassic/creatures/nothosaurus/neck-stretch-request.json` — a
`cambrian-stretch` file exported from the viewer's stretch mode, `appliesTo: "builder"`.

### What is wrong

*Nothosaurus giganteus* should carry a neck about a fifth of its length. The shipped body carries
the head almost on the shoulders: measured on `nothosaurus.glb`, the local half-width steps from
0.808 to 0.223 in one 0.075 slice at z ≈ 1.61. There is a neck, and between the shoulder and the
base of the skull it is a fraction of what it should be.

The pose it was built from draws it that way, which is why
`docs/triassic/canonical/prompts-2026-09-13-nothosaurus-neck.json` asks for a redraw. This request
is the cheaper half-measure that can be done now, and does not replace it.

### The change, as exported

In the model's own root frame (glTF, unscaled, body along +z, head at +z):

| | |
| --- | --- |
| First cut (`from`) | z **1.395** — inside the shoulder |
| Second cut (`to`) | z **1.872** — forward of the skull's own joint |
| Direction | **41.4° up** in the side view, **−9.2°** in the top view |
| Factor | **1.97×** |
| Region | 0.355 → 0.699, so 7.1% of the body → 14.0% |
| The head moves | 0.344 along (−0.121, 0.657, 0.744) |

Applied offline to look at it, that moves 3,257 of 12,868 vertices and leaves the trunk and tail
untouched. The tilted far cut clears the skull: `neck_tip`, `skull` and `jaw` all fall on its head
side and are carried whole, so the cranium keeps its shape and its size. The neck rises from the
shoulders rather than running straight out, which is what the up-tilt is for.

The map, exactly: a vertex behind the first cut does not move; one past the second moves by the
whole shift; one between moves by the shift times its own fraction through the region, measured
along the direction. That is `warp()` in `src/viewer/stretch/stretch.ts` — the request file carries
the numbers it takes, so nothing here has to be retyped.

### The neck needs more bones, and this is why

The rig has three joints between chest and skull. Against the cuts above they fall out like this:

| Joint | z | Where the stretch leaves it |
| --- | --- | --- |
| `chest` | 0.950 | behind the cuts — fixed |
| `neck_base` | 1.325 | behind the cuts — fixed |
| `neck_mid` | 1.515 | 69% through the region |
| `neck_tip` | 1.680 | past them — carried whole |
| `skull` | 1.775 | past them — carried whole |

So a neck nearly twice as long would have **one** joint inside it, with the rest of the new length
hanging rigidly off `neck_tip`. It would read as a rod. The lengthening and the re-boning are one
job, not two: doing only the first is worse than doing neither.

Current neck spacing is about 0.19 / 0.165 / 0.095. To keep that articulation density over a 0.699
neck wants four or five segments in it — **six neck joints instead of three** is a good target,
taking the rig from 27 to 30. Nothosaurs carry 19–25 cervicals, so six is still a summary, but it
is enough for a smooth arc.

### Where it goes

`build.py` line 16 imports the raw Tripo body and every later step is generated *downstream* of
that mesh, which is the whole reason to do this in the builder:

```python
bpy.ops.import_scene.gltf(filepath=RAW); auth = ...   # line 16
# ← the stretch goes here: move every vertex of `auth` by the map above, in this same frame
```

Then the three places the neck is named:

- **line 79** — the `bone(...)` chain. `neck_base`/`neck_mid`/`neck_tip` become the longer series,
  spaced along the lengthened run.
- **line 111** — `AXIAL`, the axial weighting table. Every new joint needs its station, or the skin
  will not follow it.
- **lines 250–256** — the clip generator already loops the neck by name and phases each joint by
  its index (`wave(.9 + j*.4)`), so a longer list spreads the existing motion across it for free.
  The two hardcoded touches just below (`pb['neck_mid']`, `pb['neck_tip']` for *Ability* and
  *Grab*) want expressing as "the middle of the neck" and "the last neck joint" by index rather
  than by name.

Because the rig, the weights, the twin and all 21 clips are generated from the mesh in this one
script, **everything follows**: the procedural twin resurfaces the stretched volume, the bones sit
on the longer neck, and the clips are re-sampled against it. That is what the shipped GLB cannot
offer — there, 27 joints across 21 clips already carry baked translation on every frame.

### What it costs, honestly

The albedo is the original Tripo texture and the UVs are not re-projected, so the neck's pigment
stretches with it. At 2× over a region that starts inside textured shoulder that is a visible
smear on a mottled hide, not the blank untextured sock that
`tools/triassic/creatures/nothosaurus/neck-study.py` produced at ×5–7 — that study stretched only
the 0.17 *visible* neck, so it needed a far larger factor for the same result. Compare the two
before committing.

A stretch also cannot invent cervical anatomy: the result is a longer version of this neck, not the
nineteen-vertebra neck of the genus. For that, the pose.

### Done means

- `build.py` rebuilt; packaging and `tools/triassic/creatures/nothosaurus/audit.mjs` pass.
- The pair still agrees: the twin is resurfaced from the same mesh, so it lengthens with it.
- Anchors re-measured — `anchor_mouth` sits at z +2.475 today and moves with the head.
- `npm run triassic` and `node tools/update-asset-sizes.mjs`.
- The swimming clips looked at in the viewer. A longer neck on the same rotations swings further,
  and `Swim`/`Sprint` are the two clips that were corrected to hold the head still.

---

## Done

### Rhaeticosaurus: neck lengthened in the generation (14 September 2026)

Not a builder job — it has no builder yet. Stretched in the viewer and baked straight into the
generation with `npm run triassic:stretch`: cuts at z 0.353 and 0.221, 34° of down-lean, 2.83×,
taking a 0.110 neck to 0.310 (11% of the body). The stretch file is recorded beside the body as
`rhaeticosaurus.stretch.json`, and the mesh republished through `npm run triassic:previews`.

Its frame came from the authored yaw, which for this animal is one of the wrong estimates
`tools/triassic/preview-orientation.json` warns about, so the stretch held the head still and moved
the body instead. That is the same shape either way — the two differ by a rigid translation, and
everything downstream measures a bounding box — but the animal now sits off-centre in its own root
frame. Correcting the yaw to 0 would fix both that and the preview's facing.

The spare-tail cut landed on this body in parallel, so the bake's vertex-count guard refused the
stretch on the cut mesh, which is what that guard is for. It was legitimate to go on here and the
recorded file says why: the cut is a **pure deletion** — all 368 removed vertices are gone, every
surviving one is at exactly the position it held, and the bounding box is unchanged — so the cut
planes sit where they were and the same warp lands on the same surface. The stretch was
re-expressed against the cut mesh (same cuts, same direction, same factor, re-measured vertex
count) and re-applied. Any edit that *moved* geometry would not have qualified, and the answer
there is to re-cut in the viewer.
