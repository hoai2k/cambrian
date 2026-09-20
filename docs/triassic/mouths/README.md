# Aimed mouth cuts

Mouth files exported from the viewer's mouth editor (`docs/viewer-mouth.md`), one per body, aimed
by hand on the **built** Triassic model each one names. They are hand-offs: a builder may read the
hinge and the plane straight off the file instead of measuring, or read the numbers as a review —
*the hinge belongs this far back, the line rises this much*. Nothing in the game or the build reads
them.

Every one of these is accepted by the consumer against the body it names:

```
npm run triassic:mouth -- docs/triassic/mouths/<id>-mouth.json
```

The check hashes the GLB on disk and re-counts the mandible over the real mesh, so a file whose
body has since changed is refused rather than silently applied to a different animal. A refusal
here is not a mistake in the file — it means the body was rebuilt after the cut was aimed, and the
cut wants aiming again on the new one.

| Body | Hinge depth | Back from the nose | Pitch | Yaw | Roll | Mandible | File sha256 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Aphaneramma | 1.1917 | 23.8% | +15.4° | −16.8° | −10.8° | 1,177 of 13,446 (8.8%) | `ed7d40d7ed85…` |
| Atopodentatus | 0.6932 | 13.9% | −6.2° | 0° | 0° | 3,102 of 14,865 (20.9%) | `eacc9ccda3f5…` |
| Birgeria | 0.4926 | 9.8% | +25.4° | −0.1° | −12.7° | 788 of 13,287 (5.9%) | `b8bcf8e90d58…` |
| Cartorhynchus | 0.2631 | 8.8% | +13.0° | −1.8° | 0° | 271 of 12,188 (2.2%) | `da116683099b…` |
| Mixosaurus | 0.7575 | 18.9% | +6.8° | 0° | 0° | 722 of 11,917 (6.1%) | `c2cade2c239b…` |
| Odontochelys | 0.4237 | 8.5% | +19.8° | +1.7° | 0° | 419 of 13,050 (3.2%) | `c455d132ba32…` |
| Shonisaurus | 1.0927 | 18.2% | +10.5° | 0° | 0° | 1,830 of 61,731 (3.0%) | `c3ce5d29967c…` |

Depths are in model units in the file's own root frame, unscaled; the share is of that body's
length. Angles compose yaw, then pitch, then roll — each reads as its own view's angle when the
other two are zero — and every file also carries the basis vectors, so a consumer never recomposes
them.

Two of these are worth a word, because they are the cases the straight-cut builders get wrong.
**Aphaneramma** is aimed with all three angles turned (−16.8° of yaw and −10.8° of roll on a
+15.4° line): that snout is long and its generation stands with the right forelimb tucked forward
under it, which is the body whose band cut put an arm into the lower-jaw shell (CLAUDE.md, a part
cut onto another bone's shell). **Birgeria** takes only 5.9% of its vertices onto the mandible on a
+25.4° line — a fish's mouth is the easy case and the steep line is the animal, not a slip.

The mandible count is the editor's own, over every vertex of every mesh in the file. It is what
`npm run triassic:mouth` re-counts, so the two agreeing is the file proving it describes the body.
