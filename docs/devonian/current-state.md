# Resume here — creature reworks, 7 September 2026

Repository `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, branch
`devonian-assets`. Separate main worktree `../devonian-publish`. Last verified remote publication
**bd722cc**; newer local commits preserve candidates and merge remote **fb2e9bd**. Publish these
checkpoints after verification; never force push. Fetch/push `git@github.com:hoai2k/cambrian.git`.
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

- `/root/gemuendina_rework_design` (Astra high), idle after freezing **candidate-01**.
  Read `tools/devonian/creatures/gemuendina/rework-v3/HANDOFF-CANDIDATE-01.md` and individual
  WORKING_STATE/production-checkpoint. Accepted clay02 and material03 are bound. Candidate
  manifest SHA **68206254ff31837a44e681ade4d687cb7ce397be7801f1ef6b85124d736cdcf0**.
  Terra is executing build → structural check → four portraits/four posed renders. 18 full
  actions, 3 LOD actions, matching 28-bone skeleton/binds, 3 nested anchors. Root must review
  actual deformation before running `review-playback-01.mjs` (root-owned, syntax checked only).
  That harness intercepts local candidate files, checks actual Three.js runtime, records all
  actions and renders authored/default game palettes. Freeze actual GLB hashes before dispatch.
  Eye globes still look exposed/bead-like: fresh completed-rework eye/housing audit and correction
  remain necessary before final acceptance. Do not mark final or publish this candidate yet.
  Material03 blend SHA **810031c3e18a2f9bc5ea820007a460aebdd7e8fdf7c96879ef398a16ab080ada**.
  Root and author inspected both images and accepted it for the animated candidate, not final art.
  Original ImageGen skin swatch/prompt: `imagegen-skin-01.json`; local material-sources/ directory.
- `/root/titanichthys_rework_clay03` (Astra high), idle after freezing **clay04**.
  Read `tools/devonian/creatures/titanichthys/rework-v3/HANDOFF-clay04.md`, PATCH_MAP, AUTHOR_CHECKS
  and WORKING_STATE. Terra will execute after Gemuendina. Builder SHA
  **7c5df220934b94b27ed4865feb912722c259c2a18ff0b8e7cee4a3641d78f73e**.
  Clay01–03 executed but failed visual gates. Clay02 made masonry armour; clay03 restored mass
  but retained drooping helmet, pouch-like floor, detached jaw rail and ribbon/slab pectorals.
  Clay04 replaces anterior rings with shared anatomical patches, inset mouth, coherent jaw/floor,
  real orbital openings and fins with local sections/twist. Review actual four views before any
  material/rig approval. Do not copy teeth from the Dunk-like user art: Titan jaws are edentulous.
- `/root/coccosteus_rework_design` (Astra high), actively authoring **clay03**.
  Read `tools/devonian/creatures/coccosteus/rework-v3/review-clay02-plan-clay03.md` and WORKING_STATE.
  Clay01 was boxy; clay02 improved body/fins but mouth had intersecting black panels. Verified cause:
  lower oral samples clamped to the zero-width jaw endpoint, collapsing 1,890 quads onto X=0;
  duplicate torso passage also overlapped. Head cap is concave but planar (root's initial
  nonplanar hypothesis was corrected). New single exterior/lining boundary, shared collar and
  positive-width pharynx are being authored. No materials or final audits yet. Preserve old backup.
- `/root/devonian_execution_handoff` (Terra medium) executes Gemuendina candidate01 then Titan clay04.
  Prior Gemu material01/02/03, Cocc clay01/02 and Titan clay03 all executed successfully; actual
  visual approval is separate. Separate local execution-state files preserve hashes/markers.
- Doryaspis/Bothriolepis/Stethacanthus/Odaraia authors not started. References and requirements are
  in refinement-queue.md and ../cambrian/refinement-queue.md. The Doryaspis mouth-art/anatomy
  discrepancy was explained to the user earlier; read the saved primary-source notes.

## Backups / latest Odaraia request

Odaraia queue and game/viewer preview are already main **03e926d**, actual UI verified.
Complete named backup `../expansion-authoring/backups/odaraia-pre-rework-2026-09-07/`: 23 files,
44,616,856 bytes, backup-manifest.json; reference copied separately and all 24 pairs verified.
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
Latest merged runtime (remote fb2e9bd) typecheck/build/eras/world/swim and **644 Devonian** checks
PASS: `../devonian-authoring/review/rework-sync-*.log`. New sculpt checkpoints do not replace assets.
Once a rework passes all phases: package full/LOD, regenerate portraits/sizes, preserve required
clips/anchors, check actual default palette and viewer, run intake/checks, commit/merge/push main.
Refresh Titan/Cocc-dependent lighting/scale art later. Keep preview until the rework is complete.

Parent owns this compact resume file and mirrors it to `../devonian-authoring/CURRENT_STATE.md`.
Each author owns individual WORKING_STATE. Older detailed logs in authoring-checkpoint-2026-09-07.md
are historical; do not resurrect their obsolete assignments. Untracked __pycache__ must not be staged.
