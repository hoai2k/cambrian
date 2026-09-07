# Doryaspis nathorsti

Bespoke jawless fish reconstruction for the Devonian specimen collection. The shield, cornual plates, pseudorostrum and hypocercal tail were authored for this animal. Low-level loft/tube, Blender export and pose-review utilities derive from the project's Coccosteus authoring script; its body geometry, fins, jaws and animation code are not reused.

## Anatomy and evidence

The flat-topped, ventrally bulged cephalic armour carries fixed lateral cornual extensions. A narrow ventral pseudorostrum projects forward below the anterior mouth. The dorsal eyes are small and dark. The flexible, scaled posterior ends in a hypocercal caudal fin, with the downward continuation of the body axis made explicit. There are no pectoral, pelvic or dorsal fins, and no fabricated biting jaws. Both sides have one branchial opening. Longitudinal ridges distinguish the shield from the small lozenge ornament of the posterior body.

- [Pernègre (2002), genus revision](https://www.tandfonline.com/doi/abs/10.1671/0272-4634%282002%29022%5B0735%3ATGDWHF%5D2.0.CO%3B2): revised D. nathorsti and its complete caudal fin.
- [Botella, Fariña and Huera-Huarte (2024)](https://www.nature.com/articles/s42003-024-06837-8): rigid shield geometry, fixed cornual plates, hypocercal tail and Wood Bay depositional context; the hydrodynamic investigation informs the contrast between rigid front and flexible tail.
- [Purnell (2002)](https://pmc.ncbi.nlm.nih.gov/articles/PMC1690863/): heterostracan oral anatomy and uncertainty in feeding interpretations.

Pigmentation, exact soft-tissue relief, oral pocket depth and animation timing are artistic reconstruction. The fixed projection's function and exact diet remain unresolved. Tiny marginal tubercles are dermal ornament, not a row of functional jaw teeth. A 0.20 m individual is an illustrative representative scale, not a claim of maximum size. The model uses an enlarged authoring coordinate system and metadata preserves its length for normalization.

## Rig and motion

Ten bones: identity root, body, rigid shield, oral membrane, five sequential posterior bones and caudal fin. Armour and extensions are weighted only to the shield. The oral membrane has very small local pulses; the pseudorostrum never hinges. Three bone-parented sockets have nested `cambrianAnchor` extras and exact parent-local transforms in both GLBs. Mouth and swallowing sockets refer to the real opening above the projection base; attack is an anterior shield/contact reference.

| Clip | Seconds | Authored interpretation |
| --- | ---: | --- |
| Idle | 2.4 | Quiet trim with gentle posterior and oral movement |
| Swim | 2.4 | Progressively phased tail propulsion with stronger burst/coast modulation |
| TurnLeft / TurnRight | 1.6 | Shield bank with directed posterior curvature |
| Dive / Rise | 1.4 | Pitch adjustment and independent vertical tail trim |
| Attack | 1.0 | Brief approach/contact and withdrawal, no bite |
| Bite | 0.5 | Small oral pulse and anterior lift, no hinged jaw |
| Heavy | 1.1 | Anticipation, broad shield displacement and tail counter-motion |
| Hit | 0.6 | Short lateral recoil and recovery |
| Death | 1.6 | Tail settles, restrained roll and held terminal posture |
| Guard | 1.0 | Repeating low-amplitude shield trim |
| Parry | 0.35 | Brisk shield bank and return (10 frame intervals at 30 fps) |
| Dodge | 0.4 | Bank, local lateral displacement and tail counter-flexion |
| Eat | 1.6 | Repeated oral intake gestures with gentle station holding |
| Stagger | 1.2 | Two diminishing lateral corrections |
| Ability | 2.4 | Rising trim and lateral inspection gesture; no gameplay specified |
| Growth | 1.5 | Relaxed posture and posterior extension without scale changes |

Idle, Swim, Guard and Eat loop. Other clips recover to neutral; Death holds its final pose. There is no Moult or grasp animation because the anatomy provides neither a moulting exoskeleton nor grasping appendages.

## Reproduction

From the repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/doryaspis/build.py
python3 tools/devonian/creatures/doryaspis/review.py
node tools/devonian/check.mjs doryaspis
```

Blender may need an unsandboxed invocation for its Metal initialization. The builder is standalone and only writes this creature's outputs. Set `DEVONIAN_AUTHORING` to redirect local sources and review renders. Default editable file: `../devonian-authoring/doryaspis/doryaspis.blend`.

`skin-normal.png` is a deterministic procedural grain normal map authored in the builder; vertex colours retain mottled olive and warm mineral tones in the LOD. No external image/model downloads or generated anatomical imagery were used. The four final portraits are actual Cycles model renders, with a 1600×1200 transparent selection portrait and 256×192 thumbnail.

## Validation

The original has 91,558 triangles; the LOD has 25,629 (28.0%). Both preserve the ten-bone skeleton and all three sockets. Full model contains 18 distinct clips; LOD keeps Idle, Swim and Death. Builder checks normalized finite weights, finite geometry over five phases per action, neutral recovery, seamless loops, stable root and no exported scale channels. `validation.json` records bounds and quantitative checks. `action-review.jpg` shows nine action poses across lateral, frontal and three-quarter views; original PNGs are preserved in the local authoring directory.

Visual review refined the anterior slit and lowered the eye-rim relief after the first pass. Nine final action poses were checked for armour rigidity, posterior continuity, tail-fin clearance, stable oral geometry and unobstructed silhouettes. The final structural intake passes with 18 distinct clips and three valid sockets.
