# Coccosteus clay-02 diagnosis and bounded clay-03 proposal

Owner: Astra high. Date: 7 September 2026. Diagnostic checkpoint only: **no clay-03 source has
been authored and no Blender command has been run by this agent**.

Reviewed all five actual clay-02 images: side, front, dorsal, oblique and mouth-open.
Verified the recorded files locally:

- Blend: `84df86a28328f7c723f7cfea3595b93c5ebd4efa32b5b5e80b17d8744351e1be`
- Render manifest: `0ce1c198bf927dd2cc22e3231affcf23497c8cfde9c015ddb0a3c54966490334`
- Source clay-02.py: `a0813a5b6210eec66f0bd57b5098dd023d798209153a732648a00f5fb6e58380`

**Reject clay-02 as a production or material-ready form.** Preserve it as evidence. It improves
posterior curvature, fin sweep and framing, but does not meet the anterior anatomy or oral gate.
The original model and named backup remain the fallback.

## What the images establish

The body is no longer a longitudinal prism. The rising peduncle, asymmetric caudal, low dorsal
and restrained paired fins are useful directions to retain. The dorsal framing is now complete.

The anterior is still a smooth cone-shaped hood, with little lower cheek differentiation and
no meaningful three-dimensional plate hierarchy. In front view the torso forms a second arch
behind that hood. In side/oblique views the posterior head edge exposes a hard step/slice rather
than a narrow living articulation. The underside also has a stationary gular ledge behind the
jaw. Those surfaces are inconsistent, not just insufficiently textured.

The open mouth has large dark crossing panels through the middle and rear of the cavity.
The anterior lip is substantially better than clay-01 but still shows small steps. The open
image is sufficient to reject the construction; a colour change cannot make it anatomically
coherent. No claim is made that every visible pixel has been assigned to one exact triangle
without an object-ID/section render.

## Concrete source diagnosis

### 1. The lower oral lining collapses into a central sheet — confirmed numerically

`oral_point` in clay-02.py (line 223) samples the lower mouth from `JAW`. Its Y is clamped to
JAW's final row at **Y = -0.89**, where width is zero. That endpoint is reasonable as a closed
rigid mandibular tip behind the cup, but it is not a valid pharyngeal floor profile.
`oral_build` (line 236) continues sampling this clamped row to **Y = -0.36**.

A source-only reconstruction of the exact sleeve arrays, without bpy or Blender, confirms
**1,890 quads lie wholly on X = 0**, between **Y = -0.8821311475 and -0.36**. Their Z values still
vary with the angular parameter, so the posterior lower half becomes a folded sagittal sheet,
not a floor. Merely checking finite coordinates and two-face edge incidence does not detect
this failure. The final 112-vertex ring contains only 85 distinct positions to 12 decimals.

The upper/lower ring side positions demonstrate the mismatch:

| Y | Upper side X | Lower side X |
| --- | ---: | ---: |
| -1.17 | 0.422000 | 0.413000 |
| -1.00 | 0.432552 | 0.324000 |
| -0.94 | 0.432352 | 0.172187 |
| -0.905 | 0.429848 | 0.047732 |
| -0.89 | 0.428464 | 0.000000 |
| -0.80 | 0.424000 | 0.000000 |

This is a direct mechanism for a large central panel in the mouth, independent of shading.
Fixing it requires a positive-width soft floor behind the mandible, not extending or hiding
the rigid jaw or adding another lining.

### 2. Two separately owned passages overlap and move differently

`rings_mesh(... front_tunnel=True)` builds an annular torso rim plus a fixed 38-ring inner
passage from **Y = -0.905 to -0.285**. `oral_build` independently constructs a moving 62-ring
passage from **Y = -1.27 to -0.36**, with different shrink and motion fields. Both occupy the
same anatomical throat. They are not shared boundary vertices. Opening the mouth deforms one
against the stationary other. A clean lumen cannot be inferred from either mesh being closed.

The separate cheek object is a third independently sampled surface. Its edge trajectories
are copied from head/jaw equations but its boundary vertex indices are not shared with them.
It does not repair the passage ownership conflict.

### 3. The external neck and closure ownership is inconsistent

HEAD ends at **Y = -0.84**, TORSO starts at **Y = -0.905**, and JAW ends at **Y = -0.89**.
The head is rotated as a rigid body against the fixed torso, but their outer contours differ
markedly at cheek height and overlap for 0.065 Y units. The rear head cap, front torso annulus
and cheek ends do not share a neck ring or compatible deformation field. This accounts for
the exposed rear-head cuts, secondary torso arch and lower gular ledge.

A precision correction to the initial root hypothesis: the head rear n-gon in `rings_mesh`
(line 199) is **planar in rest** (all vertices have Y = -0.84), and rigid cranial rotation keeps
it planar. It is concave and an independently triangulated closure in an overlapping region;
it should not survive the next boundary construction. Its nonplanarity is not the proven bug.
The confirmed central-sheet bug and duplicate lumen are stronger explanations for the large
oral panels. An arbitrary triangulation replacement alone would leave those failures intact.

