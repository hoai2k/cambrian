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

These are **preview library assets**, ready for integration review; they have not
been substituted into runtime flora slots or collision placement. In particular,
the Triassic stromatoporoid placeholder currently means sponge mound, so replacing
that slot with a microbial dome would place the wrong form in reef regions.
The material and proportions are art choices, not specimen scans or measured colours.
Mineral substrates are static and have no creature action clips.

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
those results are saved in `validation.json`. No shared collision registry is changed
until runtime placement is implemented. `npm run shapes` and `npm run props` must run
when that integration occurs. No special high-resolution LOD is needed for this batch:
the supplied assets already target repeated instancing.

## Resumption

Next integration work: introduce the missing substrate-specific placement slots,
select biome densities, register measured collision shapes where needed, and review
in-scene scale/contrast. Other B2 organic families and the four T1 scenery subjects
remain open. This batch does not start any creature or Tripo work.
