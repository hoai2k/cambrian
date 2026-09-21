# Nothosaurus — paired authored body and procedural volume puppet

The delivered Tripo body and procedural puppet preserve the canonical model's curved tail, asymmetric spread feet, deep torso and elevated snout, with the head turned to face straight forward (see the 20 September note at the end). Both use one 30-joint skeleton, the same three mouth/attack sockets, and **21 byte-for-byte equivalent decoded animation performances**. The puppet is also the runtime LOD, with all actions retained so either model can perform the same gameplay.

| Delivery | Triangles | Packaged bytes |
| --- | ---: | ---: |
| `nothosaurus.glb` — authored Tripo body, with authored foot webbing | 28,712 | 1,993,448 |
| `nothosaurus.puppet.glb` — procedural twin | 9,366 | 747,388 |
| `nothosaurus.lod1.glb` — identical puppet alias | 9,366 | 747,388 |

Files are in `public/assets/triassic/creatures/`, with matching studio, 1600 × 1200 transparent select, card and thumbnail portraits, plus metadata. Meshopt packaging preserves mesh attributes and animation sample values exactly. Textures are embedded. The model is 5.256 engine authoring units long — 5.000 before the neck was lengthened, and the runtime normalizes by the body's own box either way — faces +Z in glTF and uses +Y up; runtime applies the species' natural size. The research registry supplies the 6 m representative length.

## Source and reconstruction

The preserved source is `tools/triassic/creatures/nothosaurus/tripo-raw/nothosaurus.raw.glb`, SHA-256 `5cb48becbdcbbc3863519bca8a2bb99c5129c6a0e5b1affb6252e15e01c49604`. It came from Tripo task `ea4528e3-1f9a-42f4-b0c4-2b84b879ff7c`, using `docs/triassic/canonical/model-inputs/nothosaurus/input.png` (the intake metadata records the image hash). The raw file is never changed.

The twin is a procedural **volume resurfacing**, rather than a generic anatomical substitute or a decimation of the authored faces. Blender regenerates topology from a 0.007 raw-unit voxel occupancy field, relaxes that surface twice, and reduces the new topology to the puppet budget. Source vertices and faces are not reused. This preserves the asymmetric tail sweep and individual paddle silhouettes that a symmetrical ellipsoid proxy would lose. Puppet pigment is sampled through each nearest source triangle’s interpolated UV. The authored body retains the full embedded original albedo with white vertex colors, restrained normal relief (0.15) and explicitly nonmetallic skin at roughness 0.7.

Intake welds coincident texture-seam vertices and removes ten collapsed triangles; the detached-flake threshold removed no vertices. It then closes the five hairline slivers the welded mesh still carries and authors the webbing between the digits of all four paddles — see *The webbing* below. A true, separate lower-jaw shell is cut along a plane fitted to the lip the generation modelled and rigidly skinned to its hinge. Closed rigid palate and floor shells and two rigid hinge halves, joined as one hidden `Nothosaurus oral lining`, close the interior without a wall stretched between the jaws. The source's fine surface and tooth detail remains limited by the Tripo reconstruction.

`nothosaurus-profile.json` records **21 exact plane-intersection envelopes** of both actual meshes, spaced over the built body's own axial extent rather than a typed range. Maximum width/dorsal/ventral envelope difference is **0.13596 units (2.59% of body length)**; the tolerance is 0.2 units (4%). The two rows over 0.12 are the fore- and hind-paddle stations, where the voxel resurfacing rounds the webbed digits. The grid-free measure is the one to read for pair agreement: nearest puppet-surface distance over authored body vertices has maximum **0.11904 (2.26%)** and 95th percentile **0.01621 (0.31%)**. The webbing moved both a little — the envelope figure down from 0.13856 as the twin now has a paddle to round rather than five separate digits, and the 95th percentile up from 0.01018, because the membrane is a thin sheet and the twin's 0.007 voxel thickens it. The joint and socket coordinates are shared, so their parity error is zero. These are generated measurements, not a claimed new human anatomical sign-off.

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
- [The four webbed paddles against magenta](webbed-feet-sheet.jpg)

