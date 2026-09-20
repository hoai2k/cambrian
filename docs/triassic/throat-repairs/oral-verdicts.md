# Oral geometry verdicts — what each mouth needs, measured

T3D-12B, 20 September 2026. `CLAUDE.md`'s rule is that the first question to ask of a mouth is
whether it needs filling at all, and that authored geometry inside one is justified per animal by a
gape that actually shows through, never added as a matter of course. This table is that question
answered per body, so the answer is a decision on the record rather than an absence of work.

Every measurement is `tools/triassic/gape-solid.py` at the peak jaw rotation of the clips named —
rendered against saturated magenta twice, with and without the backface-cull shim, at the backdrop
test `r > .90, g < .20, b > .90`, counting only backdrop the cull *opened* and the body *encloses* —
against a tolerance of 12 px in 378,000. Where a body is measured with a part stripped out, the
part was removed from the unpacked packaged GLB by name and nothing else was changed, which is the
cheap way to ask what a part is doing before building anything in its place.

| Body | Verdict | Palate | Floor | Measurement | State |
| --- | --- | --- | --- | --- | --- |
| **Dinocephalosaurus** | **neither** | — | — | Peak gape of `Bite`, `Attack`, `Heavy`, `Eat`, `NeckStrike`. Shipped with the one-sac `Mouth_lining`: 0, 0, 0, 0, 0 px through the head. **Sac stripped, everything else as it was: 0, 2, 3, 1, 1 px.** Sac *and* seated hinge tissue stripped: 98, 87, 113, 50, 101 px. The sac closed nothing the hinge plug was not already closing; the generation paints its lip on a closed snout and models no cavity, so there is no lumen wall for a gape to open onto. | Delivered: sac removed from the builder, no palate or floor built; fangs and hinge tissue unchanged; rebuilt and audited. |
| **Keichousaurus** | **palate + floor** | rigid `skull`, 100 vertices | rigid `jaw`, 100 vertices | Peak gape of `Bite`, `Heavy`, `Attack`, `Eat`, `Ability`. The 180-vertex sac (132 mixed): 0 px through the body; the palate/floor pair (`T.oral_shells`, 0.84 of the measured room, seam unchanged on the pale-zone lip line): 0 px, and 55–62 silhouette pixels opened against the sac's 76–84. This head is a plane cut through a closed snout with a real mandible swing (0.316 of the head's depth at the hinge), and the sac's own history records three leaks that opened before it was sized to the measured room — so a filled mouth is justified here and the question was only its form. Oral strain 6.57× → 2.34×. | Delivered: separate shells on authored, puppet and LOD; `Grab` loop intact. |
| **Phragmoteuthis** | **neither** | — | — | `Bite@0.22`, `Attack@0.4`, `Eat@0.37`. With the peristome cut, the sewn lining and the two mandibles: 0 px, passes differing by 3–8 px. With the crown closed as delivered: 0 px, passes differing by 0–1 px. A beak inside an arm crown faces down the crown axis inside a thicket of arms and is never in frame; everything built there was closing a hole the builder had cut. `gape-crown.py` is moot with no mouth drawn and says so. | Delivered: cut, lining and beaks retired; anchors on the crown axis; jet bones and twelve-arm count untouched. |
| Ceratites | neither | — | — | Settled by T3D-02a, the pattern Phragmoteuthis follows: peristome, sac and beak removed, closed source crown kept, 5,502 anatomical shell vertices rigid with 0 contaminated. Re-measured on the shipped body for this table at `Bite@0.25`, `Attack@0.44`, `Eat@0.4`: 0, 0, 0 px through the body, the passes differing by 89–193 px of arm silhouette and nothing opened by the cull. `oral-shell-audit.mjs`: no oral lining on authored, puppet or LOD. | Delivered earlier; not touched here. |
| **Shonisaurus** | **neither** | — | — | T3D-14. Rebuilt with the palate, floor, throat tube and both tooth rows removed. `Bite@0.3`, `Attack@0.5`, `Heavy@0.35`, `Eat@1.433`: **0, 0, 6, 87 px** through the body (with the old parts in place: 0, 0, 4, 37 px on the same shots). The Heavy figure is under tolerance; what the cull opens there and does not enclose (1,863 px) is the roof of the open mouth seen from above the lip line, which the game showed already because `Oral palate` was the one part it hid. The `Eat@1.433` pixels are the ones this table already described — scattered slivers along the tooth row at the commissure between the generation's own tooth crowns and the lip, not a hole into the head; the floor and the authored teeth were covering some of them, and they are the generation's, so nothing is authored to close them. `package-audit.mjs` now refuses any node, mesh or material the runtime classifier would match. | Delivered: no oral geometry; anchors and all 21 clips unchanged; eyes re-seated (T3D-14). |
| **Nothosaurus** | **palate + floor** (+ rigid hinge halves) | rigid `skull`, 216 vertices | rigid `jaw`, 216 vertices | T3D-14. `Bite@0.25`, `Heavy@0.3`, `Attack@0.25`: **53, 43, 47 px** through the body before, **1, 0, 0** after. The head is unbent in the mesh to face straight forward (yaw −20.35° → −0.29°) and the jaw cut is a plane fitted to the modelled lip on both flanks, so the seam no longer runs under the lip on one side; the floor and palate stay as they were, and the hinge tissue — one ellipsoid blended between skull and jaw, 146 mixed vertices, standing proud of the throat — is two rigid capped halves seated by ray parity. All four are one `Nothosaurus oral lining` mesh; `oral-shell-audit.mjs` passes on authored, puppet and LOD and `throat-audit.mjs` reports 0 mixed vertices. | Delivered: head turned, cut fitted, shells rigid; skin 2.98x unchanged. |

