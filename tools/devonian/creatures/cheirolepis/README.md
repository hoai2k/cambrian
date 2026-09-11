# Cheirolepis trailli — Blender V2 source

This is a consistent Scottish Middle Devonian reconstruction, using a 0.25 m representative individual. The model has a large terminal jaw, separate opercular covers, small rhombic scale windows, short-based posterior dorsal and anal fins, ray-supported paired fins and a strongly unequal caudal fin with a scaled upper axial lobe. It does not mix anatomical details from the larger Late Devonian Canadian species.

## V2 anatomy and review

The Blender revision uses a smoothly curved head and independently moving lower jaw with a real palate, oral floor and recessed throat. Small ganoine scales are shallow normal relief over the continuous trunk. Separate opercular covers have attached leading edges; cambered fins have segmented rays, matching tail-axis weights and staggered left/right motion. The six-joint tail chain propagates swimming and fast-start bends. The original V1 project and outputs are preserved locally.

The actual exported eye-polyhedron audit finds **80.12% / 79.86%** of the full eyes and **79.99% / 79.72%** of the reduced eyes within the continuous closed head. All conservative 95% lower bounds exceed 79.4%. No orbital hoops or added audit caps are used. Both detail levels are measured independently and reports bind results to the original candidate hashes.

All eighteen clips were played in Three.js and sampled at 91 times each, with finite transforms and a stable root bind transform. Matching portraits and feeding, turning, banking and terminal Death poses were rendered from re-imported GLBs. Full geometry has 155,808 triangles and the reduced version 43,620 (28.0%), with matching 22-bone skeletons and three sockets. Final packaging and main-viewer results are recorded separately.

## Sources and uncertainty

