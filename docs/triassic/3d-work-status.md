# Triassic 3D work status

This is the current coordination ledger for unfinished Triassic creature work. An agent must claim
a row here before editing its model or shared pipeline, commit that claim to `main`, and change the
row to **finished** in the same commit that delivers the verified work. A claimed row must not be
duplicated by another agent. Optional creature regenerations are deliberately outside the active
scope until the required repairs and roster-wide finishing pass are complete.

Updated: 19 September 2026.

| ID | State | Owner | Work | Completion evidence |
| --- | --- | --- | --- | --- |
| T3D-01 | **active** | `/root/askeptosaurus_regen` | Redraw Askeptosaurus in a straight neutral modeling pose with the tail near two-thirds of total length; generate a new textured Tripo body; preserve the current generated body as viewer-selectable **Backup Model**; build the authored/puppet pair with matching rig, clips, anchors, LODs and portraits; ship it and clear its preview status. | New and backup bodies selectable in the viewer; paired audits and validators pass; `npm run triassic`, typecheck and build pass. |
| T3D-02 | **active** | `/root/throat_audit` | Audit actual shipped Triassic actions for broken throat, jaw/body seam and mouth-lining geometry; repair confirmed faults, including Hupehsuchus' short mouth opening, Henodus' cut through the hanging upper teeth and the rigid Ceratites shell. | Before/after evidence identifies every inspected failure; repaired authored/puppet/LOD assets pass their creature audits and visual playback review. |
| T3D-03 | **active** | `/root/roster_finish` | Audit the roster-wide rest-pose and animation contract: neutral/base pose, mouth closure, dynamic attack/dash motion, anchors, paired-body parity and missing required clips. Land small deterministic repairs, including `Grab` where absent, and record larger findings without starting optional regeneration. | Machine-readable roster matrix plus actual-GLB checks; repaired assets and shared tooling validated. |
| T3D-04 | **active** | `/root/roster_finish` | Port proven centreline and limb-root blending corrections into the shared Triassic pipeline without changing already-correct output. | Pipeline regression checks and representative rebuilds pass. |

## Finished baseline

- Twenty-six Triassic authored bodies, procedural puppets and LODs are shipped and structurally
  validated. Askeptosaurus is the sole roster animal without a finished body.
- Archelon and Mosasaurus are shipped as standing visitors.
- The palate/floor oral-geometry architecture and the first skinning-repair batch are already on
  `main`; they are inputs to the new visual throat audit, not open implementation requests.
- Optional regenerations for Aphaneramma, Helicoprion, Mixosaurus, Mosasaurus,
  Phragmoteuthis and Rhaeticosaurus are deferred. Record defects discovered in those bodies, but do
  not spend Tripo credits on replacements in this pass.

## Coordination rule

Before starting a newly discovered repair, add a row with state **active**, a single owner and a
bounded completion test, then commit and push that claim. If a task cannot proceed, change its
state to **blocked** and name the missing input. Never leave completed work marked active.
