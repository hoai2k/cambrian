# Restart — 8 September 2026, face V4 candidate01 frozen

## Current completion checkpoint — focused face accepted, broad preview remains

Pigment04 fix and eight actual corrected LOD renders completed. Owning artist inspected all eight individually, verified their hashes and all12inherited full image hashes, and independently reconfirmed exact original/corrected BIN and non-colour JSON equality. The focused head/brow/cheek/gnathal pass is **accepted for preview integration**. Posterior upper plate now has a shorter curved margin, rounded shoulders and tapered ends. Full model and four portraits remain accepted. See `focused-face-verdict.md` and `pigment04-focused-verdict.json`.

Explicit remaining limitation: LOD material parity is incomplete. Real varied pigment is present, but the LOD is substantially paler/smoother than full. Numeric vertex colours closely match encoded PNG values; local GLTFLoader's sRGB texture versus linear vertex-colour treatment suggests a colour-space bake mismatch, beyond expected loss of fine detail. Keep LOD colour-space/roughness/normal polish pending. **Broad creature status stays preview; focused completion is not whole-creature user approval.**

Corrected family is `candidate03/exports-pigment04`. Full SHA256 `0ace6026c6b46d9d560528677ffdaf31769d74bea51065b884214c8b1037950d`; LOD SHA256 `2d57904f0a8a2c858f597730e38927b1f38126a51a9f87011b2f3f78d7c52bca`; new8view evidence SHA256 `99c32c5abcca0c77261c636467eb1cb0524c66402366959573b4f8f7becd11f9`. Geometry audit transfer is explicitly labeled and hash-proven;173poses per full/LOD have zero recorded opposing contacts, and eye conservative bounds exceed86%. Both retain18clips and anchors.

Next actions belong to root: its independent acceptance, corrected-family local finalizer, intake/packaging/public integration/Git, while retaining broad preview and noting material polish. Root may qualify any metadata “final” as focused face completion. This artist has not run the finalizer or touched public/Git. The remaining sections are historical pipeline/restart records.

## Active checkpoint — all20candidate03 images inspected; pigment04 ready

Candidate03 completed full/LOD export and actual173pose audits:18clips each, both eyes pass and zero opposing-shell/gnathal failures. Owning artist inspected all16pose images and four portraits. The full model, repaired tapered posterior upper gnathal plate, oral continuity and all four portraits are acceptable. **Delivery is blocked by white LOD materials.** Actual raw GLB COLOR_0 is white everywhere while COLOR_1 contains the correct baked pigment. See `candidate03-art-verdict.md` and `candidate03-reviewed-evidence.json`. Do not finalize the original03export family.

Root explicitly authorized a minimal colour-binding derivative in new `candidate03/exports-pigment04`, preserving original03. Frozen manifest `frozen-workflow-pigment04.json` binds the three scripts plus original full/LOD, export/render evidence and audit summary. Script hashes:

- fix_lod_pigment_04.py: `8d313420c2a8089af6b22da90a7618cf6ce4982ceebff770c7a10c7a0cafb43b`
- render_lod_pigment_04.py: `3b761c7e152733599603c2c6aa6e46c4d5c79daa317238197c84d2368d2166a1`
- finalize_local_pigment_04.py: `a6e1c88e19e2e06babce76c4018c89a7b7fdc2b9d4c192b2432b9713f5ddc97c`

All three AST-parse and are not yet executed. Root/Terra runs:

```sh
python3 tools/devonian/creatures/dunkleosteus/face-v4/fix_lod_pigment_04.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/render_lod_pigment_04.py > ../devonian-authoring/dunkleosteus/face-v4-pigment04-render.log 2>&1
```

The first script refuses existing output. It promotes only COLOR_1→COLOR_0 in LOD primitive attribute bindings, verifies all non-colour JSON and the entire BIN chunk are identical, and writes pigment-repair-proof.json. It copies the unchanged full GLB, eight full reviews and four portraits with exact hash checks. Full/LOD geometric audit outcomes are transferred only via that equality proof; carriedForwardFrom records original report/hash and explicitly says no new audit execution occurred. The evidence bridge avoids redundant geometry tests for a material-only binding change. Corrected export-evidence.json and eye-oral-audit-summary.json bind the new family.

