# Titanichthys candidate08 composition — prepared, not executed

This is a source-only preparation for a future local `release-candidate08`; artist approval remains required before execution. The base is immutable candidate07 full and LOD. The full output will receive only accepted normal-study image bytes; both full and LOD will receive only the eye-seating-study02 eye POSITION bytes and accessor min/max. No Blender, bake, render, editable blend, compression, public write, or package step belongs to this operation.

`prepare_release_candidate08.py` refuses an existing output directory, verifies `frozen-release-candidate08.sha256`, checks candidate07 eye accessor identity/count/layout against study02, and copies no bytes outside the two eye POSITION spans. It confirms every candidate07 original embedded image hash against the accepted lossless-PNG report before obtaining its replacement bytes from the reviewed normal-study GLB. It appends replacement image bytes so every pre-existing non-image bufferView offset and byte range stays intact. The JSON proof permits only eye accessor min/max, affected image bufferView offset/length, and the sole buffer byteLength.

Execution, after approval, is only:

```sh
python3 -B /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/titanichthys/rework-v3/prepare_release_candidate08.py
```

Review `release-candidate08/release-report.json` before any separate established lossless-package07 helper is considered. Do not create an editable blend unless the separate Astra instruction supplies it.
