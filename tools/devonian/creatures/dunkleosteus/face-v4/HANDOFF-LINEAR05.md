# Dunkleosteus LOD05 color-space correction

The quantitative diagnostic found encoded RGB in linear COLOR_0. Apply only the standard sRGB EOTF to referenced RGB components. Alpha and all other source bytes must be identical. Preserve every earlier version. Do not change roughness or geometry to compensate.

After verifying frozen-linear05.json, run from repo root:

```sh
python3 tools/devonian/creatures/dunkleosteus/face-v4/fix_lod_linear_05.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/render_linear_05.py
```

Four matched actual images: full/LOD rest-oblique and Heavy15 max-front, with verified action slots/jaw evaluation. Preserve camera/light recipe and all prior outputs. Source full/LOD remain18 clips each. Geometry/skin/anchors are unchanged byte-for-byte, so do not rerun broad geometric audits for this color-only candidate. Return images/proof; no public copy, metadata or git. Root decides art acceptance.
