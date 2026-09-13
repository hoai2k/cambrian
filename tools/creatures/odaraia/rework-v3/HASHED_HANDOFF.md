# Frozen clay01 handoff — Terra medium executor

Owner: Astra high. Date: 2026-09-07. Status: candidate-ready SOURCE, not a visually approved model.
Read `ANATOMY_SHAPE_BRIEF.md` for anatomy and the six-view acceptance criteria.
This is ONE bounded Blender build/render command group. It creates only the new local clay01
candidate and local execution log. No shared builder, public assets, rig, GLB, production
material, portraits, Git commands or general eye audit are authorized by this handoff.

## Frozen inputs

All repository paths below are relative to
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.

| Input | SHA-256 |
| --- | --- |
| `tools/creatures/odaraia/rework-v3/build_clay01.py` | `0572cc205c7ce3c6854bb6c305a21dd31f9604af21f387854dd871e20045ffa0` |
| `tools/creatures/odaraia/rework-v3/ANATOMY_SHAPE_BRIEF.md` | `c0d8ab5203f8e1d2b018946ee734a13c0ad0793605d845f44896b1c95b2c50f9` |
| `tools/creatures/odaraia/rework-v3/execute_clay01.py` | `b6e1f128150fa2213725f24a15e84e57dc1b36d1fe0e30b515c10ca853173483` |
| `../expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-2026-09-07.png` | `01c3449922bf37fb7e00956dc0c05c13650a7bdc3aa1a4d4e19d703cc2ffde7c` |
| `../expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-02-2026-09-07.jpeg` | `ff300aa259f28e7c433c3b0bfcc6eb57417494e37e0747ab4275383e67a96641` |

Author ran Python `compile()` syntax checks for both scripts: PASS. Blender has NOT been run;
actual geometry report, rendering compatibility and visual outcomes remain untested. The first
`py_compile` attempt hit macOS cache-path sandbox permissions; in-memory `compile()` succeeded.
No Python source edit was needed for that environment-only check.

## Exact execution

1. Verify the executor itself against the recorded hash, using `shasum -a 256`.
2. If it matches, run this command from the repository root:

```sh
python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_clay01.py
```

The executor verifies all four authored inputs, refuses existing candidate/log paths, and runs:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/build_clay01.py
```

CYCLES, 32 samples, denoise, 1600×1200, six stills. Use tool polling for progress; do not alter
engine/samples/resolution if slow. Budget: one run, up to 20 minutes. On hash mismatch,
existing output path, unexpected failure or material visual judgment, stop and return exact
evidence to Astra. Do not retry, repair topology, adjust a camera, change a threshold or choose
a new directory. Parent owns reassignment. Preserve partial outputs.

## Expected new local outputs

Directory:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework/clay01/`

- `odaraia-clay01.blend`: editable static clay. Blender may additionally save `.blend1`.
- `01-inverted-oblique.png`, `02-inverted-side.png`, `03-inverted-front.png`
- `04-dorsal-underside.png`, `05-half-shell-cutaway.png`, `06-appendage-head-closeup.png`
- `geometry-report.json`: bounded finite/positive-scale/closed-surface/face-area report.
- `output-manifest.json`: bytes and SHA-256 for evidence files.
- Sibling `clay01-execution.log`: exact Blender output.

Expected terminal marker:
`ODARAIA_CLAY01_SOURCE_HYGIENE_PASS; SIX_VIEWS_RENDERED; ASTRA_VISUAL_REVIEW_REQUIRED`

Return exact command, exit code, elapsed time, log location, manifest and hygiene status.
Do not call the animal approved or realistic based on closed-edge counts. Parent/Astra must
inspect ALL SIX actual renders, including body/valve/limb/eye/tail relationships, before any
production phase. The source is not permission to overwrite the fallback model.
