# Odaraia full rework — preproduction brief

Queued, not sculpted or approved. Read `docs/cambrian/refinement-queue.md` for the user request,
backup, preview status and delivery requirements. Original public assets remain the fallback.
Reference: `local/expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-2026-09-07.png`
(relative to the top-level cambrian repository directory, not this expansion checkout).

## Evidence consulted on 7 September 2026

The [ROM species account](https://burgess-shale.rom.on.ca/fossils/odaraia-alata/) describes valves
wrapping to meet ventrally, open anterior/posterior ends, about 47 limb-bearing segments,
biramous limbs, large paired eyes, possible three smaller frontal organs, and three tail blades.
Its inverted swimming posture is a proposed interpretation, not direct observation of motion.
The old shared builder follows this account; its geometry is not a shape authority.

The [2024 primary paper abstract and figure-caption search result](https://pmc.ncbi.nlm.nih.gov/articles/PMC11463219/)
by Izquierdo-López and Caron describes toothed mandibles, a hypostome, maxillae and possible
paragnaths. Spinose limb endites support a suspension-feeding interpretation. This supersedes
an undifferentiated generic mouth on the new model. The paper calls the enclosing carapace
tubular and the tail rudder-like. The full publisher page failed to load and direct PMC opening
returned a browser check, so the full paper/figures have NOT been reviewed yet. DOI:
[10.1098/rspb.2024.0622](https://doi.org/10.1098/rspb.2024.0622).

## Creative interpretation to develop

The user's coat comparison calls for organic shell shaping and a visible open margin; it does
not require removing the protective enclosure. Model two curved valve fields continuous around
the dorsal region, with changing cross-section, subtle relief, flared anterior lips, narrow ventral
separation and a shaped posterior aperture. A biologically enclosing carapace can still look
completely different from a constant-radius extruded cylinder. Judge the three-dimensional
silhouette from side, front, dorsal and oblique views before pigment or transparency masks it.

Inside, give the segmented trunk depth and taper, orderly paired biramous limbs with fine
filtering structures, a distinct head and supported prominent eyes. The tail must remain an
articulated continuation with three separate steering blades. Do not substitute antennae or
large grasping claws from a generic shrimp template. Exact mouthpart arrangement, small frontal
organs and appendage details need the later author's primary figure review before freezing.

Semi-transparency and olive/orange pigmentation are art direction, not fossil-derived colour
or a measured shell optical property. Build restrained shell thickness and broad pigment
variation so the many limbs can be glimpsed through the coat while its edge remains legible.
Test overlapping shell surfaces, moving limbs and tail against bright/dark water in the actual
Three.js renderer and LOD, where transparency sorting can differ from Blender. Keep the old
model and full named backup until the new result is demonstrably better.

## Later authoring phases

An individual Astra-high author owns anatomy, custom Blender sculpt, materials and action design;
Terra-medium runs frozen scripts and returns actual renders. Sources and editable blend go under
this creature's own rework directories, never a broad shared-builder batch that rewrites other
Cambrian animals. Retain original clips/anchors, then provide dynamic metachronal limb beats,
tail steering/braking and expressive feeding motion with distinct timing. Avoid bending a rigid
shell like cloth merely because the reference is described as a coat. Audit eyes, attachments,
clearance and action extremes after the completed rework, including anatomical eye support
rather than burying stalks in the shell. The queued preview label remains until final acceptance.

## Second reference — inverted pose and visible limbs

The user additionally supplied `/Users/hoai/Downloads/Odaraia2.jpeg`, preserved as
`local/expansion-authoring/odaraia-rework/user-reference/odaraia-user-reference-02-2026-09-07.jpeg`.
Use both references together. The chosen normal swimming presentation is inverted, with the legs
pointing upward as in this second image. Establish this in the authored rest pose and validate
orientation, steering, action directions and anchors in the game rather than applying an
unreviewed viewer-only rotation.

Sculpt the covering as a real curved shell: organic convex valve surfaces, tapered/flared margins,
a shaped front opening and variation in thickness and section. Preserve the first image's
semi-transparent coat impression. Keep the segmented trunk and numerous paired appendages
legible above/through the shell. Make the articulated limbs more prominent in silhouette and
motion; coordinate staggered swimming beats with clearly readable attack reaches/sweeps,
recovery and withdrawal without passing through the shell or hiding inside it. Preserve fine
filtering branches and avoid replacing the limbs with oversized generic claws. Attack motion
is a game interpretation, not a claim of fossil evidence for predatory limb use.

Review the inverted silhouette from the game's camera, including reduced-model limb readability,
shell transparency/depth ordering and action extremes. Keep both references and the original
model backup; the current model stays preview until replacement acceptance.

## Superseding clay01 source freeze — 7 September 2026

The later focused primary review is now complete: actual Figures 1,2,3,4,6 and both user images
were inspected. See `ANATOMY_SHAPE_BRIEF.md` for updated decisions; the older evidence-status
paragraphs above are historical. The 2024 count of 30–35 segments supersedes the older ROM ~47
for this proposal: clay01 has 32 paired biramous limbs. `HASHED_HANDOFF.md` freezes a new custom
geometry/render source. It is not executed, visually reviewed or approved yet. Original fallback
assets remain untouched; production transparency, actions, rig/LOD, anchors and audits follow
the actual six-view clay gate.
