# Root review — Coccosteus clay-02

All five actual PNGs inspected. Blend SHA:
`84df86a28328f7c723f7cfea3595b93c5ebd4efa32b5b5e80b17d8744351e1be`.
Manifest SHA: `0ce1c198bf927dd2cc22e3231affcf23497c8cfde9c015ddb0a3c54966490334`.
Build/render execution passed. **Not accepted as production form.**

The broad body and fins improve on clay01: no ridged prism, block sleeve or fin-tip hooks.
Full-animal dorsal framing now works. However, the smooth conical helmet has little anatomical
armour differentiation, and its interface with the thorax retains hard steps and sliced seams.
The open-mouth study reveals large intersecting black triangular panels through the cavity;
resting lip also retains small steps. These require actual geometry correction, not material work.

Initial source inspection suggested incompatible closures: `rings_mesh` caps the head's final
ring with an n-gon; `front_tunnel` adds a separate torso passage, and `oral_build` independently
builds another lining plus cheeks. HEAD ends at Y -0.84, TORSO starts at -0.905 and JAW terminates
at -0.89. Moving and stationary closures may overlap/triangulate across the aperture. The author verified that this cap is concave but PLANAR,
correcting the initial root hypothesis about nonplanarity. The confirmed main failure is more
specific: oral_point clamps the lower ring to the zero-width JAW endpoint for Y >= -0.89.
1,890 oral_build quads from Y -0.882 to -0.36 then lie on X=0, collapsing the floor into a
sagittal sheet. The duplicate fixed torso tunnel is also confirmed. The author is correcting
this under a single-boundary oral/neck ownership plan.

Astra was asked to independently review the five actual images and provide a bounded diagnosis/
correction proposal before authoring another pass. Establish single consistent oral and neck
boundary ownership; avoid adding more independent lining patches over the current problem.
Retain useful posterior/fin proportions while sculpting a more anatomical cranial/cheek volume.
Preserve clay02 and the old backup. Deferred complete-rework eye/general audits remain later.
