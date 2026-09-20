# Triassic 3D work status

This is the current coordination ledger for unfinished Triassic creature work. An agent must claim
a row here before editing its model or shared pipeline, commit that claim to `main`, and change the
row to **finished** in the same commit that delivers the verified work. A claimed row must not be
duplicated by another agent. Optional creature regenerations are deliberately outside the active
scope until the required repairs and roster-wide finishing pass are complete.

Updated: 19 September 2026.

| ID | State | Owner | Work | Completion evidence |
| --- | --- | --- | --- | --- |
| T3D-01 | **active** | `/root/askeptosaurus_regen` | Redraw Askeptosaurus in a straight neutral modeling pose with the tail near two-thirds of total length; generate a new textured Tripo body; preserve the current generated body as viewer-selectable **Backup Model**; build the authored/puppet pair with matching rig, clips, anchors, LODs and portraits; ship it and clear its preview status. | 19 September: corrected canonical/input and source backup are committed. Tripo task `5b497dd2-0f06-4764-8d91-401dd19f5ad0` succeeded; the 18,778-triangle textured source and visual review are preserved on `main`. Integration is active. Completion requires new and rigged backup bodies selectable, paired audits/validators and runtime checks. |
| T3D-02 | **active** | `/root/throat_audit` | Audit actual shipped Triassic actions for broken throat, jaw/body seam and mouth-lining geometry; port the settled palate-and-floor implementation from preserved branch `worktree-agent-ab601ca5ebb512c9f` onto the current pipeline without reversing later skinning/animation repairs; repair confirmed faults, including Hupehsuchus' short mouth opening, Henodus' cut through the hanging upper teeth and the rigid Ceratites shell. | Before/after evidence identifies every inspected failure; the current shared builder creates separate palate and mandibular floor surfaces without a wall stretching between them; repaired authored/puppet/LOD assets pass their creature audits and visual playback review. |
| T3D-02a | **finished** | `/root/throat_audit` | Keep the complete Ceratites coil rigid and retire invented crown mouth geometry. | `82786a19`: anatomical shell checks on both variants across every clip; zero contaminated vertices/deformation; paired audit, refreshed portraits, typecheck and build pass. |
| T3D-02b | **finished** | `/root/throat_audit` | Extend Hupehsuchus' jaw to the full lip and keep the posterior jaw attached to its pouch. | Paired audit passes; 162 authored/67 puppet shared-rim vertices stay attached at all 61 phases of 23 clips (zero gap); portraits refreshed. |
| T3D-02c | **finished** | `/root/throat_audit` | Preserve Henodus' hanging upper fringe during jaw opening and publish correct Grab loop metadata. | 80 authored/18 puppet tooth faces retained on skull; upper fringe intact in side/below views; paired audit and 61-phase/all-clip posterior attachment check pass, zero gap; Grab loops. |
| T3D-03 | **finished** | `/root/roster_finish` | Audit the roster-wide rest-pose and animation contract: neutral/base pose, mouth closure, dynamic attack/dash motion, anchors, paired-body parity and missing required clips. Land small deterministic repairs, including `Grab` where absent, and record larger findings without starting optional regeneration. | Generated matrix now reports 26 of 26 packaged bodies contract-met: identity-rest jaws, required anchors/clips, `Attack`/`Sprint`, skin attributes, and decoded authored/puppet/LOD parity are present. Visual throat review remains T3D-02's separately completed gate. |
| T3D-04 | **finished** | `/root/roster_finish` | Port proven centreline and limb-root blending corrections into the shared Triassic pipeline without changing already-correct output. | `appendage_vertex_mask` and `appendage_excluded_centreline` now preserve the four-proven two-pass correction as opt-in shared helpers; Python compilation and the generated packaged roster audit pass with no rebuilt asset change. |
| T3D-05 | **finished** | `/root/roster_finish` | Make the shipped `Grab` clips loop for Henodus, Keichousaurus, Nothosaurus and Placodus, then rebuild the authored/puppet/LOD triplets and refresh paired audits. | Keichousaurus, Nothosaurus and Placodus rebuilt with looping `Grab`; Henodus landed in `2e599809` with its paired audit and posterior-jaw check. The generated matrix now reports no missing `Grab` loop. |
| T3D-06 | **finished** | `/root/roster_finish` | Add Shonisaurus' required `Grab` and `Breath` clips, then create its first shared paired audit and review the new action playback. | Packaged GLBs now contain 21 contract clips with a 1.2-second looping `Grab`; neutral exporter scale/root channels are removed during package; the shared decoded paired audit proves exact rig, clips and anchors. |
| T3D-07 | **finished** | `/root/roster_finish` | Render and publish the three actually missing Triassic portrait sets without changing creature bodies: Cartorhynchus, Cymbospondylus and Mixosaurus. | All authored select/card/thumb/studio renders and procedural-twin portraits are published and visually reviewed; `node tools/triassic/publish-portraits.mjs --check` reports all 26 shipped bodies current. |
| T3D-08 | **active** | `/root/roster_finish` | Port the current builders other than T3D-02's Ceratites, Henodus and Hupehsuchus to the restored separate palate/floor helper, preserving all later skinning and animation repairs. Rebuild and validate in small batches. | Each ported builder has separate rigid palate/floor geometry, refreshed paired audit and action validation; the final throat audit has no regressions. |
| T3D-08A | **finished** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Birgeria and Archelon builders. | Both authored/puppet/LOD triplets were rebuilt on current `main`; their packaged decoded audits pass with exact rig and animation parity, and the builders report separate oral lining geometry. |
| T3D-08B | **finished** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Atopodentatus and Cartorhynchus builders. | Both authored/puppet/LOD triplets were rebuilt on current `main`; their packaged decoded audits pass with exact rig and animation parity, and the builders report valid capped lining geometry. |
| T3D-08C | **finished** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Cymbospondylus and Mixosaurus builders. | Both authored/puppet/LOD triplets were rebuilt on current `main`; their packaged decoded audits pass with exact rig and animation parity, and the builders report separate oral lining geometry. |
| T3D-08D | **finished** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Aphaneramma and Mystriosuchus builders. | Both authored/puppet/LOD triplets were rebuilt on current `main`; packaged decoded audits pass with exact rig and animation parity, and direct topology audits prove separate closed rigid palate/floor shells. |
| T3D-08E | **finished** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Mosasaurus and Odontochelys builders. | Both authored/puppet/LOD triplets were rebuilt on current `main`; packaged decoded audits pass with exact rig and animation parity, and direct topology audits prove separate closed rigid palate/floor shells. |
| T3D-08F | **active** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Rhaeticosaurus builder. Rebuild with `/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/rhaeticosaurus/build.py`, then run its packaged decoded audit. | The rebuilt authored/puppet/LOD assets contain rigid skull/jaw oral groups, its creature audit passes, and the shared throat review remains clean. |
| T3D-09 | **active** | `/root/throat_audit` | Port Coelophysis, Macrocnemus and Tanystropheus from the separate `shorekit.oral_lining` implementation to the same rigid palate/floor contract. This is a cross-kit change and must retain their runner-specific action and skinning repairs. | Rebuilt paired assets have skull-owned palate and jaw-owned floor shells; their runner action audits and the throat review pass. |
| T3D-09a | **finished** | `/root/throat_audit` | Convert Tanystropheus to separate rigid palate/floor shells. | Packaged authored/puppet/LOD closed-shell checks pass; paired 28-clip audit passes; Bite/SnapRight strict culling review has zero through-body pixels; portraits refreshed. |
| T3D-09b | **finished** | `/root/throat_audit` | Convert Coelophysis to separate shells and attach its posterior jaw during hard snaps. | All 29 clips pass; 111 authored/68 puppet shared-rim vertices keep zero gap at 61 phases per clip; strict snap through-hole count 2367→0; portraits refreshed. Pre-existing authored neck/back slivers remain a separate source-cleanup finding. |
| T3D-09c | **finished** | `/root/throat_audit` | Convert Macrocnemus to separate shells, retain the palate inside the skull and attach the posterior mandible. | Packaged 26-clip paired audit passes; 68 authored/46 puppet shared-rim vertices keep zero gap at 61 phases per clip; strict Bite/Snatch culling has zero through-body pixels; portraits refreshed. |
| T3D-10 | **active** | `/root` | Review the seven newly delivered plant/prop canonicals, redraw inaccurate or poorly framed subjects, generate a Tripo source for each approved subject, process each into the instanced-prop contract, integrate it into the Triassic scenery and specimen viewer, and document the provenance. | Canonical audit and approved inputs are committed; preserved raw Tripo outputs and review renders exist; shipped meshes have base pivots, bounded instancing topology and validated manifests; runtime scenery mappings, shapes, viewer entries, typecheck and build pass. |
| T3D-10A | **active** | `/root/prop_canonical_audit` | Produce corrected canonicals and clean 2048-square Tripo inputs for Neocalamites, Coenothyris cluster, Daonella bed, Cidaris and Encrinus litter; derive ground-free inputs for the approved Bjuvia and Pleuromeia designs. | Each image is visually re-reviewed against the canonical audit, retains the complete silhouette and base, and has no substrate slab or invented morphology likely to become geometry. |

