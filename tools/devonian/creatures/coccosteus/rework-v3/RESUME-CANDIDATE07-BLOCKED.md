# Candidate07 re-derivation — blocked at candidate-04, 2026-09-12

Resumed from `HANDOFF-CANDIDATE07-PAUSE.md` to run the three finishing steps (oral/eye sweep,
playback/LOD-switch check, packaging). Step 0 of that plan — re-deriving candidate07 in this
checkout, since none of the handoffs' `../devonian-authoring/coccosteus/rework-v3/...` output
directories exist here — could not complete. **No new candidate07 GLB was produced or verified.**
Steps 1-3 (sweep, playback check, packaging) did not run: there is no full/LOD pair, verified or
otherwise, to run them against.

## What is missing

`/home/user/devonian-authoring/` exists on this machine (siblings for cheirolepis, dunkleosteus,
eldredgeops, manticoceras are present) but has **no `coccosteus/` subtree at all**. Every
generated intermediate this rework produced — clay01-04, materials01-04, baked01-03,
candidate01-05, lod-plan05, lod-plan07, diagnostic-shading-01 — is gone. All of it is, in
principle, re-derivable from the committed `.py` sources under this directory (all of which use
`Path(__file__).resolve().parent`-relative `ROOT`/`REPO` computation, so nothing needed a Mac
path rewrite beyond the shell invocation itself), *except two files*.

Verification method: `frozen-lod-07.json` and each stage's own `frozen-*.json` list every input
each build script's own embedded `verify()` will hash-check before doing anything else. I wrote
`audit_frozen.py` (kept in the session scratchpad, not committed) to remap each frozen path's Mac
prefix to this checkout and this machine's `/home/user/devonian-authoring/coccosteus/rework-v3`,
then `sha256`'d whatever exists. Every one of the 207 `frozen-lod-07.json` entries that lives
under `devonian-authoring/` is currently missing (none mismatch — nothing exists yet to compare);
the entries under `tools/devonian/creatures/coccosteus/` (the committed scripts themselves) all
hash-match, so the source code has not drifted from what was frozen.

Tracing the dependency chain (`candidate_04.py` -> `production_common_04.verify()` ->
`frozen-candidate-04.json`, which `frozen-lod-05.json` and `frozen-lod-07.json` both also
require in full) turns up two files with **no producing script anywhere in this repository, and
found nowhere else on this machine** (checked by filename across `/`, and by hash across
`/home`, `/root`, `/tmp`):

| File | Expected SHA256 | Expected size | Required by |
|---|---|---|---|
| `production-04-static-report.json` | `44a073d782e890d39a97b24aea43167ab21f6f236de9717b108eb9cc8a76ceed` | 1104 bytes | `frozen-candidate-04.json`, `frozen-lod-05.json`, `frozen-lod-07.json` |
| `lod-plan-07/lip-basis-fixture.json` | (only recorded in `frozen-lod-07.json`) | — | `frozen-lod-07.json` |

`HANDOFF-CANDIDATE-04.md` describes `production-04-static-report.json` as a source-only AST/path
diff ("new source syntax, exact path-only normalized differences, old 68 frozen dependencies and
33 generated bake files pass", "No Blender by author") — the same kind of check
`check_production_source_01.py` and `check_production_source_03.py` perform for their own stages.
There is no `check_production_source_04.py` (or equivalent) in this directory, on this machine,
or in `/home/user/devonian-authoring`. `check_production_source_03.py` is bespoke to the 03-vs-02
comparison (specific function names kept, specific candidate-02 triangle-ratio check, specific
limitation text) — porting it to a 04-vs-03 comparison would mean guessing at field order and
wording well enough to reproduce an exact SHA256, which is not something to fabricate. Nothing
in this directory produces `lip-basis-fixture.json` either; `lip_basis_07.py`'s own
`repair_bytes()`/`repair_file()` never reads or writes a file by that name, so it was some other,
uncommitted inspection artifact from the original authoring session.

Because `candidate_04.py` calls `verify()` (hashing every `frozen-candidate-04.json` entry)
before it opens any `.blend`, the full model cannot even begin building here, and everything
downstream of candidate-04 — lod-plan-05, candidate-05, lod-plan-07, and candidate-07 itself —
is unreachable by the frozen recipe regardless of how faithfully the rest of the chain
(clay-01..04, materials-01..04, bake-01..03, candidate-01..03, which *do* have reproducing
scripts for every one of their own frozen inputs) is rebuilt. I did not run any of that earlier,
reproducible portion, since doing so would not get past this wall and the compute would be spent
proving something already certain from the file-existence check: `candidate_04.py`'s `verify()`
calls `Path(row['path']).read_bytes()` for every frozen input, which raises `FileNotFoundError`
on a path that does not exist — not a hash mismatch, a hard stop before the build logic runs.

## Why this stops here rather than working around it

Per the pause handoff's own discipline and this task's hard rules: never edit a threshold,
selector, or metadata to make a check pass, and stop with the evidence on an unexpected error
or unreproducible input rather than improvise past it. Fabricating either missing file (even one
that looks plausible) to satisfy `verify()`'s hash check would be exactly that. No candidate07
full/LOD pair — verified or otherwise — exists in this checkout, so the oral/eye sweep, the
playback/LOD-switch check, and packaging (steps 1-3 of `HANDOFF-CANDIDATE07-PAUSE.md`) have
nothing to run against.

## What would unblock this

Either of:
- The original `production-04-static-report.json` and `lod-plan-07/lip-basis-fixture.json` (or
  the rest of the `devonian-authoring/coccosteus/rework-v3` tree, which would make this moot),
  recovered from wherever the earlier authoring session ran.
- The candidate07 exports themselves (full SHA
  `b7b929b9978f51f89e0cb1e687dec10d95b90edd3e2b2ba27b12432f58474655`, LOD SHA
  `eec740e92fcf2187c54eacb2418fc7335cd584fe57b2792e64e8e4f1bbd31756`) placed directly into a new
  `candidate-07/` output directory, letting steps 1-3 run without re-deriving the chain at all.
- Explicit sign-off to regenerate `production-04-static-report.json` and
  `lip-basis-fixture.json` as new evidence under new names/hashes rather than the frozen ones —
  which is a scope decision for the parent/user, not one to make unilaterally here.

Nothing under `tools/devonian/creatures/coccosteus/` was modified; this file is a new addition.
The `audit_frozen.py` remapping script used above stayed in the session scratchpad and was not
committed.
