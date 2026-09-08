# Onychodus rework v3: head and lower tusk design brief

Reference/design study, 2026-09-08. Ready for later individual authoring; no builder has been started. Species remains **Onychodus jandemarrai**. User reference: `/Users/hoai/Downloads/Onychodus.jpg`, inspected directly. Root owns preservation of that image and the central queue.

## Visual direction

Make the lower front tusks and the bony face the first two readable features. The supplied image communicates a broad, firm cheek, a layered cranial surface, an embedded lateral eye, a substantial lower jaw and bright tusks standing above smaller teeth. Adopt that hierarchy. Its large black seams, thick plate edges, uniformly conical marginal teeth and outward fan of front teeth are illustration choices, not an anatomical template. The blue palette is useful art direction; it is not evidence of living pigment.

## Evidence that constrains the redesign

**A. Original description.** The Gogo species has paired, laterally compressed parasymphysial whorls; adult whorls bear three large, unbarbed, sigmoidal tusks, juveniles more. Cranial bones overlap. The cheek includes a large maxilla, lachrymal, jugal, postorbital, squamosal and preopercular; no separate quadratojugal. Skull-roof landmarks include paired parietals, median interparietal and posterior postparietals. External bones carry variable small tubercles; cosmine is absent. These are dermal cranial bones in a sarcopterygian, not a placoderm head-and-thorax cuirass. The opercular is thin and rhombic. In section 17.1.2, Andrews/Long's active outrolling interpretation and Ahlberg's growth-related movement interpretation differ; feeding retraction is disputed. The jaw-opening musculature is also disputed in section 17.1.1. Figure 3's mounted whorl is explicitly described as too high. Use sections 1, 2.2-2.5, 3, 9.2-9.5, 12 and 17.1; figure 4 for the cranial map, figures 28-37 for whorls. [Andrews et al., 2006, volume 96, pp. 197-307, author-uploaded full text](https://www.researchgate.net/publication/213769142_The_structure_of_the_sarcopterygian_Onychodus_jandemarrai_n_sp_from_Gogo_Western_Australia_with_a_functional_interpretation_of_the_skeleton).

