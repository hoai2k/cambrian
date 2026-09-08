# Frozen Terra execution — Gemuendina clay-02

Astra high reviewed clay-01 and rejected its final sculpt. This is the next
secondary sculpt candidate, not a material/rig/export phase. See
`visual-review.md` for the hash-bound review and acceptance criteria.

Input manifest `frozen-inputs-02.sha256`, SHA-256:
`7a321bd262c1fc98f974e7054996ed077c096fa2c9b8fc677b072915e5ac835a`.
It binds the three new scripts and visual review to absolute paths.

CWD for every command:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

Verify the manifest digest above and then every input before execution:

```sh
shasum -a 256 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-inputs-02.sha256
shasum -a 256 -c /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/frozen-inputs-02.sha256
```

Group 1 — build new clay-02, then record output/hash before group 2:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/build_clay_02.py
```

Expect `GEMUENDINA_CLAY_BUILD_OK`. Output folder:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/gemuendina/rework-v3/clay-02/`.
Outputs: `gemuendina-clay-02.blend`, `build-report.json` (closed topology,
positive volume and exact source/blend hashes). Refuse existing nonempty folder.

Group 2 — exact fixed four-view initial render:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/gemuendina/rework-v3/render_clay_02.py
```

Expect `GEMUENDINA_CLAY_RENDER_OK`. Same output folder receives
`threequarter.png`, `front.png`, `side.png`, `dorsal.png`, and
`render-manifest.json`. Closeups are deferred until these primary views receive
Astra review.
1200×1000, neutral clay, CPU Cycles 32 samples, two threads. No geometry/pose
changes during rendering. Dorsal framing now includes the whole tail.

Store logs under `.../gemuendina/rework-v3/`, outside the candidate folder, if
capturing them. All generated output stays local. Do not touch clay-01 files,
old sources, public assets, catalogue, metadata or preview status.

Stop on an error, changed input hash, existing candidate/output refusal,
incomplete image manifest or any creative judgment. Preserve evidence and
return the exact issue to Astra; do not alter settings/scripts or overwrite a
candidate to force success. Build budget 5 minutes, render budget 10 minutes;
report current progress if exceeded before deciding to extend.

Return all four actual image paths, source/blend hashes and reports for Astra
review. No textures, rig, GLB, LOD or general eye audit is authorised by this
clay execution handoff. Static checks already passed; visual approval remains
pending the actual new renders.
