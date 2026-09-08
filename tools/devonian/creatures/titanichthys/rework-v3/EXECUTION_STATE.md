# Titanichthys rework-v3 — executor state

## 2026-09-07T21:27:00Z — clay-01 — preflight complete

- Owner/model: Terra medium.
- Status: review-needed; execution complete.
- Frozen input hashes verified:
  - `build_clay.py`: `6d242a9542b5be441474515ad5ca4bf926baf0cb330fd9ebe9b2d6b0d2b63673`
  - `render_clay.py`: `746b7a2c0f62fe8286f1769a2fad3292d727b01dbe19019a705a1354ef7b696b`
- Candidate directory was absent before build.
- Build result: `TITANICHTHYS_CLAY_BUILD_OK`.
- Blend: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-01/titanichthys-clay-01.blend`
  - SHA-256: `0ac6cdef7578f0fe7270673a5348a620d1d88a33a1b055a96eb29407fd1ac4bf`
  - Bytes: `3613720`
- Construction report is valid and hash-bound to the builder and blend. Closed sculpt and fin meshes report zero boundary, non-manifold, and degenerate faces; two iris surface objects intentionally report open edges.
- Next command: the hash-bound Blender render command supplied in the handoff.
- Render result: `TITANICHTHYS_CLAY_RENDER_OK`.
- Manifest: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-01/render-manifest.json`
  - SHA-256: `90affbf0f7a8a2fbe05a6cb111ee4929cb8dc636d63c1a2f741e7dc5af3be191`
- Render output directory: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-01/renders`
  - Eight PNGs present; every file is 1440 × 1080.
  - Render recipe hash in manifest matches the verified frozen input.
- Stop condition: Astra visual/anatomical judgment required. Candidate remains `UNREVIEWED CLAY`; no integration or scene/model changes performed.

## 2026-09-07T21:34:00Z — clay-02 — preflight complete

- Owner/model: Terra medium.
- Status: execution in progress.
- Frozen input hashes verified:
  - `build_clay02.py`: `a4142814eb10db533eef2063fb4bfdca147860020a988ab6dedbe3edf1de7955`
  - `render_clay02.py`: `4103d297e3e1aab58924e79f194b716b5026863ca025a38941bfd0d9cffd2a8f`
- Candidate directory `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-02` was absent before build.
- Next command: the hash-bound clay-02 Blender build command in `HANDOFF-clay02.md`.
- Build result: `TITANICHTHYS_CLAY_BUILD_OK`.
- Blend: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-02/titanichthys-clay-02.blend`
  - SHA-256: `78a0caee9d8fef38f457b9f376671cefc30080232cf5cc61a3b4867b088f1098`
  - Bytes: `3645681`
- Construction report is valid and hash-bound. Each listed closed mesh reports zero boundary, non-manifold, and degenerate faces.
- Frozen hashes reverified unchanged after the build.
- Next command: the hash-bound clay-02 Blender render command in `HANDOFF-clay02.md`.
- Render result: four `TITANICHTHYS_CLAY_VIEW_OK` markers and `TITANICHTHYS_CLAY_RENDER_OK`.
- Manifest: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-02/render-manifest.json`
  - SHA-256: `4098e0ee7bdfbc23c4853a32d15e03edb6d76e680ee428ece8cf631431c98802`
- Four 1440 × 1080 PNGs are present in `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/titanichthys/rework-v3/clay-02/renders`:
  - `01-side.png`: `f9755cc56fd2747fb7a469cbde6e3da9a909fa75c2f96c35908afea55fef2836`
  - `02-front.png`: `571e854215af900b3605d04bb48ea3d3137648d47ccc48dcd0e66f42a4246fe4`
  - `04-three-quarter.png`: `7f1a1dd49af8bff1a06cbfbc06c947cd6060cde578337ec8e7f789720e70ad3b`
  - `08-gape-side.png`: `926536d71c3297ecef303c7a44a08e75a7478290c00a3a03678bd219afa418bb`
- Frozen hashes reverified unchanged after rendering. Stop condition: Astra visual/anatomical judgment required; clay-02 remains `UNREVIEWED CLAY` and clay-01 was preserved.
