# Bothriolepis V3 — MATERIAL02 review and MATERIAL03 frozen handoff

Owner: Astra high. Execution: Terra medium assigned by root. 2026-09-08.
Verdict: **MATERIAL02 rejected at the bounded appearance gate.** No rig/export phase.

Reviewed all eight actual images: front, side, dorsal, oblique, underside,
open mouth, mouth depth oblique, armor detail. Compared the user reference and
primary 2014 figures 2, 3, 5 and 7 previously inspected in this source task.
The actual MATERIAL02 blend is SHA-256
`2ad2da4be7ce0e72d4804ded167ef0767087daa18e1494632df83caaf4ecb900`;
its output inventory is
`ca009f15561f69eaade8acb983688e449eeb09a3acaf583031c130aea9c4373c`.

MATERIAL02 resolves most pale nose badge, collar and rectangular oral-surround
contrast. Root geometry and the true recessed ventral mouth remain coherent.
However, the oblique/full silhouette still reads as uniformly colored olive
panels, and the front retains a conspicuous exact median value split. This is
not adequate living armored-animal character merely because earlier defects
are smaller. The suture hierarchy remains useful; indiscriminate noise is not
an acceptable substitute for the requested textured, bulky anterior.

## Bounded diagnosis and change

The remaining front split has a geometric contributor. `section()` mirrors a
half-profile whose first Hermite Z tangent is clamped rather than mirrored.
Its first control roof drop of .047 with tension .62 produces a cusp at the
cephalic median. The new delta cancels just that first Z tangent term, blending
in from y=-1.56 to -1.45 and out from y=-1.20 to -.97. It moves neighboring
cephalic grid vertices upward by at most .004317 units and leaves the exact
median height, oral surface, pectoral roots, posterior and intended thoracic
crest unchanged. All oral shape keys receive the identical delta, preserving
their deformation vectors. No topology, silhouette proportions, plate paths
or generic body reconstruction changes are included.

Pure section sampling shows the opposing near-median surface-normal distance
at y=-1.41 decreases from .357521 to .00000729; at y=-1.30 from .476296 to
.00000120. At y=-.60 it remains .357662, preserving the thoracic ridge. This
isolates the cephalic tangent defect, but actual lighting review must still
confirm that the offending split is gone. The mesh's existing low-amplitude
physical plate relief is retained without applying it a second time.

MATERIAL03 adds smooth subdued brown/moss pigment fields, local within-plate
radiating/coalescent ornament and roughness variation around nine interpreted
growth centers. Ornament fades near the fourteen existing suture paths. Fine
ImageGen microtexture remains subordinate; no new ImageGen image was required.
These pigmentation and growth-center choices are artistic living-surface
interpretations, not measured fossil colors or mapped ossification centers.
The deeper scaleless posterior remains quiet, with no invented scales or rays.
Pectoral blades retain their lateral broad face and narrow joint distinction.

Explicit sRGB encoding, ventral UV wrap, periodic normal derivatives, harmonic
boundary pigment continuation and common exterior pore response are preserved.
The common Object-space pore Bump is a mandatory later normal-bake dependency;
it must not disappear silently in a GLB export.

## Source checks and execution

Local Python AST/import checks pass. A 384x256 field probe is finite; color
encoding roundtrip error .001519; pigment range .026648–.162567; roughness
.498324–.659758. Maximum analytic tangent delta .004316714; thorax and posterior
delta exactly zero. Fourteen authored suture paths remain. Local reports and
UV preview are `material03-source-preflight.json`,
`material02-cephalic-tangent-diagnosis.json`, and
`material03-preflight-atlas.png` in the sibling authoring rework-v3 directory.
The UV preview was inspected; it is not a model-render approval.

All executable and transitive inputs are frozen in
`frozen-inputs-material03.json`. From the repository root, run exactly once:

```sh
/usr/bin/python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/bothriolepis/rework-v3/execute_material03.py --run-frozen-material03
```

The executor verifies every hash, then launches Blender CPU2, 32 samples,
using the exact MATERIAL02 blend. It writes only sibling authoring
`bothriolepis/rework-v3/material03/`: a blend, nine maps, eight review PNGs,
source-check JSON, output SHA-256 inventory and execution log. No rig, GLB,
portraits, public changes, general audit or Git commands are included.

Stop on input mismatch, existing target blend, Blender failure or missing
inventory. Preserve all evidence and return to the author; do not edit source
or choose another output directory. The author did not launch Blender.

## Actual-image gate after execution

- Front: median cephalic value split removed without flattening the intended
  thoracic dorsal crest; eyes stay adequately embedded.
- Oblique and side: convincing bulky living armor at full-body/game distance,
  warm brown/olive regional variation, restrained growth-oriented relief and
  grain; no toy-flat uniform panels or excessive random stipple.
- Detail and dorsal: clear plate hierarchy, no wavy printed fingerprint effect,
  no mirrored seam or UV discontinuity, normal ornament follows armor volume.
- Underside and both oral views: genuine toothless oral recess, contiguous
  exterior without rectangular patch, no pale nose badge or root collars.
- All views: accepted silhouette, primary pectoral orientation/length/joint,
  scaleless posterior, square rayless dorsal and full-body framing preserved.

Only after an actual eight-view gate passes may the next source phase build
an anatomy-aware rig, all eighteen dynamic clips/anchors, full LOD family,
normal-baked export and portraits. That phase remains unwritten here.
