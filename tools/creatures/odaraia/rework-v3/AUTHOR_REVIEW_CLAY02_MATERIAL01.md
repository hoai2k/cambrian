# Odaraia clay02 author acceptance and material01 study

8 September 2026. I independently inspected all six actual clay02 renders and accept the
**bounded coarse shape/framing gate**. This approval is bound to blend
`d5ec458053d58f45e5a0def15721485365449d1abee24ad75844fa9d38d9182c` and output manifest
`0222be3b7981649de1aa22028cbc7a00e4d54782f619957449bfcb452cec54a1`.

The side and oblique views now present a complete horizontal, legs-up animal. Bent endopods
read separately above the ovate paddles. The shell has a curved enclosing volume and a real
longitudinal channel. The paired supported eyes and three tail blades remain legible.
The front view is dense because 32 pairs superpose; that view alone cannot establish individual
limb clearance. View 06 is an intentionally isolated head/first-six-pairs study; attachment is
judged in full cutaway 05. This is not final sculpt, rig, eye-interface or production approval.

## Frozen material study

`material_study01.py` loads the accepted blend and changes only materials, shell margin
attributes, lighting/background and review cameras. A before/after position/topology/object-
transform hash must match. It does not regenerate or edit geometry.

Art direction: restrained olive-to-amber shell patches, copper/ochre body and limbs, warmer
amber paddles, darker fine filtering endites and deep teal eye surfaces. The coat is a rigid
cuticular surface, not cloth, luminous jelly or refractive glass. Broad low-contrast pigment
variation and very small bump relief give the surface an organic read without masking shape.

The shell blends clear coverage with a rough Principled surface: per-surface coverage is
0.18–0.25 in broad fields, increasing by up to 0.24 at the actual longitudinal and aperture
margins. The original shell thickness stays present, so two surface passages accumulate.
This is a **Cycles material study**, not measured fossil optical properties, and not a
Three.js export-ready shader. The future game material must bake/export equivalent colour,
roughness and opacity fields, then validate transparent depth ordering, shadows, silhouette,
background contrast and full/LOD consistency in the game renderer. No such validation is
claimed by these Blender images.

Six images: oblique/side/front against dark water; matching oblique/side plus anatomical
dorsal underside against light water. Camera orientation and fit follow accepted clay02.
World colour changes with the environment, while area lights and world strength remain fixed.

## Actual material gate

- The animal's trunk and some inner appendage organization are visible THROUGH the shell in
  both side views, rather than only through its existing open top.
- Valve margins remain legible against dark and light backgrounds. The shell still has
  solid curved volume; reject an almost-invisible sheet or an opaque painted cover.
- Broad colour fields support shell volume without camouflage blotches dominating it.
- Copper endopods remain visibly distinct from paddles and fine filtering branches.
- Transparency must not expose distracting internal shell doubling, dark black slabs,
  refractive warping or eye/support artifacts. If it does, return the actual evidence to author.
- No completed eye/attachment/rig audit is inferred from the material pass.

After this study: author inspect all six actual renders, then resolve production material
baking/export and the articulated rig. Motion direction is in ATTACK_EAT_RIG_DIRECTION.md.
Original backup, both user references, clay01 and clay02 remain preserved.
