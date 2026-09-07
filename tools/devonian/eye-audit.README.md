# Devonian eye embedding audit

This audit measures the volume of each **actual exported eye globe polyhedron** inside its surrounding continuous head/body envelope. It excludes orbital hoops, eyelid beads, plate trim and decorative meshes. It does not infer embedding from the eye center, exposed surface vertices, or a screenshot.

The user's minimum is 50% inside. Aim for a conservative lower confidence bound of at least 65%, with 70% as a useful authoring target. A numerical pass is necessary but does not approve the artistic result or orbital integration.

## Run

From the repository root:

```sh
node tools/devonian/eye-audit-export.mjs 1e43197
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit-self-test.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/eye-audit/1e43197
```

The first step reads committed GLBs and authoring source with `git show`, decodes Meshopt using NodeIO, applies mesh node world transforms, and writes geometry snapshots with SHA-256 hashes. It never executes a creature builder. The source copy is for human identification of the continuous head and true eye globes. The second step checks known inside/outside points, reversed normals, a known 50% polyhedron volume cut and reported boundary closure.

To inspect uncommitted models without changing them:

```sh
node tools/devonian/eye-audit-export.mjs --working dunkleosteus
```

Use the timestamped output directory printed by the exporter as the Blender argument. Explicit IDs also work with committed revisions. A new snapshot must be made after every model change. Never attach an old report to a new GLB; compare asset SHA-256 hashes.

## Reviewed selectors

The baseline selects `Cranial shield soft foundation` for Dunkleosteus, `Joined cephalothoracic cuirass` for Bothriolepis, and the largest connected component of the body-material primitive for the other six published fish. These were checked against their committed builders. Globe material names end in `eyes`.

These defaults are **not** a universal species classifier. Before auditing a new or redesigned mesh, inspect component semantics and make an explicit selector JSON if necessary. Supply it as the second argument after `--`:

```json
{
  "dunkleosteus": {
    "headMesh": "Continuous cranial envelope",
    "headComponent": 0,
    "eyeMeshes": ["Left eye globe", "Right eye globe"]
  }
}
```

Alternatively use `headMaterialSuffix` and `eyeMaterialSuffix`. Components are sorted by triangle count. Select closed globe solids, not separate irises, highlights or lids. Select continuous anatomical head tissue, not an orbital rim constructed to hide a protruding eye. A changed mesh with an unreviewed selector has no approved measurement.

## Method and limitations

- Weld coincident glTF seam vertices to 1e-6 model units; discard zero-area triangles. Split connected components. Report nonmanifold topology; fail on an unsuitable envelope or open globe.
- Generate 120,000 deterministic uniform bounding-box candidates per globe using a seeded PRNG. Reject points outside the actual globe triangle BVH. The accepted points are uniform in **volume**, including the triangulated ellipsoid's actual shape.
- Classify each accepted point against the actual continuous head triangles using three distinct ray directions. Ray parity avoids dependence on face-normal orientation. Float-precision ray advancement is 2e-6 model units.
- Report sample counts, majority estimate, 95% Wilson interval, disagreements and conservative bounds that assign every directional disagreement outside for the lower bound and inside for the upper bound. The 50% criterion and 65% target use these conservative bounds.
- For a missing oral aperture boundary, close the envelope with an explicitly reported temporary fan cap. This only defines the anatomical outer envelope for measurement; it never edits the asset. Report cap centers/radii and a conservative clearance from each globe. If a cap's bounding sphere overlaps an eye's bounding sphere, mark the result ambiguous rather than accepting it. A nonplanar aperture closure remains an envelope approximation and must be reviewed.
- Mesh units here are authored model units, not meters. The authoring guidance reports estimated translations in glTF and Blender axes for the *same old globe and head*. These suggestions are not edits, anatomical prescriptions, or approval of a redesign. Re-audit after changing head form, eye dimensions, orbit topology or LOD.
- This is a rest/bind-space audit. It does not evaluate skinned eye placement through animation, LOD deformation or mouth collision. Those remain additional review gates. Export geometry assumes skin bind geometry matches mesh world transform, as reviewed for the eight baseline builders. For nonidentity skin bind corrections, export evaluated bind meshes instead.
- Sampling uncertainty is not the same as uncertainty in the selected anatomy. Borderline values need more samples and anatomical review; never move the threshold or count a decorative torus as head tissue to force a pass.

Outputs stay in `cambrian/local/devonian-authoring/eye-audit/`: `report.json`, per-eye central cross-section SVGs, decoded geometry snapshots and frozen source copies. The SVGs show grey head boundary and orange eye boundary, not a volume calculation. A silhouette can look seated from one camera while the quantitative volume still fails.

