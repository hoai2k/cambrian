# Dunkleosteus LOD color-space diagnostic

`study_03.py:174-182` samples Blender `tex.pixels` into `BakedPigment` without an explicit sRGB-to-linear conversion. `export_03.py:96-101` copies that attribute into `Color` before LOD decimation. `fix_lod_pigment_04.py:61-73` later changes only the GLB attribute binding from `COLOR_1` to `COLOR_0`; it leaves the complete BIN unchanged.

The read-only diagnostic compares fixed LOD `COLOR_0` vertices to embedded full-GLB encoded PNG pixels at the same nearest UV samples. For body, head, oral, and gnathal cases, direct encoded-channel error is far smaller than error after standard sRGB-to-linear conversion. Therefore the bake stores encoded sRGB-like channel values directly in GLTF `COLOR_0`; there is no conversion in this path.

This explains the reported direction of the mismatch when a renderer decodes full base-color textures as sRGB while consuming vertex colors as linear. It is evidence only; the artist/root decides whether and how to correct color space, roughness, or normal/detail parity.
