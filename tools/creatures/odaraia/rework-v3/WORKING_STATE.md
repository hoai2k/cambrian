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


## 2026-09-07 — clay01 reviewed; clay02 source saved; user pause
- Owner: Astra creative author. Status: source-ready, PAUSED at user request, no clay02 execution.
- Independently reviewed all six clay01 renders and user reference 2. Rejected clay01 camera/framing and uniform comb-wall limb presentation; preserved all old outputs.
- Bound clay01 review: manifest `97288757eb541cb67aade38ed6be1e55b52700e662bedf826d69118edb2cc1d7`, blend `5dfb9ac4c4544dd22f08db8b70d84c96513d24022057193037040497b5f30122`.
- New source: explicit projected world+Y camera-up, Blender-native frame fit/margins, narrower backswept ovate paddles, raised/phased bent endopods, continuous eye cups. 32 pairs/20 intervals and original geometry coordinates retained. Shell geometry retained for fair correctly-oriented review.
- Inputs:
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/build_clay02.py`: `29b486d476b4de9dd661d6f0a7e8dc62f747b61d211616b6ad09f75b7d302c0b`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_clay02.py`: `bc01cf399aaea992caff53612edbf3b26f2ad0872fc44964934017815929e703`
  - `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/AUTHOR_REVIEW_CLAY01_AND_CLAY02_PLAN.md`: `4d558bd689b02e273a8c3d5971b660d5bba1f24a8947bb34cb9c2db356ecf8c5`
- Validation: both new scripts syntax PASS only; no Blender/run/render/export, public changes or Git actions.
- Exact remaining criteria: in AUTHOR_REVIEW_CLAY01_AND_CLAY02_PLAN.md; all six actual views required after resumed execution. Camera bounds do not prove shape/attachment/limb quality.
- Stop condition: USER PAUSE. Do not execute until resumed. Parent may checkpoint sources.
- Resume after user request: assign Terra to HASHED_HANDOFF_CLAY02.md; hash-check executor then `python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_clay02.py` from repo root. One run, 20-minute bound, return evidence to author.
- No production gate passed. Transparency/game sorting, 18 actions with Moult, full/LOD rig, anchors, portraits and post-rework audits all remain later.


## 2026-09-08 — resumed; clay02 coarse gate accepted; material01 source frozen
- Owner/model: Astra high creative author; Terra medium execution pending parent assignment.
- Independently inspected ALL six actual clay02 images. Accept coarse shape/framing only, bound to blend `d5ec458053d58f45e5a0def15721485365449d1abee24ad75844fa9d38d9182c` and manifest `0222be3b7981649de1aa22028cbc7a00e4d54782f619957449bfcb452cec54a1`.
- Status: material01 SOURCE candidate-ready, no material candidate built or reviewed yet. Previous user pause was explicitly resumed on 8 September.
- Source: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/material_study01.py`: `c91290a75a03e619598a1de62240deaad34330892576dcf7bf79d12655f7c13e`.
- Wrapper: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_material01.py`: `fa4f9c9837d39289b05273db49846747e18e0940ae47599984cd61d4bcaf2f99`.
- Decision: load accepted clay02 unchanged; olive/amber semitransparent rigid shell with more opaque true margins, copper/ochre appendages, teal eyes. Six whole-animal dark/light environment views; hash geometry before/after.
- Validation: both Python syntax PASS; author performed no Blender/render, rig/export, public edits or Git actions.
- Scope limits: Cycles coverage study, not glTF material export or Three.js depth sorting. Full material gate in AUTHOR_REVIEW_CLAY02_MATERIAL01.md.
- User Attack/Eat request carried forward in ATTACK_EAT_RIG_DIRECTION.md: sequential joint flexion, front-pair reach/secure/carry-to-mouth/recover; original exact 18 clip names retained including Moult. Existing runtime only progress-scrubs Opabinia Eat; parent must integrate Odaraia when accepted rig/anchors exist.
- Resume: parent assign Terra HASHED_HANDOFF_MATERIAL01.md. After wrapper hash check, exact command from repo root: `python3 /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/creatures/odaraia/rework-v3/execute_material01.py`.
- Budget: one run up to 25 minutes. Stop on input change/existing output/error/design decision; no automatic repair. Return all six actual images and manifests for author review.
- Original backup, both user references and clay01/02 remain unchanged. Production material export, articulated rig/actions, full/LOD parity, anchors, portraits and completed eye/general audits remain later work.
