# Author clay01 review and bounded clay02 plan

Status 2026-09-07: clay01 rejected; clay02 SOURCE frozen for later resumption, not executed.
User requested saving current refinements and pausing. Do not run the next group until resumed.

I independently inspected all six actual clay01 images and reference 2 again. This review is
bound to clay01 manifest `97288757eb541cb67aade38ed6be1e55b52700e662bedf826d69118edb2cc1d7`
and blend `5dfb9ac4c4544dd22f08db8b70d84c96513d24022057193037040497b5f30122`.
I agree with the root review: closed-mesh hygiene does not establish a successful animal.

- All whole-animal images incorrectly put the long axis nearly vertical. Side crops head and
  tail; other views touch or clip ends. The quaternion used Blender's normal world-Z roll
  behavior. Actual vertex coordinates remain correctly inverted in game coordinates.
- Paddle faces have a maximum width larger than their longitudinal row spacing. Their tips
  form a uniform envelope; the endopods are little taller. This produces two comb walls, even
  in the cutaway, rather than the separate articulated upper limbs seen in reference 2.
- The shell has improved convex surfaces and tapered margins. Preserve it for a fair review
  after fixing orientation; do not reshape it based on misleading camera presentation.
- Eye globe supports end as blunt flares. A genuine posterior cup belongs in the design;
  further development and the full volume/interface audit remain later work.

## Bounded clay02 source changes

`build_clay02.py` is a new self-contained source; clay01 stays preserved. The camera explicitly
constructs an orthonormal basis with image-up equal to projected world +Y. Every visible vertex
is projected on that basis; Blender's own `view_frame` supplies orthographic span conventions.
The camera is recentered and both dimensions fit with 12% total spare span. A report records
all six normalized bounds and fails below the authored margin. No animal transform is changed.

32 limb pairs and 20 endopod intervals remain. Narrower ovate paddles have clearer longitudinal
gaps and sweep back while retaining substantial length. Endopods now have a raised, bent distal
portion above the paddle envelope, slightly stronger shafts, phased reach and staggered left/
right rest articulation. These are pose/readability interpretations, not revised fossil counts
or claims of observed predatory attacks. The filtering endites remain present.

Each short eye peduncle now continues through a shaped outer cup, rounded lip and recessed
inner surface around the rear globe. This is authored geometry, not an audit certificate.
The shell, trunk, mouth and tail keep their clay01 geometry for this bounded comparison.

Six views: complete inverted oblique, side, front, dorsal underside and half-shell cutaway;
then an isolated complete head/first-six-limb-pairs study. The last view deliberately omits
shell, posterior trunk and tail to reveal appendages, and is labelled as an isolated study in
the report. Its selected anatomy is framed fully. Body/root relationships must be judged from
the full cutaway, not inferred from the isolated plate.

## Remaining actual review criteria, in order

1. Verify horizontal normal swimming silhouette and legs +Y/up in side/oblique, head +Z;
   no clipped eyes, tail blades, shell edge or limb tip in any complete-animal view.
2. See numerous individual bent endopod silhouettes above separated ovate paddles. Dense
   filter spines may interlock, but the primary limb shafts must remain recognizable.
3. Check shell anterior flare, open ventral channel and head/limb clearance in corrected views.
   Preserve rigid protective character and variable coat-like margin; reject a cylindrical read.
4. Inspect eye cup/head continuity and cup/globe seating without exposed recesses or floating
   globes. Full rig/material/volume audit remains after the completed rework, not this source.
5. Verify three tail blades and continuously segmented exposed posterior trunk remain legible.
6. Only after explicit hash-bound actual clay acceptance may production translucency, 18 dynamic
   actions (Moult, not Growth), full/LOD skeletons, anchors, exports, portraits and audits proceed.

No Blender, material/rig build, export, public asset mutation or Git action performed for clay02.
