# Eldredgeops frozen initial-preview handoff — 2026-09-07

## Status and ownership

Complete initial candidate, frozen for parent packaging, actual viewer inspection and publication. This is explicitly a **preview**, following the user's priority to complete the initial roster before further refinement. No public files, shared catalogues or git state were edited by this author. Prior Dunkleosteus, Doryaspis and Stethacanthus remain frozen.

Candidate directory: `/Users/hoai/Documents/Stuff/Generations/cambrian/local/devonian-authoring/eldredgeops/v2/candidate/`.
Original packed Blender: `../devonian-authoring/eldredgeops/v2/eldredgeops-v2.blend`.
Source snapshot: `../devonian-authoring/eldredgeops/v2/source/`.
No build, export or render remains running. Do not rebuild or overwrite the candidate after parent packaging without coordination.

## Delivered

- Textured full GLB: 477,662 triangles; 34,571,900 bytes before parent lossless packaging. SHA256 `145b07f864510197364b596dde99be9cfab81f7070a43dbe422eac573daaf1e2`.
- Texture-free vertex-pigmented LOD: 167,969 triangles (35.16%); 10,440,880 bytes. SHA256 `466ffd6395bbf12bd495d2ae098c143a03aa304561176bb6c15fbfdd908544b7`.
- Both models have the same 313-bone parent graph and three nested v1 anchors. Full has all 18 shared actions including Growth, plus Crawl and Moult (20 total). LOD Idle/Swim/Crawl/Death. Metadata locomotion is Crawl.
- Four matching final PNGs and metadata with `artStatus: preview`. Complete hashes in delivery.json.
- Original imagegen cuticle swatch, four UV albedo/normal/roughness families, packed Blender and executable scripts preserved. Full COLOR_0 is white; LOD retains linear baked pigment without textures.

## Anatomy and review

Independent Eldredgeops rana reconstruction: 11 rigid thoracic tergites, rounded cephalon, inflated tuberculate glabella, articulated pygidium, biramous appendages, gnathobases, paired antennae and ventral lined oral recess. Schizochroal eyes have 17 dorsoventral files and 82 separately embedded lens solids per side. Soft-part counts and colours are explicitly comparative/interpretive. Research sources and limitations are in research.md and README.md.

Actual full GLB was reimported and inspected in front, side, dorsal, three-quarter, eye and directly lit ventral oral views, plus basic Crawl/Swim/Eat/Heavy/Guard/Ability/Dodge/Death extremes. Final LOD Idle/Swim/Crawl/Death and eye views inspected. Full/LOD rig, weights, root stability, action names, loop seam and anchor checks passed. This is not an exhaustive frame-by-frame collision or transition review.

Final images: `v2/review-export-full/`, `v2/review-export-lod/`, `v2/preview-review.jpg`.
Final log markers: ELDREDGEOPS_RENDER_COMPLETE in `/tmp/eldredgeops-final-renders.log`, `/tmp/eldredgeops-final-portrait.log`, `/tmp/eldredgeops-final-lod.log`.

## Actual exported eye-volume evidence

Both underlying ocular organs are essentially fully embedded (100% / 99.991%). All 164 lens solids were audited independently against continuous closed cephalon geometry, excluding decorative rims. Full weakest lens 73.765%, conservative 95% lower bound 72.481%; LOD weakest 73.679%, lower bound 72.394%. Every individual lens passes the 65% conservative target and 50% requirement. Reports bind the final GLB hashes.

Summary: eye-evidence.json. Actual reports: `v2/audit-full/report.json`, `v2/audit-full/lens-report.json`, `v2/audit-lod/report.json`, `v2/audit-lod/lens-report.json`. Shared audit checks ocular organs; lens_audit.py independently tests each closed lens component, never a volume-averaged field.

## Deferred preview refinement

- Perfect enrollment coaptation, fine shell margins and facial sutures/vincular notches are not complete. Antenna tips can remain outside at deepest curl, and the occipital/first-tergite region opens in strong flexion.
- Further limb/branchial clearance, joint-window fitting and material balance are appropriate after the initial roster. No claim of exhaustive animation collision clearance.
- Growth is an unscaled compatibility posture. Moult is preparation without a detached shell.
- Raw full file exceeds 25 MB; parent owns lossless packaging and runtime budget review.

## Reproduction (only when explicitly resuming refinement)

From expansion-repo, Blender requires --threads 2 and escalation on this host to avoid sandbox Metal crash:

```
python3 tools/devonian/creatures/eldredgeops/materials.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/build.py
python3 tools/devonian/creatures/eldredgeops/validate.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/eldredgeops/export_audit.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/audit.py
ELD_IMPORT=full ELD_RENDER=preview /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/render.py
ELD_IMPORT=lod ELD_RENDER=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/render.py
ELD_IMPORT=full ELD_RENDER=portrait /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/eldredgeops/render.py
python3 tools/devonian/creatures/eldredgeops/finish.py
```

README.md explains the source modules, per-action intent and reconstruction uncertainty. Historical clay images in development/ are not final evidence.
