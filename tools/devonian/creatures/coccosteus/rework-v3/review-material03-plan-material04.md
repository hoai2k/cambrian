# Coccosteus material-03 actual verdict / material-04 source plan

Astra high, 8 September 2026. Independently inspected the actual user reference
`/Users/hoai/Downloads/Coccosteus.jpg` and all seven local material-03 PNGs.
The render manifest and every image's bytes/SHA were verified, not just the filenames.

Material-03 blend SHA-256: `e936eaf3284147d8906c9319652670138f9646436d10b229807e0e9251682a00`.
Report: `894dc335cb2c7d50fdf8a5ca661a5e0bdc5e0fd1f9ab69235a403c7e45ec76ca`.
Complete manifest: `73b8fc122d1f8c240e31912f256dec1ed43f39e18524e77c343e4ac348ea34ae`.

## Actual verdict

**Retain material-03 plate legibility and all accepted geometry; do not approve the finish.**

- Side: clear cranial/cheek/thoracic boundaries and useful warm-to-cool transition; the broad
  ochre anterior looks uniformly coated. Posterior broken bars and swept fin rays remain useful.
- Front: symmetrical armour boundaries stay legible, but broad highlights read as a moulded
  smooth surface. Eye/orbit appearance remains a later final-eye-audit question; no eye changes
  belong in this bounded material pass.
- Dorsal: existing large plates read at the whole-specimen scale. Broad plate interiors lack
  the reference's irregular fine dermal pigment. No additional grid is needed.
- Oblique: silhouette and armour hierarchy hold; surface uniformity is especially obvious on
  the crown and upper thorax. The posterior pattern remains subordinate and legible.
- Mouth-open: the one recessed lined oral passage remains coherent. Existing microbump becomes
  visible under the close light, proving that more bump is not the missing ingredient.
- Matched material/clay close-ups: the same relief persists. Pigment and roughness need fine
  irregularity within the plates; the existing normal detail can remain unchanged.

The reference supports a mottled fine biological finish, but the reconstruction's exact
colour is an artistic inference. This pass borrows no photo pixels and creates no ImageGen
swatch: a controlled, original procedural pigment signal is sufficient for this small change.
Material-02's strong cellular dots and broad clouds remain rejected.

## Focused source decision

Start with the frozen material-03 blend and copy its outer-body material. Reuse frozen
materials-03 utility functions. Preserve every existing node and replace exactly two links,
feeding new pigment and roughness into the old branches before their existing suture response.
Assertions stop on any unexpected node topology or unrelated link change.

The added pigment is fine domain-warped noise, with small irregular darker umber regions and
a still-finer breakup signal. The domain warp changes local shapes; it does not introduce a
broad colour multiplier. The total added colour multiplier is bounded conservatively between
0.6976515 and 1.037252 across all possible noise values: it can make scattered dark detail,
but cannot produce material-02's bright gold beads. Most values occupy a narrower range.

An independent noise field varies plate roughness by at most +/-0.08 before the retained
suture/margin response. The original normal branch is completely untouched, including the
already small armour bump and posterior microbump. Diffuse colour never drives relief.

Existing PlateStrength reduces new texture near lip/orbit exclusions, with 22% residual
fine variation in smooth exterior zones. Existing suture strength further attenuates added
variation by up to 94%. Old oral/eye materials are separate and remain unchanged. The old
seam and margin colours, their widths, strengths and roughness responses remain exact.

All ten original image pixel buffers (eight pigment/ray plus two plate maps), seven relevant
body attributes, all mesh coordinates/keys/faces/weights/transforms, and non-body material
assignments must match. Posterior colour and every existing shader normal connection remain
untouched by the two-link splice. No new geometry, maps, arbitrary boundaries, rig or action.

## Gate after execution

Inspect all seven actual material-04 images against material-03 and the user reference.
Plate hierarchy must still lead at side/dorsal/oblique scale. Close armour must reveal fine
irregular pigment and changing highlight texture without rocky cells, broad clouds, bright
dots, dirty blotches or crawling contrast. Clay close should remain unchanged. Mouth, eyes,
posterior bars and fin rays must retain their prior readability. If the grain is invisible
or dominant, return for authoring; do not infer acceptance from static bounds or successful
Blender execution. Rig remains blocked until an explicit actual material approval.

Source-only AST, fixed-camera JSON, old evidence hashes and analytical signal bounds passed.
No bpy import, Blender invocation or material-04 render occurred during authoring. Blender
node compatibility and the filtered, lit result remain unverified. Exact frozen execution is
in HANDOFF-MATERIAL-04.md; prior candidates and the named backup remain immutable.
