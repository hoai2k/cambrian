# Nothosaurus — paired authored body and procedural volume puppet

The delivered Tripo body and procedural puppet preserve the canonical model's curved tail, asymmetric spread feet, deep torso and elevated snout. Both use one 30-joint skeleton, the same three mouth/attack sockets, and **21 byte-for-byte equivalent decoded animation performances**. The puppet is also the runtime LOD, with all actions retained so either model can perform the same gameplay.

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `nothosaurus.glb` — authored Tripo body | 21,204 | 1,847,372 |
| `nothosaurus.puppet.glb` — procedural twin | 9,342 | 746,752 |
| `nothosaurus.lod1.glb` — identical puppet alias | 9,342 | 746,752 |

Files are in `public/assets/triassic/creatures/`, with matching studio, 1600 × 1200 transparent select, card and thumbnail portraits, plus metadata. Meshopt packaging preserves mesh attributes and animation sample values exactly. Textures are embedded. The model is 5.256 engine authoring units long — 5.000 before the neck was lengthened, and the runtime normalizes by the body's own box either way — faces +Z in glTF and uses +Y up; runtime applies the species' natural size. The research registry supplies the 6 m representative length.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/nothosaurus/tripo-raw/nothosaurus.raw.glb`, SHA-256 `5cb48becbdcbbc3863519bca8a2bb99c5129c6a0e5b1affb6252e15e01c49604`. It came from Tripo task `ea4528e3-1f9a-42f4-b0c4-2b84b879ff7c`, using `docs/triassic/canonical/model-inputs/nothosaurus/input.png` (the intake metadata records the image hash). The raw file is never changed.

The twin is a procedural **volume resurfacing**, rather than a generic anatomical substitute or a decimation of the authored faces. Blender regenerates topology from a 0.007 raw-unit voxel occupancy field, relaxes that surface twice, and reduces the new topology to the puppet budget. Source vertices and faces are not reused. This preserves the asymmetric tail sweep and individual paddle silhouettes that a symmetrical ellipsoid proxy would lose. Puppet pigment is sampled through each nearest source triangle’s interpolated UV. The authored body retains the full embedded original albedo with white vertex colors, restrained normal relief (0.15) and explicitly nonmetallic skin at roughness 0.7.

Intake welds coincident texture-seam vertices and removes ten collapsed triangles; the detached-flake threshold removed no vertices. Connected foot webbing is retained. A true, separate lower-jaw shell is cut along the mouth seam and rigidly skinned to its hinge. Curved oral floor, palate and seated hinge tissue close the interior and prevent a stretched membrane across the open gape. The source's fine surface and tooth detail remains limited by the Tripo reconstruction.

`nothosaurus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes, spaced over the built body's own axial extent rather than a typed range. Maximum width/dorsal/ventral envelope difference is **0.13856 units (2.64% of body length)**; the tolerance is 0.2 units (4%). That number rose from 0.05646 when the stations moved with the lengthened body: the two rows over 0.12 are the fore- and hind-paddle stations, where the voxel resurfacing rounds the webbed digits, and the old grid happened to fall between them. The grid-free measure is the one to read for pair agreement, and it did not move: nearest puppet-surface distance over authored body vertices has maximum **0.11904 (2.26%)** and 95th percentile **0.01018 (0.19%)**, against 0.11304 and 0.01020 before. The joint and socket coordinates are shared, so their parity error is zero. These are generated measurements, not a claimed new human anatomical sign-off.

## Rig and motion

The shared rig has root, body, chest, **six cervical controls**, skull, jaw, seven caudal controls, and three controls per limb. Trunk weights blend longitudinally. Limbs use anatomical regions and smooth radial weights beginning inside the torso, then blend upper limb, lower limb and paddle controls. The jaw is rigid; oral and hinge tissues have explicit jaw/skull weights. Every vertex has normalized nonzero weights and at most four influences.

The complete shared action set is Idle, Swim, Sprint, TurnLeft, TurnRight, Dive, Rise, Attack, Bite, Heavy, Hit, Death, Guard, Parry, Dodge, Eat, Stagger, Ability, Grab, Breath and Growth. Idle, Swim, Sprint, Guard and Eat loop exactly. Root motion and scale animation are absent.

