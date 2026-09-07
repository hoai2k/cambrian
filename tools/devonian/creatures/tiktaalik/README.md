# Tiktaalik roseae — individual reconstruction

Frozen initial preview for parent integration. Nothing in this directory writes to public assets; integration owns publication. Extended polishing is deferred under the user’s roster-first priority.

The model uses a broad triangular flattened skull, long rostrum with posterior dorsal eyes, short mobile neck, long rib-supported trunk, four substantial jointed fins and a conservative inferred low caudal web. The head and body are one shaped mesh with a continuous, articulated oral lining. Small marginal teeth and limited larger inner teeth follow the published dentary/palatal material. The skeleton separates a rigid central skull, lower jaw, cheek modules, throat, neck, six axial segments and the covered support zones of each fin. There are no digits, external fin-ray cords, ornamental orbital rims or shark-like dorsal fins.

The comparison against Stewart et al. 2024, figure 7, led to a longer shoulder-to-pelvis region than the first clay. Whole-tail outline, skin colour and animation timing are explicitly inferred. A 2 m representative scale is an authoring choice, not a claimed species maximum. See [anatomy-notes.md](anatomy-notes.md) for primary citations and [material-provenance.md](material-provenance.md) for the original imagegen prompt.

Sources and intermediate work are preserved outside the checkout at `cambrian/local/devonian-authoring/tiktaalik/`, including primary paper study copies, early clay, editable `tiktaalik-v2.blend`, local candidate GLBs and actual Three.js review captures. No previous Tiktaalik V1 existed.

## Reproduce

From the repository root, with Blender 5.x (numpy bundled), Node dependencies installed, and the viewer development server running for browser checks:

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/build.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/render-portraits.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/review-source.py
node tools/devonian/creatures/tiktaalik/audit-candidate.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/tiktaalik/eye-audit-full
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/tiktaalik/eye-audit-lod
python3 tools/devonian/creatures/tiktaalik/check-export.py
node tools/devonian/creatures/tiktaalik/review-viewer.mjs
```

`TIKTAALIK_QUICK=1` builds the same full/LOD/metadata assets but renders only draft silhouettes. `TIKTAALIK_QA_QUICK=1` captures action frames without the sequential WebM. `DEVONIAN_AUTHORING` can override the builder/portrait output directory; review helpers use the default local authoring directory.

## Actions

All root transforms stay fixed. Motion belongs to the axial body, fins, neck, jaws and cheek/throat tissues. No clip scales the animal. The timing labels provide runtime compatibility and do not prescribe Devonian gameplay.

| Clip | Seconds | Authored gesture |
| --- | ---: | --- |
| Idle | 2.4 | Quiet axial drift, slow fin trimming and branchial/cheek ventilation. |
| Swim | 2.4 | Travelling tail wave with staggered pectoral sculling and delayed distal/pelvic recovery. |
| TurnLeft / TurnRight | 1.6 | Neck-led aiming, asymmetric fin braking and axial bend. |
| Dive / Rise | 1.4 | Aquatic pitch change with forefin incidence and delayed distal correction. |
| Attack | 1.0 | Small recoil, neck-forward snap and jaw closure with fin braking. |
| Bite | 0.5 | Fast shallow-jaw gape, closure and brief secondary recovery. |
| Heavy | 1.1 | Stronger prepared lateral snap with independent cheek expansion and axial recoil. |
| Hit | 0.6 | Local recoil followed by fin/body recovery. |
| Death | 1.6 | Loss of sculling, modest lateral settling, slack fins and held terminal pose. |
| Guard | 1.0 | Seamless buoyancy-supported fin bracing and raised head. |
| Parry | 0.35 | Brief lateral head withdrawal with asymmetric forefin correction. |
| Dodge | 0.4 | Short aquatic side slip and strong propagated tail bend. |
| Eat | 1.6 | Seamless small gape cycles with cheek/throat expansion. |
| Stagger | 1.2 | Damped alternating axial instability and delayed fin corrections. |
| Ability | 2.4 | Submerged propping display: forefin flexion and distal extension, modest supported body rise and neck scan. No terrestrial stride. |
| Growth | 1.5 | Relaxed paired-fin extension and breathing display, without scaling or moulting. |

The reduced model retains Idle, Swim and Death with the identical bone/socket graph. Three version-1 sockets attach to jaw/skull: mouth, swallow and attack. Their positions remain local to the actual feeding structures after Blender-to-glTF conversion.

## Materials and review

The full GLB has original UV albedo/normal/roughness and neutral-white COLOR_0 to avoid double-darkening in Three.js. Cranial dermal sculpture is finer than the narrowly overlapping trunk scales. The distant LOD is genuinely decimated, texture-free and retains sampled linear vertex pigmentation.

Final candidate hashes and validation results are recorded in the final review report only after the complete visual and deformation review. Intermediate reports are not a publication approval.

Preview handoff metrics and exact hashes are in `final-review-v2.json` and the local `v2-candidate/candidate-manifest.json`. Current full/LOD eyes have conservative lower bounds above70.4%; both audited head meshes are closed without temporary caps. All126 sampled poses retain buried fin roots and attached tooth bases. The oral overlap is fixed. Further cranial/fin-web polish and oral diagnostic lighting remain deferred.
