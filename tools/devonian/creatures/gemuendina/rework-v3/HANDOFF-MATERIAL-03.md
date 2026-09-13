# Gemuendina material-03 — original organic swatch, regional control

Astra high inspected the actual original ImageGen swatch and read the saved
prompt/provenance. Root authorised using this source, not the resulting mapped
finish. Material-02 remains rejected for final use: its clouds are still too pale
and generic. Preserve all previous clay/material sources and output evidence.

The actual source is 1254×1254, despite the requested 2048² prompt. It provides
rich olive/ochre pigment, irregular small tesserae and clustered pale granules.
It also contains apparent relief and darker boundaries. Material-03 therefore
uses the source for **base colour only**, with slight contrast compression;
source brightness is not converted into height, normal or roughness.

The map blends approximately 75.5% source into the dorsal core, at most 19.34%
on fully lateral fins, and 3.5% on the ventrum. Cranial fields, oral bed and eye
regions retain the authored anatomical controls. About 0.34 source tiles per
authoring unit gives approximately 20–30 small tesserae per unit. No large
rock/crocodile cells or new plate/eye geometry is added.

The original image's seamlessness is not assumed. Four half-tile phase samples
crossfade around tile boundaries, with oblique, gently warped object-space
coordinates. A pure numerical continuity test using a deliberately nonperiodic
sample field passed at primary and half-tile boundaries. This does not replace
actual image review, but it rules out the straightforward repeat-edge jump.

The normal channel uses a separate much weaker fine granular field; former
procedural dark tessera lines and cell-sized bump structure are reduced. Iris
colour receives restrained radial fibres and a soft dark pupil, without changing
globe positions or adding pads. Final eye housing/containment review remains
required after the complete rework.

## Frozen inputs

- `materials_03.py`: `01ef1d8a1b9add51b490f167c719dbe00118f3ec422031b3ad28622a78e821e0`.
- `imagegen-skin-01.json`: `f41ca645788c2a1b28a5fc57512f559125ccdee96a69d67e58c8bf5920aa5315`.
- Local original swatch: `6820a68305bfd1265510934d3df653e0e80f2768158722b54684fbab0cdf0210`.
- Accepted clay-02 blend: `c4e65d1b0a37c9c034aaa6800bba8ad0b396d0547a4bf08faa276c62848c805f`.

`frozen-material-03.sha256` contains their exact absolute paths; its SHA is
`6a01913c31f3ba6e4bc32e4d1df85929b32b0d1ca8e7af5f3a103c33527fa3b5`.
Terra verifies that manifest digest, then each input. CWD:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

```sh
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-material-03.sha256
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/materials_03.py
```

All output stays under the fresh directory
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/material-03/`:

- Original-node `gemuendina-procedural-material-03.blend`, with swatch packed.
- Mapped `gemuendina-material-03.blend`, with game-compatible baked textures.
- Body 2048² and eye 512² albedo/normal/roughness PNGs.
- The same neutral `material-oblique.png` and `material-cranial.png` fixed views.
- `material-report.json`, recording accepted geometry, source/provenance,
  texture, blend and rendered-image hashes.

Expect `GEMUENDINA_MATERIAL_GROUP_OK`. CPU Cycles, two threads, same bake and
32-sample view recipe as material-02. Budget 20 minutes; report progress before
extending. Stop and preserve evidence on any error, hash mismatch, geometry
change or output collision. Do not edit inputs/settings or overwrite evidence.

Return the two actual views to Astra. Geometry coordinate hashes must remain
unchanged. Candidate material binding stays `PENDING_MATERIAL_REVIEW`; no rig
export, full/LOD approval, public overwrite, catalogue/status or Git operation is
authorised by this material handoff.
