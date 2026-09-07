# Coccosteus clay-03 review and clay-04 exterior refinement

Astra high, 7 September 2026. Inspected all five actual clay-03 images and re-inspected the
supplied TUG 1817-152 reconstruction. Verified clay-03 blend SHA
`e88eacaeb7c64077430c0e5a322b5e1a21cabb234631a9ff8d32d998de57fc36` and render manifest SHA
`df7323b529f1288f9553706b0d17e0fe7b7147d70342940984aee5d7763e7a27`.

## Actual judgment

Preserve the clay-03 oral construction: the open study now shows a continuous palate and floor
without the previous central folded sheet or duplicated passage panels. The shared lip/collar
ownership is useful and should not be replaced. This component judgment does not approve the
whole rework or a production rig.

The exterior is still wrong for the requested reconstruction. Side and oblique views show a
long shallow pointed preoral rise. The front/dorsal images place the eyes close to the dorsal
midline. The head, thorax and soft abdomen have almost no visible structural distinction in
uniform clay. The reference has a much fuller curved muzzle/cheek, a lateral eye within that
mass, and broad cranial/thoracic plate curvature. It is neither a ray-like wedge nor a sphere
or a block sleeve.

The cause is concrete: the existing Hermite cranial surface starts from a thin pointed lip
with `startz = .72 * positive sin ...`, then rises gradually toward the collar. Its small cheek
fields do not create a full anterior flank. The eye ray at fixed Y=-1.49, Z=.112 samples this
narrow high section; it can land on the dorsal slope even though cast from the side. Casting
a side ray is not equivalent to choosing a lateral anatomical orbit.

## Bounded implemented correction

`clay-04.py` preserves the exact clay-03 baseline head and torso functions for its successful
inner surface. New external wrappers add a steeper smooth preoral rise, broader preorbital
shoulders and lower cheek mass, with a shallow curved cranial articulation and broad thoracic
roof/flank relief. All offsets vanish on the shared lip/collar boundaries. No independent
plates, new head cap, extra cheek wall or second throat passage is added. Posterior broad
shape, paired fins, dorsal and caudal remain as in clay-03.

The orbit is now authored at head-surface parameters t=.18 and angle=.90 / pi-.90. The actual
surface normal defines the globe depth axis and tangent plane. Its lateral component is
|normal.X| = 0.8409203. Surface sites are approximately X=±.2596500, Y=-1.5141687, Z=.0662618;
globe centers are X=±.2310587, Y=-1.5044265, Z=.0506533. The globe is inset 0.034 along this
normal. These are selected lateral orbital sites, not a high fixed-Z ray result. This is an
anatomical placement change, not a completed eye burial audit.

The canonical payload of all 12,289 oral vertices, their weights and 12,288 oral faces is
unchanged from clay-03, including the shared rim. Its SHA-256 is
`698be716534a6e5cf1a35c32d4946a0cbbfe45e2577dcee55664f280b91d9c79`.
The build and source checker assert that digest. Thus the proven oral geometry and study
motion are preserved numerically, not merely described as unchanged.

The source-only local checks passed again at the actual linear shape-key values 0, .5 and 1:
279 clear centerline segments, 288 inner-wall containment samples, 120 vertical oral sections,
positive triangle areas, joined edges, normalized weights and positive-width throat stations.
These are sampled local checks, not all-pairs collision or production audits. No Blender has
run for clay-04.

## Remaining art concerns / next judgment

The actual five fixed renders must establish that the front has enough mass and lateral orbit
separation without becoming globular, that the armour regions read in unpatterned clay without
a sleeve/step, and that the head is still appealing relative to the original fallback. The
new shallow articulation and broad plate relief may need further sculpt judgment; no material
pass should begin merely because topology checks pass. Check the same open mouth again despite
the preserved geometry, because the changed external mass and eye placement affect the image.

Keep preview. Source is frozen in HANDOFF-04.md for parent-assigned Terra build/five-view
execution. Preserve all earlier candidates and the named backup; no public/Git/shared changes.
