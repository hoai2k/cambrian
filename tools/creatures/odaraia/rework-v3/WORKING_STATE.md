# Odaraia V3 working state

## 2026-09-07 — preproduction
- Owner: Astra author; parent owns execution delegation and shared docs.
- Status: authoring. Original assets and named backup remain untouched.
- Scope: new custom clay geometry and six actual review views, no rig/material production/export.
- Required: inspect both references, review 2024 primary figures, freeze source and exact hashes for Terra.
- Chosen normal orientation: game forward +Z, world up +Y, inverted animal with ventral legs upward; coordinates authored directly, positive scale.
- Resume: primary figure review and reference inspection, then custom geometry source.

## 2026-09-07 — anatomy review completed
- Inspected both originals and primary Figures 1,2,3,4,6; fetched primary HTML successfully after browser endpoint failed.
- Updated count: 32 trunk/limb pairs, within primary 2024 30–35 range; older ROM 47 not frozen.
- Endopods: 20 surface intervals, ovate exopods, spinose endites; no antennae/claws.
- Uncertain maxilla insertion and paragnath relationship remain labelled tentative.
- Current source brief: ANATOMY_SHAPE_BRIEF.md. Resume: finish custom six-view clay builder then hash-bound freeze.

## 2026-09-07 — clay01 source frozen, execution pending
- Owner/model: Astra high creative author; Terra medium execution pending parent assignment.
- Status: candidate-ready SOURCE, actual candidate not built or reviewed.
- Decision: custom thick variable-section U-shell, single tapered segmented trunk, 32 paired biramous limbs with 20 endopod intervals, supported eyes, tentative compact mouthpart arrangement, three tail blades. Normal legs-up game coordinates baked into vertices.
- Inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/build_clay01.py`: `0572cc205c7ce3c6854bb6c305a21dd31f9604af21f387854dd871e20045ffa0`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/ANATOMY_SHAPE_BRIEF.md`: `c0d8ab5203f8e1d2b018946ee734a13c0ad0793605d845f44896b1c95b2c50f9`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_clay01.py`: `b6e1f128150fa2213725f24a15e84e57dc1b36d1fe0e30b515c10ca853173483`
- Execution CWD: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
- Next exact command after wrapper hash check: `python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_clay01.py`
- Validation so far: in-memory Python syntax PASS for both scripts. Initial py_compile cache-write permission failed; compile() needed no disk writes. No Blender/run/render/export executed by author.
- Expected outputs: new local clay01 blend, six PNG views, geometry hygiene JSON and hash manifest; sibling execution log.
- Resource: one frozen run, up to 20 minutes; no automatic repair or repeated audit loops.
- Stop condition: any changed hash, existing output/log, unexpected error, visual/design choice; preserve evidence and return to author.
- Resume: parent assigns Terra to HASHED_HANDOFF.md. Author must inspect all six real render outputs before production. Uncertain maxilla insertion, paragnath association and soft tissue/head surface are documented interpretation. Transparency/game sorting, rig/actions/LOD/anchors/portraits and full audits remain later work.
