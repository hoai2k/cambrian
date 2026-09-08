# Michelinoceras motion-v3 runtime handoff

Status: scoped motion-art review, actual rig/prey runtime checks, isolated packaging and strict structural intake PASS. Parent owns continuous browser/controller review and publication. No public assets or Git were changed by this subagent.

## Final review family

`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/motion-v3/runtime-intake-02/family`

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| michelinoceras.glb | 12,388,360 | 646fe1ec885296d6195783fb9fc591d49e5c7212d0d11a0214ed5aecb0495cc1 |
| michelinoceras.lod1.glb | 3,682,164 | c1005758eee00eaca5b1e73ace492a5fcc5fda3ec60f5cb21c880e00e5fabf82 |

Full: 243,404 triangles, 19 clips. LOD: 74,844 triangles; Attack, Bite, Death, Eat, Heavy, Idle, Swim. Both: 166 joints, 13 sockets. Four portrait images are unchanged original v1 Idle portraits, explicitly recorded in scale-regression.json; they are not new feeding renders.

## Runtime change

The GLTF scene opts in through `cambrianFeeding` version 1, mode `authored-grasp`, clip `Eat`, apertureDiameter 0.14 and pickupOffsetLimit 0.24 (raw rig units). Runtime requires the actual Eat/grasp/inside sockets and validates finite positive dimensions. There is no species-name opt-in. Old shipped Michelinoceras remains on the old route; Opabinia remains on its existing route.

`creature.ts` samples non-looping Eat progress exactly, including 1, and prevents other actions from overriding authored cupping. `attachments.ts` follows the authored grasp path, adds a bounded predator-local pickup correction only while needed, and removes that correction by progress .78. Oral aperture scales with the rig. Prey stays at simulation position until pickup; actual contact gates attachment. Large, multi-bite and unreachable bodies remain in place. Late carry and swallow retain authored arm curvature. Cancellation, target replacement and LOD/view replacement clear the session safely.

`package.mjs` preserves the four feeding/attack clips in LOD only for the validated scene opt-in. Unannotated assets retain the existing three-clip LOD policy. DEVONIAN_ASSETS permits isolated candidate packaging and intake; defaults remain unchanged.

## Strict scale distinction and derivative provenance

The original candidate and frozen source remain intact. The first strict check rejected real decoded sub-ppm scale variation from Blender matrix decomposition: maximum sample deviation 4.172325134e-7, maximum bind drift 2.384185791e-7, temporal drift 2.980232238e-7. Root keys were exactly static, but other arm keys were not exactly identity. The checker was not relaxed to accept this noise.

Parent explicitly authorized a separate hash-bound canonical derivative. `canonicalize_scale_noise.py` accepts only the exact runtime-candidate-01 input hashes and finite deviations no greater than 5e-7. It appends fresh identity scale accessors, leaving the original binary prefix intact; every changed bind value and emitted scale sample is recorded in runtime-canonical-01/*.scale-changes.json. Geometry, materials, sockets, rotation/location channels and original sampler data remain unchanged. Unexpected interpolation or a larger value fails. This is an asset-specific correction, not an intake tolerance.

`check.mjs` with `static-scale.mjs` accepts scale channels only when every value is exactly finite identity, the bind scale is identity and any cubic tangents are exactly zero. Nonidentity values, including tiny motion, fail. Identity bookkeeping does not count as action motion.

Lineage: approved candidate-01 -> extras-only runtime-candidate-01 -> bounded runtime-canonical-01 -> actual packaged runtime-packaged-02 -> identical intake family runtime-intake-02/family. Earlier derivatives and failed runtime-intake-01 evidence are preserved.

## Evidence

All paths below are under the authoring motion-v3 directory.

- visual-review-01/VERDICT.md and image-inputs.json: all 60 actual full/LOD exported poses reviewed at readable size plus critical closeups; scoped articulated attack/feeding art approval. Soft-part movement is an uncertain comparative interpretation.
- runtime-canonical-01/canonicalization-report.json and two scale-changes.json files: exact hashes, measured changes, unchanged payload assertions.
- runtime-canonical-01/posed-scale-comparison.json: every clip at five fractions, 127,605 real skinned vertex probes. Local rotations/translations exact; maximum posed displacement 4.956867291381293e-7 model units.
- runtime-packaging-02/package-results.json: real package pipeline, exact semantic meshopt round-trip, 19/7 clips, metadata and sockets preserved. Opt-out control remains 19/3. Public Michelinoceras and 126 Cambrian assets unchanged.
- runtime-intake-02/intake.json and scale-regression.json: actual check.mjs PASS; 4,316 exact identity scale channels audited; valid linear/step/cubic cases accepted; ten adversarial scale cases rejected.
- runtime-review-packaged-02/runtime-results.json: production CreatureView/Attachments, actual full/LOD rigs and Furcaster prey, 12 size/orientation combinations with moving predator. 40,560 skinned vertex probes; exact late authored pose against independent raw AnimationMixer; zero hold error; maximum pickup error/body length 0.000300201. Mid-feed interruption, target/LOD replacement, near-but-unreachable and distant food, oversize/multi-bite bodies and original Michelinoceras/Opabinia regressions PASS.
- Typecheck and build passed for the unchanged runtime source. Existing Toolbar/App circular-chunk warning remains.

These are actual asset/rig tests with headless production code, not GPU or physical-controller evidence. Parent should inspect continuous real prey pickup, carry, oral transfer, canceled feed and full/LOD transitions in the browser before final publication. Dense oral cupping and small corneous bite visibility remain the recorded visual limits. No further Blender render is justified by the measured scale canonicalization alone.

## Reproduction and freeze

Run from the repository root. Each tool refuses to overwrite its evidence directory. Use fresh absolute output/evidence paths when repeating:

- runtime-test.mjs: MIC_RUNTIME_ASSETS=runtime-packaged-02; MIC_RUNTIME_REPORT=new review directory.
- package-test.mjs: MIC_PACKAGE_SOURCE=runtime-canonical-01; MIC_PACKAGE_OUTPUT=new derivative directory; MIC_PACKAGE_EVIDENCE=new evidence directory.
- intake-test.mjs: MIC_INTAKE_SOURCE=runtime-packaged-02; MIC_INTAKE_OUTPUT=new intake directory.

Scripts are under tools/devonian/creatures/michelinoceras/motion-v3. The handoff's frozen-inputs.json records current source, evidence and final asset hashes, with exact owned source copies in runtime-handoff-01/source. It does not supersede the original Blender candidate manifest.
