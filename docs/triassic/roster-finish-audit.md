# Triassic roster finishing audit

This is the readable companion to [`roster-finish-matrix.json`](roster-finish-matrix.json).
The JSON is generated from the packaged GLBs by
`node tools/triassic/roster-finish-audit.mjs`; do not hand-edit it.

## Packaged-body result — 19 September 2026

All 26 shipped authored bodies have a closed, identity-rest jaw node, the standard mouth and
attack anchors, skinned attributes, an animated `Attack` and `Sprint`, and the full standard
action set except where listed below. Twenty-five packages retain a decoded paired audit proving
the rig, clips and anchors are equal across authored, puppet and LOD. Shonisaurus predates that
shared audit and needs one after its clip repair.

The static audit proves the rest bind pose. It cannot decide whether an animated throat tears:
that requires the mouth-playback review owned by T3D-02. It also cannot replace a rendered
neutral-pose judgement; its base-pose checks guard regressions once that review is recorded.

| Finding | Scope | Disposition |
| --- | --- | --- |
| `Grab` is present but not looped | Henodus, Keichousaurus, Nothosaurus, Placodus | T3D-05: deterministic loop repair and paired rebuild. |
| Required `Grab` and `Breath` are absent | Shonisaurus | T3D-06: builder repair, paired audit and visual review. |
| No published rendered portraits | Cartorhynchus, Coelophysis, Cymbospondylus, Dinocephalosaurus, Henodus, Hupehsuchus, Keichousaurus, Macrocnemus, Mixosaurus, Nothosaurus, Placodus, Shonisaurus, Tanystropheus | T3D-07: render/publish pass; no body regeneration. |
| Thin but nonzero joint ownership | Cartorhynchus `caudal_upper` (0.0117%), Hupehsuchus `caudal_upper` (0.0024%), Phragmoteuthis `arm_02_00` (0.0332%) | Leave shipped bodies unchanged: `idle-bones` reports no zero-owner joint. Recheck after any builder touch. |
| Broken oral geometry in action playback | All visual candidates | T3D-02 owns this review and repairs. |

## Shared-pipeline conclusion

The shared kit already supplies `measured_centreline`, radial `seat`, and chain interpolation.
The proven broad-limb correction used by Archelon, Aphaneramma, Mystriosuchus and Mosasaurus is
not yet a kit helper: it excludes appendage vertices before a second trunk-centreline measurement
and assigns limb skin by distance to the limb polyline versus that trunk axis. T3D-04 ports that
as opt-in helpers only. Existing builders remain byte-for-byte unchanged unless they elect the
helper in a later, claimed rebuild.
