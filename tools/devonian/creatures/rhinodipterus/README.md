# Rhinodipterus kimberleyensis — V2 candidate

This is an individually authored Blender reconstruction of a long-snouted marine
lungfish. The cranial anatomy and feeding apparatus are based on the Gogo species;
the body and fin outline is a separately identified comparative reconstruction.
Compatibility action names describe model gestures, not a Devonian gameplay design.

## Primary evidence and deliberate uncertainties

[Clement (2012), species description and Figure 7](https://doi.org/10.1111/j.1475-4983.2011.01118.x)
is the main anatomical reference. The holotype preserves the skull roof, mandible,
palate, braincase, hyoid, pectoral girdle, operculogular elements and isolated scales.
It does **not** preserve the snout tip, vertebrae or a complete body. The long snout
is inferred from its long narrow mandibular symphysis and comparative relatives.
The symphysis occupies approximately half the mandible's length, while the posterior
rami diverge toward widely separated articulations. The model reflects that narrow
rostrum and broader posterior skull, instead of a modern blunt, tubular lungfish mouth.

The same description records seven pterygoid and six prearticular tooth-plate rows.
These are rounded denticles and smooth dentine extensions with a substantial space
between the left and right plates. The reconstruction uses continuous low-relief
radial grinding surfaces, not marginal fangs. The estimated maximum horizontal gape
is approximately 16 degrees, with weak biting and lateral grinding; the animation
jaw excursion stays below 15 degrees. “Heavy” is a longer braced processing gesture,
not a claim that this animal had a crushing predator's bite.

Figure 7G is the principal body-outline proposal, itself based on the comparative
Rhinodipterus ulrichi reconstruction after Schultze (1975). It informs the two posterior
dorsal fins, posterior pelvic fins and unequal caudal profile. This does **not** establish
those proportions for a complete R. kimberleyensis. [Ahlberg and Trewin (1995)](https://doi.org/10.1017/S0263593300003588)
and [Jude et al. (2014)](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2014.00018/full)
provide additional comparative early-lungfish fin anatomy. The paired fins are tapered
leaf-like fleshy surfaces, with a graded transition to their compliant distal margins.
They are not cylindrical stalks attached to separate paddles.

[Clement and Long (2010)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2936207/)
discuss elongated parasphenoid, hyoid and cranial-rib features interpreted as facilitating
air gulping. Buccal movement also relates to feeding; no exact breathing frequency is
known. The Ability clip is an interpretation of an oral gulp and subsequent buccal
pump. No walking, mud cocoon or aestivation is invented.

Fine-pored cosmine, selected cranial sutures and overlapping cycloid scale fields follow
the described material categories. Exact skin thickness, living pigmentation, exposed
suture prominence and soft-tissue motion remain artistic. The 0.55 m representative
catalogue length is a display assumption, not an observed whole specimen or a maximum.

## Source, preservation and material work

All V1 source, seven assets and original Blender files were preserved first in
`../devonian-authoring/rhinodipterus/v1/`, with a SHA-256 manifest. The V2 original is
`../devonian-authoring/rhinodipterus/rhinodipterus-v2.blend`. Intermediate clay views,
actual-GLB reviews, texture inputs and candidates remain under that authoring folder.
The builder writes only the local `v2-candidate/` family. The parent integrates approved
assets into public paths and repository main.

The continuous closed cranial envelope includes the actual palatal undersurface. A
narrow mandibular symphysis and divergent rami articulate around a real jaw bone;
posterior skin and oral lining blend toward the skull and body without a flat body cap
across the mouth. Fitted orbital skin follows each globe/head intersection and is
excluded from eye-volume measurement. The body has a genuine recessed oral passage.

`anatomy-v2.py`, `materials-v2.py` and `motion-v2.py` are explicit components of this
creature's builder. They do not import or execute another creature's builder.
Neutral export/review plumbing is adapted from the completed Coccosteus tooling;
Rhinodipterus geometry, material layout, feeding limits and action curves are separate.

The image-generated `cosmine-source-v2.png` is preserved with its full prompt and
provenance in `texture-provenance-v2.json`. It supplies only attenuated fine microdetail;
it is not anatomical evidence or baked illumination. Authored UV maps place larger
cranial sutures, exposed scale fields and restrained fin rays. All three material
regions have albedo, tangent-normal and roughness maps. Regional vertex pigmentation
is multiplied by the near-neutral albedo once. The physical LOD bakes that factor into
vertex pigmentation and contains no texture dependency. Export restoration matches
vertices within each material primitive so coincident oral boundaries cannot acquire
another material's colour and create vertical streaks.

## Rig and actions

Twenty-one joints control the rigid skull and jaw, compliant buccal floor, posterior
body wave, paired fin lobes and tips, posterior median fins and small opercular motion.
The identity root never moves. Body translations are local pose accents. No action
contains scale channels. The three compatible nested version-1 anchors mark the moving
oral margin, interior swallowing reference and upper contact margin; bind-space
coordinates and parent bones are recorded in `anchors.json`.

| Clip | Seconds | Species-specific gesture |
|---|---:|---|
| Idle | 2.4 | Buoyant body drift, quiet buccal pumping, small alternating fin corrections |
| Swim | 2.4 | Two posterior travelling waves, delayed caudal and median response, paired-fin lag |
| TurnLeft / TurnRight | 1.7 | Anticipatory correction, opposed bank and tail sweep, delayed fin recovery |
| Dive / Rise | 1.6 | Prepared pitch, coordinated paired fins, late pelvic and caudal correction |
| Attack | 1.0 | Small prepared approach, restrained oral opening and processing recovery |
| Bite | 0.5 | Short limited gape and controlled closure |
| Heavy | 1.1 | Longer fin-braced approach and gentle lateral processing |
| Hit | 0.6 | Asymmetric recoil followed by a delayed fin correction |
| Death | 1.6 | Diminishing tail impulse, passive lateral settling and held terminal pose |
| Guard | 1.0 | Spread lobed fins with breathing and subtle station keeping |
| Parry | 0.35 | Quick oblique deflection, opposed tail correction and recovery |
| Dodge | 0.4 | Prepared bend, short side slip and delayed fin-tip follow-through |
| Eat | 1.6 | Two differently timed small openings, near-closed lateral grinding and buccal pulses |
| Stagger | 1.2 | Two diminishing balance disturbances with asymmetric fins |
| Ability | 2.4 | Prepared head/body elevation, restrained gulp and delayed buccal pump |
| Growth | 1.5 | Relaxed fin extension and respiration without scaling |

Idle, Swim, Guard and Eat are seamless loops. Other one-shots recover to neutral,
except Death which holds the terminal pose. Actions are sampled at 30 fps.

## Reproduce and review

From repository root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/rhinodipterus/build.py
python3 tools/devonian/creatures/rhinodipterus/finalize.py
node tools/devonian/creatures/rhinodipterus/audit-export.mjs
node tools/devonian/creatures/rhinodipterus/audit-export.mjs --lod
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/rhinodipterus/v2-eye-audit ../devonian-authoring/rhinodipterus/v2-eye-audit/selectors.json
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/eye-audit.py -- ../devonian-authoring/rhinodipterus/v2-eye-audit-lod ../devonian-authoring/rhinodipterus/v2-eye-audit-lod/selectors.json
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/rhinodipterus/render-v2.py
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/rhinodipterus/render-lod-v2.py
node tools/devonian/creatures/rhinodipterus/motion-review.mjs
```

The local candidate has not been approved merely because files exist. Final quantitative
results and matching hashes belong in the delivery and validation reports. Eye audits
use deterministic uniform volume sampling of the actual exported globe polyhedron
against the continuous head, separately for full and LOD; decorative lids do not count.
The final review also includes four eye angles, lit gape/closing/rest/processing views,
oblique oral attachments, ten major poses and all 18 clips through actual Three.js
playback. Each final portrait must be regenerated from the exact accepted GLB.

The frozen candidate's full eye estimates are **83.28% / 83.11%** inside, and the
physical LOD estimates are **83.32% / 83.16%**. Both head envelopes are closed with
zero nonmanifold edges and no temporary audit caps; all conservative 95% lower
bounds exceed 82.8%. The independent audit rejects samples outside each actual
triangulated globe and classifies the accepted volume against the exported head.

The full model has **216,511 triangles**, the reduced model **57,751 triangles
(26.67%)**, with matching 21-joint graphs and three anchors. The full file is about
14.9 MB before optional lossless packaging; the LOD is about 2.3 MB and has zero
textures. `attachment-validation-v2.json` evaluates the actual skinned paired-fin
root vertices at seven phases of every exported action: all remain inside the
continuous torso, with at least 0.014 model-unit clearance. This is an attachment
check, not a replacement for the eye-volume measurement.

The final mouth pass removed an anterior lining-tube edge, recessed the body's
oral annulus behind the mandible, blended the exposed rostral roll into exterior
skin pigmentation, and thinned the posterior mandibular profile. Close-up review
uses a scene rate of 30 fps so the marked Heavy frame is the actual maximum gape.
The additional `--profile-only` render mode supplies full profile, profile gape,
opposite-side gape/closing and lit frontal gape evidence. Final hashes and completed
review inventories are recorded by `python3 tools/devonian/creatures/rhinodipterus/delivery-v2.py`.

CPU Cycles is the reproducible default. `--metal` enables the available Metal device
as an optional rendering optimization; it does not alter model geometry or materials.

The complete frozen candidate family is handed off in `delivery-v2.json`. All25 full
render records, five profile records and three LOD poses completed before the user
switched production priority to initial versions. Parent controls preview labeling,
viewer integration and publication; further refinements are deferred to later review.

## Reference-led redesign reopened — 8 September 2026

The user supplied a new appearance reference. This model remains a preview pending that
redesign; previous evidence applies only to the preserved old files. See the species section
in `docs/devonian/refinement-queue.md` for concrete sculpt, eye, fin and material targets.
The image and copy/hash-verified model/source backup are under local/devonian-authoring.
Do not rerun the old builder into an existing candidate or treat old eye audits as approval
for future geometry. Finish the redesign before fresh general quality audits.

## V3 shipped — 12 September 2026

`build-v3.py` + `anatomy-v3.py` + `motion-v3.py` (with `-v3` copies of export, attachment audit,
finalize, render and delivery) port the approved head study off the user reference
(`docs/reference/Rhinodipterus.webp`): the head 1.12× longer about its rear, the cheek rows widened
and deepened, the cranial bones mapped as suture grooves, the eye inset like a fish's — a first
inset of .058 buried the globe entirely (audit 100%, nothing visible) and was brought back to .036,
which audits at 93.5% / 93.4% (full) and 93.5% / 93.4% (reduced) with the eye clearly showing.
Scales stay the existing normal map. Packaging exact round-trip PASS at 216,511 / 57,761
triangles; intake PASS; portraits from the V3 build; `anchors.json` is V3's. `build.py` still
reproduces V2. The user accepted the study on 12 September; badge cleared.