## What decided each one

**A plane cut through a closed head is open at the hinge, and the hinge plug is what closes it.**
Dinocephalosaurus' three renders separate two things that had been assumed to be one: the sac and
the hinge tissue. Stripping the sac moved the count from 0 to 3; stripping the hinge tissue as well
moved it to 113. The sac was drawn across a gap that was already shut. Every jawed body in the era
carries the same seated hinge tissue (`Seated_jaw_hinge_tissue`, blended `skull`/`jaw` by design,
and reported as such by the throat audit on every one of them), so this is not a property of this
head: it is what the hinge plug is for.

**A filled mouth is justified by a leak, and Keichousaurus has the record of three.** Its README
kept the three separate leaks that opened on the sac — the mandible's tip swinging out from under a
front pinned to the skull, the gape opening onto the backfacing inside of the mandible, and the
commissure — and the shells close each the same way the sac did: the floor runs to the front cap on
the jaw, both shells are sized on the measured room rather than the head's mean radius, and the
palate's rear rings cover the corner. The only question left was the form, and the form the rule
asks for is two rigid halves.

**A crown with no mouth modelled gets none.** Neither cephalopod's generation models a mouth, and
Ceratites had already shown that removing the whole authored reconstruction leaves a body the strict
cull cannot open. Phragmoteuthis' numbers say the same thing and its `gape-crown.py` run says the
tool has nothing to judge, which is the right answer from a tool whose subject was removed.

**What this table does not claim.** A count of zero through the body at five side-on shots is what
`gape-solid.py` measures and no more: it is not every camera, and it does not see a mouth that
merely reads badly. The Shonisaurus line is a measurement of a body nobody in this row rebuilt, and
its 37 px at `Eat` was for T3D-14 to look at — it looked, rebuilt the body without the parts, and
records 87 px there on the bare mouth, the same slivers between the generation's own tooth crowns
and the lip, which it leaves as the generation's rather than author teeth to hide them. The
Nothosaurus row is T3D-14's as well.