## Published baseline, revision 1e43197

All sixteen eyes fail the 50% minimum against continuous head tissue:

| Creature | Eye 0 inside | Eye 1 inside | Result |
| --- | ---: | ---: | --- |
| Bothriolepis | 0.87% | 0.86% | Fail |
| Cladoselache | 44.07% | 43.84% | Fail |
| Coccosteus | 41.26% | 41.23% | Fail |
| Doryaspis | 0.00% | 0.00% | Fail |
| Dunkleosteus | 22.06% | 22.31% | Fail |
| Gemuendina | 31.20% | 31.28% | Fail |
| Stethacanthus | 43.36% | 43.59% | Fail |
| Titanichthys | 38.72% | 38.30% | Fail |

Each eye has roughly 61,000–63,000 accepted samples. Nonzero estimates have sampling intervals roughly ±0.4 percentage points or less. The largest ray disagreement count is 101 samples in one Titanichthys eye, approximately 0.16%; even assigning every disagreement inside cannot approach 50%. Doryaspis has a tiny numerical upper bound despite its rounded zero estimate. Exact counts and conservative bounds are in the report.

## Visual findings to carry into individual redesigns

These observations concern the published selection renders, not a fossil-anatomy verdict. All eight were built with Blender; the problem is the resulting form, integration and surface treatment, not a missing Blender step.

- **Dunkleosteus:** the eye appears mounted on the cheek rather than seated in it. Cranial roof and trunk are rounded independent masses with an abrupt junction, and thick plate islands appear pasted on. Large pale wedge gnathals and a thin lip shelf dominate the mouth. Give the continuous head/jaw silhouette priority before microtexture. Model a connected oral interior, coherent jaw hinges and skull articulation; verify open-mouth views. The parent has assigned its redesign separately.
- **Bothriolepis:** both eyes sit on a conspicuous dark bar and small raised pale seats, almost entirely above continuous head tissue. Integrate the orbital area into the dorsal shield. The long tapering fin shafts meet visible spherical hinges; refine those transitions. Isolated scattered surface granules and broad marbling do not yet convey consistent dermal texture.
- **Doryaspis:** the eyes are completely above the head, carried by pale ring beads. Lower them into anatomically continuous shield tissue and blend the orbit. Dense parallel shield ribs, thick cream edges and the forked appendage silhouettes give a manufactured appearance; use more restrained relief and natural transitions.
- **Titanichthys:** the small eyes and open rims sit proud of the shield. Repetitive rectangular plates make the broad head look tiled; establish individually considered shield outlines and subtler suture relief. The large elliptical tube mouth needs a convincing transition from lip to cheek and internal tissue, while preserving toothlessness.
- **Coccosteus:** large black button eyes with near-circular exposed rings dominate the head. Seat the globe and build the brow/cheek around the orbit. Sparse raised granules and pale flat plates read as surface attachments; improve their hierarchy and integration. The snout/terminal mouth is overly tubular in the selection view.
- **Gemuendina:** the eyelid rings partially disguise the low globe embedding. Broad repeated hexagonal tiles and raised fin spokes overpower the soft-body form. Keep its distinct flattened planform, but vary tessera placement/scale and lower the trim-like relief; embed the eyes into integrated dorsal tissue.
- **Cladoselache:** the globe and thin bright orbit hoop project as a button. Gill slits, lateral sensory line and fin rays resemble applied cords. Work from the smooth continuous silhouette toward recessed or subtle anatomical surface detail; deepen the eye socket without adding a decorative bezel.
- **Stethacanthus:** shares the projecting eye/hoop problem and applied gill/line treatment. The head denticle patch and brush crown are rigid, evenly spaced rows of large spikes; refine scale, spacing and transitions while preserving the distinct brush structure. Its unique silhouette needs its own anatomy decisions, not merely the Cladoselache body with additions.

Do not treat these as a request for identical texturing across species. Each should retain its own proportions, armour or skin, eye orientation, fin architecture and individual animation performance. Passing the volume audit cannot excuse an exposed concave orbital backside, detached-looking rim, malformed jaw or weak silhouette.

Additional authoring review frames inspected: Titanichthys `Bite-side.png`, Coccosteus `Ability-front.png`, Doryaspis `Idle-side.png`, Gemuendina `Ability-front.png`. Doryaspis' side view clearly exposes the elevated orbital rings above the shield. Coccosteus' frontal view exposes the projecting globes/hoops; Gemuendina's frontal view shows low but still protruding dome eyes. These supplemental frames were local authoring renders; the quantitative measurements and selection-render comparison use frozen published assets.
