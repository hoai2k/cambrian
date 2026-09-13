# Triassic substrate props: first authored batch

Six static specimens implement three B2 requests. Every GLB is a single mesh and
single material, with vertex pigmentation, a base-centred pivot, no texture fetches,
and fewer than 800 triangles. Blender authors in Z-up and exports glTF Y-up.
Dimensions follow the brief's game-space scale-1 sizes, not a measured fossil.

| Family | Variants | Shape and intended use |
| --- | --- | --- |
| Stromatolite | 2 | Continuous asymmetric layered microbial domes, about 0.7 wide; taller and lower profiles. The rings are geometry, with muted laminar pigment. |
| Salt crust | 2 | Thin closed gypsum plates, about 1 wide, scalloped irregular rims and asymmetric edge curl. Pale mineral pigmentation. |
| Mud ripple | 2 | Closed 2-unit slabs with directional sinusoidal ripple relief, a thin contrasting ash horizon at the edges, and a flat underside. Two ripple phases. |

These are **preview library assets**. They are now placed in the runtime: each family is one
flora kind naming both of its variants in `src/content/triassic/scenery.ts`, scattered by
`src/content/triassic/environment.ts` at the densities the design gives them —
`stromatolite` on the gypsum flats (6) and the conifer shore (1), `salt-crust` on the flats (5),
`mud-ripple` on the black basin (2) — and collided against the pair's union envelope in
`src/content/prop-shapes.json`. The renderer picks a variant per instance from a hash of where it
stands, so a salt pan is not one plate stamped four hundred times.

The warning in this note was right and was acted on rather than worked around: the Triassic
`stromatoporoid` placeholder means *sponge mound*, so the dome did not take that slot. It got its
own kind, and the sponge-mound stand-in was removed from the gypsum flats, where a reef form
scattered over a hypersaline pan was the wrong animal in the wrong sea.

The material and proportions are art choices, not specimen scans or measured colours.
Mineral substrates are static and have no creature action clips: they set `maxLean: 0` in
`src/sim/flora.ts` and genuinely never bend.

## Files and reproduction

`public/assets/triassic/props-instanced/manifest.json` lists six GLBs, six transparent
preview renders, source paths, dimensions, triangle counts and hashes. Editable
Blender sources are committed under `sources/`; the builder is deterministic.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/triassic/props/build.py
node tools/triassic/props/validate.mjs
```

The Blender builder checks watertight topology and nonzero face areas before export.
The independent Node validator loads the actual GLBs, checks the manifest hashes,
one-mesh/material contract, colours, geometry, transforms and base pivots. It measures
each footprint with the repository's existing `measure()` from `tools/prop-shapes.mjs`;
those results are saved in `validation.json`. `npm run shapes` has since measured these GLBs into
`src/content/prop-shapes.json`, which is the registry the simulation collides against, and
`npm run props` audits the two against each other — re-run both after any edit to a source here.
No special high-resolution LOD is needed for this batch:
the supplied assets already target repeated instancing.

## Resumption

The integration this note asked for is done: the substrate kinds exist, the biome densities are
set from the design's table, and `npm run shapes` / `npm run props` have run and pass. What is
still open is in-scene review of scale and contrast against the painted biome plates, the other
B2 organic families (Encrinus, Diplopora, Thecosmilia, calcisponge, the shell beds), and the four
T1 scenery subjects, whose canonical poses and modelling sheets are in
`docs/triassic/canonical/`. No creature or Tripo work is started by this batch.
