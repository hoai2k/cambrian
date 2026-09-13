# Actual shading diagnostic verdict and bounded repair

Owner Astra high. Independently inspected all 12 actual diagnostic PNGs and verified their hashes
against complete result.json. Parent independently reached the same causal finding.

| Actual diagnostic images | Finding |
| --- | --- |
| original-Orbit-front, original-Armour-close | Reproduce the white/brown polygonal seam tiles from candidate02. |
| no-normal-Orbit-front, no-normal-Armour-close | Tiles persist when the body normal input is removed. Posterior bump detail changes, distinguishing the ablation. |
| fixed-roughness-Orbit-front, fixed-roughness-Armour-close | Tiles disappear while normal detail remains. Roughness is the causal shader input. |
| no-normal-fixed-roughness-Orbit-front, no-normal-fixed-roughness-Armour-close | Tiles also absent with both changes; removal of normal is not necessary to eliminate them. |
| albedo-emission-Orbit-front, albedo-emission-Armour-close | No corresponding white/brown tiles in albedo. Fine pigment and sutures remain; oral-edge red comb is visible and requires recheck after atlas repair. |
| accepted-material04-Orbit-front | Clean accepted continuous finish, no polygonal flares. |
| baked01-before-export-Orbit-front | Same seam tiles exist before export. The failure is in the bake/UV coverage, not glTF material packing or animation. |

Combined with actual embedded texture probes (404 triangle centroids below .2 roughness, including
zero), the causal diagnosis is inadequate roughness atlas coverage on tiny smart-projected body
islands. Constant .66 roughness was an ablation only. Production must retain the accepted regional
roughness, fine living variation, sutures, pigment, normal signal and original geometry.

Versioned repair source: body_uv_02.py supplies two continuous exterior/oral rectangles from the
exact immutable clay04 ring topology. It verifies every face and role, preserves all positions,
weights, shared lips/collar and shape keys, places the angular seam at the ventral midline, and
allocates pole UVs per face. Exterior/oral strips have ample separation and existing 16px bake
padding. Body roughness resolution increases to 2048. All body channels rebake their exact accepted
shader fields; no painted fill, roughness clamp, constant replacement or new noise is introduced.
Fin/eye UV and bake settings remain as before.

Coverage gates inspect every pixel in both rectangles plus a bilinear filter border. Exterior
roughness must retain variation; oral tissue can retain its authored constant roughness. Bounds
reject uncovered or invalid roughness/albedo. The exported-map checker independently requires
decoded texture equality with baked PNGs and repeats coverage checks in the actual GLB channels.

The new UV map has minimum 32.77 pixels per body triangle at roughness2048 (median39.88), eliminating
the old subpixel body footprints by construction. Static tests reject changed semantic roles and
a single missing roughness texel. These are source/fixture checks; actual bake remains unexecuted.

Separate LOD adjustment removes the broad 9-tap atlas filter and retains 45% of fin geometry instead
of24%, preserving more vertices for fine rays. Body25% and eyes70% reduction are unchanged; final
pigment still samples final UVs after neutral-color decimation, with unchanged validity/transfer
checks. Estimated total LOD/full triangle ratio .3223. All18 dynamic actions are preserved. Actual
bar/ray fidelity, oral lip/corner appearance and all final material gates remain pending.

Original candidate01/02, bake01, accepted material04 and diagnostic01 evidence remain immutable.
