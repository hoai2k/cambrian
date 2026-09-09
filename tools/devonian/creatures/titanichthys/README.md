# Titanichthys specimen source

This independently authored model is a reconstruction of **Titanichthys termieri**, with the broad oral aperture, slender toothless jaw margins, small relative eyes and head/thoracic armour distinguishing it from a predatory arthrodire. It has a contiguous shaped body, a recessed oral funnel, a flexible posterior and individually articulated paired fins. The mouth has neither cutting teeth nor invented baleen.

## Evidence and reconstruction limits

[Coatham, Vinther, Rayfield & Klug (2020), *Was the Devonian placoderm Titanichthys a suspension feeder?*](https://pmc.ncbi.nlm.nih.gov/articles/PMC7277245/) reports the nearly complete, 96 cm left inferognathal PIMUZ A/I 4716 from the Southern Maïder basin, Morocco. The edentulous jaws and biomechanical comparison support suspension feeding; a filtering apparatus is not preserved. Small relative orbits are also reported. DOI: 10.1098/rsos.200272.

The whole-body outline, fin and tail proportions, soft oral tissues and pigmentation here are artistic hypotheses. Armour sutures are an illustrative arrangement, not a digitized plate map from a complete specimen. The conservative heterocercal tail and unspined paired fins provide a coherent complete reconstruction while retaining that uncertainty. Detailed internal filtering structures are deliberately omitted. The 5 m representative display length is an illustrative reconstruction scale, not a measured complete specimen or a species maximum.

## V2 anatomy and original material art

[Boyle & Ryan (2017)](https://doi.org/10.1017/jpa.2016.136), including their comparative dorsal reconstructions in figure 1, supplied the redesign's broad, compressed shield constraint. Their generic diagnosis gives a head-shield length/width ratio of 0.5–0.54, thin smooth plates and slender edentulous jaws with ventrally projecting anterior tips. The modeled shield is 1.37 units long and 2.72 units wide (0.504). The complete living-body outline and exact species-specific suture details remain hypotheses.

V2 replaces the cylindrical first head with a curved soft snout, broad compound-curved shield, deeper muscular trunk and fleshy fin bases. Shallow suture depressions are sculpted directly into the continuous outer mesh. They are not intersecting patches or floating plates. Closed fin membranes carry restrained surface relief and baked ray detail; there are no separate ray needles crossing the membrane. The cavity has a three-dimensional palate, folded cheeks, lower floor and downturned rear throat. Its inferred soft folds are not a claimed fossil filtering apparatus.

The globes are true spheres placed inside the continuous head. The upper tissue margin is fitted to the eye/head intersection and blends into the outer surface, with no separate orbital hoop. `eyes-v2.json` records deterministic uniform volume sampling; the independent shared eye audit measures the actual exported globe polyhedra against the continuous head, excluding eyelids and decorative surfaces. See final audit references in `review.md`.

`integument-source.png` is original bitmap art created with the built-in imagegen tool, inspected before use. It is a pigmentation study, not an anatomical reference. `material-provenance.md` preserves its prompt and provenance. `materials_v2.py` bakes coherent dorsal/ventral/lateral colour fields, multi-scale pigmentation, fine surface relief and regional roughness into UV atlases: body 2048×1024, fin 1024×1024, oral 1024×512, each with albedo, tangent normal and roughness. Colour/normal/roughness data use their appropriate image colour spaces; all materials are nonmetallic.

The detailed export uses the atlas colours with neutral vertex multipliers. The texture-free LOD receives atlas-matched linear vertex pigmentation before decimation, preserving regional colour without multiplying the full albedo twice. The original high-resolution Blender file retains the complete material graph, editable surface construction and all actions.

## Reproduction

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/titanichthys/build.py
python3 tools/devonian/creatures/titanichthys/check-export.py
node tools/devonian/creatures/titanichthys/review-viewer.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/titanichthys/review-oral.py
node tools/devonian/eye-audit-export.mjs --working titanichthys
```

Run the shared `eye-audit.py` in Blender with the printed snapshot directory. The viewer review script expects the development server at `http://127.0.0.1:5173`; override `QA_BASE_URL` if needed. It loads the real exported GLB through Three.js, runs the shared full/LOD clip/socket audit and saves every action plus neutral/eye/mouth views.

Local `.blend`, source comparison, build logs and full-resolution review renders:

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/`

V1 published GLBs, portraits and source are preserved separately in its `v1/` directory. Override the working author directory with `DEVONIAN_AUTHORING`. Exports go only to `public/assets/devonian/creatures/titanichthys*`. All four portraits are regenerated from the final model; selection is RGBA 1600×1200 and thumbnail 256×192. Blender uses two threads and may need graphics access outside the macOS sandbox. Integration can apply lossless GLB compression afterward.

## Motion library

All clips use 30 fps. Compatibility action names describe specimen motions, not Devonian gameplay rules. There is no scale animation or exoskeleton shedding. Locomotion is tail-driven, with slower pectoral stabilization and separate jaw, throat, gill, pelvic and distal-fin motion. Loop endpoints match; each one-shot has recovery except the held terminal Death pose.

| Clip | Seconds | Authored motion |
|---|---:|---|
| Idle | 2.4 | Quiet tail sway, slight fin trim, oral ventilation; loop |
| Swim | 2.4 | Stronger phase-delayed posterior wave with caudal follow-through; loop |
| TurnLeft / TurnRight | 1.6 each | Opposed local bank/yaw with curved tail steering and recovery |
| Dive / Rise | 1.4 each | Local pitch and fin trim with swimming follow-through |
| Attack | 1.0 | Short shield-first forward contact gesture with anticipation and retreat |
| Bite | 0.5 | Gentle edentulous oral opening/closure cycle |
| Heavy | 1.1 | Slow shoulder/contact sweep, tail counter-bend and fin brace |
| Hit | 0.6 | Brief recoil with lateral imbalance |
| Death | 1.6 | Swimming attenuates, fins relax and body settles into a held modest side roll |
| Guard | 1.0 | Fin-spread stabilizing posture and slight head lift; loop |
| Parry | 0.35 | Short shield deflection and counter-bank |
| Dodge | 0.4 | Rapid C-curve and asymmetric pectoral trim, then release |
| Eat | 1.6 | Slow pumping gape with oral, throat and gill coordination; loop |
| Stagger | 1.2 | Two damped lateral imbalance beats and recovery |
| Ability | 2.4 | Broad sustained ram-feeding gape with pectoral spreading, then closure |
| Growth | 1.5 | Relaxed fin extension and modest body presentation; no scaling |

## Sockets and export review

The three v1 compatible sockets are `anchor_mouth` on jaw, `anchor_mouth_inside` on skull, and `anchor_attack_primary` on skull. The last marks anterior shield contact, not a predatory biting edge. They use nested `cambrianAnchor` extras and intentionally have no CCD chain because a fixed articulated oral reference is sufficient here. `anchors.json` records Blender world bind coordinates; the builder calculates exported parent-local coordinates using each glTF bone's inverse bind world transform. Full and LOD retain the same skeleton/socket hierarchy.

The full export contains all 18 clips. The decimated LOD retains exactly Idle, Swim and Death. `validation.json` records geometry reduction, weights, finite deformation bounds at five phases of every clip, loop/recovery seams, stable root and absent scale channels. Exporter-generated constant root/scale tracks are verified against bind transforms and removed; authored motion remains intact. The root's fixed glTF axis-conversion rotation is retained.

Review images cover Idle and Swim laterally, Eat and Ability frontally, Bite and Dodge laterally, and Heavy, Guard and Death in three-quarter view. See `review.md` for the visual inspection result and any amendments made after inspection.
