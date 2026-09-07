# Resume here — creature authoring, 7 September 2026

Main **03e926d** and feature `devonian-assets` are pushed. Repository:
`/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`.
Separate main checkout: `../devonian-publish`. Fetch/push via
`git@github.com:hoai2k/cambrian.git`; remote main changes concurrently, never force push.
Do not stage another active author's files without a frozen handoff.

## Completed initial delivery

All **21 Devonian creatures** have models, LODs, animations, anchors and portraits on main.
All initial non-creature assets reached main in **f7b5618** and the user received the requested
separate notification: 47 props/plants, 11 runtime proxies, 9 biome paintings, 29 scenery boards,
9 regional boards, 3 lighting concepts, 10 material source sets, 2 atmosphere atlases and 2 scale
plates. See `supporting-assets.md` for initial-quality limitations. Three Devonian creatures are
final, 18 preview. Odaraia is an additional Cambrian preview. Every pending rework stays preview.

## Current priority

Complete seven individual full reworks before general refinements/audits:
Titanichthys, Gemuendina, Doryaspis, Coccosteus, Bothriolepis, Stethacanthus and Cambrian Odaraia.
User references and design requirements are in `refinement-queue.md` and
`../cambrian/refinement-queue.md`. Eye/general audits run AFTER each completed new rework,
not on the old model awaiting replacement. Other 12 Devonian individual refinements follow.
Dunkleosteus already has modeled oral interior and animated independent jaws.

## Active creative / execution phases

User-authorized split: **gpt-6-astra, high** for anatomy, custom Blender sculpt code, rigging,
animation/material design and actual visual judgment; **gpt-5.6-terra, medium** for frozen-script
Blender runs, renders, exports, packaging and tests. See `agent-workflow.md`. Spawn with compact
context and explicit settings; existing agents retain their assigned model on follow-up. Do not
send creative fixes to Terra. Preserve script hashes and candidates between revisions.

- `/root/gemuendina_rework_design` — Astra high; materials, rig and dynamic-action source phase in progress.
  Clay-02 passed Terra build and four-view rendering; root reviewed all four and accepted the
  coarse form as a foundation for the production phase, not final approval. Blend SHA:
  `c4e65d1b0a37c9c034aaa6800bba8ad0b396d0547a4bf08faa276c62848c805f`.
  Frozen clay02 manifest: `7a321bd262c1fc98f974e7054996ed077c096fa2c9b8fc677b072915e5ac835a`.
  Clay-01 was built and eight views rendered by `/root/devonian_execution_handoff` (Terra medium).
  Root and author rejected it as a completed sculpt: uniform dome, punched oval mouth, flat
  pectoral field, bead-like eyes, scratch-like gill marks, pinched pelvic/tail transition.
  Secondary sculpt corrected those forms; production materials/rigging now proceeds. Preserve clay01/02.
  Source: `tools/devonian/creatures/gemuendina/rework-v3/`.
  Outputs: `../devonian-authoring/gemuendina/rework-v3/clay-01/`.
  Blend SHA: `05b413fecf7e2fe8b68f06543d4b4beb091220ed52ed925d88cce5339c734883`.
  Frozen first manifest: `37b2372eccf4df0425c6662424d038eaa6137371e211fa75555cef5a6585786c`.
- `/root/titanichthys_rework_design` — Astra high; clay-02 creative revision in progress.
  Clay-01 was built/eight views rendered by `/root/titanichthys_clay_execution` (Terra medium).
  Root and author rejected completed form: annular scoop mouth/undifferentiated forehead,
  oversized moving ventral wall, scalloped plate incisions, periodic posterior washboard,
  hooked fin tips. New sculpt separates true slender edentulous mandible/upper head and
  nearly closed rest mouth, armour planes, smoother body and better fin construction.
  Source: `tools/devonian/creatures/titanichthys/rework-v3/`.
  Outputs: `../devonian-authoring/titanichthys/rework-v3/clay-01/` (images in `renders/`).
  Blend SHA: `0ac6cdef7578f0fe7270673a5348a620d1d88a33a1b055a96eb29407fd1ac4bf`.
- Both Terra executors are idle after successful handoffs. Use them for the next frozen scripts.
  Wait for HASH-BOUND handoff from each Astra author, execute with --python-exit-code 1,
  return actual images to the author/root for review. No public replacement yet.
- Coccosteus has a saved preproduction brief in its `rework-v3/design.md`; no builder yet.
  TUG 1817-152 identity verified in institutional catalogue, detailed record unavailable.
  Avoid repeating the lookup. Doryaspis/Bothriolepis/Stethacanthus/Odaraia authors not started.

## Backups and references

Original Blender projects/intermediates remain in `../devonian-authoring/<id>/` and
`../expansion-authoring/`. User images are retained locally, not redistributed as game textures.
Named Coccosteus complete backup:
`../devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/`.
Named Odaraia complete backup:
`../expansion-authoring/backups/odaraia-pre-rework-2026-09-07/`, 23 files / 44,616,856 bytes,
`backup-manifest.json`; reference copied separately and all 24 copy/source pairs verified.
Odaraia reference: `../expansion-authoring/odaraia-rework/user-reference/`.
No original Cambrian creature model/portrait bytes have changed.

## Validation and environment

Latest main03e926d typecheck/build/eras/world regressions and all644 Devonian checks passed.
Logs: `../devonian-authoring/review/odaraia-main-*.log`.
Odaraia preview UI was checked in the actual viewer. Concurrent main changes include the
viewer clearing its prior subject during load, UI sizing and simulation/world adjustments.

Blender: `/Applications/Blender.app/Contents/MacOS/Blender`, background two threads, elevated
startup needed on this Mac. Python with imaging/numpy:
`/Users/hoai/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
Fixed headless engineering render harness uses fresh Vite4181 (session62072) through
`DEVONIAN_QA_ORIGIN`; do not stop unowned servers. Built viewer4176 is CUA browser2/tab7.

Earlier detailed evidence is in `authoring-checkpoint-2026-09-07.md`; its older historical
sections are NOT current assignments or completion status. Parent owns central state; each
agent owns its per-creature WORKING_STATE/EXECUTION_STATE. Update this short resume file after
new phases and copy it to `../devonian-authoring/CURRENT_STATE.md`.
