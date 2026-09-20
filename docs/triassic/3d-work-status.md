# Triassic 3D work status

This is the current coordination ledger for unfinished Triassic creature work. An agent must claim
a row here before editing its model or shared pipeline, commit that claim to `main`, and change the
row to **finished** in the same commit that delivers the verified work. A claimed row must not be
duplicated by another agent. Optional creature regenerations are deliberately outside the active
scope until the required repairs and roster-wide finishing pass are complete.

Updated: 19 September 2026.

| ID | State | Owner | Work | Completion evidence |
| --- | --- | --- | --- | --- |
| T3D-01 | **active** | `/root/askeptosaurus_regen` | Redraw Askeptosaurus in a straight neutral modeling pose with the tail near two-thirds of total length; generate a new textured Tripo body; preserve the current generated body as viewer-selectable **Backup Model**; build the authored/puppet pair with matching rig, clips, anchors, LODs and portraits; ship it and clear its preview status. | 19 September: corrected canonical, single input and review turnaround prepared; original source/preview hashes preserved. Tripo submission pending credentials; integration remains active. Completion requires new and rigged backup bodies selectable, paired audits/validators and runtime checks. |
| T3D-02 | **active** | `/root/throat_audit` | Audit actual shipped Triassic actions for broken throat, jaw/body seam and mouth-lining geometry; port the settled palate-and-floor implementation from preserved branch `worktree-agent-ab601ca5ebb512c9f` onto the current pipeline without reversing later skinning/animation repairs; repair confirmed faults, including Hupehsuchus' short mouth opening, Henodus' cut through the hanging upper teeth and the rigid Ceratites shell. | Before/after evidence identifies every inspected failure; the current shared builder creates separate palate and mandibular floor surfaces without a wall stretching between them; repaired authored/puppet/LOD assets pass their creature audits and visual playback review. |
| T3D-03 | **active** | `/root/roster_finish` | Audit the roster-wide rest-pose and animation contract: neutral/base pose, mouth closure, dynamic attack/dash motion, anchors, paired-body parity and missing required clips. Land small deterministic repairs, including `Grab` where absent, and record larger findings without starting optional regeneration. | Machine-readable roster matrix plus actual-GLB checks; repaired assets and shared tooling validated. |
| T3D-04 | **finished** | `/root/roster_finish` | Port proven centreline and limb-root blending corrections into the shared Triassic pipeline without changing already-correct output. | `appendage_vertex_mask` and `appendage_excluded_centreline` now preserve the four-proven two-pass correction as opt-in shared helpers; Python compilation and the generated packaged roster audit pass with no rebuilt asset change. |
| T3D-05 | **active** | `/root/roster_finish` | Make the shipped `Grab` clips loop for Henodus, Keichousaurus, Nothosaurus and Placodus, then rebuild the authored/puppet/LOD triplets and refresh paired audits. | The generated roster matrix reports no missing `Grab` loop; every rebuilt pair passes its audit. |
| T3D-06 | **active** | `/root/roster_finish` | Add Shonisaurus' required `Grab` and `Breath` clips, then create its first shared paired audit and review the new action playback. | Packaged GLBs contain both clips; `Grab` loops; a decoded paired audit passes. |
| T3D-07 | **unclaimed** | — | Render and publish the 13 still-missing Triassic roster portrait sets without changing creature bodies. | `node tools/triassic/publish-portraits.mjs --check` reports no missing sets. |

## Finished baseline

- Twenty-six Triassic authored bodies, procedural puppets and LODs are shipped and structurally
  validated. Askeptosaurus is the sole roster animal without a finished body.
- Archelon and Mosasaurus are shipped as standing visitors.
- The palate/floor **rule** and the first skinning-repair batch are on `main`, but the implementation
  was stranded on preserved remote branch `worktree-agent-ab601ca5ebb512c9f`. Current builders
  still contain the older one-sac lining. T3D-02 owns the careful port onto the newer builders and
  must preserve all skinning and animation work that landed after the branch split.
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
follow-ups. The matrix currently passes the core packaged-body contract for 21 of 26 bodies; the
four non-looping `Grab` clips and Shonisaurus' missing action clips are the remaining animation
contract work. The throat review remains T3D-02's separate visual gate.
