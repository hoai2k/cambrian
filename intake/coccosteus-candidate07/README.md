# Coccosteus candidate07 handoff

Recovered from the original local authoring directory on 2026-09-12 at the user's
request. Full and LOD GLBs exactly match the SHA-256 values in the frozen candidate07
review. This is an intake handoff, **not final acceptance or a runtime replacement**.

- `coccosteus.glb`: accepted full export, 22,931,780 bytes.
- `coccosteus.lod1.glb`: candidate07 LOD, 3,236,312 bytes.
- `coccosteus.json`: original candidate metadata.
- Four PNG portraits reused from candidate04, whose full export is byte-identical.
- `source/coccosteus-production-04.blend`: actual rigged full-model source reused by candidate07.
- `matched-evidence/`: six LOD views and their six full reference counterparts.
- Original reviews, structural report, frozen input records and finishing handoff included.
- `intake-manifest.json`: hashes of every copied file for verification.

Original JSON reports retain their historical absolute paths. Match by basename to
the files here; builder scripts already live in
`tools/devonian/creatures/coccosteus/rework-v3/`. This package does not duplicate all
207 historical bake/planner inputs. It supplies the reviewed exports, source rig,
portraits and review evidence needed to continue the finishing checks.

Next: bounded oral/eye temporal validation, actual full/LOD animation playback and
switching, then final packaging/integration. See `HANDOFF-CANDIDATE07-PAUSE.md`.
