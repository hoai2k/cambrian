# Triassic instanced scenery library

Thirteen static specimens implement ten B2 requests. Every GLB is a single mesh and material,
with vertex pigmentation, a base-centred pivot and no runtime texture fetch. The procedural
substrates stay below 800 triangles; organic Tripo reductions use their explicit 3,000–6,000
triangle manifest budgets. Blender authors in Z-up and exports glTF Y-up. Dimensions follow the
brief's game-space scale-1 sizes, not a measured fossil.

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

`public/assets/triassic/props-instanced/manifest.json` lists the original six procedural GLBs plus
seven canonical-reviewed, Tripo-derived props: *Encrinus* litter, a *Daonella* bed, a
*Coenothyris* cluster, *Cidaris*, *Neocalamites*, *Pleuromeia* and *Bjuvia*. The generated source,
sanitized task metadata and three-view intake review are preserved under `tripo-raw/<id>/`; the
editable reductions are under `sources/`. `process_tripo.py` reduces each source to a bounded
instancing budget, sets the base-centre pivot and bakes the generated albedo into `COLOR_0`, which
is the pigment contract the shared scenery renderer consumes.

The manifest lists all shipped GLBs and transparent
preview renders, source paths, dimensions, triangle counts and hashes. Editable
Blender sources are committed under `sources/`; the builder is deterministic.

```sh
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/triassic/props/build.py
node tools/triassic/props/validate.mjs
```

The procedural Blender builder checks watertight topology and nonzero face areas before export;
`process_tripo.py` supplies the corresponding reproducible reduction path for a reviewed raw GLB.
The independent Node validator loads the actual GLBs, checks the manifest hashes,
one-mesh/material contract, colours, geometry, transforms and base pivots. It measures
each footprint with the repository's existing `measure()` from `tools/prop-shapes.mjs`;
those results are saved in `validation.json`. `npm run shapes` has since measured these GLBs into
`src/content/prop-shapes.json`, which is the registry the simulation collides against, and
`npm run props` audits the two against each other — re-run both after any edit to a source here.
No special high-resolution LOD is needed for this batch:
the supplied assets already target repeated instancing.

## Resumption

The integration this note asked for is done: the delivered kinds exist, the biome densities are
set from the design's table, and `npm run shapes` / `npm run props` pass. What remains is in-scene
tuning against the painted biome plates and the other unbuilt B2/T1 families, including living
*Encrinus*, Diplopora, Thecosmilia, calcisponges, reef blocks, Voltzia and the log raft. Their
canonical poses and modelling sheets are in `docs/triassic/canonical/`.