The second script uses the same verified30fps action-slot renderer but renders only eight corrected LOD views. It refuses old image/evidence reuse; full/portrait files are retained from03. Output is exports-pigment04/review-lod plus render-evidence-poses.json. Owning artist and root must inspect all eight for restored olive body, dark eyes, red oral tissue and pale gnathals, alongside retained silhouette and contact poses. If that succeeds, root runs:

```sh
DUNK_V4_VISUAL_ACCEPTED=1 python3 tools/devonian/creatures/dunkleosteus/face-v4/finalize_local_pigment_04.py
```

This corrected finalizer binds only exports-pigment04, verifies the repair proof, inherited audit reports and all20image hashes, then refreshes local final metadata and manifest. Root still owns its own final visual acceptance, intake, packaging/public integration and Git. No public/Git writes or finalization were performed by this artist. Earlier checkpoints follow.

## Latest active checkpoint — candidate03 correction and complete delivery recipe frozen

Candidate02 export/audit completed; both full and LOD retain18clips and pass eyes, but each has256 opposing-shell and130 opposing-gnathal failure records across173poses. These are genuine intersections, confirmed by independently decoded triangle-plane section plots in candidate02/exports/diagnostic-sections and inspected by the owning artist. See `candidate02-collision-diagnosis.md`. No tolerance was weakened. Candidate02 is not deliverable.

Candidate03 preserves candidate02's exact head/eyes, body, jaw shell, oral lining, rig/actions, anchors and images; it changes only six gnathals. Upper front blades receive a more medial lane and a shorter but still sharp terminal point; lower blades move into the free palatal corridor and clear the cheek along their rear path. The upper posterior sheet is additionally sculpted with convex shoulders, shorter exposed height, tapered ends and one curved cutting edge. Shape and clearance remain unverified until root's fresh CPU2 jobs.

The final frozen scripts refuse populated candidate/output directories, existing audit reports and previous render evidence/images, preventing silent overwrite or reuse of old candidate results. The audit and actual-export renderer explicitly select the sole Blender5.2 action slot, verify its handle, then compare evaluated jaw rotation channels with the bound F-curves at every checked/rendered frame. Their reports retain the bound slot identifier and channel values. This is an evaluation safeguard; all collision thresholds and173pose coverage remain unchanged.

Frozen complete workflow: `frozen-workflow-candidate03.json`. AST parsing passed for all six Python files. Input candidate02 Blend SHA256 remains `9a686211386b44ca42b264b1f8c5c17bdf04d7b2b81d14ca2d6e702f87d78c83`. Source SHA256:

- study_03.py: `1551013eed8e9f25de55f6b1697cd80c77c28ebdad752e53d1624d782fda3360`
- export_03.py: `73331f0a6607021e4011e384ae010d07ded464aaab879054261331cd3ac8b870`
- audit_exports_03.py: `0c642a8fbee33f972a6bce2f2ea22cbc4206c4f672e59c3db17f79ed6eddac0d`
- render_exports_03.py: `ab3cb12c15528f9f52e8d2d4d3e5f198550a3f0f798b96eff2d8326297e398c6`
- finalize_local_03.py: `1c6d97e237e4d556a1d272cbeb0098a48a3f94b16226905d4001669bd0f17e91`

Run sequentially from repository root. Root owns all heavy CPU2 execution. Build without redundant source renders; final recipe renders actual exports:

```sh
DUNK_FACE_RENDER=0 /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/study_03.py > ../devonian-authoring/dunkleosteus/face-v4-candidate03.log 2>&1
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/export_03.py > ../devonian-authoring/dunkleosteus/face-v4-export03.log 2>&1
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/audit_exports_03.py > ../devonian-authoring/dunkleosteus/face-v4-audit03.log 2>&1
```

The exporter verifies the study source hash, input hash and newly saved Blend hash. All files stay under new local candidate03/exports; all18clips remain in both GLBs. Review `eye-oral-audit-summary.json`: both eyes must pass and both oral failure counts must be zero. If not, inspect exact failures and revise a new version; do not finalize.