Swim coordinates one bilateral forelimb row with a long broadside power sweep and short feathered recovery, reduced trailing hind-limb motion, a steady head and the existing travelling tail wave; Sprint increases the tail/limb amplitudes and cadence. Turns bank the torso, bend the cervical chain and propagate a caudal steering curve. Attack and Heavy have anticipation, jaw opening, strike, recoil and recovery; Bite is a short gape/snap. Dodge uses an asymmetric paddle stroke and bank, whereas Hit and Stagger use distinct impact/recovery oscillations. Ability is the roster's fang-trap clamp; Grab braces and tugs with the cervical chain. Breath separately raises and lowers the head/torso for a surface cycle. Death relaxes the appendages and holds a rolled terminal pose. These clips supply body performance; world travel and capture rules remain engine-owned.

## Verification

`paired-audit.json` binds the checks to the final packaged file hashes. It asserts exact paired joint names, hierarchy, local rest transforms, inverse bind arrays, socket transforms/metadata, clip names, timing and all sample arrays. It checks normalized weights, finite attributes, unique dynamic clips, loop seams, no root/scale channels and the reduced geometry budget. The Three.js GLTFLoader/AnimationMixer then plays **61 phases of every clip for both models**, evaluating sampled actual skinned vertices. The Blender build also checks every vertex at 13 phases per clip.

The gait audit additionally samples 121 phases of `Swim` and `Sprint`. Both fore paddles reach
their rearmost position together at 0.683/0.667 of the cycle, hind travel stays secondary, and
skull lateral travel is 0.008/0.012 units instead of the prior 0.100/0.145. This made the temporary
runtime head correction unnecessary. Since the neck was lengthened the audit measures the skull's
**vertical** travel as well — 0.024/0.041 units, against 0.026/0.043 before — because a longer neck
fails upwards first: the locomotor clips zero the cervical yaw but keep a little pitch, and the
same rotations on a neck nearly twice as long would swing the head twice as far.

Visual QA inspected the exported models through the same side, top, mouth and action cameras. The first jaw studies exposed a false lip and stretched seam; the delivered separate jaw and explicit hinge boundary correct those defects. Final sheets show seated limbs, matching swept-tail volume, articulated rowing and steering, open/closed attacks and terminal Death:

- [Paired deformation sheet](paired-deformation-sheet.jpg)
- [Remaining actions, including Sprint / Fang Trap / Grab / Breath](paired-actions-sheet.jpg)
- [Paired rowing from above](paired-gait-sheet.jpg)
- [Side, top and mouth comparison](paired-volume-sheet.jpg)

The current portraits and action sheets are rendered from decoded packaged files after the material correction. Packing assertions establish unchanged geometry and animation values. No independent human review is invented by this automated QA record.

## Reproduction

