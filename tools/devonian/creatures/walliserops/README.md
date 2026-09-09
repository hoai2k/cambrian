# Walliserops — initial preview specimen

**Preview model.** This separately researched initial Walliserops trifurcatus asset follows the user's priority to complete the roster before extended refinement. Further spine-root sculpting, detailed joint/appendage clearance and precise specimen-overlay comparisons remain open.

## Identity and anatomy

Late Emsian Timrhanrhart Formation, Morocco. Primary reference: Gishlick & Fortey2023, PNAS120:e2119970120, https://doi.org/10.1073/pnas.2119970120 . Figures1–3 were directly inspected: UA13447 topotype and HMNS PI1810 show the long raised haft and broad flattened keeled tines. The middle tine branches slightly asymmetrically. The trident stays completely rigid on the cephalon, with no invented joint. Its interpreted contact function is represented through a planted stance and limited cephalic pitching; fossil behavior and sex are uncertain.

Eleven rigid thoracic tergites, reduced glabellar tuberculation, long swept genal spines, axial and pleural projections and five paired plus a terminal pygidial process distinguish this model. The primary paper knows no enrolled Walliserops specimen; Ability is a restrained stance/contact display, not a claimed fully enrolled posture. Trident inner soft contents are not exposed or purportedly fossil-preserved.

Schizochroal eyes are embedded in continuous cephalon geometry. The preview's17 files/82 individual lens solids per side are a comparative illustration, not a measured Walliserops count. Each closed lens is tested separately, along with underlying ocular organs; decorative rims are excluded. Biramous limbs, flattened podomeres, gnathobases, lamellar respiratory branches and antennal flagella are comparative soft-part reconstruction. A ventral oral recess has lining and moving processing tissues, not a vertebrate jaw. See research.md for primary/comparative sources and limitations.

## Original source and materials

`../devonian-authoring/walliserops/v2/walliserops-v2.blend` is the packed original Blender source. Candidate GLBs and portraits remain local for parent packaging. `special_anatomy.py` independently authors this species' projections and `build_v2.py` reshapes its shell. Articulated trilobite utilities, comparative underside and tested optical construction are explicitly adapted from our original Eldredgeops source; no downloaded model is used. The source snapshot and research figures remain in local v2/source and v2/references.

Original imagegen slate/umber cuticle artwork is preserved with exact prompt in imagegen-provenance.md. UV albedo/normal/roughness maps provide restrained organic pigmentation. Full COLOR_0 is white, preventing double multiplication; reduced model has linear-light baked pigment without texture images. Pigmentation is artistic.

## Rig and actions

313-bone segmental skeleton, exact same graph at both levels, plus three nested v1 sockets. Mouth and swallow are at actual ventral recess; primary contact is at the trident tip. +Z forward/+Y up in glTF. Rigid shells and projections follow their anatomical bones. Root stays identity. No scale animation.

Full20 clips, LOD Idle/Swim/Crawl/Death. Idle/Crawl/Swim/Guard/Eat loop. Compatibility names do not define gameplay or claim fossil behaviors.

| Clip | Seconds | Motion |
|---|---:|---|
| Idle |2.4|Antennal exploration and respiratory branch movement|
| Crawl |2.4|Metachronal stepping with asymmetric foot phasing|
| Swim |2.4|Limb-powered paddling beneath rigid shell, compatibility interpretation|
| TurnLeft/TurnRight |1.6 each|Differential steps, modest body heading/bank|
| Dive/Rise |1.6 each|Lower/raise benthic stance|
| Attack |1.0|Plant, short trident contact reach, recover|
| Bite |0.5|Ventral gnathobase processing and oral pump|
| Heavy |1.1|Braced anticipation, downward contact sweep of rigid trident, recovery|
| Hit |0.6|Recoil with delayed antenna motion|
| Death |1.6|Fading leg activity and lowered partial flexion, terminal hold|
| Guard |1.0|Restrained repeated brace and modest shell flexion|
| Parry |0.367|Asymmetric brace and recovery|
| Dodge |0.4|Quick lateral stepping with follow-through|
| Eat |1.6|Alternating anterior gnathobase and oral tissue processing|
| Stagger |1.2|Uneven steps and damped imbalance|
| Ability |2.4|Plant, pitch rigid trident toward contact via body/neck stance, recover|
| Growth |1.5|Unscaled extension/relaxation compatibility posture|
| Moult |1.5|Loosening/withdrawal preparation without detached shell|

## Reproduction

From expansion-repo using Blender5.2; --threads2 limits parallel resource use. This host needs escalation to avoid sandbox Metal crash.

```
python3 tools/devonian/creatures/walliserops/materials.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/walliserops/build.py
python3 tools/devonian/creatures/walliserops/validate.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/walliserops/export_audit.mjs
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/walliserops/audit.py
WAL_IMPORT=full WAL_RENDER=preview /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/walliserops/render.py
WAL_IMPORT=lod WAL_RENDER=lod /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/walliserops/render.py
WAL_IMPORT=full WAL_RENDER=portrait /Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/walliserops/render.py
python3 tools/devonian/creatures/walliserops/finish.py
```

Validation outputs establish actual geometry, weight normalization, nonzero/distinct actions, loop seams, stable roots, no scale channels, anchors and LOD reduction. Eye reports bind actual exported hashes. Visual evidence is actual GLB reimport in front/side/dorsal/three-quarter, compound-eye and directly lit ventral feeding views plus basic locomotor/contact/defensive/action poses. Fourteen sequential actual-export frames of Heavy, Ability and Crawl also check anticipation, peak and recovery. This selected sequence review does not claim exhaustive frame-by-frame transition or collision clearance. Final delivery.json and WORKING_STATE.md record frozen output hashes and review status.
