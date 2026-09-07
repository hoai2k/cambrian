# Resume here — creature authoring, 7 September 2026

Last published main and feature revision: **bd722cc**. Later local checkpoints may be ahead. Repository:
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
  Material-01 executed successfully without geometry changes; both actual renders were reviewed by
  root and author. Palette was rejected as too pale/chalky with cracked-stone tesserae. Material-02
  executed and improved the colour/crackle; root still found the finish too uniform. Material-03
  is now being authored with an original ImageGen olive/ochre tessera source (prompt/provenance
  in `imagegen-skin-01.json`, source SHA `6820a68305bfd1265510934d3df653e0e80f2768158722b54684fbab0cdf0210`).
  Material-03 executed without geometry changes; root inspected both images and accepted the
  finish for the animated local candidate (not final model approval). Packed blend SHA:
  `810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada`.
  Astra is binding that material and freezing rig/action/export/check/portrait/pose groups.
  Eye seating remains a completed-rework audit issue. Root-owned `review-playback-01.mjs` is
  syntax-checked only; execute after the completed candidate exists, with frozen model hashes.
  Read `production-checkpoint.md` for earlier safe draft details. Material-01 packed blend SHA:
  `af0b5ab285fb1d7770c9689aa7671c210adee79209f76b7e3694ac5216310210`.
  Source: `tools/devonian/creatures/gemuendina/rework-v3/`.
  Outputs: `../devonian-authoring/gemuendina/rework-v3/clay-01/`.
  Blend SHA: `05b413fecf7e2fe8b68f06543d4b4beb091220ed52ed925d88cce5339c734883`.
  Frozen first manifest: `37b2372eccf4df0425c6662424d038eaa6137371e211fa75555cef5a6585786c`.
- `/root/titanichthys_rework_clay03` — Astra high; resumed creative ownership from the earlier author.
  Clay-02 executed, but root rejected all four views as a production form. Armour became stepped
  masonry blocks with crumpled orbital folds, a wedge-like lip and a massive triangular moving
  jaw wall. Read `root-review-clay02.md`. Clay-03 must correct organic surface/mandible architecture
  before textures or rigging; preserve the smoother posterior and corrected fin tips.
  Clay-03 subsequently executed and all four images were inspected by root. Continuous mass
  improved, but drooping helmet-like preoral roof, triangular pouch-like floor, detached-looking
  jaw rail and ribbon/slab pectorals remain concerns. Astra author is independently reviewing
  confirmed the diagnosis and is authoring clay04 under an approved anterior patch/neck/
  inset-mouth ownership plan with coherent jaw/floor and locally sectioned twisted fins.
  Read `visual-review-clay03.md`. No permission to advance to materials yet.
  Clay-03 blend SHA: `cef5249afb1dd79e98b86fd3a0d12809c6646717a3639350754ad3076298d00c`.
  Manifest: `1a7f781d4a6abc4bc624c351f0822db77bbf29779a47e3f5a8e246220f6b81a6`.
  Clay-02 blend SHA: `78a0caee9d8fef38f457b9f376671cefc30080232cf5cc61a3b4867b088f1098`.
  Handoff: `HANDOFF-clay02.md`; builder SHA
  `a4142814eb10db533eef2063fb4bfdca147860020a988ab6dedbe3edf1de7955`, renderer SHA
  `4103d297e3e1aab58924e79f194b716b5026863ca025a38941bfd0d9cffd2a8f`.
  Four fixed views are under `clay-02/renders/`; execution passed but visual review failed.
  Clay-01 was built/eight views rendered by `/root/titanichthys_clay_execution` (Terra medium).
  Root and author rejected completed form: annular scoop mouth/undifferentiated forehead,
  oversized moving ventral wall, scalloped plate incisions, periodic posterior washboard,
  hooked fin tips. New sculpt separates true slender edentulous mandible/upper head and
  nearly closed rest mouth, armour planes, smoother body and better fin construction.
  Source: `tools/devonian/creatures/titanichthys/rework-v3/`.
  Outputs: `../devonian-authoring/titanichthys/rework-v3/clay-01/` (images in `renders/`).
  Blend SHA: `0ac6cdef7578f0fe7270673a5348a620d1d88a33a1b055a96eb29407fd1ac4bf`.
- `/root/devonian_execution_handoff` — Terra medium; idle after completing Gemuendina material01/02/03,
  Coccosteus clay01/02 plus their comparison images and Titanichthys clay03 plus four views.
  Use Terra executors for the next frozen scripts.
  Wait for HASH-BOUND handoff from each Astra author, execute with --python-exit-code 1,
  return actual images to the author/root for review. No public replacement yet.
- `/root/coccosteus_rework_design` — Astra high; first clay source frozen, awaiting actual
  comparison images from Terra are complete. Root reviewed all ten and rejected the first
  production form: boxy helmet/thorax, prism-like soft tail, oral midline hole and squared
  hinge panels, fin-tip hooks. Read `root-review-clay01.md`. Backup is unchanged. The author
  authored clay02, which then built/rendered successfully. Root reviewed its five views: body/
  fins improved, but mouth has large intersecting panels. Astra verified the lower oral profile
  clamps to the jaw's zero-width end, collapsing 1,890 quads onto X=0; duplicate tunnel is also
  present. Its head cap is planar (correcting root's initial hypothesis). Clay03 is now being
  authored with one connected exterior/inner oral boundary and positive-width pharynx. Read
  `review-clay02-plan-clay03.md` and `root-review-clay02.md`; no material approval yet.
  `rework-v3/HANDOFF.md` binds the completed three groups and ten images.
  Builder SHA: `7e91fe87c5ae33c67aa4aa747cc74d59e65d31919ccf037e2f8c080011911e3d`.
  Its preproduction brief is `rework-v3/design.md`.
  TUG 1817-152 identity verified in institutional catalogue, detailed record unavailable.
  Avoid repeating the lookup. Doryaspis/Bothriolepis/Stethacanthus/Odaraia authors not started.
  Odaraia preproduction brief is `tools/creatures/odaraia/rework-v3/DESIGN.md`; ROM morphology
  and the 2024 paper abstract were consulted, full primary figures remain unread.

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

Main bd722cc typecheck/build/eras passed after preserving concurrent Cambrian classification changes.
Prior main03e926d world regressions and all644 Devonian checks passed; no runtime changes by
our newer sculpt-source checkpoints. Logs `../devonian-authoring/review/sculpt-checkpoint-*.log`.
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
