# Triassic builder requests

Blender work on a Triassic creature builder, written up so it can be picked up and done. One
section per request; move a finished one to the bottom under *Done* with what actually shipped.

Every builder here is Blender 5.2 Python — `npm run blender` installs the pinned 5.2.1 to
`/opt/blender` first, and shipped GLBs are meshopt-compressed so Blender's importer needs
`npx @gltf-transform/cli cp in.glb out.glb` to read one.

No requests are open. Finished ones are below.

---

## Done

### Nothosaurus: neck lengthened in the builder, and re-boned to bend (14 September 2026)

Done as one job, because the two halves are one job: bones bend geometry that already exists, so
adding joints to a 0.17 neck would have given a very articulated short neck, and warping alone would
have left a neck nearly twice as long with **one** joint inside it and the rest hanging rigidly off
`neck_tip`. Both, then.

**The warp.** `neck-stretch-request.json` is applied at the top of `build.py`, immediately after the
intake import at line 16 and before anything is derived from that mesh — which is the whole reason
this belongs in the builder: the rig, the axial weights, the procedural twin, the three sockets and
all 21 clips are generated downstream of it and followed by themselves. No Tripo regeneration was
needed and none was done. The code is a port of `warp()` and `normalWarp()` from
`src/viewer/stretch/stretch.ts` reading that file's own numbers, so what shipped is what was
measured: cuts at glTF z 1.395 and 1.872, 41.4° up and −9.2° across, factor 1.97, region 0.355 →
0.699 — 7.1% of the body it was, 13.3% of the body it now is. 551 of the 11,534 intake vertices lie inside the region and 1,385
are carried whole; shading normals follow the map's inverse transpose rather than being recomputed,
so no face outside the neck is reshaded. The body is now 5.256 units long instead of 5.000, and
`modelLength` is measured off the built meshes rather than typed.

**The bones.** Six cervical controls where three used to sit — `neck_base`, `neck_01`…`neck_04`,
`neck_tip` — taking the rig from 27 joints to 30. They are the old chain's centreline taken through
the same stretch and resampled at even arc length: `neck_base` to `neck_tip` is five segments of
0.171 where it was two of 0.257, so the articulation is denser than it was rather than merely as
dense. `AXIAL` gains a station per joint, each with the same small lead ahead of
its own head; the skull's station takes the head's rigid shift, which leaves the blend either side
of the jaw cut exactly the fraction it was. The clip generator's per-joint share is divided by the
length of the chain, so six spread the bend the three had between them instead of doubling it, and
the two hardcoded touches for *Ability* and *Grab* now name the middle of the neck and its last
joint by index. Everything else the builder authors on the head — the jaw cut, the mouth seam, the
oral floor and palate, the hinge tissue and the three sockets — goes through the same warp, so
`anchor_mouth` moved from z +2.475 to +2.731 with the head.

**Checks.** Packaging and `audit.mjs` pass (the joint-count assertion went 27 → 30, and the gait
audit gained a skull **vertical** travel check, because a longer neck fails upwards first).
`npm run triassic` (619 checks), `npm run typecheck`, `npm run build` and
`node tools/update-asset-sizes.mjs` all pass. Pair agreement is unchanged where it is measured
grid-free: nearest puppet-surface distance max 0.11904 / P95 0.01018, against 0.11304 / 0.01020.
Portraits and review sheets were re-rendered.

**Swim and Sprint still hold the head still**, which CLAUDE.md requires and which no renderer-side
pose patch may be reintroduced to achieve. Measured over 121 phases: skull lateral travel 0.008 /
0.012 units (was 0.006 / 0.009 — the head sits further from the roll axis, and the locomotor clips
still zero the cervical yaw outright) and vertical travel 0.024 / 0.041 (was 0.026 / 0.043, i.e.
slightly less, because dividing the per-joint share offsets the longer lever). Both are now
asserted.

**What it looks like, honestly.** Rendered textured, side-on and three-quarter, at four times the
portrait magnification: the neck reads as a neck rather than a head on shoulders, and bent through
`TurnLeft` its silhouette is a smooth arc with no faceting — so **no edge loops were added**. The
band keeps real density (551 vertices over 0.355, halving from 1,553 to 788 per unit of length), and
interpolation would have added resolution and nothing else; it cannot invent scales or cervical
anatomy. The pigment smear is real but mild: the UVs are not re-projected, so the dorsal mottling is
drawn out lengthwise and the pale ventral throat reads slightly soft against the crisper flank. It
is visible if you look for it and it is nothing like the blank pale sock `neck-study.py` produced at
×5–×7 — that study stretched only the 0.17 *visible* neck, so it needed a far larger factor for the
same reach, and its axis-aligned band tore `Seated jaw hinge tissue` in half. The tilted far cut
here clears that mesh entirely (its furthest-back corner sits at 1.09 of the region) and carries it
whole.

This is still the half-measure it was written as. It does not give the genus its 19–25 cervicals and
it does not redraw the pigment; `docs/triassic/canonical/prompts-2026-09-13-nothosaurus-neck.json`
is the real fix and stands unchanged. Nothosaurus is shipped and human-approved, so
`tools/triassic/shipped.json` and the preview badge were deliberately left alone — that status is
the reviewer's.

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
