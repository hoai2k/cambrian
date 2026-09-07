# Dunkleosteus terrelli · V2

Original Blender specimen artwork, rebuilt after the initial art review. The canonical `build.py` runs `build_v2.py`; the old model and original Blender source are preserved under `cambrian/local/devonian-authoring/dunkleosteus/v1/`.

## Anatomical direction and uncertainty

Late Devonian Cleveland Shale, Ohio. The model represents an approximately 3.5 m individual, not a genus maximum. The compact muscular trunk, sloping cranial roof, integrated suborbital cheeks, large anterior pectoral fins and paired gnathal cutting apparatus were studied against [Engelman 2024](https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction), particularly the skeletal and living reconstructions in figures 3–4. Scale follows the revised framework of [Engelman 2023](https://doi.org/10.3390/d15030318). The model is original artwork, not a specimen scan or research-grade suture diagram.

Fossil armour and gnathal anatomy constrain the forebody. The rear-body outline, fin membranes, heterocercal caudal profile, eyes, living skin coverage and oral soft tissues require comparative interpretation. Pigmentation is entirely speculative. The palate, inner cheeks, oral floor and curved recessed pharynx are an aquatic soft-tissue interpretation; no mammalian tongue or invented filter apparatus is present.

## Geometry and materials

The cranial arch is a closed shaped surface with a flattened wedge roof, integrated cheek walls and concave palate underside. Shallow curved sutures are part of the living surface, not floating armour panels. The compact body uses deliberately shaped cross sections and supported subdivision, with a smooth posterior taper. Pectorals have broad cambered roots, swept margins and flexible distal controls. Median fins are closed airfoil sections with curved outlines and thickness at their roots.

The mouth uses an articulated closed lower-jaw shell and cranial bone. Their actual interior faces carry mucosa. Flexible cheek and pharyngeal lining has blended head/jaw weights; the anterior body envelope has an opening for the pharynx, preventing an exterior cap from appearing inside the mouth. Gnathals are integrated paired cutting wedges with pale worn cutting margins and darker roots, not rows of ordinary shark teeth.

Full GLB uses UV-mapped albedo, tangent normal and roughness maps. Full `COLOR_0` is neutral white, avoiding double multiplication of pigmentation in glTF. A separate `BakedPigment` vertex attribute is retained in the Blender source, copied to `Color` for the texture-free LOD. Fine normal relief is independently authored rather than treating colour as physical height. Cranial pigmentation is deliberately calmer than the posterior skin.

The original imagegen input is `skin-atlas-v2-source.png`. `materials_v2.py` transforms that input into a restrained wrapped pigment field, authors regional armour sutures, and creates all body/fin/gnathal/eye/oral PBR maps. The generated source is material art, never fossil evidence. Original generation: `/Users/hoai/.codex/generated_images/01a0794c-58af-7450-b605-70b764aae915/exec-0ff891b8-66bb-441d-bd80-a61ebd8a971d.png`; the repository input removes any dependency on that path.

Imagegen prompt:

> Use case: scientific-educational, original speculative material art for 3D paleoart. Create a flat unlit UV albedo texture atlas for Dunkleosteus living fish skin, landscape 2:1. All pixels are skin material: NO animal silhouette, NO scene, NO light direction, no highlights, no drop shadows, no text. UV layout: horizontal coordinate left-to-right runs head-to-tail; vertical top-to-bottom runs pale ventral underside at top edge, olive lateral side in upper quarter, very dark petrol charcoal blue dorsal back through middle half, olive lateral side in lower quarter, pale ventral underside at bottom edge. Thus vertical edges of the belly meet cleanly when wrapped around a fish. Overall dark ocean charcoal, bronze olive cheeks and flanks, warm muted ivory belly. Have irregular branching cloudy dark camouflage flecks along flanks, softer denser speckles at head end left, more elongated subtler pigmentation toward tail right, natural mottled transitions rather than stripes. Detailed tiny dermal pores, varied fine living skin grain, sparse subtle fine healed abrasions. NO large reptile scales, no armour plates, no repeating fabric pattern, no simple generic noise. Contrasty enough for a premium naturalistic game model, but plausible subdued aquatic animal pigmentation. This is a diffuse colour map only, flat uniform neutral illumination.

## Eye placement

Closed oval globes `eye_globe_L` and `eye_globe_R` lie inside `head_envelope_closed`. The orbital brow is sculpted into that actual continuous head mesh; there is no external orbital hoop or extra socket cup. `eyes-v2.json` and public metadata record globe centres, axes, radii, embedding samples and semantic mesh names.

The final independent exported-polyhedron BVH parity audit measured **84.31% left / 84.17% right** volume embedded in the full head and **84.28% left / 84.06% right** in the reduced LOD. All four conservative 95% lower bounds exceed 83.7%; all have zero ray disagreements and closed head/globe topology. `eyes-export-verified.json` retains the final SHA-bound reports. These are actual volume samples, not visible-surface vertex percentages, and no orbital rim is counted as surrounding head.

## Reproduction

Run from repository root:

```sh
python3 tools/devonian/creatures/dunkleosteus/materials_v2.py
DUNK_SKIP_RENDER=1 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/build.py
python3 tools/devonian/creatures/dunkleosteus/finalize.py
DUNK_RENDER=all /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/render_v2.py
DUNK_RENDER=palate /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/render_v2.py
DUNK_RENDER=feeding /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/render_v2.py
python3 tools/devonian/creatures/dunkleosteus/portraits.py
DUNK_RENDER=playback /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/render_v2.py
python3 tools/devonian/creatures/dunkleosteus/review_assets.py
```

Blender 5.2 and Python with NumPy/Pillow are used. Blender may need execution outside the macOS sandbox for Metal initialization; Cycles uses two CPU threads. The source is saved before LOD decimation at `cambrian/local/devonian-authoring/dunkleosteus/v2/dunkleosteus-v2.blend`. All source images are packed. Exact-pose reviews are under its `final-review/` directory. `DUNK_RENDER=playback` renders sequential frames for animation review. The finalizer verifies identity scale channels before removing them; it also removes constant root tracks and validates decoded export geometry, weights, loop endpoints and anchor poses.

## Animation direction

The 18 full-model actions use anatomically separate jaw, fin and tail controls at 30 fps. The root is stationary; body movement is local. Armour remains bound rigidly to head/body and never follows posterior tail bones. The four seamless loops are Idle, Swim, Guard and Eat. Death holds its terminal side-roll pose. Growth is a relaxed display without body scaling or moulting. Action labels provide compatibility and do not define Devonian game rules.

| Clip | Seconds | Authored gesture |
| --- | ---: | --- |
| Idle | 2.4 | Restrained caudal correction, breathing jaw and pectoral balance |
| Swim | 2.4 | Two stronger caudal cycles with delayed posterior wave and paired fin trim |
| TurnLeft / TurnRight | 1.6 | Bank and steer with asymmetric pectorals and counter-curved tail |
| Dive / Rise | 1.4 | Body pitch, head compensation and independent fin-plane changes |
| Attack | 1.0 | Anticipatory recoil, cranial elevation, jaw opening and closing lunge |
| Bite | 0.5 | Shorter, smaller cutting-jaw snap |
| Heavy | 1.1 | Larger jaw excursion with pectoral bracing and heavy closing recoil |
| Hit | 0.6 | Single destabilized recoil sequence |
| Death | 1.6 | Progressive lateral roll, settling fins, slack jaw and held pose |
| Guard | 1.0 | Broad pectoral brace with breathing and tail balance |
| Parry | 0.367 | Short bank, cranial brace and opposite caudal response |
| Dodge | 0.4 | Local lateral thrust, bank and tail counter-bend |
| Eat | 1.2 | Seamless jaw-processing cycle with subdued fin corrections |
| Stagger | 1.2 | Longer repeated recoil oscillation and asymmetric balance |
| Ability | 1.8 | Deliberate large gape followed by a separate smaller closing gesture |
| Growth | 1.5 | Relaxed head lift, fin spread and mild jaw movement |

Parry is rounded to eleven 30 fps frame intervals. Non-loop actions recover their initial pose except Death. No grasping anatomy is invented, so no Grab action is included.

## Export contract and evidence

Both models retain the same 16-joint graph and three non-deforming jaw sockets: `anchor_mouth`, `anchor_mouth_inside`, `anchor_attack_primary`. Nested `cambrianAnchor` v1 data records mouth/swallow/attack roles. No fabricated CCD chain is supplied. glTF uses +Z forward and +Y up; the measured neutral length is 3.4419 m. Spread pectorals account for the broad full width.

`validation.json` contains current exact geometry counts, file hashes, actual LOD reduction, root/scale checks, and jaw/head quaternion excursion evidence for Attack, Bite, Heavy, Eat and Ability. Full and LOD contain 18 and three clips respectively. The LOD retains Idle, Swim and Death as required by the shared production contract.

The four public PNGs are rendered from the final full source: studio and selection 1600×1200 RGBA, card 800×600 RGBA, thumbnail 256×192 RGBA. Intermediate review files are never substitutes for the shipped portraits. The action sheet and final visual review notes are recorded alongside the source after completion.


## Final V2 visual review

Full export: **105,090 triangles, 56,596 vertices, 15,136,420 bytes**. LOD: **30,872 triangles, 18,135 vertices, 1,818,076 bytes**, 29.38% of full triangles. These are raw pre-packaging exports; runtime lossless compression can change file hashes and bytes without changing geometry.

Reviewed the final three-quarter portrait, neutral side/front/uncropped dorsal views and eye closeups. Exact Heavy maximum-gape and closing views plus Bite/Eat views show a fitted mucosal floor and covered cheeks. Directly lit below-frontal palate review confirms the curved recessed pharynx, with no external body cap or concave skull-cap triangles across the opening. The original cap defect was fixed by triangulating concave caps before subdivision, not by hiding it in shadow. Mandibular floor weights are fully jaw-driven; soft blending is localized to the commissures and pharynx.

Reviewed sequential frame strips spanning Swim, Heavy, Dodge, Eat, TurnLeft and Death; local GIFs preserve their authored timing. These show posterior wave delay, accelerating tail sweeps, asymmetric fin banking, feeding anticipation/gape/closure/recovery and a held death pose. The interactive viewer was also reviewed earlier during the iteration; the Mac locked during final review, so final sequential renders and independent decoded GLB checks provide the last-pass evidence. The integration owner performs final browser release verification.

`validation.json` measures jaw/head excursions in every feeding action: Bite 36.80° / 6.90°, Attack 47.49° / 8.95°, Heavy 56.69° / 10.64°, Eat 27.50° / 5.16°, and Ability 49.27° / 9.26°. Bone rotations, rather than object scaling or an unrigged mouth swap, drive these motions.

All four portraits are derived from the final source. `action-review.jpg` is the compact nine-action sheet. Full-resolution closeups, six motion GIFs and their frame strips are retained locally in `v2/final-review/`. Anatomical uncertainty remains in the posterior reconstruction, living integument, pigmentation and oral soft tissue, as described above; these artistic interpretations are not fossil measurements.
