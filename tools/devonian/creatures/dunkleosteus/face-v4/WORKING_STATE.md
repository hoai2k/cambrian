# Restart — 8 September 2026, face V4 candidate01 frozen

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
