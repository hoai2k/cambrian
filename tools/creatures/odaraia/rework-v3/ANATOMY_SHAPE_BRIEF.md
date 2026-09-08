# Odaraia V3 — clay 01 frozen authorship

Owner: Astra high. Stage: geometry proposal only; actual Blender evidence still required.

## Source review completed

Both user images were visually inspected. Reference 1 supplies the protective, organically
shaped translucent shell, prominent eyes and dense appendages. Reference 2 supplies the inverted
normal presentation and conspicuous upward limb silhouettes. Neither proves colour or optical
properties. Primary study: Izquierdo-López & Caron (2024), DOI
[10.1098/rspb.2024.0622](https://doi.org/10.1098/rspb.2024.0622),
[PMC full paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11463219/).
The primary HTML and figure plates are preserved in the local authoring `primary-2024` folder.
I visually inspected Figures 1 (specimens/head positions), 2 (limbs), 3 (mouthparts),
4 (anatomical reconstruction) and 6 (life reconstruction). Figure 5 is saved but not used as shape
evidence. Figure 6 is also the source artwork underlying user reference 1 in another orientation.
These are research references, not textures or geometry to redistribute as game assets.

The updated study describes 30–35 trunk segments, each with one biramous limb pair. Therefore
this clay uses **32 pairs**, superseding the older ROM account's approximately 47 segments.
Endopods have 19–20 podomeres; the clay has 20 articulated surface intervals with shortened
proximal intervals. The ovate exopod is roughly as long as the endopod and contains a rod and
lamellar structure. Spinose endites form a dense suspension-feeding mesh. Mandibles have a
medial toothed edge; the anterior triangular plate is a hypostome/labrum complex. Figures 3–4
support a separate small central tooth and probable posterior lobes. Maxillae are likely,
but their precise insertion and relationship to adjacent structures remain uncertain.
Short eye peduncles project anterolaterally; three small frontal sensory organs are retained
as restrained dorsal-head bumps, with no claim of a distinct ocular-sclerite boundary.
No antennae or generic shrimp claws are added. Tail has two lateral blades and an anatomical
dorsal blade; in the inverted game rest pose the dorsal blade points DOWN.

## Designed surface relationships

- Game coordinates are baked directly into vertices: head +Z, tail −Z, ventral limbs +Y,
  anatomical dorsal surface −Y. Every object has positive unit scale; there is no whole-animal
  transform used to invert it. Camera changes do not define anatomy.
- Trunk is a continuously lofted tapered volume, with 32 shallow tergal ridges and narrowed
  intersegment regions. A deep anterior thorax tapers into the exposed posterior trunk.
  Separate smooth beads or repeated torus segments are not the body silhouette.
- The rigid coat is a single continuous U-shaped thick shell with no dorsal hinge seam.
  Left/right valve fields share the lower dorsal surface. Its section swells centrally,
  narrows to the rear, and flares around the head; anterior and posterior boundaries bow
  independently as they approach the open ventral margins. Both openings stay real holes.
  Ventral margins make a curved longitudinal channel. The shell is thicker at its rim,
  subtly raised along growth arcs, and never a constant-radius extrusion.
- Limb roots emerge from the ventrolateral trunk INSIDE that channel. Their continuous,
  curved endopods rise through its opening and lean forward in a staggered resting rhythm.
  Front five pairs have a slightly longer reach, an art choice reserved for game gestures.
  Rami remain fine filtering appendages, not pincers. Ovate paddles and small filter spines
  give each limb an identifiable biramous organization in close-up.
- Head is a compact, broad sculpted volume visible beyond the front rim. Two short tapered
  peduncles grow out anterolaterally into widened globe supports; compound-eye globes seat
  into those supports. Supports are anatomical stalk housings, not shell eye sockets.
- Mouthparts sit ventrally (+Y): triangular hypostome anterior to inward-facing mandibles,
  tiny central tooth and posterior lobes; slender tentative maxillary brushes lie behind.
  Clay includes these spatial masses, not a claim of resolved fossil-soft anatomy.
- Three tail blades continue a narrowed terminal segment with thick root-to-thin-edge lofts.
  They are not three generic triangles glued to a body tip.

## Art choices and limits

Absolute proportions, changing valve curvature, limb reach amplitude, rest-phase offsets,
head soft-volume transitions, shell thickness, pigmentation and transparency are interpretation.
The clay uses opaque neutral materials to expose surface quality and a geometric half-shell
cutaway to expose organization. This is NOT the promised production semi-transparent material.
The completed stage must later develop translucent shell rendering in Blender AND Three.js,
including LOD sorting against light/dark backgrounds. Rigid valves will not flap like cloth.

The first clay is deliberately static. Attack reaches/sweeps/recovery will be game expression,
not an assertion that Odaraia hunted by striking with legs. Suspension feeding remains the
anatomical basis. Full production requires 18 dynamic action clips (including **Moult**, not
Growth), full/LOD skeleton parity, anchors, tail/limb clearance, portraits, and post-rework eye
and general creature audits. No old audit is inherited.

## Six-view clay gate

1. Normal inverted oblique: attractive whole-animal silhouette, shell volumes and eyes.
2. Inverted side: variable front/back margins, exposed posterior trunk, numerous upper limbs.
3. Inverted front: genuine top channel, two supported eyes and leg exits through the channel.
4. Anatomical dorsal underside: continuous lower shell, front/rear openings and three blades.
5. Half-shell cutaway: internal segmented body and consistent paired limb attachment.
6. Appendage/head close-up cutaway: 20-interval curved limbs, ovate exopods, spines and mouth.

Reject if it reads as a cylinder, hides nearly all legs, looks like primitive beads, has floating
stalk/globe interfaces, loses three tail blades, has upside-down world transforms, or requires
transparency to disguise crude geometry. Automated closed-mesh/area/finite checks are bounded
source hygiene only. Actual surface and collision judgment belongs to the author after renders.
