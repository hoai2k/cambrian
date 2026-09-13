# Bothriolepis M04 actual review — HOLD; pause checkpoint

8 September 2026. Astra high. Independently inspected all nine actual M04 images, compared the earlier M03 images and re-opened `/Users/hoai/Downloads/Bothriolepis.jpeg`. All 44 frozen input hashes and all 20 output-inventory members verified. No further Blender run or M05 source implementation.

**Overall verdict: HOLD appearance, preserve accepted coarse form and improved oral transition.** M04 resolves the conspicuous four-sided mouth platform much better than M03. Its armor is more legible, but the forehead/nuchal transition has hard facets, the microstructure is too intense and organized into rows/wrinkles, and the rostral cap now contrasts strongly with the textured cephalic field. These failures are visible despite source numerical checks passing. Do not begin a production rig/export cycle yet.

## Bound evidence

- Output directory: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/bothriolepis/rework-v3/material04/`.
- Output inventory SHA-256: `7e4ff7012491f2a083342b42be40059276713601871e319cef7f8c9f5007d715`.
- Editable blend SHA-256: `5d839ec10a030595c9ab2c66405b97379e0d319f1fbe8c7966c5bae26f626c9b`.
- Frozen execution inputs SHA-256: `7d3e1e8cb9922bc81295cecb8c9df6b5520d85bddea55a3f35e13aac65f00743`.
- Actual geometry/key hash after declared change: `abdcbfa7a2dad39e6895bf824114d4f6732d4eacd26eaa622f6ff6acf4ed582d`.
- Actual source checks: five oral poses PASS; topology 55,802 vertices / 56,104 faces / 111,600 triangles, connected/closed; eye meshes unchanged; 38,904 protected vertices; study-key delta roundoff 2.9802322387695312e-08. Maximum additional plate relief .0066911650. These checks establish declared scope/topology, not final visual quality or a complete intersection audit.

## Per-image verdict

| Actual image | Assessment |
| --- | --- |
| `01-front.png` | HOLD finish. Bulky anterior and paired appendage roots remain. Forehead is visibly coarse/striated, rear central boundary has pale/dark angular notches, and a smooth brown triangular rostral patch contrasts with the textured field. |
| `02-side.png` | Preserve silhouette: tall anterior shield, rear median crest, narrow flexible trunk, square rayless dorsal and asymmetric tail. Plate edges read more clearly. This distant side view does not overturn the close-view material HOLD. |
| `03-dorsal.png` | Preserve form: both appendages still sweep outward and back with curved distal tips; shield remains broad. Useful plate layout is retained. Do not shorten or convert these thin-in-dorsal dermal appendages into fin membranes. |
| `04-oblique.png` | Improved armor readability and warm/cool regional separation, accepted broad mass retained. HOLD finish because cephalic texture is disproportionately harsh, the rostral triangle remains flat, and the nuchal junction catches a sharp highlight. |
| `05-underside.png` | Accept the coarse oral/floor relationship for subsequent work. The oval opening sits in a continuous ventral surface and the former rectangular construction surround is no longer conspicuous. Dense rows of microrelief remain a finish issue. |
| `06-mouth-open.png` | Accept the bounded oral geometry correction: coherent oval lip/recess, no four-sided raised platform. HOLD material here: granular normal detail forms regular-looking rows and strong highlights rather than restrained living tissue/bone variation. |
| `07-mouth-depth-oblique.png` | Confirms the improved continuous oral surround and preserved cavity depth. Slight aperture faceting is modest relative to the old board defect; do not broaden the mouth blindly. Finish remains overly stippled and directional. |
| `08-armour-detail.png` | HOLD. Authored plates are readable and pectoral shape is preserved, but the anterior surface resembles heavily embossed leather, with excessive shiny fine ridges. Local central/nuchal notches and the smooth cap/root response expose construction. |
| `09-forehead-continuity.png` | Decisive HOLD. The earlier long mirror-field divide is not the only remaining problem: the rear cephalic/nuchal seam has sharply faceted light/dark patches. The frontal field is intensely wrinkled; the rostral triangular material patch is clear. Eyes remain simple black ovals/glints and need their later completed-candidate audit; no eye approval claimed now. |

The user reference supports a bulky, sculpted bony front with irregular mottled relief. M04's regular microtexture should not be confused with that anatomy merely because it is stronger than M03. Keep the sculpted volume and long appendages; improve the local bone/tissue response.

## Focused next direction, after resume

This is a correction/diagnostic brief, **not an executable M05 handoff**. No new source or job is needed before the pause.

1. Preserve M04's oral coordinate correction, the shared oral/shield chart, and unchanged posterior/appendage geometry. Do not revert the successful oval transition with a broad smoothing pass.
2. Separate the remaining forehead geometry from shader effects before altering it. Author a small read-only close-up diagnostic on the exact M04 blend: current material, flat diffuse with texture normals/common Bump disabled, and a local geometric-normal/section report around the rear cephalic/nuchal seam. Use the same camera/light transform. Measure actual face normals and vertex positions near the sharp patches; the old analytic centerline derivative probe did not test this junction. No nine-view rerender is needed merely to isolate the cause.
3. Likely geometry contributor to test: the cephalic region contains original clay seam relief, M01 authored displacement and M04 added relief, with narrow features sampled on .02 longitudinal rows. Their combination can create faceted notches at the small nuchal branch. If the neutral-material view confirms it, replace only that local accumulated relief with one smoothly resolved anatomical field. Preserve the named plate relationships, eye support, posterior crest and broad shield curvature. Do not erase all bone definition or stack another deformation mask.
4. The rostral cap is a known source-response mismatch: M04 slot 7 still uses harmonic vertex pigment/common Bump without the shield atlas normal/roughness, while the adjacent cephalic field has much stronger atlas relief. Give that closure a genuinely continuous fine surface response with a valid local chart or bake from a shared rest-space field; do not force a collapsed longitudinal UV normal map onto the cap. Match boundary values and derivatives in the final surface, not only basecolor.
5. Reduce the excessive atlas micro-normal contribution and remove the visible row organization. Preserve irregular fine dermal relief, but let bone curvature and pigment carry the large-scale reading. A smaller physical height and less regular spatial sampling are more appropriate than another broad noisy color layer. Judge the cephalic field, oral surround and pectoral roots together; a smooth cap against a rough field will remain conspicuous even if the colors agree.
6. After a bounded repair is frozen, inspect a small matched forehead/oblique/open-mouth set first. Only a successful local result justifies the full appearance gate and production rig design. Eighteen dynamic actions/full-LOD anchors and final new-mesh eye/general audits remain pending; the current rework has only the oral study key.

## Pause / restart

User requested tie-up and pause. No M05 executable exists, and the frozen M04 command must not be repeated into its occupied output directory. On resume, read this review and `WORKING_STATE.md`, verify the M04 inventory above, and author the bounded diagnostic in item 2 before scheduling Terra. Parent owns any eventual shared runtime, public, catalogue or Git work. All M01–M04 evidence and source inputs remain intact.
