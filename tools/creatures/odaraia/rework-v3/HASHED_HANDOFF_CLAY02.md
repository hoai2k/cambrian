# Frozen clay02 handoff — paused for later resumption

2026-09-07. Astra author source complete. User requested save/checkpoint and pause.
**Do not execute now.** On the user's later resumption, parent may assign this one group to
Terra medium. Clay01 remains rejected and preserved; clay02 has no actual candidate yet.

Read `AUTHOR_REVIEW_CLAY01_AND_CLAY02_PLAN.md` for the actual six-view review and exact remaining
acceptance criteria. Read `ANATOMY_SHAPE_BRIEF.md` for unchanged primary-source anatomy.

## Frozen input hashes

Repository `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`:

| File | SHA-256 |
| --- | --- |
| `tools/creatures/odaraia/rework-v3/build_clay02.py` | `29b486d476b4de9dd661d6f0a7e8dc62f747b61d211616b6ad09f75b7d302c0b` |
| `tools/creatures/odaraia/rework-v3/execute_clay02.py` | `bc01cf399aaea992caff53612edbf3b26f2ad0872fc44964934017815929e703` |
| `tools/creatures/odaraia/rework-v3/AUTHOR_REVIEW_CLAY01_AND_CLAY02_PLAN.md` | `4d558bd689b02e273a8c3d5971b660d5bba1f24a8947bb34cb9c2db356ecf8c5` |
| `tools/creatures/odaraia/rework-v3/ANATOMY_SHAPE_BRIEF.md` | `c0d8ab5203f8e1d2b018946ee734a13c0ad0793605d845f44896b1c95b2c50f9` |
| `../expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-2026-09-07.png` | `01c3449922bf37fb7e00956dc0c05c13650a7bdc3aa1a4d4e19d703cc2ffde7c` |
| `../expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-02-2026-09-07.jpeg` | `ff300aa259f28e7c433c3b0bfcc6eb57417494e37e0747ab4275383e67a96641` |

Both Python sources passed in-memory syntax compilation. Blender has not been executed.
No rig/material/export, general audit, public asset change or Git action is part of this group.

## Exact next group AFTER resumption

Verify the executor hash with `shasum -a 256`, then run from the repository root:

```sh
python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_clay02.py
```

The executor verifies five input hashes and refuses an existing candidate/log. It runs:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/build_clay02.py
```

Budget: ONE run, up to 20 minutes. Six Cycles 32-sample 1600×1200 images. Do not change engine,
resolution, camera, anatomy, threshold or output directory. Stop on mismatch, existing output,
unexpected command error or a visual/design decision; preserve exact log and partial evidence.
No automatic retry/repair, no creation of clay03 by executor.

Expected local outputs: new
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-authoring/odaraia-rework/clay02/`
with editable `odaraia-clay02.blend`, six numbered PNGs, `geometry-report.json`,
`camera-framing-report.json`, `output-manifest.json`; sibling `clay02-execution.log`.
The six PNG names match clay01 so the candidates compare directly. View 06 is explicitly an
isolated head/first-six-limb-pairs plate. All five full views fit the entire visible animal.

Return elapsed time, exit/log, manifest hashes, geometry/framing reports and all six actual
views to Astra/root. Closed geometry and framing checks do not approve visual quality.
Only explicit hash-bound actual clay acceptance opens later production work.