After checks pass, create all actual full/LOD review poses and four portraits in one job:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/render_exports_03.py > ../devonian-authoring/dunkleosteus/face-v4-render03.log 2>&1
```

This imports each exact exported GLB at30fps, mutes stashed NLA tracks and renders eight1000×800 face/action views each to exports/review-full and review-lod. The full model also produces exports/dunkleosteus.png and .select.png at1600×1200, .card.png at800×600 and .thumb.png at256×192, all transparent RGBA. `render-evidence-all.json` binds every image to its GLB hash and exact pose/camera. Optional `DUNK_FINAL_RENDER=poses` or `portraits` splits this job if needed. Inspect every resulting view and portrait; particularly assess whether the posterior upper blade now has a sculpted/tapered silhouette rather than a hanging sheet. If unresolved, flag and refine rather than claim final art.

After root explicitly accepts the actual full/LOD visual/contact/motion result, refresh local final metadata:

```sh
DUNK_V4_VISUAL_ACCEPTED=1 python3 tools/devonian/creatures/dunkleosteus/face-v4/finalize_local_03.py
```

This is an internal review-completion flag, not a request for additional user permission. The finalizer verifies unchanged export/audit/image hashes, zero recorded oral failures, both eye passes, all16review views and four portraits. It refreshes local V4 metadata with both18clip lists, new eye fractions and exact evidence, writes local-final-manifest.json and marks only the local candidate final. Root still owns intake, compressed packaging if needed, shared status update, public integration and Git. No public files or source Blend are touched by this pipeline.

At this checkpoint candidate03 build, export, audit and render have **not** run. This owner ran only lightweight direct-GLB section/preflight diagnostics. Complete new actual checks before claiming delivery. Earlier checkpoints follow for reproducibility.

## Current checkpoint — candidate02 inspected, export/audit ready

Candidate02 CPU2 job completed, Blend SHA256 `9a686211386b44ca42b264b1f8c5c17bdf04d7b2b81d14ca2d6e702f87d78c83`. Owning artist inspected all eight actual views and advances it to dedicated checks: forehead defects and protruding lower root plates are gone; head and cutting silhouette are improved. Closed lower cusp receiving clearance remains unproven and broad posterior upper gnathals need close review. See `candidate02-verdict.md` and `candidate02-reviewed-evidence.json`. This is **not final approval**.

Frozen next jobs, root-managed CPU2 sequentially:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/export_02.py > ../devonian-authoring/dunkleosteus/face-v4-export02.log 2>&1
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/audit_exports_02.py > ../devonian-authoring/dunkleosteus/face-v4-audit02.log 2>&1
```

Manifest: `frozen-export-audit-candidate02.json`. Export source hash `7f2c33224624656c73b8559524f557fcfc7371bad6c482853ecdc0efcf53e337`; audit source hash `0d8231a8aa9b8c8a39861f92b928901f762f6606fd2fa6f1dfc2c000f3a52f6b`. Both scripts AST-parse; neither has been executed at this checkpoint. Export writes candidate02/exports/{dunkleosteus.glb,dunkleosteus.lod1.glb,dunkleosteus.json,export-evidence.json}. Both local GLBs retain all 18 actions for oral parity inspection. Audit binds itself to exact export hashes and writes per-model eye/oral JSONs and `eye-oral-audit-summary.json`. It reports failures rather than altering geometry.

After jobs: inspect export counts and summary; inspect any oral failure's exact pose in actual full/LOD renders before revisions. Eye audit uses actual closed exported globe volume with three ray directions, requires conservative 95% lower bound at least 50%, and rigid eye/head weights establish pose invariance. Oral audit samples every integer frame in all five feeding actions against opposing shell/gnathals, plus exact bind anchor positions. Own root support is excluded. Edge-only intersections, oral-lining continuity, exported motion and final portraits/intake still need visual review. No public or Git modifications have been made by this owner.

The remaining sections are preserved chronological checkpoints.

## Latest checkpoint — candidate01 reviewed, candidate02 frozen

Root/Terra ran candidate01 once with CPU2 and produced all eight PNGs. Owning artist inspected all eight individually and **rejected** it for forehead/brow crumpling and excessive gnathal walls/root surfaces visibly outside the mandibular envelope. See `candidate01-verdict.md` and `candidate01-reviewed-evidence.json` for actual observations and hash-bound images. Candidate01 remains intact.

Next runnable source is `study_02.py`, SHA256 `65159f38d5617fa885d5cd7d49d074a02a9097a661657fb50c0e7ead7f014a0c`; manifest `frozen-inputs-candidate02.json`. It still starts from the original V2 Blend, preserves all unaffected data, and defaults to a new local `candidate02/` output directory. Head support subdivision and frozen input normals address the narrow crumpled sculpt; gnathal roots are sampled from actual supporting envelopes, posterior lower bases are narrower and smooth shading replaces broad flat panels. AST parsing passed; no candidate02 Blender execution or QA has happened.

