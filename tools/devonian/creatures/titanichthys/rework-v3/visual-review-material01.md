# Titanichthys material01 — independent actual-image review

Astra high, 2026-09-07. Inspected the actual supplied Titanichthys.webp and all four material01 PNGs: side, oblique, armour close and oral open. The supplied illustration guides bulk, blue armour and swept long fins; its cutting jaw projections are not adopted. Titan remains edentulous.

**Decision: reject material01 finish; preserve the approved clay04 geometry.** The image evidence supports the parent review. This is a material correction, not a renewed broad sculpt.

The side and oblique images show a broad cloudy blue-grey field. At the armour close view the surface is still almost smooth, the broad plate regions scarcely distinguish themselves, and the large sutures are softened by weak pigment contrast. Fine grain/puncta in the authored shader did not survive the combination of small amplitudes and the 2048 body atlas at useful viewing scale. Those are implementation causes inferred from source and renders; they are not a claimed measured bake defect.

The long paired fins retain useful camber, chord and tapered planform. Their material reads as an almost plain sheet: local ray pigment and relief are too quiet. Increasing only the broad noise would deepen the rubber-like impression. The oral view retains the approved continuous inset floor and margins, with no newly visible disconnected rail or lining panel, but the uniform warm clay tint does little to distinguish moist palate, floor and commissures. Eye optical colour stays dark; final eye containment and all-action review remain deferred until the completed rework.

Material02 preserves every vertex, polygon, shape key and transform. It adds colour-only original generated dermal flecks at a controlled object-space scale; stronger anatomy-bound broad plate tone and narrow suture pigment; independent fine dermal normal/roughness variation; visible locally directed fin rays; and restrained moist oral regional colour. It removes broad cloudy pigment as the dominant finish. The generated source has no authority over plate placement or jaw anatomy.

Exact evidence:

- Packed material01 blend SHA-256: `766cc89f545e588f56ff929eb3f38a85a1ecf227e4c65b81c44d704cb013c653`.
- Four-view manifest SHA-256: `b778c5759537a58f8fd932feb64c3bb08b3a5f4bf3c57fa317aaac258a798619`.
- Side PNG: `82d6a9904727f70867aba948e676d012dcd2b3ea7f38a3eec0162ad2194a2cb6`.
- Oblique PNG: `e4162d84b76d5934f5418b375488310e3a39f56a8cf07094ba8625fbf937c27e`.
- Armour close PNG: `467f51e545a4bb11ea622e2f7d39391b316d306960954761f3e0b1ea7e9f9086`.
- Oral open PNG: `f9c23e15bc0abaa1724a715220d552126f3eee7af8bdc16b926270965ab122c6`.

Manifest, blend and all four image hashes independently verified. All images remain at the local material-01/renders paths recorded in the manifest. No material01 source or output is overwritten.
