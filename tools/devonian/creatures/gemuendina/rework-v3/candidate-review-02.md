# Candidate-01 completed-rework review and candidate-02 correction

Actual evidence independently inspected: select portrait, Swim-side,
Heavy-oral, TurnLeft-oblique, Death-oblique, plus actual Three.js LOD-Idle and
default-palette-LOD-Idle. Full SHA
`983b8fe1831eb15aa5c3651d96b12e0400fa6af830b12f6de9681f5a35726099`;
LOD SHA `c890b077442f48563f0dbf18d9e781717b883a0d532d8b15a12f775116cba413`.

## Actual findings

The continuous cranial/core/fin/tail envelope holds the selected Swim, turn and
terminal Death poses without gross visible tears. Heavy shows connected oral
lining and small attached denticles. These few still images cannot establish
all animation clearance or hidden self-intersection. The eye caps still read
as exposed glossy beads, even though their large hidden volume may already be
substantial. The actual reduced-model colour is marbled and loses the full
model's coherent small tessera texture.

A bounded preliminary NumPy test decoded the actual full exported body and
left eye triangles. Uniform bounding-box rejection accepted 9,364 points inside
the actual globe; one vertical triangle-parity ray classified 82.923964% inside
the continuous body. This is **not the canonical three-direction confidence
audit and not an approval**. It identifies why blindly lowering the globe is
the wrong sole correction. A hypothetical corrected-array probe gave 87.5053%;
that number is only predictive and must not be attached to a future export.

A separate actual-export cranial diagnostic compared dorsal positions/normals
to the accepted analytic sculpt. Full surface error p95: 0.000000043 units;
LOD p95: 0.000024913. Full normal angular error p95: 2.2989 degrees; LOD: 2.3240.
This sampled region supports colour aliasing as the principal marbling cause,
not gross normal or decimation damage. It does not exclude a local defect
elsewhere. The new LOD is rendered in both colour and neutral material to test
that interpretation directly.

## Authored correction — not yet executed

`orbit_correction_02.py` blends the existing steep orbital surface toward a
softly curved oblique bed, joining the broad posterior brow. This edits the
continuous body vertices; there is no added shell, pad, hoop or separate rim.
The maximum actual pure-sculpt displacement is −0.03482 to +0.04445 units. Oral
rim change is below 3e−17 units; ventral/oral vertices are unchanged. A 19.8°
forward tilt aligns the iris-bearing corneal cap to the upward-facing bed, and
6% smaller globe radii soften its presence. The globe centre is set relative
to that bed at 0.044 units inward. Globe placement and soft socket form remain
reconstruction choices, not claims from flattened fossils.

`filter_lod_pigment_02.py` applies a surface-area weighted low-pass to the dense
linear pigment before decimation. Gaussian neighborhood radii are 0.11 dorsal,
0.080 ventral, 0.024 oral units; neighbors must share the tissue region and have
normal dot product above 0.65. This avoids sampling high-frequency tesserae as
isolated vertex spots and limits colour bleeding across thin fins. Full UV
textures remain unchanged. The LOD should retain the broad olive/ochre pigment,
not microscopic tessera detail.

## Audit and visual gates

`audit_candidate_02.py` reads actual full and LOD GLB accessors, inverse bind
matrices and animation channels without importing a authoring .blend/builder.
It reuses the unchanged canonical eye-audit topology, three-ray parity and
Wilson functions. Bind poses use 120,000 candidate samples per globe; selected
whole-pose/jaw extrema and late recovery use 24,000. Each export is separately
measured. Candidate-02 must have a conservative lower bound ≥65% for both eyes
at every measured pose; 50% remains the absolute minimum. Closed continuous
body and globe topology is required without temporary caps.

The audit also measures each denticle solid's nearest tissue contact (0.010
unit limit) and each anchor's distance/inside-tissue votes. These measurements
support the oral/attachment review but cannot prove no internal collision.
Extrema cover each full action and each LOD action, not every continuous instant.

Numerical PASS alone cannot approve eyes that still look like buttons, a flat
shell or rims that hide the globe. Reject distorted iris caps, empty sockets,
bead silhouettes, inconsistent LOD eyes, or lingering melted colour. Inspect
three close orbital angles, Heavy oral, the full portrait and both actual LOD
views before advancing. Root's candidate01 runtime harness is untouched.
No final model/public/Git approval is implied.
