# Terminal snout correction — dedicated creative state

User clarification: the front body flap itself IS the mouth, a normal terminal
snout; the eyes sit close together immediately above it like nostrils. The accepted
V3 posterior/material quality should remain. Original material03 source and all
studies/candidates are preserved. Candidate02 was rejected for the mouth concept.

## Study05 frozen source, awaiting actual rendered evidence

Astra inspected the actual local user reference and study04 side, front and
oblique. Study04 has a distinct dangling ventral fold and an abrupt old-orbit
boundary ridge. It is NOT a candidate for delivery.

New shape_05.py retains original mesh/UV correspondence but assigns the belly a
separate shallow profile rather than shearing it using depth below dorsal skin.
The old dorsal apron is now the outside of the lower lip/chin; its median contour
returns behind the terminal opening and joins a belly that proceeds posteriorly.
Explicit oral rings progress .66 units inward from terminal lips, closing at an
internal throat above the belly. Removed orbital field fades continuously before
the unchanged posterior boundary Y=-1.04. Eye object scale .55, positions X±.125,
centres .022 below local skin. Final exported eye-volume audit is still required.

Frozen source hashes:
- shape_05.py: ecaf536048fe536e814c45bc802ad7e5211d9df05cd828211035f521d01d5c03
- study_05.py: ef7bce44ffb1458107e837f3ed049928d151cf633966106b090409df5741ba5f

Exact CPU2 routine job from expansion-repo (root coordinates queue/Terra):

```
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/devonian/creatures/gemuendina/face-v4/study_05.py > ../devonian-authoring/gemuendina/face-v4/study-05.log 2>&1
```

Output is a fresh face-v4/study-05 directory, refused if existing. Side renders
first, then front, face-oblique, dorsal, whole, oral-low. Manifold/positive-volume
and exact unchanged posterior assertions run before the Blend is saved. Source
hashes and each actual rendered image hash are recorded. Earlier files untouched.

Syntax parsed successfully. Pure median-coordinate diagnosis supports a shallow
chin/belly; this is not visual or volume validation. A lightweight Blender attempt
inside the sandbox crashed at startup before reading source (exit139), so root
should use the already established execution environment. No heavy job launched
by this creative agent. No public asset, metadata, rig, LOD, git or deployment change.

After actual views pass, candidate rigging must use apply_oral result as authored,
use original vertex IDs for motion weights, preserve all18 clips in both LODs,
and explicitly place jaw/throat pivots and three nested anchors for the new lumen.
Generic deform(p,'oral') is an approximation only; do not mistake it for a final
attachment/pivot specification. Eye containment and oral swept-pose checks must
be rerun on new exports; no old candidate02 audit transfers.

## Actual study05 reviewed; production05 frozen

All SIX actual renders inspected by creative author: side, front, face-oblique,
dorsal, whole, oral-low. Focused shape PASS: terminal lips form leading body edge,
lower jaw/chin flows into belly with no old hanging fold, dorsal silhouette has
no aperture, small close eyes sit directly above the snout. Posterior and pigment
read as accepted V3. Root independently agrees on side/oblique/dorsal. This is
shape acceptance, not completed production validation. The actual Blend SHA is
147a90e3233d6af75dcd06b3dd6ac92829bfffe45ac3f4020c6a87e0f7b9b40c.

production-handoff-05.json binds all source and input hashes. candidate_05.py reads
the preserved pre-face backup metadata, not mutable public metadata. Production
retains28 bones and all18 actions in both exports. rig_spec_05 preserves original
body pose curves and posterior weights, explicitly rebinds lower lips/lining,
keeps upper lip on skull, and uses new jaw/throat pivots. Mouth and swallow anchors
follow throat (open prey corridor); attack anchor follows lower jaw. Three anchors
remain nested and independently checked against this updated spec.

CPU2 sequential execution from expansion-repo:

```
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/devonian/creatures/gemuendina/face-v4/candidate_05.py > ../devonian-authoring/gemuendina/face-v4/candidate-05.log 2>&1
python3 tools/devonian/creatures/gemuendina/face-v4/check_candidate_05.py
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/devonian/creatures/gemuendina/face-v4/audit_candidate_05.py -- candidate-05 > ../devonian-authoring/gemuendina/face-v4/audit-candidate-05.log 2>&1
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/devonian/creatures/gemuendina/face-v4/render_candidate_05.py -- --group review > ../devonian-authoring/gemuendina/face-v4/render-candidate-05-review.log 2>&1
/Applications/Blender.app/Contents/MacOS/Blender -b -t 2 --python tools/devonian/creatures/gemuendina/face-v4/render_candidate_05.py -- --group portraits > ../devonian-authoring/gemuendina/face-v4/render-candidate-05-portraits.log 2>&1
```

Audit is bounded to Bind/Heavy.45/Bite.45/Eat.25/Swim.25 in actual full and LOD.
Requires closed body without audit caps, conservative eye containment65% (margin
over user50%), denticle contact<.010, and an uninterrupted mouth-to-swallow segment
with six outside-tissue samples and positive clearance>.001. This proves the
sampled terminal passage remains open, not absence of every remote intersection.
New actual full/LOD jaw views and portraits MUST be inspected before delivery.
No new export, eye audit, pose render, public release or deployment is claimed yet.

## Final focused delivery handoff — candidate05 actual evidence PASS

Terra completed the frozen export, structural check,10-pose actual full/LOD audit,
12 actual exported-model review views and4 actual exported-model portraits. The
creative author individually inspected ALL16 images and verified each image,
source and source-GLB hash against both completed manifests. author-review-05.json
SHA bb361a16c9a3a7b8596d67a5ed523852e479c71b62033aaef40bc51eae606946
records the focused PASS and exact evidence.

Full GLB SHA0fa8b42cccf502e3f62c26f3402b860a35198cf790cdb4dc46baa8b2bf4b773d,
16,412,316bytes; LOD SHA44d56d05811711fe2a205a77d4178dc724620a98135124a70151d15b36f1faea,
2,868,160bytes.18/18clips retained. Both share28bones and3 nested anchors.
Minimum measured eye interior75.133511%; conservative95% lower74.351649%, above
user50% and target65%. All10 closed-envelope/no-cap and terminal corridor checks
pass: minimum sampled clearance .007287326, maximum denticle contact .003786290.

Actual Heavy/Bite/Eat views show connected lower-jaw floor and oral sidewalls,
without exposed lining inversion, visible oral shell intersection or detached
tissue. The leading body edge is the mouth; no dorsal aperture, preoral ledge or
hanging belly apron remains. Close eyes remain supported above it. All4 portraits
are uncropped and carry accepted V3 posterior/material quality into the new face.
Small LOD chin/cheek creases and reduced pigment detail remain broader PREVIEW
polish. This is bounded actual-pose evidence, not an all-frame/all-creature final
art audit or interactive prey/controller playtest.

Root has independently reviewed selected actual images and owns release05
metadata cleanup, copying, intake/catalogue/build/typecheck, git/main publication.
No public asset or publication was changed by this creative author. No further
creative job is required for this focused correction today. Keep previous
candidate02 and study01–05 sources/evidence, immutable backups and editable Blend.
