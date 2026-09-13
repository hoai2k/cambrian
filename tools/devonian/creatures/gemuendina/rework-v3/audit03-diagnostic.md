# Auditor interpolation correction — actual diagnosis

The frozen audit_candidate_02.py asserted LINEAR for every exported channel,
and stopped at the first action. Actual candidate02 full has 542 LINEAR and
430 STEP channels; LOD has 93 LINEAR and 69 STEP channels. 407 full and 46 LOD STEP channels are exactly
constant; the remaining 23 in each export vary by at most 6.55651e−7 units.
The auditor evaluates their actual STEP values without replacing them by a
constant or linear approximation. These are valid samplers, not model defects.
No CUBICSPLINE channels occur in these exports.

The old failed `audit-candidate-02-02/` is preserved. It contains only full bind
measurements: L 87.51–88.03%, R 87.90–88.43% conservative inside intervals and
maximum nearest denticle contact distance ~0.00184 units. Those results do not
cover any non-bind action or the LOD. No successful Phase4 is claimed.

New `audit_candidate_03.py` uses the separate pure sampler
`gltf_interpolation_03.py`. It implements endpoint clamping, previous-key STEP,
vector LINEAR and shortest-path quaternion SLERP, and CUBICSPLINE Hermite with
duration-scaled outgoing/incoming tangents and normalized quaternion results.
Spline quaternion keys/tangents are not sign-flipped. Unknown modes and invalid
counts/times/nonfinite or zero interpolated quaternions raise errors.

Semantics were checked against the primary
[Khronos glTF specification, animation samplers and Appendix C](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#appendix-c-interpolation)
and the actual installed Three.js GLTFLoader/Interpolant implementation.

Bounded comparison actually executed (no Blender): 1,134 actual exported
channels plus eight synthetic curves, including nonconstant/single-key STEP,
uneven spacing, endpoint boundaries, quaternion sign/half-turn/near-equality,
and cubic vector/quaternion cases. An animation-only test GLB was loaded by
actual Three.js GLTFLoader; 144,926 evaluated queries matched the new Python
helper within maximum component error 4.66970162327e-07,
well below the fixed 4e-6 comparison tolerance. This verifies interpolation,
not the pending geometry/volume audit.

Comparison report SHA: `1b98cc06546a8dfbaff7de02d6f96facfa21962c6ffdf40cc1eb9b8ae05a957e`.
Diagnostic SHA: `358f49ec2296a11e77e6d14caff763f94940b147da9f6eac8e64c4d69319a0ed`.

No exported geometry, action curve, sample count, confidence calculation,
threshold, pose selection, anatomy selector or contact criterion was changed.
The new auditor writes only `audit-candidate-02-03/`. Frozen audit02 and failed
outputs remain untouched.