**B. Oral spatial relationships.** Figures 3-5 show crescent bases carrying the tusks at the front of the mandible, with new teeth posteriorly and shedding anteriorly. They are distinct from the dentary tooth row. Figures 6-7 distinguish the outer upper dentition from the inner dermopalatine series, with mandibular teeth fitting between upper rows. Figure 8 shows paired receiving spaces beside a median ethmoid; vomers are absent. The proposed cartilaginous jaw guide and active whorl movement are interpretations. These oral figures were visually inspected in the local PDF, printed pp. 372-374. [Campbell & Barwick, 2006, figures 3-8](https://ijdb.ehu.eus/article/pdf/052125kc).

**C. Later CT evidence.** A scanned O. jandemarrai whorl has five fangs, with smaller denticles along both sides; teeth and denticles are fused to whorl bone. Anterior bone resorption and posterior addition explain replacement through growth. This supports a rigid dental base and distinguishes replacement from a second-by-second feeding animation. Do not propagate the old builder's unqualified description of the entire base as cartilage. Figure 5 and sections 3.2/4 were checked, including the rendered CT figure. [Doeland et al., 2019, Tooth replacement in early sarcopterygians](https://researchnow-admin.flinders.edu.au/ws/portalfiles/portal/120493779/Doeland_Tooth_P2019.pdf).

## Current source implications

Read-only inspection of `../build.py` shows the existing continuous procedural head, 22 teeth per marginal row, 13 inner upper teeth per side, four large tusks on each narrow tubular crescent, and a four-degree whorl adjustment. The paired receiving depressions, hinged jaw and posterior lumen already express useful intentions. They do not establish a finished v3 shape or certify clearance. No old model audit or new render was performed for this study.

## Concrete authoring targets

The numerical ranges below are initial **art/engineering targets**, not fossil measurements. Let H be head length, measured consistently from snout tip to the posterior opercular edge. Record final values in the new authoring state.

| Region | New design target | Reject when |
|---|---|---|
| Head mass | Start with an independent clay head and jaw. Give the cheek and snout deliberate planes with soft transitions, a firm jaw rim and an eye embedded within the contour. Keep clear space above the planned oral volume. | Head becomes an inflated tube, eye sits on a surface marble, or a heavy brow hides its lateral placement. |
| Cranial surface | Map the landmarks in evidence A before relief. Use shallow boundary depressions, feathered overlaps and subtle regional convexity. Initial relief 0.002-0.006 H; seam width around 0.002 H, reduced if it reads as a crack. | Random polygon tiles, deep black grooves, thick stone slabs or a continuous shoulder armor ring dominate the face. |
| Lower tusk assemblies | Author two separate, laterally flattened crescent bases and their rigid teeth. Use the adult condition in A as the default. Start major exposed crown height at 0.12-0.18 H and ordinary tooth height at 0.025-0.045 H, then reconcile with oral fit and specimen proportions. Build a three-dimensional curved crown profile; the large teeth must remain distinguishable in silhouette. | The bases are round ropes, teeth grow from the outside of the chin, the two assemblies merge into one central fan, or the main tusks look like enlarged marginal cones. |
| Oral floor and roof | Sculpt visible gum transitions around rigid bases. Reserve receiving volumes before finishing the snout. Continue the oral floor into a narrowing throat with a curved depth path. | Teeth float, gums become a large tongue pad, receiving spaces exit the forehead, or a camera-facing flat plug closes the throat. |
| Other teeth | Use separate labeled geometry groups for each dental region in B. Give crowns restrained variation and purposeful offset so the rows can close. | A uniform zipper of copied teeth erases the distinction between oral regions. |

## Resting mouth, gape and rig

Solve a closed anatomical rest pose first. Pose a modest 8-12 degree presentation gape separately if it best reveals the defining tusks; it must not compensate for an impossible closure. Start the functional gape study at 0, 10, 20, 30 and 40 degrees, stopping earlier if the sculpt requires it. These are review poses, not claims about maximum biological gape.

Keep the rigid tusk/base groups parented to the lower jaw. Initially lock their relative motion. Preserve separate controls so a later explicitly interpreted 0-4 degree adjustment can be compared, but do not copy the previous animation automatically. Never animate tooth replacement as a conveyor or cycle it during a bite. Place the jaw control at the posterior articulation region, not at the mouth center. A single hinge is a production simplification; it does not settle the disputed biological mechanism.

Reserve independent opercular and soft throat motion. Keep skull-surface patches rigid with their anatomical region; jaw opening must not stretch their seams into rubber. Any skull elevation, small expansion or coupled whorl adjustment must be documented as an animation choice, with geometry checks on the resulting combined pose.

Define clearance as **surface-to-surface**, not tip-only distance. At every sampled pose, test every large crown against the roof, snout shell, lips, other teeth and opposite whorl. Initial engineering margin: at least 0.002 H or twice the measured export/LOD surface error, whichever is larger. Increase it where antialiasing or interpolation reveals contact. Use a swept-path test or dense sampling through the near-closed interval; endpoints alone are inadequate. A tooth must enter its intended receiving volume without passing through its wall. Recheck after any tooth scaling, jaw pivot change, weighting, export or reduction.

## Materials and visual acceptance

Use muted blue/slate over the face and dorsal surface, softer blue-green/gray toward the flank, and a paler ventral region as an original interpretation of the supplied image. Start body roughness near 0.45-0.60 and oral roughness near 0.25-0.40; adjust under neutral light. Ivory tusks should read against a dark, desaturated mouth without emission or a chalk-white outline. Add modest crown variation and fine lengthwise detail only after silhouettes succeed.

Use small-scale surface variation over larger bony forms. Let head/body texture frequency change at the opercular region without a sudden color seam. Keep damp highlights broad and controlled. Inspect the clay, flat color and final material separately so lighting cannot conceal poor structure.

The later authoring review must show:

1. Matched reference-angle, frontal three-quarter, true lateral, dorsal and ventral head views at rest and presentation gape. The lower assemblies must read as a pair in the frontal view and remain the dental focal point in the reference-angle view.
2. A closed-mouth section through each receiving volume, an internal oblique oral view, and sampled intermediate closure poses with clearance results.
3. A grayscale 256 px head crop where main tusks remain distinguishable, and a wider body view confirming the redesigned head belongs to the specimen.
4. Clay and neutral-light material renders proving coherent facial planes, restrained boundaries, clean eye embedding and continuous soft tissue.
5. Once authored, actual exported full/LOD models through complete relevant clips, including interpolated closure and the smallest delivered portrait. Source-scene success alone is insufficient.

## Exact next step

When the central queue reaches this animal, the individual author should first save a v3 head/oral blockout in `../devonian-authoring/onychodus/rework-v3/`, with labeled dental groups and a skeletal cranial boundary overlay. Retrieve/visually inspect Andrews figure 4 before locking exact boundary curves: its caption and full anatomical text were read here, but the figure image endpoint failed. This is a precise remaining source check, not permission to invent the seams. Establish the paired receiving volumes and closed rest pose before high-resolution surface sculpting, materials, full rigging or public export. Preserve all earlier `.blend`, `.blend1`, source and candidate outputs.
