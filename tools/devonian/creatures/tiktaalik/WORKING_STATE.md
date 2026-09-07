# Tiktaalik frozen preview handoff — 2026-09-07

**FROZEN FOR PARENT INTEGRATION AS A PREVIEW. Do not modify source or candidate assets after handoff without parent request.**

User changed priority to complete initial versions of all creatures/plants/props before further refinement. The immediate oral tissue overlap was corrected. All seven candidate assets and exact hashes are in ../devonian-authoring/tiktaalik/v2-candidate/candidate-manifest.json. Final metrics and remaining polish are in final-review-v2.json. Four matching portraits are now complete. Full/LOD independent eye audits use the current GLB hashes; all conservative lower bounds exceed70.4%. Both heads are valid closed meshes, with no temporary caps.

The 126-pose attachment check passes all four fin-root centroid containment checks and all72 tooth bases. Neutral oral-floor clearance is positive at all625 points. Source/actual GLB views and all-actions.webm are preserved locally. The current palette, tail outline and oral presentation remain a preview; extended polishing is explicitly deferred. Parent handles compression, preview warning, main-viewer integration and git.

No Blender/Chrome asset-writing tasks remain required. The previous detailed checkpoint follows for reproducibility/history; its intermediate-state warnings and hashes are superseded by the final-review and candidate manifest.

---

# Tiktaalik durable working state — 2026-09-07

Owner: /root/devonian_titanichthys. Parent /root integrates/publishes/commits. Own only this source directory and local/devonian-authoring/tiktaalik. **Candidate is NOT FROZEN or art-approved. Do not publish it yet.** Titanichthys, Gemuendina and Cladoselache were previously handed off and must not be changed.

## Current model

Original Tiktaalik source, no prior V1 existed. Sources: Daeschler 2006 body/skull, Shubin 2006 pectoral fin, Lemberg 2021 feeding system, Stewart 2024 axial reconstruction, Stewart 2020 fin rays. Primary PDFs/figure study renders are local under references; see anatomy-notes.md. The body was individually reshaped to lengthen the shoulder-to-hip region and inferred tail using the 2024 proportions. Skull has posterior dorsal eyes, a shallow long mandibular outline, a mobile neck, separate cheek modules and a real oral passage. Four robust covered fins have shoulder/elbow/distal/web articulation; no fingers or terrestrial stride. All 18 clips and exact3 version1 anchors are present; LOD keeps Idle/Swim/Death.

Original imagegen swatch and prompt are saved as skin-source.png and material-provenance.md. Cranial sculpture differs from trunk scales. Full PBR has white COLOR_0; texture-free LOD has linear baked pigment.

## Exact current files and hashes

- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/tiktaalik/build.py`: SHA256 `a0b0b7ca3212e6adb574ad0cd6b3398946a5f4643b5f6960194142c77eaf49fa` (18,588 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/tiktaalik/anatomy_v2.py`: SHA256 `672cbd4722a09f1233f5c63101e5209fba367f579f7bafe8a801008e7b9f0909` (6,971 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/tiktaalik/actions_v2.py`: SHA256 `4454a2f0fcad44806984f7d0b046832254460ae19369fe540082074187d3279e` (7,347 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo/tools/devonian/creatures/tiktaalik/materials_v2.py`: SHA256 `14eaecc62b98797481d7da0ecdd522079a884eb56d1b517d2f720362a2b928bd` (5,432 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/tiktaalik/tiktaalik-v2.blend`: SHA256 `4adb5cf41f8e128213e43404525eef7cd44984410f8fa818fd0545292c375bba` (16,384,397 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/tiktaalik/v2-candidate/tiktaalik.glb`: SHA256 `f79a2a2043c32566de9c498d4e486d3ca87e0dc52b538e12ae36a22582a610fd` (19,077,100 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/tiktaalik/v2-candidate/tiktaalik.lod1.glb`: SHA256 `cd10c4ec2ec2f761831afc38460288a74310d4849633bf2b62077bc418e5c365` (2,236,864 bytes)
- `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/tiktaalik/v2-candidate/tiktaalik.json`: SHA256 `eb7459b40e666392d1c70bfb81b68c04315a7a372cf40312ff44108d3065eb75` (2,515 bytes)

The candidate directory currently has three finished-format files (full GLB, reduced GLB, JSON). Four matching portraits have NOT been generated yet. Quick source renders are outside the candidate directory. The full model is 19,077,100 bytes; reduced 2,236,864 bytes, with structural checks passing 18/3 clips.

## Defects found and corrected

- Early jaw corner curled because the longitudinal mapping had a negative derivative. Mapping is now monotonic.
- Early caudal membrane had a squared separate sheet; tail is now a continuous low axial/caudal surface, with uncertainty explicit.
- Thick frontal wall and dark vertical nare pigment were rounded/thinned and blended. Cranial microtexture/roughness is stronger and coherent with the body.
- Initial lower-jaw deformation moved tissue behind the actual hinge, producing a cheek flap. Weights now fade using actual longitudinal positions; the flap is gone.
- Thinning the jaw exposed an inner-floor/exterior overlap. Direct analytic clearance found 75/625 negative samples. The mandibular cross-section was corrected, and now all625 have positive clearance, minimum 0.011652 model units. Last log is oral-clearance.log; rerun check-oral-clearance.py to produce its JSON report.
- LOD joint weights are now explicitly reduced to4 and renormalized. Split export meshes retain armature parenting.

## Current validation and visual status

check-export.py passes full-white COLOR0, texture-free coloured LOD, normalized skin weights, finite distinct motions, no root or scale channels. pose-attachments-v2.json independently evaluates126 poses (7 phases per each18 clips): all4 fin-root centroids are inside the continuous body; all72 tooth bases remain within0.0044702 model units of oral lining. This check supplements visual inspection and does not prove every triangle intersection absent.

Previous eye audit, before the final mandibular-only correction: full73.75%/73.46%, LOD73.59%/73.81%, all lower bounds>73.1%; actual head is closed with0 nonmanifold edges and no temporary caps. Those earlier eye report hashes are stale for the newest GLBs. A fresh full audit is running (session50344); fresh LOD audit still needed.

Latest actual GLB images: viewer-v2/neutral-mouth.png, neutral-mouthleft.png, neutral-palate.png, neutral-eye.png, neutral-eyedorsal.png plus all action poses. Jaw margins and teeth are now attached, with no green exterior crossing the lining. The palate is still poorly lit in the diagnostic view (dark roof above a large shallow floor); add an inspection-only frontal/lower light to demonstrate its actual depth and check the posterior pharynx. The shallow fish jaw should not be converted into a big unsupported fleshy basin. Current oral inspection has NOT been approved by parent.

The all-action browser script is running with movie capture (session56890), source render job from the previous candidate may be completed (session52205) and should not be mistaken for latest-source evidence. Earlier raw browser full-page loads timed out on networkidle; review-viewer.mjs now routes a lightweight local /tiktaalik-qa.html and loads actual GLBs in Three.js. It does not depend on rendering the entire shared viewer. Parent will inspect packaged model in main viewer.

## Next steps

1. Inspect fresh eye reports; run the LOD audit against the newest decoded candidate.
2. Light the oral diagnostic view to show palate/cheeks/pharynx, inspect front/left/right/max-gape, and send parent exact fresh image paths for feedback. If geometry changes, regenerate candidates and all hash-bound reports.
3. Inspect all action frame groups and continuous all-actions.webm, make contact sheets, review fin/mouth extremes. All-motion attachment numerics already pass newest source.
4. Run render-portraits.py for four matching candidate PNGs; optionally refresh source detail renders. Inspect alpha, crop and LOD colour.
5. Save fresh full/LOD eye audits, final runtime report, source pose/clearance reports and source/asset hash manifest. Update README with final metrics. Remove no authoring intermediates; keep local source.
6. Ask parent for final art review, then freeze exact seven candidate files plus manifest and send concise handoff. No git/public/shared edits.

## Reproduction and review commands

Run from /Users/hoai/Documents/Stuff/Generations/cambrian/local/expansion-repo. Blender uses --threads2; sandbox escalation is needed for Metal. Node path /Users/hoai/.local/opt/node/bin/node. Chrome headless requires escalation for SwiftShader.

```sh
TIKTAALIK_QUICK=1 /Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/build.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/render-portraits.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/review-source.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/check-pose-attachments.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/tiktaalik/check-oral-clearance.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/tiktaalik/audit-candidate.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/tiktaalik/eye-audit-full
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/tiktaalik/eye-audit-lod
python3 tools/devonian/creatures/tiktaalik/check-export.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/tiktaalik/review-viewer.mjs
```

Source build performance: the per-frame bounds extraction in actions_v2.py now uses native foreach_get rather than millions of Python vertex copies; this equivalent diagnostic optimization was made during the last build, so the current blend uses identical motion but earlier/slower bounds extraction. It does not affect asset geometry/animation. Avoid overlapping build processes writing the same candidate files. An older redundant build was terminated once; no process other than the owner should mutate these candidates.
