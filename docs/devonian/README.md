# Devonian specimen library

The [natural-history brief](../redesign/07-devonian-design.md) defines the 21 mobile subjects and
29 scenery families. This library supplies models, materials, portraits and articulated action
clips for those subjects. Devonian Domination plays at `/devonian/` from the content pack in
`src/content/devonian/` (stats, rungs and modes live there and in `src/sim/devonian/`, not in
this library); a subject whose model has not shipped yet borrows a delivered one in play via
`assets.standIns`. Devonian assets can also be inspected in the viewer's **Devonian creatures**
and **Devonian scenery** collections.

Approved deliveries are listed in `tools/devonian/shipped.json`. Models are published in reviewed
batches so other work can use completed examples while the rest of the roster is in production.
Only listed assets enter the viewer catalogue or released-asset CI checks.

The first eight releases at `1e43197` are integration examples undergoing an additional art pass.
The [independent eye audit](../../tools/devonian/eye-audit.README.md) found all sixteen published
eye globes below the required 50% embedding. Their individual head, orbital, mouth, material and
motion revisions must pass the updated production contract before being described as art-final.
The subsequent individual revisions and their exported-model evidence are tracked in
[art review](art-review.md); a passing structural export alone is not an artistic approval.

## Files and provenance

- `public/assets/devonian/creatures/<id>`: full and reduced GLBs, studio/selection/card/thumbnail
  PNGs, and JSON describing identity, age/locality, representative size, action names, sources
  and reconstruction uncertainties.
- `public/assets/devonian/props/manifest.json`: scenery families and variants, their metric
  dimensions, provenance and model/image paths. Attached reef organisms belong here rather
  than in the mobile roster. Locality labels do not imply that all library subjects coexisted.
- `tools/devonian/creatures/<id>/`: each creature's independent builder, material sources,
  anatomical notes and export instructions. `tools/devonian/props/` contains scenery authoring.
- `../devonian-authoring/`: editable Blender projects, concept images and intermediate reviews
  stored under `cambrian/local`, outside the game repository. The tracked builders and their
  material inputs provide the reproducible route to those projects.
- `src/content/devonian/specimens.json`: generated asset catalogue. This is separate from the
  playable era interface; `npm run devonian:catalogue` refreshes it from delivered metadata.

Models face glTF +Z, with +Y up. Creature metadata distinguishes the chosen representative
animal length from the exported model's dimensions. The viewer frames each specimen separately
and labels its physical scale; a small trilobite is not represented as growing into a giant fish.
Scenery uses metres and carries its own dimensions.

## Animation and anchors

The [production contract](production-contract.md) specifies the shared action names. These are
animation assets, not promises of gameplay behavior. Feeding motions, fin beats, appendage
articulation and defensive postures follow each animal's anatomy. `Ability` is an authored
characteristic gesture awaiting any future game implementation. Jawless animals and suspension
feeders do not acquire predatory teeth simply because the compatibility set contains `Bite`.
Arthropods have `Moult`; other animals have a non-scaling `Growth` gesture. Loops are declared
per specimen, and the viewer holds the final `Death` pose for inspection.

Use **Pause** and the animation timeline to inspect exact poses. Choosing a different action while
paused keeps it paused. Dragging the timeline isolates that action from cross-fades; arrow keys
step by 1/30 second, and Home/End show its first/final pose. Orbit and zoom remain available to
check eye seating, jaw hinges and the mouth interior throughout opening and closing.

Creature models use the existing version-1 `cambrianAnchor` metadata, retained by name for
compatibility with the shared socket reader. Full and reduced models carry the same skeleton
and mouth, swallowing and primary-contact sockets. CCD metadata is reserved for actual feeding
or grasping chains; stationary sockets do not advertise a fictitious solver chain.

Living scenery may have restrained ambient motion. Rocks, sediment, dead shells and logs are
static. These authored scenery specimens are a source library: large trees and detailed reef
organisms still need placement, instancing/batching and performance budgets when a Devonian
environment is implemented.

## Intake and verification

After an author hands off a subject, run from the repository root:

```sh
node tools/devonian/check.mjs <creature-id>
node tools/devonian/package.mjs <creature-id>
npm run devonian:catalogue
node tools/devonian/browser.mjs <creature-id>
```

The browser check expects the Vite development server at `http://127.0.0.1:5173`; set
`QA_BASE_URL` to override it. `QA_ONLY_UI=1` skips the development-only runtime audit for
checking a production preview. It verifies collection selection, action controls, asset loads
and clear model framing at desktop, tablet and phone sizes.

For each published batch, `npm run devonian:check` checks the approved delivery list.
For final intake, `npm run devonian:check-all` requires all 21 creatures, while
`node tools/devonian/check-props.mjs` requires every scenery family. The packager accepts
`--props` for scenery. Packaging preserves decoded geometry, skeletons, anchors and animation
values exactly; reduced models keep vertex pigmentation and omit texture maps. Original raw
exports and validation reports are retained under `../devonian-authoring/`.

Review the rendered model and several action poses in addition to these automated checks.
Structural checks cannot establish anatomical correctness, good silhouettes or convincing motion.
When an appearance changes, regenerate all four creature portraits from the new final source.
Run the existing Cambrian intake and era checks too, followed by typecheck and build.