- [Giles et al., Cheirolepis endoskeleton and pectoral anatomy](https://pmc.ncbi.nlm.nih.gov/articles/PMC4950109/).
- [Igielman et al., Devonian ray-finned fish lower jaws](https://anatomypubs.onlinelibrary.wiley.com/doi/10.1002/ar.70005), including Scottish C. trailli NHMUK PV P62908b and P1370.
- [AMNH ptc-5970, a 25 cm Nairnshire specimen](https://digitalcollections.amnh.org/archive/Cheirolepis-trailli--primitive-ray-finned-fish--approximately-380-million-years-old--L-25-cm--Middle-Devonian-of-Nairnshire--Scotland-2URM1THIF2SU.html).
- [National Museums Scotland fossil collection review](https://files.nms.ac.uk/production/Documents/Our-Impact/Collections-reviews/Fossil-collections/fossil-review-complete-_review-of-fossil-collections-in-scotland.pdf).

Pigmentation, soft-tissue volume, exact individual tooth arrangement and all animation are artistic interpretation. The UV normal map is a reproducible authored enamel pattern, not fossil imagery. Fine rhombic relief is intentionally shallow rather than plate armour. Mesh lofting, bone export and animation utility code is adapted from the project's Cladoselache authoring code; all head, trunk, scale, oral, opercular and fin geometry is defined in this creature's builder.

## Reproduction

From the repo root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --threads 2 --python tools/devonian/creatures/cheirolepis/build.py
```

Original `.blend`, build logs and pose renders are in `../devonian-authoring/cheirolepis/`. Override the local source destination with `DEVONIAN_AUTHORING`. The builder writes both GLBs and matching images to the local `v2-candidate/` directory. `--skip-renders` skips only portraits; it does not publish. `render-v2.py -- --lod` reviews the reduced GLB separately. Integration runs `node tools/devonian/check.mjs cheirolepis` and performs lossless packaging. The local `validation.json` records source geometry, finite posed bounds, normalized weights, loop seams and root stability; it is not a visual-quality certification.

## Action meanings

Idle and Swim are 2.4-second loops with caudal propagation, independent paired-fin motion and opercular ventilation. Guard is a 1-second fin-bracing loop; Eat is a 1.6-second oral/ventilation loop. TurnLeft/TurnRight last 1.6 seconds, Dive/Rise 1.4, Attack 1, Bite 0.5, Heavy 1.1, Hit 0.6, Parry approximately 0.35, Dodge 0.4, Stagger 1.2, Ability 2.4 and Growth 1.5. Death lasts 1.6 seconds and holds a relaxed rolled pose. Root is stable and there are no animated scale channels. Growth is a fin-spreading maturation gesture; Ability is a burst-and-bank display. These compatible labels prescribe no Devonian gameplay rules.

## Material provenance

`ganoine-source-v2.png` is an original imagegen material swatch, used for restrained olive/bronze micro-pigment modulation. Its overlapping scale motif is not treated as fossil anatomy: the fine, non-overlapping rhombic relief comes from the authored normal map, informed by the scale descriptions in Giles et al. Living colours and soft tissues remain interpretations.

The original source image and editable project are preserved in `cambrian/local/devonian-authoring/cheirolepis/`. The generation prompt was:

> Use case: photorealistic-natural. Asset type: original albedo material source for a Blender reconstruction of the Devonian ray-finned fish Cheirolepis. Generate a square, edge-to-edge seamless macro swatch of fine living ganoine-covered fish skin: very small closely packed rhombic scales in subtly staggered diagonal rows, smooth enamel surfaces with extremely fine organic pores and modest irregular pigmentation. Muted olive, moss, warm grey and subdued bronze; low contrast overall. The scales are minute flattened diamond windows, not thick armour tiles. Uniform diffuse cross-polarized illumination, no baked shadows, no bright specular highlights, no depth perspective. Flat orthographic texture covering the entire image. Avoid animal silhouettes, eyes, fins, lettering, watermarks, large blotches, cracks, raised spines, hexagons and thick scale borders. This is an artistic material source, not a scientific reconstruction diagram.

## Final integration

Final full/LOD packaging preserved all geometry, numeric samples, weights, materials and sockets exactly. `eye-packaged-review.json` identifies the packaged hashes and fresh independent measurements. Both detail levels passed structural intake. The built main viewer loaded the specimen, all eighteen action selections retained paused state and accepted frame stepping, feeding poses were inspected, and no browser errors were recorded. The era integration checks and type/build checks passed; original Cambrian assets remain unchanged.

## Reference-led redesign reopened — 8 September 2026

The user supplied a new appearance reference. This model remains a preview pending that
redesign; previous evidence applies only to the preserved old files. See the species section
in `docs/devonian/refinement-queue.md` for concrete sculpt, eye, fin and material targets.
The image and copy/hash-verified model/source backup are under local/devonian-authoring.
Do not rerun the old builder into an existing candidate or treat old eye audits as approval
for future geometry. Finish the redesign before fresh general quality audits.

## Redesign sculpt study — 11 September 2026

`redesign-study.py` is a shape study for the reopened redesign, not a builder: it lofts the same
surfaces from two sets of profile tables and renders them side by side, so the silhouette can be
judged before anything is rebuilt. It exports nothing and publishes nothing.

What it proposes from `docs/reference/Cheirolepis.jpg`: a wedge snout in place of the rounded bead,
a straighter dorsal head profile over a fuller cheek, the eye larger and further forward and
higher, and all five fins redrawn as angular swept blades — convex leading edge, apex trailing
backwards, concave trailing edge — instead of rounded paddles. What it refuses from the reference:
the near-symmetrical fork. C. trailli is strongly epicercal and the cited sources settle that, so
the tail keeps its raised scaled axis and only gains drawn-out points and a deeper notch.

The eye is placed by measurement. `seating()` scores the globe against the head cross-sections
under one proxy measure; the redesign's larger, more anterior eye scores 0.684 against the current
model's 0.661, so moving it forward improves the seating rather than spending it. The proxy reads
low against the packaged audit (which measures the exported polyhedron against the closed head)
and is only good for comparing variants.

Nothing here is accepted geometry. A real rebuild still owes scales, teeth, throat, opercula,
materials, rig, all eighteen clips, the LOD and the full audit set.

## V3 candidate — 11 September 2026

`build_v3.py` is the redesign study carried into the real builder: V2 with the head profile, the
eye, the five fin outlines and the fin-tip bone replaced by the study's values and nothing else.
Run it with `/opt/blender/blender --background --python tools/devonian/creatures/cheirolepis/build_v3.py -- --skip-renders`;
it writes to `../devonian-authoring/cheirolepis/v3-candidate/` and never into V2's directory.

Evidence on the candidate: lossless packaging exact round-trip PASS (158,356 / 44,334 triangles,
18 / 3 clips), `tools/devonian/check.mjs` PASS, and the packaged eye audit
(`eye-audit-full-v3.json`, `eye-audit-lod-v3.json`) at 82.48% / 82.27% inside the continuous
head for the full model and 82.53% / 82.35% for the reduced one, against V2's 80.12% / 79.86%
and 79.99% / 79.72% — so the larger, more anterior eye seats better, as the study's proxy
predicted. Loop seams and the head-envelope manifold assertion pass inside the builder.

Not yet done: the user's acceptance, and the viewer / game-camera look that follows it. On
acceptance, `build.py` points at V3, the family is packaged into `public/assets/devonian/creatures/`,
and `validation.json` is regenerated from that build. V2 stays the shipped model until then.
