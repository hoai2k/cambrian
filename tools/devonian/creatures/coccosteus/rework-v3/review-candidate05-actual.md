# Candidate05 actual art review — HOLD

Astra independently inspected all11 images in candidate-05/matched-evidence-06 at original1280x960.
Manifest is complete and all image/source hashes verified. Candidate05 full SHA
b7b929b9978f51f89e0cb1e687dec10d95b90edd3e2b2ba27b12432f58474655 remains accepted for bounded
full-surface art. LOD SHA9667f4510996260496d3695632e0d8ea5e7ab8c055eafa118be228dde8ab559a fails.

| Actual view | Observation |
|---|---|
| Full-Idle-side | Plates read as anatomical divisions, restrained grain, continuous broken transverse bars and fine fin rays. |
| LOD-Idle-side | Strong broad armor wrinkles and blurred/missing sutures; bars retain transverse rhythm better than04 but are soft/blotchy. Fin rays form repeated short angled segments. |
| Full-Idle-oblique | Clean large cranial/thoracic seams, quiet grain and transverse posterior pattern. Accepted full retained. |
| LOD-Idle-oblique | Cranial and collar pigment looks stretched into wrinkles; thoracic seam boundary indistinct; broad white highlight lacks full microfinish. |
| Full-Fin-close | Fine plate seam, quiet dermal grain, continuous thin pectoral/pelvic rays. |
| LOD-Fin-close | Pectoral/pelvic rays are chevrons across rings, not continuous radial lines. Armor pigment forms broad triangles and seam width is lost. |
| Full-Attack | Coherent open lip and dark oral lumen. Tiny near/far commissure dots remain pending separate oral QA. |
| LOD-Attack | Open shape follows full closely; rim is coherent. Strong broad outer armor wrinkles and softened sutures persist. |
| Full-Eat | Paired tiny dark commissure dots; shared oral opening, continuous lower lip. |
| LOD-Eat | Paired dots still present, no visible new long slit. Surface wrinkles and loss of outer armor detail remain. |
| LOD-neutral | Most broad wrinkles disappear, leaving shallow collar/ventral folds and a smooth posterior; major outline is coherent. This implicates pigment strongly, without proving every residual fold is geometry versus custom normals. |

The new structured topology improved maximum posterior axial span but did not preserve the
spatial appearance. The previous scalar mean/p95 pigment diagnostic was insufficient: fine
point-sampled grain can alias into low-frequency triangles and overwhelm a narrow plate seam;
fin angular sample stations do not guarantee triangle edges connect matching ray trajectories.
These are currently supported explanations, to be tested with direct unlit albedo versus neutral
matched views. Do not increase triangle counts or globally decimate as a response.

Actual read-only export audit: candidate-05/attribute-diagnostic-01.json, source
`diagnose_lod05_attributes_01.py`. All exported POSITION values exactly equal frozen plan rounded
tofloat32. All RGB errors <=7.633e-6 (16-bit quantization), UV error <=4.467e-8. No evidence of
COLOR_0 correspondence corruption. Normal p95 <=.0181deg across meshes; most max <=.076deg.
One exceptional ventral shared lip coordinate glTF(-6.576e-17,-.086000003,1.825000048) has4 split
vertices with72.404deg normal error (oral UV .02,.98000002 and underside UV .02,.74000001).
That is a separate localized custom-normal issue; it cannot explain the broad armor or fin-ray
artifact. Preserve and diagnose it rather than smoothing the whole creature. Body weight max
error5.79e-8; fin maxima9.67e-5 reflect small export weight changes and are not a broad Idle
appearance explanation. No final oral/eye/motion acceptance follows from these stills.

Next bounded direction: isolate pigment with6 actual images. If confirmed, use a positive
footprint filter on grain while retaining/reconstructing macro plate and ray boundaries through
explicit feature-aligned topology. Keep actual accepted pigment as the color source and keep
texture-free LOD contract. Preserve accepted full/bake03/rig/all18 clips and shared mouth topology.
No global decimator, full rebake or count-only repair. Source-only diagnostic handoff follows;
no author Blender execution or public/Git edits performed.