### 4. Anatomy was under-authored after removing clay-01 facets

`head_point` largely raises one smooth transverse arch along a tapering width profile. Its
orbital and cranial corrections are too weak to produce a substantial cheek, distinct brow
transition and broad plate curvature. `torso_point` supplies only small oval corrections and a
0.004-unit shallow seam. It is smooth, but the armour identity does not survive the clay view.
The next anterior must be shaped with separate anatomical surface regions sharing boundaries,
not the same cone plus stronger seams or a return to the universal polygon section.

## Bounded clay-03 correction

Scope: one new immutable anterior/body-junction sculpt source and review configuration. Retain
the clay-02 posterior silhouette, low dorsal and paired-fin broad shape from approximately
Y = +0.25 rearward. Do not redo old comparisons, change colours, add texture maps, build final
rig/actions, export GLB, audit eyes, package or touch public/shared/Git state.

### Surface ownership before detailed shape

Construct **one continuous external tissue boundary and one continuous oral boundary joined at
a canonical lip loop**. The palate, oral floor, cheek interiors and pharynx are regions of that
same oral surface, with shared boundary vertices and motion weights. There is exactly one
posterior lumen. Remove both clay-02 passage builders and their mouth-region closure logic.

| Region | Boundary/ownership rule |
| --- | --- |
| Upper lip and palate | Same ordered rim vertices as the cranial exterior; palate runs backward into the single throat surface. No independently capped head disk across the neck. |
| Lower lip and oral floor | Same ordered rim vertices as the mandibular exterior. Behind the rigid cup, the soft floor retains positive transverse width and joins the throat. It never samples a zero-width jaw endpoint. |
| Mouth corners and cheeks | Upper/lower lip branches meet at finite shared commissures. Curved cheek boundaries share vertices with exterior and oral surfaces, with no added cover panels. |
| Head-to-thorax neck | A canonical outer collar ring joins the sculpted cranium/cheek/gular region to the thorax. A narrow compliant transition carries a shared skull-to-body weight field. No overlapped head cap and torso sleeve. |
| Posterior pharynx | One independently authored positive-width soft-tissue ring sequence closes at a small rounded terminal pole behind the visible chamber. Upper/lower halves taper together. No broad n-gon or second inner tube. |

The existing rigid jaw closure must not define posterior throat dimensions. Keep a slender
mandibular cup region; transition its floor smoothly to soft pharynx before its rigid end.
The outer gular tissue should connect beneath this soft floor, without a stationary flange
projecting under the moving jaw. Face regions and vertex groups can preserve editability and
later rigid/soft rig ownership within the connected construction.

### Anatomical anterior shape

Use explicitly controlled surface regions with compatible tangents: broad modestly rounded
muzzle, a sloping cranial roof, recessed orbital transition, substantial convex cheek below
and behind the eye, and the posterior cranial/neck transition. The cheek must carry thickness
rather than terminating as the lower edge of a hood. Broad armour curvature should come from
these volumes, not plate stickers, drawn trenches, or one universally faceted radial function.

Shape the thorax with a low dorsal crest, broad sloping dorsolateral plate curvature and a
firmer lower side region around the pectoral root. Ease those surfaces into the retained soft
abdomen. The clay gate must show that distinction before microtexture or pigment is added.
Do not disturb the already improved posterior to compensate for an under-sculpted front.

### Local authoring checks before execution

- Shared boundary positions **and motion weights** must agree by construction, and stay joined
  at rest, half gape and full study gape.
- Every interior ring except the final pole has positive left/right width and a simple
  non-self-crossing outline. In particular, no posterior floor faces may collapse into X = 0.
- No duplicate independent interior surface, rear-head mouth cap, or torso throat cap remains.
- Check finite geometry, sensible local face areas/orientation and actual collar adjacency.
  Topological edge counts alone are insufficient; the clay-02 diagnosis demonstrates why.
- Inspect the designed lumen along several anterior-to-posterior sight paths and sample the
  opened configuration for intersecting non-neighbour mouth faces. These are local authoring
  integrity checks, not a substitute for the later complete production audits.

### Execution/review boundary to freeze after authoring

New exclusive output directory: `../devonian-authoring/coccosteus/rework-v3/clay-03/`.
New source and view config get new filenames and hashes. Expected next review: four fixed
body views, matching mouth-rest and mouth-open close views, plus one explanatory sagittal
section image identifying the single lumen if needed to make the new topology reviewable.
Any diagnostic section is an inspection render only, never saved as the deliverable model.
The corrected dorsal framing is retained. Freeze exact build/render commands and stop rules
for parent-assigned Terra medium after source authoring; do not execute Blender in Astra.

Limit the next source pass to this anterior/neck/oral correction. Stop after actual clay-03
images for Astra judgment, or earlier on a topology/ownership ambiguity. Preserve clay-02 and
the original fallback. This diagnostic checkpoint itself authorizes no automatic publication.