The current portraits and action sheets are rendered from decoded packaged files after the material correction. Packing assertions establish unchanged geometry and animation values. No independent human review is invented by this automated QA record.

## Reproduction

Run from the repository root with Blender 5.2 and installed project Node dependencies:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/build.py
node tools/triassic/creatures/nothosaurus/audit.mjs --package --decode
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded --puppet
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/nothosaurus/render.py -- --decoded --feet-only
python3 tools/triassic/creatures/nothosaurus/contact-sheets.py
```

The paired editable Blender project, decoded review GLBs, logs and individual frames live in `local/triassic-authoring/nothosaurus/`. `build.py` authors both geometry and performance and writes only this species' asset family. It does not modify shared registries or perform git operations. The macOS sandbox may block Metal initialization even for background work; the same Blender command succeeds with its normal approved desktop permissions.



## The webbing, and the five slivers — 14 September 2026

`docs/triassic/research.md` line 44 asks this animal for *"webbed, paddle-like feet with retained
digits"*. The generation delivered the digits and no web. Rendered against a saturated ground —
which is how it was found, because against the sea a gap between two toes is just a dark patch —
**all four paddles showed background straight through the notches between the digits**, and there
was one outright hole in the fore paddle between two of them. The hind feet read as clawed hands,
not as paddles: five long free digits, splayed, with the notches open to the background for most of
their length.

The gaps are **absent geometry, not open boundaries**. The welded intake carries ten boundary edges
in five two-edge slivers of perimeter 0.006–0.011 engine units, all on the flank and the ankles and
none of them between the toes. So the fix is a membrane.

### What the membrane is

Authored, but **shaped by measurement rather than invented**, and it wears the animal's own skin.
Per paddle, in `web_paddle`:

1. the foot is taken as the vertices within `WEB_FOOT_R` of the paddle joint and forward of the
   wrist — the same two points the rig's limb chain is built on;
2. it is projected onto the horizontal plane (all four paddles sit within 15° of it, measured) and
   its silhouette rasterised at `WEB_CELL` = 0.0018 raw, about 60 cells across a foot;
3. the web is the **morphological closing** of that silhouette minus the silhouette itself — a disc
   of `WEB_CLOSE` = 0.026 rolled over the outline — which is exactly the notches between the toes,
   and which leaves a webbed foot its scalloped concave free edge without anybody drawing one;
4. its two faces are the paddle's **own upper and lower surfaces**, extrapolated off the digits into
   the notches and then relaxed, so the membrane meets each digit at that digit's own surface and
   curves as the foot curves rather than sitting flat;
5. the thickness tapers to `WEB_TAPER` = 0.28 of the local flesh at the free edge;
6. it is **seated, not butted**: a collar of cells over the digits themselves is carried at
   `WEB_SEAT` = 0.78 of their thickness, so the sheet runs inside the toe and no seam shows.

The patch is then smoothed, triangulated and decimated to `WEB_DECIMATE` = 0.30, given the body's
material and a white COLOR_0, and joined to the authored mesh before anything is derived from it —
so the procedural twin resurfaces the webbed volume, the rig's own `weights()` skins the membrane
to the paddle bones by position like any other flesh, the profile stations measure it, and all 21
clips are sampled against it.

### It wears the animal's own skin

Every web vertex takes a UV from the nearest point on the original surface, through that triangle's
own barycentric map — the same lookup the twin's pigment uses. Nearest-surface alone is not enough:
where the nearest digit changes, the UV field jumps, and the albedo then draws **contour lines
across the membrane**, which the first build did visibly. So the vertices that are seated inside a
digit (within `WEB_PIN` = 0.0016 of the original surface) keep their measured UVs and the free sheet
between the digits is relaxed to them over `WEB_UV_RELAX` = 120 passes. The result is one continuous
map: the same 2K Tripo albedo runs from one toe across the web to the next.

Nothing is remeshed and no UVs are lost anywhere. The original surface is untouched; the membrane is
added to it.

| | fore L | fore R | hind L | hind R |
| --- | ---: | ---: | ---: | ---: |
| web cells (the notch area itself) | 238 | 332 | 455 | 376 |
| patch cells, with the seated collar | 1,389 | 2,010 | 1,689 | 1,628 |
| vertices seated in a digit, keeping measured UVs | 397 | 523 | 393 | 447 |
| vertices whose UVs are relaxed between them | 385 | 612 | 543 | 462 |
| vertices / triangles delivered | 782 / 1,568 | 1,135 / 2,270 | 936 / 1,868 | 909 / 1,814 |

The four membranes add **7,520 triangles**, a 39 % increase on the intake mesh, and 146 kB packaged.
Most of that is the collar rather than the web: the notches themselves are 1,401 cells of the 6,716
the patches cover. The seating depth was set by the hole check below, not by eye — at
`WEB_COLLAR` 4.5 / `WEB_SEAT` 0.78 one slit stayed open between a web edge and a digit, at 7.0/0.66
it was six pixels, and at 9.0/0.60 it is gone. The build is reproducible: two consecutive runs
write byte-identical GLBs before packaging (meshopt's own stream differs by a few bytes between
packagings, which is why the packager verifies by value).

### The five slivers

Each is a hairline crack whose two sides are separate vertices a few ten-thousandths apart, not a
hole with an area. Naming the missing triangle only moves the crack along — it closes two of the
five and leaves the third side of each new triangle open — so they are closed by a second weld pass
at `SLIVER_WELD` = 5e-4 raw, which merges **six vertices of 9,608** and drops twelve degenerate
faces. Open boundary edges go from **10 to 0**; the only boundary the delivered body carries is the
jaw cut, which is meant to be there. 0.0025 engine units is under three millimetres on a six-metre
animal.

### What the renders show

`render.py -- --feet-only` puts a camera on each paddle from above, from below and from outside,
against a **magenta ground**, which is how the gaps were found and is the only way to be sure they
are gone. Idle, so nothing is hidden by a pose.

[`webbed-feet-sheet.jpg`](webbed-feet-sheet.jpg) is the twelve frames.

**Before:** five splayed digits per foot with the ground visible between every pair, an outright
hole on the fore paddle, and the hind feet reading as hands.
**After:** four webbed paddles with a scalloped free edge, the digits still legible as ridges inside
the membrane, and no background anywhere between them.

That last clause is counted rather than judged. In each of the twelve frames, every background pixel
whose 4-connected region does not reach the image border is background seen *through* the foot. On
the delivered body that count is **zero, in all twelve frames**, against one 87-pixel slot in the
fore-right paddle before the seating was deepened.

### The webbing does not tear

`node tools/triassic/skin-tears.mjs` measures every triangle edge against its rest length over all
21 clips, which is the check the paired audits structurally cannot make — they measure where
vertices *are*, and travel from rest stays bounded while a foot is pulled inside out. Against the
body before the webbing and the body after it, the table is **identical**: worst 2.98x on
`fore_upper_R` in Sprint, 2.77x on `tail_01` in Dodge, 2.58x in Guard, 29/6/14 edges past 2x, 3 of
21 clips. The webbing adds 11,254 edges to the measurement and **not one of them tears**: the
membrane is skinned by the same `weights()` the flesh around it uses, from its own position, so it
moves with the paddle rather than being stretched across the joint.

What it is not: the membrane is a smooth sheet. It carries the skin's painted markings, stretched
between the toes, but it has no relief of its own — no wrinkles, no radiating folds along the digit
lines, nothing where it meets the toe. Close up it reads as skin pulled between the digits rather
than as webbing with its own anatomy. The digits keep the generation's downward curl, so the paddles
still read a little like curled hands from some angles; a paddle-like *stance* is a pose question,
not a mesh one.


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

## The head, turned to face straight forward — 20 September 2026

The owner's note: *rotate Nothosaurus' head pose to face straight forward (which will also help
align his mouth cut better)*. Done in `build.py`, in the mesh before binding, and never as a
runtime patch or a keyed offset — the rig, the twin, the weights, the jaw cut, the oral shells, the
sockets and all 21 clips are generated downstream of the turned mesh and follow it by themselves.

**Where the head was.** Measured on the stretched intake in the builder's raw frame (x snoutward,
y left, z up): the head's own axis — a line through the section midpoints of everything ahead of
the skull joint — ran **20.35° to the animal's right** (yaw −20.35°) and 1.3° down. The frame's
sign is the builder's typed constant and the mesh is asked to agree before anything moves: the
snout stands 0.145 ahead of the skull joint and tapers to under 0.7 of the head's rear half-width,
which a neck does not. The neck's centreline, walked from the shoulder (x 0.29) to the skull joint
(0.406) in twelve stations, leaves the shoulder at −11.8° and arrives at the head at −32.4°; the
head sits 12° back from its own neck's end tangent, and that angle is the generation's and is kept.

**How it was turned.** Dinocephalosaurus' carry: each neck section is carried rigidly from its
measured frame onto a target axis of the same segment lengths (arc 0.152 raw), whose yaw eases
from the root's own to the value that leaves the head, carried whole by the last frame, along +x.
The frames are built on the vertical rather than parallel-transported, so a yaw carries no
incidental roll. A vertex within 0.06 raw of the centreline is carried whole, one beyond 0.13 not
at all, with a smooth edge between, so the shoulders and the paddle roots stay exactly where they
were: 1,276 vertices carried, 833 rigid with the head, largest move 0.071 raw (the snout tip).
After: head yaw **−0.29°**, pitch −0.97°; the builder asserts |yaw| < 1.5°. The animal is 5.336
engine units long now against 5.256 (the neck no longer curves sideways), which the runtime reads
off the box either way. `validation.json` carries all of it under `neckUnbending` (`applied: true`,
so `base-poses.mjs` publishes the untouched generation as `nothosaurus.origpose.glb` beside the
body for comparison; the neck stretch is marked `applied` there too, which it always was).

**The cut, fitted to the lip.** The old seam was a horizontal plane at a typed height. Read
against the lip the generation modelled — each head vertex's normal cast back into the mesh and
the hits within a lip's depth kept, Placodus' method, 180 hits on this head — it sat on average
**0.0027 raw below the lip, 0.0048 on the left flank and 0.0011 on the right** (rms 0.0127): the
cut ran through the lower lip on one side and along it on the other. On the turned head one plane
is fitted through all the hits (188, none dropped by the 2.5-rms pass), `z = a + b·x + c·y`, and
that is the cut and the seam of the oral shells: pitch −4.6°, tilt across the head 3.9°, mean
residual per flank **+0.0009 left / −0.0009 right** (rms 0.012 either side — the hits' own
scatter, which the old figure also carried). The countershading boundary is measured beside it
because it is what an albedo read finds first: it reads 13° of roll on this head where the slit
reads 4°, since the pale zone's upper edge sits above the lip on the left flank, so it is recorded
and not followed, and the head is not rolled.

**The mouth inside.** The palate and floor are as they were — separate closed thin shells, rigid
to skull and jaw — laid along the turned head's measured centreline either side of the fitted
plane. The hinge tissue, which was one ellipsoid with weights blended between the two bones (a
wall stretched between the jaws in miniature) and stood proud of the throat at the mouth corner,
is two rigid halves cut at the lip plane 0.004 either side of it, each capped and closed, seated
on the head's own section at the cut (radii 0.022 × 0.019 × 0.025 raw, measured) and proved inside
the closed intake by ray parity — 290 of 290 vertices, no shrink needed. The four are joined into
one mesh, `Nothosaurus oral lining`, so the runtime classifier hides it as one thing (it used to
draw `Oral floor`, whose name matched nothing) and `oral-shell-audit.mjs` proves the contract on
the packaged files: one unit weight per vertex, no triangle bridging the bones, every edge shared
by two faces, both halves present. Strict-cull gape (`gape-solid.py`, Bite@0.25 / Heavy@0.3 /
Attack@0.25): **53 / 43 / 47 px** of backdrop seen through the body before, **1 / 0 / 0 after**,
against a tolerance of 12; `throat-audit.mjs` reports 0 mixed skull/jaw vertices where the old hinge
tissue had 146.

Skin 2.98x before and after (`skin-tears.mjs`: Sprint on `fore_upper_R`, the same edge); every
joint owns skin; the `Swim`/`Sprint` steady-head authoring is untouched.

The `Walk` gait that landed on `main` the same day (`tools/creatures/motion/performances/nothosaurus.mjs`,
applied with `apply.mjs` to the shipped authored file, not built here) was re-applied on top of the
rebuilt file the way that tool is meant to be replayed, so the authored GLB carries 22 clips and the
puppet and LOD the builder's 21, exactly as on `main`; `skin-tears.mjs` reads `Walk` at 2.99x on the
rebuilt body against 3.10x on `main`'s. `material-audit.mjs` still passes; its position match now
finds 9,312 of the source vertices where it found 11,542, because the turned neck and head are no
longer where the stretch alone would put them — those carry their UVs unchanged by construction,
the turn moves positions only.
`docs/triassic/throat-repairs/nothosaurus-head-before.png` and `-after.png` are the same two
cameras on the shipped file — from above, where the yaw shows, and from the animal's right.

## T3D-28: the mouth is the cut, capped with its own rim and domed

The `Oral floor`, the `Palate` and the two rigid hinge halves are retired. All four were closing
holes this builder's own cut had made — the opening itself, the head's cross-section at the skull
joint, and the mandible's rear face — and all three of those are now closed with the cut's own rim:
`T.cap_cut` over the two cross-sections (64 faces authored / 31 twin per half) and `T.cap_mouth`
over the lip (1,359 / 513 faces per half), each cap part of its own half and therefore rigid on that
half's bone through the same weight field as the skin round it.

**This body is the generalisation test for the construction**, because its cut is not a curve in one
coordinate but a *plane fitted to the modelled lip on both flanks*, `z = a + b x + c y`, carrying the
lip's pitch and its tilt across the head. Nothing in `cap_mouth` knows what shape the cut was: the
rim is what bounds the cap, so a fitted, tilted cut is followed for free. `T.cut_rim` reports what
the cut left open before anything is built — **225 boundary edges per half**: the head's
cross-section at the skull joint (62 edges, which `cap_cut` fans first) and then **163 in six
closed curves** — the lip (125 vertices) and five small loops this generation's own modelled slit
contributes at the snout, every one of them on the fitted plane. All six are capped, and the closure is asserted rather
than rendered for: `cap_mouth` refuses a rim that is not closed curves and fails if any boundary it
was given survives.

The dome is 0.34 of each cap vertex's own distance from the nearest rim vertex, bounded at 0.55 of
the head's own measured section above or below the lip plane; deepest push 0.0106 raw on a mouth
0.13 long. Seating is asserted against that **section** — 0 of 604 palate vertices outside — and the
ray-parity count is *recorded* beside it rather than asserted, because this generation models a slit
and parity against a closed intake calls 58 of those 604 outside: they are in the lumen the
generation drew, which is the case `CLAUDE.md` warns about.

| Measurement | Before | After |
| --- | --- | --- |
| `gape-solid.py --as-drawn` opened, `Heavy`/`Bite`/`Attack`/`Eat` | 2,790 / 2,509 / 2,044 / 1,849 | **0 / 0 / 0 / 0** |
| `gape-solid.py --as-drawn` through | 2 / 0 / 3 / 2 | **0 / 0 / 0 / 0** |
| `skin-tears.mjs` | 2.98x | 2.98x |
| `lag.mjs` | 1 pair open past 0.2 %, worst 0.28 % at `Heavy@0.13` | the same one pair, unchanged |
| `oral-shell-audit.mjs` | palate + floor + two hinge halves | no oral lining on any variant |

[The mouth as the game draws it, at `Heavy`'s widest](../../../../docs/triassic/verification/nothosaurus-mouth-after.png).
