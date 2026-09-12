# Acanthostega initial preview

Independently authored aquatic Acanthostega gunnari; not Tiktaalik with digits attached. The editable Blender source and candidate assets live in `local/devonian-authoring/acanthostega/`. Public publication is handled by the parent integration task.

## Anatomical basis

Coates (1996), *The Devonian tetrapod Acanthostega gunnari Jarvik: postcranial anatomy, basal tetrapod interrelationships and patterns of skeletal evolution*, https://doi.org/10.1017/S0263593300006787, supports eight unequal digits on both manus and pes, paddle-like limbs, a large caudal fin with unsegmented/unbranched rays and radials, and ventral chevron gastralia. It reports no evidence for a dorsal scale coat. The dorsal caudal supports begin farther forward than their ventral counterparts. This preview has four octodactyl paddles, finely pebbled dorsal skin, quiet ventral chevrons and a continuous deep caudal fin; it has no claws, separate dorsal fin or terrestrial walking cycle.

Porro, Rayfield & Clack (2015), *Descriptive Anatomy and Three-Dimensional Reconstruction of the Skull of the Early Tetrapod Acanthostega gunnari*, https://doi.org/10.1371/journal.pone.0118882, supports a deeper, more strongly sutured skull with a longer postorbital region and anterior mandibular hook. Cheek kinesis is unlikely. Accordingly the roof and cheeks remain rigid while the lower jaw and internal throat articulate. The mouth has attached palate, floor and pharyngeal tissue, small marginal teeth and larger anterior fangs. Tooth counts are reduced for readability and are not a specimen-by-specimen dental reconstruction.

Soft webbing extent, skin pigment, fleshy skull/limb outlines and exact movement amplitudes are inferred. The 0.6 m metadata is representative, not a claimed species maximum. Primary PDFs, extracted text and reviewed figure renders are preserved in the local references directory. Published figures are not used as game textures.

## Authorship and runtime

`anatomy_v1.py` defines the individual rounded cranial roof, hooked shallow jaw, cylindrical trunk, dorsoventrally asymmetric caudal expansion, four muscular paddle limbs and 32 independently weighted digits. `materials_v1.py` maps original imagegen skin art in physical surface coordinates, retaining high-density cranial pigmentation without vertical stretching. Full glTF vertex colour is neutral white to avoid doubling the albedo; the texture-free LOD retains linearized pigment.

`actions_v1.py` authors all 18 required clips. Swim uses increasing tail-wave amplitude and delayed, alternating limb/palm/digit strokes. Turns bank and brake asymmetrically; Dive/Rise pitch the body and paddles; feeding attacks have anticipation, jaw closure and recovery; Guard/Ability spread and scull the aquatic paddles. No ordinary terrestrial gait is implied. Growth stretches the posture without scaling bones. Death reaches a held final pose. The asset has exactly three version-1 anchors, with the same skeleton and sockets on both LODs. The reduced asset retains Idle, Swim and Death.

Export, portrait and GLB review utilities derive from the previously validated pipeline; anatomy/material art and limb motion are independently authored for this taxon.

## Reproduction

From the repo root:

```sh
ACANTHOSTEGA_QUICK=1 /Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/acanthostega/build.py
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/creatures/acanthostega/render-portraits.py
/Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/acanthostega/audit-candidate.mjs
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/acanthostega/eye-audit-full
/Applications/Blender.app/Contents/MacOS/Blender -b --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/acanthostega/eye-audit-lod
python3 tools/devonian/creatures/acanthostega/check-export.py
ACANTHOSTEGA_QA_QUICK=1 /Users/hoai/.local/opt/node/bin/node tools/devonian/creatures/acanthostega/review-viewer.mjs
```

Preview scope: coherent first asset, basic anatomy/eyes/attachment/export review and complete required runtime files. Extended art refinement and biomechanical animation polishing are deferred until the initial roster is complete.

## Frozen preview metrics

Full 13,996,232 bytes,102,108 triangles; reduced2,344,760 bytes,28,586 triangles(28%).56 bones,18/3 clips and3 matching version1 anchors. Actual eye-volume estimates ~73%, conservative lower bounds >72.5%, closed head/no temporary caps.72 sampled poses preserve four limb-root centroids and84 tooth bases. Details and deferred art issues: final-review-v1.json. Exact seven-file hashes: local v1-candidate/candidate-manifest.json.

## V2 shipped — 12 September 2026

`anatomy_v2.py` (selected by `ACA_ANATOMY`, now defaulting to `v2`) ports the approved study. The
11 September triage found the tail fin a solid paddle fused on the tail tip, the trunk a constant
round tube and the limbs sticks with a bolted-on palm. Now: the tail is a muscular core of its own
height with a thin fin web above and below it and a crease where the web leaves the core, the
dorsal web deeper than the ventral, fin rays from the core boundary to the edge every 0.13 along the
tail (fin material, weighted to the tail bones with a blend along each ray), and a pointed tip; the
trunk's ventral half is a flattened superellipse through the trunk band and the stations are wider;
the limbs are fuller and the loft closes at the palm instead of an ellipsoid. The hind-limb root is
seated inward and up so the pelvic root ring stays inside the body in every sampled pose — the
`check-pose-attachments.py` selector now describes limb roots (`.10<|x|<.32`) because the new
midline rays share material 5 and a UV.v==0 ring. All four limb roots buried in 72/72 poses; ray
core centroids inside in 3,744/3,744 samples. Packaging exact round-trip PASS at 99,932 / 27,976
triangles; intake PASS; check-export PASS; portraits from the V2 build. The user accepted the study
on 12 September; badge cleared.