## Finished baseline

- Twenty-six Triassic authored bodies, procedural puppets and LODs are shipped and structurally
  validated. Askeptosaurus is the sole roster animal without a finished body.
- Archelon and Mosasaurus are shipped as standing visitors.
- The shared palate/floor oral-geometry architecture and first skinning-repair batch are on `main`.
  Current builders are being moved to its measured-room interface in small claimed batches so
  later skinning and animation repairs remain intact.
- Optional regenerations for Aphaneramma, Helicoprion, Mixosaurus, Mosasaurus,
  Phragmoteuthis and Rhaeticosaurus are deferred. Record defects discovered in those bodies, but do
  not spend Tripo credits on replacements in this pass.
- The eleven builders on the shared `T.lining` path have source-level measured-room ports in
  T3D-08A through T3D-08F. Their rows remain active until root's Blender rebuild and decoded audits
  land. Coelophysis, Macrocnemus and Tanystropheus use a distinct ShoreKit oral implementation;
  their conversion is T3D-09 rather than a blind compatibility edit.

## Coordination rule

Before starting a newly discovered repair, add a row with state **active**, a single owner and a
bounded completion test, then commit and push that claim. If a task cannot proceed, change its
state to **blocked** and name the missing input. Never leave completed work marked active.

## Current evidence

[`roster-finish-matrix.json`](roster-finish-matrix.json) is generated from the packaged GLBs;
[`roster-finish-audit.md`](roster-finish-audit.md) explains its checks and records the scoped
follow-ups. The matrix currently passes the complete packaged-body contract for all 26 bodies.
Shonisaurus' `Grab`, `Breath` and shared paired audit are complete; Henodus' `Grab` now loops.
The throat review was tracked separately in T3D-02.
