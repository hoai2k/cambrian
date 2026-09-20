# Triassic plant and prop canonical audit — 19 September 2026

This review replaces the pending manual-review gate for the seven second-pass plant and prop
images. The art is judged against the role and dimensions in
[`02-biomes-and-depth.md`](02-biomes-and-depth.md), the production contract in
[`03-image-and-model-requests.md`](03-image-and-model-requests.md), and the morphology notes in
[`research.md`](research.md). A visually attractive image is not approved when its diagnostic
shape would teach the 3D generator the wrong organism.

| Subject | Decision | Production direction |
| --- | --- | --- |
| `bjuvia` | **approved after input cleanup** | The short trunk and broad, entire, midribbed leaves communicate *Bjuvia*. Remove the ground patch in the Tripo input and keep leaf thickness modest during processing. |
| `pleuromeia` | **approved after input cleanup** | The unbranched scarred stem, strap-leaf crown and single terminal cone are all present. Remove the ground patch; keep the unseen rhizomorph below the base plane rather than inventing exposed roots. |
| `neocalamites` | **reframe** | The jointed clump and nodal whorls are right, but the tallest shoot touches the frame. Redraw with complete top margin and a clean base; preserve the current morphology. |
| `brachiopod-cluster` | **redraw** | The candidate has strongly ribbed, angular shells. The requested *Coenothyris* should read as rounded/ovate, moderately biconvex and mostly smooth, with restrained growth lines and a stout beak. |
| `daonella-bed` | **redraw** | The candidate reads as separated triangular scallops. Build a dense, shallow pavement of very thin, broadly ovate to subcircular valves with an extended hinge and low relief, overlapping rather than isolated in a wide sand field. |
| `cidaris` | **redraw** | Retain the club-spine silhouette, but replace invented crater rows with five narrow ambulacral zones alternating with broad interambulacral plate columns and seated primary-spine tubercles. Simplify fragile secondary spines. |
| `encrinus-litter` | **redraw** | Keep the sparse single-layer scatter, but make loose columnals and short attached stem lengths share one coherent construction: circular lumina and fine radial articulation ridges, without ornate coin faces or ragged pipe ends. |

All seven delivered candidates are 1254 × 1254, below the 2048 × 2048 request. Approved Tripo
inputs therefore receive a clean 2048-square modelling canvas with the complete silhouette,
neutral background and no unrelated substrate. The input remains derived from the canonical; it
does not introduce a new design.

Although the earlier plan classified these subjects as deterministic Tier 2 props, the current
production direction explicitly requests Tripo generation. The raw Tripo bodies will be preserved
for provenance, then reduced and repivoted to the existing instanced-scenery contract: one mesh,
base-centred pivot, small runtime topology, no skeleton, and the scale-1 dimensions in the biome
table. Dense floor patches may use the generated shell or columnal forms as repeated components
inside one merged game mesh rather than shipping a high-poly photogrammetry-like sand slab.
