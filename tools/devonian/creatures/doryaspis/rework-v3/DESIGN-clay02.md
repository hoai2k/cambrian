# Doryaspis V3 — clay02

Second clay of the complete V3 rework. Clay01 was held: its opening read as a
conspicuous oval hole on the top/front of the head, its saw was a thin abrupt
attachment, its cornual plates were glued sheets, and the shield was a smooth
generic tube. Clay02 is a new sculpture answering the user's direction, not a
patch of clay01. Source: `geometry_clay02.py`, built by `build_clay02.py`,
reviewed by `render_clay02.py`, driven by `execute_clay02.py`.

## The direction, and what the geometry does about it

> "the mouth is at the very front instead of on top of his head. The saw
> sticking out to the front is like his lower jaw protrusion so yes it's above
> that. The front of body is like a snout, and the saw protrusion sticks out
> from the bottom jaw."

This supersedes clay01's reconciliation. Clay01's design note argued that the
2024 reconstruction places the jawless oral field above the fixed ventral
pseudorostrum and that a literal below-the-saw mouth was unsupported. That
argument was about *below*. The direction asked for is not below the saw — it
is a **terminal** mouth on the **front** of the animal, **above** the saw's
root, which is exactly the relationship the reconstruction supports. There is
no anatomical conflict left to reconcile, and clay02 implements it literally:

1. **The front of the body is a snout.** The shield does not taper to a point.
   It narrows over the forward 0.5 units into a short near-cylindrical muzzle
   and ends in a blunt rounded **front face** 0.45 wide and 0.33 tall — wide
   enough to carry an aperture with a rim all the way round it.
2. **The mouth is terminal and forward-facing.** A transverse ellipse is bored
   straight back along -Z through the middle of that face: lip half-width
   0.098, from y +0.065 down to y -0.038. It faces forward; it has no upward
   component anywhere; it never reaches the dorsal roof (0.16 above it) and
   never runs back into the shield. `build_clay02.py` asserts all three, by
   the bounds of the actual cut faces and the mean normal of the rim.
3. **It is a real chamber, not a dimple.** 0.44 deep, slightly wider inside
   (half-width 0.106) than at the lip, closing on a terminal wall at z = 1.00.
4. **The rim is smooth and continuous.** The cutter flares as it leaves the
   face, so the boolean rolls the lip instead of leaving a knife edge or the
   jagged rim clay01 showed in close-up. The flare opens upward and sideways
   only: its floor stays above the pseudorostral root, so the saw is never
   shaved by the boolean (clay02's first build did shave it; the section is
   now given independent top and bottom profiles for exactly that reason).
5. **The saw is a lower jaw.** The pseudorostrum's root is a broad mass buried
   in the ventral snout at z = 0.62 (half-width 0.270, half-thickness 0.100).
   The ventral line of the snout rises going forward while the saw's axis stays
   low, so the saw emerges from *underneath* around z = 1.00 and keeps going —
   a protruding chin that narrows into the denticled blade, not a spike glued
   to a nose. At the front face it is still 0.196 half-width against the
   snout's 0.224, and its root top sits 0.047 below the mouth's lower lip.
   Free length beyond the face is 1.30 units; nothing about the saw is
   shortened relative to clay01 or V2.

## The rest of the sculpt

- **Shield.** A low dome over a deep ventral bowl with a hard peripheral rim,
  not clay01's whale-like tube: the rim line sits at 62% of the section height,
  the dorsal exponent is sub-linear so the roof reads flat-topped, and both
  relax to round through the tail behind and the muzzle in front. Widest at
  z = 0 (half-width 0.800, 0.358 above the rim to 0.380 below). The rear edge
  is broadly rounded — the width is held out to z = -0.74 and then falls away
  in 0.4 units — so the carapace reads as the reference's oval rather than as a
  lens tapering evenly to a point at both ends.
- **Plate fields.** Sparse shallow sutures: a broad marginal band, a pair of
  longitudinal sutures bounding a central field, three short transverse ones
  and a rear pair. Modelled as depressions in the body volume (0.029 deep,
  sigma 0.030), not as separate armour objects and not a turtle hexagon
  lattice. One broad paired dorsal fullness either side of the keel.
- **Cornual plates.** Wide thick roots deep inside the shield, oval in section
  along most of their length — the chord collapses fast once they leave the
  shield edge so they read as horns rather than clay01's manta wings — sweeping
  out, hooking forward and turning gently down at the tips. Span 3.62, about
  1.4x the shield's length, matching the reference's proportion. Full length
  preserved; they are fixed armour, never hinged.
- **Caudal region.** Hypocercal with a substantial root. The body axis descends
  into a small ventral lobe under a larger dorsal web, and its lateral centre
  wanders so the posterior reads sinuous rather than straight.
- **Eyes.** Seated in flank orbits: the seat must have a lateral surface normal
  (the build asserts |n.x| > 0.55) and the globe is inset only as far as the
  visibility target needs — 0.014, for 67% embedded against a 65% target and a
  50% floor. Never buried to make a number look good.
- **Branchial recesses.** One small shallow recess per rear flank, independent
  of the mouth.

Coordinates are world **X lateral, Y up, +Z forward** throughout, which maps to
the shipped V2 Blender space by (x, y, z) -> (x, -z, y) and therefore equals
exported glTF coordinates. Total length 5.99 units; body 4.74.

## Acceptance gate

Ten views: six whole-specimen, plus an oral close-up, a front three-quarter, a
snout side and a straight-on mouth view. The gate is the direction: **the front
of the body must read as a snout with the mouth at its very front, above the
saw**. Also look for a knife-edged or jagged lip, a saw that reads as glued on
rather than grown from the lower front, cornual roots that read as abrupt
attachments, a shield too smooth to carry the reference's plate character, and
eyes sitting on the flank as discs rather than seated in orbits.

No materials, rig, clips, sockets, exports, audits, packaging, public mutation
or Git belong to this stage.
