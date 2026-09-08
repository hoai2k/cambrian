# Titanichthys material02 — living slate armour and structured membranes

Astra high. New material study on the same immutable coarse-form-approved clay04. Material01 was rejected after actual four-view review; its clouds and weak fine detail are the correction target. This phase changes UVs, pigment attributes and PBR materials only. No displacement, topology, shape-key, eye-position or fin-shape edits.

## Surface authorship

The cranial and thoracic armour carry a richer slate-blue pigment. Broad plate tones derive from the accepted anterior cage and existing suture paths, with stronger but restrained transitions. The suture attribute carries interpolated surface distance, allowing the shader to evaluate a narrow dark core rather than interpolating an already-soft opacity. A small surrounding tone variation keeps the boundary part of living covered armour. No random plate generator, cobblestones, fake cracks or raised tile relief is introduced.

An original built-in ImageGen swatch supplies irregular small filled pigment flecks. The first generated source was independently rejected for ringed pebbly cells and apparent depth. The second was inspected and accepted only as a flat pigment source. Exact prompts, originals, copied local files and hashes are in imagegen-dermal-provenance.json. No user reference pixels or Gemuendina swatch are reused. The colour direction is steel/slate blue, without importing Gemuendina's olive mosaic identity.

The shader maps that source on three object-space planes with normal-weighted blending, mild coordinate rotation and very small warp. Four phase-offset samples per plane blend image edges, so source seamlessness is not assumed. Tiling uses about one square per 1.22 construction units: small marks are intended to read as dermal flecks, never large armour cells. The flexible posterior receives a quieter fraction of the same source, a related subdued blue-grey ground and reduced puncta relief. The ventral transition stays warm muted grey. Broad procedural noise changes colour only slightly.

Independent fine grain and rounded puncta produce subtle shader normal and roughness variation. The generated image's brightness never creates normal, displacement or roughness. Armour has restrained wet roughness around 0.4, quieter flexible skin is rougher, and suture cores slightly rougher. This avoids replacing the former cloudy rubber with pebbles, glossy stone or metallic fish.

## Fins and mouth

Pectoral and pelvic rays use the accepted local span/chord correspondence; dorsal/caudal rays use their radial field. Stronger but subdued blue-grey ray pigment, darker intervening membrane and independent normal relief supply visible structure. Finer distal raylets emerge smoothly; both roots and tips fade appropriately. There are no free rods, new corrugations or silhouette changes. Fine membrane texture is smaller and quieter than the ray pattern.

The edentulous lip is subdued grey-green with finer dermal surface. The mouth separates a muted warm floor, a cooler darker palate and a rearward darkening based on existing spatial anatomy. Minute longitudinal striation is shader detail, not invented gill rakers, teeth or filter apparatus. Moist roughness remains restrained, so floor/hinge continuity can still be inspected under the same oral lights.

Dark optical eye material and the existing separate socket-axis atlas halves are retained. This is not the final eye audit.

## Execution and review

The source loads the approved clay04 directly, never the rejected material01. Before/after fingerprints enforce unchanged coordinates, polygon connectivity, all shape keys and transforms. Editable procedural and packed mapped blends are saved into new material-02 only. Both the approved source and generated pigment/provenance are hash-checked before and after.

Atlas plan: body/lining 4096 square; pectorals/caudal 2048; pelvic/dorsal 1024; eyes 512. Eighteen maps remain six albedo/roughness/tangent-normal families. Higher resolution is an authoring study choice to retain fine detail; final export budgets and LOD treatment remain later work. Mirrored fin UV correspondence and separate eye atlas halves follow the already executed material01 method. White Color attributes avoid duplicate tint. The body atlas shares a single restrained specular/coat response; regional roughness carries wetness differences.

Review uses the same four cameras, exposure and lighting as material01. Readability at side/oblique scale, continuous anatomy-bound armour fields at close scale, visible fin rays without needles, and an unbroken moist edentulous mouth are the acceptance targets. Do not approve from source or texture tiles alone. Terra executes once; Astra/root inspect the actual results before any rig, action, final eye/general audit or public work.

Pigmentation, microscopic grain/freckles, precise skin-covered plate tones, fin rays and soft-tissue colours are reconstruction choices, not fossil measurements. The saved primary morphology remains the anatomical constraint.
