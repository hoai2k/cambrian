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
| T3D-02c | **active** | `/root/throat_audit` | Preserve Henodus' hanging upper fringe during jaw opening and publish correct Grab loop metadata. | Topology-based lower-jaw component selection; visual review and paired audit underway. |
| T3D-03 | **active** | `/root/roster_finish` | Audit the roster-wide rest-pose and animation contract: neutral/base pose, mouth closure, dynamic attack/dash motion, anchors, paired-body parity and missing required clips. Land small deterministic repairs, including `Grab` where absent, and record larger findings without starting optional regeneration. | Machine-readable roster matrix plus actual-GLB checks; repaired assets and shared tooling validated. |
| T3D-04 | **finished** | `/root/roster_finish` | Port proven centreline and limb-root blending corrections into the shared Triassic pipeline without changing already-correct output. | `appendage_vertex_mask` and `appendage_excluded_centreline` now preserve the four-proven two-pass correction as opt-in shared helpers; Python compilation and the generated packaged roster audit pass with no rebuilt asset change. |
| T3D-05 | **active** | `/root/roster_finish` | Make the shipped `Grab` clips loop for Henodus, Keichousaurus, Nothosaurus and Placodus, then rebuild the authored/puppet/LOD triplets and refresh paired audits. | Keichousaurus, Nothosaurus and Placodus are rebuilt and verified. Henodus remains and is being completed with its claimed throat repair; finish when the generated roster matrix reports no missing `Grab` loop and every rebuilt pair passes its audit. |
| T3D-06 | **finished** | `/root/roster_finish` | Add Shonisaurus' required `Grab` and `Breath` clips, then create its first shared paired audit and review the new action playback. | Packaged GLBs now contain 21 contract clips with a 1.2-second looping `Grab`; neutral exporter scale/root channels are removed during package; the shared decoded paired audit proves exact rig, clips and anchors. |
| T3D-07 | **unclaimed** | — | Render and publish the 13 still-missing Triassic roster portrait sets without changing creature bodies. | `node tools/triassic/publish-portraits.mjs --check` reports no missing sets. |
| T3D-08 | **active** | `/root/roster_finish` | Port the current builders other than T3D-02's Ceratites, Henodus and Hupehsuchus to the restored separate palate/floor helper, preserving all later skinning and animation repairs. Rebuild and validate in small batches. | Each ported builder has separate rigid palate/floor geometry, refreshed paired audit and action validation; the final throat audit has no regressions. |
| T3D-08A | **active** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Birgeria and Archelon builders. The source batch is ready; rebuild with `/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/{birgeria,archelon}/build.py`, then run each packaged decoded audit. | The rebuilt authored/puppet/LOD assets contain rigid skull/jaw oral groups, each creature audit passes, and the shared throat review remains clean. |
| T3D-08B | **active** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Atopodentatus and Cartorhynchus builders. Rebuild with `/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/{atopodentatus,cartorhynchus}/build.py`, then run each packaged decoded audit. | The rebuilt authored/puppet/LOD assets contain rigid skull/jaw oral groups, each creature audit passes, and the shared throat review remains clean. |
| T3D-08C | **active** | `/root/roster_finish` | Port the separate-palate/floor measured-room call into the current Cymbospondylus and Mixosaurus builders. Rebuild with `/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/triassic/creatures/{cymbospondylus,mixosaurus}/build.py`, then run each packaged decoded audit. | The rebuilt authored/puppet/LOD assets contain rigid skull/jaw oral groups, each creature audit passes, and the shared throat review remains clean. |

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

## Coordination rule

Before starting a newly discovered repair, add a row with state **active**, a single owner and a
bounded completion test, then commit and push that claim. If a task cannot proceed, change its
state to **blocked** and name the missing input. Never leave completed work marked active.

## Current evidence

[`roster-finish-matrix.json`](roster-finish-matrix.json) is generated from the packaged GLBs;
[`roster-finish-audit.md`](roster-finish-audit.md) explains its checks and records the scoped
follow-ups. The matrix currently passes the core packaged-body contract for 25 of 26 bodies.
Henodus' held `Grab` loop is the sole remaining animation-contract repair and is coupled to its
active throat repair. Shonisaurus' `Grab`, `Breath` and first shared paired audit are complete.
The throat review remains T3D-02's separate visual gate.
