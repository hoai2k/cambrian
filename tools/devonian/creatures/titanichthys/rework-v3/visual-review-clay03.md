# Titanichthys clay03 — actual-image review and proposed structural reset

Owner: Astra high. Reviewed 2026-09-07T22:17Z.

**Reject as completed anatomy. Do not advance to material or rig work.** The removal of masonry-like steps succeeds, but the animal now reads as a helmet over a deep pouch, with nearly invisible armour architecture. A separate thin rail did not solve the lower jaw because its underlying surface partition is still wrong.

Verified evidence:

- Blend: `cef5249afb1dd79e98b86fd3a0d12809c6646717a3639350754ad3076298d00c`.
- Render manifest: `1a7f781d4a6abc4bc624c351f0822db77bbf29779a47e3f5a8e246220f6b81a6`.
- Side: `cb6de05c17a856eb321dc2daa492a1f464107d284505b7f29dea2b8eacd287bc`.
- Front: `4fb1902e89ab6c679773cd82206acaedb946d7340260dcf4617ecd6a1c12dbff`.
- Three-quarter: `3030682a17902ff560995a605f4c319661a23d3ba0b569c255a3382a842dc9e1`.
- Gape-side: `f88d42c6be51f676b9abb88412cfd666c6978e3ca17bda6e3a1a2fe491700fd3`.

All four actual PNGs were opened and inspected. Topology execution passed, but this does not validate sculpture.

## Findings in the actual views

**Side:** the roof contour is flowing and the posterior stays coherent, but the upper head terminates in a straight cut edge and hangs over the mouth like a hood. The eye is a small black bead without a readable orbital structure. Cheek and thorax mostly merge into the same inflated surface. The lower forebody remains an undifferentiated dark sack. The visible pectoral underside still appears as a thick band despite reduced physical thickness.

**Front:** the broad head is preserved, but its cranium and throat make two oversized rounded masses with an opening between them. The mouth corners slope sharply upward into the upper mass. The thin lower arch reads as an extra line inside the opening rather than a coherent tissue-covered mandible. The eyes are symmetrical points with little anatomical context. The fins have long dark, crescent-like undersides.

**Three-quarter:** there are no masonry blocks or crumpled orbital folds, but the shallow seam lines cannot establish anatomical armour volumes by themselves. The head resembles a broad smooth shell with a hem around its opening. The long paired fin is visibly a narrow strip across most of its span; its surface orientation and true chord, not just its thickness, need to change. The muscular posterior and tail endpoints remain useful.

**Gape-side:** the forward jaw rail separates visually from its floor, and a broad triangular lateral sheet still runs from the jaw toward the underside of the cheek/thorax. This gives the pelican-pouch impression identified by root. The whole upper head remains one thick domed overhang. The open mouth therefore lacks independently readable preoral contour, cheek/hinge, slender mandible and recessed floor.

## Why another deformation-mask pass is insufficient

The current construction treats the entire forebody as longitudinal rings whose anterior row is also the mouth aperture. The upper half of that front row must therefore be both the edge of the cranial mass and the upper oral margin; this repeatedly generates a helmet/beak. The lower half must expand from that same edge into the ventral forebody; this repeatedly generates the triangular side wall. Changing profile stations or gape-weight falloff leaves both topological obligations intact.

The separate round jaw rail adds a second boundary but does not remove that wall. Making the rail smaller or sinking it deeper would conceal a symptom. Likewise, strengthening the sutures would put detail on an undifferentiated dome, and changing only fin thickness cannot change the narrow membrane projection or the chordwise silhouette of the curved sheet.

## Bounded next proposal — new head and oral cage, explicit fin sections

Preserve clay01–03 source/output unchanged. Preserve the posterior from the thoracic transition backward, caudal support, tail outline and the useful total fin reach. Build only one new neutral-clay structural candidate. No textures, final skeleton, actions, export or intake.

1. Replace the ring-based anterior body with a landmarked subdivision control cage. Give the broad shallow cranial roof, rounded preoral face, orbital/cheek turn, nuchal shoulder and lower throat their own patch boundaries. These patches share vertices/tangents at their joins. The mouth is an inset opening in that head, not the terminal edge of the whole body loft. A short rounded preoral surface should exist above the upper lip, while the lateral cheek continues beside and behind the commissure. Broad plate crowns and gently turned edges should be authored in the cage itself. Sparse shallow sutures follow those volumes; no polygon-to-plane projection returns.

2. Build the mandible as one thin closed tissue-covered jaw envelope with paired slender inferognathal regions, not an exposed circular tube. Use authored upper, outer, lower and inner boundary curves with variable flattened cross-sections and a subdued rounded symphyseal connection. Its lip and interior floor share an actual boundary. Keep the anterior tip downturned and the margin smooth and edentulous. No teeth, blades, tusks, crushing plates or inferred filter structures.

3. Partition the oral cavity explicitly into palate, a medially recessed floor and short posterior cheek membranes. The floor spans inside the jaw, not on the widest outer flank. Most of the anterior side opening must expose oral space; the soft cheek fan belongs near the posterior commissure. Give the fixed ventral throat its own posterior boundary. Construct the neutral and 24-degree study coordinates from these same anatomical boundaries so the jaw and adjacent tissue cannot peel apart. The original body-wide jaw weights and full-length triangular outer floor are removed. A limited soft floor depression can remain, but it must not recreate a lateral pouch running from chin to thorax.

4. Define an actual small oval orbital opening in the cheek patch, with the globe behind a restrained eyelid shelf. Retain small relative eye size. Improve anatomical exposure and surrounding topology instead of enlarging the globe or adding a conspicuous rim. This is part of shape design, not a transferred eye audit.

5. Rebuild paired fins from a span spine with local chord directions and lenticular sections. Current top/bottom world-Z offsets and swept leading/trailing interpolation do not directly control the visible section or true chord perpendicular to the span. Author the broad proximal membrane, progressively tapering chord, modest camber, restrained dihedral and gradual distal twist explicitly. Preserve the resolved endpoint reach while allowing the intermediate contour to widen. Thickness follows the local surface normal and becomes negligible distally. Root tissue blends into the shoulder around the full attachment. A dark band must not be excused as lighting if the geometry still presents a slab silhouette.

Use the user's reference for connected anterior mass, curved armour, cheek/root architecture and full tapered fin area. The primary constraints remain the saved broad short shield, small relative eyes and thin toothless inferognathals. The reference's cutting-looking mouth is not transferred. The new cage, soft tissue, complete body and fin arrangement remain anatomical interpretations.

## Next evidence boundary

The next source phase should first save a compact landmark/patch map and identify each mouth boundary's ownership, then freeze one new builder and renderer. Root can inspect that concrete architecture before Terra executes it. One build and the same four clay views are sufficient for the next decision; retain comparable framing and illumination. Additional renders are not the proposed solution.

Stop if the next actual side/gape views still depend on a hanging cranial shell and a triangular lateral floor. Do not polish such a result. Acceptance requires a readable upper lip beneath a rounded preoral contour, substantial fixed cheek/shoulder beside the opening, one coherent slender moving jaw, an inset soft floor, visible small eyes with clean sockets, and fins that read as tapered membranes in both silhouette and oblique view.

This document is a proposal only. No new builder, Blender execution or public/Git edit has been performed during this review.
