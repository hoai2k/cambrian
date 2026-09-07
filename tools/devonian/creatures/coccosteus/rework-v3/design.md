# Coccosteus V3 — reference reconciliation and sculpt brief

Status: creative preproduction, not a replacement candidate or approval. The user requests a
complete rework emphasizing the armoured front and angular posterior, while keeping the old
model as a fallback. The named backup is
`local/devonian-authoring/backups/coccosteus-pre-rework-2026-09-07/` with its SHA manifest.

## Reference and evidence

The supplied `/Users/hoai/Downloads/Coccosteus.jpg` bears TUG 1817-152. The institutional
[Fossiilid catalogue](https://fossiilid.info/10464/specimens) identifies that number as
*Coccosteus cuspidatus*, Scotland, Middle Devonian; its linked specimen record is
[335473](https://geocollections.info/specimen/335473). The detailed record failed to load during
this review, so the maker, date and physical reconstruction history are not yet verified.
The supplied image is a reconstructed animal, not evidence of preserved living pigmentation.
Use its form and material hierarchy as user art direction, not a direct fossil scan.

[Engelman 2024, reconstruction section and Figure 7](https://palaeo-electronica.org/content/2024/5307-dunkleosteus-reconstruction)
reassesses Coccosteus using ROM VP 52664. It supports a shorter abdomen and tail than classic
outlines, a more anterior pelvic girdle, a single low long-based dorsal, and a more sharply
heterocercal tail with a substantial lower lobe. The older armour reconstruction was flattened
and sheared by fossil preservation. Therefore preserve three-dimensional shield volume rather
than copying a slab outline. Fine posterior integument is uncertain; reported tiny structures
may be scales or leathery skin/microdenticles. Do not give this fish large overlapping scales.
The existing source README also links Miles and Westoll 1968 for detailed armour and jaw anatomy.

## New sculpt decisions

- Establish a broad, modestly blunt muzzle, recessed orbital transition and sloping cranial roof.
  The cheek must carry mass below the eye. Avoid an egg-shaped continuous forehead silhouette.
- Build the thoracic shield as an integrated volume with a dorsal crest, sloping dorsolateral
  panels and a definite lower side plane. Its posterior edge should visibly meet the flexible
  trunk; make that change of surface curvature carry the armour identity before drawing seams.
- Differentiate thin seam relief from actual topographic ridges. No overlapping floating plate
  stickers, broad black trenches or turtle scutes. Preserve supple tissues around the articulated
  skull and jaw; the mouth remains a real lined cavity with a movable mandibular cup.
- Shape the posterior through a full anterior abdomen, increasingly laterally compressed tail
  region, deep peduncle and distinct upward caudal bend. The desired angular profile should come
  from anatomy and fin outline, not flat shading on a tube or a very long eel-like taper.
- Give pectorals thickness and curvature at their roots and thinner cambered margins. Keep pelvic
  fins anterior and subtle. The long low dorsal should merge cleanly into its moving base.
- Reserve rich small-scale armour granulation and restrained posterior flecks/short oblique bars
  for the material pass. Use a clearer front/back roughness and colour hierarchy than V2, including
  checks in authored and default game palettes. Colours remain an artistic interpretation.

## Clay review and later motion

Use the same framing for old and new neutral side, front, dorsal and oblique views. Also render
close mouth-rest and open-jaw views. Evaluate front/back volume transitions and fin silhouette
before textures; reject a new model that loses the old one's appeal or just adds seam decoration.
Do not replace the public files until the new candidate is demonstrably better.

Then author rigid shield/head articulation against a flexible posterior, staggered fin recovery,
stronger purposeful tail strokes, directional turns and distinct anticipation/strike/recovery
curves for actions. Dynamic motion must respect armour rigidity and genuine oral attachment.
Full/LOD, three anchors, all required actions and fresh portraits remain required. Eye and general
quality audits follow the completed rework; do not rerun the archived V2 audit as a gate.

## Clay-01 authored 7 September 2026

Actual visual inspection covered the supplied TUG reconstruction, the saved Engelman Figure 7,
the old source builder and archived portrait. The old model's broad head and rounded pectorals
are valuable; its nearly elliptical thorax and isolated high dorsal are the main silhouette
weaknesses this study addresses. No additional reference identity claims were needed.

The new script is independently shaped with Coccosteus-specific axial sections. Filleted
polygon cross sections give the skull and thorax real planes while preserving smooth corners.
Monotone axial interpolation prevents repeated ripples. The thoracic rear edge recedes laterally
to expose a full abdominal shoulder, while the dorsal shield extends farther back. The soft
posterior has an intentionally rising ventral profile, compressed deep peduncle, and a fleshy
upturned axial tail lobe. Low long dorsal and thick, cambered paired-fin sections replace the
old radial flat fan construction. No armour seams or pigment are needed to pass this clay gate.

The cranial mass has its own concave palate. A shallow mandibular cup, connected flexible cheek
walls and a recessed buccal sleeve make the mouth a space between volumes. The thoracic front
uses an annular rim and internal passage; it is not capped across the aperture. Rest and open
shape keys test jaw/skull pivots before a final rig is designed. This is a geometry study and
not a claim that oral collisions, eyes or deforming topology have passed production audit.

`views.json` fixes side/front/dorsal/oblique framing for old and new, plus identical close cameras
for new resting/open jaws. All external geometry uses the same clay material so an armour/soft
body distinction cannot be manufactured by colour. CPU Cycles and fixed seed are explicit.
`HANDOFF.md` freezes source hashes, exact three-stage commands and review/stop criteria.