Run from the repository root with Blender 5.2 and installed project Node dependencies:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/build.py
node tools/triassic/creatures/nothosaurus/audit.mjs --package --decode
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded --puppet
python3 tools/triassic/creatures/nothosaurus/contact-sheets.py
```

The paired editable Blender project, decoded review GLBs, logs and individual frames live in `local/triassic-authoring/nothosaurus/`. `build.py` authors both geometry and performance and writes only this species' asset family. It does not modify shared registries or perform git operations. The macOS sandbox may block Metal initialization even for background work; the same Blender command succeeds with its normal approved desktop permissions.


## Material investigation and correction — 13 September 2026

The reported black/white crumpled appearance was reproduced under identical lights in Blender and the live viewer. The main cause was the Tripo tangent-space normal texture at full strength, amplified by its linked ORM shading. The initial conversion also discarded the 2048² original albedo in favor of sparse vertex pigment, losing fine markings and averaging color across atlas seams. Setting Principled roughness/metallic defaults had not overridden the linked texture.

The corrected authored skin embeds the **exact original albedo bytes**, uses white COLOR_0 so runtime recoloring remains available without multiplying the albedo by itself, reduces normal strength from 1 to 0.15, and explicitly disconnects ORM roughness/metallic inputs before setting roughness 0.7 and metallic 0. The puppet samples the nearest triangle’s interpolated UV with bilinear texture lookup; it no longer averages unrelated seam corners or copies the nearest vertex’s color. Its reduced, texture-free material remains matte. The jaw-hinge material now sets its actual shader color and roughness, correcting the exporter’s previous default-gray fallback.

[Controlled material comparison](material-comparison.jpg) shows the old processed material, corrected material, and original Tripo geometry with the same corrected material. The remaining broad grey/white painted streaks are present on the original model and its albedo; this change does not redraw them. The raw model and all its textures remain preserved.

This was **not double gamma, reversed normals or a corrupted UV atlas**. Encoded source-image samples were checked against their PNG bytes, confirming exactly one sRGB-to-linear conversion for puppet colors. Source and processed geometric-normal alignment remained comparable. Of 11,542 matched original surface vertices, all but one UV matched within 1e-5; the sole larger difference was 0.000192, under 0.4 pixel at 2048², far too small to explain the broad paint streaks. New jaw-cut vertices are reported separately.

`material-audit.mjs` verifies the retained source-albedo hash, white authored color attributes, material settings and original UV correspondence. At the time it also proved, against the preserved pre-fix exports, **exactly unchanged positions, normals, UV arrays, skin weights, inverse bind matrices, skeletons and all 21 animation arrays** for the authored model, puppet and LOD. That half was retired on 14 September 2026, when the neck stretch moved geometry and added cervical joints on purpose; re-pinning it to the commit before would only have asserted that the neck did what it says it did, and `paired-audit.json` is what binds the current files to their checks. The UV correspondence stayed and now maps each source vertex through the same stretch before looking for it, so it still proves the shipped UVs name the original albedo's texels: 11,542 matched surface vertices and a worst difference of 0.000192, the same numbers as before the neck moved. `material-audit.json` records this evidence against final packaged hashes. The paired playback audit was rerun, and all four portraits and three pose sheets were regenerated. An independent check of the corrected material in the live viewer confirmed the crumpled highlight artifacts were gone while all 21 clips remained available.

The before-files and full-sized comparison renders are preserved under `local/triassic-authoring/nothosaurus/material-fix/`. `material-review.py` reproduces the matched-light study when its preserved `before/nothosaurus.unpacked.glb` is available. Run `node tools/triassic/creatures/nothosaurus/material-audit.mjs` to validate the delivered material; before/after equivalence checks run when the preserved baseline files are present.


## The neck — 13 September 2026

The research is explicit that *Nothosaurus* has a long neck (19 cervicals in *N. mirabilis*), and
the shipped body does not. Asked where the idea of "lengthening the neck in Blender" came from, the
answer is that it was never this animal's plan: the only procedural necks in the era's paperwork are
**Dinocephalosaurus**, whose canonical images are generated with a short neck stub because the neck
is built procedurally, and **Tanystropheus**, whose rig carries 13 cervical joints. No Nothosaurus
prompt record, board or brief mentions the neck at all; its "anatomy that must read" is the
interlocking fangs, the wing-shaped humeri and the webbed feet.

**What is actually there.** Two independent landmarks in the delivered file agree on where the head
starts — the `skull` bone's head at glTF z +1.775 and the lower-jaw mesh's first vertex at z +1.775.
Behind it the last of the shoulder mass sits at z +1.55 (half-width 1.40, flippers out) and the
first narrow slice at z +1.625 (half-width 0.40). So the visible neck is the run from about 1.55 to
1.72: **0.17 of a 5.00 body, a thirtieth of the animal**, where a nothosaur skeletal puts it near a
fifth. The rig chain's apparent 20.6% (chest → neck_base → neck_mid → neck_tip → skull) is not the
neck; it runs diagonally up from inside the chest and most of it is under the shoulders.

**The model is not at fault.** It reproduces `docs/triassic/canonical/nothosaurus.png` faithfully,
and the pose is what draws the head almost on the shoulders. The procedural twin was built to the
authored body's own envelopes (`nothosaurus-profile.json`), so it carries the same short neck and
offers no way round it.

**Can it be stretched after the fact?** `neck-study.py` answers that by doing it — a piecewise axial
remap of the neck band with the head carried forward, rendered from one fixed camera so the
silhouettes compare ([neck-study.jpg](neck-study.jpg)). It cannot:

- Reaching a nothosaur's proportions means ×5 to ×7 on a band 0.17 long. There is not enough neck
  to stretch; the factors that matter are the ones that visibly tear.
- The UVs are not remapped, so the dorsal scale pattern stops dead at the shoulders and a blank
  pale sock takes over. Visible at ×3, unmistakable at ×5.
- `Seated jaw hinge tissue` spans z 1.660–1.880 and straddles the band, so half of it stretches and
  half translates: the white wedge under the jaw at ×5 is that mesh tearing.
- Only `neck_tip` and `skull` lie forward of the band's start, so a neck five times longer is driven
  by one and a half bones and its front half is rigid with the skull. A long neck is a chain of
  cervical joints; this rig has three neck bones in total, and 19 cervicals is what the animal had.
- A stretch cannot invent cervical anatomy. It smears what is there and nothing else.

So the honest route is the pipeline's own rule: a change of shape goes back to the canonical pose, a
fresh generation and another greenlight. That is an **update to a delivered animal**, not an
outstanding reconstruction ask — the body matches the pose it was greenlit from, which is the bar
for carrying no caution sign.

Reproduce with:

```sh
/opt/blender/blender --background --factory-startup --python tools/triassic/creatures/nothosaurus/neck-study.py \
    -- OUTDIR DECODED.glb 1.0 3.0 5.0 7.0
