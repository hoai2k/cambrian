# Resume here — creature reworks, 7 September 2026

Repository `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, branch
`devonian-assets`. Separate main worktree `../devonian-publish`. Last verified remote publication
**bb8e241** (main and devonian-assets pushed), including concurrent remote **f069010**. Preserve
checkpoints and verify before publication; never force push. Fetch/push `git@github.com:hoai2k/cambrian.git`.
Other agents change main concurrently. Do not stage active authors' mutable files.

## Delivery and remaining scope

All **21 initial Devonian creatures** and the complete initial non-creature library are on main.
Non-creature milestone was **f7b5618**; user received the requested separate notification.
47 props/plants, 11 runtime proxies, 9 biome paintings, 29 scenery boards, 9 regional boards,
3 lighting concepts, 10 material sets, 2 atmosphere atlases, 2 scale plates. See supporting-assets.md.
Three Devonian models are final, 18 preview. All pending reworks remain preview in game/viewer.
Dunkleosteus already has modeled oral interior and independently animated jaws.

Finish seven full reworks before the 12 other individual refinements: **Gemuendina, Titanichthys,
Coccosteus, Doryaspis, Bothriolepis, Stethacanthus, Cambrian Odaraia**. None of these seven reworks
is finalized yet. Eye/general audits follow each completed rework, not the old models awaiting
replacement. Preserve originals; do not approve a new version just because it is more complex.

## Active phases — authoritative scheduling

User-authorized model split: **Astra high** for anatomy, custom Blender sculpture, materials,
rig/action design and actual visual judgment; **Terra medium** for frozen Blender execution,
exports/renders/checks. Compact explicit model/effort spawns, no broad history fork. See
agent-workflow.md. Four active slots total, including root. Use frozen hash-bound groups;
executors stop unexpected failures and preserve output. They do not make creative fixes.

- `/root/gemuendina_rework_design` (Astra high) has completed **candidate02** correction design.
  Candidate01 completed full/LOD build, structural checks, 18-action Three.js playback/anchors;
  actual bind audit found ~83% of both eyes inside. Full eye orientation still looked bead-like
  and LOD fine vertex pigment aliased, so candidate02 reorients orbit/cornea and filters LOD colour.
  `HANDOFF-CANDIDATE-02.md` and frozen manifest
  **46694693186ee4a95226d6cd9736951f9a7ef2165e2f8c4cf72d68d57bffaceb** bind all inputs.
  Terra completed candidate02 build/check/13 renders; full SHA
  **6d62b356043f443e1842e5bc105e3e551c1d5a7930652bf61553c6a09731c4aa**, LOD
  **280fc74db17ccc6776ba422fba3e6c9f0695558e0d13952fce9bb79fd39d00f3**.
  Root and author actual visual gate accepted progression to fresh candidate02 action/eye audit
  and actual runtime playback. Not final approval. Review glossy eye highlights in game and soft
  LOD pigment at its actual transition distance. Dispatch handoff phase4 to Terra when slot free.
  Root owns review-playback-01.mjs (executed for candidate01); create separate version02 evidence.
  Material03 uses original built-in ImageGen skin swatch, prompt/provenance imagegen-skin-01.json.
- `/root/titanichthys_rework_clay03` (Astra high), reviewing **clay04 oral views** then materials.
  Clay04 body/fins are improved over rejected01–03; same frozen blend SHA
  **69ad4e7d1daa7aec64835a198c9b13c4a017cf4aa441cd2e58ae9a4207c404ec**.
  Read HANDOFF-clay04 and HANDOFF-oral-clay04. Terra completed two actual frontal rest/open oral
  views in clay-04/oral-inspection-01; root inspected both, coherent inset lip/floor, no detached
  rail/panels. Author independently reviewing before advancing anatomy-aware armor/PBR source.
  Keep thin edentulous jaws; user reference is Dunk-like and must not add Dunk teeth to Titan.
- `/root/coccosteus_rework_design` (Astra high), actively authoring **clay04 exterior refinement**.
  Clay03 fixed verified 1,890 collapsed oral quads/duplicate passage with one closed exterior and
  lining. Actual five views confirm coherent mouth; source checks cover 279 lumen,288 containment,
  120 floor/roof sections. Preserve this oral topology. But head became pointed shallow wedge,
  eyes crowded upward/inward; restore rounded substantial armored anterior, local cheeks/orbits
  and cranial/thorax differentiation per user reference. Preserve improved posterior/fins.
  Clay03 blend SHA **e88eacaeb7c64077430c0e5a322b5e1a21cabb234631a9ff8d32d998de57fc36**.
  No materials/final eye audits yet. Old named backup remains intact.
- `/root/devonian_execution_handoff` (Terra medium), idle after successful Gemu candidate02.
  Next: candidate02 phase4 actual exported full/LOD eye/action/contact audit once a slot is free;
  root/author visual gate is approved. Then root frozen runtime playback02 or next clay handoff.
  Preserve frozen groups and output directories; stop unexpected errors, no creative fixes.
- Doryaspis/Bothriolepis/Stethacanthus/Odaraia authors not started. References and requirements are
  in refinement-queue.md and ../cambrian/refinement-queue.md. The Doryaspis mouth-art/anatomy
  discrepancy was explained to the user earlier; read the saved primary-source notes.

## Backups / latest Odaraia request

Odaraia queue and game/viewer preview are already main **03e926d**, actual UI verified.
Complete named backup `../expansion-authoring/backups/odaraia-pre-rework-2026-09-07/`: 23 files,
44,616,856 bytes, backup-manifest.json; reference copied separately and all 24 pairs verified.
Second reference Odaraia2.jpeg is also preserved under user-reference as
odaraia-user-reference-02-2026-09-07.jpeg, SHA
ff300aa259f28e7c433c3b0bfcc6eb57417494e37e0747ab4275383e67a96641. User chose inverted
legs-up normal presentation, shell-like shaped valves and prominent animated attack limbs.
Queue/design updated; anatomical feeding evidence is distinct from gameplay attacks.
Original Cambrian GLB/portrait bytes remain unchanged. New brief:
`tools/creatures/odaraia/rework-v3/DESIGN.md`. Coat-like shaped wrapping valves, semitransparency,
visible many-limbed segmented trunk, prominent supported eyes and three tail blades. ROM account
and 2024 primary abstract consulted; primary full figures still need review. Source reference:
`../expansion-authoring/odaraia-rework/user-reference/`. Preserve the old model as fallback.
Coccosteus named backup `../devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/` verified
unchanged after paired comparison renders. All other originals/intermediates stay under local.

## Environment / checks / publication

Blender `/Applications/Blender.app/Contents/MacOS/Blender`, 5.2, CPU two threads. Elevated startup
needed on this Mac. Use --python-exit-code 1. Python with Pillow/numpy:
`/Users/hoai/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
Fresh Vite4181 (session62072) via QA_BASE_URL/DEVONIAN_QA_ORIGIN as appropriate; don't stop unowned
5173/4177 servers. Built viewer4176 CUA browser2/tab7. Existing harnesses are in tools/devonian.
Latest merged runtime (remote f069010, merge bb8e241) typecheck/build/world/expansion and
**644 Devonian** checks PASS: `../devonian-authoring/review/rework-publication-*.log`; expansion
correct log is rework-publication-expansion-direct.log. No npm expansion script; run bundled
tools/expansion-test.ts directly. Prior eras/swim passed on fb2e9bd. No new public models replaced.
Once a rework passes all phases: package full/LOD, regenerate portraits/sizes, preserve required
clips/anchors, check actual default palette and viewer, run intake/checks, commit/merge/push main.
Refresh Titan/Cocc-dependent lighting/scale art later. Keep preview until the rework is complete.

Parent owns this compact resume file and mirrors it to `../devonian-authoring/CURRENT_STATE.md`.
Each author owns individual WORKING_STATE. Older detailed logs in authoring-checkpoint-2026-09-07.md
are historical; do not resurrect their obsolete assignments. Untracked __pycache__ must not be staged.
