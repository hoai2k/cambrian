# Bothriolepis canadensis V3: first clay anatomy decision

Owner: Astra high. Scope: a completely new clay sculpture and six review views.
No old meshes are imported. All V1/V2 Blender sources, builders, GLBs, textures,
portraits and evidence remain untouched. This candidate is not approved for
production or public integration.

## Evidence inspected

- User appearance reference: `/Users/hoai/Downloads/Bothriolepis.jpeg`, also
  preserved under `../devonian-authoring/bothriolepis/user-reference/`.
  The image asks for a substantial textured anterior, articulated appendages
  projecting outward and backward, and a convincing narrow flexible posterior.
  It is art direction, not evidence for exact bones, proportions or pigmentation.
- Béchard, Arsenault, Cloutier & Kerr (2014), *The Devonian placoderm fish
  Bothriolepis canadensis revisited with three-dimensional digital imagery*,
  [doi:10.26879/417](https://doi.org/10.26879/417).
  Preserved PDF: `../devonian-authoring/bothriolepis/reference-417.pdf`.
  Visually inspected original figure 2 (p.5), schematic figure 3 (p.6),
  pectoral figure 5 (p.9), and articulation figure 7 (p.11).
  Read the corresponding cephalic, thoracic, pectoral and posterior descriptions.
  Figure raster intermediates remain local; none is a material or distributable asset.

## Reconciliation and frozen sculpture

The broad front is a cephalic/thoracic armour unit, with the head roof rising
steeply from the low snout and the thorax widening behind it. The thorax has a
convex roof, distinct dorsolateral keels, slightly concave sides, a flat ventral
floor and a posterior median crest. These are independently authored surface
controls, not a round ellipsoid or an old fish stretched to fit the illustration.
The clay's mid-thoracic height is approximately 16.5% of total length, close to
the paper's 15.25% measurement; the locally taller posterior crest is explicit.
Armour occupies 35.5% of the five-unit sculpture, consistent with the paper's
35.6% adult reconstruction. Minor proportions remain an artistic reconstruction
and must be judged in the actual orthographic views.

Small paired complete eyes are recessed directly into the sloping cephalic
roof. The clay uses a 0.024-unit recess against a 0.033 normal radius as an initial
design. This is not a volume-audit result. There are no stalks, separate eye pads
or applied rings. The head and thorax will remain rigidly bound together.

The mouth is toothless, small, and genuinely ventral. A bounded underside patch
is replaced by a continuous annulus that leads to an actual 0.286 by 0.182-unit
aperture. Its walls rise into a recessed vestibule and terminate in an internal
throat. No exterior face covers the opening, no Boolean is required, and no
oral ring collapses to a zero-radius quad. A shallow shape-key study moves only
the rear soft rim and adjacent walls; it does not turn the skull into a large
predatory jaw. The paper explicitly notes poor preservation/scanning of the
small oral bones (p.8); living oral soft tissue is interpretive.

Each pectoral begins at a shared, explicit lateral shell boundary. It has a
full proximal dermal segment and a narrower distal segment with a small recessed
joint transition. Figure 5 shows the broad proximal face in lateral aspect and
its thin dorsal aspect; this is represented by a vertically deep flattened
blade, not a generic horizontal fin membrane. The centerline is about 1.52 units,
or 30.4% total length (paper: 30.5%); the proximal share is approximately 64%
(paper: 63.6%). The neutral pose is deployed about 29 degrees outward from a
rearward line, with a gently bowed distal continuation and about 5 degrees of
downward attitude. This is a restrained visual interpretation, not a claim that
every motion limit in figure 7 applies independently at every deployment angle.
The paper's 70-degree protraction limit, maximum mobility near 16 degrees and
coupled movement limits must constrain the later rig. No walking or rowing
animation is justified. Fine marginal denticles and plate-specific pectoral
relief are intentionally deferred until the main form is accepted.

The flexible, scaleless posterior transitions from the shield into a narrower
muscular trunk, a single approximately square rayless dorsal fin, and a low
epichordal / deeper hypochordal caudal outline. Dorsal insertion is at 54.5% of
total length with a 7.9% length base, following p.12. Caudal membranes begin near
65.5% and occupy the last third. The eye-level side silhouette must confirm that
this reads as a living posterior, not a generic symmetrical fish tail. There are
no pelvic or anal fins. These details correct assumptions in the older README;
that historical README is preserved as-is.

## Surface construction and acceptance gate

`geometry_clay01.py` constructs a single continuous closed surface for the
shield, oral walls, trunk, median fins and pectorals. Every attachment consumes
an explicit full local boundary. It uses independently changing transverse
facets and shape-preserving longitudinal interpolation, with local seam
depressions in the shell. The fine clay relief is deliberately subtle and
procedural; final appearance requires a later anatomy-aware material phase.
The complete eyes are the only separate visible anatomical objects.

Accept only after viewing all six actual Blender clay images:

1. Front: deep faceted shoulders, steep central head, tiny inset eyes, bilateral
   pectoral root continuity. No mascot eye pads or flat pancake front.
2. Side: posterior crest and flat floor, continuous shield/body transition,
   muscular narrowing, characteristic caudal and square dorsal. Mouth stays ventral.
3. Dorsal: broad shield, clear outward/backward pectoral spread and smooth distal
   curvature. No straight-back rods or unsupported broad fin membranes.
4. Oblique: nuanced shoulder/head volume and convincing appendage roots without
   collar lumps, folds, surface inversion or decorative overlaps.
5. Underside: real oral aperture and attached oral rim; continuous pectoral roots.
6. Open-mouth close view: modest toothless gape, attached corners and a recessed
   internal termination, with no exterior cap concealing it.

Numerical topology PASS is required but cannot approve silhouette or anatomy.
Specific risks for the clay review: root transition pinching; pectoral section
orientation in oblique view; crest/body transition too abrupt; overly even
seam bands; oral annulus corners; inadequate apparent flexible-tail volume.
Any of these returns this candidate to Astra source authoring. Do not edit
source, choose a replacement directory, rig, export GLBs or run general eye/
creature audits merely because numerical checks pass.

Once this clay is accepted, author the anatomy-aware material treatment and
fine plate/denticle relief, approximately 28 appropriately placed joints,
18 individually performed game clips, anchors, full/LOD models and portraits.
That later phase needs a separate frozen handoff and actual review evidence.