```


## The neck, lengthened — 14 September 2026

The section above stands: the honest fix for this animal's proportions is a new canonical pose, and
`docs/triassic/canonical/prompts-2026-09-13-nothosaurus-neck.json` asks for one. This is the cheaper
half-measure done in the meantime, and it does not replace that request.

**What was done.** `neck-stretch-request.json` — a stretch measured by hand in the viewer and
exported with `appliesTo: "builder"` — is applied to the intake Tripo mesh at the top of `build.py`,
immediately after the import and before anything is derived from it. Two cuts at glTF z **1.395**
(inside the shoulder) and **1.872** (forward of the skull's own joint), square to a direction tilted
**41.4°** up and **−9.2°** in the top view, and a factor of **1.97**. The region is 0.355 long and
becomes 0.699 — 7.1% of the body it was, 13.3% of the body it now is — and the head moves 0.344 along
(−0.121, 0.657, 0.744). The code is a port of `warp()` and `normalWarp()` from
`src/viewer/stretch/stretch.ts`, reading that file's own numbers, so what shipped is what was
previewed: 551 of the 11,534 intake vertices lie inside the region and 1,385 are carried whole.
Shading normals are carried by the map's inverse transpose rather than recomputed, so no face
outside the neck is reshaded.

**Why it is in the builder and not in the GLB.** A rigged file cannot take a warped bind pose —
every one of these 21 clips re-specifies each joint's translation on every frame, so a warped rest
would show at rest and then be overridden the moment anything played. Here the mesh comes first:
the procedural twin resurfaces the stretched volume, the rig sits on the longer neck, the axial
weights follow it, the three sockets move with the head (`anchor_mouth` from z +2.475 to **+2.731**)
and all 21 clips are re-sampled against it. Nothing about that is a second pipeline.

**Six cervicals, not three.** Lengthening alone would have been worse than doing neither. Only
`neck_mid` fell inside the region; `neck_tip`, `skull` and `jaw` are all forward of the far cut and
are carried whole, so a neck nearly twice as long would have had one joint in it and would have read
as a rod. The chain is now `neck_base`, `neck_01`…`neck_04`, `neck_tip` — six controls, the rig from
27 joints to 30 — placed by resampling the old chain's centreline, taken through the same stretch,
at even arc length. `neck_base` to `neck_tip` is now five segments of 0.171 where it was two of
0.257, so the articulation is denser than it was rather than merely as dense. Each joint's share of every clip is divided by the length of the chain, so the six spread the
bend the three had between them instead of doubling it; the per-joint phase lag off the joint's own
index is what makes it an arc. Nothosaurs carry 19–25 cervicals, so six is still a summary.

**What it cost.** The albedo is the original Tripo texture and the UVs are not re-projected, so the
neck's pigment is stretched with it. Rendered side-on and three-quarter at four times the portrait
magnification, the dorsal mottling runs the whole length of the neck and is drawn out rather than
absent: the pale ventral throat reads slightly soft against the crisper flank, and it is visible if
you look for it. It is not the blank pale sock `neck-study.py` produced at ×5–×7 — that study
stretched only the 0.17 *visible* neck, so it needed a far larger factor for the same reach, and its
axis-aligned band tore `Seated jaw hinge tissue` in half. The tilted far cut here clears that mesh
entirely (its lowest corner sits at 1.09 of the region, past the cut), so it is translated whole.

No edge loops were added, which was a judgement made by looking. The band already carries real
density — 551 vertices over a region 0.355 long, so 1,553 per unit of length, halving to 788 when
the region becomes 0.699 — and bent through `TurnLeft` the neck's silhouette is a smooth arc with
no faceting and no polygonal edge. Interpolating vertices in would have added resolution and
nothing else: it cannot invent scales or cervical anatomy, and neither can the stretch. For those,
the pose.
