# Michelinoceras — FROZEN initial-preview handoff

2026-09-07. This individual author has completed the requested initial version. Parent owns packaging, viewer integration, shared tests and publication. Do not regenerate or overwrite this candidate after parent packages it without a new request.

## Exact locations

- Source: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/michelinoceras`.
- Authoring: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/v1`.
- Seven delivery files: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/v1/candidate` (two GLBs, metadata, four PNGs).
- Original Blender: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/michelinoceras/v1/michelinoceras.blend`; SHA256 `dbd8ff9c84e476b69442e8ec340f8ca97e02f9e9d6e49ab8fea72bdaaf09de20`.
- Primary specimen reference: `references/gnoli-devonian.pdf`, extracted `gnoli.txt`, personally inspected `gnoli-plate2.png`.
- Actual full renders: `review-export-full/` (15 anatomy/action views,15 sequential Swim/Heavy/Grab frames,1600×1200 selection).
- Actual LOD renders: `review-export-lod/lod-Idle.png`, `lod-Swim.png`, `lod-Death.png`.
- Visual review sheets: `preview-review.jpg`, `sequence-review.jpg`.
- Actual eye evidence: `audit-full/` and `audit-lod/`, both fresh hashes, closed actual head without artificial caps.
- Durable source snapshot: `source/`.

## Frozen output hashes / checks

Full: SHA256 `f69f1bfaae8e96d775756bb1fdbdc6b4c0971adf88892fd132ed885baaaaa313`,19,581,660bytes,243,404triangles,132,304vertices,19clips.
LOD: SHA256 `7166c05353811611d978fe202caea234a9a9b70eab359cd4d0e51da6a80be34b`,4,988,732bytes,74,844triangles,44,146vertices,3clips Idle/Swim/Death;30.7489%fulltriangles.
Both166bones, identical skeleton graph and3nested v1 anchors. Fulltextured/neutral vertexwhite;LODtexturefree/bakedlinear pigment.
All19 exact shared18+Grab action names, finite nonzero distinct motions, seamless Idle/Swim/Guard/Eat, identityroot and no scale channels, normalized weights, rigid shell exclusively body-weighted and bind socket alignment passed.
Full eyes74.64/74.83%;LOD74.67/74.86%. Conservative95%lowerbounds all≥74.30%, actual closed head, no counted decorative rims. Numerical ray discrepancies ≤6of120000bbox probes, conservative interval reported.
Reopened source verification `source-validation.json`: all19actions durably saved with fake users. Earlier refresh briefly revealed Blender discarding unused datablocks; this is now fixed in animations.py and the final source/exports. Validators now assert exact19/3 action sets.

## Final correction and visual review

The specific UV wrap seam was fixed both in mesh UV seam faces and periodic bitmap edges. The two small corneous plates have curved pointed solids and independent bones. Final eye/aperture/oral views reviewed after these fixes. Full/LOD locomotion/death and full principal-action extremes reviewed; sequential Grab/Heavy show open anticipation→inward collection→recovery, Swim retains modest shell-stable arm/funnel motion. All four portraits derive from final exported full model.

## Deferred preview refinements and uncertainties

No more art-refinement loop requested for this delivery. Precise arm-root sculpt fusion, complete arm/arm contact across every crossfade and oral-fold/skin coaptation remain later refinement work. Some intentional crown-contact overlaps occur at gathering peaks. The shell geometry is informed by M.currens Modena19380 (Lower Devonian Sardinia, Gnoli1982Pl2Fig1), but available material is fragmentary (best28mm). Whole adult size (.5mproject workingvalue), living chamber and all soft parts/pigment remain explicitly uncertain comparative completions. No squid fins/sucker discs/enlarged capture clubs or closure plate were invented.

## Reproduction

Complete commands are in README.md. From repo root: `python3 .../materials.py`, Blender `--background --threads 2 --python .../build.py`, `python3 .../validate.py`, Node `.../export_audit.mjs`, Blender `.../audit.py`, then `MIC_IMPORT=full MIC_RENDER=all` render.py and `MIC_IMPORT=lod MIC_RENDER=lod` render.py, then `python3 .../finish.py`. Blender needs authorized escalation on this host to initialize Metal. `MIC_RENDER=sourcecheck` reopens the original and proves19persisted actions. `refresh_materials.py` safely reloads geometry, restores all authored actions and reexports; no external/shared build module imports.

No active authoring processes remain after final review. No public files or git state were changed by this author.