Root CPU2 queue command:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/study_02.py > ../devonian-authoring/dunkleosteus/face-v4-candidate02.log 2>&1
```

Inspect eight new views and `candidate02/study-evidence.json` next, especially whether the brow artifacts are actually gone and fitted gnathal roots sit within their shells in rest and open views. This is a sculpt study, not release QA. The following candidate01 reproduction notes are historical and remain valid for that preserved version.

Owner: `/root/dunkleosteus_face_v4`. Scope is the user-requested head/cheek/brow and gnathal refinement only. Work is on `devonian-assets`. Public assets, Git, shared metadata and other creatures have not been changed. The previous V2 is preserved in the named backup.

Read `DESIGN.md`, `study_01.py` and `frozen-inputs-candidate01.json` in this directory. The source is frozen at SHA256 `efa72068ccd3d48c055c2d88f4bca09e65bd51c501c1f56c658789c2977de35b`. Python AST parsing passed; Blender execution and fresh candidate image inspection have **not** yet happened. Parent/root owns the deterministic Blender CPU queue. Do not launch an overlapping Blender job from this agent.

Input Blend SHA256: `2b636757ef5bca51fe206e38fefaf8fe525aafd22f2fdbb5816d3556ced87ff3`. The script refuses a different input. The reference JPG SHA256 is `527aa96de6e581c08fbd75fec05a5e7645e589835707092b28a12d112a491d84`. Absolute paths and sizes are in the frozen manifest. Source textures are packed in the Blend; no external material regeneration is needed.

Actual inspected images: user JPG, V2 `final-review/side.png`, `open-oblique.png`, `open-front.png`, `eye-side.png`. The top-level `anatomy-detail.png` was also viewed but depicts old V1 clay; it was excluded as a current appearance baseline. Primary Engelman 2024 head/mouthparts text was checked. Findings and design reasoning are in DESIGN.

From `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo`, root runs:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/study_01.py > ../devonian-authoring/dunkleosteus/face-v4-candidate01.log 2>&1
```

Optional exact-camera baseline comparison, only after the candidate job completes:

```sh
DUNK_FACE_MODE=baseline /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/dunkleosteus/face-v4/study_01.py > ../devonian-authoring/dunkleosteus/face-v4-baseline.log 2>&1
```

`DUNK_FACE_RENDER=0` may be set to build and verify preservation without rendering. Default builds and renders eight 1000×800 views with Cycles CPU, 20 samples and two threads. Candidate output folder is `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/dunkleosteus/face-v4/candidate01/`; baseline output is sibling `baseline/`. Expect `dunkleosteus-face-v4-candidate01.blend`, `study-evidence.json` and PNGs rest-side/rest-oblique/rest-front/max-oblique/max-front/mid-bite-side/eat-oblique/recovery-oblique. The `.blend` is saved before adding study lights/camera so it remains a clean authoring source.

Next action for owning agent: inspect root's actual eight candidate images, read study-evidence, and report a concrete visual verdict and any geometric defects. Do not infer quality from successful execution. In particular check the new lower anterior cusps against palate/head at rest; they may need repositioning after motion review. Keep sharpness and thick roots; do not retreat to generic cones or thin strips. If iteration is required, copy to a newly versioned study_02 source and a new candidate directory, preserving candidate01 and its hash manifest.

Still required before delivery: cranial/gnathal silhouette acceptance, detailed receiving clearance and root support through closure/gape/eating/recovery, eye containment (at least half the globe in real surrounding head volume), actual anchor alignment, independently exported full/LOD and action audits, regenerated portraits and creature intake. Existing V2 reports only apply to the preserved V2. No final QA is claimed.

## 8 September — linear05 focused acceptance
Root accepted four paired full/LOD views after color-space correction; original04 pale rest view compared. NewLOD c639770bd1b612cb7747856d38cd5b748d2671b10fdf6998dda4450db223c5f5,2,371,052B. All nonRGB bytes/alpha unchanged, full/portraits unchanged. See LINEAR05-VERDICT.md. Public LOD/metadata copied, intake/build/main pending. Still preview for surface normals/detail/controller polish.
