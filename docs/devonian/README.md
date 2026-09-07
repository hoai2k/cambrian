# Devonian specimen library

The [natural-history brief](../redesign/07-devonian-design.md) defines the 21 mobile subjects and
29 scenery families. This library supplies models, materials, portraits and articulated action
clips for those subjects. Devonian Domination plays at `/devonian/` from the content pack in
`src/content/devonian/` (stats, rungs and modes live there and in `src/sim/devonian/`, not in
this library); a subject whose model has not shipped yet borrows a delivered one in play via
`assets.standIns`. Devonian assets can also be inspected in the viewer's **Devonian creatures**
and **Devonian scenery** collections.

Delivered models are listed in `tools/devonian/shipped.json`. Initial versions are committed as
soon as they pass basic model, animation, anchor, portrait and eye checks, so they can be tested
in the game before the complete art-refining pass. Only listed assets enter the viewer catalogue.

**Current initial collection: 21/21 creatures — three reviewed models and eighteen previews.**
The six user-directed full reworks are Titanichthys, Coccosteus, Bothriolepis, Doryaspis,
Gemuendina and Stethacanthus; all other initial previews retain individual refinement notes. The explicit lifecycle
in `src/content/devonian/model-status.json`
drives the **⚠ Preview model** badge on creature choice cards, selected-player cards and viewer
cards. Promotion to `final` happens individually after the refining pass; the badge never locks
selection or changes gameplay. Newly authored models default to preview until reviewed.

User reference directions for the reopened models are preserved in [the refinement queue](refinement-queue.md).

The first eight releases were rebuilt after the initial eye audit. Those reviewed replacements,
and Cheirolepis, now satisfy the requested eye containment and individual art reviews. See
[art review](art-review.md) and the [resumable checkpoint](authoring-checkpoint-2026-09-07.md).
The current priority is initial delivery of all creatures, plants, props and supporting images,
followed by the full refining passes. Structural validity alone does not establish final art quality.

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

All 47 scenery variants across the 29 families are delivered as previews, with full/reduced models, portraits, source builders and metric metadata. All 47 were loaded successfully in the built viewer. Nine initial imagegen biome paintings are also delivered; their prompts and source provenance are in `tools/devonian/environment-image-prompts.json`.

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

For each published batch, `npm run devonian:check` checks the delivery list (including clearly labelled previews).
For final intake, `npm run devonian:check-all` requires all 21 creatures, while
`node tools/devonian/check-props.mjs` requires every scenery family. The packager accepts
`--props` for scenery. Packaging preserves decoded geometry, skeletons, anchors and animation
values exactly; reduced models keep vertex pigmentation and omit texture maps. Original raw
exports and validation reports are retained under `../devonian-authoring/`.

Review the rendered model and several action poses in addition to these automated checks.
Structural checks cannot establish anatomical correctness, good silhouettes or convincing motion.
When an appearance changes, regenerate all four creature portraits from the new final source.
Run the existing Cambrian intake and era checks too, followed by typecheck and build.
